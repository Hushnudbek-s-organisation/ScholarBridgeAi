/**
 * Lock down tables this app creates at runtime.
 *
 * Supabase's `public` schema is served by PostgREST, and its default privileges
 * grant `anon` / `authenticated` full access to every new table — with RLS off
 * unless the creator turns it on. `supabase/enable_rls.sql` fixes that once, by
 * hand, in the SQL editor; but tables created *later* by this app's lazy DDL
 * (channel_*, telegram_*) are born exposed again. On the live project 18 tables
 * were readable and writable with the public anon key, including
 * `channel_settings` (publish mode, channel id, admin chat id) — anyone could
 * have flipped the channel on or pointed `siteUrl` elsewhere.
 *
 * This runs the same lockdown in code, after the tables exist:
 *   1. `ENABLE ROW LEVEL SECURITY` (no FORCE — the owner the app connects as
 *      keeps full access, which is why this cannot lock the app out);
 *   2. `REVOKE ALL` from `anon` / `authenticated`, only when those roles exist
 *      (a plain Postgres has neither).
 *
 * Deliberately best-effort: a role that may not alter the table gets a warning,
 * not a broken publisher. `supabase/enable_rls.sql` stays the authoritative,
 * run-as-owner version.
 */
export interface LockdownResult {
  /** Tables that were handled (RLS enabled, or already enabled). */
  tables: string[];
  /** Role names revoked from; empty on a non-Supabase database. */
  revokedFrom: string[];
  /** Anything that did not work, as a short non-secret sentence. */
  problems: string[];
}

/** Only identifiers: these names are interpolated into DDL. */
const SAFE_NAME = /^[a-z_][a-z0-9_]{0,62}$/i;

/**
 * Lock the given tables down. Never throws: the caller is a bootstrap that
 * must keep working even when the database forbids the hardening.
 */
export async function lockDownTables(
  tables: readonly string[],
  run: (stmt: string) => Promise<unknown>
): Promise<LockdownResult> {
  const wanted = [...new Set(tables)].filter((name) => SAFE_NAME.test(name));
  const result: LockdownResult = { tables: [], revokedFrom: [], problems: [] };
  if (wanted.length === 0) return result;

  // Which of the Supabase roles does this database actually have?
  let roles: string[] = [];
  try {
    const rows = await run(
      `SELECT rolname FROM pg_roles WHERE rolname IN ('anon', 'authenticated')`
    );
    const list = (rows as { rows?: Array<{ rolname: string }> } | undefined)?.rows ?? [];
    roles = list.map((row) => row.rolname).filter((name) => SAFE_NAME.test(name));
  } catch (err) {
    result.problems.push(`could not read roles: ${short(err)}`);
  }

  for (const table of wanted) {
    // `ALTER TABLE … ENABLE ROW LEVEL SECURITY` is idempotent and needs no role
    // lookup, so this half works on any Postgres.
    try {
      await run(`ALTER TABLE IF EXISTS "${table}" ENABLE ROW LEVEL SECURITY`);
      result.tables.push(table);
    } catch (err) {
      result.problems.push(`${table}: ${short(err)}`);
      continue;
    }
    if (roles.length === 0) continue;
    try {
      await run(`REVOKE ALL ON TABLE "${table}" FROM ${roles.join(", ")}`);
      result.revokedFrom = roles;
    } catch (err) {
      result.problems.push(`${table}: ${short(err)}`);
    }
  }
  return result;
}

function short(err: unknown): string {
  const message = err instanceof Error ? err.message : String(err);
  return message.replace(/\s+/g, " ").slice(0, 160);
}
