/**
 * Deadline data integrity check — answers the question:
 *
 *   "Bazadagi muddat qatorlari o'z-o'ziga zid emasmi?"
 *
 * Every rule below caught a real defect on 2026-10-23:
 *
 *   * 84 rows were marked `verified` but still carried the importer's
 *     machine-generated note ("Fall 2027 international admissions cycle for BS
 *     in …") and a per-programme deadline that changed every few rows
 *     (MIT 1 Jan / 20 Jan / 1 Feb / 15 Dec). None of them had been read from an
 *     official page; they were deleted and replaced with one verified row per
 *     university.
 *   * 16 rows said `verification_status = 'verified'` with `is_estimated = true`
 *     and 22 said `verified` with `is_verified = false`.
 *   * 199 verified rows carried `academic_year = '2026-2027'` while
 *     `cycle_year = 2027`, and the detail API parsed the year out of
 *     `academic_year`, so a Fall 2027 deadline was labelled 2026.
 *
 * Usage:
 *   DATABASE_URL=postgresql://… npm run test:deadlines
 */
import "./lib/env";
import { Pool } from "pg";

type Check = { name: string; sql: string; expect: number };

/**
 * Each check must return 0. `expect` documents the meaning of a non-zero count
 * in the failure line.
 */
const CHECKS: Check[] = [
  {
    name: "a verified deadline is never in the past",
    sql: `SELECT COUNT(*)::int AS n FROM application_cycles
           WHERE verification_status = 'verified' AND deadline < CURRENT_DATE`,
    expect: 0,
  },
  {
    name: "a verified deadline always cites a source URL",
    sql: `SELECT COUNT(*)::int AS n FROM application_cycles
           WHERE verification_status = 'verified' AND (source_url IS NULL OR source_url = '')`,
    expect: 0,
  },
  {
    name: "a verified deadline always explains what was published",
    sql: `SELECT COUNT(*)::int AS n FROM application_cycles
           WHERE verification_status = 'verified' AND (notes IS NULL OR length(notes) < 20)`,
    expect: 0,
  },
  {
    name: "no verified row still carries the importer's template note",
    sql: `SELECT COUNT(*)::int AS n FROM application_cycles
           WHERE verification_status = 'verified'
             AND notes LIKE 'Fall 2027 international admissions cycle%'`,
    expect: 0,
  },
  {
    name: "is_verified agrees with verification_status",
    sql: `SELECT COUNT(*)::int AS n FROM application_cycles
           WHERE is_verified IS DISTINCT FROM (verification_status = 'verified')`,
    expect: 0,
  },
  {
    name: "is_estimated agrees with verification_status",
    sql: `SELECT COUNT(*)::int AS n FROM application_cycles
           WHERE is_estimated IS DISTINCT FROM (verification_status <> 'verified')`,
    expect: 0,
  },
  {
    name: "academic_year starts with cycle_year (no '2026-2027' on a 2027 cycle)",
    sql: `SELECT COUNT(*)::int AS n FROM application_cycles
           WHERE academic_year IS NOT NULL
             AND academic_year !~ '^[0-9]{4}(-[0-9]{4})?$'`,
    expect: 0,
  },
  {
    name: "academic_year and cycle_year describe the same entry year",
    sql: `SELECT COUNT(*)::int AS n FROM application_cycles
           WHERE academic_year ~ '^[0-9]{4}'
             AND substring(academic_year from 1 for 4)::int <> cycle_year`,
    expect: 0,
  },
  {
    name: "no cycle points at a programme that belongs to another university",
    sql: `SELECT COUNT(*)::int AS n FROM application_cycles ac
           WHERE ac.program_id IS NOT NULL
             AND NOT EXISTS (
               SELECT 1 FROM programs p WHERE p.id = ac.program_id AND p.university_id = ac.university_id
             )`,
    expect: 0,
  },
  {
    name: "verification_status is one of the three known values",
    sql: `SELECT COUNT(*)::int AS n FROM application_cycles
           WHERE verification_status NOT IN ('verified', 'estimated', 'unverified')`,
    expect: 0,
  },
];

async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) {
    console.error("DATABASE_URL is required (Supabase: Project → Settings → Database).");
    process.exit(2);
  }
  const pool = new Pool({
    connectionString: url,
    ssl: url.includes("supabase.co") ? { rejectUnauthorized: false } : undefined,
  });
  let failures = 0;
  try {
    console.log("\n[deadlines] integrity checks\n");
    for (const check of CHECKS) {
      const { rows } = await pool.query<{ n: number }>(check.sql);
      const n = Number(rows[0]?.n ?? 0);
      if (n === 0) {
        console.log(`  ✓ ${check.name}`);
      } else {
        failures += 1;
        console.log(`  ✗ ${check.name} — ${n} offending row(s)`);
      }
    }
    const total = CHECKS.length;
    console.log(
      failures === 0
        ? `\n✅ deadline integrity: ${total} checks passed\n`
        : `\n❌ deadline integrity: ${total - failures}/${total} passed\n`,
    );
  } finally {
    await pool.end();
  }
  process.exit(failures === 0 ? 0 : 1);
}

if (require.main === module) {
  void main();
}
