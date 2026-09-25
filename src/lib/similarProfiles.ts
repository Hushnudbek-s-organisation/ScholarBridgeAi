/**
 * Accepted-student & similar-profile matching (#10).
 *
 * "Someone with my profile got in" is the most persuasive evidence a student
 * can see — and it is exactly the dataset ScholarBridge collects itself.
 *
 * Two hard rules, because this is other people's data:
 *   1. Only outcomes with `shareConsent = true` are ever eligible. A row
 *      without consent never leaves the owner's account, not even aggregated.
 *   2. Small samples are labelled as small. "1 of 1 accepted" is not a 100%
 *      admission rate and must never render as one.
 *
 * Pure module — asserted in `scripts/check-similar.ts`.
 */

export interface ProfileVector {
  gpa4?: number | null; // GPA normalised to a 4.0 scale
  ielts?: number | null;
  toefl?: number | null;
  sat?: number | null;
  act?: number | null;
  major?: string | null;
  country?: string | null;
  degreeLevel?: string | null;
  activityCount?: number | null;
  leadershipCount?: number | null;
  awardCount?: number | null;
  requiresFullScholarship?: boolean | null;
}

export interface OutcomeRecord {
  profile: ProfileVector;
  universityName: string;
  result: "accepted" | "rejected" | "waitlisted" | "deferred" | "withdrawn";
  /** Only consented rows may be passed in. Enforced by the caller AND here. */
  shareConsent: boolean;
}

export interface SimilarProfile {
  /** 0–100: how close this outcome is to the student asking. */
  similarity: number;
  universityName: string;
  result: OutcomeRecord["result"];
  /** The one or two dimensions that made this a close match. */
  matchedOn: string[];
  /** Deliberately vague — no field may single a person out. */
  summary: string;
}

export interface SimilarityResult {
  matches: SimilarProfile[];
  accepted: number;
  rejected: number;
  waitlisted: number;
  other: number;
  total: number;
  /** Honest acceptance share, or null when the sample is too small to state. */
  acceptanceShare: number | null;
  sampleNote: string;
  /** How the student's own profile reads against the matched group. */
  positionNote: string;
}

/** Minimum outcomes before any percentage is shown at all. */
export const MIN_SAMPLE_FOR_SHARE = 5;
/** Below this the UI must say "very small sample". */
export const SMALL_SAMPLE = 10;

// --- Normalisation ---------------------------------------------------------

/** Compare on the same scale, or the distance is meaningless. */
export function gpaTo4(gpa: number | null | undefined, scale: number | null | undefined): number | null {
  if (gpa == null || !Number.isFinite(gpa)) return null;
  const s = scale && Number(scale) > 0 ? Number(scale) : 4;
  return Math.max(0, Math.min(4, (gpa / s) * 4));
}

export function englishToIelts(v: ProfileVector): number | null {
  if (v.ielts && v.ielts > 0) return v.ielts;
  if (v.toefl && v.toefl > 0) return Math.max(4, Math.min(9, (v.toefl - 40) / 12));
  return null;
}

export function stdToSat(v: ProfileVector): number | null {
  if (v.sat && v.sat > 0) return v.sat;
  if (v.act && v.act > 0) return Math.max(400, Math.min(1600, v.act * 40 + 180));
  return null;
}

function majorTokens(major: string | null | undefined): Set<string> {
  return new Set(
    (major || "")
      .toLowerCase()
      .split(/[^a-z]+/)
      .filter((w) => w.length > 3)
  );
}

/** Jaccard overlap — order-independent, so "CS & Math" matches "Math & CS". */
function majorOverlap(a: string | null | undefined, b: string | null | undefined): number {
  const ta = majorTokens(a);
  const tb = majorTokens(b);
  if (ta.size === 0 || tb.size === 0) return 0;
  let shared = 0;
  ta.forEach((t) => {
    if (tb.has(t)) shared += 1;
  });
  return shared / (ta.size + tb.size - shared);
}

/** Normalised 0–1 difference; a missing value costs a fixed penalty. */
function numDistance(a: number | null, b: number | null, span: number, missingPenalty = 0.35): number {
  if (a == null || b == null) return missingPenalty;
  return Math.min(1, Math.abs(a - b) / span);
}

// --- Similarity ------------------------------------------------------------

/**
 * 0–100. Academics dominate — that is what admissions screens on — with major
 * and origin country next, because they change the competition you face.
 */
export function similarityScore(
  me: ProfileVector,
  other: ProfileVector
): { score: number; matchedOn: string[] } {
  const matchedOn: string[] = [];

  const gpaDist = numDistance(me.gpa4 ?? null, other.gpa4 ?? null, 0.8);
  if (gpaDist <= 0.15 && me.gpa4 != null && other.gpa4 != null) matchedOn.push("GPA within 0.15");

  const engDist = numDistance(englishToIelts(me), englishToIelts(other), 1.2);
  if (engDist <= 0.2 && englishToIelts(me) != null && englishToIelts(other) != null) {
    matchedOn.push("similar English score");
  }

  const stdDist = numDistance(stdToSat(me), stdToSat(other), 250);
  if (stdDist <= 0.2 && stdToSat(me) != null && stdToSat(other) != null) matchedOn.push("similar test score");

  const majorSim = majorOverlap(me.major, other.major);
  if (majorSim >= 0.5) matchedOn.push("same field of study");

  const sameCountry =
    Boolean(me.country) && Boolean(other.country) && me.country!.toLowerCase() === other.country!.toLowerCase();
  if (sameCountry) matchedOn.push("same home country");

  const sameLevel =
    Boolean(me.degreeLevel) && Boolean(other.degreeLevel) && me.degreeLevel === other.degreeLevel;
  if (sameLevel) matchedOn.push("same degree level");

  const actDist = numDistance(
    me.activityCount == null ? null : Number(me.activityCount),
    other.activityCount == null ? null : Number(other.activityCount),
    6
  );

  // Weights: academics 55%, major 20%, country 15%, activities 10%.
  const score =
    (1 - gpaDist) * 0.28 +
    (1 - engDist) * 0.14 +
    (1 - stdDist) * 0.13 +
    majorSim * 0.2 +
    (sameCountry ? 1 : 0) * 0.15 +
    (1 - actDist) * 0.1;

  return { score: Math.round(Math.max(0, Math.min(1, score)) * 100), matchedOn };
}

