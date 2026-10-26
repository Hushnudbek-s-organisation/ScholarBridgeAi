"use client";

import React, { useRef, useState } from "react";
import { useTranslations } from "next-intl";
import {countriesMatch, countryTranslationKey, withQsTop200Countries, resolveCountryCode} from "@/lib/countries";

import { collapsePicks, countrySearchMatch, rankCountryPicks } from "@/lib/countryPicker";
import { CountryFlag } from "@/components/CountryFlag";
import { ShowMoreToggle } from "@/components/hubs/ui";import {
  User,
  GraduationCap,
  Compass,
  BookOpen,
  FileCheck,
  Wallet,
  Globe2,
  Trophy,
  ArrowRight,
  ArrowLeft,
  SkipForward,
  CheckCircle2,
  Info,
  Sparkles,
} from "lucide-react";
import { StudentProfile } from "./Navbar";
import { MIN_PASSWORD_LENGTH } from "@/lib/passwordPolicy";
import { DegreeLevelLabel } from "./DegreeLevelLabel";
import { normalizeDegreeLevel } from "@/lib/degreeLevels";
import { StudyInterestPicker } from "@/components/StudyInterestPicker";
import { CareerDiscoveryFlow } from "@/components/journey/CareerDiscoveryFlow";
import { selectionsForCareer } from "@/lib/careerDiscovery";
import {
  compatibilityTargetMajor,
  isStudyInterestSelectionValid,
  selectionsFromProfile,
  serializeStudyInterestSelections,
  type StudyInterestSelection,
} from "@/lib/studyInterests";
import { isTelegramPlaceholderEmail } from "@/lib/telegram/placeholder";
import { SmartAutofillBox } from "@/components/samples/SmartAutofillBox";
import type { ExtractedKey, ExtractedProfileFields } from "@/lib/profileExtract";

/**
 * Where the student says they are right now (product journey §4.1).
 * THREE EQUAL choices — "not sure yet" is as respectable as "I know my goal",
 * and none of them forces an answer the student does not have.
 */
type OnboardingPath = "goal" | "interests" | "undecided";

interface OnboardingWizardProps {
  /**
   * Existing profile (resume mode) OR null for a brand-new visitor:
   * in that case step 1 (name + email) creates the profile via POST /api/profiles,
   * and every following step saves through PUT /api/profiles/:id.
   */
  profile: StudentProfile | null;
  onCreated?: (profile: StudentProfile) => void;
  onComplete: (updated: StudentProfile) => void;
}

interface FormState {
  name: string;
  email: string;
  password: string;
  degreeLevel: string;
  targetMajor: string;
  studyInterests: StudyInterestSelection[];
  gpa: string;
  gpaScale: string;
  ieltsScore: string;
  toeflScore: string;
  satScore: string;
  greScore: string;
  budgetAnnualUsd: string;
  needsFinancialAid: boolean | null;
  preferredCountries: string[];
  workExperienceYears: string;
  researchPublications: string;
  extracurriculars: string;
}

const COUNTRIES = withQsTop200Countries([
  "United States",
  "United Kingdom",
  "Canada",
  "Germany",
  "Australia",
  "Singapore",
  "Netherlands",
  "Switzerland",
  "Japan",
  "France",
  "Sweden",
  "South Korea",
  "United Arab Emirates",
  "China",
]);

const DEGREES = ["Bachelor", "Master", "PhD"];

const ONBOARDING_PATHS = [
  { id: "goal", icon: "🎯" },
  { id: "interests", icon: "🌱" },
  { id: "undecided", icon: "🧭" },
] as const satisfies readonly { id: OnboardingPath; icon: string }[];

const choiceCardBase =
  "relative flex min-w-0 rounded-2xl border-2 text-left transition-[border-color,background-color,box-shadow] duration-150 motion-reduce:transition-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2 focus-visible:ring-offset-white dark:focus-visible:ring-offset-slate-100";
const choiceCardSelected =
  "border-indigo-500 bg-indigo-50 ring-2 ring-indigo-500/15 shadow-md shadow-indigo-500/10";
const choiceCardUnselected = "border-slate-200 bg-white hover:border-indigo-300";

/** Values the CV auto-fill may place in this wizard (never the degree chosen in step 2). */
const AUTOFILL_FIELDS: ExtractedKey[] = [
  "gpa",
  "gpaScale",
  "ieltsScore",
  "toeflScore",
  "satScore",
  "greScore",
  "workExperienceYears",
  "researchPublications",
];

const STEPS = [
  { id: 0, titleKey: "identity", icon: User },
  { id: 1, titleKey: "degree", icon: GraduationCap },
  { id: 2, titleKey: "interests", icon: Compass },
  { id: 3, titleKey: "academics", icon: BookOpen },
  { id: 4, titleKey: "tests", icon: FileCheck },
  { id: 5, titleKey: "finance", icon: Wallet },
  { id: 6, titleKey: "countries", icon: Globe2 },
  { id: 7, titleKey: "experience", icon: Trophy },
];

// Field colours, hover and the indigo focus halo come from `.sb-field` (globals.css).
const inputCls =
  "sb-field min-h-11 w-full rounded-xl border px-4 py-3 text-sm text-slate-800 focus:outline-none motion-reduce:transition-none";
