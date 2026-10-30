/**
 * Phase X gate — a university page in Uzbek or Russian shows Uzbek or Russian,
 * or it shows the source sentence *and says so*.
 *
 * Measured before the fix (2026-10-30, 356 active universities in the live
 * catalogue):
 *
 *   · 194 descriptions are "… is a premier global research university in …"
 *   · 154 are "… is a <public|private> university in …", 46 of them carrying a
 *     funding sentence, 108 without one
 *   · 4 are the "Institution identity seed" note, 4 match no shape
 *
 * The dictionary layer matched none of the two live shapes, so every uz/ru
 * university page printed the raw English paragraph under an Uzbek heading —
 * the same class of defect Phase T fixed for award prose, fixed here on the
 * page instead of the string: the three sentences are read back as structured
 * facts and re-written in the reader's language.
 *
 * The rule is **clean or verbatim**. A segment that cannot be rendered
 * faithfully (a funding headline built from words outside the closed
 * vocabulary) sends the whole description back to its source language, where
 * the page labels it. Never a sentence that is half one language and half the
 * other — the old pattern layer produced exactly that ("stipendiya: MIT
 * Need-Based stipendiya + …"), and those strings are asserted against below.
 *
 * Run: npm run test:university-prose
 */
import assert from "node:assert/strict";
import {
  localizeCity,
  localizeHighlightItem,
  localizeHighlights,
  localizeUniversityDescription,
  localizeUniversityType,
  universityDescriptionState,
} from "../src/lib/catalogLocalizer";
import { localizeUniversityNarrative } from "../src/lib/universityProse";

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

/** The English sentence frames a rendered description must never contain. */
const ENGLISH_FRAMES =
  /\b(is a|Annual tuition|Headline funding|Graduates can stay|post-study work visa|renowned for|premier global research|Listed in the 13-country)\b/;

/** Real rows, copied verbatim from the live catalogue. */
const PREMIER_MIT =
  "Massachusetts Institute of Technology (MIT) is a premier global research university in Cambridge, MA, United States (QS World Ranking #1), renowned for academic excellence, cutting-edge laboratories, and international career outcomes.";
const PLAIN_KOC =
  "Koç University is a private university in Istanbul, Turkey (founded 1993). Annual tuition for international students is about $24000 and estimated living costs are $11000 per year (accommodation about $6000). Headline funding: Koç University International Merit Scholarship & Türkiye Bursları — 25%, 50%, 75%, or 100% Full Tuition Waiver + Dorm. Graduates can stay up to 0.5 year(s) on a post-study work visa. Listed in the 13-country Top-10 guide for applicants from Uzbekistan (Türkiye #3).";
const PLAIN_MACAU =
  "University of Macau is a public university in Macau, Macau SAR. Annual tuition is about $11000 and estimated living costs are $11000 per year. Graduates can stay up to 1 year(s) on a post-study work visa.";
const PLAIN_ARIZONA =
  "The University of Arizona is a public university in Tucson, AZ, United States. Annual tuition is about $37000 and estimated living costs are $16000 per year. Graduates can stay up to 3 year(s) on a post-study work visa.";
/** A funding headline with a word outside the closed vocabulary. */
const PLAIN_UNKNOWN_FUNDING = PLAIN_KOC.replace(
  "Koç University International Merit Scholarship & Türkiye Bursları — 25%, 50%, 75%, or 100% Full Tuition Waiver + Dorm",
  "Some Unheard Programme — Full Ride via an Undocumented Arrangement"
);
const SEED =
  "Institution identity seed. Current programmes, tuition, admissions, and rankings are not source-verified.";

const HIGHLIGHTS = [
  "Scholarship: Koç University International Merit Scholarship & Türkiye Bursları - Full Ride (100% Demonstrated Need: Tuition + Room + Board) [Yes]",
  "QS World University Ranking #1 globally",
  "Located in Cambridge, MA, United States (Founded 1861)",
  "Post-study work visa opportunity: 3 year(s)",
  "Comprehensive undergraduate, master's, and doctoral research programs",
  "Uzbek applicants guide: United States Top-10 #1",
];

/* ------------------------------------------------------------------ shapes */

check("the premier shape renders in uz and ru", () => {
  for (const locale of ["uz", "ru"] as const) {
    const state = universityDescriptionState(PREMIER_MIT, locale);
    assert.equal(state.verbatim, false, `${locale}: premier shape fell back to verbatim`);
    assert.doesNotMatch(state.text, ENGLISH_FRAMES, `${locale}: English frame survived`);
    assert.match(state.text, /Massachusetts Institute of Technology/, "institution name lost");
  }
});

check("the premier shape localizes the city and the country", () => {
  const uz = universityDescriptionState(PREMIER_MIT, "uz").text;
  assert.match(uz, /AQSH/, "country not localized");
  assert.match(uz, /Kembrij/, "city not localized");
  assert.doesNotMatch(uz, /Kembridge/, "the old misspelling is back");
  assert.doesNotMatch(uz, /United States|MA,/, "English place names left in an Uzbek sentence");
});

check("the plain shape with a funding sentence renders", () => {
  for (const locale of ["uz", "ru"] as const) {
    const state = universityDescriptionState(PLAIN_KOC, locale);
    assert.equal(state.verbatim, false, `${locale}: plain shape fell back to verbatim`);
    assert.doesNotMatch(state.text, ENGLISH_FRAMES, `${locale}: English frame survived`);
  }
  assert.match(universityDescriptionState(PLAIN_KOC, "uz").text, /Moliyalashtirish:/);
  assert.match(universityDescriptionState(PLAIN_KOC, "ru").text, /Финансирование:/);
});

