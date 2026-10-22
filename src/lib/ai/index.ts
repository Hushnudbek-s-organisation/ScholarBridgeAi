/**
 * AI provider abstraction — the ONE path every AI feature uses
 * (website, Telegram bot and Mini App all reach it through the same API
 * routes; the visa interview and the research agent use it too).
 *
 *   Frontend → ScholarBridge API route → aiChat()/aiGenerate() → provider
 *
 * Provider per TASK, priority:
 *   1. admin panel (app_config: ai_provider_<task>, ai_default_provider)
 *   2. environment: AI_PROVIDER_<TASK>, AI_PROVIDER_DEFAULT
 *   3. auto: the first chat provider that has a key
 *      (openrouter → groq → openai → anthropic → google → custom)
 *   4. "openrouter" (unconfigured — requests fail as not_configured)
 * Visa follows an explicit task mapping; otherwise it prefers configured OpenRouter and can fall back to Groq on transient outages.
 *
 * API keys resolve admin panel credential (AES-256-GCM in DB) → env var and
 * never leave the server: not in responses, not in logs, not in errors.
 *
 * Failover is EXPLICIT only (ai_fallback_provider / AI_PROVIDER_FALLBACK).
 * A fallback answer is labelled "<provider>:fallback" so usage logs show it.
 */
import {
  AI_PROVIDERS,
  AI_PROVIDER_IDS,
  DEFAULT_PROVIDER_CONFIG_KEY,
  DISABLED_PROVIDERS_CONFIG_KEY,
  FALLBACK_PROVIDER_CONFIG_KEY,
  acceptsReasoningEffort,
  autoSelectProvider,
  hasExplicitProviderChoice,
  isAIProviderId,
  isChatProvider,
  parseDisabledProviders,
  providerBaseUrl,
  redactSecrets,
  resolveCredential,
  resolveFallbackProvider,
  resolveProviderForTask,
  supportsCapability,
  taskProviderConfigKey,
  type AICapability,
  type AIProviderId,
} from "./settings";
import { getStoredConfig } from "@/lib/config";
import { resolveAllProviderCredentials, resolveProviderCredential } from "./credentials";
import {
  AI_PRICING_CONFIG_KEY,
  costForUsage,
  mergePricingTables,
  parsePricingJson,
  VERIFIED_DEFAULT_PRICING,
  type AICostStatus,
  type PricingTable,
} from "./pricing";
import { evaluateAiBudget } from "./budget-gate";
import { logAIUsage } from "./usage";
import {
  OPENROUTER_DEFAULT_CHAT_MODEL,
  OPENROUTER_FREE_CHAT_FALLBACK_MODELS,
} from "./openrouterModelIds";

export { TASK_PROVIDER_ENV } from "./settings";
export type { AIProviderId, AITaskId, AICapability, PublicCredential, ResolvedCredential } from "./settings";
export type { AICostStatus } from "./pricing";

export interface AIProviderConfig {
  apiKey?: string;
  model?: string;
}

export interface AIChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface AIRequest {
  prompt: string;
  systemInstruction?: string;
  /** Multi-turn history; when set it is sent instead of prompt/systemInstruction. */
  messages?: AIChatMessage[];
  taskType?: string;
  temperature?: number;
  maxTokens?: number;
  /** Ask for a JSON object (only sent to providers with "structured"). */
  jsonMode?: boolean;
  /** Optional per-request provider timeout; defaults to 60 seconds. */
  timeoutMs?: number;
  /** Reasoning hint (only sent to model families that accept it). */
  reasoningEffort?: "low" | "medium" | "high";
  /**
   * The signed-in account this request is charged to (null = anonymous /
   * system). Recorded on the usage row; per-account quotas are checked by the
   * route guard (lib/ai/guard) before the router is reached.
   */
  profileId?: number | null;
}

