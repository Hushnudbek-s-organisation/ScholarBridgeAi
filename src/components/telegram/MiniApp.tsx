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
import { dictionaries, type Messages } from "@/i18n/messages";
import { formatMessage } from "@/i18n/formatMessage";
import {
  Bell,
  BookmarkCheck,
  Bookmark,
  ExternalLink,
  GraduationCap,
  Home,
  Landmark,
  ListChecks,
  Loader2,
  Search,
  User,
  Unplug,
} from "lucide-react";

// ---------------------------------------------------------------------------
// Telegram WebApp (subset we use)
// ---------------------------------------------------------------------------

interface TgWebApp {
  initData: string;
  initDataUnsafe?: { user?: { first_name?: string; language_code?: string } };
  colorScheme?: "light" | "dark";
  ready: () => void;
  expand: () => void;
  openLink: (url: string) => void;
  showConfirm?: (message: string, cb: (ok: boolean) => void) => void;
  HapticFeedback?: { notificationOccurred: (t: "success" | "error" | "warning") => void };
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
const TXT: Record<Lang, MiniAppMessages> = {
  en: dictionaries.en.telegram.miniApp,
  uz: dictionaries.uz.telegram.miniApp,
  ru: dictionaries.ru.telegram.miniApp,
};

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

// Telegram injects its theme as CSS variables; fall back to the site palette.
const C = {
  bg: "var(--tg-theme-bg-color, #ffffff)",
  text: "var(--tg-theme-text-color, #0f172a)",
  hint: "var(--tg-theme-hint-color, #64748b)",
  card: "var(--tg-theme-secondary-bg-color, #f1f5f9)",
  button: "var(--tg-theme-button-color, #4f46e5)",
  buttonText: "var(--tg-theme-button-text-color, #ffffff)",
  link: "var(--tg-theme-link-color, #4f46e5)",
};

class ApiError extends Error {
  constructor(public status: number, public code: string | null) {
    super(`HTTP ${status}`);
  }
}

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
  const t = TXT[lang];

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
      setLang(toLang(tg.initDataUnsafe?.user?.language_code));
      exchange().catch(() => setPhase({ k: "error", retry: true }));
    };
    const id = setTimeout(start, 0);
    return () => {
      cancelled = true;
      clearTimeout(id);
    };
  }, [exchange]);

  const openSite = useCallback(
    (path = "/") => {
      const base = siteUrl || (typeof window !== "undefined" ? window.location.origin : "");
      const url = `${base.replace(/\/+$/, "")}${path}`;
      if (tgRef.current) tgRef.current.openLink(url);
      else window.open(url, "_blank", "noopener");
    },
    [siteUrl]
  );

  // ------------------------------------------------------------ states
  const shell = (children: React.ReactNode) => (
    <div className="min-h-screen" style={{ background: C.bg, color: C.text }}>
      {children}
    </div>
  );

  if (phase.k === "loading") {
    return shell(
      <div className="flex min-h-screen flex-col items-center justify-center gap-3" role="status" aria-live="polite">
        <Loader2 className="h-7 w-7 animate-spin" style={{ color: C.button }} />
        <p className="text-sm" style={{ color: C.hint }}>{t.loading}</p>
      </div>
    );
  }
  if (phase.k === "outside" || phase.k === "error" || phase.k === "unlinked") {
    const title = phase.k === "outside" ? t.outsideTitle : phase.k === "error" ? t.errorTitle : t.unlinkedTitle;
    const body = phase.k === "outside" ? t.outsideBody : phase.k === "error" ? t.errorBody : t.unlinkedBody;
    return shell(
      <main className="mx-auto flex min-h-screen max-w-md flex-col items-center justify-center gap-4 px-6 text-center">
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl" style={{ background: C.card }}>
          <GraduationCap className="h-7 w-7" style={{ color: C.button }} />
        </div>
        <h1 className="text-lg font-bold">{title}</h1>
        <p className="text-sm leading-relaxed" style={{ color: C.hint }}>{body}</p>
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

  return shell(
    <div className="mx-auto flex min-h-screen max-w-xl flex-col">
      <main className="flex-1 px-4 pb-24 pt-4">
        {screen === "home" && profile && <HomeScreen t={t} api={api} profile={profile} go={setScreen} />}
        {screen === "universities" && profile && <SearchScreen kind="u" t={t} api={api} profile={profile} />}
        {screen === "scholarships" && profile && <SearchScreen kind="s" t={t} api={api} profile={profile} />}
        {screen === "applications" && profile && <ApplicationsScreen t={t} api={api} profile={profile} />}
        {screen === "profile" && profile && (
          <ProfileScreen t={t} api={api} profile={profile} openSite={openSite} tg={tg} onUnlinked={() => exchange()} />
        )}
      </main>
      <nav
        className="fixed inset-x-0 bottom-0 border-t"
        style={{ background: C.bg, borderColor: C.card, paddingBottom: "env(safe-area-inset-bottom)" }}
        aria-label={t.navigationLabel}
      >
        <div className="mx-auto grid max-w-xl grid-cols-5">
          {tabs.map(({ id, icon: Icon }) => (
            <button
              key={id}
              type="button"
              onClick={() => setScreen(id)}
              aria-current={screen === id ? "page" : undefined}
              className="flex min-h-11 min-w-11 flex-col items-center gap-0.5 rounded-lg py-2 text-[10px] font-semibold focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600"
              style={{ color: screen === id ? C.button : C.hint }}
            >
              <Icon className="h-5 w-5" />
              {t.tabs[id]}
            </button>
          ))}
        </div>
      </nav>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Pieces
// ---------------------------------------------------------------------------

type T = (typeof TXT)["uz"];
type Api = <R>(path: string, init?: RequestInit) => Promise<{ data: R; fallback: boolean }>;

function PrimaryButton({ children, onClick, disabled }: { children: React.ReactNode; onClick: () => void; disabled?: boolean }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="inline-flex min-h-11 min-w-11 items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600 disabled:opacity-60"
      style={{ background: C.button, color: C.buttonText }}
    >
      {children}
    </button>
  );
}

function Card({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-2xl p-3.5" style={{ background: C.card }}>
      {children}
    </div>
  );
}

function Notice({ text }: { text: string }) {
  return <p className="py-6 text-center text-sm" style={{ color: C.hint }}>{text}</p>;
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
      <Loader2 className="h-6 w-6 animate-spin" style={{ color: C.button }} />
    </div>
  );
}

// ---- Home ------------------------------------------------------------------

function HomeScreen({ t, api, profile, go }: { t: T; api: Api; profile: MiniProfile; go: (s: Screen) => void }) {
  const state = useLoad(async () => {
    const [next, unis, schs] = await Promise.all([
      api<{ headline?: string; actions?: { id: string; title: string; why: string; urgency: string }[] }>(`/api/next-actions?profileId=${profile.id}`),
      api<{ savedUniversities?: unknown[] }>(`/api/saved-universities?profileId=${profile.id}`),
      api<{ savedScholarships?: unknown[] }>(`/api/saved-scholarships?profileId=${profile.id}`),
    ]);
    return { next: next.data, unis: unis.data.savedUniversities?.length ?? 0, schs: schs.data.savedScholarships?.length ?? 0 };
  }, [profile.id]);
  const dot: Record<string, string> = { critical: "#ef4444", high: "#f97316", medium: "#eab308", low: "#22c55e" };

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold">{formatMessage(t.hello, { name: profile.name })}</h1>
      {state.loading && <Spinner />}
      {state.error ? <Notice text={errorText(t, state.error)} /> : null}
      {state.data && (
        <>
          <div className="grid grid-cols-2 gap-3">
            <button type="button" onClick={() => go("universities")} className="rounded-xl text-left focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600">
              <Card>
                <p className="text-2xl font-bold">{state.data.unis}</p>
                <p className="text-xs" style={{ color: C.hint }}>{t.savedUnis}</p>
              </Card>
            </button>
            <button type="button" onClick={() => go("scholarships")} className="rounded-xl text-left focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600">
              <Card>
                <p className="text-2xl font-bold">{state.data.schs}</p>
                <p className="text-xs" style={{ color: C.hint }}>{t.savedSch}</p>
              </Card>
            </button>
          </div>
          <section className="space-y-2">
            <h2 className="text-sm font-bold uppercase tracking-wide" style={{ color: C.hint }}>{t.nextSteps}</h2>
            {state.data.next.headline && <p className="text-sm">{state.data.next.headline}</p>}
            {(state.data.next.actions ?? []).length === 0 && <Notice text={t.nothingUrgent} />}
            {(state.data.next.actions ?? []).map((a) => (
              <Card key={a.id}>
                <div className="flex items-start gap-2">
                  <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full" style={{ background: dot[a.urgency] ?? C.hint }} />
                  <div>
                    <p className="text-sm font-semibold">{a.title}</p>
                    <p className="mt-0.5 text-xs leading-relaxed" style={{ color: C.hint }}>{a.why}</p>
                  </div>
                </div>
              </Card>
            ))}
          </section>
        </>
      )}
    </div>
  );
}

