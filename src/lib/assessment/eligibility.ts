/**
 * Eligibility — documented mandatory requirements, evaluated as a requirement
 * TREE (AND / OR), never as an average of scores.
 *
 * WHAT THIS ANSWERS (spec §6)
 * ---------------------------
 * "Have the programme's mandatory requirements been met, not met, or is there
 * not enough verified information to say?" It is deliberately NOT a percentage
 * and NOT a chance of admission. A checklist progress bar is not a probability.
 *
 * GROUP SEMANTICS
 *   allOf: any applicable `unmet` → unmet; else any `unknown` → unknown; else met.
 *   anyOf: any `met` → met; else any `unknown` → unknown; else unmet.
 *          A group becomes `unmet` ONLY when every applicable route is unmet —
 *          an unverified alternative keeps the group `unknown`.
 *
 * A REQUIREMENT WITH NO DOCUMENTED VALUE IS `unknown`
 * (`missing_requirement`), never `met` and never `unmet`. An empty requirement
 * list therefore never yields an overall `met`.
 *
 * GPA is never converted proportionally without a published conversion rule;
 * an incomparable scale stays `unknown` (`incomparable_scale`).
 *
 * Pure module — asserted in `scripts/check-assessment.ts`.
 */

import { compareDegreeLevels } from "@/lib/degreeLevels";
import { ELIGIBILITY_RULES_VERSION, SCORING_VERSION } from "./version";

export type EligibilityState = "met" | "unmet" | "unknown" | "not_applicable";

export const ELIGIBILITY_UNKNOWN_REASONS = [
  "missing_user_data",
  "missing_requirement",
  "unverified_waiver",
  "incomparable_scale",
  "stale_or_wrong_cycle",
  "conflicting_sources",
] as const;

export type EligibilityUnknownReason = (typeof ELIGIBILITY_UNKNOWN_REASONS)[number];

/** Sources that may establish a requirement are official and typed. */
export interface EligibilitySource {
  /** Official publisher URL; a bare homepage is not evidence for a cutoff. */
  sourceUrl: string | null;
  /** Field-level verification status of THIS value. */
  verificationStatus: string;
  valueType: string;
  verifiedAt?: string | null;
}

export function isVerifiedOfficialSource(source: EligibilitySource | null | undefined): boolean {
  if (!source) return false;
  const url = source.sourceUrl ?? "";
  if (!url.startsWith("https://")) return false;
  if (source.verificationStatus !== "verified") return false;
  if (source.valueType !== "official_requirement") return false;
  return true;
}

export interface UserMetric {
  value: number | null;
  /** Scale/unit the value is expressed in (e.g. "9" for IELTS, "4" for GPA). */
  unit?: string | null;
  /** Minimum of the user's own scale, for a non-zero-based GPA scale. */
  minimum?: number | null;
  examDate?: string | null;
  validUntil?: string | null;
  /** Section scores keyed by lowercase section name, used by sub-score minima. */
  sections?: Record<string, number | null> | null;
}

export interface RequirementNodeBase {
  id: string;
  label: string;
  /** Official evidence for this requirement, or null when undocumented. */
  source?: EligibilitySource | null;
  /** Requirement applies to this cycle only. */
  admissionCycle?: string | null;
  /** Optional free-text explanation kept for display. */
  note?: string | null;
}

export interface MinimumRequirementNode extends RequirementNodeBase {
  kind: "minimum";
  /** Which student metric it reads. */
  metric: "gpa" | "ielts" | "toefl" | "det" | "sat" | "act" | "subject" | "document" | "other";
  /** Minimum value, in the metric's own unit. Null = not documented. */
  value: number | null;
  unit?: string | null;
  /** Optional sub-score minima keyed by section (IELTS/TOEFL writing, …). */
  subMinimums?: { section: string; value: number }[];
  /** Require the test record to be valid on the assessment date. */
  requireValid?: boolean;
}

export interface RecordRequirementNode extends RequirementNodeBase {
  kind: "record";
  metric: string;
  /** A verified record exists for the student. */
  satisfied: boolean | null;
  /** True only when the record's own eligibility was confirmed for THIS user. */
  confirmedForApplicant?: boolean | null;
}

export interface GroupRequirementNode extends RequirementNodeBase {
  kind: "group";
  operator: "allOf" | "anyOf";
  children: RequirementNode[];
  /** `not_applicable` marks a route that does not apply (e.g. a waiver route). */
  notApplicable?: boolean;
}

