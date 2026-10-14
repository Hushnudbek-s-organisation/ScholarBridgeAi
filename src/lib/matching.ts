import { compareDegreeLevels, undergraduateTestApplies } from "./degreeLevels";
import { gpaTo40Scale } from "./gpa";
import { clamp, interpolate, meets, ratio, roundTo, saturatingCurve, shortfall } from "./scoring";
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
  /**
   * The exact points this reason/issue contributed to the raw score
   * (one decimal). Numeric on purpose: the UI can render the arithmetic in
   * any language without a new translation string.
   */
  points?: number;
}

interface WeightedReason extends ReasonDetail {
  weight: number;
}

const toDetail = (reason: WeightedReason | ReasonDetail): ReasonDetail => {
  const explicitPoints = "points" in reason && typeof reason.points === "number" ? reason.points : null;
  const weight = "weight" in reason && typeof reason.weight === "number" ? reason.weight : null;
  const points = explicitPoints ?? weight;
  return {
    code: reason.code,
    params: reason.params,
    text: reason.text,
    ...(points == null ? {} : { points: roundTo(points, 1) }),
  };
};

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

/**
 * Fit scoring — a comparison of recorded profile details with available
 * catalogue fields (including academic, subject, location, and cost data).
 *
 * PRECISION CONTRACT (2026-10)
 * ----------------------------
 * The score is built from named components (`MatchComponent[]`):
 *
 *   1. every component carries the EXACT points it contributed, so the total
 *      is arithmetic the student can verify, not a black box;
 *   2. within a component the grade is continuous between documented anchors
 *      (src/lib/scoring.ts) — a 0.05 GPA shortfall no longer costs the same as
 *      a 0.29 one, and a budget covering 99% of the cost is no longer treated
 *      like one covering 10%;
 *   3. a component with no data is reported as `compared: false` and
 *      contributes 0 — never a guess, never a penalty (NULL is not zero);
 *   4. the anchor points are identical to the step values the engine used
 *      before, so the SAME evidence still produces the SAME verdict — only the
 *      resolution between anchors changed (asserted in scripts/check-match.ts).
 *
 * `rawScore` is the unclamped, one-decimal sum. `matchScore` is that value
 * clamped to the display range and rounded once, at the end.
 */
export type MatchDimension =
  | "base"
  | "gpa"
  | "english"
  | "standardised_test"
  | "field"
  | "cost"
  | "income"
  | "funding_requirement"
  | "country"
  | "level"
  | "major_eligibility"
  | "need_basis"
  | "funding_coverage"
  | "merit";

export interface MatchComponent {
  /** Stable dimension id (see MatchDimension) — UI labels, never a sentence. */
  key: MatchDimension;
  /** The reason/issue code this component produced (null = neutral). */
  code: string | null;
  /**
   * Exact points contributed to `rawScore`, at two-decimal precision so the
   * published breakdown adds back up to the published total (rounding each
   * component to one decimal would drift the sum by half a point or more).
   */
  points: number;
  /**
   * False when the profile or the catalogue had nothing to compare on this
   * dimension. The points are then 0 and no reason/issue claims otherwise.
   */
  compared: boolean;
}

export interface MatchBreakdown {
  rawScore: number;
  components: MatchComponent[];
  /**
   * Real dimensions that had data behind them / real dimensions the engine
   * looks at. The neutral base (70 for a university, 65 for a scholarship) is
   * included in `components` so the arithmetic adds up, but is not counted
   * here — it is not evidence about the student.
   */
  comparedDimensions: number;
  totalDimensions: number;
}

function component(
  key: MatchDimension,
  points: number,
  code: string | null,
  compared = true
): MatchComponent {
  return { key, code, points: roundTo(compared ? points : 0, 2), compared };
}

/** `comparedDimensions` / `totalDimensions` never count the neutral base. */
function breakdownOf(rawScore: number, components: MatchComponent[]): MatchBreakdown {
  const evidence = components.filter((c) => c.key !== "base");
  return {
    rawScore,
    components,
    comparedDimensions: evidence.filter((c) => c.compared).length,
    totalDimensions: evidence.length,
  };
}

