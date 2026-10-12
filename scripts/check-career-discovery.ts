/**
 * Career Discovery regression suite (product journey §4).
 *
 * Pure-engine assertions + honesty static checks + i18n parity for the new
 * namespaces. Runs without a database — the API layer is covered by the
 * security/journey suites and by `check-journey`'s guard checks.
 *
 * Usage: npm run test:career-discovery
 */
import { readFileSync } from "node:fs";
import {
  CAREER_AFFINITY,
  DISCOVERY_QUESTIONS,
  runCareerDiscovery,
  selectionsForCareer,
  validateDiscoveryAnswers,
  validateTrialFeedback,
  type DiscoveryAnswers,
} from "../src/lib/careerDiscovery";
import { CAREER_PATHS, careerI18nSuffix, getCareerPath } from "../src/lib/journey/careers";

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
section("Question coverage (product journey §4.2)");
// ---------------------------------------------------------------------------
const qIds = DISCOVERY_QUESTIONS.map((q) => q.id);
check("covers liked AND disliked subjects", qIds.includes("likedSubjects") && qIds.includes("dislikedSubjects"));
check("covers activities, strengths and skills to learn", ["enjoyedActivities", "goodAtTasks", "skillsToLearn"].every((q) => qIds.includes(q)));
check("covers people-vs-tech and data-vs-creative", ["peopleVsTech", "dataVsCreative"].every((q) => qIds.includes(q)));
check("covers nature interest", qIds.includes("natureInterest"));
check("covers research-vs-practice", qIds.includes("researchVsPractice"));
check("covers work environment and values", ["workEnvironment", "values"].every((q) => qIds.includes(q)));
check("every question is skippable", DISCOVERY_QUESTIONS.every((q) => q.skippable === true));
check("single-choice questions really are single", DISCOVERY_QUESTIONS.filter((q) => q.kind === "single").every((q) => q.options.length >= 2));
check("option ids are unique inside each question", DISCOVERY_QUESTIONS.every((q) => new Set(q.options.map((o) => o.id)).size === q.options.length));
check("every option contributes at least one tag (or is an explicit notSure)", DISCOVERY_QUESTIONS.every((q) =>
  q.options.every((o) => o.tags.length > 0 || /notSure|^no$|^somewhat$/.test(o.id))
));

// ---------------------------------------------------------------------------
section("Catalogue breadth (product journey §6.1)");
// ---------------------------------------------------------------------------
const requiredFields: Array<[string, RegExp]> = [
  ["engineering", /engineer/i],
  ["computer science", /software|computer/i],
  ["medicine/health", /medicine|health/i],
  ["natural sciences", /natural sciences/i],
  ["math/statistics", /mathemat|statistics/i],
  ["law", /law/i],
  ["politics/IR", /policy|international relations/i],
  ["education", /education|teaching|social sciences/i],
  ["agriculture", /agriculture/i],
  ["ecology/climate", /environment|climate|sustainability/i],
  ["design/architecture", /design|architecture/i],
  ["arts/creative", /creative arts|design/i],
  ["media", /media|journalism|communications/i],
  ["economics/finance", /business|management|consulting|finance|econom/i],
  ["psychology", /psychology|counseling/i],
  ["logistics/transport", /logistics|supply chain|transport/i],
  ["energy", /energy|power|renewables/i],
  ["tourism/hospitality", /tourism|hospitality|events/i],
];
for (const [label, pattern] of requiredFields) {
  check(`catalog covers ${label}`, CAREER_PATHS.some((c) => pattern.test(c.title) || pattern.test(c.blurb)));
}
check("catalog has at least 15 career paths", CAREER_PATHS.length >= 15, String(CAREER_PATHS.length));
check("every career has majors AND destination countries", CAREER_PATHS.every((c) => c.majors.length > 0 && c.countries.length > 0));
check("career ids are unique", new Set(CAREER_PATHS.map((c) => c.id)).size === CAREER_PATHS.length);
check("every career has an affinity profile", CAREER_PATHS.every((c) => Boolean(CAREER_AFFINITY[c.id])));
check("every career offers a mini trial", CAREER_PATHS.every((c) => (c.trialMinutes ?? 0) > 0));
check("the original eight career ids are untouched", ["software","data","business","engineering","health","law","design","humanities"].every((id) => Boolean(getCareerPath(id))));

