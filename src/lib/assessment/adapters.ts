/**
 * Catalogue → canonical assessment adapter.
 *
 * Every surface that used to compute a "chance", a "fit" or a "composite
 * planning index" (dashboard, recommendation cards, university detail, the old
 * Chancing screen, comparisons, exports) now builds ONE canonical assessment
 * through this module, so the screens cannot drift apart again.
 *
 * Two rules drive the mapping:
 *  1. Only a VERIFIED official requirement becomes a requirement node. A
 *     `program_requirements` column whose field-level evidence is unverified is
 *     recorded as an UNDOCUMENTED requirement (value null) — it is never turned
 *     into an automatic rejection.
 *  2. Nothing is invented: a missing cost, statistic or requirement is carried
 *     as null / `unknown`, never as zero.
 *
 * Pure mapping (no DB import), so it is unit-testable and safe on the server.
 */

import { resolveScopedFact, type FactContext } from "@/lib/factResolver";
import type { CatalogueFact } from "@/lib/evidencePolicy";
import { resolveAcademicRequirements } from "@/lib/universityDetailRequirements";
import { isVerifiedOfficialRequirement, mayAutoReject, type TrustedValue } from "@/lib/typedEvidence";
import { compareDegreeLevels, undergraduateTestApplies } from "@/lib/degreeLevels";
import { parseListColumn } from "@/lib/chancing";
import { profileMatchFingerprint } from "@/lib/profileMatchFingerprint";
import type { ApplicantContext } from "@/lib/applicantContext";
import { parseAssessmentPreferences, storedPreferencesToSource } from "@/lib/assessmentStored";
import { assessProgramme, type AssessmentApplicant, type AssessmentContext, type AssessmentProgramme, type ProgrammeAssessment } from "./index";
import type { EligibilityProfile, EligibilitySource, RequirementNode, UserMetric } from "./eligibility";
import type { FinanceInput } from "./finance";
import type { PublishedStatistic } from "./academicComparison";
import { SCORING_VERSION } from "./version";

/** The subset of a `student_profiles` row the adapter reads. */
export interface AssessmentProfileRow {
  id?: number | null;
  applicantContext?: ApplicantContext | null;
  gpa?: number | null;
  gpaScale?: number | null;
  ieltsScore?: number | null;
  toeflScore?: number | null;
  duolingoScore?: number | null;
  satScore?: number | null;
  actScore?: number | null;
  greScore?: number | null;
  targetMajor?: string | null;
  studyInterests?: string | string[] | null;
  degreeLevel?: string | null;
  preferredCountries?: string | string[] | null;
  /** Versioned preference modes (see supabase/add_assessment_preferences_2026-11-11.sql). */
  assessmentPreferences?: unknown;
  budgetAnnualUsd?: number | null;
  needsFinancialAid?: boolean | null;
  requiresFullScholarship?: boolean | null;
  needScholarship?: boolean | null;
  updatedAt?: string | Date | null;
}

export interface AssessmentProgrammeRow {
  id: number;
  universityId: number;
  name: string;
  field?: string | null;
  degree?: string | null;
  language?: string | null;
  studyMode?: string | null;
  programUrl?: string | null;
  sourceUrl?: string | null;
  tuitionAmount?: number | null;
  tuitionCurrency?: string | null;
  tuitionPeriod?: string | null;
  isVerified?: boolean | null;
  verificationStatus?: string | null;
  lastVerifiedAt?: Date | string | null;
}

export interface AssessmentUniversityRow {
  id: number;
  name: string;
  country?: string | null;
  officialWebsiteUrl?: string | null;
  websiteUrl?: string | null;
}

/** The subset of a `program_requirements` row the adapter reads. */
export interface AssessmentRequirementRow {
  minIelts?: number | null;
  minToefl?: number | null;
  minDet?: number | null;
  minSat?: number | null;
  minAct?: number | null;
  minGpa?: number | null;
  portfolioRequired?: boolean | null;
  interviewRequired?: boolean | null;
  recommendationRequired?: boolean | null;
  personalStatementRequired?: boolean | null;
  otherRequirements?: string | null;
  academicYear?: string | null;
  sourceUrl?: string | null;
  lastVerifiedAt?: Date | string | null;
  verificationStatus?: string | null;
}

const isHttp = (url: string | null | undefined): boolean =>
  typeof url === "string" && url.trim().toLowerCase().startsWith("https://");

