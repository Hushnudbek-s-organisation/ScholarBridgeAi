"use client";

import React, { useState, useEffect, useRef } from "react";
import { useTranslations } from "next-intl";
import Link from "next/link";
import { ScholarshipFiltersPanel } from "@/components/ScholarshipFilters";
import { StudentProfile } from "./Navbar";
import { Pagination } from "./Pagination";
import { useResponsivePerPage } from "@/hooks/useResponsivePerPage";
import { useLocaleContext } from "@/i18n/LocaleProvider";
import type { Locale } from "@/i18n/config";
import { CountryFlag } from "@/components/CountryFlag";
import {
  localizeCountry,
  localizeCoverageType,
  localizeDegreeLevel,
  localizeScholarshipProvider,
  localizeScholarshipTitle,
} from "@/lib/catalogLocalizer";
import {
  EMPTY_SCHOLARSHIP_FACETS,
  EMPTY_SCHOLARSHIP_FILTERS,
  SCHOLARSHIP_CHANCE_OPTIONS,
  SCHOLARSHIP_FIT_OPTIONS,
  SCHOLARSHIP_GROUP_OPTIONS,
  SCHOLARSHIP_SORT_OPTIONS,
  parseScholarshipDegreeLevels,
  scholarshipActiveFilterCount,
  scholarshipStatusMessageKey,
  type ScholarshipFacets,
  type ScholarshipFilters,
  type ScholarshipGroupOption,
  type ScholarshipSortOption,
} from "@/lib/scholarshipFilters";
import { 
  Award, 
  Search, 
  DollarSign, 
  Calendar, 
  CheckCircle2, 
  ExternalLink, 
  Plus, 
  Check, 
  Sparkles,
  BookOpen,
  ChevronDown,
  Filter,
  AlertCircle,
  Wallet,
  Loader2,
  ArrowRight,
  ArrowUpDown,
  Layers,
  RotateCcw,
  X
} from "lucide-react";
import { formatMoney } from "@/lib/format";
import { AppNote } from "@/components/AppNote";
import { MatchEvidenceBadge } from "@/components/MatchEvidenceBadge";
import { fitBadgeClass } from "@/lib/fitBadge";
import { MatchBreakdownStrip } from "@/components/MatchBreakdownStrip";
import { ScholarshipRequirementPills } from "@/components/ScholarshipRequirementPills";
import { scholarshipFundingPayload } from "@/lib/scholarshipChecks";
import { getCatalogSwr, setCatalogSwr, invalidateCatalogSwr } from "@/lib/clientCatalogSwr";
import { profileMatchFingerprint } from "@/lib/profileMatchFingerprint";
import type { MatchBreakdown } from "@/lib/matching";

export interface Scholarship {
  id: number;
  title: string;
  provider: string;
  country: string;
  coverageType: string;
  amountUsdValue: number | null;
  awardAmount?: number | null;
  awardCurrency?: string | null;
  awardPeriod?: string | null;
  awardBasis?: string | null;
  deadline: string;
  degreeLevels: string;
  eligibleMajors: string;
  minGpa?: number | null;
  minIelts?: number | null;
  financialNeedBased?: boolean | null;
  meritBased?: boolean | null;
  description: string;
  requirements: string;
  websiteUrl: string;
  matchScore?: number;
  matchBreakdown?: MatchBreakdown | null;
  isEligible?: boolean;
  /** Published-gate verdict (meets / below / unknown) — not an admission chance. */
  chanceBucket?: string | null;
  /** The match score in three bands (strong / good / low). */
  fitBucket?: string | null;
  /** Match score of the university this award belongs to, when it links one. */
  universityMatchScore?: number | null;
  /** Combined fit + university + chance number the list is ordered by. */
  relevanceScore?: number | null;
  // Why this match (spec §22)
  matchReasons?: string[];
  matchIssues?: string[];
  // Computed application status (spec §6)
  computedStatus?: string;
  statusLabel?: string;
  expectedLabel?: string | null;
  // Saved-university coverage (Module 1) — present on personalised payloads.
  coveredUniversities?: string[];
  coversSavedUni?: boolean;
  isFullForSavedUni?: boolean;
  sourceUrl?: string | null;
  sourceTitle?: string | null;
  sourceLastVerifiedAt?: string | null;
}

type HubTranslator = (key: string, values?: Record<string, string | number>) => string;

/** Award value label. Every branch is translated (uz/ru included) — the
 *  numeric amount alone is language-neutral, so it keeps `formatMoney`. */
export function awardLabel(s: Scholarship, t: HubTranslator, locale: Locale = "en"): string {
  if (s.awardBasis === "need_based") return t("awardNeedBased");
  if (s.awardBasis === "full_tuition") return t("awardFullTuition");
  if (s.awardBasis === "variable") return t("awardVariable");
  if (s.awardAmount != null) {
    const period = s.awardPeriod === "year" ? t("perYear") : s.awardPeriod === "month" ? t("perMonth") : "";
    return formatMoney(s.awardAmount, s.awardCurrency, { suffix: period });
  }
  // 0 is the catalogue's "no cash value published" sentinel, not an award of
  // zero dollars: fall through to the coverage label instead of printing "$0".
  if (s.amountUsdValue != null && s.amountUsdValue > 0) return formatMoney(s.amountUsdValue, "USD");
  return s.coverageType && s.coverageType !== "Unspecified"
    ? localizeCoverageType(s.coverageType, locale)
    : t("awardNotSpecified");
}

/**
 * Filter state survives a trip to a scholarship's own page: the hub remembers
 * the last selection for this tab session, so "back to all scholarships"
 * returns to the list the student was reading — not to a blank catalogue.
 */
const SCHOLARSHIP_FILTER_STORAGE_KEY = "scholarbridge_scholarship_filters";

