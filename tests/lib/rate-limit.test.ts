import { describe, it, expect, beforeEach } from "vitest";
import { checkPerKeyRateLimit, clearRateLimit } from "@/lib/rate-limit";

describe("rate-limit", () => {
  beforeEach(() => {
    clearRateLimit();
    delete process.env.UPSTASH_REDIS_REST_URL;
    delete process.env.UPSTASH_REDIS_REST_TOKEN;
  });

  it("allows requests within the per-minute limit (in-memory)", async () => {
    const prefix = "sk_test1234";
    expect(await checkPerKeyRateLimit(prefix, 3)).toBe(true);
    expect(await checkPerKeyRateLimit(prefix, 3)).toBe(true);
    expect(await checkPerKeyRateLimit(prefix, 3)).toBe(true);
    expect(await checkPerKeyRateLimit(prefix, 3)).toBe(false);
  });

  it("resets counter after clearRateLimit", async () => {
    const prefix = "sk_clearme1";
    await checkPerKeyRateLimit(prefix, 1);
    expect(await checkPerKeyRateLimit(prefix, 1)).toBe(false);
    clearRateLimit(prefix);
    expect(await checkPerKeyRateLimit(prefix, 1)).toBe(true);
  });

  it("uses separate counters per key prefix", async () => {
    expect(await checkPerKeyRateLimit("sk_aaaa", 1)).toBe(true);
    expect(await checkPerKeyRateLimit("sk_bbbb", 1)).toBe(true);
    expect(await checkPerKeyRateLimit("sk_aaaa", 1)).toBe(false);
    expect(await checkPerKeyRateLimit("sk_bbbb", 1)).toBe(false);
  });
});
