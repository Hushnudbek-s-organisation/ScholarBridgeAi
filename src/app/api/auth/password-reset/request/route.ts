import { NextResponse } from "next/server";
import { and, eq, isNull, sql } from "drizzle-orm";
import { db } from "@/db";
import { passwordResetTokens, studentProfiles } from "@/db/schema";
import { configuredAppUrl } from "@/lib/appUrl";
import { mailConfigured, missingMailEnv, sendMail } from "@/lib/mail";
import { buildResetEmail, createResetToken, isEmailShaped, resetLinkFor } from "@/lib/passwordReset";
import { LIMITS, clientIp, rateLimitedResponse } from "@/lib/rate-limit";
import { checkSharedRateLimit } from "@/lib/rate-limit-shared";
import { clampString, readJsonBody } from "@/lib/request";
import { ensureCoreSchema } from "@/lib/core/db";

export const dynamic = "force-dynamic";

/**
 * `POST /api/auth/password-reset/request` — "email me a reset link".
 *
 * The endpoint answers **exactly one sentence** for every well-formed address:
 * whether the account exists, whether it has a password, whether the mail
 * server accepted the message. Anything else turns this page into an account
 * enumeration oracle ("No such account" / "Email sent"), which is the classic
 * first step of a takeover attempt.
 *
 * What actually happens inside:
 *  - rate limited per IP and per address (a reset flood is both an abuse and a
 *    way to burn the mail quota);
 *  - every older unused link for the account is stamped used, so the newest
 *    link is the only live one;
 *  - a row is stored with the token's SHA-256 hash only — never the token;
 *  - the email is plain text with one link, 60-minute expiry;
 *  - when SMTP is not configured the request still answers 200 and the reason
 *    is logged for the admin, because a student cannot fix a deployment.
 */
export async function POST(req: Request) {
  try {
    const ip = clientIp(req);
    const ipLimit = await checkSharedRateLimit(`pwreset:ip:${ip}`, LIMITS.passwordReset);
    if (!ipLimit.ok) return rateLimitedResponse(ipLimit.retryAfterSec);

    const parsed = await readJsonBody<{ email?: unknown; locale?: unknown }>(req);
    if (!parsed.ok) {
      return NextResponse.json({ error: parsed.error, code: parsed.code }, { status: parsed.status });
    }

    const email = clampString(parsed.body.email, 320).trim().toLowerCase();
    const locale = clampString(parsed.body.locale, 8).trim().toLowerCase() || null;

    // The response sentence is fixed; only a malformed address gets a 400.
    const generic = {
      ok: true,
      message: "If an account exists for this address, a reset link is on its way.",
    } as const;

    if (!isEmailShaped(email)) {
      return NextResponse.json(
        { error: "Enter a valid email address", code: "invalid_email" },
        { status: 400, headers: { "Cache-Control": "no-store" } }
      );
    }

    const addressLimit = await checkSharedRateLimit(`pwreset:email:${email}`, LIMITS.passwordReset);
    if (!addressLimit.ok) return rateLimitedResponse(addressLimit.retryAfterSec);

    await ensureCoreSchema();

    const [profile] = await db
      .select({ id: studentProfiles.id, email: studentProfiles.email, passwordHash: studentProfiles.passwordHash })
      .from(studentProfiles)
      .where(sql`lower(${studentProfiles.email}) = ${email}`)
      .limit(1);

    // No account, or an account that never set a password (a Telegram-only
    // profile): nothing to reset, same answer. Still logged, so an admin can
    // tell "the email is wrong" from "mail is down".
    if (!profile || !profile.passwordHash) {
      console.info(`[auth] password reset requested for an address with no password account (${ip})`);
      return NextResponse.json(generic, { headers: { "Cache-Control": "no-store" } });
    }

    const origin = configuredAppUrl();
    if (!origin) {
      // Without a canonical URL the link would point at nothing. Answer the
      // same sentence — the student cannot repair APP_URL — and log loudly.
      console.error("[auth] password reset skipped: APP_URL is not configured, so no absolute reset link can be built");
      return NextResponse.json(generic, { headers: { "Cache-Control": "no-store" } });
    }

    // Bail out BEFORE touching the table. An unconfigured deployment cannot
    // deliver the link, so creating one would both leave a live token nobody
    // received and invalidate a link the student may still have in their inbox
    // from the last time mail did work.
    if (!mailConfigured()) {
      console.error(
        `[auth] password reset skipped: SMTP is not configured (missing ${missingMailEnv().join(", ") || "SMTP_HOST/MAIL_FROM"}) — no link was created`
      );
      return NextResponse.json(generic, { headers: { "Cache-Control": "no-store" } });
    }

    const now = new Date();
    const { token, tokenHash, expiresAt } = createResetToken(now);
    const link = resetLinkFor(origin, token);
    if (!link) {
      console.error("[auth] password reset skipped: APP_URL did not produce a usable origin");
      return NextResponse.json(generic, { headers: { "Cache-Control": "no-store" } });
    }

    // One live link per account: a leaked older link dies here.
    await db
      .update(passwordResetTokens)
      .set({ usedAt: now })
      .where(and(eq(passwordResetTokens.profileId, profile.id), isNull(passwordResetTokens.usedAt)));

    await db.insert(passwordResetTokens).values({
      profileId: profile.id,
      tokenHash,
      expiresAt,
      requestedIp: ip,
    });

    const { subject, text } = buildResetEmail({ link, appName: "ScholarBridge", locale });
    const sent = await sendMail({ to: profile.email, subject, text });
    if (!sent.ok) {
      // The link exists but never left the building; make it unusable rather
      // than leaving a live token nobody was told about.
      await db
        .update(passwordResetTokens)
        .set({ usedAt: new Date() })
        .where(eq(passwordResetTokens.tokenHash, tokenHash));
      console.error(`[auth] password reset email failed (${sent.reason}): ${sent.detail ?? "no detail"}`);
    }

    return NextResponse.json(generic, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    console.error("POST /api/auth/password-reset/request error:", error);
    // Never leak whether the failure was the database or the mail path.
    return NextResponse.json(
      { error: "Password reset is temporarily unavailable. Please try again shortly.", code: "unavailable" },
      { status: 503, headers: { "Cache-Control": "no-store", "Retry-After": "5" } }
    );
  }
}
