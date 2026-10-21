// src/lib/calendar/weeklyCopy.js
// "Copy from previous month" za Weekly Plan — koji dani se kopiraju i sa kojim
// podacima. Kopije su neaktivne (nacrt koji admin pregleda i aktivira), a
// dani koji u ciljnom mesecu već postoje se ne diraju.

const COPIED_FIELDS = [
  "title", "link", "button", "icon", "rich", "richHtml", "buttonColor",
  "scratch", "flipCard", "translations", "category",
];

export function previousMonth(year, month) {
  return month === 0 ? { year: year - 1, month: 11 } : { year, month: month - 1 };
}

// sourceRows: dani prethodnog meseca; targetRows: dani koji već postoje u
// ciljnom mesecu; allowedCategories: kategorije dozvoljene u ciljnom mesecu
// (Golden Ball samo u football temi — inače kopija dobija "ALL").
export function planWeeklyCopy({ sourceRows, targetRows, allowedCategories, year, month, marketId }) {
  const taken = new Set(targetRows.map((r) => r.weekday));
  return sourceRows
    .filter((r) => !taken.has(r.weekday))
    .sort((a, b) => a.weekday - b.weekday)
    .map((r) => {
      const data = { marketId, year, month, weekday: r.weekday, active: false };
      for (const field of COPIED_FIELDS) {
        if (r[field] !== undefined) data[field] = r[field];
      }
      if (!allowedCategories.includes(data.category)) data.category = "ALL";
      return data;
    });
}
