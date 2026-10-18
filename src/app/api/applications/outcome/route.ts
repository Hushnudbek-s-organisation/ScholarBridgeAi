import { NextResponse } from "next/server";
import { and, desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { admissionOffers, applicationOutcomes, applications, fundingItems, studentProfiles } from "@/db/schema";
import { requireRowAccess } from "@/lib/auth";
import { clampString, positiveInt, readJsonBody } from "@/lib/request";
import { hasExplicitOutcomeShareConsent } from "@/lib/similarProfiles";

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

    if (["accepted", "rejected", "waitlisted", "deferred"].includes(result)) {
      const decidedAt = /^\d{4}-\d{2}-\d{2}$/.test(String(body.decidedAt ?? "")) ? String(body.decidedAt) : null;
      const notes = clampString(body.notes, 2000) || null;
      await db.insert(admissionOffers).values({
        applicationId: application.id,
        profileId: application.profileId,
        status: result,
        decidedAt,
        notes,
      }).onConflictDoUpdate({
        target: admissionOffers.applicationId,
        set: { status: result, decidedAt, notes, updatedAt: new Date() },
      });
      const scholarshipAmount = positiveInt(body.scholarshipAmountUsd);
      const scholarshipName = clampString(body.scholarshipName, 200) || "Admission scholarship";
      if (result === "accepted" && scholarshipAmount != null && scholarshipAmount > 0) {
        const [existingFunding] = await db.select({ id: fundingItems.id }).from(fundingItems).where(and(
          eq(fundingItems.profileId, application.profileId),
          eq(fundingItems.applicationId, application.id),
          eq(fundingItems.kind, "scholarship"),
          eq(fundingItems.name, scholarshipName),
          eq(fundingItems.amountUsd, scholarshipAmount),
        )).limit(1);
        if (!existingFunding) await db.insert(fundingItems).values({
          profileId: application.profileId,
          applicationId: application.id,
          kind: "scholarship",
          name: scholarshipName,
          amountUsd: scholarshipAmount,
          covers: JSON.stringify(["tuition"]),
          status: "awarded",
          notes: notes ?? "Recorded from application outcome",
        });
      }
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

    return NextResponse.json({ outcome });
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
