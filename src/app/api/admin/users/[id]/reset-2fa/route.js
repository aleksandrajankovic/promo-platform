// POST /api/admin/users/:id/reset-2fa — za korisnika koji je izgubio telefon i
// rezervne kodove. Super admin će pri sledećoj prijavi morati ponovo da podesi 2FA.
export const runtime = "nodejs";

import prisma from "@/lib/db";
import { requireSuperAdminSessionOrResponse } from "@/lib/marketScope";

export async function POST(req, { params }) {
  const { session, errorResponse } = await requireSuperAdminSessionOrResponse(req);
  if (errorResponse) return errorResponse;

  const id = Number((await params).id);
  if (!Number.isInteger(id)) return new Response("Bad id", { status: 400 });
  if (id === session.adminId) return new Response("You cannot reset your own two-factor authentication.", { status: 400 });

  try {
    await prisma.adminUser.update({
      where: { id },
      data: { totpEnabled: false, totpSecret: null, totpRecoveryCodes: [] },
    });
  } catch (err) {
    if (err?.code === "P2025") return new Response("Not found", { status: 404 });
    throw err;
  }
  return new Response(null, { status: 204 });
}
