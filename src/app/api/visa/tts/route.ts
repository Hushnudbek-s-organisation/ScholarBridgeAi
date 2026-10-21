import { NextResponse } from "next/server";
import { requireSession } from "@/lib/auth";
import { resolveProviderCredential } from "@/lib/ai/credentials";
import { OPENROUTER_MODELS, isProviderEnabled, openRouterKey } from "@/lib/ai/openrouterModels";
import { LIMITS, rateLimitedResponse } from "@/lib/rate-limit";
import { checkSharedRateLimit } from "@/lib/rate-limit-shared";
import { readJsonBody } from "@/lib/request";
import { getVisaCountry, type VisaOfficerGender } from "@/lib/visa-interview";

/**
 * POST /api/visa/tts — natural neural voice for the consular officer.
 *
 * Body: { text: string, gender?: "male" | "female", voice?: string, language?: string }
 * Returns: audio/mpeg bytes, or **204 No Content** when no OpenAI key is set.
 *
 * WHY 204 AND NOT AN ERROR
 * The browser has a perfectly good built-in speech synthesiser. This endpoint
 * is an upgrade, not a dependency: when the server has no key, 204 tells the
 * client "nothing from me" and it silently keeps using `speechSynthesis`.
 * Returning 4xx/5xx here would surface an error in the middle of an interview
 * for a purely cosmetic difference.
 *
 * The caller is signed in (requireSession) and shares the AI rate-limit bucket,
 * because a TTS call costs the same kind of real money a chat call does.
 *
 * No key is ever echoed, and the upstream error text is never forwarded to the
 * browser — only a status code the client already treats as "fall back".
 */

export const dynamic = "force-dynamic";

/** Output cap. The officer's longest line is a paragraph; 4096 chars is generous. */
const MAX_TEXT_LENGTH = 4096;
/** Hard upstream timeout — a stalled TTS call must not hold the interview open. */
const UPSTREAM_TIMEOUT_MS = 4_500;

const DEFAULT_MODEL = "gpt-4o-mini-tts";

/**
 * Natural consular voices. `cedar`/`marin` are the newest natural timbres;
 * they fall back to the long-standing `onyx`/`nova` where a model does not
 * accept them, because an unsupported voice name is a 400 from the API.
 */
const VOICES: Record<VisaOfficerGender, string> = {
  male: "onyx",
  female: "nova",
};

