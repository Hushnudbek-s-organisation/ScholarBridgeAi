import { NextResponse } from "next/server";
import { aiChat, isAiConfigured } from "@/lib/ai/index";
import { authenticate } from "@/lib/auth";
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
import { LIMITS, clientIp, rateLimitedResponse } from "@/lib/rate-limit";
import { checkSharedRateLimit } from "@/lib/rate-limit-shared";
import { readJsonBody } from "@/lib/request";

/**
 * POST /api/visa/chat
 * Body: { countryCode, gender?, messages: [{role, text}], profile? }
 * Returns: { reply } — the AI visa officer's next line (first question when
 * `messages` is empty).
 *
 * Metering: the router records every model call in `ai_usage` against the
 * signed-in caller (null for anonymous); throttles are shared across instances.
 * Signed-in callers are throttled per account, anonymous callers per IP. The daily AI request quota is
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
      ? await checkSharedRateLimit(`visa:chat:${session.profile.id}`, LIMITS.ai)
      : await checkSharedRateLimit(`visa:ip:${clientIp(req)}`, LIMITS.aiAnonymous);
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
    // The applicant file comes from the signed-in profile, never the request
    // body: client text must not be placed in the officer's system prompt.
    const profile: VisaApplicantProfile | null = session
      ? {
          name: typeof session.profile.name === "string" ? session.profile.name.slice(0, 80) : null,
          degreeLevel: typeof session.profile.degreeLevel === "string" ? session.profile.degreeLevel.slice(0, 60) : null,
          targetMajor: typeof session.profile.targetMajor === "string" ? session.profile.targetMajor.slice(0, 120) : null,
        }
      : null;

    // gpt-oss is a reasoning model: reasoning tokens share max_tokens, so a
    // 300-token cap returns an empty spoken line. 2048 + low effort keeps
    // the officer reply short without starving the visible answer.
    // Transient failures retry on the same provider (3 attempts, backoff);
    // an explicit admin fallback is used only after that.
    const result = await aiChat(
      {
        taskType: "visa",
        profileId: session?.profile.id ?? null,
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
        // Visa turns should fail over quickly rather than leave the officer thinking for minutes.
        timeoutMs: 12_000,
      },
      { maxAttempts: 3, baseDelayMs: 100 },
    );
    if (!result.ok) {
      // Keep practice usable when a configured provider is overloaded or its
      // key/model is temporarily unusable. This is an explicit scripted reply,
      // labelled to the client as offline rather than pretending it is AI.
      const scripted = nextScriptedQuestion(country, history as VisaMessage[]);
      return NextResponse.json({
        reply: scripted.reply,
        aiUsed: false,
        source: "script",
        closing: scripted.closing,
      });
    }

    const reply = result.response.text.trim();
    if (!reply) {
      return NextResponse.json(
        { error: "The AI officer returned an empty reply. Please try again." },
        { status: 502 },
      );
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