const labelCls = "block text-[11px] font-bold text-slate-600 uppercase tracking-wide mb-1.5";

export function OnboardingWizard({ profile, onCreated, onComplete }: OnboardingWizardProps) {
  const tCountry = useTranslations("countryNames");
  const tCommon = useTranslations("common");
  const tOnboarding = useTranslations("onboarding");
  const tStudy = useTranslations("studyInterest");
  const tDisc = useTranslations("careerDiscovery");
  const resumeStudyInterests = selectionsFromProfile(profile?.studyInterests, profile?.targetMajor, {
    // A new profile is created before the interest step; the legacy default
    // “Computer Science” must not satisfy the required onboarding selection.
    ignoreDefaultComputerScience: Boolean(profile && !profile.onboardingCompleted && !profile.studyInterests),
  });
  // Resume from the saved step, but send legacy profiles without any valid
  // interest back to the required interest step before they can finish.
  const requestedStartStep = profile ? Math.min(Math.max(profile.onboardingStep ?? 0, 0), 7) : 0;
  const startStep =
    profile && requestedStartStep > 2 && !isStudyInterestSelectionValid(resumeStudyInterests)
      ? 2
      : requestedStartStep;

  const inferPath = (): OnboardingPath | null => {
    const sel = resumeStudyInterests;
    if (sel.some((s) => s.kind === "exploring")) return "undecided";
    if (sel.some((s) => s.kind === "specialization")) return "goal";
    if (sel.some((s) => s.kind === "area")) return "interests";
    return null;
  };
  const [onboardingPath, setOnboardingPath] = useState<OnboardingPath | null>(inferPath);
  const [step, setStep] = useState<number>(startStep);
  const [createdId, setCreatedId] = useState<number | null>(profile?.id ?? null);
  const [saving, setSaving] = useState(false);
  // STEP 7 country wall → search + ranked 12-card preview (the same pattern
  // as the profile modal), so the wizard fits one screen on a phone.
  const [countrySearch, setCountrySearch] = useState("");
  const [showAllCountries, setShowAllCountries] = useState(false);
  const [finished, setFinished] = useState(false);
  const [error, setError] = useState("");
  const pathButtonRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const studyInterestsTouched = useRef(false);
  // Telegram-only accounts carry a technical placeholder email; never show it
  // as if the student had typed it, and keep the email optional for them.
  const placeholderEmail = isTelegramPlaceholderEmail(profile?.email) ? profile!.email : "";
  const [form, setForm] = useState<FormState>({
    name: profile?.name || "",
    email: placeholderEmail ? "" : profile?.email || "",
    password: "",
    degreeLevel: profile?.degreeLevel || "",
    targetMajor: profile?.targetMajor || "",
    studyInterests: resumeStudyInterests,
    gpa: profile?.gpa ? String(profile.gpa) : "",
    gpaScale: profile?.gpaScale ? String(profile.gpaScale) : "",
    ieltsScore: profile?.ieltsScore ? String(profile.ieltsScore) : "",
    toeflScore: profile?.toeflScore ? String(profile.toeflScore) : "",
    satScore: profile?.satScore ? String(profile.satScore) : "",
    greScore: profile?.greScore ? String(profile.greScore) : "",
    budgetAnnualUsd: profile?.budgetAnnualUsd ? String(profile.budgetAnnualUsd) : "",
    // Unchecked until the student ticks the step that asks this question.
    needsFinancialAid: profile?.needsFinancialAid ?? (profile?.needScholarship === true ? true : null),
    preferredCountries: safeParseCountries(profile?.preferredCountries),
    workExperienceYears: profile?.workExperienceYears != null ? String(profile.workExperienceYears) : "",
    researchPublications: profile?.researchPublications != null ? String(profile.researchPublications) : "",
    extracurriculars: profile?.extracurriculars || "",
  });

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) =>
    setForm((f) => ({ ...f, [key]: value }));

  /** Smart auto-fill → the unsaved form. Saving still happens on "Continue". */
  const applyAutofill = (fields: ExtractedProfileFields): number => {
    const patch: Partial<FormState> = {};
    // The wizard offers 4.0 / 5.0 / 10.0 scales only; any other scale stays manual.
    if (fields.gpa != null && fields.gpaScale != null && [4, 5, 10].includes(fields.gpaScale)) {
      patch.gpa = String(fields.gpa);
      patch.gpaScale = `${fields.gpaScale}.0`;
    }
    if (fields.ieltsScore != null) patch.ieltsScore = String(fields.ieltsScore);
    if (fields.toeflScore != null) patch.toeflScore = String(fields.toeflScore);
    if (fields.satScore != null) patch.satScore = String(fields.satScore);
    if (fields.greScore != null) patch.greScore = String(fields.greScore);
    if (fields.workExperienceYears != null) patch.workExperienceYears = String(fields.workExperienceYears);
    if (fields.researchPublications != null) patch.researchPublications = String(fields.researchPublications);
    setForm((f) => ({ ...f, ...patch }));
    return Object.keys(patch).length;
  };

  const selectOnboardingPath = (path: OnboardingPath) => {
    setOnboardingPath(path);
    setError("");
  };

  const handlePathRadioKeyDown = (
    event: React.KeyboardEvent<HTMLButtonElement>,
    currentIndex: number
  ) => {
    const direction =
      event.key === "ArrowRight" || event.key === "ArrowDown"
        ? 1
        : event.key === "ArrowLeft" || event.key === "ArrowUp"
          ? -1
          : 0;
    if (direction === 0) return;

    event.preventDefault();
    const nextIndex =
      (currentIndex + direction + ONBOARDING_PATHS.length) % ONBOARDING_PATHS.length;
    selectOnboardingPath(ONBOARDING_PATHS[nextIndex].id);
    pathButtonRefs.current[nextIndex]?.focus();
  };

  const storedReferralCode = (): string | null => {
    try {
      const raw = localStorage.getItem("scholarbridge_ref");
      if (!raw) return null;
      const { code, at } = JSON.parse(raw);
      if (!code || !at || Date.now() - at > 48 * 60 * 60 * 1000) {
        localStorage.removeItem("scholarbridge_ref");
        return null;
      }
      return code;
    } catch {
      return null;
    }
  };

  /**
   * Persist the current step. For a brand-new visitor the very first save
   * creates the profile (POST /api/profiles with name/email + referral code),
   * afterwards every step uses PUT /api/profiles/:id. Each save advances
   * onboardingStep so the user can leave and resume later.
   */
  const persist = async (nextStep: number, completed: boolean) => {
    const creatingProfile = createdId == null;
    let failureMessage = tOnboarding(creatingProfile ? "createError" : "saveError");
    setSaving(true);
    setError("");
    try {
      // Empty answers are sent as NULL/empty, NEVER as invented defaults: the
    // wizard used to save "Master", "Computer Science", GPA 3.5, $25 000 and a
    // 4-country list when the student skipped a step, which made every later
    // score and recommendation look personalised for data nobody entered.
    const num = (v: string): number | null => {
      const n = Number(v);
      return v.trim() !== "" && Number.isFinite(n) ? n : null;
    };
    const payload: Record<string, unknown> = {
        name: form.name,
        email: form.email.trim() || placeholderEmail || form.email,
        degreeLevel: form.degreeLevel || null,
        targetMajor:
          form.studyInterests.some((selection) => selection.kind === "exploring")
            ? ""
            : studyInterestsTouched.current
              ? compatibilityTargetMajor(form.studyInterests)
              : form.targetMajor || compatibilityTargetMajor(form.studyInterests) || null,
        gpa: num(form.gpa),
        gpaScale: num(form.gpaScale),
        ieltsScore: num(form.ieltsScore),
        toeflScore: num(form.toeflScore),
        satScore: num(form.satScore),
        greScore: num(form.greScore),
        budgetAnnualUsd: num(form.budgetAnnualUsd),
        // The legacy boolean is true only for an explicit yes; the nullable
        // field preserves an unrecorded answer as unknown rather than "no".
        needScholarship: form.needsFinancialAid === true,
        needsFinancialAid: form.needsFinancialAid,
        preferredCountries: form.preferredCountries,
        workExperienceYears: num(form.workExperienceYears),
        researchPublications: num(form.researchPublications),
        extracurriculars: form.extracurriculars || null,
        onboardingStep: nextStep,
        onboardingCompleted: completed,
      };
      if (isStudyInterestSelectionValid(form.studyInterests)) {
        payload.studyInterests = serializeStudyInterestSelections(form.studyInterests);
      }

      if (createdId == null) {
        // Step 1: create the profile (name + email + password are mandatory
        // here — this pair is what the student signs in with later, from any
        // device). The referral code from the URL (?ref=) is applied
        // server-side.
        let created: StudentProfile;
        const res = await fetch("/api/profiles", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            ...payload,
            password: form.password,
            referralCode: storedReferralCode(),
          }),
        });
        const data = await res.json();
        if (!res.ok || !data.profile) {
          failureMessage =
            res.status === 409 || data.code === "email_taken"
              ? tOnboarding("emailTaken")
              : data.code === "invalid_email"
                ? tOnboarding("invalidEmail")
                : data.code === "weak_password"
                  ? tOnboarding("weakPassword", { minimum: MIN_PASSWORD_LENGTH })
                  : data.code === "study_interests_invalid"
                    ? tOnboarding("selectStudyInterest")
                    : tOnboarding("createError");
          setError(failureMessage);
          return null;
        }
        created = data.profile as StudentProfile;

        setCreatedId(created.id);
        onCreated?.(created);

        // Legacy profile claimed via auth (e.g. the admin account) is already
        // fully onboarded — jump straight to the app.
        if (created.onboardingCompleted) {
          onComplete(created);
          return created;
        }
        return created;
      }

      const res = await fetch(`/api/profiles/${createdId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...payload, requesterId: createdId }),
      });
      const data = await res.json();
      if (!res.ok || !data.profile) {
        failureMessage =
          data.code === "study_interests_invalid"
            ? tOnboarding("selectStudyInterest")
            : tOnboarding("saveError");
        setError(failureMessage);
        return null;
      }
      return data.profile as StudentProfile;
    } catch {
      setError(failureMessage);
      return null;
    } finally {
      setSaving(false);
    }
  };

  /** Step 1 requirements for a BRAND-NEW account (password = sign-in key). */
  const isNewAccount = createdId == null;
  const step0Invalid =
    !form.name.trim() ||
    (!form.email.trim() && !placeholderEmail) ||
    // Must match MIN_PASSWORD_LENGTH in src/lib/password.ts (server rejects
    // anything shorter, so a 6-char pass here would only fail later).
    (isNewAccount && form.password.trim().length < MIN_PASSWORD_LENGTH);
  const step2Invalid = !isStudyInterestSelectionValid(form.studyInterests);

  const handleNext = async () => {
    if (step === 0 && step0Invalid) {
      setError(
        isNewAccount
          ? tOnboarding("identityPasswordRequired", { minimum: MIN_PASSWORD_LENGTH })
          : tOnboarding("identityRequired")
      );
      return;
    }
    if (step === 2 && step2Invalid) return;
    if (step === STEPS.length - 1) {
      const updated = await persist(8, true);
      if (updated) {
        setFinished(true);
        onComplete(updated);
      }
      return;
    }
    const updated = await persist(step + 1, false);
    if (updated) setStep((s) => s + 1);
  };

  const handleSkip = async () => {
    if (step === 2 && step2Invalid) return;
    if (step === STEPS.length - 1) {
      const updated = await persist(8, true);
      if (updated) {
        setFinished(true);
        onComplete(updated);
      }
      return;
    }
    const updated = await persist(step + 1, false);
    if (updated) setStep((s) => s + 1);
  };

  const handleBack = () => {
    setError("");
    setStep((s) => Math.max(0, s - 1));
  };

  const countrySearching = countrySearch.trim() !== "";
  const isChosenCountry = (c: string) =>
    form.preferredCountries.some((value) => countriesMatch(value, c));
  const visibleWizardCountries = (() => {
    const labelOf = (c: string) => {
      const k = countryTranslationKey(c);
      return k ? tCountry(k) : c;
    };
    const filtered = COUNTRIES.filter((c) =>
      countrySearchMatch(countrySearch, [c, labelOf(c), resolveCountryCode(c)])
    );
    const ranked = rankCountryPicks(filtered, {
      isSelected: isChosenCountry,
      priorityCodes: ["us", "gb", "de", "ca", "kr", "au", "sg", "jp"],
      codeOf: (c) => resolveCountryCode(c),
    });
    return collapsePicks(ranked, 12, showAllCountries || countrySearching, isChosenCountry);
  })();

  const toggleCountry = (c: string) => {
    const selected = form.preferredCountries.some((value) => countriesMatch(value, c));
    set(
      "preferredCountries",
      selected
        ? form.preferredCountries.filter((value) => !countriesMatch(value, c))
        : [...form.preferredCountries, c]
    );
  };

  // ---------------- Done screen ----------------
  if (finished) {
    return (
      <div className="max-w-lg mx-auto">
        <div className="bg-white rounded-3xl border border-slate-200 shadow-xl p-8 sm:p-10 text-center space-y-5">
          <div className="mx-auto h-20 w-20 rounded-full bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center shadow-lg shadow-indigo-200">
            <CheckCircle2 className="h-10 w-10 text-white" />
          </div>
          <h2 className="text-2xl font-extrabold text-slate-900">{tOnboarding("doneTitle")}</h2>
          <p className="text-sm text-slate-500 leading-relaxed">{tOnboarding("doneBody")}</p>
          <button
            onClick={() => onComplete(profile ?? ({} as StudentProfile))}
            className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-indigo-600 to-violet-600 text-white font-bold rounded-xl shadow-md hover:from-indigo-700 hover:to-violet-700 transition-all"
          >
            <Sparkles className="h-4 w-4" /> {tOnboarding("goToDashboard")}
          </button>
        </div>
      </div>
    );
  }

  const stepInfo = STEPS[step];
  const StepIcon = stepInfo.icon;
  const progressPct = Math.round((step / (STEPS.length - 1)) * 100);
  const isLast = step === STEPS.length - 1;
  const nextDisabled = saving || (step === 0 && step0Invalid) || (step === 2 && step2Invalid);

  return (
    <div className="mx-auto w-full min-w-0 max-w-3xl">
      {/* Progress header */}
      <div className="mb-4 sm:mb-5">
        <div className="flex items-center justify-between mb-2">
          <p className="min-w-0 break-words text-xs font-bold uppercase tracking-wide text-slate-600">
            {createdId == null ? tOnboarding("createAccount") : tOnboarding("completeProfile")}
          </p>
          <p className="shrink-0 text-xs font-extrabold text-indigo-600">
            {tOnboarding("stepCount", { current: step + 1, total: STEPS.length })}
          </p>
        </div>
        <div className="h-2.5 bg-slate-200 rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-indigo-500 to-violet-500 rounded-full transition-all duration-500 ease-out"
            style={{ width: `${Math.max(progressPct, 8)}%` }}
          />
        </div>
        <div className="flex items-center gap-2 mt-3">
          <div className="h-8 w-8 rounded-xl bg-indigo-600 text-white flex items-center justify-center shrink-0">
            <StepIcon className="h-4 w-4" />
          </div>
          <h2 className="min-w-0 break-words text-lg font-extrabold text-slate-900 sm:text-xl">
            {step === 2 ? tStudy("title") : tOnboarding(`stepTitles.${stepInfo.titleKey}` as never)}
          </h2>
        </div>
      </div>

      <div
        key={step}
        className="relative min-w-0 rounded-3xl border border-slate-200 bg-white p-4 shadow-md animate-fadeIn sm:p-6 lg:p-8"
      >
        {error && (
          <div
            role="alert"
            className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-[13px] font-semibold text-red-700 dark:border-red-500/40 dark:bg-red-500/10 dark:text-red-200"
          >
            {error}
          </div>
        )}
        {!error && step === 0 && step0Invalid && (
          <p className="mb-4 text-xs font-semibold text-slate-500 dark:text-slate-400">
            {isNewAccount
              ? tOnboarding("identityPasswordRequired", { minimum: MIN_PASSWORD_LENGTH })
              : tOnboarding("identityRequired")}
          </p>
        )}

        {/* STEP 1 — Name, email & password (mandatory on new accounts) */}
        {step === 0 && (
          <div className="space-y-4">
            <div>
              <label className={labelCls} htmlFor="ob-name">{tOnboarding("fullNameLabel")}</label>
              <input
                id="ob-name"
                name="name"
                autoComplete="name"
                required
                aria-required="true"
                aria-invalid={step0Invalid && !form.name.trim() ? true : undefined}
                className={inputCls}
                placeholder={tOnboarding("fullNamePlaceholder")}
                value={form.name}
                onChange={(e) => set("name", e.target.value)}
              />
            </div>
            <div>
              <label className={labelCls} htmlFor="ob-email">
                {placeholderEmail ? tOnboarding("emailOptionalLabel") : tOnboarding("emailRequiredLabel")}
              </label>
              <input
                id="ob-email"
                name="email"
                type="email"
                autoComplete="email"
                inputMode="email"
                required={!placeholderEmail}
                aria-required={!placeholderEmail}
                aria-invalid={step0Invalid && !form.email.trim() && !placeholderEmail ? true : undefined}
                className={inputCls}
                placeholder={tOnboarding("emailPlaceholder")}
                value={form.email}
                onChange={(e) => set("email", e.target.value)}
              />
              {placeholderEmail && (
                <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
                  {tOnboarding("telegramEmailHint")}
                </p>
              )}
            </div>
            {isNewAccount && (
              <div>
                <label className={labelCls} htmlFor="ob-password">{tOnboarding("passwordLabel")}</label>
                <input
                  id="ob-password"
                  name="new-password"
                  type="password"
                  required
                  aria-required="true"
                  aria-invalid={step0Invalid && form.password.trim().length < MIN_PASSWORD_LENGTH ? true : undefined}
                  aria-describedby="ob-password-help"
                  className={inputCls}
                  placeholder={tOnboarding("passwordPlaceholder", { minimum: MIN_PASSWORD_LENGTH })}
                  value={form.password}
                  onChange={(e) => set("password", e.target.value)}
                  autoComplete="new-password"
                />
                <p id="ob-password-help" className="mt-2 text-xs text-slate-500 dark:text-slate-400">
                  {tOnboarding("passwordHelp")}
                </p>
              </div>
            )}
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {tOnboarding("editProfileLater")}
            </p>
          </div>
        )}

        {/* STEP 2 — Target degree */}
        {step === 1 && (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3 sm:items-stretch">
            {DEGREES.map((d) => {
              const selected = normalizeDegreeLevel(form.degreeLevel) === d;
              return (
                <button
                  key={d}
                  type="button"
                  onClick={() => set("degreeLevel", d)}
                  aria-pressed={selected}
                  className={`${choiceCardBase} h-full min-h-16 w-full items-center justify-center px-4 py-4 text-sm font-semibold ${
                    selected
                      ? `${choiceCardSelected} text-indigo-700`
                      : `${choiceCardUnselected} text-slate-600`
                  }`}
                >
                  <span className="flex w-full min-w-0 items-center justify-between gap-3">
                    <span className="min-w-0 break-words hyphens-auto">
                      <DegreeLevelLabel value={d} />
                    </span>
                    <span
                      aria-hidden="true"
                      className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-sm font-bold ${
                        selected
                          ? "bg-indigo-600 text-white"
                          : "border border-transparent text-transparent"
                      }`}
                    >
                      {selected ? "✓" : ""}
                    </span>
                  </span>
                </button>
              );
            })}
          </div>
        )}

        {/* STEP 3 — Where are you now? (3 equal choices) → study interests,
            or the guided career-discovery flow for the undecided. */}
        {step === 2 && (
          <div className="min-w-0 space-y-3 sm:space-y-5">
            {/* Three equal, equally-respectful starting points. No answer is
                required before choosing; "I don't know yet" is a full flow. */}
            <div className="min-w-0">
              <div className="space-y-1.5">
                <p className="text-xs font-bold uppercase tracking-wide text-slate-500">
                  {tDisc("pathTitle")}
                </p>
                <p id="onboarding-path-subtitle" className="text-sm leading-relaxed text-slate-600 dark:text-slate-400">
                  {tDisc("pathSubtitle")}
                </p>
              </div>
              <div
                className="mt-3 grid auto-rows-fr grid-cols-1 gap-2.5 sm:auto-rows-auto sm:grid-cols-3 sm:items-stretch sm:gap-3 lg:gap-4"
                role="radiogroup"
                aria-label={tDisc("pathTitle")}
                aria-describedby="onboarding-path-subtitle"
              >
                {ONBOARDING_PATHS.map((opt, index) => {
                  const selected = onboardingPath === opt.id;
                  const titleId = `onboarding-path-${opt.id}-title`;
                  const bodyId = `onboarding-path-${opt.id}-body`;
                  const isInitialTabStop = onboardingPath === null && index === 0;
                  return (
                    <button
                      key={opt.id}
                      ref={(element) => {
                        pathButtonRefs.current[index] = element;
                      }}
                      type="button"
                      role="radio"
                      aria-checked={selected}
                      aria-labelledby={titleId}
                      aria-describedby={bodyId}
                      tabIndex={selected || isInitialTabStop ? 0 : -1}
                      onClick={() => selectOnboardingPath(opt.id)}
                      onKeyDown={(event) => handlePathRadioKeyDown(event, index)}
                      className={`${choiceCardBase} h-full min-h-[8.5rem] w-full flex-col items-stretch px-3 py-1 sm:min-h-48 sm:px-4 sm:py-4 ${
                        selected ? choiceCardSelected : choiceCardUnselected
                      }`}
                    >
                      <span className="flex min-h-9 items-center justify-between gap-3 sm:min-h-10">
                        <span
                          aria-hidden="true"
                          className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-indigo-50 text-2xl leading-none text-indigo-700 dark:bg-indigo-500/15 sm:h-10 sm:w-10"
                        >
                          {opt.icon}
                        </span>
                        <span
                          aria-hidden="true"
                          className={`inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-sm font-bold ${
                            selected
                              ? "bg-indigo-600 text-white"
                              : "border border-transparent text-transparent"
                          }`}
                        >
                          {selected ? "✓" : ""}
                        </span>
                      </span>
                      <span id={titleId} className="mt-1.5 break-words hyphens-auto text-sm font-semibold leading-snug text-slate-900 sm:mt-2 sm:text-base">
                        {tDisc(`path.${opt.id}.title`)}
                      </span>
                      <span id={bodyId} className="mt-0.5 flex-1 break-words hyphens-auto text-xs leading-relaxed text-slate-600 dark:text-slate-400 sm:mt-1 sm:text-sm">
                        {tDisc(`path.${opt.id}.body`)}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            <div
              role="status"
              aria-live="polite"
              aria-atomic="true"
              className="flex min-h-14 items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-1.5 text-slate-600 sm:min-h-12 sm:px-4"
            >
              {onboardingPath === null ? (
                <Info aria-hidden="true" className="h-4 w-4 shrink-0 text-indigo-600" />
              ) : (
                <CheckCircle2 aria-hidden="true" className="h-4 w-4 shrink-0 text-indigo-600" />
              )}
              <p className="text-xs leading-relaxed sm:text-sm">
                {onboardingPath === null ? tDisc("pathPickHint") : tDisc("pathSelectedHint")}
              </p>
            </div>

            {onboardingPath === "undecided" && (
              <CareerDiscoveryFlow
                profileId={createdId}
                mode="onboarding"
                compact
                onSelected={(careerId) => {
                  // The engine's pick becomes a study-interest selection via
                  // the SAME legacy mapping as every other import — never a
                  // free-text guess. The student can still edit it below.
                  const selections = selectionsForCareer(careerId);
                  if (selections.length > 0) {
                    studyInterestsTouched.current = true;
                    set("studyInterests", selections);
                    set("targetMajor", compatibilityTargetMajor(selections));
                  }
                  setOnboardingPath("goal");
                }}
                onUseExploring={() => {
                  studyInterestsTouched.current = true;
                  set("studyInterests", [{ kind: "exploring" }]);
                  set("targetMajor", "");
                }}
              />
            )}

            {(onboardingPath === "goal" || onboardingPath === "interests") && (
              <>
                <p className="rounded-xl border border-indigo-100 bg-indigo-50 px-3 py-2.5 text-sm leading-relaxed text-slate-700 dark:text-slate-300">
                  {onboardingPath === "goal" ? tDisc("path.goal.hint") : tDisc("path.interests.hint")}
                </p>
                <StudyInterestPicker
                  value={form.studyInterests}
                  onChange={(studyInterests) => {
                    studyInterestsTouched.current = true;
                    set("studyInterests", studyInterests);
                    set("targetMajor", compatibilityTargetMajor(studyInterests));
                    setError("");
                  }}
                  showError={step2Invalid}
                  idPrefix="onboarding-study-interests"
                />
              </>
            )}
          </div>
        )}

        {/* STEP 4 — GPA + scale (with optional CV auto-fill for this and later steps) */}
        {step === 3 && (
          <div className="space-y-4">
          <SmartAutofillBox supported={AUTOFILL_FIELDS} onApply={applyAutofill} />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className={labelCls}>{tOnboarding("gpaLabel")}</label>
              <input
                type="number"
                step="0.01"
                min="0"
                max={Number(form.gpaScale) || 4}
                className={inputCls}
                placeholder="3.5"
                value={form.gpa}
                onChange={(e) => set("gpa", e.target.value)}
              />
            </div>
            <div>
              <label className={labelCls}>{tOnboarding("gpaScaleLabel")}</label>
              <select
                className={inputCls}
                value={form.gpaScale}
                onChange={(e) => set("gpaScale", e.target.value)}
              >
                <option value="4.0">{tOnboarding("gpaScaleFour")}</option>
                <option value="5.0">{tOnboarding("gpaScaleFive")}</option>
                <option value="10.0">{tOnboarding("gpaScaleTen")}</option>
              </select>
            </div>
          </div>
          </div>
        )}

        {/* STEP 5 — Standard tests */}
        {step === 4 && (
          <div className="space-y-3">
            <p className="rounded-xl border border-sky-200 bg-sky-50 px-3 py-2.5 text-xs leading-relaxed text-sky-900 dark:border-sky-900 dark:bg-sky-950/30 dark:text-sky-200">
              {tOnboarding("testScoresNote")}
            </p>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label className={labelCls}>{tOnboarding("ieltsLabel")}</label>
              <input
                type="number"
                step="0.5"
                min="0"
                max="9"
                className={inputCls}
                placeholder="6.5"
                value={form.ieltsScore}
                onChange={(e) => set("ieltsScore", e.target.value)}
              />
            </div>
            <div>
              <label className={labelCls}>{tOnboarding("toeflLabel")}</label>
              <input
                type="number"
                min="0"
                max="120"
                className={inputCls}
                placeholder="95"
                value={form.toeflScore}
                onChange={(e) => set("toeflScore", e.target.value)}
              />
            </div>
            <div>
              <label className={labelCls}>{tOnboarding("satLabel")}</label>
              <input
                type="number"
                min="400"
                max="1600"
                className={inputCls}
                placeholder="1350"
                value={form.satScore}
                onChange={(e) => set("satScore", e.target.value)}
              />
            </div>
            <div>
              <label className={labelCls}>{tOnboarding("greLabel")}</label>
              <input
                type="number"
                min="260"
                max="340"
                className={inputCls}
                placeholder="315"
                value={form.greScore}
                onChange={(e) => set("greScore", e.target.value)}
              />
              </div>
            </div>
          </div>
        )}

        {/* STEP 6 — Budget & financial aid */}
        {step === 5 && (
          <div className="space-y-4">
            <div>
              <label className={labelCls}>{tOnboarding("annualBudgetLabel")}</label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-sm font-bold text-slate-400">$</span>
                <input
                  type="number"
                  min="0"
                  className={`${inputCls} pl-8`}
                  placeholder="25000"
                  value={form.budgetAnnualUsd}
                  onChange={(e) => set("budgetAnnualUsd", e.target.value)}
                />
              </div>
            </div>
            <fieldset className="space-y-2">
              <legend className="text-xs font-bold text-slate-700 dark:text-slate-200">
                {tOnboarding("financialAidLabel")}
              </legend>
              <div className="grid gap-2 sm:grid-cols-3 sm:items-stretch">
                {([
                  { value: null, key: "financialAidUnknown" },
                  { value: true, key: "financialAidYes" },
                  { value: false, key: "financialAidNo" },
                ] as const).map((option) => (
                  <label
                    key={option.key}
                    className="flex min-h-14 cursor-pointer items-center gap-2 rounded-xl border border-slate-200 bg-slate-50/60 p-3 text-xs font-semibold leading-snug text-slate-700 transition-colors hover:border-indigo-300 dark:border-slate-700 dark:bg-slate-800/60 dark:text-slate-200 motion-reduce:transition-none"
                  >
                    <input
                      type="radio"
                      name="onboarding-financial-aid"
                      checked={form.needsFinancialAid === option.value}
                      onChange={() => set("needsFinancialAid", option.value)}
                      className="h-4 w-4 shrink-0 accent-indigo-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
                    />
                    <span className="break-words">{tOnboarding(option.key as never)}</span>
                  </label>
                ))}
              </div>
            </fieldset>
          </div>
        )}

        {/* STEP 7 — Preferred countries */}
        {step === 6 && (
          <div className="space-y-3">
            <input
              type="search"
              value={countrySearch}
              onChange={(e) => setCountrySearch(e.target.value)}
              placeholder={`🔍 ${tCommon("searchCountry")}`}
              aria-label={tCommon("searchCountry")}
              className="min-h-11 w-full max-w-sm rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
            />
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
            {visibleWizardCountries.map((c) => {
              const active = form.preferredCountries.some((value) => countriesMatch(value, c));
              const countryKey = countryTranslationKey(c);
              return (
                <button
                  key={c}
                  type="button"
                  aria-pressed={active}
                  onClick={() => toggleCountry(c)}
                  className={`min-h-11 min-w-0 rounded-xl border-2 px-3 py-2.5 text-xs font-semibold leading-snug transition-colors duration-150 motion-reduce:transition-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2 focus-visible:ring-offset-white dark:focus-visible:ring-offset-slate-100 ${
                    active
                      ? "border-indigo-500 bg-indigo-50 text-indigo-700 ring-2 ring-indigo-500/15 shadow-sm"
                      : "border-slate-200 bg-white text-slate-600 hover:border-indigo-300"
                  }`}
                >
                  <span className="inline-flex items-center gap-1.5">
                    <CountryFlag country={c} size="sm" />
                    {countryKey ? tCountry(countryKey) : c}
                  </span>
                </button>
              );
            })}
            </div>
            {!countrySearching && (
              <ShowMoreToggle
                totalCount={COUNTRIES.length}
                visibleCount={visibleWizardCountries.length}
                expanded={showAllCountries}
                onToggle={() => setShowAllCountries((v) => !v)}
              />
            )}
          </div>
        )}

        {/* STEP 8 — Experience & achievements */}
        {step === 7 && (
          <div className="space-y-4">
            <div>
              <label className={labelCls}>{tOnboarding("workExperienceLabel")}</label>
              <select
                className={inputCls}
                value={form.workExperienceYears}
                onChange={(e) => set("workExperienceYears", e.target.value)}
              >
                <option value="">{tOnboarding("selectOption")}</option>
                <option value="0">{tOnboarding("years0")}</option>
                <option value="1">{tOnboarding("years1")}</option>
                <option value="2">{tOnboarding("years2")}</option>
                <option value="3">{tOnboarding("years3")}</option>
                <option value="4">{tOnboarding("years4")}</option>
                <option value="5">{tOnboarding("years5Plus")}</option>
              </select>
            </div>
            <div>
              <label className={labelCls}>{tOnboarding("researchPublicationsLabel")}</label>
              <input
                type="number"
                min="0"
                className={inputCls}
                placeholder="0"
                value={form.researchPublications}
                onChange={(e) => set("researchPublications", e.target.value)}
              />
            </div>
            <div>
              <label className={labelCls}>{tOnboarding("activitiesLabel")}</label>
              <textarea
                rows={3}
                className={inputCls}
                placeholder={tOnboarding("activitiesPlaceholder")}
                value={form.extracurriculars}
                onChange={(e) => set("extracurriculars", e.target.value)}
              />
            </div>
          </div>
        )}

        {/* Legal copy and controls share the phone's sticky panel so the
            consent note stays visible instead of slipping behind the actions. */}
        <div className="sticky bottom-0 z-20 -mx-4 -mb-4 mt-3 flex flex-col rounded-b-3xl border-t border-slate-200 bg-white/95 px-3 pt-2.5 pb-[calc(0.75rem+env(safe-area-inset-bottom))] shadow-[0_-8px_24px_rgba(15,23,42,0.06)] backdrop-blur sm:static sm:mx-0 sm:mb-0 sm:mt-4 sm:rounded-none sm:border-0 sm:bg-transparent sm:px-0 sm:pt-0 sm:pb-0 sm:shadow-none sm:backdrop-blur-none">
          <p className="mb-2 text-center text-[10px] leading-relaxed text-slate-500 dark:text-slate-400 sm:mb-0">
            {tOnboarding("consentIntro")}{" "}
            <a href="/terms" target="_blank" rel="noopener noreferrer" className="inline-flex min-h-11 min-w-11 items-center justify-center rounded px-1 align-middle underline text-indigo-700 hover:text-indigo-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500">
              {tOnboarding("termsLabel")}
            </a>{" "}
            {tOnboarding("consentAnd")}{" "}
            <a href="/privacy" target="_blank" rel="noopener noreferrer" className="inline-flex min-h-11 min-w-11 items-center justify-center rounded px-1 align-middle underline text-indigo-700 hover:text-indigo-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500">
              {tOnboarding("privacyLabel")}
            </a>.
          </p>
          <div className="flex w-full items-center gap-1.5 sm:mt-4 sm:gap-2 sm:border-t sm:border-slate-100 sm:pt-5">
            <button
              type="button"
              onClick={handleBack}
              disabled={step === 0}
              className="inline-flex min-h-11 shrink-0 items-center justify-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-700 transition-colors hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2 focus-visible:ring-offset-white disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-500 disabled:hover:bg-slate-50 dark:focus-visible:ring-offset-slate-100 motion-reduce:transition-none sm:px-4"
            >
              <ArrowLeft aria-hidden="true" className="h-3.5 w-3.5" /> {tOnboarding("back")}
            </button>

            {step !== 0 && (
              <button
                type="button"
                onClick={handleSkip}
                disabled={saving || (step === 2 && step2Invalid)}
                className="inline-flex min-h-11 shrink-0 items-center justify-center gap-1.5 rounded-xl px-3 text-xs font-semibold text-slate-600 transition-colors hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2 focus-visible:ring-offset-white disabled:cursor-not-allowed disabled:text-slate-500 disabled:hover:bg-transparent disabled:opacity-100 dark:focus-visible:ring-offset-slate-100 motion-reduce:transition-none sm:px-4"
              >
                <SkipForward aria-hidden="true" className="h-3.5 w-3.5" /> {tOnboarding("skip")}
              </button>
            )}

            <button
              type="button"
              onClick={handleNext}
              disabled={nextDisabled}
              className={`ml-auto inline-flex min-h-12 shrink-0 items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-bold transition-[background-color,box-shadow,color] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2 focus-visible:ring-offset-white dark:focus-visible:ring-offset-slate-100 motion-reduce:transition-none ${
                nextDisabled
                  ? "cursor-not-allowed bg-slate-200 text-slate-600 shadow-none"
                  : "bg-gradient-to-r from-indigo-600 to-violet-600 text-white shadow-md shadow-indigo-600/20 hover:from-indigo-700 hover:to-violet-700"
              }`}
            >
              {saving
                ? tOnboarding("saving")
                : isLast
                  ? tOnboarding("finish")
                  : tOnboarding("continue")}
              {!saving && <ArrowRight aria-hidden="true" className="h-3.5 w-3.5" />}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function safeParseCountries(value?: string | null): string[] {
  try {
    const parsed = value ? JSON.parse(value) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}
