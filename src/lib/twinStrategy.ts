/**
 * Feature 5.5 — "Admitted Student Twin" Gap & 3-Step Action Blueprint.
 *
 * WHY
 * ---
 * A list of similar profiles is inspiration; a delta table with three dated
 * actions is a plan. This module takes the closest admitted student from the
 * public, moderated success-story set and turns the comparison into concrete
 * work: what the twin has that this profile does not, expressed in the same
 * units, plus exactly three next steps the student can push into their goals.
 *
 * HONESTY RULES (the same ones `/api/similar-profiles` already enforces)
 * ---------------------------------------------------------------------
 *  1. Nothing is converted across tests. IELTS is compared with IELTS and
 *     TOEFL with TOEFL; when only one side has a test, the row is `unknown`,
 *     never a synthetic pass or fail.
 *  2. GPA is compared only through `gpaTo40Scale`, which refuses to guess a
 *     scale — an 85 with no scale stays unknown rather than becoming 4.0.
 *  3. A value the student has not entered is "not provided", and it never
 *     produces an action card claiming a gap. The card list is built only from
 *     comparisons where BOTH sides have data, or where the twin's evidence is
 *     a public fact (a named scholarship, an activity list).
 *  4. The twin score is a display-order heuristic from `twinScore()` in
 *     src/lib/growth/logic.ts. It is shown as "profile overlap", never as an
 *     admission likelihood or a promise about this student's own chances.
 *  5. Pure and deterministic: same inputs → same deltas, same three actions.
 */

import { gpaTo40Scale } from "./gpa";

/* -------------------------------------------------------------------------- */
/* Inputs                                                                      */
/* -------------------------------------------------------------------------- */

/** The student's own profile, as the session already holds it. */
export interface TwinMeInput {
  name?: string | null;
  gpa?: number | null;
  gpaScale?: number | null;
  ieltsScore?: number | null;
  toeflScore?: number | null;
  satScore?: number | null;
  actScore?: number | null;
  targetMajor?: string | null;
  degreeLevel?: string | null;
  country?: string | null;
  preferredCountries?: string | null;
  researchPublications?: number | null;
  /** Free-text activity fields; a non-empty field counts as evidence. */
  researchExperience?: string | null;
  projects?: string | null;
  leadership?: string | null;
  volunteering?: string | null;
  olympiads?: string | null;
  awards?: string | null;
  competitions?: string | null;
  certificates?: string | null;
  extracurriculars?: string | null;
  clubs?: string | null;
  sports?: string | null;
  workExperienceYears?: number | null;
}

/** One approved, public success story (`publicStory()` from /api/stories). */
export interface TwinInput {
  id?: number | null;
  displayName?: string | null;
  admittedUniversity?: string | null;
  admittedCountry?: string | null;
  degreeLevel?: string | null;
  major?: string | null;
  intakeYear?: number | null;
  gpa?: number | null;
  gpaScale?: number | null;
  ielts?: number | null;
  toefl?: number | null;
  sat?: number | null;
  activities?: string[] | null;
  awards?: string[] | null;
  scholarshipName?: string | null;
  scholarshipAmountUsd?: number | null;
  advice?: string | null;
  /** 0–100 overlap heuristic computed server-side by `twinScore()`. */
  twin?: number | null;
  reasons?: string[] | null;
}

/* -------------------------------------------------------------------------- */
/* Deltas                                                                      */
/* -------------------------------------------------------------------------- */

export type DeltaState = "ahead" | "even" | "behind" | "unknown";
export type DeltaId =
  | "gpa"
  | "english"
  | "standardized"
  | "major"
  | "degreeLevel"
  | "research"
  | "activities";

export interface TwinDelta {
  id: DeltaId;
  /** i18n key suffix: `twin.deltas.<id>.label`. */
  labelKey: string;
  /** Display text; null renders as "not provided". */
  mine: string | null;
  theirs: string | null;
  state: DeltaState;
  /** Signed numeric gap in the row's unit (positive = twin ahead). */
  gap: number | null;
  unit: "gpa4" | "ielts" | "toefl" | "sat" | "count" | "text" | null;
  /** True when the row is a real comparison; false when a side has no data. */
  comparable: boolean;
}

