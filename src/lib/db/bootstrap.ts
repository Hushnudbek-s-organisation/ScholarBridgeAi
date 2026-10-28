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
import { classifyDbError, statementSubject } from "./classify";
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
  /**
   * The database's own short verdict — SQLSTATE plus the driver's sentence,
   * scrubbed of anything that looks like a connection string.
   *
   * This exists because "unclassified" was useless to the operator: the real
   * reason only reached the server log, which they cannot open. It is bounded
   * and sanitised, so it is safe in the admin panel (a permission error, a
   * read-only transaction, a missing extension…).
   */
  detail: string | null;
  /** Which statement failed, by table (`channel_plan`) — not the whole DDL. */
  statement: string | null;
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

const IDLE: BootstrapStatus = { state: "idle", reason: null, hint: null, detail: null, statement: null, at: null };

/**
 * Classify a database error into a stable code plus an operator-facing hint.
 * The driver messages are matched loosely on purpose: a managed Postgres
 * (Supabase/pgBouncer) rewords the same failure in several ways.
 */
export {
  classifyDbError,
  sanitizeDbDetail,
  statementSubject,
  type ClassifiedError,
} from "./classify";

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
  verifyOverride?: () => Promise<{ ok: boolean; problems: string[] }>,
  /**
   * Tables this module's DDL references (foreign keys into the base schema).
   *
   * Both bootstraps used to assume `student_profiles` / `scholarships` were
   * already there. On a fresh database they are not, the CREATE TABLE fails,
   * and the panel reports "the bot tables failed" for something the app could
   * have created itself a moment earlier.
   */
  prerequisite?: () => Promise<boolean>
) {
  const gateName = `bootstrap:${label}`;
  const statuses = statusStore();

  function setStatus(next: BootstrapStatus) {
    statuses.set(label, next);
  }

  /**
   * Run every statement, remembering *which* one broke.
   *
   * Statements are additive and idempotent, so a single failure used to hide
   * both its own table and the ones after it. Attributing the failure to a
   * subject ("channel_plan") is what makes the report actionable.
   */
  async function attempt(): Promise<void> {
    let subject: string | null = null;
    // Best-effort: a failing prerequisite must not mask the real error below.
    if (prerequisite) {
      await prerequisite().catch((err) => {
        console.warn(`[${label}] prerequisite schema step failed:`, err instanceof Error ? err.message : err);
        return false;
      });
    }
    try {
      for (const stmt of statements()) {
        subject = statementSubject(stmt);
        await run(stmt);
      }
      setStatus({ state: "ready", reason: null, hint: null, detail: null, statement: null, at: new Date().toISOString() });
    } catch (err) {
      const { reason, hint, detail } = classifyDbError(err);
      const message = err instanceof Error ? err.message : String(err);

      /**
       * "Already there" is not a failure.
       *
       * Two processes can bootstrap at the same moment (a cold start plus an
       * admin pressing Retry), and a concurrent `CREATE … IF NOT EXISTS` can
       * still lose the race. If the schema verifies, the feature works — so
       * report green instead of turning the whole panel off over a duplicate.
       */
      if (reason === "already_exists") {
        const check = await (verifyOverride ?? tableExistenceVerify(tablesInStatements(statements())))();
        if (check.ok) {
          console.warn(`[${label}] bootstrap hit a duplicate (${detail}); schema verifies, treating as ready.`);
          setStatus({ state: "ready", reason: null, hint: null, detail: null, statement: null, at: new Date().toISOString() });
          return;
        }
      }

      console.error(`[${label}] schema bootstrap failed (${reason}) at ${subject ?? "?"}:`, message);
      setStatus({ state: "failed", reason, hint, detail, statement: subject, at: new Date().toISOString() });
      throw err; // the gate records the failure and throttles the retry
    }
  }

  async function verify(): Promise<{ ok: boolean; problems: string[] }> {
    const check = verifyOverride ?? tableExistenceVerify(tablesInStatements(statements()));
    const result = await check();
    setStatus(
      result.ok
        ? { state: "ready", reason: null, hint: null, detail: null, statement: null, at: new Date().toISOString() }
        : {
            state: "failed",
            reason: "schema_missing",
            hint:
              `Missing table(s): ${result.problems.join(", ")}. SCHEMA_AUTO_REPAIR=off keeps DDL out of the ` +
              `request path — run scripts/apply-full-schema.ts once, or press "Retry" in Admin → Diagnostics.`,
            detail: result.problems.join(", ").slice(0, 240),
            statement: result.problems[0] ?? null,
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
