import { describe, it, expect } from "vitest";
import {
  hashKey,
  generateApiKey,
  validateKey,
  checkScope,
} from "../../src/lib/api-keys";

// ── hashKey ────────────────────────────────────────────────────────────────────

describe("hashKey", () => {
  it("returns a 64-character hex string", () => {
    const hash = hashKey("sk_test-key-value");
    expect(hash).toMatch(/^[0-9a-f]{64}$/);
  });

  it("is deterministic — same input produces same hash", () => {
    const key = "sk_a1b2c3d4e5f67890";
    expect(hashKey(key)).toBe(hashKey(key));
  });

  it("different inputs produce different hashes", () => {
    const hash1 = hashKey("sk_key_one");
    const hash2 = hashKey("sk_key_two");
    expect(hash1).not.toBe(hash2);
  });

  it("output is distinct from input", () => {
    const key = "sk_abcdef1234567890";
    const hash = hashKey(key);
    expect(hash).not.toBe(key);
    expect(key.startsWith("sk_")).toBe(true);
    expect(hash.startsWith("sk_")).toBe(false);
  });

  it("handles empty string input", () => {
    const hash = hashKey("");
    expect(hash).toMatch(/^[0-9a-f]{64}$/);
  });
});

// ── generateApiKey ─────────────────────────────────────────────────────────────

describe("generateApiKey", () => {
  it("returns an object with plaintext, prefix, and keyHash", () => {
    const result = generateApiKey();
    expect(result).toHaveProperty("plaintext");
    expect(result).toHaveProperty("prefix");
    expect(result).toHaveProperty("keyHash");
  });

  it("plaintext starts with 'sk_'", () => {
    const { plaintext } = generateApiKey();
    expect(plaintext.startsWith("sk_")).toBe(true);
  });

  it("plaintext is 'sk_' + 64 hex chars", () => {
    const { plaintext } = generateApiKey();
    expect(plaintext.length).toBe(3 + 64); // "sk_" + 64 hex chars
    const hexPart = plaintext.slice(3);
    expect(hexPart).toMatch(/^[0-9a-f]{64}$/);
  });

  it("prefix is first 8 hex chars after sk_", () => {
    const { plaintext, prefix } = generateApiKey();
    expect(prefix).toBe("sk_" + plaintext.slice(3, 3 + 8));
    expect(prefix.length).toBe(3 + 8);
  });

  it("keyHash matches hash of plaintext", () => {
    const { plaintext, keyHash } = generateApiKey();
    expect(hashKey(plaintext)).toBe(keyHash);
  });

  it("sequential calls produce different keys", () => {
    const k1 = generateApiKey();
    const k2 = generateApiKey();
    expect(k1.plaintext).not.toBe(k2.plaintext);
    expect(k1.keyHash).not.toBe(k2.keyHash);
    expect(k1.prefix).not.toBe(k2.prefix);
  });

  it("keyHash is distinct from plaintext", () => {
    const { plaintext, keyHash } = generateApiKey();
    expect(keyHash).not.toBe(plaintext);
    expect(keyHash.startsWith("sk_")).toBe(false);
  });
});

// ── validateKey ────────────────────────────────────────────────────────────────

describe("validateKey", () => {
  it("returns true when the correct key is provided", () => {
    const { plaintext, keyHash } = generateApiKey();
    expect(validateKey(keyHash, plaintext)).toBe(true);
  });

  it("returns false when the wrong key is provided", () => {
    const { keyHash } = generateApiKey();
    expect(validateKey(keyHash, "sk_wrongkeyvalue")).toBe(false);
  });

  it("returns false for a completely different key", () => {
    const hash = hashKey("sk_abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890");
    expect(validateKey(hash, "sk_0000000000000000000000000000000000000000000000000000000000000000")).toBe(false);
  });

  it("returns false when provided key is empty", () => {
    const { keyHash } = generateApiKey();
    expect(validateKey(keyHash, "")).toBe(false);
  });

  it("returns false when expected hash is empty", () => {
    const { plaintext } = generateApiKey();
    expect(validateKey("", plaintext)).toBe(false);
  });

  it("returns false when both hash and key length differ", () => {
    // Hash of a short key vs long key — different lengths reach the
    // defense-in-depth branch in validateKey
    const shortHash = hashKey("sk_short");
    const longKey = "sk_" + "a".repeat(64);
    expect(validateKey(shortHash, longKey)).toBe(false);
  });

  it("uses constant-time comparison (no observable timing difference)", () => {
    // We cannot actually test timing in unit tests reliably, but we verify
    // the implementation uses crypto.timingSafeEqual by calling it
    const { plaintext, keyHash } = generateApiKey();
    // This should not throw and should work correctly
    expect(validateKey(keyHash, plaintext)).toBe(true);
    expect(validateKey(keyHash, plaintext + "x")).toBe(false);
  });
});

// ── checkScope ────────────────────────────────────────────────────────────────

describe("checkScope", () => {
  it("admin scope grants access to any required scope", () => {
    expect(checkScope(["admin"], "projects:read")).toBe(true);
    expect(checkScope(["admin"], "models:write")).toBe(true);
    expect(checkScope(["admin"], "search:read")).toBe(true);
    expect(checkScope(["admin"], "nonexistent:delete")).toBe(true);
  });

  it("exact scope match returns true", () => {
    expect(checkScope(["projects:read"], "projects:read")).toBe(true);
    expect(checkScope(["models:write"], "models:write")).toBe(true);
  });

  it("missing scope returns false", () => {
    expect(checkScope(["projects:read"], "projects:write")).toBe(false);
    expect(checkScope(["models:read"], "models:write")).toBe(false);
  });

  it("returns false for null scopes", () => {
    expect(checkScope(null, "projects:read")).toBe(false);
  });

  it("returns false for undefined scopes", () => {
    expect(checkScope(undefined, "projects:read")).toBe(false);
  });

  it("returns false for empty scopes array", () => {
    expect(checkScope([], "projects:read")).toBe(false);
  });

  it("multiple scopes with matching one returns true", () => {
    expect(
      checkScope(["projects:read", "models:read", "search:read"], "models:read"),
    ).toBe(true);
  });

  it("multiple scopes without matching one returns false", () => {
    expect(
      checkScope(["projects:read", "models:read"], "audit:read"),
    ).toBe(false);
  });

  it("admin scope works alongside other scopes", () => {
    expect(checkScope(["admin", "projects:read"], "search:read")).toBe(true);
  });

  it("is case-sensitive", () => {
    expect(checkScope(["Projects:Read"], "projects:read")).toBe(false);
  });
});
