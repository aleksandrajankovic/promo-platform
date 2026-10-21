// src/app/api/admin/me/route.js
export const runtime = "nodejs";

import { requireAccountSessionOrResponse } from "@/lib/marketScope";

// Ko je ulogovan — dozvoljeno i nalogu koji tek treba da promeni privremenu
// lozinku (UI ga po mustChangePassword šalje na /admin/account).
export async function GET(req) {
  try {
    const { admin, errorResponse } = await requireAccountSessionOrResponse(req);
    if (errorResponse) return errorResponse;

    return Response.json({
      id: admin.id,
      name: admin.name,
      email: admin.email,
      role: admin.role,
      markets: admin.markets.map(({ id, code, name }) => ({ id, code, name })),
      mustChangePassword: admin.mustChangePassword,
      totpEnabled: admin.totpEnabled,
    });
  } catch (err) {
    console.error("GET /api/admin/me error:", err);
    return new Response("Error", { status: 500 });
  }
}
