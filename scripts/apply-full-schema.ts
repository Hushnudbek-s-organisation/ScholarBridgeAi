/**
 * Apply supabase/full_schema.sql to the database in DATABASE_URL.
 *
 * The same file can be pasted into the Supabase SQL Editor by hand —
 * this script is for owners who prefer `npm run db:apply-full-schema`
 * (e.g. against Render/Supabase via DATABASE_URL).
 *
 * SAFETY: this script requires SCHOLARBRIDGE_ALLOW_FULL_SCHEMA_APPLY=YES as
 * an explicit operator acknowledgment. Part 5 changes RLS and anon/authenticated
 * table grants; inspect the SQL, test in staging, and take a backup before a
 * live apply. The transaction protects atomicity, not application compatibility.
 * FK/check guards may skip constraints that conflict with existing data.
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import pg from "pg";
import "./lib/env";

const applyAcknowledgment = process.env.SCHOLARBRIDGE_ALLOW_FULL_SCHEMA_APPLY;
if (applyAcknowledgment !== "YES") {
  console.error(
    "Refusing to apply full_schema.sql: it changes RLS/table grants. Review the SQL, test in staging, take a backup, then set SCHOLARBRIDGE_ALLOW_FULL_SCHEMA_APPLY=YES to acknowledge the operator review. No database connection was opened."
  );
  process.exit(2);
}

const url = process.env.DATABASE_URL;
if (!url) {
  console.error("DATABASE_URL is required. Supabase: Project settings → Database → Connection string (URI).");
  process.exit(2);
}

const sql = readFileSync(join(__dirname, "..", "supabase", "full_schema.sql"), "utf8");

async function main() {
  const client = new pg.Client({ connectionString: url });
  try {
    await client.connect();
    const before = await client.query(`SELECT count(*)::int AS n FROM information_schema.tables WHERE table_schema = current_schema()`);
    await client.query(sql);
    const after = await client.query(`SELECT count(*)::int AS n FROM information_schema.tables WHERE table_schema = current_schema()`);
    console.log(`applied supabase/full_schema.sql`);
    console.log(`tables before: ${before.rows[0].n}  →  after: ${after.rows[0].n}`);
  } catch (err) {
    console.error("FAILED:", (err as Error).message);
    process.exitCode = 1;
  } finally {
    await client.end();
  }
}

main();
