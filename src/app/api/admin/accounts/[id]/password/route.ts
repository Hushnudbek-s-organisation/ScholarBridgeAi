import { NextResponse } from "next/server";
import { and, eq, isNull } from "drizzle-orm";
import { db } from "@/db";
import { auditLogs, studentProfiles, userSessions } from "@/db/schema";
import { invalidateAuthCacheForProfile, requireAdmin } from "@/lib/auth";
import { generateTemporaryPassword, verifyAdminReauth } from "@/lib/adminAccounts";
import { hashPassword, passwordPolicyProblem } from "@/lib/password";
import { clampString, readJsonBody } from "@/lib/request";
import { retireLiveResetTokens } from "@/lib/adminAccounts";

export const dynamic = "force-dynamic";

/**
 * `POST /api/admin/accounts/:id/password` — an administrator replaces an
 * account's password.
 *
 * This does NOT recover the old one. `password_hash` is scrypt and one-way, so
 * the only possible operation is *replace*, and that is what this does:
 *
 *   body { adminPassword, password? , generate? }
 *
 *   - `adminPassword` re-authenticates the ACTING ADMIN. A stolen admin cookie
 *     alone cannot take over an account — the person at the keyboard must know
 *     their own password.
 *   - `password` is the new password (policy-checked, hashed with a fresh salt).
 *   - `generate: true` asks the server for a temporary one instead; it is
 *     returned ONCE in this response and never stored in plain text.
 *
 * Afterwards: every open session for the target is revoked, any outstanding
 * reset link is retired (the password just changed — an old link must not
 * outlive it), `password_changed_at` is stamped, and an audit row names the
 * administrator. The response contains no hash and no existing password.
 */
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const access = await requireAdmin(req);
    if (!access.ok) {
      return NextResponse.json({ error: access.error, code: access.code }, { status: access.status });
    }

    const { id } = await params;
    const targetId = Number.parseInt(id, 10);
    if (!Number.isInteger(targetId) || targetId <= 0) {
      return NextResponse.json({ error: "Invalid account id", code: "invalid_id" }, { status: 400 });
    }
    if (targetId === access.session.profile.id) {
      // An admin changing their own password uses Edit Profile, which rotates
      // their cookie correctly. Refusing here keeps that one path authoritative.
      return NextResponse.json(
        { error: "Change your own password from Edit Profile.", code: "self_target" },
        { status: 400 }
      );
    }

    const parsed = await readJsonBody<{
      adminPassword?: unknown;
      password?: unknown;
      generate?: unknown;
      ownershipVerified?: unknown;
    }>(req);
    if (!parsed.ok) {
      return NextResponse.json({ error: parsed.error, code: parsed.code }, { status: parsed.status });
    }

    const reauth = await verifyAdminReauth(access.session.profile.id, parsed.body.adminPassword);
    if (!reauth.ok) {
      return NextResponse.json({ error: reauth.error, code: reauth.code }, { status: reauth.status });
    }

    if (parsed.body.ownershipVerified !== true) {
      return NextResponse.json({ error: "Verify the account owner first.", code: "ownership_required" }, { status: 400 });
    }

    // Either the server generates one, or the admin typed one. Never both.
    const wantsGenerated = parsed.body.generate === true;
    const typed = clampString(parsed.body.password, 200);
    if (!wantsGenerated && !typed) {
      return NextResponse.json(
        { error: "Enter a new password, or ask the server to generate one.", code: "password_required" },
        { status: 400 }
      );
    }
    if (wantsGenerated && typed) {
      return NextResponse.json(
        { error: "Send either a password or a generate request, not both.", code: "ambiguous_request" },
        { status: 400 }
      );
    }

    const newPassword = wantsGenerated ? generateTemporaryPassword() : typed;
    const policyProblem = passwordPolicyProblem(newPassword);
    if (policyProblem) {
      return NextResponse.json(
        { error: policyProblem.message, code: "weak_password", reason: policyProblem.problem },
        { status: 400 }
      );
    }

    const now = new Date();
    const replacementHash = hashPassword(newPassword);
    const result = await db.transaction(async (tx) => {
      const [target] = await tx
        .select({ id: studentProfiles.id, email: studentProfiles.email, isAdmin: studentProfiles.isAdmin })
        .from(studentProfiles)
        .where(eq(studentProfiles.id, targetId)).for("update");
      if (!target) return { code: "not_found" } as const;
      if (target.isAdmin) return { code: "protected_account" } as const;

      await tx.update(studentProfiles).set({ passwordHash: replacementHash, passwordChangedAt: now, updatedAt: now })
        .where(eq(studentProfiles.id, target.id));
      await tx.update(userSessions).set({ revokedAt: now })
        .where(and(eq(userSessions.profileId, target.id), isNull(userSessions.revokedAt)));
      const retiredLinks = await retireLiveResetTokens(target.id, now, tx);
      await tx.insert(auditLogs).values({
        entityType: "profile", entityId: target.id, fieldChanged: "password_hash",
        newValue: "Account owner verified manually, temporary password issued",
        source: "admin_panel", actor: access.session.profile.email, verificationStatus: "verified",
      });
      return { code: "ok", target, retiredLinks } as const;
    });
    if (result.code === "not_found") {
      return NextResponse.json({ error: "Account not found.", code: result.code }, { status: 404 });
    }
    if (result.code === "protected_account") {
      return NextResponse.json({ error: "This recovery action is for student accounts.", code: result.code }, { status: 403 });
    }
    const { target, retiredLinks } = result;
    invalidateAuthCacheForProfile(target.id);

    return NextResponse.json(
      {
        ok: true,
        account: { id: target.id, email: target.email },
        // Shown exactly once, to the administrator who asked for it. Never
        // stored, never logged, and absent unless the server generated it.
        temporaryPassword: wantsGenerated ? newPassword : undefined,
        passwordChangedAt: now.toISOString(),
        sessionsRevoked: true,
        retiredLinks,
        note:
          "The old password cannot be recovered — it only ever existed as a one-way hash. " +
          "Give the student this password and ask them to change it in Edit Profile.",
      },
      { headers: { "Cache-Control": "no-store" } }
    );
  } catch (error) {
    console.error("POST /api/admin/accounts/[id]/password error:", error);
    return NextResponse.json(
      { error: "The password could not be changed. Nothing was modified." },
      { status: 500, headers: { "Cache-Control": "no-store" } }
    );
  }
}
