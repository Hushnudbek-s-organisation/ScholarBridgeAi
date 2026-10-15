/**
 * Application Workspace progress (spec §6).
 *
 * "The student should never need to manually remember what is missing."
 * Every requirement row contributes to a single progress number, grouped the
 * way the workspace tabs are grouped, so the bar can never disagree with the
 * checklist underneath it.
 *
 * PURE MODULE — asserted in `scripts/check-journey.ts`.
 */

export type WorkspaceSection =
  | "overview"
  | "requirements"
  | "documents"
  | "essays"
  | "recommendations"
  | "tests"
  | "finance"
  | "deadlines"
  | "submission"
  | "decision";

export const WORKSPACE_TABS: { id: WorkspaceSection; label: string; icon: string }[] = [
  { id: "overview", label: "Overview", icon: "📋" },
  { id: "requirements", label: "Requirements", icon: "✅" },
  { id: "documents", label: "Documents", icon: "📄" },
  { id: "essays", label: "Essays", icon: "✍️" },
  { id: "recommendations", label: "Recommendations", icon: "💌" },
  { id: "tests", label: "Tests", icon: "📝" },
  { id: "finance", label: "Finance", icon: "💰" },
  { id: "deadlines", label: "Deadlines", icon: "📅" },
  { id: "submission", label: "Submission", icon: "🚀" },
  { id: "decision", label: "Decision", icon: "🎓" },
];

/** One checklist row as stored in `application_requirements`. */
export interface WorkspaceRow {
  section: string;
  status: string;
  isRequired: boolean;
  /** Stable key so the caller can map this row back to its own title. */
  key?: string;
}

/** Optional per-group extras the workspace can fold into the same maths. */
export interface WorkspaceExtras {
  /**
   * Tracked recommendation REQUESTS (rows in `recommendation_requests`).
   * These are distinct items from a `recommendations` requirement row: the row
   * is "provide letters", each request is one letter. They add to the group
   * instead of overwriting it, so `done <= total` always holds.
   */
  recommendationsSubmitted?: number;
  recommendationsTotal?: number;
  /** Funding items for this application. Same additive rule as above. */
  financeDone?: number;
  financeTotal?: number;
  /**
   * Recommendation requests still waiting on a referee. A tracked request that
   * is not submitted blocks submission, exactly like GET /api/workspace has
   * always reported in its submission checklist.
   */
  recommendationsOutstanding?: number;
  /** The application fee, when the application tracks one. */
  feeRequired?: boolean;
  feePaid?: boolean;
  feeRowStatus?: string | null;
  /** Submitted? Locks the bar at 100. */
  submitted?: boolean;
}

export interface SectionProgress {
  key: string;
  label: string;
  done: number;
  total: number;
  pct: number;
  missing: string[];
}

export interface WorkspaceProgress {
  /** 0–100, whole application. */
  pct: number;
  done: number;
  total: number;
  sections: SectionProgress[];
  /** Everything still open — the exact requirement, not just the group. */
  missing: { key: string; section: string; title: string; isRequired: boolean; status: string }[];
  readyToSubmit: boolean;
  blockers: string[];
}

/** A row counts as done only when explicitly marked done or not required. */
export function rowIsDone(row: WorkspaceRow): boolean {
  return row.status === "done" || row.status === "not_required";
}

function blank(key: string, label: string): SectionProgress {
  return { key, label, done: 0, total: 0, pct: 0, missing: [] };
}

/**
 * Section weights. Documents and essays carry the most of an application in
 * practice; the fee and the final submission are quick wins at the end. The
 * weights are a fixed, explainable table — not a model.
 */
export const SECTION_WEIGHTS: Record<string, number> = {
  academic: 1,
  english: 1,
  testing: 1,
  documents: 2,
  essays: 2,
  recommendations: 1.5,
  finance: 1,
  application: 1.5,
};

