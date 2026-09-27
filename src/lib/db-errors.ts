/**
 * Postgres unique-constraint violation (SQLSTATE 23505)?
 *
 * drizzle-orm wraps driver errors in DrizzleQueryError and keeps the pg error
 * on `.cause`, so checking only `err.code` silently misses it.
 */
export function isUniqueViolation(err: unknown): boolean {
  for (let e: unknown = err, depth = 0; e && depth < 4; e = (e as { cause?: unknown }).cause, depth++) {
    if ((e as { code?: unknown }).code === "23505") return true;
  }
  return false;
}
