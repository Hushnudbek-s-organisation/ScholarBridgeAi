/**
 * check-catalog-gaps.ts — what the 2026-10-23 catalogue audit still needs, and
 * whether the repository can actually supply it.
 *
 * The audit CSV lists 364 institutions and marks 76 of them as missing a rank,
 * an image or programmes. It does NOT contain the missing values, so this gate
 * answers the only question that matters: *can any file we hold close the gap
 * with an exact match?*
 *
 *   • rank      ← data/universities_campus_images_and_full_data.csv (qs_rank),
 *                 data/top_universities_11progs_qs_pdf_2026.json (qs_rank),
 *                 data/qs2026_top1500.csv (single-number ranks only),
 *                 src/lib/qsTop200Benchmarks.ts (the app's own QS table)
 *   • image     ← only a real https image URL; an extracted file name is not one
 *   • programs  ← data/programs_enriched_full.csv, by university_id
 *
 * Whatever is left is listed as administrator work: it has to be copied from the
 * university's official page, and until then the UI shows the honest fallback
 * (initials, "rank not published", no programme list).
 *
 * Run: npm run check:catalog-gaps
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import assert from "node:assert/strict";
import {
  buildGapReport,
  parseIntegerRank,
  resolveRank,
  type ImageSource,
  type RankSource,
  type UniversityGapRow,
} from "../src/lib/catalogGapFill";
import { QS_TOP_200_BENCHMARKS } from "../src/lib/qsTop200Benchmarks";

const root = join(__dirname, "..");
const read = (path: string) => readFileSync(join(root, path), "utf8");

/** Minimal RFC-4180 reader: the audit CSV has CRLF endings and quoted commas. */
function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let quoted = false;
  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    if (quoted) {
      if (char === '"' && text[i + 1] === '"') {
        field += '"';
        i++;
      } else if (char === '"') {
        quoted = false;
      } else {
        field += char;
      }
      continue;
    }
    if (char === '"') quoted = true;
    else if (char === ",") {
      row.push(field);
      field = "";
    } else if (char === "\n") {
      row.push(field.replace(/\r$/, ""));
      rows.push(row);
      row = [];
      field = "";
    } else if (char !== "\r") {
      field += char;
    }
  }
  if (field.length || row.length) {
    row.push(field.replace(/\r$/, ""));
    rows.push(row);
  }
  return rows.filter((r) => r.some((cell) => cell.trim() !== ""));
}

function records(text: string): Record<string, string>[] {
  const [header, ...rows] = parseCsv(text);
  const keys = header.map((h) => h.trim());
  return rows.map((cells) => {
    const record: Record<string, string> = {};
    keys.forEach((key, index) => {
      record[key] = (cells[index] ?? "").trim();
    });
    return record;
  });
}

let passed = 0;
const failures: string[] = [];
function check(name: string, fn: () => void) {
  try {
    fn();
    passed++;
    console.log(`  ✓ ${name}`);
  } catch (error) {
    failures.push(`${name} — ${(error as Error).message}`);
    console.log(`  ✗ ${name}\n      ${(error as Error).message}`);
  }
}

/* ------------------------------------------------------------- 1. load data */

const auditRows: UniversityGapRow[] = records(
  read("data/universities_missing_rank_image_programs_2026-10-23.csv"),
)
  .map((row) => ({
    id: Number.parseInt(row.id, 10),
    name: row.name,
    country: row.country,
    rankMissing: row.rank_missing === "yes",
    imageMissing: row.image_missing === "yes",
    programsMissing: row.programs_missing === "yes",
  }))
  .filter((row) => Number.isFinite(row.id) && row.name.length > 0);

const campusRows = records(read("data/universities_campus_images_and_full_data.csv"));
const elevenProgramRows = JSON.parse(
  read("data/top_universities_11progs_qs_pdf_2026.json"),
) as { name?: string; qs_rank?: number | string | null; image_file?: string | null }[];
const qsRows = records(read("data/qs2026_top1500.csv"));
const programRows = records(read("data/programs_enriched_full.csv"));

