import { compareDegreeLevels, undergraduateTestApplies } from "./degreeLevels";
import { gpaTo40Scale } from "./gpa";
import { canonicalSubjectTokens, subjectAffinity, subjectTokens } from "./subjectAffinity";

/**
 * A match reason carries three things:
 *
 *   • `code`   — stable id the API layer translates with
 *                (`matchReasons.<university|scholarship>.<code>` in
 *                src/i18n/messages/*.json, see src/lib/engineText.ts);
 *   • `params` — the values interpolated into that sentence;
 *   • `text`   — the ENGLISH sentence. It stays the value of every `reasons`
 *                array (logs, AI prompts, scripts, and the fallback when a
 *                locale lacks the key), so nothing that consumed the old
 *                string API breaks. The UI reads the translated form.
 */
export interface ReasonDetail {
  code: string;
  params: Record<string, string | number>;
  text: string;
}

interface WeightedReason extends ReasonDetail {
  weight: number;
}

const toDetail = ({ code, params, text }: ReasonDetail): ReasonDetail => ({ code, params, text });

export interface StudentProfileData {
  id?: number;
  name?: string;
  /**
   * NULL = the student has not told us yet. Every field below is nullable on
   * purpose: an "unknown" must stay unknown and must never be scored as if the
   * student had answered (spec §19 — NULL is not zero and not a default).
   */
  degreeLevel: string | null;
  targetMajor: string | null;
  gpa: number | null;
  gpaScale: number | null;
  ieltsScore?: number | null;
  toeflScore?: number | null;
  duolingoScore?: number | null;
  satScore?: number | null;
  greScore?: number | null;
  budgetAnnualUsd: number | null;
  preferredCountries?: string | string[] | null;
  needScholarship?: boolean | null;
  /** Additional financial facts from the complete profile. */
  familyIncomeUsd?: number | null;
  needsFinancialAid?: boolean | null;
  requiresFullScholarship?: boolean | null;
  /** Profile activity fields (JSON arrays or legacy comma-separated text). */
  extracurriculars?: string | null;
  leadership?: string | null;
  volunteering?: string | null;
  sports?: string | null;
  clubs?: string | null;
  researchExperience?: string | null;
  projects?: string | null;
  olympiads?: string | null;
  awards?: string | null;
  competitions?: string | null;
  certificates?: string | null;
  savedActivities?: { category?: string | null; role?: string | null; achievements?: string | null }[] | null;
  workExperienceYears?: number | null;
  researchPublications?: number | null;
}

export interface UniversityData {
  id: number;
  name: string;
  country: string;
  city: string | null;
  flagEmoji: string;
  worldRanking: number | null;
  degreeLevel: string;
  programMajor: string | null;
  annualTuitionUsd?: number | null;
  annualLivingEstUsd?: number | null;
  /** Verified generic-cost columns, used when the legacy USD mirror is empty. */
  annualTuition?: number | null;
  tuitionCurrency?: string | null;
  annualLivingEst?: number | null;
  livingCostCurrency?: string | null;
  minGpa?: number | null;
  minIelts?: number | null;
  minSat?: number | null;
  acceptanceRate?: number | null;
  postStudyWorkVisaYears?: number | null;
  description: string;
  highlights: string;
  websiteUrl: string;
  imageUrl?: string | null;
}

export interface ScholarshipData {
  id: number;
  title: string;
  provider: string;
  country: string;
  coverageType: string;
  amountUsdValue: number | null;
  deadline: string | null;
  degreeLevels: string;
  eligibleMajors: string;
  minGpa?: number | null;
  minIelts?: number | null;
  financialNeedBased?: boolean | null;
  meritBased?: boolean | null;
  description: string;
  requirements: string;
  websiteUrl: string;
}

/**
 * Word-token overlap between two field/major names — the ONE comparison used
 * for every field match in this module.
 *
 * Why not substring matching: a student major of "AI" would otherwise match
 * "Sustain-AI-nable Engineering", and a blank major would match everything
 * (`"".includes("")` is true). Why not `majorSimilarity()`: it drops tokens
 * shorter than 3 characters, so "AI"/"IT" fall back to its 0.5 "unknown"
 * value and would pass an eligibility threshold they should not pass.
 *
 * Returns null when either side has no usable tokens → the caller must treat
 * the comparison as UNKNOWN (never as a match, never as a failure).
 */