/* -------------------------------------------------------------------------- */
/* Actions                                                                     */
/* -------------------------------------------------------------------------- */

export type TwinActionId =
  | "raise_gpa"
  | "raise_english"
  | "add_standardized"
  | "add_research"
  | "add_activity_evidence"
  | "target_scholarship"
  | "align_major";

export interface TwinAction {
  id: TwinActionId;
  /** 1 = do this first. Always 1..3, at most three actions. */
  priority: number;
  /** Goal pillar for `POST /api/goals`. */
  pillar: "academic" | "activities" | "skills" | "career";
  /** Destination the "open" link points at (a nav id). */
  tab: string;
  /** Values for the translated title/body (ICU placeholders). */
  params: Record<string, string | number>;
  /** Why this action, as a machine key: `twin.actions.<id>.why`. */
  whyKey: string;
  /** How many concrete steps the generated goal carries. */
  steps: number;
  /** Sort weight — higher is more urgent. Not shown to the student. */
  weight: number;
}

export interface TwinStrategy {
  twin: TwinInput | null;
  /** The overlap heuristic, or null when the story carries none. */
  twinScore: number | null;
  reasons: string[];
  deltas: TwinDelta[];
  actions: TwinAction[];
  /** Delta ids where the student has no data at all (drives the nudge copy). */
  unknowns: DeltaId[];
  /** True when there is nothing honest to compare yet. */
  insufficient: boolean;
}

/* -------------------------------------------------------------------------- */
/* Helpers                                                                     */
/* -------------------------------------------------------------------------- */

const clean = (value: string | null | undefined): string => (value ?? "").toString().trim();

/** Activity fields on the student profile that count as recorded evidence. */
const ACTIVITY_FIELDS: (keyof TwinMeInput)[] = [
  "researchExperience",
  "projects",
  "leadership",
  "volunteering",
  "olympiads",
  "awards",
  "competitions",
  "certificates",
  "extracurriculars",
  "clubs",
  "sports",
];

/** How many of the student's activity fields hold anything at all. */
export function countActivityFields(me: TwinMeInput): number {
  return ACTIVITY_FIELDS.filter((field) => clean(String(me[field] ?? "")).length > 0).length;
}

function fixed(value: number, decimals: number): string {
  return value.toFixed(decimals);
}

function stateFromGap(gap: number | null, tieBand: number): DeltaState {
  if (gap == null || !Number.isFinite(gap)) return "unknown";
  if (Math.abs(gap) <= tieBand) return "even";
  return gap > 0 ? "behind" : "ahead";
}

/* -------------------------------------------------------------------------- */
/* Twin selection                                                              */
/* -------------------------------------------------------------------------- */

/** How much comparable evidence a story carries — the tie-break on overlap. */
function evidenceCount(story: TwinInput): number {
  let n = 0;
  if (story.gpa != null && story.gpaScale != null) n += 1;
  if (story.ielts != null) n += 1;
  if (story.toefl != null) n += 1;
  if (story.sat != null) n += 1;
  if ((story.activities ?? []).length) n += 1;
  if ((story.awards ?? []).length) n += 1;
  if (clean(story.scholarshipName)) n += 1;
  if (clean(story.advice)) n += 1;
  return n;
}

/**
 * Pick the admitted twin: highest overlap first, then the story with the most
 * comparable evidence, then the most recent intake, then id — so the choice is
 * stable between renders and never random.
 */
export function pickTwin(stories: readonly TwinInput[] | null | undefined): TwinInput | null {
  const list = (stories ?? []).filter((story) => story && typeof story === "object");
  if (list.length === 0) return null;
  const sorted = [...list].sort((a, b) => {
    const scoreA = a.twin ?? -1;
    const scoreB = b.twin ?? -1;
    if (scoreB !== scoreA) return scoreB - scoreA;
    const evA = evidenceCount(a);
    const evB = evidenceCount(b);
    if (evB !== evA) return evB - evA;
    const yearA = a.intakeYear ?? 0;
    const yearB = b.intakeYear ?? 0;
    if (yearB !== yearA) return yearB - yearA;
    return (a.id ?? 0) - (b.id ?? 0);
  });
  return sorted[0];
}

/* -------------------------------------------------------------------------- */
/* The comparison                                                              */
/* -------------------------------------------------------------------------- */

