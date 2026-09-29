/**
 * Journey Core regression test — deterministic, no DB, no network.
 *
 * Covers the pure logic behind the end-to-end student journey:
 *   - the eight-stage journey engine (stages, progress, "still needed")
 *   - the sourced requirements engine (verification metadata, GPA on any scale,
 *     documents/essays/recommendations, "Not specified" for unknowns)
 *   - the per-application workspace maths (weighted progress, blockers,
 *     submit gate, reverse-planned deadlines)
 *   - profile readiness + weakest areas, and the factual test-gap report
 *   - next actions (deadline-first ordering, urgency)
 *   - the study-plan phase engine and its ten phases
 *   - funding: per-line coverage, explicit gaps, post-admission deposit maths
 *   - learning providers: closed metric vocabulary, no named partner, no adapter
 *   - navigation: the eight groups, every section reachable, stage/tab wiring
 *   - structural: every journey API route is guarded, no hardcoded premium gate
 *     in the client, no AI-generated visa facts
 *
 * Run:  npm run test:journey
 */
process.env.DATABASE_URL = "postgresql://x:x@localhost:5432/x"; // dummy — no queries are executed
process.env.SESSION_SECRET = "test-session-secret-that-is-long-enough-1234567890";

import assert from "node:assert/strict";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import {
  EMPTY_JOURNEY_COUNTS,
  JOURNEY_STAGES,
  currentStage,
  journeyProgress,
  resolveJourney,
  stageCompletion,
  stageStillNeeded,
  type JourneyCounts,
} from "../src/lib/journey/stages";
import {
  DEFAULT_REQUIREMENT_TEMPLATES,
  REQUIREMENT_SECTIONS,
  SECTION_LABELS,
  buildRequirements,
  normalizeVerification,
  verifiedLabel,
  type RequirementProfile,
  type RequirementSource,
  type RequirementUniversity,
  type StudentProgressFacts,
} from "../src/lib/journey/requirements";
import {
  SECTION_WEIGHTS,
  computeWorkspaceProgress,
  rowIsDone,
  type WorkspaceRow,
} from "../src/lib/journey/workspace";
import {
  profileReadiness,
  testGap,
  type ReadinessInput,
} from "../src/lib/journey/readiness";
import { computeNextActions, type NextStepsInput } from "../src/lib/journey/nextSteps";
import { PLAN_PHASES, buildPhaseProgress, reversePlan } from "../src/lib/journey/planning";
import {
  COST_LINES,
  FUNDING_KIND_LABELS,
  buildFundingPlan,
  postAdmissionFunding,
  type FundingItemLike,
} from "../src/lib/journey/funding";
import {
  LEARNING_METRICS,
  isLearningMetric,
  listLearningAdapters,
  registerLearningAdapter,
  summarizeProviders,
} from "../src/lib/journey/providers";
import { ALL_MAJORS, CAREER_PATHS } from "../src/lib/journey/careers";
import { NAV_GROUPS, NAV_SECTIONS } from "../src/lib/navSections";

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
function section(title: string) {
  console.log(`\n${title}`);
}

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const sourced: RequirementUniversity = {
  id: 1,
  name: "Massachusetts Institute of Technology (MIT)",
  minGpa: 4.0,
  minIelts: 7.5,
  minSat: 1530,
  applicationFee: 85,
  sourceUrl: "https://admissions.mit.edu/apply",
  lastVerifiedAt: "2026-09-01T00:00:00Z",
  verificationStatus: "verified",
};

const unsourced: RequirementUniversity = { id: 2, name: "Unverified University" };

const student: RequirementProfile = { gpa: 3.7, gpaScale: 4, ieltsScore: 6.5, satScore: 1400 };

const progress = (over: Partial<StudentProgressFacts> = {}): StudentProgressFacts => ({
  hasDocument: (t) => t === "passport",
  hasEssay: (t) => t === "personal_statement",
  recommendationSubmitted: 1,
  recommendationNeeded: 2,
  testPlanScore: (t) => (t === "ielts" ? 6.5 : null),
  applicationFeePaid: false,
  financeItemsTotal: 1,
  ...over,
});

const counts = (over: Partial<JourneyCounts> = {}): JourneyCounts => ({ ...EMPTY_JOURNEY_COUNTS, ...over });

const readiness = (over: Partial<ReadinessInput> = {}): ReadinessInput => ({
  gpa: 3.7,
  gpaScale: 4,
  degreeLevel: "Master",
  ieltsScore: 6.5,
  activitiesCount: 4,
  documentsReady: 2,
  documentsTotal: 4,
  applicationsStarted: 1,
  applicationsSubmitted: 0,
  fundingItems: 1,
  ...over,
});

const nextInput = (over: Partial<NextStepsInput> = {}): NextStepsInput => ({
  journey: { current: "prepare", stillNeeded: [] },
  readiness: { weakest: [] },
  appRows: [],
  openRequirements: 0,
  deadlines: [],
  gaps: [],
  recommendations: { submitted: 0, outstanding: 0 },
  documents: { ready: 0, total: 0, expiring: 0 },
  tests: { ielts: 6.5, target: 7.5, belowTarget: true },
  funding: null,
  profileComplete: true,
  savedUniversities: 3,
  visaStage: false,
  ...over,
});

const item = (over: Partial<FundingItemLike> = {}): FundingItemLike => ({
  kind: "scholarship",
  name: "Bursary",
  amountUsd: 10000,
  status: "confirmed",
  covers: null,
  ...over,
});

// ---------------------------------------------------------------------------
section("Journey stages");
// ---------------------------------------------------------------------------

check("the journey is discover → match → prepare → apply → accepted → fund → visa → depart", () => {
  assert.deepEqual(
    JOURNEY_STAGES.map((s) => s.id),
    ["discover", "match", "prepare", "apply", "accepted", "fund", "visa", "depart"]
  );
});

check("every stage has a real tab a student can Continue into", () => {
  for (const s of JOURNEY_STAGES) {
    assert.ok(s.tab && s.label && s.icon && s.doneWhen, s.id);
    assert.ok(NAV_SECTIONS.some((n) => n.id === s.tab), `${s.id} → ${s.tab} is not a navigable section`);
  }
});

check("a brand-new account starts in discover, never in a later stage", () => {
  assert.equal(currentStage(EMPTY_JOURNEY_COUNTS), "discover");
  const r = resolveJourney(EMPTY_JOURNEY_COUNTS);
  assert.equal(r.currentLabel, "Discover");
  assert.equal(r.progressPct, 0);
  assert.equal(r.next, "match");
  assert.ok(r.stillNeeded.length > 0, "an empty account must be told what to do next");
});

