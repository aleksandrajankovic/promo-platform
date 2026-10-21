import { describe, expect, it } from "vitest";
import { planWeeklyCopy, previousMonth } from "./weeklyCopy";

const row = (weekday, extra = {}) => ({
  id: 100 + weekday, marketId: "m", year: 2026, month: 8, weekday, title: `Day ${weekday}`,
  link: "/x", button: "Go", icon: "/i.webp", rich: null, richHtml: "<p>x</p>", buttonColor: "green",
  scratch: false, flipCard: true, translations: { sw: { title: `Day ${weekday}` } }, category: "SPORT",
  active: true, createdById: 5, updatedAt: "2026-09-01", ...extra,
});
const base = { year: 2026, month: 9, marketId: "m", allowedCategories: ["ALL", "SPORT", "CASINO", "MISSIONS"] };

describe("previousMonth", () => {
  it("wraps January to December of the previous year", () => {
    expect(previousMonth(2026, 9)).toEqual({ year: 2026, month: 8 });
    expect(previousMonth(2026, 0)).toEqual({ year: 2025, month: 11 });
  });
});

describe("planWeeklyCopy", () => {
  it("copies content into the target month as inactive drafts", () => {
    const [copy] = planWeeklyCopy({ ...base, sourceRows: [row(0)], targetRows: [] });
    expect(copy).toMatchObject({ year: 2026, month: 9, weekday: 0, active: false, title: "Day 0", flipCard: true, category: "SPORT" });
    // id, autor i vremena se ne kopiraju — nastaje nov red
    expect(copy.id).toBeUndefined();
    expect(copy.createdById).toBeUndefined();
    expect(copy.updatedAt).toBeUndefined();
  });

  it("leaves days that already exist in the target month untouched", () => {
    const plan = planWeeklyCopy({ ...base, sourceRows: [row(0), row(1), row(2)], targetRows: [{ weekday: 1 }] });
    expect(plan.map((p) => p.weekday)).toEqual([0, 2]);
  });

  it("falls back to ALL for categories not allowed in the target month", () => {
    const [copy] = planWeeklyCopy({ ...base, sourceRows: [row(3, { category: "GOLD" })], targetRows: [] });
    expect(copy.category).toBe("ALL");
  });
});
