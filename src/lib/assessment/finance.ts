/**
 * Assessment finance — total cost, funding gap and funding SCENARIOS.
 *
 * THE THREE THINGS THIS KEEPS APART (spec §7)
 * -------------------------------------------
 *  1. A confirmed award may reduce the bill only within its own amount, period,
 *     restriction and conditions.
 *  2. A competitive grant the student has NOT been awarded is never netted
 *     against the bill — it is a separate scenario.
 *  3. A tuition-only award never pays living costs, and non-combinable awards
 *     are never added together.
 *
 * An unknown cost is never 0: if any mandatory line is unknown, the total is
 * unknown and the gap becomes an INTERVAL (known lower bound … unknown). A
 * single period and currency is compared; a foreign currency without a recorded
 * rate/date/source stays incomparable instead of being converted by guesswork.
 *
 * Pure module — asserted in `scripts/check-assessment.ts`.
 */

import { knownMoney, roundMoney } from "@/lib/financeModel";
import { FINANCE_RULES_VERSION, SCORING_VERSION } from "./version";

export type CostKind = "tuition" | "mandatory_fee" | "living" | "insurance" | "other";

export interface CostLine {
  key: string;
  kind: CostKind;
  label: string;
  /** Amount for ONE academic year. Null = unknown (never 0). */
  annualUsd: number | null;
  /** A one-off charge counted once (application fee, visa fee, deposit). */
  oneTime?: boolean;
  /** One-off amount in USD when `oneTime` is true. */
  oneTimeUsd?: number | null;
  sourceUrl?: string | null;
  /** Where the amount came from, so the UI can say "estimate" or "published". */
  basis?: "published" | "estimate" | "student_estimate" | "converted" | "unknown";
  /** Provenance of a currency conversion, when one was applied. */
  conversion?: { rate: number; date: string; source: string } | null;
  /** Set when the amount was recorded in a currency with no usable rate. */
  incomparableCurrency?: string | null;
}

export type FundingKind =
  | "confirmed_award"
  | "automatic_grant"
  | "competitive_grant"
  | "loan"
  | "reimbursement"
  | "tuition_waiver";

export interface FundingLine {
  key: string;
  label: string;
  kind: FundingKind;
  /** Annual USD, null when unknown. */
  annualUsd: number | null;
  /** What the award may pay for. */
  appliesTo: "tuition" | "living" | "any";
  /** Only `true` when every condition of an automatic award was verified. */
  automaticConditionsVerified?: boolean | null;
  /** Awards in one exclusive group cannot be combined. */
  exclusiveGroup?: string | null;
  /** Eligibility is met, but the award is not granted. */
  awarded?: boolean;
  sourceUrl?: string | null;
  note?: string | null;
}

export interface FinanceInput {
  costs: CostLine[];
  funding?: FundingLine[];
  /** The student's annual available budget in USD. Null = not stated. */
  availableBudgetUsd: number | null;
  /** Programme length in years, when a whole-programme view is wanted. */
  durationYears?: number | null;
}

export interface FundingScenario {
  key: string;
  label: string;
  /** Total confirmed funding counted in this scenario. */
  annualFundingUsd: number | null;
  netAnnualCostUsd: number | null;
  gapAnnualUsd: number | null;
  /** True when this scenario depends on an award the student has not won. */
  conditional: boolean;
  includedFunding: string[];
  excludedFunding: { key: string; reason: string }[];
  note: string;
}

export interface FinanceAssessment {
  scoringVersion: string;
  rulesVersion: string;
  /** Annual recurring total; null when any mandatory recurring line is unknown. */
  annualTotalUsd: number | null;
  /** Lower bound of the recurring total using only KNOWN lines. */
  annualTotalLowerBoundUsd: number;
  /** One-off charges, summed only when every one-off line is known. */
  oneTimeTotalUsd: number | null;
  missingCostLines: string[];
  incomparableCostLines: { key: string; currency: string | null }[];
  confirmedFundingUsd: number | null;
  /** Awards excluded from the net calculation, with the reason. */
  excludedFunding: { key: string; reason: string }[];
  netAnnualCostUsd: number | null;
  /** max(0, net − budget). Null when the net cost or the budget is unknown. */
  fundingGapUsd: number | null;
  /** The gap as an interval when the total is not fully known. */
  fundingGapRangeUsd: { lower: number; upper: number | null } | null;
  availableBudgetUsd: number | null;
  /** "budget_not_stated" / "cost_unknown" / "unknown" / "gap" / "covered". */
  status: "budget_not_stated" | "cost_unknown" | "unknown" | "gap" | "covered";
  scenarios: FundingScenario[];
  notes: string[];
}

/** Sum known values; ANY unknown makes the sum unknown (never 0). */
function sumStrict(values: (number | null)[]): number | null {
  let total = 0;
  for (const value of values) {
    const known = knownMoney(value);
    if (known == null) return null;
    total += known;
  }
  return roundMoney(total);
}

