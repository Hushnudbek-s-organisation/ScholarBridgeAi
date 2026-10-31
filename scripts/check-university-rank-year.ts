/**
 * Phase AD gate — a rank without a recorded edition is not a QS position.
 *
 * `universities.world_ranking` holds the verified QS 2026 position for 348 of
 * the 350 ranked catalogue rows. Two carry a number with no edition
 * (`qs_rank_year = NULL`), both copied from a user-supplied PDF dataset whose
 * "2026" is the dataset's own label:
 *
 *   id 37  KAIST (Korea Advanced Institute of Science & Technology) #53
 *   id 298 École des Ponts ParisTech                                 #205
 *
 * Neither institution appears in the official QS 2026 edition at all — KAIST is
 * the false `QS #53` Phase AC removed from the chancing benchmark table. A page
 * that prints "QS Ranking #53" for it therefore states a position the edition
 * does not publish, with no year to qualify it.
 *
 * The last six phases settled the rule: **a QS number is the verified position
 * of the edition it names, or it is not printed.** This gate pins the helper
 * that implements it (`src/lib/universityRank.ts`) and every read path that
 * publishes a rank, so the rule cannot drift back into one endpoint.
 *
 * Run: npm run test:university-rank-year
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  qsRankEdition,
  verifiedQsRank,
  verifiedQsRankNumber,
  verifiedRankWithEdition,
} from "../src/lib/universityRank";

const ROOT = join(__dirname, "..");
let passed = 0;
const failures: string[] = [];

function check(name: string, fn: () => void) {
  try {
    fn();
    passed++;
  } catch (error) {
    failures.push(`${name}: ${(error as Error).message}`);
  }
}

const source = (relative: string) => readFileSync(join(ROOT, relative), "utf8");

/* ------------------------------------------------------------- the rule */

check("a rank whose edition was never recorded is not a position", () => {
  // The two live rows, as the database returns them.
  assert.equal(verifiedQsRank({ worldRanking: 53, qsRankYear: null }), null, "KAIST still claims #53");
  assert.equal(verifiedQsRank({ worldRanking: 205, qsRankYear: null }), null, "École des Ponts still claims #205");
  assert.equal(verifiedQsRankNumber({ worldRanking: 53, qsRankYear: null }), null);
});

check("a rank with a recorded edition is a position", () => {
  assert.deepEqual(verifiedQsRank({ worldRanking: 22, qsRankYear: 2026 }), { rank: 22, year: 2026 });
  assert.deepEqual(verifiedQsRank({ worldRanking: 1, qsRankYear: 2026 }), { rank: 1, year: 2026 });
  assert.equal(verifiedQsRankNumber({ worldRanking: 22, qsRankYear: 2026 }), 22);
  // `undefined` is the same as NULL — a row shape without the column cannot verify.
  assert.equal(verifiedQsRank({ worldRanking: 22 }), null);
});

check("a broken number is never a position", () => {
  for (const worldRanking of [0, -5, 3.5, Number.NaN, Number.POSITIVE_INFINITY, null, undefined]) {
    assert.equal(
      verifiedQsRank({ worldRanking, qsRankYear: 2026 }),
      null,
      `${String(worldRanking)} was accepted as a QS position`
    );
  }
});

check("a broken edition is never an edition", () => {
  for (const qsRankYear of [0, 53, 1999, 2101, 2026.5, Number.NaN, null, undefined]) {
    assert.equal(
      qsRankEdition({ qsRankYear }),
      null,
      `${String(qsRankYear)} was accepted as an edition year`
    );
    assert.equal(verifiedQsRank({ worldRanking: 53, qsRankYear }), null);
  }
  assert.equal(qsRankEdition({ qsRankYear: 2026 }), 2026);
  assert.equal(qsRankEdition({ qsRankYear: 2027 }), 2027);
});

check("the edition-travelling variant applies the same rule", () => {
  assert.equal(verifiedRankWithEdition(53, null), null);
  assert.equal(verifiedRankWithEdition(53, 2026), 53);
  assert.equal(verifiedRankWithEdition(null, 2026), null);
});

