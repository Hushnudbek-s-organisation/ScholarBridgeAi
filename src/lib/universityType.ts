/** Public/Private filters are a comparison, never an inference. */
export function matchesUniversityType(
  publishedType: string | null | undefined,
  requestedType: string | null | undefined,
): boolean {
  if (requestedType !== "Public" && requestedType !== "Private") return true;
  if (typeof publishedType !== "string" || !publishedType.trim()) return false;
  return publishedType.trim().toLocaleLowerCase().includes(requestedType.toLocaleLowerCase());
}
