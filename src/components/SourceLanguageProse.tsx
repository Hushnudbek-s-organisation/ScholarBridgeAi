import { Languages } from "lucide-react";

/**
 * Renders database prose on a uzbek/russian page.
 *
 * The catalogue stores 547 awards' descriptions, requirements and coverage
 * text in English — ~3000 strings, 446 of them distinct. A deterministic
 * dictionary cannot translate that and machine translation is not used here,
 * so the product rule is: the text stays where it is, with an explicit
 * "source language: English" label above it. A student never mistakes English
 * for a broken translation, and no information is silently dropped.
 *
 * A string that WAS translated deterministically (test scores, the common
 * coverage phrasings) passes `showLabel={false}` and renders as ordinary
 * localized copy. The `lang` attribute marks the source-language case for
 * screen readers.
 */
interface SourceLanguageProseProps {
  text: string;
  showLabel: boolean;
  label: string;
  className?: string;
  textClassName?: string;
}

const DEFAULT_TEXT_CLASS =
  "whitespace-pre-line break-words text-sm leading-relaxed text-slate-700";

export function SourceLanguageProse({
  text,
  showLabel,
  label,
  className,
  textClassName = DEFAULT_TEXT_CLASS,
}: SourceLanguageProseProps) {
  if (!text || !text.trim()) return null;
  return (
    <div className={className}>
      {showLabel && (
        <p className="mb-1.5 inline-flex items-center gap-1 rounded-md bg-slate-100 px-1.5 py-0.5 text-[11px] font-semibold text-slate-600 ring-1 ring-slate-200 ring-inset">
          <Languages className="h-3 w-3 shrink-0" aria-hidden />
          <span>{label}</span>
        </p>
      )}
      <p className={textClassName} lang={showLabel ? "en" : undefined}>
        {text}
      </p>
    </div>
  );
}