export type RequirementNode = MinimumRequirementNode | RecordRequirementNode | GroupRequirementNode;

export interface EligibilityCheck {
  requirementId: string;
  label: string;
  status: EligibilityState;
  reason: string;
  /** The reason vocabulary §6 requires for an unknown. */
  unknownReason: EligibilityUnknownReason | null;
  /** What the student has recorded, verbatim in the metric's unit. */
  userValue: string | null;
  /** What the programme requires, verbatim in the metric's unit. */
  requiredValue: string | null;
  /** The gap to close, when a numeric comparison is meaningful. */
  gap: { metric: string; current: number; required: number; delta: number } | null;
  sourceUrl: string | null;
  note: string;
  children: EligibilityCheck[];
  operator: "allOf" | "anyOf" | null;
}

export interface EligibilityResult {
  scoringVersion: string;
  rulesVersion: string;
  /** `met` requires EVERY mandatory group met AND a non-empty requirement set. */
  status: EligibilityState;
  /** True when at least one documented requirement exists. */
  requirementsDocumented: boolean;
  checks: EligibilityCheck[];
  counts: { met: number; unmet: number; unknown: number; notApplicable: number };
  unknownReasons: EligibilityUnknownReason[];
  /** Plain-language gaps the student can act on (never a probability). */
  gaps: { requirementId: string; label: string; text: string }[];
  /** What an assessment cannot see, stated instead of implied. */
  limitations: string[];
}

export interface EligibilityProfile {
  gpa?: UserMetric | null;
  ielts?: UserMetric | null;
  toefl?: UserMetric | null;
  det?: UserMetric | null;
  sat?: UserMetric | null;
  act?: UserMetric | null;
  /** The applicant category the profile describes (Bachelor/Master/PhD…). */
  degreeLevel?: string | null;
  /** The degree level the requirement set belongs to. */
  requirementDegreeLevel?: string | null;
  /** The applicant category the requirement set belongs to (spec §2). */
  applicantCategory?: string | null;
  profileApplicantCategory?: string | null;
  cycle?: string | null;
  asOfDate: string;
  /** Verified exceptions/waivers the student holds for THIS programme. */
  confirmedWaivers?: { id: string; scope: string; source?: EligibilitySource | null }[] | null;
  /** Subjects the student has documented (for prerequisite checks). */
  subjects?: string[] | null;
  documents?: string[] | null;
}

const UNKNOWN = (
  reason: EligibilityUnknownReason,
  note: string
): { status: EligibilityState; reason: string; unknownReason: EligibilityUnknownReason; note: string } => ({
  status: "unknown",
  reason,
  unknownReason: reason,
  note,
});

function metricOf(profile: EligibilityProfile, metric: MinimumRequirementNode["metric"]): UserMetric | null {
  switch (metric) {
    case "gpa":
      return profile.gpa ?? null;
    case "ielts":
      return profile.ielts ?? null;
    case "toefl":
      return profile.toefl ?? null;
    case "det":
      return profile.det ?? null;
    case "sat":
      return profile.sat ?? null;
    case "act":
      return profile.act ?? null;
    default:
      return null;
  }
}

const METRIC_LABEL: Record<MinimumRequirementNode["metric"], string> = {
  gpa: "GPA",
  ielts: "IELTS",
  toefl: "TOEFL",
  det: "Duolingo English Test",
  sat: "SAT",
  act: "ACT",
  subject: "Required subject",
  document: "Required document",
  other: "Requirement",
};

/** A valid date check that tolerates a missing date (= cannot verify). */
function validityOf(metric: UserMetric, asOfDate: string): "valid" | "expired" | "unknown" {
  const until = metric.validUntil?.slice(0, 10) ?? null;
  const exam = metric.examDate?.slice(0, 10) ?? null;
  if (exam && exam > asOfDate) return "unknown";
  if (!until) return "unknown";
  if (!/^\d{4}-\d{2}-\d{2}$/.test(until)) return "unknown";
  return until >= asOfDate ? "valid" : "expired";
}

