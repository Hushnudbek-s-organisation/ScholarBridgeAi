/**
 * One process-wide gate for **all** lazy schema repair.
 *
 * BACKGROUND
 * ----------
 * Every feature area (core, journey, growth, ownership, channel, telegram) owns
 * a module with an `ensure…Tables()` helper that runs idempotent DDL on first
 * use. That is a good safety net, but it used to be memoised in a *module*
 * variable, and Next.js can evaluate a module once per route bundle — so the
 * same `CREATE TABLE IF NOT EXISTS` round trip was repeated by every route that
 * happened to import it, inside a user's request.
 *
 * This module moves the memo to `globalThis` — genuinely once per Node process —
 * and adds the switch a managed deployment needs:
 *
 *   SCHEMA_AUTO_REPAIR=auto   (default) — repair once per process, then never
 *   SCHEMA_AUTO_REPAIR=off    — never run DDL from a request. Instead *verify*
 *                               (one cheap `to_regclass` / `information_schema`
 *                               query, memoised) and log what is missing. The
 *                               schema is expected from `supabase/*.sql`, the
 *                               seed CLI or `POST /api/admin/diagnostics`.
 *
 * `off` is what production should run: migrations are deliberate, and a student
 * GET must not wait for `CREATE TABLE` (which takes an ACCESS EXCLUSIVE lock and
 * can queue behind a long transaction). Nothing becomes unreachable —
 * `forceSchemaRepair()` still runs the DDL from the admin diagnostics action.
 *
 * A failure is remembered for 60 s (a broken database is not hammered by every
 * request); a success is remembered for the life of the process.
 */
import { sql } from "drizzle-orm";

export type SchemaGateMode = "auto" | "off";

export interface SchemaGateEntry {
  /** null = never resolved in this process. */
  ready: boolean | null;
  /** When the last attempt finished (epoch ms). */
  at: number;
  inflight: Promise<boolean> | null;
  /** `repair` = DDL ran, `verify` = DDL disabled, existence checked only. */
  how: "repair" | "verify" | null;
  /** Tables/columns found missing by the last verify (never secrets). */
  problems: string[];
}

type Registry = Map<string, SchemaGateEntry>;

const GLOBAL_KEY = "__sbSchemaGate";
const RETRY_MS = 60_000;

function registry(): Registry {
  const g = globalThis as typeof globalThis & { [GLOBAL_KEY]?: Registry };
  if (!g[GLOBAL_KEY]) g[GLOBAL_KEY] = new Map();
  return g[GLOBAL_KEY]!;
}

/** `SCHEMA_AUTO_REPAIR=off` disables request-path DDL. Anything else is `auto`. */
export function schemaGateMode(env: Record<string, string | undefined> = process.env): SchemaGateMode {
  return (env.SCHEMA_AUTO_REPAIR ?? "").trim().toLowerCase() === "off" ? "off" : "auto";
}

function entryFor(name: string): SchemaGateEntry {
  const reg = registry();
  let entry = reg.get(name);
  if (!entry) {
    entry = { ready: null, at: 0, inflight: null, how: null, problems: [] };
    reg.set(name, entry);
  }
  return entry;
}

/** Pull the table names out of a list of `CREATE TABLE IF NOT EXISTS …` statements. */
export function tablesInStatements(statements: string[]): string[] {
  const names = new Set<string>();
  for (const stmt of statements) {
    const re = /create\s+table\s+if\s+not\s+exists\s+"?([a-zA-Z0-9_]+)"?/gi;
    let match: RegExpExecArray | null;
    while ((match = re.exec(stmt))) names.add(match[1]);
  }
  return [...names];
}

/**
 * Build a verify callback that asks the database, in ONE query, which of these
 * tables exist. No DDL, no locks — safe to run on a request path.
 */
export function tableExistenceVerify(tables: string[]): () => Promise<{ ok: boolean; problems: string[] }> {
  return async () => {
    if (tables.length === 0) return { ok: true, problems: [] };
    // Imported lazily so this module stays importable by the offline gates
    // (they exercise the bootstrap's error classification with no DATABASE_URL).
    const { db } = await import("@/db");
    const rows = await db.execute<{ name: string; present: string | null }>(sql`
      SELECT t.name, to_regclass(t.name)::text AS present
      FROM unnest(${sql.raw(`ARRAY[${tables.map((t) => `'${t.replace(/'/g, "''")}'`).join(",")}]::text[]`)}) AS t(name)
    `);
    const missing = (rows.rows ?? []).filter((r) => !r.present).map((r) => r.name);
    return { ok: missing.length === 0, problems: missing };
  };
}

