/**
 * Which app_config keys admins may edit, export and import — and how their
 * values are validated. One allowlist for PUT /api/admin/config and for the
 * export/import routes, so neither can write internal state (Telegram token,
 * sweep timestamps) or an invalid AI provider.
 *
 * Export contains NON-SECRET settings only: no API keys, tokens, passwords
 * or encrypted blobs — secrets live in env vars / the AI credentials table
 * and must be re-entered on the new host (see DEPLOYMENT.md).
 */
import {
  AI_TASKS,
  DEFAULT_PROVIDER_CONFIG_KEY,
  DISABLED_PROVIDERS_CONFIG_KEY,
  FALLBACK_PROVIDER_CONFIG_KEY,
  isAIProviderId,
  isChatProvider,
  taskProviderConfigKey,
  type AIProviderId,
} from "@/lib/ai/settings";
import { CONFIG_DEFAULTS } from "@/lib/config";

export const CONFIG_EXPORT_FORMAT = "scholarbridge-config";
export const CONFIG_EXPORT_VERSION = 1;
const MAX_VALUE_LENGTH = 20_000;
const MAX_IMPORT_KEYS = 200;

/** Keys managed by other screens but safe to move between hosts. */
const EXTRA_PORTABLE_KEYS = new Set<string>([
  FALLBACK_PROVIDER_CONFIG_KEY,
  DISABLED_PROVIDERS_CONFIG_KEY,
  "journey_steps",
  "section_help",
]);

/** Defense in depth: never treat anything secret-looking as portable. */
const SECRET_KEY_RE = /(secret|token|password|passwd|api_?key|credential|_enc$|private)/i;

const INTEGER_KEYS = new Set([
  "payment_premium_price_uzs",
  "payment_premium_days",
  "ai_free_requests_per_day",
  "ai_premium_requests_per_day",
  "ai_free_tokens_per_day",
  "ai_premium_tokens_per_day",
  "refresh_interval_hours",
  "referral_premium_multiple",
  "referral_premium_days",
]);
const JSON_KEYS = new Set(["nav_hidden_items", "journey_steps", "section_help"]);
const PROVIDER_KEYS = new Set([DEFAULT_PROVIDER_CONFIG_KEY, ...AI_TASKS.map((t) => taskProviderConfigKey(t.id))]);
const MODEL_RE = /^[A-Za-z0-9._:/@+-]{1,200}$/;

export function isPortableConfigKey(key: string): boolean {
  if (typeof key !== "string" || !key || key.length > 100) return false;
  if (SECRET_KEY_RE.test(key)) return false;
  return key in CONFIG_DEFAULTS || EXTRA_PORTABLE_KEYS.has(key) || /^feature_[a-z0-9_]{1,60}$/.test(key);
}

/** Null when valid, otherwise a human-readable reason. */
export function validateConfigValue(key: string, value: unknown): string | null {
  if (!isPortableConfigKey(key)) return "not an editable setting";
  if (typeof value !== "string") return "value must be a string";
  if (value.length > MAX_VALUE_LENGTH) return `value longer than ${MAX_VALUE_LENGTH} characters`;
  if (PROVIDER_KEYS.has(key)) {
    return isAIProviderId(value) && isChatProvider(value) ? null : "must be a chat AI provider id";
  }
  if (key === FALLBACK_PROVIDER_CONFIG_KEY) {
    return value === "none" || (isAIProviderId(value) && isChatProvider(value)) ? null : 'must be "none" or a chat AI provider id';
  }
  if (key === DISABLED_PROVIDERS_CONFIG_KEY) {
    try {
      const arr = JSON.parse(value);
      return Array.isArray(arr) && arr.every((x) => isAIProviderId(String(x))) ? null : "must be a JSON array of provider ids";
    } catch {
      return "must be a JSON array of provider ids";
    }
  }
  if (INTEGER_KEYS.has(key)) return /^\d{1,12}$/.test(value) ? null : "must be a non-negative integer";
  if (key === "payment_currency") return /^[A-Z]{3}$/.test(value) ? null : "must be a 3-letter currency code";
  if (key === "refresh_default_scope") return ["all", "scholarships", "universities"].includes(value) ? null : "must be all | scholarships | universities";
  if (JSON_KEYS.has(key)) {
    try {
      JSON.parse(value);
      return null;
    } catch {
      return "must be valid JSON";
    }
  }
  if (key.startsWith("feature_")) return ["free", "premium", "admin"].includes(value) ? null : "must be free | premium | admin";
  if (key.startsWith("branding_") && key.endsWith("_url")) {
    if (value === "" || (value.startsWith("/") && !value.startsWith("//"))) return null;
    try {
      return new URL(value).protocol === "https:" ? null : "must be empty, a /relative path or an https URL";
    } catch {
      return "must be empty, a /relative path or an https URL";
    }
  }
  return null;
}

