"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { AnimatePresence, motion } from "framer-motion";
import {
  Activity,
  Award,
  Bot,
  CheckSquare,
  ChevronDown,
  Crown,
  FolderOpen,
  Gift,
  HandCoins,
  LayoutDashboard,
  ListChecks,
  LogOut,
  Menu,
  MessagesSquare,
  Pencil,
  Plane,
  Plus,
  Route,
  Search,
  Send,
  ShieldCheck,
  Target,
  Trophy,
  Users,
  X,
  Archive,
  ArrowLeftRight,
  Briefcase,
  CalendarClock,
  Calculator,
  ClipboardCheck,
  FileText,
  Headset,
  Home,
  Mic,
  PiggyBank,
  Rocket,
  Sparkles,
  Video,
  Globe2,
  Compass,
  Plug,
  Mail,
  PanelsTopLeft,
} from "lucide-react";
import { BrandingImage } from "./BrandingImage";
import { LanguageSwitcher } from "./LanguageSwitcher";
import { NotificationBell } from "./NotificationBell";
import { ThemeSwitch, ThemeToggle } from "./ThemeToggle";
import { CommandPalette, type PaletteItem } from "./CommandPalette";
import {
  DEFAULT_HIDDEN_NAV_ITEMS,
  NAV_GROUP_I18N,
  NAV_GROUP_ICONS,
  NAV_GROUPS,
  NAV_SECTIONS,
  NAV_UTILITY_SECTIONS,
  groupOfSection,
  isNewBadgeActive,
  parseHiddenNav,
  visiblePanes,
  type NavGroupId,
} from "@/lib/navSections";
import { isTelegramPlaceholderEmail } from "@/lib/telegram/placeholder";

export interface StudentProfile {
  id: number;
  name: string;
  email: string;
  degreeLevel: string;
  targetMajor: string;
  studyInterests?: string | null;
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
  isNew?: boolean;
  /** Palette-only rows (panes) never render in the sidebar. */
  pane?: boolean;
  hint?: string;
}

/** Icon per destination id (labels come from i18n, groups from navSections). */
const ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  dashboard: LayoutDashboard,
  universities: Search,
  scholarships: Award,
  "study-plan": Route,
  tasks: ListChecks,
  profile: Target,
  funding: PiggyBank,
  applications: CheckSquare,
  materials: FolderOpen,
  offers: Trophy,
  "post-admission-funding": HandCoins,
  visa: Plane,
  guidance: Bot,
  community: MessagesSquare,
  // utility / account
  payments: Crown,
  notifications: Send,
  rewards: Gift,
  parent: Home,
  admin: ShieldCheck,
  // pane icons (command palette)
  careers: Briefcase,
  matches: Sparkles,
  outlook: Compass,
  countries: Globe2,
  browse: Award,
  recommended: Rocket,
  opportunities: Compass,
  plan: Route,
  tests: ClipboardCheck,
  tools: Calculator,
  deadlines: CalendarClock,
  readiness: Activity,
  goals: Target,
  activities: Users,
  stories: Trophy,
  similar: Users,
  tracker: CheckSquare,
  workspace: PanelsTopLeft,
  requirements: ListChecks,
  documents: Archive,
  essays: FileText,
  interviews: MessagesSquare,
  departure: Plane,
  mentor: Bot,
  consulting: Headset,
  faq: Search,
  forum: MessagesSquare,
  courses: Video,
  learning: Plug,
  recommendations: Mail,
  sop: FileText,
  vault: Archive,
  chat: Sparkles,
  visaPane: Mic,
};

/** i18n key per destination label (source of truth for the wording). */
const LABEL_KEYS: Record<string, string> = {
  dashboard: "dashboard",
  universities: "universities",
  scholarships: "scholarships",
  "study-plan": "studyPlan",
  tasks: "tasks",
  profile: "profileGoals",
  funding: "fundingPlan",
  applications: "myApplications",
  materials: "materials",
  offers: "offers",
  "post-admission-funding": "postAdmissionFunding",
  visa: "visaDeparture",
  guidance: "guidance",
  community: "community",
  payments: "payments",
  notifications: "notifications",
  rewards: "rewards",
  parent: "parent",
  admin: "adminPanel",
};

