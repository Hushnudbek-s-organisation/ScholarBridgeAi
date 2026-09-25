/**
 * Deterministic checks for the scholarship essay adapter (src/lib/essayAdapter.ts).
 *
 * The adapter must stay pure — no DB, no network, no AI — and honest:
 *   1. A word limit only exists if the scholarship published one.
 *   2. Themes are gaps only if the scholarship text actually names them.
 *   3. An empty profile field is a "cannot verify" gap — never a silent pass.
 *   4. The adaptation plan is concrete per gap; with no gaps it says so.
 *
 * Run: npm run test:essay-adapter
 */

import {
  adaptationPlan,
  parseWordLimit,
  rankScholarships,
  scoreEssayFit,
  scholarshipThemes,
  themeCounts,
  type AdapterProfile,
  type EssayInput,
  type ScholarshipInput,
} from "../src/lib/essayAdapter";

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
// Fixtures
// ---------------------------------------------------------------------------

const strongProfile: AdapterProfile = {
  major: "Computer Science",
  country: "Germany",
  gpa: 3.8,
  gpaScale: 4,
  ieltsScore: 7.5,
  toeflScore: null,
};

const emptyProfile: AdapterProfile = {
  major: null,
  country: null,
  gpa: null,
  gpaScale: null,
  ieltsScore: null,
  toeflScore: null,
};

// leadership ×2, research ×2 — covers both themes the fixture scholarship names.
const essayText =
  "My leadership journey began in the robotics club, where I led a team of twelve. " +
  "A second leadership role came as course representative. The research I ran in the " +
  "university laboratory hardened into my research thesis.";

const essay: EssayInput = { text: essayText, wordCount: 650 };

const fullMatch: ScholarshipInput = {
  id: 1,
  title: "TUM Excellence Scholarship",
  description: "A scholarship for strong students.",
  requirements: "Personal statement, 500–800 words. Describe your leadership and research.",
  eligibleMajors: '["Computer Science", "Engineering"]',
  financialNeedBased: false,
  minGpa: 3.5,
  minIelts: 7,
  eligibleCountries: '["Germany", "Austria"]',
};

const withLimitMax: ScholarshipInput = { ...fullMatch, requirements: "Essay: no more than 800 words." };
const majorMismatch: ScholarshipInput = {
  ...fullMatch,
  id: 2,
  eligibleMajors: '["Medicine", "Biology"]',
};
const countryIneligible: ScholarshipInput = {
  ...fullMatch,
  id: 3,
  eligibleCountries: '["France"]',
};

// ---------------------------------------------------------------------------
section("1. Word limits are parsed, never invented");

check('“at least 500 words” → min 500', JSON.stringify(parseWordLimit("at least 500 words")) === JSON.stringify({ min: 500 }));
check('“no more than 800 words” → max 800', parseWordLimit("no more than 800 words").max === 800 && parseWordLimit("no more than 800 words").min === undefined);
check('“500–800 words” (en dash) → range', JSON.stringify(parseWordLimit("500–800 words")) === JSON.stringify({ min: 500, max: 800 }));
check('“500-800 words” (hyphen) → range', parseWordLimit("500-800 words").max === 800);
check('“maximum 1000 words” → max', parseWordLimit("maximum 1000 words").max === 1000);
check('bare “around 700 words” → no limit', Object.keys(parseWordLimit("around 700 words")).length === 0);
check("empty requirements → no limit", Object.keys(parseWordLimit("")).length === 0 && Object.keys(parseWordLimit(null)).length === 0);

section("2. Themes: what the scholarship names is what the essay must cover");

const counts = themeCounts(essayText);
check("essay leadership hits ≥ 2", counts.leadership >= 2, `got ${counts.leadership}`);
check("essay research hits ≥ 2", counts.research >= 2, `got ${counts.research}`);
const fams = scholarshipThemes(fullMatch);
check("fixture scholarship names leadership and research", fams.includes("leadership") && fams.includes("research"), fams.join(","));
check(
  "financialNeedBased forces the financial-need theme",
  scholarshipThemes({ ...fullMatch, financialNeedBased: true }).includes("financialNeed")
);
check(
  "generic scholarship text names no themes",
  scholarshipThemes({ id: 9, title: "General Award", description: "Money for students.", requirements: "Apply by spring." }).length === 0
);

section("3. Fit scoring: six signals, honest gaps");

const perfect = scoreEssayFit(essay, fullMatch, strongProfile);
check("full alignment scores ≥ 90", perfect.fit >= 90, `got ${perfect.fit}`);
check("full alignment has six matched signals and zero gaps", perfect.matched.length === 6 && perfect.gaps.length === 0, `matched=${perfect.matched.length} gaps=${JSON.stringify(perfect.gaps)}`);
check("fit stays within 0–100", perfect.fit >= 0 && perfect.fit <= 100);

const overCap = scoreEssayFit({ text: essayText, wordCount: 900 }, withLimitMax, strongProfile);
check("900 words vs 800 cap → hard gap", overCap.codes.includes("word_limit_over"), overCap.codes.join(","));
check("over-cap scores below the perfect fit", overCap.fit < perfect.fit, `${overCap.fit} vs ${perfect.fit}`);

