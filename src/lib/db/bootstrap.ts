/**
 * Lazy, additive table bootstrap with a state you can *report*.
 *
 * Both the Telegram bot and the channel publisher create their own tables on
 * first use (idempotent DDL, so a deploy never breaks because a migration was
 * missed). The old version of this code only remembered "true/false", which
 * turned a database permission problem into an opaque "temporarily
 * unavailable" message in the admin panel — impossible to triage from the UI.
 *
 * Now every attempt records *why* it failed (a stable, non-secret code), and
 * the admin diagnostics read that state back.
 */

export type BootstrapState = "idle" | "ready" | "failed";

export interface BootstrapStatus {
  state: BootstrapState;
  /** Stable machine code, e.g. `read_only`, `permission_denied`. Never a DSN. */
  reason: string | null;
  /** Human hint, safe to show in the admin panel (no hostnames, no drivers). */
  hint: string | null;
  /** When the last attempt finished (ISO), null before the first one. */
  at: string | null;
}

const RETRY_MS = 60_000;

/**
 * Classify a database error into a stable code plus an operator-facing hint.
 * The driver messages are matched loosely on purpose: a managed Postgres
 * (Supabase/pgBouncer) rewords the same failure in several ways.
 */
export function classifyDbError(err: unknown): { reason: string; hint: string } {
  const raw = err instanceof Error ? err.message : typeof err === "string" ? err : "";
  const code = (err as { code?: string } | null)?.code ?? "";
  const text = `${code} ${raw}`.toLowerCase();

  if (/read[- ]only|25006|cannot execute .* in a read-only transaction/.test(text)) {
    return {
      reason: "read_only",
      hint: "The database connection is read-only — tables cannot be created. Check that DATABASE_URL uses a read-write role and a read-write endpoint (not a read replica, not a read-only pooler).",
    };
  }
  if (/permission denied|42501|must be owner|insufficient privilege/.test(text)) {
    return {
      reason: "permission_denied",
      hint: "The database role may read but not create tables. Grant CREATE on the schema (or run the SQL in supabase/ as the owner).",
    };
  }
  if (/password authentication|28p01|no pg_hba|role .* does not exist|28000|3d000/.test(text)) {
    return {
      reason: "auth_failed",
      hint: "The database rejected the credentials or the database name. Re-check DATABASE_URL in the host's environment.",
    };
  }
  if (/too many clients|remaining connection slots|53300|57p03|pool|econnrefused|enotfound|ehostunreach|etimedout|timeout|terminating connection|57p01/.test(text)) {
    return {
      reason: "unreachable",
      hint: "The database could not be reached or the connection pool is exhausted. Check /api/health and the provider's status; lower PG_POOL_MAX if the plan's connection limit is tight.",
    };
  }
  if (/does not exist|42p01|undefined table/.test(text)) {
    return {
      reason: "schema_missing",
      hint: "A required table is missing. The bootstrap could not create it — run the SQL files in supabase/ once, then reload.",
    };
  }
  return {
    reason: "unknown",
    hint: "The table bootstrap failed for an unclassified reason. The server log holds the driver message.",
  };
}

export function createTableBootstrap(label: string, statements: () => string[], run: (stmt: string) => Promise<unknown>) {
  let ready: boolean | null = null;
  let inflight: Promise<boolean> | null = null;
  let lastAttempt = 0;
  let status: BootstrapStatus = { state: "idle", reason: null, hint: null, at: null };

  async function attempt(): Promise<boolean> {
    try {
      for (const stmt of statements()) await run(stmt);
      ready = true;
      status = { state: "ready", reason: null, hint: null, at: new Date().toISOString() };
    } catch (err) {
      const { reason, hint } = classifyDbError(err);
      const message = err instanceof Error ? err.message : String(err);
      console.error(`[${label}] schema bootstrap failed (${reason}):`, message);
      ready = false;
      status = { state: "failed", reason, hint, at: new Date().toISOString() };
    } finally {
      inflight = null;
    }
    return ready === true;
  }

  return {
    async ensure(): Promise<boolean> {
      if (ready === true) return true;
      if (inflight) return inflight;
      const now = Date.now();
      if (ready === false && now - lastAttempt < RETRY_MS) return false;
      lastAttempt = now;
      inflight = attempt();
      return inflight;
    },
    /** Test seam + "try again now" button in the admin panel. */
    reset() {
      ready = null;
      lastAttempt = 0;
      inflight = null;
      status = { state: "idle", reason: null, hint: null, at: null };
    },
    status(): BootstrapStatus {
      return status;
    },
  };
}
