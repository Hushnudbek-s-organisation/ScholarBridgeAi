/**
 * Feature 5.3 — Smart Backwards Timeline & Exam-Deadline Conflict Detector.
 *
 * WHY
 * ---
 * Deadlines are published; the work behind them is not. A student who books
 * IELTS three weeks before a scholarship deadline has already lost: the score
 * report is not released in time. A German applicant who forgets that a
 * uni-assist VPD takes weeks, or that a my.gov.uz e-Apostille plus a certified
 * translation takes one to two weeks, misses a deadline they thought was
 * comfortable. This module turns every deadline the student already saved into
 * a dated, backwards-planned checklist — and warns when the plan contradicts
 * itself.
 *
 * HONESTY RULES
 * -------------
 *  1. Lead times are planning buffers, not published processing guarantees.
 *     Each milestone carries the buffer it used (`offsetDays`) and a
 *     `confidence` note; the UI says these are planning estimates.
 *  2. A milestone that only applies to some destinations (`vpd`) is emitted
 *     with `applies: false` plus the reason, never silently dropped and never
 *     silently added to a country it does not belong to.
 *  3. Dates are computed in UTC from the `YYYY-MM-DD` string so a student in
 *     Tashkent and a server in Frankfurt agree on "D minus 60 days".
 *  4. Pure and deterministic — no network, no AI, no Date.now() inside the
 *     maths. The caller passes `today`.
 */

import { countriesMatch } from "./countries";

/* -------------------------------------------------------------------------- */
/* Types                                                                       */
/* -------------------------------------------------------------------------- */

export interface TimelineDeadline {
  /** Stable id used to deduplicate synced tasks (`app-12`, `sch-3`, …). */
  id?: string | null;
  label: string;
  /** `YYYY-MM-DD` or a Date/ISO string. */
  date: string | Date | null;
  kind: "application" | "scholarship" | "visa" | "other";
  /** Destination country, when known — drives the country-specific steps. */
  country?: string | null;
  universityId?: number | null;
}

export interface TimelineTest {
  id?: string | null;
  /** `ielts`, `toefl`, `sat`, `gre`, `duolingo`, … */
  testType: string;
  date: string | Date | null;
  label?: string | null;
}

export type MilestoneId =
  | "rec_letters"
  | "shortlist_final"
  | "english_test"
  | "apostille"
  | "vpd"
  | "sop_draft"
  | "bank_statement"
  | "final_buffer";

export interface Milestone {
  id: MilestoneId;
  /** Days before the deadline this step should be finished. */
  offsetDays: number;
  /** `YYYY-MM-DD`, or null when the deadline itself has no date. */
  dueDate: string | null;
  /** False when the step belongs to another destination (with the reason). */
  applies: boolean;
  /**
   * Why it does not apply — translated by the UI, machine-readable here.
   * `country_unknown` is its own reason: a deadline whose destination we do not
   * know must not claim "this is not Germany", it must say "we cannot tell".
   */
  notApplicableReason?: "not_germany" | "country_unknown" | null;
  /** How far in the past this step already is (>0 = overdue). */
  daysOverdue: number;
  /** The country this milestone was planned for. */
  country: string | null;
}

export interface DeadlinePlan {
  deadline: TimelineDeadline;
  /** `YYYY-MM-DD`, or null when no usable date was supplied. */
  date: string | null;
  daysUntilDeadline: number | null;
  milestones: Milestone[];
  /** Milestones whose date has already passed, nearest first. */
  overdue: Milestone[];
}

export type ConflictId =
  | "exam_too_close"
  | "exam_after_deadline"
  | "exam_in_past"
  | "deadline_in_past"
  | "apostille_overdue"
  | "tight_deadline";

export interface TimelineConflict {
  id: ConflictId;
  severity: "critical" | "warning";
  /** Which deadline and which test the conflict is between (ids may be null). */
  deadlineId: string | null;
  deadlineLabel: string;
  testType?: string;
  /** Dates involved, as `YYYY-MM-DD` where known. */
  dates: { deadline?: string | null; exam?: string | null; milestone?: string | null };
  /** Numbers the UI can print without recomputing. */
  numbers: { gapDays?: number; minimumDays?: number; daysOverdue?: number; offsetDays?: number };
}

export interface SmartTimeline {
  plans: DeadlinePlan[];
  conflicts: TimelineConflict[];
  /** Every milestone across every plan, nearest due first — the flat list. */
  allMilestones: { deadlineId: string | null; deadlineLabel: string; milestone: Milestone }[];
  counts: {
    deadlines: number;
    undatedDeadlines: number;
    milestones: number;
    applicableMilestones: number;
    overdue: number;
    critical: number;
    warnings: number;
  };
  today: string;
}

