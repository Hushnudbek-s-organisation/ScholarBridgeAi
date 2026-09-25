/**
 * Dataset readiness (strategy section).
 *
 * The plan is to grow ScholarBridge's own dataset from 1k to 100k records
 * before any ML chancing model is trained. This module makes that promise
 * enforceable rather than aspirational: it computes what stage the data has
 * reached and what is therefore allowed to be claimed.
 *
 * The gates are deliberately hard. A high record count alone proves nothing —
 * a dataset of 100k rows that is 99% acceptances, or that covers four
 * universities, or that is all eight years old, cannot train an honest model.
 * So readiness requires volume AND class balance AND breadth AND freshness.
 *
 * Pure module — asserted in `scripts/check-dataset.ts`.
 */

// --- Thresholds ------------------------------------------------------------

/** Below this the engine runs on published university data only. */
export const MIN_RECORDS_FOR_BLENDING = 1_000;

/** Below this no ML model is trained, however good the rest looks. */
export const MIN_RECORDS_FOR_ML = 100_000;

/** A per-university empirical rate needs at least this many outcomes. */
export const MIN_RECORDS_PER_UNIVERSITY = 5;

/** Smallest class must be at least this share, or the model learns a constant. */
export const MIN_MINORITY_CLASS_SHARE = 0.05;

/** Enough institutions that the model generalises instead of memorising. */
export const MIN_DISTINCT_UNIVERSITIES = 200;

/** Enough fields of study to model major-specific effects. */
export const MIN_DISTINCT_MAJORS = 30;

/** Enough people that rows are independent observations. */
export const MIN_DISTINCT_STUDENTS = 5_000;

/** Admissions policy moves; stale outcomes describe a different world. */
export const FRESHNESS_WINDOW_YEARS = 5;
export const MIN_FRESH_SHARE = 0.6;

// --- Types -----------------------------------------------------------------

export interface DatasetCounts {
  /** Every stored outcome, consented or not. */
  totalOutcomes: number;
  /** Only these may be used outside the owner's account. */
  consentedOutcomes: number;
  withoutConsent: number;
  accepted: number;
  rejected: number;
  waitlisted: number;
  deferred: number;
  withdrawn: number;
  distinctUniversities: number;
  distinctMajors: number;
  distinctCountries: number;
  /** Distinct profiles with at least one outcome. */
  distinctStudents: number;
  /** Share of consented records decided within FRESHNESS_WINDOW_YEARS. */
  freshShare: number;
}

export type DatasetStage = "collecting" | "blending" | "trainable" | "ml-ready";

export interface DatasetGate {
  key: string;
  requirement: string;
  have: number;
  need: number;
  met: boolean;
}

export interface DatasetReadiness {
  stage: DatasetStage;
  stageLabel: string;
  /** Consented records — the only population a model may see. */
  records: number;
  /** 0–100 progress toward an ML-ready dataset. */
  progressPct: number;
  allowed: { empiricalBlending: boolean; mlModel: boolean };
  gates: DatasetGate[];
  blockers: DatasetGate[];
  explanation: string;
  /** What the product must never say at this stage. */
  forbiddenClaims: string[];
}

// --- Readiness -------------------------------------------------------------

const pct = (v: number) => `${Math.round(v * 100)}%`;
const n = (v: number) => v.toLocaleString("en-US");

