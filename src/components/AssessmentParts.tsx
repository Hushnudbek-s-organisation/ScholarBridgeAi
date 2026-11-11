"use client";

/**
 * Shared presentational pieces for the canonical programme assessment.
 *
 * WHY THIS FILE EXISTS
 * --------------------
 * The assessment is computed once, on the server, by `src/lib/assessment`. This
 * file only RENDERS it: no formula, weight, threshold or rounding rule lives
 * here. Every surface (the Outlook screen, the recommendation studio) imports
 * these pieces, so the same numbers are described with the same words and the
 * same honesty rules everywhere.
 *
 * The honesty rules encoded below:
 *   - a fit is a point ONLY when every active factor is known; otherwise it is
 *     an interval with a separate data-coverage line (a lone 100 next to an
 *     unknown factor reads as "perfect", which this project refuses to imply);
 *   - `null` never becomes `0` or `0%` — an unknown is printed as unknown;
 *   - a `must` failure is a PREFERENCE result, never an eligibility failure;
 *   - eligibility is reported per documented requirement, never averaged;
 *   - an academic comparison that has no published statistic is stated as such
 *     and NEVER suppresses the rest of the assessment;
 *   - admission probability is always explicitly absent.
 */

import React from "react";
import { AlertTriangle, CheckCircle2, ExternalLink, HelpCircle } from "lucide-react";
import { useTranslations } from "next-intl";

// ---------------------------------------------------------------------------
// Response shapes (only the fields these components render)
// ---------------------------------------------------------------------------

export type FitPoint = {
  pointFit: number | null;
  knownFit: number | null;
  coverage: number | null;
  lowerBound: number | null;
  upperBound: number | null;
  weightedSimilarity: number;
  totalWeight: number;
  knownWeight: number;
  reason: string;
  missingAxes: string[];
  breakdown?: {
    axis: string;
    mode: string;
    weight: number;
    similarity: number | null;
    state: string;
    note: string | null;
  }[];
};

export type PreferenceFilter = { axis: string; state: "pass" | "fail" | "unknown"; reason: string };

export type EligibilityCheck = {
  requirementId: string;
  label: string;
  status: "met" | "unmet" | "unknown" | "not_applicable";
  reason: string;
  unknownReason: string | null;
  note: string;
  userValue: string | null;
  requiredValue: string | null;
  sourceUrl: string | null;
  gap: { metric: string; current: number; required: number; delta: number } | null;
  children: EligibilityCheck[];
};

export type AcademicComparison = {
  metric: string;
  position: "below" | "within" | "above" | "unknown";
  reason: string | null;
  studentValue: number | null;
  p25: number | null;
  p50: number | null;
  p75: number | null;
  unit: string;
  statisticYear: string | null;
  statisticScope: { kind: string; label: string };
  population: string;
  sourceUrl: string | null;
  statement: string;
};

export type Assessment = {
  scoringVersion: string;
  assessedAt: string;
  context: { cycle: string | null; applicantCategory: string | null; degreeLevel: string | null };
  programme: {
    id: number;
    name: string;
    field: string | null;
    degreeLevel: string | null;
    language: string | null;
    country: string | null;
    universityName: string | null;
    officialProgramUrl: string | null;
  };
  preferenceFit: FitPoint;
  preferenceFilters: PreferenceFilter[];
  subjectRelation: {
    relation: string;
    similarity: number | null;
    heuristic: boolean;
    note: string;
    matchedInterest: string | null;
  };
  eligibility: {
    status: "met" | "unmet" | "unknown" | "not_applicable";
    requirementsDocumented: boolean;
    checks: EligibilityCheck[];
    counts: { met: number; unmet: number; unknown: number; notApplicable: number };
    unknownReasons: string[];
    gaps: { requirementId: string; label: string; text: string }[];
    limitations: string[];
  };
  finance: {
    annualTotalUsd: number | null;
    annualTotalLowerBoundUsd: number;
    confirmedFundingUsd: number | null;
    netAnnualCostUsd: number | null;
    fundingGapUsd: number | null;
    fundingGapRangeUsd: { lower: number; upper: number | null } | null;
    availableBudgetUsd: number | null;
    status: string;
    missingCostLines: string[];
    excludedFunding: { key: string; reason: string }[];
    scenarios: {
      key: string;
      label: string;
      conditional: boolean;
      netAnnualCostUsd: number | null;
      fundingGapUsd: number | null;
      note: string;
    }[];
    notes: string[];
  };
  academicComparisons: AcademicComparison[];
  admissionProbability: { value: null; reason: string };
  group: number;
  groupKey: "meets_requirements" | "needs_check" | "requirement_gaps" | "preference_mismatch";
  groupReasons: string[];
  unknowns: { field: string; reason: string }[];
  evidence: { kind: string; label: string; sourceUrl: string | null; note?: string | null }[];
  personalData: { recordedMetrics: string[] };
};

