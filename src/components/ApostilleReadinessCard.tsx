"use client";

/**
 * Priority 5.4 — e-Apostille & Bank-Statement Readiness Calculator.
 *
 * Two documents ruin more visa applications than anything else, and both fail on
 * a date rather than on content:
 *
 *   • the diploma and transcript need an Uzbek e-Apostille (my.gov.uz) plus a
 *     certified translation, which together take about two weeks — ordered after
 *     the university asks for them, they arrive late;
 *   • the bank statement has to show the required balance held for the required
 *     number of consecutive days and be dated inside the validity window. For the
 *     UK that is 28 consecutive days with a closing balance no more than 31 days
 *     before the online application; for Germany it is the blocked account
 *     (Sperrkonto, €11,904 a year); for Korea the KVAC balance certificate.
 *
 * This card turns a planned application date into the exact dates the money and
 * the paperwork have to be ready, and shows which document belongs in which pile
 * for that destination.
 *
 * Every figure comes from `src/lib/apostilleChecker.ts` with its official source
 * URL attached. Nothing here is estimated by a model, and where a country
 * publishes no figure the card says so instead of guessing (spec §14).
 */
import React from "react";
import { useLocale, useTranslations } from "next-intl";
import { localizeCountry } from "@/lib/catalogLocalizer";
import { countriesMatch, resolveCountryFlagEmoji } from "@/lib/countries";
import {
  AlertTriangle,
  Building2,
  CalendarClock,
  Check,
  ExternalLink,
  FileCheck2,
  Landmark,
  Stamp,
} from "lucide-react";
import { AppNote } from "@/components/AppNote";
import { formatMoney } from "@/lib/format";
import {
  APOSTILLE_MATRIX,
  E_APOSTILLE_PORTAL,
  checkApostilleReadiness,
  type ApostilleNeed,
  type DocumentId,
  type TranslationNeed,
} from "@/lib/apostilleChecker";

const NEED_TONE: Record<ApostilleNeed, string> = {
  required: "border-rose-200 bg-rose-50 text-rose-800 dark:border-rose-500/30 dark:bg-rose-500/10 dark:text-rose-100",
  accepted: "border-sky-200 bg-sky-50 text-sky-800 dark:border-sky-500/30 dark:bg-sky-500/10 dark:text-sky-100",
  verify: "border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-100",
  not_applicable: "border-slate-200 bg-slate-50 text-slate-600 dark:border-slate-700 dark:bg-slate-800/60 dark:text-slate-300",
};

const TRANSLATION_TONE: Record<TranslationNeed, string> = {
  sworn: "border-violet-200 bg-violet-50 text-violet-800 dark:border-violet-500/30 dark:bg-violet-500/10 dark:text-violet-100",
  certified: "border-indigo-200 bg-indigo-50 text-indigo-800 dark:border-indigo-500/30 dark:bg-indigo-500/10 dark:text-indigo-100",
  verify: "border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-100",
  not_required: "border-slate-200 bg-slate-50 text-slate-600 dark:border-slate-700 dark:bg-slate-800/60 dark:text-slate-300",
};

export interface ApostilleReadinessCardProps {
  profileId?: number | null;
  /** Destination to open with; the student can still change it. */
  defaultCountry?: string | null;
  /** Planned visa application date (`YYYY-MM-DD`) when the host already knows it. */
  defaultApplicationDate?: string | null;
  className?: string;
}

