/**
 * AI cost accounting, budgets and entitlement wiring — deterministic, no
 * database and no network (provider HTTP is mocked with fetch).
 *
 * Covers: price table validation, cost decision (provider-reported / estimated /
 * unknown), adapter usage parsing (OpenAI-style, OpenRouter, Anthropic),
 * retry/no-duplicate behaviour, budget decisions, config validators, and
 * structural checks that the voice, visa, pricing and admin wiring is in place.
 * Database-backed behaviour (quota races, budget blocking, live allowances)
 * is covered by scripts/check-integration.ts section 13.
 *
 * Run:  npm run test:ai-cost
 */
process.env.DATABASE_URL = "postgresql://x:x@localhost:5432/x"; // dummy — no DB queries are expected to succeed

import { readFileSync } from "node:fs";
import { join } from "node:path";
import assert from "node:assert/strict";

async function main() {
  const pricing = await import("../src/lib/ai/pricing");
  const budget = await import("../src/lib/ai/budget");
  const aiCore = await import("../src/lib/ai/index");
  const settings = await import("../src/lib/ai/settings");
  const quota = await import("../src/lib/ai/quota");
  const { validateConfigValue } = await import("../src/lib/configPortability");
  const { CONFIG_DEFAULTS } = await import("../src/lib/config");

  let passed = 0;
  let failed = 0;
  const failures: string[] = [];
  const check = (name: string, fn: () => void) => {
    try {
      fn();
      passed += 1;
      console.log(`  ✓ ${name}`);
    } catch (err) {
      failed += 1;
      failures.push(`${name}: ${(err as Error).message}`);
      console.error(`  ✗ ${name} — ${(err as Error).message}`);
    }
  };
  const checkAsync = async (name: string, fn: () => Promise<void>) => {
    try {
      await fn();
      passed += 1;
      console.log(`  ✓ ${name}`);
    } catch (err) {
      failed += 1;
      failures.push(`${name}: ${(err as Error).message}`);
      console.error(`  ✗ ${name} — ${(err as Error).message}`);
    }
  };

  const isChat = (id: string) => settings.isAIProviderId(id) && settings.isChatProvider(id);
  const usage = (over: Partial<import("../src/lib/ai/pricing").UsageFigures> = {}) => ({
    promptTokens: 1000,
    completionTokens: 500,
    cachedPromptTokens: 0,
    reported: true,
    ...over,
  });

  console.log("\nPrice table (admin input)");
  check("empty config = no prices (nothing invented)", () => {
    const r = pricing.parsePricingJson("", isChat);
    assert.ok(r.ok && Object.keys(r.table).length === 0);
    assert.equal(CONFIG_DEFAULTS.ai_model_pricing, "{}", "the shipped default must contain no prices");
  });
  check("a valid table parses", () => {
    const r = pricing.parsePricingJson(
      JSON.stringify({ groq: { "openai/gpt-oss-120b": { inputPerMTok: 0.15, outputPerMTok: 0.6, cachedInputPerMTok: 0.075 } } }),
      isChat,
    );
    assert.ok(r.ok);
    if (r.ok) assert.equal(r.table.groq["openai/gpt-oss-120b"].cachedInputPerMTok, 0.075);
  });
  check("invalid JSON / non-object / unknown provider are rejected", () => {
    assert.equal(pricing.parsePricingJson("{nope", isChat).ok, false);
    assert.equal(pricing.parsePricingJson("[]", isChat).ok, false);
    assert.equal(pricing.parsePricingJson(JSON.stringify({ gemini: { m: { inputPerMTok: 1, outputPerMTok: 1 } } }), isChat).ok, false, "voice-only provider has no chat price");
    assert.equal(pricing.parsePricingJson(JSON.stringify({ nope: { m: { inputPerMTok: 1, outputPerMTok: 1 } } }), isChat).ok, false);
  });
  check("negative, non-numeric and absurd prices are rejected (typo guard)", () => {
    const bad = (p: unknown) => pricing.parsePricingJson(JSON.stringify({ groq: { m: p } }), isChat).ok;
    assert.equal(bad({ inputPerMTok: -1, outputPerMTok: 1 }), false);
    assert.equal(bad({ inputPerMTok: "1", outputPerMTok: 1 }), false);
    assert.equal(bad({ inputPerMTok: 1, outputPerMTok: 5000 }), false);
    assert.equal(bad({ inputPerMTok: 1 }), false);
    assert.equal(bad({ inputPerMTok: 1, outputPerMTok: 1, typo: 2 }), false);
  });
  check("model ids with unsafe characters are rejected", () => {
    assert.equal(pricing.parsePricingJson(JSON.stringify({ groq: { "a b": { inputPerMTok: 1, outputPerMTok: 1 } } }), isChat).ok, false);
  });

  console.log("\nCost decision (one place, per response)");
  const table = { groq: { m: { inputPerMTok: 1, outputPerMTok: 2, cachedInputPerMTok: 0.1 } } };
  check("provider-reported USD wins over any estimate", () => {
    const r = pricing.costForUsage("groq", "m", usage({ providerCostUsd: 0.25 }), table);
    assert.deepEqual(r, { costUsd: 0.25, costStatus: "provider_reported" });
  });
  check("no usage metadata → cost unknown (not 0)", () => {
    const r = pricing.costForUsage("groq", "m", usage({ reported: false, promptTokens: 0, completionTokens: 0 }), table);
    assert.equal(r.costUsd, null);
    assert.equal(r.costStatus, "usage_unreported");
  });
  check("tokens known but no price configured → unknown_pricing (not 0)", () => {
    const r = pricing.costForUsage("groq", "other-model", usage(), table);
    assert.equal(r.costUsd, null);
    assert.equal(r.costStatus, "unknown_pricing");
  });
  check("priced model → estimated, exact arithmetic (cached tokens at the cached rate)", () => {
    // 1000 prompt of which 400 cached: 600×1 + 400×0.1 + 500×2 = 1640 per 1M tokens
    const r = pricing.costForUsage("groq", "m", usage({ cachedPromptTokens: 400 }), table);
    assert.equal(r.costStatus, "estimated");
    assert.ok(Math.abs((r.costUsd ?? -1) - 0.00164) < 1e-12, `got ${r.costUsd}`);
  });
  check("cached price defaults to the input price", () => {
    const flat = { groq: { m: { inputPerMTok: 1, outputPerMTok: 0 } } };
    const r = pricing.costForUsage("groq", "m", usage({ cachedPromptTokens: 1000, completionTokens: 0 }), flat);
    assert.ok(Math.abs((r.costUsd ?? -1) - 0.001) < 1e-12);
  });
  check("a genuinely zero-token response priced at zero is a MEASURED zero, not unknown", () => {
    const r = pricing.costForUsage("groq", "m", usage({ promptTokens: 0, completionTokens: 0 }), table);
    assert.deepEqual(r, { costUsd: 0, costStatus: "estimated" });
  });
  check("only known statuses are summed into spend", () => {
    assert.deepEqual([...pricing.KNOWN_COST_STATUSES].sort(), ["estimated", "provider_reported"]);
  });

  console.log("\nAdapters — usage parsing (mocked provider HTTP, through the real router)");
  const KEYS = {
    groq: "gsk_groqTESTKEY00000000000000000002",
    openrouter: "sk-or-v1-openrouterTESTKEY0000000004",
    anthropic: "sk-ant-anthropicTESTKEY000000000003",
  };
  const ENV_KEYS = [
    ...settings.AI_PROVIDER_IDS.flatMap((id) => [settings.AI_PROVIDERS[id].keyEnvVar, settings.AI_PROVIDERS[id].modelEnvVar]),
    ...Object.values(settings.TASK_PROVIDER_ENV),
    "AI_PROVIDER_DEFAULT",
    "AI_PROVIDER_FALLBACK",
    "AI_PROVIDERS_DISABLED",
  ];
  type Call = { url: string; body: Record<string, unknown>; auth: string };
  async function withMock(
    env: Record<string, string>,
    handler: (call: Call, n: number) => { status: number; body: unknown },
    fn: (calls: Call[], logs: string[]) => Promise<void>,
  ) {
    const saved: Record<string, string | undefined> = {};
    for (const k of ENV_KEYS) { saved[k] = process.env[k]; delete process.env[k]; }
    Object.assign(process.env, env);
    const realFetch = globalThis.fetch;
    const calls: Call[] = [];
    const logs: string[] = [];
    const origErr = console.error, origWarn = console.warn, origInfo = console.info;
    const capture = (...a: unknown[]) => logs.push(a.map(String).join(" "));
    console.error = capture; console.warn = capture; console.info = capture;
    globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
      const headers = new Headers(init?.headers);
      const call: Call = {
        url: String(input),
        body: init?.body ? JSON.parse(String(init.body)) : {},
        auth: headers.get("authorization") || headers.get("x-api-key") || "",
      };
      calls.push(call);
      const r = handler(call, calls.length);
      return new Response(JSON.stringify(r.body), { status: r.status, headers: { "Content-Type": "application/json" } });
    }) as typeof fetch;
    try {
      await fn(calls, logs);
    } finally {
      globalThis.fetch = realFetch;
      console.error = origErr; console.warn = origWarn; console.info = origInfo;
      for (const k of ENV_KEYS) { if (saved[k] === undefined) delete process.env[k]; else process.env[k] = saved[k]; }
    }
  }
  const noSleep = async () => {};

  await checkAsync("OpenAI-style usage: tokens + cached tokens parsed; no fabricated zero cost", async () => {
    await withMock(
      { GROQ_API_KEY: KEYS.groq, AI_PROVIDER_GENERAL: "groq" },
      () => ({
        status: 200,
        body: {
          model: "openai/gpt-oss-120b",
          choices: [{ message: { content: "hello" } }],
          usage: { prompt_tokens: 120, completion_tokens: 30, prompt_tokens_details: { cached_tokens: 40 } },
        },
      }),
      async () => {
        const r = await aiCore.aiChat({ taskType: "general", prompt: "hi" }, { sleep: noSleep });
        assert.ok(r.ok);
        if (!r.ok) return;
        assert.equal(r.response.promptTokens, 120);
        assert.equal(r.response.completionTokens, 30);
        assert.equal(r.response.cachedPromptTokens, 40);
        assert.equal(r.response.usageReported, true);
        // No price is configured in this test run, so the cost must be UNKNOWN.
        assert.equal(r.response.costEstimate, null, "must not be 0");
        assert.equal(r.response.costStatus, "unknown_pricing");
      },
    );
  });

  await checkAsync("missing usage → tokens unknown, cost unknown, flagged as unreported", async () => {
    await withMock(
      { GROQ_API_KEY: KEYS.groq, AI_PROVIDER_GENERAL: "groq" },
      () => ({ status: 200, body: { model: "m", choices: [{ message: { content: "ok" } }] } }),
      async () => {
        const r = await aiCore.aiChat({ taskType: "general", prompt: "hi" }, { sleep: noSleep });
        assert.ok(r.ok);
        if (!r.ok) return;
        assert.equal(r.response.usageReported, false);
        assert.equal(r.response.costEstimate, null);
        assert.equal(r.response.costStatus, "usage_unreported");
      },
    );
  });

  await checkAsync("OpenRouter: asks for usage accounting and records the billed USD amount", async () => {
    await withMock(
      { OPENROUTER_API_KEY: KEYS.openrouter, AI_PROVIDER_GENERAL: "openrouter" },
      () => ({
        status: 200,
        body: {
          model: "meta-llama/llama-3.3-70b-instruct",
          choices: [{ message: { content: "ok" } }],
          usage: { prompt_tokens: 200, completion_tokens: 80, cost: 0.000123 },
        },
      }),
      async (calls) => {
        const r = await aiCore.aiChat({ taskType: "general", prompt: "hi" }, { sleep: noSleep });
        assert.ok(r.ok);
        assert.deepEqual(calls[0].body.usage, { include: true }, "request must ask OpenRouter for usage accounting");
        if (!r.ok) return;
        assert.equal(r.response.costStatus, "provider_reported");
        assert.equal(r.response.costEstimate, 0.000123);
      },
    );
  });

  await checkAsync("non-OpenRouter providers are NOT sent the OpenRouter-only usage flag", async () => {
    await withMock(
      { GROQ_API_KEY: KEYS.groq, AI_PROVIDER_GENERAL: "groq" },
      () => ({ status: 200, body: { choices: [{ message: { content: "ok" } }], usage: { prompt_tokens: 1, completion_tokens: 1 } } }),
      async (calls) => {
        await aiCore.aiChat({ taskType: "general", prompt: "hi" }, { sleep: noSleep });
        assert.equal("usage" in calls[0].body, false);
      },
    );
  });

  await checkAsync("Anthropic: cache reads/writes are folded into the prompt total", async () => {
    await withMock(
      { ANTHROPIC_API_KEY: KEYS.anthropic, AI_PROVIDER_GENERAL: "anthropic" },
      () => ({
        status: 200,
        body: {
          model: "claude-3-5-sonnet-latest",
          content: [{ type: "text", text: "ok" }],
          usage: { input_tokens: 100, cache_read_input_tokens: 50, cache_creation_input_tokens: 10, output_tokens: 20 },
        },
      }),
      async () => {
        const r = await aiCore.aiChat({ taskType: "general", prompt: "hi" }, { sleep: noSleep });
        assert.ok(r.ok);
        if (!r.ok) return;
        assert.equal(r.response.promptTokens, 160);
        assert.equal(r.response.cachedPromptTokens, 50);
        assert.equal(r.response.completionTokens, 20);
        assert.equal(r.response.costEstimate, null);
      },
    );
  });

  await checkAsync("retry on a transient error: second attempt succeeds, one reply, attempts counted", async () => {
    await withMock(
      { GROQ_API_KEY: KEYS.groq, AI_PROVIDER_GENERAL: "groq" },
      (_c, n) =>
        n === 1
          ? { status: 429, body: { error: { message: "rate limited" } } }
          : { status: 200, body: { choices: [{ message: { content: "ok" } }], usage: { prompt_tokens: 3, completion_tokens: 1 } } },
      async (calls) => {
        const r = await aiCore.aiChat({ taskType: "general", prompt: "hi" }, { maxAttempts: 3, sleep: noSleep });
        assert.ok(r.ok);
        assert.equal(calls.length, 2);
        if (r.ok) assert.equal(r.attempts, 2);
      },
    );
  });

  await checkAsync("bad_request is never retried (no repeated paid call)", async () => {
    await withMock(
      { GROQ_API_KEY: KEYS.groq, AI_PROVIDER_GENERAL: "groq" },
      () => ({ status: 400, body: { error: { message: "bad" } } }),
      async (calls) => {
        const r = await aiCore.aiChat({ taskType: "general", prompt: "hi" }, { maxAttempts: 5, sleep: noSleep });
        assert.equal(r.ok, false);
        assert.equal(calls.length, 1);
      },
    );
  });

  await checkAsync("failure reply carries the category and never the key or prompt", async () => {
    const PROMPT = "PROMPT-MUST-NOT-LEAK-7731";
    await withMock(
      { GROQ_API_KEY: KEYS.groq, AI_PROVIDER_GENERAL: "groq" },
      () => ({ status: 401, body: { error: { message: `invalid key ${KEYS.groq}` } } }),
      async (_calls, logs) => {
        const r = await aiCore.aiChat({ taskType: "general", prompt: PROMPT }, { sleep: noSleep });
        assert.equal(r.ok, false);
        if (!r.ok) assert.equal(r.error.category, "auth");
        const joined = logs.join("\n");
        assert.ok(!joined.includes(KEYS.groq), "logs must not contain the key");
        assert.ok(!joined.includes(PROMPT), "logs must not contain the prompt");
      },
    );
  });

  const gate = await import("../src/lib/ai/budget-gate");
  await checkAsync("budget gate fails OPEN without a database (documented; the call proceeds and is logged)", async () => {
    gate.resetBudgetGateLogThrottleForTests();
    await withMock(
      { GROQ_API_KEY: KEYS.groq, AI_PROVIDER_GENERAL: "groq" },
      () => ({ status: 200, body: { choices: [{ message: { content: "ok" } }], usage: { prompt_tokens: 1, completion_tokens: 1 } } }),
      async (_calls, logs) => {
        const r = await aiCore.aiChat({ taskType: "general", prompt: "hi" }, { sleep: noSleep });
        assert.ok(r.ok);
        assert.ok(logs.some((l) => l.includes("ai_budget_unavailable")), "the fail-open decision must be logged");
      },
    );
  });

  await checkAsync("a budget-exhausted failure maps to a neutral 503 message with no billing detail", async () => {
    const msg = aiCore.describeAiError(new aiCore.AIProviderError("groq", "budget_exhausted", "AI spend budget reached (daily)"));
    assert.equal(aiCore.aiErrorStatus(new aiCore.AIProviderError("groq", "budget_exhausted", "x")), 503);
    assert.ok(!/budget|\$|USD|limit of|spend/i.test(msg), `message leaks billing detail: ${msg}`);
  });

  console.log("\nBudget decisions (pure)");
  const spend = (dayUsd: number, monthUsd: number, byProv: Record<string, number> = {}) => ({ dayUsd, monthUsd, dayByProviderUsd: byProv });
  const limits = (over: Partial<import("../src/lib/ai/budget").BudgetLimits> = {}) => ({
    dailyUsd: 10,
    monthlyUsd: 150,
    providerDailyUsd: {},
    warnPercent: 80,
    ...over,
  });
  check("under every limit → allowed, no warning", () => {
    const v = budget.budgetVerdict("groq", spend(1, 5), limits());
    assert.deepEqual(v, { allowed: true, warning: null });
  });
  check("daily limit reached → blocked with scope daily", () => {
    const v = budget.budgetVerdict("groq", spend(10, 20), limits());
    assert.equal(v.allowed, false);
    if (!v.allowed) assert.equal(v.scope, "daily");
  });
  check("monthly limit reached → blocked with scope monthly", () => {
    const v = budget.budgetVerdict("groq", spend(1, 150), limits());
    assert.equal(v.allowed, false);
    if (!v.allowed) assert.equal(v.scope, "monthly");
  });
  check("a 0 limit blocks every paid call (emergency stop)", () => {
    assert.equal(budget.budgetVerdict("groq", spend(0, 0), limits({ dailyUsd: 0 })).allowed, false);
  });
  check("null limit (empty setting) means no limit", () => {
    assert.equal(budget.budgetVerdict("groq", spend(1e6, 1e6), limits({ dailyUsd: null, monthlyUsd: null })).allowed, true);
  });
  check("per-provider cap blocks only that provider", () => {
    const l = limits({ providerDailyUsd: { groq: 3 } });
    assert.equal(budget.budgetVerdict("groq", spend(4, 4, { groq: 3 }), l).allowed, false);
    assert.equal(budget.budgetVerdict("openrouter", spend(4, 4, { groq: 3 }), l).allowed, true);
  });
  check("warning at the threshold, naming the scope closest to its limit", () => {
    const v = budget.budgetVerdict("groq", spend(8.5, 20), limits());
    assert.equal(v.allowed, true);
    if (v.allowed) {
      assert.ok(v.warning);
      assert.equal(v.warning?.scope, "daily");
      assert.equal(v.warning?.percent, 85);
    }
  });
  check("budget values: empty = null, 0 = zero, invalid = fallback", () => {
    assert.equal(budget.parseBudgetUsd("", "10"), null);
    assert.equal(budget.parseBudgetUsd("0", "10"), 0);
    assert.equal(budget.parseBudgetUsd("12.5", "10"), 12.5);
    assert.equal(budget.parseBudgetUsd("abc", "10"), 10);
    assert.equal(budget.parseBudgetUsd("-1", "10"), 10);
    assert.equal(budget.parseBudgetUsd("1e9", "10"), 10);
    assert.equal(budget.parseBudgetUsd("1.23456", "10"), 10, "more than 4 decimals is invalid");
  });
  check("warn percent is clamped to a sane range", () => {
    assert.equal(budget.parseWarnPercent("0", "80"), 80);
    assert.equal(budget.parseWarnPercent("101", "80"), 80);
    assert.equal(budget.parseWarnPercent("50", "80"), 50);
  });
  check("per-provider budget JSON: unknown providers dropped, validation names the problem", () => {
    const known = (id: string) => id === "groq";
    assert.deepEqual(budget.parseProviderBudgets('{"groq":3,"nope":9}', known), { groq: 3 });
    assert.equal(budget.validateProviderBudgetJson('{"groq":3}', known), null);
    assert.match(budget.validateProviderBudgetJson('{"nope":3}', known) ?? "", /unknown/);
    assert.match(budget.validateProviderBudgetJson('{"groq":-1}', known) ?? "", /from 0/);
    assert.match(budget.validateProviderBudgetJson("[1]", known) ?? "", /object/);
  });
  check("budget windows are UTC day and UTC month", () => {
    const { dayStart, monthStart } = budget.utcWindowStarts(new Date("2026-10-14T23:30:00Z"));
    assert.equal(dayStart.toISOString(), "2026-10-14T00:00:00.000Z");
    assert.equal(monthStart.toISOString(), "2026-10-01T00:00:00.000Z");
  });

  console.log("\nQuota rules (pure)");
  check("requests are checked before tokens; equal-to-limit means no room", () => {
    assert.deepEqual(quota.quotaDecision({ requests: 4, tokens: 10 }, { requests: 5, tokens: 100 }), { ok: true });
    assert.deepEqual(quota.quotaDecision({ requests: 5, tokens: 10 }, { requests: 5, tokens: 100 }), { ok: false, reason: "requests" });
    assert.deepEqual(quota.quotaDecision({ requests: 1, tokens: 100 }, { requests: 5, tokens: 100 }), { ok: false, reason: "tokens" });
  });
  check("the request slot rule: with limit N, the prior-request count for the N-th request is N-1 (room exists)", () => {
    const limit = 3;
    for (let n = 1; n <= limit; n++) {
      assert.equal(quota.quotaDecision({ requests: n - 1, tokens: 0 }, { requests: limit, tokens: 1000 }).ok, true, `request ${n}`);
    }
    assert.equal(quota.quotaDecision({ requests: limit, tokens: 0 }, { requests: limit, tokens: 1000 }).ok, false);
  });

  console.log("\nConfig validators (admin input)");
  check("payment prices and durations must be positive", () => {
    assert.equal(validateConfigValue("payment_premium_price_uzs", "0") === null, false);
    assert.equal(validateConfigValue("payment_premium_days", "0") === null, false);
    assert.equal(validateConfigValue("payment_premium_season_price_uzs", "149000"), null);
    assert.equal(validateConfigValue("payment_premium_yearly_days", "365"), null);
    assert.equal(validateConfigValue("payment_premium_yearly_price_uzs", "1000000000") === null, false, "a typo with an extra zero is refused");
  });
  check("currency is UZS only (Payme/Click settle in UZS)", () => {
    assert.equal(validateConfigValue("payment_currency", "UZS"), null);
    assert.notEqual(validateConfigValue("payment_currency", "USD"), null);
  });
  check("budgets: empty / decimal / 0 accepted; negative, exponent and 5 decimals refused", () => {
    assert.equal(validateConfigValue("ai_budget_daily_usd", ""), null);
    assert.equal(validateConfigValue("ai_budget_daily_usd", "0"), null);
    assert.equal(validateConfigValue("ai_budget_monthly_usd", "12.5"), null);
    assert.notEqual(validateConfigValue("ai_budget_daily_usd", "-1"), null);
    assert.notEqual(validateConfigValue("ai_budget_daily_usd", "1e9"), null);
    assert.notEqual(validateConfigValue("ai_budget_daily_usd", "1.23456"), null);
  });
  check("warn percent 1–100; voice switch true/false; session cap 1–120 minutes", () => {
    assert.equal(validateConfigValue("ai_budget_warn_percent", "80"), null);
    assert.notEqual(validateConfigValue("ai_budget_warn_percent", "0"), null);
    assert.notEqual(validateConfigValue("ai_budget_warn_percent", "101"), null);
    assert.equal(validateConfigValue("ai_live_voice_enabled", "false"), null);
    assert.notEqual(validateConfigValue("ai_live_voice_enabled", "yes"), null);
    assert.equal(validateConfigValue("ai_live_session_max_minutes", "15"), null);
    assert.notEqual(validateConfigValue("ai_live_session_max_minutes", "0"), null);
    assert.notEqual(validateConfigValue("ai_live_session_max_minutes", "999"), null);
  });
  check("pricing and provider-budget JSON are validated on save", () => {
    assert.equal(validateConfigValue("ai_model_pricing", "{}"), null);
    assert.notEqual(validateConfigValue("ai_model_pricing", "{oops"), null);
    assert.notEqual(validateConfigValue("ai_model_pricing", JSON.stringify({ gemini: { m: { inputPerMTok: 1, outputPerMTok: 1 } } })), null);
    assert.equal(validateConfigValue("ai_budget_provider_daily_usd", "{}"), null);
    assert.notEqual(validateConfigValue("ai_budget_provider_daily_usd", '{"nope":1}'), null);
  });
  // The prices are pinned so no one can edit them silently — they are the
  // input to the unit-economics guarantee asserted below. They were re-based
  // from 149,000/499,000 to the regionally calibrated 139,000/399,000 in the
  // 2026-10 pricing review and are pinned again here.
  check("the shipped Premium prices are the reviewed, regionally calibrated ones", () => {
    assert.equal(CONFIG_DEFAULTS.payment_premium_price_uzs, "59000", "monthly ≈ US$4.92");
    assert.equal(CONFIG_DEFAULTS.payment_premium_season_price_uzs, "139000", "90-day admissions pass ≈ US$11.58");
    assert.equal(CONFIG_DEFAULTS.payment_premium_yearly_price_uzs, "399000", "yearly ≈ US$33.25");
    assert.equal(CONFIG_DEFAULTS.payment_currency, "UZS");
  });
  check("the AI allowances are the profitable, regionally calibrated ones", () => {
    assert.equal(CONFIG_DEFAULTS.ai_live_voice_enabled, "true");
    assert.equal(CONFIG_DEFAULTS.ai_free_live_sessions_per_day, "0", "Live voice is a Premium entitlement by default");
    assert.equal(CONFIG_DEFAULTS.ai_live_global_sessions_per_day, "30");
    assert.equal(CONFIG_DEFAULTS.ai_premium_live_sessions_per_day, "1");
    assert.equal(CONFIG_DEFAULTS.ai_premium_live_sessions_per_month, "8", "monthly native-audio ceiling");
    assert.equal(CONFIG_DEFAULTS.ai_live_session_max_minutes, "8");
    assert.equal(CONFIG_DEFAULTS.ai_budget_warn_percent, "80");
    assert.equal(CONFIG_DEFAULTS.ai_free_requests_per_day, "5");
    assert.equal(CONFIG_DEFAULTS.ai_free_tokens_per_day, "12000");
    assert.equal(CONFIG_DEFAULTS.ai_premium_requests_per_day, "40");
    assert.equal(CONFIG_DEFAULTS.ai_premium_tokens_per_day, "80000");
  });

  /**
   * The whole point of the defaults above: a Premium account that maxes out
   * EVERY allowance must still cost less than the price it pays.
   *   • text: 80k tokens/day × 30 days at the published gpt-oss-120b-style
   *     blended rate (~$0.35/1M) ≈ $0.85/month;
   *   • native audio: 8 sessions × 8 min × $0.023/min ≈ $0.74/month.
   * At 12,000 UZS/USD the monthly price is ≈ $4.92.
   */
  check("worst-case Premium AI cost stays below the Premium price (unit economics)", () => {
    const usdPerUzs = 1 / 12000;
    const monthlyPriceUsd = Number(CONFIG_DEFAULTS.payment_premium_price_uzs) * usdPerUzs;
    const tokensPerMonth = Number(CONFIG_DEFAULTS.ai_premium_tokens_per_day) * 30;
    const textCostUsd = (tokensPerMonth / 1_000_000) * 0.35;
    const liveMinutes =
      Number(CONFIG_DEFAULTS.ai_premium_live_sessions_per_month) * Number(CONFIG_DEFAULTS.ai_live_session_max_minutes);
    const audioCostUsd = liveMinutes * 0.023;
    const worstCase = textCostUsd + audioCostUsd;
    assert.ok(
      worstCase < monthlyPriceUsd,
      `worst case $${worstCase.toFixed(2)} must stay below the $${monthlyPriceUsd.toFixed(2)} monthly price`,
    );
    // …and the previous defaults must NOT satisfy it, so the guard cannot be
    // satisfied by accident if the limits are ever loosened again.
    const oldWorstCase = (500000 * 30 / 1_000_000) * 0.35 + 2 * 10 * 30 * 0.023;
    assert.ok(oldWorstCase > monthlyPriceUsd, "the old unbounded defaults were a loss per heavy user");
  });

  console.log("\nWiring (structural — the code paths the tests above cannot reach without a DB)");
  const read = (p: string) => readFileSync(join(process.cwd(), p), "utf8");
  check("no route writes a usage row itself (the router is the single writer)", () => {
    for (const f of ["src/app/api/visa/chat/route.ts", "src/app/api/visa/analyze/route.ts", "src/lib/ai.ts"]) {
      assert.doesNotMatch(read(f), /logAIUsage\(/, `${f} must not log usage directly`);
    }
  });
  check("the router is the only caller that writes ai_usage for AI replies", () => {
    assert.match(read("src/lib/ai/index.ts"), /logAIUsage\(/);
  });
  check("no in-memory per-process limiter on the visa AI routes (shared store only)", () => {
    for (const f of ["src/app/api/visa/chat/route.ts", "src/app/api/visa/analyze/route.ts"]) {
      assert.doesNotMatch(read(f), /checkRateLimit\(/, f);
      assert.match(read(f), /checkSharedRateLimit\(/, f);
    }
  });
  check("visa practice ownership comes from the session, not the request body", () => {
    const analyze = read("src/app/api/visa/analyze/route.ts");
    assert.match(analyze, /const ownerId = session\?\.profile\.id/);
    assert.doesNotMatch(analyze, /Number\(body\?\.profileId\)/, "body profileId must not decide the free cap");
  });
  check("visa applicant context comes from the signed-in profile, not the body", () => {
    for (const f of ["src/app/api/visa/chat/route.ts", "src/app/api/visa/live-token/route.ts"]) {
      assert.doesNotMatch(read(f), /body\?\.profile\b/, `${f} must not read the applicant from the body`);
    }
  });
  check("Live token: session + kill switch + daily allowance + usage row + generic errors", () => {
    const live = read("src/app/api/visa/live-token/route.ts");
    assert.match(live, /requireSession\(req\)/);
    assert.match(live, /ai_live_voice_enabled/);
    assert.match(live, /visa:live-day:/);
    assert.match(live, /taskType: "visa_live"/);
    assert.match(live, /getPremiumStatus/);
    assert.doesNotMatch(live, /error: errorDetail\(err\)/, "provider error text must not reach the browser");
    assert.doesNotMatch(live, /Gemini API key is not configured/, "config state must not reach the browser");
  });
  check("Live token route exports only HTTP handlers (Next.js route rule)", () => {
    const live = read("src/app/api/visa/live-token/route.ts");
    const exported = [...live.matchAll(/^export (?:async )?(?:function|const|let|var|class) (\w+)/gm)].map((m) => m[1]);
    assert.deepEqual(exported.filter((n) => n !== "POST" && n !== "runtime"), []);
  });
  check("voice client: reconnect requests a fresh token; quota/disabled stop retrying; session cap enforced", () => {
    const c = read("src/components/VisaSpeakingAssistant.tsx");
    assert.match(c, /liveTokenRef\.current = null;\s*\n\s*await connectLiveSession\(false\)/);
    assert.match(c, /liveFallbackNoticeKey\(err\) !== "liveFallback"/);
    assert.match(c, /armLiveSessionLimit\(token\.maxSessionSeconds\)/);
    assert.match(c, /clearLiveSessionLimitTimer\(\);/);
  });
  check("browser fallback remains: text practice still reachable and speech APIs still used", () => {
    const c = read("src/components/VisaSpeakingAssistant.tsx");
    assert.match(c, /speechSynthesis/);
    assert.match(c, /SpeechRecognition/);
    assert.match(c, /fetch\("\/api\/visa\/chat"/);
  });
  check("research agent calls go through the central router, not a private HTTP client", () => {
    const run = read("src/lib/research-agent/run-university.ts");
    assert.match(run, /aiChat\(/);
    assert.doesNotMatch(run, /apiKey: runtime\.apiKey/);
    assert.doesNotMatch(run, /endpoint: `\$\{base\}\/chat\/completions`/);
  });
  check("no hardcoded Premium prices remain in the checkout UI", () => {
    for (const f of ["src/components/PaymentsSection.tsx", "src/components/CheckoutModal.tsx"]) {
      const src = read(f);
      assert.doesNotMatch(src, /\b(59000|149000|499000)\b/, `${f} contains a price literal`);
    }
  });
  check("analytics AI cost sums only known statuses", () => {
    assert.doesNotMatch(read("src/lib/analytics.ts"), /coalesce\(sum\(\$\{aiUsage\.costEstimate\}\), 0\)`/);
    assert.match(read("src/lib/analytics.ts"), /aiCostUnknownRequests/);
  });
  check("the admin AI tab mounts the cost panel and the Premium tab mounts the price panel", () => {
    const panel = read("src/components/AdminPanel.tsx");
    assert.match(panel, /<AiCostPanel \/>/);
    assert.match(panel, /<PremiumPricePanel \/>/);
  });
  check("the migration is additive (no DROP / RENAME / type change on existing ai_usage columns)", () => {
    const sql = read("supabase/add_ai_cost_accounting.sql");
    const body = sql.split("\n").filter((l) => !l.trim().startsWith("--")).join("\n");
    assert.doesNotMatch(body, /\bDROP\b|\bRENAME\b|ALTER COLUMN|\bTYPE\b/i);
    assert.match(body, /ADD COLUMN IF NOT EXISTS cost_status/);
    assert.match(body, /CREATE INDEX IF NOT EXISTS idx_ai_usage_created/);
  });
  check("schema declares the new ai_usage columns used by the router", () => {
    const schema = read("src/db/schema.ts");
    for (const col of ["cost_status", "cached_prompt_tokens", "attempts", "fallback_used", "error_category"]) {
      assert.match(schema, new RegExp(`"${col}"`), col);
    }
  });
  check("config cache has a TTL (budgets reach every instance within the TTL)", () => {
    assert.match(read("src/lib/config.ts"), /CONFIG_CACHE_TTL_MS = 30_000/);
  });

  console.log("");
  if (failed > 0) {
    console.error(`AI cost test FAILED — ${failed} assertion(s) failed:`);
    for (const f of failures) console.error("  - " + f);
    process.exit(1);
  }
  console.log(`AI cost test passed (${passed} assertions)`);
}

main().catch((err) => {
  console.error("AI cost test crashed:", err);
  process.exit(1);
});
