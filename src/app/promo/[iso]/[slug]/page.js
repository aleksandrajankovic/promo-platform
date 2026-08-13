// src/app/promo/[iso]/[slug]/page.js
import { cache } from "react";
import { redirect, notFound } from "next/navigation";
import { cookies, headers } from "next/headers";
import CalendarPageView from "@/components/calendar/CalendarPageView";
import { buildPromoUrlISO } from "@/lib/calendar/slug";
import { buildCalendarData } from "@/lib/calendar/calendarGridHelpers";
import { resolveMarketByHost } from "@/lib/marketScope";
import { getBaseUrl, loadCalendarPageData, monthHref } from "@/lib/calendar/calendarPage";

// YYYY-MM-DD → { y, m(0-11), d } + validacija
function parseISO(iso) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  if (!match) return null;
  const y = +match[1], mon = +match[2], d = +match[3];
  const dt = new Date(Date.UTC(y, mon - 1, d));
  const valid =
    dt.getUTCFullYear() === y &&
    dt.getUTCMonth() + 1 === mon &&
    dt.getUTCDate() === d;
  return valid ? { y, m: mon - 1, d } : null;
}

function stripHtml(html = "") {
  return html.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
}

// generateMetadata i sama stranica traže isti dan — cache() dedupuje DB upite u okviru jednog requesta
const resolveDayEntry = cache(async (market, iso, isAdmin) => {
  const parsed = parseISO(iso);
  if (!parsed) return null;

  const { y, m, d } = parsed;
  const lang = market.defaultLocale || "sr";
  const data = await loadCalendarPageData({ market, year: y, month: m, isAdmin, lang });
  const { daysPayload } = buildCalendarData({
    year: y,
    month: m,
    weekly: data.weekly,
    specials: data.specials,
    adminPreview: isAdmin,
    lang,
    today: new Date(),
    timezone: data.timezone,
  });

  const entry = daysPayload.find((e) => e.day === d);
  if (!entry || !entry.hasPromo) return null;

  // Ne otkrivaj zaključane (buduće) dane — poštuje "daily reveal" mehaniku kalendara
  if (entry.isLocked && !isAdmin) return null;

  return { y, m, d, entry, data };
});

export async function generateMetadata({ params }) {
  const p = await params;
  const h = await headers();
  const market = await resolveMarketByHost(h.get("host"), h.get("cookie"));
  if (!market) return {};

  const resolved = await resolveDayEntry(market, p.iso, false);
  if (!resolved) return {};

  const { y, m, d, entry } = resolved;
  const date = new Date(y, m, d);
  const canonical = `${getBaseUrl(market)}${buildPromoUrlISO(date, entry.title)}`;
  const description =
    stripHtml(entry.richHtml || "").slice(0, 160) ||
    `Otkrijte dnevnu promociju "${entry.title}" u Meridianbet Kalendaru Promocija.`;
  const title = `${entry.title} | Meridianbet Kalendar Promocija`;

  return {
    title,
    description,
    alternates: { canonical },
    openGraph: {
      url: canonical,
      title,
      description,
      images: [
        {
          url: "https://cloud.merbet.com/Preview-image/calendar-universal.png",
          width: 1200,
          height: 630,
          alt: entry.title,
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

export default async function PromoDetailPage({ params }) {
  const p = await params;

  const h = await headers();
  const market = await resolveMarketByHost(h.get("host"), h.get("cookie"));
  if (!market) notFound();

  const cookieStore = await cookies();
  const adminCookie = cookieStore.get("admin_auth");
  const isAdmin = !!adminCookie?.value;

  const resolved = await resolveDayEntry(market, p.iso, isAdmin);
  if (!resolved) {
    // Nevalidan datum, dan bez promocije, ili još zaključan dan — nema šta jedinstveno da se prikaže
    const parsed = parseISO(p.iso);
    redirect(parsed ? monthHref(parsed.y, parsed.m) : "/");
  }

  const { y, m, entry, data } = resolved;

  return (
    <CalendarPageView
      year={y}
      month={m}
      isAdmin={isAdmin}
      lang={market.defaultLocale || "sr"}
      today={new Date()}
      openDay={entry.day}
      {...data}
    />
  );
}
