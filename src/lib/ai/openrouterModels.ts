import { resolveProviderCredential } from "@/lib/ai/credentials";
import { getStoredConfig } from "@/lib/config";
import { DISABLED_PROVIDERS_CONFIG_KEY, parseDisabledProviders } from "@/lib/ai/settings";
import { OPENROUTER_MODEL_IDS } from "@/lib/ai/openrouterModelIds";

export const OPENROUTER_MODELS = OPENROUTER_MODEL_IDS;

const API_V1 = "https://openrouter.ai/api/v1";
const DECISIONS_URL = "https://openrouter.ai/api/alpha/decisions";
const REQUEST_TIMEOUT_MS = 20_000;

export type DecisionQuestion = {
  type: "noul" | "choice" | "score";
  instructions: string;
  criteria?: Record<string, string | null> | string[];
};

export async function isProviderEnabled(provider: "openrouter" | "openai"): Promise<boolean> {
  const disabledRaw = await getStoredConfig(DISABLED_PROVIDERS_CONFIG_KEY).catch(() => null);
  return !parseDisabledProviders(disabledRaw).includes(provider);
}

export async function openRouterKey(): Promise<string | null> {
  if (!(await isProviderEnabled("openrouter"))) return null;
  const credential = await resolveProviderCredential("openrouter");
  return credential.apiKey || null;
}

export async function callOpenRouterDecision<T = Record<string, unknown>>(args: {
  model: string;
  state: unknown;
  questions: Record<string, DecisionQuestion>;
  apiKey?: string;
  timeoutMs?: number;
}): Promise<T> {
  const apiKey = args.apiKey ?? await openRouterKey();
  if (!apiKey) throw new Error("OpenRouter is not configured");
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), Math.max(250, Math.min(args.timeoutMs ?? REQUEST_TIMEOUT_MS, 30_000)));
  try {
    const response = await fetch(DECISIONS_URL, {
      method: "POST",
      signal: controller.signal,
      headers: { authorization: `Bearer ${apiKey}`, "content-type": "application/json" },
      body: JSON.stringify({ model: args.model, state: args.state, questions: args.questions }),
    });
    if (!response.ok) throw new Error(`OpenRouter decision request failed (${response.status})`);
    return await response.json() as T;
  } finally {
    clearTimeout(timer);
  }
}

export async function callOpenRouterEmbeddings(args: {
  model: string;
  input: unknown;
  apiKey?: string;
  timeoutMs?: number;
}): Promise<{ data: Array<{ embedding: number[]; index?: number; object?: string }>; model?: string }> {
  const apiKey = args.apiKey ?? await openRouterKey();
  if (!apiKey) throw new Error("OpenRouter is not configured");
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), Math.max(250, Math.min(args.timeoutMs ?? REQUEST_TIMEOUT_MS, 30_000)));
  try {
    const response = await fetch(`${API_V1}/embeddings`, {
      method: "POST",
      signal: controller.signal,
      headers: { authorization: `Bearer ${apiKey}`, "content-type": "application/json" },
      body: JSON.stringify({ model: args.model, input: args.input, encoding_format: "float" }),
    });
    if (!response.ok) throw new Error(`OpenRouter embedding request failed (${response.status})`);
    const result = await response.json() as { data?: Array<{ embedding?: number[]; index?: number; object?: string }>; model?: string };
    if (!Array.isArray(result.data) || result.data.some((row) => !Array.isArray(row.embedding))) {
      throw new Error("OpenRouter returned an invalid embedding response");
    }
    return { data: result.data as Array<{ embedding: number[]; index?: number; object?: string }>, model: result.model };
  } finally {
    clearTimeout(timer);
  }
}

export function openRouterErrorStatus(error: unknown): number {
  const message = error instanceof Error ? error.message : "";
  const match = message.match(/\((\d{3})\)$/);
  return match ? Number(match[1]) : 502;
}
