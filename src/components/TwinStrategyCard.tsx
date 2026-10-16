"use client";

/**
 * Priority 5.5 — Admitted Student Twin: the gap and the three-step blueprint.
 *
 * "You are a 78% match" tells a student nothing they can act on. This card takes
 * the admitted student whose public record overlaps theirs most (`pickTwin` over
 * `/api/stories?sort=twin`) and shows the comparison that matters: row by row,
 * my GPA against theirs, my English score against theirs, my recorded research
 * and activities against theirs — with the gap in the row's own unit.
 *
 * Then it converts the gap into at most three prioritised actions and can write
 * the first one into the student's goal planner in a single click.
 *
 * Honesty rules the engine enforces and the card never overrides:
 *   • a row where either side has no data is `unknown`, not a win and not a loss;
 *   • IELTS is only ever compared with IELTS and TOEFL with TOEFL;
 *   • when nothing at all is comparable the card says so and points at the
 *     profile fields to fill in, instead of rendering an empty table.
 */
import React from "react";
import { useTranslations } from "next-intl";
import {
  ArrowRight,
  Award,
  Check,
  GraduationCap,
  Loader2,
  Minus,
  Quote,
  Target,
  TrendingDown,
  TrendingUp,
  Users,
} from "lucide-react";
import { AppNote } from "@/components/AppNote";
import {
  buildTwinStrategy,
  pickTwin,
  twinGoalPayload,
  type DeltaState,
  type TwinAction,
  type TwinInput,
  type TwinMeInput,
  type TwinStrategy,
} from "@/lib/twinStrategy";

const DELTA_TONE: Record<DeltaState, string> = {
  ahead: "border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-100",
  even: "border-sky-200 bg-sky-50 text-sky-800 dark:border-sky-500/30 dark:bg-sky-500/10 dark:text-sky-100",
  behind: "border-rose-200 bg-rose-50 text-rose-800 dark:border-rose-500/30 dark:bg-rose-500/10 dark:text-rose-100",
  unknown: "border-slate-200 bg-slate-50 text-slate-600 dark:border-slate-700 dark:bg-slate-800/60 dark:text-slate-300",
};

const DELTA_ICON: Record<DeltaState, React.ComponentType<{ className?: string }>> = {
  ahead: TrendingUp,
  even: Minus,
  behind: TrendingDown,
  unknown: Minus,
};

export interface TwinStrategyCardProps {
  profileId?: number | null;
  /**
   * The student's own record. Optional: when the host only has an id, the card
   * loads the profile itself, so it can be mounted anywhere without widening
   * that host's prop contract.
   */
  profile?: TwinMeInput | null;
  onNavigateTab?: (id: string) => void;
  className?: string;
}

