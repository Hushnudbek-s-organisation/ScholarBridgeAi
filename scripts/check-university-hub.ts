/**
 * Phase Z gate — the hub's university view tells the truth about what it shows.
 *
 * `UniversityExplorer` opens `UniversityDetail` when a card is clicked, on the
 * public hub. Two things on that panel were not true:
 *
 *  1. EDITION. The ranking badge read "QS World Ranking **2027**" — a hardcoded
 *     year in all three message files, while every stored rank is the 2026
 *     edition (`universities.qs_rank_year = 2026`, `university_rankings` rows
 *     for 2026) and the profile page says "Ranking edition: 2026". The year now
 *     comes from the row, and the copy no longer carries one.
 *
 *  2. SOURCE LANGUAGE. The About paragraph renders `uni.description` as the API
 *     returns it. The API translates for uz/ru, but 10 of the 356 descriptions
 *     cannot be rendered faithfully (the four hand-written ones — WIUT, IUT,
 *     NewUU, CTU — match no template, and six carry a funding headline outside
 *     the vocabulary). Those stayed English with no label, which is exactly what
 *     Phase T and Phase X forbid elsewhere. The API now reports
 *     `descriptionSourceLanguage` and the panel labels the paragraph.
 *
 * Run: npm run test:university-hub
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { localizeDetailPayload } from "../src/lib/catalogLocalizer";

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

/** Source without comments — a comment may quote a year without shipping it. */
function stripComments(source: string): string {
  return source.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");
}

function messages(locale: "en" | "uz" | "ru") {
  return JSON.parse(readFileSync(join(ROOT, `src/i18n/messages/${locale}.json`), "utf8")) as {
    university: Record<string, string>;
    universityDetail: Record<string, string>;
  };
}

/** The four hand-written descriptions match no template (live rows, verbatim). */
const WIUT =
  "Westminster International University in Tashkent (WIUT) is Uzbekistan's first Western-style university, founded in 2002, and awards British degrees validated by the University of Westminster (UK). All teaching is in English.";
const MIT =
  "Massachusetts Institute of Technology (MIT) is a premier global research university in Cambridge, MA, United States (QS World Ranking #1), renowned for academic excellence, cutting-edge laboratories, and international career outcomes.";

function payload(description: string | null) {
  return {
    university: {
      id: 1,
      name: "Example University",
      country: "United States",
      city: "Cambridge",
      description,
      worldRanking: 1,
      qsRankYear: 2026,
    },
    money: {},
    programs: [],
    applicationCycles: [],
    scholarships: [],
  };
}

function flagFor(description: string | null, locale: "en" | "uz" | "ru") {
  const out = localizeDetailPayload(payload(description), locale);
  return (out.university as { descriptionSourceLanguage?: "en" | null }).descriptionSourceLanguage;
}

/* ------------------------------------------- 1. the source-language label */

check("an untranslatable description is reported as English on uz and ru", () => {
  assert.equal(flagFor(WIUT, "uz"), "en");
  assert.equal(flagFor(WIUT, "ru"), "en");
});

check("a translated description carries no label", () => {
  assert.equal(flagFor(MIT, "uz"), null);
  assert.equal(flagFor(MIT, "ru"), null);
});

check("the English page never labels English as a translation", () => {
  assert.equal(flagFor(WIUT, "en"), undefined);
  assert.equal(flagFor(MIT, "en"), undefined);
});

check("a missing description is not labelled", () => {
  assert.equal(flagFor(null, "uz"), null);
  assert.equal(flagFor("", "uz"), null);
  assert.equal(flagFor("   ", "uz"), null);
});

check("the label wording matches the profile page exactly", () => {
  for (const locale of ["en", "uz", "ru"] as const) {
    const hub = messages(locale).university.sourceLanguageLabel;
    const profile = messages(locale).universityDetail.sourceLanguageLabel;
    assert.ok(hub, `${locale}: university.sourceLanguageLabel is missing`);
    assert.equal(hub, profile, `${locale}: the two surfaces word the label differently`);
  }
});

/* ------------------------------------------------------ 2. the edition */

check("the ranking label carries no year of its own", () => {
  for (const locale of ["en", "uz", "ru"] as const) {
    const label = messages(locale).university.qsRanking;
    assert.ok(label, `${locale}: university.qsRanking is missing`);
    assert.doesNotMatch(label, /\d{4}/, `${locale}: the label still hardcodes an edition`);
    assert.match(label, /QS|QS-/, `${locale}: the label no longer names the ranking`);
  }
});

check("the edition is shown from the row, not from the copy", () => {
  const source = stripComments(readFileSync(join(ROOT, "src/components/UniversityDetail.tsx"), "utf8"));
  assert.match(source, /uni\.qsRankYear/, "the panel does not read the stored edition");
  assert.doesNotMatch(source, /\b20\d{2}\b/, "a year is hardcoded in the panel");
});

/* ------------------------------------------------------ 3. the wiring */

check("the panel renders the label and marks the language", () => {
  const source = readFileSync(join(ROOT, "src/components/UniversityDetail.tsx"), "utf8");
  assert.match(source, /t\("sourceLanguageLabel"\)/);
  assert.match(source, /uni\.descriptionSourceLanguage === "en"/);
  assert.match(source, /lang=\{uni\.descriptionSourceLanguage === "en" \? "en" : undefined\}/);
});

check("the panel's data shape knows both new fields", () => {
  const source = readFileSync(join(ROOT, "src/components/UniversityDetail.tsx"), "utf8");
  assert.match(source, /qsRankYear\?: number \| null;/);
  assert.match(source, /descriptionSourceLanguage\?: "en" \| null;/);
});

check("the detail API ships the whole row, so the edition reaches the panel", () => {
  const route = readFileSync(join(ROOT, "src/app/api/universities/[id]/route.ts"), "utf8");
  assert.match(route, /const university = \{ \.\.\.uni, \.\.\.resolvedUsdUniversityCosts\(uni\) \}/);
});

check("the API attaches the flag through the same localizer the profile uses", () => {
  const localizer = readFileSync(join(ROOT, "src/lib/catalogLocalizer.ts"), "utf8");
  assert.match(localizer, /descriptionSourceLanguage/, "localizeDetailPayload does not report the language");
  assert.match(
    localizer,
    /universityDescriptionState\(rawUniversity\.description, locale\)\.verbatim/,
    "the flag is not derived from the same rule the profile page applies"
  );
});

console.log(`\n${passed} passed, ${failures.length} failed`);
if (failures.length > 0) {
  for (const failure of failures) console.error(`  · ${failure}`);
  process.exit(1);
}
