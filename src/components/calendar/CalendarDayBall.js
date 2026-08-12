// src/components/CalendarDayBall.js
import { rowdies } from "@/app/fonts";
import {
  KNOCKOUT_CATEGORIES,
  getKnockoutRingClass,
  getKnockoutBadgeLabel,
  getKnockoutBadgeClass,
} from "@/lib/calendar/promoCategoryStyles";
import PromoBallIcon from "@/components/calendar/promo/PromoBallIcon";
import LockOverlay from "@/components/calendar/promo/LockOverlay";

export default function CalendarDayBall({ cell, adminPreview }) {
  const locked = cell.isLocked && !adminPreview && !cell.isToday;
  const isToday = cell.isToday;
  const isGold = cell.category === "GOLD";
  const knockoutPhase = cell.knockoutPhase || (KNOCKOUT_CATEGORIES.has(cell.category) ? cell.category : null);

  const ringClass = knockoutPhase
    ? ""
    : isGold
    ? "border-2 border-[#f8d97a]"
    : isToday
    ? "ring-2 ring-[#FACC01] shadow-[0_0_18px_rgba(250,204,1,0.9)]"
    : "ring-1 ring-white/10";

  return (
    <div
      className={`relative h-full w-full flex flex-col items-center justify-center gap-1${
        isGold && !locked ? " gold-ball-wobble" : ""
      }`}
    >
      {/* ball wrapper — ping is relative to this, not the full cell */}
      <div className="relative h-[78%] aspect-square">
        {isToday && (
          <span className="pointer-events-none absolute inset-0 z-20 rounded-full animate-ping ring-1 ring-[#FACC01]/40" />
        )}

        {/* knockout badge — top-right corner, visible even when locked */}
        {knockoutPhase && (
          <span className={`knockout-badge ${getKnockoutBadgeClass(knockoutPhase)}`}>
            {getKnockoutBadgeLabel(knockoutPhase)}
          </span>
        )}

      <button
        data-day-button
        data-day={cell.day}
        data-category={cell.category || "ALL"}
        disabled={locked}
        className={`
          relative rounded-full overflow-hidden
          w-full h-full
          ${ringClass}
          ${knockoutPhase ? getKnockoutRingClass(knockoutPhase) : ""}
          ${isGold && !locked ? "gold-ball-glow" : ""}
          transition duration-200
          ${locked ? "opacity-50 cursor-not-allowed" : "cursor-pointer hover:scale-[1.06] active:scale-[0.97]"}
          bg-black/40
        `}
        aria-label={`Dan ${cell.day}`}
      >
        {/* diagonal shimmer sweep for gold */}
        {isGold && !locked && (
          <span
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 z-10"
            style={{
              background:
                "linear-gradient(105deg, transparent 20%, rgba(255,255,255,0.22) 50%, transparent 80%)",
              animation: "gold-shimmer 2.8s linear infinite",
            }}
          />
        )}

        {/* ball image */}
        <PromoBallIcon src={cell.icon} spin={knockoutPhase && !locked} />

        {/* lock overlay */}
        {locked && <LockOverlay size="36% 36%" />}
      </button>
      </div>

      {/* date number */}
      <span
        className={`
          ${rowdies.className}
          text-[11px] md:text-[13px] lg:text-[15px] leading-none
          ${isGold ? "text-[#f8d97a]" : isToday ? "text-[#FACC01]" : "text-white/80"}
          font-bold
        `}
      >
        {cell.day.toString().padStart(2, "0")}
      </span>
    </div>
  );
}
