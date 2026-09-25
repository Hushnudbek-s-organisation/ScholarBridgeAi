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

export interface UniInput {
  country: string | null;
  annualTuitionUsd?: number | null;
  annualLivingEstUsd?: number | null;
  minIelts?: number | null;
}

export interface SchInput {
  country: string | null;
  amountUsdValue?: number | null;
}

export interface CountryComparison {
  country: string;
  universities: number;
  tuition: { avgUsd: number | null; published: number };
  living: { avgUsd: number | null; published: number };
  minIelts: { avg: number | null; published: number };
  scholarships: { count: number; avgUsd: number | null; totalUsd: number | null };
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

const sameCountry = (a: string | null, b: string) => (a ?? "").trim().toLowerCase() === b.trim().toLowerCase();

export function compareCountries(country: string, unis: UniInput[], schs: SchInput[]): CountryComparison {
  const inCountry = unis.filter((u) => sameCountry(u.country, country));
  const inSchs = schs.filter((s) => sameCountry(s.country, country));

  const tuition = inCountry.map((u) => u.annualTuitionUsd).filter((n): n is number => n != null && Number.isFinite(n));
  const living = inCountry.map((u) => u.annualLivingEstUsd).filter((n): n is number => n != null && Number.isFinite(n));
  const ielts = inCountry.map((u) => u.minIelts).filter((n): n is number => n != null && Number.isFinite(n));
  const amounts = inSchs
    .map((s) => s.amountUsdValue)
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
    workRights: null,
  };
}

/** Distinct countries present in the database, biggest first (for the picker). */
export function listCountries(unis: UniInput[]): { country: string; universities: number }[] {
  const byCountry = new Map<string, number>();
  for (const u of unis) {
    const c = (u.country ?? "").trim();
    if (!c) continue;
    const key = c.toLowerCase();
    byCountry.set(key, (byCountry.get(key) ?? 0) + 1);
  }
  const items = [...byCountry.entries()].map(([key, n]) => ({
    country: unis.find((u) => (u.country ?? "").trim().toLowerCase() === key)?.country ?? key,
    universities: n,
  }));
  items.sort((a, b) => b.universities - a.universities || a.country.localeCompare(b.country));
  return items;
}
