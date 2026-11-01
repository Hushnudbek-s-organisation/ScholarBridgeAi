import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { studentProfiles } from "@/db/schema";
import {
  checkSessionRecord,
  requireAdmin,
  revokeAllSessionsForProfile,
  sessionCookieFromToken,
  signSessionToken,
} from "@/lib/auth";
import { clientIp } from "@/lib/rate-limit";
import { auditPasswordAction, generateTemporaryPassword } from "@/lib/adminAccounts";
import { hashPassword, passwordPolicyProblem } from "@/lib/password";
import { checkSharedRateLimit } from "@/lib/rate-limit-shared";
import { LIMITS } from "@/lib/rate-limit";
import { readJsonBody } from "@/lib/request";

export const dynamic = "force-dynamic";

/**
 * `POST /api/admin/accounts/me/password` — the signed-in administrator replaces
 * THEIR OWN password, without producing the old one.
 *
 * Why this exists: every destructive action on the Accounts screen asks the
 * operator to re-enter their own password. That is the right guard — but an
 * operator who has forgotten it was stuck: the field rejected everything, the
 * only way out was the profile editor in another part of the app, and the panel
 * could not take them there in one click. "I cannot remember my own password"
 * is not a security event, it is Tuesday.
 *
 * This route has no target: it always acts on the caller's own account, so it
 * cannot be pointed at anybody else. It is the same operation the profile editor
 * performs (`PUT /api/profiles/:id` with a password and no current password), so
 * it grants no new power — the signed-in session IS the proof. What it adds is
 * the part that matters after a change: every OTHER device is signed out, and
 * this browser is handed a fresh session so the operator stays at work.
 *
 *   body { password, confirmPassword }  — or { generate: true }
 *
 * Rules:
 *  - admin session required; the target is always the caller;
 *  - the normal password policy applies (8+ characters, not a common one);
 *  - a typed password must be confirmed, so a typo cannot lock the operator out;
 *  - all sessions of the account are revoked, then a NEW session is issued;
 *  - `password_changed_at` is stamped, so the panel can show the new date;
 *  - the action is audited under the account's own email, with no credential.
 */
export async function POST(req: Request) {
  try {
    const access = await requireAdmin(req);
    if (!access.ok) {
      return NextResponse.json({ error: access.error, code: access.code }, { status: access.status });
    }

    const adminId = access.session.profile.id;
    const limit = await checkSharedRateLimit(`admin-self-password:${adminId}`, LIMITS.signIn);
    if (!limit.ok) {
      return NextResponse.json(
        { error: "Too many attempts. Try again in a few minutes.", code: "rate_limited" },
        { status: 429 }
      );
    }

    const parsed = await readJsonBody<{
      password?: unknown;
      confirmPassword?: unknown;
      generate?: unknown;
    }>(req);
    if (!parsed.ok) {
      return NextResponse.json({ error: parsed.error, code: parsed.code }, { status: parsed.status });
    }

    const wantsGenerated = parsed.body.generate === true;
    const typed = typeof parsed.body.password === "string" ? parsed.body.password : "";
    if (wantsGenerated && typed) {
      return NextResponse.json(
        { error: "Send either a password or generate, not both.", code: "ambiguous_request" },
        { status: 400 }
      );
    }

    const password = wantsGenerated ? generateTemporaryPassword() : typed;
    if (!password) {
      return NextResponse.json(
        { error: "Enter the new password.", code: "password_required" },
        { status: 400 }
      );
    }
    // The same policy as sign-up, the reset link and an admin-set password.
    const policyProblem = passwordPolicyProblem(password);
    if (policyProblem) {
      return NextResponse.json(
        { error: policyProblem.message, code: "weak_password", reason: policyProblem.problem },
        { status: 400 }
      );
    }
    if (!wantsGenerated) {
      const confirm = typeof parsed.body.confirmPassword === "string" ? parsed.body.confirmPassword : "";
      if (!confirm) {
        return NextResponse.json(
          { error: "Type the new password twice.", code: "confirm_required" },
          { status: 400 }
        );
      }
      if (confirm.trim() !== password.trim()) {
        return NextResponse.json(
          { error: "The two passwords do not match.", code: "confirm_mismatch" },
          { status: 400 }
        );
      }
    }

    const now = new Date();
    const newHash = hashPassword(password);
    const [updated] = await db
      .update(studentProfiles)
      .set({ passwordHash: newHash, passwordChangedAt: now, updatedAt: now })
      .where(eq(studentProfiles.id, adminId))
      .returning({ id: studentProfiles.id, email: studentProfiles.email });
    if (!updated) {
      return NextResponse.json({ error: "Account not found", code: "not_found" }, { status: 404 });
    }

    // Order matters: revoke FIRST (this also drops the positive auth cache), then
    // issue and adopt a token for the new fingerprint. Doing it the other way
    // round would revoke the session we just handed back.
    await revokeAllSessionsForProfile(adminId);
    const token = signSessionToken({ id: adminId, passwordHash: newHash });

    const response = NextResponse.json(
      {
        ok: true,
        account: { id: updated.id, email: updated.email },
        passwordChangedAt: now.toISOString(),
        otherSessionsRevoked: true,
        ...(wantsGenerated ? { temporaryPassword: password } : {}),
        note: "Type this password in the confirmation field to use the recovery actions.",
      },
      { headers: { "Cache-Control": "no-store" } }
    );
    response.headers.set("Set-Cookie", sessionCookieFromToken(token, req));
    // Create the row for the new token right away, so "signed-in devices" is
    // truthful immediately rather than after the next request.
    await checkSessionRecord(token, adminId, {
      scope: "web",
      userAgent: req.headers.get("user-agent"),
      ip: clientIp(req),
    });

    await auditPasswordAction({
      actorEmail: updated.email,
      targetId: adminId,
      action: "admin_self_password",
    });

    return response;
  } catch (error) {
    console.error("POST /api/admin/accounts/me/password error:", error);
    return NextResponse.json(
      { error: "Failed to change the password" },
      { status: 500, headers: { "Cache-Control": "no-store" } }
    );
  }
}
