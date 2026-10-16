/**
 * Pure scholarship requirement checks — Priority 4.2 ("Requirement
 * Transparency"). A student currently has to read a paragraph of prose to work
 * out whether an award is even open to them. These checks answer the four
 * published gates as compact pills: GPA floor, English floor, degree level,
 * eligible majors, and destination country.
 *
 * Same honesty contract as the rest of the codebase (spec §14, §22):
 *   - a NULL requirement is `not_published` — never compared, never a green tick;
 *   - a missing student value is `unknown_profile` — we do not guess a GPA;
 *   - a TOEFL student is never compared against an IELTS floor;
 *   - degree levels go through `compareDegreeLevels`, so "MSc" equals "Master"
 *     and an unrecognised label stays UNKNOWN rather than becoming a mismatch.
 *
 * The engine returns ids, states and numbers only — no English strings — so the
 * component renders them through the ICU catalogue in all three languages.
 */

import { compareDegreeLevels, normalizeDegreeLevel } from "@/lib/degreeLevels";
import { countriesMatch, normalizeCountryAlias } from "@/lib/countries";
import { gpaTo40Scale } from "@/lib/gpa";

/** A usable number, or null. Never treats a missing value as zero (spec §14). */
function num(value: unknown): number | null {
  if (value == null || value === "") return null;
  const n = Number(value);
  return Number.isFinite(n) && n >= 0 ? n : null;
}

export type RequirementCheckState =
  | "met"
  | "not_met"
  | "unknown_profile"
  | "not_published"
  | "different_test";

export type RequirementCheckId = "gpa" | "ielts" | "degree" | "major" | "country";

export interface RequirementCheck {
  id: RequirementCheckId;
  state: RequirementCheckState;
  /** The student's own value, as a short display string, when known. */
  mineText: string | null;
  /** The published requirement, as a short display string, when published. */
  requiredText: string | null;
  /** Numeric gap when the state is `not_met` and a gap is meaningful. */
  shortfall: number | null;
  /** ICU params for the pill label (numbers, already formatted for display). */
  params: Record<string, string | number>;
  /** ICU params for the pill's explanatory hint. */
  hintParams: Record<string, string | number>;
}

export interface ScholarshipCheckInput {
  /** Published 4.0-scale minimum. NULL = no floor published. */
  minGpa?: number | null;
  minIelts?: number | null;
  /** JSON array string, e.g. '["Bachelor","Master"]'; empty = unspecified. */
  degreeLevels?: string | null;
  /** JSON array string; empty = open to any major. */
  eligibleMajors?: string | null;
  /** Country the award funds study in. */
  country?: string | null;
}

export interface ScholarshipCheckProfile {
  gpa?: number | null;
  /** The catalogue stores the scale numerically (4.0, 5.0, 100); accept both. */
  gpaScale?: number | string | null;
  ieltsScore?: number | null;
  toeflScore?: number | null;
  degreeLevel?: string | null;
  targetMajor?: string | null;
  country?: string | null;
  preferredCountries?: string | null;
}

export type ScholarshipVerdict =
  /** Every published gate is met. */
  | "clear"
  /** At least one published gate is not met. */
  | "gaps"
  /** Nothing failed, but one or more gates could not be checked. */
  | "incomplete";

export interface ScholarshipCheckSummary {
  checks: RequirementCheck[];
  metCount: number;
  notMetCount: number;
  unknownCount: number;
  verdict: ScholarshipVerdict;
  /** True only when at least one gate was checked and none failed. */
  hasCheckedGates: boolean;
}

/* ------------------------------------------------------------------ parsing */

function parseListField(raw: string | null | undefined): string[] {
  const value = raw?.trim();
  if (!value) return [];
  try {
    const parsed = JSON.parse(value);
    if (Array.isArray(parsed)) {
      return parsed.map((item) => String(item ?? "").trim()).filter(Boolean);
    }
  } catch {
    // Not JSON: the catalogue occasionally stores a comma-separated list.
    return value
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean);
  }
  return [];
}

function fmt(value: number, decimals = 2): string {
  const rounded = Number(value.toFixed(decimals));
  return String(rounded);
}

/* ------------------------------------------------------------- GPA + IELTS */