/** A stored list column (`preferred_countries`, `study_interests`) → items. */
export const parseProfileList = parseListColumn;

function toIso(value: Date | string | null | undefined): string | null {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(value);
  return Number.isFinite(date.getTime()) ? date.toISOString() : null;
}

/**
 * The student's recorded metrics in their ORIGINAL units and scales.
 * An unusual GPA scale keeps its scale and minimum so the eligibility engine can
 * refuse an incomparable comparison instead of converting it proportionally.
 */
export function applicantMetrics(profile: AssessmentProfileRow | null | undefined): {
  gpa: UserMetric | null;
  ielts: UserMetric | null;
  toefl: UserMetric | null;
  det: UserMetric | null;
  sat: UserMetric | null;
  act: UserMetric | null;
} {
  const context = profile?.applicantContext ?? null;
  const contextGpa = context?.gpa ?? null;
  const gpa: UserMetric | null =
    contextGpa?.value != null
      ? {
          value: contextGpa.value,
          unit: contextGpa.maximum != null ? String(contextGpa.maximum) : null,
          minimum: contextGpa.minimum ?? 0,
        }
      : profile?.gpa != null
        ? {
            value: profile.gpa,
            unit: profile.gpaScale != null ? String(profile.gpaScale) : null,
            minimum: 0,
          }
        : null;

  const toeflRecord = context?.toefl ?? null;
  const toeflValue = toeflRecord?.score ?? profile?.toeflScore ?? null;
  const toefl: UserMetric | null =
    toeflValue != null
      ? {
          value: toeflValue,
          unit: toeflRecord?.scale ?? null,
          examDate: toeflRecord?.examDate ?? null,
          validUntil: toeflRecord?.validUntil ?? null,
          sections: toeflRecord?.sections ?? null,
        }
      : null;

  return {
    gpa,
    ielts: profile?.ieltsScore != null ? { value: profile.ieltsScore, unit: "9" } : null,
    toefl,
    det: profile?.duolingoScore != null ? { value: profile.duolingoScore, unit: "160" } : null,
    sat: profile?.satScore != null ? { value: profile.satScore, unit: "1600" } : null,
    act: profile?.actScore != null ? { value: profile.actScore, unit: "36" } : null,
  };
}

/** Lists the recorded metric names only — used for the privacy summary. */
export function recordedMetricNames(profile: AssessmentProfileRow | null | undefined): string[] {
  const metrics = applicantMetrics(profile);
  return (Object.keys(metrics) as (keyof typeof metrics)[])
    .filter((key) => metrics[key] != null)
    .sort();
}

/** Interests the student targets: structured study interests, then target major. */
export function applicantInterests(profile: AssessmentProfileRow | null | undefined): string[] {
  if (!profile) return [];
  const out: string[] = [];
  const push = (value: string) => {
    const text = value.trim();
    if (text && !out.includes(text)) out.push(text);
  };
  for (const value of parseProfileList(profile.studyInterests)) push(value);
  if (typeof profile.targetMajor === "string") push(profile.targetMajor);
  return out;
}

/**
 * Evidence-carrying value for one catalogue minimum.
 *
 * `verified` requires BOTH a verified row and a specific official URL. A row
 * flagged `unverified` (or verified only at the programme level with no cutoff
 * URL) yields a null value, so eligibility reports `missing_requirement`
 * instead of comparing against an unverified number.
 */
function requirementValue(
  row: AssessmentRequirementRow,
  field: keyof AssessmentRequirementRow,
  opts: { specificUrl: string | null; academicYear: string | null; cycle: string | null }
): { value: number | null; source: EligibilitySource } {
  const raw = row[field];
  const value = typeof raw === "number" && Number.isFinite(raw) ? raw : null;
  const verifiedRow = row.verificationStatus === "verified";
  const source: EligibilitySource = {
    sourceUrl: opts.specificUrl,
    verificationStatus: row.verificationStatus ?? "unverified",
    valueType: verifiedRow && isHttp(opts.specificUrl) ? "official_requirement" : "unverified_value",
    verifiedAt: toIso(row.lastVerifiedAt),
  };
  const cycleMatches =
    opts.cycle == null || opts.academicYear == null || opts.academicYear === opts.cycle;
  return {
    value: verifiedRow && isHttp(opts.specificUrl) && cycleMatches ? value : null,
    source,
  };
}

