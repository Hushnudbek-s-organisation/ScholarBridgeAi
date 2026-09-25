/**
 * Deterministic checks for university comparison tables (Phase 3).
 *
 * A comparison is only useful if it says which column wins and flags what is
 * missing. A table where half the cells are null invites a student to guess —
 * and they guess from whichever column happens to be filled in.
 *
 * Run: npm run test:compare
 */

import { compareUniversities, type CompareUniversity } from "../src/lib/compare";

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

const uni = (over: Partial<CompareUniversity> & { id: number; name: string }): CompareUniversity => ({
  country: "USA",
  city: "Boston",
  worldRanking: 100,
  acceptanceRate: 40,
  annualTuitionUsd: 30000,
  annualLivingEstUsd: 15000,
  minGpa: 3.2,
  postStudyWorkVisaYears: 3,
  internationalStudentsPercentage: 20,
  programMajor: "Computer Science",
  ...over,
});

const cheap = uni({ id: 1, name: "Cheap State", annualTuitionUsd: 5000, worldRanking: 300, acceptanceRate: 80 });
const elite = uni({ id: 2, name: "Elite Private", annualTuitionUsd: 60000, worldRanking: 5, acceptanceRate: 5 });

// ---------------------------------------------------------------------------
section("1. Rows and winners");

const cmp = compareUniversities([cheap, elite]);
check("rows are produced", cmp.rows.length >= 6);
check("every row has a label", cmp.rows.every((r) => r.label.length > 0));

const tuition = cmp.rows.find((r) => r.key === "tuition")!;
check("cheaper tuition wins", tuition.winner === cheap.id);
check("the winner reason names the price", /5,000/.test(tuition.winnerReason ?? ""));

const ranking = cmp.rows.find((r) => r.key === "ranking")!;
check("the better ranking wins", ranking.winner === elite.id);
check("the ranking reason names the university", /Elite Private ranks highest/.test(ranking.winnerReason ?? ""));

const acceptance = cmp.rows.find((r) => r.key === "acceptanceRate")!;
check("a higher acceptance rate wins", acceptance.winner === cheap.id);

const postStudy = cmp.rows.find((r) => r.key === "postStudy")!;
check("a tie produces no winner", postStudy.winner === null);

section("2. A winner out of one known cell is not a comparison");

const sparse = compareUniversities([
  uni({ id: 1, name: "Known", annualTuitionUsd: 20000 }),
  uni({ id: 2, name: "Unknown", annualTuitionUsd: null }),
]);
const sparseTuition = sparse.rows.find((r) => r.key === "tuition")!;
check(
  "no winner is declared when only one side published a figure",
  sparseTuition.winner === null,
  `winner=${sparseTuition.winner}`
);
check("the unknown cell renders as null, not as zero", sparseTuition.values[2] === null);

const allUnknown = compareUniversities([
  uni({ id: 1, name: "A", internationalStudentsPercentage: null }),
  uni({ id: 2, name: "B", internationalStudentsPercentage: null }),
]);
check(
  "a row where nothing is published is dropped entirely",
  !allUnknown.rows.some((r) => r.key === "international"),
  allUnknown.rows.map((r) => r.key).join(",")
);

section("3. Tallies and verdict");

const tally = compareUniversities([cheap, elite]);
check("each university gets a tally", Object.keys(tally.scores).length === 2);
check("wins are counted per university", tally.scores[cheap.id].wins + tally.scores[elite.id].wins >= 3);
check("the verdict names a leader or says the data cannot separate them", tally.verdict.length > 20);

const identical = compareUniversities([
  uni({ id: 1, name: "Twin A" }),
  uni({ id: 2, name: "Twin B" }),
]);
check("identical universities produce no leader", /does not separate/i.test(identical.verdict));
check("identical universities win nothing", identical.scores[1].wins === 0 && identical.scores[2].wins === 0);

check("one university is told to add another", /at least two/i.test(compareUniversities([cheap]).verdict));
check("an empty comparison is handled", /Add universities/i.test(compareUniversities([]).verdict));

section("4. The student's own numbers are checked");

// elite requires 3.7 here, so a 3.3 GPA genuinely falls short of it while
// clearing cheap's 3.2.
const picky = { ...elite, minGpa: 3.7 };
const withCtx = compareUniversities([cheap, picky], { gpa4: 3.3, budgetAnnualUsd: 25000 });
const gpaFit = withCtx.rows.find((r) => r.key === "gpaFit")!;
check("a GPA row appears when the student has one", Boolean(gpaFit));
check("a GPA above the minimum is marked as meeting it", /Meets it/.test(String(gpaFit.values[cheap.id])));
check("a GPA below the minimum is marked as short", /Below by/.test(String(gpaFit.values[picky.id])));
check("the larger margin wins the GPA row", gpaFit.winner === cheap.id);

