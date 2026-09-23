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

export const runtime = "nodejs";

const DEFAULT_LIVE_MODEL = "gemini-3.1-flash-live-preview";
const DEFAULT_API_VERSION = "v1beta";

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

function errorMessage(err: unknown): string {
  const raw =
    err && typeof err === "object" && "message" in err
      ? String((err as { message?: unknown }).message ?? "")
      : "";
  return redactGeminiSecrets(raw || "Could not create a Gemini Live token.");
}

/**
 * POST /api/visa/live-token
 *
 * Mints a short-lived Gemini Live ephemeral token. The long-lived Gemini API key
 * never reaches the browser; the token is constrained to one Live session and
 * locks the model, visa-officer system instruction, voice, transcription, VAD,
 * no-tools policy, and context compression on the server side.
 */
export async function POST(req: Request) {
  try {
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
    const voiceName = normalizeVisaLiveVoice(body?.voice, gender);
    const profile = (body?.profile || null) as VisaApplicantProfile | null;

    const credential = await resolveProviderCredential("gemini");
    const apiKey = credential.apiKey?.trim();
    if (!apiKey) {
      return NextResponse.json(
        { error: "Gemini API key is not configured on the server." },
        { status: 503 },
      );
    }

    const model = getLiveModelName();
    const apiVersion = getLiveApiVersion();
    const expireTime = new Date(Date.now() + 30 * 60 * 1000).toISOString();
    const newSessionExpireTime = new Date(Date.now() + 60 * 1000).toISOString();

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

    const client = new GoogleGenAI({ apiKey, apiVersion });
    const token = await client.authTokens.create({
      config: {
        httpOptions: { apiVersion },
        uses: 1,
        expireTime,
        newSessionExpireTime,
        liveConnectConstraints: {
          model,
          config: liveConfig,
        },
        // Empty mask = lock only fields set above. This keeps the sensitive
        // setup server-owned while still allowing the browser to supply a
        // sessionResumption.handle on reconnects.
        lockAdditionalFields: [],
      },
    });

    if (!token.name) {
      throw new Error("Gemini returned an empty ephemeral token.");
    }

    return NextResponse.json({
      token: token.name,
      model,
      apiVersion,
      voice: voiceName,
      expiresAt: expireTime,
      newSessionExpireTime,
    });
  } catch (err) {
    console.error("Visa Live token error:", errorMessage(err));
    return NextResponse.json({ error: errorMessage(err) }, { status: 500 });
  }
}
