// src/app/[year]/[month]/page.js
import { notFound, redirect } from "next/navigation";
import { cookies, headers } from "next/headers";
import CalendarPageView from "@/components/calendar/CalendarPageView";
import { resolveMarketByHost } from "@/lib/marketScope";
import {
  buildCalendarMetadata,
  loadCalendarPageData,
  monthFromUrl,
  isValidYear,
  isValidMonth,
  isCurrentMonth,
} from "@/lib/calendar/calendarPage";

function parseParams(params) {
  const year = Number.parseInt(params.year, 10);
  const monthUrl = Number.parseInt(params.month, 10);
  if (!Number.isInteger(year) || !Number.isInteger(monthUrl)) return null;

  const month = monthFromUrl(monthUrl);
  if (!isValidYear(year) || !isValidMonth(month)) return null;

  return { year, month };
}

export async function generateMetadata({ params }) {
  const p = await params;
  const parsed = parseParams(p);
  if (!parsed) return {};
  const h = await headers();
  const market = await resolveMarketByHost(h.get("host"));
  if (!market) return {};
  return buildCalendarMetadata(market, parsed.year, parsed.month);
}

export default async function CalendarMonthPage({ params }) {
  const p = await params;
  const parsed = parseParams(p);
  if (!parsed) notFound();

  const { year, month } = parsed;

  // Tekući mesec ima kanonski URL "/" — izbegavamo duplikat sadržaja na dva URL-a
  if (isCurrentMonth(year, month)) {
    redirect("/");
  }

  const h = await headers();
  const market = await resolveMarketByHost(h.get("host"));
  if (!market) notFound();

  const cookieStore = await cookies();
  const adminCookie = cookieStore.get("admin_auth");
  const isAdmin = !!adminCookie?.value;
  const lang = market.defaultLocale || "sr";

  const data = await loadCalendarPageData({ market, year, month, isAdmin, lang });

  return (
    <CalendarPageView
      year={year}
      month={month}
      isAdmin={isAdmin}
      lang={lang}
      today={new Date()}
      {...data}
    />
  );
}
