/**
 * P1 regression — explicit university ordering and profile-edit re-scoring.
 *
 * The reported bug: with "QS ranking" selected, university #247 appeared above
 * #1 MIT as soon as the student had a profile. Root cause: the UI sent no
 * `sort` param for its default, and the API treated "no sort + profile" as
 * "sort by my match score".
 *
 * Run: npm run test:university-sort
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  parseUniversitySort,
  semanticRerankAllowed,
  sortUniversities,
  toAdmissionComparison,
  type SortableUniversity,
} from "../src/lib/universitySort";
import { profileMatchFingerprint } from "../src/lib/profileMatchFingerprint";
import { evaluateApplicantRequirementGroup, evaluateRequirementGroup } from "../src/lib/requirementGroups";
import { paginateArray } from "../src/lib/pagination";

const ROOT = join(import.meta.dirname, "..");
const read = (path: string) => readFileSync(join(ROOT, path), "utf8");

let passed = 0;
const failures: string[] = [];
function check(name: string, fn: () => void) {
  try {
    fn();
    passed++;
    console.log(`  ✓ ${name}`);
  } catch (error) {
    failures.push(`${name}: ${(error as Error).message}`);
    console.log(`  ✗ ${name} — ${(error as Error).message}`);
  }
}

/** MIT #1 has a LOW fit; #247 has a HIGH fit — the exact audit scenario. */
const rows: SortableUniversity[] = [
  { id: 1, name: "MIT", worldRanking: 1, annualTuitionUsd: 60000, matchScore: 31, admissionComparison: { state: "met", margin: 0.25 } },
  { id: 2, name: "Imperial College London", worldRanking: 2, annualTuitionUsd: 45000, matchScore: 70, admissionComparison: { state: "met", margin: 0.08 } },
  { id: 3, name: "University #247", worldRanking: 247, annualTuitionUsd: 3000, matchScore: 96, admissionComparison: { state: "unmet", margin: -0.07 } },
  { id: 4, name: "Unknown-rank College", worldRanking: null, annualTuitionUsd: null, matchScore: null, admissionComparison: null },
  { id: 5, name: "Aalto University", worldRanking: 116, annualTuitionUsd: 15000, matchScore: 60, admissionComparison: null },
];
const ids = (list: SortableUniversity[]) => list.map((r) => r.id).join(",");
const order = (raw: string | null, hasProfile: boolean) =>
  sortUniversities(rows, parseUniversitySort(raw), hasProfile);

console.log("\nP1 — explicit university sort (with and without a profile)");

check("QS ranking wins even when a high-fit profile exists", () => {
  assert.equal(ids(order("rank_asc", true).rows), "1,2,5,3,4");
  assert.equal(order("rank_asc", true).applied, "rank_asc");
});

check("QS ranking is identical for a signed-out visitor", () => {
  assert.equal(ids(order("rank_asc", false).rows), "1,2,5,3,4");
});

check("legacy `rank` / `qs_rank` aliases keep old deep links working", () => {
  assert.equal(ids(order("rank", true).rows), "1,2,5,3,4");
  assert.equal(ids(order("qs_rank", false).rows), "1,2,5,3,4");
});

check("tuition asc/desc compare tuition, with NULLs last in both directions", () => {
  assert.equal(ids(order("tuition_asc", true).rows), "3,5,2,1,4");
  assert.equal(ids(order("tuition_desc", false).rows), "1,2,5,3,4");
});

check("name sort compares names, with a stable id tie-breaker", () => {
  const withTie: SortableUniversity[] = [
    { id: 9, name: "Alpha University", worldRanking: 40 },
    { id: 2, name: "Alpha University", worldRanking: 2 },
    { id: 7, name: "Beta University", worldRanking: null },
  ];
  assert.equal(sortUniversities(withTie, parseUniversitySort("name_asc"), true).rows.map((r) => r.id).join(","), "2,9,7");
});

check("match sort is available explicitly and never becomes the QS default", () => {
  assert.equal(ids(order("match_desc", true).rows), "3,2,5,1,4");
  assert.notEqual(ids(order("rank_asc", true).rows), ids(order("match_desc", true).rows));
});

check("fit, admission and best sort prioritize different candidates", () => {
  assert.equal(ids(order("match_desc", true).rows), "3,2,5,1,4");
  assert.equal(ids(order("chance_desc", true).rows), "1,2,3,5,4");
  assert.equal(ids(order("best_desc", true).rows), "2,1,3,5,4");
  assert.equal(order("chance_desc", true).applied, "chance_desc");
  assert.equal(order("best_desc", true).applied, "best_desc");
});

check("unknown data falls back to fit and never reads the retired chance index", () => {
  const legacy = [
    { id: 1, name: "MIT", worldRanking: 1, matchScore: 31, chanceScore: 99 },
    { id: 3, name: "University #247", worldRanking: 247, matchScore: 96, chanceScore: 1 },
  ];
  for (const sort of ["chance_desc", "best_desc"]) {
    const sorted = sortUniversities(legacy, parseUniversitySort(sort), true);
    assert.equal(ids(sorted.rows), "3,1");
    assert.equal(sorted.applied, "match_desc");
    assert.equal(sorted.admissionDataUnavailable, true);
  }
});

