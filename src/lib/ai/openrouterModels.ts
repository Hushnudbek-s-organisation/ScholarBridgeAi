import { fetchBoundedResponse } from "@/lib/boundedBody";
import { resolveProviderCredential } from "@/lib/ai/credentials";
import { getStoredConfig } from "@/lib/config";
import { DISABLED_PROVIDERS_CONFIG_KEY, parseDisabledProviders } from "@/lib/ai/settings";
import { OPENROUTER_MODEL_IDS } from "@/lib/ai/openrouterModelIds";

export const OPENROUTER_MODELS = OPENROUTER_MODEL_IDS;

const API_V1 = "https://openrouter.ai/api/v1";
const DECISIONS_URL = "https://openrouter.ai/api/alpha/decisions";
const REQUEST_TIMEOUT_MS = 20_000;
const MAX_SPECIALIZED_RESPONSE_BYTES = 2 * 1024 * 1024;
const OPENROUTER_MODEL_ID_RE = /^[A-Za-z0-9._:/@+-]{1,200}$/;

/** Metadata-only telemetry for specialized OpenRouter paths (never state, text, image, or key). */
function logSpecializedRequest(task: string, model: string, startedAt: number, status: "ok" | "error", category?: string): void {
  const entry = {
    evt: "ai_request",
    task,
    provider: "openrouter",
    model,
    status,
    latencyMs: Date.now() - startedAt,
    costStatus: "usage_unreported",
    ...(category ? { category } : {}),
  };
  if (status === "ok") console.info(JSON.stringify(entry));
  else console.warn(JSON.stringify(entry));
}

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
  taskType?: string;
}): Promise<T> {
  const startedAt = Date.now();
  const task = args.taskType ?? "openrouter_decisions";
  if (!OPENROUTER_MODEL_ID_RE.test(args.model)) {
    logSpecializedRequest(task, "invalid_model", startedAt, "error", "configuration");
    throw new Error("Invalid OpenRouter model identifier");
  }
  const apiKey = args.apiKey ?? await openRouterKey();
  if (!apiKey) {
    logSpecializedRequest(task, args.model, startedAt, "error", "not_configured");
    throw new Error("OpenRouter is not configured");
  }
  const timeout = Number.isFinite(args.timeoutMs) && args.timeoutMs! > 0 ? Math.max(250, Math.min(args.timeoutMs!, 30_000)) : REQUEST_TIMEOUT_MS;
  try {
    const response = await fetchBoundedResponse(DECISIONS_URL, {
      method: "POST",
      headers: { authorization: `Bearer ${apiKey}`, "content-type": "application/json" },
      body: JSON.stringify({ model: args.model, state: args.state, questions: args.questions }),
    }, timeout, MAX_SPECIALIZED_RESPONSE_BYTES);
    if (!response.ok) throw new Error(`OpenRouter decision request failed (${response.status})`);
    const result = await response.json() as T;
    logSpecializedRequest(task, args.model, startedAt, "ok");
    return result;
  } catch (error) {
    const category = ["AbortError", "TimeoutError"].includes((error as Error)?.name) ? "timeout" : "provider_error";
    logSpecializedRequest(task, args.model, startedAt, "error", category);
    throw error;
  }
}

export async function callOpenRouterEmbeddings(args: {
  model: string;
  input: unknown;
  apiKey?: string;
  timeoutMs?: number;
  taskType?: string;
}): Promise<{ data: Array<{ embedding: number[]; index?: number; object?: string }>; model?: string }> {
  const startedAt = Date.now();
  const task = args.taskType ?? "openrouter_embeddings";
  if (!OPENROUTER_MODEL_ID_RE.test(args.model)) {
    logSpecializedRequest(task, "invalid_model", startedAt, "error", "configuration");
    throw new Error("Invalid OpenRouter model identifier");
  }
  const apiKey = args.apiKey ?? await openRouterKey();
  if (!apiKey) {
    logSpecializedRequest(task, args.model, startedAt, "error", "not_configured");
    throw new Error("OpenRouter is not configured");
  }
  const timeout = Number.isFinite(args.timeoutMs) && args.timeoutMs! > 0 ? Math.max(250, Math.min(args.timeoutMs!, 30_000)) : REQUEST_TIMEOUT_MS;
  try {
    const response = await fetchBoundedResponse(`${API_V1}/embeddings`, {
      method: "POST",
      headers: { authorization: `Bearer ${apiKey}`, "content-type": "application/json" },
      body: JSON.stringify({ model: args.model, input: args.input, encoding_format: "float" }),
    }, timeout, MAX_SPECIALIZED_RESPONSE_BYTES);
    if (!response.ok) throw new Error(`OpenRouter embedding request failed (${response.status})`);
    const result = await response.json() as { data?: Array<{ embedding?: number[]; index?: number; object?: string }>; model?: string };
    if (!result || !Array.isArray(result.data) || result.data.length > 64 || result.data.some((row) =>
      !row || !Array.isArray(row.embedding) || row.embedding.length < 1 || row.embedding.length > 8_192 ||
      row.embedding.some((value) => !Number.isFinite(value))
    )) {
      throw new Error("OpenRouter returned an invalid embedding response");
    }
    logSpecializedRequest(task, result.model || args.model, startedAt, "ok");
    return { data: result.data as Array<{ embedding: number[]; index?: number; object?: string }>, model: result.model };
  } catch (error) {
    const category = ["AbortError", "TimeoutError"].includes((error as Error)?.name) ? "timeout" : "provider_error";
    logSpecializedRequest(task, args.model, startedAt, "error", category);
    throw error;
  }
}

export function openRouterErrorStatus(error: unknown): number {
  const message = error instanceof Error ? error.message : "";
  const match = message.match(/\((\d{3})\)$/);
  return match ? Number(match[1]) : 502;
}
