/**
 * Narrow allowlist for the public, read-only parent-share response.
 *
 * Keep this model factual: it contains only profile context and counts derived
 * from the student's application tracker. It does not rate readiness, infer
 * deadline urgency, expose private application details, or estimate outcomes.
 * Pure module — asserted in `scripts/check-parent.ts`.
 */
export interface ParentSource {
  studentFirstName?: string | null;
  degreeLevel?: string | null;
  targetMajor?: string | null;
  targetCountries?: string | null;
  applicationCount?: number | null;
  submittedCount?: number | null;
  acceptedCount?: number | null;
}

export interface ParentSummary {
  studentFirstName: string | null;
  profileContext: {
    degreeLevel: string | null;
    targetMajor: string | null;
    targetCountries: string | null;
  };
  applicationRecords: {
    total: number;
    submittedOrLater: number;
    studentReportedAcceptedOutcomes: number;
  };
}

function cleanText(value: string | null | undefined, maxLength = 200): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim().slice(0, maxLength);
  return trimmed || null;
}

function count(value: number | null | undefined): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? Math.floor(parsed) : 0;
}

/** Build only the fields the student explicitly exposes through the share link. */
export function buildParentSummary(src: ParentSource): ParentSummary {
  const total = count(src.applicationCount);
  return {
    studentFirstName: cleanText(src.studentFirstName, 80),
    profileContext: {
      degreeLevel: cleanText(src.degreeLevel, 80),
      targetMajor: cleanText(src.targetMajor, 200),
      targetCountries: cleanText(src.targetCountries, 400),
    },
    applicationRecords: {
      total,
      submittedOrLater: Math.min(total, count(src.submittedCount)),
      studentReportedAcceptedOutcomes: Math.min(total, count(src.acceptedCount)),
    },
  };
}

/**
 * Generate the share URL from the request's trusted origin and a CSPRNG token.
 * The token is a bearer credential: callers must not log or expose it elsewhere.
 */
export function parentShareLink(baseUrl: string, token: string): string {
  const base = String(baseUrl || "").replace(/\/+$/, "");
  return `${base}/parent/${encodeURIComponent(token)}`;
}
