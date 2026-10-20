// src/app/api/admin/current-market/route.js
export const runtime = "nodejs";

import { requireAdminMarketOrResponse } from "@/lib/marketScope";

// GET /api/admin/current-market — tržište na koje je trenutno zaključan ovaj
// request (za ADMIN: njegov market; za SUPER_ADMIN: izbor iz market switcher-a).
// Editorima treba ovo da znaju koje jezičke tabove da prikažu.
export async function GET(req) {
  try {
    const { market, errorResponse } = await requireAdminMarketOrResponse(req);
    if (errorResponse) return errorResponse;
    return Response.json({
      code: market.code,
      name: market.name,
      locales: market.locales?.length ? market.locales : [market.defaultLocale || "sr"],
      defaultLocale: market.defaultLocale || "sr",
    });
  } catch (err) {
    console.error("GET /api/admin/current-market error:", err);
    return new Response("Error", { status: 500 });
  }
}