// ---------------------------------------------------------------------------
// Formatting (the ONLY place a value is rounded for display)
// ---------------------------------------------------------------------------

export function oneDecimal(value: number): string {
  return String(Math.round(value * 10) / 10);
}

export function money(value: number | null): string {
  if (value == null) return "—";
  return `$${Math.round(value).toLocaleString("en-US")}`;
}

/** `null` stays unknown: it is never printed as `0` or `0%`. */
export function scoreText(fit: FitPoint): string | null {
  if (fit.pointFit != null) return `${oneDecimal(fit.pointFit)}/100`;
  if (fit.lowerBound != null && fit.upperBound != null) {
    return `${oneDecimal(fit.lowerBound)}–${oneDecimal(fit.upperBound)}/100`;
  }
  return null;
}

export type FitDisplayState =
  /** No active preference at all → there is no number to show. */
  | "no_preferences"
  /** Every active factor is known → one number. */
  | "point"
  /** At least one active factor is unknown → an interval + coverage. */
  | "interval";

export function fitDisplayState(fit: FitPoint): FitDisplayState {
  if (fit.lowerBound == null || fit.upperBound == null) {
    return fit.totalWeight === 0 ? "no_preferences" : "no_preferences";
  }
  return fit.pointFit != null ? "point" : "interval";
}

// ---------------------------------------------------------------------------
// Lookups. Static switches instead of computed keys: a computed translation
// key can ship a missing message in one locale and only fail at render time.
// ---------------------------------------------------------------------------

type Translator = (key: string) => string;

export function fundingReasonLabel(reason: string, t: Translator): string {
  switch (reason) {
    case "loan":
    case "repayable_loan_not_a_reduction":
      return t("fundingReason_loan");
    case "reimbursement":
    case "reimbursement_cannot_pay_an_upfront_bill":
      return t("fundingReason_reimbursement");
    case "not_awarded_competitive_grant_is_a_scenario":
      return t("fundingReason_competitive");
    case "automatic_award_conditions_not_verified":
      return t("fundingReason_automatic");
    case "amount_unknown":
      return t("fundingReason_amountUnknown");
    case "not_combinable":
    case "not_combinable_alternative_selected":
      return t("fundingReason_notCombinable");
    default:
      return t("fundingReason_other");
  }
}

export function unknownFieldLabel(field: string, t: Translator): string {
  switch (field.split(".")[0]) {
    case "preferenceFit":
      return t("sectionFit");
    case "subjectRelation":
      return t("axis_subject");
    case "eligibility":
      return t("sectionEligibility");
    case "finance":
      return t("sectionFinance");
    case "academicComparison":
      return t("sectionAcademic");
    case "context":
      return t("assessedScopeLabel");
    default:
      return t("sectionUnknowns");
  }
}

export function unknownReasonLabel(reason: string, t: Translator): string {
  switch (reason) {
    case "missing_user_data":
      return t("reason_missing_user_data");
    case "missing_requirement":
      return t("reason_missing_requirement");
    case "unverified_waiver":
      return t("reason_unverified_waiver");
    case "incomparable_scale":
      return t("reason_incomparable_scale");
    case "stale_or_wrong_cycle":
      return t("reason_stale_or_wrong_cycle");
    case "conflicting_sources":
      return t("reason_conflicting_sources");
    case "no_documented_requirements":
      return t("reason_no_documented_requirements");
    case "preference_factor_unknown":
      return t("reason_preference_factor_unknown");
    case "subject_relation_unknown":
    case "subject_relation_needs_review":
      return t("reason_subject_relation_unknown");
    case "cost_incomplete":
    case "cost_line_unknown":
      return t("reason_cost_unknown");
    case "budget_not_stated":
      return t("reason_budget_not_stated");
    case "cycle_not_stated":
      return t("reason_cycle_not_stated");
    case "applicant_category_not_stated":
      return t("reason_applicant_category_not_stated");
    case "no_active_preferences":
      return t("reason_no_active_preferences");
    case "no_published_statistic":
      return t("reason_no_published_statistic");
    case "scope_mismatch":
      return t("reason_scope_mismatch");
    default:
      return t("unknownValue");
  }
}

