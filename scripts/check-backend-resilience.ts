import assert from "node:assert/strict";
import { createServer } from "node:http";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { once } from "node:events";
import { readJsonBody, readTextBody } from "../src/lib/request";
import { BodyLimitError, fetchBoundedResponse } from "../src/lib/boundedBody";
import { databasePoolOptions } from "../src/db/poolOptions";
import { AsyncTtlCache } from "../src/lib/asyncTtlCache";
import { dbFailureCode, isDatabaseUnreachable } from "../src/lib/dbError";

let passed = 0;
async function check(name: string, run: () => unknown | Promise<unknown>) {
  await run(); passed++; console.log(`  ✓ ${name}`);
}
function request(body: string) { return new Request("http://local.test/", { method: "POST", body }); }
const server = createServer((req, res) => {
  res.setHeader("Content-Type", "application/json");
  if (req.url === "/stall") { res.write('{"pending":'); return; }
  if (req.url === "/huge") { res.end("x".repeat(4096)); return; }
  res.end('{"ok":true}');
});

async function main() {
  server.listen(0, "127.0.0.1"); await once(server, "listening");
  const address = server.address(); assert.ok(address && typeof address !== "string");
  const base = `http://127.0.0.1:${address.port}`;
  for (const value of ["null", "[]", '"string"', "true", "42"]) await check(`non-object JSON ${value} is a 400, never a field-access crash`, async () => {
    const result = await readJsonBody(request(value)); assert.ok(!result.ok); assert.equal(result.status, 400);
  });
  await check("JSON-RPC may explicitly validate non-object payloads itself", async () => {
    const result = await readJsonBody(request("null"), 100, { allowNonObject: true }); assert.ok(result.ok); assert.equal(result.body, null);
  });
  await check("UTF-8 is counted in bytes, not JS string length", async () => {
    const result = await readTextBody(request("éé"), 3); assert.ok(!result.ok); assert.equal(result.status, 413);
    const exact = await readTextBody(request("éé"), 4); assert.ok(exact.ok); assert.equal(exact.body, "éé");
  });
  await check("oversized streams don't wait for a broken cancel promise", async () => {
    let cancelled = false;
    const body = new ReadableStream<Uint8Array>({ start(c) { c.enqueue(new Uint8Array(101)); }, cancel() { cancelled = true; return new Promise(() => undefined); } });
    const req = new Request(base, { method: "POST", body, duplex: "half" } as RequestInit);
    const result = await readTextBody(req, 100, 50); assert.ok(!result.ok); assert.equal(result.status, 413); assert.ok(cancelled);
  });
  await check("slow request body has a whole-body 408 deadline", async () => {
    const req = new Request(base, { method: "POST", body: new ReadableStream({ cancel() { return new Promise(() => undefined); } }), duplex: "half" } as RequestInit);
    const start = performance.now(); const result = await readTextBody(req, 100, 40);
    assert.ok(!result.ok); assert.equal(result.status, 408); assert.ok(performance.now() - start < 1500);
  });
  await check("client cancellation does not masquerade as a timeout or 500", async () => {
    const controller = new AbortController(); controller.abort();
    const req = new Request(base, { method: "POST", body: "{}", signal: controller.signal });
    const result = await readJsonBody(req); assert.ok(!result.ok); assert.equal(result.status, 400);
  });
  await check("upstream headers do not end the response-body deadline", async () => {
    const start = performance.now();
    await assert.rejects(() => fetchBoundedResponse(`${base}/stall`, {}, 80, 1024), (e: Error) => ["TimeoutError", "AbortError"].includes(e.name));
    assert.ok(performance.now() - start < 1500);
  });
  await check("upstream byte limit is enforced while streaming", async () => {
    await assert.rejects(() => fetchBoundedResponse(`${base}/huge`, {}, 1000, 64), BodyLimitError);
  });
  await check("healthy requests recover after an upstream timeout", async () => {
    assert.deepEqual(await (await fetchBoundedResponse(base, {}, 2000, 100)).json(), { ok: true });
  });
  for (const raw of ["0", "-1", "NaN", "Infinity", "", "invalid"]) await check(`production query deadline cannot be disabled by ${JSON.stringify(raw)}`, () => {
    const options = databasePoolOptions({ NODE_ENV: "production", PG_QUERY_TIMEOUT_MS: raw });
    assert.equal(options.query_timeout, 20_000); assert.equal(options.statement_timeout, 20_000);
  });
  await check("pool and lock limits are bounded and migrations keep their own budget", () => {
    assert.equal(databasePoolOptions({}).max, 5); assert.equal(databasePoolOptions({ VERCEL: "1" }).max, 3);
    assert.equal(databasePoolOptions({ PG_POOL_MAX: "10000" }).max, 20);
    const production = databasePoolOptions({ NODE_ENV: "production", PG_QUERY_TIMEOUT_MS: "250" });
    assert.equal(production.lock_timeout, 250); assert.equal(databasePoolOptions({ NODE_ENV: "test" }).statement_timeout, undefined);
  });
  await check("SQL cancellation, lock waits and aggregate connection errors are transient", () => {
    for (const code of ["57014", "55P03", "08006"]) assert.ok(isDatabaseUnreachable({ cause: { code } }));
    assert.equal(dbFailureCode(new AggregateError([{ code: "ECONNRESET" }])), "ECONNRESET");
    assert.equal(isDatabaseUnreachable({ code: "23505" }), false);
  });
  await check("a load slower than TTL stays single-flight and gets a full settled TTL", async () => {
    let now = 0, loads = 0; let resolve!: (s: string) => void;
    const cache = new AsyncTtlCache<string, string>(100, 2, () => now);
    const first = cache.getOrCreate("a", () => { loads++; return new Promise<string>((r) => { resolve = r; }); });
    await Promise.resolve(); now = 200;
    assert.equal(cache.getOrCreate("a", async () => "duplicate"), first); assert.equal(loads, 1); assert.equal(cache.hasFresh("a"), false);
    resolve("ok"); await first; now = 299; assert.equal(cache.hasFresh("a"), true);
    now = 300; assert.equal(cache.hasFresh("a"), false);
  });
  await check("invalidation cannot be undone by a late catalogue loader", async () => {
    let resolve!: (s: string) => void; const cache = new AsyncTtlCache<string, string>(100, 2);
    const old = cache.getOrCreate("x", () => new Promise<string>((r) => { resolve = r; })); await Promise.resolve();
    cache.clear(); const fresh = cache.getOrCreate("x", async () => "fresh"); resolve("stale"); await old;
    assert.equal(await fresh, "fresh"); assert.equal(await cache.getOrCreate("x", async () => "wrong"), "fresh");
  });
  await check("every route uses bounded request readers, including multipart uploads", () => {
    const visit = (dir: string) => {
      for (const file of readdirSync(dir, { withFileTypes: true })) {
        const path = join(dir, file.name);
        if (file.isDirectory()) visit(path);
        else if (file.name === "route.ts") assert.doesNotMatch(readFileSync(path, "utf8"), /\b(?:req|request)\.(?:json|text|arrayBuffer|formData)\(/, path);
      }
    };
    visit("src/app/api");
  });
  // Direct adapters + fake responses only: no provider calls or billed usage.
  process.env.DATABASE_URL = "postgresql://blocked:blocked@127.0.0.1:1/no_external_database";
  const { PROVIDERS } = await import("../src/lib/ai/index");
  const originalFetch = globalThis.fetch;
  try {
    for (const provider of ["openai", "anthropic"] as const) await check(`${provider} adapter bounds a stalled body and classifies it as timeout`, async () => {
      globalThis.fetch = async () => new Response(new ReadableStream({ start(c) { c.enqueue(new TextEncoder().encode('{"pending":')); } }), { status: 200 });
      await assert.rejects(() => PROVIDERS[provider].call({ prompt: "offline", timeoutMs: 1000 }, { apiKey: "offline-placeholder", model: "offline-model" }), (e: Error & { category?: string }) => e.category === "timeout");
    });
  } finally { globalThis.fetch = originalFetch; }
  try {
    await check("free-model fallback candidates share one provider deadline", async () => {
      let calls = 0;
      globalThis.fetch = async () => {
        calls++;
        if (calls === 1) { await new Promise((resolve) => setTimeout(resolve, 650)); return Response.json({ error: "offline unavailable" }, { status: 503 }); }
        return new Response(new ReadableStream({ start(c) { c.enqueue(new TextEncoder().encode('{"pending":')); } }));
      };
      const started = performance.now();
      await assert.rejects(() => PROVIDERS.openrouter.call({ prompt: "offline", timeoutMs: 1000 }, { apiKey: "offline-placeholder", model: "offline:free" }), (e: Error & { category?: string }) => e.category === "timeout");
      assert.ok(performance.now() - started < 1500); assert.equal(calls, 2);
    });
  } finally { globalThis.fetch = originalFetch; }
  const { fetchGuarded, fetchPageText } = await import("../src/lib/research-agent/fetch");
  try {
    await check("guarded fetch refuses even the initial private destination", async () => {
      globalThis.fetch = async () => { throw new Error("must not reach network"); };
      await assert.rejects(() => fetchGuarded("http://127.0.0.1/", {}), /refusing to fetch/);
    });
    await check("redirect bodies are cancelled and credentials never cross origins", async () => {
      let calls = 0, cancelled = false;
      globalThis.fetch = async (_url, init) => {
        calls++;
        if (calls === 1) return new Response(new ReadableStream({ cancel() { cancelled = true; return new Promise(() => undefined); } }), { status: 302, headers: { location: "https://other.example.org/page" } });
        const headers = new Headers(init?.headers); assert.equal(headers.has("authorization"), false); assert.equal(headers.has("cookie"), false);
        return new Response("ok");
      };
      assert.equal(await (await fetchGuarded("https://public.example.org/", { headers: { authorization: "offline-secret", cookie: "offline-cookie" } })).text(), "ok");
      assert.ok(cancelled);
    });
    await check("research skips oversized/non-page bodies rather than caching partial facts", async () => {
      let cancelled = false;
      globalThis.fetch = async () => new Response(new ReadableStream({ cancel() { cancelled = true; } }), { headers: { "content-type": "text/html", "content-length": String(3 * 1024 * 1024) } });
      assert.equal(await fetchPageText("https://public.example.org/too-big"), null); assert.ok(cancelled);
    });
  } finally { globalThis.fetch = originalFetch; }
  console.log(`\nBackend resilience: ${passed} checks passed; all network fault injection is loopback/mocked.`);
}
void main().catch((error) => { console.error(error); process.exitCode = 1; }).finally(() => { server.closeAllConnections(); server.close(); });
