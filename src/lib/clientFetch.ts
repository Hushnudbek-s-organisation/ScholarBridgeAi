/**
 * Browser-side reads with a finite deadline, cancellation and honest states.
 *
 * The old pattern in several panels was:
 *
 *   fetch(url).then(r => r.ok ? r.json() : { applications: [] }).catch(() => {})
 *
 * which turned a 401, a 429, a 500, an offline device and a timed-out database
 * into "the student has no applications". It also had no deadline, so a hung
 * request kept a skeleton on screen forever. This module separates the states
 * instead. An error is ALWAYS thrown; the caller decides what to render.
 *
 * Pure enough to unit-test with a mocked global `fetch` — no DOM access at
 * import time, no framework imports.
 */

export type RequestFailureKind =
  | "offline"
  | "timeout"
  | "cancelled"
  | "unauthorized"
  | "forbidden"
  | "rate_limited"
  | "server_error"
  | "bad_response"
  | "network";

/** Stable keys a UI can translate into uz/ru/en copy. */
export type RequestStateKey =
  | "loading"
  | "success"
  | "empty"
  | RequestFailureKind;

export class ClientRequestError extends Error {
  readonly kind: RequestFailureKind;
  readonly status: number | null;
  readonly retryAfterMs: number | null;

  constructor(kind: RequestFailureKind, message: string, status: number | null = null, retryAfterMs: number | null = null) {
    super(message);
    this.name = "ClientRequestError";
    this.kind = kind;
    this.status = status;
    this.retryAfterMs = retryAfterMs;
  }
}

/** HTTP status → a state the UI can name, instead of one generic "error". */
export function classifyHttpStatus(status: number): RequestFailureKind {
  if (status === 401) return "unauthorized";
  if (status === 403) return "forbidden";
  if (status === 429) return "rate_limited";
  if (status >= 500) return "server_error";
  return "bad_response";
}

function retryAfterMs(response: Response): number | null {
  const raw = response.headers?.get?.("retry-after");
  if (!raw) return null;
  const seconds = Number(raw);
  if (Number.isFinite(seconds) && seconds >= 0) return Math.min(60_000, seconds * 1000);
  const date = Date.parse(raw);
  return Number.isFinite(date) ? Math.min(60_000, Math.max(0, date - Date.now())) : null;
}

function safeErrorText(json: unknown): string | null {
  if (!json || typeof json !== "object") return null;
  const value = (json as { error?: unknown }).error;
  return typeof value === "string" && value.trim() ? value.slice(0, 300) : null;
}

export interface FetchJsonOptions {
  /** Total deadline, including body read. Default 12 s (slow mobile networks). */
  timeoutMs?: number;
  /** Caller-owned abort (component unmount, profile switch, newer request). */
  signal?: AbortSignal | null;
  /** Never cached: a failed read must not be replayed as a success. */
  init?: RequestInit;
  fallbackMessage?: string;
}

/**
 * `fetch` + JSON with a finite deadline. Throws `ClientRequestError` on every
 * failure state; never substitutes `[]`, `{}` or sample data for an error.
 */
export async function fetchJsonWithTimeout<T>(url: string, options: FetchJsonOptions = {}): Promise<T> {
  const timeoutMs = Number.isFinite(options.timeoutMs) && (options.timeoutMs ?? 0) > 0
    ? Math.min(60_000, Math.max(500, Math.floor(options.timeoutMs!)))
    : 12_000;

  if (typeof navigator !== "undefined" && navigator.onLine === false) {
    throw new ClientRequestError("offline", "The device is offline.");
  }
  if (options.signal?.aborted) {
    throw new ClientRequestError("cancelled", "The request was cancelled.");
  }

  const controller = new AbortController();
  let timedOut = false;
  const timer = setTimeout(() => {
    timedOut = true;
    controller.abort();
  }, timeoutMs);
  const onExternalAbort = () => controller.abort();
  options.signal?.addEventListener("abort", onExternalAbort, { once: true });

  try {
    const response = await fetch(url, {
      ...(options.init ?? {}),
      cache: "no-store",
      signal: controller.signal,
    });
    const json: unknown = await response.json().catch(() => null);
    if (!response.ok) {
      throw new ClientRequestError(
        classifyHttpStatus(response.status),
        safeErrorText(json) || options.fallbackMessage || `Request failed (${response.status}).`,
        response.status,
        retryAfterMs(response),
      );
    }
    // A 200 with an unparseable body is not a success either.
    if (json === null || typeof json !== "object") {
      throw new ClientRequestError("bad_response", options.fallbackMessage || "The server returned an unreadable response.");
    }
    return json as T;
  } catch (error) {
    if (error instanceof ClientRequestError) throw error;
    if (timedOut) throw new ClientRequestError("timeout", "The request took too long. Check your connection and try again.");
    if (controller.signal.aborted || (error instanceof Error && error.name === "AbortError")) {
      throw new ClientRequestError("cancelled", "The request was cancelled.");
    }
    if (typeof navigator !== "undefined" && navigator.onLine === false) {
      throw new ClientRequestError("offline", "The device is offline.");
    }
    throw new ClientRequestError(
      "network",
      error instanceof Error ? error.message.slice(0, 300) : options.fallbackMessage || "Network request failed.",
    );
  } finally {
    clearTimeout(timer);
    options.signal?.removeEventListener("abort", onExternalAbort);
  }
}

/** True when a chunk/import failure should be retried in place (not reloaded blindly). */
export function isChunkLoadError(error: unknown): boolean {
  if (!(error instanceof Error)) return false;
  if (error.name === "ChunkLoadError") return true;
  return /loading (?:css )?chunk|failed to (?:load|fetch) (?:css )?chunk|chunkloaderror|loading chunk \d+ failed/i.test(error.message);
}
