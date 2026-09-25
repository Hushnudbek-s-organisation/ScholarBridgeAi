"use client";

import React, { useCallback, useEffect, useState } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  Gauge,
  Info,
  Loader2,
  Minus,
  Plus,
  RefreshCw,
  Target,
} from "lucide-react";
import { StudentProfile } from "./Navbar";

/**
 * Chancing panel — the two numbers, kept apart on purpose.
 *
 *   FIT SCORE        how well the profile matches the programme requirements
 *   ADMISSION EST.   the estimated probability of actually being admitted
 *
 * A 78% fit with an 18–27% admit estimate is the normal case at selective
 * universities, and showing them as one number would mislead students. Every
 * estimate ships with sub-scores, an explicit "Why?" list and a statement of
 * what evidence it is based on.
 */

export interface ChancingResult {
  universityId: number;
  universityName: string;
  fitScore: number | null;
  fitCategory?: string;
  fitReasons?: string[];
  fitIssues?: string[];
  admission: { low: number; high: number; mid: number; band: string; label: string };
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
  confidence: number;
  dataBasis: "public-estimate" | "hybrid" | "scholarbridge-data";
  sampleSize: number;
  disclaimer: string;
}

const BAND_STYLE: Record<string, { chip: string; bar: string }> = {
  safety: { chip: "bg-emerald-100 text-emerald-800", bar: "bg-emerald-500" },
  target: { chip: "bg-sky-100 text-sky-800", bar: "bg-sky-500" },
  reach: { chip: "bg-amber-100 text-amber-800", bar: "bg-amber-500" },
  "long-reach": { chip: "bg-rose-100 text-rose-800", bar: "bg-rose-500" },
};

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
    return `Based on ${sampleSize} ScholarBridge application outcomes`;
  }
  if (basis === "hybrid") {
    return `Public data + ${sampleSize} ScholarBridge outcomes`;
  }
  return "Based on published university data";
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
      if (!res.ok) throw new Error(data.error || "Failed to estimate");
      setResults(data.results ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to estimate admission chances");
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
        Sign in to see admission estimates.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="flex items-center gap-2 text-lg font-bold text-slate-900">
            <Target className="h-5 w-5 text-indigo-600" />
            Admission chances
          </h2>
          <p className="text-xs text-slate-500">
            Fit score and admission probability are two different things — both are shown.
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

      {error && (
        <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">
          {error}
        </div>
      )}

      {loading && !results.length && (
        <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-6 text-sm text-slate-500">
          <Loader2 className="h-4 w-4 animate-spin" /> Estimating…
        </div>
      )}

      {!loading && !results.length && !error && (
        <div className="rounded-xl border border-dashed border-slate-300 bg-white px-4 py-8 text-center text-sm text-slate-500">
          Save universities or add applications first — estimates are calculated for your shortlist.
        </div>
      )}

      <div className="grid gap-3">
        {results.map((r) => {
          const style = BAND_STYLE[r.admission.band] ?? BAND_STYLE.target;
          const open = expanded === r.universityId;
          return (
            <div key={r.universityId} className="rounded-2xl border border-slate-200 bg-white p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <h3 className="truncate font-bold text-slate-900">{r.universityName}</h3>
                  <span
                    className={`mt-1 inline-block rounded-full px-2 py-0.5 text-[11px] font-bold ${style.chip}`}
                  >
                    {r.admission.label}
                  </span>
                </div>

                {/* The two numbers, side by side, never merged */}
                <div className="flex gap-4 text-center">
                  <div className="rounded-xl bg-slate-50 px-3 py-2">
                    <div className="text-[10px] font-bold uppercase tracking-wide text-slate-500">
                      Fit score
                    </div>
                    <div className="text-xl font-extrabold text-slate-900">
                      {r.fitScore == null ? "—" : `${r.fitScore}%`}
                    </div>
                  </div>
                  <div className="rounded-xl bg-indigo-50 px-3 py-2">
                    <div className="text-[10px] font-bold uppercase tracking-wide text-indigo-600">
                      Admission est.
                    </div>
                    <div className="text-xl font-extrabold text-indigo-700">
                      {r.admission.low}–{r.admission.high}%
                    </div>
                  </div>
                </div>
              </div>

              {/* Range bar */}
              <div className="mt-3">
                <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100">
                  <div
                    className={`h-full ${style.bar}`}
                    style={{
                      marginLeft: `${Math.max(0, r.admission.low)}%`,
                      width: `${Math.max(2, r.admission.high - r.admission.low)}%`,
                    }}
                  />
                </div>
                <div className="mt-1 flex justify-between text-[10px] text-slate-400">
                  <span>0%</span>
                  <span>confidence {r.confidence}%</span>
                  <span>100%</span>
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
                    <span>
                      {basisLabel(r.dataBasis, r.sampleSize)} · {r.disclaimer}
                    </span>
                  </p>
                </div>
              )}
            </div>
          );
        })}
      </div>

      <p className="flex items-center gap-1.5 text-[11px] text-slate-400">
        <Gauge className="h-3.5 w-3.5" />
        Estimates improve as ScholarBridge collects real outcomes (accepted and rejected) from
        students who opt in.
      </p>
    </div>
  );
}
