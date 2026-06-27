/**
 * API key management utilities.
 *
 * - generateApiKey()  → creates a `sk_<64hex>` key and returns { plaintext, prefix, keyHash }
 * - hashKey(key)      → SHA-256 hex digest (never stored plaintext)
 * - validateKey()     → constant-time compare via crypto.timingSafeEqual
 * - checkScope()      → verifies required scope is present in key's scopes array
 *
 * @security Pro verify mandatory: no plaintext storage, constant-time compare,
 *           no key hashes in logs or returned from queries.
 */

import crypto from "node:crypto";

const KEY_PREFIX = "sk_";
const KEY_HEX_LENGTH = 64; // 32 random bytes → 64 hex chars

/** The hash algorithm used for all API keys. */
const HASH_ALGORITHM = "sha256";

/**
 * Hash a key value using SHA-256 and return the hex digest.
 * This is the ONLY value stored in the database.
 */
export function hashKey(key: string): string {
  return crypto.createHash(HASH_ALGORITHM).update(key, "utf-8").digest("hex");
}

/**
 * Generate a new API key.
 *
 * Returns the plaintext key (shown once to the user), a prefix (first 8 hex
 * chars after `sk_` for DB lookup), and the key hash (stored in DB).
 *
 * Format: `sk_<64 lowercase hex characters>`
 * Example: `sk_a1b2c3d4e5f6...`
 */
export function generateApiKey(): {
  plaintext: string;
  prefix: string;
  keyHash: string;
} {
  const randomBytes = crypto.randomBytes(KEY_HEX_LENGTH / 2); // 256-bit entropy
  const hex = randomBytes.toString("hex"); // 64 hex chars
  const plaintext = `${KEY_PREFIX}${hex}`;
  // Prefix = first 8 hex chars after sk_
  const prefix = `${KEY_PREFIX}${hex.substring(0, 8)}`;
  const keyHash = hashKey(plaintext);

  return { plaintext, prefix, keyHash };
}

/**
 * Validate a key by comparing its hash against a stored hash using
 * crypto.timingSafeEqual to prevent timing side-channel attacks.
 *
 * @param expectedHash - The SHA-256 hash stored in the database.
 * @param providedKey  - The full plaintext key provided in the request.
 * @returns true if the key's hash matches the stored hash.
 */
export function validateKey(expectedHash: string, providedKey: string): boolean {
  const providedHash = hashKey(providedKey);
  const expectedBuf = Buffer.from(expectedHash, "hex");
  const providedBuf = Buffer.from(providedHash, "hex");

  if (expectedBuf.length !== providedBuf.length) {
    // Defense-in-depth: different hash lengths cannot match
    // Use timingSafeEqual anyway to keep control flow constant
    crypto.timingSafeEqual(expectedBuf, expectedBuf);
    return false;
  }

  return crypto.timingSafeEqual(expectedBuf, providedBuf);
}

/**
 * Check if a set of scopes contains a required scope.
 *
 * Scopes follow the format `resource:action` (e.g. `projects:read`, `models:write`).
 * The `admin` scope grants access to everything.
 *
 * @param scopes    - The array of scopes assigned to the key.
 * @param required  - The single scope string required (e.g. `"projects:read"`).
 * @returns true if the required scope is present or the key has `admin` scope.
 */
export function checkScope(scopes: string[] | null | undefined, required: string): boolean {
  if (!scopes || scopes.length === 0) {
    return false;
  }

  // 'admin' scope grants all access
  if (scopes.includes("admin")) {
    return true;
  }

  return scopes.includes(required);
}
