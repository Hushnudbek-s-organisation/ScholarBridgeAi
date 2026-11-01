"use client";

import React, { useRef, useState } from "react";
import { useTranslations } from "next-intl";
import {countriesMatch, countryTranslationKey, withQsTop200Countries, resolveCountryCode} from "@/lib/countries";

import { collapsePicks, countrySearchMatch, rankCountryPicks } from "@/lib/countryPicker";
import { CountryFlag } from "@/components/CountryFlag";
import { ShowMoreToggle } from "@/components/ui/hubs";import {
  User,
  GraduationCap,
  Globe2,
  ArrowRight,
  ArrowLeft,
  SkipForward,
  CheckCircle2,
  Info,
  Sparkles,
  Eye,
  EyeOff,
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
import { Button } from "@/components/ui/Button";
import { ProgressFill } from "@/components/ui/ProgressBar";

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
  /**
   * Email to start with — set when the sign-in form sends someone here after a
   * failed sign-in ("create an account with this email"), so the address they
   * already typed is not asked for again.
   */
  initialEmail?: string;
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
  "relative flex min-w-0 rounded-overlay border-2 text-left transition-[border-color,background-color,box-shadow] duration-150 motion-reduce:transition-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2 focus-visible:ring-offset-white dark:focus-visible:ring-offset-slate-100";
const choiceCardSelected =
  "border-indigo-500 bg-indigo-50 ring-2 ring-indigo-500/15 shadow-md shadow-indigo-500/10";
const choiceCardUnselected = "border-slate-200 bg-white hover:border-indigo-300";

const STEPS = [
  { id: 0, titleKey: "identity", icon: User },
  { id: 1, titleKey: "direction", icon: GraduationCap },
  { id: 2, titleKey: "destinations", icon: Globe2 },
];

// Field colours, hover and the indigo focus halo come from `.sb-field` (globals.css).
const inputCls =
  "sb-field min-h-11 w-full rounded-surface border px-4 py-3 text-sm text-slate-800 focus:outline-none motion-reduce:transition-none";
const labelCls = "block text-xs font-bold text-slate-600 uppercase tracking-wide mb-1.5";

export function OnboardingWizard({ profile, initialEmail, onCreated, onComplete }: OnboardingWizardProps) {
  const tCountry = useTranslations("countryNames");
  const tCommon = useTranslations("common");
  const tOnboarding = useTranslations("onboarding");
  const tDisc = useTranslations("careerDiscovery");
  const resumeStudyInterests = selectionsFromProfile(profile?.studyInterests, profile?.targetMajor, {
    // A new profile is created before the interest step; the legacy default
    // “Computer Science” must not satisfy the required onboarding selection.
    ignoreDefaultComputerScience: Boolean(profile && !profile.onboardingCompleted && !profile.studyInterests),
  });
  // Legacy profiles saved against the former eight-step flow resume at the
  // equivalent new section. Interests are optional and never force a detour.
  const requestedStartStep = profile ? Math.max(profile.onboardingStep ?? 0, 0) : 0;
  const startStep = requestedStartStep === 0 ? 0 : requestedStartStep <= 2 ? 1 : 2;

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
  // Reveal the password field: invisible typos (a stray space, a Cyrillic
  // keyboard layout) otherwise only surface as "the password is too short".
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const pathButtonRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const studyInterestsTouched = useRef(false);
  // Telegram-only accounts carry a technical placeholder email; never show it
  // as if the student had typed it, and keep the email optional for them.
  const placeholderEmail = isTelegramPlaceholderEmail(profile?.email) ? profile!.email : "";
  const [form, setForm] = useState<FormState>({
    name: profile?.name || "",
    email: placeholderEmail ? "" : profile?.email || initialEmail?.trim().toLowerCase() || "",
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
            name: form.name.trim(),
            email: form.email.trim().toLowerCase(),
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
                : res.status === 429 || data.code === "rate_limited"
                  // Account creation is throttled per address. Without this
                  // branch the visitor saw "could not create the account" and
                  // assumed their password or email was rejected.
                  ? tOnboarding("rateLimited", {
                      minutes: Math.max(1, Math.ceil(Number(data.retryAfter || 60) / 60)),
                    })
                : data.code === "weak_password"
                  // The server distinguishes "too short" from "too common".
                  // Showing the length sentence for a blocked password like
                  // 12345678 is what made an 8-character password look
                  // rejected for its length.
                  ? data.reason === "too_common"
                    ? tOnboarding("passwordTooCommon")
                    : data.reason === "too_long"
                      ? tOnboarding("passwordTooLong")
                      : tOnboarding("weakPassword", { minimum: MIN_PASSWORD_LENGTH })
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

  /**
   * Name the field that is actually wrong.
   *
   * The old check produced ONE sentence for three fields ("enter name, email
   * and a password of at least 8 characters"), so a visitor who had filled the
   * password but left the name empty was told their password was too short —
   * they retyped it and the form still refused. Each requirement now reports
   * itself, and the email is checked for shape here as well (the server
   * rejects it later with `invalid_email`, which used to look like a save
   * failure).
   */
  const emailTrimmed = form.email.trim();
  const emailLooksValid = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(emailTrimmed);
  const nameError = !form.name.trim();
  const emailError = placeholderEmail && !emailTrimmed ? false : !emailTrimmed || !emailLooksValid;
  const passwordError = isNewAccount && form.password.trim().length < MIN_PASSWORD_LENGTH;
  const step0Problems: string[] = [];
  if (nameError) step0Problems.push(tOnboarding("errorNameRequired"));
  if (emailError) {
    step0Problems.push(
      !emailTrimmed ? tOnboarding("errorEmailRequired") : tOnboarding("errorEmailInvalid")
    );
  }
  if (passwordError) step0Problems.push(tOnboarding("weakPassword", { minimum: MIN_PASSWORD_LENGTH }));
  const step0Invalid = step0Problems.length > 0;

  /** Bring the first invalid field into view — the form scrolls on phones. */
  const focusFirstProblem = () => {
    const id = nameError ? "ob-name" : emailError ? "ob-email" : passwordError ? "ob-password" : null;
    if (!id) return;
    const element = document.getElementById(id);
    element?.scrollIntoView({ block: "center", behavior: "smooth" });
    element?.focus({ preventScroll: true });
  };

  const handleNext = async () => {
    if (step === 0 && step0Invalid) {
      setError(step0Problems.join(" · "));
      focusFirstProblem();
      return;
    }
    if (step === STEPS.length - 1) {
      const updated = await persist(3, true);
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
    if (step === STEPS.length - 1) {
      const updated = await persist(3, true);
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
        <div className="bg-white rounded-overlay border border-slate-200 shadow-xl p-8 sm:p-10 text-center space-y-5">
          <div className="mx-auto h-20 w-20 rounded-full bg-indigo-600 flex items-center justify-center shadow-lg shadow-indigo-200">
            <CheckCircle2 className="h-10 w-10 text-white" />
          </div>
          <h2 className="text-2xl font-extrabold text-slate-900">{tOnboarding("doneTitle")}</h2>
          <p className="text-sm text-slate-500 leading-relaxed">{tOnboarding("doneBody")}</p>
          <Button variant="unstyled"
            onClick={() => onComplete(profile ?? ({} as StudentProfile))}
            className="inline-flex items-center gap-2 px-6 py-3 bg-indigo-600 text-white font-bold rounded-surface shadow-md hover:bg-indigo-700 transition-all"
          >
            <Sparkles className="h-4 w-4" /> {tOnboarding("goToDashboard")}
          </Button>
        </div>
      </div>
    );
  }

  const stepInfo = STEPS[step];
  const StepIcon = stepInfo.icon;
  const progressPct = Math.round((step / (STEPS.length - 1)) * 100);
  const isLast = step === STEPS.length - 1;
  const nextDisabled = saving || (step === 0 && step0Invalid);

  return (
    <div className="mx-auto w-full min-w-0 max-w-3xl">
      {/* Progress header */}
      <div className="mb-4 sm:mb-5">
        <div className="flex items-center justify-between mb-2">
          <p className="min-w-0 break-words text-sm font-bold uppercase tracking-wide text-slate-600">
            {createdId == null ? tOnboarding("createAccount") : tOnboarding("completeProfile")}
          </p>
          <p className="shrink-0 text-sm font-extrabold text-indigo-600">
            {tOnboarding("stepCount", { current: step + 1, total: STEPS.length })}
          </p>
        </div>
        <div className="h-2.5 bg-slate-200 rounded-full overflow-hidden">
          <ProgressFill value={Math.max(progressPct, 8)} className="h-full bg-indigo-600 rounded-full transition-all duration-500 ease-out" />
        </div>
        <div className="flex items-center gap-2 mt-3">
          <div className="h-8 w-8 rounded-surface bg-indigo-600 text-white flex items-center justify-center shrink-0">
            <StepIcon className="h-4 w-4" />
          </div>
          <h2 className="min-w-0 break-words text-lg font-extrabold text-slate-900 sm:text-xl">
            {tOnboarding(`stepTitles.${stepInfo.titleKey}` as never)}
          </h2>
        </div>
      </div>

      <div
        key={step}
        className="relative min-w-0 rounded-overlay border border-slate-200 bg-white p-4 shadow-md animate-fadeIn sm:p-6 lg:p-8"
      >
        {error && (
          <div
            role="alert"
            className="mb-4 rounded-surface border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700 dark:border-rose-500/40 dark:bg-rose-500/10 dark:text-rose-200"
          >
            {error}
          </div>
        )}
        {!error && step === 0 && step0Invalid && (
          <p className="mb-4 text-sm font-semibold text-slate-500 dark:text-slate-400">
            {/* Only pre-existing accounts (no password step) get the short note. */}
            {isNewAccount ? step0Problems.join(" · ") : tOnboarding("identityRequired")}
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
              {nameError && (
                <p className="mt-1.5 text-sm font-semibold text-rose-600 dark:text-rose-300">
                  {tOnboarding("errorNameRequired")}
                </p>
              )}
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
                // Spaces and capitals are the two most common reasons a
                // correct-looking address fails: normalise on blur.
                onBlur={() => set("email", form.email.trim().toLowerCase())}
              />
              {emailError && (
                <p className="mt-1.5 text-sm font-semibold text-rose-600 dark:text-rose-300">
                  {!emailTrimmed ? tOnboarding("errorEmailRequired") : tOnboarding("errorEmailInvalid")}
                </p>
              )}
              {placeholderEmail && (
                <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
                  {tOnboarding("telegramEmailHint")}
                </p>
              )}
            </div>
            {isNewAccount && (
              <div>
                <label className={labelCls} htmlFor="ob-password">{tOnboarding("passwordLabel")}</label>
                <div className="relative">
                  <input
                    id="ob-password"
                    name="new-password"
                    type={showPassword ? "text" : "password"}
                    required
                    aria-required="true"
                    aria-invalid={passwordError ? true : undefined}
                    aria-describedby="ob-password-help"
                    className={`${inputCls} pr-12`}
                    placeholder={tOnboarding("passwordPlaceholder", { minimum: MIN_PASSWORD_LENGTH })}
                    value={form.password}
                    onChange={(e) => set("password", e.target.value)}
                    autoComplete="new-password"
                    autoCapitalize="off"
                    autoCorrect="off"
                    spellCheck={false}
                  />
                  {/* Reveal the field: a stray space, a wrong keyboard layout or
                      an autofilled placeholder is invisible otherwise, and the
                      visitor only sees "the password is too short". */}
                  <Button variant="unstyled"
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    aria-label={showPassword ? tOnboarding("hidePassword") : tOnboarding("showPassword")}
                    aria-pressed={showPassword}
                    className="absolute inset-y-0 right-0 flex w-11 items-center justify-center text-slate-500 hover:text-slate-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 dark:hover:text-slate-200"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" aria-hidden /> : <Eye className="h-4 w-4" aria-hidden />}
                  </Button>
                </div>
                <p id="ob-password-help" className="mt-2 text-sm text-slate-500 dark:text-slate-400">
                  {passwordError
                    ? tOnboarding("weakPassword", { minimum: MIN_PASSWORD_LENGTH })
                    : tOnboarding("passwordHelp")}
                </p>
                {form.password.length > 0 && (
                  <p className="mt-1 text-sm text-slate-500 dark:text-slate-500">
                    {tOnboarding("passwordLength", {
                      count: form.password.trim().length,
                      minimum: MIN_PASSWORD_LENGTH,
                    })}
                  </p>
                )}
              </div>
            )}
            <p className="text-sm text-slate-500 dark:text-slate-400">
              {tOnboarding("editProfileLater")}
            </p>
          </div>
        )}

        {/* STEP 2 — Degree plus optional study direction. Advanced academic
            details deliberately live in the post-onboarding profile editor. */}
        {step === 1 && (
          <p className="rounded-surface border border-indigo-100 bg-indigo-50 px-3 py-2.5 text-sm leading-relaxed text-slate-700 dark:text-slate-300">
            {tOnboarding("optionalHint")}
          </p>
        )}
        {/* Target degree */}
        {step === 1 && (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3 sm:items-stretch">
            {DEGREES.map((d) => {
              const selected = normalizeDegreeLevel(form.degreeLevel) === d;
              return (
                <Button variant="unstyled"
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
                </Button>
              );
            })}
          </div>
        )}

        {step === 1 && (
          <p className="text-sm leading-relaxed text-slate-500 dark:text-slate-400">
            {tOnboarding("deferredDetails")}
          </p>
        )}
        {/* STEP 3 — Where are you now? (3 equal choices) → study interests,
            or the guided career-discovery flow for the undecided. */}
        {step === 1 && (
          <div className="min-w-0 space-y-3 sm:space-y-5">
            {/* Three equal, equally-respectful starting points. No answer is
                required before choosing; "I don't know yet" is a full flow. */}
            <div className="min-w-0">
              <div className="space-y-1.5">
                <p className="text-sm font-bold uppercase tracking-wide text-slate-500">
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
                    <Button variant="unstyled"
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
                          className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-surface bg-indigo-50 text-2xl leading-none text-indigo-700 dark:bg-indigo-500/15 sm:h-10 sm:w-10"
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
                    </Button>
                  );
                })}
              </div>
            </div>

            <div
              role="status"
              aria-live="polite"
              aria-atomic="true"
              className="flex min-h-14 items-center gap-2 rounded-surface border border-slate-200 bg-slate-50 px-3 py-1.5 text-slate-600 sm:min-h-12 sm:px-4"
            >
              {onboardingPath === null ? (
                <Info aria-hidden="true" className="h-4 w-4 shrink-0 text-indigo-600" />
              ) : (
                <CheckCircle2 aria-hidden="true" className="h-4 w-4 shrink-0 text-indigo-600" />
              )}
              <p className="text-sm leading-relaxed sm:text-sm">
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
                <p className="rounded-surface border border-indigo-100 bg-indigo-50 px-3 py-2.5 text-sm leading-relaxed text-slate-700 dark:text-slate-300">
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
                  showError={false}
                  idPrefix="onboarding-study-interests"
                />
              </>
            )}
          </div>
        )}

        {/* STEP 3 — Optional budget plus preferred destinations. */}
        {step === 2 && (
          <p className="rounded-surface border border-indigo-100 bg-indigo-50 px-3 py-2.5 text-sm leading-relaxed text-slate-700 dark:text-slate-300">
            {tOnboarding("destinationsHint")}
          </p>
        )}
        {/* STEP 6 — Budget & financial aid */}
        {step === 2 && (
          <div className="space-y-4">
            <div>
              <label className={labelCls}>{tOnboarding("annualBudgetLabel")}</label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-sm font-bold text-slate-500">$</span>
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
                    className="flex min-h-14 cursor-pointer items-center gap-2 rounded-surface border border-slate-200 bg-slate-50/60 p-3 text-sm font-semibold leading-snug text-slate-700 transition-colors hover:border-indigo-300 dark:border-slate-700 dark:bg-slate-800/60 dark:text-slate-200 motion-reduce:transition-none"
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
        {step === 2 && (
          <div className="space-y-3">
            <input
              type="search"
              value={countrySearch}
              onChange={(e) => setCountrySearch(e.target.value)}
              placeholder={`🔍 ${tCommon("searchCountry")}`}
              aria-label={tCommon("searchCountry")}
              className="min-h-11 w-full max-w-sm rounded-surface border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
            />
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
            {visibleWizardCountries.map((c) => {
              const active = form.preferredCountries.some((value) => countriesMatch(value, c));
              const countryKey = countryTranslationKey(c);
              return (
                <Button variant="unstyled"
                  key={c}
                  type="button"
                  aria-pressed={active}
                  onClick={() => toggleCountry(c)}
                  className={`min-h-11 min-w-0 rounded-surface border-2 px-3 py-2.5 text-xs font-semibold leading-snug transition-colors duration-150 motion-reduce:transition-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2 focus-visible:ring-offset-white dark:focus-visible:ring-offset-slate-100 ${
                    active
                      ? "border-indigo-500 bg-indigo-50 text-indigo-700 ring-2 ring-indigo-500/15 shadow-sm"
                      : "border-slate-200 bg-white text-slate-600 hover:border-indigo-300"
                  }`}
                >
                  <span className="inline-flex items-center gap-1.5">
                    <CountryFlag country={c} size="sm" />
                    {countryKey ? tCountry(countryKey) : c}
                  </span>
                </Button>
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

        {/* Legal copy and controls share the phone's sticky panel so the
            consent note stays visible instead of slipping behind the actions. */}
        <div className="sticky bottom-0 z-20 -mx-4 -mb-4 mt-3 flex flex-col rounded-b-3xl border-t border-slate-200 bg-white/95 px-3 pt-2.5 pb-[calc(0.75rem+env(safe-area-inset-bottom))] shadow-[0_-8px_24px_rgba(15,23,42,0.06)] backdrop-blur sm:static sm:mx-0 sm:mb-0 sm:mt-4 sm:rounded-none sm:border-0 sm:bg-transparent sm:px-0 sm:pt-0 sm:pb-0 sm:shadow-none sm:backdrop-blur-none">
          <p className="mb-2 text-center text-sm leading-relaxed text-slate-500 dark:text-slate-400 sm:mb-0">
            {tOnboarding("consentIntro")}{" "}
            <a href="/terms" target="_blank" rel="noopener noreferrer" className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-control px-1 align-middle underline text-indigo-700 hover:text-indigo-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500">
              {tOnboarding("termsLabel")}
            </a>{" "}
            {tOnboarding("consentAnd")}{" "}
            <a href="/privacy" target="_blank" rel="noopener noreferrer" className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-control px-1 align-middle underline text-indigo-700 hover:text-indigo-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500">
              {tOnboarding("privacyLabel")}
            </a>.
          </p>
          <div className="flex w-full items-center gap-1.5 sm:mt-4 sm:gap-2 sm:border-t sm:border-slate-100 sm:pt-5">
            <Button variant="unstyled"
              type="button"
              onClick={handleBack}
              disabled={step === 0}
              className="inline-flex min-h-11 shrink-0 items-center justify-center gap-1.5 rounded-surface border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-700 transition-colors hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2 focus-visible:ring-offset-white disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-500 disabled:hover:bg-slate-50 dark:focus-visible:ring-offset-slate-100 motion-reduce:transition-none sm:px-4"
            >
              <ArrowLeft aria-hidden="true" className="h-3.5 w-3.5" /> {tOnboarding("back")}
            </Button>

            {step !== 0 && (
              <Button variant="unstyled"
                type="button"
                onClick={handleSkip}
                disabled={saving}
                className="inline-flex min-h-11 shrink-0 items-center justify-center gap-1.5 rounded-surface px-3 text-xs font-semibold text-slate-600 transition-colors hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2 focus-visible:ring-offset-white disabled:cursor-not-allowed disabled:text-slate-500 disabled:hover:bg-transparent disabled:opacity-100 dark:focus-visible:ring-offset-slate-100 motion-reduce:transition-none sm:px-4"
              >
                <SkipForward aria-hidden="true" className="h-3.5 w-3.5" /> {tOnboarding("skip")}
              </Button>
            )}

            <Button variant="unstyled"
              type="button"
              onClick={handleNext}
              disabled={nextDisabled}
              className={`ml-auto inline-flex min-h-12 shrink-0 items-center justify-center gap-2 rounded-surface px-4 py-3 text-sm font-bold transition-[background-color,box-shadow,color] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2 focus-visible:ring-offset-white dark:focus-visible:ring-offset-slate-100 motion-reduce:transition-none ${
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
            </Button>
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
