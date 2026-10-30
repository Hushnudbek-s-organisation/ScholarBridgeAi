"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { gpaTo40Scale } from "@/lib/gpa";
import { useLocaleContext } from "@/i18n/LocaleProvider";
import { localizeCity, localizeCountry, localizeMajorOrField } from "@/lib/catalogLocalizer";
import CountryFlag from "@/components/CountryFlag";
import { profileMatchFingerprint } from "@/lib/profileMatchFingerprint";
import { TwinStrategyCard } from "./TwinStrategyCard";
import {
  Sparkles,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  ChevronDown,
  ChevronUp,
  Info,
  SlidersHorizontal,
  GraduationCap,
  BarChart3,
  ExternalLink,
  Search,
  Building2,
  Award,
  Layers,
} from "lucide-react";

interface MatchDimensionScore {
  score: number;
  weight: number;
  known: boolean;
  reason?: string;
  issue?: string;
}

interface MatchEvidenceBreakdown {
  academicGpa: MatchDimensionScore;
  englishProficiency: MatchDimensionScore;
  standardizedTest: MatchDimensionScore;
  majorAlignment: MatchDimensionScore;
  degreeLevel: MatchDimensionScore;
  subjectPrerequisites: MatchDimensionScore;
  financialFit: MatchDimensionScore;
  countryPreference: MatchDimensionScore;
  extracurricularStrength: MatchDimensionScore;
  selectivityContext: MatchDimensionScore;
  comparedDimensions: number;
  totalDimensions: number;
  evidenceCoveragePct: number;
  evidenceLevel: "high" | "medium" | "low" | "insufficient";
}

interface QsUniversityBenchmark {
  /** QS 2026 position, or null when the edition does not rank the institution. */
  qsRank: number | null;
  canonicalName: string;
  aliases: string[];
  country: string;
  acceptRatePct: number;
  gpa25: number;
  gpa50: number;
  gpa75: number;
  sat25: number | null;
  sat50: number | null;
  sat75: number | null;
  minIelts: number;
  medianIelts: number;
  minToefl: number;
  officialDomain: string;
  officialUrl: string;
}

interface RequirementCheckItem {
  dimension: "gpa" | "english" | "standardized" | "curriculum" | "portfolio" | "interview";
  label: string;
  status: "met" | "borderline" | "below" | "missing" | "info";
  studentValue: string;
  requiredValue: string;
  detail: string;
}

interface EmpiricalOutcomeSummary {
  totalConsented: number;
  programMatchedCount: number;
  acceptedCount: number;
  rejectedCount: number;
  waitlistedCount: number;
  empiricalAcceptanceRatePct: number | null;
  medianAdmittedGpa: number | null;
  medianAdmittedSat: number | null;
  hasSufficientEmpiricalData: boolean;
}

interface ProgramChanceEvaluation {
  programId: number | null;
  programName: string;
  degreeLevel: string;
  field: string;
  departmentKey: string;
  departmentLabel: string;
  officialProgramUrl: string;
  universityAcceptRatePct: number;
  effectiveProgramAcceptRatePct: number;
  acceptRateMultiplier: number;
  programGpa25: number;
  programGpa50: number;
  programGpa75: number;
  programSat25: number | null;
  programSat50: number | null;
  programSat75: number | null;
  effectiveMinGpa: number;
  effectiveMinIelts: number;
  medianIelts: number;
  effectiveMinToefl: number;
  effectiveMinDet: number;
  effectiveMinSat: number | null;
  effectiveMinAct: number | null;
  studentGpa4: number | null;
  studentGpaPercentile: number | null;
  studentSat: number | null;
  studentSatPercentile: number | null;
  studentEnglishLabel: string | null;
  studentEnglishPercentile: number | null;
  eligibilityStatus: "meets_all" | "borderline" | "below_minimum" | "unknown_inputs";
  requirementChecks: RequirementCheckItem[];
  ibRequirement: string | null;
  aLevelRequirement: string | null;
  apRequirement: string | null;
  subjectRequirements: string | null;
  portfolioRequired: boolean;
  interviewRequired: boolean;
  typicalPrereqs: string[];
  compositeProgramFitScore: number;
  cohortPositionTier: string;
  selectivityCategory: "Safety / Likely" | "Target / Match" | "Reach" | "High Reach / Ultra-Selective";
  degreeCalibrationNote: string;
  strengths: string[];
  gaps: string[];
  empiricalOutcomes: EmpiricalOutcomeSummary;
}

interface UniversityFitAssessment {
  universityId: number;
  universityName: string;
  country?: string;
  city?: string | null;
  flagEmoji?: string;
  worldRanking?: number | null;
  officialWebsiteUrl?: string;
  fitScore: number;
  fitReasons: string[];
  fitIssues: string[];
  comparedDimensions: number;
  totalDimensions: number;
  evidenceCoveragePct: number;
  evidenceLevel: "high" | "medium" | "low" | "insufficient";
  matchBreakdown: MatchEvidenceBreakdown;
  probability: { available: false; reason: "no-validated-methodology" };
  qsBenchmark?: QsUniversityBenchmark;
  programMatches?: ProgramChanceEvaluation[];
  selectedProgramAssessment?: ProgramChanceEvaluation;
  programAssessment?: ProgramChanceEvaluation;
  empiricalOutcomes?: EmpiricalOutcomeSummary;
}

interface CatalogUniversityOption {
  id: number;
  name: string;
  country: string;
  flagEmoji: string;
  worldRanking: number | null;
  acceptRatePct: number;
}

