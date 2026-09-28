import { NextResponse } from "next/server";
import { aiChat, aiErrorStatus, describeAiError, isAiConfigured } from "@/lib/ai/index";
import {
  buildAnalysisPrompt,
  getVisaCountry,
  parseAnalysisJson,
  sanitizeHistory,
} from "@/lib/visa-interview";
import { scoreVisaInterview, visaChanceDisclaimer } from "@/lib/visaScoring";
import { LIMITS, checkRateLimit, clientIp, rateLimitedResponse } from "@/lib/rate-limit";
import { readJsonBody } from "@/lib/request";
import { db } from "@/db";
import { aiEvaluations } from "@/db/schema";
import { requireProfileAccess } from "@/lib/auth";

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

    // Practice history (spec §13): when a signed-in profile is passed, persist
    // the rubric so the student can watch scores rise across sessions.
    const profileId = Number(body?.profileId) || null;
    if (profileId) {
      const access = await requireProfileAccess(req, profileId);
      if (access.ok) {
        try {
          await db.insert(aiEvaluations).values({
            profileId,
            evaluationType: "Visa Practice",
            content: JSON.stringify({
              total: rubric.scores.total,
              purposeOfStudy: rubric.scores.purposeOfStudy,
              funding: rubric.scores.funding,
              homeTies: rubric.scores.homeTies,
              nonImmigrantIntent: rubric.scores.nonImmigrantIntent,
              specificity: rubric.scores.specificity,
              languageClarity: rubric.scores.languageClarity,
              country: country.name,
              homeCountry: typeof body?.homeCountry === "string" ? body.homeCountry.slice(0, 60) : null,
              answerCount: rubric.answerCount,
            }),
          });
        } catch (persistErr) {
          // History is a nice-to-have — never fail the analysis for it.
          console.error("Visa history persist error:", persistErr);
        }
      }
    }

    if (!(await isAiConfigured("visa"))) {
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

    // The analysis prompt asks for "JSON ONLY" (json_object mode requires the
    // word "JSON" in the messages; providers without JSON mode still get the
    // instruction and parseAnalysisJson tolerates fences). Reasoning tokens
    // share max_tokens, so the budget is 2048 with low effort.
    const result = await aiChat(
      {
        taskType: "visa",
        prompt: buildAnalysisPrompt(country, history, uiLanguage),
        temperature: 0.3,
        maxTokens: 2048,
        jsonMode: true,
        reasoningEffort: "low",
      },
      { maxAttempts: 3 },
    );
    if (!result.ok) {
      // The deterministic rubric is still a real answer — return it with the reason.
      // 200 on purpose: the client renders the rubric (same shape as "no provider").
      console.warn("Visa analyze AI unavailable:", result.error.category, aiErrorStatus(result.error));
      return NextResponse.json({
        aiAvailable: false,
        aiError: describeAiError(result.error),
        rubric,
        estimated_visa_chance: null,
        chanceDisclaimer: visaChanceDisclaimer(null),
        recommendations: "",
      });
    }

    const analysis = parseAnalysisJson(result.response.text);
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
    console.error("Visa analyze error:", (err as Error)?.message);
    return NextResponse.json(
      { error: "The interview analysis is temporarily unavailable. Please try again." },
      { status: 500 },
    );
  }
}
