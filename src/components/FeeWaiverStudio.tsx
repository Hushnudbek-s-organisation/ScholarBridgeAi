"use client";

/**
 * Priority 5.1 — Fee Waiver & $0-Application Finder.
 *
 * Application fees are the first real money an applicant spends, and for a
 * student applying to eight universities they can exceed $700 before a single
 * decision arrives. This panel answers three questions with published facts
 * only:
 *
 *   1. Which of MY shortlisted universities can I apply to for $0, or through a
 *      portal where one fee covers several choices?
 *   2. Do I have a recorded reason to ASK for a waiver (an indicator — never an
 *      approval)?
 *   3. What exactly do I send? Two ready-to-copy letters: the student's own
 *      request, and the school counselor's financial-hardship attestation that
 *      Common App and most portals accept as evidence.
 *
 * Everything is computed locally by `src/lib/feeWaivers.ts`. A fee the catalogue
 * does not publish stays "not published" — it is never shown as $0, and savings
 * are never counted on a number we do not have (spec §14).
 */
import React from "react";
import { useTranslations } from "next-intl";
import {
  AlertCircle,
  BadgeDollarSign,
  Check,
  Copy,
  ExternalLink,
  FileText,
  Loader2,
  PiggyBank,
  ScrollText,
} from "lucide-react";
import type { StudentProfile } from "./Navbar";
import { AppNote } from "@/components/AppNote";
import { ShowMoreToggle } from "@/components/hubs/ui";
import { formatMoney } from "@/lib/format";
import { resolvedUsdUniversityCosts } from "@/lib/usdCosts";
import {
  evaluateFeeWaiverOptions,
  evaluateWaiverEligibility,
  generateCounselorAttestationLetter,
  generateFeeWaiverRequestLetter,
  universityFeeUsd,
  FEE_WAIVER_INCOME_THRESHOLD_USD,
  type FeeCategory,
  type FeeWaiverUniversityInput,
  type FeeWaiverUniversityResult,
  type GeneratedLetter,
} from "@/lib/feeWaivers";

/* -------------------------------------------------------------------------- */
/* Source rows                                                                 */
/* -------------------------------------------------------------------------- */

/** A saved-university row as `/api/saved-universities` returns it. */
interface SavedUniversityRow {
  universityId?: number | null;
  university?: {
    id?: number | null;
    name?: string | null;
    country?: string | null;
    degreeLevel?: string | null;
    applicationFee?: number | null;
    applicationFeeCurrency?: string | null;
    annualTuition?: number | null;
    tuitionCurrency?: string | null;
    tuitionPeriod?: string | null;
    annualTuitionUsd?: number | null;
    applicationUrl?: string | null;
    websiteUrl?: string | null;
  } | null;
}

/** A catalogue row as `/api/universities` returns it (already USD-resolved). */
interface CatalogueRow {
  id?: number | null;
  name?: string | null;
  country?: string | null;
  degreeLevel?: string | null;
  applicationFee?: number | null;
  applicationFeeCurrency?: string | null;
  applicationFeeUsd?: number | null;
  applicationUrl?: string | null;
  websiteUrl?: string | null;
}

function fromSavedRow(row: SavedUniversityRow): FeeWaiverUniversityInput | null {
  const uni = row.university;
  const name = uni?.name?.trim();
  if (!name) return null;
  const costs = resolvedUsdUniversityCosts({
    applicationFee: uni?.applicationFee ?? null,
    applicationFeeCurrency: uni?.applicationFeeCurrency ?? null,
    annualTuition: uni?.annualTuition ?? null,
    tuitionCurrency: uni?.tuitionCurrency ?? null,
    tuitionPeriod: uni?.tuitionPeriod ?? null,
    annualTuitionUsd: uni?.annualTuitionUsd ?? null,
  });
  return {
    id: uni?.id ?? row.universityId ?? null,
    name,
    country: uni?.country ?? null,
    degreeLevel: uni?.degreeLevel ?? null,
    applicationFee: uni?.applicationFee ?? null,
    applicationFeeCurrency: uni?.applicationFeeCurrency ?? null,
    applicationFeeUsd: costs.applicationFeeUsd,
    portalUrl: uni?.applicationUrl ?? null,
    websiteUrl: uni?.websiteUrl ?? null,
  };
}

