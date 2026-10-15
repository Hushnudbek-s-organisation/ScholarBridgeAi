"use client";

import { useTranslations } from "next-intl";
import { evidenceConfidence, type MatchBreakdown } from "@/lib/matching";

/**
 * The exact arithmetic behind a Fit score: one chip per scoring dimension with
 * the points it contributed, plus how many dimensions actually had data.
 *
 * WHY IT EXISTS: a student who sees "84%" and nothing else has to trust the
 * number. This strip shows the arithmetic that produced it — every component
 * is the real 2-dp contribution from `src/lib/matching.ts`, negative values
 * are marked, and a dimension the profile/catalogue could not compare shows
 * "—" instead of a silent zero. It is a pure presentational component so the
 * render suite can assert it without a database.
 *
 * DEFENSIVE: the API contract is `{ rawScore, components, … }`, but an older
 * deployment could still send a bare component array. Both shapes render.
 */
export function MatchBreakdownStrip({
  breakdown,
  className = "",
}: {
  breakdown: MatchBreakdown | MatchBreakdown["components"] | null | undefined;
  className?: string;
}) {
  const t = useTranslations("university");
  if (!breakdown) return null;

  const components = Array.isArray(breakdown) ? breakdown : breakdown.components;
  if (!Array.isArray(components) || components.length <= 1) return null;

  const measured = Array.isArray(breakdown)
    ? components.filter((c) => c.compared && c.key !== "base").length
    : breakdown.comparedDimensions;
  const total = Array.isArray(breakdown)
    ? components.filter((c) => c.key !== "base").length
    : breakdown.totalDimensions;

  // Evidence / confidence (defect 4.1). Derived from the counts when an older
  // API payload has no tier, so the badge is never missing.
  const evidence =
    !Array.isArray(breakdown) && breakdown.confidenceTier
      ? { tier: breakdown.confidenceTier, pct: breakdown.evidenceCoveragePct }
      : { tier: evidenceConfidence(measured, total).confidenceTier, pct: evidenceConfidence(measured, total).evidenceCoveragePct };
  const tierLabel =
    evidence.tier === "high" ? t("exEvidenceHigh") : evidence.tier === "medium" ? t("exEvidenceMedium") : t("exEvidenceLow");
  const tierClass =
    evidence.tier === "high"
      ? "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200"
      : evidence.tier === "medium"
        ? "bg-white text-slate-600 ring-1 ring-slate-200"
        : "bg-amber-50 text-amber-800 ring-1 ring-amber-200";

  // Segmented micro-bar: positive (emerald), neutral (slate), shortfall (amber),
  // and NOT-compared (hatched grey) — the shape of the score at a glance.
  const real = components.filter((c) => c.key !== "base");
  const segments = real.map((c) =>
    !c.compared ? "bg-slate-200" : c.points > 0 ? "bg-emerald-500" : c.points < 0 ? "bg-amber-500" : "bg-slate-300"
  );

  return (
    <div className={`mt-2 rounded-lg border border-slate-200 bg-slate-50/70 px-2 py-1.5 ${className}`}>
      <div className="flex items-center justify-between gap-2">
        <span className="text-[10px] font-bold uppercase tracking-wide text-slate-500">
          {t("exScoreBreakdown")}
        </span>
        <span className="inline-flex items-center gap-1">
          <span
            className={`inline-flex items-center rounded-full px-1.5 py-0.5 text-[10px] font-bold tabular-nums ${tierClass}`}
            title={t("exConfidenceHint")}
          >
            <span aria-hidden className="mr-1 inline-block h-1.5 w-1.5 rounded-full bg-current" />
            {tierLabel} · {evidence.pct}%
          </span>
          <span className="text-[10px] font-semibold text-slate-500 tabular-nums">
            {t("exDimensionsMeasured", { measured, total })}
          </span>
        </span>
      </div>
      {/* Segmented evidence bar: one segment per dimension. */}
      <div className="mt-1 flex h-1 gap-0.5 overflow-hidden rounded-full" aria-hidden>
        {segments.map((cls, i) => (
          <span key={i} className={`h-full flex-1 rounded-full ${cls}`} />
        ))}
      </div>
      <p className="mt-1 text-[10px] text-slate-500 tabular-nums">
        {t("exConfidenceCompared", { compared: measured, total })}
      </p>
      <div className="mt-1 flex flex-wrap gap-1">
        {components
          .filter((c) => c.key !== "base")
          .map((c) => (
            <span
              key={c.key}
              title={c.compared ? undefined : t("exDimensionUnknown")}
              className={`inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[10px] font-semibold tabular-nums ${
                !c.compared
                  ? "bg-white text-slate-400 ring-1 ring-slate-200"
                  : c.points > 0
                    ? "bg-emerald-50 text-emerald-700"
                    : c.points < 0
                      ? "bg-amber-50 text-amber-800"
                      : "bg-white text-slate-500 ring-1 ring-slate-200"
              }`}
            >
              {t(`dim.${c.key}`)}
              <span>{!c.compared ? "—" : `${c.points > 0 ? "+" : ""}${c.points.toFixed(1)}`}</span>
            </span>
          ))}
      </div>
    </div>
  );
}
