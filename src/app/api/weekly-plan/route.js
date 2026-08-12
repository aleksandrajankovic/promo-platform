// src/app/api/weekly-plan/route.js
export const runtime = "nodejs";

import { revalidateTag } from "next/cache";
import prisma from "@/lib/db";
import { getAdminFromRequest } from "@/lib/auth";
import { sanitizeRichHtml, sanitizeTranslations } from "@/lib/sanitize";
import { sanitizeLink } from "@/lib/validate";

const DEFAULT_LANG = "pt";

// GET /api/weekly-plan?year=YYYY&month=MM — public, za front
export async function GET(req) {
  const { searchParams } = new URL(req.url);
  const year = Number.parseInt(searchParams.get("year") ?? "", 10);
  const month = Number.parseInt(searchParams.get("month") ?? "", 10);

  if (!Number.isInteger(year) || !Number.isInteger(month)) {
    return new Response("Bad params", { status: 400 });
  }

  const rows = await prisma.weeklyPlan.findMany({
    where: { year, month },
    orderBy: { weekday: "asc" },
  });

  return Response.json(rows);
}

// PATCH /api/weekly-plan — bulk activate/deactivate svih dana u mesecu
export async function PATCH(req) {
  const session = await getAdminFromRequest(req);
  if (!session) return new Response("unauthorized", { status: 401 });

  const body = await req.json().catch(() => ({}));
  const year = Number.parseInt(body.year, 10);
  const month = Number.parseInt(body.month, 10);
  const { active } = body;

  if (!Number.isInteger(year) || !Number.isInteger(month) || typeof active !== "boolean") {
    return new Response("bad payload", { status: 400 });
  }

  const { count } = await prisma.weeklyPlan.updateMany({
    where: { year, month },
    data: { active },
  });

  revalidateTag("calendar");
  return Response.json({ updated: count });
}

export async function PUT(req) {
  const session = await getAdminFromRequest(req);
  if (!session) return new Response("unauthorized", { status: 401 });

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

  const {
    icon, link, buttonColor, active, scratch,
    title, button, rich, richHtml,
    translations: rawTranslations, defaultLang, category,
  } = body;

  const translations = rawTranslations || {};
  const mainLang = defaultLang || DEFAULT_LANG;
  const mainT = translations[mainLang] || {};

  const data = {
    year, month, weekday,
    title: mainT.title ?? title ?? "",
    button: mainT.button ?? button ?? "",
    rich: mainT.rich ?? rich ?? null,
    richHtml: sanitizeRichHtml(mainT.richHtml ?? richHtml ?? null),
    link: sanitizeLink(mainT.link ?? link ?? ""),
    icon: icon ?? null,
    active: Boolean(active ?? true),
    scratch: !!scratch,
    buttonColor: buttonColor || "green",
    translations: sanitizeTranslations(translations),
    category: category || "ALL",
  };

  const row = await prisma.weeklyPlan.upsert({
    where: { year_month_weekday: { year, month, weekday } },
    create: data,
    update: data,
  });

  revalidateTag("calendar");
  return Response.json(row);
}

export async function DELETE(req) {
  const session = await getAdminFromRequest(req);
  if (!session) return new Response("unauthorized", { status: 401 });

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
      where: { year_month_weekday: { year, month, weekday } },
    });
  } catch {
    // ako ne postoji, i dalje vraćamo 204
  }

  revalidateTag("calendar");
  return new Response(null, { status: 204 });
}
