/**
 * Deterministic checks for the public Parent Share response.
 *
 * The returned object is a small allowlist. It may include profile context and
 * aggregate tracker counts, but not assessments, guessed deadlines, finances,
 * application names, private messages, credentials, or test scores.
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
  applicationCount: 8,
  submittedCount: 6,
  acceptedCount: 1,
};

const summary = buildParentSummary(base);
const serialized = JSON.stringify(summary);

// ---------------------------------------------------------------------------
section("1. The response is a strict allowlist");

const leaking = buildParentSummary({
  ...base,
  email: "aziza@private.com",
  passwordHash: "$2b$10$secret",
  gpa: 3.9,
  ieltsScore: 7.5,
  essayDraft: "My deepest fear is that I am not good enough.",
  rejectedCount: 3,
  rejectedUniversities: ["MIT", "Stanford"],
  applicationNames: ["Private University"],
  deadline: "2026-10-14",
  annualCostUsd: 25000,
  fundingGapAnnualUsd: 6000,
  parentActions: ["Upload bank statement"],
} as unknown as ParentSource);
const leakedJson = JSON.stringify(leaking);

check("only the three public model sections are returned", Object.keys(leaking).sort().join(",") === "applicationRecords,profileContext,studentFirstName");
check("no email or password material is shared", !/aziza@private\.com|passwordHash|\$2b\$/.test(leakedJson));
check("no academic scores or essay content are shared", !/gpa|ielts|3\.9|7\.5|deepest fear/i.test(leakedJson));
check("no rejection details, institution names, or application names are shared", !/\brejected\b|\bStanford\b|\bMIT\b|Private University/i.test(leakedJson));
check("no unsupported deadline, financial, or parent-action claims are returned", !/deadline|2026-10-14|25000|6000|bank statement/i.test(leakedJson));

// ---------------------------------------------------------------------------
section("2. The shared counts map to stored tracker facts");

check("first name only is preserved", summary.studentFirstName === "Aziza");
check("profile context is reported as stored", summary.profileContext.targetMajor === "Computer Science" && summary.profileContext.degreeLevel === "Bachelor" && summary.profileContext.targetCountries === "Germany");
check("tracker record total is preserved", summary.applicationRecords.total === 8);
check("submitted-or-later count is preserved", summary.applicationRecords.submittedOrLater === 6);
check("accepted outcomes are explicitly identified as student-reported", summary.applicationRecords.studentReportedAcceptedOutcomes === 1);
check("no readiness, probability, or on-track status is synthesized", !/on.?track|needs attention|urgent|probability|chance/i.test(serialized) && !("status" in summary));

const bounded = buildParentSummary({ ...base, submittedCount: 20, acceptedCount: -3 });
check("derived counts stay within the number of tracked records", bounded.applicationRecords.submittedOrLater === 8 && bounded.applicationRecords.studentReportedAcceptedOutcomes === 0);

// ---------------------------------------------------------------------------
section("3. Empty and malformed values remain explicit");

const minimal = buildParentSummary({});
check("missing name stays null for a translated UI fallback", minimal.studentFirstName === null);
check("missing profile context remains null", Object.values(minimal.profileContext).every((value) => value === null));
check("missing application counts become zero", Object.values(minimal.applicationRecords).every((value) => value === 0));
const blank = buildParentSummary({ studentFirstName: "  ", targetMajor: "  ", applicationCount: Number.NaN });
check("blank profile values are not presented as facts", blank.studentFirstName === null && blank.profileContext.targetMajor === null && blank.applicationRecords.total === 0);

// ---------------------------------------------------------------------------
section("4. Share links");

check("the share link carries the token", parentShareLink("https://example.com", "abc123") === "https://example.com/parent/abc123");
check("a trailing slash is normalised", parentShareLink("https://example.com/", "abc123") === "https://example.com/parent/abc123");
check("the token is URL-encoded", parentShareLink("https://example.com", "a/b?c").includes("a%2Fb%3Fc"));

// ---------------------------------------------------------------------------
section("5. Determinism");

check("the same input gives the same response", serialized === JSON.stringify(buildParentSummary(base)));

console.log(`\n${failed === 0 ? "✅" : "❌"} ${passed} passed, ${failed} failed`);
process.exitCode = failed === 0 ? 0 : 1;
