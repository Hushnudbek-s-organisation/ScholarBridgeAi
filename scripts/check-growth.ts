/**
 * Growth-features regression test — deterministic, no DB, no network.
 *
 * Covers the pure logic behind the features adapted from CollegeVine,
 * ApplyBoard, ScholarshipOwl, Crimson and AdmitSee/AdmitYogi:
 *   - "Your path" journey (step checks, current step, admin overrides)
 *   - section-help overrides
 *   - Scholarship Autopilot tags / priority / recurring deadlines / similar
 *   - Admission-story "twin" score
 *   - Goal steps & progress
 *   - story input sanitising (never exposes profileId / admin notes)
 *   - navigation groups & i18n coverage of the new sections
 *   - structural: every growth API route is guarded
 *
 * Run:  npm run test:growth
 */
process.env.DATABASE_URL = "postgresql://x:x@localhost:5432/x"; // dummy — no queries are executed
process.env.SESSION_SECRET = "test-session-secret-that-is-long-enough-1234567890";

import assert from "node:assert/strict";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import {
  HELP_SECTIONS,
  JOURNEY_STEPS,
  MAX_ACTIVE_GOALS,
  SEED_ANSWER_PROMPTS,
  SEED_CHECKLIST_ITEMS,
  SEED_GOAL_TEMPLATES,
  parseJourneyOverrides,
  parseSectionHelp,
  resolveJourneySteps,
} from "../src/lib/growth/defaults";
import {
  autopilotPriority,
  autopilotTags,
  buildJourney,
  cleanList,
  essayListed,
  goalProgress,
  nextExpectedDeadline,
  parseSteps,
  profileCompleteness,
  similarScholarships,
  twinScore,
  type AutopilotScholarship,
  type JourneyCounts,
} from "../src/lib/growth/logic";
import { NAV_GROUPS, NAV_SECTIONS, resolveNavTarget } from "../src/lib/navSections";
import { profileCompletenessRatio } from "../src/lib/chancing";

let passed = 0;
const failures: string[] = [];
function check(name: string, fn: () => void) {
  try {
    fn();
    passed++;
    console.log(`  ✓ ${name}`);
  } catch (err) {
    failures.push(`${name} — ${(err as Error).message}`);
    console.log(`  ✗ ${name} — ${(err as Error).message}`);
  }
}

const NOW = new Date("2026-09-27T12:00:00Z");
const zero: JourneyCounts = {
  completeness: 0,
  savedUniversities: 0,
  savedScholarships: 0,
  appliedScholarships: 0,
  answers: 0,
  essays: 0,
  applications: 0,
  visaSessions: 0,
  checklistDone: 0,
  checklistTotal: 14,
};

console.log("\nJourney");
check("8 built-in steps, unique ids", () => {
  assert.equal(JOURNEY_STEPS.length, 8);
  assert.equal(new Set(JOURNEY_STEPS.map((s) => s.id)).size, 8);
});
check("new student: step 1 is current, 0%", () => {
  const j = buildJourney(resolveJourneySteps([]), zero);
  assert.equal(j.currentId, "profile");
  assert.equal(j.percent, 0);
  assert.equal(j.steps.filter((s) => s.current).length, 1);
});
check("current step = first not-done step", () => {
  const j = buildJourney(resolveJourneySteps([]), { ...zero, completeness: 80, savedUniversities: 6 });
  assert.equal(j.currentId, "funding");
  assert.equal(j.doneCount, 3);
});
check("everything done → no current step, 100%", () => {
  const j = buildJourney(resolveJourneySteps([]), {
    completeness: 100,
    savedUniversities: 8,
    savedScholarships: 2,
    appliedScholarships: 2,
    answers: 2,
    essays: 1,
    applications: 1,
    visaSessions: 1,
    checklistDone: 14,
    checklistTotal: 14,
  });
  assert.equal(j.currentId, null);
  assert.equal(j.percent, 100);
});
check("admin overrides: order, hide, custom text; unknown ids dropped", () => {
  const o = parseJourneyOverrides(
    JSON.stringify([{ id: "visa", title: "Viza!" }, { id: "profile", enabled: false }, { id: "hack" }, { id: "visa" }])
  );
  assert.deepEqual(o.map((x) => x.id), ["visa", "profile"]);
  const steps = resolveJourneySteps(o);
  assert.equal(steps[0].id, "visa");
  assert.equal(steps[0].title, "Viza!");
  assert.equal(steps.length, 8, "untouched steps are kept");
  const j = buildJourney(steps, zero);
  assert.equal(j.total, 7, "hidden step is not counted");
});
check("garbage override JSON is ignored", () => {
  assert.deepEqual(parseJourneyOverrides("{nope"), []);
  assert.deepEqual(parseJourneyOverrides('{"a":1}'), []);
});
check("section help: only known sections survive", () => {
  const h = parseSectionHelp(JSON.stringify({ dashboard: { enabled: false }, evil: { text: "x" }, vault: { text: "Hi" } }));
  assert.equal(h.dashboard?.enabled, false);
  assert.equal(h.vault?.text, "Hi");
  assert.equal((h as Record<string, unknown>).evil, undefined);
});

