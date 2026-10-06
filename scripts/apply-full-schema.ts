/**
 * Apply supabase/full_schema.sql to the database in DATABASE_URL.
 *
 * The same file can be pasted into the Supabase SQL Editor by hand —
 * this script is for owners who prefer `npm run db:apply-full-schema`
 * (e.g. against Render/Supabase via DATABASE_URL).
 *
 * SAFE: the file is additive and idempotent; re-running changes nothing.
 * The whole file runs in a single transaction, so either everything is
 * applied or nothing is (FK guards that skip violated constraints only
 * emit NOTICEs — they never fail).
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import pg from "pg";
import "./lib/env";

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
