/**
 * Profile Readiness (spec §13) and Test Planner gap analysis (spec §8).
 *
 * SPEC §13 IS EXPLICIT: do not present a single number as "your admission
 * chance". This module therefore produces CATEGORIES, never a probability.
 * Each category explains exactly what is missing and what to do about it.
 *
 * SPEC §8 IS ALSO EXPLICIT: "Do not claim admission probability changes unless
 * supported by the model/data." `testGap()` reports the gap between the
 * student's score and a university's published minimum and stops there.
 *
 * PURE MODULE — asserted in `scripts/check-journey.ts`.
 */

import { gpaTo40Scale } from "@/lib/gpa";
import { clamp, interpolate, ratio, roundTo, saturatingCurve } from "@/lib/scoring";

export type ReadinessKey =
  | "academic"
  | "english"
  | "testing"
  | "activities"
  | "documents"
  | "application"
  | "finance";

export interface ReadinessCategory {
  key: ReadinessKey;
  label: string;
  /** 0–100, "how ready this one area is". NOT an admission chance. */
  pct: number;
  /** The same score before display rounding (one decimal). */
  precise: number;
  state: "strong" | "ok" | "weak" | "empty";
  /** Concrete, actionable gaps — never vague advice. */
  gaps: string[];
  /** Where the student goes to fix it. */
  tab: string;
}

export const READINESS_LABELS: Record<ReadinessKey, string> = {
  academic: "Academic",
  english: "English",
  testing: "Testing",
  activities: "Activities",
  documents: "Documents",
  application: "Application",
  finance: "Financial",
};

export interface ReadinessInput {
  gpa?: number | null;
  gpaScale?: number | null;
  degreeLevel?: string | null;
  ieltsScore?: number | null;
  toeflScore?: number | null;
  duolingoScore?: number | null;
  satScore?: number | null;
  actScore?: number | null;
  researchPublications?: number | null;
  workExperienceYears?: number | null;
  /** Standardised tests beyond SAT/ACT — used for graduate readiness. */
  greScore?: number | null;
  /** Leadership roles and awards recorded on the profile (optional, additive). */
  leadershipCount?: number;
  awardsCount?: number;
  researchCount?: number;
  activitiesCount: number;
  documentsReady: number;
  documentsTotal: number;
  applicationsStarted: number;
  applicationsSubmitted: number;
  fundingItems: number;
  familyBudget?: number | null;
}

// `clamp`/`roundTo` come from src/lib/scoring.ts: clamping no longer rounds
// behind the caller's back, so a category can report 43.8 and the UI decides
// how to print it.

/**
 * How the overall readiness number is weighted. Documented, fixed and public:
 * academics carry the most, and no single category can dominate.
 */
export const READINESS_WEIGHTS: Record<ReadinessKey, number> = {
  academic: 0.2,
  english: 0.15,
  testing: 0.1,
  activities: 0.15,
  documents: 0.15,
  application: 0.15,
  finance: 0.1,
};

