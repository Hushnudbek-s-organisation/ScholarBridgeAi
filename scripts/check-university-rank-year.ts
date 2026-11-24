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
  sourcedQsRanking,
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

check("the catalogue and detail routes publish verified source-linked QS editions", () => {
  const list = source("src/app/api/universities/route.ts");
  const detail = source("src/app/api/universities/[id]/route.ts");
  const loader = source("src/lib/universityRankings.server.ts");
  assert.match(list, /bundle\.qsRankings\.get\(uni\.id\)/);
  assert.match(detail, /loadVerifiedQsRankings\(\[uniId\]\)/);
  for (const body of [list, detail]) {
    assert.match(body, /worldRanking: qsRanking\?\.rank \?\? null/);
    assert.match(body, /qsRankYear: qsRanking\?\.year \?\? null/);
  }
  assert.match(loader, /eq\(sources\.isVerified, true\)/);
  assert.match(loader, /desc\(universityRankings\.rankingYear\)/);
});

check("source-linked ranks preserve ties and bands and reject contradictory values", () => {
  const url = "https://www.topuniversities.com/world-university-rankings";
  assert.deepEqual(sourcedQsRanking({ rank: 218, rankLabel: "#=218", year: 2027, sourceUrl: url }),
    { rank: 218, upperRank: 218, label: "#=218", year: 2027, sourceUrl: url });
  assert.deepEqual(sourcedQsRanking({ rank: null, rankLabel: "801-850", year: 2026, sourceUrl: url }),
    { rank: 801, upperRank: 850, label: "#801–850", year: 2026, sourceUrl: url });
  assert.equal(sourcedQsRanking({ rank: 7, rankLabel: "#8", year: 2027, sourceUrl: url }), null);
  assert.equal(sourcedQsRanking({ rank: 7, rankLabel: null, year: 2027, sourceUrl: "javascript:1" }), null);
});

check("the public profile links its displayed QS rank to the source", () => {
  const text = source("src/app/universities/[id]/page.tsx");
  assert.match(text, /bundle\?\.qsRankings\.get\(u\.id\)/);
  assert.match(text, /href=\{qsPosition\.sourceUrl\}/);
  assert.match(text, /QS \{qsPosition\.year\} \{qsPosition\.label\}/);
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

check("catalogue cards display the sourced QS edition and label", () => {
  const explorer = source("src/components/UniversityExplorer.tsx");
  assert.match(explorer, /href=\{uni\.qsRanking\.sourceUrl\}/);
  assert.match(explorer, /year: uni\.qsRanking\.year, rank: uni\.qsRanking\.label/);
  const modal = source("src/components/UniversityDetail.tsx");
  assert.match(modal, /href=\{uni\.qsRanking\.sourceUrl\}/);
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
