/**
 * Preference model — modes, legacy migration and the weighted fit arithmetic.
 *
 * THREE MODES, ONE MEANING EACH (spec §3)
 * ---------------------------------------
 *   `must`          — a FILTER. Match → pass, mismatch → fail, not enough data
 *                     → unknown. A `must` never contributes to the weighted
 *                     score, so the same factor is never counted twice.
 *   `prefer`        — a WEIGHT. Contributes `weight × similarity` to the fit.
 *   `no_preference` — excluded from both the filter and the score.
 *
 * WHAT THE FORMULA IS (spec §4)
 * -----------------------------
 *   T = Σ weights of every ACTIVE `prefer` factor
 *   K = Σ weights of the active factors whose similarity is KNOWN
 *   W = Σ (weight × similarity) over the known factors
 *   knownFit   = 100 × W / K        (null when K is 0)
 *   coverage   = 100 × K / T        (null when T is 0)
 *   lowerBound = 100 × W / T        (null when T is 0)
 *   upperBound = 100 × (W + U) / T  (U = T − K: unknown factors may be anything)
 *
 * The interval is the range the point score could occupy, NOT a statistical
 * confidence interval. Coverage is the share of the weight that has data, NOT a
 * model-accuracy or source-reliability figure. An unknown factor is never
 * filled with 0 or 0.5, and nothing is rounded until the UI renders it.
 *
 * Pure module — asserted in `scripts/check-assessment.ts`.
 */

import { clamp } from "@/lib/scoring";
import {
  PREFERENCE_WEIGHTS,
  PREFERENCE_AXES,
  PREFERENCE_SETTINGS_VERSION,
  SCORING_VERSION,
  type PreferenceAxis,
} from "./version";

export type PreferenceMode = "must" | "prefer" | "no_preference";

export interface PreferenceSetting<Value> {
  mode: PreferenceMode;
  value: Value | null;
}

export interface PreferenceSet {
  subject?: PreferenceSetting<string[]>;
  country?: PreferenceSetting<string[]>;
  teaching_language?: PreferenceSetting<string[]>;
  /** full-time / part-time — an AXIS of its own. */
  study_load?: PreferenceSetting<string[]>;
  /** campus / online / hybrid — an AXIS of its own, not a synonym of load. */
  delivery_mode?: PreferenceSetting<string[]>;
  /** Subjects the student explicitly declared equal to their own. */
  acceptedSubjectEquivalents?: string[];
  /** Student-confirmed language-test ability (NOT a preference). */
  languageAbility?: { test: string; score: number | null }[] | null;
  /** Student-confirmed language-certificate records (NOT a preference). */
  languageCertificates?: { test: string; score: number | null; validUntil?: string | null }[] | null;
}

export interface PreferenceSource {
  subject?: PreferenceSetting<string[]> | null;
  country?: PreferenceSetting<string[]> | null;
  teaching_language?: PreferenceSetting<string[]> | null;
  study_load?: PreferenceSetting<string[]> | null;
  delivery_mode?: PreferenceSetting<string[]> | null;
  acceptedSubjectEquivalents?: string[] | null;
}

/** Preference source plus the student's language facts (kept OUT of the fit). */
export interface PreferenceSourceWithLanguage extends PreferenceSource {
  languageAbility?: { test: string; score: number | null }[] | null;
  languageCertificates?: { test: string; score: number | null; validUntil?: string | null }[] | null;
}

export const STUDY_LOAD_VALUES = ["full-time", "part-time"] as const;
export const DELIVERY_MODE_VALUES = ["campus", "online", "hybrid"] as const;
export type StudyLoad = (typeof STUDY_LOAD_VALUES)[number];
export type DeliveryMode = (typeof DELIVERY_MODE_VALUES)[number];

/** The legacy profile language preference is an explicit statement, so `prefer`. */
export const LEGACY_PREFERENCE_MODE: PreferenceMode = "prefer";

const normalise = (value: string) => value.trim().toLowerCase();

function cleanList(values: string[] | null | undefined): string[] {
  const out: string[] = [];
  for (const value of values ?? []) {
    const text = String(value ?? "").trim();
    if (text && !out.some((existing) => normalise(existing) === normalise(text))) out.push(text);
  }
  return out;
}

/**
 * Read a stored preference. An explicit mode is always honoured; a value
 * without a stored mode is migrated to `prefer` — NEVER silently to `must`,
 * because the student never confirmed it as a hard requirement.
 */
