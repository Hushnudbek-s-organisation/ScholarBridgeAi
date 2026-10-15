import { NextResponse } from "next/server";
import { and, asc, desc, eq, inArray } from "drizzle-orm";
import { db } from "@/db";
import { applications, testAttempts, testPlans, testTasks, universities } from "@/db/schema";
import { dateOnly, guardStudent, idParam, isoDate, jsonError, oneOf, readBody, serverError, text } from "@/lib/journey/api";
import { testGap } from "@/lib/journey/readiness";
import { hasUndergraduateAdmission } from "@/lib/degreeLevels";

export const dynamic = "force-dynamic";

/** Configurable test catalogue (spec §8). */
export const TEST_TYPES = [
  { key: "ielts", label: "IELTS", max: 9, skills: ["reading", "listening", "writing", "speaking"] },
  { key: "toefl", label: "TOEFL", max: 120, skills: ["reading", "listening", "writing", "speaking"] },
  { key: "duolingo", label: "Duolingo English Test", max: 160, skills: ["reading", "listening", "writing", "speaking"] },
  { key: "sat", label: "SAT", max: 1600, skills: ["math", "reading", "writing"] },
  { key: "act", label: "ACT", max: 36, skills: ["english", "math", "reading", "science"] },
  { key: "ap", label: "AP", max: 5, skills: ["subject"] },
  // GRE and TOPIK were missing, so a student preparing for a US graduate
  // programme or a Korean-taught degree could only file them under "Other" —
  // which produced a plan with no skills, no target and no roadmap.
  { key: "gre", label: "GRE", max: 340, skills: ["verbal", "quantitative", "analytical-writing"] },
  { key: "topik", label: "TOPIK", max: 6, skills: ["listening", "reading", "writing"] },
  { key: "other", label: "Other", max: 100, skills: ["general"] },
] as const;

/**
 * One-click starter roadmaps.
 *
 * A new student saw five unlabelled buttons and an empty state. Each roadmap
 * below is a named, achievable target with five concrete milestones, so the
 * first action is "start this", not "invent a study plan". The booking links
 * point at the official registry or the in-country test centre — never at a
 * reseller — and each roadmap names where it applies.
 */
export interface StarterRoadmap {
  id: string;
  testType: string;
  targetScore: number;
  /** Milliseconds-free: days from "now" to the suggested target date. */
  targetInDays: number;
  milestones: string[];
  booking: { label: string; url: string }[];
}