export function financeStatusLabel(status: string, t: Translator): string {
  switch (status) {
    case "budget_not_stated":
      return t("financeStatus_budget_not_stated");
    case "cost_unknown":
      return t("financeStatus_cost_unknown");
    case "gap":
      return t("financeStatus_gap");
    case "covered":
      return t("financeStatus_covered");
    default:
      return t("financeStatus_unknown");
  }
}

export function academicPositionLabel(position: AcademicComparison["position"], t: Translator): string {
  switch (position) {
    case "below":
      return t("position_below");
    case "within":
      return t("position_within");
    case "above":
      return t("position_above");
    default:
      return t("position_unknown");
  }
}

export function academicMetricLabel(metric: string, t: Translator): string {
  switch (metric) {
    case "gpa":
      return t("metric_gpa");
    case "sat":
      return t("metric_sat");
    case "act":
      return t("metric_act");
    case "ielts":
      return t("metric_ielts");
    case "toefl":
      return t("metric_toefl");
    default:
      return metric;
  }
}

export function axisLabel(axis: string, t: Translator): string {
  switch (axis) {
    case "subject":
      return t("axis_subject");
    case "country":
      return t("axis_country");
    case "teaching_language":
      return t("axis_teaching_language");
    case "study_load":
      return t("axis_study_load");
    case "delivery_mode":
      return t("axis_delivery_mode");
    default:
      return axis;
  }
}

export function modeLabel(mode: string, t: Translator): string {
  switch (mode) {
    case "must":
      return t("mode_must");
    case "prefer":
      return t("mode_prefer");
    case "no_preference":
      return t("mode_no_preference");
    default:
      return mode;
  }
}

export function eligibilityStatusLabel(
  status: Assessment["eligibility"]["status"] | EligibilityCheck["status"],
  t: Translator
): string {
  switch (status) {
    case "met":
      return t("eligibility_met");
    case "unmet":
      return t("eligibility_unmet");
    case "not_applicable":
      return t("eligibility_not_applicable");
    default:
      return t("eligibility_unknown");
  }
}

// ---------------------------------------------------------------------------
// Components
// ---------------------------------------------------------------------------

export function FitBadge({ fit, label }: { fit: FitPoint; label: string }) {
  const t = useTranslations("chancing");
  const text = scoreText(fit);
  if (text == null) {
    return (
      <span className="rounded-full border border-slate-200 bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300">
        {label}: {t("fitNotScored")}
      </span>
    );
  }
  return (
    <span className="rounded-full border border-indigo-200 bg-indigo-50 px-2 py-0.5 text-xs font-semibold text-indigo-800 dark:border-indigo-800 dark:bg-indigo-950/60 dark:text-indigo-200">
      {label}: {text}
    </span>
  );
}

/**
 * The fit number and its coverage, side by side.
 *
 * The interval is shown whenever ANY active factor is unknown — a lone 100 next
 * to an unknown factor reads as "perfect", which is exactly what this project
 * refuses to imply.
 */
export function FitSummary({ fit }: { fit: FitPoint }) {
  const t = useTranslations("chancing");
  const text = scoreText(fit);
  if (text == null) {
    return <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{t("fitNoActivePreferences")}</p>;
  }
  const isPoint = fit.pointFit != null;
  return (
    <div className="mt-1 space-y-1">
      <p className="text-lg font-bold text-slate-900 dark:text-slate-100">
        {t("fitLabel")}: {text}
      </p>
      <p className="text-xs text-slate-600 dark:text-slate-300">
        {/* An uncomputed coverage prints nothing rather than a misleading 0%. */}
        {fit.coverage == null ? null : `${t("coverageLine", { pct: Math.round(fit.coverage) })}`}
        {fit.missingAxes.length > 0
          ? `${fit.coverage == null ? "" : " · "}${t("missingAxes", { axes: fit.missingAxes.map((axis) => axisLabel(axis, t)).join(", ") })}`
          : ""}
      </p>
      {!isPoint && fit.knownFit != null && (
        <p className="text-xs text-slate-500 dark:text-slate-400">{t("knownFactorsOnly", { fit: oneDecimal(fit.knownFit) })}</p>
      )}
      <p className="text-xs text-slate-500 dark:text-slate-400">{t("fitNotProbability")}</p>
    </div>
  );
}

