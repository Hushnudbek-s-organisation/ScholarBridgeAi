/**
 * One honest answer to "does this fit my budget?" everywhere in the product.
 *
 * The reported bug: a university with $3,000 tuition + $15,000 living was shown
 * as "fits your budget" to a student with a $3,000 annual budget, because the
 * decision pill compared ONLY tuition. An unknown living cost is NOT $0.
 *
 * This module separates:
 *  - tuition-only fit ("the published contract alone fits");
 *  - full annual fit (tuition + living + explicitly included annual lines);
 *  - incomplete calculation (a required cost line is unknown → no verdict).
 *
 * Pure module — asserted in `scripts/check-budget-fit.ts`.
 *
 * The known-value, rounding, period and aid primitives come from the ONE
 * canonical `financeModel.ts` that the detailed financial plan (`costs.ts`)
 * also imports. Earlier these two modules each defined their own `known()` /
 * rounding / period handling, which is why one report could claim "a single
 * calculation model works" while another said the plan was not unified.
 */
import { knownMoney, roundMoney } from "./financeModel";

export interface BudgetFitLine {
  key: string;
  /** Amount in USD per year. */
  annualUsd: number;
}

export interface BudgetFitInput {
  tuitionUsd?: number | null;
  livingUsd?: number | null;
  budgetUsd?: number | null;
  /** Extra known annual lines (insurance, books, transport …). Unknown extra
   *  lines are simply not included — callers must not claim a full total. */
  extraAnnualLines?: BudgetFitLine[];
}

export type BudgetFitState =
  | "unknown"
  | "tuition_over"
  | "tuition_only"
  | "total_fits"
  | "total_over";

export interface BudgetFit {
  tuitionUsd: number | null;
  livingUsd: number | null;
  budgetUsd: number | null;
  /** tuition − budget (legacy field, kept for existing callers/tests). */
  tuitionGapUsd: number | null;
  tuitionWithinBudget: boolean | null;
  /** null when ANY required annual line is unknown. Never sums unknown as 0. */
  annualTotalUsd: number | null;
  totalGapUsd: number | null;
  /** Full-calculation verdict. null = "to'liq hisoblanmagan". */
  withinBudget: boolean | null;
  /** Every line that was actually summed, for display. */
  lines: BudgetFitLine[];
  /** Lines that were missing, so the UI can say what is not calculated. */
  missing: string[];
  complete: boolean;
  state: BudgetFitState;
}

// Canonical helpers from financeModel.ts — the SAME known-value/rounding
// semantics costs.ts uses, so the concise verdict and the detailed plan agree.
const known = knownMoney;
const round = roundMoney;

export function evaluateBudgetFit(input: BudgetFitInput): BudgetFit {
  const tuitionUsd = known(input.tuitionUsd);
  const livingUsd = known(input.livingUsd);
  const budgetUsd = known(input.budgetUsd);
  const extra = (input.extraAnnualLines ?? []).filter(
    (line) => Number.isFinite(line.annualUsd) && line.annualUsd >= 0,
  );
  const missing: string[] = [];
  if (tuitionUsd == null) missing.push("tuition");
  if (livingUsd == null) missing.push("living");
  if (budgetUsd == null) missing.push("budget");

  const tuitionGapUsd = tuitionUsd != null && budgetUsd != null ? round(tuitionUsd - budgetUsd) : null;
  const tuitionWithinBudget = tuitionGapUsd == null ? null : tuitionGapUsd <= 0;

  // A full total requires EVERY mandatory annual line. An unknown living cost
  // is not zero, so no total and no "fits" verdict can be produced.
  const complete = tuitionUsd != null && livingUsd != null && budgetUsd != null;
  const lines: BudgetFitLine[] = complete
    ? [
        { key: "tuition", annualUsd: tuitionUsd! },
        { key: "living", annualUsd: livingUsd! },
        ...extra,
      ]
    : [];
  const annualTotalUsd = complete ? round(lines.reduce((sum, line) => sum + line.annualUsd, 0)) : null;
  const totalGapUsd = annualTotalUsd != null && budgetUsd != null ? round(annualTotalUsd - budgetUsd) : null;
  const withinBudget = totalGapUsd == null ? null : totalGapUsd <= 0;

  let state: BudgetFitState = "unknown";
  if (tuitionUsd != null && budgetUsd != null) {
    if (!tuitionWithinBudget) state = "tuition_over";
    else if (!complete) state = "tuition_only";
    else state = withinBudget ? "total_fits" : "total_over";
  }

  return {
    tuitionUsd,
    livingUsd,
    budgetUsd,
    tuitionGapUsd,
    tuitionWithinBudget,
    annualTotalUsd,
    totalGapUsd,
    withinBudget,
    lines,
    missing,
    complete,
    state,
  };
}

/** Map the shared verdict onto the recommendation API's tri-state string. */
export function budgetVerdict(fit: BudgetFit): "yes" | "no" | "unknown" {
  return fit.withinBudget == null ? "unknown" : fit.withinBudget ? "yes" : "no";
}