export function computeWorkspaceProgress(
  rows: WorkspaceRow[],
  titles: Record<string, string> = {},
  extras: WorkspaceExtras = {}
): WorkspaceProgress {
  const groups = new Map<string, SectionProgress>();
  const missing: WorkspaceProgress["missing"] = [];

  for (const row of rows) {
    const label = row.section.charAt(0).toUpperCase() + row.section.slice(1);
    if (!groups.has(row.section)) groups.set(row.section, blank(row.section, label));
    const g = groups.get(row.section)!;
    g.total += 1;
    if (rowIsDone(row)) {
      g.done += 1;
    } else {
      const key = row.key ?? row.section;
      g.missing.push(titles[key] ?? label);
      missing.push({
        key,
        section: row.section,
        title: titles[key] ?? label,
        isRequired: row.isRequired,
        status: row.status,
      });
    }
  }

  // Recommendations may exist as their own workflow even with no requirement
  // row. FIX (2026-10): the old code added the extras to `done` but took
  // `Math.max` for `total`, so a requirement row AND tracked requests produced
  // more finished items than items — 150% sections.
  if (extras.recommendationsTotal != null && extras.recommendationsTotal > 0) {
    const g = groups.get("recommendations") ?? blank("recommendations", "Recommendations");
    const added = Math.max(0, Math.min(extras.recommendationsSubmitted ?? 0, extras.recommendationsTotal));
    g.done += added;
    g.total += extras.recommendationsTotal;
    g.pct = g.total ? Math.round((g.done / g.total) * 100) : 0;
    groups.set("recommendations", g);
  }
  if (extras.financeTotal != null && extras.financeTotal > 0) {
    const g = groups.get("finance") ?? blank("finance", "Finance");
    const added = Math.max(0, Math.min(extras.financeDone ?? 0, extras.financeTotal));
    g.done += added;
    g.total += extras.financeTotal;
    g.pct = g.total ? Math.round((g.done / g.total) * 100) : 0;
    groups.set("finance", g);
  }

  const sections = [...groups.values()].map((g) => {
    // Invariant, asserted in check-journey.ts: a section can never be more
    // than 100% complete.
    const total = Math.max(g.total, g.done);
    return { ...g, total, pct: total ? Math.round((g.done / total) * 100) : 0 };
  });

  let weightSum = 0;
  let weighted = 0;
  for (const g of sections) {
    const w = SECTION_WEIGHTS[g.key] ?? 1;
    weightSum += w;
    weighted += w * (g.done / Math.max(g.total, 1));
  }
  let pct = weightSum ? Math.round((weighted / weightSum) * 100) : 0;
  if (extras.submitted) pct = 100;

  const done = sections.reduce((s, g) => s + g.done, 0);
  const total = sections.reduce((s, g) => s + g.total, 0);

  // ONE submission gate (`submissionGate`) shared by the progress maths, the
  // GET workspace response and the PATCH markSubmitted action. Before this,
  // the three disagreed: the checklist refused to submit while an OPTIONAL row
  // was open, the progress maths ignored outstanding recommendations, and
  // PATCH let an application with no checklist at all through.
  const gate = submissionGate({
    sections,
    missing,
    recommendationsOutstanding: extras.recommendationsOutstanding,
    feeRequired: extras.feeRequired,
    feePaid: extras.feePaid,
    feeRowStatus: extras.feeRowStatus,
    submitted: extras.submitted,
  });

  return {
    pct: Math.max(0, Math.min(100, pct)),
    done,
    total,
    sections,
    missing,
    readyToSubmit: gate.ready,
    blockers: gate.blockers,
  };
}

export interface SubmissionGateInput {
  sections: SectionProgress[];
  missing: WorkspaceProgress["missing"];
  /** Tracked recommendation requests still waiting on a referee. */
  recommendationsOutstanding?: number;
  /** The application fee, when the application tracks one. */
  feeRequired?: boolean;
  feePaid?: boolean;
  /** Status of the `application.fee` requirement row, when there is one. */
  feeRowStatus?: string | null;
  submitted?: boolean;
}

/**
 * The single, canonical "may this application be submitted?" rule.
 *
 * Ready iff:
 *   1. there is at least one tracked item (an empty checklist is never ready —
 *      a green submit button on nothing would be a lie); and
 *   2. every isRequired row is "done" or "not_required" (optional rows never
 *      block — that was the old `pct >= 100` bug); and
 *   3. every tracked recommendation request has been submitted; and
 *   4. the application fee, if the application tracks one, is paid or marked
 *      done / not_required / waived.
 * A submitted application is past the gate by definition.
 */
export function submissionGate(input: SubmissionGateInput): { ready: boolean; blockers: string[] } {
  const total = input.sections.reduce((s, g) => s + g.total, 0);
  const blockers = input.missing.filter((m) => m.isRequired).map((m) => m.title);

  const outstanding = Math.max(0, Number(input.recommendationsOutstanding ?? NaN) || 0);
  const recsBlocked = outstanding > 0;
  if (recsBlocked) {
    blockers.push(
      outstanding === 1
        ? "1 recommendation request is not submitted yet"
        : `${outstanding} recommendation requests are not submitted yet`,
    );
  }

  const feeSettled =
    input.feeRowStatus === "done" ||
    input.feeRowStatus === "not_required" ||
    input.feeRowStatus === "waived";
  const feeBlocked = input.feeRequired === true && input.feePaid !== true && !feeSettled;
  if (feeBlocked) blockers.push("The application fee has not been paid");

  if (input.submitted === true) return { ready: true, blockers: [] };
  return { ready: total > 0 && blockers.length === 0, blockers };
}