/** What a provider adapter returns: the reply plus whatever usage it reported. */
export interface AIAdapterResponse {
  text: string;
  provider: string;
  model: string;
  /** Total prompt tokens, including cached ones. 0 when not reported. */
  promptTokens: number;
  completionTokens: number;
  /** Subset of promptTokens served from the provider's cache. */
  cachedPromptTokens: number;
  /** False when the provider returned no usage metadata. Tokens are then unknown, not zero. */
  usageReported: boolean;
  /** USD the provider itself billed for this call, when it reports one (OpenRouter usage.cost). */
  providerCostUsd?: number;
  /** True when the OpenRouter adapter succeeded on a later free-chat model. */
  modelFallbackUsed?: boolean;
}

export interface AIResponse {
  text: string;
  provider: string;
  model: string;
  promptTokens: number;
  completionTokens: number;
  cachedPromptTokens: number;
  usageReported: boolean;
  /**
   * USD for this call — null when it is not known. A number is either the
   * provider's own billed amount or an estimate from the configured price;
   * see costStatus. Never a fabricated 0.
   */
  costEstimate: number | null;
  costStatus: AICostStatus;
  /** True when OpenRouter's initial free-chat model was unavailable and another free candidate served the request. */
  modelFallbackUsed?: boolean;
}

export type AIProviderName = Exclude<AIProviderId, "gemini">;

export type AIErrorCategory =
  | "not_configured"
  | "disabled"
  | "unsupported_capability"
  | "auth"
  | "model_not_found"
  | "payment_required"
  | "rate_limited"
  | "bad_request"
  | "provider_unavailable"
  | "timeout"
  | "network"
  | "empty_response"
  /** A platform or per-provider spend budget is used up — no paid call was made. */
  | "budget_exhausted"
  | "unknown";

/** A provider failure with a safe, redacted message (no key, no prompt). */
export class AIProviderError extends Error {
  readonly category: AIErrorCategory;
  readonly status?: number;
  readonly provider: string;

  constructor(provider: string, category: AIErrorCategory, message: string, status?: number) {
    super(message);
    this.name = "AIProviderError";
    this.provider = provider;
    this.category = category;
    if (status !== undefined) this.status = status;
  }
}

export interface AIProviderAdapter {
  name: AIProviderName;
  /**
   * Return null if the provider is not configured (no key / base URL).
   * Throws AIProviderError on provider failures. Adapters report usage only;
   * cost is decided by the router (see costForUsage in ./pricing).
   */
  call(req: AIRequest, config: AIProviderConfig): Promise<AIAdapterResponse | null>;
}

/** Usage fields as providers report them; anything missing stays unknown. */
function reportedCount(v: unknown): number | undefined {
  return typeof v === "number" && Number.isFinite(v) && v >= 0 ? Math.floor(v) : undefined;
}

/** A USD amount as reported (fractions kept). */
function usdAmount(v: unknown): number | undefined {
  return typeof v === "number" && Number.isFinite(v) && v >= 0 ? v : undefined;
}

const REQUEST_TIMEOUT_MS = 60_000;

export function categorizeStatus(status: number): AIErrorCategory {
  if (status === 401 || status === 403) return "auth";
  if (status === 402) return "payment_required";
  if (status === 404) return "model_not_found";
  if (status === 429) return "rate_limited";
  if (status === 408) return "timeout";
  if (status >= 500) return "provider_unavailable";
  if (status >= 400) return "bad_request";
  return "unknown";
}

/** Transient = worth retrying on the SAME provider. */
export function isTransientCategory(category: AIErrorCategory): boolean {
  return category === "rate_limited" || category === "provider_unavailable" || category === "timeout" || category === "network";
}

function chatMessages(req: AIRequest): AIChatMessage[] {
  if (req.messages?.length) return req.messages;
  return [
    ...(req.systemInstruction ? [{ role: "system" as const, content: req.systemInstruction }] : []),
    { role: "user" as const, content: req.prompt },
  ];
}

async function readError(provider: string, res: Response, apiKey: string): Promise<AIProviderError> {
  const body = await res.text().catch(() => "");
  let detail = body;
  try {
    const parsed = JSON.parse(body) as { error?: { message?: string } | string };
    const msg = typeof parsed?.error === "string" ? parsed.error : parsed?.error?.message;
    if (msg) detail = msg;
  } catch {
    // keep raw body
  }
  const safe = redactSecrets(detail.split("\n")[0].replace(/\s+/g, " ").trim(), [apiKey]).slice(0, 200);
  return new AIProviderError(provider, categorizeStatus(res.status), `HTTP ${res.status}${safe ? ` — ${safe}` : ""}`, res.status);
}

