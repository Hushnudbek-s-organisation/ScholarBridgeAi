/**
 * Deterministic checks for the country comparison (src/lib/countryCompare.ts).
 *
 * The comparison must stay honest:
 *   1. Every number comes from the rows passed in — nothing from memory.
 *   2. Unpublished values are excluded from averages and counted as such,
 *      never treated as zero (the NaN bug class).
 *   3. Work rights are always null — the database does not publish them.
 *
 * Run: npm run test:country-compare
 */

import { compareCountries, listCountries, type SchInput, type UniInput } from "../src/lib/countryCompare";

let passed = 0;
let failed = 0;

function check(name: string, condition: boolean, detail = "") {
  if (condition) {
    passed++;
    console.log(`  ✓ ${name}`);
  } else {
    failed++;
    console.log(`  ✗ ${name}${detail ? ` — ${detail}` : ""}`);
  }
}

function section(title: string) {
  console.log(`\n${title}`);
}

// ---------------------------------------------------------------------------
const unis: UniInput[] = [
  { country: "Germany", annualTuitionUsd: 1500, annualLivingEstUsd: 11000, minIelts: 6.5 },
  { country: "Germany", annualTuitionUsd: 0, annualLivingEstUsd: 10000, minIelts: 7.0 },
  { country: "Germany", annualTuitionUsd: null, annualLivingEstUsd: null, minIelts: null },
  { country: "USA", annualTuitionUsd: 35000, annualLivingEstUsd: 15000, minIelts: 6.5 },
  { country: "Hungary", annualTuitionUsd: 4000, annualLivingEstUsd: null, minIelts: 5.5 },
];

const schs: SchInput[] = [
  { country: "Germany", amountUsdValue: 12000 },
  { country: "Germany", amountUsdValue: 9000 },
  { country: "USA", amountUsdValue: 30000 },
  { country: "Hungary", amountUsdValue: 0 },
];

section("1. Averages use only published values");

const de = compareCountries("Germany", unis, schs);
check("university count", de.universities === 3, `got ${de.universities}`);
check("tuition average excludes the unpublished row", de.tuition.avgUsd === 750, `got ${de.tuition.avgUsd}`);
check("published count is reported", de.tuition.published === 2, `got ${de.tuition.published}`);
check("living average", de.living.avgUsd === 10500, `got ${de.living.avgUsd}`);
check("IELTS average keeps one decimal", de.minIelts.avg === 6.8, `got ${de.minIelts.avg}`);
check("scholarship total", de.scholarships.totalUsd === 21000, `got ${de.scholarships.totalUsd}`);
check("scholarship average", de.scholarships.avgUsd === 10500, `got ${de.scholarships.avgUsd}`);
check("zero-amount scholarship is not funded money", compareCountries("Hungary", unis, schs).scholarships.totalUsd === null);

section("2. Unknown and empty countries are safe, not invented");

const unknown = compareCountries("Atlantis", unis, schs);
check("unknown country → zero universities, null averages", unknown.universities === 0 && unknown.tuition.avgUsd === null && unknown.scholarships.count === 0);
check("no NaN anywhere", JSON.stringify(unknown).includes("NaN") === false);
const empty = compareCountries("", unis, schs);
check("empty country name → no rows", empty.universities === 0);

section("3. Case-insensitive matching");

check("germany matches Germany", compareCountries("germany", unis, schs).universities === 3);

section("4. Work rights are never invented");

check("workRights is always null", de.workRights === null && unknown.workRights === null);

section("5. Country list for the picker");

const list = listCountries(unis);
check("distinct countries, biggest first", list[0].country === "Germany" && list[0].universities === 3, list.map((l) => `${l.country}:${l.universities}`).join(","));
check("no duplicates", new Set(list.map((l) => l.country.toLowerCase())).size === list.length);
check("countries without a name are skipped", listCountries([{ country: null }, { country: "" }, { country: "France" }]).length === 1);

section("6. Determinism");

check("same input → same output", JSON.stringify(compareCountries("Germany", unis, schs)) === JSON.stringify(de));

// ---------------------------------------------------------------------------
console.log(`\n${failed === 0 ? "✅" : "❌"} ${passed} passed, ${failed} failed`);
process.exitCode = failed === 0 ? 0 : 1;
