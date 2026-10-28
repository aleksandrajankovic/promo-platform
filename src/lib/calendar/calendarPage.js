// src/lib/calendar/calendarPage.js
// Zajednička logika za kalendarske stranice ("/" i "/[year]/[month]")
import { cache } from "react";
import prisma from "@/lib/db";
import { unstable_cache } from "next/cache";
import { redirect } from "next/navigation";
import { localeMonthHref } from "@/lib/calendar/calendarUrls";
import { withRetry } from "@/lib/withRetry";
import { monthName as localizedMonthName, pickLocalized, t } from "@/lib/i18n/messages";

export * from "@/lib/calendar/calendarUrls";

// Fallback samo za slučaj da market.domain nedostaje (ne bi trebalo da se
// desi u produkciji — svaki Market koji ima kalendar mora imati domain).
export function getBaseUrl(market) {
  return market?.domain ? `https://${market.domain}` : "https://calendar.meridianbet.rs";
}

// Glavni betting sajt tržišta (logo link, organizer u JSON-LD) — market.domain
// je kalendar poddomen ("calendar.meridianbet.rs"), glavni sajt je isti domen
// bez tog prefiksa. Ovaj obrazac važi za svih 6 trenutnih tržišta.
export function getMainSiteUrl(market) {
  if (!market?.domain) return "https://meridianbet.rs";
  return `https://${market.domain.replace(/^calendar\./, "")}`;
}


// Javni kalendar ne sme da ide u bazu za svakog posetioca. Sve što stranica
// čita keširano je između zahteva (tag "calendar"); svaki admin snimak zove
// revalidateTag("calendar", { expire: 0 }), pa je izmena vidljiva odmah, a
// revalidate: 300 je samo sigurnosna mreža. marketId je u argumentima, pa je
// deo ključa — tržišta nikad ne dele keš. (unstable_cache, ne "use cache":
// stranica je ionako dinamička po host-u, a "use cache" traži uključivanje
// cacheComponents za celu aplikaciju.)
const CALENDAR_CACHE = { revalidate: 300, tags: ["calendar"] };

// calendarSettings se traži i iz generateMetadata (buildCalendarMetadata) i iz
// same stranice (loadCalendarPageData) u istom requestu — cache() to dodatno
// dedupuje unutar jednog requesta.
const getCalendarSettingsCached = cache(
  unstable_cache(
    (marketId) => withRetry(() => prisma.calendarSettings.findUnique({ where: { marketId } })),
    ["calendar-settings"],
    CALENDAR_CACHE
  )
);

// -------------------------
// NORMALIZACIJA PODATAKA
// -------------------------
function getTextFromTranslations(row, lang) {
  const translations = row.translations || {};
  const t =
    translations[lang] ||
    (Object.keys(translations).length
      ? translations[Object.keys(translations)[0]]
      : null);

  return {
    title: t?.title ?? row.title ?? "",
    button: t?.button ?? row.button ?? "",
    link: t?.link ?? row.link ?? "#",
    richHtml: t?.richHtml ?? row.richHtml ?? null,
  };
}

function normWeeklyRows(rows = [], lang) {
  const out = Array(7).fill(null);
  for (const r of rows) {
    if (typeof r.weekday === "number" && r.weekday >= 0 && r.weekday <= 6) {
      const t = getTextFromTranslations(r, lang);
      out[r.weekday] = {
        title: t.title,
        icon: r.icon || "",
        richHtml: t.richHtml,
        link: t.link,
        button: t.button,
        active: !!r.active,
        buttonColor: r.buttonColor || "green",
        category: r.category || "ALL",
        scratch: !!r.scratch,
        flipCard: !!r.flipCard,
      };
    }
  }
  return out;
}

function normalizeSpecials(rows = [], lang) {
  return rows.map((r) => {
    const t = getTextFromTranslations(r, lang);
    return {
      year: r.year,
      month: r.month,
      day: r.day,
      title: t.title,
      icon: r.icon || "",
      richHtml: t.richHtml,
      link: t.link,
      button: t.button,
      active: !!r.active,
      buttonColor: r.buttonColor || "green",
      category: r.category || "ALL",
      scratch: !!r.scratch,
      flipCard: !!r.flipCard,
      knockoutPhase: r.knockoutPhase || null,
    };
  });
}

function loadPromoRows(marketId, year, month) {
  return withRetry(async () => {
    const [weeklyPlanRows, specialRows] = await Promise.all([
      prisma.weeklyPlan.findMany({ where: { marketId, year, month }, orderBy: { weekday: "asc" } }),
      prisma.specialPromotion.findMany({ where: { marketId, year, month }, orderBy: [{ day: "asc" }] }),
    ]);
    return { weeklyPlanRows, specialRows };
  });
}

// Promo sadržaj meseca — keširan za posetioce; admin preview čita uživo.
export const getPromoData = unstable_cache(loadPromoRows, ["promo-data"], CALENDAR_CACHE);

