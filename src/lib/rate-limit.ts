/**
 * Per-API-key rate limiting — Upstash Redis when configured, in-memory fallback.
 */

import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

const rateLimitMap = new Map<string, { count: number; resetAt: number }>();

let upstashLimiter: Ratelimit | null | undefined;

function getUpstashLimiter(): Ratelimit | null {
  if (upstashLimiter !== undefined) return upstashLimiter;

  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) {
    upstashLimiter = null;
    return null;
  }

  upstashLimiter = new Ratelimit({
    redis: new Redis({ url, token }),
    limiter: Ratelimit.slidingWindow(60, "1 m"),
    prefix: "bimweb:apikey",
  });
  return upstashLimiter;
}

function checkInMemoryRateLimit(prefix: string, limitPerMin: number): boolean {
  const now = Date.now();
  const entry = rateLimitMap.get(prefix);
  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(prefix, { count: 1, resetAt: now + 60_000 });
    return true;
  }
  entry.count++;
  return entry.count <= limitPerMin;
}

/** Returns true when the request is allowed under the per-key limit. */
export async function checkApiKeyRateLimit(
  prefix: string,
  limitPerMin: number,
): Promise<boolean> {
  const limiter = getUpstashLimiter();
  if (limiter) {
    const { success } = await limiter.limit(`${prefix}:${limitPerMin}`);
    return success;
  }
  return checkInMemoryRateLimit(prefix, limitPerMin);
}

/** Clear rate limit state (tests / key rotation). */
export function clearRateLimit(prefix?: string): void {
  if (prefix) {
    rateLimitMap.delete(prefix);
  } else {
    rateLimitMap.clear();
  }
}