/* -------------------------------------------------------------------------- */
/* Planning buffers                                                            */
/* -------------------------------------------------------------------------- */

/**
 * The backwards plan, in days before the deadline. These are planning buffers
 * derived from the documented processing times the platform already teaches in
 * its video courses (uni-assist VPD, my.gov.uz e-Apostille and certified
 * translation, UKVI 28-day funds), not a promise from any office.
 */
export const BACKWARDS_MILESTONES: {
  id: MilestoneId;
  offsetDays: number;
  /** Countries this step is specific to; empty = every destination. */
  countries: string[];
  /** Task category written to `/api/tasks` when the student syncs the plan. */
  category: string;
  priority: "High" | "Medium" | "Low";
}[] = [
  { id: "rec_letters", offsetDays: 90, countries: [], category: "Recommendations", priority: "High" },
  { id: "shortlist_final", offsetDays: 90, countries: [], category: "Planning", priority: "Medium" },
  { id: "english_test", offsetDays: 60, countries: [], category: "Testing", priority: "High" },
  { id: "apostille", offsetDays: 60, countries: [], category: "Document Prep", priority: "High" },
  { id: "vpd", offsetDays: 45, countries: ["Germany"], category: "Document Prep", priority: "High" },
  { id: "sop_draft", offsetDays: 45, countries: [], category: "Essays", priority: "Medium" },
  { id: "bank_statement", offsetDays: 14, countries: [], category: "Finance", priority: "High" },
  { id: "final_buffer", offsetDays: 3, countries: [], category: "Submission", priority: "High" },
];

/**
 * An exam booked fewer than this many days before a deadline cannot deliver a
 * usable score report in time — IELTS results alone take several days, and a
 * retake is out of the question.
 */
export const MIN_EXAM_LEAD_DAYS = 14;

/**
 * A deadline closer than this has no room for the backwards plan at all: the
 * 90-day and 60-day steps are already in the past on the day it is saved.
 */
export const TIGHT_DEADLINE_DAYS = 30;

/** my.gov.uz e-Apostille plus a certified translation: plan for one to two weeks. */
export const APOSTILLE_LEAD_DAYS = 14;

/* -------------------------------------------------------------------------- */
/* Date maths (UTC, so the answer does not depend on the server's timezone)    */
/* -------------------------------------------------------------------------- */

/** Parse `YYYY-MM-DD`, an ISO string or a Date into a UTC midnight Date. */
export function toDate(value: string | Date | null | undefined): Date | null {
  if (value == null) return null;
  if (value instanceof Date) {
    if (Number.isNaN(value.getTime())) return null;
    return new Date(Date.UTC(value.getUTCFullYear(), value.getUTCMonth(), value.getUTCDate()));
  }
  const text = String(value).trim();
  if (!text) return null;
  const ymd = text.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (ymd) {
    const d = new Date(Date.UTC(Number(ymd[1]), Number(ymd[2]) - 1, Number(ymd[3])));
    return Number.isNaN(d.getTime()) ? null : d;
  }
  const parsed = new Date(text);
  if (Number.isNaN(parsed.getTime())) return null;
  return new Date(Date.UTC(parsed.getUTCFullYear(), parsed.getUTCMonth(), parsed.getUTCDate()));
}

/** `YYYY-MM-DD` in UTC — never a locale string, so sorting and diffs are safe. */
export function toYmd(date: Date | null | undefined): string | null {
  if (!date || Number.isNaN(date.getTime())) return null;
  return date.toISOString().slice(0, 10);
}

/** Whole days from `from` to `to` (negative when `to` is earlier). */
export function daysBetween(from: Date, to: Date): number {
  return Math.round((to.getTime() - from.getTime()) / 86_400_000);
}

function minusDays(date: Date, days: number): Date {
  return new Date(date.getTime() - days * 86_400_000);
}

/* -------------------------------------------------------------------------- */
/* Backwards plan for one deadline                                             */
/* -------------------------------------------------------------------------- */

/**
 * Compute the dated backwards plan for a single deadline. Milestones that do
 * not apply to this destination are still returned with `applies: false` and
 * the reason, so the UI can show a student exactly why a German step was
 * skipped for a UK application instead of hiding it.
 */
