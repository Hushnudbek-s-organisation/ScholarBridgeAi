"use client";

import { ApplicantContextFields } from "@/components/ApplicantContextFields";
import type {ApplicantContext} from "@/lib/applicantContext";
import React, { useState, useEffect, useRef } from "react";
import { useTranslations } from "next-intl";
import { countriesMatch, countryTranslationKey, resolveCountryCode, withQsTop200Countries } from "@/lib/countries";
import { collapsePicks, countrySearchMatch, rankCountryPicks } from "@/lib/countryPicker";
import { CountryFlag } from "@/components/CountryFlag";
import { ShowMoreToggle } from "@/components/ui/hubs";
import { StudentProfile } from "./Navbar";
import { DegreeLevelLabel } from "./DegreeLevelLabel";
import { normalizeDegreeLevel } from "@/lib/degreeLevels";
import { X, Save, Sparkles, DollarSign, BookOpen, Globe, Award, User, Trophy, Target } from "lucide-react";
import { formatNumber } from "@/lib/format";
import { StudyInterestPicker } from "@/components/StudyInterestPicker";
import {
  compatibilityTargetMajor,
  isStudyInterestSelectionValid,
  selectionsFromProfile,
  serializeStudyInterestSelections,
  type StudyInterestSelection,
} from "@/lib/studyInterests";
import { isTelegramPlaceholderEmail } from "@/lib/telegram/placeholder";
import { MIN_PASSWORD_LENGTH } from "@/lib/passwordPolicy";
import { useDialogFocusTrap } from "@/hooks/useDialogFocusTrap";
import { SmartAutofillBox } from "@/components/samples/SmartAutofillBox";
import type { ExtractedKey, ExtractedProfileFields } from "@/lib/profileExtract";
import { Button } from "@/components/ui/Button";

/** Every value the CV auto-fill can read has a field in this editor. */
const AUTOFILL_FIELDS: ExtractedKey[] = [
  "gpa",
  "gpaScale",
  "ieltsScore",
  "toeflScore",
  "satScore",
  "greScore",
  "actScore",
  "duolingoScore",
  "graduationYear",
  "workExperienceYears",
  "researchPublications",
  "degreeLevel",
];

const PROFILE_SECTIONS = [
  { id: "account", icon: User },
  { id: "academics", icon: BookOpen },
  { id: "finance", icon: DollarSign },
  { id: "experience", icon: Trophy },
] as const;
type ProfileSectionId = (typeof PROFILE_SECTIONS)[number]["id"];

const EXPERIENCE_FIELD_KEYS = [
  ["leadership", "leadership", "leadershipPlaceholder"],
  ["volunteering", "volunteering", "volunteeringPlaceholder"],
  ["sports", "sports", "sportsPlaceholder"],
  ["clubs", "clubs", "clubsPlaceholder"],
  ["researchExperience", "researchExperience", "researchExperiencePlaceholder"],
  ["projects", "projects", "projectsPlaceholder"],
] as const;

const ACHIEVEMENT_FIELD_KEYS = [
  ["olympiads", "olympiads", "olympiadsPlaceholder"],
  ["awards", "awards", "awardsPlaceholder"],
  ["competitions", "competitions", "competitionsPlaceholder"],
  ["certificates", "certificates", "certificatesPlaceholder"],
] as const;


interface ProfileModalProps {
  isOpen: boolean;
  isNew: boolean;
  onClose: () => void;
  profile: StudentProfile | null;
  /**
   * `password` is accepted on create (required, min 8 chars — the account's
   * sign-in key) and on edit (optional, min 8 chars — changes the password;
   * empty = keep the current one).
   */
  onSave: (data: Omit<Partial<StudentProfile>, "gpa"> & {
    gpa?: number | null;
    password?: string;
  }) => Promise<void>;
}

/**
 * Render a stored list field (JSON array or legacy comma text) as editable
 * comma-separated text. The form sends it back as a plain comma string —
 * PUT /api/profiles/:id accepts that for every jsonListField.
 */
const toList = (raw?: string | null): string => {
  if (!raw) return "";
  try {
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) return parsed.join(", ");
  } catch {
    // legacy comma-separated text
  }
  return String(raw);
};

