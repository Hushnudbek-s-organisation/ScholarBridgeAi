import { NextResponse } from "next/server";
import {
  describeGroqError,
  getGroqModelName,
  groqChatComplete,
  isGroqConfigured,
  withGroqRetry,
} from "@/lib/groq";
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

    const gender: VisaOfficerGender =
      body?.gender === "female" ? "female" : "male";
    const history = sanitizeHistory(body?.messages);
    const profile = (body?.profile || null) as VisaApplicantProfile | null;

    // gpt-oss is a reasoning model: reasoning tokens share max_tokens, so a
    // 300-token cap returns an empty spoken line. 2048 + low effort keeps
    // the officer reply short without starving the visible answer.
    const result = await withGroqRetry(() =>
      groqChatComplete({
        model: getGroqModelName(),
        messages: [
          {
            role: "system",
            content: buildOfficerSystemPrompt(country, gender, profile),
          },
          {
            role: "user",
            content: buildInterviewUserPrompt(country, history),
          },
        ],
        temperature: 0.8,
        maxTokens: 2048,
        reasoningEffort: "low",
      }),
    );

    const reply = result.text.trim();
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
      { error: describeGroqError(err, getGroqModelName()) },
      { status: 500 },
    );
  }
}