const justOver = scoreEssayFit({ text: essayText, wordCount: 850 }, withLimitMax, strongProfile);
check("850 words is 'just over' — still a gap", justOver.codes.includes("word_limit_over"));

const mm = scoreEssayFit(essay, majorMismatch, strongProfile);
check("major not in the list → major_mismatch", mm.codes.includes("major_mismatch"), mm.codes.join(","));
check("major mismatch costs points", mm.fit <= perfect.fit - 5, `${mm.fit} vs ${perfect.fit}`);

const ci = scoreEssayFit(essay, countryIneligible, strongProfile);
check("country not eligible → country_ineligible", ci.codes.includes("country_ineligible"));

const lowGpa = scoreEssayFit(essay, fullMatch, { ...strongProfile, gpa: 3.2 });
check("GPA 3.2 vs 3.5 minimum → gpa_below_min", lowGpa.codes.includes("gpa_below_min"));

const noEnglish = scoreEssayFit(essay, fullMatch, { ...strongProfile, ieltsScore: null });
check("no English score on file → english_missing", noEnglish.codes.includes("english_missing"));

const toeflHigh = scoreEssayFit(essay, fullMatch, { ...strongProfile, ieltsScore: null, toeflScore: 130 });
check("TOEFL 130 ≈ IELTS 7.5 passes a 7.0 minimum", !toeflHigh.codes.some((c) => c.startsWith("english_")), toeflHigh.codes.join(","));
const toeflLow = scoreEssayFit(essay, fullMatch, { ...strongProfile, ieltsScore: null, toeflScore: 108 });
check("TOEFL 108 ≈ IELTS 5.7 fails a 7.0 minimum", toeflLow.codes.includes("english_below_min"));

const noLimit = scoreEssayFit(essay, { ...fullMatch, requirements: "Describe your goals." }, strongProfile);
check("no published limit → neutral, not a failure", noLimit.matched.some((m) => m.includes("no word limit published")), noLimit.matched.join(" | "));

const unknownMajor = scoreEssayFit(essay, fullMatch, { ...strongProfile, major: null });
check("major not set → honest 'cannot verify', not a pass", unknownMajor.codes.includes("major_unknown"));
const unknownCountry = scoreEssayFit(essay, fullMatch, { ...strongProfile, country: null });
check("country not set → honest 'cannot verify'", unknownCountry.codes.includes("country_unknown"));
const unknownGpa = scoreEssayFit(essay, fullMatch, { ...strongProfile, gpa: null });
check("GPA not set → honest 'cannot verify'", unknownGpa.codes.includes("gpa_unknown"));

const degenerate = scoreEssayFit({ text: "", wordCount: 0 }, { id: 99, title: "" }, emptyProfile);
check("degenerate inputs stay in range, no throw", degenerate.fit >= 0 && degenerate.fit <= 100, `got ${degenerate.fit}`);

section("4. Adaptation plan: concrete per gap");

const perfectPlan = adaptationPlan(perfect, fullMatch, essay);
check("no gaps → at least the generic advice", perfectPlan.length >= 1);
check("essay never names the scholarship → 'name it' advice", perfectPlan.some((p) => p.includes("Name the scholarship")), perfectPlan.join(" | "));

const namedEssay: EssayInput = { text: essayText + " This is my application to the TUM Excellence Scholarship.", wordCount: 660 };
const namedFit = scoreEssayFit(namedEssay, fullMatch, strongProfile);
const namedPlan = adaptationPlan(namedFit, fullMatch, namedEssay);
check("essay names the scholarship → no 'name it' advice", !namedPlan.some((p) => p.includes("Name the scholarship")));

const capPlan = adaptationPlan(overCap, withLimitMax, { text: essayText, wordCount: 900 });
check("word-cap gap cites the cap number", capPlan.some((p) => p.includes("800")), capPlan.join(" | "));

const needSh: ScholarshipInput = {
  ...fullMatch,
  id: 5,
  financialNeedBased: true,
  description: "For students in financial need.",
};
const needFit = scoreEssayFit(essay, needSh, strongProfile);
check("need-based scholarship: essay without it → theme gap", needFit.codes.includes("theme_missing:financialNeed"), needFit.codes.join(","));
const needPlan = adaptationPlan(needFit, needSh, essay);
check("financial-need gap gets a financial-need step", needPlan.some((p) => p.includes("financial situation")));

section("5. Ranking and determinism");

const ranked = rankScholarships(essay, strongProfile, [countryIneligible, majorMismatch, fullMatch]);
check("ranked by fit, best first", ranked[0].scholarshipId === 1, ranked.map((r) => `${r.scholarshipId}:${r.fit}`).join(","));
check("ranking is non-increasing", ranked.every((r, i) => i === 0 || ranked[i - 1].fit >= r.fit));
check("same input → same output", JSON.stringify(rankScholarships(essay, strongProfile, [countryIneligible, majorMismatch, fullMatch])) === JSON.stringify(ranked));

// ---------------------------------------------------------------------------
console.log(`\n${failed === 0 ? "✅" : "❌"} ${passed} passed, ${failed} failed`);
process.exitCode = failed === 0 ? 0 : 1;
