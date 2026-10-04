"use client";

import React, { useState, useEffect, useRef } from "react";
import { useTranslations } from "next-intl";
import { StudentProfile } from "./Navbar";
import { UniversityDetail } from "./UniversityDetail";
import { countryTranslationKey, qsCountryOption, withQsTop200Countries } from "@/lib/countries";
import { DegreeLevelLabel } from "./DegreeLevelLabel";
import { normalizeDegreeLevel } from "@/lib/degreeLevels";
import { Pagination } from "./Pagination";
import { useResponsivePerPage } from "@/hooks/useResponsivePerPage";
import { useLocaleContext } from "@/i18n/LocaleProvider";
import { formatMoney, formatNumber, formatPercent } from "@/lib/format";
import { ScrollRegion } from "@/components/hubs/ui";
import { AppNote } from "./AppNote";
import { 
  Search, 
  Globe, 
  GraduationCap, 
  DollarSign, 
  Award, 
  Filter, 
  Check, 
  Plus, 
  Columns, 
  ExternalLink,
  Briefcase,
  Star,
  BookOpen,
  Sparkles,
  X,
  CheckCircle2,
  AlertCircle,
  Eye
} from "lucide-react";

export interface University {
  id: number;
  name: string;
  country: string;
  city: string;
  flagEmoji: string;
  worldRanking: number | null;
  degreeLevel: string | null;
  programMajor: string;
  annualTuitionUsd: number | null;
  annualLivingEstUsd: number | null;
  minGpa: number | null;
  minIelts: number | null;
  minSat?: number | null;
  acceptanceRate: number | null;
  postStudyWorkVisaYears: number | null;
  description: string | null;
  highlights: string | null;
  websiteUrl: string | null;
  imageUrl: string | null;
  matchScore?: number | null;
  matchCategory?: "Reach" | "Match" | "Safety" | null;
  matchReasons?: string[];
  matchIssues?: string[];
  sourceUrl?: string | null;
  sourceTitle?: string | null;
  sourceLastVerifiedAt?: string | null;
}

const UNIVERSITY_FILTER_COUNTRIES = withQsTop200Countries([
  "United States",
  "United Kingdom",
  "Canada",
  "Germany",
  "Singapore",
  "Australia",
  "Switzerland",
  "Netherlands",
  "Japan",
]);

interface UniversityExplorerProps {
  activeProfile: StudentProfile | null;
  savedUniIds: Set<number>;
  onSaveUniversity: (uniId: number) => Promise<void>;
  onUnsaveUniversity: (uniId: number) => Promise<void>;
  /**
   * Spec §34 — the global search (Ctrl+K) can ask the explorer to open one
   * specific university. It broadcasts a window event rather than threading a
   * prop through the page, so the palette and the explorer stay decoupled.
   */
  autoOpenUniversityId?: number | null;
}