async function timedFetch(provider: string, url: string, init: RequestInit, timeoutMs = REQUEST_TIMEOUT_MS): Promise<Response> {
  const timeout = Math.max(1_000, Math.min(timeoutMs, REQUEST_TIMEOUT_MS));
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeout);
  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } catch (err) {
    if ((err as Error)?.name === "AbortError") {
      throw new AIProviderError(provider, "timeout", `Timed out after ${timeout / 1000}s`);
    }
    throw new AIProviderError(provider, "network", "Network error reaching the provider");
  } finally {
    clearTimeout(timer);
  }
}

// ---------------------------------------------------------------------------
// Provider adapters
// ---------------------------------------------------------------------------

/**
 * One adapter for every OpenAI-compatible API (OpenRouter, OpenAI, Groq,
 * Google Gemini, custom/self-hosted). Differences are data, not code:
 * base URL, attribution headers, capability-gated request fields.
 */
function openAICompatible(name: AIProviderName): AIProviderAdapter {
  return {
    name,
    async call(req, cfg) {
      const base = providerBaseUrl(name);
      const model = cfg.model || AI_PROVIDERS[name].defaultModel;
      if (!cfg.apiKey || !base || !model) return null;
      const headers: Record<string, string> = {
        "Content-Type": "application/json",
        Authorization: `Bearer ${cfg.apiKey}`,
      };
      if (name === "openrouter") {
        // Attribution only — the deployment's own URL, never a hardcoded one.
        const { configuredAppUrl } = await import("@/lib/appUrl");
        const site = configuredAppUrl();
        if (site) headers["HTTP-Referer"] = site;
        headers["X-Title"] = "ScholarBridge";
      }
      const shouldTryFreeChatModels = name === "openrouter" && (model.endsWith(":free") || model === OPENROUTER_DEFAULT_CHAT_MODEL);
      const candidates = shouldTryFreeChatModels
        ? [model, ...OPENROUTER_FREE_CHAT_FALLBACK_MODELS.filter((candidate) => candidate !== model)]
        : [model];
      let data: any;
      let usedModel = model;
      let fallbackError: AIProviderError | undefined;
      for (let index = 0; index < candidates.length; index++) {
        const candidateModel = candidates[index];
        const res = await timedFetch(name, `${base}/chat/completions`, {
          method: "POST",
          headers,
          body: JSON.stringify({
            model: candidateModel,
            messages: chatMessages(req),
            temperature: req.temperature ?? 0.6,
            max_tokens: req.maxTokens ?? 4096,
            ...(req.jsonMode && supportsCapability(name, "structured") ? { response_format: { type: "json_object" } } : {}),
            ...(req.reasoningEffort && acceptsReasoningEffort(name, candidateModel) ? { reasoning_effort: req.reasoningEffort } : {}),
            // OpenRouter returns the billed USD amount only when asked (usage accounting).
            ...(name === "openrouter" ? { usage: { include: true } } : {}),
          }),
        }, req.timeoutMs);
        if (res.ok) {
          data = await res.json();
          usedModel = candidateModel;
          break;
        }
        const error = await readError(name, res, cfg.apiKey);
        const retryableFreeModelStatus = [402, 404, 429, 503].includes(error.status ?? 0);
        if (!shouldTryFreeChatModels || !retryableFreeModelStatus || index === candidates.length - 1) throw error;
        fallbackError = error;
      }
      if (!data) throw fallbackError ?? new AIProviderError(name, "provider_unavailable", "OpenRouter did not return a response");
      const usage = data?.usage && typeof data.usage === "object" ? data.usage : null;
      const prompt = reportedCount(usage?.prompt_tokens);
      const completion = reportedCount(usage?.completion_tokens);
      const cost = usdAmount(usage?.cost);
      return {
        text: data?.choices?.[0]?.message?.content ?? "",
        provider: name,
        model: data?.model || usedModel,
        modelFallbackUsed: usedModel !== model,
        promptTokens: prompt ?? 0,
        completionTokens: completion ?? 0,
        cachedPromptTokens: reportedCount(usage?.prompt_tokens_details?.cached_tokens) ?? 0,
        usageReported: prompt !== undefined || completion !== undefined,
        ...(cost !== undefined ? { providerCostUsd: cost } : {}),
      };
    },
  };
}