interface ChancingResponse {
  results: UniversityFitAssessment[];
  probability: { available: false; reason: "no-validated-methodology" };
  scenario?: boolean;
  isCatalogSample?: boolean;
  catalogUniversities?: CatalogUniversityOption[];
}

const MAJOR_PRESETS = [
  "Computer Science & Artificial Intelligence",
  "Electrical, Computer & Robotics Engineering",
  "Mechanical & Aerospace Engineering",
  "Civil, Chemical & Environmental Engineering",
  "Data Science, Mathematics & Physics",
  "Business, Finance & Economics",
  "Medicine, Biomedical & Public Health",
  "Biotechnology & Molecular Life Sciences",
  "Law, International Relations & Public Policy",
  "Architecture, Urban Planning & Design",
  "Psychology & Cognitive Neuroscience",
  "Media, Journalism & Communications",
  "Humanities, History & Languages",
  "Education & Social Development",
];

function selectivityBadgeStyles(category: string): string {
  if (category.startsWith("Safety")) {
    return "bg-emerald-50 text-emerald-700 border-emerald-200";
  }
  if (category.startsWith("Target")) {
    return "bg-indigo-50 text-indigo-700 border-indigo-200";
  }
  if (category === "Reach") {
    return "bg-amber-50 text-amber-800 border-amber-200";
  }
  return "bg-rose-50 text-rose-700 border-rose-200";
}

type ChancingTranslator = (key: string) => string;

/* The scoring engine speaks canonical English categories; the badge shows the
   student's language. Unknown future values fall back to the raw string. */
const SELECTIVITY_KEYS: Record<string, string> = {
  "Safety / Likely": "selectSafety",
  "Target / Match": "selectTarget",
  "Reach": "selectReach",
  "High Reach / Ultra-Selective": "selectHighReach",
};
const TIER_KEYS: Record<string, string> = {
  "Above 75th Percentile (Top Quartile)": "tierAbove75",
  "50th–75th Percentile (Upper-Middle Quartile)": "tier5075",
  "25th–50th Percentile (Lower-Middle Quartile)": "tier2550",
  "Below 25th Percentile": "tierBelow25",
};

/** Badge style + translated label for one requirement check. */
function checkStatusBadge(status: RequirementCheckItem["status"], t: ChancingTranslator): {
  className: string;
  label: string;
} {
  switch (status) {
    case "met":
      return { className: "bg-emerald-50 text-emerald-700 border-emerald-200", label: t("badgeMet") };
    case "borderline":
      return { className: "bg-amber-50 text-amber-800 border-amber-200", label: t("badgeBorderline") };
    case "below":
      return { className: "bg-rose-50 text-rose-700 border-rose-200", label: t("badgeBelow") };
    case "missing":
      return { className: "bg-slate-100 text-slate-600 border-slate-200", label: t("badgeMissing") };
    default:
      return { className: "bg-indigo-50 text-indigo-700 border-indigo-200", label: t("badgeRequirement") };
  }
}

