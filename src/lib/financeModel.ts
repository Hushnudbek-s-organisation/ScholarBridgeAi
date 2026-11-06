/**
 * One canonical finance model — imported by BOTH `budgetFit.ts` and `costs.ts`.
 *
 * The contradiction this resolves: an earlier report said "a single calculation
 * model works" (the budget-fit verdict) while another said `costs.ts` and the
 * financial plan were still separate. They were: each had its own idea of a
 * "known" amount, a period and a scholarship. That let the same student get
 * different answers on a card, in compare, on a grant page and in the plan.
 *
 * This module owns the distinctions every screen must share:
 *  - period: year / semester / month / programme / one_time (never collapsed);
 *  - first year vs later years (a visa fee is not a recurring cost);
 *  - tuition vs living vs one-time vs recurring cost lines;
 *  - grant vs repayable loan vs tuition waiver vs cash stipend vs reimbursement;
 *  - upfront aid vs reimbursement (a reimbursement never pays an upfront bill);
 *  - original currency vs explicitly converted USD (unknown rate = unknown);
 *  - unknown is NEVER 0; an unknown duration means no exact programme total.
 *
 * Pure and dependency-free: no DB, no React, no server-only imports.
 */

export type FinancePeriod = "year" | "semester" | "month" | "programme" | "one_time";
export type AidKind =
  | "grant"
  | "repayable_loan"
  | "tuition_waiver"
  | "cash_stipend"
  | "reimbursement"
  | "unknown";
export type CostKind = "tuition" | "living" | "one_time" | "recurring";

/** A money value keeps its original currency and period; conversion is explicit. */
export interface MoneyValue {
  amount: number;
  currency: string;
  period: FinancePeriod;
  /** "original" = published figure; "converted" = an explicit USD conversion. */
  basis: "original" | "converted";
  /** Null when the conversion rate was not recorded. */
  fxRateToUsd?: number | null;
}

/** A cost line is either annual recurring or a one-time charge. */
export interface FinanceCostLine {
  key: string;
  kind: CostKind;
  /** Null when unknown. Never substituted with zero. */
  annualUsd: number | null;
  /** Null when the amount or the programme duration is unknown. */
  programmeUsd: number | null;
  /** True when the charge applies only in year one (visa, application fee). */
  firstYearOnly: boolean;
}

/** How an award is allowed to reduce what a family must pay. */
export interface FinanceAidLine {
  key: string;
  kind: AidKind;
  /** Resolved annual USD value, or null when unknown/unsupported. */
  annualUsd: number | null;
  /** May it be counted before the bill is due? Reimbursements may not. */
  reducesUpfrontCost: boolean;
  /** Does the student owe it back? Loans do. */
  repayable: boolean;
  /** What it may legally be applied to. */
  appliesTo: "tuition" | "living" | "any";
  /** The publishable note, e.g. "repayable — not a reduction in net cost". */
  note: string;
}

/** The single allowed verdict vocabulary, shared with `budgetFit.ts`. */
export type FinanceState = "unknown" | "tuition_over" | "tuition_only" | "total_fits" | "total_over";

/** A known, finite, non-negative USD amount; everything else is unknown (null). */
export function knownMoney(value: number | null | undefined): number | null {
  return typeof value === "number" && Number.isFinite(value) && value >= 0 ? value : null;
}

export function roundMoney(value: number): number {
  return Math.round(value);
}

const PERIOD_ALIASES: Record<string, FinancePeriod> = {
  year: "year", yearly: "year", annual: "year", annually: "year", per_year: "year",
  "per year": "year", "/year": "year", y: "year",
  semester: "semester", term: "semester", half_year: "semester", per_semester: "semester",
  month: "month", monthly: "month", per_month: "month", "/month": "month",
  programme: "programme", total: "programme", whole_programme: "programme",
  one_time: "one_time", once: "one_time", one_off: "one_time",
};

/** Normalize a stored catalogue period without guessing an unsupported one. */
export function normalizeFinancePeriod(raw: string | null | undefined): FinancePeriod | null {
  const key = String(raw ?? "").trim().toLowerCase().replace(/[\s-]+/g, "_");
  return PERIOD_ALIASES[key] ?? PERIOD_ALIASES[String(raw ?? "").trim().toLowerCase()] ?? null;
}

/** Number of periods of `period` in one academic year. Null for programme/one_time. */
export function periodsPerYear(period: FinancePeriod): number | null {
  if (period === "year") return 1;
  if (period === "semester") return 2;
  if (period === "month") return 12;
  return null;
}

/**
 * Convert a money value to annual USD. A non-USD value without an explicit
 * recorded rate stays unknown — it is NOT assumed to already be USD and NOT
 * treated as zero.
 */