console.log("\nScholarship Autopilot");
const base: AutopilotScholarship = {
  id: 1,
  title: "A",
  provider: "P",
  country: "Germany",
  coverageType: "Full funding",
  amountUsdValue: 20000,
  deadlineDate: "2026-10-10",
  degreeLevels: '["Master"]',
  eligibleMajors: '["Computer Science"]',
  requirements: "Transcript, CV",
  requiredDocuments: null,
  recurrence: "annual",
  matchScore: 70,
};
check("closing soon + full funding tags", () => {
  const t = autopilotTags(base, NOW);
  assert.equal(t.closingSoon, true);
  assert.equal(t.fullFunding, true);
  assert.equal(t.daysLeft, 14, "deadline day counts until 23:59 UTC");
});
check("essay detection only from published text", () => {
  assert.equal(essayListed(base), false);
  assert.equal(essayListed({ ...base, requirements: "Motivation letter and CV" }), true);
  assert.equal(essayListed({ ...base, requiredDocuments: '["Statement of purpose"]' }), true);
});
check("closed recurring scholarship → expected next date, marked reopens", () => {
  const s = { ...base, deadlineDate: "2026-03-01" };
  const t = autopilotTags(s, NOW);
  assert.equal(t.closed, true);
  assert.equal(t.reopens, true);
  assert.equal(t.expectedDeadline, "2027-03-01");
  assert.equal(nextExpectedDeadline("2026-03-01", "biannual", NOW), "2027-03-01");
  assert.equal(nextExpectedDeadline("2026-03-01", "none", NOW), null);
});
check("closed one-off scholarship drops out (priority < 0)", () => {
  assert.ok(autopilotPriority({ ...base, deadlineDate: "2026-03-01", recurrence: "none" }, NOW) < 0);
});
check("open urgent scholarship outranks a reopening one", () => {
  const open = autopilotPriority(base, NOW);
  const reopening = autopilotPriority({ ...base, deadlineDate: "2026-03-01" }, NOW);
  assert.ok(open > reopening, `${open} > ${reopening}`);
});
check("similar suggestions exclude already-decided ones", () => {
  const b = { ...base, id: 2, title: "B" };
  const c = { ...base, id: 3, title: "C", country: "Japan", coverageType: "Partial", eligibleMajors: '["Art"]', degreeLevels: '["PhD"]' };
  const r = similarScholarships([base], [base, b, c], new Set([1]));
  assert.deepEqual(r.map((x) => x.scholarship.id), [2]);
  assert.equal(r[0].basedOn, "A");
  assert.equal(similarScholarships([base], [b], new Set([2])).length, 0);
});