export function ChancingPanel({
  profileId: propProfileId,
  activeProfile,
}: {
  profileId?: number | null;
  /** Full student profile — the What-If simulator starts from REAL values,
   *  never from invented defaults like "3.85 / 1480 / 7.5". */
  activeProfile?: {
    id?: number | null;
    gpa?: number | null;
    gpaScale?: number | null;
    ieltsScore?: number | null;
    toeflScore?: number | null;
    duolingoScore?: number | null;
    satScore?: number | null;
    budgetAnnualUsd?: number | null;
    targetMajor?: string | null;
    degreeLevel?: string | null;
  } | null;
}) {
  const profileId = propProfileId ?? activeProfile?.id ?? null;
  const t = useTranslations("chancing");
  const { locale } = useLocaleContext();

  // Scenario defaults derived from the saved profile ("" when not recorded —
  // NULL stays NULL; the sliders simply start unset).
  const profileScenario = useMemo(() => {
    const gpa4 = gpaTo40Scale(activeProfile?.gpa ?? null, activeProfile?.gpaScale ?? null);
    return {
      gpa4: gpa4 != null ? String(gpa4) : "",
      sat: activeProfile?.satScore != null ? String(activeProfile.satScore) : "",
      ielts: activeProfile?.ieltsScore != null ? String(activeProfile.ieltsScore) : "",
      budget: activeProfile?.budgetAnnualUsd != null ? String(activeProfile.budgetAnnualUsd) : "",
      major: activeProfile?.targetMajor ?? "",
      degreeLevel: activeProfile?.degreeLevel || "Bachelor",
    };
  }, [activeProfile]);
  const [results, setResults] = useState<UniversityFitAssessment[]>([]);
  const [catalogUniversities, setCatalogUniversities] = useState<CatalogUniversityOption[]>([]);
  const [isCatalogSample, setIsCatalogSample] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<number | null>(null);

  // University & Program Switcher state
  const [selectedUniFilterId, setSelectedUniFilterId] = useState<string>("");
  const [countryFilter, setCountryFilter] = useState<string>("");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [selectedProgramByUni, setSelectedProgramByUni] = useState<Record<number, number>>({});

  // What-If Simulator state — initialized from the student's real profile and
  // re-synced whenever score-relevant profile fields change.
  const [scenarioGpa4, setScenarioGpa4] = useState(profileScenario.gpa4);
  const [scenarioSat, setScenarioSat] = useState(profileScenario.sat);
  const [scenarioIelts, setScenarioIelts] = useState(profileScenario.ielts);
  const [scenarioBudgetUsd, setScenarioBudgetUsd] = useState(profileScenario.budget);
  const [scenarioMajor, setScenarioMajor] = useState(profileScenario.major);
  const [scenarioDegreeLevel, setScenarioDegreeLevel] = useState(profileScenario.degreeLevel);
  const [scenarioResults, setScenarioResults] = useState<Record<number, UniversityFitAssessment>>({});
  const [scenarioLoading, setScenarioLoading] = useState(false);
  const [scenarioError, setScenarioError] = useState<string | null>(null);

  // Saving score-relevant edits in ProfileModal re-syncs the simulator inputs
  // (and drops scenario results computed from the OLD values).
  const scenarioFingerprint = profileMatchFingerprint(activeProfile);
  useEffect(() => {
    void Promise.resolve().then(() => {
      setScenarioGpa4(profileScenario.gpa4);
      setScenarioSat(profileScenario.sat);
      setScenarioIelts(profileScenario.ielts);
      setScenarioBudgetUsd(profileScenario.budget);
      setScenarioMajor(profileScenario.major);
      setScenarioDegreeLevel(profileScenario.degreeLevel);
      setScenarioResults({});
      setScenarioError(null);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scenarioFingerprint]);

  const load = useCallback(
    async (opts?: { uniId?: string; country?: string; search?: string }) => {
      if (!profileId) return;
      setLoading(true);
      setError(null);
      try {
        const params = new URLSearchParams({
          profileId: String(profileId),
          all: "1",
        });
        const uId = opts?.uniId !== undefined ? opts.uniId : selectedUniFilterId;
        const cFilter = opts?.country !== undefined ? opts.country : countryFilter;
        const sQuery = opts?.search !== undefined ? opts.search : searchQuery;

        if (uId) params.set("universityId", uId);
        if (cFilter) params.set("country", cFilter);
        if (sQuery.trim()) params.set("search", sQuery.trim());

        const res = await fetch(`/api/chancing?${params.toString()}`);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const json = (await res.json()) as ChancingResponse;
        const loadedResults = json.results ?? [];
        setResults(loadedResults);
        setIsCatalogSample(Boolean(json.isCatalogSample));
        if (json.catalogUniversities?.length) {
          setCatalogUniversities(json.catalogUniversities);
        }
        if (loadedResults.length > 0 && expanded === null) {
          setExpanded(loadedResults[0].universityId);
        }
      } catch (e) {
        console.error(e);
        setError(t("loadFailed"));
      } finally {
        setLoading(false);
      }
    },
    [profileId, selectedUniFilterId, countryFilter, searchQuery, expanded, t]
  );

  useEffect(() => {
    // Started in a microtask: the effect body itself must not call setState
    // synchronously (React's rule for effects — `load` sets `loading` first).
    void Promise.resolve().then(() => load());
    // Re-runs on any score-relevant profile edit (fingerprint), not just a
    // profile switch — saved GPA/IELTS changes re-score the list immediately.
  }, [profileId, scenarioFingerprint]); // eslint-disable-line react-hooks/exhaustive-deps

  const availableCountries = useMemo(() => {
    const set = new Set<string>();
    for (const u of catalogUniversities) {
      if (u.country) set.add(u.country);
    }
    return Array.from(set).sort();
  }, [catalogUniversities]);

  const runScenario = async () => {
    if (!profileId) return;
    const params = new URLSearchParams({
      profileId: String(profileId),
      all: "1",
      scenario: "1",
    });
    if (selectedUniFilterId) params.set("universityId", selectedUniFilterId);
    if (countryFilter) params.set("country", countryFilter);
    if (searchQuery.trim()) params.set("search", searchQuery.trim());

    if (scenarioGpa4.trim() !== "") params.set("scenarioGpa4", scenarioGpa4.trim());
    if (scenarioIelts.trim() !== "") params.set("scenarioIelts", scenarioIelts.trim());
    if (scenarioSat.trim() !== "") params.set("scenarioSat", scenarioSat.trim());
    if (scenarioBudgetUsd.trim() !== "") params.set("scenarioBudgetUsd", scenarioBudgetUsd.trim());
    if (scenarioMajor.trim() !== "") params.set("scenarioMajor", scenarioMajor.trim());
    if (scenarioDegreeLevel.trim() !== "") params.set("scenarioDegreeLevel", scenarioDegreeLevel.trim());

    setScenarioLoading(true);
    setScenarioError(null);
    try {
      const res = await fetch(`/api/chancing?${params.toString()}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = (await res.json()) as ChancingResponse;
      setScenarioResults(
        Object.fromEntries((json.results ?? []).map((item) => [item.universityId, item]))
      );
    } catch (e) {
      console.error(e);
      setScenarioError(t("scenarioError"));
    } finally {
      setScenarioLoading(false);
    }
  };

  const resetScenario = () => {
    // "Reset to profile values" — the student's real numbers, not defaults.
    setScenarioGpa4(profileScenario.gpa4);
    setScenarioSat(profileScenario.sat);
    setScenarioIelts(profileScenario.ielts);
    setScenarioBudgetUsd(profileScenario.budget);
    setScenarioMajor(profileScenario.major);
    setScenarioDegreeLevel(profileScenario.degreeLevel);
    setScenarioResults({});
    setScenarioError(null);
  };

  if (!profileId) {
    return (
      <div className="p-6 text-center text-slate-500 border border-dashed border-slate-300 rounded-2xl">
        {t("signIn")}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-indigo-600" />
            {t("title")} &amp; {t("titleSuffix")}
          </h2>
          <p className="text-xs text-slate-500 mt-0.5 max-w-3xl">{t("subtitle")}</p>
        </div>
        <button
          onClick={() => load()}
          disabled={loading}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-indigo-600 hover:text-indigo-800 px-3 py-2 rounded-xl border border-indigo-200 bg-indigo-50"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
          {t("refresh")}
        </button>
      </div>

      {/* 1. University & Program Explorer / Switcher Bar */}
      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Building2 className="w-4 h-4 text-indigo-600" />
            <h3 className="text-sm font-bold text-slate-900">
              {t("switcherTitle", { universityCount: catalogUniversities.length || 174, programCount: 2423 })}
            </h3>
          </div>
          {isCatalogSample && (
            <span className="text-[11px] font-semibold px-2.5 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200">
              {t("showingTopQs")}
            </span>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-4 gap-2.5">
          <label className="text-xs text-slate-600">
              <span className="font-medium block mb-1">{t("jumpToUniversity")}</span>
            <select
              value={selectedUniFilterId}
              onChange={(e) => {
                const val = e.target.value;
                setSelectedUniFilterId(val);
                load({ uniId: val });
              }}
              className="w-full rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs text-slate-900"
            >
              <option value="">{t("shortlistTop")}</option>
              {catalogUniversities.map((u) => (
                <option key={u.id} value={String(u.id)}>
                  {u.worldRanking ? `QS #${u.worldRanking} — ` : ""}
                  {u.name} ({localizeCountry(u.country, locale)})
                </option>
              ))}
            </select>
          </label>

          <label className="text-xs text-slate-600">
            <span className="font-medium block mb-1">{t("filterCountryLabel")}</span>
            <select
              value={countryFilter}
              onChange={(e) => {
                const val = e.target.value;
                setCountryFilter(val);
                setSelectedUniFilterId("");
                load({ uniId: "", country: val });
              }}
              className="w-full rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs text-slate-900"
            >
              <option value="">{t("allCountriesCount", { count: availableCountries.length || 20 })}</option>
              {availableCountries.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </label>

          <label className="text-xs text-slate-600 sm:col-span-2">
            <span className="font-medium block mb-1">{t("searchUniversity")}</span>
            <div className="flex gap-1.5">
              <div className="relative flex-1">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      setSelectedUniFilterId("");
                      load({ uniId: "", search: searchQuery });
                    }
                  }}
                  placeholder={t("searchPlaceholder")}
                  className="w-full rounded-lg border border-slate-200 bg-white pl-8 pr-2.5 py-1.5 text-xs text-slate-900"
                />
              </div>
              <button
                type="button"
                onClick={() => {
                  setSelectedUniFilterId("");
                  load({ uniId: "", search: searchQuery });
                }}
                className="rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-indigo-700"
              >
                Explore
              </button>
              {(selectedUniFilterId || countryFilter || searchQuery) && (
                <button
                  type="button"
                  onClick={() => {
                    setSelectedUniFilterId("");
                    setCountryFilter("");
                    setSearchQuery("");
                    load({ uniId: "", country: "", search: "" });
                  }}
                  className="rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-100"
                >
                  Reset
                </button>
              )}
            </div>
          </label>
        </div>
      </div>

      {/* 2. Interactive What-If Simulator with Sliders & Major/Program Dropdown */}
      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm space-y-3">
        <div className="flex items-start justify-between gap-2">
          <div>
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <SlidersHorizontal className="w-4 h-4 text-indigo-600" />
              {t("scenarioTitle")} — {t("scenarioSimTitle")}
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">{t("scenarioDescription")}</p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          <label className="text-xs text-slate-600 space-y-1">
            <div className="flex items-center justify-between">
              <span className="font-medium">{t("scenarioGpa")}</span>
              <span className="font-bold text-indigo-600">{scenarioGpa4 || "—"}</span>
            </div>
            <input
              type="range"
              min={2.2}
              max={4.0}
              step={0.05}
              value={scenarioGpa4 || "3.7"}
              onChange={(e) => setScenarioGpa4(e.target.value)}
              className="w-full accent-indigo-600"
            />
            <input
              type="number"
              min={0}
              max={4}
              step={0.05}
              value={scenarioGpa4}
              onChange={(e) => setScenarioGpa4(e.target.value)}
              placeholder="3.85"
              className="w-full rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs text-slate-900"
            />
          </label>

          <label className="text-xs text-slate-600 space-y-1">
            <div className="flex items-center justify-between">
              <span className="font-medium">{t("scenarioSat")}</span>
              <span className="font-bold text-indigo-600">{scenarioSat || "—"}</span>
            </div>
            <input
              type="range"
              min={1050}
              max={1600}
              step={10}
              value={scenarioSat || "1450"}
              onChange={(e) => setScenarioSat(e.target.value)}
              className="w-full accent-indigo-600"
            />
            <input
              type="number"
              min={400}
              max={1600}
              step={10}
              value={scenarioSat}
              onChange={(e) => setScenarioSat(e.target.value)}
              placeholder="1480"
              className="w-full rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs text-slate-900"
            />
          </label>

          <label className="text-xs text-slate-600 space-y-1">
            <div className="flex items-center justify-between">
              <span className="font-medium">{t("scenarioIelts")}</span>
              <span className="font-bold text-indigo-600">{scenarioIelts || "—"}</span>
            </div>
            <input
              type="range"
              min={5.5}
              max={9.0}
              step={0.5}
              value={scenarioIelts || "7.5"}
              onChange={(e) => setScenarioIelts(e.target.value)}
              className="w-full accent-indigo-600"
            />
            <input
              type="number"
              min={0}
              max={9}
              step={0.5}
              value={scenarioIelts}
              onChange={(e) => setScenarioIelts(e.target.value)}
              placeholder="7.5"
              className="w-full rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs text-slate-900"
            />
          </label>

          <label className="text-xs text-slate-600 space-y-1">
            <span className="font-medium block">{t("scenarioDegreeLevel")}</span>
            <select
              value={scenarioDegreeLevel}
              onChange={(e) => setScenarioDegreeLevel(e.target.value)}
              className="w-full rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs text-slate-900 mt-1"
            >
              <option value="Bachelor">{t("degreeBachelor")}</option>
              <option value="Master">{t("degreeMaster")}</option>
              <option value="PhD">{t("degreePhd")}</option>
            </select>
          </label>

          <label className="text-xs text-slate-600 space-y-1">
            <span className="font-medium block">{t("scenarioMajor")}</span>
            <select
              value={scenarioMajor}
              onChange={(e) => setScenarioMajor(e.target.value)}
              className="w-full rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs text-slate-900 mt-1"
            >
              <option value="">{t("useProfileMajor")}</option>
              {MAJOR_PRESETS.map((m) => (
                <option key={m} value={m}>
                  {localizeMajorOrField(m, locale)}
                </option>
              ))}
            </select>
          </label>

          <label className="text-xs text-slate-600 space-y-1">
            <span className="font-medium block">{t("scenarioBudget")}</span>
            <input
              type="number"
              min={0}
              step={1000}
              value={scenarioBudgetUsd}
              onChange={(e) => setScenarioBudgetUsd(e.target.value)}
              placeholder="25000"
              className="w-full rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs text-slate-900 mt-1"
            />
          </label>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
          <p className="text-[11px] text-slate-500">{t("scenarioDisclaimer")}</p>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={runScenario}
              disabled={scenarioLoading}
              className="rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-indigo-700 disabled:opacity-50"
            >
              {scenarioLoading ? t("scenarioRunning") : t("scenarioRun")}
            </button>
            {Object.keys(scenarioResults).length > 0 && (
              <button
                type="button"
                onClick={resetScenario}
                className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
              >
                {t("scenarioReset")}
              </button>
            )}
          </div>
        </div>
        {scenarioError && <div className="text-xs text-red-600">{scenarioError}</div>}
      </div>

      {error && (
        <div className="p-4 bg-red-50 text-red-700 text-sm rounded-xl border border-red-200">
          {error}
        </div>
      )}

      {loading && results.length === 0 ? (
        <div className="p-8 text-center text-slate-400 text-sm">{t("assessing")}</div>
      ) : results.length === 0 ? (
        <div className="p-8 text-center text-slate-500 border border-dashed border-slate-300 rounded-2xl text-sm">
          {t("empty")}
        </div>
      ) : (
        <div className="space-y-4">
          {results.map((baseItem) => {
            const scenarioItem = scenarioResults[baseItem.universityId];
            const activeItem = scenarioItem ?? baseItem;
            const open = expanded === baseItem.universityId;
            const scenarioDelta = scenarioItem ? scenarioItem.fitScore - baseItem.fitScore : null;

            const programList = activeItem.programMatches ?? [];
            const chosenProgId = selectedProgramByUni[baseItem.universityId];
            const activeProgram: ProgramChanceEvaluation | undefined =
              (chosenProgId != null
                ? programList.find((p) => p.programId === chosenProgId)
                : undefined) ??
              activeItem.selectedProgramAssessment ??
              programList[0];

            const baseProgram: ProgramChanceEvaluation | undefined =
              (chosenProgId != null
                ? (baseItem.programMatches ?? []).find((p) => p.programId === chosenProgId)
                : undefined) ??
              baseItem.selectedProgramAssessment ??
              (baseItem.programMatches ?? [])[0];

            const progDelta =
              scenarioItem && activeProgram && baseProgram
                ? activeProgram.compositeProgramFitScore - baseProgram.compositeProgramFitScore
                : null;

            const qsBench = activeItem.qsBenchmark;
            // The verified QS 2026 position from `universities.world_ranking`
            // wins; the curated table is only a fallback, and a null there
            // means "the edition does not rank it" — then nothing is printed.
            const displayRank = activeItem.worldRanking ?? qsBench?.qsRank ?? null;

            return (
              <div
                key={baseItem.universityId}
                className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5 shadow-sm transition hover:shadow-md space-y-4"
              >
                {/* Top University Row */}
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      {displayRank != null && (
                        <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-indigo-600 text-white">
                          QS #{displayRank}
                        </span>
                      )}
                      {activeProgram && (
                        <span
                          className={`text-xs font-bold px-2.5 py-0.5 rounded-full border ${selectivityBadgeStyles(
                            activeProgram.selectivityCategory
                          )}`}
                        >
                          {SELECTIVITY_KEYS[activeProgram.selectivityCategory]
                          ? t(SELECTIVITY_KEYS[activeProgram.selectivityCategory])
                          : activeProgram.selectivityCategory}
                        </span>
                      )}
                      {activeProgram && (
                        <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-700 border border-slate-200">
                          {TIER_KEYS[activeProgram.cohortPositionTier]
                          ? t(TIER_KEYS[activeProgram.cohortPositionTier])
                          : activeProgram.cohortPositionTier}
                        </span>
                      )}
                      <span className="text-[11px] font-medium px-2 py-0.5 rounded-full bg-slate-50 text-slate-600 border border-slate-200">
                        {t("fitBadge")}
                      </span>
                    </div>

                    <div className="mt-2 flex flex-wrap items-center gap-2">
                      <h3 className="flex min-w-0 flex-wrap items-center gap-1.5 font-bold text-slate-900 text-base sm:text-lg">
                        <CountryFlag country={baseItem.country} flagEmoji={baseItem.flagEmoji} size="sm" />
                        <span className="min-w-0 break-words">{baseItem.universityName}</span>
                      </h3>
                      {baseItem.country && (
                        <span className="text-xs text-slate-500">
                          · {baseItem.city ? `${localizeCity(baseItem.city, locale)}, ` : ""}
                          {localizeCountry(baseItem.country, locale)}
                        </span>
                      )}
                    </div>

                    <p className="text-xs text-slate-500 mt-0.5">
                      {t("comparedDimensions", {
                        compared: activeItem.comparedDimensions,
                        total: activeItem.totalDimensions,
                      })}
                    </p>
                  </div>

                  {/* Right Score Pillars */}
                  <div className="flex items-center gap-4">
                    {activeProgram && (
                      <div className="text-right pr-3 border-r border-slate-200">
                        <div className="text-2xl font-extrabold text-indigo-600">
                          {activeProgram.compositeProgramFitScore}%
                        </div>
                        <div className="text-[11px] font-medium text-slate-500">
                          {t("programPositioning")}
                        </div>
                        {progDelta !== null && progDelta !== 0 && (
                          <div className="text-[11px] font-semibold text-emerald-700">
                            {progDelta > 0 ? `+${progDelta}%` : `${progDelta}%`} {t("scenarioBadgeWord")}
                          </div>
                        )}
                      </div>
                    )}
                    <div className="text-right">
                      <div className="text-2xl font-extrabold text-slate-900">
                        {activeItem.fitScore}
                      </div>
                      <div className="text-[11px] text-slate-500">{t("fitScore")}</div>
                      {scenarioItem && (
                        <div className="mt-0.5 text-[11px] font-semibold text-indigo-700">
                          {scenarioDelta === 0
                            ? t("scenarioNoChange")
                            : t("scenarioDelta", {
                                delta: `${scenarioDelta! > 0 ? "+" : ""}${scenarioDelta}`,
                              })}
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Program Selector & University vs Program Selectivity Strip */}
                {activeProgram && (
                  <div className="rounded-xl border border-slate-200 bg-slate-50 p-3.5 space-y-3">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <GraduationCap className="w-4 h-4 text-indigo-600" />
                        <span className="text-xs font-bold text-slate-800">{t("selectedProgram")}</span>
                        {programList.length > 1 ? (
                          <select
                            value={String(activeProgram.programId ?? "")}
                            onChange={(e) =>
                              setSelectedProgramByUni((prev) => ({
                                ...prev,
                                [baseItem.universityId]: Number(e.target.value),
                              }))
                            }
                            className="rounded-lg border border-slate-300 bg-white px-2.5 py-1 text-xs font-semibold text-slate-900"
                          >
                            {programList.map((prog, idx) => (
                              <option key={`${prog.programId ?? idx}`} value={String(prog.programId ?? "")}>
                                {prog.programName} ({prog.degreeLevel}) — {prog.effectiveProgramAcceptRatePct}% est. offer rate
                              </option>
                            ))}
                          </select>
                        ) : (
                          <span className="text-xs font-semibold text-slate-900">
                            {activeProgram.programName} ({activeProgram.degreeLevel})
                          </span>
                        )}
                        <span className="text-[11px] px-2 py-0.5 rounded-md bg-white border border-slate-200 text-slate-600">
                          {activeProgram.departmentLabel}
                        </span>
                      </div>

                      {activeProgram.officialProgramUrl && (
                        <a
                          href={activeProgram.officialProgramUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-xs font-semibold text-indigo-600 hover:text-indigo-800"
                        >
                          Official Admissions Page
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      )}
                    </div>

                    {/* Selectivity Comparison Metrics */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-xs">
                      <div className="rounded-lg bg-white p-2.5 border border-slate-200">
                        <div className="text-[11px] text-slate-500">{t("offerRate")}</div>
                        <div className="text-sm font-bold text-slate-900 mt-0.5">
                          {activeProgram.universityAcceptRatePct}%
                        </div>
                      </div>
                      <div className="rounded-lg bg-white p-2.5 border border-slate-200">
                        <div className="text-[11px] text-slate-500">
                          Program Offer Rate ({activeProgram.acceptRateMultiplier}x)
                        </div>
                        <div className="text-sm font-bold text-indigo-600 mt-0.5">
                          {activeProgram.effectiveProgramAcceptRatePct}%
                        </div>
                      </div>
                      <div className="rounded-lg bg-white p-2.5 border border-slate-200">
                        <div className="text-[11px] text-slate-500">{t("admittedGpaBand")}</div>
                        <div className="text-sm font-bold text-slate-900 mt-0.5">
                          {activeProgram.programGpa25.toFixed(2)} – {activeProgram.programGpa75.toFixed(2)}{" "}
                          <span className="text-[11px] font-normal text-slate-500">
                            {t("medianAbbr", { value: activeProgram.programGpa50.toFixed(2) })}
                          </span>
                        </div>
                      </div>
                      <div className="rounded-lg bg-white p-2.5 border border-slate-200">
                        <div className="text-[11px] text-slate-500">{t("englishRequirement")}</div>
                        <div className="text-sm font-bold text-slate-900 mt-0.5">
                          IELTS {activeProgram.effectiveMinIelts.toFixed(1)} / TOEFL {activeProgram.effectiveMinToefl}
                        </div>
                      </div>
                    </div>

                    {/* Visual 25th - 50th - 75th Percentile Range Bars */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-1">
                      {/* GPA Percentile Bar */}
                      <div className="rounded-lg bg-white p-3 border border-slate-200 space-y-1.5">
                        <div className="flex items-center justify-between text-xs">
                          <span className="font-semibold text-slate-700 flex items-center gap-1">
                            <BarChart3 className="w-3.5 h-3.5 text-indigo-600" />
                            {t("gpaCohortBand")}
                          </span>
                          <span className="font-bold text-indigo-600">
                            {activeProgram.studentGpa4 !== null && activeProgram.studentGpaPercentile !== null
                              ? `${activeProgram.studentGpa4.toFixed(2)} (${t("percentileLabel", { pct: activeProgram.studentGpaPercentile })})`
                              : activeProgram.studentGpa4 !== null
                                ? activeProgram.studentGpa4.toFixed(2)
                                : t("noGpaEntered")}
                          </span>
                        </div>
                        <div className="relative h-2.5 w-full rounded-full bg-slate-100 overflow-hidden">
                          {/* Middle 50% band highlight */}
                          <div
                            className="absolute top-0 bottom-0 bg-indigo-100"
                            style={{
                              left: `${Math.max(5, ((activeProgram.programGpa25 - 2.4) / 1.6) * 100)}%`,
                              width: `${Math.max(
                                12,
                                ((activeProgram.programGpa75 - activeProgram.programGpa25) / 1.6) * 100
                              )}%`,
                            }}
                          />
                          {/* Student marker */}
                          {activeProgram.studentGpaPercentile !== null && (
                            <div
                              className="h-full bg-indigo-600 rounded-full transition-all"
                              style={{ width: `${activeProgram.studentGpaPercentile}%` }}
                            />
                          )}
                        </div>
                        <div className="flex justify-between text-[10px] text-slate-500">
                          <span>{t("pct25")} {activeProgram.programGpa25.toFixed(2)}</span>
                          <span>{t("pct50")} {activeProgram.programGpa50.toFixed(2)}</span>
                          <span>{t("pct75")} {activeProgram.programGpa75.toFixed(2)}</span>
                        </div>
                      </div>

                      {/* SAT Percentile Bar */}
                      <div className="rounded-lg bg-white p-3 border border-slate-200 space-y-1.5">
                        <div className="flex items-center justify-between text-xs">
                          <span className="font-semibold text-slate-700 flex items-center gap-1">
                            <Award className="w-3.5 h-3.5 text-indigo-600" />
                            {t("satCohortBand")}
                          </span>
                          <span className="font-bold text-indigo-600">
                            {activeProgram.studentSat !== null && activeProgram.studentSatPercentile !== null
                              ? `${activeProgram.studentSat} (${t("percentileLabel", { pct: activeProgram.studentSatPercentile })})`
                              : activeProgram.programSat25
                              ? t("satTestOptional")
                              : t("satNotRequired")}
                          </span>
                        </div>
                        <div className="relative h-2.5 w-full rounded-full bg-slate-100 overflow-hidden">
                          {activeProgram.studentSatPercentile !== null && (
                            <div
                              className="h-full bg-indigo-600 rounded-full transition-all"
                              style={{ width: `${activeProgram.studentSatPercentile}%` }}
                            />
                          )}
                        </div>
                        <div className="flex justify-between text-[10px] text-slate-500">
                          {activeProgram.programSat25 && activeProgram.programSat50 && activeProgram.programSat75 ? (
                            <>
                              <span>{t("pct25")} {activeProgram.programSat25}</span>
                              <span>{t("pct50")} {activeProgram.programSat50}</span>
                              <span>{t("pct75")} {activeProgram.programSat75}</span>
                            </>
                          ) : (
                            <span>{t("curriculumHolistic")}</span>
                          )}
                        </div>
                      </div>

                      {/* English Proficiency Bar */}
                      <div className="rounded-lg bg-white p-3 border border-slate-200 space-y-1.5">
                        <div className="flex items-center justify-between text-xs">
                          <span className="font-semibold text-slate-700 flex items-center gap-1">
                            <Layers className="w-3.5 h-3.5 text-indigo-600" />
                            {t("englishCohortBand")}
                          </span>
                          <span className="font-bold text-indigo-600">
                            {activeProgram.studentEnglishLabel
                              ? `${activeProgram.studentEnglishLabel}${activeProgram.studentEnglishPercentile !== null ? ` (${t("percentileLabel", { pct: activeProgram.studentEnglishPercentile })})` : ""}`
                              : t("badgeMissing")}
                          </span>
                        </div>
                        <div className="relative h-2.5 w-full rounded-full bg-slate-100 overflow-hidden">
                          {activeProgram.studentEnglishPercentile !== null && (
                            <div
                              className="h-full bg-emerald-600 rounded-full transition-all"
                              style={{ width: `${activeProgram.studentEnglishPercentile}%` }}
                            />
                          )}
                        </div>
                        <div className="flex justify-between text-[10px] text-slate-500">
                          <span>{t("minIeltsWord")} {activeProgram.effectiveMinIelts.toFixed(1)}</span>
                          <span>{t("medIeltsWord")} {activeProgram.medianIelts.toFixed(1)}</span>
                          <span>{t("toeflMinPlus", { value: activeProgram.effectiveMinToefl })}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                <button
                  onClick={() => setExpanded(open ? null : baseItem.universityId)}
                  className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 inline-flex items-center gap-1"
                >
                  {open ? (
                    <>
                      <ChevronUp className="w-3.5 h-3.5" /> {t("toggleHide")}
                    </>
                  ) : (
                    <>
                      <ChevronDown className="w-3.5 h-3.5" /> {t("toggleShow")} &amp; {t("programRequirementsWord")}
                    </>
                  )}
                </button>

                {open && (
                  <div className="mt-2 pt-4 border-t border-slate-100 space-y-4 text-xs">
                    {/* Layer 2: Exact Program Requirements Checklist */}
                    {activeProgram && activeProgram.requirementChecks.length > 0 && (
                      <div className="space-y-2">
                        <div className="font-bold text-slate-800">
                          {t("eligibilityVerificationTitle", { program: activeProgram.programName })}
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          {activeProgram.requirementChecks.map((chk, idx) => {
                            const badge = checkStatusBadge(chk.status, t);
                            return (
                              <div
                                key={`${chk.dimension}-${idx}`}
                                className="rounded-xl border border-slate-200 bg-slate-50 p-2.5 space-y-1"
                              >
                                <div className="flex items-center justify-between gap-2">
                                  <span className="font-semibold text-slate-800">{chk.label}</span>
                                  <span
                                    className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${badge.className}`}
                                  >
                                    {badge.label}
                                  </span>
                                </div>
                                <div className="flex justify-between text-[11px] text-slate-600">
                                  <span>{t("yourProfile")} {chk.studentValue}</span>
                                  <span>{t("targetValue")} {chk.requiredValue}</span>
                                </div>
                                <p className="text-[11px] text-slate-500">{chk.detail}</p>
                              </div>
                            );
                          })}
                        </div>
                        <p className="text-[11px] text-slate-500 italic">
                          {activeProgram.degreeCalibrationNote}
                        </p>
                      </div>
                    )}

                    {/* Layer 5: Empirical Consented Cohort Outcomes Summary */}
                    {activeProgram && activeProgram.empiricalOutcomes.totalConsented > 0 && (
                      <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 flex flex-wrap items-center justify-between gap-2">
                        <div>
                          <span className="font-semibold text-slate-800">
                            {t("cohortArchiveTitle", { university: baseItem.universityName })}
                          </span>{" "}
                          <span className="text-slate-600">
                            {t("cohortArchiveSummary", {
                              total: activeProgram.empiricalOutcomes.totalConsented,
                              accepted: activeProgram.empiricalOutcomes.acceptedCount,
                              waitlisted: activeProgram.empiricalOutcomes.waitlistedCount,
                              rejected: activeProgram.empiricalOutcomes.rejectedCount,
                            })}
                          </span>
                        </div>
                        {activeProgram.empiricalOutcomes.medianAdmittedGpa && (
                          <span className="text-[11px] font-semibold px-2.5 py-0.5 rounded-full bg-white border border-slate-200 text-slate-700">
                            {t("archiveMedianGpa")}{" "}
                            {activeProgram.empiricalOutcomes.medianAdmittedGpa.toFixed(2)}
                            {activeProgram.empiricalOutcomes.medianAdmittedSat
                              ? ` · SAT ${activeProgram.empiricalOutcomes.medianAdmittedSat}`
                              : ""}
                          </span>
                        )}
                      </div>
                    )}

                    {/* Catalogue Fit Signals & Issues */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div className="space-y-1.5">
                        <div className="font-semibold text-emerald-700 flex items-center gap-1">
                          <CheckCircle2 className="w-3.5 h-3.5" /> {t("signalsTitle")}
                        </div>
                        {activeItem.fitReasons.length === 0 &&
                        (!activeProgram || activeProgram.strengths.length === 0) ? (
                          <p className="text-slate-400">{t("noSignals")}</p>
                        ) : (
                          <ul className="space-y-1 text-slate-700 list-disc list-inside">
                            {(activeProgram?.strengths ?? []).map((s, idx) => (
                              <li key={`prog-str-${idx}`}>{s}</li>
                            ))}
                            {activeItem.fitReasons.map((p, idx) => (
                              <li key={`fit-str-${idx}`}>{p}</li>
                            ))}
                          </ul>
                        )}
                      </div>
                      <div className="space-y-1.5">
                        <div className="font-semibold text-amber-700 flex items-center gap-1">
                          <AlertTriangle className="w-3.5 h-3.5" /> {t("verifyTitle")}
                        </div>
                        {activeItem.fitIssues.length === 0 &&
                        (!activeProgram || activeProgram.gaps.length === 0) ? (
                          <p className="text-slate-400">{t("noIssues")}</p>
                        ) : (
                          <ul className="space-y-1 text-slate-700 list-disc list-inside">
                            {(activeProgram?.gaps ?? []).map((g, idx) => (
                              <li key={`prog-gap-${idx}`}>{g}</li>
                            ))}
                            {activeItem.fitIssues.map((n, idx) => (
                              <li key={`fit-gap-${idx}`}>{n}</li>
                            ))}
                          </ul>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Priority 5.5 — a fit score says how a university compares with you.
          The twin says how YOU compare with a student who was actually admitted:
          the same table, but with the gap in each row and the first three things
          to do about it. */}
      {profileId ? <TwinStrategyCard profileId={profileId} /> : null}

      <p className="text-[11px] text-slate-400 leading-relaxed">{t("footnote")}</p>

      {/*
        The methodology disclosure lives here, at the foot of the page, instead
        of as a banner above the results. The wording is unchanged — it is just
        no longer the first thing a student reads, and it stays one click away.
      */}
      <details className="text-[11px] text-slate-400 dark:text-slate-500">
        <summary className="inline-flex cursor-pointer items-center gap-1 hover:underline">
          <Info className="h-3 w-3 shrink-0" aria-hidden />
          {t("methodologyNoteLabel")}
        </summary>
        <p className="mt-1 max-w-3xl leading-relaxed">
          <span className="font-semibold">{t("unavailableTitle")}</span> {t("unavailableBody")}
        </p>
      </details>
    </div>
  );
}
export default ChancingPanel;
