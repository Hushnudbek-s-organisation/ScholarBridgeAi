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
 * browser speech synthesis. Try the configured OpenRouter model and then the
 * verified free Fish Audio model, within one 6-second deadline; never switch
 * providers. The same-provider model retry stays bounded and status-only.
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
          // Never log provider response bodies: they can contain sensitive data.
          console.warn(JSON.stringify({ evt: "ai_request", task: "visa_tts", provider, model, status: "error", category: `http_${upstream.status}${upstream.ok ? "_empty_body" : ""}`, latencyMs: Date.now() - upstreamStartedAt, costStatus: "usage_unreported" }));
          if (retryableStatuses.has(upstream.status) || (upstream.ok && !upstream.body)) continue;
          return new NextResponse(null, { status: 204 });
        }
        const contentType = upstream.headers.get("content-type")?.toLowerCase() ?? "";
        if (contentType && !contentType.startsWith("audio/") && contentType !== "application/octet-stream") {
          console.warn(JSON.stringify({ evt: "ai_request", task: "visa_tts", provider, model, status: "error", category: "invalid_content_type", latencyMs: Date.now() - upstreamStartedAt, costStatus: "usage_unreported" }));
          continue;
        }
        const lengthHeader = upstream.headers.get("content-length");
        if (lengthHeader && Number(lengthHeader) > MAX_AUDIO_BYTES) {
          await upstream.body.cancel().catch(() => undefined);
          console.warn(JSON.stringify({ evt: "ai_request", task: "visa_tts", provider, model, status: "error", category: "audio_too_large", latencyMs: Date.now() - upstreamStartedAt, costStatus: "usage_unreported" }));
          continue;
        }
        const audio = await readBoundedAudio(upstream.body, MAX_AUDIO_BYTES);
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