function readSetting<Value>(
  raw: PreferenceSetting<Value> | null | undefined,
  clean: (value: Value) => Value | null
): PreferenceSetting<Value> {
  if (!raw) return { mode: "no_preference", value: null };
  const value = raw.value == null ? null : clean(raw.value);
  if (raw.mode === "must" || raw.mode === "prefer" || raw.mode === "no_preference") {
    return { mode: raw.mode, value: raw.mode === "no_preference" ? null : value };
  }
  // Migrated legacy value: the mode was never stored, so it is not a confirmed
  // filter. `prefer` records it without inventing a hard requirement.
  return { mode: value == null ? "no_preference" : LEGACY_PREFERENCE_MODE, value };
}

/**
 * Build the canonical preference set.
 *
 * `profiles.preferred_countries` and `profiles.language_pref` are the existing
 * stored columns. They carry no mode, so they migrate to `prefer` unless the
 * student has since confirmed a mode in `preferenceSource`.
 */
export function resolvePreferenceSet(input: {
  preferences?: PreferenceSourceWithLanguage | null;
  legacyPreferredCountries?: string[] | null;
  legacyTeachingLanguage?: string[] | null;
  /** `profiles.study_interests` + `target_major` — an interest, not a filter. */
  legacyInterests?: string[] | null;
}): PreferenceSet {
  const source = input.preferences ?? {};
  const subject = readSetting(source.subject, (value) => {
    const list = cleanList(value);
    return list.length ? list : null;
  });
  const country = readSetting(source.country, (value) => {
    const list = cleanList(value);
    return list.length ? list : null;
  });
  const teachingLanguage = readSetting(source.teaching_language, (value) => {
    const list = cleanList(value);
    return list.length ? list : null;
  });
  const studyLoad = readSetting(source.study_load, (value) => {
    const list = cleanList(value).filter((item) => (STUDY_LOAD_VALUES as readonly string[]).includes(normalise(item)));
    return list.length ? list.map(normalise) : null;
  });
  const deliveryMode = readSetting(source.delivery_mode, (value) => {
    const list = cleanList(value).filter((item) => (DELIVERY_MODE_VALUES as readonly string[]).includes(normalise(item)));
    return list.length ? list.map(normalise) : null;
  });

  const legacyCountries = cleanList(input.legacyPreferredCountries);
  const effectiveCountry: PreferenceSetting<string[]> =
    country.mode === "no_preference" && !source.country && legacyCountries.length
      ? { mode: LEGACY_PREFERENCE_MODE, value: legacyCountries }
      : country;

  const legacyLanguage = cleanList(input.legacyTeachingLanguage);
  const effectiveLanguage: PreferenceSetting<string[]> =
    teachingLanguage.mode === "no_preference" && !source.teaching_language && legacyLanguage.length
      ? { mode: LEGACY_PREFERENCE_MODE, value: legacyLanguage }
      : teachingLanguage;

  // A stored study interest / target major is what the student is LOOKING FOR,
  // so it becomes a `prefer` subject preference. It is never a `must`: the
  // student never confirmed that a subject mismatch disqualifies a programme.
  const legacyInterests = cleanList(input.legacyInterests);
  const effectiveSubject: PreferenceSetting<string[]> =
    subject.mode === "no_preference" && !source.subject && legacyInterests.length
      ? { mode: LEGACY_PREFERENCE_MODE, value: legacyInterests }
      : subject;

  return {
    subject: effectiveSubject,
    country: effectiveCountry,
    teaching_language: effectiveLanguage,
    study_load: studyLoad,
    delivery_mode: deliveryMode,
    acceptedSubjectEquivalents: cleanList(source.acceptedSubjectEquivalents),
    languageAbility: input.preferences?.languageAbility ?? null,
    languageCertificates: input.preferences?.languageCertificates ?? null,
  };
}

/** A value on one axis: `known` similarity, `unknown`, or not applicable. */
export type AxisObservation =
  | { state: "known"; similarity: number; note?: string }
  | { state: "unknown"; reason: string }
  | { state: "not_applicable" };

export const unknownAxis = (reason: string): AxisObservation => ({ state: "unknown", reason });
export const knownAxis = (similarity: number, note?: string): AxisObservation => ({
  state: "known",
  similarity: clamp(similarity, 0, 1),
  note,
});

export interface PreferenceAxisBreakdown {
  axis: PreferenceAxis;
  mode: PreferenceMode;
  /** Weight used in the arithmetic. 0 for a `must` or `no_preference` axis. */
  weight: number;
  similarity: number | null;
  contribution: number;
  state: "known" | "unknown" | "not_applicable";
  note: string | null;
}

