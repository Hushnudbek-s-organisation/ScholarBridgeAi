/**
 * AI settings test — deterministic, no DB connection, no network.
 *
 * Exercises the REAL modules (settings core, credentials, config defaults,
 * AI router) plus structural checks on schema/API/UI wiring.
 *
 * Run:  npm run test:ai-settings
 * Exit 0 + "AI settings test passed (N assertions)" on success.
 */
process.env.DATABASE_URL = "postgresql://x:x@localhost:5432/x"; // dummy — no queries are executed

import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import assert from "node:assert/strict";

// Lazy imports AFTER DATABASE_URL is set (src/lib/db requires it at import).
async function main() {
const settings = await import("../src/lib/ai/settings");
const { CONFIG_DEFAULTS } = await import("../src/lib/config");
const aiCore = await import("../src/lib/ai/index");
const credentials = await import("../src/lib/ai/credentials");

const {
  AI_PROVIDERS,
  AI_PROVIDER_IDS,
  AI_TASKS,
  TASK_PROVIDER_ENV,
  ENCRYPTED_PREFIX,
  decryptApiKey,
  encryptApiKey,
  encryptionSecret,
  hasExplicitEncryptionSecret,
  isAIProviderId,
  isAITaskId,
  isTaskConfigured,
  maskApiKey,
  resolveCredential,
  resolveProviderForTask,
  taskProviderConfigKey,
  validateApiKey,
  DEFAULT_PROVIDER_CONFIG_KEY,
} = settings;

let passed = 0;
let failed = 0;
const failures: string[] = [];

function check(name: string, fn: () => void) {
  try {
    fn();
    passed += 1;
    console.log(`  ✓ ${name}`);
  } catch (err) {
    failed += 1;
    failures.push(`${name}: ${(err as Error).message}`);
    console.error(`  ✗ ${name} — ${(err as Error).message}`);
  }
}

// ---------------------------------------------------------------------------
// Provider registry
// ---------------------------------------------------------------------------
check("registry exposes exactly 4 providers", () => {
  assert.deepEqual(AI_PROVIDER_IDS, ["openrouter", "openai", "anthropic", "groq"]);
});

check("every provider id has meta", () => {
  for (const id of AI_PROVIDER_IDS) assert.ok(AI_PROVIDERS[id], `missing meta for ${id}`);
});

check("every provider has a non-empty label", () => {
  for (const id of AI_PROVIDER_IDS) assert.ok(AI_PROVIDERS[id].label.length > 0);
});

check("every provider has a non-empty default model", () => {
  for (const id of AI_PROVIDER_IDS) assert.ok(AI_PROVIDERS[id].defaultModel.length > 0);
});

check("every provider has key + model env vars", () => {
  for (const id of AI_PROVIDER_IDS) {
    assert.ok(AI_PROVIDERS[id].keyEnvVar.length > 0);
    assert.ok(AI_PROVIDERS[id].modelEnvVar.length > 0);
  }
});

check("key env vars are unique", () => {
  const vars = AI_PROVIDER_IDS.map((id) => AI_PROVIDERS[id].keyEnvVar);
  assert.equal(new Set(vars).size, vars.length);
});

check("model env vars are unique", () => {
  const vars = AI_PROVIDER_IDS.map((id) => AI_PROVIDERS[id].modelEnvVar);
  assert.equal(new Set(vars).size, vars.length);
});

check("key env vars follow *_API_KEY naming", () => {
  for (const id of AI_PROVIDER_IDS) {
    assert.match(AI_PROVIDERS[id].keyEnvVar, /^[A-Z0-9_]+_API_KEY$/);
  }
});

check("isAIProviderId validates ids (case-sensitive)", () => {
  assert.equal(isAIProviderId("openrouter"), true);
  assert.equal(isAIProviderId("groq"), true);
  assert.equal(isAIProviderId("OPENAI"), false);
  assert.equal(isAIProviderId("bogus"), false);
  assert.equal(isAIProviderId(null), false);
  assert.equal(isAIProviderId(undefined), false);
});

// ---------------------------------------------------------------------------
// Task registry
// ---------------------------------------------------------------------------
check("task registry exposes exactly 5 tasks", () => {
  assert.deepEqual(
    AI_TASKS.map((t) => t.id),
    ["admissions", "essay", "general", "search", "document"]
  );
});

check("every task has label + description", () => {
  for (const t of AI_TASKS) {
    assert.ok(t.label.length > 0);
    assert.ok(t.description.length > 0);
  }
});

check("isAITaskId validates task ids", () => {
  assert.equal(isAITaskId("essay"), true);
  assert.equal(isAITaskId("nope"), false);
});

check("taskProviderConfigKey builds app_config keys", () => {
  assert.equal(taskProviderConfigKey("essay"), "ai_provider_essay");
  assert.equal(taskProviderConfigKey("search"), "ai_provider_search");
});

check("TASK_PROVIDER_ENV maps every task to its env var", () => {
  const expected: Record<string, string> = {
    admissions: "AI_PROVIDER_ADMISSIONS",
    essay: "AI_PROVIDER_ESSAY",
    general: "AI_PROVIDER_GENERAL",
    search: "AI_PROVIDER_SEARCH",
    document: "AI_PROVIDER_DOCUMENT_ANALYSIS",
  };
  for (const t of AI_TASKS) {
    assert.equal(TASK_PROVIDER_ENV[t.id], expected[t.id]);
  }
});

check("CONFIG_DEFAULTS has ai_default_provider = openrouter", () => {
  assert.equal(CONFIG_DEFAULTS[DEFAULT_PROVIDER_CONFIG_KEY], "openrouter");
});

check("CONFIG_DEFAULTS has an ai_provider_<task> key for every task", () => {
  for (const t of AI_TASKS) {
    assert.ok(CONFIG_DEFAULTS[taskProviderConfigKey(t.id)], `missing ${taskProviderConfigKey(t.id)}`);
  }
});

// ---------------------------------------------------------------------------
// API key masking
// ---------------------------------------------------------------------------
check("maskApiKey hides everything but the last 4 chars", () => {
  assert.equal(maskApiKey("sk-or-v1-abcdefghijklmnopqrstuvwxyz1234"), "••••1234");
});

check("maskApiKey handles short keys", () => {
  assert.equal(maskApiKey("abcd"), "••••");
});

check("maskApiKey handles empty / null / whitespace", () => {
  assert.equal(maskApiKey(""), "");
  assert.equal(maskApiKey(null), "");
  assert.equal(maskApiKey(undefined), "");
  assert.equal(maskApiKey("   "), "");
});

// ---------------------------------------------------------------------------
// API key validation
// ---------------------------------------------------------------------------
check("validateApiKey accepts a realistic long key", () => {
  assert.equal(validateApiKey("sk-or-v1-abcdefghijklmnopqrstuvwxyz123456789"), true);
});

check("validateApiKey trims surrounding whitespace", () => {
  assert.equal(validateApiKey("  sk-or-v1-abcdefghijklmnopqrstuvwxyz  "), true);
});

check("validateApiKey rejects empty values", () => {
  assert.equal(validateApiKey(""), false);
  assert.equal(validateApiKey(null), false);
  assert.equal(validateApiKey(undefined), false);
});

check("validateApiKey rejects keys shorter than 16 chars", () => {
  assert.equal(validateApiKey("short-key-123"), false);
});

check("validateApiKey rejects keys with inner whitespace", () => {
  assert.equal(validateApiKey("sk-or-v1-abcdef ghijklmnopqrstuvwxyz"), false);
});

// ---------------------------------------------------------------------------
// Encryption at rest
// ---------------------------------------------------------------------------
check("encryptApiKey prefixes with enc:v1:", () => {
  assert.ok(encryptApiKey("sk-test-1234567890").startsWith(ENCRYPTED_PREFIX));
});

check("encrypt → decrypt round-trips with the same secret", () => {
  const secret = "test-secret-0123456789";
  const enc = encryptApiKey("sk-or-v1-secret-key-123456789", secret);
  assert.equal(decryptApiKey(enc, secret), "sk-or-v1-secret-key-123456789");
});

check("decrypt fails with a different secret", () => {
  const enc = encryptApiKey("sk-or-v1-secret-key-123456789", "secret-one-1234567");
  assert.equal(decryptApiKey(enc, "secret-two-7654321"), null);
});

check("decrypt rejects plaintext payloads", () => {
  assert.equal(decryptApiKey("sk-plaintext-not-encrypted"), null);
});

check("decrypt rejects null/empty payloads", () => {
  assert.equal(decryptApiKey(null), null);
  assert.equal(decryptApiKey(undefined), null);
  assert.equal(decryptApiKey(""), null);
});

check("decrypt rejects tampered payloads", () => {
  const enc = encryptApiKey("sk-or-v1-secret-key-123456789", "test-secret-0123456789");
  const tampered = enc.slice(0, -4) + "AAAA";
  assert.equal(decryptApiKey(tampered, "test-secret-0123456789"), null);
});

check("same key encrypts differently each time (random IV)", () => {
  const secret = "test-secret-0123456789";
  assert.notEqual(encryptApiKey("sk-or-v1-same-key-1234567890", secret), encryptApiKey("sk-or-v1-same-key-1234567890", secret));
});

check("encryptionSecret derives a 64-char hex key", () => {
  assert.match(encryptionSecret({}), /^[0-9a-f]{64}$/);
});

check("encryptionSecret differs when DATABASE_URL differs", () => {
  assert.notEqual(encryptionSecret({ DATABASE_URL: "postgres://a" }), encryptionSecret({ DATABASE_URL: "postgres://b" }));
});

check("hasExplicitEncryptionSecret requires >= 16 chars", () => {
  assert.equal(hasExplicitEncryptionSecret({ AI_KEYS_ENCRYPTION_SECRET: "1234567890123456" }), true);
  assert.equal(hasExplicitEncryptionSecret({ AI_KEYS_ENCRYPTION_SECRET: "short" }), false);
  assert.equal(hasExplicitEncryptionSecret({}), false);
});

// ---------------------------------------------------------------------------
// Resolution rules
// ---------------------------------------------------------------------------
check("resolveProviderForTask defaults to openrouter", () => {
  assert.equal(resolveProviderForTask("essay", {}, {}), "openrouter");
});

check("resolveProviderForTask: DB (admin panel) wins over env", () => {
  assert.equal(
    resolveProviderForTask("essay", { ai_provider_essay: "openai" }, { AI_PROVIDER_ESSAY: "groq" }),
    "openai"
  );
});

check("resolveProviderForTask: DB default provider is respected", () => {
  assert.equal(
    resolveProviderForTask("essay", { ai_default_provider: "anthropic" }, { AI_PROVIDER_ESSAY: "groq" }),
    "anthropic"
  );
});

check("resolveProviderForTask: task mapping beats DB default", () => {
  assert.equal(
    resolveProviderForTask("essay", { ai_default_provider: "anthropic", ai_provider_essay: "groq" }, {}),
    "groq"
  );
});

check("resolveProviderForTask: env wins over default", () => {
  assert.equal(resolveProviderForTask("essay", {}, { AI_PROVIDER_ESSAY: "groq" }), "groq");
});

check("resolveProviderForTask: unknown provider id falls back to default", () => {
  assert.equal(resolveProviderForTask("essay", { ai_provider_essay: "bogus" }, {}), "openrouter");
});

check("resolveProviderForTask: unknown task falls back to general env", () => {
  assert.equal(resolveProviderForTask("weird-task", {}, { AI_PROVIDER_GENERAL: "anthropic" }), "anthropic");
});

check("resolveCredential: no key anywhere → source none + default model", () => {
  const r = resolveCredential("openrouter", null, {});
  assert.equal(r.apiKeySource, "none");
  assert.equal(r.apiKey, undefined);
  assert.equal(r.model, AI_PROVIDERS.openrouter.defaultModel);
});

check("resolveCredential: env key is picked up", () => {
  const r = resolveCredential("openrouter", null, { OPENROUTER_API_KEY: "sk-env-key-1234567890" });
  assert.equal(r.apiKeySource, "env");
  assert.equal(r.apiKey, "sk-env-key-1234567890");
});

check("resolveCredential: DB (encrypted) key wins over env", () => {
  const secret = "test-secret-0123456789";
  const enc = encryptApiKey("sk-db-key-1234567890", secret);
  const r = resolveCredential("openrouter", { apiKeyEnc: enc, model: null }, { OPENROUTER_API_KEY: "sk-env-key-1234567890" }, secret);
  assert.equal(r.apiKeySource, "db");
  assert.equal(r.apiKey, "sk-db-key-1234567890");
});

check("resolveCredential: model priority db → env → default", () => {
  const secret = "test-secret-0123456789";
  const enc = encryptApiKey("sk-db-key-1234567890", secret);
  const fromDb = resolveCredential("openrouter", { apiKeyEnc: enc, model: "db-model" }, { OPENROUTER_MODEL: "env-model" }, secret);
  assert.equal(fromDb.model, "db-model");
  const fromEnv = resolveCredential("openrouter", null, { OPENROUTER_MODEL: "env-model" });
  assert.equal(fromEnv.model, "env-model");
  const fromDefault = resolveCredential("openrouter", null, {});
  assert.equal(fromDefault.model, AI_PROVIDERS.openrouter.defaultModel);
});

check("isTaskConfigured reflects key presence", () => {
  assert.equal(
    isTaskConfigured("essay", {}, null, { OPENROUTER_API_KEY: "sk-env-key-1234567890" }),
    true
  );
  assert.equal(isTaskConfigured("essay", {}, null, {}), false);
});

// ---------------------------------------------------------------------------
// AI router integration
// ---------------------------------------------------------------------------
check("providerForTask returns name + env key (env-only mode)", () => {
  const r = aiCore.providerForTask("essay");
  assert.equal(r.name, "openrouter");
  assert.equal(r.model, AI_PROVIDERS.openrouter.defaultModel);
});

check("PROVIDERS exposes an adapter with call() for every provider", () => {
  for (const id of AI_PROVIDER_IDS) {
    assert.ok(aiCore.PROVIDERS[id as keyof typeof aiCore.PROVIDERS]);
    assert.equal(typeof aiCore.PROVIDERS[id as keyof typeof aiCore.PROVIDERS].call, "function");
  }
});

check("isAiConfigured resolves without a DB and reports false", async () => {
  assert.equal(await aiCore.isAiConfigured("essay"), false);
});

check("credentials.getPublicCredentials returns safe views (no raw keys)", async () => {
  const views = await credentials.getPublicCredentials();
  assert.equal(views.length, 4);
  for (const v of views) {
    assert.equal(typeof v.keyHint, "string");
    assert.ok(!v.keyHint.includes("sk-") || v.keyHint.startsWith("••••"), "keyHint must be masked");
    assert.ok(!("apiKey" in v), "public view must never expose the raw key");
  }
});

// ---------------------------------------------------------------------------
// Structural checks (schema / API / UI / scripts)
// ---------------------------------------------------------------------------
const ROOT = join(import.meta.dirname, "..");

check("schema.ts defines ai_provider_credentials table", () => {
  const schema = readFileSync(join(ROOT, "src/db/schema.ts"), "utf8");
  assert.match(schema, /export const aiProviderCredentials = pgTable\("ai_provider_credentials"/);
  assert.match(schema, /apiKeyEnc: text\("api_key_enc"\)/);
});

check("admin API route exists with GET/PUT/POST + isAdmin guard", () => {
  const route = readFileSync(join(ROOT, "src/app/api/admin/ai-settings/route.ts"), "utf8");
  assert.match(route, /export async function GET/);
  assert.match(route, /export async function PUT/);
  assert.match(route, /export async function POST/);
  assert.match(route, /isAdmin/);
  assert.match(route, /validateApiKey/);
});

check("admin AI settings component exists", () => {
  const comp = join(ROOT, "src/components/admin/AiSettingsManager.tsx");
  assert.ok(existsSync(comp));
  const src = readFileSync(comp, "utf8");
  assert.match(src, /export function AiSettingsManager/);
});

check("AdminPanel wires the AI Settings tab", () => {
  const panel = readFileSync(join(ROOT, "src/components/AdminPanel.tsx"), "utf8");
  assert.match(panel, /AiSettingsManager/);
  assert.match(panel, /id: "ai"/);
});

check("package.json has test:ai-settings script", () => {
  const pkg = JSON.parse(readFileSync(join(ROOT, "package.json"), "utf8"));
  assert.ok(pkg.scripts["test:ai-settings"].startsWith("tsx "));
});

check(".env.example documents AI_KEYS_ENCRYPTION_SECRET", () => {
  const env = readFileSync(join(ROOT, ".env.example"), "utf8");
  assert.match(env, /AI_KEYS_ENCRYPTION_SECRET/);
});

// ---------------------------------------------------------------------------
// Summary
// ---------------------------------------------------------------------------
console.log("");
if (failed > 0) {
  console.error(`AI settings test FAILED — ${failed} assertion(s) failed:`);
  for (const f of failures) console.error("  - " + f);
  process.exit(1);
}
console.log(`AI settings test passed (${passed} assertions)`);
}

main().catch((err) => {
  console.error("AI settings test crashed:", err);
  process.exit(1);
});
