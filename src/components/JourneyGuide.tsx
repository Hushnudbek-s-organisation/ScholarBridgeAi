"use client";

import React, { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { motion } from "framer-motion";
import {
  ArrowRight,
  Award,
  Check,
  ChevronDown,
  ChevronUp,
  FileText,
  Map as MapIcon,
  Mic,
  Plane,
  Search,
  Send,
  Target,
  UserRound,
} from "lucide-react";
import { AnimatedBar } from "./motion";

interface Step {
  id: string;
  tab: string;
  title: string | null;
  description: string | null;
  done: boolean;
  progress: number;
  current: boolean;
}

interface JourneyData {
  steps: Step[];
  doneCount: number;
  total: number;
  percent: number;
  currentId: string | null;
}

const ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  profile: UserRound,
  explore: Search,
  chances: Target,
  funding: Award,
  materials: FileText,
  apply: Send,
  visa: Mic,
  departure: Plane,
};

/**
 * "Your path" — the whole study-abroad process as 8 plain steps (inspired by
 * ApplyBoard's Register → Search → Apply → Funding → Visa flow). Each step is
 * ticked automatically from the student's real data and exactly one step is
 * highlighted as "do this now", so a newcomer always knows where to start.
 */
export function JourneyGuide({ profileId, onNavigate }: { profileId: number | null; onNavigate: (tab: string) => void }) {
  const t = useTranslations("journey");
  const [data, setData] = useState<JourneyData | null>(null);
  const [failed, setFailed] = useState(false);
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    if (!profileId) return;
    let live = true;
    fetch(`/api/journey?profileId=${profileId}`, { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(String(r.status)))))
      .then((d: JourneyData) => {
        if (live) setData(d);
      })
      .catch(() => {
        if (live) setFailed(true);
      });
    return () => {
      live = false;
    };
  }, [profileId]);

  if (!profileId || failed) return null;

  const stepTitle = (s: Step) => s.title || t(`steps.${s.id}.title`);
  const stepDesc = (s: Step) => s.description || t(`steps.${s.id}.desc`);
  const current = data?.steps.find((s) => s.current) ?? null;

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs sm:p-5" aria-labelledby="journey-title">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 id="journey-title" className="flex items-center gap-2 text-base font-extrabold text-slate-900 sm:text-lg">
            <MapIcon className="h-5 w-5 text-indigo-600" /> {t("title")}
          </h2>
          <p className="mt-0.5 text-xs text-slate-500">{t("subtitle")}</p>
        </div>
        {data && (
          <div className="flex items-center gap-2">
            <span className="text-2xl font-black text-indigo-600">{data.percent}%</span>
            <span className="text-[11px] font-semibold leading-tight text-slate-500">
              {t("stepsDone", { done: data.doneCount, total: data.total })}
            </span>
          </div>
        )}
      </div>

      {data ? (
        <>
          <div className="mt-3">
            <AnimatedBar value={data.percent} trackClassName="h-2 w-full overflow-hidden rounded-full bg-slate-100" barClassName="bg-gradient-to-r from-indigo-500 to-violet-500" />
          </div>

          {/* The one thing to do now */}
          {current ? (
            <motion.div
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              className="mt-4 flex flex-col gap-3 rounded-xl border border-indigo-200 bg-indigo-50 p-3 sm:flex-row sm:items-center"
            >
              <div className="flex min-w-0 flex-1 items-start gap-3">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-indigo-600 text-white">
                  {React.createElement(ICONS[current.id] ?? MapIcon, { className: "h-4 w-4" })}
                </span>
                <div className="min-w-0">
                  <p className="text-[10px] font-bold uppercase tracking-wide text-indigo-600">{t("nowLabel")}</p>
                  <p className="text-sm font-bold text-slate-900">{stepTitle(current)}</p>
                  <p className="mt-0.5 text-xs leading-relaxed text-slate-600">{stepDesc(current)}</p>
                </div>
              </div>
              <button
                onClick={() => onNavigate(current.tab)}
                className="inline-flex shrink-0 items-center justify-center gap-1.5 rounded-xl bg-indigo-600 px-4 py-2.5 text-xs font-bold text-white shadow-sm hover:bg-indigo-700"
              >
                {t("start")} <ArrowRight className="h-3.5 w-3.5" />
              </button>
            </motion.div>
          ) : (
            <p className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm font-semibold text-emerald-800">{t("allDone")}</p>
          )}

          {/* All steps: horizontal rail on wide screens, list when expanded */}
          <ol className="no-scrollbar mt-4 hidden gap-2 overflow-x-auto md:grid md:grid-cols-4 xl:grid-cols-8">
            {data.steps.map((s, i) => {
              const Icon = ICONS[s.id] ?? MapIcon;
              return (
                <li key={s.id}>
                  <button
                    onClick={() => onNavigate(s.tab)}
                    className={`group flex h-full w-full flex-col items-start gap-1.5 rounded-xl border p-2.5 text-left transition-all hover:-translate-y-0.5 hover:shadow-sm ${
                      s.current ? "border-indigo-300 bg-indigo-50" : s.done ? "border-emerald-200 bg-emerald-50" : "border-slate-200 bg-white"
                    }`}
                    title={stepDesc(s)}
                  >
                    <span className="flex w-full items-center justify-between">
                      <span
                        className={`flex h-6 w-6 items-center justify-center rounded-full text-[11px] font-bold ${
                          s.done ? "bg-emerald-500 text-white" : s.current ? "bg-indigo-600 text-white" : "bg-slate-100 text-slate-500"
                        }`}
                      >
                        {s.done ? <Check className="h-3.5 w-3.5" /> : i + 1}
                      </span>
                      <Icon className={`h-4 w-4 ${s.done ? "text-emerald-500" : s.current ? "text-indigo-500" : "text-slate-300"}`} />
                    </span>
                    <span className="text-[11px] font-bold leading-tight text-slate-800">{stepTitle(s)}</span>
                  </button>
                </li>
              );
            })}
          </ol>

          <div className="md:hidden">
            <button
              onClick={() => setExpanded((v) => !v)}
              className="mt-3 inline-flex items-center gap-1 text-xs font-bold text-indigo-600"
              aria-expanded={expanded}
            >
              {expanded ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
              {expanded ? t("hideSteps") : t("showSteps", { total: data.total })}
            </button>
            {expanded && (
              <ol className="mt-2 space-y-1.5">
                {data.steps.map((s, i) => (
                  <li key={s.id}>
                    <button
                      onClick={() => onNavigate(s.tab)}
                      className={`flex w-full items-center gap-2.5 rounded-xl border px-3 py-2 text-left ${
                        s.current ? "border-indigo-300 bg-indigo-50" : s.done ? "border-emerald-200 bg-emerald-50" : "border-slate-200"
                      }`}
                    >
                      <span
                        className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[11px] font-bold ${
                          s.done ? "bg-emerald-500 text-white" : s.current ? "bg-indigo-600 text-white" : "bg-slate-100 text-slate-500"
                        }`}
                      >
                        {s.done ? <Check className="h-3.5 w-3.5" /> : i + 1}
                      </span>
                      <span className="min-w-0 flex-1 truncate text-xs font-semibold text-slate-800">{stepTitle(s)}</span>
                      <ArrowRight className="h-3.5 w-3.5 shrink-0 text-slate-300" />
                    </button>
                  </li>
                ))}
              </ol>
            )}
          </div>
        </>
      ) : (
        <div className="mt-4 space-y-2" aria-hidden>
          <div className="h-2 animate-pulse rounded-full bg-slate-100" />
          <div className="h-16 animate-pulse rounded-xl bg-slate-100" />
        </div>
      )}
    </section>
  );
}
