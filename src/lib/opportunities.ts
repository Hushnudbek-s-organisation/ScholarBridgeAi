/**
 * #26/#27/#28 — Personalized opportunities matcher.
 *
 * Scores a curated catalog entry (competition / research / internship /
 * summer school) against a student profile. Deterministic and pure.
 *
 * Signal weights (sum = 100): field 40 · country 20 · level 20 · deadline 10.
 *
 * Honesty rules:
 *  - a recurring/unknown deadline scores a neutral 5 and is flagged — we do
 *    not guess a date
 *  - a level mismatch is a small penalty with a reason, not a hidden 0
 *    (a strong student may still apply out of level)
 *  - `now` is an explicit parameter so tests are reproducible
 */

import { majorSimilarity } from "./chancing";
import { subjectSimilarity } from "./subjectAffinity";
import type { OpportunityNote, OpportunityNoteCode } from "./opportunityNotes";

export type OpportunityType = "competition" | "research" | "internship" | "summer_school";
export type OpportunityLevel = "high_school" | "undergrad" | "grad" | "phd" | "any";

export interface OpportunityInput {
  id: number;
  type: OpportunityType | string;
  title: string;
  provider?: string | null;
  country?: string | null; // null = international
  fields?: string | null; // JSON list column
  level?: OpportunityLevel | string | null;
  deadlineDate?: string | null; // yyyy-mm-dd or null
  url?: string | null;
}

export interface OpportunityProfile {
  major?: string | null;
  country?: string | null;
  degreeLevel?: string | null; // Bachelor | Master | PhD
}

export interface OpportunityMatch {
  match: number; // 0–100
  /** English sentences — the API keeps these unchanged for existing consumers. */
  reasons: string[];
  flags: string[];
  /**
   * The same reasons and flags as code + parameters, so a UI can render them in
   * the reader's language. `reasons` and `flags` are derived from this list, in
   * order; nothing is emitted one way only.
   */
  notes: OpportunityNote[];
}

const TYPE_LABEL: Record<string, string> = {
  competition: "competition",
  research: "research",
  internship: "internship",
  summer_school: "summer school",
};

function parseFields(raw: string | null | undefined): string[] {
  if (!raw) return [];
  try {
    const v = JSON.parse(raw);
    return Array.isArray(v) ? v.filter((x) => typeof x === "string" && x.trim()) : [];
  } catch {
    return [];
  }
}

function levelMatches(level: string | null | undefined, degreeLevel: string | null | undefined): boolean {
  const l = (level ?? "any").toLowerCase();
  if (l === "any" || !l) return true;
  const d = (degreeLevel ?? "").trim().toLowerCase();
  switch (l) {
    case "high_school":
      return d === "" || d === "bachelor";
    case "undergrad":
      return d === "bachelor";
    case "grad":
      return d === "master" || d === "phd";
    case "phd":
      return d === "phd";
    default:
      return true;
  }
}

const DAY_MS = 86_400_000;

