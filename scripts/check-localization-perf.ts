/**
 * Phase 3 gates — catalogue localization coverage, memo correctness, score memo.
 *
 * Three things are asserted, because all three were wrong or missing at some
 * point in this codebase's history:
 *
 *  1. COVERAGE. Every study field, degree level, study mode and programme
 *     language that actually appears in `data/programs_enriched_full.csv` must
 *     have a uz and ru translation. The file is the source the programme
 *     catalogue is seeded from, so a label with no translation is a label
 *     students see in English. This is a data-driven gate: it reads the real
 *     CSV, not a hand-written list.
 *
 *  2. MEMO CORRECTNESS. `src/lib/localizeMemo.ts` caches translated *strings*
 *     keyed on locale + id + updatedAt + the localizable fields. It must never
 *     leak a per-request value (a match score, a saved flag), must recompute
 *     when the underlying row changes, and must be faster on the second pass.
 *
 *  3. SCORE MEMO. `src/lib/matchMemo.ts` caches fit/chance results keyed on the
 *     profile fingerprint + the entity. Same inputs must give the identical
 *     result, a changed profile fingerprint a different cache entry, and the
 *     routes that score a whole catalogue must actually use it.
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  localizeUniversityRow,
  localizeScholarshipRow,
  localizeMajorOrField,
  localizeDegreeLevel,
  localizeStudyMode,
  localizeProgramLanguage,
  localizeFundingType,
  localizeHighlights,
} from "../src/lib/catalogLocalizer";
import { invalidateLocalizeMemo, localizeMemoStats } from "../src/lib/localizeMemo";
import { invalidateMatchMemo, matchMemoStats, memoizeMatch } from "../src/lib/matchMemo";
import { profileMatchFingerprint } from "../src/lib/profileMatchFingerprint";

const ROOT = join(__dirname, "..");
let passed = 0;
const failures: string[] = [];

function check(name: string, fn: () => void) {
  try {
    fn();
    passed++;
    console.log(`  ✓ ${name}`);
  } catch (err) {
    failures.push(`${name} — ${(err as Error).message}`);
    console.log(`  ✗ ${name} — ${(err as Error).message}`);
  }
}

/** Minimal CSV reader for a single column (the file has quoted commas). */
function csvColumn(file: string, column: string): string[] {
  const text = readFileSync(join(ROOT, "data", file), "utf8").replace(/\r/g, "");
  const lines = text.split("\n").filter(Boolean);
  const parse = (line: string) => {
    const out: string[] = [];
    let cur = "";
    let quoted = false;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (ch === '"') {
        if (quoted && line[i + 1] === '"') {
          cur += '"';
          i++;
        } else quoted = !quoted;
      } else if (ch === "," && !quoted) {
        out.push(cur);
        cur = "";
      } else cur += ch;
    }
    out.push(cur);
    return out;
  };
  const header = parse(lines[0]);
  const idx = header.indexOf(column);
  assert.ok(idx >= 0, `${file} has a ${column} column`);
  return lines
    .slice(1)
    .map((line) => parse(line)[idx] ?? "")
    .filter(Boolean);
}

function untranslated(values: readonly string[], translate: (value: string) => string): string[] {
  return [...new Set(values)].filter((value) => translate(value) === value);
}

console.log("\nPhase 3 — catalogue localization (uz/ru coverage)");

/* --------------------------------------------------------------- 1. coverage */

check("every study field in the programme catalogue has a uz and a ru label", () => {
  const fields = csvColumn("programs_enriched_full.csv", "field");
  assert.ok(fields.length > 1000, `the CSV must actually be read (got ${fields.length} rows)`);
  const uzGaps = untranslated(fields, (v) => localizeMajorOrField(v, "uz"));
  const ruGaps = untranslated(fields, (v) => localizeMajorOrField(v, "ru"));
  assert.deepEqual(uzGaps, [], `uz field gaps: ${uzGaps.join(", ")}`);
  assert.deepEqual(ruGaps, [], `ru field gaps: ${ruGaps.join(", ")}`);
});

check("every degree level in the programme catalogue is localized", () => {
  const levels = [...csvColumn("programs_enriched_full.csv", "degree_level"), ...csvColumn("programs_enriched_full.csv", "degree")];
  const gaps = untranslated(levels, (v) => localizeDegreeLevel(v, "uz"));
  assert.deepEqual(gaps, [], `degree-level gaps: ${gaps.join(", ")}`);
});

check("every study mode and programme language is localized", () => {
  const modeGaps = untranslated(csvColumn("programs_enriched_full.csv", "study_mode"), (v) => localizeStudyMode(v, "uz"));
  assert.deepEqual(modeGaps, [], `study-mode gaps: ${modeGaps.join(", ")}`);
  const langGaps = untranslated(csvColumn("programs_enriched_full.csv", "language"), (v) => localizeProgramLanguage(v, "uz"));
  assert.deepEqual(langGaps, [], `language gaps: ${langGaps.join(", ")}`);
});

