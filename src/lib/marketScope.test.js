import { beforeEach, describe, expect, it, vi } from "vitest";

const { findUniqueMarket, findUniqueAdminUser, getAdminFromRequestMock } = vi.hoisted(() => ({
  findUniqueMarket: vi.fn(),
  findUniqueAdminUser: vi.fn(),
  getAdminFromRequestMock: vi.fn(),
}));

vi.mock("@/lib/db", () => ({
  default: {
    market: { findUnique: findUniqueMarket },
    adminUser: { findUnique: findUniqueAdminUser },
  },
}));

vi.mock("@/lib/auth", () => ({
  getAdminFromRequest: getAdminFromRequestMock,
}));

const { requireAdminMarket, requireAdminMarketOrResponse, MarketScopeError } = await import("./marketScope");

function makeReq(url = "http://localhost/api/special", cookie = "") {
  return { url, headers: { get: (name) => (name === "cookie" ? cookie : null) } };
}

describe("requireAdminMarket", () => {
  beforeEach(() => {
    findUniqueMarket.mockReset();
    findUniqueAdminUser.mockReset();
    getAdminFromRequestMock.mockReset();
  });

  it("throws 401 when there is no session", async () => {
    getAdminFromRequestMock.mockResolvedValue(null);
    await expect(requireAdminMarket(makeReq())).rejects.toMatchObject(
      new MarketScopeError("unauthorized", 401)
    );
  });

  it("throws 403 when an ADMIN has no assigned market", async () => {
    getAdminFromRequestMock.mockResolvedValue({ adminId: 1 });
    findUniqueAdminUser.mockResolvedValue({ role: "ADMIN", markets: [] });
    await expect(requireAdminMarket(makeReq())).rejects.toMatchObject(
      new MarketScopeError("admin has no assigned market", 403)
    );
  });

  it("rejects an ADMIN asking via ?market= for a market they aren't assigned", async () => {
    getAdminFromRequestMock.mockResolvedValue({ adminId: 1 });
    findUniqueAdminUser.mockResolvedValue({ role: "ADMIN", markets: [{ id: "market-rs", code: "rs" }] });

    // ADMIN can't switch tenants by tampering with the URL.
    await expect(
      requireAdminMarket(makeReq("http://localhost/api/special?market=br"))
    ).rejects.toMatchObject(new MarketScopeError("Forbidden", 403));
    expect(findUniqueMarket).not.toHaveBeenCalled();
  });

  it("lets an ADMIN with several markets pick one of them via the cookie", async () => {
    getAdminFromRequestMock.mockResolvedValue({ adminId: 1 });
    findUniqueAdminUser.mockResolvedValue({
      role: "ADMIN",
      markets: [{ id: "market-br", code: "br" }, { id: "market-me", code: "me" }],
    });

    const { market } = await requireAdminMarket(makeReq(undefined, "admin_market=me"));
    expect(market.code).toBe("me");
  });

  it("falls back to the ADMIN's first market when the cookie names someone else's", async () => {
    getAdminFromRequestMock.mockResolvedValue({ adminId: 1 });
    findUniqueAdminUser.mockResolvedValue({
      role: "ADMIN",
      markets: [{ id: "market-br", code: "br" }, { id: "market-me", code: "me" }],
    });

    const { market } = await requireAdminMarket(makeReq(undefined, "admin_market=rs"));
    expect(market.code).toBe("br");
  });

  it("throws 400 when a SUPER_ADMIN specifies no market", async () => {
    getAdminFromRequestMock.mockResolvedValue({ adminId: 2, mfa: true });
    findUniqueAdminUser.mockResolvedValue({ role: "SUPER_ADMIN", markets: [] });
    await expect(requireAdminMarket(makeReq())).rejects.toMatchObject(
      new MarketScopeError("super admin must specify ?market=", 400)
    );
  });

  it("lets a SUPER_ADMIN pick any market via ?market=", async () => {
    getAdminFromRequestMock.mockResolvedValue({ adminId: 2, mfa: true });
    findUniqueAdminUser.mockResolvedValue({ role: "SUPER_ADMIN", markets: [] });
    findUniqueMarket.mockResolvedValue({ id: "market-br", code: "br" });

    const { market } = await requireAdminMarket(makeReq("http://localhost/api/special?market=br"));
    expect(market.code).toBe("br");
    expect(findUniqueMarket).toHaveBeenCalledWith({ where: { code: "br" } });
  });
});

