"use client";

/**
 * Smart auto-fill from CV text, for the onboarding wizard and the profile
 * editor. Paste → preview (src/lib/profileExtract.ts, deterministic) → apply
 * to the UNSAVED form → the student saves as usual.
 *
 * A sample CV can be loaded to see how extraction works, but its values can
 * never be applied: while the box still holds an unchanged sample, "Apply" is
 * disabled with an explanation, so a demo persona's scores cannot slip into a
 * real profile.
 */
import React, { useId, useState } from "react";
import { useTranslations } from "next-intl";
import { CheckCircle2, ScanSearch, ShieldAlert, Zap } from "lucide-react";
import type { OnboardingCvSample } from "@/lib/samples/exemplars";
import {
  extractProfileFields,
  toProfileFields,
  type ExtractedField,
  type ExtractedKey,
  type ExtractedProfileFields,
} from "@/lib/profileExtract";
import { isUnmodifiedSample } from "@/lib/samples/text";
import { SampleExemplarBar, sampleButtonClass } from "./SampleExemplarBar";

export function SmartAutofillBox({
  supported,
  onApply,
  className = "",
}: {
  /** Fields the host form can receive; others are shown but not applied. */
  supported: ExtractedKey[];
  /** Fills the host's unsaved form; may return how many values it really applied. */
  onApply: (fields: ExtractedProfileFields) => number | void;
  className?: string;
}) {
  const t = useTranslations("samples");
  const id = useId();
  const [text, setText] = useState("");
  const [sample, setSample] = useState<OnboardingCvSample | null>(null);
  const [detected, setDetected] = useState<ExtractedField[] | null>(null);
  const [applied, setApplied] = useState<number | null>(null);

  const preview = (value: string) => {
    setDetected(extractProfileFields(value));
    setApplied(null);
  };

  const holdsSample = sample != null && isUnmodifiedSample(text, sample.text);
  const applicable = (detected ?? []).filter((field) => supported.includes(field.key));

  const apply = () => {
    if (holdsSample || applicable.length === 0) return;
    const count = onApply(toProfileFields(applicable));
    setApplied(typeof count === "number" ? count : applicable.length);
  };

  return (
    <details className={`group min-w-0 rounded-2xl border border-slate-200 bg-white p-3 shadow-xs ${className}`}>
      <summary className="flex min-h-11 cursor-pointer list-none items-center gap-2 rounded-lg px-1 text-sm font-bold text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500">
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600 ring-1 ring-indigo-100 dark:ring-indigo-500/25">
          <Zap aria-hidden className="h-4 w-4" />
        </span>
        <span className="min-w-0 break-words">{t("autofillTitle")}</span>
      </summary>

      <div className="mt-3 space-y-3">
        <p className="text-xs leading-relaxed text-slate-600">{t("autofillHelp")}</p>

        <SampleExemplarBar
          group="onboardingCv"
          onLoad={(loaded) => {
            setSample(loaded);
            setText(loaded.text);
            preview(loaded.text);
          }}
        />

        <div>
          <label htmlFor={`${id}-cv`} className="block text-[11px] font-semibold text-slate-600">
            {t("autofillInputLabel")}
          </label>
          <textarea
            id={`${id}-cv`}
            value={text}
            onChange={(event) => {
              setText(event.target.value);
              setApplied(null);
            }}
            rows={6}
            maxLength={20000}
            placeholder={t("autofillPlaceholder")}
            className="sb-field mt-1 w-full resize-y rounded-xl border px-3 py-2 text-xs leading-relaxed text-slate-900 focus:outline-none"
          />
        </div>

        <button type="button" onClick={() => preview(text)} disabled={!text.trim()} className={sampleButtonClass.secondary}>
          <ScanSearch aria-hidden className="h-3.5 w-3.5" />
          {t("autofillPreview")}
        </button>

        {detected &&
          (detected.length === 0 ? (
            <p className="text-xs text-slate-500" role="status">
              {t("autofillNone")}
            </p>
          ) : (
            <div>
              <p className="text-[11px] font-bold uppercase tracking-wide text-slate-500">{t("autofillDetected")}</p>
              <ul className="mt-1.5 grid gap-1.5 sm:grid-cols-2">
                {detected.map((field) => {
                  const fits = supported.includes(field.key);
                  return (
                    <li
                      key={field.key}
                      className={`min-w-0 rounded-lg border px-2.5 py-1.5 text-xs ${
                        fits ? "border-slate-200 bg-slate-50" : "border-dashed border-slate-200 bg-white"
                      }`}
                    >
                      <span className={`font-bold ${fits ? "text-slate-800" : "text-slate-500"}`}>
                        {t(`fields.${field.key}` as never)}: {String(field.value)}
                      </span>
                      {!fits && <span className="ml-1 text-[11px] text-slate-500">({t("autofillNotInForm")})</span>}
                      <span className="mt-0.5 block break-words text-[11px] text-slate-500">“{field.excerpt}”</span>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}

        {holdsSample && (
          <p className="flex items-start gap-1.5 rounded-lg border border-violet-200 bg-violet-50 px-3 py-2 text-xs leading-relaxed text-violet-900 dark:border-violet-500/30 dark:text-violet-100">
            <ShieldAlert aria-hidden className="mt-0.5 h-3.5 w-3.5 shrink-0" />
            <span>{t("autofillSampleBlocked")}</span>
          </p>
        )}

        <button
          type="button"
          onClick={apply}
          disabled={holdsSample || applicable.length === 0}
          className={sampleButtonClass.primary}
        >
          <CheckCircle2 aria-hidden className="h-3.5 w-3.5" />
          {t("autofillApply")}
        </button>
        {applied != null && (
          <p role="status" className="text-xs font-semibold text-emerald-700 dark:text-emerald-300">
            {t("autofillApplied", { n: applied })}
          </p>
        )}
      </div>
    </details>
  );
}