export async function POST(req: Request) {
  try {
    const auth = await requireSession(req);
    if (!auth.ok) {
      return NextResponse.json({ error: auth.error, code: auth.code }, { status: auth.status });
    }
    const profileId = auth.session.profile.id;

    const limit = await checkSharedRateLimit(`visa:tts:${profileId}`, LIMITS.ai);
    if (!limit.ok) return rateLimitedResponse(limit.retryAfterSec);

    const parsed = await readJsonBody<{
      text?: unknown;
      gender?: unknown;
      voice?: unknown;
      language?: unknown;
    }>(req, 32 * 1024);
    if (!parsed.ok) return NextResponse.json({ error: parsed.error }, { status: parsed.status });

    const rawText = typeof parsed.body?.text === "string" ? parsed.body.text.trim() : "";
    if (!rawText) {
      return NextResponse.json({ error: "text is required." }, { status: 400 });
    }
    const text = rawText.slice(0, MAX_TEXT_LENGTH);

    const gender: VisaOfficerGender = parsed.body?.gender === "female" ? "female" : "male";
    const requestedVoice =
      typeof parsed.body?.voice === "string" && parsed.body.voice.trim()
        ? parsed.body.voice.trim().toLowerCase().slice(0, 32)
        : null;

    // Language drives pronunciation for a non-English officer. A raw country
    // code is accepted too, because that is what the interview screen has to
    // hand; anything unrecognised is dropped rather than guessed.
    const rawLanguage = typeof parsed.body?.language === "string" ? parsed.body.language.trim() : "";
    const language = !rawLanguage
      ? null
      : /^[a-z]{2}(-[A-Za-z]{2,4})?$/.test(rawLanguage)
        ? rawLanguage
        : getVisaCountry(rawLanguage)?.locale ?? null;

    // OpenRouter is preferred when configured. Fish voice IDs are provider
    // specific, so use optional admin-owned voice presets when supplied; when
    // absent, Fish chooses its model default. OpenAI retains gender-specific
    // voices as the automatic fallback.
    const openRouterApiKey = await openRouterKey();
    const openAiCredential = await isProviderEnabled("openai") ? await resolveProviderCredential("openai") : null;
    const candidates: Array<{ provider: "openrouter" | "openai"; apiKey: string; model: string }> = [];
    if (openRouterApiKey) {
      const models = [
        process.env.OPENROUTER_TTS_MODEL?.trim(),
        "fishaudio/fish-speech-2.1-pro:free",
        "fish-audio/s2.1-pro-free:free",
        "openai/gpt-4o-mini-tts",
      ].filter((model): model is string => Boolean(model));
      for (const model of [...new Set(models)]) candidates.push({ provider: "openrouter", apiKey: openRouterApiKey, model });
    }
    if (openAiCredential?.apiKey) candidates.push({
      provider: "openai",
      apiKey: openAiCredential.apiKey,
      model: process.env.OPENAI_TTS_MODEL?.trim() || DEFAULT_MODEL,
    });
    if (candidates.length === 0) return new NextResponse(null, { status: 204 });

    let audio: ArrayBuffer | null = null;
    for (const candidate of candidates) {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), UPSTREAM_TIMEOUT_MS);
      try {
        const fishVoice = gender === "female"
          ? process.env.OPENROUTER_TTS_VOICE_FEMALE?.trim()
          : process.env.OPENROUTER_TTS_VOICE_MALE?.trim();
        const body = candidate.provider === "openrouter"
          ? { model: candidate.model, input: text, response_format: "mp3", ...(fishVoice ? { voice: fishVoice } : {}) }
          : { model: candidate.model, voice: requestedVoice ?? VOICES[gender], input: text, response_format: "mp3", speed: 0.98, ...(language ? { instructions: `Speak in ${language}.` } : {}) };
        const upstream = await fetch(
          candidate.provider === "openrouter"
            ? "https://openrouter.ai/api/v1/audio/speech"
            : "https://api.openai.com/v1/audio/speech",
          {
            method: "POST",
            signal: controller.signal,
            headers: { authorization: `Bearer ${candidate.apiKey}`, "content-type": "application/json" },
            body: JSON.stringify(body),
          },
        );
        if (!upstream.ok || !upstream.body) {
          console.warn(`visa/tts ${candidate.provider} model ${candidate.model} failed:`, upstream.status);
          continue;
        }
        const contentType = upstream.headers.get("content-type")?.toLowerCase() ?? "";
        if (contentType && !contentType.startsWith("audio/") && contentType !== "application/octet-stream") {
          console.warn(`visa/tts ${candidate.provider} returned a non-audio response`);
          continue;
        }
        const candidateAudio = await upstream.arrayBuffer();
        if (candidateAudio.byteLength === 0) continue;
        audio = candidateAudio;
        break;
      } catch (error) {
        console.warn(`visa/tts ${candidate.provider} request failed:`, error instanceof Error ? error.name : "unknown");
      } finally {
        clearTimeout(timer);
      }
    }
    if (!audio) return new NextResponse(null, { status: 204 });

    return new NextResponse(audio, {
      status: 200,
      headers: {
        "content-type": "audio/mpeg",
        "content-length": String(audio.byteLength),
        // Voice clips are per-utterance and must never be cached by a shared proxy.
        "cache-control": "no-store",
      },
    });
  } catch (err) {
    // Never leak internals; the client falls back to the browser voice.
    console.error("POST /api/visa/tts error:", err);
    return new NextResponse(null, { status: 204 });
  }
}
