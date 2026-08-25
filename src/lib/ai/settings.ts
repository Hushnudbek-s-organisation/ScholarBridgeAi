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

export type AIProviderId = "openrouter" | "openai" | "anthropic" | "gemini";

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
}

export const AI_PROVIDER_IDS: AIProviderId[] = ["openrouter", "openai", "anthropic", "gemini"];

export const AI_PROVIDERS: Record<AIProviderId, AIProviderMeta> = {
  openrouter: {
    id: "openrouter",
    label: "OpenRouter",
    defaultModel: "google/gemini-2.5-flash",
    keyEnvVar: "OPENROUTER_API_KEY",
    modelEnvVar: "OPENROUTER_MODEL",
    keyShape: "sk-or-v1-…",
  },
  openai: {
    id: "openai",
    label: "OpenAI",
    defaultModel: "gpt-4o-mini",
    keyEnvVar: "OPENAI_API_KEY",
    modelEnvVar: "OPENAI_MODEL",
    keyShape: "sk-…",
  },
  anthropic: {
    id: "anthropic",
    label: "Anthropic",
    defaultModel: "claude-3-5-sonnet-latest",
    keyEnvVar: "ANTHROPIC_API_KEY",
    modelEnvVar: "ANTHROPIC_MODEL",
    keyShape: "sk-ant-…",
  },
  gemini: {
    id: "gemini",
    label: "Google Gemini",
    defaultModel: "gemini-2.5-flash",
    keyEnvVar: "GEMINI_API_KEY",
    modelEnvVar: "GEMINI_MODEL",
    keyShape: "AIza…",
  },
};

export function isAIProviderId(value: string | null | undefined): value is AIProviderId {
  return !!value && value in AI_PROVIDERS;
}

// ---------------------------------------------------------------------------
// Task registry (spec §12 — one provider per task, configurable by admin)
// ---------------------------------------------------------------------------

export type AITaskId = "admissions" | "essay" | "general" | "search" | "document";

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
];

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
};

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
  const dbDefault = dbProviders[DEFAULT_PROVIDER_CONFIG_KEY];
  const envVar = TASK_PROVIDER_ENV[taskType] || TASK_PROVIDER_ENV.general;
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
    const decrypted = decryptApiKey(dbCredential.apiKeyEnc, secret ?? encryptionSecret(env));
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
  model: string;
  hasKey: boolean;
  keySource: ApiKeySource;
  keyHint: string;
  updatedAt: string | null;
}
