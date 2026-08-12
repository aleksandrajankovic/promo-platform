// src/app/api/upload/route.js
export const runtime = "nodejs";

import path from "node:path";
import fs from "node:fs/promises";
import crypto from "node:crypto";
import sharp from "sharp";
import { getAdminFromRequest } from "@/lib/auth";
import { sanitizeSvg } from "@/lib/sanitize";

const MAX_BYTES = 5 * 1024 * 1024; // 5MB
const MAX_WIDTH = 1600;
const QUALITY = 85;
const RASTER_MIME = ["image/jpeg", "image/png", "image/webp"];
const ALLOWED_MIME = [...RASTER_MIME, "image/svg+xml"];

export async function POST(req) {
  const session = await getAdminFromRequest(req);
  if (!session) return new Response("unauthorized", { status: 401 });

  const form = await req.formData();
  const file = form.get("file");
  if (!file || typeof file === "string") {
    return new Response("No file", { status: 400 });
  }

  const mime = file.type || "";
  if (!ALLOWED_MIME.includes(mime)) {
    return new Response("Unsupported file type", { status: 415 });
  }
  if (file.size > MAX_BYTES) {
    return new Response("Too large", { status: 413 });
  }

  const inputBuf = Buffer.from(await file.arrayBuffer());

  const orig = file.name || "upload";
  const baseName = path.parse(orig).name
    .replace(/[^a-z0-9-_]+/gi, "_")
    .toLowerCase();
  const hash = crypto.createHash("md5").update(inputBuf).digest("hex").slice(0, 8);

  const uploadsDir = path.join(process.cwd(), "public", "uploads");
  await fs.mkdir(uploadsDir, { recursive: true });

  // SVG — sanitizuj (ukloni <script>, on*= handlere, javascript:/data: linkove) pre čuvanja
  if (mime === "image/svg+xml") {
    const fileName = `${baseName}-${hash}.svg`;
    const outPath = path.join(uploadsDir, fileName);
    const clean = sanitizeSvg(inputBuf.toString("utf8"));
    await fs.writeFile(outPath, clean, "utf8");
    return Response.json({ url: `/uploads/${fileName}` });
  }

  // Raster slike — konvertuj u WebP
  const fileNameWebp = `${baseName}-${hash}.webp`;
  const outPath = path.join(uploadsDir, fileNameWebp);
  await sharp(inputBuf)
    .resize({ width: MAX_WIDTH, height: 2000, fit: "inside", withoutEnlargement: true })
    .webp({ quality: QUALITY })
    .toFile(outPath);

  return Response.json({ url: `/uploads/${fileNameWebp}` });
}