/**
 * Requirement tree from a `program_requirements` row.
 *
 * The row is one AND-group: every recorded minimum must be met. Multiple
 * language tests are alternatives (`anyOf`) unless a reviewed requirement_group
 * in the evidence store says otherwise.
 */
export function requirementNodesFromRow(
  row: AssessmentRequirementRow | null | undefined,
  opts: {
    programmeUrl?: string | null;
    cycle?: string | null;
    programmeDegreeLevel?: string | null;
    applicantDegreeLevel?: string | null;
  } = {}
): RequirementNode[] {
  if (!row) return [];
  const specificUrl = isHttp(row.sourceUrl) ? (row.sourceUrl as string) : isHttp(opts.programmeUrl) ? opts.programmeUrl! : null;
  const base = { specificUrl, academicYear: row.academicYear ?? null, cycle: opts.cycle ?? null };

  const gpa = requirementValue(row, "minGpa", base);
  const nodes: RequirementNode[] = [];
  if (typeof row.minGpa === "number") {
    nodes.push({
      id: "gpa",
      label: "Minimum GPA",
      kind: "minimum",
      metric: "gpa",
      value: gpa.value,
      unit: null,
      source: gpa.source,
      note:
        gpa.value == null
          ? "The recorded catalogue value is not a verified official requirement for this programme, cycle and applicant group."
          : null,
    });
  }

  const language: RequirementNode[] = [];
  const ielts = requirementValue(row, "minIelts", base);
  if (typeof row.minIelts === "number") {
    language.push({
      id: "ielts",
      label: "IELTS",
      kind: "minimum",
      metric: "ielts",
      value: ielts.value,
      unit: "9",
      requireValid: true,
      source: ielts.source,
    });
  }
  const toefl = requirementValue(row, "minToefl", base);
  if (typeof row.minToefl === "number") {
    language.push({
      id: "toefl",
      label: "TOEFL",
      kind: "minimum",
      metric: "toefl",
      value: toefl.value,
      unit: null,
      requireValid: true,
      source: toefl.source,
    });
  }
  const det = requirementValue(row, "minDet", base);
  if (typeof row.minDet === "number") {
    language.push({
      id: "det",
      label: "Duolingo English Test",
      kind: "minimum",
      metric: "det",
      value: det.value,
      unit: "160",
      requireValid: true,
      source: det.source,
    });
  }
  if (language.length === 1) nodes.push(language[0]);
  else if (language.length > 1) {
    nodes.push({
      id: "language",
      label: "English language",
      kind: "group",
      operator: "anyOf",
      children: language,
      note: "Each listed language test is an accepted alternative route.",
    });
  }

  if (undergraduateTestApplies(opts.programmeDegreeLevel ?? null, opts.applicantDegreeLevel ?? undefined)) {
    const tests: RequirementNode[] = [];
    const sat = requirementValue(row, "minSat", base);
    if (typeof row.minSat === "number") {
      tests.push({ id: "sat", label: "SAT", kind: "minimum", metric: "sat", value: sat.value, unit: "1600", source: sat.source });
    }
    const act = requirementValue(row, "minAct", base);
    if (typeof row.minAct === "number") {
      tests.push({ id: "act", label: "ACT", kind: "minimum", metric: "act", value: act.value, unit: "36", source: act.source });
    }
    if (tests.length === 1) nodes.push(tests[0]);
    else if (tests.length > 1) {
      nodes.push({
        id: "standardised_tests",
        label: "Standardised test",
        kind: "group",
        operator: "anyOf",
        children: tests,
        note: "SAT and ACT are alternative routes unless the programme says otherwise.",
      });
    }
  }

  const documents: { key: string; label: string }[] = [
    { key: "personalStatementRequired", label: "Personal statement" },
    { key: "recommendationRequired", label: "Recommendation letter" },
    { key: "portfolioRequired", label: "Portfolio" },
    { key: "interviewRequired", label: "Interview" },
  ];
  for (const document of documents) {
    if (row[document.key as keyof AssessmentRequirementRow] !== true) continue;
    nodes.push({
      id: document.key,
      label: document.label,
      kind: "record",
      metric: document.key,
      // The catalogue says the document is REQUIRED, not that this applicant
      // holds a confirmed one — so the status starts unknown.
      satisfied: null,
      confirmedForApplicant: null,
      note: "The programme requires this document; whether the applicant holds a complete one is not recorded here.",
    });
  }

  if (typeof row.otherRequirements === "string" && row.otherRequirements.trim()) {
    nodes.push({
      id: "other_requirements",
      label: "Other requirements",
      kind: "record",
      metric: "other_requirements",
      satisfied: null,
      confirmedForApplicant: null,
      note: row.otherRequirements.trim().slice(0, 500),
    });
  }

  return nodes;
}