const anthropic: AIProviderAdapter = {
  name: "anthropic",
  async call(req, cfg) {
    if (!cfg.apiKey) return null;
    const model = cfg.model || AI_PROVIDERS.anthropic.defaultModel;
    const messages = chatMessages(req);
    const system = messages.filter((m) => m.role === "system").map((m) => m.content).join("\n\n");
    const res = await timedFetch("anthropic", `${providerBaseUrl("anthropic")}/messages`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": cfg.apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model,
        max_tokens: req.maxTokens ?? 4096,
        temperature: req.temperature ?? 0.6,
        ...(system ? { system } : {}),
        messages: messages.filter((m) => m.role !== "system").map((m) => ({ role: m.role, content: m.content })),
      }),
    }, req.timeoutMs);
    if (!res.ok) throw await readError("anthropic", res, cfg.apiKey);
    const data = await res.json();
    const usage = data?.usage && typeof data.usage === "object" ? data.usage : null;
    // Anthropic reports input_tokens EXCLUDING prompt-cache reads and writes;
    // fold them in so promptTokens is the full prompt, as for OpenAI-style APIs.
    const uncached = reportedCount(usage?.input_tokens);
    const cacheRead = reportedCount(usage?.cache_read_input_tokens) ?? 0;
    const cacheWrite = reportedCount(usage?.cache_creation_input_tokens) ?? 0;
    const completion = reportedCount(usage?.output_tokens);
    return {
      text: data?.content?.map((b: { text?: string }) => b.text ?? "").join("") ?? "",
      provider: "anthropic",
      model: data?.model || model,
      promptTokens: uncached === undefined && cacheRead + cacheWrite === 0 ? 0 : (uncached ?? 0) + cacheRead + cacheWrite,
      completionTokens: completion ?? 0,
      cachedPromptTokens: cacheRead,
      usageReported: uncached !== undefined || completion !== undefined,
    };
  },
};

export const PROVIDERS: Record<AIProviderName, AIProviderAdapter> = {
  openrouter: openAICompatible("openrouter"),
  openai: openAICompatible("openai"),
  anthropic,
  groq: openAICompatible("groq"),
  google: openAICompatible("google"),
  custom: openAICompatible("custom"),
};

// ---------------------------------------------------------------------------
// Runtime configuration (admin panel → env → auto)
// ---------------------------------------------------------------------------

export interface RuntimeAIConfig {
  dbProviders: Record<string, string>;
  disabled: AIProviderId[];
  fallback: AIProviderId | null;
  /** Admin-entered USD prices per provider/model (empty = every cost is unknown). */
  pricing: PricingTable;
}

/**
 * Only values an admin actually SAVED count as the panel's choice —
 * CONFIG_DEFAULTS are display defaults and must not mask env settings
 * (before this, AI_PROVIDER_DEFAULT/AI_PROVIDER_<TASK> were never honoured).
 */