check("the plain shape without a funding sentence renders", () => {
  for (const locale of ["uz", "ru"] as const) {
    const state = universityDescriptionState(PLAIN_MACAU, locale);
    assert.equal(state.verbatim, false, `${locale}: funding-less plain shape fell back`);
    assert.doesNotMatch(state.text, ENGLISH_FRAMES, `${locale}: English frame survived`);
    assert.doesNotMatch(state.text, /Headline funding/, "a funding line was invented");
  }
});

check("a US city keeps both of its parts", () => {
  const uz = universityDescriptionState(PLAIN_ARIZONA, "uz").text;
  assert.match(uz, /Tucson, AZ/, "the state code was dropped from the city");
  assert.match(uz, /AQSH/);
  assert.doesNotMatch(uz, /United States/);
});

check("the numbers survive the rewrite", () => {
  const uz = universityDescriptionState(PLAIN_KOC, "uz").text;
  for (const amount of ["$24,000", "$11,000", "$6,000"]) {
    assert.ok(uz.includes(amount), `${amount} missing from the Uzbek sentence`);
  }
  assert.match(uz, /0\.5 yil/, "the post-study window is missing");
});

/* ---------------------------------------------------------- clean/verbatim */

check("an unrenderable funding headline keeps the whole description verbatim", () => {
  for (const locale of ["uz", "ru"] as const) {
    const state = universityDescriptionState(PLAIN_UNKNOWN_FUNDING, locale);
    assert.equal(state.verbatim, true, `${locale}: an unknown funding word was guessed at`);
    assert.equal(state.text, PLAIN_UNKNOWN_FUNDING, `${locale}: the text was altered anyway`);
  }
});

check("verbatim and translated results never mix inside one sentence", () => {
  for (const source of [PREMIER_MIT, PLAIN_KOC, PLAIN_MACAU, PLAIN_ARIZONA]) {
    for (const locale of ["uz", "ru"] as const) {
      const { text, verbatim } = universityDescriptionState(source, locale);
      if (verbatim) {
        assert.equal(text, source);
        continue;
      }
      assert.doesNotMatch(text, ENGLISH_FRAMES, `${locale}: half-translated sentence`);
    }
  }
});

check("a documented seed note still translates from the dictionary", () => {
  const state = universityDescriptionState(SEED, "uz");
  assert.equal(state.verbatim, false);
  assert.doesNotMatch(state.text, /Institution identity seed/);
});

check("English is never labelled as a translation", () => {
  const state = universityDescriptionState(PLAIN_KOC, "en");
  assert.equal(state.text, PLAIN_KOC);
  assert.equal(state.verbatim, false, "the source language needs no label on the English page");
});

check("the description function and the state function agree", () => {
  for (const source of [PREMIER_MIT, PLAIN_KOC, PLAIN_MACAU, SEED]) {
    assert.equal(
      localizeUniversityDescription(source, "uz"),
      universityDescriptionState(source, "uz").text
    );
  }
});

/* --------------------------------------------------------------- highlights */

check("every badge on the MIT row is localized or left in the source language", () => {
  const uz = localizeHighlights(HIGHLIGHTS, "uz") as string[];
  assert.equal(uz.length, HIGHLIGHTS.length);
  assert.equal(uz[0], HIGHLIGHTS[0], "the unknown scholarship badge must stay whole, not be mangled");
  for (const index of [1, 2, 3, 4, 5]) {
    assert.notEqual(uz[index], HIGHLIGHTS[index], `badge ${index} was not localized`);
  }
  assert.match(uz[2], /Kembrij/, "city not localized in the location badge");
  assert.doesNotMatch(uz[2], /Kembridge/);
  assert.match(uz[3], /3 yil/);
  assert.match(uz[5], /AQSH/);
  assert.doesNotMatch(uz.join(" "), /Post-study work visa opportunity|Uzbek applicants guide|Comprehensive undergraduate/);
});

check("a badge that cannot be rendered cleanly is returned untouched", () => {
  const mangled = "Scholarship: MIT Need-Based Aid - Full Ride (100% Demonstrated Need: Tuition + Room + Board) [Yes]";
  assert.equal(localizeHighlightItem(mangled, "uz"), mangled);
  assert.equal(localizeHighlightItem(mangled, "ru"), mangled);
});

check("each badge is translated on its own", () => {
  assert.equal(localizeHighlightItem(HIGHLIGHTS[3], "ru"), "Виза для работы после учёбы: до 3 лет");
  assert.equal(
    localizeHighlightItem(HIGHLIGHTS[4], "uz"),
    "Bakalavriat, magistratura va doktorantura bo'yicha keng qamrovli ilmiy dasturlar"
  );
});

/* -------------------------------------------------------------- vocabulary */

check("the university type column and the description agree on case", () => {
  assert.equal(localizeUniversityType("public", "uz"), localizeUniversityType("Public", "uz"));
  assert.equal(localizeUniversityType("private", "uz"), localizeUniversityType("Private", "uz"));
  assert.notEqual(localizeUniversityType("public", "uz"), "public");
  assert.notEqual(localizeUniversityType("private", "ru"), "private");
});

check("the city dictionary spells Cambridge correctly", () => {
  assert.equal(localizeCity("Cambridge", "uz"), "Kembrij");
  assert.doesNotMatch(localizeCity("Cambridge", "uz"), /Kembridge/);
});

check("an unknown narrative is returned untouched", () => {
  const odd = "A sentence no template knows, kept as written.";
  for (const locale of ["uz", "ru"] as const) {
    const result = localizeUniversityNarrative(odd, locale);
    assert.equal(result.verbatim, true);
    assert.equal(result.text, odd);
  }
});

console.log(`\n${passed} passed, ${failures.length} failed`);
if (failures.length > 0) {
  for (const failure of failures) console.error(`  · ${failure}`);
  process.exit(1);
}
