// app/admin/weekly-plan/page.jsx
"use client";

import { useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { useWeeklyPlan } from "./useWeeklyPlan";
import WeeklyEditor from "./components/WeeklyEditor";
import AdminTableCard from "../components/AdminTableCard";
import { StatusToggleButton, IconButton } from "../components/AdminTableButtons";
import { confirmDialog } from "../components/ui/ConfirmDialog";
import { WEEKDAY_LABELS } from "../components/PromoEditorFields";
import { PreviewCalendarButton } from "../components/MonthNavigator";
import Button from "../components/ui/Button";
import { LastEditedBy } from "../components/PromoHistory";

export default function WeeklyPlanAdmin() {
  const sp = useSearchParams();
  const router = useRouter();
  const now = new Date();

  // Godina/mesec žive samo u URL-u (?y=&m=) — nema kopije u state-u koju bi
  // trebalo sinhronizovati efektom kad se URL promeni.
  const y0 = Number.parseInt(sp.get("y") ?? "", 10);
  const m0 = Number.parseInt(sp.get("m") ?? "", 10);
  const year = Number.isInteger(y0) ? y0 : now.getFullYear();
  const month = Number.isInteger(m0) && m0 >= 0 && m0 <= 11 ? m0 : now.getMonth();

  function setYM(nextY, nextM) {
    const params = new URLSearchParams(sp.toString());
    params.set("y", String(nextY));
    params.set("m", String(nextM));
    router.replace(`?${params.toString()}`);
  }

  const { rows, loading, error, upsert, remove, bulkToggle, copyFromPrevious } = useWeeklyPlan(year, month);
  const [copying, setCopying] = useState(false);
  const prevMonthName = new Date(year, month - 1, 1).toLocaleString("en", { month: "long", year: "numeric" });
  const monthName = new Date(year, month, 1).toLocaleString("en", { month: "long", year: "numeric" });

  async function handleCopy() {
    const existing = rows.length;
    const note = existing ? ` The ${existing} day(s) already filled in ${monthName} stay unchanged.` : "";
    const ok = await confirmDialog({
      title: `Copy ${prevMonthName} into ${monthName}?`,
      message: `Copies are added as inactive drafts — review them and activate when ready.${note}`,
      confirmLabel: "Copy",
    });
    if (!ok) return;
    setCopying(true);
    try {
      const count = await copyFromPrevious();
      toast.success(count ? `Copied ${count} day(s) as inactive drafts.` : "Nothing to copy — all days are already filled.");
    } catch (e) {
      toast.error(e.message || "Copy failed.");
    } finally {
      setCopying(false);
    }
  }
  const [bulkLoading, setBulkLoading] = useState(false);
  const [editing, setEditing] = useState(null); // weekday 0..6

  // podaci za editor izabranog dana (postojeći red ili prazan nacrt)
  const initial = (() => {
    if (editing == null) return null;
    const existing = rows.find((r) => r.weekday === editing);
    return (
      existing || {
        year,
        month,
        weekday: editing,
        title: "",
        link: "",
        button: "",
        icon: "",
        active: true,
        rich: null,
        richHtml: null,
        buttonColor: "green",
        category: "ALL",
      }
    );
  })();

  async function handleBulkToggle(active) {
    setBulkLoading(true);
    try {
      await bulkToggle(active);
    } finally {
      setBulkLoading(false);
    }
  }

  async function handleToggle(wd) {
    const existing = rows.find((x) => x.weekday === wd);
    if (!existing) {
      setEditing(wd);
      return;
    }
    try {
      await upsert({
        ...existing,
        year,
        month,
        active: !existing.active,
      });
      toast.success(existing.active ? "Promotion deactivated." : "Promotion activated.");
    } catch (e) {
      toast.error(`Error: ${e.message || "Saving failed."}`);
    }
  }

  const rowGrid =
    "grid grid-cols-1 sm:grid-cols-[120px_1fr] " +
    "lg:grid-cols-[120px_1fr_1.5fr_120px_120px_160px]";

 
  const yearOptions = Array.from({ length: 3 }, (_, i) => now.getFullYear() - 1 + i);

  return (
    <>
      {/* Naslov + opis */}
      <div className="mb-2 flex items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold">Backoffice - Monthly Promotions</h1>
          <p className="text-sm text-neutral-500">
            Review and edit weekly promotions for the selected month{" "}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {!loading && rows.length < 7 && (
            <Button
              variant="secondary"
              onClick={handleCopy}
              disabled={copying}
              title={`Copy ${prevMonthName} into ${monthName} as inactive drafts`}
            >
              {copying ? "Copying…" : `Copy from ${prevMonthName}`}
            </Button>
          )}
          <PreviewCalendarButton year={year} month={month} />
        </div>
      </div>

      <AdminTableCard
        title="Weekly Promotions"
        headerRight={
          <div className="flex items-center gap-2">
            {/* Year */}
            <select
              className="border border-neutral-300 rounded px-2 py-1 text-sm text-black bg-white"
              value={year}
              onChange={(e) => {
                const nextY = Number(e.target.value);
                setYM(nextY, month);
              }}
              aria-label="Select year"
            >
              {yearOptions.map((y) => (
                <option key={y} value={y}>
                  {y}
                </option>
              ))}
            </select>

            {/* Month */}
            <select
              className="border border-neutral-300 rounded px-2 py-1 text-sm text-black bg-white"
              value={month}
              onChange={(e) => {
                const nextM = Number(e.target.value);
                setYM(year, nextM);
              }}
              aria-label="Select month"
            >
              {Array.from({ length: 12 }, (_, i) => (
                <option key={i} value={i}>
                  {new Date(2000, i, 1).toLocaleString("en", { month: "long" })}
                </option>
              ))}
            </select>

            {rows.length > 0 && (
              <>
                <Button size="sm" variant="secondary" disabled={bulkLoading} onClick={() => handleBulkToggle(true)}>
                  Activate all ({rows.length})
                </Button>
                <Button size="sm" variant="secondary" disabled={bulkLoading} onClick={() => handleBulkToggle(false)}>
                  Deactivate all ({rows.length})
                </Button>
              </>
            )}
          </div>
        }
        columns={[
          { key: "day", label: "Day", width: "120px" },
          { key: "name", label: "Name" },
          { key: "link", label: "Link", width: "1.5fr" },
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
        {error && <div className="p-4 text-sm text-red-600">{error}</div>}

        {!loading && !error && (
          <ul className="divide-y divide-neutral-200">
            {Array.from({ length: 7 }, (_, wd) => {
              const r = rows.find((x) => x.weekday === wd) || null;
              return (
                <li
                  key={wd}
                  className={`${rowGrid} gap-3 items-center px-4 py-3 ${
                    wd % 2 === 0 ? "bg-white" : "bg-[#F5F5F5]"
                  }`}
                >
                  {/* Day */}
                  <div className="text-sm text-[#646464]">{WEEKDAY_LABELS[wd]}</div>

                  {/* Name */}
                  <div className="font-semibold text-sm text-[var(--black-white-90)]">
                    {r?.title || "—"}
                    <LastEditedBy row={r} />
                  </div>

                  {/* Link */}
                  <div className="text-sm text-[var(--black-white-90)] truncate">
                    {r?.link ? (
                      <a
                        href={r.link}
                        className="underline decoration-neutral-300 hover:decoration-neutral-500"
                        target="_blank"
                        rel="noreferrer"
                      >
                        {r.link}
                      </a>
                    ) : (
                      "—"
                    )}
                  </div>

                  {/* Status */}
                  <div
                    className={`text-sm ${
                      r?.active ? "text-green-600" : "text-neutral-500"
                    }`}
                  >
                    {r ? (r.active ? "Active" : "Inactive") : "—"}
                  </div>

                  {/* Toggle */}
                  <div>
                    <StatusToggleButton
                      active={!!r?.active}
                      onClick={() => handleToggle(wd)}
                    />
                  </div>

                  {/* Actions */}
                  <div className="flex items-center justify-end gap-2">
                    <IconButton
                      variant={r ? "edit" : "add"}
                      onClick={() => setEditing(wd)}
                      title={r ? "Edit" : "Add"}
                    />
                    {r && (
                      <IconButton
                        variant="delete"
                        onClick={async () => {
                          const ok = await confirmDialog({
                            title: "Delete this weekly promotion?",
                            message: `${WEEKDAY_LABELS[wd]}: ${r.title || "untitled"}`,
                            confirmLabel: "Delete",
                            tone: "danger",
                          });
                          if (ok) remove(wd);
                        }}
                        title="Delete"
                      />
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </AdminTableCard>

      {editing != null && initial && (
        <div className="mt-6">
          <WeeklyEditor
            key={editing}
            initial={initial}
            onCancel={() => setEditing(null)}
            onSave={async (payload) => {
              await upsert({ ...payload, year, month });
              setEditing(null);
            }}
          />
        </div>
      )}
    </>
  );
}