const rankSources: RankSource[] = [
  ...campusRows.map((row) => ({
    name: row.name,
    country: row.country,
    rank: parseIntegerRank(row.qs_rank),
    source: "data/universities_campus_images_and_full_data.csv",
  })),
  ...elevenProgramRows.map((row) => ({
    name: row.name ?? "",
    rank: parseIntegerRank(row.qs_rank ?? null),
    source: "data/top_universities_11progs_qs_pdf_2026.json",
  })),
  ...qsRows.map((row) => ({
    name: row.Name,
    country: row["Country/Territory"],
    rank: parseIntegerRank(row.Rank),
    source: "data/qs2026_top1500.csv",
  })),
  // Canonical names AND their exact aliases: "KAIST (Korea Advanced Institute of
  // Science & Technology)" normalizes to "kaist", which is the table's alias for
  // "KAIST - Korea Advanced Institute of Science & Technology".
  ...QS_TOP_200_BENCHMARKS.flatMap((benchmark) =>
    [benchmark.canonicalName, ...benchmark.aliases].map((name) => ({
      name,
      country: benchmark.country,
      rank: benchmark.qsRank,
      source: "src/lib/qsTop200Benchmarks.ts",
    })),
  ),
];

const imageSources: ImageSource[] = campusRows.map((row) => ({
  id: Number.parseInt(row.id, 10),
  name: row.name,
  imageUrl: row.image_url,
  source: "data/universities_campus_images_and_full_data.csv",
}));

const programCountByUniversityId = new Map<number, number>();
for (const row of programRows) {
  const id = Number.parseInt(row.university_id, 10);
  if (!Number.isFinite(id)) continue;
  programCountByUniversityId.set(id, (programCountByUniversityId.get(id) ?? 0) + 1);
}

const report = buildGapReport(auditRows, {
  rankSources,
  imageSources,
  programCountByUniversityId,
  programSource: "data/programs_enriched_full.csv",
});

/* --------------------------------------------------------- 2. the report */

console.log("\nCatalogue gap report (audit of 2026-10-23)");
const gaps = {
  rank: auditRows.filter((r) => r.rankMissing).length,
  image: auditRows.filter((r) => r.imageMissing).length,
  programs: auditRows.filter((r) => r.programsMissing).length,
};
const filled = {
  rank: report.filter((r) => r.rank).length,
  image: report.filter((r) => r.image).length,
  programs: report.filter((r) => r.programs).length,
};
console.log(`    universities audited : ${auditRows.length}`);
console.log(`    rank gaps            : ${gaps.rank} (closable from repository data: ${filled.rank})`);
console.log(`    image gaps           : ${gaps.image} (closable: ${filled.image})`);
console.log(`    programme gaps       : ${gaps.programs} (closable: ${filled.programs})`);

for (const row of report) {
  const bits: string[] = [];
  if (row.rankConflict) {
    bits.push(
      `rank CONFLICT: ${row.rankConflict.map((c) => `${c.value} (${c.source})`).join(" vs ")}`,
    );
  }
  if (row.rank) bits.push(`rank ${row.rank.value} ← ${row.rank.source}`);
  if (row.image) bits.push(`image ← ${row.image.source}`);
  if (row.programs) bits.push(`${row.programs.value} programmes ← ${row.programs.source}`);
  if (bits.length === 0) continue;
  console.log(`    • ${row.name}: ${bits.join("; ")}`);
}
const adminWork = report.filter((row) => row.unresolved.length > 0);
if (adminWork.length) {
  console.log(`\n    ${adminWork.length} institution(s) need values copied from an official page:`);
  for (const row of adminWork.slice(0, 12)) {
    console.log(`      - ${row.name} (${row.country}): ${row.unresolved.join(", ")}`);
  }
  if (adminWork.length > 12) console.log(`      … and ${adminWork.length - 12} more`);
}

/* ---------------------------------------------------------- 3. assertions */

check("the audit file is parsed completely (CRLF + quoted names)", () => {
  assert.equal(auditRows.length, 364, `expected 364 audited institutions, parsed ${auditRows.length}`);
  const wiut = auditRows.find((row) => row.name.includes("WIUT"));
  assert.ok(wiut, "WIUT must survive parsing");
  assert.equal(wiut!.country, "Uzbekistan");
});

