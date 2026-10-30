/**
 * Phase AC gate — a QS number in the chancing benchmark table is the edition's
 * own position, or it is absent.
 *
 * `src/lib/qsTop200Benchmarks.ts` feeds three surfaces: the chancing cards
 * (`QS #N` badge), the programme recommendations (`positioning.qsRank`) and the
 * similar-profiles panel. Its 201 rows were hand-compiled and their rank column
 * had drifted from the edition the rest of the catalogue was corrected to
 * (`data/qs2026_top1500.csv`, QS 2026).
 *
 * Measured 2026-10-30 against that table: 46 of 200 ranks were wrong, every one
 * of them by 1–3 places because a neighbouring row had been inserted or dropped
 * upstream (UC Berkeley #18→17, TUM #23→22, Sydney #26→25, Waterloo #122→119 …).
 * The 201st row, KAIST, claimed #53 for an institution the 2026 edition does not
 * rank at all.
 *
 * The rank column is now `number | null` — `null` means "this edition does not
 * rank it" — and this gate compares every row with the official CSV, so a rank
 * can only be reintroduced by hand at the price of a red build.
 *
 * Run: npm run test:qs-benchmarks
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  QS_TOP_200_BENCHMARKS,
  QS_TOP_200_RAW_TUPLE_DATA,
  matchQsUniversityBenchmark,
} from "../src/lib/qsTop200Benchmarks";

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

/** Same normalisation the matcher uses: accents, `&`, punctuation out. */
function nameKey(raw: string): string {
  return raw
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

/** Minimal CSV reader — names contain commas only inside quotes. */
function readOfficialTable(): { byName: Map<string, number>; rankCounts: Map<number, number> } {
  const raw = readFileSync(join(ROOT, "data/qs2026_top1500.csv"), "utf8").replace(/^\uFEFF/, "");
  const lines = raw.split(/\r?\n/).filter(Boolean);
  const header = splitCsv(lines[0]);
  const nameIndex = header.indexOf("Name");
  const rankIndex = header.indexOf("Rank");
  assert.ok(nameIndex >= 0 && rankIndex >= 0, "the official table lost its Rank/Name columns");

  const byName = new Map<string, number>();
  const rankCounts = new Map<number, number>();
  for (const line of lines.slice(1)) {
    const cells = splitCsv(line);
    const rankText = (cells[rankIndex] ?? "").trim();
    // Bands ("701-710") are below the top 200; only a plain integer counts.
    if (!/^\d+$/.test(rankText)) continue;
    const rank = Number(rankText);
    const key = nameKey(cells[nameIndex] ?? "");
    if (!key) continue;
    if (rank <= 200) {
      byName.set(key, rank);
      rankCounts.set(rank, (rankCounts.get(rank) ?? 0) + 1);
    }
  }
  return { byName, rankCounts };
}

function splitCsv(line: string): string[] {
  const cells: string[] = [];
  let cell = "";
  let quoted = false;
  for (const ch of line) {
    if (ch === '"') quoted = !quoted;
    else if (ch === "," && !quoted) {
      cells.push(cell);
      cell = "";
    } else cell += ch;
  }
  cells.push(cell);
  return cells;
}

const official = readOfficialTable();

/** Resolve a table row to its official QS 2026 name, if the edition lists it. */
function officialRankFor(row: { canonicalName: string; aliases: string[] }): number | undefined {
  const direct = official.byName.get(nameKey(row.canonicalName));
  if (direct !== undefined) return direct;
  for (const alias of row.aliases) {
    const hit = official.byName.get(nameKey(alias));
    if (hit !== undefined) return hit;
  }
  return undefined;
}

/* ------------------------------------------------------------ the table */

check("the table still holds 200 ranked rows plus the unranked bonus row", () => {
  assert.equal(QS_TOP_200_RAW_TUPLE_DATA.length, 201, "row count changed — was the table edited by hand?");
  const ranked = QS_TOP_200_RAW_TUPLE_DATA.filter((row) => row[0] !== null);
  assert.equal(ranked.length, 200, `expected 200 ranked rows, found ${ranked.length}`);
});

check("every row carries the full 15-field band", () => {
  for (const row of QS_TOP_200_RAW_TUPLE_DATA) {
    assert.equal(row.length, 15, `${row[1]}: ${row.length} fields`);
    assert.ok(row[1].trim().length > 0, "a row lost its canonical name");
    assert.ok(row[3].trim().length > 0, `${row[1]}: no country`);
    assert.ok(row[14].includes("."), `${row[1]}: no domain`);
  }
});

check("every claimed rank is the official QS 2026 position", () => {
  const wrong: string[] = [];
  for (const row of QS_TOP_200_RAW_TUPLE_DATA) {
    const [rank, canonicalName, aliases] = row;
    const officialRank = officialRankFor({ canonicalName, aliases });
    if (officialRank === undefined) {
      if (rank !== null) wrong.push(`${canonicalName}: claims #${rank}, but QS 2026 does not rank it`);
      continue;
    }
    if (rank !== officialRank) wrong.push(`${canonicalName}: table #${rank ?? "none"}, official #${officialRank}`);
  }
  assert.deepEqual(wrong, [], `rank drift from data/qs2026_top1500.csv:\n    ${wrong.join("\n    ")}`);
});

check("no row is left claiming a rank for an unranked institution", () => {
  const unranked = QS_TOP_200_RAW_TUPLE_DATA.filter(
    (row) => officialRankFor({ canonicalName: row[1], aliases: row[2] }) === undefined
  );
  assert.deepEqual(
    unranked.map((row) => row[1]),
    ["KAIST - Korea Advanced Institute of Science & Technology"],
    "the set of unranked rows changed — re-check it against the CSV"
  );
  for (const row of unranked) {
    assert.equal(row[0], null, `${row[1]}: still claims a QS position`);
  }
});

check("a shared table rank is a tie the edition itself declares", () => {
  const tableCounts = new Map<number, number>();
  for (const row of QS_TOP_200_RAW_TUPLE_DATA) {
    if (row[0] === null) continue;
    tableCounts.set(row[0], (tableCounts.get(row[0]) ?? 0) + 1);
  }
  for (const [rank, count] of tableCounts) {
    const officialCount = official.rankCounts.get(rank) ?? 0;
    assert.ok(
      count <= officialCount,
      `#${rank} is shared by ${count} table rows, but QS 2026 lists ${officialCount}`
    );
  }
});

check("no institution appears twice", () => {
  // Key on the official name when the row resolves, so two hand-typed spellings
  // of the same university still collide.
  const seen = new Map<string, string>();
  for (const row of QS_TOP_200_RAW_TUPLE_DATA) {
    const officialKey = [row[1], ...row[2]]
      .map(nameKey)
      .find((key) => official.byName.has(key));
    const key = officialKey ?? nameKey(row[1]);
    const previous = seen.get(key);
    assert.equal(previous, undefined, `${row[1]} duplicates ${previous}`);
    seen.set(key, row[1]);
  }
});

check("every non-null rank is an integer inside 1..200", () => {
  for (const row of QS_TOP_200_RAW_TUPLE_DATA) {
    if (row[0] === null) continue;
    assert.ok(Number.isInteger(row[0]), `${row[1]}: #${row[0]} is not an integer`);
    assert.ok(row[0] >= 1 && row[0] <= 200, `${row[1]}: #${row[0]} is outside the edition's top 200`);
  }
});

check("the matcher trusts the DB rank when the table has none", () => {
  const kaist = matchQsUniversityBenchmark({
    name: "KAIST (Korea Advanced Institute of Science & Technology)",
    country: "South Korea",
    worldRanking: 53,
  });
  assert.equal(kaist.qsRank, null, "an unranked row must stay unranked");
  assert.ok(kaist.gpa50 > 0, "the admission band must survive without a rank");

  const ranked = matchQsUniversityBenchmark({ name: "Technical University of Munich", country: "Germany" });
  assert.equal(ranked.qsRank, 22, "TUM must resolve to its official 2026 position");
});

/* ------------------------------------------------------------- wiring */

check("the rank column is nullable, not a placeholder number", () => {
  const source = readFileSync(join(ROOT, "src/lib/qsTop200Benchmarks.ts"), "utf8");
  assert.match(source, /qsRank: number \| null;/, "the benchmark type lost its nullable rank");
  assert.match(source, /number \| null, string, string\[\], string, number,/, "the tuple type is back to a bare number");
});

check("no badge prints a null rank", () => {
  const panel = readFileSync(join(ROOT, "src/components/ChancingPanel.tsx"), "utf8");
  assert.match(
    panel,
    /activeItem\.worldRanking \?\? qsBench\?\.qsRank \?\? null/,
    "the chancing badge no longer prefers the verified DB rank"
  );
  assert.match(panel, /displayRank != null &&/, "the chancing badge prints an absent rank");
  assert.doesNotMatch(panel, /QS #\{qsBench\.qsRank\}/, "the chancing badge is back to the raw table rank");

  const similar = readFileSync(join(ROOT, "src/components/SimilarProfiles.tsx"), "utf8");
  assert.match(similar, /bench\?\.qsRank != null &&/, "the similar-profiles badge prints an absent rank");

  const studio = readFileSync(join(ROOT, "src/components/RecommendationStudio.tsx"), "utf8");
  assert.match(studio, /r\.positioning\.qsRank != null &&/, "the recommendation card prints an absent rank");
});

check("both APIs prefer the verified rank over the curated table", () => {
  const chancing = readFileSync(join(ROOT, "src/app/api/chancing/route.ts"), "utf8");
  assert.match(chancing, /worldRanking: uni\.worldRanking \?\? qsBenchmark\.qsRank/, "chancing lost the DB-first order");
  assert.match(chancing, /worldRanking: u\.worldRanking \?\? b\.qsRank/, "the shortlist lost the DB-first order");

  const recommend = readFileSync(join(ROOT, "src/app/api/programs/recommend/route.ts"), "utf8");
  assert.match(
    recommend,
    /qsRank: verifiedRankByUniId\.get\(r\.university\.id\) \?\? benchmark\.qsRank \?\? null/,
    "programme recommendations no longer prefer the verified rank"
  );
});

check("the selectivity band treats an unranked row as unranked, not as a rank", () => {
  const source = readFileSync(join(ROOT, "src/lib/programChancing.ts"), "utf8");
  assert.match(
    source,
    /const benchmarkRank = qsBenchmark\.qsRank \?\? Number\.POSITIVE_INFINITY;/,
    "the selectivity band no longer neutralises a null rank"
  );
  assert.doesNotMatch(source, /qsBenchmark\.qsRank <= \d+/, "a raw rank comparison on a nullable value came back");
});

/* ------------------------------------------------ every row is reachable */

check("every benchmark row is what the matcher returns for its own name", () => {
  const mismatched: string[] = [];
  for (const benchmark of QS_TOP_200_BENCHMARKS) {
    const matched = matchQsUniversityBenchmark({
      name: benchmark.canonicalName,
      country: benchmark.country,
    });
    if (matched.officialDomain !== benchmark.officialDomain) {
      mismatched.push(`${benchmark.canonicalName} → ${matched.canonicalName}`);
    }
    if (matched.qsRank !== benchmark.qsRank) {
      mismatched.push(`${benchmark.canonicalName}: #${benchmark.qsRank} → #${matched.qsRank}`);
    }
  }
  assert.deepEqual(mismatched, [], `rows the matcher cannot find by name:\n    ${mismatched.join("\n    ")}`);
});

console.log(`\n${passed} passed, ${failures.length} failed`);
if (failures.length > 0) {
  for (const failure of failures) console.error(`  · ${failure}`);
  process.exit(1);
}
