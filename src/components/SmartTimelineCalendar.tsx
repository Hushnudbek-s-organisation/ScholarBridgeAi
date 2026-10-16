"use client";

/**
 * Priority 5.3 — Smart Backwards Timeline & Conflict Detector.
 *
 * A deadline is the only date an admissions office gives you. Everything that
 * has to be true on that day — recommendation letters, an English test score
 * that has actually arrived, an apostilled diploma, a bank statement inside its
 * validity window — has its own lead time, and students reliably discover those
 * lead times too late.
 *
 * This panel works backwards from every dated deadline (D-90 → D-3), flags the
 * contradictions in the plan (an IELTS booked nine days before the deadline
 * cannot deliver a score report in time; a deadline inside 30 days has no room
 * for the plan at all), and can push the resulting dates into the student's own
 * task list.
 *
 * All date maths is in `src/lib/smartTimeline.ts` — UTC, deterministic, no
 * network. A deadline with no date on file is listed as undated and never given
 * an invented one.
 */
import React from "react";
import { useTranslations } from "next-intl";
import {
  AlertTriangle,
  CalendarClock,
  Check,
  ChevronDown,
  ChevronUp,
  CircleAlert,
  Clock,
  Loader2,
  ListChecks,
  OctagonAlert,
} from "lucide-react";
import { AppNote } from "@/components/AppNote";
import {
  buildSmartTimeline,
  milestoneTaskDrafts,
  MIN_EXAM_LEAD_DAYS,
  TIGHT_DEADLINE_DAYS,
  type DeadlinePlan,
  type MilestoneId,
  type SmartTimeline,
  type TimelineConflict,
  type TimelineDeadline,
  type TimelineTest,
} from "@/lib/smartTimeline";

/** One row of `GET /api/deadlines` — applications, scholarships, tasks, tests. */
interface DeadlineRow {
  id?: string | null;
  type?: string | null;
  title?: string | null;
  subtitle?: string | null;
  date?: string | null;
  status?: string | null;
  daysRemaining?: number | null;
  testType?: string | null;
  source?: string | null;
}

interface SavedUniversityRow {
  university?: { id?: number | null; name?: string | null; country?: string | null } | null;
}

const SEVERITY_TONE: Record<TimelineConflict["severity"], string> = {
  critical: "border-rose-200 bg-rose-50 text-rose-800 dark:border-rose-500/30 dark:bg-rose-500/10 dark:text-rose-100",
  warning: "border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-100",
};

/** Which deadline kinds the backwards plan is built for. */
const PLANNED_TYPES = new Set(["application", "scholarship", "visa"]);

export interface SmartTimelineCalendarProps {
  profileId: number;
  /** Called after tasks are written, so the host panel can refresh its list. */
  onTasksSynced?: (count: number) => void;
  onNavigateTab?: (id: string) => void;
  className?: string;
}