export function profileReadiness(input: ReadinessInput): {
  categories: ReadinessCategory[];
  /** The weakest areas, strongest signal first — the dashboard shows these. */
  weakest: ReadinessCategory[];
  overall: number;
  /** The unrounded weighted average behind `overall`. */
  overallPrecise: number;
  /** The weight each category carried into the average. */
  weights: Record<ReadinessKey, number>;
} {
  const categories: ReadinessCategory[] = [];

  // ---- Academic -----------------------------------------------------------
  // Continuous and scale-aware: the GPA is normalised with the ONE canonical
  // helper (src/lib/gpa.ts), so a 4.6/5.0 and a 3.68/4.0 land in the same
  // place, and an uncomparable value ("85" with no scale) stays unknown
  // instead of being read as 85% of a 100-point scale.
  const academicGaps: string[] = [];
  const gpaNorm = gpaTo40Scale(input.gpa ?? null, input.gpaScale ?? null);
  let academic = 0;
  if (gpaNorm != null) {
    academic += interpolate(gpaNorm, [
      { x: 2.0, y: 0 },
      { x: 2.5, y: 10 },
      { x: 2.8, y: 25 },
      { x: 3.0, y: 35 },
      { x: 3.3, y: 45 },
      { x: 3.5, y: 48 },
      { x: 3.7, y: 52 },
      { x: 4.0, y: 55 },
    ]);
    if (gpaNorm < 3.0) {
      academicGaps.push(`GPA ${gpaNorm.toFixed(2)}/4.00 — most competitive programmes start at 3.0`);
    }
  } else {
    academicGaps.push(
      input.gpa != null
        ? "Add your GPA scale (4.0 / 5.0 / 100) so the grade can be compared"
        : "Add your GPA so universities can be matched accurately"
    );
  }
  if (input.degreeLevel) academic += 15;
  else academicGaps.push("Add your current degree level");

  const publications = Math.max(0, Number(input.researchPublications ?? 0));
  academic += 15 * saturatingCurve(publications, 2);
  if (publications === 0) academicGaps.push("Research output (paper, thesis, long project) strengthens every application");

  const workYears = Math.max(0, Number(input.workExperienceYears ?? 0));
  academic += 15 * saturatingCurve(workYears, 3);
  if (workYears === 0) academicGaps.push("Add work experience, internships or volunteering");
  categories.push(mk("academic", academic, academicGaps, "profile"));

  // ---- English ------------------------------------------------------------
  // Each test is converted to the IELTS scale and graded continuously; the
  // previous version compared a TOEFL score against a ">= 7" IELTS rule, so
  // TOEFL 95 (≈ IELTS 6.5) was silently treated as meeting the 7.0 target.
  const englishGaps: string[] = [];
  const ielts = Number(input.ieltsScore) > 0 ? Number(input.ieltsScore) : null;
  const toefl = Number(input.toeflScore) > 0 ? Number(input.toeflScore) : null;
  const duolingo = Number(input.duolingoScore) > 0 ? Number(input.duolingoScore) : null;
  const equivalentIelts = ielts ?? (toefl ? clamp((toefl - 40) / 12, 0, 9) : null) ?? (duolingo ? clamp(duolingo / 15, 0, 9) : null);
  let english = 0;
  if (equivalentIelts != null) {
    english = interpolate(equivalentIelts, [
      { x: 4.5, y: 0 },
      { x: 5, y: 5 },
      { x: 5.5, y: 15 },
      { x: 6, y: 30 },
      { x: 6.5, y: 50 },
      { x: 7, y: 70 },
      { x: 7.5, y: 85 },
      { x: 8, y: 95 },
      { x: 8.5, y: 100 },
    ]);
    const source = ielts != null ? `IELTS ${ielts}` : toefl != null ? `TOEFL ${toefl}` : `Duolingo ${duolingo}`;
    if (equivalentIelts < 6.5) {
      englishGaps.push(`${source} is about IELTS ${equivalentIelts.toFixed(1)} — most universities ask for 6.5 or higher`);
    } else if (equivalentIelts < 7) {
      englishGaps.push(`${source} meets the common 6.5 bar — 7.0+ opens more programmes`);
    }
  } else {
    englishGaps.push("No English test score yet — book IELTS, TOEFL or the Duolingo test");
  }
  categories.push(mk("english", english, englishGaps, "tests"));

  // ---- Testing ------------------------------------------------------------
  // SAT/ACT for undergraduate entry, GRE for graduate entry. The right test is
  // graded on its own scale, and a test that does not apply is explained
  // instead of scored as a failure.
  const testingGaps: string[] = [];
  const isGraduate = /master|phd|doctor|магистр|доктор/i.test(String(input.degreeLevel ?? ""));
  let testing = 0;
  if (isGraduate) {
    const gre = Number(input.greScore) > 0 ? Number(input.greScore) : null;
    if (gre != null) {
      testing = interpolate(gre, [
        { x: 280, y: 15 },
        { x: 290, y: 35 },
        { x: 300, y: 55 },
        { x: 310, y: 75 },
        { x: 320, y: 90 },
        { x: 330, y: 100 },
      ]);
      if (gre < 300) testingGaps.push(`GRE ${gre} — many funded programmes look for 300+`);
    } else {
      testingGaps.push("Graduate admission usually does not require SAT/ACT — add a GRE score only if your target programmes ask for one");
    }
  } else {
    const sat = Number(input.satScore) > 0 ? Number(input.satScore) : null;
    const act = Number(input.actScore) > 0 ? Number(input.actScore) : null;
    const equivalentSat = sat ?? (act ? clamp(act * 40 + 180, 400, 1600) : null);
    if (equivalentSat != null) {
      testing = interpolate(equivalentSat, [
        { x: 800, y: 5 },
        { x: 1000, y: 25 },
        { x: 1100, y: 40 },
        { x: 1200, y: 55 },
        { x: 1300, y: 72 },
        { x: 1400, y: 88 },
        { x: 1500, y: 97 },
        { x: 1600, y: 100 },
      ]);
      if (equivalentSat < 1200) testingGaps.push(`Test score ${equivalentSat} — a higher score widens your university list`);
    } else {
      testingGaps.push("No SAT/ACT score — add it if your target universities ask for one");
    }
  }
  categories.push(mk("testing", testing, testingGaps, "tests"));

  // ---- Activities ---------------------------------------------------------
  // Breadth alone is not readiness: leadership, research and awards are graded
  // as well, so "10 casual club sign-ups" cannot outscore "3 sustained roles".
  const activityGaps: string[] = [];
  const activityCount = Math.max(0, Number(input.activitiesCount ?? 0));
  const leadershipCount = Math.max(0, Number(input.leadershipCount ?? 0));
  const researchCount = Math.max(0, Number(input.researchCount ?? 0));
  const awardsCount = Math.max(0, Number(input.awardsCount ?? 0));
  const activities =
    55 * saturatingCurve(activityCount, 6) +
    20 * saturatingCurve(leadershipCount, 2) +
    15 * saturatingCurve(researchCount + publications, 2) +
    10 * saturatingCurve(awardsCount, 2);
  if (activityCount === 0 && leadershipCount === 0 && researchCount === 0 && awardsCount === 0) {
    activityGaps.push("Add your activities — volunteering, projects, leadership, competitions");
  } else if (activityCount < 3) {
    activityGaps.push("Most competitive applications show 4+ sustained activities");
  } else if (leadershipCount === 0) {
    activityGaps.push("Add a leadership role — it is the signal committees weigh most");
  } else if (awardsCount === 0) {
    activityGaps.push("Add at least one competition or award result");
  }
  categories.push(mk("activities", activities, activityGaps, "activities"));

  // ---- Documents ----------------------------------------------------------
  const documentGaps: string[] = [];
  const documentRatio = ratio(input.documentsReady, input.documentsTotal) ?? 0;
  const documents = input.documentsTotal > 0 ? documentRatio * 100 : 0;
  if (input.documentsTotal === 0) documentGaps.push("No checklist yet — add a university to generate one");
  else if (documentRatio < 1) {
    documentGaps.push(
      `${input.documentsTotal - input.documentsReady} of ${input.documentsTotal} document(s) still missing`
    );
  }
  categories.push(mk("documents", documents, documentGaps, "documents"));

  // ---- Application --------------------------------------------------------
  const applicationGaps: string[] = [];
  const started = Math.max(0, Number(input.applicationsStarted ?? 0));
  const submitted = Math.max(0, Number(input.applicationsSubmitted ?? 0));
  let application = 0;
  if (started > 0) application += 40;
  else applicationGaps.push("Start your first application — it generates your checklist");
  if (submitted > 0) application += 40;
  else if (started > 0) applicationGaps.push("Finish and submit at least one application");
  // Breadth is graded: 6+ applications is the documented target, and the 7th
  // counts for less than the 3rd.
  application += 20 * saturatingCurve(started, 6);
  if (started < 6) applicationGaps.push(`You have ${started} of the 6–8 applications a competitive list targets`);
  categories.push(mk("application", application, applicationGaps, "applications"));

  // ---- Finance ------------------------------------------------------------
  const financeGaps: string[] = [];
  const fundingItems = Math.max(0, Number(input.fundingItems ?? 0));
  let finance = 45 * saturatingCurve(fundingItems, 3);
  if (fundingItems === 0) financeGaps.push("Build a funding plan so you know your real gap");
  const budget = Number(input.familyBudget);
  if (Number.isFinite(budget) && budget > 0) finance += 55;
  else financeGaps.push("Add what your family can contribute each year");
  categories.push(mk("finance", finance, financeGaps, "funding"));

  for (const c of categories) {
    c.pct = Math.round(c.precise);
    c.state = c.pct >= 75 ? "strong" : c.pct >= 45 ? "ok" : c.pct > 0 ? "weak" : "empty";
  }

  const weakest = [...categories].sort((a, b) => a.pct - b.pct).slice(0, 3);
  // Weighted, not a flat mean: academics carry the most, finance the least, and
  // the weights are published (READINESS_WEIGHTS) so the number is auditable.
  const overallPrecise = roundTo(
    categories.reduce((sum, c) => sum + c.precise * READINESS_WEIGHTS[c.key], 0),
    1
  );
  return {
    categories,
    weakest,
    overall: Math.round(overallPrecise),
    overallPrecise,
    weights: READINESS_WEIGHTS,
  };
}