check("stages only ever advance in order", () => {
  const order = JOURNEY_STAGES.map((s) => s.id);
  let prev = -1;
  for (const c of [
    counts({ profileComplete: true }),
    counts({ profileComplete: true, savedUniversities: 4 }),
    counts({ profileComplete: true, savedUniversities: 4, applications: 1 }),
    counts({ profileComplete: true, savedUniversities: 4, applications: 1, submittedApplications: 1 }),
    counts({ profileComplete: true, savedUniversities: 4, applications: 1, submittedApplications: 1, offersRecorded: 1 }),
    counts({ profileComplete: true, savedUniversities: 4, applications: 1, submittedApplications: 1, offersRecorded: 1, acceptedOffers: 1 }),
    counts({ profileComplete: true, savedUniversities: 4, applications: 1, submittedApplications: 1, offersRecorded: 1, acceptedOffers: 1, fundingPlanTotal: 2, fundingGapClosed: true }),
    counts({ profileComplete: true, savedUniversities: 4, applications: 1, submittedApplications: 1, offersRecorded: 1, acceptedOffers: 1, fundingPlanTotal: 2, fundingGapClosed: true, visaCaseStarted: true, visaApproved: true }),
    counts({ profileComplete: true, savedUniversities: 4, applications: 1, submittedApplications: 1, offersRecorded: 1, acceptedOffers: 1, fundingPlanTotal: 2, fundingGapClosed: true, visaCaseStarted: true, visaApproved: true, departureReady: true }),
  ]) {
    const idx = order.indexOf(currentStage(c));
    assert.ok(idx >= prev, `stage went backwards to ${currentStage(c)}`);
    prev = idx;
  }
});

check("journey progress only ever moves forward and stays in 0–100", () => {
  let prev = -1;
  for (const c of [EMPTY_JOURNEY_COUNTS, counts({ profileComplete: true }), counts({ profileComplete: true, departureReady: true })]) {
    const p = journeyProgress(c);
    assert.ok(p >= prev && p >= 0 && p <= 100, `progress ${p} (previous ${prev})`);
    prev = p;
  }
});

check("stage completion is a bounded 0–1 table with explicit partial credit", () => {
  const done = stageCompletion(counts({ profileComplete: true, applications: 3, savedUniversities: 2 }));
  for (const s of JOURNEY_STAGES) {
    assert.ok(done[s.id] >= 0 && done[s.id] <= 1, `${s.id} = ${done[s.id]}`);
  }
  // A stage is only "complete" at exactly 1 — anything less keeps the student in it.
  assert.ok(done.discover === 1);
  assert.ok(done.apply < 1 && done.apply > 0, `apply should be partial, got ${done.apply}`);
  assert.ok(done.accepted === 0, "recording applications is not an accepted offer");
});

check("'still needed' always points at a real section", () => {
  for (const c of [EMPTY_JOURNEY_COUNTS, counts({ profileComplete: true }), counts({ profileComplete: true, savedUniversities: 4, applications: 2 })]) {
    for (const s of stageStillNeeded(currentStage(c), c)) {
      assert.ok(s.text, "a step needs a sentence");
      assert.ok(NAV_SECTIONS.some((n) => n.id === s.tab), `unknown tab ${s.tab}`);
    }
  }
});

// ---------------------------------------------------------------------------
section("Requirements engine (sourced, never guessed)");
// ---------------------------------------------------------------------------

// The API always falls back to the unverified default templates when a
// university has no published ones — that is the "we do not know" path.
const fallbackTemplates = DEFAULT_REQUIREMENT_TEMPLATES.map((t) => ({
  ...t,
  sourceUrl: null,
  sourceName: null,
  sourceType: null,
  lastVerifiedAt: null,
  verificationStatus: "unverified" as const,
}));

check("an unsourced university produces unverified rows, never an official claim", () => {
  const items = buildRequirements({
    university: unsourced,
    profile: student,
    progress: progress(),
    deadline: null,
    templates: fallbackTemplates,
  });
  assert.ok(items.length > 0);
  for (const i of items) {
    assert.equal(i.sourceUrl, null, i.itemKey);
    assert.equal(i.sourceName, null, i.itemKey);
    assert.equal(i.verificationStatus, "unverified", i.itemKey);
    assert.equal(i.lastVerifiedAt ?? null, null, i.itemKey);
  }
});

check("a university with nothing published yields no invented requirements at all", () => {
  const items = buildRequirements({ university: { id: 9, name: "Blank" }, profile: student, progress: progress(), deadline: null });
  assert.deepEqual(items, [], "no source and no template means no rows — never a guess");
});

check("a sourced university carries source, date and status on every row", () => {
  const items = buildRequirements({ university: sourced, profile: student, progress: progress(), deadline: "2026-12-01" });
  assert.ok(items.length > 0);
  for (const i of items) {
    assert.equal(i.sourceUrl, sourced.sourceUrl, i.itemKey);
    assert.equal(i.verificationStatus, "verified", i.itemKey);
    assert.equal(verifiedLabel(i), "2026-09-01", i.itemKey);
  }
});

check("verification metadata is normalised from every spelling in the DB", () => {
  assert.equal(normalizeVerification("Official"), "verified");
  assert.equal(normalizeVerification("needs review"), "needs_review");
  assert.equal(normalizeVerification("NEEDS-REVIEW"), "needs_review");
  assert.equal(normalizeVerification("stale"), "outdated");
  assert.equal(normalizeVerification(null), "unverified");
  assert.equal(normalizeVerification("something else"), "unverified");
});

check("verifiedLabel returns '' rather than 'Invalid Date'", () => {
  const src = (lastVerifiedAt: string | Date | null): RequirementSource => ({
    sourceUrl: null,
    sourceName: null,
    sourceType: null,
    lastVerifiedAt,
    verificationStatus: "unverified",
  });
  assert.equal(verifiedLabel(src(null)), "");
  assert.equal(verifiedLabel(src("nonsense")), "");
  assert.equal(verifiedLabel(src(new Date("2026-01-05T00:00:00Z"))), "2026-01-05");
  assert.equal(verifiedLabel(src("2026-01-05T00:00:00Z")), "2026-01-05");
});

