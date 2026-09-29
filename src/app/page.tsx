"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import { Navbar, StudentProfile } from "@/components/Navbar";
import { ProfileModal } from "@/components/ProfileModal";
import { DashboardView } from "@/components/DashboardView";
import { UniversityExplorer } from "@/components/UniversityExplorer";
import { ScholarshipHub } from "@/components/ScholarshipHub";
import { ApplicationTracker, SavedUniversityItem, SavedScholarshipItem } from "@/components/ApplicationTracker";
import { DeadlineCenter } from "@/components/DeadlineCenter";
import { ChancingPanel } from "@/components/ChancingPanel";
import { ProfileStrengthPanel } from "@/components/ProfileStrengthPanel";
import { CompleteProfileForm } from "@/components/CompleteProfileForm";
import { ApplicationCenter } from "@/components/ApplicationCenter";
import { NextActionsPanel } from "@/components/NextActionsPanel";
import { AdmissionsAdvisor } from "@/components/AdmissionsAdvisor";
import { EssayRubricStudio } from "@/components/EssayRubricStudio";
import { CountryComparePanel } from "@/components/CountryComparePanel";
import { OpportunitiesPanel } from "@/components/OpportunitiesPanel";
import { SimilarProfiles } from "@/components/SimilarProfiles";
import { PlanningStudio } from "@/components/PlanningStudio";
import { MentorMarketplace } from "@/components/MentorMarketplace";
import { ParentDashboard } from "@/components/ParentDashboard";
import { DocumentChecklist } from "@/components/DocumentChecklist";
import { ConsultingSection } from "@/components/ConsultingSection";
import { AiSopStudio } from "@/components/AiSopStudio";
import { TaskRoadmap } from "@/components/TaskRoadmap";
import { AiChatMentor } from "@/components/AiChatMentor";
import { VisaSpeakingAssistant } from "@/components/VisaSpeakingAssistant";
import { ForumSection } from "@/components/ForumSection";
import { CoursesSection } from "@/components/CoursesSection";
import { PaymentsSection } from "@/components/PaymentsSection";
import { RewardsSection } from "@/components/RewardsSection";
import { AdminPanel } from "@/components/AdminPanel";
import { PremiumGate } from "@/components/PremiumGate";
import { FaqSection } from "@/components/FaqSection";
import { OnboardingWizard } from "@/components/OnboardingWizard";
import { LandingPage } from "@/components/LandingPage";
import { ProfilePicker } from "@/components/ProfilePicker";
import { LocaleProvider } from "@/i18n/LocaleProvider";
import { trackScreen } from "@/lib/tracker";
import { PageTransition } from "@/components/motion";
import { NAV_SECTIONS } from "@/lib/navSections";
import { JourneyGuide } from "@/components/JourneyGuide";
import { SectionIntro } from "@/components/SectionIntro";
import { ScholarshipAutopilot } from "@/components/growth/ScholarshipAutopilot";
import { AnswerVault } from "@/components/growth/AnswerVault";
import { GoalPlanner } from "@/components/growth/GoalPlanner";
import { DepartureChecklist } from "@/components/growth/DepartureChecklist";
import { TelegramSettings } from "@/components/telegram/TelegramSettings";
import { TelegramNudge } from "@/components/telegram/TelegramNudge";
import { SuccessStories } from "@/components/growth/SuccessStories";
import { JourneyControlCenter } from "@/components/journey/JourneyControlCenter";
import { ApplicationWorkspacePanel } from "@/components/journey/ApplicationWorkspacePanel";
import {
  ActivityPortfolioPanel,
  DocumentVaultPanel,
  StudyPlanPanel,
  TestPlannerPanel,
} from "@/components/journey/PreparePanels";
import {
  FinancialPlanPanel,
  LearningProvidersPanel,
  OffersPanel,
  RecommendationManagerPanel,
} from "@/components/journey/AfterAdmissionPanels";
import { CareerExplorerPanel, InterviewCenterPanel, VisaCenterPanel } from "@/components/journey/ExplorePanels";
import { RequirementsBrowser } from "@/components/journey/RequirementsBrowser";

/** Tabs that may appear in the URL hash (#scholarships …) for deep links. */
const LINKABLE_TABS = new Set<string>([
  ...NAV_SECTIONS.map((s) => s.id).filter((id) => id !== "profile"),
  "admin",
  "tracker",
  "deadlines",
  "courses",
  "consulting",
]);

