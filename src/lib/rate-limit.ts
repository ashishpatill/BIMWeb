/**
 * Per-API-key rate limiting with Upstash Redis (production) or in-memory fallback (dev).
 *
 * Set UPSTASH_REDIS_REST_URL + UPSTASH_REDIS_REST_TOKEN for multi-instance deployments.
 */

import { Redis } from "@upstash/redis";

const WINDOW_SECONDS = 60;
const memoryMap = new Map<string, { count: number; resetAt: number }>();

let redisClient: Redis | null = null;

function getRedis(): Redis | null {
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) return null;
  if (!redisClient) {
    redisClient = new Redis({ url, token });
  }
  return redisClient;
}

function checkMemoryRateLimit(keyPrefix: string, limitPerMin: number): boolean {
  const now = Date.now();
  const entry = memoryMap.get(keyPrefix);
  if (!entry || now > entry.resetAt) {
    memoryMap.set(keyPrefix, {
      count: 1,
      resetAt: now + WINDOW_SECONDS * 1000,
    });
    return true;
  }
  entry.count++;
  return entry.count <= limitPerMin;
}

async function checkRedisRateLimit(
  keyPrefix: string,
  limitPerMin: number,
): Promise<boolean> {
  const redis = getRedis();
  if (!redis) return checkMemoryRateLimit(keyPrefix, limitPerMin);

  const redisKey = `bimweb:api:ratelimit:${keyPrefix}`;
  const count = await redis.incr(redisKey);
  if (count === 1) {
    await redis.expire(redisKey, WINDOW_SECONDS);
  }
  return count <= limitPerMin;
}

/** Returns true when the request is within the per-key rate limit. */
export async function checkPerKeyRateLimit(
  keyPrefix: string,
  limitPerMin: number,
): Promise<boolean> {
  if (getRedis()) {
    return checkRedisRateLimit(keyPrefix, limitPerMin);
  }
  return checkMemoryRateLimit(keyPrefix, limitPerMin);
}

/** Clear rate-limit counters (testing / key rotation). */
export function clearRateLimit(prefix?: string): void {
  if (prefix) {
    memoryMap.delete(prefix);
  } else {
    memoryMap.clear();
  }
}
