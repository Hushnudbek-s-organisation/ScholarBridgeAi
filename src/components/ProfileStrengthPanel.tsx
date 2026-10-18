"use client";

import React, { useEffect, useState } from "react";
import { Activity, AlertTriangle, Loader2, Ruler } from "lucide-react";
import { useTranslations } from "next-intl";

/**
 * Profile information coverage dashboard. None of its percentages grades
 * applicant quality, admission eligibility or an admission outcome.
 */
interface StrengthSection {
  /** True when the student has not entered the data this dimension needs. */
  unknown?: boolean;
  key: string;
  label: string;
  score: number;
  /** Unrounded value (one decimal) — the precise form of `score`. */
  scorePrecise?: number;
  /** 0–1 — how much of this dimension's evidence exists. */
  coverage?: number;
  missing?: string[];
}

interface StrengthData {
  strength: {
    overall: number;
    overallPrecise?: number;
    sections: StrengthSection[];
    scoredSections?: number;
    totalSections?: number;
  };
  extracurriculars: {
    activities: number;
    leadership: number;
    research: number;
    awards: number;
  };
}

const SECTION_KEYS = [
  "academics",
  "tests",
  "extracurriculars",
  "leadership",
  "awards",
  "research",
  "essays",
  "financial",
] as const;

function Bar({
  label,
  score,
  precise,
  coverage,
  missing,
  hint,
  unknown,
  unknownLabel,
}: {
  label: string;
  score: number;
  /** One-decimal value behind `score` — printed when it differs. */
  precise?: number;
  /** 0–1 share of the dimension's inputs that exist. */
  coverage?: number;
  /** What to add next for this dimension (engine-provided, most valuable first). */
  missing?: string[];
  hint?: string;
  /** No data behind this dimension yet — print the label, not a fake number. */
  unknown?: boolean;
  unknownLabel?: string;
}) {
  if (unknown) {
    return (
      <div>
        <div className="flex items-baseline justify-between gap-2">
          <span className="text-[11px] font-semibold text-slate-600">{label}</span>
          <span className="text-xs font-bold text-slate-400">—</span>
        </div>
        {(missing?.[0] || unknownLabel) && (
          <p className="mt-0.5 text-[10px] leading-snug text-slate-400">{missing?.[0] ?? unknownLabel}</p>
        )}
        <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-slate-100" />
      </div>
    );
  }
  const showPrecise = precise != null && Math.abs(precise - score) >= 0.05;
  return (
    <div>
      <div className="flex items-baseline justify-between gap-2">
        <span className="text-[11px] font-semibold text-slate-600">{label}</span>
        <span className="flex items-baseline gap-1">
          {showPrecise && <span className="text-[10px] font-semibold text-slate-400">{precise.toFixed(1)}</span>}
          <span className="text-xs font-extrabold text-slate-800 tabular-nums">{score}%</span>
        </span>
      </div>
      {hint && <p className="mt-0.5 text-[10px] text-slate-400">{hint}</p>}
      <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
        <div
          className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-violet-500 transition-all"
          style={{ width: `${Math.max(0, Math.min(100, score))}%` }}
        />
      </div>
      <div className="mt-1 flex items-center justify-between gap-2">
        {missing?.[0] && (
          <p className="text-right text-[10px] leading-snug text-amber-700">
            {missing[0]}
          </p>
        )}
      </div>
    </div>
  );
}

/**
 * Profile information coverage dashboard. Scores represent recorded fields
 * only; activity counts are descriptive, not a merit or admissions score.
 */
