/**
 * Stored preference reader/writer for `student_profiles.assessment_preferences`.
 *
 * WHY A PARSER AND NOT A CAST
 * ---------------------------
 * The column is JSONB written by clients. Every value must be validated before
 * it can influence an assessment:
 *   • `mode` is one of `must` / `prefer` / `no_preference`;
 *   • a value-less setting can only be `no_preference` (a `must` with no value
 *     would reject every programme);
 *   • `study_load` accepts full-time / part-time only, `delivery_mode` accepts
 *     campus / online / hybrid only — the two axes are never mixed;
 *   • lists are de-duplicated, trimmed and capped, so a stored payload cannot
 *     inflate the assessment with repeated values.
 *
 * A missing `mode` is migrated to `prefer` (the legacy behaviour), NEVER to
 * `must`: the student never confirmed a hard filter.
 *
 * Pure module — asserted in `scripts/check-assessment.ts`.
 */

import type { PreferenceMode, PreferenceSet } from "./assessment/preferences";
import { DELIVERY_MODE_VALUES, STUDY_LOAD_VALUES } from "./assessment/preferences";
import { PREFERENCE_SETTINGS_VERSION } from "./assessment/version";

export const STORED_PREFERENCE_VERSION = PREFERENCE_SETTINGS_VERSION;
/** Numeric schema version written into the payload (`version: 1`). */
export const STORED_PREFERENCE_SCHEMA = 1;

export interface StoredPreferenceSetting {
  mode: PreferenceMode;
  value: string[] | null;
}

export interface StoredAssessmentPreferences {
  version: number;
  subject?: StoredPreferenceSetting;
  country?: StoredPreferenceSetting;
  teaching_language?: StoredPreferenceSetting;
  study_load?: StoredPreferenceSetting;
  delivery_mode?: StoredPreferenceSetting;
  acceptedSubjectEquivalents?: string[];
}

const MAX_ITEMS = 40;
const MAX_TEXT = 120;

const isMode = (value: unknown): value is PreferenceMode =>
  value === "must" || value === "prefer" || value === "no_preference";

function cleanList(value: unknown, allowed?: readonly string[]): string[] {
  if (!Array.isArray(value)) return [];
  const out: string[] = [];
  for (const item of value) {
    if (typeof item !== "string") continue;
    const text = item.trim().slice(0, MAX_TEXT);
    if (!text) continue;
    const normalised = text.toLowerCase();
    if (allowed && !allowed.includes(normalised)) continue;
    if (out.some((existing) => existing.toLowerCase() === normalised)) continue;
    out.push(allowed ? normalised : text);
    if (out.length >= MAX_ITEMS) break;
  }
  return out;
}

function readSetting(
  raw: unknown,
  allowed?: readonly string[]
): StoredPreferenceSetting | undefined {
  if (raw == null || typeof raw !== "object" || Array.isArray(raw)) return undefined;
  const record = raw as Record<string, unknown>;
  const value = cleanList(record.value, allowed);
  // A stored mode is honoured only when it is one of the three known modes.
  const mode: PreferenceMode = isMode(record.mode) ? record.mode : value.length ? "prefer" : "no_preference";
  if (mode !== "no_preference" && !value.length) {
    // A `must`/`prefer` with no value would be meaningless (and a `must` with no
    // value would reject everything), so it degrades to "no preference".
    return { mode: "no_preference", value: null };
  }
  return { mode, value: mode === "no_preference" ? null : value };
}

/** Parse a stored JSON value (object or JSON string). Never throws. */
export function parseAssessmentPreferences(raw: unknown): StoredAssessmentPreferences | null {
  let value: unknown = raw;
  if (typeof raw === "string") {
    if (!raw.trim()) return null;
    try {
      value = JSON.parse(raw);
    } catch {
      return null;
    }
  }
  if (value == null || typeof value !== "object" || Array.isArray(value)) return null;
  const record = value as Record<string, unknown>;
  const stored: StoredAssessmentPreferences = {
    version:
      typeof record.version === "number" && Number.isFinite(record.version)
        ? record.version
        : STORED_PREFERENCE_SCHEMA,
  };
  const subject = readSetting(record.subject);
  const country = readSetting(record.country);
  const teachingLanguage = readSetting(record.teaching_language);
  const studyLoad = readSetting(record.study_load, STUDY_LOAD_VALUES);
  const deliveryMode = readSetting(record.delivery_mode, DELIVERY_MODE_VALUES);
  if (subject) stored.subject = subject;
  if (country) stored.country = country;
  if (teachingLanguage) stored.teaching_language = teachingLanguage;
  if (studyLoad) stored.study_load = studyLoad;
  if (deliveryMode) stored.delivery_mode = deliveryMode;
  const equivalents = cleanList(record.acceptedSubjectEquivalents);
  if (equivalents.length) stored.acceptedSubjectEquivalents = equivalents;
  return stored;
}

/**
 * Normalise a client payload before it is written. Returns null when the body
 * carries nothing to store (the column then stays NULL, so the legacy reader
 * migration still applies).
 */
export function normalizeAssessmentPreferencesForWrite(raw: unknown): StoredAssessmentPreferences | null {
  return parseAssessmentPreferences(raw);
}

/** The stored object as the canonical engine's preference source. */
export function storedPreferencesToSource(stored: StoredAssessmentPreferences | null | undefined): {
  subject?: StoredPreferenceSetting;
  country?: StoredPreferenceSetting;
  teaching_language?: StoredPreferenceSetting;
  study_load?: StoredPreferenceSetting;
  delivery_mode?: StoredPreferenceSetting;
  acceptedSubjectEquivalents?: string[];
} | null {
  if (!stored) return null;
  return {
    subject: stored.subject,
    country: stored.country,
    teaching_language: stored.teaching_language,
    study_load: stored.study_load,
    delivery_mode: stored.delivery_mode,
    acceptedSubjectEquivalents: stored.acceptedSubjectEquivalents,
  };
}

/** Round-trip check used by the migration tests: the parser is idempotent. */
export function isCanonicalPreferenceSet(set: PreferenceSet): boolean {
  for (const axis of ["subject", "country", "teaching_language", "study_load", "delivery_mode"] as const) {
    const setting = set[axis];
    if (!setting) continue;
    if (setting.mode !== "no_preference" && (setting.value ?? []).length === 0) return false;
  }
  return true;
}