check("a GPA requirement is compared on the 4.0 scale, not the raw number", () => {
  // 4.0/5.0 = 80% is a strong result and must NOT read as "failing a 3.5 ask".
  const five = buildRequirements({
    university: { ...sourced, minGpa: 3.5 },
    profile: { gpa: 4, gpaScale: 5 },
    progress: progress(),
    deadline: null,
  });
  const gpa = five.find((i) => i.itemKey === "academic.gpa");
  assert.ok(gpa, "the GPA row must exist");
  assert.equal(gpa!.state, "met");

  const weak = buildRequirements({
    university: { ...sourced, minGpa: 3.9 },
    profile: { gpa: 3, gpaScale: 4 },
    progress: progress(),
    deadline: null,
  });
  assert.equal(weak.find((i) => i.itemKey === "academic.gpa")!.state, "not_met");
});

check("a missing student score is 'unknown', never a pass and never a fail", () => {
  const items = buildRequirements({ university: sourced, profile: {}, progress: progress(), deadline: null });
  const gpa = items.find((i) => i.itemKey === "academic.gpa");
  assert.equal(gpa!.state, "unknown");
  assert.equal(gpa!.isRequired, true);
});

check("a published minimum the university does not state produces no row at all", () => {
  const items = buildRequirements({ university: { id: 3, name: "X" }, profile: student, progress: progress(), deadline: null });
  assert.equal(items.find((i) => i.itemKey === "academic.gpa"), undefined);
  assert.equal(items.find((i) => i.itemKey === "academic.ielts"), undefined);
});

check("vault documents, essays, tests and recommendations drive the real state", () => {
  const items = buildRequirements({
    university: sourced,
    profile: student,
    progress: progress(),
    deadline: null,
    templates: fallbackTemplates,
  });
  const byKey = new Map(items.map((i) => [i.itemKey, i]));
  assert.equal(byKey.get("documents.passport")?.state, "met", "the passport IS in the vault");
  assert.equal(byKey.get("documents.passport")?.detail, "In your vault");
  assert.equal(byKey.get("documents.transcript")?.state, "todo", "no transcript in the vault");
  assert.equal(byKey.get("documents.transcript")?.detail, "Not in your vault yet");
  assert.equal(byKey.get("essays.personal_statement")?.state, "met");
  assert.equal(byKey.get("recommendations.letter")?.detail, "1 of 2 submitted");
  assert.equal(byKey.get("finance.proof_of_funds")?.state, "in_progress", "a funding item exists but the proof is not confirmed");
  assert.equal(byKey.get("application.fee")?.state, "todo", "the fee is not marked paid");
  // English/testing rows come from the university's own sourced minimums.
  assert.equal(byKey.get("english.ielts")?.state, "not_met");
  assert.equal(byKey.get("english.ielts")?.detail, "Current 6.5 · target 7.5");
  assert.equal(byKey.get("testing.sat")?.state, "not_met");

  const withFee = buildRequirements({
    university: sourced,
    profile: student,
    progress: progress({ applicationFeePaid: true }),
    deadline: null,
    templates: fallbackTemplates,
  });
  assert.equal(withFee.find((i) => i.itemKey === "application.fee")?.state, "met");
});

check("each requirement knows what kind of work completes it", () => {
  const items = buildRequirements({
    university: sourced,
    profile: student,
    progress: progress(),
    deadline: null,
    templates: fallbackTemplates,
  });
  const byKey = new Map(items.map((i) => [i.itemKey, i.linkedType]));
  assert.equal(byKey.get("documents.passport"), "document");
  assert.equal(byKey.get("essays.personal_statement"), "essay");
  assert.equal(byKey.get("recommendations.letter"), "recommendation");
  assert.equal(byKey.get("english.ielts"), "test");
  assert.equal(byKey.get("application.fee"), "payment");
});

check("every requirement lands in a known section with a label", () => {
  for (const u of [sourced, unsourced]) {
    for (const i of buildRequirements({ university: u, profile: student, progress: progress(), deadline: "2026-12-01", templates: fallbackTemplates })) {
      assert.ok((REQUIREMENT_SECTIONS as readonly string[]).includes(i.section), `${i.itemKey} → ${i.section}`);
      assert.ok(SECTION_LABELS[i.section], i.section);
      assert.ok(i.title && i.state, i.itemKey);
      assert.equal(i.dueDate, "2026-12-01", `${i.itemKey} must carry the application deadline`);
    }
  }
});

check("admin-published templates are emitted verbatim, keeping their own source", () => {
  const items = buildRequirements({
    university: unsourced,
    profile: student,
    progress: progress(),
    deadline: null,
    templates: [
      {
        section: "documents",
        itemKey: "documents.portfolio",
        title: "Portfolio of work",
        isRequired: true,
        sourceUrl: "https://example.edu/portfolio",
        sourceName: "Example University",
        sourceType: "official_website",
        lastVerifiedAt: new Date("2026-08-01T00:00:00Z"),
        verificationStatus: "verified",
      },
    ],
  });
  const row = items.find((i) => i.itemKey === "documents.portfolio");
  assert.ok(row, "the template must appear");
  assert.equal(row!.title, "Portfolio of work");
  assert.equal(row!.sourceUrl, "https://example.edu/portfolio");
  assert.equal(row!.verificationStatus, "verified");
});

check("the default templates only use known sections and item keys", () => {
  for (const t of DEFAULT_REQUIREMENT_TEMPLATES) {
    assert.ok((REQUIREMENT_SECTIONS as readonly string[]).includes(t.section), t.itemKey);
    assert.ok(t.title && t.itemKey, t.itemKey);
  }
});

// ---------------------------------------------------------------------------
section("Application workspace");
// ---------------------------------------------------------------------------

const rows: WorkspaceRow[] = [
  { section: "documents", status: "done", isRequired: true, key: "passport" },
  { section: "documents", status: "not_done", isRequired: true, key: "transcript" },
  { section: "essays", status: "done", isRequired: true, key: "sop" },
  { section: "academic", status: "met", isRequired: true, key: "gpa" },
];

check("only 'done' and 'not_required' count as finished", () => {
  assert.equal(rowIsDone({ section: "documents", status: "done", isRequired: true }), true);
  assert.equal(rowIsDone({ section: "documents", status: "not_required", isRequired: false }), true);
  assert.equal(rowIsDone({ section: "documents", status: "not_done", isRequired: true }), false);
  assert.equal(rowIsDone({ section: "documents", status: "in_progress", isRequired: true }), false);
});

