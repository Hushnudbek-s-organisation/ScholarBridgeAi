/**
 * P0 regression — a failed request or a failed chunk must be RECOVERABLE and
 * must never be misreported as "you have no data".
 *
 * Run: npm run test:chunk-recovery
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  ClientRequestError,
  classifyHttpStatus,
  fetchJsonWithTimeout,
  isChunkLoadError,
} from "../src/lib/clientFetch";

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
async function checkAsync(name: string, fn: () => Promise<void>) {
  try {
    await fn();
    passed++;
    console.log(`  ✓ ${name}`);
  } catch (error) {
    failures.push(`${name}: ${(error as Error).message}`);
    console.log(`  ✗ ${name} — ${(error as Error).message}`);
  }
}

const originalFetch = globalThis.fetch;
const originalNavigator = globalThis.navigator;
function mockFetch(handler: (url: string, init?: RequestInit) => Promise<Response>) {
  (globalThis as { fetch: typeof fetch }).fetch = handler as typeof fetch;
}
function offline(value: boolean) {
  Object.defineProperty(globalThis, "navigator", { configurable: true, value: { onLine: !value } });
}

async function main() {
  console.log("\nP0 — request states, deadlines and chunk recovery");

  check("401/403/429/500 are four different states", () => {
    assert.equal(classifyHttpStatus(401), "unauthorized");
    assert.equal(classifyHttpStatus(403), "forbidden");
    assert.equal(classifyHttpStatus(429), "rate_limited");
    assert.equal(classifyHttpStatus(500), "server_error");
    assert.equal(classifyHttpStatus(503), "server_error");
    assert.equal(classifyHttpStatus(400), "bad_response");
  });

  check("the exact reported failure is recognised as a chunk error", () => {
    const error = new Error("Failed to load chunk /_next/static/chunks/3bczmira-_y1f.js from module 987403");
    error.name = "ChunkLoadError";
    assert.equal(isChunkLoadError(error), true);
    assert.equal(isChunkLoadError(new Error("Loading chunk 152 failed.")), true);
    assert.equal(isChunkLoadError(new Error("Cannot read properties of undefined")), false);
    assert.equal(isChunkLoadError(null), false);
  });

  check("recovery is bounded and never reloads automatically", () => {
    const boundary = read("src/components/ChunkErrorBoundary.tsx");
    assert.match(boundary, /maxRetries \?\? 2/);
    assert.match(boundary, /exhausted = retries >= max/);
    assert.doesNotMatch(boundary, /window\.location\.reload\(\)/, "no automatic reload in the boundary");
    assert.match(boundary, /confirmSafeReload\(\)/, "an explicit refresh is guarded");
    assert.match(read("src/components/ui/hubs.tsx"), /ChunkErrorBoundary/, "a failing pane stays inside its pane");
    assert.match(read("src/app/HomeClient.tsx"), /ChunkErrorBoundary/, "a failing hub stays inside the cabinet");
    assert.match(read("src/app/layout.tsx"), /meta name="sb-build-id"/, "HTML carries its build marker");
    assert.match(read("src/components/IdleVersionWatcher.tsx"), /scheduleWhenIdle/, "version monitor is off the first paint");
  });

  check("the live-build endpoint is uncacheable and exposes only the marker", () => {
    const route = read("src/app/api/config/build/route.ts");
    assert.match(route, /currentBuildId\(\)/);
    assert.match(route, /buildId/);
    assert.match(route, /no-store, max-age=0/);
    assert.doesNotMatch(route, /publicCacheJson|s-maxage|stale-while-revalidate/);
    assert.doesNotMatch(route, /process\.env\.(DATABASE_URL|SESSION_SECRET|PG_)/);
  });

  await checkAsync("a successful response is returned as data, not a default", async () => {
    mockFetch(async () => Response.json({ applications: [{ id: 7 }] }, { status: 200 }));
    const data = await fetchJsonWithTimeout<{ applications: { id: number }[] }>("/api/applications");
    assert.equal(data.applications[0].id, 7);
  });

  for (const [status, kind] of [[401, "unauthorized"], [403, "forbidden"], [429, "rate_limited"], [500, "server_error"]] as const) {
    await checkAsync(`${status} throws a classified error (never [])`, async () => {
      mockFetch(async () => Response.json({ error: "not available" }, { status, headers: status === 429 ? { "retry-after": "2" } : {} }));
      await assert.rejects(
        () => fetchJsonWithTimeout("/api/applications"),
        (error: unknown) => {
          assert.ok(error instanceof ClientRequestError);
          assert.equal(error.kind, kind);
          assert.equal(error.status, status);
          if (status === 429) assert.equal(error.retryAfterMs, 2000);
          return true;
        },
      );
    });
  }

  await checkAsync("a 200 with an unreadable body is a bad_response, not success", async () => {
    mockFetch(async () => new Response("<html>gateway</html>", { status: 200 }));
    await assert.rejects(
      () => fetchJsonWithTimeout("/api/applications"),
      (error: unknown) => error instanceof ClientRequestError && error.kind === "bad_response",
    );
  });

  await checkAsync("a hung request ends in a finite timeout", async () => {
    mockFetch((_url, init) => new Promise<Response>((_resolve, reject) => {
      const signal = init?.signal as AbortSignal | undefined;
      signal?.addEventListener("abort", () => reject(new Error("aborted")), { once: true });
    }));
    const start = Date.now();
    await assert.rejects(
      () => fetchJsonWithTimeout("/api/applications", { timeoutMs: 40 }),
      (error: unknown) => error instanceof ClientRequestError && error.kind === "timeout",
    );
    assert.ok(Date.now() - start < 2000, "the deadline must actually fire");
  });

  await checkAsync("an offline device is reported as offline, not as empty data", async () => {
    offline(true);
    try {
      await assert.rejects(
        () => fetchJsonWithTimeout("/api/applications"),
        (error: unknown) => error instanceof ClientRequestError && error.kind === "offline",
      );
    } finally {
      offline(false);
    }
  });

  await checkAsync("a caller abort cancels without pretending to succeed", async () => {
    const controller = new AbortController();
    mockFetch((_url, init) => new Promise<Response>((_resolve, reject) => {
      (init?.signal as AbortSignal)?.addEventListener("abort", () => reject(new Error("aborted")), { once: true });
    }));
    const promise = fetchJsonWithTimeout("/api/applications", { signal: controller.signal, timeoutMs: 5000 });
    controller.abort();
    await assert.rejects(promise, (error: unknown) => error instanceof ClientRequestError && error.kind === "cancelled");
  });

  (globalThis as { fetch: typeof fetch }).fetch = originalFetch;
  Object.defineProperty(globalThis, "navigator", { configurable: true, value: originalNavigator });

  console.log(`\n${passed} passed, ${failures.length} failed`);
  if (failures.length) {
    for (const failure of failures) console.log(`  - ${failure}`);
    process.exit(1);
  }
}

void main();