function usable(line: FundingLine): boolean {
  if (knownMoney(line.annualUsd) == null) return false;
  if (line.kind === "loan" || line.kind === "reimbursement") return false;
  if (line.kind === "competitive_grant") return false;
  if (line.kind === "automatic_grant" && line.automaticConditionsVerified !== true) return false;
  return true;
}

function exclusionReason(line: FundingLine): string {
  if (knownMoney(line.annualUsd) == null) return "amount_unknown";
  if (line.kind === "loan") return "repayable_loan_not_a_reduction";
  if (line.kind === "reimbursement") return "reimbursement_cannot_pay_an_upfront_bill";
  if (line.kind === "competitive_grant") return "not_awarded_competitive_grant_is_a_scenario";
  if (line.kind === "automatic_grant" && line.automaticConditionsVerified !== true)
    return "automatic_award_conditions_not_verified";
  return "excluded";
}

/**
 * Net a set of usable awards against the bill, honouring restrictions:
 * a tuition-only award is capped at the tuition line, so it can never pay rent.
 */
function netAwards(
  awards: FundingLine[],
  limits: { tuition: number | null; living: number | null }
): { counted: number; included: string[] } {
  let tuitionRemaining = limits.tuition;
  let livingRemaining = limits.living;
  let counted = 0;
  const included: string[] = [];
  // Restricted awards allocate first; unrestricted funding uses only the rest.
  const ordered = [...awards].sort((a, b) => (a.appliesTo === "any" ? 1 : 0) - (b.appliesTo === "any" ? 1 : 0));
  for (const award of ordered) {
    const amount = knownMoney(award.annualUsd);
    if (amount == null) continue;
    if (award.appliesTo === "tuition") {
      const usableAmount = tuitionRemaining == null ? amount : Math.min(amount, Math.max(0, tuitionRemaining));
      counted += usableAmount;
      if (tuitionRemaining != null) tuitionRemaining -= usableAmount;
      included.push(award.key);
    } else if (award.appliesTo === "living") {
      const usableAmount = livingRemaining == null ? amount : Math.min(amount, Math.max(0, livingRemaining));
      counted += usableAmount;
      if (livingRemaining != null) livingRemaining -= usableAmount;
      included.push(award.key);
    } else {
      const tuitionPart = tuitionRemaining == null ? 0 : Math.min(amount, Math.max(0, tuitionRemaining));
      const livingPart = Math.min(amount - tuitionPart, livingRemaining == null ? amount - tuitionPart : Math.max(0, livingRemaining));
      counted += tuitionPart + livingPart;
      if (tuitionRemaining != null) tuitionRemaining -= tuitionPart;
      if (livingRemaining != null) livingRemaining -= livingPart;
      included.push(award.key);
    }
  }
  return { counted: roundMoney(counted), included };
}

/** Collapse exclusive groups to their single best usable award. */
function dedupeExclusive(lines: FundingLine[]): { kept: FundingLine[]; dropped: { key: string; reason: string }[] } {
  const kept: FundingLine[] = [];
  const dropped: { key: string; reason: string }[] = [];
  const bestByGroup = new Map<string, FundingLine>();
  for (const line of lines) {
    if (!line.exclusiveGroup) {
      kept.push(line);
      continue;
    }
    const current = bestByGroup.get(line.exclusiveGroup);
    const amount = knownMoney(line.annualUsd) ?? -1;
    const currentAmount = current ? (knownMoney(current.annualUsd) ?? -1) : -2;
    if (!current || amount > currentAmount) {
      if (current) dropped.push({ key: current.key, reason: `not_combinable_with_${line.key}` });
      bestByGroup.set(line.exclusiveGroup, line);
    } else {
      dropped.push({ key: line.key, reason: `not_combinable_with_${current.key}` });
    }
  }
  return { kept: [...kept, ...bestByGroup.values()], dropped };
}

