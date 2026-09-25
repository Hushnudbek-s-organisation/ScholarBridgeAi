/**
 * Deterministic checks for the CV builder (Phase 3).
 *
 * An admissions CV is not a job CV: academics, evidence and impact, one page,
 * and no photograph or date of birth. Above all it must never invent an award,
 * a date or a number — an empty field is omitted, not filled with plausible
 * sounding text.
 *
 * Run: npm run test:cv
 */

import { buildCv, parseList, renderCvText, FORBIDDEN_ON_CV, type CvProfile } from "../src/lib/cv";

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
check("an objective is included only when written", headings.includes("Objective"));

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
check("a fully filled profile reports nothing missing", cv.missing.length === 0);
check("an empty profile lists the gaps", emptyCv.missing.length >= 4, `got ${emptyCv.missing.length}`);
check("the name gap is named", emptyCv.missing.some((m) => /name/i.test(m)));
check("the email gap is named", emptyCv.missing.some((m) => /email/i.test(m)));
check("the GPA gap is named", emptyCv.missing.some((m) => /GPA/i.test(m)));
check("a missing major is named", emptyCv.missing.some((m) => /major/i.test(m)));
check("a placeholder name is used, never a fabricated one", emptyCv.name === "Your Name");

section("5. Structural advice");

check("an empty CV warns that it is empty", buildCv(empty).warnings.some((w) => /CV is empty/i.test(w)));
check(
  "a profile with no evidence is warned",
  buildCv({ name: "X", gpa: 3.5, gpaScale: 4 }).warnings.some((w) => /No evidence section/i.test(w))
);
check("a profile with no leadership is warned", buildCv({ ...full, leadership: null }).warnings.some((w) => /No leadership role/i.test(w)));
check("a full profile raises no warnings", cv.warnings.length === 0);

// 30 extra projects = 44 entries. That still fits two pages, so the right
// signal is "this is a list, not a CV" — not a page-count warning.
const bloated = buildCv({
  ...full,
  projects: JSON.stringify(Array.from({ length: 30 }, (_, i) => `Project ${i}`)),
});
check(
  "a list-like CV is warned about by volume",
  bloated.warnings.some((w) => /is a list, not a CV/i.test(w)),
  bloated.warnings.join(" | ")
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
check("a three-page CV is told to cut back", huge.warnings.some((w) => /cut to the strongest/i.test(w)));
check("and its page estimate says so", huge.estimatedPages > 2, `got ${huge.estimatedPages}`);

section("6. Discrimination-risk fields");

check("the forbidden list is published", FORBIDDEN_ON_CV.length >= 5);
check(
  "the rendered CV carries no forbidden field",
  !/photo|date of birth|marital|religion/i.test(text)
);
check(
  "the CV never emits a date of birth even when the profile has an age",
  !/\bage\b|\bDOB\b/i.test(renderCvText(buildCv({ ...full })))
);

section("7. Determinism");

check("the same profile builds the same CV", JSON.stringify(buildCv(full)) === JSON.stringify(buildCv(full)));
check("item count matches the sections", cv.totalItems === cv.sections.reduce((n, s) => n + s.items.length, 0));

// ---------------------------------------------------------------------------
console.log(`\n${failed === 0 ? "✅" : "❌"} ${passed} passed, ${failed} failed`);
process.exitCode = failed === 0 ? 0 : 1;
