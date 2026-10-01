"use client";

import React, { useCallback, useEffect, useState } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  Gauge,
  Info,
  Loader2,
  Lock,
  Minus,
  Plus,
  RefreshCw,
  Target,
} from "lucide-react";
import { StudentProfile } from "./Navbar";

/**
 * Chancing panel — the FIT score, clearly separated from admission odds.
 *
 * PROBABILITY POLICY (2026-10 task constraint): an admission probability may
 * only be shown once the project has a VALIDATED METHODOLOGY AND sufficient
 * outcome data. That does not exist yet, so this panel:
 *   • shows the FIT score (requirements/affordability match) — explicitly
 *     NOT a probability, with the "Why?" sub-scores and reasons;
 *   • labels the admission-probability dimension "unavailable" and explains
 *     what would make it available;
 *   • never renders a percentage range, a Safety/Target/Reach band, or a
 *     confidence figure for admission odds.
 */

export interface ChancingResult {
  universityId: number;
  universityName: string;
  fitScore: number | null;
  fitCategory?: string;
  fitReasons?: string[];
  fitIssues?: string[];
  subScores: {
    academicFit: number;
    testFit: number;
    extracurricularFit: number;
    majorFit: number;
    internationalFactors: number;
    financialFit: number;
  };
  positives: string[];
  negatives: string[];
  dataBasis: "public-estimate" | "hybrid" | "scholarbridge-data";
  sampleSize: number;
  /** Single source of truth from /api/chancing — never hardcode the state. */
  probability: { available: boolean; reason: string };
}

const SUBSCORE_LABELS: { key: keyof ChancingResult["subScores"]; label: string }[] = [
  { key: "academicFit", label: "Academic fit" },
  { key: "testFit", label: "Test fit" },
  { key: "extracurricularFit", label: "Extracurricular fit" },
  { key: "majorFit", label: "Major fit" },
  { key: "internationalFactors", label: "International factors" },
  { key: "financialFit", label: "Financial fit" },
];

function basisLabel(basis: ChancingResult["dataBasis"], sampleSize: number) {
  if (basis === "scholarbridge-data") {
    return `Signals based on ${sampleSize} ScholarBridge application outcomes`;
  }
  if (basis === "hybrid") {
    return `Signals based on public data + ${sampleSize} ScholarBridge outcomes`;
  }
  return "Signals based on published university data";
}

interface ChancingPanelProps {
  activeProfile: StudentProfile | null;
  /** Restrict to one university; omit to estimate the whole shortlist. */
  universityId?: number | null;
  compact?: boolean;
}

export function ChancingPanel({ activeProfile, universityId, compact }: ChancingPanelProps) {
  const [results, setResults] = useState<ChancingResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [expanded, setExpanded] = useState<number | null>(null);

  const load = useCallback(async () => {
    if (!activeProfile?.id) return;
    setLoading(true);
    setError("");
    try {
      const params = new URLSearchParams({ profileId: String(activeProfile.id) });
      if (universityId) params.set("universityId", String(universityId));
      else params.set("all", "1");
      const res = await fetch(`/api/chancing?${params.toString()}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to assess");
      setResults(data.results ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to assess your shortlist");
    } finally {
      setLoading(false);
    }
  }, [activeProfile?.id, universityId]);

  useEffect(() => {
    void load();
  }, [load]);

  if (!activeProfile) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-6 text-sm text-slate-500">
        Sign in to see your profile fit assessments.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="flex items-center gap-2 text-lg font-bold text-slate-900">
            <Target className="h-5 w-5 text-indigo-600" />
            Profile fit
          </h2>
          <p className="text-xs text-slate-500">
            Fit measures how well your profile meets each university&apos;s published requirements —
            it is not a probability of admission.
          </p>
        </div>
        <button
          onClick={() => void load()}
          className="flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-50"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
          Refresh
        </button>
      </div>

      {/* Admission probability — labelled unavailable (2026-10 policy). */}
      <div className="flex items-start gap-2.5 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3">
        <Lock className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
        <div className="text-xs text-amber-800">
          <span className="font-bold">Admission probability: unavailable.</span> We do not estimate
          the chance of admission until a validated methodology and enough real outcome data exist.
          A high fit score is not a guarantee of admission.
        </div>
      </div>

      {error && (
        <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">
          {error}
        </div>
      )}

      {loading && !results.length && (
        <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-6 text-sm text-slate-500">
          <Loader2 className="h-4 w-4 animate-spin" /> Assessing…
        </div>
      )}

      {!loading && !results.length && !error && (
        <div className="rounded-xl border border-dashed border-slate-300 bg-white px-4 py-8 text-center text-sm text-slate-500">
          Save universities or add applications first — fit is assessed for your shortlist.
        </div>
      )}

      <div className="grid gap-3">
        {results.map((r) => {
          const open = expanded === r.universityId;
          return (
            <div key={r.universityId} className="rounded-2xl border border-slate-200 bg-white p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <h3 className="truncate font-bold text-slate-900">{r.universityName}</h3>
                  <span className="mt-1 inline-block rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-bold text-slate-600">
                    Requirements fit — not an admission probability
                  </span>
                </div>

                <div className="rounded-xl bg-indigo-50 px-3 py-2 text-center">
                  <div className="text-[10px] font-bold uppercase tracking-wide text-indigo-600">
                    Fit score
                  </div>
                  <div className="text-xl font-extrabold text-indigo-700">
                    {r.fitScore == null ? "—" : `${r.fitScore}%`}
                  </div>
                </div>
              </div>

              {!compact && (
                <button
                  onClick={() => setExpanded(open ? null : r.universityId)}
                  className="mt-3 flex items-center gap-1.5 text-xs font-semibold text-indigo-600 hover:text-indigo-800"
                >
                  {open ? <Minus className="h-3.5 w-3.5" /> : <Plus className="h-3.5 w-3.5" />}
                  {open ? "Hide" : "Why?"} — sub-scores and reasons
                </button>
              )}

              {(open || compact) && (
                <div className="mt-3 space-y-4 border-t border-slate-100 pt-3">
                  <div className="grid gap-2 sm:grid-cols-2">
                    {SUBSCORE_LABELS.map(({ key, label }) => (
                      <div key={key}>
                        <div className="flex justify-between text-[11px] font-semibold text-slate-600">
                          <span>{label}</span>
                          <span>{r.subScores[key]}%</span>
                        </div>
                        <div className="mt-0.5 h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
                          <div
                            className="h-full rounded-full bg-indigo-500"
                            style={{ width: `${r.subScores[key]}%` }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="grid gap-3 sm:grid-cols-2">
                    <ul className="space-y-1.5">
                      {r.positives.map((text, i) => (
                        <li key={`p${i}`} className="flex gap-1.5 text-xs text-emerald-800">
                          <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                          <span>{text}</span>
                        </li>
                      ))}
                    </ul>
                    <ul className="space-y-1.5">
                      {r.negatives.map((text, i) => (
                        <li key={`n${i}`} className="flex gap-1.5 text-xs text-rose-800">
                          <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                          <span>{text}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  <p className="flex items-start gap-1.5 text-[11px] text-slate-500">
                    <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                    <span>{basisLabel(r.dataBasis, r.sampleSize)}.</span>
                  </p>
                </div>
              )}
            </div>
          );
        })}
      </div>

      <p className="flex items-center gap-1.5 text-[11px] text-slate-400">
        <Gauge className="h-3.5 w-3.5" />
        Fit signals get sharper as ScholarBridge collects real outcomes (accepted and rejected)
        from students who opt in. An admission probability will appear here only once a validated
        methodology exists.
      </p>
    </div>
  );
}
