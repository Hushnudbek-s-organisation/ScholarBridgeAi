"use client";

import React, { useState } from "react";
import { useTranslations } from "next-intl";
import { useLocaleContext } from "@/i18n/LocaleProvider";
import confetti from "canvas-confetti";
import { StudentProfile } from "./Navbar";
import { University } from "./UniversityExplorer";
import { Scholarship } from "./ScholarshipHub";
import { 
  GraduationCap, 
  Award, 
  CheckCircle2, 
  Trash2, 
  Edit3, 
  Save, 
  Sparkles,
  ExternalLink,
  ChevronRight,
  Clock
} from "lucide-react";
import { formatMoney } from "@/lib/format";
import { Button } from "@/components/ui/Button";
import {
  localizeCity,
  localizeCountry,
  localizeCoverageType,
  localizeMajorOrField,
  localizeScholarshipProvider,
  localizeScholarshipTitle,
} from "@/lib/catalogLocalizer";

export interface SavedUniversityItem {
  id: number;
  profileId: number;
  universityId: number;
  matchScore: number;
  status: string;
  notes: string;
  university: University;
}

export interface SavedScholarshipItem {
  id: number;
  profileId: number;
  scholarshipId: number;
  status: string;
  notes: string;
  scholarship: Scholarship;
}

interface ApplicationTrackerProps {
  activeProfile: StudentProfile | null;
  savedUniversities: SavedUniversityItem[];
  savedScholarships: SavedScholarshipItem[];
  onUpdateSavedUniStatus: (id: number, status: string, notes?: string) => Promise<void>;
  onRemoveSavedUni: (id: number) => Promise<void>;
  onUpdateSavedScholarshipStatus: (id: number, status: string, notes?: string) => Promise<void>;
  onRemoveSavedScholarship: (id: number) => Promise<void>;
}

