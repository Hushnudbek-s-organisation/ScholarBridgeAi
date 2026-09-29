import { NextResponse } from "next/server";
import { and, asc, desc, eq, inArray } from "drizzle-orm";
import { db } from "@/db";
import { applications, testAttempts, testPlans, testTasks, universities } from "@/db/schema";
import { dateOnly, guardStudent, idParam, isoDate, jsonError, oneOf, readBody, serverError, text } from "@/lib/journey/api";
import { testGap } from "@/lib/journey/readiness";

export const dynamic = "force-dynamic";

/** Configurable test catalogue (spec §8). */
export const TEST_TYPES = [
  { key: "ielts", label: "IELTS", max: 9, skills: ["reading", "listening", "writing", "speaking"] },
  { key: "toefl", label: "TOEFL", max: 120, skills: ["reading", "listening", "writing", "speaking"] },
  { key: "duolingo", label: "Duolingo English Test", max: 160, skills: ["reading", "listening", "writing", "speaking"] },
  { key: "sat", label: "SAT", max: 1600, skills: ["math", "reading", "writing"] },
  { key: "act", label: "ACT", max: 36, skills: ["english", "math", "reading", "science"] },
  { key: "ap", label: "AP", max: 5, skills: ["subject"] },
  { key: "other", label: "Other", max: 100, skills: ["general"] },
] as const;

/**
 * Which `universities` column carries the published minimum for a test.
 * Only the columns the table actually has are listed — an absent column means
 * "not published", never a guessed value.
 */
const SCORE_COLUMN: Record<string, "minIelts" | "minSat" | null> = {
  ielts: "minIelts",
  sat: "minSat",
  toefl: null,
  act: null,
  duolingo: null,
  ap: null,
  other: null,
};

/**
 * GET /api/test-planner?profileId=
 *
 * Test Planner (spec §8): current score, target, target date, next test date
 * and previous attempts — PLUS the comparison against the published minimums
 * of the universities the student actually applied to.
 *
 * SPEC §8: "Do not claim admission probability changes unless supported by the
 * model/data." `testGap()` therefore reports the difference and nothing else.
 */
export async function GET(req: Request) {
  const g = await guardStudent(req, new URL(req.url).searchParams.get("profileId"));
  if (!g.ok) return g.response;
  const { profileId } = g.value;
  try {
    const plans = await db.select().from(testPlans).where(eq(testPlans.profileId, profileId)).orderBy(asc(testPlans.testType));
    const planIds = plans.map((p) => p.id);
    const [attempts, tasks] = planIds.length
      ? await Promise.all([
          db.select().from(testAttempts).where(inArray(testAttempts.testPlanId, planIds)).orderBy(desc(testAttempts.testDate)),
          db.select().from(testTasks).where(inArray(testTasks.testPlanId, planIds)).orderBy(asc(testTasks.sortOrder), asc(testTasks.id)),
        ])
      : [[], []];

    // Which universities does this student actually target?
    const apps = await db
      .select({ universityId: applications.universityId, universityName: applications.universityName })
      .from(applications)
      .where(eq(applications.profileId, profileId));
    const ids = [...new Set(apps.map((a) => a.universityId).filter((x): x is number => x != null))];
    const unis = ids.length ? await db.select().from(universities).where(inArray(universities.id, ids)) : [];

    const out = plans.map((p) => {
      const meta = TEST_TYPES.find((t) => t.key === p.testType);
      const requiredBy = unis
        .map((u) => {
          const col = SCORE_COLUMN[p.testType];
          const required = col ? (u[col] as number | null) : null;
          return required == null ? null : { university: u.name, required };
        })
        .filter((x): x is { university: string; required: number } => x != null)
        .sort((a, b) => b.required - a.required);

      const strictest = requiredBy[0] ?? null;
      return {
        id: p.id,
        testType: p.testType,
        label: meta?.label ?? p.testType,
        currentScore: p.currentScore,
        targetScore: p.targetScore,
        targetDate: p.targetDate ? String(p.targetDate).slice(0, 10) : null,
        nextTestDate: p.nextTestDate ? String(p.nextTestDate).slice(0, 10) : null,
        isActive: p.isActive,
        notes: p.notes,
        attempts: attempts.filter((a) => a.testPlanId === p.id).map((a) => ({ ...a, testDate: String(a.testDate).slice(0, 10) })),
        tasks: tasks.filter((t) => t.testPlanId === p.id).map((t) => ({ ...t, dueDate: t.dueDate ? String(t.dueDate).slice(0, 10) : null })),
        requirements: requiredBy,
        gap: strictest
          ? testGap(p.testType, strictest.required, p.currentScore, meta?.label ?? p.testType)
          : testGap(p.testType, null, p.currentScore, meta?.label ?? p.testType),
      };
    });

    return NextResponse.json({
      testTypes: TEST_TYPES,
      plans: out,
      /** What the student's own applications demand, even with no plan set. */
      demanded: demandedBy(unis),
    });
  } catch (err) {
    return serverError("test-planner GET", err);
  }
}

