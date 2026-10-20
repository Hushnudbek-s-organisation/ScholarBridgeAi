import { createHash } from "node:crypto";
import { callOpenRouterEmbeddings, OPENROUTER_MODELS } from "@/lib/ai/openrouterModels";

const LRU_LIMIT = 512;
const DEFAULT_TIMEOUT_MS = 3_500;
const textVectorCache = new Map<string, number[]>();

function normalizeText(value: string): string {
  return value.normalize("NFC").trim().toLocaleLowerCase().replace(/\s+/g, " ");
}

function cacheKey(model: string, text: string): string {
  return createHash("sha256").update(`${model}\0${normalizeText(text)}`).digest("hex");
}

function remember(key: string, vector: number[]): void {
  textVectorCache.delete(key);
  textVectorCache.set(key, vector);
  while (textVectorCache.size > LRU_LIMIT) {
    const oldest = textVectorCache.keys().next().value;
    if (oldest === undefined) break;
    textVectorCache.delete(oldest);
  }
}

/**
 * Create multilingual text embeddings. Identical normalized strings are
 * cached in a process-local LRU; a cold/serverless instance simply re-embeds.
 * This cache is an optimization, never storage or a correctness dependency.
 */
export async function embedTexts(
  texts: string[],
  options: { profileId?: number | null; timeoutMs?: number } = {},
): Promise<number[][]> {
  if (!Array.isArray(texts) || texts.length < 1 || texts.length > 64) throw new Error("Provide between 1 and 64 texts");
  if (texts.some((text) => typeof text !== "string" || !text.trim() || text.length > 12_000)) throw new Error("Each text must be non-empty and at most 12,000 characters");
  const model = process.env.OPENROUTER_EMBEDDING_MODEL?.trim() || OPENROUTER_MODELS.textEmbedding;
  const keys = texts.map((text) => cacheKey(model, text));
  const vectors: Array<number[] | undefined> = keys.map((key) => {
    const hit = textVectorCache.get(key);
    if (!hit) return undefined;
    textVectorCache.delete(key);
    textVectorCache.set(key, hit);
    return hit;
  });
  const missingIndexes = vectors.flatMap((vector, index) => vector ? [] : [index]);
  if (missingIndexes.length) {
    const response = await callOpenRouterEmbeddings({
      model,
      input: missingIndexes.map((index) => texts[index]),
      timeoutMs: options.timeoutMs ?? DEFAULT_TIMEOUT_MS,
    });
    if (response.data.length !== missingIndexes.length) throw new Error("OpenRouter returned an unexpected embedding count");
    missingIndexes.forEach((inputIndex, responseIndex) => {
      const embedding = response.data[responseIndex]?.embedding;
      if (!embedding?.length || embedding.some((value) => !Number.isFinite(value))) throw new Error("OpenRouter returned an invalid vector");
      vectors[inputIndex] = embedding;
      remember(keys[inputIndex], embedding);
    });
  }
  void options.profileId; // Caller identity is accepted for API parity; never used as a cache key or persisted.
  return vectors as number[][];
}

export function cosineSimilarity(a: number[], b: number[]): number {
  if (!Array.isArray(a) || !Array.isArray(b) || a.length === 0 || a.length !== b.length) return 0;
  let dot = 0;
  let normA = 0;
  let normB = 0;
  for (let i = 0; i < a.length; i++) {
    const x = a[i];
    const y = b[i];
    if (!Number.isFinite(x) || !Number.isFinite(y)) return 0;
    dot += x * y;
    normA += x * x;
    normB += y * y;
  }
  return normA === 0 || normB === 0 ? 0 : dot / Math.sqrt(normA * normB);
}

const DOCUMENT_READINESS_REFERENCES = [
  { key: "passport_identity", text: "Official passport or travel identity document showing the applicant's name, photograph, and identity details." },
  { key: "academic_transcript", text: "Academic transcript, school record, diploma, or degree certificate listing courses, grades, or completed qualifications." },
  { key: "language_test", text: "Official English-language proficiency test score report such as IELTS, TOEFL, or Duolingo English Test." },
  { key: "resume_cv", text: "Curriculum vitae or resume describing education, activities, work history, and skills." },
  { key: "statement_of_purpose", text: "Statement of purpose, personal statement, motivation letter, or application essay written by the student." },
  { key: "recommendation_letter", text: "Letter of recommendation or reference written by a teacher, professor, or supervisor." },
  { key: "financial_evidence", text: "Bank statement, sponsorship letter, scholarship award letter, or other financial support evidence." },
] as const;

