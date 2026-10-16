/**
 * Feature 5.1 — Global Fee Waiver & $0-Application Finder + Counselor
 * Attestation Generator.
 *
 * WHY
 * ---
 * International application fees run $75–$150 per university. Ten
 * universities cost a student from Uzbekistan $800–$1,200 before a single
 * decision letter arrives — often more than a month of family income. Two
 * things change that number: applying through routes whose published fee is
 * $0 or a single shared fee, and claiming the fee waivers a student is
 * actually eligible for.
 *
 * HONESTY RULES (the same ones the rest of the catalogue follows)
 * --------------------------------------------------------------
 *  1. A fee this module did not read from the university record is `null`,
 *     never `0`. "Free" is only ever claimed for a route that is listed in
 *     `ZERO_FEE_ROUTES` with an official source the student can open.
 *  2. Route facts describe the PORTAL (UCAS, uni-assist, DreamApply, TBBS…),
 *     not a guarantee about one university. Every row carries
 *     `sourceName` + `sourceUrl` so the claim can be checked, and the UI
 *     says "verify before you pay".
 *  3. Waiver eligibility is expressed as *indicators the student recorded*,
 *     never as an approval. Only the programme's own office (or the school
 *     counselor) can grant a waiver — the letters below ask for it.
 *  4. Generated letters never invent a number. A value the profile does not
 *     hold becomes a bracketed placeholder the student fills in by hand.
 *
 * Pure TypeScript, deterministic, no network, no AI: two runs on the same
 * input produce byte-identical output (see scripts/check-differentiators.ts).
 */

import { gpaTo40Scale } from "./gpa";
import { countriesMatch, normalizeCountryAlias } from "./countries";

/* -------------------------------------------------------------------------- */
/* Inputs                                                                      */
/* -------------------------------------------------------------------------- */

export interface FeeWaiverProfileInput {
  name?: string | null;
  email?: string | null;
  country?: string | null;
  degreeLevel?: string | null;
  targetMajor?: string | null;
  gpa?: number | null;
  gpaScale?: number | null;
  graduationYear?: number | null;
  familyIncomeUsd?: number | null;
  needsFinancialAid?: boolean | null;
  requiresFullScholarship?: boolean | null;
  needScholarship?: boolean | null;
}

export interface FeeWaiverUniversityInput {
  id?: number | null;
  name: string;
  country?: string | null;
  /** Published application fee in its own currency (NULL = not published). */
  applicationFee?: number | null;
  applicationFeeCurrency?: string | null;
  /** Resolved USD mirror used by the funding planner. */
  applicationFeeUsd?: number | null;
  degreeLevel?: string | null;
  portalUrl?: string | null;
  websiteUrl?: string | null;
}

/* -------------------------------------------------------------------------- */
/* $0 / shared-fee application routes                                          */
/* -------------------------------------------------------------------------- */

/**
 * What a route's published fee model actually is.
 *  - `zero`          the portal charges international applicants nothing
 *  - `shared`        one fee covers several choices (UCAS) — cheaper per
 *                    university, but not $0
 *  - `waiver`        a fee exists and the programme publishes a waiver route
 *  - `verify`        the route is commonly free but the fee is set per
 *                    university, so the student must confirm it on the portal
 */
export type FeeModel = "zero" | "shared" | "waiver" | "verify";

export interface ZeroFeeRoute {
  /** Stable id — also the i18n key suffix (`feeWaiver.routes.<id>.*`). */
  id: string;
  /** Canonical country this route belongs to. */
  country: string;
  feeModel: FeeModel;
  /** What the student pays through this route, when it is published globally. */
  feeUsd: number | null;
  /** Degree levels the route covers (matched with `degreeLevelsMatch`). */
  degreeLevels: string[];
  portalName: string;
  portalUrl: string;
  sourceName: string;
  sourceUrl: string;
}

/**
 * Route-level published facts. Each entry is a portal the platform already
 * teaches in the video courses (Common App & CSS Profile, uni-assist &
 * Sperrkonto, El-yurt umidi / GKS / e-Apostille), so the student is never
 * sent somewhere the platform has not explained first.
 */