/**
 * Requirement tree from scoped catalogue facts (the evidence store), used when
 * field-level facts exist. Requires verified official minimums only.
 */
export function requirementNodesFromFacts(
  facts: CatalogueFact[],
  context: FactContext,
  opts: { applicantDegreeLevel?: string | null; programmeDegreeLevel?: string | null } = {}
): RequirementNode[] {
  const nodes: RequirementNode[] = [];
  const { summary } = resolveAcademicRequirements(facts, context);
  const described = (field: string, key: keyof typeof summary) => {
    if (summary[key] == null) return null;
    const resolved = resolveScopedFact(facts, field, context);
    return resolved && mayAutoReject(resolved) ? resolved : null;
  };
  const fromResolved = (
    resolved: TrustedValue,
    id: string,
    label: string,
    metric: "gpa" | "ielts" | "toefl" | "det" | "sat" | "act",
    unit: string | null
  ): RequirementNode => ({
    id,
    label,
    kind: "minimum",
    metric,
    value: typeof resolved.value === "number" ? resolved.value : null,
    unit: resolved.unit ?? unit,
    requireValid: metric === "ielts" || metric === "toefl",
    source: {
      sourceUrl: resolved.sourceUrl,
      verificationStatus: resolved.verificationStatus,
      valueType: resolved.valueType,
      verifiedAt: resolved.verifiedAt,
    },
    admissionCycle: resolved.admissionCycle ?? null,
  });

  const gpa = described("min_gpa", "gpa");
  if (gpa) nodes.push(fromResolved(gpa, "min_gpa", "Minimum GPA", "gpa", null));

  const language: RequirementNode[] = [];
  const ielts = described("min_ielts", "ielts");
  if (ielts) language.push(fromResolved(ielts, "min_ielts", "IELTS", "ielts", "9"));
  const toefl = described("min_toefl", "toefl");
  if (toefl) language.push(fromResolved(toefl, "min_toefl", "TOEFL", "toefl", null));
  const det = described("min_det", "duolingo");
  if (det) language.push(fromResolved(det, "min_det", "Duolingo English Test", "det", "160"));
  if (language.length === 1) nodes.push(language[0]);
  else if (language.length > 1) {
    const operator = resolveScopedFact(facts, "english_requirement_operator", context);
    const allOf = operator != null && isVerifiedOfficialRequirement(operator) && operator.value === "AND";
    nodes.push({
      id: "language",
      label: "English language",
      kind: "group",
      operator: allOf ? "allOf" : "anyOf",
      children: language,
      note: allOf ? "Every listed language test is required." : "Each listed language test is an accepted alternative route.",
    });
  }

  if (undergraduateTestApplies(opts.programmeDegreeLevel ?? null, opts.applicantDegreeLevel ?? undefined)) {
    const tests: RequirementNode[] = [];
    const sat = described("min_sat", "sat");
    if (sat) tests.push(fromResolved(sat, "min_sat", "SAT", "sat", "1600"));
    const act = described("min_act", "act");
    if (act) tests.push(fromResolved(act, "min_act", "ACT", "act", "36"));
    if (tests.length === 1) nodes.push(tests[0]);
    else if (tests.length > 1) {
      nodes.push({
        id: "standardised_tests",
        label: "Standardised test",
        kind: "group",
        operator: "anyOf",
        children: tests,
        note: "SAT and ACT are alternative routes unless the programme says otherwise.",
      });
    }
  }
  return nodes;
}