check("admission comparison respects alternatives, mandatory checks and missing scores", () => {
  const alternatives = { id: "english", operator: "anyOf", children: [
    { id: "ielts", field: "ielts", kind: "minimum", unit: "9", value: 7.5 },
    { id: "det", field: "duolingo", kind: "minimum", unit: "160", value: 120 },
  ] };
  const date = "2026-11-26";
  const profile = { ielts: 7, duolingo: 130 };
  assert.deepEqual(toAdmissionComparison(evaluateApplicantRequirementGroup(alternatives, profile, date)), {
    state: "met", margin: (130 - 120) / 120,
  });
  const mandatory = { id: "all", operator: "allOf", children: [
    alternatives, { id: "sat", field: "sat", kind: "minimum", unit: "1600", value: 1350 },
  ] };
  assert.equal(toAdmissionComparison(evaluateApplicantRequirementGroup(mandatory, profile, date)), null);
  assert.deepEqual(toAdmissionComparison(evaluateApplicantRequirementGroup(mandatory, { ...profile, sat: 1250 }, date)), {
    state: "unmet", margin: (1250 - 1350) / 1350,
  });
  const mandatoryRecord = { id: "requires-record", operator: "allOf", children: [
    alternatives, { id: "documents", kind: "record", field: "documents" },
  ] };
  const withMissingDocument = evaluateRequirementGroup(mandatoryRecord, {
    ielts: { value: 8, unit: "9" }, documents: { value: false },
  }, date);
  assert.deepEqual(toAdmissionComparison(withMissingDocument), { state: "unmet", margin: null });
});

check("every personal sort without an authorized profile falls back to QS", () => {
  for (const sort of ["match_desc", "chance_desc", "best_desc"]) {
    const result = order(sort, false);
    assert.equal(result.fellBackToRank, true);
    assert.equal(result.applied, "rank_asc");
    assert.equal(ids(result.rows), "1,2,5,3,4");
  }
});

check("relevance is the only mode semantic reranking may touch", () => {
  assert.equal(semanticRerankAllowed(parseUniversitySort("relevance")), true);
  for (const raw of ["rank_asc", "tuition_asc", "name_asc", "match_desc", "chance_desc", "best_desc"]) {
    assert.equal(semanticRerankAllowed(parseUniversitySort(raw)), false, raw);
  }
  assert.equal(ids(order("relevance", true).rows), "3,2,5,1,4");
  assert.equal(ids(order("relevance", false).rows), "1,2,5,3,4");
});

check("an unknown sort value never silently becomes personal match", () => {
  const parsed = parseUniversitySort("not_a_sort");
  assert.equal(parsed.sort, "rank_asc");
  assert.equal(parsed.explicit, true);
  assert.equal(ids(order("not_a_sort", true).rows), "1,2,5,3,4");
});

check("pagination slices the SORTED list, so page 2 continues the same order", () => {
  const sorted = order("rank_asc", true).rows;
  const p1 = paginateArray(sorted, 1, 2);
  const p2 = paginateArray(sorted, 2, 2);
  assert.equal(ids(p1.items), "1,2");
  assert.equal(ids(p2.items), "5,3");
  assert.equal(ids([...p1.items, ...p2.items]), ids(sorted.slice(0, 4)));
});

console.log("\nP1 — profile edits invalidate the right caches and refetch");

check("every score-relevant profile field changes the fingerprint", () => {
  const base = profileMatchFingerprint({ id: 1, gpa: 3.2, ieltsScore: 6.5, satScore: 1200, targetMajor: "CS", degreeLevel: "Bachelor", preferredCountries: ["USA"], budgetAnnualUsd: 20000 });
  for (const patch of [
    { gpa: 3.8 }, { ieltsScore: 7.5 }, { satScore: 1450 }, { targetMajor: "Economics" },
    { degreeLevel: "Master" }, { preferredCountries: ["UK"] }, { budgetAnnualUsd: 5000 },
  ]) {
    assert.notEqual(profileMatchFingerprint({ id: 1, gpa: 3.2, ieltsScore: 6.5, satScore: 1200, targetMajor: "CS", degreeLevel: "Bachelor", preferredCountries: ["USA"], budgetAnnualUsd: 20000, ...patch }), base, JSON.stringify(patch));
  }
});

check("the explorer refetches on a fingerprint change, not only on profileId", () => {
  const explorer = read("src/components/UniversityExplorer.tsx");
  assert.match(explorer, /profileFingerprint,\s*\]\)/, "the fetch effect must depend on the fingerprint");
  assert.match(explorer, /invalidateCatalogSwr\(\)/, "cached slices from an old profile are dropped");
  assert.match(explorer, /params\.set\("sort", activeProfile \? sortBy : "rank_asc"\)/, "the UI always sends the selected sort");
});

check("the dashboard cache is invalidated by profile writes", () => {
  assert.match(read("src/app/api/profiles/[id]/route.ts"), /invalidateDashboardRecommendationsForProfile\(profileId\)/);
  assert.match(read("src/app/api/profiles/[id]/route.ts"), /invalidateProfileMatchCache\(profileId\)/);
  assert.match(read("src/app/HomeClient.tsx"), /invalidateClientCache\(\)/, "client GET cache is dropped after a profile edit");
});

check("the API uses the pure sort module and echoes the applied order", () => {
  const route = read("src/app/api/universities/route.ts");
  assert.match(route, /sortUniversities\(results, parsedSort, Boolean\(profileData\)\)/);
  assert.match(route, /payload\.sortApplied = ordering\.applied/);
  assert.doesNotMatch(route, /else if \(profileData\)/, "no hidden profile-driven sort override");
  assert.match(route, /semanticRerankAllowed\(parsedSort\)/);
});

console.log(`\n${passed} passed, ${failures.length} failed`);
if (failures.length) {
  for (const failure of failures) console.log(`  - ${failure}`);
  process.exit(1);
}
