/**
 * Phase AA gate — the catalogue cards state the same facts as the profile page.
 *
 * Phase Y corrected the QS figure on `/universities/[id]` and on the detail API.
 * The hub's card list is a different endpoint: `GET /api/universities` localizes
 * every row through `localizeUniversityRow`, which passed neither the verified
 * rank nor anything else downstream — measured 2026-10-30 with the real
 * University of Latvia row (prose #200, QS 2026 position 801):
 *
 *   en      description still said "#200", chip still said "#200"
 *   uz/ru   description said "200-o'rin" / "200-е место" from the stale text,
 *           chip said "#200" / "№200"
 *
 * so a student could read #801 on the profile and #200 on the card that led
 * there. The same cards also render description and badges as-is, so the 10
 * descriptions (and the badges) that cannot be translated stayed English with
 * no label — the rule Phase T, X and Z established everywhere else.
 *
 * Asserted below: the rank reaches the card in all three languages, English
 * rows whose prose already agrees are returned unchanged (same reference), the
 * memo cannot serve a translation computed for an older rank, and the two
 * "source language" flags are produced for exactly the rows that need them.
 *
 * Run: npm run test:university-list
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { invalidateLocalizeMemo } from "../src/lib/localizeMemo";
import { localizeUniversityRow } from "../src/lib/catalogLocalizer";

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

/* ------------------------------------------------------- live rows */

/** University of Latvia (id 200): prose #200, verified QS position 801. */
function latvia(overrides: Record<string, unknown> = {}) {
  return {
    id: 200,
    name: "University of Latvia",
    country: "Latvia",
    city: "Riga",
    universityType: "Public Research University",
    worldRanking: 801,
    qsRankYear: 2026,
    description:
      "University of Latvia is a premier global research university in Riga, Latvia (QS World Ranking #200), renowned for academic excellence, cutting-edge laboratories, and international career outcomes.",
    highlights: JSON.stringify([
      "QS World University Ranking #200 globally",
      "Located in Riga, Latvia (Founded 1919)",
      "Comprehensive undergraduate, master's, and doctoral research programs",
    ]),
    ...overrides,
  };
}

/** MIT (id 1): prose #1, verified QS position 1 — nothing to reconcile. */
function mit(overrides: Record<string, unknown> = {}) {
  return {
    id: 1,
    name: "Massachusetts Institute of Technology (MIT)",
    country: "United States",
    city: "Cambridge",
    worldRanking: 1,
    description:
      "Massachusetts Institute of Technology (MIT) is a premier global research university in Cambridge, MA, United States (QS World Ranking #1), renowned for academic excellence, cutting-edge laboratories, and international career outcomes.",
    highlights: JSON.stringify([
      "QS World University Ranking #1 globally",
      "Located in Cambridge, MA, United States (Founded 1861)",
    ]),
    ...overrides,
  };
}

/** WIUT (id 214): a hand-written description no template can render. */
function wiut(overrides: Record<string, unknown> = {}) {
  return {
    id: 214,
    name: "Westminster International University in Tashkent (WIUT)",
    country: "Uzbekistan",
    city: "Tashkent",
    worldRanking: null,
    description:
      "Westminster International University in Tashkent (WIUT) is Uzbekistan's first Western-style university, founded in 2002, and awards British degrees validated by the University of Westminster (UK). All teaching is in English.",
    highlights: JSON.stringify(["Located in Tashkent, Uzbekistan (Founded 2002)"]),
    ...overrides,
  };
}

function row(value: unknown, locale: "en" | "uz" | "ru") {
  return localizeUniversityRow(value as never, locale) as unknown as Record<string, unknown> & {
    description?: string;
    highlights?: string;
  };
}

function chips(value: { highlights?: string }): string[] {
  return JSON.parse(value.highlights ?? "[]") as string[];
}

/* ---------------------------------------------------- rank reaches the card */

