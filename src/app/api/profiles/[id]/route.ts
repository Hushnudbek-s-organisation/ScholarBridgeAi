import { NextResponse } from "next/server";
import { db } from "@/db";
import { studentProfiles } from "@/db/schema";
import { eq, sql } from "drizzle-orm";
import { hashPassword, passwordPolicyError, sanitizeProfile } from "@/lib/password";
import { completeReferralIfDue, activateReferralReward } from "@/lib/referrals";
import { requireAdmin, requireProfileAccess, sessionCookieHeader } from "@/lib/auth";
import { clampString, readJsonBody } from "@/lib/request";

/**
 * Authorization: identity comes from the signed session cookie — never from an
 * id in the body or the URL. The owner may read/update their own profile; a
 * live admin (is_admin) may read/update/delete any profile.
 */
export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const profileId = parseInt(id, 10);

    const access = await requireProfileAccess(req, profileId);
    if (!access.ok) {
      return NextResponse.json(
        { error: access.error, code: access.code },
        { status: access.status, headers: { "Cache-Control": "no-store" } }
      );
    }

    const [profile] = await db.select().from(studentProfiles).where(eq(studentProfiles.id, profileId));

    if (!profile) {
      return NextResponse.json({ error: "Profile not found" }, { status: 404 });
    }

    // Never send the password hash to the browser.
    return NextResponse.json({ profile: sanitizeProfile(profile) });
  } catch (error) {
    console.error("GET /api/profiles/[id] error:", error);
    return NextResponse.json({ error: "Failed to fetch profile" }, { status: 500 });
  }
}


/**
 * Field coercers for the "complete profile" inputs.
 *
 * `undefined` means "not sent" → the column is left untouched. An empty
 * string/array means "cleared" → NULL. Values are never invented.
 */
function numField(value: unknown): number | null | undefined {
  if (value === undefined) return undefined;
  if (value === null || value === "") return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : undefined;
}

function boolField(value: unknown): boolean | null | undefined {
  if (value === undefined) return undefined;
  if (value === null) return null;
  return Boolean(value);
}

function textField(value: unknown, max: number): string | null | undefined {
  if (value === undefined) return undefined;
  const text = clampString(value, max);
  return text.length ? text : null;
}

