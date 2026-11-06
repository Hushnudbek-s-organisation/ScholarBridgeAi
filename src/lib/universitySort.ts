/**
 * University catalogue ordering — one explicit, deterministic contract.
 *
 * The bug this module fixes: the UI's default "QS ranking" choice sent NO
 * `sort` param, and the API interpreted "no sort + a profile exists" as
 * "rank by personal match". A #247 university therefore appeared above #1 MIT
 * while the student had explicitly selected QS ranking. Semantic reranking
 * could also reorder an explicitly chosen sort.
 *
 * Rules:
 *  - an EXPLICIT sort is applied exactly as requested, with or without a
 *    profile; profile presence never silently replaces it;
 *  - `relevance` (the legacy default for API clients that send no `sort`) is
 *    the only mode where profile fit and semantic search may influence order;
 *  - every comparator has a stable tie-breaker (name, then id), so pagination
 *    never reshuffles equal values between pages;
 *  - a NULL number is unknown and sorts last; it is never treated as zero.
 *
 * Pure module — asserted in `scripts/check-university-sort.ts`.
 */

export const UNIVERSITY_SORTS = [
  "rank_asc",
  "tuition_asc",
  "tuition_desc",
  "name_asc",
  "match_desc",
  "chance_desc",
  "relevance",
] as const;

export type UniversitySort = (typeof UNIVERSITY_SORTS)[number];

/** Old/alternate values already seen in URLs and saved links stay valid. */
const ALIASES: Record<string, UniversitySort> = {
  rank: "rank_asc",
  qs_rank: "rank_asc",
  ranking: "rank_asc",
  tuition: "tuition_asc",
  name: "name_asc",
  match: "match_desc",
  chance: "chance_desc",
};

export interface SortableUniversity {
  id: number;
  name?: string | null;
  worldRanking?: number | null;
  annualTuitionUsd?: number | null;
  matchScore?: number | null;
  chanceScore?: number | null;
}

export interface ParsedSort {
  sort: UniversitySort;
  /** True when the caller actually asked for an order. */
  explicit: boolean;
  /** True when a requested personal sort had no profile to compute it with. */
  fellBackToRank: boolean;
}

/**
 * No `sort` param → the legacy relevance default for non-UI API consumers.
 * An UNKNOWN value is NOT silently treated as relevance/match: it falls back to
 * the deterministic QS order instead.
 */
export function parseUniversitySort(raw: string | null | undefined): ParsedSort {
  const value = (raw ?? "").trim().toLowerCase();
  if (!value) return { sort: "relevance", explicit: false, fellBackToRank: false };
  const normalized = (ALIASES[value] ?? value) as UniversitySort;
  if ((UNIVERSITY_SORTS as readonly string[]).includes(normalized)) {
    return { sort: normalized, explicit: true, fellBackToRank: false };
  }
  return { sort: "rank_asc", explicit: true, fellBackToRank: false };
}

function finite(value: number | null | undefined): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

/** Deterministic final key: equal primary values never change order. */
function tieBreak<T extends SortableUniversity>(a: T, b: T): number {
  const name = (a.name ?? "").localeCompare(b.name ?? "", "en", { sensitivity: "base" });
  return name || a.id - b.id;
}

/** NULLs last, in both directions. */
function nullableNumber<T extends SortableUniversity>(
  a: T,
  b: T,
  pick: (row: T) => number | null | undefined,
  direction: 1 | -1,
): number {
  const va = finite(pick(a));
  const vb = finite(pick(b));
  if (va == null && vb == null) return tieBreak(a, b);
  if (va == null) return 1;
  if (vb == null) return -1;
  return va === vb ? tieBreak(a, b) : (va - vb) * direction;
}

function byRank<T extends SortableUniversity>(a: T, b: T): number {
  return nullableNumber(a, b, (u) => u.worldRanking, 1);
}

function byTuition<T extends SortableUniversity>(a: T, b: T, direction: 1 | -1): number {
  return nullableNumber(a, b, (u) => u.annualTuitionUsd, direction);
}

/**
 * Sort a response-local copy. `hasProfile` reflects a verified, authorised
 * profile — a `profileId` belonging to someone else never personalises order.
 */
export function sortUniversities<T extends SortableUniversity>(
  rows: T[],
  parsed: ParsedSort,
  hasProfile: boolean,
): { rows: T[]; applied: UniversitySort; fellBackToRank: boolean } {
  const out = [...rows];
  let applied = parsed.sort;
  let fellBackToRank = false;

  const personal = (key: "matchScore" | "chanceScore") => {
    if (!hasProfile) {
      applied = "rank_asc";
      fellBackToRank = true;
      return (a: T, b: T) => byRank(a, b);
    }
    return (a: T, b: T) => nullableNumber(a, b, (u) => u[key], -1);
  };

  switch (parsed.sort) {
    case "rank_asc":
      out.sort(byRank);
      break;
    case "tuition_asc":
      out.sort((a, b) => byTuition(a, b, 1));
      break;
    case "tuition_desc":
      out.sort((a, b) => byTuition(a, b, -1));
      break;
    case "name_asc":
      out.sort((a, b) => tieBreak(a, b));
      break;
    case "match_desc":
      out.sort(personal("matchScore"));
      break;
    case "chance_desc":
      out.sort(personal("chanceScore"));
      break;
    case "relevance":
      if (hasProfile) {
        // Legacy relevance: fit first, rank as a deterministic tie-breaker.
        out.sort((a, b) => {
          const va = finite(a.matchScore);
          const vb = finite(b.matchScore);
          if (va == null && vb == null) return byRank(a, b);
          if (va == null) return 1;
          if (vb == null) return -1;
          return va === vb ? byRank(a, b) : vb - va;
        });
      } else {
        applied = "rank_asc";
        out.sort(byRank);
      }
      break;
  }
  return { rows: out, applied, fellBackToRank };
}

/** Semantic reranking may only nudge the explicitly relevance-oriented mode. */
export function semanticRerankAllowed(parsed: ParsedSort): boolean {
  return parsed.sort === "relevance";
}
