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
  /** Legacy explicit target-country field; new callers should use targetCountries. */
  country?: string | null;
  city?: string | null;
  /** Universities the student saved. */
  targetUniversities?: string[];
  /** Explicit countries the student prefers for study (not their home country). */
  targetCountries?: string[];
  targetMajor?: string | null;
  degreeLevel?: string | null;
  /** Scholarships the student has saved. */
  targetScholarships?: string[];
  needsFinancialAid?: boolean | null;
  preferredLanguages?: string[];
  maxHourlyRateUsd?: number | null;
}

export type MentorMessageKey =
  | "reasons.sameUniversity"
  | "reasons.sameCountry"
  | "reasons.sameScholarship"
  | "reasons.sameField"
  | "reasons.sameDegree"
  | "reasons.languages"
  | "reasons.verified"
  | "reasons.rated"
  | "reasons.fewSessions"
  | "reasons.newProfile"
  | "gaps.differentUniversity"
  | "gaps.differentCountry"
  | "gaps.noScholarshipExperience"
  | "gaps.differentProgram"
  | "gaps.programListed"
  | "gaps.noLanguageMatch"
  | "gaps.notVerified"
  | "notes.noMatches"
  | "notes.noneVerified"
  | "notes.overBudget"
  | "notes.verifiedCount";

export interface MentorMessage {
  key: MentorMessageKey;
  values?: Record<string, string | number>;
}

export interface MentorMatch {
  mentor: Mentor;
  /** 0–100 profile-overlap heuristic; never an admissions estimate. */
  score: number;
  /** English compatibility fields retained for API consumers; UI uses the localized message tokens. */
  reasons: string[];
  gaps: string[];
  reasonMessages: MentorMessage[];
  gapMessages: MentorMessage[];
  verified: boolean;
  price: "free" | "paid" | "unknown";
}

export interface MentorMatchResult {
  matches: MentorMatch[];
  /** How many were filtered out, and why. */
  filtered: { inactive: number; overBudget: number };
  /** English compatibility field retained for API consumers. */
  note: string;
  noteMessage: MentorMessage;
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
  const targetCountries = [...(request.targetCountries ?? []), ...(request.country ? [request.country] : [])].map(norm).filter(Boolean);
  const scholarships = (request.targetScholarships ?? []).map(norm).filter(Boolean);
  const languages = (request.preferredLanguages ?? []).map(norm).filter(Boolean);
  const requestedRate = request.maxHourlyRateUsd == null ? null : Number(request.maxHourlyRateUsd);
  const maxRate = requestedRate !== null && Number.isFinite(requestedRate) && requestedRate >= 0
    ? requestedRate
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
    // Only filter on price when the student set a non-negative ceiling AND the
    // mentor has a published rate above it. An unknown rate is not over budget.
    if (maxRate !== null && !isFree && rate !== null && rate > maxRate) {
      filtered.overBudget += 1;
      continue;
    }

    const reasons: string[] = [];
    const gaps: string[] = [];
    const reasonMessages: MentorMessage[] = [];
    const gapMessages: MentorMessage[] = [];
    const addReason = (text: string, key: MentorMessageKey, values?: MentorMessage["values"]) => {
      reasons.push(text);
      reasonMessages.push({ key, ...(values ? { values } : {}) });
    };
    const addGap = (text: string, key: MentorMessageKey, values?: MentorMessage["values"]) => {
      gaps.push(text);
      gapMessages.push({ key, ...(values ? { values } : {}) });
    };
    let score = 0;

    // --- Same university: compare only when the student has saved targets. ---
    const uniHit = targets.length > 0 && targets.some((t) => nameOverlap(t, m.university) >= 0.5);
    if (uniHit && m.university) {
      score += 40;
      addReason(
        `Profile lists ${m.university} — one of your saved universities`,
        "reasons.sameUniversity",
        { university: m.university }
      );
    } else if (targets.length > 0 && m.university) {
      addGap(`Profile lists a different university: ${m.university}`, "gaps.differentUniversity", { university: m.university });
    }

    // --- Same country: missing student country is unknown, not a mismatch. ---
    const countryHit = Boolean(m.country && targetCountries.includes(norm(m.country)));
    if (countryHit && m.country) {
      score += 22;
      addReason(`Mentor profile lists ${m.country}, one of your preferred study countries`, "reasons.sameCountry", { country: m.country });
    } else if (m.country && targetCountries.length > 0) {
      addGap(`Mentor profile lists ${m.country}, not one of your preferred study countries`, "gaps.differentCountry", { country: m.country });
    }