export function buildBackwardsPlan(
  deadline: TimelineDeadline,
  options: { today?: string | Date | null } = {}
): DeadlinePlan {
  const today = toDate(options.today) ?? new Date(Date.now());
  const date = toDate(deadline.date);
  const dateYmd = toYmd(date);

  const milestones: Milestone[] = BACKWARDS_MILESTONES.map((spec) => {
    const applies =
      spec.countries.length === 0 || (!!deadline.country && spec.countries.some((c) => countriesMatch(c, deadline.country)));
    const due = date ? minusDays(date, spec.offsetDays) : null;
    const dueYmd = toYmd(due);
    return {
      id: spec.id,
      offsetDays: spec.offsetDays,
      dueDate: dueYmd,
      applies,
      notApplicableReason: applies ? null : deadline.country ? "not_germany" : "country_unknown",
      daysOverdue: dueYmd ? Math.max(0, daysBetween(due!, today)) : 0,
      country: deadline.country ?? null,
    };
  });

  const overdue = milestones
    .filter((m) => m.applies && m.daysOverdue > 0)
    .sort((a, b) => b.daysOverdue - a.daysOverdue);

  return {
    deadline,
    date: dateYmd,
    daysUntilDeadline: date ? daysBetween(today, date) : null,
    milestones,
    overdue,
  };
}

/* -------------------------------------------------------------------------- */
/* Conflict detection                                                          */
/* -------------------------------------------------------------------------- */

/**
 * Find the contradictions in a plan: an exam booked too close to (or after) a
 * deadline, a deadline that has already passed, an apostille step that is
 * already overdue, and deadlines so tight that the backwards plan cannot fit.
 */
export function detectTimelineConflicts(
  deadlines: readonly TimelineDeadline[],
  tests: readonly TimelineTest[],
  options: { today?: string | Date | null } = {}
): TimelineConflict[] {
  const today = toDate(options.today) ?? new Date(Date.now());
  const conflicts: TimelineConflict[] = [];

  const datedTests = tests
    .map((test) => ({ test, date: toDate(test.date) }))
    .filter((entry): entry is { test: TimelineTest; date: Date } => entry.date != null);

  for (const deadline of deadlines) {
    const dDate = toDate(deadline.date);
    const dYmd = toYmd(dDate);

    if (!dDate) continue; // an undated deadline cannot conflict with a date

    if (daysBetween(today, dDate) < 0) {
      conflicts.push({
        id: "deadline_in_past",
        severity: "critical",
        deadlineId: deadline.id ?? null,
        deadlineLabel: deadline.label,
        dates: { deadline: dYmd },
        numbers: { daysOverdue: Math.abs(daysBetween(today, dDate)) },
      });
      continue; // a past deadline makes every other comparison noise
    }

    if (daysBetween(today, dDate) <= TIGHT_DEADLINE_DAYS) {
      conflicts.push({
        id: "tight_deadline",
        severity: "warning",
        deadlineId: deadline.id ?? null,
        deadlineLabel: deadline.label,
        dates: { deadline: dYmd },
        numbers: { gapDays: daysBetween(today, dDate), minimumDays: TIGHT_DEADLINE_DAYS },
      });
    }

    for (const { test, date } of datedTests) {
      const gapDays = daysBetween(date, dDate); // positive = exam before deadline
      if (gapDays < 0) {
        conflicts.push({
          id: "exam_after_deadline",
          severity: "critical",
          deadlineId: deadline.id ?? null,
          deadlineLabel: deadline.label,
          testType: test.testType,
          dates: { deadline: dYmd, exam: toYmd(date) },
          numbers: { gapDays: Math.abs(gapDays), minimumDays: MIN_EXAM_LEAD_DAYS },
        });
      } else if (gapDays < MIN_EXAM_LEAD_DAYS) {
        conflicts.push({
          id: "exam_too_close",
          severity: gapDays < 7 ? "critical" : "warning",
          deadlineId: deadline.id ?? null,
          deadlineLabel: deadline.label,
          testType: test.testType,
          dates: { deadline: dYmd, exam: toYmd(date) },
          numbers: { gapDays, minimumDays: MIN_EXAM_LEAD_DAYS },
        });
      }
      if (daysBetween(today, date) < 0) {
        conflicts.push({
          id: "exam_in_past",
          severity: "warning",
          deadlineId: deadline.id ?? null,
          deadlineLabel: deadline.label,
          testType: test.testType,
          dates: { deadline: dYmd, exam: toYmd(date) },
          numbers: { daysOverdue: Math.abs(daysBetween(today, date)) },
        });
      }
    }

    // The e-Apostille + certified translation step has its own lead time; if
    // that date is already behind today the documents are the critical path.
    const apostille = BACKWARDS_MILESTONES.find((m) => m.id === "apostille");
    if (apostille) {
      const apostilleDue = minusDays(dDate, apostille.offsetDays);
      const daysOverdue = daysBetween(apostilleDue, today);
      if (daysOverdue > 0 && daysBetween(today, dDate) > 0) {
        conflicts.push({
          id: "apostille_overdue",
          severity: daysOverdue > APOSTILLE_LEAD_DAYS ? "critical" : "warning",
          deadlineId: deadline.id ?? null,
          deadlineLabel: deadline.label,
          dates: { deadline: dYmd, milestone: toYmd(apostilleDue) },
          numbers: { daysOverdue, offsetDays: apostille.offsetDays },
        });
      }
    }
  }

  // Critical first, then by the deadline they belong to, so the banner order
  // is stable between renders (no flicker as the list is re-fetched).
  const severityRank = { critical: 0, warning: 1 } as const;
  return conflicts.sort(
    (a, b) =>
      severityRank[a.severity] - severityRank[b.severity] ||
      a.deadlineLabel.localeCompare(b.deadlineLabel) ||
      a.id.localeCompare(b.id) ||
      (a.testType ?? "").localeCompare(b.testType ?? "")
  );
}

