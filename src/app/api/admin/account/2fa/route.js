// src/app/api/admin/account/2fa/route.js
// 2FA na sopstvenom nalogu (stranica My account). Telo: { action, code? }
//   "setup"      — novi QR kod (tajna na čekanju dok se ne potvrdi kodom)
//   "enable"     — potvrda prvim kodom; vraća rezervne kodove
//   "regenerate" — novi rezervni kodovi (traži važeći kod)
//   "disable"    — isključivanje; super admin ne može (za njega je obavezna)
export const runtime = "nodejs";

import QRCode from "qrcode";
import prisma from "@/lib/db";
import { requireAccountSessionOrResponse } from "@/lib/marketScope";
import { sessionCookieFor } from "@/lib/auth";
import { checkRateLimit, recordFailedAttempt, clearAttempts, getClientIp } from "@/lib/rateLimit";
import {
  decryptSecret, encryptSecret, generateRecoveryCodes, newTotpSecret, otpauthUri, verifyTotp,
} from "@/lib/totp";

export async function POST(req) {
  const { admin, errorResponse } = await requireAccountSessionOrResponse(req);
  if (errorResponse) return errorResponse;

  const ip = getClientIp(req);
  const limit = checkRateLimit(ip);
  if (!limit.allowed) return new Response("Too many attempts. Try again later.", { status: 429 });

  const { action, code } = await req.json().catch(() => ({}));
  const { totpSecret } = await prisma.adminUser.findUnique({ where: { id: admin.id }, select: { totpSecret: true } });

  if (action === "setup") {
    if (admin.totpEnabled) return new Response("Two-factor authentication is already on.", { status: 400 });
    const secret = newTotpSecret();
    await prisma.adminUser.update({ where: { id: admin.id }, data: { totpSecret: encryptSecret(secret) } });
    const qr = await QRCode.toDataURL(otpauthUri(secret, admin.email), { margin: 1, width: 220 });
    return Response.json({ qr, secret });
  }

  if (!["enable", "regenerate", "disable"].includes(action)) return new Response("Bad action", { status: 400 });
  if (!totpSecret) return new Response("Start the setup first.", { status: 400 });
  if (action !== "enable" && !admin.totpEnabled) return new Response("Two-factor authentication is off.", { status: 400 });
  if (action === "enable" && admin.totpEnabled) return new Response("Two-factor authentication is already on.", { status: 400 });
  if (action === "disable" && admin.role === "SUPER_ADMIN") {
    return new Response("Two-factor authentication is required for super admins.", { status: 403 });
  }

  if (!verifyTotp(decryptSecret(totpSecret), code)) {
    recordFailedAttempt(ip);
    return new Response("Invalid code.", { status: 401 });
  }
  clearAttempts(ip);

  if (action === "disable") {
    await prisma.adminUser.update({
      where: { id: admin.id },
      data: { totpEnabled: false, totpSecret: null, totpRecoveryCodes: [] },
    });
    return new Response(null, { status: 204 });
  }

  const { codes, hashes } = generateRecoveryCodes();
  await prisma.adminUser.update({
    where: { id: admin.id },
    data: { totpEnabled: true, totpRecoveryCodes: hashes },
  });

  // posle uključivanja nalog traži mfa sesiju — ova je upravo potvrđena kodom
  const headers = action === "enable" ? { "Set-Cookie": await sessionCookieFor(admin, { mfa: true }) } : {};
  return Response.json({ recoveryCodes: codes }, { headers });
}