/** Compact one-line fit for a list row: the number/interval plus coverage. */
export function FitInline({ fit }: { fit: FitPoint }) {
  const t = useTranslations("chancing");
  const text = scoreText(fit);
  if (text == null) {
    return <span className="text-xs text-slate-500 dark:text-slate-400">{t("fitNoActivePreferences")}</span>;
  }
  return (
    <span className="inline-flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
      <span className="text-sm font-semibold text-slate-900 dark:text-slate-100">
        {t("fitLabel")}: {text}
      </span>
      {fit.coverage != null && (
        <span className="text-xs text-slate-500 dark:text-slate-400">{t("coverageLine", { pct: Math.round(fit.coverage) })}</span>
      )}
    </span>
  );
}

/**
 * `must` filter results — labelled as preferences, not as eligibility.
 *
 * A failing `must` choice is a preference mismatch. It says nothing about
 * whether the student meets the programme's documented requirements, and it is
 * never counted as one.
 */
export function PreferenceFilterList({ filters }: { filters: PreferenceFilter[] }) {
  const t = useTranslations("chancing");
  if (filters.length === 0) return null;
  return (
    <ul className="mt-1.5 space-y-1 text-xs" aria-label={t("mustFiltersLabel")}>
      {filters.map((filter) => (
        <li key={filter.axis} className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
          <span className="font-semibold text-slate-700 dark:text-slate-200">{axisLabel(filter.axis, t)}</span>
          <span
            className={
              filter.state === "pass"
                ? "font-semibold text-emerald-700 dark:text-emerald-300"
                : filter.state === "fail"
                  ? "font-semibold text-rose-700 dark:text-rose-300"
                  : "font-semibold text-amber-700 dark:text-amber-300"
            }
          >
            {filter.state === "pass" ? t("mustState_pass") : filter.state === "fail" ? t("mustState_fail") : t("mustState_unknown")}
          </span>
          <span className="text-slate-500 dark:text-slate-400">{filter.reason}</span>
        </li>
      ))}
    </ul>
  );
}