export type PreferenceFilterState = "pass" | "fail" | "unknown";

export interface PreferenceFilterResult {
  axis: PreferenceAxis;
  state: PreferenceFilterState;
  reason: string;
  /** Not a filter failure — reported separately from eligibility. */
  isPreferenceFilter: true;
}

export type FitReasonCode =
  | "no_active_preferences"
  | "no_known_preference_data"
  | "subject_unknown_no_point_fit"
  | "complete";

export interface PreferenceFit {
  scoringVersion: string;
  settingsVersion: string;
  /** True when at least one `prefer` axis has weight. */
  hasActivePreferences: boolean;
  totalWeight: number;
  knownWeight: number;
  weightedSimilarity: number;
  unknownWeight: number;
  /** Null when no known factor exists (K = 0) or nothing is active (T = 0). */
  knownFit: number | null;
  /** Null when nothing is active (T = 0). */
  coverage: number | null;
  /** Null when nothing is active (T = 0). */
  lowerBound: number | null;
  /** Null when nothing is active (T = 0). */
  upperBound: number | null;
  /** The headline point score the UI may print. Null unless every factor is known. */
  pointFit: number | null;
  reason: FitReasonCode;
  /** Which axes contributed no data (so the UI can say what is missing). */
  missingAxes: PreferenceAxis[];
  breakdown: PreferenceAxisBreakdown[];
  filters: PreferenceFilterResult[];
  /** Versioned product settings note — never a statistical-model claim. */
  basis: string;
}

const SAFE = (value: number) => Number.isFinite(value);

/**
 * Compute the preference fit.
 *
 * `observed` holds one observation per axis. A `must` axis is evaluated as a
 * filter; a `prefer` axis contributes to the weights; `no_preference` is out.
 */