export async function loadRuntimeAIConfig(taskType: string): Promise<RuntimeAIConfig> {
  const dbProviders: Record<string, string> = {};
  let disabledRaw: string | null = null;
  let fallbackRaw: string | null = null;
  let pricingRaw: string | null = null;
  try {
    const [def, task, disabled, fallback, pricing] = await Promise.all([
      getStoredConfig(DEFAULT_PROVIDER_CONFIG_KEY),
      getStoredConfig(taskProviderConfigKey(taskType)),
      getStoredConfig(DISABLED_PROVIDERS_CONFIG_KEY),
      getStoredConfig(FALLBACK_PROVIDER_CONFIG_KEY),
      getStoredConfig(AI_PRICING_CONFIG_KEY),
    ]);
    if (def) dbProviders[DEFAULT_PROVIDER_CONFIG_KEY] = def;
    if (task) dbProviders[taskProviderConfigKey(taskType)] = task;
    disabledRaw = disabled;
    fallbackRaw = fallback;
    pricingRaw = pricing;
  } catch {
    // DB unavailable — env/auto only, the app keeps working.
  }
  // An unparsable saved price table is ignored (costs become unknown) rather
  // than failing requests; the admin save path rejects it up front.
  const priced = parsePricingJson(pricingRaw, isChatProviderId);
  return {
    dbProviders,
    disabled: parseDisabledProviders(disabledRaw ?? process.env.AI_PROVIDERS_DISABLED),
    fallback: resolveFallbackProvider(fallbackRaw),
    pricing: mergePricingTables(VERIFIED_DEFAULT_PRICING, priced.ok ? priced.table : {}),
  };
}

function isChatProviderId(id: string): boolean {
  return isAIProviderId(id) && isChatProvider(id);
}

/** A provider is usable when it is a chat provider, enabled, and has key (+ base URL / model). */
function isUsable(id: AIProviderId, cred: { apiKey?: string; model?: string }, disabled: AIProviderId[]): boolean {
  if (!isChatProvider(id) || disabled.includes(id)) return false;
  if (!cred.apiKey || !cred.model) return false;
  if (AI_PROVIDERS[id].protocol === "openai" && !providerBaseUrl(id)) return false;
  return true;
}

async function usableCredential(id: AIProviderId, disabled: AIProviderId[]) {
  const cred = await resolveProviderCredential(id);
  return isUsable(id, cred, disabled) ? cred : null;
}

export function providerForTask(taskType: string): { name: AIProviderId; apiKey?: string; model?: string } {
  const name = resolveProviderForTask(taskType, {}, process.env);
  const cfg = resolveCredential(name, null, process.env);
  return { name, apiKey: cfg.apiKey, model: cfg.model };
}

export interface RuntimeProvider {
  name: AIProviderId;
  apiKey?: string;
  apiKeySource: "db" | "env" | "none";
  model?: string;
  /** How the provider was chosen — shown in the admin panel. */
  selection: "admin" | "env" | "auto" | "default";
  disabled: boolean;
}

/** Resolve the provider for one task (see the header for the priority). */
export async function resolveRuntimeProvider(taskType: string, runtime?: RuntimeAIConfig): Promise<RuntimeProvider> {
  const cfg = runtime ?? (await loadRuntimeAIConfig(taskType));
  const explicit = hasExplicitProviderChoice(taskType, cfg.dbProviders, process.env);
  let name: AIProviderId;
  let selection: RuntimeProvider["selection"];
  if (explicit) {
    name = resolveProviderForTask(taskType, cfg.dbProviders, process.env);
    const fromDb = Boolean(cfg.dbProviders[taskProviderConfigKey(taskType)] || cfg.dbProviders[DEFAULT_PROVIDER_CONFIG_KEY]);
    selection = fromDb ? "admin" : "env";
  } else {
    const taskDefault = resolveProviderForTask(taskType, {}, {});
    // Visa prefers OpenRouter when usable; otherwise, like every task, use
    // the first usable provider.
    // One query for every stored credential (not one per provider).
    const all = await resolveAllProviderCredentials();
    const usable = new Set<AIProviderId>(AI_PROVIDER_IDS.filter((id) => isUsable(id, all[id], cfg.disabled)));
    if (usable.has(taskDefault)) {
      name = taskDefault;
      selection = "default";
    } else {
      name = autoSelectProvider((id) => usable.has(id), taskDefault);
      selection = usable.size ? "auto" : "default";
    }
  }
  const cred = await resolveProviderCredential(name);
  return {
    name,
    apiKey: cred.apiKey,
    apiKeySource: cred.apiKeySource,
    model: cred.model,
    selection,
    disabled: cfg.disabled.includes(name),
  };
}

/** Whether the task's resolved provider can actually serve requests. */
export async function isAiConfigured(taskType: string): Promise<boolean> {
  const cfg = await loadRuntimeAIConfig(taskType);
  const runtime = await resolveRuntimeProvider(taskType, cfg);
  return Boolean(await usableCredential(runtime.name, cfg.disabled));
}