export function annualUsd(value: MoneyValue | null | undefined): number | null {
  if (!value) return null;
  const amount = knownMoney(value.amount);
  if (amount == null) return null;
  const currency = String(value.currency ?? "").trim().toUpperCase();
  let usd: number;
  if (currency === "USD") usd = amount;
  else if (value.basis === "converted" && value.fxRateToUsd != null && value.fxRateToUsd > 0) {
    usd = amount * value.fxRateToUsd;
  } else return null; // unsupported currency or missing rate → unknown
  const perYear = periodsPerYear(value.period);
  return perYear == null ? null : roundMoney(usd * perYear);
}

/** Programme-length total is only defined with a known positive duration. */
export function programmeTotal(annual: number | null, years: number | null | undefined): number | null {
  const a = knownMoney(annual);
  const y = knownMoney(years);
  if (a == null || y == null || y <= 0 || y > 10) return null;
  return roundMoney(a * y);
}

/** Sum known values; ANY unknown makes the whole sum unknown (never 0). */
export function sumKnown(values: (number | null)[]): number | null {
  let total = 0;
  for (const value of values) {
    const known = knownMoney(value);
    if (known == null) return null;
    total += known;
  }
  return roundMoney(total);
}

/**
 * Classify an award. A loan is NEVER a reduction in net cost; a reimbursement
 * NEVER pays an upfront bill; a tuition waiver cannot pay rent; a cash stipend
 * can pay either. Unknown/unsupported periods stay unknown.
 */
export const AID_KIND_NOTES: Record<AidKind, string> = {
  grant: "Grant — does not need to be repaid.",
  repayable_loan: "Repayable loan — excluded from the net-cost reduction.",
  tuition_waiver: "Tuition waiver — reduces tuition only, not living costs.",
  cash_stipend: "Cash stipend — may be applied to tuition or living costs.",
  reimbursement: "Reimbursement — paid after the expense, so it cannot cover an upfront bill.",
  unknown: "Award type or period unknown — not counted as funding.",
};

export function classifyAid(input: {
  key: string;
  /** Catalogue award basis / coverage wording. */
  basis?: string | null;
  /** What the award covers. */
  covers?: "tuition" | "living" | "both" | "other" | null;
  /** Explicit repayment flag from the catalogue. */
  repayable?: boolean | null;
  /** Explicit reimbursement timing. */
  reimbursement?: boolean | null;
  amountUsd?: number | null;
  period?: string | null;
}): FinanceAidLine {
  const noteText = `${input.basis ?? ""} ${input.covers ?? ""}`.toLowerCase();
  let kind: AidKind = "unknown";
  if (input.reimbursement === true) kind = "reimbursement";
  else if (input.repayable === true || /\bloan\b|repay|credit\b/.test(noteText)) kind = "repayable_loan";
  else if (/waiv|tuition\s*(only|credit|fee)|fee\s*waiv/.test(noteText) || input.covers === "tuition") kind = "tuition_waiver";
  else if (/stipend|living|allowance|monthly/.test(noteText) || input.covers === "living") kind = "cash_stipend";
  else if (/grant|scholarship|full_tuition|full funding|award|bursary/.test(noteText) || input.covers === "both") kind = "grant";

  const period = normalizeFinancePeriod(input.period);
  const perYear = period == null ? null : periodsPerYear(period);
  const amount = knownMoney(input.amountUsd);
  const annual = amount != null && perYear != null ? roundMoney(amount * perYear) : null;

  const appliesTo: FinanceAidLine["appliesTo"] =
    kind === "tuition_waiver" ? "tuition" : kind === "cash_stipend" ? "living" : kind === "grant" ? "any" : "any";

  return {
    key: input.key,
    kind,
    annualUsd: annual,
    reducesUpfrontCost: kind !== "reimbursement" && kind !== "repayable_loan" && kind !== "unknown",
    repayable: kind === "repayable_loan",
    appliesTo,
    note: AID_KIND_NOTES[kind],
  };
}

/**
 * Upfront funding that may actually be netted against a known annual cost.
 * Loans, reimbursements and unknown awards never reduce it. Tuition waivers are
 * capped at the tuition line so a $9,000 waiver cannot "cover" living costs.
 */
export function usableUpfrontAid(
  aid: FinanceAidLine[],
  limits: { tuitionAnnualUsd: number | null; livingAnnualUsd: number | null },
): { totalUsd: number; excluded: string[] } {
  let total = 0;
  const excluded: string[] = [];
  let waiverUsed = 0;
  for (const line of aid) {
    if (!line.reducesUpfrontCost || line.annualUsd == null) {
      excluded.push(line.key);
      continue;
    }
    let usable = line.annualUsd;
    if (line.kind === "tuition_waiver") {
      const cap = knownMoney(limits.tuitionAnnualUsd) ?? 0;
      usable = Math.max(0, Math.min(usable, Math.max(0, cap - waiverUsed)));
      waiverUsed += usable;
    }
    if (line.appliesTo === "living" && knownMoney(limits.livingAnnualUsd) == null) {
      // Living cost unknown: a living stipend cannot be verified as covering a
      // shortfall, but it remains a real award; it is not silently dropped.
      excluded.push(line.key);
      continue;
    }
    total += usable;
  }
  return { totalUsd: roundMoney(total), excluded };
}
