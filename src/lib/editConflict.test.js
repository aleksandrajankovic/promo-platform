import { describe, expect, it } from "vitest";
import { conflictResponse, parseExpectedUpdatedAt } from "./editConflict";

describe("parseExpectedUpdatedAt", () => {
  it("distinguishes 'no check', 'expected empty' and a timestamp", () => {
    expect(parseExpectedUpdatedAt({})).toBeUndefined();
    expect(parseExpectedUpdatedAt({ expectedUpdatedAt: null })).toBeNull();
    expect(parseExpectedUpdatedAt({ expectedUpdatedAt: "2026-10-28T15:06:45.522Z" }).toISOString()).toBe("2026-10-28T15:06:45.522Z");
    expect(parseExpectedUpdatedAt({ expectedUpdatedAt: "nonsense" })).toBeUndefined();
  });
});

describe("conflictResponse", () => {
  it("returns 409 with who changed it, or deleted", async () => {
    const r = conflictResponse({ updatedAt: "2026-10-28T15:06:46.703Z", updatedBy: { name: "Boris" } });
    expect(r.status).toBe(409);
    expect(await r.json()).toMatchObject({ error: "conflict", deleted: false, updatedBy: "Boris" });
    expect(await conflictResponse(null).json()).toMatchObject({ deleted: true });
  });
});
