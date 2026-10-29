"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import dynamic from "next/dynamic";
import { useTranslations } from "next-intl";
import { Navbar, StudentProfile } from "@/components/Navbar";
import type { SavedUniversityItem, SavedScholarshipItem } from "@/components/ApplicationTracker";
import { PremiumGate } from "@/components/PremiumGate";
import { LandingPage } from "@/components/LandingPage";
import { LocaleProvider, useLocaleContext } from "@/i18n/LocaleProvider";
import { defaultLocale, type Locale } from "@/i18n/config";
import type { Messages } from "@/i18n/messages";
import { trackScreen } from "@/lib/tracker";
import { scheduleWhenIdle } from "@/lib/idle";
import { invalidateCatalogSwr } from "@/lib/clientCatalogSwr";
import { loadBootConfig } from "@/lib/bootConfig";
import { PageTransition } from "@/components/motion";
import {
  DEFAULT_HIDDEN_NAV_ITEMS,
  isProfileEditorTarget,
  parseHiddenNav,
  resolveNavTarget,
} from "@/lib/navSections";
import { SectionIntro } from "@/components/SectionIntro";
import { AppNote } from "@/components/AppNote";
import { TelegramNudge } from "@/components/telegram/TelegramNudge";
import { DailyStreakCard } from "@/components/DailyStreakCard";
import { PanelSkeleton } from "@/components/hubs/ui";
import {
  SESSION_RESTORE_MAX_ATTEMPTS,
  sessionRestoreDelayMs,
  shouldRetrySessionRestore,
} from "@/lib/sessionRestore";

/**
 * Every heavy screen is a separate chunk: the admin panel, the payments and
 * rewards areas, the Telegram settings, the session list and the thirteen
 * destination hubs. Opening the landing page therefore downloads the landing
 * page — not the visa studio's speech SDK.
 */
const panelLoading = () => <PanelSkeleton rows={4} />;
const ProfileModal = dynamic(() => import("@/components/ProfileModal").then((m) => m.ProfileModal), { loading: panelLoading });
const ProfilePicker = dynamic(() => import("@/components/ProfilePicker").then((m) => m.ProfilePicker), { loading: panelLoading });
const OnboardingWizard = dynamic(() => import("@/components/OnboardingWizard").then((m) => m.OnboardingWizard), { loading: panelLoading });
const JourneyControlCenter = dynamic(() => import("@/components/journey/JourneyControlCenter").then((m) => m.JourneyControlCenter), { loading: panelLoading });
const PaymentsSection = dynamic(() => import("@/components/PaymentsSection").then((m) => m.PaymentsSection), { loading: panelLoading });
const RewardsSection = dynamic(() => import("@/components/RewardsSection").then((m) => m.RewardsSection), { loading: panelLoading });
const ParentDashboard = dynamic(() => import("@/components/ParentDashboard").then((m) => m.ParentDashboard), { loading: panelLoading });
const AdminPanel = dynamic(() => import("@/components/AdminPanel").then((m) => m.AdminPanel), { loading: panelLoading });
const GuidedJourneyBar = dynamic(() => import("@/components/GuidedJourneyBar").then((m) => m.GuidedJourneyBar), { loading: () => null });
const TelegramSettings = dynamic(() => import("@/components/telegram/TelegramSettings").then((m) => m.TelegramSettings), { loading: panelLoading });
const SessionsPanel = dynamic(() => import("@/components/SessionsPanel").then((m) => m.SessionsPanel), { loading: panelLoading });

const UniversitiesHub = dynamic(() => import("@/components/hubs").then((m) => m.UniversitiesHub));
const ScholarshipsHub = dynamic(() => import("@/components/hubs").then((m) => m.ScholarshipsHub));
const StudyPlanHub = dynamic(() => import("@/components/hubs").then((m) => m.StudyPlanHub));
const TasksHub = dynamic(() => import("@/components/hubs").then((m) => m.TasksHub));
const ProfileHub = dynamic(() => import("@/components/hubs").then((m) => m.ProfileHub));
const FundingHub = dynamic(() => import("@/components/hubs").then((m) => m.FundingHub));
const ApplicationsHub = dynamic(() => import("@/components/hubs").then((m) => m.ApplicationsHub));
const MaterialsHub = dynamic(() => import("@/components/hubs").then((m) => m.MaterialsHub));
const OffersHub = dynamic(() => import("@/components/hubs").then((m) => m.OffersHub));
const PostAdmissionFundingHub = dynamic(() => import("@/components/hubs").then((m) => m.PostAdmissionFundingHub));
const VisaHub = dynamic(() => import("@/components/hubs").then((m) => m.VisaHub));
const GuidanceHub = dynamic(() => import("@/components/hubs").then((m) => m.GuidanceHub));
const CommunityHub = dynamic(() => import("@/components/hubs").then((m) => m.CommunityHub));

/**
 * Any destination, pane, legacy section id or utility screen may appear in the
 * URL hash (`#universities`, `#universities/outlook`, `#vault`, `#payments`).
 * Legacy section ids still resolve, and former profile-editor links open the
 * modal instead of navigating to a removed pane.
 */
