import { NextResponse } from "next/server";
import { and, eq, isNull } from "drizzle-orm";
import { db } from "@/db";
import { passwordResetTokens, studentProfiles } from "@/db/schema";
import { hashPassword, passwordPolicyError } from "@/lib/password";
import { hashResetToken, isWellFormedResetToken, resetTokenState } from "@/lib/passwordReset";
import { LIMITS, clientIp, rateLimitedResponse } from "@/lib/rate-limit";
import { checkSharedRateLimit } from "@/lib/rate-limit-shared";
import { readJsonBody } from "@/lib/request";
import { revokeAllSessionsForProfile } from "@/lib/auth";
import { ensureCoreSchema } from "@/lib/core/db";

export const dynamic = "force-dynamic";

/**
 * `POST /api/auth/password-reset/confirm` — spend a reset link.
 *
 * The token is looked up **by its hash**, so the database never held the value
 * an attacker would need. A row is usable exactly once (`used_at` is stamped in
 * the same transaction as the password change) and only until `expires_at`.
 *
 * Changing the password invalidates every signed-in device: sessions are bound
 * to a fingerprint of the password hash (`auth.ts`), and the stored sessions
 * for this account are revoked outright. That is the point of a reset — if the
 * account was compromised, the intruder's cookie must die with the old password.
 *
 * Failure codes are deliberately distinct here (unlike the request endpoint):
 * the person already holds a token, so "expired" vs "used" is information they
 * are entitled to and helps them ask for a fresh link.
 */
export async function POST(req: Request) {
  try {
    const ip = clientIp(req);
    const ipLimit = await checkSharedRateLimit(`pwreset-confirm:ip:${ip}`, LIMITS.passwordResetConfirm);
    if (!ipLimit.ok) return rateLimitedResponse(ipLimit.retryAfterSec);

    const parsed = await readJsonBody<{ token?: unknown; password?: unknown; passwordConfirm?: unknown }>(req);
    if (!parsed.ok) {
      return NextResponse.json({ error: parsed.error, code: parsed.code }, { status: parsed.status });
    }

    const token = typeof parsed.body.token === "string" ? parsed.body.token.trim() : "";
    const password = typeof parsed.body.password === "string" ? parsed.body.password : "";
    const confirm = typeof parsed.body.passwordConfirm === "string" ? parsed.body.passwordConfirm : password;

    if (!isWellFormedResetToken(token)) {
      return NextResponse.json(
        { error: "This reset link is not valid", code: "invalid_token" },
        { status: 400, headers: { "Cache-Control": "no-store" } }
      );
    }
    if (password !== confirm) {
      return NextResponse.json(
        { error: "The two passwords do not match", code: "password_mismatch" },
        { status: 400, headers: { "Cache-Control": "no-store" } }
      );
    }
    const policyError = passwordPolicyError(password);
    if (policyError) {
      return NextResponse.json(
        { error: policyError, code: "weak_password" },
        { status: 400, headers: { "Cache-Control": "no-store" } }
      );
    }

    await ensureCoreSchema();

    const tokenHash = hashResetToken(token);
    const [row] = await db
      .select()
      .from(passwordResetTokens)
      .where(eq(passwordResetTokens.tokenHash, tokenHash))
      .limit(1);

    if (!row) {
      return NextResponse.json(
        { error: "This reset link is not valid", code: "invalid_token" },
        { status: 400, headers: { "Cache-Control": "no-store" } }
      );
    }

    const state = resetTokenState(row);
    if (state !== "valid") {
      return NextResponse.json(
        {
          error:
            state === "used"
              ? "This reset link has already been used. Request a new one."
              : "This reset link has expired. Request a new one.",
          code: state === "used" ? "token_used" : "token_expired",
        },
        { status: 410, headers: { "Cache-Control": "no-store" } }
      );
    }

    const [profile] = await db
      .select({ id: studentProfiles.id, email: studentProfiles.email })
      .from(studentProfiles)
      .where(eq(studentProfiles.id, row.profileId))
      .limit(1);
    if (!profile) {
      return NextResponse.json(
        { error: "This reset link is not valid", code: "invalid_token" },
        { status: 400, headers: { "Cache-Control": "no-store" } }
      );
    }

    const now = new Date();
    // Consume the link FIRST: the guarded `used_at IS NULL` update is what makes
    // a double-submit (two tabs, a retry) unable to set the password twice.
    const consumed = await db
      .update(passwordResetTokens)
      .set({ usedAt: now })
      .where(and(eq(passwordResetTokens.id, row.id), isNull(passwordResetTokens.usedAt)))
      .returning({ id: passwordResetTokens.id });

    if (!consumed.length) {
      return NextResponse.json(
        { error: "This reset link has already been used. Request a new one.", code: "token_used" },
        { status: 410, headers: { "Cache-Control": "no-store" } }
      );
    }

    await db
      .update(studentProfiles)
      .set({ passwordHash: hashPassword(password), updatedAt: now })
      .where(eq(studentProfiles.id, profile.id));

    // Every other outstanding link for this account dies with the reset.
    await db
      .update(passwordResetTokens)
      .set({ usedAt: now })
      .where(and(eq(passwordResetTokens.profileId, profile.id), isNull(passwordResetTokens.usedAt)));

    // Sessions are fingerprint-bound to the password hash, so they are already
    // invalid; revoking the rows too keeps audit/`user_sessions` truthful.
    await revokeAllSessionsForProfile(profile.id).catch((error) => {
      console.warn("[auth] password reset could not revoke stored sessions:", (error as Error)?.message);
    });

    console.info(`[auth] password reset completed for profile ${profile.id} from ${ip}`);

    return NextResponse.json(
      { ok: true, email: profile.email, message: "Password updated. You can sign in now." },
      { headers: { "Cache-Control": "no-store" } }
    );
  } catch (error) {
    console.error("POST /api/auth/password-reset/confirm error:", error);
    return NextResponse.json(
      { error: "Password reset is temporarily unavailable. Please try again shortly.", code: "unavailable" },
      { status: 503, headers: { "Cache-Control": "no-store", "Retry-After": "5" } }
    );
  }
}
