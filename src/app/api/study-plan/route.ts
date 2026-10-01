import { NextResponse } from "next/server";
import { and, asc, eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { studentProfiles, studyPlanPhases, studyPlans } from "@/db/schema";
import { guardStudent, idParam, jsonError, readBody, serverError, text } from "@/lib/journey/api";
import { buildPhaseProgress, PLAN_PHASES } from "@/lib/journey/planning";
import { profileCompleteness } from "@/lib/growth/logic";

export const dynamic = "force-dynamic";

/**
 * GET /api/study-plan?profileId=
 *
 * My Study Plan (spec §12). The ten phases are ALWAYS returned, with a live
 * completion number derived from the student's real data — the plan updates
 * itself when the profile, tests or applications change, so the student never
 * has to maintain it by hand.
 */
export async function GET(req: Request) {
  const g = await guardStudent(req, new URL(req.url).searchParams.get("profileId"));
  if (!g.ok) return g.response;
  const { profileId } = g.value;
  try {
    const [plan] = await db
      .select()
      .from(studyPlans)
      .where(and(eq(studyPlans.profileId, profileId), eq(studyPlans.isActive, true)))
      .orderBy(asc(studyPlans.id))
      .limit(1);

    const live = await phaseProgress(profileId);

    return NextResponse.json({
      plan: plan ?? null,
      phases: live,
      phaseDefinitions: PLAN_PHASES.map((p) => ({ key: p.key, title: p.title, description: p.description, icon: p.icon, tab: p.tab })),
    });
  } catch (err) {
    return serverError("study-plan GET", err);
  }
}

/** POST — create (or replace) the active plan; phases are generated. */
export async function POST(req: Request) {
  const b = await readBody(req);
  if (!b.ok) return b.response;
  const g = await guardStudent(req, b.value.profileId, { write: true });
  if (!g.ok) return g.response;
  const { profileId } = g.value;
  const title = text(b.value.title, 160);
  if (!title) return jsonError(400, "title is required", "bad_request");
  try {
    const goalYear = Number(b.value.goalYear);
    await db
      .update(studyPlans)
      .set({ isActive: false, updatedAt: new Date() })
      .where(and(eq(studyPlans.profileId, profileId), eq(studyPlans.isActive, true)));

    const [plan] = await db
      .insert(studyPlans)
      .values({
        profileId,
        title,
        targetMajor: text(b.value.targetMajor, 120),
        targetCountry: text(b.value.targetCountry, 120),
        degreeLevel: text(b.value.degreeLevel, 60),
        intakeTerm: text(b.value.intakeTerm, 60),
        goalYear: Number.isInteger(goalYear) && goalYear > 1990 ? goalYear : null,
        fundingGoal: text(b.value.fundingGoal, 120),
      })
      .returning();

    await db.insert(studyPlanPhases).values(
      PLAN_PHASES.map((p, i) => ({
        planId: plan.id,
        phaseKey: p.key,
        title: p.title,
        description: p.description,
        sortOrder: i,
      }))
    );

    return NextResponse.json({ ok: true, plan, phases: await phaseProgress(profileId) });
  } catch (err) {
    return serverError("study-plan POST", err);
  }
}

/** PATCH — update the plan goal, or mark a phase complete. */
export async function PATCH(req: Request) {
  const b = await readBody(req);
  if (!b.ok) return b.response;
  const g = await guardStudent(req, b.value.phaseId == null && b.value.id == null ? null : b.value.profileId, { write: true });
  if (!g.ok) return g.response;
  const { profileId } = g.value;
  try {
    if (b.value.phaseKey) {
      const [plan] = await db
        .select()
        .from(studyPlans)
        .where(and(eq(studyPlans.profileId, profileId), eq(studyPlans.isActive, true)))
        .limit(1);
      if (!plan) return jsonError(404, "No active study plan", "not_found");
      const [phase] = await db
        .select()
        .from(studyPlanPhases)
        .where(and(eq(studyPlanPhases.planId, plan.id), eq(studyPlanPhases.phaseKey, String(b.value.phaseKey))))
        .limit(1);
      if (!phase) return jsonError(404, "Phase not found", "not_found");
      const done = b.value.done === undefined ? phase.status !== "done" : !!b.value.done;
      await db
        .update(studyPlanPhases)
        .set({
          status: done ? "done" : "in_progress",
          completedAt: done ? new Date() : null,
          startedAt: phase.startedAt ?? new Date(),
        })
        .where(eq(studyPlanPhases.id, phase.id));
      return NextResponse.json({ ok: true, phaseKey: phase.phaseKey, done });
    }

    const id = Number(b.value.id);
    if (!Number.isInteger(id) || id <= 0) return jsonError(400, "id is required", "bad_request");
    const [plan] = await db
      .select()
      .from(studyPlans)
      .where(and(eq(studyPlans.id, id), eq(studyPlans.profileId, profileId)))
      .limit(1);
    if (!plan) return jsonError(404, "Plan not found", "not_found");
    const patch: Record<string, unknown> = { updatedAt: new Date() };
    if (b.value.title !== undefined) patch.title = text(b.value.title, 160);
    if (b.value.targetMajor !== undefined) patch.targetMajor = text(b.value.targetMajor, 120);
    if (b.value.targetCountry !== undefined) patch.targetCountry = text(b.value.targetCountry, 120);
    if (b.value.goalYear !== undefined) {
      const y = Number(b.value.goalYear);
      patch.goalYear = Number.isInteger(y) && y > 1990 ? y : null;
    }
    await db.update(studyPlans).set(patch).where(eq(studyPlans.id, id));
    return NextResponse.json({ ok: true, id });
  } catch (err) {
    return serverError("study-plan PATCH", err);
  }
}

/** DELETE — retire the active plan (phases cascade). */
export async function DELETE(req: Request) {
  const id = idParam(req);
  const g = await guardStudent(req, new URL(req.url).searchParams.get("profileId"), { write: true });
  if (!g.ok) return g.response;
  if (!id) return jsonError(400, "id is required", "bad_request");
  try {
    const deleted = await db
      .delete(studyPlans)
      .where(and(eq(studyPlans.id, id), eq(studyPlans.profileId, g.value.profileId)))
      .returning({ id: studyPlans.id });
    if (!deleted.length) return jsonError(404, "Plan not found", "not_found");
    return NextResponse.json({ ok: true, id });
  } catch (err) {
    return serverError("study-plan DELETE", err);
  }
}

// ---------------------------------------------------------------------------

/**
 * Live phase progress from the student's real rows (never a stored column).
 * One round trip answers every counter, so the plan costs the same as one
 * `SELECT COUNT(*)` would.
 */
export async function phaseProgress(profileId: number) {
  const [row] = await db
    .select({
      ielts: sql<number | null>`${studentProfiles.ieltsScore}`,
      testPlans: sql<number>`(SELECT COUNT(*)::int FROM test_plans tp WHERE tp.profile_id = ${profileId})`,
      savedUniversities: sql<number>`(SELECT COUNT(*)::int FROM saved_universities su WHERE su.profile_id = ${profileId})`,
      savedScholarships: sql<number>`(SELECT COUNT(*)::int FROM saved_scholarships ss WHERE ss.profile_id = ${profileId})`,
      documentsTotal: sql<number>`(SELECT COUNT(*)::int FROM user_documents ud WHERE ud.profile_id = ${profileId})`,
      documentsReady: sql<number>`(SELECT COUNT(*)::int FROM user_documents ud WHERE ud.profile_id = ${profileId} AND ud.status IN ('uploaded','verified') AND (ud.expires_at IS NULL OR ud.expires_at >= CURRENT_DATE))`,
      applications: sql<number>`(SELECT COUNT(*)::int FROM applications a WHERE a.profile_id = ${profileId})`,
      submitted: sql<number>`(SELECT COUNT(*)::int FROM applications a WHERE a.profile_id = ${profileId} AND a.submitted_at IS NOT NULL)`,
      openApplicationRequirements: sql<number>`(SELECT COUNT(*)::int FROM application_requirements r WHERE r.profile_id = ${profileId} AND r.is_required AND r.status NOT IN ('done','not_required'))`,
      interviews: sql<number>`(SELECT COUNT(*)::int FROM ai_evaluations ae WHERE ae.profile_id = ${profileId} AND ae.evaluation_type = 'Visa Practice')`,
      offers: sql<number>`(SELECT COUNT(*)::int FROM admission_offers ao WHERE ao.profile_id = ${profileId})`,
    })
    .from(studentProfiles)
    .where(eq(studentProfiles.id, profileId))
    .limit(1);

  const [profile] = await db.select().from(studentProfiles).where(eq(studentProfiles.id, profileId)).limit(1);
  const completenessPct = profileCompleteness(profile ?? null);

  return buildPhaseProgress({
    profileComplete: completenessPct >= 100,
    profileCompletenessPct: completenessPct,
    openApplicationRequirements: row?.openApplicationRequirements ?? 0,
    ieltsScore: row?.ielts ?? null,
    testPlanCount: row?.testPlans ?? 0,
    savedUniversities: row?.savedUniversities ?? 0,
    savedScholarships: row?.savedScholarships ?? 0,
    documentsReady: row?.documentsReady ?? 0,
    documentsTotal: row?.documentsTotal ?? 0,
    applications: row?.applications ?? 0,
    submittedApplications: row?.submitted ?? 0,
    interviewSessions: row?.interviews ?? 0,
    offersRecorded: row?.offers ?? 0,
    visaCaseStarted: (row?.interviews ?? 0) > 0,
    visaApproved: false,
    departureReady: false,
  });
}
