"use client";

/**
 * Embassy model answers: four five-question transcripts (USA F-1, Germany,
 * South Korea D-2, UK Student Route), selectable by country and scored on
 * demand by `scoreVisaInterview()` — the same deterministic rubric that grades
 * a live practice session. The score is computed in the browser from the
 * transcript; nothing is stored and no number is hard-coded.
 */
import React, { useState } from "react";
import { useTranslations } from "next-intl";
import { CheckCircle2, Globe, Loader2, TriangleAlert } from "lucide-react";
import type { VisaSample } from "@/lib/samples/exemplars";
import type { VisaRubric } from "@/lib/visaScoring";
import { VISA_RUBRIC_CEILING, VISA_SAMPLE_ID_BY_COUNTRY, visaSampleCountryFor } from "@/lib/samples/visa";
import { SampleExemplarBar } from "./SampleExemplarBar";

const GROUNDS = ["purposeOfStudy", "funding", "homeTies", "nonImmigrantIntent", "specificity", "languageClarity"] as const;

function RubricPanel({ rubric }: { rubric: VisaRubric }) {
  const t = useTranslations("samples");
  const risks = rubric.risks.length;
  return (
    <div className="mt-3 rounded-xl border border-slate-200 bg-white p-3">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-wide text-slate-500">{t("visaScoreTitle")}</p>
          <p className="text-2xl font-extrabold text-slate-900">
            {rubric.scores.total}
            <span className="text-sm font-bold text-slate-400">/100</span>
          </p>
        </div>
        {risks === 0 ? (
          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-1 text-[11px] font-bold text-emerald-800 dark:text-emerald-200">
            <CheckCircle2 aria-hidden className="h-3.5 w-3.5" />
            {t("visaNoRisks")}
          </span>
        ) : (
          <span className="inline-flex items-center gap-1 rounded-full bg-rose-100 px-2.5 py-1 text-[11px] font-bold text-rose-800 dark:text-rose-200">
            <TriangleAlert aria-hidden className="h-3.5 w-3.5" />
            {t("visaRisks", { n: risks })}
          </span>
        )}
      </div>
      <div className="mt-3 grid gap-2 sm:grid-cols-2">
        {GROUNDS.map((key) => (
          <div key={key}>
            <div className="flex justify-between gap-2 text-[11px] font-semibold text-slate-600">
              <span className="min-w-0 break-words">{t(`visaGrounds.${key}` as never)}</span>
              <span>{rubric.scores[key]}</span>
            </div>
            <div
              className="mt-0.5 h-1.5 w-full overflow-hidden rounded-full bg-slate-100"
              role="progressbar"
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={rubric.scores[key]}
              aria-label={t(`visaGrounds.${key}` as never)}
            >
              <div className="h-full rounded-full bg-indigo-500" style={{ width: `${rubric.scores[key]}%` }} />
            </div>
          </div>
        ))}
      </div>
      <p className="mt-2 text-[11px] leading-relaxed text-slate-500">{t("visaCeiling", { ceiling: VISA_RUBRIC_CEILING })}</p>
      <div className="mt-3">
        <p className="text-[11px] font-bold uppercase tracking-wide text-slate-500">{t("visaTurnEvidence")}</p>
        <ol className="mt-1.5 space-y-1">
          {rubric.turnFeedback.map((turn) => (
            <li key={turn.turnNumber} className="flex flex-wrap items-center gap-1.5 text-[11px] text-slate-600">
              <span className="font-bold text-slate-800">{t("answerN", { n: turn.turnNumber })}:</span>
              {turn.evidence.map((item) => (
                <span key={item} className="rounded-full bg-slate-100 px-2 py-0.5 font-semibold text-slate-700">
                  {t(`visaEvidence.${item}` as never)}
                </span>
              ))}
            </li>
          ))}
        </ol>
      </div>
    </div>
  );
}

/**
 * @param countryHint a VISA_COUNTRIES code ("US") or a typed country name
 *   ("Germaniya"); a match pre-selects that country's track.
 * @param onlyHinted render nothing unless the hint matches a sample country
 *   (used after a practice session, where only that country is relevant).
 */
export function VisaModelAnswers({
  countryHint,
  title,
  onlyHinted = false,
  className = "",
}: {
  countryHint?: string | null;
  title?: string;
  onlyHinted?: boolean;
  className?: string;
}) {
  const t = useTranslations("samples");
  const hinted = visaSampleCountryFor(countryHint);
  const hintedId = hinted ? VISA_SAMPLE_ID_BY_COUNTRY[hinted] : null;
  // A manual pick wins until the hint changes to another country.
  const [manual, setManual] = useState<{ id: string; forHint: string | null } | null>(null);
  const selectedId = manual && manual.forHint === hintedId ? manual.id : hintedId;
  const [scored, setScored] = useState<{ id: string; rubric: VisaRubric } | null>(null);
  const [scoring, setScoring] = useState(false);

  if (onlyHinted && !hintedId) return null;

  const score = async (sample: VisaSample) => {
    setScoring(true);
    try {
      const { scoreVisaInterview } = await import("@/lib/visaScoring");
      setScored({
        id: sample.id,
        rubric: scoreVisaInterview(sample.turns, { homeCountry: "Uzbekistan", destination: sample.destination }),
      });
    } finally {
      setScoring(false);
    }
  };

  return (
    <SampleExemplarBar
      group="visa"
      className={className}
      title={title ?? t("visaTitle")}
      filter={onlyHinted && hintedId ? (sample) => sample.id === hintedId : undefined}
      selectedId={selectedId}
      onSelect={(id) => setManual({ id, forHint: hintedId })}
      loadLabel={scoring ? t("visaScoring") : t("visaLoad")}
      loadDisabled={scoring}
      openOnLoad
      onLoad={(sample) => void score(sample)}
      renderExtra={(sample) => (
        <>
          <p className="mt-2 flex items-start gap-1.5 text-[11px] leading-relaxed text-slate-600">
            <Globe aria-hidden className="mt-0.5 h-3.5 w-3.5 shrink-0 text-indigo-600" />
            <span>
              {t("visaHint")} {t("visaLanguageNote")}
            </span>
          </p>
          {scoring && (
            <p className="mt-2 flex items-center gap-2 text-xs text-slate-500" role="status">
              <Loader2 aria-hidden className="h-3.5 w-3.5 animate-spin" />
              {t("visaScoring")}
            </p>
          )}
          {scored?.id === sample.id && <RubricPanel rubric={scored.rubric} />}
        </>
      )}
    />
  );
}