/**
 * Build the "You vs. Admitted Twin" delta rows. A row is `comparable` only
 * when both sides actually have data in the same unit.
 */
export function buildTwinDeltas(me: TwinMeInput, twin: TwinInput): TwinDelta[] {
  const deltas: TwinDelta[] = [];

  // --- GPA (always on the 4.0 scale, never on the raw numbers) --------------
  const myGpa = gpaTo40Scale(me.gpa, me.gpaScale);
  const twinGpa = gpaTo40Scale(twin.gpa, twin.gpaScale);
  const gpaGap = myGpa != null && twinGpa != null ? twinGpa - myGpa : null;
  deltas.push({
    id: "gpa",
    labelKey: "gpa",
    mine: myGpa != null ? `${fixed(myGpa, 2)} / 4.00` : null,
    theirs: twinGpa != null ? `${fixed(twinGpa, 2)} / 4.00` : null,
    state: stateFromGap(gpaGap, 0.05),
    gap: gpaGap,
    unit: "gpa4",
    comparable: gpaGap != null,
  });

  // --- English: IELTS with IELTS, TOEFL with TOEFL — never converted --------
  const myIelts = me.ieltsScore ?? null;
  const twinIelts = twin.ielts ?? null;
  const myToefl = me.toeflScore ?? null;
  const twinToefl = twin.toefl ?? null;
  const ieltsGap = myIelts != null && twinIelts != null ? twinIelts - myIelts : null;
  const toeflGap = myToefl != null && twinToefl != null ? twinToefl - myToefl : null;
  const useToefl = ieltsGap == null && toeflGap != null;
  const englishGap = useToefl ? toeflGap : ieltsGap;
  deltas.push({
    id: "english",
    labelKey: useToefl ? "englishToefl" : "englishIelts",
    mine: useToefl
      ? myToefl != null ? String(myToefl) : null
      : myIelts != null ? fixed(myIelts, 1) : null,
    theirs: useToefl
      ? twinToefl != null ? String(twinToefl) : null
      : twinIelts != null ? fixed(twinIelts, 1) : null,
    state: stateFromGap(englishGap, useToefl ? 2 : 0.25),
    gap: englishGap,
    unit: useToefl ? "toefl" : "ielts",
    comparable: englishGap != null,
  });

  // --- Standardized test: SAT with SAT (ACT stays on its own row) -----------
  const mySat = me.satScore ?? null;
  const twinSat = twin.sat ?? null;
  const satGap = mySat != null && twinSat != null ? twinSat - mySat : null;
  deltas.push({
    id: "standardized",
    labelKey: "sat",
    mine: mySat != null ? String(mySat) : null,
    theirs: twinSat != null ? String(twinSat) : null,
    state: stateFromGap(satGap, 30),
    gap: satGap,
    unit: "sat",
    comparable: satGap != null,
  });

  // --- Field of study -------------------------------------------------------
  const myMajor = clean(me.targetMajor);
  const twinMajor = clean(twin.major);
  const majorEqual = !!myMajor && !!twinMajor && myMajor.toLowerCase() === twinMajor.toLowerCase();
  deltas.push({
    id: "major",
    labelKey: "major",
    mine: myMajor || null,
    theirs: twinMajor || null,
    state: !myMajor || !twinMajor ? "unknown" : majorEqual ? "even" : "behind",
    gap: null,
    unit: "text",
    comparable: !!myMajor && !!twinMajor,
  });

  // --- Degree level ---------------------------------------------------------
  const myDegree = clean(me.degreeLevel);
  const twinDegree = clean(twin.degreeLevel);
  deltas.push({
    id: "degreeLevel",
    labelKey: "degreeLevel",
    mine: myDegree || null,
    theirs: twinDegree || null,
    state: !myDegree || !twinDegree ? "unknown" : myDegree.toLowerCase() === twinDegree.toLowerCase() ? "even" : "unknown",
    gap: null,
    unit: "text",
    comparable: !!myDegree && !!twinDegree,
  });

  // --- Research output ------------------------------------------------------
  const myPublications = me.researchPublications != null ? Number(me.researchPublications) : null;
  const myResearchText = clean(me.researchExperience);
  const myResearch = myPublications != null && Number.isFinite(myPublications) ? myPublications : myResearchText ? 1 : null;
  // The twin's research evidence is what they published in their story.
  const twinResearchItems = (twin.activities ?? []).filter((item) =>
    /research|thesis|paper|publication|lab|laboratory|projek|ilmiy|тадқиқ|исслед/i.test(clean(item))
  );
  const twinResearch = twinResearchItems.length > 0 ? twinResearchItems.length : null;
  const researchGap = myResearch != null && twinResearch != null ? twinResearch - myResearch : null;
  deltas.push({
    id: "research",
    labelKey: "research",
    mine: myResearch != null ? String(myResearch) : null,
    theirs: twinResearch != null ? String(twinResearch) : twinResearchItems.length ? String(twinResearchItems.length) : null,
    state: stateFromGap(researchGap, 0),
    gap: researchGap,
    unit: "count",
    comparable: researchGap != null,
  });

  // --- Recorded activity evidence -------------------------------------------
  const myActivities = countActivityFields(me);
  const twinActivities = (twin.activities ?? []).filter((item) => clean(item)).length;
  const activityGap = twinActivities > 0 ? twinActivities - myActivities : null;
  deltas.push({
    id: "activities",
    labelKey: "activities",
    mine: myActivities > 0 ? String(myActivities) : "0",
    theirs: twinActivities > 0 ? String(twinActivities) : null,
    state: stateFromGap(activityGap, 0),
    gap: activityGap,
    unit: "count",
    comparable: activityGap != null,
  });

  return deltas;
}