const budgetFit = withCtx.rows.find((r) => r.key === "budgetFit")!;
check("a budget row appears when the student sets one", Boolean(budgetFit));
check("an affordable option says so", /Within budget/.test(String(budgetFit.values[cheap.id])));
check("an unaffordable option says by how much", /over budget/.test(String(budgetFit.values[picky.id])));

const noCtx = compareUniversities([cheap, elite]);
check("no GPA row without a GPA", !noCtx.rows.some((r) => r.key === "gpaFit"));
check("no budget row without a budget", !noCtx.rows.some((r) => r.key === "budgetFit"));

section("5. Data gaps are surfaced, not hidden");

const gaps = compareUniversities([
  uni({ id: 1, name: "Sparse", annualTuitionUsd: null, acceptanceRate: null, annualLivingEstUsd: null }),
  // Fully documented — including the scholarship-count row.
  { ...elite, scholarshipCount: 10 },
]);
check("a university with missing data is reported", gaps.dataGaps.some((g) => g.universityId === 1));
check("the missing fields are listed by label", gaps.dataGaps.find((g) => g.universityId === 1)!.missing.includes("Annual tuition"));
check("a fully documented university has no gaps", !gaps.dataGaps.some((g) => g.universityId === elite.id));

section("6. Column count is bounded");

const many = compareUniversities(Array.from({ length: 10 }, (_, i) => uni({ id: i, name: `Uni ${i}` })));
check("at most six universities are compared", Object.keys(many.scores).length === 6);

section("7. Determinism");

const a = compareUniversities([cheap, elite], { gpa4: 3.5, budgetAnnualUsd: 40000 });
const b = compareUniversities([cheap, elite], { gpa4: 3.5, budgetAnnualUsd: 40000 });
check("the same input gives the same table", JSON.stringify(a) === JSON.stringify(b));

section("8. IELTS fit and scholarship counts (spec §23)");

const ieltsA = { ...cheap, minIelts: 6.0 };
const ieltsB = { ...elite, minIelts: 7.0 };
const withIelts = compareUniversities([ieltsA, ieltsB], { ielts: 6.5 });
const ieltsFit = withIelts.rows.find((r) => r.key === "ieltsFit")!;
check("an IELTS row appears when the student has a score", Boolean(ieltsFit));
check("an IELTS above the minimum is marked as meeting it", /Meets it \(\+0.5\)/.test(String(ieltsFit.values[ieltsA.id])));
check("an IELTS below the minimum is marked as short", /Below by 0.5/.test(String(ieltsFit.values[ieltsB.id])));
check("the larger IELTS margin wins the row", ieltsFit.winner === ieltsA.id);

const noIelts = compareUniversities([cheap, elite], { gpa4: 3.5 });
check("no IELTS row without an IELTS score", !noIelts.rows.some((r) => r.key === "ieltsFit"));

const withSch = compareUniversities([
  { ...cheap, scholarshipCount: 12 },
  { ...elite, scholarshipCount: 4 },
]);
const schRow = withSch.rows.find((r) => r.key === "scholarships")!;
check("more scholarships in-country wins", schRow.winner === cheap.id);
check("the scholarship count is rendered as a number", schRow.values[cheap.id] === "12");
check("no scholarship row when the count is unknown", !noIelts.rows.some((r) => r.key === "scholarships"));

section("9. Personalized rows are injected (spec §23)");

const matchRow = {
  key: "profileMatch",
  label: "Your profile match",
  values: { [cheap.id]: "90%", [elite.id]: "55%" },
  winner: cheap.id,
  winnerReason: "Highest fit with your profile.",
  allUnknown: false,
};
const admissionRow = {
  key: "admissionEstimate",
  label: "Admission estimate",
  values: { [cheap.id]: "45–70%", [elite.id]: "5–15%" },
  winner: cheap.id,
  allUnknown: false,
};

const withExtra = compareUniversities([cheap, elite], {}, [matchRow, admissionRow]);
check("personalized rows are prepended to the table", withExtra.rows[0].key === "profileMatch" && withExtra.rows[1].key === "admissionEstimate");
check("personalized wins count in the tally", withExtra.scores[cheap.id].wins >= 2);
check("match and admission stay two separate rows", withExtra.rows.filter((r) => r.key === "profileMatch" || r.key === "admissionEstimate").length === 2);

// ---------------------------------------------------------------------------
console.log(`\n${failed === 0 ? "✅" : "❌"} ${passed} passed, ${failed} failed`);
process.exitCode = failed === 0 ? 0 : 1;
