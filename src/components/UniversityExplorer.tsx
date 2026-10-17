"use client";

import React, { useState, useEffect, useRef } from "react";
import dynamic from "next/dynamic";
import { useTranslations } from "next-intl";
import Image from "next/image";
import { StudentProfile } from "./Navbar";
import { countryTranslationKey, qsCountryOption, withQsTop200Countries } from "@/lib/countries";
import { getCatalogSwr, setCatalogSwr } from "@/lib/clientCatalogSwr";
import { toWikimediaThumb, onWikimediaThumbError } from "@/lib/wikimediaThumb";

const UniversityDetail = dynamic(
  () => import("./UniversityDetail").then((m) => m.UniversityDetail),
  {
    loading: () => (
      <div className="h-96 animate-pulse rounded-2xl border border-slate-200 bg-white p-6 dark:border-slate-700 dark:bg-[#111a2e]" />
    ),
  },
);
import { DegreeLevelLabel } from "./DegreeLevelLabel";
import { MatchBreakdownStrip } from "./MatchBreakdownStrip";
import { DecisionPillStrip } from "./DecisionPillStrip";
import { MatchEvidenceBadge } from "./MatchEvidenceBadge";
import type { MatchBreakdown } from "@/lib/matching";
import { normalizeDegreeLevel } from "@/lib/degreeLevels";
import { Pagination } from "./Pagination";
import { useResponsivePerPage } from "@/hooks/useResponsivePerPage";
import { useLocaleContext } from "@/i18n/LocaleProvider";
import { formatMoney, formatNumber, formatPercent } from "@/lib/format";
import { fitBadgeClass } from "@/lib/fitBadge";
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
  Eye,
  RefreshCw,
  Zap,
  Loader2
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
  /**
   * Published application fee. The USD mirror is resolved server-side by
   * `resolvedUsdUniversityCosts`; a fee in another currency without a mirror
   * stays NULL and is never shown as $0 (spec §14).
   */
  applicationFee?: number | null;
  applicationFeeCurrency?: string | null;
  applicationFeeUsd?: number | null;
  description: string | null;
  highlights: string | null;
  websiteUrl: string | null;
  imageUrl: string | null;
  matchScore?: number | null;
  matchReasons?: string[];
  matchIssues?: string[];
  /** Unclamped total before the display clamp (one decimal). */
  matchRawScore?: number | null;
  /**
   * The exact arithmetic behind the score: the unrounded total, one component
   * per scoring dimension (2-dp points), and how many dimensions had data.
   * Null for anonymous visitors (there is no profile to compare against).
   */
  matchBreakdown?: MatchBreakdown | null;
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
  /**
   * Priority 4.1 — "Start Application" posts to /api/applications and then
   * opens the workspace. The hub owns navigation, so the explorer stays usable
   * on its own (both props are optional and the button simply reports success
   * inline when no navigator is wired up).
   */
  onNavigate?: (id: string) => void;
  onApplicationStarted?: (applicationId: number, universityName: string) => void;
}

