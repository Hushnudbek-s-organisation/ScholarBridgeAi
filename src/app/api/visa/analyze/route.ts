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
import { scoreVisaInterview, visaChanceDisclaimer } from "@/lib/visaScoring";
import { LIMITS, checkRateLimit, clientIp, rateLimitedResponse } from "@/lib/rate-limit";
import { readJsonBody } from "@/lib/request";

/**
 * POST /api/visa/analyze
 * Body: { countryCode, messages: [{role, text}], uiLanguage? }
 * Returns: { confidence, persuasiveness, language_level,
 *            estimated_visa_chance, recommendations,
 *            rubric, chanceDisclaimer }
 *
 * Two halves, deliberately:
 *   - `rubric` is COMPUTED from the transcript by src/lib/visaScoring.ts and is
 *     returned even when no model is configured, so the student always gets a
 *     real assessment of what they said.
 *   - `estimated_visa_chance` is the model's opinion and is shipped with a
 *     disclaimer, because a consular decision depends on the officer, the post
 *     and documents this endpoint never sees.
 */
export async function POST(req: Request) {
  try {
    // Paid model, anonymous endpoint — throttle per IP (see lib/rate-limit).
    const limit = checkRateLimit(`visa:analyze:${clientIp(req)}`, LIMITS.aiAnonymous);
    if (!limit.ok) return rateLimitedResponse(limit.retryAfterSec);

    const parsed = await readJsonBody<Record<string, any>>(req, 256 * 1024);
    const body = parsed.ok ? parsed.body : {};
    const country = getVisaCountry(body?.countryCode);
    if (!country) {
      return NextResponse.json(
        { error: "Valid countryCode is required." },
        { status: 400 },
      );
    }

    const history = sanitizeHistory(body?.messages, 40, 2000);

    // Deterministic rubric — always computed, model or not.
    const rubric = scoreVisaInterview(history, {
      homeCountry: typeof body?.homeCountry === "string" ? body.homeCountry.slice(0, 60) : null,
      destination: country.name,
    });

    if (!isGroqConfigured()) {
      // No model available — the rubric is still a complete, honest answer.
      return NextResponse.json({
        aiAvailable: false,
        rubric,
        estimated_visa_chance: null,
        chanceDisclaimer: visaChanceDisclaimer(null),
        recommendations: "",
      });
    }
    const uiLanguage =
      typeof body?.uiLanguage === "string" && body.uiLanguage.trim()
        ? body.uiLanguage.trim().slice(0, 40)
        : "English";

    // The analysis prompt asks for "JSON ONLY" (Groq's json_object mode
    // requires the word "JSON" in the messages). gpt-oss reasoning tokens
    // share max_tokens, so the budget is 2048 with low effort.
    const result = await withGroqRetry(() =>
      groqChatComplete({
        model: getGroqModelName(),
        messages: [{ role: "user", content: buildAnalysisPrompt(country, history, uiLanguage) }],
        temperature: 0.3,
        maxTokens: 2048,
        jsonMode: true,
        reasoningEffort: "low",
      }),
    );

    const analysis = parseAnalysisJson(result.text);
    if (!analysis) {
      return NextResponse.json(
        { error: "Could not parse the AI analysis. Please try again." },
        { status: 502 },
      );
    }

    return NextResponse.json({
      ...analysis,
      aiAvailable: true,
      rubric,
      // The model's number stays, but never unlabelled.
      chanceDisclaimer: visaChanceDisclaimer(analysis.estimated_visa_chance),
    });
  } catch (err) {
    console.error("Visa analyze error:", err);
    return NextResponse.json(
      { error: describeGroqError(err, getGroqModelName()) },
      { status: 500 },
    );
  }
}
