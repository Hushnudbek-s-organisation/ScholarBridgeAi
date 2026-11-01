"use client";

import React, { useEffect, useRef, useState } from "react";
import { Circle, Loader2 } from "lucide-react";
import { useTranslations } from "next-intl";

interface LoadingStagesProps {
  title: string;
  description: string;
  stages: readonly string[];
  className?: string;
}

/**
 * Honest long-request feedback: real elapsed time and indicative stages, never
 * a fabricated percentage or a claim that the server reported a sub-step.
 */
export function LoadingStages({ title, description, stages, className = "" }: LoadingStagesProps) {
  const t = useTranslations("common");
  const startedAt = useRef(0);
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    startedAt.current = Date.now();
    const timer = window.setInterval(() => {
      setElapsed(Math.floor((Date.now() - startedAt.current) / 1000));
    }, 1000);
    return () => window.clearInterval(timer);
  }, []);

  const current = stages.length === 0 ? 0 : Math.min(stages.length - 1, Math.floor(elapsed / 3));

  return (
    <div className={`rounded-surface border border-indigo-200 bg-indigo-50/70 p-4 dark:border-indigo-500/30 dark:bg-indigo-950/20 ${className}`}>
      <div className="flex items-start gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white text-indigo-700 shadow-sm dark:bg-slate-900 dark:text-indigo-300">
          <Loader2 aria-hidden="true" className="h-5 w-5 motion-safe:animate-spin" />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
            <h4 className="text-sm font-extrabold text-indigo-950 dark:text-indigo-100">{title}</h4>
            <span aria-hidden="true" className="text-xs font-semibold tabular-nums text-indigo-700 dark:text-indigo-300">
              {t("elapsedSeconds", { seconds: elapsed })}
            </span>
          </div>
          <p className="mt-1 text-sm leading-relaxed text-slate-600 dark:text-slate-300">{description}</p>
        </div>
      </div>
      {stages.length > 0 && (
        <ol className="mt-4 space-y-2" aria-label={t("stageCount", { current: current + 1, total: stages.length })}>
          {stages.map((stage, index) => {
            const active = index === current;
            return (
              <li
                key={stage}
                aria-current={active ? "step" : undefined}
                className={`flex min-h-8 items-center gap-2 rounded-control px-2 py-1 text-sm leading-snug ${
                  active
                    ? "bg-white font-semibold text-indigo-800 shadow-sm dark:bg-slate-900 dark:text-indigo-200"
                    : "text-slate-500 dark:text-slate-400"
                }`}
              >
                {active ? (
                  <Loader2 aria-hidden="true" className="h-4 w-4 shrink-0 motion-safe:animate-spin" />
                ) : (
                  <Circle aria-hidden="true" className="h-3 w-3 shrink-0" />
                )}
                <span>{stage}</span>
              </li>
            );
          })}
        </ol>
      )}
      <p role="status" aria-live="polite" className="sr-only">
        {stages[current] ?? title}
      </p>
    </div>
  );
}
