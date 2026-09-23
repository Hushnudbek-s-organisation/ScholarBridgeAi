import { NextResponse } from "next/server";
import { createGeminiModel, isGeminiConfigured } from "@/lib/gemini";
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
    if (!isGeminiConfigured()) {
      return NextResponse.json(
        { error: "GEMINI_API_KEY is not configured on the server." },
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

    const model = createGeminiModel();
    if (!model) {
      return NextResponse.json(
        { error: "GEMINI_API_KEY is not configured on the server." },
        { status: 503 },
      );
    }

    const result = await model.generateContent({
      contents: [
        {
          role: "user",
          parts: [{ text: buildAnalysisPrompt(country, history, uiLanguage) }],
        },
      ],
      generationConfig: {
        temperature: 0.3,
        maxOutputTokens: 1024,
        responseMimeType: "application/json",
      },
    });

    const analysis = parseAnalysisJson(result.response.text());
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
      { error: "Analysis is unavailable right now. Please try again." },
      { status: 500 },
    );
  }
}
