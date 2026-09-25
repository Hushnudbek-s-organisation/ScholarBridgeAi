/**
 * Admission chancing engine.
 *
 * WHAT THIS IS — AND WHAT IT IS NOT
 * ---------------------------------
 * `src/lib/matching.ts` answers "how well does this student FIT this
 * programme?" → the **Fit score** (e.g. 78%). That is a requirements/affordability
 * match, and a great fit can still be a 12% admit.
 *
 * This module answers a different question: "what is the estimated probability
 * of being ADMITTED?" → the **Admission estimate**, shown as a range
 * (e.g. 18–27%) with sub-scores and an explicit "Why?".
 *
 * Two data sources, clearly labelled in the UI via `dataBasis`:
 *  - `public-estimate` — rules over the university's own published numbers
 *    (acceptance rate, ranking, published minimums). Honest label: it is a
 *    model estimate, not a promise.
 *  - `hybrid` / `scholarbridge-data` — once ScholarBridge has its own
 *    outcomes (see `application_outcomes`, including rejections), the
 *    empirical admit rate is blended in and the estimate gets sharper.
 *
 * Everything here is pure and deterministic so it can be unit-tested without a
 * database (see scripts/check-chancing.ts).
 */

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
  budgetAnnualUsd?: number | null;
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
  /** 0–100 (percent). NULL = not published. */
  acceptanceRate?: number | null;
  programMajor?: string | null;
  annualTuitionUsd?: number | null;
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
  /** Shown under the number — never imply certainty. */
  disclaimer: string;
}

// ---------------------------------------------------------------------------
// Small helpers
// ---------------------------------------------------------------------------

const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));
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

/** GPA normalised to a 4.0 scale. */
export function normalizedGpa(profile: ChancingProfile): number | null {
  const gpa = Number(profile.gpa);
  if (!Number.isFinite(gpa) || gpa <= 0) return null;
  const scale = Number(profile.gpaScale);
  if (!Number.isFinite(scale) || scale <= 0) return clamp(gpa, 0, 4);
  return clamp((gpa / scale) * 4, 0, 4);
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
  const awards = [
    ...parseListColumn(profile.awards),
    ...parseListColumn(profile.olympiads),
    ...parseListColumn(profile.competitions),
    ...parseListColumn(profile.certificates),
  ].length;
  return { activities, leadership, research, awards };
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
  // Published minimum when available; otherwise the tier-typical GPA.
  const target =
    Number(uni.minGpa) > 0
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
  const score = clamp(60 + delta * 40, 5, 100);
  let factor = clamp(1 + delta * 0.9, 0.3, 2.3);
  const notes: { positive?: string; negative?: string } = {};

  if (delta >= 0.3) {
    notes.positive = `GPA ${gpa.toFixed(2)} is well above the typical ${target.toFixed(2)} range`;
  } else if (delta >= 0) {
    notes.positive = `GPA ${gpa.toFixed(2)} meets the typical ${target.toFixed(2)} range`;
  } else if (delta >= -0.3) {
    factor = clamp(factor, 0.45, 1);
    notes.negative = `GPA ${gpa.toFixed(2)} is slightly below the typical ${target.toFixed(2)} range`;
  } else {
    notes.negative = `GPA ${gpa.toFixed(2)} is below the typical ${target.toFixed(2)} range`;
  }
  return { score: round(score), factor, notes };
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
    const equivalentIelts = ielts ?? (toefl ? clamp((toefl - 40) / 12, 4, 9) : null) ?? (duolingo ? clamp(duolingo / 15, 4, 9) : null);
    const req = minIelts ?? 6.5;
    if (equivalentIelts != null) {
      const delta = equivalentIelts - req;
      parts.push(clamp(65 + delta * 22, 10, 100));
      if (delta >= 0.5) {
        notes.positive = `English score ${equivalentIelts.toFixed(1)} is above the ${req} requirement`;
        factor *= 1.1;
      } else if (delta >= 0) {
        notes.positive = `English score meets the ${req} requirement`;
        factor *= 1.03;
      } else {
        notes.negative = `English score ${equivalentIelts.toFixed(1)} is below the ${req} requirement`;
        factor *= clamp(1 + delta * 0.5, 0.5, 1);
      }
    }
  } else {
    parts.push(35);
    notes.negative = "No English test submitted (IELTS/TOEFL/Duolingo)";
    factor *= minIelts ? 0.7 : 0.85;
  }

  // Standardised test — only judged when the university actually asks for one.
  if (sat || act) {
    const equivalentSat = sat ?? (act ? clamp(act * 40 + 180, 400, 1600) : null);
    if (equivalentSat != null) {
      const req = minSat ?? 1300;
      const delta = (equivalentSat - req) / 200;
      parts.push(clamp(65 + delta * 14, 10, 100));
      if (delta >= 0.5) notes.positive ??= `Test score ${equivalentSat} is above the typical ${req}`;
      if (delta < 0) notes.negative ??= `Test score ${equivalentSat} is below the typical ${req}`;
      factor *= clamp(1 + delta * 0.12, 0.75, 1.25);
    }
  } else if (minSat) {
    parts.push(40);
    notes.negative = `No SAT/ACT submitted — this programme lists ${minSat}`;
    factor *= 0.8;
  } else {
    parts.push(60);
  }

  const score = round(parts.reduce((a, b) => a + b, 0) / parts.length);
  return { score, factor, notes };
}

