import { describe, expect, it } from "vitest";
import { categoryLabel, daysLabel, monthName, normalizeLang, pickLocalized, t } from "./messages";

describe("t", () => {
  it("returns the market language and fills placeholders", () => {
    expect(t("sw", "close")).toBe("Funga");
    expect(t("pt", "showMore", { count: 3 })).toBe("Mostrar mais (3 restantes)");
  });

  it("falls back to English for unknown languages", () => {
    expect(normalizeLang("el")).toBe("en");
    expect(t("el", "close")).toBe("Close");
  });

  it("keeps the existing Serbian SEO title unchanged", () => {
    expect(t("sr", "metaTitle", { month: "Oktobar", year: 2026 })).toBe("Kalendar Promocija Oktobar 2026 | Meridianbet");
  });
});

describe("monthName", () => {
  it("is localized and capitalized", () => {
    expect(monthName("sr", 9)).toBe("Oktobar");
    expect(monthName("pt", 9)).toBe("Outubro");
    expect(monthName("sw", 9)).toBe("Oktoba");
    expect(monthName("en", 9)).toBe("October");
  });
});

describe("daysLabel", () => {
  it("uses Serbian/Bosnian plural rules", () => {
    expect([1, 2, 5, 11, 21].map((n) => daysLabel("sr", n))).toEqual(["dan", "dana", "dana", "dana", "dan"]);
    expect([1, 2].map((n) => daysLabel("en", n))).toEqual(["day", "days"]);
  });
});

describe("categoryLabel / pickLocalized", () => {
  it("translates categories with ALL as fallback", () => {
    expect(categoryLabel("pt", "GOLD")).toBe("Bola de Ouro");
    expect(categoryLabel("sr", "UNKNOWN")).toBe("Sve");
  });

  it("picks the requested language, then the market default", () => {
    const titles = { sw: "Promosheni", en: "" };
    expect(pickLocalized(titles, "en", "sw")).toBe("Promosheni");
    expect(pickLocalized({ en: "Promos" }, "en", "sw")).toBe("Promos");
    expect(pickLocalized("Legacy string", "en", "sw")).toBe("Legacy string");
    expect(pickLocalized(null, "en", "sw")).toBeNull();
  });
});
