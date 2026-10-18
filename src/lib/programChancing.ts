/**
 * High-Precision 5-Layer Program-Specific Chancing & Competitive Positioning Engine.
 *
 * Evaluates a student's profile against:
 *  Layer 1: 14 Granular Department / Program Selectivity Profiles
 *  Layer 2: Exact `program_requirements` row evaluation (GPA, IELTS/TOEFL/DET, SAT/ACT, IB/A-Level/AP, portfolio, interview)
 *  Layer 3: Student Percentile Positioning within the Program's Admitted Cohort (25th / 50th / 75th bands)
 *  Layer 4: Degree-Level Calibration (Bachelor vs Master vs PhD)
 *  Layer 5: Empirical Outcome Calibration (`application_outcomes` with `shareConsent = true`)
 */

import {
  matchQsUniversityBenchmark,
  type QsUniversityBenchmark,
  type UniversityBenchmarkLookupInput,
} from "./qsTop200Benchmarks";
import { countActivities, normalizedGpa, type ChancingProfile } from "./chancing";
import { MIN_RECORDS_PER_UNIVERSITY } from "./dataset";
import { majorOverlap, subjectAlignment } from "./matching";
import { clamp, roundTo } from "./scoring";

export interface ProgramDepartmentProfile {
  key: string;
  label: string;
  acceptRateMultiplier: number; // Relative to overall university acceptance rate
  gpaShift: number;             // Shift to 25th/50th/75th GPA bands on 4.0 scale
  satShift: number;             // Shift to 25th/50th/75th SAT bands
  ieltsShift: number;           // Shift to minimum/median IELTS requirement
  mathRigorWeight: number;      // Weight on quantitative/SAT Math/AP Calc/HL Math
  portfolioOrAudition: boolean;
  typicalPrereqs: string[];
}

export const PROGRAM_DEPARTMENT_PROFILES: Record<string, ProgramDepartmentProfile> = {
  cs_ai: {
    key: "cs_ai",
    label: "Computer Science, AI & Data Science",
    acceptRateMultiplier: 0.42,
    gpaShift: +0.10,
    satShift: +45,
    ieltsShift: 0.0,
    mathRigorWeight: 0.35,
    portfolioOrAudition: false,
    typicalPrereqs: ["Calculus / HL Math", "Physics or Computer Science", "Algorithms / Programming"],
  },
  elec_comp_eng: {
    key: "elec_comp_eng",
    label: "Electrical, Computer & Robotics Engineering",
    acceptRateMultiplier: 0.52,
    gpaShift: +0.08,
    satShift: +35,
    ieltsShift: 0.0,
    mathRigorWeight: 0.35,
    portfolioOrAudition: false,
    typicalPrereqs: ["Calculus / Further Math", "Physics", "Linear Algebra"],
  },
  mech_aero_eng: {
    key: "mech_aero_eng",
    label: "Mechanical, Aerospace & Manufacturing Engineering",
    acceptRateMultiplier: 0.62,
    gpaShift: +0.05,
    satShift: +25,
    ieltsShift: 0.0,
    mathRigorWeight: 0.30,
    portfolioOrAudition: false,
    typicalPrereqs: ["Calculus", "Physics", "Mechanics"],
  },
  civil_chem_env_eng: {
    key: "civil_chem_env_eng",
    label: "Civil, Chemical, Materials & Environmental Engineering",
    acceptRateMultiplier: 0.78,
    gpaShift: +0.02,
    satShift: +10,
    ieltsShift: 0.0,
    mathRigorWeight: 0.25,
    portfolioOrAudition: false,
    typicalPrereqs: ["Calculus", "Chemistry", "Physics"],
  },
  data_math_physics: {
    key: "data_math_physics",
    label: "Mathematics, Statistics, Physics & Quantitative Sciences",
    acceptRateMultiplier: 0.68,
    gpaShift: +0.06,
    satShift: +35,
    ieltsShift: 0.0,
    mathRigorWeight: 0.35,
    portfolioOrAudition: false,
    typicalPrereqs: ["Advanced Calculus / HL Math", "Physics", "Probability & Statistics"],
  },
  business_finance_econ: {
    key: "business_finance_econ",
    label: "Business, Finance, Economics & Management",
    acceptRateMultiplier: 0.55,
    gpaShift: +0.06,
    satShift: +25,
    ieltsShift: +0.5,
    mathRigorWeight: 0.25,
    portfolioOrAudition: false,
    typicalPrereqs: ["Calculus / Quantitative Methods", "Micro/Macroeconomics", "Leadership Track"],
  },
  medicine_health: {
    key: "medicine_health",
    label: "Medicine, Biomedical Sciences, Dentistry & Public Health",
    acceptRateMultiplier: 0.38,
    gpaShift: +0.12,
    satShift: +40,
    ieltsShift: +0.5,
    mathRigorWeight: 0.20,
    portfolioOrAudition: false,
    typicalPrereqs: ["Chemistry", "Biology", "UCAT / MCAT / Clinical Volunteering & Interview"],
  },
  biotech_life_sci: {
    key: "biotech_life_sci",
    label: "Biology, Biotechnology, Chemistry & Life Sciences",
    acceptRateMultiplier: 0.82,
    gpaShift: +0.02,
    satShift: +10,
    ieltsShift: 0.0,
    mathRigorWeight: 0.20,
    portfolioOrAudition: false,
    typicalPrereqs: ["Biology", "Chemistry", "Lab Research"],
  },
  law_policy_ir: {
    key: "law_policy_ir",
    label: "Law, International Relations, Political Science & Public Policy",
    acceptRateMultiplier: 0.65,
    gpaShift: +0.05,
    satShift: +15,
    ieltsShift: +0.5,
    mathRigorWeight: 0.10,
    portfolioOrAudition: false,
    typicalPrereqs: ["LNAT / Analytical Writing", "History / Government", "Debate / Policy Research"],
  },
  architecture_design: {
    key: "architecture_design",
    label: "Architecture, Urban Planning, Industrial & Digital Design",
    acceptRateMultiplier: 0.70,
    gpaShift: 0.0,
    satShift: 0,
    ieltsShift: 0.0,
    mathRigorWeight: 0.15,
    portfolioOrAudition: true,
    typicalPrereqs: ["Design Portfolio (12–20 pieces)", "Visual Arts / CAD", "Physics / Geometry"],
  },
  media_comm_journalism: {
    key: "media_comm_journalism",
    label: "Media, Communications, Journalism & Film",
    acceptRateMultiplier: 0.85,
    gpaShift: -0.02,
    satShift: -10,
    ieltsShift: +0.5,
    mathRigorWeight: 0.05,
    portfolioOrAudition: false,
    typicalPrereqs: ["Advanced English / Writing Samples", "Media Production / Journalism"],
  },
  psychology_neuro: {
    key: "psychology_neuro",
    label: "Psychology, Cognitive Science & Neuroscience",
    acceptRateMultiplier: 0.75,
    gpaShift: +0.03,
    satShift: +10,
    ieltsShift: +0.5,
    mathRigorWeight: 0.15,
    portfolioOrAudition: false,
    typicalPrereqs: ["Biology", "Statistics / Research Methods", "Psychology"],
  },
  humanities_languages: {
    key: "humanities_languages",
    label: "Humanities, History, Philosophy, Literature & Languages",
    acceptRateMultiplier: 1.15,
    gpaShift: -0.04,
    satShift: -15,
    ieltsShift: +0.5,
    mathRigorWeight: 0.05,
    portfolioOrAudition: false,
    typicalPrereqs: ["Literature / History", "Critical Writing Sample", "Second Language"],
  },
  education_social: {
    key: "education_social",
    label: "Education, Sociology, Anthropology & Social Work",
    acceptRateMultiplier: 1.18,
    gpaShift: -0.05,
    satShift: -20,
    ieltsShift: 0.0,
    mathRigorWeight: 0.05,
    portfolioOrAudition: false,
    typicalPrereqs: ["Social Sciences", "Community Engagement", "Academic Writing"],
  },
};

