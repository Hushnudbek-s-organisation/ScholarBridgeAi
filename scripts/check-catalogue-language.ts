/**
 * Phase T gate — no English catalogue text reaches a uz/ru page unlabelled.
 *
 * Three claims are asserted against REAL data, not a hand-written list:
 *
 *  1. FIELDS. Every one of the 67 distinct `programs.field` values that exist
 *     in the live Supabase catalogue must come out fully translated in uz and
 *     ru. No hybrid ("Life fanlari", "Applied matematika") is allowed: the
 *     localizer falls back to the original label instead, and that fallback is
 *     exactly what this check fails on.
 *
 *  2. PROGRAMME NAMES. 158 real titles (146 from the live catalogue, 12 built
 *     from degree tokens the catalogue will plausibly receive) must be either
 *     fully localized OR returned byte-identical. A name that is HALF
 *     translated is the bug this phase exists to remove. At least 90% must be
 *     fully localized, so the gate cannot pass by giving up on everything.
 *
 *  3. PROSE. Description / requirements / tuition coverage / English
 *     requirement text that cannot be translated deterministically must carry
 *     the "source language" label; text that IS translated (test scores, the
 *     common coverage phrasings) must NOT carry it.
 *
 * Run: npm run test:catalogue-language
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  isEnglishProse,
  isUntranslatedLabel,
  localizeEnglishRequirement,
  localizeFundingType,
  localizeMajorOrField,
  localizeProgramName,
  localizeTuitionCoverage,
  needsSourceLanguageLabel,
} from "../src/lib/catalogLocalizer";

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

interface VocabFixture {
  fields: string[];
  programNames: string[];
  syntheticShapeSamples: string[];
}

const vocab: VocabFixture = JSON.parse(
  readFileSync(join(ROOT, "scripts", "fixtures", "live-catalogue-vocab.json"), "utf8")
);

/** English function words — present in a half-translated label, absent from
 *  Uzbek and Russian. */
const ENGLISH_CONNECTORS = /\b(?:the|of|and|in|for|with|from|taught)\b/i;

console.log("\nPhase T — catalogue language (uz/ru)");

/* ------------------------------------------------------------------ 1. fields */

check("the fixture really covers every live `programs.field` value", () => {
  assert.ok(vocab.fields.length >= 60, `expected ≥60 fields, got ${vocab.fields.length}`);
  assert.ok(
    vocab.fields.includes("Multidisciplinary") && vocab.fields.includes("Computer Science & IT"),
    "the fixture must contain the awkward values the gate exists for"
  );
});

check("every live study field is translated in uz and ru", () => {
  const gaps: string[] = [];
  for (const field of vocab.fields) {
    for (const locale of ["uz", "ru"] as const) {
      const out = localizeMajorOrField(field, locale);
      if (out.trim() === field.trim() || isUntranslatedLabel(field, locale)) {
        gaps.push(`${field} [${locale}]`);
      }
    }
  }
  assert.deepEqual(gaps, [], `untranslated fields: ${gaps.join(", ")}`);
});

check("no field is half-translated (the hybrid bug)", () => {
  const hybrids: string[] = [];
  for (const field of vocab.fields) {
    const out = localizeMajorOrField(field, "uz");
    if (ENGLISH_CONNECTORS.test(out)) hybrids.push(`${field} → ${out}`);
  }
  assert.deepEqual(hybrids, [], `hybrids: ${hybrids.join("; ")}`);
});

check("compound fields join with a local connective, not '&'", () => {
  assert.equal(localizeMajorOrField("Business & Management", "uz"), "Biznes va menejment");
  assert.equal(localizeMajorOrField("Business & Management", "ru"), "Бизнес и менеджмент");
  assert.equal(localizeMajorOrField("Computer Science & IT", "uz"), "Kompyuter fanlari va AT");
});

/* ------------------------------------------------------------------- 2. names */

const ALL_NAMES = [...vocab.programNames, ...vocab.syntheticShapeSamples];

check("the name fixture covers every degree shape the catalogue uses", () => {
  assert.ok(ALL_NAMES.length >= 150, `expected ≥150 names, got ${ALL_NAMES.length}`);
  for (const token of ["LLB", "JD", "MB BChir", "Master of", "BSc", "MBA"]) {
    assert.ok(
      ALL_NAMES.some((name) => name.startsWith(token)),
      `${token} must be represented in the fixture`
    );
  }
});

