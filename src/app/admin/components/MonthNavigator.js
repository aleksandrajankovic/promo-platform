"use client";
// Traka za izbor godine/meseca u admin listama: ‹ godina ›, 12 meseci sa
// brojem promocija (prazni posivljeni) i "Preview calendar" za izabrani mesec
// — uvek na istom mestu, ne samo unutar editora.

import { openCalendarPreview } from "./PromoEditorFields";
import Button from "./ui/Button";

const SHORT_MONTHS = Array.from({ length: 12 }, (_, i) =>
  new Date(2000, i, 1).toLocaleString("en", { month: "short" })
);

export function PreviewCalendarButton({ year, month, className = "" }) {
  return (
    <Button
      variant="secondary"
      onClick={() => openCalendarPreview(year, month)}
      className={className}
      title="Open the public calendar for this month in a new tab"
    >
      Preview calendar <span aria-hidden="true">↗</span>
    </Button>
  );
}

export default function MonthNavigator({ year, month, counts = {}, onChange }) {
  return (
    <div className="mb-4 flex flex-wrap items-center gap-3 rounded-lg border border-neutral-200 bg-white px-3 py-2 shadow-sm">
      <div className="flex items-center gap-1">
        <button
          type="button"
          onClick={() => onChange(year - 1, month)}
          className="h-8 w-8 rounded hover:bg-neutral-100 text-neutral-700"
          aria-label="Previous year"
        >
          ‹
        </button>
        <span className="min-w-[3.5rem] text-center font-semibold text-neutral-900">{year}</span>
        <button
          type="button"
          onClick={() => onChange(year + 1, month)}
          className="h-8 w-8 rounded hover:bg-neutral-100 text-neutral-700"
          aria-label="Next year"
        >
          ›
        </button>
      </div>

      <div className="flex flex-1 flex-wrap gap-1">
        {SHORT_MONTHS.map((label, m) => {
          const count = counts[m] || 0;
          const selected = m === month;
          return (
            <button
              key={m}
              type="button"
              onClick={() => onChange(year, m)}
              className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium transition ${
                selected
                  ? "border-admin-brand bg-admin-brand text-white"
                  : count
                    ? "border-neutral-300 bg-white text-neutral-800 hover:bg-neutral-100"
                    : "border-dashed border-neutral-300 bg-white text-neutral-400 hover:bg-neutral-50"
              }`}
              aria-pressed={selected}
            >
              {label}
              <span
                className={`rounded-full px-1.5 text-[10px] leading-4 ${
                  selected ? "bg-white/25" : count ? "bg-neutral-200 text-neutral-700" : ""
                }`}
              >
                {count}
              </span>
            </button>
          );
        })}
      </div>

      <PreviewCalendarButton year={year} month={month} />
    </div>
  );
}