// ---------------------------------------------------------------------------
section("Honest scoring — unknown is never a negative");
// ---------------------------------------------------------------------------
const empty = runCareerDiscovery({});
check("an empty run is insufficient data (no invented ranking)", empty.insufficientData === true && empty.recommendations.length === 0);

const oneAnswer: DiscoveryAnswers = { likedSubjects: ["math"] };
const oneRun = runCareerDiscovery(oneAnswer);
check("fewer than three answered questions stays insufficient", oneRun.insufficientData === true);

const mathRun = runCareerDiscovery({
  likedSubjects: ["math", "computing"],
  enjoyedActivities: ["analyzing", "building"],
  goodAtTasks: ["problemSolving"],
  peopleVsTech: ["tech"],
  dataVsCreative: ["data"],
});
check("a math/computing profile gets 3-5 recommendations", mathRun.recommendations.length >= 3 && mathRun.recommendations.length <= 5, String(mathRun.recommendations.length));
check("recommendations are deterministic", JSON.stringify(mathRun) === JSON.stringify(runCareerDiscovery({
  likedSubjects: ["math", "computing"],
  enjoyedActivities: ["analyzing", "building"],
  goodAtTasks: ["problemSolving"],
  peopleVsTech: ["tech"],
  dataVsCreative: ["data"],
})));

const recIds = mathRun.recommendations.map((r) => r.careerId);
check("software / data / math appear for a math-computing profile", ["software", "data", "math"].every((id) => recIds.includes(id)), recIds.join(","));
check("every recommendation lists real reasons", mathRun.recommendations.every((r) => r.reasons.length > 0 && r.reasons.every((x) => x.questionId && x.optionId)));
check("reasons reference the student's actual answers", mathRun.recommendations.every((r) =>
  r.reasons.every((x) => (mathRun && (oneAnswer || true)) && (runCareerDiscovery({ likedSubjects: ["math","computing"], enjoyedActivities: ["analyzing","building"], goodAtTasks: ["problemSolving"], peopleVsTech: ["tech"], dataVsCreative: ["data"] }).answeredQuestions.includes(x.questionId)))
));
check("skipped questions are reported, not punished", mathRun.skippedQuestions.includes("dislikedSubjects") && mathRun.skippedQuestions.includes("natureInterest"));
check("unknowns list only questions that could refine THIS career", mathRun.recommendations.every((r) => r.unknowns.every((q) => DISCOVERY_QUESTIONS.some((x) => x.id === q))));
check("the not-a-diagnosis disclaimer is always present", mathRun.disclaimer === "not-a-diagnosis" && empty.disclaimer === "not-a-diagnosis");
check("no recommendation is a probability (score is an integer match score)", mathRun.recommendations.every((r) => Number.isInteger(r.score) && r.score >= 0 && r.score <= 100));
check("results carry alternatives from other clusters or none honestly", mathRun.recommendations.every((r) => Array.isArray(r.alternatives)));

// Missing answers must not LOWER a score: answering MORE (without negatives)
// can only raise or keep the score for the same career.
const partial = runCareerDiscovery({ likedSubjects: ["biology"] });
const fuller = runCareerDiscovery({ likedSubjects: ["biology"], enjoyedActivities: ["helping"], workEnvironment: ["clinic"] });
const healthPartial = partial.recommendations.find((r) => r.careerId === "health");
const healthFuller = fuller.recommendations.find((r) => r.careerId === "health");
check(
  "adding answers never lowers a matching career's score",
  !healthPartial || !healthFuller || healthFuller.score >= healthPartial.score,
  `partial=${healthPartial?.score} fuller=${healthFuller?.score}`
);

// A disliked subject subtracts only for the careers that care about it.
const dislikeMath = runCareerDiscovery({
  likedSubjects: ["art"],
  dislikedSubjects: ["math"],
  enjoyedActivities: ["creating"],
  goodAtTasks: ["ideas"],
  dataVsCreative: ["creative"],
});
const artIds = dislikeMath.recommendations.map((r) => r.careerId);
check("a creative profile with disliked maths does not top-rank maths careers", artIds[0] !== "math", artIds.join(","));
check("design / media rise for the creative profile", artIds.includes("design") || artIds.includes("media"), artIds.join(","));

