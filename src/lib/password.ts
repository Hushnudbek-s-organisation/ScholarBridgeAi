/**
 * Password hashing utilities (server-side only).
 *
 * Uses Node's built-in scrypt (no extra dependencies). The stored value has
 * the format `scrypt:<salt-hex>:<hash-hex>` — plain passwords are NEVER
 * written to the database.
 */
import { randomBytes, scryptSync, timingSafeEqual } from "crypto";
import { MIN_PASSWORD_LENGTH } from "./passwordPolicy";

const SCRYPT_KEYLEN = 64;
const SALT_BYTES = 16;

export { MIN_PASSWORD_LENGTH } from "./passwordPolicy";

/** Reject the most common passwords outright. */
const BLOCKED_PASSWORDS = new Set([
  "password",
  "password1",
  "password123",
  "12345678",
  "123456789",
  "1234567890",
  "qwerty123",
  "qwertyuiop",
  "iloveyou",
  "admin123",
  "scholarbridge",
  "scholarbridgeai",
]);

/**
 * One canonical form for a password, applied at BOTH ends of its life.
 *
 * Sign up, sign in and password change used to disagree: the sign-up route
 * trimmed the typed value before hashing it, while the sign-in route compared
 * the raw value. A password typed with a trailing space — mobile keyboards and
 * password managers add one routinely — therefore stored as "mypass123" and was
 * then checked as "mypass123 ", which can never match: the account is created
 * successfully and can never be signed into again.
 */
export function normalisePassword(plain: string): string {
  return typeof plain === "string" ? plain.trim() : "";
}

/**
 * Which rule a password broke. The UI needs the REASON, not just "invalid":
 * a visitor who typed eight characters and saw "your password must be at least
 * 8 characters" concluded the app cannot count, when in fact the password was
 * on the blocked list (`12345678`, `qwerty123`, …).
 */
export type PasswordProblem = "too_short" | "too_long" | "too_common";

/**
 * Validate a password. Returns null when acceptable, otherwise the rule it
 * broke plus a sentence safe to show to the user.
 */
export function passwordPolicyProblem(rawPlain: string): { problem: PasswordProblem; message: string } | null {
  const plain = normalisePassword(rawPlain);
  if (plain.length < MIN_PASSWORD_LENGTH) {
    return {
      problem: "too_short",
      message: `Password must be at least ${MIN_PASSWORD_LENGTH} characters`,
    };
  }
  if (plain.length > 200) {
    return { problem: "too_long", message: "Password is too long (max 200 characters)" };
  }
  if (BLOCKED_PASSWORDS.has(plain.toLowerCase())) {
    return {
      problem: "too_common",
      message: "This password is too common — please choose another one",
    };
  }
  return null;
}

/** Validate a password. Returns null when acceptable, otherwise the reason it
 * was rejected (safe to show to the user). */
export function passwordPolicyError(rawPlain: string): string | null {
  return passwordPolicyProblem(rawPlain)?.message ?? null;
}

/** Hash a plain-text password with a fresh random salt. */
export function hashPassword(rawPlain: string): string {
  const plain = normalisePassword(rawPlain);
  const salt = randomBytes(SALT_BYTES).toString("hex");
  const hash = scryptSync(plain, salt, SCRYPT_KEYLEN).toString("hex");
  return `scrypt:${salt}:${hash}`;
}

/**
 * Constant-time check of a plain password against a stored hash.
 *
 * The candidate is normalised exactly like `hashPassword` did, so a trailing
 * space can no longer produce "correct password rejected".
 */
export function verifyPassword(rawPlain: string, stored: string | null | undefined): boolean {
  const plain = normalisePassword(rawPlain);
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
