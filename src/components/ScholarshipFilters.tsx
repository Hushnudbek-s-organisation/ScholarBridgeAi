"use client";

import React from "react";
import { useTranslations } from "next-intl";
import { RotateCcw } from "lucide-react";
import { useLocaleContext } from "@/i18n/LocaleProvider";
import { countryTranslationKey } from "@/lib/countries";
import { localizeCoverageType, localizeDegreeLevel } from "@/lib/catalogLocalizer";
import {
  SCHOLARSHIP_BASIS_OPTIONS,
  SCHOLARSHIP_CHANCE_OPTIONS,
  SCHOLARSHIP_COVERAGE_OPTIONS,
  SCHOLARSHIP_DEGREE_OPTIONS,
  SCHOLARSHIP_FIT_OPTIONS,
  SCHOLARSHIP_STATUS_OPTIONS,
  scholarshipActiveFilterCount,
  scholarshipStatusMessageKey,
  type ScholarshipFacets,
  type ScholarshipFilters,
} from "@/lib/scholarshipFilters";
import { Button } from "@/components/ui/Button";

/**
 * Scholarship filters — the row of dropdowns that sits in the catalogue
 * toolbar, next to the search box ("All host countries", "All coverage
 * levels", …). No separate side panel: the catalogue is one column of cards,
 * and every control stays where the student already looks.
 *
 * Only dimensions this catalogue really answers are offered (host country,
 * degree level, funding type, application status, award basis). Each option
 * carries its result count from the server's facet payload, so a dropdown
 * states what it will return before it is used, and a value the data does not
 * publish never appears. Field of study is deliberately absent — almost every
 * row says "All Majors", so it would be decoration.
 *
 * Two dimensions are personal and therefore only appear once a profile is
 * loaded (`hasProfile`):
 *   • **Chance** — do the requirements the award itself publishes match this
 *     student's GPA / IELTS / degree level? It is an evidence check on
 *     published gates, NOT an admission probability (see `chancing.ts`).
 *   • **Fit** — the same match score the cards show, banded.
 *
 * The panel is presentational: the hub owns the state and passes it down.
 */

export interface ScholarshipFiltersPanelProps {
  filters: ScholarshipFilters;
  facets: ScholarshipFacets;
  onChange: (next: ScholarshipFilters) => void;
  onReset: () => void;
  /** Personal dimensions (chance, fit) are only answerable with a profile. */
  hasProfile?: boolean;
  /** Keeps desktop IDs stable while allowing a separately mounted phone sheet. */
  idPrefix?: string;
}

function Field({
  label,
  htmlFor,
  children,
}: {
  label: string;
  htmlFor: string;
  children: React.ReactNode;
}) {
  return (
    <div className="min-w-0">
      <label
        htmlFor={htmlFor}
        className="mb-1 block break-words text-sm font-bold uppercase tracking-wide text-slate-500"
      >
        {label}
      </label>
      {children}
    </div>
  );
}

/**
 * Explicit label keys — the panel never builds a translation key by string join.
 *
 * The filter is a PUBLISHED-GATE status, not a chance: `meets` means every
 * minimum the award publishes could be checked and was met, `unknown` means at
 * least one minimum could not be checked with the saved profile. It is neither
 * eligibility for the award nor a probability of being awarded it.
 */
const REQUIREMENT_STATUS_LABEL_KEY: Record<string, string> = {
  meets: "filterRequirementMet",
  below: "filterRequirementNotMet",
  unknown: "filterRequirementUnknown",
};

const FIT_LABEL_KEY: Record<string, string> = {
  strong: "filterFitStrong",
  good: "filterFitGood",
  low: "filterFitLow",
};

const SELECT_CLASS =
  "min-h-11 w-full rounded-surface border border-slate-200 bg-white px-2 py-2 text-xs font-medium text-slate-800 focus:ring-2 focus:ring-amber-500 focus:outline-none sm:text-sm";

