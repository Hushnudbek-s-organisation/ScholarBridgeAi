/** Practice prompts are educational content, never government requirements. */
export function isPracticeVisaContent(row: { visaType?: string | null; sourceType?: string | null; title?: string | null }): boolean {
  return row.sourceType === "teaching_material" || /interview\s+q&a/i.test(row.visaType ?? "") || /^Interview Q&A\s+\d+/i.test(row.title ?? "");
}
export function validVisaSourceUrl(value: unknown): value is string {
  if (typeof value !== "string" || /[\s\\]/.test(value) || !/^https?:\/\//.test(value)) return false;
  try {
    const url = new URL(value);
    return Boolean(url.hostname.includes(".") && !url.username && !url.password && !/https?:/i.test(url.pathname + url.search));
  } catch { return false; }
}
/** ISO calendar dates or ISO timestamps only; Date.parse alone normalizes
 * February 30 and accepts ambiguous strings such as "03/04/26". */
export function validEvidenceDate(value: unknown, now = new Date()): boolean {
  if (value instanceof Date) return Number.isFinite(value.getTime()) && value.getTime() <= now.getTime();
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}(?:T\d{2}:\d{2}:\d{2}(?:\.\d{1,3})?(?:Z|[+-]\d{2}:\d{2}))?$/.test(value)) return false;
  const [year, month, day] = value.slice(0, 10).split("-").map(Number);
  const calendar = new Date(`${value.slice(0, 10)}T00:00:00Z`);
  const parsed = new Date(value);
  return calendar.getUTCFullYear() === year && calendar.getUTCMonth() === month - 1 && calendar.getUTCDate() === day
    && Number.isFinite(parsed.getTime()) && parsed.getTime() <= now.getTime();
}

export type VisaEvidenceFields = {
  sourceUrl: string | null; sourceName: string | null; sourceType: string | null;
  lastVerifiedAt: Date | null; verificationStatus: "verified" | "needs_review" | "outdated" | "unverified";
};
type VisaEvidenceContext = { visaType?: string | null; title?: string | null } & Partial<Omit<VisaEvidenceFields, "lastVerifiedAt" | "verificationStatus">> & {
  lastVerifiedAt?: string | Date | null; verificationStatus?: string | null;
};
/** POST and PATCH share the same validation of the FINAL merged state.
 * URL syntax/date validity is necessary evidence metadata, not source review.
 * Explicit null clears draft dates rather than producing an Invalid Date.
 */
export function validateVisaEvidenceWrite(input: Record<string, unknown>, context: VisaEvidenceContext, now = new Date()):
  { ok: true; evidence: VisaEvidenceFields } | { ok: false; error: string } {
  const source: Record<string, string | null> = {};
  for (const [key, limit] of [["sourceUrl", 800], ["sourceName", 160], ["sourceType", 80]] as const) {
    const value = input[key] === undefined ? context[key] : input[key];
    if (value != null && (typeof value !== "string" || value.length > limit)) return { ok: false, error: `Invalid ${key}` };
    source[key] = typeof value === "string" ? value.trim() || null : null;
  }
  if (source.sourceUrl !== null && !validVisaSourceUrl(source.sourceUrl)) return { ok: false, error: "sourceUrl must be a single valid HTTP(S) URL" };
  const rawDate = input.lastVerifiedAt === undefined ? context.lastVerifiedAt : input.lastVerifiedAt;
  if (rawDate != null && !validEvidenceDate(rawDate, now)) return { ok: false, error: "lastVerifiedAt must be a real ISO date not in the future, or null" };
  const status = input.verificationStatus === undefined ? context.verificationStatus ?? "unverified" : input.verificationStatus;
  if (status !== "verified" && status !== "needs_review" && status !== "outdated" && status !== "unverified") return { ok: false, error: "Invalid verificationStatus" };
  const evidence: VisaEvidenceFields = { sourceUrl: source.sourceUrl, sourceName: source.sourceName, sourceType: source.sourceType,
    lastVerifiedAt: rawDate == null ? null : new Date(rawDate as string | Date), verificationStatus: status };
  if (status === "verified" && (!evidence.sourceUrl || !evidence.lastVerifiedAt || isPracticeVisaContent({ ...context, ...evidence }))) {
    return { ok: false, error: "Verified requirements need a valid source and date; practice is not government guidance" };
  }
  return { ok: true, evidence };
}
export function projectVisaEvidence<T extends { visaType?: string | null; sourceType?: string | null; title?: string | null; sourceUrl?: string | null; lastVerifiedAt?: string | Date | null; verificationStatus?: string | null; isRequired?: boolean }>(row: T) {
  const practice = isPracticeVisaContent(row);
  const sourced = validVisaSourceUrl(row.sourceUrl);
  return { ...row,
    sourceUrl: practice || !sourced ? null : row.sourceUrl,
    lastVerifiedAt: practice ? null : row.lastVerifiedAt,
    isRequired: practice ? false : row.isRequired,
    verificationStatus: practice ? "needs_review" : row.verificationStatus === "verified" && (!sourced || !validEvidenceDate(row.lastVerifiedAt)) ? "unverified" : row.verificationStatus,
    contentKind: practice ? "practice" as const : "requirement" as const,
  };
}
