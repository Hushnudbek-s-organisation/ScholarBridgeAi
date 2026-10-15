/**
 * WS1(e) verification — proves the three growth catalogues are actually written
 * to a real PostgreSQL, and that a second run changes nothing.
 *
 * `check-growth.ts` asserts the CATALOGUE ARRAYS have the right shape. It cannot
 * tell whether anyone ever inserts them: an unused `export const` passes every
 * assertion in that file. This runs the two real seed paths against a throwaway
 * server and counts rows.
 *
 * Run: npx tsx scripts/verify-seed-growth.ts
 */
import EmbeddedPostgres from "embedded-postgres";
import { execSync } from "child_process";
import { rmSync } from "node:fs";
import { sql } from "drizzle-orm";

let passed = 0;
let failed = 0;
function check(name: string, condition: boolean, detail = "") {
  if (condition) {
    passed++;
    console.log(`  ✓ ${name}`);
  } else {
    failed++;
    console.log(`  ✗ ${name}${detail ? ` — ${detail}` : ""}`);
  }
}
const section = (t: string) => console.log(`\n${t}`);

const PORT = 55445;
const DB = "sbseed";
const URL_ = `postgresql://test:test@127.0.0.1:${PORT}/${DB}`;

async function main() {
  rmSync("/tmp/sb-seed-pg", { recursive: true, force: true });
  const pg = new EmbeddedPostgres({
    databaseDir: "/tmp/sb-seed-pg",
    user: "test",
    password: "test",
    port: PORT,
    persistent: false,
    onLog: () => {},
    onError: () => {},
  });
  await pg.initialise();
  await pg.start();
  await pg.createDatabase(DB);

  execSync("npx drizzle-kit push --force", {
    env: { ...process.env, DATABASE_URL: URL_ },
    encoding: "utf8",
    stdio: ["ignore", "ignore", "pipe"],
    timeout: 240000,
  });
  console.log(`Postgres :${PORT} — schema pushed from src/db/schema.ts`);

  process.env.DATABASE_URL = URL_;
  process.env.SESSION_SECRET = "verify-seed-secret-0123456789abcdef";
  process.env.APP_URL = "https://scholarbridge.example";
  (process.env as Record<string, string | undefined>).NODE_ENV = "test";

  const { db, pool } = await import("../src/db");
  const { seedRichPlatformData } = await import("../src/db/seedRichPlatformData");
  const { ensureGrowthTables } = await import("../src/lib/growth/db");
  const { SEED_ANSWER_PROMPTS, SEED_CHECKLIST_ITEMS, SEED_GOAL_TEMPLATES } =
    await import("../src/lib/growth/defaults");

  const count = async (table: string) =>
    Number((await db.execute(sql.raw(`SELECT count(*)::int AS n FROM ${table}`))).rows[0].n);

  // -------------------------------------------------------------------------
  section("1. seedRichPlatformData writes all three growth catalogues");
  // -------------------------------------------------------------------------
  const first = await seedRichPlatformData();
  check(
    "first run reports the growth inserts",
    first.goalTemplatesInserted > 0 &&
      first.answerPromptsInserted > 0 &&
      first.checklistItemsInserted > 0,
    JSON.stringify(first)
  );
  check(
    "goal_templates rows == catalogue length",
    (await count("goal_templates")) === SEED_GOAL_TEMPLATES.length,
    `${await count("goal_templates")} rows vs ${SEED_GOAL_TEMPLATES.length} seeded`
  );
  check(
    "answer_prompts rows == catalogue length",
    (await count("answer_prompts")) === SEED_ANSWER_PROMPTS.length
  );
  check(
    "checklist_items rows == catalogue length",
    (await count("checklist_items")) === SEED_CHECKLIST_ITEMS.length
  );

  // -------------------------------------------------------------------------
  section("2. Catalogues satisfy the Workstream 1 minimums in the DB");
  // -------------------------------------------------------------------------
  const goalN = await count("goal_templates");
  const promptN = await count("answer_prompts");
  const itemN = await count("checklist_items");
  check(`goal_templates >= 12 (got ${goalN})`, goalN >= 12);
  check(`answer_prompts >= 12 (got ${promptN})`, promptN >= 12);
  check(`checklist_items >= 24 (got ${itemN})`, itemN >= 24);

  const cats = (await db.execute(sql.raw(
    "SELECT count(DISTINCT category)::int AS n FROM answer_prompts"
  ))).rows[0].n;
  const phases = (await db.execute(sql.raw(
    "SELECT count(DISTINCT phase)::int AS n FROM checklist_items"
  ))).rows[0].n;
  const pillars = (await db.execute(sql.raw(
    "SELECT count(DISTINCT pillar)::int AS n FROM goal_templates"
  ))).rows[0].n;
  check(`all 6 prompt categories present (got ${cats})`, Number(cats) === 6);
  check(`all 6 checklist phases present (got ${phases})`, Number(phases) === 6);
  check(`all 4 goal pillars present (got ${pillars})`, Number(pillars) === 4);

  // -------------------------------------------------------------------------
  section("3. A second run is a no-op (idempotent)");
  // -------------------------------------------------------------------------
  const second = await seedRichPlatformData();
  check(
    "second run inserts nothing into the growth catalogues",
    second.goalTemplatesInserted === 0 &&
      second.answerPromptsInserted === 0 &&
      second.checklistItemsInserted === 0,
    JSON.stringify(second)
  );
  check("row counts unchanged after re-run", (await count("goal_templates")) === goalN &&
    (await count("answer_prompts")) === promptN &&
    (await count("checklist_items")) === itemN);

  // -------------------------------------------------------------------------
  section("4. ensureGrowthTables() is idempotent on an already-seeded DB");
  // -------------------------------------------------------------------------
  check("ensureGrowthTables() returns true", (await ensureGrowthTables()) === true);
  check(
    "row counts still unchanged after the growth bootstrap",
    (await count("goal_templates")) === goalN &&
      (await count("answer_prompts")) === promptN &&
      (await count("checklist_items")) === itemN
  );

  // -------------------------------------------------------------------------
  section("5. Seeded rows are usable, not just present");
  // -------------------------------------------------------------------------
  const multiPhase = (await db.execute(sql.raw(
    "SELECT count(*)::int AS n FROM checklist_items WHERE phase = 'visa'"
  ))).rows[0].n;
  check(`visa phase has multiple items (got ${multiPhase})`, Number(multiPhase) > 1);

  const unlinked = (await db.execute(sql.raw(
    "SELECT count(*)::int AS n FROM checklist_items WHERE link_tab IS NOT NULL"
  ))).rows[0].n;
  check(`some checklist items deep-link into a section (got ${unlinked})`, Number(unlinked) > 0);

  const withSteps = (await db.execute(sql.raw(
    "SELECT count(*)::int AS n FROM goal_templates WHERE steps <> '[]'"
  ))).rows[0].n;
  check(`every goal template carries steps (got ${withSteps}/${goalN})`, Number(withSteps) === goalN);

  const badOrder = (await db.execute(sql.raw(
    "SELECT count(*)::int AS n FROM checklist_items WHERE sort_order IS NULL"
  ))).rows[0].n;
  check("checklist sort_order is populated", Number(badOrder) === 0);

  console.log(`\n${failed === 0 ? "✅" : "❌"} ${passed} passed, ${failed} failed`);

  // Drain the pool before stopping the server, or pg's idle clients surface the
  // shutdown as an unhandled "terminating connection" error and the summary is
  // buried under a stack trace.
  await pool.end();
  await pg.stop();
  // Exit explicitly: embedded-postgres registers async-exit-hook, whose
  // `beforeExit` handler calls process.exit(0) and would silently turn a failed
  // run into a green one.
  process.exit(failed === 0 ? 0 : 1);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