/** Structured request log — metadata only, never prompts, replies or keys. */
function logAiRequest(entry: {
  task: string;
  provider: string;
  model: string;
  status: "ok" | "error";
  latencyMs: number;
  category?: AIErrorCategory;
  fallback?: boolean;
  attempt?: number;
  costStatus?: AICostStatus;
}) {
  const line = JSON.stringify({ evt: "ai_request", ...entry });
  if (entry.status === "ok") console.info(line);
  else console.warn(line);
}

async function callOnce(
  provider: AIProviderId,
  req: AIRequest,
  cfg: RuntimeAIConfig,
  require: AICapability[]
): Promise<AIResponse> {
  if (!isChatProvider(provider)) {
    throw new AIProviderError(provider, "unsupported_capability", `${AI_PROVIDERS[provider].label} has no chat API`);
  }
  if (cfg.disabled.includes(provider)) {
    throw new AIProviderError(provider, "disabled", `${AI_PROVIDERS[provider].label} is disabled by the administrator`);
  }
  const missing = require.filter((c) => !supportsCapability(provider, c));
  if (missing.length) {
    throw new AIProviderError(provider, "unsupported_capability", `${AI_PROVIDERS[provider].label} does not support: ${missing.join(", ")}`);
  }
  const cred = await resolveProviderCredential(provider);
  const adapter = PROVIDERS[provider as AIProviderName];
  const adapted = await adapter.call(req, { apiKey: cred.apiKey, model: cred.model });
  if (!adapted) {
    throw new AIProviderError(provider, "not_configured", `${AI_PROVIDERS[provider].label} is not configured`);
  }
  if (!adapted.text.trim()) {
    throw new AIProviderError(provider, "empty_response", "The provider returned an empty reply");
  }
  // The one place a reply's cost is decided: provider-reported > estimate > unknown.
  const priced = costForUsage(
    provider,
    adapted.model,
    {
      promptTokens: adapted.promptTokens,
      completionTokens: adapted.completionTokens,
      cachedPromptTokens: adapted.cachedPromptTokens,
      reported: adapted.usageReported,
      providerCostUsd: adapted.providerCostUsd ?? null,
    },
    cfg.pricing
  );
  return {
    text: adapted.text,
    provider: adapted.provider,
    model: adapted.model,
    promptTokens: adapted.promptTokens,
    completionTokens: adapted.completionTokens,
    cachedPromptTokens: adapted.cachedPromptTokens,
    usageReported: adapted.usageReported,
    costEstimate: priced.costUsd,
    costStatus: priced.costStatus,
    ...(adapted.modelFallbackUsed ? { modelFallbackUsed: true } : {}),
  };
}

/** Error that stops the attempt loop without a provider call (budget gate). */
function budgetError(provider: AIProviderId, scope: string): AIProviderError {
  return new AIProviderError(provider, "budget_exhausted", `AI spend budget reached (${scope})`);
}

async function callWithRetry(
  task: string,
  provider: AIProviderId,
  req: AIRequest,
  cfg: RuntimeAIConfig,
  opts: AIChatOptions,
  isFallback: boolean
): Promise<{ response?: AIResponse; error?: AIProviderError; attempts: number }> {
  const maxAttempts = Math.max(1, Math.min(opts.maxAttempts ?? 1, 5));
  const base = opts.baseDelayMs ?? 500;
  const sleep = opts.sleep ?? ((ms: number) => new Promise((r) => setTimeout(r, ms)));
  const require = opts.require ?? ["text"];
  let last: AIProviderError | undefined;
  let attempts = 0;
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    attempts = attempt;
    const started = Date.now();
    try {
      // Budget is re-checked before EVERY paid attempt: a retry chain must not
      // keep spending after the platform has crossed its limit mid-request.
      const budgetModel = (await resolveProviderCredential(provider)).model;
      const verdict = await evaluateAiBudget(provider, budgetModel);
      if (!verdict.allowed) throw budgetError(provider, "scope" in verdict ? verdict.scope : verdict.reason);
      const response = await callOnce(provider, req, cfg, require);
      logAiRequest({
        task,
        provider,
        model: response.model,
        status: "ok",
        latencyMs: Date.now() - started,
        fallback: isFallback || Boolean(response.modelFallbackUsed),
        attempt,
        costStatus: response.costStatus,
      });
      return { response, attempts: attempt };
    } catch (err) {
      last = err instanceof AIProviderError
        ? err
        : new AIProviderError(provider, "unknown", redactSecrets(String((err as Error)?.message ?? err)).slice(0, 200));
      logAiRequest({ task, provider, model: "", status: "error", latencyMs: Date.now() - started, category: last.category, fallback: isFallback, attempt });
      if (!isTransientCategory(last.category) || attempt === maxAttempts) break;
      const exp = base * 2 ** (attempt - 1);
      await sleep(exp + Math.floor(Math.random() * exp * 0.5));
    }
  }
  return { error: last, attempts };
}