/* -------------------------------------------------------------------------- */
/* The three actions                                                           */
/* -------------------------------------------------------------------------- */

/**
 * Turn the deltas into concrete next steps, most urgent first, and keep at
 * most three — a blueprint with eleven items is not a blueprint.
 */
export function buildTwinActions(me: TwinMeInput, twin: TwinInput, deltas: TwinDelta[]): TwinAction[] {
  const candidates: TwinAction[] = [];
  const byId = new Map(deltas.map((delta) => [delta.id, delta]));

  const gpa = byId.get("gpa");
  if (gpa?.comparable && gpa.state === "behind" && gpa.gap != null) {
    candidates.push({
      id: "raise_gpa",
      priority: 0,
      pillar: "academic",
      tab: "profile/readiness",
      params: {
        current: gpa.mine ?? "",
        target: gpa.theirs ?? "",
        gap: fixed(gpa.gap, 2),
      },
      whyKey: "raise_gpa",
      steps: 3,
      weight: 100 + gpa.gap * 20,
    });
  }

  const english = byId.get("english");
  if (english?.comparable && english.state === "behind" && english.gap != null) {
    const isToefl = english.unit === "toefl";
    candidates.push({
      id: "raise_english",
      priority: 0,
      pillar: "skills",
      tab: "study-plan/tests",
      params: {
        test: isToefl ? "TOEFL" : "IELTS",
        current: english.mine ?? "",
        target: english.theirs ?? "",
        gap: isToefl ? String(Math.round(english.gap)) : fixed(english.gap, 1),
      },
      whyKey: "raise_english",
      steps: 3,
      weight: 90 + (isToefl ? english.gap / 4 : english.gap * 12),
    });
  }

  const sat = byId.get("standardized");
  // Only actionable when the twin's SAT is a real target and the student either
  // has no score or a lower one. A missing score on the student's side is a
  // "consider sitting it" nudge, not a claimed gap.
  if (sat?.theirs && (sat.state === "behind" || sat.state === "unknown")) {
    candidates.push({
      id: "add_standardized",
      priority: 0,
      pillar: "academic",
      tab: "study-plan/tests",
      params: { target: sat.theirs, current: sat.mine ?? "" },
      whyKey: "add_standardized",
      steps: 3,
      weight: sat.state === "behind" ? 70 : 40,
    });
  }

  const research = byId.get("research");
  const twinResearchItems = (twin.activities ?? []).filter((item) =>
    /research|thesis|paper|publication|lab|laboratory|projek|ilmiy|тадқиқ|исслед/i.test(clean(item))
  );
  if (research?.comparable && research.state === "behind" && twinResearchItems.length > 0) {
    candidates.push({
      id: "add_research",
      priority: 0,
      pillar: "activities",
      tab: "profile/activities",
      params: {
        example: clean(twinResearchItems[0]).slice(0, 120),
        gap: String(Math.max(0, research.gap ?? 0)),
      },
      whyKey: "add_research",
      steps: 3,
      weight: 80,
    });
  }

  const activities = byId.get("activities");
  if (activities?.comparable && activities.state === "behind") {
    candidates.push({
      id: "add_activity_evidence",
      priority: 0,
      pillar: "activities",
      tab: "profile/activities",
      params: {
        current: activities.mine ?? "0",
        target: activities.theirs ?? "",
        gap: String(Math.max(0, activities.gap ?? 0)),
      },
      whyKey: "add_activity_evidence",
      steps: 3,
      weight: 60,
    });
  }

  const scholarship = clean(twin.scholarshipName);
  if (scholarship) {
    candidates.push({
      id: "target_scholarship",
      priority: 0,
      pillar: "career",
      tab: "scholarships/browse",
      params: {
        name: scholarship.slice(0, 140),
        amount: twin.scholarshipAmountUsd != null ? Math.round(Number(twin.scholarshipAmountUsd)).toLocaleString("en-US") : "",
        university: clean(twin.admittedUniversity).slice(0, 140),
      },
      whyKey: "target_scholarship",
      steps: 3,
      weight: twin.scholarshipAmountUsd != null ? 75 : 55,
    });
  }

  const major = byId.get("major");
  if (major?.comparable && major.state === "behind" && clean(twin.major)) {
    candidates.push({
      id: "align_major",
      priority: 0,
      pillar: "academic",
      tab: "universities/browse",
      params: { theirs: clean(twin.major).slice(0, 100), mine: clean(me.targetMajor).slice(0, 100) },
      whyKey: "align_major",
      steps: 3,
      weight: 35,
    });
  }

  // Highest weight first; ties keep the canonical id order so the output is
  // stable across renders.
  const order: TwinActionId[] = [
    "raise_gpa",
    "raise_english",
    "add_research",
    "target_scholarship",
    "add_standardized",
    "add_activity_evidence",
    "align_major",
  ];
  return candidates
    .sort((a, b) => b.weight - a.weight || order.indexOf(a.id) - order.indexOf(b.id))
    .slice(0, 3)
    .map((action, index) => ({ ...action, priority: index + 1 }));
}