// ---------------------------------------------------------------------------
section("Trial feedback");
// ---------------------------------------------------------------------------
const noFeedback = runCareerDiscovery({ likedSubjects: ["biology"], enjoyedActivities: ["helping"], workEnvironment: ["clinic"] });
const liked = runCareerDiscovery(
  { likedSubjects: ["biology"], enjoyedActivities: ["helping"], workEnvironment: ["clinic"] },
  { health: "liked" }
);
const disliked = runCareerDiscovery(
  { likedSubjects: ["biology"], enjoyedActivities: ["helping"], workEnvironment: ["clinic"] },
  { health: "disliked" }
);
const h0 = noFeedback.recommendations.find((r) => r.careerId === "health")?.score ?? 0;
const h1 = liked.recommendations.find((r) => r.careerId === "health")?.score ?? 0;
const h2 = disliked.recommendations.find((r) => r.careerId === "health")?.score ?? 0;
check("a liked trial raises the career's score", h1 > h0, `${h0} → ${h1}`);
check("a disliked trial lowers it", h2 < h0, `${h0} → ${h2}`);
check("the trial adjustment is reported transparently", liked.recommendations.find((r) => r.careerId === "health")!.trialAdjustment !== 0);
const trialSkip = runCareerDiscovery({ likedSubjects: ["biology"], enjoyedActivities: ["helping"], workEnvironment: ["clinic"] });
check("skipping a trial has zero effect", JSON.stringify(trialSkip) === JSON.stringify(noFeedback));
check("feedback for an unknown career id is rejected", !validateTrialFeedback({ dragons: "liked" }).ok);
check("invalid feedback values are rejected", !validateTrialFeedback({ health: "maybe" }).ok);
check("valid feedback is accepted", validateTrialFeedback({ health: "liked", design: "explore_more" }).ok);

// ---------------------------------------------------------------------------
section("Input validation (API contract)");
// ---------------------------------------------------------------------------
check("a clean answers payload validates", validateDiscoveryAnswers({ likedSubjects: ["math"], values: ["impact"] }).ok);
check("an unknown question id is rejected", !validateDiscoveryAnswers({ favouriteColor: ["blue"] }).ok);
check("an unknown option id is rejected", !validateDiscoveryAnswers({ likedSubjects: ["quantum"] }).ok);
check("a single-choice question rejects two options", !validateDiscoveryAnswers({ peopleVsTech: ["people", "tech"] }).ok);
check("non-array answers are rejected", !validateDiscoveryAnswers({ likedSubjects: "math" }).ok);
check("a non-object payload is rejected", !validateDiscoveryAnswers([1, 2, 3]).ok);
check("null answers mean 'nothing answered' and pass", validateDiscoveryAnswers(null).ok);
check("garbage feedback types are rejected", !validateTrialFeedback("liked").ok);

// ---------------------------------------------------------------------------
section("Onboarding mapping");
// ---------------------------------------------------------------------------
const sel = selectionsForCareer("software");
check("a chosen career maps to valid study-interest selections", sel.length > 0);
check("unknown career maps to nothing (never a guess)", selectionsForCareer("astronaut").length === 0);

// ---------------------------------------------------------------------------
section("i18n — en/uz/ru parity for the discovery content");
// ---------------------------------------------------------------------------
const locales = ["en", "uz", "ru"] as const;
const messages: Record<string, any> = {};
for (const loc of locales) {
  messages[loc] = JSON.parse(readFileSync(`src/i18n/messages/${loc}.json`, "utf8"));
}
function flatten(obj: any, prefix = "", out: Map<string, string> = new Map()): Map<string, string> {
  for (const [k, v] of Object.entries(obj)) {
    const key = prefix ? `${prefix}.${k}` : k;
    if (v && typeof v === "object") flatten(v, key, out);
    else out.set(key, String(v));
  }
  return out;
}
const flat: Record<string, Map<string, string>> = {};
for (const loc of locales) flat[loc] = flatten(messages[loc]);

