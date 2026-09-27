/**
 * AI provider settings — pure core (spec §12, §13, §15, §16).
 *
 * This module contains ONLY deterministic, side-effect-free logic so it can be
 * unit-tested without a database or network (see scripts/check-ai-settings.ts).
 * DB access and env resolution happen one layer up:
 *   - src/lib/ai/credentials.ts  → DB persistence of provider credentials
 *   - src/lib/ai/index.ts        → runtime router used by the app
 *
 * Priority everywhere:  admin-panel (DB) values  →  environment variables  →
 * defaults in this file / CONFIG_DEFAULTS.
 */

import { createCipheriv, createDecipheriv, randomBytes, createHash } from "node:crypto";

// ---------------------------------------------------------------------------
// Provider registry
// ---------------------------------------------------------------------------

export type AIProviderId = "openrouter" | "openai" | "anthropic" | "groq" | "gemini" | "google" | "custom";

/**
 * What a provider can do. Capabilities are the provider's upper bound —
 * individual models may support less (e.g. vision), so callers only ever
 * REQUEST a capability and the router refuses providers that lack it.
 */
export type AICapability =
  | "text"        // chat / text generation (every chat provider)
  | "structured"  // JSON-object response mode (response_format)
  | "tools"       // function / tool calling
  | "vision"      // image input
  | "embeddings"
  | "streaming"
  | "audio"       // realtime voice (Gemini Live)
  | "reasoning";  // reasoning-effort control

export const AI_CAPABILITIES: AICapability[] = ["text", "structured", "tools", "vision", "embeddings", "streaming", "audio", "reasoning"];

export interface AIProviderMeta {
  id: AIProviderId;
  /** Human label shown in the admin panel. */
  label: string;
  /** Model used when neither the admin panel nor env sets one. */
  defaultModel: string;
  /** Env var holding this provider's API key (fallback). */
  keyEnvVar: string;
  /** Env var holding this provider's model (fallback). */
  modelEnvVar: string;
  /** Shape hint for the API-key input (e.g. "sk-or-v1-…"). */
  keyShape: string;
  /** Capability upper bound (see AICapability). */
  capabilities: AICapability[];
  /**
   * Wire protocol: "openai" = OpenAI-compatible /chat/completions,
   * "anthropic" = Messages API, "live" = realtime voice only (no chat).
   */
  protocol: "openai" | "anthropic" | "live";
  /** Fixed API base (OpenAI-compatible). Custom providers read baseUrlEnvVar. */
  baseUrl?: string;
  /** Env var holding the base URL (custom OpenAI-compatible provider only). */
  baseUrlEnvVar?: string;
}

// "gemini" serves the Gemini Live voice interview (visa speaking assistant) —
// it has no chat adapter. Gemini CHAT models are the separate "google"
// provider (OpenAI-compatible endpoint), so the voice model setting and the
// chat model setting never overwrite each other. "custom" is any other
// OpenAI-compatible server (self-hosted, local, other vendors); its base URL
// is deployment configuration (env), never editable from the browser.
export const AI_PROVIDER_IDS: AIProviderId[] = ["openrouter", "openai", "anthropic", "groq", "gemini", "google", "custom"];

