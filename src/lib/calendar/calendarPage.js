// src/lib/calendar/calendarPage.js
// Zajednička logika za kalendarske stranice ("/" i "/[year]/[month]")
import { cache } from "react";
import prisma from "@/lib/db";
import { unstable_cache } from "next/cache";
import { redirect } from "next/navigation";
import { localeMonthHref } from "@/lib/calendar/calendarUrls";
import { withRetry } from "@/lib/withRetry";

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

export const MONTH_NAMES_SR = [
  "Januar", "Februar", "Mart", "April", "Maj", "Jun",
  "Jul", "Avgust", "Septembar", "Oktobar", "Novembar", "Decembar",
];

// Isti fallback za en-jezička tržišta kad admin nije popunio seoMeta/naslov —
// bez ovoga TZ/BR/BA/COM dobijaju srpski meta title/description kad seoMeta
// nije podešen za njihov jezik, iako je hreflang/html-lang ispravno "en".
const MONTH_NAMES_EN = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

function localizedMonthMeta(lang, monthName, year) {
  if (lang === "en") {
    return {
      title: `Promo Calendar ${monthName} ${year} | Meridianbet`,
      description: `Discover daily promotions for ${monthName} ${year}. Claim exclusive rewards with the Meridianbet Promo Calendar.`,
    };
  }
  return {
    title: `Kalendar Promocija ${monthName} ${year} | Meridianbet`,
    description: `Otkrijte dnevne promocije za ${monthName} ${year}. Iskoristite ekskluzivne nagrade uz Meridianbet Kalendar Promocija.`,
  };
}

// calendarSettings se traži i iz generateMetadata (buildCalendarMetadata) i iz
// same stranice (loadCalendarPageData) u istom requestu — cache() dedupuje to
// na jedan DB upit umesto dva. withRetry je uklopljen unutra, ne oko poziva.
const getCalendarSettingsCached = cache((marketId) =>
  withRetry(() => prisma.calendarSettings.findUnique({ where: { marketId } }))
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

// Keširani DB upiti za promo sadržaj — 5 minuta (settings se uvek čitaju sveže).
// marketId je deo argumenata pa je automatski deo cache ključa — različita
// tržišta nikad ne dele isti keširan unos.
export const getPromoData = unstable_cache(
  async (marketId, year, month) =>
    withRetry(async () => {
      const [weeklyPlanRows, specialRows] = await Promise.all([
        prisma.weeklyPlan.findMany({ where: { marketId, year, month }, orderBy: { weekday: "asc" } }),
        prisma.specialPromotion.findMany({ where: { marketId, year, month }, orderBy: [{ day: "asc" }] }),
      ]);
      return { weeklyPlanRows, specialRows };
    }),
  ["promo-data"],
  { revalidate: 300, tags: ["calendar"] }
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

  // seoMeta from DB overrides the auto-generated per-month title/description
  const settings = await getCalendarSettingsCached(market.id);
  const seo = settings?.seoMeta?.[resolvedLang] || {};

  const monthName = resolvedLang === "en" ? MONTH_NAMES_EN[month] : MONTH_NAMES_SR[month];
  const fallback = localizedMonthMeta(resolvedLang, monthName, year);
  const title = seo.title || fallback.title;
  const description = seo.description || fallback.description;

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
          alt: "Kalendar Promocija",
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
  const [{ weeklyPlanRows, specialRows }, prevMonth, nextMonth] = await Promise.all([
    isAdmin
      ? (async () => {
          const [weeklyPlanRows, specialRows] = await Promise.all([
            prisma.weeklyPlan.findMany({ where: { marketId, year, month }, orderBy: { weekday: "asc" } }),
            prisma.specialPromotion.findMany({ where: { marketId, year, month }, orderBy: [{ day: "asc" }] }),
          ]);
          return { weeklyPlanRows, specialRows };
        })()
      : getPromoData(marketId, year, month),
    findNearestMonthWithPromos(marketId, year, month, "prev", inactiveSet),
    findNearestMonthWithPromos(marketId, year, month, "next", inactiveSet),
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

  // naslov kalendara — per-month override > global calendarTitle > hardcoded fallback
  const monthTitle = monthBg.titleSr;
  const globalTitles = calendarSettings?.calendarTitle || {};
  const calendarTitle = monthTitle || globalTitles[resolvedLang] || globalTitles.sr || "PRAZNIČNE MISIJE";

  // tema kalendara — per-month override > global default
  const theme = monthBg.theme || calendarSettings?.theme || "default";

  const isMonthInactive = !!monthBg.inactive;

  // Odbrojavanje — podešeno u admin panelu; fallback zadržava dosadašnje ponašanje dok se ne podesi
  const countdownTargetIso = calendarSettings?.countdownTargetIso || "2026-06-11T00:00:00";
  const countdownLabel = calendarSettings?.countdownLabel || "Kalendar se otvara za";

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
