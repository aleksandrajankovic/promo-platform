// src/app/api/special/[id]/route.js
export const runtime = "nodejs";

import { revalidateTag } from "next/cache";
import prisma from "@/lib/db";
import { requireAdminMarketOrResponse } from "@/lib/marketScope";
import { prepareSpecialData } from "@/lib/calendar/specialPayload";

// Postojeći red mora pripadati market-u iz sesije — u suprotnom admin jednog
// tržišta mogao bi da menja/briše promocije drugog tržišta pogađanjem id-a.
async function findOwnedOrNull(specialId, marketId) {
  return prisma.specialPromotion.findFirst({ where: { id: specialId, marketId } });
}

// Samo izmena postojećeg reda — nove promocije idu preko POST /api/special.
// (Ranije je ovo bio upsert sa eksplicitnim id-jem, što bi mimoišlo Postgres
// sekvencu i kasnije oborilo POST na duplom primarnom ključu.)
export async function PUT(req, { params }) {
  const { market, errorResponse } = await requireAdminMarketOrResponse(req);
  if (errorResponse) return errorResponse;

  const { id } = await params;
  const specialId = Number.parseInt(id, 10);
  if (!Number.isInteger(specialId)) return new Response("bad id", { status: 400 });

  const owned = await findOwnedOrNull(specialId, market.id);
  if (!owned) return new Response("not found", { status: 404 });

  const body = await req.json().catch(() => ({}));
  const { data, error } = await prepareSpecialData(body, market);
  if (error) return error;

  const row = await prisma.specialPromotion.update({
    where: { id: specialId },
    data,
  });

  revalidateTag("calendar", { expire: 0 });
  return Response.json(row);
}

export async function PATCH(req, { params }) {
  const { market, errorResponse } = await requireAdminMarketOrResponse(req);
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

  try {
    const row = await prisma.specialPromotion.update({
      where: { id: specialId },
      data: patch,
    });
    revalidateTag("calendar", { expire: 0 });
    return Response.json(row);
  } catch {
    return new Response("not found", { status: 404 });
  }
}

export async function DELETE(req, { params }) {
  const { market, errorResponse } = await requireAdminMarketOrResponse(req);
  if (errorResponse) return errorResponse;

  const { id } = await params;
  const specialId = Number.parseInt(id, 10);
  if (!Number.isInteger(specialId)) return new Response("bad id", { status: 400 });

  const owned = await findOwnedOrNull(specialId, market.id);
  if (!owned) return new Response(null, { status: 204 });

  try {
    await prisma.specialPromotion.delete({ where: { id: specialId } });
  } catch (err) {
    // P2025 = already deleted (race with another request) — fine, treat as success.
    // Anything else is a real failure and must not be reported as a successful delete.
    if (err?.code !== "P2025") throw err;
  }
  revalidateTag("calendar", { expire: 0 });
  return new Response(null, { status: 204 });
}
