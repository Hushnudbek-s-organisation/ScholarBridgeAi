/**
 * P1 regression — an API error is never "you have no applications".
 *
 * Reported: the materials page said "Siz hali ariza boshlamadingiz" while the
 * dashboard listed three applications. Cause: the fetch mapped every non-ok
 * response and every thrown error to `{ applications: [] }`.
 *
 * Run: npm run test:applications-state
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  ClientRequestError,
  classifyHttpStatus,
  fetchJsonWithTimeout,
} from "../src/lib/clientFetch";
import {
  describeApplicationsFailure,
  parseApplicationsResponse,
} from "../src/lib/applicationsResponse";

const ROOT = join(import.meta.dirname, "..");
const read = (path: string) => readFileSync(join(ROOT, path), "utf8");

let passed = 0;
const failures: string[] = [];
function check(name: string, fn: () => void | Promise<void>) {
  return Promise.resolve()
    .then(fn)
    .then(() => {
      passed++;
      console.log(`  ✓ ${name}`);
    })
    .catch((error) => {
      failures.push(`${name}: ${(error as Error).message}`);
      console.log(`  ✗ ${name} — ${(error as Error).message}`);
    });
}

const mockResponse = (status: number, body: unknown) => ({
  ok: status >= 200 && status < 300,
  status,
  headers: { get: () => null },
  json: async () => body,
}) as unknown as Response;

async function main() {
  console.log("\nP1 — error responses stay errors");

  await check("401 / 403 / 429 / 500 are classified and never parsed as a list", async () => {
    const original = globalThis.fetch;
    try {
      for (const [status, kind] of [[401, "unauthorized"], [403, "forbidden"], [429, "rate_limited"], [500, "server_error"]] as const) {
        globalThis.fetch = (async () => mockResponse(status, { error: "not available" })) as typeof fetch;
        await assert.rejects(
          () => fetchJsonWithTimeout("/api/applications"),
          (error: unknown) => {
            assert.ok(error instanceof ClientRequestError);
            assert.equal(error.kind, kind);
            assert.equal(error.status, status);
            return true;
          },
        );
        assert.equal(classifyHttpStatus(status), kind);
      }
    } finally {
      globalThis.fetch = original;
    }
  });

  await check("a 200 with a malformed body is an error, not an empty application list", async () => {
    const original = globalThis.fetch;
    try {
      globalThis.fetch = (async () => mockResponse(200, "unexpected")) as typeof fetch;
      await assert.rejects(() => fetchJsonWithTimeout("/api/applications"), /unreadable|could not/i);
      assert.throws(() => parseApplicationsResponse({ error: "db down" }), /could not be read/i);
      assert.throws(() => parseApplicationsResponse({ applications: {} }), /could not be read/i);
    } finally {
      globalThis.fetch = original;
    }
  });

  await check("only a well-formed 200 array can produce success or empty", () => {
    assert.deepEqual(parseApplicationsResponse({ applications: [] }), []);
    const rows = parseApplicationsResponse({
      applications: [
        { id: 1, universityId: 5, universityName: "MIT", programName: "CS" },
        { id: 2, universityName: "Yenching" },
        { universityName: "broken row without id" },
      ],
    });
    assert.equal(rows.length, 2);
    assert.equal(rows[0].universityId, 5);
    assert.equal(rows[1].programName, null);
  });

  await check("failure descriptions carry a retryable flag and a translation-friendly kind", () => {
    for (const [kind, retryable] of [["timeout", true], ["offline", true], ["network", true], ["server_error", true], ["unauthorized", false], ["forbidden", false], ["cancelled", false]] as const) {
      const state = describeApplicationsFailure(new ClientRequestError(kind, "x"));
      assert.equal(state.kind, kind);
      assert.equal(state.retryable, retryable);
    }
    assert.equal(describeApplicationsFailure(new Error("boom")).kind, "error");
  });

  console.log("\nP1 — all cabinets share one real state");

  await check("MaterialsHub uses the finite, cancelling, error-throwing fetch", () => {
    const source = read("src/components/hubs/index.tsx");
    assert.match(source, /fetchJsonWithTimeout<unknown>\(\s*`\/api\/applications\?profileId=/);
    assert.match(source, /parseApplicationsResponse\(payload\)/);
    assert.match(source, /timeoutMs: 12_000/);
    assert.doesNotMatch(source, /r\.ok \? r\.json\(\) : \{ applications: \[\] \}/);
    assert.doesNotMatch(source, /\.catch\(\(\) => \{\}\)/);
  });

  await check("loading, error, empty and success render different copy", () => {
    const source = read("src/components/hubs/index.tsx");
    assert.match(source, /data-testid="applications-error"/);
    assert.match(source, /data-testid="applications-empty"/);
    assert.match(source, /t\("applicationsLoading"\)/);
    assert.match(source, /t\("applicationsRetry"\)/);
    // Error branch must not contain the empty-state sentence.
    const errorBranch = source.slice(source.indexOf('data-testid="applications-error"'), source.indexOf('data-testid="applications-empty"'));
    assert.doesNotMatch(errorBranch, /noApplicationsYet/);
  });

  await check("a profile switch derives a fresh loading state during render", () => {
    const source = read("src/components/hubs/index.tsx");
    assert.match(source, /appsLoad\.profileId === profileId/);
    assert.match(source, /: \{ profileId, state: "loading", applications: \[\], failure: null \}/);
    assert.match(source, /key=\{`vault-\$\{profile\.id\}-\$\{effectiveId/);
  });

  await check("create / edit / delete emit a profile-scoped change event", () => {
    const files = [
      "src/components/ApplicationCenter.tsx",
      "src/components/UniversityExplorer.tsx",
      "src/components/UniversityDetail.tsx",
      "src/components/RecommendationStudio.tsx",
      "src/components/journey/RequirementsBrowser.tsx",
    ];
    for (const file of files) assert.match(read(file), /notifyApplicationsChanged\(/);
    assert.match(read("src/components/hubs/index.tsx"), /onApplicationsChanged\(/);
    assert.match(read("src/components/ApplicationCenter.tsx"), /if \(!res\.ok\) \{\s*const data = await res\.json\(\)/, "a failed DELETE reports an error");
  });

  await check("UZ/RU/EN have the state copy", () => {
    const keys = [
      "applicationsLoading", "applicationsErrorTitle", "applicationsError", "applicationsErrorUnauthorized",
      "applicationsErrorForbidden", "applicationsErrorRateLimited", "applicationsErrorServer",
      "applicationsErrorOffline", "applicationsErrorTimeout", "applicationsErrorBadResponse",
      "applicationsErrorNetwork", "applicationsRetry",
    ];
    for (const lang of ["en", "uz", "ru"]) {
      const messages = JSON.parse(read(`src/i18n/messages/${lang}.json`)) as { hubs: Record<string, string> };
      for (const key of keys) assert.equal(typeof messages.hubs[key], "string", `${lang}.hubs.${key}`);
    }
  });

  console.log(`\n${passed} passed, ${failures.length} failed`);
  if (failures.length) {
    for (const failure of failures) console.log(`  - ${failure}`);
    process.exit(1);
  }
}

void main();
