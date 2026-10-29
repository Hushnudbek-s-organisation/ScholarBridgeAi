import { countriesMatch } from "@/lib/countries";

/**
 * Scholarship catalogue filters — one definition shared by the browser and the
 * `/api/scholarships` route.
 *
 * Only dimensions the catalogue actually publishes are offered (host country,
 * degree level, funding type, application status, award basis). A filter the
 * data cannot answer is never rendered: a checkbox that always returns zero
 * rows teaches students that the catalogue is empty.
 *
 * Values stay CANONICAL (English) in state and in the URL, exactly like the
 * rest of the catalogue: the display layer localizes them, so switching
 * language never drops a selection.
 */

/** Degree levels a scholarship can be open to. Stored inside `degreeLevels` JSON. */
export const SCHOLARSHIP_DEGREE_OPTIONS = ["Bachelor", "Master", "PhD"] as const;
export type ScholarshipDegreeOption = (typeof SCHOLARSHIP_DEGREE_OPTIONS)[number];

/**
 * Funding types. `Unspecified` is a real, published value in this catalogue
 * (the provider separates tuition from stipend without calling it full
 * funding), so it is offered as a filter instead of being hidden.
 */
export const SCHOLARSHIP_COVERAGE_OPTIONS = [
  "Full Tuition + Stipend",
  "Full Tuition",
  "Full Funding",
  "Partial Tuition",
  "Partial Funding",
  "Living Stipend",
  "Tuition Waiver",
  "Unspecified",
] as const;
export type ScholarshipCoverageOption = (typeof SCHOLARSHIP_COVERAGE_OPTIONS)[number];

/** Computed application status (see `lib/scholarshipStatus`). */
export const SCHOLARSHIP_STATUS_OPTIONS = [
  "open",
  "upcoming",
  "rolling",
  "closed",
  "not_announced",
  "unknown",
] as const;
export type ScholarshipStatusOption = (typeof SCHOLARSHIP_STATUS_OPTIONS)[number];

export const SCHOLARSHIP_BASIS_OPTIONS = ["merit", "need"] as const;

/**
 * The two personal dimensions. They are computed from the student's own profile
 * (`scholarshipGates.ts`), so they are only offered when a profile is loaded —
 * an anonymous visitor has no answer, and a filter that always returns nothing
 * teaches people the catalogue is empty.
 *
 * `chance` is the published-gate check (meets / below / unknown), never an
 * admission probability; `fit` is the existing match score in three bands.
 */
export const SCHOLARSHIP_CHANCE_OPTIONS = ["meets", "below", "unknown"] as const;
export type ScholarshipChanceOption = (typeof SCHOLARSHIP_CHANCE_OPTIONS)[number];

export const SCHOLARSHIP_FIT_OPTIONS = ["strong", "good", "low"] as const;
export type ScholarshipFitOption = (typeof SCHOLARSHIP_FIT_OPTIONS)[number];
export type ScholarshipBasisOption = (typeof SCHOLARSHIP_BASIS_OPTIONS)[number];

export type ScholarshipSortOption = "relevance" | "deadline" | "amount" | "title";
export const SCHOLARSHIP_SORT_OPTIONS: readonly ScholarshipSortOption[] = [
  "relevance",
  "deadline",
  "amount",
  "title",
];

/** How the result grid is grouped (a stable sort plus section headings). */
export type ScholarshipGroupOption = "none" | "country" | "degree" | "coverage" | "status";
export const SCHOLARSHIP_GROUP_OPTIONS: readonly ScholarshipGroupOption[] = [
  "none",
  "country",
  "degree",
  "coverage",
  "status",
];

export type ScholarshipFilterDimension =
  | "country"
  | "degrees"
  | "coverages"
  | "statuses"
  | "basis"
  | "chance"
  | "fit";

export interface ScholarshipFilters {
  /** Canonical English country name, or `All`. */
  country: string;
  degrees: string[];
  coverages: string[];
  statuses: string[];
  /** Any of: `merit`, `need`. Empty means "any basis". */
  basis: string[];
  /** Any of: `meets`, `below`, `unknown`. Empty means "any chance". */
  chance: string[];
  /** Any of: `strong`, `good`, `low`. Empty means "any fit". */
  fit: string[];
}

export const EMPTY_SCHOLARSHIP_FILTERS: ScholarshipFilters = {
  country: "All",
  degrees: [],
  coverages: [],
  statuses: [],
  basis: [],
  chance: [],
  fit: [],
};

/** Per-value result counts, so every control shows what it would return. */
export interface ScholarshipFacets {
  countries: { value: string; count: number }[];
  degrees: Record<string, number>;
  coverages: Record<string, number>;
  statuses: Record<string, number>;
  basis: Record<string, number>;
  chance: Record<string, number>;
  fit: Record<string, number>;
}

export const EMPTY_SCHOLARSHIP_FACETS: ScholarshipFacets = {
  countries: [],
  degrees: {},
  coverages: {},
  statuses: {},
  basis: {},
  chance: {},
  fit: {},
};

/** The subset of a catalogue row the filters read. */
export interface ScholarshipFilterRow {
  country?: string | null;
  coverageType?: string | null;
  degreeLevels?: string | null;
  meritBased?: boolean | null;
  financialNeedBased?: boolean | null;
  computedStatus?: string | null;
  /** From `evaluateChance` — only set when a profile was loaded. */
  chanceBucket?: string | null;
  /** From `fitBucket(matchScore)` — only set when a profile was loaded. */
  fitBucket?: string | null;
}

