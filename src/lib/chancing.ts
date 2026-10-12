/**
 * Admission chancing engine.
 *
 * WHAT THIS IS — AND WHAT IT IS NOT
 * ---------------------------------
 * `src/lib/matching.ts` answers "how well does this student FIT this
 * programme?" → the **Fit score** (e.g. 78%). That is a requirements/affordability
 * match, and a great fit can still be a 12% admit.
 *
 * This module historically answered "what is the estimated probability of
 * being ADMITTED?" → the **Admission estimate** (e.g. an 18–27% range) with
 * sub-scores and an explicit "Why?".
 *
 * STUDENT-FACING PROBABILITY POLICY (2026-10 task constraint):
 * an admission probability may only be computed/displayed for students once
 * the project has a VALIDATED METHODOLOGY AND sufficient outcome data. That
 * does not exist yet — the consented outcomes corpus is far below any
 * validation threshold and no model has been validated. Therefore:
 *   • student-facing APIs (GET /api/chancing, /api/planning,
 *     /api/ai/admissions-advisor) return `probability: ADMISSION_PROBABILITY`
 *     and must NOT expose the numeric `admission` range;
 *   • the UI labels the admission-probability dimension "unavailable" and
 *     shows only the fit score and the requirement signals;
 *   • `estimateAdmissionChance` remains a PURE, unit-tested internal engine
 *     (its sub-scores/positives/negatives power the signals shown to students,
 *     and a future validated methodology will build on it) — it must not be
 *     surfaced to students as a percentage.
 *
 * Everything here is pure and deterministic so it can be unit-tested without a
 * database (see scripts/check-chancing.ts).
 */

import { undergraduateTestApplies } from "./degreeLevels";
import { gpaTo40Scale } from "./gpa";
import { clamp, interpolate, ratio, roundTo, saturatingCurve, weightedMean } from "./scoring";
import { subjectSimilarity } from "./subjectAffinity";

/**
 * The single source of truth for student-facing probability availability.
 * Any route/UI that mentions admission probability must read this — never
 * hardcode the state.
 */
export const ADMISSION_PROBABILITY = {
  available: false,
  reason: "no-validated-methodology",
} as const;

// ---------------------------------------------------------------------------
// Inputs
// ---------------------------------------------------------------------------

export interface ChancingProfile {
  gpa?: number | null;
  gpaScale?: number | null;
  ieltsScore?: number | null;
  toeflScore?: number | null;
  satScore?: number | null;
  actScore?: number | null;
  greScore?: number | null;
  duolingoScore?: number | null;
  country?: string | null;
  targetMajor?: string | null;
  degreeLevel?: string | null;
  extracurriculars?: string | null;
  leadership?: string | null;
  volunteering?: string | null;
  sports?: string | null;
  clubs?: string | null;
  researchExperience?: string | null;
  projects?: string | null;
  olympiads?: string | null;
  awards?: string | null;
  competitions?: string | null;
  certificates?: string | null;
  workExperienceYears?: number | null;
  researchPublications?: number | null;
  /**
   * Rows from the Activities pane (`student_activities`). The profile's own
   * text columns are what the student typed in the profile; this is the
   * structured portfolio they maintain on the Activities tab. Both describe
   * the SAME person, so readiness must count both — otherwise adding an
   * activity changes nothing and the portfolio looks disconnected.
   */
  savedActivities?: { category?: string | null; role?: string | null; achievements?: string | null }[] | null;
  budgetAnnualUsd?: number | null;
  familyIncomeUsd?: number | null;
  careerGoal?: string | null;
  graduationYear?: number | null;
  needScholarship?: boolean | null;
  needsFinancialAid?: boolean | null;
  requiresFullScholarship?: boolean | null;
}

export interface ChancingUniversity {
  id: number;
  name: string;
  country?: string | null;
  worldRanking?: number | null;
  minGpa?: number | null;
  minIelts?: number | null;
  minSat?: number | null;
  /** Catalogue degree level — SAT/ACT only apply to undergraduate entry. */
  degreeLevel?: string | null;
  /** 0–100 (percent). NULL = not published. */
  acceptanceRate?: number | null;
  programMajor?: string | null;
  annualTuitionUsd?: number | null;
  annualLivingEstUsd?: number | null;
  internationalStudentsPercentage?: number | null;
}

/** ScholarBridge's own outcomes for one university (consented rows only). */
export interface OutcomeSample {
  accepted: number;
  rejected: number;
  waitlisted: number;
  deferred: number;
}

export interface SubScores {
  academicFit: number;
  testFit: number;
  extracurricularFit: number;
  majorFit: number;
  internationalFactors: number;
  financialFit: number;
}

export type ChancingBand = "safety" | "target" | "reach" | "long-reach";
export type DataBasis = "public-estimate" | "hybrid" | "scholarbridge-data";

export interface ChancingResult {
  universityId: number;
  universityName: string;
  /** Fit score from matching.ts (passed through so the UI can show both). */
  fitScore: number | null;
  admission: {
    low: number;
    high: number;
    mid: number;
    band: ChancingBand;
    label: string;
  };
  subScores: SubScores;
  positives: string[];
  negatives: string[];
  /** 0–100: how much evidence backs this number. */
  confidence: number;
  dataBasis: DataBasis;
  /** Consented ScholarBridge outcomes behind the estimate (0 = none yet). */
  sampleSize: number;
  /**
   * For `public-estimate`: whether the baseline came from the university's
   * published acceptance rate or from the ranking-tier fallback. The UI must
   * not claim "published acceptance data" when only a rank exists.
   */
  basisSource: "acceptance-rate" | "ranking-tier";
  /** Shown under the number — never imply certainty. */
  disclaimer: string;
}

