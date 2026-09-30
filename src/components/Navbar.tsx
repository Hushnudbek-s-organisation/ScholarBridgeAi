"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { AnimatePresence, motion } from "framer-motion";
import {
  Activity,
  Award,
  Bot,
  Calculator,
  CalendarClock,
  CheckSquare,
  Compass,
  Crown,
  FileText,
  Flag,
  Gift,
  Globe2,
  GraduationCap,
  Handshake,
  Headset,
  Home,
  LayoutDashboard,
  ListChecks,
  LogOut,
  Menu,
  MessagesSquare,
  Mic,
  Pencil,
  Plane,
  Plus,
  Rocket,
  Search,
  ShieldCheck,
  Sparkles,
  Target,
  Trophy,
  Users,
  Video,
  X,
  Archive,
  ArrowLeftRight,
  Send,
  Briefcase,
  Route,
  Dumbbell,
  FolderOpen,
  ClipboardCheck,
  PiggyBank,
  PanelsTopLeft,
  Mail,
  HandCoins,
  Plug,
  ChevronDown,
} from "lucide-react";
import { BrandingImage } from "./BrandingImage";
import { LanguageSwitcher } from "./LanguageSwitcher";
import { NotificationBell } from "./NotificationBell";
import { ThemeSwitch, ThemeToggle } from "./ThemeToggle";
import { CommandPalette, type PaletteItem } from "./CommandPalette";
import {
  DEFAULT_HIDDEN_NAV_ITEMS,
  NAV_GROUP_ICONS,
  NAV_GROUPS,
  NAV_SECTIONS,
  isNewBadgeActive,
  type NavGroupId,
} from "@/lib/navSections";
import { isTelegramPlaceholderEmail } from "@/lib/telegram/placeholder";

export interface StudentProfile {
  id: number;
  name: string;
  email: string;
  degreeLevel: string;
  targetMajor: string;
  gpa: number;
  gpaScale: number;
  ieltsScore?: number | null;
  toeflScore?: number | null;
  satScore?: number | null;
  greScore?: number | null;
  budgetAnnualUsd: number;
  preferredCountries: string;
  needScholarship: boolean;
  extracurriculars?: string | null;
  workExperienceYears?: number | null;
  researchPublications?: number | null;
  preferredLocale?: string;
  isAdmin?: boolean;
  // Referral system v2
  referralCode?: string | null;
  referredBy?: number | null;
  referralPoints?: number | null;
  isPremium?: boolean | null;
  premiumUntil?: string | null;
  referralRewarded?: boolean | null;
  // Onboarding wizard
  onboardingStep?: number | null;
  onboardingCompleted?: boolean | null;
  // Complete profile (Academic / Personal / Financial / Activities / Goals)
  actScore?: number | null;
  duolingoScore?: number | null;
  apCourses?: string | null;
  ibCourses?: string | null;
  aLevelSubjects?: string | null;
  courseworkNotes?: string | null;
  country?: string | null;
  age?: number | null;
  graduationYear?: number | null;
  familyIncomeUsd?: number | null;
  needsFinancialAid?: boolean | null;
  requiresFullScholarship?: boolean | null;
  leadership?: string | null;
  volunteering?: string | null;
  sports?: string | null;
  clubs?: string | null;
  researchExperience?: string | null;
  projects?: string | null;
  olympiads?: string | null;
  awards?: string | null;
  competitions?: string | null;
  certificates?: string | null;
  targetUniversities?: string | null;
  careerGoal?: string | null;
  dataShareConsent?: boolean | null;
}

interface NavbarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  activeProfile: StudentProfile | null;
  activeProfileId?: number | null;
  onOpenProfileModal: (isNew?: boolean) => void;
  onSwitchProfile?: () => void;
  onStartOnboarding?: () => void;
  onLogout?: () => void;
  onLocaleChange?: (locale: string) => void;
}

interface NavItem {
  id: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  group: NavGroupId;
  premium?: boolean;
  /** Code kept, UI hidden (feature not live yet). */
  hidden?: boolean;
  isNew?: boolean;
}

