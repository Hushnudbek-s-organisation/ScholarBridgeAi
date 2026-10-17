"use client";

import React, { useEffect, useState } from "react";
import { ShowMoreToggle } from "./hubs/ui";
import { useTranslations } from "next-intl";
import { fitTier } from "@/lib/fitBadge";
import { DegreeLevelLabel } from "./DegreeLevelLabel";
import { normalizeDegreeLevel } from "@/lib/degreeLevels";
import {
  ArrowLeft,
  ExternalLink,
  Globe,
  Loader2,
  MapPin,
  BookOpen,
  GraduationCap,
  DollarSign,
  FileText,
  Calendar,
  CheckCircle2,
  Building2,
  Star,
  ShieldCheck,
  Award,
  ArrowRight,
  Bookmark,
  BookmarkCheck,
  Target,
  Zap,
} from "lucide-react";
import { formatMoney, formatCount, formatNumber } from "@/lib/format";
import { useLocaleContext } from "@/i18n/LocaleProvider";
import { isStaleVerified } from "@/lib/provenance";
import { AppNote } from "@/components/AppNote";
import { MatchEvidenceBadge } from "@/components/MatchEvidenceBadge";
import { DecisionPillStrip } from "./DecisionPillStrip";
import type { DecisionProfileInput } from "@/lib/decisionPills";
import type { MatchBreakdown } from "@/lib/matching";
import { toWikimediaThumb, onWikimediaThumbError } from "@/lib/wikimediaThumb";
import { getCatalogSwr, setCatalogSwr, invalidateCatalogSwr } from "@/lib/clientCatalogSwr";
import { localizeCity, localizeCountry, localizeCoverageType } from "@/lib/catalogLocalizer";
import { profileMatchFingerprint } from "@/lib/profileMatchFingerprint";

interface UniversityDetailData {
  id: number;
  name: string;
  country: string;
  city: string;
  flagEmoji: string;
  worldRanking: number | null;
  universityType: string | null;
  foundedYear: number | null;
  address: string | null;
  internationalStudentsCount: number | null;
  internationalStudentsPercentage: number | null;
  annualTuitionUsd: number | null;
  tuitionCurrency: string;
  livingCostCurrency: string;
  annualLivingEstUsd: number | null;
  accommodationCostUsd: number | null;
  applicationFee: number | null;
  applicationFeeCurrency: string;
  minGpa: number | null;
  minIelts: number | null;
  minSat: number | null;
  acceptanceRate: number | null;
  postStudyWorkVisaYears: number | null;
  description: string;
  websiteUrl: string;
  officialWebsiteUrl: string | null;
  admissionsUrl: string | null;
  internationalAdmissionsUrl: string | null;
  undergraduateAdmissionsUrl: string | null;
  applicationUrl: string | null;
  imageUrl: string | null;
  verificationStatus: string;
  /** Profile fit from the shared matching engine (null when signed out). */
  match?: {
    score: number;
    reasons: string[];
    issues: string[];
    breakdown: MatchBreakdown;
  } | null;
  /**
   * Module 4 — the positioning half of the dual score (admission chance
   * inside the department's admitted cohort). Null when signed out; the
   * UI never paints a score that the API did not compute.
   */
  chance?: {
    score: number;
    effectiveAcceptRatePct: number;
    selectivityCategory: string;
    studentGpaPercentile: number | null;
  } | null;
}

interface ProgramData {
  id: number;
  name: string;
  field: string | null;
  degree: string | null;
  durationYears: number | null;
  durationUnit: string;
  studyMode: string | null;
  language: string | null;
  tuitionAmount: number | null;
  tuitionCurrency: string;
  tuitionPeriod: string;
  applicationDeadline: string | null;
  minIelts: number | null;
  minToefl: number | null;
  minDuolingo: number | null;
  minSat: number | null;
  minAct: number | null;
  minGpa: number | null;
  portfolioRequired: boolean;
  interviewRequired: boolean;
  recommendationRequired: boolean;
  personalStatementRequired: boolean;
  programUrl: string | null;
  applicationUrl: string | null;
  isVerified: boolean;
  // Provenance (spec §19): straight from the DB, never invented.
  sourceUrl: string | null;
  lastVerifiedAt: string | null;
  verificationStatus: string;
  sources: {
    url: string;
    title: string;
    sourceType: string;
    domain: string | null;
    accessedAt: string | null;
    isOfficial: boolean;
    isVerified: boolean;
  }[];
  requirements: {
    requirementType: string;
    minimumValue: number | null;
    valueText: string | null;
    sourceUrl: string | null;
    lastVerifiedAt: string | null;
    verificationStatus: string;
  }[];
}

interface CycleData {
  id: number;
  cycleYear: number;
  academicYear: string | null;
  intake: string | null;
  applicationType: string | null;
  openingDate: string | null;
  deadline: string | null;
  deadlineTimezone: string | null;
  applicationFee: number | null;
  applicationFeeCurrency: string;
  applicationUrl: string | null;
  isVerified: boolean;
  isEstimated: boolean;
  sourceUrl: string | null;
  lastVerifiedAt: string | null;
}

interface ScholarshipData {
  id: number;
  title: string;
  name?: string;
  description: string | null;
  degreeLevels: string | null;
  coverageType: string | null;
  amountUsdValue: number | null;
  deadline: string | null;
  deadlineDate: string | null;
  applicationUrl: string | null;
  websiteUrl: string | null;
  isVerified: boolean;
  eligibilityText?: string;
}

interface SourceData {
  id: number;
  title: string;
  url: string;
  sourceType: string;
  source: {
    url: string;
    title: string;
    domain: string | null;
    accessedAt: string | null;
    isOfficial: boolean;
    isVerified: boolean;
  } | null;
}

interface UniversityDetailProps {
  universityId: number;
  /**
   * The scores and budget the decision strip compares against. Every field is
   * optional: an anonymous visitor or a profile that has not recorded a GPA
   * still gets the strip, with honest "not provided" pills instead of a guess.
   */
  activeProfile?: ({ id: number; country?: string | null } & DecisionProfileInput) | null;
  onBack: () => void;
  /** Priority 4.1 — where the hub wants to go after an application is created. */
  onNavigate?: (id: string) => void;
  onApplicationStarted?: (applicationId: number, universityName: string) => void;
}

/** Stable sentinels for missing values (spec §19: NULL is never shown as a
 *  value). The *wording* is locale-specific and lives in the `university`
 *  namespace — <Field> and the tVal() helper below translate them at render
 *  time, so every locale renders its own wording. */
const NOT_SPECIFIED = "Not specified";
const NOT_AVAILABLE = "Not available";

/**
 * The `/api/universities/[id]` payload. Cached client-side so "Back" renders
 * the page again in 0ms instead of a loading spinner.
 */
interface UniversityDetailPayload {
  university: UniversityDetailData;
  programs?: ProgramData[];
  applicationCycles?: CycleData[];
  cycles?: CycleData[];
  universityRequirements?: any;
  money?: any;
  scholarships?: ScholarshipData[];
  sources?: SourceData[];
  match?: UniversityDetailData["match"] | null;
  chance?: UniversityDetailData["chance"] | null;
}

/** Spec §19: verified vs unavailable. NULL is never shown as a value. */
/** Format money generically for any currency — never assume USD. */
function fmtMoney(v: number | null | undefined, currency = "USD", period = "year"): string {
  return formatMoney(v, currency, { suffix: ` / ${period}`, placeholder: NOT_AVAILABLE });
}

