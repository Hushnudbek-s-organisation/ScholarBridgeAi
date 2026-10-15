/**
 * Admission-outcome flywheel rewards (spec §5.5).
 *
 * WHY THE MAPPING IS WHAT IT IS
 * -----------------------------
 * The flywheel needs one input it cannot compute: what actually happened. It
 * only exists if students record their real decisions, so recording one is
 * rewarded. Three rules keep that from becoming a dark pattern:
 *
 *   1. Every result pays the SAME points. An offer, a rejection and a
 *      waitlist are equally valuable as *data* — paying more for an acceptance
 *      would (a) reward luck, (b) make a rejection feel like a punishment and
 *      (c) skew the community sample towards success stories, which is exactly
 *      the bias that makes "am I good enough?" advice useless.
 *   2. A withdrawal is not a decision and earns nothing.
 *   3. Points are paid once per application. A second record for the same
 *      application (a correction, an appeal outcome) updates the record but is
 *      not a new contribution, so it cannot be farmed.
 *
 * The numbers live here and the wording is generated here, so the same facts
 * always produce the same reward and `scripts/check-growth.ts` can assert it
 * without a database. Nothing here reads the clock, the DB or a model.
 */

export type FlywheelResult = "accepted" | "rejected" | "waitlisted" | "deferred" | "withdrawn";

/** Ledger reasons — stable strings, because `awardPoints` de-duplicates on them. */
export const FLYWHEEL_REASON = {
  recorded: "outcome_recorded",
  verified: "outcome_verified",
} as const;

export const FLYWHEEL_POINTS = {
  /** A decision recorded with enough detail to be usable. */
  recorded: 25,
  /** …and a decision document on file, so the record can be trusted. */
  verified: 50,
} as const;

/** Badge criteria key created alongside the reward (see ensureFlywheelBadge). */
export const FLYWHEEL_BADGE_CRITERIA = "data_contributor";

export interface FlywheelInput {
  result: FlywheelResult;
  /** A decision letter / portal export is attached to this application. */
  hasEvidence: boolean;
  /** Decided date, scholarship details or notes — enough to be a usable record. */
  hasStructuredDetails: boolean;
  /** This application already produced a reward (idempotency guard). */
  alreadyContributed: boolean;
}

export interface FlywheelReward {
  /** Ledger reason — must match one of FLYWHEEL_REASON. */
  reason: string;
  points: number;
  /** Badge unlocked by this reward, or null. */
  badgeCriteria: string | null;
  /** True when the record is complete enough to help another student. */
  usableRecord: boolean;
  /** One sentence the UI can show verbatim. */
  explanation: string;
}

export function rewardForOutcome(input: FlywheelInput): FlywheelReward | null {
  // Rule 3 — no farming: one contribution per application.
  if (input.alreadyContributed) return null;
  // Rule 2 — a withdrawal is not a decision.
  if (input.result === "withdrawn") return null;
  // A record with no date and no detail cannot be compared with anything, so
  // it is not yet a contribution. The UI asks for the missing piece instead of
  // awarding for a click.
  if (!input.hasStructuredDetails) return null;

  const points = input.hasEvidence ? FLYWHEEL_POINTS.verified : FLYWHEEL_POINTS.recorded;
  const explanation = input.hasEvidence
    ? `Thanks — your decision is recorded with ${input.result} and a document on file. That is ${points} points, and it is the kind of record that makes the next student's shortlist honest.`
    : `Thanks — your decision is recorded as ${input.result}. That is ${points} points. Attach the decision letter if you would like it counted as verified data.`;

  return {
    reason: input.hasEvidence ? FLYWHEEL_REASON.verified : FLYWHEEL_REASON.recorded,
    points,
    badgeCriteria: input.hasEvidence ? FLYWHEEL_BADGE_CRITERIA : null,
    usableRecord: true,
    explanation,
  };
}

/**
 * How many outcomes a student has contributed, and what that unlocks. Kept
 * pure so the dashboard copy never invents a number the ledger does not have.
 */
export function flywheelStanding(contributed: number, verified: number): {
  contributed: number;
  verified: number;
  nextMilestone: number | null;
  note: string;
} {
  const safe = (n: number) => (Number.isFinite(n) && n > 0 ? Math.floor(n) : 0);
  const total = safe(contributed);
  const strong = Math.min(safe(verified), total);
  const milestones = [1, 3, 5, 10];
  const nextMilestone = milestones.find((m) => m > total) ?? null;
  const note =
    total === 0
      ? "No decisions recorded yet. Recording one — an offer, a rejection or a waitlist — is what makes the community sample real."
      : nextMilestone
        ? `${total} decision${total === 1 ? "" : "s"} recorded (${strong} with a document on file). ${nextMilestone - total} more reach${nextMilestone - total === 1 ? "es" : ""} the next milestone.`
        : `${total} decisions recorded (${strong} verified). Thank you — this is the data the flywheel runs on.`;
  return { contributed: total, verified: strong, nextMilestone, note };
}

/** The badge row the reward unlocks; created on demand, keyed by criteria. */
export const FLYWHEEL_BADGE = {
  name: "Data Contributor",
  description: "Recorded real admission decisions, including the ones that did not go their way.",
  iconUrl: "📊",
  criteria: FLYWHEEL_BADGE_CRITERIA,
} as const;
