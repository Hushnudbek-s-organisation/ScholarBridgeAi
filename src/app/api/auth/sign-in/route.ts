import { NextResponse } from "next/server";
import { db } from "@/db";
import { studentProfiles } from "@/db/schema";
import { sql } from "drizzle-orm";
import { sanitizeProfile, verifyPassword } from "@/lib/password";
import { sessionCookieHeader } from "@/lib/auth";
import {
  LIMITS,
  checkRateLimit,
  clientIp,
  rateLimitedResponse,
} from "@/lib/rate-limit";
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
    const ipLimit = checkRateLimit(`signin:ip:${ip}`, LIMITS.signIn);
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
    const accountLimit = checkRateLimit(`signin:email:${email}`, LIMITS.signIn);
    if (!accountLimit.ok) return rateLimitedResponse(accountLimit.retryAfterSec);

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

    const response = NextResponse.json({
      profile: sanitizeProfile(profile),
      session: { profileId: profile.id, isAdmin: Boolean(profile.isAdmin) },
    });
    response.headers.set("Set-Cookie", sessionCookieHeader(profile, req));
    response.headers.set("Cache-Control", "no-store");
    return response;
  } catch (error) {
    console.error("POST /api/auth/sign-in error:", error);
    return NextResponse.json({ error: "Sign-in failed" }, { status: 500 });
  }
}