// ---------------------------------------------------------------------------
// Small helpers
// ---------------------------------------------------------------------------

// `clamp` and the rounding helpers come from src/lib/scoring.ts — one
// definition of "clamped" and "rounded", shared with matching.ts and the
// readiness engine. `round` stays as the integer-only reader.
const round = (v: number) => Math.round(v);

/** Parse a JSON array column (or a comma-separated legacy string) → items. */
export function parseListColumn(raw: unknown): string[] {
  if (typeof raw !== "string" || !raw.trim()) return [];
  const text = raw.trim();
  if (text.startsWith("[")) {
    try {
      const parsed = JSON.parse(text);
      if (Array.isArray(parsed)) {
        return parsed
          .map((item) =>
            typeof item === "string"
              ? item
              : item && typeof item === "object"
                ? String((item as Record<string, unknown>).title ?? (item as Record<string, unknown>).name ?? JSON.stringify(item))
                : String(item)
          )
          .map((s) => s.trim())
          .filter(Boolean);
      }
    } catch {
      // fall through to comma splitting
    }
  }
  return text
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

/**
 * GPA normalised to a 4.0 scale.
 *
 * Delegates to the ONE canonical implementation (src/lib/gpa.ts) that the
 * university matcher and the recommender already use. The previous local copy
 * clamped an unscaled "85" to a perfect 4.0 — i.e. it INVENTED a top GPA for a
 * student whose scale is unknown — while the matcher correctly reported
 * "unknown". Same profile, two answers. Now there is exactly one rule:
 * an explicit scale converts proportionally, a bare value ≤ 4 is comparable,
 * anything else is null (unknown, never a 4.0).
 */
export function normalizedGpa(profile: ChancingProfile): number | null {
  return gpaTo40Scale(profile.gpa, profile.gpaScale);
}

/** Rough word-overlap similarity (0–1) between two free-text majors. */
export function majorSimilarity(a?: string | null, b?: string | null): number {
  const norm = (s?: string | null) =>
    (s || "")
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, " ")
      .split(/\s+/)
      .filter((w) => w.length > 2);
  const A = norm(a);
  const B = norm(b);
  if (!A.length || !B.length) return 0.5; // unknown → neutral, never punitive
  const setB = new Set(B);
  const overlap = A.filter((w) => setB.has(w)).length;
  return clamp(overlap / Math.min(A.length, B.length), 0, 1);
}

/** Count distinct extracurricular/achievement items across all columns. */
/** Roles that make an activity a leadership role (case-insensitive). */
const LEADERSHIP_ROLE =
  /\b(lead|leader|president|vice[- ]?president|captain|head|founder|co-?founder|chair|coordinator|director|manager|mentor)\b/i;

export function countActivities(profile: ChancingProfile): {
  activities: number;
  leadership: number;
  research: number;
  awards: number;
} {
  const activities = [
    ...parseListColumn(profile.extracurriculars),
    ...parseListColumn(profile.volunteering),
    ...parseListColumn(profile.sports),
    ...parseListColumn(profile.clubs),
    ...parseListColumn(profile.projects),
  ].length;
  const leadership = parseListColumn(profile.leadership).length;
  const research =
    parseListColumn(profile.researchExperience).length + Number(profile.researchPublications ?? 0);
  const saved = profile.savedActivities ?? [];
  const savedLeadership = saved.filter(
    (a) =>
      a.category === "leadership" ||
      LEADERSHIP_ROLE.test(String(a.role ?? ""))
  ).length;
  const savedResearch = saved.filter((a) => a.category === "research").length;
  // A competition ENTRY is an activity; it only becomes an award once the
  // student recorded an achievement for it. Counting entries as awards would
  // inflate the score without evidence.
  const savedAwards = saved.filter(
    (a) => a.category === "competition" && String(a.achievements ?? "").trim().length > 0
  ).length;

  const awards = [
    ...parseListColumn(profile.awards),
    ...parseListColumn(profile.olympiads),
    ...parseListColumn(profile.competitions),
    ...parseListColumn(profile.certificates),
  ].length + savedAwards;
  return {
    activities: activities + saved.length,
    leadership: leadership + savedLeadership,
    research: research + savedResearch,
    awards,
  };
}

// ---------------------------------------------------------------------------
// Selectivity baseline
// ---------------------------------------------------------------------------

/**
 * Baseline admit probability.
 * The university's own acceptance rate wins when published; otherwise the
 * world-ranking tier stands in (deliberately conservative — it is better to
 * under-promise than to tell a student they are safe when we do not know).
 */
export function baselineProbability(uni: ChancingUniversity): {
  p: number;
  source: "acceptance-rate" | "ranking-tier";
} {
  const rate = Number(uni.acceptanceRate);
  if (Number.isFinite(rate) && rate > 0 && rate <= 100) {
    return { p: clamp(rate / 100, 0.01, 0.95), source: "acceptance-rate" };
  }
  const rank = Number(uni.worldRanking);
  if (!Number.isFinite(rank) || rank <= 0) return { p: 0.45, source: "ranking-tier" };
  if (rank <= 25) return { p: 0.06, source: "ranking-tier" };
  if (rank <= 50) return { p: 0.1, source: "ranking-tier" };
  if (rank <= 100) return { p: 0.16, source: "ranking-tier" };
  if (rank <= 250) return { p: 0.28, source: "ranking-tier" };
  if (rank <= 500) return { p: 0.4, source: "ranking-tier" };
  return { p: 0.55, source: "ranking-tier" };
}

