/**
 * Field-level trust adaptation layer (§4).
 *
 * `catalogue_facts` and `evidencePolicy.ts` DEFINE typed evidence; this module
 * is the transition adapter that makes the whole product CONSUME it. The live
 * catalogue still has legacy columns (`min_gpa`, `min_sat`, `min_ielts`,
 * `amount_usd_value`, …) plus a single `universities.verified` flag. Hiding all
 * of that during the migration would lose useful information; treating it as
 * verified official evidence would be wrong. So every legacy value is adapted
 * into a `TrustedValue` that KEEPS the number but attaches field-level trust.
 *
 * Hard rules (asserted in scripts/check-typed-evidence.ts, wired into
 * matching.ts):
 *  - an official minimum, an observed historical average, a third-party
 *    estimate and a computed value are NEVER converted into one another;
 *  - an unverified number is NEVER shown as an official minimum, NEVER used to
 *    auto-reject an applicant, and NEVER fed into an admission probability;
 *  - `university.verified = true` does NOT verify every field;
 *  - an unknown value stays unknown, not zero and not "not applicable".
 *
 * Pure and dependency-free: safe to import from API routes, UI and channel
 * (Telegram) formatting alike.
 */
import type { CatalogueFact, MetricValueType, VerificationStatus } from "@/lib/evidencePolicy";
import { ADMISSION_PROBABILITY_POLICY } from "@/lib/evidencePolicy";

export type TrustLevel =
  | "official_verified"   // typed fact, official source, verification SUCCEEDED
  | "official_unverified" // typed fact claims official, but field not verified
  | "observed"            // measured / historical / cohort statistic
  | "third_party_estimate"// QS/PDF/derived guess
  | "computed"            // fit score, coverage, index — calculated, not published
  | "legacy_unknown"      // legacy column present, no field-level evidence
  | "unknown";            // no value at all

export interface TrustedValue<T = number | string | null> {
  /** The value is KEPT (never discarded) even when its trust is low. */
  value: T;
  trust: TrustLevel;
  valueType: MetricValueType;
  verificationStatus: VerificationStatus;
  unit: string | null;
  currency: string | null;
  period: string | null;
  degreeLevel: string | null;
  programName: string | null;
  admissionCycle: string | null;
  sourceUrl: string | null;
  verifiedAt: string | null;
  /** Why this trust level was assigned — publishable, no PII/secret. */
  note: string;
}

/** A value may be shown as an official minimum ONLY with a successful check. */
export function isOfficialMinimum(v: TrustedValue): boolean {
  return v.trust === "official_verified" && v.valueType === "official_requirement" &&
    v.verificationStatus === "verified" && Boolean(v.sourceUrl) && Boolean(v.verifiedAt);
}

/** A value may auto-reject an applicant ONLY as a verified official minimum. */
export function mayAutoReject(v: TrustedValue): boolean {
  return isOfficialMinimum(v);
}

/** No personal admission probability is available by policy — ever. */
export function mayFeedAdmissionProbability(_v: TrustedValue): boolean {
  // Read through `boolean` so a future policy flip is a real code change, not
  // a literal `false === true` the compiler folds away (TS2367 with `as const`).
  const available: boolean = ADMISSION_PROBABILITY_POLICY.available;
  const calibrated: boolean = ADMISSION_PROBABILITY_POLICY.calibratedModelAvailable;
  return available && calibrated;
}

/** Display label that never upgrades trust. */
export function trustLabel(v: TrustedValue): string {
  switch (v.trust) {
    case "official_verified": return "official (verified)";
    case "official_unverified": return "official (not verified)";
    case "observed": return "observed / historical";
    case "third_party_estimate": return "third-party estimate";
    case "computed": return "computed";
    case "legacy_unknown": return "legacy value (field-level evidence missing)";
    default: return "unknown";
  }
}

