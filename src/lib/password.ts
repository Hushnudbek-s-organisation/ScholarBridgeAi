/**
 * Password hashing utilities (server-side only).
 *
 * Uses Node's built-in scrypt (no extra dependencies). The stored value has
 * the format `scrypt:<salt-hex>:<hash-hex>` — plain passwords are NEVER
 * written to the database.
 */
import { randomBytes, scryptSync, timingSafeEqual } from "crypto";

const SCRYPT_KEYLEN = 64;
const SALT_BYTES = 16;

/** Hash a plain-text password with a fresh random salt. */
export function hashPassword(plain: string): string {
  const salt = randomBytes(SALT_BYTES).toString("hex");
  const hash = scryptSync(plain, salt, SCRYPT_KEYLEN).toString("hex");
  return `scrypt:${salt}:${hash}`;
}

/** Constant-time check of a plain password against a stored hash. */
export function verifyPassword(plain: string, stored: string | null | undefined): boolean {
  if (!stored || typeof stored !== "string") return false;
  const parts = stored.split(":");
  if (parts.length !== 3 || parts[0] !== "scrypt") return false;
  const [, salt, hashHex] = parts;
  let expected: Buffer;
  try {
    expected = Buffer.from(hashHex, "hex");
  } catch {
    return false;
  }
  const actual = scryptSync(plain, salt, SCRYPT_KEYLEN);
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}

/**
 * Strip secrets from a profile row BEFORE it is sent to the browser.
 * Every API route that returns a student profile must pass the row through
 * this so `passwordHash` never appears in a response.
 */
export function sanitizeProfile<T extends object>(profile: T | null | undefined): Omit<T, "passwordHash"> | null | undefined {
  if (!profile) return profile as null | undefined;
  const { passwordHash: _secret, ...rest } = profile as T & { passwordHash?: string | null };
  return rest as Omit<T, "passwordHash">;
}