export function TwinStrategyCard({ profileId, profile, onNavigateTab, className = "" }: TwinStrategyCardProps) {
  const t = useTranslations("twin");
  const [stories, setStories] = React.useState<TwinInput[]>([]);
  const [loadedProfile, setLoadedProfile] = React.useState<TwinMeInput | null>(null);
  // A profile handed in by the host wins; the fetched one is only the fallback
  // for hosts that have nothing but an id. Deriving it here (rather than
  // mirroring the prop into state) keeps the two from ever disagreeing.
  const me = profile ?? loadedProfile;
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState("");
  const [goalBusy, setGoalBusy] = React.useState<TwinAction["id"] | null>(null);
  const [goalDone, setGoalDone] = React.useState<Record<string, boolean>>({});
  const [goalError, setGoalError] = React.useState("");

  /* ---- load the student's own record when the host only passed an id ---- */
  React.useEffect(() => {
    if (profile || !profileId) return;
    let live = true;
    const controller = new AbortController();
    (async () => {
      try {
        const res = await fetch(`/api/profiles/${profileId}`, { signal: controller.signal });
        const data = await res.json().catch(() => null);
        if (!res.ok || !live) return;
        const row = data?.profile ?? data;
        if (row && typeof row === "object") setLoadedProfile(row as TwinMeInput);
      } catch {
        /* the deltas simply render as "not provided" */
      }
    })();
    return () => {
      live = false;
      controller.abort();
    };
  }, [profile, profileId]);

  /* ---- the twin pool ------------------------------------------------------ */
  React.useEffect(() => {
    let live = true;
    const controller = new AbortController();
    (async () => {
      setLoading(true);
      setError("");
      try {
        const res = await fetch("/api/stories?sort=twin&limit=12", { signal: controller.signal });
        const data = await res.json().catch(() => null);
        if (!live) return;
        if (!res.ok || !Array.isArray(data?.items)) {
          setError(t("loadError"));
          return;
        }
        setStories(data.items as TwinInput[]);
      } catch (err) {
        if ((err as Error)?.name === "AbortError") return;
        if (live) setError(t("loadError"));
      } finally {
        if (live) setLoading(false);
      }
    })();
    return () => {
      live = false;
      controller.abort();
    };
  }, [t]);

  const twin = React.useMemo(() => pickTwin(stories), [stories]);
  const strategy: TwinStrategy = React.useMemo(() => buildTwinStrategy(me, twin), [me, twin]);

  /* ---- write one action into the goal planner ----------------------------- */
  const addGoal = async (action: TwinAction) => {
    if (!profileId) {
      setGoalError(t("goalNeedsProfile"));
      return;
    }
    if (goalBusy) return;
    setGoalBusy(action.id);
    setGoalError("");
    try {
      const steps = Array.from({ length: action.steps }, (_, index) =>
        t(`actions.${action.id}.step${index + 1}` as never, action.params as never)
      );
      const payload = twinGoalPayload(action, {
        title: t(`actions.${action.id}.title` as never, action.params as never),
        steps,
      });
      const res = await fetch("/api/goals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ profileId, ...payload }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        // A full goal planner (6 active goals) is an answer, not a crash.
        setGoalError(typeof data?.error === "string" && data.error.trim() ? data.error : t("goalFailed"));
        return;
      }
      setGoalDone((prev) => ({ ...prev, [action.id]: true }));
    } catch {
      setGoalError(t("goalFailed"));
    } finally {
      setGoalBusy(null);
    }
  };

  if (loading) {
    return (
      <section className={`rounded-2xl border border-slate-200 bg-white p-4 sm:p-5 ${className}`}>
        <p className="flex items-center gap-2 text-xs font-semibold text-slate-500">
          <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />
          {t("loading")}
        </p>
      </section>
    );
  }

  return (
    <section className={`rounded-2xl border border-slate-200 bg-white p-4 sm:p-5 ${className}`} aria-labelledby="twin-title">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 id="twin-title" className="flex items-center gap-2 text-sm font-extrabold text-slate-900">
            <Users className="h-4 w-4 text-indigo-600" aria-hidden />
            {t("title")}
          </h3>
          <p className="mt-1 max-w-2xl break-words text-[11px] leading-relaxed text-slate-500">{t("subtitle")}</p>
        </div>
        {strategy.twinScore != null && (
          <span className="shrink-0 rounded-xl border border-indigo-200 bg-indigo-50 px-3 py-1.5 text-xs font-extrabold text-indigo-800 dark:border-indigo-500/30 dark:bg-indigo-500/10 dark:text-indigo-100">
            {t("overlapScore", { score: strategy.twinScore })}
          </span>
        )}
      </div>

      {error && (
        <p role="alert" className="mt-3 break-words rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-semibold text-rose-800 dark:border-rose-500/30 dark:bg-rose-500/10 dark:text-rose-200">
          {error}
        </p>
      )}

      {!error && strategy.insufficient && (
        <p className="mt-3 break-words rounded-xl border border-dashed border-slate-200 px-3 py-3 text-[11px] leading-relaxed text-slate-600">
          {twin ? t("insufficientWithTwin") : t("insufficientNoTwin")}
        </p>
      )}

      {!error && !strategy.insufficient && strategy.twin && (
        <>
          {/* ---- who the twin is ---- */}
          <div className="mt-3 rounded-xl border border-slate-200 bg-slate-50 p-3">
            <p className="break-words text-xs font-extrabold text-slate-900">
              {strategy.twin.displayName?.trim() || t("anonymousTwin")}
              {strategy.twin.intakeYear ? (
                <span className="font-semibold text-slate-500"> · {t("intakeYear", { year: strategy.twin.intakeYear })}</span>
              ) : null}
            </p>
            <p className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 break-words text-[11px] text-slate-600">
              <GraduationCap className="h-3 w-3 shrink-0" aria-hidden />
              {strategy.twin.admittedUniversity?.trim() || t("unknownUniversity")}
              {strategy.twin.admittedCountry ? ` · ${strategy.twin.admittedCountry}` : ""}
              {strategy.twin.degreeLevel ? ` · ${strategy.twin.degreeLevel}` : ""}
              {strategy.twin.major ? ` · ${strategy.twin.major}` : ""}
            </p>
            {strategy.reasons.length > 0 && (
              <p className="mt-1.5 flex flex-wrap gap-1">
                {strategy.reasons.map((reason) => (
                  <span key={reason} className="rounded-full border border-slate-200 bg-white px-2 py-0.5 text-[10px] font-bold text-slate-600">
                    {t(`reasons.${reason}`)}
                  </span>
                ))}
              </p>
            )}
            {strategy.twin.scholarshipName && (
              <p className="mt-1.5 flex items-start gap-1.5 break-words text-[11px] font-semibold text-emerald-800 dark:text-emerald-200">
                <Award className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden />
                {t("twinScholarship", {
                  name: strategy.twin.scholarshipName,
                  amount: strategy.twin.scholarshipAmountUsd != null ? String(strategy.twin.scholarshipAmountUsd) : "",
                })}
              </p>
            )}
          </div>

          {/* ---- the side-by-side delta table ---- */}
          <div className="mt-3 overflow-hidden rounded-xl border border-slate-200">
            <div className="grid grid-cols-[1fr_auto_auto_auto] items-center gap-2 border-b border-slate-200 bg-slate-50 px-3 py-2 text-[10px] font-bold uppercase tracking-wide text-slate-500">
              <span className="min-w-0 break-words whitespace-normal">{t("table.dimension")}</span>
              <span className="min-w-0 break-words whitespace-normal">{t("table.you")}</span>
              <span className="min-w-0 break-words whitespace-normal">{t("table.twin")}</span>
              <span className="min-w-0 break-words whitespace-normal">{t("table.gap")}</span>
            </div>
            <ul className="divide-y divide-slate-100">
              {strategy.deltas.map((delta) => {
                const Icon = DELTA_ICON[delta.state];
                return (
                  <li
                    key={delta.id}
                    className="grid grid-cols-[1fr_auto_auto_auto] items-center gap-2 px-3 py-2"
                    data-delta-state={delta.state}
                  >
                    <span className="min-w-0 break-words text-[11px] font-bold text-slate-800 whitespace-normal">
                      {t(`deltas.${delta.id}.label`)}
                    </span>
                    <span className="min-w-0 break-words text-[11px] text-slate-700 whitespace-normal">
                      {delta.mine ?? t("notProvided")}
                    </span>
                    <span className="min-w-0 break-words text-[11px] text-slate-700 whitespace-normal">
                      {delta.theirs ?? t("notProvided")}
                    </span>
                    <span
                      title={
                        delta.comparable
                          ? t(`deltas.${delta.id}.compareNote`)
                          : t(`deltas.${delta.id}.notComparable`)
                      }
                      className={`inline-flex shrink-0 items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-extrabold ${DELTA_TONE[delta.state]}`}
                    >
                      <Icon className="h-3 w-3" aria-hidden />
                      {delta.comparable
                        ? delta.gap != null && delta.gap !== 0
                          ? t(`gapUnit.${delta.unit ?? "count"}`, { gap: Math.abs(delta.gap) })
                          : t("gapEven")
                        : t("gapUnknown")}
                    </span>
                  </li>
                );
              })}
            </ul>
          </div>

          {strategy.unknowns.length > 0 && (
            <p className="mt-2 break-words text-[11px] leading-relaxed text-slate-500">
              {t("unknownsNote", {
                rows: strategy.unknowns.map((id) => t(`deltas.${id}.label`)).join(" · "),
              })}
            </p>
          )}

          {/* ---- the three-step blueprint ---- */}
          {strategy.actions.length > 0 && (
            <div className="mt-4">
              <p className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wide text-slate-500">
                <Target className="h-3.5 w-3.5" aria-hidden />
                {t("blueprintTitle", { count: strategy.actions.length })}
              </p>
              <ol className="mt-2 space-y-2">
                {strategy.actions.map((action) => (
                  <li key={action.id} className="rounded-xl border border-slate-200 p-3">
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="break-words text-xs font-extrabold text-slate-900">
                          <span className="mr-1.5 inline-flex h-5 w-5 items-center justify-center rounded-full bg-indigo-600 text-[10px] font-extrabold text-white">
                            {action.priority}
                          </span>
                          {t(`actions.${action.id}.title` as never, action.params as never)}
                        </p>
                        <p className="mt-1 break-words text-[11px] leading-relaxed text-slate-600">
                          {t(`actions.${action.id}.why` as never, action.params as never)}
                        </p>
                        <ul className="mt-1.5 space-y-0.5">
                          {Array.from({ length: action.steps }, (_, index) => (
                            <li key={index} className="flex items-start gap-1.5 break-words text-[11px] leading-relaxed text-slate-600">
                              <ArrowRight className="mt-0.5 h-3 w-3 shrink-0 text-indigo-500" aria-hidden />
                              {t(`actions.${action.id}.step${index + 1}` as never, action.params as never)}
                            </li>
                          ))}
                        </ul>
                      </div>
                      <div className="flex shrink-0 flex-col items-end gap-1.5">
                        <button
                          type="button"
                          onClick={() => void addGoal(action)}
                          disabled={goalBusy != null || !profileId || !!goalDone[action.id]}
                          title={profileId ? t("addGoalHint") : t("goalNeedsProfile")}
                          className={`flex min-h-11 items-center gap-1 rounded-xl px-3 py-2 text-[11px] font-bold transition-colors disabled:cursor-not-allowed ${
                            goalDone[action.id]
                              ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-500/15 dark:text-emerald-100"
                              : "bg-indigo-600 text-white shadow-xs hover:bg-indigo-700 disabled:opacity-60"
                          }`}
                        >
                          {goalBusy === action.id ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />
                          ) : goalDone[action.id] ? (
                            <Check className="h-3.5 w-3.5" aria-hidden />
                          ) : (
                            <Target className="h-3.5 w-3.5" aria-hidden />
                          )}
                          {goalDone[action.id] ? t("goalAdded") : t("addGoal")}
                        </button>
                        {onNavigateTab && action.tab && (
                          <button
                            type="button"
                            onClick={() => onNavigateTab(action.tab)}
                            className="flex min-h-11 items-center gap-1 rounded-xl border border-slate-200 px-3 py-2 text-[11px] font-bold text-slate-700 hover:bg-slate-50"
                          >
                            {t(`actions.${action.id}.open` as never)}
                            <ArrowRight className="h-3 w-3" aria-hidden />
                          </button>
                        )}
                      </div>
                    </div>
                  </li>
                ))}
              </ol>
            </div>
          )}

          {strategy.twin.advice?.trim() && (
            <figure className="mt-3 rounded-xl border border-violet-200 bg-violet-50 p-3 dark:border-violet-500/30 dark:bg-violet-500/10">
              <blockquote className="break-words text-[11px] leading-relaxed text-violet-900 dark:text-violet-100">
                <Quote className="mr-1 inline h-3 w-3 align-[-1px]" aria-hidden />
                {strategy.twin.advice}
              </blockquote>
              <figcaption className="mt-1 text-[10px] font-bold text-violet-700 dark:text-violet-200">
                {t("adviceFrom", { name: strategy.twin.displayName?.trim() || t("anonymousTwin") })}
              </figcaption>
            </figure>
          )}

          {goalError && (
            <p role="alert" className="mt-3 break-words rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-[11px] font-semibold text-rose-800 dark:border-rose-500/30 dark:bg-rose-500/10 dark:text-rose-200">
              {goalError}
            </p>
          )}
        </>
      )}

      <AppNote kind="community" className="mt-3 border-t border-slate-100 pt-3" />
    </section>
  );
}

export default TwinStrategyCard;
