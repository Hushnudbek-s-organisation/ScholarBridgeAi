import { and, eq, exists } from "drizzle-orm";
import { db } from "@/db";
import { applications, savedUniversities, schollyProfiles, studentProfiles } from "@/db/schema";
import { requireProfileAccess } from "@/lib/auth";
import { privateNoStoreJson } from "@/lib/apiResponse";
import { readJsonBody } from "@/lib/request";
import { logSchollyEvent } from "@/lib/scholly-events";
import { transitionSchollyOnboarding, type SchollyOnboardingSnapshot } from "@/lib/scholly-onboarding";
import { isSchollyLocale, isSupportedTimeZone } from "@/lib/scholly-profile";
import { readSchollyLearning } from "@/lib/scholly-learning";
import { parseSchollyReminderPreferences } from "@/lib/scholly-reminders";

function publicProfile(row: typeof schollyProfiles.$inferSelect, stageKnown: boolean, ownProfile: boolean) {
  return {
    userId: row.userId,
    namePref: row.namePref,
    nameConfirmed: row.nameConfirmed,
    lang: row.lang,
    tone: row.tone,
    mode: parseSchollyReminderPreferences(row).mode,
    ...(ownProfile ? { learning: readSchollyLearning(row.notifPrefs) } : {}),
    tz: row.tz,
    reminderWindow: row.reminderWindow,
    onboardingState: row.onboardingState,
    onboardingStep: row.onboardingStep,
    onboardingAnswers: row.onboardingAnswers,
    onboardedAt: row.onboardedAt,
    stageKnown,
  };
}

