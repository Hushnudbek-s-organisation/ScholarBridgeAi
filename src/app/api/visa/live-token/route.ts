import { NextResponse } from "next/server";
import { GoogleGenAI, Modality, EndSensitivity } from "@google/genai";
import { getGeminiApiKey, getGeminiModelName } from "@/lib/gemini";
import {
  buildOfficerSystemPrompt,
  getVisaCountry,
  type VisaOfficerGender,
  type VisaApplicantProfile,
} from "@/lib/visa-interview";

/**
 * POST /api/visa/live-token
 * Creates an ephemeral token for the Gemini Live API, locking model,
 * system instruction, voice, and VAD settings inside it. The actual API
 * key never reaches the browser.
 */
export async function POST(req: Request) {
  try {
    const apiKey = getGeminiApiKey();
    if (!apiKey) {
      return NextResponse.json(
        { error: "GEMINI_API_KEY is not configured on the server." },
        { status: 503 },
      );
    }

    const body = await req.json().catch(() => ({}));
    const countryCode: string | undefined = body?.countryCode;
    const gender: VisaOfficerGender = body?.gender === "female" ? "female" : "male";
    const profile = (body?.profile || null) as VisaApplicantProfile | null;
    const country = getVisaCountry(countryCode);

    if (!country) {
      return NextResponse.json(
        { error: "Valid countryCode is required." },
        { status: 400 },
      );
    }

    // Use the configured live model if available; fall back to the latest
    // preview live model when env doesn't specify.
    const liveModelEnv = process.env.GEMINI_LIVE_MODEL;
    const modelName =
      liveModelEnv ||
      process.env.GEMINI_MODEL ||
      "gemini-3.1-flash-live-preview";

    // Lock settings inside the token via liveConnectConstraints.
    const voice = String(body?.voice || "Puck").trim() || "Puck";

    const systemPrompt = buildOfficerSystemPrompt(country, gender, profile);

    const ai = new GoogleGenAI({ apiKey });

    const expireTime = new Date(Date.now() + 30 * 60 * 1000).toISOString();
    const newSessionExpireTime = new Date(Date.now() + 1 * 60 * 1000).toISOString();

    const token = await ai.authTokens.create({
      config: {
        uses: 1,
        expireTime,
        newSessionExpireTime,
        liveConnectConstraints: {
          model: modelName,
          config: {
            sessionResumption: {},
            responseModalities: [Modality.AUDIO],
            systemInstruction: {
              parts: [{ text: systemPrompt }],
            },
            realtimeInputConfig: {
              automaticActivityDetection: {
                silenceDurationMs: 500,
                prefixPaddingMs: 200,
                endOfSpeechSensitivity: EndSensitivity.END_SENSITIVITY_HIGH,
              },
            },
            speechConfig: {
              voiceConfig: {
                prebuiltVoiceConfig: {
                  voiceName: voice,
                },
              },
            },
          },
        },
      },
    });

    return NextResponse.json({
      token: token.name || token,
      model: modelName,
      voice,
      country: country.code,
      gender,
    });
  } catch (err) {
    console.error("Live token error:", err);
    const message =
      err instanceof Error ? err.message : "Failed to create live token.";
    return NextResponse.json(
      { error: message.replace(/AIza[0-9A-Za-z_-]{8,}/g, "AIza[REDACTED]") },
      { status: 500 },
    );
  }
}
