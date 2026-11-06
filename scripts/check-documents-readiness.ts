/**
 * P1 regression — "requirements not determined" is not "100% ready".
 *
 * Reported: an empty / unloaded document checklist was scored 100% ready.
 * Generic planning notes were also being read as official requirements.
 *
 * Run: npm run test:documents-readiness
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  checkDocument,
  checkDocuments,
  scholarshipChecklistDocuments,
  type DocumentRow,
} from "../src/lib/documents";

const ROOT = join(import.meta.dirname, "..");
const read = (path: string) => readFileSync(join(ROOT, path), "utf8");

let passed = 0;
const failures: string[] = [];
function check(name: string, fn: () => void) {
  try {
    fn();
    passed++;
    console.log(`  ✓ ${name}`);
  } catch (error) {
    failures.push(`${name}: ${(error as Error).message}`);
    console.log(`  ✗ ${name} — ${(error as Error).message}`);
  }
}

const TODAY = new Date(Date.UTC(2026, 8, 25));
const doc = (over: Partial<DocumentRow> = {}): DocumentRow => ({
  id: 1,
  entityType: "university",
  entityId: 10,
  documentType: "transcript",
  label: "Academic transcript",
  isRequired: true,
  status: "uploaded",
  fileName: "transcript.pdf",
  fileSizeBytes: 500_000,
  expiresAt: null,
  deadlineDate: null,
  uploadedAt: "2026-09-01",
  ...over,
});

console.log("\nP1 — unknown requirements never become 100%");

check("an empty checklist has readiness=null, not 100", () => {
  const result = checkDocuments([], { today: TODAY });
  assert.equal(result.readiness, null);
  assert.equal(result.requirementsState, "unknown");
  assert.equal(result.readinessReason, "requirements_unknown");
  assert.equal(result.requiredTotal, 0);
});

check("loading / errored / unconfirmed lists stay unknown", () => {
  for (const state of ["loading", "error", "unknown"] as const) {
    const result = checkDocuments([doc()], { today: TODAY, requirementsState: state });
    assert.equal(result.readiness, null, state);
    assert.equal(result.readinessReason, `requirements_${state}`);
  }
});

check("a confirmed but EMPTY list is still not determined", () => {
  const result = checkDocuments([], { today: TODAY, requirementsState: "confirmed" });
  assert.equal(result.readiness, null);
  assert.equal(result.readinessReason, "requirements_not_determined");
});

check("only a confirmed, non-empty official list yields a percentage", () => {
  const result = checkDocuments(
    [doc({ id: 1, status: "uploaded" }), doc({ id: 2, status: "missing" })],
    { today: TODAY, requirementsState: "confirmed" },
  );
  assert.equal(result.readiness, 50);
  assert.equal(result.readinessReason, null);
});

console.log("\nP1 — real document status and official-vs-planning separation");

check("expired / rejected / needs_review are blockers, never ready", () => {
  for (const [status, code] of [["expired", "expired_status"], ["rejected", "rejected_status"], ["needs_review", "needs_review_status"]] as const) {
    const issues = checkDocument(doc({ status }), { today: TODAY });
    assert.equal(issues[0].severity, "blocker");
    assert.equal(issues[0].code, code);
  }
  const result = checkDocuments([doc({ id: 1 }), doc({ id: 2, status: "needs_review" })], { today: TODAY, requirementsState: "confirmed" });
  assert.equal(result.readiness, 50);
});

check("generic scholarship notes are optional preparation, not official requirements", () => {
  const generic = scholarshipChecklistDocuments("[]");
  assert.ok(generic.length > 0);
  assert.ok(generic.every((item) => !item.isRequired));
  assert.ok(generic.every((item) => /official award page/i.test(item.label)));
  const verified = scholarshipChecklistDocuments('["transcript"]', true);
  assert.ok(verified.every((item) => item.isRequired));
});

check("the API computes the requirement state from verified sources only", () => {
  const source = read("src/app/api/documents/route.ts");
  assert.match(source, /confirmedRequirementSources/);
  assert.match(source, /unverifiedRequirementSources = savedUni\.length/);
  assert.match(source, /confirmedRequirementSources > 0 && unverifiedRequirementSources === 0/);
  assert.match(source, /requirementsState,/);
  assert.match(source, /suggestedAreOfficial: false/);
  assert.match(source, /"needs_review"/);
});

check("the UI never prints a percentage when readiness is null", () => {
  const source = read("src/components/DocumentChecklist.tsx");
  assert.match(source, /check\.readiness == null/);
  assert.match(source, /data-testid="requirements-unknown"/);
  assert.match(source, /—/);
  assert.match(source, /suggestionsNotOfficial/);
  const apiSource = read("src/app/api/documents/route.ts");
  assert.doesNotMatch(apiSource, /readiness = 100/);
});

check("UZ/RU/EN explain the unknown state", () => {
  const keys = [
    "readinessUnknown", "requirementsUnknownHint", "requirementsLoadingHint",
    "requirementsErrorHint", "requirementsNotDeterminedHint", "suggestionsNotOfficial",
    "statusExpired", "statusRejected", "statusNeedsReview",
  ];
  for (const lang of ["en", "uz", "ru"]) {
    const messages = JSON.parse(read(`src/i18n/messages/${lang}.json`)) as { documentChecklist: Record<string, string> };
    for (const key of keys) assert.equal(typeof messages.documentChecklist[key], "string", `${lang}.documentChecklist.${key}`);
  }
});

check("the schema comment lists the full document status vocabulary", () => {
  const schema = read("src/db/schema.ts");
  const line = schema.split("\n").find((row) => row.includes('text("status").notNull().default("missing")'))!;
  for (const status of ["missing", "uploaded", "not_required", "expired", "rejected", "needs_review"]) {
    assert.ok(line.includes(status), `schema comment omits ${status}`);
  }
});

console.log(`\n${passed} passed, ${failures.length} failed`);
if (failures.length) {
  for (const failure of failures) console.log(`  - ${failure}`);
  process.exit(1);
}
