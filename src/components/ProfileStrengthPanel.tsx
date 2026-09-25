"use client";

import React, { useEffect, useState } from "react";
import { Activity, AlertTriangle, Lightbulb, Loader2 } from "lucide-react";
import { useTranslations } from "next-intl";

interface StrengthSection {
  key: string;
  label: string;
  score: number;
}

interface StrengthData {
  strength: { overall: number; completeness: number; sections: StrengthSection[] };
  extracurriculars: {
    leadership: number;
    impact: number;
    consistency: number;
    academicFit: number;
    suggestions: string[];
  };
}

const SECTION_KEYS = ["academics", "tests", "extracurriculars", "leadership", "awards", "essays", "financial"] as const;

function Bar({ label, score, hint }: { label: string; score: number; hint?: string }) {
  return (
    <div>
      <div className="flex items-baseline justify-between">
        <span className="text-[11px] font-semibold text-slate-600">{label}</span>
        <span className="text-xs font-extrabold text-slate-800">{score}</span>
      </div>
      {hint && <p className="mt-0.5 text-[10px] text-slate-400">{hint}</p>}
      <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
        <div
          className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-violet-500 transition-all"
          style={{ width: `${score}%` }}
        />
      </div>
    </div>
  );
}

/**
 * #22 Profile strength dashboard + #21 extracurricular profile analyzer.
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
              <div className="text-2xl font-black text-indigo-700">{strength.overall}</div>
            </div>
            <div className="text-right">
              <div className="text-[10px] font-bold uppercase tracking-wide text-slate-400">{t("completeness")}</div>
              <div className="text-2xl font-black text-slate-800">{strength.completeness}%</div>
            </div>
          </div>
        </div>

        {strength.overall === 0 && (
          <p className="mt-3 rounded-lg bg-amber-50 px-3 py-2 text-[11px] font-semibold text-amber-800">{t("noteLow")}</p>
        )}

        <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {strength.sections.map((s) => (
            <Bar
              key={s.key}
              label={sectionLabel(s.key)}
              score={s.score}
              hint={s.key === "essays" && s.score === 0 ? t("essaysHint") : undefined}
            />
          ))}
        </div>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-4">
        <h3 className="flex items-center gap-1.5 text-xs font-extrabold uppercase tracking-wide text-slate-500">
          <Activity className="h-3.5 w-3.5" /> {t("extraTitle")}
        </h3>
        <div className="mt-3 grid grid-cols-2 gap-3 lg:grid-cols-4">
          <Bar label={t("extraLeadership")} score={extracurriculars.leadership} />
          <Bar label={t("impact")} score={extracurriculars.impact} />
          <Bar label={t("consistency")} score={extracurriculars.consistency} />
          <Bar label={t("academicFit")} score={extracurriculars.academicFit} />
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
    </div>
  );
}
