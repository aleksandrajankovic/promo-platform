// src/app/api/special/route.js
export const runtime = "nodejs";

import { revalidateTag } from "next/cache";
import prisma from "@/lib/db";
import { getAdminFromRequest } from "@/lib/auth";
import { sanitizeRichHtml, sanitizeTranslations } from "@/lib/sanitize";
import { sanitizeLink } from "@/lib/validate";

const DEFAULT_LANG = "pt";

export async function GET(req) {
  const session = await getAdminFromRequest(req);
  if (!session) return new Response("unauthorized", { status: 401 });

  const rows = await prisma.specialPromotion.findMany();
  const safe = rows.map((r) => ({ ...r, richHtml: r.richHtml ?? null }));
  return Response.json(safe);
}

// PATCH /api/special — bulk activate/deactivate by ids
export async function PATCH(req) {
  const session = await getAdminFromRequest(req);
  if (!session) return new Response("unauthorized", { status: 401 });

  const body = await req.json().catch(() => ({}));
  const { ids, active } = body;

  if (!Array.isArray(ids) || ids.length === 0 || typeof active !== "boolean") {
    return new Response("bad payload", { status: 400 });
  }

  const { count } = await prisma.specialPromotion.updateMany({
    where: { id: { in: ids.map(Number) } },
    data: { active },
  });

  revalidateTag("calendar");
  return Response.json({ updated: count });
}

export async function POST(req) {
  const session = await getAdminFromRequest(req);
  if (!session) return new Response("unauthorized", { status: 401 });

  const body = await req.json().catch(() => ({}));
  const {
    year, month, day, icon, link, buttonColor, active, scratch,
    title, button, rich, richHtml,
    translations: rawTranslations, defaultLang, category, knockoutPhase,
  } = body;

  const translations = rawTranslations || {};
  const mainLang = defaultLang || DEFAULT_LANG;
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

  const created = await prisma.specialPromotion.create({
    data: {
      year, month, day,
      title: mainT.title ?? title ?? "",
      button: mainT.button ?? button ?? "",
      link: sanitizeLink(mainT.link ?? link ?? ""),
      rich: mainT.rich ?? rich ?? null,
      richHtml: sanitizeRichHtml(mainT.richHtml ?? richHtml ?? null),
      icon: icon ?? "",
      active: typeof active === "boolean" ? active : true,
      scratch: !!scratch,
      buttonColor: buttonColor || "green",
      translations: sanitizeTranslations(translations),
      category: category || "ALL",
      knockoutPhase: knockoutPhase || null,
    },
  });

  revalidateTag("calendar");
  return Response.json(created, { status: 201 });
}
