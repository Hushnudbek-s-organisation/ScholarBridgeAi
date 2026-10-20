import { NextResponse } from "next/server";
import { requireSession } from "@/lib/auth";
import { checkSharedRateLimit } from "@/lib/rate-limit-shared";
import { LIMITS, rateLimitedResponse } from "@/lib/rate-limit";
import { readJsonBody } from "@/lib/request";
import { matchMultimodalDocumentReadiness, embedTexts } from "@/lib/ai/embeddings";
import { OPENROUTER_MODELS } from "@/lib/ai/openrouterModels";

export const dynamic = "force-dynamic";

const MAX_INPUT_CHARS = 12_000;
const MAX_ITEMS = 8;

type ImageContent = { type: "image_url"; image_url: { url: string } };
type TextContent = { type: "text"; text: string };
type MultimodalInput = { content: Array<ImageContent | TextContent> };

function validMultimodalInput(value: unknown): value is MultimodalInput {
  if (!value || typeof value !== "object" || !Array.isArray((value as MultimodalInput).content)) return false;
  const content = (value as MultimodalInput).content;
  if (content.length < 1 || content.length > 4) return false;
  return content.every((part) => {
    if (!part || typeof part !== "object") return false;
    if ((part as TextContent).type === "text") {
      return typeof (part as TextContent).text === "string" && (part as TextContent).text.length <= MAX_INPUT_CHARS;
    }
    if ((part as ImageContent).type !== "image_url") return false;
    const url = (part as ImageContent).image_url?.url;
    if (typeof url !== "string" || url.length > 5_500_000) return false;
    if (url.startsWith("data:image/")) return /^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/=]+$/.test(url);
    try { return new URL(url).protocol === "https:"; } catch { return false; }
  });
}

export async function POST(req: Request) {
  const auth = await requireSession(req);
  if (!auth.ok) return NextResponse.json({ error: auth.error, code: auth.code }, { status: auth.status });
  const limit = await checkSharedRateLimit(`ai:embeddings:${auth.session.profile.id}`, LIMITS.ai);
  if (!limit.ok) return rateLimitedResponse(limit.retryAfterSec);

  const parsed = await readJsonBody<Record<string, unknown>>(req, 6 * 1024 * 1024);
  if (!parsed.ok) return NextResponse.json({ error: parsed.error }, { status: parsed.status });
  const kind = parsed.body.kind === "multimodal" ? "multimodal" : "text";
  const input = parsed.body.input;
  let safeInput: string | string[] | MultimodalInput[];
  let model: string;

  if (kind === "text") {
    const inputs = typeof input === "string" ? [input] : input;
    if (!Array.isArray(inputs) || inputs.length < 1 || inputs.length > MAX_ITEMS ||
      !inputs.every((item) => typeof item === "string" && item.trim().length > 0 && item.length <= MAX_INPUT_CHARS)) {
      return NextResponse.json({ error: `input must be text or an array of 1–${MAX_ITEMS} text items (max ${MAX_INPUT_CHARS} characters each).` }, { status: 400 });
    }
    safeInput = typeof input === "string" ? input.trim() : inputs.map((item) => item.trim());
    model = process.env.OPENROUTER_EMBEDDING_MODEL?.trim() || OPENROUTER_MODELS.textEmbedding;
  } else {
    if (!Array.isArray(input) || input.length < 1 || input.length > MAX_ITEMS || !input.every(validMultimodalInput)) {
      return NextResponse.json({ error: "Multimodal input must be an array of up to 8 content objects with text and/or HTTPS image URLs (or small base64 PNG/JPEG/WebP images)." }, { status: 400 });
    }
    safeInput = input as MultimodalInput[];
    model = process.env.OPENROUTER_VL_EMBEDDING_MODEL?.trim() || OPENROUTER_MODELS.multimodalEmbedding;
  }

  try {
    const result = kind === "text"
      ? {
          model,
          data: await embedTexts(typeof safeInput === "string" ? [safeInput] : safeInput as string[], { profileId: auth.session.profile.id, timeoutMs: 3_500 })
            .then((vectors) => vectors.map((embedding) => ({ embedding }))),
        }
      : {
          model,
          readinessDisclaimer: "Semantic similarity is a non-verifying aid only; it does not establish document authenticity, completeness, or official acceptance.",
          data: await Promise.all((safeInput as MultimodalInput[]).map(async (document) => {
            const text = document.content.filter((part): part is TextContent => part.type === "text").map((part) => part.text).join("\n");
            const imageUrlOrDataUri = document.content.find((part): part is ImageContent => part.type === "image_url")?.image_url.url;
            try {
              const result = await matchMultimodalDocumentReadiness({ text, imageUrlOrDataUri, timeoutMs: 3_500 });
              return { available: true, embedding: result.embedding, matches: result.matches };
            } catch {
              // Multimodal availability is advisory; other documents and the
              // rest of the application continue when the provider is down.
              return { available: false, embedding: null, matches: [] };
            }
          })),
        };
    return NextResponse.json(result, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    const code = message.match(/\((\d{3})\)$/)?.[1];
    const status = code ? Number(code) : 502;
    console.warn("AI embeddings request failed:", status);
    return NextResponse.json({ error: "Embedding service is temporarily unavailable." }, { status: status >= 400 && status < 500 ? status : 502 });
  }
}
