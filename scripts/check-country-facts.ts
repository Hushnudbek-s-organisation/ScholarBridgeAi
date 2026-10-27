/**
 * check-country-facts.ts — the student-visa fact sheet must stay trustworthy.
 *
 * A wrong proof-of-funds figure gets a visa refused and a wrong embassy address
 * wastes a trip to Tashkent, so this gate is deliberately strict:
 *
 *   1. shape      — all three languages on every note, valid ISO codes, unique
 *                   countries, the fifteen destinations the catalogue covers
 *   2. arithmetic — every USD mirror equals amount × the SAME reference rate the
 *                   rest of the app uses (no second opinion about the euro)
 *   3. sourcing   — every published number has a source name, an https source
 *                   URL and a verification date that is not in the future
 *   4. freshness  — a figure verified more than 400 days ago fails: these
 *                   amounts change every year and a stale number is a trap
 *   5. honesty    — no year-long amount without a period, a `null` amount can
 *                   never carry a USD value, and an unranked/unknown verdict is
 *                   never silently promoted to "direct entry"
 *   6. plumbing   — the API attaches the facts to the comparison payload and the
 *                   panel renders them, so the data is actually reachable
 *
 * Run: npm run test:country-facts
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  COUNTRY_FACTS,
  FACTS_RATE_TO_USD,
  countryFactsFor,
  localizeCountryFacts,
  type CountryFacts,
} from "../src/lib/countryFacts";
import { CURRENCY_RATES_TO_USD } from "../src/lib/countryCostBenchmarks";

const root = join(__dirname, "..");
const read = (path: string) => readFileSync(join(root, path), "utf8");
const TODAY = new Date("2026-10-28T00:00:00Z");
const MAX_AGE_DAYS = 400;

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

const EXPECTED_COUNTRIES = [
  "United States",
  "United Kingdom",
  "Germany",
  "Canada",
  "Australia",
  "South Korea",
  "Japan",
  "Netherlands",
  "China",
  "Turkey",
  "Poland",
  "Hungary",
  "Malaysia",
  "Switzerland",
  "Italy",
];

const notesOf = (facts: CountryFacts) =>
  [
    facts.proofOfFunds.note,
    facts.partTimeWorkNote,
    facts.postStudyWorkNote,
    facts.elevenYearNote,
  ].filter((note): note is NonNullable<typeof note> => note != null);

console.log("\nPhase 4 — student-visa fact sheet");

check("the fifteen destination countries are all covered", () => {
  assert.equal(COUNTRY_FACTS.length, 15, `expected 15 countries, found ${COUNTRY_FACTS.length}`);
  const names = COUNTRY_FACTS.map((facts) => facts.country);
  for (const country of EXPECTED_COUNTRIES) {
    assert.ok(names.includes(country), `${country} is missing from the fact sheet`);
  }
  assert.equal(new Set(names).size, names.length, "a country appears twice");
  assert.equal(new Set(COUNTRY_FACTS.map((f) => f.iso2)).size, 15, "duplicate ISO code");
});

check("every note is written in all three languages", () => {
  for (const facts of COUNTRY_FACTS) {
    for (const note of notesOf(facts)) {
      for (const locale of ["en", "uz", "ru"] as const) {
        assert.ok(
          (note[locale] ?? "").trim().length > 20,
          `${facts.country}: ${locale} note is missing or too short`,
        );
      }
      // The three languages must actually differ — an English paragraph pasted
      // into the uz/ru slots is not a translation.
      assert.notEqual(note.uz, note.en, `${facts.country}: uz note repeats the English text`);
      assert.notEqual(note.ru, note.en, `${facts.country}: ru note repeats the English text`);
    }
  }
});

check("USD mirrors use the app's own reference rates", () => {
  for (const [currency, rate] of Object.entries(FACTS_RATE_TO_USD)) {
    const shared = CURRENCY_RATES_TO_USD[currency];
    assert.ok(shared, `${currency} has no entry in CURRENCY_RATES_TO_USD`);
    assert.equal(rate, shared.rateToUsd, `${currency} rate drifted from the shared table`);
  }
  for (const facts of COUNTRY_FACTS) {
    const { amount, currency, usd } = facts.proofOfFunds;
    if (amount == null) {
      assert.equal(usd, null, `${facts.country}: no amount must mean no USD mirror`);
      continue;
    }
    const rate = FACTS_RATE_TO_USD[currency];
    assert.ok(rate, `${facts.country}: unknown currency ${currency}`);
    assert.equal(usd, Math.round(amount * rate), `${facts.country}: USD mirror is not amount × rate`);
  }
});

check("every published figure is sourced and dated", () => {
  for (const facts of COUNTRY_FACTS) {
    assert.ok(facts.sourceName.trim().length > 5, `${facts.country}: source name is missing`);
    assert.match(facts.sourceUrl, /^https:\/\//, `${facts.country}: source URL must be https`);
    assert.match(facts.lastVerifiedAt, /^\d{4}-\d{2}-\d{2}$/, `${facts.country}: bad verification date`);
    const verified = new Date(`${facts.lastVerifiedAt}T00:00:00Z`);
    assert.ok(verified <= TODAY, `${facts.country}: verification date is in the future`);
    if (facts.asOf) {
      assert.match(facts.asOf, /^\d{4}-\d{2}-\d{2}$/, `${facts.country}: bad asOf date`);
    }
    if (facts.recognitionUrl) {
      assert.match(facts.recognitionUrl, /^https:\/\//, `${facts.country}: recognition URL must be https`);
    }
  }
});

check("no figure is older than 400 days", () => {
  for (const facts of COUNTRY_FACTS) {
    const ageDays = Math.round((TODAY.getTime() - new Date(`${facts.lastVerifiedAt}T00:00:00Z`).getTime()) / 86_400_000);
    assert.ok(
      ageDays <= MAX_AGE_DAYS,
      `${facts.country}: last verified ${ageDays} days ago — re-read the source before students rely on it`,
    );
  }
});

check("an amount always carries the period it covers", () => {
  for (const facts of COUNTRY_FACTS) {
    const { amount, period, localText } = facts.proofOfFunds;
    assert.ok(["year", "first-year", "per-month"].includes(period), `${facts.country}: bad period`);
    assert.ok(localText.trim().length > 5, `${facts.country}: no human-readable amount`);
    if (amount != null) {
      assert.ok(amount > 0, `${facts.country}: a requirement of zero is not a requirement`);
    }
  }
});

check("unknown stays unknown: nulls are never promoted", () => {
  for (const facts of COUNTRY_FACTS) {
    if (facts.proofOfFunds.amount == null) {
      assert.equal(facts.proofOfFunds.usd, null);
      assert.ok(facts.proofOfFunds.note, `${facts.country}: an unpublished amount needs a note saying where it comes from`);
    }
    if (facts.partTimeWorkHours == null) {
      assert.ok(facts.partTimeWorkNote, `${facts.country}: no weekly limit needs an explanation`);
    } else {
      assert.ok(facts.partTimeWorkHours > 0 && facts.partTimeWorkHours <= 48, `${facts.country}: implausible weekly hours`);
    }
    if (facts.postStudyWorkMonths != null) {
      assert.ok(facts.postStudyWorkMonths > 0 && facts.postStudyWorkMonths <= 48, `${facts.country}: implausible post-study months`);
    }
    if (facts.elevenYearDiploma === "direct") {
      assert.ok(facts.elevenYearNote, `${facts.country}: a "direct entry" verdict needs its evidence`);
    }
    if (facts.embassy.kind) {
      assert.ok(facts.embassy.name, `${facts.country}: a mission without a name is not usable`);
    }
  }
});

check("country lookup accepts the names and aliases the catalogue stores", () => {
  assert.equal(countryFactsFor("Germany")?.iso2, "DE");
  assert.equal(countryFactsFor("de")?.iso2, "DE");
  assert.equal(countryFactsFor("United States of America")?.iso2, "US");
  assert.equal(countryFactsFor("USA")?.iso2, "US");
  assert.equal(countryFactsFor("UK")?.iso2, "GB");
  assert.equal(countryFactsFor("Republic of Korea")?.iso2, "KR");
  assert.equal(countryFactsFor("Türkiye")?.iso2, "TR");
  assert.equal(countryFactsFor("China (Mainland)")?.iso2, "CN");
  assert.equal(countryFactsFor("  netherlands ")?.iso2, "NL");
  // A country we hold no verified facts for must stay unanswered.
  assert.equal(countryFactsFor("Narnia"), null);
  assert.equal(countryFactsFor(""), null);
  assert.equal(countryFactsFor(null), null);
});

check("localization collapses the notes to one language", () => {
  const germany = countryFactsFor("Germany")!;
  const en = localizeCountryFacts(germany, "en");
  const uz = localizeCountryFacts(germany, "uz");
  const ru = localizeCountryFacts(germany, "ru");
  assert.notEqual(en.partTimeWorkNote, uz.partTimeWorkNote);
  assert.notEqual(uz.partTimeWorkNote, ru.partTimeWorkNote);
  assert.equal(uz.proofOfFunds.usd, en.proofOfFunds.usd, "the number does not change with language");
  // Unknown locale falls back to English rather than to an empty string.
  assert.equal(localizeCountryFacts(germany, "fr").partTimeWorkNote, en.partTimeWorkNote);
  // No trilingual object may leak into the payload: a client that receives
  // {en,uz,ru} would render "[object Object]" under the wrong language.
  const isLocalizedText = (value: unknown) =>
    typeof value === "object" &&
    value !== null &&
    ["en", "uz", "ru"].every((key) => typeof (value as Record<string, unknown>)[key] === "string");
  const walk = (value: unknown, path: string) => {
    assert.ok(!isLocalizedText(value), `trilingual object leaked at ${path}`);
    if (value && typeof value === "object") {
      for (const [key, child] of Object.entries(value)) walk(child, `${path}.${key}`);
    }
  };
  walk(uz, "uz");
});

check("the API ships the facts with the comparison and the panel renders them", () => {
  const route = read("src/app/api/countries/compare/route.ts");
  assert.match(route, /countryFactsFor/, "the comparison route must look the facts up");
  assert.match(route, /localizeCountryFacts/, "and localize them for the visitor");
  assert.match(route, /facts,/, "the payload must carry a facts map");
  const panel = read("src/components/CountryComparePanel.tsx");
  assert.match(panel, /data\.facts/, "the panel must read the facts map");
  assert.match(panel, /facts\.sourceUrl/, "the source link must be rendered");
  assert.match(panel, /factsNote/, "the yearly-change warning must be rendered");
});

console.log(`\n${failures.length === 0 ? "✅" : "❌"} ${passed} passed, ${failures.length} failed`);
if (failures.length) process.exitCode = 1;
