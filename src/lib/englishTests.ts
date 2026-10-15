/**
 * Cross-test English proficiency comparison — ONE module.
 *
 * WHY THIS EXISTS
 * ---------------
 * Universities publish an IELTS floor; students in Uzbekistan and Central Asia
 * very often sit TOEFL iBT or Duolingo instead. The product used to convert a
 * TOEFL total with the linear rule `(t − 40) / 12`, which is not a conversion
 * at all: a PERFECT 120/120 TOEFL turned into IELTS 6.67 and "failed" every
 * 7.0 / 7.5 scholarship, while a strong TOEFL 100 turned into 5.0.
 *
 * The mapping below is the ETS-published TOEFL iBT ↔ IELTS Academic
 * concordance table. It is a COMPARISON AID, not a requirement: universities
 * set their own accepted tests and cut-offs, so every consumer of this module
 * must present the result as approximate and point the student at the
 * programme's official English-language policy.
 *
 * Deterministic, dependency-free, asserted in `scripts/check-essay-adapter.ts`
 * and `scripts/check-match.ts`.
 */

export type EnglishTestKind = "ielts" | "toefl" | "duolingo" | "pte" | "cambridge";

/** IELTS Academic band ↔ TOEFL iBT total score, per the published concordance. */
export const TOEFL_IELTS_CONCORDANCE: readonly { ielts: number; minToefl: number; maxToefl: number }[] = [
  { ielts: 9, minToefl: 118, maxToefl: 120 },
  { ielts: 8.5, minToefl: 115, maxToefl: 117 },
  { ielts: 8, minToefl: 110, maxToefl: 114 },
  { ielts: 7.5, minToefl: 102, maxToefl: 109 },
  { ielts: 7, minToefl: 94, maxToefl: 101 },
  { ielts: 6.5, minToefl: 79, maxToefl: 93 },
  { ielts: 6, minToefl: 60, maxToefl: 78 },
  { ielts: 5.5, minToefl: 46, maxToefl: 59 },
  { ielts: 5, minToefl: 35, maxToefl: 45 },
  { ielts: 4.5, minToefl: 32, maxToefl: 34 },
  { ielts: 4, minToefl: 0, maxToefl: 31 },
];

/**
 * TOEFL iBT total → IELTS Academic band, using the concordance table.
 * Out-of-range or missing values are `null` (unknown), never clamped to a
 * passing band.
 */
export function toeflToIeltsEquivalent(toefl: number | null | undefined): number | null {
  const t = Number(toefl);
  if (!Number.isFinite(t) || t <= 0 || t > 120) return null;
  const row = TOEFL_IELTS_CONCORDANCE.find((r) => t >= r.minToefl && t <= r.maxToefl);
  return row ? row.ielts : null;
}

/** The inverse direction, for messaging ("this bar is about TOEFL 94"). */
export function ieltsToToeflEquivalent(ielts: number | null | undefined): number | null {
  const b = Number(ielts);
  if (!Number.isFinite(b) || b <= 0 || b > 9) return null;
  const row = TOEFL_IELTS_CONCORDANCE.find((r) => r.ielts === b);
  // The floor of the band is the conservative, checkable number to quote.
  return row ? row.minToefl : null;
}

export interface EnglishTestProfileLike {
  ieltsScore?: number | null;
  toeflScore?: number | null;
  duolingoScore?: number | null;
}

export interface RecordedEnglishTest {
  kind: EnglishTestKind;
  /** The score exactly as the student recorded it — never rewritten. */
  score: number;
  /** IELTS-equivalent band when an official concordance exists, else null. */
  ieltsEquivalent: number | null;
  /** True when the equivalence comes from a published concordance table. */
  approximated: boolean;
}

/**
 * The student's English evidence, in preference order.
 *
 * IELTS is returned as itself (no conversion needed). TOEFL is returned with
 * its concordance band flagged `approximated: true`. Duolingo is returned with
 * `ieltsEquivalent: null`: the DET provider publishes its own comparisons and
 * universities accept it independently, so converting it into an IELTS band
 * here would invent a rule the student cannot verify.
 */
export function recordedEnglishTest(profile: EnglishTestProfileLike | null | undefined): RecordedEnglishTest | null {
  if (!profile) return null;
  const ielts = Number(profile.ieltsScore);
  if (Number.isFinite(ielts) && ielts > 0) {
    return { kind: "ielts", score: ielts, ieltsEquivalent: ielts, approximated: false };
  }
  const toefl = Number(profile.toeflScore);
  if (Number.isFinite(toefl) && toefl > 0) {
    return { kind: "toefl", score: toefl, ieltsEquivalent: toeflToIeltsEquivalent(toefl), approximated: true };
  }
  const det = Number(profile.duolingoScore);
  if (Number.isFinite(det) && det > 0) {
    return { kind: "duolingo", score: det, ieltsEquivalent: null, approximated: true };
  }
  return null;
}

/** Stable, human-readable test name for messages (never localised strings here). */
export function englishTestLabel(kind: EnglishTestKind, score: number): string {
  switch (kind) {
    case "ielts":
      return `IELTS ${score}`;
    case "toefl":
      return `TOEFL iBT ${score}`;
    case "duolingo":
      return `Duolingo English Test ${score}`;
    case "pte":
      return `PTE Academic ${score}`;
    case "cambridge":
      return `Cambridge English ${score}`;
  }
}

/**
 * The caveat every consumer must show next to a converted score.
 * Kept in one place so the UI cannot soften it.
 */
export const ENGLISH_CONCORDANCE_CAVEAT =
  "Converted with the published TOEFL iBT ↔ IELTS Academic concordance. Universities set their own accepted tests and cut-offs, so confirm the programme's current English-language policy before relying on this.";
