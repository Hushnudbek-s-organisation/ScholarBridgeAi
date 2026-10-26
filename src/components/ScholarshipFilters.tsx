"use client";

import React from "react";
import { useTranslations } from "next-intl";
import { Check, ChevronDown, RotateCcw, SlidersHorizontal, X } from "lucide-react";
import { useLocaleContext } from "@/i18n/LocaleProvider";
import { countryTranslationKey } from "@/lib/countries";
import { localizeCoverageType, localizeDegreeLevel } from "@/lib/catalogLocalizer";
import {
  SCHOLARSHIP_BASIS_OPTIONS,
  SCHOLARSHIP_COVERAGE_OPTIONS,
  SCHOLARSHIP_DEGREE_OPTIONS,
  SCHOLARSHIP_STATUS_OPTIONS,
  scholarshipActiveFilterCount,
  type ScholarshipFacets,
  type ScholarshipFilters,
} from "@/lib/scholarshipFilters";

/**
 * Scholarship filters — a faceted side panel.
 *
 * Every count comes from the server's facet payload, so a checkbox states what
 * it will return BEFORE it is ticked, and a value the catalogue does not
 * publish never appears. Only dimensions this catalogue really answers are
 * offered: host country, degree level, funding type, application status and
 * award basis (merit / need). Field-of-study was deliberately left out —
 * almost every row says "All Majors", so a field filter would be decoration.
 *
 * The panel is presentational: the hub owns the state, so the desktop sidebar
 * and the phone sheet render exactly the same controls.
 */

export interface ScholarshipFiltersPanelProps {
  filters: ScholarshipFilters;
  facets: ScholarshipFacets;
  onChange: (next: ScholarshipFilters) => void;
  onReset: () => void;
  /** Phone sheet only — rendered as a dismiss control inside the panel. */
  onClose?: () => void;
  /** Live total for the phone sheet's confirm button. */
  resultCount?: number;
}

function FilterSection({
  title,
  children,
  count,
}: {
  title: string;
  children: React.ReactNode;
  count?: number;
}) {
  return (
    <details open className="group border-t border-slate-200 py-2 first:border-t-0 first:pt-0">
      <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-2 rounded-lg px-1 text-[11px] font-bold uppercase tracking-wide text-slate-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-500 [&::-webkit-details-marker]:hidden">
        <span className="min-w-0 break-words">
          {title}
          {typeof count === "number" && count > 0 && (
            <span className="ml-1.5 rounded-full bg-indigo-50 px-1.5 py-0.5 text-[10px] font-extrabold text-indigo-700">
              {count}
            </span>
          )}
        </span>
        <ChevronDown className="h-3.5 w-3.5 shrink-0 transition-transform group-open:rotate-180" aria-hidden />
      </summary>
      <div className="mt-1 space-y-0.5 pb-1">{children}</div>
    </details>
  );
}

function OptionRow({
  label,
  count,
  checked,
  onToggle,
}: {
  label: string;
  count: number;
  checked: boolean;
  onToggle: () => void;
}) {
  return (
    <label
      className={`flex min-h-11 cursor-pointer items-center gap-2 rounded-lg px-1.5 py-1 text-xs transition-colors ${
        checked ? "bg-indigo-50 font-bold text-indigo-900" : "font-medium text-slate-700 hover:bg-slate-50"
      } ${count === 0 && !checked ? "opacity-60" : ""}`}
    >
      <input
        type="checkbox"
        checked={checked}
        onChange={onToggle}
        className="h-4 w-4 shrink-0 rounded border-slate-300 text-indigo-600 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-500"
      />
      <span className="min-w-0 flex-1 break-words">{label}</span>
      <span className="shrink-0 tabular-nums text-[10px] font-bold text-slate-400">{count}</span>
    </label>
  );
}

