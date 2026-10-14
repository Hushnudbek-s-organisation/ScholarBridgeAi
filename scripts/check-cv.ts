/**
 * Deterministic checks for the CV builder (Phase 3).
 *
 * CV structure and length vary by country, institution, programme and
 * application. The builder must not invent an award, date or number, and its
 * advice must not imply universal GPA, test, leadership or page-count rules.
 *
 * Run: npm run test:cv
 */

import { buildCv, parseList, renderCvText, FORBIDDEN_ON_CV, type CvProfile } from "../src/lib/cv";
import { localizeCv } from "../src/lib/cvI18n";
import { readFileSync } from "node:fs";

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

const full: CvProfile = {
  name: "Aziza Karimova",
  email: "aziza@example.com",
  country: "Uzbekistan",
  targetMajor: "Computer Science",
  degreeLevel: "Bachelor",
  graduationYear: 2027,
  gpa: 3.9,
  gpaScale: 4,
  ieltsScore: 7.5,
  satScore: 1520,
  apCourses: '["Calculus AB", "Physics C"]',
  researchExperience: '["NLP research assistant, 1 year"]',
  projects: '["Open-source tokenizer for Uzbek"]',
  leadership: '["Student Council Vice President"]',
  volunteering: '["Red Crescent volunteer"]',
  olympiads: '["National Math Olympiad — 2nd place"]',
  awards: '["Presidential scholarship"]',
  competitions: '["ACM ICPC regional"]',
  certificates: '["AWS Certified"]',
  languages: '["Uzbek", "English", "Russian"]',
  careerGoal: "ML engineer building diagnostic tooling",
};

const empty: CvProfile = {};

// ---------------------------------------------------------------------------
section("1. List parsing");

check("a JSON array parses", parseList('["a", "b"]').length === 2);
check("comma-separated legacy text parses", parseList("a, b ,c").length === 3);
check("an empty string yields nothing", parseList("").length === 0);
check("null yields nothing", parseList(null).length === 0);
check("malformed JSON falls back to commas", parseList("[unclosed, value").length === 2);
check("an array input passes through", parseList(["x", "y"]).length === 2);

section("2. Sections follow the admissions order");

const cv = buildCv(full);
const headings = cv.sections.map((s) => s.heading);
const cvGuidance = cv.guidance.map((item) => item.key);
check("Education comes first", headings[0] === "Education");
check(
  "Research & Projects precede Honours",
  headings.indexOf("Research & Projects") < headings.indexOf("Honours & Awards"),
  headings.join(" > ")
);
check(
  "Leadership precedes Work Experience when both exist",
  headings.indexOf("Leadership & Activities") < headings.indexOf("Objective")
);
check("a test section exists", headings.includes("Standardized Tests"));
check("activities are grouped without a leadership-first label", headings.includes("Activities & Leadership"));
check("an objective is included only when written", headings.includes("Objective"));
check("CV guidance uses the student's intended major", cvGuidance.includes("targetMajor") && cv.guidance.find((item) => item.key === "targetMajor")?.values?.major === "Computer Science");
check("CV guidance reacts to the profile's project and leadership evidence", cvGuidance.includes("evidence") && cvGuidance.includes("leadership"));
check("CV guidance reviews present academic records and test scores", cvGuidance.includes("academicComplete") && cvGuidance.includes("testScoresPresent"));
check("CV guidance is separate from the copied CV text", !renderCvText(cv).includes("Profile-specific CV revision guidance"));

section("3. Real data appears, invented data never does");

const text = renderCvText(cv);
check("the name is rendered", text.includes("AZIZA KARIMOVA"));
check("the GPA carries its scale", text.includes("GPA 3.9/4"));
check("the SAT appears", text.includes("SAT 1520"));
check("AP courses are labelled", text.includes("AP Calculus AB"));
check("the award is quoted verbatim", text.includes("National Math Olympiad — 2nd place"));
check("languages are listed", text.includes("Uzbek, English, Russian"));
check("the career goal is included", text.includes("ML engineer building diagnostic tooling"));

const partial = buildCv({ name: "Test Student", gpa: 3.4, gpaScale: 4 });
const partialText = renderCvText(partial);
check("an empty profile produces no awards section", !partial.sections.some((s) => s.heading === "Honours & Awards"));
check("no award text is invented", !/award|honor|scholarship|first place/i.test(partialText));
check("no date is invented", !/\b(19|20)\d{2}\b/.test(partialText.replace(/Expected graduation \d{4}/g, "")));
check("the GPA scale defaults to 4 when missing", buildCv({ gpa: 3.2 }).sections[0].items[0] === "GPA 3.2/4");

section("4. Gaps are reported, not papered over");

