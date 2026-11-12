/**
 * Canonical programme assessment — the ONE service every screen reads.
 *
 * FIVE SEPARATE ANSWERS, NEVER ONE HIDDEN SCORE (spec §1, §9)
 * ----------------------------------------------------------
 *  1. `preferenceFit`      — how well the programme matches the student's choices.
 *  2. `eligibility`        — documented mandatory requirements, met / unmet / unknown.
 *  3. `finance`            — total cost vs available funding (gap, not a bonus).
 *  4. `academicComparison` — recorded results vs PUBLISHED statistics.
 *  5. `admissionProbability` — always `null`, with an explicit reason.
 *
 * Nothing here blends them: the finance gap never changes the fit, a fit score
 * never becomes a chance, and an eligibility failure is never a preference
 * filter failure (the two are reported in different fields).
 *
 * CONTEXT (spec §2)
 * -----------------
 * An assessment is valid for exactly one `programme + degree level + application
 * cycle + applicant category`. Requirements from another cycle or applicant
 * group are never merged into it.
 *
 * SORTING (spec §9) — the documented conservative policy:
 * inside one group, order by the LOWER bound of the fit interval (desc), then
 * data coverage (desc), then a stable id (asc). Programmes whose intervals
 * overlap are not claimed to be ordered by a real preference, and an unknown
 * fit (null) is kept in its own block rather than being replaced by a fake 0.
 *
 * Pure module — asserted in `scripts/check-assessment.ts`.
 */

import { compareDegreeLevels } from "@/lib/degreeLevels";
import { countriesMatch } from "@/lib/countries";
import {
  compareAcademicMetric,
  admissionProbability,
  type AcademicComparison,
  type ComparisonRequest,
  type PublishedStatistic,
} from "./academicComparison";
import {
  evaluateEligibility,
  type EligibilityCheck,
  type EligibilityProfile,
  type EligibilityResult,
  type RequirementNode,
} from "./eligibility";
import { assessFinance, type FinanceAssessment, type FinanceInput } from "./finance";
import {
  computePreferenceFit,
  knownAxis,
  resolvePreferenceSet,
  unknownAxis,
  type AxisObservation,
  type PreferenceFit,
  type PreferenceFilterResult,
  type PreferenceSet,
  type PreferenceSource,
} from "./preferences";
import {
  evaluateSubjectRelation,
  type SubjectRelatedEntry,
  type SubjectRelationMatch,
} from "./subjectRelation";
import { SCORING_VERSION, SORT_POLICY, SUBJECT_RULES_VERSION, PREFERENCE_SETTINGS_VERSION } from "./version";

// ---------------------------------------------------------------------------
// Inputs
// ---------------------------------------------------------------------------

export interface AssessmentProgramme {
  id: number;
  universityId: number;
  name: string;
  /** Published subject/field of the programme (null when not recorded). */
  field: string | null;
  degreeLevel: string | null;
  /** Teaching language (null when not recorded). */
  language: string | null;
  /** `programs.study_mode` — raw catalogue value; interpreted, not copied. */
  studyMode: string | null;
  country: string | null;
  universityName: string | null;
  /** Official programme/admissions URL, when one is recorded. */
  officialProgramUrl: string | null;
  sourceUrl: string | null;
}

export interface AssessmentContext {
  /** e.g. "2027-2028" or "Fall 2027" — the cycle the assessment is for. */
  cycle: string | null;
  /** e.g. "international", "domestic", "transfer" — the applicant group. */
  applicantCategory: string | null;
  degreeLevel: string | null;
}

export interface AssessmentApplicant {
  /** Subjects/interests the student is targeting. */
  interests: string[];
  /** Curated related-subject values (versioned data; never invented here). */
  relatedSubjects?: SubjectRelatedEntry[] | null;
  preferences?: PreferenceSource | null;
  legacyPreferredCountries?: string[] | null;
  legacyTeachingLanguage?: string[] | null;
  eligibilityProfile?: Partial<EligibilityProfile> | null;
  /** Comparison requests + the statistics published for this scope. */
  comparisons?: { request: ComparisonRequest; statistics: PublishedStatistic[] }[];
  finance?: FinanceInput | null;
}

