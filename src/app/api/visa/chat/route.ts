import { NextResponse } from "next/server";
import {
  createGeminiModel,
  describeGeminiError,
  getGeminiModelName,
  isGeminiConfigured,
  withGeminiRetry,
} from "@/lib/gemini";
import {
  buildInterviewUserPrompt,
  buildOfficerSystemPrompt,
  getVisaCountry,
  sanitizeHistory,
  type VisaApplicantProfile,
  type VisaOfficerGender,
} from "@/lib/visa-interview";

/**
 * POST /api/visa/chat
 * Body: { countryCode, gender?, messages: [{role, text}], profile? }
 * Returns: { reply } — the AI visa officer's next line (first question when
 * `messages` is empty).
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

    const gender: VisaOfficerGender =
      body?.gender === "female" ? "female" : "male";
    const history = sanitizeHistory(body?.messages);
    const profile = (body?.profile || null) as VisaApplicantProfile | null;

    const model = createGeminiModel(
      buildOfficerSystemPrompt(country, gender, profile),
    );
    if (!model) {
      return NextResponse.json(
        { error: "GEMINI_API_KEY is not configured on the server." },
        { status: 503 },
      );
    }

    const result = await withGeminiRetry(() =>
      model.generateContent({
        contents: [
          {
            role: "user",
            parts: [{ text: buildInterviewUserPrompt(country, history) }],
          },
        ],
        generationConfig: { temperature: 0.8, maxOutputTokens: 300 },
      }),
    );

    const reply = result.response.text().trim();
    if (!reply) {
      return NextResponse.json(
        { error: "The AI officer returned an empty reply. Please try again." },
        { status: 502 },
      );
    }

    return NextResponse.json({ reply });
  } catch (err) {
    console.error("Visa chat error:", err);
    return NextResponse.json(
      { error: describeGeminiError(err, getGeminiModelName()) },
      { status: 500 },
    );
  }
}
