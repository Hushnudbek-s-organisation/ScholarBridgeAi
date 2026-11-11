/**
 * Recorded requirements → per-field comparison (provenance-aware).
 *
 * This is the small, honest remainder of the retired programme-"chancing"
 * engine. It answers ONE question: "for each minimum this row actually
 * publishes, does the recorded profile meet it?" It never produces a score, a
 * percentile, a selectivity band or an admission probability — those were the
 * parts that made the old engine misleading, and they are gone.
 *
 * The programme assessment (`src/lib/assessment`) is the canonical service for
 * fit, eligibility, finance and academic comparison. This module is used by the
 * offline provenance guards (scripts/check-document-coverage.ts) and keeps the
 * alternative-test rule they assert: a satisfied test route must not be
 * overridden by an unused alternative, and a missing value is `missing`
 * (unknown), never `below`.
 */

import { normalizedGpa, type ChancingProfile } from "./chancing";

export type EligibilityStatus = "meets_all" | "borderline" | "below_minimum" | "unknown_inputs";

export interface RequirementCheckItem {
  dimension: "gpa" | "english" | "standardized" | "curriculum";
  label: string;
  status: "met" | "below" | "missing" | "info";
  studentValue: string;
  requiredValue: string;
  detail: string;
}

/** The row fields this comparison reads. All nullable: silence stays silence. */
export interface ProgramRequirementRowInput {
  minGpa?: number | null;
  minIelts?: number | null;
  minToefl?: number | null;
  minDet?: number | null;
  minSat?: number | null;
  minAct?: number | null;
  ibRequirement?: string | null;
  aLevelRequirement?: string | null;
  apRequirements?: string | null;
  subjectRequirements?: string | null;
  otherRequirements?: string | null;
  portfolioRequired?: boolean | null;
  interviewRequired?: boolean | null;
  notes?: string | null;
  sourceUrl?: string | null;
  degreeLevels?: string | null;
}

export function evaluatePublishedRequirements(
  profile: ChancingProfile,
  req: ProgramRequirementRowInput | null | undefined,
): { eligibilityStatus: EligibilityStatus; requirementChecks: RequirementCheckItem[] } {
  const checks: RequirementCheckItem[] = [];
  let sourced = false;
  try {
    const u = new URL(req?.sourceUrl ?? "");
    sourced = /^https?:$/.test(u.protocol) && u.pathname.length > 1;
  } catch {
    /* unknown */
  }
  if (sourced && req) {
    for (const [dimension, label, actual, minimum] of [
      ["gpa", "GPA (4.0)", normalizedGpa(profile), req.minGpa],
      ["english", "IELTS", profile.ieltsScore, req.minIelts],
      ["english", "TOEFL", profile.toeflScore, req.minToefl],
      ["english", "DET", profile.duolingoScore, req.minDet],
      ["standardized", "SAT", profile.satScore, req.minSat],
      ["standardized", "ACT", profile.actScore, req.minAct],
    ] as const) {
      if (minimum == null || !Number.isFinite(minimum) || minimum <= 0) continue;
      // English tests and SAT/ACT are alternatives; do not mark an unused
      // alternative as missing when the student supplied another listed test.
      if (actual == null && dimension !== "gpa") continue;
      const known = actual != null && Number.isFinite(actual) && actual > 0;
      checks.push({
        dimension,
        label,
        status: !known ? "missing" : actual < minimum ? "below" : "met",
        studentValue: known ? String(actual) : "Not entered",
        requiredValue: String(minimum),
        detail: `Recorded minimum only; check waivers, alternative tests, degree level and admission year at ${req.sourceUrl}. This does not establish overall eligibility.`,
      });
    }
    for (const [dimension, minima] of [
      ["english", [req.minIelts, req.minToefl, req.minDet]],
      ["standardized", [req.minSat, req.minAct]],
    ] as const) {
      if (!minima.some((n) => n != null && Number.isFinite(n) && n > 0)) continue;
      const alternatives = checks.filter((c) => c.dimension === dimension);
      if (!alternatives.length) {
        checks.push({
          dimension,
          label: "Recorded test requirement",
          status: "missing",
          studentValue: "No relevant test entered",
          requiredValue: "Check a listed test or waiver",
          detail: `A numeric requirement is recorded at ${req.sourceUrl}; no relevant student result was supplied.`,
        });
      } else if (alternatives.some((c) => c.status === "met")) {
        // SAT/ACT and language tests are alternative routes. A lower result in
        // another listed test must not override the satisfied route.
        for (const c of alternatives.filter((c) => c.status === "below" || c.status === "missing")) {
          c.status = "info";
          c.detail = `Another listed test meets its recorded minimum. Confirm permitted alternatives and waivers at ${req.sourceUrl}.`;
        }
      }
    }
    checks.push({
      dimension: "curriculum",
      label: "Published policy",
      status: "info",
      studentValue: "Review source",
      requiredValue: req.subjectRequirements || "No numeric cutoff established",
      detail: req.otherRequirements || `Read the current policy at ${req.sourceUrl}`,
    });
  }
  if (!checks.length) {
    checks.push({
      dimension: "curriculum",
      label: "Requirements not established",
      status: "info",
      studentValue: "Unknown",
      requiredValue: "Not established from a reviewed specific source",
      detail: "Planning estimates and rank-derived bands cannot establish admission requirements.",
    });
  }
  const numeric = checks.filter((c) => c.status !== "info");
  return {
    requirementChecks: checks,
    eligibilityStatus: numeric.some((c) => c.status === "below")
      ? "below_minimum"
      : numeric.some((c) => c.status === "missing") || !numeric.length
        ? "unknown_inputs"
        : "meets_all",
  };
}
