// src/app/api/special/[id]/route.js
export const runtime = "nodejs";

import { revalidateTag } from "next/cache";
import prisma from "@/lib/db";
import { getAdminFromRequest } from "@/lib/auth";
import { sanitizeRichHtml, sanitizeTranslations } from "@/lib/sanitize";
import { sanitizeLink } from "@/lib/validate";

const DEFAULT_LANG = "pt";

export async function PUT(req, { params }) {
  const session = await getAdminFromRequest(req);
  if (!session) return new Response("unauthorized", { status: 401 });

  const { id } = await params;
  const specialId = Number.parseInt(id, 10);
  if (!Number.isInteger(specialId)) return new Response("bad id", { status: 400 });

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
    !Number.isInteger(year) || year < MIN_YEAR || year > MAX_YEAR ||
    !Number.isInteger(month) || month < 0 || month > 11 ||
    !Number.isInteger(day) || day < 1 || day > 31
  ) {
    return new Response("Invalid date", { status: 400 });
  }
  if (!((title ?? "").trim() || (mainT.title ?? "").trim())) {
    return new Response("Title is required", { status: 400 });
  }

  const data = {
    year, month, day,
    title: mainT.title ?? title ?? "",
    button: mainT.button ?? button ?? "",
    link: sanitizeLink(mainT.link ?? link ?? ""),
    rich: mainT.rich ?? rich ?? null,
    richHtml: sanitizeRichHtml(mainT.richHtml ?? richHtml ?? null),
    icon: icon ?? "",
    active: !!active,
    scratch: !!scratch,
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
  const session = await getAdminFromRequest(req);
  if (!session) return new Response("unauthorized", { status: 401 });

  const { id } = await params;
  const specialId = Number.parseInt(id, 10);
  if (!Number.isInteger(specialId)) return new Response("bad id", { status: 400 });

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
  const session = await getAdminFromRequest(req);
  if (!session) return new Response("unauthorized", { status: 401 });

  const { id } = await params;
  const specialId = Number.parseInt(id, 10);
  if (!Number.isInteger(specialId)) return new Response("bad id", { status: 400 });

  await prisma.specialPromotion.delete({ where: { id: specialId } }).catch(() => {});
  revalidateTag("calendar");
  return new Response(null, { status: 204 });
}
