"use client";

import React, { useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import dynamic from "next/dynamic";
import { ShieldCheck, Building2, Video, Award, Gift, History, Settings2, RefreshCw, BadgeCheck, Headset, Bot, BarChart3, Flag, KeyRound, Compass, Menu, LayoutDashboard, MessageSquareQuote, Map as MapIcon, Target, Archive, Plane, Search, Send, Crown } from "lucide-react";
import { StudentProfile } from "./Navbar";
import { UniversitiesManager } from "./admin/UniversitiesManager";
import { CoursesManager } from "./admin/CoursesManager";
import { ScholarshipsManager } from "./admin/ScholarshipsManager";
import { OpportunitiesManager } from "./admin/OpportunitiesManager";
import { PremiumManager } from "./admin/PremiumManager";
import { AuditLogViewer } from "./admin/AuditLogViewer";
import { ConfigManager } from "./admin/ConfigManager";
import { AiSettingsManager } from "./admin/AiSettingsManager";
import { OwnershipManager } from "./admin/OwnershipManager";
import { RefreshCenter } from "./admin/RefreshCenter";
import { VerificationManager } from "./admin/VerificationManager";
import { ConsultingManager } from "./admin/ConsultingManager";
import { AnalyticsDashboard } from "./admin/AnalyticsDashboard";
import { ReportsManager } from "./admin/ReportsManager";
import { NavManager } from "./admin/NavManager";
import { AdminOverview } from "./admin/AdminOverview";
import { StoriesModeration } from "./admin/growth/StoriesModeration";
import { GuideManager } from "./admin/growth/GuideManager";
import { TelegramManager } from "./admin/TelegramManager";
import { CatalogManager, type FieldDef } from "./admin/growth/CatalogManager";
import { CHECKLIST_PHASES, GOAL_LEVELS, GOAL_PILLARS, PROMPT_CATEGORIES } from "@/lib/growth/defaults";
import { NAV_SECTIONS, navLabelKey } from "@/lib/navSections";
import { ErrorBoundary } from "./ErrorBoundary";

/**
 * Research Agent is lazy-loaded so that any issue in its client bundle can
 * never crash the Admin Panel. It also never auto-runs on mount — the user
 * must explicitly click RUN.
 */
const ResearchAgent = dynamic(
  () => import("./admin/ResearchAgent").then((m) => m.ResearchAgent),
  {
    ssr: false,
    loading: () => (
      <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center text-xs font-semibold text-slate-400">
        Loading Research Agent…
      </div>
    ),
  }
);

interface AdminPanelProps {
  activeProfile: StudentProfile | null;
}

type AdminTab =
  | "overview"
  | "analytics"
  | "universities"
  | "courses"
  | "scholarships"
  | "opportunities"
  | "premium"
  | "audit"
  | "refresh"
  | "config"
  | "ai"
  | "verify"
  | "consulting"
  | "reports"
  | "research"
  | "navigation"
  | "stories"
  | "guide"
  | "goalLibrary"
  | "vaultPrompts"
  | "checklist"
  | "telegram"
  | "ownership";

type AdminGroup = "home" | "content" | "community" | "growth" | "money" | "system";

const SECTIONS: { id: AdminTab; group: AdminGroup; icon: React.ComponentType<{ className?: string }>; isNew?: boolean }[] = [
  { id: "overview", group: "home", icon: LayoutDashboard },
  { id: "analytics", group: "home", icon: BarChart3 },
  { id: "universities", group: "content", icon: Building2 },
  { id: "scholarships", group: "content", icon: Award },
  { id: "opportunities", group: "content", icon: Compass },
  { id: "courses", group: "content", icon: Video },
  { id: "verify", group: "content", icon: BadgeCheck },
  { id: "research", group: "content", icon: Bot },
  { id: "refresh", group: "content", icon: RefreshCw },
  { id: "stories", group: "community", icon: MessageSquareQuote, isNew: true },
  { id: "reports", group: "community", icon: Flag },
  { id: "consulting", group: "community", icon: Headset },
  { id: "guide", group: "growth", icon: MapIcon, isNew: true },
  { id: "goalLibrary", group: "growth", icon: Target, isNew: true },
  { id: "vaultPrompts", group: "growth", icon: Archive, isNew: true },
  { id: "checklist", group: "growth", icon: Plane, isNew: true },
  { id: "navigation", group: "growth", icon: Menu },
  { id: "premium", group: "money", icon: Gift },
  { id: "telegram", group: "system", icon: Send, isNew: true },
  { id: "config", group: "system", icon: Settings2 },
  { id: "ai", group: "system", icon: KeyRound },
  { id: "audit", group: "system", icon: History },
  { id: "ownership", group: "system", icon: Crown, isNew: true },
];

const GROUPS: AdminGroup[] = ["home", "content", "community", "growth", "money", "system"];
const TAB_KEY = "scholarbridge_admin_tab";

function initialTab(): AdminTab {
  try {
    const v = localStorage.getItem(TAB_KEY);
    if (v && SECTIONS.some((s) => s.id === v)) return v as AdminTab;
  } catch {
    // ignore
  }
  return "overview";
}

export function AdminPanel({ activeProfile }: AdminPanelProps) {
  const t = useTranslations("admin");
  const tg = useTranslations("adminGrowth");
  const tn = useTranslations("nav");
  // Overview first: what needs attention today, then the numbers.
  const [tab, setTabState] = useState<AdminTab>(initialTab);
  const [q, setQ] = useState("");

  const setTab = (id: AdminTab) => {
    setTabState(id);
    try {
      localStorage.setItem(TAB_KEY, id);
    } catch {
      // ignore
    }
    if (typeof window !== "undefined") window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const goalFields = useMemo<FieldDef[]>(
    () => [
      { key: "title", label: tg("fTitle"), type: "text", required: true, max: 120, wide: true },
      { key: "pillar", label: tg("fPillar"), type: "select", options: GOAL_PILLARS.map((p) => ({ value: p, label: tg(`pillar.${p}`) })) },
      { key: "level", label: tg("fLevel"), type: "select", options: GOAL_LEVELS.map((l) => ({ value: l, label: tg(`level.${l}`) })) },
      { key: "description", label: tg("fDescription"), type: "textarea", max: 600 },
      { key: "steps", label: tg("fSteps"), type: "lines" },
      { key: "estWeeks", label: tg("fWeeks"), type: "number", min: 1, max: 104 },
      { key: "isActive", label: tg("fActive"), type: "checkbox" },
    ],
    [tg]
  );
  const promptFields = useMemo<FieldDef[]>(
    () => [
      { key: "question", label: tg("fQuestion"), type: "textarea", max: 300 },
      { key: "category", label: tg("fCategory"), type: "select", options: PROMPT_CATEGORIES.map((c) => ({ value: c, label: tg(`cat.${c}`) })) },
      { key: "wordLimit", label: tg("fWordLimit"), type: "number", min: 10, max: 5000 },
      { key: "hint", label: tg("fHint"), type: "textarea", max: 400 },
      { key: "isActive", label: tg("fActive"), type: "checkbox" },
    ],
    [tg]
  );
  const checklistFields = useMemo<FieldDef[]>(
    () => [
      { key: "title", label: tg("fTitle"), type: "text", required: true, max: 160, wide: true },
      { key: "phase", label: tg("fPhase"), type: "select", options: CHECKLIST_PHASES.map((p) => ({ value: p, label: tg(`phase.${p}`) })) },
      {
        key: "linkTab",
        label: tg("fLink"),
        type: "select",
        allowEmpty: true,
        options: NAV_SECTIONS.map((s) => ({ value: s.id, label: tn(navLabelKey(s.id)) })),
      },
      { key: "description", label: tg("fDescription"), type: "textarea", max: 500 },
      { key: "isActive", label: tg("fActive"), type: "checkbox" },
    ],
    [tg, tn]
  );

  const visibleSections = SECTIONS.filter((s) => {
    const needle = q.trim().toLowerCase();
    if (!needle) return true;
    return `${t(`tab.${s.id}`)} ${t(`desc.${s.id}`)} ${s.id}`.toLowerCase().includes(needle);
  });

  if (!activeProfile) {
    return <p className="text-sm text-slate-500 p-6">{t("selectProfile")}</p>;
  }

  const current = SECTIONS.find((s) => s.id === tab) ?? SECTIONS[0];
  const CurrentIcon = current.icon;
  const id = activeProfile.id;

  const content = (() => {
    switch (tab) {
      case "overview":
        return <AdminOverview onOpen={(s) => setTab(SECTIONS.some((x) => x.id === s) ? (s as AdminTab) : "overview")} />;
      case "analytics":
        return <AnalyticsDashboard adminProfileId={id} />;
      case "universities":
        return <UniversitiesManager adminProfileId={id} />;
      case "courses":
        return <CoursesManager adminProfileId={id} />;
      case "scholarships":
        return <ScholarshipsManager adminProfileId={id} />;
      case "opportunities":
        return <OpportunitiesManager adminProfileId={id} />;
      case "premium":
        return <PremiumManager adminProfileId={id} />;
      case "audit":
        return <AuditLogViewer adminProfileId={id} />;
      case "refresh":
        return <RefreshCenter adminProfileId={id} />;
      case "navigation":
        return <NavManager adminProfileId={id} />;
      case "config":
        return <ConfigManager adminProfileId={id} />;
      case "ai":
        return <AiSettingsManager adminProfileId={id} />;
      case "verify":
        return <VerificationManager adminProfileId={id} />;
      case "reports":
        return <ReportsManager adminProfileId={id} />;
      case "consulting":
        return <ConsultingManager adminProfileId={id} />;
      case "stories":
        return <StoriesModeration />;
      case "guide":
        return <GuideManager />;
      case "telegram":
        return <TelegramManager />;
      case "ownership":
        return <OwnershipManager />;
      case "goalLibrary":
        return (
          <CatalogManager
            endpoint="/api/admin/goal-templates"
            fields={goalFields}
            titleKey="title"
            groupKey="pillar"
            groupLabel={(g) => tg(`pillar.${g}`)}
            intro={tg("goalsIntro")}
            subtitle={(r) => `${Array.isArray(r.steps) ? r.steps.length : 0} ${tg("steps")}${r.estWeeks ? ` · ${r.estWeeks} ${tg("weeks")}` : ""}`}
          />
        );
      case "vaultPrompts":
        return (
          <CatalogManager
            endpoint="/api/admin/answer-prompts"
            fields={promptFields}
            titleKey="question"
            groupKey="category"
            groupLabel={(g) => tg(`cat.${g}`)}
            intro={tg("promptsIntro")}
            subtitle={(r) => (r.wordLimit ? `≤ ${r.wordLimit} ${tg("words")}` : String(r.hint ?? ""))}
          />
        );
      case "checklist":
        return (
          <CatalogManager
            endpoint="/api/admin/checklist"
            fields={checklistFields}
            titleKey="title"
            groupKey="phase"
            groupLabel={(g) => tg(`phase.${g}`)}
            intro={tg("checklistIntro")}
            subtitle={(r) => String(r.description ?? "")}
          />
        );
      case "research":
        return <ResearchAgent adminProfileId={id} />;
    }
  })();

  return (
    <div className="space-y-4 sm:space-y-5">
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white rounded-3xl p-4 sm:p-6 shadow-xl">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 shrink-0 rounded-xl bg-white/10 flex items-center justify-center">
            <ShieldCheck className="h-6 w-6 text-amber-300" />
          </div>
          <div className="min-w-0">
            <h1 className="text-xl sm:text-2xl font-extrabold">{t("title")}</h1>
            <p className="text-xs text-slate-300 mt-0.5">{t("subtitle")}</p>
          </div>
        </div>
      </div>

      <div className="xl:grid xl:grid-cols-[240px_minmax(0,1fr)] xl:gap-5">
        {/* Section menu — grouped list on wide screens */}
        <aside className="hidden xl:block">
          <div className="sticky top-4 space-y-3 rounded-2xl border border-slate-200 bg-white p-3">
            <div className="relative">
              <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder={t("search")}
                aria-label={t("search")}
                className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2 pl-8 pr-2 text-xs text-slate-800 focus:border-indigo-300 focus:outline-none"
              />
            </div>
            <nav aria-label={t("title")} className="space-y-3">
              {GROUPS.map((g) => {
                const items = visibleSections.filter((s) => s.group === g);
                if (!items.length) return null;
                return (
                  <div key={g}>
                    <p className="px-2 pb-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">{t(`group.${g}`)}</p>
                    <ul className="space-y-0.5">
                      {items.map((s) => {
                        const Icon = s.icon;
                        const active = s.id === tab;
                        return (
                          <li key={s.id}>
                            <button
                              onClick={() => setTab(s.id)}
                              aria-current={active ? "page" : undefined}
                              className={`flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left text-xs font-semibold transition-colors ${
                                active ? "bg-slate-900 text-white" : "text-slate-600 hover:bg-slate-100"
                              }`}
                            >
                              <Icon className="h-3.5 w-3.5 shrink-0" />
                              <span className="min-w-0 flex-1 truncate">{t(`tab.${s.id}`)}</span>
                              {s.isNew && (
                                <span
                                  className={`h-1.5 w-1.5 shrink-0 rounded-full ${active ? "bg-emerald-300" : "bg-emerald-500"}`}
                                  title={tn("new")}
                                  aria-label={tn("new")}
                                />
                              )}
                            </button>
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                );
              })}
              {visibleSections.length === 0 && <p className="px-2 text-[11px] text-slate-400">{t("noMatch")}</p>}
            </nav>
          </div>
        </aside>

        <div className="min-w-0 space-y-4">
          {/* Phones/tablets: one clear dropdown instead of 20 scrolling chips */}
          <label className="block xl:hidden">
            <span className="sr-only">{t("chooseSection")}</span>
            <select
              value={tab}
              onChange={(e) => setTab(e.target.value as AdminTab)}
              className="w-full rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm font-bold text-slate-800 shadow-xs"
            >
              {GROUPS.map((g) => (
                <optgroup key={g} label={t(`group.${g}`)}>
                  {SECTIONS.filter((s) => s.group === g).map((s) => (
                    <option key={s.id} value={s.id}>
                      {t(`tab.${s.id}`)}
                      {s.isNew ? ` · ${tn("new")}` : ""}
                    </option>
                  ))}
                </optgroup>
              ))}
            </select>
          </label>

          <div className="flex items-start gap-3">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-slate-900 text-amber-300">
              <CurrentIcon className="h-4 w-4" />
            </span>
            <div className="min-w-0">
              <h2 className="text-base font-extrabold text-slate-900 sm:text-lg">{t(`tab.${current.id}`)}</h2>
              <p className="text-xs text-slate-500">{t(`desc.${current.id}`)}</p>
            </div>
          </div>

          {/* Each section is wrapped in an ErrorBoundary so a failing one can
              never crash the whole Admin Panel. */}
          <ErrorBoundary
            key={tab}
            fallback={
              <div className="rounded-2xl border border-amber-200 bg-amber-50 p-6 text-center">
                <p className="text-xs font-bold text-amber-800">{t("sectionFailed")}</p>
              </div>
            }
          >
            {content}
          </ErrorBoundary>
        </div>
      </div>
    </div>
  );
}
