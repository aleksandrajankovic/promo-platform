// src/app/api/special/route.js
export const runtime = "nodejs";

import { revalidateTag } from "next/cache";
import prisma from "@/lib/db";
import { requireAdminMarketOrResponse } from "@/lib/marketScope";
import { prepareSpecialData } from "@/lib/calendar/specialPayload";

export async function GET(req) {
  const { market, errorResponse } = await requireAdminMarketOrResponse(req);
  if (errorResponse) return errorResponse;

  const rows = await prisma.specialPromotion.findMany({ where: { marketId: market.id } });
  const safe = rows.map((r) => ({ ...r, richHtml: r.richHtml ?? null }));
  return Response.json(safe);
}

// PATCH /api/special — bulk activate/deactivate by ids
export async function PATCH(req) {
  const { market, errorResponse } = await requireAdminMarketOrResponse(req);
  if (errorResponse) return errorResponse;

  const body = await req.json().catch(() => ({}));
  const { ids, active } = body;

  if (!Array.isArray(ids) || ids.length === 0 || typeof active !== "boolean") {
    return new Response("bad payload", { status: 400 });
  }

  const { count } = await prisma.specialPromotion.updateMany({
    where: { id: { in: ids.map(Number) }, marketId: market.id },
    data: { active },
  });

  revalidateTag("calendar", { expire: 0 });
  return Response.json({ updated: count });
}

export async function POST(req) {
  const { market, errorResponse } = await requireAdminMarketOrResponse(req);
  if (errorResponse) return errorResponse;

  const body = await req.json().catch(() => ({}));
  const { data, error } = await prepareSpecialData(body, market);
  if (error) return error;

  const created = await prisma.specialPromotion.create({
    data: { ...data, active: data.active ?? true },
  });

  revalidateTag("calendar", { expire: 0 });
  return Response.json(created, { status: 201 });
}