/** Icon per section id (labels come from i18n, groups from navSections). */
const ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  dashboard: LayoutDashboard,
  universities: Search,
  scholarships: Award,
  autopilot: Rocket,
  opportunities: Compass,
  compare: Globe2,
  profile: GraduationCap,
  chancing: Target,
  strength: Activity,
  goals: Flag,
  stories: Trophy,
  similar: Users,
  planning: Calculator,
  advisor: Bot,
  mentors: Handshake,
  parent: Home,
  applications: CheckSquare,
  vault: Archive,
  sop: FileText,
  tasks: ListChecks,
  visa: Mic,
  departure: Plane,
  chat: Sparkles,
  forum: MessagesSquare,
  payments: Crown,
  rewards: Gift,
  notifications: Send,
  // hidden-until-ready sections
  tracker: GraduationCap,
  deadlines: CalendarClock,
  courses: Video,
  consulting: Headset,
  admin: ShieldCheck,
  // journey reorganization (2026-09-29)
  career: Briefcase,
  "study-plan": Route,
  activities: Dumbbell,
  documents: FolderOpen,
  tests: ClipboardCheck,
  requirements: ListChecks,
  funding: PiggyBank,
  workspace: PanelsTopLeft,
  recommendations: Mail,
  offers: GraduationCap,
  "post-admission-funding": HandCoins,
  interviews: MessagesSquare,
  learning: Plug,
};

/**
 * Premium sections keep their existing PRO badge. Spec §36: essential
 * information (universities, scholarships, documents, requirements, basic
 * applications, basic planning) stays free — locking those would be the
 * opposite of helping a student who has just decided to study abroad.
 */
const PREMIUM = new Set(["sop", "tasks", "forum", "deadlines", "courses", "interviews", "funding"]);
/** Order of preference for the phone/tablet bottom bar (first 4 visible win). */
const BOTTOM_BAR_PREFERENCE = ["dashboard", "universities", "scholarships", "applications", "autopilot", "chat"];

/** The admin row keeps its own dark style so it never looks like a student section. */
const LAYOUT_SPRING = { type: "spring" as const, stiffness: 420, damping: 34 };