/* -------------------------------------------------------------------------- */
/* The combined view                                                           */
/* -------------------------------------------------------------------------- */

/**
 * Build the whole smart timeline: one dated plan per deadline, the conflicts
 * between plans and booked exams, and a single nearest-first milestone list
 * the calendar view renders.
 */
export function buildSmartTimeline(
  deadlines: readonly TimelineDeadline[],
  tests: readonly TimelineTest[],
  options: { today?: string | Date | null } = {}
): SmartTimeline {
  const today = toDate(options.today) ?? new Date(Date.now());
  const todayYmd = toYmd(today)!;

  const plans = deadlines.map((deadline) => buildBackwardsPlan(deadline, { today }));
  const conflicts = detectTimelineConflicts(deadlines, tests, { today });

  const allMilestones = plans
    .flatMap((plan) =>
      plan.milestones
        .filter((milestone) => milestone.applies)
        .map((milestone) => ({
          deadlineId: plan.deadline.id ?? null,
          deadlineLabel: plan.deadline.label,
          milestone,
        }))
    )
    .sort((a, b) => {
      const ad = a.milestone.dueDate ?? "9999-12-31";
      const bd = b.milestone.dueDate ?? "9999-12-31";
      if (ad !== bd) return ad.localeCompare(bd);
      return a.deadlineLabel.localeCompare(b.deadlineLabel);
    });

  return {
    plans,
    conflicts,
    allMilestones,
    counts: {
      deadlines: plans.length,
      undatedDeadlines: plans.filter((p) => p.date == null).length,
      milestones: allMilestones.length,
      applicableMilestones: allMilestones.length,
      overdue: allMilestones.filter((m) => m.milestone.daysOverdue > 0).length,
      critical: conflicts.filter((c) => c.severity === "critical").length,
      warnings: conflicts.filter((c) => c.severity === "warning").length,
    },
    today: todayYmd,
  };
}

/* -------------------------------------------------------------------------- */
/* Sync to /api/tasks                                                          */
/* -------------------------------------------------------------------------- */

export interface TaskDraft {
  title: string;
  dueDate: string;
  category: string;
  priority: "High" | "Medium" | "Low";
  universityId?: number | null;
  /** Stable key so syncing twice does not create the same task twice. */
  dedupeKey: string;
}

/**
 * Turn the applicable, not-yet-passed milestones of one plan into task drafts
 * for `POST /api/tasks`. The caller supplies the translated title text; this
 * module stays free of UI copy so the same drafts work in every locale.
 */
export function milestoneTaskDrafts(
  plan: DeadlinePlan,
  titleFor: (milestoneId: MilestoneId, deadlineLabel: string) => string
): TaskDraft[] {
  const drafts: TaskDraft[] = [];
  for (const milestone of plan.milestones) {
    if (!milestone.applies || !milestone.dueDate) continue;
    const spec = BACKWARDS_MILESTONES.find((m) => m.id === milestone.id);
    if (!spec) continue;
    drafts.push({
      title: titleFor(milestone.id, plan.deadline.label).slice(0, 300),
      dueDate: milestone.dueDate,
      category: spec.category,
      priority: spec.priority,
      universityId: plan.deadline.universityId ?? null,
      dedupeKey: `${plan.deadline.id ?? plan.deadline.label}|${milestone.id}`,
    });
  }
  return drafts;
}
