"use client";
// Activity — sve izmene promocija na trenutno izabranom tržištu, najnovije prve.

import { useEffect, useState } from "react";
import AdminTableCard from "../components/AdminTableCard";
import { AuditEntry } from "../components/PromoHistory";

const PAGE_SIZE = 50;
const FILTERS = [
  { value: "", label: "All" },
  { value: "special", label: "Special promotions" },
  { value: "weekly", label: "Weekly plan" },
];

export default function ActivityPage() {
  const [entity, setEntity] = useState("");
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [hasMore, setHasMore] = useState(false);

  // loading postavlja onaj ko poziva (handler), ne efekat
  async function load(beforeId, reset) {
    const params = new URLSearchParams({ limit: String(PAGE_SIZE) });
    if (entity) params.set("entity", entity);
    if (beforeId) params.set("before", String(beforeId));
    try {
      const res = await fetch(`/api/admin/audit?${params}`);
      const rows = res.ok ? await res.json() : [];
      setEntries((prev) => (reset ? rows : [...prev, ...rows]));
      setHasMore(rows.length === PAGE_SIZE);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load(null, true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [entity]);

  return (
    <>
      <div className="mb-2">
        <h1 className="text-xl font-semibold">Backoffice - Activity</h1>
        <p className="text-sm text-neutral-500">Who changed which promotion and when, for the selected market.</p>
      </div>

      <AdminTableCard
        title="Recent changes"
        headerRight={
          <select
            className="border border-neutral-300 rounded px-2 py-1 text-sm text-black bg-white"
            value={entity}
            onChange={(e) => {
              setLoading(true);
              setEntity(e.target.value);
            }}
            aria-label="Filter"
          >
            {FILTERS.map((f) => (
              <option key={f.value} value={f.value}>{f.label}</option>
            ))}
          </select>
        }
      >
        <div className="px-4">
          {!loading && entries.length === 0 && (
            <p className="py-4 text-sm text-neutral-500">No changes recorded yet (history is kept from 21.10.2026).</p>
          )}
          <ul className="divide-y divide-neutral-100">
            {entries.map((e) => (
              <AuditEntry key={e.id} entry={e} showLabel />
            ))}
          </ul>
          {loading && <p className="py-3 text-sm text-neutral-500">Loading…</p>}
          {hasMore && !loading && (
            <button
              type="button"
              onClick={() => {
                setLoading(true);
                load(entries[entries.length - 1]?.id, false);
              }}
              className="my-3 rounded border border-neutral-300 px-3 py-1.5 text-sm hover:bg-neutral-50"
            >
              Load older
            </button>
          )}
        </div>
      </AdminTableCard>
    </>
  );
}