function targetFromHash(): { section: string; pane: string | null; openProfileEditor?: boolean } | null {
  if (typeof window === "undefined") return null;
  const raw = decodeURIComponent(window.location.hash.replace(/^#/, "")).trim();
  if (!raw) return null;
  if (isProfileEditorTarget(raw)) {
    const profile = resolveNavTarget("profile");
    return profile ? { section: profile.section, pane: profile.pane, openProfileEditor: true } : null;
  }
  const target = resolveNavTarget(raw);
  if (!target) return null;
  return { section: target.section, pane: target.utility ? null : target.pane };
}

const sessionCopy: Record<
  Locale,
  { opening: string; checking: string; noticeTitle: string; noticeBody: string; retry: string; dismiss: string }
> = {
  en: {
    opening: "Opening ScholarBridge…",
    checking: "Checking your secure session.",
    noticeTitle: "Your session could not be checked",
    noticeBody: "The server is briefly unreachable, so you are browsing as a visitor. The site keeps working and your sign-in is kept.",
    retry: "Try again",
    dismiss: "Dismiss",
  },
  uz: {
    opening: "ScholarBridge ochilmoqda…",
    checking: "Xavfsiz seansingiz tekshirilmoqda.",
    noticeTitle: "Seansingizni tekshirib bo‘lmadi",
    noticeBody: "Server bilan aloqa vaqtincha uzildi, shu sababli saytni mehmon sifatida ko‘ryapsiz. Sayt ishlashda davom etadi, kirishingiz saqlanadi.",
    retry: "Qayta urinish",
    dismiss: "Yopish",
  },
  ru: {
    opening: "Открываем ScholarBridge…",
    checking: "Проверяем защищённую сессию.",
    noticeTitle: "Не удалось проверить сессию",
    noticeBody: "Сервер временно недоступен, поэтому вы просматриваете сайт как гость. Сайт продолжает работать, вход сохраняется.",
    retry: "Повторить",
    dismiss: "Закрыть",
  },
};

function SessionRestoreLoader() {
  const { locale } = useLocaleContext();
  const text = sessionCopy[locale];
  return (
    <main className="grid min-h-screen place-items-center bg-slate-50 px-4 text-center dark:bg-slate-950">
      <div role="status" aria-live="polite" className="space-y-4">
        <span className="mx-auto block h-10 w-10 animate-spin rounded-full border-4 border-indigo-100 border-t-indigo-600" />
        <div>
          <p className="font-semibold text-slate-900 dark:text-white">{text.opening}</p>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">{text.checking}</p>
        </div>
      </div>
    </main>
  );
}

/**
 * A session that cannot be checked right now is NOT a dead end.
 *
 * The old behaviour replaced the whole app with "Dashboard temporarily
 * unavailable", so a database that was waking up (Supabase unpausing, a pooler
 * restart, a cold Render instance) made the public site unusable for every
 * signed-in visitor. Now the landing page renders as usual and this banner
 * explains the situation, keeps the cookie untouched, and offers a retry.
 */
function SessionNotice({
  message,
  onRetry,
  onDismiss,
}: {
  message: string | null;
  onRetry: () => void;
  onDismiss: () => void;
}) {
  const { locale } = useLocaleContext();
  const text = sessionCopy[locale];
  return (
    <div className="pointer-events-none fixed inset-x-0 top-0 z-[60] flex justify-center px-3 pt-3">
      <div
        role="status"
        className="pointer-events-auto flex w-full max-w-2xl flex-wrap items-start gap-3 rounded-2xl border border-amber-300 bg-amber-50 px-4 py-3 text-left shadow-lg dark:border-amber-700 dark:bg-amber-950"
      >
        <div className="min-w-0 flex-1">
          <p className="text-sm font-bold text-amber-900 dark:text-amber-100">{text.noticeTitle}</p>
          <p className="mt-0.5 text-xs text-amber-800 dark:text-amber-200">{message || text.noticeBody}</p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <button
            type="button"
            onClick={onRetry}
            className="rounded-lg bg-amber-600 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-amber-700"
          >
            {text.retry}
          </button>
          <button
            type="button"
            onClick={onDismiss}
            className="rounded-lg border border-amber-300 px-3 py-1.5 text-xs font-semibold text-amber-900 transition hover:bg-amber-100 dark:border-amber-700 dark:text-amber-100 dark:hover:bg-amber-900"
          >
            {text.dismiss}
          </button>
        </div>
      </div>
    </div>
  );
}

function ParentDashboardGate({
  activeProfile,
  onUpgrade,
}: {
  activeProfile: StudentProfile | null;
  onUpgrade: () => void;
}) {
  const t = useTranslations("parentDashboard");
  return (
    <PremiumGate
      profileId={activeProfile?.id ?? null}
      feature="parent_dashboard"
      title={t("premiumTitle")}
      description={t("premiumDescription")}
      onUpgrade={onUpgrade}
    >
      <ParentDashboard key={activeProfile?.id ?? "no-profile"} activeProfile={activeProfile} />
    </PremiumGate>
  );
}

export function Home({
  hasSessionCookie = false,
  startNow = false,
  initialLocale = defaultLocale,
  initialMessages = null,
}: {
  hasSessionCookie?: boolean;
  /**
   * `/?start=1` — the "start now" link the public pages use.
   *
   * A reader arriving from a channel post lands on a scholarship page, not on
   * the landing page, so every public CTA has to open the onboarding directly.
   * The flag is resolved on THE SERVER (see app/page.tsx) and passed in as a
   * prop: reading the query string in an effect meant the wizard only appeared
   * after hydration, and setting state inside an effect is exactly what
   * react-hooks/set-state-in-effect forbids. As a prop, the first paint is
   * already the wizard and hydration matches.
   */
  startNow?: boolean;
  /** Locale the server resolved from the cookie — keeps SSR and hydration in one language. */
  initialLocale?: Locale;
  /** That locale's dictionary when it is not English (English is bundled). */
  initialMessages?: Messages | null;
}) {
  // The open destination (one of the fourteen) and, inside a multi-tab
  // destination, the open tab. Both live in the URL hash so Back/Forward,
  // bookmarks and Telegram deep links keep working.
  const [activeTab, setActiveTabState] = useState("dashboard");
  const [activePane, setActivePane] = useState<string | null>(null);
  // Ids an admin has turned off (Admin → Navigation). Hubs honour them too, so
  // a hidden tab is never reachable in the middle of a page.
  const [hiddenNav, setHiddenNav] = useState<string[]>([...DEFAULT_HIDDEN_NAV_ITEMS]);
  // "restoring" = checking the HttpOnly session before choosing a screen,
  // "landing"   = visitor with no active session,
  // "wizard"    = step-by-step onboarding for a brand-new user,
  // "app"       = the main app (sidebar navigation).
  // A visitor without a session cookie has nothing to restore: the server
  // already told us so (see app/page.tsx), and starting on the landing page
  // lets it be server-rendered — visible to crawlers and painted instantly.
  // Returning students still start in "restoring" so they never flash the
  // public welcome page while their valid session is being checked.
  const [view, setView] = useState<"restoring" | "landing" | "wizard" | "app">(
    // A signed-in student always starts by restoring; a visitor with `?start=1`
    // goes straight into the wizard.
    hasSessionCookie ? "restoring" : startNow ? "wizard" : "landing"
  );
  const [restoreError, setRestoreError] = useState<string | null>(null);

  // Profile management — the app works with ONE signed-in profile per browser.
  // `profiles` is used by the picker to show this device's saved accounts.
  const [profiles, setProfiles] = useState<StudentProfile[]>([]);
  const [activeProfile, setActiveProfile] = useState<StudentProfile | null>(null);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [isNewProfile, setIsNewProfile] = useState(false);
  const [isPickerOpen, setIsPickerOpen] = useState(false);
  const [pickerMessage, setPickerMessage] = useState("");

  const openProfileModal = useCallback((isNew = false) => {
    setIsNewProfile(isNew);
    setIsProfileModalOpen(true);
  }, []);

  // IDs of the accounts created / signed-in WITHIN THIS BROWSER. Other
  // people's accounts are never shown — only these.
  const [myProfileIds, setMyProfileIds] = useState<number[]>(() => {
    try {
      const raw = localStorage.getItem("scholarbridge_device_profiles");
      const arr = raw ? JSON.parse(raw) : [];
      return Array.isArray(arr) ? arr.map(Number).filter(Boolean) : [];
    } catch {
      return [];
    }
  });

  const rememberProfile = useCallback((id: number) => {
    setMyProfileIds((prev) => {
      const next = prev.includes(id) ? prev : [...prev, id];
      try {
        localStorage.setItem("scholarbridge_device_profiles", JSON.stringify(next));
      } catch {
        // ignore
      }
      return next;
    });
  }, []);

  // Only profiles this browser owns — used by the picker.
  const deviceProfiles = profiles.filter((p) => myProfileIds.includes(p.id));

  // Saved Data
  const [savedUniversities, setSavedUniversities] = useState<SavedUniversityItem[]>([]);
  const [savedScholarships, setSavedScholarships] = useState<SavedScholarshipItem[]>([]);
  const [savedProgramCount, setSavedProgramCount] = useState(0);
  /**
   * The one navigation entry point. It accepts anything the product has ever
   * used as a destination: a section id (`materials`), a pane deep link
   * (`materials/essays`), a bare pane id (`outlook`) or a legacy section id
   * (`vault`, `chancing`, `workspace`, `profile`). Unknown ids are ignored
   * instead of silently dumping the student on the dashboard.
   */
  const handleNavigateTab = useCallback((id: string) => {
    if (isProfileEditorTarget(id)) {
      openProfileModal(false);
      return;
    }
    const target = resolveNavTarget(id);
    if (!target) return;
    setActiveTabState(target.section);
    setActivePane(target.utility ? null : target.pane);
    if (typeof window !== "undefined") window.scrollTo({ top: 0, behavior: "smooth" });
  }, [openProfileModal]);

  const openPane = useCallback(
    (pane: string) => {
      setActivePane(pane);
      const hash = `#${activeTab}/${pane}`;
      if (typeof window !== "undefined" && window.location.hash !== hash) {
        window.history.pushState(null, "", `${window.location.pathname}${window.location.search}${hash}`);
      }
    },
    [activeTab]
  );

  // Admin → Navigation can hide a destination or a single tab. The sidebar
  // announces changes; the shell applies them to the page body as well.
  useEffect(() => {
    let alive = true;
    const load = async () => {
      try {
        // One shared boot payload for branding + nav + guide (see lib/bootConfig).
        const config = await loadBootConfig();
        if (alive) setHiddenNav(parseHiddenNav(JSON.stringify(config.nav)));
      } catch {
        // keep the defaults — the shell still works offline
      }
    };
    void load();
    const onUpdate = () => void load();
    window.addEventListener("scholarbridge:nav-updated", onUpdate);
    return () => {
      alive = false;
      window.removeEventListener("scholarbridge:nav-updated", onUpdate);
    };
  }, []);

  const setActiveTab = handleNavigateTab;

  // Which application the Application Workspace is showing (null = the list).
  const [workspaceId, setWorkspaceId] = useState<number | null>(null);
  // Which university the Explorer should open (set by the global search, §34).
  const [focusUniversityId, setFocusUniversityId] = useState<number | null>(null);
  // A scholarship result opens the existing catalogue search and highlights its exact record.
  const [focusScholarship, setFocusScholarship] = useState<{
    id: number;
    title: string;
    requestId: number;
    /** Country-only deep link (e.g. "view grants in this country"). */
    country?: string | null;
  } | null>(null);
  const scholarshipFocusSequence = useRef(0);

  // Referral system: capture ?ref=CODE from the URL and keep it for up to
  // 48h so a visitor who browses first and registers later is still credited.
  useEffect(() => {
    try {
      const params = new URLSearchParams(window.location.search);
      const ref = params.get("ref");
      if (ref && ref.trim()) {
        localStorage.setItem(
          "scholarbridge_ref",
          JSON.stringify({ code: ref.trim().toUpperCase(), at: Date.now() })
        );
        // Clean the URL so the code isn't shared accidentally.
        const url = new URL(window.location.href);
        url.searchParams.delete("ref");
        window.history.replaceState({}, "", url.toString());
      }
    } catch {
      // localStorage unavailable — ignore
    }
  }, []);

  // --- Anonymous usage tracking (Admin → Analytics) -------------------------
  // This is a single-page app: switching sections does not change the URL, so
  // every visible section is reported as its own "screen view". The call is
  // fire-and-forget, de-duplicated in `@/lib/tracker` and never throws.
  useEffect(() => {
    const screen = view === "app" ? activeTab : view === "wizard" ? "onboarding" : view === "landing" ? "landing" : "session-restore";
    trackScreen(screen, activeProfile?.id ?? null);
  }, [view, activeTab, activeProfile?.id]);

  const getStoredReferralCode = (): string | null => {
    try {
      const raw = localStorage.getItem("scholarbridge_ref");
      if (!raw) return null;
      const { code, at } = JSON.parse(raw);
      if (!code || !at || Date.now() - at > 48 * 60 * 60 * 1000) {
        localStorage.removeItem("scholarbridge_ref");
        return null;
      }
      return code;
    } catch {
      return null;
    }
  };

  const fetchSavedUniversities = useCallback(async (profileId: number) => {
    try {
      const res = await fetch(`/api/saved-universities?profileId=${profileId}`);
      const data = await res.json();
      if (data.savedUniversities) {
        setSavedUniversities(data.savedUniversities);
      }
    } catch (err) {
      console.error("Error fetching saved universities:", err);
    }
  }, []);

  const fetchSavedScholarships = useCallback(async (profileId: number) => {
    try {
      const res = await fetch(`/api/saved-scholarships?profileId=${profileId}`);
      const data = await res.json();
      if (data.savedScholarships) {
        setSavedScholarships(data.savedScholarships);
      }
    } catch (err) {
      console.error("Error fetching saved scholarships:", err);
    }
  }, []);

  // Spec §24 — how many specific programmes the student has shortlisted.
  const fetchSavedProgramCount = useCallback(async (profileId: number) => {
    try {
      const res = await fetch(`/api/saved-programs?profileId=${profileId}`);
      const data = await res.json();
      if (typeof data.count === "number") setSavedProgramCount(data.count);
    } catch (err) {
      console.error("Error fetching saved program count:", err);
    }
  }, []);

  const hydrateProfileData = useCallback((profileId: number) => {
    void fetchSavedUniversities(profileId);
    void fetchSavedScholarships(profileId);
    void fetchSavedProgramCount(profileId);
  }, [fetchSavedScholarships, fetchSavedUniversities, fetchSavedProgramCount]);

  // Keep shell-level profile summaries in sync with task workflows that may
  // update linked saved-item context; ignore events for another active profile.
  useEffect(() => {
    const onTasksUpdated = (event: Event) => {
      const detail = (event as CustomEvent<{ profileId?: number }>).detail;
      const id = Number(detail?.profileId);
      if (Number.isSafeInteger(id) && id > 0 && id === activeProfile?.id) hydrateProfileData(id);
    };
    window.addEventListener("scholarbridge:tasks-updated", onTasksUpdated);
    return () => window.removeEventListener("scholarbridge:tasks-updated", onTasksUpdated);
  }, [activeProfile?.id, hydrateProfileData]);

  /** Load the full profile list — only used by the profile picker. */
  const loadAllProfiles = useCallback(async () => {
    try {
      const res = await fetch("/api/profiles");
      const data = await res.json();
      if (data.profiles) setProfiles(data.profiles);
    } catch (err) {
      console.error("Error fetching profiles:", err);
    }
  }, []);

  /**
   * On mount, restore the session from the server-signed cookie.
   *
   * The id in localStorage is only a hint: identity comes from
   * GET /api/auth/session, which validates the HttpOnly session cookie. A
   * stale or hand-edited local id therefore can never log anyone in.
   */
  const loadStoredProfile = useCallback(async () => {
    try {
      // A brief DB/network hiccup should not immediately strand a returning
      // student on the outage screen. Retry transient failures before showing
      // the recovery UI; a 401 is definitive and should return to sign-in now.
      let res: Response | null = null;
      let data: { profile?: StudentProfile; error?: string; code?: string } = {};
      const lastAttempt = SESSION_RESTORE_MAX_ATTEMPTS - 1;
      for (let attempt = 0; attempt < SESSION_RESTORE_MAX_ATTEMPTS; attempt++) {
        try {
          res = await fetch("/api/auth/session", { cache: "no-store" });
          data = await res.json().catch(() => ({}));
          if (!shouldRetrySessionRestore(res.status, data.code, attempt)) break;
        } catch (err) {
          if (attempt === lastAttempt) throw err;
        }
        await new Promise((resolve) => window.setTimeout(resolve, sessionRestoreDelayMs(attempt)));
      }
      if (!res) throw new Error("Session check did not return a response.");
      if (res.ok && data.profile) {
        const storedId = Number(data.profile.id);
        setActiveProfile(data.profile);
        rememberProfile(storedId);
        try {
          localStorage.setItem("scholarbridge_active_profile", String(storedId));
        } catch {
          // ignore
        }
        hydrateProfileData(storedId);
        setView("app");
        // Deep link (#universities/outlook, #vault, #payments …) wins over the
        // default destination. Unknown/foreign ids fall back to the dashboard.
        const linked = targetFromHash();
        if (linked && (linked.section !== "admin" || data.profile.isAdmin)) {
          setActiveTabState(linked.section);
          setActivePane(linked.pane);
          if (linked.openProfileEditor) openProfileModal(false);
        }
        // Defer non-critical background sweeps until the browser is idle so they
        // never compete with initial route hydration or catalogue fetches.
        const runDeferredSweeps = () => {
          try {
            fetch("/api/notifications/sweep", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ profileId: storedId }),
            }).catch(() => {});
          } catch {
            // ignore
          }
          try {
            fetch("/api/roadmap/generate", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ profileId: storedId }),
            }).then((res) => {
              if (res.ok) {
                window.dispatchEvent(new CustomEvent("scholarbridge:tasks-updated", { detail: { profileId: storedId } }));
              }
            }).catch(() => {});
          } catch {
            // ignore
          }
        };
        scheduleWhenIdle(runDeferredSweeps, 1800);
        setRestoreError(null);
        return;
      }

      // A 401 means there is no valid session. Any other failure (a database
      // that is waking up, a proxy hiccup) is about the server, not the user:
      // keep the cookie, let the public site render, and explain via the banner
      // instead of replacing the whole app with an error screen.
      if (!res.ok && res.status !== 401) {
        setRestoreError(data.error || "Your session could not be checked. Please try again.");
        setView("landing");
        return;
      }

      // No (or an expired) session — drop the stale local hint so the next
      // load does not pretend an account is active.
      try {
        localStorage.removeItem("scholarbridge_active_profile");
      } catch {
        // ignore
      }
      setRestoreError(null);
    } catch (err) {
      console.error("Error restoring session:", err);
      // Offline or a hard network failure: the landing page is still useful and
      // the retry button is one tap away.
      setRestoreError("We could not reach ScholarBridgeAI. Check your connection and try again.");
      setView("landing");
      return;
    }
    setView("landing");
  }, [hydrateProfileData, openProfileModal, rememberProfile]);

  // Keep the URL hash in step with the open section so the browser Back
  // button works and a section can be shared/bookmarked (#scholarships).
  const hashSynced = useRef(false);
  useEffect(() => {
    if (view !== "app") return;
    // Admin keeps its own deep link (#admin/channel), so a refresh reopens the
    // section the operator was working in.
    const adminDeepLink = activeTab === "admin" && window.location.hash.startsWith("#admin/");
    const want = activePane ? `#${activeTab}/${activePane}` : adminDeepLink ? window.location.hash : `#${activeTab}`;
    if (window.location.hash === want) {
      hashSynced.current = true;
      return;
    }
    const url = `${window.location.pathname}${window.location.search}${want}`;
    if (hashSynced.current) window.history.pushState(null, "", url);
    else window.history.replaceState(null, "", url);
    hashSynced.current = true;
  }, [activeTab, activePane, view]);

  // Global search (spec §34) asks the page to focus a record it found.
  useEffect(() => {
    const onFocus = (e: Event) => {
      const detail = (e as CustomEvent<{ kind: string; id?: string | number; title?: string }>).detail;
      if (!detail) return;
      if (detail.kind === "university") {
        setFocusUniversityId(Number(detail.id) || null);
        handleNavigateTab("universities/search");
      } else if (detail.kind === "application") {
        setWorkspaceId(Number(detail.id) || null);
        handleNavigateTab("applications/workspace");
      } else if (detail.kind === "scholarship") {
        const id = Number(detail.id);
        if (!Number.isSafeInteger(id) || id <= 0) return;
        scholarshipFocusSequence.current += 1;
        setFocusScholarship({
          id,
          title: String(detail.title ?? "").trim(),
          requestId: scholarshipFocusSequence.current,
        });
        handleNavigateTab("scholarships/browse");
      } else if (detail.kind === "scholarships") {
        // Country-filtered deep link from a university page: open the grants
        // catalogue pre-filtered to that country (no single record to focus).
        const country = String((detail as { country?: unknown }).country ?? "").trim();
        if (!country) return;
        scholarshipFocusSequence.current += 1;
        setFocusScholarship({
          id: 0,
          title: "",
          requestId: scholarshipFocusSequence.current,
          country,
        });
        handleNavigateTab("scholarships/browse");
      } else {
        handleNavigateTab((detail.kind as string) === "task" ? "tasks" : detail.kind);
      }
    };
    window.addEventListener("scholarbridge:focus-record", onFocus);
    return () => window.removeEventListener("scholarbridge:focus-record", onFocus);
  }, [handleNavigateTab]);

  useEffect(() => {
    const onNav = () => {
      const linked = targetFromHash();
      if (!linked) return;
      setActiveTabState(linked.section);
      setActivePane(linked.pane);
      if (linked.openProfileEditor) {
        // Normalize this old modal deep link without adding another history entry.
        hashSynced.current = false;
        openProfileModal(false);
      } else {
        setIsProfileModalOpen(false);
      }
    };
    window.addEventListener("popstate", onNav);
    window.addEventListener("hashchange", onNav);
    return () => {
      window.removeEventListener("popstate", onNav);
      window.removeEventListener("hashchange", onNav);
    };
  }, [openProfileModal]);

  useEffect(() => {
    // No session cookie → no session to restore: never call the session
    // endpoint and never show the "session unavailable" screen to a visitor
    // who was never signed in.
    if (!hasSessionCookie) return;
    const timer = window.setTimeout(() => {
      void loadStoredProfile();
    }, 0);
    return () => window.clearTimeout(timer);
  }, [hasSessionCookie, loadStoredProfile]);

  /** Open the profile picker for sign-in or switching accounts. */
  const openProfilePicker = useCallback(async () => {
    // The protected profile list is only useful after a valid profile has
    // loaded. Visitors and signed-out users can use the email/Telegram form
    // directly; calling it unauthenticated produced a noisy, expected 401.
    if (activeProfile) await loadAllProfiles();
    setPickerMessage("");
    setIsPickerOpen(true);
  }, [activeProfile, loadAllProfiles]);

  /**
   * Picking an account that this device used before is a convenience only: the
   * server still has to confirm the session cookie belongs to that account.
   * If it does not (new browser, expired session, different user), the picker
   * stays open so the person signs in with email + password.
   */
  const handlePickProfile = async (p: StudentProfile) => {
    try {
      const res = await fetch("/api/auth/session", { cache: "no-store" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || data.session?.profileId !== p.id) {
        setPickerMessage(
          "Please sign in with your email and password to open this account."
        );
        return;
      }
    } catch {
      setPickerMessage("Could not verify your session. Please sign in again.");
      return;
    }

    setActiveProfile(p);
    setProfiles((prev) => (prev.some((profile) => profile.id === p.id) ? prev : [...prev, p]));
    rememberProfile(p.id);
    try {
      localStorage.setItem("scholarbridge_active_profile", String(p.id));
    } catch {
      // ignore
    }
    hydrateProfileData(p.id);
    setIsPickerOpen(false);
    setView("app");
    setActiveTab(p.isAdmin ? "admin" : "dashboard");
  };

  const handleAddNewFromPicker = () => {
    setIsPickerOpen(false);
    setView("wizard");
  };

  /**
   * Logout: drops the active session (the account itself stays in the
   * database — the student gets back in later with email + password via
   * Sign in, from this device or any other).
   */
  const handleLogout = () => {
    // Clear the server-side session cookie too — otherwise the browser would
    // still be authenticated after "logging out".
    try {
      fetch("/api/auth/sign-out", { method: "POST" }).catch(() => {});
    } catch {
      // ignore
    }
    try {
      localStorage.removeItem("scholarbridge_active_profile");
    } catch {
      // ignore
    }
    setActiveProfile(null);
    setSavedUniversities([]);
    setSavedScholarships([]);
    setActiveTab("dashboard");
    setIsProfileModalOpen(false);
    setIsPickerOpen(false);
    setView("landing");
  };

  const handleSaveProfile = async (formData: Omit<Partial<StudentProfile>, "gpa"> & { gpa?: number | null; password?: string }) => {
    // NOTE: errors are intentionally NOT swallowed here — they propagate to
    // ProfileModal so the user sees a clear message instead of a silent fail.
    if (isNewProfile) {
      const res = await fetch("/api/profiles", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...formData,
          referralCode: getStoredReferralCode(),
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.profile) {
        throw new Error(data.error || "Profil yaratib bo'lmadi");
      }
      setProfiles((prev) => [data.profile, ...prev]);
      setActiveProfile(data.profile);
      rememberProfile(data.profile.id);
      hydrateProfileData(data.profile.id);
      try {
        localStorage.setItem("scholarbridge_active_profile", String(data.profile.id));
      } catch {
        // ignore
      }
    } else if (activeProfile) {
      const res = await fetch(`/api/profiles/${activeProfile.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...formData, requesterId: activeProfile.id }),
      });
      const data = await res.json();
      if (!res.ok || !data.profile) {
        throw new Error(data.error || "Profil yangilanmadi");
      }
      setProfiles((prev) => prev.map((p) => (p.id === data.profile.id ? data.profile : p)));
      setActiveProfile(data.profile);
      invalidateCatalogSwr();
    }
  };

  /**
   * Complete-profile editor writes through PUT /api/profiles/:id itself (it owns
   * the full field set), so here we only fold the returned row back into state —
   * otherwise the chancing engine would keep scoring a stale profile.
   */
  const handleProfileUpdated = (updated: StudentProfile) => {
    setProfiles((prev) => prev.map((profile) => (profile.id === updated.id ? updated : profile)));
    setActiveProfile(updated);
    invalidateCatalogSwr();
  };

  // University Handlers
  const handleSaveUniversity = async (universityId: number) => {
    if (!activeProfile) return;
    try {
      const res = await fetch("/api/saved-universities", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ profileId: activeProfile.id, universityId }),
      });
      const data = await res.json();
      fetchSavedUniversities(activeProfile.id);
    } catch (err) {
      console.error(err);
    }
  };

  const handleUnsaveUniversity = async (universityId: number) => {
    const item = savedUniversities.find((s) => s.universityId === universityId);
    if (!item) return;
    try {
      await fetch(`/api/saved-universities?id=${item.id}`, { method: "DELETE" });
      setSavedUniversities((prev) => prev.filter((s) => s.id !== item.id));
    } catch (err) {
      console.error(err);
    }
  };

  const handleUpdateSavedUniStatus = async (id: number, status: string, notes?: string) => {
    try {
      await fetch("/api/saved-universities", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, status, notes }),
      });
      if (activeProfile) fetchSavedUniversities(activeProfile.id);
    } catch (err) {
      console.error(err);
    }
  };

  const handleRemoveSavedUni = async (id: number) => {
    try {
      await fetch(`/api/saved-universities?id=${id}`, { method: "DELETE" });
      setSavedUniversities((prev) => prev.filter((s) => s.id !== id));
    } catch (err) {
      console.error(err);
    }
  };

  // Scholarship Handlers
  const handleSaveScholarship = async (scholarshipId: number) => {
    if (!activeProfile) return;
    try {
      await fetch("/api/saved-scholarships", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ profileId: activeProfile.id, scholarshipId }),
      });
      fetchSavedScholarships(activeProfile.id);
    } catch (err) {
      console.error(err);
    }
  };

  const handleUnsaveScholarship = async (scholarshipId: number) => {
    const item = savedScholarships.find((s) => s.scholarshipId === scholarshipId);
    if (!item) return;
    try {
      await fetch(`/api/saved-scholarships?id=${item.id}`, { method: "DELETE" });
      setSavedScholarships((prev) => prev.filter((s) => s.id !== item.id));
    } catch (err) {
      console.error(err);
    }
  };

  const handleUpdateSavedScholarshipStatus = async (id: number, status: string, notes?: string) => {
    try {
      await fetch("/api/saved-scholarships", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, status, notes }),
      });
      if (activeProfile) fetchSavedScholarships(activeProfile.id);
    } catch (err) {
      console.error(err);
    }
  };

  const handleRemoveSavedScholarship = async (id: number) => {
    try {
      await fetch(`/api/saved-scholarships?id=${id}`, { method: "DELETE" });
      setSavedScholarships((prev) => prev.filter((s) => s.id !== id));
    } catch (err) {
      console.error(err);
    }
  };

  const savedUniIds = new Set(savedUniversities.map((s) => s.universityId));
  const savedScholarshipIds = new Set(savedScholarships.map((s) => s.scholarshipId));

  // Persist the user's language preference onto the active profile.
  const handleLocaleChange = async (locale: string) => {
    if (!activeProfile?.id) return;
    try {
      await fetch(`/api/profiles/${activeProfile.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ preferredLocale: locale, requesterId: activeProfile.id }),
      });
      setActiveProfile((prev) => (prev ? { ...prev, preferredLocale: locale } : prev));
    } catch (err) {
      console.error(err);
    }
  };

  /**
   * The former profile-details destination is still intercepted by
   * `handleNavigateTab` and `targetFromHash`, so older journey links open the
   * Edit Profile modal without restoring a full-page editor pane.
   */

  // ---- Landing / onboarding flow ----
  const handleWizardCreated = (created: StudentProfile) => {
    setProfiles((prev) => [created, ...prev]);
    setActiveProfile(created);
    rememberProfile(created.id);
    try {
      localStorage.setItem("scholarbridge_active_profile", String(created.id));
    } catch {
      // ignore
    }
  };

  const handleWizardComplete = (updated: StudentProfile) => {
    setProfiles((prev) =>
      prev.map((p) => (p.id === updated.id ? { ...p, ...updated } : p))
    );
    setActiveProfile((prev) => (prev && prev.id === updated.id ? { ...prev, ...updated } : prev));
    rememberProfile(updated.id);
    try {
      localStorage.setItem("scholarbridge_onboarded", "1");
      localStorage.setItem("scholarbridge_active_profile", String(updated.id));
    } catch {
      // ignore
    }
    hydrateProfileData(updated.id);
    setView("app");
    setActiveTab("dashboard");
  };

  // "Start for free" → step-by-step onboarding wizard.
  const startOnboarding = () => setView("wizard");

  // Existing users, including admins, sign in from the shared account picker
  // instead of being auto-dropped onto the first profile.
  const enterApp = () => {
    openProfilePicker();
  };

  const profilePicker = (
    <ProfilePicker
      key={isPickerOpen ? "open" : "closed"}
      open={isPickerOpen}
      deviceProfiles={deviceProfiles}
      currentId={activeProfile?.id ?? null}
      onClose={() => setIsPickerOpen(false)}
      onSelect={handlePickProfile}
      onAddNew={handleAddNewFromPicker}
      notice={pickerMessage}
    />
  );

  // ---- Restore a returning student's session before showing the landing page ----
  if (view === "restoring") {
    return <LocaleProvider initialLocale={initialLocale} initialMessages={initialMessages}><SessionRestoreLoader /></LocaleProvider>;
  }

  // ---- First visit: English landing page ----
  if (view === "landing") {
    return (
      <LocaleProvider initialLocale={initialLocale} initialMessages={initialMessages}>
        <>
          {restoreError && (
            <SessionNotice
              message={restoreError}
              onRetry={() => {
                setRestoreError(null);
                setView("restoring");
                void loadStoredProfile();
              }}
              onDismiss={() => setRestoreError(null)}
            />
          )}
          <LandingPage onStart={startOnboarding} onEnterApp={enterApp} onSignIn={openProfilePicker} />
          {profilePicker}
        </>
      </LocaleProvider>
    );
  }

  // ---- Brand-new visitor: step-by-step onboarding (creates the profile on
  // step 1 via POST /api/profiles with the referral code, saves every step,
  // resumes where they left off) ----
  if (view === "wizard") {
    return (
      <LocaleProvider initialLocale={initialLocale} initialMessages={initialMessages}>
        <div className="min-h-screen bg-slate-50 px-4 pt-3 pb-[calc(1rem+env(safe-area-inset-bottom))] sm:py-10">
          <OnboardingWizard
            profile={null}
            onCreated={handleWizardCreated}
            onComplete={handleWizardComplete}
          />
        </div>
      </LocaleProvider>
    );
  }

  return (
    <LocaleProvider initialLocale={initialLocale} initialMessages={initialMessages}>
      {/* 3-tier shell: the column stacks on a phone, the tablet rail and the
          laptop sidebar sit next to the content from `md` (768px) up. */}
      <div className="min-h-screen bg-slate-50 flex flex-col md:flex-row font-sans">
      <Navbar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        activeProfile={activeProfile}
        activeProfileId={activeProfile?.id ?? null}
        onOpenProfileModal={openProfileModal}
        onSwitchProfile={openProfilePicker}
        onStartOnboarding={startOnboarding}
        onLocaleChange={handleLocaleChange}
        onLogout={handleLogout}
        hiddenNav={hiddenNav}
      />

      <div className="flex-1 min-w-0 flex flex-col">
      <main id="main-content" tabIndex={-1} className="flex-1 w-full px-3 pb-[calc(5rem+env(safe-area-inset-bottom))] pt-4 sm:px-6 sm:pt-6 md:pb-6 lg:px-8 lg:pb-6">
        <div className="mx-auto w-full max-w-7xl">
        {/* Pillar 3 — the four-stage guided path, pinned above every screen so
            a newcomer always knows where they are and what comes next. The
            dashboard keeps its own richer journey control center instead. */}
        {view === "app" && activeProfile && activeProfile.onboardingCompleted !== false && activeTab !== "dashboard" && (
          <div className="mb-3">
            <GuidedJourneyBar
              activeProfile={activeProfile}
              savedUniversityCount={savedUniversities.length}
              savedScholarshipCount={savedScholarships.length}
              onNavigate={handleNavigateTab}
              onOpenProfileModal={() => openProfileModal(false)}
            />
          </div>
        )}
        {/* Sections swap with a short cross-fade + lift. The outer profile key
            is also an isolation boundary: unmount every profile-scoped loader,
            checklist and draft immediately when the selected student changes. */}
        <PageTransition
          key={activeProfile?.id ?? "none"}
          transitionKey={
            activeProfile && !activeProfile.onboardingCompleted
              ? "onboarding"
              : activeTab
          }
          distance={14}
        >

          {/* Onboarding wizard — shown for profiles that haven't completed
              the step-by-step setup yet. Resumes from the saved step. */}
          {activeProfile && !activeProfile.onboardingCompleted ? (
            <OnboardingWizard
              profile={activeProfile}
              onComplete={handleWizardComplete}
            />
          ) : activeTab === "dashboard" && (
            <div className="space-y-4">
              {/* "Connect Telegram" nudge — only while not connected; dismissible */}
              <TelegramNudge profileId={activeProfile?.id ?? null} onNavigate={handleNavigateTab} />
              <DailyStreakCard profileId={activeProfile?.id ?? null} compact />
              {/* Spec §3 — the control center. Journey bar, next steps,
                  deadlines, application progress, readiness, recommendations
                  and the ten study-plan phases, in that order. */}
              <JourneyControlCenter
                profileId={activeProfile?.id ?? null}
                onNavigateTab={handleNavigateTab}
                onOpenWorkspace={(applicationId) => {
                  setWorkspaceId(applicationId);
                  handleNavigateTab("workspace");
                }}
              />
            </div>
          )}

          {/* ---- EXPLORE ------------------------------------------------ */}
          {activeTab === "universities" && (
            <UniversitiesHub
              profile={activeProfile}
              pane={activePane}
              setPane={openPane}
              navigate={handleNavigateTab}
              hidden={hiddenNav}
              savedUniIds={savedUniIds}
              onSaveUniversity={handleSaveUniversity}
              onUnsaveUniversity={handleUnsaveUniversity}
              autoOpenUniversityId={focusUniversityId}
              onProfileSaved={handleProfileUpdated}
              onOpenProfileModal={openProfileModal}
              workspaceId={workspaceId}
              setWorkspaceId={setWorkspaceId}
            />
          )}

          {activeTab === "scholarships" && (
            <ScholarshipsHub
              profile={activeProfile}
              pane={activePane}
              setPane={openPane}
              navigate={handleNavigateTab}
              hidden={hiddenNav}
              savedScholarshipIds={savedScholarshipIds}
              onSaveScholarship={handleSaveScholarship}
              onUnsaveScholarship={handleUnsaveScholarship}
              autoFocusScholarship={focusScholarship}
              workspaceId={workspaceId}
              setWorkspaceId={setWorkspaceId}
            />
          )}

          {/* ---- MY PLAN ------------------------------------------------ */}
          {activeTab === "study-plan" && (
            <StudyPlanHub
              profile={activeProfile}
              pane={activePane}
              setPane={openPane}
              navigate={handleNavigateTab}
              hidden={hiddenNav}
              workspaceId={workspaceId}
              setWorkspaceId={setWorkspaceId}
            />
          )}

          {activeTab === "tasks" && (
            <TasksHub
              profile={activeProfile}
              pane={activePane}
              setPane={openPane}
              navigate={handleNavigateTab}
              hidden={hiddenNav}
              workspaceId={workspaceId}
              setWorkspaceId={setWorkspaceId}
            />
          )}

          {activeTab === "profile" && (
            <ProfileHub
              profile={activeProfile}
              pane={activePane}
              setPane={openPane}
              navigate={handleNavigateTab}
              hidden={hiddenNav}
              onOpenProfileModal={openProfileModal}
              workspaceId={workspaceId}
              setWorkspaceId={setWorkspaceId}
            />
          )}

          {activeTab === "funding" && (
            <FundingHub
              profile={activeProfile}
              pane={activePane}
              setPane={openPane}
              navigate={handleNavigateTab}
              hidden={hiddenNav}
              workspaceId={workspaceId}
              setWorkspaceId={setWorkspaceId}
            />
          )}

          {/* ---- APPLICATIONS ------------------------------------------- */}
          {activeTab === "applications" && (
            <ApplicationsHub
              profile={activeProfile}
              pane={activePane}
              setPane={openPane}
              navigate={handleNavigateTab}
              hidden={hiddenNav}
              workspaceId={workspaceId}
              setWorkspaceId={setWorkspaceId}
            />
          )}

          {activeTab === "materials" && (
            <MaterialsHub
              profile={activeProfile}
              pane={activePane}
              setPane={openPane}
              navigate={handleNavigateTab}
              hidden={hiddenNav}
              workspaceId={workspaceId}
              setWorkspaceId={setWorkspaceId}
            />
          )}

          {/* ---- AFTER ADMISSION ---------------------------------------- */}
          {activeTab === "offers" && (
            <OffersHub
              profile={activeProfile}
              pane={activePane}
              setPane={openPane}
              navigate={handleNavigateTab}
              hidden={hiddenNav}
              workspaceId={workspaceId}
              setWorkspaceId={setWorkspaceId}
            />
          )}

          {activeTab === "post-admission-funding" && (
            <PostAdmissionFundingHub
              profile={activeProfile}
              pane={activePane}
              setPane={openPane}
              navigate={handleNavigateTab}
              hidden={hiddenNav}
              workspaceId={workspaceId}
              setWorkspaceId={setWorkspaceId}
            />
          )}

          {activeTab === "visa" && (
            <VisaHub
              profile={activeProfile}
              pane={activePane}
              setPane={openPane}
              navigate={handleNavigateTab}
              hidden={hiddenNav}
              workspaceId={workspaceId}
              setWorkspaceId={setWorkspaceId}
            />
          )}

          {/* ---- HELP & LEARNING ---------------------------------------- */}
          {activeTab === "guidance" && (
            <GuidanceHub
              profile={activeProfile}
              pane={activePane}
              setPane={openPane}
              navigate={handleNavigateTab}
              hidden={hiddenNav}
              workspaceId={workspaceId}
              setWorkspaceId={setWorkspaceId}
            />
          )}

          {activeTab === "community" && (
            <CommunityHub
              profile={activeProfile}
              pane={activePane}
              setPane={openPane}
              navigate={handleNavigateTab}
              hidden={hiddenNav}
              workspaceId={workspaceId}
              setWorkspaceId={setWorkspaceId}
            />
          )}

          {/* ---- ACCOUNT / UTILITY (not a journey group) ---------------- */}
          {activeTab === "payments" && <PaymentsSection activeProfile={activeProfile} />}

          {activeTab === "rewards" && <RewardsSection activeProfile={activeProfile} />}

          {activeTab === "notifications" && (
            <div className="space-y-6">
              <TelegramSettings activeProfile={activeProfile} onNavigate={handleNavigateTab} />
              <SessionsPanel />
            </div>
          )}

          {activeTab === "parent" && (
            <ParentDashboardGate
              activeProfile={activeProfile}
              onUpgrade={() => handleNavigateTab("payments")}
            />
          )}

          {activeTab === "admin" && <AdminPanel activeProfile={activeProfile} />}

          {/* One-line "what is this page?" help for newcomers (admin-editable).
              Module 2: it sits at the BOTTOM of every section now — the main
              content leads, the explanation is one quiet chip away (opened
              sections expand it in place; it never pushes the page down). */}
          {!(activeProfile && !activeProfile.onboardingCompleted) && <SectionIntro section={activeTab} />}
        </PageTransition>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-200 bg-white pt-6 pb-24 lg:pb-6 mt-12 text-center text-xs text-slate-500">
        {/* Small print above Terms / Privacy: the app shows AI-written text
            and compiled catalogue data, both of which can be wrong or out of
            date. One honest line wherever the user ends up. */}
        <div className="mx-auto mb-4 max-w-7xl border-b border-slate-100 px-4 pb-4">
          <AppNote kind="general" className="mx-auto max-w-[900px] text-left" />
        </div>
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex flex-col sm:flex-row items-center gap-3">
            <p>© {new Date().getFullYear()} ScholarBridgeAI • Democratizing Global Higher Education Access</p>
            <div className="flex items-center gap-3">
              <a href="/terms" className="inline-flex min-h-11 min-w-11 items-center justify-center px-1 hover:text-slate-800 underline underline-offset-4">
                Terms
              </a>
              <a href="/privacy" className="inline-flex min-h-11 min-w-11 items-center justify-center px-1 hover:text-slate-800 underline underline-offset-4">
                Privacy
              </a>
            </div>
          </div>
          {/* Real buttons, not clickable spans: these are navigation, so they
              must be reachable with Tab and announced as controls. `flex-wrap`
              keeps the row inside the viewport at 200% zoom. */}
          <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-2">
            <button type="button" className="inline-flex min-h-11 min-w-11 items-center justify-center rounded px-1 hover:text-slate-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400" onClick={() => setActiveTab("universities")}>
              University Matcher
            </button>
            <button type="button" className="inline-flex min-h-11 min-w-11 items-center justify-center rounded px-1 hover:text-slate-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400" onClick={() => setActiveTab("scholarships")}>
              Scholarship Discovery
            </button>
            <button type="button" className="inline-flex min-h-11 min-w-11 items-center justify-center rounded px-1 hover:text-slate-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400" onClick={() => setActiveTab("mentor")}>
              AI Mentor
            </button>
          </div>
        </div>
      </footer>
      </div>

      {/* Profile Create / Edit Modal */}
      <ProfileModal
        isOpen={isProfileModalOpen}
        isNew={isNewProfile}
        onClose={() => setIsProfileModalOpen(false)}
        profile={activeProfile}
        onSave={handleSaveProfile}
      />

      {/* Profile picker — this device's accounts plus email/password sign-in */}
      {profilePicker}
      </div>
    </LocaleProvider>
  );
}