export interface AssessmentInput {
  programme: AssessmentProgramme;
  context: AssessmentContext;
  applicant: AssessmentApplicant;
  /** Documented requirements for exactly this programme/cycle/category. */
  requirements?: RequirementNode[] | null;
  /** Pinned so a caller can reproduce a historical assessment. */
  assessedAt?: string;
  /** Date used for validity/expiry checks (defaults to assessedAt's day). */
  asOfDate?: string;
}

// ---------------------------------------------------------------------------
// Output
// ---------------------------------------------------------------------------

export type CampusGroup = 0 | 1 | 2 | 3;

export const CAMPUS_GROUPS = [
  { id: 0, key: "meets_requirements", label: "Matches your required choices and requirements are met" },
  { id: 1, key: "needs_check", label: "Needs more checking" },
  { id: 2, key: "requirement_gaps", label: "Requirement gaps to close" },
  { id: 3, key: "preference_mismatch", label: "Does not match a required choice" },
] as const;

export interface AssessmentEvidenceReference {
  kind: "requirement" | "finance" | "statistic" | "subject_rule" | "preference_setting";
  label: string;
  sourceUrl: string | null;
  verifiedAt?: string | null;
  note?: string | null;
}

export interface ProgrammeAssessment {
  scoringVersion: string;
  assessedAt: string;
  context: AssessmentContext;
  programme: {
    id: number;
    universityId: number;
    name: string;
    field: string | null;
    degreeLevel: string | null;
    language: string | null;
    studyMode: string | null;
    country: string | null;
    universityName: string | null;
    officialProgramUrl: string | null;
    sourceUrl: string | null;
  };
  preferenceFit: PreferenceFit;
  /** `must` filters — separate from eligibility on purpose. */
  preferenceFilters: PreferenceFilterResult[];
  subjectRelation: SubjectRelationMatch;
  eligibility: EligibilityResult;
  finance: FinanceAssessment;
  academicComparisons: AcademicComparison[];
  admissionProbability: { value: null; reason: "no_validated_model"; scoringVersion: string };
  /** Which group the programme belongs to (spec §9). */
  group: CampusGroup;
  groupKey: (typeof CAMPUS_GROUPS)[number]["key"];
  /** Why the programme is in this group — always populated. */
  groupReasons: string[];
  /** Everything this assessment could not establish, in plain language. */
  unknowns: { field: string; reason: string }[];
  conflicts: { field: string; reason: string }[];
  evidence: AssessmentEvidenceReference[];
  settings: { scoringVersion: string; preferenceVersion: string; subjectRulesVersion: string };
  sort: { policy: typeof SORT_POLICY; lowerBound: number | null; coverage: number | null; stableId: number };
  /** Minimum personal data echoed back: the student's own recorded values only. */
  personalData: { recordedMetrics: string[] };
}

// ---------------------------------------------------------------------------
// Axis observation helpers
// ---------------------------------------------------------------------------

const STUDY_LOAD_ALIASES: Record<string, "full-time" | "part-time"> = {
  "full-time": "full-time",
  full_time: "full-time",
  fulltime: "full-time",
  full: "full-time",
  ft: "full-time",
  "part-time": "part-time",
  part_time: "part-time",
  parttime: "part-time",
  part: "part-time",
  pt: "part-time",
};

const DELIVERY_MODE_ALIASES: Record<string, "campus" | "online" | "hybrid"> = {
  campus: "campus",
  "on-campus": "campus",
  on_campus: "campus",
  onsite: "campus",
  "on-site": "campus",
  face_to_face: "campus",
  "in-person": "campus",
  online: "online",
  distance: "online",
  "distance-learning": "online",
  remote: "online",
  virtual: "online",
  hybrid: "hybrid",
  blended: "hybrid",
  mixed: "hybrid",
};

/**
 * Interpret `programs.study_mode`.
 *
 * The legacy column may hold a load value, a delivery value, BOTH, or neither.
 * It is interpreted per token — its value is never copied into both new axes by
 * assumption. "Full-time online" yields load=full-time AND delivery=online;
 * "Full-time" yields load only, leaving delivery genuinely unknown.
 */
