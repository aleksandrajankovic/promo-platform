// src/app/sitemap.js
import { headers } from "next/headers";
import prisma from "@/lib/db";
import { resolveMarketByHost } from "@/lib/marketScope";
import { getBaseUrl, localeMonthHref } from "@/lib/calendar/calendarPage";
import { buildPromoUrlISO } from "@/lib/calendar/slug";
import { isDateLocked } from "@/lib/calendar/calendarGridHelpers";

// Bez ovoga Next generiše sitemap samo jednom, u build-u — novi/izmenjeni
// specijali dodati preko admin panela se ne bi videli do sledećeg deploy-a.
export const revalidate = 3600; // 1h

// Eksplicitno, ne oslanjati se na to da headers() implicitno gura rutu u
// dynamic — ovo je host-osetljiva ruta (svako tržište vidi samo svoje URL-ove),
// pa slučajno keširanje po prvom hit-u znači da bi jedno tržište moglo da
// posluži sitemap drugog tržišta.
export const dynamic = "force-dynamic";

export default async function sitemap() {
  const h = await headers();
  const market = await resolveMarketByHost(h.get("host"), h.get("cookie"));
  if (!market) return [];

  const BASE_URL = getBaseUrl(market);
  const timezone = market.timezone || "Europe/Belgrade";

  const [weeklyMonths, specials, settings] = await Promise.all([
    prisma.weeklyPlan.findMany({
      where: { marketId: market.id, active: true },
      select: { year: true, month: true, updatedAt: true },
      distinct: ["year", "month"],
    }),
    // Pune specijale (ne samo distinct mesece) — trebaju nam za pojedinačne
    // /promo/[iso]/[slug] deep-link URL-ove i za lastModified po mesecu.
    prisma.specialPromotion.findMany({
      where: { marketId: market.id, active: true },
      select: { year: true, month: true, day: true, title: true, updatedAt: true },
    }),
    prisma.calendarSettings.findUnique({ where: { marketId: market.id } }),
  ]);

  const monthBgs = settings?.monthBackgrounds || {};

  // lastModified po mesecu — najskoriji updatedAt među weekly/special redovima
  // tog meseca (weekly redovi su distinct-ovani, ali i dalje nose updatedAt).
  const monthLastModified = new Map();
  const bumpLastModified = (key, updatedAt) => {
    const prev = monthLastModified.get(key);
    if (!prev || updatedAt > prev) monthLastModified.set(key, updatedAt);
  };

  const seen = new Set();
  const months = [];
  for (const { year, month, updatedAt } of weeklyMonths) {
    const key = `${year}-${month}`;
    bumpLastModified(key, updatedAt);
    if (seen.has(key) || monthBgs[key]?.inactive) continue;
    seen.add(key);
    months.push({ year, month });
  }
  for (const { year, month, updatedAt } of specials) {
    const key = `${year}-${month}`;
    bumpLastModified(key, updatedAt);
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
    const lastModified = monthLastModified.get(`${year}-${month}`);
    for (const loc of locales) {
      const url = `${BASE_URL}${localeMonthHref(loc, defaultLocale, year, month)}`;
      if (urlMap.has(url)) continue;
      urlMap.set(url, {
        url,
        changeFrequency: "monthly",
        priority: loc === defaultLocale ? 0.6 : 0.5,
        ...(lastModified ? { lastModified } : {}),
      });
    }
  }

  // Pojedinačne promo deep-link stranice — preskoči zaključane (buduće) dane,
  // isto pravilo kao JSON-LD i sama stranica (daily reveal mehanika).
  for (const s of specials) {
    if (!s.title) continue;
    if (isDateLocked(s.year, s.month, s.day, timezone)) continue;
    const date = new Date(s.year, s.month, s.day);
    const url = `${BASE_URL}${buildPromoUrlISO(date, s.title)}`;
    if (urlMap.has(url)) continue;
    urlMap.set(url, {
      url,
      changeFrequency: "monthly",
      priority: 0.4,
      lastModified: s.updatedAt,
    });
  }

  return Array.from(urlMap.values());
}
