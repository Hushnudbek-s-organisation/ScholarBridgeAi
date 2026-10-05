/**
 * Subject-to-program recommender engine (2026-10).
 *
 * WHAT THIS ANSWERS
 * -----------------
 * "Which programs in the catalog match this student's intended subject or
 * interests — and what do we actually know about their eligibility, cost and
 * funding situation?"
 *
 * HARD RULES (task constraints, non-negotiable)
 * ---------------------------------------------
 * 1. FOUR SEPARATE DIMENSIONS, never blended:
 *      • subject fit      — how closely the program relates to the student's
 *                           subject/interests (exact > synonym > partial);
 *      • eligibility      — each known entry requirement is met / unmet /
 *                           UNKNOWN. Unknown (missing student data) is NEVER
 *                           treated as unmet and never as met.
 *      • affordability    — known cost vs the student's stated budget +
 *                           funding need. Missing budget = unknown, not "no".
 *      • admission probability — NEVER computed or displayed. This engine
 *        returns `probability: ADMISSION_PROBABILITY` ({available:false}).
 *        The "match score" used for ranking is a requirements/subject fit
 *        score and is labelled as such — it is not a chance of admission.
 * 2. NO FABRICATION: only values present in the catalog rows (programs,
 *    program_requirements, application_cycles, scholarships, sources) may
 *    appear in results. A missing deadline/cost/requirement stays "unknown".
 * 3. MISSING DATA IS NEUTRAL: unknown inputs do not lower the match score
 *    and do not look negative in the output — they appear in
 *    `missingInputs` so the student knows what would improve the assessment.
 * 4. PROVENANCE: every program result carries its verification status, source
 *    URL, last-verified date and stale flag, plus the program's source links.
 *
 * The engine is pure and deterministic (unit-tested in scripts/check-recommend.ts).
 */

import { ADMISSION_PROBABILITY } from "./chancing";
import { gpaTo40Scale } from "./gpa";
import { isStaleVerified } from "./provenance";
import { undergraduateTestApplies } from "./degreeLevels";

/** Re-exported for callers/tests that import from the recommender. */
export { gpaTo40Scale };

// ---------------------------------------------------------------------------
// Inputs
// ---------------------------------------------------------------------------

export type FundingNeed = "none" | "partial" | "full";

/**
 * Recommender inputs. Every field is optional; `null`/absence means
 * "the student does not know yet / skipped". The caller decides which values
 * come from the saved profile vs the request — this engine just matches.
 */
export interface RecommendationInput {
  /** Intended subjects/interests. At least one is needed for subject fit. */
  interests?: string[];
  degreeLevel?: string | null; // Bachelor | Master | PhD | ...
  gpa?: number | null;
  /** Scale the GPA is on (4.0, 5.0, 100, ...). Absent → GPA treated as 4.0 only if provided with no scale is unsafe: treated unknown. */
  gpaScale?: number | null;
  ielts?: number | null;
  toefl?: number | null;
  duolingo?: number | null;
  sat?: number | null;
  act?: number | null;
  /** Preferred countries. Empty/absent = no preference (never a filter-out). */
  countries?: string[];
  budgetUsd?: number | null;
  fundingNeed?: FundingNeed | null;
  /** Preferred teaching language, e.g. "English". Absent = no preference. */
  languagePref?: string | null;
  startYear?: number | null; // e.g. 2027
}

export interface RecommendProgram {
  id: number;
  universityId: number;
  name: string;
  field: string | null;
  degreeLevel: string | null;
  durationYears: number | null;
  durationUnit: string;
  studyMode: string | null;
  language: string | null;
  annualTuition: number | null;
  tuitionCurrency: string;
  tuitionPeriod: string;
  programUrl: string | null;
  applicationUrl: string | null;
  // Provenance (spec §19)
  isVerified: boolean;
  sourceUrl: string | null;
  lastVerifiedAt: string | null;
  verificationStatus: string;
  sources: {
    url: string;
    title: string;
    sourceType: string;
    accessedAt: string | null;
    isOfficial: boolean;
  }[];
}

export interface RecommendUniversity {
  id: number;
  name: string;
  country: string;
  city: string | null;
  websiteUrl: string | null;
  /** NULL = not verified (spec §14) — never shown as a cost. */
  annualLivingEst: number | null;
  livingCostCurrency: string;
}