/** Map a stored `requirement_group` JSON value into canonical requirement nodes. */
export function parseRequirementGroupValue(raw: unknown): RequirementNode[] {
  let value: unknown = raw;
  if (typeof raw === "string") {
    try {
      value = JSON.parse(raw);
    } catch {
      return [];
    }
  }
  const walk = (node: unknown, depth: number): RequirementNode | null => {
    if (!node || typeof node !== "object" || depth > 8) return null;
    const record = node as Record<string, unknown>;
    const id = typeof record.id === "string" ? record.id.slice(0, 100) : `node-${depth}`;
    const label = typeof record.label === "string" ? record.label.slice(0, 300) : id;
    if (record.operator === "allOf" || record.operator === "anyOf") {
      const children = Array.isArray(record.children)
        ? record.children
            .map((child) => walk(child, depth + 1))
            .filter((child): child is RequirementNode => child != null)
        : [];
      if (!children.length) return null;
      return { id, label, kind: "group", operator: record.operator, children };
    }
    const field = typeof record.field === "string" ? record.field : null;
    if (!field) return null;
    if (record.kind === "record") {
      return {
        id,
        label,
        kind: "record",
        metric: field,
        satisfied: null,
        confirmedForApplicant: null,
        note: typeof record.note === "string" ? record.note.slice(0, 500) : null,
      };
    }
    const metric = metricForField(field);
    if (!metric) return null;
    return {
      id,
      label,
      kind: "minimum",
      metric,
      value: typeof record.value === "number" && Number.isFinite(record.value) ? record.value : null,
      unit: typeof record.unit === "string" ? record.unit : null,
      subMinimums: Array.isArray(record.subMinimums)
        ? record.subMinimums
            .filter(
              (item): item is { section: string; value: number } =>
                typeof item === "object" &&
                item != null &&
                typeof (item as { section?: unknown }).section === "string" &&
                typeof (item as { value?: unknown }).value === "number"
            )
            .map((item) => ({ section: item.section, value: item.value }))
        : undefined,
      requireValid: metric === "ielts" || metric === "toefl",
    };
  };
  const parsed = walk(value, 0);
  if (!parsed) return [];
  return parsed.kind === "group" ? parsed.children : [parsed];
}

function metricForField(field: string): "gpa" | "ielts" | "toefl" | "det" | "sat" | "act" | null {
  if (field === "gpa" || field.startsWith("gpa.")) return "gpa";
  if (field === "ielts" || field.startsWith("ielts.")) return "ielts";
  if (field === "toefl" || field.startsWith("toefl.")) return "toefl";
  if (field === "duolingo" || field.startsWith("duolingo.")) return "det";
  if (field === "sat" || field.startsWith("sat.")) return "sat";
  if (field === "act" || field.startsWith("act.")) return "act";
  return null;
}

/**
 * Finance input from resolved (already-USD) costs plus the budget.
 *
 * A cost that is null STAYS null: the finance engine then refuses to publish a
 * total, instead of pretending the line is free.
 */
export function financeInputFromCosts(input: {
  tuitionUsd?: number | null;
  tuitionSourceUrl?: string | null;
  livingUsd?: number | null;
  livingSourceUrl?: string | null;
  insuranceUsd?: number | null;
  oneTimeFeeUsd?: number | null;
  budgetUsd?: number | null;
}): FinanceInput {
  const costs: FinanceInput["costs"] = [
    {
      key: "tuition",
      kind: "tuition",
      label: "Tuition",
      annualUsd: input.tuitionUsd ?? null,
      sourceUrl: input.tuitionSourceUrl ?? null,
    },
    {
      key: "living",
      kind: "living",
      label: "Living costs",
      annualUsd: input.livingUsd ?? null,
      basis: input.livingUsd == null ? "unknown" : "estimate",
      sourceUrl: input.livingSourceUrl ?? null,
    },
  ];
  if (input.insuranceUsd != null) {
    costs.push({ key: "insurance", kind: "insurance", label: "Insurance", annualUsd: input.insuranceUsd });
  }
  if (input.oneTimeFeeUsd != null) {
    costs.push({
      key: "application_fee",
      kind: "mandatory_fee",
      label: "Application fee (one-off)",
      annualUsd: null,
      oneTime: true,
      oneTimeUsd: input.oneTimeFeeUsd,
    });
  }
  return { costs, availableBudgetUsd: input.budgetUsd ?? null };
}

/**
 * Published statistics for one scope.
 *
 * Legacy QS bands are ESTIMATES and are deliberately NOT converted here: only
 * observed values with a documented source become comparisons.
 */