check("funding types (admin-entered) are localized, unknown values pass through", () => {
  assert.equal(localizeFundingType("Merit-based", "uz"), "Natijaga asoslangan (merit)");
  assert.equal(localizeFundingType("Need-based", "ru"), "По потребности (need-based)");
  assert.equal(localizeFundingType("Something new", "uz"), "Something new", "an unknown value is never guessed");
  assert.equal(localizeFundingType("", "uz"), "");
  assert.equal(localizeFundingType("Merit-based", "en"), "Merit-based");
});

check("an empty highlight list is not 'translated' into prose", () => {
  assert.equal(localizeHighlights("[]", "uz"), "[]");
});

/* ------------------------------------------------------- 2. memo correctness */

console.log("\nPhase 3 — localization memo");

const uniRow = {
  id: 42,
  name: "Example University",
  country: "Germany",
  city: "Munich",
  universityType: "Public",
  programMajor: "Computer Science",
  description: "Historic university renowned for academic excellence, tutorial system, and world-class AI and machine learning departments.",
  highlights: JSON.stringify(["QS Top 50", "Strong alumni network"]),
  updatedAt: "2026-10-01T00:00:00.000Z",
  matchScore: 71,
};

check("the same row is translated once and served from the memo afterwards", () => {
  invalidateLocalizeMemo();
  const first = localizeUniversityRow(uniRow, "uz");
  const afterFirst = localizeMemoStats();
  assert.equal(afterFirst.misses, 1, "the first call is a miss");
  const second = localizeUniversityRow(uniRow, "uz");
  const afterSecond = localizeMemoStats();
  assert.equal(afterSecond.hits, 1, "the second call is a hit");
  assert.deepEqual(second, first, "the memoized result is identical");
  assert.notEqual(second, first, "…but never the same object reference");
});

check("per-request extras are NOT cached (a different score is preserved)", () => {
  invalidateLocalizeMemo();
  const a = localizeUniversityRow({ ...uniRow, matchScore: 12 }, "uz");
  const b = localizeUniversityRow({ ...uniRow, matchScore: 88 }, "uz");
  assert.equal(a.matchScore, 12);
  assert.equal(b.matchScore, 88, "the match score must never come from the cache");
  assert.equal(a.description, b.description, "the translated description is shared");
  const stats = localizeMemoStats();
  assert.equal(stats.misses, 1, "both shapes share one translation entry");
});

check("a changed row (updatedAt or content) is re-translated", () => {
  invalidateLocalizeMemo();
  localizeUniversityRow(uniRow, "uz");
  localizeUniversityRow({ ...uniRow, updatedAt: "2026-10-27T00:00:00.000Z" }, "uz");
  assert.equal(localizeMemoStats().misses, 2, "updatedAt is part of the key");
  invalidateLocalizeMemo();
  localizeUniversityRow({ ...uniRow, city: "Berlin" }, "uz");
  localizeUniversityRow({ ...uniRow, city: "Munich" }, "uz");
  assert.equal(localizeMemoStats().misses, 2, "the localizable fields are part of the key");
});

check("languages never share an entry; English stays a passthrough", () => {
  invalidateLocalizeMemo();
  const uz = localizeUniversityRow(uniRow, "uz");
  const ru = localizeUniversityRow(uniRow, "ru");
  assert.notEqual(uz.description, ru.description, "uz and ru differ");
  assert.equal(localizeMemoStats().misses, 2, "one entry per language");
  const en = localizeUniversityRow(uniRow, "en");
  assert.equal(en, uniRow, "en returns the exact input reference (byte-identical payloads)");
});

check("scholarship rows keep their canonical title next to the translated one", () => {
  invalidateLocalizeMemo();
  const row = {
    id: 7,
    title: "Fulbright Foreign Student Program",
    provider: "United States Department of State",
    country: "United States",
    coverageType: "Full Tuition + Stipend",
    degreeLevels: JSON.stringify(["Master", "PhD"]),
    eligibleMajors: JSON.stringify(["Any"]),
    description: "Covers full tuition, living stipend, roundtrip airfare, health insurance, and visa support for international graduate students studying in the USA.",
    requirements: "Bachelor's degree, strong leadership record, 3 recommendation letters, essay of intent, and commitment to return to home country.",
    statusLabel: "OPEN",
    fundingType: "Merit-based",
    updatedAt: "2026-10-01T00:00:00.000Z",
    matchScore: 55,
  };
  const localized = localizeScholarshipRow(row, "uz") as typeof row & { officialTitle?: string | null };
  assert.equal(localized.officialTitle, row.title, "the official name stays available");
  assert.notEqual(localized.title, row.title, "the display title is translated");
  assert.equal(localized.fundingType, "Natijaga asoslangan (merit)", "funding type is translated");
  assert.equal(localized.matchScore, 55, "scores pass through untouched");
  assert.match(localized.degreeLevels, /Magistratura/, "degree levels inside the JSON column are translated");
  const second = localizeScholarshipRow({ ...row, matchScore: 90 }, "uz");
  assert.equal(second.matchScore, 90);
  assert.equal(localizeMemoStats().hits, 1, "the second request reuses the translation");
});

