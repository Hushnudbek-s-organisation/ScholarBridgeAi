"use client";

import { useTranslations } from "next-intl";
import { summarizeMatchEvidence } from "@/lib/matching";

/**
 * Coverage-based context for deterministic profile-fit scores. This explains
 * how much comparable data was available; it never predicts an admission or
 * other outcome.
 */
export function MatchEvidenceBadge({
  comparedDimensions,
  totalDimensions,
  evidenceCoveragePct,
  evidenceLevel,
  className = "",
}: {
  comparedDimensions: number;
  totalDimensions: number;
  evidenceCoveragePct?: number;
  evidenceLevel?: "limited" | "partial" | "broad";
  className?: string;
}) {
  const t = useTranslations("university");
  const derived = summarizeMatchEvidence(comparedDimensions, totalDimensions);
  const percent = evidenceCoveragePct ?? derived.evidenceCoveragePct;
  const level = evidenceLevel ?? derived.evidenceLevel;
  const levelStyle = level === "broad"
    ? "border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-200"
    : level === "partial"
      ? "border-amber-200 bg-amber-50 text-amber-900 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-200"
      : "border-slate-200 bg-slate-50 text-slate-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300";

  return (
    <span
      title={t("exEvidenceDisclaimer")}
      aria-label={`${t("exEvidenceCoverage", { percent, compared: comparedDimensions, total: totalDimensions })}. ${t(`exEvidenceLevel.${level}` as never)}`}
      className={`inline-flex max-w-full items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-semibold leading-tight tabular-nums ${levelStyle} ${className}`}
    >
      <span>{t("exEvidenceCoverage", { percent, compared: comparedDimensions, total: totalDimensions })}</span>
      <span aria-hidden="true">·</span>
      <span>{t(`exEvidenceLevel.${level}` as never)}</span>
    </span>
  );
}