export function interpretStudyMode(raw: string | null | undefined): {
  studyLoad: "full-time" | "part-time" | null;
  deliveryMode: "campus" | "online" | "hybrid" | null;
  tokens: string[];
} {
  // A single column can hold BOTH axes ("Full-time · online", "Hybrid
  // part-time"), so each axis is recognised independently by its own pattern.
  // Nothing is copied from one axis to the other.
  const text = String(raw ?? "").toLowerCase();
  const tokens = text
    .split(/[^a-z0-9+]+/)
    .map((token) => token.trim())
    .filter(Boolean);

  const studyLoad: "full-time" | "part-time" | null = /\bfull[\s-]*time\b/.test(text)
    ? "full-time"
    : /\bpart[\s-]*time\b/.test(text)
      ? "part-time"
      : null;

  const deliveryMode: "campus" | "online" | "hybrid" | null = /\bhybrid\b|\bblended\b|\bmixed[\s-]*mode\b/.test(text)
    ? "hybrid"
    : /\bonline\b|\bdistance\b|\bremote\b|\bvirtual\b/.test(text)
      ? "online"
      : /\bcampus\b|\bin[\s-]*person\b|\bon[\s-]*site\b|\bonsite\b|\bface[\s-]*to[\s-]*face\b/.test(text)
        ? "campus"
        : null;

  return { studyLoad, deliveryMode, tokens };
}

function preferenceObservation(
  setting: PreferenceSet["study_load"],
  actual: string | null,
  label: string,
  aliases: Record<string, string>
): AxisObservation {
  if (!setting || setting.mode === "no_preference") return { state: "not_applicable" };
  const wanted = (setting.value ?? []).map((value) => aliases[value.toLowerCase()] ?? value.toLowerCase());
  if (!wanted.length) return { state: "not_applicable" };
  if (!actual) return unknownAxis(`unknown_programme_${label}`);
  const actualKey = aliases[actual.toLowerCase()] ?? actual.toLowerCase();
  return wanted.includes(actualKey)
    ? knownAxis(1, `matches_the_stated_${label}`)
    : knownAxis(0, `differs_from_the_stated_${label}`);
}

function languageObservation(
  setting: PreferenceSet["teaching_language"],
  programmeLanguage: string | null
): AxisObservation {
  if (!setting || setting.mode === "no_preference") return { state: "not_applicable" };
  const wanted = (setting.value ?? []).map((value) => value.trim().toLowerCase()).filter(Boolean);
  if (!wanted.length) return { state: "not_applicable" };
  if (!programmeLanguage?.trim()) return unknownAxis("unknown_programme_teaching_language");
  return wanted.includes(programmeLanguage.trim().toLowerCase())
    ? knownAxis(1, "matches_the_stated_teaching_language")
    : knownAxis(0, "differs_from_the_stated_teaching_language");
}

function countryObservation(
  setting: PreferenceSet["country"],
  country: string | null
): AxisObservation {
  if (!setting || setting.mode === "no_preference") return { state: "not_applicable" };
  const wanted = (setting.value ?? []).filter(Boolean);
  if (!wanted.length) return { state: "not_applicable" };
  if (!country?.trim()) return unknownAxis("unknown_programme_country");
  return wanted.some((value) => countriesMatch(value, country))
    ? knownAxis(1, "matches_a_stated_country")
    : knownAxis(0, "not_in_the_stated_countries");
}

function subjectObservation(
  relation: SubjectRelationMatch,
  setting: PreferenceSet["subject"]
): AxisObservation {
  if (!setting || setting.mode === "no_preference") return { state: "not_applicable" };
  if (relation.relation === "unknown" || relation.relation === "lexical_candidate") {
    return unknownAxis(`subject_relation_${relation.relation}`);
  }
  return knownAxis(relation.similarity ?? 0, relation.note);
}

// ---------------------------------------------------------------------------
// Grouping
// ---------------------------------------------------------------------------

/**
 * Group a programme from its independent dimensions.
 *
 * A preference-filter failure is NOT an eligibility failure, and a requirement
 * gap is NOT a preference mismatch: the reasons name which one it is.
 */
