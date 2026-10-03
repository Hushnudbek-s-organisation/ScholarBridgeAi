"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import { Navbar, StudentProfile } from "@/components/Navbar";
import { ProfileModal } from "@/components/ProfileModal";
import { ApplicationTracker, SavedUniversityItem, SavedScholarshipItem } from "@/components/ApplicationTracker";
import { PaymentsSection } from "@/components/PaymentsSection";
import { RewardsSection } from "@/components/RewardsSection";
import { ParentDashboard } from "@/components/ParentDashboard";
import { AdminPanel } from "@/components/AdminPanel";
import { PremiumGate } from "@/components/PremiumGate";
import { OnboardingWizard } from "@/components/OnboardingWizard";
import { LandingPage } from "@/components/LandingPage";
import { ProfilePicker } from "@/components/ProfilePicker";
import { LocaleProvider, useLocaleContext } from "@/i18n/LocaleProvider";
import type { Locale } from "@/i18n/config";
import { trackScreen } from "@/lib/tracker";
import { PageTransition } from "@/components/motion";
import {
  DEFAULT_HIDDEN_NAV_ITEMS,
  parseHiddenNav,
  resolveNavTarget,
} from "@/lib/navSections";
import { SectionIntro } from "@/components/SectionIntro";
import { TelegramSettings } from "@/components/telegram/TelegramSettings";
import { TelegramNudge } from "@/components/telegram/TelegramNudge";
import { JourneyControlCenter } from "@/components/journey/JourneyControlCenter";
import {
  CommunityHub,
  FundingHub,
  GuidanceHub,
  MaterialsHub,
  OffersHub,
  PostAdmissionFundingHub,
  ProfileHub,
  ScholarshipsHub,
  StudyPlanHub,
  TasksHub,
  UniversitiesHub,
  VisaHub,
  ApplicationsHub,
} from "@/components/hubs";

/**
 * Any destination, pane, legacy section id or utility screen may appear in the
 * URL hash (`#universities`, `#universities/outlook`, `#vault`, `#payments`).
 * Old links keep working because `resolveNavTarget` maps every previous id.
 */
