"use client";

import React, { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import {
  Users,
  CheckCircle2,
  XCircle,
  Clock,
  Info,
  Search,
  ExternalLink,
  Award,
} from "lucide-react";
import type {
  OutcomeResult,
  SimilarityField,
  SimilarProfile,
  SimilarityResult,
} from "@/lib/similarProfiles";
import type { QsUniversityBenchmark } from "@/lib/qsTop200Benchmarks";
import { TwinStrategyCard } from "./TwinStrategyCard";
import { useLocaleContext } from "@/i18n/LocaleProvider";
import { localizeCountry } from "@/lib/catalogLocalizer";
import CountryFlag from "@/components/CountryFlag";

interface SimilarProfilesProps {
  activeProfile: { id?: number | null } | null;
}

interface EnrichedSimilarProfileSummary extends SimilarityResult {
  benchmarks?: Record<string, QsUniversityBenchmark>;
}

const RESULT_ICON: Record<OutcomeResult, React.ReactNode> = {
  accepted: <CheckCircle2 className="w-4 h-4 text-emerald-600" aria-hidden />,
  rejected: <XCircle className="w-4 h-4 text-rose-600" aria-hidden />,
  waitlisted: <Clock className="w-4 h-4 text-amber-600" aria-hidden />,
  deferred: <Clock className="w-4 h-4 text-amber-600" aria-hidden />,
  withdrawn: <Clock className="w-4 h-4 text-slate-500" aria-hidden />,
};

const RESULT_BADGE: Record<OutcomeResult, string> = {
  accepted: "bg-emerald-50 text-emerald-700 border-emerald-200",
  rejected: "bg-rose-50 text-rose-700 border-rose-200",
  waitlisted: "bg-amber-50 text-amber-800 border-amber-200",
  deferred: "bg-amber-50 text-amber-800 border-amber-200",
  withdrawn: "bg-slate-100 text-slate-700 dark:text-slate-200 border-slate-200 dark:border-slate-700",
};

export function SimilarProfiles({ activeProfile }: SimilarProfilesProps) {
  const t = useTranslations("similarOutcomes");
  const { locale } = useLocaleContext();
  const [data, setData] = useState<EnrichedSimilarProfileSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);

  const [decisionFilter, setDecisionFilter] = useState<string>("");
  const [universitySearch, setUniversitySearch] = useState<string>("");
  const [limit, setLimit] = useState<number>(20);

  useEffect(() => {
    let cancelled = false;
    // Started in a microtask: the effect body itself must not call setState
    // synchronously (React's rule for effects — `loading`/`failed` are written
    // before the request goes out).
    void Promise.resolve().then(() => {
      if (cancelled) return;
      if (!activeProfile?.id) {
        setLoading(false);
        return;
      }
      setLoading(true);
      setFailed(false);

      const params = new URLSearchParams({
        profileId: String(activeProfile.id),
        limit: String(limit),
        includeBenchmarks: "1",
      });
      if (decisionFilter) params.set("decision", decisionFilter);
      if (universitySearch.trim()) params.set("university", universitySearch.trim());

      return fetch(`/api/similar-profiles?${params.toString()}`)
        .then((res) => (res.ok ? res.json() : Promise.reject(new Error(`HTTP ${res.status}`))))
        .then((json: EnrichedSimilarProfileSummary) => {
          if (!cancelled) setData(json);
        })
        .catch(() => {
          if (!cancelled) {
            setData(null);
            setFailed(true);
          }
        })
        .finally(() => {
          if (!cancelled) setLoading(false);
        });
    });
    return () => {
      cancelled = true;
    };
  }, [activeProfile?.id, decisionFilter, universitySearch, limit]);

  if (!activeProfile) {
    return (
      <div className="max-w-4xl mx-auto p-8 text-center text-slate-500">
        {t("noProfile")}
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-700 p-6 sm:p-8 shadow-sm">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <Users className="w-5 h-5 text-indigo-600" aria-hidden />
              {t("title")}
            </h2>
            <p className="text-sm text-slate-500 mt-1 max-w-2xl">{t("subtitle")}</p>
          </div>
          {data && data.total > 0 && (
            <div className="text-right">
              <div className="text-2xl font-extrabold text-indigo-600">{data.total}</div>
              <div className="text-xs text-slate-500">{t("reportsCount")}</div>
            </div>
          )}
        </div>

        {/* Interactive Filter Bar */}
        <div className="mt-5 grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              value={universitySearch}
              onChange={(e) => setUniversitySearch(e.target.value)}
              placeholder={t("filterUniversity")}
              className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 pl-8 pr-3 py-1.5 text-xs text-slate-900 dark:text-slate-100"
            />
          </div>

          <select
            value={decisionFilter}
            onChange={(e) => setDecisionFilter(e.target.value)}
            className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-1.5 text-xs text-slate-900 dark:text-slate-100"
          >
            <option value="">{t("allDecisions")}</option>
            <option value="accepted">{t("results.accepted")}</option>
            <option value="waitlisted">{t("results.waitlisted")}</option>
            <option value="rejected">{t("results.rejected")}</option>
          </select>

          <select
            value={String(limit)}
            onChange={(e) => setLimit(Number(e.target.value))}
            className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-1.5 text-xs text-slate-900 dark:text-slate-100"
          >
            <option value="10">{t("showClosest", { count: 10 })}</option>
            <option value="20">{t("showClosest", { count: 20 })}</option>
            <option value="50">{t("showClosest", { count: 50 })}</option>
          </select>
        </div>

        {/* Priority 5.5 — the list below shows everyone similar to you. This
            takes the single admitted student whose record overlaps yours most
            and turns the difference into a row-by-row gap plus at most three
            actions, the first of which can go straight into the goal planner. */}
        <TwinStrategyCard profileId={activeProfile?.id ?? null} className="mt-6" />

        {loading ? (
          <div className="py-12 text-center text-sm text-slate-400">{t("loading")}</div>
        ) : failed ? (
          <div className="mt-6 rounded-2xl border border-rose-200 bg-rose-50 p-6 text-center text-sm text-rose-700">
            {t("loadError")}
          </div>
        ) : !data || data.matches.length === 0 ? (
          <div className="mt-6 rounded-2xl border border-dashed border-slate-300 bg-slate-50 dark:bg-slate-800 p-6 text-center">
            <Info className="w-6 h-6 text-slate-400 mx-auto mb-2" aria-hidden />
            <p className="text-sm font-medium text-slate-700 dark:text-slate-200">{t("noResults")}</p>
          </div>
        ) : (
          <div className="mt-6 space-y-4">
            <div className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-4 py-3 text-xs text-slate-600 dark:text-slate-300">
              {t("caveat")}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {data.matches.map((m: SimilarProfile, idx: number) => {
                const bench = m.universityName ? data.benchmarks?.[m.universityName] : undefined;
                return (
                  <div
                    key={`${m.universityName ?? "unknown"}-${m.result}-${idx}`}
                    className="rounded-2xl border border-slate-200 dark:border-slate-700 p-4 flex flex-col justify-between gap-2.5 bg-white dark:bg-slate-900"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-1.5">
                          {bench?.qsRank != null && (
                            <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200">
                              <Award className="w-3 h-3" />
                              QS #{bench.qsRank}
                            </span>
                          )}
                          {bench?.country && (
                            <span className="inline-flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 dark:text-slate-300">
                              <CountryFlag country={bench.country} size="xs" />
                              {localizeCountry(bench.country, locale)}
                            </span>
                          )}
                        </div>
                        <div className="font-bold text-slate-900 dark:text-slate-100 text-sm mt-1">
                          {m.universityName || t("institutionNotProvided")}
                        </div>
                      </div>
                      <span
                        className={`inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full border shrink-0 ${RESULT_BADGE[m.result]}`}
                      >
                        {RESULT_ICON[m.result]}
                        {t(`results.${m.result}`)}
                      </span>
                    </div>

                    {bench && (
                      <div className="rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-3 py-2 text-[11px] text-slate-600 dark:text-slate-300 grid grid-cols-3 gap-2">
                        <div>
                          <span className="text-slate-400 block">{t("offerRate")}</span>
                          <span className="font-semibold text-slate-800 dark:text-slate-100">{bench.acceptRatePct}%</span>
                        </div>
                        <div>
                          <span className="text-slate-400 block">{t("gpaRange")}</span>
                          <span className="font-semibold text-slate-800 dark:text-slate-100">
                            {bench.gpa25.toFixed(2)}–{bench.gpa75.toFixed(2)}
                          </span>
                        </div>
                        <div>
                          <span className="text-slate-400 block">{t("minIelts")}</span>
                          <span className="font-semibold text-slate-800 dark:text-slate-100">
                            {bench.minIelts.toFixed(1)}
                          </span>
                        </div>
                      </div>
                    )}

                    <div className="flex items-center justify-between gap-2 text-xs text-slate-500 pt-1">
                      <span>
                        {t("comparedFields", {
                          fields: m.comparedFields
                            .map((field: SimilarityField) => t(`fields.${field}`))
                            .join(", "),
                        })}
                      </span>
                      {bench?.officialUrl && (
                        <a
                          href={bench.officialUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-[11px] font-semibold text-indigo-600 hover:text-indigo-800 shrink-0"
                        >
                          {t("officialSite")}
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
export default SimilarProfiles;
