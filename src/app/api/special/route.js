// src/app/api/special/route.js
export const runtime = "nodejs";

import { revalidateTag } from "next/cache";
import prisma from "@/lib/db";
import { requireAdminMarketOrResponse } from "@/lib/marketScope";
import { prepareSpecialData } from "@/lib/calendar/specialPayload";
import { AUTHOR_INCLUDE, auditEntry, specialLabel } from "@/lib/audit";

export async function GET(req) {
  const { market, errorResponse } = await requireAdminMarketOrResponse(req);
  if (errorResponse) return errorResponse;

  const rows = await prisma.specialPromotion.findMany({
    where: { marketId: market.id },
    include: AUTHOR_INCLUDE,
  });
  const safe = rows.map((r) => ({ ...r, richHtml: r.richHtml ?? null }));
  return Response.json(safe);
}

// PATCH /api/special — bulk activate/deactivate by ids
export async function PATCH(req) {
  const { session, market, errorResponse } = await requireAdminMarketOrResponse(req);
  if (errorResponse) return errorResponse;

  const body = await req.json().catch(() => ({}));
  const { ids, active } = body;

  if (!Array.isArray(ids) || ids.length === 0 || typeof active !== "boolean") {
    return new Response("bad payload", { status: 400 });
  }

  // samo redovi kojima se status stvarno menja — po jedan zapis u istoriji
  const rows = await prisma.specialPromotion.findMany({
    where: { id: { in: ids.map(Number) }, marketId: market.id, active: !active },
    select: { id: true, year: true, month: true, day: true, title: true },
  });
  await prisma.$transaction([
    prisma.specialPromotion.updateMany({
      where: { id: { in: rows.map((r) => r.id) } },
      data: { active, updatedById: session.adminId },
    }),
    prisma.promoAuditLog.createMany({
      data: rows.map((r) =>
        auditEntry({
          session, marketId: market.id, entity: "special", entityId: r.id,
          action: active ? "activate" : "deactivate", label: specialLabel(r),
        })
      ),
    }),
  ]);

  revalidateTag("calendar", { expire: 0 });
  return Response.json({ updated: rows.length });
}

export async function POST(req) {
  const { session, market, errorResponse } = await requireAdminMarketOrResponse(req);
  if (errorResponse) return errorResponse;

  const body = await req.json().catch(() => ({}));
  const { data, error } = await prepareSpecialData(body, market);
  if (error) return error;

  const created = await prisma.$transaction(async (tx) => {
    const row = await tx.specialPromotion.create({
      data: { ...data, active: data.active ?? true, createdById: session.adminId, updatedById: session.adminId },
      include: AUTHOR_INCLUDE,
    });
    await tx.promoAuditLog.create({
      data: auditEntry({
        session, marketId: market.id, entity: "special", entityId: row.id,
        action: "create", label: specialLabel(row),
      }),
    });
    return row;
  });

  revalidateTag("calendar", { expire: 0 });
  return Response.json(created, { status: 201 });
}