export function ScholarshipFiltersPanel({
  filters,
  facets,
  onChange,
  onReset,
  onClose,
  resultCount,
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

  const toggleMulti = (key: "degrees" | "coverages" | "statuses" | "basis", value: string) => {
    const current = filters[key];
    const next = current.includes(value)
      ? current.filter((item) => item !== value)
      : [...current, value];
    onChange({ ...filters, [key]: next });
  };

  const statusLabels: Record<string, string> = {
    open: t("filterStatusOpen"),
    upcoming: t("filterStatusUpcoming"),
    rolling: t("filterStatusRolling"),
    closed: t("filterStatusClosed"),
    not_announced: t("filterStatusNotAnnounced"),
    unknown: t("filterStatusUnknown"),
  };

  const basisLabels: Record<string, string> = {
    merit: t("filterBasisMerit"),
    need: t("filterBasisNeed"),
  };

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-3 shadow-xs sm:p-4">
      <div className="flex items-center justify-between gap-2 pb-2">
        <h3 className="flex min-w-0 items-center gap-1.5 text-sm font-extrabold text-slate-900">
          <SlidersHorizontal className="h-4 w-4 shrink-0 text-indigo-600" aria-hidden />
          <span className="min-w-0 break-words">{t("filtersTitle")}</span>
          {activeCount > 0 && (
            <span className="shrink-0 rounded-full bg-indigo-600 px-1.5 py-0.5 text-[10px] font-bold text-white">
              {activeCount}
            </span>
          )}
        </h3>
        <div className="flex shrink-0 items-center gap-1">
          {activeCount > 0 && (
            <button
              type="button"
              onClick={onReset}
              className="inline-flex min-h-11 items-center gap-1 rounded-lg px-2 text-[11px] font-bold text-indigo-700 hover:bg-indigo-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-500"
            >
              <RotateCcw className="h-3.5 w-3.5" aria-hidden />
              <span className="min-w-0 break-words">{t("filtersClear")}</span>
            </button>
          )}
          {onClose && (
            <button
              type="button"
              onClick={onClose}
              aria-label={t("filtersClose")}
              className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-500 lg:hidden"
            >
              <X className="h-4 w-4" aria-hidden />
            </button>
          )}
        </div>
      </div>

      {/* ---- Host country (one choice — a country is an identity, not a tag) */}
      <FilterSection title={t("filterCountry")} count={filters.country !== "All" ? 1 : 0}>
        <select
          value={filters.country}
          onChange={(event) => onChange({ ...filters, country: event.target.value })}
          aria-label={t("allCountries")}
          className="min-h-11 w-full rounded-xl border border-slate-200 bg-white px-2 py-2 text-xs font-medium text-slate-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-500"
        >
          <option value="All">{t("allCountries")}</option>
          {/* The focused country can be a name the facet list does not carry
              (a deep link from a university page) — keep it selectable. */}
          {filters.country !== "All" && !facets.countries.some((entry) => entry.value === filters.country) && (
            <option value={filters.country}>{countryLabel(filters.country)}</option>
          )}
          {facets.countries.map((entry) => (
            <option key={entry.value} value={entry.value}>
              {countryLabel(entry.value)} ({entry.count})
            </option>
          ))}
        </select>
      </FilterSection>

      {/* ---- Degree level */}
      <FilterSection title={t("filterDegree")} count={filters.degrees.length}>
        {SCHOLARSHIP_DEGREE_OPTIONS.map((degree) => (
          <OptionRow
            key={degree}
            label={localizeDegreeLevel(degree, locale) || degree}
            count={facets.degrees[degree] ?? 0}
            checked={filters.degrees.includes(degree)}
            onToggle={() => toggleMulti("degrees", degree)}
          />
        ))}
      </FilterSection>

      {/* ---- Funding type */}
      <FilterSection title={t("filterCoverage")} count={filters.coverages.length}>
        <div role="group" aria-label={t("allCoverage")} className="space-y-0.5">
          {SCHOLARSHIP_COVERAGE_OPTIONS.map((coverage) => (
            <OptionRow
              key={coverage}
              label={localizeCoverageType(coverage, locale) || coverage}
              count={facets.coverages[coverage] ?? 0}
              checked={filters.coverages.includes(coverage)}
              onToggle={() => toggleMulti("coverages", coverage)}
            />
          ))}
        </div>
      </FilterSection>

      {/* ---- Application status */}
      <FilterSection title={t("filterStatus")} count={filters.statuses.length}>
        {SCHOLARSHIP_STATUS_OPTIONS.map((status) => (
          <OptionRow
            key={status}
            label={statusLabels[status] ?? status}
            count={facets.statuses[status] ?? 0}
            checked={filters.statuses.includes(status)}
            onToggle={() => toggleMulti("statuses", status)}
          />
        ))}
      </FilterSection>

      {/* ---- Award basis */}
      {/* ---- Award basis (merit and need can be asked for together) */}
      <FilterSection title={t("filterBasis")} count={filters.basis.length}>
        <div role="group" aria-label={t("filterBasis")} className="space-y-0.5">
          {SCHOLARSHIP_BASIS_OPTIONS.map((basis) => (
            <OptionRow
              key={basis}
              label={basisLabels[basis] ?? basis}
              count={facets.basis[basis] ?? 0}
              checked={filters.basis.includes(basis)}
              onToggle={() => toggleMulti("basis", basis)}
            />
          ))}
        </div>
      </FilterSection>

      {onClose && (
        <button
          type="button"
          onClick={onClose}
          className="mt-3 inline-flex min-h-12 w-full items-center justify-center gap-1.5 rounded-xl bg-indigo-600 px-3 text-sm font-bold text-white hover:bg-indigo-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-500 lg:hidden"
        >
          <Check className="h-4 w-4" aria-hidden />
          <span className="min-w-0 break-words">
            {typeof resultCount === "number" ? t("filtersShowResults", { count: resultCount }) : t("filtersDone")}
          </span>
        </button>
      )}
    </div>
  );
}
