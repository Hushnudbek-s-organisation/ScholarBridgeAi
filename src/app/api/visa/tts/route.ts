import { NextResponse } from "next/server";
import { requireSession } from "@/lib/auth";
import { OPENROUTER_MODEL_REGISTRY } from "@/lib/ai/openrouterModelIds";
import { openRouterKey } from "@/lib/ai/openrouterModels";
import { LIMITS, rateLimitedResponse } from "@/lib/rate-limit";
import { checkSharedRateLimit } from "@/lib/rate-limit-shared";
import { readJsonBody } from "@/lib/request";
import type { VisaOfficerGender } from "@/lib/visa-interview";

/**
 * POST /api/visa/tts — optional neural voice upgrade for the consular officer.
 *
 * Returns audio/mpeg bytes, or 204 when unavailable. The client falls back to
 * browser speech synthesis. This endpoint makes one configured OpenRouter
 * request only: it does not silently switch models/providers after a failure.
 * The selected speech capability and OpenRouter audio-speech endpoint are
 * recorded together in the verified model registry; a provider outage or an
 * incompatible operator override still produces 204 so the browser can fall back.
 */
export const dynamic = "force-dynamic";

const MAX_TEXT_LENGTH = 4096;
const MAX_AUDIO_BYTES = 8 * 1024 * 1024;
const UPSTREAM_TIMEOUT_MS = OPENROUTER_MODEL_REGISTRY.speech.timeoutMs;

async function readBoundedAudio(body: ReadableStream<Uint8Array>, maxBytes: number): Promise<Uint8Array | null> {
  const reader = body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      total += value.byteLength;
      if (total > maxBytes) {
        await reader.cancel().catch(() => undefined);
        return null;
      }
      chunks.push(value);
    }
  } finally {
    reader.releaseLock();
  }
  const audio = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    audio.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return audio.byteLength ? audio : null;
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
    const fishVoice = gender === "female"
      ? process.env.OPENROUTER_TTS_VOICE_FEMALE?.trim()
      : process.env.OPENROUTER_TTS_VOICE_MALE?.trim();

    const apiKey = await openRouterKey();
    if (!apiKey) return new NextResponse(null, { status: 204 });

    const configuredModel = process.env.OPENROUTER_TTS_MODEL?.trim();
    const model = configuredModel || OPENROUTER_MODEL_REGISTRY.speech.modelId;
    if (!/^[A-Za-z0-9._:/@+-]{1,200}$/.test(model)) {
      console.warn(JSON.stringify({ evt: "ai_request", task: "visa_tts", provider: "openrouter", model: "invalid_model", status: "error", category: "configuration", costStatus: "usage_unreported" }));
      return new NextResponse(null, { status: 204 });
    }
    const controller = new AbortController();
    const upstreamStartedAt = Date.now();
    const timer = setTimeout(() => controller.abort(), UPSTREAM_TIMEOUT_MS);
    try {
      const upstream = await fetch("https://openrouter.ai/api/v1/audio/speech", {
        method: "POST",
        signal: controller.signal,
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
        // Status only: upstream error text can contain sensitive data. No retry
        // for invalid key/model/request; the browser voice is the safe fallback.
        console.warn(JSON.stringify({ evt: "ai_request", task: "visa_tts", provider: "openrouter", model, status: "error", category: `http_${upstream.status}`, latencyMs: Date.now() - upstreamStartedAt, costStatus: "usage_unreported" }));
        return new NextResponse(null, { status: 204 });
      }
      const contentType = upstream.headers.get("content-type")?.toLowerCase() ?? "";
      if (contentType && !contentType.startsWith("audio/") && contentType !== "application/octet-stream") {
        console.warn(JSON.stringify({ evt: "ai_request", task: "visa_tts", provider: "openrouter", model, status: "error", category: "invalid_content_type", latencyMs: Date.now() - upstreamStartedAt, costStatus: "usage_unreported" }));
        return new NextResponse(null, { status: 204 });
      }
      const lengthHeader = upstream.headers.get("content-length");
      if (lengthHeader && Number(lengthHeader) > MAX_AUDIO_BYTES) {
        await upstream.body.cancel().catch(() => undefined);
        console.warn(JSON.stringify({ evt: "ai_request", task: "visa_tts", provider: "openrouter", model, status: "error", category: "audio_too_large", latencyMs: Date.now() - upstreamStartedAt, costStatus: "usage_unreported" }));
        return new NextResponse(null, { status: 204 });
      }
      const audio = await readBoundedAudio(upstream.body, MAX_AUDIO_BYTES);
      if (!audio) {
        console.warn(JSON.stringify({ evt: "ai_request", task: "visa_tts", provider: "openrouter", model, status: "error", category: "empty_or_oversize_audio", latencyMs: Date.now() - upstreamStartedAt, costStatus: "usage_unreported" }));
        return new NextResponse(null, { status: 204 });
      }
      console.info(JSON.stringify({
        evt: "ai_request",
        task: "visa_tts",
        provider: "openrouter",
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
          "x-tts-provider": "openrouter",
          "x-tts-model": model,
        },
      });
    } catch (error) {
      // Do not expose provider details or attempt another provider/model.
      console.warn(JSON.stringify({ evt: "ai_request", task: "visa_tts", provider: "openrouter", model, status: "error", category: error instanceof Error && error.name === "AbortError" ? "timeout" : "transport", latencyMs: Date.now() - upstreamStartedAt, costStatus: "usage_unreported" }));
      return new NextResponse(null, { status: 204 });
    } finally {
      clearTimeout(timer);
    }
  } catch (err) {
    console.error("POST /api/visa/tts error:", err instanceof Error ? err.name : "unknown");
    return new NextResponse(null, { status: 204 });
  }
}
