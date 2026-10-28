"use client";

import { useMemo, useState } from "react";

const GHOST_COUNT = 4;

function buildGhostDays(year, month) {
  if (typeof year !== "number" || typeof month !== "number") return [];

  const prevLastDate = new Date(year, month, 0);
  const prevMonthDays = prevLastDate.getDate();
  const prevMonthIndex = prevLastDate.getMonth();
  const prevYear = prevLastDate.getFullYear();

  const start = Math.max(1, prevMonthDays - GHOST_COUNT + 1);
  const ghostDays = [];
  for (let dayNum = start; dayNum <= prevMonthDays; dayNum++) {
    ghostDays.push({
      day: dayNum,
      year: prevYear,
      month: prevMonthIndex,
      hasPromo: false,
      isFutureForUx: false,
      isLocked: true,
      category: "ALL",
      icon: null,
      isGhost: true,
      isToday: false,
    });
  }
  return ghostDays;
}

// Dani meseca dolaze sa servera (CalendarGrid), pa su kartice odmah u HTML-u.
// Dodaje "ghost" dane s kraja prethodnog meseca (osim kod skraćenog meseca) i
// bira početni aktivni dan: danas, ili prvi dan s promocijom.
// Deljeno između mobilnih kartica (Stack/Vertical varijante).
export function initialDayIndex(days) {
  let idx = days.findIndex((d) => d.isToday);
  if (idx === -1) idx = days.findIndex((d) => d.hasPromo);
  return idx === -1 ? 0 : idx;
}

export function useCalendarMobileDays({ days: monthDays = [], year, month, isRange = false }) {
  const days = useMemo(
    () => [...(isRange ? [] : buildGhostDays(year, month)), ...monthDays],
    [monthDays, year, month, isRange]
  );
  const [activeIndex, setActiveIndex] = useState(() => initialDayIndex(days));
  return { days, activeIndex, setActiveIndex, year, month };
}