export function calculateUniversityMatch(profile: StudentProfileData, uni: UniversityData) {
  // Base 70 = "nothing is wrong and nothing stands out": neutral, not a claim.
  let score = 70;
  const components: MatchComponent[] = [component("base", 70, null)];
  // Weighted reasons/issues — ranked by importance so the UI can show the
  // 2 most important + and the 2 biggest − (spec §23 — explain the score).
  const reasons: WeightedReason[] = [];
  const potentialIssues: WeightedReason[] = [];

  // Normalize GPA to 4.0 scale. An unknown scale with a value > 4 stays
  // unknown (never clamped to a perfect 4.0) — see src/lib/gpa.ts.
  const normGpa = gpaTo40Scale(profile.gpa, profile.gpaScale);

  // GPA — only when the university officially specifies a minimum (spec §14)
  // AND the student's GPA is comparable (normGpa != null).
  //
  // Grading: meeting the bar starts at a third of the award and is fully earned
  // 0.5 above it; a shortfall is fully charged at 1.0 below it. The anchor
  // points (0.5 → +15, 0.2 → +10, 0 → +5, −0.3 → −12 …) match the previous
  // step values, but now every margin in between has its own precise value.
  if (uni.minGpa != null && normGpa != null) {
    const gpaDiff = normGpa - uni.minGpa;
    // Requirement grading is continuous ACROSS the bar: meeting a published
    // minimum is the zero point (no invented bonus), exceeding it earns up to
    // +15 at +0.5, falling short is charged up to −25 at −1.0.
    const points =
      gpaDiff >= 0
        ? meets(gpaDiff, 0, 0.5, 15, 0)
        : shortfall(gpaDiff, 0, 1.0, 25);
    score += points;
    if (gpaDiff >= 0.5) {
      reasons.push({ code: "gpa_well_above", params: { gpa: normGpa.toFixed(2), min: uni.minGpa }, text: `Recorded GPA ${normGpa.toFixed(2)} is above the university-catalogue figure ${uni.minGpa}; verify the programme-specific rule`, weight: 15, points });
    } else if (gpaDiff >= 0.2) {
      reasons.push({ code: "gpa_above", params: { gpa: normGpa.toFixed(2), min: uni.minGpa }, text: `Recorded GPA ${normGpa.toFixed(2)} is above the university-catalogue figure ${uni.minGpa}; verify the programme-specific rule`, weight: 10, points });
    } else if (gpaDiff >= 0) {
      reasons.push({ code: "gpa_meets", params: { gpa: normGpa.toFixed(2), min: uni.minGpa }, text: `Recorded GPA ${normGpa.toFixed(2)} is at or above the university-catalogue figure ${uni.minGpa}; verify the programme-specific rule`, weight: 5, points });
    } else if (gpaDiff >= -0.3) {
      potentialIssues.push({ code: "gpa_slightly_below", params: { gpa: normGpa.toFixed(2), min: uni.minGpa }, text: `Recorded GPA ${normGpa.toFixed(2)} is below the university-catalogue figure ${uni.minGpa}; verify the programme-specific rule`, weight: 12, points });
    } else {
      potentialIssues.push({ code: "gpa_below", params: { gpa: normGpa.toFixed(2), min: uni.minGpa }, text: `Recorded GPA ${normGpa.toFixed(2)} is below the university-catalogue figure ${uni.minGpa}; verify the programme-specific rule`, weight: 25, points });
    }
    components.push(component("gpa", points, gpaDiff >= 0 ? "gpa" : "gpa"));
  } else {
    components.push(component("gpa", 0, null, false));
  }

  // University-level IELTS catalogue values are contextual signals only:
  // they may not apply to a specific programme. An unrecorded score (including
  // a profile that records another test) is unknown, not a failure. Only an
  // actually recorded IELTS score is compared, and even that comparison must
  // be verified against the programme's current policy.
  if (uni.minIelts != null) {
    const hasIelts = typeof profile.ieltsScore === "number" && profile.ieltsScore > 0;
    if (!hasIelts) {
      components.push(component("english", 0, null, false));
    } else {
      // 0.5 above the bar earns the full +8; each 0.5 band is worth the same
      // step, so a 7.5 against a 6.5 bar is worth strictly more than a 7.0.
      const ieltsDiff = profile.ieltsScore! - uni.minIelts;
      const points = ieltsDiff >= 0 ? meets(ieltsDiff, 0, 0.5, 8, 0) : shortfall(ieltsDiff, 0, 1.5, 25);
      score += points;
      if (ieltsDiff >= 0.5) {
        reasons.push({ code: "ielts_above", params: { score: profile.ieltsScore!, min: uni.minIelts }, text: `IELTS ${profile.ieltsScore} is above the university-catalogue figure ${uni.minIelts}; confirm the programme-specific rule`, weight: 8, points });
        components.push(component("english", points, "ielts_above"));
      } else if (ieltsDiff >= 0) {
        reasons.push({ code: "ielts_meets", params: { score: profile.ieltsScore!, min: uni.minIelts }, text: `IELTS ${profile.ieltsScore} is at or above the university-catalogue figure ${uni.minIelts}; confirm the programme-specific rule`, weight: 4, points });
        components.push(component("english", points, "ielts_meets"));
      } else {
        potentialIssues.push({
          code: "ielts_below",
          params: { min: uni.minIelts, score: profile.ieltsScore! },
          text: `IELTS ${profile.ieltsScore} is below the university-catalogue figure ${uni.minIelts}; check the programme-specific accepted tests and waiver options`,
          weight: 20,
          points,
        });
        components.push(component("english", points, "ielts_below"));
      }
    }
  } else {
    components.push(component("english", 0, null, false));
  }

  // SAT — only compare an undergraduate catalogue figure for an
  // undergraduate applicant. Because testing policies differ by programme,
  // UI copy must frame the comparison as something to verify, not a universal
  // requirement.
  if (uni.minSat != null && undergraduateTestApplies(uni.degreeLevel, profile.degreeLevel)) {
    const hasSat = typeof profile.satScore === "number" && profile.satScore > 0;
    if (!hasSat) {
      // Missing does not mean required, waived, or failed; leave this
      // university-level catalogue dimension unscored until a programme
      // policy and an applicant score can actually be compared.
      components.push(component("standardised_test", 0, null, false));
    } else {
      const satDiff = profile.satScore! - uni.minSat;
      // 200 points above the published bar earns the full +6; a shortfall is
      // charged progressively up to the full −22 at 300 points below.
      const points = satDiff >= 0 ? meets(satDiff, 0, 200, 6, 0) : shortfall(satDiff, 0, 300, 22);
      score += points;
      if (satDiff >= 0) {
        reasons.push({ code: "sat_meets", params: { score: profile.satScore!, min: uni.minSat }, text: `SAT ${profile.satScore} is at or above the university-catalogue figure ${uni.minSat}; verify the programme policy`, weight: 6, points });
        components.push(component("standardised_test", points, "sat_meets"));
      } else {
        potentialIssues.push({
          code: "sat_below",
          params: { min: uni.minSat, score: profile.satScore! },
          text: `SAT ${profile.satScore} is below the university-catalogue figure ${uni.minSat}; verify whether the programme considers SAT scores`,
          weight: 15,
          points,
        });
        components.push(component("standardised_test", points, "sat_below"));
      }
    }
  } else {
    components.push(component("standardised_test", 0, null, false));
  }

  // Subject alignment — the university's published program focus vs the
  // student's target major. Unknown on either side stays neutral (no claim).
  const alignment = subjectAlignment(profile.targetMajor, uni.programMajor);
  if (alignment.level === "strong") {
    score += 12;
    reasons.push({ code: "major_strong", params: { major: uni.programMajor ?? "" }, text: `Offers your field: ${uni.programMajor}`, weight: 12 });
    components.push(component("field", 12, "major_strong"));
  } else if (alignment.level === "partial") {
    score += 4;
    reasons.push({ code: "major_partial", params: { major: uni.programMajor ?? "" }, text: `Partly related to your field: ${uni.programMajor}`, weight: 4 });
    components.push(component("field", 4, "major_partial"));
  } else if (alignment.level === "none") {
    score -= 15;
    potentialIssues.push({
      code: "major_not_offered",
      params: { major: uni.programMajor ?? "", field: profile.targetMajor ?? "" },
      text: `Programmes focus on ${uni.programMajor} — check whether your field (${profile.targetMajor}) is offered here`,
      weight: 15,
    });
    components.push(component("field", -15, "major_not_offered"));
  } else {
    components.push(component("field", 0, null, false));
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
    const coverage = ratio(budget, totalUniCost) ?? 0;
    if (coverage >= 1) {
      // Meeting the budget exactly is worth +8; a 40% cushion earns the full
      // +10. Everything in between is proportional.
      const points = interpolate(coverage, [
        { x: 1, y: 8 },
        { x: 1.4, y: 10 },
      ]);
      score += points;
      reasons.push({ code: "budget_fits", params: { cost: totalUniCost.toLocaleString() }, text: `Estimated cost $${totalUniCost.toLocaleString()}/yr fits your budget`, weight: points });
      components.push(component("cost", points, "budget_fits"));
    } else {
      // A shortfall is charged progressively (−2 when almost covered, −15 at
      // half, −20 with nothing covered) and then scaled by how binding the
      // funding requirement is. The scale is capped so a 95%-funded student
      // never loses more points than an unfunded one with the same gap.
      const basePenalty = interpolate(coverage, [
        { x: 0, y: -20 },
        { x: 0.5, y: -15 },
        { x: 1, y: -2 },
      ]);
      const deficit = totalUniCost - budget;
      const scale = profile.requiresFullScholarship ? 1.25 : needsAid ? 1.1 : deficit > 30000 ? 1.2 : 1;
      const points = Math.max(-25, roundTo(basePenalty * scale, 1));
      score += points;
      potentialIssues.push({
        code: "budget_exceeds",
        params: { cost: totalUniCost.toLocaleString(), budget: budget.toLocaleString() },
        text: `Estimated cost $${totalUniCost.toLocaleString()}/yr exceeds your $${budget.toLocaleString()} budget`,
        weight: Math.abs(points),
      });
      components.push(component("cost", points, "budget_exceeds"));
    }
  } else {
    components.push(component("cost", 0, null, false));
  }

  // Family income is supporting evidence, not a replacement for the student's
  // stated budget. When budget is absent, it still prevents the financial
  // profile from being silently ignored: how far the recorded income covers
  // the cost decides how many of the 6 points are lost.
  if (totalUniCost != null && budget == null && familyIncome != null) {
    const incomeRatio = ratio(familyIncome, totalUniCost) ?? 0;
    if (incomeRatio >= 1) {
      score += 3;
      reasons.push({
        code: "income_supports_cost",
        params: { income: familyIncome.toLocaleString(), cost: totalUniCost.toLocaleString() },
        text: `Recorded family income $${familyIncome.toLocaleString()}/yr covers the estimated annual cost`,
        weight: 3,
      });
      components.push(component("income", 3, "income_supports_cost"));
    } else {
      const points = interpolate(incomeRatio, [
        { x: 0, y: -10 },
        { x: 1, y: -3 },
      ]);
      score += points;
      potentialIssues.push({
        code: "income_below_cost",
        params: { income: familyIncome.toLocaleString(), cost: totalUniCost.toLocaleString() },
        text: `Recorded family income $${familyIncome.toLocaleString()}/yr is below the estimated $${totalUniCost.toLocaleString()} annual cost`,
        weight: Math.abs(points),
      });
      components.push(component("income", points, "income_below_cost"));
    }
  } else {
    components.push(component("income", 0, null, false));
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
    components.push(component("funding_requirement", -8, "full_funding_required"));
  } else if (needsAid && totalUniCost == null) {
    potentialIssues.push({
      code: "financial_plan_missing",
      params: {},
      text: "You marked financial aid as needed, but this university has no verified full-cost figure",
      weight: 7,
      points: 0,
    });
    components.push(component("funding_requirement", 0, "financial_plan_missing"));
  } else if (needsAid && totalUniCost != null && budget == null) {
    potentialIssues.push({
      code: "financial_budget_missing",
      params: {},
      text: "Add your annual budget so we can compare this cost with your funding plan",
      weight: 7,
      points: 0,
    });
    components.push(component("funding_requirement", 0, "financial_budget_missing"));
  } else {
    // Compared only when the profile actually stated a funding position —
    // "not asked yet" must stay an unknown, not a silent pass.
    const fundingFlagKnown =
      profile.requiresFullScholarship != null ||
      profile.needsFinancialAid != null ||
      profile.needScholarship != null;
    components.push(component("funding_requirement", 0, null, fundingFlagKnown));
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

  const countryPreferred = preferredList.some((c) => c.toLowerCase() === uni.country.toLowerCase());
  if (countryPreferred) {
    score += 8;
    reasons.push({ code: "country_preferred", params: { country: uni.country }, text: `${uni.country} is on your preferred list`, weight: 8 });
  }
  components.push(component("country", countryPreferred ? 8 : 0, countryPreferred ? "country_preferred" : null, preferredList.length > 0));

  // Clamp Score — rounded exactly once, after every component is summed.
  const rawScore = roundTo(score, 1);
  const matchScore = Math.min(99, Math.max(35, Math.round(rawScore)));

  // Ranked output: the 2 most important positives and the 2 largest
  // data-backed shortfalls. Unrecorded test scores are unknown, not failures,
  // and therefore do not enter the negative-reason list.
  reasons.sort((a, b) => b.weight - a.weight);
  potentialIssues.sort((a, b) => b.weight - a.weight);

  const breakdown = breakdownOf(rawScore, components);

  return {
    matchScore,
    // Unclamped total and the exact per-dimension arithmetic behind it.
    rawScore,
    breakdown,
    reasons: reasons.slice(0, 2).map(r => r.text),
    potentialIssues: potentialIssues.slice(0, 2).map(i => i.text),
    // Structured twins of the two arrays above — same entries, same order —
    // so /api/* can translate the sentence instead of re-parsing it.
    reasonDetails: reasons.slice(0, 2).map(toDetail),
    issueDetails: potentialIssues.slice(0, 2).map(toDetail),
  };
}

export function calculateScholarshipMatch(profile: StudentProfileData, scholarship: ScholarshipData) {
  // Base 65 mirrors the university matcher's neutral start.
  let score = 65;
  const components: MatchComponent[] = [component("base", 65, null)];
  const reasons: WeightedReason[] = [];
  const potentialIssues: WeightedReason[] = [];

  // GPA check (spec §22 — explain WHY it matches). Unknown scale → unknown
  // GPA: no comparison, no claim (see src/lib/gpa.ts). Meeting the bar starts
  // at a third of the award and is fully earned 0.4 above it; a shortfall is
  // charged progressively up to the full −25 at 0.8 below.
  const normGpa = gpaTo40Scale(profile.gpa, profile.gpaScale);
  if (scholarship.minGpa && scholarship.minGpa > 0 && normGpa != null) {
    const gpaDiff = normGpa - scholarship.minGpa;
    const points = gpaDiff >= 0 ? meets(gpaDiff, 0, 0.4, 15, 0) : shortfall(gpaDiff, 0, 0.8, 25);
    score += points;
    if (gpaDiff >= 0.4) {
      reasons.push({ code: "gpa_well_above", params: { gpa: normGpa.toFixed(2), min: scholarship.minGpa }, text: `GPA ${normGpa.toFixed(2)} well above the ${scholarship.minGpa} minimum`, weight: 15, points });
      components.push(component("gpa", points, "gpa_well_above"));
    } else if (gpaDiff >= 0) {
      reasons.push({ code: "gpa_meets", params: { gpa: normGpa.toFixed(2), min: scholarship.minGpa }, text: `GPA ${normGpa.toFixed(2)} meets the ${scholarship.minGpa} minimum`, weight: 8, points });
      components.push(component("gpa", points, "gpa_meets"));
    } else {
      potentialIssues.push({ code: "gpa_below", params: { gpa: normGpa.toFixed(2), min: scholarship.minGpa }, text: `GPA ${normGpa.toFixed(2)} is below the ${scholarship.minGpa} requirement`, weight: Math.abs(points), points });
      components.push(component("gpa", points, "gpa_below"));
    }
  } else {
    components.push(component("gpa", 0, null, false));
  }

  // A missing IELTS score is unknown rather than evidence of ineligibility.
  // Compare an IELTS value only when the applicant has recorded one; other
  // tests remain alternatives to verify with the award provider, not presumed
  // equivalents and not a penalty in the fit score.
  if (scholarship.minIelts && scholarship.minIelts > 0) {
    const hasIelts = typeof profile.ieltsScore === "number" && profile.ieltsScore > 0;
    if (!hasIelts) {
      components.push(component("english", 0, null, false));
    } else {
      const ieltsDiff = profile.ieltsScore! - scholarship.minIelts;
      const points = ieltsDiff >= 0 ? meets(ieltsDiff, 0, 0.5, 10, 0) : shortfall(ieltsDiff, 0, 1.5, 20);
      score += points;
      if (ieltsDiff >= 0) {
        reasons.push({ code: "ielts_meets", params: { score: profile.ieltsScore!, min: scholarship.minIelts }, text: `IELTS ${profile.ieltsScore} meets the ${scholarship.minIelts} requirement`, weight: 10, points });
        components.push(component("english", points, "ielts_meets"));
      } else {
        potentialIssues.push({ code: "ielts_below", params: { min: scholarship.minIelts, score: profile.ieltsScore! }, text: `IELTS ${scholarship.minIelts} required — you have ${profile.ieltsScore}`, weight: 15, points });
        components.push(component("english", points, "ielts_below"));
      }
    }
  } else {
    components.push(component("english", 0, null, false));
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
      reasons.push({ code: "level_open", params: { level: profile.degreeLevel ?? "" }, text: `Open to ${profile.degreeLevel} applicants`, weight: 10 });
      components.push(component("level", 10, "level_open"));
    } else if (levelFit === "mismatch") {
      score -= 25;
      potentialIssues.push({ code: "level_mismatch", params: { levels: levels.join(", ") }, text: `Only open to: ${levels.join(", ")}`, weight: 25 });
      components.push(component("level", -25, "level_mismatch"));
    } else {
      potentialIssues.push({
        code: "level_unclear",
        params: { levels: levels.join(", ") },
        text: `Levels on this award (${levels.join(", ")}) could not be compared with your level — check the official page`,
        weight: 5,
        points: 0,
      });
      components.push(component("level", 0, "level_unclear"));
    }
  } else {
    components.push(component("level", 0, null, false));
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
          weight: 5,
          points: 0,
        });
        components.push(component("major_eligibility", 0, "major_unclear"));
      } else if (bestSimilarity == null) {
        potentialIssues.push({
          code: "major_missing",
          params: { majors: majors.join(", ") },
          text: `This award lists eligible fields (${majors.join(", ")}) — add your target major to your profile to be matched`,
          weight: 5,
          points: 0,
        });
        components.push(component("major_eligibility", 0, "major_missing"));
      } else {
        // The award is worth +8 only when the field really is eligible; the
        // overlap ratio grades how close a near-miss is (a partial word match
        // is scored between "not eligible" and "fully eligible" instead of
        // snapping to one of two verdicts).
        const eligibility = clamp(bestSimilarity, 0, 1);
        const points = interpolate(eligibility, [
          { x: 0, y: -10 },
          { x: 0.5, y: 4 },
          { x: 1, y: 8 },
        ]);
        if (bestSimilarity >= 0.5) {
          score += points;
          reasons.push({ code: "major_eligible", params: { field: studentMajor }, text: `Your field (${studentMajor}) is eligible`, weight: points, points });
          components.push(component("major_eligibility", points, "major_eligible"));
        } else {
          score += points;
          potentialIssues.push({ code: "major_limited", params: { majors: majors.join(", ") }, text: `Field limited to: ${majors.join(", ")}`, weight: Math.abs(points), points });
          components.push(component("major_eligibility", points, "major_limited"));
        }
      }
    } else {
      components.push(component("major_eligibility", 0, null, false));
    }
  } catch {
    components.push(component("major_eligibility", 0, null, false));
  }

  // Financial need is part of scholarship fit. Account for every profile flag
  // and never treat a need-based award as a match when the student explicitly
  // said they do not need aid.
  const needsAid = profile.needScholarship === true || profile.needsFinancialAid === true || profile.requiresFullScholarship === true;
  const explicitlySelfFunded = profile.needScholarship === false && profile.needsFinancialAid === false && profile.requiresFullScholarship === false;
  if (scholarship.financialNeedBased) {
    if (needsAid) {
      score += 10;
      reasons.push({ code: "need_based", params: {}, text: "Need-based — matches your financial-aid requirement", weight: 10 });
      components.push(component("need_basis", 10, "need_based"));
    } else if (explicitlySelfFunded) {
      score -= 10;
      potentialIssues.push({ code: "need_not_applicable", params: {}, text: "This award is need-based, while your profile says you do not need financial aid", weight: 10 });
      components.push(component("need_basis", -10, "need_not_applicable"));
    } else {
      potentialIssues.push({ code: "financial_need_unknown", params: {}, text: "This award is need-based — add your financial-aid need to assess the fit", weight: 5, points: 0 });
      components.push(component("need_basis", 0, "financial_need_unknown"));
    }
  } else {
    components.push(component("need_basis", 0, null, false));
  }

  if (profile.requiresFullScholarship === true) {
    const coverage = String(scholarship.coverageType ?? "").toLowerCase();
    if (/full|100%|tuition\s*and\s*(living|stipend)|tuition\s*\+\s*(living|stipend)/i.test(coverage)) {
      score += 8;
      reasons.push({ code: "full_funding_match", params: {}, text: "Coverage appears compatible with your full-scholarship requirement", weight: 8 });
      components.push(component("funding_coverage", 8, "full_funding_match"));
    } else {
      potentialIssues.push({ code: "full_funding_unclear", params: {}, text: "You require full funding — this award's coverage may not cover tuition and living costs", weight: 5, points: 0 });
      components.push(component("funding_coverage", 0, "full_funding_unclear"));
    }
  } else {
    components.push(component("funding_coverage", 0, null, false));
  }

  // Merit-based awards also read the activity portfolio. Academic numbers and
  // achievements should not be evaluated in two disconnected worlds: the
  // strength of the record grades the award, so a 3.9 with publications earns
  // more of the merit points than a 3.6 with none.
  if (scholarship.meritBased) {
    const activity = activityFacts(profile);
    const academicCase = normGpa != null ? clamp((normGpa - 3.4) / 0.6, 0, 1) : 0;
    const portfolioCase = clamp(
      0.5 * saturatingCurve(activity.leadership + activity.research, 2) +
        0.3 * saturatingCurve(activity.awards, 2) +
        0.2 * saturatingCurve(Number(profile.researchPublications ?? 0), 2),
      0,
      1
    );
    const meritStrength = clamp(0.7 * academicCase + 0.3 * portfolioCase, 0, 1);
    if (meritStrength > 0) {
      const points = roundTo(10 * meritStrength, 1);
      score += points;
      reasons.push({ code: "merit_based", params: {}, text: "Merit-based — strong academic record, activities or publications", weight: points });
      components.push(component("merit", points, "merit_based"));
    } else {
      components.push(component("merit", 0, null, false));
    }
  } else {
    components.push(component("merit", 0, null, false));
  }

  const rawScore = roundTo(score, 1);
  const matchScore = Math.min(98, Math.max(30, Math.round(rawScore)));
  const isEligible = matchScore >= 60;

  return {
    matchScore,
    isEligible,
    rawScore,
    breakdown: breakdownOf(rawScore, components),
    reasons: reasons.slice(0, 4).map((r) => r.text),
    potentialIssues: potentialIssues.slice(0, 3).map((i) => i.text),
    // Same entries, same order as the two arrays above (see ReasonDetail).
    reasonDetails: reasons.slice(0, 4).map(toDetail),
    issueDetails: potentialIssues.slice(0, 3).map(toDetail),
  };
}
