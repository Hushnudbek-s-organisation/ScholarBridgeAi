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
  /** Recommendation rows (not requirement rows) — counted in their own group. */
  recommendationsSubmitted?: number;
  recommendationsTotal?: number;
  /** Funding items for this application. */
  financeDone?: number;
  financeTotal?: number;
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

  // Recommendations may exist as their own workflow even with no requirement row.
  if (extras.recommendationsTotal != null && extras.recommendationsTotal > 0) {
    const g = groups.get("recommendations") ?? blank("recommendations", "Recommendations");
    g.done += Math.min(extras.recommendationsSubmitted ?? 0, extras.recommendationsTotal);
    g.total = Math.max(g.total, extras.recommendationsTotal);
    g.pct = g.total ? Math.round((g.done / g.total) * 100) : 0;
    groups.set("recommendations", g);
  }
  if (extras.financeTotal != null && extras.financeTotal > 0) {
    const g = groups.get("finance") ?? blank("finance", "Finance");
    g.done += Math.min(extras.financeDone ?? 0, extras.financeTotal);
    g.total = Math.max(g.total, extras.financeTotal);
    g.pct = g.total ? Math.round((g.done / g.total) * 100) : 0;
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
  const blockers = missing.filter((m) => m.isRequired).map((m) => m.title);

  return {
    pct: Math.max(0, Math.min(100, pct)),
    done,
    total,
    sections,
    missing,
    // A required application.fee or application.final_submission row that is
    // still open is what actually blocks submission — not the essay draft.
    //
    // An application with NO tracked rows is never "ready": a green submit
    // button on a checklist that does not exist would be a lie. A submitted
    // application is past the gate by definition.
    readyToSubmit: extras.submitted === true || (total > 0 && blockers.length === 0),
    blockers,
  };
}
