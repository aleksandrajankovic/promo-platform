// src/lib/calendarGridHelpers.js
import { buildPromoUrlISO, slugify } from "@/lib/calendar/slug";

function asArray(x) {
  if (Array.isArray(x)) return x;
  if (x && typeof x === "object") return Object.values(x);
  return [];
}

// specials → map po danu
function indexSpecialsForMonth(specials, year, month) {
  const map = new Map();
  for (const sp of asArray(specials)) {
    if (!sp?.active) continue;
    if (sp.year === year && sp.month === month) {
      map.set(sp.day, sp);
    }
  }
  return map;
}

function pickPromoForDate(date, weekly, specialsMap) {
  const sp = specialsMap.get(date.getDate());
  if (sp) return { promo: sp, type: "special" };

  let wd = date.getDay(); // 0..6 (Sun..Sat)
  if (wd === 0) wd = 7;   // Sun -> 7
  wd = wd - 1;            // 0..6 (Mon..Sun)

  const w = asArray(weekly)[wd];
  if (w && w.active) return { promo: w, type: "weekly" };

  return { promo: null, type: null };
}

export function buildCalendarData({
  year,
  month,
  weekly = [],
  specials = [],
  adminPreview = false,
  lang = "pt",
  today = new Date(),
}) {
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDay = new Date(year, month, 1).getDay();
  const startDay = firstDay === 0 ? 7 : firstDay; // 1..7 (Mon..Sun)

  const prevMonthDays = new Date(year, month, 0).getDate();
  const specialsMap = indexSpecialsForMonth(specials, year, month);

  const cells = [];
  const daysPayload = [];

  // LEADING – dani prethodnog meseca
  const leadingDays = startDay - 1;
  for (let i = 0; i < leadingDays; i++) {
    const dayNum = prevMonthDays - leadingDays + 1 + i;
    cells.push({
      type: "prev",
      key: `prev-${dayNum}`,
      day: dayNum,
    });
  }

  // GLAVNI – dani tekućeg meseca
  for (let day = 1; day <= daysInMonth; day++) {
    const d = new Date(year, month, day);
    const srbParts = new Intl.DateTimeFormat("en-US", {
      timeZone: "Europe/Belgrade",
      year: "numeric", month: "2-digit", day: "2-digit",
    }).formatToParts(today);
    const srbY = parseInt(srbParts.find(p => p.type === "year").value);
    const srbM = parseInt(srbParts.find(p => p.type === "month").value) - 1;
    const srbD = parseInt(srbParts.find(p => p.type === "day").value);
    const todayDateOnly = new Date(srbY, srbM, srbD);
    const isFuture = d > todayDateOnly;
    const isToday = d.getTime() === todayDateOnly.getTime();

    const { promo, type } = pickPromoForDate(d, weekly, specialsMap);
    const icon =
      promo?.icon && String(promo.icon).trim() ? promo.icon : null;

    const shareUrl = promo
      ? buildPromoUrlISO(d, promo.title || slugify("promocao"))
      : null;

    const isFutureForUx = adminPreview ? false : isFuture && !isToday;
    const isLocked = adminPreview ? false : isFutureForUx;

    const category = promo?.category || "ALL";
    const scratch = !!promo?.scratch;
    const knockoutPhase = promo?.knockoutPhase || null;

    // cell za grid (desktop)
    cells.push({
      type: "day",
      key: `day-${day}`,
      day,
      hasPromo: Boolean(promo),
      isToday,
      isFutureForUx,
      isLocked,
      icon,
      category,
      knockoutPhase,
      isSpecial: type === "special",
    });

    // payload za JS (modal + mobile)
    const title = promo?.title || "";
    const richHtml = promo?.richHtml || null;
    const link = promo?.link || "#";
    const button =
      promo?.button || (lang === "pt" ? "Saiba mais" : "Learn more");
    const buttonColor = promo?.buttonColor || "green";

    daysPayload.push({
      day,
      year,
      month,
      shareUrl,
      type,
      title,
      richHtml,
      link,
      button,
      buttonColor,
      category,
      scratch,
      knockoutPhase,

      hasPromo: Boolean(promo),
      isToday,
      isFutureForUx,
      isLocked,
      icon,

      promo: promo
        ? {
            title,
            richHtml,
            link,
            button,
            buttonColor,
            category,
            icon,
            scratch,
            knockoutPhase,
          }
        : null,
    });
  }


  // TRAILING – dani sledećeg meseca da se popuni poslednji red
  const totalCells = cells.length;
  const remainder = totalCells % 7;
  if (remainder !== 0) {
    const nextDays = 7 - remainder;
    for (let i = 1; i <= nextDays; i++) {
      cells.push({
        type: "next",
        key: `next-${i}`,
        day: i,
      });
    }
  }

  return { cells, daysPayload };
}
