"use client";

import React, { useState, useEffect } from "react";
import { useTranslations } from "next-intl";
import { StudentProfile } from "./Navbar";
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

interface DashboardViewProps {
  profile: StudentProfile | null;
  onNavigateTab: (tab: string) => void;
  savedUniCount: number;
  savedScholarshipCount: number;
  taskCount: number;
  onEditProfile: () => void;
}

export function DashboardView({
  profile,
  onNavigateTab,
  savedUniCount,
  savedScholarshipCount,
  taskCount,
  onEditProfile,
}: DashboardViewProps) {
  const t = useTranslations("dashboard");
  const [aiEvaluation, setAiEvaluation] = useState<string | null>(null);
  const [isEvaluating, setIsEvaluating] = useState(false);
  // Real scholarship match count (fetched, never a hardcoded claim).
  const [scholarshipMatchCount, setScholarshipMatchCount] = useState<number | null>(null);

  // Count how many scholarships actually match this profile (matchScore >= 60).
  useEffect(() => {
    if (!profile?.id) return;
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`/api/scholarships?profileId=${profile.id}&limit=200`);
        const data = await res.json();
        if (!cancelled && res.ok && Array.isArray(data.scholarships)) {
          const matches = data.scholarships.filter(
            (s: any) => s.matchScore != null && s.matchScore >= 60
          ).length;
          setScholarshipMatchCount(matches);
        }
      } catch {
        // keep null — the UI shows a neutral message instead of a number
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [profile?.id]);

  if (!profile) {
    return (
      <div className="p-8 text-center bg-white rounded-2xl border border-slate-200 shadow-sm">
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

  // Admissions Index — deterministic quick estimate (NOT AI).
  // Same honesty rule as the match scorer: a missing IELTS is NOT treated
  // as 6.5 — it contributes 0 points. No work/pub = 0 points.
  const normGpa = Math.min(4.0, profile.gpaScale > 0 ? (profile.gpa / profile.gpaScale) * 4.0 : profile.gpa);
  const gpaPercent = Math.round((normGpa / 4.0) * 100);
  const hasIelts = typeof profile.ieltsScore === "number" && profile.ieltsScore > 0;
  const ieltsPoints = hasIelts ? (profile.ieltsScore! / 9) * 25 : 0;
  const compositeScore = Math.min(
    96,
    Math.max(
      30,
      Math.round(
        gpaPercent * 0.5 +
          ieltsPoints +
          ((profile.workExperienceYears || 0) > 0 ? 10 : 0) +
          ((profile.researchPublications || 0) > 0 ? 10 : 0)
      )
    )
  );

  // Score-based tier label (deterministic, not AI).
  const admissionTier =
    compositeScore >= 85
      ? t("tierTop")
      : compositeScore >= 70
      ? t("tierCompetitive")
      : compositeScore >= 55
      ? t("tierDeveloping")
      : t("tierNeeds");

  let preferredCountriesList: string[] = ["United States", "United Kingdom", "Canada"];
  try {
    if (typeof profile.preferredCountries === "string") {
      preferredCountriesList = JSON.parse(profile.preferredCountries);
    } else if (Array.isArray(profile.preferredCountries)) {
      preferredCountriesList = profile.preferredCountries;
    }
  } catch {
    // fallback
  }

  return (
    <div className="space-y-6">
      {/* Top Banner / Hero */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-slate-900 via-indigo-950 to-blue-900 text-white p-6 sm:p-8 shadow-xl">
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
              {t("heroBody", {
                gpa: profile.gpa,
                scale: profile.gpaScale,
                test: profile.ieltsScore ? `IELTS ${profile.ieltsScore}` : t("testPrepActive"),
                degree: profile.degreeLevel,
                major: profile.targetMajor,
                countries: preferredCountriesList.slice(0, 3).join(", "),
              })}
            </p>

            {/* Quick Metrics Badges */}
            <div className="flex flex-wrap gap-2 pt-2">
              <span className="px-3 py-1 bg-white/10 rounded-lg text-xs font-medium border border-white/10">
                🎓 {t("levelBadge")}: <strong className="text-white">{profile.degreeLevel}</strong>
              </span>
              <span className="px-3 py-1 bg-white/10 rounded-lg text-xs font-medium border border-white/10">
                💰 {t("budgetBadge")}: <strong className="text-emerald-300">${profile.budgetAnnualUsd?.toLocaleString()}{t("perYear")}</strong>
              </span>
              <span className="px-3 py-1 bg-white/10 rounded-lg text-xs font-medium border border-white/10">
                🏆 {t("pubsBadge")}: <strong className="text-amber-300">{profile.researchPublications || 0} {t("pubsUnit")} • {profile.workExperienceYears || 0} {t("yrsUnit")}</strong>
              </span>
            </div>
          </div>

          {/* Readiness Score Card */}
          <div className="bg-white/10 backdrop-blur-md rounded-2xl p-6 border border-white/15 text-center flex flex-col items-center justify-center space-y-3">
            <div className="text-xs font-semibold tracking-wider text-indigo-200 uppercase">
              {t("admissionsIndex")}
            </div>

            <div className="relative flex items-center justify-center">
              <div className="h-24 w-24 rounded-full border-4 border-indigo-400/30 flex items-center justify-center bg-indigo-900/40 shadow-inner">
                <span className="text-3xl font-extrabold text-amber-300">{compositeScore}</span>
                <span className="text-xs text-slate-300 font-semibold">%</span>
              </div>
            </div>

            <div className="text-xs text-indigo-100 font-medium">
              {admissionTier}
            </div>

            <button
              onClick={runAiAudit}
              disabled={isEvaluating}
              className="w-full py-2.5 px-4 bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-500 hover:to-amber-600 text-slate-900 font-bold rounded-xl text-xs flex items-center justify-center gap-2 shadow-lg transition-all"
            >
              <Bot className="h-4 w-4" />
              {isEvaluating ? t("analyzing") : t("runAudit")}
            </button>
          </div>
        </div>
      </div>

      {/* Stats Bar */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div 
          onClick={() => onNavigateTab("tracker")}
          className="bg-white rounded-2xl p-4 border border-slate-200 shadow-xs hover:border-indigo-300 hover:shadow-md transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-semibold">{t("statShortlisted")}</span>
            <div className="p-2 bg-indigo-50 text-indigo-600 rounded-xl group-hover:bg-indigo-600 group-hover:text-white transition-colors">
              <GraduationCap className="h-4 w-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-slate-900">{savedUniCount}</div>
          <p className="text-[11px] text-slate-500 mt-1">{t("statShortlistedSub")}</p>
        </div>

        <div 
          onClick={() => onNavigateTab("scholarships")}
          className="bg-white rounded-2xl p-4 border border-slate-200 shadow-xs hover:border-emerald-300 hover:shadow-md transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-semibold">{t("statScholarships")}</span>
            <div className="p-2 bg-emerald-50 text-emerald-600 rounded-xl group-hover:bg-emerald-600 group-hover:text-white transition-colors">
              <Award className="h-4 w-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-slate-900">{savedScholarshipCount}</div>
          <p className="text-[11px] text-slate-500 mt-1">{t("statScholarshipsSub")}</p>
        </div>

        <div 
          onClick={() => onNavigateTab("tasks")}
          className="bg-white rounded-2xl p-4 border border-slate-200 shadow-xs hover:border-amber-300 hover:shadow-md transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-semibold">{t("statMilestones")}</span>
            <div className="p-2 bg-amber-50 text-amber-600 rounded-xl group-hover:bg-amber-600 group-hover:text-white transition-colors">
              <CheckCircle2 className="h-4 w-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-slate-900">{taskCount}</div>
          <p className="text-[11px] text-slate-500 mt-1">{t("statMilestonesSub")}</p>
        </div>

        <div 
          onClick={() => onNavigateTab("sop")}
          className="bg-white rounded-2xl p-4 border border-slate-200 shadow-xs hover:border-purple-300 hover:shadow-md transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-semibold">{t("statSop")}</span>
            <div className="p-2 bg-purple-50 text-purple-600 rounded-xl group-hover:bg-purple-600 group-hover:text-white transition-colors">
              <FileText className="h-4 w-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-slate-900">{t("statSopReady")}</div>
          <p className="text-[11px] text-slate-500 mt-1">{t("statSopSub")}</p>
        </div>
      </div>

      {/* Groq AI Evaluation Report Output Modal/Card */}
      {aiEvaluation && (
        <div className="bg-white rounded-2xl p-6 border-2 border-indigo-200 shadow-lg space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div className="flex items-center gap-2 text-indigo-700 font-bold text-lg">
              <Bot className="h-5 w-5" />
              {t("aiReportTitle")}
            </div>
            <button
              onClick={() => setAiEvaluation(null)}
              className="text-xs text-slate-400 hover:text-slate-600 font-semibold"
            >
              {t("closeReport")}
            </button>
          </div>

          <AiFormattedText text={aiEvaluation} className="text-xs sm:text-sm text-slate-700" />
        </div>
      )}

      {/* Main Grid: Recommended Actions & Strategy */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Strategic Breakdown & Recommended Programs */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="font-bold text-slate-900 text-base flex items-center gap-2">
                <Compass className="h-5 w-5 text-indigo-600" />
                {t("portfolioTitle")}
              </h2>
              <button
                onClick={() => onNavigateTab("universities")}
                className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 flex items-center gap-1"
              >
                {t("exploreAll")} <ArrowRight className="h-3.5 w-3.5" />
              </button>
            </div>

            <p className="text-xs text-slate-600">
              {t("portfolioIntro")}
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="p-4 rounded-xl bg-purple-50 border border-purple-200 space-y-1">
                <span className="text-[10px] font-bold tracking-wider text-purple-700 uppercase">{t("reachLabel")}</span>
                <div className="text-sm font-bold text-purple-900">{t("reachExamples")}</div>
                <p className="text-[11px] text-purple-700">{t("reachText")}</p>
              </div>

              <div className="p-4 rounded-xl bg-blue-50 border border-blue-200 space-y-1">
                <span className="text-[10px] font-bold tracking-wider text-blue-700 uppercase">{t("matchLabel")}</span>
                <div className="text-sm font-bold text-blue-900">{t("matchExamples")}</div>
                <p className="text-[11px] text-blue-700">{t("matchText")}</p>
              </div>

              <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 space-y-1">
                <span className="text-[10px] font-bold tracking-wider text-emerald-700 uppercase">{t("safetyLabel")}</span>
                <div className="text-sm font-bold text-emerald-900">{t("safetyExamples")}</div>
                <p className="text-[11px] text-emerald-700">{t("safetyText")}</p>
              </div>
            </div>
          </div>

          {/* Key Quick Launcher Tools */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div 
              onClick={() => onNavigateTab("sop")}
              className="bg-gradient-to-br from-indigo-500 to-purple-600 text-white rounded-2xl p-5 shadow-md hover:shadow-lg cursor-pointer transition-all space-y-3"
            >
              <div className="h-9 w-9 rounded-xl bg-white/20 flex items-center justify-center">
                <FileText className="h-5 w-5 text-white" />
              </div>
              <div>
                <h3 className="font-bold text-base">{t("sopToolTitle")}</h3>
                <p className="text-xs text-indigo-100 mt-1">{t("sopToolText")}</p>
              </div>
              <div className="text-xs font-bold inline-flex items-center gap-1 text-amber-300">
                {t("sopToolCta")} <ArrowRight className="h-3.5 w-3.5" />
              </div>
            </div>

            <div 
              onClick={() => onNavigateTab("chat")}
              className="bg-gradient-to-br from-slate-900 to-indigo-900 text-white rounded-2xl p-5 shadow-md hover:shadow-lg cursor-pointer transition-all space-y-3"
            >
              <div className="h-9 w-9 rounded-xl bg-white/20 flex items-center justify-center">
                <Bot className="h-5 w-5 text-amber-300" />
              </div>
              <div>
                <h3 className="font-bold text-base">{t("chatToolTitle")}</h3>
                <p className="text-xs text-slate-300 mt-1">{t("chatToolText")}</p>
              </div>
              <div className="text-xs font-bold inline-flex items-center gap-1 text-amber-300">
                {t("chatToolCta")} <ArrowRight className="h-3.5 w-3.5" />
              </div>
            </div>
          </div>
        </div>

        {/* Right Col: Academic Checklist & Budget Summary */}
        <div className="space-y-6">
          <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs space-y-4">
            <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
              <Zap className="h-4 w-4 text-amber-500" />
              {t("checklistTitle")}
            </h3>

            <div className="space-y-2 text-xs">
              <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 border border-slate-100">
                <span className="font-medium text-slate-700">{t("checkGpa")}</span>
                <span className="px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 font-bold">
                  {profile.gpa} / {profile.gpaScale}
                </span>
              </div>

              <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 border border-slate-100">
                <span className="font-medium text-slate-700">{t("checkLanguage")}</span>
                <span className="px-2 py-0.5 rounded bg-blue-100 text-blue-800 font-bold">
                  {profile.ieltsScore ? `IELTS ${profile.ieltsScore}` : profile.toeflScore ? `TOEFL ${profile.toeflScore}` : t("pending")}
                </span>
              </div>

              <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 border border-slate-100">
                <span className="font-medium text-slate-700">{t("checkBudget")}</span>
                <span className="px-2 py-0.5 rounded bg-indigo-100 text-indigo-800 font-bold">
                  ${profile.budgetAnnualUsd?.toLocaleString()}
                </span>
              </div>

              <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 border border-slate-100">
                <span className="font-medium text-slate-700">{t("checkPubs")}</span>
                <span className="px-2 py-0.5 rounded bg-purple-100 text-purple-800 font-bold">
                  {profile.researchPublications || 0} {t("pubsUnit")} • {profile.workExperienceYears || 0} {t("yrsShort")}
                </span>
              </div>
            </div>

            <button
              onClick={onEditProfile}
              className="w-full py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-xl text-xs transition-colors"
            >
              {t("updateCredentials")}
            </button>
          </div>

          <div className="bg-emerald-50/70 border border-emerald-200 rounded-2xl p-5 space-y-3">
            <div className="flex items-center gap-2 text-emerald-900 font-bold text-sm">
              <ShieldCheck className="h-5 w-5 text-emerald-600" />
              {t("guaranteeTitle")}
            </div>
            <p className="text-xs text-emerald-800 leading-relaxed">
              {scholarshipMatchCount != null
                ? t("guaranteeWithCount", { count: scholarshipMatchCount })
                : t("guaranteeNoCount")}
            </p>
            <button
              onClick={() => onNavigateTab("scholarships")}
              className="w-full py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-xl text-xs shadow-xs transition-colors"
            >
              {t("viewEligible")}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
