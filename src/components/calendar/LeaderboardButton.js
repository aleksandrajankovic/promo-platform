"use client";

import { useState, useEffect, useCallback } from "react";

function parseCSV(text) {
  const lines = text.trim().split(/\r?\n/);
  if (lines.length < 2) return [];

  function splitLine(line) {
    const fields = [];
    let current = "";
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      if (line[i] === '"') {
        inQuotes = !inQuotes;
      } else if (line[i] === "," && !inQuotes) {
        fields.push(current.trim());
        current = "";
      } else {
        current += line[i];
      }
    }
    fields.push(current.trim());
    return fields;
  }

  const headers = splitLine(lines[0]);
  return lines
    .slice(1)
    .map((line) => {
      const values = splitLine(line);
      const obj = {};
      headers.forEach((h, i) => { obj[h] = values[i] ?? ""; });
      return obj;
    })
    .filter((r) => r.account_id);
}

const PAGE_SIZE = 10;
const MEDALS = ["🥇", "🥈", "🥉"];
const PODIUM_ORDER = [1, 0, 2]; // prikaz: 2. mesto, 1. mesto, 3. mesto
const PODIUM_STYLE = [
  { h: "h-28", ring: "border-[#FACC01]/50", grad: "from-[#FACC01]/25 to-transparent", text: "text-[#FACC01]" }, // 1.
  { h: "h-20", ring: "border-white/25", grad: "from-white/10 to-transparent", text: "text-white/70" }, // 2.
  { h: "h-16", ring: "border-orange-400/40", grad: "from-orange-400/15 to-transparent", text: "text-orange-300" }, // 3.
];

