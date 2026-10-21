import { describe, expect, it } from "vitest";
import { auditEntry, diffPromo, specialLabel, updateAction, weeklyLabel } from "./audit";

const before = {
  year: 2026, month: 9, day: 15, title: "Old", button: "Go", link: "/a", icon: null,
  active: true, scratch: false, flipCard: false, buttonColor: "green", category: "ALL",
  knockoutPhase: null, richHtml: "<p>a</p>", translations: { sr: { title: "Old" } },
};

describe("diffPromo", () => {
  it("returns nothing when nothing changed (treating null and empty string alike)", () => {
    expect(diffPromo(before, { ...before, icon: "" })).toEqual({});
  });

  it("records old and new values of tracked fields", () => {
    expect(diffPromo(before, { ...before, title: "New", active: false })).toEqual({
      title: { from: "Old", to: "New" },
      active: { from: true, to: false },
    });
  });

  it("records a date move as one change", () => {
    expect(diffPromo(before, { ...before, day: 20 }).date).toEqual({ from: "15.10.2026", to: "20.10.2026" });
  });

  it("only marks large fields as changed, without storing their content", () => {
    expect(diffPromo(before, { ...before, richHtml: "<p>b</p>" })).toEqual({ richHtml: { changed: true } });
  });

  it("ignores fields not present in the update", () => {
    expect(diffPromo(before, { active: false })).toEqual({ active: { from: true, to: false } });
  });
});

describe("updateAction", () => {
  it("calls a status-only change (de)activation", () => {
    expect(updateAction({ active: { from: true, to: false } })).toBe("deactivate");
    expect(updateAction({ active: { from: false, to: true } })).toBe("activate");
    expect(updateAction({ active: { from: false, to: true }, title: { from: "a", to: "b" } })).toBe("update");
  });
});

describe("labels and entries", () => {
  it("builds readable labels", () => {
    expect(specialLabel(before)).toBe("15.10.2026 · Old");
    expect(weeklyLabel({ year: 2026, month: 9, weekday: 0, title: "Mon promo" })).toBe("Oct 2026 · Monday · Mon promo");
  });

  it("snapshots the admin name and drops empty change sets", () => {
    const e = auditEntry({
      session: { adminId: 7, name: "Boris" }, marketId: "m1", entity: "special",
      entityId: 3, action: "create", label: "x", changes: {},
    });
    expect(e).toMatchObject({ adminId: 7, adminName: "Boris", entity: "special", entityId: 3 });
    expect(e.changes).toBeUndefined();
  });
});
