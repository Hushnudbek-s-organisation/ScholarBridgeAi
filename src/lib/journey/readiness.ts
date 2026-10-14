/**
 * Profile information coverage and university-catalogue test comparisons.
 *
 * Scores in this module describe which details are recorded or tracked; they
 * do not grade applicant quality, establish programme eligibility, or predict
 * admission. Tests, documents and application plans are context-dependent.
 *
 * Pure module — regression checks live in `scripts/check-journey.ts`.
 */

import { roundTo } from "@/lib/scoring";

export type ReadinessKey =
  | "academic"
  | "english"
  | "testing"
  | "activities"
  | "documents"
  | "application"
  | "finance";

export type ReadinessState = "complete" | "partial" | "not_recorded" | "unknown";

export interface ReadinessCategory {
  key: ReadinessKey;
  label: string;
  /** 0–100 coverage of tracked information, not admission readiness. */
  pct: number;
  precise: number;
  state: ReadinessState;
  /** Stable message keys localized by the UI. */
  gaps: string[];
  /** Where the student can review or update these records. */
  tab: string;
  /** No comparable record yet; not a negative signal. */
  unknown: boolean;
}

export const READINESS_LABELS: Record<ReadinessKey, string> = {
  academic: "Academic details",
  english: "English-test record",
  testing: "Standardized-test record",
  activities: "Activity records",
  documents: "Application documents",
  application: "Tracked applications",
  finance: "Funding-plan details",
};

export interface ReadinessInput {
  gpa?: number | null;
  gpaScale?: number | null;
  degreeLevel?: string | null;
  ieltsScore?: number | null;
  toeflScore?: number | null;
  duolingoScore?: number | null;
  satScore?: number | null;
  actScore?: number | null;
  greScore?: number | null;
  leadershipCount?: number;
  awardsCount?: number;
  researchCount?: number;
  activitiesCount: number;
  documentsReady: number;
  documentsTotal: number;
  applicationsStarted: number;
  applicationsSubmitted: number;
  /** Optional planning fields; the number of scholarships is not a target. */
  familyBudget?: number | null;
  fundingPreference?: boolean | null;
}

export const READINESS_WEIGHTS: Record<ReadinessKey, number> = {
  academic: 1 / 7,
  english: 1 / 7,
  testing: 1 / 7,
  activities: 1 / 7,
  documents: 1 / 7,
  application: 1 / 7,
  finance: 1 / 7,
};

