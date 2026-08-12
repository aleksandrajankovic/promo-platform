// src/lib/calendarUrls.js
// Čisti URL/datum helperi za kalendarske rute — bez server-only zavisnosti (Prisma),
// pa se mogu koristiti i iz client i iz server komponenti.

export const MIN_YEAR = 2024;
export function maxYear() {
  return new Date().getFullYear() + 2;
}

// URL koristi mesece 1-12 (čitljivije), interno se svuda koristi 0-11 (JS Date konvencija)
export function monthToUrl(m) {
  return m + 1;
}
export function monthFromUrl(m) {
  return m - 1;
}
export function monthPath(year, month) {
  return `/${year}/${monthToUrl(month)}`;
}

export function isCurrentMonth(year, month, now = new Date()) {
  return year === now.getFullYear() && month === now.getMonth();
}

// Kanonski URL za dati mesec — tekući mesec uvek živi na "/", ostali na "/[year]/[month]"
export function monthHref(year, month, now = new Date()) {
  return isCurrentMonth(year, month, now) ? "/" : monthPath(year, month);
}

export function isValidYear(year) {
  return Number.isInteger(year) && year >= MIN_YEAR && year <= maxYear();
}
export function isValidMonth(month) {
  return Number.isInteger(month) && month >= 0 && month <= 11;
}
