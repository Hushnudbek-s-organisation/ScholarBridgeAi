/**
 * "Imkoniyat" (chance) and "Moslik" (fit) — two different questions.
 *
 * The catalogue already answers *fit* (`calculateScholarshipMatch`: how well an
 * award suits this student's profile). What it did not answer is the narrower,
 * checkable question a student asks first: **do I meet the requirements this
 * award publishes?**
 *
 * That is what "chance" means here, and nothing more. It is NOT an admission
 * probability — `chancing.ts` states, and this module keeps, that ScholarBridge
 * does not calculate admission probability (`ADMISSION_PROBABILITY.available =
 * false`). Three states, each backed by a published gate:
 *
 *   • `meets`   — every comparable gate passes, and at least one was comparable;
 *   • `below`   — at least one published gate is missed;
 *   • `unknown` — nothing was comparable (the row publishes no numeric gate, or
 *                 the profile is silent). Unknown is never reported as a "no".
 *
 * Only gates the catalogue actually publishes are checked: the GPA floor, the
 * IELTS floor and the degree level. Nationality lists and English-alternative
 * tests are free text, and comparing them would mean guessing — so they are
 * left to the row's own wording, exactly as they are in the fit score.
 */
import { compareDegreeLevels } from "./degreeLevels";
import { gpaTo40Scale } from "./gpa";

export const CHANCE_BUCKETS = ["meets", "below", "unknown"] as const;
export type ChanceBucket = (typeof CHANCE_BUCKETS)[number];

export const FIT_BUCKETS = ["strong", "good", "low"] as const;
export type FitBucket = (typeof FIT_BUCKETS)[number];

export type GateState = "pass" | "fail" | "unknown";
export type GateKey = "gpa" | "english" | "degree";

export interface GateResult {
  gate: GateKey;
  state: GateState;
  /** What the award publishes, and what the profile holds (for the tooltip). */
  want?: number | string | null;
  have?: number | string | null;
}

export interface ChanceResult {
  bucket: ChanceBucket;
  gates: GateResult[];
  /** How many gates could actually be compared (0 → bucket `unknown`). */
  compared: number;
}

/** The profile fields these gates read. Everything is nullable: silence stays silence. */
export interface GateProfile {
  gpa?: number | null;
  gpaScale?: number | null;
  ieltsScore?: number | null;
  degreeLevel?: string | null;
}

/** The row fields these gates read. */
export interface GateScholarship {
  minGpa?: number | null;
  minIelts?: number | null;
  degreeLevels?: string | null;
}

/**
 * Check one award's published gates against a profile.
 *
 * A gate that the row does not publish is *absent* (not a pass): the count of
 * comparable gates is what decides between `meets` and `unknown`.
 */
export function evaluateChance(profile: GateProfile, scholarship: GateScholarship): ChanceResult {
  const gates: GateResult[] = [];

  // --- GPA floor ---------------------------------------------------------
  const minGpa = typeof scholarship.minGpa === "number" && scholarship.minGpa > 0 ? scholarship.minGpa : null;
  if (minGpa !== null) {
    const gpa = gpaTo40Scale(profile.gpa ?? null, profile.gpaScale ?? null);
    gates.push(
      gpa === null
        ? { gate: "gpa", state: "unknown", want: minGpa, have: null }
        : { gate: "gpa", state: gpa >= minGpa ? "pass" : "fail", want: minGpa, have: gpa }
    );
  }

  // --- IELTS floor -------------------------------------------------------
  const minIelts = typeof scholarship.minIelts === "number" && scholarship.minIelts > 0 ? scholarship.minIelts : null;
  if (minIelts !== null) {
    const ielts = typeof profile.ieltsScore === "number" && Number.isFinite(profile.ieltsScore) && profile.ieltsScore > 0
      ? profile.ieltsScore
      : null;
    gates.push(
      ielts === null
        ? { gate: "english", state: "unknown", want: minIelts, have: null }
        : { gate: "english", state: ielts >= minIelts ? "pass" : "fail", want: minIelts, have: ielts }
    );
  }

  // --- Degree level ------------------------------------------------------
  // `compareDegreeLevels` returns "unknown" for an unrecognised label on either
  // side; that is not a mismatch and must not be reported as one.
  if ((scholarship.degreeLevels ?? "").trim() !== "") {
    const level = compareDegreeLevels(profile.degreeLevel ?? null, scholarship.degreeLevels ?? null);
    if (level !== "unknown") {
      gates.push({
        gate: "degree",
        state: level === "match" ? "pass" : "fail",
        want: scholarship.degreeLevels ?? null,
        have: profile.degreeLevel ?? null,
      });
    } else if (profile.degreeLevel) {
      // The student's level is known but could not be compared with the row's.
      gates.push({ gate: "degree", state: "unknown", want: scholarship.degreeLevels ?? null, have: profile.degreeLevel });
    }
  }

  const compared = gates.filter((gate) => gate.state !== "unknown").length;
  const failed = gates.some((gate) => gate.state === "fail");
  const bucket: ChanceBucket = failed ? "below" : compared > 0 ? "meets" : "unknown";
  return { bucket, gates, compared };
}

/**
 * Fit bucket from the existing match score.
 *
 * Thresholds mirror the ones the catalogue already treats as meaningful:
 * `isEligible` is `matchScore >= 60`, so `good` starts there; `strong` is the
 * top of the observed range (base 65 + the GPA/English/degree/major/merit
 * bonuses ≈ 95–98).
 */
export function fitBucket(matchScore: number | null | undefined): FitBucket | null {
  if (typeof matchScore !== "number" || !Number.isFinite(matchScore)) return null;
  if (matchScore >= 80) return "strong";
  if (matchScore >= 60) return "good";
  return "low";
}
