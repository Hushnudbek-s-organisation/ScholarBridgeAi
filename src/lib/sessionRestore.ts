/**
 * Whether a failed session restore should make another HTTP request.
 *
 * Configuration errors are deterministic until deployment configuration
 * changes, so retrying `session_secret_required` only delays the useful error.
 * Other server failures may be transient; callers must still cap attempts.
 */
export function shouldRetrySessionRestore(
  status: number,
  code: string | undefined,
  attempt: number,
  maxAttempts = 3,
): boolean {
  return status >= 500 && code !== "session_secret_required" && attempt < maxAttempts - 1;
}
