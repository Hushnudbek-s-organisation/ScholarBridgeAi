import { hasSpecificEvidenceUrl } from "./catalogEvidence";

type GrantEvidence = {
  id: number;
  saved?: boolean;
  verificationStatus: string;
  sourceUrl: string | null;
  lastVerifiedAt: string | null;
  deadlineDate: string | null;
};

export function selectSchollyDailyGrant<T extends GrantEvidence>(grants: readonly T[], day: string): T | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(day)) return null;
  const timestamp = Date.parse(day);
  if (!Number.isFinite(timestamp) || new Date(timestamp).toISOString().slice(0, 10) !== day) return null;

  const eligible = grants.filter((grant) =>
    !grant.saved
    && grant.verificationStatus === "verified"
    && hasSpecificEvidenceUrl(grant.sourceUrl)
    && grant.lastVerifiedAt != null
    && Number.isFinite(Date.parse(grant.lastVerifiedAt))
    && (grant.deadlineDate == null || grant.deadlineDate.slice(0, 10) >= day)
  ).sort((a, b) => a.id - b.id);

  if (!eligible.length) return null;
  const offset = Math.floor(timestamp / 86_400_000);
  return eligible[((offset % eligible.length) + eligible.length) % eligible.length];
}
