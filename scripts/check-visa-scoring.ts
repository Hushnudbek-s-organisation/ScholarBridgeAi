/**
 * Deterministic checks for the embassy model answers
 * (VISA_INTERVIEW_QA_SAMPLES in src/lib/samples/exemplars.ts) on the SAME
 * rubric that grades a live practice session (src/lib/visaScoring.ts).
 *
 * The product brief asked for "≥ 90/100 with 0 risk flags". The engine cannot
 * award 90 to anyone: funding caps at 80, home ties at 72 and non-immigrant
 * intent at 78, so a transcript that saturates every signal totals 85.6 → 86.
 * This script MEASURES that ceiling with a saturated transcript instead of
 * trusting a constant, then requires every model transcript to reach it with
 * zero risks, zero unanswered questions and zero per-answer concerns.
 *
 * Run: npm run test:visa   (after check-visa-similar.ts)
 */

import { scoreVisaInterview, type VisaTurn } from "../src/lib/visaScoring";
import { VISA_COUNTRIES } from "../src/lib/visa-interview";
import { VISA_INTERVIEW_QA_SAMPLES } from "../src/lib/samples/exemplars";
import { VISA_RUBRIC_CEILING, VISA_SAMPLE_ID_BY_COUNTRY, visaSampleCountryFor, type VisaSampleCountry } from "../src/lib/samples/visa";

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

const words = (text: string) => text.trim().split(/\s+/).filter((w) => /[a-z]/i.test(w)).length;

// ---------------------------------------------------------------------------
section("1. The rubric's ceiling is measured, not assumed");

// Weighted maximum of each ground as implemented in scoreVisaInterview().
const theoretical = Math.round(100 * 0.2 + 80 * 0.2 + 72 * 0.2 + 78 * 0.15 + 100 * 0.15 + 85 * 0.1);
const saturated: VisaTurn[] = [
  { role: "officer", text: "Why this programme?" },
  {
    role: "user",
    text: "Because my research goal and my career focus on this specifically: the professor, the course and the curriculum equip me for it, with 1 2 3 4 5 6 7 8 9 10 11 12 13 figures.",
  },
  { role: "officer", text: "Who pays?" },
  { role: "user", text: "A scholarship and a blocked account of 11,904 euros, and my parents will pay the rest; the bank statement is attached." },
  { role: "officer", text: "What ties do you have?" },
  { role: "user", text: "I will return to Tashkent, my family lives there, I hold a job offer from my employer and property in my country." },
];
const ceilingProbe = scoreVisaInterview(saturated, { homeCountry: "Uzbekistan" });
check(`a transcript saturating every signal totals ${ceilingProbe.scores.total}`, ceilingProbe.scores.total === theoretical, JSON.stringify(ceilingProbe.scores));
check(`VISA_RUBRIC_CEILING (${VISA_RUBRIC_CEILING}) equals the measured maximum`, VISA_RUBRIC_CEILING === ceilingProbe.scores.total);
check("the brief's 90/100 target is above what the engine can award", VISA_RUBRIC_CEILING < 90);

// ---------------------------------------------------------------------------
section("2. Every model transcript reaches the ceiling with zero risk flags");

const rows = VISA_INTERVIEW_QA_SAMPLES.map((sample) => ({
  sample,
  rubric: scoreVisaInterview(sample.turns, { homeCountry: "Uzbekistan", destination: sample.destination }),
}));

for (const { sample, rubric } of rows) {
  const officers = sample.turns.filter((turn) => turn.role === "officer").length;
  const answers = sample.turns.filter((turn) => turn.role === "user");
  const alternates = sample.turns.every((turn, index) => turn.role === (index % 2 === 0 ? "officer" : "user"));
  check(`${sample.id}: five officer questions, five answers, strictly alternating`, officers === 5 && answers.length === 5 && alternates);
  check(`${sample.id}: total ${rubric.scores.total}/100 = the rubric ceiling`, rubric.scores.total === VISA_RUBRIC_CEILING, JSON.stringify(rubric.scores));
  check(`${sample.id}: 0 risk flags`, rubric.risks.length === 0, rubric.risks.map((risk) => risk.code).join(", "));
  check(`${sample.id}: every question substantively answered`, rubric.unanswered.length === 0, rubric.unanswered.join(" / "));
  check(
    `${sample.id}: no per-answer concern`,
    rubric.turnFeedback.every((turn) => turn.concerns.length === 0),
    rubric.turnFeedback.map((turn) => turn.concerns.join("+")).join(" | ")
  );
  check(`${sample.id}: every answer has 25+ words (rubric minimum is 12)`, answers.every((answer) => words(answer.text) >= 25));
  check(
    `${sample.id}: funding and home ties are each stated in their own answer`,
    rubric.turnFeedback.some((turn) => turn.evidence.includes("funding")) && rubric.turnFeedback.some((turn) => turn.evidence.includes("home_ties"))
  );
  check(`${sample.id}: country code exists in the speaking assistant`, VISA_COUNTRIES.some((country) => country.code === sample.countryCode));
  check(`${sample.id}: one structural role per Q/A pair`, sample.roles.length === 5);
}

// ---------------------------------------------------------------------------
section("3. Country routing used by the Visa Center and the result screen");

const countries = Object.keys(VISA_SAMPLE_ID_BY_COUNTRY) as VisaSampleCountry[];
check("USA, Germany, South Korea and the UK each have exactly one transcript", ["US", "DE", "KR", "UK"].every((code) => rows.filter(({ sample }) => sample.countryCode === code).length === 1));
check(
  "VISA_SAMPLE_ID_BY_COUNTRY points at real transcripts for the same country",
  countries.every((code) => rows.some(({ sample }) => sample.id === VISA_SAMPLE_ID_BY_COUNTRY[code] && sample.countryCode === code))
);
check(
  "typed country names in en/uz/ru resolve to the right transcript",
  visaSampleCountryFor("Germaniya") === "DE" &&
    visaSampleCountryFor("сша") === "US" &&
    visaSampleCountryFor("United Kingdom") === "UK" &&
    visaSampleCountryFor("Janubiy Koreya") === "KR" &&
    visaSampleCountryFor("KR") === "KR"
);
check("an unsupported country selects nothing", visaSampleCountryFor("Canada") === null && visaSampleCountryFor("") === null);

// ---------------------------------------------------------------------------
section("4. Official figures quoted in the transcripts");

const germany = rows.find(({ sample }) => sample.countryCode === "DE")!.sample.text;
const uk = rows.find(({ sample }) => sample.countryCode === "UK")!.sample.text;
check("Germany: blocked account of €11,904 releasing €992 a month (2026 rate)", /11,904 euros/.test(germany) && /992 euros per month/.test(germany));
check("UK: El-yurt umidi's three-year return obligation after a master's", /work in Uzbekistan for 3 years after a master's degree/.test(uk));

console.log("\n  Model transcript scores (src/lib/visaScoring.ts, deterministic):");
for (const { sample, rubric } of rows) {
  const s = rubric.scores;
  console.log(
    `    ${sample.id.padEnd(20)} total ${s.total}/100  purpose ${s.purposeOfStudy} · funding ${s.funding} · ties ${s.homeTies} · intent ${s.nonImmigrantIntent} · detail ${s.specificity} · clarity ${s.languageClarity} · risks ${rubric.risks.length}`
  );
}
console.log(`    rubric ceiling: ${VISA_RUBRIC_CEILING}/100 (measured above)`);

// ---------------------------------------------------------------------------
console.log(`\n${failed === 0 ? "✅" : "❌"} ${passed} passed, ${failed} failed`);
process.exitCode = failed === 0 ? 0 : 1;
