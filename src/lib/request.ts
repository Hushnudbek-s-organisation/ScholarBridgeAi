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

/**
 * Parse a JSON body with a hard size cap.
 * Returns `{ ok: true, body }` or `{ ok: false, error }` with the HTTP status
 * the caller should return.
 */
export async function readJsonBody<T = Record<string, unknown>>(
  req: Request,
  limitBytes: number = DEFAULT_JSON_BODY_LIMIT
): Promise<
  | { ok: true; body: T }
  | { ok: false; status: number; error: string; code: string }
> {
  const declared = Number(req.headers.get("content-length") ?? "0");
  if (Number.isFinite(declared) && declared > limitBytes) {
    return {
      ok: false,
      status: 413,
      error: `Payload too large (limit ${limitBytes} bytes).`,
      code: "payload_too_large",
    };
  }

  // `content-length` can be absent (chunked) — enforce the cap while reading.
  let raw: string;
  try {
    const reader = req.body?.getReader();
    if (!reader) {
      raw = await req.text();
      if (raw.length > limitBytes) throw new BodyTooLargeError(limitBytes);
    } else {
      const chunks: Uint8Array[] = [];
      let total = 0;
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        if (value) {
          total += value.byteLength;
          if (total > limitBytes) {
            await reader.cancel().catch(() => {});
            throw new BodyTooLargeError(limitBytes);
          }
          chunks.push(value);
        }
      }
      raw = Buffer.concat(chunks).toString("utf8");
    }
  } catch (err) {
    if (err instanceof BodyTooLargeError) {
      return {
        ok: false,
        status: 413,
        error: `Payload too large (limit ${limitBytes} bytes).`,
        code: "payload_too_large",
      };
    }
    return { ok: false, status: 400, error: "Invalid JSON body", code: "bad_json" };
  }

  if (!raw.trim()) {
    return { ok: false, status: 400, error: "Empty JSON body", code: "bad_json" };
  }

  try {
    return { ok: true, body: JSON.parse(raw) as T };
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
