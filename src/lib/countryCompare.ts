/**
 * #29 Country comparison.
 *
 * Deterministic comparison of destination countries, computed ONLY from the
 * data the platform actually has (university and scholarship rows in the
 * database).
 *
 * What it refuses to do:
 *  - invent visa/work-rights figures from memory — that row stays `null`
 *    and the UI says "not published in the database"
 *  - treat an unpublished tuition/living value as zero — unpublished values
 *    are excluded from the average and counted as such (the old NaN bug came
 *    from exactly this kind of assumption)
 */

import { countriesMatch, countryTranslationKey, normalizeCountryAlias } from "@/lib/countries";
import { normalizeScholarshipAwardPeriod, type ComparableScholarshipAwardPeriod } from "@/lib/usdCosts";

export interface UniInput {
  country: string | null;
  annualTuitionUsd?: number | null;
  annualLivingEstUsd?: number | null;
  minIelts?: number | null;
  postStudyWorkVisaYears?: number | null;
}

export interface SchInput {
  country: string | null;
  amountUsdValue?: number | null;
  awardPeriod?: string | null;
}

export interface CountryComparison {
  country: string;
  universities: number;
  tuition: { avgUsd: number | null; published: number };
  living: { avgUsd: number | null; published: number };
  minIelts: { avg: number | null; published: number };
  scholarships: {
    count: number;
    amountsPublished: number;
    awardPeriod: ComparableScholarshipAwardPeriod | null;
    avgUsd: number | null;
    totalUsd: number | null;
  };
  /** Published post-study work data only; null means no country value is published. */
  workRights: { avgYears: number; published: number } | null;
}

function average(values: number[]): number | null {
  if (!values.length) return null;
  return Math.round(values.reduce((a, b) => a + b, 0) / values.length);
}

function oneDecimal(values: number[]): number | null {
  if (!values.length) return null;
  const mean = values.reduce((a, b) => a + b, 0) / values.length;
  return Math.round(mean * 10) / 10;
}

export function compareCountries(country: string, unis: UniInput[], schs: SchInput[]): CountryComparison {
  const inCountry = unis.filter((u) => countriesMatch(u.country, country));
  const inSchs = schs.filter((s) => countriesMatch(s.country, country));

  const tuition = inCountry.map((u) => u.annualTuitionUsd).filter((n): n is number => n != null && Number.isFinite(n));
  const living = inCountry.map((u) => u.annualLivingEstUsd).filter((n): n is number => n != null && Number.isFinite(n));
  const ielts = inCountry.map((u) => u.minIelts).filter((n): n is number => n != null && Number.isFinite(n));
  const workVisaYears = inCountry
    .map((u) => u.postStudyWorkVisaYears)
    .filter((n): n is number => n != null && Number.isFinite(n) && n >= 0);
  const awardAmounts = inSchs.flatMap((scholarship) => {
    const amount = scholarship.amountUsdValue;
    const period = normalizeScholarshipAwardPeriod(scholarship.awardPeriod);
    return amount != null && Number.isFinite(amount) && amount > 0 && period
      ? [{ amount, period }]
      : [];
  });
  const awardPeriods = new Set(awardAmounts.map((award) => award.period));
  const commonAwardPeriod =
    inSchs.length > 0 && awardAmounts.length === inSchs.length && awardPeriods.size === 1
      ? awardAmounts[0].period
      : null;
  const comparableAwardAmounts = commonAwardPeriod == null ? [] : awardAmounts.map((award) => award.amount);

  return {
    country: country.trim(),
    universities: inCountry.length,
    tuition: { avgUsd: average(tuition), published: tuition.length },
    living: { avgUsd: average(living), published: living.length },
    minIelts: { avg: oneDecimal(ielts), published: ielts.length },
    scholarships: {
      count: inSchs.length,
      amountsPublished: awardAmounts.length,
      awardPeriod: commonAwardPeriod,
      // Amounts are comparable only when every award has a positive USD value
      // and all catalogue rows declare the same supported award period.
      avgUsd: comparableAwardAmounts.length ? average(comparableAwardAmounts) : null,
      totalUsd: comparableAwardAmounts.length
        ? comparableAwardAmounts.reduce((a, b) => a + b, 0)
        : null,
    },
    workRights: workVisaYears.length > 0
      ? { avgYears: oneDecimal(workVisaYears)!, published: workVisaYears.length }
      : null,
  };
}

/** Distinct countries present in the database, biggest first (for the picker). */
export function listCountries(unis: UniInput[]): { country: string; universities: number }[] {
  const byCountry = new Map<string, { country: string; universities: number }>();
  for (const u of unis) {
    const country = (u.country ?? "").trim();
    if (!country) continue;
    const key = countryTranslationKey(country) ?? normalizeCountryAlias(country);
    const current = byCountry.get(key);
    if (current) current.universities += 1;
    else byCountry.set(key, { country, universities: 1 });
  }
  const items = [...byCountry.values()];
  items.sort((a, b) => b.universities - a.universities || a.country.localeCompare(b.country));
  return items;
}