export const AI_PROVIDERS: Record<AIProviderId, AIProviderMeta> = {
  openrouter: {
    id: "openrouter",
    label: "OpenRouter",
    defaultModel: "meta-llama/llama-3.3-70b-instruct",
    keyEnvVar: "OPENROUTER_API_KEY",
    modelEnvVar: "OPENROUTER_MODEL",
    keyShape: "sk-or-v1-…",
    capabilities: ["text", "structured", "tools", "streaming"],
    protocol: "openai",
    baseUrl: "https://openrouter.ai/api/v1",
  },
  openai: {
    id: "openai",
    label: "OpenAI",
    defaultModel: "gpt-4o-mini",
    keyEnvVar: "OPENAI_API_KEY",
    modelEnvVar: "OPENAI_MODEL",
    keyShape: "sk-…",
    capabilities: ["text", "structured", "tools", "vision", "embeddings", "streaming", "reasoning"],
    protocol: "openai",
    baseUrl: "https://api.openai.com/v1",
  },
  anthropic: {
    id: "anthropic",
    label: "Anthropic",
    defaultModel: "claude-3-5-sonnet-latest",
    keyEnvVar: "ANTHROPIC_API_KEY",
    modelEnvVar: "ANTHROPIC_MODEL",
    keyShape: "sk-ant-…",
    // No JSON response mode — structured output is prompt-driven + validated.
    capabilities: ["text", "tools", "vision", "streaming", "reasoning"],
    protocol: "anthropic",
    baseUrl: "https://api.anthropic.com/v1",
  },
  groq: {
    id: "groq",
    label: "Groq",
    defaultModel: "openai/gpt-oss-120b",
    keyEnvVar: "GROQ_API_KEY",
    modelEnvVar: "GROQ_MODEL",
    keyShape: "gsk_…",
    capabilities: ["text", "structured", "tools", "streaming", "reasoning"],
    protocol: "openai",
    baseUrl: "https://api.groq.com/openai/v1",
  },
  gemini: {
    id: "gemini",
    label: "Gemini (Live voice)",
    defaultModel: "gemini-3.1-flash-live-preview",
    keyEnvVar: "GEMINI_API_KEY",
    modelEnvVar: "GEMINI_LIVE_MODEL",
    keyShape: "AIza…",
    capabilities: ["audio"],
    protocol: "live",
  },
  google: {
    id: "google",
    label: "Google Gemini (chat)",
    defaultModel: "gemini-3.8-flash",
    keyEnvVar: "GOOGLE_AI_API_KEY",
    modelEnvVar: "GOOGLE_AI_MODEL",
    keyShape: "AIza…",
    capabilities: ["text", "structured", "tools", "vision", "embeddings", "streaming", "reasoning"],
    protocol: "openai",
    baseUrl: "https://generativelanguage.googleapis.com/v1beta/openai",
  },
  custom: {
    id: "custom",
    label: "OpenAI-compatible (custom)",
    defaultModel: "",
    keyEnvVar: "AI_CUSTOM_API_KEY",
    modelEnvVar: "AI_CUSTOM_MODEL",
    keyShape: "any",
    // Only plain chat is assumed; extend with AI_CUSTOM_CAPABILITIES.
    capabilities: ["text"],
    protocol: "openai",
    baseUrlEnvVar: "AI_CUSTOM_BASE_URL",
  },
};

/** Capabilities of a provider (custom: + AI_CUSTOM_CAPABILITIES from env). */
export function providerCapabilities(
  id: AIProviderId,
  env: Record<string, string | undefined> = process.env
): AICapability[] {
  const base = AI_PROVIDERS[id].capabilities;
  if (id !== "custom") return base;
  const extra = String(env.AI_CUSTOM_CAPABILITIES || "")
    .split(",")
    .map((c) => c.trim().toLowerCase())
    .filter((c): c is AICapability => (AI_CAPABILITIES as string[]).includes(c) && c !== "audio");
  return Array.from(new Set([...base, ...extra]));
}

export function supportsCapability(
  id: AIProviderId,
  capability: AICapability,
  env: Record<string, string | undefined> = process.env
): boolean {
  return providerCapabilities(id, env).includes(capability);
}

/** Providers that can serve chat/text tasks. */
export function isChatProvider(id: AIProviderId): boolean {
  return AI_PROVIDERS[id].protocol !== "live";
}

/**
 * API base for an OpenAI-compatible provider, or "" when unavailable. The
 * custom base URL comes from env only (deployment config) — it may point at
 * localhost for self-hosted models, which is exactly why browsers can never
 * set it (no SSRF through the admin panel).
 */
export function providerBaseUrl(
  id: AIProviderId,
  env: Record<string, string | undefined> = process.env
): string {
  const meta = AI_PROVIDERS[id];
  const raw = meta.baseUrlEnvVar ? env[meta.baseUrlEnvVar] : meta.baseUrl;
  const value = String(raw || "").trim().replace(/\/+$/, "");
  if (!value) return "";
  try {
    const u = new URL(value);
    if (u.protocol !== "https:" && u.protocol !== "http:") return "";
    if (u.username || u.password) return "";
  } catch {
    return "";
  }
  return value;
}

