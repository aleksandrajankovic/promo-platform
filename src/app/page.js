// src/app/page.js
import { notFound } from "next/navigation";
import CalendarPageView from "@/components/calendar/CalendarPageView";
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { resolveMarketByHost } from "@/lib/marketScope";
import {
  buildCalendarMetadata,
  loadCalendarPageData,
  monthHref,
  isValidYear,
  isValidMonth,
} from "@/lib/calendar/calendarPage";

export async function generateMetadata() {
  const h = await headers();
  const market = await resolveMarketByHost(h.get("host"));
  if (!market) return {};
  const now = new Date();
  return buildCalendarMetadata(market, now.getFullYear(), now.getMonth());
}

function getParam(sp, key) {
  if (!sp) return undefined;
  const v = sp[key];
  return Array.isArray(v) ? v[0] : v;
}

export default async function Home({ searchParams }) {
  const sp = await searchParams;

  // Legacy podrška: stari linkovi tipa /?y=2026&m=5 → redirect na novu path šemu (/[year]/[month])
  const yRaw = getParam(sp, "y");
  const mRaw = getParam(sp, "m");
  if (yRaw !== undefined || mRaw !== undefined) {
    const y = Number.parseInt(yRaw, 10);
    const m = Number.parseInt(mRaw, 10);
    if (isValidYear(y) && isValidMonth(m)) {
      redirect(monthHref(y, m));
    }
    // nevalidni parametri — ignoriši ih i prikaži tekući mesec na "/"
  }

  const h = await headers();
  const market = await resolveMarketByHost(h.get("host"));
  if (!market) notFound();

  const cookieStore = await cookies();
  const adminCookie = cookieStore.get("admin_auth");
  const isAdmin = !!adminCookie?.value;

  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();
  const lang = market.defaultLocale || "sr";

  const data = await loadCalendarPageData({ market, year, month, isAdmin, lang });

  return (
    <CalendarPageView
      year={year}
      month={month}
      isAdmin={isAdmin}
      lang={lang}
      today={now}
      {...data}
    />
  );
}
