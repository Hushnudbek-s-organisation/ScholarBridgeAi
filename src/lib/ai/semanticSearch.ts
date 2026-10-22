import { cosineSimilarity, embedTexts } from "@/lib/ai/embeddings";
import { haveCompatibleEmbeddingDimensions, isUsefulSemanticQuery } from "@/lib/ai/semanticQuery";
export { isUsefulSemanticQuery } from "@/lib/ai/semanticQuery";

/** Best-effort multilingual vector retrieval. Provider failures are surfaced to
 * the caller so it can retain its deterministic lexical/profile ordering. */

export async function rankSemanticTexts(query: string, candidates: string[], options: {
  profileId?: number | null;
  timeoutMs?: number;
  limit?: number;
} = {}): Promise<Array<{ index: number; text: string; similarity: number }>> {
  const safeQuery = query.trim().slice(0, 2_000);
  if (!isUsefulSemanticQuery(safeQuery)) return [];
  const indexed = candidates
    .map((text, index) => ({ index, text: text.trim().slice(0, 12_000) }))
    .filter(({ text }) => text.length > 0)
    .slice(0, 63);
  if (!safeQuery || indexed.length === 0) return [];
  const vectors = await embedTexts([safeQuery, ...indexed.map(({ text }) => text)], options);
  const queryVector = vectors[0];
  // A single model call must yield one non-empty vector space for the query
  // and every candidate. Cosine similarity normalizes vector magnitudes
  // internally, so provider-side normalized vectors are not required.
  if (!haveCompatibleEmbeddingDimensions(vectors)) {
    throw new Error("Embedding vectors must have matching non-zero dimensions");
  }
  return indexed.map((candidate, index) => ({
    ...candidate,
    similarity: cosineSimilarity(queryVector, vectors[index + 1]),
  })).sort((a, b) => b.similarity - a.similarity || a.index - b.index)
    .slice(0, Math.max(1, Math.min(options.limit ?? 10, indexed.length)));
}
