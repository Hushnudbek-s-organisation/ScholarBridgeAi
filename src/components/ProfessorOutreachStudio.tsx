"use client";

/**
 * Priority 5.2 — Professor Cold-Email Outreach Studio.
 *
 * The single highest-leverage message a research applicant sends is the first
 * email to a supervisor, and the single most common reason it is ignored is that
 * it reads like a mass mailing. This studio does two things:
 *
 *   1. BUILDS the email from eight facts the student already has (which paper
 *      they read, what they took from it, their own project and its metric), in
 *      the six-sentence structure professors actually answer: who → why you →
 *      evidence → fit → ask → close.
 *   2. GRADES any draft 0–100 with a deterministic rubric — length band, a
 *      specific subject line, a cited paper or lab, a quantified metric, a named
 *      attachment, a clear ask, correct salutation — minus penalties for
 *      "Dear Sir/Madam", "I am passionate about", "delve", "do the needful" and
 *      other mass-mail tells.
 *
 * All scoring lives in `src/lib/professorOutreach.ts`: no model call, no
 * network, and the same draft always gets the same score.
 */
import React from "react";
import { useTranslations } from "next-intl";
import {
  AlertTriangle,
  Check,
  Copy,
  GraduationCap,
  Loader2,
  Mail,
  RotateCcw,
  Send,
  X,
} from "lucide-react";
import type { StudentProfile } from "./Navbar";
import { AppNote } from "@/components/AppNote";
import {
  buildColdEmail,
  gradeColdEmail,
  COLD_EMAIL_LENGTH_HINT,
  type ColdEmailGrade,
  type OutreachInput,
} from "@/lib/professorOutreach";

const BAND_TONE: Record<ColdEmailGrade["band"], string> = {
  strong: "border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-100",
  solid: "border-sky-200 bg-sky-50 text-sky-800 dark:border-sky-500/30 dark:bg-sky-500/10 dark:text-sky-100",
  needs_work: "border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-100",
  weak: "border-rose-200 bg-rose-50 text-rose-800 dark:border-rose-500/30 dark:bg-rose-500/10 dark:text-rose-100",
};

/** The eight facts the generator needs. Labels come from the ICU catalogue. */
const FACT_FIELDS = [
  "professorName",
  "universityName",
  "labName",
  "paperTitle",
  "paperInsight",
  "projectTitle",
  "projectMetric",
  "methods",
] as const;

type FactField = (typeof FACT_FIELDS)[number];

const ATTACHMENT_OPTIONS = ["CV", "Transcript", "Portfolio", "Code repository", "Research statement"] as const;

export interface ProfessorOutreachStudioProps {
  profile: StudentProfile | null;
  /** Pre-filled target, when the student arrives from a specific university. */
  defaultUniversityName?: string | null;
  className?: string;
}

