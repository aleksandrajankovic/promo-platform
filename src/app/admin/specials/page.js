// app/admin/specials/page.jsx
"use client";

import { useEffect, useMemo, useState, useRef } from "react";
import toast from "react-hot-toast";
import SpecialEditor from "./components/SpecialEditor";
import AdminTableCard from "../components/AdminTableCard";
import { StatusToggleButton, IconButton } from "../components/AdminTableButtons";
import Button from "../components/ui/Button";
import { confirmDialog } from "../components/ui/ConfirmDialog";
import MonthNavigator from "../components/MonthNavigator";
import { LastEditedBy } from "../components/PromoHistory";

export default function SpecialsAdminPage() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");
  // podaci za editor nove promocije: prazan nacrt za "+ New" ili kopija za "Duplicate"
  const [draft, setDraft] = useState(null);
  const [editing, setEditing] = useState(null);
  const [deletingId, setDeletingId] = useState(null);
  const [loadingIds, setLoadingIds] = useState(new Set());
  const [bulkLoading, setBulkLoading] = useState(false);
  // Podrazumevano tekući mesec — ranije je lista prikazivala sve mesece
  // odjednom (i filtrirala samo po mesecu, mešajući godine).
  const [filterYear, setFilterYear] = useState(() => new Date().getFullYear());
  const [filterMonth, setFilterMonth] = useState(() => new Date().getMonth());
  const pendingToggles = useRef(new Set());

  useEffect(() => {
    fetch("/api/special")
      .then((r) => (r.ok ? r.json() : Promise.reject(r.status)))
      .then((data) => {
        data.sort(
          (a, b) => a.year - b.year || a.month - b.month || a.day - b.day
        );
        setRows(data);
      })
      .catch(() => setErr("Could not load special promotions."))
      .finally(() => setLoading(false));
  }, []);

  const filtered = useMemo(
    () => rows.filter((r) => r.year === filterYear && r.month === filterMonth),
    [rows, filterYear, filterMonth]
  );

  // broj promocija po mesecu izabrane godine (za traku sa mesecima)
  const monthCounts = useMemo(() => {
    const counts = {};
    for (const r of rows) {
      if (r.year === filterYear) counts[r.month] = (counts[r.month] || 0) + 1;
    }
    return counts;
  }, [rows, filterYear]);

  // Nova promocija dobija datum u izabranom mesecu: danas ako je to tekući
  // mesec, inače prvi dan.
  const newInitial = useMemo(() => {
    const now = new Date();
    const isCurrent = now.getFullYear() === filterYear && now.getMonth() === filterMonth;
    return { year: filterYear, month: filterMonth, day: isCurrent ? now.getDate() : 1 };
  }, [filterYear, filterMonth]);

  // Kopija promocije kao nova, neaktivna, sa datumom sledećeg dana — admin
  // menja datum/tekst i snima (POST, nov red; istorija beleži "Created").
  function duplicate(r) {
    const next = new Date(r.year, r.month, r.day + 1);
    setEditing(null);
    setDraft({
      key: `dup-${r.id}-${Date.now()}`,
      duplicateOf: r.title || "promotion",
      year: next.getFullYear(),
      month: next.getMonth(),
      day: next.getDate(),
      active: false,
      icon: r.icon,
      buttonColor: r.buttonColor,
      scratch: r.scratch,
      flipCard: r.flipCard,
      category: r.category,
      knockoutPhase: r.knockoutPhase,
      translations: r.translations,
      title: r.title,
      button: r.button,
      link: r.link,
      rich: r.rich,
      richHtml: r.richHtml,
    });
  }

  function selectMonth(y, m) {
    setFilterYear(y);
    setFilterMonth(m);
  }

  async function handleDelete(id, title) {
    const ok = await confirmDialog({
      title: "Delete this promotion?",
      message: title,
      confirmLabel: "Delete",
      tone: "danger",
    });
    if (!ok) return;
    setDeletingId(id);
    try {
      const res = await fetch(`/api/special/${id}`, { method: "DELETE" });
      if (res.status !== 204) {
        const t = await res.text().catch(() => "");
        throw new Error(t || `HTTP ${res.status}`);
      }
      setRows((prev) => prev.filter((x) => x.id !== id));
      toast.success("Promotion deleted.");
    } catch (e) {
      toast.error(`Error while deleting: ${e.message || e}`);
    } finally {
      setDeletingId(null);
    }
  }

  async function handleToggle(id, next) {
    if (pendingToggles.current.has(id)) return;
    pendingToggles.current.add(id);
    setLoadingIds((prev) => new Set([...prev, id]));

    setRows((current) =>
      current.map((r) => (r.id === id ? { ...r, active: next } : r))
    );

    try {
      const res = await fetch(`/api/special/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ active: next }),
      });
      if (!res.ok) {
        const t = await res.text().catch(() => "");
        throw new Error(t || `HTTP ${res.status}`);
      }
      toast.success(next ? "Promotion activated." : "Promotion deactivated");
    } catch (e) {
      setRows((current) =>
        current.map((r) => (r.id === id ? { ...r, active: !next } : r))
      );
      toast.error(`Error while updating status: ${e.message || e}`);
    } finally {
      pendingToggles.current.delete(id);
      setLoadingIds((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
    }
  }

  async function handleBulkToggle(active) {
    const ids = filtered.map((r) => r.id);
    if (ids.length === 0) return;
    setBulkLoading(true);
    const prev = rows;
    setRows((current) =>
      current.map((r) => (ids.includes(r.id) ? { ...r, active } : r))
    );
    try {
      const res = await fetch("/api/special", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids, active }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      toast.success(active ? "All activated." : "All deactivated.");
    } catch (e) {
      setRows(prev);
      toast.error(`Error: ${e.message}`);
    } finally {
      setBulkLoading(false);
    }
  }

  // lg: date | title | category | link | status | toggle | actions
  const rowGrid =
    "grid grid-cols-1 sm:grid-cols-[140px_1fr] " +
    "lg:grid-cols-[140px_1.5fr_120px_1fr_120px_120px_160px]"; 

  return (
    <>
      {/* Naslov + opis */}
      <div className="mb-2 flex items-start justify-between gap-3">
        <div className="mb-2">
          <h1 className="text-xl font-semibold">
            Backoffice - Special Promotions
          </h1>
          <p className="text-sm text-neutral-500">
            Review and manage special promotions for the selected date
          </p>
        </div>

        <Button
          onClick={() => {
            setEditing(null);
            setDraft((d) => (d ? null : { ...newInitial, key: `new-${filterYear}-${filterMonth}` }));
          }}
        >
          {draft ? "Close form" : "+ New"}
        </Button>
      </div>

      <MonthNavigator
        year={filterYear}
        month={filterMonth}
        counts={monthCounts}
        onChange={selectMonth}
      />

      {/* Tabela u kartici */}
      <AdminTableCard
        title={`Special Promotions — ${new Date(filterYear, filterMonth, 1).toLocaleString("en", { month: "long" })} ${filterYear}`}
        headerRight={
          <div className="flex items-center gap-2 flex-wrap">
            {filtered.length > 0 && (
              <>
                <Button size="sm" variant="secondary" disabled={bulkLoading} onClick={() => handleBulkToggle(true)}>
                  Activate all ({filtered.length})
                </Button>
                <Button size="sm" variant="secondary" disabled={bulkLoading} onClick={() => handleBulkToggle(false)}>
                  Deactivate all ({filtered.length})
                </Button>
              </>
            )}
          </div>
        }
        columns={[
          { key: "date", label: "Date", width: "140px" },
          { key: "title", label: "Title", width: "1.5fr" },
          { key: "category", label: "Category", width: "120px" }, 
          { key: "link", label: "Link", width: "1fr" },
          { key: "status", label: "Status", width: "120px" },
          { key: "toggle", label: "Toggle", width: "120px" },
          {
            key: "actions",
            label: "Actions",
            width: "160px",
            className: "text-right pr-2",
          },
        ]}
      >
        {loading && <div className="p-4 text-sm">Loading…</div>}
        {err && <div className="p-4 text-sm text-red-600">{err}</div>}

        {!loading && !err && (
          <>
            {filtered.length === 0 ? (
              <div className="p-4 text-sm text-neutral-500">
                No promotions in this month yet. Use “+ New” to add one.
              </div>
            ) : (
              <ul className="divide-y divide-neutral-200">
                {filtered.map((r, idx) => (
                  <li
                    key={r.id}
                    className={`${rowGrid} gap-3 items-center px-4 py-3 ${
                      idx % 2 === 0 ? "bg-white" : "bg-[#F5F5F5]"
                    }`}
                  >
                    {/* Date */}
                    <div className="text-sm text-[#646464]">
                      {String(r.day).padStart(2, "0")}.
                      {String((r.month ?? 0) + 1).padStart(2, "0")}.{r.year}.
                    </div>

                    {/* Title */}
                    <div className="font-semibold text-sm text-[var(--black-white-90)]">
                      {r.title || "—"}
                      <LastEditedBy row={r} />
                    </div>

                    {/* Category – NOVO */}
                    <div className="text-xs text-neutral-600 uppercase tracking-wide">
                      {r.category || "ALL"}
                    </div>

                    {/* Link */}
                    <div className="text-sm text-[var(--black-white-90)] truncate">
                      {r.link ? (
                        <a
                          href={r.link}
                          className="underline decoration-neutral-300 hover:decoration-neutral-500"
                          target="_blank"
                        >
                          {r.link}
                        </a>
                      ) : (
                        "—"
                      )}
                    </div>

                    {/* Status */}
                    <div
                      className={
                        r.active
                          ? "text-green-600 text-sm"
                          : "text-neutral-500 text-sm"
                      }
                    >
                      {r.active ? "Active" : "Inactive"}
                    </div>

                    {/* Toggle */}
                    <div>
                      <StatusToggleButton
                        active={r.active}
                        onClick={() => handleToggle(r.id, !r.active)}
                        loading={loadingIds.has(r.id)}
                      />
                    </div>

                    {/* Actions */}
                    <div className="flex items-center justify-end gap-2">
                      <IconButton
                        variant="edit"
                        title="Edit"
                        onClick={() => {
                          setDraft(null);
                          setEditing(r);
                        }}
                      />
                      <IconButton variant="duplicate" title="Duplicate" onClick={() => duplicate(r)} />
                      <IconButton
                        variant="delete"
                        title="Delete"
                        disabled={deletingId === r.id}
                        onClick={() => handleDelete(r.id, r.title || "Promotion")}
                      />
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </>
        )}
      </AdminTableCard>

      {/* Editor sekcije – ispod kartice */}
      {editing && (
        <div className="mt-6">
          <SpecialEditor
            key={editing.id}
            initial={editing}
            onCancel={() => setEditing(null)}
            onSaved={(updated) => {
              setRows((prev) =>
                prev.map((x) => (x.id === updated.id ? updated : x))
              );
              setEditing(null);
            }}
          />
        </div>
      )}

      {draft && !editing && (
        <div className="mt-6">
          <SpecialEditor
            key={draft.key}
            initial={draft}
            onCancel={() => setDraft(null)}
            onSaved={(created) => {
              setRows((prev) => {
                const next = [...prev, created];
                next.sort(
                  (a, b) =>
                    a.year - b.year || a.month - b.month || a.day - b.day
                );
                return next;
              });
              setDraft(null);
            }}
          />
        </div>
      )}
    </>
  );
}
