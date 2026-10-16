"use client";

import React, { useState, useEffect, useRef } from "react";
import { useTranslations } from "next-intl";
import { countryTranslationKey, qsCountryOption, withQsTop200Countries } from "@/lib/countries";
import { StudentProfile } from "./Navbar";
import { Pagination } from "./Pagination";
import { useResponsivePerPage } from "@/hooks/useResponsivePerPage";
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
  Filter,
  AlertCircle,
  Wallet,
  Loader2,
  X
} from "lucide-react";
import { formatMoney } from "@/lib/format";
import { AppNote } from "@/components/AppNote";
import { MatchEvidenceBadge } from "@/components/MatchEvidenceBadge";
import { fitBadgeClass } from "@/lib/fitBadge";
import { MatchBreakdownStrip } from "@/components/MatchBreakdownStrip";
import { ScholarshipRequirementPills } from "@/components/ScholarshipRequirementPills";
import { scholarshipFundingPayload } from "@/lib/scholarshipChecks";
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
  // Why this match (spec §22)
  matchReasons?: string[];
  matchIssues?: string[];
  // Computed application status (spec §6)
  computedStatus?: string;
  statusLabel?: string;
  expectedLabel?: string | null;
  sourceUrl?: string | null;
  sourceTitle?: string | null;
  sourceLastVerifiedAt?: string | null;
}

type HubTranslator = (key: string, values?: Record<string, string | number>) => string;

/** Award value label. Every branch is translated (uz/ru included) — the
 *  numeric amount alone is language-neutral, so it keeps `formatMoney`. */
export function awardLabel(s: Scholarship, t: HubTranslator): string {
  if (s.awardBasis === "need_based") return t("awardNeedBased");
  if (s.awardBasis === "full_tuition") return t("awardFullTuition");
  if (s.awardBasis === "variable") return t("awardVariable");
  if (s.awardAmount != null) {
    const period = s.awardPeriod === "year" ? t("perYear") : s.awardPeriod === "month" ? t("perMonth") : "";
    return formatMoney(s.awardAmount, s.awardCurrency, { suffix: period });
  }
  if (s.amountUsdValue != null) return formatMoney(s.amountUsdValue, "USD");
  return s.coverageType && s.coverageType !== "Unspecified" ? s.coverageType : t("awardNotSpecified");
}

const SCHOLARSHIP_FILTER_COUNTRIES = withQsTop200Countries([
  "United States",
  "United Kingdom",
  "Germany",
  "European Union",
  "Canada",
  "Japan",
]);

interface ScholarshipHubProps {
  activeProfile: StudentProfile | null;
  savedScholarshipIds: Set<number>;
  onSaveScholarship: (scholarshipId: number) => Promise<void>;
  onUnsaveScholarship: (scholarshipId: number) => Promise<void>;
  autoFocusScholarship?: { id: number; title: string; requestId: number } | null;
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
  const [scholarships, setScholarships] = useState<Scholarship[]>([]);
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
  const [selectedCountry, setSelectedCountry] = useState("All");
  const [selectedCoverage, setSelectedCoverage] = useState("All");
  const [lastFocusRequestId, setLastFocusRequestId] = useState<number | null>(null);
  if (autoFocusScholarship && autoFocusScholarship.requestId !== lastFocusRequestId) {
    setLastFocusRequestId(autoFocusScholarship.requestId);
    setSearch(autoFocusScholarship.title);
    // Deep link from global search: commit the term at once — there is nothing
    // to debounce, the student already chose the record.
    setDebouncedSearch(autoFocusScholarship.title);
    setSelectedCountry("All");
    setSelectedCoverage("All");
  }

