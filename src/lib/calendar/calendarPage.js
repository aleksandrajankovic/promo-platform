// src/lib/calendarPage.js
// Zajednička logika za kalendarske stranice ("/" i "/[year]/[month]")
import prisma from "@/lib/db";
import { unstable_cache } from "next/cache";
import { redirect } from "next/navigation";
import { localeMonthHref } from "@/lib/calendar/calendarUrls";

export * from "@/lib/calendar/calendarUrls";

// Fallback samo za slučaj da market.domain nedostaje (ne bi trebalo da se
// desi u produkciji — svaki Market koji ima kalendar mora imati domain).
export function getBaseUrl(market) {
  return market?.domain ? `https://${market.domain}` : "https://calendar.meridianbet.rs";
}

export const MONTH_NAMES_SR = [
  "Januar", "Februar", "Mart", "April", "Maj", "Jun",
  "Jul", "Avgust", "Septembar", "Oktobar", "Novembar", "Decembar",
];

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
      knockoutPhase: r.knockoutPhase || null,
    };
  });
}

// Keširani DB upiti za promo sadržaj — 5 minuta (settings se uvek čitaju sveže).
// marketId je deo argumenata pa je automatski deo cache ključa — različita
// tržišta nikad ne dele isti keširan unos.
export const getPromoData = unstable_cache(
  async (marketId, year, month) => {
    const [weeklyPlanRows, specialRows] = await Promise.all([
      prisma.weeklyPlan.findMany({ where: { marketId, year, month }, orderBy: { weekday: "asc" } }),
      prisma.specialPromotion.findMany({ where: { marketId, year, month }, orderBy: [{ day: "asc" }] }),
    ]);
    return { weeklyPlanRows, specialRows };
  },
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
  const settings = await prisma.calendarSettings.findUnique({ where: { marketId: market.id } });
  const seo = settings?.seoMeta?.[resolvedLang] || {};

  const monthSr = MONTH_NAMES_SR[month];
  const title = seo.title || `Kalendar Promocija ${monthSr} ${year} | Meridianbet`;
  const description =
    seo.description ||
    `Otkrijte dnevne promocije za ${monthSr} ${year}. Iskoristite ekskluzivne nagrade uz Meridianbet Kalendar Promocija.`;

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

  // CalendarSettings se uvek čita sveže (inactive flag mora biti trenutan)
  const calendarSettings = await prisma.calendarSettings.findUnique({ where: { marketId } });
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

  // Load promo data — admin dobija live podatke, korisnici keširane (5 min)
  const { weeklyPlanRows, specialRows } = isAdmin
    ? await (async () => {
        const [weeklyPlanRows, specialRows] = await Promise.all([
          prisma.weeklyPlan.findMany({ where: { marketId, year, month }, orderBy: { weekday: "asc" } }),
          prisma.specialPromotion.findMany({ where: { marketId, year, month }, orderBy: [{ day: "asc" }] }),
        ]);
        return { weeklyPlanRows, specialRows };
      })()
    : await getPromoData(marketId, year, month);

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

  // naslov kalendara — per-month override > global calendarTitle > hardcoded fallback
  const monthTitle = monthBg.titleSr;
  const globalTitles = calendarSettings?.calendarTitle || {};
  const calendarTitle = monthTitle || globalTitles[resolvedLang] || globalTitles.sr || "PRAZNIČNE MISIJE";

  // tema kalendara — per-month override > global default
  const theme = monthBg.theme || calendarSettings?.theme || "default";

  // Skup deaktivovanih meseci za paginaciju
  const inactiveSet = new Set(
    Object.entries(monthBgs)
      .filter(([, v]) => v?.inactive)
      .map(([k]) => k)
  );

  const isMonthInactive = !!monthBg.inactive;

  // Odbrojavanje — podešeno u admin panelu; fallback zadržava dosadašnje ponašanje dok se ne podesi
  const countdownTargetIso = calendarSettings?.countdownTargetIso || "2026-06-11T00:00:00";
  const countdownLabel = calendarSettings?.countdownLabel || "Kalendar se otvara za";

  const leaderboard = {
    enabled: !!calendarSettings?.leaderboard?.enabled,
    feedUrl: calendarSettings?.leaderboard?.feedUrl || "",
  };

  // Pagination for months — preskačemo deaktivovane mesece
  const [prevMonth, nextMonth] = await Promise.all([
    findNearestMonthWithPromos(marketId, year, month, "prev", inactiveSet),
    findNearestMonthWithPromos(marketId, year, month, "next", inactiveSet),
  ]);

  return {
    weekly,
    specials,
    baseUrl: getBaseUrl(market),
    logoUrl,
    bgImageUrl,
    bgImageUrlMobile,
    pos,
    calendarTitle,
    theme,
    isMonthInactive,
    prevMonth,
    nextMonth,
    countdownTargetIso,
    countdownLabel,
    leaderboard,
  };
}
