"use client";

import React, { useState, useEffect } from "react";
import { StudentProfile } from "./Navbar";
import { DegreeLevelLabel } from "./DegreeLevelLabel";
import { normalizeDegreeLevel } from "@/lib/degreeLevels";
import { X, Save, Sparkles, DollarSign, BookOpen, Globe, Award, User, Trophy, Target } from "lucide-react";
import { formatNumber } from "@/lib/format";
import { STUDY_FIELD_CATEGORIES, STUDY_FIELDS } from "@/lib/studyFields";
import { isTelegramPlaceholderEmail } from "@/lib/telegram/placeholder";
import { countryCodeFor } from "@/lib/countries";
import { useTranslations } from "next-intl";
import { MIN_PASSWORD_LENGTH } from "@/lib/passwordPolicy";

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
  const t = useTranslations("profile");
  const tc = useTranslations("countries");
  const [formData, setFormData] = useState<{
    name: string;
    email: string;
    degreeLevel: string;
    targetMajor: string;
    gpa: number | string;
    gpaScale: number;
    ieltsScore: number | string;
    toeflScore: number | string;
    satScore: number | string;
    greScore: number | string;
    actScore: number | string;
    duolingoScore: number | string;
    budgetAnnualUsd: number;
    familyIncomeUsd: number | string;
    preferredCountries: string[];
    targetUniversities: string;
    careerGoal: string;
    needScholarship: boolean;
    needsFinancialAid: boolean;
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
    name: "",
    email: "",
    password: "",
    degreeLevel: "Master",
    targetMajor: "Computer Science",
    // No fabricated test scores: empty fields stay empty until entered.
    gpa: "",
    gpaScale: 4.0,
    ieltsScore: "",
    toeflScore: "",
    satScore: "",
    greScore: "",
    actScore: "",
    duolingoScore: "",
    budgetAnnualUsd: 25000,
    familyIncomeUsd: "",
    preferredCountries: ["United States", "United Kingdom", "Canada", "Germany"],
    targetUniversities: "",
    careerGoal: "",
    needScholarship: true,
    needsFinancialAid: false,
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

  useEffect(() => {
    if (profile && !isNew) {
      let countries: string[] = ["United States", "United Kingdom", "Canada"];
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
        name: profile.name || "",
        // Telegram-only accounts have a technical email — show an empty field.
        email: isTelegramPlaceholderEmail(profile.email) ? "" : profile.email || "",
        degreeLevel: profile.degreeLevel || "Master",
        targetMajor: profile.targetMajor || "Computer Science",
        // NEVER fabricate values: empty fields stay empty instead of being
        // saved as fake defaults (7.0/95/1350/315) when a profile has no
        // test scores yet.
        gpa: profile.gpa ?? "",
        gpaScale: profile.gpaScale || 4.0,
        ieltsScore: profile.ieltsScore ?? "",
        toeflScore: profile.toeflScore ?? "",
        satScore: profile.satScore ?? "",
        greScore: profile.greScore ?? "",
        actScore: profile.actScore ?? "",
        duolingoScore: profile.duolingoScore ?? "",
        budgetAnnualUsd: profile.budgetAnnualUsd || 25000,
        familyIncomeUsd: profile.familyIncomeUsd ?? "",
        preferredCountries: countries,
        targetUniversities: toList(profile.targetUniversities),
        careerGoal: profile.careerGoal || "",
        needScholarship: profile.needScholarship ?? true,
        needsFinancialAid: profile.needsFinancialAid ?? false,
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
        name: "",
        email: "",
        degreeLevel: "Master",
        targetMajor: "",
        // Never pre-fill fabricated academic data — the student enters
        // their real GPA/test scores (NULL-safe, spec §19).
        gpa: "",
        gpaScale: 4.0,
        ieltsScore: "",
        toeflScore: "",
        satScore: "",
        greScore: "",
        actScore: "",
        duolingoScore: "",
        budgetAnnualUsd: 25000,
        familyIncomeUsd: "",
        preferredCountries: ["United States", "United Kingdom", "Canada", "Germany"],
        targetUniversities: "",
        careerGoal: "",
        needScholarship: true,
        needsFinancialAid: false,
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
  }, [profile, isNew, isOpen]);

  // Clear any previous error each time the modal opens.
  useEffect(() => {
    if (isOpen) setErrorMsg("");
  }, [isOpen]);

  if (!isOpen) return null;

  const degreeControlValue = normalizeDegreeLevel(formData.degreeLevel) ?? formData.degreeLevel;

  const countryOptions = [
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
  ];

  const handleCountryToggle = (country: string) => {
    setFormData((prev) => {
      const exists = prev.preferredCountries.includes(country);
      if (exists) {
        return {
          ...prev,
          preferredCountries: prev.preferredCountries.filter((c) => c !== country),
        };
      } else {
        return {
          ...prev,
          preferredCountries: [...prev.preferredCountries, country],
        };
      }
    });
  };

  const tgOnlyAccount = !isNew && isTelegramPlaceholderEmail(profile?.email);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");
    const password = formData.password.trim();
    if (isNew && password.length < MIN_PASSWORD_LENGTH) {
      setErrorMsg(t("errPasswordNew", { min: MIN_PASSWORD_LENGTH }));
      return;
    }
    if (!isNew && password.length > 0 && password.length < MIN_PASSWORD_LENGTH) {
      setErrorMsg(t("errPasswordChange", { min: MIN_PASSWORD_LENGTH }));
      return;
    }
    setIsSubmitting(true);
    try {
      const {
        gpa, ieltsScore, toeflScore, satScore, greScore,
        actScore, duolingoScore, age, graduationYear, familyIncomeUsd,
        ...rest
      } = formData;
      await onSave({
        ...rest,
        // Empty numeric fields are saved as null (NULL in DB), never 0.
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
      });
      onClose();
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err?.message || t("errSave"));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden border border-slate-200 my-8">
        {/* Header */}
        <div className="bg-gradient-to-r from-indigo-700 via-blue-700 to-indigo-800 text-white px-6 py-5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-white/10 rounded-xl backdrop-blur-md">
              <Sparkles className="h-6 w-6 text-amber-300" />
            </div>
            <div>
              <h2 className="text-xl font-bold">{isNew ? t("titleCreate") : t("titleEdit")}</h2>
              <p className="text-xs text-indigo-100">{t("subtitle")}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 text-white/80 hover:text-white hover:bg-white/10 rounded-lg">
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6 max-h-[75vh] overflow-y-auto">
          {errorMsg && (
            <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-xs font-semibold text-red-700">
              {errorMsg}
            </div>
          )}
          {/* Basic Info */}
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3 flex items-center gap-1.5">
              <BookOpen className="h-3.5 w-3.5 text-indigo-600" />{t("sectionBasic")}</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">{t("fullName")}</label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  placeholder={t("namePlaceholder")}
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">{t("emailAddress")}</label>
                <input
                  type="email"
                  required={!tgOnlyAccount}
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  placeholder={t("emailPlaceholder")}
                />
                {tgOnlyAccount && (
                  <p className="mt-1 text-[10px] text-slate-500">{t("telegramHint")}</p>
                )}
              </div>
              {isNew && (
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">{t("password")}</label>
                  <input
                    type="password"
                    required
                    minLength={8}
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                    placeholder={t("passwordPlaceholder")}
                    autoComplete="new-password"
                  />
                  <p className="mt-1 text-[10px] text-slate-500">
                    {t("passwordHint")}
                  </p>
                </div>
              )}
              {!isNew && (
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">{t("newPassword")}</label>
                  <input
                    type="password"
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                    placeholder={t("newPasswordPlaceholder")}
                    autoComplete="new-password"
                  />
                  <p className="mt-1 text-[10px] text-slate-500">{t("newPasswordHint")}</p>
                </div>
              )}
            </div>
          </div>

          {/* Personal details */}
          <div className="pt-2 border-t border-slate-100">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3 flex items-center gap-1.5">
              <User className="h-3.5 w-3.5 text-sky-600" />{t("sectionPersonal")}</h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">{t("countryResidence")}</label>
                <input
                  type="text"
                  value={formData.country}
                  onChange={(e) => setFormData({ ...formData, country: e.target.value })}
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  placeholder={t("countryPlaceholder")}
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">{t("age")}</label>
                <input
                  type="number"
                  min="14"
                  max="99"
                  value={formData.age || ""}
                  onChange={(e) => setFormData({ ...formData, age: e.target.value === "" ? "" : parseInt(e.target.value, 10) || 0 })}
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  placeholder="18"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">{t("graduationYear")}</label>
                <input
                  type="number"
                  min="2020"
                  max="2040"
                  value={formData.graduationYear || ""}
                  onChange={(e) => setFormData({ ...formData, graduationYear: e.target.value === "" ? "" : parseInt(e.target.value, 10) || 0 })}
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  placeholder="2027"
                />
              </div>
            </div>
          </div>

          {/* Academic Profile */}
          <div className="pt-2 border-t border-slate-100">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3 flex items-center gap-1.5">
              <Award className="h-3.5 w-3.5 text-indigo-600" />{t("sectionAcademic")}</h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">{t("targetDegree")}</label>
                <select
                  value={degreeControlValue}
                  onChange={(e) => setFormData({ ...formData, degreeLevel: e.target.value })}
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none"
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
                <label className="block text-xs font-semibold text-slate-700 mb-1">{t("targetMajor")}</label>
                <select
                  required
                  value={formData.targetMajor}
                  onChange={(e) => setFormData({ ...formData, targetMajor: e.target.value })}
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                >
                  <option value="" disabled>{t("majorPlaceholder")}</option>
                  {formData.targetMajor && !STUDY_FIELDS.includes(formData.targetMajor) && (
                    <option value={formData.targetMajor}>{formData.targetMajor}</option>
                  )}
                  {STUDY_FIELD_CATEGORIES.map((category) => (
                    <optgroup key={category.name} label={category.name}>
                      {category.fields.map((field) => (
                        <option key={field} value={field}>{field}</option>
                      ))}
                    </optgroup>
                  ))}
                </select>
                <p className="mt-1 text-[10px] text-slate-500">{t("majorHint")}</p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">{t("gpaScale")}</label>
                <div className="flex gap-2">
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    max="100"
                    required
                    value={formData.gpa}
                    onChange={(e) => setFormData({ ...formData, gpa: e.target.value === "" ? "" : parseFloat(e.target.value) || 0 })}
                    className="w-2/3 px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  />
                  <select
                    value={formData.gpaScale}
                    onChange={(e) => setFormData({ ...formData, gpaScale: parseFloat(e.target.value) })}
                    className="w-1/3 px-2 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  >
                    <option value={4.0}>/ 4.0</option>
                    <option value={5.0}>/ 5.0</option>
                    <option value={10.0}>/ 10.0</option>
                    <option value={100}>/ 100</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Test Scores */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4">
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">{t("ielts")}</label>
                <input
                  type="number"
                  step="0.5"
                  min="0"
                  max="9.0"
                  value={formData.ieltsScore || ""}
                  onChange={(e) => setFormData({ ...formData, ieltsScore: e.target.value === "" ? "" : parseFloat(e.target.value) || 0 })}
                  className="w-full px-3 py-1.5 text-xs sm:text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  placeholder="e.g. 7.5"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">{t("toefl")}</label>
                <input
                  type="number"
                  min="0"
                  max="120"
                  value={formData.toeflScore || ""}
                  onChange={(e) => setFormData({ ...formData, toeflScore: e.target.value === "" ? "" : parseInt(e.target.value, 10) || 0 })}
                  className="w-full px-3 py-1.5 text-xs sm:text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  placeholder="e.g. 100"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">{t("sat")}</label>
                <input
                  type="number"
                  min="400"
                  max="1600"
                  value={formData.satScore || ""}
                  onChange={(e) => setFormData({ ...formData, satScore: e.target.value === "" ? "" : parseInt(e.target.value, 10) || 0 })}
                  className="w-full px-3 py-1.5 text-xs sm:text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  placeholder="e.g. 1420"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">{t("gre")}</label>
                <input
                  type="number"
                  min="260"
                  max="340"
                  value={formData.greScore || ""}
                  onChange={(e) => setFormData({ ...formData, greScore: e.target.value === "" ? "" : parseInt(e.target.value, 10) || 0 })}
                  className="w-full px-3 py-1.5 text-xs sm:text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  placeholder="e.g. 320"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">{t("act")}</label>
                <input
                  type="number"
                  min="1"
                  max="36"
                  value={formData.actScore || ""}
                  onChange={(e) => setFormData({ ...formData, actScore: e.target.value === "" ? "" : parseInt(e.target.value, 10) || 0 })}
                  className="w-full px-3 py-1.5 text-xs sm:text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  placeholder="e.g. 32"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">{t("duolingo")}</label>
                <input
                  type="number"
                  min="10"
                  max="160"
                  value={formData.duolingoScore || ""}
                  onChange={(e) => setFormData({ ...formData, duolingoScore: e.target.value === "" ? "" : parseInt(e.target.value, 10) || 0 })}
                  className="w-full px-3 py-1.5 text-xs sm:text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  placeholder="e.g. 120"
                />
              </div>
            </div>

            {/* Course rigor */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-4">
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">{t("apCourses")}</label>
                <input
                  type="text"
                  value={formData.apCourses}
                  onChange={(e) => setFormData({ ...formData, apCourses: e.target.value })}
                  className="w-full px-3 py-1.5 text-xs sm:text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  placeholder={t("apPlaceholder")}
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">{t("ibCourses")}</label>
                <input
                  type="text"
                  value={formData.ibCourses}
                  onChange={(e) => setFormData({ ...formData, ibCourses: e.target.value })}
                  className="w-full px-3 py-1.5 text-xs sm:text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  placeholder={t("ibPlaceholder")}
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">{t("alevelSubjects")}</label>
                <input
                  type="text"
                  value={formData.aLevelSubjects}
                  onChange={(e) => setFormData({ ...formData, aLevelSubjects: e.target.value })}
                  className="w-full px-3 py-1.5 text-xs sm:text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  placeholder={t("alevelPlaceholder")}
                />
              </div>
            </div>
          </div>

          {/* Financials & Preferences */}
          <div className="pt-2 border-t border-slate-100">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3 flex items-center gap-1.5">
              <DollarSign className="h-3.5 w-3.5 text-emerald-600" />{t("sectionBudget")}</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-center">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">{t("budgetLabel")}</label>
                <div className="relative">
                  <span className="absolute left-3 top-2.5 text-slate-400 font-bold text-xs">$</span>
                  <input
                    type="number"
                    step="1000"
                    min="0"
                    value={formData.budgetAnnualUsd}
                    onChange={(e) => setFormData({ ...formData, budgetAnnualUsd: parseInt(e.target.value, 10) || 0 })}
                    className="w-full pl-7 pr-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  />
                </div>
                <p className="text-[11px] text-slate-500 mt-1">
                  {t("currentPrefix")} {formatNumber(formData.budgetAnnualUsd, { suffix: "/year" })}
                </p>
              </div>

              <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.needScholarship}
                    onChange={(e) => setFormData({ ...formData, needScholarship: e.target.checked })}
                    className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                  />
                  <div>
                    <span className="text-xs font-semibold text-slate-800">{t("requiresScholarship")}</span>
                    <p className="text-[11px] text-slate-500">{t("prioritizesAid")}</p>
                  </div>
                </label>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">{t("familyIncome")}</label>
                <div className="relative">
                  <span className="absolute left-3 top-2.5 text-slate-400 font-bold text-xs">$</span>
                  <input
                    type="number"
                    step="500"
                    min="0"
                    value={formData.familyIncomeUsd || ""}
                    onChange={(e) => setFormData({ ...formData, familyIncomeUsd: e.target.value === "" ? "" : parseInt(e.target.value, 10) || 0 })}
                    className="w-full pl-7 pr-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                    placeholder="12000"
                  />
                </div>
              </div>
              <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 flex items-center">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.needsFinancialAid}
                    onChange={(e) => setFormData({ ...formData, needsFinancialAid: e.target.checked })}
                    className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                  />
                  <span className="text-xs font-semibold text-slate-800">{t("needsAid")}</span>
                </label>
              </div>
              <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 flex items-center">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.requiresFullScholarship}
                    onChange={(e) => setFormData({ ...formData, requiresFullScholarship: e.target.checked })}
                    className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                  />
                  <span className="text-xs font-semibold text-slate-800">{t("requireFullScholarship")}</span>
                </label>
              </div>
            </div>
          </div>

          {/* Preferred Countries */}
          <div className="pt-2 border-t border-slate-100">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2 flex items-center gap-1.5">
              <Globe className="h-3.5 w-3.5 text-blue-600" />{t("sectionDestinations")}</h3>
            <div className="flex flex-wrap gap-2">
              {countryOptions.map((country) => {
                const selected = formData.preferredCountries.includes(country);
                return (
                  <button
                    type="button"
                    key={country}
                    onClick={() => handleCountryToggle(country)}
                    className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-all ${
                      selected
                        ? "bg-indigo-600 text-white border-indigo-600 shadow-xs"
                        : "bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100"
                    }`}
                  >
                    {selected ? "✓ " : "+ "}
                    {tc(countryCodeFor(country) ?? "us")}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Research & Experience */}
          <div className="pt-2 border-t border-slate-100">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3">{t("sectionHighlights")}</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">{t("workExperience")}</label>
                <select
                  value={formData.workExperienceYears}
                  onChange={(e) => setFormData({ ...formData, workExperienceYears: parseInt(e.target.value, 10) })}
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                >
                  <option value={0}>{t("exp0")}</option>
                  <option value={1}>{t("exp1")}</option>
                  <option value={2}>{t("exp2")}</option>
                  <option value={3}>{t("exp3")}</option>
                  <option value={5}>{t("exp5")}</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">{t("publications")}</label>
                <input
                  type="number"
                  min="0"
                  value={formData.researchPublications}
                  onChange={(e) => setFormData({ ...formData, researchPublications: parseInt(e.target.value, 10) || 0 })}
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">{t("extracurricularsTitle")}</label>
              <textarea
                rows={2}
                value={formData.extracurriculars}
                onChange={(e) => setFormData({ ...formData, extracurriculars: e.target.value })}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                placeholder={t("extracurricularsPlaceholder")}
              />
            </div>
          </div>

          {/* Extracurricular detail (from My Profile) */}
          <div className="pt-2 border-t border-slate-100">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3 flex items-center gap-1.5">
              <User className="h-3.5 w-3.5 text-teal-600" />{t("extracurricularsLabel")}</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {([
                ["leadership", "chipLeadership", "chipLeadershipHint"],
                ["volunteering", "chipVolunteering", "chipVolunteeringHint"],
                ["sports", "chipSports", "chipSportsHint"],
                ["clubs", "chipClubs", "chipClubsHint"],
                ["researchExperience", "chipResearch", "chipResearchHint"],
                ["projects", "chipProjects", "chipProjectsHint"],
              ] as const).map(([key, labelKey, placeholderKey]) => (
                <div key={key}>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">{t(labelKey)}</label>
                  <input
                    type="text"
                    value={formData[key]}
                    onChange={(e) => setFormData({ ...formData, [key]: e.target.value })}
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                    placeholder={t(placeholderKey)}
                  />
                </div>
              ))}
            </div>
          </div>

          {/* Achievements (from My Profile) */}
          <div className="pt-2 border-t border-slate-100">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3 flex items-center gap-1.5">
              <Trophy className="h-3.5 w-3.5 text-amber-600" />{t("achievements")}</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {([
                ["olympiads", t("achOlympiads"), t("achOlympiadsHint")],
                ["awards", t("achAwards"), t("achAwardsHint")],
                ["competitions", t("achCompetitions"), t("achCompetitionsHint")],
                ["certificates", t("achCertificates"), t("achCertificatesHint")],
              ] as const).map(([key, labelKey, placeholderKey]) => (
                <div key={key}>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">{t(labelKey)}</label>
                  <input
                    type="text"
                    value={formData[key]}
                    onChange={(e) => setFormData({ ...formData, [key]: e.target.value })}
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                    placeholder={t(placeholderKey)}
                  />
                </div>
              ))}
            </div>
          </div>

          {/* Goals (from My Profile) */}
          <div className="pt-2 border-t border-slate-100">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3 flex items-center gap-1.5">
              <Target className="h-3.5 w-3.5 text-indigo-600" />{t("goals")}</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">{t("targetUniversities")}</label>
                <input
                  type="text"
                  value={formData.targetUniversities}
                  onChange={(e) => setFormData({ ...formData, targetUniversities: e.target.value })}
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  placeholder={t("targetUniversitiesPlaceholder")}
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">{t("careerGoal")}</label>
                <textarea
                  rows={2}
                  value={formData.careerGoal}
                  onChange={(e) => setFormData({ ...formData, careerGoal: e.target.value })}
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  placeholder={t("careerGoalPlaceholder")}
                />
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-200">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-slate-600 hover:text-slate-800 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors"
            >{t("cancel")}</button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex items-center gap-2 px-5 py-2 text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-md hover:shadow-indigo-200 transition-all disabled:opacity-50"
            >
              <Save className="h-4 w-4" />
              {isSubmitting ? t("saving") : isNew ? t("create") : t("saveChanges")}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