export const ZERO_FEE_ROUTES: ZeroFeeRoute[] = [
  {
    id: "uk-ucas",
    country: "United Kingdom",
    feeModel: "shared",
    feeUsd: null, // UCAS publishes the fee per cycle in GBP on its own site
    degreeLevels: ["Undergraduate", "Bachelor", "Foundation"],
    portalName: "UCAS Hub",
    portalUrl: "https://www.ucas.com/",
    sourceName: "UCAS — how to apply",
    sourceUrl: "https://www.ucas.com/",
  },
  {
    id: "uk-direct-postgraduate",
    country: "United Kingdom",
    feeModel: "verify",
    feeUsd: null,
    degreeLevels: ["Master", "Graduate", "PhD", "Doctoral"],
    portalName: "University postgraduate portal",
    portalUrl: "https://www.gov.uk/student-visa",
    sourceName: "GOV.UK Student Visa",
    sourceUrl: "https://www.gov.uk/student-visa",
  },
  {
    id: "de-uni-assist",
    country: "Germany",
    feeModel: "verify",
    feeUsd: null,
    degreeLevels: ["Bachelor", "Undergraduate", "Master", "Graduate", "PhD", "Doctoral", "All"],
    portalName: "uni-assist VPD",
    portalUrl: "https://www.uni-assist.de/en/how-to-apply/",
    sourceName: "uni-assist — how to apply",
    sourceUrl: "https://www.uni-assist.de/en/how-to-apply/",
  },
  {
    id: "de-direct-public",
    country: "Germany",
    feeModel: "verify",
    feeUsd: 0,
    degreeLevels: ["Bachelor", "Undergraduate", "Master", "Graduate", "PhD", "Doctoral", "All"],
    portalName: "University's own portal (TUMonline, RWTH, Bonn …)",
    portalUrl: "https://taschkent.diplo.de/uz-de/service/05-VisaEinreise",
    sourceName: "German Embassy Tashkent — visa & entry",
    sourceUrl: "https://taschkent.diplo.de/uz-de/service/05-VisaEinreise",
  },
  {
    id: "hu-dreamapply",
    country: "Hungary",
    feeModel: "zero",
    feeUsd: 0,
    degreeLevels: ["Bachelor", "Undergraduate", "Master", "Graduate", "PhD", "Doctoral", "All"],
    portalName: "Stipendium Hungaricum — DreamApply",
    portalUrl: "https://stipendiumhungaricum.hu/apply/",
    sourceName: "Stipendium Hungaricum",
    sourceUrl: "https://stipendiumhungaricum.hu/",
  },
  {
    id: "tr-tbbs",
    country: "Turkey",
    feeModel: "zero",
    feeUsd: 0,
    degreeLevels: ["Bachelor", "Undergraduate", "Master", "Graduate", "PhD", "Doctoral", "All"],
    portalName: "Türkiye Bursları (TBBS)",
    portalUrl: "https://tbbs.turkiyeburslari.gov.tr/",
    sourceName: "Türkiye Bursları",
    sourceUrl: "https://tbbs.turkiyeburslari.gov.tr/",
  },
  {
    id: "kr-gks-embassy",
    country: "South Korea",
    feeModel: "zero",
    feeUsd: 0,
    degreeLevels: ["Bachelor", "Undergraduate", "Master", "Graduate", "PhD", "Doctoral", "All"],
    portalName: "GKS Embassy Track — Korean Embassy Tashkent",
    portalUrl: "https://overseas.mofa.go.kr/uz-ru/wpge/m_5137/contents.do",
    sourceName: "Embassy of the Republic of Korea in Uzbekistan",
    sourceUrl: "https://overseas.mofa.go.kr/uz-ru/wpge/m_5137/contents.do",
  },
  {
    id: "kr-kaist",
    country: "South Korea",
    feeModel: "verify",
    feeUsd: null,
    degreeLevels: ["Bachelor", "Undergraduate", "Master", "Graduate", "PhD", "Doctoral"],
    portalName: "KAIST Admissions",
    portalUrl: "https://admission.kaist.ac.kr/intl-undergraduate/support/scholarships/kaist",
    sourceName: "KAIST International Admissions",
    sourceUrl: "https://admission.kaist.ac.kr/intl-undergraduate/support/scholarships/kaist",
  },
  {
    id: "uz-elyurt-umidi",
    country: "Uzbekistan",
    feeModel: "zero",
    feeUsd: 0,
    degreeLevels: ["Bachelor", "Undergraduate", "Master", "Graduate", "PhD", "Doctoral", "All"],
    portalName: "El-yurt umidi Foundation",
    portalUrl: "https://eyuf.uz/",
    sourceName: "El-yurt umidi jamg'armasi",
    sourceUrl: "https://eyuf.uz",
  },
];

