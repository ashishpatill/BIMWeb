/**
 * Shared API v1 authentication helper.
 *
 * Extracts Bearer token → looks up key by prefix → constant-time hash comparison →
 * revoked check → per-key in-memory rate limit → records usage.
 *
 * @security Pro verify mandatory: no plaintext keys, constant-time compare,
 *           no key hashes in logs or responses, scope enforcement.
 *           Rate limit: Upstash Redis when configured, else in-memory per-key map.
 */

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { apiKeys } from "@/db/schema";
import { eq, and, isNull } from "drizzle-orm";
import { validateKey, checkScope } from "@/lib/api-keys";
import { recordApiKeyUsage } from "@/lib/actions";
import { checkApiKeyRateLimit, clearRateLimit } from "@/lib/rate-limit";

export { clearRateLimit };

// ── Result types ─────────────────────────────────────────────────────────────

export interface AuthResult {
  userId: string;
  scopes: string[];
  rateLimitPerMin: number;
  keyPrefix: string;
}

export type AuthFailure =
  | { reason: "unauthorized" }
  | { reason: "rate_limited" };

export type AuthOutcome = AuthResult | AuthFailure;

function isAuthResult(v: AuthOutcome): v is AuthResult {
  return "userId" in v;
}

// ── Main helper ─────────────────────────────────────────────────────────────

/**
 * Validate the API key from the Authorization header.
 *
 * 1. Extract `Bearer <key>` from header.
 * 2. Parse prefix (`sk_<first8hex>`) from the key.
 * 3. Query DB for matching non-revoked key by prefix.
 * 4. Constant-time compare hash.
 * 5. Enforce per-key rate limit.
 * 6. Record usage (fire-and-forget).
 *
 * Returns `AuthResult` on success, `AuthFailure` on failure (unauthorized or
 * rate_limited). Callers must use `requireAuth` or check the reason to respond
 * with appropriate status code.
 */
export async function validateApiKey(
  request: NextRequest,
): Promise<AuthOutcome> {
  const authHeader = request.headers.get("authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return { reason: "unauthorized" };
  }

  const providedKey = authHeader.slice(7).trim();
  if (!providedKey || providedKey.length < 12) {
    // sk_ + at least 8 hex chars
    return { reason: "unauthorized" };
  }

  // Extract prefix (sk_ + first 8 hex chars)
  const prefix =
    providedKey.length >= 12 ? providedKey.substring(0, 11) : providedKey;
  // Verify it starts with sk_
  if (!prefix.startsWith("sk_")) {
    return { reason: "unauthorized" };
  }

  // Look up by prefix — only non-revoked keys
  let rows: Array<{
    id: number;
    userId: string;
    keyHash: string;
    scopes: string[] | null;
    rateLimitPerMin: number | null;
    revokedAt: Date | null;
    prefix: string;
  }>;
  try {
    rows = (await db
      .select({
        id: apiKeys.id,
        userId: apiKeys.userId,
        keyHash: apiKeys.keyHash,
        scopes: apiKeys.scopes,
        rateLimitPerMin: apiKeys.rateLimitPerMin,
        revokedAt: apiKeys.revokedAt,
        prefix: apiKeys.prefix,
      })
      .from(apiKeys)
      .where(and(eq(apiKeys.prefix, prefix), isNull(apiKeys.revokedAt)))
      .limit(1)) as Array<{
      id: number;
      userId: string;
      keyHash: string;
      scopes: string[] | null;
      rateLimitPerMin: number | null;
      revokedAt: Date | null;
      prefix: string;
    }>;
  } catch {
    // DB error — don't leak details
    return { reason: "unauthorized" };
  }

  if (rows.length === 0) {
    return { reason: "unauthorized" };
  }

  const row = rows[0];

  // Constant-time hash comparison
  if (!validateKey(row.keyHash, providedKey)) {
    return { reason: "unauthorized" };
  }

  // Double-check revoked (defense-in-depth — query already filters)
  if (row.revokedAt) {
    return { reason: "unauthorized" };
  }

  const effectiveRateLimit = row.rateLimitPerMin ?? 60;

  // Per-key rate limit (Upstash when configured, else in-memory)
  if (!(await checkApiKeyRateLimit(row.prefix, effectiveRateLimit))) {
    return { reason: "rate_limited" };
  }

  // Record usage asynchronously — don't block the request
  recordApiKeyUsage(row.prefix).catch(() => {
    // Silently ignore — usage tracking must never break the API
  });

  return {
    userId: row.userId,
    scopes: row.scopes ?? ["projects:read"],
    rateLimitPerMin: effectiveRateLimit,
    keyPrefix: row.prefix,
  };
}

// ── Auth + scope combined checker ────────────────────────────────────────────

/**
 * Validate the API key, check scope, and return the AuthResult.
 * If auth fails or scope is missing, returns an appropriate error Response.
 */
export async function requireAuth(
  request: NextRequest,
  requiredScope: string,
): Promise<{ auth: AuthResult } | { error: NextResponse }> {
  const outcome = await validateApiKey(request);

  if (!isAuthResult(outcome)) {
    if (outcome.reason === "rate_limited") {
      return {
        error: NextResponse.json(
          { error: "Too Many Requests" },
          { status: 429, headers: { "Retry-After": "60" } },
        ),
      };
    }
    return {
      error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
    };
  }

  if (!checkScope(outcome.scopes, requiredScope)) {
    return {
      error: NextResponse.json(
        { error: `Insufficient scope: requires '${requiredScope}'` },
        { status: 403 },
      ),
    };
  }

  return { auth: outcome };
}

// ── Legacy scope helper (kept for compatibility) ────────────────────────────

/**
 * Assert the authenticated key has the required scope.
 * Returns null if allowed, or a 403/401 Response if denied.
 *
 * @deprecated Use `requireAuth` instead.
 */
export function requireScope(
  auth: AuthResult | null,
  required: string,
): NextResponse | null {
  if (!auth) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!checkScope(auth.scopes, required)) {
    return NextResponse.json(
      { error: `Insufficient scope: requires '${required}'` },
      { status: 403 },
    );
  }
  return null;
}

// ── Error response helpers ───────────────────────────────────────────────────

export function respondUnauthorized(): NextResponse {
  return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
}

export function respondRateLimit(): NextResponse {
  return NextResponse.json(
    { error: "Too Many Requests" },
    {
      status: 429,
      headers: { "Retry-After": "60" },
    },
  );
}

export function respondNotFound(resource?: string): NextResponse {
  return NextResponse.json(
    { error: resource ? `${resource} not found` : "Not found" },
    { status: 404 },
  );
}

export function respondBadRequest(message: string): NextResponse {
  return NextResponse.json({ error: message }, { status: 400 });
}