// ---------------------------------------------------------------------------
// Sub-scores (0–100) — each explains one dimension in the UI
// ---------------------------------------------------------------------------

function academicSubScore(profile: ChancingProfile, uni: ChancingUniversity): {
  score: number;
  factor: number;
  notes: { positive?: string; negative?: string };
} {
  const gpa = normalizedGpa(profile);
  if (gpa == null) {
    return {
      score: 50,
      factor: 0.9,
      notes: { negative: "No GPA submitted — add it for a real estimate" },
    };
  }
  // Published minimum when available; otherwise the tier-typical GPA (an
  // explicit, documented inference from the ranking — flagged in the note so
  // the student is never told a plain number came from the university).
  const published = Number(uni.minGpa) > 0;
  const target = published
    ? Number(uni.minGpa)
    : (() => {
        const rank = Number(uni.worldRanking);
        if (!Number.isFinite(rank) || rank <= 0) return 3.0;
        if (rank <= 50) return 3.8;
        if (rank <= 150) return 3.6;
        if (rank <= 350) return 3.3;
        return 3.0;
      })();

  const delta = gpa - target;
  // Continuous grade: at the target the dimension sits at 60/100, and each
  // 0.3 of GPA is worth a further ~18 points up to the ceiling, or a ~18-point
  // loss below it. No threshold cliffs.
  const score = interpolate(delta, [
    { x: -1.2, y: 8 },
    { x: -0.6, y: 28 },
    { x: -0.3, y: 44 },
    { x: 0, y: 60 },
    { x: 0.3, y: 78 },
    { x: 0.6, y: 90 },
    { x: 1.0, y: 100 },
  ]);
  const factor = clamp(1 + delta * 0.9, 0.3, 2.3);
  const notes: { positive?: string; negative?: string } = {};
  const source = published ? `the published ${target.toFixed(2)} minimum` : `the tier-typical ${target.toFixed(2)} range`;

  if (delta >= 0.3) {
    notes.positive = `GPA ${gpa.toFixed(2)} is well above ${source}`;
  } else if (delta >= 0) {
    notes.positive = `GPA ${gpa.toFixed(2)} meets ${source}`;
  } else if (delta >= -0.3) {
    notes.negative = `GPA ${gpa.toFixed(2)} is slightly below ${source}`;
  } else {
    notes.negative = `GPA ${gpa.toFixed(2)} is ${Math.abs(delta).toFixed(2)} below ${source}`;
  }
  return { score: roundTo(score, 1), factor, notes };
}

function testSubScore(profile: ChancingProfile, uni: ChancingUniversity): {
  score: number;
  factor: number;
  notes: { positive?: string; negative?: string };
} {
  const minIelts = Number(uni.minIelts) > 0 ? Number(uni.minIelts) : null;
  const minSat = Number(uni.minSat) > 0 ? Number(uni.minSat) : null;
  const ielts = Number(profile.ieltsScore) > 0 ? Number(profile.ieltsScore) : null;
  const toefl = Number(profile.toeflScore) > 0 ? Number(profile.toeflScore) : null;
  const sat = Number(profile.satScore) > 0 ? Number(profile.satScore) : null;
  const act = Number(profile.actScore) > 0 ? Number(profile.actScore) : null;
  const duolingo = Number(profile.duolingoScore) > 0 ? Number(profile.duolingoScore) : null;

  const notes: { positive?: string; negative?: string } = {};
  const parts: number[] = [];
  let factor = 1;

  // English proficiency: IELTS → TOEFL → Duolingo as substitutes.
  if (ielts || toefl || duolingo) {
    const equivalentIelts =
      ielts ??
      (toefl ? clamp((toefl - 40) / 12, 0, 9) : null) ??
      (duolingo ? clamp(duolingo / 15, 0, 9) : null);
    if (equivalentIelts != null) {
      if (minIelts) {
        // Graded against the university's own published bar.
        const delta = equivalentIelts - minIelts;
        parts.push(
          interpolate(delta, [
            { x: -1.5, y: 12 },
            { x: -0.5, y: 35 },
            { x: 0, y: 65 },
            { x: 0.5, y: 85 },
            { x: 1.5, y: 100 },
          ])
        );
        if (delta >= 0.5) {
          notes.positive = `English score ${equivalentIelts.toFixed(1)} is above the ${minIelts} requirement`;
          factor *= 1.1;
        } else if (delta >= 0) {
          notes.positive = `English score meets the ${minIelts} requirement`;
          factor *= 1.03;
        } else {
          notes.negative = `English score ${equivalentIelts.toFixed(1)} is below the ${minIelts} requirement`;
          factor *= clamp(1 + delta * 0.5, 0.5, 1);
        }
      } else {
        // No published minimum: score on the absolute scale and SAY SO —
        // inventing a 6.5 bar (the old behaviour) compared every student with
        // a number the university never published.
        parts.push(
          interpolate(equivalentIelts, [
            { x: 5, y: 20 },
            { x: 6, y: 45 },
            { x: 6.5, y: 62 },
            { x: 7, y: 78 },
            { x: 7.5, y: 90 },
            { x: 8, y: 100 },
          ])
        );
        notes.positive = `English score ${equivalentIelts.toFixed(1)} (no official minimum published by this university)`;
      }
    }
  } else {
    parts.push(35);
    notes.negative = "No English test submitted (IELTS/TOEFL/Duolingo)";
    factor *= minIelts ? 0.7 : 0.85;
  }

  // Standardised test — judged ONLY when the institution actually publishes a
  // minimum AND the test can be part of this student's admission. SAT/ACT are
  // undergraduate tests: a graduate applicant (or a graduate-only institution)
  // is neither credited nor penalised, and a test score is never measured
  // against an invented "typical" bar when no minimum is published.
  const satApplies = minSat != null && undergraduateTestApplies(uni.degreeLevel, profile.degreeLevel);
  if (satApplies && (sat || act)) {
    const equivalentSat = sat ?? (act ? clamp(act * 40 + 180, 400, 1600) : null);
    if (equivalentSat != null) {
      const delta = equivalentSat - minSat;
      parts.push(
        interpolate(delta, [
          { x: -300, y: 15 },
          { x: -100, y: 45 },
          { x: 0, y: 65 },
          { x: 100, y: 85 },
          { x: 300, y: 100 },
        ])
      );
      if (delta >= 0) notes.positive ??= `Test score ${equivalentSat} is above the published ${minSat}`;
      else notes.negative ??= `Test score ${equivalentSat} is below the published ${minSat}`;
      factor *= clamp(1 + (delta / 200) * 0.12, 0.75, 1.25);
    }
  } else if (satApplies) {
    parts.push(40);
    notes.negative = `No SAT/ACT submitted — this programme lists ${minSat}`;
    factor *= 0.8;
  } else {
    // Not applicable / nothing published: neutral, and never invented.
    parts.push(60);
  }

  const score = weightedMean(parts) ?? 60;
  return { score: roundTo(score, 1), factor, notes };
}