export function computePreferenceFit(
  preferences: PreferenceSet,
  observed: Partial<Record<PreferenceAxis, AxisObservation>>
): PreferenceFit {
  const breakdown: PreferenceAxisBreakdown[] = [];
  const filters: PreferenceFilterResult[] = [];
  let totalWeight = 0;
  let knownWeight = 0;
  let weightedSimilarity = 0;
  let subjectUnknownActive = false;

  for (const axis of PREFERENCE_AXES) {
    const setting = preferences[axis] as PreferenceSetting<unknown> | undefined;
    const mode: PreferenceMode = setting?.mode ?? "no_preference";
    const observation = observed[axis] ?? { state: "not_applicable" as const };

    if (mode === "must") {
      // A must is a FILTER only: weight 0 keeps the arithmetic free of
      // double counting. A missing value stays unknown — never a mismatch.
      // A `must` is a yes/no statement: "matches one of the values I require".
      // Anything below a full match fails; missing data is unknown, never fail.
      const state: PreferenceFilterState =
        observation.state === "known" ? (observation.similarity >= 1 ? "pass" : "fail") : "unknown";
      filters.push({
        axis,
        state,
        reason:
          state === "pass"
            ? "matches_requirement"
            : state === "fail"
              ? observation.state === "known" && observation.similarity > 0
                ? "partial_match_not_a_confirmed_match"
                : "does_not_match_requirement"
              : observation.state === "unknown"
                ? observation.reason
                : "requirement_value_not_established",
        isPreferenceFilter: true,
      });
      breakdown.push({
        axis,
        mode,
        weight: 0,
        similarity: observation.state === "known" ? observation.similarity : null,
        contribution: 0,
        state: observation.state === "known" ? "known" : observation.state === "unknown" ? "unknown" : "not_applicable",
        note: "Filter only — not part of the weighted fit.",
      });
      continue;
    }

    if (mode === "no_preference") {
      breakdown.push({
        axis,
        mode,
        weight: 0,
        similarity: null,
        contribution: 0,
        state: "not_applicable",
        note: "Excluded from the fit — the student stated no preference on this axis.",
      });
      continue;
    }

    // mode === "prefer"
    const weight = PREFERENCE_WEIGHTS[axis];
    totalWeight += weight;
    if (observation.state === "known") {
      const similarity = clamp(observation.similarity, 0, 1);
      knownWeight += weight;
      weightedSimilarity += weight * similarity;
      breakdown.push({
        axis,
        mode,
        weight,
        similarity,
        contribution: weight * similarity,
        state: "known",
        note: observation.note ?? null,
      });
    } else if (observation.state === "unknown") {
      if (axis === "subject") subjectUnknownActive = true;
      breakdown.push({
        axis,
        mode,
        weight,
        similarity: null,
        contribution: 0,
        state: "unknown",
        note: observation.reason,
      });
    } else {
      // No programme value to compare with → no data on this factor.
      if (axis === "subject") subjectUnknownActive = true;
      breakdown.push({
        axis,
        mode,
        weight,
        similarity: null,
        contribution: 0,
        state: "unknown",
        note: "unknown_programme_value",
      });
    }
  }

  const missingAxes = breakdown
    .filter((item) => item.mode === "prefer" && item.state === "unknown")
    .map((item) => item.axis);

  const hasActivePreferences = totalWeight > 0;
  const knownFit = hasActivePreferences && knownWeight > 0 ? (100 * weightedSimilarity) / knownWeight : null;
  const coverage = hasActivePreferences ? (100 * knownWeight) / totalWeight : null;
  const lowerBound = hasActivePreferences ? (100 * weightedSimilarity) / totalWeight : null;
  const unknownWeight = totalWeight - knownWeight;
  const upperBound = hasActivePreferences ? (100 * (weightedSimilarity + unknownWeight)) / totalWeight : null;

  if (!hasActivePreferences) {
    return {
      scoringVersion: preferencesVersionStamp(),
      settingsVersion: PREFERENCE_SETTINGS_VERSION,
      hasActivePreferences: false,
      totalWeight: 0,
      knownWeight: 0,
      weightedSimilarity: 0,
      unknownWeight: 0,
      knownFit: null,
      coverage: null,
      lowerBound: null,
      upperBound: null,
      pointFit: null,
      reason: "no_active_preferences",
      missingAxes: [],
      breakdown,
      filters,
      basis:
        "No active weighted preference: the student chose no preference (or a filter) on every axis, " +
        "so there is nothing to rank by. This is not a zero fit.",
    };
  }

  const safeValues = [knownFit, coverage, lowerBound, upperBound].every(
    (value) => value == null || SAFE(value)
  );
  if (!safeValues) {
    // Defensive: a non-finite value must never surface. Report no score instead.
    return {
      scoringVersion: preferencesVersionStamp(),
      settingsVersion: PREFERENCE_SETTINGS_VERSION,
      hasActivePreferences: true,
      totalWeight,
      knownWeight,
      weightedSimilarity,
      unknownWeight,
      knownFit: null,
      coverage: null,
      lowerBound: null,
      upperBound: null,
      pointFit: null,
      reason: "no_known_preference_data",
      missingAxes,
      breakdown,
      filters,
      basis: "The preference arithmetic produced a non-finite value; no fit is reported.",
    };
  }

  // The point score exists only when EVERY active weighted factor is known AND
  // the subject factor is not silently missing (spec §4: an active but unknown
  // subject must not produce a point fit).
  const complete = unknownWeight === 0 && !subjectUnknownActive;
  const reason: FitReasonCode = complete
    ? "complete"
    : subjectUnknownActive && knownWeight === 0
      ? "no_known_preference_data"
      : subjectUnknownActive
        ? "subject_unknown_no_point_fit"
        : knownWeight > 0
          ? "complete"
          : "no_known_preference_data";
  const pointFit = complete ? knownFit : null;

  return {
    scoringVersion: preferencesVersionStamp(),
    settingsVersion: PREFERENCE_SETTINGS_VERSION,
    hasActivePreferences: true,
    totalWeight,
    knownWeight,
    weightedSimilarity,
    unknownWeight,
    knownFit,
    coverage,
    lowerBound,
    upperBound,
    pointFit,
    reason,
    missingAxes,
    breakdown,
    filters,
    basis:
      "Weighted product settings (subject 60, country 15, teaching language 15, study load 5, delivery mode 5). " +
      "The interval shows what the missing factors could change; it is not a statistical confidence interval, " +
      "and coverage is data coverage, not accuracy.",
  };
}

/** One stamp for every result built from this module. */
function preferencesVersionStamp() {
  return SCORING_VERSION;
}

/**
 * Classify an ordered list of preferences against a programme value on one axis.
 * `similarity` is 1 when any accepted value matches.
 */
export function listPreferenceSimilarity(
  wanted: string[] | null | undefined,
  actual: string | null | undefined,
  equals: (a: string, b: string) => boolean
): AxisObservation {
  const wantedList = cleanList(wanted);
  const actualText = (actual ?? "").trim();
  if (!wantedList.length) return { state: "not_applicable" };
  if (!actualText) return unknownAxis("unknown_programme_value");
  return wantedList.some((value) => equals(value, actualText))
    ? knownAxis(1, "matches_one_of_the_accepted_values")
    : knownAxis(0, "does_not_match_the_accepted_values");
}
