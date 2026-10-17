"use client";

import React, { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import {
  AlertTriangle,
  Calculator,
  CheckCircle2,
  Copy,
  ExternalLink,
  FileText,
  Globe,
  Loader2,
  Printer,
  RotateCcw,
  SlidersHorizontal,
  Table2,
  Wallet,
} from "lucide-react";
import { StudentProfile } from "./Navbar";
import type { CvGuidance } from "@/lib/cv";
import type { PortfolioAdviceKey } from "@/lib/costs";
import {
  COUNTRY_COST_BENCHMARKS,
  CURRENCY_RATES_TO_USD,
  formatCurrencyAmount,
} from "@/lib/countryCostBenchmarks";
import { ScrollRegion } from "@/components/hubs/ui";
import { AppNote } from "@/components/AppNote";
import { HighlightedText, SampleExemplarBar } from "@/components/samples/SampleExemplarBar";
import type { CvBuilderSample } from "@/lib/samples/exemplars";

/**
 * Planning Studio (Phase 3) — multi-currency cost calculator, scholarship
 * portfolio, CV builder and comparison table.
 */

interface CostLine {
  key: string;
  label: string;
  annualUsd: number | null;
  totalUsd: number | null;
  frequency: "annual" | "one_time";
  estimated: boolean;
}

interface CostBreakdown {
  lines: CostLine[];
  annualTotalUsd: number | null;
  totalUsd: number | null;
  unknowns: string[];
  scholarship: {
    bestCaseAnnualUsd: number | null;
    bestCaseOneTimeUsd: number | null;
    coveragePct: number | null;
    misaligned: string[];
  };
  net: {
    annualAfterScholarshipUsd: number | null;
    totalAfterScholarshipUsd: number | null;
    familyContributionUsd: number | null;
    familyContributionKnown: boolean;
    gapAnnualUsd: number | null;
    gapTotalUsd: number | null;
    affordable: boolean | null;
  };
  verdict: string;
}

interface Portfolio {
  count: number;
  advice: { key: PortfolioAdviceKey; count?: number }[];
}

interface CvSection {
  heading: string;
  items: string[];
}

interface Cv {
  name: string;
  headline: string;
  contact: string[];
  sections: CvSection[];
  missing: string[];
  guidance: CvGuidance[];
  warnings: string[];
  estimatedPages: number;
  totalItems: number;
}

interface CompareRow {
  key: string;
  label: string;
  values: Record<number, string | null>;
  winner: number | null;
  winnerReason?: string;
}

interface Comparison {
  rows: CompareRow[];
  scores: Record<number, { wins: number; known: number; unknown: number }>;
  verdict: string;
  dataGaps: { universityId: number; name: string; missing: string[] }[];
}

interface BenchmarkSource {
  country: string;
  name: string;
  url: string;
  notes: string;
  defaultCurrency: string;
}

interface ResolvedInputs {
  years: number;
  degreeLevel: string;
  annualTuitionUsd: number;
  annualLivingEstUsd: number;
  insurancePerYearUsd: number;
  booksPerYearUsd: number;
  flightsPerYearUsd: number;
  visaFeeUsd: number;
  applicationFeeUsd: number;
  familyContributionUsd: number | null;
}

/** Module 5 — one row of the interactive award selector. */
interface AvailableScholarship {
  id: number;
  title: string;
  provider: string;
  country: string;
  coverageType: string;
  covers: "tuition" | "living" | "both" | "other";
  effectiveAnnualUsd: number | null;
  awardPeriod: string | null;
  deadlineDate: string | null;
  saved: boolean;
  matchesTargetCountry: boolean;
  selected: boolean;
}

interface PlanningData {
  costs: CostBreakdown;
  portfolio: Portfolio;
  costTarget: { id: number; name: string; country: string } | null;
  activeTargetCountry?: string | null;
  availableScholarships?: AvailableScholarship[];
  universities: { id: number; name: string; country: string }[];
  catalogUniversities?: { id: number; name: string; country: string }[];
  countries?: string[];
  currencyRates?: typeof CURRENCY_RATES_TO_USD;
  displayCurrency?: string;
  benchmarkSource?: BenchmarkSource;
  conversionNotes?: string[];
  resolvedInputs?: ResolvedInputs;
  cv: Cv;
  cvText: string;
  comparison: Comparison;
}

const TABS = [
  { id: "cost", label: "Cost calculator", icon: Calculator },
  { id: "scholarship", label: "Scholarship portfolio", icon: Wallet },
  { id: "cv", label: "CV builder", icon: FileText },
  { id: "compare", label: "Compare universities", icon: Table2 },
] as const;

const CURRENCY_CODES = Object.keys(CURRENCY_RATES_TO_USD);
const DEFAULT_COUNTRIES = Object.keys(COUNTRY_COST_BENCHMARKS);

interface CustomOverridesState {
  tuitionUsd: string;
  livingUsd: string;
  insuranceUsd: string;
  booksUsd: string;
  flightsUsd: string;
  visaUsd: string;
  appFeeUsd: string;
}

const EMPTY_OVERRIDES: CustomOverridesState = {
  tuitionUsd: "",
  livingUsd: "",
  insuranceUsd: "",
  booksUsd: "",
  flightsUsd: "",
  visaUsd: "",
  appFeeUsd: "",
};

interface PlanningStudioProps {
  activeProfile: StudentProfile | null;
}

export function PlanningStudio({ activeProfile }: PlanningStudioProps) {
  const tCv = useTranslations("cvBuilder");
  const tPortfolio = useTranslations("costPlanner");
  const ts = useTranslations("samples");
  const [compareCv, setCompareCv] = useState<CvBuilderSample | null>(null);
  const profileId = activeProfile?.id ?? null;

  const [result, setResult] = useState<{ requestKey: string; data: PlanningData } | null>(null);
  const [errorResult, setErrorResult] = useState<{ requestKey: string; message: string } | null>(null);
  const [universityId, setUniversityId] = useState<number | null>(null);
  const [countryOverride, setCountryOverride] = useState<string>("");
  const [displayCurrency, setDisplayCurrency] = useState<string>("USD");
  const [degreeLevel, setDegreeLevel] = useState<string>("");
  const [yearsOverride, setYearsOverride] = useState<string>("");
  const [familyContributionUsd, setFamilyContributionUsd] = useState<string>("");
  const [customizeOpen, setCustomizeOpen] = useState(false);
  const [customAmounts, setCustomAmounts] = useState<CustomOverridesState>(EMPTY_OVERRIDES);
  /**
   * Module 5 — which awards deduct from the cost. `null` means "let the
   * server auto-select the saved awards that apply to the chosen country";
   * any explicit tick/uncheck switches to an exact id list. Changing the
   * university or country resets back to `null` so the new destination gets
   * its own honest default instead of last term's checklist.
   */
  const [selectedScholarshipIds, setSelectedScholarshipIds] = useState<number[] | null>(null);
  const [savingScholarshipId, setSavingScholarshipId] = useState<number | null>(null);
  // Bumped when an award is saved from the selector — refetches the plan so
  // the newly saved row lands in "Your saved awards" (server is the truth).
  const [savedAwardNonce, setSavedAwardNonce] = useState(0);

  const [tab, setTab] = useState<(typeof TABS)[number]["id"]>("cost");
  const [copied, setCopied] = useState(false);

  const overridesQueryKey = JSON.stringify(customAmounts);
  // Target identity changes → drop the manual award checklist (back to the
  // server's country-appropriate auto-selection). Render-phase state
  // adjustment, the pattern this file already uses for `page`.
  const targetKey = `${universityId ?? "auto"}|${countryOverride}`;
  const [prevTargetKey, setPrevTargetKey] = useState(targetKey);
  if (targetKey !== prevTargetKey) {
    setPrevTargetKey(targetKey);
    setSelectedScholarshipIds(null);
  }
  const selectionKey =
    selectedScholarshipIds === null ? "auto" : selectedScholarshipIds.join(",") || "none";
  const requestKey = `${profileId ?? "none"}:${universityId ?? "default"}:${countryOverride}:${degreeLevel}:${yearsOverride}:${familyContributionUsd}:${overridesQueryKey}:${selectionKey}:${savedAwardNonce}`;
  const data = result?.requestKey === requestKey ? result.data : result?.data ?? null;
  const error = errorResult?.requestKey === requestKey ? errorResult.message : "";
  const loading = profileId !== null && result === null && error === "";

  useEffect(() => {
    if (profileId === null) return;
    let cancelled = false;
    const params = new URLSearchParams({ profileId: String(profileId) });
    if (universityId !== null) params.set("universityId", String(universityId));
    if (countryOverride) params.set("country", countryOverride);
    if (degreeLevel) params.set("degreeLevel", degreeLevel);
    if (yearsOverride) params.set("years", yearsOverride);
    if (familyContributionUsd.trim() !== "") params.set("familyContributionUsd", familyContributionUsd.trim());
    if (customAmounts.tuitionUsd.trim() !== "") params.set("tuitionUsd", customAmounts.tuitionUsd.trim());
    if (customAmounts.livingUsd.trim() !== "") params.set("livingUsd", customAmounts.livingUsd.trim());
    if (customAmounts.insuranceUsd.trim() !== "") params.set("insuranceUsd", customAmounts.insuranceUsd.trim());
    if (customAmounts.booksUsd.trim() !== "") params.set("booksUsd", customAmounts.booksUsd.trim());
    if (customAmounts.flightsUsd.trim() !== "") params.set("flightsUsd", customAmounts.flightsUsd.trim());
    if (customAmounts.visaUsd.trim() !== "") params.set("visaUsd", customAmounts.visaUsd.trim());
    if (customAmounts.appFeeUsd.trim() !== "") params.set("appFeeUsd", customAmounts.appFeeUsd.trim());
    // Module 5 — an explicit checklist ("" = apply NOTHING) overrides the
    // server default of "every saved award that fits this country".
    if (selectedScholarshipIds !== null) params.set("scholarshipIds", selectedScholarshipIds.join(","));

    void (async () => {
      try {
        const res = await fetch(`/api/planning?${params.toString()}`);
        const payload = await res.json();
        if (!res.ok) throw new Error(payload.error || "Failed to build your plan");
        if (!cancelled) setResult({ requestKey, data: payload });
      } catch (err) {
        if (!cancelled) {
          setErrorResult({
            requestKey,
            message: err instanceof Error ? err.message : "Failed to build your plan",
          });
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [
    profileId,
    requestKey,
    universityId,
    countryOverride,
    degreeLevel,
    yearsOverride,
    familyContributionUsd,
    customAmounts,
    selectedScholarshipIds,
    savedAwardNonce,
  ]);

  if (!activeProfile) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-6 text-sm text-slate-500">
        Sign in to build your plan.
      </div>
    );
  }

  const money = (v: number | null) => {
    if (v == null) return "Unknown";
    const formatted = formatCurrencyAmount(v, displayCurrency);
    if (displayCurrency === "USD") return formatted;
    return `${formatted} ($${Math.round(v).toLocaleString("en-US")})`;
  };

  const copyCv = async () => {
    if (!data) return;
    try {
      await navigator.clipboard.writeText(data.cvText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setErrorResult({ requestKey, message: "Could not copy — select the text manually." });
    }
  };

  const resetCustomizations = () => {
    setCustomAmounts(EMPTY_OVERRIDES);
    setYearsOverride("");
    setFamilyContributionUsd("");
  };

  /**
   * Tick/uncheck an award in the cost calculator. The FIRST click leaves the
   * auto-selected server state and pins an exact list (the same list with one
   * row flipped), so the toggle is reversible and reproducible in the URL.
   */
  const toggleAppliedScholarship = (id: number) => {
    const rows = data?.availableScholarships ?? [];
    const current = selectedScholarshipIds ?? rows.filter((r) => r.selected).map((r) => r.id);
    setSelectedScholarshipIds(
      current.includes(id) ? current.filter((x) => x !== id) : [...current, id]
    );
  };

  /** "What if I win this grant?" → also keep it: save it to the plan. */
  const saveAwardForPlan = async (id: number) => {
    if (!activeProfile || savingScholarshipId != null) return;
    setSavingScholarshipId(id);
    try {
      await fetch("/api/saved-scholarships", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ profileId: activeProfile.id, scholarshipId: id }),
      });
      // The saved-universities/scholarships lists live in HomeClient; the
      // planning refetch (nonce) is enough to move the row into "Your saved
      // awards" here without a cross-component event bus.
      setSavedAwardNonce((n) => n + 1);
    } finally {
      setSavingScholarshipId(null);
    }
  };

  const compareIds = data?.universities.slice(0, 6) ?? [];
  const catalogList = (data?.catalogUniversities ?? []).filter(
    (c) => !(data?.universities ?? []).some((u) => u.id === c.id)
  );
  const countriesList = data?.countries ?? DEFAULT_COUNTRIES;
  const activeCountry = countryOverride || data?.benchmarkSource?.country || data?.costTarget?.country || "United States";
  const resolvedYears = yearsOverride || String(data?.resolvedInputs?.years ?? 4);
  const resolvedDegree = degreeLevel || data?.resolvedInputs?.degreeLevel || activeProfile.degreeLevel || "Bachelor";

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-slate-200 bg-white p-4">
        <h2 className="text-lg font-bold text-slate-900">Planning studio</h2>
        <p className="mt-0.5 text-xs text-slate-500">
          Multi-currency global cost calculator, scholarship portfolio, a CV built from your profile, and a side-by-side
          university comparison.
        </p>

        <div className="mt-3 flex flex-wrap gap-1.5">
          {TABS.map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`flex items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-bold ${
                tab === t.id ? "bg-indigo-600 text-white" : "border border-slate-200 text-slate-600 hover:bg-slate-50"
              }`}
            >
              <t.icon className="h-3.5 w-3.5" />
              {t.label}
            </button>
          ))}
        </div>

        {data && tab === "cost" && (
          <div className="mt-4 space-y-3 border-t border-slate-100 pt-3">
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wide text-slate-500">
                  University / Target
                </label>
                <select
                  aria-label="University or target selection"
                  className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs text-slate-800"
                  value={universityId === 0 ? "0" : String(universityId ?? data.costTarget?.id ?? "")}
                  onChange={(e) => {
                    const val = Number(e.target.value);
                    setUniversityId(val);
                    if (val > 0) {
                      setCountryOverride("");
                    }
                    setCustomAmounts(EMPTY_OVERRIDES);
                  }}
                >
                  {data.universities.length > 0 && (
                    <optgroup label="Your Saved Universities">
                      {data.universities.map((u) => (
                        <option key={u.id} value={u.id}>
                          {u.name} ({u.country})
                        </option>
                      ))}
                    </optgroup>
                  )}
                  {catalogList.length > 0 && (
                    <optgroup label="Global University Catalogue">
                      {catalogList.map((u) => (
                        <option key={u.id} value={u.id}>
                          {u.name} ({u.country})
                        </option>
                      ))}
                    </optgroup>
                  )}
                  <optgroup label="Country Benchmark Explorer">
                    <option value="0">Explore by Country Official Benchmark</option>
                  </optgroup>
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wide text-slate-500">
                  Destination Country
                </label>
                <select
                  aria-label="Destination country"
                  className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs text-slate-800"
                  value={activeCountry}
                  onChange={(e) => {
                    setCountryOverride(e.target.value);
                    setUniversityId(0);
                    setCustomAmounts(EMPTY_OVERRIDES);
                  }}
                >
                  {countriesList.map((c) => (
                    <option key={c} value={c}>
                      {c} ({COUNTRY_COST_BENCHMARKS[c]?.defaultCurrency ?? "USD"})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wide text-slate-500">
                  Display Currency
                </label>
                <select
                  aria-label="Display currency"
                  className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs text-slate-800"
                  value={displayCurrency}
                  onChange={(e) => setDisplayCurrency(e.target.value)}
                >
                  {CURRENCY_CODES.map((code) => (
                    <option key={code} value={code}>
                      {CURRENCY_RATES_TO_USD[code].label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wide text-slate-500">
                    Degree
                  </label>
                  <select
                    aria-label="Degree level"
                    className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-2.5 py-2 text-xs text-slate-800"
                    value={resolvedDegree}
                    onChange={(e) => {
                      setDegreeLevel(e.target.value);
                      setYearsOverride("");
                    }}
                  >
                    <option value="Bachelor">Bachelor</option>
                    <option value="Master">Master</option>
                    <option value="PhD">PhD</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wide text-slate-500">
                    Duration
                  </label>
                  <select
                    aria-label="Programme duration in years"
                    className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-2.5 py-2 text-xs text-slate-800"
                    value={resolvedYears}
                    onChange={(e) => setYearsOverride(e.target.value)}
                  >
                    {[1, 2, 3, 4, 5, 6].map((yr) => (
                      <option key={yr} value={String(yr)}>
                        {yr} {yr === 1 ? "yr" : "yrs"}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
              <div className="flex flex-wrap items-center gap-2">
                <label className="text-xs font-semibold text-slate-700">
                  Confirmed family contribution (USD/yr):
                </label>
                <input
                  type="number"
                  min={0}
                  step={500}
                  placeholder="e.g. 5000"
                  value={familyContributionUsd}
                  onChange={(e) => setFamilyContributionUsd(e.target.value)}
                  className="w-32 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs text-slate-800"
                />
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => setCustomizeOpen((prev) => !prev)}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold text-slate-700 hover:bg-slate-50"
                >
                  <SlidersHorizontal className="h-3.5 w-3.5" />
                  {customizeOpen ? "Hide custom amounts" : "Customize amounts"}
                </button>
                <button
                  type="button"
                  onClick={resetCustomizations}
                  className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-50"
                >
                  <RotateCcw className="h-3.5 w-3.5" />
                  Reset
                </button>
              </div>
            </div>

            {customizeOpen && (
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                <p className="mb-2 text-[11px] font-semibold text-slate-600">
                  Override any line in USD (leave blank to use published university or official country benchmark figures):
                </p>
                <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
                  <div>
                    <label className="block text-[10px] font-bold uppercase text-slate-500">Tuition (USD/yr)</label>
                    <input
                      type="number"
                      min={0}
                      placeholder={String(data.resolvedInputs?.annualTuitionUsd ?? "")}
                      value={customAmounts.tuitionUsd}
                      onChange={(e) => setCustomAmounts({ ...customAmounts, tuitionUsd: e.target.value })}
                      className="mt-0.5 w-full rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs text-slate-800"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold uppercase text-slate-500">Living (USD/yr)</label>
                    <input
                      type="number"
                      min={0}
                      placeholder={String(data.resolvedInputs?.annualLivingEstUsd ?? "")}
                      value={customAmounts.livingUsd}
                      onChange={(e) => setCustomAmounts({ ...customAmounts, livingUsd: e.target.value })}
                      className="mt-0.5 w-full rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs text-slate-800"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold uppercase text-slate-500">Insurance (USD/yr)</label>
                    <input
                      type="number"
                      min={0}
                      placeholder={String(data.resolvedInputs?.insurancePerYearUsd ?? "")}
                      value={customAmounts.insuranceUsd}
                      onChange={(e) => setCustomAmounts({ ...customAmounts, insuranceUsd: e.target.value })}
                      className="mt-0.5 w-full rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs text-slate-800"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold uppercase text-slate-500">Books (USD/yr)</label>
                    <input
                      type="number"
                      min={0}
                      placeholder={String(data.resolvedInputs?.booksPerYearUsd ?? "")}
                      value={customAmounts.booksUsd}
                      onChange={(e) => setCustomAmounts({ ...customAmounts, booksUsd: e.target.value })}
                      className="mt-0.5 w-full rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs text-slate-800"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold uppercase text-slate-500">Flights Home (USD/yr)</label>
                    <input
                      type="number"
                      min={0}
                      placeholder={String(data.resolvedInputs?.flightsPerYearUsd ?? "")}
                      value={customAmounts.flightsUsd}
                      onChange={(e) => setCustomAmounts({ ...customAmounts, flightsUsd: e.target.value })}
                      className="mt-0.5 w-full rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs text-slate-800"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold uppercase text-slate-500">Visa Fee (USD one-off)</label>
                    <input
                      type="number"
                      min={0}
                      placeholder={String(data.resolvedInputs?.visaFeeUsd ?? "")}
                      value={customAmounts.visaUsd}
                      onChange={(e) => setCustomAmounts({ ...customAmounts, visaUsd: e.target.value })}
                      className="mt-0.5 w-full rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs text-slate-800"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold uppercase text-slate-500">Application Fee (USD)</label>
                    <input
                      type="number"
                      min={0}
                      placeholder={String(data.resolvedInputs?.applicationFeeUsd ?? "")}
                      value={customAmounts.appFeeUsd}
                      onChange={(e) => setCustomAmounts({ ...customAmounts, appFeeUsd: e.target.value })}
                      className="mt-0.5 w-full rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs text-slate-800"
                    />
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {data && data.universities.length > 0 && tab === "compare" && (
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <span className="text-[11px] font-bold uppercase tracking-wide text-slate-400">University</span>
            <span className="text-xs text-slate-600">
              {compareIds.length} saved — showing up to 6
            </span>
          </div>
        )}
      </div>

      {error && (
        <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">{error}</div>
      )}

      {loading && !data && (
        <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-6 text-sm text-slate-500">
          <Loader2 className="h-4 w-4 animate-spin" /> Building…
        </div>
      )}

      {data && (
        <>
          {/* ------------------------- COST ------------------------- */}
          {tab === "cost" && (
            <div className="space-y-3">
              <div className="rounded-2xl border border-slate-200 bg-white p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h3 className="text-sm font-bold text-slate-900">
                    {data.costTarget ? `${data.costTarget.name} (${data.costTarget.country}) — cost breakdown` : "Annual cost"}
                  </h3>
                  <span className="inline-flex items-center gap-1 rounded-full border border-indigo-200 bg-indigo-50/50 px-2.5 py-0.5 text-[11px] font-bold text-indigo-700">
                    <Globe className="h-3 w-3" />
                    {resolvedDegree} · {resolvedYears} {Number(resolvedYears) === 1 ? "year" : "years"} · {displayCurrency}
                  </span>
                </div>
                <ul className="mt-3 divide-y divide-slate-100">
                  {data.costs.lines.map((line) => (
                    <li key={line.key} className="flex items-center justify-between py-2">
                      <span className="flex flex-wrap items-center gap-2 text-xs text-slate-700">
                        {line.label}
                        {line.estimated && (
                          <span className="rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-[9px] font-bold text-amber-700">
                            country benchmark
                          </span>
                        )}
                      </span>
                      <span className="text-xs font-bold text-slate-900">
                        {line.frequency === "one_time" ? money(line.totalUsd) : money(line.annualUsd)}
                        <span className="ml-1 font-normal text-slate-400">{line.frequency === "one_time" ? "one time" : "/yr"}</span>
                      </span>
                    </li>
                  ))}
                </ul>
                <div className="mt-2 flex items-center justify-between border-t border-slate-200 pt-2">
                  <span className="text-xs font-extrabold text-slate-800">Total per year</span>
                  <span className="text-base font-extrabold text-slate-900">{money(data.costs.annualTotalUsd)}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-[11px] text-slate-500">Whole programme ({resolvedYears} {Number(resolvedYears) === 1 ? "yr" : "yrs"} + one-off fees)</span>
                  <span className="text-xs font-bold text-slate-600">{money(data.costs.totalUsd)}</span>
                </div>
              </div>

              {/* Module 5 — which awards pay THIS bill. Saved awards for the
                  selected university's country (and global ones) are checked
                  by default and can be toggled live; full-tuition rows show
                  the effective annual value against this university's own
                  tuition line. Saved awards for other destinations stay
                  listed but muted — a Korean grant cannot deduct from a
                  German invoice, and now the student can see exactly that. */}
              {(data.availableScholarships?.length ?? 0) > 0 &&
                (() => {
                  const rows = data.availableScholarships ?? [];
                  const applicable = rows.filter((r) => r.saved && r.matchesTargetCountry);
                  const suggested = rows.filter((r) => !r.saved);
                  const elsewhere = rows.filter((r) => r.saved && !r.matchesTargetCountry);
                  const targetName = data.costTarget?.name || data.activeTargetCountry || "this university";
                  const awardRow = (r: AvailableScholarship) => (
                    <li key={r.id} className="flex flex-wrap items-start gap-2 border-t border-slate-100 py-2 first:border-t-0">
                      <label className="flex min-w-0 flex-1 cursor-pointer items-start gap-2">
                        <input
                          type="checkbox"
                          checked={r.selected}
                          onChange={() => toggleAppliedScholarship(r.id)}
                          className="mt-0.5 h-4 w-4 shrink-0 accent-indigo-600"
                          aria-label={`Apply ${r.title} to this plan`}
                        />
                        <span className="min-w-0 break-words">
                          <span className="block text-xs font-bold text-slate-800">
                            {r.title}
                            {/full/i.test(r.coverageType) && (
                              <span className="ml-1.5 rounded-full bg-emerald-100 px-1.5 py-0.5 text-[9px] font-black uppercase tracking-wide text-emerald-700">
                                full coverage
                              </span>
                            )}
                          </span>
                          <span className="block text-[11px] text-slate-500">
                            {r.provider} · {r.country}
                            {r.deadlineDate ? ` · deadline ${r.deadlineDate}` : ""}
                          </span>
                        </span>
                      </label>
                      <span className="shrink-0 text-xs font-extrabold text-emerald-700">
                        {r.effectiveAnnualUsd != null
                          ? `$${r.effectiveAnnualUsd.toLocaleString("en-US")}/yr`
                          : "amount not published"}
                      </span>
                      {!r.saved && (
                        <button
                          type="button"
                          onClick={() => void saveAwardForPlan(r.id)}
                          disabled={savingScholarshipId === r.id}
                          className="shrink-0 rounded-md border border-indigo-200 bg-white px-2 py-0.5 text-[10px] font-bold text-indigo-700 hover:bg-indigo-50 disabled:opacity-60"
                        >
                          {savingScholarshipId === r.id ? "saving…" : "Save"}
                        </button>
                      )}
                    </li>
                  );
                  return (
                    <div className="rounded-2xl border border-slate-200 bg-white p-4">
                      <h3 className="text-sm font-bold text-slate-900">
                        Scholarships applied to {targetName}
                        <span className="ml-2 text-[11px] font-semibold text-slate-400">
                          {data.activeTargetCountry ? `for ${data.activeTargetCountry} awards` : ""}
                        </span>
                      </h3>
                      {applicable.length > 0 && (
                        <ul className="mt-2">{applicable.map(awardRow)}</ul>
                      )}
                      {applicable.length === 0 && (
                        <p className="mt-2 text-[11px] text-slate-500">
                          No saved award applies to {data.activeTargetCountry ?? "this destination"} yet — pick one below,
                          or save it from the Scholarship hub first.
                        </p>
                      )}
                      {suggested.length > 0 && (
                        <details className="mt-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-1.5">
                          <summary className="inline-flex min-h-9 cursor-pointer items-center gap-1.5 text-[11px] font-bold text-indigo-700">
                            Recommended for {data.activeTargetCountry ?? "this country"} ({suggested.length}) — tick to simulate
                          </summary>
                          <ul className="pb-2">{suggested.map(awardRow)}</ul>
                        </details>
                      )}
                      {elsewhere.length > 0 && (
                        <details className="mt-2 rounded-xl bg-slate-50 px-3 py-1.5">
                          <summary className="inline-flex min-h-9 cursor-pointer list-none items-center text-[11px] font-medium text-slate-500 hover:underline">
                            Other saved scholarships not applicable to {data.activeTargetCountry ?? "this country"} ({elsewhere.length})
                          </summary>
                          <ul className="pb-2 opacity-70">{elsewhere.map(awardRow)}</ul>
                        </details>
                      )}
                    </div>
                  );
                })()}

              {data.benchmarkSource && (
                <div className="rounded-2xl border border-indigo-200 bg-indigo-50/50 p-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <h4 className="text-xs font-extrabold uppercase tracking-wide text-slate-700">
                      Official {data.benchmarkSource.country} Benchmark Source
                    </h4>
                    <a
                      href={data.benchmarkSource.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-xs font-bold text-indigo-700 hover:underline"
                    >
                      {data.benchmarkSource.name}
                      <ExternalLink className="h-3 w-3" />
                    </a>
                  </div>
                  <p className="mt-1 text-xs leading-relaxed text-slate-700">{data.benchmarkSource.notes}</p>
                  {data.conversionNotes && data.conversionNotes.length > 0 && (
                    <p className="mt-1 text-[11px] text-slate-500">
                      {data.conversionNotes.join(" · ")}
                    </p>
                  )}
                </div>
              )}

              {/*
                Only surfaced when the annual total itself is missing. When the
                benchmarked cost lines supply a complete total, a list of
                "unknown inputs" is noise above a number that is already final —
                and it read as a warning on a page that had nothing wrong.
                Collapsed by default so the detail stays available, not loud.
              */}
              {data.costs.annualTotalUsd == null && data.costs.unknowns.length > 0 && (
                <details className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-2.5 dark:border-slate-700 dark:bg-slate-900/40">
                  <summary className="inline-flex cursor-pointer items-center gap-1.5 text-[11px] font-semibold text-slate-500 hover:underline dark:text-slate-400">
                    <AlertTriangle className="h-3 w-3 shrink-0 opacity-60" aria-hidden />
                    Unknown inputs — excluded from totals
                  </summary>
                  <ul className="mt-1.5 space-y-1">
                    {data.costs.unknowns.map((u, i) => (
                      <li key={i} className="flex gap-1.5 text-[11px] text-slate-500 dark:text-slate-400">
                        <AlertTriangle className="mt-0.5 h-3 w-3 shrink-0 opacity-60" aria-hidden />
                        <span>{u}</span>
                      </li>
                    ))}
                  </ul>
                </details>
              )}

              <div
                className={`rounded-2xl border p-4 ${
                  data.costs.net.affordable === true
                    ? "border-emerald-200 bg-emerald-50"
                    : data.costs.net.affordable === false
                      ? "border-rose-200 bg-rose-50"
                      : "border-slate-200 bg-slate-50"
                }`}
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="text-xs font-extrabold uppercase tracking-wide text-slate-700">
                    {data.costs.net.familyContributionKnown
                      ? "Remaining gap after confirmed funding"
                      : "Remaining need before any unconfirmed family contribution"}
                  </span>
                  <span className="text-xl font-extrabold text-slate-900">
                    {money(data.costs.net.gapAnnualUsd)}
                    <span className="text-xs font-bold text-slate-500">/yr</span>
                  </span>
                </div>
                <p className="mt-2 text-xs leading-relaxed text-slate-700">{data.costs.verdict}</p>
                <p className="mt-2 text-[11px] text-slate-500">
                  Best-case recurring scholarships {money(data.costs.scholarship.bestCaseAnnualUsd)}/yr · one-time awards{" "}
                  {money(data.costs.scholarship.bestCaseOneTimeUsd)} · confirmed family support{" "}
                  {data.costs.net.familyContributionKnown ? `${money(data.costs.net.familyContributionUsd)}/yr` : "Unknown"} · whole-programme gap{" "}
                  {money(data.costs.net.gapTotalUsd)}
                </p>
              </div>
            </div>
          )}

          {/* --------------------- SCHOLARSHIPS --------------------- */}
          {tab === "scholarship" && (
            <div className="space-y-3">
              <div className="flex items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white p-4">
                <span className="text-xs font-bold text-slate-600">{tPortfolio("savedCount")}</span>
                <span className="text-xl font-extrabold text-slate-900">{data.portfolio.count}</span>
              </div>

              <div className="rounded-2xl border border-indigo-200 bg-indigo-50/50 p-4">
                <h3 className="text-xs font-extrabold uppercase tracking-wide text-slate-700">
                  {tPortfolio("reviewHeading")}
                </h3>
                <ul className="mt-2 space-y-2">
                  {data.portfolio.advice.map((item, i) => (
                    <li key={`${item.key}-${i}`} className="flex gap-1.5 text-xs text-slate-700">
                      <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-indigo-600" />
                      <span>{item.count == null ? tPortfolio(item.key) : tPortfolio(item.key, { count: item.count })}</span>
                    </li>
                  ))}
                </ul>
                <p className="mt-2 text-[11px] text-slate-500">{tPortfolio("probabilityUnavailable")}</p>
              </div>

              {data.costs.scholarship.misaligned.map((m, i) => (
                <p
                  key={i}
                  className="flex gap-1.5 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs text-amber-900"
                >
                  <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                  <span>{m}</span>
                </p>
              ))}
            </div>
          )}

          {/* --------------------------- CV --------------------------- */}
          {tab === "cv" && (
            <div className="space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-slate-200 bg-white p-4">
                <div>
                  <h3 className="text-sm font-bold text-slate-900">{tCv("cvTitle")}</h3>
                  <p className="text-[11px] text-slate-500">
                    {tCv("cvMeta", { items: data.cv.totalItems, pages: data.cv.estimatedPages })}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => void copyCv()}
                    className="inline-flex min-h-11 items-center gap-1.5 rounded-xl bg-indigo-600 px-4 py-2 text-xs font-bold text-white hover:bg-indigo-700"
                  >
                    <Copy className="h-3.5 w-3.5" aria-hidden />
                    {copied ? tCv("copied") : tCv("copy")}
                  </button>
                  <button
                    type="button"
                    onClick={() => window.print()}
                    aria-label={tCv("printSummaryHint")}
                    className="print:hidden inline-flex min-h-11 items-center gap-1.5 rounded-xl border border-slate-300 px-4 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 dark:border-slate-600 dark:text-slate-200 dark:hover:bg-slate-800"
                  >
                    <Printer className="h-3.5 w-3.5" aria-hidden />
                    {tCv("printSummary")}
                  </button>
                </div>
              </div>

              <SampleExemplarBar
                group="cvBuilder"
                className="print:hidden"
                loadLabel={ts("cvCompareLoad")}
                onLoad={(sample) => setCompareCv(sample)}
              />
              {compareCv && (
                <section aria-label={ts("cvCompareTitle")} className="rounded-2xl border border-slate-200 bg-white p-4 print:hidden">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <h4 className="min-w-0 break-words text-sm font-bold text-slate-900">{ts("cvCompareTitle")}</h4>
                    <button
                      type="button"
                      onClick={() => setCompareCv(null)}
                      className="inline-flex min-h-11 items-center rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
                    >
                      {ts("cvCompareClose")}
                    </button>
                  </div>
                  <div className="mt-3 grid gap-3 lg:grid-cols-2">
                    <div className="min-w-0">
                      <p className="text-[11px] font-bold uppercase tracking-wide text-slate-500">{ts("cvYours")}</p>
                      <pre className="mt-1 max-h-[36rem] overflow-auto whitespace-pre-wrap break-words rounded-xl border border-slate-200 bg-slate-50 p-3 font-sans text-xs leading-relaxed text-slate-800">
                        {data.cvText}
                      </pre>
                    </div>
                    <div className="min-w-0">
                      <p className="text-[11px] font-bold uppercase tracking-wide text-indigo-700 dark:text-indigo-200">
                        {ts("cvSample")} · {ts(`tracks.${compareCv.id}` as never)}
                      </p>
                      <pre className="mt-1 max-h-[36rem] overflow-auto whitespace-pre-wrap break-words rounded-xl border border-indigo-100 bg-indigo-50/40 p-3 font-sans text-xs leading-relaxed text-slate-800 dark:border-indigo-500/20 dark:bg-indigo-950/20">
                        <HighlightedText text={compareCv.text} />
                      </pre>
                    </div>
                  </div>
                </section>
              )}

              {data.cv.warnings.length > 0 && (
                <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4">
                  <ul className="space-y-1">
                    {data.cv.warnings.map((w, i) => (
                      <li key={i} className="flex gap-1.5 text-xs text-amber-900">
                        <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                        <span>{w}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {data.cv.missing.length > 0 && (
                <div className="rounded-2xl border border-slate-200 bg-white p-4">
                  <h4 className="text-xs font-extrabold uppercase tracking-wide text-slate-500">
                    {tCv("missingTitle")}
                  </h4>
                  <p className="mt-1 text-[11px] text-slate-500">
                    {tCv("missingNote")}
                  </p>
                  <ul className="mt-2 grid gap-1 sm:grid-cols-2">
                    {data.cv.missing.map((m, i) => (
                      <li key={i} className="text-xs text-slate-600">
                        · {m}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {data.cv.guidance.length > 0 && (
                <section
                  aria-labelledby="cv-revision-guidance-title"
                  className="rounded-2xl border border-indigo-100 bg-indigo-50/60 p-4 dark:border-indigo-900 dark:bg-indigo-950/20 sm:p-5"
                >
                  <h4 id="cv-revision-guidance-title" className="text-sm font-bold text-indigo-950 dark:text-indigo-100">
                    {tCv("adviceTitle")}
                  </h4>
                  <p className="mt-1 text-xs leading-relaxed text-slate-600 dark:text-slate-300">
                    {tCv("adviceSubtitle")}
                  </p>
                  <ol className="mt-4 space-y-3">
                    {data.cv.guidance.map((tip, index) => (
                      <li key={`${tip.key}-${index}`} className="flex items-start gap-3">
                        <span aria-hidden="true" className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-white text-[11px] font-bold text-indigo-700 ring-1 ring-indigo-200 dark:bg-slate-900 dark:text-indigo-200 dark:ring-indigo-800">
                          {index + 1}
                        </span>
                        <p className="text-xs leading-relaxed text-slate-700 dark:text-slate-200 sm:text-sm">
                          {tCv(`advice.${tip.key}` as never, tip.values as never)}
                        </p>
                      </li>
                    ))}
                  </ol>
                </section>
              )}

              <div className="rounded-2xl border border-slate-200 bg-white p-5">
                <h3 className="text-base font-extrabold uppercase tracking-wide text-slate-900">{data.cv.name}</h3>
                <p className="text-xs text-slate-600">{data.cv.headline}</p>
                {data.cv.contact.length > 0 && (
                  <p className="text-[11px] text-slate-500">{data.cv.contact.join("  ·  ")}</p>
                )}
                <div className="mt-4 space-y-3">
                  {data.cv.sections.map((section) => (
                    <div key={section.heading}>
                      <h4 className="text-[11px] font-extrabold uppercase tracking-wide text-indigo-700">
                        {section.heading}
                      </h4>
                      <ul className="mt-1 space-y-0.5">
                        {section.items.map((item, i) => (
                          <li key={i} className="text-xs text-slate-700">
                            • {item}
                          </li>
                        ))}
                      </ul>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* ------------------------ COMPARE ------------------------ */}
          {tab === "compare" && (
            <div className="space-y-3">
              <div className="rounded-2xl border border-slate-200 bg-white p-4">
                <p className="text-xs text-slate-700">{data.comparison.verdict}</p>
              </div>

              {compareIds.length < 2 ? (
                <div className="rounded-xl border border-dashed border-slate-300 bg-white px-4 py-8 text-center text-sm text-slate-500">
                  Save at least two universities to compare them.
                </div>
              ) : (
                <ScrollRegion label="University comparison" className="overflow-x-auto rounded-2xl border border-slate-200 bg-white">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="border-b border-slate-200 bg-slate-50">
                        <th className="px-3 py-2 font-extrabold text-slate-600">Measure</th>
                        {compareIds.map((u) => (
                          <th key={u.id} className="px-3 py-2 font-extrabold text-slate-700">
                            {u.name}
                            {data.comparison.scores[u.id] && (
                              <span className="ml-1 rounded bg-indigo-100 px-1.5 py-0.5 text-[9px] text-indigo-700">
                                {data.comparison.scores[u.id].wins} won
                              </span>
                            )}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {data.comparison.rows.map((row) => (
                        <tr key={row.key} className="border-b border-slate-100">
                          <td className="px-3 py-2 font-semibold text-slate-600">{row.label}</td>
                          {compareIds.map((u) => {
                            const value = row.values[u.id];
                            const isWinner = row.winner === u.id;
                            return (
                              <td
                                key={u.id}
                                className={`px-3 py-2 ${isWinner ? "bg-emerald-50 font-bold text-emerald-800" : "text-slate-700"}`}
                              >
                                {value ?? <span className="text-slate-300">not published</span>}
                              </td>
                            );
                          })}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </ScrollRegion>
              )}

              {data.comparison.dataGaps.length > 0 && (
                <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4">
                  <h4 className="text-xs font-extrabold uppercase tracking-wide text-amber-800">Missing data</h4>
                  <ul className="mt-1.5 space-y-1">
                    {data.comparison.dataGaps.map((gap) => (
                      <li key={gap.universityId} className="text-xs text-amber-900">
                        <b>{gap.name}:</b> {gap.missing.join(", ")}
                      </li>
                    ))}
                  </ul>
                  <p className="mt-2 text-[11px] text-amber-800">
                    A blank cell is not a zero — it means the university has not published it.
                  </p>
                </div>
              )}
            </div>
          )}
        </>
      )}
      {/* Standing small print: this panel can be wrong — say so where it is read. */}
      <AppNote kind="money" className="mt-2" />
    </div>
  );
}
