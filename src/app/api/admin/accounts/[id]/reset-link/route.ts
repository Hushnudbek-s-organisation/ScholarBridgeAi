import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { passwordResetTokens, studentProfiles } from "@/db/schema";
import { requireAdmin } from "@/lib/auth";
import { auditPasswordAction, retireLiveResetTokens, verifyAdminReauth } from "@/lib/adminAccounts";
import { configuredAppUrl } from "@/lib/appUrl";
import { createResetToken, resetLinkFor } from "@/lib/passwordReset";
import { readJsonBody } from "@/lib/request";

export const dynamic = "force-dynamic";

/**
 * `POST /api/admin/accounts/:id/reset-link` — issue a one-time reset link the
 * administrator hands to the student themselves.
 *
 * Why this exists: the emailed flow is the right default, but it depends on the
 * deployment being able to send mail. On a hosting plan that blocks outbound
 * SMTP (Render's free tier blocks 25/465/587) the email never leaves, and the
 * student is locked out no matter how correct the code is. This endpoint
 * produces the SAME token — same table, same 60-minute lifetime, same
 * single-use rule, same `/reset-password?token=…` page — and returns the URL
 * once so the administrator can send it over Telegram, WhatsApp or in person.
 *
 * The administrator never learns the new password: the student chooses it.
 *
 *   body { adminPassword }
 *
 * Rules:
 *  - the acting admin re-enters their own password (stolen cookie ≠ takeover);
 *  - any older live link for the account is retired, so only this one works;
 *  - nothing is emailed, so this works with SMTP completely unconfigured;
 *  - the action is audited (never the token itself).
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

    const parsed = await readJsonBody<{ adminPassword?: unknown }>(req);
    if (!parsed.ok) {
      return NextResponse.json({ error: parsed.error, code: parsed.code }, { status: parsed.status });
    }

    const reauth = await verifyAdminReauth(access.session.profile.id, parsed.body.adminPassword);
    if (!reauth.ok) {
      return NextResponse.json({ error: reauth.error, code: reauth.code }, { status: reauth.status });
    }

    const [target] = await db
      .select({ id: studentProfiles.id, email: studentProfiles.email })
      .from(studentProfiles)
      .where(eq(studentProfiles.id, targetId))
      .limit(1);
    if (!target) {
      return NextResponse.json({ error: "Account not found", code: "not_found" }, { status: 404 });
    }

    const origin = configuredAppUrl();
    if (!origin) {
      return NextResponse.json(
        {
          error: "APP_URL is not configured, so an absolute reset link cannot be built.",
          code: "app_url_missing",
        },
        { status: 503 }
      );
    }

    const now = new Date();
    const { token, tokenHash, expiresAt } = createResetToken(now);
    const link = resetLinkFor(origin, token);
    if (!link) {
      return NextResponse.json({ error: "Could not build the reset link.", code: "link_failed" }, { status: 500 });
    }

    // Only the newest link works — a link handed out yesterday dies here.
    const retired = await retireLiveResetTokens(target.id, now);
    await db.insert(passwordResetTokens).values({
      profileId: target.id,
      tokenHash,
      expiresAt,
      requestedIp: "admin",
    });

    await auditPasswordAction({
      actorEmail: access.session.profile.email,
      targetId: target.id,
      action: "admin_reset_link",
    });

    console.info(
      `[admin] ${access.session.profile.email} issued a reset link for profile ${target.id} ` +
        `(${retired} older link(s) retired; delivered by hand, no email sent)`
    );

    return NextResponse.json(
      {
        ok: true,
        account: { id: target.id, email: target.email },
        // Returned once. The database holds only the SHA-256 of the token.
        link,
        expiresAt: expiresAt.toISOString(),
        ttlMinutes: Math.round((expiresAt.getTime() - now.getTime()) / 60_000),
        retiredLinks: retired,
        // Stated explicitly: no email was sent. The administrator delivers the
        // link, which is the whole point of this endpoint.
        delivered: false,
        deliveryNote: "Send this link to the student yourself (Telegram, WhatsApp, in person). It is not emailed.",
      },
      { headers: { "Cache-Control": "no-store" } }
    );
  } catch (error) {
    console.error("POST /api/admin/accounts/[id]/reset-link error:", error);
    return NextResponse.json(
      { error: "The reset link could not be created." },
      { status: 500, headers: { "Cache-Control": "no-store" } }
    );
  }
}