/** POST — create a plan, and generate the practice tasks for it. */
export async function POST(req: Request) {
  const b = await readBody(req);
  if (!b.ok) return b.response;
  const g = await guardStudent(req, b.value.profileId, { write: true });
  if (!g.ok) return g.response;
  const { profileId } = g.value;
  const testType = oneOf(b.value.testType, TEST_TYPES.map((t) => t.key) as unknown as readonly string[], "other") as string;
  try {
    const [existing] = await db
      .select()
      .from(testPlans)
      .where(and(eq(testPlans.profileId, profileId), eq(testPlans.testType, testType)))
      .limit(1);
    if (existing) {
      const [updated] = await db
        .update(testPlans)
        .set({
          currentScore: numberOr(b.value.currentScore, existing.currentScore),
          targetScore: numberOr(b.value.targetScore, existing.targetScore),
          targetDate: b.value.targetDate === undefined ? existing.targetDate : isoDate(dateOnly(b.value.targetDate)),
          nextTestDate: b.value.nextTestDate === undefined ? existing.nextTestDate : isoDate(dateOnly(b.value.nextTestDate)),
          notes: b.value.notes === undefined ? existing.notes : text(b.value.notes),
          updatedAt: new Date(),
        })
        .where(eq(testPlans.id, existing.id))
        .returning();
      return NextResponse.json({ ok: true, plan: updated, created: false });
    }

    const [plan] = await db
      .insert(testPlans)
      .values({
        profileId,
        testType,
        currentScore: numberOr(b.value.currentScore, null),
        targetScore: numberOr(b.value.targetScore, null),
        targetDate: isoDate(dateOnly(b.value.targetDate)),
        nextTestDate: isoDate(dateOnly(b.value.nextTestDate)),
        notes: text(b.value.notes),
      })
      .returning();

    const meta = TEST_TYPES.find((t) => t.key === testType);
    await db.insert(testTasks).values(
      [
        ...(meta?.skills ?? ["general"]).map((skill, i) => ({
          testPlanId: plan.id,
          title: `${cap(skill)} practice`,
          skill,
          sortOrder: i,
        })),
        { testPlanId: plan.id, title: "Full mock test", skill: "mock", sortOrder: 90 },
      ]
    );
    return NextResponse.json({ ok: true, plan, created: true });
  } catch (err) {
    return serverError("test-planner POST", err);
  }
}

