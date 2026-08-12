// src/app/api/admin/users/[id]/route.js
export const runtime = "nodejs";

import prisma from "@/lib/db";
import { requireSuperAdminSession, MarketScopeError } from "@/lib/marketScope";

// PATCH /api/admin/users/:id  -> edit name/email/role/market (samo super admin)
export async function PATCH(req, { params }) {
  const { id: idParam } = await params;

  try {
    await requireSuperAdminSession(req);

    const id = Number(idParam);
    if (!Number.isInteger(id)) return new Response("Bad id", { status: 400 });

    const body = await req.json().catch(() => ({}));
    const data = {};
    if (body.name) data.name = String(body.name).trim();
    if (body.email) data.email = String(body.email).trim().toLowerCase();
    if (body.role === "SUPER_ADMIN" || body.role === "ADMIN") data.role = body.role;
    if ("marketId" in body) data.marketId = body.marketId || null;

    if (!Object.keys(data).length) {
      return new Response("Nothing to update", { status: 400 });
    }

    const finalRole = data.role ?? (await prisma.adminUser.findUnique({ where: { id }, select: { role: true } }))?.role;
    const finalMarketId = "marketId" in data ? data.marketId : undefined;
    if (finalRole === "ADMIN" && finalMarketId === null) {
      return new Response("marketId is required for a non-super admin", { status: 400 });
    }
    if (finalRole === "SUPER_ADMIN") data.marketId = null;

    if (data.email) {
      const existing = await prisma.adminUser.findUnique({ where: { email: data.email } });
      if (existing && existing.id !== id) {
        return new Response("Email already in use", { status: 409 });
      }
    }
    if (data.marketId) {
      const market = await prisma.market.findUnique({ where: { id: data.marketId } });
      if (!market) return new Response("Unknown marketId", { status: 400 });
    }

    const updated = await prisma.adminUser.update({
      where: { id },
      data,
      select: { id: true, name: true, email: true, role: true, marketId: true, createdAt: true, updatedAt: true },
    });

    return Response.json(updated);
  } catch (err) {
    if (err instanceof MarketScopeError) return new Response(err.message, { status: err.status });
    console.error("Update admin error:", err);
    return new Response("Error", { status: 500 });
  }
}

// DELETE /api/admin/users/:id  -> brisanje (samo super admin)
export async function DELETE(req, { params }) {
  const { id: idParam } = await params;

  try {
    const session = await requireSuperAdminSession(req);

    const id = Number(idParam);
    if (!Number.isInteger(id)) return new Response("Bad id", { status: 400 });

    if (id === session.adminId) {
      return new Response("Cannot delete yourself", { status: 400 });
    }

    const user = await prisma.adminUser.findUnique({ where: { id } });
    if (!user) return new Response("Not found", { status: 404 });

    if (user.role === "SUPER_ADMIN") {
      const otherSupers = await prisma.adminUser.count({
        where: { role: "SUPER_ADMIN", NOT: { id } },
      });
      if (otherSupers === 0) {
        return new Response("Cannot delete last super admin", { status: 400 });
      }
    }

    await prisma.adminUser.delete({ where: { id } });
    return new Response(null, { status: 204 });
  } catch (err) {
    if (err instanceof MarketScopeError) return new Response(err.message, { status: err.status });
    console.error("Delete admin error:", err);
    return new Response("Error", { status: 500 });
  }
}
