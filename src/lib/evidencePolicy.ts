/**
 * One platform-wide policy for catalogue evidence and admission metrics.
 *
 * Confirmed product rule: ScholarBridge currently has NO validated/calibrated
 * model for an individual admission probability. A fit score, evidence
 * coverage, experimental index and historical acceptance rate are different
 * things. High coverage never proves that a value is official or correct.
 * QS-derived estimates are not admitted-cohort statistics. Unknown values are
 * not zero and "not published" is not "not applicable".
 *
 * This module is deliberately dependency-free so API routes, UI copy checks and
 * scripts can all import the same definitions.
 */

export type MetricValueType =
  | "official_requirement"
  | "recommended_score"
  | "observed_statistic"
  | "computed_fit"
  | "planning_estimate"
  | "evidence_coverage"
  | "experimental_index"
  | "historical_acceptance_rate"
  | "personal_admission_probability"
  | "unknown"
  | "not_published"
  | "not_applicable"
  | "unverified";

export type VerificationStatus =
  | "verified"
  | "review_needed"
  | "unverified"
  | "failed_verification";

export type EntityType = "university" | "program" | "scholarship" | "ranking" | "source";

/**
 * Important values are bound to value + unit, currency + period where money is
 * involved, degree/program, admission cycle, official source URL, verified
 * date, verification status and value type. Null means unknown/not recorded.
 */
export interface CatalogueFact {
  entityType: EntityType;
  entityId: number;
  fieldKey: string;
  valueNumeric?: number | null;
  valueText?: string | null;
  unit?: string | null;
  currency?: string | null;
  period?: string | null;
  degreeLevel?: string | null;
  programName?: string | null;
  admissionCycle?: string | null;
  sourceUrl?: string | null;
  verifiedAt?: string | null;
  verificationStatus: VerificationStatus;
  valueType: MetricValueType;
  notes?: string | null;
}

export const ADMISSION_PROBABILITY_POLICY = {
  available: false,
  reason: "no-validated-methodology",
  requiresCalibratedModel: true,
  calibratedModelAvailable: false,
  forbiddenPersonalLabels: [
    "admission chance %",
    "admission probability %",
    "qabul ehtimoli %",
    "kirish imkoniyati %",
    "шанс поступления %",
  ],
  distinctMetricTypes: [
    "computed_fit",
    "evidence_coverage",
    "experimental_index",
    "historical_acceptance_rate",
  ],
} as const;

/** Shared API state; imported by the chancing/advisor routes. */
export const ADMISSION_PROBABILITY = {
  available: ADMISSION_PROBABILITY_POLICY.available,
  reason: ADMISSION_PROBABILITY_POLICY.reason,
} as const;

const MONEY_FIELD_KEYS = new Set([
  "annual_tuition",
  "annual_living_est",
  "accommodation_cost",
  "application_fee",
  "amount_usd_value",
  "award_amount",
  "living_allowance",
  "travel_allowance",
]);

/** Required evidence fields for an important value. */
export const EVIDENCE_FIELDS = [
  "value",
  "unit",
  "currency",
  "period",
  "degreeLevel",
  "programName",
  "admissionCycle",
  "sourceUrl",
  "verifiedAt",
  "verificationStatus",
  "valueType",
] as const;

export function missingEvidenceFields(fact: CatalogueFact): string[] {
  const missing: string[] = [];
  const hasValue = fact.valueNumeric != null || (fact.valueText != null && fact.valueText.trim() !== "");
  if (!hasValue) missing.push("value");
  if (!fact.unit) missing.push("unit");
  if (MONEY_FIELD_KEYS.has(fact.fieldKey)) {
    if (!fact.currency) missing.push("currency");
    if (!fact.period) missing.push("period");
  }
  if (!fact.degreeLevel) missing.push("degreeLevel");
  if (!fact.programName) missing.push("programName");
  if (!fact.admissionCycle) missing.push("admissionCycle");
  if (!fact.sourceUrl) missing.push("sourceUrl");
  if (!fact.verifiedAt) missing.push("verifiedAt");
  if (!fact.verificationStatus) missing.push("verificationStatus");
  if (!fact.valueType) missing.push("valueType");
  return missing;
}

/**
 * A personal probability can be displayed only with a validated/calibrated
 * model, an explicit probability value type and a positive verification status.
 * The platform currently has none, so this always returns false.
 */
export function canDisplayAsAdmissionProbability(fact: CatalogueFact): boolean {
  return (
    ADMISSION_PROBABILITY_POLICY.available &&
    ADMISSION_PROBABILITY_POLICY.calibratedModelAvailable &&
    fact.valueType === "personal_admission_probability" &&
    fact.verificationStatus === "verified" &&
    fact.valueNumeric != null
  );
}

/** Detect visitor-facing copy that claims a personal admission probability. */
export function looksLikeProbabilityClaim(text: string): boolean {
  const normalized = text.toLowerCase();
  // Explicit honest disclaimers are not claims, even when they reuse the same
  // words ("we do not estimate your admission chance").
  const disclaimers = [
    "do not estimate",
    "does not estimate",
    "do not calculate",
    "does not calculate",
    "not a personal admission probability",
    "no validated personal admission-probability",
    "hisoblamaymiz",
    "ko‘rsatmaymiz",
    "ko'rsatmaymiz",
    "не оцениваем",
    "не показываем",
    "не рассчитываем",
  ];
  if (disclaimers.some((phrase) => normalized.includes(phrase))) return false;
  const forbidden = [
    /admission chance\s*[:=]?\s*\d{1,3}\s?%/,
    /admission probability\s*[:=]?\s*\d{1,3}\s?%/,
    /estimates? (your|the) admission chance/,
    /calculates? (your|the) admission probability/,
    /qabul ehtimolini (hisoblaydi|baholaydi|taxmin qiladi)/,
    /kirish imkoniyati\s*[:=]?\s*\d{1,3}\s?%/,
    /шанс поступления\s*[:=]?\s*\d{1,3}\s?%/,
    /оценивает шанс поступления/,
    /рассчитывает вероятность поступления/,
  ];
  return forbidden.some((pattern) => pattern.test(normalized));
}

/** A failed official check must not be allowed to refresh verifiedAt. */
export function mayRefreshVerifiedDate(input: {
  officialPageReRead: boolean;
  verificationSucceeded: boolean;
  evidencePresent: boolean;
}): boolean {
  return input.officialPageReRead && input.verificationSucceeded && input.evidencePresent;
}
