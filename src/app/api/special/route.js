// src/app/api/special/route.js
export const runtime = "nodejs";

import { revalidateTag } from "next/cache";
import prisma from "@/lib/db";
import { requireAdminMarket, MarketScopeError } from "@/lib/marketScope";
import { sanitizeRichHtml, sanitizeTranslations } from "@/lib/sanitize";
import { sanitizeLink } from "@/lib/validate";
import { getAllowedCategories } from "@/lib/calendar/promoCategoryStyles";

async function resolveMonthTheme(marketId, year, month) {
  const settings = await prisma.calendarSettings.findUnique({ where: { marketId } });
  const monthBg = settings?.monthBackgrounds?.[`${year}-${month}`];
  return monthBg?.theme || settings?.theme || "default";
}

export async function GET(req) {
  let market;
  try {
    ({ market } = await requireAdminMarket(req));
  } catch (err) {
    if (err instanceof MarketScopeError) return new Response(err.message, { status: err.status });
    throw err;
  }

  const rows = await prisma.specialPromotion.findMany({ where: { marketId: market.id } });
  const safe = rows.map((r) => ({ ...r, richHtml: r.richHtml ?? null }));
  return Response.json(safe);
}

// PATCH /api/special — bulk activate/deactivate by ids
export async function PATCH(req) {
  let market;
  try {
    ({ market } = await requireAdminMarket(req));
  } catch (err) {
    if (err instanceof MarketScopeError) return new Response(err.message, { status: err.status });
    throw err;
  }

  const body = await req.json().catch(() => ({}));
  const { ids, active } = body;

  if (!Array.isArray(ids) || ids.length === 0 || typeof active !== "boolean") {
    return new Response("bad payload", { status: 400 });
  }

  const { count } = await prisma.specialPromotion.updateMany({
    where: { id: { in: ids.map(Number) }, marketId: market.id },
    data: { active },
  });

  revalidateTag("calendar");
  return Response.json({ updated: count });
}

export async function POST(req) {
  let market;
  try {
    ({ market } = await requireAdminMarket(req));
  } catch (err) {
    if (err instanceof MarketScopeError) return new Response(err.message, { status: err.status });
    throw err;
  }

  const body = await req.json().catch(() => ({}));
  const {
    year, month, day, icon, link, buttonColor, active, scratch, flipCard,
    title, button, rich, richHtml,
    translations: rawTranslations, defaultLang, category, knockoutPhase,
  } = body;

  const translations = rawTranslations || {};
  const mainLang = defaultLang || market.defaultLocale || "sr";
  const mainT = translations[mainLang] || {};

  const MIN_YEAR = 2024, MAX_YEAR = new Date().getFullYear() + 5;
  if (
    typeof year !== "number" || !Number.isInteger(year) || year < MIN_YEAR || year > MAX_YEAR ||
    typeof month !== "number" || !Number.isInteger(month) || month < 0 || month > 11 ||
    typeof day !== "number" || !Number.isInteger(day) || day < 1 || day > 31 ||
    !(title || mainT.title)
  ) {
    return new Response("bad payload", { status: 400 });
  }

  const theme = await resolveMonthTheme(market.id, year, month);
  const allowed = getAllowedCategories(theme);
  if (category && !allowed.includes(category)) {
    return new Response(`category "${category}" not allowed outside football theme`, { status: 400 });
  }
  if (knockoutPhase && theme !== "football") {
    return new Response("knockoutPhase only allowed for football theme", { status: 400 });
  }

  const created = await prisma.specialPromotion.create({
    data: {
      marketId: market.id,
      year, month, day,
      title: mainT.title ?? title ?? "",
      button: mainT.button ?? button ?? "",
      link: sanitizeLink(mainT.link ?? link ?? ""),
      rich: mainT.rich ?? rich ?? null,
      richHtml: sanitizeRichHtml(mainT.richHtml ?? richHtml ?? null),
      icon: icon ?? "",
      active: typeof active === "boolean" ? active : true,
      scratch: !!scratch,
      flipCard: !!flipCard,
      buttonColor: buttonColor || "green",
      translations: sanitizeTranslations(translations),
      category: category || "ALL",
      knockoutPhase: knockoutPhase || null,
    },
  });

  revalidateTag("calendar");
  return Response.json(created, { status: 201 });
}