export function ProfileStrengthPanel({ activeProfile }: { activeProfile: { id: number } | null }) {
  const t = useTranslations("strength");
  const [data, setData] = useState<StrengthData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!activeProfile?.id) return;
    let live = true;
    void Promise.resolve().then(() => {
      if (!live) return;
      setLoading(true);
      setError(null);
      return fetch("/api/profile-strength", { cache: "no-store" })
        .then((r) => r.json().then((b) => (r.ok ? b : Promise.reject(new Error(b?.error ?? `HTTP ${r.status}`)))))
        .then((b) => {
          if (live) setData(b);
        })
        .catch((e) => {
          if (live) setError(e.message);
        })
        .finally(() => {
          if (live) setLoading(false);
        });
    });
    return () => {
      live = false;
    };
  }, [activeProfile?.id]);

  if (loading && !data) {
    return (
      <div className="flex items-center gap-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-4 py-6 text-sm text-slate-500">
        <Loader2 className="h-4 w-4 animate-spin" /> {t("loading")}
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center gap-2 rounded-xl border border-rose-200 bg-rose-50 px-4 py-4 text-sm text-rose-700">
        <AlertTriangle className="h-4 w-4 shrink-0" /> {error}
      </div>
    );
  }

  if (!data) return null;

  const { strength, extracurriculars } = data;
  const sectionLabel = (key: string) =>
    (SECTION_KEYS as readonly string[]).includes(key) ? t(`section.${key}`) : key;
  const missingDetail = (key?: string) =>
    key ? t(`missingDetails.${key}` as never) : undefined;
  const preciseOverall = strength.overallPrecise ?? strength.overall;
  const measured = strength.scoredSections ?? strength.sections.filter((s) => !s.unknown).length;
  const total = strength.totalSections ?? strength.sections.length;

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h3 className="flex items-center gap-1.5 text-xs font-extrabold uppercase tracking-wide text-slate-500">
              <Activity className="h-3.5 w-3.5" /> {t("title")}
            </h3>
            <p className="mt-1 max-w-md text-[11px] text-slate-500">{t("subtitle")}</p>
          </div>
          <div className="shrink-0 rounded-xl bg-indigo-50 px-3 py-2 text-right dark:bg-indigo-950/50">
            <div className="text-[10px] font-bold uppercase tracking-wide text-indigo-700 dark:text-indigo-300">{t("overall")}</div>
            <div className="flex items-baseline justify-end gap-1">
              <span className="text-2xl font-black text-indigo-800 tabular-nums dark:text-indigo-100">{preciseOverall.toFixed(1)}</span>
              <span className="text-[10px] font-semibold text-indigo-600 dark:text-indigo-300">%</span>
            </div>
          </div>
        </div>

        {/* How the headline number was built — stated, never implied. */}
        <p className="mt-2 flex items-center gap-1.5 rounded-lg bg-slate-50 px-3 py-1.5 text-[11px] font-medium text-slate-600">
          <Ruler className="h-3 w-3 shrink-0 text-slate-400" aria-hidden />
          {t("basisLine", { measured, total })}
        </p>

        {strength.overall === 0 && (
          <p className="mt-3 rounded-lg bg-amber-50 px-3 py-2 text-[11px] font-semibold text-amber-800">{t("noteLow")}</p>
        )}

        <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {strength.sections.map((s) => (
            <Bar
              key={s.key}
              label={sectionLabel(s.key)}
              score={s.score}
              precise={s.scorePrecise}
              coverage={s.coverage}
              missing={s.missing?.slice(0, 1).map(missingDetail).filter((item): item is string => Boolean(item))}
              unknown={s.unknown && s.score === 0}
              unknownLabel={t("notProvided")}
              hint={s.key === "essays" ? t("essaysHint") : undefined}
            />
          ))}
        </div>
      </div>

      <div className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-4 dark:border-slate-700 dark:bg-slate-900">
        <h3 className="flex items-center gap-1.5 text-xs font-extrabold uppercase tracking-wide text-slate-600 dark:text-slate-300">
          <Activity className="h-3.5 w-3.5" aria-hidden /> {t("extraTitle")}
        </h3>
        <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {[
            [t("extraActivities"), extracurriculars.activities],
            [t("extraLeadership"), extracurriculars.leadership],
            [t("extraResearch"), extracurriculars.research],
            [t("extraAwards"), extracurriculars.awards],
          ].map(([label, value]) => (
            <div key={String(label)} className="min-h-16 rounded-xl bg-slate-50 p-3 dark:bg-slate-800/60">
              <p className="break-words text-[11px] font-semibold leading-snug text-slate-600 dark:text-slate-300">{label}</p>
              <p className="mt-1 text-2xl font-extrabold tabular-nums text-slate-900 dark:text-slate-100 dark:text-slate-100">{value}</p>
            </div>
          ))}
        </div>
        <p className="mt-3 text-xs leading-relaxed text-slate-600 dark:text-slate-300">{t("activityNote")}</p>
      </div>
    </div>
  );
}