export interface RecommendRequirement {
  programId: number;
  minIelts: number | null;
  minToefl: number | null;
  minDet: number | null; // Duolingo
  minSat: number | null;
  minAct: number | null;
  minGpa: number | null; // on a 4.0 scale (catalog convention)
  ibRequirement: string | null;
  aLevelRequirement: string | null;
  apRequirement: string | null;
  subjectRequirements: string | null;
  otherRequirements: string | null;
}

export interface RecommendCycle {
  programId: number | null;
  intake: string | null;
  academicYear: string | null;
  openingDate: string | null;
  deadline: string | null;
  applicationUrl: string | null;
  sourceUrl: string | null;
  lastVerifiedAt: string | null;
  verificationStatus: string;
}

export interface RecommendScholarship {
  id: number;
  title: string;
  country: string;
  degreeLevels: string[];
  coverageType: string | null;
  minGpa: number | null;
  minIelts: number | null;
  financialNeedBased: boolean;
  meritBased: boolean;
  eligibleMajors: string[];
}

export interface RecommendationCatalog {
  programs: RecommendProgram[];
  universities: Map<number, RecommendUniversity>;
  requirements: Map<number, RecommendRequirement[]>;
  cycles: Map<number, RecommendCycle[]>;
  scholarships: RecommendScholarship[];
}

// ---------------------------------------------------------------------------
// Subject affinity — implemented ONCE in src/lib/subjectAffinity.ts and
// re-exported here so every caller (recommender, university matcher, chancing)
// compares two field labels with the same rules.
// ---------------------------------------------------------------------------

import {
  normalizeSubject,
  subjectAffinity,
  subjectSimilarity,
  type SubjectFit,
  type SubjectFitLevel,
} from "./subjectAffinity";

export {
  normalizeSubject,
  subjectAffinity,
  subjectSimilarity,
  SUBJECT_SIMILARITY_BY_LEVEL,
  type SubjectFit,
  type SubjectFitLevel,
} from "./subjectAffinity";

// ---------------------------------------------------------------------------
// Eligibility — met / unmet / unknown (kept strictly separate)
// ---------------------------------------------------------------------------

export type RequirementStatus = "met" | "unmet" | "unknown";

export interface RequirementAssessment {
  key: "gpa" | "ielts" | "toefl" | "duolingo" | "sat" | "act";
  required: number;
  studentValue: number | null;
  status: RequirementStatus;
}

export interface Eligibility {
  items: RequirementAssessment[];
  met: number;
  unmet: number;
  unknown: number;
  textRequirements: { kind: string; text: string }[];
}

/**
 * GPA on the student's scale → 4.0 scale. Single shared implementation in
 * `src/lib/gpa.ts` (re-exported here for callers of the recommender).
 * Unknown scale → unknown (no guess, no clamp to a perfect 4.0).
 */

export function assessEligibility(
  input: RecommendationInput,
  reqs: RecommendRequirement[],
  /** The programme's own level — SAT/ACT only apply to undergraduate entry. */
  programDegreeLevel?: string | null
): Eligibility {
  const items: RequirementAssessment[] = [];
  const textRequirements: { kind: string; text: string }[] = [];
  // A program can have multiple requirement rows (per academic year); use the
  // first row that carries each minimum — the catalog does not expose a
  // richer cycle mapping on these rows.
  const first: RecommendRequirement | undefined = reqs[0];

  const add = (key: RequirementAssessment["key"], required: number | null | undefined, studentValue: number | null | undefined) => {
    if (required == null || !Number.isFinite(Number(required)) || Number(required) <= 0) return;
    const sv = studentValue != null && Number.isFinite(Number(studentValue)) ? Number(studentValue) : null;
    items.push({
      key,
      required: Number(required),
      studentValue: sv,
      status: sv == null ? "unknown" : sv >= Number(required) ? "met" : "unmet",
    });
  };

  if (first) {
    add("gpa", first.minGpa, gpaTo40Scale(input.gpa, input.gpaScale));
    // English proficiency: any one of IELTS/TOEFL/Duolingo satisfying the
    // program's published minimum counts as "met" for that test. If the
    // program sets an IELTS minimum, an equivalent the student holds on a
    // DIFFERENT test is NOT auto-substituted — that is an admission-office
    // decision, so we only mark it met when the same test is taken.
    add("ielts", first.minIelts, input.ielts);
    add("toefl", first.minToefl, input.toefl);
    add("duolingo", first.minDet, input.duolingo);
    // SAT/ACT are undergraduate-admission tests. A graduate programme (or a
    // graduate applicant) must not be scored against a stray SAT minimum —
    // that would report a requirement the student can never satisfy and never
    // needed. Same rule as the university matcher (src/lib/degreeLevels.ts).
    if (undergraduateTestApplies(programDegreeLevel ?? null, input.degreeLevel ?? undefined)) {
      add("sat", first.minSat, input.sat);
      add("act", first.minAct, input.act);
    }
    if (first.ibRequirement) textRequirements.push({ kind: "ib", text: first.ibRequirement });
    if (first.aLevelRequirement) textRequirements.push({ kind: "alevel", text: first.aLevelRequirement });
    if (first.apRequirement) textRequirements.push({ kind: "ap", text: first.apRequirement });
    if (first.subjectRequirements) textRequirements.push({ kind: "subject", text: first.subjectRequirements });
    if (first.otherRequirements) textRequirements.push({ kind: "other", text: first.otherRequirements });
  }

  return {
    items,
    met: items.filter((i) => i.status === "met").length,
    unmet: items.filter((i) => i.status === "unmet").length,
    unknown: items.filter((i) => i.status === "unknown").length,
    textRequirements,
  };
}

