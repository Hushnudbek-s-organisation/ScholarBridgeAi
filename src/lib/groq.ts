/**
 * Direct Groq client (server-side ONLY — never import from Client
 * Components). Powers the Visa Speaking Assistant interview + analysis.
 *
 * Groq exposes an OpenAI-compatible REST API, so this is a thin fetch
 * wrapper around `POST https://api.groq.com/openai/v1/chat/completions` —
 * no vendor SDK needed.
 *
 * Env:
 *   GROQ_API_KEY   — required (https://console.groq.com/keys, free tier works)
 *   GROQ_MODEL     — optional, defaults to "openai/gpt-oss-120b"
 *
 * NOTE: Groq deprecates/renames models over time. llama-3.3-70b-versatile
 * and llama-3.1-8b-instant were removed on 2026-08-16 (404). The replacement
 * is openai/gpt-oss-120b — a reasoning model, so reasoning tokens count
 * against max_tokens. Raise maxTokens and pass reasoningEffort "low" for
 * short dialogue, or the reply comes back empty. If requests 404 again, pick
 * a current id from https://console.groq.com/docs/models or
 * GET https://api.groq.com/openai/v1/models.
 *
 * Transient failures (429 / 5xx / transport blips) should be sent through
 * `withGroqRetry()` — exponential backoff is the remedy for rate-limit
 * errors (Groq's free tier has strict TPM/RPM quotas) and short outages.
 */

export const GROQ_API_URL = "https://api.groq.com/openai/v1/chat/completions";

export function getGroqApiKey(): string {
  return process.env.GROQ_API_KEY || "";
}

export function getGroqModelName(): string {
  return process.env.GROQ_MODEL || "openai/gpt-oss-120b";
}

export function isGroqConfigured(): boolean {
  return getGroqApiKey().length > 0;
}

export interface GroqChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface GroqChatOptions {
  messages: GroqChatMessage[];
  temperature?: number;
  maxTokens?: number;
  /**
   * Sets `response_format: { type: "json_object" }`. Groq requires the
   * word "JSON" to appear somewhere in the messages when this is on.
   */
  jsonMode?: boolean;
  /**
   * GPT-OSS reasoning effort (`reasoning_effort`). Only sent when set.
   * Reasoning tokens share the max_tokens budget — use "low" for short
   * dialogue so the visible reply is not starved.
   */
  reasoningEffort?: "low" | "medium" | "high";
  /** Defaults to getGroqModelName(). */
  model?: string;
}

export interface GroqChatResult {
  text: string;
  model: string;
  promptTokens: number;
  completionTokens: number;
}

/** HTTP error from the Groq REST API — carries the status for retry logic. */
export class GroqApiError extends Error {
  status?: number;

  constructor(message: string, status?: number) {
    super(message);
    this.name = "GroqApiError";
    if (status !== undefined) this.status = status;
  }
}

/**
 * One chat completion call. Throws GroqApiError on HTTP failures (status
 * attached) so callers can classify transient vs permanent errors.
 */
export async function groqChatComplete(
  options: GroqChatOptions,
): Promise<GroqChatResult> {
  const apiKey = getGroqApiKey();
  if (!apiKey) throw new GroqApiError("GROQ_API_KEY is not configured.");

  const model = options.model || getGroqModelName();
  const res = await fetch(GROQ_API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      messages: options.messages,
      temperature: options.temperature ?? 0.6,
      max_tokens: options.maxTokens ?? 1024,
      ...(options.jsonMode
        ? { response_format: { type: "json_object" } }
        : {}),
      ...(options.reasoningEffort
        ? { reasoning_effort: options.reasoningEffort }
        : {}),
    }),
  });

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    let detail = body;
    try {
      const parsed = JSON.parse(body) as { error?: { message?: string } };
      if (parsed?.error?.message) detail = parsed.error.message;
    } catch {
      // keep raw body
    }
    throw new GroqApiError(
      `Groq API error (${res.status}): ${detail.slice(0, 300)}`,
      res.status,
    );
  }

  const data = (await res.json()) as {
    choices?: { message?: { content?: string } }[];
    model?: string;
    usage?: { prompt_tokens?: number; completion_tokens?: number };
  };

  return {
    text: data?.choices?.[0]?.message?.content ?? "",
    model: data?.model || model,
    promptTokens: data?.usage?.prompt_tokens ?? 0,
    completionTokens: data?.usage?.completion_tokens ?? 0,
  };
}

/** HTTP statuses that are worth retrying (rate-limit + Groq-side faults). */
const TRANSIENT_HTTP_STATUS = new Set([429, 500, 502, 503, 504]);

/**
 * Transport / Node-fetch blips that have no HTTP status. Keep this list
 * tight — unknown errors fail fast so we don't mask programmer bugs.
 */
const TRANSIENT_TRANSPORT_RE =
  /fetch failed|failed to fetch|econnreset|econnrefused|etimedout|enotfound|eai_again|socket hang up|und_err_|networkerror|overloaded/i;

/** Groq API keys look like `gsk_…`. */
const GROQ_API_KEY_RE = /gsk_[0-9A-Za-z]{8,}/g;

/** Error payloads sometimes embed the request headers with a Bearer token. */
const BEARER_RE = /(Bearer\s+)[0-9A-Za-z._-]+/gi;

export const GROQ_RETRY_MAX_ATTEMPTS = 4;
export const GROQ_RETRY_BASE_DELAY_MS = 500;