function readStoredFilters(): {
  filters: ScholarshipFilters;
  sortBy: ScholarshipSortOption;
  groupBy: ScholarshipGroupOption;
} | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.sessionStorage.getItem(SCHOLARSHIP_FILTER_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<{
      filters: Partial<ScholarshipFilters>;
      sortBy: ScholarshipSortOption;
      groupBy: ScholarshipGroupOption;
    }>;
    const stored = parsed?.filters ?? {};
    const stringsOnly = (value: unknown): string[] =>
      Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : [];
    return {
      filters: {
        country: typeof stored.country === "string" && stored.country ? stored.country : "All",
        degrees: stringsOnly(stored.degrees),
        coverages: stringsOnly(stored.coverages),
        statuses: stringsOnly(stored.statuses),
        basis: stringsOnly(stored.basis),
        // Personal dimensions: a stored selection survives back-navigation, but
        // never for a value the API would reject.
        chance: stringsOnly(stored.chance).filter((value) =>
          (SCHOLARSHIP_CHANCE_OPTIONS as readonly string[]).includes(value)
        ),
        fit: stringsOnly(stored.fit).filter((value) =>
          (SCHOLARSHIP_FIT_OPTIONS as readonly string[]).includes(value)
        ),
      },
      sortBy: SCHOLARSHIP_SORT_OPTIONS.includes(parsed?.sortBy as ScholarshipSortOption)
        ? (parsed?.sortBy as ScholarshipSortOption)
        : "relevance",
      groupBy: SCHOLARSHIP_GROUP_OPTIONS.includes(parsed?.groupBy as ScholarshipGroupOption)
        ? (parsed?.groupBy as ScholarshipGroupOption)
        : "none",
    };
  } catch {
    return null;
  }
}

interface ScholarshipHubProps {
  activeProfile: StudentProfile | null;
  savedScholarshipIds: Set<number>;
  onSaveScholarship: (scholarshipId: number) => Promise<void>;
  onUnsaveScholarship: (scholarshipId: number) => Promise<void>;
  autoFocusScholarship?: { id: number; title: string; requestId: number; country?: string | null } | null;
}