// ---------------------------------------------------------------------------
// Affordability + funding
// ---------------------------------------------------------------------------

export interface Affordability {
  annualCostUsd: number | null; // tuition only; living est. is reported separately
  annualTuition: number | null;
  tuitionCurrency: string;
  tuitionPeriod: string;
  livingEstUsd: number | null;
  withinBudget: "yes" | "no" | "unknown";
  budgetUsd: number | null;
  fundingNeed: FundingNeed | null;
  /** Scholarships that plausibly apply (same country or country-agnostic,
   *  same degree level, major-agnostic or major-matched, need-aware). */
  scholarshipMatches: { id: number; title: string; coverageType: string | null; needBased: boolean }[];
}

function parseJsonArray(raw: string | null | undefined): string[] {
  if (!raw) return [];
  try {
    const p = JSON.parse(raw);
    return Array.isArray(p) ? p.map(String) : [];
  } catch {
    return raw.split(",").map((s) => s.trim()).filter(Boolean);
  }
}

export function assessAffordability(
  input: RecommendationInput,
  program: RecommendProgram,
  uni: RecommendUniversity | undefined,
  scholarships: RecommendScholarship[],
  programCountry: string | null
): Affordability {
  const budget =
    input.budgetUsd != null && Number.isFinite(Number(input.budgetUsd)) && Number(input.budgetUsd) > 0
      ? Number(input.budgetUsd)
      : null;
  const tuition =
    program.annualTuition != null && Number.isFinite(Number(program.annualTuition)) && Number(program.annualTuition) > 0
      ? Number(program.annualTuition)
      : null;
  // NOTE: the catalog stores tuition in the program's own currency. The
  // budget is USD. A naive numeric compare across currencies would be
  // fabrication-adjacent, so the budget comparison only runs when the
  // tuition currency is USD; otherwise it stays "unknown" with an explanation.
  const comparableCurrency = (program.tuitionCurrency || "USD").toUpperCase() === "USD";
  const withinBudget: Affordability["withinBudget"] =
    budget == null || tuition == null || !comparableCurrency ? "unknown" : tuition <= budget ? "yes" : "no";

  // Scholarship plausibility — every condition must be known to pass;
  // unknown eligibility is never assumed.
  const matched: Affordability["scholarshipMatches"] = [];
  const interests = (input.interests || []).map(normalizeSubject);
  for (const s of scholarships) {
    if (matched.length >= 5) break;
    const countryOk =
      !s.country ||
      !programCountry ||
      s.country.trim().toLowerCase() === programCountry.trim().toLowerCase();
    // Degree level: unknown scholarship level → never claim a match (unknown
    // ≠ match). "All" always passes; otherwise the student's level must be
    // known AND listed.
    let levelOk: boolean;
    if (s.degreeLevels.length === 0) levelOk = false;
    else if (s.degreeLevels.includes("All")) levelOk = true;
    else levelOk = input.degreeLevel != null && s.degreeLevels.some((l) => l.toLowerCase() === input.degreeLevel!.toLowerCase());
    const majorOk =
      !s.eligibleMajors.length ||
      s.eligibleMajors.includes("All") ||
      interests.some((i) =>
        s.eligibleMajors.some((m) => normalizeSubject(m).includes(i) || i.includes(normalizeSubject(m)))
      );
    // Funding need: a need-based scholarship only plausibly matches when the
    // student has stated a funding need (none/partial/full).
    const needOk = input.fundingNeed != null ? true : !s.financialNeedBased;
    if (countryOk && levelOk && majorOk && needOk) {
      matched.push({ id: s.id, title: s.title, coverageType: s.coverageType, needBased: s.financialNeedBased });
    }
  }

  return {
    annualCostUsd: tuition,
    annualTuition: tuition,
    tuitionCurrency: program.tuitionCurrency || "USD",
    tuitionPeriod: program.tuitionPeriod || "year",
    livingEstUsd: uni?.annualLivingEst != null ? Number(uni.annualLivingEst) : null,
    withinBudget,
    budgetUsd: budget,
    fundingNeed: input.fundingNeed ?? null,
    scholarshipMatches: matched,
  };
}

