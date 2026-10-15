import { NextResponse } from "next/server";
import {
  ActivityHandling,
  EndSensitivity,
  GoogleGenAI,
  Modality,
  StartSensitivity,
  TurnCoverage,
  type LiveConnectConfig,
} from "@google/genai";
import { resolveProviderCredential } from "@/lib/ai/credentials";
import {
  buildOfficerSystemPrompt,
  getVisaCountry,
  normalizeVisaLiveVoice,
  type VisaApplicantProfile,
  type VisaOfficerGender,
} from "@/lib/visa-interview";
import { redactGeminiSecrets } from "@/lib/gemini";
import { requireSession, type Session } from "@/lib/auth";
import { getConfig, getConfigNumber } from "@/lib/config";
import { getPremiumStatus } from "@/lib/premium";
import { logAIUsage } from "@/lib/ai/usage";
import { LIMITS, rateLimitedResponse } from "@/lib/rate-limit";
import { checkSharedRateLimit, reserveSharedSlot, sharedHitCount } from "@/lib/rate-limit-shared";
import { readJsonBody } from "@/lib/request";
import { db } from "@/db";
import { aiUsage } from "@/db/schema";
import { and, eq, gte, sql } from "drizzle-orm";

export const runtime = "nodejs";

const DEFAULT_LIVE_MODEL = "gemini-3.1-flash-live-preview";
const DEFAULT_API_VERSION = "v1beta";
const DAY_MS = 24 * 60 * 60 * 1000;
const MONTH_MS = 30 * DAY_MS;

/** Codes the browser keys its fallback messages on (see VisaSpeakingAssistant). */
const LIVE_MONTHLY_CODE = "live_monthly_cap_reached";

/** Codes the browser keys its fallback messages on (see VisaSpeakingAssistant). */
const LIVE_QUOTA_CODE = "live_quota_exceeded";
const LIVE_DISABLED_CODE = "live_voice_disabled";
const LIVE_CAPACITY_CODE = "live_capacity_reached";

function getLiveModelName(): string {
  return (
    process.env.GEMINI_LIVE_MODEL ||
    process.env.VISA_LIVE_MODEL ||
    DEFAULT_LIVE_MODEL
  ).trim();
}

function getLiveApiVersion(): string {
  return (process.env.GEMINI_LIVE_API_VERSION || DEFAULT_API_VERSION).trim();
}

/** Server-side detail for the logs only — never sent to the browser. */
function errorDetail(err: unknown): string {
  const raw =
    err && typeof err === "object" && "message" in err
      ? String((err as { message?: unknown }).message ?? "")
      : "";
  return redactGeminiSecrets(raw || "Could not create a Gemini Live token.").slice(0, 300);
}

/**
 * The applicant context is taken from the SIGNED-IN profile, never from the
 * request body: a client-supplied string here would be placed in the officer's
 * system prompt on the server's paid key.
 */
function applicantFromSession(session: Session): VisaApplicantProfile {
  const clip = (v: unknown, max: number) => (typeof v === "string" ? v.slice(0, max) : null);
  return {
    name: clip(session.profile.name, 80),
    degreeLevel: clip(session.profile.degreeLevel, 60),
    targetMajor: clip(session.profile.targetMajor, 120),
  };
}

/**
 * Live sessions allowed per account per day, by plan (admin-editable).
 * Admins are not limited. 0 = Live voice is not part of this plan.
 */
async function liveSessionAllowance(isPremium: boolean): Promise<number> {
  return getConfigNumber(
    isPremium ? "ai_premium_live_sessions_per_day" : "ai_free_live_sessions_per_day",
    isPremium ? 2 : 0,
  );
}

/**
 * Native-audio live sessions this account has opened in the last 30 days.
 *
 * Counted from `ai_usage` (one row per admitted session, taskType
 * "visa_live"): the daily allowance is a rate-limit bucket, which cannot
 * answer "how much have I used this month?". Read-only, no schema change.
 */
