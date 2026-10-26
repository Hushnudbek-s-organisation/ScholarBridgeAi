/**
 * Whether a failed session restore should make another HTTP request, and how
 * long to wait first.
 *
 * Configuration errors are deterministic until deployment configuration
 * changes, so retrying `session_secret_required` only delays the useful error.
 * Other server failures may be transient; callers must still cap attempts.
 *
 * The budget is deliberately generous (5 tries over ~5 seconds) because the
 * common transient failure is a database that is still waking up: Supabase
 * pausing an idle project, a pooler refusing a connection during a restart, a
 * Render instance that just booted. Giving up after three quick tries used to
 * strand a signed-in visitor on a blocking error screen while the public site
 * was perfectly healthy.
 */

/** Total tries, including the first one. */
export const SESSION_RESTORE_MAX_ATTEMPTS = 5;

/** Backoff between tries, in milliseconds (attempt is 0-based). */
export function sessionRestoreDelayMs(attempt: number): number {
  const step = Number.isFinite(attempt) ? Math.max(0, Math.floor(attempt)) : 0;
  return Math.min(2_500, 400 * 2 ** step);
}

export function shouldRetrySessionRestore(
  status: number,
  code: string | undefined,
  attempt: number,
  maxAttempts = SESSION_RESTORE_MAX_ATTEMPTS,
): boolean {
  if (!Number.isFinite(status) || status < 500) return false;
  if (code === "session_secret_required") return false;
  const tries = Number.isFinite(maxAttempts) && maxAttempts > 0 ? Math.floor(maxAttempts) : 1;
  return attempt < tries - 1;
}

/**
 * A restore that failed for reasons the user cannot fix by signing out: the
 * server (or its database) is unreachable. The caller keeps the site usable and
 * explains the situation instead of replacing the whole app with an error.
 */
export function isTransientRestoreFailure(status: number, code: string | undefined): boolean {
  if (code === "session_secret_required") return false;
  return !Number.isFinite(status) || status >= 500;
}
