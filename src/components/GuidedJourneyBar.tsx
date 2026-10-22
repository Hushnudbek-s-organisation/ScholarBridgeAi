"use client";

import React, { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import {
  Briefcase,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  FileText,
  GraduationCap,
  User,
} from "lucide-react";
import type { StudentProfile } from "./Navbar";
import { profileCompletenessRatio } from "@/lib/chancing";

/**
 * Guided journey bar (Pillar 3) — the four-stage path every new student
 * actually follows, pinned to the top of the app shell:
 *
 *   1. Profile & Goals  →  2. Choose universities & grants
 *   3. Documents & AI essay  →  4. Apply & visa
 *
 * It is DATA-DRIVEN, never decorative: each step's hint counts real saved
 * records, the active step is derived from the profile/shortlist/application
 * state, and every click navigates to the screen that moves that step forward.
 * The bar collapses to a slim progress line so returning users keep the map
 * without losing room (choice persisted in localStorage per profile).
 */

interface GuidedJourneyBarProps {
  activeProfile: StudentProfile | null;
  savedUniversityCount: number;
  savedScholarshipCount: number;
  onNavigate: (id: string) => void;
  onOpenProfileModal: () => void;
}

const STORAGE_KEY = "scholarbridge:guided-journey-collapsed";

function readCollapsed(): boolean {
  try {
    return localStorage.getItem(STORAGE_KEY) === "1";
  } catch {
    return false;
  }
}

export function GuidedJourneyBar({
  activeProfile,
  savedUniversityCount,
  savedScholarshipCount,
  onNavigate,
  onOpenProfileModal,
}: GuidedJourneyBarProps) {
  const t = useTranslations("guidedJourney");
  // Deferred to an effect (not a lazy useState initializer): reading storage
  // during render would flash the expanded bar on mobile (spec render rules).
  const [collapsed, setCollapsed] = useState(false);
  const [applicationCount, setApplicationCount] = useState<number | null>(null);
  const [taskCount, setTaskCount] = useState<{ profileId: number; count: number } | null>(null);

  useEffect(() => {
    void Promise.resolve().then(() => setCollapsed(readCollapsed()));
  }, []);

  const toggleCollapsed = () => {
    setCollapsed((prev) => {
      const next = !prev;
      try {
        localStorage.setItem(STORAGE_KEY, next ? "1" : "0");
      } catch {
        // Private mode / disabled storage: the toggle still works for the visit.
      }
      return next;
    });
  };

  const profileId = activeProfile?.id ?? null;

  // Application counts are loaded on profile changes; task counts additionally
  // refresh after successful task mutations across the journey UI.
  useEffect(() => {
    let cancelled = false;
    let taskRequest = 0;
    if (!profileId) {
      void Promise.resolve().then(() => {
        if (cancelled) return;
        setApplicationCount(null);
        setTaskCount(null);
      });
      return () => {
        cancelled = true;
      };
    }

    const refreshTaskCount = async () => {
      const request = ++taskRequest;
      try {
        const res = await fetch(`/api/tasks?profileId=${profileId}`);
        const data = res.ok ? await res.json() : null;
        if (cancelled || request !== taskRequest) return;
        setTaskCount(Array.isArray(data?.tasks)
          ? { profileId, count: data.tasks.filter((task: { isCompleted?: boolean }) => task.isCompleted !== true).length }
          : null);
      } catch {
        if (!cancelled && request === taskRequest) setTaskCount(null);
      }
    };

    void refreshTaskCount();
    const onTasksUpdated = (event: Event) => {
      const detail = (event as CustomEvent<{ profileId?: unknown }>).detail;
      if (detail?.profileId === profileId) void refreshTaskCount();
    };
    window.addEventListener("scholarbridge:tasks-updated", onTasksUpdated);

    (async () => {
      try {
        const res = await fetch(`/api/applications?profileId=${profileId}`);
        const data = res.ok ? await res.json() : null;
        if (cancelled) return;
        setApplicationCount(Array.isArray(data?.applications)
          ? data.applications.filter(
              (a: { status?: string }) => !["decision", "withdrawn"].includes(String(a.status))
            ).length
          : null);
      } catch {
        if (!cancelled) setApplicationCount(null);
      }
    })();

    return () => {
      cancelled = true;
      window.removeEventListener("scholarbridge:tasks-updated", onTasksUpdated);
    };
  }, [profileId]);

  if (!activeProfile) return null;

  const coveragePct = Math.round(profileCompletenessRatio(activeProfile) * 100);
  const profileIncomplete = !activeProfile.gpa || !activeProfile.targetMajor;
  const savedTotal = savedUniversityCount + savedScholarshipCount;
  // Step 3 counts document tasks in progress when the roadmap is readable;
  // NULL (request failed) renders "—", never a fabricated 0.
  const docsInProgress = taskCount?.profileId === profileId ? taskCount.count : null;
  const appsActive = applicationCount;

  const steps = [
    {
      id: 1,
      label: t("step1"),
      hint: t("step1Hint", { pct: coveragePct }),
      icon: <User className="h-3.5 w-3.5 shrink-0" aria-hidden />,
      done: !profileIncomplete,
      onClick: onOpenProfileModal,
      cta: coveragePct < 100 ? t("cta") : null,
    },
    {
      id: 2,
      label: t("step2"),
      hint: t("step2Hint", { count: savedTotal }),
      icon: <GraduationCap className="h-3.5 w-3.5 shrink-0" aria-hidden />,
      done: savedUniversityCount > 0,
      onClick: () => onNavigate("universities/search"),
      cta: savedTotal === 0 ? t("cta") : null,
    },
    {
      id: 3,
      label: t("step3"),
      hint: docsInProgress === null ? "—" : t("step3Hint", { count: docsInProgress }),
      icon: <FileText className="h-3.5 w-3.5 shrink-0" aria-hidden />,
      done: savedUniversityCount > 0 && docsInProgress === 0,
      onClick: () => onNavigate("materials/essays"),
      cta: savedUniversityCount > 0 ? t("cta") : null,
    },
    {
      id: 4,
      label: t("step4"),
      hint: appsActive === null ? "—" : t("step4Hint", { count: appsActive }),
      icon: <Briefcase className="h-3.5 w-3.5 shrink-0" aria-hidden />,
      done: (appsActive ?? 0) > 0,
      onClick: () => onNavigate("applications/tracker"),
      cta: (appsActive ?? 0) === 0 ? t("cta") : null,
    },
  ] as const;

  const activeStep = steps.find((s) => !s.done) ?? steps[steps.length - 1];
  const completed = steps.filter((s) => s.done).length;

  return (
    <section
      aria-label={t("title")}
      className="rounded-2xl border border-indigo-200/80 bg-white shadow-xs dark:border-indigo-500/30 dark:bg-[#111a2e]"
    >
      <div className={`flex flex-wrap items-center gap-x-3 gap-y-2 px-3 ${collapsed ? "py-2" : "pt-2.5 pb-1"} sm:px-4`}>
        <span className="flex min-w-0 items-center gap-1.5 text-[11px] font-black uppercase tracking-wide text-indigo-600 dark:text-indigo-300">
          <Briefcase className="h-3.5 w-3.5 shrink-0" aria-hidden />
          <span className="min-w-0 break-words">{t("title")}</span>
        </span>
        <span className="min-w-0 break-words rounded-full bg-indigo-50 px-2 py-0.5 text-[10px] font-bold text-indigo-700 dark:bg-indigo-500/15 dark:text-indigo-200">
          {t("stepLabel", { n: activeStep.id })} · {completed}/4 {t("doneStep")}
        </span>
        {/* Slim overall progress — the collapsed state keeps ONLY this. */}
        <span className="relative h-1.5 w-full max-w-40 shrink-0 overflow-hidden rounded-full bg-slate-200/80 sm:w-24" aria-hidden>
          <span
            className="absolute inset-y-0 left-0 rounded-full bg-indigo-600 transition-all"
            style={{ width: `${(completed / steps.length) * 100}%` }}
          />
        </span>
        {collapsed ? (
          <span className="min-w-0 flex-1 break-words text-[11px] font-bold text-slate-700 dark:text-slate-200">
            {activeStep.label} — {activeStep.hint}
          </span>
        ) : null}
        <button
          type="button"
          onClick={toggleCollapsed}
          aria-expanded={!collapsed}
          aria-label={collapsed ? t("showLabel") : t("hideLabel")}
          className="ml-auto inline-flex min-h-11 min-w-11 shrink-0 items-center justify-center gap-1 rounded-xl border border-slate-200 px-2 text-[10px] font-bold text-slate-500 hover:bg-slate-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-indigo-500 dark:border-slate-700 dark:hover:bg-slate-800"
        >
          {collapsed ? <ChevronDown className="h-3.5 w-3.5" aria-hidden /> : <ChevronUp className="h-3.5 w-3.5" aria-hidden />}
          <span className="hidden sm:inline">{collapsed ? t("cta") : t("title")}</span>
        </button>
      </div>

      {!collapsed && (
        <>
          <ol className="grid grid-cols-1 gap-2 px-3 pb-2.5 sm:grid-cols-2 sm:px-4 lg:grid-cols-4">
            {steps.map((step) => {
              const isCurrent = step.id === activeStep.id;
              return (
                <li key={step.id}>
                  <button
                    type="button"
                    onClick={step.onClick}
                    aria-current={isCurrent ? "step" : undefined}
                    className={`flex min-h-11 w-full items-start gap-2 rounded-xl border px-2.5 py-2 text-left transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-indigo-500 ${
                      isCurrent
                        ? "border-indigo-300 bg-indigo-50/70 hover:bg-indigo-50 dark:border-indigo-400/50 dark:bg-indigo-500/10"
                        : "border-slate-200 bg-white hover:bg-slate-50 dark:border-slate-700 dark:bg-transparent dark:hover:bg-slate-800/60"
                    }`}
                  >
                    <span
                      className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[10px] font-black ${
                        step.done
                          ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300"
                          : isCurrent
                            ? "bg-indigo-600 text-white"
                            : "bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-300"
                      }`}
                      aria-hidden
                    >
                      {step.done ? <CheckCircle2 className="h-3.5 w-3.5" /> : step.id}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="flex items-center gap-1 min-w-0 break-words text-[11px] font-extrabold leading-snug text-slate-800 dark:text-slate-100">
                        {step.icon}
                        {step.label}
                      </span>
                      <span className="mt-0.5 block min-w-0 break-words text-[10px] font-medium leading-snug text-slate-500 dark:text-slate-400">
                        {step.hint}
                      </span>
                    </span>
                  </button>
                </li>
              );
            })}
          </ol>
          {activeStep.cta ? (
            <div className="flex items-center justify-between gap-3 border-t border-slate-100 px-3 py-2 sm:px-4 dark:border-slate-800">
              <p className="min-w-0 break-words text-[11px] font-semibold text-slate-600 dark:text-slate-300">
                {t("currentStep")}: {activeStep.label}
              </p>
              <button
                type="button"
                onClick={activeStep.onClick}
                className="inline-flex min-h-11 shrink-0 items-center gap-1.5 rounded-xl bg-indigo-600 px-4 text-[11px] font-black text-white shadow-xs transition-colors hover:bg-indigo-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-500"
              >
                {activeStep.icon}
                {activeStep.cta}
              </button>
            </div>
          ) : null}
        </>
      )}
    </section>
  );
}