function fmtValue(v: string | number | null | undefined, suffix = ""): string {
  if (v == null || v === "") return NOT_SPECIFIED;
  return `${v}${suffix}`;
}

/** Read a requirement value from the universityRequirements payload.
 *  Values are either { single, range, values } summaries or null.
 *  Falls back gracefully for any shape. */
function req(
  ur: Record<string, any> | null,
  key: string,
  fmt: (v: number) => string
): string {
  const v = ur?.[key];
  if (!v) return NOT_SPECIFIED;
  if (typeof v === "number") return fmt(v);
  if (typeof v.single === "number") return fmt(v.single);
  if (Array.isArray(v.values) && v.values.length > 0) {
    const nums = v.values.filter((x: any) => typeof x === "number");
    if (nums.length === 0) return NOT_SPECIFIED;
    if (nums.length === 1) return fmt(nums[0]);
    const sorted = [...nums].sort((a: number, b: number) => a - b);
    return `${fmt(sorted[0])}–${fmt(sorted[sorted.length - 1])}`;
  }
  if (typeof v.range === "string") {
    const nums = (v.values ?? [v.min, v.max]).filter((x: any) => typeof x === "number");
    if (nums.length === 0) return NOT_SPECIFIED;
    return `${fmt(nums[0])}–${fmt(nums[nums.length - 1])}`;
  }
  return NOT_SPECIFIED;
}

function Field({ label, value, icon }: { label: string; value: string; icon?: React.ReactNode }) {
  const t = useTranslations("university");
  // Missing-value sentinels are translated here so the muted styling follows
  // the per-locale wording.
  const display =
    value === NOT_SPECIFIED ? t("notSpecified") : value === NOT_AVAILABLE ? t("notAvailable") : value;
  const isMissing = value === NOT_SPECIFIED || value === NOT_AVAILABLE;
  return (
    <div className="rounded-xl border border-slate-100 bg-slate-50/60 px-3.5 py-3">
      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wide flex items-center gap-1">
        {icon}
        {label}
      </p>
      <p className={`mt-1 text-sm font-bold ${isMissing ? "text-slate-400" : "text-slate-800"}`}>
        {display}
      </p>
    </div>
  );
}

