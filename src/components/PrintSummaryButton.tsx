"use client";

/**
 * "Download / Print summary" (Phase 3.4).
 *
 * One button, one behaviour: the browser's own print dialog, which is also the
 * only PDF export the platform needs (students save as PDF from there). The
 * button itself and the app chrome are hidden by the `sb-no-print` rule, and
 * `sb-print-block` keeps a card from being split across pages.
 *
 * Deliberately no server-side PDF generation: the same page prints WYSIWYG,
 * so a printed summary can never disagree with what the student saw.
 */
import React from "react";
import { useTranslations } from "next-intl";
import { Printer } from "lucide-react";

export function PrintSummaryButton({
  label,
  className = "",
}: {
  /** Optional override; defaults to the shared `common.printSummary` label. */
  label?: string;
  className?: string;
}) {
  const t = useTranslations("common");
  return (
    <button
      type="button"
      onClick={() => window.print()}
      className={`no-print inline-flex min-h-11 items-center gap-1.5 rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800 ${className}`}
    >
      <Printer className="h-3.5 w-3.5" aria-hidden="true" />
      {label ?? t("printSummary")}
    </button>
  );
}

/**
 * Print-only heading so a printed page is self-describing (title, student,
 * date) even when the app chrome is hidden.
 */
export function PrintHeader({ title, subtitle }: { title: string; subtitle?: string | null }) {
  const t = useTranslations("common");
  const today = new Date().toISOString().slice(0, 10);
  return (
    <div className="print-only mb-4 border-b border-slate-300 pb-2">
      <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">ScholarBridgeAI</p>
      <h1 className="text-lg font-black text-slate-900">{title}</h1>
      <p className="text-[11px] text-slate-600">
        {subtitle ? `${subtitle} · ` : ""}
        {t("printedOn", { date: today })}
      </p>
    </div>
  );
}