export default function LeaderboardButton({ feedUrl }) {
  const [open, setOpen] = useState(false);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const [loadingMore, setLoadingMore] = useState(false);

  const openModal = useCallback(async () => {
    setOpen(true);
    if (data) return;
    if (!feedUrl) return;

    setLoading(true);
    setError(null);
    try {
      const res = await fetch(feedUrl);
      if (!res.ok) throw new Error("Greška pri učitavanju");
      const text = await res.text();
      const rows = parseCSV(text);
      const sorted = rows
        .map((r) => ({
          account: r.account_id,
          izazovi: Number(r.BROJ_DANA_ISPUNIO) || 0,
          kvota: parseFloat(String(r.kvota).replace(",", ".")) || 0,
          kvotaLabel: r.kvota,
        }))
        .sort((a, b) => b.izazovi - a.izazovi || b.kvota - a.kvota);
      setData(sorted);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [data, feedUrl]);

  // Auto-popup pri svakom učitavanju stranice. Na football temi se ovaj
  // button montira 2x (desktop + mobile, jedan od njih uvek CSS-hidden) —
  // svaka instanca se otvara nezavisno, vidljiva će se stvarno prikazati,
  // sakrivena samo promeni svoje (nevidljivo) stanje.
  useEffect(() => {
    if (!feedUrl) return;

    const t = setTimeout(() => {
      openModal();
    }, 1200);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <>
      <button
        onClick={openModal}
        aria-label="Rang lista"
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold text-black bg-[#FACC01] hover:brightness-110 transition"
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01" />
        </svg>
        Rang lista
      </button>

      <style>{`
        .leaderboard-scroll {
          scrollbar-width: thin;
          scrollbar-color: rgba(250,204,1,0.4) transparent;
        }
        .leaderboard-scroll::-webkit-scrollbar {
          width: 4px;
        }
        .leaderboard-scroll::-webkit-scrollbar-track {
          background: transparent;
        }
        .leaderboard-scroll::-webkit-scrollbar-thumb {
          background: rgba(250,204,1,0.35);
          border-radius: 99px;
          transition: background 0.2s;
        }
        .leaderboard-scroll::-webkit-scrollbar-thumb:hover {
          background: rgba(250,204,1,0.65);
        }
      `}</style>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center px-4"
          onClick={() => setOpen(false)}
        >
          {/* Backdrop */}
          <div className="absolute inset-0 bg-black/70" />

          {/* Modal */}
          <div
            className="relative w-full max-w-[480px] max-h-[80vh] bg-[#05070D] rounded-2xl shadow-xl flex flex-col p-4 sm:p-6 overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                {/* Trophy icon */}
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#FACC01" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M6 9H4a2 2 0 0 1-2-2V5h4" />
                  <path d="M18 9h2a2 2 0 0 0 2-2V5h-4" />
                  <path d="M8 21h8" />
                  <path d="M12 17v4" />
                  <path d="M6 5v6a6 6 0 0 0 12 0V5H6z" />
                </svg>
                <h2 className="text-white font-semibold text-base">Rang lista</h2>
              </div>
              <button
                onClick={() => setOpen(false)}
                className="h-8 w-8 flex items-center justify-center rounded-full bg-white/5 hover:bg-white/10 text-white/70 hover:text-white transition"
                aria-label="Zatvori"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M18 6L6 18M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Body */}
            <div className="min-h-[200px] flex flex-col overflow-y-auto">
              {loading ? (
                <div className="flex-1 flex items-center justify-center">
                  <span className="w-6 h-6 rounded-full border-2 border-[#FACC01] border-t-transparent animate-spin" />
                </div>
              ) : error ? (
                <div className="flex-1 flex items-center justify-center text-red-400 text-sm">
                  {error}
                </div>
              ) : data ? (() => {
                const all = Array.isArray(data) ? data : data.items ?? [];
                const top3 = all.slice(0, 3);
                const visible = all.slice(0, visibleCount);
                const rest = visible.slice(3);
                const hasMore = visibleCount < all.length;
                return (
                  <>
                    {/* Podijum — top 3 */}
                    {top3.length > 0 && (
                      <div className="flex items-end justify-center gap-2 pb-5 pt-1">
                        {PODIUM_ORDER.map((idx) => {
                          const entry = top3[idx];
                          if (!entry) return null;
                          const style = PODIUM_STYLE[idx];
                          return (
                            <div key={idx} className="flex flex-col items-center gap-1.5 w-[30%]">
                              <span className="text-xl leading-none">{MEDALS[idx]}</span>
                              <span className={`text-xs font-semibold truncate max-w-full ${style.text}`}>
                                {entry.account}
                              </span>
                              <span className="text-[10px] text-white/40 tabular-nums">kvota {entry.kvotaLabel}</span>
                              <div
                                className={`w-full ${style.h} rounded-t-lg border-t border-x ${style.ring} bg-gradient-to-b ${style.grad} flex flex-col items-center justify-center gap-1`}
                              >
                                <span className="text-[9px] uppercase tracking-widest text-white/30 font-semibold">Izazovi</span>
                                <span className={`${idx === 0 ? "text-2xl" : "text-lg"} font-extrabold tabular-nums ${style.text}`}>
                                  {entry.izazovi}
                                </span>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}

                    {rest.length > 0 && (
                      <>
                        {/* Zaglavlje kolona */}
                        <div className="flex items-center gap-2 pb-2 mb-1 border-b border-white/10 text-[10px] uppercase tracking-widest text-white/30 font-semibold pr-3">
                          <span className="w-8 shrink-0 text-center">#</span>
                          <span className="flex-1">Account</span>
                          <span className="w-14 text-center">Izazovi</span>
                          <span className="w-16 text-right">Kvota</span>
                        </div>
                        <ol className="space-y-0.5 max-h-[55vh] overflow-y-auto leaderboard-scroll pr-3">
                          {rest.map((entry, i) => (
                            <li key={i} className="flex items-center gap-2 py-2 border-b border-white/5 last:border-0">
                              <span className="w-8 shrink-0 text-center text-xs font-bold text-white/25">
                                {i + 4}.
                              </span>
                              <span className="flex-1 text-white/90 text-sm tabular-nums">{entry.account}</span>
                              <span className="w-14 text-center text-white/70 text-sm tabular-nums">{entry.izazovi}</span>
                              <span className="w-16 text-right text-[#FACC01] text-sm font-semibold tabular-nums">{entry.kvotaLabel}</span>
                            </li>
                          ))}
                        </ol>
                      </>
                    )}
                    {hasMore && (
                      <button
                        onClick={() => {
                          setLoadingMore(true);
                          setTimeout(() => {
                            setVisibleCount((c) => c + PAGE_SIZE);
                            setLoadingMore(false);
                          }, 400);
                        }}
                        disabled={loadingMore}
                        className="mt-4 w-full py-2.5 rounded-full text-white/80 hover:text-white text-xs font-semibold transition flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed"
                        style={{
                          background: "rgba(255,255,255,0.04)",
                          border: "1px solid rgba(99,102,241,0.6)",
                          boxShadow: "0 0 10px rgba(99,102,241,0.35), inset 0 0 10px rgba(99,102,241,0.08)",
                        }}
                      >
                        {loadingMore ? (
                          <>
                            <span className="w-3.5 h-3.5 rounded-full border-2 border-white/40 border-t-white animate-spin" />
                            Učitavam...
                          </>
                        ) : (
                          `Prikaži još (${all.length - visibleCount} preostalo)`
                        )}
                      </button>
                    )}
                  </>
                );
              })() : null}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
