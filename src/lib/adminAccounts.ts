/**
 * Admin-assisted account recovery — the rules, in one place.
 *
 * A student who cannot sign in has exactly two legitimate remedies, and both are
 * here because the ones that "recover" a password are not real:
 *
 *   1. **A one-time reset link the admin can hand over.** No email needed. This
 *      is the important one: with SMTP blocked on the hosting plan (Render free
 *      blocks outbound 25/465/587) the emailed flow cannot deliver anything, so
 *      the admin generates the same tokenised link and sends it through
 *      Telegram/WhatsApp. The student sets their own password — the admin never
 *      learns it.
 *   2. **A temporary password set by the admin** for someone who cannot open a
 *      link at all. The admin chooses it (or asks for one to be generated) and
 *      hands it over; the account's sessions are revoked, so the temporary
 *      password is the only way in until the student changes it.
 *
 * What no code can do — and this module deliberately cannot — is **show an
 * existing password**. `password_hash` is scrypt with a per-account salt
 * (`scrypt:<salt>:<hash>`); it is one-way by construction. "Give the admin the
 * right to see passwords" is not a permission that can be granted, it is
 * arithmetic that cannot be reversed. What IS visible is the account's state:
 * whether a password exists, and when it was last set.
 *
 * Security rules enforced here and by both routes:
 *   - the acting admin re-enters their OWN password (a stolen admin cookie
 *     alone cannot reset anybody);
 *   - both actions are rate limited and written to `audit_logs`;
 *   - the target's open sessions are revoked, so a reset cannot leave an old
 *     device signed in;
 *   - the platform owner is treated like any account, but the admin cannot
 *     reset themselves through this path by accident (they use Edit Profile).
 */
import { and, desc, eq, ilike, isNull, or, sql } from "drizzle-orm";
import { db } from "@/db";
import { auditLogs, passwordResetTokens, studentProfiles, telegramLinks, userSessions } from "@/db/schema";
import { verifyPassword } from "@/lib/password";
import { checkSharedRateLimit } from "@/lib/rate-limit-shared";
import { LIMITS } from "@/lib/rate-limit";
import { ADMIN_ACCOUNT_PAGE, type AdminAccountRow } from "@/lib/adminAccountRules";

// Re-exported so route handlers import one module; the rules themselves live in
// a DB-free file (`adminAccountRules.ts`) so the gate can test them offline.
export { ADMIN_ACCOUNT_PAGE, generateTemporaryPassword } from "@/lib/adminAccountRules";
export type { AdminAccountRow } from "@/lib/adminAccountRules";

/** Columns read for one page of accounts. `passwordHash` is read, then dropped. */
const ACCOUNT_COLUMNS = {
  id: studentProfiles.id,
  name: studentProfiles.name,
  email: studentProfiles.email,
  isAdmin: studentProfiles.isAdmin,
  passwordHash: studentProfiles.passwordHash,
  passwordChangedAt: studentProfiles.passwordChangedAt,
  createdAt: studentProfiles.createdAt,
  isPremium: studentProfiles.isPremium,
  premiumUntil: studentProfiles.premiumUntil,
} as const;

/**
 * Turn raw rows into list rows: two grouped lookups for the whole set (sessions,
 * Telegram links), and the hash reduced to a boolean before it can escape.
 */
interface AccountQueryRow {
  id: number;
  name: string;
  email: string;
  isAdmin: boolean;
  passwordHash: string | null;
  passwordChangedAt: Date | null;
  createdAt: Date | null;
  isPremium: boolean;
  premiumUntil: Date | null;
}

async function shapeAccounts(rows: AccountQueryRow[]): Promise<AdminAccountRow[]> {
  if (!rows.length) return [];

  const sessions = await db
    .select({
      profileId: userSessions.profileId,
      live: sql<number>`count(*)::int`,
      lastSeenAt: sql<string | null>`max(${userSessions.lastSeenAt})`,
    })
    .from(userSessions)
    .where(isNull(userSessions.revokedAt))
    .groupBy(userSessions.profileId);
  const sessionsById = new Map(sessions.map((row) => [row.profileId, row]));

  const links = await db
    .select({ profileId: telegramLinks.profileId, blocked: telegramLinks.blocked })
    .from(telegramLinks);
  const telegramById = new Map(links.map((row) => [row.profileId, !row.blocked]));

  const now = Date.now();
  return rows.map((row) => {
    const session = sessionsById.get(row.id);
    return {
      id: row.id,
      name: row.name,
      email: row.email,
      isAdmin: row.isAdmin,
      // `passwordHash` is only ever read as a boolean here. The value is
      // discarded before the object leaves this function.
      hasPassword: Boolean(row.passwordHash),
      passwordChangedAt: row.passwordChangedAt ? new Date(row.passwordChangedAt).toISOString() : null,
      createdAt: row.createdAt ? new Date(row.createdAt).toISOString() : null,
      liveSessions: Number(session?.live ?? 0),
      lastSeenAt: session?.lastSeenAt ? new Date(session.lastSeenAt).toISOString() : null,
      telegram: telegramById.get(row.id) ?? false,
      premium: Boolean(row.isPremium) && (!row.premiumUntil || new Date(row.premiumUntil).getTime() > now),
    };
  });
}

