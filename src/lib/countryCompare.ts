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
import { resolvedUsdScholarshipAmount, usdAmountOf, type UniversityCostSource } from "@/lib/costs";

export interface UniInput extends UniversityCostSource {
  country: string | null;
  minIelts?: number | null;
  /** Published post-study work visa length in years, when the row carries it. */
  postStudyWorkVisaYears?: number | null;
}

export interface SchInput {
  country: string | null;
  amountUsdValue?: number | null;
  awardAmount?: number | null;
  awardCurrency?: string | null;
  awardPeriod?: string | null;
}

export interface CountryComparison {
  country: string;
  universities: number;
  tuition: { avgUsd: number | null; published: number };
  living: { avgUsd: number | null; published: number };
  minIelts: { avg: number | null; published: number };
  scholarships: { count: number; avgUsd: number | null; totalUsd: number | null };
  /**
   * Average published post-study work-visa length, with the number of rows it
   * was computed from. `avgYears` is null when no row publishes it — it is
   * never inferred from a country's general reputation.
   */
  postStudyWork: { avgYears: number | null; published: number };
  /** Not present in the database — reported as null, never filled in. */
  workRights: null;
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

  // Currency-safe: each row is resolved through the ONE shared rule, so a
  // non-USD tuition (EUR, GBP, KRW, UZS) is EXCLUDED from the average and
  // counted as unpublished rather than silently averaged as if it were dollars.
  //
  // `allowZero` is on for averages: 0 is a PUBLISHED figure here (public
  // universities in Germany and the Nordics really are tuition-free), whereas
  // in a cost plan the same 0 means "not published, use an estimate".
  const tuition = inCountry
    .map((u) => usdAmountOf(u.annualTuitionUsd, "USD", { allowZero: true }) ?? usdAmountOf(u.annualTuition, u.tuitionCurrency, { allowZero: true }))
    .filter((n): n is number => n != null && Number.isFinite(n));
  const living = inCountry
    .map((u) => usdAmountOf(u.annualLivingEstUsd, "USD", { allowZero: true }) ?? usdAmountOf(u.annualLivingEst, u.livingCostCurrency, { allowZero: true }))
    .filter((n): n is number => n != null && Number.isFinite(n));
  const ielts = inCountry.map((u) => u.minIelts).filter((n): n is number => n != null && Number.isFinite(n));
  const amounts = inSchs
    .map((s) => resolvedUsdScholarshipAmount(s).amountUsd)
    .filter((n): n is number => n != null && Number.isFinite(n) && n > 0);
  const postStudy = inCountry
    .map((u) => u.postStudyWorkVisaYears)
    .filter((n): n is number => n != null && Number.isFinite(n) && n > 0);

  return {
    country: country.trim(),
    universities: inCountry.length,
    tuition: { avgUsd: average(tuition), published: tuition.length },
    living: { avgUsd: average(living), published: living.length },
    minIelts: { avg: oneDecimal(ielts), published: ielts.length },
    scholarships: {
      count: inSchs.length,
      avgUsd: average(amounts),
      totalUsd: amounts.length ? amounts.reduce((a, b) => a + b, 0) : null,
    },
    postStudyWork: { avgYears: postStudy.length ? oneDecimal(postStudy) : null, published: postStudy.length },
    workRights: null,
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
