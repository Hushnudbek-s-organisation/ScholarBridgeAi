import { NextResponse } from "next/server";
import { db } from "@/db";
import { studentProfiles } from "@/db/schema";
import { eq, sql } from "drizzle-orm";
import { hashPassword, passwordPolicyError, sanitizeProfile } from "@/lib/password";
import { completeReferralIfDue, activateReferralReward } from "@/lib/referrals";
import { requireAdmin, requireProfileAccess, sessionCookieHeader } from "@/lib/auth";
import { clampString, optionalNumber, optionalScore, readJsonBody } from "@/lib/request";
import { isTelegramPlaceholderEmail } from "@/lib/telegram/placeholder";
import { currentOwnerId } from "@/lib/ownership/service";
import { writeAudit } from "@/lib/audit";
import { isUniqueViolation } from "@/lib/db-errors";
import { parseStudyInterestSelections } from "@/lib/studyInterests";

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
/**
 * PATCH semantics for a nullable column: absent key = leave unchanged,
 * explicit null/"" = clear to NULL (unknown), otherwise the parsed number.
 */
function patchNumber(
  value: unknown,
  opts: { min: number; max: number; integer?: boolean },
): number | null | undefined {
  if (value === undefined) return undefined;
  if (value === null || value === "") return null;
  return optionalNumber(value, opts);
}

/** Same semantics for nullable text: absent = unchanged, blank = NULL. */
function patchText(value: unknown, max: number): string | null | undefined {
  if (value === undefined) return undefined;
  const text = clampString(value, max);
  return text.length ? text : null;
}

function numField(value: unknown): number | null | undefined {
  if (value === undefined) return undefined;
  if (value === null || value === "") return null;
  if (typeof value !== "number" && typeof value !== "string") return undefined;
  const n = Number(value);
  return Number.isFinite(n) ? n : undefined;
}

/** Round an optional number for integer columns, preserving null/undefined. */
function roundOpt(value: number | null | undefined): number | null | undefined {
  return typeof value === "number" ? Math.round(value) : value;
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
    const hasStudyInterests = body.studyInterests !== undefined;
    const submittedStudyInterests = hasStudyInterests
      ? parseStudyInterestSelections(body.studyInterests)
      : null;
    if (hasStudyInterests && !submittedStudyInterests) {
      return NextResponse.json(
        { error: "Choose at least one valid study interest", code: "study_interests_invalid" },
        { status: 400 }
      );
    }
    const isExploringInterests =
      submittedStudyInterests?.length === 1 && submittedStudyInterests[0]?.kind === "exploring";

    // Stored as a JSON array string. Anything that is not an array or a
    // string (e.g. an object) is ignored rather than crashing the insert.
    let countriesStr: string | undefined;
    if (Array.isArray(body.preferredCountries)) {
      countriesStr = JSON.stringify(
        body.preferredCountries
          .filter((c: unknown) => typeof c === "string")
          .map((c: string) => clampString(c, 80))
          .filter(Boolean)
          .slice(0, 40)
      );
    } else if (typeof body.preferredCountries === "string" && body.preferredCountries.trim()) {
      countriesStr = clampString(body.preferredCountries, 4000);
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
      // Reserved for bot-created accounts (see /api/profiles POST).
      if (isTelegramPlaceholderEmail(body.email.trim())) {
        return NextResponse.json(
          { error: "Please provide a valid email address", code: "invalid_email" },
          { status: 400 }
        );
      }
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
        // An empty email would break sign-in — leave the stored one untouched.
        email: body.email !== undefined ? clampString(body.email, 320) || undefined : undefined,
        passwordHash: newPasswordHash,
        // Text fields can now be cleared to NULL ("not chosen yet").
        degreeLevel: patchText(body.degreeLevel, 60),
        // Keep legacy callers' blank value as a no-op, except an explicit
        // exploration selection, which must never be stored as a literal major.
        targetMajor: isExploringInterests ? "" : patchText(body.targetMajor, 160),
        studyInterests: submittedStudyInterests ? JSON.stringify(submittedStudyInterests) : undefined,
        // Numbers: `Number("abc")` is NaN and Postgres would store NaN in a
        // double column. Clearing a field (null/"") now stores NULL — the
        // column is nullable on purpose, so "I don't know this yet" is
        // representable and every engine reads it as unknown.
        gpa: patchNumber(body.gpa, { min: 0, max: 100 }),
        gpaScale: patchNumber(body.gpaScale, { min: 1, max: 100 }),
        // Test scores: null/0/negative -> NULL (a 0 is not a real score).
        // Integer columns are rounded — "95.5" would otherwise be a 500.
        ieltsScore: optionalScore(body.ieltsScore, 9),
        toeflScore: roundOpt(optionalScore(body.toeflScore, 120)),
        satScore: roundOpt(optionalScore(body.satScore, 1600)),
        greScore: roundOpt(optionalScore(body.greScore, 340)),
        budgetAnnualUsd: patchNumber(body.budgetAnnualUsd, { min: 0, max: 10_000_000, integer: true }),
        preferredCountries: countriesStr,
        needScholarship:
          typeof body.needScholarship === "boolean" ? body.needScholarship : undefined,
        extracurriculars: textField(body.extracurriculars, 4000),
        workExperienceYears: patchNumber(body.workExperienceYears, { min: 0, max: 80, integer: true }),
        researchPublications: patchNumber(body.researchPublications, { min: 0, max: 1000, integer: true }),
        preferredLocale:
          body.preferredLocale === "en" || body.preferredLocale === "ru" || body.preferredLocale === "uz"
            ? body.preferredLocale
            : undefined,
        // --- Complete profile (Academic / Personal / Financial / Activities /
        //     Achievements / Goals). Never invent values: absent fields stay
        //     untouched, empty ones become NULL (spec §19).
        actScore: roundOpt(numField(body.actScore)),
        duolingoScore: roundOpt(numField(body.duolingoScore)),
        apCourses: jsonListField(body.apCourses),
        ibCourses: jsonListField(body.ibCourses),
        aLevelSubjects: jsonListField(body.aLevelSubjects),
        courseworkNotes: textField(body.courseworkNotes, 2000),
        country: textField(body.country, 80),
        age: roundOpt(numField(body.age)),
        graduationYear: roundOpt(numField(body.graduationYear)),
        familyIncomeUsd: roundOpt(numField(body.familyIncomeUsd)),
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
        onboardingStep:
          optionalNumber(body.onboardingStep, { min: 0, max: 50, integer: true }) ?? undefined,
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
    if (isUniqueViolation(error)) {
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

    if (!Number.isInteger(profileId) || profileId <= 0) {
      return NextResponse.json({ error: "Invalid profile id" }, { status: 400 });
    }
    // The platform owner cannot be deleted — transfer ownership first.
    if ((await currentOwnerId()) === profileId) {
      return NextResponse.json(
        { error: "This account owns the platform. Transfer ownership before deleting it.", code: "owner_protected" },
        { status: 409 }
      );
    }

    await db.delete(studentProfiles).where(eq(studentProfiles.id, profileId));
    await writeAudit({
      entityType: "admin_role",
      entityId: profileId,
      fieldChanged: "profile_deleted",
      oldValue: null,
      newValue: true,
      source: `admin:${access.session.profile.id}`,
      actor: "ADMIN",
    }).catch(() => {});
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("DELETE /api/profiles/[id] error:", error);
    return NextResponse.json({ error: "Failed to delete profile" }, { status: 500 });
  }
}
