/**
 * Scholarship detail completeness — answers the question:
 *
 *   "Har bir stipendiya sahifasi to'liq ma'lumot bilan chiqadimi?"
 *
 * The `/scholarships/[id]` page renders six blocks for every award:
 * about · who can apply · benefits · how to apply · extra information ·
 * key details. A block is only as good as the column behind it, so this check
 * treats the columns those blocks read as a contract.
 *
 * Hard checks must be 0 — a verified, active scholarship missing one of these
 * renders an empty section for a student.
 *
 * The soft section reports fields that the detail page shows only when they
 * exist (documents, application fee, accommodation, allowances, an exact
 * deadline date). Those are not failures: an award that genuinely does not
 * publish them must stay NULL rather than be filled with a guess. They are
 * printed so the enrichment queue is visible instead of hidden.
 *
 * Usage:
 *   DATABASE_URL=postgresql://… npm run test:scholarship-detail
 */
import "./lib/env";
import { Pool } from "pg";

type Check = { name: string; sql: string };

const SCOPE = `is_active AND verification_status = 'verified'`;

const HARD: Check[] = [
  {
    name: "every scholarship has an about section",
    sql: `SELECT COUNT(*)::int AS n FROM scholarships WHERE ${SCOPE} AND coalesce(description, '') = ''`,
  },
  {
    name: "every scholarship says who can apply",
    sql: `SELECT COUNT(*)::int AS n FROM scholarships WHERE ${SCOPE} AND coalesce(requirements, '') = ''`,
  },
  {
    name: "every scholarship states a language requirement",
    sql: `SELECT COUNT(*)::int AS n FROM scholarships WHERE ${SCOPE} AND coalesce(english_requirements, '') = ''`,
  },
  {
    name: "every scholarship states its funding type",
    sql: `SELECT COUNT(*)::int AS n FROM scholarships WHERE ${SCOPE} AND coalesce(funding_type, '') = ''`,
  },
  {
    name: "every scholarship states its tuition coverage",
    sql: `SELECT COUNT(*)::int AS n FROM scholarships WHERE ${SCOPE} AND coalesce(tuition_coverage, '') = ''`,
  },
  {
    name: "every scholarship lists the degree levels it funds",
    sql: `SELECT COUNT(*)::int AS n FROM scholarships WHERE ${SCOPE} AND coalesce(degree_levels, '[]') IN ('[]', '')`,
  },
  {
    name: "every scholarship lists eligible fields",
    sql: `SELECT COUNT(*)::int AS n FROM scholarships WHERE ${SCOPE} AND coalesce(eligible_majors, '[]') IN ('[]', '')`,
  },
  {
    name: "every scholarship has a deadline statement",
    sql: `SELECT COUNT(*)::int AS n FROM scholarships WHERE ${SCOPE} AND coalesce(deadline, '') = ''`,
  },
  {
    name: "every scholarship cites a source URL",
    sql: `SELECT COUNT(*)::int AS n FROM scholarships WHERE ${SCOPE} AND (source_url IS NULL OR website_url IS NULL)`,
  },
  {
    name: "award_basis stays inside the values the admin API accepts",
    sql: `SELECT COUNT(*)::int AS n FROM scholarships WHERE ${SCOPE}
            AND coalesce(award_basis, '') NOT IN ('fixed', 'range', 'full_tuition', 'need_based', 'variable')`,
  },
  {
    name: "coverage_type stays inside the values the UI can translate",
    // The uz/ru dictionaries key off these exact strings; anything else
    // renders raw English inside an Uzbek or Russian page.
    sql: `SELECT COUNT(*)::int AS n FROM scholarships WHERE ${SCOPE}
            AND coverage_type NOT IN ('Full Tuition + Stipend', 'Full Tuition',
              'Partial Tuition', 'Full Funding', 'Partial Funding',
              'Tuition Waiver', 'Living Stipend', 'Unspecified')`,
  },
  {
    name: "award_period stays inside the values the admin API accepts",
    // NULL is legitimate ("the provider states no period"); only a value
    // outside the accepted set is a defect.
    sql: `SELECT COUNT(*)::int AS n FROM scholarships WHERE ${SCOPE}
            AND award_period IS NOT NULL
            AND award_period NOT IN ('total', 'year', 'month', 'one_time', 'variable')`,
  },
];