function extracurricularSubScore(profile: ChancingProfile): {
  score: number;
  factor: number;
  notes: { positive?: string; negative?: string };
} {
  const { activities, leadership, research, awards } = countActivities(profile);
  const years = Number(profile.workExperienceYears ?? 0);

  // Saturating curves instead of hard divisions: the first two activities and
  // the first leadership role carry most of the signal, and the 20th activity
  // cannot inflate the score. Every extra item still moves the number.
  const breadth = saturatingCurve(activities, 6);
  const depth = saturatingCurve(leadership * 2 + research * 2 + awards, 6);
  const experience = saturatingCurve(years, 3);

  const score = roundTo(clamp(20 + breadth * 40 + depth * 30 + experience * 10, 10, 100), 1);
  const factor = clamp(0.85 + breadth * 0.2 + depth * 0.35, 0.8, 1.45);

  const notes: { positive?: string; negative?: string } = {};
  if (leadership >= 2) notes.positive = `${leadership} leadership roles — committees read this as impact`;
  else if (activities >= 5) notes.positive = `${activities} activities show a well-rounded profile`;

  if (activities === 0 && leadership === 0 && awards === 0) {
    notes.negative = "Extracurricular profile is empty — selective programmes weigh this heavily";
  } else if (leadership === 0) {
    notes.negative = "No leadership roles listed — the most common gap for international applicants";
  } else if (depth < 0.4) {
    notes.negative = "Activities are broad but shallow — few multi-year commitments";
  }
  return { score, factor, notes };
}

function majorSubScore(profile: ChancingProfile, uni: ChancingUniversity): {
  score: number;
  factor: number;
  notes: { positive?: string; negative?: string };
} {
  // Synonym-aware, shared with the recommender and the university matcher:
  // "Computer Science" vs "Informatics & Data Engineering" is a RELATED field
  // (the fit engine already says so) — the plain word-overlap helper used to
  // call it "a shift from", contradicting the fit reasons in the same payload.
  const sim = subjectSimilarity(profile.targetMajor, uni.programMajor);
  const score = round(clamp(40 + sim * 60, 20, 100));
  const factor = clamp(0.85 + sim * 0.3, 0.85, 1.15);
  const notes: { positive?: string; negative?: string } = {};
  if (sim >= 0.66 && uni.programMajor) {
    notes.positive = `Strong ${profile.targetMajor || "major"} background for ${uni.programMajor}`;
  } else if (sim < 0.34 && uni.programMajor) {
    notes.negative = `Your major (${profile.targetMajor || "not set"}) is a shift from ${uni.programMajor}`;
  }
  return { score, factor, notes };
}

function internationalSubScore(profile: ChancingProfile, uni: ChancingUniversity): {
  score: number;
  factor: number;
  notes: { positive?: string; negative?: string };
} {
  const notes: { positive?: string; negative?: string } = {};
  const intlShare = Number(uni.internationalStudentsPercentage);
  const hasShare = Number.isFinite(intlShare) && intlShare > 0;

  // The share is graded continuously (a published 12% and a published 24%
  // are different situations, not the same "under 25%" bucket) and only
  // claims a note when the university actually publishes the figure.
  let score = hasShare
    ? interpolate(intlShare, [
        { x: 2, y: 52 },
        { x: 8, y: 60 },
        { x: 15, y: 72 },
        { x: 25, y: 85 },
        { x: 45, y: 92 },
      ])
    : 70;
  let factor = hasShare
    ? interpolate(intlShare, [
        { x: 2, y: 0.9 },
        { x: 8, y: 0.93 },
        { x: 15, y: 1.0 },
        { x: 25, y: 1.05 },
        { x: 45, y: 1.08 },
      ])
    : 1;

  if (hasShare) {
    if (intlShare >= 25) notes.positive = `${intlShare}% international students — an internationally oriented intake`;
    else if (intlShare < 8) notes.negative = `Only ${intlShare}% international students — a competitive pool for international applicants`;
  }

  const sameCountry =
    profile.country && uni.country && profile.country.trim().toLowerCase() === uni.country.trim().toLowerCase();
  if (sameCountry) {
    score = clamp(score + 10, 0, 100);
    factor *= 1.05;
  } else if (profile.country) {
    notes.negative ??= "International admission is more competitive than domestic";
    factor *= 0.95;
  }
  return { score: roundTo(score, 1), factor, notes };
}