console.log("\nAdmission stories — twin score");
check("identical profile scores high with reasons", () => {
  const me = { major: "Computer Science", degreeLevel: "Master", gpa: 3.7, gpaScale: 4, ielts: 7, preferredCountries: ["Germany"], homeCountry: "Uzbekistan" };
  const r = twinScore(me, { ...me, admittedCountry: "Germany" });
  assert.ok(r.score >= 90, `score ${r.score}`);
  for (const code of ["same_field", "same_degree", "similar_gpa", "similar_english", "target_country"]) assert.ok(r.reasons.includes(code), code);
});
check("unrelated profile scores low", () => {
  const r = twinScore({ major: "Medicine", degreeLevel: "Bachelor", gpa: 2.5, gpaScale: 4 }, { major: "Law", degreeLevel: "PhD", gpa: 4, gpaScale: 4 });
  assert.ok(r.score < 30, `score ${r.score}`);
});
check("GPA on different scales is normalised", () => {
  const r = twinScore({ gpa: 90, gpaScale: 100 }, { gpa: 3.6, gpaScale: 4 });
  assert.ok(r.reasons.includes("similar_gpa"));
});
check("cleanList trims, dedupes empties and caps length", () => {
  const l = cleanList(["  a ", "", "b".repeat(500), 5, null], 12, 120);
  assert.equal(l[0], "a");
  assert.ok(l.every((x) => x.length <= 120));
  assert.ok(!l.includes(""));
});

console.log("\nGoals");
check("steps parse from strings / objects, capped", () => {
  const s = parseSteps(JSON.stringify(["x", { text: "y", done: true }, "", ...Array(30).fill("z")]));
  assert.equal(s[0].text, "x");
  assert.equal(s[1].done, true);
  assert.ok(s.length <= 15);
  assert.deepEqual(parseSteps("not json"), []);
});
check("progress percent", () => {
  assert.equal(goalProgress([]), 0);
  assert.equal(goalProgress([{ text: "a", done: true }, { text: "b", done: false }, { text: "c", done: false }]), 33);
});
check("focus rule is 6 active goals", () => assert.equal(MAX_ACTIVE_GOALS, 6));

console.log("\nNavigation, seeds & i18n");
check("every section belongs to a known group", () => {
  for (const s of NAV_SECTIONS) assert.ok((NAV_GROUPS as readonly string[]).includes(s.group), s.id);
});
check("new features are still reachable and still carry the NEW badge", () => {
  // These features used to be their own sections; they are tabs now, so check
  // the destination the tab lives in. The badge stays on the feature — badges
  // never create destinations and never disappear in a reorganisation.
  for (const id of ["autopilot", "goals", "stories", "vault", "departure"]) {
    const target = resolveNavTarget(id);
    assert.ok(target, `${id} no longer resolves`);
    const owner = NAV_SECTIONS.find((x) => x.id === target!.section);
    assert.ok(owner, `${id} → unknown section ${target!.section}`);
    assert.ok(owner!.isNew || owner!.panes.some((pp) => pp.isNew), `NEW badge lost on ${id} (${owner!.id})`);
  }
});
const msgs = Object.fromEntries(
  ["en", "uz", "ru"].map((l) => [l, JSON.parse(readFileSync(`src/i18n/messages/${l}.json`, "utf8"))])
) as Record<string, Record<string, Record<string, unknown>>>;
check("every journey step and help section is translated in en/uz/ru", () => {
  for (const l of ["en", "uz", "ru"]) {
    const steps = (msgs[l].journey as { steps: Record<string, { title: string; desc: string }> }).steps;
    for (const s of JOURNEY_STEPS) assert.ok(steps[s.id]?.title && steps[s.id]?.desc, `${l} journey.${s.id}`);
    for (const h of HELP_SECTIONS) assert.ok(typeof msgs[l].help[h] === "string", `${l} help.${h}`);
  }
});
check("every seed catalogue text has a uz/ru translation", () => {
  const n =
    SEED_GOAL_TEMPLATES.reduce((a, g) => a + 2 + g.steps.length, 0) +
    SEED_ANSWER_PROMPTS.length * 2 +
    SEED_CHECKLIST_ITEMS.reduce((a, c) => a + 1 + (c.description ? 1 : 0), 0);
  for (const l of ["en", "uz", "ru"]) assert.equal(Object.keys(msgs[l].growthSeed).length, n, l);
});

