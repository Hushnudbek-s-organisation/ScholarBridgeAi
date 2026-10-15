/**
 * GPA normalisation — ONE implementation, shared by the discovery matcher
 * (`src/lib/matching.ts`) and the subject-to-program recommender
 * (`src/lib/recommend.ts`).
 *
 * HONESTY RULE (matches the recommender's policy):
 *   • an explicit scale (4, 5, 100, …) → convert proportionally to 4.0;
 *   • no scale + value ≤ 4 → already on a 4.0 scale, safe to compare;
 *   • no scale + value > 4 (e.g. 85 on an unknown 100-point scale) → null
 *     ("unknown"). It is NEVER clamped to a perfect 4.0 and never treated as
 *     a failed requirement — the caller simply cannot compare it.
 */
export function gpaTo40Scale(
  gpa: number | null | undefined,
  scale: number | null | undefined
): number | null {
  const g = Number(gpa);
  if (!Number.isFinite(g) || g <= 0) return null;
  if (scale == null) {
    // No scale given: only a 4.0-scale GPA is safe to compare directly.
    // We cannot assume, so treat as unknown unless it is clearly ≤ 4.
    return g <= 4 ? g : null;
  }
  const s = Number(scale);
  if (!Number.isFinite(s) || s <= 0) return null;
  if (s === 4) return Math.min(4, g);
  // Percentage / 5.0 / other scales: convert proportionally.
  return Math.min(4, (g / s) * 4);
}

/* ==========================================================================
 * Uzbekistan & Central Asia grade conversion (Pillar 5.3)
 *
 * Deterministic tables with the explanations a counsellor would give:
 *  - the 5-point scale (school shahodatnoma, academic lyceum, university
 *    reyting daftarchasi) has TWO readings — a proportional ratio and the
 *    letter-grade mapping international offices usually apply (5 = A = 4.0,
 *    4 = B = 3.0, 3 = C = 2.0);
 *  - the 100-point university rating system bands 86–100 / 71–85 / 55–70.
 * Both readings are returned; the caller shows them side by side instead of
 * silently picking one, and the WES/ECTS hints make the difference explicit.
 * ========================================================================== */

export type UzbekGradeScale = "five" | "hundred";

export interface UzbekGradeConversion {
  /** The value as entered (5-point band or 100-point score). */
  input: number;
  scale: UzbekGradeScale;
  /** Proportional reading: (gpa / scale) * 4, rounded to 2 decimals. */
  proportionalUs: number | null;
  /** Letter-grade reading used by most international offices. */
  letterUs: number | null;
  letter: "A" | "B" | "C" | "F" | null;
  /** ECTS-style equivalence hint for the letter grade. */
  ects: string | null;
  /** Human-readable note key the UI localizes (`gradeConverter.note*`). */
  noteKey: "noteFive" | "noteHundred" | "noteUnknown";
}

const round2 = (n: number) => Math.round(n * 100) / 100;

/** 5-point scale → letter + US 4.0, using the standard institutional mapping. */
function letterForFive(value: number): { letter: "A" | "B" | "C" | "F" | null; us: number | null } {
  if (value >= 4.5) return { letter: "A", us: 4 };
  if (value >= 3.5) return { letter: "B", us: 3 };
  if (value >= 2.5) return { letter: "C", us: 2 };
  if (value >= 1) return { letter: "F", us: 0 };
  return { letter: null, us: null };
}

/** 100-point rating system → band → letter (86–100 = 5/A … 55–70 = 3/C). */
function letterForHundred(value: number): { letter: "A" | "B" | "C" | "F" | null; us: number | null } {
  if (value >= 86) return { letter: "A", us: 4 };
  if (value >= 71) return { letter: "B", us: 3 };
  if (value >= 55) return { letter: "C", us: 2 };
  if (value >= 1) return { letter: "F", us: 0 };
  return { letter: null, us: null };
}

const ECTS: Record<"A" | "B" | "C" | "F", string> = {
  A: "ECTS A",
  B: "ECTS B/C",
  C: "ECTS D/E",
  F: "ECTS F",
};

/**
 * Convert an Uzbek / Central Asian grade. Nothing is invented: an out-of-band
 * value returns nulls with `noteKey: "noteUnknown"` instead of being clamped.
 */
export function convertUzbekGradeToInternational(
  value: number | null | undefined,
  scale: UzbekGradeScale = "five"
): UzbekGradeConversion {
  const v = Number(value);
  const base: UzbekGradeConversion = {
    input: Number.isFinite(v) ? v : 0,
    scale,
    proportionalUs: null,
    letterUs: null,
    letter: null,
    ects: null,
    noteKey: "noteUnknown",
  };
  if (!Number.isFinite(v) || v <= 0) return base;

  if (scale === "five") {
    if (v > 5) return base; // a 100-point score typed into the 5-point field
    const { letter, us } = letterForFive(v);
    return {
      ...base,
      proportionalUs: round2((v / 5) * 4),
      letterUs: us,
      letter,
      ects: letter ? ECTS[letter] : null,
      noteKey: "noteFive",
    };
  }

  if (v > 100) return base;
  const { letter, us } = letterForHundred(v);
  return {
    ...base,
    proportionalUs: round2((v / 100) * 4),
    letterUs: us,
    letter,
    ects: letter ? ECTS[letter] : null,
    noteKey: "noteHundred",
  };
}