function targetFromHash(): { section: string; pane: string | null } | null {
  if (typeof window === "undefined") return null;
  const raw = decodeURIComponent(window.location.hash.replace(/^#/, "")).trim();
  if (!raw) return null;
  const target = resolveNavTarget(raw);
  if (!target) return null;
  return { section: target.section, pane: target.utility ? null : target.pane };
}

const sessionCopy: Record<Locale, { opening: string; checking: string; unavailable: string; retry: string; signIn: string; details: string }> = {
  en: { opening: "Opening ScholarBridge…", checking: "Checking your secure session.", unavailable: "Dashboard temporarily unavailable", retry: "Try again", signIn: "Go to sign in", details: "More information" },
  uz: { opening: "ScholarBridge ochilmoqda…", checking: "Xavfsiz seansingiz tekshirilmoqda.", unavailable: "Boshqaruv paneli vaqtincha ishlamayapti", retry: "Qayta urinish", signIn: "Kirish sahifasiga o‘tish", details: "Qo‘shimcha ma’lumot" },
  ru: { opening: "Открываем ScholarBridge…", checking: "Проверяем защищённую сессию.", unavailable: "Панель временно недоступна", retry: "Повторить", signIn: "Перейти ко входу", details: "Подробнее" },
};

function SessionRestoreLoader() {
  const { locale } = useLocaleContext();
  const text = sessionCopy[locale];
  return (
    <main className="grid min-h-screen place-items-center bg-slate-100 px-4 text-center dark:bg-slate-950">
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

function SessionRestoreError({ error, onRetry, onSignIn }: { error: string | null; onRetry: () => void; onSignIn: () => void }) {
  const { locale } = useLocaleContext();
  const text = sessionCopy[locale];
  return (
    <main className="grid min-h-screen place-items-center bg-slate-100 px-4 text-center dark:bg-slate-950">
      <section className="max-w-md rounded-2xl border border-slate-200 bg-white p-8 shadow-sm dark:border-slate-700 dark:bg-slate-900">
        <h1 className="text-xl font-bold text-slate-900 dark:text-white">{text.unavailable}</h1>
        {error && <details className="mt-3 text-left text-sm text-slate-600 dark:text-slate-300"><summary className="cursor-pointer font-medium">{text.details}</summary><p className="mt-2 break-words">{error}</p></details>}
        <div className="mt-6 flex flex-wrap justify-center gap-3">
          <button type="button" onClick={onRetry} className="rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-indigo-700">{text.retry}</button>
          <button type="button" onClick={onSignIn} className="rounded-xl border border-slate-300 px-4 py-2.5 text-sm font-semibold text-slate-800 transition hover:bg-slate-50 dark:border-slate-600 dark:text-slate-100 dark:hover:bg-slate-800">{text.signIn}</button>
        </div>
      </section>
    </main>
  );
}

export default function Home() {
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
  // Start in restoring so returning students do not briefly land on the public
  // welcome page while their valid session is being checked.
  const [view, setView] = useState<"restoring" | "restore-error" | "landing" | "wizard" | "app">("restoring");
  const [restoreError, setRestoreError] = useState<string | null>(null);

  // Profile management — the app works with ONE signed-in profile per browser.
  // `profiles` is used by the picker to show this device's saved accounts.
  const [profiles, setProfiles] = useState<StudentProfile[]>([]);
  const [activeProfile, setActiveProfile] = useState<StudentProfile | null>(null);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [isNewProfile, setIsNewProfile] = useState(false);
  const [isPickerOpen, setIsPickerOpen] = useState(false);
  const [pickerMessage, setPickerMessage] = useState("");

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
  const [taskCount, setTaskCount] = useState(0);
  /**
   * The one navigation entry point. It accepts anything the product has ever
   * used as a destination: a section id (`materials`), a pane deep link
   * (`materials/essays`), a bare pane id (`outlook`) or a legacy section id
   * (`vault`, `chancing`, `workspace`, `profile`). Unknown ids are ignored
   * instead of silently dumping the student on the dashboard.
   */
  const handleNavigateTab = useCallback((id: string) => {
    const target = resolveNavTarget(id);
    if (!target) return;
    setActiveTabState(target.section);
    setActivePane(target.utility ? null : target.pane);
    if (typeof window !== "undefined") window.scrollTo({ top: 0, behavior: "smooth" });
  }, []);

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
        const res = await fetch("/api/config/nav", { cache: "no-store" });
        const data = await res.json();
        if (alive) setHiddenNav(parseHiddenNav(JSON.stringify(data.hidden ?? [])));
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

  const fetchTaskCount = useCallback(async (profileId: number) => {
    // The badge is decorative: a failed lookup (e.g. a profile this session
    // may not read) must not log console errors or show a fake number
    // (audit A24). Unknown stays "unknown" — we simply keep the previous 0.
    try {
      const res = await fetch(`/api/tasks?profileId=${profileId}`);
      if (!res.ok) return;
      const data = await res.json();
      if (Array.isArray(data.tasks)) {
        const pending = data.tasks.filter((t: { isCompleted: boolean }) => !t.isCompleted);
        setTaskCount(pending.length);
      }
    } catch {
      /* non-fatal — the badge just keeps its previous value */
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
    void fetchTaskCount(profileId);
  }, [fetchSavedScholarships, fetchSavedUniversities, fetchSavedProgramCount, fetchTaskCount]);

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
      const res = await fetch("/api/auth/session", { cache: "no-store" });
      const data = await res.json().catch(() => ({}));
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
        }
        // Fire-and-forget: check for approaching deadlines → notifications.
        try {
          fetch("/api/notifications/sweep", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ profileId: storedId }),
          }).catch(() => {});
        } catch {
          // ignore
        }
        // Fire-and-forget: auto-build the personalized roadmap.
        try {
          fetch("/api/roadmap/generate", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ profileId: storedId }),
          }).catch(() => {});
        } catch {
          // ignore
        }
        setRestoreError(null);
        return;
      }

      // A 401 means there is no valid session. Other failures (for example a
      // temporary database outage) must not silently send a returning student
      // back to the public landing page as if they had been signed out.
      if (!res.ok && res.status !== 401) {
        setRestoreError(data.error || "Your session could not be checked. Please try again.");
        setView("restore-error");
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
      setRestoreError("We could not reach ScholarBridgeAI. Check your connection and try again.");
      setView("restore-error");
      return;
    }
    setView("landing");
  }, [hydrateProfileData, rememberProfile]);

  // Keep the URL hash in step with the open section so the browser Back
  // button works and a section can be shared/bookmarked (#scholarships).
  const hashSynced = useRef(false);
  useEffect(() => {
    if (view !== "app") return;
    const want = activePane ? `#${activeTab}/${activePane}` : `#${activeTab}`;
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
      const detail = (e as CustomEvent<{ kind: string; id?: string | number }>).detail;
      if (!detail) return;
      if (detail.kind === "university") {
        setFocusUniversityId(Number(detail.id) || null);
        handleNavigateTab("universities/search");
      } else if (detail.kind === "application") {
        setWorkspaceId(Number(detail.id) || null);
        handleNavigateTab("applications/workspace");
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
    };
    window.addEventListener("popstate", onNav);
    window.addEventListener("hashchange", onNav);
    return () => {
      window.removeEventListener("popstate", onNav);
      window.removeEventListener("hashchange", onNav);
    };
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void loadStoredProfile();
    }, 0);
    return () => window.clearTimeout(timer);
  }, [loadStoredProfile]);

  /** Open the profile picker for sign-in or switching accounts. */
  const openProfilePicker = useCallback(async () => {
    await loadAllProfiles();
    setPickerMessage("");
    setIsPickerOpen(true);
  }, [loadAllProfiles]);

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
    setTaskCount(0);
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
   * Deep links that used to open the full-page "My Profile" section now open
   * the Edit Profile modal instead — every field from My Profile lives there
   * now (the My Profile sidebar entry was removed). All other targets navigate
   * as before.
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
    return <LocaleProvider><SessionRestoreLoader /></LocaleProvider>;
  }

  if (view === "restore-error") {
    return (
      <LocaleProvider>
        <SessionRestoreError
          error={restoreError}
          onRetry={() => {
            setRestoreError(null);
            setView("restoring");
            void loadStoredProfile();
          }}
          onSignIn={() => setView("landing")}
        />
      </LocaleProvider>
    );
  }

  // ---- First visit: English landing page ----
  if (view === "landing") {
    return (
      <LocaleProvider>
        <>
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
      <LocaleProvider>
        <div className="min-h-screen bg-slate-100 py-10 px-4">
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
    <LocaleProvider>
      <div className="min-h-screen bg-slate-100 flex flex-col lg:flex-row font-sans">
      <Navbar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        activeProfile={activeProfile}
        activeProfileId={activeProfile?.id ?? null}
        onOpenProfileModal={(isNew) => {
          setIsNewProfile(!!isNew);
          setIsProfileModalOpen(true);
        }}
        onSwitchProfile={openProfilePicker}
        onStartOnboarding={startOnboarding}
        onLocaleChange={handleLocaleChange}
        onLogout={handleLogout}
      />

      <div className="flex-1 min-w-0 flex flex-col">
      <main className="flex-1 w-full px-3 sm:px-6 lg:px-8 py-4 sm:py-6">
        <div className="mx-auto w-full max-w-7xl">
        {/* Sections swap with a short cross-fade + lift. Keyed on what is
            actually on screen so the wizard and every tab participate. */}
        <PageTransition
          transitionKey={
            activeProfile && !activeProfile.onboardingCompleted
              ? "onboarding"
              : activeTab
          }
          distance={14}
        >
          {/* One-line "what is this page?" banner for newcomers (admin-editable) */}
          {!(activeProfile && !activeProfile.onboardingCompleted) && <SectionIntro section={activeTab} />}
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
              onProfileSaved={handleProfileUpdated}
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
            <TelegramSettings activeProfile={activeProfile} onNavigate={handleNavigateTab} />
          )}

          {activeTab === "parent" && (
            <PremiumGate
              profileId={activeProfile?.id ?? null}
              feature="parent_dashboard"
              title="Parent dashboard is Pro"
              description="Share a read-only progress page with your family — a Pro feature families pay for."
              onUpgrade={() => handleNavigateTab("payments")}
            >
              <ParentDashboard activeProfile={activeProfile} />
            </PremiumGate>
          )}

          {activeTab === "admin" && <AdminPanel activeProfile={activeProfile} />}

        </PageTransition>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-200 bg-white pt-6 pb-24 lg:pb-6 mt-12 text-center text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex flex-col sm:flex-row items-center gap-3">
            <p>© {new Date().getFullYear()} ScholarBridgeAI • Democratizing Global Higher Education Access</p>
            <div className="flex items-center gap-3">
              <a href="/terms" className="inline-flex min-h-6 items-center px-1 hover:text-slate-800 underline underline-offset-4">
                Terms
              </a>
              <a href="/privacy" className="inline-flex min-h-6 items-center px-1 hover:text-slate-800 underline underline-offset-4">
                Privacy
              </a>
            </div>
          </div>
          {/* Real buttons, not clickable spans: these are navigation, so they
              must be reachable with Tab and announced as controls. `flex-wrap`
              keeps the row inside the viewport at 200% zoom. */}
          <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-2">
            <button type="button" className="inline-flex min-h-6 items-center rounded px-1 hover:text-slate-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400" onClick={() => setActiveTab("universities")}>
              University Matcher
            </button>
            <button type="button" className="inline-flex min-h-6 items-center rounded px-1 hover:text-slate-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400" onClick={() => setActiveTab("scholarships")}>
              Scholarship Discovery
            </button>
            <button type="button" className="inline-flex min-h-6 items-center rounded px-1 hover:text-slate-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400" onClick={() => setActiveTab("mentor")}>
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
