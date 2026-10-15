/**
 * WHAT-IF SIMULATOR (Phase 2.3).
 *
 * "What happens to my saved universities if I reach IELTS 7.0 / GPA 4.5?" is
 * answered by RE-RUNNING the same deterministic requirement engine the
 * workspace uses and diffing its own verdicts — never by inventing a chance,
 * a probability or a reach/match/safety label.
 *
 * The only thing this module may say is:
 *   • this requirement item checked by the university moves not_met → met
 *     (or met → not_met when the student lowers a value), or
 *   • its state stays unknown, because the university publishes no number.
 *
 * Progress items (documents, essays, fees) are held constant between the two
 * runs, so they can never appear in the diff: the simulation only varies the
 * student's own academic numbers.
 */
import {
  buildRequirements,
  type ProgramRequirementFacts,
  type RequirementItem,
  type RequirementProfile,
  type RequirementUniversity,
  type StudentProgressFacts,
} from "@/lib/journey/requirements";

/** The requirement items the student's own numbers can change. */
export const SIMULATABLE_ITEM_KEYS: readonly string[] = [
  "academic.gpa",
  "english.ielts",
  "english.toefl",
  "testing.sat",
  "testing.duolingo",
];

export interface WhatIfChange {
  gpa?: number | null;
  gpaScale?: number | null;
  ieltsScore?: number | null;
  toeflScore?: number | null;
  satScore?: number | null;
  duolingoScore?: number | null;
}

export interface WhatIfFlip {
  universityId: number;
  universityName: string;
  itemKey: string;
  title: string;
  /** The engine's own comparison line, e.g. "Your 6.5 vs required 7.0". */
  detail: string | null;
}

export interface WhatIfResult {
  /** Requirement items that only need the simulated numbers to be satisfied. */
  unlocked: WhatIfFlip[];
  /** Items the simulated numbers would break (only possible when lowering). */
  broken: WhatIfFlip[];
  /** Requirements examined that do not change. */
  unchanged: number;
  /** Universities examined. */
  scanned: number;
  /** The change actually applied (nulls and unknown keys are dropped). */
  applied: WhatIfChange;
}

/** A change is only applied for the fields it actually sets. */
export function applyWhatIfChange(base: RequirementProfile, change: WhatIfChange): RequirementProfile {
  const out: RequirementProfile = { ...base };
  for (const key of Object.keys(change) as (keyof WhatIfChange)[]) {
    const value = change[key];
    if (value === null || value === undefined) continue;
    if (!Number.isFinite(Number(value))) continue;
    out[key] = Number(value);
  }
  return out;
}

/** Nothing is claimed about documents/essays: the diff is score items only. */
function progressStub(): StudentProgressFacts {
  return {
    hasDocument: () => false,
    hasEssay: () => false,
    recommendationSubmitted: 0,
    recommendationNeeded: 0,
    testPlanScore: () => null,
  };
}

function scoreItemsFor(
  university: RequirementUniversity,
  profile: RequirementProfile,
  program: ProgramRequirementFacts | null
): Map<string, RequirementItem> {
  const items = buildRequirements({
    university,
    profile,
    program,
    progress: progressStub(),
  });
  const map = new Map<string, RequirementItem>();
  for (const item of items) {
    if (SIMULATABLE_ITEM_KEYS.includes(item.itemKey)) map.set(item.itemKey, item);
  }
  return map;
}

/**
 * Diff the deterministic requirement verdicts before/after a hypothetical
 * change. Deterministic: same inputs ⇒ same diff, no randomness, no network.
 */
export function simulateScoreChange(input: {
  universities: RequirementUniversity[];
  profile: RequirementProfile;
  change: WhatIfChange;
  programs?: Record<number, ProgramRequirementFacts | null>;
}): WhatIfResult {
  const simulated = applyWhatIfChange(input.profile, input.change);
  const applied: WhatIfChange = {};
  for (const key of Object.keys(input.change) as (keyof WhatIfChange)[]) {
    const before = input.profile[key];
    const after = simulated[key];
    // Only report a field whose value actually changed.
    if (after !== undefined && after !== before) applied[key] = after;
  }

  const unlocked: WhatIfFlip[] = [];
  const broken: WhatIfFlip[] = [];
  let unchanged = 0;
  const universities = input.universities.slice(0, 60);

  for (const university of universities) {
    const program = input.programs?.[university.id] ?? null;
    const before = scoreItemsFor(university, input.profile, program);
    const after = scoreItemsFor(university, simulated, program);
    for (const itemKey of SIMULATABLE_ITEM_KEYS) {
      const b = before.get(itemKey);
      const a = after.get(itemKey);
      if (!b || !a) continue;
      if (b.state !== "met" && a.state === "met") {
        unlocked.push({
          universityId: university.id,
          universityName: university.name,
          itemKey,
          title: a.title,
          detail: a.detail ?? null,
        });
      } else if (b.state === "met" && a.state !== "met") {
        broken.push({
          universityId: university.id,
          universityName: university.name,
          itemKey,
          title: b.title,
          detail: b.detail ?? null,
        });
      } else {
        unchanged += 1;
      }
    }
  }

  return { unlocked, broken, unchanged, scanned: universities.length, applied };
}