export function publishedStatisticsFor(input: {
  metrics: Partial<
    Record<
      PublishedStatistic["metric"],
      { p25: number | null; p50: number | null; p75: number | null }
    >
  >;
  unit: Partial<Record<PublishedStatistic["metric"], string>>;
  scope: PublishedStatistic["scope"];
  year: string | null;
  population: PublishedStatistic["population"];
  sourceUrl: string | null;
  verificationStatus: string;
}): PublishedStatistic[] {
  const out: PublishedStatistic[] = [];
  for (const metric of ["gpa", "sat", "act", "ielts", "toefl"] as const) {
    const band = input.metrics[metric];
    if (!band) continue;
    out.push({
      metric,
      unit: input.unit[metric] ?? "",
      p25: band.p25,
      p50: band.p50,
      p75: band.p75,
      year: input.year,
      scope: input.scope,
      population: input.population,
      sourceUrl: input.sourceUrl,
      verificationStatus: input.verificationStatus,
      valueType: "observed_statistic",
    });
  }
  return out;
}

/** Build the canonical input for one programme. */
export function assessmentInputFor(input: {
  programme: AssessmentProgrammeRow;
  university: AssessmentUniversityRow;
  profile: AssessmentProfileRow | null | undefined;
  degreeLevel?: string | null;
  cycle?: string | null;
  applicantCategory?: string | null;
  requirements?: RequirementNode[] | null;
  finance?: FinanceInput | null;
  comparisons?: {
    request: {
      metric: PublishedStatistic["metric"];
      unit: string;
      studentValue: number | null;
      expectedScope?: PublishedStatistic["scope"] | null;
    };
    statistics: PublishedStatistic[];
  }[];
  assessedAt: string;
  asOfDate: string;
}) {
  const programme: AssessmentProgramme = {
    id: input.programme.id,
    universityId: input.programme.universityId ?? input.university.id,
    name: input.programme.name,
    field: input.programme.field ?? null,
    degreeLevel: input.programme.degree ?? null,
    language: input.programme.language ?? null,
    studyMode: input.programme.studyMode ?? null,
    country: input.university.country ?? null,
    universityName: input.university.name ?? null,
    officialProgramUrl:
      (isHttp(input.programme.programUrl) ? input.programme.programUrl : null) ??
      (isHttp(input.programme.sourceUrl) ? input.programme.sourceUrl : null) ??
      input.university.officialWebsiteUrl ??
      input.university.websiteUrl ??
      null,
    sourceUrl: input.programme.sourceUrl ?? null,
  };
  const metrics = applicantMetrics(input.profile);
  const context: AssessmentContext = {
    cycle: input.cycle ?? null,
    applicantCategory: input.applicantCategory ?? null,
    degreeLevel: input.degreeLevel ?? input.programme.degree ?? null,
  };
  const applicant: AssessmentApplicant = {
    interests: applicantInterests(input.profile),
    // Stored modes win; a profile without them keeps the legacy migration to
    // `prefer` (never `must`) inside `resolvePreferenceSet`.
    preferences: storedPreferencesToSource(parseAssessmentPreferences(input.profile?.assessmentPreferences)) ?? null,
    legacyPreferredCountries: parseProfileList(input.profile?.preferredCountries),
    eligibilityProfile: {
      ...metrics,
      degreeLevel: input.degreeLevel ?? input.profile?.degreeLevel ?? null,
      requirementDegreeLevel: input.programme.degree ?? null,
      applicantCategory: input.applicantCategory ?? null,
      cycle: input.cycle ?? null,
      asOfDate: input.asOfDate,
    },
    finance: input.finance ?? null,
    comparisons: input.comparisons ?? [],
  };
  return {
    programme,
    context,
    applicant,
    requirements: input.requirements ?? [],
    assessedAt: input.assessedAt,
    asOfDate: input.asOfDate,
  };
}

/**
 * Cache key for an assessment payload: the scoring version AND the profile
 * fingerprint. A scoring-version bump invalidates every cached assessment, and a
 * profile/preference edit invalidates that profile's.
 */
export function assessmentCacheKey(profile: AssessmentProfileRow | null | undefined, locale = "en"): string {
  return `${SCORING_VERSION}|${locale}|${profileMatchFingerprint(profile)}`;
}

/** Applicant degree level vs the assessed programme's level. */
export function degreeLevelRelation(
  applicantDegreeLevel: string | null | undefined,
  programmeDegreeLevel: string | null | undefined
): "match" | "mismatch" | "unknown" {
  return compareDegreeLevels(applicantDegreeLevel ?? null, programmeDegreeLevel ?? null);
}

