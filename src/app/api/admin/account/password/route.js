// src/app/api/admin/account/password/route.js
// PUT — ulogovan admin menja sopstvenu lozinku (i privremenu, posle reseta).
export const runtime = "nodejs";

import bcrypt from "bcryptjs";
import prisma from "@/lib/db";
import { requireAccountSessionOrResponse } from "@/lib/marketScope";
import { sessionCookieFor } from "@/lib/auth";
import { validateNewPassword } from "@/lib/password";

export async function PUT(req) {
  const { session, admin, errorResponse } = await requireAccountSessionOrResponse(req);
  if (errorResponse) return errorResponse;

  const body = await req.json().catch(() => ({}));
  const currentPassword = String(body.currentPassword ?? "");
  const newPassword = String(body.newPassword ?? "");

  const { passwordHash } = await prisma.adminUser.findUnique({ where: { id: admin.id }, select: { passwordHash: true } });
  if (!(await bcrypt.compare(currentPassword, passwordHash))) {
    return new Response("Current password is incorrect.", { status: 400 });
  }
  const problem = validateNewPassword(newPassword, { email: admin.email });
  if (problem) return new Response(problem, { status: 400 });
  if (await bcrypt.compare(newPassword, passwordHash)) {
    return new Response("New password must be different from the current one.", { status: 400 });
  }

  // passwordChangedAt poništava sve ostale sesije (npr. na drugom računaru);
  // ova dobija novu, sa istim mfa statusom.
  await prisma.adminUser.update({
    where: { id: admin.id },
    data: {
      passwordHash: await bcrypt.hash(newPassword, 10),
      mustChangePassword: false,
      passwordChangedAt: new Date(),
    },
  });

  return new Response(null, {
    status: 204,
    headers: { "Set-Cookie": await sessionCookieFor(admin, { mfa: !!session.mfa }) },
  });
}