export function ApostilleReadinessCard({
  profileId,
  defaultCountry,
  defaultApplicationDate,
  className = "",
}: ApostilleReadinessCardProps) {
  const t = useTranslations("apostille");
  const locale = useLocale() as "en" | "uz" | "ru";
  /** Destination labels read in the student's language; `en` is verbatim. */
  const countryLabel = (value: string) => localizeCountry(value, locale);

  const destinations = React.useMemo(() => APOSTILLE_MATRIX.map((entry) => entry.country), []);
  const [country, setCountry] = React.useState<string>(defaultCountry?.trim() || destinations[0] || "");
  const [applicationDate, setApplicationDate] = React.useState<string>(defaultApplicationDate ?? "");
  const [ukArea, setUkArea] = React.useState<"london" | "outsideLondon">("outsideLondon");
  const [preferred, setPreferred] = React.useState<string[]>([]);

  // Offer the student's own destinations first — a picker that opens on a country
  // they are not applying to is a picker they have to correct.
  React.useEffect(() => {
    if (!profileId) return;
    let live = true;
    const controller = new AbortController();
    (async () => {
      try {
        const res = await fetch(`/api/profiles/${profileId}`, { signal: controller.signal });
        const data = await res.json().catch(() => null);
        if (!res.ok || !live) return;
        const raw = data?.profile?.preferredCountries ?? data?.preferredCountries ?? null;
        // Stored forms vary: a JSON array, a comma-separated string, or a real
        // array. Parse all three without ever trusting JSON.parse to succeed,
        // and keep only names this matrix actually knows — a picker option that
        // does not exist would render an empty selection.
        const asList = (() => {
          if (Array.isArray(raw)) return raw.map((item) => String(item));
          if (typeof raw === "string") {
            const text = raw.trim();
            if (text.startsWith("[")) {
              try {
                const parsedJson: unknown = JSON.parse(text);
                if (Array.isArray(parsedJson)) return parsedJson.map((item) => String(item));
              } catch {
                /* fall through to the comma split — old rows stored plain text */
              }
            }
            return text.split(",").map((part) => part.trim());
          }
          return [];
        })()
          .map((name) => name.trim())
          .filter(Boolean)
          .filter((name) => destinations.some((destination) => countriesMatch(name, destination)));
        if (asList.length > 0) setPreferred(asList);
        if (!defaultCountry && asList[0]) setCountry(asList[0]);
      } catch {
        /* the picker still works with the built-in destination list */
      }
    })();
    return () => {
      live = false;
      controller.abort();
    };
  }, [profileId, defaultCountry, destinations]);

  const readiness = React.useMemo(
    () => checkApostilleReadiness(country, applicationDate || null, { ukArea }),
    [country, applicationDate, ukArea]
  );

  const formatDate = (value: string | null): string => {
    if (!value) return t("noDate");
    const date = new Date(`${value}T00:00:00Z`);
    return Number.isNaN(date.getTime())
      ? value
      : date.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric", timeZone: "UTC" });
  };

  const isUk = countriesMatch((country ?? "").trim(), "United Kingdom");
  const funds = readiness.funds;
  const requirement = funds.requirement;

  return (
    <section className={`rounded-2xl border border-slate-200 bg-white p-4 sm:p-5 dark:border-slate-700 ${className}`} aria-labelledby="apostille-title">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 id="apostille-title" className="flex items-center gap-2 text-sm font-extrabold text-slate-900">
            <Stamp className="h-4 w-4 text-violet-600" aria-hidden />
            {t("title")}
          </h3>
          <p className="mt-1 max-w-2xl break-words text-[11px] leading-relaxed text-slate-500">{t("subtitle")}</p>
        </div>
        <a
          href={E_APOSTILLE_PORTAL.url}
          target="_blank"
          rel="noopener noreferrer"
          className="flex min-h-11 shrink-0 items-center gap-1.5 rounded-xl border border-violet-200 bg-violet-50 px-3 py-2 text-[11px] font-bold text-violet-800 hover:bg-violet-100 dark:border-violet-500/30 dark:bg-violet-500/10 dark:text-violet-100"
        >
          <Landmark className="h-3.5 w-3.5" aria-hidden />
          {t("portalButton")}
          <ExternalLink className="h-3 w-3" aria-hidden />
        </a>
      </div>

      {/* ---- destination + planned date ---- */}
      <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-3">
        <label className="block text-[11px] font-semibold text-slate-600">
          {t("countryLabel")}
          <select
            value={country}
            onChange={(event) => setCountry(event.target.value)}
            className="sb-field sb-flag-emoji mt-1 min-h-11 w-full rounded-xl border px-3 py-2 text-xs text-slate-800"
          >
            {destinations.map((destination) => (
              <option key={destination} value={destination}>
                {resolveCountryFlagEmoji(destination)} {countryLabel(destination)}
                {preferred.includes(destination) ? ` · ${t("yourDestination")}` : ""}
              </option>
            ))}
          </select>
        </label>

        <label className="block text-[11px] font-semibold text-slate-600">
          {t("dateLabel")}
          <input
            type="date"
            value={applicationDate}
            onChange={(event) => setApplicationDate(event.target.value)}
            className="sb-field mt-1 min-h-11 w-full rounded-xl border px-3 py-2 text-xs text-slate-800"
          />
        </label>

        {isUk && (
          <fieldset className="rounded-xl border border-slate-200 p-2">
            <legend className="px-1 text-[11px] font-bold text-slate-600">{t("ukAreaLegend")}</legend>
            <div className="flex flex-wrap gap-1.5">
              {(["outsideLondon", "london"] as const).map((area) => (
                <button
                  key={area}
                  type="button"
                  onClick={() => setUkArea(area)}
                  aria-pressed={ukArea === area}
                  className={`min-h-11 rounded-full border px-2.5 py-1 text-[11px] font-bold transition-colors ${
                    ukArea === area
                      ? "border-sky-500 bg-sky-600 text-white"
                      : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                  }`}
                >
                  {t(`ukAreas.${area}`)}
                </button>
              ))}
            </div>
          </fieldset>
        )}
      </div>

      {/* ---- the published funds rule ---- */}
      <div className="mt-3 rounded-xl border border-slate-200 bg-slate-50 p-3">
        <p className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wide text-slate-500">
          <Building2 className="h-3.5 w-3.5" aria-hidden />
          {t("fundsTitle")}
        </p>

        {requirement ? (
          <>
            <p className="mt-1.5 break-words text-xs font-extrabold text-slate-900">
              {requirement.amount != null
                ? `${formatMoney(requirement.amount, requirement.currency)}${requirement.amountUsd != null ? ` · ${formatMoney(requirement.amountUsd, "USD")}` : ""}`
                : t("fundsNoPublishedAmount")}
            </p>
            <p className="mt-1 break-words text-[11px] leading-relaxed text-slate-600">
              {t(`fundsRules.${requirement.ruleId}.summary`, { country: countryLabel(requirement.country) })}
            </p>
            {/* How the published figure is built, in the source's own numbers. */}
            {requirement.basis && (
              <p className="mt-1 break-words text-[11px] font-semibold text-slate-700">
                {t("basisLabel")}: {requirement.basis}
              </p>
            )}
            {requirement.consecutiveDays != null && (
              <p className="mt-1 break-words text-[11px] font-semibold text-slate-700">
                {t("consecutiveDays", { days: requirement.consecutiveDays })}
                {requirement.statementValidityDays != null
                  ? ` · ${t("statementValidity", { days: requirement.statementValidityDays })}`
                  : ""}
              </p>
            )}
            {requirement.estimated && (
              <p className="mt-1 flex items-start gap-1.5 break-words text-[11px] font-semibold text-amber-800 dark:text-amber-200">
                <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden />
                {t("estimatedFigure")}
              </p>
            )}
            <ul className="mt-1.5 space-y-0.5">
              {requirement.tuitionSeparate && (
                <li className="flex items-start gap-1.5 break-words text-[11px] leading-relaxed text-slate-600">
                  <Check className="mt-0.5 h-3 w-3 shrink-0 text-emerald-600" aria-hidden />
                  {t("tuitionSeparate")}
                </li>
              )}
              {requirement.scholarshipLetterAccepted && (
                <li className="flex items-start gap-1.5 break-words text-[11px] leading-relaxed text-slate-600">
                  <Check className="mt-0.5 h-3 w-3 shrink-0 text-emerald-600" aria-hidden />
                  {t("scholarshipLetterAccepted")}
                </li>
              )}
            </ul>
            {requirement.note && (
              <p className="mt-1 break-words text-[10px] leading-relaxed text-slate-500">{requirement.note}</p>
            )}
            {requirement.sourceUrl && (
              <a
                href={requirement.sourceUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-1.5 inline-flex min-h-11 items-center gap-1 text-[11px] font-semibold text-indigo-700 hover:underline"
              >
                <FileCheck2 className="h-3 w-3" aria-hidden />
                {requirement.sourceName}
                <ExternalLink className="h-3 w-3" aria-hidden />
              </a>
            )}
          </>
        ) : (
          <p className="mt-1.5 break-words text-[11px] leading-relaxed text-slate-600">{t("fundsNoRule")}</p>
        )}
      </div>

      {/* ---- the computed window ---- */}
      {funds.ok ? (
        <div className="mt-3 rounded-xl border border-emerald-200 bg-emerald-50 p-3 dark:border-emerald-500/30 dark:bg-emerald-500/10">
          <p className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wide text-emerald-800 dark:text-emerald-100">
            <CalendarClock className="h-3.5 w-3.5" aria-hidden />
            {t("windowTitle")}
          </p>
          <dl className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-4">
            {([
              ["fundsInPlaceBy", funds.fundsInPlaceBy],
              ["statementNotBefore", funds.statementNotBefore],
              ["statementNotAfter", funds.statementNotAfter],
              ["earliestWindowStart", funds.earliestWindowStart],
            ] as const).map(([key, value]) => (
              <div key={key} className="rounded-lg border border-emerald-200 bg-white px-2.5 py-1.5 dark:border-emerald-500/30">
                <dt className="text-[10px] font-bold uppercase tracking-wide text-slate-500">{t(`window.${key}`)}</dt>
                <dd className="mt-0.5 break-words text-xs font-extrabold text-slate-900">{formatDate(value)}</dd>
              </div>
            ))}
          </dl>
          <p className="mt-2 break-words text-[11px] leading-relaxed text-emerald-900 dark:text-emerald-100">
            {t("windowExplain", {
              days: funds.consecutiveDays ?? 0,
              validity: funds.statementValidityDays ?? 0,
              date: formatDate(funds.applicationDate),
            })}
          </p>
        </div>
      ) : applicationDate && funds.reason !== "ok" ? (
        <p className="mt-3 break-words rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-[11px] font-semibold leading-relaxed text-amber-800 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-100">
          {t(`windowReasons.${funds.reason}`)}
        </p>
      ) : (
        <p className="mt-3 break-words rounded-xl border border-dashed border-slate-200 px-3 py-2.5 text-[11px] leading-relaxed text-slate-500">
          {t("windowNeedsDate")}
        </p>
      )}

      {/* ---- the dated preparation schedule ---- */}
      {readiness.profile && (
        <div className="mt-3 rounded-xl border border-slate-200 p-3">
          <p className="text-[11px] font-bold uppercase tracking-wide text-slate-500">{t("stepsTitle")}</p>
          <ol className="mt-2 space-y-1.5">
            {readiness.steps.map((step) => {
              const overdue = step.daysOverdue > 0;
              return (
                <li
                  key={step.id}
                  className={`flex items-start gap-2 rounded-lg border px-2.5 py-1.5 ${
                    overdue ? "border-rose-200 bg-rose-50 dark:border-rose-500/30 dark:bg-rose-500/10" : "border-slate-200 bg-white"
                  }`}
                >
                  <span
                    className={`mt-0.5 shrink-0 rounded-md px-1.5 py-0.5 text-[10px] font-extrabold ${
                      overdue ? "bg-rose-600 text-white" : "bg-slate-100 text-slate-700"
                    }`}
                  >
                    {applicationDate ? `D−${step.offsetDays}` : t("noDate")}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block break-words text-[11px] font-bold text-slate-800">{t(`steps.${step.id}.label`)}</span>
                    <span className="block break-words text-[10px] leading-relaxed text-slate-600 whitespace-normal">{t(`steps.${step.id}.why`)}</span>
                  </span>
                  <span className={`shrink-0 text-right text-[10px] font-bold ${overdue ? "text-rose-700 dark:text-rose-200" : "text-slate-600"}`}>
                    {applicationDate ? formatDate(step.dueDate) : "—"}
                    {overdue && <span className="block font-semibold">{t("overdueBy", { days: step.daysOverdue })}</span>}
                  </span>
                </li>
              );
            })}
          </ol>
          {!applicationDate && (
            <p className="mt-2 break-words text-[10px] leading-relaxed text-slate-500">{t("stepsNeedDate")}</p>
          )}
          <p className="mt-2 break-words text-[10px] leading-relaxed text-slate-500">
            {t("leadDays", { days: readiness.profile.leadDays })}
            {t.has(`issuingAuthority.${readiness.profile.issuingAuthorityKey}` as never) && (
              <> · {t(`issuingAuthority.${readiness.profile.issuingAuthorityKey}` as never)}</>
            )}
          </p>
        </div>
      )}

      {/* ---- the document matrix ---- */}
      {readiness.profile && (
        <div className="mt-3 overflow-hidden rounded-xl border border-slate-200">
          <p className="border-b border-slate-200 bg-slate-50 px-3 py-2 text-[11px] font-bold uppercase tracking-wide text-slate-500">
            {t("matrixTitle", { country: readiness.profile.country })}
          </p>
          <ul className="divide-y divide-slate-100">
            {readiness.profile.documents.map((document) => (
              <li key={document.id} className="flex flex-wrap items-center justify-between gap-2 px-3 py-2">
                <span className="min-w-0 break-words text-[11px] font-bold text-slate-800 whitespace-normal">
                  {t(`documents.${document.id as DocumentId}`)}
                </span>
                <span className="flex shrink-0 flex-wrap items-center gap-1.5">
                  <span className={`rounded-full border px-2 py-0.5 text-[10px] font-bold ${NEED_TONE[document.apostille]}`}>
                    {t(`apostilleNeeds.${document.apostille}`)}
                  </span>
                  <span className={`rounded-full border px-2 py-0.5 text-[10px] font-bold ${TRANSLATION_TONE[document.translation]}`}>
                    {t(`translationNeeds.${document.translation}`)}
                    {document.translationLanguage ? ` · ${document.translationLanguage}` : ""}
                  </span>
                </span>
              </li>
            ))}
          </ul>
          {(() => {
            const noteKey = readiness.profile.country
              .toLowerCase()
              .replace(/[^a-z0-9]+/g, "_");
            if (!t.has(`matrixNotes.${noteKey}` as never)) return null;
            return (
              <p className="break-words border-t border-slate-100 px-3 py-2 text-[10px] leading-relaxed text-slate-500">
                {t(`matrixNotes.${noteKey}` as never)}
              </p>
            );
          })()}
        </div>
      )}

      {readiness.profile?.sourceUrl && (
        <a
          href={readiness.profile.sourceUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-2 inline-flex min-h-11 items-center gap-1 text-[11px] font-semibold text-indigo-700 hover:underline"
        >
          <FileCheck2 className="h-3 w-3" aria-hidden />
          {readiness.profile.sourceName}
          <ExternalLink className="h-3 w-3" aria-hidden />
        </a>
      )}

      <AppNote kind="visa" className="mt-3 border-t border-slate-100 pt-3" />
    </section>
  );
}

export default ApostilleReadinessCard;
