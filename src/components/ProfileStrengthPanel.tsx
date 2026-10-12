"use client";

import React, { useEffect, useState } from "react";
import { Activity, AlertTriangle, Lightbulb, Loader2, Ruler } from "lucide-react";
import { useTranslations } from "next-intl";
import { AppNote } from "@/components/AppNote";

/**
 * Profile strength dashboard.
 *
 * Every number on this panel comes from /api/profile-strength
 * (src/lib/chancing.ts `profileStrength`) — one engine, one arithmetic, no
 * second formula in the browser. The panel deliberately shows three things per
 * dimension instead of a bare bar:
 *
 *   • the PRECISE value (one decimal) next to the rounded display number, so
 *     "78" and "78.4" are not confused when two dimensions are close;
 *   • the COVERAGE (how many of the dimension's inputs exist), because a 100
 *     built from one test is not the same evidence as a 100 built from five;
 *   • what is still MISSING — the exact input to add, taken from the engine.
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
    completeness: number;
    sections: StrengthSection[];
    scoredSections?: number;
    totalSections?: number;
  };
  extracurriculars: {
    leadership: number;
    impact: number;
    consistency: number;
    academicFit: number;
    precise?: { leadership: number; impact: number; consistency: number; academicFit: number };
    suggestions: string[];
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
  missingLabel,
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
  missingLabel?: string;
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
          <span className="text-xs font-extrabold text-slate-800 tabular-nums">{score}</span>
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
        {coverage != null && (
          <span className="text-[10px] font-medium text-slate-400">
            {coverage >= 1 ? "●●" : coverage > 0 ? "●○" : "○○"} {Math.round(coverage * 100)}%
          </span>
        )}
        {missing?.[0] && (
          <p className="text-right text-[10px] leading-snug text-amber-700">
            {missingLabel ? `${missingLabel}: ` : ""}
            {missing[0]}
          </p>
        )}
      </div>
    </div>
  );
}

/**
 * Profile strength dashboard + extracurricular profile analyzer.
 * The scores come from /api/profile-strength (src/lib/chancing.ts) — one
 * number per dimension, computed from real profile data, never invented.
 */
export function ProfileStrengthPanel({ activeProfile }: { activeProfile: { id: number } | null }) {
  const t = useTranslations("strength");
  const [data, setData] = useState<StrengthData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!activeProfile?.id) return;
    let live = true;
    setLoading(true);
    setError(null);
    fetch("/api/profile-strength", { cache: "no-store" })
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
    return () => {
      live = false;
    };
  }, [activeProfile?.id]);

  if (loading && !data) {
    return (
      <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-6 text-sm text-slate-500">
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
  const preciseOverall = strength.overallPrecise ?? strength.overall;
  const measured = strength.scoredSections ?? strength.sections.filter((s) => !s.unknown).length;
  const total = strength.totalSections ?? strength.sections.length;

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-slate-200 bg-white p-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h3 className="flex items-center gap-1.5 text-xs font-extrabold uppercase tracking-wide text-slate-500">
              <Activity className="h-3.5 w-3.5" /> {t("title")}
            </h3>
            <p className="mt-1 max-w-md text-[11px] text-slate-500">{t("subtitle")}</p>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-right">
              <div className="text-[10px] font-bold uppercase tracking-wide text-slate-400">{t("overall")}</div>
              <div className="flex items-baseline justify-end gap-1">
                <span className="text-2xl font-black text-indigo-700 tabular-nums">{preciseOverall.toFixed(1)}</span>
                <span className="text-[10px] font-semibold text-slate-400">/100</span>
              </div>
            </div>
            <div className="text-right">
              <div className="text-[10px] font-bold uppercase tracking-wide text-slate-400">{t("completeness")}</div>
              <div className="text-2xl font-black text-slate-800 tabular-nums">{strength.completeness}%</div>
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
              missing={s.missing}
              missingLabel={t("missing")}
              unknown={s.unknown && s.score === 0}
              unknownLabel={t("notProvided")}
              hint={!s.unknown && s.key === "essays" && s.score === 0 ? t("essaysHint") : undefined}
            />
          ))}
        </div>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-4">
        <h3 className="flex items-center gap-1.5 text-xs font-extrabold uppercase tracking-wide text-slate-500">
          <Activity className="h-3.5 w-3.5" /> {t("extraTitle")}
        </h3>
        <div className="mt-3 grid grid-cols-2 gap-3 lg:grid-cols-4">
          <Bar label={t("extraLeadership")} score={extracurriculars.leadership} precise={extracurriculars.precise?.leadership} coverage={1} />
          <Bar label={t("impact")} score={extracurriculars.impact} precise={extracurriculars.precise?.impact} coverage={1} />
          <Bar label={t("consistency")} score={extracurriculars.consistency} precise={extracurriculars.precise?.consistency} coverage={1} />
          <Bar label={t("academicFit")} score={extracurriculars.academicFit} precise={extracurriculars.precise?.academicFit} coverage={1} />
        </div>
        <div className="mt-4">
          <div className="flex items-center gap-1.5 text-[11px] font-bold text-slate-600">
            <Lightbulb className="h-3.5 w-3.5 text-amber-500" /> {t("suggestions")}
          </div>
          <ul className="mt-2 space-y-1.5">
            {extracurriculars.suggestions.map((s, i) => (
              <li key={i} className="flex items-start gap-2 text-xs text-slate-700">
                <span className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-indigo-50 text-[9px] font-black text-indigo-700">
                  {i + 1}
                </span>
                <span className="min-w-0 flex-1">{s}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
      <AppNote kind="estimate" className="text-[11px]" />
    </div>
  );
}