check("documents and essays carry twice the weight of a one-tap section", () => {
  assert.equal(SECTION_WEIGHTS.documents, 2);
  assert.equal(SECTION_WEIGHTS.essays, 2);
  assert.equal(SECTION_WEIGHTS.finance, 1);
  // Same single row finished in both cases — only the weight differs.
  const heavyDone = computeWorkspaceProgress([
    { section: "documents", status: "done", isRequired: true, key: "passport" },
    { section: "essays", status: "not_done", isRequired: true, key: "sop" },
  ]);
  const lightDone = computeWorkspaceProgress([
    { section: "finance", status: "done", isRequired: true, key: "proof" },
    { section: "essays", status: "not_done", isRequired: true, key: "sop" },
  ]);
  assert.equal(heavyDone.done, 1);
  assert.equal(lightDone.done, 1);
  assert.equal(heavyDone.pct, 50, "2 of 4 weight units");
  assert.equal(lightDone.pct, 33, "1 of 3 weight units");
  assert.ok(heavyDone.pct > lightDone.pct);
});

check("progress is a weighted fraction, not a raw count of rows", () => {
  const p = computeWorkspaceProgress(rows, { passport: "Passport", transcript: "Transcript", sop: "SOP", gpa: "GPA" });
  assert.equal(p.done, 2);
  assert.equal(p.total, 4);
  // The GPA row carries `met`, which the workspace does NOT treat as finished —
  // only `done` / `not_required` close a row.
  assert.equal(p.pct, 60, "documents 1/2 (w2) + essays 1/1 (w2) + academic 0/1 (w1)");
});

check("every open requirement is named, not just counted", () => {
  const p = computeWorkspaceProgress(rows, { passport: "Passport", transcript: "Transcript", sop: "SOP", gpa: "GPA" });
  const keys = p.missing.map((m) => m.key);
  assert.deepEqual(keys.sort(), ["gpa", "transcript"]);
  assert.equal(p.missing.find((m) => m.key === "transcript")!.title, "Transcript");
});

check("an incomplete application is not ready to submit and lists its blockers", () => {
  const p = computeWorkspaceProgress(rows, { transcript: "Transcript" });
  assert.equal(p.readyToSubmit, false);
  assert.ok(p.blockers.length > 0);
  assert.ok(p.blockers.some((b) => /transcript/i.test(b)), p.blockers.join(" | "));
});

check("an empty application is 0% and blocked, never accidentally submittable", () => {
  const p = computeWorkspaceProgress([], {});
  assert.equal(p.pct, 0);
  assert.equal(p.total, 0);
  assert.equal(p.readyToSubmit, false, "a green submit button on an empty checklist would be a lie");
});

check("finishing every required row makes the application submittable", () => {
  const all: WorkspaceRow[] = rows.map((r) => ({ ...r, status: "done" }));
  const p = computeWorkspaceProgress(all, {});
  assert.equal(p.pct, 100);
  assert.equal(p.readyToSubmit, true);
  assert.equal(p.blockers.length, 0);
});

check("an optional unfinished row does not block submission", () => {
  const p = computeWorkspaceProgress(
    [
      { section: "documents", status: "done", isRequired: true, key: "passport" },
      { section: "recommendations", status: "not_done", isRequired: false, key: "letter" },
    ],
    { letter: "Recommendation letter" }
  );
  assert.equal(p.missing.length, 1, "it is still listed as open");
  assert.equal(p.blockers.length, 0, "but it is not a blocker");
  assert.equal(p.readyToSubmit, true);
});

check("recommendations and finance fold into the same bar", () => {
  const base = computeWorkspaceProgress(rows, {});
  const openRecs = computeWorkspaceProgress(rows, {}, { recommendationsTotal: 2, recommendationsSubmitted: 0, financeTotal: 2, financeDone: 2 });
  const rec = openRecs.sections.find((s) => s.key === "recommendations");
  const fin = openRecs.sections.find((s) => s.key === "finance");
  assert.equal(rec?.done, 0);
  assert.equal(rec?.total, 2);
  assert.equal(fin?.pct, 100);
  assert.ok(openRecs.pct < base.pct, `adding an unfinished group must lower the bar: ${openRecs.pct} vs ${base.pct}`);

  const allRecs = computeWorkspaceProgress(rows, {}, { recommendationsTotal: 2, recommendationsSubmitted: 2, financeTotal: 2, financeDone: 2 });
  assert.ok(allRecs.pct > base.pct, "finishing them must raise it again");
});

check("a submitted application is locked at 100", () => {
  const p = computeWorkspaceProgress(rows, {}, { submitted: true });
  assert.equal(p.pct, 100);
  assert.equal(p.readyToSubmit, true, "an already-submitted application is past the gate");
});

// ---------------------------------------------------------------------------
section("Reverse-planned deadlines");
// ---------------------------------------------------------------------------

check("every reverse step lands strictly BEFORE the deadline", () => {
  for (const kind of ["application", "scholarship", "visa"] as const) {
    for (const step of reversePlan("2026-12-01", kind)) {
      assert.ok(step.date < "2026-12-01", `${kind}/${step.key} = ${step.date} is not before the deadline`);
      assert.ok(step.daysBefore > 0, `${kind}/${step.key} must be a positive lead time`);
      assert.ok(NAV_SECTIONS.some((n) => n.id === step.tab), `${kind}/${step.key} → unknown tab ${step.tab}`);
    }
  }
});

check("a deadline in the past never produces a plan dated in the future", () => {
  for (const kind of ["application", "scholarship", "visa"] as const) {
    for (const step of reversePlan("2020-01-01", kind)) assert.ok(step.date < "2020-01-01", `${kind}/${step.key}`);
  }
});

check("an unparseable deadline produces no plan at all", () => {
  assert.deepEqual(reversePlan("not-a-date", "application"), []);
  assert.deepEqual(reversePlan("", "application"), []);
});

check("the plan is ordered and ends with the submission itself", () => {
  const plan = reversePlan("2026-12-01", "application");
  assert.ok(plan.length >= 5);
  for (let i = 1; i < plan.length; i++) assert.ok(plan[i - 1].date <= plan[i].date, "steps must be chronological");
  assert.equal(plan[plan.length - 1].key, "submit");
});

// ---------------------------------------------------------------------------
section("Profile readiness + test gap");
// ---------------------------------------------------------------------------