function financialSubScore(profile: ChancingProfile, uni: ChancingUniversity): {
  score: number;
  factor: number;
  notes: { positive?: string; negative?: string };
} {
  const notes: { positive?: string; negative?: string } = {};
  const tuition = Number(uni.annualTuitionUsd);
  const living = Number(uni.annualLivingEstUsd);
  const hasTuition = Number.isFinite(tuition) && tuition > 0;
  const hasLiving = Number.isFinite(living) && living > 0;
  const totalCost = hasTuition ? tuition + (hasLiving ? living : 0) : null;
  const budget = Number(profile.budgetAnnualUsd);
  const hasBudget = Number.isFinite(budget) && budget > 0;

  // Nothing to compare on either side: this dimension is unknown, so it stays
  // near neutral and says so instead of pretending an assessment happened.
  let score = totalCost == null && !hasBudget ? 50 : 75;
  let factor = totalCost == null && !hasBudget ? 0.95 : 1;

  if (totalCost != null && hasBudget) {
    // Continuous: every extra percent of the cost covered is worth points,
    // and the award/penalty switches exactly at full coverage.
    const coverage = ratio(budget, totalCost) ?? 0;
    if (coverage >= 1) {
      score = interpolate(coverage, [
        { x: 1, y: 78 },
        { x: 1.15, y: 85 },
        { x: 1.4, y: 92 },
      ]);
      if (coverage >= 1.4) notes.positive = "Budget comfortably covers tuition and estimated living costs";
      else notes.positive = "Budget covers tuition and estimated living costs";
    } else {
      score = interpolate(coverage, [
        { x: 0, y: 40 },
        { x: 0.5, y: 45 },
        { x: 0.9, y: 58 },
        { x: 1, y: 78 },
      ]);
      notes.negative = `Budget $${budget.toLocaleString()} is below the estimated $${totalCost.toLocaleString()} annual cost`;
      factor *= 0.82;
    }
  } else if (totalCost == null && hasBudget) {
    notes.negative = "Budget is recorded, but the university has no verified full annual cost";
    factor *= 0.96;
  } else if (totalCost != null && !hasBudget) {
    notes.negative = "No annual budget submitted — affordability cannot be assessed";
    factor *= 0.9;
  } else {
    notes.negative = "No budget or verified cost submitted — financial fit is unknown";
  }

  // Need-aware admissions: requiring full funding genuinely narrows options.
  if (profile.requiresFullScholarship) {
    score = clamp(score - 20, 5, 100);
    factor *= 0.9;
    notes.negative = "Requiring a full scholarship narrows the pool of funding programmes";
  } else if (profile.needsFinancialAid || profile.needScholarship) {
    score = clamp(score - 8, 5, 100);
    notes.negative ??= "Financial aid is needed — confirm the university's funding policy";
  }

  // Family income is supporting context, never silently substituted for the
  // student's annual budget. When it is the only figure on file, how far it
  // covers the cost decides the deduction.
  const income = Number(profile.familyIncomeUsd);
  if (totalCost != null && !hasBudget && Number.isFinite(income) && income > 0 && income < totalCost) {
    const coverage = ratio(income, totalCost) ?? 0;
    score = clamp(score - roundTo((1 - coverage) * 10, 1), 5, 100);
    factor *= 0.9;
    notes.negative = `Recorded family income covers ${Math.round(coverage * 100)}% of the estimated $${totalCost.toLocaleString()} annual cost`;
  }
  return { score: roundTo(score, 1), factor, notes };
}

// ---------------------------------------------------------------------------
// Band + range
// ---------------------------------------------------------------------------

export function bandFor(mid: number): { band: ChancingBand; label: string } {
  if (mid >= 60) return { band: "safety", label: "Safety" };
  if (mid >= 30) return { band: "target", label: "Target" };
  if (mid >= 12) return { band: "reach", label: "Reach" };
  return { band: "long-reach", label: "Long reach" };
}

/**
 * Turn a point estimate into an honest range.
 * The range widens when the evidence is thin (no published acceptance rate,
 * no ScholarBridge outcomes, missing profile fields).
 */
export function rangeFor(mid: number, confidence: number): { low: number; high: number } {
  const spread = clamp(0.35 + (100 - confidence) / 200, 0.25, 0.7); // 25%–70%
  const low = clamp(mid * (1 - spread), 1, 99);
  const high = clamp(mid * (1 + spread), 1, 99);
  return { low: round(low), high: round(high) };
}

// ---------------------------------------------------------------------------
// Main entry point
// ---------------------------------------------------------------------------

export interface ChancingOptions {
  /** Fit score from matching.ts, shown alongside (never merged). */
  fitScore?: number | null;
  /** ScholarBridge's own consented outcomes for this university. */
  outcomes?: OutcomeSample | null;
}

