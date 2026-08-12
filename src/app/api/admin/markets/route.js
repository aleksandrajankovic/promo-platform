// src/app/api/admin/markets/route.js
export const runtime = "nodejs";

import prisma from "@/lib/db";
import { getAdminFromRequest } from "@/lib/auth";

// GET /api/admin/markets — lista svih tržišta (za market switcher / user management dropdown)
export async function GET(req) {
  const session = await getAdminFromRequest(req);
  if (!session) return new Response("Unauthorized", { status: 401 });

  const markets = await prisma.market.findMany({
    orderBy: { code: "asc" },
    select: { id: true, code: true, name: true, active: true },
  });

  return Response.json(markets);
}
