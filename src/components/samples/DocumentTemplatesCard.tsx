"use client";

/**
 * Collapsible "official document templates" card: the sponsor affidavit
 * (Homiylik xati, English + Uzbek), the research-supervision cold e-mail and
 * the financial & study-plan cover note. View and copy only — every personal
 * detail is a [bracketed] placeholder the student fills in.
 */
import React from "react";
import { useTranslations } from "next-intl";
import { FileText } from "lucide-react";
import type { DocumentSample } from "@/lib/samples/exemplars";
import { SampleExemplarBar } from "./SampleExemplarBar";

export function DocumentTemplatesCard({
  kinds,
  className = "",
}: {
  /** Limit the templates (the funding page shows only the money documents). */
  kinds?: DocumentSample["kind"][];
  className?: string;
}) {
  const t = useTranslations("samples");
  return (
    <details className={`min-w-0 rounded-2xl border border-slate-200 bg-white p-3 shadow-sm dark:border-slate-700 sm:px-5 ${className}`}>
      <summary className="flex min-h-11 cursor-pointer list-none items-center gap-2 rounded-lg text-sm font-bold text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500">
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600 ring-1 ring-indigo-100 dark:ring-indigo-500/25">
          <FileText aria-hidden className="h-4 w-4" />
        </span>
        <span className="min-w-0 break-words">{t("docsTitle")}</span>
      </summary>
      <p className="mt-2 text-xs leading-relaxed text-slate-600">{t("docsHint")}</p>
      <SampleExemplarBar
        group="document"
        className="mt-3"
        defaultOpen
        filter={kinds ? (sample) => kinds.includes(sample.kind) : undefined}
      />
    </details>
  );
}