check("the rule is a pure module — no database, no React, no environment", () => {
  const text = source("src/lib/universityRank.ts");
  assert.doesNotMatch(text, /from "@\/db/, "the rank rule reached into the database");
  assert.doesNotMatch(text, /drizzle-orm/, "the rank rule imports the ORM");
  assert.doesNotMatch(text, /from "react"/, "the rank rule imports React");
  assert.doesNotMatch(text, /process\.env/, "the rank rule reads the environment");
});

/* --------------------------------------------------------- the read paths */

check("the catalogue list drops an undated rank before it is published", () => {
  const text = source("src/app/api/universities/route.ts");
  assert.match(text, /import \{ verifiedQsRank \} from "@\/lib\/universityRank";/);
  // Phase AF wrapped the row in `withResolvedUsdCosts` first, so the guard now
  // reads the published copy; the rule itself is unchanged.
  assert.match(
    text,
    /if \(resolved\.worldRanking != null && verifiedQsRank\(resolved\) == null\) \{\s*return \{ \.\.\.resolved, worldRanking: null \};/,
    "the list endpoint publishes an undated rank again"
  );
});

check("the detail endpoint publishes only the verified position", () => {
  const text = source("src/app/api/universities/[id]/route.ts");
  assert.match(text, /import \{ verifiedQsRankNumber \} from "@\/lib\/universityRank";/);
  assert.match(text, /const qsRank = verifiedQsRankNumber\(uni\);/, "the detail endpoint stopped checking the edition");
  assert.match(text, /worldRanking: qsRank,/, "the detail payload still carries the raw column");
  assert.match(text, /localizeUniversityDescription\(uni\.description, "en", qsRank\)/);
  assert.match(text, /qsRankYear: universities\.qsRankYear,/, "the fallback select cannot see the edition");
});

check("the profile page states one verified position, or none", () => {
  const text = source("src/app/universities/[id]/page.tsx");
  assert.match(text, /import \{ verifiedQsRank \} from "@\/lib\/universityRank";/);
  assert.match(text, /const qsPosition = verified \? verifiedQsRank\(u\) : null;/, "the page stopped checking the edition");
  assert.match(text, /value: verifiedValue\(qsPosition\?\.rank \?\? null\)/, "the rank fact reads the raw column");
  assert.match(text, /\{t\.rankLabel\}: #\{verifiedValue\(qsPosition\?\.rank \?\? null\)\}/, "the hero badge reads the raw column");
  assert.match(text, /universityDescriptionState\(u\.description, locale, qsPosition\?\.rank \?\? null\)/, "the prose is reconciled to an unverified number");
  assert.match(text, /rank: verified && qsPosition/, "the meta description states an unverified rank");
  assert.doesNotMatch(text, /verifiedValue\(u\.worldRanking\)/, "a badge still reads the raw column");
});

check("the chancing screens cannot fall back to an undated stored rank", () => {
  const text = source("src/app/api/chancing/route.ts");
  assert.match(text, /import \{ verifiedQsRank \} from "@\/lib\/universityRank";/);
  assert.match(text, /worldRanking: verifiedQsRank\(uni\)\?\.rank \?\? qsBenchmark\.qsRank/, "the chancing card takes the raw column");
  assert.match(text, /worldRanking: verifiedQsRank\(u\)\?\.rank \?\? b\.qsRank/, "the shortlist takes the raw column");
  assert.doesNotMatch(text, /uni\.worldRanking \?\? qsBenchmark/, "the raw column is back in the chancing path");
});

check("the programme recommendations, planner and dashboard follow the same rule", () => {
  assert.match(
    source("src/app/api/programs/recommend/route.ts"),
    /verifiedRankByUniId\.set\(u\.id, verifiedQsRankNumber\(u\)\)/,
    "recommendations take the raw column"
  );
  assert.match(
    source("src/app/api/planning/route.ts"),
    /worldRanking: verifiedQsRankNumber\(u\)/,
    "the comparison list takes the raw column"
  );
  assert.match(
    source("src/app/api/dashboard/route.ts"),
    /worldRanking: verifiedQsRankNumber\(u\)/,
    "the dashboard cards take the raw column"
  );
});

check("no public endpoint hands the raw column to a client", () => {
  const routes = [
    "src/app/api/universities/route.ts",
    "src/app/api/universities/[id]/route.ts",
    "src/app/api/chancing/route.ts",
    "src/app/api/programs/recommend/route.ts",
    "src/app/api/planning/route.ts",
    "src/app/api/dashboard/route.ts",
  ];
  for (const route of routes) {
    assert.doesNotMatch(
      source(route),
      /worldRanking: (u|uni)\.worldRanking/,
      `${route} still ships the raw column`
    );
  }
});

check("the cards omit the badge instead of printing a dash", () => {
  const explorer = source("src/components/UniversityExplorer.tsx");
  assert.match(explorer, /\{uni\.worldRanking != null && \(\s*<div className="absolute top-3 right-3/, "the explorer badge renders without a rank");
  const modal = source("src/components/UniversityDetail.tsx");
  assert.match(modal, /\{uni\.worldRanking != null && \(\s*<div className="mt-3 inline-flex items-center gap-2 rounded-xl/, "the detail modal renders a rank block without a rank");
});

/* ------------------------------------------------------- the data contract */

check("the edition is a real column the admin can fill in", () => {
  const schema = source("src/db/schema.ts");
  assert.match(schema, /worldRanking: integer\("world_ranking"\),/, "the rank column disappeared");
  assert.match(schema, /qsRankYear: integer\("qs_rank_year"\),/, "the edition column disappeared — every rank would become undated");
  const admin = source("src/app/api/admin/universities/route.ts");
  assert.match(admin, /qsRankYear: \{ key: "qsRankYear", integer: true \}/, "the admin editor cannot record the edition");
});

console.log(`\n${passed} passed, ${failures.length} failed`);
if (failures.length > 0) {
  for (const failure of failures) console.error(`  · ${failure}`);
  process.exit(1);
}