function evaluateMinimum(
  node: MinimumRequirementNode,
  profile: EligibilityProfile
): EligibilityCheck {
  const base = {
    requirementId: node.id,
    label: node.label,
    sourceUrl: node.source?.sourceUrl ?? null,
    children: [] as EligibilityCheck[],
    operator: null,
    gap: null as EligibilityCheck["gap"],
  };

  // Scope guards: a requirement from another cycle/applicant category cannot
  // establish anything about THIS assessment (spec §2).
  if (node.admissionCycle && profile.cycle && node.admissionCycle !== profile.cycle) {
    const unknown = UNKNOWN(
      "stale_or_wrong_cycle",
      `The recorded requirement belongs to cycle ${node.admissionCycle}, but this assessment is for ${profile.cycle}.`
    );
    return { ...base, userValue: null, requiredValue: null, ...unknown };
  }
  if (
    profile.requirementDegreeLevel &&
    profile.degreeLevel &&
    compareDegreeLevels(profile.degreeLevel, profile.requirementDegreeLevel) === "mismatch"
  ) {
    return {
      ...base,
      userValue: null,
      requiredValue: null,
      status: "not_applicable",
      reason: "not_applicable_for_degree_level",
      unknownReason: null,
      note: `This requirement is for ${profile.requirementDegreeLevel}; the applicant is applying for ${profile.degreeLevel}.`,
    };
  }
  if (node.metric === "subject" || node.metric === "document" || node.metric === "other") {
    const document = node.metric === "document" ? (profile.documents ?? []) : (profile.subjects ?? []);
    if (node.value == null) {
      const unknown = UNKNOWN(
        "missing_requirement",
        "The programme lists this requirement without a verifiable value; it is not treated as met."
      );
      return { ...base, userValue: null, requiredValue: null, ...unknown };
    }
    if (!document.length) {
      const recorded = node.metric === "document" ? "No documents are recorded" : "No subjects are recorded";
      const unknown = UNKNOWN("missing_user_data", `${recorded}.`);
      return { ...base, userValue: null, requiredValue: node.note ?? node.label, ...unknown };
    }
    return {
      ...base,
      userValue: document.join(", "),
      requiredValue: node.note ?? node.label,
      status: "unknown",
      reason: "documented_items_not_mapped",
      unknownReason: "missing_requirement",
      note:
        "Recorded items exist, but this assessment has no verified rule match that turns them into a " +
        "requirement outcome; check the requirement on the official page.",
    };
  }

  // The requirement value itself must be documented and officially verified —
  // a requirement without a verified source cannot decide anything.
  if (node.value == null || !Number.isFinite(node.value)) {
    const unknown = UNKNOWN(
      "missing_requirement",
      "No documented minimum for this requirement; an empty requirement is not a satisfied one."
    );
    return { ...base, userValue: metricOf(profile, node.metric)?.value?.toString() ?? null, requiredValue: null, ...unknown };
  }
  if (!isVerifiedOfficialSource(node.source)) {
    const unknown = UNKNOWN(
      "missing_requirement",
      "The recorded minimum does not carry a verified official source for this programme, cycle and applicant group, so it cannot decide eligibility."
    );
    return {
      ...base,
      userValue: metricOf(profile, node.metric)?.value?.toString() ?? null,
      requiredValue: `${node.value}${node.unit ? ` ${node.unit}` : ""}`,
      ...unknown,
    };
  }

  const user = metricOf(profile, node.metric);
  if (!user || user.value == null || !Number.isFinite(user.value)) {
    const unknown = UNKNOWN("missing_user_data", `No ${METRIC_LABEL[node.metric]} result is recorded.`);
    return {
      ...base,
      userValue: null,
      requiredValue: `${node.value}${node.unit ? ` ${node.unit}` : ""}`,
      ...unknown,
    };
  }

  const requiredUnit = (node.unit ?? "").trim();
  const userUnit = (user.unit ?? "").trim();
  const normaliseUnit = (unit: string) => {
    if (node.metric === "ielts" && unit.toLowerCase() === "ielts band") return "9";
    if (node.metric === "gpa" && /^GPA 4\.0$/i.test(unit)) return "4";
    return /^\d+(?:\.\d+)?$/.test(unit) ? String(Number(unit)) : unit;
  };
  const requiredScale = normaliseUnit(requiredUnit);
  const userScale = normaliseUnit(userUnit);
  const needsExplicitScale = node.metric === "gpa" || node.metric === "toefl";
  const scaleUnknown = needsExplicitScale && (!requiredScale || !userScale);
  const scaleMismatch = Boolean(requiredScale && userScale && requiredScale !== userScale);
  const gpaBasisMismatch = node.metric === "gpa" && (user.value < 0 || (user.minimum ?? 0) !== 0);
  if (scaleUnknown || scaleMismatch || gpaBasisMismatch) {
    return {
      ...base,
      userValue: `${user.value}${userUnit ? ` / ${userUnit}` : ""}`,
      requiredValue: `${node.value}${requiredUnit ? ` / ${requiredUnit}` : ""}`,
      ...UNKNOWN("incomparable_scale", "The recorded and published score scales cannot be compared."),
    };
  }

  if (node.requireValid) {
    const validity = validityOf(user, profile.asOfDate);
    if (validity === "expired") {
      const unknown = UNKNOWN(
        "missing_user_data",
        `The recorded ${METRIC_LABEL[node.metric]} result is not valid on ${profile.asOfDate}.`
      );
      return {
        ...base,
        userValue: `${user.value}`,
        requiredValue: `${node.value}`,
        ...unknown,
      };
    }
    if (validity === "unknown") {
      const unknown = UNKNOWN(
        "missing_user_data",
        "The programme requires a test that is still valid, but the exam/validity date is not recorded."
      );
      return {
        ...base,
        userValue: `${user.value}`,
        requiredValue: `${node.value}`,
        ...unknown,
      };
    }
  }

  const overall = user.value >= node.value ? "met" : "unmet";
  const subChecks: EligibilityCheck[] = [];
  const subMinimums = node.subMinimums ?? [];

  // Sub-score minima are mandatory sub-conditions of the same requirement: an
  // overall score that clears the bar does NOT satisfy them (spec §6).
  for (const sub of subMinimums) {
    const sectionValue = readSection(user, sub.section);
    if (sectionValue == null) {
      subChecks.push({
        requirementId: `${node.id}:${sub.section}`,
        label: `${METRIC_LABEL[node.metric]} ${sub.section}`,
        status: "unknown",
        reason: "missing_user_data",
        unknownReason: "missing_user_data",
        userValue: null,
        requiredValue: String(sub.value),
        gap: null,
        sourceUrl: node.source?.sourceUrl ?? null,
        note: `The programme sets a ${sub.section} minimum, but no section score is recorded.`,
        children: [],
        operator: null,
      });
      continue;
    }
    const passed = sectionValue >= sub.value;
    subChecks.push({
      requirementId: `${node.id}:${sub.section}`,
      label: `${METRIC_LABEL[node.metric]} ${sub.section}`,
      status: passed ? "met" : "unmet",
      reason: passed ? "comparison" : "comparison",
      unknownReason: null,
      userValue: String(sectionValue),
      requiredValue: String(sub.value),
      gap: passed ? null : { metric: node.metric, current: sectionValue, required: sub.value, delta: sub.value - sectionValue },
      sourceUrl: node.source?.sourceUrl ?? null,
      note: passed ? "Meets the published sub-score minimum." : "Below the published sub-score minimum.",
      children: [],
      operator: null,
    });
  }

  const subFailed = subChecks.some((check) => check.status === "unmet");
  const subUnknown = subChecks.some((check) => check.status === "unknown");
  const status: EligibilityState =
    overall === "unmet" || subFailed ? "unmet" : subUnknown ? "unknown" : "met";

  const statusNote =
    overall === "unmet"
      ? `Below the documented minimum of ${node.value}${node.unit ? ` ${node.unit}` : ""}.`
      : subFailed
        ? "The overall result clears the minimum, but a mandatory sub-score does not."
        : subUnknown
          ? "The overall result clears the minimum, but a mandatory sub-score is not recorded."
          : `Meets the documented minimum of ${node.value}${node.unit ? ` ${node.unit}` : ""}.`;

  return {
    ...base,
    userValue: `${user.value}${node.unit ? ` ${node.unit}` : ""}`,
    requiredValue: `${node.value}${node.unit ? ` ${node.unit}` : ""}`,
    status,
    reason: status === "met" ? "comparison_met" : status === "unmet" ? "comparison_unmet" : "sub_score_unknown",
    unknownReason: status === "unknown" ? "missing_user_data" : null,
    // A gap is reported only for a genuine numeric shortfall on the overall
    // value; a sub-score shortfall is carried by its own child check.
    gap:
      overall === "unmet"
        ? { metric: node.metric, current: user.value, required: node.value, delta: node.value - user.value }
        : null,
    note: statusNote,
    children: subChecks,
    operator: null,
  };
}

