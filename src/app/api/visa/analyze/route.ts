import { NextResponse } from "next/server";
import { and, eq, inArray, isNull } from "drizzle-orm";
import { aiChat, aiErrorStatus, describeAiError, isAiConfigured } from "@/lib/ai/index";
import {
  buildAnalysisPrompt,
  getVisaCountry,
  parseAnalysisJson,
  sanitizeHistory,
} from "@/lib/visa-interview";
import { scoreVisaInterview, visaChanceDisclaimer } from "@/lib/visaScoring";
import { LIMITS, clientIp, rateLimitedResponse } from "@/lib/rate-limit";
import { checkSharedRateLimit } from "@/lib/rate-limit-shared";
import { readJsonBody } from "@/lib/request";
import { db } from "@/db";
import { aiEvaluations, fundingItems, studentProfiles } from "@/db/schema";
import { authenticate } from "@/lib/auth";
import { enforceFreeCap } from "@/lib/planLimits";

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
 *
 * Metering: the router records every model call in `ai_usage` against the
 * signed-in caller (null for anonymous). The daily AI request quota is
 * intentionally NOT applied (multi-step practice; see /api/visa/chat) — the
 * per-minute limits, the free practice-session cap and the platform budget
 * remain the controls.
 *
 * Practice sessions are owned by the SESSION, never by a body field: a free
 * account cannot skip its daily cap by leaving `profileId` out.
 */
export async function POST(req: Request) {
  try {
    // Paid model, reachable anonymously — signed-in callers get a per-account
    // budget (and their usage is logged against them), anonymous callers a
    // per-IP one, so the endpoint cannot be used as a free AI proxy.
    const auth = await authenticate(req);
    const session = auth.ok ? auth.session : null;

    const limit = session
      ? await checkSharedRateLimit(`visa:analyze:${session.profile.id}`, LIMITS.ai)
      : await checkSharedRateLimit(`visa:analyze:${clientIp(req)}`, LIMITS.aiAnonymous);
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
    // Profile context is read only from the authenticated session; a body
    // profileId can never select another student's academic or funding data.
    const ownerId = session?.profile.id ?? null;
    let profileContext: {
      targetMajor: string | null;
      degreeLevel: string | null;
      budgetAnnualUsd: number | null;
      fundingSources: { name: string; kind: string; amountUsd: number; status: string }[];
    } | null = null;
    if (ownerId) {
      const [[savedProfile], savedFunding] = await Promise.all([
        db.select({
          targetMajor: studentProfiles.targetMajor,
          degreeLevel: studentProfiles.degreeLevel,
          budgetAnnualUsd: studentProfiles.budgetAnnualUsd,
        }).from(studentProfiles).where(eq(studentProfiles.id, ownerId)).limit(1),
        // Only profile-wide, already-awarded/confirmed funding is a safe
        // reference for a general visa-practice session. Do not silently pick
        // a different/latest application plan.
        db.select({ name: fundingItems.name, kind: fundingItems.kind, amountUsd: fundingItems.amountUsd, status: fundingItems.status })
          .from(fundingItems)
          .where(and(
            eq(fundingItems.profileId, ownerId),
            isNull(fundingItems.applicationId),
            inArray(fundingItems.status, ["confirmed", "awarded"]),
          )),
      ]);
      if (savedProfile) profileContext = { ...savedProfile, fundingSources: savedFunding };
    }

    // Deterministic rubric — always computed, model or not.
    const rubric = scoreVisaInterview(history, {
      homeCountry: typeof body?.homeCountry === "string" ? body.homeCountry.slice(0, 60) : null,
      destination: country.name,
      profile: profileContext,
    });

    // Practice history (spec §13) and the free practice cap are both keyed on
    // the signed-in account. Free plan: limited practice sessions/day; Pro is
    // unlimited. Anonymous practice is unaffected by the cap (no account).
    if (ownerId) {
      const capped = await enforceFreeCap(ownerId, "visa_practice");
      if (capped) return capped;
      try {
        await db.insert(aiEvaluations).values({
          profileId: ownerId,
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
        profileId: ownerId,
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