export function Navbar({
  activeTab,
  setActiveTab,
  activeProfile,
  activeProfileId,
  onOpenProfileModal,
  onSwitchProfile,
  onStartOnboarding,
  onLogout,
  onLocaleChange,
}: NavbarProps) {
  const t = useTranslations("nav");
  const tm = useTranslations("meta");
  const th = useTranslations("navHints");

  // Admin → Navigation: sections hidden for EVERYONE (admin included).
  // Defaults apply on first paint so removed sections never flash, then the
  // server value replaces them without a reload.
  const [hiddenItems, setHiddenItems] = useState<string[]>([...DEFAULT_HIDDEN_NAV_ITEMS]);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchKey, setSearchKey] = useState(0);
  // Keep the sidebar focused on the current task: groups start collapsed on
  // every screen, and the group containing the active page is always expanded.
  // Students can open another group without losing their current location.
  const [collapsedGroups, setCollapsedGroups] = useState<Record<string, boolean>>(
    () => Object.fromEntries(NAV_GROUPS.map((group) => [group, true]))
  );

  useEffect(() => {
    let alive = true;
    const loadHidden = async () => {
      try {
        const res = await fetch("/api/config/nav", { cache: "no-store" });
        const data = await res.json();
        if (alive && Array.isArray(data.hidden)) {
          setHiddenItems(data.hidden.filter((v: unknown): v is string => typeof v === "string"));
        }
      } catch {
        // offline / API down — keep the defaults, the sidebar still works.
      }
    };
    void loadHidden();
    // Fired by Admin → Navigation after a save — updates the open sidebar live.
    const onUpdate = () => void loadHidden();
    window.addEventListener("scholarbridge:nav-updated", onUpdate);
    return () => {
      alive = false;
      window.removeEventListener("scholarbridge:nav-updated", onUpdate);
    };
  }, []);

  // If the admin hides the section the user is currently on, land them back
  // on the dashboard instead of leaving a nav-less page.
  useEffect(() => {
    if (activeTab !== "dashboard" && activeTab !== "admin" && hiddenItems.includes(activeTab)) {
      setActiveTab("dashboard");
    }
  }, [hiddenItems, activeTab, setActiveTab]);

  const openSearch = useCallback(() => {
    setDrawerOpen(false);
    setSearchKey((k) => k + 1);
    setSearchOpen(true);
  }, []);

  // Ctrl/⌘ + K opens the section finder from anywhere; Esc closes the drawer.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        openSearch();
      } else if (e.key === "Escape") {
        setDrawerOpen(false);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [openSearch]);

  // Lock page scroll behind the open drawer (phones/tablets).
  useEffect(() => {
    if (!drawerOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [drawerOpen]);

  const isAdmin = !!activeProfile?.isAdmin;

  const labelFor = useCallback(
    (id: string): string => {
      const map: Record<string, string> = {
        dashboard: t("dashboard"),
        universities: t("universities"),
        scholarships: t("scholarships"),
        autopilot: t("autopilot"),
        opportunities: t("opportunities"),
        compare: t("compare"),
        profile: t("completeProfile"),
        chancing: t("chances"),
        strength: t("strength"),
        goals: t("goals"),
        stories: t("stories"),
        similar: t("similarProfiles"),
        planning: t("planning"),
        advisor: t("advisor"),
        mentors: t("mentors"),
        parent: t("parent"),
        applications: t("myApplications"),
        vault: t("vault"),
        sop: t("sop"),
        tasks: t("tasks"),
        visa: t("visa"),
        departure: t("departure"),
        chat: t("chat"),
        forum: t("forum"),
        payments: t("payments"),
        rewards: t("rewards"),
        notifications: t("notifications"),
        career: "Career & Major Explorer",
        "study-plan": "My Study Plan",
        activities: "My Activities",
        documents: "Documents",
        tests: "Test Planner",
        requirements: "Application Requirements",
        funding: "Financial Plan",
        workspace: "Application Workspace",
        recommendations: "Recommendation Manager",
        offers: "Offers & Decisions",
        "post-admission-funding": "Funding & Deposits",
        interviews: "Interview Center",
        learning: "External Learning Provider",
        tracker: t("tracker"),
        deadlines: t("deadlines"),
        courses: t("courses"),
        consulting: t("consulting"),
        admin: t("adminPanel"),
      };
      return map[id] ?? id;
    },
    [t]
  );

  // Phone tab bar has ~75px per item — use short words there.
  const shortLabel = (id: string, fallback: string): string => {
    const map: Record<string, string> = {
      dashboard: t("tabHome"),
      universities: t("tabUnis"),
      scholarships: t("tabScholarships"),
      applications: t("tabApps"),
      autopilot: t("tabAutopilot"),
      chat: t("tabChat"),
    };
    return map[id] ?? fallback;
  };

  const hintFor = useCallback(
    (id: string): string | undefined => {
      const map: Record<string, string> = {
        dashboard: th("dashboard"),
        universities: th("universities"),
        scholarships: th("scholarships"),
        autopilot: th("autopilot"),
        opportunities: th("opportunities"),
        compare: th("compare"),
        profile: th("profile"),
        chancing: th("chancing"),
        strength: th("strength"),
        goals: th("goals"),
        stories: th("stories"),
        similar: th("similar"),
        planning: th("planning"),
        advisor: th("advisor"),
        mentors: th("mentors"),
        parent: th("parent"),
        applications: th("applications"),
        vault: th("vault"),
        sop: th("sop"),
        tasks: th("tasks"),
        visa: th("visa"),
        departure: th("departure"),
        chat: th("chat"),
        forum: th("forum"),
        payments: th("payments"),
        rewards: th("rewards"),
        notifications: th("notifications"),
        career: "Start from the job you want, then the major, the countries and the universities.",
        "study-plan": "Your goal split into ten phases, updated automatically from your real data.",
        activities: "Volunteering, leadership, projects, competitions — with evidence.",
        documents: "One vault of documents, reused across every application.",
        tests: "IELTS / TOEFL / SAT targets, dates, attempts and practice tasks.",
        requirements: "What a university asks for, with the source and the date we last verified it.",
        funding: "Full yearly cost, funding, family budget and the remaining gap.",
        workspace: "One workspace per university: requirements, essays, tests, finance and submission.",
        recommendations: "Track every letter from “not requested” to “submitted”.",
        offers: "Pending, accepted, rejected, waitlisted — and the post-admission plan.",
        "post-admission-funding": "What you must pay, when, and to whom.",
        interviews: "University and visa interview practice with honest feedback.",
        learning: "Optional connection to an external preparation platform.",
        admin: th("admin"),
      };
      return map[id];
    },
    [th]
  );

  // Keep group headings localized just like the section labels.
  const groupLabel = (g: NavGroupId) => {
    const keys: Record<NavGroupId, string> = {
      home: "groupHome",
      discover: "groupDiscover",
      journey: "groupJourney",
      prepare: "groupPrepare",
      apply: "groupApply",
      after: "groupAfter",
      help: "groupHelp",
      account: "groupAccount",
    };
    return t(keys[g]);
  };

  // Every section: registry order from navSections + a few legacy tabs whose
  // code is kept but whose UI is hidden until ready (no dead navigation).
  // Read once per mount — the badge retires on its release date, not on a
  // feature flag an admin has to remember to switch off.
  const newBadgesActive = useMemo(() => isNewBadgeActive(), []);

  const navItems: NavItem[] = useMemo(() => {
    const fromRegistry: NavItem[] = NAV_SECTIONS.map((s) => ({
      id: s.id,
      label: labelFor(s.id),
      icon: ICONS[s.id] ?? Sparkles,
      group: s.group,
      premium: PREMIUM.has(s.id),
      isNew: s.isNew && newBadgesActive,
    }));
    const legacy: NavItem[] = [
      { id: "tracker", label: labelFor("tracker"), icon: ICONS.tracker, group: "apply", hidden: true },
      { id: "deadlines", label: labelFor("deadlines"), icon: ICONS.deadlines, group: "apply", premium: true, hidden: true },
      { id: "courses", label: labelFor("courses"), icon: ICONS.courses, group: "help", premium: true, hidden: true },
      { id: "consulting", label: labelFor("consulting"), icon: ICONS.consulting, group: "help", hidden: true },
    ];
    return [...fromRegistry, ...legacy];
  }, [labelFor, newBadgesActive]);

  const displayItems = useMemo((): NavItem[] => {
    const visible = navItems.filter((item) => !item.hidden && !hiddenItems.includes(item.id));
    return isAdmin
      ? [...visible, { id: "admin", label: labelFor("admin"), icon: ShieldCheck, group: "account" as NavGroupId }]
      : visible;
  }, [navItems, hiddenItems, isAdmin, labelFor]);

  const grouped = useMemo(
    () =>
      NAV_GROUPS.map((g) => ({ g, items: displayItems.filter((i) => i.group === g) })).filter((x) => x.items.length > 0),
    [displayItems]
  );

  const bottomItems = useMemo(
    () =>
      BOTTOM_BAR_PREFERENCE.map((id) => displayItems.find((i) => i.id === id))
        .filter((x): x is NavItem => !!x)
        .slice(0, 4),
    [displayItems]
  );

  const paletteItems: PaletteItem[] = useMemo(
    () =>
      displayItems.map((i) => ({
        id: i.id,
        label: i.label,
        hint: hintFor(i.id),
        icon: i.icon,
        isNew: i.isNew,
        premium: i.premium,
      })),
    [displayItems, hintFor]
  );

  const go = (id: string) => {
    setDrawerOpen(false);
    if (id === "profile") {
      onOpenProfileModal(false);
      return;
    }
    setActiveTab(id);
    // New section → start at the top (especially on phones).
    try {
      window.scrollTo({ top: 0, behavior: "instant" as ScrollBehavior });
    } catch {
      window.scrollTo(0, 0);
    }
  };

  const initials = (activeProfile?.name || "?")
    .split(/\s+/)
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  // ---- One nav row (sidebar + drawer) -------------------------------------
  const renderItem = (item: NavItem, layoutId: string) => {
    const inDrawer = layoutId === "nav-active-drawer";
    const Icon = item.icon;
    const isActive = activeTab === item.id;
    const isAdminTab = item.id === "admin";
    const activeBg = item.premium
      ? "bg-gradient-to-r from-amber-400 to-yellow-500"
      : isAdminTab
      ? "bg-slate-900"
      : "bg-indigo-600";
    const stateCls = isActive
      ? item.premium
        ? "text-slate-900 font-bold sb-ink-on-warm"
        : "text-white font-semibold"
      : item.premium
      ? "text-amber-700 hover:bg-amber-50 hover:text-amber-800"
      : "text-slate-600 hover:text-slate-900 hover:bg-slate-100";
    return (
      <button
        key={item.id}
        onClick={() => go(item.id)}
        aria-current={isActive ? "page" : undefined}
        className={`relative flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-[13px] font-medium transition-colors duration-150 ${stateCls}`}
      >
        {isActive && (
          <motion.span layoutId={layoutId} className={`absolute inset-0 rounded-lg shadow-xs ${activeBg}`} transition={LAYOUT_SPRING} />
        )}
        <Icon className={`relative h-4 w-4 shrink-0 ${isActive ? "" : item.premium ? "text-amber-500" : "text-slate-500"}`} />
        <span className="relative flex-1 truncate">{item.label}</span>
        {item.isNew && !isActive && (
          <>
            {/* Narrow desktop sidebar (lg): a dot, so long labels stay readable */}
            {!inDrawer && (
              <span className="relative h-2 w-2 shrink-0 xl:hidden" title={t("new")} aria-label={t("new")}>
                <span className="absolute inset-0 animate-ping rounded-full bg-emerald-400/70" />
                <span className="relative block h-2 w-2 rounded-full bg-emerald-500" />
              </span>
            )}
            <span
              className={`relative shrink-0 rounded-full bg-emerald-100 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide text-emerald-700 ${inDrawer ? "" : "hidden xl:inline"}`}
            >
              {t("new")}
            </span>
          </>
        )}
        {item.premium && !isActive && (
          <span className="relative rounded-full bg-amber-100 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide text-amber-700">
            Pro
          </span>
        )}
      </button>
    );
  };

  /** A compact, collapsible group works the same way in the sidebar and drawer. */
  const renderGroup = (g: NavGroupId, items: NavItem[], layoutId: string) => {
    const active = activeTab === "admin" ? "account" : items.find((i) => i.id === activeTab)?.group;
    const open = !collapsedGroups[g] || active === g;
    const heading = (
      <>
        <span aria-hidden>{NAV_GROUP_ICONS[g]}</span>
        {groupLabel(g)}
        {!open && items.length > 0 && (
          <span className="ml-auto rounded-full bg-slate-100 px-1.5 py-0.5 text-[10px] font-semibold leading-none text-slate-500 dark:bg-slate-800">
            {items.length}
          </span>
        )}
      </>
    );

    if (g === "home") {
      return (
        <div key={g}>
          <div className="space-y-0.5">{items.map((item) => renderItem(item, layoutId))}</div>
        </div>
      );
    }

    return (
      <div key={g}>
        <button
          type="button"
          onClick={() => setCollapsedGroups((prev) => ({ ...prev, [g]: !prev[g] }))}
          aria-expanded={open}
          className="mb-1 flex w-full items-center gap-1.5 rounded-lg px-3 py-1.5 text-left text-[10px] font-bold uppercase tracking-wider text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800"
        >
          {heading}
          <ChevronDown
            className={`h-3.5 w-3.5 shrink-0 transition-transform ${open ? "rotate-180" : ""}`}
            aria-hidden
          />
        </button>
        {open && <div className="space-y-0.5">{items.map((item) => renderItem(item, layoutId))}</div>}
      </div>
    );
  };

  const renderGroups = (layoutId: string) => (
    <div className="space-y-3">
      {grouped.map(({ g, items }) => renderGroup(g, items, layoutId))}
    </div>
  );

  const Logo = (
    <div className="flex items-center gap-2.5 min-w-0">
      <div className="h-9 w-9 shrink-0 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-md shadow-indigo-200">
        <BrandingImage alt={t("logoAlt")} className="h-9 w-9 object-cover" />
      </div>
      <div className="min-w-0">
        <span className="block truncate text-lg font-bold tracking-tight text-slate-900">{tm("appName")}</span>
        <p className="truncate text-[10px] text-slate-500">{tm("tagline")}</p>
      </div>
    </div>
  );

  const SearchButton = (
    <button
      onClick={openSearch}
      className="flex w-full items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-left text-xs text-slate-500 transition-colors hover:border-indigo-200 hover:bg-white"
    >
      <Search className="h-3.5 w-3.5 shrink-0" />
      <span className="flex-1 truncate">{t("searchButton")}</span>
      <kbd className="hidden rounded border border-slate-200 bg-white px-1.5 py-0.5 font-sans text-[10px] text-slate-400 xl:inline">Ctrl K</kbd>
    </button>
  );

  const renderProfileCard = (inDrawer = false) => (
    <div className="rounded-xl border border-slate-200 bg-slate-50 p-2.5">
      <div className="flex items-center gap-2.5">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-indigo-600 text-xs font-bold text-white">
          {initials}
        </div>
        <div className="min-w-0 flex-1">
          <p className="flex items-center gap-1 truncate text-xs font-bold text-slate-900">
            <span className="truncate">{activeProfile?.name || t("noProfile")}</span>
            {isAdmin && <ShieldCheck className="h-3.5 w-3.5 shrink-0 text-slate-600" />}
          </p>
          <p className="truncate text-[10px] text-slate-500">{activeProfile?.email && !isTelegramPlaceholderEmail(activeProfile.email) ? activeProfile.email : activeProfile?.email ? "Telegram" : t("studentProfile")}</p>
        </div>
        {!inDrawer && <NotificationBell profileId={activeProfileId ?? null} placement="up" />}
      </div>
      <div className="mt-2 grid grid-cols-3 gap-1.5">
        <button
          onClick={() => {
            setDrawerOpen(false);
            onOpenProfileModal(false);
          }}
          className="flex min-w-0 flex-col items-center justify-center gap-0.5 rounded-lg border border-indigo-200 bg-indigo-50 px-0.5 py-1.5 text-[10px] font-bold leading-tight tracking-tight text-indigo-700 hover:bg-indigo-100"
          title={t("editProfile")}
        >
          <Pencil className="h-3.5 w-3.5" /> <span className="max-w-full truncate">{t("edit")}</span>
        </button>
        {onSwitchProfile && (
          <button
            onClick={() => {
              setDrawerOpen(false);
              onSwitchProfile();
            }}
            className="flex min-w-0 flex-col items-center justify-center gap-0.5 rounded-lg border border-slate-200 bg-white px-0.5 py-1.5 text-[10px] font-bold leading-tight tracking-tight text-slate-600 hover:bg-slate-100"
            title={t("switchAccountTitle")}
          >
            <ArrowLeftRight className="h-3.5 w-3.5" /> <span className="max-w-full truncate">{activeProfile ? t("switch") : t("signIn")}</span>
          </button>
        )}
        <button
          onClick={() => {
            setDrawerOpen(false);
            (onStartOnboarding ?? (() => onOpenProfileModal(true)))();
          }}
          className="flex min-w-0 flex-col items-center justify-center gap-0.5 rounded-lg border border-slate-200 bg-white px-0.5 py-1.5 text-[10px] font-bold leading-tight tracking-tight text-slate-600 hover:bg-slate-100"
          title={t("addNewTitle")}
        >
          <Plus className="h-3.5 w-3.5" /> <span className="max-w-full truncate">{t("addShort")}</span>
        </button>
      </div>
    </div>
  );

  const SettingsRow = (
    <div className="flex items-center justify-between gap-2">
      <LanguageSwitcher onLocaleChange={onLocaleChange} compact />
      <ThemeToggle />
      {onLogout && (
        <button
          onClick={onLogout}
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-red-200 bg-red-50 text-red-600 hover:bg-red-100"
          title={t("logout")}
          aria-label={t("logout")}
        >
          <LogOut className="h-3.5 w-3.5" />
        </button>
      )}
    </div>
  );

  return (
    <>
      {/* ================= LAPTOP / DESKTOP: LEFT SIDEBAR ================= */}
      <aside className="sticky top-0 z-40 hidden h-screen w-64 shrink-0 flex-col border-r border-slate-200 bg-white lg:flex xl:w-72">
        <button className="border-b border-slate-100 px-5 py-4 text-left" onClick={() => go("dashboard")}>
          {Logo}
        </button>
        <div className="px-3 pt-3">{SearchButton}</div>
        <nav className="no-scrollbar flex-1 overflow-y-auto px-3 py-3" aria-label={t("mainNav")}>
          {renderGroups("nav-active-desktop")}
        </nav>
        <div className="space-y-2.5 border-t border-slate-100 px-3 py-3">
          {renderProfileCard()}
          {SettingsRow}
        </div>
      </aside>

      {/* ================= PHONE / TABLET: TOP BAR ================= */}
      <header className="sticky top-0 z-40 w-full border-b border-slate-200 bg-white/95 shadow-xs backdrop-blur-md lg:hidden">
        <div className="flex h-14 items-center gap-2 px-3 sm:px-4">
          <button
            onClick={() => setDrawerOpen(true)}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-slate-700 hover:bg-slate-100"
            aria-label={t("openMenu")}
            aria-expanded={drawerOpen}
          >
            <Menu className="h-5 w-5" />
          </button>
          <button className="flex min-w-0 items-center gap-2" onClick={() => go("dashboard")}>
            <div className="h-8 w-8 shrink-0 overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
              <BrandingImage alt={t("logoAlt")} className="h-8 w-8 object-cover" />
            </div>
            <span className="truncate text-base font-bold tracking-tight text-slate-900">{tm("appName")}</span>
          </button>
          <div className="ml-auto flex shrink-0 items-center gap-1">
            <button
              onClick={openSearch}
              className="flex h-10 w-10 items-center justify-center rounded-lg text-slate-600 hover:bg-slate-100"
              aria-label={t("searchButton")}
            >
              <Search className="h-[18px] w-[18px]" />
            </button>
            <NotificationBell profileId={activeProfileId ?? null} />
            <span className="hidden sm:inline-flex">
              <ThemeSwitch />
            </span>
          </div>
        </div>
      </header>

      {/* ================= PHONE / TABLET: BOTTOM TAB BAR ================= */}
      <nav
        className="fixed inset-x-0 bottom-0 z-40 border-t border-slate-200 bg-white/95 pb-[env(safe-area-inset-bottom)] backdrop-blur-md lg:hidden"
        aria-label={t("quickNav")}
      >
        <div className="mx-auto grid max-w-xl grid-cols-5">
          {bottomItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => go(item.id)}
                aria-current={isActive ? "page" : undefined}
                className={`relative flex h-16 flex-col items-center justify-center gap-1 px-1 text-[10px] font-semibold transition-colors ${
                  isActive ? "text-indigo-600" : "text-slate-500 hover:text-slate-800"
                }`}
              >
                {isActive && (
                  <motion.span
                    layoutId="nav-active-bottom"
                    className="absolute top-0 h-0.5 w-10 rounded-full bg-indigo-600"
                    transition={LAYOUT_SPRING}
                  />
                )}
                <Icon className="h-5 w-5" />
                <span className="w-full truncate text-center leading-tight">{shortLabel(item.id, item.label)}</span>
              </button>
            );
          })}
          <button
            onClick={() => setDrawerOpen(true)}
            className={`flex h-16 flex-col items-center justify-center gap-1 px-1 text-[10px] font-semibold ${
              bottomItems.some((b) => b.id === activeTab) ? "text-slate-500" : "text-indigo-600"
            }`}
          >
            <Menu className="h-5 w-5" />
            <span>{t("more")}</span>
          </button>
        </div>
      </nav>

      {/* ================= PHONE / TABLET: SLIDE-IN MENU ================= */}
      <AnimatePresence>
        {drawerOpen && (
          <motion.div
            className="fixed inset-0 z-[60] lg:hidden"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <div className="absolute inset-0 bg-slate-950/50 backdrop-blur-[2px]" onClick={() => setDrawerOpen(false)} />
            <motion.aside
              className="absolute inset-y-0 left-0 flex w-[86vw] max-w-sm flex-col bg-white shadow-2xl"
              initial={{ x: "-100%" }}
              animate={{ x: 0 }}
              exit={{ x: "-100%" }}
              transition={{ type: "spring", stiffness: 380, damping: 38 }}
              role="dialog"
              aria-modal="true"
              aria-label={t("mainNav")}
            >
              <div className="flex items-center justify-between gap-2 border-b border-slate-100 px-4 py-3">
                {Logo}
                <button
                  onClick={() => setDrawerOpen(false)}
                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100"
                  aria-label={t("close")}
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
              <div className="space-y-2.5 px-3 pt-3">
                {renderProfileCard(true)}
                {SearchButton}
              </div>
              <nav className="flex-1 overflow-y-auto px-3 py-3">{renderGroups("nav-active-drawer")}</nav>
              <div className="border-t border-slate-100 px-3 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">{SettingsRow}</div>
            </motion.aside>
          </motion.div>
        )}
      </AnimatePresence>

      <CommandPalette
        key={searchKey}
        open={searchOpen}
        onClose={() => setSearchOpen(false)}
        items={paletteItems}
        onSelect={go}
        profileId={activeProfileId}
      />
    </>
  );
}
