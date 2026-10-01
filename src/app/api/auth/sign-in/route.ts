import { after, NextResponse } from "next/server";
import { db } from "@/db";
import { studentProfiles } from "@/db/schema";
import { sql } from "drizzle-orm";
import { sanitizeProfile, verifyPassword } from "@/lib/password";
import { checkSessionRecord, sessionCookieFromToken, signSessionToken } from "@/lib/auth";
import { ensureCoreSchema } from "@/lib/core/db";
import { sendLoginAlert } from "@/lib/telegram/service";
import { LIMITS, clientIp, rateLimitedResponse } from "@/lib/rate-limit";
import { checkSharedRateLimit } from "@/lib/rate-limit-shared";
import { clampString, readJsonBody } from "@/lib/request";

export const dynamic = "force-dynamic";

/**
 * Account sign-in: email + password (the pair created at sign up).
 *
 * On success the server issues an HttpOnly, SameSite, signed session cookie
 * (`sb_session`). Every privileged API verifies that cookie — the browser's
 * claim of "I am profile 7" is never trusted on its own.
 *
 * Hardening:
 *  - rate limited per IP *and* per email (credential brute-forcing)
 *  - identical 401 text for "no such account" and "wrong password"
 *    (no account enumeration)
 *  - failed attempts are logged with the IP for incident review
 */
export async function POST(req: Request) {
  try {
    const ip = clientIp(req);
    const ipLimit = await checkSharedRateLimit(`signin:ip:${ip}`, LIMITS.signIn);
    if (!ipLimit.ok) return rateLimitedResponse(ipLimit.retryAfterSec);

    const parsed = await readJsonBody<{ email?: unknown; password?: unknown }>(req);
    if (!parsed.ok) {
      return NextResponse.json({ error: parsed.error, code: parsed.code }, { status: parsed.status });
    }

    const email = clampString(parsed.body.email, 320).toLowerCase();
    const password = typeof parsed.body.password === "string" ? parsed.body.password : "";

    if (!email || !password) {
      return NextResponse.json(
        { error: "Email and password are required", code: "invalid_credentials" },
        { status: 400 }
      );
    }

    // Second, per-account bucket: an attacker rotating IPs still cannot
    // hammer a single account.
    const accountLimit = await checkSharedRateLimit(`signin:email:${email}`, LIMITS.signIn);
    if (!accountLimit.ok) return rateLimitedResponse(accountLimit.retryAfterSec);

    // The lookup below selects the whole profile row; repair additive core-schema
    // drift first (no-op once the database matches the schema).
    await ensureCoreSchema();

    const [profile] = await db
      .select()
      .from(studentProfiles)
      .where(sql`lower(${studentProfiles.email}) = ${email}`)
      .limit(1);

    if (!profile || !profile.passwordHash) {
      console.warn(`[auth] failed sign-in for unknown/passwordless account "${email}" from ${ip}`);
      return NextResponse.json(
        { error: "Incorrect email or password", code: "invalid_credentials" },
        { status: 401 }
      );
    }

    if (!verifyPassword(password, profile.passwordHash)) {
      console.warn(`[auth] failed sign-in for "${email}" from ${ip}`);
      return NextResponse.json(
        { error: "Incorrect email or password", code: "invalid_credentials" },
        { status: 401 }
      );
    }

    // Security alert to the owner's Telegram (if connected) — sent after the
    // response so a slow Telegram API never delays or fails the sign-in.
    after(() => sendLoginAlert(profile.id));

    // Sign the token explicitly so the server-side session record (audit
    // A23) can be created for exactly this token.
    const token = signSessionToken(profile);
    const response = NextResponse.json({
      profile: sanitizeProfile(profile),
      session: { profileId: profile.id, isAdmin: Boolean(profile.isAdmin) },
    });
    response.headers.set("Set-Cookie", sessionCookieFromToken(token, req));
    response.headers.set("Cache-Control", "no-store");
    // Fire-and-forget: if this insert races the first authenticated request,
    // the lazy adoption inside checkSessionRecord creates the same row.
    void checkSessionRecord(token, profile.id, {
      scope: "web",
      userAgent: req.headers.get("user-agent"),
      ip: clientIp(req),
    });
    return response;
  } catch (error) {
    console.error("POST /api/auth/sign-in error:", error);
    return NextResponse.json({ error: "Sign-in failed" }, { status: 500 });
  }
}