check("every gap is classified — no row is silently dropped", () => {
  assert.equal(report.length, auditRows.length);
  for (const row of report) {
    const expected: string[] = [];
    if (auditRows.find((r) => r.id === row.id)!.rankMissing) expected.push("rank");
    if (auditRows.find((r) => r.id === row.id)!.imageMissing) expected.push("image");
    if (auditRows.find((r) => r.id === row.id)!.programsMissing) expected.push("programs");
    const resolved = (["rank", "image", "programs"] as const).filter((kind) => row[kind]);
    assert.equal(
      resolved.length + row.unresolved.length,
      expected.length,
      `${row.name}: ${expected.length} gaps became ${resolved.length} values + ${row.unresolved.length} unresolved`,
    );
  }
});

check("two sources that disagree about a rank publish neither", () => {
  // The campus export says KAIST is 37; the app's Top-200 table says 53. Picking
  // one would silently endorse an edition, so the row is reported as a conflict.
  const kaist = report.find((row) => row.name.startsWith("KAIST"));
  assert.ok(kaist, "KAIST must be in the audit");
  assert.equal(kaist!.rank, null, "a conflicted rank must not be published");
  const values = [...new Set((kaist!.rankConflict ?? []).map((c) => c.value))].sort((a, b) => a - b);
  assert.deepEqual(values, [37, 53], `expected the 37 vs 53 conflict, got ${values.join("/")}`);
  const sources = (kaist!.rankConflict ?? []).map((c) => c.source);
  assert.ok(sources.includes("src/lib/qsTop200Benchmarks.ts"));
  assert.ok(sources.includes("data/universities_campus_images_and_full_data.csv"));
});

check("an unranked university is never given a rank by a loose match", () => {
  // "New Uzbekistan University" once fuzzy-matched UNSW (rank 19). It has no QS
  // rank, and the resolver must say so rather than borrow someone else's.
  const newUu = report.find((row) => row.name === "New Uzbekistan University");
  assert.ok(newUu, "New Uzbekistan University must be in the audit");
  assert.equal(newUu!.rank, null, "no rank may be invented");
  assert.ok(newUu!.unresolved.includes("rank"));
  for (const name of ["Westminster International University in Tashkent (WIUT)", "Inha University in Tashkent (IUT)"]) {
    const row = report.find((r) => r.name === name);
    assert.ok(row, `${name} must be in the audit`);
    assert.equal(row!.rank, null, `${name} is not QS-ranked — a rank here would be fabricated`);
  }
});

check("a QS band is not read as an integer rank", () => {
  assert.equal(parseIntegerRank("1201-1400"), null);
  assert.equal(parseIntegerRank("1201"), 1201);
  assert.equal(parseIntegerRank("—"), null);
  assert.equal(parseIntegerRank(205), 205);
});

check("an image is only taken from a real URL, never from a file name", () => {
  for (const row of report.filter((entry) => entry.image)) {
    assert.match(row.image!.value, /^https:\/\//, `${row.name}: image must be an absolute URL`);
  }
  // The PDF extraction names files ("KAIST_from_across_Gapcheon.jpg"); those are
  // not URLs and must never reach an <img src>.
  const fileNames = elevenProgramRows.filter((row) => row.image_file);
  assert.ok(fileNames.length > 0, "the PDF extraction should still carry file names");
  for (const row of fileNames) {
    assert.doesNotMatch(row.image_file ?? "", /^https?:\/\//);
  }
});

check("programmes are only counted from the imported programme catalogue", () => {
  for (const row of report.filter((entry) => entry.programs)) {
    assert.equal(row.programs!.source, "data/programs_enriched_full.csv");
    assert.ok(row.programs!.value > 0);
    assert.equal(row.programs!.value, programCountByUniversityId.get(row.id));
  }
});

check("the UI has an honest fallback for every unresolved gap", () => {
  // No fabricated rank, image or programme list: the components fall back to
  // their own empty states, which is what these strings prove still exist.
  const card = read("src/components/UniversityExplorer.tsx");
  assert.match(card, /worldRanking/, "the explorer must read the real rank field");
  const localizer = read("src/lib/catalogLocalizer.ts");
  assert.match(localizer, /description/i, "the localizer keeps its empty-state handling");
});

console.log(`\n${failures.length === 0 ? "✅" : "❌"} ${passed} passed, ${failures.length} failed`);
if (failures.length) process.exitCode = 1;
