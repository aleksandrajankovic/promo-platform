// src/lib/audit.js
// Istorija izmena promocija (PromoAuditLog): šta se promenilo, ko i kada.

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const WEEKDAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

// Polja čije se stare/nove vrednosti pamte u logu.
const TRACKED_FIELDS = [
  "title", "button", "link", "icon", "active", "scratch", "flipCard",
  "buttonColor", "category", "knockoutPhase",
];
// Velika polja — pamti se samo da su promenjena, ne i sadržaj.
const LARGE_FIELDS = ["richHtml", "translations"];

// Prisma i forme različito predstavljaju "prazno" (null / "" / undefined).
function norm(v) {
  return v === undefined || v === "" ? null : v;
}

function formatDate({ year, month, day }) {
  return `${String(day).padStart(2, "0")}.${String(month + 1).padStart(2, "0")}.${year}`;
}

export function specialLabel(row) {
  return `${formatDate(row)} · ${row.title || "—"}`;
}

export function weeklyLabel(row) {
  return `${MONTHS[row.month]} ${row.year} · ${WEEKDAYS[row.weekday] ?? "?"} · ${row.title || "—"}`;
}

// Razlika između reda pre izmene i podataka koji se upisuju. Polja koja nisu
// prisutna u `after` (undefined) se ne menjaju, pa se ni ne porede.
export function diffPromo(before, after) {
  const changes = {};
  if ("day" in after && (before.year !== after.year || before.month !== after.month || before.day !== after.day)) {
    changes.date = { from: formatDate(before), to: formatDate(after) };
  }
  for (const field of TRACKED_FIELDS) {
    if (after[field] === undefined) continue;
    const from = norm(before[field]);
    const to = norm(after[field]);
    if (from !== to) changes[field] = { from, to };
  }
  for (const field of LARGE_FIELDS) {
    if (after[field] === undefined) continue;
    if (JSON.stringify(norm(before[field])) !== JSON.stringify(norm(after[field]))) {
      changes[field] = { changed: true };
    }
  }
  return changes;
}

// Akcija za izmenu: ako se menjao samo status, to je (de)aktivacija.
export function updateAction(changes) {
  const keys = Object.keys(changes);
  if (keys.length === 1 && keys[0] === "active") return changes.active.to ? "activate" : "deactivate";
  return "update";
}

// Podaci za prisma.promoAuditLog.create/createMany.
export function auditEntry({ session, marketId, entity, entityId, action, label, changes = null }) {
  return {
    marketId,
    adminId: session.adminId,
    adminName: session.name || "unknown",
    entity,
    entityId,
    action,
    label,
    changes: changes && Object.keys(changes).length ? changes : undefined,
  };
}

// Za GET/PUT/POST odgovore — imena autora uz red, za prikaz u listama/editoru.
export const AUTHOR_INCLUDE = {
  createdBy: { select: { name: true } },
  updatedBy: { select: { name: true } },
};