/* -------------------------------------------------------------------------- */
/* The blueprint                                                               */
/* -------------------------------------------------------------------------- */

/**
 * The full "You vs. Admitted Twin" blueprint for one story.
 * `insufficient: true` when there is no twin at all — the UI then explains what
 * to record instead of rendering an empty comparison.
 */
export function buildTwinStrategy(
  me: TwinMeInput | null | undefined,
  twin: TwinInput | null | undefined
): TwinStrategy {
  if (!twin) {
    return {
      twin: null,
      twinScore: null,
      reasons: [],
      deltas: [],
      actions: [],
      unknowns: [],
      insufficient: true,
    };
  }
  const mine = me ?? {};
  const deltas = buildTwinDeltas(mine, twin);
  const actions = buildTwinActions(mine, twin, deltas);
  return {
    twin,
    twinScore: twin.twin != null && Number.isFinite(Number(twin.twin)) ? Math.round(Number(twin.twin)) : null,
    reasons: (twin.reasons ?? []).map((reason) => clean(reason)).filter(Boolean),
    deltas,
    actions,
    unknowns: deltas.filter((delta) => !delta.comparable).map((delta) => delta.id),
    insufficient: deltas.every((delta) => !delta.comparable) && actions.length === 0,
  };
}

/**
 * The text a synced goal carries. Kept next to the engine so the goal the
 * student saves matches the action card they clicked, in whatever language the
 * UI rendered it (the caller passes already-translated strings).
 */
export function twinGoalPayload(
  action: TwinAction,
  translated: { title: string; steps: string[] }
): { pillar: TwinAction["pillar"]; title: string; steps: string[] } {
  return {
    pillar: action.pillar,
    title: translated.title.slice(0, 120),
    steps: translated.steps.map((step) => step.slice(0, 300)).slice(0, 12),
  };
}