/** Score one opportunity for one profile. `now` defaults to the real clock. */
export function scoreOpportunity(
  opp: OpportunityInput,
  profile: OpportunityProfile,
  now: Date = new Date()
): OpportunityMatch {
  const reasons: string[] = [];
  const flags: string[] = [];
  const notes: OpportunityNote[] = [];
  /** Record one note: the English sentence (the API's contract) and its code. */
  const reason = (text: string, code: OpportunityNoteCode, params?: Record<string, string>) => {
    reasons.push(text);
    notes.push({ kind: "reason", code, params });
  };
  const flag = (text: string, code: OpportunityNoteCode, params?: Record<string, string>) => {
    flags.push(text);
    notes.push({ kind: "flag", code, params });
  };
  let match = 0;

  // 1. Field (0–40).
  const fields = parseFields(opp.fields).filter((f) => f.trim().toLowerCase() !== "all");
  if (!fields.length) {
    match += 25;
    reason("open to all fields", "field_all");
  } else if (profile.major?.trim()) {
    // Field relatedness uses the app-wide synonym-aware matcher; the plain
    // word-overlap value is kept as a floor so a genuine overlap is never
    // scored lower than before.
    const best = Math.max(
      ...fields.map((f) => Math.max(majorSimilarity(profile.major, f), subjectSimilarity(profile.major, f)))
    );
    if (best >= 0.5) {
      match += Math.round(best * 40);
      reason(`field match: ${profile.major}`, "field_match", { major: profile.major });
    } else {
      flag(`listed fields: ${fields.join(", ")} — outside your major`, "field_outside", {
        fields: fields.join(", "),
      });
    }
  } else {
    match += 10;
    flag("your major is not set in the profile", "field_unknown");
  }

  // 2. Country (0–20).
  const country = (opp.country ?? "").trim();
  if (!country) {
    match += 15;
    reason("international — open to all countries", "country_all");
  } else if (profile.country?.trim() && country.toLowerCase() === profile.country.trim().toLowerCase()) {
    match += 20;
    reason(`home country: ${country}`, "country_home", { country });
  } else {
    flag(`limited to ${country}`, "country_limited", { country });
  }

  // 3. Level (0–20).
  const level = (opp.level ?? "any").toLowerCase();
  if (levelMatches(level, profile.degreeLevel)) {
    match += 20;
  } else {
    match += 5;
    flag(
      `aimed at ${TYPE_LABEL[level] ? level : level} level, you are ${profile.degreeLevel ?? "level unknown"}`,
      "level_mismatch",
      { wanted: level, actual: profile.degreeLevel?.trim() ? profile.degreeLevel : "level unknown" }
    );
  }

  // 4. Deadline (0–10). Unknown/recurring is a neutral 5, never a failure
  // and never a guessed date.
  if (!opp.deadlineDate) {
    match += 5;
    flag("recurring or date not published — check the official page", "deadline_recurring");
  } else {
    const d = new Date(`${opp.deadlineDate}T00:00:00Z`);
    const daysLeft = Number.isNaN(d.getTime())
      ? null
      : (Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()) -
          Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate())) /
        DAY_MS;
    if (daysLeft === null) {
      match += 5;
      flag("deadline date is not valid — check the official page", "deadline_invalid");
    } else if (daysLeft < 0) {
      // Phase V's rule: the closing day belongs to the applicant. A date-only
      // value is midnight UTC, so `d < now` called an opportunity closed at
      // 00:00:01 on the day it could still be entered.
      flag("deadline has passed", "deadline_passed");
    } else {
      match += 10;
      reason(`deadline ${opp.deadlineDate}`, "deadline_set", { date: opp.deadlineDate });
    }
  }

  return {
    match: Math.min(100, Math.max(0, Math.round(match))),
    reasons,
    flags,
    notes,
  };
}

/** Rank the whole catalog for one profile, best first (id tie-break). */
export function rankOpportunities(
  opps: OpportunityInput[],
  profile: OpportunityProfile,
  now: Date = new Date()
): (OpportunityMatch & { opportunity: OpportunityInput })[] {
  return opps
    .map((opp) => ({ opportunity: opp, ...scoreOpportunity(opp, profile, now) }))
    .sort((a, b) => b.match - a.match || a.opportunity.id - b.opportunity.id);
}

/**
 * Deterministically merge already-filtered lexical matches with a bounded
 * semantic top-k. Weights are explicit: 35% lexical hit, 55% cosine similarity
 * (negative similarity floors at zero), 10% existing profile match. With no
 * semantic scores the exact lexical/profile ordering is left untouched.
 */
export function mergeOpportunitySearchOrder<T extends { id: number; match: number | null }>(
  candidates: T[],
  lexicalIds: ReadonlySet<number>,
  semantic: readonly { id: number; similarity: number }[],
  semanticLimit = 10,
): T[] {
  if (semantic.length === 0) return candidates.filter((item) => lexicalIds.has(item.id));
  const semanticScores = new Map(semantic.slice(0, Math.max(1, Math.min(semanticLimit, 63))).map(({ id, similarity }) => [id, Math.max(0, Math.min(1, similarity))]));
  return candidates
    .filter((item) => lexicalIds.has(item.id) || semanticScores.has(item.id))
    .sort((a, b) => {
      const score = (item: T) =>
        0.35 * Number(lexicalIds.has(item.id)) +
        0.55 * (semanticScores.get(item.id) ?? 0) +
        0.10 * ((item.match ?? 0) / 100);
      return score(b) - score(a) ||
        Number(lexicalIds.has(b.id)) - Number(lexicalIds.has(a.id)) ||
        (b.match ?? -1) - (a.match ?? -1) || a.id - b.id;
    });
}

/** "NEW FOR YOU" counts by type across the catalog. */
export function countByType(opps: OpportunityInput[]): Record<string, number> {
  const out: Record<string, number> = { competition: 0, research: 0, internship: 0, summer_school: 0 };
  for (const o of opps) out[o.type] = (out[o.type] ?? 0) + 1;
  return out;
}
