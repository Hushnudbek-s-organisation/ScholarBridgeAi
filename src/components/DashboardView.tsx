"use client";

import React, { useState, useEffect } from "react";
import { clickableCardProps } from "@/lib/a11y";
import { useTranslations } from "next-intl";
import { StudentProfile } from "./Navbar";
import { DegreeLevelLabel } from "./DegreeLevelLabel";
import { formatDegreeLevel } from "@/lib/degreeLevels";
import { AiFormattedText } from "./AiFormattedText";
import { 
  Sparkles, 
  Search, 
  Award, 
  GraduationCap, 
  FileText, 
  CheckCircle2, 
  AlertCircle, 
  TrendingUp, 
  Compass, 
  Bot, 
  ArrowRight,
  ShieldCheck,
  Zap,
  BookOpen
} from "lucide-react";
import { AppNote } from "@/components/AppNote";
import { Button } from "@/components/ui/Button";
import { ActionBar } from "@/components/ui/ActionBar";
import { StatusPill } from "@/components/ui/StatusPill";

interface DashboardViewProps {
  profile: StudentProfile | null;
  onNavigateTab: (tab: string) => void;
  savedUniCount: number;
  savedScholarshipCount: number;
  savedProgramCount: number;
  taskCount: number;
  onEditProfile: () => void;
}

