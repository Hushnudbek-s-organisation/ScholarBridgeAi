"use client";

/**
 * GOLD-STANDARD SAMPLE BAR (Phase 7).
 *
 * One compact, high-contrast callout that sits at the top of every authoring
 * studio and offers three actions on a real, international-standard exemplar:
 *
 *   👁️ View annotated sample  — expands the text split into structural blocks,
 *                               each with a "why this works" note (uz/ru/en).
 *   ⚡ Load into editor        — hands the text to the parent component.
 *   📋 Copy template           — copies the plain text to the clipboard.
 *
 * The academic-integrity banner (SAMPLE_STRUCTURE_NOTE) is shown whenever the
 * sample is viewed or loaded: the exemplar teaches structure and evidence
 * density, never wording to submit. Nothing is written anywhere until the
 * student explicitly clicks "Load into editor".
 */
import React, { useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { BookOpen, Check, ChevronDown, ClipboardCopy, Eye, EyeOff, GraduationCap, Sparkles } from "lucide-react";
import {
  SAMPLE_DEFAULTS,
  SAMPLE_STRUCTURE_NOTE,
  SAMPLES,
  samplesByKind,
  type SampleExemplar,
  type SampleKind,
} from "@/lib/samples/exemplars";
import { useLocaleContext } from "@/i18n/LocaleProvider";

export interface SampleExemplarBarProps {
  /** Which surface this bar belongs to — decides the default sample set. */
  kind: SampleKind | SampleKind[];
  /** Optional allowlist of sample ids (order is preserved). */
  sampleIds?: string[];
  /** Insert the sample text into the editor. */
  onLoad: (text: string, sample: SampleExemplar) => void;
  /** Optional extra callback (e.g. SOP field pre-fill). */
  onExtraLoad?: (sample: SampleExemplar) => void;
  className?: string;
}

export function SampleExemplarBar({ kind, sampleIds, onLoad, onExtraLoad, className = "" }: SampleExemplarBarProps) {
  const t = useTranslations("samples");
  const { locale } = useLocaleContext();
  const lang = locale === "uz" || locale === "ru" ? locale : "en";

  const options = useMemo<SampleExemplar[]>(() => {
    const kinds = Array.isArray(kind) ? kind : [kind];
    const fromIds = (sampleIds ?? [])
      .map((id) => SAMPLES.find((s) => s.id === id))
      .filter((s): s is SampleExemplar => Boolean(s));
    if (fromIds.length > 0) return fromIds;
    const out: SampleExemplar[] = [];
    for (const k of kinds) out.push(...samplesByKind(k));
    return out;
  }, [kind, sampleIds]);

  const [selectedId, setSelectedId] = useState<string>(
    options[0]?.id ?? (typeof kind === "string" ? SAMPLE_DEFAULTS[kind] : "") ?? ""
  );
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  const selected = options.find((s) => s.id === selectedId) ?? options[0] ?? null;
  if (!selected) return null;

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(selected.text);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  };

  const load = () => {
    onLoad(selected.text, selected);
    onExtraLoad?.(selected);
  };

  return (
    <section
      className={`rounded-2xl border border-amber-300 bg-amber-50 p-3 dark:border-amber-500/40 dark:bg-amber-500/10 sm:p-4 ${className}`}
      aria-label={t("barLabel")}
    >
      <div className="flex flex-wrap items-center gap-2">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-500 px-2.5 py-1 text-[10px] font-black uppercase tracking-wider text-slate-900 sb-ink-on-warm">
          <GraduationCap className="h-3.5 w-3.5" aria-hidden="true" />
          {t("pill")}
        </span>

        {options.length > 1 && (
          <label className="relative inline-flex min-w-0 flex-1 items-center sm:max-w-md">
            <span className="sr-only">{t("chooseSample")}</span>
            <select
              value={selected.id}
              onChange={(event) => {
                setSelectedId(event.target.value);
                setCopied(false);
              }}
              className="min-h-11 w-full appearance-none rounded-xl border border-amber-300 bg-white px-3 py-2 pr-8 text-xs font-semibold text-slate-900 dark:border-amber-500/40 dark:bg-slate-900 dark:text-slate-100"
            >
              {options.map((option) => (
                <option key={option.id} value={option.id}>
                  {option.title[lang]}
                </option>
              ))}
            </select>
            <ChevronDown className="pointer-events-none absolute right-2.5 h-4 w-4 text-slate-500 dark:text-slate-400" aria-hidden="true" />
          </label>
        )}

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            aria-expanded={open}
            className="inline-flex min-h-11 items-center gap-1.5 rounded-xl border border-amber-400 bg-white px-3 py-2 text-xs font-bold text-amber-900 transition-colors hover:bg-amber-100 dark:border-amber-500/40 dark:bg-slate-900 dark:text-amber-200 dark:hover:bg-slate-800"
          >
            {open ? <EyeOff className="h-3.5 w-3.5" aria-hidden="true" /> : <Eye className="h-3.5 w-3.5" aria-hidden="true" />}
            {open ? t("hideSample") : t("viewSample")}
          </button>
          <button
            type="button"
            onClick={load}
            className="inline-flex min-h-11 items-center gap-1.5 rounded-xl bg-amber-500 px-3 py-2 text-xs font-black text-slate-900 sb-ink-on-warm shadow-xs transition-colors hover:bg-amber-400"
          >
            <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
            {t("loadSample")}
          </button>
          <button
            type="button"
            onClick={copy}
            className="inline-flex min-h-11 items-center gap-1.5 rounded-xl border border-amber-400 bg-white px-3 py-2 text-xs font-bold text-amber-900 transition-colors hover:bg-amber-100 dark:border-amber-500/40 dark:bg-slate-900 dark:text-amber-200 dark:hover:bg-slate-800"
          >
            {copied ? <Check className="h-3.5 w-3.5" aria-hidden="true" /> : <ClipboardCopy className="h-3.5 w-3.5" aria-hidden="true" />}
            {copied ? t("copied") : t("copyTemplate")}
          </button>
        </div>
      </div>

      <p className="mt-2 text-[11px] leading-relaxed text-amber-900 dark:text-amber-200">{selected.summary[lang]}</p>

      {open && (
        <div className="mt-3 space-y-3 border-t border-amber-300 pt-3 dark:border-amber-500/40">
          <p
            role="note"
            className="rounded-xl border border-amber-300 bg-white/80 p-3 text-[11px] leading-relaxed text-amber-900 dark:border-amber-500/40 dark:bg-slate-900/60 dark:text-amber-200"
          >
            {SAMPLE_STRUCTURE_NOTE[lang]}
          </p>
          <div className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-wider text-amber-900 dark:text-amber-200">
            <BookOpen className="h-3.5 w-3.5" aria-hidden="true" />
            {t("annotatedTitle")}
          </div>
          <ol className="space-y-3">
            {selected.blocks.map((b, index) => (
              <li key={`${selected.id}-${index}`} className="rounded-xl border border-amber-200 bg-white p-3 dark:border-slate-700 dark:bg-slate-900">
                <p className="text-[11px] font-black uppercase tracking-wider text-amber-700 dark:text-amber-300">{b.heading[lang]}</p>
                <pre className="mt-1.5 max-h-56 overflow-auto whitespace-pre-wrap break-words font-sans text-[12px] leading-relaxed text-slate-800 dark:text-slate-200">
                  {b.text}
                </pre>
                <p className="mt-2 rounded-lg bg-amber-50 p-2 text-[11px] leading-relaxed text-slate-700 dark:bg-amber-500/10 dark:text-slate-200">
                  <span className="font-bold">{t("whyThisWorks")}: </span>
                  {b.why[lang]}
                </p>
              </li>
            ))}
          </ol>
        </div>
      )}
    </section>
  );
}