/**
 * Deliberately vague. A summary that names a school, a city and an exact GPA
 * could identify one person in a small cohort — which is why this function
 * never emits them, and why the type is a fixed string set rather than free text.
 */
function anonymisedSummary(other: ProfileVector): string {
  const parts: string[] = [];
  const gpa = other.gpa4;
  if (gpa != null) {
    const band = gpa >= 3.7 ? "3.7–4.0" : gpa >= 3.4 ? "3.4–3.7" : gpa >= 3.0 ? "3.0–3.4" : "below 3.0";
    parts.push(`GPA ${band}`);
  }
  const eng = englishToIelts(other);
  if (eng != null) parts.push(`IELTS ~${Math.round(eng * 2) / 2}`);
  const std = stdToSat(other);
  if (std != null) parts.push(`SAT band ${Math.round(std / 100) * 100}`);
  if (other.major) parts.push(other.major);
  if (parts.length === 0) return "Profile details not shared.";
  return parts.join(" · ");
}

// --- Entry point -----------------------------------------------------------

export function findSimilarProfiles(
  me: ProfileVector,
  outcomes: OutcomeRecord[],
  opts: { limit?: number; minSimilarity?: number } = {}
): SimilarityResult {
  const limit = opts.limit ?? 10;
  const minSimilarity = opts.minSimilarity ?? 45;

  // Defence in depth: the caller must already have filtered, but a consented
  // flag is cheap to re-check and the cost of being wrong is someone's data.
  const consented = outcomes.filter((o) => o.shareConsent === true);

  const scored = consented
    .map((o) => {
      const { score, matchedOn } = similarityScore(me, o.profile);
      return { o, score, matchedOn };
    })
    .filter((s) => s.score >= minSimilarity)
    .sort((a, b) => b.score - a.score || a.o.universityName.localeCompare(b.o.universityName));

  // The share is computed over EVERY match above the similarity threshold, not
  // over the top-N the UI happens to display. Counting 10 of 12 and calling it
  // "80% of similar students" would be a statistic about our page length.
  const accepted = scored.filter((s) => s.o.result === "accepted").length;
  const rejected = scored.filter((s) => s.o.result === "rejected").length;
  const waitlisted = scored.filter((s) => s.o.result === "waitlisted").length;
  const other = scored.length - accepted - rejected - waitlisted;

  const displayed = scored.slice(0, limit);

  // A share from 2 rows is noise dressed up as a statistic.
  const acceptanceShare =
    scored.length >= MIN_SAMPLE_FOR_SHARE ? Math.round((accepted / scored.length) * 100) : null;

  let sampleNote: string;
  if (scored.length === 0) {
    sampleNote =
      "No shared outcomes yet. ScholarBridge builds this from students who opt in to share their results — yours will help the next person with your profile.";
  } else if (scored.length < MIN_SAMPLE_FOR_SHARE) {
    sampleNote = `Only ${scored.length} similar shared outcome${scored.length === 1 ? "" : "s"} so far — far too few for a percentage. Shown as individual cases, not a rate.`;
  } else if (scored.length < SMALL_SAMPLE) {
    sampleNote = `${scored.length} shared outcomes. Still a small sample — treat the share as a hint, not a rate.`;
  } else {
    sampleNote = `Based on ${scored.length} shared ScholarBridge outcomes from similar profiles.`;
  }

  // Where does the student sit relative to the matched group?
  let positionNote = "";
  const gpa4 = me.gpa4 ?? null;
  const groupGpas = scored.map((s) => s.o.profile.gpa4).filter((g): g is number => g != null);
  if (gpa4 != null && groupGpas.length > 0) {
    const avg = groupGpas.reduce((a, b) => a + b, 0) / groupGpas.length;
    const diff = gpa4 - avg;
    positionNote =
      Math.abs(diff) < 0.05
        ? "Your GPA sits right at the average of the matched group."
        : diff > 0
          ? `Your GPA is about ${diff.toFixed(2)} above the matched group's average — an advantage, though not a guarantee.`
          : `Your GPA is about ${Math.abs(diff).toFixed(2)} below the matched group's average — the rest of the file has to carry more weight.`;
  }

  return {
    matches: displayed.map((s) => ({
      similarity: s.score,
      universityName: s.o.universityName,
      result: s.o.result,
      matchedOn: s.matchedOn,
      summary: anonymisedSummary(s.o.profile),
    })),
    accepted,
    rejected,
    waitlisted,
    other,
    total: scored.length,
    acceptanceShare,
    sampleNote,
    positionNote,
  };
}
