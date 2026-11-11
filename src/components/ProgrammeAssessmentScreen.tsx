"use client";

/**
 * Programme assessment screen — the replacement for the old "Chancing" panel.
 *
 * WHAT CHANGED AND WHY (spec §8, §10)
 * -----------------------------------
 * The old screen ranked universities by a composite "chance" number, printed it
 * with a `%`, and stamped each row with Safety / Likely / Target / Reach. That
 * number was a planning heuristic (department multipliers, selectivity
 * penalties, cohort percentiles) — it looked like an admission probability and
 * was not one. It is gone.
 *
 * This screen shows the FIVE separate answers the canonical service returns,
 * each labelled as exactly what it is:
 *   1. preference fit — “79/100”, or an honest interval “85–100/100” with a
 *      separate data-coverage line when a factor is unknown;
 *   2. eligibility — documented requirements, met / not met / check on the
 *      official page, grouped, with the gap that would close a miss;
 *   3. finance — annual cost, confirmed funding, funding gap (or "unknown");
 *   4. academic comparison — recorded result vs a PUBLISHED 25th–75th range,
 *      with the year/scope/population stated beside it;
 *   5. admission probability — explicitly not provided, with the reason.
 *
 * Programmes are grouped (meets / check further / gaps / must-not-met) and
 * ordered conservatively. Nothing here is an admission prediction.
 */

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import {
  AlertTriangle,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  ExternalLink,
  GraduationCap,
  HelpCircle,
  RefreshCw,
  ShieldQuestion,
  SlidersHorizontal,
  Wallet,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { useLocaleContext } from "@/i18n/LocaleProvider";
import { localizeCountry, localizeMajorOrField } from "@/lib/catalogLocalizer";
import { profileMatchFingerprint } from "@/lib/profileMatchFingerprint";
import { TwinStrategyCard } from "./TwinStrategyCard";
import CountryFlag from "@/components/CountryFlag";

const GROUP_ORDER = ["meets_requirements", "needs_check", "requirement_gaps", "preference_mismatch"] as const;

/** Static lookups: a computed message key can ship a missing locale entry. */
function groupLabel(key: (typeof GROUP_ORDER)[number], t: (key: string) => string): string {
  switch (key) {
    case "meets_requirements":
      return t("group_meets_requirements");
    case "needs_check":
      return t("group_needs_check");
    case "requirement_gaps":
      return t("group_requirement_gaps");
    default:
      return t("group_preference_mismatch");
  }
}

function groupHintLabel(key: (typeof GROUP_ORDER)[number], t: (key: string) => string): string {
  switch (key) {
    case "meets_requirements":
      return t("groupHint_meets_requirements");
    case "needs_check":
      return t("groupHint_needs_check");
    case "requirement_gaps":
      return t("groupHint_requirement_gaps");
    default:
      return t("groupHint_preference_mismatch");
  }
}

// ---------------------------------------------------------------------------
// Screen-local row types
// ---------------------------------------------------------------------------

// The assessment SHAPES and the shared renderers live in one place: this
// screen and the recommendation studio must describe the same numbers with
// the same words, and neither may re-implement the formula.
import {
  AcademicComparisonList,
  AdmissionProbabilityNote,
  CheckRow,
  EligibilityBadge,
  EligibilitySummaryLine,
  FitBadge,
  FitSummary,
  PreferenceFilterList,
  FinanceBlock,
  academicMetricLabel,
  academicPositionLabel,
  axisLabel,
  financeStatusLabel,
  fundingReasonLabel,
  modeLabel,
  money,
  oneDecimal,
  unknownFieldLabel,
  unknownReasonLabel,
  eligibilityStatusLabel,
  type Assessment,
  type FitPoint,
} from "@/components/AssessmentParts";
type UniversityRow = {
  universityId: number;
  universityName: string;
  country: string;
  city?: string | null;
  flagEmoji?: string;
  worldRanking?: number | null;
  officialWebsiteUrl?: string;
  fitScore: number;
  fitReasons: string[];
  fitIssues: string[];
  matchBreakdown?: { comparedDimensions: number; totalDimensions: number; evidenceCoveragePct: number };
  probability: { available: false; reason: string };
  assessment: Assessment;
  programmes?: {
    id: number;
    name: string;
    degreeLevel: string | null;
    field: string | null;
    group: number;
    fit: FitPoint;
    eligibilityStatus: string;
  }[];
};

type ChancingResponse = {
  results: UniversityRow[];
  probability: { available: false; reason: string };
  scenario?: boolean;
  isCatalogSample?: boolean;
  catalogUniversities?: { id: number; name: string; country: string; flagEmoji: string; worldRanking: number | null }[];
  scoringVersion?: string;
};

export function ProgrammeAssessmentScreen({
  profileId: propProfileId,
  activeProfile,
}: {
  profileId?: number | null;
  activeProfile?: {
    id?: number | null;
    gpa?: number | null;
    gpaScale?: number | null;
    ieltsScore?: number | null;
    toeflScore?: number | null;
    duolingoScore?: number | null;
    satScore?: number | null;
    budgetAnnualUsd?: number | null;
    targetMajor?: string | null;
    degreeLevel?: string | null;
  } | null;
}) {
  const profileId = propProfileId ?? activeProfile?.id ?? null;
  const t = useTranslations("chancing");
  const { locale } = useLocaleContext();

  const [results, setResults] = useState<UniversityRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<number | null>(null);
  const [selectedProgramByUni, setSelectedProgramByUni] = useState<Record<number, number>>({});

  const fingerprint = profileMatchFingerprint(activeProfile);

  const load = useCallback(async () => {
    if (!profileId) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/chancing?profileId=${profileId}&all=1`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = (await res.json()) as ChancingResponse;
      const rows = json.results ?? [];
      setResults(rows);
      if (rows.length && expanded === null) setExpanded(rows[0].universityId);
    } catch (e) {
      console.error(e);
      setError(t("loadFailed"));
    } finally {
      setLoading(false);
    }
  }, [profileId, expanded, t]);

  useEffect(() => {
    // Re-runs on any score-relevant profile edit: a changed GPA/preference must
    // re-assess immediately, not after a reload.
    void Promise.resolve().then(() => load());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profileId, fingerprint]);

  /** Group + order exactly as the canonical service documents. */
  const grouped = useMemo(() => {
    const buckets = new Map<string, UniversityRow[]>();
    for (const row of results) {
      const key = row.assessment.groupKey;
      const list = buckets.get(key) ?? [];
      list.push(row);
      buckets.set(key, list);
    }
    for (const list of buckets.values()) {
      list.sort((a, b) => {
        const la = a.assessment.preferenceFit.lowerBound;
        const lb = b.assessment.preferenceFit.lowerBound;
        if (la != null && lb != null && la !== lb) return lb - la;
        if (la == null && lb != null) return 1;
        if (la != null && lb == null) return -1;
        const ca = a.assessment.preferenceFit.coverage ?? -1;
        const cb = b.assessment.preferenceFit.coverage ?? -1;
        if (ca !== cb) return cb - ca;
        return a.universityId - b.universityId;
      });
    }
    return GROUP_ORDER.filter((key) => buckets.has(key)).map((key) => ({
      key,
      rows: buckets.get(key) ?? [],
    }));
  }, [results]);

  if (!profileId) {
    return (
      <div className="rounded-overlay border border-dashed border-slate-300 p-6 text-center text-slate-500 dark:border-slate-700 dark:text-slate-400">
        {t("signIn")}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="flex items-center gap-2 text-xl font-bold text-slate-900 dark:text-slate-100">
            <GraduationCap className="h-5 w-5 text-indigo-600 dark:text-indigo-400" aria-hidden />
            {t("assessmentTitle")}
          </h2>
          <p className="mt-1 max-w-3xl text-sm text-slate-600 dark:text-slate-300">{t("assessmentSubtitle")}</p>
        </div>
        <Button
          variant="unstyled"
          onClick={() => load()}
          disabled={loading}
          className="inline-flex items-center gap-1.5 rounded-surface border border-indigo-200 bg-indigo-50 px-3 py-2 text-xs font-semibold text-indigo-700 dark:border-indigo-800 dark:bg-indigo-950/60 dark:text-indigo-200"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} aria-hidden />
          {t("refresh")}
        </Button>
      </header>

      {/* The honest policy statement, always visible — not a tooltip. */}
      <section className="rounded-overlay border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-900">
        <h3 className="flex items-center gap-2 text-sm font-bold text-slate-900 dark:text-slate-100">
          <ShieldQuestion className="h-4 w-4 text-slate-500" aria-hidden />
          {t("unavailableTitle")}
        </h3>
        <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">{t("unavailableBody")}</p>
        <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">{t("assessmentPrivacyNote")}</p>
      </section>

      {loading && <p className="text-sm text-slate-500">{t("assessing")}</p>}
      {error && (
        <p className="rounded-overlay border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800" role="alert">
          {error}
        </p>
      )}
      {!loading && !error && results.length === 0 && (
        <p className="rounded-overlay border border-dashed border-slate-300 p-6 text-center text-sm text-slate-500">
          {t("empty")}
        </p>
      )}

      {grouped.map((group) => (
        <section key={group.key} className="space-y-3">
          <h3 className="flex items-center gap-2 text-sm font-bold uppercase tracking-wide text-slate-600 dark:text-slate-300">
            {groupLabel(group.key, t)}
            <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-600 dark:bg-slate-800 dark:text-slate-300">
              {group.rows.length}
            </span>
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400">{groupHintLabel(group.key, t)}</p>

          {group.rows.map((row) => {
            const isOpen = expanded === row.universityId;
            const assessment = row.assessment;
            const programmeOptions = row.programmes ?? [];
            const activeProgrammeId = selectedProgramByUni[row.universityId] ?? programmeOptions[0]?.id ?? null;
            return (
              <article
                key={row.universityId}
                className="overflow-hidden rounded-overlay border border-slate-200 bg-white shadow-xs dark:border-slate-700 dark:bg-slate-900"
              >
                <button
                  type="button"
                  onClick={() => setExpanded(isOpen ? null : row.universityId)}
                  aria-expanded={isOpen}
                  className="flex w-full flex-wrap items-center gap-3 p-4 text-left"
                >
                  <span className="flex min-w-0 flex-1 items-center gap-2">
                    {row.country ? <CountryFlag country={row.country} /> : null}
                    <span className="min-w-0">
                      <span className="block truncate font-bold text-slate-900 dark:text-slate-100">{row.universityName}</span>
                      <span className="block truncate text-xs text-slate-500 dark:text-slate-400">
                        {localizeCountry(row.country, locale)}
                        {assessment.programme.name ? ` · ${localizeMajorOrField(assessment.programme.name, locale)}` : ""}
                        {assessment.context.degreeLevel ? ` · ${assessment.context.degreeLevel}` : ""}
                      </span>
                    </span>
                  </span>
                  <FitBadge fit={assessment.preferenceFit} label={t("fitLabel")} />
                  <EligibilityBadge status={assessment.eligibility.status} />
                  {isOpen ? <ChevronUp className="h-4 w-4 text-slate-400" aria-hidden /> : <ChevronDown className="h-4 w-4 text-slate-400" aria-hidden />}
                </button>

                {isOpen && (
                  <div className="space-y-4 border-t border-slate-100 p-4 dark:border-slate-800">
                    {programmeOptions.length > 1 && (
                      <label className="flex flex-wrap items-center gap-2 text-xs font-semibold text-slate-600 dark:text-slate-300">
                        <SlidersHorizontal className="h-3.5 w-3.5" aria-hidden />
                        {t("chooseProgramme")}
                        <select
                          value={activeProgrammeId ?? ""}
                          onChange={(event) =>
                            setSelectedProgramByUni((prev) => ({
                              ...prev,
                              [row.universityId]: Number(event.target.value),
                            }))
                          }
                          className="rounded-control border border-slate-300 bg-white px-2 py-1 text-xs dark:border-slate-600 dark:bg-slate-800"
                        >
                          {programmeOptions.map((programme) => (
                            <option key={programme.id} value={programme.id}>
                              {programme.name}
                              {programme.degreeLevel ? ` · ${programme.degreeLevel}` : ""}
                            </option>
                          ))}
                        </select>
                      </label>
                    )}

                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      {t("assessedScope", {
                        cycle: assessment.context.cycle ?? t("notStated"),
                        category: assessment.context.applicantCategory ?? t("notStated"),
                        level: assessment.context.degreeLevel ?? t("notStated"),
                      })}
                    </p>

                    {/* 1. Preference fit */}
                    <section aria-labelledby={`fit-${row.universityId}`}>
                      <h4 id={`fit-${row.universityId}`} className="text-sm font-bold text-slate-900 dark:text-slate-100">
                        {t("sectionFit")}
                      </h4>
                      <FitSummary fit={assessment.preferenceFit} />
                      <PreferenceFilterList filters={assessment.preferenceFilters} />
                      <details className="mt-2 text-xs text-slate-600 dark:text-slate-300">
                        <summary className="cursor-pointer font-semibold">{t("howFitIsCalculated")}</summary>
                        <div className="mt-2 space-y-2">
                          <p>{t("fitFormulaNote")}</p>
                          <table className="w-full text-left">
                            <caption className="sr-only">{t("sectionFit")}</caption>
                            <thead>
                              <tr>
                                <th className="p-1">{t("axisHeader")}</th>
                                <th className="p-1">{t("modeHeader")}</th>
                                <th className="p-1">{t("weightHeader")}</th>
                                <th className="p-1">{t("similarityHeader")}</th>
                              </tr>
                            </thead>
                            <tbody>
                              {(assessment.preferenceFit.breakdown ?? []).map((item) => (
                                <tr key={item.axis} className="border-t border-slate-100 dark:border-slate-800">
                                  <th scope="row" className="p-1 font-medium">{axisLabel(item.axis, t)}</th>
                                  <td className="p-1">{modeLabel(item.mode, t)}</td>
                                  <td className="p-1">{item.weight}</td>
                                  <td className="p-1">{item.similarity == null ? t("unknownValue") : oneDecimal(item.similarity)}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                          <p>
                            {t("fitArithmetic", {
                              w: oneDecimal(assessment.preferenceFit.weightedSimilarity),
                              t: assessment.preferenceFit.totalWeight,
                              k: assessment.preferenceFit.knownWeight,
                            })}
                          </p>
                        </div>
                      </details>
                    </section>

                    {/* 2. Eligibility */}
                    <section aria-labelledby={`elig-${row.universityId}`}>
                      <h4 id={`elig-${row.universityId}`} className="text-sm font-bold text-slate-900 dark:text-slate-100">
                        {t("sectionEligibility")}
                      </h4>
                      <div className="mt-1">
                        <EligibilitySummaryLine assessment={assessment} />
                      </div>
                      {assessment.eligibility.checks.length > 0 && (
                        <ul className="mt-2 space-y-1.5">
                          {assessment.eligibility.checks.map((check) => (
                            <CheckRow key={check.requirementId} check={check} />
                          ))}
                        </ul>
                      )}
                      {assessment.eligibility.gaps.length > 0 && (
                        <div className="mt-2 rounded-control border border-rose-200 bg-rose-50 p-2 text-xs text-rose-800">
                          <p className="font-semibold">{t("gapsTitle")}</p>
                          <ul className="mt-1 list-disc pl-4">
                            {assessment.eligibility.gaps.map((gap) => (
                              <li key={gap.requirementId}>{gap.text}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                      {assessment.eligibility.limitations.map((line) => (
                        <p key={line} className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                          {line}
                        </p>
                      ))}
                    </section>

                    {/* 3. Finance */}
                    <section aria-labelledby={`fin-${row.universityId}`}>
                      <h4 id={`fin-${row.universityId}`} className="flex items-center gap-2 text-sm font-bold text-slate-900 dark:text-slate-100">
                        <Wallet className="h-4 w-4 text-slate-500" aria-hidden />
                        {t("sectionFinance")}
                      </h4>
                      <dl className="mt-2 grid grid-cols-2 gap-2 text-xs sm:grid-cols-4">
                        <div>
                          <dt className="text-slate-500 dark:text-slate-400">{t("financeTotal")}</dt>
                          <dd className="font-semibold">
                            {assessment.finance.annualTotalUsd == null
                              ? t("financeUnknownTotal", { lower: money(assessment.finance.annualTotalLowerBoundUsd) })
                              : money(assessment.finance.annualTotalUsd)}
                          </dd>
                        </div>
                        <div>
                          <dt className="text-slate-500 dark:text-slate-400">{t("financeConfirmedFunding")}</dt>
                          <dd className="font-semibold">{money(assessment.finance.confirmedFundingUsd)}</dd>
                        </div>
                        <div>
                          <dt className="text-slate-500 dark:text-slate-400">{t("financeBudget")}</dt>
                          <dd className="font-semibold">
                            {assessment.finance.availableBudgetUsd == null ? t("notStated") : money(assessment.finance.availableBudgetUsd)}
                          </dd>
                        </div>
                        <div>
                          <dt className="text-slate-500 dark:text-slate-400">{t("financeGap")}</dt>
                          <dd className="font-semibold">
                            {assessment.finance.fundingGapUsd != null
                              ? money(assessment.finance.fundingGapUsd)
                              : assessment.finance.fundingGapRangeUsd
                                ? t("financeGapRange", {
                                    lower: money(assessment.finance.fundingGapRangeUsd.lower),
                                    upper:
                                      assessment.finance.fundingGapRangeUsd.upper == null
                                        ? t("notStated")
                                        : money(assessment.finance.fundingGapRangeUsd.upper),
                                  })
                                : t("unknownValue")}
                          </dd>
                        </div>
                      </dl>
                      <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{financeStatusLabel(assessment.finance.status, t)}</p>
                      {assessment.finance.excludedFunding.length > 0 && (
                        <details className="mt-2 text-xs text-slate-600 dark:text-slate-300">
                          <summary className="cursor-pointer font-semibold">{t("financeExcludedTitle")}</summary>
                          <ul className="mt-1 list-disc pl-4">
                            {assessment.finance.excludedFunding.map((line) => (
                              <li key={line.key}>
                                {line.key}: {fundingReasonLabel(line.reason, t)}
                              </li>
                            ))}
                          </ul>
                        </details>
                      )}
                      {assessment.finance.scenarios.length > 0 && (
                        <details className="mt-2 text-xs text-slate-600 dark:text-slate-300">
                          <summary className="cursor-pointer font-semibold">{t("financeScenariosTitle")}</summary>
                          <ul className="mt-1 space-y-1">
                            {assessment.finance.scenarios.map((scenario) => (
                              <li key={scenario.key}>
                                <span className="font-semibold">{scenario.label}</span>
                                {scenario.conditional ? ` · ${t("financeConditional")}` : ""} — {scenario.note}
                              </li>
                            ))}
                          </ul>
                        </details>
                      )}
                    </section>

                    {/* 4. Academic comparison */}
                    <section aria-labelledby={`acad-${row.universityId}`}>
                      <h4 id={`acad-${row.universityId}`} className="text-sm font-bold text-slate-900 dark:text-slate-100">
                        {t("sectionAcademic")}
                      </h4>
                      <div className="mt-2">
                        <AcademicComparisonList comparisons={assessment.academicComparisons} />
                      </div>
                    </section>

                    {/* 5. What this assessment does not know */}
                    <section aria-labelledby={`unk-${row.universityId}`}>
                      <h4 id={`unk-${row.universityId}`} className="flex items-center gap-2 text-sm font-bold text-slate-900 dark:text-slate-100">
                        <AlertTriangle className="h-4 w-4 text-amber-500" aria-hidden />
                        {t("sectionUnknowns")}
                      </h4>
                      {assessment.unknowns.length === 0 ? (
                        <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{t("noUnknowns")}</p>
                      ) : (
                        <ul className="mt-1 list-disc pl-4 text-xs text-slate-600 dark:text-slate-300">
                          {assessment.unknowns.slice(0, 8).map((unknown) => (
                            <li key={`${unknown.field}-${unknown.reason}`}>
                              {unknownFieldLabel(unknown.field, t)} — {unknownReasonLabel(unknown.reason, t)}
                            </li>
                          ))}
                        </ul>
                      )}
                      {assessment.evidence.length > 0 && (
                        <details className="mt-2 text-xs text-slate-600 dark:text-slate-300">
                          <summary className="cursor-pointer font-semibold">{t("sourcesTitle")}</summary>
                          <ul className="mt-1 space-y-1">
                            {assessment.evidence.map((item) => (
                              <li key={`${item.kind}-${item.label}`}>
                                {item.sourceUrl ? (
                                  <a
                                    className="font-semibold text-indigo-600 underline dark:text-indigo-300"
                                    href={item.sourceUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                  >
                                    {item.label}
                                  </a>
                                ) : (
                                  item.label
                                )}
                              </li>
                            ))}
                          </ul>
                        </details>
                      )}
                    </section>

                    <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500 dark:text-slate-400">
                      {assessment.programme.officialProgramUrl && (
                        <a
                          className="inline-flex items-center gap-1 font-semibold text-indigo-600 underline dark:text-indigo-300"
                          href={assessment.programme.officialProgramUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          <ExternalLink className="h-3 w-3" aria-hidden />
                          {t("officialPage")}
                        </a>
                      )}
                      <span>{t("versionLine", { version: assessment.scoringVersion })}</span>
                    </div>
                    <TwinStrategyCard profileId={profileId} />
                  </div>
                )}
              </article>
            );
          })}
        </section>
      ))}

      <details className="rounded-overlay border border-slate-200 bg-white p-3 text-xs text-slate-600 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300">
        <summary className="cursor-pointer text-sm font-semibold">{t("methodologyNoteLabel")}</summary>
        <p className="mt-2">{t("methodologyBody")}</p>
      </details>
    </div>
  );
}