export function UniversityExplorer({
  activeProfile,
  savedUniIds,
  onSaveUniversity,
  onUnsaveUniversity,
  autoOpenUniversityId,
}: UniversityExplorerProps) {
  const t = useTranslations("university");
  const tCountry = useTranslations("countryNames");
  const { locale } = useLocaleContext();

  const [universities, setUniversities] = useState<University[]>([]);
  const [fetchError, setFetchError] = useState("");
  const [loading, setLoading] = useState(true);

  // Filters
  const [search, setSearch] = useState("");
  const [selectedCountry, setSelectedCountry] = useState("All");
  const [selectedLevel, setSelectedLevel] = useState("All");
  const [maxTuition, setMaxTuition] = useState<number>(70000);

  // Compare List
  const [compareIds, setCompareIds] = useState<number[]>([]);
  const [showCompareModal, setShowCompareModal] = useState(false);

  // Detail view + sorting
  const [selectedUniId, setSelectedUniId] = useState<number | null>(null);

  // Global search → deep-open this university. The prop changes, so the
  // selection is adjusted during render (React's documented "derive state from
  // a prop" pattern) rather than in an effect, which would cost an extra
  // render pass for every keystroke of the command palette.
  const [lastAutoOpenId, setLastAutoOpenId] = useState<number | null>(null);
  if (autoOpenUniversityId != null && autoOpenUniversityId !== lastAutoOpenId) {
    setLastAutoOpenId(autoOpenUniversityId);
    setSelectedUniId(autoOpenUniversityId);
  }
  const [sortBy, setSortBy] = useState("rank");

  // Pagination: exactly 8 rows per page on every screen. The grid below is
  // `grid-cols-1 md:grid-cols-2 lg:grid-cols-3`, so 8 / 16 / 24 cards.
  const perPage = useResponsivePerPage({ base: 1, md: 2, lg: 3 });
  const [page, setPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const resultsTopRef = useRef<HTMLDivElement>(null);

  // Compare selections may span multiple pages - the modal loads the full
  // filtered list on open so every selected university appears in the table.
  const [comparePool, setComparePool] = useState<University[] | null>(null);
  const [compareLoading, setCompareLoading] = useState(false);

  // Restart numbering from page 1 whenever the result-set identity changes
  // (filters, search, sort, profile, or page size). Adjusted during render
  // (the React-endorsed alternative to a reset effect), so the debounced
  // fetch below always fires once - already with the correct page.
  const resultKey = [activeProfile?.id, activeProfile?.degreeLevel, selectedCountry, selectedLevel, maxTuition, search, sortBy, perPage].join("|");
  const [prevResultKey, setPrevResultKey] = useState(resultKey);
  if (resultKey !== prevResultKey) {
    setPrevResultKey(resultKey);
    setPage(1);
  }

  // Shared filter params (no pagination) - reused by the compare modal so it
  // loads the same filtered list the grid is paginating through.
  const buildFilterParams = () => {
    const params = new URLSearchParams();
    if (activeProfile?.id) params.set("profileId", activeProfile.id.toString());
    if (selectedCountry !== "All") params.set("country", selectedCountry);
    // For an active student, the catalogue is always locked to the degree
    // selected in their profile. Guests may still use the level filter.
    const effectiveLevel = activeProfile?.degreeLevel || selectedLevel;
    if (effectiveLevel !== "All") params.set("degreeLevel", effectiveLevel);
    if (maxTuition < 70000) params.set("maxTuition", maxTuition.toString());
    if (search.trim()) params.set("search", search.trim());
    if (sortBy !== "rank") params.set("sort", sortBy);
    return params;
  };

  const fetchUniversities = async () => {
    setLoading(true);
    setFetchError("");
    try {
      const params = buildFilterParams();
      params.set("page", page.toString());
      params.set("perPage", perPage.toString());

      const res = await fetch(`/api/universities?${params.toString()}`);
      const data = await res.json();
      if (!res.ok) {
        // Show the real server error instead of a misleading empty message.
        if (data?.error?.includes("does not exist") || data?.error?.includes("column") || data?.error?.includes("out of date")) {
          setFetchError(t("exSchemaError"));
        } else {
          setFetchError(data?.error || t("exLoadError"));
        }
        setUniversities([]);
        return;
      }
      if (data.universities) {
        setUniversities(data.universities);
        setTotalCount(
          typeof data.total === "number" ? data.total : data.universities.length,
        );
        setTotalPages(
          typeof data.totalPages === "number" ? Math.max(1, data.totalPages) : 1,
        );
        // The server clamps out-of-range pages - sync so the UI numbering
        // always matches the returned slice.
        if (typeof data.page === "number" && data.page !== page) {
          setPage(data.page);
        }
      }
    } catch (err: any) {
      console.error("Error fetching universities:", err);
      setFetchError(err?.message || t("exLoadError"));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const t = setTimeout(() => fetchUniversities(), 300);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeProfile?.id, activeProfile?.degreeLevel, selectedCountry, selectedLevel, maxTuition, search, sortBy, page, perPage]);

  const filteredUniversities = universities;

  const toggleCompare = (id: number) => {
    setCompareIds((prev) => {
      if (prev.includes(id)) {
        return prev.filter((item) => item !== id);
      } else {
        if (prev.length >= 3) {
          alert(t("exCompareLimit"));
          return prev;
        }
        return [...prev, id];
      }
    });
  };

  const handlePageChange = (nextPage: number) => {
    setPage(nextPage);
    resultsTopRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const openCompareModal = async () => {
    setShowCompareModal(true);
    // Selections may live on other pages - load the full filtered list
    // (same filters, no pagination) so every selected row appears.
    setCompareLoading(true);
    try {
      const res = await fetch(`/api/universities?${buildFilterParams().toString()}`);
      const data = await res.json();
      setComparePool(
        res.ok && Array.isArray(data.universities) ? data.universities : universities,
      );
    } catch {
      setComparePool(universities);
    } finally {
      setCompareLoading(false);
    }
  };

  const comparedUniversities = (comparePool ?? universities).filter((u) =>
    compareIds.includes(u.id),
  );

  // Canonicalise aliases only for the control's selected value; requests and
  // API records keep their original labels. Unknown is never changed to All.
  const lockedLevel = normalizeDegreeLevel(activeProfile?.degreeLevel) ?? activeProfile?.degreeLevel;
  const activeLevel = activeProfile?.degreeLevel || (selectedLevel !== "All" ? selectedLevel : null);

  if (selectedUniId != null) {
    return (
      <UniversityDetail
        universityId={selectedUniId}
        activeProfile={activeProfile}
        onBack={() => setSelectedUniId(null)}
      />
    );
  }

  return (
    <div className="space-y-6">
      {/* Search & Filter Header */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-xl font-bold text-slate-900 flex items-center gap-2">
              <Search className="h-5 w-5 text-indigo-600" />
              {t("exTitle")}
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">
              {t("exFilteredBy", { profile: activeProfile?.name || t("exProfileFallback") })}
            </p>
          </div>

          {compareIds.length > 0 && (
            <button
              onClick={openCompareModal}
              className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-indigo-600 to-blue-600 text-white font-semibold rounded-xl text-xs shadow-md hover:shadow-indigo-200 transition-all"
            >
              <Columns className="h-4 w-4" />
              {t("exCompareSelected", { count: compareIds.length })}
            </button>
          )}
        </div>

        {/* Filter Controls Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 pt-2">
          {/* Text Search */}
          <div className="relative">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
            <input
              type="text"
              placeholder={t("exSearchPlaceholder")}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-xs sm:text-sm border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none"
            />
          </div>

          {/* Country Filter */}
          <div>
            <select
              value={selectedCountry}
              onChange={(e) => setSelectedCountry(e.target.value)}
              className="w-full px-3 py-2 text-xs sm:text-sm border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none bg-white"
            >
              <option value="All">{t("exCountryAll")}</option>
              {UNIVERSITY_FILTER_COUNTRIES.map((country) => {
                const countryKey = countryTranslationKey(country);
                const countryOption = qsCountryOption(country);
                return (
                  <option key={country} value={country}>
                    {countryOption ? `${countryOption.flag} ` : ""}{countryKey ? tCountry(countryKey) : country}
                  </option>
                );
              })}
            </select>
          </div>

          {/* Level Filter */}
          <div>
            <select
              value={lockedLevel || selectedLevel}
              onChange={(e) => setSelectedLevel(e.target.value)}
              disabled={Boolean(lockedLevel)}
              aria-label={t("exLevelAria")}
              className="w-full px-3 py-2 text-xs sm:text-sm border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none bg-white disabled:bg-slate-100 disabled:text-slate-600 disabled:cursor-not-allowed"
            >
              {(!lockedLevel || lockedLevel === "All") && <option value="All">{t("exLevelAll")}</option>}
              <option value="Bachelor">🎓 <DegreeLevelLabel value="Bachelor" /></option>
              <option value="Master">🎓 <DegreeLevelLabel value="Master" /></option>
              <option value="PhD">🎓 <DegreeLevelLabel value="PhD" /></option>
              {lockedLevel === "Diploma" && <option value="Diploma">🎓 <DegreeLevelLabel value="Diploma" /></option>}
              {lockedLevel && !normalizeDegreeLevel(lockedLevel) && (
                <option value={lockedLevel}><DegreeLevelLabel value={lockedLevel} /></option>
              )}
            </select>
          </div>

          {/* Sort */}
          <div>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="w-full px-3 py-2 text-xs sm:text-sm border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none bg-white"
            >
              <option value="rank">{t("exSortRank")}</option>
              <option value="tuition_asc">{t("exSortTuitionAsc")}</option>
              <option value="tuition_desc">{t("exSortTuitionDesc")}</option>
              <option value="name_asc">{t("exSortNameAsc")}</option>
            </select>
          </div>

          {/* Max Tuition Slider */}
          <div className="bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-200 flex flex-col justify-center">
            <div className="flex justify-between items-center text-[11px] font-semibold text-slate-700">
              <span>{t("exMaxTuition")}</span>
              <span className="text-indigo-600 font-bold">${formatNumber(maxTuition, { placeholder: "0", suffix: "/yr" })}</span>
            </div>
            <input
              type="range"
              min="5000"
              max="70000"
              step="5000"
              value={maxTuition}
              onChange={(e) => setMaxTuition(Number(e.target.value))}
              className="w-full accent-indigo-600 cursor-pointer h-1.5 mt-1"
            />
          </div>
        </div>
      </div>

      {/* Results Count & Active Info */}
      <div ref={resultsTopRef} className="flex items-center justify-between gap-2 text-xs text-slate-500 px-1 scroll-mt-4">
        <span>
          {activeLevel ? <b><DegreeLevelLabel value={activeLevel} /> — </b> : null}
          {t("exResultsCount", {
            from: totalCount === 0 ? 0 : (page - 1) * perPage + 1,
            to: (page - 1) * perPage + filteredUniversities.length,
            total: totalCount,
          })}
        </span>
        <span className="shrink-0">{t("exPageOf", { page, totalPages })}</span>
      </div>

      {/* University Cards Grid */}
      {loading ? (
        <div className="p-12 text-center text-slate-500 font-medium bg-white rounded-2xl border border-slate-200">
          {t("exLoading")}
        </div>
      ) : fetchError ? (
        <div className="p-8 text-center bg-white rounded-2xl border border-red-200">
          <p className="text-xs font-bold text-red-700 mb-2">{t("exLoadFailed")}</p>
          <p className="text-[11px] text-slate-600 break-all">{fetchError}</p>
          <button
            onClick={fetchUniversities}
            className="mt-4 inline-flex items-center gap-1.5 rounded-xl bg-indigo-600 px-4 py-2 text-xs font-bold text-white hover:bg-indigo-700"
          >
            {t("exTryAgain")}
          </button>
        </div>
      ) : filteredUniversities.length === 0 ? (
        <div className="p-12 text-center text-slate-500 bg-white rounded-2xl border border-slate-200">
          {t("exEmpty")}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredUniversities.map((uni) => {
            const isSaved = savedUniIds.has(uni.id);
            const isCompared = compareIds.includes(uni.id);

            let matchBadgeColor = "bg-blue-100 text-blue-800 border-blue-200";
            if (uni.matchCategory === "Safety") {
              matchBadgeColor = "bg-emerald-100 text-emerald-800 border-emerald-200";
            } else if (uni.matchCategory === "Reach") {
              matchBadgeColor = "bg-purple-100 text-purple-800 border-purple-200";
            }

            let highlightsList: string[] = [];
            try {
              const parsed = uni.highlights ? JSON.parse(uni.highlights) : [];
              highlightsList = Array.isArray(parsed) ? parsed : [];
            } catch {
              highlightsList = [];
            }

            return (
              <div
                key={uni.id}
                className="bg-white rounded-2xl border border-slate-200 shadow-xs hover:shadow-lg hover:border-indigo-300 transition-all overflow-hidden flex flex-col justify-between group"
              >
                {/* Top Image Banner */}
                <div className="relative h-40 w-full overflow-hidden bg-slate-100">
                  {uni.imageUrl ? (
                    <img
                      src={uni.imageUrl}
                      alt={`${uni.name} — ${uni.city}, ${uni.country}`}
                      loading="lazy"
                      decoding="async"
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-5xl select-none">
                      {uni.flagEmoji || "🎓"}
                    </div>
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-900/80 via-slate-900/20 to-transparent" />

                  {/* Match Score Badge */}
                  <div className="absolute top-3 left-3 flex items-center gap-1.5">
                    <span className={`px-2.5 py-1 rounded-full text-xs font-bold border shadow-xs ${matchBadgeColor}`}>
                      {uni.matchScore != null ? t("exMatchPct", { score: uni.matchScore }) : t("exMatchUnavailable")} • {uni.matchCategory ?? "—"}
                    </span>
                  </div>

                  {/* World Rank Badge */}
                  <div className="absolute top-3 right-3 bg-slate-900/80 text-amber-300 text-[11px] font-bold px-2.5 py-1 rounded-full backdrop-blur-md border border-white/10 flex items-center gap-1">
                    <Star className="h-3 w-3 fill-amber-300" />
                    {t("exWorldRank", { rank: formatNumber(uni.worldRanking, { placeholder: "—" }) })}
                  </div>

                  {/* Title & Country Overlay */}
                  <div className="absolute bottom-3 left-3 right-3 text-white">
                    <div className="text-xs font-medium text-slate-200 flex items-center gap-1">
                      <span>{uni.flagEmoji}</span>
                      <span>{uni.city}, {uni.country}</span>
                    </div>
                    <h3 className="font-bold text-base leading-tight drop-shadow-xs line-clamp-1">{uni.name}</h3>
                  </div>
                </div>

                {/* Card Content Body */}
                <div className="p-4 space-y-3 flex-1 flex flex-col justify-between">
                  <div>
                    {/* Major & Program */}
                    <div className="text-xs font-bold text-indigo-700 bg-indigo-50 px-2.5 py-1 rounded-lg border border-indigo-100 mb-2 inline-block">
                      {uni.programMajor}
                    </div>

                    <p className="text-[11px] text-slate-500 mb-2">
                      <DegreeLevelLabel value={uni.degreeLevel} showPrefix />
                    </p>

                    <p className="text-xs text-slate-600 line-clamp-2 leading-relaxed">
                      {uni.description}
                    </p>

                    {/* Key Requirements Grid — NULL = Not specified (spec §19) */}
                    <div className="grid grid-cols-2 gap-2 my-3 text-[11px] bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                      <div>
                        <span className="text-slate-400 block">{t("exAnnualTuition")}</span>
                        <strong className="text-slate-900">{formatMoney(uni.annualTuitionUsd, "USD")}</strong>
                      </div>
                      <div>
                        <span className="text-slate-400 block">{t("exLivingEst")}</span>
                        <strong className="text-slate-900">{formatMoney(uni.annualLivingEstUsd, "USD", { suffix: "/yr" })}</strong>
                      </div>
                      <div>
                        <span className="text-slate-400 block">{t("exMinGpa")}</span>
                        <strong className="text-slate-900">{formatNumber(uni.minGpa, { decimals: 2, suffix: " / 4.0" })}</strong>
                      </div>
                      <div>
                        <span className="text-slate-400 block">{t("exMinIelts")}</span>
                        <strong className="text-slate-900">{formatNumber(uni.minIelts, { decimals: 1 })}</strong>
                      </div>
                    </div>

                    {/* Highlights Badges */}
                    {highlightsList.length > 0 && (
                      <div className="flex flex-wrap gap-1">
                        {highlightsList.map((hl, i) => (
                          <span key={i} className="text-[10px] bg-slate-100 text-slate-700 font-medium px-2 py-0.5 rounded-md">
                            ✓ {hl}
                          </span>
                        ))}
                      </div>
                    )}

                    {/* Why this match (spec §23) */}
                    {(uni.matchReasons?.length || uni.matchIssues?.length) && (
                      <div className="mt-2 space-y-1">
                        {uni.matchReasons?.map((r, i) => (
                          <p key={`r${i}`} className="text-[10px] text-emerald-700 flex items-start gap-1">
                            <CheckCircle2 className="h-3 w-3 mt-0.5 shrink-0" />
                            <span><b>{t("exWhyMatch")}</b> {r}</span>
                          </p>
                        ))}
                        {uni.matchIssues?.map((r, i) => (
                          <p key={`p${i}`} className="text-[10px] text-amber-700 flex items-start gap-1">
                            <AlertCircle className="h-3 w-3 mt-0.5 shrink-0" />
                            <span><b>{t("exWhyLower")}</b> {r}</span>
                          </p>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Post-study Work Permit Banner (NULL = not specified) */}
                  <div className="flex items-center justify-between text-xs pt-2 border-t border-slate-100 text-slate-600">
                    <span className="flex items-center gap-1 font-medium">
                      <Briefcase className="h-3.5 w-3.5 text-indigo-600" />
                      {t("exPsWorkVisa")}
                    </span>
                    <strong className="text-slate-900 font-bold">{formatNumber(uni.postStudyWorkVisaYears, { suffix: " Years" })}</strong>
                  </div>

                  {/* Source credibility footnote */}
                  <div className="flex items-center justify-between text-[11px] text-slate-400 border-t border-slate-100 pt-2">
                    {uni.sourceUrl ? (
                      <a
                        href={uni.sourceUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-slate-500 hover:text-indigo-600 transition-colors"
                      >
                        <ExternalLink className="h-3 w-3" /> {t("sourceLink")}
                      </a>
                    ) : (
                      <span className="text-slate-400">{t("exSourcePending")}</span>
                    )}
                    {uni.sourceLastVerifiedAt ? (
                      <span className="text-slate-400">
                        {t("lastVerifiedDate")}: {new Date(uni.sourceLastVerifiedAt).toLocaleDateString(locale)}
                      </span>
                    ) : uni.sourceUrl ? (
                      <span className="text-slate-400">{t("lastVerifiedDate")}: —</span>
                    ) : null}
                  </div>

                  {/* Action Buttons */}
                  <div className="flex items-center justify-between gap-2 pt-2">
                    <label className="flex items-center gap-1.5 text-xs text-slate-600 cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={isCompared}
                        onChange={() => toggleCompare(uni.id)}
                        className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                      />
                      <span>{t("exCompare")}</span>
                    </label>

                    <div className="flex items-center gap-2">
                      <a
                        href={uni.websiteUrl ?? undefined}
                        target="_blank"
                        rel="noreferrer"
                        className="p-2 text-slate-400 hover:text-slate-700 bg-slate-100 rounded-xl transition-colors"
                        title={t("exVisitPortal")}
                      >
                        <ExternalLink className="h-4 w-4" />
                      </a>

                      <button
                        onClick={() => setSelectedUniId(uni.id)}
                        className="flex items-center gap-1 px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-xl text-xs transition-colors"
                      >
                        <Eye className="h-3.5 w-3.5" />
                        {t("exViewUniversity")}
                      </button>

                      {isSaved ? (
                        <button
                          onClick={() => onUnsaveUniversity(uni.id)}
                          className="flex items-center gap-1 px-3 py-1.5 bg-emerald-100 text-emerald-800 font-bold rounded-xl text-xs hover:bg-red-100 hover:text-red-700 transition-colors"
                        >
                          <Check className="h-3.5 w-3.5" />
                          {t("exSaved")}
                        </button>
                      ) : (
                        <button
                          onClick={() => onSaveUniversity(uni.id)}
                          className="flex items-center gap-1 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-xl text-xs shadow-xs transition-colors"
                        >
                          <Plus className="h-3.5 w-3.5" />
                          {t("exShortlist")}
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Numbered pages (Google-style). Renders nothing while loading, on
          error, when empty, or when everything fits on a single page. */}
      {!loading && !fetchError && filteredUniversities.length > 0 && (
        <Pagination
          currentPage={page}
          totalPages={totalPages}
          onPageChange={handlePageChange}
        />
      )}

      {/* The end of the list is where a student decides to apply, so the
          "verify this" line belongs here as well: tuition, rankings, deadlines
          and requirement numbers come from the catalogue and can age. */}
      {!loading && !fetchError && filteredUniversities.length > 0 && (
        <AppNote kind="catalogue" className="border-t border-slate-200 pt-3" />
      )}

      {/* Side-by-Side Comparison Modal */}
      {showCompareModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl overflow-hidden border border-slate-200">
            <div className="bg-gradient-to-r from-indigo-700 to-blue-700 text-white px-6 py-4 flex items-center justify-between">
              <h3 className="text-lg font-bold flex items-center gap-2">
                <Columns className="h-5 w-5" />
                {t("exCompareTitle")}
              </h3>
              <button
                onClick={() => setShowCompareModal(false)}
                className="p-1 hover:bg-white/10 rounded-lg text-white"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <ScrollRegion label={t("exCompare")} className="p-6 overflow-x-auto">
              {compareLoading ? (
                <p className="py-8 text-center text-xs font-medium text-slate-500">
                  {t("exCompareLoading")}
                </p>
              ) : (
              <table className="w-full text-xs text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-200">
                    <th className="py-3 px-4 font-bold text-slate-500 w-1/4">{t("exMetric")}</th>
                    {comparedUniversities.map((u) => (
                      <th key={u.id} className="py-3 px-4 font-bold text-slate-900 text-sm w-1/4">
                        <div className="flex items-center gap-1">
                          <span>{u.flagEmoji}</span>
                          <span>{u.name}</span>
                        </div>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  <tr>
                    <td className="py-2.5 px-4 font-semibold text-slate-500">{t("exMWorldRanking")}</td>
                    {comparedUniversities.map((u) => (
                      <td key={u.id} className="py-2.5 px-4 font-bold text-indigo-600">#{formatNumber(u.worldRanking, { placeholder: "—" })}</td>
                    ))}
                  </tr>
                  <tr>
                    <td className="py-2.5 px-4 font-semibold text-slate-500">{t("exMMatchScore")}</td>
                    {comparedUniversities.map((u) => (
                      <td key={u.id} className="py-2.5 px-4 font-bold text-emerald-600">{u.matchScore != null ? `${u.matchScore}%` : "—"} ({u.matchCategory ?? "—"})</td>
                    ))}
                  </tr>
                  <tr>
                    <td className="py-2.5 px-4 font-semibold text-slate-500">{t("exMAnnualTuition")}</td>
                    {comparedUniversities.map((u) => (
                      <td key={u.id} className="py-2.5 px-4 text-slate-900 font-bold">{formatMoney(u.annualTuitionUsd, "USD")}</td>
                    ))}
                  </tr>
                  <tr>
                    <td className="py-2.5 px-4 font-semibold text-slate-500">{t("exMLivingExpenses")}</td>
                    {comparedUniversities.map((u) => (
                      <td key={u.id} className="py-2.5 px-4 text-slate-900">{formatMoney(u.annualLivingEstUsd, "USD", { suffix: "/yr" })}</td>
                    ))}
                  </tr>
                  <tr>
                    <td className="py-2.5 px-4 font-semibold text-slate-500">{t("exMPsWorkVisa")}</td>
                    {comparedUniversities.map((u) => (
                      <td key={u.id} className="py-2.5 px-4 font-bold text-amber-700">{formatNumber(u.postStudyWorkVisaYears, { placeholder: "—", suffix: " Years" })}</td>
                    ))}
                  </tr>
                  <tr>
                    <td className="py-2.5 px-4 font-semibold text-slate-500">{t("exMMinGpa")}</td>
                    {comparedUniversities.map((u) => (
                      <td key={u.id} className="py-2.5 px-4 text-slate-900">{formatNumber(u.minGpa, { decimals: 2, suffix: " / 4.0" })}</td>
                    ))}
                  </tr>
                  <tr>
                    <td className="py-2.5 px-4 font-semibold text-slate-500">{t("exMMinIelts")}</td>
                    {comparedUniversities.map((u) => (
                      <td key={u.id} className="py-2.5 px-4 text-slate-900">{formatNumber(u.minIelts, { decimals: 1 })}</td>
                    ))}
                  </tr>
                  <tr>
                    <td className="py-2.5 px-4 font-semibold text-slate-500">{t("exMAcceptanceRate")}</td>
                    {comparedUniversities.map((u) => (
                      <td key={u.id} className="py-2.5 px-4 text-slate-900">{formatPercent(u.acceptanceRate, { placeholder: "—" })}</td>
                    ))}
                  </tr>
                </tbody>
              </table>
              )}
            </ScrollRegion>
            <div className="border-t border-slate-100 px-6 py-3">
              <AppNote kind="catalogue" />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