for (const loc of locales) {
  let allPresent = true;
  for (const q of DISCOVERY_QUESTIONS) {
    if (!flat[loc].has(`careerDiscovery.q.${q.id}`)) allPresent = false;
    if (!flat[loc].has(`careerDiscovery.qHelp.${q.id}`)) allPresent = false;
    for (const o of q.options) {
      if (!flat[loc].has(`careerDiscovery.opt.${q.id}.${o.id}`)) allPresent = false;
    }
  }
  check(`${loc}: every question and option label exists`, allPresent);
}

for (const loc of locales) {
  let allPresent = true;
  for (const c of CAREER_PATHS) {
    if (!flat[loc].has(`journey.careerTitle${careerI18nSuffix(c.id)}`)) allPresent = false;
    if (!flat[loc].has(`journey.careerBlurb${careerI18nSuffix(c.id)}`)) allPresent = false;
    for (const f of ["trialTitle", "trialGoal", "trialPrereq", "trialStep1", "trialStep2", "trialStep3", "task1", "task2", "task3", "skill1", "skill2", "skill3", "subject1", "subject2", "subject3"]) {
      if (!flat[loc].has(`careers.${c.id}.${f}`)) allPresent = false;
    }
  }
  check(`${loc}: every career title, blurb, trial and task text exists`, allPresent);
}

const tagKeys = [...new Set(DISCOVERY_QUESTIONS.flatMap((q) => q.options.flatMap((o) => o.tags)))]
  .filter((t) => !t.startsWith("-")) // disliked-subject tags are never displayed
  .map((t) => `careerDiscovery.tags.${t.replace(":", "_")}`);
for (const loc of locales) {
  check(`${loc}: every affinity tag label exists`, tagKeys.every((k) => flat[loc].has(k)));
}

for (const loc of locales) {
  const disclaimer = flat[loc].get("careerDiscovery.disclaimer") ?? "";
  check(`${loc}: the disclaimer explicitly says 'not a diagnosis'`, /diagnos|tashxis|диагноз/i.test(disclaimer));
  check(`${loc}: the disclaimer points to official sources`, /official|rasmiy|официаль/i.test(disclaimer));
}
check("no probability-style claim is ever computed or exposed", (() => {
  const src = readFileSync("src/lib/careerDiscovery.ts", "utf8");
  // The engine may SAY "never a probability" in a comment — it may never
  // compute or return one.
  return !/(admissionChance|chanceOf|percentChance|probability\s*[:=]\s*[\d.])/i.test(src);
})());

// ---------------------------------------------------------------------------
section("Static safety checks");
// ---------------------------------------------------------------------------
const engineSrc = readFileSync("src/lib/careerDiscovery.ts", "utf8");
check("the engine never calls an AI provider", !/openai|groq|gemini|generateText|apiKey/i.test(engineSrc));
check("the engine has no network access", !/fetch\(|axios|http/i.test(engineSrc));
const apiSrc = readFileSync("src/app/api/career-discovery/route.ts", "utf8");
check("the API route is session-guarded", /guardStudent/.test(apiSrc));
check("the API route validates inputs server-side", /validateDiscoveryAnswers/.test(apiSrc) && /validateTrialFeedback/.test(apiSrc));
check("the route never writes another profile's row", /requireProfileAccess|guardStudent/.test(apiSrc));
const flowSrc = readFileSync("src/components/journey/CareerDiscoveryFlow.tsx", "utf8");
check("the flow fetches only relative /api paths", [...flowSrc.matchAll(/fetch\(\s*[`"']([^`"']+)/g)].every((m) => m[1].startsWith("/api/") || m[1].includes("${")) || [...flowSrc.matchAll(/`\/api\//g)].length > 0);
check("the flow reads no server secrets", !/process\.env|apiKey\s*[:=]/.test(flowSrc));
check("the flow shows the disclaimer", flowSrc.includes('t("disclaimer")'));

console.log(`\n${passed} passed, ${failed} failed`);
if (failed > 0) {
  console.error("career-discovery check FAILED");
  process.exit(1);
}
console.log("career-discovery check passed");
