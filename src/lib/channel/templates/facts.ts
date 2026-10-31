/**
 * Database row → template facts. This is the only place a `scholarships` row
 * turns into text inputs, and it is deliberately the place where missing data
 * becomes `null` (a dropped line) rather than a placeholder.
 */
import { deadlineInfo, eligibility, isFullyFunded, type DeadlineInfo, type Eligibility, type ScholarshipLike } from "../model";
import { countryUz, degreesUz, esc, majorsUz, coverageUz, safeHttpsUrl } from "./format";

export interface Facts {
  id: number;
  title: string; // escaped
  provider: string; // escaped
  country: string | null; // escaped Uzbek label
  /** The stored country string, for flags/locative forms via channel_countries. */
  countryRaw: string | null;
  degrees: string | null;
  majors: string | null;
  minGpa: number | null;
  minIelts: number | null;
  coverage: string | null; // Uzbek coverage label
  fullyFunded: boolean;
  deadline: DeadlineInfo;
  eligibility: Eligibility;
  /**
   * Stored allowance amounts in USD, or null when the source did not say.
   *
   * The card prints them as a bare amount ("Yashash uchun to'lov: $1,400") —
   * never as "monthly" or "per year", because the row does not record a period
   * and inventing one would be a fact we do not have.
   */
  livingAllowance: number | null;
  travelAllowance: number | null;
  /**
   * English source text, kept for the deterministic translator
   * (`translate.uz.ts`) — never printed as-is: the channel speaks Uzbek.
   */
  requirementsRaw: string | null;
  englishRequirementRaw: string | null;
  tuitionCoverageRaw: string | null;
  /** English `description`, read for programme facts — never printed as-is. */
  descriptionRaw: string | null;
  /** Site origin, "" when the deployment URL is unknown. */
  siteUrl: string;
  /** Internal path — the only thing a `/r/<code>` link may ever point at. */
  sitePath: string;
  providerUrl: string | null;
}

export interface FactsRow extends ScholarshipLike {
  deadlineRangeStart: string | null;
  degreeLevels: string | null;
  eligibleMajors: string | null;
  minGpa: number | null;
  minIelts: number | null;
  livingAllowance: number | null;
  travelAllowance: number | null;
  requirements: string | null;
  englishRequirements: string | null;
  tuitionCoverage: string | null;
  description?: string | null;
  websiteUrl: string | null;
  applicationUrl: string | null;
}

export interface FactsOptions {
  now: Date;
  siteUrl: string;
}

function trimOrNull(value: string | null | undefined): string | null {
  const text = (value ?? "").replace(/\s+/g, " ").trim();
  return text === "" ? null : text;
}

/** A stored `0` means "the source said nothing", not "no money". */
function positiveOrNull(value: number | null | undefined): number | null {
  return typeof value === "number" && Number.isFinite(value) && value > 0 ? value : null;
}

export function buildFacts(row: FactsRow, opts: FactsOptions): Facts {
  return {
    id: row.id,
    title: esc(row.title),
    provider: esc(row.provider),
    country: countryUz(row.country),
    countryRaw: row.country ?? null,
    degrees: degreesUz(row.degreeLevels),
    majors: majorsUz(row.eligibleMajors),
    minGpa: typeof row.minGpa === "number" && Number.isFinite(row.minGpa) ? row.minGpa : null,
    minIelts: typeof row.minIelts === "number" && Number.isFinite(row.minIelts) ? row.minIelts : null,
    coverage: coverageUz(row.coverageType),
    fullyFunded: isFullyFunded(row),
    deadline: deadlineInfo(row, opts.now),
    eligibility: eligibility(row),
    livingAllowance: positiveOrNull(row.livingAllowance),
    travelAllowance: positiveOrNull(row.travelAllowance),
    requirementsRaw: trimOrNull(row.requirements),
    englishRequirementRaw: trimOrNull(row.englishRequirements),
    tuitionCoverageRaw: trimOrNull(row.tuitionCoverage),
    descriptionRaw: trimOrNull(row.description),
    siteUrl: opts.siteUrl.replace(/\/+$/, ""),
    sitePath: `/scholarships/${row.id}`,
    providerUrl: safeHttpsUrl(row.applicationUrl) ?? safeHttpsUrl(row.websiteUrl),
  };
}
