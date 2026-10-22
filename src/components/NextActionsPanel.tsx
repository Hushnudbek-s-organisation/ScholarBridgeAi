"use client";

import React, { useCallback, useEffect, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { ArrowRight, Loader2, ListChecks, AlertTriangle } from "lucide-react";
import { StudentProfile } from "./Navbar";

/**
 * "What should I do next?" — the dashboard centrepiece (#4).
 *
 * Three actions, in priority order, with the reason attached. The ordering is
 * decided server-side by src/lib/nextActions.ts (deterministic and tested);
 * this component only renders it and wires the CTA to the right tab.
 */

type Urgency = "critical" | "high" | "medium" | "low";

interface NextAction {
  id: string;
  title: string;
  why: string;
  urgency: Urgency;
  target: string;
  score: number;
  dueInDays: number | null;
}

const URGENCY_STYLE: Record<Urgency, { chip: string; bar: string }> = {
  critical: { chip: "bg-red-50 text-red-700 border-red-200 dark:bg-red-950/40 dark:text-red-200 dark:border-red-800", bar: "bg-red-500" },
  high: { chip: "bg-orange-50 text-orange-700 border-orange-200 dark:bg-orange-950/40 dark:text-orange-200 dark:border-orange-800", bar: "bg-orange-500" },
  medium: { chip: "bg-yellow-50 text-yellow-800 border-yellow-200 dark:bg-yellow-950/40 dark:text-yellow-200 dark:border-yellow-800", bar: "bg-yellow-500" },
  low: { chip: "bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-200 dark:border-slate-700", bar: "bg-slate-400" },
};


function localizedActionCopy(
  action: NextAction,
  locale: string,
  t: ReturnType<typeof useTranslations<"nextActions">>,
): { title: string; why: string } {
  if (locale === "en") return { title: action.title, why: action.why };
  const countFromTitle = (pattern: RegExp) => Number(action.title.match(pattern)?.[1] ?? 0);
  if (action.id.startsWith("deadline-")) {
    return { title: t("actions.deadlineTitle", { item: action.title.split(": ").slice(1).join(": ") || action.title }), why: t("actions.deadlineWhy") };
  }
  if (action.id === "build-shortlist") return { title: t("actions.shortlistTitle"), why: t("actions.shortlistWhy") };
  if (action.id.startsWith("essay-")) return { title: t("actions.essayTitle", { university: action.title.replace(/^Review the essay task for /, "") }), why: t("actions.essayWhy") };
  if (action.id === "check-recommendations") return { title: t("actions.recommendationsTitle"), why: t("actions.recommendationsWhy") };
  if (action.id.startsWith("start-")) return { title: t("actions.applicationTitle", { university: action.title.replace(/^Start your /, "").replace(/ application$/, "") }), why: t("actions.applicationWhy") };
  if (action.id === "scholarship-portfolio") return { title: t("actions.fundingTitle"), why: t("actions.fundingWhy") };
  if (action.id === "review-open-tasks") return { title: t("actions.tasksTitle", { count: countFromTitle(/Review (\d+)/) }), why: t("actions.tasksWhy") };
  if (action.id === "report-outcomes") return { title: t("actions.outcomesTitle", { count: countFromTitle(/(\d+) application/) }), why: t("actions.outcomesWhy") };
  if (action.id === "confirm-programme-deadlines") return { title: t("actions.confirmTitle"), why: t("actions.confirmWhy") };
  return { title: t("actions.reviewTitle"), why: t("actions.reviewWhy") };
}

interface NextActionsPanelProps {
  activeProfile: StudentProfile | null;
  onNavigate: (tab: string) => void;
}

export function NextActionsPanel({ activeProfile, onNavigate }: NextActionsPanelProps) {
  const t = useTranslations("nextActions");
  const locale = useLocale();
  const profileId = activeProfile?.id;
  const [actions, setActions] = useState<NextAction[]>([]);
  const [rest, setRest] = useState<NextAction[]>([]);
  const [criticalCount, setCriticalCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [showAll, setShowAll] = useState(false);
  const [loadFailed, setLoadFailed] = useState(false);

  const load = useCallback(async () => {
    if (!profileId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`/api/next-actions?profileId=${profileId}`);
      const data = await res.json();
      if (res.ok) {
        setActions(data.actions ?? []);
        setRest(data.rest ?? []);
        setCriticalCount(data.criticalCount ?? 0);
        setLoadFailed(false);
      } else setLoadFailed(true);
    } catch {
      setLoadFailed(true);
    } finally {
      setLoading(false);
    }
  }, [profileId]);

  useEffect(() => {
    void Promise.resolve().then(load);
  }, [load]);

  if (!activeProfile) return null;

  const visible = showAll ? [...actions, ...rest] : actions;

  return (
    <div className="rounded-2xl border border-indigo-100 bg-white p-5 shadow-xs dark:border-indigo-900 dark:bg-slate-900">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <h2 className="flex items-center gap-2 text-base font-extrabold text-slate-900 dark:text-white">
            <ListChecks className="h-5 w-5 text-indigo-600" />
            {t("title")}
          </h2>
          <p className="mt-0.5 text-xs text-slate-600 dark:text-slate-300">{t("subtitle")}</p>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center gap-2 py-6 text-xs font-semibold text-slate-500">
          <Loader2 className="h-4 w-4 animate-spin motion-reduce:animate-none" aria-hidden="true" /> {t("loading")}
        </div>
      ) : loadFailed ? (
        <div role="alert" className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-800 dark:border-red-800 dark:bg-red-950/40 dark:text-red-200">
          <span>{t("loadFailed")}</span>
          <button type="button" onClick={load} className="min-h-11 rounded-lg border border-red-300 px-3 py-2 font-semibold hover:bg-red-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-700 dark:border-red-700 dark:hover:bg-red-900/50">{t("retry")}</button>
        </div>
      ) : visible.length === 0 ? (
        <p className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300">{t("empty")}</p>
      ) : (
        <ol className="mt-4 space-y-2.5">
          {visible.map((action, index) => {
            const style = URGENCY_STYLE[action.urgency] ?? URGENCY_STYLE.low;
            const copy = localizedActionCopy(action, locale, t);
            return (
              <li
                key={action.id}
                className="relative overflow-hidden rounded-xl border border-slate-200 bg-white pl-4 transition hover:border-indigo-200 dark:border-slate-700 dark:bg-slate-900 dark:hover:border-indigo-700"
              >
                <span className={`absolute left-0 top-0 h-full w-1 ${style.bar}`} aria-hidden />
                <div className="flex flex-wrap items-start gap-3 px-3 py-3">
                  <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-indigo-50 text-xs font-extrabold text-indigo-700 dark:bg-indigo-950 dark:text-indigo-200">
                    {index + 1}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="min-w-0 break-words text-sm font-bold text-slate-900 dark:text-white">{copy.title}</span>
                      <span className={`rounded-full border px-2 py-0.5 text-[10px] font-bold ${style.chip}`}>
                        {t(action.urgency === "critical" ? "urgencyCritical" : action.urgency === "high" ? "urgencyHigh" : action.urgency === "medium" ? "urgencyMedium" : "urgencyLow")}
                      </span>
                    </div>
                    <p className="mt-1 text-xs leading-relaxed text-slate-600 dark:text-slate-300">{copy.why}</p>
                  </div>
                  <button
                    onClick={() => onNavigate(action.target)}
                    aria-label={t("openAction", { title: copy.title })}
                    className="flex min-h-11 shrink-0 items-center gap-1 rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-indigo-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600"
                  >
                    {t("open")}
                    <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
                  </button>
                </div>
              </li>
            );
          })}
        </ol>
      )}

      {rest.length > 0 && (
        <button
          onClick={() => setShowAll((v) => !v)}
          className="mt-3 min-h-11 rounded-lg px-2 text-xs font-semibold text-indigo-600 hover:text-indigo-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600 dark:text-indigo-300"
        >
          {showAll ? t("showTop") : t("showMore", { count: rest.length })}
        </button>
      )}

      {criticalCount > 0 && (
        <p className="mt-3 flex items-center gap-1.5 text-[11px] font-semibold text-red-700 dark:text-red-300">
          <AlertTriangle className="h-3.5 w-3.5" aria-hidden="true" />
          {t(criticalCount === 1 ? "criticalOne" : "criticalMany", { count: criticalCount })}
        </p>
      )}
    </div>
  );
}