export async function matchMultimodalDocumentReadiness(input: {
  text?: string;
  imageUrlOrDataUri?: string;
  title?: string;
  docType?: string;
  timeoutMs?: number;
}): Promise<{ embedding: number[]; matches: Array<{ key: string; similarityPercent: number }> }> {
  const content: Array<Record<string, unknown>> = [];
  const title = typeof input.title === "string" ? input.title.trim().slice(0, 200) : "";
  const docType = typeof input.docType === "string" ? input.docType.trim().slice(0, 100) : "";
  const text = typeof input.text === "string" ? input.text.trim().slice(0, 12_000) : "";
  const context = [title && `Title: ${title}`, docType && `Document type: ${docType}`, text].filter(Boolean).join("\n");
  if (context) content.push({ type: "text", text: context });
  const image = input.imageUrlOrDataUri?.trim();
  if (image) {
    if (image.length > 5_500_000) throw new Error("Image data is too large");
    let valid = false;
    if (image.startsWith("data:image/")) valid = /^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/=]+$/.test(image);
    else {
      try { valid = new URL(image).protocol === "https:"; } catch { valid = false; }
    }
    if (!valid) throw new Error("Image must be an HTTPS URL or a PNG/JPEG/WebP data URI");
    content.push({ type: "image_url", image_url: { url: image } });
  }
  if (content.length === 0) throw new Error("Provide document text or an image");
  const model = process.env.OPENROUTER_VL_EMBEDDING_MODEL?.trim() || OPENROUTER_MODELS.multimodalEmbedding;
  const response = await callOpenRouterEmbeddings({
    model,
    input: [
      { content },
      ...DOCUMENT_READINESS_REFERENCES.map((reference) => ({ content: [{ type: "text", text: reference.text }] })),
    ],
    timeoutMs: input.timeoutMs ?? DEFAULT_TIMEOUT_MS,
  });
  if (response.data.length !== DOCUMENT_READINESS_REFERENCES.length + 1) throw new Error("OpenRouter returned an unexpected readiness vector count");
  const embedding = response.data[0]?.embedding;
  if (!embedding?.length || embedding.some((value) => !Number.isFinite(value))) throw new Error("OpenRouter returned an invalid document vector");
  const matches = DOCUMENT_READINESS_REFERENCES.map((reference, index) => ({
    key: reference.key,
    similarityPercent: Math.round(Math.max(0, Math.min(1, cosineSimilarity(embedding, response.data[index + 1].embedding))) * 100),
  })).sort((a, b) => b.similarityPercent - a.similarityPercent);
  return { embedding, matches };
}

export async function embedMultimodalDocument(input: {
  text?: string;
  imageUrlOrDataUri?: string;
  title?: string;
  docType?: string;
  timeoutMs?: number;
}): Promise<number[]> {
  const content: Array<Record<string, unknown>> = [];
  const title = typeof input.title === "string" ? input.title.trim().slice(0, 200) : "";
  const docType = typeof input.docType === "string" ? input.docType.trim().slice(0, 100) : "";
  const text = typeof input.text === "string" ? input.text.trim().slice(0, 12_000) : "";
  const context = [title && `Title: ${title}`, docType && `Document type: ${docType}`, text].filter(Boolean).join("\n");
  if (context) content.push({ type: "text", text: context });
  const image = input.imageUrlOrDataUri?.trim();
  if (image) {
    if (image.length > 5_500_000) throw new Error("Image data is too large");
    let valid = false;
    if (image.startsWith("data:image/")) valid = /^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/=]+$/.test(image);
    else {
      try { valid = new URL(image).protocol === "https:"; } catch { valid = false; }
    }
    if (!valid) throw new Error("Image must be an HTTPS URL or a PNG/JPEG/WebP data URI");
    content.push({ type: "image_url", image_url: { url: image } });
  }
  if (content.length === 0) throw new Error("Provide document text or an image");
  const model = process.env.OPENROUTER_VL_EMBEDDING_MODEL?.trim() || OPENROUTER_MODELS.multimodalEmbedding;
  const response = await callOpenRouterEmbeddings({
    model,
    input: [{ content }],
    timeoutMs: input.timeoutMs ?? DEFAULT_TIMEOUT_MS,
  });
  const vector = response.data[0]?.embedding;
  if (!vector?.length || vector.some((value) => !Number.isFinite(value))) throw new Error("OpenRouter returned an invalid document vector");
  return vector;
}

export function clearEmbeddingCacheForTests(): void {
  textVectorCache.clear();
}
