// src/components/CalendarDayCell.js
import { rowdies } from "@/app/fonts";
import {
  getCategoryGradient,
  getCategoryLabel,
} from "@/lib/calendar/promoCategoryStyles";
import PromoIcon from "@/components/calendar/promo/PromoIcon";
import LockOverlay from "@/components/calendar/promo/LockOverlay";

const dayNumberClass = `
  ${rowdies.className}
  absolute left-2 top-2
  z-10
  text-[20px] md:text-[22px] lg:text-[25px]
  leading-[25px]
  bg-gradient-to-b from-white to-white/80
  bg-clip-text text-transparent
  antialiased
`;

export default function CalendarDayCell({ cell, lang, adminPreview }) {
  const locked = cell.isLocked && !adminPreview;
  const category = cell.category || "ALL";
  const categoryLabel = getCategoryLabel(category);
  const gradientClass =  getCategoryGradient(category);

  return (
    <div className="relative h-full w-full rounded-[12px]">
      {/* TODAY highlight */}
      {cell.isToday && (
        <span className="pointer-events-none absolute -inset-px z-20 rounded-[12px] ring-1 ring-[#FACC01] shadow-[0_0_15px_rgba(250,204,1,0.9)]" />
      )}

      <button
        data-day-button
        data-day={cell.day}
        data-category={category}
        disabled={locked} // ⬅️ BUDUĆI DANI ZAKLJUČANI, PROŠLI + DANAS OTKLJUČANI
        className={`relative w-full h-full rounded-[12px] overflow-hidden border 
          ${gradientClass}
          transition
          ${
            locked
              ? "opacity-70 cursor-not-allowed"
              : "cursor-pointer hover:scale-[1.02]"
          }
        `}
        aria-label={
          cell.hasPromo
            ? `Day ${cell.day} – ${categoryLabel}`
            : `Day ${cell.day}`
        }
      >
        {/* broj dana */}
        <span className={dayNumberClass}>
          {cell.day.toString().padStart(2, "0")}
        </span>

        {/* ikonica / lock */}
        <PromoIcon
          src={cell.icon}
          className="absolute right-0 inset-y-0 h-full w-[90%] object-contain object-right"
        />
        {locked && <LockOverlay />}
      </button>
    </div>
  );
}