/**
 * Institution names are proper nouns and stay verbatim by design ("Ross School
 * of Business"), so the hybrid test looks only at the part we translated.
 */
function withoutProperNames(value: string): string {
  return value.replace(/\s*—\s.*$/, "").replace(/\s*\([^()]*\)/g, "");
}

check("programme names are either fully localized or left verbatim — never hybrid", () => {
  const hybrids: string[] = [];
  for (const name of ALL_NAMES) {
    for (const locale of ["uz", "ru"] as const) {
      const out = localizeProgramName(name, locale);
      if (out === name) continue; // verbatim is allowed, hybrids are not
      if (ENGLISH_CONNECTORS.test(withoutProperNames(out))) {
        hybrids.push(`${name} [${locale}] → ${out}`);
      }
    }
  }
  assert.deepEqual(hybrids, [], `hybrids: ${hybrids.join("; ")}`);
});

check("at least 90% of the real programme titles are fully localized", () => {
  const verbatim = vocab.programNames.filter((name) => localizeProgramName(name, "uz") === name);
  const translated = vocab.programNames.length - verbatim.length;
  assert.ok(
    translated / vocab.programNames.length >= 0.9,
    `${translated}/${vocab.programNames.length} localized; still verbatim: ${verbatim.join(", ")}`
  );
});

check("degree tokens carry their acronym into the localized title", () => {
  const cases: Array<[string, string]> = [
    ["BSc in Marine Biology", "Dengiz biologiyasi bo'yicha bakalavr (BSc)"],
    ["MSc in Finance", "Moliya bo'yicha magistr (MSc)"],
    ["LLB Law", "Huquq bakalavri (LLB)"],
    ["PhD in Chemistry", "Kimyo bo'yicha doktorantura (PhD)"],
    ["MB BChir Medicine", "Tibbiyot va jarrohlik bakalavri (MB BChir)"],
  ];
  for (const [name, expected] of cases) {
    assert.equal(localizeProgramName(name, "uz"), expected, name);
  }
});

check("(Hons) and (English-taught) are localized, not copied through", () => {
  const hons = localizeProgramName("LLB (Hons) Scots and English Law", "uz");
  assert.ok(hons.includes("imtiyozli"), `honours marker missing: ${hons}`);
  const taught = localizeProgramName("MSc in Mathematics (English-taught)", "uz");
  assert.ok(taught.includes("ingliz tilida"), `taught language missing: ${taught}`);
  assert.ok(!/English-taught/.test(taught), `the English marker leaked: ${taught}`);
});

check("institution names in parentheses stay verbatim (proper nouns)", () => {
  assert.equal(
    localizeProgramName("MBA (Edinburgh Business School)", "uz"),
    "Biznes boshqaruvi magistri (MBA) — Edinburgh Business School"
  );
});

check("a foreign-language title that is also a field is never made into a degree", () => {
  // "Ingeniería Civil" is the Spanish name of a programme. The Spanish
  // `Ingeniería → BEng` token used to match first and produced
  // "Qurilish bo'yicha muhandislik bakalavri (BEng)" — a bachelor's degree the
  // catalogue never promised, invented from a title.
  const civil = localizeProgramName("Ingeniería Civil", "uz");
  assert.equal(civil, "Qurilish muhandisligi");
  assert.ok(!/bakalavr|BEng|magistr/i.test(civil), `a degree was invented: ${civil}`);
  // The same rule keeps the original name when the bracket is the translation.
  assert.equal(localizeProgramName("Abogacía (Law)", "uz"), "Huquqshunoslik");
  assert.equal(localizeProgramName("Medicina (Medicine)", "uz"), "Tibbiyot");
});

check("`en` returns every title and field byte-identical", () => {
  for (const name of ALL_NAMES) assert.equal(localizeProgramName(name, "en"), name);
  for (const field of vocab.fields) assert.equal(localizeMajorOrField(field, "en"), field);
});

/* ------------------------------------------------------------------ 3. prose */

const LIVE_PROSE = [
  "No scholarship-specific English score is published; applicants must meet the host university's English language requirement for admission to the chosen programme.",
  "English requirements are those of the chosen Swedish master programme (via University Admissions); the Swedish Institute publishes no separate IELTS cutoff for this scholarship.",
  "Full tuition for the duration of the master programme, and no separate stipend is paid to the holder.",
  "Each award offers a tuition fee waiver, a stipend for three years, and a travel allowance for the first visit.",
];

