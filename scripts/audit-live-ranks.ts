/**
 * `npm run audit:qs-ranks` — is every rank in the live catalogue the official
 * QS 2026 position?
 *
 * The gate (`test:qs-catalogue-ranks`) replays this audit over a committed
 * snapshot so it can run offline in CI. This script runs the same audit over
 * the real database, which is what tells you whether the snapshot is still
 * telling the truth.
 *
 *   npm run audit:qs-ranks                       # report only
 *   npm run audit:qs-ranks -- --write-fixture    # refresh the snapshot
 *
 * Exit code 1 when any row disagrees with the edition, so it can be wired into
 * a deploy check. Needs `DATABASE_URL` (the same variable the app uses).
 */
import { join } from "node:path";
import { writeFileSync } from "node:fs";
import { Client } from "pg";
import { auditCatalogueRanks, isRankProblem } from "../src/lib/qsRankAudit";
import {
  formatCatalogueSnapshot,
  parseCatalogueSnapshot,
  readOfficialQsTable,
} from "./lib/official-qs-table";

const ROOT = join(__dirname, "..");
const FIXTURE = join(ROOT, "scripts/fixtures/live-catalogue-ranks-2026-10-30.tsv");
const writeFixture = process.argv.includes("--write-fixture");

async function main(): Promise<void> {
  const url = process.env.DATABASE_URL;
  if (!url) {
    console.error("DATABASE_URL is not set — point it at the project database.");
    process.exit(2);
  }

  const official = readOfficialQsTable(ROOT);
  const client = new Client({
    connectionString: url,
    // Supabase and other hosted Postgres instances require TLS; local test
    // databases do not. The URL decides, not a hardcoded host.
    ssl: /localhost|127\.0\.0\.1/.test(url) && !/sslmode=require/.test(url) ? undefined : { rejectUnauthorized: false },
  });
  await client.connect();
  let rows: ReturnType<typeof parseCatalogueSnapshot>;
  try {
    const { rows: raw } = await client.query<{
      id: number;
      name: string;
      world_ranking: number | null;
      qs_rank_year: number | null;
    }>(
      `SELECT id, name, world_ranking, qs_rank_year
         FROM universities
        WHERE is_active
        ORDER BY id`
    );
    rows = raw.map((row) => ({
      id: row.id,
      name: row.name,
      worldRanking: row.world_ranking,
      qsRankYear: row.qs_rank_year,
    }));
  } finally {
    await client.end();
  }

  const summary = auditCatalogueRanks(rows, official.index);
  console.log(`\nQS 2026 rank audit — ${rows.length} active universities\n`);
  for (const [verdict, list] of Object.entries(summary.byVerdict)) {
    if (list.length) console.log(`  ${verdict.padEnd(18)} ${list.length}`);
  }
  const problems = summary.results.filter((result) => isRankProblem(result.verdict));
  if (problems.length) {
    console.log("\nDisagreements with data/qs2026_top1500.csv:");
    for (const problem of problems) {
      const officialLabel = problem.official?.rank ?? problem.official?.band?.join("-") ?? "not in the edition";
      console.log(
        `  · ${problem.row.name} (id ${problem.row.id}): stored ${problem.row.worldRanking ?? "none"}` +
          `${problem.row.qsRankYear ? ` / ${problem.row.qsRankYear}` : ""}, official ${officialLabel} [${problem.verdict}]`
      );
    }
  }

  if (writeFixture) {
    writeFileSync(FIXTURE, formatCatalogueSnapshot(rows), "utf8");
    console.log(`\nSnapshot rewritten: ${FIXTURE} (${rows.length} rows)`);
    console.log("Re-run `npm run test:qs-catalogue-ranks` — a data fix must leave that gate green.");
  }

  if (problems.length) process.exit(1);
  console.log("\nEvery stored rank is the official QS 2026 position.\n");
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