export function UniversityDetail({
  universityId,
  activeProfile,
  onBack,
  onNavigate,
  onApplicationStarted,
}: UniversityDetailProps) {
  const t = useTranslations("university");
  const { locale } = useLocaleContext();
  // Translate missing-value sentinels for values rendered OUTSIDE <Field>
  // (e.g. program meta rows, scholarship fields).
  const tVal = (v: string) =>
    v === NOT_SPECIFIED ? t("notSpecified") : v === NOT_AVAILABLE ? t("notAvailable") : v;
  const [uni, setUni] = useState<UniversityDetailData | null>(null);
  const [programs, setPrograms] = useState<ProgramData[]>([]);
  const [cycles, setCycles] = useState<CycleData[]>([]);
  const [universityRequirements, setUniversityRequirements] = useState<any>(null);
  const [money, setMoney] = useState<any>(null);
  const [scholarships, setScholarships] = useState<ScholarshipData[]>([]);
  const [sources, setSources] = useState<SourceData[]>([]);
  const [match, setMatch] = useState<UniversityDetailData["match"]>(null);
  const [chance, setChance] = useState<UniversityDetailData["chance"]>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  // Presentation-only UI state (no fetch/API changes)
  const [reqsExpanded, setReqsExpanded] = useState(false);
  const [showAllPrograms, setShowAllPrograms] = useState(false);
  // Clean-UI pass: cycles, awards and sources open as short previews; the
  // full list is one quiet toggle away instead of a page-stretching stack.
  const [showAllCycles, setShowAllCycles] = useState(false);
  const [showAllScholarships, setShowAllScholarships] = useState(false);
  const [showAllSources, setShowAllSources] = useState(false);
  const [expandedProgramReqs, setExpandedProgramReqs] = useState<Record<number, boolean>>({});
  // Saved programs (spec §24) — programId -> saved-row id, for save/unsave.
  const [savedProgramIds, setSavedProgramIds] = useState<Record<number, number>>({});
  const [savingProgramId, setSavingProgramId] = useState<number | null>(null);
  // Priority 4.1 — one-click application launcher, shared with the explorer card.
  const [startingApplication, setStartingApplication] = useState(false);
  const [startAppError, setStartAppError] = useState("");
  const [startAppDone, setStartAppDone] = useState(false);

  /**
   * Copy one API payload into the component state. Used by the network
   * response and by the client-side cache, so both paths produce exactly the
   * same screen.
   */
  const applyDetailPayload = React.useCallback((data: UniversityDetailPayload) => {
    setUni(data.university);
    setPrograms(data.programs || []);
    setCycles(data.applicationCycles || data.cycles || []);
    setUniversityRequirements(data.universityRequirements || null);
    setMoney(data.money || null);
    setScholarships(data.scholarships || []);
    setSources(data.sources || []);
    setMatch(data.match ?? null);
    setChance(data.chance ?? null);
  }, []);

  /**
   * Create the application row for this university and hand the workspace to the
   * hub. The server seeds the checklist from the published requirements, so
   * nothing here invents a to-do list.
   */
  const startApplication = async () => {
    if (!uni || !activeProfile?.id) {
      setStartAppError(t("startAppNeedsProfile"));
      return;
    }
    if (startingApplication) return;
    setStartingApplication(true);
    setStartAppError("");
    setStartAppDone(false);
    try {
      const res = await fetch("/api/applications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          profileId: activeProfile.id,
          universityId: uni.id,
          universityName: uni.name,
          status: "preparing",
        }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        setStartAppError(
          typeof data?.error === "string" && data.error.trim() ? data.error : t("startAppFailed")
        );
        return;
      }
      setStartAppDone(true);
      const applicationId = Number(data?.application?.id);
      if (Number.isInteger(applicationId) && applicationId > 0) {
        onApplicationStarted?.(applicationId, uni.name);
        onNavigate?.("applications/workspace");
      }
    } catch {
      setStartAppError(t("startAppFailed"));
    } finally {
      setStartingApplication(false);
    }
  };

  useEffect(() => {
    if (!activeProfile?.id) return;
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`/api/saved-programs?profileId=${activeProfile.id}`);
        if (res.ok) {
          const data = await res.json();
          if (!cancelled && Array.isArray(data.savedPrograms)) {
            const map: Record<number, number> = {};
            for (const row of data.savedPrograms) {
              if (row.programId) map[row.programId] = row.id;
            }
            setSavedProgramIds(map);
          }
        }
      } catch {
        // Shortlist state is decorative — ignore offline/failed loads.
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [activeProfile?.id]);

  const toggleSaveProgram = async (programId: number) => {
    if (!activeProfile?.id || savingProgramId != null) return;
    const existingRowId = savedProgramIds[programId];
    setSavingProgramId(programId);
    try {
      if (existingRowId != null) {
        await fetch(`/api/saved-programs?id=${existingRowId}`, { method: "DELETE" });
        setSavedProgramIds((prev) => {
          const next = { ...prev };
          delete next[programId];
          return next;
        });
      } else {
        const res = await fetch("/api/saved-programs", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ profileId: activeProfile.id, programId }),
        });
        if (res.ok) {
          const data = await res.json();
          setSavedProgramIds((prev) => ({
            ...prev,
            [programId]: data.saved?.id ?? -1,
          }));
        }
      }
    } catch {
      // Keep the previous state on failure.
    } finally {
      setSavingProgramId(null);
    }
  };

  // Profile edits must re-score the match block on this page — the cached
  // payload was computed from the OLD profile data.
  const profileFingerprint = profileMatchFingerprint(activeProfile);
  const prevFingerprintRef = React.useRef(profileFingerprint);
  useEffect(() => {
    if (prevFingerprintRef.current !== profileFingerprint) {
      prevFingerprintRef.current = profileFingerprint;
      invalidateCatalogSwr("universityDetail");
    }
  }, [profileFingerprint]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      // `locale` is part of the request AND the cache key: switching en↔uz↔ru
      // refetches, and per-language payloads never share a cache slot.
      const params = new URLSearchParams();
      if (activeProfile?.id) params.set("profileId", activeProfile.id.toString());
      params.set("locale", locale);
      const qs = `?${params.toString()}`;
      const cacheKey = `${universityId}${qs}`;
      // The payload the browser already has (the student pressed "Back" a
      // moment ago): render it instantly — no skeleton, no waiting — and
      // only revalidate when the copy is older than 15 seconds.
      const cached = getCatalogSwr<UniversityDetailPayload>("universityDetail", cacheKey);
      if (cached) {
        applyDetailPayload(cached.data);
        setLoading(false);
        setError("");
        if (!cached.shouldRevalidate) return;
      } else {
        setLoading(true);
        setError("");
      }
      try {
        const res = await fetch(`/api/universities/${universityId}${qs}`);
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "load-failed");
        if (!cancelled) {
          applyDetailPayload(data);
          setCatalogSwr("universityDetail", cacheKey, data);
        }
      } catch (err: any) {
        if (!cancelled) setError(err.message || "load-failed");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [universityId, activeProfile?.id, applyDetailPayload, locale, profileFingerprint]);

  if (loading) {
    return (
      <div className="flex items-center justify-center gap-2 p-16 text-xs font-semibold text-slate-500">
        <Loader2 className="h-4 w-4 animate-spin" /> {t("loading")}
      </div>
    );
  }

  if (error || !uni) {
    const errorText = error
      ? error === "load-failed" ? t("loadFailed") : error
      : t("notFound");
    return (
      <div className="rounded-2xl border border-red-200 bg-red-50 p-8 text-center">
        <p className="text-xs font-bold text-red-700">{errorText}</p>
        <button onClick={onBack} className="mt-4 inline-flex min-h-11 items-center gap-1.5 rounded-xl bg-indigo-600 px-4 py-2 text-xs font-bold text-white">
          <ArrowLeft className="h-3.5 w-3.5" /> {t("backToList")}
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Back */}
      <button
        onClick={onBack}
        className="inline-flex min-h-11 items-center gap-1.5 text-xs font-bold text-indigo-600 hover:text-indigo-800"
      >
        <ArrowLeft className="h-3.5 w-3.5" /> {t("backToUnis")}
      </button>

      {/* ===== HERO (spec §2) ===== */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 text-white shadow-xl">
        {uni.imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={toWikimediaThumb(uni.imageUrl, 1200)}
            onError={onWikimediaThumbError(uni.imageUrl)}
            alt=""
            decoding="async"
            className="absolute inset-0 w-full h-full object-cover scale-105"
          />
        ) : (
          <div className="absolute inset-0 opacity-10 bg-[radial-gradient(circle_at_80%_10%,white_1px,transparent_1px)] bg-[length:24px_24px]" />
        )}
        <div className="absolute inset-0 bg-gradient-to-br from-slate-900/85 via-indigo-950/75 to-slate-900/85 backdrop-blur-[2px]" />
        <div className="absolute inset-0 bg-black/10" />
        <div className="relative p-6 sm:p-8">
          <div className="flex flex-col sm:flex-row items-start gap-5">
            <div className="sb-logo-well h-24 w-24 sm:h-28 sm:w-28 rounded-3xl bg-white shadow-2xl border overflow-hidden flex items-center justify-center shrink-0">
              {uni.imageUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={toWikimediaThumb(uni.imageUrl, 320)}
                  onError={onWikimediaThumbError(uni.imageUrl)}
                  alt={`${uni.name} logo`}
                  loading="eager"
                  decoding="async"
                  // The campus photo is landscape: `object-contain` letterboxed
                  // it into a thin strip with white bars. `object-cover` fills
                  // the square emblem cleanly.
                  className="h-full w-full object-cover"
                />
              ) : (
                <div className="sb-ink-on-bright flex flex-col items-center justify-center gap-1">
                  <span className="text-2xl leading-none">{uni.flagEmoji}</span>
                  <Building2 className="h-7 w-7 text-amber-500 dark:text-amber-600" />
                </div>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">{uni.name}</h1>
              </div>
              <p className="text-sm text-indigo-200 mt-1 flex items-center gap-1.5">
                <MapPin className="h-3.5 w-3.5" />
                {localizeCity(uni.city, locale)}, {localizeCountry(uni.country, locale)} {uni.flagEmoji}
              </p>
              {match && (
                <div className="mt-3 space-y-1">
                  <div className="inline-flex flex-wrap items-center gap-2 rounded-xl bg-emerald-400/15 backdrop-blur-md border border-emerald-300/30 px-3 py-1.5">
                    <Target className="h-4 w-4 text-emerald-300" />
                    <span className="text-xs font-bold">
                      {t("fitBadge", { score: match.score, category: t(`fitTier.${fitTier(match.score)}` as never) })}
                    </span>
                  </div>
                  <p className="max-w-xl text-[11px] leading-snug text-indigo-100/90">
                    {t("fitNotChance")}
                    {match.reasons[0] ? ` ${match.reasons[0]}` : ""}
                  </p>
                  <MatchEvidenceBadge
                    comparedDimensions={match.breakdown.comparedDimensions}
                    totalDimensions={match.breakdown.totalDimensions}
                    evidenceCoveragePct={match.breakdown.evidenceCoveragePct}
                    evidenceLevel={match.breakdown.evidenceLevel}
                  />
                </div>
              )}
              {/* Module 4 — the second, INDEPENDENT number beside fit: how this
                  profile sits inside the department's admitted cohort (5-layer
                  positioning engine), with the programme's effective acceptance
                  rate as context. Shown only when the API computed one. */}
              {typeof chance?.score === "number" && (
                <div className="mt-3">
                  <span
                    className="inline-flex flex-wrap items-center gap-1.5 rounded-xl bg-violet-500/20 backdrop-blur-md border border-violet-300/30 px-3 py-1.5 text-xs font-bold"
                    title={chance.selectivityCategory || undefined}
                  >
                    🎯 {t("chanceBadgeLabel", { score: chance.score })}
                    {typeof chance.effectiveAcceptRatePct === "number" && (
                      <span className="font-semibold opacity-90">
                        · {t("chanceAdmitRate", { rate: chance.effectiveAcceptRatePct })}
                      </span>
                    )}
                  </span>
                </div>
              )}
              <div className="mt-3 inline-flex items-center gap-2 rounded-xl bg-white/15 backdrop-blur-md border border-white/20 px-3 py-1.5">
                <Star className="h-4 w-4 fill-amber-300 text-amber-300" />
                <span className="text-xs font-bold">{t("qsRanking")}</span>
                <span className="text-sm font-extrabold text-amber-300">#{formatNumber(uni.worldRanking, { placeholder: "—" })}</span>
              </div>
              {/* Pillar 5.1 — rank-verified state-scholarship eligibility. Stated
                  as a criterion match, never as an award promise. */}
              {uni.worldRanking != null && uni.worldRanking <= 300 && (
                <p className="mt-2 inline-flex max-w-full items-center rounded-xl bg-amber-300/15 px-2.5 py-1 text-[10px] font-bold leading-snug text-amber-100 ring-1 ring-inset ring-amber-300/40">
                  <span className="min-w-0 break-words">{t("exTop300Badge")}</span>
                </p>
              )}
            </div>
            <div className="flex flex-col gap-2 sm:items-end">
              {(() => {
                const site = uni.officialWebsiteUrl || uni.websiteUrl;
                const apply = uni.applicationUrl || uni.internationalAdmissionsUrl || uni.admissionsUrl;
                return (
                  <div className="flex flex-col gap-2 sm:items-end">
                    {site && (
                      <a
                        href={site}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="sb-ink-on-bright inline-flex min-h-11 items-center gap-1.5 rounded-xl bg-white text-slate-900 px-5 py-2.5 text-xs font-bold shadow-lg hover:bg-indigo-50 dark:bg-white dark:text-slate-900 dark:hover:bg-indigo-200"
                      >
                        <Globe className="h-3.5 w-3.5" /> {t("officialWebsite")}
                      </a>
                    )}
                    {apply && (
                      <a
                        href={apply}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex min-h-11 items-center gap-1.5 rounded-xl bg-gradient-to-r from-amber-400 to-yellow-500 text-slate-900 sb-ink-on-warm px-5 py-2.5 text-xs font-bold shadow-lg hover:from-amber-300 hover:to-yellow-400"
                      >
                        <ExternalLink className="h-3.5 w-3.5" /> {t("applyNow")}
                      </a>
                    )}
                  </div>
                );
              })()}
            </div>
          </div>
        </div>
      </div>

      {/* ===== INSTANT DECISION (Priority 4.1) =====
          The three comparisons that decide whether this university is worth an
          application fee — the same engine, and therefore the same answer, as
          the pill strip on the explorer card. */}
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <h2 className="text-base font-extrabold text-slate-900 flex items-center gap-2">
              <Target className="h-4 w-4 text-indigo-600" /> {t("decisionTitle")}
            </h2>
            <p className="mt-1 max-w-2xl text-[11px] leading-relaxed text-slate-500">
              {t("decisionSubtitle")}
            </p>
          </div>
          <button
            type="button"
            onClick={() => void startApplication()}
            disabled={startingApplication || !activeProfile?.id}
            title={activeProfile?.id ? t("startAppHint", { name: uni.name }) : t("startAppNeedsProfile")}
            className="inline-flex min-h-11 items-center gap-1.5 rounded-xl bg-indigo-600 px-4 py-2 text-xs font-bold text-white shadow-xs transition-colors hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {startingApplication ? <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden /> : <Zap className="h-3.5 w-3.5" aria-hidden />}
            {startAppDone ? t("startAppDoneShort") : t("startApp")}
          </button>
        </div>

        <DecisionPillStrip university={uni} profile={activeProfile ?? null} className="mt-3" />

        {/* The published numbers behind the pills, so a verdict can be checked
            rather than trusted. NULL stays "not specified" (spec §19). */}
        <div className="mt-3 grid grid-cols-2 gap-2.5 sm:grid-cols-4">
          <Field label={t("pillFactGpa")} value={uni.minGpa != null ? `${formatNumber(uni.minGpa, { decimals: 2 })} / 4.0` : NOT_SPECIFIED} />
          <Field label={t("pillFactIelts")} value={uni.minIelts != null ? formatNumber(uni.minIelts, { decimals: 1 }) : NOT_SPECIFIED} />
          <Field
            label={t("pillFactTuition")}
            value={fmtMoney(money?.annualTuition ?? uni.annualTuitionUsd, money?.tuitionCurrency ?? "USD", money?.tuitionPeriod ?? "year")}
          />
          <Field label={t("pillFactWorkVisa")} value={uni.postStudyWorkVisaYears != null ? t("pswYears", { years: uni.postStudyWorkVisaYears }) : NOT_SPECIFIED} />
        </div>

        {startAppError && (
          <p role="alert" className="mt-3 break-words rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-[11px] font-semibold text-rose-800 dark:border-rose-500/30 dark:bg-rose-500/10 dark:text-rose-200">
            {startAppError}
          </p>
        )}
        {startAppDone && !startAppError && (
          <p role="status" className="mt-3 break-words rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-[11px] font-semibold text-emerald-800 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-200">
            {t("startAppDone", { name: uni.name })}
          </p>
        )}
      </div>

      {/* ===== ADMISSIONS / APPLICATION CYCLES (spec §2, §3, §12) ===== */}
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
        <h2 className="text-base font-extrabold text-slate-900 flex items-center gap-2">
          <FileText className="h-4 w-4 text-amber-600" /> {t("applicationTitle")}
        </h2>
        {cycles.length === 0 ? (
          <div className="mt-3">
            <p className="text-xs text-slate-400">{t("noCycles")}</p>
            {(() => {
              const apply = uni.applicationUrl || uni.internationalAdmissionsUrl || uni.admissionsUrl;
              const site = uni.officialWebsiteUrl || uni.websiteUrl;
              return (
                <div className="mt-2 flex flex-wrap gap-2">
                  {apply && (
                    <a
                      href={apply}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex min-h-11 items-center gap-1.5 rounded-xl bg-amber-400 text-slate-900 sb-ink-on-warm px-4 py-2 text-xs font-bold hover:bg-amber-300"
                    >
                      <ExternalLink className="h-3.5 w-3.5" /> {t("applyNow")}
                    </a>
                  )}
                  {uni.undergraduateAdmissionsUrl && (
                    <a
                      href={uni.undergraduateAdmissionsUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex min-h-11 items-center gap-1.5 rounded-xl border border-slate-200 px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-50"
                    >
                      <ExternalLink className="h-3.5 w-3.5" /> {t("undergradAdmissions")}
                    </a>
                  )}
                  {uni.admissionsUrl && !apply && (
                    <a
                      href={uni.admissionsUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex min-h-11 items-center gap-1.5 rounded-xl border border-slate-200 px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-50"
                    >
                      <ExternalLink className="h-3.5 w-3.5" /> {t("admissions")}
                    </a>
                  )}
                  {site && (
                    <a
                      href={site}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex min-h-11 items-center gap-1.5 rounded-xl border border-slate-200 px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-50"
                    >
                      <Globe className="h-3.5 w-3.5" /> {t("officialWebsiteLower")}
                    </a>
                  )}
                </div>
              );
            })()}
          </div>
        ) : (
          <div className="mt-3 space-y-3">
            {(showAllCycles ? cycles : cycles.slice(0, 2)).map((c) => (
              <div key={c.id} className="rounded-xl border border-slate-200 p-4">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-sm font-extrabold text-slate-800">
                    {c.intake || t("applicationTitle")} {c.academicYear || c.cycleYear}
                  </span>
                  {c.applicationType && (
                    <span className="rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200 px-2 py-0.5 text-[10px] font-bold">
                      {c.applicationType}
                    </span>
                  )}
                  {c.isEstimated && (
                    <span className="rounded-full bg-amber-50 text-amber-700 border border-amber-200 px-2 py-0.5 text-[10px] font-bold">
                      {t("estimated")}
                    </span>
                  )}
                </div>
                <div className="mt-2.5 grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-[11px]">
                  <div>
                    <span className="text-slate-400 block">{t("opens")}</span>
                    <strong className="text-slate-800">
                      {c.openingDate ? new Date(c.openingDate + "T00:00:00").toLocaleDateString(locale) : t("notAnnounced")}
                    </strong>
                  </div>
                  <div>
                    <span className="text-slate-400 block">{t("deadline")}</span>
                    <strong className="text-slate-800">
                      {c.deadline ? new Date(c.deadline + "T00:00:00").toLocaleDateString(locale) : t("notAnnounced")}
                    </strong>
                  </div>
                  <div>
                    <span className="text-slate-400 block">{t("applicationFee")}</span>
                    <strong className="text-slate-800">
                      {formatMoney(c.applicationFee, c.applicationFeeCurrency)}
                    </strong>
                  </div>
                  <div>
                    <span className="text-slate-400 block">{t("timezone")}</span>
                    <strong className="text-slate-800">
                      {c.deadlineTimezone || t("notSpecified")}
                    </strong>
                  </div>
                  <div className="flex items-end justify-end">
                    {/* APPLY NOW — only with a verified URL (spec §19) */}
                    {c.applicationUrl ? (
                      <a
                        href={c.applicationUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex min-h-11 items-center gap-1 rounded-xl bg-slate-900 text-white px-3.5 py-2 text-[11px] font-bold hover:bg-slate-800"
                      >
                        {t("applyNow")} <ArrowRight className="h-3 w-3" />
                      </a>
                    ) : (
                      <span className="text-[10px] text-slate-400 italic">{t("applyLinkUnavailable")}</span>
                    )}
                  </div>
                </div>
                {/* Provenance (spec §19): an unverified cycle must read as
                    "not confirmed", and the source is linked when we have it. */}
                <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[10px]">
                  {c.isEstimated && <span className="text-amber-600 font-semibold">{t("notConfirmed")}</span>}
                  {c.sourceUrl && (
                    <a
                      href={c.sourceUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex min-h-11 items-center gap-1 font-semibold text-violet-700 hover:underline"
                    >
                      <ExternalLink className="h-3 w-3" /> {t("sourceLink")}
                    </a>
                  )}
                  {c.lastVerifiedAt && (
                    <span className="text-slate-400">
                      {t("lastVerifiedDate")} {new Date(c.lastVerifiedAt).toLocaleDateString(locale)}
                      {isStaleVerified(c.lastVerifiedAt) && ` ${t("staleNote")}`}
                    </span>
                  )}
                </div>
              </div>
            ))}
            <ShowMoreToggle
              className="pt-1"
              totalCount={cycles.length}
              visibleCount={2}
              expanded={showAllCycles}
              onToggle={() => setShowAllCycles((v) => !v)}
            />
          </div>
        )}
      </div>

      {/* ===== LAPTOP (lg+): QUICK FACTS · FINANCIAL OVERVIEW · REQUIREMENTS =====
          On a 1440px screen three full-width cards are a column of narrow
          text. From `lg` the quick facts and the money block sit side by side
          and the requirement grid spans the full width under them. */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
      {/* ===== ABOUT (spec §3) ===== */}
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
        <h2 className="text-base font-extrabold text-slate-900 flex items-center gap-2">
          <BookOpen className="h-4 w-4 text-indigo-600" /> {t("about", { name: uni.name })}
        </h2>
        <div className="mt-3 grid grid-cols-2 sm:grid-cols-4 gap-3">
          <Field label={t("uniType")} value={fmtValue(uni.universityType)} icon={<Building2 className="h-3 w-3" />} />
          <Field label={t("founded")} value={fmtValue(uni.foundedYear)} icon={<Calendar className="h-3 w-3" />} />
          <Field label={t("acceptanceRate")} value={uni.acceptanceRate != null ? `${uni.acceptanceRate}%` : NOT_SPECIFIED} />
          <Field label={t("address")} value={fmtValue(uni.address)} icon={<MapPin className="h-3 w-3" />} />
        </div>
        <p className="mt-4 text-sm text-slate-600 leading-relaxed">
          {uni.description && uni.description !== "" ? uni.description : t("descriptionUnavailable")}
        </p>
      </div>

      {/* ===== ACADEMIC REQUIREMENTS (spec §5) — compact, collapsible ===== */}
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs lg:col-span-2">
        <h2 className="text-base font-extrabold text-slate-900 flex items-center gap-2">
          <GraduationCap className="h-4 w-4 text-indigo-600" /> {t("academicReqs")}
        </h2>

        {/* Score grid: 2-col mobile / 4-col desktop */}
        <div className="mt-3 grid grid-cols-2 sm:grid-cols-4 gap-2.5">
          <Field label="IELTS" value={req(universityRequirements, "ielts", (v) => `${v}`)} />
          <Field label="TOEFL" value={req(universityRequirements, "toefl", (v) => `${v}`)} />
          <Field label="Duolingo" value={req(universityRequirements, "duolingo", (v) => `${v}`)} />
          <Field label="GPA" value={req(universityRequirements, "gpa", (v) => `${v} / 4.0`)} />
          <Field
            label="SAT"
            value={
              universityRequirements?.undergraduateTestsApply === false
                ? t("satNotApplicable")
                : universityRequirements?.satRequired
                ? universityRequirements?.satMinimumPublished
                  ? req(universityRequirements, "sat", (v) => `${v}`)
                  : t("satNoMin")
                : NOT_SPECIFIED
            }
          />
          <Field
            label="ACT"
            value={
              universityRequirements?.undergraduateTestsApply === false
                ? t("satNotApplicable")
                : universityRequirements?.actRequired
                ? universityRequirements?.actMinimumPublished
                  ? req(universityRequirements, "act", (v) => `${v}`)
                  : t("satNoMin")
                : NOT_SPECIFIED
            }
          />
          <Field label="PTE Academic" value={req(universityRequirements, "pte", (v) => `${v}`)} />
          <Field label="Cambridge English" value={req(universityRequirements, "cambridgeEnglish", (v) => `${v}`)} />
        </div>
        {/* The grid summarises every catalogued programme. When the values
            differ per programme it shows a range (e.g. IELTS 7-7.5) — say so,
            otherwise a lower bound reads like the requirement for all of
            them. */}
        <p className="mt-2 break-words text-[11px] leading-relaxed text-slate-500 dark:text-slate-400">{t("catalogueRequirementsScope")}</p>
        {["ielts", "toefl", "duolingo", "gpa", "sat", "act", "pte", "cambridgeEnglish"].some(
          (key) => Array.isArray(universityRequirements?.[key]?.values) && universityRequirements[key].values.length > 1,
        ) && (
          <p className="mt-2 text-[11px] text-amber-700">{t("reqVariesByProgram")}</p>
        )}

        {/* Long text requirements: full-width, clamped by default */}
        {(() => {
          const subjectReqs: string[] = Array.isArray(universityRequirements?.subject) ? universityRequirements.subject : [];
          const otherReqs: string[] = Array.isArray(universityRequirements?.other) ? universityRequirements.other : [];
          const flags = [
            universityRequirements?.portfolioRequired && t("flagPortfolio"),
            universityRequirements?.interviewRequired && t("flagInterview"),
            universityRequirements?.recommendationRequired && t("flagRecommendation"),
            universityRequirements?.personalStatementRequired && t("flagPersonalStatement"),
          ].filter(Boolean) as string[];
          const hasLongContent = subjectReqs.length > 0 || otherReqs.length > 0;
          if (!hasLongContent && flags.length === 0) {
            return (
              <p className="mt-3 text-[11px] text-slate-400 italic">{t("provenanceNote")}</p>
            );
          }
          return (
            <>
              <div className="relative">
                <div
                  className="overflow-hidden transition-[max-height] duration-300 ease-in-out"
                  style={{ maxHeight: reqsExpanded ? "2000px" : "5.5rem" }}
                >
                  {subjectReqs.length > 0 && (
                    <div className="mt-3 w-full rounded-xl border border-slate-100 bg-slate-50/60 px-3.5 py-3">
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">{t("subjectReqs")}</p>
                      <p className="mt-1 text-xs text-slate-700 leading-relaxed">{subjectReqs.join("; ")}</p>
                    </div>
                  )}
                  {otherReqs.length > 0 && (
                    <div className="mt-3 w-full rounded-xl border border-slate-100 bg-slate-50/60 px-3.5 py-3">
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">{t("otherReqs")}</p>
                      <p className="mt-1 text-xs text-slate-700 leading-relaxed">{otherReqs.join("; ")}</p>
                    </div>
                  )}
                  {flags.length > 0 && (
                    <div className="mt-3 flex flex-wrap gap-x-3 gap-y-1 text-[11px] text-slate-600">
                      {flags.map((f) => (
                        <span key={f}>{f}</span>
                      ))}
                    </div>
                  )}
                  <p className="mt-3 text-[11px] text-slate-400 italic">{t("provenanceNote")}</p>
                </div>
                {!reqsExpanded && (
                  <div className="pointer-events-none absolute inset-x-0 bottom-0 h-10 bg-gradient-to-t from-white to-transparent" />
                )}
              </div>
              <button
                type="button"
                onClick={() => setReqsExpanded((v) => !v)}
                className="mt-2 inline-flex min-h-11 items-center gap-1 text-[11px] font-semibold text-slate-500 hover:text-slate-700"
                aria-expanded={reqsExpanded}
              >
                {reqsExpanded ? t("showLess") : t("showMore")}
              </button>
            </>
          );
        })()}
      </div>

      {/* ===== TUITION & COSTS (spec §6) ===== */}
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
        <h2 className="text-base font-extrabold text-slate-900 flex items-center gap-2">
          <DollarSign className="h-4 w-4 text-emerald-600" /> {t("tuitionCosts")}
        </h2>
        <div className="mt-3 grid grid-cols-2 sm:grid-cols-4 gap-3">
          <Field
            label={t("annualTuition")}
            value={fmtMoney(money?.annualTuition ?? uni.annualTuitionUsd, money?.tuitionCurrency ?? "USD", money?.tuitionPeriod ?? "year")}
          />
          <Field
            label={t("livingEstimate")}
            value={fmtMoney(money?.annualLivingEstimate ?? uni.annualLivingEstUsd, money?.livingCostCurrency ?? "USD", money?.livingCostPeriod ?? "year")}
          />
          <Field
            label={t("accommodation")}
            value={fmtMoney(money?.accommodationCost ?? uni.accommodationCostUsd, money?.accommodationCostCurrency ?? "USD", money?.accommodationCostPeriod ?? "year")}
          />
          <Field
            label={t("applicationFee")}
            value={money?.applicationFee != null ? fmtMoney(money.applicationFee, money.applicationFeeCurrency ?? "USD", "application") : NOT_AVAILABLE}
          />
        </div>
      </div>
      </div>

      {/* ===== PROGRAMS (spec §7) ===== */}
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
        <h2 className="text-base font-extrabold text-slate-900 flex items-center gap-2">
          <FileText className="h-4 w-4 text-violet-600" /> {t("programs", { count: programs.length })}
        </h2>
        {programs.length === 0 ? (
          <p className="mt-3 text-xs text-slate-400">{t("noPrograms")}</p>
        ) : (
          <>
            <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-3">
              {(showAllPrograms ? programs : programs.slice(0, 4)).map((p) => {
                const reqsOpen = !!expandedProgramReqs[p.id];
                const hasLongReqs = p.requirements.length > 0;
                return (
                  <div key={p.id} className="rounded-xl border border-slate-200 p-4 hover:border-violet-300 transition-colors">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="text-sm font-extrabold text-slate-800">{p.name}</p>
                        <p className="text-[11px] text-slate-500 mt-0.5">
                          {normalizeDegreeLevel(p.degree) ? <DegreeLevelLabel value={p.degree} /> : tVal(fmtValue(p.degree))} · {p.durationYears != null ? `${p.durationYears} ${p.durationUnit || t("yearsUnit", { years: p.durationYears })}` : t("durationNotSpecified")} · {tVal(fmtValue(p.studyMode))}
                        </p>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        {/* Save to shortlist (spec §24) — only for signed-in students */}
                        {activeProfile?.id != null && (
                          <button
                            type="button"
                            onClick={() => toggleSaveProgram(p.id)}
                            disabled={savingProgramId != null}
                            className={`flex min-h-11 min-w-11 shrink-0 items-center justify-center rounded-lg transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 ${
                              savedProgramIds[p.id] != null
                                ? "bg-violet-600 text-white hover:bg-violet-700"
                                : "text-slate-400 hover:bg-violet-50 hover:text-violet-600"
                            } disabled:opacity-50`}
                            title={savedProgramIds[p.id] != null ? t("removeFromShortlist") : t("saveToShortlist")}
                            aria-pressed={savedProgramIds[p.id] != null}
                          >
                            {savedProgramIds[p.id] != null ? (
                              <BookmarkCheck className="h-4 w-4" />
                            ) : (
                              <Bookmark className="h-4 w-4" />
                            )}
                          </button>
                        )}
                        {p.programUrl && (
                          <a href={p.programUrl} target="_blank" rel="noopener noreferrer" className="text-violet-600 hover:text-violet-800 shrink-0" title={t("viewProgram")}>
                            <ExternalLink className="h-4 w-4" />
                          </a>
                        )}
                      </div>
                    </div>
                    <div className="mt-2.5 flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-slate-600">
                      <span><b>{t("tuitionLabel")}</b> {tVal(fmtMoney(p.tuitionAmount, p.tuitionCurrency))}</span>
                      <span><b>{t("ieltsLabel")}</b> {p.minIelts != null ? p.minIelts : t("notSpecified")}</span>
                      {p.language && <span><b>{t("languageLabel")}</b> {p.language}</span>}
                      {p.applicationDeadline && <span><b>{t("deadlineLabel")}</b> {p.applicationDeadline}</span>}
                    </div>

                    {/* Provenance (spec §19): verification state + sources.
                        Rendered only from DB data — unknown stays unknown,
                        and an unverified program is never shown as verified. */}
                    <div className="mt-2.5 space-y-1.5">
                      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[10px]">
                        {p.verificationStatus === "verified" ? (
                          <span className="inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 font-bold text-emerald-700">
                            <CheckCircle2 className="h-3 w-3" /> {t("verified")}
                            {p.lastVerifiedAt && (
                              <span className="font-medium text-emerald-600">
                                {t("lastVerifiedDate")} {new Date(p.lastVerifiedAt).toLocaleDateString(locale)}
                                {isStaleVerified(p.lastVerifiedAt) && ` ${t("staleNote")}`}
                              </span>
                            )}
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-slate-100 px-2 py-0.5 font-bold text-slate-500">
                            {p.sourceUrl ? t("unverified") : t("programUnverified")}
                          </span>
                        )}
                        {p.sourceUrl && (
                          <a
                            href={p.sourceUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex min-h-11 items-center gap-1 font-semibold text-violet-700 hover:underline"
                            aria-label={`${t("sourceLink")}: ${p.name}`}
                          >
                            <ExternalLink className="h-3 w-3" /> {t("sourceLink")}
                          </a>
                        )}
                      </div>
                      {p.sources.length > 0 && (
                        <ul className="space-y-0.5" aria-label={t("sourcesTitle")}>
                          {p.sources.slice(0, 3).map((s, i) => (
                            <li key={i} className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[10px] text-slate-500">
                              <a
                                href={s.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="font-medium text-violet-700 hover:underline"
                              >
                                {s.title || s.url}
                              </a>
                              <span className="text-[9px] uppercase tracking-wide text-slate-400">{s.sourceType}</span>
                              {s.isOfficial && (
                                <span className="rounded-full border border-blue-200 bg-blue-50 px-1.5 text-[9px] font-bold text-blue-700">
                                  {t("official")}
                                </span>
                              )}
                              {s.accessedAt && (
                                <span className="text-slate-400">
                                  {t("lastChecked")} {new Date(s.accessedAt).toLocaleDateString(locale)}
                                  {isStaleVerified(s.accessedAt) && ` ${t("staleNote")}`}
                                </span>
                              )}
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>

                    {/* Program-specific requirements — clamped to 3 lines until expanded */}
                    {hasLongReqs && (
                      <div className="mt-2.5 rounded-xl bg-slate-50 border border-slate-100 p-2.5">
                        <div
                          className="overflow-hidden transition-[max-height] duration-300 ease-in-out"
                          style={{ maxHeight: reqsOpen ? "2000px" : "3.9rem" }}
                        >
                          <div className="space-y-1">
                            {p.requirements.map((r, i) => (
                              <p key={i} className="text-[11px] text-slate-600">
                                <b className="capitalize">{r.requirementType}:</b>{" "}
                                {r.minimumValue != null ? r.minimumValue : r.valueText ? r.valueText : t("requiredWord")}
                              </p>
                            ))}
                            <div className="flex flex-wrap gap-x-3 gap-y-0.5 pt-1 border-t border-slate-100">
                              {p.portfolioRequired && <span className="text-[10px] text-slate-500">{t("flagPortfolio")}</span>}
                              {p.interviewRequired && <span className="text-[10px] text-slate-500">{t("flagInterview")}</span>}
                              {p.recommendationRequired && <span className="text-[10px] text-slate-500">{t("flagRecommendation")}</span>}
                              {p.personalStatementRequired && <span className="text-[10px] text-slate-500">{t("flagPersonalStatement")}</span>}
                            </div>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() =>
                            setExpandedProgramReqs((prev) => ({ ...prev, [p.id]: !prev[p.id] }))
                          }
                          className="mt-1 inline-flex min-h-11 items-center gap-1 text-[10px] font-semibold text-slate-500 hover:text-slate-700"
                          aria-expanded={reqsOpen}
                        >
                          {reqsOpen ? t("showLess") : t("showMore")}
                        </button>
                      </div>
                    )}

                    {p.applicationUrl && (
                      <a
                        href={p.applicationUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="mt-2.5 inline-flex min-h-11 items-center gap-1 text-[11px] font-bold text-violet-700 hover:underline"
                      >
                        <ExternalLink className="h-3 w-3" /> {t("applyForProgram")}
                      </a>
                    )}
                  </div>
                );
              })}
            </div>
            {programs.length > 4 && (
              <button
                type="button"
                onClick={() => setShowAllPrograms((v) => !v)}
                className="mt-3 inline-flex min-h-11 items-center gap-1 text-xs font-semibold text-slate-500 hover:text-slate-700"
                aria-expanded={showAllPrograms}
              >
                {showAllPrograms ? t("showFewerPrograms") : t("viewAllPrograms", { count: programs.length })}
              </button>
            )}
          </>
        )}
      </div>

      {/* ===== SCHOLARSHIPS (spec §8) ===== */}
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-base font-extrabold text-slate-900 flex items-center gap-2">
            <Award className="h-4 w-4 text-amber-500" /> {t("scholarships", { count: scholarships.length })}
          </h2>
          {/* Pillar 5.1 — the grants catalogue, pre-filtered to THIS country.
              A single click from a university page to every grant it offers. */}
          {uni.country ? (
            <button
              type="button"
              onClick={() => {
                window.dispatchEvent(
                  new CustomEvent("scholarbridge:focus-record", {
                    detail: { kind: "scholarships", country: uni.country },
                  })
                );
              }}
              className="inline-flex min-h-11 items-center gap-1 rounded-xl border border-amber-200 bg-amber-50 px-3 text-[11px] font-bold text-amber-800 transition-colors hover:bg-amber-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-amber-500 dark:border-amber-400/30 dark:bg-amber-400/10 dark:text-amber-200"
            >
              <span className="min-w-0 break-words">{t("exViewCountryScholarships")}</span>
            </button>
          ) : null}
        </div>
        {scholarships.length === 0 ? (
          <p className="mt-3 text-xs text-slate-400">{t("noScholarships")}</p>
        ) : (
          <>
          <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-3">
            {(showAllScholarships ? scholarships : scholarships.slice(0, 3)).map((sch) => {
              const schName = sch.name || sch.title;
              const deadline = sch.deadlineDate || sch.deadline || null;
              const url = sch.applicationUrl || sch.websiteUrl || null;
              return (
                <div key={sch.id} className="rounded-xl border border-slate-200 p-4 hover:border-amber-300 transition-colors">
                  <p className="text-sm font-extrabold text-slate-800">{schName}</p>
                  <p className="text-[11px] text-slate-500 mt-0.5">{sch.coverageType ? localizeCoverageType(sch.coverageType, locale) : t("coverageNotSpecified")}</p>
                  <div className="mt-2 space-y-1 text-[11px] text-slate-600">
                    <p><b>{t("amountLabel")}</b> {formatMoney(sch.amountUsdValue, "USD")}</p>
                    <p><b>{t("deadlineLabel")}</b> {deadline ? new Date(deadline + (deadline.length === 10 ? "T00:00:00" : "")).toLocaleDateString(locale) : t("notAnnounced")}</p>
                    <p><b>{t("eligibilityLabel")}</b> {sch.eligibilityText || t("notSpecified")}</p>
                  </div>
                  {url && (
                    <a
                      href={url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-2.5 inline-flex min-h-11 items-center gap-1 text-[11px] font-bold text-amber-700 hover:underline"
                    >
                      <ExternalLink className="h-3 w-3" /> {t("officialScholarshipPage")}
                    </a>
                  )}
                </div>
              );
            })}
          </div>
          <ShowMoreToggle
            className="mt-3"
            totalCount={scholarships.length}
            visibleCount={3}
            expanded={showAllScholarships}
            onToggle={() => setShowAllScholarships((v) => !v)}
          />
          </>
        )}
      </div>

      {/* ===== POST-STUDY (spec §11) ===== */}
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
        <h2 className="text-base font-extrabold text-slate-900 flex items-center gap-2">
          <CheckCircle2 className="h-4 w-4 text-sky-600" /> {t("postStudyWorkTitle")}
        </h2>
        <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Field
            label={t("pswVisa")}
            value={uni.postStudyWorkVisaYears != null ? t("pswYears", { years: uni.postStudyWorkVisaYears }) : NOT_SPECIFIED}
          />

        </div>
      </div>

      {/* ===== INTERNATIONAL STUDENTS (spec §9) ===== */}
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
        <h2 className="text-base font-extrabold text-slate-900 flex items-center gap-2">
          <Globe className="h-4 w-4 text-teal-600" /> {t("intlStudentsTitle")}
        </h2>
        <div className="mt-3 grid grid-cols-2 sm:grid-cols-3 gap-3">
          <Field
            label={t("intlStudentsCount")}
            value={formatCount(uni.internationalStudentsCount, { placeholder: NOT_AVAILABLE })}
          />
          <Field
            label={t("shareOfStudents")}
            value={uni.internationalStudentsPercentage != null ? `${uni.internationalStudentsPercentage}%` : NOT_AVAILABLE}
          />
        </div>
      </div>

      {/* ===== SOURCES (spec §13) ===== */}
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
        <h2 className="text-base font-extrabold text-slate-900 flex items-center gap-2">
          <ShieldCheck className="h-4 w-4 text-emerald-600" /> {t("sourcesTitle")}
        </h2>
        <div className="mt-3 space-y-2">
          {/* Main website link */}
          {(() => {
            const site = uni.officialWebsiteUrl || uni.websiteUrl;
            if (!site) return null;
            return (
              <a href={site} target="_blank" rel="noopener noreferrer" className="flex min-h-11 min-w-0 items-center gap-2 rounded-xl border border-slate-200 px-3.5 py-2.5 transition-colors hover:border-indigo-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500">
                <Globe className="h-4 w-4 text-indigo-600 shrink-0" />
                <span className="min-w-0 flex-1">
                  <span className="block text-xs font-extrabold text-slate-800">{t("officialUniWebsite")}</span>
                  <span className="block break-all text-[10px] text-slate-400">{site}</span>
                </span>
                <span className="inline-flex items-center gap-0.5 rounded-full bg-emerald-50 border border-emerald-200 px-1.5 py-0.5 text-[9px] font-bold text-emerald-700 shrink-0">
                  <CheckCircle2 className="h-2.5 w-2.5" /> {t("official")}
                </span>
                <ExternalLink className="h-3.5 w-3.5 text-slate-400 shrink-0" />
              </a>
            );
          })()}

          {/* Secondary official links + linked sources, curated: the
              admissions page stays visible, everything longer opens behind
              one Show-more pill (the expanded list is the SAME JSX). */}
          {(() => {
            const extraLinks = [
              { url: uni.admissionsUrl, label: t("admissionsSource"), type: "official_admissions" },
              { url: uni.internationalAdmissionsUrl, label: t("intlAdmissionsSource"), type: "official_international_admissions" },
              { url: uni.undergraduateAdmissionsUrl, label: t("undergradAdmissionsSource"), type: "official_undergraduate_admissions" },
              { url: uni.applicationUrl, label: t("applicationPortal"), type: "official_application_portal" },
            ].filter((link): link is { url: string; label: string; type: string } => Boolean(link.url));
            const total = extraLinks.length + sources.length;
            const visibleCount = showAllSources ? total : Math.min(1, extraLinks.length);
            const visibleLinks = showAllSources ? extraLinks : extraLinks.slice(0, 1);
            const visibleSources = showAllSources ? sources : [];
            return (
              <>
                {visibleLinks.map((link) => (
                  <a key={link.type} href={link.url} target="_blank" rel="noopener noreferrer" className="flex min-h-11 min-w-0 flex-wrap items-center gap-2 rounded-xl border border-slate-200 px-3.5 py-2.5 transition-colors hover:border-indigo-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500">
                    <ExternalLink className="h-4 w-4 text-indigo-600 shrink-0" />
                    <span className="min-w-0 flex-1">
                      <span className="block text-xs font-extrabold text-slate-800">{link.label}</span>
                      <span className="block break-all text-[10px] text-slate-400">{link.url}</span>
                    </span>
                    <span className="shrink-0 text-[10px] font-bold text-slate-500">{t("official")}</span>
                    <ExternalLink className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                  </a>
                ))}
                {visibleSources.map((sc) => {
                  const url = sc.source?.url || sc.url;
                  const title = sc.source?.title || sc.title || t("sourceFallback");
                  const type = sc.sourceType || sc.source?.title ? "official" : "source";
                  return (
                    <a key={sc.id} href={url} target="_blank" rel="noopener noreferrer" className="flex min-h-11 min-w-0 items-center gap-2 rounded-xl border border-slate-200 px-3.5 py-2.5 transition-colors hover:border-indigo-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500">
                      <ShieldCheck className="h-4 w-4 text-emerald-600 shrink-0" />
                      <span className="min-w-0 flex-1">
                        <span className="block text-xs font-extrabold text-slate-800">{title}</span>
                        <span className="block break-all text-[10px] text-slate-400">{url}</span>
                        {sc.source?.accessedAt && (
                          <span className="block text-[10px] text-slate-400">
                            {t("lastChecked")} {new Date(sc.source.accessedAt).toLocaleDateString(locale)}
                            {isStaleVerified(sc.source.accessedAt) && ` ${t("staleNote")}`}
                          </span>
                        )}
                      </span>
                      <span className="shrink-0 text-[10px] font-bold text-slate-500">{t(type === "official" ? "official" : "sourceLink")}</span>
                      {(sc.source?.isOfficial || sc.sourceType !== "ranking") && (
                        <span className="inline-flex items-center gap-0.5 rounded-full bg-emerald-50 border border-emerald-200 px-1.5 py-0.5 text-[9px] font-bold text-emerald-700 shrink-0">
                          <CheckCircle2 className="h-2.5 w-2.5" /> {t("official")}
                        </span>
                      )}
                      <ExternalLink className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                    </a>
                  );
                })}
                <ShowMoreToggle
                  className="pt-1"
                  totalCount={total}
                  visibleCount={visibleCount}
                  expanded={showAllSources}
                  onToggle={() => setShowAllSources((v) => !v)}
                />
              </>
            );
          })()}

          {sources.length === 0 && !uni.admissionsUrl && !uni.applicationUrl && (
            <p className="text-[11px] text-slate-400">{t("noVerifiedSources")}</p>
          )}
        </div>
      </div>
      {/* Standing small print: this panel can be wrong — say so where it is read. */}
      <AppNote kind="catalogue" className="mt-2" />
    </div>
  );
}
