/** Same effective status in rows and summaries; self-confirmation is not review. */
export function effectiveDocumentStatus(
  doc: { status: string; expiresAt?: string | Date | null },
  reviewed = false,
  today = new Date().toISOString().slice(0, 10),
  hasReviewRecord = false,
): string {
  if (doc.status === "rejected") return "rejected";
  if (
    doc.expiresAt &&
    String(
      doc.expiresAt instanceof Date
        ? doc.expiresAt.toISOString()
        : doc.expiresAt,
    ).slice(0, 10) < today
  )
    return "expired";
  if (doc.status === "verified" && !reviewed) return hasReviewRecord ? "needs_update" : "self_confirmed";
  return doc.status;
}
export function safeDocumentUrl(value: unknown): string | null {
  if (value == null || value === "") return null;
  if (typeof value !== "string" || value.length > 600)
    throw new Error("Invalid document URL");
  const url = new URL(value);
  if (
    !["https:", "http:"].includes(url.protocol) ||
    url.username ||
    url.password
  )
    throw new Error("Invalid document URL");
  return url.toString();
}
