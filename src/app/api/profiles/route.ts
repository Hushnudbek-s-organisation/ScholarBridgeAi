import { NextResponse } from "next/server";
import { sql } from "drizzle-orm";
import { db } from "@/db";
import { studentProfiles } from "@/db/schema";
import { seedDatabase } from "@/db/seed";
import { hashPassword, passwordPolicyError, sanitizeProfile } from "@/lib/password";
import { awardPoints } from "@/lib/gamification";
import { ensureReferralCode, applyReferralCodeToProfile } from "@/lib/referrals";
import { recordVisit } from "@/lib/visits";
import { authenticate, sessionCookieHeader } from "@/lib/auth";
import { LIMITS, checkRateLimit, clientIp, rateLimitedResponse } from "@/lib/rate-limit";
import { clampString, readJsonBody } from "@/lib/request";

/** Detect a schema-mismatch error (new columns missing in the database). */
function isMissingColumnsError(err: unknown): boolean {
  const msg = String(err instanceof Error ? err.message : err);
  return (
    msg.includes("does not exist") ||
    msg.includes("column") ||
    msg.includes("referral_code") ||
    msg.includes("onboarding_step")
  );
}

/**
 * GET /api/profiles
 *
 * Privacy: this used to return EVERY student profile (names, emails, GPAs,
 * budgets) to any anonymous caller. It is now session-scoped:
 *  - signed-in student → only their own profile
 *  - signed-in admin   → all profiles (user administration)
 *  - anonymous         → 401
 */