export function resolveProgramDepartmentProfile(
  programText: string | null | undefined,
  fallbackField?: string | null
): ProgramDepartmentProfile {
  const combined = `${programText || ""} ${fallbackField || ""}`.toLowerCase();

  if (
    /\b(computer science|artificial intelligence|machine learning|software|cybersecurity|informatics|computing)\b/.test(
      combined
    )
  ) {
    return PROGRAM_DEPARTMENT_PROFILES.cs_ai;
  }
  if (/\b(electrical|electronics|robotics|mechatronics|computer engineering|telecommunications)\b/.test(combined)) {
    return PROGRAM_DEPARTMENT_PROFILES.elec_comp_eng;
  }
  if (/\b(mechanical|aerospace|aeronautical|automotive|manufacturing|industrial engineering)\b/.test(combined)) {
    return PROGRAM_DEPARTMENT_PROFILES.mech_aero_eng;
  }
  if (/\b(civil|chemical|environmental|materials|petroleum|mining|structural)\b/.test(combined)) {
    return PROGRAM_DEPARTMENT_PROFILES.civil_chem_env_eng;
  }
  if (/\b(data science|mathematics|statistics|actuarial|physics|astrophysics|quantitative)\b/.test(combined)) {
    return PROGRAM_DEPARTMENT_PROFILES.data_math_physics;
  }
  if (/\b(medicine|medical|clinical|dentistry|nursing|pharmacy|public health|epidemiology|veterinary)\b/.test(combined)) {
    return PROGRAM_DEPARTMENT_PROFILES.medicine_health;
  }
  if (/\b(biotechnology|biology|biochemistry|genetics|molecular|life science|chemistry|ecology)\b/.test(combined)) {
    return PROGRAM_DEPARTMENT_PROFILES.biotech_life_sci;
  }
  if (/\b(law|legal|llb|llm|international relations|political|public policy|diplomacy|governance)\b/.test(combined)) {
    return PROGRAM_DEPARTMENT_PROFILES.law_policy_ir;
  }
  if (/\b(architecture|urban planning|urban design|industrial design|graphic design|fine arts|interior)\b/.test(combined)) {
    return PROGRAM_DEPARTMENT_PROFILES.architecture_design;
  }
  if (/\b(media|communication|journalism|film|broadcasting|public relations)\b/.test(combined)) {
    return PROGRAM_DEPARTMENT_PROFILES.media_comm_journalism;
  }
  if (/\b(psychology|cognitive|neuroscience|behavioral)\b/.test(combined)) {
    return PROGRAM_DEPARTMENT_PROFILES.psychology_neuro;
  }
  if (/\b(history|philosophy|literature|linguistics|classics|languages|religious|arts and humanities)\b/.test(combined)) {
    return PROGRAM_DEPARTMENT_PROFILES.humanities_languages;
  }
  if (/\b(education|teaching|pedagogy|sociology|anthropology|social work|development studies)\b/.test(combined)) {
    return PROGRAM_DEPARTMENT_PROFILES.education_social;
  }
  if (/\b(business|finance|economics|management|accounting|marketing|mba|commerce|entrepreneurship)\b/.test(combined)) {
    return PROGRAM_DEPARTMENT_PROFILES.business_finance_econ;
  }

  return PROGRAM_DEPARTMENT_PROFILES.business_finance_econ;
}

export interface ProgramCatalogRowInput {
  id: number;
  universityId: number;
  name: string;
  degreeLevel: string;
  field?: string | null;
  department?: string | null;
  language?: string | null;
  durationYears?: number | null;
  tuitionAnnualUsd?: number | null;
  applicationFeeUsd?: number | null;
  intakeTerms?: string | null;
  applicationType?: string | null;
  officialProgramUrl?: string | null;
  sourceUrl?: string | null;
}

export interface ProgramRequirementRowInput {
  id?: number;
  programId?: number;
  minIelts?: number | null;
  minToefl?: number | null;
  minDet?: number | null;
  minSat?: number | null;
  minAct?: number | null;
  minGpa?: number | null;
  ibRequirement?: string | null;
  aLevelRequirement?: string | null;
  apRequirement?: string | null;
  subjectRequirements?: string | null;
  portfolioRequired?: boolean | null;
  interviewRequired?: boolean | null;
  recommendationRequired?: boolean | null;
  personalStatementRequired?: boolean | null;
  otherRequirements?: string | null;
  academicYear?: string | null;
  sourceUrl?: string | null;
}

