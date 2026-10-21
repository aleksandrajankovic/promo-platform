// src/app/api/admin/markets/route.js
export const runtime = "nodejs";

import prisma from "@/lib/db";
import { loadSessionAdmin, MarketScopeError } from "@/lib/marketScope";

// GET /api/admin/markets — lista svih tržišta (za market switcher / user management dropdown)
export async function GET(req) {
  try {
    await loadSessionAdmin(req);
  } catch (err) {
    if (err instanceof MarketScopeError) return new Response(err.message, { status: err.status });
    throw err;
  }

  const markets = await prisma.market.findMany({
    orderBy: { code: "asc" },
    select: { id: true, code: true, name: true, active: true },
  });

  return Response.json(markets);
}