export { subjectTokens } from "./subjectAffinity";

export function majorOverlap(a: string | null | undefined, b: string | null | undefined): number | null {
  const A = subjectTokens(a);
  const B = subjectTokens(b);
  if (!A.length || !B.length) return null;
  const setB = new Set(B);
  const overlap = A.filter((w) => setB.has(w)).length;
  return Math.min(1, overlap / Math.min(A.length, B.length));
}

/**
 * Subject alignment between the student's target major and the university's
 * published program focus.
 *
 * Uses the synonym-aware affinity engine from the recommender
 * (`gpaTo40Scale`/`subjectAffinity`), so "Informatics", "Software
 * Engineering" and "AI" relate to "Computer Science" the same way they do in
 * the Program-match tab. Conservative:
 *   • either side unknown/blank → "unknown" (no score change, no claim);
 *   • exact/synonym             → strong positive reason;
 *   • partial/weak              → modest positive reason;
 *   • no relation               → a visible issue (never hidden).
 * This exists because a match score that ignores the field can rank a
 * Law-bound student above a CS-bound one at the same university.
 */
/**
 * Canonical field tokens (SUBJECT_TOKEN_CANON) now live in
 * src/lib/subjectAffinity.ts, together with the synonym groups, so the
 * university matcher, the recommender and chancing share one definition.
 */
const canonicalTokens = canonicalSubjectTokens;

export function subjectAlignment(
  profileMajor: string | null | undefined,
  programMajor: string | null | undefined
): { level: "strong" | "partial" | "none" | "unknown"; similarity: number | null } {
  const a = (profileMajor ?? "").trim();
  const b = (programMajor ?? "").trim();
  const A = canonicalTokens(a);
  const B = canonicalTokens(b);
  if (!a || !b || !A.size || !B.size) return { level: "unknown", similarity: null };

  const fit = subjectAffinity([a], b);
  const overlap = [...A].filter((t) => B.has(t)).length;
  const ratio = overlap / Math.min(A.size, B.size);
  if (fit.level === "exact" || fit.level === "synonym" || ratio >= 0.5) {
    return { level: "strong", similarity: Math.max(ratio, fit.score) };
  }
  if (fit.level === "partial" || fit.level === "weak" || overlap > 0) {
    return { level: "partial", similarity: Math.max(ratio, fit.score) };
  }
  if (fit.level === "none") return { level: "none", similarity: 0 };
  return { level: "unknown", similarity: null };
}

/** Parse both the current JSON activity fields and the legacy comma format. */
function profileList(raw: string | null | undefined): string[] {
  if (typeof raw !== "string" || !raw.trim()) return [];
  const value = raw.trim();
  if (value.startsWith("[")) {
    try {
      const parsed = JSON.parse(value);
      if (Array.isArray(parsed)) return parsed.map(String).map((v) => v.trim()).filter(Boolean);
    } catch {
      // Fall back to the legacy separator below.
    }
  }
  return value.split(",").map((v) => v.trim()).filter(Boolean);
}

function activityFacts(profile: StudentProfileData) {
  const saved = profile.savedActivities ?? [];
  const activities = [
    ...profileList(profile.extracurriculars),
    ...profileList(profile.leadership),
    ...profileList(profile.volunteering),
    ...profileList(profile.sports),
    ...profileList(profile.clubs),
    ...profileList(profile.projects),
    ...profileList(profile.researchExperience),
    ...saved,
  ].length;
  const leadership = profileList(profile.leadership).length + saved.filter((a) =>
    a.category === "leadership" || /\b(lead|leader|president|captain|founder|chair|director|manager|mentor)\b/i.test(String(a.role ?? ""))
  ).length;
  const research = profileList(profile.researchExperience).length +
    (Number(profile.researchPublications) > 0 ? Number(profile.researchPublications) : 0) +
    saved.filter((a) => a.category === "research").length;
  const awards = profileList(profile.olympiads).length +
    profileList(profile.awards).length +
    profileList(profile.competitions).length +
    profileList(profile.certificates).length +
    saved.filter((a) => a.category === "competition" && String(a.achievements ?? "").trim().length > 0).length;
  return { activities, leadership, research, awards };
}