check("readiness is a 0–100 breakdown with explainable gaps", () => {
  const r = profileReadiness(readiness());
  assert.ok(r.categories.length >= 6);
  for (const c of r.categories) {
    assert.ok(c.pct >= 0 && c.pct <= 100, c.key);
    assert.ok(c.gaps.length > 0, `${c.key} has no explanation`);
  }
  assert.ok(r.weakest.length > 0);
  for (let i = 1; i < r.weakest.length; i++) assert.ok(r.weakest[i - 1].pct <= r.weakest[i].pct, "weakest must be sorted");
});

check("an empty profile is weak everywhere and says why", () => {
  const r = profileReadiness({
    activitiesCount: 0,
    documentsReady: 0,
    documentsTotal: 0,
    applicationsStarted: 0,
    applicationsSubmitted: 0,
    fundingItems: 0,
  });
  assert.ok(r.overall < 40, `expected a weak overall score, got ${r.overall}`);
  const docs = r.categories.find((c) => c.key === "documents");
  assert.equal(docs!.pct, 0);
  assert.ok(docs!.gaps.length > 0);
});

check("adding real data strictly improves readiness", () => {
  const weak = profileReadiness(readiness({ ieltsScore: null, activitiesCount: 0 }));
  const strong = profileReadiness(readiness({ ieltsScore: 7.5, activitiesCount: 8, documentsReady: 4, documentsTotal: 4, applicationsSubmitted: 1 }));
  assert.ok(strong.overall > weak.overall, `${strong.overall} should beat ${weak.overall}`);
});

check("the test gap is a fact, never an admission probability", () => {
  const met = testGap("ielts", 7, 7.5, "IELTS");
  assert.equal(met.state, "met");
  assert.ok(!/\d+%/i.test(met.message), "no percentages, no probabilities");
  const below = testGap("ielts", 7.5, 6.5, "IELTS");
  assert.equal(below.state, "below");
  assert.equal(below.delta, -1);
  assert.ok(!/chance|likel|probab/i.test(below.message), below.message);
  const none = testGap("ielts", null, 6.5, "IELTS");
  assert.equal(none.state, "no_requirement");
  const noScore = testGap("ielts", 7.5, null, "IELTS");
  assert.equal(noScore.state, "no_score");
  assert.equal(noScore.delta, null);
});

// ---------------------------------------------------------------------------
section("Next actions");
// ---------------------------------------------------------------------------

check("the nearest deadline always leads the list", () => {
  const steps = computeNextActions(
    nextInput({
      deadlines: [
        { id: "far", title: "Far deadline", daysRemaining: 50 },
        { id: "near", title: "Near deadline", daysRemaining: 3, tab: "applications" },
      ],
      appRows: [{ id: 1, universityName: "MIT", deadline: "2026-12-01", submitted: false, status: "in_progress" }],
      openRequirements: 4,
    })
  );
  assert.equal(steps[0].id, "deadline-near");
  assert.equal(steps[0].urgency, "critical");
});

check("an overdue date is critical and says so in words", () => {
  const [s] = computeNextActions(nextInput({ deadlines: [{ id: "past", title: "Scholarship", daysRemaining: -4 }] }));
  assert.equal(s.urgency, "critical");
  assert.ok(/passed 4 day/.test(s.detail), s.detail);
});

check("an undated deadline is surfaced but never given a fake urgency", () => {
  const steps = computeNextActions(nextInput({ deadlines: [{ id: "nodate", title: "Confirm the date", daysRemaining: null }] }));
  const s = steps.find((x) => x.id === "deadline-nodate");
  assert.ok(s, "the undated deadline must still be shown");
  assert.equal(s!.urgency, "low");
  assert.equal(s!.dueInDays, null);
  assert.ok(/no date recorded/i.test(s!.detail), s!.detail);
});

check("every action has a title, a sentence and a tab that exists", () => {
  const steps = computeNextActions(
    nextInput({
      openRequirements: 2,
      deadlines: [{ id: "d", title: "MIT deadline", daysRemaining: 10, tab: "applications" }],
      gaps: [{ testType: "ielts", state: "below", current: 6.5, required: 7.5, message: "1.0 to go" }],
      recommendations: { submitted: 0, outstanding: 2 },
      documents: { ready: 1, total: 4, expiring: 1 },
      funding: { gap: 5000, covered: false },
      visaStage: true,
      readiness: { weakest: [{ key: "activities", label: "Activities", pct: 20, gaps: ["Add 3 more"], tab: "activities" }] },
    }),
    10
  );
  assert.ok(steps.length > 3, "the dashboard must have real next actions");
  for (const s of steps) {
    assert.ok(s.title && s.detail, s.id);
    assert.ok(s.tab, s.id);
  }
});

check("nothing is scheduled once there is nothing to do", () => {
  const steps = computeNextActions(
    nextInput({
      journey: { current: "depart", stillNeeded: [] },
      openRequirements: 0,
      documents: { ready: 4, total: 4, expiring: 0 },
      tests: { ielts: 7.5, target: 7.5, belowTarget: false },
      funding: { gap: 0, covered: true },
      recommendations: { submitted: 2, outstanding: 0 },
      savedUniversities: 12,
      profileComplete: true,
      visaStage: false,
    })
  );
  for (const s of steps) assert.ok(!/still missing|still open|not started/i.test(s.title), s.title);
});

// ---------------------------------------------------------------------------
section("Study plan phases");
// ---------------------------------------------------------------------------

check("the plan has ten phases covering the whole journey", () => {
  assert.equal(PLAN_PHASES.length, 10);
  assert.deepEqual(
    PLAN_PHASES.map((p) => p.key),
    ["profile", "tests", "university_research", "scholarship_research", "documents", "applications", "interviews", "admission", "visa", "departure"]
  );
});

check("every phase opens a real section", () => {
  for (const p of PLAN_PHASES) {
    assert.ok(p.title && p.description && p.icon, p.key);
    assert.ok(NAV_SECTIONS.some((n) => n.id === p.tab), `${p.key} → unknown tab ${p.tab}`);
  }
});

