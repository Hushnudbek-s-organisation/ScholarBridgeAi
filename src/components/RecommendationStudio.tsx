"use client";

/**
 * #recommend — Program Recommender studio.
 *
 * Honest-by-construction UI for `POST /api/programs/recommend`:
 *  - every input is skippable ("don't know yet"); nothing is sample-filled;
 *  - four SEPARATE dimensions per result: subject fit, published
 *    requirements (met / not met / unknown), affordability + funding, and
 *    admission probability — which is ALWAYS shown as unavailable;
 *  - the 0–100 "match score" is labelled as a ranking score, never a chance;
 *  - every fact carries provenance (verified / not verified / stale) and
 *    unknowns are labelled unknown, with a pointer to the official page.
 */

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  AlertTriangle,
  BadgeCheck,
  Bookmark,
  BookmarkCheck,
  CalendarClock,
  CheckCircle2,
  ChevronDown,
  Coins,
  ExternalLink,
  GraduationCap,
  HelpCircle,
  Languages,
  ListChecks,
  Loader2,
  MapPin,
  PiggyBank,
  Scale,
  Search,
  Sparkles,
  Target,
  Trash2,
  X,
} from "lucide-react";
import { useTranslations } from "next-intl";
import { DegreeLevelLabel } from "./DegreeLevelLabel";
import { normalizeDegreeLevel } from "@/lib/degreeLevels";
import { ScrollRegion } from "@/components/hubs/ui";
import { useLocaleContext } from "@/i18n/LocaleProvider";
import { StudyInterestPicker } from "@/components/StudyInterestPicker";
import {
  compatibilityTargetMajor,
  isStudyInterestSelectionValid,
  selectionsFromProfile,
  serializeStudyInterestSelections,
  studyInterestRecommendationTerms,
  studyInterestTranslationReference,
  type StudyInterestSelection,
} from "@/lib/studyInterests";
import type { StudentProfile } from "@/components/Navbar";
import { AppNote } from "@/components/AppNote";

// ---------------------------------------------------------------------------
// Types (mirrors of the API response — src/app/api/programs/recommend)
// ---------------------------------------------------------------------------

interface StudioProfile {
  id?: number;
  gpa?: number | null;
  gpaScale?: number | null;
  ieltsScore?: number | null;
  toeflScore?: number | null;
  duolingoScore?: number | null;
  satScore?: number | null;
  actScore?: number | null;
  targetMajor?: string | null;
  studyInterests?: string | null;
  degreeLevel?: string | null;
  budgetAnnualUsd?: number | null;
  preferredCountries?: string | null;
}

type RequirementStatus = "met" | "unmet" | "unknown";

interface ReqItem {
  key: "gpa" | "ielts" | "toefl" | "duolingo" | "sat" | "act";
  required: number;
  studentValue: number | null;
  status: RequirementStatus;
}

interface RecommendResult {
  program: {
    id: number;
    universityId: number;
    name: string;
    field: string | null;
    degreeLevel: string | null;
    language: string | null;
    annualTuition: number | null;
    tuitionCurrency: string;
    tuitionPeriod: string;
    programUrl: string | null;
    applicationUrl: string | null;
    isVerified: boolean;
    sourceUrl: string | null;
    lastVerifiedAt: string | null;
    verificationStatus: string;
    sources: { url: string; title: string; isOfficial: boolean }[];
  };
  university: {
    id: number;
    name: string;
    country: string;
    city: string | null;
    websiteUrl: string | null;
    annualLivingEst: number | null;
    livingCostCurrency: string;
  };
  subjectFit: { level: "exact" | "synonym" | "partial" | "weak" | "none" | "unknown"; matchedInterests: string[] };
  eligibility: { items: ReqItem[]; met: number; unmet: number; unknown: number; textRequirements: { kind: string; text: string }[] };
  affordability: {
    annualTuition: number | null;
    tuitionCurrency: string;
    livingEstUsd: number | null;
    withinBudget: "yes" | "no" | "unknown";
    budgetUsd: number | null;
    fundingNeed: "none" | "partial" | "full" | null;
    scholarshipMatches: { id: number; title: string; coverageType: string | null; needBased: boolean }[];
  };
  probability: { available: boolean };
  matchScore: number;
  rankingFactors: string[];
  missingInputs: string[];
  considerations: string[];
  nextCycle: { intake: string | null; academicYear: string | null; deadline: string | null; applicationUrl: string | null; sourceUrl: string | null; verificationStatus: string; isEstimated: boolean } | null;
  programStale: boolean;
  cycleStale: boolean;
}

interface InputProvenance {
  value: unknown;
  source: "request" | "profile" | "unknown";
}

