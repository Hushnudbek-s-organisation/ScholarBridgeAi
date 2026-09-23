import { GoogleGenerativeAI, type GenerativeModel } from "@google/generative-ai";

/**
 * Direct Google Gemini client (server-side ONLY — never import from Client
 * Components). Powers the Visa Speaking Assistant interview + analysis.
 *
 * Env:
 *   GEMINI_API_KEY   — required (Google AI Studio key, free tier works)
 *   GEMINI_MODEL     — optional, defaults to "gemini-1.5-flash"
 */

export function getGeminiApiKey(): string {
  return process.env.GEMINI_API_KEY || "";
}

export function getGeminiModelName(): string {
  return process.env.GEMINI_MODEL || "gemini-1.5-flash";
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