check("the card states the verified rank in all three languages", () => {
  for (const locale of ["en", "uz", "ru"] as const) {
    const out = row(latvia(), locale);
    assert.doesNotMatch(chips(out)[0], /#200\b/, `${locale}: the chip kept the stale number`);
    assert.match(chips(out)[0], /801/, `${locale}: the chip lost the verified number`);
    assert.match(out.description ?? "", /801/, `${locale}: the description lost the verified number`);
    assert.doesNotMatch(out.description ?? "", /#200\b/, `${locale}: the description kept the stale number`);
  }
});

check("the English card is corrected too", () => {
  const out = row(latvia(), "en");
  assert.match(out.description ?? "", /QS World Ranking #801/);
  assert.equal(chips(out)[0], "QS World University Ranking #801 globally");
});

check("a row whose prose already agrees keeps its text", () => {
  const out = row(mit(), "en");
  assert.equal(out.description, mit().description);
  assert.equal(out.highlights, mit().highlights);
});

check("an agreeing English row is returned as the same object", () => {
  const source = mit();
  assert.equal(localizeUniversityRow(source as never, "en"), source);
});

check("a changed English row is a new object, the input is untouched", () => {
  const source = latvia();
  const out = row(source, "en");
  assert.notEqual(out, source);
  assert.match(source.description, /#200/, "the stored row was mutated");
  assert.match(out.description ?? "", /#801/);
});

check("a row with no verified rank keeps its prose", () => {
  const source = wiut();
  const out = row(source, "en");
  assert.equal(out.description, source.description);
  assert.equal(out.highlights, source.highlights);
});

/* ----------------------------------------------------------- the memo */

check("a corrected rank is never served from the memo of the old one", () => {
  invalidateLocalizeMemo();
  const before = row(latvia(), "uz");
  assert.match(chips(before)[0], /801/);
  // The catalogue changes the rank under the same id and text.
  const after = row(latvia({ worldRanking: 776 }), "uz");
  assert.match(chips(after)[0], /776/, "the memo returned a translation built for another rank");
  assert.doesNotMatch(chips(after)[0], /801/);
});

/* ------------------------------------------------------ source-language flags */

check("an untranslatable description is flagged on uz and ru", () => {
  assert.equal(row(wiut(), "uz").descriptionSourceLanguage, "en");
  assert.equal(row(wiut(), "ru").descriptionSourceLanguage, "en");
});

check("a translated description is not flagged", () => {
  assert.equal(row(mit(), "uz").descriptionSourceLanguage, null);
  assert.equal(row(latvia(), "ru").descriptionSourceLanguage, null);
});

check("badges that cannot be translated are flagged; translated ones are not", () => {
  const untranslatable = mit({
    highlights: JSON.stringify([
      "Scholarship: MIT Need-Based Scholarship + El-Yurt Umidi (Need-based (Need-Blind)) - Full Ride (100% Demonstrated Need: Tuition + Room + Board) [Yes]",
      "QS World University Ranking #1 globally",
    ]),
  });
  assert.equal(row(untranslatable, "uz").highlightsSourceLanguage, "en");
  assert.equal(row(untranslatable, "ru").highlightsSourceLanguage, "en");
  assert.equal(row(mit(), "uz").highlightsSourceLanguage, null);
  assert.equal(row(latvia(), "ru").highlightsSourceLanguage, null);
});

check("the English card carries no flags", () => {
  assert.equal(row(wiut(), "en").descriptionSourceLanguage, undefined);
  assert.equal(row(wiut(), "en").highlightsSourceLanguage, undefined);
});

/* ---------------------------------------------------------------- wiring */

check("the card list localizes the whole row, rank included", () => {
  const route = readFileSync(join(ROOT, "src/app/api/universities/route.ts"), "utf8");
  assert.match(route, /payload\.universities = rows\.map\(\(u\) => localizeUniversityRow\(u, locale\)\)/);
  const localizer = readFileSync(join(ROOT, "src/lib/catalogLocalizer.ts"), "utf8");
  assert.match(localizer, /localizeUniversityDescription\(uni\.description, locale, rank\)/);
  assert.match(localizer, /localizeHighlights\(uni\.highlights, locale, rank\)/);
});

check("the memo signature knows the rank is an input", () => {
  const localizer = readFileSync(join(ROOT, "src/lib/catalogLocalizer.ts"), "utf8");
  const list = /const UNIVERSITY_LOCALIZED_FIELDS = \[([\s\S]*?)\] as const;/.exec(localizer);
  assert.ok(list, "the memo field list is gone");
  assert.match(list[1], /"worldRanking"/, "a corrected rank would keep serving a stale translation");
});

check("the hub card renders both labels", () => {
  const source = readFileSync(join(ROOT, "src/components/UniversityExplorer.tsx"), "utf8");
  assert.match(source, /uni\.descriptionSourceLanguage === "en"/);
  assert.match(source, /uni\.highlightsSourceLanguage === "en"/);
  assert.match(source, /t\("sourceLanguageLabel"\)/);
  assert.match(source, /lang=\{uni\.descriptionSourceLanguage === "en" \? "en" : undefined\}/);
});

check("the hub card's label is the same phrase as everywhere else", () => {
  for (const locale of ["en", "uz", "ru"] as const) {
    const data = JSON.parse(readFileSync(join(ROOT, `src/i18n/messages/${locale}.json`), "utf8")) as {
      university: Record<string, string>;
      universityDetail: Record<string, string>;
    };
    assert.equal(data.university.sourceLanguageLabel, data.universityDetail.sourceLanguageLabel, locale);
  }
});

console.log(`\n${passed} passed, ${failures.length} failed`);
if (failures.length > 0) {
  for (const failure of failures) console.error(`  · ${failure}`);
  process.exit(1);
}