export type GroqRetryOptions = {
  /** Total tries including the first. Default 4. */
  maxAttempts?: number;
  /** First backoff delay; doubles after each retry. Default 500ms. */
  baseDelayMs?: number;
  /** Injected sleeper — tests pass a no-op so they don't wait. */
  sleep?: (ms: number) => Promise<void>;
};

function groqStatus(err: unknown): number | null {
  const anyErr = err as { status?: unknown } | null;
  return anyErr && typeof anyErr.status === "number" ? anyErr.status : null;
}

function groqErrorText(err: unknown): string {
  const anyErr = err as {
    message?: unknown;
    code?: unknown;
    cause?: { message?: unknown; code?: unknown };
  } | null;
  const parts: string[] = [];
  if (anyErr && typeof anyErr.message === "string") parts.push(anyErr.message);
  if (anyErr && typeof anyErr.code === "string") parts.push(anyErr.code);
  if (anyErr?.cause && typeof anyErr.cause.message === "string") {
    parts.push(anyErr.cause.message);
  }
  if (anyErr?.cause && typeof anyErr.cause.code === "string") {
    parts.push(anyErr.cause.code);
  }
  return parts.join(" ");
}

/**
 * Strip key-shaped tokens so error payloads never leak credentials into
 * API responses or logs.
 */
export function redactGroqSecrets(text: string): string {
  return text
    .replace(GROQ_API_KEY_RE, "gsk_[REDACTED]")
    .replace(BEARER_RE, "$1[REDACTED]");
}

function sanitizeDetail(raw: string): string {
  const first = raw.split("\n")[0];
  const stripped = first.replace(/^Groq API error \(?\d+\)?:?\s*/i, "").trim();
  return redactGroqSecrets(stripped).slice(0, 280);
}

/**
 * True for Groq-side overload / rate-limit / gateway errors and for
 * low-level transport failures. 4xx (400/401/403/404) is NEVER transient.
 */
export function isTransientGroqError(err: unknown): boolean {
  const status = groqStatus(err);
  if (status !== null) return TRANSIENT_HTTP_STATUS.has(status);
  return TRANSIENT_TRANSPORT_RE.test(groqErrorText(err));
}

function defaultSleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Run `fn` up to 4 times with doubling delay + jitter on transient errors.
 *
 * Attempt 1 is immediate. After a transient failure the wait is
 * `baseDelayMs * 2^(attempt-1)` plus 0–50% jitter (so 500ms, 1s, 2s by
 * default). Non-transient errors (400/401/403/404 and anything else
 * unrecognized) fail on the first throw — no delay.
 */
export async function withGroqRetry<T>(
  fn: () => Promise<T>,
  options?: GroqRetryOptions,
): Promise<T> {
  const maxAttempts = options?.maxAttempts ?? GROQ_RETRY_MAX_ATTEMPTS;
  const baseDelayMs = options?.baseDelayMs ?? GROQ_RETRY_BASE_DELAY_MS;
  const sleep = options?.sleep ?? defaultSleep;

  let lastErr: unknown;
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (err) {
      lastErr = err;
      const canRetry =
        isTransientGroqError(err) && attempt < maxAttempts;
      if (!canRetry) throw err;
      const exp = baseDelayMs * 2 ** (attempt - 1);
      const jitter = Math.floor(Math.random() * exp * 0.5);
      const wait = exp + jitter;
      console.warn(
        `Groq transient failure (attempt ${attempt}/${maxAttempts}); retrying in ${wait}ms`,
      );
      await sleep(wait);
    }
  }
  throw lastErr;
}

/**
 * Turn a Groq API failure into an actionable, user-facing message (safe:
 * never contains the API key). Own thrown Errors (no HTTP status attached,
 * e.g. empty-reply guards) pass through untouched (still redacted if they
 * happen to contain key-shaped text).
 *
 * 429 includes Groq's own detail line so operators can tell the free-tier
 * TPM limit from a generic outage.
 */
export function describeGroqError(err: unknown, model: string): string {
  const anyErr = err as { status?: unknown; message?: unknown } | null;
  const status =
    anyErr && typeof anyErr.status === "number" ? anyErr.status : null;
  const raw =
    anyErr && typeof anyErr.message === "string" ? anyErr.message : "";
  // First line only, bounded — API messages can embed long JSON payloads.
  const detail = sanitizeDetail(raw);

  if (status === null) return detail || "Unknown Groq error.";

  if (status === 404) {
    return (
      `Groq model "${model}" was not found (404) — it is probably deprecated. ` +
      `Set GROQ_MODEL to a current model (e.g. openai/gpt-oss-120b).`
    );
  }
  if (status === 401) {
    return "Groq API key is invalid (401). Check GROQ_API_KEY on the server.";
  }
  if (status === 403) {
    return (
      `Groq refused access (403). Check that GROQ_API_KEY is valid and ` +
      `has access to this model.`
    );
  }
  if (status === 400) {
    return `Groq rejected the request (400)${detail ? `: ${detail}` : ""}`;
  }
  if (status === 413) {
    return "Groq request too large (413) — the conversation is too long. End the interview and start a shorter one.";
  }
  if (status === 429) {
    return `Groq rate limit reached (429). Wait a bit and try again.${detail ? ` (${detail})` : ""}`;
  }
  if (status >= 500) {
    return `Groq server error (${status})${detail ? `: ${detail}` : ". Please try again in a moment."}`;
  }
  return `Groq request failed (${status})${detail ? `: ${detail}` : ""}`;
}
