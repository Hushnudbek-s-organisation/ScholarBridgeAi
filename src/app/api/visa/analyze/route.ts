import { NextResponse } from "next/server";
import {
  describeGroqError,
  getGroqModelName,
  groqChatComplete,
  isGroqConfigured,
  withGroqRetry,
} from "@/lib/groq";
import {
  buildAnalysisPrompt,
  getVisaCountry,
  parseAnalysisJson,
  sanitizeHistory,
} from "@/lib/visa-interview";

/**
 * POST /api/visa/analyze
 * Body: { countryCode, messages: [{role, text}], uiLanguage? }
 * Returns: { confidence, persuasiveness, language_level,
 *            estimated_visa_chance, recommendations }
 */
export async function POST(req: Request) {
  try {
    if (!isGroqConfigured()) {
      return NextResponse.json(
        { error: "GROQ_API_KEY is not configured on the server." },
        { status: 503 },
      );
    }

    const body = await req.json().catch(() => ({}));
    const country = getVisaCountry(body?.countryCode);
    if (!country) {
      return NextResponse.json(
        { error: "Valid countryCode is required." },
        { status: 400 },
      );
    }

    const history = sanitizeHistory(body?.messages, 40, 2000);
    const uiLanguage =
      typeof body?.uiLanguage === "string" && body.uiLanguage.trim()
        ? body.uiLanguage.trim().slice(0, 40)
        : "English";

    // The analysis prompt asks for "JSON ONLY" (Groq's json_object mode
    // requires the word "JSON" in the messages).
    const result = await withGroqRetry(() =>
      groqChatComplete({
        model: getGroqModelName(),
        messages: [{ role: "user", content: buildAnalysisPrompt(country, history, uiLanguage) }],
        temperature: 0.3,
        maxTokens: 1024,
        jsonMode: true,
      }),
    );

    const analysis = parseAnalysisJson(result.text);
    if (!analysis) {
      return NextResponse.json(
        { error: "Could not parse the AI analysis. Please try again." },
        { status: 502 },
      );
    }

    return NextResponse.json(analysis);
  } catch (err) {
    console.error("Visa analyze error:", err);
    return NextResponse.json(
      { error: describeGroqError(err, getGroqModelName()) },
      { status: 500 },
    );
  }
}
