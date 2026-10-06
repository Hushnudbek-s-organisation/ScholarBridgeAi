import { NextResponse } from "next/server";
import { aiChat, aiErrorStatus, describeAiError, isAiConfigured } from "@/lib/ai/index";
import { authenticate } from "@/lib/auth";
import { logAIUsage } from "@/lib/ai/usage";
import {
  buildInterviewUserPrompt,
  buildOfficerSystemPrompt,
  getVisaCountry,
  nextScriptedQuestion,
  sanitizeHistory,
  type VisaApplicantProfile,
  type VisaMessage,
  type VisaOfficerGender,
} from "@/lib/visa-interview";
import { LIMITS, checkRateLimit, clientIp, rateLimitedResponse } from "@/lib/rate-limit";
import { readJsonBody } from "@/lib/request";

/**
 * POST /api/visa/chat
 * Body: { countryCode, gender?, messages: [{role, text}], profile? }
 * Returns: { reply } — the AI visa officer's next line (first question when
 * `messages` is empty).
 *
 * Metering (audit A21): every signed-in caller's usage is recorded in
 * `ai_usage` (admin statistics are complete) and throttled per account;
 * anonymous callers keep the per-IP throttle. The daily AI request quota is
 * INTENTIONALLY not applied here: one practice interview is a multi-step
 * conversation (10+ messages) and would exhaust a free 5-request/day budget
 * mid-interview — the per-minute limits below are the abuse control instead.
 * This exclusion is deliberate, documented and test-covered.
 */
export async function POST(req: Request) {
  try {
    // Who is calling? A signed-in account gets a per-account budget and its
    // usage is logged against it; an anonymous caller is throttled per IP so
    // the endpoint cannot be used as a free AI proxy.
    const auth = await authenticate(req);
    const session = auth.ok ? auth.session : null;

    const limit = session
      ? checkRateLimit(`visa:chat:${session.profile.id}`, LIMITS.ai)
      : checkRateLimit(`visa:ip:${clientIp(req)}`, LIMITS.aiAnonymous);
    if (!limit.ok) return rateLimitedResponse(limit.retryAfterSec);

    const parsed = await readJsonBody<Record<string, any>>(req, 128 * 1024);
    const body = parsed.ok ? parsed.body : {};
    const country = getVisaCountry(body?.countryCode);
    if (!country) {
      return NextResponse.json(
        { error: "Valid countryCode is required." },
        { status: 400 },
      );
    }

    // Provider = admin's "visa" mapping (default Groq); see lib/ai/settings.
    // Without one, the interview must still WORK: the officer asks the
    // country's standard consular questions in order, and the final score is
    // the deterministic rubric over the student's own transcript. It used to
    // answer 503, so the voice interview could not start at all on a server
    // with no AI keys — a dead end for the whole feature.
    if (!(await isAiConfigured("visa"))) {
      const history = sanitizeHistory(Array.isArray(body?.messages) ? body.messages : []);
      const scripted = nextScriptedQuestion(country, history as VisaMessage[]);
      return NextResponse.json({
        reply: scripted.reply,
        aiUsed: false,
        source: "script",
        closing: scripted.closing,
      });
    }

    const gender: VisaOfficerGender =
      body?.gender === "female" ? "female" : "male";
    const history = sanitizeHistory(body?.messages);
    const profile = (body?.profile || null) as VisaApplicantProfile | null;

    // gpt-oss is a reasoning model: reasoning tokens share max_tokens, so a
    // 300-token cap returns an empty spoken line. 2048 + low effort keeps
    // the officer reply short without starving the visible answer.
    // Transient failures retry on the same provider (3 attempts, backoff);
    // an explicit admin fallback is used only after that.
    const result = await aiChat(
      {
        taskType: "visa",
        prompt: "",
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
      },
      { maxAttempts: 3 },
    );
    if (!result.ok) {
      return NextResponse.json({ error: describeAiError(result.error) }, { status: aiErrorStatus(result.error) });
    }

    const reply = result.response.text.trim();
    if (!reply) {
      return NextResponse.json(
        { error: "The AI officer returned an empty reply. Please try again." },
        { status: 502 },
      );
    }

    // Usage goes to the caller (or null for anonymous) so admin statistics
    // and future per-task reporting are complete (audit A21). Awaited (not
    // fire-and-forget) so the row exists before the response is sent; a
    // storage blip must never fail an otherwise successful interview turn.
    try {
      await logAIUsage({
        profileId: session?.profile.id ?? null,
        taskType: "visa",
        provider: result.response.provider,
        model: result.response.model,
        promptTokens: result.response.promptTokens,
        completionTokens: result.response.completionTokens,
        costEstimate: result.response.costEstimate,
        status: "success",
      });
    } catch (err) {
      console.error("Visa chat usage log failed:", err);
    }

    return NextResponse.json({ reply });
  } catch (err) {
    console.error("Visa chat error:", (err as Error)?.message);
    return NextResponse.json(
      { error: "The visa interview is temporarily unavailable. Please try again." },
      { status: 500 },
    );
  }
}
