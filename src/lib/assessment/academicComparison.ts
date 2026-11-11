/**
 * Academic comparison — the student's own result against a PUBLISHED statistic.
 *
 * WHAT IT IS (spec §8)
 * --------------------
 *   score < p25           → "below"  (below the published middle 50%)
 *   p25 ≤ score ≤ p75     → "within"
 *   score > p75           → "above"
 *
 * WHAT IT IS NOT
 * --------------
 *  • Not an individual percentile.
 *  • Not an admission probability.
 *  • Not a comparison against an unpublished band: without a published
 *    statistic for the SAME scope (programme/university, year, population) the
 *    answer is `unknown`, and the scope is reported with the comparison so a
 *    university-wide figure is never presented as a programme statistic.
 *
 * Pure module — asserted in `scripts/check-assessment.ts`.
 */

import { ADMISSION_PROBABILITY_REASON, SCORING_VERSION } from "./version";

export type ComparisonPosition = "below" | "within" | "above" | "unknown";

export type ComparisonPopulation = "applicants" | "admitted" | "enrolled" | "test_submitters" | "unknown";

export interface PublishedStatistic {
  metric: "gpa" | "sat" | "act" | "ielts" | "toefl";
  unit: string;
  p25: number | null;
  p50: number | null;
  p75: number | null;
  /** Publication year / cycle of the statistic, e.g. "Class of 2029". */
  year: string | null;
  /** What the statistic describes — a programme or the whole institution. */
  scope: { kind: "programme" | "university"; label: string | null };
  population: ComparisonPopulation;
  sourceUrl: string | null;
  /** Only a verified, published statistic may be compared with. */
  verificationStatus: string;
  valueType: string;
}

export interface AcademicComparison {
  metric: PublishedStatistic["metric"];
  unit: string;
  studentValue: number | null;
  p25: number | null;
  p50: number | null;
  p75: number | null;
  position: ComparisonPosition;
  /** Why the comparison is unknown, when it is. */
  reason:
    | "no_student_value"
    | "no_published_statistic"
    | "incomplete_quartiles"
    | "statistic_not_verified"
    | "scope_mismatch"
    | "incomparable_unit"
    | null;
  statisticYear: string | null;
  statisticScope: PublishedStatistic["scope"];
  population: ComparisonPopulation;
  sourceUrl: string | null;
  /** Plain statement — never "your chance", never a percentile claim. */
  statement: string;
}

export interface ComparisonRequest {
  metric: PublishedStatistic["metric"];
  unit: string;
  studentValue: number | null;
  /** Scope this comparison is being made FOR, so a mismatched statistic is refused. */
  expectedScope?: { kind: "programme" | "university"; label?: string | null } | null;
}

export function compareAcademicMetric(
  request: ComparisonRequest,
  statistics: PublishedStatistic[] | null | undefined
): AcademicComparison {
  const base = {
    metric: request.metric,
    unit: request.unit,
    studentValue: request.studentValue,
    p25: null as number | null,
    p50: null as number | null,
    p75: null as number | null,
    statisticYear: null as string | null,
    statisticScope: { kind: "university" as const, label: null as string | null },
    population: "unknown" as ComparisonPopulation,
    sourceUrl: null as string | null,
  };

  const unknown = (reason: NonNullable<AcademicComparison["reason"]>, statement: string): AcademicComparison => ({
    ...base,
    position: "unknown",
    reason,
    statement,
  });

  if (request.studentValue == null || !Number.isFinite(request.studentValue)) {
    return unknown("no_student_value", "No recorded result for this measure, so no comparison is made.");
  }
  const candidates = (statistics ?? []).filter(
    (stat) => stat.metric === request.metric && stat.verificationStatus === "verified" && stat.valueType === "observed_statistic"
  );
  if (!candidates.length) {
    return unknown(
      "no_published_statistic",
      "No verified published statistic for this measure exists for this programme and cycle, so it is not compared."
    );
  }
  const scoped = request.expectedScope
    ? candidates.filter((stat) => stat.scope.kind === request.expectedScope!.kind)
    : candidates;
  if (!scoped.length) {
    return unknown(
      "scope_mismatch",
      "Only a wider-scope statistic is published; a university-wide figure is not presented as a programme statistic."
    );
  }
  const stat = scoped[0];
  if (stat.unit && stat.unit !== request.unit) {
    return unknown("incomparable_unit", "The published statistic is on a different scale from the recorded result.");
  }
  if (stat.p25 == null || stat.p75 == null) {
    return unknown(
      "incomplete_quartiles",
      "The published statistic does not include a middle-50% band, so a position cannot be stated."
    );
  }

  const position: ComparisonPosition =
    request.studentValue < stat.p25 ? "below" : request.studentValue > stat.p75 ? "above" : "within";

  return {
    ...base,
    p25: stat.p25,
    p50: stat.p50,
    p75: stat.p75,
    position,
    reason: null,
    statisticYear: stat.year,
    statisticScope: stat.scope,
    population: stat.population,
    sourceUrl: stat.sourceUrl,
    statement:
      position === "below"
        ? `The recorded result is below the published 25th percentile (${stat.p25}–${stat.p75}).`
        : position === "above"
          ? `The recorded result is above the published 75th percentile (${stat.p25}–${stat.p75}).`
          : `The recorded result is inside the published middle 50% (${stat.p25}–${stat.p75}).`,
  };
}

/** Admission probability is always null while no validated model exists. */
export function admissionProbability(): {
  value: null;
  reason: typeof ADMISSION_PROBABILITY_REASON;
  scoringVersion: string;
} {
  return { value: null, reason: ADMISSION_PROBABILITY_REASON, scoringVersion: SCORING_VERSION };
}
