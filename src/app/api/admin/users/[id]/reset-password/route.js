// POST /api/admin/users/:id/reset-password — super admin postavlja privremenu
// lozinku; vraća je jednom, korisnik je mora promeniti pri prvoj prijavi.
export const runtime = "nodejs";

import bcrypt from "bcryptjs";
import prisma from "@/lib/db";
import { requireSuperAdminSessionOrResponse } from "@/lib/marketScope";
import { generateTempPassword } from "@/lib/password";

export async function POST(req, { params }) {
  const { session, errorResponse } = await requireSuperAdminSessionOrResponse(req);
  if (errorResponse) return errorResponse;

  const id = Number((await params).id);
  if (!Number.isInteger(id)) return new Response("Bad id", { status: 400 });
  if (id === session.adminId) return new Response("Use My account to change your own password.", { status: 400 });

  const tempPassword = generateTempPassword();
  try {
    await prisma.adminUser.update({
      where: { id },
      data: {
        passwordHash: await bcrypt.hash(tempPassword, 10),
        mustChangePassword: true,
        // odjavljuje korisnika svuda gde je bio prijavljen
        passwordChangedAt: new Date(),
      },
    });
  } catch (err) {
    if (err?.code === "P2025") return new Response("Not found", { status: 404 });
    throw err;
  }

  return Response.json({ tempPassword });
}