check("untranslatable catalogue prose asks for the source-language label", () => {
  for (const text of LIVE_PROSE) {
    assert.ok(isEnglishProse(text), `not detected as prose: ${text.slice(0, 60)}…`);
    assert.ok(
      needsSourceLanguageLabel(text, text, "uz"),
      `no label requested for: ${text.slice(0, 60)}…`
    );
  }
});

check("a short English value without function words is labelled too", () => {
  // Five words, no "the/of/and": the sentence detector alone missed this, and
  // an unlabelled English phrase on an Uzbek page is the exact bug this phase
  // exists to close.
  const short = ["Merit-based tuition waiver", "Need-based aid and fee exemption", "Tuition fee reduction for international students"];
  for (const text of short) {
    assert.ok(isEnglishProse(text), `not detected: ${text}`);
    assert.ok(needsSourceLanguageLabel(text, text, "uz"), `no label requested: ${text}`);
  }
  // …and the dictionary values it must not start labelling.
  for (const text of ["To'liq kontrakt", "Kontraktsiz nemis davlat universiteti", "Tibbiyot", "Fizika (ENS)"]) {
    assert.ok(!isEnglishProse(text), `false positive: ${text}`);
  }
});

check("translated copy and test scores are never labelled", () => {
  const translated = [
    "IELTS 6.5 yoki unga teng ingliz tili imtihoni",
    "Moliya bo'yicha magistr (MSc)",
    "Bakalavriat dasturi, ingliz tilida",
  ];
  for (const text of translated) assert.ok(!isEnglishProse(text), text);
  assert.ok(!needsSourceLanguageLabel("IELTS 6.5 / TOEFL 94 / DET 120", "IELTS 6.5 / TOEFL 94 / DET 120", "uz"));
  assert.ok(!needsSourceLanguageLabel("prose", "prose", "en"), "en never needs a label");
});

check("the common English-requirement shapes are translated, not labelled", () => {
  assert.equal(
    localizeEnglishRequirement("IELTS 6.5 or equivalent English test", "uz"),
    "IELTS 6.5 yoki unga teng ingliz tili imtihoni"
  );
  assert.equal(
    localizeEnglishRequirement("IELTS 6.5 or equivalent English test", "ru"),
    "IELTS 6.5 или эквивалентный экзамен по английскому"
  );
});

check("the common tuition-coverage shapes are translated", () => {
  assert.equal(localizeTuitionCoverage("Full tuition", "uz"), "To'liq kontrakt");
  assert.equal(localizeTuitionCoverage("Partial tuition (fee discount)", "uz"), "Qisman kontrakt (chegirma)");
  assert.equal(localizeTuitionCoverage("100% Tuition Fee Waiver", "ru"), "100% освобождение от оплаты");
  assert.equal(
    localizeTuitionCoverage("50% of the tuition fee", "uz"),
    "Kontraktning 50% qismi qoplanadi"
  );
});

check("free prose passes through untouched so the page can label it", () => {
  const prose =
    "No tuition is charged at all - Berlin state law prohibits tuition fees for all students, so the award adds a monthly stipend on top.";
  assert.equal(localizeTuitionCoverage(prose, "uz"), prose);
  assert.ok(needsSourceLanguageLabel(prose, localizeTuitionCoverage(prose, "uz"), "uz"));
});

check("short funding types are localized; unknown prose is never guessed", () => {
  assert.equal(localizeFundingType("Fully Funded", "uz"), "To'liq moliyalashtirilgan");
  assert.equal(localizeFundingType("Merit-based tuition waiver", "ru"), "Освобождение от оплаты по заслугам");
  const prose =
    "Hungarian government scholarship coordinated by Tempus Public Foundation, with tuition and accommodation support and a monthly stipend for holders";
  assert.equal(localizeFundingType(prose, "uz"), prose, "unknown values are returned verbatim");
  assert.ok(isEnglishProse(prose), "the caller must be able to recognise it as prose");
});

/* ------------------------------------------------------------------ summary */

console.log(`\n${passed} passed, ${failures.length} failed`);
if (failures.length > 0) {
  console.error("\nFAILURES:");
  for (const failure of failures) console.error(`  · ${failure}`);
  process.exit(1);
}