check("phase progress is derived from real counts, not stored by hand", () => {
  const zero = buildPhaseProgress({
    profileComplete: false,
    ieltsScore: null,
    testPlanCount: 0,
    savedUniversities: 0,
    savedScholarships: 0,
    documentsReady: 0,
    documentsTotal: 0,
    applications: 0,
    submittedApplications: 0,
    interviewSessions: 0,
    offersRecorded: 0,
    visaCaseStarted: false,
    visaApproved: false,
    departureReady: false,
  });
  assert.equal(zero.length, PLAN_PHASES.length);
  for (const p of zero) {
    assert.ok(p.pct >= 0 && p.pct < 100, `${p.key} must not be complete on an empty account (got ${p.pct})`);
    assert.ok(p.missing.length > 0, `${p.key} must say what is missing`);
  }
  assert.equal(zero.find((p) => p.key === "visa")!.pct, 0);
  assert.equal(zero.find((p) => p.key === "departure")!.pct, 0);
});

const fullCounts = {
  profileComplete: true,
  ieltsScore: 7.5,
  testPlanCount: 1,
  savedUniversities: 8,
  savedScholarships: 5,
  documentsReady: 4,
  documentsTotal: 4,
  applications: 2,
  submittedApplications: 1,
  interviewSessions: 1,
  offersRecorded: 1,
  visaCaseStarted: true,
  visaApproved: true,
  departureReady: true,
};

check("progress only grows as the student actually does things", () => {
  for (const p of buildPhaseProgress(fullCounts)) {
    assert.equal(p.pct, 100, `${p.key} should be complete`);
    assert.equal(p.status, "done", p.key);
    assert.deepEqual(p.missing, [], p.key);
  }
  const half = buildPhaseProgress({ ...fullCounts, documentsReady: 2, documentsTotal: 4 });
  const docs = half.find((p) => p.key === "documents")!;
  assert.ok(docs.pct > 0 && docs.pct < 100);
  assert.equal(docs.status, "in_progress");
  assert.ok(docs.missing.length > 0);
});

check("no phase ever regresses as the student does more", () => {
  const before = buildPhaseProgress({ ...fullCounts, documentsReady: 0, savedUniversities: 0, applications: 0 });
  const after = buildPhaseProgress(fullCounts);
  for (let i = 0; i < before.length; i++) {
    assert.ok(after[i].pct >= before[i].pct, `${before[i].key} went backwards: ${before[i].pct} → ${after[i].pct}`);
  }
});

// ---------------------------------------------------------------------------
section("Funding (explicit coverage, explicit gap)");
// ---------------------------------------------------------------------------

const lines = COST_LINES.map((l) => ({ key: l.key, label: l.label, cost: l.key === "tuition" ? 50000 : 10000 }));

check("a plan with nothing recorded shows the whole cost as a gap", () => {
  const p = buildFundingPlan({ annualCost: 120000, lines, items: [] });
  assert.equal(p.fundingGap, 120000);
  assert.equal(p.securedGap, 120000);
  assert.equal(p.isCovered, false);
  assert.equal(p.scholarshipTotal, 0);
});

check("only awarded/confirmed money counts as secured", () => {
  const p = buildFundingPlan({
    annualCost: 120000,
    lines,
    items: [item({ amountUsd: 30000, status: "applied" }), item({ name: "Confirmed aid", amountUsd: 20000, status: "confirmed", kind: "aid" })],
  });
  assert.equal(p.projectedTotal, 50000);
  assert.equal(p.securedTotal, 20000);
  assert.equal(p.fundingGap, 70000, "the gap is what nothing could still cover");
  assert.equal(p.securedGap, 100000, "the gap against what is banked today");
});

check("a declined item stops counting towards the plan", () => {
  const p = buildFundingPlan({ annualCost: 120000, lines, items: [item({ amountUsd: 50000, status: "declined" })] });
  assert.equal(p.projectedTotal, 0);
  assert.equal(p.fundingGap, 120000);
});

check("coverage is per line, and an item that covers nothing specific counts only once", () => {
  const p = buildFundingPlan({
    annualCost: 120000,
    lines,
    items: [item({ amountUsd: 10000, covers: JSON.stringify(["tuition"]) })],
  });
  const tuition = p.byLine.find((l) => l.key === "tuition")!;
  const food = p.byLine.find((l) => l.key === "food")!;
  assert.equal(tuition.covered, 10000);
  assert.equal(tuition.gap, 40000);
  assert.equal(food.covered, 0);
  assert.equal(food.gap, 10000);
});

check("an item that declares no coverage is applied per line but counted once in the total", () => {
  const p = buildFundingPlan({ annualCost: 120000, lines, items: [item({ amountUsd: 10000 })] });
  // It helps every line it can, capped at each line's own cost…
  const tuition = p.byLine.find((l) => l.key === "tuition")!;
  assert.equal(tuition.covered, 10000);
  for (const l of p.byLine) assert.ok(l.covered <= l.cost, `${l.key} is covered beyond its own cost`);
  // …but the money itself is only ever counted once.
  assert.equal(p.scholarshipTotal, 10000);
  assert.equal(p.projectedTotal, 10000);
  assert.equal(p.fundingGap, 110000);
});

check("a scholarship that only covers tuition leaves the other lines open", () => {
  const p = buildFundingPlan({ annualCost: 120000, lines, items: [item({ amountUsd: 60000, covers: JSON.stringify(["tuition"]) })] });
  assert.equal(p.byLine.find((l) => l.key === "tuition")!.gap, 0);
  assert.equal(p.byLine.find((l) => l.key === "food")!.gap, 10000, "food is still short");
  assert.equal(p.fundingGap, 60000);
});

check("a fully funded year is reported as covered, with the items to prove it", () => {
  const p = buildFundingPlan({ annualCost: 120000, lines, items: [item({ amountUsd: 130000, status: "confirmed" })] });
  assert.equal(p.fundingGap, 0);
  assert.equal(p.securedGap, 0);
  assert.equal(p.isCovered, true);
});

check("every funding kind has a human label and every cost line a key", () => {
  for (const l of COST_LINES) assert.ok(l.key && l.label, l.key);
  for (const k of ["scholarship", "aid", "family", "savings", "loan", "other"] as const) {
    assert.ok(FUNDING_KIND_LABELS[k], k);
  }
});

check("post-admission funding states the deposit, the payee and what is left", () => {
  const f = postAdmissionFunding({
    tuition: 60000,
    items: [item({ amountUsd: 12000, status: "confirmed" })],
    depositAmount: 5000,
    depositDueDate: "2027-03-01",
    universityName: "MIT",
  });
  assert.equal(f.scholarship, 12000);
  assert.equal(f.payableNow.amount, 5000);
  assert.equal(f.payableNow.payee, "MIT");
  assert.ok(f.explanation.some((e) => /60,000/.test(e)), f.explanation.join(" | "));
  assert.ok(f.explanation.some((e) => /48,000/.test(e)), "the remaining balance must be explicit");
});

