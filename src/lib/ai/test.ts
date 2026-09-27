/**
 * AI provider health check (admin panel "Test connection").
 *
 * Checks, in order, stopping at the first hard failure:
 *   1. key      — an authenticated request with the stored (or just typed)
 *                 key is accepted
 *   2. model    — the configured model is listed by the provider (skipped
 *                 when the provider does not list models)
 *   3. chat     — (deep only) a tiny real completion succeeds
 *   4. structured — (deep only, when the provider supports JSON mode) a JSON
 *                 object comes back and parses
 *
 * Everything runs server-side. The raw key is never returned; provider
 * payload snippets are redacted (known key + key-shaped tokens) before they
 * reach the response.
 */
import {
  AI_PROVIDERS,
  providerBaseUrl,
  redactSecrets,
  supportsCapability,
  type AIProviderId,
} from "./settings";
import { resolveProviderCredential } from "./credentials";

export interface HealthCheckStep {
  name: "key" | "model" | "chat" | "structured";
  status: "ok" | "failed" | "skipped";
  detail: string;
}

export interface ConnectionTestResult {
  ok: boolean;
  provider: AIProviderId;
  message: string;
  latencyMs: number;
  model?: string;
  checks?: HealthCheckStep[];
}

const TIMEOUT_MS = 10_000;

async function probe(url: string, init: RequestInit): Promise<{ status: number; body: string }> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(url, { ...init, signal: controller.signal });
    const body = await res.text();
    return { status: res.status, body };
  } finally {
    clearTimeout(timer);
  }
}

export function describeProbe(res: { status: number; body: string }, key?: string): string {
  if (res.status === 401 || res.status === 403) {
    return `HTTP ${res.status} — API key rejected (check the key)`;
  }
  if (res.status >= 200 && res.status < 300) {
    return `HTTP ${res.status} — connection OK`;
  }
  const snippet = redactSecrets(res.body.trim().replace(/\s+/g, " "), [key]).slice(0, 120);
  return `HTTP ${res.status}${snippet ? ` — ${snippet}` : ""}`;
}

function authHeaders(provider: AIProviderId, key: string): Record<string, string> {
  if (provider === "anthropic") return { "x-api-key": key, "anthropic-version": "2023-06-01" };
  return { Authorization: `Bearer ${key}` };
}

/** Model ids from an OpenAI/Anthropic-style list response (null = not listable). */
function listedModels(body: string): string[] | null {
  try {
    const data = JSON.parse(body) as { data?: { id?: string }[] };
    if (!Array.isArray(data?.data)) return null;
    return data.data.map((m) => String(m.id ?? "")).filter(Boolean);
  } catch {
    return null;
  }
}

/**
 * Test one provider. `apiKey` is optional — when omitted the stored DB key
 * (or env fallback) is used. `deep` also runs a tiny real completion.
 */
