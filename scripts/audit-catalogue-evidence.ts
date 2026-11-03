/** Read-only live evidence gate. No fixes, migrations or fixture rewrites.
 * DATABASE_URL=… npm run audit:catalogue-evidence
 */
import "./lib/env";
import { Pool } from "pg";
import { auditCatalogueRanks, type CatalogueRankRow } from "../src/lib/qsRankAudit";
import { readOfficialQsTable } from "./lib/official-qs-table";

const checks: [string, string][] = [
  ["verified ranking has source and verification date", `SELECT count(*) AS n FROM university_rankings r
    WHERE verification_status='verified' AND (verified_at IS NULL OR source_id IS NULL
      OR NOT EXISTS(SELECT 1 FROM sources s WHERE s.id=r.source_id))`],
  ["verified programme has specific evidence", `SELECT count(*) AS n FROM programs WHERE verification_status='verified'
    AND (NOT is_verified OR last_verified_at IS NULL OR NOT coalesce(source_url ~ '^https?://[^/]+/[^/?#]+',false))`],
  ["verified requirements have specific evidence", `SELECT count(*) AS n FROM program_requirements WHERE verification_status='verified'
    AND (NOT is_verified OR last_verified_at IS NULL OR NOT coalesce(source_url ~ '^https?://[^/]+/[^/?#]+',false))`],
  ["programme university references are intact", `SELECT count(*) AS n FROM programs p WHERE NOT EXISTS(SELECT 1 FROM universities u WHERE u.id=p.university_id)`],
  ["cycle university matches programme", `SELECT count(*) AS n FROM application_cycles c WHERE program_id IS NOT NULL
    AND NOT EXISTS(SELECT 1 FROM programs p WHERE p.id=c.program_id AND p.university_id=c.university_id)`],
  ["cycle dates are ordered", `SELECT count(*) AS n FROM application_cycles WHERE opening_date>deadline`],
  ["verification flags agree", `SELECT (SELECT count(*) FROM programs WHERE is_verified IS DISTINCT FROM (verification_status='verified'))
    + (SELECT count(*) FROM program_requirements WHERE is_verified IS DISTINCT FROM (verification_status='verified'))
    + (SELECT count(*) FROM application_cycles WHERE is_verified IS DISTINCT FROM (verification_status='verified')) AS n`],
];
async function main() {
  if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL is required for the read-only live evidence audit");
  const pool = new Pool({ connectionString: process.env.DATABASE_URL,
    ssl: /localhost|127\.0\.0\.1/.test(process.env.DATABASE_URL) ? undefined : { rejectUnauthorized: false } });
  const client = await pool.connect();
  let failures = 0;
  try {
    await client.query("BEGIN TRANSACTION ISOLATION LEVEL REPEATABLE READ READ ONLY");
    for (const [name, sql] of checks) {
      const { rows } = await client.query<{ n: string }>(sql);
      const n = Number(rows[0].n);
      console.log(`${n ? "✗" : "✓"} ${name}: ${n}`);
      if (n) failures++;
    }
    const { rows } = await client.query<CatalogueRankRow>(`SELECT id,name,world_ranking AS "worldRanking",qs_rank_year AS "qsRankYear"
      FROM universities WHERE is_active ORDER BY id`);
    const summary = auditCatalogueRanks(rows, readOfficialQsTable(process.cwd()).index);
    console.log(`${summary.problems.length ? "✗" : "✓"} live QS reference disagreements: ${summary.problems.length}`);
    for (const problem of summary.problems) console.log(`  ${problem.row.id}: ${problem.row.name} (${problem.verdict})`);
    if (summary.problems.length) failures++;
    await client.query("COMMIT");
  } finally {
    client.release();
    await pool.end();
  }
  if (failures) process.exitCode = 1;
}
void main().catch((error: unknown) => {
  // Connection strings/errors may contain credentials; never echo raw errors.
  console.error(error instanceof Error && error.message.startsWith("DATABASE_URL is required")
    ? error.message : "Live evidence audit could not complete; check database connectivity and schema.");
  process.exitCode = 1;
});
