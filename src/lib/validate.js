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