export function UniversityExplorer({
  activeProfile,
  savedUniIds,
  onSaveUniversity,
  onUnsaveUniversity,
  autoOpenUniversityId,
  onNavigate,
  onApplicationStarted,
}: UniversityExplorerProps) {
  const t = useTranslations("university");
  const tCountry = useTranslations("countryNames");
  const { locale } = useLocaleContext();

  const [universities, setUniversities] = useState<University[]>([]);
  const [fetchError, setFetchError] = useState("");
  // `loading` is the FIRST load (skeleton cards); `refreshing` is every later
  // filter/page change, where the current cards stay on screen — the grid must
  // not collapse and reflow the page on every click.
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [notice, setNotice] = useState("");
  /**
   * Priority 4.1 — one-click application launcher. Which card is mid-request
   * (so its button shows a spinner and cannot be double-clicked) and whether
   * the last attempt failed. Both are per-card, never global: a student starts
   * one application at a time but must see the outcome on the card they clicked.
   */
  const [startingUniId, setStartingUniId] = useState<number | null>(null);
  const [startError, setStartError] = useState("");

  // Filters
  const [search, setSearch] = useState("");
  // Only the text box is debounced (220 ms). Dropdowns, chips, page clicks and
  // the committed slider value fire immediately — the old 300 ms setTimeout on
  // EVERY fetch was a constant, needless lag on initial open and pagination.
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [selectedCountry, setSelectedCountry] = useState("All");
  const [selectedType, setSelectedType] = useState("All");
  const [selectedLevel, setSelectedLevel] = useState("All");
  // `maxTuition` drives the live label; `committedMaxTuition` is what the
  // request uses, so dragging the slider doesn't fire a request per pixel.
  const [maxTuition, setMaxTuition] = useState<number>(70000);
  const [committedMaxTuition, setCommittedMaxTuition] = useState<number>(70000);
  // Quick-filter chips that map onto existing API filters.
  const [maxRank, setMaxRank] = useState<number | null>(null);
  const [ieltsMax, setIeltsMax] = useState<number | null>(null);

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

  // Debouncing lives in the INPUT HANDLERS, not in an effect: typing schedules
  // one commit 220 ms later, dragging the slider schedules one 200 ms later,
  // and releasing the handle commits immediately. The state writes therefore
  // happen in response to a user action (React's own rule for effects), while
  // the network request still fires exactly once per settled value.
  const searchDebounceRef = useRef<number | null>(null);
  const tuitionDebounceRef = useRef<number | null>(null);

  useEffect(
    () => () => {
      if (searchDebounceRef.current !== null) window.clearTimeout(searchDebounceRef.current);
      if (tuitionDebounceRef.current !== null) window.clearTimeout(tuitionDebounceRef.current);
    },
    [],
  );

  const onSearchInput = (value: string) => {
    setSearch(value);
    if (searchDebounceRef.current !== null) window.clearTimeout(searchDebounceRef.current);
    searchDebounceRef.current = window.setTimeout(() => {
      searchDebounceRef.current = null;
      setDebouncedSearch(value);
    }, 220);
  };

  const onTuitionInput = (value: number) => {
    // The label follows the handle immediately; only the request waits.
    setMaxTuition(value);
    if (tuitionDebounceRef.current !== null) window.clearTimeout(tuitionDebounceRef.current);
    tuitionDebounceRef.current = window.setTimeout(() => {
      tuitionDebounceRef.current = null;
      setCommittedMaxTuition(value);
    }, 200);
  };

  const commitTuition = (value: number) => {
    if (tuitionDebounceRef.current !== null) {
      window.clearTimeout(tuitionDebounceRef.current);
      tuitionDebounceRef.current = null;
    }
    setMaxTuition(value);
    setCommittedMaxTuition(value);
  };

  // Restart numbering from page 1 whenever the result-set identity changes
  // (filters, search, sort, profile, or page size). Adjusted during render
  // (the React-endorsed alternative to a reset effect), so the fetch below
  // always fires once - already with the correct page.
  const resultKey = [
    activeProfile?.id,
    activeProfile?.degreeLevel,
    selectedCountry,
    selectedType,
    selectedLevel,
    committedMaxTuition,
    debouncedSearch,
    sortBy,
    maxRank,
    ieltsMax,
    perPage,
  ].join("|");
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
    if (selectedType !== "All") params.set("type", selectedType);
    // For an active student, the catalogue is always locked to the degree
    // selected in their profile. Guests may still use the level filter.
    const effectiveLevel = activeProfile?.degreeLevel || selectedLevel;
    if (effectiveLevel !== "All") params.set("degreeLevel", effectiveLevel);
    if (committedMaxTuition < 70000) params.set("maxTuition", committedMaxTuition.toString());
    if (debouncedSearch.trim()) params.set("search", debouncedSearch.trim());
    if (sortBy !== "rank") params.set("sort", sortBy);
    if (maxRank != null) params.set("maxRank", maxRank.toString());
    if (ieltsMax != null) params.set("ielts", ieltsMax.toString());
    return params;
  };

  // True once a response has been rendered — from then on the existing cards
  // stay mounted during a refresh instead of being replaced by a placeholder.
  const hasLoadedRef = useRef(false);

  const fetchUniversities = async (signal?: AbortSignal) => {
    const params = buildFilterParams();
    params.set("page", page.toString());
    params.set("perPage", perPage.toString());
    const queryKey = params.toString();

    const cached = getCatalogSwr<{
      universities: University[];
      total: number;
      totalPages: number;
      page?: number;
    }>("universities", queryKey);

    if (cached) {
      hasLoadedRef.current = true;
      setUniversities(cached.data.universities);
      setTotalCount(cached.data.total);
      setTotalPages(cached.data.totalPages);
      setLoading(false);
      setRefreshing(false);
      setFetchError("");
      if (cached.isFresh) return;
    } else if (hasLoadedRef.current) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }
    setFetchError("");
    try {
      const res = await fetch(`/api/universities?${queryKey}`, { signal });
      const data = await res.json();
      hasLoadedRef.current = true;
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
        const nextTotal =
          typeof data.total === "number" ? data.total : data.universities.length;
        const nextTotalPages =
          typeof data.totalPages === "number" ? Math.max(1, data.totalPages) : 1;
        setUniversities(data.universities);
        setTotalCount(nextTotal);
        setTotalPages(nextTotalPages);
        setCatalogSwr("universities", queryKey, {
          universities: data.universities,
          total: nextTotal,
          totalPages: nextTotalPages,
          page: data.page,
        });
        // The server clamps out-of-range pages - sync so the UI numbering
        // always matches the returned slice.
        if (typeof data.page === "number" && data.page !== page) {
          setPage(data.page);
        }
      }
    } catch (err: any) {
      // An aborted request is a superseded request, not a failure: the newer
      // one is already in flight and will render the correct slice.
      if (err?.name === "AbortError") return;
      console.error("Error fetching universities:", err);
      if (!cached) {
        setFetchError(err?.message || t("exLoadError"));
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  // Fire immediately on every committed change; the previous in-flight request
  // is aborted so a slow response can never overwrite a newer one.
  useEffect(() => {
    const controller = new AbortController();
    // Started in a microtask: the effect body itself must not call setState
    // synchronously (React's rule for effects — the first state write is the
    // "refreshing" flag at the top of the fetch).
    void Promise.resolve().then(() => fetchUniversities(controller.signal));
    return () => controller.abort();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    activeProfile?.id,
    activeProfile?.degreeLevel,
    selectedCountry,
    selectedType,
    selectedLevel,
    committedMaxTuition,
    debouncedSearch,
    sortBy,
    maxRank,
    ieltsMax,
    page,
    perPage,
  ]);

  const filteredUniversities = universities;

  /**
   * Priority 4.1 — "Start Application": create the application row, then hand
   * the workspace to the hub. The POST is the same one the tracker uses, so the
   * new row arrives with its checklist seeded by the requirements engine on the
   * server rather than by a client-side guess.
   */
  const startApplication = async (uni: University) => {
    if (!activeProfile) {
      setStartError(t("startAppNeedsProfile"));
      return;
    }
    if (startingUniId != null) return; // one request at a time
    setStartingUniId(uni.id);
    setStartError("");
    try {
      const res = await fetch("/api/applications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          profileId: activeProfile.id,
          universityId: uni.id,
          universityName: uni.name,
          programName: uni.programMajor || undefined,
          status: "preparing",
        }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        // A free-plan cap or a duplicate is a real answer, not a crash: show it
        // inline on the card the student clicked.
        setStartError(
          typeof data?.error === "string" && data.error.trim() ? data.error : t("startAppFailed")
        );
        return;
      }
      const applicationId = Number(data?.application?.id);
      setNotice(t("startAppDone", { name: uni.name }));
      if (Number.isInteger(applicationId) && applicationId > 0) {
        onApplicationStarted?.(applicationId, uni.name);
        onNavigate?.("applications/workspace");
      }
    } catch {
      setStartError(t("startAppFailed"));
    } finally {
      setStartingUniId(null);
    }
  };

  const toggleCompare = (id: number) => {
    setCompareIds((prev) => {
      if (prev.includes(id)) {
        return prev.filter((item) => item !== id);
      } else {
        if (prev.length >= 3) {
          // No native alert(): an inline, dismissible banner tells the student
          // the same thing without freezing the page.
          setNotice(t("exCompareLimit"));
          return prev;
        }
        return [...prev, id];
      }
    });
  };

  // Quick-filter chips -------------------------------------------------------
  const quickFiltersActive =
    maxRank != null ||
    ieltsMax != null ||
    committedMaxTuition !== 70000 ||
    selectedCountry !== "All" ||
    selectedType !== "All" ||
    selectedLevel !== "All" ||
    debouncedSearch.trim() !== "" ||
    sortBy !== "rank";

  const resetFilters = () => {
    if (searchDebounceRef.current !== null) {
      window.clearTimeout(searchDebounceRef.current);
      searchDebounceRef.current = null;
    }
    commitTuition(70000);
    setSearch("");
    setDebouncedSearch("");
    setSelectedCountry("All");
    setSelectedType("All");
    setSelectedLevel("All");
    setMaxRank(null);
    setIeltsMax(null);
    setSortBy("rank");
    setNotice("");
  };

  const setLowTuition = () => {
    commitTuition(5000);
    setMaxRank(null);
  };

  // Auto-dismiss the compare notice so it never lingers over the results.
  useEffect(() => {
    if (!notice) return;
    const id = setTimeout(() => setNotice(""), 6000);
    return () => clearTimeout(id);
  }, [notice]);

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
        onNavigate={onNavigate}
        onApplicationStarted={onApplicationStarted}
      />
    );
  }

  return (
    <div className="space-y-6">
      {/* Search & Filter Header */}
      <div className="space-y-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-xs sm:p-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            {/* h2, not h1: the hub shell above already renders the single <h1>
                for this screen, and two stacked h1s broke the outline. */}
            <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <Search className="h-5 w-5 text-indigo-600" />
              {t("exTitle")}
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              {t("exFilteredBy", { profile: activeProfile?.name || t("exProfileFallback") })}
            </p>
          </div>

          <div className="flex items-center gap-2">
            {refreshing && (
              <span className="flex items-center gap-1.5 text-[11px] font-semibold text-indigo-600 dark:text-indigo-300">
                <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                {t("exRefreshing")}
              </span>
            )}
          </div>

          {compareIds.length > 0 && (
            <button
              onClick={openCompareModal}
              className="flex min-h-11 items-center gap-2 rounded-xl bg-gradient-to-r from-indigo-600 to-blue-600 px-4 py-2 text-xs font-semibold text-white shadow-md transition-all hover:shadow-indigo-200"
            >
              <Columns className="h-4 w-4" />
              {t("exCompareSelected", { count: compareIds.length })}
            </button>
          )}
        </div>

        {/* Filter Controls Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 pt-2">
          {/* Text Search */}
          <div className="relative">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
            <input
              type="text"
              placeholder={t("exSearchPlaceholder")}
              aria-label={t("exSearchPlaceholder")}
              value={search}
              onChange={(e) => onSearchInput(e.target.value)}
              className="min-h-11 w-full rounded-xl border border-slate-200 py-2 pl-9 pr-3 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500 sm:text-sm"
            />
          </div>

          {/* Country Filter */}
          <div>
            <select
              value={selectedCountry}
              onChange={(e) => setSelectedCountry(e.target.value)}
              aria-label={t("exCountryAll")}
              className="min-h-11 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500 sm:text-sm"
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

          {/* University type — unknown catalogue types remain visible only in All. */}
          <div>
            <select
              value={selectedType}
              onChange={(e) => setSelectedType(e.target.value)}
              aria-label={t("uniType")}
              className="min-h-11 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500 sm:text-sm"
            >
              <option value="All">{t("exTypeAll")}</option>
              <option value="Public">{t("exTypePublic")}</option>
              <option value="Private">{t("exTypePrivate")}</option>
            </select>
          </div>

          {/* Level Filter */}
          <div>
            <select
              value={lockedLevel || selectedLevel}
              onChange={(e) => setSelectedLevel(e.target.value)}
              disabled={Boolean(lockedLevel)}
              aria-label={t("exLevelAria")}
              className="min-h-11 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-600 sm:text-sm"
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
              aria-label={t("exSortRank")}
              className="min-h-11 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500 sm:text-sm"
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
              <label htmlFor="university-max-tuition">{t("exMaxTuition")}</label>
              <span className="text-indigo-600 font-bold">${formatNumber(maxTuition, { placeholder: "0", suffix: "/yr" })}</span>
            </div>
            <input
              id="university-max-tuition"
              type="range"
              min="5000"
              max="70000"
              step="5000"
              value={maxTuition}
              onChange={(e) => onTuitionInput(Number(e.target.value))}
              // Releasing the handle commits at once — no need to wait out the
              // debounce once the student has stopped dragging.
              onMouseUp={(e) => commitTuition(Number((e.target as HTMLInputElement).value))}
              onTouchEnd={(e) => commitTuition(Number((e.target as HTMLInputElement).value))}
              onKeyUp={(e) => commitTuition(Number((e.target as HTMLInputElement).value))}
              className="w-full accent-indigo-600 cursor-pointer h-1.5 mt-1"
            />
          </div>
        </div>

        {/* One-click quick filters + reset */}
        <div className="flex flex-wrap items-center gap-2 pt-1">
          <button
            type="button"
            onClick={() => {
              setMaxRank((prev) => (prev === 50 ? null : 50));
              setIeltsMax(null);
            }}
            aria-pressed={maxRank === 50}
            className={`min-h-9 rounded-full border px-3 py-1 text-[11px] font-bold transition-colors ${
              maxRank === 50
                ? "border-indigo-500 bg-indigo-600 text-white"
                : "border-slate-200 bg-slate-50 text-slate-700 hover:border-indigo-300 hover:text-indigo-700"
            }`}
          >
            🏆 {t("exQuickTop50")}
          </button>
          <button
            type="button"
            onClick={() => {
              setLowTuition();
            }}
            aria-pressed={committedMaxTuition === 5000}
            className={`min-h-9 rounded-full border px-3 py-1 text-[11px] font-bold transition-colors ${
              committedMaxTuition === 5000
                ? "border-emerald-500 bg-emerald-600 text-white"
                : "border-slate-200 bg-slate-50 text-slate-700 hover:border-emerald-300 hover:text-emerald-700"
            }`}
          >
            💰 {t("exQuickLowTuition")}
          </button>
          <button
            type="button"
            onClick={() => {
              setIeltsMax((prev) => (prev === 6.5 ? null : 6.5));
              setMaxRank(null);
            }}
            aria-pressed={ieltsMax === 6.5}
            className={`min-h-9 rounded-full border px-3 py-1 text-[11px] font-bold transition-colors ${
              ieltsMax === 6.5
                ? "border-sky-500 bg-sky-600 text-white"
                : "border-slate-200 bg-slate-50 text-slate-700 hover:border-sky-300 hover:text-sky-700"
            }`}
          >
            🗣️ {t("exQuickIelts")}
          </button>
          {quickFiltersActive && (
            <button
              type="button"
              onClick={resetFilters}
              className="flex min-h-9 items-center gap-1 rounded-full border border-red-200 bg-red-50 px-3 py-1 text-[11px] font-bold text-red-700 transition-colors hover:bg-red-100"
            >
              <X className="h-3.5 w-3.5" />
              {t("exResetFilters")}
            </button>
          )}
        </div>

        {/* Inline, dismissible replacement for alert() — comparing more than
            three universities is a limit, not an error worth a browser popup. */}
        {notice && (
          <div
            role="status"
            className="flex items-start justify-between gap-3 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-[12px] font-semibold text-amber-800"
          >
            <span className="flex items-start gap-1.5">
              <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
              {notice}
            </span>
            <button
              type="button"
              onClick={() => setNotice("")}
              aria-label={t("exDismiss")}
              className="rounded-lg p-1 text-amber-700 hover:bg-amber-100"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        )}

        {/* The application launcher reports its own outcome inline: a free-plan
            cap or a network failure belongs on the page, not in an alert(). */}
        {startError && (
          <div
            role="alert"
            className="flex items-start justify-between gap-3 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-[12px] font-semibold text-rose-800 dark:border-rose-500/30 dark:bg-rose-500/10 dark:text-rose-200"
          >
            <span className="flex min-w-0 items-start gap-1.5">
              <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
              <span className="min-w-0 break-words whitespace-normal">{startError}</span>
            </span>
            <button
              type="button"
              onClick={() => setStartError("")}
              aria-label={t("exDismiss")}
              className="rounded-lg p-1 text-rose-700 hover:bg-rose-100"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        )}
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
        // First load: a skeleton grid that matches the real card footprint, so
        // the page never jumps when the data lands.
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6" aria-busy="true">
          {Array.from({ length: 6 }).map((_, i) => (
            <div
              key={i}
              className="h-[420px] animate-pulse rounded-2xl border border-slate-200 bg-white dark:border-slate-700 dark:bg-[#111a2e]"
            >
              <div className="h-40 w-full rounded-t-2xl bg-slate-200 dark:bg-slate-700" />
              <div className="space-y-3 p-4">
                <div className="h-4 w-3/4 rounded bg-slate-200 dark:bg-slate-700" />
                <div className="h-3 w-1/2 rounded bg-slate-200 dark:bg-slate-700" />
                <div className="h-20 w-full rounded-xl bg-slate-100 dark:bg-slate-800" />
                <div className="h-3 w-2/3 rounded bg-slate-200 dark:bg-slate-700" />
              </div>
            </div>
          ))}
          <span className="sr-only">{t("exLoading")}</span>
        </div>
      ) : fetchError ? (
        <div className="p-8 text-center bg-white rounded-2xl border border-red-200">
          <p className="text-xs font-bold text-red-700 mb-2">{t("exLoadFailed")}</p>
          <p className="text-[11px] text-slate-600 break-all">{fetchError}</p>
          <button
            onClick={() => void fetchUniversities()}
            className="mt-4 inline-flex min-h-11 items-center gap-1.5 rounded-xl bg-indigo-600 px-4 py-2 text-xs font-bold text-white hover:bg-indigo-700"
          >
            {t("exTryAgain")}
          </button>
        </div>
      ) : filteredUniversities.length === 0 ? (
        <div className="p-12 text-center text-slate-500 bg-white rounded-2xl border border-slate-200">
          {t("exEmpty")}
        </div>
      ) : (
        // Refreshing keeps the current cards mounted (dimmed + inert) instead
        // of collapsing the page into a placeholder box.
        <div
          className={`grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 transition-opacity duration-150 ${
            refreshing ? "pointer-events-none opacity-60" : ""
          }`}
          aria-busy={refreshing}
        >
          {filteredUniversities.map((uni) => {
            const isSaved = savedUniIds.has(uni.id);
            const isCompared = compareIds.includes(uni.id);

            // Semantic tier (emerald / indigo / amber / neutral) — not one
            // hardcoded blue for a 99% and a 41% alike.
            const matchBadgeColor = fitBadgeClass(uni.matchScore);

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
                    <Image
                      src={toWikimediaThumb(uni.imageUrl, 640)}
                      onError={onWikimediaThumbError(uni.imageUrl)}
                      alt={`${uni.name} — ${uni.city}, ${uni.country}`}
                      width={640}
                      height={320}
                      unoptimized
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
                  <div className="absolute left-3 right-16 top-3 flex flex-wrap items-center gap-1.5">
                    <span className={`px-2.5 py-1 rounded-full text-xs font-bold border shadow-xs ${matchBadgeColor}`}>
                      {uni.matchScore != null ? t("exMatchPct", { score: uni.matchScore }) : t("exMatchUnavailable")}
                    </span>
                    {uni.matchBreakdown && (
                      <MatchEvidenceBadge
                        comparedDimensions={uni.matchBreakdown.comparedDimensions}
                        totalDimensions={uni.matchBreakdown.totalDimensions}
                        evidenceCoveragePct={uni.matchBreakdown.evidenceCoveragePct}
                        evidenceLevel={uni.matchBreakdown.evidenceLevel}
                      />
                    )}
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
                    <h3 className="break-words font-bold text-base leading-tight drop-shadow-xs">{uni.name}</h3>
                  </div>
                </div>

                {/* Card Content Body */}
                <div className="p-4 space-y-3 flex-1 flex flex-col justify-between">
                  <div>
                    {/* Major & Program */}
                    <div className="mb-2 inline-block max-w-full break-words whitespace-normal rounded-lg border border-indigo-100 bg-indigo-50 px-2.5 py-1 text-xs font-bold text-indigo-700">
                      {uni.programMajor}
                    </div>

                    <p className="text-[11px] text-slate-500 mb-2">
                      <DegreeLevelLabel value={uni.degreeLevel} showPrefix />
                    </p>

                    {/* Priority 4.1 — the three comparisons that decide whether
                        this university is worth an application fee, already
                        done: eligibility, budget, post-study work visa. */}
                    <DecisionPillStrip
                      university={uni}
                      profile={activeProfile}
                      className="mb-2.5"
                    />

                    <p className="break-words text-xs leading-relaxed text-slate-600">
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

                    {/* Exact arithmetic: every scoring dimension with the
                        points it contributed. Nothing here is rounded into
                        vagueness — the components add up to the score above. */}
                    <MatchBreakdownStrip breakdown={uni.matchBreakdown} />
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
                        className="inline-flex min-h-11 items-center gap-1 text-slate-500 transition-colors hover:text-indigo-600"
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
                  <div className="flex flex-wrap items-center justify-between gap-2 pt-2">
                    <label className="flex min-h-11 cursor-pointer select-none items-center gap-1.5 px-2 text-xs text-slate-600">
                      <input
                        type="checkbox"
                        checked={isCompared}
                        onChange={() => toggleCompare(uni.id)}
                        className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                      />
                      <span>{t("exCompare")}</span>
                    </label>

                    <div className="flex flex-wrap items-center gap-2">
                      {/* Priority 4.1 — create the application (and its
                          checklist) from the card the student is reading. */}
                      <button
                        type="button"
                        onClick={() => void startApplication(uni)}
                        disabled={startingUniId != null}
                        title={
                          activeProfile
                            ? t("startAppHint", { name: uni.name })
                            : t("startAppNeedsProfile")
                        }
                        className="flex min-h-11 items-center gap-1 rounded-xl bg-indigo-600 px-3 py-2 text-xs font-bold text-white shadow-xs transition-colors hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        {startingUniId === uni.id ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />
                        ) : (
                          <Zap className="h-3.5 w-3.5" aria-hidden />
                        )}
                        {t("startApp")}
                      </button>

                      <a
                        href={uni.websiteUrl ?? undefined}
                        target="_blank"
                        rel="noreferrer"
                        className="flex min-h-11 min-w-11 items-center justify-center rounded-xl bg-slate-100 text-slate-400 transition-colors hover:text-slate-700"
                        title={t("exVisitPortal")}
                      >
                        <ExternalLink className="h-4 w-4" />
                      </a>

                      <button
                        onClick={() => setSelectedUniId(uni.id)}
                        className="flex min-h-11 items-center gap-1 rounded-xl bg-slate-900 px-3 py-2 text-xs font-bold text-white transition-colors hover:bg-slate-800"
                      >
                        <Eye className="h-3.5 w-3.5" />
                        {t("exViewUniversity")}
                      </button>

                      {isSaved ? (
                        <button
                          onClick={() => onUnsaveUniversity(uni.id)}
                          className="flex min-h-11 items-center gap-1 rounded-xl bg-emerald-100 px-3 py-2 text-xs font-bold text-emerald-800 transition-colors hover:bg-red-100 hover:text-red-700"
                        >
                          <Check className="h-3.5 w-3.5" />
                          {t("exSaved")}
                        </button>
                      ) : (
                        <button
                          onClick={() => onSaveUniversity(uni.id)}
                          className="flex min-h-11 items-center gap-1 rounded-xl bg-indigo-600 px-3 py-2 text-xs font-semibold text-white shadow-xs transition-colors hover:bg-indigo-700"
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
                className="flex min-h-11 min-w-11 items-center justify-center rounded-lg text-white hover:bg-white/10"
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
                      <td key={u.id} className="py-2.5 px-4 font-bold text-blue-700">
                        {u.matchScore != null ? t("exMatchPct", { score: u.matchScore }) : t("exMatchUnavailable")}
                        {u.matchBreakdown && (
                          <MatchEvidenceBadge
                            comparedDimensions={u.matchBreakdown.comparedDimensions}
                            totalDimensions={u.matchBreakdown.totalDimensions}
                            evidenceCoveragePct={u.matchBreakdown.evidenceCoveragePct}
                            evidenceLevel={u.matchBreakdown.evidenceLevel}
                            className="mt-1 block w-fit"
                          />
                        )}
                      </td>
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