/**
 * Whether reasoning_effort may be sent for this provider + model. It is
 * model-specific (non-reasoning models reject it with HTTP 400), so it is
 * only sent to model families known to accept it.
 */
export function acceptsReasoningEffort(id: AIProviderId, model: string): boolean {
  if (!supportsCapability(id, "reasoning")) return false;
  const m = model.toLowerCase();
  if (id === "groq") return m.includes("gpt-oss") || m.includes("qwen3");
  if (id === "openai") return /^(o\d|gpt-5)/.test(m);
  if (id === "google") return /^gemini-(2\.5|[3-9])/.test(m);
  return false;
}

export function isAIProviderId(value: string | null | undefined): value is AIProviderId {
  return !!value && value in AI_PROVIDERS;
}

// ---------------------------------------------------------------------------
// Task registry (spec §12 — one provider per task, configurable by admin)
// ---------------------------------------------------------------------------

export type AITaskId = "admissions" | "essay" | "general" | "search" | "document" | "visa";

export interface AITaskMeta {
  id: AITaskId;
  label: string;
  description: string;
}

export const AI_TASKS: AITaskMeta[] = [
  { id: "admissions", label: "Admissions advice", description: "University matching & admissions Q&A" },
  { id: "essay", label: "Essay / SOP studio", description: "SOP drafting, review and evaluation" },
  { id: "general", label: "Chat mentor (general)", description: "General study-abroad assistant" },
  { id: "search", label: "Search & discovery", description: "Scholarship / university search assist" },
  { id: "document", label: "Document analysis", description: "Research agent & document review" },
  { id: "visa", label: "Visa interview", description: "Visa officer dialogue + interview analysis" },
];

/**
 * Tasks with their own default provider. They follow ONLY their own
 * mapping (ai_provider_<task> / AI_PROVIDER_<TASK>), not the global default:
 * the visa interview prompts were tuned for Groq's gpt-oss, so changing the
 * global chat provider must not silently change the visa interview.
 */
export const TASK_DEFAULT_PROVIDER: Partial<Record<AITaskId, AIProviderId>> = {
  visa: "groq",
};

export function isAITaskId(value: string | null | undefined): value is AITaskId {
  return AI_TASKS.some((t) => t.id === value);
}

/** app_config key for a task → provider mapping (ai_provider_<task>). */
export function taskProviderConfigKey(task: string): string {
  return `ai_provider_${task}`;
}

/** app_config key for the default provider. */
export const DEFAULT_PROVIDER_CONFIG_KEY = "ai_default_provider";

/** Env var name used per task (fallback chain, spec §12). */
export const TASK_PROVIDER_ENV: Record<string, string> = {
  admissions: "AI_PROVIDER_ADMISSIONS",
  essay: "AI_PROVIDER_ESSAY",
  general: "AI_PROVIDER_GENERAL",
  search: "AI_PROVIDER_SEARCH",
  document: "AI_PROVIDER_DOCUMENT_ANALYSIS",
  visa: "AI_PROVIDER_VISA",
};

/** app_config keys for the explicit fallback + disabled list. */
export const FALLBACK_PROVIDER_CONFIG_KEY = "ai_fallback_provider";
export const DISABLED_PROVIDERS_CONFIG_KEY = "ai_disabled_providers";

/**
 * Explicit fallback provider (never implicit): admin panel value, else env
 * AI_PROVIDER_FALLBACK. "", "none" or unknown ids → no fallback.
 */
export function resolveFallbackProvider(
  dbValue: string | null | undefined,
  env: Record<string, string | undefined> = process.env
): AIProviderId | null {
  const raw = String((dbValue ?? env.AI_PROVIDER_FALLBACK) || "").trim().toLowerCase();
  if (!raw || raw === "none") return null;
  return isAIProviderId(raw) && isChatProvider(raw) ? raw : null;
}

