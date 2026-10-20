import { describe, expect, it } from "vitest";
import { isValidLink, sanitizeLink } from "./validate";

describe("isValidLink", () => {
  it("accepts empty values", () => {
    expect(isValidLink("")).toBe(true);
    expect(isValidLink(null)).toBe(true);
    expect(isValidLink(undefined)).toBe(true);
  });

  it("accepts relative paths", () => {
    expect(isValidLink("/promo/123")).toBe(true);
  });

  it("accepts http/https URLs", () => {
    expect(isValidLink("https://example.com")).toBe(true);
    expect(isValidLink("http://example.com")).toBe(true);
  });

  it("rejects javascript: URLs", () => {
    expect(isValidLink("javascript:alert(1)")).toBe(false);
  });

  it("rejects data: URLs", () => {
    expect(isValidLink("data:text/html,<script>alert(1)</script>")).toBe(false);
  });
});

describe("sanitizeLink", () => {
  it("passes through a valid link, trimmed", () => {
    expect(sanitizeLink("  https://example.com  ")).toBe("https://example.com");
  });

  it("returns empty string for an invalid link instead of the raw value", () => {
    expect(sanitizeLink("javascript:alert(1)")).toBe("");
  });
});
