// src/lib/validate.js

/**
 * Prihvata samo http://, https://, ili relativne putanje (/...).
 * Odbija javascript:, data:, i sl.
 */
export function isValidLink(value) {
  if (!value || typeof value !== "string") return true; // prazan link je OK
  const trimmed = value.trim();
  if (trimmed === "") return true;
  // Relativne putanje su OK
  if (trimmed.startsWith("/")) return true;
  try {
    const url = new URL(trimmed);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

export function sanitizeLink(value) {
  if (!isValidLink(value)) return "";
  return (value || "").trim();
}

// URL slike (pozadina, logo, scratch) — ide u <img src> i u CSS url("..."),
// pa se pored protokola odbijaju i znakovi koji bi mogli da izađu iz url(...).
// Vraća { url } (null = prazno polje) ili { error }.
export function checkImageUrl(value) {
  const trimmed = typeof value === "string" ? value.trim() : "";
  if (!trimmed) return { url: null };
  if (/["'()\\<>\s]/.test(trimmed)) return { error: "contains characters that are not allowed" };
  if (trimmed.startsWith("/") && !trimmed.startsWith("//")) return { url: trimmed };
  try {
    const url = new URL(trimmed);
    if (url.protocol === "https:" || url.protocol === "http:") return { url: trimmed };
  } catch {
    // pada na grešku ispod
  }
  return { error: "must be a /uploads/... path or an http(s) address" };
}
