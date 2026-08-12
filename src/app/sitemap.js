// src/app/sitemap.js
import { headers } from "next/headers";
import prisma from "@/lib/db";
import { resolveMarketByHost } from "@/lib/marketScope";
import { getBaseUrl, localeMonthHref } from "@/lib/calendar/calendarPage";

// Bez ovoga Next generiše sitemap samo jednom, u build-u — novi/izmenjeni
// specijali dodati preko admin panela se ne bi videli do sledećeg deploy-a.
export const revalidate = 3600; // 1h

export default async function sitemap() {
  const h = await headers();
  const market = await resolveMarketByHost(h.get("host"), h.get("cookie"));
  if (!market) return [];

  const BASE_URL = getBaseUrl(market);

  const [weeklyMonths, specialMonths, settings] = await Promise.all([
    prisma.weeklyPlan.findMany({
      where: { marketId: market.id, active: true },
      select: { year: true, month: true },
      distinct: ["year", "month"],
    }),
    prisma.specialPromotion.findMany({
      where: { marketId: market.id, active: true },
      select: { year: true, month: true },
      distinct: ["year", "month"],
    }),
    prisma.calendarSettings.findUnique({ where: { marketId: market.id } }),
  ]);

  const monthBgs = settings?.monthBackgrounds || {};

  const seen = new Set();
  const months = [];
  for (const { year, month } of [...weeklyMonths, ...specialMonths]) {
    const key = `${year}-${month}`;
    if (seen.has(key) || monthBgs[key]?.inactive) continue;
    seen.add(key);
    months.push({ year, month });
  }

  const defaultLocale = market.defaultLocale || "sr";
  const locales = market.locales?.length ? market.locales : [defaultLocale];

  // "/" (tekući mesec, default jezik) uvek ide prvo, sa najvišim prioritetom
  const urlMap = new Map();
  urlMap.set(`${BASE_URL}/`, {
    url: `${BASE_URL}/`,
    changeFrequency: "daily",
    priority: 1,
  });

  for (const { year, month } of months) {
    for (const loc of locales) {
      const url = `${BASE_URL}${localeMonthHref(loc, defaultLocale, year, month)}`;
      if (urlMap.has(url)) continue;
      urlMap.set(url, { url, changeFrequency: "monthly", priority: loc === defaultLocale ? 0.6 : 0.5 });
    }
  }

  return Array.from(urlMap.values());
}