function extracurricularSubScore(profile: ChancingProfile): {
  score: number;
  factor: number;
  notes: { positive?: string; negative?: string };
} {
  const { activities, leadership, research, awards } = countActivities(profile);
  const years = Number(profile.workExperienceYears ?? 0);

  const breadth = clamp(activities / 6, 0, 1); // 6+ activities = full breadth
  const depth = clamp((leadership * 2 + research * 2 + awards) / 8, 0, 1);
  const experience = clamp(years / 3, 0, 1);

  const score = round(clamp(30 + breadth * 35 + depth * 40 + experience * 10, 10, 100));
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
  const sim = majorSimilarity(profile.targetMajor, uni.programMajor);
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
  let score = 70;
  let factor = 1;

  const intlShare = Number(uni.internationalStudentsPercentage);
  if (Number.isFinite(intlShare) && intlShare > 0) {
    if (intlShare >= 25) {
      score = 85;
      factor = 1.05;
      notes.positive = `${intlShare}% international students — an internationally oriented intake`;
    } else if (intlShare < 8) {
      score = 55;
      factor = 0.92;
      notes.negative = `Only ${intlShare}% international students — a competitive pool for international applicants`;
    }
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
  return { score: round(score), factor, notes };
}

function financialSubScore(profile: ChancingProfile, uni: ChancingUniversity): {
  score: number;
  factor: number;
  notes: { positive?: string; negative?: string };
} {
  const notes: { positive?: string; negative?: string } = {};
  const tuition = Number(uni.annualTuitionUsd);
  const budget = Number(profile.budgetAnnualUsd);
  let score = 75;
  let factor = 1;

  if (Number.isFinite(tuition) && tuition > 0 && Number.isFinite(budget) && budget > 0) {
    if (budget >= tuition * 1.4) {
      score = 92;
      notes.positive = "Budget comfortably covers tuition";
    } else if (budget >= tuition) {
      score = 78;
    } else {
      score = 45;
      notes.negative = `Budget $${budget.toLocaleString()} is below the $${tuition.toLocaleString()} tuition`;
    }
  }

  // Need-aware admissions: requiring full funding genuinely narrows options.
  if (profile.requiresFullScholarship) {
    score = clamp(score - 20, 5, 100);
    factor *= 0.9;
    notes.negative = "Requiring a full scholarship narrows the pool of funding programmes";
  } else if (profile.needsFinancialAid || profile.needScholarship) {
    score = clamp(score - 8, 5, 100);
  }
  return { score: round(score), factor, notes };
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
    Number(profile.budgetAnnualUsd) > 0,
    countActivities(profile).activities > 0,
    parseListColumn(profile.leadership).length > 0,
    parseListColumn(profile.awards).length + parseListColumn(profile.olympiads).length > 0,
    Boolean(profile.careerGoal),
    Number(profile.graduationYear) > 0,
  ];
  return checks.filter(Boolean).length / checks.length;
}

