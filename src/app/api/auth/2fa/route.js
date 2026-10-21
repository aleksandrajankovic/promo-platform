// src/app/api/auth/2fa/route.js
// Drugi korak prijave za naloge sa 2FA. Telo: { challenge, action, code?, recoveryCode? }
//   action "setup"  — prvo podešavanje (super admin bez 2FA): vraća QR kod
//   action "verify" — proverava kod (ili rezervni kod) i izdaje sesiju
export const runtime = "nodejs";

import QRCode from "qrcode";
import prisma from "@/lib/db";
import { sessionCookieFor, verifyLoginChallenge } from "@/lib/auth";
import { checkRateLimit, recordFailedAttempt, clearAttempts, getClientIp } from "@/lib/rateLimit";
import {
  consumeRecoveryCode, decryptSecret, encryptSecret, generateRecoveryCodes,
  newTotpSecret, otpauthUri, verifyTotp,
} from "@/lib/totp";

export async function POST(req) {
  const ip = getClientIp(req);
  const limit = checkRateLimit(ip);
  if (!limit.allowed) {
    return new Response("Too many attempts. Try again later.", {
      status: 429,
      headers: { "Retry-After": String(limit.retryAfter) },
    });
  }

  const body = await req.json().catch(() => ({}));
  const challenge = await verifyLoginChallenge(body.challenge);
  if (!challenge) return new Response("Login expired — sign in again.", { status: 401 });

  const admin = await prisma.adminUser.findUnique({ where: { id: challenge.adminId } });
  if (!admin) return new Response("Login expired — sign in again.", { status: 401 });

  if (body.action === "setup") {
    if (admin.totpEnabled) return new Response("Two-factor authentication is already set up.", { status: 400 });
    const secret = newTotpSecret();
    // čuva se kao "na čekanju" (totpEnabled ostaje false) dok korisnik ne unese prvi kod
    await prisma.adminUser.update({ where: { id: admin.id }, data: { totpSecret: encryptSecret(secret) } });
    const uri = otpauthUri(secret, admin.email);
    return Response.json({ qr: await QRCode.toDataURL(uri, { margin: 1, width: 220 }), secret });
  }

  if (body.action !== "verify") return new Response("Bad action", { status: 400 });
  if (!admin.totpSecret) return new Response("Set up two-factor authentication first.", { status: 400 });

  const secret = decryptSecret(admin.totpSecret);
  let recoveryCodes;

  if (admin.totpEnabled) {
    let ok = verifyTotp(secret, body.code);
    if (!ok && body.recoveryCode) {
      const remaining = consumeRecoveryCode(admin.totpRecoveryCodes, body.recoveryCode);
      if (remaining) {
        await prisma.adminUser.update({ where: { id: admin.id }, data: { totpRecoveryCodes: remaining } });
        ok = true;
      }
    }
    if (!ok) {
      recordFailedAttempt(ip);
      return new Response("Invalid code.", { status: 401 });
    }
  } else {
    // prvo podešavanje: prvi ispravan kod potvrđuje da je aplikacija dobro skenirala QR
    if (!verifyTotp(secret, body.code)) {
      recordFailedAttempt(ip);
      return new Response("Invalid code.", { status: 401 });
    }
    const generated = generateRecoveryCodes();
    recoveryCodes = generated.codes;
    await prisma.adminUser.update({
      where: { id: admin.id },
      data: { totpEnabled: true, totpRecoveryCodes: generated.hashes },
    });
  }

  clearAttempts(ip);
  return Response.json(
    { step: "done", mustChangePassword: admin.mustChangePassword, recoveryCodes },
    { headers: { "Set-Cookie": await sessionCookieFor(admin, { mfa: true }) } }
  );
}
