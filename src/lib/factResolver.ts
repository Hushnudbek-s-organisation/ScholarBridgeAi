import type { CatalogueFact } from "./evidencePolicy";
import { fromCatalogueFact, type TrustedValue } from "./typedEvidence";

export interface FactContext {
  programName?: string | null;
  degreeLevel?: string | null;
  admissionCycle?: string | null;
  unit?: string | null;
  applicantScope?: string | null;
}
const scopeKeys = [
  "programName",
  "degreeLevel",
  "admissionCycle",
  "unit",
  "applicantScope",
] as const;
const normalized = (value: string) => value.trim().toLowerCase();
const priority = (fact: CatalogueFact) => {
  const trust = fromCatalogueFact(fact).trust;
  return trust === "official_verified"
    ? 4
    : trust === "official_unverified"
      ? 3
      : trust === "observed"
        ? 2
        : 1;
};

/** Resolve one field, never a blanket entity verification. Conflicting peers stay unknown. */
export function resolveScopedFact(
  facts: CatalogueFact[],
  field: string,
  context: FactContext,
): TrustedValue | null {
  const matches = facts.filter(
    (fact) =>
      fact.fieldKey === field &&
      scopeKeys.every(
        (key) =>
          // A unit is a representation, not an applicant/cycle scope. Callers
          // may discover it without already knowing it; an explicit requested
          // unit is still strict and incompatible peer units conflict below.
          (key === "unit" && context.unit == null) || !fact[key] ||
          (context[key] != null &&
            normalized(fact[key]!) === normalized(context[key]!)),
      ),
  );
  if (!matches.length) return null;
  // A planning estimate cannot win over a publisher-confirmed value because it is newer.
  const bestPriority = Math.max(...matches.map(priority));
  const preferred = matches.filter((fact) => priority(fact) === bestPriority);
  const specificity = (fact: CatalogueFact) =>
    scopeKeys.filter((key) => fact[key]).length;
  const bestSpecificity = Math.max(...preferred.map(specificity));
  const peers = preferred.filter(
    (fact) => specificity(fact) === bestSpecificity,
  );
  const values = new Set(
    peers.map((fact) =>
      JSON.stringify([
        fact.valueNumeric ?? null,
        fact.valueText ?? null,
        fact.valueType,
        fact.unit,
        fact.currency,
        fact.period,
      ]),
    ),
  );
  if (values.size > 1) return null;
  peers.sort(
    (a, b) =>
      (Date.parse(b.verifiedAt ?? "") || 0) -
        (Date.parse(a.verifiedAt ?? "") || 0) ||
      (a.sourceUrl ?? "").localeCompare(b.sourceUrl ?? ""),
  );
  const selected = peers[0];
  const result = fromCatalogueFact(selected);
  if (
    result.trust === "official_verified" &&
    context.admissionCycle &&
    !selected.admissionCycle
  ) {
    return {
      ...result,
      trust: "official_unverified",
      note: "Published value kept for discovery; applicability to this admission cycle is unconfirmed.",
    };
  }
  return result;
}