export async function testProviderConnection(
  provider: AIProviderId,
  apiKey?: string,
  opts: { deep?: boolean; model?: string } = {}
): Promise<ConnectionTestResult> {
  const started = Date.now();
  const meta = AI_PROVIDERS[provider];
  const checks: HealthCheckStep[] = [];
  const done = (ok: boolean, message: string, model?: string): ConnectionTestResult => ({
    ok,
    provider,
    message: redactSecrets(message, [key]),
    latencyMs: Date.now() - started,
    ...(model ? { model } : {}),
    checks,
  });

  const cred = await resolveProviderCredential(provider);
  let key = apiKey?.trim();
  if (!key) key = cred.apiKey;
  const model = opts.model?.trim() || cred.model;
  if (!key) return done(false, "No API key configured for this provider");

  if (meta.protocol === "live") {
    // Gemini Live has no REST chat — list models with the key (header auth).
    try {
      const res = await probe("https://generativelanguage.googleapis.com/v1beta/models", {
        method: "GET",
        headers: { "x-goog-api-key": key },
      });
      const ok = res.status >= 200 && res.status < 300;
      checks.push({ name: "key", status: ok ? "ok" : "failed", detail: describeProbe(res, key) });
      return done(ok, describeProbe(res, key), model);
    } catch (err) {
      return done(false, transportMessage(err));
    }
  }

  const base = providerBaseUrl(provider);
  if (!base) {
    return done(false, meta.baseUrlEnvVar ? `${meta.baseUrlEnvVar} is not set on the server` : "Provider base URL missing");
  }

  try {
    // 1 + 2: key + model availability via the models list.
    const listUrl = provider === "openrouter" ? `${base}/auth/key` : `${base}/models`;
    const res = await probe(listUrl, { method: "GET", headers: authHeaders(provider, key) });
    const keyOk = res.status >= 200 && res.status < 300;
    checks.push({ name: "key", status: keyOk ? "ok" : "failed", detail: describeProbe(res, key) });
    if (!keyOk) return done(false, describeProbe(res, key), model);

    const models = provider === "openrouter" ? null : listedModels(res.body);
    if (!model) {
      checks.push({ name: "model", status: "failed", detail: "No model configured" });
      return done(false, "API key OK, but no model is configured", model);
    }
    if (models && models.length) {
      const listed = models.includes(model) || models.includes(`models/${model}`);
      checks.push({ name: "model", status: listed ? "ok" : "failed", detail: listed ? `${model} is available` : `${model} is not offered by this key` });
      if (!listed) return done(false, `API key OK, but model "${model}" is not available`, model);
    } else {
      checks.push({ name: "model", status: "skipped", detail: "Provider does not list models for this key" });
    }

    if (!opts.deep) return done(true, describeProbe(res, key), model);

    // 3: tiny real completion through the SAME adapter the app uses.
    const { PROVIDERS } = await import("./index");
    const adapter = PROVIDERS[provider as keyof typeof PROVIDERS];
    try {
      const reply = await adapter.call({ prompt: "Reply with the single word OK.", maxTokens: 256, temperature: 0 }, { apiKey: key, model });
      const ok = Boolean(reply?.text.trim());
      checks.push({ name: "chat", status: ok ? "ok" : "failed", detail: ok ? "Completion received" : "Empty completion" });
      if (!ok) return done(false, "Chat request returned an empty reply", model);
    } catch (err) {
      const detail = redactSecrets(String((err as Error)?.message ?? err), [key]).slice(0, 160);
      checks.push({ name: "chat", status: "failed", detail });
      return done(false, `Chat request failed: ${detail}`, model);
    }

    // 4: structured output, only where the provider supports JSON mode.
    if (!supportsCapability(provider, "structured")) {
      checks.push({ name: "structured", status: "skipped", detail: "Provider has no JSON response mode" });
      return done(true, "Key, model and chat OK", model);
    }
    try {
      const reply = await adapter.call(
        { prompt: 'Return the JSON object {"ok": true} and nothing else.', maxTokens: 256, temperature: 0, jsonMode: true },
        { apiKey: key, model }
      );
      const parsed = JSON.parse(String(reply?.text ?? "").trim().replace(/^```(?:json)?\s*|\s*```$/g, "")) as { ok?: unknown };
      const ok = parsed?.ok === true;
      checks.push({ name: "structured", status: ok ? "ok" : "failed", detail: ok ? "JSON object parsed" : "Unexpected JSON" });
      return done(ok, ok ? "Key, model, chat and structured output OK" : "Structured output check failed", model);
    } catch (err) {
      const detail = redactSecrets(String((err as Error)?.message ?? err), [key]).slice(0, 160);
      checks.push({ name: "structured", status: "failed", detail });
      return done(false, `Structured output failed: ${detail}`, model);
    }
  } catch (err) {
    return done(false, transportMessage(err), model);
  }
}

function transportMessage(err: unknown): string {
  return err instanceof Error && err.name === "AbortError"
    ? `Timeout after ${TIMEOUT_MS / 1000}s`
    : `Request failed: ${err instanceof Error ? err.message : String(err)}`;
}

/** Default model labels used in the UI hint. */
export function providerLabel(provider: AIProviderId): string {
  return AI_PROVIDERS[provider].label;
}