export function estimateAdmissionChance(
  profile: ChancingProfile,
  uni: ChancingUniversity,
  options: ChancingOptions = {}
): ChancingResult {
  const positives: string[] = [];
  const negatives: string[] = [];
  const collect = (n: { positive?: string; negative?: string }) => {
    if (n.positive) positives.push(n.positive);
    if (n.negative) negatives.push(n.negative);
  };

  const academic = academicSubScore(profile, uni);
  const tests = testSubScore(profile, uni);
  const extra = extracurricularSubScore(profile);
  const major = majorSubScore(profile, uni);
  const international = internationalSubScore(profile, uni);
  const financial = financialSubScore(profile, uni);
  [academic, tests, extra, major, international, financial].forEach((part) => collect(part.notes));

  // --- Probability -------------------------------------------------------
  const base = baselineProbability(uni);
  // The sub-score multipliers are bounded individually, but their PRODUCT is
  // not — six 1.2× factors would multiply the baseline 3×. Without this cap a
  // strong applicant at a high-acceptance school saturates at the 0.95 ceiling,
  // which also makes the outcome blending below a no-op.
  const factor = clamp(
    academic.factor * tests.factor * extra.factor * major.factor * international.factor * financial.factor,
    0.3,
    1.8
  );
  // Clamp before blending: an unclamped p can sit far above 1, which would let
  // real ScholarBridge outcomes move the number by less than a rounding error.
  let p = clamp(base.p * factor, 0.01, 0.95);

  // --- Blend with ScholarBridge's own data -------------------------------
  const o = options.outcomes;
  const total = o ? o.accepted + o.rejected + o.waitlisted + o.deferred : 0;
  let sampleSize = 0;
  let dataBasis: DataBasis = "public-estimate";
  let confidence = base.source === "acceptance-rate" ? 62 : 45;

  if (o && total >= 5) {
    // Waitlisted counts as half an admit for the empirical rate.
    const empirical = (o.accepted + o.waitlisted * 0.5) / total;
    const weight = clamp(total / 60, 0.1, 0.7); // more outcomes → more weight
    p = weight * empirical + (1 - weight) * p;
    sampleSize = total;
    dataBasis = weight >= 0.5 ? "scholarbridge-data" : "hybrid";
    confidence = clamp(confidence + weight * 45, 0, 95);
  }

  // Profile completeness raises confidence; gaps lower it.
  const completeness = profileCompletenessRatio(profile);
  confidence = clamp(confidence * (0.7 + completeness * 0.45), 15, 95);

  p = clamp(p, 0.01, 0.95);
  const mid = round(p * 100);
  const { low, high } = rangeFor(mid, confidence);
  const { band, label } = bandFor(mid);

  if (base.source === "ranking-tier") {
    negatives.push("No published acceptance rate — the baseline comes from the ranking tier");
  }

  return {
    universityId: uni.id,
    universityName: uni.name,
    fitScore: typeof options.fitScore === "number" ? round(options.fitScore) : null,
    admission: { low, high, mid, band, label },
    subScores: {
      academicFit: academic.score,
      testFit: tests.score,
      extracurricularFit: extra.score,
      majorFit: major.score,
      internationalFactors: international.score,
      financialFit: financial.score,
    },
    positives,
    negatives,
    confidence: round(confidence),
    dataBasis,
    sampleSize,
    basisSource: base.source,
    disclaimer:
      dataBasis === "public-estimate"
        ? "Model estimate from published university data — not a guarantee. Your own outcomes data sharpens this over time."
        : `Blended with ${sampleSize} ScholarBridge application outcomes.`,
  };
}

// ---------------------------------------------------------------------------
// Profile strength dashboard (#22) + extracurricular analysis (#21)
// ---------------------------------------------------------------------------

/** 0–1: how much of the profile the student actually filled in. */
export function profileCompletenessRatio(profile: ChancingProfile): number {
  const checks = [
    Number(profile.gpa) > 0,
    Number(profile.gpaScale) > 0,
    Number(profile.ieltsScore) > 0 || Number(profile.toeflScore) > 0 || Number(profile.duolingoScore) > 0,
    Number(profile.satScore) > 0 || Number(profile.actScore) > 0,
    Boolean(profile.country),
    Boolean(profile.targetMajor),
    Number(profile.budgetAnnualUsd) > 0 || Number(profile.familyIncomeUsd) > 0 || profile.needsFinancialAid != null || profile.requiresFullScholarship != null || profile.needScholarship === true,
    countActivities(profile).activities > 0,
    parseListColumn(profile.leadership).length > 0,
    parseListColumn(profile.awards).length + parseListColumn(profile.olympiads).length > 0,
    Boolean(profile.careerGoal),
    Number(profile.graduationYear) > 0,
  ];
  return checks.filter(Boolean).length / checks.length;
}

export interface StrengthSection {
  key: string;
  label: string;
  /**
   * 0–100, rounded once from the precise value below. This is the number the
   * dashboard shows; `scorePrecise` is the same score before display rounding.
   */
  score: number;
  /** The same score at one-decimal precision (no display rounding). */
  scorePrecise: number;
  /**
   * True when the student has supplied none of the data this dimension needs.
   * An unknown dimension is EXCLUDED from the overall average — it is never
   * scored as a zero, and it is never filled in with a plausible value.
   */
  unknown?: boolean;
  /** 0–1 — how much of this dimension's evidence exists (1 = fully measured). */
  coverage: number;
  /** The concrete inputs still missing, most valuable first. */
  missing: string[];
}

export interface ProfileStrength {
  /** 0–100, rounded once from `overallPrecise`. */
  overall: number;
  /** The unrounded average (one decimal) — the "how precise" half of the pair. */
  overallPrecise: number;
  completeness: number;
  sections: StrengthSection[];
  /** Dimensions that had real data / dimensions the dashboard measures. */
  scoredSections: number;
  totalSections: number;
  /**
   * One plain sentence describing how the overall number was built, so it is
   * never read as an admission score. The UI prints this next to the number.
   */
  basis: string;
}