async function liveSessionsInLast30Days(profileId: number): Promise<number> {
  const [row] = await db
    .select({ n: sql<number>`count(*)::int` })
    .from(aiUsage)
    .where(
      and(
        eq(aiUsage.profileId, profileId),
        eq(aiUsage.taskType, "visa_live"),
        gte(aiUsage.createdAt, new Date(Date.now() - MONTH_MS)),
      ),
    );
  return Number(row?.n ?? 0);
}

function liveMonthlyCapResponse(limit: number, used: number) {
  return NextResponse.json(
    {
      error:
        "You have used this month's native-voice Live sessions. Standard voice and text mock interviews are still unlimited — continue there, or add a Live Voice Top-Up Pack.",
      code: LIVE_MONTHLY_CODE,
      plan: "premium",
      limit,
      used,
      retryAfterSec: Math.ceil(30 / 24) * 24 * 60 * 60,
      alternatives: ["standard_voice", "text"],
    },
    { status: 429 },
  );
}

const LIVE_GLOBAL_KEY = "visa:live-global";

function liveCapacityResponse(oldest: Date | null, retryAfterSec?: number) {
  const retry = Math.max(
    1,
    retryAfterSec ?? (oldest ? Math.ceil((oldest.getTime() + DAY_MS - Date.now()) / 1000) : Math.ceil(DAY_MS / 1000)),
  );
  return NextResponse.json(
    {
      error: "Live voice practice is at capacity today. You can continue with text practice.",
      code: LIVE_CAPACITY_CODE,
      retryAfterSec: retry,
    },
    { status: 429, headers: { "Retry-After": String(retry) } },
  );
}

function liveQuotaResponse(plan: "free" | "premium", limit: number, oldest: Date | null, retryAfterSec?: number) {
  const retry = Math.max(
    1,
    retryAfterSec ?? (oldest ? Math.ceil((oldest.getTime() + DAY_MS - Date.now()) / 1000) : Math.ceil(DAY_MS / 1000)),
  );
  return NextResponse.json(
    {
      error: "You have used today's Live voice sessions. You can continue with text practice or try again later.",
      code: LIVE_QUOTA_CODE,
      plan,
      limit,
      remaining: 0,
      retryAfterSec: retry,
    },
    { status: 429, headers: { "Retry-After": String(retry) } },
  );
}

/**
 * POST /api/visa/live-token
 *
 * Mints a short-lived Gemini Live ephemeral token. The long-lived Gemini API key
 * never reaches the browser; the token is constrained to one Live session and
 * locks the model, visa-officer system instruction, voice, transcription, VAD,
 * no-tools policy, and context compression on the server side.
 *
 * Cost controls (each one is a server-side check):
 *   1. signed-in account only;
 *   2. admin kill switch (`ai_live_voice_enabled`) — the browser then uses text practice;
 *   3. per-plan daily session allowance (`ai_free_live_sessions_per_day` /
 *      `ai_premium_live_sessions_per_day`), race-safe; one token = one session;
 *   4. per-hour rate limit per account (LIMITS.visaLiveToken);
 *   5. every minted token is recorded in ai_usage (taskType "visa_live").
 * The session length cap (`ai_live_session_max_minutes`) is returned for the
 * browser to enforce; Gemini does not let a token bound a session's length.
 */
