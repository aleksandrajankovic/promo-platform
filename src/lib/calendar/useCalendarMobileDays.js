"use client";

import { useEffect, useState } from "react";

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

// Čita #calendar-data (koji CalendarGrid renderuje server-side), dodaje "ghost"
// dane s kraja prethodnog meseca i bira početni aktivni dan (danas, ili prvi
// dan s promocijom). Deljeno između mobilnih kartica (Stack/Vertical varijante).
export function useCalendarMobileDays() {
  const [days, setDays] = useState([]);
  const [activeIndex, setActiveIndex] = useState(0);
  const [year, setYear] = useState(null);
  const [month, setMonth] = useState(null);

  useEffect(() => {
    const dataEl = document.getElementById("calendar-data");
    if (!dataEl) return;

    try {
      const payload = JSON.parse(dataEl.textContent || "{}");
      const allDays = Array.isArray(payload.days) ? payload.days : [];
      const currentDays = allDays.filter((d) => d && typeof d.day === "number");
      const ghostDays = buildGhostDays(payload.year, payload.month);
      const combinedDays = [...ghostDays, ...currentDays];

      let todayIndex = combinedDays.findIndex((d) => d.isToday);
      if (todayIndex === -1) todayIndex = combinedDays.findIndex((d) => d.hasPromo);
      if (todayIndex === -1) todayIndex = 0;

      setDays(combinedDays);
      setActiveIndex(todayIndex);
      setYear(payload.year);
      setMonth(payload.month);
    } catch {
      // ignore
    }
  }, []);

  return { days, activeIndex, setActiveIndex, year, month };
}
