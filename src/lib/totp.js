// src/lib/totp.js
// 2FA preko TOTP koda (Google/Microsoft Authenticator i sl.).
//
// Tajna se čuva šifrovana (AES-256-GCM). Ključ se izvodi iz JWT_SECRET (HKDF),
// pa ne treba nova env promenljiva; posledica: ako se JWT_SECRET promeni,
// sačuvane tajne postaju nečitljive i svi moraju ponovo da podese 2FA
// (super admin to radi preko "Reset 2FA").
import { Secret, TOTP } from "otpauth";
import { createCipheriv, createDecipheriv, createHash, hkdfSync, randomBytes } from "node:crypto";

const ISSUER = "Meridianbet Promo";

function encryptionKey() {
  const secret = process.env.JWT_SECRET;
  if (!secret) throw new Error("JWT_SECRET is not set");
  return Buffer.from(hkdfSync("sha256", secret, "promo-platform", "totp-secret-v1", 32));
}

export function encryptSecret(base32) {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", encryptionKey(), iv);
  const data = Buffer.concat([cipher.update(base32, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return ["v1", iv.toString("base64url"), tag.toString("base64url"), data.toString("base64url")].join(".");
}

export function decryptSecret(stored) {
  const [version, iv, tag, data] = String(stored || "").split(".");
  if (version !== "v1" || !iv || !tag || !data) throw new Error("Unknown TOTP secret format");
  const decipher = createDecipheriv("aes-256-gcm", encryptionKey(), Buffer.from(iv, "base64url"));
  decipher.setAuthTag(Buffer.from(tag, "base64url"));
  return Buffer.concat([decipher.update(Buffer.from(data, "base64url")), decipher.final()]).toString("utf8");
}

export function newTotpSecret() {
  return new Secret({ size: 20 }).base32;
}

function totpFor(base32, label = "admin") {
  return new TOTP({ issuer: ISSUER, label, algorithm: "SHA1", digits: 6, period: 30, secret: Secret.fromBase32(base32) });
}

// URI koji authenticator aplikacija čita iz QR koda
export function otpauthUri(base32, email) {
  return totpFor(base32, email).toString();
}

// window: 1 = prihvata i prethodni/sledeći 30-sekundni kod (razlika u satu telefona)
export function verifyTotp(base32, code) {
  const token = String(code ?? "").replace(/\s/g, "");
  if (!/^\d{6}$/.test(token)) return false;
  return totpFor(base32).validate({ token, window: 1 }) !== null;
}

// ---- Rezervni kodovi (kad se izgubi telefon) — svaki važi jednom ----

function normalizeRecoveryCode(code) {
  return String(code ?? "").toLowerCase().replace(/[^a-z0-9]/g, "");
}

export function hashRecoveryCode(code) {
  return createHash("sha256").update(normalizeRecoveryCode(code)).digest("hex");
}

// 10 kodova oblika "k7m2-p9qx": korisniku se pokazuju jednom, u bazi su samo heševi
export function generateRecoveryCodes(count = 10) {
  const alphabet = "abcdefghjkmnpqrstuvwxyz23456789";
  const codes = Array.from({ length: count }, () => {
    const bytes = randomBytes(8);
    const chars = Array.from(bytes, (b) => alphabet[b % alphabet.length]).join("");
    return `${chars.slice(0, 4)}-${chars.slice(4)}`;
  });
  return { codes, hashes: codes.map(hashRecoveryCode) };
}

// Vraća preostale heševe ako je kod važeći (i troši ga), inače null.
export function consumeRecoveryCode(hashes, code) {
  if (!normalizeRecoveryCode(code)) return null;
  const hash = hashRecoveryCode(code);
  const idx = (hashes || []).indexOf(hash);
  if (idx === -1) return null;
  return hashes.filter((_, i) => i !== idx);
}