/**
 * One-call assessment for a catalogue row pair plus its requirement row.
 *
 * This is the function the routes call: it derives the requirement tree, the
 * finance input (same-period USD costs only), the recorded academic
 * comparisons and the canonical context, then runs `assessProgramme`. It takes
 * pure data — the route keeps ownership of the query.
 */
export function assessCatalogueProgramme(input: {
  programme: AssessmentProgrammeRow;
  university: AssessmentUniversityRow;
  profile: AssessmentProfileRow | null | undefined;
  requirementRow?: AssessmentRequirementRow | null;
  /** Scoped field-level evidence. An empty list means no documented minimum. */
  requirementFacts?: CatalogueFact[];
  /** Already-resolved annual USD costs; null when the source is unknown. */
  tuitionUsd?: number | null;
  livingUsd?: number | null;
  applicationFeeUsd?: number | null;
  /** Assessment scope. */
  cycle?: string | null;
  applicantCategory?: string | null;
  degreeLevel?: string | null;
  assessedAt: string;
  asOfDate: string;
  /** Verified published statistics for THIS programme/scope, when they exist. */
  publishedStatistics?: PublishedStatistic[];
}): ProgrammeAssessment {
  const degreeContext = {
    programmeDegreeLevel: input.programme.degree ?? null,
    applicantDegreeLevel: input.degreeLevel ?? input.profile?.degreeLevel ?? null,
  };
  const requirements = input.requirementFacts
    ? requirementNodesFromFacts(input.requirementFacts, {
      programName: input.programme.name,
      degreeLevel: input.programme.degree,
      admissionCycle: input.cycle,
      applicantScope: input.applicantCategory,
    }, degreeContext)
    : requirementNodesFromRow(input.requirementRow, {
      ...degreeContext,
      programmeUrl: input.programme.programUrl ?? input.programme.sourceUrl ?? null,
      cycle: input.cycle ?? null,
    });
  const budgetUsd = input.profile?.budgetAnnualUsd ?? null;
  const finance = financeInputFromCosts({
    tuitionUsd: input.tuitionUsd ?? null,
    tuitionSourceUrl: input.programme.sourceUrl ?? null,
    livingUsd: input.livingUsd ?? null,
    oneTimeFeeUsd: input.applicationFeeUsd ?? null,
    budgetUsd,
  });
  const comparisons = comparisonsFromStatistics(
    publishedStatisticsFor2(input.publishedStatistics ?? []),
    applicantMetrics(input.profile)
  );
  return assessProgramme(
    assessmentInputFor({
      programme: input.programme,
      university: input.university,
      profile: input.profile,
      degreeLevel: input.degreeLevel ?? null,
      cycle: input.cycle ?? null,
      applicantCategory: input.applicantCategory ?? null,
      requirements,
      finance,
      comparisons,
      assessedAt: input.assessedAt,
      asOfDate: input.asOfDate,
    })
  );
}

/** Statistics already in the canonical shape (no conversion, no estimation). */
function publishedStatisticsFor2(statistics: PublishedStatistic[]): PublishedStatistic[] {
  return statistics.filter(
    (statistic) =>
      statistic.verificationStatus === "verified" &&
      statistic.valueType === "observed_statistic" &&
      (statistic.p25 != null || statistic.p50 != null || statistic.p75 != null)
  );
}

/** Build the comparison requests for the student's own recorded metrics. */
export function comparisonsFromStatistics(
  statistics: PublishedStatistic[],
  metrics: ReturnType<typeof applicantMetrics>
): {
  request: {
    metric: PublishedStatistic["metric"];
    unit: string;
    studentValue: number | null;
    expectedScope?: PublishedStatistic["scope"] | null;
  };
  statistics: PublishedStatistic[];
}[] {
  const out: ReturnType<typeof comparisonsFromStatistics> = [];
  for (const metric of ["gpa", "sat", "act", "ielts", "toefl"] as const) {
    const matching = statistics.filter((statistic) => statistic.metric === metric);
    if (!matching.length) continue;
    out.push({
      request: {
        metric,
        unit: matching[0].unit,
        studentValue: metrics[metric]?.value ?? null,
        expectedScope: matching[0].scope,
      },
      statistics: matching,
    });
  }
  return out;
}