/* -------------------------------------------------------------------------- */
/* Waiver programmes (USA / Canada / international tests)                      */
/* -------------------------------------------------------------------------- */

/** A recorded indicator that suggests a waiver may be available. */
export type WaiverIndicator =
  | "needs_financial_aid"
  | "requires_full_scholarship"
  | "needs_scholarship"
  | "income_below_threshold";

export interface FeeWaiverProgram {
  /** Stable id — also the i18n key suffix (`feeWaiver.programs.<id>.*`). */
  id: string;
  /** Countries whose universities accept this waiver route. */
  countries: string[];
  /** Degree levels it is used for (empty = any). */
  degreeLevels: string[];
  /** Whether a school counselor must confirm it (Common App) or not. */
  requiresCounselor: boolean;
  portalName: string;
  portalUrl: string;
  sourceName: string;
  sourceUrl: string;
}

/**
 * Household income under this figure (USD) is treated as an indicator for the
 * need-based waivers below. It is a screening threshold for THIS platform's
 * advice, not an official limit — the official criteria are linked per
 * programme and can change every cycle.
 */
export const FEE_WAIVER_INCOME_THRESHOLD_USD = 35_000;

export const FEE_WAIVER_PROGRAMS: FeeWaiverProgram[] = [
  {
    id: "common-app",
    countries: ["United States", "Canada"],
    degreeLevels: ["Bachelor", "Undergraduate", "Foundation"],
    requiresCounselor: true,
    portalName: "Common App",
    portalUrl: "https://www.commonapp.org/",
    sourceName: "Common App — apply",
    sourceUrl: "https://www.commonapp.org/",
  },
  {
    id: "css-profile",
    countries: ["United States", "Canada"],
    degreeLevels: ["Bachelor", "Undergraduate", "Master", "Graduate", "Foundation", "PhD", "Doctoral"],
    requiresCounselor: false,
    portalName: "CSS Profile (College Board)",
    portalUrl: "https://cssprofile.collegeboard.org/",
    sourceName: "College Board — CSS Profile",
    sourceUrl: "https://cssprofile.collegeboard.org/",
  },
  {
    id: "sat-fee-waiver",
    countries: ["United States", "Canada"],
    degreeLevels: ["Bachelor", "Undergraduate", "Foundation"],
    requiresCounselor: true,
    portalName: "SAT Suite (College Board)",
    portalUrl: "https://satsuite.collegeboard.org/sat/test-center-search",
    sourceName: "College Board — SAT Suite",
    sourceUrl: "https://satsuite.collegeboard.org/sat/test-center-search",
  },
  {
    id: "duolingo-english-test",
    countries: [], // accepted by universities in many destinations
    degreeLevels: [],
    requiresCounselor: false,
    portalName: "Duolingo English Test",
    portalUrl: "https://englishtest.duolingo.com/",
    sourceName: "Duolingo English Test",
    sourceUrl: "https://englishtest.duolingo.com/",
  },
];

/* -------------------------------------------------------------------------- */
/* Eligibility                                                                 */
/* -------------------------------------------------------------------------- */

export interface WaiverEligibility {
  /** At least one indicator is on file. Still not an approval — see below. */
  eligible: boolean;
  /** Indicators the student has already recorded. */
  indicators: WaiverIndicator[];
  /** What is missing that would strengthen (or settle) the claim. */
  missing: WaiverIndicator[];
  /** The strongest single reason, for the one-line summary in the UI. */
  headline: WaiverIndicator | "none";
}

