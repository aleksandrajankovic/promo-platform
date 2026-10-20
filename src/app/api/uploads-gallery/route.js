// src/app/api/uploads-gallery/route.js
export const runtime = "nodejs";

import fs from "node:fs/promises";
import path from "node:path";
import { requireAdminMarketOrResponse } from "@/lib/marketScope";

const UPLOADS_ROOT = path.join(process.cwd(), "public", "uploads");
const ALLOWED_EXT = /\.(png|jpe?g|webp|gif|svg)$/i;

export async function GET(req) {
  const { market, errorResponse } = await requireAdminMarketOrResponse(req);
  if (errorResponse) return errorResponse;

  const uploadsDir = path.join(UPLOADS_ROOT, market.code);

  try {
    const entries = await fs.readdir(uploadsDir, { withFileTypes: true });
    const files = [];

    for (const entry of entries) {
      if (!entry.isFile()) continue;
      if (!ALLOWED_EXT.test(entry.name)) continue;

      const fullPath = path.join(uploadsDir, entry.name);
      const stat = await fs.stat(fullPath);
      files.push({ name: entry.name, url: `/uploads/${market.code}/${entry.name}`, size: stat.size, mtime: stat.mtime });
    }

    files.sort((a, b) => b.mtime - a.mtime);
    return Response.json(files);
  } catch (err) {
    if (err.code === "ENOENT") return Response.json([]);
    console.error("Gallery GET error:", err);
    return new Response("error", { status: 500 });
  }
}

export async function DELETE(req) {
  const { market, errorResponse } = await requireAdminMarketOrResponse(req);
  if (errorResponse) return errorResponse;

  const { searchParams } = new URL(req.url);
  const name = searchParams.get("name");

  if (!name || name.includes("..") || name.includes("/") || !ALLOWED_EXT.test(name)) {
    return new Response("bad name", { status: 400 });
  }

  try {
    await fs.unlink(path.join(UPLOADS_ROOT, market.code, name));
  } catch (err) {
    console.warn("Delete error:", err.message);
  }

  return new Response(null, { status: 204 });
}
