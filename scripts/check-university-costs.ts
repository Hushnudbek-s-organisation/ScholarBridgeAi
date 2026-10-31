/**
 * Phase AF gate — one figure per cost.
 *
 * Every university cost is stored twice: the canonical amount + currency +
 * period (`annual_tuition`, `tuition_currency`, `tuition_period`) and a legacy
 * USD mirror (`annual_tuition_usd`). All 356 active rows are USD / year, so the
 * two columns describe the same quantity in the same unit — and measured
 * 2026-10-30 they disagreed on **160 tuition, 162 living-cost and 176
 * accommodation rows** (MIT 64,310 vs 65,500 · Oxford 59,650 vs 48,500 · ETH
 * 4,900 vs 1,650 · TUM 5,500 vs 3,000 · KAIST 18,000 vs 6,000).
 *
 * The product showed both: the explorer card printed the mirror, the profile
 * page and the server-rendered catalogue printed the canonical amount, so the
 * same card quoted $65,500 for MIT on first paint and $64,310 after a filter
 * change.
 *
 * The rule (`annualUsdAmount` in `src/lib/usdCosts.ts`): the canonical amount is
 * authoritative when its currency is USD, the mirror is only a fallback, and an
 * explicitly non-USD canonical value is never replaced by a USD mirror. Every
 * public payload now publishes `withResolvedUsdCosts(row)`, and the stored
 * mirrors were aligned to the canonical amounts
 * (`supabase/university_cost_mirror_alignment_2026-10-30.sql`).
 *
 * Run: npm run test:university-costs
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { resolvedUsdUniversityCosts, withResolvedUsdCosts } from "../src/lib/usdCosts";

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

const source = (relative: string) => readFileSync(join(ROOT, relative), "utf8");

/**
 * Live rows whose two columns disagreed before the alignment, with the mirror
 * value they carried. The canonical amount is what the product states.
 */
const DISAGREED: { id: number; name: string; canonical: number; mirrorBefore: number }[] = [
  { id: 1, name: "MIT", canonical: 64310, mirrorBefore: 65500 },
  { id: 2, name: "Imperial College London", canonical: 57800, mirrorBefore: 52000 },
  { id: 4, name: "University of Oxford", canonical: 59650, mirrorBefore: 48500 },
  { id: 6, name: "University of Cambridge", canonical: 62900, mirrorBefore: 53000 },
  { id: 7, name: "ETH Zurich", canonical: 4900, mirrorBefore: 1650 },
  { id: 9, name: "UCL", canonical: 45000, mirrorBefore: 47000 },
  { id: 14, name: "Cornell University", canonical: 71266, mirrorBefore: 63200 },
  { id: 15, name: "The University of Melbourne", canonical: 38500, mirrorBefore: 33000 },
  { id: 18, name: "Columbia University", canonical: 68500, mirrorBefore: 66139 },
  { id: 19, name: "The University of Edinburgh", canonical: 40500, mirrorBefore: 30000 },
  { id: 25, name: "Technical University of Munich", canonical: 5500, mirrorBefore: 3000 },
  { id: 27, name: "Australian National University", canonical: 39000, mirrorBefore: 33000 },
  { id: 35, name: "The University of Sydney", canonical: 39000, mirrorBefore: 34000 },
  { id: 36, name: "Zhejiang University", canonical: 8000, mirrorBefore: 5000 },
  { id: 37, name: "KAIST", canonical: 18000, mirrorBefore: 6000 },
  { id: 43, name: "Delft University of Technology", canonical: 16500, mirrorBefore: 22000 },
  { id: 47, name: "Universitat Pompeu Fabra", canonical: 9000, mirrorBefore: 4500 },
];

/* --------------------------------------------------------------- the rule */

check("the canonical amount wins over a disagreeing mirror", () => {
  for (const row of DISAGREED) {
    const resolved = withResolvedUsdCosts({
      annualTuition: row.canonical,
      tuitionCurrency: "USD",
      tuitionPeriod: "year",
      annualTuitionUsd: row.mirrorBefore,
    });
    assert.equal(resolved.annualTuitionUsd, row.canonical, `${row.name}: the mirror won`);
  }
});

check("a row with only a mirror still resolves to it", () => {
  const resolved = resolvedUsdUniversityCosts({ annualTuitionUsd: 12345 });
  assert.equal(resolved.annualTuitionUsd, 12345);
  assert.equal(resolvedUsdUniversityCosts({ annualTuition: null, annualTuitionUsd: 4200 }).annualTuitionUsd, 4200);
});

check("a non-USD canonical amount is never replaced by a USD mirror", () => {
  // The mirror is a legacy USD copy; it cannot stand in for a GBP/EUR figure.
  const resolved = resolvedUsdUniversityCosts({
    annualTuition: 9000,
    tuitionCurrency: "GBP",
    tuitionPeriod: "year",
    annualTuitionUsd: 9000,
  });
  assert.equal(resolved.annualTuitionUsd, null, "a GBP amount was published as USD");
});

check("a monthly canonical amount is annualised, not copied", () => {
  const resolved = resolvedUsdUniversityCosts({
    annualTuition: 1000,
    tuitionCurrency: "USD",
    tuitionPeriod: "month",
  });
  assert.equal(resolved.annualTuitionUsd, 12000);
});