/**
 * One number per dimension, for the radar/bar dashboard.
 *
 * PRECISION RULES (2026-10)
 *   • every dimension is graded continuously between documented anchors
 *     (src/lib/scoring.ts) — no "0 until 5 activities, then full marks";
 *   • `coverage` states how much evidence the score stands on, so a 100 built
 *     from one test is visibly different from a 100 built from five;
 *   • a dimension with no data is `unknown` and is left OUT of the average
 *     instead of becoming a 0 (the old `score > 0` filter also dropped real
 *     zeros — a student who genuinely recorded no awards looked "not
 *     measured"). Zero evidence and zero result are now different states;
 *   • every score is returned twice: displayed (integer) and precise
 *     (one decimal), so the UI can show either without recomputing anything.
 */
export function profileStrength(
  profile: ChancingProfile,
  opts: { essayScore?: number | null } = {}
): ProfileStrength {
  const missing: Record<string, string[]> = {};
  const section = (
    key: string,
    label: string,
    precise: number | null,
    coverage: number,
    gaps: string[] = []
  ): StrengthSection => {
    missing[key] = gaps;
    const unknown = precise == null;
    const value = unknown ? 0 : clamp(precise, 0, 100);
    return {
      key,
      label,
      score: unknown ? 0 : Math.round(value),
      scorePrecise: roundTo(value, 1),
      unknown,
      coverage: clamp(coverage, 0, 1),
      missing: unknown ? gaps : [],
    };
  };

  // ---- Academics: the GPA on its own 0–4 scale ----------------------------
  const gpa = normalizedGpa(profile);
  const academics = gpa == null
    ? null
    : interpolate(gpa, [
        { x: 2.0, y: 0 },
        { x: 2.5, y: 18 },
        { x: 2.8, y: 32 },
        { x: 3.0, y: 45 },
        { x: 3.3, y: 66 },
        { x: 3.5, y: 78 },
        { x: 3.7, y: 88 },
        { x: 3.85, y: 95 },
        { x: 4.0, y: 100 },
      ]);

  // ---- Tests: each test is scored on ITS OWN scale ------------------------
  // A missing SAT is not a zero for a student whose target universities never
  // ask for it, and a TOEFL 100 is not "0 English" — the previous formula gave
  // a student with only IELTS 9 a hard 50/100 because the SAT half was empty.
  const ielts = Number(profile.ieltsScore) > 0 ? Number(profile.ieltsScore) : null;
  const toefl = Number(profile.toeflScore) > 0 ? Number(profile.toeflScore) : null;
  const duolingo = Number(profile.duolingoScore) > 0 ? Number(profile.duolingoScore) : null;
  const english = ielts ?? (toefl ? clamp((toefl - 40) / 12, 0, 9) : null) ?? (duolingo ? clamp(duolingo / 15, 0, 9) : null);
  const englishScore = english == null
    ? null
    : interpolate(english, [
        { x: 4.5, y: 5 },
        { x: 5.5, y: 25 },
        { x: 6, y: 45 },
        { x: 6.5, y: 62 },
        { x: 7, y: 78 },
        { x: 7.5, y: 90 },
        { x: 8, y: 100 },
      ]);
  const sat = Number(profile.satScore) > 0 ? Number(profile.satScore) : null;
  const act = Number(profile.actScore) > 0 ? Number(profile.actScore) : null;
  const standardised = sat ?? (act ? clamp(act * 40 + 180, 400, 1600) : null);
  const standardisedScore = standardised == null
    ? null
    : interpolate(standardised, [
        { x: 800, y: 5 },
        { x: 1000, y: 30 },
        { x: 1100, y: 45 },
        { x: 1200, y: 62 },
        { x: 1300, y: 78 },
        { x: 1400, y: 90 },
        { x: 1500, y: 97 },
        { x: 1600, y: 100 },
      ]);
  const tests = weightedMean([englishScore, standardisedScore]);
  const testCoverage = (englishScore == null ? 0 : 0.5) + (standardisedScore == null ? 0 : 0.5);

  // ---- Portfolio: breadth, depth, research and awards ----------------------
  const { activities, leadership, research, awards } = countActivities(profile);
  const portfolioEvidence = activities + leadership + research + awards;
  const extracurriculars = portfolioEvidence === 0
    ? null
    : clamp(55 * saturatingCurve(activities, 6) + 45 * saturatingCurve(leadership * 2 + research * 2 + awards, 6), 0, 100);
  const hasActivityRecord = activities > 0 || leadership > 0 || research > 0;
  // Leadership/awards are measured 0 when the student HAS an activity record
  // (a real zero) and unknown when there is no record at all to judge.
  const leadershipScore = hasActivityRecord ? clamp(100 * saturatingCurve(leadership, 3), 0, 100) : null;
  const awardsScore = hasActivityRecord ? clamp(100 * saturatingCurve(awards, 3), 0, 100) : null;
  const researchScore = hasActivityRecord
    ? clamp(100 * saturatingCurve(research + Number(profile.researchPublications ?? 0), 2), 0, 100)
    : null;

  // ---- Essays: the rubric score the student already earned -----------------
  const essayScore =
    typeof opts.essayScore === "number" && opts.essayScore > 0 ? clamp(opts.essayScore, 0, 100) : null;

  // ---- Financial: how complete and workable the funding picture is --------
  const hasBudget = Number(profile.budgetAnnualUsd) > 0;
  const hasIncome = Number(profile.familyIncomeUsd) > 0;
  const hasFundingNeed =
    profile.needsFinancialAid != null || profile.requiresFullScholarship != null || profile.needScholarship === true;
  const financialCoverage = [hasBudget, hasIncome, hasFundingNeed].filter(Boolean).length / 3;
  const financial =
    financialCoverage === 0
      ? null
      : clamp(50 * (hasBudget ? 1 : 0) + 25 * (hasIncome ? 1 : 0) + 25 * (hasFundingNeed ? 1 : 0), 0, 100);

  const sections: StrengthSection[] = [
    section(
      "academics",
      "Academics",
      academics,
      gpa == null ? 0 : 1,
      [
        profile.gpa != null
          ? "Add your GPA scale (4.0 / 5.0 / 100) so the grade can be compared with a published minimum"
          : "Add your GPA — it is the first requirement every university publishes",
      ]
    ),
    section("tests", "Tests", tests, testCoverage, [
      ...(englishScore == null ? ["Add an English test score (IELTS, TOEFL or Duolingo)"] : []),
      ...(standardisedScore == null ? ["Add SAT/ACT only if your target universities ask for it"] : []),
    ]),
    section("extracurriculars", "Extracurriculars", extracurriculars, portfolioEvidence === 0 ? 0 : 1, [
      "Add activities (volunteering, projects, clubs, sport) — 4+ sustained items is the competitive baseline",
    ]),
    section("leadership", "Leadership", leadershipScore, hasActivityRecord ? 1 : 0, [
      "Record a leadership role (club officer, team captain, project lead) with its dates",
    ]),
    section("awards", "Awards", awardsScore, hasActivityRecord ? 1 : 0, [
      "Record competitions, olympiads or certifications — even a regional result counts",
    ]),
    section("research", "Research", researchScore, hasActivityRecord ? 1 : 0, [
      "Add a research project, publication or long-term technical project",
    ]),
    section("essays", "Essays", essayScore, essayScore == null ? 0 : 1, [
      "Draft your SOP and run the rubric review to get a measured essay score",
    ]),
    section("financial", "Financial", financial, financialCoverage, [
      ...(hasBudget ? [] : ["Add your annual budget (what your family can pay per year)"]),
      ...(hasIncome ? [] : ["Add your family income for need-based awards"]),
      ...(hasFundingNeed ? [] : ["State whether you need financial aid or a full scholarship"]),
    ]),
  ];

  const completeness = round(profileCompletenessRatio(profile) * 100);
  const measured = sections.filter((s) => !s.unknown);
  const overallPrecise = roundTo(weightedMean(measured.map((s) => s.scorePrecise)) ?? 0, 1);

  return {
    overall: Math.round(overallPrecise),
    overallPrecise,
    completeness,
    sections,
    scoredSections: measured.length,
    totalSections: sections.length,
    basis: measured.length
      ? `Averaged over ${measured.length} of ${sections.length} profile dimensions — a dimension with no data is excluded, never counted as zero.`
      : "No dimension has usable data yet, so there is no overall score — add your GPA and an English test to start measuring.",
  };
}

