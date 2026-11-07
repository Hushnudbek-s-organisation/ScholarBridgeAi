/**
 * Safe-log / correlation-id guard (§11).
 *
 * Proves request/job ids are non-PII, that secret/PII-shaped keys are redacted,
 * that free text is bounded, that raw errors never leak a connection string,
 * and that the refresh / adapter / review-queue paths use these primitives.
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { newRequestId, newJobId, safeText, safeLogFields, safeErrorMessage } from "../src/lib/observability";

let passed = 0;
const failures: string[] = [];
function check(name: string, fn: () => void) {
  try { fn(); passed++; console.log(`  ✓ ${name}`); }
  catch (e) { failures.push(`${name}: ${(e as Error).message}`); console.log(`  ✗ ${name} — ${(e as Error).message}`); }
}
const read = (p: string) => readFileSync(join(process.cwd(), p), "utf8");

console.log("\nSafe observability — correlation without leaking secrets");

check("request/job ids are random, unique and contain no user data", () => {
  const a = newRequestId(), b = newRequestId();
  assert.notEqual(a, b);
  assert.match(a, /^[0-9a-f-]{36}$/);
  assert.match(newJobId("refresh"), /^refresh-[0-9a-f-]{36}$/);
});

check("secret- and PII-shaped keys are redacted, not logged", () => {
  const out = safeLogFields({
    sessionToken: "abc", passwordHash: "x", DATABASE_URL: "postgres://user:pw@host/db",
    email: "a@b.com", fullName: "Jane", apiKey: "zzz", service_role: "k",
    mode: "official_source_reverification", processed: 42, failedVerification: true,
    note: null,
  });
  for (const k of ["sessionToken", "passwordHash", "DATABASE_URL", "email", "fullName", "apiKey", "service_role"]) {
    assert.equal(out[k], "[redacted]", `${k} must be redacted`);
  }
  assert.equal(out.mode, "official_source_reverification");
  assert.equal(out.processed, 42);
  assert.equal(out.failedVerification, true);
  assert.equal(out.note, null);
});

check("free text is bounded and stripped of newlines (log injection)", () => {
  const long = "x".repeat(1000) + "\nINJECTED line";
  const t = safeText(long);
  assert.ok(t.length <= 200);
  assert.doesNotMatch(t, /\n/);
});

check("arrays/objects are summarized, so a document body never reaches the log", () => {
  const out = safeLogFields({ documents: [{ body: "private essay" }, { body: "passport" }], extra: { a: 1 } });
  assert.equal(out.documents, "[2 items]");
  assert.equal(out.extra, "[object]");
  assert.doesNotMatch(JSON.stringify(out), /private essay|passport/);
});

check("raw error messages (connection strings) never leak", () => {
  const dbErr = new Error("connect ECONNREFUSED postgresql://svc:secret@10.0.0.1:5432/sb");
  const msg = safeErrorMessage(dbErr);
  assert.doesNotMatch(msg, /postgresql|secret|10\.0\.0\.1|ECONNREFUSED/);
  const timeout = new Error("aborted"); timeout.name = "AbortError";
  assert.match(safeErrorMessage(timeout), /timed out/);
});

check("refresh logs a correlation id and never dumps a raw error", () => {
  const refresh = read("src/lib/refresh.ts");
  assert.match(refresh, /newJobId\("refresh"\)/);
  assert.match(refresh, /logSafe\("refresh\.(started|finished|error)"/);
  assert.match(refresh, /safeErrorMessage\(err\)/);
  assert.doesNotMatch(refresh, /String\(err\?\.message \|\| err\)/, "raw error text must not be logged/recorded");
});

check("the official-source adapter logs only a classified reason", () => {
  const server = read("src/lib/officialSourceAdapter.server.ts");
  assert.match(server, /logSafe\("official_source\.unavailable"/);
  assert.match(server, /errorClass: code/);
  assert.match(server, /28P01/);
  assert.doesNotMatch(server, /errorClass:.*(?:err\.message|String\(err)/);
  assert.doesNotMatch(server, /console\.warn\([^\n]*err/);
});

check("review-queue decisions log id/category/status, never the written reason or admin identity", () => {
  const route = read("src/app/api/admin/review-queue/route.ts");
  assert.match(route, /newRequestId\(\)/);
  assert.match(route, /logSafe\("review_queue\.decision"/);
  // The decision log must NOT include the free-text reason or profile id.
  const decisionLog = /logSafe\("review_queue\.decision",\s*\{([\s\S]*?)\}\)/.exec(route)?.[1] ?? "";
  assert.doesNotMatch(decisionLog, /\breason\b|adminProfileId|decidedBy|decisionReason/);
  assert.match(route, /verifiedWritten: false/);
});

console.log(`\n${passed} passed, ${failures.length} failed`);
if (failures.length) { for (const f of failures) console.log(`  - ${f}`); process.exit(1); }
