/**
 * §4 — single presentation layer for typed evidence across the whole product.
 *
 * `typedEvidence.ts` decides TRUST; this module decides how a TrustedValue is
 * SERIALIZED for a catalog API response, a university/program/grant page, a
 * comparison, a finance plan, an admin verify screen and a Telegram message.
 * All surfaces call `presentFact()` so no screen can accidentally render an
 * unverified number as an official minimum, turn unknown into zero, or convert
 * an observed average into a requirement.
 *
 * Pure + dependency-free: safe in API routes, React components and channel
 * formatting (which must never import server/db code).
 */
import {
  type TrustedValue, isOfficialMinimum, trustLabel, adaptLegacyField,
} from "@/lib/typedEvidence";

/** The full typed-evidence envelope required by §4. */
export interface PresentedFact {
  value: number | string | null;
  /** Human label; never says "minimum"/"official" unless verified as such. */
  label: string;
  unit: string | null;
  period: string | null;
  currency: string | null;
  programName: string | null;
  degreeLevel: string | null;
  admissionCycle: string | null;
  sourceUrl: string | null;
  verifiedAt: string | null;
  verificationStatus: string;
  valueType: string;
  trust: string;
  trustLabel: string;
  /** true ONLY for a verified official minimum. */
  isOfficialMinimum: boolean;
  /** Unknown is explicit: never 0, never "all", never "not applicable". */
  isUnknown: boolean;
  /** Never shown as a requirement / never used to reject. */
  displayAs: "official_minimum" | "recommended" | "unverified_value" | "observed_value" | "estimate" | "computed" | "unknown";
  note: string;
}

/**
 * Serialize a TrustedValue without ever upgrading its trust. `fieldLabel` is a
 * neutral field name ("GPA", "IELTS", "Stipend"), NOT "minimum GPA".
 */
export function presentFact(v: TrustedValue, fieldLabel: string): PresentedFact {
  const official = isOfficialMinimum(v);
  const unknown = v.value == null;
  let displayAs: PresentedFact["displayAs"];
  if (unknown) displayAs = "unknown";
  else if (official) displayAs = "official_minimum";
  else if (v.valueType === "recommended_score") displayAs = "recommended";
  else if (v.trust === "observed") displayAs = "observed_value";
  else if (v.trust === "third_party_estimate") displayAs = "estimate";
  else if (v.trust === "computed") displayAs = "computed";
  else displayAs = "unverified_value";

  return {
    value: v.value,
    // Only verified official requirements get the word "minimum".
    label: official ? `${fieldLabel} (official minimum)` : `${fieldLabel} (${trustLabel(v)})`,
    unit: v.unit,
    period: v.period,
    currency: v.currency,
    programName: v.programName,
    degreeLevel: v.degreeLevel,
    admissionCycle: v.admissionCycle,
    sourceUrl: v.sourceUrl,
    verifiedAt: v.verifiedAt,
    verificationStatus: v.verificationStatus,
    valueType: v.valueType,
    trust: v.trust,
    trustLabel: trustLabel(v),
    isOfficialMinimum: official,
    isUnknown: unknown,
    displayAs,
    note: v.note,
  };
}

/** A compact, honest one-line rendering for Telegram / previews. */
export function presentFactLine(v: TrustedValue, fieldLabel: string): string {
  const p = presentFact(v, fieldLabel);
  if (p.isUnknown) return `${fieldLabel}: noma'lum (manba yo'q)`;
  const scope = [p.degreeLevel, p.programName, p.admissionCycle].filter(Boolean).join(" · ");
  const amount = [p.value, p.unit, p.currency, p.period ? `/ ${p.period}` : null].filter((x) => x != null && x !== "").join(" ");
  const suffix = p.isOfficialMinimum
    ? "rasmiy minimum (tekshirilgan)"
    : `${p.trustLabel} – rasmiy minimum emas`;
  return `${fieldLabel}: ${amount}${scope ? ` [${scope}]` : ""} — ${suffix}${p.sourceUrl ? ` · ${p.sourceUrl}` : ""}`;
}

/**
 * Build an `evidence` envelope for an API response from legacy columns. Each
 * legacy value is KEPT but marked `legacy_unknown`; `entityVerified` is not
 * enough to promote a field to verified.
 */
export function legacyEvidence(input: {
  entityVerified?: boolean | null;
  fields: Record<string, number | string | null | undefined>;
  sourceUrl?: string | null;
  admissionCycle?: string | null;
}): Record<string, PresentedFact> {
  const out: Record<string, PresentedFact> = {};
  for (const [key, value] of Object.entries(input.fields)) {
    out[key] = presentFact(adaptLegacyField({
      fieldKey: key,
      value,
      entityVerified: input.entityVerified,
      sourceUrl: input.sourceUrl,
      admissionCycle: input.admissionCycle,
    }), key);
  }
  return out;
}

/**
 * §5 — adapt a RAW value that a panel computed locally (no API envelope).
 *
 * The caller MUST state the trust and value type explicitly; this helper never
 * guesses and never upgrades. Use `observed_statistic`/`observed` for a
 * historical benchmark, `computed_fit`/`computed` for an effective/derived
 * score, and `unverified`/`legacy_unknown` for a catalogue column. An unknown
 * value stays `null` -> "unknown, not zero".
 */
export function presentRaw(input: {
  value: number | string | null;
  fieldLabel: string;
  trust: TrustedValue["trust"];
  valueType: TrustedValue["valueType"];
  sourceUrl?: string | null;
  admissionCycle?: string | null;
  unit?: string | null;
  currency?: string | null;
  period?: string | null;
  note?: string;
}): PresentedFact {
  const unknown = input.value == null;
  const v: TrustedValue = {
    value: input.value,
    trust: unknown ? "unknown" : input.trust,
    valueType: input.valueType,
    // A locally adapted raw value has NO field-level verification proof.
    verificationStatus: "unverified",
    unit: input.unit ?? null,
    currency: input.currency ?? null,
    period: input.period ?? null,
    degreeLevel: null,
    programName: null,
    admissionCycle: input.admissionCycle ?? null,
    sourceUrl: input.sourceUrl ?? null,
    verifiedAt: null,
    note: input.note ?? (unknown
      ? "Not published in this view — unknown, not zero."
      : "Locally derived value without a field-level official source check."),
  };
  return presentFact(v, input.fieldLabel);
}