export interface EmpiricalOutcomeRowInput {
  universityId?: number | null;
  result?: string | null;
  shareConsent?: boolean | null;
  snapshotGpa?: number | null;
  snapshotGpaScale?: number | null;
  snapshotIelts?: number | null;
  snapshotToefl?: number | null;
  snapshotSat?: number | null;
  snapshotAct?: number | null;
  snapshotMajor?: string | null;
  snapshotCountry?: string | null;
  snapshotDegreeLevel?: string | null;
}

export type EligibilityStatus = "meets_all" | "borderline" | "below_minimum" | "unknown_inputs";

export type SelectivityCategory =
  | "Safety / Likely"
  | "Target / Match"
  | "Reach"
  | "High Reach / Ultra-Selective";

export type CohortPositionTier =
  | "Above 75th Percentile (Top Quartile)"
  | "50th–75th Percentile (Upper-Middle Quartile)"
  | "25th–50th Percentile (Lower-Middle Quartile)"
  | "Below 25th Percentile";

export interface RequirementCheckItem {
  dimension: "gpa" | "english" | "standardized" | "curriculum" | "portfolio" | "interview";
  label: string;
  status: "met" | "borderline" | "below" | "missing" | "info";
  studentValue: string;
  requiredValue: string;
  detail: string;
}

export interface EmpiricalOutcomeSummary {
  totalConsented: number;
  programMatchedCount: number;
  acceptedCount: number;
  rejectedCount: number;
  waitlistedCount: number;
  empiricalAcceptanceRatePct: number | null;
  medianAdmittedGpa: number | null;
  medianAdmittedSat: number | null;
  hasSufficientEmpiricalData: boolean;
}

export interface ProgramChanceEvaluation {
  programId: number | null;
  programName: string;
  degreeLevel: string;
  field: string;
  departmentKey: string;
  departmentLabel: string;
  officialProgramUrl: string;
  // Layer 1 & 3: Program vs University Selectivity & Cohort Percentiles
  universityAcceptRatePct: number;
  effectiveProgramAcceptRatePct: number;
  acceptRateMultiplier: number;
  programGpa25: number;
  programGpa50: number;
  programGpa75: number;
  programSat25: number | null;
  programSat50: number | null;
  programSat75: number | null;
  effectiveMinGpa: number;
  effectiveMinIelts: number;
  medianIelts: number;
  effectiveMinToefl: number;
  effectiveMinDet: number;
  effectiveMinSat: number | null;
  effectiveMinAct: number | null;
  // Student Normalized Metrics & Percentiles
  studentGpa4: number | null;
  studentGpaPercentile: number | null;
  studentSat: number | null;
  studentSatPercentile: number | null;
  studentEnglishLabel: string | null;
  studentEnglishPercentile: number | null;
  // Layer 2: Eligibility & Checks
  eligibilityStatus: EligibilityStatus;
  requirementChecks: RequirementCheckItem[];
  ibRequirement: string | null;
  aLevelRequirement: string | null;
  apRequirement: string | null;
  subjectRequirements: string | null;
  portfolioRequired: boolean;
  interviewRequired: boolean;
  typicalPrereqs: string[];
  // Layer 3 & 4: Composite Positioning & Degree Calibration
  compositeProgramFitScore: number;
  cohortPositionTier: CohortPositionTier;
  selectivityCategory: SelectivityCategory;
  degreeCalibrationNote: string;
  strengths: string[];
  gaps: string[];
  // Layer 5: Empirical Outcome Summary
  empiricalOutcomes: EmpiricalOutcomeSummary;
}

/**
 * Computes a continuous percentile (1 to 99) given a student value and the
 * cohort's 25th, 50th, and 75th percentile anchors.
 */
export function computeCohortPercentile(
  value: number,
  p25: number,
  p50: number,
  p75: number,
  minFloor: number,
  maxCeil: number
): number {
  const safeP25 = Math.min(p25, p50 - 0.01);
  const safeP75 = Math.max(p75, p50 + 0.01);

  if (value <= minFloor) return 2;
  if (value < safeP25) {
    const span = Math.max(0.01, safeP25 - minFloor);
    const ratio = clamp((value - minFloor) / span, 0, 1);
    return Math.round(clamp(2 + ratio * 23, 2, 24));
  }
  if (value <= p50) {
    const span = Math.max(0.01, p50 - safeP25);
    const ratio = clamp((value - safeP25) / span, 0, 1);
    return Math.round(clamp(25 + ratio * 25, 25, 50));
  }
  if (value <= safeP75) {
    const span = Math.max(0.01, safeP75 - p50);
    const ratio = clamp((value - p50) / span, 0, 1);
    return Math.round(clamp(50 + ratio * 25, 50, 75));
  }
  const upperSpan = Math.max(0.01, maxCeil - safeP75);
  const ratio = clamp((value - safeP75) / upperSpan, 0, 1);
  return Math.round(clamp(75 + ratio * 23, 75, 98));
}

function computeMedian(values: number[]): number | null {
  if (!values.length) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 1 ? sorted[mid] : roundTo((sorted[mid - 1] + sorted[mid]) / 2, 2);
}

