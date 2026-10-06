/**
 * Bring an EXISTING database up to date with the seed catalogue.
 *
 * `seedDatabase()` inserts the demo universities and (idempotently) their
 * programs, but it only runs on a fresh install — installs created before the
 * program catalogue existed have universities without any `programs` rows, and
 * the recommender reads programmes exclusively. This script runs the same
 * idempotent `seedProgramCatalog()` directly, so an existing deployment can be
 * brought up to date without wiping data.
 *
 * Usage:  npm run db:seed:catalog
 */
import "./lib/env";
import { seedProgramCatalog } from "@/db/seedProgramCatalog";
import { refreshSeededScholarshipCycles } from "@/db/seedScholarshipCycles";
import { countOpportunities, seedOpportunities } from "@/db/seedOpportunities";

async function main() {
  const summary = await seedProgramCatalog();
  console.log("Program catalogue top-up complete:", summary);
  const scholarshipCycles = await refreshSeededScholarshipCycles();
  console.log("Seeded scholarship cycles refreshed:", scholarshipCycles);
  const opportunitiesSeed = await seedOpportunities();
  console.log("Opportunities catalogue:", opportunitiesSeed, "total rows:", await countOpportunities());
  if (summary.universitiesMatched === 0) {
    console.log(
      "No seeded universities found — run `npm run db:dev:init` (or open any discovery page) first.",
    );
  }
  // The db pool keeps the process alive; exit explicitly.
  process.exit(0);
}

main().catch((err) => {
  console.error("Program catalogue top-up failed:", err);
  process.exit(1);
});
