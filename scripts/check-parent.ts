/**
 * Deterministic checks for the Parent Dashboard (Phase 4).
 *
 * The parent view is a WHITELIST, not a filter: every field that reaches a
 * parent is produced by name, so adding a column to the student record cannot
 * leak it. These tests pin what is shared and, just as importantly, what is
 * never shared.
 *
 * Run: npm run test:parent
 */

import { buildParentSummary, parentShareLink, type ParentSource } from "../src/lib/parentSummary";

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

const base: ParentSource = {
  studentFirstName: "Aziza",
  degreeLevel: "Bachelor",
  targetMajor: "Computer Science",
  targetCountries: "Germany",
  profileCompletenessPct: 85,
  applicationCount: 8,
  submittedCount: 6,
  acceptedCount: 1,
  documentReadinessPct: 70,
  nextDeadlineLabel: "TUM application",
  nextDeadlineDays: 20,
  criticalDeadlineCount: 0,
  annualCostUsd: 25000,
  fundingGapAnnualUsd: 6000,
  scholarshipCount: 5,
  openTaskCount: 4,
};

const everything = JSON.stringify(buildParentSummary(base));

// ---------------------------------------------------------------------------
section("1. Nothing private ever reaches the parent view");

// Fields that exist on a student record but must never appear, even if a
// caller stuffs them into the source object.
const leaking = buildParentSummary({
  ...base,
  // Fields that exist on a student record but must never reach a parent. They
  // are passed deliberately, cast through unknown: the point of the whitelist
  // is that they are ignored even when a caller supplies them.
  gpa: 3.9,
  ieltsScore: 7.5,
  passwordHash: "$2b$10$secret",
  email: "aziza@private.com",
  essayDraft: "My deepest fear is that I am not good enough.",
  rejectedCount: 3,
  rejectedUniversities: ["MIT", "Stanford"],
} as unknown as ParentSource);
const leakedJson = JSON.stringify(leaking);

check("no GPA is shared", !/"gpa"/i.test(leakedJson) && !/3\.9/.test(leakedJson));
check("no test score is shared", !/ielts|toefl|7\.5/i.test(leakedJson));
check("no password material is shared", !/passwordHash|\$2b\$/.test(leakedJson));
check("no private email is shared", !/aziza@private\.com/.test(leakedJson));
check("no essay text is shared", !/deepest fear/.test(leakedJson));
check("no rejection list is shared", !/rejectedUniversities|Stanford|MIT/.test(leakedJson));
check(
  "the privacy note states what is withheld",
  /never includes passwords, essay drafts, test scores, rejection details/i.test(leaking.privacyNote)
);

section("2. What IS shared is useful");

check("the headline names the child", buildParentSummary(base).headline.includes("Aziza"));
check("the overview mentions the subject", /Computer Science/.test(buildParentSummary(base).overview));
check("the overview mentions the country", /Germany/.test(buildParentSummary(base).overview));
check("application progress is shown", buildParentSummary(base).progress.some((p) => p.value === "6 of 8"));
check("document readiness is shown", buildParentSummary(base).progress.some((p) => /Documents ready/.test(p.label)));
check("the annual cost is shown", buildParentSummary(base).money.some((m) => m.value === "$25,000"));
check("the funding gap is shown", buildParentSummary(base).money.some((m) => m.value === "$6,000"));
check("the cost row explains what it includes", /living costs, insurance and travel/.test(buildParentSummary(base).money[0].note ?? ""));
check("an offer is reported when there is one", /1 offer received/.test(buildParentSummary(base).overview));

section("3. Status is honest");

check("a healthy plan reads on track", buildParentSummary(base).status === "on_track");
check(
  "a critical deadline makes it urgent",
  buildParentSummary({ ...base, criticalDeadlineCount: 2 }).status === "urgent"
);
check(
  "an urgent headline counts the deadlines",
  /2 deadlines closing within two weeks/.test(buildParentSummary({ ...base, criticalDeadlineCount: 2 }).headline)
);
check("no applications reads as getting started", buildParentSummary({ ...base, applicationCount: 0, submittedCount: 0 }).status === "getting_started");
check(
  "a half-submitted file reads as needs attention",
  buildParentSummary({ ...base, submittedCount: 1 }).status === "needs_attention"
);
check(
  "a thin profile reads as needs attention",
  buildParentSummary({ ...base, profileCompletenessPct: 30 }).status === "needs_attention"
);
check("every status has a label", buildParentSummary(base).statusLabel.length > 0);

section("4. Parent actions are things a parent can actually do");

const withDocs = buildParentSummary({ ...base, needsBankStatement: true });
check("a bank statement need produces an action", withDocs.parentActions.some((a) => /financial documents/i.test(a.title)));
check("the action says what to ask the bank for", /stamped balance certificate/.test(withDocs.parentActions[0].step));
check("the action explains why it matters", /delays a visa/.test(withDocs.parentActions[0].why));

const urgent = buildParentSummary({ ...base, criticalDeadlineCount: 1 });
check("an urgent plan asks the parent to help", urgent.parentActions.some((a) => /protect the nearest deadline/i.test(a.title)));

const overloaded = buildParentSummary({ ...base, openTaskCount: 12 });
check("a heavy workload prompts a check-in", overloaded.parentActions.some((a) => /workload/i.test(a.title)));

const calm = buildParentSummary({ ...base });
check("a calm plan tells the parent nothing is needed", calm.parentActions[0].title.includes("Nothing is needed"));
check("and discourages pressure", /not add pressure/.test(calm.parentActions[0].why));
check("every action has a concrete step", buildParentSummary(base).parentActions.every((a) => a.step.length > 20));

section("5. Empty and partial data");

const minimal = buildParentSummary({ studentFirstName: "Sam" });
check("a bare record still produces a summary", minimal.overview.length > 0);
check("a bare record claims nothing was shared yet", /Nothing has been shared yet/.test(minimal.overview));
check("a bare record invents no cost", minimal.money.length === 0);
check("a bare record invents no progress rows", minimal.progress.length === 0);
check("a missing first name falls back gracefully", buildParentSummary({ studentFirstName: "" }).headline.startsWith("Your child"));
check("a past deadline is reported as passed", /has passed/.test(buildParentSummary({ ...base, nextDeadlineDays: -3 }).overview));

section("6. Share links");

check("the share link carries the token", parentShareLink("https://example.com", "abc123") === "https://example.com/parent/abc123");
check("a trailing slash is normalised", parentShareLink("https://example.com/", "abc123") === "https://example.com/parent/abc123");
check("the token is URL-encoded", parentShareLink("https://example.com", "a/b?c").includes("a%2Fb%3Fc"));

section("7. Determinism");

check("the same input gives the same summary", everything === JSON.stringify(buildParentSummary(base)));

// ---------------------------------------------------------------------------
console.log(`\n${failed === 0 ? "✅" : "❌"} ${passed} passed, ${failed} failed`);
process.exitCode = failed === 0 ? 0 : 1;
