import { NextResponse } from "next/server";
import { desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { applicationOutcomes, applications, studentProfiles } from "@/db/schema";
import { requireRowAccess } from "@/lib/auth";
import { clampString, positiveInt, readJsonBody } from "@/lib/request";

export const dynamic = "force-dynamic";

/** Accepted results — rejections included, they are the negative examples. */
const RESULTS = ["accepted", "rejected", "waitlisted", "deferred", "withdrawn"] as const;

/**
 * POST /api/applications/outcome — "Did you get admitted?"
 *
 * This is the data flywheel: every result (accepted AND rejected) is stored
 * with a snapshot of the profile at decision time. With the student's consent
 * (`shareConsent`) the row also feeds the chancing engine, so estimates get
 * sharper as ScholarBridge collects its own outcomes instead of guessing from
 * public statistics.
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

    // Snapshot the profile as it was at decision time — that is the training
    // row. Without it, later profile edits would silently rewrite history.
    const [profile] = await db
      .select()
      .from(studentProfiles)
      .where(eq(studentProfiles.id, application.profileId));

    const shareConsent = Boolean(body.shareConsent);

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
        snapshotExtracurriculars: profile?.extracurriculars ?? null,
        shareConsent,
      })
      .returning();

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