export interface ExtracurricularAnalysis {
  leadership: number;
  impact: number;
  consistency: number;
  academicFit: number;
  /** Precise twins of the four scores above (one decimal, no display rounding). */
  precise: { leadership: number; impact: number; consistency: number; academicFit: number };
  suggestions: string[];
}

/**
 * Structured read of the activity list + concrete next-3-months advice.
 *
 * The four numbers are graded continuously (the first leadership role is worth
 * the most, the tenth adds little) and each is returned with its unrounded
 * value, so a student can see that 2 awards beat 1 even when both display as
 * the same integer.
 */
export function analyzeExtracurriculars(
  profile: ChancingProfile
): ExtracurricularAnalysis {
  const { activities, leadership, research, awards } = countActivities(profile);
  const years = Number(profile.workExperienceYears ?? 0);
  const publications = Number(profile.researchPublications ?? 0);

  const leadershipPrecise = clamp(100 * saturatingCurve(leadership, 3), 5, 100);
  const impactPrecise = clamp(
    55 * saturatingCurve(awards, 3) + 30 * saturatingCurve(research + publications, 2) + 15 * saturatingCurve(activities, 6),
    5,
    100
  );
  const consistencyPrecise = clamp(
    70 * saturatingCurve(years, 3) + 30 * saturatingCurve(activities, 6),
    5,
    100
  );
  const academicFitPrecise = clamp(
    60 * saturatingCurve(research + publications, 2) + 40 * saturatingCurve(awards, 3),
    5,
    100
  );

  const suggestions: string[] = [];
  if (leadership === 0) suggestions.push("Take one leadership role (club officer, team captain, project lead) and keep it for 2+ semesters");
  if (research === 0 && publications === 0) suggestions.push("Join one research or open-source project in your major — 3 months is enough to show real output");
  if (awards === 0) suggestions.push("Enter 1–2 competitions (olympiad, hackathon, debate) — even a regional result counts");
  if (activities < 4) suggestions.push("Add 2–3 activities you can sustain weekly; depth beats a long list");
  if (!suggestions.length) suggestions.push("Your profile is solid — convert activities into measurable impact (numbers, outcomes, awards)");

  return {
    leadership: Math.round(leadershipPrecise),
    impact: Math.round(impactPrecise),
    consistency: Math.round(consistencyPrecise),
    academicFit: Math.round(academicFitPrecise),
    precise: {
      leadership: roundTo(leadershipPrecise, 1),
      impact: roundTo(impactPrecise, 1),
      consistency: roundTo(consistencyPrecise, 1),
      academicFit: roundTo(academicFitPrecise, 1),
    },
    suggestions,
  };
}
