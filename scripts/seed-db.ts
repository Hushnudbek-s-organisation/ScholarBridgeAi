/**
 * Command-line seeder for a local/self-hosted database.
 *
 * `src/db/seed.ts` is a MODULE (the app calls `seedDatabase()` from the
 * discovery routes on an empty database) — running it directly with tsx does
 * nothing, so `npm run db:dev:init` was documented as "pushes the schema,
 * seeds" while it only pushed the schema. This is the entry point that
 * actually seeds everything the UI expects on a fresh install:
 *
 *   universities + their programmes + programmes' requirements  (seedDatabase)
 *   the program catalogue rows for those universities             (seedProgramCatalog)
 *   scholarship deadlines/cycles for the seeded scholarships      (cycles)
 *   the opportunities catalogue                                   (seedOpportunities)
 *   forum categories, courses/lessons, levels & badges            (the app seeds)
 *
 * Every step is idempotent — running it twice is safe and changes nothing.
 *
 * Usage:  npm run db:seed        (needs DATABASE_URL)
 */
import "./lib/env";
import { seedDatabase, seedForum, seedCourses, seedGamification } from "@/db/seed";
import { seedProgramCatalog } from "@/db/seedProgramCatalog";
import { refreshSeededScholarshipCycles } from "@/db/seedScholarshipCycles";
import { countOpportunities, seedOpportunities } from "@/db/seedOpportunities";

async function main() {
  console.log("[seed] base catalogue (universities, programmes, scholarships, admin)…");
  await seedDatabase();

  console.log("[seed] programme catalogue…");
  const programs = await seedProgramCatalog();

  console.log("[seed] scholarship cycles…");
  const cycles = await refreshSeededScholarshipCycles();

  console.log("[seed] opportunities…");
  const opportunities = await seedOpportunities();

  console.log("[seed] forum, courses, gamification…");
  await seedForum();
  await seedCourses();
  await seedGamification();

  console.log(
    "[seed] done:",
    JSON.stringify(
      { programs, cycles, opportunities, totalOpportunities: await countOpportunities() },
      null,
      2
    )
  );
  // The db pool keeps the process alive; exit explicitly.
  process.exit(0);
}

main().catch((err) => {
  console.error("[seed] failed:", err);
  process.exit(1);
});
