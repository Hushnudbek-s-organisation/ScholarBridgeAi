"use client";

/**
 * ScholarBridge Telegram Mini App.
 *
 * Security model:
 *  - The raw, signed `Telegram.WebApp.initData` is sent to
 *    POST /api/telegram/miniapp/auth, which verifies it with the bot token.
 *    `initDataUnsafe` is only used for cosmetics before that (never for access).
 *  - The returned bearer token lives in a React ref (memory only — not in
 *    localStorage/sessionStorage/cookies) and expires after an hour; on a 401
 *    the page silently re-exchanges initData once.
 *  - Every data call goes to the SAME API routes the website uses, so the
 *    server applies the same ownership checks, entitlements and quotas.
 */
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { dictionaries, loadMessages, registerMessages, type Messages } from "@/i18n/messages";
import { formatMessage } from "@/i18n/formatMessage";
import { toWikimediaThumb, viaImageProxy } from "@/lib/wikimediaThumb";
import {
  Bell,
  BookmarkCheck,
  Bookmark,
  Bot,
  ChevronDown,
  ExternalLink,
  GraduationCap,
  Home,
  Landmark,
  ListChecks,
  Loader2,
  Search,
  Sparkles,
  Target,
  User,
  Unplug,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { cn } from "@/components/ui/cn";
import { TELEGRAM_NATIVE_COLORS } from "@/components/ui/tokens";

// ---------------------------------------------------------------------------
// Telegram WebApp (subset we use)
// ---------------------------------------------------------------------------

interface TgBackButton {
  isVisible?: boolean;
  show: () => void;
  hide: () => void;
  onClick: (cb: () => void) => void;
  offClick: (cb: () => void) => void;
}

interface TgHaptic {
  impactOccurred?: (style: "light" | "medium" | "heavy") => void;
  notificationOccurred?: (type: "success" | "error" | "warning") => void;
  selectionChanged?: () => void;
}

interface TgWebApp {
  initData: string;
  initDataUnsafe?: { user?: { first_name?: string; language_code?: string } };
  colorScheme?: "light" | "dark";
  ready: () => void;
  expand: () => void;
  openLink: (url: string) => void;
  showConfirm?: (message: string, cb: (ok: boolean) => void) => void;
  BackButton?: TgBackButton;
  HapticFeedback?: TgHaptic;
  setHeaderColor?: (color: string) => void;
  setBackgroundColor?: (color: string) => void;
}

declare global {
  interface Window {
    Telegram?: { WebApp?: TgWebApp };
  }
}

type Lang = "uz" | "ru" | "en";
type Screen = "home" | "universities" | "scholarships" | "applications" | "profile";
type Phase =
  | { k: "loading" }
  | { k: "outside" }
  | { k: "error"; retry: boolean }
  | { k: "unlinked"; siteUrl: string | null; firstName: string | null }
  | { k: "ready" };

interface MiniProfile {
  id: number;
  name: string;
  preferredLocale?: string | null;
  degreeLevel?: string | null;
  targetMajor?: string | null;
  gpa?: number | null;
  gpaScale?: number | null;
  ieltsScore?: number | null;
  toeflScore?: number | null;
  preferredCountries?: string | null;
  budgetAnnualUsd?: number | null;
}

// ---------------------------------------------------------------------------
// Copy is centralized in the checked-in en/uz/ru message files. The Mini App
// selects the language reported by Telegram/profile rather than assuming the
// website's current cookie locale.
type MiniAppMessages = Messages["telegram"]["miniApp"];
/**
 * Resolved on first use, not at import time: only English is bundled, and the
 * Uzbek/Russian dictionaries arrive with the active locale (see
 * `src/i18n/messages.ts`). A missing language falls back to English rather
 * than to `undefined`.
 */
function miniAppText(lang: Lang): MiniAppMessages {
  return dictionaries[lang]?.telegram.miniApp ?? dictionaries.en.telegram.miniApp;
}
/**
 * The mini app picks its language from Telegram, not from the website cookie,
 * and it is rendered without a `LocaleProvider` — so the Uzbek/Russian
 * dictionaries have to be fetched here. Until one arrives the English copy is
 * shown, which is what `miniAppText` falls back to.
 */
function useMiniAppText(lang: Lang): MiniAppMessages {
  const [ready, setReady] = useState<Lang | null>(() => (dictionaries[lang] ? lang : null));
  useEffect(() => {
    if (dictionaries[lang]) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- one-shot: the dictionary is already registered
      setReady(lang);
      return;
    }
    let live = true;
    void loadMessages(lang).then((messages) => {
      registerMessages(lang, messages);
      if (live) setReady(lang);
    });
    return () => {
      live = false;
    };
  }, [lang]);
  return ready === lang ? miniAppText(lang) : dictionaries.en.telegram.miniApp;
}

const PRESETS: { id: string; days: number[] }[] = [
  { id: "standard", days: [30, 14, 7, 3, 1, 0] },
  { id: "short", days: [7, 3, 1, 0] },
  { id: "off", days: [] },
];

function toLang(code: string | null | undefined): Lang {
  const c = (code || "").toLowerCase();
  if (c.startsWith("ru") || c.startsWith("kk") || c.startsWith("ky")) return "ru";
  if (c.startsWith("en")) return "en";
  return "uz";
}

const money = (n: unknown) => (typeof n === "number" && Number.isFinite(n) ? `$${Math.round(n).toLocaleString("en-US")}` : null);

function fmtDate(d: string | null | undefined): string {
  if (!d) return "—";
  const date = new Date(d);
  if (Number.isNaN(date.getTime())) return "—";
  return `${String(date.getUTCDate()).padStart(2, "0")}.${String(date.getUTCMonth() + 1).padStart(2, "0")}.${date.getUTCFullYear()}`;
}

class ApiError extends Error {
  constructor(public status: number, public code: string | null) {
    super(`HTTP ${status}`);
  }
}

/** Subtle native haptics — every one is a no-op outside Telegram. */
const haptic = {
  tap: () => window.Telegram?.WebApp?.HapticFeedback?.selectionChanged?.(),
  success: () => window.Telegram?.WebApp?.HapticFeedback?.notificationOccurred?.("success"),
  error: () => window.Telegram?.WebApp?.HapticFeedback?.notificationOccurred?.("error"),
};

// ---------------------------------------------------------------------------
// Catalogue items (university + scholarship rows share one shape)
// ---------------------------------------------------------------------------

interface Item {
  id: number;
  name?: string;
  title?: string;
  city?: string | null;
  country?: string | null;
  provider?: string | null;
  worldRanking?: number | null;
  annualTuitionUsd?: number | null;
  amountUsdValue?: number | null;
  deadlineDate?: string | null;
  matchScore?: number | null;
  imageUrl?: string | null;
  flagEmoji?: string | null;
  degreeLevel?: string | null;
  programMajor?: string | null;
  minGpa?: number | null;
  minIelts?: number | null;
  acceptanceRate?: number | null;
  postStudyWorkVisaYears?: number | null;
  websiteUrl?: string | null;
  coverageType?: string | null;
  description?: string | null;
  requirements?: string | null;
  annualLivingEstUsd?: number | null;
  matchReasons?: string[];
  matchIssues?: string[];
}

type Kind = "u" | "s";
type DetailTarget = { kind: Kind; item: Item };
type SavedEntry = { rowId: number; item: Item };
type SavedMap = Map<number, SavedEntry>;

/**
 * Instant catalogue cache (per tab switch). A `useRef` would die together with
 * the screen component on every tab change, so the map lives at module level —
 * "Home ↔ Universities ↔ Scholarships" re-renders with no spinner and no
 * network round trip for a page the student already saw.
 */
const searchCache = new Map<string, { items: Item[]; totalPages: number; at: number }>();
const SEARCH_CACHE_TTL_MS = 60_000;
const SEARCH_CACHE_REVALIDATE_MS = 15_000;

/** Cache freshness checks live outside the component (render must stay pure). */
function cacheEntryIsStale(at: number): boolean {
  return Date.now() - at > SEARCH_CACHE_REVALIDATE_MS;
}

function pruneSearchCache(): void {
  if (searchCache.size <= 40) return;
  for (const [k, v] of searchCache) {
    if (Date.now() - v.at > SEARCH_CACHE_TTL_MS) searchCache.delete(k);
  }
}

/** Days from now until `d` (negative = past). Render calls this, not Date.now. */
function daysUntilDate(d: string | null | undefined): number | null {
  if (!d) return null;
  const ms = new Date(d).getTime();
  if (Number.isNaN(ms)) return null;
  return Math.round((ms - Date.now()) / 86_400_000);
}

const STATUS_CLASSES: Record<string, string> = {
  not_started: "tg-status-neutral",
  preparing: "tg-status-warning",
  essay: "tg-status-info",
  documents: "tg-status-info",
  recommendations: "tg-status-info",
  fee_paid: "tg-status-info",
  submitted: "tg-status-primary",
  interview: "tg-status-violet",
  decision: "tg-status-teal",
  in_progress: "tg-status-warning",
  accepted: "tg-status-success",
  rejected: "tg-status-danger",
  waitlisted: "tg-status-orange",
  deferred: "tg-status-neutral",
  withdrawn: "tg-status-neutral",
};

