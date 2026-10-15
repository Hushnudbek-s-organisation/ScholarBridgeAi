/**
 * Static facts about the visa model answers that UI code needs before the
 * exemplar library has loaded. Both are re-verified by
 * scripts/check-visa-scoring.ts against the real library and engine.
 */

/**
 * The highest total `scoreVisaInterview()` can award. Funding caps at 80,
 * home ties at 72 and non-immigrant intent at 78 (src/lib/visaScoring.ts), so
 * even a transcript that saturates every signal weighs in at 85.6 → 86.
 */
export const VISA_RUBRIC_CEILING = 86;

export type VisaSampleCountry = "US" | "DE" | "KR" | "UK";

/** Sample id per VISA_COUNTRIES code. */
export const VISA_SAMPLE_ID_BY_COUNTRY: Record<VisaSampleCountry, string> = {
  US: "visaUsF1",
  DE: "visaGermanyStudent",
  KR: "visaKoreaD2",
  UK: "visaUkStudent",
};

const ALIASES: Record<VisaSampleCountry, string[]> = {
  US: ["us", "usa", "u.s.", "united states", "united states of america", "america", "aqsh", "amerika", "сша", "америка"],
  DE: ["de", "germany", "deutschland", "germaniya", "германия"],
  KR: ["kr", "korea", "south korea", "republic of korea", "koreya", "janubiy koreya", "корея", "южная корея"],
  UK: ["uk", "gb", "united kingdom", "britain", "great britain", "england", "buyuk britaniya", "angliya", "великобритания", "англия"],
};

/** Maps a country code or a typed country name (en/uz/ru) to a sample country. */
export function visaSampleCountryFor(hint: string | null | undefined): VisaSampleCountry | null {
  const value = (hint ?? "").trim().toLowerCase();
  if (!value) return null;
  for (const [code, aliases] of Object.entries(ALIASES) as [VisaSampleCountry, string[]][]) {
    if (aliases.includes(value)) return code;
  }
  return null;
}