export function ScholarshipFiltersPanel({
  filters,
  facets,
  onChange,
  onReset,
  hasProfile = false,
  idPrefix = "scholarship-filter",
}: ScholarshipFiltersPanelProps) {
  const t = useTranslations("scholarshipHub");
  const tCountry = useTranslations("countryNames");
  const { locale } = useLocaleContext();
  const activeCount = scholarshipActiveFilterCount(filters);

  const countryLabel = (value: string): string => {
    const key = countryTranslationKey(value);
    if (!key) return value;
    try {
      return tCountry(key);
    } catch {
      return value;
    }
  };

  // The selects are single-choice in the UI ("All" = no filter). The filter
  // model stays multi-valued so the API and deep links keep working if a
  // second value is ever needed.
  const setSingle = (
    key: "degrees" | "coverages" | "statuses" | "basis" | "chance" | "fit",
    value: string,
  ) => {
    onChange({ ...filters, [key]: value === "All" ? [] : [value] });
  };

  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
      {/* ---- Host country */}
      <Field label={t("filterCountry")} htmlFor={`${idPrefix}-country}`}>
        <select
          id={`${idPrefix}-country}`}
          value={filters.country}
          onChange={(event) => onChange({ ...filters, country: event.target.value })}
          aria-label={t("allCountries")}
          className={SELECT_CLASS}
        >
          <option value="All">{t("allCountries")}</option>
          {/* A deep link can focus a country the facet list does not carry
              (a university page): keep it selectable instead of blank. */}
          {filters.country !== "All" && !facets.countries.some((entry) => entry.value === filters.country) && (
            <option value={filters.country}>{countryLabel(filters.country)}</option>
          )}
          {facets.countries.map((entry) => (
            <option key={entry.value} value={entry.value}>
              {countryLabel(entry.value)} ({entry.count})
            </option>
          ))}
        </select>
      </Field>

      {/* ---- Degree level */}
      <Field label={t("filterDegree")} htmlFor={`${idPrefix}-degree}`}>
        <select
          id={`${idPrefix}-degree}`}
          value={filters.degrees[0] ?? "All"}
          onChange={(event) => setSingle("degrees", event.target.value)}
          className={SELECT_CLASS}
        >
          <option value="All">{t("allDegrees")}</option>
          {SCHOLARSHIP_DEGREE_OPTIONS.map((degree) => (
            <option key={degree} value={degree}>
              {localizeDegreeLevel(degree, locale) || degree} ({facets.degrees[degree] ?? 0})
            </option>
          ))}
        </select>
      </Field>

      {/* ---- Funding (coverage) type */}
      <Field label={t("filterCoverage")} htmlFor={`${idPrefix}-coverage}`}>
        <select
          id={`${idPrefix}-coverage}`}
          value={filters.coverages[0] ?? "All"}
          onChange={(event) => setSingle("coverages", event.target.value)}
          aria-label={t("allCoverage")}
          className={SELECT_CLASS}
        >
          <option value="All">{t("allCoverage")}</option>
          {SCHOLARSHIP_COVERAGE_OPTIONS.map((coverage) => (
            <option key={coverage} value={coverage}>
              {localizeCoverageType(coverage, locale) || coverage} ({facets.coverages[coverage] ?? 0})
            </option>
          ))}
        </select>
      </Field>

      {/* ---- Application status */}
      <Field label={t("filterStatus")} htmlFor={`${idPrefix}-status}`}>
        <select
          id={`${idPrefix}-status}`}
          value={filters.statuses[0] ?? "All"}
          onChange={(event) => setSingle("statuses", event.target.value)}
          className={SELECT_CLASS}
        >
          <option value="All">{t("allStatuses")}</option>
          {SCHOLARSHIP_STATUS_OPTIONS.map((status) => (
            <option key={status} value={status}>
              {t(scholarshipStatusMessageKey(status))} ({facets.statuses[status] ?? 0})
            </option>
          ))}
        </select>
      </Field>

      {/* ---- Award basis */}
      <Field label={t("filterBasis")} htmlFor={`${idPrefix}-basis}`}>
        <select
          id={`${idPrefix}-basis}`}
          value={filters.basis[0] ?? "All"}
          onChange={(event) => setSingle("basis", event.target.value)}
          className={SELECT_CLASS}
        >
          <option value="All">{t("allBasis")}</option>
          {SCHOLARSHIP_BASIS_OPTIONS.map((basis) => (
            <option key={basis} value={basis}>
              {basis === "merit" ? t("filterBasisMerit") : t("filterBasisNeed")} ({facets.basis[basis] ?? 0})
            </option>
          ))}
        </select>
      </Field>

      {/* ---- Requirement status: the award's published minimums vs the saved
              profile. A gate that cannot be checked is `unknown`, never a pass. */}
      {hasProfile && (
        <Field label={t("filterRequirementStatus")} htmlFor={`${idPrefix}-chance-status`}>
          <select
            id={`${idPrefix}-chance-status`}
            value={filters.chance[0] ?? "All"}
            onChange={(event) => setSingle("chance", event.target.value)}
            aria-label={t("allRequirementStatus")}
            className={SELECT_CLASS}
          >
            <option value="All">{t("allRequirementStatus")}</option>
            {SCHOLARSHIP_CHANCE_OPTIONS.map((bucket) => (
              <option key={bucket} value={bucket}>
                {t(REQUIREMENT_STATUS_LABEL_KEY[bucket] ?? bucket)} ({facets.chance[bucket] ?? 0})
              </option>
            ))}
          </select>
          <p className="mt-1 text-xs leading-snug text-slate-500 dark:text-slate-400">
            {t("requirementStatusNote")}
          </p>
        </Field>
      )}

      {/* ---- Fit: the card's match score, banded (personal) */}
      {hasProfile && (
        <Field label={t("filterFit")} htmlFor={`${idPrefix}-fit}`}>
          <select
            id={`${idPrefix}-fit}`}
            value={filters.fit[0] ?? "All"}
            onChange={(event) => setSingle("fit", event.target.value)}
            aria-label={t("allFit")}
            className={SELECT_CLASS}
          >
            <option value="All">{t("allFit")}</option>
            {SCHOLARSHIP_FIT_OPTIONS.map((bucket) => (
              <option key={bucket} value={bucket}>
                {t(FIT_LABEL_KEY[bucket] ?? bucket)} ({facets.fit[bucket] ?? 0})
              </option>
            ))}
          </select>
        </Field>
      )}

      {/* Reset lives at the end of the row and only appears when it does
          something — a permanently disabled "Clear" is noise. */}
      {activeCount > 0 && (
        <div className="col-span-full flex justify-end">
          <Button variant="unstyled"
            type="button"
            onClick={onReset}
            className="inline-flex min-h-11 items-center gap-1.5 rounded-surface border border-slate-200 bg-slate-50 px-3 text-xs font-bold text-slate-700 hover:border-indigo-300 hover:text-indigo-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-500"
          >
            <RotateCcw className="h-3.5 w-3.5" aria-hidden />
            <span className="min-w-0 break-words">{t("filtersClear")}</span>
            <span className="rounded-full bg-indigo-600 px-1.5 py-0.5 text-xs font-bold text-white">
              {activeCount}
            </span>
          </Button>
        </div>
      )}
    </div>
  );
}