/** Accept an array (or a JSON/comma string) and store it as a JSON array. */
function jsonListField(value: unknown): string | null | undefined {
  if (value === undefined) return undefined;
  if (value === null) return null;
  const items = Array.isArray(value)
    ? value
    : String(value)
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);
  const clean = items
    .map((item) => clampString(typeof item === "string" ? item : JSON.stringify(item), 300))
    .filter(Boolean)
    .slice(0, 60);
  return clean.length ? JSON.stringify(clean) : null;
}

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const profileId = parseInt(id, 10);

    // Authorization: session owner or live admin. `requesterId` in the body is
    // ignored — it was forgeable.
    const access = await requireProfileAccess(req, profileId);
    if (!access.ok) {
      return NextResponse.json(
        { error: access.error, code: access.code },
        { status: access.status }
      );
    }

    const parsed = await readJsonBody<Record<string, any>>(req);
    if (!parsed.ok) {
      return NextResponse.json({ error: parsed.error, code: parsed.code }, { status: parsed.status });
    }
    const body = parsed.body;

    let countriesStr = body.preferredCountries;
    if (Array.isArray(body.preferredCountries)) {
      countriesStr = JSON.stringify(body.preferredCountries);
    }

    // Email change: it must not collide with another account's email
    // (one account per email — that's what makes sign-in work).
    const [current] = await db
      .select({ email: studentProfiles.email })
      .from(studentProfiles)
      .where(eq(studentProfiles.id, profileId));
    if (!current) {
      return NextResponse.json({ error: "Profile not found" }, { status: 404 });
    }
    if (
      typeof body.email === "string" &&
      body.email.trim() &&
      body.email.trim().toLowerCase() !== current.email.trim().toLowerCase()
    ) {
      const [taken] = await db
        .select({ id: studentProfiles.id })
        .from(studentProfiles)
        .where(sql`lower(${studentProfiles.email}) = ${body.email.trim().toLowerCase()} AND ${studentProfiles.id} != ${profileId}`)
        .limit(1);
      if (taken) {
        return NextResponse.json(
          { error: "This email is already used by another account" },
          { status: 409 }
        );
      }
    }

    // Password change: only when a new one is supplied, and it must satisfy
    // the password policy (min 8 chars, not a common password).
    const newPasswordPlain =
      typeof body.password === "string" && body.password.trim() ? body.password.trim() : "";
    if (newPasswordPlain) {
      const policyError = passwordPolicyError(newPasswordPlain);
      if (policyError) {
        return NextResponse.json({ error: policyError, code: "weak_password" }, { status: 400 });
      }
    }
    const newPasswordHash = newPasswordPlain ? hashPassword(newPasswordPlain) : undefined;

    const [updatedProfile] = await db.update(studentProfiles)
      .set({
        name: body.name !== undefined ? clampString(body.name, 120) : undefined,
        email: body.email !== undefined ? clampString(body.email, 320) : undefined,
        passwordHash: newPasswordHash,
        degreeLevel: body.degreeLevel !== undefined ? body.degreeLevel : undefined,
        targetMajor: body.targetMajor !== undefined ? body.targetMajor : undefined,
        gpa: body.gpa !== undefined ? Number(body.gpa) : undefined,
        gpaScale: body.gpaScale !== undefined ? Number(body.gpaScale) : undefined,
        // Test scores: null/0/negative -> NULL (a 0 is not a real score).
        ieltsScore: body.ieltsScore !== undefined ? (body.ieltsScore === null || Number(body.ieltsScore) <= 0 ? null : Number(body.ieltsScore)) : undefined,
        toeflScore: body.toeflScore !== undefined ? (body.toeflScore === null || Number(body.toeflScore) <= 0 ? null : Number(body.toeflScore)) : undefined,
        satScore: body.satScore !== undefined ? (body.satScore === null || Number(body.satScore) <= 0 ? null : Number(body.satScore)) : undefined,
        greScore: body.greScore !== undefined ? (body.greScore === null || Number(body.greScore) <= 0 ? null : Number(body.greScore)) : undefined,
        budgetAnnualUsd: body.budgetAnnualUsd !== undefined ? Number(body.budgetAnnualUsd) : undefined,
        preferredCountries: countriesStr,
        needScholarship: body.needScholarship !== undefined ? body.needScholarship : undefined,
        extracurriculars: body.extracurriculars !== undefined ? body.extracurriculars : undefined,
        workExperienceYears: body.workExperienceYears !== undefined ? Number(body.workExperienceYears) : undefined,
        researchPublications: body.researchPublications !== undefined ? Number(body.researchPublications) : undefined,
        preferredLocale: body.preferredLocale !== undefined ? body.preferredLocale : undefined,
        // --- Complete profile (Academic / Personal / Financial / Activities /
        //     Achievements / Goals). Never invent values: absent fields stay
        //     untouched, empty ones become NULL (spec §19).
        actScore: numField(body.actScore),
        duolingoScore: numField(body.duolingoScore),
        apCourses: jsonListField(body.apCourses),
        ibCourses: jsonListField(body.ibCourses),
        aLevelSubjects: jsonListField(body.aLevelSubjects),
        courseworkNotes: textField(body.courseworkNotes, 2000),
        country: textField(body.country, 80),
        age: numField(body.age),
        graduationYear: numField(body.graduationYear),
        familyIncomeUsd: numField(body.familyIncomeUsd),
        needsFinancialAid: boolField(body.needsFinancialAid),
        requiresFullScholarship: boolField(body.requiresFullScholarship),
        leadership: jsonListField(body.leadership),
        volunteering: jsonListField(body.volunteering),
        sports: jsonListField(body.sports),
        clubs: jsonListField(body.clubs),
        researchExperience: jsonListField(body.researchExperience),
        projects: jsonListField(body.projects),
        olympiads: jsonListField(body.olympiads),
        awards: jsonListField(body.awards),
        competitions: jsonListField(body.competitions),
        certificates: jsonListField(body.certificates),
        targetUniversities: jsonListField(body.targetUniversities),
        careerGoal: textField(body.careerGoal, 500),
        // NOT NULL column — only ever true/false, never null.
        dataShareConsent:
          body.dataShareConsent === undefined ? undefined : Boolean(body.dataShareConsent),
        dataShareConsentAt:
          body.dataShareConsent === true && !body.dataShareConsentAt ? new Date() : undefined,
        // Onboarding wizard persistence (resume support)
        onboardingStep: body.onboardingStep !== undefined ? Number(body.onboardingStep) : undefined,
        onboardingCompleted: body.onboardingCompleted !== undefined ? !!body.onboardingCompleted : undefined,
        updatedAt: new Date(),
      })
      .where(eq(studentProfiles.id, profileId))
      .returning();

    // When the profile reaches completion, complete any pending referral.
    if (updatedProfile) {
      try {
        await completeReferralIfDue(profileId);
      } catch (err) {
        console.error("Failed to complete referral:", err);
      }
      // Referral v2: when onboarding is completed, activate the referrer's
      // reward server-side (idempotent — guarded by referral_rewarded).
      if (updatedProfile.onboardingCompleted) {
        try {
          const reward = await activateReferralReward(profileId);
          if (reward.ok) {
            console.log(
              `Referral activated: profile ${profileId} → referrer +1 point (${reward.points} total${reward.premiumGranted ? ", premium granted" : ""})`
            );
          }
        } catch (err) {
          console.error("Failed to activate referral reward:", err);
        }
      }
    }

    const response = NextResponse.json({ profile: sanitizeProfile(updatedProfile) });
    // Changing the password rotates the session fingerprint — hand back a
    // freshly signed cookie so the owner is not logged out by their own edit.
    if (newPasswordHash && updatedProfile) {
      response.headers.set(
        "Set-Cookie",
        sessionCookieHeader({ id: updatedProfile.id, passwordHash: newPasswordHash }, req)
      );
    }
    response.headers.set("Cache-Control", "no-store");
    return response;
  } catch (error) {
    console.error("PUT /api/profiles/[id] error:", error);
    // Race on the unique email index.
    if ((error as { code?: string })?.code === "23505") {
      return NextResponse.json(
        { error: "This email is already used by another account" },
        { status: 409 }
      );
    }
    return NextResponse.json({ error: "Failed to update profile" }, { status: 500 });
  }
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const profileId = parseInt(id, 10);

    // Only a live admin may delete a profile (deleting is destructive).
    const access = await requireAdmin(req);
    if (!access.ok) {
      return NextResponse.json({ error: access.error, code: access.code }, { status: access.status });
    }

    await db.delete(studentProfiles).where(eq(studentProfiles.id, profileId));
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("DELETE /api/profiles/[id] error:", error);
    return NextResponse.json({ error: "Failed to delete profile" }, { status: 500 });
  }
}