// ---------------------------------------------------------------------------
// Service entry
// ---------------------------------------------------------------------------

export type AIChatResult =
  | { ok: true; response: AIResponse; fallbackUsed: boolean; attempts: number }
  | { ok: false; error: AIProviderError; attempts: number };

export interface AIChatOptions {
  /** Capabilities the caller needs (default: ["text"]). */
  require?: AICapability[];
  /** Tries on the SAME provider for transient failures (default 1 = no retry). */
  maxAttempts?: number;
  baseDelayMs?: number;
  /** Injected sleeper for tests. */
  sleep?: (ms: number) => Promise<void>;
}

/**
 * Write exactly ONE usage row for this logical request — success or failure,
 * however many attempts it took. Best-effort: a storage error is logged and
 * never changes the reply the user gets.
 */
async function recordUsage(entry: {
  profileId: number | null;
  task: string;
  provider: string;
  model: string;
  response?: AIResponse;
  error?: AIProviderError;
  attempts: number;
  fallbackUsed: boolean;
}): Promise<void> {
  try {
    const r = entry.response;
    await logAIUsage({
      profileId: entry.profileId,
      taskType: entry.task,
      provider: entry.provider,
      model: entry.model,
      promptTokens: r?.promptTokens ?? 0,
      completionTokens: r?.completionTokens ?? 0,
      cachedPromptTokens: r?.cachedPromptTokens ?? 0,
      costEstimate: r?.costEstimate ?? 0,
      costStatus: r ? r.costStatus : "usage_unreported",
      attempts: entry.attempts,
      fallbackUsed: entry.fallbackUsed,
      status: r ? "success" : "error",
      errorCategory: entry.error ? entry.error.category : null,
    });
  } catch (err) {
    console.error("AI usage not recorded:", redactSecrets(String((err as Error)?.message ?? err)).slice(0, 160));
  }
}

/**
 * Chat completion with a structured result (used where the caller needs to
 * explain failures, e.g. the visa interview). Explicit fallback only.
 */