/** Parse the stored disabled-provider list (JSON array or comma list). */
export function parseDisabledProviders(raw: string | null | undefined): AIProviderId[] {
  const text = String(raw ?? "").trim();
  if (!text) return [];
  let items: unknown[] = [];
  try {
    const parsed = JSON.parse(text);
    items = Array.isArray(parsed) ? parsed : [];
  } catch {
    items = text.split(",");
  }
  return Array.from(new Set(items.map((i) => String(i).trim().toLowerCase()).filter(isAIProviderId))) as AIProviderId[];
}

/**
 * When nothing chose a provider explicitly (no admin mapping, no env), use
 * the first chat provider that actually has a key — "if Groq is configured,
 * use Groq; if another provider is configured, use it". Deterministic order,
 * decided once per request — not a runtime failover.
 */
export const AUTO_PROVIDER_ORDER: AIProviderId[] = ["groq", "openrouter", "openai", "anthropic", "google", "custom"];

export function autoSelectProvider(
  usable: (id: AIProviderId) => boolean,
  defaultProvider: AIProviderId = "openrouter"
): AIProviderId {
  return AUTO_PROVIDER_ORDER.find((id) => usable(id)) ?? defaultProvider;
}

/**
 * Whether the task's provider was chosen explicitly (admin mapping/default
 * or env). Used to decide between the explicit choice and auto-selection.
 */
export function hasExplicitProviderChoice(
  taskType: string,
  dbProviders: DbTaskProviderMap,
  env: Record<string, string | undefined> = process.env
): boolean {
  const taskDefault = TASK_DEFAULT_PROVIDER[taskType as AITaskId];
  const envVar = TASK_PROVIDER_ENV[taskType] || TASK_PROVIDER_ENV.general;
  const candidates = taskDefault
    ? [dbProviders[taskProviderConfigKey(taskType)], env[envVar]]
    : [dbProviders[taskProviderConfigKey(taskType)], dbProviders[DEFAULT_PROVIDER_CONFIG_KEY], env[envVar], env.AI_PROVIDER_DEFAULT];
  return candidates.some((c) => isAIProviderId(String(c ?? "").trim().toLowerCase()));
}

// ---------------------------------------------------------------------------
// API key masking & validation
// ---------------------------------------------------------------------------

/** Show only the last 4 chars: "••••abcd". Empty input → "". */
export function maskApiKey(key: string | null | undefined): string {
  if (!key) return "";
  const k = String(key).trim();
  if (k.length === 0) return "";
  if (k.length <= 4) return "•".repeat(k.length);
  return `••••${k.slice(-4)}`;
}

/**
 * Basic sanity check before an admin saves a key. Real provider keys are
 * long base64-ish strings without spaces; this rejects typos, empty values
 * and obviously truncated pastes while staying provider-agnostic.
 */
export function validateApiKey(key: string | null | undefined): boolean {
  if (!key) return false;
  const k = String(key).trim();
  if (k.length < 16) return false;
  if (/\s/.test(k)) return false;
  return true;
}

// ---------------------------------------------------------------------------
// Encryption at rest (node:crypto AES-256-GCM, never plaintext in the DB)
// ---------------------------------------------------------------------------

export const ENCRYPTED_PREFIX = "enc:v1:";

/**
 * Secret used to encrypt/decrypt stored API keys. Prefer the explicit
 * AI_KEYS_ENCRYPTION_SECRET env var; when it is absent we derive a stable
 * key from DATABASE_URL so keys are still encrypted at rest.
 */
export function encryptionSecret(env: Record<string, string | undefined> = process.env): string {
  const explicit = env.AI_KEYS_ENCRYPTION_SECRET;
  if (explicit && explicit.length >= 16) return explicit;
  return createHash("sha256")
    .update(env.DATABASE_URL || "scholarbridge-local-dev-secret")
    .digest("hex");
}

/** Whether an explicit encryption secret is configured (vs derived). */
export function hasExplicitEncryptionSecret(env: Record<string, string | undefined> = process.env): boolean {
  return Boolean(env.AI_KEYS_ENCRYPTION_SECRET && env.AI_KEYS_ENCRYPTION_SECRET.length >= 16);
}