// ---- Universities / Scholarships ---------------------------------------------

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
}

function SearchScreen({ kind, t, api, profile }: { kind: "u" | "s"; t: T; api: Api; profile: MiniProfile }) {
  const [input, setInput] = useState("");
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);
  const [items, setItems] = useState<Item[]>([]);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<string | null>(null);
  const [savedIds, setSavedIds] = useState<Set<number>>(new Set());
  const [busy, setBusy] = useState<number | null>(null);
  const listKey = kind === "u" ? "universities" : "scholarships";
  const savedPath = kind === "u" ? "/api/saved-universities" : "/api/saved-scholarships";

  useEffect(() => {
    let cancelled = false;
    const id = setTimeout(() => {
      api<Record<string, Array<{ universityId?: number; scholarshipId?: number }>>>(`${savedPath}?profileId=${profile.id}`)
        .then(({ data }) => {
          if (cancelled) return;
          const rows = (kind === "u" ? data.savedUniversities : data.savedScholarships) ?? [];
          setSavedIds(new Set(rows.map((r) => Number(kind === "u" ? r.universityId : r.scholarshipId))));
        })
        .catch(() => undefined);
    }, 0);
    return () => {
      cancelled = true;
      clearTimeout(id);
    };
  }, [api, kind, profile.id, savedPath]);

  useEffect(() => {
    let cancelled = false;
    const id = setTimeout(() => {
      setLoading(true);
      setMessage(null);
      const sp = new URLSearchParams({ profileId: String(profile.id), page: String(page), perPage: "10" });
      if (query) sp.set("search", query);
      api<Record<string, unknown>>(`/api/${listKey}?${sp.toString()}`)
        .then(({ data, fallback }) => {
          if (cancelled) return;
          if (fallback) {
            setItems([]);
            setMessage(t.unavailable);
            return;
          }
          const list = (data[listKey] as Item[]) ?? [];
          setItems((prev) => (page === 1 ? list : [...prev, ...list]));
          setTotalPages(Number(data.totalPages ?? 1));
          if (page === 1 && list.length === 0) setMessage(t.noResults);
        })
        .catch((err) => !cancelled && setMessage(errorText(t, err)))
        .finally(() => !cancelled && setLoading(false));
    }, 0);
    return () => {
      cancelled = true;
      clearTimeout(id);
    };
  }, [api, listKey, page, profile.id, query, t]);

  const save = async (id: number) => {
    setBusy(id);
    try {
      await api(savedPath, {
        method: "POST",
        body: JSON.stringify(kind === "u" ? { profileId: profile.id, universityId: id } : { profileId: profile.id, scholarshipId: id }),
      });
      setSavedIds((prev) => new Set(prev).add(id));
      window.Telegram?.WebApp?.HapticFeedback?.notificationOccurred("success");
    } catch (err) {
      setMessage(errorText(t, err));
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="space-y-3">
      <form
        className="flex gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          setItems([]);
          setPage(1);
          setQuery(input.trim().slice(0, 80));
        }}
      >
        <div className="flex flex-1 items-center gap-2 rounded-xl px-3" style={{ background: C.card }}>
          <Search className="h-4 w-4 shrink-0" style={{ color: C.hint }} />
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={kind === "u" ? t.searchUni : t.searchSch}
            className="w-full bg-transparent py-2.5 text-sm outline-none"
            style={{ color: C.text }}
            maxLength={80}
            aria-label={t.search}
          />
        </div>
        <PrimaryButton onClick={() => { setItems([]); setPage(1); setQuery(input.trim().slice(0, 80)); }}>{t.search}</PrimaryButton>
      </form>

      {items.map((it) => {
        const isSaved = savedIds.has(it.id);
        const amount = kind === "u" ? money(it.annualTuitionUsd) : money(it.amountUsdValue);
        return (
          <Card key={it.id}>
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-sm font-semibold">{kind === "u" ? it.name : it.title}</p>
                <p className="mt-0.5 text-xs" style={{ color: C.hint }}>
                  {kind === "u"
                    ? [it.city, it.country].filter(Boolean).join(", ")
                    : [it.provider, it.country].filter(Boolean).join(" · ")}
                  {kind === "u" && it.worldRanking ? ` · #${it.worldRanking}` : ""}
                </p>
                <p className="mt-1 text-xs">
                  {amount ? `${amount}${kind === "u" ? t.perYear : ""}` : ""}
                  {kind === "s" && it.deadlineDate ? `${amount ? " · " : ""}${t.deadline}: ${fmtDate(it.deadlineDate)}` : ""}
                  {typeof it.matchScore === "number" ? ` · ${Math.round(it.matchScore)}% ${t.match}` : ""}
                </p>
              </div>
              <button
                type="button"
                onClick={() => !isSaved && save(it.id)}
                disabled={isSaved || busy === it.id}
                className="flex min-h-11 min-w-11 shrink-0 items-center justify-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-semibold focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600"
                style={isSaved ? { color: C.hint } : { background: C.button, color: C.buttonText }}
                aria-label={isSaved ? t.saved : t.save}
              >
                {isSaved ? <BookmarkCheck className="h-3.5 w-3.5" /> : <Bookmark className="h-3.5 w-3.5" />}
                {isSaved ? t.saved : t.save}
              </button>
            </div>
          </Card>
        );
      })}
      {loading && <Spinner />}
      {message && <Notice text={message} />}
      {!loading && !message && page < totalPages && (
        <div className="flex justify-center">
          <PrimaryButton onClick={() => setPage((p) => p + 1)}>{t.more}</PrimaryButton>
        </div>
      )}
    </div>
  );
}

