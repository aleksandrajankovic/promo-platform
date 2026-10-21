import { beforeAll, describe, expect, it } from "vitest";
import { Secret, TOTP } from "otpauth";
import {
  consumeRecoveryCode, decryptSecret, encryptSecret, generateRecoveryCodes,
  newTotpSecret, otpauthUri, verifyTotp,
} from "./totp";

beforeAll(() => {
  process.env.JWT_SECRET ||= "test-secret-test-secret-test-secret-123";
});

function currentCode(base32, offsetSteps = 0) {
  const totp = new TOTP({ secret: Secret.fromBase32(base32), digits: 6, period: 30 });
  return totp.generate({ timestamp: Date.now() + offsetSteps * 30_000 });
}

describe("secret encryption", () => {
  it("round-trips and does not store the secret in plain text", () => {
    const secret = newTotpSecret();
    const stored = encryptSecret(secret);
    expect(stored).not.toContain(secret);
    expect(decryptSecret(stored)).toBe(secret);
  });

  it("detects tampering", () => {
    const stored = encryptSecret(newTotpSecret());
    const parts = stored.split(".");
    parts[3] = parts[3].slice(0, -2) + (parts[3].endsWith("A") ? "BB" : "AA");
    expect(() => decryptSecret(parts.join("."))).toThrow();
  });
});

describe("verifyTotp", () => {
  const secret = newTotpSecret();

  it("accepts the current code and one step of clock drift", () => {
    expect(verifyTotp(secret, currentCode(secret))).toBe(true);
    expect(verifyTotp(secret, currentCode(secret, -1))).toBe(true);
  });

  it("rejects wrong, old and malformed codes", () => {
    expect(verifyTotp(secret, currentCode(secret, -5))).toBe(false);
    expect(verifyTotp(secret, "12345")).toBe(false);
    expect(verifyTotp(secret, "abcdef")).toBe(false);
  });

  it("tolerates spaces in the typed code", () => {
    const code = currentCode(secret);
    expect(verifyTotp(secret, `${code.slice(0, 3)} ${code.slice(3)}`)).toBe(true);
  });

  it("builds an otpauth URI for authenticator apps", () => {
    expect(otpauthUri(secret, "boris@meridianbet.com")).toMatch(/^otpauth:\/\/totp\/.*boris/);
  });
});

describe("recovery codes", () => {
  it("are single-use and accept any casing/dashes", () => {
    const { codes, hashes } = generateRecoveryCodes();
    expect(codes).toHaveLength(10);
    const left = consumeRecoveryCode(hashes, codes[3].toUpperCase().replace("-", " "));
    expect(left).toHaveLength(9);
    expect(consumeRecoveryCode(left, codes[3])).toBeNull();
    expect(consumeRecoveryCode(hashes, "nope-nope")).toBeNull();
  });
});