function isBelowIncomeThreshold(profile: FeeWaiverProfileInput): boolean {
  const income = profile.familyIncomeUsd;
  if (income == null || !Number.isFinite(Number(income))) return false;
  return Number(income) > 0 && Number(income) < FEE_WAIVER_INCOME_THRESHOLD_USD;
}

/**
 * Deterministic indicator screen. `eligible: true` means "you have a recorded
 * reason to ask", never "the waiver is granted".
 */
export function evaluateWaiverEligibility(profile: FeeWaiverProfileInput | null | undefined): WaiverEligibility {
  const p = profile ?? {};
  const indicators: WaiverIndicator[] = [];
  if (p.needsFinancialAid === true) indicators.push("needs_financial_aid");
  if (p.requiresFullScholarship === true) indicators.push("requires_full_scholarship");
  if (p.needScholarship === true) indicators.push("needs_scholarship");
  if (isBelowIncomeThreshold(p)) indicators.push("income_below_threshold");

  const missing: WaiverIndicator[] = [];
  if (p.familyIncomeUsd == null) missing.push("income_below_threshold");
  if (p.needsFinancialAid == null) missing.push("needs_financial_aid");

  const order: WaiverIndicator[] = [
    "income_below_threshold",
    "needs_financial_aid",
    "requires_full_scholarship",
    "needs_scholarship",
  ];
  const headline = order.find((i) => indicators.includes(i)) ?? "none";
  return { eligible: indicators.length > 0, indicators, missing, headline };
}

/* -------------------------------------------------------------------------- */
/* Route matching                                                              */
/* -------------------------------------------------------------------------- */

/** Loose degree-level match: NULL on either side means "cannot rule it out". */
function degreeLevelsMatch(routeLevels: string[], universityLevel?: string | null): boolean {
  if (routeLevels.length === 0) return true;
  if (!universityLevel || !universityLevel.trim()) return true; // unknown → keep the route visible
  const want = normalizeDegreeToken(universityLevel);
  return routeLevels.some((level) => normalizeDegreeToken(level) === want) || routeLevels.includes("All");
}

/**
 * Country spellings differ between catalogue records ("Turkey" vs "Türkiye",
 * "USA" vs "United States"). The shared alias table covers the QS destinations;
 * this adds the few route countries that table does not list.
 */
const ROUTE_COUNTRY_ALIASES: Record<string, string[]> = {
  turkey: ["turkiye", "republicofturkiye", "tr"],
  southkorea: ["korea", "republicofkorea", "korearepublicof", "kr"],
  uzbekistan: ["uzbekiston", "republicofuzbekistan", "uz"],
  hungary: ["magyarorszag", "hu"],
};

function countryKeys(value: string | null | undefined): Set<string> {
  const keys = new Set<string>();
  if (!value) return keys;
  const alias = normalizeCountryAlias(value);
  keys.add(alias);
  for (const [canonical, list] of Object.entries(ROUTE_COUNTRY_ALIASES)) {
    if (canonical === alias || list.includes(alias)) {
      keys.add(canonical);
      for (const extra of list) keys.add(extra);
    }
  }
  return keys;
}

/** True when two country labels name the same destination. */
export function sameCountry(a: string | null | undefined, b: string | null | undefined): boolean {
  if (!a || !b) return false;
  if (countriesMatch(a, b)) return true;
  const left = countryKeys(a);
  const right = countryKeys(b);
  for (const key of left) if (right.has(key)) return true;
  return false;
}

/** Routes published for this university's country and degree level. */
export function routesForUniversity(uni: FeeWaiverUniversityInput): ZeroFeeRoute[] {
  if (!uni.country) return [];
  return ZERO_FEE_ROUTES.filter(
    (route) => sameCountry(route.country, uni.country) && degreeLevelsMatch(route.degreeLevels, uni.degreeLevel)
  );
}

