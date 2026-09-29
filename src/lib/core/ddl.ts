/**
 * Core (base) schema — statement builders for the app's additive repair.
 *
 * WHY THIS EXISTS
 * ---------------
 * The database is the source of truth and is never updated with
 * `drizzle-kit push` in production (see `render.yaml` / DEPLOYMENT.md). Base
 * tables and columns are supposed to reach it through the manual
 * `supabase/*.sql` patches — but some app-critical objects were added to
 * `src/db/schema.ts` without a matching patch. `student_profiles.is_admin` is
 * the one that broke the dashboard: every authenticated request runs
 * `db.select().from(studentProfiles)`, so a single missing column turns the
 * whole app into "Authentication is temporarily unavailable".
 *
 * WHAT IT IS
 * ----------
 * `ensureCoreSchema()` (./db.ts) follows the same lazy-DDL pattern as
 * `ensureJourneyTables` / `ensureGrowthTables`: the app repairs the additive
 * drift of the tables it owns, once per process. The generated statements are
 * strictly additive:
 *   • CREATE TABLE IF NOT EXISTS — only for tables that are missing entirely;
 *   • ADD COLUMN IF NOT EXISTS   — only for columns that are missing entirely.
 * No DROP, no RENAME, no type change — and nothing runs at all when the
 * database already matches the schema.
 *
 * `supabase/add_core_repair.sql` mirrors these statements for owners who
 * prefer to run the SQL by hand.
 */
import { getTableColumns, getTableName } from "drizzle-orm";
import { getTableConfig, type PgColumn, type PgTable } from "drizzle-orm/pg-core";
import {
  aiEvaluations,
  aiProviderCredentials,
  applicationCycles,
  applications,
  essayVersions,
  notifications,
  opportunities,
  programRequirements,
  programSources,
  savedScholarships,
  savedUniversities,
  scholarshipSources,
  scholarships,
  sources,
  studentProfiles,
  universities,
  universityPrograms,
  universitySources,
} from "@/db/schema";

/**
 * The base tables the app reads on every authenticated request and on the
 * dashboard path. Every one of them is created by the initial database setup
 * or by a `supabase/*.sql` patch — never by the app's lazy feature DDL — so
 * they are the ones that can be missing columns (or be absent) on a database
 * that has not been re-pushed.
 */
export const CORE_TABLES: PgTable[] = [
  // identity + the dashboard's own tables
  studentProfiles,
  universities,
  scholarships,
  applications,
  savedUniversities,
  savedScholarships,
  aiEvaluations,
  essayVersions,
  opportunities,
  notifications,
  // university discovery / sources (schema-history diff: no migration coverage)
  universityPrograms, // DB table `programs`
  sources,
  programSources,
  scholarshipSources,
  universitySources,
  applicationCycles,
  programRequirements,
  // admin AI keys (the admin panel persists them; env vars remain the fallback)
  aiProviderCredentials,
];

function quote(name: string): string {
  return `"${name.replace(/"/g, '""')}"`;
}

/**
 * SQL for a column default. Handles the literal defaults that schema.ts uses
 * plus simple `sql`…`` fragments such as `now()`. Anything more complex is
 * skipped: adding the column without a default is still better than a 503, and
 * the app always supplies the value itself for those columns.
 */
function defaultSql(col: PgColumn): string | null {
  if (!col.hasDefault) return null;
  const d = (col as unknown as { default?: unknown }).default;
  if (typeof d === "string") return `'${d.replace(/'/g, "''")}'`;
  if (typeof d === "number") return String(d);
  if (typeof d === "boolean") return d ? "TRUE" : "FALSE";
  const chunks = (d as { queryChunks?: unknown[] } | null)?.queryChunks;
  if (Array.isArray(chunks)) {
    const parts: string[] = [];
    for (const chunk of chunks) {
      const value = (chunk as { value?: unknown }).value;
      if (!Array.isArray(value) || !value.every((v) => typeof v === "string")) return null;
      parts.push((value as string[]).join(""));
    }
    const text = parts.join("").trim();
    return /^[A-Za-z0-9_(). ']+$/.test(text) ? text : null;
  }
  return null;
}

/** `CREATE TABLE IF NOT EXISTS` for a table that is missing entirely. */
export function createTableStatement(table: PgTable): string {
  const columns = Object.values(getTableColumns(table))
    .map((col) => {
      const def = defaultSql(col);
      return [
        quote(col.name),
        col.getSQLType(),
        col.primary ? "PRIMARY KEY" : "",
        col.isUnique && !col.primary ? "UNIQUE" : "",
        col.notNull ? "NOT NULL" : "",
        def ? `DEFAULT ${def}` : "",
      ]
        .filter(Boolean)
        .join(" ");
    })
    .join(", ");
  return `CREATE TABLE IF NOT EXISTS ${quote(getTableName(table))} (${columns})`;
}

/** `CREATE INDEX IF NOT EXISTS` for the indexes schema.ts declares. */
export function createIndexStatements(table: PgTable): string[] {
  const name = getTableName(table);
  return getTableConfig(table)
    .indexes.map((index) => {
      const config = index.config;
      const indexName = config?.name;
      const columns = (config?.columns ?? [])
        .map((col) => (col as { name?: string })?.name)
        .filter((c): c is string => Boolean(c));
      if (!indexName || columns.length === 0 || config?.where || config?.unique) return null;
      const using = config?.method && config.method !== "btree" ? ` USING ${config.method}` : "";
      return `CREATE INDEX IF NOT EXISTS ${quote(indexName)} ON ${quote(name)}${using} (${columns.map(quote).join(", ")})`;
    })
    .filter((stmt): stmt is string => Boolean(stmt));
}

/** `ALTER TABLE … ADD COLUMN IF NOT EXISTS` for one missing column. */
export function addColumnStatement(table: PgTable, col: PgColumn): string {
  const def = defaultSql(col);
  return [
    `ALTER TABLE ${quote(getTableName(table))}`,
    `ADD COLUMN IF NOT EXISTS ${quote(col.name)} ${col.getSQLType()}`,
    def ? `DEFAULT ${def}` : "",
  ]
    .filter(Boolean)
    .join(" ");
}

/**
 * Columns worth repairing with ADD COLUMN. Primary keys are skipped: a table
 * that lost its `id` is beyond an additive repair (and a fresh serial column
 * would not be a primary key anyway).
 */
export function repairableColumns(table: PgTable): PgColumn[] {
  return Object.values(getTableColumns(table)).filter((col) => !col.primary);
}

/** Every additive statement for the core tables (`supabase/add_core_repair.sql`). */
export function coreRepairStatements(): string[] {
  const out: string[] = [];
  for (const table of CORE_TABLES) {
    out.push(createTableStatement(table));
    out.push(...createIndexStatements(table));
    for (const col of repairableColumns(table)) {
      out.push(addColumnStatement(table, col));
    }
  }
  return out;
}