export interface ConfigExport {
  format: typeof CONFIG_EXPORT_FORMAT;
  version: number;
  exportedAt: string;
  /** Saved (non-default) portable settings. */
  config: Record<string, string>;
  /** Model per AI provider (never keys). */
  aiModels: Partial<Record<AIProviderId, string>>;
}

export function buildConfigExport(
  storedRows: { key: string; value: string }[],
  storedModels: { provider: string; model: string | null }[],
  now: Date = new Date()
): ConfigExport {
  const config: Record<string, string> = {};
  for (const r of [...storedRows].sort((a, b) => a.key.localeCompare(b.key))) {
    if (validateConfigValue(r.key, r.value) === null) config[r.key] = r.value;
  }
  const aiModels: Partial<Record<AIProviderId, string>> = {};
  for (const m of storedModels) {
    if (isAIProviderId(m.provider) && m.model && MODEL_RE.test(m.model)) aiModels[m.provider] = m.model;
  }
  return { format: CONFIG_EXPORT_FORMAT, version: CONFIG_EXPORT_VERSION, exportedAt: now.toISOString(), config, aiModels };
}

export interface ImportPlan {
  ok: boolean;
  error?: string;
  changes: { key: string; from: string | null; to: string }[];
  unchanged: string[];
  rejected: { key: string; reason: string }[];
  modelChanges: { provider: AIProviderId; from: string | null; to: string }[];
}

/** Validate an uploaded export against the current state (no writes). */
export function planConfigImport(
  payload: unknown,
  current: Record<string, string>,
  currentModels: Partial<Record<AIProviderId, string | null>>
): ImportPlan {
  const plan: ImportPlan = { ok: false, changes: [], unchanged: [], rejected: [], modelChanges: [] };
  const p = payload as Partial<ConfigExport> | null;
  if (!p || typeof p !== "object" || p.format !== CONFIG_EXPORT_FORMAT) {
    return { ...plan, error: "Not a ScholarBridge config export." };
  }
  if (p.version !== CONFIG_EXPORT_VERSION) return { ...plan, error: `Unsupported export version ${String(p.version)}.` };
  const entries = Object.entries(p.config && typeof p.config === "object" ? p.config : {});
  if (entries.length > MAX_IMPORT_KEYS) return { ...plan, error: `Too many settings (max ${MAX_IMPORT_KEYS}).` };
  for (const [key, value] of entries) {
    const reason = validateConfigValue(key, value);
    if (reason) {
      plan.rejected.push({ key, reason });
      continue;
    }
    const from = current[key] ?? null;
    if (from === value) plan.unchanged.push(key);
    else plan.changes.push({ key, from, to: value as string });
  }
  for (const [provider, model] of Object.entries(p.aiModels && typeof p.aiModels === "object" ? p.aiModels : {})) {
    if (!isAIProviderId(provider)) {
      plan.rejected.push({ key: `aiModels.${provider}`, reason: "unknown provider" });
      continue;
    }
    if (typeof model !== "string" || !MODEL_RE.test(model)) {
      plan.rejected.push({ key: `aiModels.${provider}`, reason: "invalid model id" });
      continue;
    }
    const from = currentModels[provider] ?? null;
    if (from !== model) plan.modelChanges.push({ provider, from, to: model });
  }
  plan.ok = true;
  return plan;
}