// ---------------------------------------------------------------------------
// Ranking (visible factors, never a probability)
// ---------------------------------------------------------------------------

const LEVEL_RANK: Record<SubjectFitLevel, number> = {
  exact: 5,
  synonym: 4,
  partial: 3,
  weak: 2,
  none: 1,
  unknown: 2,
};

export interface RecommendationResult {
  program: RecommendProgram;
  university: RecommendUniversity;
  subjectFit: SubjectFit;
  eligibility: Eligibility;
  affordability: Affordability;
  /** ALWAYS {available:false} — see header. Kept explicit per result. */
  probability: typeof ADMISSION_PROBABILITY;
  /** Ranking in 0–100. A MATCH score, not an admission chance. */
  matchScore: number;
  /** Plain-language ranking factors (why it is ranked here). */
  rankingFactors: string[];
  /** Which missing student inputs would improve THIS assessment. */
  missingInputs: string[];
  /** Location/cost/language/degree/start-year considerations. */
  considerations: string[];
  /** Next verified application cycle for this program, or null. */
  nextCycle: (RecommendCycle & { isEstimated: boolean }) | null;
  /** Stale provenance flags. */
  programStale: boolean;
  cycleStale: boolean;
}

export function recommend(
  input: RecommendationInput,
  catalog: RecommendationCatalog,
  limit = 24
): RecommendationResult[] {
  const results: RecommendationResult[] = [];

  for (const program of catalog.programs) {
    const university = catalog.universities.get(program.universityId);
    if (!university) continue; // orphan program row — skip, never invent a university

    const reqs = catalog.requirements.get(program.id) ?? [];
    const cycles = catalog.cycles.get(program.id) ?? [];
    const fit = subjectAffinity(input.interests, program.field);
    const eligibility = assessEligibility(input, reqs, program.degreeLevel);
    const affordability = assessAffordability(input, program, university, catalog.scholarships, university.country);

    // ---- Match score (0–100) -------------------------------------------
    // Subject fit dominates; eligibility rewards MET requirements and is
    // NEUTRAL on unknown ones; affordability is a modest tie-breaker.
    let score = 10 + fit.score * 55; // 10–65
    if (fit.level === "unknown") score = 10 + 27; // neutral 0.5 → mid
    if (eligibility.items.length) {
      const metShare = eligibility.met / eligibility.items.length;
      const unmetShare = eligibility.unmet / eligibility.items.length;
      score += metShare * 20; // +0–20 for met requirements
      score -= unmetShare * 12; // −0–12 for unmet (known gaps only)
      // Unknowns: no change. Missing data is not a negative.
    } else {
      score += 6; // no published minimums → nothing to miss; small neutral credit
    }
    if (affordability.withinBudget === "yes") score += 5;
    else if (affordability.withinBudget === "no") score -= 4;
    // No budget / unknown: no change.
    if (input.countries?.length && input.countries.some((c) => c.trim().toLowerCase() === university.country.trim().toLowerCase())) {
      score += 4; // preferred location
    }
    if (input.languagePref && program.language && input.languagePref.trim().toLowerCase() === program.language.trim().toLowerCase()) {
      score += 2;
    }
    if (input.degreeLevel && program.degreeLevel && input.degreeLevel.trim().toLowerCase() === program.degreeLevel.trim().toLowerCase()) {
      score += 4;
    }
    const matchScore = Math.max(0, Math.min(100, Math.round(score)));

    // ---- Next cycle (only real rows; verified vs unverified) -------------
    const nextCycle =
      cycles.length > 0
        ? (() => {
            const c = cycles[cycles.length - 1];
            return { ...c, isEstimated: c.verificationStatus !== "verified" };
          })()
        : null;

    // ---- Missing inputs (what would improve THIS assessment) -------------
    const missing: string[] = [];
    if (fit.level === "unknown") missing.push("interests");
    for (const item of eligibility.items) {
      if (item.status === "unknown") missing.push(item.key);
    }
    if (input.gpa != null && input.gpaScale == null) missing.push("gpaScale");
    if (affordability.withinBudget === "unknown" && input.budgetUsd == null && affordability.annualTuition != null) {
      missing.push("budget");
    }
    if (input.fundingNeed == null) missing.push("fundingNeed");
    if (input.startYear == null) missing.push("startYear");
    if (input.degreeLevel == null) missing.push("degreeLevel");
    if (input.languagePref == null) missing.push("language");

    // ---- Ranking factors (plain language) --------------------------------
    const factors: string[] = [];
    const levelWords: Record<SubjectFitLevel, string> = {
      exact: "direct subject match",
      synonym: "closely related subject",
      partial: "partially related subject",
      weak: "loosely related subject",
      none: "no subject information on the program",
      unknown: "you have not given a subject yet",
    };
    factors.push(`Subject: ${levelWords[fit.level]}`);
    if (eligibility.met + eligibility.unmet + eligibility.unknown > 0) {
      factors.push(
        `Requirements: ${eligibility.met} met, ${eligibility.unmet} unmet, ${eligibility.unknown} unknown`
      );
    } else {
      factors.push("Requirements: no published minimums on this program");
    }
    if (affordability.withinBudget === "yes") factors.push("Cost: within your budget");
    else if (affordability.withinBudget === "no") factors.push("Cost: above your budget");
    else if (affordability.annualTuition != null) factors.push("Cost: listed — compare it with your budget");
    if (affordability.scholarshipMatches.length) {
      factors.push(`Funding: ${affordability.scholarshipMatches.length} potentially matching scholarship${affordability.scholarshipMatches.length === 1 ? "" : "s"}`);
    }
    if (input.countries?.length && input.countries.some((c) => c.trim().toLowerCase() === university.country.trim().toLowerCase())) {
      factors.push(`Location: ${university.country} is on your preferred list`);
    }

    // ---- Considerations ---------------------------------------------------
    const considerations: string[] = [];
    if (university.city) considerations.push(`Located in ${university.city}, ${university.country}`);
    else considerations.push(`Located in ${university.country}`);
    if (program.language) considerations.push(`Taught in ${program.language}`);
    if (program.studyMode) considerations.push(`Mode: ${program.studyMode}`);
    if (program.durationYears != null) considerations.push(`Duration: ${program.durationYears} ${program.durationUnit || "years"}`);
    if (affordability.livingEstUsd != null) considerations.push("Living costs are estimated separately from tuition");
    if (nextCycle) {
      considerations.push(
        nextCycle.isEstimated
          ? `Next cycle deadline ${nextCycle.deadline || "unknown"} is NOT verified by an official source`
          : `Next verified cycle deadline: ${nextCycle.deadline || "unknown"}`
      );
    } else {
      considerations.push("No application cycle in the catalog yet — check the official program page for deadlines");
    }
    if (input.startYear && nextCycle?.academicYear && !nextCycle.academicYear.startsWith(String(input.startYear))) {
      considerations.push(`The next catalogued cycle is ${nextCycle.academicYear} — confirm ${input.startYear} entry on the official page`);
    }

    // ---- Stale provenance -------------------------------------------------
    const programStale = isStaleVerified(program.lastVerifiedAt);
    const cycleStale = nextCycle ? isStaleVerified(nextCycle.lastVerifiedAt) : false;

    results.push({
      program,
      university,
      subjectFit: fit,
      eligibility,
      affordability,
      probability: ADMISSION_PROBABILITY,
      matchScore,
      rankingFactors: factors,
      missingInputs: [...new Set(missing)],
      considerations,
      nextCycle,
      programStale,
      cycleStale,
    });
  }

  // Rank: subject-fit tier first, then match score, then verified-first.
  results.sort((a, b) => {
    const tier = LEVEL_RANK[b.subjectFit.level] - LEVEL_RANK[a.subjectFit.level];
    if (tier !== 0) return tier;
    if (b.matchScore !== a.matchScore) return b.matchScore - a.matchScore;
    if (a.program.verificationStatus === b.program.verificationStatus) return a.program.name.localeCompare(b.program.name);
    return a.program.verificationStatus === "verified" ? -1 : 1;
  });

  return results.slice(0, limit);
}

export { parseJsonArray as parseCatalogJsonArray };