/** PATCH — add an attempt, complete a task, or update the plan. */
export async function PATCH(req: Request) {
  const b = await readBody(req);
  if (!b.ok) return b.response;
  const g = await guardStudent(req, b.value.profileId, { write: true });
  if (!g.ok) return g.response;
  const { profileId } = g.value;
  const planId = Number(b.value.testPlanId);
  try {
    if (b.value.taskId) {
      const [task] = await db
        .select()
        .from(testTasks)
        .innerJoin(testPlans, eq(testPlans.id, testTasks.testPlanId))
        .where(and(eq(testTasks.id, Number(b.value.taskId)), eq(testPlans.profileId, profileId)))
        .limit(1);
      if (!task) return jsonError(404, "Task not found", "not_found");
      await db
        .update(testTasks)
        .set({ isCompleted: b.value.isCompleted == null ? !task.test_tasks.isCompleted : !!b.value.isCompleted })
        .where(eq(testTasks.id, Number(b.value.taskId)));
      return NextResponse.json({ ok: true, taskId: Number(b.value.taskId) });
    }

    if (!Number.isInteger(planId) || planId <= 0) return jsonError(400, "testPlanId is required", "bad_request");
    const [plan] = await db
      .select()
      .from(testPlans)
      .where(and(eq(testPlans.id, planId), eq(testPlans.profileId, profileId)))
      .limit(1);
    if (!plan) return jsonError(404, "Test plan not found", "not_found");

    if (b.value.attemptDate) {
      const [attempt] = await db
        .insert(testAttempts)
        .values({
          testPlanId: planId,
          testDate: isoDate(dateOnly(b.value.attemptDate)) ?? new Date().toISOString().slice(0, 10),
          score: numberOr(b.value.score, null),
          resultLabel: text(b.value.resultLabel, 60),
          notes: text(b.value.notes),
        })
        .returning();
      // The newest attempt becomes the student's "current" score.
      if (typeof b.value.score === "number" && Number.isFinite(b.value.score)) {
        await db.update(testPlans).set({ currentScore: b.value.score, updatedAt: new Date() }).where(eq(testPlans.id, planId));
      }
      return NextResponse.json({ ok: true, attempt });
    }

    const patch: Record<string, unknown> = { updatedAt: new Date() };
    if (b.value.currentScore !== undefined) patch.currentScore = numberOr(b.value.currentScore, plan.currentScore);
    if (b.value.targetScore !== undefined) patch.targetScore = numberOr(b.value.targetScore, plan.targetScore);
    if (b.value.targetDate !== undefined) patch.targetDate = isoDate(dateOnly(b.value.targetDate));
    if (b.value.nextTestDate !== undefined) patch.nextTestDate = isoDate(dateOnly(b.value.nextTestDate));
    if (b.value.notes !== undefined) patch.notes = text(b.value.notes);
    await db.update(testPlans).set(patch).where(eq(testPlans.id, planId));
    return NextResponse.json({ ok: true, id: planId });
  } catch (err) {
    return serverError("test-planner PATCH", err);
  }
}

/** DELETE — remove a test plan (attempts and tasks cascade). */
export async function DELETE(req: Request) {
  const { searchParams } = new URL(req.url);
  const g = await guardStudent(req, searchParams.get("profileId"), { write: true });
  if (!g.ok) return g.response;
  const id = idParam(req);
  if (!id) return jsonError(400, "id is required", "bad_request");
  try {
    const deleted = await db
      .delete(testPlans)
      .where(and(eq(testPlans.id, id), eq(testPlans.profileId, g.value.profileId)))
      .returning({ id: testPlans.id });
    if (!deleted.length) return jsonError(404, "Test plan not found", "not_found");
    return NextResponse.json({ ok: true, id });
  } catch (err) {
    return serverError("test-planner DELETE", err);
  }
}

// ---------------------------------------------------------------------------

function demandedBy(unis: (typeof universities.$inferSelect)[]) {
  const demanded: { testType: string; required: number; universities: string[] }[] = [];
  for (const [type, col] of Object.entries(SCORE_COLUMN)) {
    if (!col) continue;
    const hits = unis
      .map((u) => ({ name: u.name, required: u[col] as number | null }))
      .filter((x): x is { name: string; required: number } => x.required != null);
    if (!hits.length) continue;
    hits.sort((a, b) => b.required - a.required);
    demanded.push({ testType: type, required: hits[0].required, universities: hits.map((h) => h.name) });
  }
  return demanded;
}

function numberOr(v: unknown, fallback: number | null): number | null {
  if (v === null) return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
}

function cap(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}