/**
 * Previous encryption secrets (comma separated in
 * AI_KEYS_ENCRYPTION_SECRET_PREVIOUS) — lets the owner rotate the secret or
 * move hosts: stored keys still decrypt with an old secret and are rewritten
 * with the current one by the admin "re-encrypt" action.
 */
export function previousEncryptionSecrets(env: Record<string, string | undefined> = process.env): string[] {
  return String(env.AI_KEYS_ENCRYPTION_SECRET_PREVIOUS || "")
    .split(",")
    .map((s) => s.trim())
    .filter((s) => s.length >= 16);
}

/**
 * Decrypt with the current secret, then any previous ones. `rotated` tells
 * the caller the payload should be re-encrypted with the current secret.
 */
export function decryptWithRotation(
  payload: string | null | undefined,
  env: Record<string, string | undefined> = process.env
): { key: string | null; rotated: boolean } {
  const current = decryptApiKey(payload, encryptionSecret(env));
  if (current) return { key: current, rotated: false };
  for (const old of previousEncryptionSecrets(env)) {
    const k = decryptApiKey(payload, old);
    if (k) return { key: k, rotated: true };
  }
  return { key: null, rotated: false };
}

/**
 * Remove anything secret-shaped from text that may reach a log, an admin
 * response or an error message: the known key values themselves, Bearer
 * tokens, and common provider key formats.
 */
export function redactSecrets(text: string, known: (string | null | undefined)[] = []): string {
  let out = String(text ?? "");
  for (const k of known) {
    const v = String(k ?? "").trim();
    if (v.length >= 8) out = out.split(v).join("[REDACTED]");
  }
  return out
    .replace(/(Bearer\s+)[A-Za-z0-9._~+/=-]+/gi, "$1[REDACTED]")
    .replace(/\b(sk-ant-|sk-or-v1-|sk-proj-|sk-|gsk_|xai-)[A-Za-z0-9_-]{8,}/g, "$1[REDACTED]")
    .replace(/\bAIza[0-9A-Za-z_-]{20,}/g, "AIza[REDACTED]")
    .replace(/([?&](?:key|api_key|apikey)=)[^&\s]+/gi, "$1[REDACTED]");
}

