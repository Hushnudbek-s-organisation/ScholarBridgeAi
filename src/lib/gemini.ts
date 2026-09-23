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

/**
 * Turn a GoogleGenerativeAI SDK failure into an actionable, user-facing
 * message (safe: never contains the API key). Own thrown Errors (no HTTP
 * status attached, e.g. empty-reply guards) pass through untouched.
 */
export function describeGeminiError(err: unknown, model: string): string {
  const anyErr = err as { status?: unknown; message?: unknown } | null;
  const status =
    anyErr && typeof anyErr.status === "number" ? anyErr.status : null;
  const raw =
    anyErr && typeof anyErr.message === "string" ? anyErr.message : "";
  // First line only, bounded — SDK messages can embed long JSON payloads.
  const detail = raw
    .split("\n")[0]
    .replace(/\[GoogleGenerativeAI Error\]:?\s*/i, "")
    .trim()
    .slice(0, 280);

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
    return `Gemini server error (${status}). Please try again in a moment.`;
  }
  return `Gemini request failed (${status})${detail ? `: ${detail}` : ""}`;
}
