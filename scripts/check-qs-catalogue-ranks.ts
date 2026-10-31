/**
 * Phase AE gate — every stored catalogue rank is the official QS 2026 position.
 *
 * The public gates check what a screen *renders*; `test:qs-benchmarks` checks
 * the 201-row benchmark table. Nothing checked the 350 numbers stored in
 * `universities.world_ranking` itself — the column every screen eventually
 * repeats. Audited on 2026-10-30 against `data/qs2026_top1500.csv`:
 *
 *   six ranks were one place low  (Basel, Hanyang, Barcelona, Michigan State,
 *                                  Oulu, SUSTech — all inside the #157 block
 *                                  where the old top-499 extract and the CSV
 *                                  disagree about a tie)
 *   two claimed a position the edition does not publish  (KAIST #53,
 *                                  École des Ponts #205 — neither appears in
 *                                  the table at all)
 *
 * The live rows are fixed (`supabase/qs_2026_rank_correction_pass2_2026-10-30.sql`).
 * This gate keeps them fixed: it replays the audit over a snapshot of the live
 * catalogue (`scripts/fixtures/live-catalogue-ranks-2026-10-30.tsv`, 356 rows,
 * id + name + rank + edition) and fails if any row stops agreeing with the
 * official table. Regenerate the snapshot with `npm run audit:qs-ranks --
 * --write-fixture` after an intentional data change.
 *
 * Run: npm run test:qs-catalogue-ranks
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { QS_NAME_ALIASES, auditCatalogueRanks, officialKeys } from "../src/lib/qsRankAudit";
import { parseCatalogueSnapshot, readOfficialQsTable } from "./lib/official-qs-table";

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

/* ------------------------------------------------------------ the sources */

const official = readOfficialQsTable(ROOT);
const fixture = parseCatalogueSnapshot(
  readFileSync(join(ROOT, "scripts/fixtures/live-catalogue-ranks-2026-10-30.tsv"), "utf8")
);

/* ------------------------------------------------------------ the table */

check("the official table still holds the whole edition", () => {
  assert.ok(official.entries.length > 1500, `only ${official.entries.length} rows`);
  assert.equal(official.top200Rows, 200, `expected 200 institutions inside the top 200, found ${official.top200Rows}`);
});

check("the catalogue snapshot still holds every active row", () => {
  assert.equal(fixture.length, 356, `snapshot has ${fixture.length} rows — was it regenerated?`);
  assert.equal(new Set(fixture.map((row) => row.id)).size, fixture.length, "duplicate ids in the snapshot");
});

/* ------------------------------------------------------------- the audit */

check("every stored rank equals the official QS 2026 position", () => {
  const summary = auditCatalogueRanks(fixture, official.index);
  const detail = summary.problems
    .map((p) => {
      const officialLabel = p.official?.rank ?? p.official?.band?.join("-") ?? "not in the edition";
      return `${p.row.name}: stored ${p.row.worldRanking ?? "none"} (edition ${p.row.qsRankYear ?? "none"}), official ${officialLabel}`;
    })
    .join("\n    ");
  assert.deepEqual(summary.problems.map((p) => p.verdict), [], `catalogue ranks disagree with data/qs2026_top1500.csv:\n    ${detail}`);
  assert.equal(summary.byVerdict["match"].length + summary.byVerdict["band-match"].length, 348, "the number of ranked rows changed");
});

check("every catalogue row resolves to an official entry, or to nothing at all", () => {
  const summary = auditCatalogueRanks(fixture, official.index);
  assert.equal(summary.byVerdict["unknown"].length, 0, "a row matches no official entry — add the rename to QS_NAME_ALIASES or drop the rank");
  assert.equal(summary.byVerdict["not-filled"].length, 0, "the edition ranks an institution the catalogue leaves blank");
});

check("exactly the eight unranked institutions stay unranked", () => {
  const summary = auditCatalogueRanks(fixture, official.index);
  assert.deepEqual(
    summary.byVerdict["not-ranked"].map((r) => r.row.name),
    [
      "KAIST (Korea Advanced Institute of Science & Technology)",
      "Nazarbayev University",
      "Westminster International University in Tashkent (WIUT)",
      "Inha University in Tashkent (IUT)",
      "New Uzbekistan University",
      "École des Ponts ParisTech",
      "Corvinus University of Budapest",
      "Semmelweis University",
    ],
    "the set of unranked catalogues changed — check it against the edition"
  );
});