function fromCatalogueRow(row: CatalogueRow): FeeWaiverUniversityInput | null {
  const name = row.name?.trim();
  if (!name) return null;
  return {
    id: row.id ?? null,
    name,
    country: row.country ?? null,
    degreeLevel: row.degreeLevel ?? null,
    applicationFee: row.applicationFee ?? null,
    applicationFeeCurrency: row.applicationFeeCurrency ?? null,
    applicationFeeUsd: row.applicationFeeUsd ?? null,
    portalUrl: row.applicationUrl ?? null,
    websiteUrl: row.websiteUrl ?? null,
  };
}

/* -------------------------------------------------------------------------- */
/* Category ordering + tone                                                    */
/* -------------------------------------------------------------------------- */

const CATEGORY_ORDER: FeeCategory[] = ["zero_fee", "shared_fee", "waiver_likely", "published_fee", "fee_unknown"];

const CATEGORY_TONE: Record<FeeCategory, string> = {
  zero_fee: "border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-100",
  shared_fee: "border-sky-200 bg-sky-50 text-sky-800 dark:border-sky-500/30 dark:bg-sky-500/10 dark:text-sky-100",
  waiver_likely: "border-violet-200 bg-violet-50 text-violet-800 dark:border-violet-500/30 dark:bg-violet-500/10 dark:text-violet-100",
  published_fee: "border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-100",
  fee_unknown: "border-slate-200 bg-slate-50 text-slate-600 dark:border-slate-700 dark:bg-slate-800/60 dark:text-slate-300",
};

/* -------------------------------------------------------------------------- */
/* Component                                                                   */
/* -------------------------------------------------------------------------- */

export interface FeeWaiverStudioProps {
  profile: StudentProfile | null;
  /**
   * Restrict the finder to a known shortlist (an application tracker, a saved
   * list). Without it the panel uses the student's saved universities and falls
   * back to their first preferred country.
   */
  universityIds?: number[] | null;
  className?: string;
}

