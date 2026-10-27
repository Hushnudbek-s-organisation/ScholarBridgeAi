/**
 * Core (base) schema — self-healing additive repair, once per process.
 *
 * Same contract as `ensureJourneyTables` (src/lib/journey/db.ts) and
 * `ensureGrowthTables` (src/lib/growth/db.ts), and the same reason: a deploy
 * must never break because the database was created before a column existed and
 * the owner never ran `drizzle-kit push` (it is deliberately not part of the
 * build — see render.yaml / DEPLOYMENT.md).
 *
 * The statements come from ./ddl.ts and are strictly additive
 * (CREATE TABLE IF NOT EXISTS / ADD COLUMN IF NOT EXISTS). A single cheap
 * `information_schema` query decides what, if anything, has to run — on an
 * up-to-date database zero DDL statements are executed.
 *
 * The memo lives in `lib/schemaGate.ts` (`globalThis`), so it is once per Node
 * process rather than once per route bundle, and `SCHEMA_AUTO_REPAIR=off`
 * removes the repair from the request path entirely: a managed production
 * database gets its schema from `supabase/*.sql`, the seed CLI or the admin
 * diagnostics action, never from a student's GET.
 *
 * If the database user may not alter tables the failure is logged and the
 * request continues exactly as it did before this module existed.
 */
import { getTableName, sql } from "drizzle-orm";
import { db } from "@/db";
import { ensureSchemaOnce, forceSchemaRepair, schemaGateSnapshot } from "@/lib/schemaGate";
import { CORE_TABLES, addColumnStatement, createIndexStatements, createTableStatement, repairableColumns } from "./ddl";

const GATE = "core";

/**
 * One cheap catalogue read: which of our tables/columns are actually live.
 * No DDL and no locks, so it is safe on a request path.
 */
async function readLiveSchema(): Promise<Map<string, Set<string>>> {
  const live = await db.execute(sql`
    SELECT table_name, column_name
    FROM information_schema.columns
    WHERE table_schema = current_schema()
  `);
  const have = new Map<string, Set<string>>();
  for (const row of live.rows as { table_name: string; column_name: string }[]) {
    if (!have.has(row.table_name)) have.set(row.table_name, new Set());
    have.get(row.table_name)!.add(row.column_name);
  }
  return have;
}

/** The additive statements the live database is still missing, in order. */
function pendingStatements(have: Map<string, Set<string>>): string[] {
  const statements: string[] = [];
  for (const table of CORE_TABLES) {
    const name = getTableName(table);
    if (!have.has(name)) {
      statements.push(createTableStatement(table), ...createIndexStatements(table));
      continue;
    }
    for (const col of repairableColumns(table)) {
      if (!have.get(name)!.has(col.name)) statements.push(addColumnStatement(table, col));
    }
  }
  return statements;
}

async function repair(): Promise<void> {
  const statements = pendingStatements(await readLiveSchema());
  let failed = 0;
  for (const stmt of statements) {
    try {
      await db.execute(sql.raw(stmt));
    } catch (err) {
      failed++;
      console.error("[core] schema repair statement failed:", stmt.slice(0, 200), err);
    }
  }
  if (statements.length) {
    console.info(
      `[core] core schema repaired: ${statements.length - failed} additive change(s)` +
        (failed ? `, ${failed} failed` : "")
    );
  }
  if (failed) throw new Error(`${failed} core repair statement(s) failed`);
}

/**
 * `SCHEMA_AUTO_REPAIR=off` path: report drift, never execute it. A missing
 * *column* does not fail the request (the rest of the app still works and the
 * operator gets a precise log line); a missing *table* does, so the caller can
 * answer 503 instead of throwing.
 */
async function verify(): Promise<{ ok: boolean; problems: string[] }> {
  const have = await readLiveSchema();
  const statements = pendingStatements(have);
  if (statements.length === 0) return { ok: true, problems: [] };

  const missingTables = statements
    .map((stmt) => /create\s+table\s+if\s+not\s+exists\s+"?([a-zA-Z0-9_]+)"?/i.exec(stmt)?.[1])
    .filter((name): name is string => Boolean(name));
  console.error(
    `[core] ${statements.length} additive change(s) pending, but SCHEMA_AUTO_REPAIR=off — ` +
      `run scripts/apply-full-schema.ts (or Admin → Diagnostics → Retry).` +
      (missingTables.length ? ` Missing table(s): ${missingTables.join(", ")}.` : "")
  );
  return { ok: missingTables.length === 0, problems: missingTables.length ? missingTables : ["pending_column_drift"] };
}

/**
 * Repair additive drift of the core tables — once per PROCESS (see
 * `lib/schemaGate.ts`), and not at all on a request path when
 * `SCHEMA_AUTO_REPAIR=off`.
 */
export function ensureCoreSchema(): Promise<boolean> {
  return ensureSchemaOnce(GATE, repair, verify);
}

/** Explicit operator/CLI action: repair now, whatever the mode is. */
export function forceCoreSchemaRepair(): Promise<boolean> {
  return forceSchemaRepair(GATE, repair);
}

export function coreSchemaStatus() {
  return schemaGateSnapshot().entries[GATE] ?? { ready: null, at: null, how: null, problems: [] };
}
