// src/app/api/special/[id]/route.js
export const runtime = "nodejs";

import { revalidateTag } from "next/cache";
import prisma from "@/lib/db";
import { requireAdminMarketOrResponse } from "@/lib/marketScope";
import { prepareSpecialData } from "@/lib/calendar/specialPayload";
import { AUTHOR_INCLUDE, auditEntry, diffPromo, specialLabel, updateAction } from "@/lib/audit";

// Postojeći red mora pripadati market-u iz sesije — u suprotnom admin jednog
// tržišta mogao bi da menja/briše promocije drugog tržišta pogađanjem id-a.
async function findOwnedOrNull(specialId, marketId) {
  return prisma.specialPromotion.findFirst({ where: { id: specialId, marketId } });
}

// Samo izmena postojećeg reda — nove promocije idu preko POST /api/special.
// (Ranije je ovo bio upsert sa eksplicitnim id-jem, što bi mimoišlo Postgres
// sekvencu i kasnije oborilo POST na duplom primarnom ključu.)
export async function PUT(req, { params }) {
  const { session, market, errorResponse } = await requireAdminMarketOrResponse(req);
  if (errorResponse) return errorResponse;

  const { id } = await params;
  const specialId = Number.parseInt(id, 10);
  if (!Number.isInteger(specialId)) return new Response("bad id", { status: 400 });

  const owned = await findOwnedOrNull(specialId, market.id);
  if (!owned) return new Response("not found", { status: 404 });

  const body = await req.json().catch(() => ({}));
  const { data, error } = await prepareSpecialData(body, market);
  if (error) return error;

  const changes = diffPromo(owned, data);
  const row = await prisma.$transaction(async (tx) => {
    const updated = await tx.specialPromotion.update({
      where: { id: specialId },
      data: { ...data, updatedById: session.adminId },
      include: AUTHOR_INCLUDE,
    });
    if (Object.keys(changes).length) {
      await tx.promoAuditLog.create({
        data: auditEntry({
          session, marketId: market.id, entity: "special", entityId: specialId,
          action: updateAction(changes), label: specialLabel(updated), changes,
        }),
      });
    }
    return updated;
  });

  revalidateTag("calendar", { expire: 0 });
  return Response.json(row);
}

export async function PATCH(req, { params }) {
  const { session, market, errorResponse } = await requireAdminMarketOrResponse(req);
  if (errorResponse) return errorResponse;

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

  const changes = diffPromo(owned, patch);
  try {
    const row = await prisma.$transaction(async (tx) => {
      const updated = await tx.specialPromotion.update({
        where: { id: specialId },
        data: { ...patch, updatedById: session.adminId },
        include: AUTHOR_INCLUDE,
      });
      if (Object.keys(changes).length) {
        await tx.promoAuditLog.create({
          data: auditEntry({
            session, marketId: market.id, entity: "special", entityId: specialId,
            action: updateAction(changes), label: specialLabel(updated), changes,
          }),
        });
      }
      return updated;
    });
    revalidateTag("calendar", { expire: 0 });
    return Response.json(row);
  } catch (err) {
    if (err?.code === "P2025") return new Response("not found", { status: 404 });
    throw err;
  }
}

export async function DELETE(req, { params }) {
  const { session, market, errorResponse } = await requireAdminMarketOrResponse(req);
  if (errorResponse) return errorResponse;

  const { id } = await params;
  const specialId = Number.parseInt(id, 10);
  if (!Number.isInteger(specialId)) return new Response("bad id", { status: 400 });

  const owned = await findOwnedOrNull(specialId, market.id);
  if (!owned) return new Response(null, { status: 204 });

  try {
    await prisma.$transaction([
      prisma.specialPromotion.delete({ where: { id: specialId } }),
      prisma.promoAuditLog.create({
        data: auditEntry({
          session, marketId: market.id, entity: "special", entityId: specialId,
          action: "delete", label: specialLabel(owned),
        }),
      }),
    ]);
  } catch (err) {
    // P2025 = already deleted (race with another request) — fine, treat as success.
    // Anything else is a real failure and must not be reported as a successful delete.
    if (err?.code !== "P2025") throw err;
  }
  revalidateTag("calendar", { expire: 0 });
  return new Response(null, { status: 204 });
}
