// src/app/api/admin/users/route.js
export const runtime = "nodejs";

import bcrypt from "bcryptjs";
import prisma from "@/lib/db";
import { getAdminFromRequest } from "@/lib/auth";

// GET /api/admin/users  -> lista svih admina (samo super admin, vidi sva tržišta)
export async function GET(req) {
  try {
    const session = await getAdminFromRequest(req);
    if (!session) return new Response("Unauthorized", { status: 401 });
    if (session.role !== "SUPER_ADMIN") return new Response("Forbidden", { status: 403 });

    const admins = await prisma.adminUser.findMany({
      orderBy: { id: "asc" },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        marketId: true,
        market: { select: { code: true, name: true } },
        createdAt: true,
        updatedAt: true,
      },
    });

    return Response.json(admins);
  } catch (err) {
    console.error("List admins error:", err);
    return new Response("Error", { status: 500 });
  }
}

export async function POST(req) {
  try {
    const session = await getAdminFromRequest(req);
    if (!session) return new Response("Unauthorized", { status: 401 });
    if (session.role !== "SUPER_ADMIN") return new Response("Forbidden", { status: 403 });

    const body = await req.json().catch(() => ({}));
    let { name, email, password, role, marketId } = body;

    name = (name || "").trim();
    email = (email || "").trim().toLowerCase();
    password = (password || "").trim();
    role = role === "SUPER_ADMIN" ? "SUPER_ADMIN" : "ADMIN";
    marketId = role === "SUPER_ADMIN" ? null : (marketId || "").trim();

    if (!name || !email || !password) {
      return new Response("Missing fields", { status: 400 });
    }
    if (role === "ADMIN" && !marketId) {
      return new Response("marketId is required for a non-super admin", { status: 400 });
    }

    const existing = await prisma.adminUser.findUnique({ where: { email } });
    if (existing) {
      return new Response("Email already in use", { status: 409 });
    }

    if (marketId) {
      const market = await prisma.market.findUnique({ where: { id: marketId } });
      if (!market) return new Response("Unknown marketId", { status: 400 });
    }

    const passwordHash = await bcrypt.hash(password, 10);

    const newAdmin = await prisma.adminUser.create({
      data: { name, email, passwordHash, role, marketId },
      select: { id: true, name: true, email: true, role: true, marketId: true, createdAt: true },
    });

    return Response.json(newAdmin, { status: 201 });
  } catch (err) {
    console.error("Create admin error:", err);
    return new Response("Error", { status: 500 });
  }
}
