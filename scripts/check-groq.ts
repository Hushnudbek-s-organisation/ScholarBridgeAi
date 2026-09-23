/**
 * Groq client tests — deterministic, no network, no API key.
 *
 * Exercises the REAL module (`src/lib/groq.ts`):
 *   - groqChatComplete: request shape (URL, auth header, jsonMode) + HTTP
 *     error mapping via a stubbed global fetch
 *   - describeGroqError mapping + 5xx detail + key redaction
 *   - withGroqRetry: 4 attempts, fail-fast 4xx, retry 429/5xx/transport
 *
 * Run:  npm run test:groq
 * Exit 0 + "Groq test passed (N assertions)" on success.
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  describeGroqError,
  getGroqModelName,
  GROQ_API_URL,
  GROQ_RETRY_MAX_ATTEMPTS,
  groqChatComplete,
  GroqApiError,
  isGroqConfigured,
  redactGroqSecrets,
  withGroqRetry,
} from "../src/lib/groq";

let passed = 0;
let failed = 0;
const failures: string[] = [];

async function check(name: string, fn: () => void | Promise<void>) {
  try {
    await fn();
    passed += 1;
    console.log(`  ✓ ${name}`);
  } catch (err) {
    failed += 1;
    failures.push(`${name}: ${(err as Error).message}`);
    console.error(`  ✗ ${name} — ${(err as Error).message}`);
  }
}

function httpErr(status: number, message = `HTTP ${status}`): Error & { status: number } {
  const err = new Error(message) as Error & { status: number };
  err.status = status;
  return err;
}

/** Skip real waits — tests only care about attempt counts and throw/return. */
const noSleep = { sleep: async () => {} };

/** Stub global.fetch for one groqChatComplete call; returns captured request. */
async function withStubbedFetch(
  responder: (url: string, init: RequestInit) => { ok: boolean; status: number; body: unknown },
  run: () => Promise<unknown>,
): Promise<{ url: string; init: RequestInit }> {
  const realFetch = globalThis.fetch;
  let capturedUrl = "";
  let capturedInit: RequestInit = {};
  globalThis.fetch = (async (url: string | URL | Request, init: RequestInit = {}) => {
    capturedUrl = String(url);
    capturedInit = init;
    const r = responder(capturedUrl, init);
    return {
      ok: r.ok,
      status: r.status,
      text: async () => JSON.stringify(r.body),
      json: async () => r.body,
    } as unknown as Response;
  }) as typeof fetch;
  try {
    await run();
  } finally {
    globalThis.fetch = realFetch;
  }
  return { url: capturedUrl, init: capturedInit };
}

