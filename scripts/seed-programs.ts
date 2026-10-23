/**
 * Seed REAL program catalogues with the research agent.
 *
 * Why this exists: the PDF "Top Universities — 11 Programs/Uni …" asked to give every
 * university 11 programmes. Those 11 are an archetype template (identical lists per
 * profile) with fabricated `/programs`, `/apply` and `/admissions` URLs, so they were
 * NOT inserted (docs/QS2026_RANK_VERIFICATION_2026-10-23.md §4). The only honest way
 * to get a full catalogue is to read each university's own pages — which is exactly
 * what `src/lib/research-agent/` does.
 *
 * The agent writes everything it is not fully sure about with
 * `verification_status = 'review_required'` and `is_verified = false`
 * (AGENT_CONFIG.writeConfidence = 0.7), so nothing unverified is shown as fact.
 *
 * Usage (needs a live DB and outbound internet — run it on the server, not in CI):
 *   npm run db:seed:programs                 # every university with < 2 programmes
 *   npm run db:seed:programs -- --limit 25   # first 25 of them
 *   npm run db:seed:programs -- --ids 213,215,216
 *   npm run db:seed:programs -- --dry-run    # fetch + extract, write nothing
 *
 * The agent respects AGENT_CONFIG.aiMaxCallsPerRun / maxPagesDefault per university,
 * so a batch of 25 costs a bounded amount of AI calls (see src/lib/research-agent/config.ts).
 */
import { and, asc, eq, lt, sql } from "drizzle-orm";

import { db } from "../src/db";
import { programs, universities } from "../src/db/schema";
import { runBatch } from "../src/lib/research-agent/run-batch";
import type { ResearchScope } from "../src/lib/research-agent/types";

const SCOPES: ResearchScope[] = ["programs", "requirements"];

function arg(name: string): string | undefined {
  const i = process.argv.indexOf(`--${name}`);
  return i >= 0 ? process.argv[i + 1] : undefined;
}

async function main() {
  const dryRun = process.argv.includes("--dry-run");
  const idsArg = arg("ids");
  const limit = Number(arg("limit") ?? "0") || undefined;
  const minPrograms = Number(arg("min") ?? "2");

  let ids: number[];
  if (idsArg) {
    ids = idsArg
      .split(",")
      .map((x) => Number(x.trim()))
      .filter((n) => Number.isFinite(n));
  } else {
    // Universities whose catalogue is still empty/thin. The generic
    // "Undergraduate Degree Programs" placeholder counts as one row, hence `< 2`.
    const rows = await db
      .select({ id: universities.id, name: universities.name, country: universities.country })
      .from(universities)
      .where(
        and(
          eq(universities.isActive, true),
          sql`(
            SELECT count(*) FROM ${programs} p WHERE p.university_id = ${universities.id}
          ) < ${minPrograms}`
        )
      )
      .orderBy(asc(universities.id))
      .limit(limit ?? 10_000);
    ids = rows.map((r) => r.id);
    console.log(`Universities with fewer than ${minPrograms} programmes: ${ids.length}`);
  }

  if (limit) ids = ids.slice(0, limit);
  if (!ids.length) {
    console.log("Nothing to do.");
    return;
  }
  console.log(`${dryRun ? "[dry-run] " : ""}Running the agent for ${ids.length} universities…`);
  console.log(`Scopes: ${SCOPES.join(", ")}`);

  const started = Date.now();
  const { reports, errors } = await runBatch(
    { universityIds: ids, scopes: SCOPES, dryRun },
    (universityId, message) => console.log(`#${universityId} ${message}`)
  );

  console.log("\n── summary ─────────────────────────────────────────────");
  let inserted = 0;
  let flagged = 0;
  for (const r of reports) {
    inserted += r.insertedPrograms.length;
    flagged += r.reviewRequired.length;
    console.log(
      `#${r.universityId} ${r.universityName}: +${r.insertedPrograms.length} programmes, ` +
        `review_required ${r.reviewRequired.length}, errors ${r.errors.length}`
    );
    for (const name of r.insertedPrograms.slice(0, 12)) console.log(`    + ${name}`);
    if (r.insertedPrograms.length > 12) console.log(`    … ${r.insertedPrograms.length - 12} more`);
  }
  console.log(`\nTotal: +${inserted} programmes, ${flagged} items waiting for review.`);
  if (errors.length) {
    console.log(`\n${errors.length} error(s):`);
    for (const e of errors) console.log("  " + e);
  }
  console.log(`\nDone in ${Math.round((Date.now() - started) / 1000)}s.`);
  console.log(
    "Rows the agent was not confident about are stored with verification_status = 'review_required' " +
      "(approve them in the admin panel / Telegram flow)."
  );
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
