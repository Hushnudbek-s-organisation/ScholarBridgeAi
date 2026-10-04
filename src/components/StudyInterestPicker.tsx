"use client";

import React, { useId, useMemo, useState } from "react";
import { ChevronDown, ChevronUp, Search, X } from "lucide-react";
import { useTranslations } from "next-intl";
import {
  MAX_STUDY_INTERESTS,
  STUDY_INTEREST_AREAS,
  getStudyArea,
  getStudySpecialization,
  isStudyInterestSelectionValid,
  studyInterestSearchMatches,
  validateStudyInterestSelections,
  type StudyInterestArea,
  type StudyInterestSelection,
} from "@/lib/studyInterests";

interface StudyInterestPickerProps {
  value: StudyInterestSelection[];
  onChange: (value: StudyInterestSelection[]) => void;
  /** Show the localized validation message after a submit/continue attempt. */
  showError?: boolean;
  /** Use distinct DOM ids when a page can render more than one picker. */
  idPrefix?: string;
  disabled?: boolean;
}

function removeAreaSelections(list: StudyInterestSelection[], areaId: string): StudyInterestSelection[] {
  return list.filter(
    (selection) =>
      !((selection.kind === "area" || selection.kind === "specialization") && selection.areaId === areaId)
  );
}

function areaHasSelection(list: StudyInterestSelection[], areaId: string): boolean {
  return list.some(
    (selection) =>
      (selection.kind === "area" || selection.kind === "specialization") && selection.areaId === areaId
  );
}