export function SmartTimelineCalendar({ profileId, onTasksSynced, onNavigateTab, className = "" }: SmartTimelineCalendarProps) {
  const t = useTranslations("timeline");
  const [rows, setRows] = React.useState<DeadlineRow[]>([]);
  const [uniCountries, setUniCountries] = React.useState<{ name: string; country: string; id: number | null }[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState("");
  const [expanded, setExpanded] = React.useState<Set<string>>(new Set());
  const [showAll, setShowAll] = React.useState(false);
  const [syncing, setSyncing] = React.useState<string | null>(null);
  const [synced, setSynced] = React.useState<Record<string, number>>({});
  const [syncError, setSyncError] = React.useState("");

  /* ---- load deadlines (+ the countries behind them) ---------------------- */
  React.useEffect(() => {
    let live = true;
    const controller = new AbortController();
    // Deferred by a timer (the DeadlineCenter pattern) so the effect body never
    // writes state synchronously.
    const timer = window.setTimeout(() => { void run(); }, 0);

    async function run() {
      if (!profileId) {
        // No profile, no deadlines to plan backwards from.
        setLoading(false);
        return;
      }
      setLoading(true);
      setError("");
      try {
        const [deadlineRes, savedRes] = await Promise.all([
          fetch(`/api/deadlines?profileId=${profileId}`, { signal: controller.signal }),
          // Best effort: this only adds the destination country, which decides
          // whether a country-specific step (the German VPD) belongs in a plan.
          fetch(`/api/saved-universities?profileId=${profileId}`, { signal: controller.signal }).catch(() => null),
        ]);

        const deadlineData = await deadlineRes.json().catch(() => null);
        if (!deadlineRes.ok || !Array.isArray(deadlineData?.items)) {
          if (live) setError(t("loadError"));
          return;
        }

        const list: { name: string; country: string; id: number | null }[] = [];
        if (savedRes?.ok) {
          const savedData = await savedRes.json().catch(() => null);
          if (Array.isArray(savedData?.savedUniversities)) {
            for (const row of savedData.savedUniversities as SavedUniversityRow[]) {
              const name = row.university?.name?.trim();
              const country = row.university?.country?.trim();
              if (!name || !country) continue;
              list.push({ name, country, id: row.university?.id ?? null });
            }
          }
        }

        if (!live) return;
        setRows(deadlineData.items as DeadlineRow[]);
        setUniCountries(list);
      } catch (err) {
        if ((err as Error)?.name === "AbortError") return;
        if (live) setError(t("loadError"));
      } finally {
        if (live) setLoading(false);
      }
    }

    return () => {
      live = false;
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [profileId, t]);

  /* ---- build the timeline ------------------------------------------------ */
  const timeline: SmartTimeline = React.useMemo(() => {
    // An application row's title is "<university> — <program>", so the saved
    // university's country is attached by prefix match. Without a country the
    // plan still runs; only the Germany-specific step is skipped, and it says
    // that the destination is unknown rather than pretending it is not Germany.
    const countryFor = (row: DeadlineRow): string | null => {
      const title = row.title?.trim() ?? "";
      const hit = uniCountries.find((uni) => title === uni.name || title.startsWith(`${uni.name} —`));
      return hit?.country ?? null;
    };

    const deadlines: TimelineDeadline[] = rows
      .filter((row) => PLANNED_TYPES.has(String(row.type ?? "")))
      .map((row) => ({
        id: row.id ?? null,
        label: row.title?.trim() || t("untitledDeadline"),
        date: row.date ?? null,
        kind:
          row.type === "scholarship"
            ? ("scholarship" as const)
            : row.type === "visa"
              ? ("visa" as const)
              : ("application" as const),
        country: countryFor(row),
        universityId:
          row.id && row.id.startsWith("uni-") ? Number(row.id.slice(4)) || null : null,
      }));

    const tests: TimelineTest[] = rows
      .filter((row) => row.type === "test" && row.testType)
      .map((row) => ({
        id: row.id ?? null,
        testType: String(row.testType),
        date: row.date ?? null,
        label: row.title ?? null,
      }));

    return buildSmartTimeline(deadlines, tests);
  }, [rows, uniCountries, t]);

  /** Tasks the student already has, so a second sync cannot duplicate them. */
  const existingTaskTitles = React.useMemo(
    () => new Set(rows.filter((row) => row.type === "milestone").map((row) => (row.title ?? "").trim().toLowerCase())),
    [rows]
  );

  const datedPlans = React.useMemo(
    () => timeline.plans.filter((plan) => plan.date != null),
    [timeline.plans]
  );
  const visiblePlans = showAll ? datedPlans : datedPlans.slice(0, 3);

  /* ---- sync one plan into /api/tasks ------------------------------------- */
  const syncPlan = async (plan: DeadlinePlan) => {
    const key = plan.deadline.id ?? plan.deadline.label;
    if (syncing) return;
    setSyncing(key);
    setSyncError("");
    try {
      const drafts = milestoneTaskDrafts(plan, (milestoneId, deadlineLabel) =>
        t(`taskTitle.${milestoneId}`, { deadline: deadlineLabel })
      ).filter((draft) => !existingTaskTitles.has(draft.title.trim().toLowerCase()));

      if (drafts.length === 0) {
        setSynced((prev) => ({ ...prev, [key]: 0 }));
        return;
      }

      let written = 0;
      for (const draft of drafts) {
        const res = await fetch("/api/tasks", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            profileId,
            title: draft.title,
            dueDate: draft.dueDate,
            category: draft.category,
            priority: draft.priority,
            universityId: draft.universityId ?? undefined,
          }),
        });
        if (res.ok) written += 1;
      }
      setSynced((prev) => ({ ...prev, [key]: written }));
      if (written > 0) onTasksSynced?.(written);
      if (written < drafts.length) setSyncError(t("syncPartial", { written, total: drafts.length }));
    } catch {
      setSyncError(t("syncError"));
    } finally {
      setSyncing(null);
    }
  };

  const togglePlan = (key: string) =>
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });

  const formatDate = (ymd: string | null): string => {
    if (!ymd) return t("noDate");
    const date = new Date(`${ymd}T00:00:00Z`);
    return Number.isNaN(date.getTime())
      ? ymd
      : date.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric", timeZone: "UTC" });
  };

  return (
    <section className={`rounded-2xl border border-slate-200 bg-white p-4 sm:p-5 ${className}`} aria-labelledby="smart-timeline-title">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 id="smart-timeline-title" className="flex items-center gap-2 text-sm font-extrabold text-slate-900">
            <CalendarClock className="h-4 w-4 text-indigo-600" aria-hidden />
            {t("title")}
          </h3>
          <p className="mt-1 max-w-2xl break-words text-[11px] leading-relaxed text-slate-500">
            {t("subtitle", {
              examLead: MIN_EXAM_LEAD_DAYS,
              tight: TIGHT_DEADLINE_DAYS,
            })}
          </p>
        </div>
        <div className="flex shrink-0 flex-wrap gap-1.5">
          <span className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-[10px] font-bold text-slate-600">
            {t("counts.deadlines", { count: timeline.counts.deadlines })}
          </span>
          <span className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-[10px] font-bold text-slate-600">
            {t("counts.steps", { count: timeline.counts.milestones })}
          </span>
          {timeline.counts.overdue > 0 && (
            <span className="rounded-full border border-rose-200 bg-rose-50 px-2.5 py-1 text-[10px] font-bold text-rose-700 dark:border-rose-500/30 dark:bg-rose-500/10 dark:text-rose-200">
              {t("counts.overdue", { count: timeline.counts.overdue })}
            </span>
          )}
        </div>
      </div>

      {loading && (
        <p className="mt-3 flex items-center gap-2 text-xs font-semibold text-slate-500">
          <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />
          {t("loading")}
        </p>
      )}

      {!loading && error && (
        <p role="alert" className="mt-3 break-words rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-semibold text-rose-800 dark:border-rose-500/30 dark:bg-rose-500/10 dark:text-rose-200">
          {error}
        </p>
      )}

      {!loading && !error && (
        <>
          {/* ---- conflicts: the plan's own contradictions, critical first ---- */}
          {timeline.conflicts.length > 0 && (
            <div className="mt-3 space-y-1.5">
              {timeline.conflicts.map((conflict, index) => {
                const Icon = conflict.severity === "critical" ? OctagonAlert : AlertTriangle;
                return (
                  <p
                    key={`${conflict.id}-${index}`}
                    role={conflict.severity === "critical" ? "alert" : "status"}
                    className={`flex items-start gap-2 rounded-xl border px-3 py-2 text-[11px] font-semibold leading-relaxed ${SEVERITY_TONE[conflict.severity]}`}
                  >
                    <Icon className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden />
                    <span className="min-w-0 break-words whitespace-normal">
                      {t(`conflicts.${conflict.id}`, {
                        deadline: conflict.deadlineLabel,
                        test: conflict.testType ? conflict.testType.toUpperCase() : "",
                        gapDays: conflict.numbers.gapDays ?? 0,
                        minimumDays: conflict.numbers.minimumDays ?? MIN_EXAM_LEAD_DAYS,
                        daysOverdue: conflict.numbers.daysOverdue ?? 0,
                        offsetDays: conflict.numbers.offsetDays ?? 0,
                        deadlineDate: formatDate(conflict.dates.deadline ?? null),
                        examDate: formatDate(conflict.dates.exam ?? null),
                        milestoneDate: formatDate(conflict.dates.milestone ?? null),
                      })}
                    </span>
                  </p>
                );
              })}
            </div>
          )}

          {timeline.conflicts.length === 0 && datedPlans.length > 0 && (
            <p className="mt-3 flex items-start gap-2 break-words rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-[11px] font-semibold leading-relaxed text-emerald-800 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-100">
              <Check className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden />
              {t("noConflicts", { count: datedPlans.length })}
            </p>
          )}

          {/* ---- one backwards plan per dated deadline ---- */}
          {visiblePlans.length === 0 && !loading && (
            <p className="mt-3 break-words rounded-xl border border-dashed border-slate-200 px-3 py-3 text-[11px] leading-relaxed text-slate-500">
              {timeline.counts.undatedDeadlines > 0 ? t("emptyUndated", { count: timeline.counts.undatedDeadlines }) : t("empty")}
            </p>
          )}

          <div className="mt-3 space-y-2">
            {visiblePlans.map((plan) => {
              const key = plan.deadline.id ?? plan.deadline.label;
              const open = expanded.has(key);
              const applicable = plan.milestones.filter((milestone) => milestone.applies);
              const skipped = plan.milestones.filter((milestone) => !milestone.applies);
              const syncCount = synced[key];

              return (
                <article key={key} className="rounded-xl border border-slate-200">
                  <div className="flex flex-wrap items-start justify-between gap-2 p-3">
                    <div className="min-w-0">
                      <p className="break-words text-xs font-extrabold text-slate-900">{plan.deadline.label}</p>
                      <p className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[11px] text-slate-600">
                        <span className="inline-flex items-center gap-1 font-semibold">
                          <Clock className="h-3 w-3" aria-hidden />
                          {formatDate(plan.date)}
                        </span>
                        {plan.daysUntilDeadline != null && (
                          <span
                            className={`font-bold ${
                              plan.daysUntilDeadline < 0
                                ? "text-rose-700 dark:text-rose-300"
                                : plan.daysUntilDeadline <= TIGHT_DEADLINE_DAYS
                                  ? "text-amber-700 dark:text-amber-300"
                                  : "text-emerald-700 dark:text-emerald-300"
                            }`}
                          >
                            {plan.daysUntilDeadline < 0
                              ? t("daysAgo", { days: Math.abs(plan.daysUntilDeadline) })
                              : t("daysLeft", { days: plan.daysUntilDeadline })}
                          </span>
                        )}
                        {plan.deadline.country && (
                          <span className="text-slate-500">{plan.deadline.country}</span>
                        )}
                      </p>
                      {plan.overdue.length > 0 && (
                        <p className="mt-1 break-words text-[11px] font-bold text-rose-700 dark:text-rose-300">
                          {t("overdueSteps", { count: plan.overdue.length })}
                        </p>
                      )}
                    </div>

                    <div className="flex shrink-0 flex-wrap items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => void syncPlan(plan)}
                        disabled={syncing != null}
                        title={t("syncHint")}
                        className="flex min-h-11 items-center gap-1 rounded-xl bg-indigo-600 px-3 py-2 text-[11px] font-bold text-white shadow-xs transition-colors hover:bg-indigo-700 disabled:opacity-60"
                      >
                        {syncing === key ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />
                        ) : syncCount != null ? (
                          <Check className="h-3.5 w-3.5" aria-hidden />
                        ) : (
                          <ListChecks className="h-3.5 w-3.5" aria-hidden />
                        )}
                        {syncCount != null
                          ? syncCount > 0
                            ? t("synced", { count: syncCount })
                            : t("syncedNone")
                          : t("sync")}
                      </button>
                      <button
                        type="button"
                        onClick={() => togglePlan(key)}
                        aria-expanded={open}
                        className="flex min-h-11 min-w-11 items-center justify-center gap-1 rounded-xl border border-slate-200 px-2 py-2 text-[11px] font-bold text-slate-700 hover:bg-slate-50"
                      >
                        {open ? <ChevronUp className="h-3.5 w-3.5" aria-hidden /> : <ChevronDown className="h-3.5 w-3.5" aria-hidden />}
                        {t(open ? "hideSteps" : "showSteps", { count: applicable.length })}
                      </button>
                    </div>
                  </div>

                  {open && (
                    <div className="border-t border-slate-100 p-3">
                      <ol className="space-y-1.5">
                        {applicable.map((milestone) => {
                          const overdue = milestone.daysOverdue > 0;
                          return (
                            <li
                              key={milestone.id}
                              className={`flex items-start gap-2 rounded-lg border px-2.5 py-1.5 ${
                                overdue
                                  ? "border-rose-200 bg-rose-50 dark:border-rose-500/30 dark:bg-rose-500/10"
                                  : "border-slate-200 bg-white"
                              }`}
                            >
                              <span
                                className={`mt-0.5 shrink-0 rounded-md px-1.5 py-0.5 text-[10px] font-extrabold ${
                                  overdue
                                    ? "bg-rose-600 text-white"
                                    : "bg-slate-100 text-slate-700"
                                }`}
                              >
                                D−{milestone.offsetDays}
                              </span>
                              <span className="min-w-0 flex-1">
                                <span className="block break-words text-[11px] font-bold text-slate-800">
                                  {t(`milestones.${milestone.id}.label`)}
                                </span>
                                <span className="block break-words text-[10px] leading-relaxed text-slate-600 whitespace-normal">
                                  {t(`milestones.${milestone.id}.why`)}
                                </span>
                              </span>
                              <span className={`shrink-0 text-right text-[10px] font-bold ${overdue ? "text-rose-700 dark:text-rose-200" : "text-slate-600"}`}>
                                {formatDate(milestone.dueDate)}
                                {overdue && (
                                  <span className="block font-semibold">
                                    {t("overdueBy", { days: milestone.daysOverdue })}
                                  </span>
                                )}
                              </span>
                            </li>
                          );
                        })}
                      </ol>

                      {skipped.length > 0 && (
                        <p className="mt-2 break-words text-[10px] leading-relaxed text-slate-500">
                          {skipped
                            .map((milestone) =>
                              t(`milestones.${milestone.id as MilestoneId}.skipped.${milestone.notApplicableReason ?? "country_unknown"}`)
                            )
                            .join(" · ")}
                        </p>
                      )}
                    </div>
                  )}
                </article>
              );
            })}
          </div>

          {datedPlans.length > visiblePlans.length && (
            <button
              type="button"
              onClick={() => setShowAll(true)}
              className="mt-2 flex min-h-11 items-center gap-1 text-[11px] font-bold text-indigo-700 hover:underline"
            >
              <ChevronDown className="h-3.5 w-3.5" aria-hidden />
              {t("showAllPlans", { count: datedPlans.length - visiblePlans.length })}
            </button>
          )}

          {/* ---- the flat, nearest-first list: what to do this week ---- */}
          {timeline.allMilestones.length > 0 && (
            <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-3">
              <p className="text-[11px] font-bold uppercase tracking-wide text-slate-500">{t("nextUpTitle")}</p>
              <ul className="mt-2 space-y-1">
                {timeline.allMilestones.slice(0, 6).map((entry, index) => (
                  <li key={`${entry.deadlineId ?? entry.deadlineLabel}-${entry.milestone.id}-${index}`} className="flex flex-wrap items-baseline gap-x-2 text-[11px]">
                    <span className="font-extrabold text-slate-800">{formatDate(entry.milestone.dueDate)}</span>
                    <span className="min-w-0 break-words font-semibold text-slate-700 whitespace-normal">
                      {t(`milestones.${entry.milestone.id}.label`)}
                    </span>
                    <span className="min-w-0 break-words text-slate-500 whitespace-normal">· {entry.deadlineLabel}</span>
                    {entry.milestone.daysOverdue > 0 && (
                      <span className="inline-flex items-center gap-1 font-bold text-rose-700 dark:text-rose-300">
                        <CircleAlert className="h-3 w-3" aria-hidden />
                        {t("overdueBy", { days: entry.milestone.daysOverdue })}
                      </span>
                    )}
                  </li>
                ))}
              </ul>
              {onNavigateTab && (
                <button
                  type="button"
                  onClick={() => onNavigateTab("tasks")}
                  className="mt-2 flex min-h-11 items-center gap-1 text-[11px] font-bold text-indigo-700 hover:underline"
                >
                  {t("openTasks")}
                </button>
              )}
            </div>
          )}

          {syncError && (
            <p role="alert" className="mt-3 break-words rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-[11px] font-semibold text-rose-800 dark:border-rose-500/30 dark:bg-rose-500/10 dark:text-rose-200">
              {syncError}
            </p>
          )}
        </>
      )}

      <AppNote kind="planning" className="mt-3 border-t border-slate-100 pt-3" />
    </section>
  );
}

export default SmartTimelineCalendar;