export function EligibilityBadge({ status }: { status: Assessment["eligibility"]["status"] }) {
  const t = useTranslations("chancing");
  const tone =
    status === "met"
      ? "border-emerald-200 bg-emerald-50 text-emerald-800"
      : status === "unmet"
        ? "border-rose-200 bg-rose-50 text-rose-800"
        : "border-amber-200 bg-amber-50 text-amber-900";
  const Icon = status === "met" ? CheckCircle2 : status === "unmet" ? AlertTriangle : HelpCircle;
  return (
    <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-semibold ${tone}`}>
      <Icon className="h-3 w-3" aria-hidden />
      {eligibilityStatusLabel(status, t)}
    </span>
  );
}

/** The ONE line that summarises documented requirements, plus the main reason. */
export function EligibilitySummaryLine({ assessment }: { assessment: Assessment }) {
  const t = useTranslations("chancing");
  if (!assessment.eligibility.requirementsDocumented) {
    return (
      <p className="text-xs text-amber-700 dark:text-amber-300">{t("eligibilityUndocumented")}</p>
    );
  }
  const firstGap = assessment.eligibility.gaps[0];
  const counts = t("eligibilityCounts", {
    met: assessment.eligibility.counts.met,
    unmet: assessment.eligibility.counts.unmet,
    unknown: assessment.eligibility.counts.unknown,
  });
  return (
    <div className="space-y-0.5">
      <p className="text-xs text-slate-600 dark:text-slate-300">{counts}</p>
      {firstGap ? <p className="text-xs font-semibold text-rose-700 dark:text-rose-300">{firstGap.text}</p> : null}
    </div>
  );
}

export function CheckRow({ check }: { check: EligibilityCheck }) {
  const t = useTranslations("chancing");
  const tone =
    check.status === "met"
      ? "text-emerald-700 dark:text-emerald-300"
      : check.status === "unmet"
        ? "text-rose-700 dark:text-rose-300"
        : check.status === "not_applicable"
          ? "text-slate-400"
          : "text-amber-700 dark:text-amber-300";
  return (
    <li className="rounded-control border border-slate-200 p-2 text-xs dark:border-slate-700">
      <p className="flex flex-wrap items-center gap-2">
        <span className="font-semibold text-slate-800 dark:text-slate-100">{check.label}</span>
        <span className={`font-semibold ${tone}`}>{eligibilityStatusLabel(check.status, t)}</span>
        {check.userValue != null || check.requiredValue != null ? (
          <span className="text-slate-500 dark:text-slate-400">
            {check.userValue ?? "—"} / {check.requiredValue ?? "—"}
          </span>
        ) : null}
        {check.sourceUrl && (
          <a
            className="inline-flex items-center gap-1 text-indigo-600 underline dark:text-indigo-300"
            href={check.sourceUrl}
            target="_blank"
            rel="noopener noreferrer"
          >
            <ExternalLink className="h-3 w-3" aria-hidden />
            {t("sourceLink")}
          </a>
        )}
      </p>
      <p className="mt-0.5 text-slate-600 dark:text-slate-300">{check.note}</p>
      {check.children.length > 0 && (
        <ul className="mt-1 space-y-1 border-l border-slate-200 pl-3 dark:border-slate-700">
          {check.children.map((child) => (
            <CheckRow key={`${check.requirementId}-${child.requirementId}`} check={child} />
          ))}
        </ul>
      )}
    </li>
  );
}

/**
 * Academic comparison, rendered WITHOUT ever hiding the rest of the assessment.
 *
 * No published statistic → one neutral sentence. A comparison with an unknown
 * position says "not comparable yet" and says why; it is never a 0 and never a
 * failure.
 */
export function AcademicComparisonList({ comparisons }: { comparisons: AcademicComparison[] }) {
  const t = useTranslations("chancing");
  if (comparisons.length === 0) {
    return <p className="text-xs text-slate-500 dark:text-slate-400">{t("academicNoStatistics")}</p>;
  }
  return (
    <ul className="space-y-2 text-xs">
      {comparisons.map((comparison) => (
        <li key={comparison.metric} className="rounded-control border border-slate-200 p-2 dark:border-slate-700">
          <p className="font-semibold text-slate-800 dark:text-slate-100">
            {academicMetricLabel(comparison.metric, t)} · {academicPositionLabel(comparison.position, t)}
          </p>
          <p className="text-slate-600 dark:text-slate-300">{comparison.statement}</p>
          <p className="mt-1 text-slate-500 dark:text-slate-400">
            {t("academicScopeLine", {
              year: comparison.statisticYear ?? t("notStated"),
              scope: comparison.statisticScope.label,
              population: comparison.population,
            })}
          </p>
          {comparison.sourceUrl && (
            <a
              className="mt-1 inline-flex items-center gap-1 font-semibold text-indigo-600 underline dark:text-indigo-300"
              href={comparison.sourceUrl}
              target="_blank"
              rel="noopener noreferrer"
            >
              <ExternalLink className="h-3 w-3" aria-hidden />
              {t("sourceLink")}
            </a>
          )}
        </li>
      ))}
    </ul>
  );
}

/**
 * Cost and funding, in one compact block.
 *
 * A competitive grant is a SCENARIO and is never subtracted from the bill; when
 * the total is unknown the line says "unknown (at least X)" instead of printing
 * a number that looks complete.
 */
export function FinanceBlock({ finance }: { finance: Assessment["finance"] }) {
  const t = useTranslations("chancing");
  return (
    <div className="space-y-1">
      <dl className="grid grid-cols-2 gap-2 text-xs">
        <div>
          <dt className="text-slate-500 dark:text-slate-400">{t("financeTotal")}</dt>
          <dd className="font-semibold text-slate-800 dark:text-slate-100">
            {finance.annualTotalUsd == null
              ? t("financeUnknownTotal", { lower: money(finance.annualTotalLowerBoundUsd) })
              : money(finance.annualTotalUsd)}
          </dd>
        </div>
        <div>
          <dt className="text-slate-500 dark:text-slate-400">{t("financeGap")}</dt>
          <dd className="font-semibold text-slate-800 dark:text-slate-100">
            {finance.fundingGapUsd != null
              ? money(finance.fundingGapUsd)
              : finance.fundingGapRangeUsd
                ? t("financeGapRange", {
                    lower: money(finance.fundingGapRangeUsd.lower),
                    upper: finance.fundingGapRangeUsd.upper == null ? t("notStated") : money(finance.fundingGapRangeUsd.upper),
                  })
                : t("unknownValue")}
          </dd>
        </div>
      </dl>
      <p className="text-xs text-slate-500 dark:text-slate-400">{financeStatusLabel(finance.status, t)}</p>
    </div>
  );
}

/** The explicit "no probability" statement. Never a blank space. */
export function AdmissionProbabilityNote() {
  const t = useTranslations("chancing");
  return <p className="text-xs leading-relaxed text-slate-500 dark:text-slate-400">{t("probabilityNotProvided")}</p>;
}
