// src/app/api/auth/route.js
export const runtime = "nodejs";

import bcrypt from "bcryptjs";
import prisma from "@/lib/db";
import { signToken, makeSessionCookie, makeDeleteCookie, decodeTokenUnsafe, revokeToken } from "@/lib/auth";
import { checkRateLimit, recordFailedAttempt, clearAttempts } from "@/lib/rateLimit";

// Dummy hash — sprečava timing attack (napadač ne može da zna da li email postoji)
const DUMMY_HASH = "$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy";

function getIp(req) {
  return (
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    req.headers.get("x-real-ip") ||
    "unknown"
  );
}

export async function POST(req) {
  const ip = getIp(req);
  const limit = checkRateLimit(ip);

  if (!limit.allowed) {
    return new Response("Too many attempts. Try again later.", {
      status: 429,
      headers: { "Retry-After": String(limit.retryAfter) },
    });
  }

  try {
    const body = await req.json().catch(() => ({}));
    const email = (body?.email || "").trim().toLowerCase();
    const password = (body?.password || "").trim();

    if (!email || !password) {
      return new Response("Missing credentials", { status: 400 });
    }

    const admin = await prisma.adminUser.findUnique({ where: { email } });

    // Uvek pokreni bcrypt (isti vremenski odgovor bez obzira da li email postoji)
    const hash = admin?.passwordHash ?? DUMMY_HASH;
    const ok = await bcrypt.compare(password, hash);

    if (!admin || !ok) {
      recordFailedAttempt(ip);
      return new Response("Invalid credentials", { status: 401 });
    }

    clearAttempts(ip);
    const token = await signToken({ adminId: admin.id, isSuper: admin.isSuper });

    return new Response(null, {
      status: 204,
      headers: { "Set-Cookie": makeSessionCookie(token) },
    });
  } catch (e) {
    console.error("POST /api/auth error:", e);
    return new Response("Error", { status: 500 });
  }
}

export async function DELETE(req) {
  // Revoke the current token immediately so it can't be reused before expiry
  const cookieHeader = req.headers.get("cookie") || "";
  const match = cookieHeader.match(/admin_auth=([^;]+)/);
  if (match) {
    const payload = decodeTokenUnsafe(match[1]);
    if (payload?.jti && payload?.exp) {
      revokeToken(payload.jti, payload.exp);
    }
  }

  return new Response(null, {
    status: 204,
    headers: { "Set-Cookie": makeDeleteCookie() },
  });
}