check("memoization is actually faster than translating every time", () => {
  const rows = Array.from({ length: 300 }, (_, i) => ({
    ...uniRow,
    id: 10_000 + i,
    city: i % 2 === 0 ? "Munich" : "Berlin",
    description: `Programme description ${i} — a long, pattern-heavy sentence that the translator has to walk.`,
  }));
  invalidateLocalizeMemo();
  const coldStart = process.hrtime.bigint();
  for (const row of rows) localizeUniversityRow(row, "uz");
  const cold = Number(process.hrtime.bigint() - coldStart) / 1e6;
  const warmStart = process.hrtime.bigint();
  for (const row of rows) localizeUniversityRow(row, "uz");
  const warm = Number(process.hrtime.bigint() - warmStart) / 1e6;
  console.log(`    cold ${cold.toFixed(1)} ms → warm ${warm.toFixed(1)} ms (${(cold / Math.max(warm, 0.001)).toFixed(1)}×)`);
  assert.ok(warm < cold, `the memoized pass must be faster (cold ${cold} ms, warm ${warm} ms)`);
});

/* ------------------------------------------------------------ 3. score memo */

console.log("\nPhase 3 — match/chance memo");

const profileA = { id: 1, gpa: 3.8, gpaScale: 4, ieltsScore: 7, targetMajor: "Computer Science", updatedAt: "2026-10-01T00:00:00.000Z" };
const profileB = { ...profileA, ieltsScore: 8, updatedAt: "2026-10-02T00:00:00.000Z" };
const uniEntity = { id: 1, minGpa: 3.5, minIelts: 6.5, worldRanking: 1, annualTuitionUsd: 59750 };

check("a repeated (profile, entity) pair is computed once", () => {
  invalidateMatchMemo();
  let calls = 0;
  const compute = () => {
    calls++;
    return { matchScore: 71, reasons: ["gpa"] };
  };
  const fp = profileMatchFingerprint(profileA);
  const first = memoizeMatch("fit", fp, 1, uniEntity, compute);
  const second = memoizeMatch("fit", fp, 1, uniEntity, compute);
  assert.equal(calls, 1, "the engine ran once");
  assert.deepEqual(first, second);
  assert.equal(matchMemoStats().hitRate, 0.5);
});

check("a changed profile fingerprint or a changed university is a new entry", () => {
  invalidateMatchMemo();
  let calls = 0;
  const compute = () => ({ matchScore: ++calls });
  memoizeMatch("fit", profileMatchFingerprint(profileA), 1, uniEntity, compute);
  memoizeMatch("fit", profileMatchFingerprint(profileB), 1, uniEntity, compute);
  memoizeMatch("fit", profileMatchFingerprint(profileA), 2, uniEntity, compute);
  memoizeMatch("fit", profileMatchFingerprint(profileA), 1, { ...uniEntity, minIelts: 7.5 }, compute);
  assert.equal(calls, 4, "each distinct key recomputes");
  // Editing one score-relevant field must produce a different fingerprint.
  assert.notEqual(profileMatchFingerprint(profileA), profileMatchFingerprint({ ...profileA, ieltsScore: 7.5 }));
});

check("kind separates fit from chance for the same row", () => {
  invalidateMatchMemo();
  let calls = 0;
  const compute = () => ({ value: ++calls });
  const fp = profileMatchFingerprint(profileA);
  memoizeMatch("fit", fp, 1, uniEntity, compute);
  memoizeMatch("chance", fp, 1, uniEntity, compute);
  assert.equal(calls, 2);
});

check("the scoring routes use the memo and admin writes invalidate it", () => {
  const routes = [
    "src/app/api/universities/route.ts",
    "src/app/api/scholarships/route.ts",
    "src/app/api/dashboard/route.ts",
    "src/app/api/chancing/route.ts",
  ];
  for (const file of routes) {
    const source = readFileSync(join(ROOT, file), "utf8");
    assert.ok(source.includes("memoizeMatch("), `${file} must memoize its scores`);
    assert.ok(source.includes("profileMatchFingerprint"), `${file} must key them on the profile fingerprint`);
  }
  const cache = readFileSync(join(ROOT, "src/lib/catalogCache.ts"), "utf8");
  assert.ok(cache.includes("invalidateMatchMemo()"), "an admin catalogue write must clear the score memo");
  assert.ok(cache.includes("invalidateLocalizeMemo()"), "…and the localization memo");
  const activities = readFileSync(join(ROOT, "src/app/api/activities/route.ts"), "utf8");
  assert.ok(activities.includes("invalidateSavedActivities"), "editing the activity portfolio must drop the cached rows");
});

check("activity rows are memoized, not queried per scoring route", () => {
  const mapping = readFileSync(join(ROOT, "src/lib/profileMapping.ts"), "utf8");
  assert.ok(mapping.includes("ACTIVITIES_MEMO_TTL_MS"), "loadSavedActivities must have a TTL");
  assert.match(mapping, /const hit = memo\.get\(profileId\)/, "…and read from the memo first");
});

console.log(`\n${passed} passed, ${failures.length} failed`);
if (failures.length) {
  for (const failure of failures) console.log(`  - ${failure}`);
  process.exit(1);
}
