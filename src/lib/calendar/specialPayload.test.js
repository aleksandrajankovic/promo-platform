import { beforeEach, describe, expect, it, vi } from "vitest";

const { resolveMonthThemeMock } = vi.hoisted(() => ({ resolveMonthThemeMock: vi.fn() }));
vi.mock("@/lib/calendar/monthTheme", () => ({ resolveMonthTheme: resolveMonthThemeMock }));

const { prepareSpecialData } = await import("./specialPayload");

const market = { id: "market-rs", defaultLocale: "sr" };
const valid = { year: 2026, month: 9, day: 20, title: "Promo" };

describe("prepareSpecialData", () => {
  beforeEach(() => {
    resolveMonthThemeMock.mockReset();
    resolveMonthThemeMock.mockResolvedValue("default");
  });

  it("rejects an invalid date", async () => {
    const { error } = await prepareSpecialData({ ...valid, month: 12 }, market);
    expect(error.status).toBe(400);
  });

  it("rejects a whitespace-only title", async () => {
    const { error } = await prepareSpecialData({ ...valid, title: "   " }, market);
    expect(error.status).toBe(400);
    expect(await error.text()).toBe("Title is required");
  });

  it("accepts a title given only in the main-language translation", async () => {
    const { data, error } = await prepareSpecialData(
      { ...valid, title: "", translations: { sr: { title: "Naslov" } } },
      market
    );
    expect(error).toBeUndefined();
    expect(data.title).toBe("Naslov");
  });

  it("leaves active undefined when not sent, so an update doesn't deactivate the promo", async () => {
    const { data } = await prepareSpecialData(valid, market);
    expect(data.active).toBeUndefined();
  });

  it("passes an explicit active=false through", async () => {
    const { data } = await prepareSpecialData({ ...valid, active: false }, market);
    expect(data.active).toBe(false);
  });

  it("rejects football-only categories and knockoutPhase outside the football theme", async () => {
    expect((await prepareSpecialData({ ...valid, category: "GOLD" }, market)).error.status).toBe(400);
    expect((await prepareSpecialData({ ...valid, knockoutPhase: "FINAL" }, market)).error.status).toBe(400);
  });

  it("allows them under the football theme", async () => {
    resolveMonthThemeMock.mockResolvedValue("football");
    const { data, error } = await prepareSpecialData({ ...valid, category: "GOLD", knockoutPhase: "FINAL" }, market);
    expect(error).toBeUndefined();
    expect(data).toMatchObject({ category: "GOLD", knockoutPhase: "FINAL" });
  });

  it("strips javascript: links", async () => {
    const { data } = await prepareSpecialData({ ...valid, link: "javascript:alert(1)" }, market);
    expect(data.link).toBe("");
  });
});