export function groupAssessment(input: {
  preferenceFilters: PreferenceFilterResult[];
  eligibility: EligibilityResult;
}): { group: CampusGroup; reasons: string[] } {
  const reasons: string[] = [];
  const failed = input.preferenceFilters.filter((filter) => filter.state === "fail");
  const unknownFilters = input.preferenceFilters.filter((filter) => filter.state === "unknown");
  for (const filter of failed) reasons.push(`Required choice not met: ${filter.axis} (${filter.reason}).`);
  for (const filter of unknownFilters) {
    reasons.push(`Required choice cannot be checked: ${filter.axis} (${filter.reason}).`);
  }
  if (failed.length) return { group: 3, reasons };

  const status = input.eligibility.status;
  if (status === "unmet") {
    reasons.push("At least one documented requirement is not met.");
    for (const gap of input.eligibility.gaps) reasons.push(gap.text);
    return { group: 2, reasons };
  }
  if (unknownFilters.length) {
    return { group: 1, reasons: [...reasons, "A required choice has no comparable programme value."] };
  }
  if (status !== "met") {
    reasons.push(
      status === "unknown" && !input.eligibility.requirementsDocumented
        ? "No documented requirement is recorded, so eligibility is unknown."
        : "Some requirements cannot be decided yet (unknown is not met)."
    );
    return { group: 1, reasons };
  }
  reasons.push("Matches every required choice and all documented requirements are met.");
  return { group: 0, reasons };
}

// ---------------------------------------------------------------------------
// Canonical assessment
// ---------------------------------------------------------------------------