console.log("\nStructural");
function walk(dir: string, out: string[] = []) {
  for (const e of readdirSync(dir)) {
    const p = join(dir, e);
    if (statSync(p).isDirectory()) walk(p, out);
    else if (e === "route.ts") out.push(p);
  }
  return out;
}
check("every growth student route uses guardStudent", () => {
  for (const r of ["journey", "autopilot", "vault", "goals", "departure"]) {
    const src = readFileSync(`src/app/api/${r}/route.ts`, "utf8");
    assert.ok(src.includes("guardStudent"), r);
  }
});
check("every growth admin route is admin-guarded", () => {
  for (const r of ["stories", "goal-templates", "answer-prompts", "checklist", "guide", "overview"]) {
    const src = readFileSync(`src/app/api/admin/${r}/route.ts`, "utf8");
    assert.ok(src.includes("guardAdmin") || src.includes("makeAdminCrud"), r);
  }
  const crud = readFileSync("src/lib/growth/adminCrud.ts", "utf8");
  assert.equal((crud.match(/guardAdmin\(req/g) ?? []).length, 4, "GET/POST/PUT/DELETE all guarded");
});
check("public story shape never leaks profileId or adminNote", () => {
  const src = readFileSync("src/lib/growth/stories.ts", "utf8");
  const body = src.slice(src.indexOf("export function publicStory"));
  const fn = body.slice(0, body.indexOf("\n}\n"));
  assert.ok(!/profileId\s*:/.test(fn) && !/adminNote/.test(fn));
});
check("no growth route builds SQL by string concatenation", () => {
  const routes = walk("src/app/api").filter((p) => /(journey|autopilot|vault|goals|departure|stories|goal-templates|answer-prompts|checklist|guide|overview)/.test(p));
  for (const p of routes) assert.ok(!/sql\.raw\(|`\s*SELECT .*\$\{/i.test(readFileSync(p, "utf8")), p);
});

// ---------------------------------------------------------------------------
// One definition of "profile completeness" for the whole product.
// ---------------------------------------------------------------------------
// The journey + dashboard + study plan (this module) and the readiness /
// chancing / referral engines used to count different checklists, so the same
// profile showed 44 % in the journey bar and 42 % in the dashboard. They now
// share one function; these asserts keep it that way.
console.log("\nProfile completeness — single definition");

const richProfile = {
  gpa: 3.6,
  gpaScale: 4,
  ieltsScore: 7,
  satScore: 1400,
  country: "Uzbekistan",
  targetMajor: "Computer Science",
  budgetAnnualUsd: 25000,
  careerGoal: "ML engineer",
  graduationYear: 2027,
  leadership: '["Robotics club captain"]',
  awards: '["National olympiad bronze"]',
  extracurriculars: '["Robotics"]',
};
const sparseProfile = { gpa: 3.2 };

check("the journey and the chancing engine agree on a rich profile", () => {
  assert.equal(
    profileCompleteness(richProfile),
    Math.round(profileCompletenessRatio(richProfile as never) * 100)
  );
});
check("they agree on a sparse profile too", () => {
  assert.equal(
    profileCompleteness(sparseProfile),
    Math.round(profileCompletenessRatio(sparseProfile as never) * 100)
  );
});
check("no profile → 0", () => assert.equal(profileCompleteness(null), 0));
check("a fully filled profile reaches 100", () =>
  assert.equal(profileCompleteness(richProfile), 100));
check("more data never scores lower than less data", () =>
  assert.ok(profileCompleteness(sparseProfile) < profileCompleteness(richProfile)));

if (failures.length) {
  console.log(`\ngrowth test FAILED: ${failures.length} failure(s)`);
  process.exit(1);
}
console.log(`\ngrowth test passed (${passed} assertions)`);
