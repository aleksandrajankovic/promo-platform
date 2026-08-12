// src/components/CalendarMobileStack.jsx
"use client";

import { useEffect, useRef } from "react";
import { getCategoryGradient } from "@/lib/calendar/promoCategoryStyles";
import { rowdies } from "@/app/fonts";
import { useCalendarMobileDays } from "@/lib/calendar/useCalendarMobileDays";
import PromoIcon from "@/components/calendar/promo/PromoIcon";
import LockOverlay from "@/components/calendar/promo/LockOverlay";

export default function CalendarMobileStack({ adminPreview = false }) {
  const { days, activeIndex, setActiveIndex } = useCalendarMobileDays();
  const containerRef = useRef(null);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    let startX = 0, startY = 0;

    const onStart = (e) => {
      startX = e.touches[0].clientX;
      startY = e.touches[0].clientY;
    };

    const onMove = (e) => {
      const dx = Math.abs(e.touches[0].clientX - startX);
      const dy = Math.abs(e.touches[0].clientY - startY);
      if (dx >= dy) e.preventDefault();
    };

    const onEnd = (e) => {
      const delta = e.changedTouches[0].clientX - startX;
      if (delta > 80) {
        navigator?.vibrate?.(20);
        setActiveIndex((i) => (i > 0 ? i - 1 : i));
      } else if (delta < -80) {
        navigator?.vibrate?.(20);
        setActiveIndex((i) => (i < days.length - 1 ? i + 1 : i));
      }
    };

    el.addEventListener("touchstart", onStart, { passive: false });
    el.addEventListener("touchmove", onMove, { passive: false });
    el.addEventListener("touchend", onEnd, { passive: true });

    return () => {
      el.removeEventListener("touchstart", onStart);
      el.removeEventListener("touchmove", onMove);
      el.removeEventListener("touchend", onEnd);
    };
  }, [days.length]);

  if (!days.length) return null;

  // horizontalni layout
  const MAX_OFFSET = 1;
  const CARD_WIDTH = 230;
  const CARD_HEIGHT = 257;
  const TRACK_WIDTH = 380;
  const ACTIVE_X = TRACK_WIDTH / 2 - CARD_WIDTH / 2;
  const CARD_GAP = 170;

  return (
    <div className="w-full flex flex-col items-center mt-[20px]">
      <div
        ref={containerRef}
        className="relative w-full max-w-[380px] overflow-visible touch-none"
        style={{ height: CARD_HEIGHT + 40 }}
      >
        {days.map((day, index) => {
          const offset = index - activeIndex;
          if (Math.abs(offset) > MAX_OFFSET) return null;

          const locked = day.isLocked && !adminPreview;
          const category = day.category || "ALL";
          const isGhost = Boolean(day.isGhost);
          const gradientClass = getCategoryGradient(category);

          const isTodayActive = day.isToday && !isGhost;

          const translateX = ACTIVE_X + offset * CARD_GAP;
          const scale = offset === 0 ? 1 : 0.9;
          const zIndex = MAX_OFFSET - Math.abs(offset);
          const opacity = offset !== 0 ? 0.45 : locked && !isGhost ? 0.7 : 1;

          return (
            <button
              key={`mobile-${index}-${day.day}`}
              data-day-button
              data-day={day.day}
              disabled={locked || isGhost}
              onClick={() => !isGhost && setActiveIndex(index)}
              className={`
                absolute top-0
                left-0
                w-[230px] h-[257px]
                rounded-[18px]
                ${
                  isTodayActive
                    ? "border-2 border-[#FACC01] shadow-[0_0_20px_rgba(250,204,1,0.9)]"
                    : ""
                }
                ${
                  isGhost
                    ? "bg-[#000000D9] shadow-[0_2px_6px_rgba(0,0,0,0.4)]"
                    : gradientClass
                }
                shadow-[0_18px_40px_rgba(0,0,0,0.7)]
                transition
                duration-300
                ${
                  locked || isGhost
                    ? "cursor-default"
                    : "cursor-pointer active:scale-[0.98]"
                }
              `}
              style={{
                transform: `translate3d(${translateX}px, 20px, 0) scale(${scale})`,
                zIndex,
                opacity,
              }}
            >
              {/* broj dana */}
              <span
                className={`
                  ${rowdies.className}
                  absolute left-4 bottom-4
                  z-10 text-[64px] leading-[65px]
                  font-bold
                  bg-gradient-to-b from-white to-white/80
                  bg-clip-text text-transparent
                `}
              >
                {day.day.toString().padStart(2, "0")}
              </span>

              {/* slika / ikonice */}
              {!isGhost && (
                !locked && day.hasPromo && day.icon ? (
                  <PromoIcon
                    src={day.icon}
                    className="absolute inset-y-[-55px] h-[100%] w-auto object-cover object-center drop-shadow-[0_12px_25px_rgba(0,0,0,0.7)]"
                  />
                ) : (
                  <>
                    <PromoIcon
                      src={day.icon}
                      className="absolute right-0 inset-y-0 h-full w-[90%] object-cover object-right"
                    />
                    {locked && <LockOverlay size="44px 44px" className="z-20" />}
                  </>
                )
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