// Prethodni/sledeći mesec sa promocijama (paginacija) — do 4+ upita, isti za
// sve posetioce istog meseca. inactiveKeys je sortiran niz (deo cache ključa).
const getMonthNavCached = unstable_cache(
  async (marketId, year, month, inactiveKeys) => {
    const inactiveSet = new Set(inactiveKeys);
    const [prevMonth, nextMonth] = await Promise.all([
      findNearestMonthWithPromos(marketId, year, month, "prev", inactiveSet),
      findNearestMonthWithPromos(marketId, year, month, "next", inactiveSet),
    ]);
    return { prevMonth, nextMonth };
  },
  ["month-nav"],
  CALENDAR_CACHE
);

// Vraća {y, m} najbližeg meseca sa promocijama u datom smeru, preskačući neaktivne mesece
export async function findNearestMonthWithPromos(marketId, currentY, currentM, direction, inactiveSet = new Set()) {
  const isNext = direction === "next";

  const dirFilter = isNext
    ? { OR: [{ year: { gt: currentY } }, { year: currentY, month: { gt: currentM } }] }
    : { OR: [{ year: { lt: currentY } }, { year: currentY, month: { lt: currentM } }] };
  const dirOrder = isNext
    ? [{ year: "asc" }, { month: "asc" }]
    : [{ year: "desc" }, { month: "desc" }];

  const [special, plan] = await Promise.all([
    prisma.specialPromotion.findFirst({ where: { marketId, active: true, ...dirFilter }, orderBy: dirOrder }),
    prisma.weeklyPlan.findFirst({ where: { marketId, active: true, ...dirFilter }, orderBy: dirOrder }),
  ]);

  if (!special && !plan) return null;

  let candidate;
  if (!special) candidate = { y: plan.year, m: plan.month };
  else if (!plan) candidate = { y: special.year, m: special.month };
  else {
    const sOrd = special.year * 12 + special.month;
    const pOrd = plan.year * 12 + plan.month;
    const closer = isNext ? (sOrd <= pOrd ? special : plan) : (sOrd >= pOrd ? special : plan);
    candidate = { y: closer.year, m: closer.month };
  }

  // Ako je kandidat deaktiviran, traži sledeći u istom smeru
  if (inactiveSet.has(`${candidate.y}-${candidate.m}`)) {
    return findNearestMonthWithPromos(marketId, candidate.y, candidate.m, direction, inactiveSet);
  }

  return candidate;
}

