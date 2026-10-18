/**
 * One classifier for "the database could not be reached" errors.
 *
 * node-postgres failures are spread across the error itself, its `cause`,
 * and pg-pool's queue-timeout wrapper (which carries only a message). Every
 * surface that must distinguish an outage from a normal 4xx — /api/health,
 * sign-in, the auth fallbacks — reads it through this module, so the same
 * incident never answers "Sign-in failed" in one place and a red stack trace
 * in another.
 */

const CODES = [
  "ENOTFOUND",
  "EAI_AGAIN",
  "ECONNREFUSED",
  "ECONNRESET",
  "ETIMEDOUT",
  "EHOSTUNREACH",
  "ENETUNREACH",
  "EPIPE",
  // Postgres SQLSTATEs that mean "you may not talk to this database (yet)"
  "28P01",
  "28000",
  "3D000",
  "53300",
  "57P01",
  "57P02",
  "57P03",
  "58P01",
] as const;

function findCode(err: unknown, depth = 0): string {
  if (err == null || depth > 3) return "";
  const e = err as { code?: unknown; errno?: unknown; cause?: unknown; message?: unknown };
  for (const candidate of [e.code, e.errno]) {
    if (typeof candidate === "string" && CODES.includes(candidate as (typeof CODES)[number])) return candidate;
  }
  const message = typeof e.message === "string" ? e.message : "";
  for (const code of CODES) {
    if (message.includes(code)) return code;
  }
  if (/getaddrinfo/i.test(message)) return "ENOTFOUND";
  if (/timeout/i.test(message)) return "ETIMEDOUT";
  if (e.cause && typeof e.cause === "object") return findCode(e.cause, depth + 1);
  return "";
}

/** Normalized driver/OS code ("" when the error is not a connectivity class). */
export function dbFailureCode(err: unknown): string {
  return findCode(err);
}

/** True when the error means "the database was unreachable", not "bad data". */
export function isDatabaseUnreachable(err: unknown): boolean {
  return dbFailureCode(err) !== "";
}
