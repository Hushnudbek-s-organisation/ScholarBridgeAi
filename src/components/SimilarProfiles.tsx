"use client";

import React, { useCallback, useEffect, useState } from "react";
import { Info, Loader2, Users } from "lucide-react";
import { useTranslations } from "next-intl";
import { StudentProfile } from "./Navbar";
import type { SimilarityField } from "@/lib/similarProfiles";

interface Match {
  universityName: string | null;
  result: "accepted" | "rejected" | "waitlisted" | "deferred" | "withdrawn";
  comparedFields: SimilarityField[];
}

interface SimilarityResult {
  matches: Match[];
  total: number;
}

const RESULT_STYLE: Record<Match["result"], string> = {
  accepted: "bg-emerald-100 text-emerald-800",
  rejected: "bg-rose-100 text-rose-800",
  waitlisted: "bg-amber-100 text-amber-800",
  deferred: "bg-sky-100 text-sky-800",
  withdrawn: "bg-slate-200 text-slate-600",
};

interface SimilarProfilesProps {
  activeProfile: StudentProfile | null;
}

/**
 * Displays opt-in historical outcomes only. There is no acceptance share,
 * admission-prediction score, GPA advantage note, or applicant guidance here.
 */
export function SimilarProfiles({ activeProfile }: SimilarProfilesProps) {
  const t = useTranslations("similarOutcomes");
  const profileId = activeProfile?.id;
  const [data, setData] = useState<SimilarityResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const load = useCallback(async () => {
    if (!profileId) {
      setData(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    setData(null);
    setError(false);
    try {
      const res = await fetch(`/api/similar-profiles?profileId=${profileId}`);
      if (!res.ok) throw new Error("request failed");
      const payload = (await res.json()) as SimilarityResult;
      setData(payload);
    } catch {
      // Keep provider, authorization, and database details out of the UI.
      setError(true);
    } finally {
      setLoading(false);
    }
  }, [profileId]);

  useEffect(() => {
    void Promise.resolve().then(load);
  }, [load]);

  if (!activeProfile) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-6 text-sm text-slate-600">
        {t("noProfile")}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-slate-200 bg-white p-4">
        <h2 className="flex items-center gap-2 text-lg font-bold text-slate-900">
          <Users className="h-5 w-5 shrink-0 text-indigo-600" />
          <span>{t("title")}</span>
        </h2>
        <p className="mt-1 text-xs leading-relaxed text-slate-600">{t("subtitle")}</p>
      </div>

      {error && (
        <div role="alert" className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">
          {t("loadError")}
        </div>
      )}

      {loading && (
        <div role="status" aria-live="polite" className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-6 text-sm text-slate-600">
          <Loader2 className="h-4 w-4 shrink-0 animate-spin" aria-hidden="true" />
          {t("loading")}
        </div>
      )}

      {data && !error && (
        <>
          <div className="rounded-2xl border border-slate-200 bg-white p-4 text-center sm:max-w-xs">
            <div className="text-2xl font-extrabold text-slate-900">{data.total}</div>
            <div className="break-words text-[10px] font-bold uppercase leading-tight tracking-wide text-slate-500">
              {t("reportsCount")}
            </div>
          </div>

          <p className="flex items-start gap-2 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-xs leading-relaxed text-slate-700">
            <Info className="mt-0.5 h-4 w-4 shrink-0 text-slate-500" aria-hidden="true" />
            <span>{t("caveat")}</span>
          </p>

          {data.matches.length > 0 ? (
            <ul className="space-y-2">
              {data.matches.map((match, index) => (
                <li
                  key={`${match.universityName ?? "unknown"}-${match.result}-${index}`}
                  className="rounded-2xl border border-slate-200 bg-white p-4"
                >
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <h3 className="min-w-0 flex-1 break-words text-sm font-bold text-slate-900">
                      {match.universityName || t("institutionNotProvided")}
                    </h3>
                    <span className={`shrink-0 rounded-full px-2.5 py-1 text-[11px] font-bold ${RESULT_STYLE[match.result]}`}>
                      {t(`results.${match.result}`)}
                    </span>
                  </div>
                  <p className="mt-2 break-words text-xs leading-relaxed text-slate-600">
                    {t("comparedFields", {
                      fields: match.comparedFields.map((field) => t(`fields.${field}`)).join(", "),
                    })}
                  </p>
                </li>
              ))}
            </ul>
          ) : (
            <div className="rounded-xl border border-dashed border-slate-300 bg-white px-4 py-8 text-center text-sm leading-relaxed text-slate-600">
              {t("noResults")}
            </div>
          )}
        </>
      )}
    </div>
  );
}