function usdCost(value: number | null | undefined, currency: string | null | undefined): number | null {
  if (currency && currency.toUpperCase() !== "USD") return null;
  if (value != null && Number.isFinite(Number(value)) && Number(value) > 0) return Number(value);
  return null;
}

export function calculateUniversityMatch(profile: StudentProfileData, uni: UniversityData) {
  let score = 70;
  // Weighted reasons/issues — ranked by importance so the UI can show the
  // 2 most important + and the 2 biggest − (spec §23 — explain the score).
  const reasons: WeightedReason[] = [];
  const potentialIssues: WeightedReason[] = [];

  // Normalize GPA to 4.0 scale. An unknown scale with a value > 4 stays
  // unknown (never clamped to a perfect 4.0) — see src/lib/gpa.ts.
  const normGpa = gpaTo40Scale(profile.gpa, profile.gpaScale);

  // GPA — only when the university officially specifies a minimum (spec §14)
  // AND the student's GPA is comparable (normGpa != null).
  if (uni.minGpa != null && normGpa != null) {
    const gpaDiff = normGpa - uni.minGpa;
    if (gpaDiff >= 0.5) {
      score += 15;
      reasons.push({ code: "gpa_well_above", params: { gpa: normGpa.toFixed(2), min: uni.minGpa }, text: `GPA ${normGpa.toFixed(2)} well above the ${uni.minGpa} minimum`, weight: 15 });
    } else if (gpaDiff >= 0.2) {
      score += 10;
      reasons.push({ code: "gpa_above", params: { gpa: normGpa.toFixed(2), min: uni.minGpa }, text: `GPA ${normGpa.toFixed(2)} above the ${uni.minGpa} minimum`, weight: 10 });
    } else if (gpaDiff >= 0) {
      score += 5;
      reasons.push({ code: "gpa_meets", params: { gpa: normGpa.toFixed(2), min: uni.minGpa }, text: `GPA ${normGpa.toFixed(2)} meets the ${uni.minGpa} minimum`, weight: 5 });
    } else if (gpaDiff >= -0.3) {
      score -= 12;
      potentialIssues.push({ code: "gpa_slightly_below", params: { gpa: normGpa.toFixed(2), min: uni.minGpa }, text: `GPA ${normGpa.toFixed(2)} slightly below the ${uni.minGpa} minimum`, weight: 12 });
    } else {
      score -= 25;
      potentialIssues.push({ code: "gpa_below", params: { gpa: normGpa.toFixed(2), min: uni.minGpa }, text: `GPA ${normGpa.toFixed(2)} is below the ${uni.minGpa} requirement`, weight: 25 });
    }
  }

  // Language Requirement (IELTS) — a missing test is a real penalty:
  // a university that requires IELTS must NEVER show a 98% match for a
  // student without an IELTS score (spec §23, §19).
  if (uni.minIelts != null) {
    const hasIelts = typeof profile.ieltsScore === "number" && profile.ieltsScore > 0;
    if (!hasIelts) {
      // An equivalent test (TOEFL / Duolingo) is NOT the same as "no English
      // certificate", so it carries a smaller, clearly-worded issue: the
      // published bar is IELTS, and acceptance of the alternative must be
      // confirmed with the university — we never silently treat it as met.
      const hasAlternative =
        (typeof profile.toeflScore === "number" && profile.toeflScore > 0) ||
        (typeof profile.duolingoScore === "number" && profile.duolingoScore > 0);
      if (hasAlternative) {
        const alt =
          typeof profile.toeflScore === "number" && profile.toeflScore > 0
            ? `TOEFL ${profile.toeflScore}`
            : `Duolingo ${profile.duolingoScore}`;
        score -= 5;
        potentialIssues.push({
          code: "ielts_alternative",
          params: { min: uni.minIelts, alt },
          text: `IELTS ${uni.minIelts} is the published bar — you have ${alt}; confirm whether it is accepted`,
          weight: 5,
        });
      } else {
        score -= 25;
        potentialIssues.push({
          code: "ielts_missing",
          params: { min: uni.minIelts },
          text: `IELTS ${uni.minIelts} required — you don't have an IELTS score yet`,
          weight: 25,
        });
      }
    } else if (profile.ieltsScore! >= uni.minIelts + 0.5) {
      score += 8;
      reasons.push({ code: "ielts_above", params: { score: profile.ieltsScore!, min: uni.minIelts }, text: `IELTS ${profile.ieltsScore} above the ${uni.minIelts} requirement`, weight: 8 });
    } else if (profile.ieltsScore! >= uni.minIelts) {
      score += 4;
      reasons.push({ code: "ielts_meets", params: { score: profile.ieltsScore!, min: uni.minIelts }, text: `IELTS ${profile.ieltsScore} meets the ${uni.minIelts} requirement`, weight: 4 });
    } else {
      score -= 20;
      potentialIssues.push({
        code: "ielts_below",
        params: { min: uni.minIelts, score: profile.ieltsScore! },
        text: `IELTS ${uni.minIelts} required — you have ${profile.ieltsScore}`,
        weight: 20,
      });
    }
  }

  // SAT — only when the university officially specifies a minimum AND the
  // test can actually be part of this student's admission. A graduate
  // applicant (or a graduate-only institution) must not be told that a
  // published undergraduate SAT minimum is "required", nor be penalised for
  // not holding a score they never needed.
  if (uni.minSat != null && undergraduateTestApplies(uni.degreeLevel, profile.degreeLevel)) {
    const hasSat = typeof profile.satScore === "number" && profile.satScore > 0;
    if (!hasSat) {
      score -= 20;
      potentialIssues.push({
        code: "sat_missing",
        params: { min: uni.minSat },
        text: `SAT ${uni.minSat} required — you don't have an SAT score yet`,
        weight: 20,
      });
    } else if (profile.satScore! >= uni.minSat) {
      score += 6;
      reasons.push({ code: "sat_meets", params: { score: profile.satScore!, min: uni.minSat }, text: `SAT ${profile.satScore} meets the ${uni.minSat} requirement`, weight: 6 });
    } else {
      score -= 15;
      potentialIssues.push({
        code: "sat_below",
        params: { min: uni.minSat, score: profile.satScore! },
        text: `SAT ${uni.minSat} required — you have ${profile.satScore}`,
        weight: 15,
      });
    }
  }

  // Subject alignment — the university's published program focus vs the
  // student's target major. Unknown on either side stays neutral (no claim).
  const alignment = subjectAlignment(profile.targetMajor, uni.programMajor);
  if (alignment.level === "strong") {
    score += 12;
    reasons.push({ code: "major_strong", params: { major: uni.programMajor ?? "" }, text: `Offers your field: ${uni.programMajor}`, weight: 12 });
  } else if (alignment.level === "partial") {
    score += 4;
    reasons.push({ code: "major_partial", params: { major: uni.programMajor ?? "" }, text: `Partly related to your field: ${uni.programMajor}`, weight: 4 });
  } else if (alignment.level === "none") {
    score -= 15;
    potentialIssues.push({
      code: "major_not_offered",
      params: { major: uni.programMajor ?? "", field: profile.targetMajor ?? "" },
      text: `Programmes focus on ${uni.programMajor} — check whether your field (${profile.targetMajor}) is offered here`,
      weight: 15,
    });
  }

  // Activities — the profile's activity portfolio is part of the fit, not just
  // the separate readiness page. Empty/unknown activity data stays neutral;
  // entered activities contribute breadth, leadership, research and awards.
  const activity = activityFacts(profile);
  if (activity.activities > 0 || activity.awards > 0) {
    const portfolioSize = activity.activities + activity.awards;
    const activityBoost = Math.min(12, portfolioSize * 2 + activity.leadership + activity.research);
    score += activityBoost;
    reasons.push({
      code: "activity_strength",
      params: { activities: portfolioSize },
      text: `${portfolioSize} activities and achievements strengthen your application`,
      weight: activityBoost,
    });
  }

  // Financial fit — compare the full verified annual cost, not tuition alone.
  // Generic cost columns are used only when they are explicitly in USD; a
  // cross-currency numeric comparison would be misleading.
  const tuition = usdCost(uni.annualTuitionUsd, "USD") ?? usdCost(uni.annualTuition, uni.tuitionCurrency);
  const rawLiving = uni.annualLivingEstUsd ?? uni.annualLivingEst;
  const living = usdCost(uni.annualLivingEstUsd, "USD") ?? usdCost(uni.annualLivingEst, uni.livingCostCurrency);
  const livingCostIsKnownButNotUsd = rawLiving != null && Number(rawLiving) > 0 && living == null;
  const totalUniCost = tuition != null && !livingCostIsKnownButNotUsd ? tuition + (living ?? 0) : null;
  const budget = profile.budgetAnnualUsd != null && Number.isFinite(Number(profile.budgetAnnualUsd)) && Number(profile.budgetAnnualUsd) > 0
    ? Number(profile.budgetAnnualUsd)
    : null;
  const needsAid = profile.needScholarship === true || profile.needsFinancialAid === true || profile.requiresFullScholarship === true;
  const familyIncome = profile.familyIncomeUsd != null && Number.isFinite(Number(profile.familyIncomeUsd)) && Number(profile.familyIncomeUsd) > 0
    ? Number(profile.familyIncomeUsd)
    : null;

  if (totalUniCost != null && budget != null) {
    if (budget >= totalUniCost) {
      score += 10;
      reasons.push({ code: "budget_fits", params: { cost: totalUniCost.toLocaleString() }, text: `Estimated cost $${totalUniCost.toLocaleString()}/yr fits your budget`, weight: 10 });
    } else {
      const budgetDeficit = totalUniCost - budget;
      const weight = budgetDeficit > 30000 && !needsAid ? 20 : profile.requiresFullScholarship ? 18 : needsAid ? 14 : 10;
      score -= weight;
      potentialIssues.push({
        code: "budget_exceeds",
        params: { cost: totalUniCost.toLocaleString(), budget: budget.toLocaleString() },
        text: `Estimated cost $${totalUniCost.toLocaleString()}/yr exceeds your $${budget.toLocaleString()} budget`,
        weight,
      });
    }
  }

  // Family income is supporting evidence, not a replacement for the student's
  // stated budget. When budget is absent, it still prevents the financial
  // profile from being silently ignored.
  if (totalUniCost != null && budget == null && familyIncome != null) {
    if (familyIncome < totalUniCost) {
      score -= 6;
      potentialIssues.push({
        code: "income_below_cost",
        params: { income: familyIncome.toLocaleString(), cost: totalUniCost.toLocaleString() },
        text: `Recorded family income $${familyIncome.toLocaleString()}/yr is below the estimated $${totalUniCost.toLocaleString()} annual cost`,
        weight: 6,
      });
    } else {
      score += 3;
      reasons.push({
        code: "income_supports_cost",
        params: { income: familyIncome.toLocaleString(), cost: totalUniCost.toLocaleString() },
        text: `Recorded family income $${familyIncome.toLocaleString()}/yr covers the estimated annual cost`,
        weight: 3,
      });
    }
  }

  // A funding flag is a real profile constraint, not a decorative field. If
  // there is no comparable cost data, say why the financial assessment is
  // incomplete instead of silently treating this student as self-funded.
  if (profile.requiresFullScholarship === true) {
    score -= 8;
    potentialIssues.push({
      code: "full_funding_required",
      params: {},
      text: "You require full funding — verify that this university offers a full scholarship or financial-aid route",
      weight: 8,
    });
  } else if (needsAid && totalUniCost == null) {
    potentialIssues.push({
      code: "financial_plan_missing",
      params: {},
      text: "You marked financial aid as needed, but this university has no verified full-cost figure",
      weight: 7,
    });
  } else if (needsAid && totalUniCost != null && budget == null) {
    potentialIssues.push({
      code: "financial_budget_missing",
      params: {},
      text: "Add your annual budget so we can compare this cost with your funding plan",
      weight: 7,
    });
  }

  // Preferred Country Boost
  let preferredList: string[] = [];
  try {
    if (typeof profile.preferredCountries === "string") {
      preferredList = JSON.parse(profile.preferredCountries);
    } else if (Array.isArray(profile.preferredCountries)) {
      preferredList = profile.preferredCountries;
    }
  } catch {
    preferredList = [];
  }

  if (preferredList.some(c => c.toLowerCase() === uni.country.toLowerCase())) {
    score += 8;
    reasons.push({ code: "country_preferred", params: { country: uni.country }, text: `${uni.country} is on your preferred list`, weight: 8 });
  }

  // Research / Work Experience Boost for Master/PhD or top ranking
  if ((profile.researchPublications || 0) > 0 || (profile.workExperienceYears || 0) > 0) {
    score += 5;
    reasons.push({ code: "experience_boost", params: {}, text: "Research / work experience strengthens your application", weight: 5 });
  }

  // Clamp Score
  const matchScore = Math.min(99, Math.max(35, Math.round(score)));

  // Categorize
  let matchCategory: "Reach" | "Match" | "Safety" = "Match";
  if (matchScore >= 85) {
    matchCategory = "Safety";
  } else if (matchScore >= 68) {
    matchCategory = "Match";
  } else {
    matchCategory = "Reach";
  }

  // Ranked output: the 2 most important positives and the 2 biggest
  // negatives — a missing requirement is always visible as a "−".
  reasons.sort((a, b) => b.weight - a.weight);
  potentialIssues.sort((a, b) => b.weight - a.weight);

  return {
    matchScore,
    matchCategory,
    reasons: reasons.slice(0, 2).map(r => r.text),
    potentialIssues: potentialIssues.slice(0, 2).map(i => i.text),
    // Structured twins of the two arrays above — same entries, same order —
    // so /api/* can translate the sentence instead of re-parsing it.
    reasonDetails: reasons.slice(0, 2).map(toDetail),
    issueDetails: potentialIssues.slice(0, 2).map(toDetail),
  };
}