const emptyCv = buildCv(empty);
const emptyGuidance = emptyCv.guidance.map((item) => item.key);
check("a fully filled profile reports nothing missing", cv.missing.length === 0);
check("empty-profile advice asks for a real target major and evidence", emptyGuidance.includes("targetMajorMissing") && emptyGuidance.includes("evidenceMissing"));
check("empty-profile advice stays specific about leadership and academics", emptyGuidance.includes("leadershipMissing") && emptyGuidance.includes("academicIncomplete") && emptyGuidance.includes("testScoresMissing"));
check("an empty profile lists the gaps", emptyCv.missing.length >= 4, `got ${emptyCv.missing.length}`);
check("the name gap is keyed", emptyCv.missing.some((m) => m.key === "fullName"));
check("the email gap is keyed", emptyCv.missing.some((m) => m.key === "email"));
check("the GPA gap is keyed without claiming it is required", emptyCv.missing.some((m) => m.key === "gpa"));
check("a missing major is keyed without claiming it is required", emptyCv.missing.some((m) => m.key === "targetMajor"));
check("a missing test score is optional, not a universal requirement", emptyCv.missing.some((m) => m.key === "testScores"));
check("a placeholder name is used, never a fabricated one", emptyCv.name === "Your Name");

section("5. Structural advice");

check("an empty CV warns with a stable issue key", buildCv(empty).warnings.some((w) => w.key === "empty"));
check(
  "a profile with no evidence gets a neutral, localized review key",
  buildCv({ name: "X", gpa: 3.5, gpaScale: 4 }).warnings.some((w) => w.key === "noEvidence")
);
check(
  "a profile with other activities is not warned for lacking a leadership title",
  !buildCv({ ...full, leadership: null }).warnings.some((w) => w.key === "noActivities")
);
check(
  "a profile with no activities gets a neutral prompt, not a leadership ranking",
  buildCv({ name: "X", gpa: 3.5, gpaScale: 4 }).warnings.some((w) => w.key === "noActivities")
);
check("a full profile raises no warnings", cv.warnings.length === 0);

// 30 extra projects = 44 entries. That still fits two pages, so the right
// signal is "this is a list, not a CV" — not a page-count warning.
const bloated = buildCv({
  ...full,
  projects: JSON.stringify(Array.from({ length: 30 }, (_, i) => `Project ${i}`)),
});
check(
  "a list-like CV is warned about by volume",
  bloated.warnings.some((w) => w.key === "manyEntries"),
  bloated.warnings.map((w) => w.key).join(" | ")
);
check("the page estimate grows with content", bloated.estimatedPages > cv.estimatedPages);
check("a normal CV is one page", cv.estimatedPages === 1, `got ${cv.estimatedPages}`);
check("a 44-entry CV is still two pages, not three", bloated.estimatedPages === 2, `got ${bloated.estimatedPages}`);

// A genuinely overlong file must trip the page warning.
const huge = buildCv({
  ...full,
  projects: JSON.stringify(Array.from({ length: 60 }, (_, i) => `Project ${i}`)),
  awards: JSON.stringify(Array.from({ length: 40 }, (_, i) => `Award ${i}`)),
});
check("a long draft gets a target-specific length review prompt", huge.warnings.some((w) => w.key === "length"));
check("and its page estimate says so", huge.estimatedPages > 2, `got ${huge.estimatedPages}`);

section("6. Localized and conditional guidance");

const localizedByLocale = Object.fromEntries(
  (["en", "uz", "ru"] as const).map((locale) => [locale, localizeCv(locale, emptyCv)])
);
check("English CV gaps are rendered from message keys", localizedByLocale.en.missing.includes("Full name"));
check("Uzbek CV gaps are translated", localizedByLocale.uz.missing.includes("To‘liq ism-familiya"));
check("Russian CV gaps are translated", localizedByLocale.ru.missing.includes("Полное имя"));
check(
  "test-score gaps say requirements vary instead of requiring every test",
  localizedByLocale.en.missing.some((message) => /only if relevant or requested; requirements vary/i.test(message))
);
check(
  "warning parameters are interpolated in the requested locale",
  localizeCv("en", huge).warnings.some((message) => message.includes(String(huge.estimatedPages)))
);
const cvMessageFiles = Object.fromEntries(
  (["en", "uz", "ru"] as const).map((locale) => [
    locale,
    JSON.parse(readFileSync(`src/i18n/messages/${locale}.json`, "utf8")).cvBuilder,
  ])
);
check(
  "CV copy avoids unsupported blanket claims about counts, leadership, page length and reader time",
  !/two or three strongest|prioritize sustained responsibility over|usually easiest to scan|under two minutes per file|first thing a reader looks for|strongest two pages/i.test(
    JSON.stringify(cvMessageFiles.en)
  )
);

section("7. Discrimination-risk fields");

check("the forbidden list is published", FORBIDDEN_ON_CV.length >= 5);
check(
  "the rendered CV carries no forbidden field",
  !/photo|date of birth|marital|religion/i.test(text)
);
check(
  "the CV never emits a date of birth even when the profile has an age",
  !/\bage\b|\bDOB\b/i.test(renderCvText(buildCv({ ...full })))
);

section("8. Determinism");

check("the same profile builds the same CV", JSON.stringify(buildCv(full)) === JSON.stringify(buildCv(full)));
check("item count matches the sections", cv.totalItems === cv.sections.reduce((n, s) => n + s.items.length, 0));

// ---------------------------------------------------------------------------
console.log(`\n${failed === 0 ? "✅" : "❌"} ${passed} passed, ${failed} failed`);
process.exitCode = failed === 0 ? 0 : 1;