/** Only these statuses are accepted by PATCH /api/applications. */
const SETTABLE_STATUSES = [
  "not_started",
  "preparing",
  "essay",
  "documents",
  "recommendations",
  "fee_paid",
  "submitted",
  "interview",
  "decision",
  "withdrawn",
];

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function MiniApp() {
  const [phase, setPhase] = useState<Phase>({ k: "loading" });
  const [lang, setLang] = useState<Lang>("uz");
  const [screen, setScreen] = useState<Screen>("home");
  const [profile, setProfile] = useState<MiniProfile | null>(null);
  const [siteUrl, setSiteUrl] = useState<string | null>(null);
  const tokenRef = useRef<string | null>(null);
  const tgRef = useRef<TgWebApp | null>(null);
  const [tg, setTg] = useState<TgWebApp | null>(null);
  const t = useMiniAppText(lang);

  // Command-center state
  const [plan, setPlan] = useState<string | null>(null);
  const [detail, setDetail] = useState<DetailTarget | null>(null);
  const [savedU, setSavedU] = useState<SavedMap>(new Map());
  const [savedS, setSavedS] = useState<SavedMap>(new Map());
  const [busySave, setBusySave] = useState<number | null>(null);
  const [saveNotice, setSaveNotice] = useState<string | null>(null);
  // Home tiles hand a "start with ⭐ Saved on" flag to the search screens.
  const [savedOnlyNav, setSavedOnlyNav] = useState<{ kind: Kind; token: number } | null>(null);
  // "View all" on the home deadlines strip opens the Deadlines view.
  const [appView, setAppView] = useState<"apps" | "deadlines">("apps");

  const exchange = useCallback(async (): Promise<boolean> => {
    const tg = tgRef.current;
    if (!tg?.initData) return false;
    const res = await fetch("/api/telegram/miniapp/auth", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ initData: tg.initData }),
      cache: "no-store",
    });
    if (!res.ok) {
      tokenRef.current = null;
      setPhase({ k: "error", retry: res.status >= 500 || res.status === 429 });
      return false;
    }
    const data = await res.json();
    setSiteUrl(data.siteUrl ?? null);
    if (!data.linked) {
      tokenRef.current = null;
      setLang(toLang(data.telegram?.languageCode));
      setPhase({ k: "unlinked", siteUrl: data.siteUrl ?? null, firstName: data.telegram?.firstName ?? null });
      return false;
    }
    tokenRef.current = data.token;
    setProfile(data.profile);
    setLang(toLang(data.profile?.preferredLocale || tg.initDataUnsafe?.user?.language_code));
    setPhase({ k: "ready" });
    return true;
  }, []);

  /** Authenticated call to an existing API route (one silent re-auth on 401). */
  const api = useCallback(
    async <T,>(path: string, init: RequestInit = {}): Promise<{ data: T; fallback: boolean }> => {
      const send = () => {
        const headers = new Headers(init.headers);
        if (tokenRef.current) headers.set("Authorization", `Bearer ${tokenRef.current}`);
        if (init.body) headers.set("Content-Type", "application/json");
        return fetch(path, { ...init, headers, cache: "no-store" });
      };
      let res = await send();
      if (res.status === 401) {
        const body = await res.json().catch(() => ({}));
        // Expired session → re-exchange initData once. Unlinked → the
        // exchange flips the page to the "not connected" screen.
        const renewed = await exchange();
        if (!renewed || body?.code === "telegram_unlinked") throw new ApiError(401, body?.code ?? null);
        res = await send();
      }
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new ApiError(res.status, body?.code ?? null);
      }
      return { data: (await res.json()) as T, fallback: res.headers.get("x-data-source") === "fallback" };
    },
    [exchange]
  );

  useEffect(() => {
    let cancelled = false;
    let tries = 0;
    const start = () => {
      if (cancelled) return;
      const tg = window.Telegram?.WebApp;
      if (!tg && tries++ < 30) return void setTimeout(start, 100);
      if (!tg || !tg.initData) return setPhase({ k: "outside" });
      tgRef.current = tg;
      setTg(tg);
      tg.ready();
      tg.expand();
      // Blend the chrome with the app palette (cosmetic; invalid values are
      // ignored by the client).
      try {
        tg.setHeaderColor?.(TELEGRAM_NATIVE_COLORS.primary);
        tg.setBackgroundColor?.(tg.colorScheme === "dark" ? TELEGRAM_NATIVE_COLORS.darkCanvas : TELEGRAM_NATIVE_COLORS.lightCanvas);
      } catch {
        /* older clients */
      }
      setLang(toLang(tg.initDataUnsafe?.user?.language_code));
      exchange().catch(() => setPhase({ k: "error", retry: true }));
    };
    const id = setTimeout(start, 0);
    return () => {
      cancelled = true;
      clearTimeout(id);
    };
  }, [exchange]);

  // ---- Native BackButton -------------------------------------------------
  // Detail sheet open → close it. A tab other than Home → go Home. On Home
  // with nothing open the button is hidden (nothing to go back to).
  useEffect(() => {
    const bb = tgRef.current?.BackButton;
    if (!bb || phase.k !== "ready") return;
    const onBack = () => {
      if (detail) setDetail(null);
      else setScreen("home");
    };
    if (detail || screen !== "home") {
      bb.show?.();
      bb.onClick?.(onBack);
    } else {
      bb.hide?.();
    }
    return () => {
      bb.offClick?.(onBack);
    };
  }, [phase.k, screen, detail]);

  const openSite = useCallback(
    (path = "/") => {
      const base = siteUrl || (typeof window !== "undefined" ? window.location.origin : "");
      const url = `${base.replace(/\/+$/, "")}${path}`;
      if (tgRef.current) tgRef.current.openLink(url);
      else window.open(url, "_blank", "noopener");
    },
    [siteUrl]
  );

  // ---- Saved list (⭐ / unsave) ------------------------------------------
  const profileId = profile?.id ?? null;
  const refreshSaved = useCallback(
    async (kind: Kind) => {
      const path = kind === "u" ? "/api/saved-universities" : "/api/saved-scholarships";
      try {
        const { data } = await api<Record<string, any[]>>(`${path}?profileId=${profileId}`);
        const rows = (kind === "u" ? (data as any).savedUniversities : (data as any).savedScholarships) ?? [];
        const map: SavedMap = new Map();
        for (const r of rows) {
          const obj = kind === "u" ? r.university : r.scholarship;
          if (!obj?.id) continue;
          map.set(Number(obj.id), {
            rowId: Number(r.id),
            item: { ...obj, matchScore: r.matchScore ?? obj.matchScore ?? null },
          });
        }
        (kind === "u" ? setSavedU : setSavedS)(map);
      } catch {
        // Saved badges are decorative — keep whatever is on screen.
      }
    },
    [api, profileId]
  );

  useEffect(() => {
    if (phase.k !== "ready") return;
    // Deferred one tick: the effect body itself must not start state writes
    // synchronously (React's rule for effects).
    const id = setTimeout(() => {
      void refreshSaved("u");
      void refreshSaved("s");
    }, 0);
    return () => clearTimeout(id);
  }, [phase.k, refreshSaved]);

  useEffect(() => {
    if (phase.k !== "ready" || !profile) return;
    let cancelled = false;
    api<{ plan?: string }>(`/api/premium/status?profileId=${profile.id}`)
      .then(({ data }) => !cancelled && setPlan(data.plan ?? "free"))
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [phase.k, profile, api]);

  /** Save ⇄ unsave through the same routes the website uses. */
  const toggleSave = useCallback(
    async (kind: Kind, item: Item) => {
      if (busySave != null) return;
      const store = kind === "u" ? savedU : savedS;
      const setStore = kind === "u" ? setSavedU : setSavedS;
      const existing = store.get(item.id);
      const path = kind === "u" ? "/api/saved-universities" : "/api/saved-scholarships";
      setBusySave(item.id);
      setSaveNotice(null);
      try {
        if (existing) {
          await api(`${path}?id=${existing.rowId}`, { method: "DELETE" });
          setStore((prev) => {
            const next = new Map(prev);
            next.delete(item.id);
            return next;
          });
        } else {
          const body =
            kind === "u"
              ? { profileId, universityId: item.id }
              : { profileId, scholarshipId: item.id };
          const { data } = await api<{ saved?: { id?: number } }>(path, {
            method: "POST",
            body: JSON.stringify(body),
          });
          setStore((prev) => new Map(prev).set(item.id, { rowId: Number(data?.saved?.id ?? -1), item }));
        }
        haptic.success();
      } catch {
        haptic.error();
        setSaveNotice(errorText(t, null));
      } finally {
        setBusySave(null);
      }
    },
    [busySave, savedU, savedS, api, profileId, t]
  );

  const goToScreen = useCallback((next: Screen, view?: "apps" | "deadlines") => {
    if (view) setAppView(view);
    setDetail(null);
    setScreen(next);
    haptic.tap();
    try {
      window.scrollTo({ top: 0, behavior: "instant" as ScrollBehavior });
    } catch {
      window.scrollTo(0, 0);
    }
  }, []);

  // ------------------------------------------------------------ states
  const shell = (children: React.ReactNode) => (
    <div className={cn("min-h-screen", "tg-bg tg-text")}>
      {children}
    </div>
  );

  if (phase.k === "loading") {
    return shell(
      <div className="flex min-h-screen flex-col items-center justify-center gap-3" role="status" aria-live="polite">
        <Loader2 className={cn("h-7 w-7 animate-spin", "tg-button-text")} />
        <p className={cn("text-sm", "tg-hint")}>{t.loading}</p>
      </div>
    );
  }
  if (phase.k === "outside" || phase.k === "error" || phase.k === "unlinked") {
    const title = phase.k === "outside" ? t.outsideTitle : phase.k === "error" ? t.errorTitle : t.unlinkedTitle;
    const body = phase.k === "outside" ? t.outsideBody : phase.k === "error" ? t.errorBody : t.unlinkedBody;
    return shell(
      <main className="mx-auto flex min-h-screen max-w-md flex-col items-center justify-center gap-4 px-6 text-center">
        <div className={cn("flex h-14 w-14 items-center justify-center rounded-overlay", "tg-card")}>
          <GraduationCap className={cn("h-7 w-7", "tg-button-text")} />
        </div>
        <h1 className="text-lg font-bold">{title}</h1>
        <p className={cn("text-sm leading-relaxed", "tg-hint")}>{body}</p>
        {phase.k === "error" && phase.retry && (
          <PrimaryButton onClick={() => { setPhase({ k: "loading" }); exchange().catch(() => setPhase({ k: "error", retry: true })); }}>{t.retry}</PrimaryButton>
        )}
        {(phase.k === "unlinked" || phase.k === "outside") && (
          <PrimaryButton onClick={() => openSite(phase.k === "unlinked" ? "/#notifications" : "/")}>
            <ExternalLink className="h-4 w-4" /> {t.openSite}
          </PrimaryButton>
        )}
      </main>
    );
  }

  // ------------------------------------------------------------ ready
  const tabs: { id: Screen; icon: React.ComponentType<{ className?: string }> }[] = [
    { id: "home", icon: Home },
    { id: "universities", icon: Landmark },
    { id: "scholarships", icon: GraduationCap },
    { id: "applications", icon: ListChecks },
    { id: "profile", icon: User },
  ];
  const planLabel = plan === "free" ? t.planNames.free : plan === "premium" ? t.planNames.premium : plan === "admin" ? t.planNames.admin : plan ?? "…";

  return shell(
    <div className="mx-auto flex min-h-screen max-w-xl flex-col">
      {/* ---- Top Mini App bar: brand · student/plan pill · language pills ---- */}
      <header
        className={cn("sticky top-0 z-30 border-b px-3 py-2", "tg-bg tg-border-card")}

      >
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="unstyled"
            type="button"
            onClick={() => goToScreen("home")}
            className="flex min-h-11 min-w-11 items-center gap-2 rounded-surface px-1.5 py-1 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600"
          >
            <span
              className={cn("flex h-8 w-8 shrink-0 items-center justify-center rounded-surface", "tg-button")}

            >
              <GraduationCap className="h-4.5 w-4.5" />
            </span>
            <span className="text-sm font-extrabold tracking-tight">ScholarBridge</span>
          </Button>
          {profile && (
            <span
              className={cn("flex min-w-0 items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold", "tg-card tg-text")}

            >
              <span className="min-w-0 break-words">{profile.name}</span>
              <span className={cn("shrink-0 rounded-full px-1.5 py-0.5 text-xs font-bold", "tg-button")}>
                {planLabel}
              </span>
            </span>
          )}
          <div
            className={cn("ml-auto flex items-center gap-0.5 rounded-full p-0.5", "tg-card")}

            role="group"
            aria-label={t.langLabel}
          >
            {(["uz", "ru", "en"] as Lang[]).map((code) => (
              <Button variant="unstyled"
                key={code}
                type="button"
                onClick={() => {
                  haptic.tap();
                  setLang(code);
                }}
                aria-pressed={lang === code}
                className={cn("min-h-11 min-w-11 rounded-full px-2 text-xs font-black uppercase focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600", (lang === code ? "tg-button" : "tg-hint"))}

              >
                {code}
              </Button>
            ))}
          </div>
        </div>
      </header>

      <main className="flex-1 px-4 pb-24 pt-4">
        {screen === "home" && profile && (
          <HomeScreen
            t={t}
            api={api}
            profile={profile}
            go={goToScreen}
            onSavedTile={(kind) => setSavedOnlyNav({ kind, token: Date.now() })}
          />
        )}
        {screen === "universities" && profile && (
          <SearchScreen
            kind="u"
            t={t}
            api={api}
            profile={profile}
            savedMap={savedU}
            busySave={busySave}
            onToggleSave={(item) => void toggleSave("u", item)}
            onOpenDetail={(item) => {
              haptic.tap();
              setDetail({ kind: "u", item });
            }}
            initialSavedOnly={savedOnlyNav?.kind === "u"}
            onSavedOnlyConsumed={() => setSavedOnlyNav(null)}
            notice={saveNotice}
          />
        )}
        {screen === "scholarships" && profile && (
          <SearchScreen
            kind="s"
            t={t}
            api={api}
            profile={profile}
            savedMap={savedS}
            busySave={busySave}
            onToggleSave={(item) => void toggleSave("s", item)}
            onOpenDetail={(item) => {
              haptic.tap();
              setDetail({ kind: "s", item });
            }}
            initialSavedOnly={savedOnlyNav?.kind === "s"}
            onSavedOnlyConsumed={() => setSavedOnlyNav(null)}
            notice={saveNotice}
          />
        )}
        {screen === "applications" && profile && (
          <ApplicationsScreen t={t} api={api} profile={profile} view={appView} setView={setAppView} />
        )}
        {screen === "profile" && profile && (
          <ProfileScreen t={t} api={api} profile={profile} openSite={openSite} tg={tg} onUnlinked={() => exchange()} />
        )}
      </main>

      {detail && profile && (
        <DetailSheet
          t={t}
          api={api}
          profile={profile}
          target={detail}
          onClose={() => setDetail(null)}
          savedMap={detail.kind === "u" ? savedU : savedS}
          busySave={busySave}
          onToggleSave={(item) => void toggleSave(detail.kind, item)}
          openSite={openSite}
        />
      )}

      <nav
        className={cn("fixed inset-x-0 bottom-0 border-t", "tg-bg tg-border-card tg-safe-bottom")}

        aria-label={t.navigationLabel}
      >
        <div className="mx-auto grid max-w-xl grid-cols-5">
          {tabs.map(({ id, icon: Icon }) => (
            <Button variant="unstyled"
              key={id}
              type="button"
              onClick={() => goToScreen(id)}
              aria-current={screen === id ? "page" : undefined}
              className={cn("flex min-h-11 min-w-11 flex-col items-center gap-0.5 rounded-control py-2 text-xs font-semibold focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600", (screen === id ? "tg-button-text" : "tg-hint"))}

            >
              <Icon className="h-5 w-5" />
              {t.tabs[id]}
            </Button>
          ))}
        </div>
      </nav>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Pieces
// ---------------------------------------------------------------------------

type T = MiniAppMessages;
type Api = <R>(path: string, init?: RequestInit) => Promise<{ data: R; fallback: boolean }>;

function PrimaryButton({ children, onClick, disabled }: { children: React.ReactNode; onClick: () => void; disabled?: boolean }) {
  return (
    <Button variant="unstyled"
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={cn("inline-flex min-h-11 min-w-11 items-center justify-center gap-2 rounded-surface px-4 py-2.5 text-sm font-semibold focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600 disabled:opacity-60", "tg-button")}

    >
      {children}
    </Button>
  );
}

function Card({ children, onClick }: { children: React.ReactNode; onClick?: () => void }) {
  const inner = (
    <div className={cn("rounded-overlay p-3.5", "tg-card")}>
      {children}
    </div>
  );
  if (!onClick) return inner;
  return (
    <Button variant="unstyled"
      type="button"
      onClick={onClick}
      className="w-full rounded-overlay text-left focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600"
    >
      {inner}
    </Button>
  );
}

function Notice({ text }: { text: string }) {
  return <p className={cn("py-6 text-center text-sm", "tg-hint")}>{text}</p>;
}

function errorText(t: T, err: unknown): string {
  if (err instanceof ApiError && err.status === 429) return t.rateLimited;
  if (err instanceof ApiError && err.status === 503) return t.unavailable;
  return t.failed;
}

function useLoad<R>(loader: () => Promise<R>, deps: React.DependencyList) {
  const [state, setState] = useState<{ loading: boolean; data: R | null; error: unknown }>({ loading: true, data: null, error: null });
  useEffect(() => {
    let cancelled = false;
    const id = setTimeout(() => {
      loader()
        .then((data) => !cancelled && setState({ loading: false, data, error: null }))
        .catch((error) => !cancelled && setState({ loading: false, data: null, error }));
    }, 0);
    return () => {
      cancelled = true;
      clearTimeout(id);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
  return state;
}

function Spinner() {
  return (
    <div className="flex justify-center py-8" role="status">
      <Loader2 className={cn("h-6 w-6 animate-spin", "tg-button-text")} />
    </div>
  );
}

/** Deadline countdown badge: 🔴 critical · 🟠 soon · 🟢 normal. */
function DeadlineBadge({ days, urgency, t }: { days: number | null | undefined; urgency?: string | null; t: T }) {
  const icon = urgency === "critical" ? "🔴" : urgency === "soon" ? "🟠" : "🟢";
  if (days == null) return null;
  return (
    <span className={cn("inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold", "tg-bg tg-text")}>
      <span aria-hidden>{icon}</span>
      {days === 0 ? t.todayLabel : formatMessage(t.daysLeft, { n: days })}
    </span>
  );
}

function ItemThumb({ item, kind, size = "h-16 w-16" }: { item: Item; kind: Kind; size?: string }) {
  const [broken, setBroken] = useState(false);
  const raw = item.imageUrl ?? null;
  const thumb = !broken && raw ? viaImageProxy(toWikimediaThumb(raw, 320)) : !raw ? null : raw;
  return (
    <div className={cn(`${size} shrink-0 overflow-hidden rounded-surface`, "tg-bg")}>
      {thumb ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={thumb}
          alt=""
          loading="lazy"
          decoding="async"
          onError={() => {
            if (!broken) setBroken(true);
          }}
          className="h-full w-full object-cover"
        />
      ) : (
        <div className="flex h-full w-full items-center justify-center text-2xl" aria-hidden>
          {item.flagEmoji || (kind === "u" ? "🎓" : "💰")}
        </div>
      )}
    </div>
  );
}

// ---- Home ------------------------------------------------------------------

interface DeadlineItem {
  id?: string;
  title?: string;
  type?: string;
  date?: string | null;
  daysRemaining?: number | null;
  urgency?: string | null;
}

function HomeScreen({
  t,
  api,
  profile,
  go,
  onSavedTile,
}: {
  t: T;
  api: Api;
  profile: MiniProfile;
  go: (screen: Screen, view?: "apps" | "deadlines") => void;
  onSavedTile: (kind: Kind) => void;
}) {
  const state = useLoad(async () => {
    // Five reads in parallel — the command center paints as one unit.
    const [next, unis, schs, dls, apps] = await Promise.all([
      api<{ headline?: string; actions?: { id: string; title: string; why: string; urgency: string; target?: string }[] }>(
        `/api/next-actions?profileId=${profile.id}`
      ).then((r) => r.data),
      api<{ savedUniversities?: unknown[] }>(`/api/saved-universities?profileId=${profile.id}`)
        .then((r) => r.data)
        .catch(() => ({ savedUniversities: [] })),
      api<{ savedScholarships?: unknown[] }>(`/api/saved-scholarships?profileId=${profile.id}`)
        .then((r) => r.data)
        .catch(() => ({ savedScholarships: [] })),
      api<{ items?: DeadlineItem[] }>(`/api/deadlines?profileId=${profile.id}`)
        .then((r) => r.data)
        .catch(() => ({ items: [] })),
      api<{ applications?: { id: number; status: string }[] }>(`/api/applications?profileId=${profile.id}`)
        .then((r) => r.data)
        .catch(() => ({ applications: [] })),
    ]);
    return {
      next,
      unis: unis.savedUniversities?.length ?? 0,
      schs: schs.savedScholarships?.length ?? 0,
      deadlines: (dls.items ?? [])
        .filter((i) => i.date && typeof i.daysRemaining === "number" && i.daysRemaining >= 0)
        .sort((a, b) => (a.daysRemaining ?? 0) - (b.daysRemaining ?? 0))
        .slice(0, 3),
      apps: (apps.applications ?? []).filter((a) => !["withdrawn", "rejected", "decision"].includes(a.status)).length,
    };
  }, [profile.id]);

  const dot: Record<string, string> = { critical: "tg-status-danger", high: "tg-status-orange", medium: "tg-status-warning", low: "tg-status-success" };
  const english = profile.ieltsScore != null
    ? formatMessage(t.ieltsScore, { score: profile.ieltsScore })
    : profile.toeflScore != null
      ? formatMessage(t.toeflScore, { score: profile.toeflScore })
      : null;
  const pills: (string | null)[] = [
    profile.degreeLevel ?? null,
    profile.targetMajor ?? null,
    profile.gpa != null ? `${t.gpa} ${profile.gpa}${profile.gpaScale ? ` / ${profile.gpaScale}` : ""}` : null,
    english,
  ];
  const profileIncomplete = pills.some((p) => !p);

  /** Next-action target → the Mini App screen that owns it. */
  const targetScreen = (target?: string): { screen: Screen; view?: "apps" | "deadlines" } => {
    if (target === "profile") return { screen: "profile" };
    if (target === "scholarships") return { screen: "scholarships" };
    if (target === "chancing") return { screen: "universities" };
    if (target === "deadlines") return { screen: "applications", view: "deadlines" };
    return { screen: "applications" };
  };

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold">{formatMessage(t.hello, { name: profile.name })}</h1>

      {/* Profile readiness summary */}
      <Card>
        <div className="flex items-center gap-2">
          <Target className={cn("h-4 w-4 shrink-0", "tg-button-text")} />
          <p className="text-sm font-bold">{t.tabs.profile}</p>
        </div>
        <div className="mt-2 flex flex-wrap gap-1.5">
          {pills.map((p, i) =>
            p ? (
              <span key={i} className={cn("rounded-full px-2.5 py-1 text-xs font-semibold", "tg-bg tg-text")}>
                {p}
              </span>
            ) : (
              <span key={i} className={cn("rounded-full px-2.5 py-1 text-xs font-semibold", "tg-bg tg-hint")}>
                {t.notSet}
              </span>
            )
          )}
        </div>
        {profileIncomplete && (
          <Button variant="unstyled"
            type="button"
            onClick={() => go("profile")}
            className={cn("mt-2.5 inline-flex min-h-11 min-w-11 items-center gap-1.5 rounded-surface px-3 py-2 text-xs font-bold focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600", "tg-button")}

          >
            {t.completeProfile}
          </Button>
        )}
      </Card>

      {/* Interactive stat tiles */}
      <div className="grid grid-cols-3 gap-2">
        <Button variant="unstyled"
          type="button"
          onClick={() => {
            haptic.tap();
            onSavedTile("u");
            go("universities");
          }}
          className="rounded-surface text-left focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600"
        >
          <Card>
            <p className="text-2xl font-bold">{state.data?.unis ?? "—"}</p>
            <p className={cn("text-sm leading-tight", "tg-hint")}>{t.savedUnis}</p>
          </Card>
        </Button>
        <Button variant="unstyled"
          type="button"
          onClick={() => {
            haptic.tap();
            onSavedTile("s");
            go("scholarships");
          }}
          className="rounded-surface text-left focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600"
        >
          <Card>
            <p className="text-2xl font-bold">{state.data?.schs ?? "—"}</p>
            <p className={cn("text-sm leading-tight", "tg-hint")}>{t.savedSch}</p>
          </Card>
        </Button>
        <Button variant="unstyled"
          type="button"
          onClick={() => {
            haptic.tap();
            go("applications");
          }}
          className="rounded-surface text-left focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600"
        >
          <Card>
            <p className="text-2xl font-bold">{state.data?.apps ?? "—"}</p>
            <p className={cn("text-sm leading-tight", "tg-hint")}>{t.activeApps}</p>
          </Card>
        </Button>
      </div>

      {state.loading && <Spinner />}
      {state.error ? <Notice text={errorText(t, state.error)} /> : null}

      {state.data && (
        <>
          {/* Upcoming deadlines strip */}
          <section className="space-y-2">
            <div className="flex items-center justify-between gap-2">
              <h2 className={cn("text-sm font-bold uppercase tracking-wide", "tg-hint")}>{t.upcomingDeadlines}</h2>
              <Button variant="unstyled"
                type="button"
                onClick={() => {
                  haptic.tap();
                  go("applications", "deadlines");
                }}
                className={cn("min-h-11 min-w-11 rounded-control px-2 text-xs font-bold focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600", "tg-link")}

              >
                {t.viewAllDeadlines}
              </Button>
            </div>
            {state.data.deadlines.length === 0 ? (
              <Card>
                <p className={cn("text-sm", "tg-hint")}>{t.noDeadlines}</p>
              </Card>
            ) : (
              state.data.deadlines.map((d, i) => (
                <Card key={String(d.id ?? i)} onClick={() => go("applications", "deadlines")}>
                  <div className="flex items-start justify-between gap-2">
                    <p className="min-w-0 text-sm font-semibold break-words">{d.title}</p>
                    <DeadlineBadge days={d.daysRemaining ?? null} urgency={d.urgency} t={t} />
                  </div>
                </Card>
              ))
            )}
          </section>

          {/* Interactive next steps */}
          <section className="space-y-2">
            <h2 className={cn("text-sm font-bold uppercase tracking-wide", "tg-hint")}>{t.nextSteps}</h2>
            {state.data.next.headline && <p className="text-sm">{state.data.next.headline}</p>}
            {(state.data.next.actions ?? []).length === 0 && <Notice text={t.nothingUrgent} />}
            {(state.data.next.actions ?? []).map((a) => (
              <Card
                key={a.id}
                onClick={() => {
                  haptic.tap();
                  const to = targetScreen(a.target);
                  go(to.screen, to.view);
                }}
              >
                <div className="flex items-start gap-2">
                  <span className={cn("mt-1.5 h-2 w-2 shrink-0 rounded-full", (dot[a.urgency] ?? "tg-status-neutral"))} />
                  <div className="min-w-0">
                    <p className="text-sm font-semibold break-words">{a.title}</p>
                    <p className={cn("mt-0.5 text-sm leading-relaxed break-words", "tg-hint")}>{a.why}</p>
                  </div>
                </div>
              </Card>
            ))}
          </section>
        </>
      )}

      <AskAiBox t={t} api={api} profile={profile} />
    </div>
  );
}

// ---- Built-in AI Advisor quick ask ----------------------------------------

function AskAiBox({ t, api, profile }: { t: T; api: Api; profile: MiniProfile }) {
  const [open, setOpen] = useState(false);
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState<{ text: string; offline: boolean } | null>(null);
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState<string | null>(null);

  const ask = async (text: string) => {
    const q = text.trim().slice(0, 2000);
    if (!q || busy) return;
    haptic.tap();
    setBusy(true);
    setFailed(null);
    setAnswer(null);
    try {
      const { data } = await api<{ reply?: string; offline?: boolean }>("/api/ai/chat", {
        method: "POST",
        body: JSON.stringify({ profileId: profile.id, message: q, chatHistory: [] }),
      });
      if (!data?.reply) throw new ApiError(500, null);
      setAnswer({ text: data.reply, offline: !!data.offline });
      haptic.success();
    } catch (err) {
      haptic.error();
      setFailed(err instanceof ApiError && err.status === 429 ? t.rateLimited : t.aiFailed);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card>
      <Button variant="unstyled"
        type="button"
        onClick={() => {
          haptic.tap();
          setOpen((o) => !o);
        }}
        aria-expanded={open}
        className="flex min-h-11 w-full items-center gap-2 text-left focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600"
      >
        <Bot className={cn("h-4 w-4 shrink-0", "tg-button-text")} />
        <span className="min-w-0 flex-1 text-sm font-bold break-words">{t.askAiTitle}</span>
        <ChevronDown className={cn(`h-4 w-4 shrink-0 transition-transform ${open ? "rotate-180" : ""}`, "tg-hint")} />
      </Button>
      {open && (
        <div className="mt-2 space-y-2">
          <p className={cn("text-sm leading-relaxed", "tg-hint")}>{t.askAiHint}</p>
          <div className="flex flex-wrap gap-1.5">
            {[t.starter1, t.starter2, t.starter3].map((s) => (
              <Button variant="unstyled"
                key={s}
                type="button"
                onClick={() => {
                  setQuestion(s);
                  void ask(s);
                }}
                className={cn("min-h-11 rounded-full px-3 py-2 text-xs font-semibold focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600", "tg-bg tg-text")}

              >
                <Sparkles className={cn("mr-1 inline h-3 w-3", "tg-button-text")} />
                {s}
              </Button>
            ))}
          </div>
          <textarea
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            placeholder={t.askAiPlaceholder}
            rows={2}
            maxLength={2000}
            aria-label={t.askAiPlaceholder}
            className={cn("w-full rounded-surface px-3 py-2 text-sm outline-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600", "tg-bg tg-text")}

          />
          <PrimaryButton onClick={() => void ask(question)} disabled={busy || !question.trim()}>
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Bot className="h-4 w-4" />}
            {busy ? t.aiThinking : t.askAiSend}
          </PrimaryButton>
          {failed && <Notice text={failed} />}
          {answer && (
            <div className={cn("rounded-surface p-3", "tg-bg")}  role="status" aria-live="polite">
              {answer.offline && <p className={cn("mb-2 text-sm font-semibold", "tg-hint")}>{t.aiOffline}</p>}
              <p className="text-sm leading-relaxed break-words whitespace-pre-wrap">{answer.text}</p>
            </div>
          )}
        </div>
      )}
    </Card>
  );
}

// ---- Universities / Scholarships ---------------------------------------------

type FilterId = "all" | "saved" | "top50" | "low" | "ielts" | "full" | string;

interface FilterChip {
  id: FilterId;
  label: string;
  params?: Record<string, string>;
}

function chipsFor(kind: Kind, t: T): FilterChip[] {
  return kind === "u"
    ? [
        { id: "all", label: t.filterAll },
        { id: "saved", label: t.filterSaved },
        { id: "top50", label: t.filterTop50, params: { maxRank: "50" } },
        { id: "low", label: t.filterLowTuition, params: { maxTuition: "5000" } },
        { id: "ielts", label: t.filterIelts, params: { ielts: "6.5" } },
        { id: "usa", label: "🇺🇸 USA", params: { country: "USA" } },
        { id: "uk", label: "🇬🇧 UK", params: { country: "UK" } },
        { id: "de", label: "🇩🇪 Germany", params: { country: "Germany" } },
        { id: "kr", label: "🇰🇷 South Korea", params: { country: "South Korea" } },
        { id: "ca", label: "🇨🇦 Canada", params: { country: "Canada" } },
      ]
    : [
        { id: "all", label: t.filterAll },
        { id: "saved", label: t.filterSaved },
        { id: "full", label: t.filterFullTuition, params: { coverageType: "Full Tuition" } },
        { id: "usa", label: "🇺🇸 USA", params: { country: "USA" } },
        { id: "uk", label: "🇬🇧 UK", params: { country: "UK" } },
        { id: "de", label: "🇩🇪 Germany", params: { country: "Germany" } },
        { id: "eu", label: "🇪🇺 Europe", params: { country: "European Union" } },
      ];
}

function SearchScreen({
  kind,
  t,
  api,
  profile,
  savedMap,
  busySave,
  onToggleSave,
  onOpenDetail,
  initialSavedOnly,
  onSavedOnlyConsumed,
  notice,
}: {
  kind: Kind;
  t: T;
  api: Api;
  profile: MiniProfile;
  savedMap: SavedMap;
  busySave: number | null;
  onToggleSave: (item: Item) => void;
  onOpenDetail: (item: Item) => void;
  initialSavedOnly?: boolean;
  onSavedOnlyConsumed?: () => void;
  notice?: string | null;
}) {
  const [input, setInput] = useState("");
  const [query, setQuery] = useState("");
  // Live search: the term commits 280 ms after typing (the form + button stay).
  const [filter, setFilter] = useState<FilterId>(initialSavedOnly ? "saved" : "all");
  const [page, setPage] = useState(1);
  const [items, setItems] = useState<Item[]>([]);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<string | null>(null);
  const listKey = kind === "u" ? "universities" : "scholarships";
  const chips = chipsFor(kind, t);

  useEffect(() => {
    if (initialSavedOnly) onSavedOnlyConsumed?.();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Debounced live search (280 ms).
  useEffect(() => {
    const id = setTimeout(() => {
      setQuery(input.trim().slice(0, 80));
      setPage(1);
    }, 280);
    return () => clearTimeout(id);
  }, [input]);

  const activeChip = chips.find((c) => c.id === filter) ?? chips[0];

  // ⭐ Saved renders straight from the saved list — 0ms on every visit, and it
  // updates live as soon as a card is saved/unsaved anywhere in the app.
  useEffect(() => {
    if (filter !== "saved") return;
    let cancelled = false;
    const savedItems = [...savedMap.values()].map((e) => e.item);
    // Microtask: the effect body itself must not call setState synchronously.
    void Promise.resolve().then(() => {
      if (cancelled) return;
      setItems(savedItems);
      setTotalPages(1);
      setLoading(false);
      setMessage(savedItems.length === 0 ? t.noResults : null);
    });
    return () => {
      cancelled = true;
    };
  }, [filter, savedMap, t]);

  useEffect(() => {
    if (filter === "saved") return;
    let cancelled = false;

    const load = () => {
      if (cancelled) return;
      const params = new URLSearchParams({ profileId: String(profile.id), page: String(page), perPage: "10" });
      if (query) params.set("search", query);
      for (const [k, v] of Object.entries(activeChip.params ?? {})) params.set(k, v);
      const cacheKey = `${kind}|${params.toString()}`;
      const cached = searchCache.get(cacheKey);

      const run = async (silent: boolean) => {
        if (!silent) {
          // Only the very first paint of a query shows the spinner.
          setLoading((prev) => (page === 1 && !cached ? true : prev));
        }
        setMessage(null);
        try {
          const { data, fallback } = await api<Record<string, unknown>>(`/api/${listKey}?${params.toString()}`);
          if (cancelled) return;
          if (fallback) {
            setItems([]);
            setMessage(t.unavailable);
            return;
          }
          const list = (data[listKey] as Item[]) ?? [];
          const nextTotal = Math.max(1, Number(data.totalPages ?? 1));
          searchCache.set(cacheKey, { items: list, totalPages: nextTotal, at: Date.now() });
          pruneSearchCache();
          setItems(list);
          setTotalPages(nextTotal);
          if (list.length === 0 && page === 1) setMessage(t.noResults);
        } catch (err) {
          if (!cancelled) setMessage(errorText(t, err));
        } finally {
          if (!cancelled) setLoading(false);
        }
      };

      if (cached) {
        // Instant paint from cache; a stale copy revalidates in the background.
        setItems(cached.items);
        setTotalPages(cached.totalPages);
        setLoading(false);
        setMessage(cached.items.length === 0 && page === 1 ? t.noResults : null);
        if (cacheEntryIsStale(cached.at)) void run(true);
      } else {
        void run(false);
      }
    };

    // Started in a microtask: the effect body itself must not call setState
    // synchronously (React's rule for effects).
    void Promise.resolve().then(load);
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [api, kind, listKey, page, profile.id, query, filter, t]);

  const submitNow = () => {
    haptic.tap();
    setQuery(input.trim().slice(0, 80));
    setPage(1);
  };

  return (
    <div className="space-y-3">
      <form
        className="flex gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          submitNow();
        }}
      >
        <div className={cn("flex flex-1 items-center gap-2 rounded-surface px-3", "tg-card")}>
          <Search className={cn("h-4 w-4 shrink-0", "tg-hint")} />
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={kind === "u" ? t.searchUni : t.searchSch}
            className={cn("w-full bg-transparent py-2.5 text-sm outline-none", "tg-text")}

            maxLength={80}
            aria-label={t.search}
          />
          {input.length > 0 && (
            <Button variant="unstyled"
              type="button"
              onClick={() => {
                haptic.tap();
                setInput("");
                setQuery("");
                setPage(1);
              }}
              aria-label={t.clearSearch}
              className={cn("flex min-h-11 min-w-11 shrink-0 items-center justify-center rounded-control focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600", "tg-hint")}

            >
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>
        <PrimaryButton onClick={submitNow}>{t.search}</PrimaryButton>
      </form>

      {/* One-tap quick filters */}
      <div
        className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1"
        role="group"
        aria-label={t.quickFilters}
      >
        {chips.map((chip) => {
          const active = filter === chip.id;
          return (
            <Button variant="unstyled"
              key={chip.id}
              type="button"
              onClick={() => {
                haptic.tap();
                setFilter(chip.id);
                setPage(1);
              }}
              aria-pressed={active}
              className={cn("min-h-11 min-w-11 shrink-0 rounded-full px-3.5 py-2 text-xs font-semibold focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600", (active ? "tg-button" : "tg-card tg-text"))}

            >
              {chip.label}
            </Button>
          );
        })}
      </div>

      {items.map((it) => (
        <ResultCard
          key={it.id}
          it={it}
          kind={kind}
          t={t}
          isSaved={savedMap.has(it.id)}
          busy={busySave === it.id}
          onToggleSave={() => onToggleSave(it)}
          onOpen={() => onOpenDetail(it)}
        />
      ))}
      {loading && <Spinner />}
      {message && <Notice text={message} />}
      {notice && <Notice text={notice} />}
      {!loading && !message && filter !== "saved" && page < totalPages && (
        <div className="flex justify-center">
          <PrimaryButton
            onClick={() => {
              haptic.tap();
              setPage((p) => p + 1);
            }}
          >
            {t.more}
          </PrimaryButton>
        </div>
      )}
    </div>
  );
}

function ResultCard({
  it,
  kind,
  t,
  isSaved,
  busy,
  onToggleSave,
  onOpen,
}: {
  it: Item;
  kind: Kind;
  t: T;
  isSaved: boolean;
  busy: boolean;
  onToggleSave: () => void;
  onOpen: () => void;
}) {
  const amount = kind === "u" ? money(it.annualTuitionUsd) : money(it.amountUsdValue);
  const name = kind === "u" ? it.name : it.title;
  return (
    <Card>
      <div className="flex items-start gap-3">
        <Button variant="unstyled"
          type="button"
          onClick={onOpen}
          className="flex min-w-0 flex-1 items-start gap-3 text-left focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600"
          aria-label={t.detailsTitle}
        >
          <ItemThumb item={it} kind={kind} />
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-1.5">
              {kind === "u" && it.worldRanking ? (
                <span className={cn("rounded-control px-1.5 py-0.5 text-xs font-bold", "tg-button")}>
                  #{it.worldRanking}
                </span>
              ) : null}
              {typeof it.matchScore === "number" && (
                <span className={cn("rounded-control px-1.5 py-0.5 text-xs font-bold", "tg-bg tg-text")}>
                  🎯 {Math.round(it.matchScore)}% {t.match}
                </span>
              )}
              {kind === "s" && it.coverageType && (
                <span className={cn("rounded-control px-1.5 py-0.5 text-xs font-semibold", "tg-bg tg-hint")}>
                  {it.coverageType}
                </span>
              )}
            </div>
            <p className="mt-1 text-sm font-semibold leading-snug break-words">{name}</p>
            <p className={cn("mt-0.5 text-sm break-words", "tg-hint")}>
              {kind === "u"
                ? [it.city, it.country].filter(Boolean).join(", ")
                : [it.provider, it.country].filter(Boolean).join(" · ")}
            </p>
            <div className="mt-1 flex flex-wrap gap-1.5">
              {amount && (
                <span className={cn("rounded-control px-1.5 py-0.5 text-xs font-semibold", "tg-bg tg-text")}>
                  {amount}{kind === "u" ? t.perYear : ""}
                </span>
              )}
              {kind === "u" && typeof it.minIelts === "number" && (
                <span className={cn("rounded-control px-1.5 py-0.5 text-xs", "tg-bg tg-hint")}>
                  IELTS ≥ {it.minIelts}
                </span>
              )}
              {kind === "u" && typeof it.minGpa === "number" && (
                <span className={cn("rounded-control px-1.5 py-0.5 text-xs", "tg-bg tg-hint")}>
                  GPA ≥ {it.minGpa}
                </span>
              )}
              {kind === "s" && it.deadlineDate && (
                <span className={cn("rounded-control px-1.5 py-0.5 text-xs", "tg-bg tg-hint")}>
                  {t.deadline}: {fmtDate(it.deadlineDate)}
                </span>
              )}
            </div>
          </div>
        </Button>
        <Button variant="unstyled"
          type="button"
          onClick={onToggleSave}
          disabled={busy}
          className={cn("flex min-h-11 min-w-11 shrink-0 items-center justify-center gap-1 rounded-control px-2.5 py-1.5 text-xs font-semibold focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600 disabled:opacity-60", (isSaved ? "tg-bg tg-text" : "tg-button"))}

          aria-label={isSaved ? t.saved : t.save}
        >
          {isSaved ? <BookmarkCheck className="h-3.5 w-3.5" /> : <Bookmark className="h-3.5 w-3.5" />}
          {isSaved ? t.saved : t.save}
        </Button>
      </div>
    </Card>
  );
}

// ---- Detail bottom sheet -----------------------------------------------------

function DetailSheet({
  t,
  api,
  profile,
  target,
  onClose,
  savedMap,
  busySave,
  onToggleSave,
  openSite,
}: {
  t: T;
  api: Api;
  profile: MiniProfile;
  target: DetailTarget;
  onClose: () => void;
  savedMap: SavedMap;
  busySave: number | null;
  onToggleSave: (item: Item) => void;
  openSite: (path?: string) => void;
}) {
  const { kind, item } = target;
  const isSaved = savedMap.has(item.id);
  const [programs, setPrograms] = useState<{ id: number; name: string; degree?: string | null }[] | null>(null);
  const [action, setAction] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  // Programme list is fetched on demand (university detail only).
  useEffect(() => {
    if (kind !== "u") return;
    let cancelled = false;
    // Microtask: the effect body itself must not call setState synchronously.
    void Promise.resolve().then(() => {
      if (cancelled) return;
      setPrograms(null);
      api<{ programs?: { id: number; name: string; degree?: string | null }[] }>(
        `/api/universities/${item.id}?profileId=${profile.id}`
      )
        .then(({ data }) => !cancelled && setPrograms(data.programs ?? []))
        .catch(() => !cancelled && setPrograms([]));
    });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [kind, item.id, profile.id]);

  const startApplication = async () => {
    if (busy) return;
    setBusy(true);
    setAction(null);
    try {
      await api("/api/applications", {
        method: "POST",
        body: JSON.stringify({
          profileId: profile.id,
          universityId: item.id,
          universityName: item.name ?? item.title ?? "",
          status: "preparing",
        }),
      });
      haptic.success();
      setAction(t.startAppDone);
    } catch {
      haptic.error();
      setAction(t.startAppFailed);
    } finally {
      setBusy(false);
    }
  };

  const addFunding = async () => {
    if (busy) return;
    setBusy(true);
    setAction(null);
    try {
      const notes = [
        item.country ? `Destination: ${item.country}` : null,
        item.deadlineDate ? `Deadline: ${item.deadlineDate}` : null,
        item.websiteUrl ? `Official page: ${item.websiteUrl}` : null,
      ]
        .filter(Boolean)
        .join(" · ")
        .slice(0, 1000);
      await api("/api/funding", {
        method: "POST",
        body: JSON.stringify({
          profileId: profile.id,
          name: (item.provider ? `${item.title ?? ""} — ${item.provider}` : item.title ?? "").slice(0, 200),
          amountUsd: Math.max(0, Math.round(item.amountUsdValue ?? 0)),
          kind: "scholarship",
          status: "planned",
          covers: ["tuition"],
          notes: notes || undefined,
        }),
      });
      haptic.success();
      setAction(t.fundingAdded);
    } catch {
      haptic.error();
      setAction(t.fundingFailed);
    } finally {
      setBusy(false);
    }
  };

  const daysLeft = daysUntilDate(item.deadlineDate);

  return (
    <div className="fixed inset-0 z-40 flex items-end justify-center" role="dialog" aria-modal="true" aria-label={t.detailsTitle}>
      <div
        className={cn("absolute inset-0", "tg-scrim")}

        onClick={onClose}
      />
      <div
        className={cn("sb-sheet relative flex max-h-[88vh] w-full max-w-xl flex-col overflow-hidden rounded-t-2xl", "tg-bg tg-text")}

      >
        <div className={cn("flex items-center justify-between gap-2 border-b px-4 py-2.5", "tg-border-card")}>
          <p className="min-w-0 text-sm font-bold break-words">{t.detailsTitle}</p>
          <Button variant="unstyled"
            type="button"
            onClick={onClose}
            aria-label={t.close}
            className={cn("flex min-h-11 min-w-11 shrink-0 items-center justify-center rounded-control focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600", "tg-hint")}

          >
            <X className="h-5 w-5" />
          </Button>
        </div>

        <div className="flex-1 overflow-y-auto px-4 pb-6 pt-3">
          {kind === "u" && item.imageUrl && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={viaImageProxy(toWikimediaThumb(item.imageUrl, 640))}
              alt=""
              // Off-screen until the sheet settles: never let it compete with
              // the name and the badges that the student opened the sheet for.
              loading="lazy"
              decoding="async"
              onError={(e) => {
                const img = e.currentTarget;
                if (item.imageUrl && img.src !== item.imageUrl) img.src = item.imageUrl;
              }}
              className="mb-3 h-40 w-full rounded-surface object-cover"
            />
          )}

          <div className="flex flex-wrap items-center gap-1.5">
            {item.flagEmoji && <span className="text-xl" aria-hidden>{item.flagEmoji}</span>}
            {kind === "u" && item.worldRanking ? (
              <span className={cn("rounded-control px-1.5 py-0.5 text-xs font-bold", "tg-button")}>
                #{item.worldRanking}
              </span>
            ) : null}
            {typeof item.matchScore === "number" && (
              <span className={cn("rounded-control px-1.5 py-0.5 text-xs font-bold", "tg-card tg-text")}>
                🎯 {Math.round(item.matchScore)}% {t.match}
              </span>
            )}
          </div>
          <h2 className="mt-1.5 text-lg font-extrabold leading-tight break-words">
            {kind === "u" ? item.name : item.title}
          </h2>
          <p className={cn("mt-1 text-sm break-words", "tg-hint")}>
            {kind === "u"
              ? [item.city, item.country].filter(Boolean).join(", ")
              : [item.provider, item.country].filter(Boolean).join(" · ")}
          </p>

          {(item.matchReasons?.length || item.matchIssues?.length) ? (
            <div className="mt-3 space-y-1.5">
              {!!item.matchReasons?.length && (
                <div>
                  <p className={cn("text-sm font-bold uppercase tracking-wide", "tg-hint")}>{t.whyMatch}</p>
                  {item.matchReasons.slice(0, 3).map((r, i) => (
                    <p key={i} className="text-sm leading-relaxed break-words">✓ {r}</p>
                  ))}
                </div>
              )}
              {!!item.matchIssues?.length && (
                <div>
                  <p className={cn("text-sm font-bold uppercase tracking-wide", "tg-hint")}>{t.watchOut}</p>
                  {item.matchIssues.slice(0, 3).map((r, i) => (
                    <p key={i} className="text-sm leading-relaxed break-words">! {r}</p>
                  ))}
                </div>
              )}
            </div>
          ) : null}

          {kind === "u" ? (
            <>
              <p className={cn("mt-4 text-sm font-bold uppercase tracking-wide", "tg-hint")}>{t.requirementsTitle}</p>
              <dl className="mt-2 grid grid-cols-2 gap-2">
                <Fact label={t.annualTuition} value={money(item.annualTuitionUsd) ?? "—"} />
                <Fact label={t.livingCost} value={money(item.annualLivingEstUsd) ?? "—"} />
                <Fact label={t.minGpa} value={item.minGpa != null ? String(item.minGpa) : "—"} />
                <Fact label={t.minIelts} value={item.minIelts != null ? String(item.minIelts) : "—"} />
                <Fact label={t.acceptanceRate} value={item.acceptanceRate != null ? `${item.acceptanceRate}%` : "—"} />
                <Fact label={t.workVisaYears} value={item.postStudyWorkVisaYears != null ? `${item.postStudyWorkVisaYears}` : "—"} />
              </dl>

              <p className={cn("mt-4 text-sm font-bold uppercase tracking-wide", "tg-hint")}>{t.programsTitle}</p>
              {programs == null ? (
                <p className={cn("mt-2 text-sm", "tg-hint")}>{t.programsLoading}</p>
              ) : programs.length === 0 ? (
                <p className={cn("mt-2 text-sm", "tg-hint")}>{t.programsEmpty}</p>
              ) : (
                <ul className="mt-2 space-y-1.5">
                  {programs.slice(0, 8).map((p) => (
                    <li key={p.id} className={cn("rounded-control px-2.5 py-2 text-sm break-words", "tg-card")}>
                      <span className="font-semibold">{p.name}</span>
                      {p.degree ? <span className="tg-hint"> · {p.degree}</span> : null}
                    </li>
                  ))}
                </ul>
              )}
            </>
          ) : (
            <>
              <dl className="mt-3 grid grid-cols-2 gap-2">
                <Fact label={t.coverage} value={item.coverageType ?? "—"} />
                <Fact label={t.awardValue} value={money(item.amountUsdValue) ?? "—"} />
              </dl>
              {item.deadlineDate && (
                <div className="mt-3 flex items-center gap-2">
                  <span className="text-xs font-semibold">{t.deadline}: {fmtDate(item.deadlineDate)}</span>
                  {daysLeft != null && <DeadlineBadge days={daysLeft} urgency={daysLeft <= 14 ? "critical" : daysLeft <= 45 ? "soon" : null} t={t} />}
                </div>
              )}
              <p className={cn("mt-3 text-sm font-bold uppercase tracking-wide", "tg-hint")}>{t.eligibility}</p>
              <p className="mt-1 text-sm leading-relaxed break-words">{item.requirements || item.description || "—"}</p>
            </>
          )}

          {action && <p className={cn("mt-3 text-sm font-semibold", "tg-link")}>{action}</p>}
        </div>

        {/* Action bar */}
        <div className={cn("border-t px-4 py-3", "tg-border-card")}>
          <div className="flex flex-wrap gap-2">
            {kind === "u" ? (
              <PrimaryButton onClick={() => void startApplication()} disabled={busy}>
                {t.startApp}
              </PrimaryButton>
            ) : (
              <PrimaryButton onClick={() => void addFunding()} disabled={busy}>
                {t.addFunding}
              </PrimaryButton>
            )}
            <Button variant="unstyled"
              type="button"
              onClick={() => onToggleSave(item)}
              disabled={busySave === item.id}
              className={cn("inline-flex min-h-11 min-w-11 items-center justify-center gap-2 rounded-surface px-4 py-2.5 text-sm font-semibold focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600 disabled:opacity-60", (isSaved ? "tg-card tg-text" : "tg-button"))}

            >
              {isSaved ? <BookmarkCheck className="h-4 w-4" /> : <Bookmark className="h-4 w-4" />}
              {isSaved ? t.saved : t.save}
            </Button>
            {item.websiteUrl && (
              <Button variant="unstyled"
                type="button"
                onClick={() => openLinkExternal(item.websiteUrl!, openSite)}
                className={cn("inline-flex min-h-11 min-w-11 items-center justify-center gap-2 rounded-surface px-4 py-2.5 text-sm font-semibold focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600", "tg-card tg-text")}

              >
                <ExternalLink className="h-4 w-4" />
                {t.officialWebsite}
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function Fact({ label, value }: { label: string; value: string }) {
  return (
    <div className={cn("rounded-control px-2.5 py-2", "tg-card")}>
      <dt className={cn("text-xs font-semibold uppercase tracking-wide", "tg-hint")}>{label}</dt>
      <dd className="mt-0.5 text-xs font-bold break-words">{value}</dd>
    </div>
  );
}

function openLinkExternal(url: string, openSite: (path?: string) => void) {
  const tg = window.Telegram?.WebApp;
  if (tg?.openLink) tg.openLink(url);
  else openSite(url);
}

// ---- Applications (tracker + deadlines + status update) ----------------------

interface AppRow {
  id: number;
  universityName: string;
  programName?: string | null;
  status: string;
  deadline?: string | null;
}

function ApplicationsScreen({
  t,
  api,
  profile,
  view,
  setView,
}: {
  t: T;
  api: Api;
  profile: MiniProfile;
  view: "apps" | "deadlines";
  setView: (v: "apps" | "deadlines") => void;
}) {
  const [rows, setRows] = useState<AppRow[] | null>(null);
  const [deadlines, setDeadlines] = useState<DeadlineItem[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<number | null>(null);
  const [flash, setFlash] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    // Microtask: the effect body itself must not call setState synchronously.
    void Promise.resolve().then(() => {
      if (cancelled) return;
      setError(null);
      Promise.all([
        api<{ applications?: AppRow[] }>(`/api/applications?profileId=${profile.id}`).then((r) => r.data),
        api<{ items?: DeadlineItem[] }>(`/api/deadlines?profileId=${profile.id}`)
          .then((r) => r.data)
          .catch(() => ({ items: [] })),
      ])
        .then(([apps, dls]) => {
          if (cancelled) return;
          setRows(apps.applications ?? []);
          setDeadlines(
            (dls.items ?? [])
              .filter((i) => i.date && typeof i.daysRemaining === "number" && i.daysRemaining >= 0)
              .sort((a, b) => (a.daysRemaining ?? 0) - (b.daysRemaining ?? 0))
          );
        })
        .catch((err) => !cancelled && setError(errorText(t, err)));
    });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile.id]);

  const updateStatus = async (row: AppRow, next: string) => {
    if (busyId != null || next === row.status) return;
    setBusyId(row.id);
    setFlash(null);
    try {
      await api("/api/applications", {
        method: "PATCH",
        body: JSON.stringify({ id: row.id, profileId: profile.id, status: next }),
      });
      setRows((prev) => (prev ?? []).map((r) => (r.id === row.id ? { ...r, status: next } : r)));
      haptic.success();
      setFlash(t.statusUpdated);
    } catch (err) {
      haptic.error();
      setFlash(errorText(t, err));
    } finally {
      setBusyId(null);
    }
  };

  const statusLabel = (s: string) => (t.appStatus as Record<string, string>)[s] ?? s.replace(/_/g, " ");

  return (
    <div className="space-y-3">
      <h1 className="text-lg font-bold">{t.apps}</h1>

      {/* Segmented toggle: Applications | Deadlines */}
      <div
        className={cn("grid grid-cols-2 gap-1 rounded-surface p-1", "tg-card")}

        role="tablist"
        aria-label={t.apps}
      >
        {([
          { id: "apps", label: t.segApplications },
          { id: "deadlines", label: t.segDeadlines },
        ] as const).map((seg) => (
          <Button variant="unstyled"
            key={seg.id}
            type="button"
            role="tab"
            aria-selected={view === seg.id}
            onClick={() => {
              haptic.tap();
              setView(seg.id);
            }}
            className={cn("min-h-11 min-w-11 rounded-control px-2 py-2 text-xs font-bold focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600", (view === seg.id ? "tg-button" : "tg-hint"))}

          >
            {seg.label}
          </Button>
        ))}
      </div>

      {error && <Notice text={error} />}
      {flash && <p className={cn("text-sm font-semibold", "tg-link")}>{flash}</p>}

      {view === "apps" ? (
        <>
          {rows == null && !error && <Spinner />}
          {rows != null && rows.length === 0 && <Notice text={t.appsEmpty} />}
          {(rows ?? []).map((a) => {
            const color = STATUS_CLASSES[a.status] ?? "tg-status-neutral";
            return (
              <Card key={a.id}>
                <p className="text-sm font-semibold break-words">{a.universityName}</p>
                {a.programName && <p className={cn("text-sm break-words", "tg-hint")}>{a.programName}</p>}
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  <span className={cn("rounded-control px-2 py-1 text-xs font-bold text-white", color)}>
                    {statusLabel(a.status)}
                  </span>
                  {a.deadline && (
                    <span className={cn("text-xs", "tg-hint")}>
                      {t.deadline}: {fmtDate(a.deadline)}
                    </span>
                  )}
                </div>
                <label className={cn("mt-2 flex items-center gap-2 text-sm", "tg-hint")}>
                  <span className="shrink-0">{t.statusLabel}</span>
                  <select
                    value={SETTABLE_STATUSES.includes(a.status) ? a.status : "not_started"}
                    onChange={(e) => void updateStatus(a, e.target.value)}
                    disabled={busyId === a.id}
                    aria-label={t.statusLabel}
                    className={cn("min-h-11 min-w-11 flex-1 rounded-control px-2 text-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600 disabled:opacity-60", "tg-bg tg-text")}

                  >
                    {!SETTABLE_STATUSES.includes(a.status) && (
                      <option value="not_started">{statusLabel(a.status)}</option>
                    )}
                    {SETTABLE_STATUSES.map((s) => (
                      <option key={s} value={s}>
                        {statusLabel(s)}
                      </option>
                    ))}
                  </select>
                </label>
              </Card>
            );
          })}
        </>
      ) : (
        <>
          {deadlines == null && !error && <Spinner />}
          {deadlines != null && deadlines.length === 0 && <Notice text={t.noDeadlines} />}
          {(deadlines ?? []).map((d, i) => (
            <Card key={String(d.id ?? i)}>
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-sm font-semibold break-words">{d.title}</p>
                  <p className={cn("mt-0.5 text-sm", "tg-hint")}>
                    {fmtDate(d.date)}
                    {d.type ? ` · ${d.type}` : ""}
                  </p>
                </div>
                <DeadlineBadge days={d.daysRemaining ?? null} urgency={d.urgency} t={t} />
              </div>
            </Card>
          ))}
        </>
      )}
    </div>
  );
}

// ---- Profile -----------------------------------------------------------------

function ProfileScreen({
  t,
  api,
  profile,
  openSite,
  tg,
  onUnlinked,
}: {
  t: T;
  api: Api;
  profile: MiniProfile;
  openSite: (path?: string) => void;
  tg: TgWebApp | null;
  onUnlinked: () => void;
}) {
  const [plan, setPlan] = useState<string | null>(null);
  const [link, setLink] = useState<{ notifyEnabled: boolean; reminderDays: number[] } | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const id = setTimeout(() => {
      api<{ plan?: string }>(`/api/premium/status?profileId=${profile.id}`)
        .then(({ data }) => !cancelled && setPlan(data.plan ?? "free"))
        .catch(() => undefined);
      api<{ link?: { notifyEnabled: boolean; reminderDays: number[] } | null }>("/api/telegram/me")
        .then(({ data }) => !cancelled && setLink(data.link ?? null))
        .catch((err) => !cancelled && setError(errorText(t, err)));
    }, 0);
    return () => {
      cancelled = true;
      clearTimeout(id);
    };
  }, [api, profile.id, t]);

  const update = async (patch: Record<string, unknown>) => {
    try {
      const { data } = await api<{ link: { notifyEnabled: boolean; reminderDays: number[] } }>("/api/telegram/me", { method: "PUT", body: JSON.stringify(patch) });
      setLink(data.link);
      haptic.success();
    } catch (err) {
      setError(errorText(t, err));
    }
  };

  const disconnect = () => {
    const run = async () => {
      try {
        await api("/api/telegram/me", { method: "DELETE" });
        onUnlinked();
      } catch (err) {
        setError(errorText(t, err));
      }
    };
    if (tg?.showConfirm) tg.showConfirm(t.disconnectConfirm, (ok) => ok && void run());
    else if (window.confirm(t.disconnectConfirm)) void run();
  };

  const countries = useMemo(() => {
    try {
      const v = JSON.parse(profile.preferredCountries || "[]");
      return Array.isArray(v) && v.length ? v.join(", ") : t.notSet;
    } catch {
      return t.notSet;
    }
  }, [profile.preferredCountries, t.notSet]);
  const english = profile.ieltsScore != null
    ? formatMessage(t.ieltsScore, { score: profile.ieltsScore })
    : profile.toeflScore != null
      ? formatMessage(t.toeflScore, { score: profile.toeflScore })
      : t.notSet;
  const activePreset = link ? PRESETS.find((p) => p.days.join(",") === link.reminderDays.join(","))?.id ?? null : null;
  const planLabel = plan === "free"
    ? t.planNames.free
    : plan === "premium"
      ? t.planNames.premium
      : plan === "admin"
        ? t.planNames.admin
        : plan ?? "…";

  return (
    <div className="space-y-4">
      <Card>
        <p className="text-base font-bold">{profile.name}</p>
        <p className={cn("text-sm", "tg-hint")}>
          {t.plan}: <b>{planLabel}</b>
        </p>
        <dl className="mt-3 grid grid-cols-2 gap-x-3 gap-y-2 text-xs">
          <dt className="tg-hint">{t.level}</dt>
          <dd>{profile.degreeLevel || t.notSet}</dd>
          <dt className="tg-hint">{t.major}</dt>
          <dd>{profile.targetMajor || t.notSet}</dd>
          <dt className="tg-hint">{t.gpa}</dt>
          <dd>{profile.gpa != null ? `${profile.gpa}${profile.gpaScale ? ` / ${profile.gpaScale}` : ""}` : t.notSet}</dd>
          <dt className="tg-hint">{t.english}</dt>
          <dd>{english}</dd>
          <dt className="tg-hint">{t.countries}</dt>
          <dd>{countries}</dd>
          <dt className="tg-hint">{t.budget}</dt>
          <dd>{money(profile.budgetAnnualUsd) ?? t.notSet}</dd>
        </dl>
      </Card>

      {link && (
        <Card>
          <label className="flex items-center justify-between gap-3 text-sm font-semibold">
            <span className="flex items-center gap-2"><Bell className="h-4 w-4" /> {t.notifications}</span>
            <input type="checkbox" checked={link.notifyEnabled} onChange={(e) => update({ notifyEnabled: e.target.checked })} className="h-5 w-5 min-h-11 min-w-11 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600" />
          </label>
          <p className={cn("mt-3 text-sm", "tg-hint")}>{t.reminders}</p>
          <div className="mt-2 flex flex-wrap gap-2">
            {PRESETS.map((p) => (
              <Button variant="unstyled"
                key={p.id}
                type="button"
                onClick={() => update({ reminderDays: p.days })}
                className={cn("min-h-11 min-w-11 rounded-control px-2.5 py-1.5 text-xs font-semibold focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600", (activePreset === p.id ? "tg-button" : "tg-bg tg-text"))}

                aria-pressed={activePreset === p.id}
              >
                {p.days.length ? p.days.join(" · ") : t.remindersOff}
              </Button>
            ))}
          </div>
        </Card>
      )}
      {error && <Notice text={error} />}

      <div className="flex flex-col gap-2">
        <PrimaryButton onClick={() => openSite("/")}>
          <ExternalLink className="h-4 w-4" /> {t.fullSite}
        </PrimaryButton>
        <Button variant="unstyled" type="button" onClick={disconnect} className={cn("inline-flex min-h-11 min-w-11 items-center justify-center gap-2 rounded-surface px-4 py-2.5 text-sm font-semibold text-rose-600 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600", "tg-card")}>
          <Unplug className="h-4 w-4" /> {t.disconnect}
        </Button>
      </div>
    </div>
  );
}