export async function aiChat(req: AIRequest, opts: AIChatOptions = {}): Promise<AIChatResult> {
  const task = req.taskType || "general";
  const profileId = req.profileId ?? null;
  const cfg = await loadRuntimeAIConfig(task);
  const primary = await resolveRuntimeProvider(task, cfg);
  const first = await callWithRetry(task, primary.name, req, cfg, opts, false);
  if (first.response) {
    const modelFallbackUsed = Boolean(first.response.modelFallbackUsed);
    await recordUsage({ profileId, task, provider: primary.name, model: first.response.model, response: first.response, attempts: first.attempts, fallbackUsed: modelFallbackUsed });
    return { ok: true, response: first.response, fallbackUsed: modelFallbackUsed, attempts: first.attempts };
  }

  const error = first.error ?? new AIProviderError(primary.name, "unknown", "AI request failed");
  // bad_request would most likely fail the same way elsewhere; budget_exhausted
  // must not be bypassed by another paid provider unless the admin chose one.
  // Everything else may go to the fallback — but only one the admin chose explicitly.
  let fb = cfg.fallback;
  const openRouterModelUnavailable = error.category === "payment_required" || error.category === "model_not_found";
  if (!fb && primary.name === "openrouter" && (isTransientCategory(error.category) || openRouterModelUnavailable) && !cfg.disabled.includes("groq")) {
    const groqCredential = await usableCredential("groq", cfg.disabled);
    if (groqCredential) fb = "groq";
  }
  let fallbackAttempts = 0;
  if (fb && fb !== primary.name && error.category !== "bad_request" && error.category !== "budget_exhausted") {
    const fallbackCredential = await usableCredential(fb, cfg.disabled);
    if (!fallbackCredential) fb = null;
  }
  if (fb && fb !== primary.name && error.category !== "bad_request" && error.category !== "budget_exhausted") {
    const second = await callWithRetry(task, fb, req, cfg, { ...opts, maxAttempts: 1 }, true);
    fallbackAttempts = second.attempts;
    if (second.response) {
      const labelled = { ...second.response, provider: `${second.response.provider}:fallback` };
      await recordUsage({
        profileId,
        task,
        provider: fb,
        model: second.response.model,
        response: second.response,
        attempts: first.attempts + second.attempts,
        fallbackUsed: true,
      });
      return { ok: true, response: labelled, fallbackUsed: true, attempts: first.attempts + second.attempts };
    }
  }
  // One failure row for the logical request; every attempt made (including the
  // fallback's) is counted, so retries never hide spend.
  const totalAttempts = first.attempts + fallbackAttempts;
  await recordUsage({
    profileId,
    task,
    provider: primary.name,
    model: primary.model ?? "",
    error,
    attempts: totalAttempts,
    fallbackUsed: false,
  });
  return { ok: false, error, attempts: totalAttempts };
}

/** Backward-compatible entry: the reply, or null when AI is unavailable. */
export async function aiGenerate(req: AIRequest): Promise<AIResponse | null> {
  try {
    const result = await aiChat(req);
    return result.ok ? result.response : null;
  } catch (err) {
    console.error("AI router error:", redactSecrets(String((err as Error)?.message ?? err)));
    return null;
  }
}

/** HTTP status an API route should use for a failed AI call. */
export function aiErrorStatus(error: AIProviderError): number {
  switch (error.category) {
    case "not_configured":
    case "disabled":
    case "unsupported_capability":
    case "budget_exhausted":
      return 503;
    case "rate_limited":
      return 429;
    default:
      return 502;
  }
}

/**
 * User-facing explanation of a failure — safe to return from an API route
 * (category-based, never includes keys, prompts or raw provider payloads).
 */
export function describeAiError(error: AIProviderError): string {
  const label = AI_PROVIDERS[error.provider as AIProviderId]?.label ?? error.provider;
  switch (error.category) {
    case "not_configured":
      return `The AI provider (${label}) is not configured. An administrator can add a key in Admin → AI.`;
    case "disabled":
      return `The AI provider (${label}) is disabled by the administrator.`;
    case "unsupported_capability":
      return `The selected AI provider (${label}) cannot handle this request.`;
    case "auth":
      return `The AI provider (${label}) rejected the API key. An administrator needs to update it.`;
    case "model_not_found":
      return `The configured ${label} model was not found — it may be deprecated. An administrator needs to pick a current model.`;
    case "payment_required":
      return `The configured ${label} model is no longer available under the current account terms. An administrator needs to review the model selection.`;
    case "rate_limited":
      return `The AI provider (${label}) is rate limiting requests. Please wait a moment and try again.`;
    case "timeout":
    case "network":
    case "provider_unavailable":
      return `The AI provider (${label}) is temporarily unavailable. Please try again in a moment.`;
    case "bad_request":
      return `The AI provider (${label}) rejected the request${error.message ? ` (${error.message})` : ""}.`;
    case "empty_response":
      return "The AI returned an empty reply. Please try again.";
    // Deliberately generic: no budget amounts, limits or billing details reach students.
    case "budget_exhausted":
      return "AI features are temporarily paused while the service is at capacity. Please try again later.";
    default:
      return "The AI request failed. Please try again.";
  }
}