check("all three cost families follow the same rule", () => {
  const resolved = withResolvedUsdCosts({
    annualTuition: 10000,
    tuitionCurrency: "USD",
    tuitionPeriod: "year",
    annualTuitionUsd: 11000,
    annualLivingEst: 8000,
    livingCostCurrency: "USD",
    livingCostPeriod: "year",
    annualLivingEstUsd: 8500,
    accommodationCost: 3000,
    accommodationCostCurrency: "USD",
    accommodationCostPeriod: "year",
    accommodationCostUsd: 3500,
  });
  assert.equal(resolved.annualTuitionUsd, 10000, "tuition");
  assert.equal(resolved.annualLivingEstUsd, 8000, "living");
  assert.equal(resolved.accommodationCostUsd, 3000, "accommodation");
});

check("a zero is a figure, not a missing value", () => {
  // Tuition-free rows are real (Germany, Norway). Zero must survive as zero and
  // must not be replaced by a mirror or dropped as falsy.
  const resolved = withResolvedUsdCosts({
    annualTuition: 0,
    tuitionCurrency: "USD",
    tuitionPeriod: "year",
    annualTuitionUsd: 3000,
  });
  assert.equal(resolved.annualTuitionUsd, 0);
});

/* ------------------------------------------------------------ the wiring */

check("both university endpoints publish the resolved figure", () => {
  const list = source("src/app/api/universities/route.ts");
  assert.match(list, /import \{ withResolvedUsdCosts \} from "@\/lib\/usdCosts";/);
  assert.match(list, /const resolved = withResolvedUsdCosts\(uni\);/, "the list endpoint ships the raw pair again");

  const detail = source("src/app/api/universities/[id]/route.ts");
  assert.match(detail, /import \{ withResolvedUsdCosts \} from "@\/lib\/usdCosts";/);
  assert.match(detail, /\.\.\.withResolvedUsdCosts\(uni\),/, "the detail endpoint ships the raw pair again");
});

check("every other cost consumer already resolves through the helper", () => {
  for (const route of [
    "src/app/api/dashboard/route.ts",
    "src/app/api/planning/route.ts",
    "src/app/api/deadlines/route.ts",
    "src/app/api/scholarships/route.ts",
    "src/app/api/autopilot/route.ts",
    "src/app/api/countries/compare/route.ts",
    "src/app/universities/page.tsx",
  ]) {
    const text = source(route);
    assert.match(
      text,
      /resolvedUsdUniversityCosts\(/,
      `${route} reads a cost column without resolving it`
    );
  }
});

check("the catalogue cards read the published figure, not a raw column", () => {
  const explorer = source("src/components/UniversityExplorer.tsx");
  assert.match(explorer, /formatMoney\(uni\.annualTuitionUsd, "USD"\)/, "the card no longer prints the published tuition");
  assert.doesNotMatch(explorer, /formatMoney\(uni\.annualTuition\b/, "the card reads the canonical pair directly");
  assert.doesNotMatch(explorer, /tuitionCurrency/, "the card decides the currency itself instead of the server");
});

check("the server-rendered catalogue applies the Phase AD rank rule", () => {
  const page = source("src/app/universities/page.tsx");
  assert.match(page, /import \{ verifiedQsRank \} from "@\/lib\/universityRank";/);
  assert.doesNotMatch(page, /verified \? university\.worldRanking : null/, "the SSR catalogue still trusts the raw rank");
  const uses = page.match(/world_ranking: verifiedQsRank\(university\)\?\.rank \?\? null/g) ?? [];
  assert.equal(uses.length, 2, `expected both SSR branches to use the rule, found ${uses.length}`);
});

/* ------------------------------------------------------------- the data */

check("the mirror-alignment migration covers all three families", () => {
  const sql = source("supabase/university_cost_mirror_alignment_2026-10-30.sql");
  assert.match(sql, /SET annual_tuition_usd = annual_tuition/);
  assert.match(sql, /SET annual_living_est_usd = annual_living_est/);
  assert.match(sql, /SET accommodation_cost_usd = accommodation_cost/);
  for (const family of ["tuition_currency", "living_cost_currency", "accommodation_cost_currency"]) {
    assert.match(sql, new RegExp(`upper\\(coalesce\\(${family}, 'USD'\\)\\) = 'USD'`), `${family}: the non-USD guard is gone`);
  }
});

check("the regression set really covers the disagreement", () => {
  // If someone edits this table, it must stay a list of rows whose two columns
  // genuinely differed — otherwise the gate stops proving anything.
  for (const row of DISAGREED) {
    assert.notEqual(row.mirrorBefore, row.canonical, `${row.name}: this row never disagreed`);
    assert.ok(row.mirrorBefore > 0 && row.canonical > 0, `${row.name}: a zero reached the regression set`);
  }
  assert.ok(DISAGREED.length >= 15, "the regression set shrank below a useful sample");
});

console.log(`\n${passed} passed, ${failures.length} failed`);
if (failures.length > 0) {
  for (const failure of failures) console.error(`  · ${failure}`);
  process.exit(1);
}