/** Waiver programmes that reach this university's country and level. */
export function programsForUniversity(uni: FeeWaiverUniversityInput): FeeWaiverProgram[] {
  return FEE_WAIVER_PROGRAMS.filter((program) => {
    const countryOk = program.countries.length === 0 || program.countries.some((c) => sameCountry(c, uni.country));
    return countryOk && degreeLevelsMatch(program.degreeLevels, uni.degreeLevel);
  });
}

function normalizeDegreeToken(value: string): string {
  const v = value.trim().toLowerCase();
  if (v.includes("bachelor") || v.includes("undergrad")) return "bachelor";
  if (v.includes("master") || v.includes("graduate")) return "master";
  if (v.includes("phd") || v.includes("doctor")) return "phd";
  if (v.includes("foundation")) return "foundation";
  return v;
}

/* -------------------------------------------------------------------------- */
/* The finder                                                                  */
/* -------------------------------------------------------------------------- */

export type FeeCategory = "zero_fee" | "shared_fee" | "waiver_likely" | "published_fee" | "fee_unknown";

export interface FeeWaiverUniversityResult {
  university: FeeWaiverUniversityInput;
  category: FeeCategory;
  /** The university's own published fee in USD (null = not published). */
  feeUsd: number | null;
  /** Best matching $0 / shared-fee route, when the country publishes one. */
  route: ZeroFeeRoute | null;
  /** Waiver programmes that reach this university. */
  programs: FeeWaiverProgram[];
  /**
   * Money this student could plausibly keep: the published fee, but only when
   * a waiver indicator is on file OR a cheaper route exists. Null when the fee
   * itself is unknown — we never count savings on a number we do not have.
   */
  avoidableUsd: number | null;
}

export interface FeeWaiverTotals {
  universities: number;
  zeroFee: number;
  sharedFee: number;
  waiverLikely: number;
  publishedFee: number;
  feeUnknown: number;
  /** Sum of published fees across the list (USD). */
  publishedFeeTotalUsd: number;
  /** Sum of `avoidableUsd` (USD) — the headline saving. */
  avoidableTotalUsd: number;
}

export interface FeeWaiverEvaluation {
  eligibility: WaiverEligibility;
  universities: FeeWaiverUniversityResult[];
  totals: FeeWaiverTotals;
}

/** The published fee for one university, in USD (null stays null). */
export function universityFeeUsd(uni: FeeWaiverUniversityInput): number | null {
  if (uni.applicationFeeUsd != null && Number.isFinite(Number(uni.applicationFeeUsd))) {
    return Number(uni.applicationFeeUsd);
  }
  if (uni.applicationFee != null && Number.isFinite(Number(uni.applicationFee))) {
    const currency = (uni.applicationFeeCurrency || "USD").trim().toUpperCase();
    if (currency === "USD") return Number(uni.applicationFee);
    // A non-USD fee without a resolved mirror is not silently converted here:
    // the catalogue's `resolvedUsdUniversityCosts` owns currency maths.
    return null;
  }
  return null;
}

/**
 * Categorise a shortlist: which universities can be applied to for $0, which
 * share one fee, which the student has a recorded reason to ask a waiver from,
 * and which simply publish a fee with no cheaper route on file.
 */