/** Legacy names a student may still type ("Answer Vault", "My Chances"…). */
const PANE_KEYWORDS: Record<string, string> = {
  "universities/careers": "Career & Major Explorer careers majors jobs",
  "universities/matches": "Program Recommender program match recommendations",
  "universities/outlook": "My Chances chancing admission outlook fit probability",
  "universities/countries": "Country Compare compare countries",
  "scholarships/browse": "Scholarship Hub scholarships browse saved",
  "scholarships/recommended": "Scholarship Autopilot autopilot matched queue",
  "scholarships/opportunities": "Opportunities feed competitions summer schools",
  "study-plan/plan": "My Study Plan phases plan",
  "study-plan/tests": "Test Planner IELTS TOEFL SAT test prep",
  "study-plan/tools": "Cost calculator planning scholarship portfolio CV comparison",
  "tasks/tasks": "Tasks & Roadmap task roadmap todo",
  "tasks/deadlines": "Deadlines deadline center calendar",
  "profile/readiness": "Profile Strength readiness audit improve",
  "profile/goals": "Goal Planner goals",
  "profile/activities": "My Activities extracurricular activities portfolio",
  "profile/stories": "Admission Stories stories admitted students",
  "profile/similar": "Students Like Me similar profiles",
  "applications/tracker": "Applications tracker status",
  "applications/workspace": "Application Workspace workspace per university",
  "materials/requirements": "Application Requirements requirements checklist",
  "materials/documents": "Documents Answer Vault document vault reusable answers",
  "materials/essays": "AI SOP & Essays Recommendation Manager essays SOP recommendation letters",
  "materials/interviews": "Interview Center interview practice",
  "visa/visa": "Visa Center visa speaking case appointment",
  "visa/departure": "Departure Planner checklist flight housing packing",
  "guidance/mentor": "AI Mentor AI Advisor chat admissions advisor",
  "guidance/consulting": "Consulting mentors book a consultant",
  "guidance/faq": "FAQ frequently asked questions help",
  "community/forum": "Community Forum forum discussions",
  "community/courses": "Courses video lessons certificates learning",
};

const LAYOUT_SPRING = { type: "spring" as const, stiffness: 420, damping: 34 };

/**
 * The phone/tablet bottom bar: FOUR destinations plus "More".
 *
 * The four are the groups a student moves between all day (Home, Explore,
 * My Plan, Applications). Everything else — After Admission, Help & Learning
 * and the account cluster — lives behind More, which opens the same list the
 * desktop sidebar shows. No horizontal scrolling strip: every destination is
 * either one tap away or one tap + one tap away.
 */