export function ProfessorOutreachStudio({ profile, defaultUniversityName, className = "" }: ProfessorOutreachStudioProps) {
  const t = useTranslations("outreach");

  const [facts, setFacts] = React.useState<Record<FactField, string>>({
    professorName: "",
    universityName: defaultUniversityName?.trim() ?? "",
    labName: "",
    paperTitle: "",
    paperInsight: "",
    projectTitle: "",
    projectMetric: "",
    methods: "",
  });
  const [targetLevel, setTargetLevel] = React.useState("");
  const [targetIntake, setTargetIntake] = React.useState("");
  const [attachments, setAttachments] = React.useState<string[]>(["CV"]);
  const [subject, setSubject] = React.useState("");
  const [body, setBody] = React.useState("");
  const [building, setBuilding] = React.useState(false);
  const [copied, setCopied] = React.useState<"subject" | "body" | "all" | null>(null);

  const setFact = (field: FactField, value: string) => setFacts((prev) => ({ ...prev, [field]: value }));

  const toggleAttachment = (option: string) =>
    setAttachments((prev) => (prev.includes(option) ? prev.filter((item) => item !== option) : [...prev, option]));

  /* ---- the graded draft -------------------------------------------------- */
  const grade = React.useMemo<ColdEmailGrade | null>(
    () => (body.trim() || subject.trim() ? gradeColdEmail(subject, body) : null),
    [subject, body]
  );

  const input: OutreachInput = React.useMemo(
    () => ({
      studentName: profile?.name ?? null,
      targetLevel: targetLevel.trim() || profile?.degreeLevel || null,
      targetIntake: targetIntake.trim() || null,
      fieldOfStudy: profile?.targetMajor ?? null,
      professorName: facts.professorName.trim() || null,
      universityName: facts.universityName.trim() || null,
      labName: facts.labName.trim() || null,
      paperTitle: facts.paperTitle.trim() || null,
      paperInsight: facts.paperInsight.trim() || null,
      projectTitle: facts.projectTitle.trim() || null,
      projectMetric: facts.projectMetric.trim() || null,
      methods: facts.methods.trim() || null,
      gpa: profile?.gpa ?? null,
      gpaScale: profile?.gpaScale ?? null,
      ielts: profile?.ieltsScore ?? null,
      publications: profile?.researchPublications ?? null,
      attachments,
    }),
    [profile, facts, targetLevel, targetIntake, attachments]
  );

  /** Fill the editor from the facts. Deterministic — no network, no model. */
  const build = () => {
    setBuilding(true);
    // One frame of busy state so the click feels acknowledged; the work itself is
    // synchronous and instant.
    window.setTimeout(() => {
      const built = buildColdEmail(input);
      setSubject(built.subject);
      setBody(built.body);
      setBuilding(false);
    }, 0);
  };

  const reset = () => {
    setSubject("");
    setBody("");
    setCopied(null);
  };

  const copy = async (which: "subject" | "body" | "all") => {
    const value = which === "subject" ? subject : which === "body" ? body : `${subject}\n\n${body}`;
    if (!value.trim()) return;
    try {
      await navigator.clipboard.writeText(value);
      setCopied(which);
      window.setTimeout(() => setCopied(null), 2000);
    } catch {
      setCopied(null);
    }
  };

  const missingFacts = FACT_FIELDS.filter((field) => !facts[field].trim());

  return (
    <section className={`rounded-2xl border border-slate-200 bg-white p-4 sm:p-5 ${className}`} aria-labelledby="outreach-title">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 id="outreach-title" className="flex items-center gap-2 text-sm font-extrabold text-slate-900">
            <Send className="h-4 w-4 text-indigo-600" aria-hidden />
            {t("title")}
          </h3>
          <p className="mt-1 max-w-2xl break-words text-[11px] leading-relaxed text-slate-500">{t("subtitle")}</p>
        </div>
        {grade && (
          <div className={`flex shrink-0 items-center gap-2 rounded-xl border px-3 py-1.5 ${BAND_TONE[grade.band]}`}>
            <span className="text-lg font-extrabold leading-none">{grade.score}</span>
            <span className="text-[10px] font-bold uppercase tracking-wide">
              {t(`bands.${grade.band}`)}
              <span className="block font-semibold normal-case opacity-80">
                {t("wordCount", { words: grade.wordCount })}
              </span>
            </span>
          </div>
        )}
      </div>

      <div className="mt-3 grid grid-cols-1 gap-4 lg:grid-cols-2">
        {/* ---------------- facts ---------------- */}
        <div className="space-y-2">
          <p className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wide text-slate-500">
            <GraduationCap className="h-3.5 w-3.5" aria-hidden />
            {t("factsTitle")}
          </p>

          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            {FACT_FIELDS.map((field) => (
              <label key={field} className="block text-[11px] font-semibold text-slate-600">
                {t(`fields.${field}`)}
                <input
                  value={facts[field]}
                  onChange={(event) => setFact(field, event.target.value)}
                  placeholder={t(`fields.${field}Placeholder`)}
                  className="sb-field mt-1 min-h-11 w-full rounded-xl border px-3 py-2 text-xs text-slate-800"
                />
              </label>
            ))}
            <label className="block text-[11px] font-semibold text-slate-600">
              {t("fields.targetLevel")}
              <input
                value={targetLevel}
                onChange={(event) => setTargetLevel(event.target.value)}
                placeholder={profile?.degreeLevel ?? t("fields.targetLevelPlaceholder")}
                className="sb-field mt-1 min-h-11 w-full rounded-xl border px-3 py-2 text-xs text-slate-800"
              />
            </label>
            <label className="block text-[11px] font-semibold text-slate-600">
              {t("fields.targetIntake")}
              <input
                value={targetIntake}
                onChange={(event) => setTargetIntake(event.target.value)}
                placeholder={t("fields.targetIntakePlaceholder")}
                className="sb-field mt-1 min-h-11 w-full rounded-xl border px-3 py-2 text-xs text-slate-800"
              />
            </label>
          </div>

          <fieldset className="rounded-xl border border-slate-200 p-2.5">
            <legend className="px-1 text-[11px] font-bold text-slate-600">{t("attachmentsTitle")}</legend>
            <div className="flex flex-wrap gap-1.5">
              {ATTACHMENT_OPTIONS.map((option) => {
                const on = attachments.includes(option);
                return (
                  <button
                    key={option}
                    type="button"
                    onClick={() => toggleAttachment(option)}
                    aria-pressed={on}
                    className={`flex min-h-11 items-center gap-1 rounded-full border px-2.5 py-1 text-[11px] font-bold transition-colors ${
                      on
                        ? "border-indigo-300 bg-indigo-50 text-indigo-800 dark:border-indigo-500/40 dark:bg-indigo-500/15 dark:text-indigo-100"
                        : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                    }`}
                  >
                    {on ? <Check className="h-3 w-3" aria-hidden /> : null}
                    {option}
                  </button>
                );
              })}
            </div>
          </fieldset>

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={build}
              disabled={building}
              className="flex min-h-11 items-center gap-1.5 rounded-xl bg-indigo-600 px-3.5 py-2 text-xs font-bold text-white shadow-xs transition-colors hover:bg-indigo-700 disabled:opacity-60"
            >
              {building ? <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden /> : <Mail className="h-3.5 w-3.5" aria-hidden />}
              {t("buildButton")}
            </button>
            {(subject || body) && (
              <button
                type="button"
                onClick={reset}
                className="flex min-h-11 items-center gap-1.5 rounded-xl border border-slate-200 px-3 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50"
              >
                <RotateCcw className="h-3.5 w-3.5" aria-hidden />
                {t("resetButton")}
              </button>
            )}
          </div>

          {missingFacts.length > 0 && (
            <p className="break-words rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-[11px] font-semibold leading-relaxed text-amber-800 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-100">
              {t("missingFacts", { count: missingFacts.length })}{" "}
              {missingFacts.map((field) => t(`fields.${field}`)).join(" · ")}
            </p>
          )}
          <p className="break-words text-[10px] leading-relaxed text-slate-500">
            {t("profileFacts", {
              name: profile?.name?.trim() || t("unknownFact"),
              level: profile?.degreeLevel?.trim() || t("unknownFact"),
              major: profile?.targetMajor?.trim() || t("unknownFact"),
            })}
          </p>
        </div>

        {/* ---------------- editor + grade ---------------- */}
        <div className="space-y-2">
          <label className="block text-[11px] font-semibold text-slate-600">
            {t("subjectLabel")}
            <input
              value={subject}
              onChange={(event) => setSubject(event.target.value)}
              placeholder={t("subjectPlaceholder")}
              className="sb-field mt-1 min-h-11 w-full rounded-xl border px-3 py-2 text-xs font-semibold text-slate-800"
            />
          </label>

          <label className="block text-[11px] font-semibold text-slate-600">
            {t("bodyLabel", {
              min: COLD_EMAIL_LENGTH_HINT.targetMin,
              max: COLD_EMAIL_LENGTH_HINT.targetMax,
            })}
            <textarea
              value={body}
              onChange={(event) => setBody(event.target.value)}
              placeholder={t("bodyPlaceholder")}
              rows={14}
              className="sb-field mt-1 w-full rounded-xl border p-3 text-xs leading-relaxed text-slate-800"
            />
          </label>

          <div className="flex flex-wrap gap-1.5">
            <button
              type="button"
              onClick={() => void copy("all")}
              disabled={!subject.trim() && !body.trim()}
              className="flex min-h-11 items-center gap-1 rounded-xl bg-slate-900 px-3 py-2 text-[11px] font-bold text-white hover:bg-slate-800 disabled:opacity-50"
            >
              {copied === "all" ? <Check className="h-3 w-3" aria-hidden /> : <Copy className="h-3 w-3" aria-hidden />}
              {t("copyAll")}
            </button>
            <button
              type="button"
              onClick={() => void copy("subject")}
              disabled={!subject.trim()}
              className="flex min-h-11 items-center gap-1 rounded-xl border border-slate-200 px-3 py-2 text-[11px] font-bold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
            >
              {copied === "subject" ? <Check className="h-3 w-3 text-emerald-600" aria-hidden /> : <Copy className="h-3 w-3" aria-hidden />}
              {t("copySubject")}
            </button>
            <button
              type="button"
              onClick={() => void copy("body")}
              disabled={!body.trim()}
              className="flex min-h-11 items-center gap-1 rounded-xl border border-slate-200 px-3 py-2 text-[11px] font-bold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
            >
              {copied === "body" ? <Check className="h-3 w-3 text-emerald-600" aria-hidden /> : <Copy className="h-3 w-3" aria-hidden />}
              {t("copyBody")}
            </button>
            {subject.trim() && (
              <button
                type="button"
                // Open the student's own mail client with the draft ready. The
                // platform never stores a professor's address, so the recipient
                // field stays empty for the student to fill in.
                onClick={() => {
                  window.location.href = `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
                }}
                title={t("openInMailHint")}
                className="flex min-h-11 items-center gap-1 rounded-xl border border-indigo-200 bg-indigo-50 px-3 py-2 text-[11px] font-bold text-indigo-800 hover:bg-indigo-100 dark:border-indigo-500/30 dark:bg-indigo-500/10 dark:text-indigo-100"
              >
                <Send className="h-3 w-3" aria-hidden />
                {t("openInMail")}
              </button>
            )}
          </div>

          {grade && (
            <div className="rounded-xl border border-slate-200 p-3">
              <p className="text-[11px] font-bold uppercase tracking-wide text-slate-500">{t("rubricTitle")}</p>

              <ul className="mt-2 space-y-1.5">
                {grade.checks.map((check) => (
                  <li key={check.id} className="flex items-start gap-2 text-[11px] leading-relaxed">
                    {check.passed ? (
                      <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-600" aria-hidden />
                    ) : (
                      <X className="mt-0.5 h-3.5 w-3.5 shrink-0 text-rose-500" aria-hidden />
                    )}
                    <span className={`min-w-0 break-words ${check.passed ? "text-slate-700" : "font-semibold text-slate-800"}`}>
                      {t(`checks.${check.id}`)}
                      <span className="ml-1 font-bold text-slate-500">
                        {check.earned}/{check.weight}
                      </span>
                      {!check.passed && check.detail.wordCount != null && (
                        <span className="ml-1 text-slate-500">
                          {t("checks.lengthDetail", {
                            words: check.detail.wordCount,
                            min: COLD_EMAIL_LENGTH_HINT.targetMin,
                            max: COLD_EMAIL_LENGTH_HINT.targetMax,
                          })}
                        </span>
                      )}
                      {!check.passed && check.detail.longestParagraph != null && (
                        <span className="ml-1 text-slate-500">
                          {t("checks.paragraphDetail", { words: check.detail.longestParagraph, max: 90 })}
                        </span>
                      )}
                    </span>
                  </li>
                ))}
              </ul>

              {grade.penalties.length > 0 && (
                <div className="mt-2 rounded-lg border border-rose-200 bg-rose-50 p-2.5 dark:border-rose-500/30 dark:bg-rose-500/10">
                  <p className="flex items-center gap-1.5 text-[11px] font-extrabold text-rose-800 dark:text-rose-100">
                    <AlertTriangle className="h-3.5 w-3.5" aria-hidden />
                    {t("penaltiesTitle", { count: grade.penalties.length })}
                  </p>
                  <ul className="mt-1 space-y-1">
                    {grade.penalties.map((penalty) => (
                      <li key={`${penalty.id}-${penalty.matched}`} className="break-words text-[11px] leading-relaxed text-rose-800 dark:text-rose-100">
                        <b>{t(`penalties.${penalty.id}`)}</b> −{penalty.points}
                        <span className="ml-1 text-rose-700/90 dark:text-rose-200/90">“{penalty.matched}”</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {grade.toFix.length > 0 ? (
                <p className="mt-2 break-words text-[11px] font-semibold leading-relaxed text-slate-700">
                  {t("fixFirst", { item: t(`checks.${grade.toFix[0]}`) })}
                </p>
              ) : (
                <p className="mt-2 break-words text-[11px] font-semibold leading-relaxed text-emerald-700 dark:text-emerald-200">
                  {t("allChecksPassed")}
                </p>
              )}
            </div>
          )}
        </div>
      </div>

      <AppNote kind="general" className="mt-3 border-t border-slate-100 pt-3" />
    </section>
  );
}

export default ProfessorOutreachStudio;