export function checkGpa(
  scholarship: ScholarshipCheckInput,
  profile: ScholarshipCheckProfile | null
): RequirementCheck {
  const required = num(scholarship.minGpa);
  const base: RequirementCheck = {
    id: "gpa",
    state: "not_published",
    mineText: null,
    requiredText: required != null ? fmt(required) : null,
    shortfall: null,
    params: required != null ? { required: fmt(required) } : {},
    hintParams: required != null ? { required: fmt(required) } : {},
  };
  if (required == null) return base;

  const rawScale = profile?.gpaScale;
  const scale = num(rawScale);
  const mine = gpaTo40Scale(profile?.gpa ?? null, scale);
  if (mine == null) {
    return {
      ...base,
      state: "unknown_profile",
      mineText: null,
      hintParams: { ...base.hintParams, reason: scale != null ? "unconvertible" : "not_set" },
    };
  }

  // `gpaTo40Scale` already returns the 4.0-scale value the published floor uses
  // (and refuses to guess when no scale was recorded), so it is compared as-is.
  const mine40 = Number(mine.toFixed(2));
  const mineText = fmt(mine40);
  const shortfall = mine40 >= required ? 0 : Number((required - mine40).toFixed(2));
  return {
    ...base,
    state: shortfall === 0 ? "met" : "not_met",
    mineText,
    shortfall: shortfall === 0 ? null : shortfall,
    params: { ...base.params, mine: fmt(mine40), required: fmt(required) },
    hintParams: {
      ...base.hintParams,
      mine: fmt(mine40),
      required: fmt(required),
      shortfall: fmt(shortfall),
    },
  };
}

export function checkIelts(
  scholarship: ScholarshipCheckInput,
  profile: ScholarshipCheckProfile | null
): RequirementCheck {
  const required = num(scholarship.minIelts);
  const base: RequirementCheck = {
    id: "ielts",
    state: "not_published",
    mineText: null,
    requiredText: required != null ? fmt(required, 1) : null,
    shortfall: null,
    params: required != null ? { required: fmt(required, 1) } : {},
    hintParams: required != null ? { required: fmt(required, 1) } : {},
  };
  if (required == null) return base;

  const mine = num(profile?.ieltsScore);
  if (mine == null) {
    if (num(profile?.toeflScore) != null) {
      // An IELTS floor cannot be judged from a TOEFL score — the funder decides
      // whether it accepts an equivalent, so we say so instead of converting.
      return { ...base, state: "different_test", mineText: "TOEFL" };
    }
    return { ...base, state: "unknown_profile", hintParams: { ...base.hintParams, reason: "not_set" } };
  }

  const shortfall = mine >= required ? 0 : Number((required - mine).toFixed(1));
  return {
    ...base,
    state: shortfall === 0 ? "met" : "not_met",
    mineText: fmt(mine, 1),
    shortfall: shortfall === 0 ? null : Math.ceil(shortfall * 2) / 2, // next 0.5 band
    params: { ...base.params, mine: fmt(mine, 1), required: fmt(required, 1) },
    hintParams: {
      ...base.hintParams,
      mine: fmt(mine, 1),
      required: fmt(required, 1),
      shortfall: fmt(shortfall, 1),
      nextBand: fmt(Math.ceil((required - mine) * 2) / 2 + mine, 1),
    },
  };
}

/* ------------------------------------------------------------ level + major */

export function checkDegreeLevel(
  scholarship: ScholarshipCheckInput,
  profile: ScholarshipCheckProfile | null
): RequirementCheck {
  const offered = parseListField(scholarship.degreeLevels);
  const base: RequirementCheck = {
    id: "degree",
    state: "not_published",
    mineText: null,
    requiredText: null,
    shortfall: null,
    params: {},
    hintParams: {},
  };
  if (offered.length === 0) return base;

  const requiredText = offered.join(" · ");
  const withRequired: RequirementCheck = {
    ...base,
    requiredText,
    params: { required: requiredText },
    hintParams: { required: requiredText },
  };

  const student = profile?.degreeLevel?.trim() || null;
  if (!student) {
    return { ...withRequired, state: "unknown_profile", hintParams: { ...withRequired.hintParams, reason: "not_set" } };
  }

  const comparison = compareDegreeLevels(student, scholarship.degreeLevels);
  const normalised = normalizeDegreeLevel(student) ?? student;
  return {
    ...withRequired,
    // An unrecognised label on either side is UNKNOWN, never a mismatch.
    state: comparison === "match" ? "met" : comparison === "mismatch" ? "not_met" : "unknown_profile",
    mineText: normalised,
    params: { ...withRequired.params, mine: normalised },
    hintParams: {
      ...withRequired.hintParams,
      mine: normalised,
      reason: comparison === "unknown" ? "unrecognised" : "compared",
    },
  };
}

/** Word-based major comparison: a 3-letter token can never match by accident. */
function majorWords(value: string): string[] {
  return value
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((word) => word.length >= 3);
}