export function DashboardView({
  profile,
  onNavigateTab,
  savedUniCount,
  savedScholarshipCount,
  savedProgramCount,
  taskCount,
  onEditProfile,
}: DashboardViewProps) {
  const t = useTranslations("dashboard");
  const tDegrees = useTranslations("degrees");
  const [aiEvaluation, setAiEvaluation] = useState<string | null>(null);
  const [isEvaluating, setIsEvaluating] = useState(false);
  // Real scholarship match count (fetched, never a hardcoded claim).
  const [scholarshipMatchCount, setScholarshipMatchCount] = useState<number | null>(null);
  // Profile information coverage from the shared summary endpoint; it is not
  // an admissions score or an applicant-quality tier.
  const [strength, setStrength] = useState<{ overall: number } | null>(null);

  // Count how many scholarships actually match this profile (matchScore >= 60).
  useEffect(() => {
    if (!profile?.id) return;
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`/api/scholarships?profileId=${profile.id}&summary=match-count`);
        const data = await res.json();
        if (!cancelled && res.ok && Number.isInteger(data.matchCount)) {
          setScholarshipMatchCount(data.matchCount);
        }
      } catch {
        // keep null — the UI shows a neutral message instead of a number
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [profile?.id]);

  useEffect(() => {
    if (!profile?.id) return;
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`/api/profile-strength?profileId=${profile.id}`);
        const data = await res.json();
        if (!cancelled && res.ok && data?.strength) {
          setStrength({ overall: Number(data.strength.overall) || 0 });
        }
      } catch {
        // keep null — the card shows a neutral dash instead of a made-up score
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [profile?.id]);

  if (!profile) {
    return (
      <div className="p-8 text-center bg-white rounded-overlay border border-slate-200 shadow-sm">
        <p className="text-slate-600 font-medium">{t("noProfileSelected")}</p>
      </div>
    );
  }

  const runAiAudit = async () => {
    setIsEvaluating(true);
    try {
      const res = await fetch("/api/ai/evaluate-profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ profileId: profile.id }),
      });
      const data = await res.json();
      if (data.evaluation) {
        setAiEvaluation(data.evaluation);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsEvaluating(false);
    }
  };

  // No invented fallback list: "not chosen yet" is stated, not filled in.
  let preferredCountriesList: string[] = [];
  try {
    if (typeof profile.preferredCountries === "string") {
      preferredCountriesList = JSON.parse(profile.preferredCountries);
    } else if (Array.isArray(profile.preferredCountries)) {
      preferredCountriesList = profile.preferredCountries;
    }
  } catch {
    // fallback
  }

  // "IELTS 7.5" / "TOEFL 95" / "Duolingo 120" / an honest "no English test yet".
  const englishTestLine = (() => {
    if (typeof profile.ieltsScore === "number" && profile.ieltsScore > 0) return `IELTS ${profile.ieltsScore}`;
    if (typeof profile.toeflScore === "number" && profile.toeflScore > 0) return `TOEFL ${profile.toeflScore}`;
    if (typeof profile.duolingoScore === "number" && profile.duolingoScore > 0) return `Duolingo ${profile.duolingoScore}`;
    return t("noEnglishTest");
  })();

  return (
    <div className="space-y-6">
      {/* Top Banner / Hero */}
      <div className="relative overflow-hidden rounded-overlay sb-brand-hero text-white p-6 sm:p-8 shadow-xl">
        <div className="absolute top-0 right-0 -mt-8 -mr-8 w-64 h-64 bg-indigo-500/20 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 grid grid-cols-1 lg:grid-cols-3 gap-6 items-center">
          <div className="lg:col-span-2 space-y-4">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 text-indigo-200 border border-white/10 text-xs font-semibold backdrop-blur-md">
              <Sparkles className="h-3.5 w-3.5 text-amber-300" />
              {t("activeApplicant", { name: profile.name })}
            </div>
            
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
              {t("heroTitle")}
            </h1>
            
            <p className="text-sm text-slate-300 max-w-xl leading-relaxed">
              {t.rich("heroBody", {
                // Every slot states what the profile actually holds. A field the
                // student has not filled in reads "not provided" — the old
                // version printed the DB default (3.5 / Computer Science /
                // $25 000) as if the student had entered it.
                b: (chunks) => <strong className="font-bold text-white">{chunks}</strong>,
                gpa: profile.gpa ?? t("valueNotProvided"),
                scale: profile.gpaScale ?? t("valueNotProvided"),
                test: englishTestLine,
                degree: profile.degreeLevel
                  ? formatDegreeLevel(profile.degreeLevel, tDegrees)
                  : t("valueNotProvided"),
                major: profile.targetMajor || t("valueNotProvided"),
                countries: preferredCountriesList.length
                  ? preferredCountriesList.slice(0, 3).join(", ")
                  : t("countriesNotChosen"),
              })}
            </p>

            {/* Quick Metrics Badges */}
            <div className="flex flex-wrap gap-2 pt-2">
              <span className="px-3 py-1 bg-white/10 rounded-control text-xs font-medium border border-white/10">
                🎓 {t("levelBadge")}: <strong className="text-white"><DegreeLevelLabel value={profile.degreeLevel} /></strong>
              </span>
              <span className="px-3 py-1 bg-white/10 rounded-control text-xs font-medium border border-white/10">
                💰 {t("budgetBadge")}: <strong className="text-emerald-300">${profile.budgetAnnualUsd?.toLocaleString()}{t("perYear")}</strong>
              </span>
              <span className="px-3 py-1 bg-white/10 rounded-control text-xs font-medium border border-white/10">
                🏆 {t("pubsBadge")}: <strong className="text-amber-300">{profile.researchPublications || 0} {t("pubsUnit")} • {profile.workExperienceYears || 0} {t("yrsUnit")}</strong>
              </span>
            </div>
          </div>

          {/* Readiness Score Card */}
          <div className="bg-white/10 backdrop-blur-md rounded-overlay p-6 border border-white/15 text-center flex flex-col items-center justify-center space-y-3">
            <div className="text-xs font-semibold tracking-wider text-indigo-200 uppercase">
              {t("readinessLabel")}
            </div>

            <div className="relative flex items-center justify-center">
              <div className="h-24 w-24 rounded-full border-4 border-indigo-400/30 flex items-center justify-center bg-indigo-900/40 shadow-inner">
                <span className="text-3xl font-extrabold text-indigo-200">
                  {strength == null ? "—" : strength.overall}
                </span>
                {strength != null && <span className="text-xs text-slate-300 font-semibold">%</span>}
              </div>
            </div>

            <div className="text-xs text-indigo-100 font-medium">
              {strength == null ? t("strengthUnavailable") : t("strengthCompleteness", { percent: strength.overall })}
            </div>

            <p className="text-sm leading-snug text-indigo-200/80">{t("readinessNote")}</p>

            <Button variant="unstyled"
              onClick={runAiAudit}
              disabled={isEvaluating}
              className="w-full py-2.5 px-4 bg-indigo-600 text-white hover:bg-indigo-700 font-bold rounded-surface text-xs flex items-center justify-center gap-2 shadow-lg transition-all"
            >
              <Bot className="h-4 w-4" />
              {isEvaluating ? t("analyzing") : t("runAudit")}
            </Button>
          </div>
        </div>
      </div>

      {/* §4 — ONE "Keyingi qadam", the nearby blocker/deadline, and a plain
          statement of where the student is. This is deliberately NOT another
          progress bar: readiness %, application stage, document readiness and
          fit are different measures and never share one identical bar. */}
      <section className="sb-glass rounded-overlay border border-slate-200 p-4 sm:p-5 dark:border-slate-700"
               aria-labelledby="sb-next-step-title">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-wide text-indigo-600 dark:text-indigo-300">
              {t("whereAmI")}
            </p>
            <h2 id="sb-next-step-title" className="mt-1 text-base font-bold text-slate-900 dark:text-white">
              {t("nextStepTitle")}
            </h2>
            <p className="mt-1 max-w-prose text-sm leading-relaxed text-slate-600 dark:text-slate-300">
              {taskCount > 0 ? t("nextStepResume", { n: taskCount }) : t("nextStepStart")}
            </p>
          </div>
          <StatusPill
            tone={taskCount > 0 ? "warning" : "info"}
            label={taskCount > 0 ? t("blockerOpenTasks", { n: taskCount }) : t("blockerNone")}
          />
        </div>
        <div className="mt-4">
          <ActionBar
            label={t("nextStepTitle")}
            primary={{
              id: "resume", label: taskCount > 0 ? t("actionResume") : t("actionExplore"),
              onClick: () => onNavigateTab(taskCount > 0 ? "tasks" : "explorer"),
              icon: <ArrowRight className="h-4 w-4" aria-hidden="true" />,
            }}
            secondary={[
              { id: "profile", label: t("actionProfile"), onClick: onEditProfile },
              { id: "tracker", label: t("actionTracker"), onClick: () => onNavigateTab("tracker") },
              { id: "scholarships", label: t("actionGrants"), onClick: () => onNavigateTab("scholarships") },
            ]}
          />
        </div>
        <p className="mt-3 text-xs text-slate-500 dark:text-slate-400">
          {t("stageNotCompleted")}
        </p>
      </section>

      {/* Stats Bar */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div 
          onClick={() => onNavigateTab("tracker")}
          {...clickableCardProps(() => onNavigateTab("tracker"))}
          className="bg-white rounded-overlay p-4 border border-slate-200 shadow-xs hover:border-indigo-300 hover:shadow-md transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-semibold">{t("statShortlisted")}</span>
            <div className="p-2 bg-indigo-50 text-indigo-600 rounded-surface group-hover:bg-indigo-600 group-hover:text-white transition-colors">
              <GraduationCap className="h-4 w-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-slate-900">{savedUniCount}</div>
          <p className="text-sm text-slate-500 mt-1">
            {t("statShortlistedSub")}
            {savedProgramCount > 0 && (
              <span className="text-indigo-600 font-semibold"> · {t("statShortlistedPrograms", { n: savedProgramCount })}</span>
            )}
          </p>
        </div>

        <div 
          onClick={() => onNavigateTab("scholarships")}
          {...clickableCardProps(() => onNavigateTab("scholarships"))}
          className="bg-white rounded-overlay p-4 border border-slate-200 shadow-xs hover:border-emerald-300 hover:shadow-md transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-semibold">{t("statScholarships")}</span>
            <div className="p-2 bg-emerald-50 text-emerald-600 rounded-surface group-hover:bg-emerald-800 group-hover:text-white transition-colors">
              <Award className="h-4 w-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-slate-900">{savedScholarshipCount}</div>
          <p className="text-sm text-slate-500 mt-1">{t("statScholarshipsSub")}</p>
        </div>

        <div 
          onClick={() => onNavigateTab("tasks")}
          {...clickableCardProps(() => onNavigateTab("tasks"))}
          className="bg-white rounded-overlay p-4 border border-slate-200 shadow-xs hover:border-indigo-300 hover:shadow-md transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-semibold">{t("statMilestones")}</span>
            <div className="p-2 bg-indigo-50 text-indigo-600 rounded-surface group-hover:bg-indigo-700 group-hover:text-white transition-colors">
              <CheckCircle2 className="h-4 w-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-slate-900">{taskCount}</div>
          <p className="text-sm text-slate-500 mt-1">{t("statMilestonesSub")}</p>
        </div>

        <div 
          onClick={() => onNavigateTab("sop")}
          {...clickableCardProps(() => onNavigateTab("sop"))}
          className="bg-white rounded-overlay p-4 border border-slate-200 shadow-xs hover:border-violet-300 hover:shadow-md transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-semibold">{t("statSop")}</span>
            <div className="p-2 bg-violet-50 text-violet-600 rounded-surface group-hover:bg-violet-600 group-hover:text-white transition-colors">
              <FileText className="h-4 w-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-slate-900">{t("statSopReady")}</div>
          <p className="text-sm text-slate-500 mt-1">{t("statSopSub")}</p>
        </div>
      </div>

      {/* AI Evaluation Report Output Modal/Card */}
      {aiEvaluation && (
        <div className="bg-white rounded-overlay p-6 border-2 border-indigo-200 shadow-lg space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div className="flex items-center gap-2 text-indigo-700 font-bold text-lg">
              <Bot className="h-5 w-5" />
              {t("aiReportTitle")}
            </div>
            <Button variant="unstyled"
              onClick={() => setAiEvaluation(null)}
              className="text-xs text-slate-500 hover:text-slate-600 font-semibold"
            >
              {t("closeReport")}
            </Button>
          </div>

          <AiFormattedText text={aiEvaluation} className="text-xs sm:text-sm text-slate-700" />
        </div>
      )}

      {/* Main Grid: Recommended Actions & Strategy */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Strategic Breakdown & Recommended Programs */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white rounded-overlay p-6 border border-slate-200 shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="font-bold text-slate-900 text-base flex items-center gap-2">
                <Compass className="h-5 w-5 text-indigo-600" />
                {t("portfolioTitle")}
              </h2>
              <Button variant="unstyled"
                onClick={() => onNavigateTab("universities")}
                className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 flex items-center gap-1"
              >
                {t("exploreAll")} <ArrowRight className="h-3.5 w-3.5" />
              </Button>
            </div>

            <p className="text-sm text-slate-600">
              {t("portfolioIntro")}
            </p>

            <div className="rounded-surface border border-indigo-100 bg-indigo-50/60 p-4">
              <p className="text-sm leading-relaxed text-slate-700">{t("portfolioNote")}</p>
            </div>
          </div>

          {/* Key Quick Launcher Tools */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div 
              onClick={() => onNavigateTab("sop")}
              {...clickableCardProps(() => onNavigateTab("sop"))}
              className="sb-ai-hero text-white rounded-overlay p-5 shadow-md hover:shadow-lg cursor-pointer transition-all space-y-3"
            >
              <div className="h-9 w-9 rounded-surface bg-white/20 flex items-center justify-center">
                <FileText className="h-5 w-5 text-white" />
              </div>
              <div>
                <h3 className="font-bold text-base">{t("sopToolTitle")}</h3>
                <p className="text-sm text-indigo-100 mt-1">{t("sopToolText")}</p>
              </div>
              <div className="text-xs font-bold inline-flex items-center gap-1 text-amber-300">
                {t("sopToolCta")} <ArrowRight className="h-3.5 w-3.5" />
              </div>
            </div>

            <div 
              onClick={() => onNavigateTab("chat")}
              {...clickableCardProps(() => onNavigateTab("chat"))}
              className="sb-brand-hero text-white rounded-overlay p-5 shadow-md hover:shadow-lg cursor-pointer transition-all space-y-3"
            >
              <div className="h-9 w-9 rounded-surface bg-white/20 flex items-center justify-center">
                <Bot className="h-5 w-5 text-amber-300" />
              </div>
              <div>
                <h3 className="font-bold text-base">{t("chatToolTitle")}</h3>
                <p className="text-sm text-slate-300 mt-1">{t("chatToolText")}</p>
              </div>
              <div className="text-xs font-bold inline-flex items-center gap-1 text-amber-300">
                {t("chatToolCta")} <ArrowRight className="h-3.5 w-3.5" />
              </div>
            </div>
          </div>
        </div>

        {/* Right Col: Academic Checklist & Budget Summary */}
        <div className="space-y-6">
          <div className="bg-white rounded-overlay p-5 border border-slate-200 shadow-xs space-y-4">
            <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
              <Zap className="h-4 w-4 text-amber-500" />
              {t("checklistTitle")}
            </h3>

            <div className="space-y-2 text-xs">
              <div className="flex items-center justify-between p-2.5 rounded-surface bg-slate-50 border border-slate-100">
                <span className="font-medium text-slate-700">{t("checkGpa")}</span>
                <span className="px-2 py-0.5 rounded-control bg-emerald-100 text-emerald-800 font-bold">
                  {profile.gpa} / {profile.gpaScale}
                </span>
              </div>

              <div className="flex items-center justify-between p-2.5 rounded-surface bg-slate-50 border border-slate-100">
                <span className="font-medium text-slate-700">{t("checkLanguage")}</span>
                <span className="px-2 py-0.5 rounded-control bg-blue-100 text-blue-800 font-bold">
                  {profile.ieltsScore ? `IELTS ${profile.ieltsScore}` : profile.toeflScore ? `TOEFL ${profile.toeflScore}` : t("pending")}
                </span>
              </div>

              <div className="flex items-center justify-between p-2.5 rounded-surface bg-slate-50 border border-slate-100">
                <span className="font-medium text-slate-700">{t("checkBudget")}</span>
                <span className="px-2 py-0.5 rounded-control bg-indigo-100 text-indigo-800 font-bold">
                  ${profile.budgetAnnualUsd?.toLocaleString()}
                </span>
              </div>

              <div className="flex items-center justify-between p-2.5 rounded-surface bg-slate-50 border border-slate-100">
                <span className="font-medium text-slate-700">{t("checkPubs")}</span>
                <span className="px-2 py-0.5 rounded-control bg-violet-100 text-violet-800 font-bold">
                  {profile.researchPublications || 0} {t("pubsUnit")} • {profile.workExperienceYears || 0} {t("yrsShort")}
                </span>
              </div>
            </div>

            <Button variant="unstyled"
              onClick={onEditProfile}
              className="w-full py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-surface text-xs transition-colors"
            >
              {t("updateCredentials")}
            </Button>
          </div>

          <div className="bg-emerald-50/70 border border-emerald-200 rounded-overlay p-5 space-y-3">
            <div className="flex items-center gap-2 text-emerald-900 font-bold text-sm">
              <ShieldCheck className="h-5 w-5 text-emerald-600" />
              {t("guaranteeTitle")}
            </div>
            <p className="text-sm text-emerald-800 leading-relaxed">
              {scholarshipMatchCount != null
                ? t("guaranteeWithCount", { count: scholarshipMatchCount })
                : t("guaranteeNoCount")}
            </p>
            <Button variant="unstyled"
              onClick={() => onNavigateTab("scholarships")}
              className="w-full py-2 bg-emerald-700 hover:bg-emerald-800 text-white font-semibold rounded-surface text-xs shadow-xs transition-colors"
            >
              {t("viewEligible")}
            </Button>
          </div>
        </div>
      </div>
      {/* Standing small print: this panel can be wrong — say so where it is read. */}
      <AppNote kind="estimate" className="mt-2" />
    </div>
  );
}