export async function POST(req: Request) {
  try {
    // Each token opens a paid Gemini Live session on the server's key, so
    // only signed-in accounts may mint one.
    const access = await requireSession(req);
    if (!access.ok) {
      return NextResponse.json({ error: access.error, code: access.code }, { status: access.status });
    }
    const session = access.session;
    const profileId = session.profile.id;

    if ((await getConfig("ai_live_voice_enabled")) !== "true") {
      return NextResponse.json(
        { error: "Live voice practice is paused. You can continue with text practice.", code: LIVE_DISABLED_CODE },
        { status: 503 },
      );
    }

    const limit = await checkSharedRateLimit(`visa:live:${profileId}`, LIMITS.visaLiveToken);
    if (!limit.ok) return rateLimitedResponse(limit.retryAfterSec);

    // Platform-wide daily cap (checked read-only; reserved after the mint below).
    const globalCap = await getConfigNumber("ai_live_global_sessions_per_day", 30);
    const globalPre = await sharedHitCount(LIVE_GLOBAL_KEY, DAY_MS);
    if (globalPre.count >= globalCap) return liveCapacityResponse(globalPre.oldest);

    // Daily session allowance (admins exempt). Checked read-only here; the slot
    // itself is reserved only AFTER a token was minted, so a failed attempt
    // (no key, Gemini error) does not use up the allowance.
    const dayKey = `visa:live-day:${profileId}`;
    let quota: { limit: number | null; remaining: number | null } = { limit: null, remaining: null };
    /** Monthly native-audio allowance state (null for admins / non-Premium). */
    let monthly: { limit: number; used: number; remaining: number } | null = null;
    let liveAllowance: number | null = null;
    let livePlan: "free" | "premium" = "free";
    if (!session.isAdmin) {
      const isPremium = (await getPremiumStatus(profileId)).isPremium;
      const allowance = await liveSessionAllowance(isPremium);
      const plan = isPremium ? "premium" : "free";
      liveAllowance = allowance;
      livePlan = plan;
      if (allowance <= 0) {
        return NextResponse.json(
          {
            error: "Live voice practice is part of Premium. You can continue with text practice.",
            code: isPremium ? LIVE_QUOTA_CODE : "premium_required",
            feature: "visa_live",
            plan,
            limit: 0,
          },
          { status: 403 },
        );
      }
      const pre = await sharedHitCount(dayKey, DAY_MS);
      if (pre.count >= allowance) return liveQuotaResponse(plan, allowance, pre.oldest);

      // MONTHLY ceiling on NATIVE AUDIO (unit economics, 2026-10 fix): the
      // daily allowance alone let a heavy Premium user open 60 sessions of
      // native audio a month (~$13.80 of Gemini Live audio against a $4.92
      // price). Text and standard browser-voice interviews cost under
      // $0.002/session and stay UNLIMITED — only the paid audio path is capped.
      if (isPremium) {
        const monthlyCap = await getConfigNumber("ai_premium_live_sessions_per_month", 8);
        if (monthlyCap <= 0) {
          return NextResponse.json(
            {
              error:
                "Native-voice Live practice is paused. Standard voice and text mock interviews remain available.",
              code: LIVE_QUOTA_CODE,
              plan,
              limit: 0,
            },
            { status: 403 },
          );
        }
        const used = await liveSessionsInLast30Days(profileId);
        if (used >= monthlyCap) return liveMonthlyCapResponse(monthlyCap, used);
        monthly = { limit: monthlyCap, used, remaining: Math.max(0, monthlyCap - used) };
      }

      quota = { limit: allowance, remaining: Math.max(0, allowance - pre.count) };
    }

    const parsed = await readJsonBody<Record<string, any>>(req, 16 * 1024);
    if (!parsed.ok) {
      return NextResponse.json({ error: parsed.error, code: parsed.code }, { status: parsed.status });
    }
    const body = parsed.body;
    const country = getVisaCountry(body?.countryCode);
    if (!country) {
      return NextResponse.json(
        { error: "Valid countryCode is required." },
        { status: 400 },
      );
    }

    const gender: VisaOfficerGender =
      body?.gender === "female" ? "female" : "male";
    const voiceName = normalizeVisaLiveVoice(body?.voice, gender);
    const profile = applicantFromSession(session);

    const credential = await resolveProviderCredential("gemini");
    const apiKey = credential.apiKey?.trim();
    if (!apiKey) {
      // Operator detail stays in the logs; the student sees a neutral message.
      console.warn("Visa Live: no Gemini credential configured");
      return NextResponse.json(
        { error: "Live voice is not available right now. You can continue with text practice.", code: "live_unavailable" },
        { status: 503 },
      );
    }

    const model = getLiveModelName();
    const apiVersion = getLiveApiVersion();
    const expireTime = new Date(Date.now() + 30 * 60 * 1000).toISOString();
    const newSessionExpireTime = new Date(Date.now() + 60 * 1000).toISOString();
    const maxSessionMinutes = await getConfigNumber("ai_live_session_max_minutes", 10);

    const liveConfig: LiveConnectConfig = {
      responseModalities: [Modality.AUDIO],
      temperature: 0.75,
      maxOutputTokens: 420,
      systemInstruction: {
        parts: [
          {
            text: buildOfficerSystemPrompt(country, gender, profile),
          },
        ],
      },
      speechConfig: {
        voiceConfig: {
          prebuiltVoiceConfig: { voiceName },
        },
      },
      realtimeInputConfig: {
        activityHandling: ActivityHandling.START_OF_ACTIVITY_INTERRUPTS,
        turnCoverage: TurnCoverage.TURN_INCLUDES_ONLY_ACTIVITY,
        automaticActivityDetection: {
          disabled: false,
          startOfSpeechSensitivity: StartSensitivity.START_SENSITIVITY_HIGH,
          endOfSpeechSensitivity: EndSensitivity.END_SENSITIVITY_HIGH,
          prefixPaddingMs: 200,
          silenceDurationMs: 500,
        },
      },
      inputAudioTranscription: { languageCodes: [country.locale] },
      outputAudioTranscription: {},
      contextWindowCompression: { slidingWindow: {} },
      // Lock an explicit no-tools setup so the browser cannot escalate a
      // constrained Live token into code execution, search, or other tool calls.
      tools: [],
    };

    let token: { name?: string };
    try {
      const client = new GoogleGenAI({ apiKey, apiVersion });
      token = await client.authTokens.create({
        config: {
          httpOptions: { apiVersion },
          uses: 1,
          expireTime,
          newSessionExpireTime,
          liveConnectConstraints: {
            model,
            config: liveConfig,
          },
          // Empty mask = lock only fields set above. The browser may still
          // supply sessionResumption.handle on a reconnect with a NEW token.
          lockAdditionalFields: [],
        },
      });
    } catch (err) {
      console.error("Visa Live token error:", errorDetail(err));
      return NextResponse.json(
        { error: "Live voice is not available right now. You can continue with text practice.", code: "live_unavailable" },
        { status: 503 },
      );
    }

    if (!token.name) {
      console.error("Visa Live token error: Gemini returned an empty token");
      return NextResponse.json(
        { error: "Live voice is not available right now. You can continue with text practice.", code: "live_unavailable" },
        { status: 503 },
      );
    }

    // The token exists: now the session is counted. Exact under concurrency; if a
    // parallel request took the last slot, this token is discarded unused.
    const globalSlot = await reserveSharedSlot(LIVE_GLOBAL_KEY, { limit: globalCap, windowMs: DAY_MS });
    if (!globalSlot.ok) return liveCapacityResponse(null, globalSlot.retryAfterSec);
    if (liveAllowance !== null) {
      const slot = await reserveSharedSlot(dayKey, { limit: liveAllowance, windowMs: DAY_MS });
      if (!slot.ok) return liveQuotaResponse(livePlan, liveAllowance, null, slot.retryAfterSec);
      quota = { limit: liveAllowance, remaining: slot.remaining };
    }

    // One ai_usage row per admitted session (audio is billed by Gemini per
    // second and is not visible here, so the cost is recorded as unreported).
    try {
      await logAIUsage({
        profileId,
        taskType: "visa_live",
        provider: "gemini",
        model,
        promptTokens: 0,
        completionTokens: 0,
        costEstimate: 0,
        costStatus: "usage_unreported",
        status: "success",
      });
    } catch (err) {
      console.error("Visa Live usage not recorded:", errorDetail(err));
    }

    return NextResponse.json({
      token: token.name,
      model,
      apiVersion,
      voice: voiceName,
      expiresAt: expireTime,
      newSessionExpireTime,
      maxSessionSeconds: maxSessionMinutes * 60,
      liveQuota: quota,
      /** Native-audio allowance for the last 30 days (null = not applicable). */
      liveMonthlyQuota: monthly,
    });
  } catch (err) {
    console.error("Visa Live error:", errorDetail(err));
    return NextResponse.json(
      { error: "Live voice is not available right now. You can continue with text practice.", code: "live_unavailable" },
      { status: 500 },
    );
  }
}
