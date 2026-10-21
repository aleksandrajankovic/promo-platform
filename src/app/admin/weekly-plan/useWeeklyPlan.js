"use client";

import { useEffect, useState } from "react";
import toast from "react-hot-toast";

export function useWeeklyPlan(year, month) {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    //setLoading(true);
    //setError("");

    fetch(`/api/weekly-plan?year=${year}&month=${month}`)
      .then((r) => (r.ok ? r.json() : Promise.reject(r.status)))
      .then(setRows)
      .catch(() => setError("Could not load plan"))
      .finally(() => setLoading(false));
  }, [year, month]);

  async function upsert(payload) {
    const res = await fetch(`/api/weekly-plan`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        year,
        month,
        weekday: payload.weekday,

        title: payload.title ?? "",
        button: payload.button ?? "",
        link: payload.link ?? "",
        rich: payload.rich ?? null,
        richHtml: payload.richHtml ?? "",

        active: !!payload.active,
        scratch: !!payload.scratch,
        flipCard: !!payload.flipCard,
        icon: payload.icon ?? "",
        buttonColor: payload.buttonColor ?? "green",

        translations: payload.translations || null,
        defaultLang: payload.defaultLang,
        category: payload.category || "ALL",
      }),
    });

    if (!res.ok) {
      toast.error("Error saving");
      return;
    }

    const saved = await res.json();
    setRows((prev) => {
      const other = prev.filter((r) => r.weekday !== saved.weekday);
      return [...other, saved].sort((a, b) => a.weekday - b.weekday);
    });
    toast.success("Success!");
  }

  async function bulkToggle(active) {
    const prev = rows;
    setRows((current) => current.map((r) => ({ ...r, active })));
    const res = await fetch("/api/weekly-plan", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ year, month, active }),
    });
    if (!res.ok) {
      setRows(prev);
      toast.error("Error!");
    } else {
      toast.success(active ? "All activated." : "All deactivated.");
    }
  }

  async function remove(weekday) {
    const prev = rows;
    setRows((r) => r.filter((x) => x.weekday !== weekday));
    const res = await fetch(`/api/weekly-plan`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ year, month, weekday }),
    });
    if (!res.ok && res.status !== 204) {
      setRows(prev);
      toast.error("Error deleting");
    }
  }

  // Kopira prethodni mesec u ovaj (neaktivno); vraća broj kopiranih dana.
  async function copyFromPrevious() {
    const res = await fetch("/api/weekly-plan/copy", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ year, month }),
    });
    if (!res.ok) throw new Error(await res.text());
    const { created } = await res.json();
    setRows((prev) => [...prev, ...created].sort((a, b) => a.weekday - b.weekday));
    return created.length;
  }

  return { rows, loading, error, upsert, remove, bulkToggle, copyFromPrevious };
}