export function assessFinance(input: FinanceInput): FinanceAssessment {
  const costs = input.costs ?? [];
  const recurring = costs.filter((line) => !line.oneTime);
  const oneTime = costs.filter((line) => line.oneTime);

  const missingCostLines = recurring
    .filter((line) => knownMoney(line.annualUsd) == null)
    .map((line) => line.key);
  const incomparableCostLines = costs
    .filter((line) => line.incomparableCurrency || (line.basis === "converted" && !line.conversion?.rate))
    .map((line) => ({ key: line.key, currency: line.incomparableCurrency ?? null }));

  const knownRecurring = recurring
    .map((line) => knownMoney(line.annualUsd))
    .filter((value): value is number => value != null);
  const annualTotalLowerBoundUsd = roundMoney(knownRecurring.reduce((sum, value) => sum + value, 0));
  const annualTotalUsd = missingCostLines.length
    ? null
    : sumStrict(recurring.map((line) => line.annualUsd));
  const oneTimeTotalUsd = oneTime.length ? sumStrict(oneTime.map((line) => line.oneTimeUsd ?? line.annualUsd)) : 0;

  const tuition = recurring.find((line) => line.kind === "tuition");
  const living = recurring.find((line) => line.kind === "living");

  const allFunding = input.funding ?? [];
  const { kept, dropped } = dedupeExclusive(allFunding);

  // Scenario A — only confirmed, usable awards.
  const confirmedAwards = kept.filter(usable);
  const confirmedNet = netAwards(confirmedAwards, {
    tuition: knownMoney(tuition?.annualUsd),
    living: knownMoney(living?.annualUsd),
  });

  const excludedFunding = [
    ...dropped,
    ...kept.filter((line) => !usable(line)).map((line) => ({ key: line.key, reason: exclusionReason(line) })),
  ];

  // Confirmed funding counted against the bill (restrictions already applied).
  const confirmedFundingUsd = confirmedNet.counted;

  const budget = knownMoney(input.availableBudgetUsd);
  const netAnnualCostUsd =
    annualTotalUsd == null ? null : roundMoney(Math.max(0, annualTotalUsd - confirmedFundingUsd));

  const gapOf = (net: number | null): number | null =>
    net == null || budget == null ? null : roundMoney(Math.max(0, net - budget));

  const fundingGapUsd = gapOf(netAnnualCostUsd);
  const fundingGapRangeUsd =
    annualTotalUsd == null && budget != null
      ? {
          lower: roundMoney(Math.max(0, annualTotalLowerBoundUsd - confirmedFundingUsd - budget)),
          upper: null,
        }
      : null;

  // Scenario B — the bill if every plausibly-winnable award (including an
  // unverified automatic award) is won. Clearly conditional.
  const conditionalLines = kept.filter(
    (line) =>
      line.kind === "competitive_grant" ||
      (line.kind === "automatic_grant" && line.automaticConditionsVerified !== true)
  );
  const withConditional = netAwards([...confirmedAwards, ...conditionalLines], {
    tuition: knownMoney(tuition?.annualUsd),
    living: knownMoney(living?.annualUsd),
  });
  const conditionalNet =
    annualTotalUsd == null ? null : roundMoney(Math.max(0, annualTotalUsd - withConditional.counted));

  const scenarios: FundingScenario[] = [
    {
      key: "confirmed_only",
      label: "Confirmed funding only",
      annualFundingUsd: confirmedFundingUsd,
      netAnnualCostUsd,
      gapAnnualUsd: fundingGapUsd,
      conditional: false,
      includedFunding: confirmedNet.included,
      excludedFunding,
      note:
        "Counts only awards confirmed for this applicant. Loans and reimbursements are excluded because they do not reduce what must be paid.",
    },
  ];
  if (conditionalLines.length) {
    scenarios.push({
      key: "with_conditional_awards",
      label: "If the conditional awards are won",
      annualFundingUsd: withConditional.counted,
      netAnnualCostUsd: conditionalNet,
      gapAnnualUsd: gapOf(conditionalNet),
      conditional: true,
      includedFunding: withConditional.included,
      excludedFunding: excludedFunding.filter((entry) => entry.reason !== "not_awarded_competitive_grant_is_a_scenario"),
      note:
        "A scenario, not a fact: a competitive grant counts only after it is awarded, and the result depends on an outcome nobody can promise.",
    });
  }

  const status: FinanceAssessment["status"] =
    annualTotalUsd == null
      ? budget == null
        ? "unknown"
        : "cost_unknown"
      : budget == null
        ? "budget_not_stated"
        : (netAnnualCostUsd ?? 0) - budget > 0
          ? "gap"
          : "covered";

  const notes: string[] = [
    "Total = tuition + mandatory fees + living costs + insurance + other relevant charges, for one academic year, in one currency.",
    "A confirmed award reduces the bill only up to what it may legally pay; a tuition-only award cannot pay living costs.",
  ];
  if (missingCostLines.length) {
    notes.push(
      `Unknown cost line${missingCostLines.length === 1 ? "" : "s"} (${missingCostLines.join(", ")}); the total is unknown, never zero.`
    );
  }
  if (incomparableCostLines.length) {
    notes.push("A cost recorded in another currency without a recorded rate, date and source is not converted here.");
  }

  return {
    scoringVersion: SCORING_VERSION,
    rulesVersion: FINANCE_RULES_VERSION,
    annualTotalUsd,
    annualTotalLowerBoundUsd,
    oneTimeTotalUsd,
    missingCostLines,
    incomparableCostLines,
    confirmedFundingUsd,
    excludedFunding,
    netAnnualCostUsd,
    fundingGapUsd,
    fundingGapRangeUsd,
    availableBudgetUsd: budget,
    status,
    scenarios,
    notes,
  };
}