check("Inha in Tashkent is never given the Korean Inha's position", () => {
  // The edition ranks "Inha University" (Republic of Korea) at #643. The
  // Tashkent campus is a different institution and has no position — a
  // tempting name match that must never be made.
  const summary = auditCatalogueRanks(
    [{ id: 215, name: "Inha University in Tashkent (IUT)", worldRanking: 643, qsRankYear: 2026 }],
    official.index
  );
  assert.equal(summary.results[0].verdict, "unverified-claim", "the Tashkent campus was matched to the Korean Inha");
});

/* ------------------------------------------------- the audit still bites */

check("the six ranks fixed in pass 2 fail the audit if they come back", () => {
  const regressed = fixture.map((row) => {
    switch (row.id) {
      case 141:
        return { ...row, worldRanking: 157 }; // University of Basel
      case 134:
        return { ...row, worldRanking: 158 }; // Hanyang University
      case 307:
        return { ...row, worldRanking: 159 }; // University of Barcelona
      case 305:
        return { ...row, worldRanking: 160 }; // Michigan State University
      case 197:
        return { ...row, worldRanking: 341 }; // University of Oulu
      case 301:
        return { ...row, worldRanking: 342 }; // Southern University of Science and Technology
      default:
        return row;
    }
  });
  const summary = auditCatalogueRanks(regressed, official.index);
  assert.deepEqual(
    summary.problems.map((p) => p.row.id).sort((a, b) => a - b),
    [134, 141, 197, 301, 305, 307],
    "the audit no longer catches the #157 tie block"
  );
  assert.ok(summary.problems.every((p) => p.verdict === "mismatch"), "the regressions are not reported as mismatches");
});

check("a cleared institution that regains a rank fails the audit", () => {
  const regressed = fixture.map((row) =>
    row.id === 37 ? { ...row, worldRanking: 53, qsRankYear: 2026 } : row
  );
  const summary = auditCatalogueRanks(regressed, official.index);
  assert.deepEqual(summary.problems.map((p) => p.verdict), ["unverified-claim"]);
  assert.equal(summary.problems[0].row.name.startsWith("KAIST"), true);
});

check("a rank with no recorded edition is not a position", () => {
  const undated = fixture.map((row) => (row.id === 25 ? { ...row, qsRankYear: null } : row));
  const summary = auditCatalogueRanks(undated, official.index);
  assert.deepEqual(summary.problems.map((p) => p.verdict), ["undated"]);
});

check("a published band is a range the row must fall inside", () => {
  // Wrocław University of Science and Technology is #851-900 in the edition.
  const outside = fixture.map((row) => (row.id === 360 ? { ...row, worldRanking: 1001 } : row));
  assert.deepEqual(auditCatalogueRanks(outside, official.index).problems.map((p) => p.verdict), ["band-miss"]);
  // The unmodified snapshot already has it inside the band — 14 rows live in a
  // published range and none of them falls outside it.
  assert.equal(auditCatalogueRanks(fixture, official.index).byVerdict["band-match"].length, 14);
});

/* ------------------------------------------------------- the alias table */

check("every rename points at a name the edition really uses", () => {
  const stale = Object.entries(QS_NAME_ALIASES).filter(([, target]) => {
    const keys = officialKeys({ name: target, rank: null, band: null });
    return !keys.some((key) => official.index.has(key));
  });
  assert.deepEqual(stale, [], `renames that resolve to nothing: ${stale.map(([from]) => from).join(", ")}`);
});

check("no rename resolves to a university the project already lists under its own name", () => {
  // A rename must not shadow a different institution (the Inha trap).
  for (const [from, to] of Object.entries(QS_NAME_ALIASES)) {
    assert.notEqual(from, to.toLowerCase(), `${from}: alias points at itself`);
  }
});

/* ----------------------------------------------------------- the wiring */

check("the audit stays pure and the gate is wired", () => {
  const source = readFileSync(join(ROOT, "src/lib/qsRankAudit.ts"), "utf8");
  assert.doesNotMatch(source, /from "@\/db/, "the audit reached into the database");
  assert.doesNotMatch(source, /process\.env/, "the audit reads the environment");
  const pkg = JSON.parse(readFileSync(join(ROOT, "package.json"), "utf8")) as { scripts: Record<string, string> };
  assert.equal(pkg.scripts["test:qs-catalogue-ranks"], "tsx scripts/check-qs-catalogue-ranks.ts");
  assert.equal(pkg.scripts["audit:qs-ranks"], "tsx scripts/audit-live-ranks.ts");
});

console.log(`\n${passed} passed, ${failures.length} failed`);
if (failures.length > 0) {
  for (const failure of failures) console.error(`  · ${failure}`);
  process.exit(1);
}
