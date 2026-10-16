"use client";

/**
 * Priority 4.3 — the essay editor with an inline highlight layer.
 *
 * Red = AI clichés and banned openings ("delve", "tapestry", "testament",
 * "ever since I was a child", "passionate about"). Amber = weak, unquantified
 * construction. Emerald = strong active verbs and quantified evidence.
 *
 * HOW THE OVERLAY WORKS (and why it cannot drift out of sync visually):
 * the textarea keeps its own glyphs and its own colour, so nothing here has to
 * reproduce the browser's text rendering. Behind it sits a `pointer-events-none`
 * mirror with identical typography that paints ONLY the coloured washes, using
 * transparent glyphs purely to lay out the rectangles. The mirror scrolls with
 * the textarea, so a highlight stays under its sentence at any scroll position.
 *
 * All classification is deterministic and local (`src/lib/essayInsights.ts`) —
 * no AI call, no network, no cost. It runs on every keystroke in a memo.
 */
import React from "react";
import { useTranslations } from "next-intl";
import { Highlighter } from "lucide-react";
import { annotateEssay, type EssayAnnotation, type SentenceTone } from "@/lib/essayInsights";

/** Wash behind the real glyphs. The glyphs themselves stay transparent here. */
const TONE_WASH: Record<SentenceTone, string> = {
  cliche: "bg-rose-300/60 dark:bg-rose-500/40",
  weak: "bg-amber-300/55 dark:bg-amber-500/35",
  strong: "bg-emerald-300/55 dark:bg-emerald-500/35",
  neutral: "",
};

/** Legend swatch — solid enough to read as a key next to its label. */
const TONE_SWATCH: Record<SentenceTone, string> = {
  cliche: "bg-rose-400",
  weak: "bg-amber-400",
  strong: "bg-emerald-400",
  neutral: "bg-slate-300",
};

interface EssayHighlightFieldProps {
  value: string;
  onChange: (next: string) => void;
  ariaLabel: string;
  placeholder: string;
  /** Extra classes on the textarea (height, ring, …). */
  className?: string;
  /** Start with the layer on — useful when the student arrives from a score. */
  defaultHighlighted?: boolean;
}

export function EssayHighlightField({
  value,
  onChange,
  ariaLabel,
  placeholder,
  className = "min-h-[280px]",
  defaultHighlighted = false,
}: EssayHighlightFieldProps) {
  const t = useTranslations("ai");
  const [highlighted, setHighlighted] = React.useState(defaultHighlighted);
  const mirrorRef = React.useRef<HTMLDivElement | null>(null);
  const fieldRef = React.useRef<HTMLTextAreaElement | null>(null);

  // Annotate only while the layer is on: the work is cheap, but there is no
  // reason to scan a draft nobody is looking at.
  const annotation: EssayAnnotation | null = React.useMemo(
    () => (highlighted && value.trim() ? annotateEssay(value) : null),
    [highlighted, value]
  );

  const syncScroll = React.useCallback(() => {
    const mirror = mirrorRef.current;
    const field = fieldRef.current;
    if (!mirror || !field) return;
    mirror.scrollTop = field.scrollTop;
    mirror.scrollLeft = field.scrollLeft;
  }, []);

  // Editing while scrolled down can leave the mirror past its new end; re-sync
  // after every change so a wash never lags behind its sentence.
  React.useEffect(() => {
    if (highlighted) syncScroll();
  }, [value, highlighted, syncScroll]);

  const tones: SentenceTone[] = ["cliche", "weak", "strong"];

  return (
    <div className="mt-3">
      <div className="mb-2 flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => setHighlighted((prev) => !prev)}
          aria-pressed={highlighted}
          disabled={!value.trim()}
          className={`flex min-h-11 items-center gap-1.5 rounded-xl border px-3 py-2 text-xs font-bold transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${
            highlighted
              ? "border-violet-300 bg-violet-50 text-violet-800 dark:border-violet-500/40 dark:bg-violet-500/15 dark:text-violet-100"
              : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
          }`}
        >
          <Highlighter className="h-3.5 w-3.5" aria-hidden />
          {highlighted ? t("essayHighlightOn") : t("essayHighlightOff")}
        </button>

        {annotation && (
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] font-semibold text-slate-600">
            {tones.map((tone) => (
              <span key={tone} className="inline-flex items-center gap-1">
                <span className={`h-2.5 w-2.5 rounded-sm ${TONE_SWATCH[tone]}`} aria-hidden />
                {t(`essayHighlightLegend.${tone}`, { count: annotation.counts[tone] })}
              </span>
            ))}
            {annotation.strongPct != null && (
              <span className="text-slate-500">{t("essayHighlightStrongPct", { pct: annotation.strongPct })}</span>
            )}
          </div>
        )}
      </div>

      <div className="relative">
        {/* The wash layer. `sb-field` gives it the same background and border as
            any other field in the app, in light and dark mode alike. */}
        <div
          ref={mirrorRef}
          aria-hidden="true"
          className="sb-field pointer-events-none absolute inset-0 overflow-hidden rounded-xl border p-3 text-sm leading-relaxed"
        >
          {annotation ? (
            <p className="m-0 break-words whitespace-pre-wrap">
              {annotation.sentences.map((sentence) => (
                <span
                  key={sentence.index}
                  className={`${TONE_WASH[sentence.tone]} text-transparent`}
                  // Every flagged sentence carries the reason on the mirror, so
                  // a screen reader reading the textarea still gets the plain
                  // text and the legend above explains the colours.
                  title={
                    sentence.tone === "neutral"
                      ? undefined
                      : t(`essayHighlightWhy.${sentence.tone}`, {
                          detail:
                            sentence.cliches[0] ??
                            sentence.weak[0] ??
                            sentence.metrics[0] ??
                            sentence.verbs[0] ??
                            "",
                        })
                  }
                >
                  {sentence.text}
                </span>
              ))}
            </p>
          ) : null}
        </div>

        <textarea
          ref={fieldRef}
          aria-label={ariaLabel}
          onScroll={syncScroll}
          className={`relative w-full rounded-xl border border-transparent bg-transparent p-3 text-sm leading-relaxed text-slate-800 focus:border-indigo-400 focus:outline-none ${className}`}
          placeholder={placeholder}
          value={value}
          onChange={(event) => onChange(event.target.value)}
        />
      </div>
    </div>
  );
}

export default EssayHighlightField;
