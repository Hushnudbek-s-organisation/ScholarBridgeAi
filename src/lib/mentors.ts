/**
 * Mentor Marketplace matching (Phase 4).
 *
 * A mentor is worth talking to because they walked the SAME path: the same
 * country, the same university, often the same scholarship. That lived
 * experience is the one thing a rules engine cannot generate, so the matching
 * has to be precise about WHY each mentor was suggested — a student who cannot
 * see the reason will not trust the introduction.
 *
 * Verification is never optional in the ordering: an unverified mentor may
 * still appear (the marketplace needs supply) but always ranks below a verified
 * one with a weaker match, and is labelled.
 *
 * Pure module — asserted in `scripts/check-mentors.ts`.
 */

export interface Mentor {
  id: number;
  displayName: string;
  headline?: string | null;
  country?: string | null;
  city?: string | null;
  university?: string | null;
  program?: string | null;
  degreeLevel?: string | null;
  scholarshipName?: string | null;
  /** JSON array column or a parsed list. */
  expertise?: string | string[] | null;
  languages?: string | string[] | null;
  hourlyRateUsd?: number | null;
  freeSessions?: boolean | null;
  isVerified?: boolean | null;
  isActive?: boolean | null;
  ratingAverage?: number | null;
  ratingCount?: number | null;
}

export interface MentorRequest {
  country?: string | null;
  city?: string | null;
  /** Universities the student is actually applying to. */
  targetUniversities?: string[];
  targetMajor?: string | null;
  degreeLevel?: string | null;
  /** Scholarships the student has saved. */
  targetScholarships?: string[];
  needsFinancialAid?: boolean | null;
  preferredLanguages?: string[];
  maxHourlyRateUsd?: number | null;
}

export interface MentorMatch {
  mentor: Mentor;
  /** 0–100 */
  score: number;
  /** Concrete reasons, in order of weight. Never empty. */
  reasons: string[];
  /** What does NOT match — shown so the student is not misled. */
  gaps: string[];
  verified: boolean;
  price: "free" | "paid" | "unknown";
}

export interface MentorMatchResult {
  matches: MentorMatch[];
  /** How many were filtered out, and why. */
  filtered: { inactive: number; overBudget: number };
  note: string;
}

// --- helpers ---------------------------------------------------------------

function toList(raw: string | string[] | null | undefined): string[] {
  if (!raw) return [];
  if (Array.isArray(raw)) return raw.map((v) => String(v).trim().toLowerCase()).filter(Boolean);
  const text = String(raw).trim();
  if (!text) return [];
  if (text.startsWith("[")) {
    try {
      const parsed = JSON.parse(text);
      if (Array.isArray(parsed)) {
        return parsed.map((v) => String(v).trim().toLowerCase()).filter(Boolean);
      }
    } catch {
      // fall through
    }
  }
  return text
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
}

const norm = (v: unknown): string => String(v ?? "").trim().toLowerCase();

/** Words that carry no identity: every institution has one. */
const GENERIC_WORDS = new Set([
  "of", "the", "and", "for", "in", "de", "la", "del", "universitat",
  "university", "universite", "universidad", "institute", "institut",
  "college", "school", "hochschule", "scholarship", "stipend", "fund",
  "foundation", "program", "programme",
]);

function tokens(value: string | null | undefined): string[] {
  return norm(value)
    .split(/[^a-z0-9]+/)
    .filter((w) => w.length >= 2 && !GENERIC_WORDS.has(w));
}

/**
 * Initialisms of every prefix: "Technical University of Munich" -> tu, tum.
 * The acronym IS the distinguishing token, so it has to be matched against the
 * long form rather than filtered out for being short.
 */
/**
 * Initialisms keep words that GENERIC_WORDS drops: by convention an acronym
 * includes "University" (Technical University of Munich -> TUM), so filtering it
 * out would produce "TM" and match nothing.
 */
const FUNCTION_WORDS = new Set(["of", "the", "and", "for", "in", "de", "la", "del"]);

function prefixInitialisms(value: string | null | undefined): Set<string> {
  const words = norm(value)
    .split(/[^a-z0-9]+/)
    .filter((w) => w.length >= 2 && w.length <= 12 && !FUNCTION_WORDS.has(w));
  const out = new Set<string>();
  let acc = "";
  for (const w of words) {
    acc += w[0];
    if (acc.length >= 2) out.add(acc);
  }
  return out;
}

/**
 * Name similarity in 0..1. Two ways to match:
 *   - shared meaningful words (Jaccard), and
 *   - an acronym on one side equals a prefix initialism of the other, so
 *     "TU Munich" == "Technical University of Munich" while "LMU Munich" stays
 *     a different university.
 */
function nameOverlap(a: string | null | undefined, b: string | null | undefined): number {
  const ta = tokens(a);
  const tb = tokens(b);
  if (ta.length === 0 || tb.length === 0) return 0;

  const shared = ta.filter((w) => tb.includes(w)).length;
  const union = new Set([...ta, ...tb]).size;
  const jaccard = shared / union;

  const shortA = ta.filter((w) => w.length >= 2 && w.length <= 5);
  const shortB = tb.filter((w) => w.length >= 2 && w.length <= 5);
  const ia = prefixInitialisms(a);
  const ib = prefixInitialisms(b);
  const acronymMatch =
    (shortA.some((w) => ib.has(w)) || shortB.some((w) => ia.has(w))) && shared > 0;

  return acronymMatch ? Math.max(jaccard, 0.85) : jaccard;
}

// --- matching --------------------------------------------------------------