async function main() {
  const MODEL = "llama-3.3-70b-versatile";

  // ---------------------------------------------------------------------------
  // Configuration helpers
  // ---------------------------------------------------------------------------
  await check("isGroqConfigured reflects GROQ_API_KEY presence", () => {
    const prev = process.env.GROQ_API_KEY;
    const prevModel = process.env.GROQ_MODEL;
    try {
      delete process.env.GROQ_API_KEY;
      assert.equal(isGroqConfigured(), false);
      process.env.GROQ_API_KEY = "gsk_test_key_1234567890";
      assert.equal(isGroqConfigured(), true);
      delete process.env.GROQ_MODEL;
      assert.equal(getGroqModelName(), MODEL);
      process.env.GROQ_MODEL = "llama-3.1-8b-instant";
      assert.equal(getGroqModelName(), "llama-3.1-8b-instant");
    } finally {
      if (prev) process.env.GROQ_API_KEY = prev;
      else delete process.env.GROQ_API_KEY;
      if (prevModel) process.env.GROQ_MODEL = prevModel;
      else delete process.env.GROQ_MODEL;
    }
  });

  // ---------------------------------------------------------------------------
  // groqChatComplete (stubbed fetch)
  // ---------------------------------------------------------------------------
  await check("groqChatComplete posts to Groq with Bearer auth + parses the reply", async () => {
    process.env.GROQ_API_KEY = "gsk_test_key_1234567890";
    const { url, init } = await withStubbedFetch(
      () => ({
        ok: true,
        status: 200,
        body: {
          choices: [{ message: { content: "Good morning, passport please." } }],
          model: MODEL,
          usage: { prompt_tokens: 42, completion_tokens: 7 },
        },
      }),
      async () => {
        const r = await groqChatComplete({
          messages: [
            { role: "system", content: "You are a visa officer." },
            { role: "user", content: "Begin." },
          ],
          temperature: 0.8,
          maxTokens: 300,
        });
        assert.equal(r.text, "Good morning, passport please.");
        assert.equal(r.model, MODEL);
        assert.equal(r.promptTokens, 42);
        assert.equal(r.completionTokens, 7);
      },
    );
    assert.equal(url, GROQ_API_URL);
    assert.equal(url, "https://api.groq.com/openai/v1/chat/completions");
    assert.equal(
      (init.headers as Record<string, string>).Authorization,
      "Bearer gsk_test_key_1234567890",
    );
    const body = JSON.parse(String(init.body)) as {
      model: string;
      messages: { role: string; content: string }[];
      temperature: number;
      max_tokens: number;
      response_format?: unknown;
    };
    assert.equal(body.model, MODEL);
    assert.equal(body.messages.length, 2);
    assert.equal(body.messages[0].role, "system");
    assert.equal(body.temperature, 0.8);
    assert.equal(body.max_tokens, 300);
    assert.equal(body.response_format, undefined, "plain mode must not set response_format");
    delete process.env.GROQ_API_KEY;
  });

  await check("jsonMode sets response_format json_object", async () => {
    process.env.GROQ_API_KEY = "gsk_test_key_1234567890";
    const { init } = await withStubbedFetch(
      () => ({
        ok: true,
        status: 200,
        body: { choices: [{ message: { content: "{\n  \"confidence\": 50\n}" } }] },
      }),
      async () => {
        const r = await groqChatComplete({
          messages: [{ role: "user", content: "Respond with JSON ONLY" }],
          jsonMode: true,
        });
        assert.ok(r.text.includes("confidence"));
      },
    );
    const body = JSON.parse(String(init.body)) as { response_format?: { type?: string } };
    assert.equal(body.response_format?.type, "json_object");
    delete process.env.GROQ_API_KEY;
  });

  await check("HTTP failure throws GroqApiError with status + API detail", async () => {
    process.env.GROQ_API_KEY = "gsk_test_key_1234567890";
    await withStubbedFetch(
      () => ({
        ok: false,
        status: 429,
        body: { error: { message: "Rate limit reached. Please try again later." } },
      }),
      async () => {
        await assert.rejects(
          () => groqChatComplete({ messages: [{ role: "user", content: "hi" }] }),
          (err: unknown) => {
            const e = err as GroqApiError;
            return e instanceof GroqApiError && e.status === 429 && /Rate limit/.test(e.message);
          },
        );
      },
    );
    delete process.env.GROQ_API_KEY;
  });

  await check("missing key throws before any network call", async () => {
    const prev = process.env.GROQ_API_KEY;
    delete process.env.GROQ_API_KEY;
    try {
      await assert.rejects(
        () => groqChatComplete({ messages: [{ role: "user", content: "hi" }] }),
        (err: unknown) => err instanceof GroqApiError && /GROQ_API_KEY/.test((err as Error).message),
      );
    } finally {
      if (prev) process.env.GROQ_API_KEY = prev;
    }
  });

  // ---------------------------------------------------------------------------
  // describeGroqError
  // ---------------------------------------------------------------------------
  await check("404 maps to deprecated-model guidance mentioning GROQ_MODEL", () => {
    const msg = describeGroqError(httpErr(404, "The model `llama-3.1-8b-instant` has been deprecated"), MODEL);
    assert.match(msg, /404/);
    assert.match(msg, /deprecated|not found/i);
    assert.match(msg, /GROQ_MODEL/);
    assert.ok(msg.includes(MODEL));
  });

  await check("401 tells the operator to check GROQ_API_KEY", () => {
    const msg = describeGroqError(httpErr(401, "Invalid API Key"), MODEL);
    assert.match(msg, /401/);
    assert.match(msg, /GROQ_API_KEY/);
    assert.match(msg, /invalid/i);
  });

  await check("400 includes the first-line API detail", () => {
    const msg = describeGroqError(
      httpErr(400, "Groq API error (400): Failed to generate content due to invalid parameters"),
      MODEL,
    );
    assert.match(msg, /400/);
    assert.match(msg, /invalid parameters/);
  });

  await check("403 refuses access and mentions GROQ_API_KEY", () => {
    const msg = describeGroqError(httpErr(403, "Permission denied"), MODEL);
    assert.match(msg, /403/);
    assert.match(msg, /GROQ_API_KEY/);
    assert.match(msg, /refused access/i);
  });

  await check("429 maps to rate-limit guidance", () => {
    const msg = describeGroqError(httpErr(429, "Rate limit reached for request"), MODEL);
    assert.match(msg, /429/);
    assert.match(msg, /rate limit/i);
  });

  await check("413 maps to conversation-too-long guidance", () => {
    const msg = describeGroqError(httpErr(413, "Request Entity Too Large"), MODEL);
    assert.match(msg, /413/);
    assert.match(msg, /too (large|long)/i);
  });

  await check("5xx includes the API detail line (overloaded)", () => {
    const msg = describeGroqError(
      httpErr(503, "Groq API error (503): The model is overloaded. Please try again later."),
      MODEL,
    );
    assert.match(msg, /503/);
    assert.match(msg, /overloaded/i);
  });

  await check("statusless Errors pass through (empty-reply guards)", () => {
    const msg = describeGroqError(new Error("The AI officer returned an empty reply."), MODEL);
    assert.equal(msg, "The AI officer returned an empty reply.");
  });

  await check("long API payloads are truncated to 280 chars of detail", () => {
    const long = "N".repeat(600);
    const msg = describeGroqError(httpErr(400, long), MODEL);
    assert.ok(msg.length < 400, `message too long: ${msg.length}`);
    assert.ok(!msg.includes("N".repeat(281)));
  });

  await check("gsk_… key-shaped text is redacted from detail", () => {
    const key = "gsk_DummyKey1234567890abcdefgh";
    const msg = describeGroqError(
      httpErr(500, `upstream failed for key ${key}`),
      MODEL,
    );
    assert.ok(!msg.includes(key), `leaked key: ${msg}`);
    assert.match(msg, /gsk_\[REDACTED\]/);
    assert.match(msg, /500/);
  });

  await check("redactGroqSecrets strips Bearer tokens", () => {
    const secret = "gsk_BearerSecret1234567890xyz";
    const out = redactGroqSecrets(`Authorization: Bearer ${secret} sent`);
    assert.ok(!out.includes(secret), `leaked bearer: ${out}`);
    assert.match(out, /Bearer \[REDACTED\]/);
  });

  // ---------------------------------------------------------------------------
  // withGroqRetry
  // ---------------------------------------------------------------------------
  await check("succeeds on the first attempt without retrying", async () => {
    let calls = 0;
    const result = await withGroqRetry(async () => {
      calls += 1;
      return "ok";
    }, noSleep);
    assert.equal(result, "ok");
    assert.equal(calls, 1);
  });

  await check("retries a 503 then succeeds", async () => {
    let calls = 0;
    const result = await withGroqRetry(async () => {
      calls += 1;
      if (calls === 1) throw httpErr(503, "The model is overloaded.");
      return "recovered";
    }, noSleep);
    assert.equal(result, "recovered");
    assert.equal(calls, 2);
  });

  await check("400 fails fast (no retry)", async () => {
    let calls = 0;
    await assert.rejects(
      () =>
        withGroqRetry(async () => {
          calls += 1;
          throw httpErr(400, "invalid parameters");
        }, noSleep),
      (err: unknown) => (err as { status?: number }).status === 400,
    );
    assert.equal(calls, 1);
  });

  await check("401 fails fast (no retry)", async () => {
    let calls = 0;
    await assert.rejects(
      () =>
        withGroqRetry(async () => {
          calls += 1;
          throw httpErr(401, "Unauthorized");
        }, noSleep),
    );
    assert.equal(calls, 1);
  });

  await check("403 fails fast (no retry)", async () => {
    let calls = 0;
    await assert.rejects(
      () =>
        withGroqRetry(async () => {
          calls += 1;
          throw httpErr(403, "Forbidden");
        }, noSleep),
    );
    assert.equal(calls, 1);
  });

  await check("404 fails fast (no retry)", async () => {
    let calls = 0;
    await assert.rejects(
      () =>
        withGroqRetry(async () => {
          calls += 1;
          throw httpErr(404, "model not found");
        }, noSleep),
    );
    assert.equal(calls, 1);
  });

  await check("429 is retried then succeeds", async () => {
    let calls = 0;
    const result = await withGroqRetry(async () => {
      calls += 1;
      if (calls < 3) throw httpErr(429, "Rate limit reached");
      return "after-quota";
    }, noSleep);
    assert.equal(result, "after-quota");
    assert.equal(calls, 3);
  });

  await check("transport 'fetch failed' is retried then succeeds", async () => {
    let calls = 0;
    const result = await withGroqRetry(async () => {
      calls += 1;
      if (calls === 1) throw new Error("fetch failed");
      return "after-fetch";
    }, noSleep);
    assert.equal(result, "after-fetch");
    assert.equal(calls, 2);
  });

  await check("ECONNRESET is retried then succeeds", async () => {
    let calls = 0;
    const result = await withGroqRetry(async () => {
      calls += 1;
      if (calls === 1) {
        const err = new Error("read ECONNRESET") as Error & { code: string };
        err.code = "ECONNRESET";
        throw err;
      }
      return "after-reset";
    }, noSleep);
    assert.equal(result, "after-reset");
    assert.equal(calls, 2);
  });

  await check("persistent 503 exhausts 4 attempts then throws", async () => {
    let calls = 0;
    await assert.rejects(
      () =>
        withGroqRetry(async () => {
          calls += 1;
          throw httpErr(503, "The model is overloaded.");
        }, noSleep),
      (err: unknown) => (err as { status?: number }).status === 503,
    );
    assert.equal(calls, GROQ_RETRY_MAX_ATTEMPTS);
    assert.equal(calls, 4);
  });

  // Structural sanity: visa routes actually wrap groqChatComplete.
  // (Not counted — the assertions above are the contract.)
  const ROOT = join(import.meta.dirname, "..");
  const chat = readFileSync(join(ROOT, "src/app/api/visa/chat/route.ts"), "utf8");
  const analyze = readFileSync(join(ROOT, "src/app/api/visa/analyze/route.ts"), "utf8");
  const pkg = JSON.parse(readFileSync(join(ROOT, "package.json"), "utf8")) as {
    scripts?: Record<string, string>;
  };
  if (!chat.includes("withGroqRetry") || !analyze.includes("withGroqRetry")) {
    throw new Error("visa routes must wrap groqChatComplete in withGroqRetry");
  }
  if (!pkg.scripts?.["test:groq"]?.includes("check-groq.ts")) {
    throw new Error("package.json missing test:groq script");
  }

  console.log("");
  if (failed > 0) {
    console.error(`Groq test FAILED — ${failed} assertion(s) failed:`);
    for (const f of failures) console.error("  - " + f);
    process.exit(1);
  }
  console.log(`Groq test passed (${passed} assertions)`);
}

main().catch((err) => {
  console.error("Groq test crashed:", err);
  process.exit(1);
});