// -------------------------
// METADATA
// -------------------------
export async function buildCalendarMetadata(market, year, month, lang) {
  const BASE_URL = getBaseUrl(market);
  const defaultLocale = market?.defaultLocale || "sr";
  const resolvedLang = lang || defaultLocale;
  const canonical = `${BASE_URL}${localeMonthHref(resolvedLang, defaultLocale, year, month)}`;

  // seoMeta iz baze (po jeziku) ima prednost nad automatskim naslovom/opisom
  // meseca; bez njega se koristi rečnik za jezik stranice (ne srpski za sve)
  const settings = await getCalendarSettingsCached(market.id);
  const seo = settings?.seoMeta?.[resolvedLang] || {};

  const vars = { month: localizedMonthName(resolvedLang, month), year };
  const title = seo.title || t(resolvedLang, "metaTitle", vars);
  const description = seo.description || t(resolvedLang, "metaDescription", vars);

  // hreflang: jedan alternate po jeziku tržišta, ne samo trenutni — ako tržište
  // ima samo jedan jezik, ovo se svodi na isto ponašanje kao pre (jedan unos).
  const locales = market?.locales?.length ? market.locales : [defaultLocale];
  const languages = {};
  for (const loc of locales) {
    languages[loc] = `${BASE_URL}${localeMonthHref(loc, defaultLocale, year, month)}`;
  }
  languages["x-default"] = `${BASE_URL}${localeMonthHref(defaultLocale, defaultLocale, year, month)}`;

  return {
    title,
    description,
    alternates: {
      canonical,
      languages,
    },
    openGraph: {
      url: canonical,
      title,
      description,
      images: [
        {
          url: "https://cloud.merbet.com/Preview-image/calendar-universal.png",
          width: 1200,
          height: 630,
          alt: t(resolvedLang, "calendarImageAlt"),
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: ["https://cloud.merbet.com/Preview-image/calendar-universal.png"],
    },
  };
}

// -------------------------
// PODACI ZA STRANICU
// -------------------------
export async function loadCalendarPageData({ market, year, month, isAdmin, lang }) {
  const marketId = market.id;
  const resolvedLang = lang || market.defaultLocale || "sr";

  // Isti calendarSettings red se traži i u buildCalendarMetadata (generateMetadata)
  // za isti request — cache() dedupuje na jedan DB upit umesto dva. withRetry je
  // uklopljen unutar getCalendarSettingsCached, štiti od Neon cold-start-a.
  const calendarSettings = await getCalendarSettingsCached(marketId);
  const monthBgs = calendarSettings?.monthBackgrounds || {};

  // Redirect korisnika sa deaktiviranog meseca
  if (monthBgs[`${year}-${month}`]?.inactive && !isAdmin) {
    const inactiveSet = new Set(
      Object.entries(monthBgs)
        .filter(([, v]) => v?.inactive)
        .map(([k]) => k)
    );
    const nearest =
      (await findNearestMonthWithPromos(marketId, year, month, "next", inactiveSet)) ||
      (await findNearestMonthWithPromos(marketId, year, month, "prev", inactiveSet));
    if (nearest) redirect(localeMonthHref(resolvedLang, market.defaultLocale || "sr", nearest.y, nearest.m));
  }

  // Skup deaktivovanih meseci za paginaciju — samo od monthBgs, ne zavisi od
  // promo podataka ispod, pa se računa pre njih da može da uđe u isti Promise.all.
  const inactiveSet = new Set(
    Object.entries(monthBgs)
      .filter(([, v]) => v?.inactive)
      .map(([k]) => k)
  );

  // Load promo data — admin dobija live podatke, korisnici keširane (5 min).
  // Paginacija (prevMonth/nextMonth) ne zavisi od weekly/special podataka ni
  // obrnuto, pa idu u isti Promise.all umesto sekvencijalno.
  const [{ weeklyPlanRows, specialRows }, { prevMonth, nextMonth }] = await Promise.all([
    isAdmin ? loadPromoRows(marketId, year, month) : getPromoData(marketId, year, month),
    getMonthNavCached(marketId, year, month, [...inactiveSet].sort()),
  ]);

  const planned = normWeeklyRows(weeklyPlanRows, resolvedLang);

  const weekly = Array.from(
    { length: 7 },
    (_, i) =>
      planned[i] ?? {
        title: "",
        icon: "",
        richHtml: null,
        link: "#",
        button: "",
        active: false,
        buttonColor: "green",
        category: "ALL",
      }
  );

  const specials = normalizeSpecials(specialRows, resolvedLang);

  const logoUrl = calendarSettings?.logoUrl || "/img/meridianbet-ng.png";

  // background za kalendar — per-month override ima prioritet nad globalnim
  const monthBg = monthBgs[`${year}-${month}`] || {};
  const bgImageUrl = monthBg.desktop || calendarSettings?.bgImageUrl || "/img/bg-calendar.png";
  const bgImageUrlMobile = monthBg.mobile || calendarSettings?.bgImageUrlMobile || bgImageUrl;

  // pozicija kalendara — per-month override > global default
  const pos = monthBg.position || calendarSettings?.calendarPosition || "left";

  // dodatni razmak iznad kalendara (vh) — da kalendar ne prekriva naslov na pozadini
  const topOffset = monthBg.topOffset || 0;
  const topOffsetMobile = monthBg.topOffsetMobile || 0;

  // skraćen mesec — prikazuju se samo dani od-do (npr. kampanja 15–31)
  const dayFrom = monthBg.dayFrom || null;
  const dayTo = monthBg.dayTo || null;

  // naslov kalendara po jeziku: naslov meseca > globalni naslov > rečnik.
  // titleSr je stari naslov meseca (važi za podrazumevani jezik tržišta).
  const defaultLang = market.defaultLocale || "sr";
  const monthTitles = { ...(monthBg.titleSr ? { [defaultLang]: monthBg.titleSr } : {}), ...(monthBg.titles || {}) };
  const calendarTitle =
    pickLocalized(monthTitles, resolvedLang, defaultLang) ||
    pickLocalized(calendarSettings?.calendarTitle, resolvedLang, defaultLang) ||
    t(resolvedLang, "calendarTitle");

  // tema kalendara — per-month override > global default
  const theme = monthBg.theme || calendarSettings?.theme || "default";

  const isMonthInactive = !!monthBg.inactive;

  // Odbrojavanje — podešeno u admin panelu; fallback zadržava dosadašnje ponašanje dok se ne podesi
  const countdownTargetIso = calendarSettings?.countdownTargetIso || "2026-06-11T00:00:00";
  const countdownLabel =
    pickLocalized(calendarSettings?.countdownLabel, resolvedLang, defaultLang) || t(resolvedLang, "countdownDefault");

  const leaderboard = {
    enabled: !!calendarSettings?.leaderboard?.enabled,
    feedUrl: calendarSettings?.leaderboard?.feedUrl || "",
  };

  return {
    weekly,
    specials,
    baseUrl: getBaseUrl(market),
    mainSiteUrl: getMainSiteUrl(market),
    timezone: market.timezone || "Europe/Belgrade",
    scratchCoverUrl: calendarSettings?.scratchCoverUrl || "/img/scratchCard.png",
    scratchCursorUrl: calendarSettings?.scratchCursorUrl || "/img/coin.png",
    logoUrl,
    bgImageUrl,
    bgImageUrlMobile,
    pos,
    calendarTitle,
    topOffset,
    topOffsetMobile,
    dayFrom,
    dayTo,
    theme,
    isMonthInactive,
    prevMonth,
    nextMonth,
    countdownTargetIso,
    countdownLabel,
    leaderboard,
  };
}
