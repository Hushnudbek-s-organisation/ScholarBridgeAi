import { BodyLimitError, cancelBody, readBoundedBytes } from "./boundedBody";

/**
 * Request hardening helpers (security baseline).
 *
 * - `readJsonBody` caps the request body size, so an attacker cannot stream a
 *   huge payload into memory (a classic cheap DoS against `await req.json()`).
 * - Field clamps keep individual string/array inputs inside sane bounds, which
 *   protects the database, the UI and the AI prompt budget.
 */

/** Default JSON body cap: 256 KB. */
export const DEFAULT_JSON_BODY_LIMIT = 256 * 1024;

export class BodyTooLargeError extends Error {
  constructor(public readonly limit: number) {
    super(`Request body exceeds ${limit} bytes`);
    this.name = "BodyTooLargeError";
  }
}

export type ReadTextBodyResult =
  | { ok: true; body: string }
  | { ok: false; status: number; error: string; code: string };

/** Read a request body with a hard byte limit, independent of its media type. */
export async function readTextBody(req: Request, limitBytes = DEFAULT_JSON_BODY_LIMIT, timeoutMs = 30_000): Promise<ReadTextBodyResult> {
  const tooLarge = (): ReadTextBodyResult => ({ ok: false, status: 413, error: `Payload too large (limit ${limitBytes} bytes).`, code: "payload_too_large" });
  const declared = Number(req.headers.get("content-length") ?? "0");
  if (Number.isFinite(declared) && declared > limitBytes) { cancelBody(req.body); return tooLarge(); }
  const signal = AbortSignal.any([req.signal, AbortSignal.timeout(timeoutMs)]);
  try {
    const bytes = await readBoundedBytes(req.body, limitBytes, signal);
    return { ok: true, body: new TextDecoder().decode(bytes) };
  } catch (error) {
    if (error instanceof BodyLimitError) return tooLarge();
    if (signal.aborted && !req.signal.aborted) return { ok: false, status: 408, error: "Request body timed out", code: "request_timeout" };
    return { ok: false, status: 400, error: "Unable to read request body", code: "bad_body" };
  }
}

/**
 * Parse a JSON body with a hard size cap.
 * Returns `{ ok: true, body }` or `{ ok: false, error }` with the HTTP status
 * the caller should return.
 */
export async function readJsonBody<T = Record<string, unknown>>(
  req: Request,
  limitBytes: number = DEFAULT_JSON_BODY_LIMIT,
  options: { allowNonObject?: boolean; timeoutMs?: number } = {},
): Promise<
  | { ok: true; body: T }
  | { ok: false; status: number; error: string; code: string }
> {
  const read = await readTextBody(req, limitBytes, options.timeoutMs);
  if (!read.ok) {
    return read.code === "bad_body"
      ? { ok: false, status: 400, error: "Invalid JSON body", code: "bad_json" }
      : read;
  }
  const raw = read.body;
  if (!raw.trim()) {
    return { ok: false, status: 400, error: "Empty JSON body", code: "bad_json" };
  }

  try {
    const body: unknown = JSON.parse(raw);
    // All application payloads are object envelopes. JSON null/arrays/scalars
    // otherwise crash callers at body.email/id/etc despite valid JSON syntax.
    if (!options.allowNonObject && (body === null || typeof body !== "object" || Array.isArray(body))) {
      return { ok: false, status: 400, error: "JSON body must be an object", code: "bad_json" };
    }
    return { ok: true, body: body as T };
  } catch {
    return { ok: false, status: 400, error: "Invalid JSON body", code: "bad_json" };
  }
}

/** Clamp a string input: trim, collapse NULs, cap the length. */
export function clampString(value: unknown, max = 500, fallback = ""): string {
  if (typeof value !== "string") return fallback;
  const clean = value.replace(/\u0000/g, "").trim();
  return clean.length > max ? clean.slice(0, max) : clean;
}

/** Clamp an array input to at most `max` items. */
export function clampArray<T>(value: unknown, max = 50): T[] {
  return Array.isArray(value) ? value.slice(0, max) : [];
}

/** Clamp a user-supplied prompt/message (protects the AI token budget). */
export function clampPrompt(value: unknown, max = 8000): string {
  return clampString(value, max);
}

/** Positive integer or null. */
export function positiveInt(value: unknown): number | null {
  const n = Number(value);
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : null;
}

/**
 * Optional finite number for a PATCH/PUT field.
 *
 *   undefined          → undefined (field not sent: leave the column alone)
 *   null / ""          → null      (field cleared)
 *   finite number/str  → number, clamped to [min, max] when given
 *   anything else      → undefined (garbage is ignored, never stored)
 *
 * `Number("abc")` is NaN, and Postgres happily stores NaN in a `real`/`double`
 * column — which then poisons every average, sort and comparison downstream.
 * Every numeric body field must go through this (or `positiveInt`).
 */
export function optionalNumber(
  value: unknown,
  opts: { min?: number; max?: number; integer?: boolean } = {}
): number | null | undefined {
  if (value === undefined) return undefined;
  if (value === null || value === "") return null;
  if (typeof value !== "number" && typeof value !== "string") return undefined;
  let n = Number(value);
  if (!Number.isFinite(n)) return undefined;
  if (opts.integer) n = Math.round(n);
  if (opts.min !== undefined && n < opts.min) n = opts.min;
  if (opts.max !== undefined && n > opts.max) n = opts.max;
  return n;
}

/**
 * Test score semantics: a missing, zero or negative score means "not taken"
 * and is stored as NULL; garbage is ignored.
 */
export function optionalScore(
  value: unknown,
  max: number
): number | null | undefined {
  if (value === undefined) return undefined;
  if (value === null || value === "") return null;
  const n = optionalNumber(value, { max });
  if (n === undefined) return undefined;
  return n === null || n <= 0 ? null : n;
}
