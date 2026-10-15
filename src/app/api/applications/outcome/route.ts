import { NextResponse } from "next/server";
import { desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { applicationDocuments, applicationOutcomes, applications, pointsLedger, studentProfiles } from "@/db/schema";
import { requireRowAccess } from "@/lib/auth";
import { clampString, positiveInt, readJsonBody } from "@/lib/request";
import { hasExplicitOutcomeShareConsent } from "@/lib/similarProfiles";
import { FLYWHEEL_BADGE, rewardForOutcome, type FlywheelResult } from "@/lib/flywheel";
import { and, inArray } from "drizzle-orm";
import { awardPoints } from "@/lib/gamification";

export const dynamic = "force-dynamic";

/** Recognized application decisions that a student can record. */
const RESULTS = ["accepted", "rejected", "waitlisted", "deferred", "withdrawn"] as const;

/**
 * POST /api/applications/outcome — record a decision in the owner's tracker.
 *
 * The result and profile snapshot are stored in the owner's account. Only an
 * explicit boolean `shareConsent: true` makes this row eligible for the
 * historical examples in Similar Profiles. Those examples do not train or
 * feed the profile-to-catalogue fit or an admission-probability estimate.
 */
export async function POST(req: Request) {
  try {
    const parsed = await readJsonBody<Record<string, any>>(req);
    if (!parsed.ok) {
      return NextResponse.json({ error: parsed.error, code: parsed.code }, { status: parsed.status });
    }
    const body = parsed.body;

    const applicationId = positiveInt(body.applicationId);
    if (!applicationId) {
      return NextResponse.json({ error: "applicationId is required" }, { status: 400 });
    }
    const result = String(body.result ?? "");
    if (!RESULTS.includes(result as (typeof RESULTS)[number])) {
      return NextResponse.json(
        { error: `result must be one of: ${RESULTS.join(", ")}` },
        { status: 400 }
      );
    }

    const [application] = await db
      .select()
      .from(applications)
      .where(eq(applications.id, applicationId));
    const access = await requireRowAccess(req, application);
    if (!access.ok) {
      return NextResponse.json({ error: access.error, code: access.code }, { status: access.status });
    }

    // Snapshot the comparison fields as they stood at decision time; later
    // profile edits must not silently rewrite a historical outcome example.
    const [profile] = await db
      .select()
      .from(studentProfiles)
      .where(eq(studentProfiles.id, application.profileId));

    // JSON strings such as "true"/"false" are not consent; require literal boolean true.
    const shareConsent = hasExplicitOutcomeShareConsent(body.shareConsent);

    const [outcome] = await db
      .insert(applicationOutcomes)
      .values({
        applicationId: application.id,
        profileId: application.profileId,
        universityId: application.universityId,
        result,
        decidedAt: /^\d{4}-\d{2}-\d{2}$/.test(String(body.decidedAt ?? "")) ? String(body.decidedAt) : null,
        scholarshipAmountUsd: positiveInt(body.scholarshipAmountUsd),
        scholarshipName: clampString(body.scholarshipName, 200) || null,
        notes: clampString(body.notes, 2000) || null,
        snapshotGpa: profile?.gpa ?? null,
        snapshotGpaScale: profile?.gpaScale ?? null,
        snapshotIelts: profile?.ieltsScore ?? null,
        snapshotToefl: profile?.toeflScore ?? null,
        snapshotSat: profile?.satScore ?? null,
        snapshotAct: profile?.actScore ?? null,
        snapshotMajor: profile?.targetMajor ?? null,
        snapshotCountry: profile?.country ?? null,
        shareConsent,
      })
      .returning();

    // ---- Flywheel (spec §5.5) -------------------------------------------
    // Rewards for recording a real decision, never for the decision itself:
    // every result pays the same, and a second record of the same application
    // pays nothing. Awarding must never fail the student's write, so the whole
    // block is best-effort and reports what happened instead of throwing.
    let reward: { points: number; explanation: string; reason: string } | null = null;
    try {
      const [already] = await db
        .select({ id: pointsLedger.id })
        .from(pointsLedger)
        .where(
          and(
            eq(pointsLedger.profileId, application.profileId),
            inArray(pointsLedger.reason, ["outcome_recorded", "outcome_verified"]),
            eq(pointsLedger.relatedEntityId, application.id),
          ),
        )
        .limit(1);
      // A usable record needs a date or a detail — a bare result is not data.
      const hasStructuredDetails = Boolean(
        outcome.decidedAt || outcome.notes || outcome.scholarshipAmountUsd || outcome.scholarshipName,
      );
      const evidenceRows = await db
        .select({ id: applicationDocuments.id })
        .from(applicationDocuments)
        .where(
          and(
            eq(applicationDocuments.profileId, application.profileId),
            eq(applicationDocuments.entityType, "university"),
            // `entityId` is nullable (general documents) but the application's
            // university id is not, so `eq` is the correct comparison here.
            eq(applicationDocuments.entityId, application.universityId as number),
            inArray(applicationDocuments.status, ["uploaded"]),
          ),
        )
        .limit(1);
      const decision = rewardForOutcome({
        result: result as FlywheelResult,
        hasEvidence: evidenceRows.length > 0,
        hasStructuredDetails,
        alreadyContributed: Boolean(already),
      });
      if (decision) {
        const award = await awardPoints(
          application.profileId,
          decision.points,
          decision.reason,
          application.id,
        );
        if (decision.badgeCriteria) {
          // The badge exists in the ledger the same way other badges do; the
          // criteria key is the identity, so this is safe to call repeatedly.
          const { badges } = await import("@/db/schema");
          const [existingBadge] = await db
            .select({ id: badges.id })
            .from(badges)
            .where(eq(badges.criteria, FLYWHEEL_BADGE.criteria))
            .limit(1);
          if (!existingBadge) {
            await db.insert(badges).values({
              name: FLYWHEEL_BADGE.name,
              description: FLYWHEEL_BADGE.description,
              iconUrl: FLYWHEEL_BADGE.iconUrl,
              criteria: FLYWHEEL_BADGE.criteria,
            });
          }
        }
        reward = { points: award.points, explanation: decision.explanation, reason: decision.reason };
      }
    } catch (err) {
      console.error("Flywheel reward error:", (err as Error)?.message);
    }

    // Keep the tracker in sync: a decision means the application is decided.
    await db
      .update(applications)
      .set({
        status: result === "withdrawn" ? "withdrawn" : "decision",
        updatedAt: new Date(),
      })
      .where(eq(applications.id, application.id));

    // Record the standing consent on the profile too, so the next result does
    // not have to ask again (it can always be revoked).
    if (shareConsent && profile && !profile.dataShareConsent) {
      await db
        .update(studentProfiles)
        .set({ dataShareConsent: true, dataShareConsentAt: new Date() })
        .where(eq(studentProfiles.id, profile.id));
    }

    return NextResponse.json({ outcome, reward });
  } catch (error) {
    console.error("POST /api/applications/outcome error:", error);
    return NextResponse.json({ error: "Failed to record result" }, { status: 500 });
  }
}

/** GET /api/applications/outcome?applicationId=N — the result history. */
export async function GET(req: Request) {
  try {
    const applicationId = positiveInt(new URL(req.url).searchParams.get("applicationId"));
    if (!applicationId) {
      return NextResponse.json({ error: "applicationId is required" }, { status: 400 });
    }

    const [application] = await db
      .select()
      .from(applications)
      .where(eq(applications.id, applicationId));
    const access = await requireRowAccess(req, application);
    if (!access.ok) {
      return NextResponse.json({ error: access.error, code: access.code }, { status: access.status });
    }

    const outcomes = await db
      .select()
      .from(applicationOutcomes)
      .where(eq(applicationOutcomes.applicationId, applicationId))
      .orderBy(desc(applicationOutcomes.createdAt));

    return NextResponse.json({ outcomes });
  } catch (error) {
    console.error("GET /api/applications/outcome error:", error);
    return NextResponse.json({ error: "Failed to load results" }, { status: 500 });
  }
}