export function profileReadiness(input: ReadinessInput): {
  categories: ReadinessCategory[];
  /** Lowest coverage among categories with recorded, comparable data. */
  weakest: ReadinessCategory[];
  overall: number;
  overallPrecise: number;
  weights: Record<ReadinessKey, number>;
} {
  const make = (
    key: ReadinessKey,
    recorded: number,
    total: number,
    gaps: string[],
    tab: string,
    optional = true,
  ): ReadinessCategory => {
    const count = Math.max(0, Math.min(total, recorded));
    const unknown = optional && count === 0;
    const precise = total > 0 ? roundTo((count / total) * 100, 1) : 0;
    const value = unknown ? 0 : precise;
    const state: ReadinessState = unknown
      ? "unknown"
      : value === 100
        ? "complete"
        : value > 0
          ? "partial"
          : "not_recorded";
    return {
      key,
      label: READINESS_LABELS[key],
      pct: Math.round(value),
      precise: value,
      state,
      gaps: count < total ? gaps : [],
      tab,
      unknown,
    };
  };

  const hasGpa = Number(input.gpa) > 0;
  const hasScale = Number(input.gpaScale) > 0;
  const hasDegree = Boolean(input.degreeLevel?.trim());
  const categories: ReadinessCategory[] = [
    make(
      "academic",
      Number(hasGpa) + Number(hasScale) + Number(hasDegree),
      3,
      [
        ...(!hasGpa ? ["gpaValue"] : []),
        ...(hasGpa && !hasScale ? ["gpaScale"] : []),
        ...(!hasDegree ? ["degreeLevel"] : []),
      ],
      "profile",
    ),
    make(
      "english",
      Number([input.ieltsScore, input.toeflScore, input.duolingoScore].some((value) => Number(value) > 0)),
      1,
      ["englishPolicy"],
      "tests",
    ),
    make(
      "testing",
      Number([input.satScore, input.actScore, input.greScore].some((value) => Number(value) > 0)),
      1,
      ["standardizedPolicy"],
      "tests",
    ),
    make(
      "activities",
      Number(
        Number(input.activitiesCount ?? 0) > 0 ||
          Number(input.leadershipCount ?? 0) > 0 ||
          Number(input.awardsCount ?? 0) > 0 ||
          Number(input.researchCount ?? 0) > 0,
      ),
      1,
      ["activitiesOptional"],
      "activities",
    ),
    make(
      "documents",
      Number(input.documentsReady ?? 0),
      Math.max(0, Number(input.documentsTotal ?? 0)),
      [input.documentsTotal > input.documentsReady ? "documentsPending" : "documentChecklist"],
      "documents",
      Number(input.documentsTotal ?? 0) === 0,
    ),
    make(
      "application",
      Number(input.applicationsSubmitted ?? 0),
      Math.max(0, Number(input.applicationsStarted ?? 0)),
      [input.applicationsStarted > input.applicationsSubmitted ? "applicationsPending" : "noApplications"],
      "applications",
      Number(input.applicationsStarted ?? 0) === 0,
    ),
    make(
      "finance",
      Number(Number(input.familyBudget) > 0) + Number(input.fundingPreference != null),
      2,
      [
        ...(!(Number(input.familyBudget) > 0) ? ["budgetPlan"] : []),
        ...(input.fundingPreference == null ? ["fundingPreference"] : []),
      ],
      "funding",
    ),
  ];

  const measured = categories.filter((category) => !category.unknown);
  const totalWeight = measured.reduce((sum, category) => sum + READINESS_WEIGHTS[category.key], 0);
  const overallPrecise = totalWeight
    ? roundTo(measured.reduce((sum, category) => sum + category.precise * READINESS_WEIGHTS[category.key], 0) / totalWeight, 1)
    : 0;
  const weakest = [...measured].sort((a, b) => a.pct - b.pct).slice(0, 3);

  return {
    categories,
    weakest,
    overall: Math.round(overallPrecise),
    overallPrecise,
    weights: READINESS_WEIGHTS,
  };
}

export type TestGapState = "no_figure" | "no_score" | "below_figure" | "at_or_above_figure";
export type TestGapMessageKey = "catalogueFigureUnknown" | "scoreNotRecorded" | "belowCatalogueFigure" | "atOrAboveCatalogueFigure";

export interface TestGap {
  testType: string;
  catalogueFigure: number | null;
  current: number | null;
  /** Difference from the catalogue figure; it does not indicate admission impact. */
  delta: number | null;
  state: TestGapState;
  messageKey: TestGapMessageKey;
}

/**
 * Compare a profile score with a university-level catalogue figure. The figure
 * may not apply to the student's programme, so the result always requires
 * programme-level verification and never claims universal eligibility.
 */
export function testGap(
  testType: string,
  catalogueFigure: number | null | undefined,
  current: number | null | undefined,
  _label: string,
): TestGap {
  const value = typeof current === "number" && Number.isFinite(current) ? current : null;
  if (catalogueFigure == null || !Number.isFinite(catalogueFigure)) {
    return {
      testType,
      catalogueFigure: null,
      current: value,
      delta: null,
      state: "no_figure",
      messageKey: "catalogueFigureUnknown",
    };
  }
  if (value == null) {
    return {
      testType,
      catalogueFigure,
      current: null,
      delta: null,
      state: "no_score",
      messageKey: "scoreNotRecorded",
    };
  }
  const delta = roundTo(value - catalogueFigure, 2);
  return {
    testType,
    catalogueFigure,
    current: value,
    delta,
    state: delta >= 0 ? "at_or_above_figure" : "below_figure",
    messageKey: delta >= 0 ? "atOrAboveCatalogueFigure" : "belowCatalogueFigure",
  };
}