export function checkMajor(
  scholarship: ScholarshipCheckInput,
  profile: ScholarshipCheckProfile | null
): RequirementCheck {
  const majors = parseListField(scholarship.eligibleMajors);
  const base: RequirementCheck = {
    id: "major",
    state: "not_published",
    mineText: null,
    requiredText: null,
    shortfall: null,
    params: {},
    hintParams: {},
  };
  if (majors.length === 0) return base;
  if (majors.some((item) => item.trim().toLowerCase() === "all")) return { ...base, state: "met", requiredText: "All" };

  const requiredText = majors.slice(0, 3).join(" · ") + (majors.length > 3 ? " …" : "");
  const withRequired: RequirementCheck = { ...base, requiredText, params: { required: requiredText }, hintParams: { required: requiredText } };

  const student = profile?.targetMajor?.trim() || null;
  if (!student) {
    return { ...withRequired, state: "unknown_profile", hintParams: { ...withRequired.hintParams, reason: "not_set" } };
  }

  const studentWords = majorWords(student);
  const eligible = majors.some((major) => {
    const listed = majorWords(major);
    if (listed.length === 0) return false;
    if (major.trim().toLowerCase() === student.toLowerCase()) return true;
    return listed.some((word) => studentWords.includes(word));
  });
  return {
    ...withRequired,
    state: eligible ? "met" : "not_met",
    mineText: student,
    params: { ...withRequired.params, mine: student },
    hintParams: { ...withRequired.hintParams, mine: student },
  };
}

/* ------------------------------------------------------------------ country */

export function checkCountry(
  scholarship: ScholarshipCheckInput,
  profile: ScholarshipCheckProfile | null
): RequirementCheck {
  const awardCountry = scholarship.country?.trim() || null;
  const base: RequirementCheck = {
    id: "country",
    state: "not_published",
    mineText: null,
    requiredText: null,
    shortfall: null,
    params: {},
    hintParams: {},
  };
  if (!awardCountry) return base;

  const withRequired: RequirementCheck = {
    ...base,
    requiredText: awardCountry,
    params: { required: awardCountry },
    hintParams: { required: awardCountry },
  };

  const preferred = parseListField(profile?.preferredCountries ?? null);
  const home = profile?.country?.trim() || null;
  const targets = [...preferred, ...(home ? [home] : [])];
  if (targets.length === 0) {
    return { ...withRequired, state: "unknown_profile", hintParams: { ...withRequired.hintParams, reason: "not_set" } };
  }

  const normalisedAward = normalizeCountryAlias(awardCountry);
  const wanted = targets.some((target) => countriesMatch(target, normalisedAward));
  return {
    ...withRequired,
    state: wanted ? "met" : "not_met",
    mineText: preferred[0] ?? home,
    params: { ...withRequired.params, mine: preferred[0] ?? home ?? "" },
    hintParams: { ...withRequired.hintParams, mine: preferred[0] ?? home ?? "", count: targets.length },
  };
}

/* ------------------------------------------------------------------ summary */

/**
 * Build the full pill set for one scholarship. Checks that have no published
 * requirement are still returned (state `not_published`) so the component can
 * decide whether to show "no minimum published" or hide the pill.
 */
export function checkScholarshipRequirements(
  scholarship: ScholarshipCheckInput,
  profile: ScholarshipCheckProfile | null
): ScholarshipCheckSummary {
  const checks = [
    checkGpa(scholarship, profile),
    checkIelts(scholarship, profile),
    checkDegreeLevel(scholarship, profile),
    checkMajor(scholarship, profile),
    checkCountry(scholarship, profile),
  ];

  const published = checks.filter((check) => check.state !== "not_published");
  const metCount = published.filter((check) => check.state === "met").length;
  const notMetCount = published.filter((check) => check.state === "not_met").length;
  const unknownCount = published.filter(
    (check) => check.state === "unknown_profile" || check.state === "different_test"
  ).length;

  const verdict: ScholarshipVerdict =
    notMetCount > 0 ? "gaps" : published.length === 0 || unknownCount > 0 ? "incomplete" : "clear";

  return { checks, metCount, notMetCount, unknownCount, verdict, hasCheckedGates: published.length > 0 };
}

/**
 * Payload for `POST /api/funding` ("Add to My Funding Plan"). The route requires
 * `name` and `amountUsd` and whitelists `kind`/`status`, so a scholarship maps to
 * `kind: "scholarship"` with `status: "planned"` — the honest state before any
 * application has been submitted.
 */
export function scholarshipFundingPayload(input: {
  profileId: number;
  title: string;
  provider?: string | null;
  /** Annual award in USD (already period-normalised by the catalogue). */
  awardAmountUsd?: number | null;
  country?: string | null;
  deadline?: string | null;
  url?: string | null;
}) {
  const name = input.provider?.trim() ? `${input.title.trim()} — ${input.provider.trim()}` : input.title.trim();
  const amount = num(input.awardAmountUsd) ?? 0;
  const notes = [
    input.country?.trim() ? `Destination: ${input.country.trim()}` : null,
    input.deadline ? `Deadline: ${input.deadline}` : null,
    input.url ? `Official page: ${input.url}` : null,
  ]
    .filter(Boolean)
    .join(" · ")
    .slice(0, 1000);

  return {
    profileId: input.profileId,
    // The funding route needs an amount; an award with no published figure goes
    // in at 0 so the plan line exists and the student can fill the real number.
    name: name.slice(0, 200),
    amountUsd: amount,
    kind: "scholarship" as const,
    status: "planned" as const,
    covers: ["tuition"] as string[],
    notes: notes || undefined,
  };
}
