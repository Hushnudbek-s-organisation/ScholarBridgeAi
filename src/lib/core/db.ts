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
 * If the database user may not alter tables the failure is logged and the
 * request continues exactly as it did before this module existed.
 */
import { getTableColumns, getTableName, sql } from "drizzle-orm";
import { db } from "@/db";
import { CORE_TABLES, addColumnStatement, createIndexStatements, createTableStatement, repairableColumns } from "./ddl";

const RETRY_MS = 60_000;

let ready: boolean | null = null;
let lastAttempt = 0;
let inflight: Promise<boolean> | null = null;

/** Repair additive drift of the core tables. Cached; safe to call everywhere. */
export async function ensureCoreSchema(): Promise<boolean> {
  if (ready === true) return true;
  if (inflight) return inflight;
  const now = Date.now();
  if (ready === false && now - lastAttempt < RETRY_MS) return false;
  lastAttempt = now;
  inflight = (async () => {
    try {
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
      ready = failed === 0;
    } catch (err) {
      console.error("[core] schema check failed:", err);
      ready = false;
    } finally {
      inflight = null;
    }
    return ready === true;
  })();
  return inflight;
}
