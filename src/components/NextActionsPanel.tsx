"use client";

import React, { useCallback, useEffect, useState } from "react";
import { ArrowRight, Loader2, ListChecks, AlertTriangle, Sparkles } from "lucide-react";
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

const URGENCY_STYLE: Record<Urgency, { chip: string; bar: string; label: string }> = {
  critical: { chip: "bg-red-50 text-red-700 border-red-200", bar: "bg-red-500", label: "🔴 Today" },
  high: { chip: "bg-orange-50 text-orange-700 border-orange-200", bar: "bg-orange-500", label: "🟠 This week" },
  medium: { chip: "bg-yellow-50 text-yellow-700 border-yellow-200", bar: "bg-yellow-500", label: "🟡 Soon" },
  low: { chip: "bg-slate-100 text-slate-600 border-slate-200", bar: "bg-slate-400", label: "When you can" },
};

interface NextActionsPanelProps {
  activeProfile: StudentProfile | null;
  onNavigate: (tab: string) => void;
}

export function NextActionsPanel({ activeProfile, onNavigate }: NextActionsPanelProps) {
  const [actions, setActions] = useState<NextAction[]>([]);
  const [rest, setRest] = useState<NextAction[]>([]);
  const [headline, setHeadline] = useState("");
  const [completeness, setCompleteness] = useState<number | null>(null);
  const [criticalCount, setCriticalCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [showAll, setShowAll] = useState(false);

  const load = useCallback(async () => {
    if (!activeProfile?.id) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`/api/next-actions?profileId=${activeProfile.id}`);
      const data = await res.json();
      if (res.ok) {
        setActions(data.actions ?? []);
        setRest(data.rest ?? []);
        setHeadline(data.headline ?? "");
        setCompleteness(data.completeness ?? null);
        setCriticalCount(data.criticalCount ?? 0);
      }
    } catch {
      // The dashboard must not break because the roadmap failed to load.
    } finally {
      setLoading(false);
    }
  }, [activeProfile?.id]);

  useEffect(() => {
    void load();
  }, [load]);

  if (!activeProfile) return null;

  const visible = showAll ? [...actions, ...rest] : actions;

  return (
    <div className="rounded-2xl border border-indigo-100 bg-white p-5 shadow-xs">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <h2 className="flex items-center gap-2 text-base font-extrabold text-slate-900">
            <ListChecks className="h-5 w-5 text-indigo-600" />
            What should I do next?
          </h2>
          <p className="mt-0.5 text-xs text-slate-600">{headline}</p>
        </div>
        {completeness !== null && (
          <div className="flex items-center gap-1.5 rounded-full border border-slate-200 px-2.5 py-1 text-[10px] font-bold text-slate-600">
            <Sparkles className="h-3 w-3 text-indigo-500" />
            profile {completeness}%
          </div>
        )}
      </div>

      {loading ? (
        <div className="flex items-center gap-2 py-6 text-xs font-semibold text-slate-500">
          <Loader2 className="h-4 w-4 animate-spin" /> Building your roadmap…
        </div>
      ) : (
        <ol className="mt-4 space-y-2.5">
          {visible.map((action, index) => {
            const style = URGENCY_STYLE[action.urgency] ?? URGENCY_STYLE.low;
            return (
              <li
                key={action.id}
                className="relative overflow-hidden rounded-xl border border-slate-200 bg-white pl-4 transition hover:border-indigo-200"
              >
                <span className={`absolute left-0 top-0 h-full w-1 ${style.bar}`} aria-hidden />
                <div className="flex flex-wrap items-start gap-3 px-3 py-3">
                  <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-indigo-50 text-xs font-extrabold text-indigo-700">
                    {index + 1}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-sm font-bold text-slate-900">{action.title}</span>
                      <span className={`rounded-full border px-2 py-0.5 text-[10px] font-bold ${style.chip}`}>
                        {style.label}
                      </span>
                    </div>
                    <p className="mt-1 text-xs leading-relaxed text-slate-600">{action.why}</p>
                  </div>
                  <button
                    onClick={() => onNavigate(action.target)}
                    className="flex shrink-0 items-center gap-1 rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-indigo-700"
                  >
                    Open
                    <ArrowRight className="h-3.5 w-3.5" />
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
          className="mt-3 text-xs font-semibold text-indigo-600 hover:text-indigo-800"
        >
          {showAll ? "Show top 3 only" : `Show ${rest.length} more`}
        </button>
      )}

      {criticalCount > 0 && (
        <p className="mt-3 flex items-center gap-1.5 text-[11px] font-semibold text-red-600">
          <AlertTriangle className="h-3.5 w-3.5" />
          {criticalCount === 1 ? "One deadline" : `${criticalCount} deadlines`} need you today — everything else can wait.
        </p>
      )}
    </div>
  );
}
