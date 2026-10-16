"use client";

/**
 * Priority 4.4 — the five-block Statement of Purpose structure bar.
 *
 * An SOP that reads well but omits the return-career plan is the single most
 * common reason a strong applicant is rejected. This bar names the five blocks
 * an admissions reader looks for, shows which ones the draft actually contains,
 * and quotes the sentence that proved each one — so the verdict can be checked
 * instead of trusted.
 *
 * Problem Hook → Academic Rigor → Quantified Research → Faculty/Course Fit →
 * Return Career Plan.
 *
 * Detection is deterministic and local (`src/lib/essayInsights.ts`): no model
 * call, no network, same answer for the same text.
 */
import React from "react";
import { useTranslations } from "next-intl";
import { Check, ListChecks, X } from "lucide-react";
import { evaluateSopStructure, type SopStructure } from "@/lib/essayInsights";

interface SopStructureBarProps {
  /** Plain text of the draft (markdown stripped by the caller). */
  text: string;
  /** Naming the target tightens the Faculty/Course Fit check. */
  universityName?: string | null;
  programName?: string | null;
  className?: string;
}

export function SopStructureBar({ text, universityName, programName, className = "" }: SopStructureBarProps) {
  const t = useTranslations("ai");

  const structure: SopStructure | null = React.useMemo(
    () => (text.trim() ? evaluateSopStructure(text, { universityName, programName }) : null),
    [text, universityName, programName]
  );

  if (!structure) return null;

  const missing = structure.blocks.filter((block) => !block.satisfied);
  const tone =
    structure.pct >= 80
      ? "border-emerald-200 bg-emerald-50 dark:border-emerald-500/30 dark:bg-emerald-500/10"
      : structure.pct >= 40
        ? "border-amber-200 bg-amber-50 dark:border-amber-500/30 dark:bg-amber-500/10"
        : "border-rose-200 bg-rose-50 dark:border-rose-500/30 dark:bg-rose-500/10";

  return (
    <div className={`rounded-xl border p-3 ${tone} ${className}`} data-sop-blocks={structure.satisfiedCount}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h4 className="flex items-center gap-1.5 text-xs font-extrabold text-slate-800">
          <ListChecks className="h-3.5 w-3.5" aria-hidden />
          {t("sopStructureTitle")}
        </h4>
        <span className="text-[11px] font-bold text-slate-600">
          {t("sopStructureScore", { met: structure.satisfiedCount, total: structure.total })}
        </span>
      </div>

      {/* The bar itself: one segment per block, in reading order. */}
      <div className="mt-2 flex flex-wrap gap-1.5" role="list">
        {structure.blocks.map((block) => (
          <div
            key={block.id}
            role="listitem"
            title={
              block.satisfied
                ? t(`sopBlocks.${block.id}.found`, { evidence: block.evidence ?? "" })
                : t(`sopBlocks.${block.id}.missing`)
            }
            className={`flex min-w-0 flex-1 basis-[9rem] items-start gap-1.5 rounded-lg border px-2 py-1.5 ${
              block.satisfied
                ? "border-emerald-300 bg-white text-emerald-800 dark:border-emerald-500/40 dark:bg-emerald-500/15 dark:text-emerald-100"
                : "border-slate-300 bg-white text-slate-600 dark:border-slate-600 dark:bg-slate-800/60 dark:text-slate-300"
            }`}
          >
            {block.satisfied ? (
              <Check className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden />
            ) : (
              <X className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden />
            )}
            <span className="min-w-0">
              <span className="block text-[11px] font-bold leading-snug">
                {block.order}. {t(`sopBlocks.${block.id}.label`)}
              </span>
              {/* Verbatim proof, so a tick is never a black box. */}
              <span className="mt-0.5 block break-words text-[10px] leading-snug whitespace-normal opacity-80">
                {block.satisfied
                  ? block.evidence
                  : t(`sopBlocks.${block.id}.hint`)}
              </span>
            </span>
          </div>
        ))}
      </div>

      {missing.length > 0 && (
        <p className="mt-2 break-words text-[11px] font-semibold leading-relaxed text-slate-700">
          {t("sopStructureNext", { blocks: missing.map((block) => t(`sopBlocks.${block.id}.label`)).join(" · ") })}
        </p>
      )}
      {missing.length === 0 && (
        <p className="mt-2 break-words text-[11px] font-semibold leading-relaxed text-emerald-800 dark:text-emerald-100">
          {t("sopStructureComplete")}
        </p>
      )}
    </div>
  );
}

export default SopStructureBar;
