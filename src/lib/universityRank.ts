/**
 * Phase AD — a stored rank is a QS position only when the row says which
 * edition produced it.
 *
 * `universities.world_ranking` is the QS 2026 position for 348 of the 350
 * ranked catalogue rows (`qs_rank_year = 2026`, reconciled in Phase Y against
 * `data/qs2026_top1500.csv`). Two rows carry a number with **no edition**
 * recorded:
 *
 *   id 37  KAIST (Korea Advanced Institute of Science & Technology) #53
 *   id 298 École des Ponts ParisTech                                 #205
 *
 * Both came from a user-supplied PDF dataset whose "2026" is the dataset's own
 * label, not a QS edition; neither institution appears in the official QS 2026
 * table at all (KAIST was the false `QS #53` Phase AC removed from the chancing
 * benchmark table). An undated number therefore has no source that can be
 * checked, and the rule the last five phases established holds: **a QS number
 * is the verified position of the edition it names, or it is not printed.**
 *
 * Every read path that puts a rank in front of a student goes through this
 * module, so the rule cannot be re-implemented differently in seven places. The
 * row itself is untouched — recording the edition (or clearing the number) is a
 * catalogue-data decision, and the admin editor already exposes `qsRankYear`.
 *
 * Pure by construction: no database import, no React, no environment.
 */

/** The columns this rule needs — any row shape that carries them works. */
export interface QsRankRow {
  worldRanking?: number | null;
  qsRankYear?: number | null;
}

export interface VerifiedQsRank {
  rank: number;
  /** The edition the number belongs to, e.g. 2026. */
  year: number;
}

/** A plausible edition year. A stored `0`, `53` or `1999` is not one. */
const EARLIEST_EDITION = 2000;
const LATEST_EDITION = 2100;

/** The edition recorded on the row, or `null` when it does not record one. */
export function qsRankEdition(row: QsRankRow): number | null {
  const year = row.qsRankYear;
  if (typeof year !== "number" || !Number.isInteger(year)) return null;
  if (year < EARLIEST_EDITION || year > LATEST_EDITION) return null;
  return year;
}

/**
 * The verified QS position, or `null`.
 *
 * `null` means "do not print a position" — it is the answer for an unranked
 * row, for a broken number, and for a number whose edition was never recorded.
 */
export function verifiedQsRank(row: QsRankRow): VerifiedQsRank | null {
  const rank = row.worldRanking;
  if (typeof rank !== "number" || !Number.isInteger(rank) || rank < 1) return null;
  const year = qsRankEdition(row);
  if (year == null) return null;
  return { rank, year };
}

/** Shorthand for the payloads that only carry the figure. */
export function verifiedQsRankNumber(row: QsRankRow): number | null {
  return verifiedQsRank(row)?.rank ?? null;
}

/** Same rule for a bare number when the edition travels separately. */
export function verifiedRankWithEdition(rank: number | null | undefined, year: number | null | undefined): number | null {
  return verifiedQsRank({ worldRanking: rank, qsRankYear: year })?.rank ?? null;
}
