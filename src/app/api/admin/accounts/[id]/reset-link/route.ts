import { NextResponse } from "next/server";
import { and, eq, isNull, sql } from "drizzle-orm";
import { db } from "@/db";
import { auditLogs, passwordResetTokens, studentProfiles, telegramLinks, userSessions } from "@/db/schema";
import { invalidateAuthCacheForProfile, requireAdmin } from "@/lib/auth";
import { retireLiveResetTokens, verifyAdminReauth } from "@/lib/adminAccounts";
import { configuredAppUrl } from "@/lib/appUrl";
import { hashPassword } from "@/lib/password";
import { createResetToken, isEmailShaped, resetLinkFor } from "@/lib/passwordReset";
import { postgresId } from "@/lib/pagination";
import { readJsonBody } from "@/lib/request";
import { isTelegramPlaceholderEmail } from "@/lib/telegram/placeholder";

export const dynamic = "force-dynamic";

function failure(error: string, code: string, status: number) {
  return NextResponse.json({ error, code }, { status, headers: { "Cache-Control": "no-store" } });
}

/** The support operator verifies account ownership out of band before recovery. */
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const access = await requireAdmin(req);
    if (!access.ok) return failure(access.error, access.code, access.status);

    const targetId = postgresId((await params).id);
    if (targetId == null) return failure("Invalid account id", "invalid_id", 400);
    const parsed = await readJsonBody<{ adminPassword?: unknown; ownershipVerified?: unknown; newEmail?: unknown }>(req);
    if (!parsed.ok) return failure(parsed.error, parsed.code, parsed.status);

    const reauth = await verifyAdminReauth(access.session.profile.id, parsed.body.adminPassword);
    if (!reauth.ok) return failure(reauth.error, reauth.code, reauth.status);
    if (parsed.body.ownershipVerified !== true) return failure("Verify the account owner first.", "ownership_required", 400);
    const newEmail = typeof parsed.body.newEmail === "string" ? parsed.body.newEmail.trim().toLowerCase() : "";
    if (newEmail && (!isEmailShaped(newEmail) || isTelegramPlaceholderEmail(newEmail))) return failure("Enter a valid replacement email.", "invalid_email", 400);

    const origin = configuredAppUrl();
    if (!origin) return failure("APP_URL is not configured.", "app_url_missing", 503);
    const now = new Date();
    const { token, tokenHash, expiresAt } = createResetToken(now);
    const link = resetLinkFor(origin, token);
    if (!link) return failure("Could not build the reset link.", "link_failed", 500);
    const inaccessiblePassword = hashPassword(createResetToken(now).token);

    const result = await db.transaction(async (tx) => {
      const [target] = await tx.select({ id: studentProfiles.id, email: studentProfiles.email, isAdmin: studentProfiles.isAdmin })
        .from(studentProfiles).where(eq(studentProfiles.id, targetId)).for("update");
      if (!target) return { code: "not_found" } as const;
      if (target.isAdmin) return { code: "protected_account" } as const;
      if (!newEmail && isTelegramPlaceholderEmail(target.email)) return { code: "missing_email" } as const;
      if (newEmail && newEmail !== target.email.toLowerCase()) {
        const [existing] = await tx.select({ id: studentProfiles.id }).from(studentProfiles)
          .where(sql`lower(${studentProfiles.email}) = ${newEmail}`).limit(1);
        if (existing) return { code: "email_taken" } as const;
      }

      const email = newEmail || target.email;
      await tx.update(studentProfiles).set({
        email, passwordHash: inaccessiblePassword, passwordChangedAt: now, updatedAt: now,
      }).where(eq(studentProfiles.id, target.id));
      const retiredLinks = await retireLiveResetTokens(target.id, now, tx);
      const signedOut = await tx.update(userSessions).set({ revokedAt: now })
        .where(and(eq(userSessions.profileId, target.id), isNull(userSessions.revokedAt)))
        .returning({ id: userSessions.id });
      const disconnected = await tx.delete(telegramLinks).where(eq(telegramLinks.profileId, target.id))
        .returning({ id: telegramLinks.id });
      await tx.insert(passwordResetTokens).values({ profileId: target.id, tokenHash, expiresAt, requestedIp: "admin" });
      await tx.insert(auditLogs).values({
        entityType: "profile", entityId: target.id, fieldChanged: "password_reset_token",
        newValue: "Account owner verified manually, previous credentials revoked, one-time reset link issued",
        source: "admin_panel", actor: access.session.profile.email, verificationStatus: "verified",
      });
      return { code: "ok", account: { id: target.id, email }, retiredLinks, sessionsRevoked: signedOut.length,
        telegramDisconnected: disconnected.length > 0 } as const;
    });

    if (result.code === "not_found") return failure("Account not found.", result.code, 404);
    if (result.code === "protected_account") return failure("This recovery action is for student accounts.", result.code, 403);
    if (result.code === "missing_email") return failure("Enter the verified owner\x27s email address.", result.code, 400);
    if (result.code === "email_taken") return failure("This email is already in use.", result.code, 409);
    invalidateAuthCacheForProfile(targetId);

    return NextResponse.json({
      ok: true, account: result.account, link, expiresAt: expiresAt.toISOString(),
      ttlMinutes: Math.round((expiresAt.getTime() - now.getTime()) / 60_000),
      retiredLinks: result.retiredLinks, sessionsRevoked: result.sessionsRevoked,
      telegramDisconnected: result.telegramDisconnected, delivered: false,
    }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    if ((error as { code?: string })?.code === "23505" || (error as { cause?: { code?: string } })?.cause?.code === "23505") {
      return failure("This email is already in use.", "email_taken", 409);
    }
    console.error("Admin recovery failed:", (error as Error)?.name);
    return failure("The recovery link could not be created.", "unavailable", 503);
  }
}
