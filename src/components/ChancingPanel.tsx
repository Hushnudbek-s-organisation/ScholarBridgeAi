"use client";

import React, { useCallback, useEffect, useState } from "react";
import { AlertTriangle, CheckCircle2, Info, Loader2, Lock, Minus, Plus, RefreshCw, Target } from "lucide-react";
import { useTranslations } from "next-intl";
import { StudentProfile } from "./Navbar";
import { WhatIfSimulator } from "./journey/WhatIfSimulator";

/**
 * A live comparison of saved profile details with available university
 * catalogue fields. This is not a complete eligibility check or an admission
 * estimate, and university-level catalogue fields may not match a programme.
 */
export interface ChancingResult {
  universityId: number;
  universityName: string;
  fitScore: number | null;
  fitReasons: string[];
  fitIssues: string[];
  comparedDimensions: number;
  totalDimensions: number;
  /** Single source of truth from /api/chancing — never hardcode the state. */
  probability: { available: boolean; reason: string };
}

interface ChancingPanelProps {
  activeProfile: StudentProfile | null;
  /** Restrict to one university; omit to compare the whole shortlist. */
  universityId?: number | null;
  compact?: boolean;
}

export function ChancingPanel({ activeProfile, universityId, compact }: ChancingPanelProps) {
  const t = useTranslations("chancing");
  const [results, setResults] = useState<ChancingResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [expanded, setExpanded] = useState<number | null>(null);
  const profileId = activeProfile?.id;

  const load = useCallback(async () => {
    if (!profileId) return;
    setLoading(true);
    setError("");
    try {
      const params = new URLSearchParams({ profileId: String(profileId) });
      if (universityId) params.set("universityId", String(universityId));
      else params.set("all", "1");
      const res = await fetch(`/api/chancing?${params.toString()}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || t("loadFailed"));
      setResults(data.results ?? []);
    } catch (err) {
      setError(err instanceof Error && err.message ? err.message : t("loadFailed"));
    } finally {
      setLoading(false);
    }
  }, [profileId, universityId, t]);

  useEffect(() => {
    void load();
  }, [load]);

  if (!activeProfile) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-6 text-sm text-slate-600 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300">
        {t("signIn")}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="min-w-0">
          <h2 className="flex items-center gap-2 text-lg font-bold text-slate-900 dark:text-slate-100">
            <Target className="h-5 w-5 shrink-0 text-indigo-600 dark:text-indigo-400" aria-hidden />
            {t("title")}
          </h2>
          <p className="mt-0.5 max-w-3xl text-xs leading-relaxed text-slate-600 dark:text-slate-300">{t("subtitle")}</p>
        </div>
        <button
          type="button"
          onClick={() => void load()}
          className="inline-flex min-h-11 shrink-0 items-center justify-center gap-1.5 rounded-xl border border-slate-300 bg-white px-3 text-xs font-semibold text-slate-700 transition hover:border-indigo-300 hover:bg-indigo-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} aria-hidden />
          {t("refresh")}
        </button>
      </div>

      {/* Phase 2.3 — the shortlist page owns the what-if simulator too, so a
          student comparing programmes can test a hypothetical figure without
          leaving the comparison. The panel never returns a chance. */}
      <WhatIfSimulator profileId={profileId ?? null} />

      <div className="flex items-start gap-2.5 rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 text-amber-950 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-100">
        <Lock className="mt-0.5 h-4 w-4 shrink-0 text-amber-700 dark:text-amber-300" aria-hidden />
        <div className="text-xs leading-relaxed">
          <span className="font-bold">{t("unavailableTitle")}</span>{" "}
          {t("unavailableBody")}
        </div>
      </div>

      {error && (
        <div role="alert" className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800 dark:border-rose-900 dark:bg-rose-950/40 dark:text-rose-200">
          {error}
        </div>
      )}

      {loading && !results.length && (
        <div className="flex min-h-16 items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-6 text-sm text-slate-600 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300">
          <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> {t("assessing")}
        </div>
      )}

      {!loading && !results.length && !error && (
        <div className="rounded-xl border border-dashed border-slate-300 bg-white px-4 py-8 text-center text-sm leading-relaxed text-slate-600 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300">
          {t("empty")}
        </div>
      )}

      <div className="grid gap-3">
        {results.map((r) => {
          const open = expanded === r.universityId;
          const showDetails = open || compact;
          return (
            <article key={r.universityId} className="min-w-0 rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-900 sm:p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <h3 className="break-words text-sm font-bold leading-snug text-slate-900 dark:text-slate-100">{r.universityName}</h3>
                  <span className="mt-2 inline-flex max-w-full rounded-full bg-indigo-50 px-2.5 py-1 text-[11px] font-semibold leading-snug text-indigo-800 ring-1 ring-indigo-100 dark:bg-indigo-950/50 dark:text-indigo-200 dark:ring-indigo-900">
                    {t("fitBadge")}
                  </span>
                </div>

                <div className="min-w-[96px] rounded-xl bg-indigo-50 px-3 py-2 text-center ring-1 ring-indigo-100 dark:bg-indigo-950/50 dark:ring-indigo-900">
                  <div className="text-[10px] font-bold uppercase tracking-wide text-indigo-700 dark:text-indigo-300">
                    {t("fitScore")}
                  </div>
                  <div className="text-xl font-extrabold text-indigo-800 dark:text-indigo-100">
                    {r.fitScore == null ? "—" : `${r.fitScore}%`}
                  </div>
                </div>
              </div>

              {!compact && (
                <button
                  type="button"
                  aria-expanded={open}
                  onClick={() => setExpanded(open ? null : r.universityId)}
                  className="mt-2 inline-flex min-h-11 items-center gap-1.5 rounded-lg px-2 text-xs font-semibold text-indigo-700 hover:bg-indigo-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 dark:text-indigo-300 dark:hover:bg-slate-800"
                >
                  {open ? <Minus className="h-3.5 w-3.5" aria-hidden /> : <Plus className="h-3.5 w-3.5" aria-hidden />}
                  {open ? t("toggleHide") : t("toggleShow")}
                </button>
              )}

              {showDetails && (
                <div className="mt-3 space-y-3 border-t border-slate-100 pt-3 dark:border-slate-800">
                  <p className="flex items-start gap-1.5 text-xs leading-relaxed text-slate-600 dark:text-slate-300">
                    <Info className="mt-0.5 h-3.5 w-3.5 shrink-0 text-indigo-500" aria-hidden />
                    <span>{t("comparedDimensions", { compared: r.comparedDimensions, total: r.totalDimensions })}</span>
                  </p>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <section className="min-w-0">
                      <h4 className="mb-1.5 text-xs font-bold text-slate-700 dark:text-slate-200">{t("signalsTitle")}</h4>
                      {r.fitReasons.length > 0 ? (
                        <ul className="space-y-1.5">
                          {r.fitReasons.map((text, i) => (
                            <li key={`p${i}`} className="flex min-w-0 items-start gap-1.5 text-xs leading-relaxed text-emerald-800 dark:text-emerald-300">
                              <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden />
                              <span className="break-words">{text}</span>
                            </li>
                          ))}
                        </ul>
                      ) : (
                        <p className="text-xs leading-relaxed text-slate-500 dark:text-slate-400">{t("noSignals")}</p>
                      )}
                    </section>
                    <section className="min-w-0">
                      <h4 className="mb-1.5 text-xs font-bold text-slate-700 dark:text-slate-200">{t("verifyTitle")}</h4>
                      {r.fitIssues.length > 0 ? (
                        <ul className="space-y-1.5">
                          {r.fitIssues.map((text, i) => (
                            <li key={`n${i}`} className="flex min-w-0 items-start gap-1.5 text-xs leading-relaxed text-amber-800 dark:text-amber-300">
                              <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden />
                              <span className="break-words">{text}</span>
                            </li>
                          ))}
                        </ul>
                      ) : (
                        <p className="text-xs leading-relaxed text-slate-500 dark:text-slate-400">{t("noIssues")}</p>
                      )}
                    </section>
                  </div>
                  <p className="border-t border-slate-100 pt-2 text-[11px] leading-relaxed text-slate-500 dark:border-slate-800 dark:text-slate-400">
                    {t("footnote")}
                  </p>
                </div>
              )}
            </article>
          );
        })}
      </div>
    </div>
  );
}
