"use client";

import React, { useMemo, useState } from "react";
import { Loader2, Save, Sparkles } from "lucide-react";
import { StudentProfile } from "./Navbar";

/**
 * Complete Student Profile (#1).
 *
 * One place for everything the chancing engine, the AI advisor and the
 * scholarship matcher need: Academic, Personal, Financial, Extracurriculars,
 * Achievements and Goals. Empty means empty — the app never invents scores.
 *
 * List fields are typed comma-separated and stored as JSON arrays.
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

const SECTIONS = [
  {
    id: "academic",
    title: "Academic",
    fields: [
      { key: "gpa", label: "GPA", type: "number", step: "0.01" },
      { key: "gpaScale", label: "GPA scale", type: "number", step: "0.1" },
      { key: "satScore", label: "SAT", type: "number" },
      { key: "actScore", label: "ACT", type: "number" },
      { key: "ieltsScore", label: "IELTS", type: "number", step: "0.5" },
      { key: "toeflScore", label: "TOEFL", type: "number" },
      { key: "duolingoScore", label: "Duolingo", type: "number" },
      { key: "apCourses", label: "AP courses", type: "list", placeholder: "Calculus AB, Physics C" },
      { key: "ibCourses", label: "IB courses", type: "list", placeholder: "Math HL, English HL" },
      { key: "aLevelSubjects", label: "A-Level subjects", type: "list", placeholder: "Maths, Physics" },
    ],
  },
  {
    id: "personal",
    title: "Personal",
    fields: [
      { key: "country", label: "Country", type: "text", placeholder: "Uzbekistan" },
      { key: "age", label: "Age", type: "number" },
      { key: "graduationYear", label: "Graduation year", type: "number", placeholder: "2027" },
      { key: "degreeLevel", label: "Intended degree", type: "select", options: ["Bachelor", "Master", "PhD", "Diploma"] },
      { key: "targetMajor", label: "Intended major", type: "text", placeholder: "Computer Science" },
    ],
  },
  {
    id: "financial",
    title: "Financial",
    fields: [
      { key: "budgetAnnualUsd", label: "Maximum yearly budget (USD)", type: "number" },
      { key: "familyIncomeUsd", label: "Family income (USD/year)", type: "number" },
      { key: "needsFinancialAid", label: "Need financial aid?", type: "bool" },
      { key: "requiresFullScholarship", label: "Require a full scholarship?", type: "bool" },
    ],
  },
  {
    id: "activities",
    title: "Extracurriculars",
    fields: [
      { key: "leadership", label: "Leadership", type: "list", placeholder: "Student Council VP, Club President" },
      { key: "volunteering", label: "Volunteering", type: "list", placeholder: "Red Crescent volunteer" },
      { key: "sports", label: "Sports", type: "list", placeholder: "Football team captain" },
      { key: "clubs", label: "Clubs", type: "list", placeholder: "Debate club, Robotics" },
      { key: "researchExperience", label: "Research", type: "list", placeholder: "NLP research assistant" },
      { key: "projects", label: "Projects", type: "list", placeholder: "Open-source contributor" },
      { key: "workExperienceYears", label: "Work experience (years)", type: "number" },
    ],
  },
  {
    id: "achievements",
    title: "Achievements",
    fields: [
      { key: "olympiads", label: "Olympiads", type: "list", placeholder: "National Math Olympiad — 2nd place" },
      { key: "awards", label: "Awards", type: "list", placeholder: "President's scholarship" },
      { key: "competitions", label: "Competitions", type: "list", placeholder: "ACM ICPC regional" },
      { key: "certificates", label: "Certificates", type: "list", placeholder: "AWS Certified, Google UX" },
    ],
  },
  {
    id: "goals",
    title: "Goals",
    fields: [
      { key: "preferredCountries", label: "Target countries", type: "list", placeholder: "Germany, USA, Canada" },
      { key: "targetUniversities", label: "Target universities", type: "list", placeholder: "TUM, Purdue" },
      { key: "careerGoal", label: "Career goal", type: "textarea", placeholder: "ML engineer working on healthcare AI" },
    ],
  },
] as const;

type FieldDef = { key: string; label: string; type: string; step?: string; placeholder?: string; options?: readonly string[] };

interface CompleteProfileFormProps {
  activeProfile: StudentProfile;
  onSaved: (updated: StudentProfile) => void;
}

export function CompleteProfileForm({ activeProfile, onSaved }: CompleteProfileFormProps) {
  const initial = useMemo(() => {
    const record: Record<string, string> = {};
    for (const section of SECTIONS) {
      for (const field of section.fields as readonly FieldDef[]) {
        const value = (activeProfile as unknown as Record<string, unknown>)[field.key];
        if (field.type === "list") record[field.key] = toList(value as string | null);
        else if (field.type === "bool") record[field.key] = value ? "true" : "false";
        else record[field.key] = value == null ? "" : String(value);
      }
    }
    return record;
  }, [activeProfile]);

  const [form, setForm] = useState<Record<string, string>>(initial);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [openSection, setOpenSection] = useState<string>("academic");

  const completeness = useMemo(() => {
    const keys = SECTIONS.flatMap((s) => (s.fields as readonly FieldDef[]).map((f) => f.key));
    const filled = keys.filter((k) => {
      const v = form[k];
      return v !== undefined && v !== "" && v !== "false";
    }).length;
    return Math.round((filled / keys.length) * 100);
  }, [form]);

  const save = async () => {
    setBusy(true);
    setMessage("");
    try {
      const payload: Record<string, unknown> = {};
      for (const section of SECTIONS) {
        for (const field of section.fields as readonly FieldDef[]) {
          const raw = form[field.key] ?? "";
          if (field.type === "bool") payload[field.key] = raw === "true";
          else if (field.type === "list") {
            payload[field.key] = raw
              .split(",")
              .map((s) => s.trim())
              .filter(Boolean);
          } else if (field.type === "number") payload[field.key] = raw === "" ? null : Number(raw);
          else payload[field.key] = raw.trim();
        }
      }

      const res = await fetch(`/api/profiles/${activeProfile.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok || !data.profile) throw new Error(data.error || "Could not save profile");
      onSaved(data.profile as StudentProfile);
      setMessage("Profile saved.");
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Could not save profile");
    } finally {
      setBusy(false);
    }
  };

  const inputClass =
    "w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-800 focus:border-indigo-400 focus:outline-none";

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-slate-200 bg-white p-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="flex items-center gap-2 text-lg font-bold text-slate-900">
              <Sparkles className="h-5 w-5 text-indigo-600" />
              Complete your profile
            </h2>
            <p className="text-xs text-slate-500">
              Every field you fill makes the admission estimates and AI advice more accurate.
            </p>
          </div>
          <div className="text-right">
            <div className="text-2xl font-extrabold text-indigo-700">{completeness}%</div>
            <div className="text-[10px] font-bold uppercase tracking-wide text-slate-400">complete</div>
          </div>
        </div>
        <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-slate-100">
          <div className="h-full rounded-full bg-indigo-500" style={{ width: `${completeness}%` }} />
        </div>
      </div>

      {SECTIONS.map((section) => {
        const open = openSection === section.id;
        return (
          <div key={section.id} className="rounded-2xl border border-slate-200 bg-white">
            <button
              onClick={() => setOpenSection(open ? "" : section.id)}
              className="flex w-full items-center justify-between px-4 py-3 text-left"
            >
              <span className="font-bold text-slate-900">{section.title}</span>
              <span className="text-xs font-semibold text-indigo-600">{open ? "Close" : "Edit"}</span>
            </button>
            {open && (
              <div className="grid gap-3 border-t border-slate-100 p-4 sm:grid-cols-2">
                {(section.fields as readonly FieldDef[]).map((field) => (
                  <label key={field.key} className="block text-xs font-semibold text-slate-600">
                    {field.label}
                    {field.type === "textarea" ? (
                      <textarea
                        className={`${inputClass} mt-1 min-h-[70px]`}
                        value={form[field.key] ?? ""}
                        placeholder={field.placeholder}
                        onChange={(e) => setForm((prev) => ({ ...prev, [field.key]: e.target.value }))}
                      />
                    ) : field.type === "select" ? (
                      <select
                        className={`${inputClass} mt-1`}
                        value={form[field.key] ?? ""}
                        onChange={(e) => setForm((prev) => ({ ...prev, [field.key]: e.target.value }))}
                      >
                        {(field.options ?? []).map((option) => (
                          <option key={option} value={option}>
                            {option}
                          </option>
                        ))}
                      </select>
                    ) : field.type === "bool" ? (
                      <select
                        className={`${inputClass} mt-1`}
                        value={form[field.key] ?? "false"}
                        onChange={(e) => setForm((prev) => ({ ...prev, [field.key]: e.target.value }))}
                      >
                        <option value="false">No</option>
                        <option value="true">Yes</option>
                      </select>
                    ) : (
                      <input
                        className={`${inputClass} mt-1`}
                        type={field.type === "list" ? "text" : field.type}
                        step={field.step}
                        value={form[field.key] ?? ""}
                        placeholder={field.placeholder}
                        onChange={(e) => setForm((prev) => ({ ...prev, [field.key]: e.target.value }))}
                      />
                    )}
                  </label>
                ))}
              </div>
            )}
          </div>
        );
      })}

      <div className="flex items-center gap-3">
        <button
          onClick={() => void save()}
          disabled={busy}
          className="flex items-center gap-2 rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-bold text-white hover:bg-indigo-700 disabled:opacity-60"
        >
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          Save profile
        </button>
        {message && <span className="text-sm text-slate-600">{message}</span>}
      </div>
    </div>
  );
}