export function FeeWaiverStudio({ profile, universityIds, className = "" }: FeeWaiverStudioProps) {
  const t = useTranslations("feeWaiver");
  const [rows, setRows] = React.useState<FeeWaiverUniversityInput[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState("");
  const [source, setSource] = React.useState<"saved" | "catalogue" | "none">("none");

  const [template, setTemplate] = React.useState<"request" | "attestation">("request");
  const [letterUniversity, setLetterUniversity] = React.useState("");
  const [counselorName, setCounselorName] = React.useState("");
  const [counselorTitle, setCounselorTitle] = React.useState("");
  const [schoolName, setSchoolName] = React.useState("");
  const [copied, setCopied] = React.useState<"subject" | "body" | null>(null);

  /* ---- load the shortlist ------------------------------------------------ */
  React.useEffect(() => {
    let live = true;
    const controller = new AbortController();
    // Deferred by a timer, the way DeadlineCenter does it: the effect body must
    // not write state synchronously, or every mount cascades two extra renders.
    const timer = window.setTimeout(() => { void run(); }, 0);

    const preferred = (() => {
      try {
        const parsed = JSON.parse(profile?.preferredCountries ?? "[]");
        return Array.isArray(parsed) ? parsed.map((item) => String(item)).filter(Boolean) : [];
      } catch {
        return [];
      }
    })();

    async function run() {
      const id = profile?.id;
      if (!id) {
        // Nothing to fetch for a signed-out visitor: clear the previous
        // student's shortlist so no stale fees are ever shown.
        setRows([]);
        setSource("none");
        setLoading(false);
        return;
      }
      setLoading(true);
      setError("");
      try {
        const savedRes = await fetch(`/api/saved-universities?profileId=${id}`, {
          signal: controller.signal,
        });
        const savedData = await savedRes.json().catch(() => null);
        const saved: FeeWaiverUniversityInput[] = savedRes.ok && Array.isArray(savedData?.savedUniversities)
          ? savedData.savedUniversities.map(fromSavedRow).filter(Boolean)
          : [];

        if (saved.length > 0) {
          if (!live) return;
          setRows(saved);
          setSource("saved");
          setLoading(false);
          return;
        }

        // No shortlist yet: show what the destination countries actually charge,
        // so the panel is still useful before the student saves anything.
        const params = new URLSearchParams({ perPage: "40", sort: "rank" });
        if (preferred[0]) params.set("country", preferred[0]);
        const catRes = await fetch(`/api/universities?${params.toString()}`, { signal: controller.signal });
        const catData = await catRes.json().catch(() => null);
        const catalogue: FeeWaiverUniversityInput[] = catRes.ok && Array.isArray(catData?.universities)
          ? catData.universities.map(fromCatalogueRow).filter(Boolean)
          : [];
        if (!live) return;
        setRows(catalogue);
        setSource(catalogue.length > 0 ? "catalogue" : "none");
      } catch (err) {
        if ((err as Error)?.name === "AbortError") return;
        if (!live) return;
        setError(t("loadError"));
        setSource("none");
      } finally {
        if (live) setLoading(false);
      }
    }

    return () => {
      live = false;
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [profile?.id, profile?.preferredCountries, t]);

  /* ---- evaluate ---------------------------------------------------------- */
  const scoped = React.useMemo(() => {
    if (!universityIds || universityIds.length === 0) return rows;
    const wanted = new Set(universityIds);
    const filtered = rows.filter((row) => row.id != null && wanted.has(row.id));
    return filtered.length > 0 ? filtered : rows;
  }, [rows, universityIds]);

  const evaluation = React.useMemo(() => evaluateFeeWaiverOptions(profile, scoped), [profile, scoped]);
  const eligibility = evaluation.eligibility;

  const grouped = React.useMemo(() => {
    const map = new Map<FeeCategory, FeeWaiverUniversityResult[]>();
    for (const category of CATEGORY_ORDER) map.set(category, []);
    for (const result of evaluation.universities) map.get(result.category)?.push(result);
    return [...map.entries()].filter(([, list]) => list.length > 0);
  }, [evaluation.universities]);

  // Clean-UI pass: the per-university section opens with six rows across the
  // categories (the evaluation is already sorted best-option-first), and the
  // remaining universities unfold through one Show-more pill. Same rows,
  // same grouping — never a second source of truth.
  const [showAllRows, setShowAllRows] = React.useState(false);
  const totalRows = grouped.reduce((n, [, list]) => n + list.length, 0);
  const visibleGrouped = React.useMemo(() => {
    if (showAllRows) return grouped;
    let budget = 6;
    const out: typeof grouped = [];
    for (const [category, list] of grouped) {
      if (budget <= 0) break;
      const take = list.slice(0, budget);
      budget -= take.length;
      if (take.length > 0) out.push([category, take]);
    }
    return out;
  }, [grouped, showAllRows]);

  /* ---- letters ----------------------------------------------------------- */
  const letter: GeneratedLetter | null = React.useMemo(() => {
    const universityName = letterUniversity.trim();
    if (!universityName) return null;
    return template === "request"
      ? generateFeeWaiverRequestLetter(profile, universityName)
      : generateCounselorAttestationLetter(profile, {
          universityName,
          counselorName: counselorName.trim() || null,
          counselorTitle: counselorTitle.trim() || null,
          schoolName: schoolName.trim() || null,
        });
  }, [template, letterUniversity, profile, counselorName, counselorTitle, schoolName]);

  const copy = async (which: "subject" | "body", value: string) => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(which);
      window.setTimeout(() => setCopied(null), 2000);
    } catch {
      setCopied(null);
    }
  };

  /* ---- render ------------------------------------------------------------ */
  return (
    <section className={`rounded-2xl border border-slate-200 bg-white p-4 sm:p-5 ${className}`} aria-labelledby="fee-waiver-title">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 id="fee-waiver-title" className="flex items-center gap-2 text-sm font-extrabold text-slate-900">
            <BadgeDollarSign className="h-4 w-4 text-emerald-600" aria-hidden />
            {t("title")}
          </h3>
          <p className="mt-1 max-w-2xl break-words text-[11px] leading-relaxed text-slate-500">{t("subtitle")}</p>
        </div>
        <div className="flex shrink-0 items-center gap-1.5 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-extrabold text-emerald-800 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-100">
          <PiggyBank className="h-3.5 w-3.5" aria-hidden />
          {t("savingTotal", { amount: formatMoney(evaluation.totals.avoidableTotalUsd, "USD") })}
        </div>
      </div>

      {/* ---- eligibility indicators ---- */}
      <div className="mt-3 rounded-xl border border-slate-200 bg-slate-50 p-3">
        <p className="text-[11px] font-bold uppercase tracking-wide text-slate-500">{t("eligibilityTitle")}</p>
        <p className="mt-1 break-words text-xs font-semibold text-slate-700">
          {t(`eligibility.${eligibility.headline}`)}
        </p>
        <div className="mt-2 flex flex-wrap gap-1.5">
          {eligibility.indicators.length === 0 && (
            <span className="rounded-full border border-slate-200 bg-white px-2 py-0.5 text-[10px] font-bold text-slate-500">
              {t("noIndicators")}
            </span>
          )}
          {eligibility.indicators.map((indicator) => (
            <span
              key={indicator}
              className="inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-white px-2 py-0.5 text-[10px] font-bold text-emerald-700 dark:border-emerald-500/30 dark:text-emerald-200"
            >
              <Check className="h-3 w-3" aria-hidden />
              {t(`indicators.${indicator}`)}
            </span>
          ))}
          {eligibility.missing.map((indicator) => (
            <span
              key={`missing-${indicator}`}
              title={t(`indicators.${indicator}Hint`)}
              className="inline-flex items-center gap-1 rounded-full border border-amber-200 bg-white px-2 py-0.5 text-[10px] font-bold text-amber-700 dark:border-amber-500/30 dark:text-amber-200"
            >
              <AlertCircle className="h-3 w-3" aria-hidden />
              {t("missingIndicator", { name: t(`indicators.${indicator}`) })}
            </span>
          ))}
        </div>
        <p className="mt-2 break-words text-[10px] leading-relaxed text-slate-500">
          {t("eligibilityDisclaimer", { threshold: formatMoney(FEE_WAIVER_INCOME_THRESHOLD_USD, "USD") })}
        </p>
      </div>

      {/* ---- totals ---- */}
      {loading ? (
        <p className="mt-3 flex items-center gap-2 text-xs font-semibold text-slate-500">
          <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />
          {t("loading")}
        </p>
      ) : error ? (
        <p role="alert" className="mt-3 break-words rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-semibold text-rose-800 dark:border-rose-500/30 dark:bg-rose-500/10 dark:text-rose-200">
          {error}
        </p>
      ) : rows.length === 0 ? (
        <p className="mt-3 break-words rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs leading-relaxed text-slate-600">
          {t("empty")}
        </p>
      ) : (
        <>
          <div className="mt-3 flex flex-wrap gap-1.5">
            {(["zeroFee", "sharedFee", "waiverLikely", "publishedFee", "feeUnknown"] as const).map((key) => {
              const value = evaluation.totals[key];
              if (!value) return null;
              const category = key === "zeroFee"
                ? "zero_fee"
                : key === "sharedFee"
                  ? "shared_fee"
                  : key === "waiverLikely"
                    ? "waiver_likely"
                    : key === "publishedFee"
                      ? "published_fee"
                      : "fee_unknown";
              return (
                <span key={key} className={`rounded-full border px-2.5 py-1 text-[10px] font-bold ${CATEGORY_TONE[category]}`}>
                  {t(`categories.${category}.short`, { count: value })}
                </span>
              );
            })}
            <span className="rounded-full border border-slate-200 bg-white px-2.5 py-1 text-[10px] font-bold text-slate-600">
              {t("publishedFeeTotal", { amount: formatMoney(evaluation.totals.publishedFeeTotalUsd, "USD") })}
            </span>
          </div>

          {source === "catalogue" && (
            <p className="mt-2 break-words text-[10px] leading-relaxed text-slate-500">{t("catalogueSourceNote")}</p>
          )}

          {/* ---- per-university rows, best option first ---- */}
          <div className="mt-3 space-y-2">
            {visibleGrouped.map(([category, list]) => (
              <div key={category} className="rounded-xl border border-slate-200">
                <p className={`rounded-t-xl border-b px-3 py-1.5 text-[11px] font-extrabold ${CATEGORY_TONE[category]}`}>
                  {t(`categories.${category}.title`)}
                </p>
                <ul className="divide-y divide-slate-100">
                  {list.map((result) => {
                    const fee = universityFeeUsd(result.university);
                    return (
                      <li key={`${result.university.id ?? result.university.name}`} className="px-3 py-2">
                        <div className="flex flex-wrap items-start justify-between gap-2">
                          <div className="min-w-0">
                            <p className="break-words text-xs font-bold text-slate-800">
                              {result.university.name}
                              {result.university.country ? (
                                <span className="font-semibold text-slate-500"> · {result.university.country}</span>
                              ) : null}
                            </p>
                            <p className="mt-0.5 break-words text-[11px] leading-relaxed text-slate-600">
                              {t(`categories.${result.category}.explain`)}
                              {result.route ? ` ${t(`routes.${result.route.id}.desc`)}` : ""}
                            </p>
                            {result.programs.length > 0 && (
                              <p className="mt-1 flex flex-wrap gap-1">
                                {result.programs.map((program) => (
                                  <a
                                    key={program.id}
                                    href={program.portalUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    title={t(`programs.${program.id}.desc`)}
                                    className="inline-flex min-h-9 items-center gap-1 rounded-full border border-violet-200 bg-violet-50 px-2 py-0.5 text-[10px] font-bold text-violet-800 hover:bg-violet-100 dark:border-violet-500/30 dark:bg-violet-500/10 dark:text-violet-100"
                                  >
                                    {t(`programs.${program.id}.name`)}
                                    <ExternalLink className="h-2.5 w-2.5" aria-hidden />
                                  </a>
                                ))}
                              </p>
                            )}
                            {result.route && (
                              <a
                                href={result.route.portalUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="mt-1 inline-flex min-h-9 items-center gap-1 text-[11px] font-semibold text-indigo-700 hover:underline"
                              >
                                {t(`routes.${result.route.id}.name`)}
                                <ExternalLink className="h-3 w-3" aria-hidden />
                              </a>
                            )}
                          </div>
                          <div className="shrink-0 text-right">
                            <p className="text-xs font-extrabold text-slate-900">
                              {result.category === "zero_fee"
                                ? t("feeZero")
                                : fee != null
                                  ? formatMoney(fee, "USD")
                                  : t("feeUnknown")}
                            </p>
                            {result.avoidableUsd != null && result.avoidableUsd > 0 && (
                              <p className="text-[10px] font-bold text-emerald-700 dark:text-emerald-300">
                                {t("avoidable", { amount: formatMoney(result.avoidableUsd, "USD") })}
                              </p>
                            )}
                            {result.route?.sourceUrl && (
                              <a
                                href={result.route.sourceUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="mt-0.5 inline-flex min-h-9 items-center gap-1 text-[10px] font-semibold text-slate-500 hover:text-indigo-600"
                              >
                                <FileText className="h-2.5 w-2.5" aria-hidden />
                                {t("officialSource")}
                              </a>
                            )}
                          </div>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              </div>
            ))}
            <ShowMoreToggle
              className="pt-1"
              totalCount={totalRows}
              visibleCount={showAllRows ? totalRows : Math.min(6, totalRows)}
              expanded={showAllRows}
              onToggle={() => setShowAllRows((v) => !v)}
            />
          </div>
        </>
      )}

      {/* ---- letter generator ---- */}
      <div className="mt-4 rounded-xl border border-slate-200 p-3">
        <h4 className="flex items-center gap-1.5 text-xs font-extrabold text-slate-900">
          <ScrollText className="h-3.5 w-3.5 text-indigo-600" aria-hidden />
          {t("letterTitle")}
        </h4>
        <p className="mt-1 break-words text-[11px] leading-relaxed text-slate-500">{t("letterSubtitle")}</p>

        <div className="mt-2 flex flex-wrap gap-1.5">
          {(["request", "attestation"] as const).map((option) => (
            <button
              key={option}
              type="button"
              onClick={() => setTemplate(option)}
              aria-pressed={template === option}
              className={`min-h-11 rounded-xl border px-3 py-2 text-[11px] font-bold transition-colors ${
                template === option
                  ? "border-indigo-300 bg-indigo-50 text-indigo-800 dark:border-indigo-500/40 dark:bg-indigo-500/15 dark:text-indigo-100"
                  : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
              }`}
            >
              {t(`templates.${option}`)}
            </button>
          ))}
        </div>

        <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-2">
          <label className="block text-[11px] font-semibold text-slate-600">
            {t("letterUniversityLabel")}
            <input
              list="fee-waiver-universities"
              value={letterUniversity}
              onChange={(event) => setLetterUniversity(event.target.value)}
              placeholder={t("letterUniversityPlaceholder")}
              className="sb-field mt-1 min-h-11 w-full rounded-xl border px-3 py-2 text-xs text-slate-800"
            />
            <datalist id="fee-waiver-universities">
              {scoped.map((row) => (
                <option key={row.id ?? row.name} value={row.name} />
              ))}
            </datalist>
          </label>

          {template === "attestation" && (
            <>
              <label className="block text-[11px] font-semibold text-slate-600">
                {t("counselorNameLabel")}
                <input
                  value={counselorName}
                  onChange={(event) => setCounselorName(event.target.value)}
                  placeholder={t("counselorNamePlaceholder")}
                  className="sb-field mt-1 min-h-11 w-full rounded-xl border px-3 py-2 text-xs text-slate-800"
                />
              </label>
              <label className="block text-[11px] font-semibold text-slate-600">
                {t("counselorTitleLabel")}
                <input
                  value={counselorTitle}
                  onChange={(event) => setCounselorTitle(event.target.value)}
                  placeholder={t("counselorTitlePlaceholder")}
                  className="sb-field mt-1 min-h-11 w-full rounded-xl border px-3 py-2 text-xs text-slate-800"
                />
              </label>
              <label className="block text-[11px] font-semibold text-slate-600">
                {t("schoolNameLabel")}
                <input
                  value={schoolName}
                  onChange={(event) => setSchoolName(event.target.value)}
                  placeholder={t("schoolNamePlaceholder")}
                  className="sb-field mt-1 min-h-11 w-full rounded-xl border px-3 py-2 text-xs text-slate-800"
                />
              </label>
            </>
          )}
        </div>

        {letter ? (
          <div className="mt-3 rounded-xl border border-slate-200 bg-slate-50 p-3">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">{t("letterSubject")}</p>
                <p className="break-words text-xs font-bold text-slate-800">{letter.subject}</p>
              </div>
              <div className="flex shrink-0 gap-1.5">
                <button
                  type="button"
                  onClick={() => void copy("subject", letter.subject)}
                  className="flex min-h-11 items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-[11px] font-bold text-slate-700 hover:bg-slate-100"
                >
                  {copied === "subject" ? <Check className="h-3 w-3 text-emerald-600" aria-hidden /> : <Copy className="h-3 w-3" aria-hidden />}
                  {t("copySubject")}
                </button>
                <button
                  type="button"
                  onClick={() => void copy("body", letter.body)}
                  className="flex min-h-11 items-center gap-1 rounded-lg bg-indigo-600 px-2.5 py-1.5 text-[11px] font-bold text-white hover:bg-indigo-700"
                >
                  {copied === "body" ? <Check className="h-3 w-3" aria-hidden /> : <Copy className="h-3 w-3" aria-hidden />}
                  {t("copyBody")}
                </button>
              </div>
            </div>

            <pre className="mt-2 max-h-72 overflow-auto rounded-lg border border-slate-200 bg-white p-3 text-[11px] leading-relaxed whitespace-pre-wrap break-words text-slate-700">
              {letter.body}
            </pre>

            {letter.placeholders.length > 0 && (
              <p className="mt-2 flex flex-wrap items-center gap-1.5 break-words text-[11px] font-semibold text-amber-800 dark:text-amber-200">
                <AlertCircle className="h-3.5 w-3.5 shrink-0" aria-hidden />
                {t("placeholders", { count: letter.placeholders.length })}
                {letter.placeholders.map((placeholder) => (
                  <code key={placeholder} className="rounded bg-amber-100 px-1 py-0.5 text-[10px] dark:bg-amber-500/20">
                    {placeholder}
                  </code>
                ))}
              </p>
            )}
            <p className="mt-2 break-words text-[10px] leading-relaxed text-slate-500">{t("letterDisclaimer")}</p>
          </div>
        ) : (
          <p className="mt-3 break-words rounded-xl border border-dashed border-slate-200 px-3 py-3 text-[11px] leading-relaxed text-slate-500">
            {t("letterEmpty")}
          </p>
        )}
      </div>

      <AppNote kind="catalogue" className="mt-3 border-t border-slate-100 pt-3" />
    </section>
  );
}

export default FeeWaiverStudio;
