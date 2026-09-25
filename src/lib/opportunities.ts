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
  reasons: string[];
  flags: string[];
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
  let match = 0;

  // 1. Field (0–40).
  const fields = parseFields(opp.fields).filter((f) => f.trim().toLowerCase() !== "all");
  if (!fields.length) {
    match += 25;
    reasons.push("open to all fields");
  } else if (profile.major?.trim()) {
    const best = Math.max(...fields.map((f) => majorSimilarity(profile.major, f)));
    if (best >= 0.5) {
      match += Math.round(best * 40);
      reasons.push(`field match: ${profile.major}`);
    } else {
      flags.push(`listed fields: ${fields.join(", ")} — outside your major`);
    }
  } else {
    match += 10;
    flags.push("your major is not set in the profile");
  }

  // 2. Country (0–20).
  const country = (opp.country ?? "").trim();
  if (!country) {
    match += 15;
    reasons.push("international — open to all countries");
  } else if (profile.country?.trim() && country.toLowerCase() === profile.country.trim().toLowerCase()) {
    match += 20;
    reasons.push(`home country: ${country}`);
  } else {
    flags.push(`limited to ${country}`);
  }

  // 3. Level (0–20).
  const level = (opp.level ?? "any").toLowerCase();
  if (levelMatches(level, profile.degreeLevel)) {
    match += 20;
  } else {
    match += 5;
    flags.push(`aimed at ${TYPE_LABEL[level] ? level : level} level, you are ${profile.degreeLevel ?? "level unknown"}`);
  }

  // 4. Deadline (0–10). Unknown/recurring is a neutral 5, never a failure
  // and never a guessed date.
  if (!opp.deadlineDate) {
    match += 5;
    flags.push("recurring or date not published — check the official page");
  } else {
    const d = new Date(`${opp.deadlineDate}T00:00:00Z`);
    if (Number.isNaN(d.getTime())) {
      match += 5;
      flags.push("deadline date is not valid — check the official page");
    } else if (d.getTime() < now.getTime() - DAY_MS) {
      flags.push("deadline has passed");
    } else {
      match += 10;
      reasons.push(`deadline ${opp.deadlineDate}`);
    }
  }

  return {
    match: Math.min(100, Math.max(0, Math.round(match))),
    reasons,
    flags,
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

/** "NEW FOR YOU" counts by type across the catalog. */
export function countByType(opps: OpportunityInput[]): Record<string, number> {
  const out: Record<string, number> = { competition: 0, research: 0, internship: 0, summer_school: 0 };
  for (const o of opps) out[o.type] = (out[o.type] ?? 0) + 1;
  return out;
}