export function summarizeEmpiricalOutcomes(
  outcomes: EmpiricalOutcomeRowInput[],
  programFieldOrName?: string | null
): EmpiricalOutcomeSummary {
  const consented = outcomes.filter((o) => o.shareConsent === true);
  if (!consented.length) {
    return {
      totalConsented: 0,
      programMatchedCount: 0,
      acceptedCount: 0,
      rejectedCount: 0,
      waitlistedCount: 0,
      empiricalAcceptanceRatePct: null,
      medianAdmittedGpa: null,
      medianAdmittedSat: null,
      hasSufficientEmpiricalData: false,
    };
  }

  const programMatched = programFieldOrName
    ? consented.filter((o) => o.snapshotMajor && (majorOverlap(o.snapshotMajor, programFieldOrName) ?? 0) >= 0.45)
    : [];

  const pool = programMatched.length >= 2 ? programMatched : consented;

  let acceptedCount = 0;
  let rejectedCount = 0;
  let waitlistedCount = 0;
  const admittedGpas: number[] = [];
  const admittedSats: number[] = [];

  for (const row of consented) {
    const res = (row.result || "").toLowerCase();
    if (res === "accepted" || res === "admitted") {
      acceptedCount++;
      const g = normalizedGpa({ gpa: row.snapshotGpa ?? null, gpaScale: row.snapshotGpaScale ?? 4 });
      if (g !== null) admittedGpas.push(g);
      if (typeof row.snapshotSat === "number" && row.snapshotSat >= 800) {
        admittedSats.push(row.snapshotSat);
      }
    } else if (res === "rejected" || res === "denied") {
      rejectedCount++;
    } else if (res === "waitlisted" || res === "deferred") {
      waitlistedCount++;
    }
  }

  // Also compute program-specific acceptance rate if pool has decisions
  let poolAccepted = 0;
  let poolDecided = 0;
  for (const row of pool) {
    const res = (row.result || "").toLowerCase();
    if (res === "accepted" || res === "admitted") {
      poolAccepted++;
      poolDecided++;
    } else if (res === "rejected" || res === "denied" || res === "waitlisted") {
      poolDecided++;
    }
  }

  const totalConsented = consented.length;
  const hasSufficientEmpiricalData = totalConsented >= MIN_RECORDS_PER_UNIVERSITY;
  const empiricalAcceptanceRatePct =
    poolDecided > 0 ? roundTo((poolAccepted / poolDecided) * 100, 1) : null;

  return {
    totalConsented,
    programMatchedCount: programMatched.length,
    acceptedCount,
    rejectedCount,
    waitlistedCount,
    empiricalAcceptanceRatePct,
    medianAdmittedGpa: computeMedian(admittedGpas),
    medianAdmittedSat: admittedSats.length ? Math.round(computeMedian(admittedSats)!) : null,
    hasSufficientEmpiricalData,
  };
}

/**
 * Evaluates a student's profile against a specific university and program (or
 * synthesizes a primary program from the university & student's target major).
 */