export function assessProgramme(input: AssessmentInput): ProgrammeAssessment {
  const assessedAt = input.assessedAt ?? new Date().toISOString();
  const asOfDate = input.asOfDate ?? assessedAt.slice(0, 10);
  const preferences = resolvePreferenceSet({
    preferences: input.applicant.preferences,
    legacyPreferredCountries: input.applicant.legacyPreferredCountries,
    legacyTeachingLanguage: input.applicant.legacyTeachingLanguage,
    legacyInterests: input.applicant.interests,
  });

  const describedMode = interpretStudyMode(input.programme.studyMode);
  const subjectRelation = evaluateSubjectRelation(
    preferences.subject?.value ?? input.applicant.interests,
    input.programme.field ?? input.programme.name,
    preferences.acceptedSubjectEquivalents,
    input.applicant.relatedSubjects ?? []
  );

  const observed: Partial<Record<"subject" | "country" | "teaching_language" | "study_load" | "delivery_mode", AxisObservation>> = {
    subject: subjectObservation(subjectRelation, preferences.subject),
    country: countryObservation(preferences.country, input.programme.country),
    teaching_language: languageObservation(preferences.teaching_language, input.programme.language),
    study_load: preferenceObservation(preferences.study_load, describedMode.studyLoad, "study_load", STUDY_LOAD_ALIASES),
    delivery_mode: preferenceObservation(preferences.delivery_mode, describedMode.deliveryMode, "delivery_mode", DELIVERY_MODE_ALIASES),
  };

  const preferenceFit = computePreferenceFit(preferences, observed);

  const eligibilityProfile: EligibilityProfile = {
    ...(input.applicant.eligibilityProfile ?? {}),
    degreeLevel: input.applicant.eligibilityProfile?.degreeLevel ?? input.context.degreeLevel,
    requirementDegreeLevel:
      input.applicant.eligibilityProfile?.requirementDegreeLevel ??
      input.programme.degreeLevel ??
      input.context.degreeLevel,
    cycle: input.applicant.eligibilityProfile?.cycle ?? input.context.cycle,
    applicantCategory: input.context.applicantCategory,
    asOfDate,
  };
  const eligibility = evaluateEligibility(input.requirements ?? [], eligibilityProfile, {
    applicantCategory: input.context.applicantCategory,
    cycle: input.context.cycle,
  });

  // A degree level the student is not applying for is not a "requirement met".
  const degreeRelation = compareDegreeLevels(
    input.context.degreeLevel ?? eligibilityProfile.degreeLevel ?? null,
    input.programme.degreeLevel
  );

  const finance = assessFinance(
    input.applicant.finance ?? { costs: [], availableBudgetUsd: null }
  );

  const academicComparisons = (input.applicant.comparisons ?? []).map((entry) =>
    compareAcademicMetric(entry.request, entry.statistics)
  );

  const grouping = groupAssessment({ preferenceFilters: preferenceFit.filters, eligibility });
  const groupReasons = [...grouping.reasons];
  if (degreeRelation === "mismatch") {
    groupReasons.push(
      `This is a ${input.programme.degreeLevel ?? "different"} programme while the assessment context is ${input.context.degreeLevel ?? "not set"}.`
    );
  }

  const unknowns: { field: string; reason: string }[] = [];
  if (preferenceFit.reason === "no_active_preferences") {
    unknowns.push({ field: "preferenceFit", reason: "no_active_preferences" });
  }
  for (const axis of preferenceFit.missingAxes) {
    unknowns.push({ field: `preferenceFit.${axis}`, reason: "preference_factor_unknown" });
  }
  if (subjectRelation.relation === "unknown") unknowns.push({ field: "subjectRelation", reason: "subject_relation_unknown" });
  if (subjectRelation.relation === "lexical_candidate") {
    unknowns.push({ field: "subjectRelation", reason: "subject_relation_needs_review" });
  }
  if (!eligibility.requirementsDocumented) unknowns.push({ field: "eligibility", reason: "no_documented_requirements" });
  for (const reason of eligibility.unknownReasons) unknowns.push({ field: "eligibility", reason });
  if (finance.status === "cost_unknown" || finance.status === "unknown") {
    unknowns.push({ field: "finance", reason: "cost_incomplete" });
  }
  if (finance.status === "budget_not_stated") unknowns.push({ field: "finance", reason: "budget_not_stated" });
  for (const line of finance.missingCostLines) unknowns.push({ field: `finance.${line}`, reason: "cost_line_unknown" });
  for (const comparison of academicComparisons) {
    if (comparison.position === "unknown") {
      unknowns.push({ field: `academicComparison.${comparison.metric}`, reason: comparison.reason ?? "unknown" });
    }
  }
  if (!input.context.cycle) unknowns.push({ field: "context.cycle", reason: "cycle_not_stated" });
  if (!input.context.applicantCategory) unknowns.push({ field: "context.applicantCategory", reason: "applicant_category_not_stated" });

  const conflicts: { field: string; reason: string }[] = [];
  if (degreeRelation === "mismatch") {
    conflicts.push({ field: "degreeLevel", reason: "programme_level_differs_from_assessment_context" });
  }

  const evidence: AssessmentEvidenceReference[] = [];
  for (const check of flattenChecks(eligibility.checks)) {
    if (check.sourceUrl) {
      evidence.push({ kind: "requirement", label: check.label, sourceUrl: check.sourceUrl });
    }
  }
  if (subjectRelation.relation === "related") {
    evidence.push({ kind: "subject_rule", label: subjectRelation.ruleId, sourceUrl: null, note: subjectRelation.note });
  }
  for (const comparison of academicComparisons) {
    if (comparison.sourceUrl) {
      evidence.push({
        kind: "statistic",
        label: `${comparison.metric} (${comparison.statisticScope.kind})`,
        sourceUrl: comparison.sourceUrl,
        note: comparison.statisticYear,
      });
    }
  }
  for (const line of input.applicant.finance?.costs ?? []) {
    if (line.sourceUrl) evidence.push({ kind: "finance", label: line.label, sourceUrl: line.sourceUrl });
  }

  const recordedMetrics: string[] = [];
  if (eligibilityProfile.gpa?.value != null) recordedMetrics.push("gpa");
  if (eligibilityProfile.ielts?.value != null) recordedMetrics.push("ielts");
  if (eligibilityProfile.toefl?.value != null) recordedMetrics.push("toefl");
  if (eligibilityProfile.det?.value != null) recordedMetrics.push("det");
  if (eligibilityProfile.sat?.value != null) recordedMetrics.push("sat");
  if (eligibilityProfile.act?.value != null) recordedMetrics.push("act");

  return {
    scoringVersion: SCORING_VERSION,
    assessedAt,
    context: {
      cycle: input.context.cycle,
      applicantCategory: input.context.applicantCategory,
      degreeLevel: input.context.degreeLevel,
    },
    programme: { ...input.programme },
    preferenceFit,
    preferenceFilters: preferenceFit.filters,
    subjectRelation,
    eligibility,
    finance,
    academicComparisons,
    admissionProbability: admissionProbability(),
    group: grouping.group,
    groupKey: CAMPUS_GROUPS[grouping.group].key,
    groupReasons,
    unknowns,
    conflicts,
    evidence,
    settings: {
      scoringVersion: SCORING_VERSION,
      preferenceVersion: PREFERENCE_SETTINGS_VERSION,
      subjectRulesVersion: SUBJECT_RULES_VERSION,
    },
    sort: {
      policy: SORT_POLICY,
      lowerBound: preferenceFit.lowerBound,
      coverage: preferenceFit.coverage,
      stableId: input.programme.id,
    },
    personalData: { recordedMetrics },
  };
}

