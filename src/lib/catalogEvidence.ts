/** Evidence policy for programme-level facts, not proof that a URL was fetched. */
export function hasSpecificEvidenceUrl(raw: string | null | undefined): boolean {
  if (!raw) return false;
  try {
    const url = new URL(raw);
    return ["http:", "https:"].includes(url.protocol) && url.pathname.replace(/\/+$/, "").length > 0;
  } catch {
    return false;
  }
}

export function hasVerifiedProgramEvidence(row: {
  verificationStatus?: string | null;
  isVerified?: boolean | null;
  sourceUrl?: string | null;
}): boolean {
  return row.verificationStatus === "verified" && row.isVerified !== false && hasSpecificEvidenceUrl(row.sourceUrl);
}
