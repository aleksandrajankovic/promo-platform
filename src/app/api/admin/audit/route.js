// src/app/api/admin/audit/route.js
export const runtime = "nodejs";

import prisma from "@/lib/db";
import { requireAdminMarketOrResponse } from "@/lib/marketScope";

const MAX_LIMIT = 100;

// GET /api/admin/audit — istorija izmena promocija za trenutno tržište.
// ?entity=special|weekly&entityId=N  → istorija jedne promocije
// ?limit=50&before=<id>               → stranica starijih zapisa
export async function GET(req) {
  const { market, errorResponse } = await requireAdminMarketOrResponse(req);
  if (errorResponse) return errorResponse;

  const { searchParams } = new URL(req.url);
  const entity = searchParams.get("entity");
  const entityId = Number.parseInt(searchParams.get("entityId") ?? "", 10);
  const before = Number.parseInt(searchParams.get("before") ?? "", 10);
  const limit = Math.min(Number.parseInt(searchParams.get("limit") ?? "", 10) || 50, MAX_LIMIT);

  const rows = await prisma.promoAuditLog.findMany({
    where: {
      marketId: market.id,
      ...(entity === "special" || entity === "weekly" ? { entity } : {}),
      ...(Number.isInteger(entityId) ? { entityId } : {}),
      ...(Number.isInteger(before) ? { id: { lt: before } } : {}),
    },
    orderBy: { id: "desc" },
    take: limit,
  });

  return Response.json(rows);
}