function mk(key: ReadinessKey, precise: number, gaps: string[], tab: string): ReadinessCategory {
  const value = roundTo(clamp(precise, 0, 100), 1);
  return {
    key,
    label: READINESS_LABELS[key],
    pct: Math.round(value),
    precise: value,
    state: "weak",
    gaps,
    tab,
  };
}

// ---------------------------------------------------------------------------
// Test gap (spec §8)
// ---------------------------------------------------------------------------

export interface TestGap {
  testType: string;
  required: number;
  current: number | null;
  /** null when there is nothing to compare (no requirement, or no score). */
  delta: number | null;
  state: "met" | "below" | "no_score" | "no_requirement";
  /** A factual statement, never a probability. */
  message: string;
}

/**
 * Compare a score to a published minimum. This reports the gap and nothing
 * else — it deliberately does NOT feed the chancing model, because a test
 * delta is not evidence of an admission-probability change.
 */
export function testGap(
  testType: string,
  required: number | null | undefined,
  current: number | null | undefined,
  label: string
): TestGap {
  if (required == null) {
    return {
      testType,
      required: 0,
      current: current ?? null,
      delta: null,
      state: "no_requirement",
      message: "This university does not publish a published minimum for this test.",
    };
  }
  if (current == null) {
    return {
      testType,
      required,
      current: null,
      delta: null,
      state: "no_score",
      message: `Requires ${label} ${required}. You have no ${label} score recorded yet.`,
    };
  }
  const delta = Math.round((current - required) * 100) / 100;
  return {
    testType,
    required,
    current,
    delta,
    state: delta >= 0 ? "met" : "below",
    message:
      delta >= 0
        ? `Your ${label} ${current} meets the published minimum of ${required}.`
        : `Your current score does not meet the target requirement — ${label} ${current} vs ${required} (${Math.abs(delta)} to go).`,
  };
}