export function calculateScholarshipMatch(profile: StudentProfileData, scholarship: ScholarshipData) {
  let score = 65;
  const reasons: ReasonDetail[] = [];
  const potentialIssues: ReasonDetail[] = [];

  // GPA check (spec §22 — explain WHY it matches). Unknown scale → unknown
  // GPA: no comparison, no claim (see src/lib/gpa.ts).
  const normGpa = gpaTo40Scale(profile.gpa, profile.gpaScale);
  if (scholarship.minGpa && scholarship.minGpa > 0 && normGpa != null) {
    if (normGpa >= scholarship.minGpa + 0.4) {
      score += 15;
      reasons.push({ code: "gpa_well_above", params: { gpa: normGpa.toFixed(2), min: scholarship.minGpa }, text: `GPA ${normGpa.toFixed(2)} well above the ${scholarship.minGpa} minimum` });
    } else if (normGpa >= scholarship.minGpa) {
      score += 8;
      reasons.push({ code: "gpa_meets", params: { gpa: normGpa.toFixed(2), min: scholarship.minGpa }, text: `GPA ${normGpa.toFixed(2)} meets the ${scholarship.minGpa} minimum` });
    } else {
      score -= 20;
      potentialIssues.push({ code: "gpa_below", params: { gpa: normGpa.toFixed(2), min: scholarship.minGpa }, text: `GPA ${normGpa.toFixed(2)} is below the ${scholarship.minGpa} requirement` });
    }
  }

  // IELTS check — a missing test is a real penalty (same rule as
  // calculateUniversityMatch): a scholarship requiring IELTS must NEVER show
  // a high match for a student without an IELTS score. An equivalent test
  // (TOEFL / Duolingo) is a smaller, clearly-worded issue: the published bar
  // is IELTS and acceptance of the alternative must be confirmed.
  if (scholarship.minIelts && scholarship.minIelts > 0) {
    const hasIelts = typeof profile.ieltsScore === "number" && profile.ieltsScore > 0;
    if (!hasIelts) {
      const hasAlternative =
        (typeof profile.toeflScore === "number" && profile.toeflScore > 0) ||
        (typeof profile.duolingoScore === "number" && profile.duolingoScore > 0);
      if (hasAlternative) {
        const alt =
          typeof profile.toeflScore === "number" && profile.toeflScore > 0
            ? `TOEFL ${profile.toeflScore}`
            : `Duolingo ${profile.duolingoScore}`;
        score -= 3;
        potentialIssues.push({
          code: "ielts_alternative",
          params: { min: scholarship.minIelts, alt },
          text: `IELTS ${scholarship.minIelts} is the published bar — you have ${alt}; confirm whether it is accepted`,
        });
      } else {
        score -= 15;
        potentialIssues.push({
          code: "ielts_missing",
          params: { min: scholarship.minIelts },
          text: `IELTS ${scholarship.minIelts} required — you don't have an IELTS score yet`,
        });
      }
    } else if (profile.ieltsScore! >= scholarship.minIelts) {
      score += 10;
      reasons.push({ code: "ielts_meets", params: { score: profile.ieltsScore!, min: scholarship.minIelts }, text: `IELTS ${profile.ieltsScore} meets the ${scholarship.minIelts} requirement` });
    } else {
      score -= 15;
      potentialIssues.push({ code: "ielts_below", params: { min: scholarship.minIelts, score: profile.ieltsScore! }, text: `IELTS ${scholarship.minIelts} required — you have ${profile.ieltsScore}` });
    }
  }

  // Degree Level alignment (NULL-safe: JSON.parse(null) returns null, not []).
  let levels: string[] = [];
  try {
    const parsed = scholarship.degreeLevels ? JSON.parse(scholarship.degreeLevels) : [];
    levels = Array.isArray(parsed) ? parsed : [];
  } catch {
    levels = [];
  }
  if (levels.length > 0) {
    // Alias-aware comparison (src/lib/degreeLevels.ts): "Master's", "MSc",
    // "магистратура" and the catalogue's "Master" all compare equal. An
    // unrecognised label on either side is UNKNOWN — never a mismatch, and
    // never claimed as a match.
    const levelFit = compareDegreeLevels(profile.degreeLevel, scholarship.degreeLevels);
    if (levelFit === "match") {
      score += 10;
      reasons.push({ code: "level_open", params: { level: profile.degreeLevel ?? "" }, text: `Open to ${profile.degreeLevel} applicants` });
    } else if (levelFit === "mismatch") {
      score -= 25;
      potentialIssues.push({ code: "level_mismatch", params: { levels: levels.join(", ") }, text: `Only open to: ${levels.join(", ")}` });
    } else {
      potentialIssues.push({
        code: "level_unclear",
        params: { levels: levels.join(", ") },
        text: `Levels on this award (${levels.join(", ")}) could not be compared with your level — check the official page`,
      });
    }
  }

  // Eligible majors (spec §22). Matching is WORD-based, so a short token
  // ("AI", "IT") can never match an unrelated word by substring accident.
  // Unknown major on either side is neutral: the student is not told their
  // field is eligible when we do not know it.
  try {
    const parsed = scholarship.eligibleMajors ? JSON.parse(scholarship.eligibleMajors) : [];
    const majors: string[] = Array.isArray(parsed) ? parsed : [];
    const studentMajor = (profile.targetMajor ?? "").trim();
    if (majors.length && !majors.some((m) => m.trim().toLowerCase() === "all")) {
      // "Eligible" needs a real relation on either scale: a shared subject
      // word, or an exact/synonym hit on the synonym-aware affinity engine
      // ("Software Engineering" ↔ "Computer Science").
      const bestSimilarity = studentMajor
        ? Math.max(
            ...majors.map((m) => {
              const tokenOverlap = majorOverlap(studentMajor, m);
              if (tokenOverlap != null && tokenOverlap > 0) return tokenOverlap;
              const fit = subjectAffinity([studentMajor], m);
              return fit.level === "exact" || fit.level === "synonym" ? fit.score : tokenOverlap ?? 0;
            })
          )
        : null;
      if (studentMajor && !subjectTokens(studentMajor).length) {
        // The profile has a value, but it carries no comparable words
        // ("—", "n/a"): unknown, not a match and not a penalty.
        potentialIssues.push({
          code: "major_unclear",
          params: { majors: majors.join(", ") },
          text: `This award lists eligible fields (${majors.join(", ")}) — your target major could not be compared, check the official page`,
        });
      } else if (bestSimilarity == null) {
        potentialIssues.push({
          code: "major_missing",
          params: { majors: majors.join(", ") },
          text: `This award lists eligible fields (${majors.join(", ")}) — add your target major to your profile to be matched`,
        });
      } else {
        if (bestSimilarity >= 0.5) {
          score += 8;
          reasons.push({ code: "major_eligible", params: { field: studentMajor }, text: `Your field (${studentMajor}) is eligible` });
        } else {
          score -= 10;
          potentialIssues.push({ code: "major_limited", params: { majors: majors.join(", ") }, text: `Field limited to: ${majors.join(", ")}` });
        }
      }
    }
  } catch {
    // fallback
  }

  // Financial need is part of scholarship fit. Account for every profile flag
  // and never treat a need-based award as a match when the student explicitly
  // said they do not need aid.
  const needsAid = profile.needScholarship === true || profile.needsFinancialAid === true || profile.requiresFullScholarship === true;
  const explicitlySelfFunded = profile.needScholarship === false && profile.needsFinancialAid === false && profile.requiresFullScholarship === false;
  if (scholarship.financialNeedBased) {
    if (needsAid) {
      score += 10;
      reasons.push({ code: "need_based", params: {}, text: "Need-based — matches your financial-aid requirement" });
    } else if (explicitlySelfFunded) {
      score -= 10;
      potentialIssues.push({ code: "need_not_applicable", params: {}, text: "This award is need-based, while your profile says you do not need financial aid" });
    } else {
      potentialIssues.push({ code: "financial_need_unknown", params: {}, text: "This award is need-based — add your financial-aid need to assess the fit" });
    }
  }

  if (profile.requiresFullScholarship === true) {
    const coverage = String(scholarship.coverageType ?? "").toLowerCase();
    if (/full|100%|tuition\s*and\s*(living|stipend)|tuition\s*\+\s*(living|stipend)/i.test(coverage)) {
      score += 8;
      reasons.push({ code: "full_funding_match", params: {}, text: "Coverage appears compatible with your full-scholarship requirement" });
    } else {
      potentialIssues.push({ code: "full_funding_unclear", params: {}, text: "You require full funding — this award's coverage may not cover tuition and living costs" });
    }
  }

  // Merit-based awards also read the activity portfolio. Academic numbers and
  // achievements should not be evaluated in two disconnected worlds.
  if (scholarship.meritBased) {
    const activity = activityFacts(profile);
    if (
      (normGpa != null && normGpa >= 3.6) ||
      (profile.researchPublications || 0) > 0 ||
      activity.leadership > 0 ||
      activity.research > 0 ||
      activity.awards > 0
    ) {
      score += 10;
      reasons.push({ code: "merit_based", params: {}, text: "Merit-based — strong academic record, activities or publications" });
    }
  }

  const matchScore = Math.min(98, Math.max(30, Math.round(score)));
  const isEligible = matchScore >= 60;

  return {
    matchScore,
    isEligible,
    reasons: reasons.slice(0, 4).map((r) => r.text),
    potentialIssues: potentialIssues.slice(0, 3).map((i) => i.text),
    // Same entries, same order as the two arrays above (see ReasonDetail).
    reasonDetails: reasons.slice(0, 4),
    issueDetails: potentialIssues.slice(0, 3),
  };
}
