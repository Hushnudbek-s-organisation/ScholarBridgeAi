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
  websiteUrl: string | null;
  applicationUrl: string | null;
}

export interface FactsOptions {
  now: Date;
  siteUrl: string;
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
    siteUrl: opts.siteUrl.replace(/\/+$/, ""),
    sitePath: `/scholarships/${row.id}`,
    providerUrl: safeHttpsUrl(row.applicationUrl) ?? safeHttpsUrl(row.websiteUrl),
  };
}
