/**
 * Provenance helpers (spec §19).
 *
 * Rules implemented here:
 *  - A fact is "verified" ONLY when the DB row says so (verification_status).
 *  - NULL/unknown is never treated as verified or as a value.
 *  - "Stale" is defined explicitly: verified data older than STALE_DAYS is
 *    still shown, but labelled as possibly outdated so a student never
 *    mistakes a year-old deadline for a current one.
 */

/** Verified data older than this many days is labelled "(may be outdated)". */
export const PROVENANCE_STALE_DAYS = 180;

const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * Returns true when `isoDate` is a real date that is older than
 * PROVENANCE_STALE_DAYS. NULL/empty/invalid dates are NOT stale and NOT
 * verified — the caller decides what to render (usually nothing).
 *
 * `now` is injectable for deterministic tests.
 */
export function isStaleVerified(isoDate: string | null | undefined, now: Date = new Date()): boolean {
  if (!isoDate) return false;
  const t = new Date(isoDate).getTime();
  if (Number.isNaN(t)) return false;
  return now.getTime() - t > PROVENANCE_STALE_DAYS * DAY_MS;
}

/** Normalise a stored verification_status to the two values the app uses. */
export function isVerifiedStatus(status: string | null | undefined): boolean {
  return status === "verified";
}
