// src/app/api/special/[id]/route.js
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

// Postojeći red mora pripadati market-u iz sesije — u suprotnom admin jednog
// tržišta mogao bi da menja/briše promocije drugog tržišta pogađanjem id-a.
async function findOwnedOrNull(specialId, marketId) {
  return prisma.specialPromotion.findFirst({ where: { id: specialId, marketId } });
}

export async function PUT(req, { params }) {
  let market;
  try {
    ({ market } = await requireAdminMarket(req));
  } catch (err) {
    if (err instanceof MarketScopeError) return new Response(err.message, { status: err.status });
    throw err;
  }

  const { id } = await params;
  const specialId = Number.parseInt(id, 10);
  if (!Number.isInteger(specialId)) return new Response("bad id", { status: 400 });

  const existing = await prisma.specialPromotion.findUnique({ where: { id: specialId } });
  if (existing && existing.marketId !== market.id) {
    return new Response("not found", { status: 404 });
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
    !Number.isInteger(year) || year < MIN_YEAR || year > MAX_YEAR ||
    !Number.isInteger(month) || month < 0 || month > 11 ||
    !Number.isInteger(day) || day < 1 || day > 31
  ) {
    return new Response("Invalid date", { status: 400 });
  }
  if (!((title ?? "").trim() || (mainT.title ?? "").trim())) {
    return new Response("Title is required", { status: 400 });
  }

  const theme = await resolveMonthTheme(market.id, year, month);
  const allowed = getAllowedCategories(theme);
  if (category && !allowed.includes(category)) {
    return new Response(`category "${category}" not allowed outside football theme`, { status: 400 });
  }
  if (knockoutPhase && theme !== "football") {
    return new Response("knockoutPhase only allowed for football theme", { status: 400 });
  }

  const data = {
    marketId: market.id,
    year, month, day,
    title: mainT.title ?? title ?? "",
    button: mainT.button ?? button ?? "",
    link: sanitizeLink(mainT.link ?? link ?? ""),
    rich: mainT.rich ?? rich ?? null,
    richHtml: sanitizeRichHtml(mainT.richHtml ?? richHtml ?? null),
    icon: icon ?? "",
    active: !!active,
    scratch: !!scratch,
    flipCard: !!flipCard,
    buttonColor: buttonColor || "green",
    translations: sanitizeTranslations(translations),
    category: category || "ALL",
    knockoutPhase: knockoutPhase || null,
  };

  const row = await prisma.specialPromotion.upsert({
    where: { id: specialId },
    update: data,
    create: { id: specialId, ...data },
  });

  revalidateTag("calendar");
  return Response.json(row);
}

export async function PATCH(req, { params }) {
  let market;
  try {
    ({ market } = await requireAdminMarket(req));
  } catch (err) {
    if (err instanceof MarketScopeError) return new Response(err.message, { status: err.status });
    throw err;
  }

  const { id } = await params;
  const specialId = Number.parseInt(id, 10);
  if (!Number.isInteger(specialId)) return new Response("bad id", { status: 400 });

  const owned = await findOwnedOrNull(specialId, market.id);
  if (!owned) return new Response("not found", { status: 404 });

  const body = await req.json().catch(() => ({}));

  const patch = {
    ...(typeof body.active === "boolean" ? { active: body.active } : {}),
    ...(typeof body.scratch === "boolean" ? { scratch: body.scratch } : {}),
  };

  if (Object.keys(patch).length === 0) {
    return new Response("bad payload", { status: 400 });
  }

  try {
    const row = await prisma.specialPromotion.update({
      where: { id: specialId },
      data: patch,
    });
    revalidateTag("calendar");
    return Response.json(row);
  } catch {
    return new Response("not found", { status: 404 });
  }
}

export async function DELETE(req, { params }) {
  let market;
  try {
    ({ market } = await requireAdminMarket(req));
  } catch (err) {
    if (err instanceof MarketScopeError) return new Response(err.message, { status: err.status });
    throw err;
  }

  const { id } = await params;
  const specialId = Number.parseInt(id, 10);
  if (!Number.isInteger(specialId)) return new Response("bad id", { status: 400 });

  const owned = await findOwnedOrNull(specialId, market.id);
  if (!owned) return new Response(null, { status: 204 });

  await prisma.specialPromotion.delete({ where: { id: specialId } }).catch(() => {});
  revalidateTag("calendar");
  return new Response(null, { status: 204 });
}
