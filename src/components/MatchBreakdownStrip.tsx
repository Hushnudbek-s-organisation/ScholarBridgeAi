"use client";

import { useTranslations } from "next-intl";
import type { MatchBreakdown } from "@/lib/matching";
import { MatchEvidenceBadge } from "./MatchEvidenceBadge";

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

  return (
    <div className={`mt-2 rounded-lg border border-slate-200 bg-slate-50/70 px-2 py-1.5 ${className}`}>
      <div className="flex items-center justify-between gap-2">
        <span className="text-[10px] font-bold uppercase tracking-wide text-slate-500">
          {t("exScoreBreakdown")}
        </span>
        <div className="flex flex-wrap items-center justify-end gap-1.5">
          <span className="text-[10px] font-semibold text-slate-500 tabular-nums">
            {t("exDimensionsMeasured", { measured, total })}
          </span>
          {!Array.isArray(breakdown) && (
            <MatchEvidenceBadge
              comparedDimensions={measured}
              totalDimensions={total}
              evidenceCoveragePct={breakdown.evidenceCoveragePct}
              evidenceLevel={breakdown.evidenceLevel}
            />
          )}
        </div>
      </div>
      {(() => {
        // One color-coded bar per MEASURED dimension. The center line is the
        // neutral point: emerald grows right for +points, amber/rose grows
        // left for penalties, and 0 shows only a neutral tick. The width is a
        // simple ±12-point linear scale, capped — it visualizes RELATIVE
        // contribution, never a probability.
        const bars = components.filter((c) => c.key !== "base" && c.compared);
        if (bars.length === 0) return null;
        const scale = 12;
        return (
          <div className="mt-1.5 space-y-1" aria-hidden>
            {bars.map((c) => {
              const clamped = Math.min(Math.abs(c.points) / scale, 1) * 50;
              const pct = Math.max(clamped, Math.abs(c.points) > 0 ? 4 : 1.5);
              return (
                <div key={`bar-${c.key}`} className="flex items-center gap-1.5">
                  <span className="w-1/3 min-w-0 break-words text-[9px] font-semibold leading-tight text-slate-500">
                    {t(`dim.${c.key}`)}
                  </span>
                  <span className="relative h-1.5 min-w-0 flex-1 rounded-full bg-slate-200/70">
                    <span className="absolute inset-y-0 left-1/2 w-px bg-slate-400/60" />
                    {c.points > 0 && (
                      <span className="absolute inset-y-0 left-1/2 rounded-full bg-emerald-500" style={{ width: `${pct}%` }} />
                    )}
                    {c.points < 0 && (
                      <span
                        className={`absolute inset-y-0 rounded-full ${c.points <= -5 ? "bg-rose-500" : "bg-amber-500"}`}
                        style={{ width: `${pct}%`, right: "50%" }}
                      />
                    )}
                    {c.points === 0 && (
                      <span className="absolute inset-y-0 left-1/2 w-[3px] -translate-x-1/2 rounded-full bg-slate-400" />
                    )}
                  </span>
                  <span
                    className={`w-10 shrink-0 text-right text-[9px] font-bold tabular-nums ${
                      c.points > 0 ? "text-emerald-700" : c.points < 0 ? "text-rose-700" : "text-slate-400"
                    }`}
                  >
                    {`${c.points > 0 ? "+" : ""}${c.points.toFixed(1)}`}
                  </span>
                </div>
              );
            })}
          </div>
        );
      })()}
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
      {(() => {
        // The arithmetic spelled out: the neutral base plus every measured
        // contribution equals the score the card shows. For the legacy bare
        // array (no rawScore in the payload) the same sum is derived from the
        // components themselves, so the line is never a guess.
        const base = components.find((c) => c.key === "base");
        if (!base || components.length <= 1) return null;
        const sum = Math.round(components.reduce((total, c) => total + c.points, 0) * 10) / 10;
        const raw = !Array.isArray(breakdown) && typeof breakdown.rawScore === "number" ? breakdown.rawScore : sum;
        return (
          <p className="mt-1.5 break-words border-t border-slate-200/70 pt-1 text-[10px] font-bold text-slate-600 tabular-nums">
            {t("exScoreFormula", { base: base.points, raw })}
          </p>
        );
      })()}
    </div>
  );
}
