import { describe, expect, it } from "vitest";
import { isDateLocked } from "./calendarGridHelpers";

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