const SOFT: Check[] = [
  {
    name: "required documents listed",
    sql: `SELECT COUNT(*)::int AS n FROM scholarships WHERE ${SCOPE}
            AND coalesce(required_documents, '[]') IN ('[]', '')`,
  },
  {
    name: "dedicated application URL stored",
    sql: `SELECT COUNT(*)::int AS n FROM scholarships WHERE ${SCOPE} AND application_url IS NULL`,
  },
  {
    name: "application fee stored (0 = free)",
    sql: `SELECT COUNT(*)::int AS n FROM scholarships WHERE ${SCOPE} AND application_fee IS NULL`,
  },
  {
    name: "accommodation information stored",
    sql: `SELECT COUNT(*)::int AS n FROM scholarships WHERE ${SCOPE} AND coalesce(accommodation, '') = ''`,
  },
  {
    name: "living allowance stored",
    sql: `SELECT COUNT(*)::int AS n FROM scholarships WHERE ${SCOPE} AND (living_allowance IS NULL OR living_allowance = 0)`,
  },
  {
    name: "travel allowance stored",
    sql: `SELECT COUNT(*)::int AS n FROM scholarships WHERE ${SCOPE} AND (travel_allowance IS NULL OR travel_allowance = 0)`,
  },
  {
    name: "exact deadline date stored",
    sql: `SELECT COUNT(*)::int AS n FROM scholarships WHERE ${SCOPE} AND deadline_date IS NULL`,
  },
  {
    name: "description still in the importer's template phrasing",
    sql: `SELECT COUNT(*)::int AS n FROM scholarships WHERE ${SCOPE} AND description ~ 'offers .*Maximum award:'`,
  },
  {
    name: "website_url is a bare domain (home page, not the award page)",
    sql: `SELECT COUNT(*)::int AS n FROM scholarships WHERE ${SCOPE} AND website_url ~ '^https?://(www\\.)?[^/]+/?$'`,
  },
  {
    name: "round-number USD amount (possible legacy estimate)",
    sql: `SELECT COUNT(*)::int AS n FROM scholarships WHERE ${SCOPE} AND amount_usd_value > 0 AND amount_usd_value % 5000 = 0`,
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
    const { rows } = await pool.query<{ n: number }>(
      `SELECT COUNT(*)::int AS n FROM scholarships WHERE ${SCOPE}`,
    );
    const total = Number(rows[0]?.n ?? 0);
    console.log(`\n[scholarship-detail] ${total} verified, active scholarships\n`);

    for (const check of HARD) {
      const result = await pool.query<{ n: number }>(check.sql);
      const n = Number(result.rows[0]?.n ?? 0);
      if (n === 0) {
        console.log(`  ✓ ${check.name}`);
      } else {
        failures += 1;
        console.log(`  ✗ ${check.name} — ${n} offending row(s)`);
      }
    }

    console.log("\n  enrichment queue (not failures — empty means the source does not publish it):\n");
    for (const check of SOFT) {
      const result = await pool.query<{ n: number }>(check.sql);
      const n = Number(result.rows[0]?.n ?? 0);
      const pct = total > 0 ? Math.round(((total - n) / total) * 100) : 100;
      console.log(`  · ${check.name}: ${total - n}/${total} (${pct}%)`);
    }

    console.log(
      failures === 0
        ? `\n✅ scholarship detail: ${HARD.length} checks passed\n`
        : `\n❌ scholarship detail: ${HARD.length - failures}/${HARD.length} passed\n`,
    );
  } finally {
    await pool.end();
  }
  process.exit(failures === 0 ? 0 : 1);
}

if (require.main === module) {
  void main();
}
