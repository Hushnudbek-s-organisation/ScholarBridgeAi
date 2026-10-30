/**
 * What a student can act on, and in what order they should see it.
 *
 * The public catalogue was paged in **insertion order** (`id`): the first page
 * showed whichever 24 rows were imported first, which is a fact about the
 * database, not about a student's choices. Two consequences nobody could see
 * from the code:
 *
 *   · an award whose deadline passed last week sat on page 1, above one that
 *     closes in three days;
 *   · `application_status` is a stored value. When the date goes by and nobody
 *     updates the row, the page keeps saying "Ochiq" — promising a student that
 *     an application window is open when it is not.
 *
 * This module answers both from the date itself, deterministically, with no
 * database access and no clock of its own: the caller passes `today` as
 * `YYYY-MM-DD`, so the behaviour is testable and identical on every request.
 */

/** The stored status vocabulary (`scholarships.application_status`). */
export type StoredApplicationStatus = "open" | "upcoming" | "rolling" | "unknown" | string | null | undefined;

/** The verdict a card and a detail page render. */
export type DeadlineState = "open" | "upcoming" | "rolling" | "passed" | "unknown";

/** The minimum a row has to expose to be ordered or labelled. */
export interface DeadlineFields {
  id: number;
  /** `date` column — arrives as a Date from Drizzle, or ISO after a cache hop. */
  deadlineDate?: Date | string | null;
  /** Legacy free-text mirror; only trusted when it is a plain `YYYY-MM-DD`. */
  deadline?: string | null;
  applicationStatus?: StoredApplicationStatus;
  /** `exact` | `rolling` | `range` | `unknown` … */
  deadlineType?: string | null;
}

const YMD = /^(\d{4})-(\d{2})-(\d{2})$/;

/**
 * The row's deadline as `YYYY-MM-DD`, or `null` when the catalogue does not
 * know it. A date string that is only *part* of the value ("15 October 2026")
 * is not guessed: an unknown deadline stays unknown.
 */
export function deadlineYmd(row: Pick<DeadlineFields, "deadlineDate" | "deadline">): string | null {
  const raw = row.deadlineDate ?? row.deadline ?? null;
  if (!raw) return null;
  if (raw instanceof Date) {
    if (!Number.isFinite(raw.getTime())) return null;
    return raw.toISOString().slice(0, 10);
  }
  const text = String(raw).trim();
  const match = text.match(YMD);
  if (match) return match[0];
  // ISO timestamp ("2026-10-30T00:00:00.000Z") — take the date part only.
  return text.slice(0, 10).match(YMD) ? text.slice(0, 10) : null;
}

/**
 * The honest state of an award *today*.
 *
 * A passed date beats a stored `open`: the database is a note the owner made,
 * the date is the promise the provider made. A stored `upcoming` keeps its word
 * until the date arrives; `rolling` means the provider accepts continuously and
 * is never "passed".
 */
export function deadlineStateOf(row: DeadlineFields, todayYmd: string): DeadlineState {
  const type = (row.deadlineType ?? "").toLowerCase();
  const stored = (row.applicationStatus ?? "").toLowerCase();
  if (type === "rolling" || stored === "rolling") return "rolling";
  const ymd = deadlineYmd(row);
  if (!ymd) return "unknown";
  if (ymd < todayYmd) return "passed";
  if (stored === "upcoming") return "upcoming";
  return "open";
}

/**
 * Browsing order: what can be applied to now, soonest deadline first; then the
 * continuously-open and undated rows; then the ones that have closed, most
 * recently closed first. Ties break on `id`, so the order is stable between
 * requests and pagination cannot shuffle rows across pages.
 *
 * The input array is not mutated.
 */
export function orderForBrowsing<T extends DeadlineFields>(rows: readonly T[], todayYmd: string): T[] {
  const ranked = rows.map((row, index) => ({ row, index, state: deadlineStateOf(row, todayYmd), ymd: deadlineYmd(row) }));
  const rank: Record<DeadlineState, number> = {
    open: 0,
    upcoming: 0,
    rolling: 1,
    unknown: 2,
    passed: 3,
  };
  ranked.sort((a, b) => {
    const byRank = rank[a.state] - rank[b.state];
    if (byRank !== 0) return byRank;
    if (a.state === "passed") {
      // Most recently closed first: a window that shut last week is still
      // useful (the next call is likely next year), one from 2023 is not.
      const byDate = (b.ymd ?? "").localeCompare(a.ymd ?? "");
      if (byDate !== 0) return byDate;
      return a.row.id - b.row.id;
    }
    if (a.ymd && b.ymd && a.ymd !== b.ymd) return a.ymd.localeCompare(b.ymd);
    // Dated rows before undated ones inside the same rank.
    if (a.ymd && !b.ymd) return -1;
    if (!a.ymd && b.ymd) return 1;
    if (a.row.id !== b.row.id) return a.row.id - b.row.id;
    return a.index - b.index;
  });
  return ranked.map((entry) => entry.row);
}

/** Today in the catalogue's own terms (`YYYY-MM-DD`, UTC). */
export function todayYmd(now: Date = new Date()): string {
  return now.toISOString().slice(0, 10);
}
