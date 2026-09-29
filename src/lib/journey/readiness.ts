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
  activitiesCount: number;
  documentsReady: number;
  documentsTotal: number;
  applicationsStarted: number;
  applicationsSubmitted: number;
  fundingItems: number;
  familyBudget?: number | null;
}

const clamp = (n: number) => Math.max(0, Math.min(100, Math.round(n)));

export function profileReadiness(input: ReadinessInput): {
  categories: ReadinessCategory[];
  /** The weakest areas, strongest signal first — the dashboard shows these. */
  weakest: ReadinessCategory[];
  overall: number;
} {
  const categories: ReadinessCategory[] = [];

  // ---- Academic -----------------------------------------------------------
  const gaps: string[] = [];
  let acc = 0;
  if (input.gpa != null && input.gpaScale) {
    acc += 40;
    const pct = (input.gpa / input.gpaScale) * 100;
    if (pct < 70) gaps.push(`GPA is ${pct.toFixed(0)}% of your scale — aim higher if you can`);
  } else {
    gaps.push("Add your GPA so universities can be matched accurately");
  }
  if (input.degreeLevel) acc += 20;
  else gaps.push("Add your current degree level");
  if ((input.researchPublications ?? 0) > 0) acc += 20;
  else gaps.push("Research or a strong project strengthens every application");
  if ((input.workExperienceYears ?? 0) > 0) acc += 20;
  else gaps.push("Add work experience, internships or volunteering");
  categories.push(mk("academic", clamp(acc), gaps, "profile"));

  // ---- English ------------------------------------------------------------
  const engGaps: string[] = [];
  let eng = 0;
  if (input.ieltsScore != null) eng += 50;
  else if (input.toeflScore != null) eng += 40;
  else if (input.duolingoScore != null) eng += 30;
  else engGaps.push("No English test score yet — book IELTS, TOEFL or the Duolingo test");
  if ((input.ieltsScore ?? input.toeflScore ?? 0) >= 7) eng += 30;
  else engGaps.push("Most universities want 6.5–7.5; aim for the top of that band");
  if (input.degreeLevel && /master|phd/i.test(input.degreeLevel)) eng += 20;
  else if (input.degreeLevel) eng += 10;
  categories.push(mk("english", clamp(eng), engGaps, "tests"));

  // ---- Testing ------------------------------------------------------------
  const tGaps: string[] = [];
  let t = 0;
  if (input.satScore != null) t += 50;
  else if (input.actScore != null) t += 40;
  else tGaps.push("No SAT/ACT score — add it if your target universities ask for one");
  if ((input.satScore ?? 0) >= 1400) t += 30;
  else tGaps.push("A higher SAT/ACT widens your university list");
  if (input.ieltsScore != null) t += 20;
  categories.push(mk("testing", clamp(t), tGaps, "tests"));

  // ---- Activities ---------------------------------------------------------
  const aGaps: string[] = [];
  const a = Math.min(100, input.activitiesCount * 12);
  if (input.activitiesCount === 0)
    aGaps.push("Add your activities — volunteering, projects, leadership, competitions");
  else if (input.activitiesCount < 3) aGaps.push("Most competitive applications show 4+ activities");
  else if (input.activitiesCount < 6) aGaps.push("Add depth: hours, role and outcome for each activity");
  categories.push(mk("activities", clamp(a), aGaps, "activities"));

  // ---- Documents ----------------------------------------------------------
  const dGaps: string[] = [];
  const d =
    input.documentsTotal > 0
      ? Math.round((input.documentsReady / input.documentsTotal) * 100)
      : input.documentsReady > 0
        ? 70
        : 0;
  if (input.documentsTotal === 0) dGaps.push("No checklist yet — add a university to generate one");
  else if (d < 100) dGaps.push(`${input.documentsTotal - input.documentsReady} document(s) still missing`);
  categories.push(mk("documents", clamp(d), dGaps, "documents"));

  // ---- Application --------------------------------------------------------
  const pGaps: string[] = [];
  let p = 0;
  if (input.applicationsStarted > 0) p += 40;
  else pGaps.push("Start your first application — it generates your checklist");
  if (input.applicationsSubmitted > 0) p += 40;
  else if (input.applicationsStarted > 0) pGaps.push("Finish and submit at least one application");
  if (input.applicationsStarted >= 3) p += 20;
  else pGaps.push("Aim for 6–8 applications, not one");
  categories.push(mk("application", clamp(p), pGaps, "applications"));

  // ---- Finance ------------------------------------------------------------
  const fGaps: string[] = [];
  let f = 0;
  if (input.fundingItems > 0) f += 50;
  else fGaps.push("Build a funding plan so you know your real gap");
  if (input.familyBudget != null && input.familyBudget > 0) f += 50;
  else fGaps.push("Add what your family can contribute each year");
  categories.push(mk("finance", clamp(f), fGaps, "funding"));

  for (const c of categories) {
    c.state = c.pct >= 75 ? "strong" : c.pct >= 45 ? "ok" : c.pct > 0 ? "weak" : "empty";
  }

  const weakest = [...categories].sort((a, b) => a.pct - b.pct).slice(0, 3);
  const overall = clamp(categories.reduce((s, c) => s + c.pct, 0) / categories.length);
  return { categories, weakest, overall };
}

function mk(key: ReadinessKey, pct: number, gaps: string[], tab: string): ReadinessCategory {
  return { key, label: READINESS_LABELS[key], pct, state: "weak", gaps, tab };
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