export function evaluateFeeWaiverOptions(
  profile: FeeWaiverProfileInput | null | undefined,
  universities: readonly FeeWaiverUniversityInput[]
): FeeWaiverEvaluation {
  const eligibility = evaluateWaiverEligibility(profile);
  const results: FeeWaiverUniversityResult[] = universities.map((university) => {
    const feeUsd = universityFeeUsd(university);
    const route = routesForUniversity(university).sort(byRouteStrength)[0] ?? null;
    const programs = programsForUniversity(university);

    let category: FeeCategory;
    if (route?.feeModel === "zero") category = "zero_fee";
    else if (route?.feeModel === "shared") category = "shared_fee";
    else if (eligibility.eligible && programs.length > 0) category = "waiver_likely";
    else if (feeUsd != null) category = "published_fee";
    else category = "fee_unknown";

    // A known $0 fee is never "avoidable" — there is nothing to avoid.
    let avoidableUsd: number | null = null;
    if (feeUsd != null && feeUsd > 0) {
      if (category === "zero_fee" || category === "shared_fee" || category === "waiver_likely") avoidableUsd = feeUsd;
    }

    return { university, category, feeUsd, route, programs, avoidableUsd };
  });

  const totals: FeeWaiverTotals = {
    universities: results.length,
    zeroFee: results.filter((r) => r.category === "zero_fee").length,
    sharedFee: results.filter((r) => r.category === "shared_fee").length,
    waiverLikely: results.filter((r) => r.category === "waiver_likely").length,
    publishedFee: results.filter((r) => r.category === "published_fee").length,
    feeUnknown: results.filter((r) => r.category === "fee_unknown").length,
    publishedFeeTotalUsd: results.reduce((sum, r) => sum + (r.feeUsd ?? 0), 0),
    avoidableTotalUsd: results.reduce((sum, r) => sum + (r.avoidableUsd ?? 0), 0),
  };

  // Cheapest first, then $0 routes, then name — so the student sees the saving.
  results.sort((a, b) => {
    const order: Record<FeeCategory, number> = {
      zero_fee: 0,
      shared_fee: 1,
      waiver_likely: 2,
      published_fee: 3,
      fee_unknown: 4,
    };
    if (order[a.category] !== order[b.category]) return order[a.category] - order[b.category];
    const fa = a.feeUsd ?? Number.POSITIVE_INFINITY;
    const fb = b.feeUsd ?? Number.POSITIVE_INFINITY;
    if (fa !== fb) return fa - fb;
    return a.university.name.localeCompare(b.university.name);
  });

  return { eligibility, universities: results, totals };
}

/** Strongest route first: zero → shared → verify → waiver. */
function byRouteStrength(a: ZeroFeeRoute, b: ZeroFeeRoute): number {
  const rank: Record<FeeModel, number> = { zero: 0, shared: 1, verify: 2, waiver: 3 };
  return rank[a.feeModel] - rank[b.feeModel];
}

/* -------------------------------------------------------------------------- */
/* Document generators                                                         */
/* -------------------------------------------------------------------------- */

export interface GeneratedLetter {
  /** Which template produced it (`request` = student → admissions office). */
  template: "request" | "attestation";
  subject: string;
  body: string;
  /** Values the profile did not hold, shown to the student as fields to fill. */
  placeholders: string[];
}

const PLACEHOLDER = {
  name: "[YOUR FULL NAME]",
  email: "[YOUR EMAIL]",
  country: "[YOUR COUNTRY]",
  gpa: "[YOUR GPA]",
  scale: "[SCALE]",
  major: "[YOUR FIELD OF STUDY]",
  degree: "[DEGREE LEVEL]",
  income: "[ANNUAL FAMILY INCOME, USD]",
  intake: "[INTAKE TERM]",
  school: "[YOUR SCHOOL / UNIVERSITY]",
  counselor: "[COUNSELOR NAME]",
  counselorTitle: "[COUNSELOR TITLE]",
  counselorEmail: "[COUNSELOR EMAIL]",
} as const;

function text(value: string | null | undefined, fallback: string): string {
  const v = (value ?? "").toString().trim();
  return v || fallback;
}

function gpaText(profile: FeeWaiverProfileInput): string {
  if (profile.gpa == null || !Number.isFinite(Number(profile.gpa))) return PLACEHOLDER.gpa;
  const scale = profile.gpaScale != null && Number(profile.gpaScale) > 0 ? Number(profile.gpaScale) : null;
  if (scale) return `${Number(profile.gpa).toFixed(2)} / ${scale}`;
  const on4 = gpaTo40Scale(Number(profile.gpa), null);
  return on4 != null ? `${on4.toFixed(2)} / 4.00` : `${Number(profile.gpa).toFixed(2)}`;
}

function incomeText(profile: FeeWaiverProfileInput): string {
  const income = profile.familyIncomeUsd;
  if (income == null || !Number.isFinite(Number(income))) return PLACEHOLDER.income;
  return `approximately USD ${Math.round(Number(income)).toLocaleString("en-US")} per year`;
}