describe("session validity (loadSessionAdmin via requireAdminMarket)", () => {
  beforeEach(() => {
    findUniqueMarket.mockReset();
    findUniqueAdminUser.mockReset();
    getAdminFromRequestMock.mockReset();
  });

  const rs = [{ id: "market-rs", code: "rs" }];

  it("rejects a SUPER_ADMIN session that was not confirmed with 2FA", async () => {
    getAdminFromRequestMock.mockResolvedValue({ adminId: 2 });
    findUniqueAdminUser.mockResolvedValue({ role: "SUPER_ADMIN", markets: [] });
    await expect(requireAdminMarket(makeReq("http://localhost/api/special?market=br"))).rejects.toMatchObject(
      new MarketScopeError("two-factor authentication required", 401)
    );
  });

  it("requires 2FA for an ADMIN who turned it on, but not for one who didn't", async () => {
    getAdminFromRequestMock.mockResolvedValue({ adminId: 1 });
    findUniqueAdminUser.mockResolvedValue({ role: "ADMIN", totpEnabled: true, markets: rs });
    await expect(requireAdminMarket(makeReq())).rejects.toMatchObject({ status: 401 });

    findUniqueAdminUser.mockResolvedValue({ role: "ADMIN", totpEnabled: false, markets: rs });
    await expect(requireAdminMarket(makeReq())).resolves.toMatchObject({ market: { code: "rs" } });
  });

  it("rejects sessions issued before the last password change", async () => {
    getAdminFromRequestMock.mockResolvedValue({ adminId: 1, iat: 1_000 });
    findUniqueAdminUser.mockResolvedValue({ role: "ADMIN", passwordChangedAt: new Date(2_000_000), markets: rs });
    await expect(requireAdminMarket(makeReq())).rejects.toMatchObject(new MarketScopeError("session expired", 401));
  });

  it("accepts a session issued in the same second as the password change", async () => {
    getAdminFromRequestMock.mockResolvedValue({ adminId: 1, iat: 2_000 });
    findUniqueAdminUser.mockResolvedValue({ role: "ADMIN", passwordChangedAt: new Date(2_000_500), markets: rs });
    await expect(requireAdminMarket(makeReq())).resolves.toMatchObject({ market: { code: "rs" } });
  });

  it("blocks everything but the password change while a temporary password is set", async () => {
    getAdminFromRequestMock.mockResolvedValue({ adminId: 1 });
    findUniqueAdminUser.mockResolvedValue({ role: "ADMIN", mustChangePassword: true, markets: rs });
    await expect(requireAdminMarket(makeReq())).rejects.toMatchObject(
      new MarketScopeError("password change required", 403)
    );
  });
});

describe("requireAdminMarketOrResponse", () => {
  beforeEach(() => {
    findUniqueMarket.mockReset();
    findUniqueAdminUser.mockReset();
    getAdminFromRequestMock.mockReset();
  });

  it("returns { errorResponse } instead of throwing, with the right status", async () => {
    getAdminFromRequestMock.mockResolvedValue(null);
    const { errorResponse, market } = await requireAdminMarketOrResponse(makeReq());
    expect(market).toBeUndefined();
    expect(errorResponse.status).toBe(401);
  });

  it("returns { market } on success", async () => {
    getAdminFromRequestMock.mockResolvedValue({ adminId: 1 });
    findUniqueAdminUser.mockResolvedValue({ role: "ADMIN", markets: [{ id: "market-rs", code: "rs" }] });

    const { errorResponse, market } = await requireAdminMarketOrResponse(makeReq());
    expect(errorResponse).toBeUndefined();
    expect(market.code).toBe("rs");
  });
});