async function ensureProfile(profileId: number) {
  const [student] = await db.select({
    preferredLocale: studentProfiles.preferredLocale,
    degreeLevel: studentProfiles.degreeLevel,
    targetMajor: studentProfiles.targetMajor,
    country: studentProfiles.country,
    preferredCountries: studentProfiles.preferredCountries,
    studyInterests: studentProfiles.studyInterests,
    gpa: studentProfiles.gpa,
    hasSavedUniversity: exists(db.select({ id: savedUniversities.id })
      .from(savedUniversities).where(eq(savedUniversities.profileId, profileId))),
    hasApplication: exists(db.select({ id: applications.id })
      .from(applications).where(eq(applications.profileId, profileId))),
  })
    .from(studentProfiles).where(eq(studentProfiles.id, profileId)).limit(1);
  if (!student) return null;
  await db.insert(schollyProfiles).values({
    userId: profileId,
    lang: student.preferredLocale === "ru" || student.preferredLocale === "en" ? student.preferredLocale : "uz",
  }).onConflictDoNothing({ target: schollyProfiles.userId });
  const [row] = await db.select().from(schollyProfiles).where(eq(schollyProfiles.userId, profileId)).limit(1);
  if (!row) return null;
  // The same profile signals used by the dashboard identify the move from
  // Discover to Match. A saved university or tracked application is direct
  // evidence of progress even when an older profile still has missing fields.
  const stageKnown = Boolean(
    student.degreeLevel?.trim() || student.targetMajor?.trim() || student.country?.trim() ||
    student.preferredCountries?.trim() || student.studyInterests?.trim() || Number(student.gpa) > 0 ||
    student.hasSavedUniversity || student.hasApplication,
  );
  return { row, stageKnown };
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const access = await requireProfileAccess(req, searchParams.get("profileId"));
    if (!access.ok) return privateNoStoreJson({ error: access.error, code: access.code }, { status: access.status });
    if (access.targetId == null) return privateNoStoreJson({ error: "Profile not found" }, { status: 404 });
    const profile = await ensureProfile(access.targetId);
    if (!profile) return privateNoStoreJson({ error: "Profile not found" }, { status: 404 });
    return privateNoStoreJson({ profile: publicProfile(profile.row, profile.stageKnown, access.session.profile.id === access.targetId) });
  } catch (error) {
    console.error("GET /api/scholly/profile error:", error);
    return privateNoStoreJson({ error: "Scholly profile is unavailable" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const parsed = await readJsonBody<Record<string, unknown>>(req);
    if (!parsed.ok) return privateNoStoreJson({ error: parsed.error, code: parsed.code }, { status: parsed.status });
    const body = parsed.body;
    const access = await requireProfileAccess(req, body.profileId);
    if (!access.ok) return privateNoStoreJson({ error: access.error, code: access.code }, { status: access.status });
    if (access.targetId == null) return privateNoStoreJson({ error: "Profile not found" }, { status: 404 });

    const initial = await ensureProfile(access.targetId);
    if (!initial) return privateNoStoreJson({ error: "Profile not found" }, { status: 404 });

    // Serialize a student's step transitions. A stale double click or retry
    // cannot advance past a step or create an unpaired event.
    const outcome = await db.transaction(async (tx) => {
      const [row] = await tx.select().from(schollyProfiles)
        .where(eq(schollyProfiles.userId, access.targetId!)).for("update").limit(1);
      if (!row) return { error: "Profile not found", status: 404 as const };
      const current: SchollyOnboardingSnapshot = {
        onboardingState: row.onboardingState as SchollyOnboardingSnapshot["onboardingState"],
        onboardingStep: row.onboardingStep as SchollyOnboardingSnapshot["onboardingStep"],
        nameConfirmed: row.nameConfirmed,
        namePref: row.namePref,
        reminderWindow: row.reminderWindow,
        tone: row.tone,
        onboardingAnswers: row.onboardingAnswers as Record<string, unknown>,
      };
      const transition = transitionSchollyOnboarding(current, body, new Date(), initial.stageKnown);
      if ("error" in transition) return { error: transition.error, status: 409 as const };

      const [updated] = await tx.update(schollyProfiles)
        .set({ ...transition.patch, updatedAt: new Date() })
        .where(and(
          eq(schollyProfiles.userId, access.targetId!),
          eq(schollyProfiles.onboardingStep, row.onboardingStep),
          eq(schollyProfiles.onboardingState, row.onboardingState),
        ))
        .returning();
      if (!updated) return { error: "Onboarding changed; reload and continue", status: 409 as const };
      if (body.action === "tone" && transition.event === "onboarding_completed") {
        await logSchollyEvent(access.targetId!, "onboarding_step", { step: "tone", value: updated.tone }, tx);
      }
      await logSchollyEvent(access.targetId!, transition.event, transition.payload, tx);
      return { profile: publicProfile(updated, initial.stageKnown, access.session.profile.id === access.targetId) };
    });

    if ("error" in outcome) return privateNoStoreJson({ error: outcome.error, code: "invalid_onboarding_transition" }, { status: outcome.status });
    return privateNoStoreJson({ profile: outcome.profile });
  } catch (error) {
    console.error("POST /api/scholly/profile error:", error);
    return privateNoStoreJson({ error: "Scholly onboarding could not be saved" }, { status: 500 });
  }
}

/** Persist only the supported locale and the device's valid IANA timezone. */
export async function PUT(req: Request) {
  try {
    const parsed = await readJsonBody<Record<string, unknown>>(req);
    if (!parsed.ok) return privateNoStoreJson({ error: parsed.error, code: parsed.code }, { status: parsed.status });
    const body = parsed.body;
    const access = await requireProfileAccess(req, body.profileId);
    if (!access.ok) return privateNoStoreJson({ error: access.error, code: access.code }, { status: access.status });
    if (access.targetId == null) return privateNoStoreJson({ error: "Profile not found" }, { status: 404 });

    const hasTimezone = body.tz !== undefined;
    const hasLocale = body.lang !== undefined;
    if (!hasTimezone && !hasLocale) return privateNoStoreJson({ error: "No supported preference supplied" }, { status: 400 });
    if (hasTimezone && !isSupportedTimeZone(body.tz)) return privateNoStoreJson({ error: "Invalid IANA timezone", code: "invalid_timezone" }, { status: 400 });
    if (hasLocale && !isSchollyLocale(body.lang)) return privateNoStoreJson({ error: "Unsupported language", code: "invalid_locale" }, { status: 400 });

    const existing = await ensureProfile(access.targetId);
    if (!existing) return privateNoStoreJson({ error: "Profile not found" }, { status: 404 });
    const [updated] = await db.update(schollyProfiles).set({
      tz: hasTimezone ? body.tz as string : undefined,
      lang: hasLocale ? body.lang as "uz" | "ru" | "en" : undefined,
      updatedAt: new Date(),
    }).where(eq(schollyProfiles.userId, access.targetId)).returning();
    if (!updated) return privateNoStoreJson({ error: "Scholly preferences could not be saved" }, { status: 500 });
    return privateNoStoreJson({ profile: publicProfile(updated, existing.stageKnown, access.session.profile.id === access.targetId) });
  } catch (error) {
    console.error("PUT /api/scholly/profile error:", error);
    return privateNoStoreJson({ error: "Scholly preferences could not be saved" }, { status: 500 });
  }
}
