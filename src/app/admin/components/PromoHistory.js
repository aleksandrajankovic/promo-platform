"use client";
// Prikaz istorije izmena (PromoAuditLog) — u editoru za jednu promociju i na
// Activity stranici za celo tržište.

import { useEffect, useState } from "react";

const ACTION_STYLES = {
  create: { label: "Created", className: "bg-green-100 text-green-800" },
  update: { label: "Edited", className: "bg-blue-100 text-blue-800" },
  activate: { label: "Activated", className: "bg-emerald-100 text-emerald-800" },
  deactivate: { label: "Deactivated", className: "bg-neutral-200 text-neutral-700" },
  delete: { label: "Deleted", className: "bg-red-100 text-red-800" },
};

const FIELD_LABELS = {
  date: "Date",
  title: "Title",
  button: "Button label",
  link: "Link",
  icon: "Icon",
  active: "Status",
  scratch: "Scratch card",
  flipCard: "Flip card",
  buttonColor: "Button color",
  category: "Category",
  knockoutPhase: "Knockout phase",
  richHtml: "Description",
  translations: "Translations",
};

function formatValue(field, v) {
  if (v === null || v === undefined) return "—";
  if (field === "active") return v ? "active" : "inactive";
  if (typeof v === "boolean") return v ? "on" : "off";
  return String(v);
}

export function formatWhen(iso) {
  return new Date(iso).toLocaleString("en-GB", {
    day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit",
  });
}

export function AuditEntry({ entry, showLabel = false }) {
  const style = ACTION_STYLES[entry.action] || { label: entry.action, className: "bg-neutral-100" };
  const changes = entry.changes ? Object.entries(entry.changes) : [];
  // kod (de)aktivacije je promena već rečena oznakom akcije
  const visibleChanges = entry.action === "update" ? changes : [];

  return (
    <li className="py-2.5">
      <div className="flex flex-wrap items-center gap-2 text-xs">
        <span className="text-neutral-500 tabular-nums">{formatWhen(entry.createdAt)}</span>
        <span className="font-medium text-neutral-800">{entry.adminName}</span>
        <span className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${style.className}`}>{style.label}</span>
        {showLabel && <span className="text-neutral-700">{entry.label}</span>}
      </div>
      {visibleChanges.length > 0 && (
        <ul className="mt-1 space-y-0.5 pl-1 text-xs text-neutral-600">
          {visibleChanges.map(([field, c]) => (
            <li key={field}>
              <span className="text-neutral-500">{FIELD_LABELS[field] || field}:</span>{" "}
              {c.changed ? (
                <span className="italic">changed</span>
              ) : (
                <>
                  <span className="line-through decoration-neutral-400">{formatValue(field, c.from)}</span>
                  {" → "}
                  <span className="text-neutral-900">{formatValue(field, c.to)}</span>
                </>
              )}
            </li>
          ))}
        </ul>
      )}
    </li>
  );
}

// Istorija jedne promocije (u editoru). Prazno za novu promociju.
export default function PromoHistory({ entity, entityId }) {
  const [entries, setEntries] = useState(null);

  useEffect(() => {
    if (!entityId) return;
    let cancelled = false;
    fetch(`/api/admin/audit?entity=${entity}&entityId=${entityId}&limit=100`)
      .then((r) => (r.ok ? r.json() : []))
      .then((rows) => !cancelled && setEntries(rows))
      .catch(() => !cancelled && setEntries([]));
    return () => {
      cancelled = true;
    };
  }, [entity, entityId]);

  if (!entityId) return null;
  if (entries === null) return <p className="text-xs text-neutral-500">Loading history…</p>;
  if (!entries.length) {
    return <p className="text-xs text-neutral-500">No recorded changes yet (history is kept from 21.10.2026).</p>;
  }
  return (
    <ul className="divide-y divide-neutral-100">
      {entries.map((e) => (
        <AuditEntry key={e.id} entry={e} />
      ))}
    </ul>
  );
}

// "Edited by Boris · 21.10.2026 14:05" ispod naslova u listama
export function LastEditedBy({ row }) {
  const who = row?.updatedBy?.name || row?.createdBy?.name;
  if (!who) return null;
  return (
    <div className="mt-0.5 text-[11px] font-normal text-neutral-500">
      Edited by {who}
      {row.updatedAt ? ` · ${formatWhen(row.updatedAt)}` : ""}
    </div>
  );
}