/** Adapt a typed `catalogue_facts` row. */
export function fromCatalogueFact(fact: CatalogueFact): TrustedValue<number | string | null> {
  const value = fact.valueNumeric ?? fact.valueText ?? null;
  let trust: TrustLevel;
  switch (fact.valueType) {
    case "official_requirement":
    case "recommended_score":
      // A recommended score IS published by the official source, but
      // isOfficialMinimum() requires valueType === "official_requirement",
      // so it can NEVER be rendered or used as a cutoff / auto-reject rule.
      trust = fact.verificationStatus === "verified" && fact.sourceUrl && fact.verifiedAt
        ? "official_verified" : "official_unverified";
      break;
    case "observed_statistic":
    case "historical_acceptance_rate": trust = "observed"; break;
    case "planning_estimate": trust = "third_party_estimate"; break;
    case "computed_fit":
    case "evidence_coverage":
    case "experimental_index": trust = "computed"; break;
    case "not_published":
    case "not_applicable":
    case "unknown": trust = "unknown"; break;
    case "personal_admission_probability":
    case "unverified":
    default: trust = "legacy_unknown"; break;
  }
  return {
    value,
    trust,
    valueType: fact.valueType,
    verificationStatus: fact.verificationStatus,
    unit: fact.unit ?? null,
    currency: fact.currency ?? null,
    period: fact.period ?? null,
    degreeLevel: fact.degreeLevel ?? null,
    programName: fact.programName ?? null,
    admissionCycle: fact.admissionCycle ?? null,
    sourceUrl: fact.sourceUrl ?? null,
    verifiedAt: fact.verifiedAt ?? null,
    note: `Typed fact (${fact.valueType}, ${fact.verificationStatus}).`,
  };
}

export interface LegacyFieldInput {
  fieldKey: string;
  value: number | string | null | undefined;
  /** The single legacy entity-level flag — NOT field-level proof. */
  entityVerified?: boolean | null;
  unit?: string | null;
  currency?: string | null;
  period?: string | null;
  degreeLevel?: string | null;
  admissionCycle?: string | null;
  sourceUrl?: string | null;
  verifiedAt?: string | null;
}

/**
 * Adapt a legacy column. The number is preserved as `legacy_unknown`; the
 * entity-level `verified` flag is deliberately NOT enough to upgrade it. This
 * is the "don't hide all useful data, but don't overstate trust" transition.
 */
export function adaptLegacyField(input: LegacyFieldInput): TrustedValue<number | string | null> {
  const hasValue = input.value != null && input.value !== "" && !(typeof input.value === "number" && !Number.isFinite(input.value));
  return {
    value: hasValue ? (input.value as number | string) : null,
    trust: hasValue ? "legacy_unknown" : "unknown",
    valueType: hasValue ? "unverified" : "unknown",
    verificationStatus: "unverified",
    unit: input.unit ?? null,
    currency: input.currency ?? null,
    period: input.period ?? null,
    degreeLevel: input.degreeLevel ?? null,
    programName: null,
    admissionCycle: input.admissionCycle ?? null,
    sourceUrl: input.sourceUrl ?? null,
    verifiedAt: input.verifiedAt ?? null,
    note: hasValue
      ? "Legacy column value kept for display; no field-level official source/verification recorded."
      : "No value recorded (unknown, not zero).",
  };
}

/**
 * Prefer a typed fact when present, otherwise fall back to the legacy value —
 * both are returned so a caller can show the typed evidence AND keep the old
 * number visible during the transition. A typed fact NEVER silently inherits
 * the legacy entity-verified flag.
 */
export function mergeEvidence(
  typed: CatalogueFact | null | undefined,
  legacy: LegacyFieldInput,
): { primary: TrustedValue<number | string | null>; legacy: TrustedValue<number | string | null>; usedTyped: boolean } {
  const legacyValue = adaptLegacyField(legacy);
  if (typed) {
    const primary = fromCatalogueFact(typed);
    return { primary, legacy: legacyValue, usedTyped: true };
  }
  return { primary: legacyValue, legacy: legacyValue, usedTyped: false };
}

/**
 * Eligibility gate: a legacy/unverified minimum can INFORM but never REJECT.
 * Returns whether the (kept) value is allowed to eliminate a candidate.
 */
export function eligibilityCutoff(input: {
  studentValue: number | null;
  minimum: TrustedValue<number | string | null>;
}): { canEvaluate: boolean; passes: boolean | null; reason: string } {
  if (input.studentValue == null) {
    return { canEvaluate: false, passes: null, reason: "Student value is unknown; no rejection." };
  }
  if (!mayAutoReject(input.minimum)) {
    return {
      canEvaluate: false,
      passes: null,
      reason: `${trustLabel(input.minimum)} minimum is not a verified official requirement; it cannot auto-reject.`,
    };
  }
  const numeric = typeof input.minimum.value === "number" ? input.minimum.value : Number(input.minimum.value);
  if (!Number.isFinite(numeric)) {
    return { canEvaluate: false, passes: null, reason: "Minimum value is not numeric." };
  }
  return { canEvaluate: true, passes: input.studentValue >= numeric, reason: "Verified official minimum applied." };
}
