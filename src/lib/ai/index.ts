/**
 * AI provider abstraction (spec §12, §13, §15).
 *
 * Each provider adapter implements the same interface. The router picks a
 * provider per TASK with this priority:
 *   1. admin panel (app_config: ai_provider_<task>, ai_default_provider)
 *   2. environment: AI_PROVIDER_ADMISSIONS | AI_PROVIDER_ESSAY |
 *      AI_PROVIDER_GENERAL | AI_PROVIDER_SEARCH | AI_PROVIDER_DOCUMENT_ANALYSIS
 *   3. default "openrouter"
 * API keys resolve the same way: admin panel credential (encrypted in DB) →
 * env (OPENROUTER_API_KEY | OPENAI_API_KEY | ANTHROPIC_API_KEY | GEMINI_API_KEY).
 *
 * All API keys stay server-side. No provider-specific logic in the frontend.
 */
import {
  DEFAULT_PROVIDER_CONFIG_KEY,
  resolveCredential,
  resolveProviderForTask,
  taskProviderConfigKey,
} from "./settings";
import { getConfig } from "@/lib/config";
import { resolveProviderCredential } from "./credentials";

export { TASK_PROVIDER_ENV } from "./settings";
export type { AIProviderId, AITaskId, PublicCredential, ResolvedCredential } from "./settings";

export interface AIProviderConfig {
  apiKey?: string;
  model?: string;
}

export interface AIRequest {
  prompt: string;
  systemInstruction?: string;
  taskType?: string;
  temperature?: number;
  maxTokens?: number;
}

export interface AIResponse {
  text: string;
  provider: string;
  model: string;
  promptTokens: number;
  completionTokens: number;
  costEstimate: number;
}

export type AIProviderName = "openai" | "anthropic" | "gemini" | "openrouter";

export interface AIProviderAdapter {
  name: AIProviderName;
  /** Return null if the provider is not configured (no key). */
  call(req: AIRequest, config: AIProviderConfig): Promise<AIResponse | null>;
}

// ---------------------------------------------------------------------------
// Provider adapters
// ---------------------------------------------------------------------------

const openrouter: AIProviderAdapter = {
  name: "openrouter",
  async call(req, cfg) {
    if (!cfg.apiKey) return null;
    const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${cfg.apiKey}`,
        "HTTP-Referer": process.env.NEXT_PUBLIC_APP_URL || "https://scholarbridgeai-1.onrender.com",
        "X-Title": "ScholarBridge",
      },
      body: JSON.stringify({
        model: cfg.model || "google/gemini-2.5-flash",
        messages: [
          ...(req.systemInstruction ? [{ role: "system", content: req.systemInstruction }] : []),
          { role: "user", content: req.prompt },
        ],
        temperature: req.temperature ?? 0.6,
        max_tokens: req.maxTokens ?? 4096,
      }),
    });
    if (!res.ok) {
      console.warn("OpenRouter error:", res.status, await res.text());
      return null;
    }
    const data = await res.json();
    return {
      text: data?.choices?.[0]?.message?.content ?? "",
      provider: "openrouter",
      model: data?.model || cfg.model || "unknown",
      promptTokens: data?.usage?.prompt_tokens ?? 0,
      completionTokens: data?.usage?.completion_tokens ?? 0,
      costEstimate: 0,
    };
  },
};

const openai: AIProviderAdapter = {
  name: "openai",
  async call(req, cfg) {
    if (!cfg.apiKey) return null;
    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${cfg.apiKey}`,
      },
      body: JSON.stringify({
        model: cfg.model || "gpt-4o-mini",
        messages: [
          ...(req.systemInstruction ? [{ role: "system", content: req.systemInstruction }] : []),
          { role: "user", content: req.prompt },
        ],
        temperature: req.temperature ?? 0.6,
        max_tokens: req.maxTokens ?? 4096,
      }),
    });
    if (!res.ok) {
      console.warn("OpenAI error:", res.status, await res.text());
      return null;
    }
    const data = await res.json();
    return {
      text: data?.choices?.[0]?.message?.content ?? "",
      provider: "openai",
      model: data?.model || cfg.model || "unknown",
      promptTokens: data?.usage?.prompt_tokens ?? 0,
      completionTokens: data?.usage?.completion_tokens ?? 0,
      costEstimate: 0,
    };
  },
};

