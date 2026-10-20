// src/app/api/images/route.js
export const runtime = "nodejs";

import fs from "node:fs/promises";
import path from "node:path";
import { requireAdminMarketOrResponse } from "@/lib/marketScope";

export async function GET(req) {
  const { market, errorResponse } = await requireAdminMarketOrResponse(req);
  if (errorResponse) return errorResponse;

  const uploadsDir = path.join(process.cwd(), "public", "uploads", market.code);

  try {
    const entries = await fs.readdir(uploadsDir, { withFileTypes: true });
    const files = entries
      .filter((e) => e.isFile())
      .map((e) => ({ name: e.name, url: `/uploads/${market.code}/${e.name}` }));

    return Response.json({ files });
  } catch (err) {
    if (err.code === "ENOENT") return Response.json({ files: [] });
    console.error("List images error:", err);
    return new Response("Error listing images", { status: 500 });
  }
}

export async function DELETE(req) {
  const { market, errorResponse } = await requireAdminMarketOrResponse(req);
  if (errorResponse) return errorResponse;

  const body = await req.json().catch(() => ({}));
  const rawFilename = (body.filename || "").trim();
  const filename = path.basename(rawFilename); // strips any directory components

  if (!filename || filename !== rawFilename) {
    return new Response("Bad filename", { status: 400 });
  }

  const uploadsDir = path.join(process.cwd(), "public", "uploads", market.code);

  try {
    await fs.unlink(path.join(uploadsDir, filename));
  } catch (err) {
    if (err.code !== "ENOENT") {
      console.error("Delete image error:", err);
      return new Response("Error deleting", { status: 500 });
    }
  }

  return new Response(null, { status: 204 });
}