export function evaluateUniversityAndProgramChance(
  profile: ChancingProfile & {
    completedCourses?: string | null;
    ibScore?: number | null;
    aLevelGrades?: string | null;
    apCoursesCount?: number | null;
  },
  uni: UniversityBenchmarkLookupInput & {
    programMajor?: string | null;
  },
  program?: ProgramCatalogRowInput | null,
  programReq?: ProgramRequirementRowInput | null,
  empiricalSample: EmpiricalOutcomeRowInput[] = [],
  existingBenchmark?: QsUniversityBenchmark
): ProgramChanceEvaluation {
  const qsBenchmark = existingBenchmark ?? matchQsUniversityBenchmark(uni);

  const programName =
    program?.name ||
    (profile.targetMajor ? `${profile.targetMajor}` : uni.programMajor?.split(",")[0]?.trim() || "Computer Science");
  const degreeLevel = program?.degreeLevel || profile.degreeLevel || "Bachelor";
  const field = program?.field || profile.targetMajor || programName;
  const dept = resolveProgramDepartmentProfile(programName, field);

  // Layer 1 & 3: Shift university 25th/50th/75th bands by department selectivity
  const rawGpa25 = roundTo(clamp(qsBenchmark.gpa25 + dept.gpaShift, 2.4, 3.94), 2);
  const rawGpa50 = roundTo(clamp(qsBenchmark.gpa50 + dept.gpaShift, rawGpa25 + 0.05, 3.98), 2);
  const rawGpa75 = roundTo(clamp(qsBenchmark.gpa75 + dept.gpaShift, rawGpa50 + 0.03, 4.0), 2);

  const effectiveMinGpa = roundTo(
    programReq?.minGpa != null && programReq.minGpa > 0
      ? clamp(programReq.minGpa, 2.0, 3.9)
      : Math.max(2.5, roundTo(rawGpa25 - 0.15, 2)),
    2
  );

  const programGpa25 = roundTo(Math.max(rawGpa25, effectiveMinGpa), 2);
  const programGpa50 = roundTo(Math.max(rawGpa50, Math.min(3.98, programGpa25 + 0.08)), 2);
  const programGpa75 = roundTo(Math.max(rawGpa75, Math.min(4.0, programGpa50 + 0.05)), 2);

  // SAT bands (for Bachelor degrees or when SAT benchmark exists)
  const isGrad = /master|phd|doctor/i.test(degreeLevel);
  let programSat25: number | null = null;
  let programSat50: number | null = null;
  let programSat75: number | null = null;

  if (!isGrad && qsBenchmark.sat25 != null && qsBenchmark.sat50 != null && qsBenchmark.sat75 != null) {
    const s25 = Math.round(clamp(qsBenchmark.sat25 + dept.satShift, 1020, 1540));
    const s50 = Math.round(clamp(qsBenchmark.sat50 + dept.satShift, s25 + 20, 1570));
    const s75 = Math.round(clamp(qsBenchmark.sat75 + dept.satShift, s50 + 15, 1590));
    programSat25 = programReq?.minSat ? Math.max(s25, programReq.minSat) : s25;
    programSat50 = Math.max(s50, programSat25 + 30);
    programSat75 = Math.min(1590, Math.max(s75, programSat50 + 20));
  }

  const effectiveMinSat =
    programReq?.minSat != null && programReq.minSat > 0
      ? programReq.minSat
      : programSat25 != null
      ? Math.max(1000, programSat25 - 40)
      : null;

  const effectiveMinAct =
    programReq?.minAct != null && programReq.minAct > 0 ? programReq.minAct : null;

  const effectiveMinIelts = roundTo(
    programReq?.minIelts != null && programReq.minIelts > 0
      ? programReq.minIelts
      : clamp(qsBenchmark.minIelts + (dept.ieltsShift > 0 && qsBenchmark.minIelts < 7.0 ? 0.5 : 0), 5.5, 8.0),
    1
  );
  const medianIelts = roundTo(Math.max(qsBenchmark.medianIelts, Math.min(8.5, effectiveMinIelts + 0.5)), 1);
  const effectiveMinToefl =
    programReq?.minToefl != null && programReq.minToefl > 0 ? programReq.minToefl : qsBenchmark.minToefl;
  const effectiveMinDet =
    programReq?.minDet != null && programReq.minDet > 0
      ? programReq.minDet
      : Math.round(clamp(effectiveMinIelts * 18, 95, 135));

  const universityAcceptRatePct = roundTo(qsBenchmark.acceptRatePct, 1);
  const effectiveProgramAcceptRatePct = roundTo(
    clamp(universityAcceptRatePct * dept.acceptRateMultiplier, 1.8, 92.0),
    1
  );

  // Layer 2: Evaluate student inputs against program requirements
  const studentGpa4 = normalizedGpa(profile);
  const studentSat =
    typeof profile.satScore === "number" && profile.satScore >= 400 ? profile.satScore : null;
  const studentAct =
    typeof profile.actScore === "number" && profile.actScore >= 1 && profile.actScore <= 36
      ? profile.actScore
      : null;

  const requirementChecks: RequirementCheckItem[] = [];
  const strengths: string[] = [];
  const gaps: string[] = [];

  let hasBelowMin = false;
  let hasBorderline = false;
  let knownCoreInputs = 0;

  // 1. GPA check
  const studentGpaPercentile =
    studentGpa4 !== null
      ? computeCohortPercentile(
          studentGpa4,
          programGpa25,
          programGpa50,
          programGpa75,
          Math.max(2.0, effectiveMinGpa - 0.35),
          4.0
        )
      : null;

  if (studentGpa4 !== null) {
    knownCoreInputs++;
    if (studentGpa4 < effectiveMinGpa - 0.1) {
      hasBelowMin = true;
      requirementChecks.push({
        dimension: "gpa",
        label: "GPA (4.0 Scale)",
        status: "below",
        studentValue: studentGpa4.toFixed(2),
        requiredValue: `Min ${effectiveMinGpa.toFixed(2)} (Median ${programGpa50.toFixed(2)})`,
        detail: `GPA ${studentGpa4.toFixed(2)} is below the program minimum (${effectiveMinGpa.toFixed(2)}) and 25th percentile (${programGpa25.toFixed(2)}).`,
      });
      gaps.push(
        `GPA ${studentGpa4.toFixed(2)} is below ${programName}'s 25th percentile (${programGpa25.toFixed(2)}).`
      );
    } else if (studentGpa4 < programGpa25) {
      hasBorderline = true;
      requirementChecks.push({
        dimension: "gpa",
        label: "GPA (4.0 Scale)",
        status: "borderline",
        studentValue: studentGpa4.toFixed(2),
        requiredValue: `25th–75th: ${programGpa25.toFixed(2)}–${programGpa75.toFixed(2)}`,
        detail: `Meets minimum (${effectiveMinGpa.toFixed(2)}) but sits below the 25th percentile (${programGpa25.toFixed(2)}).`,
      });
      gaps.push(
        `GPA ${studentGpa4.toFixed(2)} is in the bottom quartile for ${programName} (25th pct: ${programGpa25.toFixed(2)}).`
      );
    } else {
      requirementChecks.push({
        dimension: "gpa",
        label: "GPA (4.0 Scale)",
        status: "met",
        studentValue: studentGpa4.toFixed(2),
        requiredValue: `25th–75th: ${programGpa25.toFixed(2)}–${programGpa75.toFixed(2)}`,
        detail:
          studentGpa4 >= programGpa75
            ? `Top quartile GPA (${studentGpa4.toFixed(2)} ≥ 75th pct ${programGpa75.toFixed(2)}).`
            : studentGpa4 >= programGpa50
            ? `Above median admitted GPA (${studentGpa4.toFixed(2)} vs ${programGpa50.toFixed(2)}).`
            : `Within middle 50% admitted GPA band (${programGpa25.toFixed(2)}–${programGpa75.toFixed(2)}).`,
      });
      if (studentGpa4 >= programGpa50) {
        strengths.push(
          `GPA ${studentGpa4.toFixed(2)}/4.0 places at the ${studentGpaPercentile}th percentile of ${programName} admits (median ${programGpa50.toFixed(2)}).`
        );
      }
    }
  } else {
    requirementChecks.push({
      dimension: "gpa",
      label: "GPA (4.0 Scale)",
      status: "missing",
      studentValue: "Not entered",
      requiredValue: `Min ${effectiveMinGpa.toFixed(2)} (Median ${programGpa50.toFixed(2)})`,
      detail: "Add your GPA to compute exact cohort percentile positioning.",
    });
  }

  // 2. English Proficiency check (IELTS / TOEFL / DET)
  let studentEnglishLabel: string | null = null;
  let studentEnglishPercentile: number | null = null;

  if (typeof profile.ieltsScore === "number" && profile.ieltsScore > 0) {
    knownCoreInputs++;
    studentEnglishLabel = `IELTS ${profile.ieltsScore.toFixed(1)}`;
    studentEnglishPercentile = computeCohortPercentile(
      profile.ieltsScore,
      effectiveMinIelts,
      medianIelts,
      Math.min(8.5, medianIelts + 0.5),
      Math.max(4.5, effectiveMinIelts - 1.0),
      9.0
    );
    if (profile.ieltsScore < effectiveMinIelts) {
      if (profile.ieltsScore >= effectiveMinIelts - 0.5) {
        hasBorderline = true;
        requirementChecks.push({
          dimension: "english",
          label: "English Proficiency",
          status: "borderline",
          studentValue: studentEnglishLabel,
          requiredValue: `IELTS ${effectiveMinIelts.toFixed(1)} (or TOEFL ${effectiveMinToefl})`,
          detail: `0.5 band below the direct-entry minimum (IELTS ${effectiveMinIelts.toFixed(1)}); pre-sessional English or retake recommended.`,
        });
      } else {
        hasBelowMin = true;
        requirementChecks.push({
          dimension: "english",
          label: "English Proficiency",
          status: "below",
          studentValue: studentEnglishLabel,
          requiredValue: `IELTS ${effectiveMinIelts.toFixed(1)} (or TOEFL ${effectiveMinToefl})`,
          detail: `Below program minimum IELTS ${effectiveMinIelts.toFixed(1)}.`,
        });
      }
      gaps.push(`IELTS ${profile.ieltsScore.toFixed(1)} is below the required ${effectiveMinIelts.toFixed(1)} band.`);
    } else {
      requirementChecks.push({
        dimension: "english",
        label: "English Proficiency",
        status: "met",
        studentValue: studentEnglishLabel,
        requiredValue: `IELTS ${effectiveMinIelts.toFixed(1)} (Median ${medianIelts.toFixed(1)})`,
        detail: `Clears the published IELTS ${effectiveMinIelts.toFixed(1)} requirement.`,
      });
      if (profile.ieltsScore >= medianIelts) {
        strengths.push(`IELTS ${profile.ieltsScore.toFixed(1)} meets or exceeds the competitive median (${medianIelts.toFixed(1)}).`);
      }
    }
  } else if (typeof profile.toeflScore === "number" && profile.toeflScore > 0) {
    knownCoreInputs++;
    studentEnglishLabel = `TOEFL ${profile.toeflScore}`;
    studentEnglishPercentile = computeCohortPercentile(
      profile.toeflScore,
      effectiveMinToefl,
      Math.min(114, effectiveMinToefl + 8),
      Math.min(118, effectiveMinToefl + 14),
      Math.max(60, effectiveMinToefl - 15),
      120
    );
    if (profile.toeflScore < effectiveMinToefl) {
      if (profile.toeflScore >= effectiveMinToefl - 5) {
        hasBorderline = true;
        requirementChecks.push({
          dimension: "english",
          label: "English Proficiency",
          status: "borderline",
          studentValue: studentEnglishLabel,
          requiredValue: `TOEFL ${effectiveMinToefl} (or IELTS ${effectiveMinIelts.toFixed(1)})`,
          detail: `Within 5 points of minimum TOEFL ${effectiveMinToefl}.`,
        });
      } else {
        hasBelowMin = true;
        requirementChecks.push({
          dimension: "english",
          label: "English Proficiency",
          status: "below",
          studentValue: studentEnglishLabel,
          requiredValue: `TOEFL ${effectiveMinToefl}`,
          detail: `Below program minimum TOEFL ${effectiveMinToefl}.`,
        });
      }
      gaps.push(`TOEFL ${profile.toeflScore} is below the required ${effectiveMinToefl}.`);
    } else {
      requirementChecks.push({
        dimension: "english",
        label: "English Proficiency",
        status: "met",
        studentValue: studentEnglishLabel,
        requiredValue: `TOEFL ${effectiveMinToefl}`,
        detail: `Clears the published TOEFL ${effectiveMinToefl} threshold.`,
      });
      strengths.push(`TOEFL ${profile.toeflScore} clears the ${effectiveMinToefl} requirement.`);
    }
  } else if (typeof profile.duolingoScore === "number" && profile.duolingoScore > 0) {
    knownCoreInputs++;
    studentEnglishLabel = `DET ${profile.duolingoScore}`;
    studentEnglishPercentile = computeCohortPercentile(
      profile.duolingoScore,
      effectiveMinDet,
      Math.min(145, effectiveMinDet + 10),
      Math.min(155, effectiveMinDet + 18),
      85,
      160
    );
    const met = profile.duolingoScore >= effectiveMinDet;
    if (!met) hasBorderline = true;
    requirementChecks.push({
      dimension: "english",
      label: "English Proficiency",
      status: met ? "met" : "borderline",
      studentValue: studentEnglishLabel,
      requiredValue: `DET ${effectiveMinDet} / IELTS ${effectiveMinIelts.toFixed(1)}`,
      detail: met
        ? `Clears the Duolingo English Test threshold (${effectiveMinDet}).`
        : `Below typical DET ${effectiveMinDet} threshold.`,
    });
  } else {
    requirementChecks.push({
      dimension: "english",
      label: "English Proficiency",
      status: "missing",
      studentValue: "Not entered",
      requiredValue: `IELTS ${effectiveMinIelts.toFixed(1)} / TOEFL ${effectiveMinToefl}`,
      detail: `Program requires IELTS ${effectiveMinIelts.toFixed(1)} or TOEFL ${effectiveMinToefl}.`,
    });
  }

  // 3. Standardized Testing check (SAT / ACT)
  let studentSatPercentile: number | null = null;
  if (studentSat !== null && programSat25 !== null && programSat50 !== null && programSat75 !== null) {
    knownCoreInputs++;
    studentSatPercentile = computeCohortPercentile(
      studentSat,
      programSat25,
      programSat50,
      programSat75,
      Math.max(900, programSat25 - 120),
      1600
    );
    const minSatCheck = effectiveMinSat ?? programSat25;
    if (programReq?.minSat && studentSat < programReq.minSat - 30) {
      hasBelowMin = true;
      requirementChecks.push({
        dimension: "standardized",
        label: "SAT / Standardized Test",
        status: "below",
        studentValue: `SAT ${studentSat}`,
        requiredValue: `Min ${programReq.minSat} (25th–75th: ${programSat25}–${programSat75})`,
        detail: `SAT ${studentSat} is below the explicit program minimum (${programReq.minSat}).`,
      });
      gaps.push(`SAT ${studentSat} is below ${programName}'s 25th percentile (${programSat25}).`);
    } else if (studentSat < programSat25) {
      hasBorderline = true;
      requirementChecks.push({
        dimension: "standardized",
        label: "SAT / Standardized Test",
        status: "borderline",
        studentValue: `SAT ${studentSat}`,
        requiredValue: `25th–75th: ${programSat25}–${programSat75}`,
        detail: `SAT ${studentSat} is below the 25th percentile (${programSat25}); consider test-optional or retaking (${minSatCheck}+).`,
      });
      gaps.push(`SAT ${studentSat} is below the 25th percentile (${programSat25}) for ${programName}.`);
    } else {
      requirementChecks.push({
        dimension: "standardized",
        label: "SAT / Standardized Test",
        status: "met",
        studentValue: `SAT ${studentSat}`,
        requiredValue: `25th–75th: ${programSat25}–${programSat75}`,
        detail:
          studentSat >= programSat75
            ? `Top quartile SAT (${studentSat} ≥ 75th pct ${programSat75}).`
            : `Within or above the middle 50% SAT band (${programSat25}–${programSat75}).`,
      });
      if (studentSat >= programSat50) {
        strengths.push(
          `SAT ${studentSat} places at the ${studentSatPercentile}th percentile of ${programName} admits (median ${programSat50}).`
        );
      }
    }
  } else if (studentAct !== null) {
    knownCoreInputs++;
    const reqAct = effectiveMinAct ?? 28;
    const met = studentAct >= reqAct;
    if (!met) hasBorderline = true;
    requirementChecks.push({
      dimension: "standardized",
      label: "ACT Composite",
      status: met ? "met" : "borderline",
      studentValue: `ACT ${studentAct}`,
      requiredValue: `ACT ${reqAct}+`,
      detail: met ? `ACT ${studentAct} meets program expectations.` : `ACT ${studentAct} is below typical ${reqAct}+ band.`,
    });
  } else if (!isGrad) {
    requirementChecks.push({
      dimension: "standardized",
      label: "SAT / Standardized Test",
      status: programReq?.minSat ? "missing" : "info",
      studentValue: "Test-Optional / Not submitted",
      requiredValue:
        programSat25 && programSat75
          ? `25th–75th: ${programSat25}–${programSat75}`
          : "Test-optional / Curriculum-based",
      detail: programReq?.minSat
        ? `Program lists minimum SAT ${programReq.minSat}.`
        : "Evaluated on GPA, curriculum rigor, and English proficiency when SAT is omitted.",
    });
  }

  // 4. Curriculum & Subject Prerequisites (IB / A-Level / AP / Subject Requirements)
  const ibReq = programReq?.ibRequirement || (qsBenchmark.qsRank <= 30 ? "38–42 IB Points (HL 6/6/6)" : qsBenchmark.qsRank <= 100 ? "34–37 IB Points" : "30–34 IB Points");
  const aLevelReq = programReq?.aLevelRequirement || (qsBenchmark.qsRank <= 30 ? "A*A*A – A*AA" : qsBenchmark.qsRank <= 100 ? "AAA – AAB" : "ABB – BBB");
  const apReq = programReq?.apRequirement || (qsBenchmark.qsRank <= 50 ? "4–5 AP exams (scores 4–5)" : "2–3 AP exams or Honors coursework");
  const subjReq = programReq?.subjectRequirements || dept.typicalPrereqs.join(", ");

  const subAlign = subjectAlignment(profile.completedCourses, subjReq);
  const subKnown = subAlign.level !== "unknown";
  requirementChecks.push({
    dimension: "curriculum",
    label: "Curriculum & Prerequisites",
    status: subKnown ? (subAlign.level === "strong" ? "met" : "borderline") : "info",
    studentValue: subKnown
      ? `${Math.round((subAlign.similarity ?? 0) * 100)}% prerequisite alignment`
      : "IB / A-Level / National Diploma",
    requiredValue: `IB: ${ibReq} | A-Level: ${aLevelReq}`,
    detail: `Prerequisites: ${subjReq}`,
  });

  // 5. Portfolio / Interview Requirements
  const portfolioRequired = Boolean(programReq?.portfolioRequired || dept.portfolioOrAudition);
  const interviewRequired = Boolean(
    programReq?.interviewRequired ||
      qsBenchmark.qsRank <= 15 ||
      dept.key === "medicine_health"
  );

  if (portfolioRequired) {
    const hasPortfolioMention = /portfolio|design|exhibition|github|art|architecture/i.test(
      `${profile.extracurriculars || ""} ${profile.projects || ""} ${profile.awards || ""}`
    );
    requirementChecks.push({
      dimension: "portfolio",
      label: "Design / Creative Portfolio",
      status: hasPortfolioMention ? "met" : "info",
      studentValue: hasPortfolioMention ? "Portfolio / Project work noted" : "Required at submission",
      requiredValue: "Mandatory Portfolio Review",
      detail: `${programName} requires a curated portfolio submission.`,
    });
  }

  if (interviewRequired) {
    requirementChecks.push({
      dimension: "interview",
      label: "Admissions Interview",
      status: "info",
      studentValue: "Shortlisted candidates",
      requiredValue: "Academic / Panel Interview",
      detail: `${uni.name || qsBenchmark.canonicalName} conducts interviews for shortlisted ${programName} applicants.`,
    });
  }

  const eligibilityStatus: EligibilityStatus =
    knownCoreInputs === 0
      ? "unknown_inputs"
      : hasBelowMin
      ? "below_minimum"
      : hasBorderline
      ? "borderline"
      : "meets_all";

  // Layer 3 & 4: Compute Composite Program Positioning Score (0–100) & Degree Calibration
  const actCounts = countActivities(profile);
  const hasResearch =
    actCounts.research > 0 ||
    /research|publication|journal|conference|thesis|lab|ieee|acm/i.test(
      `${profile.extracurriculars || ""} ${profile.researchExperience || ""} ${profile.projects || ""}`
    );

  const gpaComp = studentGpaPercentile ?? 50;
  const satComp = studentSatPercentile ?? gpaComp;
  const engComp = studentEnglishPercentile ?? 60;
  const majorFitRatio = profile.targetMajor
    ? majorOverlap(profile.targetMajor, `${programName} ${field}`) ?? 0.5
    : 0.7;
  const majorComp = Math.round(clamp(45 + majorFitRatio * 50, 40, 96));
  const activityHolisticComp = clamp(
    Math.round(
      35 +
        Math.min(25, actCounts.activities * 6) +
        Math.min(18, actCounts.leadership * 9) +
        Math.min(15, actCounts.awards * 7) +
        (hasResearch ? 12 : 0)
    ),
    25,
    98
  );
  // A writing signal is only one small part of the holistic component; absent
  // private essay memory, the original extracurricular score is unchanged.
  const holisticComp = typeof profile.privateEssayScore === "number" && Number.isFinite(profile.privateEssayScore)
    ? clamp(Math.round(activityHolisticComp * 0.85 + profile.privateEssayScore * 0.15), 25, 98)
    : activityHolisticComp;

  let rawAcademicScore: number;
  let degreeCalibrationNote: string;

  if (/phd|doctor/i.test(degreeLevel)) {
    rawAcademicScore =
      gpaComp * 0.42 +
      engComp * 0.16 +
      majorComp * 0.20 +
      (hasResearch ? 90 : holisticComp * 0.7) * 0.22;
    degreeCalibrationNote =
      "PhD calibration: weights upper-division GPA, research publications/thesis alignment, and faculty lab fit; undergraduate SAT/ACT is not required.";
  } else if (/master/i.test(degreeLevel)) {
    rawAcademicScore =
      gpaComp * 0.46 +
      engComp * 0.18 +
      majorComp * 0.18 +
      holisticComp * 0.18;
    degreeCalibrationNote =
      "Master's calibration: prioritizes undergraduate GPA, prerequisite coursework, English proficiency, and relevant internships/research.";
  } else {
    // Bachelor
    const testWeight = studentSatPercentile !== null ? 0.24 : 0.0;
    const gpaWeight = studentSatPercentile !== null ? 0.40 : 0.58;
    rawAcademicScore =
      gpaComp * gpaWeight +
      satComp * testWeight +
      engComp * 0.14 +
      majorComp * 0.10 +
      holisticComp * 0.12;
    degreeCalibrationNote =
      studentSatPercentile !== null
        ? `Bachelor calibration: combines GPA (${programGpa25.toFixed(2)}–${programGpa75.toFixed(2)} IQR), SAT (${programSat25}–${programSat75} IQR), English band, and ${dept.label} extracurricular rigor.`
        : `Bachelor test-optional calibration: weights GPA against ${programName}'s ${programGpa25.toFixed(2)}–${programGpa75.toFixed(2)} IQR, curriculum rigor, and extracurricular profile.`;
  }

  // Adjust by program selectivity (ultra-selective programs compress positioning slightly unless top quartile)
  const selectivityPenalty =
    effectiveProgramAcceptRatePct < 6
      ? -10
      : effectiveProgramAcceptRatePct < 12
      ? -6
      : effectiveProgramAcceptRatePct < 22
      ? -2
      : effectiveProgramAcceptRatePct > 45
      ? +5
      : 0;

  const eligibilityPenalty =
    eligibilityStatus === "below_minimum" ? -18 : eligibilityStatus === "borderline" ? -7 : 0;

  // Layer 5: Empirical Outcome Summary
  const empiricalOutcomes = summarizeEmpiricalOutcomes(empiricalSample, field);

  const compositeProgramFitScore = Math.round(
    clamp(rawAcademicScore + selectivityPenalty + eligibilityPenalty, 12, 98)
  );

  // Cohort Position Tier
  const primaryPercentile =
    studentGpaPercentile !== null && studentSatPercentile !== null
      ? Math.round(studentGpaPercentile * 0.6 + studentSatPercentile * 0.4)
      : studentGpaPercentile ?? studentSatPercentile ?? compositeProgramFitScore;

  const cohortPositionTier: CohortPositionTier =
    primaryPercentile >= 75
      ? "Above 75th Percentile (Top Quartile)"
      : primaryPercentile >= 50
      ? "50th–75th Percentile (Upper-Middle Quartile)"
      : primaryPercentile >= 25
      ? "25th–50th Percentile (Lower-Middle Quartile)"
      : "Below 25th Percentile";

  // Selectivity Category
  let selectivityCategory: SelectivityCategory;
  if (effectiveProgramAcceptRatePct < 8.0) {
    // Ultra-selective programs (<8% effective offer rate, e.g. MIT, Stanford, Oxford CS, TUM CS at top tier)
    selectivityCategory =
      primaryPercentile >= 78 && eligibilityStatus === "meets_all"
        ? "Reach"
        : "High Reach / Ultra-Selective";
  } else if (effectiveProgramAcceptRatePct < 18.0) {
    if (primaryPercentile >= 75 && eligibilityStatus === "meets_all") {
      selectivityCategory = "Target / Match";
    } else if (primaryPercentile >= 45 && eligibilityStatus !== "below_minimum") {
      selectivityCategory = "Reach";
    } else {
      selectivityCategory = "High Reach / Ultra-Selective";
    }
  } else if (effectiveProgramAcceptRatePct < 38.0) {
    if (primaryPercentile >= 72 && eligibilityStatus === "meets_all") {
      selectivityCategory = "Safety / Likely";
    } else if (primaryPercentile >= 42 && eligibilityStatus !== "below_minimum") {
      selectivityCategory = "Target / Match";
    } else {
      selectivityCategory = "Reach";
    }
  } else {
    if (primaryPercentile >= 55 && eligibilityStatus === "meets_all") {
      selectivityCategory = "Safety / Likely";
    } else if (primaryPercentile >= 30 && eligibilityStatus !== "below_minimum") {
      selectivityCategory = "Target / Match";
    } else {
      selectivityCategory = "Reach";
    }
  }

  if (dept.acceptRateMultiplier <= 0.6) {
    gaps.push(
      `${dept.label} is significantly more selective (${effectiveProgramAcceptRatePct}% est. offer rate) than the overall university average (${universityAcceptRatePct}%).`
    );
  } else if (dept.acceptRateMultiplier >= 1.1) {
    strengths.push(
      `${dept.label} has a more accessible offer rate (${effectiveProgramAcceptRatePct}%) than the university-wide average (${universityAcceptRatePct}%).`
    );
  }

  return {
    programId: program?.id ?? null,
    programName,
    degreeLevel,
    field,
    departmentKey: dept.key,
    departmentLabel: dept.label,
    officialProgramUrl:
      program?.officialProgramUrl ||
      program?.sourceUrl ||
      uni.officialWebsiteUrl ||
      uni.websiteUrl ||
      qsBenchmark.officialUrl,
    universityAcceptRatePct,
    effectiveProgramAcceptRatePct,
    acceptRateMultiplier: dept.acceptRateMultiplier,
    programGpa25,
    programGpa50,
    programGpa75,
    programSat25,
    programSat50,
    programSat75,
    effectiveMinGpa,
    effectiveMinIelts,
    medianIelts,
    effectiveMinToefl,
    effectiveMinDet,
    effectiveMinSat,
    effectiveMinAct,
    studentGpa4,
    studentGpaPercentile,
    studentSat,
    studentSatPercentile,
    studentEnglishLabel,
    studentEnglishPercentile,
    eligibilityStatus,
    requirementChecks,
    ibRequirement: ibReq,
    aLevelRequirement: aLevelReq,
    apRequirement: apReq,
    subjectRequirements: subjReq,
    portfolioRequired,
    interviewRequired,
    typicalPrereqs: dept.typicalPrereqs,
    compositeProgramFitScore,
    cohortPositionTier,
    selectivityCategory,
    degreeCalibrationNote,
    strengths: strengths.slice(0, 4),
    gaps: gaps.slice(0, 4),
    empiricalOutcomes,
  };
}