    // --- Same scholarship --------------------------------------------------
    const schHit =
      scholarships.length > 0 &&
      m.scholarshipName &&
      scholarships.some((s) => nameOverlap(s, m.scholarshipName) >= 0.5);
    if (schHit && m.scholarshipName) {
      score += 25;
      addReason(
        `Profile reports experience with ${m.scholarshipName}; you have saved this scholarship`,
        "reasons.sameScholarship",
        { scholarship: m.scholarshipName }
      );
    } else if (request.needsFinancialAid && !m.scholarshipName) {
      addGap("No scholarship experience is listed on this profile", "gaps.noScholarshipExperience");
    }

    // --- Same field and level ----------------------------------------------
    const programOverlap = nameOverlap(request.targetMajor, m.program);
    if (norm(request.targetMajor) && programOverlap >= 0.5 && m.program) {
      score += 12;
      addReason(`Profile lists ${m.program} as its field`, "reasons.sameField", { program: m.program });
    } else if (norm(request.targetMajor) && m.program) {
      addGap(`Profile lists ${m.program}, not your stated field`, "gaps.differentProgram", { program: m.program });
    } else if (!norm(request.targetMajor) && m.program) {
      addGap(`Profile lists ${m.program}; you have not specified a field to compare`, "gaps.programListed", { program: m.program });
    }
    if (request.degreeLevel && norm(m.degreeLevel) === norm(request.degreeLevel)) {
      score += 6;
      addReason("Profile lists the same degree level", "reasons.sameDegree");
    }

    // --- Language ----------------------------------------------------------
    const mentorLangs = toList(m.languages);
    if (languages.length > 0 && mentorLangs.some((l) => languages.includes(l))) {
      score += 8;
      const matchedLanguages = mentorLangs.filter((l) => languages.includes(l)).join(", ");
      addReason(`Profile lists these languages: ${matchedLanguages}`, "reasons.languages", { languages: matchedLanguages });
    } else if (languages.length > 0) {
      addGap("No selected communication language is listed on this profile", "gaps.noLanguageMatch");
    }

    // --- Verification ------------------------------------------------------
    // Verified mentors outrank unverified ones at equal relevance, and an
    // unverified mentor is always labelled so the student knows.
    if (m.isVerified) {
      addReason("Profile marked as verified by ScholarBridge", "reasons.verified");
    } else {
      addGap("Profile is not marked verified; this says nothing about the accuracy of advice", "gaps.notVerified");
    }

    // --- Reputation, weighted so one review cannot dominate ----------------
    const rating = m.ratingAverage != null ? Number(m.ratingAverage) : null;
    const count = m.ratingCount != null ? Number(m.ratingCount) : 0;
    if (rating !== null && count >= 3) {
      addReason(
        `Profile lists an average of ${rating.toFixed(1)}/5 across ${count} sessions`,
        "reasons.rated",
        { rating: rating.toFixed(1), count }
      );
    } else if (count > 0) {
      addReason(`${count} sessions are listed; not enough for a rating`, "reasons.fewSessions", { count });
    } else {
      addReason("No sessions are listed on this profile yet", "reasons.newProfile");
    }

    // A mentor who matched nothing is not a match.
    if (reasons.length === 0 || score < 10) continue;

    matches.push({
      mentor: m,
      score: Math.max(0, Math.min(100, Math.round(score))),
      reasons,
      gaps,
      reasonMessages,
      gapMessages,
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
  let noteMessage: MentorMessage;
  if (top.length === 0) {
    note = "No active mentor profiles match the current profile and filters. Try changing the rate limit or check back later.";
    noteMessage = { key: "notes.noMatches" };
  } else if (verifiedCount === 0) {
    note = "No result is marked verified. Treat profile details as unverified and confirm them independently.";
    noteMessage = { key: "notes.noneVerified" };
  } else if (filtered.overBudget > 0) {
    note = `${filtered.overBudget} profile${filtered.overBudget === 1 ? " was" : "s were"} hidden because the listed rate is above your limit. Free sessions remain eligible; results are ordered by verification flag and profile overlap, not price.`;
    noteMessage = { key: "notes.overBudget", values: { count: filtered.overBudget } };
  } else {
    note = `${verifiedCount} of ${top.length} result profiles are marked verified. Results are ordered by verification flag, then profile overlap—not price.`;
    noteMessage = { key: "notes.verifiedCount", values: { verified: verifiedCount, total: top.length } };
  }

  return { matches: top, filtered, note, noteMessage };
}