export function matchMentors(
  request: MentorRequest,
  mentors: Mentor[],
  opts: { limit?: number } = {}
): MentorMatchResult {
  const limit = opts.limit ?? 10;
  const targets = (request.targetUniversities ?? []).map(norm).filter(Boolean);
  const scholarships = (request.targetScholarships ?? []).map(norm).filter(Boolean);
  const languages = (request.preferredLanguages ?? []).map(norm).filter(Boolean);
  const maxRate =
    request.maxHourlyRateUsd != null && Number(request.maxHourlyRateUsd) > 0
      ? Number(request.maxHourlyRateUsd)
      : null;

  const filtered = { inactive: 0, overBudget: 0 };
  const matches: MentorMatch[] = [];

  for (const m of mentors) {
    if (m.isActive === false) {
      filtered.inactive += 1;
      continue;
    }
    const rate = m.hourlyRateUsd != null ? Number(m.hourlyRateUsd) : null;
    const isFree = m.freeSessions === true || rate === 0;
    // Only filter on price when the student set a ceiling AND the mentor has a
    // published rate above it. An unknown rate is not an over-budget mentor.
    if (maxRate !== null && !isFree && rate !== null && rate > maxRate) {
      filtered.overBudget += 1;
      continue;
    }

    const reasons: string[] = [];
    const gaps: string[] = [];
    let score = 0;

    // --- Same university: the single strongest signal ----------------------
    const uniHit = targets.some((t) => nameOverlap(t, m.university) >= 0.5);
    if (uniHit) {
      score += 40;
      reasons.push(`Studies at ${m.university} — one of your target universities`);
    } else if (m.university) {
      gaps.push(`Different university (${m.university})`);
    }

    // --- Same country ------------------------------------------------------
    if (norm(request.country) && norm(m.country) === norm(request.country)) {
      score += 22;
      reasons.push(`Lives in ${m.country} — knows the visa, housing and cost of day to day`);
    } else if (m.country) {
      score += 4;
      gaps.push(`Based in ${m.country}, not ${request.country || "your target country"}`);
    }

    // --- Same scholarship --------------------------------------------------
    const schHit =
      scholarships.length > 0 &&
      m.scholarshipName &&
      scholarships.some((s) => nameOverlap(s, m.scholarshipName) >= 0.5);
    if (schHit) {
      score += 25;
      reasons.push(`Won ${m.scholarshipName} — you are applying to it too`);
    } else if (request.needsFinancialAid && !m.scholarshipName) {
      gaps.push("Has not held a scholarship, so cannot speak to funding");
    }

    // --- Same field and level ----------------------------------------------
    const programOverlap = nameOverlap(request.targetMajor, m.program);
    if (programOverlap >= 0.5) {
      score += 12;
      reasons.push(`Same field of study (${m.program})`);
    } else if (m.program) {
      gaps.push(`Studied ${m.program}, not ${request.targetMajor || "your field"}`);
    }
    if (request.degreeLevel && norm(m.degreeLevel) === norm(request.degreeLevel)) {
      score += 6;
      reasons.push("Same degree level");
    }

    // --- Language ----------------------------------------------------------
    const mentorLangs = toList(m.languages);
    if (languages.length > 0 && mentorLangs.some((l) => languages.includes(l))) {
      score += 8;
      reasons.push(`Speaks your language (${mentorLangs.filter((l) => languages.includes(l)).join(", ")})`);
    } else if (languages.length > 0) {
      gaps.push("Does not list your preferred language");
    }

    // --- Verification ------------------------------------------------------
    // Verified mentors outrank unverified ones at equal relevance, and an
    // unverified mentor is always labelled so the student knows.
    if (m.isVerified) {
      score += 10;
      reasons.push("Identity verified by ScholarBridge");
    } else {
      score -= 8;
      gaps.push("Not verified yet — ScholarBridge has not confirmed their enrolment");
    }

    // --- Reputation, weighted so one review cannot dominate ----------------
    const rating = m.ratingAverage != null ? Number(m.ratingAverage) : null;
    const count = m.ratingCount != null ? Number(m.ratingCount) : 0;
    if (rating !== null && count >= 3) {
      score += Math.max(0, (rating - 3.5) * 4);
      reasons.push(`Rated ${rating.toFixed(1)}/5 from ${count} sessions`);
    } else if (count > 0) {
      reasons.push(`${count} session${count === 1 ? "" : "s"} so far — too few to rate yet`);
    } else {
      reasons.push("New mentor — no sessions yet");
    }

    // A mentor who matched nothing is not a match.
    if (reasons.length === 0 || score < 10) continue;

    matches.push({
      mentor: m,
      score: Math.max(0, Math.min(100, Math.round(score))),
      reasons,
      gaps,
      verified: m.isVerified === true,
      price: isFree ? "free" : rate !== null ? "paid" : "unknown",
    });
  }

  // Verified first, then score, then name — a stable, explainable order.
  matches.sort(
    (a, b) =>
      Number(b.verified) - Number(a.verified) ||
      b.score - a.score ||
      a.mentor.displayName.localeCompare(b.mentor.displayName)
  );

  const top = matches.slice(0, limit);
  const verifiedCount = top.filter((m) => m.verified).length;

  let note: string;
  if (top.length === 0) {
    note =
      "No mentors match yet. The marketplace grows as students who have been through it sign up — your own profile can become a listing once you enrol.";
  } else if (verifiedCount === 0) {
    note = "None of these mentors are verified yet. Treat their advice as experience, not authority.";
  } else if (filtered.overBudget > 0) {
    note = `${filtered.overBudget} mentor${filtered.overBudget === 1 ? "" : "s"} were hidden because their rate is above your budget. Free sessions are always shown first.`;
  } else {
    note = `${verifiedCount} of ${top.length} are verified. Sorted by how closely their path matches yours, not by price.`;
  }

  return { matches: top, filtered, note };
}
