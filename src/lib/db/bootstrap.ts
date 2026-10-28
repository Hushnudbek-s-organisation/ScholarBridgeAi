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
 *
 * The memo lives in `lib/schemaGate.ts` — `globalThis`, so once per Node process
 * instead of once per route bundle — and honours `SCHEMA_AUTO_REPAIR=off`: with
 * DDL disabled on the request path the bootstrap only *verifies* that its tables
 * exist (one cheap `to_regclass` query) and the admin diagnostics action can
 * still force the real repair.
 */
import {
  ensureSchemaOnce,
  forceSchemaRepair,
  resetSchemaEntry,
  tableExistenceVerify,
  tablesInStatements,
} from "@/lib/schemaGate";

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

const STATUS_KEY = "__sbBootstrapStatus";

/** Status must survive a bundle boundary too, so it lives on globalThis. */
function statusStore(): Map<string, BootstrapStatus> {
  const g = globalThis as typeof globalThis & { [STATUS_KEY]?: Map<string, BootstrapStatus> };
  if (!g[STATUS_KEY]) g[STATUS_KEY] = new Map();
  return g[STATUS_KEY]!;
}

const IDLE: BootstrapStatus = { state: "idle", reason: null, hint: null, at: null };

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

export function createTableBootstrap(
  label: string,
  statements: () => string[],
  run: (stmt: string) => Promise<unknown>,
  /**
   * What "the schema is there" means when DDL is disabled
   * (`SCHEMA_AUTO_REPAIR=off`). Defaults to "every table exists"; the channel
   * bootstrap also checks its columns, because that module adds columns over
   * time and a table-only check would call an old schema healthy.
   */
  verifyOverride?: () => Promise<{ ok: boolean; problems: string[] }>
) {
  const gateName = `bootstrap:${label}`;
  const statuses = statusStore();

  function setStatus(next: BootstrapStatus) {
    statuses.set(label, next);
  }

  async function attempt(): Promise<void> {
    try {
      for (const stmt of statements()) await run(stmt);
      setStatus({ state: "ready", reason: null, hint: null, at: new Date().toISOString() });
    } catch (err) {
      const { reason, hint } = classifyDbError(err);
      const message = err instanceof Error ? err.message : String(err);
      console.error(`[${label}] schema bootstrap failed (${reason}):`, message);
      setStatus({ state: "failed", reason, hint, at: new Date().toISOString() });
      throw err; // the gate records the failure and throttles the retry
    }
  }

  async function verify(): Promise<{ ok: boolean; problems: string[] }> {
    const check = verifyOverride ?? tableExistenceVerify(tablesInStatements(statements()));
    const result = await check();
    setStatus(
      result.ok
        ? { state: "ready", reason: null, hint: null, at: new Date().toISOString() }
        : {
            state: "failed",
            reason: "schema_missing",
            hint:
              `Missing table(s): ${result.problems.join(", ")}. SCHEMA_AUTO_REPAIR=off keeps DDL out of the ` +
              `request path — run scripts/apply-full-schema.ts once, or press "Retry" in Admin → Diagnostics.`,
            at: new Date().toISOString(),
          }
    );
    return result;
  }

  return {
    ensure(): Promise<boolean> {
      return ensureSchemaOnce(gateName, attempt, verify);
    },
    /**
     * "Try again now": run the DDL regardless of `SCHEMA_AUTO_REPAIR`, because
     * this is an explicit operator action, not a student request.
     */
    forceRepair(): Promise<boolean> {
      return forceSchemaRepair(gateName, attempt);
    },
    /** Test seam. */
    reset() {
      resetSchemaEntry(gateName);
      statuses.delete(label);
    },
    status(): BootstrapStatus {
      return statuses.get(label) ?? IDLE;
    },
  };
}
