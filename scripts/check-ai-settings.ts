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

// Async assertions MUST be awaited — check() would count a rejected promise
// as a pass.
async function checkAsync(name: string, fn: () => Promise<void>) {
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

// ---------------------------------------------------------------------------
// Provider registry
// ---------------------------------------------------------------------------
// 6 chat providers + "gemini" (voice-only — powers the Gemini Live visa
// speaking assistant; it deliberately has NO chat adapter in ai/index.ts).
// Task 7 added "google" (Gemini via its OpenAI-compatible endpoint) and
// "custom" (any OpenAI-compatible / local server; base URL from env).
check("registry exposes exactly 7 providers (6 chat + 1 voice-only)", () => {
  assert.deepEqual(AI_PROVIDER_IDS, ["openrouter", "openai", "anthropic", "groq", "gemini", "google", "custom"]);
});

const CHAT_PROVIDER_IDS = AI_PROVIDER_IDS.filter((id) => id !== "gemini");

check("every provider id has meta", () => {
  for (const id of AI_PROVIDER_IDS) assert.ok(AI_PROVIDERS[id], `missing meta for ${id}`);
});

check("every provider has a non-empty label", () => {
  for (const id of AI_PROVIDER_IDS) assert.ok(AI_PROVIDERS[id].label.length > 0);
});

check("every provider has a non-empty default model (custom: model must come from env/admin)", () => {
  for (const id of AI_PROVIDER_IDS) {
    if (id === "custom") continue;
    assert.ok(AI_PROVIDERS[id].defaultModel.length > 0, id);
  }
  // No invented model name for an unknown self-hosted server.
  assert.equal(AI_PROVIDERS.custom.defaultModel, "");
  assert.equal(AI_PROVIDERS.custom.modelEnvVar, "AI_CUSTOM_MODEL");
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
check("task registry exposes exactly 6 tasks (visa added in Task 7)", () => {
  assert.deepEqual(
    AI_TASKS.map((t) => t.id),
    ["admissions", "essay", "general", "search", "document", "visa"]
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
    visa: "AI_PROVIDER_VISA",
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

check("PROVIDERS exposes a call() adapter for every CHAT provider (gemini is voice-only)", () => {
  for (const id of CHAT_PROVIDER_IDS) {
    assert.ok(aiCore.PROVIDERS[id as keyof typeof aiCore.PROVIDERS]);
    assert.equal(typeof aiCore.PROVIDERS[id as keyof typeof aiCore.PROVIDERS].call, "function");
  }
});

check("gemini is registered for credentials but has no chat adapter", () => {
  assert.ok(settings.AI_PROVIDERS.gemini, "gemini must exist in the credential registry");
  assert.equal((aiCore.PROVIDERS as Record<string, unknown>).gemini, undefined);
});

await checkAsync("isAiConfigured resolves without a DB and reports false", async () => {
  assert.equal(await aiCore.isAiConfigured("essay"), false);
});

await checkAsync("credentials.getPublicCredentials returns safe views (no raw keys)", async () => {
  const views = await credentials.getPublicCredentials();
  assert.equal(views.length, 7); // 6 chat + gemini (voice-only)
  assert.ok(views.some((v) => v.provider === "gemini"), "gemini appears in the public view");
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

check("admin API route exists with GET/PUT/POST + session-based admin guard", () => {
  const route = readFileSync(join(ROOT, "src/app/api/admin/ai-settings/route.ts"), "utf8");
  assert.match(route, /export async function GET/);
  assert.match(route, /export async function PUT/);
  assert.match(route, /export async function POST/);
  // Admin access is verified from the signed session cookie (requireAdmin),
  // never from a client-supplied id.
  assert.match(route, /requireAdmin\(/);
  assert.match(route, /from "@\/lib\/auth"/);
  assert.match(route, /validateApiKey/);
  assert.doesNotMatch(route, /await isAdmin\(/);
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
// Task 7 — capabilities, selection, rotation, redaction, router behaviour
// ---------------------------------------------------------------------------
check("capabilities: structured only where JSON mode exists; gemini is audio-only", () => {
  assert.equal(settings.supportsCapability("groq", "structured"), true);
  assert.equal(settings.supportsCapability("openai", "structured"), true);
  assert.equal(settings.supportsCapability("anthropic", "structured"), false);
  assert.equal(settings.supportsCapability("gemini", "text"), false);
  assert.equal(settings.supportsCapability("gemini", "audio"), true);
  assert.equal(settings.isChatProvider("gemini"), false);
  for (const id of CHAT_PROVIDER_IDS) {
    assert.equal(settings.isChatProvider(id), true, id);
    for (const c of settings.providerCapabilities(id)) assert.ok(settings.AI_CAPABILITIES.includes(c), `${id}:${c}`);
  }
});

check("custom provider: capabilities extend via AI_CUSTOM_CAPABILITIES (unknown ignored)", () => {
  const caps = settings.providerCapabilities("custom", { AI_CUSTOM_CAPABILITIES: "structured, bogus ,vision" });
  assert.ok(caps.includes("text") && caps.includes("structured") && caps.includes("vision"));
  assert.ok(!caps.includes("bogus" as never));
});

check("providerBaseUrl: custom only from env, http(s) only, no userinfo", () => {
  assert.equal(settings.providerBaseUrl("custom", {}), "");
  assert.equal(settings.providerBaseUrl("custom", { AI_CUSTOM_BASE_URL: "http://localhost:11434/v1/" }), "http://localhost:11434/v1");
  assert.equal(settings.providerBaseUrl("custom", { AI_CUSTOM_BASE_URL: "file:///etc/passwd" }), "");
  assert.equal(settings.providerBaseUrl("custom", { AI_CUSTOM_BASE_URL: "https://u:p@evil.test/v1" }), "");
  assert.equal(settings.providerBaseUrl("groq", {}), "https://api.groq.com/openai/v1");
  assert.match(settings.providerBaseUrl("google", {}), /^https:\/\/generativelanguage\.googleapis\.com\//);
});

check("reasoning_effort is only sent to models that accept it", () => {
  assert.equal(settings.acceptsReasoningEffort("groq", "openai/gpt-oss-120b"), true);
  assert.equal(settings.acceptsReasoningEffort("groq", "llama-3.3-70b-versatile"), false);
  assert.equal(settings.acceptsReasoningEffort("openai", "gpt-4o-mini"), false);
  assert.equal(settings.acceptsReasoningEffort("openai", "o4-mini"), true);
  assert.equal(settings.acceptsReasoningEffort("anthropic", "claude-x"), false);
});

check("visa task defaults to groq and ignores the global default", () => {
  assert.equal(resolveProviderForTask("visa", {}, {}), "groq");
  assert.equal(resolveProviderForTask("visa", { [DEFAULT_PROVIDER_CONFIG_KEY]: "openai" }, {}), "groq");
  assert.equal(resolveProviderForTask("visa", { ai_provider_visa: "anthropic" }, {}), "anthropic");
  assert.equal(resolveProviderForTask("visa", {}, { AI_PROVIDER_VISA: "openai" }), "openai");
  // Other tasks still follow the global default.
  assert.equal(resolveProviderForTask("essay", { [DEFAULT_PROVIDER_CONFIG_KEY]: "openai" }, {}), "openai");
});

check("autoSelectProvider picks the first usable provider in AUTO_PROVIDER_ORDER", () => {
  assert.equal(settings.autoSelectProvider((id) => id === "anthropic" || id === "google"), "anthropic");
  assert.equal(settings.autoSelectProvider(() => false, "groq"), "groq");
  assert.ok(!settings.AUTO_PROVIDER_ORDER.includes("gemini"), "voice-only provider is never auto-selected");
});

check("hasExplicitProviderChoice: admin mapping or env only", () => {
  assert.equal(settings.hasExplicitProviderChoice("essay", {}, {}), false);
  assert.equal(settings.hasExplicitProviderChoice("essay", { ai_provider_essay: "groq" }, {}), true);
  assert.equal(settings.hasExplicitProviderChoice("essay", {}, { AI_PROVIDER_DEFAULT: "groq" }), true);
});

check("resolveFallbackProvider: explicit only, admin 'none' overrides env, never voice-only", () => {
  assert.equal(settings.resolveFallbackProvider(null, {}), null);
  assert.equal(settings.resolveFallbackProvider(null, { AI_PROVIDER_FALLBACK: "groq" }), "groq");
  assert.equal(settings.resolveFallbackProvider("none", { AI_PROVIDER_FALLBACK: "groq" }), null);
  assert.equal(settings.resolveFallbackProvider("gemini", {}), null);
  assert.equal(settings.resolveFallbackProvider("bogus", {}), null);
});

check("parseDisabledProviders accepts JSON arrays and comma lists, drops unknown ids", () => {
  assert.deepEqual(settings.parseDisabledProviders('["openai","bogus","openai"]'), ["openai"]);
  assert.deepEqual(settings.parseDisabledProviders("groq, Anthropic"), ["groq", "anthropic"]);
  assert.deepEqual(settings.parseDisabledProviders(null), []);
});

check("decryptWithRotation: current secret, then AI_KEYS_ENCRYPTION_SECRET_PREVIOUS", () => {
  const oldSecret = "old-secret-0123456789abcdef";
  const newSecret = "new-secret-0123456789abcdef";
  const payload = encryptApiKey("sk-rotate-me-1234567890", oldSecret);
  const env = { AI_KEYS_ENCRYPTION_SECRET: newSecret, AI_KEYS_ENCRYPTION_SECRET_PREVIOUS: `short,${oldSecret}` };
  assert.deepEqual(settings.decryptWithRotation(payload, env), { key: "sk-rotate-me-1234567890", rotated: true });
  const fresh = encryptApiKey("sk-rotate-me-1234567890", newSecret);
  assert.deepEqual(settings.decryptWithRotation(fresh, env), { key: "sk-rotate-me-1234567890", rotated: false });
  assert.deepEqual(settings.decryptWithRotation(payload, { AI_KEYS_ENCRYPTION_SECRET: newSecret }), { key: null, rotated: false });
  assert.deepEqual(settings.previousEncryptionSecrets(env), [oldSecret], "secrets shorter than 16 chars are ignored");
});

check("redactSecrets removes known keys and key-shaped tokens", () => {
  const known = "custom-known-key-value-123";
  const text = `bad key ${known}; Authorization: Bearer abc.def-123; sk-or-v1-abcdefghijkl gsk_ABCDEFGHIJKLMNOP AIzaSyA1234567890123456789012 https://x.test/?key=zzz&a=1`;
  const out = settings.redactSecrets(text, [known]);
  for (const leak of [known, "abc.def-123", "abcdefghijkl", "ABCDEFGHIJKLMNOP", "SyA1234567890123456789012", "zzz"]) {
    assert.ok(!out.includes(leak), `leaked ${leak}: ${out}`);
  }
  assert.ok(out.includes("[REDACTED]"));
});

check("categorizeStatus + transient classification", () => {
  assert.equal(aiCore.categorizeStatus(401), "auth");
  assert.equal(aiCore.categorizeStatus(403), "auth");
  assert.equal(aiCore.categorizeStatus(404), "model_not_found");
  assert.equal(aiCore.categorizeStatus(429), "rate_limited");
  assert.equal(aiCore.categorizeStatus(400), "bad_request");
  assert.equal(aiCore.categorizeStatus(503), "provider_unavailable");
  assert.equal(aiCore.isTransientCategory("rate_limited"), true);
  assert.equal(aiCore.isTransientCategory("provider_unavailable"), true);
  assert.equal(aiCore.isTransientCategory("auth"), false);
  assert.equal(aiCore.isTransientCategory("bad_request"), false);
});

// --- Router behaviour with a mocked provider API (no network) -------------
const AI_ENV_KEYS = [
  ...AI_PROVIDER_IDS.flatMap((id) => [AI_PROVIDERS[id].keyEnvVar, AI_PROVIDERS[id].modelEnvVar]),
  ...Object.values(TASK_PROVIDER_ENV),
  "AI_PROVIDER_DEFAULT", "AI_PROVIDER_FALLBACK", "AI_PROVIDERS_DISABLED", "AI_CUSTOM_BASE_URL", "AI_CUSTOM_CAPABILITIES",
];
const KEYS = {
  openai: "sk-proj-openaiTESTKEY000000000001",
  groq: "gsk_groqTESTKEY00000000000000000002",
  anthropic: "sk-ant-anthropicTESTKEY000000000003",
};
type Call = { url: string; body: Record<string, unknown>; auth: string };

async function withRouter(
  env: Record<string, string>,
  handler: (call: Call) => { status: number; body: unknown },
  fn: (calls: Call[], logs: string[]) => Promise<void>
) {
  const savedEnv: Record<string, string | undefined> = {};
  for (const k of AI_ENV_KEYS) { savedEnv[k] = process.env[k]; delete process.env[k]; }
  Object.assign(process.env, env);
  const realFetch = globalThis.fetch;
  const calls: Call[] = [];
  const logs: string[] = [];
  const saved = { info: console.info, warn: console.warn, error: console.error };
  const capture = (...args: unknown[]) => logs.push(args.map(String).join(" "));
  console.info = capture; console.warn = capture; console.error = capture;
  globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
    const headers = new Headers(init?.headers);
    const call: Call = {
      url: String(input),
      body: init?.body ? JSON.parse(String(init.body)) : {},
      auth: headers.get("authorization") || headers.get("x-api-key") || "",
    };
    calls.push(call);
    const r = handler(call);
    return new Response(JSON.stringify(r.body), { status: r.status, headers: { "Content-Type": "application/json" } });
  }) as typeof fetch;
  try {
    await fn(calls, logs);
  } finally {
    globalThis.fetch = realFetch;
    Object.assign(console, saved);
    for (const k of AI_ENV_KEYS) { if (savedEnv[k] === undefined) delete process.env[k]; else process.env[k] = savedEnv[k]; }
  }
}
const okReply = (text: string) => ({ status: 200, body: { model: "m", choices: [{ message: { content: text } }], usage: { prompt_tokens: 1, completion_tokens: 1 } } });
const noSleep = async () => {};
const SECRET_PROMPT = "PROMPT-CONTENT-MUST-NOT-BE-LOGGED";

await checkAsync("aiChat: explicit provider, success, request shaped per capability", async () => {
  await withRouter({ GROQ_API_KEY: KEYS.groq, AI_PROVIDER_GENERAL: "groq" }, () => okReply("hello"), async (calls, logs) => {
    const r = await aiCore.aiChat({ taskType: "general", prompt: SECRET_PROMPT, jsonMode: true, reasoningEffort: "low" });
    assert.ok(r.ok);
    if (r.ok) { assert.equal(r.response.text, "hello"); assert.equal(r.response.provider, "groq"); assert.equal(r.fallbackUsed, false); }
    assert.equal(calls.length, 1);
    assert.equal(calls[0].url, "https://api.groq.com/openai/v1/chat/completions");
    assert.equal(calls[0].auth, `Bearer ${KEYS.groq}`);
    assert.deepEqual(calls[0].body.response_format, { type: "json_object" });
    assert.equal(calls[0].body.reasoning_effort, "low");
    const joined = logs.join("\n");
    assert.ok(joined.includes('"evt":"ai_request"') && joined.includes('"provider":"groq"'), "structured request log");
    assert.ok(!joined.includes(KEYS.groq) && !joined.includes(SECRET_PROMPT), "logs carry metadata only");
  });
});

await checkAsync("aiChat: anthropic gets no response_format (no JSON mode)", async () => {
  await withRouter({ ANTHROPIC_API_KEY: KEYS.anthropic, AI_PROVIDER_GENERAL: "anthropic" },
    () => ({ status: 200, body: { model: "c", content: [{ text: "{}" }], usage: {} } }), async (calls) => {
      const r = await aiCore.aiChat({ taskType: "general", prompt: "x", jsonMode: true });
      assert.ok(r.ok);
      assert.equal(calls[0].body.response_format, undefined);
      assert.equal(calls[0].auth, KEYS.anthropic);
    });
});

await checkAsync("aiChat: invalid key → auth error, no retry, no fallback, key never leaks", async () => {
  await withRouter({ OPENAI_API_KEY: KEYS.openai, AI_PROVIDER_GENERAL: "openai" },
    () => ({ status: 401, body: { error: { message: `Incorrect API key provided: ${KEYS.openai}` } } }), async (calls, logs) => {
      const r = await aiCore.aiChat({ taskType: "general", prompt: SECRET_PROMPT }, { maxAttempts: 3, sleep: noSleep });
      assert.equal(r.ok, false);
      if (!r.ok) {
        assert.equal(r.error.category, "auth");
        assert.equal(r.attempts, 1);
        assert.ok(!r.error.message.includes(KEYS.openai), r.error.message);
        const msg = aiCore.describeAiError(r.error);
        assert.ok(!msg.includes(KEYS.openai) && /API key/.test(msg));
        assert.equal(aiCore.aiErrorStatus(r.error), 502);
      }
      assert.equal(calls.length, 1);
      assert.ok(!logs.join("\n").includes(KEYS.openai));
    });
});

await checkAsync("aiChat: transient 503 retries on the same provider", async () => {
  let n = 0;
  await withRouter({ GROQ_API_KEY: KEYS.groq, AI_PROVIDER_GENERAL: "groq" },
    () => (++n < 3 ? { status: 503, body: { error: "overloaded" } } : okReply("third time")), async (calls) => {
      const r = await aiCore.aiChat({ taskType: "general", prompt: "x" }, { maxAttempts: 3, sleep: noSleep });
      assert.ok(r.ok);
      if (r.ok) assert.equal(r.attempts, 3);
      assert.equal(calls.length, 3);
    });
});

await checkAsync("aiChat: explicit fallback after the primary is unavailable, labelled :fallback", async () => {
  await withRouter({ OPENAI_API_KEY: KEYS.openai, GROQ_API_KEY: KEYS.groq, AI_PROVIDER_GENERAL: "openai", AI_PROVIDER_FALLBACK: "groq" },
    (c) => (c.url.includes("api.openai.com") ? { status: 500, body: {} } : okReply("from groq")), async (calls) => {
      const r = await aiCore.aiChat({ taskType: "general", prompt: "x" }, { maxAttempts: 2, sleep: noSleep });
      assert.ok(r.ok);
      if (r.ok) { assert.equal(r.fallbackUsed, true); assert.equal(r.response.provider, "groq:fallback"); }
      assert.equal(calls.filter((c) => c.url.includes("api.openai.com")).length, 2);
      assert.equal(calls.filter((c) => c.url.includes("api.groq.com")).length, 1);
    });
});

await checkAsync("aiChat: NO implicit fallback — without AI_PROVIDER_FALLBACK the error is returned", async () => {
  await withRouter({ OPENAI_API_KEY: KEYS.openai, GROQ_API_KEY: KEYS.groq, AI_PROVIDER_GENERAL: "openai" },
    (c) => (c.url.includes("api.openai.com") ? { status: 500, body: {} } : okReply("should not be called")), async (calls) => {
      const r = await aiCore.aiChat({ taskType: "general", prompt: "x" });
      assert.equal(r.ok, false);
      assert.ok(calls.every((c) => c.url.includes("api.openai.com")));
    });
});

await checkAsync("aiChat: bad_request does not trigger the fallback", async () => {
  await withRouter({ OPENAI_API_KEY: KEYS.openai, GROQ_API_KEY: KEYS.groq, AI_PROVIDER_GENERAL: "openai", AI_PROVIDER_FALLBACK: "groq" },
    (c) => (c.url.includes("api.openai.com") ? { status: 400, body: { error: { message: "context too long" } } } : okReply("no")), async (calls) => {
      const r = await aiCore.aiChat({ taskType: "general", prompt: "x" });
      assert.equal(r.ok, false);
      if (!r.ok) assert.equal(r.error.category, "bad_request");
      assert.equal(calls.length, 1);
    });
});

await checkAsync("aiChat: disabled provider is never called; missing key → not_configured (503)", async () => {
  await withRouter({ OPENAI_API_KEY: KEYS.openai, AI_PROVIDER_GENERAL: "openai", AI_PROVIDERS_DISABLED: "openai" }, () => okReply("no"), async (calls) => {
    const r = await aiCore.aiChat({ taskType: "general", prompt: "x" });
    assert.equal(r.ok, false);
    if (!r.ok) { assert.equal(r.error.category, "disabled"); assert.equal(aiCore.aiErrorStatus(r.error), 503); }
    assert.equal(calls.length, 0);
  });
  await withRouter({ AI_PROVIDER_GENERAL: "openai" }, () => okReply("no"), async (calls) => {
    const r = await aiCore.aiChat({ taskType: "general", prompt: "x" });
    assert.equal(r.ok, false);
    if (!r.ok) assert.equal(r.error.category, "not_configured");
    assert.equal(calls.length, 0);
    assert.equal(await aiCore.isAiConfigured("general"), false);
  });
});

await checkAsync("aiChat: required capability is enforced before any request", async () => {
  await withRouter({ ANTHROPIC_API_KEY: KEYS.anthropic, AI_PROVIDER_GENERAL: "anthropic" }, () => okReply("no"), async (calls) => {
    const r = await aiCore.aiChat({ taskType: "general", prompt: "x" }, { require: ["structured"] });
    assert.equal(r.ok, false);
    if (!r.ok) assert.equal(r.error.category, "unsupported_capability");
    assert.equal(calls.length, 0);
  });
});

await checkAsync("resolveRuntimeProvider: auto-selects the first provider with a key; visa keeps groq", async () => {
  await withRouter({ ANTHROPIC_API_KEY: KEYS.anthropic }, () => okReply(""), async () => {
    const r = await aiCore.resolveRuntimeProvider("essay");
    assert.equal(r.name, "anthropic");
    assert.equal(r.selection, "auto");
    assert.equal(r.apiKeySource, "env");
    const visa = await aiCore.resolveRuntimeProvider("visa");
    assert.equal(visa.name, "anthropic", "visa falls back to auto when groq has no key");
  });
  await withRouter({ ANTHROPIC_API_KEY: KEYS.anthropic, GROQ_API_KEY: KEYS.groq }, () => okReply(""), async () => {
    const visa = await aiCore.resolveRuntimeProvider("visa");
    assert.equal(visa.name, "groq");
    assert.equal(visa.selection, "default");
  });
  await withRouter({ GROQ_API_KEY: KEYS.groq, AI_PROVIDER_DEFAULT: "openai" }, () => okReply(""), async () => {
    const r = await aiCore.resolveRuntimeProvider("essay");
    assert.equal(r.name, "openai");
    assert.equal(r.selection, "env");
    assert.equal(await aiCore.isAiConfigured("essay"), false, "explicit choice without a key is not silently replaced");
  });
});

await checkAsync("aiGenerate stays backward compatible (null on failure)", async () => {
  await withRouter({ AI_PROVIDER_GENERAL: "openai" }, () => okReply("no"), async () => {
    assert.equal(await aiCore.aiGenerate({ taskType: "general", prompt: "x" }), null);
  });
});

check("admin AI route: audit, rate limit, gemini rejected for chat tasks, no key in audit", () => {
  const route = readFileSync(join(ROOT, "src/app/api/admin/ai-settings/route.ts"), "utf8");
  assert.match(route, /entityType: "ai_provider"/);
  assert.match(route, /checkRateLimit\(/);
  assert.match(route, /isChatProvider\(value\)/);
  assert.match(route, /reencryptStoredKeys/);
  assert.doesNotMatch(route, /audit\([^)]*apiKey[,)]/, "raw key must never be passed to audit");
  const ui = readFileSync(join(ROOT, "src/components/admin/AiSettingsManager.tsx"), "utf8");
  assert.doesNotMatch(ui, /ai-settings\/test/, "UI must call the existing POST route (the /test path never existed)");
});

check("health check redacts provider snippets", () => {
  const src = readFileSync(join(ROOT, "src/lib/ai/test.ts"), "utf8");
  assert.match(src, /redactSecrets\(/);
});

check("visa + research agent use the shared provider resolution", () => {
  for (const p of ["src/app/api/visa/chat/route.ts", "src/app/api/visa/analyze/route.ts"]) {
    const src = readFileSync(join(ROOT, p), "utf8");
    assert.match(src, /aiChat\(/, p);
    assert.doesNotMatch(src, /groqChatComplete/, p);
  }
  const agent = readFileSync(join(ROOT, "src/lib/research-agent/run-university.ts"), "utf8");
  assert.match(agent, /resolveRuntimeProvider\("document"\)/);
  assert.doesNotMatch(agent, /resolveProviderCredential\("openrouter"\)/);
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
