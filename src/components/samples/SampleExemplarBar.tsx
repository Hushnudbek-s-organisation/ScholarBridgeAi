"use client";

/**
 * SampleExemplarBar — the one way every authoring surface shows a sample.
 *
 *   [Track ▾] [View annotated sample] [Load into editor] [Copy text]
 *   honesty notice
 *   (optional) numbered paragraphs · structural badge · "why readers reward this"
 *
 * The bar never writes anything. "Load" hands the selected sample to the
 * parent's `onLoad`, which fills an UNSAVED editor or form — and only after an
 * explicit click. Persisting borrowed text is the parent's call, and every
 * parent that saves refuses an unchanged sample (see isUnmodifiedSample).
 *
 * The library is fetched lazily (useSampleLibrary), so the bar renders a
 * loading line on the server and on first paint, then the controls.
 */
import React, { useId, useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { Check, Copy, Eye, EyeOff, Loader2, RotateCcw, ShieldCheck, Sparkles, Zap } from "lucide-react";
import type { SampleExemplar, SampleGroup, SampleOf, SampleRole } from "@/lib/samples/exemplars";
import { evidenceCount, placeholderCount, sampleWordCount, segmentSampleText, splitParagraphs } from "@/lib/samples/text";
import { useSampleLibrary } from "./useSampleLibrary";

export type SampleVariant = "en" | "uz";

type SampleTranslator = (key: string, values?: Record<string, string | number>) => unknown;
function useSafeSampleT() {
  const translate = useTranslations("samples") as unknown as SampleTranslator;
  return (key: string, values?: Record<string, string | number>) => {
    try {
      const result = translate(key, values);
      return typeof result === "string" ? result : key.split(".").pop()?.replaceAll("_", " ") || key;
    } catch {
      return key.split(".").pop()?.replaceAll("_", " ") || key;
    }
  };
}

const secondaryButton =
  "inline-flex min-h-11 items-center justify-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-700 transition-colors hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 disabled:cursor-not-allowed disabled:opacity-60";
const primaryButton =
  "inline-flex min-h-11 items-center justify-center gap-1.5 rounded-lg bg-indigo-600 px-3 py-2 text-xs font-bold text-white transition-colors hover:bg-indigo-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60";

export const sampleButtonClass = { primary: primaryButton, secondary: secondaryButton };

/** The text of the chosen language variant (some documents carry an Uzbek version). */
export function sampleTextFor(sample: SampleExemplar, variant: SampleVariant = "en"): string {
  return variant === "uz" && sample.group === "document" && sample.textUz ? sample.textUz : sample.text;
}

/** A leading "Officer:", "Subject:", "Date:" or heading label is set in bold. */
const LINE_LABEL_RE = /^([A-Z][A-Za-z&'’ -]{1,40}:)(?=\s|$)/;

/** Evidence figures in green, [placeholders] in violet, line labels in bold. */
export function HighlightedText({ text }: { text: string }) {
  return (
    <>
      {text.split("\n").map((line, lineIndex) => {
        const label = line.match(LINE_LABEL_RE)?.[1] ?? null;
        const rest = label ? line.slice(label.length) : line;
        return (
          <React.Fragment key={lineIndex}>
            {lineIndex > 0 && "\n"}
            {label && <strong className="font-bold text-slate-900">{label}</strong>}
            <HighlightedRun text={rest} />
          </React.Fragment>
        );
      })}
    </>
  );
}

function HighlightedRun({ text }: { text: string }) {
  return (
    <>
      {segmentSampleText(text).map((segment, index) =>
        segment.kind === "text" ? (
          <React.Fragment key={index}>{segment.value}</React.Fragment>
        ) : segment.kind === "evidence" ? (
          <mark key={index} className="rounded bg-emerald-50 px-0.5 font-semibold text-emerald-800 dark:text-emerald-200">
            {segment.value}
          </mark>
        ) : (
          <mark
            key={index}
            className="rounded bg-violet-50 px-0.5 font-semibold text-violet-800 ring-1 ring-violet-200 dark:text-violet-200 dark:ring-violet-500/30"
          >
            {segment.value}
          </mark>
        ),
      )}
    </>
  );
}

/** Numbered paragraphs, each with its structural badge and the localized reason it works. */
export function AnnotatedSample({ text, roles }: { text: string; roles: SampleRole[] }) {
  const t = useSafeSampleT();
  const paragraphs = splitParagraphs(text);
  return (
    <ol className="space-y-2" aria-label={t("annotatedTitle")}>
      {paragraphs.map((paragraph, index) => {
        const role = roles[index] ?? roles[roles.length - 1] ?? "evidence";
        return (
          <li
            key={index}
            className="grid gap-2 rounded-xl border border-slate-200 bg-white p-3 md:grid-cols-[minmax(0,1fr)_minmax(0,15rem)]"
          >
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-1.5">
                <span
                  aria-hidden
                  className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-indigo-600 text-[11px] font-bold text-white"
                >
                  {index + 1}
                </span>
                <span className="sr-only">{t("paragraph", { n: index + 1 })}:</span>
                <span className="rounded-full bg-indigo-50 px-2 py-0.5 text-[11px] font-bold text-indigo-700 ring-1 ring-indigo-100 dark:text-indigo-200 dark:ring-indigo-500/30">
                  {t(`roles.${role}.label` as never)}
                </span>
              </div>
              <p className="mt-2 whitespace-pre-wrap break-words text-[13px] leading-relaxed text-slate-800">
                <HighlightedText text={paragraph} />
              </p>
            </div>
            <aside className="rounded-lg bg-slate-50 p-2.5 text-xs leading-relaxed text-slate-600">
              <p className="font-bold text-slate-800">{t("whyTitle")}</p>
              <p className="mt-1">{t(`roles.${role}.why` as never)}</p>
            </aside>
          </li>
        );
      })}
    </ol>
  );
}

/** Words · evidence figures · placeholders left · practice limit. */
export function SampleMeta({ text, wordLimit }: { text: string; wordLimit?: number | null }) {
  const t = useSafeSampleT();
  const placeholders = placeholderCount(text);
  const parts = [t("words", { n: sampleWordCount(text) }), t("evidence", { n: evidenceCount(text) })];
  return (
    <div className="mt-2 space-y-1 text-[11px] leading-relaxed text-slate-500">
      <p>{parts.join(" · ")}</p>
      {placeholders > 0 && <p className="font-semibold text-violet-800 dark:text-violet-200">{t("placeholders", { n: placeholders })}</p>}
      {wordLimit ? <p>{t("practiceLimit", { n: wordLimit })}</p> : null}
    </div>
  );
}

/** Clipboard with a 2-second confirmation and an announced result. */
function useCopy() {
  const [state, setState] = useState<"idle" | "ok" | "fail">("idle");
  const copy = async (text: string) => {
    if (!text) return;
    try {
      await navigator.clipboard.writeText(text);
      setState("ok");
    } catch {
      setState("fail");
    }
    window.setTimeout(() => setState("idle"), 2000);
  };
  return { state, copy, reset: () => setState("idle") };
}

export interface SampleExemplarBarProps<G extends SampleGroup> {
  group: G;
  /** Receives the selected sample on "Load". Omit to show a view/copy-only bar. */
  onLoad?: (sample: SampleOf<G>) => void;
  /** Replaces the "Load into editor" label (e.g. "Compare side by side"). */
  loadLabel?: string;
  loadDisabled?: boolean;
  /** Open the annotated view when Load is clicked. */
  openOnLoad?: boolean;
  /** Restricts which tracks are offered. */
  filter?: (sample: SampleOf<G>) => boolean;
  /** Reorders the tracks (e.g. the request e-mail first in the LOR drawer). */
  sort?: (a: SampleOf<G>, b: SampleOf<G>) => number;
  /** Controlled track selection (e.g. synced to a chosen visa country). */
  selectedId?: string | null;
  onSelect?: (id: string) => void;
  defaultOpen?: boolean;
  /** Replaces the group title. */
  title?: string;
  /** Extra content under the annotated view (e.g. a live rubric). */
  renderExtra?: (sample: SampleOf<G>) => React.ReactNode;
  className?: string;
}

export function SampleExemplarBar<G extends SampleGroup>({
  group,
  onLoad,
  loadLabel,
  loadDisabled = false,
  openOnLoad = false,
  filter,
  sort,
  selectedId,
  onSelect,
  defaultOpen = false,
  title,
  renderExtra,
  className = "",
}: SampleExemplarBarProps<G>) {
  const t = useSafeSampleT();
  const { lib, failed, retry } = useSampleLibrary();
  const baseId = useId();
  const [localId, setLocalId] = useState<string | null>(null);
  const [open, setOpen] = useState(defaultOpen);
  const [variant, setVariant] = useState<SampleVariant>("en");
  const { state: copyState, copy, reset } = useCopy();

  const samples = useMemo(() => {
    if (!lib) return [] as SampleOf<G>[];
    const all = lib.samplesFor(group) as SampleOf<G>[];
    const offered = filter ? all.filter(filter) : [...all];
    return sort ? offered.sort(sort) : offered;
  }, [lib, group, filter, sort]);

  const currentId = selectedId ?? localId;
  const sample = samples.find((candidate) => candidate.id === currentId) ?? samples[0] ?? null;
  // Generic narrowing does not reach through SampleOf<G>; widen once for checks.
  const known = sample as SampleExemplar | null;
  const text = known ? sampleTextFor(known, variant) : "";
  const hasUzbek = known?.group === "document" && Boolean(known.textUz);
  const heading = title ?? t(`groups.${group}` as never);
  const panelId = `${baseId}-annotated`;
  const selectId = `${baseId}-track`;

  const choose = (id: string) => {
    setLocalId(id);
    setVariant("en");
    reset();
    onSelect?.(id);
  };

  return (
    <section
      aria-label={heading}
      className={`min-w-0 rounded-2xl border border-indigo-100 bg-indigo-50/40 p-3 dark:border-indigo-500/20 dark:bg-indigo-950/20 sm:p-4 ${className}`}
    >
      <div className="flex flex-wrap items-center gap-2">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-white px-2.5 py-1 text-[11px] font-bold text-indigo-700 ring-1 ring-indigo-200 dark:text-indigo-200 dark:ring-indigo-500/30">
          <Sparkles aria-hidden className="h-3.5 w-3.5" />
          {t("eyebrow")}
        </span>
        <h3 className="min-w-0 break-words text-sm font-bold text-slate-900">{heading}</h3>
      </div>

      {failed ? (
        <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-slate-600" role="alert">
          <span>{t("loadError")}</span>
          <button type="button" onClick={retry} className={secondaryButton}>
            <RotateCcw aria-hidden className="h-3.5 w-3.5" />
            {t("retry")}
          </button>
        </div>
      ) : !lib || !sample ? (
        <p className="mt-3 flex items-center gap-2 text-xs text-slate-500" role="status">
          <Loader2 aria-hidden className="h-3.5 w-3.5 animate-spin" />
          {t("loading")}
        </p>
      ) : (
        <>
          {/* Stacked at every width: track names are long, and the bar lives in
              containers from a narrow modal to a full-width studio. */}
          <div className="mt-3 space-y-2">
            <div className="min-w-0">
              <label htmlFor={selectId} className="block text-[11px] font-semibold text-slate-600">
                {t("trackLabel")}
              </label>
              <select
                id={selectId}
                value={sample.id}
                onChange={(event) => choose(event.target.value)}
                className="sb-field mt-1 min-h-11 w-full rounded-lg border px-3 py-2 text-sm text-slate-900 focus:outline-none"
              >
                {samples.map((candidate, index) => (
                  <option key={candidate.id} value={candidate.id}>
                    {t("trackOption", { n: index + 1, label: t(`tracks.${candidate.id}` as never) })}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                aria-expanded={open}
                aria-controls={panelId}
                onClick={() => setOpen((value) => !value)}
                className={secondaryButton}
              >
                {open ? <EyeOff aria-hidden className="h-3.5 w-3.5" /> : <Eye aria-hidden className="h-3.5 w-3.5" />}
                {open ? t("hide") : t("view")}
              </button>
              {onLoad && (
                <button
                  type="button"
                  disabled={loadDisabled}
                  onClick={() => {
                    onLoad(sample);
                    if (openOnLoad) setOpen(true);
                  }}
                  className={primaryButton}
                >
                  <Zap aria-hidden className="h-3.5 w-3.5" />
                  {loadLabel ?? t("load")}
                </button>
              )}
              <button type="button" onClick={() => void copy(text)} className={secondaryButton}>
                {copyState === "ok" ? (
                  <Check aria-hidden className="h-3.5 w-3.5 text-emerald-600" />
                ) : (
                  <Copy aria-hidden className="h-3.5 w-3.5" />
                )}
                {copyState === "ok" ? t("copied") : t("copy")}
              </button>
            </div>
          </div>

          {hasUzbek && (
            <div className="mt-2 flex flex-wrap items-center gap-1.5" role="group" aria-label={t("versionLabel")}>
              <span className="text-[11px] font-semibold text-slate-600">{t("versionLabel")}:</span>
              {(["en", "uz"] as const).map((option) => (
                <button
                  key={option}
                  type="button"
                  aria-pressed={variant === option}
                  onClick={() => {
                    setVariant(option);
                    reset();
                  }}
                  className={`inline-flex min-h-11 items-center rounded-lg px-3 py-2 text-xs font-bold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 ${
                    variant === option
                      ? "bg-indigo-600 text-white shadow-sm shadow-indigo-600/20"
                      : "border border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                  }`}
                >
                  {option === "en" ? t("versionEnglish") : t("versionUzbek")}
                </button>
              ))}
            </div>
          )}

          <p className="mt-2 flex items-start gap-1.5 text-[11px] leading-relaxed text-slate-600">
            <ShieldCheck aria-hidden className="mt-0.5 h-3.5 w-3.5 shrink-0 text-indigo-600" />
            <span>{t("honesty")}</span>
          </p>
          <p role="status" aria-live="polite" className="sr-only">
            {copyState === "ok" ? t("copied") : copyState === "fail" ? t("copyFailed") : ""}
          </p>
          {copyState === "fail" && <p className="mt-1 text-[11px] font-semibold text-rose-700">{t("copyFailed")}</p>}

          <div id={panelId} hidden={!open} className="mt-3">
            {open && (
              <>
                <AnnotatedSample text={text} roles={sample.roles} />
                <SampleMeta text={text} wordLimit={known?.group === "essay" ? known.wordLimit : null} />
              </>
            )}
          </div>
          {renderExtra?.(sample)}
        </>
      )}
    </section>
  );
}

/**
 * One known sample, annotated, with Copy and an optional Load — for surfaces
 * that pick the sample themselves (e.g. the Answer Vault's matching category).
 */
export function SampleInlineCard({
  sample,
  title,
  onLoad,
  loadLabel,
}: {
  sample: SampleExemplar;
  title: string;
  onLoad?: () => void;
  loadLabel?: string;
}) {
  const t = useSafeSampleT();
  const { state: copyState, copy } = useCopy();
  return (
    <section
      aria-label={title}
      className="min-w-0 rounded-2xl border border-indigo-100 bg-indigo-50/40 p-3 dark:border-indigo-500/20 dark:bg-indigo-950/20"
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h4 className="min-w-0 break-words text-xs font-bold text-slate-900">{title}</h4>
        <div className="flex flex-wrap gap-2">
          {onLoad && (
            <button type="button" onClick={onLoad} className={primaryButton}>
              <Zap aria-hidden className="h-3.5 w-3.5" />
              {loadLabel ?? t("load")}
            </button>
          )}
          <button type="button" onClick={() => void copy(sample.text)} className={secondaryButton}>
            {copyState === "ok" ? (
              <Check aria-hidden className="h-3.5 w-3.5 text-emerald-600" />
            ) : (
              <Copy aria-hidden className="h-3.5 w-3.5" />
            )}
            {copyState === "ok" ? t("copied") : t("copy")}
          </button>
        </div>
      </div>
      <p role="status" aria-live="polite" className="sr-only">
        {copyState === "ok" ? t("copied") : copyState === "fail" ? t("copyFailed") : ""}
      </p>
      <div className="mt-2">
        <AnnotatedSample text={sample.text} roles={sample.roles} />
        <SampleMeta text={sample.text} />
      </div>
      <p className="mt-2 flex items-start gap-1.5 text-[11px] leading-relaxed text-slate-600">
        <ShieldCheck aria-hidden className="mt-0.5 h-3.5 w-3.5 shrink-0 text-indigo-600" />
        <span>{t("honesty")}</span>
      </p>
    </section>
  );
}