export const STARTER_ROADMAPS: StarterRoadmap[] = [
  {
    id: "ielts_75",
    testType: "ielts",
    targetScore: 7.5,
    targetInDays: 120,
    milestones: [
      "Diagnostic mock under timed conditions — record the baseline band",
      "Reading: 3 passage sets/week, focus on True/False/Not Given accuracy",
      "Listening: 2 full sections/day with transcript review of every miss",
      "Writing Task 2: 2 essays/week, one reviewed for Task Response and Coherence",
      "Speaking: record 3 Part 2 answers/week, target 2 minutes without pauses",
    ],
    booking: [
      { label: "British Council Uzbekistan (IELTS)", url: "https://www.britishcouncil.uz/exam/ielts" },
      { label: "IDP IELTS Tashkent", url: "https://ielts.idp.com/uzbekistan" },
    ],
  },
  {
    id: "sat_1500",
    testType: "sat",
    targetScore: 1500,
    targetInDays: 150,
    milestones: [
      "Diagnostic Digital SAT on Bluebook — note the module split between RW and Math",
      "Math: algebra and advanced-math drills, 30 questions/day, error log by topic",
      "Reading & Writing: 1 module/day, annotate every evidence question",
      "Full adaptive mock every 3 weeks, compare against the 1500 target line",
      "Review the College Board question bank by weakest domain in the final month",
    ],
    booking: [
      { label: "College Board — register for the Digital SAT", url: "https://satsuite.collegeboard.org/sat/registration" },
      { label: "American Councils Tashkent", url: "https://uzbekistan.americancouncils.org/" },
    ],
  },
  {
    id: "toefl_105",
    testType: "toefl",
    targetScore: 105,
    targetInDays: 120,
    milestones: [
      "Diagnostic TOEFL iBT to establish the section-by-section baseline",
      "Integrated Writing: 2 responses/week, template the reading–lecture contrast",
      "Academic Listening: 2 lectures/day with note-taking, then answer from notes only",
      "Speaking: 4 tasks/day recorded, target 100+ words in 45 seconds for Task 1",
      "Two full mocks in the final three weeks with official ETS scoring",
    ],
    booking: [
      { label: "ETS — TOEFL iBT registration", url: "https://www.ets.org/toefl/test-takers/ibt/register.html" },
      { label: "American Councils Tashkent", url: "https://uzbekistan.americancouncils.org/" },
    ],
  },
  {
    id: "gre_quant_165",
    testType: "gre",
    targetScore: 165,
    targetInDays: 150,
    milestones: [
      "Diagnostic GRE to separate Quantitative from Verbal headroom",
      "Quantitative: 40 problems/day by topic, track accuracy per topic not overall",
      "Quantitative: master the arithmetic and algebra question sets before geometry",
      "Verbal: 20 sentence-equivalence and text-completion items/day with a vocabulary log",
      "Two full-length mocks in the final month, analyse every wrong Quantitative item",
    ],
    booking: [
      { label: "ETS — GRE General Test registration", url: "https://www.ets.org/gre/test-takers/general-test/register.html" },
    ],
  },
  {
    id: "topik_4",
    testType: "topik",
    targetScore: 4,
    targetInDays: 240,
    milestones: [
      "Baseline mock TOPIK I to place vocabulary and grammar level",
      "Vocabulary: 30 new words/day with spaced repetition across the week",
      "Listening: one TOPIK II section daily, replay at 1.25× for retraining",
      "Writing: 1 short-answer and 1 essay per week, self-marked against the published rubric",
      "Full TOPIK II mock every month from month three onward",
    ],
    booking: [
      { label: "TOPIK — official registration (NIIED)", url: "https://www.topik.go.kr/" },
      { label: "TOPIK in Uzbekistan — embassy announcements", url: "https://overseas.mofa.go.kr/uz-en/index.do" },
    ],
  },
];

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
 * Returns student-entered test plans plus university-level catalogue figures
 * for context. These figures are not verified programme requirements; the
 * student should confirm policies, alternatives and waivers on official pages.
 * SAT figures are shown only for universities whose catalogue explicitly
 * identifies undergraduate admission.
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
      const catalogueFigures = unis
        .filter((u) => p.testType !== "sat" || hasUndergraduateAdmission(u.degreeLevel))
        .map((u) => {
          const col = SCORE_COLUMN[p.testType];
          const catalogueFigure = col ? (u[col] as number | null) : null;
          return catalogueFigure == null ? null : { university: u.name, catalogueFigure };
        })
        .filter((item): item is { university: string; catalogueFigure: number } => item != null)
        .sort((a, b) => b.catalogueFigure - a.catalogueFigure);

      const highestCatalogueFigure = catalogueFigures[0] ?? null;
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
        catalogueFigures,
        gap: highestCatalogueFigure
          ? testGap(p.testType, highestCatalogueFigure.catalogueFigure, p.currentScore, meta?.label ?? p.testType)
          : testGap(p.testType, null, p.currentScore, meta?.label ?? p.testType),
      };
    });

    return NextResponse.json({
      testTypes: TEST_TYPES,
      /** One-click starter roadmaps — see STARTER_ROADMAPS above. */
      roadmaps: STARTER_ROADMAPS,
      plans: out,
      /** University-level catalogue figures for context, even with no plan set. */
      catalogueSignals: catalogueFiguresBy(unis),
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
  // A roadmap request names the roadmap instead of a bare test type; its target
  // score and five milestones are applied server-side so the client cannot send
  // a partial plan.
  const roadmap =
    typeof b.value.roadmap === "string" ? STARTER_ROADMAPS.find((r) => r.id === b.value.roadmap) ?? null : null;
  if (b.value.roadmap !== undefined && !roadmap) {
    return jsonError(400, "unknown roadmap", "bad_request");
  }
  const effectiveTestType = roadmap ? roadmap.testType : testType;
  try {
    const [existing] = await db
      .select()
      .from(testPlans)
      .where(and(eq(testPlans.profileId, profileId), eq(testPlans.testType, effectiveTestType)))
      .limit(1);
    if (existing) {
      const [updated] = await db
        .update(testPlans)
        .set({
          currentScore: numberOr(b.value.currentScore, existing.currentScore),
          targetScore: roadmap
            ? roadmap.targetScore
            : numberOr(b.value.targetScore, existing.targetScore),
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
        testType: effectiveTestType,
        currentScore: numberOr(b.value.currentScore, null),
        targetScore: roadmap ? roadmap.targetScore : numberOr(b.value.targetScore, null),
        targetDate: isoDate(dateOnly(b.value.targetDate)),
        nextTestDate: isoDate(dateOnly(b.value.nextTestDate)),
        notes: text(b.value.notes),
      })
      .returning();

    const meta = TEST_TYPES.find((t) => t.key === effectiveTestType);
    // A roadmap ships its own five concrete milestones; a bare test type keeps
    // the generic per-skill tasks.
    const tasks = roadmap
      ? roadmap.milestones.map((title, i) => ({
          testPlanId: plan.id,
          title,
          skill: (meta?.skills ?? ["general"])[i % Math.max(1, meta?.skills?.length ?? 1)] ?? "general",
          sortOrder: i,
        }))
      : [
          ...(meta?.skills ?? ["general"]).map((skill, i) => ({
            testPlanId: plan.id,
            title: `${cap(skill)} practice`,
            skill,
            sortOrder: i,
          })),
          { testPlanId: plan.id, title: "Full mock test", skill: "mock", sortOrder: 90 },
        ];
    await db.insert(testTasks).values(tasks);
    return NextResponse.json({ ok: true, plan, created: true, roadmap: roadmap?.id ?? null });
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

function catalogueFiguresBy(unis: (typeof universities.$inferSelect)[]) {
  const signals: { testType: string; catalogueFigure: number; universities: string[] }[] = [];
  for (const [type, col] of Object.entries(SCORE_COLUMN)) {
    if (!col) continue;
    const applicable = type === "sat" ? unis.filter((u) => hasUndergraduateAdmission(u.degreeLevel)) : unis;
    const hits = applicable
      .map((u) => ({ name: u.name, catalogueFigure: u[col] as number | null }))
      .filter((item): item is { name: string; catalogueFigure: number } => item.catalogueFigure != null);
    if (!hits.length) continue;
    hits.sort((a, b) => b.catalogueFigure - a.catalogueFigure);
    signals.push({ testType: type, catalogueFigure: hits[0].catalogueFigure, universities: hits.map((item) => item.name) });
  }
  return signals;
}

function numberOr(v: unknown, fallback: number | null): number | null {
  if (v === null) return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
}

function cap(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}
