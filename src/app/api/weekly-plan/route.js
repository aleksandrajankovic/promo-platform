// src/app/api/weekly-plan/route.js
export const runtime = "nodejs";

import { revalidateTag } from "next/cache";
import prisma from "@/lib/db";
import { requireAdminMarketOrResponse } from "@/lib/marketScope";
import { sanitizeRichHtml, sanitizeTranslations } from "@/lib/sanitize";
import { sanitizeLink } from "@/lib/validate";
import { getAllowedWeeklyCategories } from "@/lib/calendar/promoCategoryStyles";
import { resolveMonthTheme } from "@/lib/calendar/monthTheme";

// GET /api/weekly-plan?year=YYYY&month=MM — u praksi je konzumuje samo admin UI
// (autentifikovan), zato ide kroz isti marketScope kao ostale admin rute.
export async function GET(req) {
  const { market, errorResponse } = await requireAdminMarketOrResponse(req);
  if (errorResponse) return errorResponse;

  const { searchParams } = new URL(req.url);
  const year = Number.parseInt(searchParams.get("year") ?? "", 10);
  const month = Number.parseInt(searchParams.get("month") ?? "", 10);

  if (!Number.isInteger(year) || !Number.isInteger(month)) {
    return new Response("Bad params", { status: 400 });
  }

  const rows = await prisma.weeklyPlan.findMany({
    where: { marketId: market.id, year, month },
    orderBy: { weekday: "asc" },
  });

  return Response.json(rows);
}

// PATCH /api/weekly-plan — bulk activate/deactivate svih dana u mesecu
export async function PATCH(req) {
  const { market, errorResponse } = await requireAdminMarketOrResponse(req);
  if (errorResponse) return errorResponse;

  const body = await req.json().catch(() => ({}));
  const year = Number.parseInt(body.year, 10);
  const month = Number.parseInt(body.month, 10);
  const { active } = body;

  if (!Number.isInteger(year) || !Number.isInteger(month) || typeof active !== "boolean") {
    return new Response("bad payload", { status: 400 });
  }

  const { count } = await prisma.weeklyPlan.updateMany({
    where: { marketId: market.id, year, month },
    data: { active },
  });

  revalidateTag("calendar", { expire: 0 });
  return Response.json({ updated: count });
}

export async function PUT(req) {
  const { market, errorResponse } = await requireAdminMarketOrResponse(req);
  if (errorResponse) return errorResponse;

  const body = await req.json().catch(() => ({}));
  const year = Number.parseInt(body.year, 10);
  const month = Number.parseInt(body.month, 10);
  const weekday = Number.parseInt(body.weekday, 10);

  const MIN_YEAR = 2024, MAX_YEAR = new Date().getFullYear() + 5;
  if (
    !Number.isInteger(year) || year < MIN_YEAR || year > MAX_YEAR ||
    !Number.isInteger(month) || month < 0 || month > 11 ||
    !Number.isInteger(weekday) || weekday < 0 || weekday > 6
  ) {
    return new Response("Bad payload", { status: 400 });
  }

  const {
    icon, link, buttonColor, active, scratch, flipCard,
    title, button, rich, richHtml,
    translations: rawTranslations, defaultLang, category,
  } = body;

  const theme = await resolveMonthTheme(market.id, year, month);
  const allowed = getAllowedWeeklyCategories(theme);
  if (category && !allowed.includes(category)) {
    return new Response(`category "${category}" not allowed outside football theme`, { status: 400 });
  }

  const translations = rawTranslations || {};
  const mainLang = defaultLang || market.defaultLocale || "sr";
  const mainT = translations[mainLang] || {};

  const data = {
    marketId: market.id,
    year, month, weekday,
    title: mainT.title ?? title ?? "",
    button: mainT.button ?? button ?? "",
    rich: mainT.rich ?? rich ?? null,
    richHtml: sanitizeRichHtml(mainT.richHtml ?? richHtml ?? null),
    link: sanitizeLink(mainT.link ?? link ?? ""),
    icon: icon ?? null,
    active: Boolean(active ?? true),
    scratch: !!scratch,
    flipCard: !!flipCard,
    buttonColor: buttonColor || "green",
    translations: sanitizeTranslations(translations),
    category: category || "ALL",
  };

  const row = await prisma.weeklyPlan.upsert({
    where: { marketId_year_month_weekday: { marketId: market.id, year, month, weekday } },
    create: data,
    update: data,
  });

  revalidateTag("calendar", { expire: 0 });
  return Response.json(row);
}

export async function DELETE(req) {
  const { market, errorResponse } = await requireAdminMarketOrResponse(req);
  if (errorResponse) return errorResponse;

  const body = await req.json().catch(() => ({}));
  const year = Number.parseInt(body.year, 10);
  const month = Number.parseInt(body.month, 10);
  const weekday = Number.parseInt(body.weekday, 10);

  if (
    ![year, month, weekday].every(Number.isInteger) ||
    weekday < 0 || weekday > 6
  ) {
    return new Response("Bad payload", { status: 400 });
  }

  try {
    await prisma.weeklyPlan.delete({
      where: { marketId_year_month_weekday: { marketId: market.id, year, month, weekday } },
    });
  } catch (err) {
    // P2025 = već ne postoji — i dalje vraćamo 204. Svaka druga greška mora
    // da se propagira, ne da se tiho prikaže adminu kao uspešno brisanje.
    if (err?.code !== "P2025") throw err;
  }

  revalidateTag("calendar", { expire: 0 });
  return new Response(null, { status: 204 });
}