export function ProfileModal({ isOpen, isNew, onClose, profile, onSave }: ProfileModalProps) {
  // The modal is wrapped in NextIntlClientProvider by its host; the explicit
  // fallback keeps the string out of the UI if a host ever forgets the provider.
  const t = useTranslations("profile");
  const te = useTranslations("profile.editor");
  const tCountry = useTranslations("countryNames");
  const tStudy = useTranslations("studyInterest");
  const tc = useTranslations("common");
  const dialogRef = useRef<HTMLDivElement | null>(null);
  const studyInterestsTouched = useRef(false);
  useDialogFocusTrap({ open: isOpen, dialogRef, onEscape: onClose });
  const [formData, setFormData] = useState<{
    applicantContext:ApplicantContext|null;
    name: string;
    email: string;
    degreeLevel: string;
    targetMajor: string;
    studyInterests: StudyInterestSelection[];
    gpa: number | string;
    /** Empty until the student picks a scale — never defaulted. */
    gpaScale: number | "";
    ieltsScore: number | string;
    toeflScore: number | string;
    satScore: number | string;
    greScore: number | string;
    actScore: number | string;
    duolingoScore: number | string;
    budgetAnnualUsd: number | "";
    familyIncomeUsd: number | string;
    preferredCountries: string[];
    targetUniversities: string;
    careerGoal: string;
    needScholarship: boolean;
    needsFinancialAid: boolean | null;
    requiresFullScholarship: boolean;
    country: string;
    age: number | string;
    graduationYear: number | string;
    extracurriculars: string;
    workExperienceYears: number;
    researchPublications: number;
    apCourses: string;
    ibCourses: string;
    aLevelSubjects: string;
    leadership: string;
    volunteering: string;
    sports: string;
    clubs: string;
    researchExperience: string;
    projects: string;
    olympiads: string;
    awards: string;
    competitions: string;
    certificates: string;
    password: string;
  }>({
    applicantContext:null,
    name: "",
    email: "",
    password: "",
    // Nothing is pre-answered: an untouched form must not turn into a
    // "Master / Computer Science / 4.0 scale / scholarship needed" profile
    // (spec §19 — every score and recommendation must come from the student).
    degreeLevel: "",
    targetMajor: "",
    studyInterests: [],
    // No fabricated test scores: empty fields stay empty until entered.
    gpa: "",
    gpaScale: "",
    ieltsScore: "",
    toeflScore: "",
    satScore: "",
    greScore: "",
    actScore: "",
    duolingoScore: "",
    budgetAnnualUsd: "",
    familyIncomeUsd: "",
    preferredCountries: [],
    targetUniversities: "",
    careerGoal: "",
    needScholarship: false,
    needsFinancialAid: null,
    requiresFullScholarship: false,
    country: "",
    age: "",
    graduationYear: "",
    extracurriculars: "",
    workExperienceYears: 0,
    researchPublications: 0,
    apCourses: "",
    ibCourses: "",
    aLevelSubjects: "",
    leadership: "",
    volunteering: "",
    sports: "",
    clubs: "",
    researchExperience: "",
    projects: "",
    olympiads: "",
    awards: "",
    competitions: "",
    certificates: "",
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [activeSection, setActiveSection] = useState<ProfileSectionId>("account");
  // Preferred-destinations picker: 12 ranked pills + search + Show more —
  // the same pattern as the visa simulator and the compare panel, so no
  // modal is ever a 38-button wall again.
  const [countrySearch, setCountrySearch] = useState("");
  const [showAllCountries, setShowAllCountries] = useState(false);

  useEffect(() => {
    let live = true;
    void Promise.resolve().then(() => {
      if (!live) return;
      studyInterestsTouched.current = false;
      if (profile && !isNew) {
        // No invented fallback: an empty list means "no preference chosen yet".
        let countries: string[] = [];
        try {
          if (typeof profile.preferredCountries === "string") {
            countries = JSON.parse(profile.preferredCountries);
          } else if (Array.isArray(profile.preferredCountries)) {
            countries = profile.preferredCountries;
          }
        } catch {
          // fallback
        }

        setFormData({
          applicantContext:profile.applicantContext??null,
          name: profile.name || "",
          // Telegram-only accounts have a technical email — show an empty field.
          email: isTelegramPlaceholderEmail(profile.email) ? "" : profile.email || "",
          degreeLevel: profile.degreeLevel || "",
          targetMajor: profile.targetMajor || "",
          studyInterests: selectionsFromProfile(profile.studyInterests, profile.targetMajor),
          // NEVER fabricate values: empty fields stay empty instead of being
          // saved as fake defaults (7.0/95/1350/315) when a profile has no
          // test scores yet.
          gpa: profile.gpa ?? "",
          gpaScale: profile.gpaScale ?? "",
          ieltsScore: profile.ieltsScore ?? "",
          toeflScore: profile.toeflScore ?? "",
          satScore: profile.satScore ?? "",
          greScore: profile.greScore ?? "",
          actScore: profile.actScore ?? "",
          duolingoScore: profile.duolingoScore ?? "",
          budgetAnnualUsd: profile.budgetAnnualUsd ?? "",
          familyIncomeUsd: profile.familyIncomeUsd ?? "",
          preferredCountries: countries,
          targetUniversities: toList(profile.targetUniversities),
          careerGoal: profile.careerGoal || "",
          needScholarship: profile.needScholarship ?? false,
          needsFinancialAid: typeof profile.needsFinancialAid === "boolean"
            ? profile.needsFinancialAid
            : profile.needScholarship === true ? true : null,
          requiresFullScholarship: profile.requiresFullScholarship ?? false,
          country: profile.country || "",
          age: profile.age ?? "",
          graduationYear: profile.graduationYear ?? "",
          extracurriculars: profile.extracurriculars || "",
          workExperienceYears: profile.workExperienceYears || 0,
          researchPublications: profile.researchPublications || 0,
          apCourses: toList(profile.apCourses),
          ibCourses: toList(profile.ibCourses),
          aLevelSubjects: toList(profile.aLevelSubjects),
          leadership: toList(profile.leadership),
          volunteering: toList(profile.volunteering),
          sports: toList(profile.sports),
          clubs: toList(profile.clubs),
          researchExperience: toList(profile.researchExperience),
          projects: toList(profile.projects),
          olympiads: toList(profile.olympiads),
          awards: toList(profile.awards),
          competitions: toList(profile.competitions),
          certificates: toList(profile.certificates),
          password: "", // never pre-filled — a new value only on change
        });
      } else if (isNew) {
        setFormData({
          applicantContext:null,
          name: "",
          email: "",
          degreeLevel: "",
          targetMajor: "",
          studyInterests: [],
          // Never pre-fill fabricated academic data — the student enters
          // their real GPA/test scores (NULL-safe, spec §19).
          gpa: "",
          gpaScale: "",
          ieltsScore: "",
          toeflScore: "",
          satScore: "",
          greScore: "",
          actScore: "",
          duolingoScore: "",
          budgetAnnualUsd: "",
          familyIncomeUsd: "",
          preferredCountries: [],
          targetUniversities: "",
          careerGoal: "",
          needScholarship: false,
          needsFinancialAid: null,
          requiresFullScholarship: false,
          country: "",
          age: "",
          graduationYear: "",
          extracurriculars: "",
          workExperienceYears: 0,
          researchPublications: 0,
          apCourses: "",
          ibCourses: "",
          aLevelSubjects: "",
          leadership: "",
          volunteering: "",
          sports: "",
          clubs: "",
          researchExperience: "",
          projects: "",
          olympiads: "",
          awards: "",
          competitions: "",
          certificates: "",
          password: "",
        });
      }
    });
    return () => {
      live = false;
    };
  }, [profile, isNew, isOpen]);

  // Clear any previous error each time the modal opens.
  useEffect(() => {
    if (!isOpen) return;
    let live = true;
    void Promise.resolve().then(() => {
      if (!live) return;
      setErrorMsg("");
      setActiveSection("account");
    });
    return () => {
      live = false;
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const degreeControlValue = normalizeDegreeLevel(formData.degreeLevel) ?? formData.degreeLevel;

  const countryOptions = withQsTop200Countries([
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
  ]);

  const preferredSearching = countrySearch.trim() !== "";
  const isPreferredCountry = (c: string) =>
    formData.preferredCountries.some((value) => countriesMatch(value, c));
  const visibleCountryOptions = (() => {
    const labelOf = (c: string) => {
      const k = countryTranslationKey(c);
      return k ? tCountry(k) : c;
    };
    const filtered = countryOptions.filter((c) =>
      countrySearchMatch(countrySearch, [c, labelOf(c), resolveCountryCode(c)])
    );
    const ranked = rankCountryPicks(filtered, {
      isSelected: isPreferredCountry,
      priorityCodes: ["us", "gb", "de", "ca", "kr", "au", "sg", "jp"],
      codeOf: (c) => resolveCountryCode(c),
    });
    return collapsePicks(ranked, 12, showAllCountries || preferredSearching, isPreferredCountry);
  })();

  const handleCountryToggle = (country: string) => {
    setFormData((prev) => {
      const exists = prev.preferredCountries.some((value) => countriesMatch(value, country));
      if (exists) {
        return {
          ...prev,
          preferredCountries: prev.preferredCountries.filter((value) => !countriesMatch(value, country)),
        };
      }
      return {
        ...prev,
        preferredCountries: [...prev.preferredCountries, country],
      };
    });
  };

  const tgOnlyAccount = !isNew && isTelegramPlaceholderEmail(profile?.email);

  /** Smart auto-fill → the unsaved form. Only "Save Profile Changes" persists anything. */
  const applyAutofill = (fields: ExtractedProfileFields): number => {
    const patch: Partial<typeof formData> = {};
    if (fields.gpa != null && fields.gpaScale != null) {
      patch.gpa = fields.gpa;
      patch.gpaScale = fields.gpaScale;
    }
    if (fields.ieltsScore != null) patch.ieltsScore = fields.ieltsScore;
    if (fields.toeflScore != null) patch.toeflScore = fields.toeflScore;
    if (fields.satScore != null) patch.satScore = fields.satScore;
    if (fields.greScore != null) patch.greScore = fields.greScore;
    if (fields.actScore != null) patch.actScore = fields.actScore;
    if (fields.duolingoScore != null) patch.duolingoScore = fields.duolingoScore;
    if (fields.graduationYear != null) patch.graduationYear = fields.graduationYear;
    if (fields.workExperienceYears != null) patch.workExperienceYears = fields.workExperienceYears;
    if (fields.researchPublications != null) patch.researchPublications = fields.researchPublications;
    if (fields.degreeLevel) patch.degreeLevel = fields.degreeLevel;
    setFormData((prev) => ({ ...prev, ...patch }));
    return Object.keys(patch).length;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");
    const showValidationError = (section: ProfileSectionId, message: string, fieldId: string) => {
      setActiveSection(section);
      setErrorMsg(message);
      window.requestAnimationFrame(() => document.getElementById(fieldId)?.focus());
    };
    if (!formData.name.trim()) {
      showValidationError("account", te("nameRequired"), "profile-name");
      return;
    }
    const email = formData.email.trim();
    const emailValid = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email);
    if ((!email && !tgOnlyAccount) || (email && !emailValid)) {
      showValidationError("account", te("emailRequired"), "profile-email");
      return;
    }
    // An empty interest list is a valid "not decided yet" answer. Only a
    // malformed non-empty selection is rejected; the API validates it too.
    if (formData.studyInterests.length > 0 && !isStudyInterestSelectionValid(formData.studyInterests)) {
      showValidationError("academics", tStudy("requiredError"), "profile-modal-study-interests-search");
      return;
    }
    const password = formData.password.trim();
    if (isNew && password.length < MIN_PASSWORD_LENGTH) {
      showValidationError("account", te("passwordRequiredError", { minimum: MIN_PASSWORD_LENGTH }), "profile-password");
      return;
    }
    if (!isNew && password.length > 0 && password.length < MIN_PASSWORD_LENGTH) {
      showValidationError("account", te("passwordChangeError", { minimum: MIN_PASSWORD_LENGTH }), "profile-password");
      return;
    }
    setIsSubmitting(true);
    try {
      const {
        gpa, ieltsScore, toeflScore, satScore, greScore,
        actScore, duolingoScore, age, graduationYear, familyIncomeUsd, studyInterests,
        ...rest
      } = formData;
      await onSave({
        ...rest,
        targetMajor: studyInterestsTouched.current ? compatibilityTargetMajor(studyInterests) : rest.targetMajor,
        ...(studyInterests.length > 0
          ? { studyInterests: serializeStudyInterestSelections(studyInterests) }
          : {}),
        // Empty fields are saved as null (NULL in DB), never as a default.
        budgetAnnualUsd: rest.budgetAnnualUsd === "" ? null : Number(rest.budgetAnnualUsd),
        gpa: gpa === "" ? null : Number(gpa),
        ieltsScore: ieltsScore === "" ? null : Number(ieltsScore),
        toeflScore: toeflScore === "" ? null : Number(toeflScore),
        satScore: satScore === "" ? null : Number(satScore),
        greScore: greScore === "" ? null : Number(greScore),
        actScore: actScore === "" ? null : Number(actScore),
        duolingoScore: duolingoScore === "" ? null : Number(duolingoScore),
        age: age === "" ? null : Number(age),
        graduationYear: graduationYear === "" ? null : Number(graduationYear),
        familyIncomeUsd: familyIncomeUsd === "" ? null : Number(familyIncomeUsd),
        preferredCountries: JSON.stringify(formData.preferredCountries),
        // An unset scale is not a scale: send NULL so the completeness check
        // does not count a field the student never filled in.
        gpaScale: rest.gpaScale === "" ? null : Number(rest.gpaScale),
      });
      onClose();
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err?.message || te("saveError"));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-slate-900/60 p-2 backdrop-blur-xs sm:p-4">
      <div
        ref={dialogRef}
        role="dialog"
        tabIndex={-1}
        aria-modal="true"
        aria-labelledby="profile-modal-title"
        className="my-0 flex max-h-[calc(100dvh-1rem)] w-full max-w-3xl flex-col overflow-hidden rounded-overlay border border-slate-200 bg-white shadow-2xl dark:border-slate-700 dark:bg-surface sm:my-8 sm:max-h-[calc(100dvh-4rem)]"
      >
        {/* Header */}
        <div className="flex shrink-0 items-center justify-between gap-3 sb-brand-hero px-4 py-4 text-white sm:px-6 sm:py-5">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-white/10 rounded-surface backdrop-blur-md">
              <Sparkles className="h-6 w-6 text-amber-300" />
            </div>
            <div>
              <h2 id="profile-modal-title" className="text-xl font-bold">{isNew ? te("createTitle") : te("editTitle")}</h2>
              <p className="text-sm text-indigo-100">{te("subtitle")}</p>
            </div>
          </div>
          <Button variant="unstyled"
            type="button"
            onClick={onClose}
            aria-label={t("close")}
            className="flex min-h-11 min-w-11 shrink-0 items-center justify-center rounded-control text-white/80 hover:bg-white/10 hover:text-white"
          >
            <X className="h-5 w-5" />
          </Button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} noValidate className="flex min-h-0 flex-1 flex-col">
          <div className="shrink-0 border-b border-slate-200 bg-slate-50/80 px-2 py-2 dark:border-slate-700 dark:bg-slate-900/60">
            <div role="tablist" aria-label={isNew ? te("createTitle") : te("editTitle")} className="grid grid-cols-2 gap-1.5 sm:grid-cols-4">
              {PROFILE_SECTIONS.map((section, index) => {
                const Icon = section.icon;
                const selected = activeSection === section.id;
                const done = (() => {
                  if (section.id === "account") return !!formData.name.trim() && !!formData.email.trim();
                  if (section.id === "academics") return !!(formData.degreeLevel && (formData.targetMajor || formData.studyInterests.length > 0) && formData.gpa !== "" && formData.gpaScale !== "");
                  if (section.id === "finance") return !!(formData.budgetAnnualUsd !== "" && formData.preferredCountries.length > 0);
                  if (section.id === "experience") return !!(formData.extracurriculars || formData.leadership || formData.volunteering || formData.awards);
                  return false;
                })();
                return (
                  <Button
                    key={section.id}
                    id={`profile-tab-${section.id}`}
                    variant="unstyled"
                    type="button"
                    role="tab"
                    aria-selected={selected}
                    aria-controls={`profile-panel-${section.id}`}
                    tabIndex={selected ? 0 : -1}
                    onClick={() => {
                      setActiveSection(section.id);
                      setErrorMsg("");
                    }}
                    onKeyDown={(event) => {
                      let nextIndex = index;
                      if (event.key === "ArrowRight" || event.key === "ArrowDown") nextIndex = (index + 1) % PROFILE_SECTIONS.length;
                      else if (event.key === "ArrowLeft" || event.key === "ArrowUp") nextIndex = (index - 1 + PROFILE_SECTIONS.length) % PROFILE_SECTIONS.length;
                      else if (event.key === "Home") nextIndex = 0;
                      else if (event.key === "End") nextIndex = PROFILE_SECTIONS.length - 1;
                      else return;
                      event.preventDefault();
                      const next = PROFILE_SECTIONS[nextIndex];
                      setActiveSection(next.id);
                      document.getElementById(`profile-tab-${next.id}`)?.focus();
                    }}
                    className={`flex min-h-12 min-w-0 items-center justify-center gap-1.5 rounded-control px-2 py-2 text-center text-xs font-bold leading-snug transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 ${
                      selected
                        ? "bg-indigo-600 text-white shadow-sm"
                        : "text-slate-600 hover:bg-white hover:text-indigo-700 dark:text-slate-300 dark:hover:bg-slate-800"
                    }`}
                  >
                    <Icon aria-hidden="true" className="h-4 w-4 shrink-0" />
                    <span className="min-w-0 break-words">{te(`sections.${section.id}`)}</span>
                    {done && <span className="ml-1 h-2 w-2 shrink-0 rounded-full bg-emerald-500" aria-hidden title={te("sectionDone")} />}
                    {!done && <span className="ml-1 h-2 w-2 shrink-0 rounded-full bg-slate-300 dark:bg-slate-600" aria-hidden />}
                  </Button>
                );
              })}
            </div>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-4 sm:p-6">
          <section
            id="profile-panel-account"
            role="tabpanel"
            aria-labelledby="profile-tab-account"
            hidden={activeSection !== "account"}
            className="space-y-6"
          >
          {/* Basic Info */}
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-3 flex items-center gap-1.5">
              <BookOpen className="h-3.5 w-3.5 text-indigo-600" />
              {te("basicInformation")}
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1">{te("fullName")}</label>
                <input
                  type="text"
                  id="profile-name"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="sb-field min-h-11 w-full rounded-control border px-3 py-2 text-sm text-slate-900 focus:outline-none"
                  placeholder={te("fullNamePlaceholder")}
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1">{te("emailAddress")}</label>
                <input
                  id="profile-email"
                  type="email"
                  required={!tgOnlyAccount}
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="sb-field min-h-11 w-full rounded-control border px-3 py-2 text-sm text-slate-900 focus:outline-none"
                  placeholder={te("emailPlaceholder")}
                />
                {tgOnlyAccount && (
                  <p className="mt-1 text-sm text-slate-500">
                    {te("telegramEmailHint")}
                  </p>
                )}
              </div>
              {isNew && (
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1">{te("passwordRequired")}</label>
                  <input
                    type="password"
                    required
                    minLength={8}
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    className="sb-field min-h-11 w-full rounded-control border px-3 py-2 text-sm text-slate-900 focus:outline-none"
                    placeholder={te("passwordPlaceholder")}
                    autoComplete="new-password"
                  />
                  <p className="mt-1 text-sm text-slate-500">
                    {te("passwordHelp")}
                  </p>
                </div>
              )}
              {!isNew && (
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1">{te("newPasswordOptional")}</label>
                  <input
                    type="password"
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    className="sb-field min-h-11 w-full rounded-control border px-3 py-2 text-sm text-slate-900 focus:outline-none"
                    placeholder={te("newPasswordPlaceholder")}
                    autoComplete="new-password"
                  />
                  <p className="mt-1 text-sm text-slate-500">
                    {te("newPasswordHelp")}
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Personal details */}
          <div className="pt-2 border-t border-slate-100">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-3 flex items-center gap-1.5">
              <User className="h-3.5 w-3.5 text-indigo-600" />
              {te("personalDetails")}
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1">{te("countryOfResidence")}</label>
                <input
                  type="text"
                  value={formData.country}
                  onChange={(e) => setFormData({ ...formData, country: e.target.value })}
                  className="sb-field min-h-11 w-full rounded-control border px-3 py-2 text-sm text-slate-900 focus:outline-none"
                  placeholder={te("residencePlaceholder")}
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1">{te("age")}</label>
                <input
                  type="number"
                  min="14"
                  max="99"
                  value={formData.age || ""}
                  onChange={(e) => setFormData({ ...formData, age: e.target.value === "" ? "" : parseInt(e.target.value, 10) || 0 })}
                  className="sb-field min-h-11 w-full rounded-control border px-3 py-2 text-sm text-slate-900 focus:outline-none"
                  placeholder="18"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1">{te("graduationYear")}</label>
                <input
                  type="number"
                  min="2020"
                  max="2040"
                  value={formData.graduationYear || ""}
                  onChange={(e) => setFormData({ ...formData, graduationYear: e.target.value === "" ? "" : parseInt(e.target.value, 10) || 0 })}
                  className="sb-field min-h-11 w-full rounded-control border px-3 py-2 text-sm text-slate-900 focus:outline-none"
                  placeholder="2027"
                />
              </div>
            </div>
          </div>

          </section>
          <section
            id="profile-panel-academics"
            role="tabpanel"
            aria-labelledby="profile-tab-academics"
            hidden={activeSection !== "academics"}
            className="space-y-6"
          >
          {/* Academic Profile */}
          <div className="pt-2 border-t border-slate-100">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-3 flex items-center gap-1.5">
              <Award className="h-3.5 w-3.5 text-indigo-600" />
              {te("academicCredentials")}
            </h3>
            {/* Paste-a-CV preview → fills the fields below; nothing saves until "Save". */}
            <SmartAutofillBox supported={AUTOFILL_FIELDS} onApply={applyAutofill} className="mb-5" />
            <div className="mb-5">
              <StudyInterestPicker
                value={formData.studyInterests}
                onChange={(studyInterests) => {
                  studyInterestsTouched.current = true;
                  setFormData((previous) => ({
                    ...previous,
                    studyInterests,
                    targetMajor: compatibilityTargetMajor(studyInterests),
                  }));
                }}
                showError={false}
                idPrefix="profile-modal-study-interests"
              />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1">{te("targetDegree")}</label>
                <select
                  value={degreeControlValue}
                  onChange={(e) => setFormData({ ...formData, degreeLevel: e.target.value })}
                  className="sb-field min-h-11 w-full rounded-control border px-3 py-2 text-sm text-slate-900 focus:outline-none"
                >
                  <option value="Bachelor"><DegreeLevelLabel value="Bachelor" /></option>
                  <option value="Master"><DegreeLevelLabel value="Master" /></option>
                  <option value="PhD"><DegreeLevelLabel value="PhD" /></option>
                  <option value="Diploma"><DegreeLevelLabel value="Diploma" /></option>
                  {!["Bachelor", "Master", "PhD", "Diploma"].includes(degreeControlValue) && (
                    <option value={degreeControlValue}><DegreeLevelLabel value={formData.degreeLevel} /></option>
                  )}
                </select>
              </div>


              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1">{te("gpaScale")}</label>
                <div className="flex gap-2">
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    max="100"
                    value={formData.gpa}
                    onChange={(e) => setFormData({ ...formData, gpa: e.target.value === "" ? "" : parseFloat(e.target.value) || 0 })}
                    className="sb-field min-h-11 w-2/3 rounded-control border px-3 py-2 text-sm text-slate-900 focus:outline-none"
                  />
                  <select
                    value={formData.gpaScale}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        gpaScale: e.target.value === "" ? "" : parseFloat(e.target.value),
                      })
                    }
                    className="sb-field min-h-11 w-1/3 rounded-control border px-2 py-2 text-sm text-slate-900 focus:outline-none"
                  >
                    <option value="">—</option>
                    <option value={4.0}>/ 4.0</option>
                    <option value={5.0}>/ 5.0</option>
                    <option value={10.0}>/ 10.0</option>
                    <option value={100}>/ 100</option>
                  </select>
                </div>
              </div>
            </div>

            <div className="mt-4"><ApplicantContextFields value={formData.applicantContext} onChange={value=>setFormData({...formData,applicantContext:value})} legacyGpa={formData.gpa} legacyScale={formData.gpaScale} legacyToefl={formData.toeflScore}/></div>
            {/* Test Scores */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4">
              <div>
                <label className="block text-sm font-semibold text-slate-600 mb-1">{te("ieltsScore")}</label>
                <input
                  type="number"
                  step="0.5"
                  min="0"
                  max="9.0"
                  value={formData.ieltsScore || ""}
                  onChange={(e) => setFormData({ ...formData, ieltsScore: e.target.value === "" ? "" : parseFloat(e.target.value) || 0 })}
                  className="sb-field min-h-11 w-full rounded-control border px-3 py-1.5 text-sm text-slate-900 focus:outline-none sm:text-sm"
                  placeholder="7.5"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-600 mb-1">{te("toeflScore")}</label>
                <input
                  type="number"
                  min="0"
                  max="120"
                  value={formData.toeflScore || ""}
                  onChange={(e) => setFormData({ ...formData, toeflScore: e.target.value === "" ? "" : parseInt(e.target.value, 10) || 0 })}
                  className="sb-field min-h-11 w-full rounded-control border px-3 py-1.5 text-sm text-slate-900 focus:outline-none sm:text-sm"
                  placeholder="100"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-600 mb-1">{te("satScore")}</label>
                <input
                  type="number"
                  min="400"
                  max="1600"
                  value={formData.satScore || ""}
                  onChange={(e) => setFormData({ ...formData, satScore: e.target.value === "" ? "" : parseInt(e.target.value, 10) || 0 })}
                  className="sb-field min-h-11 w-full rounded-control border px-3 py-1.5 text-sm text-slate-900 focus:outline-none sm:text-sm"
                  placeholder="1420"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-600 mb-1">{te("greGeneral")}</label>
                <input
                  type="number"
                  min="260"
                  max="340"
                  value={formData.greScore || ""}
                  onChange={(e) => setFormData({ ...formData, greScore: e.target.value === "" ? "" : parseInt(e.target.value, 10) || 0 })}
                  className="sb-field min-h-11 w-full rounded-control border px-3 py-1.5 text-sm text-slate-900 focus:outline-none sm:text-sm"
                  placeholder="320"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-600 mb-1">{te("actScore")}</label>
                <input
                  type="number"
                  min="1"
                  max="36"
                  value={formData.actScore || ""}
                  onChange={(e) => setFormData({ ...formData, actScore: e.target.value === "" ? "" : parseInt(e.target.value, 10) || 0 })}
                  className="sb-field min-h-11 w-full rounded-control border px-3 py-1.5 text-sm text-slate-900 focus:outline-none sm:text-sm"
                  placeholder="32"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-600 mb-1">{te("duolingoEnglish")}</label>
                <input
                  type="number"
                  min="10"
                  max="160"
                  value={formData.duolingoScore || ""}
                  onChange={(e) => setFormData({ ...formData, duolingoScore: e.target.value === "" ? "" : parseInt(e.target.value, 10) || 0 })}
                  className="sb-field min-h-11 w-full rounded-control border px-3 py-1.5 text-sm text-slate-900 focus:outline-none sm:text-sm"
                  placeholder="120"
                />
              </div>
            </div>

            {/* Course rigor */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-4">
              <div>
                <label className="block text-sm font-semibold text-slate-600 mb-1">{te("apCourses")}</label>
                <input
                  type="text"
                  value={formData.apCourses}
                  onChange={(e) => setFormData({ ...formData, apCourses: e.target.value })}
                  className="sb-field min-h-11 w-full rounded-control border px-3 py-1.5 text-sm text-slate-900 focus:outline-none sm:text-sm"
                  placeholder={te("apPlaceholder")}
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-600 mb-1">{te("ibCourses")}</label>
                <input
                  type="text"
                  value={formData.ibCourses}
                  onChange={(e) => setFormData({ ...formData, ibCourses: e.target.value })}
                  className="sb-field min-h-11 w-full rounded-control border px-3 py-1.5 text-sm text-slate-900 focus:outline-none sm:text-sm"
                  placeholder={te("ibPlaceholder")}
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-600 mb-1">{te("aLevelSubjects")}</label>
                <input
                  type="text"
                  value={formData.aLevelSubjects}
                  onChange={(e) => setFormData({ ...formData, aLevelSubjects: e.target.value })}
                  className="sb-field min-h-11 w-full rounded-control border px-3 py-1.5 text-sm text-slate-900 focus:outline-none sm:text-sm"
                  placeholder={te("aLevelPlaceholder")}
                />
              </div>
            </div>
          </div>

          </section>
          <section
            id="profile-panel-finance"
            role="tabpanel"
            aria-labelledby="profile-tab-finance"
            hidden={activeSection !== "finance"}
            className="space-y-6"
          >
          {/* Financials & Preferences */}
          <div className="pt-2 border-t border-slate-100">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-3 flex items-center gap-1.5">
              <DollarSign className="h-3.5 w-3.5 text-emerald-600" />
              {te("budgetFinancialAid")}
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-center">
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1">
                  {te("annualBudget")}
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-2.5 text-slate-500 font-bold text-xs">$</span>
                  <input
                    type="number"
                    step="1000"
                    min="0"
                    value={formData.budgetAnnualUsd}
                    onChange={(e) => {
                      const raw = e.target.value;
                      setFormData({ ...formData, budgetAnnualUsd: raw === "" ? "" : Number(raw) });
                    }}
                    className="sb-field min-h-11 w-full rounded-control border py-2 pl-7 pr-3 text-sm text-slate-900 focus:outline-none"
                  />
                </div>
                <p className="text-sm text-slate-500 mt-1">
                  {formData.budgetAnnualUsd === ""
                    ? t("budgetNotSet")
                    : te("currentBudget", { value: formatNumber(formData.budgetAnnualUsd, { suffix: "/year" }) })}
                </p>
              </div>

              <div className="bg-slate-50 p-3 rounded-surface border border-slate-200">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.needScholarship}
                    onChange={(e) => setFormData({ ...formData, needScholarship: e.target.checked })}
                    className="h-4 w-4 rounded-control border-slate-300 text-indigo-600 focus:ring-indigo-500"
                  />
                  <div>
                    <span className="text-xs font-semibold text-slate-800">{te("needScholarship")}</span>
                    <p className="text-sm text-slate-500">{te("needScholarshipHint")}</p>
                  </div>
                </label>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-4">
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1">{te("familyIncome")}</label>
                <div className="relative">
                  <span className="absolute left-3 top-2.5 text-slate-500 font-bold text-xs">$</span>
                  <input
                    type="number"
                    step="500"
                    min="0"
                    value={formData.familyIncomeUsd || ""}
                    onChange={(e) => setFormData({ ...formData, familyIncomeUsd: e.target.value === "" ? "" : parseInt(e.target.value, 10) || 0 })}
                    className="sb-field min-h-11 w-full rounded-control border py-2 pl-7 pr-3 text-sm text-slate-900 focus:outline-none"
                    placeholder="12000"
                  />
                </div>
                <p className="mt-1 text-sm text-slate-500">{t("familyIncomeNotBudget")}</p>
              </div>

              <div className="bg-slate-50 p-3 rounded-surface border border-slate-200 flex items-center">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.requiresFullScholarship}
                    onChange={(e) => setFormData({ ...formData, requiresFullScholarship: e.target.checked })}
                    className="h-4 w-4 rounded-control border-slate-300 text-indigo-600 focus:ring-indigo-500"
                  />
                  <span className="text-xs font-semibold text-slate-800">{te("requireFullScholarship")}</span>
                </label>
              </div>
              <fieldset className="min-w-0 rounded-surface border border-slate-200 bg-slate-50 p-3 sm:col-span-3">
                <legend className="break-words text-xs font-semibold text-slate-800">{t("financialAidNeedQuestion")}</legend>
                <div className="mt-1 grid grid-cols-1 gap-1 sm:grid-cols-3">
                  {([
                    { value: null, label: t("financialAidUnknown") },
                    { value: true, label: t("financialAidYes") },
                    { value: false, label: t("financialAidNo") },
                  ] as const).map((choice) => (
                    <label key={String(choice.value)} className="flex min-h-11 min-w-0 cursor-pointer items-center gap-2 rounded-control px-2 py-1.5 text-sm font-medium text-slate-700 hover:bg-white focus-within:ring-2 focus-within:ring-indigo-500">
                      <input
                        type="radio"
                        name="profile-financial-aid-need"
                        value={choice.value === null ? "unknown" : choice.value ? "yes" : "no"}
                        checked={formData.needsFinancialAid === choice.value}
                        onChange={() => setFormData((previous) => ({ ...previous, needsFinancialAid: choice.value }))}
                        className="h-4 w-4 shrink-0 accent-indigo-600"
                      />
                      <span className="break-words">{choice.label}</span>
                    </label>
                  ))}
                </div>
              </fieldset>
            </div>
          </div>

          {/* Preferred Countries */}
          <div className="pt-2 border-t border-slate-100">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2 flex items-center gap-1.5">
              <Globe className="h-3.5 w-3.5 text-indigo-600" />
              {te("preferredDestinations")}
            </h3>
            <input
              type="search"
              value={countrySearch}
              onChange={(e) => setCountrySearch(e.target.value)}
              placeholder={tc("searchCountry")}
              aria-label={tc("searchCountry")}
              className="mb-2 min-h-11 w-full max-w-xs rounded-surface border border-slate-200 bg-white px-3 py-1.5 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
            />
            <div className="flex flex-wrap gap-2">
              {visibleCountryOptions.map((country) => {
                const selected = formData.preferredCountries.some((value) => countriesMatch(value, country));
                const countryKey = countryTranslationKey(country);
                return (
                  <Button variant="unstyled"
                    type="button"
                    key={country}
                    aria-pressed={selected}
                    onClick={() => handleCountryToggle(country)}
                    className={`inline-flex min-h-11 items-center gap-1.5 rounded-full sm:min-h-9 border px-3 py-1.5 text-xs font-medium transition-all ${
                      selected
                        ? "bg-indigo-600 text-white border-indigo-600 shadow-xs"
                        : "bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100"
                    }`}
                  >
                    <CountryFlag country={country} size="xs" />
                    {selected ? "✓" : "+"}{" "}
                    {countryKey ? tCountry(countryKey) : country}
                  </Button>
                );
              })}
            </div>
            {!preferredSearching && (
              <ShowMoreToggle
                totalCount={countryOptions.length}
                visibleCount={visibleCountryOptions.length}
                expanded={showAllCountries}
                onToggle={() => setShowAllCountries((v) => !v)}
                className="mt-2 justify-start"
              />
            )}
          </div>

          </section>
          <section
            id="profile-panel-experience"
            role="tabpanel"
            aria-labelledby="profile-tab-experience"
            hidden={activeSection !== "experience"}
            className="space-y-6"
          >
          {/* Research & Experience */}
          <div className="pt-2 border-t border-slate-100">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-3">
              {te("researchHighlights")}
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-3">
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1">{te("workExperience")}</label>
                <select
                  value={formData.workExperienceYears}
                  onChange={(e) => setFormData({ ...formData, workExperienceYears: parseInt(e.target.value, 10) })}
                  className="sb-field min-h-11 w-full rounded-control border px-3 py-2 text-sm text-slate-900 focus:outline-none"
                >
                  <option value={0}>{te("workYears0")}</option>
                  <option value={1}>{te("workYears1")}</option>
                  <option value={2}>{te("workYears2")}</option>
                  <option value={3}>{te("workYears3")}</option>
                  <option value={5}>{te("workYears5")}</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1">{te("researchPublications")}</label>
                <input
                  type="number"
                  min="0"
                  value={formData.researchPublications}
                  onChange={(e) => setFormData({ ...formData, researchPublications: parseInt(e.target.value, 10) || 0 })}
                  className="sb-field min-h-11 w-full rounded-control border px-3 py-2 text-sm text-slate-900 focus:outline-none"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1">{te("extracurricularAchievements")}</label>
              <textarea
                rows={2}
                value={formData.extracurriculars}
                onChange={(e) => setFormData({ ...formData, extracurriculars: e.target.value })}
                className="sb-field min-h-11 w-full rounded-control border px-3 py-2 text-sm text-slate-900 focus:outline-none"
                placeholder={te("extracurricularPlaceholder")}
              />
            </div>
          </div>

          {/* Extracurricular detail (from My Profile) */}
          <div className="pt-2 border-t border-slate-100">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-3 flex items-center gap-1.5">
              <User className="h-3.5 w-3.5 text-indigo-600" />
              {te("extracurriculars")}
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {EXPERIENCE_FIELD_KEYS.map(([key, labelKey, placeholderKey]) => (
                <div key={key}>
                  <label className="mb-1 block text-sm font-semibold text-slate-700">{te(labelKey)}</label>
                  <input
                    type="text"
                    value={formData[key]}
                    onChange={(e) => setFormData({ ...formData, [key]: e.target.value })}
                    className="sb-field min-h-11 w-full rounded-control border px-3 py-2 text-sm text-slate-900 focus:outline-none"
                    placeholder={te(placeholderKey)}
                  />
                </div>
              ))}
            </div>
          </div>

          {/* Achievements (from My Profile) */}
          <div className="pt-2 border-t border-slate-100">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-3 flex items-center gap-1.5">
              <Trophy className="h-3.5 w-3.5 text-amber-600" />
              {te("achievements")}
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {ACHIEVEMENT_FIELD_KEYS.map(([key, labelKey, placeholderKey]) => (
                <div key={key}>
                  <label className="mb-1 block text-sm font-semibold text-slate-700">{te(labelKey)}</label>
                  <input
                    type="text"
                    value={formData[key]}
                    onChange={(e) => setFormData({ ...formData, [key]: e.target.value })}
                    className="sb-field min-h-11 w-full rounded-control border px-3 py-2 text-sm text-slate-900 focus:outline-none"
                    placeholder={te(placeholderKey)}
                  />
                </div>
              ))}
            </div>
          </div>

          {/* Goals (from My Profile) */}
          <div className="pt-2 border-t border-slate-100">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-3 flex items-center gap-1.5">
              <Target className="h-3.5 w-3.5 text-indigo-600" />
              {te("goals")}
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1">{te("targetUniversities")}</label>
                <input
                  type="text"
                  value={formData.targetUniversities}
                  onChange={(e) => setFormData({ ...formData, targetUniversities: e.target.value })}
                  className="sb-field min-h-11 w-full rounded-control border px-3 py-2 text-sm text-slate-900 focus:outline-none"
                  placeholder={te("targetUniversitiesPlaceholder")}
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1">{te("careerGoal")}</label>
                <textarea
                  rows={2}
                  value={formData.careerGoal}
                  onChange={(e) => setFormData({ ...formData, careerGoal: e.target.value })}
                  className="sb-field min-h-11 w-full rounded-control border px-3 py-2 text-sm text-slate-900 focus:outline-none"
                  placeholder={te("careerGoalPlaceholder")}
                />
              </div>
            </div>
          </div>

          </section>
          </div>

          {/* Validation and actions never scroll out of reach. */}
          <div className="shrink-0 border-t border-slate-200 bg-white px-4 py-3 dark:border-slate-700 dark:bg-surface sm:px-6">
            {errorMsg && (
              <div role="alert" className="mb-3 rounded-surface border border-rose-200 bg-rose-50 px-3 py-2 text-sm font-semibold text-rose-700 dark:border-rose-800 dark:bg-rose-950/40 dark:text-rose-200">
                {errorMsg}
              </div>
            )}
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-sm font-semibold text-slate-500 dark:text-slate-400">
                {te("sectionProgress", { current: PROFILE_SECTIONS.findIndex((section) => section.id === activeSection) + 1, total: PROFILE_SECTIONS.length })}
              </p>
              <div className="flex items-center justify-end gap-2">
                <Button variant="outline" type="button" onClick={onClose}>{tc("cancel")}</Button>
                <Button type="submit" disabled={isSubmitting}>
                  <Save aria-hidden="true" className="h-4 w-4" />
                  {isSubmitting ? te("saving") : isNew ? te("createProfile") : te("saveChanges")}
                </Button>
              </div>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
