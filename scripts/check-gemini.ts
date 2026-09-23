/**
 * Gemini client tests — deterministic, no network, no API key.
 *
 * Exercises the REAL module (`src/lib/gemini.ts`):
 *   - describeGeminiError mapping + 5xx detail + key redaction
 *   - withGeminiRetry: 4 attempts, fail-fast 4xx, retry 429/5xx/transport
 *
 * Run:  npm run test:gemini
 * Exit 0 + "Gemini test passed (20 assertions)" on success.
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  describeGeminiError,
  GEMINI_RETRY_MAX_ATTEMPTS,
  withGeminiRetry,
} from "../src/lib/gemini";

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

async function main() {
  const MODEL = "gemini-3.8-flash";

  // ---------------------------------------------------------------------------
  // describeGeminiError
  // ---------------------------------------------------------------------------
  await check("404 maps to retired-model guidance mentioning GEMINI_MODEL", () => {
    const msg = describeGeminiError(httpErr(404, "models/gemini-1.5-flash is not found"), MODEL);
    assert.match(msg, /404/);
    assert.match(msg, /gemini-3\.8-flash|retired|not found/i);
    assert.match(msg, /GEMINI_MODEL/);
    assert.ok(msg.includes(MODEL));
  });

  await check("400 API_KEY_INVALID tells operator to check GEMINI_API_KEY", () => {
    const msg = describeGeminiError(
      httpErr(400, "[GoogleGenerativeAI Error]: API_KEY_INVALID"),
      MODEL,
    );
    assert.match(msg, /400/);
    assert.match(msg, /GEMINI_API_KEY/);
    assert.match(msg, /invalid/i);
  });

  await check("400 generic includes the first-line Google detail", () => {
    const msg = describeGeminiError(
      httpErr(400, "[GoogleGenerativeAI Error]: INVALID_ARGUMENT: temperature out of range"),
      MODEL,
    );
    assert.match(msg, /400/);
    assert.match(msg, /temperature out of range/);
    assert.doesNotMatch(msg, /\[GoogleGenerativeAI Error\]/);
  });

  await check("401 and 403 refuse access and mention GEMINI_API_KEY", () => {
    const m401 = describeGeminiError(httpErr(401, "Unauthorized"), MODEL);
    const m403 = describeGeminiError(httpErr(403, "Permission denied"), MODEL);
    assert.match(m401, /401/);
    assert.match(m403, /403/);
    assert.match(m401, /GEMINI_API_KEY/);
    assert.match(m403, /GEMINI_API_KEY/);
    assert.match(m401, /refused access/i);
    assert.match(m403, /refused access/i);
  });

  await check("429 maps to quota/rate-limit guidance", () => {
    const msg = describeGeminiError(httpErr(429, "RESOURCE_EXHAUSTED"), MODEL);
    assert.match(msg, /429/);
    assert.match(msg, /quota|rate limit/i);
  });

  await check("5xx includes Google's detail line (overload)", () => {
    const msg = describeGeminiError(
      httpErr(
        503,
        "[GoogleGenerativeAI Error]: Error fetching from https://generativelanguage.googleapis.com/v1beta/models/x:generateContent: [503 Service Unavailable] The model is overloaded. Please try again later.",
      ),
      MODEL,
    );
    assert.match(msg, /503/);
    assert.match(msg, /overloaded/i);
    assert.doesNotMatch(msg, /\[GoogleGenerativeAI Error\]/);
  });

  await check("statusless Errors pass through (empty-reply guards)", () => {
    const msg = describeGeminiError(new Error("The AI officer returned an empty reply."), MODEL);
    assert.equal(msg, "The AI officer returned an empty reply.");
  });

  await check("long SDK payloads are truncated to 280 chars of detail", () => {
    const long = "N".repeat(600);
    const msg = describeGeminiError(httpErr(400, long), MODEL);
    assert.ok(msg.length < 400, `message too long: ${msg.length}`);
    assert.ok(!msg.includes("N".repeat(281)));
  });

  await check("AIza… key-shaped text is redacted from 5xx detail", () => {
    const key = "AIzaSyDummyKey1234567890abcdefZZ";
    const msg = describeGeminiError(
      httpErr(500, `upstream failed for key ${key}`),
      MODEL,
    );
    assert.ok(!msg.includes(key), `leaked key: ${msg}`);
    assert.match(msg, /AIza\[REDACTED\]/);
    assert.match(msg, /500/);
  });

  await check("?key= query param is redacted from 5xx detail", () => {
    const secret = "super-secret-gemini-key-value";
    const msg = describeGeminiError(
      httpErr(
        502,
        `Error fetching from https://generativelanguage.googleapis.com/v1beta/models/x:generateContent?key=${secret}`,
      ),
      MODEL,
    );
    assert.ok(!msg.includes(secret), `leaked ?key= value: ${msg}`);
    assert.match(msg, /[?&]key=\[REDACTED\]/);
    assert.match(msg, /502/);
  });

  // ---------------------------------------------------------------------------
  // withGeminiRetry
  // ---------------------------------------------------------------------------
  await check("succeeds on the first attempt without retrying", async () => {
    let calls = 0;
    const result = await withGeminiRetry(async () => {
      calls += 1;
      return "ok";
    }, noSleep);
    assert.equal(result, "ok");
    assert.equal(calls, 1);
  });

  await check("retries a 503 then succeeds", async () => {
    let calls = 0;
    const result = await withGeminiRetry(async () => {
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
        withGeminiRetry(async () => {
          calls += 1;
          throw httpErr(400, "INVALID_ARGUMENT");
        }, noSleep),
      (err: unknown) => (err as { status?: number }).status === 400,
    );
    assert.equal(calls, 1);
  });

  await check("401 fails fast (no retry)", async () => {
    let calls = 0;
    await assert.rejects(
      () =>
        withGeminiRetry(async () => {
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
        withGeminiRetry(async () => {
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
        withGeminiRetry(async () => {
          calls += 1;
          throw httpErr(404, "model not found");
        }, noSleep),
    );
    assert.equal(calls, 1);
  });

  await check("429 is retried then succeeds", async () => {
    let calls = 0;
    const result = await withGeminiRetry(async () => {
      calls += 1;
      if (calls < 3) throw httpErr(429, "RESOURCE_EXHAUSTED");
      return "after-quota";
    }, noSleep);
    assert.equal(result, "after-quota");
    assert.equal(calls, 3);
  });

  await check("transport 'fetch failed' is retried then succeeds", async () => {
    let calls = 0;
    const result = await withGeminiRetry(async () => {
      calls += 1;
      if (calls === 1) throw new Error("fetch failed");
      return "after-fetch";
    }, noSleep);
    assert.equal(result, "after-fetch");
    assert.equal(calls, 2);
  });

  await check("ECONNRESET is retried then succeeds", async () => {
    let calls = 0;
    const result = await withGeminiRetry(async () => {
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
        withGeminiRetry(async () => {
          calls += 1;
          throw httpErr(503, "The model is overloaded.");
        }, noSleep),
      (err: unknown) => (err as { status?: number }).status === 503,
    );
    assert.equal(calls, GEMINI_RETRY_MAX_ATTEMPTS);
    assert.equal(calls, 4);
  });

  // Structural sanity: visa routes actually wrap generateContent.
  // (Not counted — the 20 assertions above are the contract.)
  const ROOT = join(import.meta.dirname, "..");
  const chat = readFileSync(join(ROOT, "src/app/api/visa/chat/route.ts"), "utf8");
  const analyze = readFileSync(join(ROOT, "src/app/api/visa/analyze/route.ts"), "utf8");
  const pkg = JSON.parse(readFileSync(join(ROOT, "package.json"), "utf8")) as {
    scripts?: Record<string, string>;
  };
  if (!chat.includes("withGeminiRetry") || !analyze.includes("withGeminiRetry")) {
    throw new Error("visa routes must wrap generateContent in withGeminiRetry");
  }
  if (!pkg.scripts?.["test:gemini"]?.includes("check-gemini.ts")) {
    throw new Error("package.json missing test:gemini script");
  }

  console.log("");
  if (failed > 0) {
    console.error(`Gemini test FAILED — ${failed} assertion(s) failed:`);
    for (const f of failures) console.error("  - " + f);
    process.exit(1);
  }
  console.log(`Gemini test passed (${passed} assertions)`);
}

main().catch((err) => {
  console.error("Gemini test crashed:", err);
  process.exit(1);
});