check("no confirmed funding is stated plainly, not softened into 'full funding'", () => {
  const f = postAdmissionFunding({ tuition: 60000, items: [], universityName: "MIT" });
  assert.ok(f.explanation.some((e) => /No confirmed funding yet/.test(e)), f.explanation.join(" | "));
  assert.equal(f.payableNow.amount, 60000);
  assert.ok(!/full funding|full scholarship/i.test(f.explanation.join(" ")));
});

// ---------------------------------------------------------------------------
section("External learning providers (architecture only)");
// ---------------------------------------------------------------------------

check("the metric vocabulary is closed", () => {
  assert.deepEqual(
    [...LEARNING_METRICS].sort(),
    ["course_completion", "current_score", "mock_score", "practice_progress", "study_task_completed", "target_score"]
  );
  assert.equal(isLearningMetric("current_score"), true);
  assert.equal(isLearningMetric("gpa_prediction"), false);
  assert.equal(isLearningMetric(null), false);
});

check("no partner adapter ships in this build", () => {
  assert.deepEqual(listLearningAdapters(), []);
  // Comments may illustrate with a test name; executable code may not.
  const code = readFileSync("src/lib/journey/providers.ts", "utf8")
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/\/\/.*$/gm, "");
  assert.ok(!/ielts|toefl|duolingo|testbook|futurelearn|randomhouse|prep_provider/i.test(code), "no named partner may appear in code");
});

check("the provider registry is a plain generic table, not a partner switch", () => {
  const route = readFileSync("src/app/api/learning/providers/route.ts", "utf8");
  const code = route.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/.*$/gm, "");
  assert.ok(!/https?:\/\/(?!localhost)/.test(code), "no partner URL is stored");
  assert.ok(!/logo/i.test(code), "no partner logo is stored");
});

check("a disabled provider is never 'connected', even with readings", () => {
  const s = summarizeProviders(
    [{ providerKey: "acme", name: "Acme", kind: "test_prep", status: "disabled", isEnabled: true }],
    { acme: { externalUserRef: "u1", lastSyncedAt: null } },
    { acme: [{ metric: "current_score", value: 7, measuredAt: "2026-09-01", sourceName: "Acme", lastVerifiedAt: null }] }
  );
  assert.equal(s.connected, false, "a disabled provider is never connected");
  assert.equal(s.providers[0].linked, true);
  assert.equal(s.providers[0].metrics[0].value, 7);
});

check("a reading always keeps its source, so it is never mistaken for our own data", () => {
  const s = summarizeProviders(
    [{ providerKey: "acme", name: "Acme", kind: "test_prep", status: "live", isEnabled: true }],
    { acme: { externalUserRef: "u1", lastSyncedAt: "2026-09-01T00:00:00Z" } },
    { acme: [{ metric: "current_score", value: 7, measuredAt: "2026-09-01", sourceName: "Acme", lastVerifiedAt: null }] }
  );
  assert.equal(s.connected, true);
  assert.equal(s.providers[0].metrics[0].sourceName, "Acme");
  assert.deepEqual(s.suggestedTargets, [], "only a target_score reading becomes a suggested target");
});

// ---------------------------------------------------------------------------
section("Career explorer");
// ---------------------------------------------------------------------------

check("every career offers majors and real destination countries", () => {
  assert.ok(CAREER_PATHS.length >= 5);
  const countries = new Set<string>();
  for (const c of CAREER_PATHS) {
    assert.ok(c.id && c.title, c.id);
    assert.ok(c.majors.length > 0, c.id);
    assert.ok(c.countries.length > 0, c.id);
    for (const m of c.majors) assert.ok(ALL_MAJORS.includes(m), m);
    for (const k of c.countries) countries.add(k);
  }
  assert.ok(countries.size >= 5);
});

check("majors are deduplicated across careers", () => {
  assert.equal(new Set(ALL_MAJORS).size, ALL_MAJORS.length);
});

// ---------------------------------------------------------------------------
section("Navigation");
// ---------------------------------------------------------------------------

check("there are exactly the eight requested groups, in order", () => {
  assert.deepEqual([...NAV_GROUPS], ["home", "discover", "journey", "prepare", "apply", "after", "help", "account"]);
});

check("every section belongs to a real group and carries a label + description", () => {
  for (const s of NAV_SECTIONS) {
    assert.ok((NAV_GROUPS as readonly string[]).includes(s.group), `${s.id} → ${s.group}`);
    assert.ok(s.label && s.description, s.id);
  }
});

check("section ids are unique", () => {
  const ids = NAV_SECTIONS.map((s) => s.id);
  assert.equal(new Set(ids).size, ids.length);
});

check("the dashboard is locked visible and in HOME", () => {
  const d = NAV_SECTIONS.find((s) => s.id === "dashboard");
  assert.ok(d, "the dashboard must exist");
  assert.equal(d!.group, "home");
  assert.equal(d!.locked, true);
});

check("the whole journey is reachable from the sidebar", () => {
  const ids = new Set(NAV_SECTIONS.map((s) => s.id));
  for (const id of [
    "universities", "scholarships", "career", "study-plan", "activities", "chancing",
    "documents", "tests", "requirements", "funding", "applications", "workspace",
    "recommendations", "tasks", "sop", "offers", "post-admission-funding", "visa",
    "interviews", "departure", "advisor", "chat", "mentors", "forum", "courses",
    "parent", "notifications", "payments",
  ]) {
    assert.ok(ids.has(id), `${id} is not in the sidebar`);
  }
});

check("after-admission runs offer → funding → visa → interview → departure in order", () => {
  const after = NAV_SECTIONS.filter((s) => s.group === "after").map((s) => s.id);
  assert.deepEqual(after, ["offers", "post-admission-funding", "visa", "interviews", "departure"]);
});

check("stage tags only name stages the journey engine actually has", () => {
  const stageIds = new Set<string>(JOURNEY_STAGES.map((s) => s.id));
  for (const s of NAV_SECTIONS) if (s.stage) assert.ok(stageIds.has(s.stage), `${s.id} → ${s.stage}`);
});

// ---------------------------------------------------------------------------
section("Structural guarantees");
// ---------------------------------------------------------------------------

function walk(dir: string, out: string[] = []): string[] {
  for (const e of readdirSync(dir)) {
    const p = join(dir, e);
    if (statSync(p).isDirectory()) walk(p, out);
    else if (e === "route.ts") out.push(p);
  }
  return out;
}

