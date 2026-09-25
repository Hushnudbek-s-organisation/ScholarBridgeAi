"use client";

import React, { useState, useEffect, useCallback } from "react";
import { Navbar, StudentProfile } from "@/components/Navbar";
import { ProfileModal } from "@/components/ProfileModal";
import { DashboardView } from "@/components/DashboardView";
import { UniversityExplorer } from "@/components/UniversityExplorer";
import { ScholarshipHub } from "@/components/ScholarshipHub";
import { ApplicationTracker, SavedUniversityItem, SavedScholarshipItem } from "@/components/ApplicationTracker";
import { DeadlineCenter } from "@/components/DeadlineCenter";
import { ChancingPanel } from "@/components/ChancingPanel";
import { CompleteProfileForm } from "@/components/CompleteProfileForm";
import { ApplicationCenter } from "@/components/ApplicationCenter";
import { NextActionsPanel } from "@/components/NextActionsPanel";
import { AdmissionsAdvisor } from "@/components/AdmissionsAdvisor";
import { EssayRubricStudio } from "@/components/EssayRubricStudio";
import { SimilarProfiles } from "@/components/SimilarProfiles";
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

export default function Home() {
  const [activeTab, setActiveTab] = useState("dashboard");
  // "landing" = first-time visitor (English welcome page),
  // "wizard"  = step-by-step onboarding for a brand-new user,
  // "app"     = the main app (sidebar navigation).
  const [view, setView] = useState<"landing" | "wizard" | "app">("landing");

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
  const [taskCount, setTaskCount] = useState(0);

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
    const screen = view === "app" ? activeTab : view === "wizard" ? "onboarding" : "landing";
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

  const hydrateProfileData = useCallback((profileId: number) => {
    void fetchSavedUniversities(profileId);
    void fetchSavedScholarships(profileId);
    void fetchTaskCount(profileId);
  }, [fetchSavedScholarships, fetchSavedUniversities, fetchTaskCount]);

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
        return;
      }
      // No (or an expired) session — drop the stale local hint so the next
      // load does not pretend an account is active.
      try {
        localStorage.removeItem("scholarbridge_active_profile");
      } catch {
        // ignore
      }
    } catch (err) {
      console.error("Error restoring session:", err);
    }
    setView("landing");
  }, [hydrateProfileData, rememberProfile]);

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
      <main className="flex-1 w-full px-4 sm:px-6 lg:px-8 py-6">
        {/* Onboarding wizard — shown for profiles that haven't completed
            the step-by-step setup yet. Resumes from the saved step. */}
        {activeProfile && !activeProfile.onboardingCompleted ? (
          <OnboardingWizard
            profile={activeProfile}
            onComplete={handleWizardComplete}
          />
        ) : activeTab === "dashboard" && (
          <div className="space-y-4">
            {/* #4 Personalized Roadmap — the centrepiece: three actions */}
            <NextActionsPanel activeProfile={activeProfile} onNavigate={setActiveTab} />
            <DashboardView
              profile={activeProfile}
              onNavigateTab={setActiveTab}
              savedUniCount={savedUniversities.length}
              savedScholarshipCount={savedScholarships.length}
              taskCount={taskCount}
              onEditProfile={() => {
                setIsNewProfile(false);
                setIsProfileModalOpen(true);
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
          <PremiumGate
            profileId={activeProfile?.id ?? null}
            title="Tasks & Roadmap is Premium"
            description="Build and track your study-abroad application roadmap — an exclusive Premium feature."
            onUpgrade={() => setActiveTab("payments")}
          >
            <TaskRoadmap activeProfile={activeProfile} />
          </PremiumGate>
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

        {/* #3 AI Admissions Advisor */}
        {activeTab === "advisor" && <AdmissionsAdvisor activeProfile={activeProfile} />}

        {/* #10 Accepted students with a similar profile */}
        {activeTab === "similar" && <SimilarProfiles activeProfile={activeProfile} />}

        {/* Universal application tracker + outcomes flywheel (#12) */}
        {activeTab === "applications" && <ApplicationCenter activeProfile={activeProfile} />}

        {activeTab === "deadlines" && (
          <PremiumGate
            profileId={activeProfile?.id ?? null}
            title="Deadline Center is Premium"
            description="Track every scholarship, university and milestone deadline in one timeline — an exclusive Premium feature."
            onUpgrade={() => setActiveTab("payments")}
          >
            <DeadlineCenter profileId={activeProfile?.id ?? null} />
          </PremiumGate>
        )}

        {activeTab === "chat" && <AiChatMentor activeProfile={activeProfile} />}

        {activeTab === "visa" && <VisaSpeakingAssistant activeProfile={activeProfile} />}

        {activeTab === "forum" && (
          <PremiumGate
            profileId={activeProfile?.id ?? null}
            title="Community Forum is Premium"
            description="Read community topics, join discussions and post your own threads — an exclusive Premium feature."
            onUpgrade={() => setActiveTab("payments")}
          >
            <ForumSection activeProfile={activeProfile} isModerator={activeProfile?.isAdmin ?? false} />
          </PremiumGate>
        )}

        {activeTab === "courses" && (
          <PremiumGate
            profileId={activeProfile?.id ?? null}
            title="Video Courses are Premium"
            description="Watch video courses, take quizzes and earn certificates — an exclusive Premium feature."
            onUpgrade={() => setActiveTab("payments")}
          >
            <CoursesSection activeProfile={activeProfile} />
          </PremiumGate>
        )}

        {activeTab === "payments" && <PaymentsSection activeProfile={activeProfile} />}

        {activeTab === "rewards" && <RewardsSection activeProfile={activeProfile} />}

        {activeTab === "consulting" && <ConsultingSection activeProfile={activeProfile} />}

        {activeTab === "admin" && <AdminPanel activeProfile={activeProfile} />}

        {/* SEO/AEO: FAQ har bir bo'limda sahifa pastida ko'rinadi */}
        <FaqSection />
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-200 bg-white py-6 mt-12 text-center text-xs text-slate-500">
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
