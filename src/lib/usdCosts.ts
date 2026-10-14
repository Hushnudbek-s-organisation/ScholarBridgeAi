/**
 * Currency-safe adapters for the catalogue's canonical and legacy cost fields.
 * These helpers do not fetch exchange rates: a known non-USD amount is
 * deliberately incomparable with the student's USD budget and remains null.
 */

type MaybeNumber = number | string | null | undefined;

type UniversityCostFields = {
  annualTuition?: MaybeNumber;
  tuitionCurrency?: string | null;
  tuitionPeriod?: string | null;
  annualTuitionUsd?: MaybeNumber;
  annualLivingEst?: MaybeNumber;
  livingCostCurrency?: string | null;
  livingCostPeriod?: string | null;
  annualLivingEstUsd?: MaybeNumber;
  accommodationCost?: MaybeNumber;
  accommodationCostCurrency?: string | null;
  accommodationCostPeriod?: string | null;
  accommodationCostUsd?: MaybeNumber;
  applicationFee?: MaybeNumber;
  applicationFeeCurrency?: string | null;
};

export interface ResolvedUsdUniversityCosts {
  annualTuitionUsd: number | null;
  annualLivingEstUsd: number | null;
  accommodationCostUsd: number | null;
  applicationFeeUsd: number | null;
}

export type ComparableScholarshipAwardPeriod = "year" | "month" | "one_time" | "total";

/** Periods whose award amounts can be compared without inventing a duration. */
export function normalizeScholarshipAwardPeriod(
  period: string | null | undefined
): ComparableScholarshipAwardPeriod | null {
  const normalized = period?.trim().toLowerCase().replace(/[\s-]+/g, "_");
  if (normalized && ["year", "yearly", "annual", "annually", "per_year"].includes(normalized)) return "year";
  if (normalized && ["month", "monthly", "per_month"].includes(normalized)) return "month";
  if (normalized && ["one_time", "once"].includes(normalized)) return "one_time";
  if (normalized === "total") return "total";
  return null;
}

/** Convert a value only when its currency is explicitly USD. */
export function usdAmount(value: MaybeNumber, currency: string | null | undefined): number | null {
  const amount = finiteNonNegative(value);
  if (amount == null || normalizeCurrency(currency) !== "USD") return null;
  return amount;
}

/**
 * Resolve a canonical currency + period field to annual USD, or fall back to
 * the explicitly USD legacy mirror only when the canonical amount is absent.
 * An explicitly non-USD canonical value is not replaced by a possibly stale
 * legacy mirror.
 */
export function annualUsdAmount(input: {
  value?: MaybeNumber;
  currency?: string | null;
  period?: string | null;
  legacyUsd?: MaybeNumber;
}): number | null {
  if (input.value != null) {
    const amount = usdAmount(input.value, input.currency);
    return amount == null ? null : annualize(amount, input.period);
  }
  return usdAmount(input.legacyUsd, "USD");
}

/** Resolve university catalogue values into the USD units used by budgets. */
export function resolvedUsdUniversityCosts(row: UniversityCostFields): ResolvedUsdUniversityCosts {
  return {
    annualTuitionUsd: annualUsdAmount({
      value: row.annualTuition,
      currency: row.tuitionCurrency,
      period: row.tuitionPeriod,
      legacyUsd: row.annualTuitionUsd,
    }),
    annualLivingEstUsd: annualUsdAmount({
      value: row.annualLivingEst,
      currency: row.livingCostCurrency,
      period: row.livingCostPeriod,
      legacyUsd: row.annualLivingEstUsd,
    }),
    accommodationCostUsd: annualUsdAmount({
      value: row.accommodationCost,
      currency: row.accommodationCostCurrency,
      period: row.accommodationCostPeriod,
      legacyUsd: row.accommodationCostUsd,
    }),
    applicationFeeUsd: usdAmount(row.applicationFee, row.applicationFeeCurrency),
  };
}

/**
 * Resolve a scholarship's displayed/fixed award amount to USD. This does not
 * infer an annual value from awardPeriod; callers making annual comparisons
 * must inspect that separate catalogue field.
 */
export function resolvedUsdScholarshipAmount(row: {
  awardAmount?: MaybeNumber;
  awardCurrency?: string | null;
  amountUsdValue?: MaybeNumber;
}): number | null {
  if (row.awardAmount != null) return usdAmount(row.awardAmount, row.awardCurrency);
  return usdAmount(row.amountUsdValue, "USD");
}

export function normalizeCurrency(currency: string | null | undefined): string | null {
  const normalized = currency?.trim().toUpperCase();
  return normalized || null;
}

function annualize(amount: number, period: string | null | undefined): number | null {
  const normalized = period?.trim().toLowerCase().replace(/[\s_-]+/g, " ") || "year";
  if (["year", "yearly", "annual", "annually", "per year"].includes(normalized)) return amount;
  if (["month", "monthly", "per month"].includes(normalized)) return amount * 12;
  return null;
}

function finiteNonNegative(value: MaybeNumber): number | null {
  if (value == null || (typeof value === "string" && !value.trim())) return null;
  const amount = Number(value);
  return Number.isFinite(amount) && amount >= 0 ? amount : null;
}