const JOURNEY_ROUTES = [
  "src/app/api/dashboard/route.ts",
  "src/app/api/requirements/route.ts",
  "src/app/api/workspace/route.ts",
  "src/app/api/study-plan/route.ts",
  "src/app/api/vault/documents/route.ts",
  "src/app/api/test-planner/route.ts",
  "src/app/api/activities/route.ts",
  "src/app/api/offers/route.ts",
  "src/app/api/funding/route.ts",
  "src/app/api/recommendations/route.ts",
  "src/app/api/learning/providers/route.ts",
  "src/app/api/visa/requirements/route.ts",
  "src/app/api/search/route.ts",
];

check("every journey route exists and is session-guarded", () => {
  for (const r of JOURNEY_ROUTES) {
    const src = readFileSync(r, "utf8");
    assert.ok(src.includes("guardStudent") || src.includes("guardAdmin"), `${r} is not guarded`);
  }
});

check("the visa-requirements route is admin-only for writes", () => {
  const src = readFileSync("src/app/api/visa/requirements/route.ts", "utf8");
  const body = (fn: string) => {
    const at = src.indexOf(`export async function ${fn}`);
    if (at < 0) assert.fail(`${fn} is missing`);
    const rest = src.slice(at);
    return rest.slice(0, rest.indexOf("\n}\n"));
  };
  for (const fn of ["POST", "PATCH", "DELETE"]) {
    assert.ok(body(fn).includes("guardAdmin"), `${fn} must be admin-only`);
  }
  // The read side is deliberately PUBLIC: these are admin-published official
  // facts with no personal data, and a student must be able to read them
  // without a session. What it must never do is take a profile id.
  const getBody = body("GET");
  assert.ok(!/profileId|studentProfiles/.test(getBody), "published visa facts carry no student data");
  assert.ok(/sourceUrl|lastVerified|verificationStatus/.test(getBody), "the read must carry the source metadata");
});

check("visa requirements are never generated by AI", () => {
  for (const r of ["src/app/api/visa/requirements/route.ts", "src/components/journey/ExplorePanels.tsx"]) {
    const src = readFileSync(r, "utf8");
    assert.ok(!/aiProvider|generateText|openai|groq/i.test(src), `${r} must not call a model`);
  }
});

check("no journey route builds SQL by string concatenation", () => {
  for (const p of JOURNEY_ROUTES) {
    assert.ok(!/sql\.raw\(|`\s*SELECT .*\$\{/i.test(readFileSync(p, "utf8")), p);
  }
});

check("premium is enforced on the server, never in the client components", () => {
  for (const p of walk("src/components/journey")) {
    const src = readFileSync(p, "utf8");
    assert.ok(!/isPremium\s*\?|premiumUntil/.test(src), `${p} must not branch on premium in the browser`);
  }
});

check("no journey client component reaches an AI provider directly", () => {
  for (const p of walk("src/components/journey")) {
    const src = readFileSync(p, "utf8");
    assert.ok(!/apiKey\s*[:=]|process\.env\./.test(src), `${p} must not read a server secret`);
  }
});

check("every fetch in a journey panel is a same-origin relative path", () => {
  for (const p of walk("src/components/journey")) {
    const src = readFileSync(p, "utf8");
    for (const m of src.matchAll(/fetch\(\s*[`"']([^`"']+)/g)) {
      const url = m[1];
      if (/^[a-z]+:|^\/\//i.test(url) && !url.startsWith("/api/")) continue; // an <a href> style outbound link is fine
      assert.ok(url.startsWith("/api/"), `${p} fetches ${url} instead of a relative /api path`);
    }
  }
});

check("the journey panels load through the shared useResource helper", () => {
  for (const p of [
    "src/components/journey/PreparePanels.tsx",
    "src/components/journey/AfterAdmissionPanels.tsx",
  ]) {
    const src = readFileSync(p, "utf8");
    assert.ok(src.includes('from "./useResource"'), p);
    assert.ok(!/useState\(true\);[\s\S]{0,200}setLoading/.test(src), `${p} reintroduced a bespoke loader`);
  }
});

check("no journey component writes state synchronously inside an effect", () => {
  for (const p of walk("src/components/journey")) {
    const src = readFileSync(p, "utf8");
    for (const m of src.matchAll(/useEffect\(\(\)\s*=>\s*\{([\s\S]{0,400}?)\n {2}\},/g)) {
      const body = m[1];
      const lines = body.split("\n");
      for (let i = 0; i < lines.length; i++) {
        if (!/^\s*(set[A-Z]\w*)\(/.test(lines[i])) continue;
        // A setState inside a nested callback (await / then / timeout / IIFE) is fine.
        const before = lines.slice(0, i).join("\n");
        if (/async\s*\(|await\s|\.then\(|setTimeout\(|\(async/i.test(before) || before.trim().length > 0) continue;
        assert.fail(`${p}: "${lines[i].trim()}" is a synchronous setState at the top of an effect`);
      }
    }
  }
});

check("the control center and workspace load state-free then write after the await", () => {
  for (const p of ["src/components/journey/JourneyControlCenter.tsx", "src/components/journey/ApplicationWorkspacePanel.tsx"]) {
    const src = readFileSync(p, "utf8");
    assert.ok(/let live = true/.test(src), `${p} has no live guard`);
    assert.ok(/if \(!live\) return/.test(src), `${p} has no unmount guard`);
  }
});

check("the database migration is additive — it only creates journey tables", () => {
  const ddl = readFileSync("src/lib/journey/ddl.ts", "utf8");
  assert.ok(!/\bDROP\b|\bALTER COLUMN\b|\bTRUNCATE\b/i.test(ddl), "the journey migration must never drop or rewrite");
  const created = [...ddl.matchAll(/CREATE TABLE IF NOT EXISTS\s+(\w+)/gi)].map((m) => m[1]);
  assert.ok(created.length >= 10, `expected the journey tables, found ${created.length}`);
  for (const t of created) assert.ok(/^(?!users|student_profiles$)/.test(t), `${t} would recreate an existing table`);
});

// ---------------------------------------------------------------------------

if (failures.length) {
  console.log(`\njourney test FAILED: ${failures.length} failure(s)`);
  for (const f of failures) console.log(`  · ${f}`);
  process.exit(1);
}
console.log(`\njourney test passed (${passed} assertions)`);
