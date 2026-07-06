import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { checkApiKeyRateLimit, clearRateLimit } from "@/lib/rate-limit";

describe("checkApiKeyRateLimit", () => {
  beforeEach(() => {
    clearRateLimit();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("allows requests under the in-memory limit", async () => {
    const allowed = await checkApiKeyRateLimit("sk_test1234", 3);
    expect(allowed).toBe(true);
    expect(await checkApiKeyRateLimit("sk_test1234", 3)).toBe(true);
    expect(await checkApiKeyRateLimit("sk_test1234", 3)).toBe(true);
  });

  it("blocks when in-memory limit exceeded", async () => {
    await checkApiKeyRateLimit("sk_abcd5678", 2);
    await checkApiKeyRateLimit("sk_abcd5678", 2);
    expect(await checkApiKeyRateLimit("sk_abcd5678", 2)).toBe(false);
  });

  it("resets after the window expires", async () => {
    await checkApiKeyRateLimit("sk_reset000", 1);
    expect(await checkApiKeyRateLimit("sk_reset000", 1)).toBe(false);
    vi.advanceTimersByTime(61_000);
    expect(await checkApiKeyRateLimit("sk_reset000", 1)).toBe(true);
  });
});