export function assessDataset(input: DatasetCounts): DatasetReadiness {
  // Every count arrives from a SQL aggregate, and SUM()/COUNT() over an empty
  // table yields null — which becomes NaN the moment it is used in arithmetic.
  // Coerce once, here, so no gate silently evaluates to NaN.
  const c = (input ?? {}) as Partial<DatasetCounts>;
  const num = (v: unknown) => (Number.isFinite(Number(v)) ? Number(v) : 0);

  const accepted = num(c.accepted);
  const rejected = num(c.rejected);
  const waitlisted = num(c.waitlisted);
  const deferred = num(c.deferred);
  // Withdrawals are counted for reporting but excluded from the label set:
  // a student withdrawing is not the university's verdict.
  void num(c.withdrawn);
  const distinctUniversities = num(c.distinctUniversities);
  const distinctMajors = num(c.distinctMajors);
  const distinctStudents = num(c.distinctStudents);
  const freshShare = Math.max(0, Math.min(1, num(c.freshShare)));

  const records = Math.max(0, Math.round(num(c.consentedOutcomes)));

  // Decisions that can train a model. "withdrawn" is the student's own choice,
  // not the university's verdict, so it is excluded from the label set.
  const decisions = accepted + rejected + waitlisted + deferred;
  const minority =
    decisions > 0 ? Math.min(accepted, rejected, waitlisted + deferred) / decisions : 0;

  const gates: DatasetGate[] = [
    {
      key: "volume",
      requirement: "Consented outcome records",
      have: records,
      need: MIN_RECORDS_FOR_ML,
      met: records >= MIN_RECORDS_FOR_ML,
    },
    {
      key: "balance",
      requirement: "Smallest outcome class as a share of decisions",
      have: Math.round(minority * 1000) / 10, // percent, 1dp
      need: MIN_MINORITY_CLASS_SHARE * 100,
      met: minority >= MIN_MINORITY_CLASS_SHARE,
    },
    {
      key: "breadth",
      requirement: "Distinct universities represented",
      have: distinctUniversities,
      need: MIN_DISTINCT_UNIVERSITIES,
      met: distinctUniversities >= MIN_DISTINCT_UNIVERSITIES,
    },
    {
      key: "majors",
      requirement: "Distinct fields of study",
      have: distinctMajors,
      need: MIN_DISTINCT_MAJORS,
      met: distinctMajors >= MIN_DISTINCT_MAJORS,
    },
    {
      key: "students",
      requirement: "Distinct students (rows must be independent)",
      have: distinctStudents,
      need: MIN_DISTINCT_STUDENTS,
      met: distinctStudents >= MIN_DISTINCT_STUDENTS,
    },
    {
      key: "freshness",
      requirement: `Share of records decided within ${FRESHNESS_WINDOW_YEARS} years`,
      have: Math.round(freshShare * 1000) / 10,
      need: MIN_FRESH_SHARE * 100,
      met: freshShare >= MIN_FRESH_SHARE,
    },
  ];

  const blockers = gates.filter((g) => !g.met);
  const metCount = gates.length - blockers.length;

  // Progress is the mean of per-gate progress, so one huge count cannot carry
  // a dataset that fails every other gate.
  const progressPct = Math.round(
    (gates.reduce((sum, g) => sum + Math.min(1, g.need > 0 ? g.have / g.need : 0), 0) / gates.length) * 100
  );

  // Volume alone unlocks blending; the full gate set unlocks ML.
  const empiricalBlending = records >= MIN_RECORDS_FOR_BLENDING;
  const mlModel = blockers.length === 0;

  const stage: DatasetStage = mlModel
    ? "ml-ready"
    : empiricalBlending
      ? blockers.every((b) => b.key !== "volume")
        ? "trainable"
        : "blending"
      : "collecting";

  const stageLabel: Record<DatasetStage, string> = {
    collecting: "Collecting data",
    blending: "Blending with ScholarBridge outcomes",
    trainable: "Enough to start training",
    "ml-ready": "Ready for a trained model",
  };

  let explanation: string;
  if (stage === "collecting") {
    explanation =
      `${n(records)} consented records of the ${n(MIN_RECORDS_FOR_BLENDING)} needed before ScholarBridge outcomes influence any estimate. ` +
      `Until then every number comes from published university data and is labelled as an estimate.`;
  } else if (stage === "blending") {
    explanation =
      `${n(records)} consented records. Per-university empirical rates now blend into the estimate where a university has at least ` +
      `${MIN_RECORDS_PER_UNIVERSITY} outcomes, but no model is trained. ` +
      `${blockers.length} gate${blockers.length === 1 ? "" : "s"} still unmet: ${blockers.map((b) => b.requirement).join("; ")}.`;
  } else if (stage === "trainable") {
    explanation =
      `Volume target met at ${n(records)} records. The remaining gap is quality: ${blockers
        .map((b) => `${b.requirement} is ${b.have} of ${b.need}`)
        .join(", ")}. A model trained now would be overconfident, so it is not trained.`;
  } else {
    explanation =
      `All ${gates.length} gates met: ${n(records)} records across ${n(distinctUniversities)} universities, ` +
      `${n(distinctStudents)} students, balanced outcomes and ${pct(freshShare)} recent. A model may now be trained.`;
  }

  return {
    stage,
    stageLabel: stageLabel[stage],
    records,
    progressPct: Math.max(0, Math.min(100, progressPct)),
    allowed: { empiricalBlending, mlModel },
    gates,
    blockers,
    explanation,
    // Stated so no copy, AI reply or marketing page can overstep.
    forbiddenClaims: mlModel
      ? []
      : [
          "predicted probability",
          "our model says you will be accepted",
          "machine learning estimate",
          "guaranteed admission",
        ],
  };
}

/**
 * Whether a single university has enough of its own outcomes to publish an
 * empirical rate. Mirrors the threshold the chancing engine blends at.
 */
export function universityHasEmpiricalData(sample: {
  accepted: number;
  rejected: number;
  waitlisted: number;
  deferred: number;
}): boolean {
  return (
    Math.max(0, sample.accepted) +
      Math.max(0, sample.rejected) +
      Math.max(0, sample.waitlisted) +
      Math.max(0, sample.deferred) >=
    MIN_RECORDS_PER_UNIVERSITY
  );
}
