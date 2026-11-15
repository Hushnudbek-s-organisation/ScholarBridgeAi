import { createHash } from "node:crypto";
import { BodyLimitError, cancelBody, readBoundedBytes } from "@/lib/boundedBody";
import { NextResponse } from "next/server";
import { requireSession } from "@/lib/auth";
import { OPENROUTER_MODEL_REGISTRY } from "@/lib/ai/openrouterModelIds";
import { evaluateAiBudget } from "@/lib/ai/budget-gate";
import { resolveProviderCredential } from "@/lib/ai/credentials";
import { GEMINI_MODELS } from "@/lib/ai/geminiModels";
import { DISABLED_PROVIDERS_CONFIG_KEY, parseDisabledProviders } from "@/lib/ai/settings";
import { logAIUsage } from "@/lib/ai/usage";
import { getStoredConfig } from "@/lib/config";
import { openRouterKey } from "@/lib/ai/openrouterModels";
import { LIMITS, rateLimitedResponse } from "@/lib/rate-limit";
import { checkSharedRateLimit } from "@/lib/rate-limit-shared";
import { readJsonBody } from "@/lib/request";
import type { VisaOfficerGender } from "@/lib/visa-interview";

/** Optional neural voice. The client uses browser speech when the API returns 204. */
export const dynamic = "force-dynamic";

const MAX_TEXT_LENGTH = 4096;
const MAX_AUDIO_BYTES = 8 * 1024 * 1024;
const UPSTREAM_TIMEOUT_MS = OPENROUTER_MODEL_REGISTRY.speech.timeoutMs;

async function readBoundedAudio(body: ReadableStream<Uint8Array>, maxBytes: number, signal: AbortSignal): Promise<Uint8Array | null> {
  try { const audio = await readBoundedBytes(body, maxBytes, signal); return audio.byteLength ? audio : null; }
  catch (error) { if (error instanceof BodyLimitError) return null; throw error; }
}

const speechCache = new Map<string, { audio: Uint8Array; expiresAt: number }>();

async function googleSpeech(req: Request, apiKey: string, model: string, profileId: number, gender: VisaOfficerGender, text: string) {
  const voice = gender === "female" ? "Kore" : "Charon";
  const cacheKey = createHash("sha256").update(JSON.stringify([profileId, model, voice, text])).digest("hex");
  const cached = speechCache.get(cacheKey);
  if (cached && cached.expiresAt <= Date.now()) speechCache.delete(cacheKey);
  let audio = cached && cached.expiresAt > Date.now() ? cached.audio : null;
  if (!audio) {
    if (!(await evaluateAiBudget("google", model)).allowed) return new NextResponse(null, { status: 204 });
    const signal = AbortSignal.any([req.signal, AbortSignal.timeout(UPSTREAM_TIMEOUT_MS)]);
    const response = await fetch("https://generativelanguage.googleapis.com/v1beta/interactions", {
      method: "POST",
      signal,
      headers: { "x-goog-api-key": apiKey, "content-type": "application/json" },
      body: JSON.stringify({
        model,
        input: [{ type: "user_input", content: [{ type: "text", text }] }],
        response_format: { type: "audio", mime_type: "audio/wav" },
        generation_config: { speech_config: [{ voice }] },
        store: false,
      }),
    });
    if (!response.ok || !response.body) {
      cancelBody(response.body);
      console.warn(JSON.stringify({ evt: "ai_request", task: "visa_tts", provider: "google", model, status: "error", category: `http_${response.status}` }));
      return new NextResponse(null, { status: 204 });
    }
    const bytes = await readBoundedBytes(response.body, Math.ceil(MAX_AUDIO_BYTES * 4 / 3) + 64 * 1024, signal);
    const result = JSON.parse(new TextDecoder().decode(bytes)) as {
      steps?: { type: string; content?: { type: string; data?: string }[] }[];
    };
    const base64 = result.steps?.filter((step) => step.type === "model_output")
      .flatMap((step) => step.content ?? []).find((part) => part.type === "audio")?.data;
    const wav = typeof base64 === "string" ? Buffer.from(base64, "base64") : null;
    if (!wav || wav.length < 44 || wav.length > MAX_AUDIO_BYTES ||
        wav.toString("ascii", 0, 4) !== "RIFF" || wav.toString("ascii", 8, 12) !== "WAVE") {
      return new NextResponse(null, { status: 204 });
    }
    audio = wav;
    await logAIUsage({
      profileId,
      taskType: "visa_tts",
      provider: "google",
      model,
      promptTokens: 0,
      completionTokens: 0,
      costEstimate: 0,
      costStatus: "usage_unreported",
      status: "success",
    }).catch(() => console.warn("Visa TTS usage could not be recorded"));
    if (audio.byteLength <= 512 * 1024) {
      if (speechCache.size >= 8) {
        const oldest = speechCache.keys().next();
        if (!oldest.done) speechCache.delete(oldest.value);
      }
      speechCache.set(cacheKey, { audio, expiresAt: Date.now() + 3 * 60_000 });
    }
  }
  const audioBody = audio.buffer.slice(audio.byteOffset, audio.byteOffset + audio.byteLength) as ArrayBuffer;
  return new NextResponse(audioBody, {
    headers: {
      "content-type": "audio/wav",
      "content-length": String(audio.byteLength),
      "cache-control": "no-store",
      "x-tts-provider": "google",
      "x-tts-model": model,
    },
  });
}

