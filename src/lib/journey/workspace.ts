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
  /** Catalog linkage lets recommendation request placeholders be deduplicated. */
  linkedType?: string | null;
}

/** Optional per-group extras the workspace can fold into the same maths. */
export interface WorkspaceExtras {
  /** Recommendation rows (not requirement rows) — counted in their own group. */
  recommendationsSubmitted?: number;
  recommendationsTotal?: number;
  /** Funding items for this application. */
  financeDone?: number;
  financeTotal?: number;
  /** Application record says submission has already happened. */
  submitted?: boolean;
  /** Paid-fee fact for a required `application.fee` row. */
  applicationFeePaid?: boolean;
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

function safeCount(value: number | undefined): number {
  return value != null && Number.isFinite(value) ? Math.max(0, Math.floor(value)) : 0;
}

/** Placeholder checklist rows mirror recommendationRequests when real requests exist. */
export function isRecommendationPlaceholder(row: Pick<WorkspaceRow, "section" | "key" | "linkedType">): boolean {
  return row.section === "recommendations" && (
    row.linkedType === "recommendation" || /^(recommendation|recommendations)\./i.test(row.key ?? "")
  );
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
  const recommendationsTotal = safeCount(extras.recommendationsTotal);
  const recommendationsSubmitted = Math.min(recommendationsTotal, safeCount(extras.recommendationsSubmitted));
  const countedRows = rows.filter((row) => !(recommendationsTotal > 0 && isRecommendationPlaceholder(row)));
  const isDone = (row: WorkspaceRow) => rowIsDone(row) || (row.key === "application.fee" && extras.applicationFeePaid === true);

  for (const row of countedRows) {
    const label = row.section.charAt(0).toUpperCase() + row.section.slice(1);
    if (!groups.has(row.section)) groups.set(row.section, blank(row.section, label));
    const g = groups.get(row.section)!;
    g.total += 1;
    if (isDone(row)) {
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

  // Standalone request/funding records are added only when that category has
  // no requirement rows. When both tables describe the same workflow, counting
  // both sources would double-count items or let `done` exceed `total`.
  if (recommendationsTotal > 0 && !groups.has("recommendations")) {
    const g = blank("recommendations", "Recommendations");
    g.done = recommendationsSubmitted;
    g.total = recommendationsTotal;
    groups.set("recommendations", g);
  }
  const financeTotal = safeCount(extras.financeTotal);
  const financeDone = Math.min(financeTotal, safeCount(extras.financeDone));
  if (financeTotal > 0 && !groups.has("finance")) {
    const g = blank("finance", "Finance");
    g.done = financeDone;
    g.total = financeTotal;
    groups.set("finance", g);
  }

  const sections = [...groups.values()].map((g) => ({
    ...g,
    pct: g.total ? Math.round((g.done / g.total) * 100) : 0,
  }));

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
  const requiredFeeRows = rows.filter((row) => row.key === "application.fee" && row.isRequired);
  const feeSatisfied = requiredFeeRows.every(isDone);
  const requiredRows = countedRows.filter((row) => row.isRequired && row.key !== "application.fee");
  const blockers = missing.filter((m) => m.isRequired && m.key !== "application.fee").map((m) => m.title);
  const recommendationBlockers = Math.max(0, recommendationsTotal - recommendationsSubmitted);
  if (recommendationBlockers > 0) blockers.push(`${recommendationBlockers} recommendation request(s) not submitted`);
  if (!feeSatisfied) blockers.push("Application fee not paid or marked complete");
  const requirementsSatisfied = rows.length > 0 && requiredRows.every(isDone);

  return {
    pct: Math.max(0, Math.min(100, pct)),
    done,
    total,
    sections,
    missing,
    // Submission requires a real tracked checklist, every required row closed,
    // every tracked recommendation submitted and any required fee satisfied.
    // `submitted` affects the progress bar above, never bypasses this gate.
    readyToSubmit: requirementsSatisfied && recommendationBlockers === 0 && feeSatisfied,
    blockers,
  };
}