export function ScholarshipHub({
  activeProfile,
  savedScholarshipIds,
  onSaveScholarship,
  onUnsaveScholarship,
  autoFocusScholarship = null,
}: ScholarshipHubProps) {
  const t = useTranslations("scholarshipHub");
  const tCountry = useTranslations("countryNames");
  const { locale } = useLocaleContext();
  const [scholarships, setScholarships] = useState<Scholarship[]>([]);
  const [mercuryEligibilityReview, setMercuryEligibilityReview] = useState<{ available: boolean; probabilityPercent: number | null; deterministicEligibility: boolean | null } | null>(null);
  // `loading` = first load (skeletons); `refreshing` = a later filter/page
  // change, where the current cards stay mounted instead of collapsing.
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  /**
   * Priority 4.2 — "Add to My Funding Plan". Which card is mid-request, which
   * awards are already in the plan (so the button becomes a confirmation), and
   * any failure, shown inline rather than in a popup.
   */
  const [fundingBusyId, setFundingBusyId] = useState<number | null>(null);
  const [fundingAddedIds, setFundingAddedIds] = useState<Set<number>>(new Set());
  const [fundingError, setFundingError] = useState("");

  const addToFundingPlan = async (scholarship: Scholarship) => {
    if (!activeProfile) {
      setFundingError(t("fundingNeedsProfile"));
      return;
    }
    if (fundingBusyId != null || fundingAddedIds.has(scholarship.id)) return;
    setFundingBusyId(scholarship.id);
    setFundingError("");
    try {
      const payload = scholarshipFundingPayload({
        profileId: activeProfile.id,
        title: scholarship.title,
        provider: scholarship.provider,
        // The catalogue's resolved USD figure (period-normalised server-side).
        // NULL means no published amount — the plan line goes in at 0 so the
        // student can enter the real number rather than us inventing one.
        awardAmountUsd: scholarship.amountUsdValue ?? null,
        country: scholarship.country,
        deadline: scholarship.deadline ? new Date(scholarship.deadline).toISOString().slice(0, 10) : null,
        url: scholarship.websiteUrl,
      });
      const res = await fetch("/api/funding", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok || !data?.ok) {
        setFundingError(
          typeof data?.error === "string" && data.error.trim() ? data.error : t("fundingFailed")
        );
        return;
      }
      setFundingAddedIds((prev) => new Set(prev).add(scholarship.id));
    } catch {
      setFundingError(t("fundingFailed"));
    } finally {
      setFundingBusyId(null);
    }
  };

  // Filters
  const [search, setSearch] = useState("");
  // Only the text box is debounced; dropdowns and pagination fire at once.
  const [debouncedSearch, setDebouncedSearch] = useState("");
  // Catalogue filters, ordering and grouping. Values stay canonical; the panel
  // localizes the labels, so switching language never drops a selection.
  const [filters, setFilters] = useState<ScholarshipFilters>(EMPTY_SCHOLARSHIP_FILTERS);
  const [sortBy, setSortBy] = useState<ScholarshipSortOption>("relevance");
  const [groupBy, setGroupBy] = useState<ScholarshipGroupOption>("none");
  const [facets, setFacets] = useState<ScholarshipFacets>(EMPTY_SCHOLARSHIP_FACETS);
  const [lastFocusRequestId, setLastFocusRequestId] = useState<number | null>(null);
  /**
   * Phones: the faceted panel is a sheet behind one button, so the first
   * scholarship card is not pushed off the screen. From `lg` up the same panel
   * is a sticky sidebar next to the results.
   */
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);
  const activeFilterCount = scholarshipActiveFilterCount(filters);
  if (autoFocusScholarship && autoFocusScholarship.requestId !== lastFocusRequestId) {
    setLastFocusRequestId(autoFocusScholarship.requestId);
    setSearch(autoFocusScholarship.title);
    // Deep link from global search: commit the term at once — there is nothing
    // to debounce, the student already chose the record.
    setDebouncedSearch(autoFocusScholarship.title);
    // A university detail page can deep-link here with just a country: the
    // catalogue opens pre-filtered to that country's awards.
    setFilters({
      ...EMPTY_SCHOLARSHIP_FILTERS,
      country: autoFocusScholarship.country && !autoFocusScholarship.title ? autoFocusScholarship.country : "All",
    });
  }

  // Pagination: exactly 8 rows per page on every screen. The grid below is
  // `grid-cols-1 md:grid-cols-2 xl:grid-cols-3`, so 8 / 16 / 24 cards.
  const perPage = useResponsivePerPage({ base: 1, md: 2, xl: 3 });
  const [page, setPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const resultsTopRef = useRef<HTMLDivElement>(null);
  const restoredFiltersRef = useRef(false);

  // Restore the last selection once, on mount: coming back from a detail page
  // lands on the list the student left, not on a reset catalogue. An explicit
  // deep link (global search, university card) always wins over the stored one.
  useEffect(() => {
    if (restoredFiltersRef.current) return;
    restoredFiltersRef.current = true;
    if (autoFocusScholarship) return;
    // Read in a microtask so the effect body never calls setState synchronously
    // (the same pattern the fetch effect below uses).
    void Promise.resolve().then(() => {
      const stored = readStoredFilters();
      if (!stored) return;
      setFilters(stored.filters);
      setSortBy(stored.sortBy);
      setGroupBy(stored.groupBy);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      window.sessionStorage.setItem(
        SCHOLARSHIP_FILTER_STORAGE_KEY,
        JSON.stringify({ filters, sortBy, groupBy }),
      );
    } catch {
      // Private mode / storage disabled — the hub simply starts fresh next time.
    }
  }, [filters, sortBy, groupBy]);

  // Restart numbering from page 1 whenever the result-set identity changes
  // (filters, search, profile, locale, or page size). Adjusted during render (the
  // React-endorsed alternative to a reset effect), so the debounced fetch
  // below always fires once - already with the correct page.
  const profileFingerprint = profileMatchFingerprint(activeProfile);
  const filtersKey = JSON.stringify(filters);
  const resultKey = [activeProfile?.id, filtersKey, sortBy, groupBy, debouncedSearch, perPage, locale, profileFingerprint].join("|");
  const [prevResultKey, setPrevResultKey] = useState(resultKey);
  if (resultKey !== prevResultKey) {
    setPrevResultKey(resultKey);
    setPage(1);
  }

  const hasLoadedRef = useRef(false);

  // Profile edits must re-score what is on screen — cached slices were computed
  // from the OLD profile data, so drop them before the fingerprint refetch.
  const prevFingerprintRef = useRef(profileFingerprint);
  useEffect(() => {
    if (prevFingerprintRef.current !== profileFingerprint) {
      prevFingerprintRef.current = profileFingerprint;
      invalidateCatalogSwr();
    }
  }, [profileFingerprint]);

  const fetchScholarships = async (signal?: AbortSignal) => {
    const params = new URLSearchParams();
    if (activeProfile?.id) params.set("profileId", activeProfile.id.toString());
    if (filters.country !== "All") params.set("country", filters.country);
    if (filters.degrees.length > 0) params.set("degree", filters.degrees.join(","));
    if (filters.coverages.length > 0) params.set("coverageTypes", filters.coverages.join(","));
    if (filters.statuses.length > 0) params.set("status", filters.statuses.join(","));
    if (filters.basis.length > 0) params.set("basis", filters.basis.join(","));
    if (filters.chance.length > 0) params.set("chance", filters.chance.join(","));
    if (filters.fit.length > 0) params.set("fit", filters.fit.join(","));
    if (sortBy !== "relevance") params.set("sort", sortBy);
    if (groupBy !== "none") params.set("groupBy", groupBy);
    if (debouncedSearch.trim()) params.set("search", debouncedSearch.trim());
    if (
      autoFocusScholarship &&
      debouncedSearch.trim().toLocaleLowerCase() === autoFocusScholarship.title.trim().toLocaleLowerCase()
    ) {
      params.set("focusId", String(autoFocusScholarship.id));
    }
    params.set("page", page.toString());
    params.set("perPage", perPage.toString());
    // Facet counts: what each checkbox would return, computed server-side.
    params.set("facets", "1");
    // Explicit locale: the API localizes the response and the SWR cache key
    // (params.toString()) splits per language, so cached rows never mix.
    params.set("locale", locale);
    const queryKey = params.toString();

    const cached = getCatalogSwr<{
      scholarships: Scholarship[];
      total: number;
      totalPages: number;
      page?: number;
      facets?: ScholarshipFacets;
    }>("scholarships", queryKey);

    if (cached) {
      hasLoadedRef.current = true;
      setScholarships(cached.data.scholarships);
      setMercuryEligibilityReview(null);
      setTotalCount(cached.data.total);
      setTotalPages(cached.data.totalPages);
      if (cached.data.facets) setFacets(cached.data.facets);
      setLoading(false);
      setRefreshing(false);
      // Fresh enough (< 15 s): render it and skip the request entirely.
      // Older: render it instantly and refresh in the background.
      if (!cached.shouldRevalidate) return;
    } else if (hasLoadedRef.current) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }

    try {
      const res = await fetch(`/api/scholarships?${queryKey}`, { signal });
      const data = await res.json();
      hasLoadedRef.current = true;
      const rawEligibility = data.mercuryEligibilityReview && typeof data.mercuryEligibilityReview === "object" && !Array.isArray(data.mercuryEligibilityReview)
        ? data.mercuryEligibilityReview as Record<string, unknown>
        : null;
      setMercuryEligibilityReview(rawEligibility ? {
        available: rawEligibility.available === true,
        probabilityPercent: typeof rawEligibility.probabilityPercent === "number" && Number.isFinite(rawEligibility.probabilityPercent)
          ? Math.max(0, Math.min(100, Math.round(rawEligibility.probabilityPercent)))
          : null,
        deterministicEligibility: typeof rawEligibility.deterministicEligibility === "boolean" ? rawEligibility.deterministicEligibility : null,
      } : null);
      if (data.scholarships) {
        const nextTotal =
          typeof data.total === "number" ? data.total : data.scholarships.length;
        const nextTotalPages =
          typeof data.totalPages === "number" ? Math.max(1, data.totalPages) : 1;
        setScholarships(data.scholarships);
        setTotalCount(nextTotal);
        setTotalPages(nextTotalPages);
        const nextFacets: ScholarshipFacets | undefined =
          data.facets && typeof data.facets === "object"
            ? (data.facets as ScholarshipFacets)
            : undefined;
        if (nextFacets) setFacets(nextFacets);
        setCatalogSwr("scholarships", queryKey, {
          scholarships: data.scholarships,
          total: nextTotal,
          totalPages: nextTotalPages,
          page: data.page,
          facets: nextFacets,
        });
        // The server clamps out-of-range pages - sync so the UI numbering
        // always matches the returned slice.
        if (typeof data.page === "number" && data.page !== page) {
          setPage(data.page);
        }
      }
    } catch (err) {
      // A superseded request is aborted on purpose — never report it.
      if ((err as { name?: string })?.name === "AbortError") return;
      console.error("Error fetching scholarships:", err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  // Debounce only what the student types; every other control fires at once.
  // The timer lives in the change handler (not in an effect), so the state
  // write happens in response to the user's keystroke and the request still
  // fires once per settled term.
  const searchDebounceRef = useRef<number | null>(null);

  useEffect(
    () => () => {
      if (searchDebounceRef.current !== null) window.clearTimeout(searchDebounceRef.current);
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

  // `debouncedSearch` (written by the change handler, or directly by the
  // command palette's deep link) is what the request uses, so the query always
  // matches the filter state the student can see. The previous in-flight
  // request is aborted so a slow response can never overwrite a newer one.
  useEffect(() => {
    const controller = new AbortController();
    // Started in a microtask: the effect body must not call setState
    // synchronously (the fetch begins with the "refreshing" flag).
    void Promise.resolve().then(() => fetchScholarships(controller.signal));
    return () => controller.abort();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeProfile?.id, filtersKey, sortBy, groupBy, debouncedSearch, page, perPage, autoFocusScholarship?.requestId, locale, profileFingerprint]);

  const focusScholarshipId = autoFocusScholarship?.id ?? null;
  const focusRequestId = autoFocusScholarship?.requestId ?? null;
  useEffect(() => {
    if (focusScholarshipId === null || loading) return;
    const target = document.querySelector<HTMLElement>(
      `[data-scholarship-id="${focusScholarshipId}"]`
    );
    if (!target) return;
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    target.scrollIntoView({ behavior: reducedMotion ? "auto" : "smooth", block: "center" });
  }, [focusRequestId, focusScholarshipId, loading, scholarships]);

  // Search + filters run server-side (see fetchScholarships above) so the
  // numbered pages below always match the filtered result set.
  const filtered = scholarships;

  const handlePageChange = (nextPage: number) => {
    setPage(nextPage);
    resultsTopRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  /**
   * Section heading for the chosen grouping. Labels go through the same
   * localizers as the cards, so "Davlat bo'yicha" reads in the student's
   * language instead of echoing canonical English catalogue values.
   */
  const groupHeading = (scholarship: Scholarship, group: ScholarshipGroupOption): string => {
    switch (group) {
      case "country":
        return localizeCountry(scholarship.country, locale) || t("groupUnknown");
      case "degree": {
        const degrees = parseScholarshipDegreeLevels(scholarship.degreeLevels);
        if (degrees.length === 0) return t("groupAnyDegree");
        return degrees.map((degree) => localizeDegreeLevel(degree, locale) || degree).join(" · ");
      }
      case "coverage":
        return localizeCoverageType(scholarship.coverageType, locale) || t("groupUnspecified");
      case "status":
        return t(scholarshipStatusMessageKey(scholarship.computedStatus));
      default:
        return "";
    }
  };

  return (
    <div className="space-y-6">
      {/* Search & Filter toolbar — ONE compact card. The hub header already
          shows the title and intro, so the catalogue repeats neither: the
          localized <h2> stays inline (outline + SSR), the paragraph goes. */}
      <div className="bg-white rounded-2xl p-3 border border-slate-200 shadow-xs space-y-3 sm:p-4">
        <h2 className="flex min-w-0 items-center gap-1.5 text-sm font-extrabold text-slate-900 dark:text-slate-100">
          <Award className="h-4 w-4 shrink-0 text-amber-500" aria-hidden />
          <span className="min-w-0 break-words">{t("title")}</span>
        </h2>

        {/* Toolbar — search, ordering and grouping on the first row; the
            categorical dropdowns (country, degree, funding, status, basis)
            sit right under it, in the same card. No side panel: the cards
            keep their full width. */}
        <div className="grid grid-cols-1 items-start gap-3 pt-2 sm:grid-cols-2 lg:grid-cols-4">
          {/* Search Box */}
          <div className="relative sm:col-span-2">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
            <input
              type="text"
              placeholder={t("searchPlaceholder")}
              aria-label={t("searchPlaceholder")}
              value={search}
              onChange={(e) => onSearchInput(e.target.value)}
              className="min-h-11 w-full pl-9 pr-3 py-2 text-xs sm:text-sm border border-slate-200 rounded-xl focus:ring-2 focus:ring-amber-500 focus:outline-none"
            />
          </div>

          {/* Ordering */}
          <div>
            <label htmlFor="scholarship-sort" className="mb-1 block text-[10px] font-bold uppercase tracking-wide text-slate-400">
              {t("sortLabel")}
            </label>
            <div className="relative">
              <ArrowUpDown className="pointer-events-none absolute left-2.5 top-3.5 h-3.5 w-3.5 text-slate-400" aria-hidden />
              <select
                id="scholarship-sort"
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as ScholarshipSortOption)}
                className="min-h-11 w-full rounded-xl border border-slate-200 bg-white py-2 pl-8 pr-2 text-xs font-medium text-slate-800 focus:ring-2 focus:ring-amber-500 focus:outline-none sm:text-sm"
              >
                {SCHOLARSHIP_SORT_OPTIONS.map((option) => (
                  <option key={option} value={option}>
                    {t(`sortOption.${option}`)}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Grouping */}
          <div>
            <label htmlFor="scholarship-group" className="mb-1 block text-[10px] font-bold uppercase tracking-wide text-slate-400">
              {t("groupLabel")}
            </label>
            <div className="relative">
              <Layers className="pointer-events-none absolute left-2.5 top-3.5 h-3.5 w-3.5 text-slate-400" aria-hidden />
              <select
                id="scholarship-group"
                value={groupBy}
                onChange={(e) => setGroupBy(e.target.value as ScholarshipGroupOption)}
                className="min-h-11 w-full rounded-xl border border-slate-200 bg-white py-2 pl-8 pr-2 text-xs font-medium text-slate-800 focus:ring-2 focus:ring-amber-500 focus:outline-none sm:text-sm"
              >
                {SCHOLARSHIP_GROUP_OPTIONS.map((option) => (
                  <option key={option} value={option}>
                    {t(`groupOption.${option}`)}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Phone-only: the dropdown row collapses behind this button so the
            first card is not pushed off the screen. From `sm` up the row is
            always visible — the controls stay MOUNTED, so a collapsed filter
            keeps its value and its accessible name. */}
        <button
          type="button"
          onClick={() => setMobileFiltersOpen((open) => !open)}
          aria-expanded={mobileFiltersOpen}
          aria-controls="scholarship-filters"
          className="flex min-h-11 w-full items-center justify-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-bold text-slate-700 transition-colors hover:border-amber-400 hover:text-amber-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-500 sm:hidden"
        >
          <Filter className="h-4 w-4" aria-hidden />
          <span className="break-words text-center">{t("filtersTitle")}</span>
          {activeFilterCount > 0 && (
            <span className="sb-ink-on-warm rounded-full bg-amber-500 px-1.5 py-0.5 text-[10px] font-bold text-white">
              {activeFilterCount}
            </span>
          )}
          <ChevronDown className={`h-4 w-4 transition-transform ${mobileFiltersOpen ? "rotate-180" : ""}`} aria-hidden />
        </button>

        <div
          id="scholarship-filters"
          className={`${mobileFiltersOpen ? "block" : "hidden"} sm:block`}
        >
          <ScholarshipFiltersPanel
            filters={filters}
            facets={facets}
            onChange={setFilters}
            onReset={() => setFilters(EMPTY_SCHOLARSHIP_FILTERS)}
            hasProfile={Boolean(activeProfile)}
          />
        </div>
      </div>

      {/* Pillar 3.2 — saved grants lead somewhere: find the universities they
          fund and manage the applications they feed. */}
      {savedScholarshipIds.size > 0 && (
        <div className="mb-3 flex flex-wrap items-center gap-2 rounded-2xl border border-amber-200 bg-amber-50/70 px-3 py-2.5 dark:border-amber-400/30 dark:bg-amber-400/10">
          <p className="min-w-0 flex-1 break-words text-xs font-extrabold text-amber-900 dark:text-amber-100">
            {t("shortlistBanner", { count: savedScholarshipIds.size })}
          </p>
          <div className="flex flex-wrap items-center gap-1.5">
            <button
              type="button"
              onClick={() => window.dispatchEvent(new CustomEvent("scholarbridge:focus-record", { detail: { kind: "universities" } }))}
              className="inline-flex min-h-11 items-center rounded-xl border border-amber-200 bg-white px-3 py-1.5 text-[11px] font-bold text-amber-900 transition-colors hover:bg-amber-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-amber-500 dark:border-amber-400/30 dark:bg-slate-900 dark:text-amber-100"
            >
              <span className="min-w-0 break-words">{t("findUniversities")}</span>
            </button>
            <button
              type="button"
              onClick={() => window.dispatchEvent(new CustomEvent("scholarbridge:focus-record", { detail: { kind: "applications" } }))}
              className="inline-flex min-h-11 items-center rounded-xl border border-amber-200 bg-white px-3 py-1.5 text-[11px] font-bold text-amber-900 transition-colors hover:bg-amber-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-amber-500 dark:border-amber-400/30 dark:bg-slate-900 dark:text-amber-100"
            >
              <span className="min-w-0 break-words">{t("manageApplications")}</span>
            </button>
          </div>
        </div>
      )}

      <div className="min-w-0 space-y-4">
      {/* Results Count */}
      <div ref={resultsTopRef} className="flex items-center justify-between gap-2 text-xs text-slate-500 px-1 scroll-mt-4">
        <span>
          {t("showing", {
            from: totalCount === 0 ? 0 : (page - 1) * perPage + 1,
            to: (page - 1) * perPage + filtered.length,
            total: totalCount,
          })}
        </span>
        <span className="shrink-0">{t("pageOf", { page, totalPages })}</span>
      </div>

      {mercuryEligibilityReview && (
        <aside className="rounded-xl border border-indigo-200 bg-indigo-50/60 p-3 text-xs dark:border-indigo-300/20 dark:bg-indigo-300/10" aria-live="polite">
          <h3 className="font-bold text-indigo-950 dark:text-indigo-100">{t("mercuryReviewTitle")}</h3>
          <p className="mt-1 leading-relaxed text-slate-700 dark:text-slate-200">{t("mercuryReviewDescription")}</p>
          <p className="mt-2 font-semibold text-indigo-900 dark:text-indigo-100">
            {mercuryEligibilityReview.available && mercuryEligibilityReview.probabilityPercent !== null
              ? t("mercuryReviewValue", { percent: mercuryEligibilityReview.probabilityPercent })
              : t("mercuryReviewUnavailable")}
          </p>
        </aside>
      )}

      {/* Grid List */}
      {loading ? (
        // Skeleton cards sized like the real ones — no height jump on load.
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3" aria-busy="true">
          {Array.from({ length: 6 }).map((_, i) => (
            <div
              key={i}
              className="h-[320px] animate-pulse rounded-2xl border border-slate-200 bg-white dark:border-slate-700 dark:bg-[#111a2e]"
            >
              <div className="space-y-3 p-5">
                <div className="h-3 w-1/3 rounded bg-slate-200 dark:bg-slate-700" />
                <div className="h-5 w-3/4 rounded bg-slate-200 dark:bg-slate-700" />
                <div className="h-24 w-full rounded-xl bg-slate-100 dark:bg-slate-800" />
                <div className="h-3 w-1/2 rounded bg-slate-200 dark:bg-slate-700" />
              </div>
            </div>
          ))}
          <span className="sr-only">{t("loading")}</span>
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center sm:p-12">
          <p className="text-sm font-medium text-slate-600">{t("empty")}</p>
          {activeFilterCount > 0 && (
            <button
              type="button"
              onClick={() => setFilters(EMPTY_SCHOLARSHIP_FILTERS)}
              className="mt-3 inline-flex min-h-11 items-center gap-1.5 rounded-xl border border-slate-200 bg-slate-50 px-3 text-xs font-bold text-slate-700 hover:border-indigo-300 hover:text-indigo-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-500"
            >
              <RotateCcw className="h-3.5 w-3.5" aria-hidden />
              {t("filtersClear")}
            </button>
          )}
        </div>
      ) : (
        <div
          className={`grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3 transition-opacity duration-150 ${
            refreshing ? "pointer-events-none opacity-60" : ""
          }`}
          aria-busy={refreshing}
        >
          {filtered.map((s, index) => {
            // A heading is drawn only when the section changes, and it spans the
            // whole grid so the sections stay visually contiguous.
            const heading = groupBy === "none" ? "" : groupHeading(s, groupBy);
            const previousHeading =
              groupBy === "none" || index === 0 ? null : groupHeading(filtered[index - 1], groupBy);
            const showHeading = groupBy !== "none" && heading !== previousHeading;
            const isSaved = savedScholarshipIds.has(s.id);
            const isFocused =
              autoFocusScholarship?.id === s.id &&
              search.trim().toLowerCase() === autoFocusScholarship.title.trim().toLowerCase();
            // NULL score = no profile selected — never show a fake 80%.
            const score = s.matchScore ?? null;

            return (
              <React.Fragment key={s.id}>
                {showHeading && (
                  <h4 className="col-span-full flex items-center gap-1.5 border-b border-slate-200 pb-1.5 text-[11px] font-extrabold uppercase tracking-wide text-slate-500">
                    <Layers className="h-3.5 w-3.5 shrink-0" aria-hidden />
                    <span className="min-w-0 break-words">{heading}</span>
                  </h4>
                )}
              <div
                data-scholarship-id={s.id}
                data-focused-record={isFocused ? "true" : undefined}
                className={`flex h-full flex-col gap-4 rounded-2xl border bg-white p-5 shadow-xs transition-all ${
                  isFocused
                    ? "border-amber-500 ring-2 ring-amber-300 shadow-lg"
                    : "border-slate-200 hover:shadow-lg hover:border-indigo-300"
                }`}
              >
                {/* Header — the provider chip and the fit badge share the first
                    row so the TITLE can use the card's full width. A badge
                    column beside the heading used to squeeze award names such
                    as "NUS Xalqaro Undergraduate Scholarship" into three
                    one-word lines. */}
                <div className="space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    {/* inline-block: a long provider name wraps as ONE chip,
                        not a ragged box per line. Neutral, so amber stays
                        reserved for deadlines and match issues. */}
                    <span
                      className="line-clamp-2 h-9 min-w-0 max-w-full break-words rounded-md border border-slate-200 bg-slate-50 px-2 py-0.5 text-[10px] font-bold uppercase leading-snug tracking-wide text-slate-600 dark:border-slate-700 dark:bg-slate-800/60 dark:text-slate-300"
                      title={`${localizeCountry(s.country, locale)} • ${localizeScholarshipProvider(s.provider, locale)}`}
                    >
                      <CountryFlag country={s.country} size="xs" className="mr-1 align-[-2px]" />
                      {localizeCountry(s.country, locale)} • {localizeScholarshipProvider(s.provider, locale)}
                    </span>

                    {score != null ? (
                      // This number is a FIT/match score (requirements + field +
                      // funding) — labelling it "Eligibility" implied more than the
                      // score means. The hint says what it is, and what it is not.
                      <div className="flex shrink-0 flex-col items-end gap-1">
                        <span
                          className={`px-2.5 py-1 rounded-full text-xs font-extrabold border ${fitBadgeClass(score)}`}
                          title={t("matchHint")}
                        >
                          {t("matchBadge", { score })}
                        </span>
                        {s.matchBreakdown && (
                          <MatchEvidenceBadge
                            comparedDimensions={s.matchBreakdown.comparedDimensions}
                            totalDimensions={s.matchBreakdown.totalDimensions}
                            evidenceCoveragePct={s.matchBreakdown.evidenceCoveragePct}
                            evidenceLevel={s.matchBreakdown.evidenceLevel}
                          />
                        )}
                      </div>
                    ) : (
                      <span className={`px-2.5 py-1 rounded-full text-xs font-bold border shrink-0 ${fitBadgeClass(null)}`}>
                        {t("selectProfile")}
                      </span>
                    )}
                  </div>

                  {/* Full-width, balanced heading: award names stay readable
                      and wrapped lines line up instead of trailing off. */}
                  <h3
                    className="line-clamp-3 min-h-[4.125rem] break-words text-base font-bold leading-snug text-slate-900 [text-wrap:balance]"
                    title={localizeScholarshipTitle(s.title, locale)}
                  >
                    {localizeScholarshipTitle(s.title, locale)}
                  </h3>

                  {/* Computed application status (spec §6) — "is this open
                      right now" stays glanceable on the card face; only the
                      long diagnostics go behind the toggle below. */}
                  {s.computedStatus && (
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span
                        className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-wide ${
                          s.computedStatus === "open"
                            ? "bg-emerald-100 text-emerald-700 border border-emerald-200"
                            : s.computedStatus === "closed"
                            ? "bg-slate-200 text-slate-600 border border-slate-200"
                            : s.computedStatus === "rolling"
                            ? "bg-sky-100 text-sky-700 border border-sky-200"
                            : s.computedStatus === "upcoming"
                            ? "bg-amber-100 text-amber-700 border border-amber-200"
                            : "bg-slate-100 text-slate-500 border border-slate-200"
                        }`}
                      >
                        {s.statusLabel}
                      </span>
                      {s.expectedLabel && (
                        <span className="text-[10px] text-slate-400 italic">({s.expectedLabel})</span>
                      )}
                    </div>
                  )}
                </div>

                {/* Module 1 — this award applies to a university in the
                    student's saved list; 100%-full coverage is called out
                    with the exact names from the catalogue, never invented. */}
                {(s.coveredUniversities?.length ?? 0) > 0 && (
                  <p>
                    <span className="inline-flex max-w-full items-center rounded-lg border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[10px] font-bold leading-snug text-emerald-800 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-200">
                      <span className="min-w-0 break-words">
                        {s.isFullForSavedUni
                          ? t("coversSavedFull", { unis: (s.coveredUniversities ?? []).slice(0, 2).join(", ") })
                          : t("coversSaved", { unis: (s.coveredUniversities ?? []).slice(0, 2).join(", ") })}
                      </span>
                    </span>
                  </p>
                )}

                {/* Key Details Cards */}
                <div className="grid grid-cols-2 gap-3 text-[11px] bg-slate-50 p-3 rounded-xl border border-slate-100">
                  <div className="min-w-0">
                    <span className="text-slate-400 block font-medium">{t("awardValue")}</span>
                    <strong className="break-words text-emerald-700 font-extrabold">{awardLabel(s, t, locale)}</strong>
                  </div>

                  <div className="min-w-0">
                    <span className="text-slate-400 block font-medium">{t("coverage")}</span>
                    <strong className="break-words text-slate-800 font-bold">{localizeCoverageType(s.coverageType, locale)}</strong>
                  </div>

                  <div className="col-span-2 min-w-0">
                    <span className="text-slate-400 block font-medium">{t("deadline")}</span>
                    <strong className="flex min-w-0 items-start gap-1 break-words text-amber-800 font-bold">
                      <Calendar className="mt-0.5 h-3 w-3 shrink-0" />
                      <span className="min-w-0 break-words">{s.deadline}</span>
                    </strong>
                  </div>
                </div>

                {/* Secondary diagnostics — the prose, the per-requirement
                    answers, the score arithmetic, the source footnote and the
                    funding-plan action — collapsed behind a native
                    <details>: static SSR keeps asserting the pills and the
                    breakdown (they are in the markup), while the browser only
                    shows the summary line until asked. */}
                <details className="group rounded-xl border border-slate-200/70 bg-slate-50/60 px-3 py-2 dark:border-slate-800/60 dark:bg-slate-900/40">
                  <summary className="flex min-h-9 cursor-pointer list-none items-center justify-between gap-2 rounded-lg text-xs font-medium text-slate-600 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-indigo-500 dark:text-slate-300 [&::-webkit-details-marker]:hidden">
                    <span className="min-w-0 break-words">{t("cardDetails")}</span>
                    <ChevronDown className="h-3.5 w-3.5 shrink-0 text-slate-400 transition-transform group-open:rotate-180" aria-hidden />
                  </summary>
                  <div className="mt-2 space-y-2.5">
                    {/* Why this match (spec §22) */}
                    {(s.matchReasons?.length || s.matchIssues?.length) && (
                      <div className="space-y-1">
                        {s.matchReasons?.map((r, i) => (
                          <p key={`r${i}`} className="text-[10px] text-emerald-700 flex items-start gap-1">
                            <CheckCircle2 className="h-3 w-3 mt-0.5 shrink-0" />
                            <span><b>{t("strongBecause")}</b> {r}</span>
                          </p>
                        ))}
                        {s.matchIssues?.map((r, i) => (
                          <p key={`p${i}`} className="text-[10px] text-amber-700 flex items-start gap-1">
                            <AlertCircle className="h-3 w-3 mt-0.5 shrink-0" />
                            <span><b>{t("potentialIssue")}</b> {r}</span>
                          </p>
                        ))}
                      </div>
                    )}
                    <MatchBreakdownStrip breakdown={s.matchBreakdown} />

                    {s.description && (
                      <p className="break-words text-xs leading-relaxed text-slate-600">
                        {s.description}
                      </p>
                    )}

                    {/* Requirements Text */}
                    {/* A neutral spec box: requirements are reference data, not a
                        warning. Amber is kept for deadlines and match issues. */}
                    <div className="space-y-1 rounded-xl border border-slate-200/80 bg-white p-2.5 text-xs text-slate-700 dark:border-slate-700 dark:bg-slate-800/60 dark:text-slate-200">
                      <span className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                        {t("requirements")}
                      </span>
                      {/* Priority 4.2 — the published gates, answered per
                          requirement instead of buried in the prose below. */}
                      <ScholarshipRequirementPills scholarship={s} profile={activeProfile} className="mb-1.5" />
                      <p className="text-[11px] leading-relaxed">{s.requirements}</p>
                    </div>

                    {/* Source credibility footnote */}
                    <div className="flex items-center justify-between text-[11px] text-slate-400 border-t border-slate-200/70 pt-2 dark:border-slate-800/60">
                      {s.sourceUrl ? (
                        <a
                          href={s.sourceUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex min-h-11 items-center gap-1 text-slate-500 hover:text-indigo-600 transition-colors"
                        >
                          <ExternalLink className="h-3 w-3" /> {t("source")}
                        </a>
                      ) : (
                        <span className="text-slate-400">{t("sourcePending")}</span>
                      )}
                      {s.sourceLastVerifiedAt ? (
                        <span className="text-slate-400">
                          {t("lastVerified", { date: new Date(s.sourceLastVerifiedAt).toLocaleDateString() })}
                        </span>
                      ) : s.sourceUrl ? (
                        <span className="text-slate-400">{t("lastVerifiedUnknown")}</span>
                      ) : null}
                    </div>

                    {/* Priority 4.2 — one click puts this award into the funding
                        plan, so the plan and the discovery feed stay in sync.
                        Lives with the details it depends on, not in the footer. */}
                    <button
                      type="button"
                      onClick={() => void addToFundingPlan(s)}
                      disabled={fundingBusyId != null || fundingAddedIds.has(s.id)}
                      title={
                        fundingAddedIds.has(s.id)
                          ? t("fundingAddedHint")
                          : activeProfile
                            ? t("fundingAddHint", { title: s.title })
                            : t("fundingNeedsProfile")
                      }
                      className={`flex min-h-11 w-full items-center justify-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-bold transition-colors disabled:cursor-not-allowed ${
                        fundingAddedIds.has(s.id)
                          ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-500/10 dark:text-emerald-200"
                          : "bg-emerald-600 text-white shadow-xs shadow-emerald-600/20 hover:bg-emerald-700 disabled:opacity-60"
                      }`}
                    >
                      {fundingBusyId === s.id ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />
                      ) : fundingAddedIds.has(s.id) ? (
                        <Check className="h-3.5 w-3.5" aria-hidden />
                      ) : (
                        <Wallet className="h-3.5 w-3.5" aria-hidden />
                      )}
                      {fundingAddedIds.has(s.id) ? t("fundingAdded") : t("fundingAdd")}
                    </button>
                  </div>
                </details>

                {/* Actions — one row, two controls: the official portal link
                    and Track/Save. Everything else moved to the drawer. */}
                <div className="mt-auto flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 pt-2">
                  <span className="flex flex-wrap items-center gap-2">
                    <Link
                      // `?from=app` tells the detail page which catalogue the
                      // student came from, so "back" returns HERE (the hub) and
                      // not to the public catalogue.
                      href={`/scholarships/${s.id}?from=app`}
                      className="inline-flex min-h-11 items-center gap-1 rounded-lg bg-slate-100 px-3 text-xs font-semibold text-slate-800 hover:bg-slate-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-indigo-500 dark:bg-slate-800 dark:text-slate-100"
                    >
                      {t("viewDetails")} <ArrowRight className="h-3.5 w-3.5" aria-hidden />
                    </Link>
                    <a
                      href={s.websiteUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex min-h-11 items-center gap-1 rounded-lg px-1 text-xs font-semibold text-indigo-700 hover:text-indigo-900 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-indigo-500"
                    >
                      {t("officialPortal")} <ExternalLink className="h-3.5 w-3.5" />
                    </a>
                  </span>

                  {isSaved ? (
                    <button
                      onClick={() => onUnsaveScholarship(s.id)}
                      className="flex min-h-11 items-center gap-1 px-3 py-1.5 bg-emerald-100 text-emerald-800 font-bold rounded-xl text-xs hover:bg-red-100 hover:text-red-700 transition-colors"
                    >
                      <Check className="h-3.5 w-3.5" />
                      {t("tracked")}
                    </button>
                  ) : (
                    <button
                      onClick={() => onSaveScholarship(s.id)}
                      className="flex min-h-11 items-center gap-1 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl text-xs shadow-xs shadow-indigo-600/20 transition-colors"
                    >
                      <Plus className="h-3.5 w-3.5" />
                      {t("track")}
                    </button>
                  )}
                </div>
              </div>
              </React.Fragment>
            );
          })}
        </div>
      )}

      {/* Numbered pages (Google-style). Renders nothing while loading, when
          empty, or when everything fits on a single page. */}
      {!loading && filtered.length > 0 && (
        <Pagination
          currentPage={page}
          totalPages={totalPages}
          onPageChange={handlePageChange}
        />
      )}
      </div>
      {/* The funding-plan action reports its own outcome inline — no alert(). */}
      {fundingError && (
        <div
          role="alert"
          className="flex items-start justify-between gap-3 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-[12px] font-semibold text-rose-800 dark:border-rose-500/30 dark:bg-rose-500/10 dark:text-rose-200"
        >
          <span className="flex min-w-0 items-start gap-1.5">
            <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
            <span className="min-w-0 break-words whitespace-normal">{fundingError}</span>
          </span>
          <button
            type="button"
            onClick={() => setFundingError("")}
            aria-label={t("dismiss")}
            className="min-h-11 min-w-11 rounded-lg p-1 text-rose-700 hover:bg-rose-100"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      )}

      {/* Standing small print: this panel can be wrong — say so where it is read. */}
      <AppNote kind="catalogue" className="mt-2 border-t border-slate-100 pt-3" />
    </div>
  );
}
