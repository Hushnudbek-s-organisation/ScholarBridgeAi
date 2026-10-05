import { compareDegreeLevels, undergraduateTestApplies } from "./degreeLevels";
import { gpaTo40Scale } from "./gpa";
import { canonicalSubjectTokens, subjectAffinity, subjectTokens } from "./subjectAffinity";

export interface StudentProfileData {
  id?: number;
  name?: string;
  degreeLevel: string;
  targetMajor: string;
  gpa: number;
  gpaScale: number;
  ieltsScore?: number | null;
  toeflScore?: number | null;
  duolingoScore?: number | null;
  satScore?: number | null;
  greScore?: number | null;
  budgetAnnualUsd: number;
  preferredCountries?: string | string[];
  needScholarship: boolean;
  extracurriculars?: string | null;
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

export function calculateUniversityMatch(profile: StudentProfileData, uni: UniversityData) {
  let score = 70;
  // Weighted reasons/issues — ranked by importance so the UI can show the
  // 2 most important + and the 2 biggest − (spec §23 — explain the score).
  const reasons: { text: string; weight: number }[] = [];
  const potentialIssues: { text: string; weight: number }[] = [];

  // Normalize GPA to 4.0 scale. An unknown scale with a value > 4 stays
  // unknown (never clamped to a perfect 4.0) — see src/lib/gpa.ts.
  const normGpa = gpaTo40Scale(profile.gpa, profile.gpaScale);

  // GPA — only when the university officially specifies a minimum (spec §14)
  // AND the student's GPA is comparable (normGpa != null).
  if (uni.minGpa != null && normGpa != null) {
    const gpaDiff = normGpa - uni.minGpa;
    if (gpaDiff >= 0.5) {
      score += 15;
      reasons.push({ text: `GPA ${normGpa.toFixed(2)} well above the ${uni.minGpa} minimum`, weight: 15 });
    } else if (gpaDiff >= 0.2) {
      score += 10;
      reasons.push({ text: `GPA ${normGpa.toFixed(2)} above the ${uni.minGpa} minimum`, weight: 10 });
    } else if (gpaDiff >= 0) {
      score += 5;
      reasons.push({ text: `GPA ${normGpa.toFixed(2)} meets the ${uni.minGpa} minimum`, weight: 5 });
    } else if (gpaDiff >= -0.3) {
      score -= 12;
      potentialIssues.push({ text: `GPA ${normGpa.toFixed(2)} slightly below the ${uni.minGpa} minimum`, weight: 12 });
    } else {
      score -= 25;
      potentialIssues.push({ text: `GPA ${normGpa.toFixed(2)} is below the ${uni.minGpa} requirement`, weight: 25 });
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
          text: `IELTS ${uni.minIelts} is the published bar — you have ${alt}; confirm whether it is accepted`,
          weight: 5,
        });
      } else {
        score -= 25;
        potentialIssues.push({
          text: `IELTS ${uni.minIelts} required — you don't have an IELTS score yet`,
          weight: 25,
        });
      }
    } else if (profile.ieltsScore! >= uni.minIelts + 0.5) {
      score += 8;
      reasons.push({ text: `IELTS ${profile.ieltsScore} above the ${uni.minIelts} requirement`, weight: 8 });
    } else if (profile.ieltsScore! >= uni.minIelts) {
      score += 4;
      reasons.push({ text: `IELTS ${profile.ieltsScore} meets the ${uni.minIelts} requirement`, weight: 4 });
    } else {
      score -= 20;
      potentialIssues.push({
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
        text: `SAT ${uni.minSat} required — you don't have an SAT score yet`,
        weight: 20,
      });
    } else if (profile.satScore! >= uni.minSat) {
      score += 6;
      reasons.push({ text: `SAT ${profile.satScore} meets the ${uni.minSat} requirement`, weight: 6 });
    } else {
      score -= 15;
      potentialIssues.push({
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
    reasons.push({ text: `Offers your field: ${uni.programMajor}`, weight: 12 });
  } else if (alignment.level === "partial") {
    score += 4;
    reasons.push({ text: `Partly related to your field: ${uni.programMajor}`, weight: 4 });
  } else if (alignment.level === "none") {
    score -= 15;
    potentialIssues.push({
      text: `Programmes focus on ${uni.programMajor} — check whether your field (${profile.targetMajor}) is offered here`,
      weight: 15,
    });
  }

  // Budget Alignment — only when tuition data is verified AND the profile has a budget
  // (NULL ≠ $0, spec §16; nullable budget must never crash formatting).
  if (
    uni.annualTuitionUsd != null &&
    profile.budgetAnnualUsd != null &&
    Number.isFinite(profile.budgetAnnualUsd)
  ) {
    const totalUniCost = uni.annualTuitionUsd + (uni.annualLivingEstUsd ?? 0);
    if (profile.budgetAnnualUsd >= totalUniCost) {
      score += 10;
      reasons.push({ text: `Estimated cost $${totalUniCost.toLocaleString()}/yr fits your budget`, weight: 10 });
    } else {
      const budgetDeficit = totalUniCost - profile.budgetAnnualUsd;
      const weight = budgetDeficit > 30000 && !profile.needScholarship ? 20 : 10;
      score -= weight;
      potentialIssues.push({
        text: `Estimated cost $${totalUniCost.toLocaleString()}/yr exceeds your $${profile.budgetAnnualUsd.toLocaleString()} budget`,
        weight,
      });
    }
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
    reasons.push({ text: `${uni.country} is on your preferred list`, weight: 8 });
  }

  // Research / Work Experience Boost for Master/PhD or top ranking
  if ((profile.researchPublications || 0) > 0 || (profile.workExperienceYears || 0) > 0) {
    score += 5;
    reasons.push({ text: "Research / work experience strengthens your application", weight: 5 });
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
  };
}

export function calculateScholarshipMatch(profile: StudentProfileData, scholarship: ScholarshipData) {
  let score = 65;
  const reasons: string[] = [];
  const potentialIssues: string[] = [];

  // GPA check (spec §22 — explain WHY it matches). Unknown scale → unknown
  // GPA: no comparison, no claim (see src/lib/gpa.ts).
  const normGpa = gpaTo40Scale(profile.gpa, profile.gpaScale);
  if (scholarship.minGpa && scholarship.minGpa > 0 && normGpa != null) {
    if (normGpa >= scholarship.minGpa + 0.4) {
      score += 15;
      reasons.push(`GPA ${normGpa.toFixed(2)} well above the ${scholarship.minGpa} minimum`);
    } else if (normGpa >= scholarship.minGpa) {
      score += 8;
      reasons.push(`GPA ${normGpa.toFixed(2)} meets the ${scholarship.minGpa} minimum`);
    } else {
      score -= 20;
      potentialIssues.push(`GPA ${normGpa.toFixed(2)} is below the ${scholarship.minGpa} requirement`);
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
        potentialIssues.push(
          `IELTS ${scholarship.minIelts} is the published bar — you have ${alt}; confirm whether it is accepted`
        );
      } else {
        score -= 15;
        potentialIssues.push(`IELTS ${scholarship.minIelts} required — you don't have an IELTS score yet`);
      }
    } else if (profile.ieltsScore! >= scholarship.minIelts) {
      score += 10;
      reasons.push(`IELTS ${profile.ieltsScore} meets the ${scholarship.minIelts} requirement`);
    } else {
      score -= 15;
      potentialIssues.push(`IELTS ${scholarship.minIelts} required — you have ${profile.ieltsScore}`);
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
      reasons.push(`Open to ${profile.degreeLevel} applicants`);
    } else if (levelFit === "mismatch") {
      score -= 25;
      potentialIssues.push(`Only open to: ${levels.join(", ")}`);
    } else {
      potentialIssues.push(
        `Levels on this award (${levels.join(", ")}) could not be compared with your level — check the official page`
      );
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
        potentialIssues.push(
          `This award lists eligible fields (${majors.join(", ")}) — your target major could not be compared, check the official page`
        );
      } else if (bestSimilarity == null) {
        potentialIssues.push(
          `This award lists eligible fields (${majors.join(", ")}) — add your target major to your profile to be matched`
        );
      } else {
        if (bestSimilarity >= 0.5) {
          score += 8;
          reasons.push(`Your field (${studentMajor}) is eligible`);
        } else {
          score -= 10;
          potentialIssues.push(`Field limited to: ${majors.join(", ")}`);
        }
      }
    }
  } catch {
    // fallback
  }

  // Need based vs profile budget
  if (scholarship.financialNeedBased && profile.needScholarship) {
    score += 10;
    reasons.push("Need-based — matches your scholarship requirement");
  }

  // Merit based vs GPA & Publications
  if (scholarship.meritBased) {
    if ((normGpa != null && normGpa >= 3.6) || (profile.researchPublications || 0) > 0) {
      score += 10;
      reasons.push("Merit-based — strong academic record / publications");
    }
  }

  const matchScore = Math.min(98, Math.max(30, Math.round(score)));
  const isEligible = matchScore >= 60;

  return { matchScore, isEligible, reasons: reasons.slice(0, 4), potentialIssues: potentialIssues.slice(0, 3) };
}