/**
 * The account list. Search matches name or email, case-insensitively.
 *
 * The password hash never enters the returned object: the query selects columns
 * explicitly, so a future `select()` refactor cannot start leaking it.
 */
export async function listAdminAccounts(input: { q?: string; limit?: number } = {}): Promise<AdminAccountRow[]> {
  const limit = Math.min(Math.max(Number(input.limit) || ADMIN_ACCOUNT_PAGE, 1), 100);
  const needle = (input.q ?? "").trim();
  const rows = await db
    .select(ACCOUNT_COLUMNS)
    .from(studentProfiles)
    .where(needle ? or(ilike(studentProfiles.email, `%${needle}%`), ilike(studentProfiles.name, `%${needle}%`)) : undefined)
    .orderBy(desc(studentProfiles.id))
    .limit(limit);
  return shapeAccounts(rows);
}

/** One account, shaped exactly like a list row (no hash). */
export async function adminAccountById(id: number): Promise<AdminAccountRow | null> {
  if (!Number.isSafeInteger(id) || id <= 0) return null;
  const rows = await db.select(ACCOUNT_COLUMNS).from(studentProfiles).where(eq(studentProfiles.id, id)).limit(1);
  const [row] = await shapeAccounts(rows);
  return row ?? null;
}

/**
 * Where the tokenised link for an account would point.
 *
 * Kept next to the reset module on purpose: the administrator gets the SAME
 * `/reset-password?token=…` a student would receive by email, so there is one
 * reset implementation, not two.
 */
export async function retireLiveResetTokens(profileId: number, now: Date = new Date()): Promise<number> {
  const retired = await db
    .update(passwordResetTokens)
    .set({ usedAt: now })
    .where(and(eq(passwordResetTokens.profileId, profileId), isNull(passwordResetTokens.usedAt)))
    .returning({ id: passwordResetTokens.id });
  return retired.length;
}

/** Re-authenticate the acting admin. Returns null when the password is wrong. */
export async function verifyAdminReauth(
  adminId: number,
  password: unknown
): Promise<{ ok: true } | { ok: false; status: number; code: string; error: string }> {
  const limit = await checkSharedRateLimit(`admin-account-pw:${adminId}`, LIMITS.signIn);
  if (!limit.ok) {
    return {
      ok: false,
      status: 429,
      code: "rate_limited",
      error: "Too many password attempts. Try again in a few minutes.",
    };
  }
  if (typeof password !== "string" || !password) {
    return { ok: false, status: 400, code: "password_required", error: "Enter your own password to confirm." };
  }
  const [row] = await db
    .select({ hash: studentProfiles.passwordHash })
    .from(studentProfiles)
    .where(eq(studentProfiles.id, adminId))
    .limit(1);
  if (!row?.hash) {
    return {
      ok: false,
      status: 400,
      code: "password_not_set",
      error: "Your admin account has no password. Set one in Edit Profile first.",
    };
  }
  if (!verifyPassword(password, row.hash)) {
    return { ok: false, status: 403, code: "invalid_password", error: "Incorrect password." };
  }
  return { ok: true };
}

/**
 * Record an admin password action.
 *
 * `newValue` is a fixed sentence, never the password and never a hash: the audit
 * log is shown in the admin UI and exported, so it must not become a credential
 * store. `actor` is the admin's email, so the entry names a person.
 */
export async function auditPasswordAction(input: {
  actorEmail: string;
  targetId: number;
  action: "admin_set_password" | "admin_reset_link";
}): Promise<void> {
  try {
    await db.insert(auditLogs).values({
      entityType: "profile",
      entityId: input.targetId,
      fieldChanged: input.action === "admin_set_password" ? "password_hash" : "password_reset_token",
      oldValue: null,
      newValue:
        input.action === "admin_set_password"
          ? "replaced with a temporary password by an administrator"
          : "one-time reset link issued by an administrator",
      source: "admin_panel",
      actor: input.actorEmail,
      verificationStatus: "verified",
    });
  } catch (error) {
    // An audit failure must not undo a completed reset — but it is loud.
    console.error("[admin] could not write the password audit entry:", (error as Error)?.message);
  }
}
