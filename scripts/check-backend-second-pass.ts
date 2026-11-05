/** Pure/mocked second-pass regressions: no real services or billing. */
import assert from "node:assert/strict";
import { fetchBoundedResponse } from "../src/lib/boundedBody";
import { parsePagination, postgresId, boundedPageInteger } from "../src/lib/pagination";
import { parseResearchRequest } from "../src/lib/research-agent/request";
import { createRun, setRun, getRun, listRuns, appendProgress, ResearchCapacityError, MAX_RETAINED_RUNS } from "../src/lib/research-agent/registry";

let passed = 0;
async function check(name: string, fn: () => unknown | Promise<unknown>) { await fn(); passed++; console.log(`  ✓ ${name}`); }
const keepAlive = setInterval(() => {}, 1000);
async function main() {
  for (const value of ["NaN", "Infinity", "-1", "1.5", "", "9007199254740993"]) await check(`bad pagination ${JSON.stringify(value)} never reaches SQL`, () => {
    assert.equal(parsePagination(new URLSearchParams({ limit: value })).ok, false);
  });
  await check("pagination caps work and rejects expensive offsets", () => {
    assert.deepEqual(parsePagination(new URLSearchParams("limit=999999")), { ok: true, limit: 500, offset: 0 });
    assert.equal(parsePagination(new URLSearchParams("offset=100001")).ok, false);
    assert.equal(boundedPageInteger(NaN, 100, 1, 500), 100);
    assert.equal(boundedPageInteger(-1, 100, 1, 500), 100);
  });
  await check("Postgres IDs reject partial strings, coercions and int32 overflow", () => {
    for (const id of [true, false, [], [1], {}, null, "1oops", "1e2", "0x10", " 1 ", "0", -1, 1.5, 2147483648]) assert.equal(postgresId(id), null);
    assert.equal(postgresId("2147483647"), 2147483647);
  });
  await check("research defaults, de-duplication and cost limits are explicit", () => {
    const good = parseResearchRequest({ universityIds: [1, "1", 2], dryRun: true });
    assert.ok(good.ok); assert.deepEqual(good.request.universityIds, [1, 2]); assert.equal(good.request.scopes.length, 8); assert.equal(good.request.maxPages, 8);
    for (const body of [{ universityId: "bad" }, { universityId: -1 }, { universityId: true }, { universityIds: Array(51).fill(1) }, { universityId: 1, maxPages: 1000 }, { universityId: 1, maxPages: [2] }, { universityId: 1, scopes: ["typo"] }, { universityId: 1, dryRun: "true" }]) assert.equal(parseResearchRequest(body).ok, false);
  });
  await check("research admission is bounded without evicting running jobs", () => {
    const a = createRun(1), b = createRun(2);
    assert.throws(() => createRun(3), ResearchCapacityError);
    assert.ok(getRun(a)); assert.ok(getRun(b));
    setRun(a, { state: "complete" }); setRun(b, { state: "error" });
  });
  await check("research history, progress and reports remain bounded", () => {
    for (let i = 0; i < 25; i++) { const id = createRun(1); setRun(id, { state: "complete" }); }
    assert.equal(listRuns().length, MAX_RETAINED_RUNS);
    const id = createRun(1);
    for (let i = 0; i < 100; i++) appendProgress(id, "x".repeat(3000));
    assert.equal(getRun(id)?.progress.length, 40); assert.equal(getRun(id)?.progress[0].length, 2048);
    setRun(id, { report: { text: "x".repeat(3 * 1024 * 1024) } as never, state: "complete" });
    assert.equal(getRun(id)?.report, null); assert.match(getRun(id)?.error ?? "", /omitted/);
  });
  await check("finished research jobs expire while active jobs remain pollable", () => {
    const now = Date.now; const started = now(); const id = createRun(1);
    try { Date.now = () => started + 31 * 60_000; assert.equal(listRuns().length, 1); assert.ok(getRun(id)); }
    finally { Date.now = now; setRun(id, { state: "complete" }); }
  });
  process.env.DATABASE_URL ||= "postgresql://blocked:blocked@127.0.0.1:1/second_pass_only";
  const cache = await import("../src/lib/catalogCache");
  await check("a pre-edit detail reader cannot resurrect stale data", () => {
    const generation = cache.universityDetailCacheGeneration();
    cache.invalidateCatalogCache("universities");
    cache.setCachedUniversityDetailBase(1, { version: "old" }, generation);
    assert.equal(cache.getCachedUniversityDetailBase(1), null);
    cache.setCachedUniversityDetailBase(1, { version: "new" }, cache.universityDetailCacheGeneration());
    cache.setCachedUniversityDetailBase(1, { version: "old" }, generation);
    assert.deepEqual(cache.getCachedUniversityDetailBase(1), { version: "new" });
    cache.invalidateCatalogCache("scholarships"); assert.equal(cache.getCachedUniversityDetailBase(1), null);
  });
  const realFetch = globalThis.fetch;
  try {
    await check("headers time out even if a fetch wrapper ignores AbortSignal", async () => {
      globalThis.fetch = () => new Promise(() => {});
      await assert.rejects(() => fetchBoundedResponse("https://offline.invalid/", {}, 30, 100), (e: Error) => e.name === "TimeoutError");
    });
    await check("late headers release the abandoned response body", async () => {
      let finish!: (r: Response) => void; let cancelled = false;
      globalThis.fetch = () => new Promise((resolve) => { finish = resolve; });
      await assert.rejects(() => fetchBoundedResponse("https://offline.invalid/", {}, 30, 100));
      finish(new Response(new ReadableStream({ cancel() { cancelled = true; } })));
      await Promise.resolve(); await Promise.resolve(); assert.ok(cancelled);
    });
    const { callOpenRouterDecision, callOpenRouterEmbeddings } = await import("../src/lib/ai/openrouterModels");
    await check("specialized OpenRouter decision body cannot hang after headers", async () => {
      globalThis.fetch = async () => new Response(new ReadableStream({ start(c) { c.enqueue(new TextEncoder().encode('{"pending":')); } }));
      await assert.rejects(() => callOpenRouterDecision({ model: "offline/model", apiKey: "offline", state: {}, questions: {}, timeoutMs: 250 }), (e: Error) => e.name === "TimeoutError");
    });
    await check("specialized embedding oversize rejection never waits for cancellation", async () => {
      globalThis.fetch = async () => new Response(new ReadableStream({ start(c) { c.enqueue(new Uint8Array(2 * 1024 * 1024 + 1)); }, cancel() { return new Promise(() => {}); } }));
      const started = performance.now();
      await assert.rejects(() => callOpenRouterEmbeddings({ model: "offline/model", apiKey: "offline", input: "fixture", timeoutMs: 250 }));
      assert.ok(performance.now() - started < 1000);
    });
    const { tgCall } = await import("../src/lib/telegram/api");
    await check("Telegram stalled bodies use the whole-call budget", async () => {
      let calls = 0;
      globalThis.fetch = async () => { calls++; return new Response(new ReadableStream({ start(c) { c.enqueue(new TextEncoder().encode('{"ok":')); } })); };
      const started = performance.now(); const result = await tgCall("offline", "getMe", {}, 50);
      assert.equal(result.ok, false); assert.match(result.description ?? "", /timeout/i); assert.equal(calls, 1); assert.ok(performance.now() - started < 1000);
    });
    const { groqChatComplete } = await import("../src/lib/groq");
    const previousKey = process.env.GROQ_API_KEY; process.env.GROQ_API_KEY = "gsk_OFFLINE_TEST_ONLY_1234567890";
    try {
      await check("legacy Groq body consumes a bounded deadline", async () => {
        globalThis.fetch = async () => new Response(new ReadableStream({ start(c) { c.enqueue(new TextEncoder().encode('{"choices":')); } }));
        await assert.rejects(() => groqChatComplete({ messages: [], timeoutMs: 30 }), (e: Error) => e.name === "TimeoutError");
      });
      await check("legacy Groq never echoes the configured key in provider errors", async () => {
        globalThis.fetch = async () => Response.json({ error: { message: process.env.GROQ_API_KEY } }, { status: 401 });
        await assert.rejects(() => groqChatComplete({ messages: [] }), (e: Error) => !e.message.includes(process.env.GROQ_API_KEY!));
      });
    } finally { if (previousKey === undefined) delete process.env.GROQ_API_KEY; else process.env.GROQ_API_KEY = previousKey; }
  } finally { globalThis.fetch = realFetch; }
  console.log(`\nSecond-pass backend: ${passed} checks passed.`);
}
void main().catch((error) => { console.error(error); process.exitCode = 1; }).finally(() => clearInterval(keepAlive));