/**
 * Which of these (table, column) pairs are missing — one query, no DDL.
 *
 * Tables are not enough: the channel publisher adds columns over time with
 * `ALTER TABLE … ADD COLUMN IF NOT EXISTS`. With `SCHEMA_AUTO_REPAIR=off` the
 * bootstrap only verifies, so a database created by an older build can have
 * every table and still fail the first post with "column lane does not exist".
 * Checking columns turns that into a named, fixable problem.
 */
export function columnExistenceVerify(
  pairs: Array<{ table: string; column: string }>
): () => Promise<{ ok: boolean; problems: string[] }> {
  return async () => {
    if (pairs.length === 0) return { ok: true, problems: [] };
    const { db } = await import("@/db");
    const tables = sql.raw(
      `ARRAY[${[...new Set(pairs.map((p) => p.table))].map((t) => `'${t.replace(/'/g, "''")}'`).join(",")}]::text[]`
    );
    const rows = await db.execute<{ table_name: string; column_name: string }>(sql`
      SELECT table_name, column_name
      FROM information_schema.columns
      WHERE table_schema = current_schema() AND table_name = ANY(${tables})
    `);
    const present = new Set((rows.rows ?? []).map((r) => `${r.table_name}.${r.column_name}`));
    const missing = pairs.filter((p) => !present.has(`${p.table}.${p.column}`)).map((p) => `${p.table}.${p.column}`);
    return { ok: missing.length === 0, problems: missing };
  };
}

/**
 * Run `repair` at most once per process — or, with `SCHEMA_AUTO_REPAIR=off`,
 * only `verify`. Safe to call from every request path: after the first success
 * this is a boolean check.
 */
export async function ensureSchemaOnce(
  name: string,
  repair: () => Promise<void>,
  verify?: () => Promise<{ ok: boolean; problems: string[] }>
): Promise<boolean> {
  const entry = entryFor(name);
  const mode = schemaGateMode();
  const work: (() => Promise<void | { ok: boolean; problems: string[] }>) | undefined =
    mode === "off" ? verify : repair;

  if (!work) return true; // DDL disabled and nothing to verify
  if (entry.ready === true && entry.how === (mode === "off" ? "verify" : "repair")) return true;
  if (entry.inflight) return entry.inflight;
  if (entry.ready === false && Date.now() - entry.at < RETRY_MS) return false;

  const run = (async () => {
    try {
      if (mode === "off") {
        const result = (await work()) ?? { ok: true, problems: [] };
        entry.problems = result.problems ?? [];
        entry.ready = result.ok;
        if (!result.ok) {
          console.error(
            `[schema:${name}] tables missing (${entry.problems.join(", ")}). ` +
              `SCHEMA_AUTO_REPAIR=off — run scripts/apply-full-schema.ts or POST /api/admin/diagnostics.`
          );
        }
      } else {
        await work();
        entry.problems = [];
        entry.ready = true;
      }
    } catch (err) {
      entry.problems = [];
      entry.ready = false;
      console.error(`[schema:${name}] ${mode === "off" ? "verification" : "repair"} failed:`, err instanceof Error ? err.message : err);
    } finally {
      entry.at = Date.now();
      entry.inflight = null;
      entry.how = mode === "off" ? "verify" : "repair";
    }
    return entry.ready === true;
  })();
  entry.inflight = run;
  return run;
}

/**
 * Forget the memo and repair now — used by the admin diagnostics action and the
 * seed CLI, which are explicit operator actions and may run DDL even when the
 * request path is configured not to.
 */
export async function forceSchemaRepair(name: string, repair: () => Promise<void>): Promise<boolean> {
  const entry = entryFor(name);
  entry.ready = null;
  entry.at = 0;
  entry.inflight = null;
  try {
    await repair();
    entry.ready = true;
    entry.problems = [];
    return true;
  } catch (err) {
    console.error(`[schema:${name}] forced repair failed:`, err instanceof Error ? err.message : err);
    entry.ready = false;
    return false;
  } finally {
    entry.at = Date.now();
    entry.how = "repair";
  }
}

/** Diagnostics: what has been resolved in this process, how, and what is missing. */
export function schemaGateSnapshot(): {
  mode: SchemaGateMode;
  entries: Record<string, { ready: boolean | null; at: number | null; how: string | null; problems: string[] }>;
} {
  const entries: Record<string, { ready: boolean | null; at: number | null; how: string | null; problems: string[] }> = {};
  for (const [name, entry] of registry()) {
    entries[name] = { ready: entry.ready, at: entry.at || null, how: entry.how, problems: entry.problems };
  }
  return { mode: schemaGateMode(), entries };
}

/** Forget ONE memoised result (admin "retry now", test seams). */
export function resetSchemaEntry(name: string): void {
  registry().delete(name);
}

/** Test seam: forget every memoised result. */
export function resetSchemaGate(): void {
  registry().clear();
}
