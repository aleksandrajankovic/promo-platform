import { describe, expect, it } from "vitest";
import { generateTempPassword, MIN_PASSWORD_LENGTH, validateNewPassword } from "./password";

describe("validateNewPassword", () => {
  it("requires a minimum length", () => {
    expect(validateNewPassword("short")).toMatch(/at least/);
    expect(validateNewPassword("x".repeat(MIN_PASSWORD_LENGTH))).toBeNull();
  });

  it("rejects passwords containing the email name", () => {
    expect(validateNewPassword("Boris.bajovic2026!", { email: "boris.bajovic@meridianbet.com" })).toMatch(/email/);
  });
});

describe("generateTempPassword", () => {
  it("generates long, unambiguous, different passwords", () => {
    const a = generateTempPassword();
    const b = generateTempPassword();
    expect(a).toHaveLength(14);
    expect(a).not.toBe(b);
    expect(a).not.toMatch(/[01lIO]/);
    expect(validateNewPassword(a)).toBeNull();
  });
});