export async function GET(req: Request) {
  try {
    const auth = await authenticate(req);
    if (!auth.ok) {
      return NextResponse.json(
        { error: auth.error, code: auth.code },
        { status: auth.status, headers: { "Cache-Control": "no-store" } }
      );
    }

    await seedDatabase();

    if (auth.session.isAdmin) {
      const profiles = await db.select().from(studentProfiles);
      return NextResponse.json({ profiles: profiles.map((p) => sanitizeProfile(p)) });
    }

    return NextResponse.json({ profiles: [sanitizeProfile(auth.session.profile)] });
  } catch (error) {
    console.error("GET /api/profiles error:", error);
    if (isMissingColumnsError(error)) {
      return NextResponse.json(
        {
          error:
            "Database schema is out of date. The application is configured to NEVER modify the database automatically. Please review the app schema vs your Supabase schema and align them manually.",
        },
        { status: 500 }
      );
    }
    return NextResponse.json({ error: "Failed to fetch student profiles" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const ip = clientIp(req);
    const limit = checkRateLimit(`signup:ip:${ip}`, LIMITS.signUp);
    if (!limit.ok) return rateLimitedResponse(limit.retryAfterSec);

    const parsed = await readJsonBody<Record<string, any>>(req, 64 * 1024);
    if (!parsed.ok) {
      return NextResponse.json({ error: parsed.error, code: parsed.code }, { status: parsed.status });
    }
    const body = parsed.body;

    // Sign up: one account per email (case-insensitive). If the email already
    // has an account, the visitor must sign in instead of creating a second
    // profile — otherwise email+password sign-in would be ambiguous.
    const emailInput = clampString(body.email, 320).toLowerCase();
    if (emailInput && !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(emailInput)) {
      return NextResponse.json(
        { error: "Please provide a valid email address", code: "invalid_email" },
        { status: 400 }
      );
    }
    if (emailInput) {
      const [existing] = await db
        .select({ id: studentProfiles.id })
        .from(studentProfiles)
        .where(sql`lower(${studentProfiles.email}) = ${emailInput.toLowerCase()}`)
        .limit(1);
      if (existing) {
        return NextResponse.json(
          {
            error:
              "An account with this email already exists. Close this window and use Sign in instead.",
          },
          { status: 409 }
        );
      }
    }

    // Parse preferredCountries if passed as array
    let countriesStr = "[\"United States\", \"United Kingdom\", \"Canada\"]";
    if (body.preferredCountries) {
      if (typeof body.preferredCountries === "string") {
        countriesStr = body.preferredCountries;
      } else {
        countriesStr = JSON.stringify(body.preferredCountries);
      }
    }

    // NEVER fabricate academic data (spec §19): empty/missing test scores
    // are stored as NULL, not fake defaults (7.0/95/1350/315/3.5).
    const numOrNull = (v: unknown): number | null => {
      if (v === null || v === undefined || v === "") return null;
      const n = Number(v);
      return Number.isFinite(n) ? n : null;
    };
    // Test scores must be positive — a 0 (or negative) is not a real score.
    const scoreOrNull = (v: unknown): number | null => {
      const n = numOrNull(v);
      return n !== null && n > 0 ? n : null;
    };
    // Password policy: 8+ characters (a short password is the single easiest
    // way into an account). Short/missing → NULL, i.e. no password sign-in
    // yet; it can be set later from Edit Profile.
    const plainPassword = typeof body.password === "string" ? body.password.trim() : "";
    if (plainPassword) {
      const policyError = passwordPolicyError(plainPassword);
      if (policyError) {
        return NextResponse.json(
          { error: policyError, code: "weak_password" },
          { status: 400 }
        );
      }
    }

    const [newProfile] = await db.insert(studentProfiles).values({
      name: clampString(body.name, 120) || "New Student Profile",
      email: emailInput || "student@scholarbridge.edu",
      degreeLevel: body.degreeLevel || "Master",
      targetMajor: body.targetMajor || "Computer Science",
      gpa: numOrNull(body.gpa) ?? 3.5, // schema default; real GPA entered later
      gpaScale: numOrNull(body.gpaScale) ?? 4.0,
      ieltsScore: scoreOrNull(body.ieltsScore),
      toeflScore: scoreOrNull(body.toeflScore),
      satScore: scoreOrNull(body.satScore),
      greScore: scoreOrNull(body.greScore),
      budgetAnnualUsd: numOrNull(body.budgetAnnualUsd) ?? 25000,
      preferredCountries: countriesStr,
      needScholarship: body.needScholarship ?? true,
      extracurriculars: body.extracurriculars || "",
      workExperienceYears: numOrNull(body.workExperienceYears) ?? 0,
      researchPublications: numOrNull(body.researchPublications) ?? 0,
      preferredLocale: body.preferredLocale || "en",
      // Sign-up password: stored ONLY as a scrypt hash (never plain text).
      passwordHash: plainPassword ? hashPassword(plainPassword) : null,
    }).returning();

    // Analytics: attribute the signup to the anonymous visitor cookie so the
    // admin dashboard can show the visitor → signup funnel. Never throws.
    try {
      await recordVisit({
        eventType: "signup",
        path: "/",
        profileId: newProfile.id,
        locale: newProfile.preferredLocale,
        headers: req.headers,
      });
    } catch (err) {
      console.warn("Failed to record signup analytics:", err);
    }

    // Welcome points for the new student (idempotent per profile).
    try {
      await awardPoints(newProfile.id, 20, "profile_created", newProfile.id);
    } catch (err) {
      console.error("Failed to award welcome points:", err);
    }

    // Referral system: generate the new profile's own unique code, and if a
    // ?ref= code was stored (from the signup link) apply it to referred_by.
    try {
      await ensureReferralCode(newProfile.id);
      if (body.referralCode) {
        const applied = await applyReferralCodeToProfile(newProfile.id, body.referralCode);
        if (applied.error === "SELF") {
          console.warn("Self-referral blocked for profile", newProfile.id);
        }
      }
    } catch (err) {
      console.error("Failed to set up referral for new profile:", err);
    }

    // The new account is immediately the caller's session — the browser gets
    // a signed HttpOnly cookie, not just an id to keep in localStorage.
    const response = NextResponse.json({ profile: sanitizeProfile(newProfile) });
    response.headers.set("Set-Cookie", sessionCookieHeader(newProfile, req));
    response.headers.set("Cache-Control", "no-store");
    return response;
  } catch (error) {
    console.error("POST /api/profiles error:", error);
    // Unique-violation on email (race, or the legacy default email reused).
    if ((error as { code?: string })?.code === "23505") {
      return NextResponse.json(
        {
          error:
            "An account with this email already exists. Close this window and use Sign in instead.",
        },
        { status: 409 }
      );
    }
    if (isMissingColumnsError(error)) {
      return NextResponse.json(
        {
          error:
            "Database schema is out of date. The application is configured to NEVER modify the database automatically. Please review the app schema vs your Supabase schema and align them manually.",
        },
        { status: 500 }
      );
    }
    return NextResponse.json({ error: "Failed to create student profile" }, { status: 500 });
  }
}