const BOTTOM_BAR_GROUPS: { group: NavGroupId; section: string; icon: React.ComponentType<{ className?: string }>; labelKey: string }[] = [
  { group: "home", section: "dashboard", icon: LayoutDashboard, labelKey: "tabHome" },
  { group: "explore", section: "universities", icon: Search, labelKey: "tabExplore" },
  { group: "plan", section: "study-plan", icon: Route, labelKey: "tabPlan" },
  { group: "applications", section: "applications", icon: CheckSquare, labelKey: "tabApps" },
];

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
  const tp = useTranslations("navPanes");

  // Admin → Navigation: ids hidden for EVERYONE (admin included). Hiding a
  // destination removes it from the sidebar; hiding a pane removes that tab.
  const [hiddenItems, setHiddenItems] = useState<string[]>([...DEFAULT_HIDDEN_NAV_ITEMS]);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchKey, setSearchKey] = useState(0);
  // Groups start collapsed and the group holding the active destination opens
  // itself, so the sidebar always shows where the student is without a wall of
  // links. Collapsing another group is remembered for the session.
  const activeGroup = useMemo(() => groupOfSection(activeTab), [activeTab]);
  const [collapsedGroups, setCollapsedGroups] = useState<Record<string, boolean>>(
    () => Object.fromEntries(NAV_GROUPS.map((group) => [group, group !== activeGroup]))
  );

  useEffect(() => {
    if (!activeGroup) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- opening the group that contains the page the student just opened is the point of this hook
    setCollapsedGroups((prev) => (prev[activeGroup] ? { ...prev, [activeGroup]: false } : prev));
  }, [activeGroup]);

  useEffect(() => {
    let alive = true;
    const loadHidden = async () => {
      try {
        const res = await fetch("/api/config/nav", { cache: "no-store" });
        const data = await res.json();
        if (alive && Array.isArray(data.hidden)) {
          // Re-normalize on the client too: legacy configs can otherwise hide
          // a locked destination and the Edit Profile link would bounce back to
          // the dashboard when its target pane is opened.
          setHiddenItems(parseHiddenNav(JSON.stringify(data.hidden)));
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

  // If the admin hides the destination the user is currently on, land them back
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

  // Lock page scroll behind the open drawer (phones/tablets) and move focus
  // into it, so a keyboard or screen-reader user is never left behind the
  // overlay. Focus returns to the trigger when the drawer closes.
  const drawerRef = useRef<HTMLElement | null>(null);
  const drawerTriggerRef = useRef<HTMLElement | null>(null);
  useEffect(() => {
    if (!drawerOpen) return;
    const previous = document.activeElement as HTMLElement | null;
    drawerTriggerRef.current = previous;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const node = drawerRef.current;
    const focusables = () =>
      [...(node?.querySelectorAll<HTMLElement>('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])') ?? [])].filter(
        (el) => !el.hasAttribute("disabled") && el.offsetParent !== null
      );
    window.setTimeout(() => focusables()[0]?.focus(), 20);
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Tab") return;
      const list = focusables();
      if (list.length === 0) return;
      const first = list[0];
      const last = list[list.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };
    document.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prevOverflow;
      document.removeEventListener("keydown", onKey);
      drawerTriggerRef.current?.focus?.();
    };
  }, [drawerOpen]);

  const isAdmin = !!activeProfile?.isAdmin;

  const labelFor = useCallback(
    (id: string): string => {
      const key = LABEL_KEYS[id];
      if (key) return t(key);
      const utility = NAV_UTILITY_SECTIONS.find((u) => u.id === id);
      if (utility) return t(id === "admin" ? "adminPanel" : id);
      return id;
    },
    [t]
  );

  const hintFor = useCallback(
    (id: string): string | undefined => {
      const section = NAV_SECTIONS.find((s) => s.id === id);
      if (section) {
        const hintKey = "hint" + id.replace(/(^|-)([a-z])/g, (_m, _p, c: string) => c.toUpperCase());
        const translated = th.has?.(hintKey) ? th(hintKey) : undefined;
        return translated ?? section.description;
      }
      const utility = NAV_UTILITY_SECTIONS.find((u) => u.id === id);
      return utility?.description;
    },
    [th]
  );

  const visibleDestinations = useMemo(
    () =>
      NAV_SECTIONS.filter((s) => !hiddenItems.includes(s.id)).map((s) => ({
        id: s.id,
        label: labelFor(s.id),
        icon: ICONS[s.id] ?? Sparkles,
        group: s.group,
        premium: !!s.premium,
        isNew: !!s.isNew && isNewBadgeActive(),
      })) as NavItem[],
    [hiddenItems, labelFor]
  );

  const utilityItems = useMemo(() => {
    const list: NavItem[] = NAV_UTILITY_SECTIONS.filter((u) => !hiddenItems.includes(u.id) && (!u.adminOnly || isAdmin)).map((u) => ({
      id: u.id,
      label: labelFor(u.id),
      icon: ICONS[u.id] ?? Sparkles,
      group: "home" as NavGroupId, // never grouped in the sidebar; kept for the palette
      premium: !!u.premium,
      isNew: !!u.isNew && isNewBadgeActive(),
      hint: u.description,
    }));
    return list;
  }, [hiddenItems, isAdmin, labelFor]);

  /* Populated on demand — panes are searchable so "Answer Vault" still lands
     on Application Materials → Documents & saved answers. */
  const paneItems: PaletteItem[] = useMemo(() => {
    const out: PaletteItem[] = [];
    for (const section of NAV_SECTIONS) {
      if (hiddenItems.includes(section.id)) continue;
      for (const pane of visiblePanes(section.id, hiddenItems)) {
        out.push({
          id: `${section.id}/${pane.id}`,
          label: `${labelFor(section.id)} → ${tp(pane.id as never)}`,
          hint: `${pane.description} ${PANE_KEYWORDS[`${section.id}/${pane.id}`] ?? ""}`.trim(),
          group: t(NAV_GROUP_I18N[section.group]),
          icon: ICONS[pane.id] ?? Sparkles,
          premium: !!pane.premium,
        });
      }
    }
    return out;
  }, [hiddenItems, labelFor, tp, t]);

  const paletteItems: PaletteItem[] = useMemo(
    () => [
      ...visibleDestinations.map((i) => ({
        id: i.id,
        label: i.label,
        hint: hintFor(i.id),
        group: t(NAV_GROUP_I18N[i.group]),
        icon: i.icon,
        isNew: i.isNew,
        premium: i.premium,
      })),
      ...paneItems,
      ...utilityItems.map((i) => ({ id: i.id, label: i.label, hint: i.hint, icon: i.icon, isNew: i.isNew, premium: i.premium })),
    ],
    [visibleDestinations, paneItems, utilityItems, hintFor, t]
  );

  const go = useCallback(
    (id: string) => {
      setDrawerOpen(false);
      setActiveTab(id);
      // New destination → start at the top (especially on phones).
      try {
        window.scrollTo({ top: 0, behavior: "instant" as ScrollBehavior });
      } catch {
        window.scrollTo(0, 0);
      }
    },
    [setActiveTab]
  );

  const initials = (activeProfile?.name || "?")
    .split(/\s+/)
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  const isDestinationActive = (id: string) => activeTab === id;

  // ---- One nav row (sidebar + drawer) -------------------------------------
  const renderItem = (item: NavItem, layoutId: string) => {
    const inDrawer = layoutId === "nav-active-drawer";
    const Icon = item.icon;
    const isActive = isDestinationActive(item.id);
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
      ? "text-amber-700 hover:bg-amber-50 hover:text-amber-800 dark:text-amber-300 dark:hover:bg-amber-500/10"
      : "text-slate-600 hover:text-slate-900 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-white";
    return (
      <button
        key={item.id}
        onClick={() => go(item.id)}
        aria-current={isActive ? "page" : undefined}
        className={`relative flex min-h-9 w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-[13px] font-medium transition-colors duration-150 ${stateCls}`}
      >
        {isActive && (
          <motion.span layoutId={layoutId} className={`absolute inset-0 rounded-lg shadow-xs ${activeBg}`} transition={LAYOUT_SPRING} />
        )}
        <Icon className={`relative h-4 w-4 shrink-0 ${isActive ? "" : item.premium ? "text-amber-500" : "text-slate-500 dark:text-slate-400"}`} />
        <span className="relative flex-1 truncate">{item.label}</span>
        {item.isNew && !isActive && (
          <span className={`relative shrink-0 rounded-full bg-emerald-100 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300 ${inDrawer ? "" : "hidden xl:inline"}`}>
            {t("newBadge")}
          </span>
        )}
        {item.premium && !isActive && (
          <span className="relative rounded-full bg-amber-100 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide text-amber-700 dark:bg-amber-500/20 dark:text-amber-300">
            {t("proBadge")}
          </span>
        )}
      </button>
    );
  };

  /**
   * A group heading with its destinations underneath. Home is the one group
   * that is a single direct link (Dashboard) — the spec asks for it to stay a
   * plain row, not a disclosure.
   */
  const renderGroup = (g: NavGroupId, items: NavItem[], layoutId: string) => {
    if (g === "home") {
      return (
        <div key={g} className="space-y-0.5">
          {items.map((item) => renderItem(item, layoutId))}
        </div>
      );
    }
    const open = !collapsedGroups[g];
    return (
      <div key={g}>
        <button
          type="button"
          onClick={() => setCollapsedGroups((prev) => ({ ...prev, [g]: !prev[g] }))}
          aria-expanded={open}
          className="mb-1 flex min-h-9 w-full items-center gap-1.5 rounded-lg px-3 py-1.5 text-left text-[10px] font-bold uppercase tracking-wider text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-700 dark:text-slate-400 dark:hover:bg-slate-800"
        >
          <span aria-hidden>{NAV_GROUP_ICONS[g]}</span>
          {t(NAV_GROUP_I18N[g])}
          {!open && items.length > 0 && (
            // The badge is a visual hint; the accessible name of the group
            // button stays just the group name ("Explore"), so a screen reader
            // does not announce a bare number before the collapsed state.
            <span aria-hidden="true" className="ml-auto rounded-full bg-slate-100 px-1.5 py-0.5 text-[10px] font-semibold leading-none text-slate-500 dark:bg-slate-800 dark:text-slate-400">
              {items.length}
            </span>
          )}
          <ChevronDown className={`h-3.5 w-3.5 shrink-0 transition-transform ${open ? "rotate-180" : ""}`} aria-hidden />
        </button>
        {open && <div className="space-y-0.5">{items.map((item) => renderItem(item, layoutId))}</div>}
      </div>
    );
  };

  const renderGroups = (layoutId: string) => (
    <div className="space-y-3">
      {NAV_GROUPS.map((g) => ({ g, items: visibleDestinations.filter((i) => i.group === g) }))
        .filter((x) => x.items.length > 0)
        .map(({ g, items }) => renderGroup(g, items, layoutId))}
    </div>
  );

  const renderUtility = (layoutId: string) => (
    <div className="mt-4 border-t border-slate-100 pt-3 dark:border-slate-800">
      <p className="mb-1 px-3 text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">{t("accountCluster")}</p>
      <div className="space-y-0.5">{utilityItems.map((item) => renderItem(item, `${layoutId}-utility`))}</div>
    </div>
  );

  const Logo = (
    <div className="flex items-center gap-2.5 min-w-0">
      <div className="h-9 w-9 shrink-0 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-md shadow-indigo-200 dark:border-slate-700">
        <BrandingImage alt={t("logoAlt")} className="h-9 w-9 object-cover" />
      </div>
      <div className="min-w-0">
        <span className="block truncate text-lg font-bold tracking-tight text-slate-900 dark:text-white">{tm("appName")}</span>
        <p className="truncate text-[10px] text-slate-500 dark:text-slate-400">{tm("tagline")}</p>
      </div>
    </div>
  );

  const SearchButton = (
    <button
      onClick={openSearch}
      className="flex w-full items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-left text-xs text-slate-500 transition-colors hover:border-indigo-200 hover:bg-white dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300"
    >
      <Search className="h-3.5 w-3.5 shrink-0" />
      <span className="flex-1 truncate">{t("searchButton")}</span>
      <kbd className="hidden rounded border border-slate-200 bg-white px-1.5 py-0.5 font-sans text-[10px] text-slate-500 dark:border-slate-600 dark:bg-slate-900 xl:inline">Ctrl K</kbd>
    </button>
  );

  const renderProfileCard = (inDrawer = false) => (
    <div className="rounded-xl border border-slate-200 bg-slate-50 p-2.5 dark:border-slate-700 dark:bg-slate-800/60">
      <div className="flex items-center gap-2.5">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-indigo-600 text-xs font-bold text-white">
          {initials}
        </div>
        <div className="min-w-0 flex-1">
          <p className="flex items-center gap-1 truncate text-xs font-bold text-slate-900 dark:text-white">
            <span className="truncate">{activeProfile?.name || t("noProfile")}</span>
            {isAdmin && <ShieldCheck className="h-3.5 w-3.5 shrink-0 text-slate-600 dark:text-slate-300" />}
          </p>
          <p className="truncate text-[10px] text-slate-500 dark:text-slate-400">
            {activeProfile?.email && !isTelegramPlaceholderEmail(activeProfile.email) ? activeProfile.email : activeProfile?.email ? "Telegram" : t("studentProfile")}
          </p>
        </div>
        {!inDrawer && <NotificationBell profileId={activeProfileId ?? null} />}
      </div>
      <div className="mt-2 grid grid-cols-3 gap-1.5">
        <button
          onClick={() => {
            setDrawerOpen(false);
            onOpenProfileModal(false);
          }}
          className="flex min-h-11 min-w-0 flex-col items-center justify-center gap-0.5 rounded-lg border border-indigo-200 bg-indigo-50 px-0.5 py-1.5 text-[10px] font-bold leading-tight tracking-tight text-indigo-700 hover:bg-indigo-100 dark:border-indigo-500/40 dark:bg-indigo-500/10 dark:text-indigo-300"
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
            className="flex min-h-11 min-w-0 flex-col items-center justify-center gap-0.5 rounded-lg border border-slate-200 bg-white px-0.5 py-1.5 text-[10px] font-bold leading-tight tracking-tight text-slate-600 hover:bg-slate-100 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-200"
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
          className="flex min-h-11 min-w-0 flex-col items-center justify-center gap-0.5 rounded-lg border border-slate-200 bg-white px-0.5 py-1.5 text-[10px] font-bold leading-tight tracking-tight text-slate-600 hover:bg-slate-100 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-200"
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
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-red-200 bg-red-50 text-red-600 hover:bg-red-100 dark:border-red-500/40 dark:bg-red-500/10 dark:text-red-300"
          title={t("logout")}
          aria-label={t("logout")}
        >
          <LogOut className="h-3.5 w-3.5" />
        </button>
      )}
    </div>
  );

  // The bottom bar only offers groups that still have a visible destination.
  const bottomItems = BOTTOM_BAR_GROUPS.filter((b) => visibleDestinations.some((d) => d.group === b.group));
  const activeInBottomBar = bottomItems.some((b) => b.group === activeGroup);

  return (
    <>
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:left-3 focus:top-3 focus:z-[70] focus:rounded-lg focus:bg-indigo-600 focus:px-4 focus:py-2 focus:text-sm focus:font-semibold focus:text-white"
      >
        {t("skipToContent")}
      </a>

      {/* ================= LAPTOP / DESKTOP: LEFT SIDEBAR ================= */}
      <aside className="sticky top-0 z-40 hidden h-screen w-64 shrink-0 flex-col border-r border-slate-200 bg-white lg:flex xl:w-72 dark:border-slate-800 dark:bg-slate-900">
        <button className="border-b border-slate-100 px-5 py-4 text-left dark:border-slate-800" onClick={() => go("dashboard")}>
          {Logo}
        </button>
        <div className="px-3 pt-3">{SearchButton}</div>
        <nav className="no-scrollbar flex-1 overflow-y-auto overscroll-contain px-3 py-3" aria-label={t("mainNav")}>
          {renderGroups("nav-active-desktop")}
          {renderUtility("nav-active-desktop")}
        </nav>
        <div className="shrink-0 space-y-2.5 border-t border-slate-100 px-3 py-3 dark:border-slate-800">
          {renderProfileCard()}
          {SettingsRow}
        </div>
      </aside>

      {/* ================= PHONE / TABLET: TOP BAR ================= */}
      <header className="sticky top-0 z-40 w-full border-b border-slate-200 bg-white/95 shadow-xs backdrop-blur-md lg:hidden dark:border-slate-800 dark:bg-slate-900/95">
        <div className="flex h-14 items-center gap-2 px-3 sm:px-4">
          <button
            onClick={() => setDrawerOpen(true)}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800"
            aria-label={t("openMenu")}
            aria-expanded={drawerOpen}
            aria-haspopup="dialog"
          >
            <Menu className="h-5 w-5" />
          </button>
          <button className="flex min-w-0 items-center gap-2" onClick={() => go("dashboard")}>
            <div className="h-8 w-8 shrink-0 overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm dark:border-slate-700">
              <BrandingImage alt={t("logoAlt")} className="h-8 w-8 object-cover" />
            </div>
            <span className="truncate text-base font-bold tracking-tight text-slate-900 dark:text-white">{tm("appName")}</span>
          </button>
          <div className="ml-auto flex shrink-0 items-center gap-1">
            <button
              onClick={openSearch}
              className="flex h-10 w-10 items-center justify-center rounded-lg text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
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
        className="fixed inset-x-0 bottom-0 z-40 border-t border-slate-200 bg-white/95 pb-[env(safe-area-inset-bottom)] backdrop-blur-md lg:hidden dark:border-slate-800 dark:bg-slate-900/95"
        aria-label={t("quickNav")}
      >
        <div className="mx-auto grid max-w-xl grid-cols-5">
          {bottomItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeGroup === item.group;
            return (
              <button
                key={item.group}
                onClick={() => go(item.section)}
                aria-current={isActive ? "page" : undefined}
                className={`relative flex min-h-16 flex-col items-center justify-center gap-1 px-1 py-1.5 text-[10px] font-semibold transition-colors ${
                  isActive ? "text-indigo-600 dark:text-indigo-300" : "text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white"
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
                <span className="w-full truncate text-center leading-tight">{t(item.labelKey)}</span>
              </button>
            );
          })}
          <button
            onClick={() => setDrawerOpen(true)}
            aria-expanded={drawerOpen}
            aria-haspopup="dialog"
            className={`relative flex min-h-16 flex-col items-center justify-center gap-1 px-1 py-1.5 text-[10px] font-semibold ${
              activeInBottomBar ? "text-slate-500 dark:text-slate-400" : "text-indigo-600 dark:text-indigo-300"
            }`}
          >
            <Menu className="h-5 w-5" />
            <span>{t("tabMore")}</span>
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
              ref={drawerRef}
              className="absolute inset-y-0 left-0 flex w-[88vw] max-w-sm flex-col bg-white shadow-2xl dark:bg-slate-900"
              initial={{ x: "-100%" }}
              animate={{ x: 0 }}
              exit={{ x: "-100%" }}
              transition={{ type: "spring", stiffness: 380, damping: 38 }}
              role="dialog"
              aria-modal="true"
              aria-label={t("mainNav")}
            >
              <div className="flex items-center justify-between gap-2 border-b border-slate-100 px-4 py-3 dark:border-slate-800">
                {Logo}
                <button
                  onClick={() => setDrawerOpen(false)}
                  className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
                  aria-label={t("close")}
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
              <div className="space-y-2.5 px-3 pt-3">
                {renderProfileCard(true)}
                {SearchButton}
              </div>
              <nav className="flex-1 overflow-y-auto overscroll-contain px-3 py-3" aria-label={t("mainNav")}>
                {renderGroups("nav-active-drawer")}
                {renderUtility("nav-active-drawer")}
              </nav>
              <div className="border-t border-slate-100 px-3 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] dark:border-slate-800">{SettingsRow}</div>
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
