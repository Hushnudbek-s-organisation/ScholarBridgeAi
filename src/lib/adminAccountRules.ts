/**
 * Account-recovery rules that need no database.
 *
 * Kept apart from `adminAccounts.ts` (which owns the queries) for the same
 * reason `passwordPolicy.ts` is apart from `password.ts`: the gate has to be
 * able to test the security-relevant rules with nothing running. Anything that
 * touches Drizzle lives in the other module.
 */
import { randomInt } from "node:crypto";

/** How many accounts one page of the admin list returns. */
export const ADMIN_ACCOUNT_PAGE = 25;

export interface AdminAccountRow {
  id: number;
  name: string;
  email: string;
  isAdmin: boolean;
  /** True when a password exists. NEVER the password, and never the hash. */
  hasPassword: boolean;
  /** When the password was last SET. `null` = set before this was recorded. */
  passwordChangedAt: string | null;
  createdAt: string | null;
  /** Live (unrevoked) session rows for this account. */
  liveSessions: number;
  lastSeenAt: string | null;
  telegram: boolean;
  premium: boolean;
}

/**
 * A temporary password a human can read out over the phone without a mistake.
 *
 * 16 characters from a 28-symbol alphabet (~77 bits): no 0/O/o, 1/l/I, 5/S/s.
 * Generated from `crypto.randomInt`, so it satisfies the password policy by
 * construction (length, and it cannot be on the blocked list). It is returned
 * to the administrator ONCE and never stored in plain text anywhere.
 */
export function generateTemporaryPassword(): string {
  // No 0/O/o, 1/l/I, 5/S/s: a password read out over the phone must not need a
  // second attempt because two glyphs look alike.
  const alphabet = "abcdefghijkmnpqrtuvwxyz2346789ACDEFGHJKLMNPQRTUVWXYZ";
  const groups = [0, 1, 2, 3].map(() =>
    Array.from({ length: 4 }, () => alphabet[randomInt(0, alphabet.length)]).join("")
  );
  return groups.join("-");
}

/**
 * The administrator who is looking at the panel.
 *
 * The screen has to name this account, because the re-authentication field asks
 * for ITS password — not the student's, not an old one. `passwordFormat` tells
 * the panel whether the stored hash is something this build can actually check:
 * an account whose password was written by a different scheme would otherwise
 * fail as "Incorrect password" no matter what the operator typed, and that is a
 * dead end, not an error message.
 */
export interface AdminViewerRow {
  id: number;
  name: string;
  email: string;
  hasPassword: boolean;
  passwordChangedAt: string | null;
  passwordFormat: PasswordHashFormat;
}

/** `none` = no password, `verifiable` = scrypt triplet, `legacy` = anything else. */
export type PasswordHashFormat = "none" | "verifiable" | "legacy";

/**
 * Classify a stored password hash WITHOUT trying to verify anything.
 *
 * `verifyPassword` returns false for a malformed hash exactly as it does for a
 * wrong password. Collapsing those two into one answer is what turns a
 * configuration problem into "your password is wrong" — the operator retries,
 * gets the same message, and has no way forward. This distinguishes them, so
 * the refusal can say what is actually wrong.
 */
export function passwordHashFormat(hash: string | null | undefined): PasswordHashFormat {
  if (!hash || typeof hash !== "string") return "none";
  const parts = hash.split(":");
  if (parts.length === 3 && parts[0] === "scrypt" && parts[1] && parts[2]) return "verifiable";
  return "legacy";
}
