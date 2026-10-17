/**
 * Schema accuracy check — answers the question:
 *
 *   "Ilova schema'siga kerakli jadval/ustun/turlar repo DDL va hujjatda bormi?"
 *
 * Compares what the APP expects (every table/column in `src/db/schema.ts` —
 * the Drizzle source of truth behind all db.select()/db.insert() calls) with
 * what the DATABASE provides:
 *
 *   --live    check expected tables/columns/types against the REAL database
 *             (DATABASE_URL) via information_schema. This does not verify RLS,
 *             grants, indexes, row data, catalog freshness, or full workflows.
 *
 *   (default) offline check against the DDL shipped in this repo
 *             (supabase/*.sql + the lazy DDL the app runs at startup).
 *             Catches drift before you touch a live database and checks that
 *             every Drizzle table has a section in docs/SUPABASE_SCHEMA.md.
 *
 * Usage:
 *   npm run test:schema          # offline
 *   DATABASE_URL=… npm run db:verify   # live (Supabase: Project → Settings → Database)
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import "./lib/env";
import {
  collectDrizzleTables,
  compareSchemas,
  mergeProvided,
  normalizeType,
  parseDdl,
  readLazyDdlSources,
  readSupabaseSqlFiles,
  typesEquivalent,
  type ColumnIssue,
} from "./lib/schema-tools";


const live = process.argv.includes("--live") || process.argv.includes("--db");

function heading(s: string) {
  console.log(`\n${s}`);
  console.log("-".repeat(s.length));
}

function issueLine(iss: ColumnIssue): string {
  const heal = iss.selfHealed ? " (app self-repairs at runtime)" : " (NOT self-repairing — run SQL manually)";
  if (iss.kind === "missing") return `  ✗ ${iss.table}.${iss.column}  MISSING  (expected ${iss.expected})${heal}`;
  return `  ✗ ${iss.table}.${iss.column}  TYPE MISMATCH  expected ${iss.expected}, found ${iss.found}${heal}`;
}

async function main() {
  const expected = collectDrizzleTables();
  console.log(`Found ${expected.length} tables in src/db/schema.ts (app source of truth).`);

  // ------------------------------------------------------------------ offline
  const sqlFiles = readSupabaseSqlFiles();
  const lazy = readLazyDdlSources();
  const provided = mergeProvided(
    ...sqlFiles.map((f) => parseDdl(f.sql)),
    ...lazy.map((f) => parseDdl(f.sql)),
  );
  const offline = compareSchemas(expected, provided);

  heading(`OFFLINE CHECK — DDL shipped in this repo (${sqlFiles.length} SQL files + ${lazy.length} lazy-DDL sources)`);
  if (offline.missingTables.length || offline.columnIssues.length || offline.typeMismatches.length) {
    for (const t of offline.missingTables) {
      console.log(`  ✗ TABLE ${t.name}  MISSING from all repo DDL${t.selfHealed ? " (app self-repairs at runtime)" : " — the feature breaks until you create it"}`);
    }
    for (const iss of offline.columnIssues) console.log(issueLine(iss));
    for (const iss of offline.typeMismatches) console.log(issueLine(iss));
    console.log(`\n  OFFLINE RESULT: ${offline.missingTables.length} missing table(s), ${offline.columnIssues.length} missing column(s), ${offline.typeMismatches.length} type mismatch(es)`);
  } else {
    console.log("  ✓ Every table and column the app needs is covered by repo DDL.");
  }
  if (offline.extraTables.length) {
    console.log(`  (informational) tables only in DDL, not in schema.ts: ${offline.extraTables.join(", ")}`);
  }

  if (!live) {
    console.log("\nLive check skipped (no --live flag or no DATABASE_URL). Run:  DATABASE_URL=postgresql://… npm run db:verify");

    const fullSchemaFile = sqlFiles.find((file) => file.file === "supabase/full_schema.sql");
    const generatedFullSchema = fullSchemaFile ? parseDdl(fullSchemaFile.sql) : new Map();
    const generatedDefaultIssues = expected.flatMap((table) => {
      const generated = generatedFullSchema.get(table.name);
      if (!generated) return [`${table.name} (missing from full_schema.sql)`];
      return table.columns.flatMap((column) => {
        // SERIAL's sequence default is implicit in the type, not a DEFAULT clause.
        if (column.type === "serial") return [];
        const actual = generated.columns.get(column.name);
        return actual && actual.hasDefault !== column.hasDefault
          ? [`${table.name}.${column.name} (expected default=${column.hasDefault}, generated default=${actual.hasDefault})`]
          : [];
      });
    });
    if (generatedDefaultIssues.length) {
      console.error(`\nGenerated-schema default mismatch: ${generatedDefaultIssues.join(", ")}`);
    }

    const schemaDoc = readFileSync(join(__dirname, "..", "docs", "SUPABASE_SCHEMA.md"), "utf8");
    const headingCounts = new Map<string, number>();
    const documentedColumns = new Map<string, Set<string>>();
    let currentDocTable: string | null = null;
    for (const line of schemaDoc.split(/\r?\n/)) {
      const tableHeading = line.match(/^### `([^`]+)`\s*$/);
      if (tableHeading) {
        currentDocTable = tableHeading[1];
        headingCounts.set(currentDocTable, (headingCounts.get(currentDocTable) ?? 0) + 1);
        if (!documentedColumns.has(currentDocTable)) documentedColumns.set(currentDocTable, new Set());
        continue;
      }
      if (/^##\s/.test(line)) currentDocTable = null;
      const column = line.match(/^\|\s*`([^`]+)`\s*\|/);
      if (currentDocTable && column) documentedColumns.get(currentDocTable)?.add(column[1]);
    }
    const documentedTables = new Set(headingCounts.keys());
    const missingDocTables = expected.map((table) => table.name).filter((name) => !documentedTables.has(name));
    const extraDocTables = [...documentedTables].filter((name) => !expected.some((table) => table.name === name));
    const duplicateDocTables = [...headingCounts].filter(([, count]) => count !== 1).map(([name]) => name);
    const docColumnIssues = expected.flatMap((table) => {
      if (!documentedColumns.has(table.name)) return [];
      const expectedColumns = new Set(table.columns.map((column) => column.name));
      const docColumns = documentedColumns.get(table.name)!;
      const missing = [...expectedColumns].filter((name) => !docColumns.has(name)).map((name) => `${table.name}.${name} missing`);
      const extra = [...docColumns].filter((name) => !expectedColumns.has(name)).map((name) => `${table.name}.${name} stale`);
      return [...missing, ...extra];
    });
    heading("DOCUMENTATION COVERAGE — docs/SUPABASE_SCHEMA.md");
    if (!missingDocTables.length && !extraDocTables.length && !duplicateDocTables.length && !docColumnIssues.length) {
      console.log(`  ✓ All ${documentedTables.size} Drizzle tables and ${expected.reduce((count, table) => count + table.columns.length, 0)} column names are documented exactly once.`);
    } else {
      if (missingDocTables.length) console.log(`  ✗ Missing table sections: ${missingDocTables.join(", ")}`);
      if (extraDocTables.length) console.log(`  ✗ Stale table sections: ${extraDocTables.join(", ")}`);
      if (duplicateDocTables.length) console.log(`  ✗ Duplicate table sections: ${duplicateDocTables.join(", ")}`);
      if (docColumnIssues.length) console.log(`  ✗ Column documentation mismatch: ${docColumnIssues.join(", ")}`);
    }

    // Offline drift is a warning, not a failure: the lazy-DDL app repairs
    // most of it at runtime. Hard-fail only when a NON-self-healing gap
    // exists (that is exactly "bazi joylar Supabaseda to'g'ri kelmayapti").
    const critical = [
      ...offline.missingTables.filter((t) => !t.selfHealed),
      ...offline.columnIssues.filter((c) => !c.selfHealed),
      ...offline.typeMismatches,
      ...generatedDefaultIssues,
      ...missingDocTables,
      ...extraDocTables,
      ...duplicateDocTables,
      ...docColumnIssues,
    ];
    if (critical.length) {
      console.error("\nFAILED: there is non-self-healing schema drift or schema-documentation coverage mismatch.");
      process.exit(1);
    }
    console.log("\nPASSED (offline).");
    return;
  }

  // -------------------------------------------------------------------- live
  const url = process.env.DATABASE_URL;
  if (!url) {
    console.error("\n--live needs DATABASE_URL. Supabase: Project settings → Database → Connection string (URI, direct/Session mode).");
    process.exit(2);
  }

  let pg: typeof import("pg");
  try {
    pg = require("pg");
  } catch {
    console.error("pg is not installed — run npm install first.");
    process.exit(2);
  }

  // --- connection diagnostics (never prints the password) --------------------
  const redactedUrl = url.replace(/(\/?\/[^:/@\s]+)(:[^@\s/]*)?@/, "$1:***@");
  const parsed = (() => {
    try {
      return new URL(url);
    } catch {
      return null;
    }
  })();
  const host = parsed?.hostname ?? "";
  const port = parsed?.port || "5432";
  const looksSupabase = /(^|\.)supabase\.(co|com)$/i.test(host);
  const directSupabaseHost = /^db\./i.test(host);

  function failConnect(err: unknown): never {
    const e = err as (Error & { code?: string }) | undefined;
    const msg = String(e?.message ?? err ?? "unknown error");
    const code = String(e?.code ?? "");
    console.error(`\nCONNECTION FAILED: ${msg}${code ? ` (code: ${code})` : ""}`);
    console.error(`  host: ${host || "(unparseable)"}  port: ${port}  url: ${redactedUrl}`);
    const hints: string[] = [];
    if (/password authentication failed|28000|28P01/i.test(`${msg} ${code}`)) {
      hints.push("Wrong database user/password. Supabase: Project Settings → Database → Connection string (URI) — copy it whole, the password is the DATABASE password, not the dashboard login.");
    }
    if (/no pg_hba\.conf entry|SSL off|ssl/i.test(msg) || /pg_hba/i.test(msg)) {
      hints.push("The server requires TLS: append ?sslmode=require to the connection string.");
    }
    if (directSupabaseHost || /ETIMEDOUT|ECONNREFUSED|ENETUNREACH|EHOSTUNREACH|EAI_AGAIN|timeout/i.test(`${msg} ${code}`)) {
      hints.push("Unreachable host. Supabase's DIRECT connection (db.<ref>.supabase.co:5432) is IPv6-only and cannot be reached from GitHub Actions runners — use the SESSION POOLER string instead: aws-0-<region>.pooler.supabase.com:5432 (Project Settings → Database → Connection string → Session pooler).");
    }
    if (port === "6543") {
      hints.push("Port 6543 is the TRANSACTION pooler; this check works best against the SESSION pooler on port 5432.");
    }
    if (/ENOTFOUND|getaddrinfo/i.test(`${msg} ${code}`)) {
      hints.push("DNS did not resolve — check the hostname for a typo or a stray space/quote copied from the dashboard.");
    }
    if (/database .* does not exist/i.test(msg)) {
      hints.push("The database name in the URL does not exist on that project (Supabase uses `postgres`).");
    }
    if (!hints.length) hints.push("Re-copy the connection string from Supabase → Project Settings → Database and update the SUPABASE_DB_URL secret.");
    for (const h of hints) console.error(`  → ${h}`);
    process.exit(2);
  }

  type ColumnRow = {
    table_name: string;
    column_name: string;
    data_type: string;
    is_nullable: string;
    column_default: string | null;
  };

  async function readColumns(options: Record<string, unknown>): Promise<ColumnRow[]> {
    const pool = new pg.Pool({ connectionTimeoutMillis: 20000, ...options });
    try {
      const { rows } = await pool.query<ColumnRow>(
        `SELECT table_name, column_name, data_type, is_nullable, column_default
           FROM information_schema.columns
          WHERE table_schema = current_schema()`,
      );
      return rows;
    } finally {
      await pool.end().catch(() => {});
    }
  }

  let rows: ColumnRow[];
  try {
    rows = await readColumns({ connectionString: url });
  } catch (err) {
    // Supabase poolers refuse plaintext connections. pg only turns TLS on when
    // the URL asks for it (sslmode=/ssl=), so retry once with TLS forced and
    // tell the operator to fix the string rather than failing blindly.
    const asksForSsl = /[?&](sslmode|ssl)=/.test(url);
    if (looksSupabase && !asksForSsl) {
      try {
        rows = await readColumns({ connectionString: url, ssl: { rejectUnauthorized: false } });
        console.log("\nNote: connected with TLS forced on — the connection string has no ?sslmode=require. Add it so every client (and the app) connects the same way.");
      } catch (err2) {
        failConnect(err2);
      }
    } else {
      failConnect(err);
    }
  }

  const liveProvided = await (async () => {
    const map = mergeProvided();
    for (const r of rows) {
      let t = map.get(r.table_name);
      if (!t) {
        t = { name: r.table_name, columns: new Map(), fks: [], uniqueConstraints: [], checks: [] };
        map.set(r.table_name, t);
      }
      t.columns.set(r.column_name, {
        name: r.column_name,
        type: normalizeType(r.data_type),
        notNull: r.is_nullable === "NO",
        pk: false,
        unique: false,
        hasDefault: r.column_default != null,
      });
    }
    return map;
  })();

  const liveCmp = compareSchemas(expected, liveProvided);
  heading(`LIVE CHECK — real database at ${redactedUrl}`);

  let problems = 0;
  for (const t of expected) {
    if (liveCmp.missingTables.some((x) => x.name === t.name)) {
      problems++;
      console.log(`  ✗ TABLE ${t.name}  MISSING — features using it will 500`);
      continue;
    }
    const missingCols = liveCmp.columnIssues.filter((c) => c.table === t.name);
    if (missingCols.length) {
      for (const c of missingCols) {
        problems++;
        console.log(issueLine(c));
      }
    } else {
      console.log(`  ✓ ${t.name}  (${t.columns.length} cols)`);
    }
  }
  for (const iss of liveCmp.typeMismatches) {
    problems++;
    console.log(issueLine(iss));
  }

  if (problems > 0) {
    console.error(`\nFAILED: ${problems} table/column/type issue(s) in the live database. Do not apply full_schema.sql blindly: it changes RLS and anon/authenticated grants. Review its SQL, back up, test in staging, obtain operator approval, then re-run this check if an apply is authorized.`);
    process.exit(1);
  }
  console.log("\nPASSED: the live database has every expected table, column, and compatible type.");
  console.log("This structural check does not verify RLS/grants, constraints/indexes, row integrity, catalog facts, or end-to-end product workflows.");
}

main().catch((err) => {
  console.error("check crashed:", err);
  process.exit(2);
});