export function StudyInterestPicker({
  value,
  onChange,
  showError = false,
  idPrefix,
  disabled = false,
}: StudyInterestPickerProps) {
  const t = useTranslations("studyInterest");
  const generatedId = useId().replace(/[^a-zA-Z0-9_-]/g, "");
  const prefix = idPrefix ?? `study-interest-${generatedId}`;
  const searchId = `${prefix}-search`;
  const helpId = `${prefix}-help`;
  const errorId = `${prefix}-error`;
  const [query, setQuery] = useState("");
  const [showAllAreas, setShowAllAreas] = useState(false);
  const [expandedAreaId, setExpandedAreaId] = useState<string | null>(null);

  const labelForArea = (area: StudyInterestArea) => t(`areaLabels.${area.id}` as never);
  const labelForSpecialization = (areaId: string, specializationId: string) => {
    const item = getStudySpecialization(areaId, specializationId);
    return item ? t(`specializationLabels.${item.id}` as never) : specializationId;
  };

  const normalizedQuery = query.trim();
  const visibleAreas = useMemo(() => {
    if (!normalizedQuery) {
      return showAllAreas ? STUDY_INTEREST_AREAS : STUDY_INTEREST_AREAS.filter((area) => area.featured);
    }
    return STUDY_INTEREST_AREAS.filter((area) => {
      const areaLabel = t(`areaLabels.${area.id}` as never);
      const areaMatches = studyInterestSearchMatches(normalizedQuery, [areaLabel, area.canonical, ...area.aliases]);
      const specializationMatches = area.specializations.some((item) =>
        studyInterestSearchMatches(normalizedQuery, [
          t(`specializationLabels.${item.id}` as never),
          item.canonical,
          ...item.aliases,
        ])
      );
      return areaMatches || specializationMatches;
    });
  }, [normalizedQuery, showAllAreas, t]);

  const matchingSpecializations = (area: StudyInterestArea) => {
    if (!normalizedQuery) return area.specializations;
    return area.specializations.filter((item) =>
      studyInterestSearchMatches(normalizedQuery, [
        t(`specializationLabels.${item.id}` as never),
        item.canonical,
        ...item.aliases,
      ])
    );
  };

  const toggleArea = (areaId: string) => {
    if (disabled) return;
    const alreadyBroadSelected = value.some((selection) => selection.kind === "area" && selection.areaId === areaId);
    if (alreadyBroadSelected) {
      onChange(value.filter((selection) => !(selection.kind === "area" && selection.areaId === areaId)));
      return;
    }
    if (!areaHasSelection(value, areaId) && value.length >= MAX_STUDY_INTERESTS) return;
    onChange([...removeAreaSelections(value.filter((selection) => selection.kind !== "exploring"), areaId), { kind: "area", areaId }]);
  };

  const toggleSpecialization = (areaId: string, specializationId: string) => {
    if (disabled) return;
    const alreadySelected = value.some(
      (selection) =>
        selection.kind === "specialization" &&
        selection.areaId === areaId &&
        selection.specializationId === specializationId
    );
    if (alreadySelected) {
      onChange(
        value.filter(
          (selection) =>
            !(
              selection.kind === "specialization" &&
              selection.areaId === areaId &&
              selection.specializationId === specializationId
            )
        )
      );
      return;
    }
    const replacingBroadArea = value.some((selection) => selection.kind === "area" && selection.areaId === areaId);
    if (!replacingBroadArea && value.length >= MAX_STUDY_INTERESTS) return;
    const next = replacingBroadArea ? removeAreaSelections(value, areaId) : value.filter((selection) => selection.kind !== "exploring");
    onChange([...next, { kind: "specialization", areaId, specializationId }]);
  };

  const toggleOther = () => {
    if (disabled) return;
    const other = value.find((selection) => selection.kind === "other");
    if (other) {
      onChange(value.filter((selection) => selection.kind !== "other"));
      return;
    }
    if (value.length >= MAX_STUDY_INTERESTS) return;
    onChange([...value.filter((selection) => selection.kind !== "exploring"), { kind: "other", value: "" }]);
  };

  const toggleExploring = () => {
    if (disabled) return;
    const isExploring = value.some((selection) => selection.kind === "exploring");
    onChange(isExploring ? [] : [{ kind: "exploring" }]);
  };

  const updateOtherValue = (nextValue: string) => {
    onChange(value.map((selection) => (selection.kind === "other" ? { ...selection, value: nextValue } : selection)));
  };

  const removeSelection = (target: StudyInterestSelection) => {
    if (disabled) return;
    onChange(value.filter((selection) => selection !== target));
  };

  const validationCode = showError ? validateStudyInterestSelections(value) : null;
  const errorMessage = validationCode
    ? t(
        validationCode === "otherRequired"
          ? "otherRequiredError"
          : validationCode === "otherInvalid"
            ? "otherInvalidError"
            : validationCode === "limit"
              ? "limitError"
              : "requiredError"
      )
    : "";
  const selectedOther = value.find((selection) => selection.kind === "other");
  const isExploring = value.some((selection) => selection.kind === "exploring");
  const valid = isStudyInterestSelectionValid(value);

  const selectedLabels = value.map((selection) => {
    if (selection.kind === "area") {
      const area = getStudyArea(selection.areaId);
      return { selection, label: area ? labelForArea(area) : selection.areaId };
    }
    if (selection.kind === "specialization") {
      return { selection, label: labelForSpecialization(selection.areaId, selection.specializationId) };
    }
    if (selection.kind === "other") {
      return { selection, label: selection.value.trim() || t("other") };
    }
    return { selection, label: t("exploring") };
  });

  const buttonBase =
    "min-h-11 w-full rounded-xl border px-3 py-2.5 text-left text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 dark:focus-visible:ring-offset-slate-950";

  return (
    <fieldset
      aria-describedby={`${helpId}${errorMessage ? ` ${errorId}` : ""}`}
      className="min-w-0 space-y-3"
      disabled={disabled}
    >
      <legend className="mb-1 text-sm font-bold text-slate-800 dark:text-slate-100">{t("title")}</legend>
      <p id={helpId} className="text-xs leading-relaxed text-slate-600 dark:text-slate-300">
        {t("helper", { max: MAX_STUDY_INTERESTS })}
      </p>

      <label htmlFor={searchId} className="sr-only">
        {t("searchLabel")}
      </label>
      <div className="relative">
        <Search aria-hidden="true" className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
        <input
          id={searchId}
          type="search"
          inputMode="search"
          autoComplete="off"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder={t("searchPlaceholder")}
          className="min-h-11 w-full rounded-xl border border-slate-300 bg-white py-2.5 pl-9 pr-10 text-sm text-slate-900 placeholder:text-slate-400 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:placeholder:text-slate-500 dark:focus:ring-indigo-900"
        />
        {query && (
          <button
            type="button"
            onClick={() => setQuery("")}
            aria-label={t("clearSearch")}
            className="absolute right-2 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 dark:hover:bg-slate-800"
          >
            <X aria-hidden="true" className="h-4 w-4" />
          </button>
        )}
      </div>

      <div className="flex items-center justify-between gap-2" aria-live="polite">
        <span className="text-xs font-semibold text-slate-600 dark:text-slate-300">
          {t("selectedCount", { count: value.length, max: MAX_STUDY_INTERESTS })}
        </span>
        {normalizedQuery && (
          <span className="text-xs text-slate-500 dark:text-slate-400">
            {t("searchResultCount", { count: visibleAreas.length })}
          </span>
        )}
      </div>

      {visibleAreas.length > 0 ? (
        <ul className="grid grid-cols-1 gap-2 sm:grid-cols-2" aria-label={t("areasLabel")}>
          {visibleAreas.map((area) => {
            const areaLabel = labelForArea(area);
            const selectedBroad = value.some((selection) => selection.kind === "area" && selection.areaId === area.id);
            const selectedSpecializations = value
              .filter((selection) => selection.kind === "specialization" && selection.areaId === area.id)
              .map((selection) => selection.kind === "specialization" ? selection.specializationId : "");
            const areaExpanded = expandedAreaId === area.id;
            const matching = matchingSpecializations(area);
            const showSpecs = areaExpanded;
            const displayedSpecs = showSpecs
              ? normalizedQuery && matching.length > 0
                ? matching
                : area.specializations
              : [];
            const listId = `${prefix}-${area.id}-specializations`;
            const hasAreaSlot = areaHasSelection(value, area.id);
            const areaDisabled =
              disabled ||
              (!selectedBroad && !hasAreaSlot && value.length >= MAX_STUDY_INTERESTS && !isExploring);

            return (
              <li key={area.id} className="min-w-0">
                <div
                  className={`rounded-xl border p-2 transition-colors ${
                    selectedBroad
                      ? "border-indigo-400 bg-indigo-50/80 dark:border-indigo-700 dark:bg-indigo-950/40"
                      : selectedSpecializations.length > 0
                        ? "border-indigo-200 bg-white dark:border-indigo-900 dark:bg-slate-900"
                        : "border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-900"
                  }`}
                >
                  <div className="flex items-start gap-1.5">
                    <button
                      type="button"
                      aria-pressed={selectedBroad}
                      aria-label={t(selectedBroad ? "deselectArea" : "selectArea", { area: areaLabel })}
                      disabled={areaDisabled}
                      onClick={() => toggleArea(area.id)}
                      className={`${buttonBase} min-h-[46px] flex-1 border-0 bg-transparent px-2 py-2 font-semibold text-slate-800 hover:bg-white/70 enabled:active:bg-indigo-100 dark:text-slate-100 dark:hover:bg-slate-800/80 dark:enabled:active:bg-indigo-950`}
                    >
                      <span className="flex items-start gap-2">
                        <span
                          aria-hidden="true"
                          className={`mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded border text-[10px] ${
                            selectedBroad
                              ? "border-indigo-600 bg-indigo-600 text-white"
                              : "border-slate-400 bg-white text-transparent dark:border-slate-500 dark:bg-slate-950"
                          }`}
                        >
                          ✓
                        </span>
                        <span className="min-w-0 leading-snug">{areaLabel}</span>
                      </span>
                    </button>
                    <button
                      type="button"
                      aria-expanded={areaExpanded}
                      aria-controls={listId}
                      aria-label={t(areaExpanded ? "hideSpecializations" : "showSpecializations", { area: areaLabel })}
                      onClick={() => setExpandedAreaId(areaExpanded ? null : area.id)}
                      className="mt-0.5 flex min-h-9 shrink-0 items-center justify-center rounded-lg px-2 text-indigo-700 hover:bg-indigo-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 dark:text-indigo-300 dark:hover:bg-indigo-950"
                    >
                      {areaExpanded ? <ChevronUp aria-hidden="true" className="h-4 w-4" /> : <ChevronDown aria-hidden="true" className="h-4 w-4" />}
                      <span className="text-[10px] font-semibold leading-none">{t(areaExpanded ? "hideSpecializationsShort" : "viewSpecializationsShort")}</span>
                    </button>
                  </div>
                  <ul
                    id={listId}
                    hidden={!showSpecs}
                    className={showSpecs ? "mt-1 grid grid-cols-1 gap-1 border-t border-slate-100 pt-2 dark:border-slate-800" : "hidden"}
                    aria-label={t("specializationsFor", { area: areaLabel })}
                  >
                      {displayedSpecs.map((item) => {
                        const selected = selectedSpecializations.includes(item.id);
                        const specLabel = t(`specializationLabels.${item.id}` as never);
                        const specDisabled =
                          disabled ||
                          (!selected && !selectedBroad && value.length >= MAX_STUDY_INTERESTS && !isExploring);
                        return (
                          <li key={item.id}>
                            <button
                              type="button"
                              aria-pressed={selected}
                              aria-label={t(selected ? "deselectSpecialization" : "selectSpecialization", { specialization: specLabel, area: areaLabel })}
                              disabled={specDisabled}
                              onClick={() => toggleSpecialization(area.id, item.id)}
                              className={`${buttonBase} min-h-10 border-transparent bg-white px-3 py-2 text-xs text-slate-700 hover:border-indigo-200 hover:bg-indigo-50 disabled:bg-slate-50 dark:bg-slate-950 dark:text-slate-200 dark:hover:border-indigo-900 dark:hover:bg-indigo-950/50 dark:disabled:bg-slate-900`}
                            >
                              <span className="flex items-center gap-2">
                                <span
                                  aria-hidden="true"
                                  className={`flex h-3.5 w-3.5 shrink-0 items-center justify-center rounded border text-[9px] ${
                                    selected
                                      ? "border-indigo-600 bg-indigo-600 text-white"
                                      : "border-slate-400 text-transparent dark:border-slate-500"
                                  }`}
                                >
                                  ✓
                                </span>
                                {specLabel}
                              </span>
                            </button>
                          </li>
                        );
                      })}
                  </ul>
                </div>
              </li>
            );
          })}
        </ul>
      ) : normalizedQuery ? (
        <p className="rounded-xl border border-dashed border-slate-300 px-3 py-4 text-center text-sm text-slate-500 dark:border-slate-700 dark:text-slate-400">
          {t("noSearchResults")}
        </p>
      ) : null}

      {!normalizedQuery && (
        <button
          type="button"
          onClick={() => setShowAllAreas((shown) => !shown)}
          className="min-h-10 rounded-lg px-3 text-sm font-semibold text-indigo-700 underline decoration-indigo-300 underline-offset-4 hover:bg-indigo-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 dark:text-indigo-300 dark:hover:bg-indigo-950"
        >
          {showAllAreas ? t("viewFewerFields") : t("viewAllFields", { count: STUDY_INTEREST_AREAS.length - STUDY_INTEREST_AREAS.filter((area) => area.featured).length })}
        </button>
      )}

      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        <button
          type="button"
          aria-pressed={Boolean(selectedOther)}
          aria-expanded={Boolean(selectedOther)}
          aria-controls={`${prefix}-other-input`}
          disabled={disabled || (!selectedOther && value.length >= MAX_STUDY_INTERESTS && !isExploring)}
          onClick={toggleOther}
          className={`${buttonBase} ${selectedOther ? "border-indigo-400 bg-indigo-50 text-indigo-800 dark:border-indigo-700 dark:bg-indigo-950/40 dark:text-indigo-200" : "border-slate-200 bg-white font-semibold text-slate-700 hover:border-indigo-300 hover:bg-indigo-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:border-indigo-800 dark:hover:bg-indigo-950/30"}`}
        >
          <span className="flex items-center gap-2">
            <span aria-hidden="true" className={`flex h-4 w-4 items-center justify-center rounded border text-[10px] ${selectedOther ? "border-indigo-600 bg-indigo-600 text-white" : "border-slate-400 text-transparent dark:border-slate-500"}`}>✓</span>
            <span>{t("other")}</span>
          </span>
        </button>
        <button
          type="button"
          aria-pressed={isExploring}
          onClick={toggleExploring}
          disabled={disabled}
          className={`${buttonBase} ${isExploring ? "border-violet-400 bg-violet-50 text-violet-800 dark:border-violet-700 dark:bg-violet-950/40 dark:text-violet-200" : "border-slate-200 bg-white font-semibold text-slate-700 hover:border-violet-300 hover:bg-violet-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:border-violet-800 dark:hover:bg-violet-950/30"}`}
        >
          <span className="flex items-center gap-2">
            <span aria-hidden="true" className={`flex h-4 w-4 items-center justify-center rounded border text-[10px] ${isExploring ? "border-violet-600 bg-violet-600 text-white" : "border-slate-400 text-transparent dark:border-slate-500"}`}>✓</span>
            <span>{t("exploring")}</span>
          </span>
          <span className="mt-1 block pl-6 text-[11px] font-normal text-slate-500 dark:text-slate-400">{t("exploringHint")}</span>
        </button>
      </div>

      <div
        id={`${prefix}-other-input`}
        hidden={!selectedOther}
        className={selectedOther ? "space-y-1.5" : "hidden"}
      >
        {selectedOther && (
          <>
            <label htmlFor={`${prefix}-other-text`} className="block text-xs font-semibold text-slate-700 dark:text-slate-200">
              {t("otherInputLabel")}
            </label>
            <input
              id={`${prefix}-other-text`}
              type="text"
              autoComplete="off"
              maxLength={160}
              value={selectedOther.value}
              aria-invalid={showError && !valid ? true : undefined}
              aria-describedby={`${prefix}-other-help${errorMessage ? ` ${errorId}` : ""}`}
              onChange={(event) => updateOtherValue(event.target.value)}
              placeholder={t("otherPlaceholder")}
              className="min-h-11 w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:placeholder:text-slate-500 dark:focus:ring-indigo-900"
            />
            <p id={`${prefix}-other-help`} className="text-[11px] text-slate-500 dark:text-slate-400">{t("otherHelper", { max: 160 })}</p>
          </>
        )}
      </div>

      {selectedLabels.length > 0 && (
        <ul className="flex flex-wrap gap-1.5" aria-label={t("selectedLabel")}>
          {selectedLabels.map(({ selection, label }, index) => (
            <li key={`${selection.kind}-${index}`} className="inline-flex max-w-full items-center gap-1 rounded-full border border-indigo-200 bg-indigo-50 py-1 pl-2.5 pr-1.5 text-xs font-semibold text-indigo-800 dark:border-indigo-900 dark:bg-indigo-950/60 dark:text-indigo-200">
              <span className="max-w-[17rem] truncate">{label}</span>
              <button
                type="button"
                onClick={() => removeSelection(selection)}
                disabled={disabled}
                aria-label={t("removeSelection", { label })}
                className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full hover:bg-indigo-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 dark:hover:bg-indigo-900"
              >
                <X aria-hidden="true" className="h-3.5 w-3.5" />
              </button>
            </li>
          ))}
        </ul>
      )}

      {errorMessage && (
        <p id={errorId} role="alert" className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs font-semibold text-red-700 dark:border-red-900 dark:bg-red-950/50 dark:text-red-200">
          {errorMessage}
        </p>
      )}
    </fieldset>
  );
}