// ---- Applications ------------------------------------------------------------

function ApplicationsScreen({ t, api, profile }: { t: T; api: Api; profile: MiniProfile }) {
  const state = useLoad(
    () => api<{ applications?: { id: number; universityName: string; programName?: string | null; status: string; deadline?: string | null }[] }>(`/api/applications?profileId=${profile.id}`),
    [profile.id]
  );
  const rows = state.data?.data.applications ?? [];
  return (
    <div className="space-y-3">
      <h1 className="text-lg font-bold">{t.apps}</h1>
      {state.loading && <Spinner />}
      {state.error ? <Notice text={errorText(t, state.error)} /> : null}
      {!state.loading && !state.error && rows.length === 0 && <Notice text={t.appsEmpty} />}
      {rows.map((a) => (
        <Card key={a.id}>
          <p className="text-sm font-semibold">{a.universityName}</p>
          {a.programName && <p className="text-xs" style={{ color: C.hint }}>{a.programName}</p>}
          <p className="mt-1 text-xs">
            <span className="rounded-md px-1.5 py-0.5 font-semibold" style={{ background: C.bg }}>{a.status.replace(/_/g, " ")}</span>
            {a.deadline ? ` · ${t.deadline}: ${fmtDate(a.deadline)}` : ""}
          </p>
        </Card>
      ))}
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
        <p className="text-xs" style={{ color: C.hint }}>
          {t.plan}: <b>{planLabel}</b>
        </p>
        <dl className="mt-3 grid grid-cols-2 gap-x-3 gap-y-2 text-xs">
          <dt style={{ color: C.hint }}>{t.level}</dt>
          <dd>{profile.degreeLevel || t.notSet}</dd>
          <dt style={{ color: C.hint }}>{t.major}</dt>
          <dd>{profile.targetMajor || t.notSet}</dd>
          <dt style={{ color: C.hint }}>{t.gpa}</dt>
          <dd>{profile.gpa != null ? `${profile.gpa}${profile.gpaScale ? ` / ${profile.gpaScale}` : ""}` : t.notSet}</dd>
          <dt style={{ color: C.hint }}>{t.english}</dt>
          <dd>{english}</dd>
          <dt style={{ color: C.hint }}>{t.countries}</dt>
          <dd>{countries}</dd>
          <dt style={{ color: C.hint }}>{t.budget}</dt>
          <dd>{money(profile.budgetAnnualUsd) ?? t.notSet}</dd>
        </dl>
      </Card>

      {link && (
        <Card>
          <label className="flex items-center justify-between gap-3 text-sm font-semibold">
            <span className="flex items-center gap-2"><Bell className="h-4 w-4" /> {t.notifications}</span>
            <input type="checkbox" checked={link.notifyEnabled} onChange={(e) => update({ notifyEnabled: e.target.checked })} className="h-5 w-5 min-h-11 min-w-11 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600" />
          </label>
          <p className="mt-3 text-xs" style={{ color: C.hint }}>{t.reminders}</p>
          <div className="mt-2 flex flex-wrap gap-2">
            {PRESETS.map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => update({ reminderDays: p.days })}
                className="min-h-11 min-w-11 rounded-lg px-2.5 py-1.5 text-xs font-semibold focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600"
                style={activePreset === p.id ? { background: C.button, color: C.buttonText } : { background: C.bg, color: C.text }}
                aria-pressed={activePreset === p.id}
              >
                {p.days.length ? p.days.join(" · ") : t.remindersOff}
              </button>
            ))}
          </div>
        </Card>
      )}
      {error && <Notice text={error} />}

      <div className="flex flex-col gap-2">
        <PrimaryButton onClick={() => openSite("/")}>
          <ExternalLink className="h-4 w-4" /> {t.fullSite}
        </PrimaryButton>
        <button type="button" onClick={disconnect} className="inline-flex min-h-11 min-w-11 items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold text-red-600 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600" style={{ background: C.card }}>
          <Unplug className="h-4 w-4" /> {t.disconnect}
        </button>
      </div>
    </div>
  );
}