/** `degreeLevels` is a JSON array in the catalogue; malformed values yield []. */
export function parseScholarshipDegreeLevels(raw: string | null | undefined): string[] {
  if (!raw) return [];
  const trimmed = raw.trim();
  if (!trimmed) return [];
  if (trimmed.startsWith("[")) {
    try {
      const parsed = JSON.parse(trimmed);
      if (Array.isArray(parsed)) {
        return parsed.map((value) => String(value).trim()).filter(Boolean);
      }
    } catch {
      return [];
    }
  }
  return trimmed
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean);
}

/** Normalizes a selection against the canonical option list (drops junk). */
export function parseFilterTokens(
  values: readonly string[],
  allowed: readonly string[],
): string[] {
  const set = new Set<string>();
  for (const value of values) {
    const token = value.trim();
    if (token && allowed.includes(token)) set.add(token);
  }
  return [...set];
}

/** How many filter groups are actively narrowing the list (for the badge). */
export function scholarshipActiveFilterCount(filters: ScholarshipFilters): number {
  return (
    (filters.country !== "All" ? 1 : 0) +
    (filters.degrees.length > 0 ? 1 : 0) +
    (filters.coverages.length > 0 ? 1 : 0) +
    (filters.statuses.length > 0 ? 1 : 0) +
    (filters.basis.length > 0 ? 1 : 0) +
    (filters.chance.length > 0 ? 1 : 0) +
    (filters.fit.length > 0 ? 1 : 0)
  );
}

export function hasActiveScholarshipFilters(filters: ScholarshipFilters): boolean {
  return scholarshipActiveFilterCount(filters) > 0;
}

function sameCanonical(a: string | null | undefined, b: string): boolean {
  return (a ?? "").trim().toLowerCase() === b.trim().toLowerCase();
}

/**
 * One row against the whole filter set.
 *
 * `skip` lets the facet counter ignore a dimension's own selection so each
 * group's counts mean "what happens if I tick this", the way real faceted
 * search behaves.
 */
export function scholarshipMatchesFilters(
  row: ScholarshipFilterRow,
  filters: ScholarshipFilters,
  skip: readonly ScholarshipFilterDimension[] = [],
): boolean {
  const skipped = new Set(skip);

  if (!skipped.has("country") && filters.country !== "All") {
    if (!countriesMatch(row.country, filters.country)) return false;
  }

  if (!skipped.has("degrees") && filters.degrees.length > 0) {
    const rowDegrees = parseScholarshipDegreeLevels(row.degreeLevels);
    if (!rowDegrees.some((degree) => filters.degrees.some((want) => sameCanonical(degree, want)))) {
      return false;
    }
  }

  if (!skipped.has("coverages") && filters.coverages.length > 0) {
    const coverage = row.coverageType ?? "";
    if (!filters.coverages.some((want) => sameCanonical(coverage, want))) return false;
  }

  if (!skipped.has("statuses") && filters.statuses.length > 0) {
    const status = row.computedStatus ?? "unknown";
    if (!filters.statuses.some((want) => sameCanonical(status, want))) return false;
  }

  if (!skipped.has("basis") && filters.basis.length > 0) {
    const matchesBasis =
      (filters.basis.includes("merit") && row.meritBased === true) ||
      (filters.basis.includes("need") && row.financialNeedBased === true);
    if (!matchesBasis) return false;
  }

  // Personal dimensions. A row with no bucket (anonymous visitor, or a profile
  // that made no gate comparable) is simply not in any selected bucket.
  if (!skipped.has("chance") && filters.chance.length > 0) {
    const bucket = (row.chanceBucket ?? "").trim();
    if (!filters.chance.some((want) => sameCanonical(bucket, want))) return false;
  }

  if (!skipped.has("fit") && filters.fit.length > 0) {
    const bucket = (row.fitBucket ?? "").trim();
    if (!filters.fit.some((want) => sameCanonical(bucket, want))) return false;
  }

  return true;
}

/** Group key a row falls into for the "group by" section headings. */
export function scholarshipGroupKey(
  row: ScholarshipFilterRow,
  group: ScholarshipGroupOption,
): string {
  switch (group) {
    case "country":
      return (row.country ?? "").trim() || "—";
    case "degree": {
      const degrees = parseScholarshipDegreeLevels(row.degreeLevels);
      return degrees[0] ?? "";
    }
    case "coverage":
      return (row.coverageType ?? "").trim();
    case "status":
      return (row.computedStatus ?? "unknown").trim();
    default:
      return "";
  }
}

/**
 * Message key (inside the `scholarshipHub` namespace) for a computed status.
 * Shared by the filter panel and the grouped result headings so both name a
 * status identically in all three languages.
 */
export function scholarshipStatusMessageKey(status: string | null | undefined): string {
  switch ((status ?? "").trim().toLowerCase()) {
    case "open":
      return "filterStatusOpen";
    case "upcoming":
      return "filterStatusUpcoming";
    case "rolling":
      return "filterStatusRolling";
    case "closed":
      return "filterStatusClosed";
    case "not_announced":
      return "filterStatusNotAnnounced";
    default:
      return "filterStatusUnknown";
  }
}
