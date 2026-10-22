/** Short keyword fragments rarely benefit from vector retrieval; deterministic catalogue matching handles them. */
export function isUsefulSemanticQuery(query: string): boolean {
  const meaningful = query.normalize("NFKC").replace(/[^\p{L}\p{N}]/gu, "");
  return Array.from(meaningful).length >= 4;
}

/** All vectors in one query/candidate batch must inhabit the same non-empty space. */
export function haveCompatibleEmbeddingDimensions(vectors: readonly number[][]): boolean {
  if (vectors.length < 2 || !vectors[0]?.length) return false;
  const dimension = vectors[0].length;
  return vectors.every((vector) => vector.length === dimension && vector.every(Number.isFinite));
}
