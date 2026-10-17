/**
 * Saved-university coverage rules for scholarships (user request: the
 * recommendation lists must PRIORITISE awards that actually pay for the
 * universities the student saved — full-coverage ones first).
 *
 * A single rule table, used by GET /api/dashboard (Recommended for You),
 * GET /api/scholarships (the Scholarship Hub ordering) and
 * GET /api/deadlines (what deserves a place in the backwards timeline), so
 * the three screens can never disagree about which award "covers" a saved
 * university.
 *
 * Honesty rules:
 *  • a name match counts only when the award literally names the university
 *    (title / description / provider) — that is a fact in the row;
 *  • a country match uses `countriesMatch` (aliases, codes, translated
 *    labels all resolve to one identity);
 *  • "Global / International / Worldwide / All / Multiple Countries" awards
 *    are treated as usable anywhere their other eligibility rules allow;
 *  • "EU / Europe" awards count for any EU destination;
 *  • FULL coverage is only claimed when the award says "full" (coverageType
 *    or tuitionCoverage) or its resolved USD value reaches the university's
 *    own annual tuition figure. A scholarship without a published amount is
 *    never promoted to "full" on vibes.
 */
import { countriesMatch, isEuropeanCountry } from "./countries";

/** Awards that are not tied to one destination. */
export const GLOBAL_SCHOLARSHIP_COUNTRY_RE = /^(global|international|all|worldwide|multiple countries)$/i;
/** European-wide awards (Horizon-style) apply to any EU destination. */
export const EU_SCHOLARSHIP_COUNTRY_RE = /^(europe|european union|eu)$/i;

export interface CoverageScholarshipInput {
  title?: string | null;
  description?: string | null;
  provider?: string | null;
  country?: string | null;
  coverageType?: string | null;
  tuitionCoverage?: string | null;
  /** Resolved USD annual value (NULL = no published amount — never $0). */
  amountUsdValue?: number | null;
  /** Optional per-year figure when the award is paid over several years. */
  annualUsdValue?: number | null;
}

export interface SavedUniRef {
  id: number;
  name: string;
  country: string | null;
  /** Annual tuition in USD, resolved from the canonical currency/period. */
  annualTuitionUsd: number | null;
}

export interface SavedUniCoverage {
  /** Universities whose exact name the award mentions (title/description/provider). */
  coveredUniNames: string[];
  /** The award can be used at at least one saved university. */
  coversSavedUni: boolean;
  /** Full coverage AT a saved university (keyword "full" or amount ≥ its tuition). */
  isFullForSavedUni: boolean;
  /** The award says "full" at all (tuition coverage language). */
  isFullCoverage: boolean;
}

/** `full tuition` / `Full Ride` / `100% Tuition + Living` — published words, not guesses. */
export function scholarshipSaysFull(s: CoverageScholarshipInput): boolean {
  return /\bfull\b/i.test(s.coverageType ?? "") || /\bfull\b/i.test(s.tuitionCoverage ?? "");
}

/** The value used against tuition: annual figure first, then the resolved total. */
function annualValueUsd(s: CoverageScholarshipInput): number | null {
  const v = s.annualUsdValue ?? s.amountUsdValue ?? null;
  return typeof v === "number" && Number.isFinite(v) && v > 0 ? v : null;
}

export function evaluateScholarshipForSavedUnis(
  s: CoverageScholarshipInput,
  savedUnis: SavedUniRef[]
): SavedUniCoverage {
  const title = (s.title ?? "").toLowerCase();
  const description = (s.description ?? "").toLowerCase();
  const provider = (s.provider ?? "").toLowerCase();
  const country = (s.country ?? "").trim();
  const isGlobal = GLOBAL_SCHOLARSHIP_COUNTRY_RE.test(country);
  const isEuAward = EU_SCHOLARSHIP_COUNTRY_RE.test(country);
  const amount = annualValueUsd(s);
  const keywordFull = scholarshipSaysFull(s);

  const coveredUniNames: string[] = [];
  let isFullForSavedUni = false;
  for (const u of savedUnis) {
    const name = (u.name ?? "").trim().toLowerCase();
    const namedByAward =
      !!name && (title.includes(name) || description.includes(name) || provider.includes(name));
    const countryHit = countriesMatch(country, u.country) || (isEuAward && isEuropeanCountry(u.country));
    if (!namedByAward && !countryHit && !isGlobal) continue;
    coveredUniNames.push(u.name);
    if (!isFullForSavedUni) {
      const reachesTuition =
        amount != null && u.annualTuitionUsd != null && u.annualTuitionUsd > 0 && amount >= u.annualTuitionUsd;
      if (keywordFull || reachesTuition) isFullForSavedUni = true;
    }
  }

  return {
    coveredUniNames,
    coversSavedUni: coveredUniNames.length > 0,
    isFullForSavedUni,
    isFullCoverage: keywordFull,
  };
}

/**
 * Sort weight for the 4-tier ordering both recommendation surfaces use:
 *   3 — full coverage AT a saved university (always first);
 *   2 — another award that covers a saved university;
 *   1 — a general full-coverage award (no saved-university link yet);
 *   0 — everything else, ranked by fit score.
 */
export function coverageTier(cov: SavedUniCoverage): 0 | 1 | 2 | 3 {
  if (cov.isFullForSavedUni) return 3;
  if (cov.coversSavedUni) return 2;
  if (cov.isFullCoverage) return 1;
  return 0;
}