  // Pagination: exactly 8 rows per page on every screen. The grid below is
  // `grid-cols-1 md:grid-cols-2`, so 8 / 16 cards.
  const perPage = useResponsivePerPage({ base: 1, md: 2 });
  const [page, setPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const resultsTopRef = useRef<HTMLDivElement>(null);

  // Restart numbering from page 1 whenever the result-set identity changes
  // (filters, search, profile, or page size). Adjusted during render (the
  // React-endorsed alternative to a reset effect), so the debounced fetch
  // below always fires once - already with the correct page.
  const resultKey = [activeProfile?.id, selectedCountry, selectedCoverage, debouncedSearch, perPage].join("|");
  const [prevResultKey, setPrevResultKey] = useState(resultKey);
  if (resultKey !== prevResultKey) {
    setPrevResultKey(resultKey);
    setPage(1);
  }

  const hasLoadedRef = useRef(false);

  const fetchScholarships = async (signal?: AbortSignal) => {
    if (hasLoadedRef.current) setRefreshing(true);
    else setLoading(true);
    try {
      const params = new URLSearchParams();
      if (activeProfile?.id) params.set("profileId", activeProfile.id.toString());
      if (selectedCountry !== "All") params.set("country", selectedCountry);
      if (selectedCoverage !== "All") params.set("coverageType", selectedCoverage);
      if (debouncedSearch.trim()) params.set("search", debouncedSearch.trim());
      if (
        autoFocusScholarship &&
        debouncedSearch.trim().toLocaleLowerCase() === autoFocusScholarship.title.trim().toLocaleLowerCase()
      ) {
        params.set("focusId", String(autoFocusScholarship.id));
      }
      params.set("page", page.toString());
      params.set("perPage", perPage.toString());

      const res = await fetch(`/api/scholarships?${params.toString()}`, { signal });
      const data = await res.json();
      hasLoadedRef.current = true;
      if (data.scholarships) {
        setScholarships(data.scholarships);
        setTotalCount(
          typeof data.total === "number" ? data.total : data.scholarships.length,
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
  }, [activeProfile?.id, selectedCountry, selectedCoverage, debouncedSearch, page, perPage, autoFocusScholarship?.requestId]);

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

  return (
    <div className="space-y-6">
      {/* Top Banner / Filter */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xs space-y-4">
        <div>
          {/* h2, not h1 — the hub shell above already owns this screen's only
              <h1>, and the stacked duplicate broke the page outline. */}
          <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <Award className="h-5 w-5 text-amber-500" />
            {t("title")}
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            {t("subtitle")}
          </p>
        </div>

        {/* Filter Controls */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
          {/* Search Box */}
          <div className="relative">
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

          {/* Country Filter */}
          <div>
            <select
              value={selectedCountry}
              onChange={(e) => setSelectedCountry(e.target.value)}
              aria-label={t("allCountries")}
              className="min-h-11 w-full px-3 py-2 text-xs sm:text-sm border border-slate-200 rounded-xl focus:ring-2 focus:ring-amber-500 focus:outline-none bg-white"
            >
              <option value="All">{t("allCountries")}</option>
              {SCHOLARSHIP_FILTER_COUNTRIES.map((country) => {
                const countryKey = countryTranslationKey(country);
                const countryOption = qsCountryOption(country);
                const flag = countryOption?.flag ?? (country === "European Union" ? "🇪🇺" : "");
                return (
                  <option key={country} value={country}>
                    {flag ? `${flag} ` : ""}{countryKey ? tCountry(countryKey) : country}
                  </option>
                );
              })}
            </select>
          </div>

          {/* Coverage Filter */}
          <div>
            <select
              value={selectedCoverage}
              onChange={(e) => setSelectedCoverage(e.target.value)}
              aria-label={t("allCoverage")}
              className="min-h-11 w-full px-3 py-2 text-xs sm:text-sm border border-slate-200 rounded-xl focus:ring-2 focus:ring-amber-500 focus:outline-none bg-white"
            >
              <option value="All">{t("allCoverage")}</option>
              <option value="Full Tuition + Stipend">{t("coverageFullStipend")}</option>
              <option value="Full Tuition">{t("coverageFullTuition")}</option>
              <option value="Partial Tuition">{t("coveragePartial")}</option>
            </select>
          </div>
        </div>
      </div>

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

      {/* Grid List */}
      {loading ? (
        // Skeleton cards sized like the real ones — no height jump on load.
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6" aria-busy="true">
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
        <div className="p-12 text-center text-slate-500 bg-white rounded-2xl border border-slate-200">
          {t("empty")}
        </div>
      ) : (
        <div
          className={`grid grid-cols-1 md:grid-cols-2 gap-6 transition-opacity duration-150 ${
            refreshing ? "pointer-events-none opacity-60" : ""
          }`}
          aria-busy={refreshing}
        >
          {filtered.map((s) => {
            const isSaved = savedScholarshipIds.has(s.id);
            const isFocused =
              autoFocusScholarship?.id === s.id &&
              search.trim().toLowerCase() === autoFocusScholarship.title.trim().toLowerCase();
            // NULL score = no profile selected — never show a fake 80%.
            const score = s.matchScore ?? null;

            return (
              <div
                key={s.id}
                data-scholarship-id={s.id}
                data-focused-record={isFocused ? "true" : undefined}
                className={`bg-white rounded-2xl border shadow-xs transition-all p-5 flex flex-col justify-between space-y-4 ${
                  isFocused
                    ? "border-amber-500 ring-2 ring-amber-300 shadow-lg"
                    : "border-slate-200 hover:shadow-lg hover:border-indigo-300"
                }`}
              >
                {/* Header */}
                <div className="space-y-2">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      {/* inline-block: a long provider name wraps as ONE chip,
                          not a ragged box per line. Neutral, so amber stays
                          reserved for deadlines and match issues. */}
                      <span className="inline-block max-w-full break-words rounded-md border border-slate-200 bg-slate-50 px-2 py-0.5 text-[10px] font-bold uppercase leading-snug tracking-wide text-slate-600 dark:border-slate-700 dark:bg-slate-800/60 dark:text-slate-300">
                        {s.country} • {s.provider}
                      </span>
                      <h3 className="font-bold text-base text-slate-900 mt-1">{s.title}</h3>
                    </div>

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

                  {/* Why this match (spec §22) */}
                  {(s.matchReasons?.length || s.matchIssues?.length) && (
                    <div className="mt-2 space-y-1">
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

                  {/* Computed application status (spec §6) */}
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

                  <p className="break-words text-xs leading-relaxed text-slate-600">
                    {s.description}
                  </p>
                </div>

                {/* Key Details Cards */}
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-[11px] bg-slate-50 p-3 rounded-xl border border-slate-100">
                  <div>
                    <span className="text-slate-400 block font-medium">{t("awardValue")}</span>
                    <strong className="text-emerald-700 font-extrabold">{awardLabel(s, t)}</strong>
                  </div>

                  <div>
                    <span className="text-slate-400 block font-medium">{t("coverage")}</span>
                    <strong className="text-slate-800 font-bold">{s.coverageType}</strong>
                  </div>

                  <div>
                    <span className="text-slate-400 block font-medium">{t("deadline")}</span>
                    <strong className="text-amber-800 font-bold flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      {s.deadline}
                    </strong>
                  </div>
                </div>

                {/* Requirements Text */}
                {/* A neutral spec box: requirements are reference data, not a
                    warning. Amber is kept for deadlines and match issues. */}
                <div className="space-y-1 rounded-xl border border-slate-200/80 bg-slate-50 p-2.5 text-xs text-slate-700 dark:border-slate-700 dark:bg-slate-800/60 dark:text-slate-200">
                  <span className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                    {t("requirements")}
                  </span>
                  {/* Priority 4.2 — the published gates, answered per
                      requirement instead of buried in the prose below. */}
                  <ScholarshipRequirementPills scholarship={s} profile={activeProfile} className="mb-1.5" />
                  <p className="text-[11px] leading-relaxed">{s.requirements}</p>
                </div>

                {/* Source credibility footnote */}
                <div className="flex items-center justify-between text-[11px] text-slate-400 border-t border-slate-100 pt-2">
                  {s.sourceUrl ? (
                    <a
                      href={s.sourceUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-slate-500 hover:text-indigo-600 transition-colors"
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

                {/* Actions */}
                <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-100">
                  <a
                    href={s.websiteUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="text-xs font-semibold text-indigo-700 hover:text-indigo-900 flex items-center gap-1"
                  >
                    {t("officialPortal")} <ExternalLink className="h-3.5 w-3.5" />
                  </a>

                  <div className="flex flex-wrap items-center gap-2">
                    {/* Priority 4.2 — one click puts this award into the funding
                        plan, so the plan and the discovery feed stay in sync. */}
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
                      className={`flex min-h-11 items-center gap-1 rounded-xl px-3 py-1.5 text-xs font-bold transition-colors disabled:cursor-not-allowed ${
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

                  {isSaved ? (
                    <button
                      onClick={() => onUnsaveScholarship(s.id)}
                      className="flex items-center gap-1 px-3 py-1.5 bg-emerald-100 text-emerald-800 font-bold rounded-xl text-xs hover:bg-red-100 hover:text-red-700 transition-colors"
                    >
                      <Check className="h-3.5 w-3.5" />
                      {t("tracked")}
                    </button>
                  ) : (
                    <button
                      onClick={() => onSaveScholarship(s.id)}
                      className="flex items-center gap-1 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl text-xs shadow-xs shadow-indigo-600/20 transition-colors"
                    >
                      <Plus className="h-3.5 w-3.5" />
                      {t("track")}
                    </button>
                  )}
                  </div>
                </div>
              </div>
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