function readSection(metric: UserMetric, section: string): number | null {
  const sections = metric.sections;
  if (!sections) return null;
  const value = sections[section.toLowerCase()] ?? sections[section];
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function evaluateRecord(
  node: RecordRequirementNode,
  profile: EligibilityProfile
): EligibilityCheck {
  const base = {
    requirementId: node.id,
    label: node.label,
    userValue: null as string | null,
    requiredValue: node.note ?? node.label,
    gap: null,
    sourceUrl: node.source?.sourceUrl ?? null,
    children: [] as EligibilityCheck[],
    operator: null,
  };
  // A waiver/exception EXISTS only when it is confirmed for THIS applicant.
  // A published waiver policy does not mean the student has been granted it.
  if (node.confirmedForApplicant !== true) {
    const confirmed = (profile.confirmedWaivers ?? []).some((waiver) => waiver.scope === node.metric);
    if (!confirmed) {
      return {
        ...base,
        status: "unknown",
        reason: "unverified_waiver",
        unknownReason: "unverified_waiver",
        note:
          "An exception or waiver route is described, but it has not been confirmed for this applicant, " +
          "so the route stays unverified rather than met.",
      };
    }
    return { ...base, status: "met", reason: "confirmed_waiver", unknownReason: null, note: "A confirmed exception covers this requirement." };
  }
  if (node.satisfied == null) {
    return {
      ...base,
      status: "unknown",
      reason: "missing_user_data",
      unknownReason: "missing_user_data",
      note: "The record's status is not known.",
    };
  }
  return {
    ...base,
    status: node.satisfied ? "met" : "unmet",
    reason: node.satisfied ? "record_present" : "record_absent",
    unknownReason: null,
    note: node.satisfied ? "The required record is present." : "The required record is missing.",
  };
}

function evaluateNode(node: RequirementNode, profile: EligibilityProfile): EligibilityCheck {
  if (node.kind === "minimum") return evaluateMinimum(node, profile);
  if (node.kind === "record") return evaluateRecord(node, profile);

  const children = node.children.map((child) => evaluateNode(child, profile));
  const base = {
    requirementId: node.id,
    label: node.label,
    userValue: null,
    requiredValue: null,
    gap: null,
    sourceUrl: node.source?.sourceUrl ?? null,
    children,
    operator: node.operator,
  };

  if (node.notApplicable) {
    return {
      ...base,
      status: "not_applicable",
      reason: "route_not_applicable",
      unknownReason: null,
      note: "This requirement route does not apply to the applicant.",
    };
  }

  const applicable = children.filter((child) => child.status !== "not_applicable");
  if (!applicable.length) {
    return {
      ...base,
      status: "not_applicable",
      reason: "no_applicable_route",
      unknownReason: null,
      note: "No requirement in this group applies to the applicant.",
    };
  }

  if (node.operator === "allOf") {
    const unmet = applicable.filter((child) => child.status === "unmet");
    const unknown = applicable.filter((child) => child.status === "unknown");
    if (unmet.length) {
      return {
        ...base,
        status: "unmet",
        reason: "all_of_unmet",
        unknownReason: null,
        note: `${unmet.length} mandatory requirement${unmet.length === 1 ? "" : "s"} not met.`,
      };
    }
    if (unknown.length) {
      return {
        ...base,
        status: "unknown",
        reason: "all_of_unknown",
        unknownReason: unknown[0].unknownReason ?? "missing_user_data",
        note: `${unknown.length} mandatory requirement${unknown.length === 1 ? " is" : "s are"} not established yet.`,
      };
    }
    return { ...base, status: "met", reason: "all_of_met", unknownReason: null, note: "Every mandatory requirement in this group is met." };
  }

  // anyOf: one met route satisfies the group; unmet only when ALL are unmet.
  const met = applicable.filter((child) => child.status === "met");
  if (met.length) {
    return { ...base, status: "met", reason: "any_of_met", unknownReason: null, note: "At least one accepted route is met." };
  }
  const unknown = applicable.filter((child) => child.status === "unknown");
  if (unknown.length) {
    return {
      ...base,
      status: "unknown",
      reason: "any_of_unverified_route",
      unknownReason: unknown[0].unknownReason ?? "missing_user_data",
      note: "Every route that could satisfy this group is unmet, but an unverified alternative remains.",
    };
  }
  return { ...base, status: "unmet", reason: "any_of_unmet", unknownReason: null, note: "Every accepted route is unmet." };
}

const collect = (checks: EligibilityCheck[], out: EligibilityCheck[] = []): EligibilityCheck[] => {
  for (const check of checks) {
    out.push(check);
    collect(check.children, out);
  }
  return out;
};

/**
 * Evaluate a requirement tree.
 *
 * `requirements` may be empty: an empty list yields `unknown`, never `met` —
 * the checklist being empty is not a satisfied checklist.
 */
export function evaluateEligibility(
  requirements: RequirementNode[] | null | undefined,
  profile: EligibilityProfile,
  opts: { applicantCategory?: string | null; cycle?: string | null } = {}
): EligibilityResult {
  const nodes = Array.isArray(requirements) ? requirements : [];
  const effectiveProfile: EligibilityProfile = {
    ...profile,
    cycle: opts.cycle ?? profile.cycle ?? null,
    requirementDegreeLevel: profile.requirementDegreeLevel ?? profile.degreeLevel ?? null,
  };

  const root: GroupRequirementNode = {
    id: "eligibility-root",
    label: "Programme requirements",
    kind: "group",
    operator: "allOf",
    children: nodes,
  };
  const tree = evaluateNode(root, effectiveProfile);
  const all = collect(tree.children);
  const counts = {
    met: all.filter((check) => check.status === "met").length,
    unmet: all.filter((check) => check.status === "unmet").length,
    unknown: all.filter((check) => check.status === "unknown").length,
    notApplicable: all.filter((check) => check.status === "not_applicable").length,
  };
  const requirementsDocumented = nodes.length > 0;
  const unknownReasons = [
    ...new Set(all.map((check) => check.unknownReason).filter((reason): reason is EligibilityUnknownReason => reason != null)),
  ];

  const status: EligibilityState = !requirementsDocumented
    ? "unknown"
    : tree.status === "not_applicable"
      ? "unknown"
      : tree.status;

  const gaps = all
    .filter((check) => check.status === "unmet" && check.gap)
    .map((check) => ({
      requirementId: check.requirementId,
      label: check.label,
      text: `${check.label}: ${check.userValue ?? "—"} vs ${check.requiredValue ?? "—"} (${check.gap!.delta} to close).`,
    }));

  const limitations: string[] = [];
  if (!requirementsDocumented) {
    limitations.push(
      "No documented requirement is recorded for this programme, cycle and applicant group, so eligibility cannot be decided."
    );
  }
  if (counts.unknown > 0) {
    limitations.push(
      `${counts.unknown} check${counts.unknown === 1 ? "" : "s"} could not be decided. Unknown is neither met nor unmet.`
    );
  }
  limitations.push(
    "This is not an admission probability and does not predict an outcome; only the programme can decide an application."
  );

  return {
    scoringVersion: SCORING_VERSION,
    rulesVersion: ELIGIBILITY_RULES_VERSION,
    status,
    requirementsDocumented,
    checks: tree.children,
    counts,
    unknownReasons,
    gaps,
    limitations,
  };
}

/**
 * "Gap to close" — re-evaluate the WHOLE tree after a hypothetical change.
 * Closing an overall IELTS band does not fix a sub-score minimum or any other
 * requirement; the caller sees exactly what remains unmet.
 */
export function simulateGapToClose(
  requirements: RequirementNode[] | null | undefined,
  profile: EligibilityProfile,
  change: Partial<{ gpa: number; ielts: number; toefl: number; det: number; sat: number; act: number }>,
  opts: { applicantCategory?: string | null; cycle?: string | null } = {}
): {
  before: EligibilityResult;
  after: EligibilityResult;
  resolved: string[];
  stillUnmet: string[];
  stillUnknown: string[];
} {
  const before = evaluateEligibility(requirements, profile, opts);
  const next: EligibilityProfile = { ...profile };
  for (const metric of ["gpa", "ielts", "toefl", "det", "sat", "act"] as const) {
    const value = change[metric];
    if (value == null || !Number.isFinite(value)) continue;
    const existing = metricOf(profile, metric);
    next[metric] = { ...(existing ?? { value: null }), value };
  }
  const after = evaluateEligibility(requirements, next, opts);
  const stateOf = (result: EligibilityResult) =>
    new Map(collect(result.checks).map((check) => [check.requirementId, check.status]));
  const beforeStates = stateOf(before);
  const afterStates = stateOf(after);
  const resolved: string[] = [];
  const stillUnmet: string[] = [];
  const stillUnknown: string[] = [];
  for (const [id, status] of afterStates) {
    if (status === "unmet") stillUnmet.push(id);
    else if (status === "unknown") stillUnknown.push(id);
    else if (status === "met" && beforeStates.get(id) === "unmet") resolved.push(id);
  }
  return { before, after, resolved, stillUnmet, stillUnknown };
}