function flattenChecks(checks: EligibilityCheck[], out: EligibilityCheck[] = []): EligibilityCheck[] {
  for (const check of checks) {
    out.push(check);
    flattenChecks(check.children, out);
  }
  return out;
}

// ---------------------------------------------------------------------------
// Ordering
// ---------------------------------------------------------------------------

/**
 * Conservative ordering inside an already-grouped list:
 *   lowerBound desc → coverage desc → stable id asc.
 *
 * An unknown fit (`lowerBound === null`) is NOT treated as 0: unknown-fit rows
 * come after scored rows, ordered by coverage and id, and are never compared as
 * if they were worse candidates.
 */
export function sortAssessments(list: ProgrammeAssessment[]): ProgrammeAssessment[] {
  const scored = list.filter((item) => item.preferenceFit.lowerBound != null);
  const unscored = list.filter((item) => item.preferenceFit.lowerBound == null);
  const rank = (a: ProgrammeAssessment, b: ProgrammeAssessment) => {
    const lb = (b.preferenceFit.lowerBound ?? 0) - (a.preferenceFit.lowerBound ?? 0);
    if (lb !== 0) return lb;
    const coverage = (b.preferenceFit.coverage ?? 0) - (a.preferenceFit.coverage ?? 0);
    if (coverage !== 0) return coverage;
    return a.programme.id - b.programme.id;
  };
  scored.sort(rank);
  unscored.sort((a, b) => {
    const coverage = (b.preferenceFit.coverage ?? 0) - (a.preferenceFit.coverage ?? 0);
    if (coverage !== 0) return coverage;
    return a.programme.id - b.programme.id;
  });
  return [...scored, ...unscored];
}

/** Group and order a whole list (the recommendation screen's default view). */
export function groupAndSortAssessments(
  list: ProgrammeAssessment[]
): { group: CampusGroup; key: (typeof CAMPUS_GROUPS)[number]["key"]; label: string; items: ProgrammeAssessment[] }[] {
  return CAMPUS_GROUPS.map((definition) => ({
    group: definition.id,
    key: definition.key,
    label: definition.label,
    items: sortAssessments(list.filter((item) => item.group === definition.id)),
  })).filter((bucket) => bucket.items.length > 0);
}

/** Rounded display values — the ONLY place the fit is rounded (UI/API edge). */
export function displayFit(fit: PreferenceFit): {
  kind: "point" | "interval" | "unavailable";
  point: number | null;
  lower: number | null;
  upper: number | null;
  coverage: number | null;
  text: string;
} {
  const round = (value: number) => Math.round(value);
  if (fit.pointFit != null) {
    return {
      kind: "point",
      point: round(fit.pointFit),
      lower: round(fit.pointFit),
      upper: round(fit.pointFit),
      coverage: fit.coverage == null ? null : round(fit.coverage),
      text: `${round(fit.pointFit)}/100`,
    };
  }
  if (fit.lowerBound != null && fit.upperBound != null) {
    return {
      kind: "interval",
      point: null,
      lower: round(fit.lowerBound),
      upper: round(fit.upperBound),
      coverage: fit.coverage == null ? null : round(fit.coverage),
      text: `${round(fit.lowerBound)}–${round(fit.upperBound)}/100`,
    };
  }
  return { kind: "unavailable", point: null, lower: null, upper: null, coverage: null, text: "—" };
}