function tabFromHash(): string | null {
  if (typeof window === "undefined") return null;
  const id = decodeURIComponent(window.location.hash.replace(/^#/, "")).trim();
  return LINKABLE_TABS.has(id) ? id : null;
}

export default function Home() {
  const [activeTab, setActiveTab] = useState("dashboard");
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
    try {
      const res = await fetch(`/api/tasks?profileId=${profileId}`);
      const data = await res.json();
      if (data.tasks) {
        const pending = data.tasks.filter((t: { isCompleted: boolean }) => !t.isCompleted);
        setTaskCount(pending.length);
      }
    } catch (err) {
      console.error("Error fetching task count:", err);
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
        // Deep link (#autopilot, #stories …) wins over the default tab.
        const linked = tabFromHash();
        if (linked && (linked !== "admin" || data.profile.isAdmin)) setActiveTab(linked);
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
    const want = `#${activeTab}`;
    if (window.location.hash === want) {
      hashSynced.current = true;
      return;
    }
    const url = `${window.location.pathname}${window.location.search}${want}`;
    if (hashSynced.current) window.history.pushState(null, "", url);
    else window.history.replaceState(null, "", url);
    hashSynced.current = true;
  }, [activeTab, view]);

  // Global search (spec §34) asks the page to focus a record it found.
  useEffect(() => {
    const onFocus = (e: Event) => {
      const detail = (e as CustomEvent<{ kind: string; id?: string | number }>).detail;
      if (!detail) return;
      if (detail.kind === "university") {
        setFocusUniversityId(Number(detail.id) || null);
        setActiveTab("universities");
      } else if (detail.kind === "application") {
        setWorkspaceId(Number(detail.id) || null);
        setActiveTab("workspace");
      } else {
        setActiveTab((detail.kind as string) === "task" ? "tasks" : detail.kind);
      }
    };
    window.addEventListener("scholarbridge:focus-record", onFocus);
    return () => window.removeEventListener("scholarbridge:focus-record", onFocus);
  }, []);

  useEffect(() => {
    const onNav = () => {
      const linked = tabFromHash();
      if (linked) setActiveTab(linked);
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
  const handleNavigateTab = (tab: string) => {
    if (tab === "profile") {
      setIsNewProfile(false);
      setIsProfileModalOpen(true);
      return;
    }
    setActiveTab(tab);
    if (typeof window !== "undefined") window.scrollTo({ top: 0, behavior: "smooth" });
  };

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
    return (
      <LocaleProvider>
        <main className="grid min-h-screen place-items-center bg-slate-100 px-4 text-center">
          <div role="status" aria-live="polite" className="space-y-4">
            <span className="mx-auto block h-10 w-10 animate-spin rounded-full border-4 border-indigo-100 border-t-indigo-600" />
            <div>
              <p className="font-semibold text-slate-800">Opening ScholarBridgeAI…</p>
              <p className="mt-1 text-sm text-slate-500">Checking your secure session.</p>
            </div>
          </div>
        </main>
      </LocaleProvider>
    );
  }

  if (view === "restore-error") {
    return (
      <LocaleProvider>
        <main className="grid min-h-screen place-items-center bg-slate-100 px-4 text-center">
          <section className="max-w-md rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
            <h1 className="text-xl font-bold text-slate-900">Dashboard unavailable</h1>
            <p className="mt-2 text-sm leading-relaxed text-slate-600">
              {restoreError || "We could not restore your secure session."}
            </p>
            <div className="mt-6 flex flex-wrap justify-center gap-3">
              <button
                type="button"
                onClick={() => {
                  setRestoreError(null);
                  setView("restoring");
                  void loadStoredProfile();
                }}
                className="rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-indigo-700"
              >
                Try again
              </button>
              <button
                type="button"
                onClick={() => setView("landing")}
                className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
              >
                Go to sign in
              </button>
            </div>
          </section>
        </main>
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

          {activeTab === "universities" && (
            <UniversityExplorer
              activeProfile={activeProfile}
              savedUniIds={savedUniIds}
              onSaveUniversity={handleSaveUniversity}
              onUnsaveUniversity={handleUnsaveUniversity}
              autoOpenUniversityId={focusUniversityId}
            />
          )}

          {activeTab === "scholarships" && (
            <ScholarshipHub
              activeProfile={activeProfile}
              savedScholarshipIds={savedScholarshipIds}
              onSaveScholarship={handleSaveScholarship}
              onUnsaveScholarship={handleUnsaveScholarship}
            />
          )}

          {activeTab === "tracker" && (
            <ApplicationTracker
              activeProfile={activeProfile}
              savedUniversities={savedUniversities}
              savedScholarships={savedScholarships}
              onUpdateSavedUniStatus={handleUpdateSavedUniStatus}
              onRemoveSavedUni={handleRemoveSavedUni}
              onUpdateSavedScholarshipStatus={handleUpdateSavedScholarshipStatus}
              onRemoveSavedScholarship={handleRemoveSavedScholarship}
            />
          )}

          {activeTab === "sop" && (
            <PremiumGate
              profileId={activeProfile?.id ?? null}
              feature="ai_essay"
              title="AI SOP & Essays is Premium"
              description="Generate, evaluate and review your Statement of Purpose with AI — an exclusive Premium feature."
              onUpgrade={() => setActiveTab("payments")}
            >
              <div className="space-y-4">
                <AiSopStudio activeProfile={activeProfile} />
                {/* #8 Advanced Essay AI — deterministic rubric + version history */}
                <EssayRubricStudio activeProfile={activeProfile} />
              </div>
            </PremiumGate>
          )}

          {activeTab === "tasks" && (
            <TaskRoadmap activeProfile={activeProfile} />
          )}

          {/* Complete Student Profile (#1) */}
          {activeTab === "profile" && activeProfile && (
            <CompleteProfileForm
              key={`profile-${activeProfile.id}`}
              activeProfile={activeProfile}
              onSaved={handleProfileUpdated}
            />
          )}

          {/* Chancing engine (#2) — Fit score and Admission estimate shown separately */}
          {activeTab === "chancing" && <ChancingPanel activeProfile={activeProfile} />}

          {/* #21 + #22 — profile strength dashboard + extracurricular analysis */}
          {activeTab === "strength" && <ProfileStrengthPanel activeProfile={activeProfile} />}

          {/* #3 AI Admissions Advisor */}
          {activeTab === "advisor" && <AdmissionsAdvisor activeProfile={activeProfile} />}

          {/* #10 Accepted students with a similar profile */}
          {activeTab === "similar" && <SimilarProfiles activeProfile={activeProfile} />}

          {/* Phase 4 — mentor marketplace (parent dashboard is gated below) */}
          {activeTab === "mentors" && <MentorMarketplace activeProfile={activeProfile} />}

          {/* #26/#27/#28 — personalized opportunities feed (curated catalog) */}
          {activeTab === "opportunities" && <OpportunitiesPanel />}

          {/* #29 — country comparison on published data only */}
          {activeTab === "compare" && <CountryComparePanel />}

          {/* Phase 3 — cost calculator, scholarship portfolio, CV, comparison */}
          {activeTab === "planning" && <PlanningStudio activeProfile={activeProfile} />}

          {/* Universal application tracker + outcomes flywheel (#12) */}
          {activeTab === "applications" && <ApplicationCenter activeProfile={activeProfile} />}

          {activeTab === "deadlines" && (
            <DeadlineCenter profileId={activeProfile?.id ?? null} />
          )}

          {activeTab === "chat" && <AiChatMentor activeProfile={activeProfile} />}

          {activeTab === "visa" && activeProfile && (
            <div className="space-y-4">
              <VisaCenterPanel profileId={activeProfile.id} onNavigateTab={handleNavigateTab} />
              <VisaSpeakingAssistant activeProfile={activeProfile} />
            </div>
          )}

          {activeTab === "forum" && (
            <ForumSection activeProfile={activeProfile} isModerator={activeProfile?.isAdmin ?? false} />
          )}

          {activeTab === "courses" && (
            <CoursesSection activeProfile={activeProfile} />
          )}

          {activeTab === "parent" && (
            <PremiumGate
              profileId={activeProfile?.id ?? null}
              feature="parent_dashboard"
              title="Parent dashboard is Pro"
              description="Share a read-only progress page with your family — a Pro feature families pay for."
              onUpgrade={() => setActiveTab("payments")}
            >
              <ParentDashboard activeProfile={activeProfile} />
            </PremiumGate>
          )}

          {/* ---- Journey reorganization (spec §2 sidebar groups) ---------- */}

          {/* DISCOVER */}
          {activeTab === "career" && <CareerExplorerPanel onNavigateTab={handleNavigateTab} />}

          {/* MY JOURNEY */}
          {activeTab === "study-plan" && activeProfile && (
            <StudyPlanPanel key={`plan-${activeProfile.id}`} profileId={activeProfile.id} onNavigateTab={handleNavigateTab} />
          )}
          {activeTab === "activities" && activeProfile && (
            <ActivityPortfolioPanel key={`act-${activeProfile.id}`} profileId={activeProfile.id} />
          )}

          {/* PREPARE */}
          {activeTab === "documents" && activeProfile && (
            <DocumentVaultPanel key={`docs-${activeProfile.id}`} profileId={activeProfile.id} onNavigateTab={handleNavigateTab} />
          )}
          {activeTab === "tests" && activeProfile && (
            <TestPlannerPanel key={`tests-${activeProfile.id}`} profileId={activeProfile.id} />
          )}
          {activeTab === "requirements" && activeProfile && (
            <RequirementsBrowser
              key={`req-${activeProfile.id}`}
              profileId={activeProfile.id}
              onOpenWorkspace={(id) => {
                setWorkspaceId(id);
                handleNavigateTab("workspace");
              }}
            />
          )}
          {activeTab === "funding" && activeProfile && (
            <FinancialPlanPanel key={`fund-${activeProfile.id}`} profileId={activeProfile.id} onNavigateTab={handleNavigateTab} />
          )}

          {/* APPLY */}
          {activeTab === "workspace" && activeProfile && (
            <ApplicationWorkspacePanel
              key={`ws-${activeProfile.id}-${workspaceId ?? "list"}`}
              profileId={activeProfile.id}
              applicationId={workspaceId}
              onSelect={(id) => setWorkspaceId(id || null)}
              onNavigateTab={handleNavigateTab}
            />
          )}
          {activeTab === "recommendations" && activeProfile && (
            <RecommendationManagerPanel key={`rec-${activeProfile.id}`} profileId={activeProfile.id} />
          )}

          {/* AFTER ADMISSION */}
          {activeTab === "offers" && activeProfile && (
            <OffersPanel key={`off-${activeProfile.id}`} profileId={activeProfile.id} onNavigateTab={handleNavigateTab} />
          )}
          {activeTab === "post-admission-funding" && activeProfile && (
            <FinancialPlanPanel key={`paf-${activeProfile.id}`} profileId={activeProfile.id} onNavigateTab={handleNavigateTab} />
          )}
          {activeTab === "interviews" && <InterviewCenterPanel onNavigateTab={handleNavigateTab} />}
          {activeTab === "learning" && activeProfile && <LearningProvidersPanel key={`lp-${activeProfile.id}`} profileId={activeProfile.id} />}

          {activeTab === "payments" && <PaymentsSection activeProfile={activeProfile} />}

          {activeTab === "rewards" && <RewardsSection activeProfile={activeProfile} />}

          {activeTab === "consulting" && <ConsultingSection activeProfile={activeProfile} />}

          {activeTab === "admin" && <AdminPanel activeProfile={activeProfile} />}

          {/* Growth features (CollegeVine / ApplyBoard / ScholarshipOwl /
              Crimson / AdmitSee-inspired, adapted) */}
          {activeTab === "autopilot" && (
            <ScholarshipAutopilot
              activeProfile={activeProfile}
              onSaveScholarship={async (id) => {
                await handleSaveScholarship(id);
              }}
              onNavigate={handleNavigateTab}
            />
          )}
          {activeTab === "vault" && <AnswerVault activeProfile={activeProfile} />}
          {activeTab === "goals" && <GoalPlanner activeProfile={activeProfile} />}
          {activeTab === "departure" && <DepartureChecklist activeProfile={activeProfile} onNavigate={handleNavigateTab} />}
          {activeTab === "stories" && <SuccessStories activeProfile={activeProfile} />}
          {activeTab === "notifications" && <TelegramSettings activeProfile={activeProfile} onNavigate={handleNavigateTab} />}

          {/* SEO/AEO: FAQ har bir bo'limda sahifa pastida ko'rinadi */}
          {activeTab !== "admin" && <FaqSection />}

        </PageTransition>
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-200 bg-white pt-6 pb-24 lg:pb-6 mt-12 text-center text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex flex-col sm:flex-row items-center gap-3">
            <p>© {new Date().getFullYear()} ScholarBridgeAI • Democratizing Global Higher Education Access</p>
            <div className="flex items-center gap-3">
              <a href="/terms" className="hover:text-slate-800 underline underline-offset-4">
                Terms
              </a>
              <a href="/privacy" className="hover:text-slate-800 underline underline-offset-4">
                Privacy
              </a>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <span className="hover:text-slate-800 cursor-pointer" onClick={() => setActiveTab("universities")}>
              University Matcher
            </span>
            <span className="hover:text-slate-800 cursor-pointer" onClick={() => setActiveTab("scholarships")}>
              Scholarship Discovery
            </span>
            <span className="hover:text-slate-800 cursor-pointer" onClick={() => setActiveTab("chat")}>
              AI Mentor
            </span>
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
