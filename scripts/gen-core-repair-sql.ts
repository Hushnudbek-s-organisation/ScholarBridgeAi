/**
 * Regenerate `supabase/add_core_repair.sql` from `src/lib/core/ddl.ts`.
 *
 * The app repairs this drift by itself (`ensureCoreSchema`, see
 * `src/lib/core/db.ts`). The SQL file exists for owners who prefer to run the
 * statements by hand in the Supabase SQL Editor. Keep the two in sync with:
 *
 *   npx tsx scripts/gen-core-repair-sql.ts
 */
import { writeFileSync } from "node:fs";
import { getTableColumns, getTableName } from "drizzle-orm";
import {
  CORE_TABLES,
  addColumnStatement,
  createIndexStatements,
  createTableStatement,
  repairableColumns,
} from "../src/lib/core/ddl";

const header = `-- ============================================================================
-- ScholarBridge — CORE SCHEMA REPAIR (generated, do not edit by hand)
-- ============================================================================
-- Mirror of src/lib/core/ddl.ts — regenerate with:
--   npx tsx scripts/gen-core-repair-sql.ts
--
-- WHY: production never runs \`drizzle-kit push\` (see render.yaml /
-- DEPLOYMENT.md). Some base tables and columns were added to
-- src/db/schema.ts without a \`supabase/add_*.sql\` patch — for example
-- student_profiles.is_admin, which makes every authenticated request fail
-- (column does not exist) and the dashboard show
-- "We could not load your dashboard". The app repairs this drift itself on
-- first use; run this file only if you prefer to do it manually.
--
-- SAFE: additive only — CREATE TABLE IF NOT EXISTS + ADD COLUMN IF NOT EXISTS.
-- No DROP, no RENAME, no type change. Re-running changes nothing.
-- ============================================================================
`;

const parts: string[] = [header];

parts.push(`
-- ============================================================================
-- 1) TABLES — created only when they are missing entirely.
-- ============================================================================
`);
for (const table of CORE_TABLES) {
  parts.push(`${createTableStatement(table)};`);
  for (const stmt of createIndexStatements(table)) parts.push(`${stmt};`);
  parts.push("");
}

parts.push(`
-- ============================================================================
-- 2) COLUMNS — added only when they are missing (old databases).
-- ============================================================================
`);
for (const table of CORE_TABLES) {
  parts.push(`-- ---------- ${getTableName(table)} ----------`);
  for (const col of repairableColumns(table)) {
    parts.push(`${addColumnStatement(table, col)};`);
  }
  parts.push("");
}

writeFileSync("supabase/add_core_repair.sql", parts.join("\n"));
console.log(`wrote supabase/add_core_repair.sql (${CORE_TABLES.length} core tables)`);