const anthropic: AIProviderAdapter = {
  name: "anthropic",
  async call(req, cfg) {
    if (!cfg.apiKey) return null;
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": cfg.apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: cfg.model || "claude-3-5-sonnet-latest",
        max_tokens: req.maxTokens ?? 4096,
        system: req.systemInstruction,
        messages: [{ role: "user", content: req.prompt }],
      }),
    });
    if (!res.ok) {
      console.warn("Anthropic error:", res.status, await res.text());
      return null;
    }
    const data = await res.json();
    return {
      text: data?.content?.map((b: { text?: string }) => b.text ?? "").join("") ?? "",
      provider: "anthropic",
      model: data?.model || cfg.model || "unknown",
      promptTokens: data?.usage?.input_tokens ?? 0,
      completionTokens: data?.usage?.output_tokens ?? 0,
      costEstimate: 0,
    };
  },
};

const gemini: AIProviderAdapter = {
  name: "gemini",
  async call(req, cfg) {
    if (!cfg.apiKey) return null;
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${cfg.model || "gemini-2.5-flash"}:generateContent?key=${cfg.apiKey}`;
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ role: "user", parts: [{ text: req.prompt }] }],
        systemInstruction: req.systemInstruction
          ? { parts: [{ text: req.systemInstruction }] }
          : undefined,
        generationConfig: {
          temperature: req.temperature ?? 0.6,
          maxOutputTokens: req.maxTokens ?? 4096,
        },
      }),
    });
    if (!res.ok) {
      console.warn("Gemini error:", res.status, await res.text());
      return null;
    }
    const data = await res.json();
    return {
      text: data?.candidates?.[0]?.content?.parts?.[0]?.text ?? "",
      provider: "gemini",
      model: cfg.model || "gemini-2.5-flash",
      promptTokens: 0,
      completionTokens: 0,
      costEstimate: 0,
    };
  },
};

export const PROVIDERS: Record<AIProviderName, AIProviderAdapter> = {
  openrouter,
  openai,
  anthropic,
  gemini,
};

// ---------------------------------------------------------------------------
// Task → provider mapping (spec §12)
// ---------------------------------------------------------------------------

export function providerForTask(taskType: string): { name: AIProviderName; apiKey?: string; model?: string } {
  const name = resolveProviderForTask(taskType, {}, process.env);
  const cfg = resolveCredential(name, null, process.env);
  return { name, apiKey: cfg.apiKey, model: cfg.model };
}

/**
 * Runtime provider resolution for one task — priority:
 *   1. admin panel (app_config `ai_provider_<task>`, `ai_default_provider`)
 *   2. env (AI_PROVIDER_<TASK>, AI_PROVIDER_DEFAULT)
 *   3. default "openrouter"
 * API key + model come from the provider's credential (DB → env).
 */
export async function resolveRuntimeProvider(
  taskType: string
): Promise<{ name: AIProviderName; apiKey?: string; apiKeySource: "db" | "env" | "none"; model?: string }> {
  const dbProviders: Record<string, string> = {};
  try {
    const defaultProvider = await getConfig("ai_default_provider");
    if (defaultProvider) dbProviders[DEFAULT_PROVIDER_CONFIG_KEY] = defaultProvider;
    const taskProvider = await getConfig(taskProviderConfigKey(taskType));
    if (taskProvider) dbProviders[taskProviderConfigKey(taskType)] = taskProvider;
  } catch {
    // DB unavailable — env/default only, the app keeps working.
  }

  const name = resolveProviderForTask(taskType, dbProviders, process.env);
  const cfg = await resolveProviderCredential(name);
  return { name, apiKey: cfg.apiKey, apiKeySource: cfg.apiKeySource, model: cfg.model };
}

/**
 * Whether the task's resolved provider has a usable API key (DB or env).
 * Used by callers that want a cheap gate before invoking AI.
 */
export async function isAiConfigured(taskType: string): Promise<boolean> {
  const runtime = await resolveRuntimeProvider(taskType);
  return Boolean(runtime.apiKey);
}

// ---------------------------------------------------------------------------
// Service entry (spec §13)
// ---------------------------------------------------------------------------

export async function aiGenerate(req: AIRequest): Promise<AIResponse | null> {
  const taskType = req.taskType || "general";
  const providerCfg = await resolveRuntimeProvider(taskType);
  const adapter = PROVIDERS[providerCfg.name];

  try {
    const response = await adapter.call(req, {
      apiKey: providerCfg.apiKey,
      model: providerCfg.model,
    });
    if (response) return response;

    // Provider fallback (spec §16): try openrouter if it isn't the primary.
    if (providerCfg.name !== "openrouter") {
      const fbCred = await resolveProviderCredential("openrouter");
      if (fbCred.apiKey) {
        const fb = await PROVIDERS.openrouter.call(req, {
          apiKey: fbCred.apiKey,
          model: fbCred.model,
        });
        if (fb) return { ...fb, provider: `${fb.provider}:fallback` };
      }
    }
    return null;
  } catch (err) {
    console.error(`AI provider ${providerCfg.name} error:`, err);
    return null;
  }
}
