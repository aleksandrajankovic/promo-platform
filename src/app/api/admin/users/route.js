// src/app/api/admin/users/route.js
export const runtime = "nodejs";

import bcrypt from "bcryptjs";
import prisma from "@/lib/db";
import { ADMIN_USER_SELECT } from "@/lib/adminUserSelect";
import { normalizeMarketIds, requireSuperAdminSessionOrResponse } from "@/lib/marketScope";

// GET /api/admin/users  -> lista svih admina (samo super admin, vidi sva tržišta)
export async function GET(req) {
  const { errorResponse } = await requireSuperAdminSessionOrResponse(req);
  if (errorResponse) return errorResponse;

  try {
    const admins = await prisma.adminUser.findMany({
      orderBy: { id: "asc" },
      select: ADMIN_USER_SELECT,
    });

    return Response.json(admins);
  } catch (err) {
    console.error("List admins error:", err);
    return new Response("Error", { status: 500 });
  }
}

export async function POST(req) {
  const { errorResponse } = await requireSuperAdminSessionOrResponse(req);
  if (errorResponse) return errorResponse;

  try {
    const body = await req.json().catch(() => ({}));
    let { name, email, password, role, marketIds } = body;

    name = (name || "").trim();
    email = (email || "").trim().toLowerCase();
    password = (password || "").trim();
    role = role === "SUPER_ADMIN" ? "SUPER_ADMIN" : "ADMIN";
    marketIds = role === "SUPER_ADMIN" ? [] : normalizeMarketIds(marketIds);

    if (!name || !email || !password) {
      return new Response("Missing fields", { status: 400 });
    }
    if (role === "ADMIN" && !marketIds.length) {
      return new Response("marketIds is required for a non-super admin", { status: 400 });
    }

    const existing = await prisma.adminUser.findUnique({ where: { email } });
    if (existing) {
      return new Response("Email already in use", { status: 409 });
    }

    if (marketIds.length) {
      const found = await prisma.market.count({ where: { id: { in: marketIds } } });
      if (found !== marketIds.length) return new Response("Unknown marketId", { status: 400 });
    }

    const passwordHash = await bcrypt.hash(password, 10);

    const newAdmin = await prisma.adminUser.create({
      // lozinku je izabrao super admin — korisnik je menja pri prvoj prijavi
      data: {
        name, email, passwordHash, role, mustChangePassword: true,
        markets: { connect: marketIds.map((id) => ({ id })) },
      },
      select: ADMIN_USER_SELECT,
    });

    return Response.json(newAdmin, { status: 201 });
  } catch (err) {
    console.error("Create admin error:", err);
    return new Response("Error", { status: 500 });
  }
}
