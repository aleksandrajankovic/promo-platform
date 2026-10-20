import { describe, expect, it } from "vitest";
import { getClientIp } from "./rateLimit";

function makeReq(headers) {
  return { headers: { get: (name) => headers[name] ?? null } };
}

describe("getClientIp", () => {
  it("prefers CF-Connecting-IP", () => {
    const req = makeReq({ "cf-connecting-ip": "1.1.1.1", "x-forwarded-for": "9.9.9.9, 2.2.2.2" });
    expect(getClientIp(req)).toBe("1.1.1.1");
  });

  it("uses the last X-Forwarded-For entry, not the client-supplied first one", () => {
    const req = makeReq({ "x-forwarded-for": "6.6.6.6, 3.3.3.3" });
    expect(getClientIp(req)).toBe("3.3.3.3");
  });

  it("falls back to x-real-ip, then 'unknown'", () => {
    expect(getClientIp(makeReq({ "x-real-ip": "4.4.4.4" }))).toBe("4.4.4.4");
    expect(getClientIp(makeReq({}))).toBe("unknown");
  });
});