export function ApplicationTracker({
  activeProfile,
  savedUniversities,
  savedScholarships,
  onUpdateSavedUniStatus,
  onRemoveSavedUni,
  onUpdateSavedScholarshipStatus,
  onRemoveSavedScholarship,
}: ApplicationTrackerProps) {
  const tUniversity = useTranslations("university");
  const t = useTranslations("applications.tracker");
  const { locale } = useLocaleContext();
  const [activeSubTab, setActiveTab] = useState<"universities" | "scholarships">("universities");
  const [editingNotesId, setEditingNotesId] = useState<number | null>(null);
  const [tempNotes, setTempNotes] = useState("");

  const uniStatuses = ["Shortlisted", "Preparing Application", "Submitted", "Accepted", "Enrolled", "Rejected"] as const;
  const scholarshipStatuses = ["Saved", "Drafting Essay", "Docs Submitted", "Awarded", "Declined"] as const;

  const fireCelebration = () => {
    try {
      confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.6 },
      });
    } catch {
      // fallback
    }
  };

  const handleUniStatusChange = async (id: number, newStatus: string) => {
    await onUpdateSavedUniStatus(id, newStatus);
    if (newStatus === "Accepted" || newStatus === "Enrolled") {
      fireCelebration();
    }
  };

  const handleScholarshipStatusChange = async (id: number, newStatus: string) => {
    await onUpdateSavedScholarshipStatus(id, newStatus);
    if (newStatus === "Awarded") {
      fireCelebration();
    }
  };

  return (
    <div className="space-y-6">
      {/* Sub Tab Picker */}
      <div className="bg-white rounded-overlay p-4 border border-slate-200 shadow-xs space-y-3">
        <div className="flex items-center justify-between gap-3">
          <h1 className="text-lg sm:text-xl font-extrabold text-slate-900">
            {t("title")}
          </h1>
          <p className="text-sm text-slate-500 hidden md:block">
            {t("subtitle", { name: activeProfile?.name || tUniversity("exProfileFallback") })}
          </p>
        </div>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          <Button variant="unstyled"
            onClick={() => setActiveTab("universities")}
            className={`flex min-h-11 items-center justify-center gap-2 px-4 py-2 rounded-surface text-sm font-bold transition-all ${
              activeSubTab === "universities"
                ? "bg-indigo-600 text-white shadow-xs"
                : "text-slate-600 hover:bg-slate-100"
            }`}
          >
            <GraduationCap className="h-4 w-4" />
            {t("universityTab", { count: savedUniversities.length })}
          </Button>

          <Button variant="unstyled"
            onClick={() => setActiveTab("scholarships")}
            className={`flex min-h-11 items-center justify-center gap-2 px-4 py-2 rounded-surface text-sm font-bold transition-all ${
              activeSubTab === "scholarships"
                ? "bg-indigo-600 text-white shadow-xs"
                : "text-slate-600 hover:bg-slate-100"
            }`}
          >
            <Award className="h-4 w-4" />
            {t("scholarshipTab", { count: savedScholarships.length })}
          </Button>
        </div>
      </div>

      {/* Universities Tracker */}
      {activeSubTab === "universities" && (
        <div className="space-y-4">
          {savedUniversities.length === 0 ? (
            <div className="p-12 text-center text-slate-500 bg-white rounded-overlay border border-slate-200">
              {t.rich("emptyUniversities", { explorer: (chunks) => <strong>{chunks}</strong> })}
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4">
              {savedUniversities.map((item) => {
                const u = item.university;
                if (!u) return null;

                const isEditingThisNotes = editingNotesId === item.id;

                return (
                  <div
                    key={item.id}
                    className="bg-white rounded-overlay border border-slate-200 shadow-xs p-5 hover:border-indigo-300 transition-all flex flex-col md:flex-row items-start md:items-center justify-between gap-6"
                  >
                    {/* Left Info */}
                    <div className="space-y-2 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-lg">{u.flagEmoji}</span>
                        <h3 className="font-bold text-base text-slate-900">{u.name}</h3>
                        <span className="px-2 py-0.5 rounded-control text-xs font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
                          {tUniversity("exMatchPct", { score: item.matchScore })}
                        </span>
                      </div>

                      <div className="text-xs text-slate-600 flex flex-wrap items-center gap-3">
                        <span>🎓 {localizeMajorOrField(u.programMajor, locale)}</span>
                        <span>💵 {t("tuition")}: {formatMoney(u.annualTuitionUsd, "USD", { suffix: "/yr" })}</span>
                        <span>📍 {localizeCity(u.city, locale)}, {localizeCountry(u.country, locale)}</span>
                      </div>

                      {/* Notes Box */}
                      <div className="bg-slate-50 p-3 rounded-surface border border-slate-100 text-xs text-slate-700 mt-2">
                        <div className="flex items-center justify-between mb-1">
                          <span className="font-bold text-slate-500 text-xs uppercase">{t("universityNotes")}</span>
                          {!isEditingThisNotes && (
                            <Button variant="unstyled"
                              onClick={() => {
                                setEditingNotesId(item.id);
                                setTempNotes(item.notes || "");
                              }}
                              className="flex min-h-11 items-center gap-1 text-xs font-semibold text-indigo-600 hover:underline"
                            >
                              <Edit3 className="h-3 w-3" /> {t("editNotes")}
                            </Button>
                          )}
                        </div>

                        {isEditingThisNotes ? (
                          <div className="space-y-2">
                            <textarea
                              rows={2}
                              value={tempNotes}
                              onChange={(e) => setTempNotes(e.target.value)}
                              className="w-full p-2 border border-slate-300 rounded-control text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                            />
                            <Button variant="unstyled"
                              onClick={async () => {
                                await onUpdateSavedUniStatus(item.id, item.status, tempNotes);
                                setEditingNotesId(null);
                              }}
                              className="flex min-h-11 items-center gap-1 rounded-control bg-indigo-600 px-3 py-1 text-xs font-semibold text-white"
                            >
                              <Save className="h-3 w-3" /> {t("saveNotes")}
                            </Button>
                          </div>
                        ) : (
                          <p className="italic text-slate-600">
                            {item.notes ? item.notes : t("noNotes")}
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Right Controls */}
                    <div className="flex flex-col sm:flex-row md:flex-col items-start md:items-end gap-3 w-full md:w-auto shrink-0 border-t md:border-t-0 pt-3 md:pt-0 border-slate-100">
                      <div>
                        <label className="block text-sm font-bold text-slate-500 uppercase mb-1">{t("status")}</label>
                        <select
                          value={item.status}
                          onChange={(e) => handleUniStatusChange(item.id, e.target.value)}
                          className={`min-h-11 rounded-surface px-3 py-1.5 text-sm font-extrabold border focus:outline-none cursor-pointer ${
                            item.status === "Accepted" || item.status === "Enrolled"
                              ? "bg-emerald-100 text-emerald-900 border-emerald-300"
                              : item.status === "Submitted"
                              ? "bg-sky-100 text-sky-900 border-sky-300"
                              : "bg-slate-100 text-slate-800 border-slate-300"
                          }`}
                        >
                          {uniStatuses.map((st) => (
                            <option key={st} value={st}>
                              {t(`uniStatus.${st}`)}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div className="flex items-center gap-2">
                        <a
                          href={u.websiteUrl ?? undefined}
                          target="_blank"
                          rel="noreferrer"
                          className="flex min-h-11 min-w-11 items-center justify-center rounded-surface bg-slate-100 p-2 text-slate-500 hover:text-slate-600"
                          title={t("portal")}
                        >
                          <ExternalLink className="h-4 w-4" />
                        </a>
                        <Button variant="unstyled"
                          onClick={() => onRemoveSavedUni(item.id)}
                          className="flex min-h-11 min-w-11 items-center justify-center rounded-surface p-2 text-slate-500 transition-colors hover:bg-rose-50 hover:text-rose-600"
                          title={t("remove")}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Scholarships Tracker */}
      {activeSubTab === "scholarships" && (
        <div className="space-y-4">
          {savedScholarships.length === 0 ? (
            <div className="p-12 text-center text-slate-500 bg-white rounded-overlay border border-slate-200">
              {t.rich("emptyScholarships", { hub: (chunks) => <strong>{chunks}</strong> })}
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4">
              {savedScholarships.map((item) => {
                const s = item.scholarship;
                if (!s) return null;

                const isEditingThisNotes = editingNotesId === item.id;

                return (
                  <div
                    key={item.id}
                    className="bg-white rounded-overlay border border-slate-200 shadow-xs p-5 hover:border-indigo-300 transition-all flex flex-col md:flex-row items-start md:items-center justify-between gap-6"
                  >
                    {/* Left Info */}
                    <div className="space-y-2 flex-1">
                      <div className="flex items-center gap-2">
                        <Award className="h-5 w-5 text-amber-500" />
                        <h3 className="font-bold text-base text-slate-900">{localizeScholarshipTitle(s.title, locale)}</h3>
                        <span className="px-2 py-0.5 rounded-control text-xs font-bold bg-slate-50 text-slate-700 border border-slate-200">
                          {localizeScholarshipProvider(s.provider, locale)}
                        </span>
                      </div>

                      <div className="text-xs text-slate-600 flex flex-wrap items-center gap-3">
                        <span>💰 {t("value")}: {formatMoney(s.amountUsdValue, "USD", { suffix: "/yr" })}</span>
                        <span>💵 {t("type")}: {localizeCoverageType(s.coverageType, locale)}</span>
                        <span>📅 {t("deadline")}: {s.deadline}</span>
                      </div>

                      {/* Notes Box */}
                      <div className="bg-slate-50 p-3 rounded-surface border border-slate-100 text-xs text-slate-700 mt-2">
                        <div className="flex items-center justify-between mb-1">
                          <span className="font-bold text-slate-500 text-xs uppercase">{t("scholarshipNotes")}</span>
                          {!isEditingThisNotes && (
                            <Button variant="unstyled"
                              onClick={() => {
                                setEditingNotesId(item.id);
                                setTempNotes(item.notes || "");
                              }}
                              className="min-h-11 text-xs text-indigo-600 hover:underline flex items-center gap-1 font-semibold"
                            >
                              <Edit3 className="h-3 w-3" /> {t("editNotes")}
                            </Button>
                          )}
                        </div>

                        {isEditingThisNotes ? (
                          <div className="space-y-2">
                            <textarea
                              rows={2}
                              value={tempNotes}
                              onChange={(e) => setTempNotes(e.target.value)}
                              className="w-full p-2 border border-slate-300 rounded-control text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                            />
                            <Button variant="unstyled"
                              onClick={async () => {
                                await onUpdateSavedScholarshipStatus(item.id, item.status, tempNotes);
                                setEditingNotesId(null);
                              }}
                              className="px-3 py-1 bg-indigo-600 text-white rounded-control text-xs font-bold flex items-center gap-1"
                            >
                              <Save className="h-3 w-3" /> {t("saveNotes")}
                            </Button>
                          </div>
                        ) : (
                          <p className="italic text-slate-700">
                            {item.notes ? item.notes : t("noScholarshipNotes")}
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Right Controls */}
                    <div className="flex flex-col sm:flex-row md:flex-col items-start md:items-end gap-3 w-full md:w-auto shrink-0 border-t md:border-t-0 pt-3 md:pt-0 border-slate-100">
                      <div>
                        <label className="block text-sm font-bold text-slate-500 uppercase mb-1">{t("status")}</label>
                        <select
                          value={item.status}
                          onChange={(e) => handleScholarshipStatusChange(item.id, e.target.value)}
                          className={`min-h-11 rounded-surface px-3 py-1.5 text-sm font-extrabold border focus:outline-none cursor-pointer ${
                            item.status === "Awarded"
                              ? "bg-emerald-100 text-emerald-900 border-emerald-300"
                              : item.status === "Docs Submitted"
                              ? "bg-sky-100 text-sky-900 border-sky-300"
                              : "bg-slate-100 text-slate-800 border-slate-300"
                          }`}
                        >
                          {scholarshipStatuses.map((st) => (
                            <option key={st} value={st}>
                              {t(`scholarshipStatus.${st}`)}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div className="flex items-center gap-2">
                        <a
                          href={s.websiteUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="flex min-h-11 min-w-11 items-center justify-center rounded-surface bg-slate-100 p-2 text-slate-500 hover:text-slate-600"
                          title={t("portal")}
                        >
                          <ExternalLink className="h-4 w-4" />
                        </a>
                        <Button variant="unstyled"
                          onClick={() => onRemoveSavedScholarship(item.id)}
                          className="flex min-h-11 min-w-11 items-center justify-center rounded-surface p-2 text-slate-500 transition-colors hover:bg-rose-50 hover:text-rose-600"
                          title={t("remove")}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