export interface ProfileStrength {
  overall: number;
  completeness: number;
  sections: { key: string; label: string; score: number }[];
}

/** One number per dimension, for the radar/bar dashboard. */
export function profileStrength(
  profile: ChancingProfile,
  opts: { essayScore?: number | null } = {}
): ProfileStrength {
  const gpa = normalizedGpa(profile);
  const academics = gpa == null ? 30 : round(clamp(((gpa - 2.5) / 1.5) * 100, 5, 100));

  const english =
    Number(profile.ieltsScore) > 0
      ? Number(profile.ieltsScore)
      : Number(profile.toeflScore) > 0
        ? clamp((Number(profile.toeflScore) - 40) / 12, 4, 9)
        : Number(profile.duolingoScore) > 0
          ? clamp(Number(profile.duolingoScore) / 15, 4, 9)
          : null;
  const std =
    Number(profile.satScore) > 0
      ? Number(profile.satScore)
      : Number(profile.actScore) > 0
        ? clamp(Number(profile.actScore) * 40 + 180, 400, 1600)
        : null;
  const tests = round(
    clamp(
      ((english ? clamp((english - 5) / 4, 0, 1) : 0) + (std ? clamp((std - 900) / 700, 0, 1) : 0)) *
        50,
      0,
      100
    )
  );

  const { activities, leadership, research, awards } = countActivities(profile);
  const extracurriculars = round(clamp(activities * 10 + leadership * 6 + research * 4, 0, 100));
  const leadershipScore = round(clamp(leadership * 22 + (activities >= 5 ? 20 : 0), 0, 100));
  const awardsScore = round(clamp(awards * 18, 0, 100));
  const essays =
    typeof opts.essayScore === "number" && opts.essayScore > 0 ? round(clamp(opts.essayScore, 0, 100)) : 0;
  const financial = Number(profile.budgetAnnualUsd) > 0 ? (profile.requiresFullScholarship ? 55 : 88) : 35;

  const sections = [
    { key: "academics", label: "Academics", score: academics },
    { key: "tests", label: "Tests", score: tests },
    { key: "extracurriculars", label: "Extracurriculars", score: extracurriculars },
    { key: "leadership", label: "Leadership", score: leadershipScore },
    { key: "awards", label: "Awards", score: awardsScore },
    { key: "essays", label: "Essays", score: essays },
    { key: "financial", label: "Financial", score: financial },
  ];
  const completeness = round(profileCompletenessRatio(profile) * 100);
  const filled = sections.filter((s) => s.score > 0);
  const overall = filled.length ? round(filled.reduce((a, s) => a + s.score, 0) / filled.length) : 0;

  return { overall, completeness, sections };
}

export interface ExtracurricularAnalysis {
  leadership: number;
  impact: number;
  consistency: number;
  academicFit: number;
  suggestions: string[];
}

/** Structured read of the activity list + concrete next-3-months advice. */
export function analyzeExtracurriculars(
  profile: ChancingProfile
): ExtracurricularAnalysis {
  const { activities, leadership, research, awards } = countActivities(profile);
  const years = Number(profile.workExperienceYears ?? 0);

  const leadershipScore = round(clamp(leadership * 24 + (activities >= 6 ? 15 : 0), 5, 100));
  const impact = round(clamp(awards * 16 + research * 10 + activities * 5, 5, 100));
  const consistency = round(clamp(years * 20 + activities * 8, 5, 100));
  const academicFit = round(clamp(research * 22 + awards * 12, 5, 100));

  const suggestions: string[] = [];
  if (leadership === 0) suggestions.push("Take one leadership role (club officer, team captain, project lead) and keep it for 2+ semesters");
  if (research === 0) suggestions.push("Join one research or open-source project in your major — 3 months is enough to show real output");
  if (awards === 0) suggestions.push("Enter 1–2 competitions (olympiad, hackathon, debate) — even a regional result counts");
  if (activities < 4) suggestions.push("Add 2–3 activities you can sustain weekly; depth beats a long list");
  if (!suggestions.length) suggestions.push("Your profile is solid — convert activities into measurable impact (numbers, outcomes, awards)");

  return { leadership: leadershipScore, impact, consistency, academicFit, suggestions };
}
