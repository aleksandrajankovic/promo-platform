import { describe, expect, it } from "vitest";
import { checkImageUrl, isValidLink, sanitizeLink } from "./validate";

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

describe("checkImageUrl", () => {
  it("accepts upload paths and http(s) URLs, empty means none", () => {
    expect(checkImageUrl(" /uploads/rs/bg.webp ")).toEqual({ url: "/uploads/rs/bg.webp" });
    expect(checkImageUrl("https://cdn.example.com/a.png")).toEqual({ url: "https://cdn.example.com/a.png" });
    expect(checkImageUrl("")).toEqual({ url: null });
  });

  it("rejects other protocols, protocol-relative URLs and CSS breakouts", () => {
    for (const bad of ["javascript:alert(1)", "data:image/png;base64,AAA", "//evil.example/x.png", '/a.png") ; background:url(x', "/a b.png"]) {
      expect(checkImageUrl(bad).error).toBeTruthy();
    }
  });
});
