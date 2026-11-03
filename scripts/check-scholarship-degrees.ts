/** Regression for the live Supabase degree vocabulary (2026-11-02).
 * Run: npm run test:scholarship-degrees — no DB access or credentials needed.
 */
import assert from "node:assert/strict";
import {
  EMPTY_SCHOLARSHIP_FILTERS,
  SCHOLARSHIP_DEGREE_OPTIONS,
  parseScholarshipDegreeLevels,
  scholarshipGroupKey,
  scholarshipMatchesFilters,
  type ScholarshipFilterRow,
} from "../src/lib/scholarshipFilters";

assert.deepEqual(parseScholarshipDegreeLevels(`["Bachelor's", "Undergraduate", "Bachelor"]`), ["Bachelor"]);
assert.deepEqual(parseScholarshipDegreeLevels(`["Master’s", "Master", "PhD", "Postdoc"]`), ["Master", "PhD", "Postdoc"]);
assert.deepEqual(parseScholarshipDegreeLevels(" Bachelor's, undergraduate, Master's "), ["Bachelor", "Master"]);
assert.deepEqual(parseScholarshipDegreeLevels(`["BSc", "MSc", "doctoral"]`), ["Bachelor", "Master", "PhD"]);
for (const raw of [null, undefined, "", "[]", '["Bachelor"']) {
  assert.deepEqual(parseScholarshipDegreeLevels(raw), []);
}
assert.deepEqual(parseScholarshipDegreeLevels('[null, 1, {}, "", "Master"]'), ["Master"]);
for (const degree of SCHOLARSHIP_DEGREE_OPTIONS) {
  for (const raw of ["[]", '["Unknown"]', '["Postdoc"]']) {
    assert.equal(scholarshipMatchesFilters({ degreeLevels: raw }, { ...EMPTY_SCHOLARSHIP_FILTERS, degrees: [degree] }), false);
  }
}
assert.equal(scholarshipGroupKey({ degreeLevels: `["Bachelor's", "Undergraduate"]` }, "degree"), "Bachelor");

// Active verified rows, grouped by their exact stored degree list. Formatting
// variants are collapsed here; counts and aliases come from the live audit.
const distribution: [string[], number][] = [
  [["Bachelor's"], 107],
  [["PhD"], 78],
  [["Bachelor's", "Undergraduate"], 76],
  [["Master's"], 70],
  [["Bachelor's", "Master's"], 60],
  [["Master's", "PhD"], 53],
  [["Bachelor's", "Master's", "PhD"], 55],
  [["Bachelor"], 31],
  [["PhD", "Master's"], 18],
  [["Master", "PhD"], 26],
  [["Bachelor", "Master", "PhD"], 17],
  [["Bachelor", "Master"], 15],
  [["Master"], 14],
  [["Bachelor", "Master's", "PhD"], 2],
  [["PhD", "Postdoc"], 1],
  [["Undergraduate", "Master's", "PhD"], 1],
  [["Bachelor's", "Undergraduate", "Master's"], 1],
  [["Master's", "Bachelor's"], 1],
];
const rows: ScholarshipFilterRow[] = distribution.flatMap(([levels, count]) =>
  Array.from({ length: count }, () => ({ country: "Canada", degreeLevels: JSON.stringify(levels) })),
);
assert.equal(rows.length, 626);
const expected = { Bachelor: 366, Master: 333, PhD: 251 };
const previous = { Bachelor: 65, Master: 72, PhD: 251 };
for (const degree of SCHOLARSHIP_DEGREE_OPTIONS) {
  const filters = { ...EMPTY_SCHOLARSHIP_FILTERS, degrees: [degree] };
  const matches = rows.filter((row) => scholarshipMatchesFilters(row, filters));
  // Facets use the same parser as the API's countValues helper. An alias pair
  // must count once per row, not once per original label.
  const facetCount = rows.reduce((n, row) => n + parseScholarshipDegreeLevels(row.degreeLevels).filter((value) => value === degree).length, 0);
  const oldCount = rows.filter((row) => JSON.parse(row.degreeLevels!).includes(degree)).length;
  assert.equal(oldCount, previous[degree]);
  assert.equal(matches.length, expected[degree]);
  assert.equal(facetCount, matches.length);
  // The live format repair stores canonical arrays too. Both the old exact
  // comparison and the new alias-aware parser must now return the same rows.
  const canonicalRows = rows.map((row) => ({
    ...row, degreeLevels: JSON.stringify(parseScholarshipDegreeLevels(row.degreeLevels)),
  }));
  assert.equal(canonicalRows.filter((row) => JSON.parse(row.degreeLevels).includes(degree)).length, expected[degree]);
  assert.equal(canonicalRows.filter((row) => scholarshipMatchesFilters(row, filters)).length, expected[degree]);
  assert.equal(scholarshipMatchesFilters(matches[0], { ...filters, country: "Germany" }), false);
  assert.equal(rows.filter((row) => scholarshipMatchesFilters(row, filters, ["degrees"])).length, 626);
  console.log(`✓ ${degree}: ${oldCount} → ${matches.length}; facet = results`);
}
assert.equal(rows.filter((row) => scholarshipMatchesFilters(row, { ...EMPTY_SCHOLARSHIP_FILTERS, degrees: [...SCHOLARSHIP_DEGREE_OPTIONS] })).length, 626);
assert.equal(rows.filter((row) => scholarshipMatchesFilters(row, EMPTY_SCHOLARSHIP_FILTERS)).length, 626);
console.log("✓ Alias parsing, deduplication, grouping, unknown values and all 626 active rows checked");
