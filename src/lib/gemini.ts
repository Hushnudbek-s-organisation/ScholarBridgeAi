import { GoogleGenerativeAI, type GenerativeModel } from "@google/generative-ai";

/**
 * Direct Google Gemini client (server-side ONLY — never import from Client
 * Components). Powers the Visa Speaking Assistant interview + analysis.
 *
 * Env:
 *   GEMINI_API_KEY   — required (Google AI Studio key, free tier works)
 *   GEMINI_MODEL     — optional, defaults to "gemini-3.8-flash"
 *
 * NOTE (Sep 2026): the 1.x and 2.0 model families are shut down by Google
 * (all requests return 404). Do NOT default back to gemini-1.5-flash.
 *
 * Transient failures (429 / 5xx / transport blips) should be sent through
 * `withGeminiRetry()` — Google documents exponential backoff as the remedy
 * for 503 "model overloaded" and similar temporary outages.
 */

export function getGeminiApiKey(): string {
  return process.env.GEMINI_API_KEY || "";
}

export function getGeminiModelName(): string {
  return process.env.GEMINI_MODEL || "gemini-3.8-flash";
}

export function isGeminiConfigured(): boolean {
  return getGeminiApiKey().length > 0;
}

export function createGeminiModel(
  systemInstruction?: string,
): GenerativeModel | null {
  const key = getGeminiApiKey();
  if (!key) return null;
  const genAI = new GoogleGenerativeAI(key);
  return genAI.getGenerativeModel({
    model: getGeminiModelName(),
    ...(systemInstruction ? { systemInstruction } : {}),
  });
}

/** HTTP statuses that are worth retrying (rate-limit + Google-side faults). */
const TRANSIENT_HTTP_STATUS = new Set([429, 500, 502, 503, 504]);

/**
 * Transport / Node-fetch blips that have no HTTP status. Keep this list
 * tight — unknown errors fail fast so we don't mask programmer bugs.
 */
const TRANSIENT_TRANSPORT_RE =
  /fetch failed|failed to fetch|econnreset|econnrefused|etimedout|enotfound|eai_again|socket hang up|und_err_|networkerror/i;

/** Google AI Studio keys look like `AIza…`. */
const GOOGLE_API_KEY_RE = /AIza[0-9A-Za-z_-]{8,}/g;

/** SDK messages sometimes embed the request URL with `?key=` / `&key=`. */
const QUERY_KEY_RE = /([?&]key=)[^&\s"'`]+/gi;

export const GEMINI_RETRY_MAX_ATTEMPTS = 4;
export const GEMINI_RETRY_BASE_DELAY_MS = 500;

export type GeminiRetryOptions = {
  /** Total tries including the first. Default 4. */
  maxAttempts?: number;
  /** First backoff delay; doubles after each retry. Default 500ms. */
  baseDelayMs?: number;
  /** Injected sleeper — tests pass a no-op so they don't wait. */
  sleep?: (ms: number) => Promise<void>;
};

function geminiStatus(err: unknown): number | null {
  const anyErr = err as { status?: unknown } | null;
  return anyErr && typeof anyErr.status === "number" ? anyErr.status : null;
}

function geminiErrorText(err: unknown): string {
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
 * Strip key-shaped tokens so SDK error payloads never leak credentials
 * into API responses or logs.
 */
export function redactGeminiSecrets(text: string): string {
  return text
    .replace(GOOGLE_API_KEY_RE, "AIza[REDACTED]")
    .replace(QUERY_KEY_RE, "$1[REDACTED]");
}

function sanitizeDetail(raw: string): string {
  const first = raw.split("\n")[0];
  const stripped = first
    .replace(/\[GoogleGenerativeAI Error\]:?\s*/i, "")
    .trim();
  return redactGeminiSecrets(stripped).slice(0, 280);
}

/**
 * True for Google-side overload / rate-limit / gateway errors and for
 * low-level transport failures. 4xx (400/401/403/404) is NEVER transient.
 */
export function isTransientGeminiError(err: unknown): boolean {
  const status = geminiStatus(err);
  if (status !== null) return TRANSIENT_HTTP_STATUS.has(status);
  return TRANSIENT_TRANSPORT_RE.test(geminiErrorText(err));
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
 *
 * Google's documented remedy for 503 "The model is overloaded" is exactly
 * this: retry with exponential backoff rather than failing the user on
 * the first blip.
 */
export async function withGeminiRetry<T>(
  fn: () => Promise<T>,
  options?: GeminiRetryOptions,
): Promise<T> {
  const maxAttempts = options?.maxAttempts ?? GEMINI_RETRY_MAX_ATTEMPTS;
  const baseDelayMs = options?.baseDelayMs ?? GEMINI_RETRY_BASE_DELAY_MS;
  const sleep = options?.sleep ?? defaultSleep;

  let lastErr: unknown;
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (err) {
      lastErr = err;
      const canRetry =
        isTransientGeminiError(err) && attempt < maxAttempts;
      if (!canRetry) throw err;
      const exp = baseDelayMs * 2 ** (attempt - 1);
      const jitter = Math.floor(Math.random() * exp * 0.5);
      const wait = exp + jitter;
      console.warn(
        `Gemini transient failure (attempt ${attempt}/${maxAttempts}); retrying in ${wait}ms`,
      );
      await sleep(wait);
    }
  }
  throw lastErr;
}

/**
 * Turn a GoogleGenerativeAI SDK failure into an actionable, user-facing
 * message (safe: never contains the API key). Own thrown Errors (no HTTP
 * status attached, e.g. empty-reply guards) pass through untouched
 * (still redacted if they happen to contain key-shaped text).
 *
 * 5xx messages include Google's own detail line so operators can tell
 * "overloaded" from a generic outage.
 */
export function describeGeminiError(err: unknown, model: string): string {
  const anyErr = err as { status?: unknown; message?: unknown } | null;
  const status =
    anyErr && typeof anyErr.status === "number" ? anyErr.status : null;
  const raw =
    anyErr && typeof anyErr.message === "string" ? anyErr.message : "";
  // First line only, bounded — SDK messages can embed long JSON payloads.
  const detail = sanitizeDetail(raw);

  if (status === null) return detail || "Unknown Gemini error.";

  if (status === 404) {
    return (
      `Gemini model "${model}" was not found (404) — it is probably retired. ` +
      `Set GEMINI_MODEL to a current model (e.g. gemini-3.8-flash).`
    );
  }
  if (status === 400 && /API_KEY_INVALID/i.test(raw)) {
    return "Gemini API key is invalid (400). Check GEMINI_API_KEY on the server.";
  }
  if (status === 400) {
    return `Gemini rejected the request (400)${detail ? `: ${detail}` : ""}`;
  }
  if (status === 401 || status === 403) {
    return (
      `Gemini refused access (${status}). Check that GEMINI_API_KEY is valid ` +
      `and the Generative Language API is enabled for it.`
    );
  }
  if (status === 429) {
    return "Gemini quota/rate limit reached (429). Wait a bit and try again.";
  }
  if (status >= 500) {
    return `Gemini server error (${status})${detail ? `: ${detail}` : ". Please try again in a moment."}`;
  }
  return `Gemini request failed (${status})${detail ? `: ${detail}` : ""}`;
}