/** Encrypt a plaintext API key → "enc:v1:<iv>:<tag>:<data>" (base64). */
export function encryptApiKey(plain: string, secret?: string): string {
  const key = createHash("sha256").update(secret ?? encryptionSecret()).digest();
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  const data = Buffer.concat([cipher.update(String(plain), "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `${ENCRYPTED_PREFIX}${iv.toString("base64")}:${tag.toString("base64")}:${data.toString("base64")}`;
}

/**
 * Decrypt a payload produced by encryptApiKey. Returns null for anything
 * that is not a valid "enc:v1:" payload (wrong secret, tampered data,
 * plaintext fallback) — callers must never store plaintext.
 */
export function decryptApiKey(payload: string | null | undefined, secret?: string): string | null {
  if (!payload || !payload.startsWith(ENCRYPTED_PREFIX)) return null;
  try {
    const key = createHash("sha256").update(secret ?? encryptionSecret()).digest();
    const body = payload.slice(ENCRYPTED_PREFIX.length);
    const [ivB64, tagB64, dataB64] = body.split(":");
    if (!ivB64 || !tagB64 || !dataB64) return null;
    const decipher = createDecipheriv("aes-256-gcm", key, Buffer.from(ivB64, "base64"));
    decipher.setAuthTag(Buffer.from(tagB64, "base64"));
    return Buffer.concat([decipher.update(Buffer.from(dataB64, "base64")), decipher.final()]).toString("utf8");
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// Resolution rules (pure — inputs injected so tests need no DB/env)
// ---------------------------------------------------------------------------

export type ApiKeySource = "db" | "env" | "none";

export interface ResolvedCredential {
  apiKey: string | undefined;
  apiKeySource: ApiKeySource;
  model: string;
}

export interface DbTaskProviderMap {
  /** app_config key → value, e.g. { ai_provider_essay: "anthropic" }. */
  [key: string]: string;
}

/**
 * Pick the provider for a task — priority:
 *   1. DB (admin panel): `ai_provider_<task>`, then `ai_default_provider`
 *   2. env: AI_PROVIDER_<TASK>, then AI_PROVIDER_DEFAULT
 *   3. `defaultProvider` argument
 * Unknown/typo'd provider ids fall back to the default provider.
 */
export function resolveProviderForTask(
  taskType: string,
  dbProviders: DbTaskProviderMap,
  env: Record<string, string | undefined> = process.env,
  defaultProvider: string = "openrouter"
): AIProviderId {
  const dbTask = dbProviders[taskProviderConfigKey(taskType)];
  const envVar = TASK_PROVIDER_ENV[taskType] || TASK_PROVIDER_ENV.general;
  const taskDefault = TASK_DEFAULT_PROVIDER[taskType as AITaskId];
  if (taskDefault) {
    // Tasks with their own default ignore the GLOBAL default (see above).
    const raw = String(dbTask || env[envVar] || taskDefault).trim().toLowerCase();
    return isAIProviderId(raw) ? (raw as AIProviderId) : taskDefault;
  }
  const dbDefault = dbProviders[DEFAULT_PROVIDER_CONFIG_KEY];
  const envValue = env[envVar] || env.AI_PROVIDER_DEFAULT || defaultProvider;
  const raw = String(dbTask || dbDefault || envValue || defaultProvider).trim().toLowerCase();
  return isAIProviderId(raw) ? (raw as AIProviderId) : (defaultProvider as AIProviderId);
}

/**
 * Resolve one provider's key + model: DB credential (decrypted) wins, then
 * env, then the provider's default model.
 */
export function resolveCredential(
  providerId: AIProviderId,
  dbCredential: { apiKeyEnc?: string | null; model?: string | null } | null | undefined,
  env: Record<string, string | undefined> = process.env,
  secret?: string
): ResolvedCredential {
  const meta = AI_PROVIDERS[providerId];

  if (dbCredential?.apiKeyEnc) {
    const decrypted = secret
      ? decryptApiKey(dbCredential.apiKeyEnc, secret)
      : decryptWithRotation(dbCredential.apiKeyEnc, env).key;
    if (decrypted) {
      return {
        apiKey: decrypted,
        apiKeySource: "db",
        model: dbCredential.model?.trim() || env[meta.modelEnvVar] || meta.defaultModel,
      };
    }
  }

  const envKey = env[meta.keyEnvVar];
  if (envKey) {
    return {
      apiKey: envKey,
      apiKeySource: "env",
      model: env[meta.modelEnvVar] || meta.defaultModel,
    };
  }

  return { apiKey: undefined, apiKeySource: "none", model: env[meta.modelEnvVar] || meta.defaultModel };
}

/** Whether the task's resolved provider has a usable key (db or env). */
export function isTaskConfigured(
  taskType: string,
  dbProviders: DbTaskProviderMap,
  dbCredentialForProvider: { apiKeyEnc?: string | null; model?: string | null } | null | undefined,
  env: Record<string, string | undefined> = process.env,
  secret?: string
): boolean {
  const providerId = resolveProviderForTask(taskType, dbProviders, env);
  return resolveCredential(providerId, dbCredentialForProvider, env, secret).apiKeySource !== "none";
}

/** Stable public summary of a credential — never contains the raw key. */
export interface PublicCredential {
  provider: AIProviderId;
  label: string;
  capabilities?: AICapability[];
  protocol?: AIProviderMeta["protocol"];
  enabled?: boolean;
  /** custom provider only: whether AI_CUSTOM_BASE_URL is set (never the URL's secrets). */
  baseUrlConfigured?: boolean;
  /** A stored key exists but cannot be decrypted with the current/previous secrets. */
  undecryptable?: boolean;
  /** A stored key decrypts only with a PREVIOUS secret — re-encrypt it. */
  needsReencrypt?: boolean;
  model: string;
  hasKey: boolean;
  keySource: ApiKeySource;
  keyHint: string;
  updatedAt: string | null;
}
