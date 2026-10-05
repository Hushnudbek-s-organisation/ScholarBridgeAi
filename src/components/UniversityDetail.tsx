"use client";

import React, { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
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
} from "lucide-react";
import { formatMoney, formatCount, formatNumber } from "@/lib/format";
import { useLocaleContext } from "@/i18n/LocaleProvider";
import { isStaleVerified } from "@/lib/provenance";
import { AppNote } from "@/components/AppNote";

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
  activeProfile?: { id: number; country?: string | null } | null;
  onBack: () => void;
}

/** Stable sentinels for missing values (spec §19: NULL is never shown as a
 *  value). The *wording* is locale-specific and lives in the `university`
 *  namespace — <Field> and the tVal() helper below translate them at render
 *  time, so every locale renders its own wording. */
const NOT_SPECIFIED = "Not specified";
const NOT_AVAILABLE = "Not available";

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

export function UniversityDetail({ universityId, activeProfile, onBack }: UniversityDetailProps) {
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
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  // Presentation-only UI state (no fetch/API changes)
  const [reqsExpanded, setReqsExpanded] = useState(false);
  const [showAllPrograms, setShowAllPrograms] = useState(false);
  const [expandedProgramReqs, setExpandedProgramReqs] = useState<Record<number, boolean>>({});
  // Saved programs (spec §24) — programId -> saved-row id, for save/unsave.
  const [savedProgramIds, setSavedProgramIds] = useState<Record<number, number>>({});
  const [savingProgramId, setSavingProgramId] = useState<number | null>(null);

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

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError("");
      try {
        const res = await fetch(`/api/universities/${universityId}`);
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "load-failed");
        if (!cancelled) {
          setUni(data.university);
          setPrograms(data.programs || []);
          setCycles(data.applicationCycles || data.cycles || []);
          setUniversityRequirements(data.universityRequirements || null);
          setMoney(data.money || null);
          setScholarships(data.scholarships || []);
          setSources(data.sources || []);
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
  }, [universityId]);

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
        <button onClick={onBack} className="mt-4 inline-flex items-center gap-1.5 rounded-xl bg-indigo-600 px-4 py-2 text-xs font-bold text-white">
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
        className="inline-flex items-center gap-1.5 text-xs font-bold text-indigo-600 hover:text-indigo-800"
      >
        <ArrowLeft className="h-3.5 w-3.5" /> {t("backToUnis")}
      </button>

      {/* ===== HERO (spec §2) ===== */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 text-white shadow-xl">
        {uni.imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={uni.imageUrl}
            alt=""
            className="absolute inset-0 w-full h-full object-cover scale-105"
          />
        ) : (
          <div className="absolute inset-0 opacity-10 bg-[radial-gradient(circle_at_80%_10%,white_1px,transparent_1px)] bg-[length:24px_24px]" />
        )}
        <div className="absolute inset-0 bg-gradient-to-br from-slate-900/85 via-indigo-950/75 to-slate-900/85 backdrop-blur-[2px]" />
        <div className="absolute inset-0 bg-black/10" />
        <div className="relative p-6 sm:p-8">
          <div className="flex flex-col sm:flex-row items-start gap-5">
            <div className="h-24 w-24 sm:h-28 sm:w-28 rounded-3xl bg-white shadow-2xl border border-white/30 overflow-hidden flex items-center justify-center shrink-0">
              {uni.imageUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={uni.imageUrl}
                  alt={`${uni.name} logo`}
                  className="h-full w-full object-contain p-2"
                />
              ) : (
                <div className="flex flex-col items-center justify-center gap-1 text-slate-700">
                  <span className="text-2xl leading-none">{uni.flagEmoji}</span>
                  <Building2 className="h-7 w-7 text-amber-500" />
                </div>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">{uni.name}</h1>
              </div>
              <p className="text-sm text-indigo-200 mt-1 flex items-center gap-1.5">
                <MapPin className="h-3.5 w-3.5" />
                {uni.city}, {uni.country} {uni.flagEmoji}
              </p>
              <div className="mt-3 inline-flex items-center gap-2 rounded-xl bg-white/15 backdrop-blur-md border border-white/20 px-3 py-1.5">
                <Star className="h-4 w-4 fill-amber-300 text-amber-300" />
                <span className="text-xs font-bold">{t("qsRanking")}</span>
                <span className="text-sm font-extrabold text-amber-300">#{formatNumber(uni.worldRanking, { placeholder: "—" })}</span>
              </div>
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
                        className="inline-flex items-center gap-1.5 rounded-xl bg-white text-slate-900 px-5 py-2.5 text-xs font-bold shadow-lg hover:bg-indigo-50"
                      >
                        <Globe className="h-3.5 w-3.5" /> {t("officialWebsite")}
                      </a>
                    )}
                    {apply && (
                      <a
                        href={apply}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-amber-400 to-yellow-500 text-slate-900 sb-ink-on-warm px-5 py-2.5 text-xs font-bold shadow-lg hover:from-amber-300 hover:to-yellow-400"
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
                      className="inline-flex items-center gap-1.5 rounded-xl bg-amber-400 text-slate-900 sb-ink-on-warm px-4 py-2 text-xs font-bold hover:bg-amber-300"
                    >
                      <ExternalLink className="h-3.5 w-3.5" /> {t("applyNow")}
                    </a>
                  )}
                  {uni.undergraduateAdmissionsUrl && (
                    <a
                      href={uni.undergraduateAdmissionsUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-50"
                    >
                      <ExternalLink className="h-3.5 w-3.5" /> {t("undergradAdmissions")}
                    </a>
                  )}
                  {uni.admissionsUrl && !apply && (
                    <a
                      href={uni.admissionsUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-50"
                    >
                      <ExternalLink className="h-3.5 w-3.5" /> {t("admissions")}
                    </a>
                  )}
                  {site && (
                    <a
                      href={site}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-50"
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
            {cycles.map((c) => (
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
                        className="inline-flex items-center gap-1 rounded-xl bg-slate-900 text-white px-3.5 py-2 text-[11px] font-bold hover:bg-slate-800"
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
                      className="inline-flex items-center gap-1 font-semibold text-violet-700 hover:underline"
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
          </div>
        )}
      </div>

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
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
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
                className="mt-2 inline-flex items-center gap-1 text-[11px] font-semibold text-slate-500 hover:text-slate-700"
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
                            className={`rounded-lg p-1.5 transition-colors ${
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
                            className="inline-flex items-center gap-1 font-semibold text-violet-700 hover:underline"
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
                          className="mt-1 inline-flex items-center gap-1 text-[10px] font-semibold text-slate-500 hover:text-slate-700"
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
                        className="mt-2.5 inline-flex items-center gap-1 text-[11px] font-bold text-violet-700 hover:underline"
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
                className="mt-3 inline-flex items-center gap-1 text-xs font-semibold text-slate-500 hover:text-slate-700"
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
        <h2 className="text-base font-extrabold text-slate-900 flex items-center gap-2">
          <Award className="h-4 w-4 text-amber-500" /> {t("scholarships", { count: scholarships.length })}
        </h2>
        {scholarships.length === 0 ? (
          <p className="mt-3 text-xs text-slate-400">{t("noScholarships")}</p>
        ) : (
          <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-3">
            {scholarships.map((sch) => {
              const schName = sch.name || sch.title;
              const deadline = sch.deadlineDate || sch.deadline || null;
              const url = sch.applicationUrl || sch.websiteUrl || null;
              return (
                <div key={sch.id} className="rounded-xl border border-slate-200 p-4 hover:border-amber-300 transition-colors">
                  <p className="text-sm font-extrabold text-slate-800">{schName}</p>
                  <p className="text-[11px] text-slate-500 mt-0.5">{sch.coverageType || t("coverageNotSpecified")}</p>
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
                      className="mt-2.5 inline-flex items-center gap-1 text-[11px] font-bold text-amber-700 hover:underline"
                    >
                      <ExternalLink className="h-3 w-3" /> {t("officialScholarshipPage")}
                    </a>
                  )}
                </div>
              );
            })}
          </div>
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
              <a href={site} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 rounded-xl border border-slate-200 px-3.5 py-2.5 hover:border-indigo-300 transition-colors">
                <Globe className="h-4 w-4 text-indigo-600 shrink-0" />
                <span className="min-w-0 flex-1">
                  <span className="block text-xs font-extrabold text-slate-800">{t("officialUniWebsite")}</span>
                  <span className="block text-[10px] text-slate-400 truncate">{site}</span>
                </span>
                <span className="inline-flex items-center gap-0.5 rounded-full bg-emerald-50 border border-emerald-200 px-1.5 py-0.5 text-[9px] font-bold text-emerald-700 shrink-0">
                  <CheckCircle2 className="h-2.5 w-2.5" /> {t("official")}
                </span>
                <ExternalLink className="h-3.5 w-3.5 text-slate-400 shrink-0" />
              </a>
            );
          })()}

          {/* Other admissions URLs as sources */}
          {[
            { url: uni.admissionsUrl, label: t("admissionsSource"), type: "official_admissions" },
            { url: uni.internationalAdmissionsUrl, label: t("intlAdmissionsSource"), type: "official_international_admissions" },
            { url: uni.undergraduateAdmissionsUrl, label: t("undergradAdmissionsSource"), type: "official_undergraduate_admissions" },
            { url: uni.applicationUrl, label: t("applicationPortal"), type: "official_application_portal" },
          ].map((link) => {
            if (!link.url) return null;
            return (
              <a key={link.type} href={link.url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 rounded-xl border border-slate-200 px-3.5 py-2.5 hover:border-indigo-300 transition-colors">
                <ExternalLink className="h-4 w-4 text-indigo-600 shrink-0" />
                <span className="min-w-0 flex-1">
                  <span className="block text-xs font-extrabold text-slate-800">{link.label}</span>
                  <span className="block text-[10px] text-slate-400 truncate">{link.url}</span>
                </span>
                <span className="text-[10px] font-bold text-slate-500 capitalize shrink-0">{link.type.replace(/_/g, " ")}</span>
                <ExternalLink className="h-3.5 w-3.5 text-slate-400 shrink-0" />
              </a>
            );
          })}

          {/* Linked sources from university_sources */}
          {sources.map((s) => {
            const url = s.source?.url || s.url;
            const title = s.source?.title || s.title || t("sourceFallback");
            const type = s.sourceType || s.source?.title ? "official" : "source";
            return (
              <a key={s.id} href={url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 rounded-xl border border-slate-200 px-3.5 py-2.5 hover:border-indigo-300 transition-colors">
                <ShieldCheck className="h-4 w-4 text-emerald-600 shrink-0" />
                <span className="min-w-0 flex-1">
                  <span className="block text-xs font-extrabold text-slate-800">{title}</span>
                  <span className="block text-[10px] text-slate-400 truncate">{url}</span>
                  {s.source?.accessedAt && (
                    <span className="block text-[10px] text-slate-400">
                      {t("lastChecked")} {new Date(s.source.accessedAt).toLocaleDateString(locale)}
                      {isStaleVerified(s.source.accessedAt) && ` ${t("staleNote")}`}
                    </span>
                  )}
                </span>
                <span className="text-[10px] font-bold text-slate-500 capitalize shrink-0">{type.replace(/_/g, " ")}</span>
                {(s.source?.isOfficial || s.sourceType !== "ranking") && (
                  <span className="inline-flex items-center gap-0.5 rounded-full bg-emerald-50 border border-emerald-200 px-1.5 py-0.5 text-[9px] font-bold text-emerald-700 shrink-0">
                    <CheckCircle2 className="h-2.5 w-2.5" /> {t("official")}
                  </span>
                )}
                <ExternalLink className="h-3.5 w-3.5 text-slate-400 shrink-0" />
              </a>
            );
          })}

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
