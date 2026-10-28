// src/app/uploads/[...path]/route.js
// U produkciji (`next start`) Next skenira public/ samo pri pokretanju servera, pa
// slike uploadovane posle toga (api/upload) vraćaju 404 sve do restarta. Fajlovi
// koji su postojali pri startu i dalje idu direktno iz public/; ovaj handler
// hvata samo one dodate kasnije i čita ih sa diska. (Isto rešenje kao u
// calendar-next-rs; ovde su slike u podfolderu po tržištu: uploads/<market>/.)
export const runtime = "nodejs";

import path from "node:path";
import fs from "node:fs/promises";

const UPLOADS_DIR = path.join(process.cwd(), "public", "uploads");

const MIME = {
  ".webp": "image/webp",
  ".png":  "image/png",
  ".jpg":  "image/jpeg",
  ".jpeg": "image/jpeg",
  ".gif":  "image/gif",
  ".svg":  "image/svg+xml",
};

export async function GET(_req, { params }) {
  const { path: parts } = await params;
  const filePath = path.join(UPLOADS_DIR, ...parts);

  // Zaštita od ../ izlaska iz uploads foldera
  if (!filePath.startsWith(UPLOADS_DIR + path.sep)) {
    return new Response("Not found", { status: 404 });
  }

  const type = MIME[path.extname(filePath).toLowerCase()];
  if (!type) return new Response("Not found", { status: 404 });

  let buf;
  try {
    buf = await fs.readFile(filePath);
  } catch {
    return new Response("Not found", { status: 404 });
  }

  return new Response(buf, {
    headers: {
      "Content-Type": type,
      // Imena su hash-ovana po sadržaju (api/upload) — isto ime je uvek isti fajl
      "Cache-Control": "public, max-age=31536000, immutable",
      ...(type === "image/svg+xml" && { "Content-Security-Policy": "script-src 'none'" }),
    },
  });
}