export async function POST(req: Request) {
  try {
    const auth = await requireSession(req);
    if (!auth.ok) {
      return NextResponse.json({ error: auth.error, code: auth.code }, { status: auth.status });
    }
    const profileId = auth.session.profile.id;
    const limit = await checkSharedRateLimit(`visa:tts:${profileId}`, LIMITS.ai);
    if (!limit.ok) return rateLimitedResponse(limit.retryAfterSec);

    const parsed = await readJsonBody<{ text?: unknown; gender?: unknown }>(req, 32 * 1024);
    if (!parsed.ok) return NextResponse.json({ error: parsed.error }, { status: parsed.status });
    const rawText = typeof parsed.body?.text === "string" ? parsed.body.text.trim() : "";
    if (!rawText) return NextResponse.json({ error: "text is required." }, { status: 400 });
    const text = rawText.slice(0, MAX_TEXT_LENGTH);
    const gender: VisaOfficerGender = parsed.body?.gender === "female" ? "female" : "male";
    if (!process.env.OPENROUTER_TTS_MODEL?.trim()) {
      const disabled = parseDisabledProviders(await getStoredConfig(DISABLED_PROVIDERS_CONFIG_KEY).catch(() => null) ?? process.env.AI_PROVIDERS_DISABLED);
      const { apiKey } = disabled.includes("google") ? {} : await resolveProviderCredential("google");
      if (apiKey) {
        const model = process.env.GEMINI_TTS_MODEL?.trim() || GEMINI_MODELS.tts;
        if (!/^[A-Za-z0-9._-]{1,120}$/.test(model)) return new NextResponse(null, { status: 204 });
        return await googleSpeech(req, apiKey, model, profileId, gender, text);
      }
    }
    const fishVoice = gender === "female"
      ? process.env.OPENROUTER_TTS_VOICE_FEMALE?.trim()
      : process.env.OPENROUTER_TTS_VOICE_MALE?.trim();

    const apiKey = await openRouterKey();
    if (!apiKey) return new NextResponse(null, { status: 204 });

    // Official model card (verified 2026-10-22): https://openrouter.ai/fish-audio/s2.1-pro-free:free
    // Its current model slug is fish-audio/s2.1-pro-free:free.
    // The similarly named `fishaudio/fish-speech-2.1-pro:free` alias returned
    // 404 when checked on 2026-10-22, so do not add it as a retry candidate.
    const candidates = Array.from(new Set([
      process.env.OPENROUTER_TTS_MODEL?.trim(),
      OPENROUTER_MODEL_REGISTRY.speech.modelId,
    ].filter((model): model is string => typeof model === "string" && model.length > 0)))
      .map((model) => ({ provider: "openrouter" as const, model }));
    const deadline = Date.now() + UPSTREAM_TIMEOUT_MS;
    const retryableStatuses = new Set([400, 402, 404, 429, 500, 502, 503, 504]);

    for (const candidate of candidates) {
      const { provider, model } = candidate;
      if (!/^[A-Za-z0-9._:/@+-]{1,200}$/.test(model)) {
        console.warn(JSON.stringify({ evt: "ai_request", task: "visa_tts", provider, model: "invalid_model", status: "error", category: "configuration", costStatus: "usage_unreported" }));
        continue;
      }
      const remainingMs = deadline - Date.now();
      if (remainingMs <= 0) break;
      const controller = new AbortController();
      const upstreamStartedAt = Date.now();
      const timer = setTimeout(() => controller.abort(), remainingMs);
      try {
        const upstream = await fetch("https://openrouter.ai/api/v1/audio/speech", {
          method: "POST",
          signal: AbortSignal.any([controller.signal, req.signal]),
          headers: {
            authorization: `Bearer ${apiKey}`,
            "content-type": "application/json",
            accept: "audio/mpeg, application/octet-stream",
          },
          body: JSON.stringify({
            model,
            input: text,
            response_format: "mp3",
            ...(fishVoice ? { voice: fishVoice } : {}),
          }),
        });
        if (!upstream.ok || !upstream.body) {
          cancelBody(upstream.body);
          // Never log provider response bodies: they can contain sensitive data.
          console.warn(JSON.stringify({ evt: "ai_request", task: "visa_tts", provider, model, status: "error", category: `http_${upstream.status}${upstream.ok ? "_empty_body" : ""}`, latencyMs: Date.now() - upstreamStartedAt, costStatus: "usage_unreported" }));
          if (retryableStatuses.has(upstream.status) || (upstream.ok && !upstream.body)) continue;
          return new NextResponse(null, { status: 204 });
        }
        const contentType = upstream.headers.get("content-type")?.toLowerCase() ?? "";
        if (contentType && !contentType.startsWith("audio/") && contentType !== "application/octet-stream") {
          cancelBody(upstream.body);
          console.warn(JSON.stringify({ evt: "ai_request", task: "visa_tts", provider, model, status: "error", category: "invalid_content_type", latencyMs: Date.now() - upstreamStartedAt, costStatus: "usage_unreported" }));
          continue;
        }
        const lengthHeader = upstream.headers.get("content-length");
        if (lengthHeader && Number(lengthHeader) > MAX_AUDIO_BYTES) {
          cancelBody(upstream.body);
          console.warn(JSON.stringify({ evt: "ai_request", task: "visa_tts", provider, model, status: "error", category: "audio_too_large", latencyMs: Date.now() - upstreamStartedAt, costStatus: "usage_unreported" }));
          continue;
        }
        const audio = await readBoundedAudio(upstream.body, MAX_AUDIO_BYTES, AbortSignal.any([controller.signal, req.signal]));
        if (!audio) {
          console.warn(JSON.stringify({ evt: "ai_request", task: "visa_tts", provider, model, status: "error", category: "empty_or_oversize_audio", latencyMs: Date.now() - upstreamStartedAt, costStatus: "usage_unreported" }));
          continue;
        }
        console.info(JSON.stringify({
          evt: "ai_request",
          task: "visa_tts",
          provider,
          model,
          status: "ok",
          latencyMs: Date.now() - upstreamStartedAt,
          costStatus: "usage_unreported",
        }));
        const audioBody = audio.buffer.slice(audio.byteOffset, audio.byteOffset + audio.byteLength) as ArrayBuffer;
        return new NextResponse(audioBody, {
          status: 200,
          headers: {
            "content-type": "audio/mpeg",
            "content-length": String(audio.byteLength),
            "cache-control": "no-store",
            "x-tts-provider": provider,
            "x-tts-model": model,
          },
        });
      } catch (error) {
        // A transport/timeout failure is endpoint-wide, so do not duplicate the
        // same text in another model request after the shared 6s deadline.
        console.warn(JSON.stringify({ evt: "ai_request", task: "visa_tts", provider, model, status: "error", category: error instanceof Error && error.name === "AbortError" ? "timeout" : "transport", latencyMs: Date.now() - upstreamStartedAt, costStatus: "usage_unreported" }));
        break;
      } finally {
        clearTimeout(timer);
      }
    }
    return new NextResponse(null, { status: 204 });
  } catch (err) {
    console.error("POST /api/visa/tts error:", err instanceof Error ? err.name : "unknown");
    return new NextResponse(null, { status: 204 });
  }
}
