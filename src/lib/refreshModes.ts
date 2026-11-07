/**
 * Refresh semantics — one explicit distinction used by admin APIs and tests.
 *
 * `status_from_existing_dates` recomputes application/verification state from
 * dates already stored in the database. It does NOT read an official page and
 * must NOT change last_verified_at.
 *
 * `official_source_reverification` means an official source adapter actually
 * re-read a page and returned evidence. Only a successful, evidence-backed
 * check may refresh a verified date. A failed check is logged and leaves the
 * previously verified date untouched.
 */
export type RefreshMode =
  | "status_from_existing_dates"
  | "official_source_reverification";

export const DEFAULT_REFRESH_MODE: RefreshMode = "status_from_existing_dates";

export function parseRefreshMode(value: unknown): RefreshMode {
  return value === "official_source_reverification"
    ? "official_source_reverification"
    : DEFAULT_REFRESH_MODE;
}

export interface OfficialSourceCheck {
  entityType: "university" | "scholarship" | "program";
  entityId: number;
  sourceUrl: string;
  /** The adapter actually fetched and parsed the official page. */
  officialPageReRead: boolean;
  /** The expected field was found and matched a source-specific rule. */
  verificationSucceeded: boolean;
  /** A typed source URL + value/evidence pair was returned. */
  evidencePresent: boolean;
}

export interface OfficialSourceAdapter {
  (scope: "all" | "scholarships" | "universities"): Promise<OfficialSourceCheck[]>;
}