function collectPlaceholders(body: string): string[] {
  const found = new Set<string>();
  for (const m of body.matchAll(/\[[A-Z][A-Z0-9 ,./'-]{2,}\]/g)) found.add(m[0]);
  return [...found];
}

/**
 * Template A — the student's own fee-waiver request to an admissions office.
 * Six short paragraphs; no claim that a waiver has been granted.
 */
export function generateFeeWaiverRequestLetter(
  profile: FeeWaiverProfileInput | null | undefined,
  universityName: string,
  options: { intake?: string | null; programName?: string | null } = {}
): GeneratedLetter {
  const p = profile ?? {};
  const name = text(p.name, PLACEHOLDER.name);
  const country = text(p.country, PLACEHOLDER.country);
  const major = text(p.targetMajor, PLACEHOLDER.major);
  const degree = text(p.degreeLevel, PLACEHOLDER.degree);
  const intake = text(options.intake, PLACEHOLDER.intake);
  const program = text(options.programName, major);
  const subject = `Application Fee Waiver Request — ${name} (${country}) — ${intake}`;

  const body = `Dear Admissions Office,

My name is ${name}, and I am applying from ${country} to the ${degree} programme in ${program} at ${universityName} for ${intake}.

I am writing to ask whether an application fee waiver, or a fee waiver code, is available for my application. The published application fee is a significant cost for my family, and I am applying to several universities in the same cycle.

My academic record: cumulative GPA ${gpaText(p)}. My field of study is ${major}.

Financial context: my household income is ${incomeText(p)}${p.needsFinancialAid === true ? ", and I have indicated that I need financial aid" : ""}${p.requiresFullScholarship === true ? ", and I require a full scholarship to enrol" : ""}. I can provide any documentation your office needs, including a signed statement from my school counselor or principal.

If a waiver is available, please let me know what form or evidence you require and by when. If it is not available, I would be grateful if you could tell me the exact fee and the accepted payment methods from ${country}, so I can plan for it.

Thank you for your time and for considering my request.

Sincerely,
${name}
${text(p.email, PLACEHOLDER.email)}`;

  return { template: "request", subject, body, placeholders: collectPlaceholders(body) };
}

/**
 * Template B — the official school counselor / principal financial-hardship
 * attestation. Written in the third person and signed by the school, which is
 * what Common App and most university portals accept as evidence.
 */
export function generateCounselorAttestationLetter(
  profile: FeeWaiverProfileInput | null | undefined,
  options: {
    universityName?: string | null;
    counselorName?: string | null;
    counselorTitle?: string | null;
    schoolName?: string | null;
  } = {}
): GeneratedLetter {
  const p = profile ?? {};
  const name = text(p.name, PLACEHOLDER.name);
  const country = text(p.country, PLACEHOLDER.country);
  const school = text(options.schoolName, PLACEHOLDER.school);
  const counselor = text(options.counselorName, PLACEHOLDER.counselor);
  const title = text(options.counselorTitle, PLACEHOLDER.counselorTitle);
  const target = options.universityName ? ` to ${options.universityName}` : "";
  const subject = `Financial Hardship Attestation — Application Fee Waiver for ${name}`;

  const body = `To the Admissions Office,

I am ${counselor}, ${title} at ${school} in ${country}. I confirm that ${name} is a student in good standing at this institution and is applying${target} for the ${text(p.degreeLevel, PLACEHOLDER.degree)} intake.

I attest that ${name}'s family has limited financial means: the household income is ${incomeText(p)}, which is below the level at which an international application fee of USD 75–150 per university can be met without hardship. ${name} is applying to several institutions in the same admission cycle, and the combined fees would exceed the family's available budget for the period.

${name}'s academic record supports the application: cumulative GPA ${gpaText(p)}, field of study ${text(p.targetMajor, PLACEHOLDER.major)}.

This letter is issued at the student's request for the purpose of an application fee waiver. Our office can confirm its authenticity on request at ${text(p.email, PLACEHOLDER.email)}.

Respectfully,

${counselor}
${title}
${school}
${country}`;

  return { template: "attestation", subject, body, placeholders: collectPlaceholders(body) };
}
