import { describe, expect, it } from "vitest";
import { buildCalendarData, isDateLocked } from "./calendarGridHelpers";

describe("isDateLocked", () => {
  const today = new Date("2026-08-31T12:00:00Z");

  it("returns false for a past date", () => {
    expect(isDateLocked(2026, 7, 4, "Europe/Belgrade", today)).toBe(false);
  });

  it("returns false for today", () => {
    expect(isDateLocked(2026, 7, 31, "Europe/Belgrade", today)).toBe(false);
  });

  it("returns true for a future date", () => {
    expect(isDateLocked(2026, 11, 31, "Europe/Belgrade", today)).toBe(true);
  });

  it("respects the market timezone when computing 'today'", () => {
    // 2026-08-31T23:30 UTC is already 2026-09-01 in a UTC+something zone —
    // a day that's "tomorrow" in one timezone can still be "today" in another.
    const lateUtc = new Date("2026-08-31T23:30:00Z");
    expect(isDateLocked(2026, 8, 1, "Pacific/Kiritimati", lateUtc)).toBe(false);
  });
});

describe("buildCalendarData day range", () => {
  // oktobar 2026: 31 dan, počinje u četvrtak
  const base = { year: 2026, month: 9, today: new Date("2026-10-20T12:00:00Z") };
  const dayCells = (cells) => cells.filter((c) => c.type === "day").map((c) => c.day);

  it("shows the whole month with neighbouring-month cells when no range is set", () => {
    const { cells, isRange } = buildCalendarData(base);
    expect(isRange).toBe(false);
    expect(dayCells(cells)).toHaveLength(31);
    expect(cells.some((c) => c.type === "prev")).toBe(true);
    expect(cells.length % 7).toBe(0);
  });

  it("shows only days in the range, without neighbouring-month cells", () => {
    const { cells, isRange, dayFrom, dayTo } = buildCalendarData({ ...base, dayFrom: 15, dayTo: 31 });
    expect(isRange).toBe(true);
    expect([dayFrom, dayTo]).toEqual([15, 31]);
    expect(dayCells(cells)).toEqual(Array.from({ length: 17 }, (_, i) => 15 + i));
    expect(cells.some((c) => c.type === "prev" || c.type === "next")).toBe(false);
  });

  it("centers an incomplete last row with blank cells", () => {
    // 17 dana = 2 puna reda + 3 dana -> 2 prazna polja ispred poslednjeg reda
    const { cells } = buildCalendarData({ ...base, dayFrom: 15, dayTo: 31 });
    expect(cells.slice(14, 16).map((c) => c.type)).toEqual(["blank", "blank"]);
    expect(cells[16]).toMatchObject({ type: "day", day: 29 });
  });

  it("keeps the full month in the payload (modal and shared links)", () => {
    const { daysPayload } = buildCalendarData({ ...base, dayFrom: 15, dayTo: 31 });
    expect(daysPayload).toHaveLength(31);
  });

  it("clamps out-of-range and inverted values", () => {
    expect(buildCalendarData({ ...base, dayFrom: 40 }).dayFrom).toBe(31);
    const inverted = buildCalendarData({ ...base, dayFrom: 20, dayTo: 10 });
    expect([inverted.dayFrom, inverted.dayTo]).toEqual([20, 20]);
  });
});
