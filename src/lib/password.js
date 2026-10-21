// src/lib/password.js
import { randomInt } from "node:crypto";

export const MIN_PASSWORD_LENGTH = 10;

// Vraća poruku greške ili null ako je lozinka prihvatljiva.
export function validateNewPassword(password, { email } = {}) {
  if (typeof password !== "string" || password.length < MIN_PASSWORD_LENGTH) {
    return `Password must be at least ${MIN_PASSWORD_LENGTH} characters.`;
  }
  if (password.length > 200) return "Password is too long.";
  if (email && password.toLowerCase().includes(email.split("@")[0].toLowerCase())) {
    return "Password must not contain your email name.";
  }
  return null;
}

// Privremena lozinka koju super admin prosleđuje korisniku — bez znakova koji
// se lako pomešaju pri prepisivanju (0/O, 1/l/I).
const TEMP_ALPHABET = "abcdefghjkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789";

export function generateTempPassword(length = 14) {
  let out = "";
  for (let i = 0; i < length; i++) out += TEMP_ALPHABET[randomInt(TEMP_ALPHABET.length)];
  return out;
}
