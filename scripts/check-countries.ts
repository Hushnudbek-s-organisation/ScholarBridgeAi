/**
 * Deterministic checks for the shared country selector data and alias behavior.
 *
 * Run: npm run test:countries
 */

import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  countriesMatch,
  countryTranslationKey,
  normalizeCountryAlias,
  QS_TOP_200_COUNTRIES,
  withQsTop200Countries,
} from "../src/lib/countries";
import { compareCountries, listCountries } from "../src/lib/countryCompare";
import { getVisaCountry, VISA_COUNTRIES } from "../src/lib/visa-interview";

const requiredKeys = QS_TOP_200_COUNTRIES.map((country) => country.key);
assert.equal(requiredKeys.length, 37, "the required country/territory list should contain 37 entries");
assert.equal(new Set(requiredKeys).size, 37, "country translation keys should be unique");

for (const locale of ["en", "uz", "ru"] as const) {
  const messages = JSON.parse(readFileSync(join(process.cwd(), `src/i18n/messages/${locale}.json`), "utf8"));
  for (const key of [...requiredKeys, "europeanUnion"]) {
    assert.equal(typeof messages.countryNames?.[key], "string", `${locale} is missing countryNames.${key}`);
    assert.ok(messages.countryNames[key].length > 0, `${locale} has an empty countryNames.${key}`);
  }
}

assert.equal(countryTranslationKey("China"), "chinaMainland");
assert.equal(countryTranslationKey("China (Mainland)"), "chinaMainland");
assert.equal(countryTranslationKey("Hong Kong"), "hongKongSar");
assert.equal(countryTranslationKey("Hong Kong SAR"), "hongKongSar");
assert.equal(countryTranslationKey("Taiwan"), "taiwan");
assert.notEqual(countryTranslationKey("China"), countryTranslationKey("Hong Kong SAR"));
assert.notEqual(countryTranslationKey("China"), countryTranslationKey("Taiwan"));
assert.notEqual(countryTranslationKey("Hong Kong SAR"), countryTranslationKey("Taiwan"));
assert.equal(countriesMatch("USA", "United States"), true);
assert.equal(countriesMatch("GB", "United Kingdom"), true);
assert.equal(countriesMatch("UAE", "United Arab Emirates"), true);
assert.equal(countriesMatch("", ""), false);
assert.equal(countriesMatch(null, "United States"), false);

const merged = withQsTop200Countries([
  "USA",
  "United States",
  "UK",
  "United Kingdom",
  "China (Mainland)",
  "China",
  "Hong Kong",
  "Hong Kong SAR",
  "Taiwan",
  "European Union",
]);
const identities = merged.map((value) => countryTranslationKey(value) ?? normalizeCountryAlias(value));
assert.equal(new Set(identities).size, identities.length, "merged options should not contain alias duplicates");
assert.equal(merged.length, 38, "all 37 countries plus the existing EU filter option should remain");
assert.deepEqual(merged.slice(0, 6), ["USA", "UK", "China (Mainland)", "Hong Kong", "Taiwan", "European Union"]);

const byKey = new Set(VISA_COUNTRIES.map((country) => countryTranslationKey(country.name)));
for (const country of QS_TOP_200_COUNTRIES) {
  assert.ok(byKey.has(country.key), `visa destinations are missing ${country.value}`);
}
assert.equal(VISA_COUNTRIES.length, 37, "visa destination list should cover all 37 options");
assert.equal(new Set(VISA_COUNTRIES.map((country) => country.code)).size, VISA_COUNTRIES.length, "visa codes should be unique");
for (const code of ["US", "UK", "CA", "DE", "AU", "SG", "NL", "CH", "JP", "FR", "SE"]) {
  assert.equal(getVisaCountry(code)?.code, code, `existing visa code ${code} should remain stable`);
}
for (const country of VISA_COUNTRIES) {
  assert.equal(getVisaCountry(country.code)?.code, country.code, `${country.code} should resolve`);
  assert.ok(country.questions.length > 0, `${country.name} should retain interview prompts`);
}

const aliasedUniversities = [
  { country: "USA", annualTuitionUsd: 10_000 },
  { country: "United States", annualTuitionUsd: 20_000 },
  { country: "Hong Kong", annualTuitionUsd: 15_000 },
  { country: "Hong Kong SAR", annualTuitionUsd: 25_000 },
  { country: "Taiwan", annualTuitionUsd: 12_000 },
];
const aliasedScholarships = [
  { country: "U.S.", amountUsdValue: 5_000 },
  { country: "Hong Kong SAR", amountUsdValue: 7_000 },
  { country: "Taiwan", amountUsdValue: 3_000 },
];
assert.equal(compareCountries("United States", aliasedUniversities, aliasedScholarships).universities, 2);
assert.equal(compareCountries("USA", aliasedUniversities, aliasedScholarships).scholarships.count, 1);
assert.equal(compareCountries("HK", aliasedUniversities, aliasedScholarships).universities, 2);
assert.equal(compareCountries("China", aliasedUniversities, aliasedScholarships).universities, 0);
assert.equal(compareCountries("Taiwan", aliasedUniversities, aliasedScholarships).universities, 1);

const available = listCountries(aliasedUniversities);
assert.equal(available.find((country) => country.country === "USA")?.universities, 2);
assert.equal(available.find((country) => country.country === "Hong Kong")?.universities, 2);
assert.equal(available.filter((country) => countryTranslationKey(country.country) === "hongKongSar").length, 1);

console.log("✅ Country options, translations, visa coverage, aliases, and comparison checks passed.");