interface RecommendResponse {
  results: RecommendResult[];
  totalProgramsScanned: number;
  probability: { available: boolean };
  inputs: Record<string, InputProvenance>;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const DEGREE_LEVELS = ["Bachelor", "Master", "PhD", "Diploma", "Associate"];

function parseNum(s: string): number | null {
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
}

/**
 * Build the request body with the route's resolution semantics:
 *  - a filled field → the number (request source);
 *  - a field the user CLEARED after prefill → explicit null ("don't know",
 *    overrides the profile);
 *  - a field never filled → omitted (route falls back to the profile, then
 *    to unknown).
 */
function buildPayload(
  form: {
    degreeLevel: string;
    gpa: string;
    gpaScale: string;
    ielts: string;
    toefl: string;
    duolingo: string;
    sat: string;
    act: string;
    budget: string;
    fundingNeed: string;
    languagePref: string;
    startYear: string;
    countries: string[];
  },
  baseline: Record<string, unknown>,
  interests: string[]
): Record<string, unknown> {
  const body: Record<string, unknown> = { interests };

  const numField = (key: string, stateKey: string) => {
    const v = form[stateKey as "gpa"] as string;
    if (v.trim() !== "") {
      const n = parseNum(v);
      if (n != null) body[key] = n;
      return;
    }
    // Empty: explicit "don't know" only if a profile value was prefilled
    // (otherwise omit → the profile still provides it).
    if (baseline[stateKey] != null && baseline[stateKey] !== "") body[key] = null;
  };
  const strField = (key: string, stateKey: string) => {
    const v = (form[stateKey as "degreeLevel"] as string).trim();
    if (v !== "") body[key] = v;
    else if (baseline[stateKey] != null && baseline[stateKey] !== "") body[key] = null;
  };

  strField("degreeLevel", "degreeLevel");
  numField("gpa", "gpa");
  numField("gpaScale", "gpaScale");
  numField("ielts", "ielts");
  numField("toefl", "toefl");
  numField("duolingo", "duolingo");
  numField("sat", "sat");
  numField("act", "act");
  numField("budgetUsd", "budget");
  if (form.fundingNeed !== "") body.fundingNeed = form.fundingNeed;
  else if (typeof baseline.fundingNeed === "string" && baseline.fundingNeed !== "") body.fundingNeed = null;
  strField("languagePref", "languagePref");
  if (form.startYear.trim() !== "") {
    const y = parseNum(form.startYear);
    if (y != null) body.startYear = y;
  } else if (baseline.startYear != null) body.startYear = null;
  if (form.countries.length > 0 || (Array.isArray(baseline.countries) && baseline.countries.length > 0)) {
    body.countries = form.countries;
  }
  return body;
}

// ---------------------------------------------------------------------------
// Small presentational pieces
// ---------------------------------------------------------------------------

function Badge({ tone, children }: { tone: "green" | "red" | "amber" | "slate" | "indigo"; children: React.ReactNode }) {
  const tones: Record<string, string> = {
    green: "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950 dark:text-emerald-300 dark:border-emerald-900",
    red: "bg-red-50 text-red-700 border-red-200 dark:bg-red-950 dark:text-red-300 dark:border-red-900",
    amber: "bg-amber-50 text-amber-800 border-amber-200 dark:bg-amber-950 dark:text-amber-300 dark:border-amber-900",
    slate: "bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700",
    indigo: "bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-indigo-950 dark:text-indigo-300 dark:border-indigo-900",
  };
  return (
    <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-semibold ${tones[tone]}`}>
      {children}
    </span>
  );
}

function DimHeading({ icon, children }: { icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <h4 className="flex items-center gap-1.5 text-[11px] font-extrabold uppercase tracking-wide text-slate-500 dark:text-slate-400">
      <span className="text-slate-400 dark:text-slate-500">{icon}</span> {children}
    </h4>
  );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

interface FormState {
  degreeLevel: string;
  gpa: string;
  gpaScale: string;
  ielts: string;
  toefl: string;
  duolingo: string;
  sat: string;
  act: string;
  budget: string;
  fundingNeed: string;
  languagePref: string;
  startYear: string;
  countries: string[];
}

const EMPTY_FORM: FormState = {
  degreeLevel: "",
  gpa: "",
  gpaScale: "",
  ielts: "",
  toefl: "",
  duolingo: "",
  sat: "",
  act: "",
  budget: "",
  fundingNeed: "",
  languagePref: "",
  startYear: "",
  countries: [],
};

const MAX_COMPARE = 3;

export function RecommendationStudio({
  activeProfile,
  onProfileSaved,
}: {
  activeProfile: StudioProfile | null;
  onProfileSaved?: (profile: StudentProfile) => void;
}) {
  const t = useTranslations("recommend");
  const tStudy = useTranslations("studyInterest");
  const { locale } = useLocaleContext();

  const [studyInterests, setStudyInterests] = useState<StudyInterestSelection[]>([]);
  /** A changed selection is persisted to the profile before recommendations run. */
  const userTouchedInterests = useRef(false);
  const [studyInterestAttempted, setStudyInterestAttempted] = useState(false);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const baseline = useRef<Record<string, unknown>>({});
  const prefilledProfile = useRef<number | null>(null);

  const [status, setStatus] = useState<"idle" | "loading" | "success">("idle");
  const [error, setError] = useState<{ code: string; message: string } | null>(null);
  const [data, setData] = useState<RecommendResponse | null>(null);
  const [savedIds, setSavedIds] = useState<Set<number>>(new Set());
  const [plannedIds, setPlannedIds] = useState<Set<number>>(new Set());
  const [compareIds, setCompareIds] = useState<Set<number>>(new Set());
  const [showInputs, setShowInputs] = useState(false);
  const [showOptional, setShowOptional] = useState(false);

  const statusRef = useRef<HTMLDivElement>(null);

  const setField = useCallback(<K extends keyof FormState>(key: K, value: FormState[K]) => {
    setForm((f) => ({ ...f, [key]: value }));
  }, []);

  // ---- Prefill from the saved profile (flagged; user confirms) -------------
  useEffect(() => {
    if (!activeProfile) return;
    const pid = activeProfile.id ?? null;
    if (prefilledProfile.current === pid) return;
    prefilledProfile.current = pid;

    // setState only in an async callback (never synchronously in the effect
    // body) — same pattern as the rest of the app shell.
    const profile = activeProfile;
    void Promise.resolve().then(() => {
      const countries = ((): string[] => {
        try {
          const p = JSON.parse(profile.preferredCountries || "[]");
          return Array.isArray(p) ? p.map(String).filter(Boolean).slice(0, 12) : [];
        } catch {
          return (profile.preferredCountries || "").split(",").map((s) => s.trim()).filter(Boolean).slice(0, 12);
        }
      })();

      const b: Record<string, unknown> = {
        degreeLevel: profile.degreeLevel,
        gpa: profile.gpa,
        gpaScale: profile.gpaScale,
        ielts: profile.ieltsScore,
        toefl: profile.toeflScore,
        duolingo: profile.duolingoScore,
        sat: profile.satScore,
        act: profile.actScore,
        budget: profile.budgetAnnualUsd,
        fundingNeed: null, // resolved server-side from explicit profile flags only
        languagePref: null,
        startYear: null,
        countries,
      };
      baseline.current = b;

      setForm((f) => ({
        ...f,
        degreeLevel: profile.degreeLevel || f.degreeLevel,
        gpa: profile.gpa != null ? String(profile.gpa) : f.gpa,
        gpaScale: profile.gpaScale != null ? String(profile.gpaScale) : f.gpaScale,
        ielts: profile.ieltsScore != null ? String(profile.ieltsScore) : f.ielts,
        toefl: profile.toeflScore != null ? String(profile.toeflScore) : f.toefl,
        duolingo: profile.duolingoScore != null ? String(profile.duolingoScore) : f.duolingo,
        sat: profile.satScore != null ? String(profile.satScore) : f.sat,
        act: profile.actScore != null ? String(profile.actScore) : f.act,
        budget: profile.budgetAnnualUsd != null ? String(profile.budgetAnnualUsd) : f.budget,
        countries: countries.length ? countries : f.countries,
      }));
      if (!userTouchedInterests.current) {
        setStudyInterests(selectionsFromProfile(profile.studyInterests, profile.targetMajor));
      }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeProfile?.id]);

  const interests = useMemo(() => studyInterestRecommendationTerms(studyInterests), [studyInterests]);

  // ---- Run -------------------------------------------------------------------
  const run = useCallback(async () => {
    if (!isStudyInterestSelectionValid(studyInterests)) {
      setStudyInterestAttempted(true);
      setError({ code: "interests_required", message: t("errorInterests") });
      setStatus("idle");
      return;
    }
    setStudyInterestAttempted(false);
    setStatus("loading");
    setError(null);
    try {
      // Persist an intentional edit first, so leaving the recommender and
      // returning later restores exactly the same stable-ID selections.
      if (activeProfile?.id && userTouchedInterests.current) {
        const saveResponse = await fetch(`/api/profiles/${activeProfile.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            studyInterests: serializeStudyInterestSelections(studyInterests),
            targetMajor: compatibilityTargetMajor(studyInterests),
          }),
        });
        const savedBody = (await saveResponse.json().catch(() => ({}))) as Record<string, any>;
        if (!saveResponse.ok || !savedBody.profile) {
          setError({ code: "study_interests_save_failed", message: tStudy("saveError") });
          setStatus("idle");
          return;
        }
        onProfileSaved?.(savedBody.profile as StudentProfile);
        userTouchedInterests.current = false;
      }

      const requestBody = buildPayload(form, baseline.current, interests);
      // IDs, not localized labels, identify structured choices on the server.
      requestBody.studyInterests = studyInterests;
      const res = await fetch("/api/programs/recommend", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(requestBody),
      });
      const body = (await res.json().catch(() => ({}))) as Record<string, any>;
      if (!res.ok) {
        const code = String(body?.code ?? `http_${res.status}`);
        let message = String(body?.error ?? t("errorGeneric"));
        if (res.status === 401) message = t("errorAuth");
        else if (code === "interests_required") message = t("errorInterests");
        else if (code === "study_interests_invalid") message = tStudy("requiredError");
        else if (code === "data_unavailable" || res.status === 503) message = t("errorDataUnavailable");
        setError({ code, message });
        setStatus("idle");
        return;
      }
      setData(body as unknown as RecommendResponse);
      setStatus("success");
    } catch {
      setError({ code: "network", message: t("errorGeneric") });
      setStatus("idle");
    }
  }, [activeProfile, form, interests, onProfileSaved, studyInterests, t, tStudy]);

  // ---- Actions ---------------------------------------------------------------
  const saveProgram = useCallback(
    async (r: RecommendResult) => {
      if (!activeProfile?.id) return;
      try {
        const res = await fetch("/api/saved-programs", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ profileId: activeProfile.id, programId: r.program.id }),
        });
        if (res.ok || res.status === 201) setSavedIds((s) => new Set(s).add(r.program.id));
        else throw new Error(`HTTP ${res.status}`);
      } catch {
        setError({ code: "save_failed", message: t("saveError") });
      }
    },
    [activeProfile, t]
  );

  const makePlan = useCallback(
    async (r: RecommendResult) => {
      if (!activeProfile?.id) return;
      try {
        const res = await fetch("/api/applications", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            profileId: activeProfile.id,
            universityId: r.university.id,
            programName: r.program.name,
            intakeTerm: r.nextCycle?.intake ?? undefined,
            deadline: r.nextCycle?.deadline ?? undefined,
            portalUrl: r.nextCycle?.applicationUrl ?? r.program.applicationUrl ?? undefined,
          }),
        });
        if (res.ok || res.status === 201) setPlannedIds((s) => new Set(s).add(r.program.id));
        else throw new Error(`HTTP ${res.status}`);
      } catch {
        setError({ code: "plan_failed", message: t("planError") });
      }
    },
    [activeProfile, t]
  );

  const openUniversity = useCallback((universityId: number) => {
    window.dispatchEvent(new CustomEvent("scholarbridge:focus-record", { detail: { kind: "university", id: universityId } }));
  }, []);

  const toggleCompare = useCallback((programId: number) => {
    setCompareIds((s) => {
      const next = new Set(s);
      if (next.has(programId)) next.delete(programId);
      else if (next.size < MAX_COMPARE) next.add(programId);
      return next;
    });
  }, []);

  const clearInputs = useCallback(() => {
    userTouchedInterests.current = true;
    setStudyInterests([]);
    setStudyInterestAttempted(false);
    setForm(EMPTY_FORM);
    baseline.current = {};
    prefilledProfile.current = null;
  }, []);

  // ---- Derived ----------------------------------------------------------------
  const compareRows = useMemo(
    () => (data ? data.results.filter((r) => compareIds.has(r.program.id)) : []),
    [data, compareIds]
  );

  const fmtDate = useCallback(
    (iso: string | null) => {
      if (!iso) return "—";
      try {
        return new Date(`${iso}T00:00:00`).toLocaleDateString(locale, { year: "numeric", month: "short", day: "numeric" });
      } catch {
        return iso;
      }
    },
    [locale]
  );

  const fitLabel = useCallback(
    (level: string): string => {
      switch (level) {
        case "exact":
          return t("fitExact");
        case "synonym":
          return t("fitSynonym");
        case "partial":
          return t("fitPartial");
        case "weak":
          return t("fitWeak");
        case "none":
          return t("fitNone");
        default:
          return t("fitUnknown");
      }
    },
    [t]
  );

  const fitTone = useCallback((level: string): "green" | "indigo" | "amber" | "slate" | "red" => {
    switch (level) {
      case "exact":
        return "green";
      case "synonym":
        return "indigo";
      case "partial":
        return "amber";
      case "weak":
        return "slate";
      case "none":
        return "red";
      default:
        return "slate";
    }
  }, []);

  const inputSourceLabel = useCallback(
    (s: string) => (s === "request" ? t("inputRequest") : s === "profile" ? t("inputProfile") : t("inputUnknown")),
    [t]
  );

  const localizeStudyTerm = useCallback(
    (term: string) => {
      const reference = studyInterestTranslationReference(term);
      if (!reference) return term;
      return reference.kind === "area"
        ? tStudy(`areaLabels.${reference.id}` as never)
        : tStudy(`specializationLabels.${reference.id}` as never);
    },
    [tStudy]
  );

  const inputRows = useMemo(() => {
    if (!data) return [];
    const order = ["interests", "degreeLevel", "gpa", "gpaScale", "ielts", "toefl", "duolingo", "sat", "act", "countries", "budgetUsd", "fundingNeed", "languagePref", "startYear"];
    return order
      .filter((k) => data.inputs[k])
      .map((k) => {
        const v = data.inputs[k].value;
        let display: string;
        if (k === "interests" && Array.isArray(v)) {
          display = v.length
            ? v.map((interest) => localizeStudyTerm(String(interest))).join(", ")
            : data.inputs.interestMode?.value === "exploring"
              ? tStudy("exploring")
              : "—";
        } else if (Array.isArray(v)) display = v.length ? v.join(", ") : "—";
        else if (v == null || v === "") display = "—";
        else display = String(v);
        return { key: k, value: display, source: data.inputs[k].source };
      });
  }, [data, localizeStudyTerm, tStudy]);

  // ---- Render -----------------------------------------------------------------
  const inputCls =
    "w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:placeholder:text-slate-500 dark:focus:ring-indigo-900";
  const labelCls = "mb-1 block text-xs font-semibold text-slate-700 dark:text-slate-300";
  const hintCls = "mt-1 text-[11px] leading-snug text-slate-500 dark:text-slate-400";
  const btnPrimary =
    "inline-flex items-center justify-center gap-2 rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-300 disabled:cursor-not-allowed disabled:opacity-60";
  const btnGhost =
    "inline-flex items-center justify-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-slate-300 disabled:cursor-not-allowed disabled:opacity-60 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800";

  const optionalField = (
    key: keyof FormState,
    id: string,
    label: string,
    why: string,
    type: "text" | "number" = "text",
    placeholder?: string
  ) => (
    <div key={id}>
      <label htmlFor={id} className={labelCls}>
        {label}
      </label>
      <input
        id={id}
        type={type}
        inputMode={type === "number" ? "decimal" : undefined}
        value={form[key] as string}
        onChange={(e) => setField(key, e.target.value)}
        placeholder={placeholder}
        className={inputCls}
      />
      <p className={hintCls}>{why}</p>
    </div>
  );

  return (
    <section aria-label={t("title")} className="mx-auto w-full max-w-5xl">
      <div className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5 dark:border-slate-800 dark:bg-slate-900">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h3 className="flex items-center gap-1.5 text-xs font-extrabold uppercase tracking-wide text-slate-500 dark:text-slate-400">
              <Sparkles className="h-3.5 w-3.5" /> {t("title")}
            </h3>
            <p className="mt-1 max-w-2xl text-[11px] leading-snug text-slate-500 dark:text-slate-400">{t("subtitle")}</p>
          </div>
          <button type="button" onClick={clearInputs} className={btnGhost} aria-label={t("clearInputs")}>
            <Trash2 className="h-3.5 w-3.5" /> {t("clearInputs")}
          </button>
        </div>

        {/* ---- Inputs --------------------------------------------------------- */}
        <div className="mt-4 space-y-4">
          <StudyInterestPicker
            value={studyInterests}
            onChange={(next) => {
              userTouchedInterests.current = true;
              setStudyInterests(next);
              setStudyInterestAttempted(false);
              setError(null);
            }}
            showError={studyInterestAttempted}
            idPrefix="recommendation-study-interests"
          />

          {/* Skippable core fields */}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <div>
              <label htmlFor="rec-degree" className={labelCls}>
                {t("degreeLevel")}
              </label>
              <select id="rec-degree" value={normalizeDegreeLevel(form.degreeLevel) ?? form.degreeLevel} onChange={(e) => setField("degreeLevel", e.target.value)} className={inputCls}>
                <option value="">{t("dontKnow")}</option>
                {DEGREE_LEVELS.map((d) => (
                  <option key={d} value={d}>
                    {normalizeDegreeLevel(d) ? <DegreeLevelLabel value={d} /> : d}
                  </option>
                ))}
                {form.degreeLevel && !DEGREE_LEVELS.includes(normalizeDegreeLevel(form.degreeLevel) ?? form.degreeLevel) && (
                  <option value={normalizeDegreeLevel(form.degreeLevel) ?? form.degreeLevel}>
                    <DegreeLevelLabel value={form.degreeLevel} />
                  </option>
                )}
              </select>
              <p className={hintCls}>{t("degreeLevelWhy")}</p>
            </div>
            {optionalField("gpa", "rec-gpa", t("gpa"), t("gpaWhy"), "number")}
            {optionalField("gpaScale", "rec-gpa-scale", t("gpaScale"), t("gpaWhy"), "number")}
            {optionalField("budget", "rec-budget", t("budget"), t("budgetWhy"), "number")}
          </div>

          {/* Collapsible: everything else is skippable ------------------------ */}
          <div>
            <button
              type="button"
              onClick={() => setShowOptional((v) => !v)}
              aria-expanded={showOptional}
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-indigo-700 hover:text-indigo-900 focus:outline-none focus:ring-2 focus:ring-indigo-300 dark:text-indigo-300 dark:hover:text-indigo-100"
            >
              <ChevronDown className={`h-3.5 w-3.5 transition-transform ${showOptional ? "rotate-180" : ""}`} />
              {t("whyHeading")}
              <HelpCircle className="h-3.5 w-3.5" />
            </button>

            {showOptional && (
              <div className="mt-3 rounded-xl border border-slate-200 bg-slate-50 p-3 dark:border-slate-800 dark:bg-slate-950">
                <p className="mb-3 text-[11px] leading-snug text-slate-600 dark:text-slate-300">{t("whyText")}</p>
                {activeProfile && (
                  <p className="mb-3 rounded-lg border border-indigo-200 bg-indigo-50 px-3 py-2 text-[11px] text-indigo-800 dark:border-indigo-900 dark:bg-indigo-950 dark:text-indigo-200">
                    {t("prefilledNote")}
                  </p>
                )}

                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {optionalField("ielts", "rec-ielts", t("ielts"), t("testsWhy"), "number")}
                  {optionalField("toefl", "rec-toefl", t("toefl"), t("testsWhy"), "number")}
                  {optionalField("duolingo", "rec-duolingo", t("duolingo"), t("testsWhy"), "number")}
                  {optionalField("sat", "rec-sat", t("sat"), t("testsWhy"), "number")}
                  {optionalField("act", "rec-act", t("act"), t("testsWhy"), "number")}
                  <div>
                    <label htmlFor="rec-funding" className={labelCls}>
                      {t("fundingNeed")}
                    </label>
                    <select id="rec-funding" value={form.fundingNeed} onChange={(e) => setField("fundingNeed", e.target.value)} className={inputCls}>
                      <option value="">{t("dontKnow")}</option>
                      <option value="none">{t("fundingNone")}</option>
                      <option value="partial">{t("fundingPartial")}</option>
                      <option value="full">{t("fundingFull")}</option>
                    </select>
                    <p className={hintCls}>{t("fundingWhy")}</p>
                  </div>
                  {optionalField("languagePref", "rec-language", t("languagePref"), t("languagePrefWhy"))}
                  {optionalField("startYear", "rec-start-year", t("startYear"), t("startYearWhy"), "number")}
                  <div>
                    <label htmlFor="rec-countries" className={labelCls}>
                      {t("countries")}
                    </label>
                    <input
                      id="rec-countries"
                      value={form.countries.join(", ")}
                      onChange={(e) => setField("countries", e.target.value.split(",").map((s) => s.trim()).filter(Boolean).slice(0, 12))}
                      placeholder="Germany, Japan"
                      className={inputCls}
                    />
                    <p className={hintCls}>{t("countriesWhy")}</p>
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button type="button" onClick={() => void run()} disabled={status === "loading"} className={btnPrimary} aria-label={t("ariaRun")}>
              {status === "loading" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
              {status === "loading" ? t("loading") : t("run")}
            </button>
          </div>
        </div>

        {/* ---- Status region (announced politely) ------------------------------ */}
        <div ref={statusRef} role="status" aria-live="polite">
          {status === "loading" && (
            <div className="mt-4 flex items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 px-4 py-6 text-sm text-slate-600 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-300">
              <Loader2 className="h-5 w-5 animate-spin text-indigo-500" /> {t("loading")}
            </div>
          )}
          {error && status !== "loading" && (
            <div role="alert" className="mt-4 flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800 dark:border-red-900 dark:bg-red-950 dark:text-red-200">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
              <span>{error.message}</span>
            </div>
          )}
        </div>

        {/* ---- Results ---------------------------------------------------------- */}
        {status === "success" && data && (
          <>
            <div className="mt-4 flex flex-wrap items-center justify-between gap-2">
              <p className="text-xs font-semibold text-slate-700 dark:text-slate-200">
                {t("resultsCount", { n: data.results.length })}
                <span className="ml-2 font-normal text-slate-500 dark:text-slate-400">{t("scanned", { n: data.totalProgramsScanned })}</span>
              </p>
              <button type="button" onClick={() => setShowInputs((v) => !v)} className={btnGhost} aria-expanded={showInputs}>
                <ListChecks className="h-3.5 w-3.5" /> {t("inputsUsed")}
              </button>
            </div>

            {showInputs && (
              <div className="mt-3 overflow-hidden rounded-xl border border-slate-200 dark:border-slate-800">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-100 text-[11px] uppercase tracking-wide text-slate-500 dark:bg-slate-800 dark:text-slate-400">
                    <tr>
                      <th scope="col" className="px-3 py-2 font-semibold">
                        {t("inputsUsed")}
                      </th>
                      <th scope="col" className="px-3 py-2 font-semibold">
                        {t("colProgram")}
                      </th>
                      <th scope="col" className="px-3 py-2 font-semibold">
                        {t("source")}
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 bg-white dark:divide-slate-800 dark:bg-slate-900">
                    {inputRows.map((row) => (
                      <tr key={row.key}>
                        <td className="px-3 py-1.5 font-medium text-slate-700 dark:text-slate-200">{row.key}</td>
                        <td className="px-3 py-1.5 text-slate-600 dark:text-slate-300">{row.value}</td>
                        <td className="px-3 py-1.5 text-slate-500 dark:text-slate-400">{inputSourceLabel(row.source)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {data.results.length === 0 ? (
              <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 px-4 py-8 text-center text-sm text-slate-600 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-300">
                <Search className="mx-auto mb-2 h-6 w-6 text-slate-400" />
                {t("empty")}
              </div>
            ) : (
              <>
                {/* Compare tray (client-side, up to 3) */}
                {compareRows.length > 0 && (
                  <ScrollRegion label={t("compareTray")} className="mt-4 overflow-x-auto rounded-xl border border-indigo-200 bg-indigo-50/50 dark:border-indigo-900 dark:bg-indigo-950/40">
                    <div className="flex items-center justify-between px-3 pt-3">
                      <p className="text-xs font-extrabold uppercase tracking-wide text-indigo-700 dark:text-indigo-300">
                        {t("compareTray")} ({compareRows.length}/{MAX_COMPARE})
                      </p>
                      <button type="button" onClick={() => setCompareIds(new Set())} className={btnGhost}>
                        <X className="h-3 w-3" /> {t("compareClear")}
                      </button>
                    </div>
                    <table className="mt-2 w-full min-w-[560px] text-left text-xs">
                      <thead className="text-[11px] uppercase tracking-wide text-indigo-700 dark:text-indigo-300">
                        <tr>
                          <th scope="col" className="px-3 py-2 font-semibold">{t("colProgram")}</th>
                          <th scope="col" className="px-3 py-2 font-semibold">{t("colUniversity")}</th>
                          <th scope="col" className="px-3 py-2 font-semibold">{t("colFit")}</th>
                          <th scope="col" className="px-3 py-2 font-semibold">{t("colEligibility")}</th>
                          <th scope="col" className="px-3 py-2 font-semibold">{t("colAffordability")}</th>
                          <th scope="col" className="px-3 py-2 font-semibold">{t("colScore")}</th>
                          <th scope="col" className="px-3 py-2 font-semibold">{t("colDeadline")}</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-indigo-100 bg-white dark:divide-indigo-900 dark:bg-slate-900">
                        {compareRows.map((r) => (
                          <tr key={r.program.id}>
                            <td className="px-3 py-2 font-semibold text-slate-800 dark:text-slate-100">{r.program.name}</td>
                            <td className="px-3 py-2 text-slate-600 dark:text-slate-300">
                              {r.university.name}
                              {r.university.country ? <span className="text-slate-400 dark:text-slate-500"> · {r.university.country}</span> : null}
                            </td>
                            <td className="px-3 py-2 text-slate-600 dark:text-slate-300">{fitLabel(r.subjectFit.level)}</td>
                            <td className="px-3 py-2 text-slate-600 dark:text-slate-300">
                              {t("eligibilitySummary", { met: r.eligibility.met, unmet: r.eligibility.unmet, unknown: r.eligibility.unknown })}
                            </td>
                            <td className="px-3 py-2 text-slate-600 dark:text-slate-300">
                              {r.affordability.withinBudget === "yes" ? t("withinBudget") : r.affordability.withinBudget === "no" ? t("overBudget") : t("affordabilityUnknown")}
                            </td>
                            <td className="px-3 py-2 font-semibold text-indigo-700 dark:text-indigo-300">{r.matchScore}</td>
                            <td className="px-3 py-2 text-slate-600 dark:text-slate-300">{r.nextCycle ? fmtDate(r.nextCycle.deadline) : "—"}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </ScrollRegion>
                )}
                {compareRows.length === 0 && <p className="mt-4 text-[11px] text-slate-500 dark:text-slate-400">{t("compareHint")}</p>}

                <ul className="mt-3 space-y-4">
                  {data.results.map((r) => {
                    const saved = savedIds.has(r.program.id);
                    const planned = plannedIds.has(r.program.id);
                    const inCompare = compareIds.has(r.program.id);
                    const officialUrl = r.program.programUrl || r.program.applicationUrl || r.university.websiteUrl;
                    return (
                      <li key={r.program.id} className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
                        {/* Header: program + provenance + score */}
                        <div className="flex flex-wrap items-start justify-between gap-3">
                          <div className="min-w-0">
                            <h4 className="flex flex-wrap items-center gap-2 text-sm font-bold text-slate-900 dark:text-white">
                              <GraduationCap className="h-4 w-4 shrink-0 text-indigo-500" />
                              <span className="truncate">{r.program.name}</span>
                              {r.program.degreeLevel ? <Badge tone="slate">{normalizeDegreeLevel(r.program.degreeLevel) ? <DegreeLevelLabel value={r.program.degreeLevel} /> : r.program.degreeLevel}</Badge> : null}
                              {r.program.language ? (
                                <Badge tone="slate">
                                  <Languages className="h-3 w-3" /> {r.program.language}
                                </Badge>
                              ) : null}
                            </h4>
                            <p className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-500 dark:text-slate-400">
                              <button
                                type="button"
                                onClick={() => openUniversity(r.university.id)}
                                className="inline-flex items-center gap-1 font-semibold text-indigo-700 hover:text-indigo-900 hover:underline focus:outline-none focus:ring-2 focus:ring-indigo-300 dark:text-indigo-300 dark:hover:text-indigo-100"
                              >
                                <MapPin className="h-3 w-3" /> {r.university.name}
                              </button>
                              {r.university.country ? <span>· {r.university.country}</span> : null}
                              {r.university.city ? <span>· {r.university.city}</span> : null}
                            </p>
                            <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                              {r.programStale ? (
                                <Badge tone="amber">
                                  <AlertTriangle className="h-3 w-3" /> {t("stale")}
                                </Badge>
                              ) : r.program.verificationStatus === "verified" || r.program.isVerified ? (
                                <Badge tone="green">
                                  <BadgeCheck className="h-3 w-3" /> {t("verified")}
                                  {r.program.lastVerifiedAt ? (
                                    <span className="font-normal">
                                      · {t("lastVerified")} {fmtDate(r.program.lastVerifiedAt.slice(0, 10))}
                                    </span>
                                  ) : null}
                                </Badge>
                              ) : (
                                <Badge tone="amber">
                                  <HelpCircle className="h-3 w-3" /> {t("unverified")}
                                </Badge>
                              )}
                              {officialUrl ? (
                                <a
                                  href={officialUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="inline-flex items-center gap-1 text-[11px] font-semibold text-indigo-700 hover:text-indigo-900 hover:underline focus:outline-none focus:ring-2 focus:ring-indigo-300 dark:text-indigo-300 dark:hover:text-indigo-100"
                                >
                                  <ExternalLink className="h-3 w-3" /> {t("officialPage")}
                                </a>
                              ) : null}
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">{t("matchScore")}</p>
                            <p className="text-2xl font-extrabold text-indigo-600 dark:text-indigo-400">{r.matchScore}</p>
                            <p className="max-w-[180px] text-[10px] leading-tight text-slate-400 dark:text-slate-500">{t("matchScoreHint")}</p>
                          </div>
                        </div>

                        {/* The four separate dimensions */}
                        <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
                          {/* 1 — Subject fit */}
                          <div>
                            <DimHeading icon={<Target className="h-3.5 w-3.5" />}>{t("fit")}</DimHeading>
                            <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                              <Badge tone={fitTone(r.subjectFit.level)}>{fitLabel(r.subjectFit.level)}</Badge>
                              {r.subjectFit.matchedInterests.length > 0 ? (
                                <span className="text-[11px] text-slate-500 dark:text-slate-400">{r.subjectFit.matchedInterests.map(localizeStudyTerm).join(", ")}</span>
                              ) : null}
                            </div>
                          </div>

                          {/* 2 — Eligibility */}
                          <div>
                            <DimHeading icon={<ListChecks className="h-3.5 w-3.5" />}>{t("eligibility")}</DimHeading>
                            {r.eligibility.items.length === 0 && r.eligibility.textRequirements.length === 0 ? (
                              <p className="mt-1.5 flex items-start gap-1.5 text-xs text-slate-500 dark:text-slate-400">
                                <HelpCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" /> {t("noReqs")}
                              </p>
                            ) : (
                              <ul className="mt-1.5 space-y-1">
                                {r.eligibility.items.map((item) => (
                                  <li key={item.key} className="flex items-center justify-between gap-2 text-xs">
                                    <span className="font-medium capitalize text-slate-700 dark:text-slate-200">
                                      {item.key} <span className="text-slate-400 dark:text-slate-500">≥ {item.required}</span>
                                    </span>
                                    {item.status === "met" ? (
                                      <Badge tone="green">
                                        <CheckCircle2 className="h-3 w-3" /> {t("eligibilityMet")}
                                      </Badge>
                                    ) : item.status === "unmet" ? (
                                      <Badge tone="red">
                                        <AlertTriangle className="h-3 w-3" /> {t("eligibilityUnmet")}
                                      </Badge>
                                    ) : (
                                      <Badge tone="slate">
                                        <HelpCircle className="h-3 w-3" /> {t("eligibilityUnknown")}
                                      </Badge>
                                    )}
                                  </li>
                                ))}
                                {r.eligibility.textRequirements.map((tr, i) => (
                                  <li key={`${tr.kind}-${i}`} className="text-[11px] text-slate-500 dark:text-slate-400">
                                    <span className="font-semibold capitalize">{tr.kind}:</span> {tr.text}
                                  </li>
                                ))}
                                {r.eligibility.items.length > 0 ? (
                                  <li className="pt-1 text-[11px] font-semibold text-slate-600 dark:text-slate-300">
                                    {t("eligibilitySummary", { met: r.eligibility.met, unmet: r.eligibility.unmet, unknown: r.eligibility.unknown })}
                                  </li>
                                ) : null}
                              </ul>
                            )}
                          </div>

                          {/* 3 — Affordability + funding */}
                          <div>
                            <DimHeading icon={<Coins className="h-3.5 w-3.5" />}>{t("affordability")}</DimHeading>
                            <ul className="mt-1.5 space-y-1 text-xs">
                              <li className="flex items-center justify-between gap-2">
                                <span className="text-slate-500 dark:text-slate-400">{t("tuition")}</span>
                                <span className="font-semibold text-slate-800 dark:text-slate-100">
                                  {r.affordability.annualTuition != null
                                    ? `${r.affordability.annualTuition.toLocaleString(locale)} ${r.affordability.tuitionCurrency}`
                                    : t("tuitionUnknown")}
                                </span>
                              </li>
                              {r.university.annualLivingEst != null ? (
                                <li className="flex items-center justify-between gap-2">
                                  <span className="text-slate-500 dark:text-slate-400">{t("livingEst")}</span>
                                  <span className="font-semibold text-slate-800 dark:text-slate-100">
                                    ~{r.university.annualLivingEst.toLocaleString(locale)} {r.university.livingCostCurrency}
                                  </span>
                                </li>
                              ) : null}
                              <li>
                                {r.affordability.withinBudget === "yes" ? (
                                  <Badge tone="green">
                                    <PiggyBank className="h-3 w-3" /> {t("withinBudget")}
                                  </Badge>
                                ) : r.affordability.withinBudget === "no" ? (
                                  <Badge tone="red">
                                    <PiggyBank className="h-3 w-3" /> {t("overBudget")}
                                  </Badge>
                                ) : (
                                  <Badge tone="slate">
                                    <HelpCircle className="h-3 w-3" /> {t("affordabilityUnknown")}
                                  </Badge>
                                )}
                              </li>
                              <li className="pt-1 text-[11px] font-semibold text-slate-500 dark:text-slate-400">{t("funding")}</li>
                              {r.affordability.scholarshipMatches.length === 0 ? (
                                <li className="text-[11px] text-slate-500 dark:text-slate-400">{t("noFunding")}</li>
                              ) : (
                                r.affordability.scholarshipMatches.slice(0, 5).map((s) => (
                                  <li key={s.id} className="flex items-center gap-1.5 text-[11px] text-slate-700 dark:text-slate-200">
                                    <Coins className="h-3 w-3 shrink-0 text-amber-500" /> {s.title}
                                    {s.coverageType ? <span className="text-slate-400 dark:text-slate-500">({s.coverageType})</span> : null}
                                  </li>
                                ))
                              )}
                            </ul>
                          </div>

                          {/* 4 — Admission probability (always unavailable) */}
                          <div>
                            <DimHeading icon={<Scale className="h-3.5 w-3.5" />}>{t("probabilityLabel")}</DimHeading>
                            <div className="mt-1.5 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 dark:border-slate-800 dark:bg-slate-950">
                              <Badge tone="slate">
                                <HelpCircle className="h-3 w-3" /> {t("unavailable")}
                              </Badge>
                              <p className="mt-1.5 text-[11px] leading-snug text-slate-500 dark:text-slate-400">{t("probabilityUnavailable")}</p>
                            </div>

                            {/* Next application cycle */}
                            <div className="mt-3">
                              <DimHeading icon={<CalendarClock className="h-3.5 w-3.5" />}>{t("nextCycle")}</DimHeading>
                              {r.nextCycle ? (
                                <p className="mt-1.5 text-xs text-slate-700 dark:text-slate-200">
                                  {r.nextCycle.intake ? `${r.nextCycle.intake}` : null}
                                  {r.nextCycle.academicYear ? ` ${r.nextCycle.academicYear}` : null} — {t("cycleDeadline")}{" "}
                                  <span className="font-semibold">{r.nextCycle.deadline ? fmtDate(r.nextCycle.deadline) : "—"}</span>
                                  {r.nextCycle.isEstimated ? (
                                    <span className="mt-1 block text-[11px] text-amber-700 dark:text-amber-300">{t("cycleEstimated")}</span>
                                  ) : r.cycleStale ? (
                                    <span className="mt-1 block text-[11px] text-amber-700 dark:text-amber-300">{t("stale")}</span>
                                  ) : null}
                                </p>
                              ) : (
                                <p className="mt-1.5 flex items-start gap-1.5 text-xs text-slate-500 dark:text-slate-400">
                                  <HelpCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" /> {t("noCycle")}
                                </p>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Ranking factors / missing inputs / considerations */}
                        <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-3">
                          <div>
                            <DimHeading icon={<Sparkles className="h-3.5 w-3.5" />}>{t("rankingFactors")}</DimHeading>
                            <ul className="mt-1.5 list-inside list-disc space-y-0.5 text-[11px] text-slate-600 dark:text-slate-300">
                              {r.rankingFactors.map((f, i) => (
                                <li key={i}>{f}</li>
                              ))}
                            </ul>
                          </div>
                          <div>
                            <DimHeading icon={<HelpCircle className="h-3.5 w-3.5" />}>{t("missingInputs")}</DimHeading>
                            {r.missingInputs.length === 0 ? (
                              <p className="mt-1.5 text-[11px] text-slate-400 dark:text-slate-500">—</p>
                            ) : (
                              <ul className="mt-1.5 flex flex-wrap gap-1">
                                {r.missingInputs.map((m, i) => (
                                  <li key={i}>
                                    <Badge tone="indigo">{m}</Badge>
                                  </li>
                                ))}
                              </ul>
                            )}
                          </div>
                          <div>
                            <DimHeading icon={<AlertTriangle className="h-3.5 w-3.5" />}>{t("considerations")}</DimHeading>
                            <ul className="mt-1.5 list-inside list-disc space-y-0.5 text-[11px] text-slate-600 dark:text-slate-300">
                              {r.considerations.map((c, i) => (
                                <li key={i}>{c}</li>
                              ))}
                            </ul>
                          </div>
                        </div>

                        {/* Actions */}
                        <div className="mt-4 flex flex-wrap gap-2 border-t border-slate-100 pt-3 dark:border-slate-800">
                          <button type="button" onClick={() => void saveProgram(r)} disabled={saved} className={btnGhost}>
                            {saved ? <BookmarkCheck className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" /> : <Bookmark className="h-3.5 w-3.5" />}
                            {saved ? t("saved") : t("save")}
                          </button>
                          <button
                            type="button"
                            onClick={() => toggleCompare(r.program.id)}
                            aria-pressed={inCompare}
                            aria-label={t("ariaToggleCompare")}
                            className={`${btnGhost} ${inCompare ? "!border-indigo-400 !text-indigo-700 dark:!border-indigo-600 dark:!text-indigo-300" : ""}`}
                          >
                            <Scale className="h-3.5 w-3.5" /> {t("compare")}
                          </button>
                          <button type="button" onClick={() => openUniversity(r.university.id)} className={btnGhost}>
                            <MapPin className="h-3.5 w-3.5" /> {t("openUniversity")}
                          </button>
                          <button type="button" onClick={() => void makePlan(r)} disabled={planned} className={btnGhost}>
                            <GraduationCap className="h-3.5 w-3.5" /> {planned ? t("planCreated") : t("makePlan")}
                          </button>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              </>
            )}
          </>
        )}
      </div>
      {/* Standing small print: this panel can be wrong — say so where it is read. */}
      <AppNote kind="estimate" className="mt-2" />
    </section>
  );
}
