"use client";

/**
 * Admin → Kanal: one screen for everything the Telegram channel publisher does.
 *
 * Tabs mirror the operator's mental model, not the database:
 *   Ulash     — connect the channel, dry-run, pause, verify, test
 *   Reja      — how many posts, when, quiet day, weekly list, polls
 *   Linklar   — brand, site URL, footer (Kanal/Bot) and social links, hashtags
 *   Kontent   — the authored Uzbek copy behind the rich post
 *   Davlatlar — flags, Uzbek names, locative forms, hashtags
 *   Havolalar — short links and their clicks
 *   Navbat    — today's queue: preview, send, skip, postpone, pin, edit
 *   So'rovlar — polls, their aggregate results and a manual close
 *   Qiziqish  — learned topic weights (from poll shares), correctable by hand
 *   Hikoyalar — admin-written stories; only approved ones may be posted
 *   Jurnal    — the append-only audit trail
 *
 * Nothing here can show or accept the bot token: it lives in Admin → Telegram.
 */
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import {
  AlertTriangle,
  BarChart3,
  CalendarClock,
  CheckCircle2,
  ClipboardList,
  Globe2,
  Link2,
  Loader2,
  Play,
  Plus,
  RefreshCw,
  Save,
  Send,
  Settings2,
  ShieldCheck,
  Trash2,
  Wand2,
  XCircle,
} from "lucide-react";
import { api, EmptyState, ErrorNote, Field, inputCls, LoadingBlock, PageHeader, Segmented, StatCard, Toast, useToast } from "../growth/ui";

type Tab =
  | "connect"
  | "plan"
  | "links"
  | "content"
  | "countries"
  | "shortlinks"
  | "queue"
  | "polls"
  | "prefs"
  | "stories"
  | "audit";

interface LinkItem {
  label: string;
  url: string;
}

interface Settings {
  connection: { channelId: string; adminChatId: string; mode: "off" | "dryrun" | "on"; pausedUntil: string | null };
  brand: string;
  channelUsername: string;
  botUsername: string;
  siteUrl: string;
  footerMain: LinkItem[];
  footerSocial: LinkItem[];
  hashtags: { kinds: Record<string, string[]>; countries: Record<string, string>; levels: Record<string, string>; weekly: string[] };
  linkPreview: Record<string, boolean>;
  footerEnabled: Record<string, boolean>;
  plan: {
    dailyCap: number;
    budgetMin: number;
    budgetMax: number;
    quietDayEnabled: boolean;
    morningWindow: { start: string; end: string };
    eveningWindow: { start: string; end: string };
    weeklyMinItems: number;
    weeklyPin: boolean;
    digestEnabled: boolean;
  };
  pollCadenceDays: number;
}

interface Runtime {
  mode: "off" | "dryrun" | "on";
  channelId: string;
  adminChatId: string;
  siteUrl: string;
  paused: boolean;
  pausedUntil: string | null;
  envKillSwitch: boolean;
  blockedReason: string | null;
}

interface ConnectionCheck {
  token: { set: boolean; source: string; botUsername: string | null; botId: number | null; error: string | null };
  channel: {
    configured: boolean;
    reachable: boolean;
    title: string | null;
    username: string | null;
    botStatus: string | null;
    canPost: boolean;
    error: string | null;
  };
  adminChat: { configured: boolean; reachable: boolean; title: string | null; error: string | null };
  siteUrl: string;
  ready: boolean;
  hints: string[];
}

interface QueueRow {
  id: number;
  sendAt: string;
  kind: string;
  lane: string;
  scholarshipId: number | null;
  status: string;
  reason: string | null;
  parts: string[];
  skipReason: string | null;
}

interface PostRow {
  id: number;
  kind: string;
  status: string;
  mode: string;
  chatId: string | null;
  sentAt: string | null;
  createdAt: string;
  error: string | null;
}

interface Overview {
  settings: Settings;
  runtime: Runtime;
  counts: { plannedToday: number; sentWeek: number; failedWeek: number; contentRows: number; links: number; countries: number };
  queue: QueueRow[];
  posts: PostRow[];
  hasToken: boolean;
  env: { killSwitch: boolean; channelIdConfigured: boolean; discussionEnabled: boolean };
  connection: ConnectionCheck | null;
}

interface PreviewDay {
  planDate: string;
  quiet: boolean;
  items: { slot: number; sendAt: string; kind: string; lane: string; title: string | null; parts: string[]; skipped: string | null }[];
}

interface Preview {
  days: PreviewDay[];
  counts: Record<string, number>;
  skips: Record<string, number>;
}

interface ContentRow {
  id: number;
  title: string;
  provider: string;
  country: string | null;
  deadlineDate: string | null;
  verificationStatus: string;
  rich: boolean;
  filled: number;
  total: number;
  missing: string[];
}

interface ContentDetail {
  scholarship: { id: number; title: string; provider: string; country: string | null; deadlineDate: string | null; verificationStatus: string };
  content: {
    taglineUz: string | null;
    fundingTypeUz: string | null;
    languageReqUz: string | null;
    eligibilityUz: string[];
    benefitsUz: string[];
    aboutUz: string | null;
    extraHashtags: string[];
  };
  report: { rich: boolean; missing: string[]; filled: number; total: number };
}

interface CountryRow {
  key: string;
  iso2: string;
  flag: string;
  nameUz: string;
  nameUzLoc: string;
  hashtag: string;
  aliases: readonly string[];
}

interface ShortLinkRow {
  code: string;
  kind: string;
  scholarshipId: number | null;
  url: string;
  enabled: boolean;
  note: string | null;
  clicks7: number;
  clicks30: number;
}

interface AuditRow {
  id: number;
  actorProfileId: number | null;
  action: string;
  entity: string;
  entityId: string | null;
  createdAt: string;
}

const TABS: Tab[] = [
  "connect",
  "plan",
  "links",
  "content",
  "countries",
  "shortlinks",
  "queue",
  "polls",
  "prefs",
  "stories",
  "audit",
];

const btn =
  "inline-flex items-center justify-center gap-1.5 rounded-xl px-3 py-2 text-xs font-bold transition disabled:cursor-not-allowed disabled:opacity-50";
const btnPrimary = `${btn} bg-indigo-600 text-white hover:bg-indigo-700`;
const btnGhost = `${btn} border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800`;
const card = "rounded-2xl border border-slate-200 bg-white p-4 shadow-xs dark:border-slate-700 dark:bg-slate-900";
const chip = "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide";

export function ChannelManager() {
  const t = useTranslations("adminChannel");
  const [toast, showToast] = useToast();
  const [tab, setTab] = useState<Tab>("connect");
  const [data, setData] = useState<Overview | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(
    async (live = false) => {
      setError(null);
      try {
        const next = await api<Overview>(`/api/admin/channel${live ? "?live=1" : ""}`);
        setData(next);
      } catch (err) {
        setError(err instanceof Error ? err.message : t("loadFailed"));
      }
    },
    [t]
  );

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- load-on-mount / prop-sync, same pattern as the other admin managers
    void load(false);
  }, [load]);

  const act = useCallback(
    async (action: string, extra: Record<string, unknown> = {}) => {
      setBusy(true);
      try {
        const res = await api<{ ok: boolean } & Record<string, unknown>>("/api/admin/channel", {
          method: "POST",
          body: JSON.stringify({ action, ...extra }),
        });
        await load(action === "verify");
        return res;
      } catch (err) {
        showToast(err instanceof Error ? err.message : t("actionFailed"));
        return null;
      } finally {
        setBusy(false);
      }
    },
    [load, showToast, t]
  );

  if (error && !data) return <ErrorNote message={error} onRetry={() => void load(false)} retryLabel={t("retry")} />;
  if (!data) return <LoadingBlock label={t("loading")} />;

  const { settings, runtime, counts } = data;

  return (
    <div className="space-y-4">
      <PageHeader
        icon={Send}
        title={t("title")}
        subtitle={t("subtitle")}
        accent="sky"
        level="h1"
      >
        <div className="flex flex-wrap items-center gap-2">
          <span
            className={`${chip} ${
              runtime.envKillSwitch || runtime.mode === "off"
                ? "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300"
                : runtime.mode === "dryrun"
                  ? "bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300"
                  : "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300"
            }`}
          >
            {t(`mode.${runtime.mode}`)}
          </span>
          {runtime.paused && (
            <span className={`${chip} bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300`}>
              {t("pausedUntil", { date: runtime.pausedUntil ?? "" })}
            </span>
          )}
          <button className={btnGhost} onClick={() => void load(true)} disabled={busy}>
            <RefreshCw className={`h-3.5 w-3.5 ${busy ? "animate-spin" : ""}`} /> {t("refresh")}
          </button>
        </div>
      </PageHeader>

      {runtime.blockedReason && (
        <div className="flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs font-semibold text-amber-800 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-200">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          <span>{runtime.blockedReason}</span>
        </div>
      )}

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-6">
        <StatCard label={t("stats.today")} value={counts.plannedToday} icon={CalendarClock} tone="indigo" />
        <StatCard label={t("stats.sent7")} value={counts.sentWeek} icon={Send} tone="emerald" />
        <StatCard label={t("stats.failed7")} value={counts.failedWeek} icon={XCircle} tone="rose" />
        <StatCard label={t("stats.content")} value={counts.contentRows} icon={ClipboardList} tone="violet" />
        <StatCard label={t("stats.links")} value={counts.links} icon={Link2} tone="amber" />
        <StatCard label={t("stats.countries")} value={counts.countries} icon={Globe2} tone="slate" />
      </div>

      <Segmented<Tab>
        value={tab}
        onChange={setTab}
        options={TABS.map((id) => ({ id, label: t(`tabs.${id}`) }))}
      />

      {tab === "connect" && <ConnectTab data={data} act={act} busy={busy} showToast={showToast} reload={load} />}
      {tab === "plan" && <PlanTab settings={settings} showToast={showToast} reload={load} />}
      {tab === "links" && <LinksTab settings={settings} showToast={showToast} reload={load} />}
      {tab === "content" && <ContentTab showToast={showToast} />}
      {tab === "countries" && <CountriesTab showToast={showToast} />}
      {tab === "shortlinks" && <ShortLinksTab showToast={showToast} />}
      {tab === "queue" && <QueueTab rows={data.queue} showToast={showToast} reload={load} />}
      {tab === "polls" && <PollsTab showToast={showToast} />}
      {tab === "prefs" && <PrefsTab showToast={showToast} />}
      {tab === "stories" && <StoriesTab showToast={showToast} />}
      {tab === "audit" && <AuditTab />}

      <Toast message={toast} />
    </div>
  );
}

type ActFn = (action: string, extra?: Record<string, unknown>) => Promise<(Record<string, unknown> & { ok: boolean }) | null>;
type ShowToast = (msg: string) => void;
type Reload = (live?: boolean) => Promise<void>;

/* ------------------------------------------------------------------ */
/* Ulash                                                              */
/* ------------------------------------------------------------------ */

function ConnectTab({ data, act, busy, showToast, reload }: { data: Overview; act: ActFn; busy: boolean; showToast: ShowToast; reload: Reload }) {
  const t = useTranslations("adminChannel");
  const { settings, runtime, connection, hasToken } = data;
  const [conn, setConn] = useState(settings.connection);
  const [brand, setBrand] = useState({
    brand: settings.brand,
    siteUrl: settings.siteUrl,
    channelUsername: settings.channelUsername,
    botUsername: settings.botUsername,
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- load-on-mount / prop-sync, same pattern as the other admin managers
    setConn(settings.connection);
    setBrand({ brand: settings.brand, siteUrl: settings.siteUrl, channelUsername: settings.channelUsername, botUsername: settings.botUsername });
  }, [settings]);

  const save = async () => {
    setSaving(true);
    try {
      await api("/api/admin/channel", { method: "PUT", body: JSON.stringify({ key: "connection", value: conn }) });
      await api("/api/admin/channel", { method: "PUT", body: JSON.stringify({ key: "brand", value: brand }) });
      showToast(t("saved"));
      await reload(true);
    } catch (err) {
      showToast(err instanceof Error ? err.message : t("saveFailed"));
    } finally {
      setSaving(false);
    }
  };

  const steps = [
    { ok: hasToken, label: t("steps.token"), hint: connection?.token.botUsername ? `@${connection.token.botUsername}` : undefined },
    { ok: Boolean(connection?.channel.reachable && connection?.channel.canPost), label: t("steps.channel"), hint: connection?.channel.title ?? undefined },
    { ok: Boolean(connection?.adminChat.reachable || runtime.adminChatId), label: t("steps.adminChat"), hint: connection?.adminChat.title ?? undefined },
    { ok: Boolean(runtime.siteUrl), label: t("steps.siteUrl"), hint: runtime.siteUrl || undefined },
  ];

  return (
    <div className="space-y-4">
      <div className="grid gap-4 lg:grid-cols-2">
        <div className={card}>
          <h3 className="mb-3 flex items-center gap-2 text-sm font-bold text-slate-900 dark:text-white">
            <ShieldCheck className="h-4 w-4 text-indigo-500" /> {t("connect.title")}
          </h3>
          <ol className="space-y-2">
            {steps.map((step, index) => (
              <li key={step.label} className="flex items-start gap-2 text-xs">
                {step.ok ? (
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" />
                ) : (
                  <span className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full border border-slate-300 text-[10px] font-bold text-slate-500 dark:border-slate-600 dark:text-slate-400">
                    {index + 1}
                  </span>
                )}
                <span className={step.ok ? "text-slate-600 dark:text-slate-300" : "font-semibold text-slate-800 dark:text-slate-100"}>
                  {step.label}
                  {step.hint && <span className="mt-0.5 block truncate text-[11px] font-normal text-slate-400">{step.hint}</span>}
                </span>
              </li>
            ))}
          </ol>
          {connection?.hints?.length ? (
            <ul className="mt-3 space-y-1 rounded-xl bg-slate-50 p-3 text-[11px] text-slate-600 dark:bg-slate-800/60 dark:text-slate-300">
              {connection.hints.map((hint) => (
                <li key={hint}>• {hint}</li>
              ))}
            </ul>
          ) : null}
          <div className="mt-3 flex flex-wrap gap-2">
            <button className={btnPrimary} onClick={() => act("verify").then(() => showToast(t("verified")))} disabled={busy}>
              <ShieldCheck className="h-3.5 w-3.5" /> {t("connect.verify")}
            </button>
            <button className={btnGhost} onClick={() => act("test").then(() => showToast(t("connect.testSent")))} disabled={busy}>
              <Wand2 className="h-3.5 w-3.5" /> {t("connect.test")}
            </button>
          </div>
        </div>

        <div className={card}>
          <h3 className="mb-3 flex items-center gap-2 text-sm font-bold text-slate-900 dark:text-white">
            <Settings2 className="h-4 w-4 text-indigo-500" /> {t("connect.formTitle")}
          </h3>
          <div className="space-y-3">
            <Field label={t("connect.channelId")} hint={t("connect.channelIdHint")}>
              <input
                className={inputCls}
                value={conn.channelId}
                onChange={(e) => setConn({ ...conn, channelId: e.target.value })}
                placeholder="@scholarbridge_uz yoki -1001234567890"
              />
            </Field>
            <Field label={t("connect.adminChatId")} hint={t("connect.adminChatIdHint")}>
              <input
                className={inputCls}
                value={conn.adminChatId}
                onChange={(e) => setConn({ ...conn, adminChatId: e.target.value })}
                placeholder="123456789"
              />
            </Field>
            <Field label={t("connect.siteUrl")} hint={t("connect.siteUrlHint")}>
              <input className={inputCls} value={brand.siteUrl} onChange={(e) => setBrand({ ...brand, siteUrl: e.target.value })} placeholder="https://scholarbridge.uz" />
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label={t("connect.channelUsername")}>
                <input
                  className={inputCls}
                  value={brand.channelUsername}
                  onChange={(e) => setBrand({ ...brand, channelUsername: e.target.value })}
                  placeholder="scholarbridge_uz"
                />
              </Field>
              <Field label={t("connect.botUsername")}>
                <input
                  className={inputCls}
                  value={brand.botUsername}
                  onChange={(e) => setBrand({ ...brand, botUsername: e.target.value })}
                  placeholder="scholarbridgebot"
                />
              </Field>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Field label={t("connect.mode")} hint={t("connect.modeHint")}>
                <select
                  className={inputCls}
                  value={conn.mode}
                  onChange={(e) => setConn({ ...conn, mode: e.target.value as Settings["connection"]["mode"] })}
                >
                  <option value="off">{t("mode.off")}</option>
                  <option value="dryrun">{t("mode.dryrun")}</option>
                  <option value="on">{t("mode.on")}</option>
                </select>
              </Field>
              <Field label={t("connect.pausedUntil")} hint={t("connect.pausedUntilHint")}>
                <input
                  type="date"
                  className={inputCls}
                  value={conn.pausedUntil ?? ""}
                  onChange={(e) => setConn({ ...conn, pausedUntil: e.target.value || null })}
                />
              </Field>
            </div>
            {conn.mode === "on" && (
              <p className="rounded-xl bg-rose-50 px-3 py-2 text-[11px] font-semibold text-rose-700 dark:bg-rose-500/10 dark:text-rose-300">
                {t("connect.liveWarning")}
              </p>
            )}
            <button className={btnPrimary} onClick={() => void save()} disabled={saving || busy}>
              {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />} {t("save")}
            </button>
          </div>
        </div>
      </div>

      <div className={card}>
        <h3 className="mb-2 text-sm font-bold text-slate-900 dark:text-white">{t("connect.howTitle")}</h3>
        <ol className="ml-4 list-decimal space-y-2 text-xs text-slate-600 dark:text-slate-300">
          <li>{t("connect.how1")}</li>
          <li>{t("connect.how2")}</li>
          <li>{t("connect.how3")}</li>
          <li>{t("connect.how4")}</li>
          <li>{t("connect.how5")}</li>
        </ol>
        <div className="mt-3 flex flex-wrap gap-2">
          <button className={btnGhost} onClick={() => act("plan").then(() => showToast(t("planBuilt")))} disabled={busy}>
            <CalendarClock className="h-3.5 w-3.5" /> {t("connect.buildPlan")}
          </button>
          <button className={btnGhost} onClick={() => act("run").then(() => showToast(t("runDone")))} disabled={busy}>
            <Play className="h-3.5 w-3.5" /> {t("connect.runNow")}
          </button>
          <button className={btnGhost} onClick={() => act("links").then(() => showToast(t("linksCreated")))} disabled={busy}>
            <Link2 className="h-3.5 w-3.5" /> {t("connect.makeLinks")}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Reja                                                               */
/* ------------------------------------------------------------------ */

function PlanTab({ settings, showToast, reload }: { settings: Settings; showToast: ShowToast; reload: Reload }) {
  const t = useTranslations("adminChannel");
  const [plan, setPlan] = useState({ ...settings.plan, pollCadenceDays: settings.pollCadenceDays });
  const [saving, setSaving] = useState(false);
  const [preview, setPreview] = useState<Preview | null>(null);
  const [loadingPreview, setLoadingPreview] = useState(false);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- load-on-mount / prop-sync, same pattern as the other admin managers
    setPlan({ ...settings.plan, pollCadenceDays: settings.pollCadenceDays });
  }, [settings]);

  const save = async () => {
    setSaving(true);
    try {
      await api("/api/admin/channel", { method: "PUT", body: JSON.stringify({ key: "plan", value: plan }) });
      showToast(t("saved"));
      await reload();
    } catch (err) {
      showToast(err instanceof Error ? err.message : t("saveFailed"));
    } finally {
      setSaving(false);
    }
  };

  const runPreview = async () => {
    setLoadingPreview(true);
    try {
      const res = await api<{ preview: Preview }>("/api/admin/channel?days=14");
      setPreview(res.preview);
    } catch (err) {
      showToast(err instanceof Error ? err.message : t("loadFailed"));
    } finally {
      setLoadingPreview(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className={card}>
        <h3 className="mb-3 flex items-center gap-2 text-sm font-bold text-slate-900 dark:text-white">
          <CalendarClock className="h-4 w-4 text-indigo-500" /> {t("plan.title")}
        </h3>
        <div className="grid gap-3 sm:grid-cols-3">
          <Field label={t("plan.dailyCap")} hint={t("plan.dailyCapHint")}>
            <input type="number" min={1} max={3} className={inputCls} value={plan.dailyCap} onChange={(e) => setPlan({ ...plan, dailyCap: Number(e.target.value) })} />
          </Field>
          <Field label={t("plan.budgetMin")}>
            <input type="number" min={1} max={3} className={inputCls} value={plan.budgetMin} onChange={(e) => setPlan({ ...plan, budgetMin: Number(e.target.value) })} />
          </Field>
          <Field label={t("plan.budgetMax")}>
            <input type="number" min={1} max={3} className={inputCls} value={plan.budgetMax} onChange={(e) => setPlan({ ...plan, budgetMax: Number(e.target.value) })} />
          </Field>
          <Field label={t("plan.morning")}>
            <div className="flex items-center gap-2">
              <input type="time" className={inputCls} value={plan.morningWindow.start} onChange={(e) => setPlan({ ...plan, morningWindow: { ...plan.morningWindow, start: e.target.value } })} />
              <input type="time" className={inputCls} value={plan.morningWindow.end} onChange={(e) => setPlan({ ...plan, morningWindow: { ...plan.morningWindow, end: e.target.value } })} />
            </div>
          </Field>
          <Field label={t("plan.evening")}>
            <div className="flex items-center gap-2">
              <input type="time" className={inputCls} value={plan.eveningWindow.start} onChange={(e) => setPlan({ ...plan, eveningWindow: { ...plan.eveningWindow, start: e.target.value } })} />
              <input type="time" className={inputCls} value={plan.eveningWindow.end} onChange={(e) => setPlan({ ...plan, eveningWindow: { ...plan.eveningWindow, end: e.target.value } })} />
            </div>
          </Field>
          <Field label={t("plan.pollCadence")} hint={t("plan.pollCadenceHint")}>
            <input type="number" min={2} max={90} className={inputCls} value={plan.pollCadenceDays} onChange={(e) => setPlan({ ...plan, pollCadenceDays: Number(e.target.value) })} />
          </Field>
          <Field label={t("plan.weeklyMinItems")} hint={t("plan.weeklyMinItemsHint")}>
            <input type="number" min={1} max={10} className={inputCls} value={plan.weeklyMinItems} onChange={(e) => setPlan({ ...plan, weeklyMinItems: Number(e.target.value) })} />
          </Field>
        </div>
        <div className="mt-3 grid gap-2 sm:grid-cols-2">
          {[
            { key: "quietDayEnabled" as const, label: t("plan.quietDay") },
            { key: "weeklyPin" as const, label: t("plan.weeklyPin") },
            { key: "digestEnabled" as const, label: t("plan.digest") },
          ].map((toggle) => (
            <label key={toggle.key} className="flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-700 dark:border-slate-700 dark:text-slate-200">
              <input type="checkbox" checked={Boolean(plan[toggle.key])} onChange={(e) => setPlan({ ...plan, [toggle.key]: e.target.checked })} />
              {toggle.label}
            </label>
          ))}
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          <button className={btnPrimary} onClick={() => void save()} disabled={saving}>
            {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />} {t("save")}
          </button>
          <button className={btnGhost} onClick={() => void runPreview()} disabled={loadingPreview}>
            {loadingPreview ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <BarChart3 className="h-3.5 w-3.5" />} {t("plan.preview14")}
          </button>
        </div>
      </div>

      {preview && (
        <div className={card}>
          <h3 className="mb-2 text-sm font-bold text-slate-900 dark:text-white">{t("plan.previewTitle")}</h3>
          <div className="mb-3 flex flex-wrap gap-1.5">
            {Object.entries(preview.counts).map(([kind, count]) => (
              <span key={kind} className={`${chip} bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300`}>
                {kind}: {count}
              </span>
            ))}
          </div>
          <div className="space-y-2">
            {preview.days.map((day) => (
              <details key={day.planDate} className="rounded-xl border border-slate-200 p-2 text-xs dark:border-slate-700">
                <summary className="cursor-pointer font-semibold text-slate-700 dark:text-slate-200">
                  {day.planDate} · {day.quiet ? t("plan.quietDayShort") : `${day.items.length} ${t("plan.posts")}`}
                </summary>
                {day.items.map((item) => (
                  <div key={`${day.planDate}-${item.slot}`} className="mt-2 rounded-lg bg-slate-50 p-2 dark:bg-slate-800/60">
                    <div className="mb-1 text-[10px] font-bold uppercase tracking-wide text-slate-500">
                      {item.sendAt} · {item.kind} · {item.lane}
                      {item.skipped ? ` · ${t("plan.skipped")}: ${item.skipped}` : ""}
                    </div>
                    <pre className="max-h-52 overflow-auto whitespace-pre-wrap break-words font-sans text-[11px] leading-relaxed text-slate-700 dark:text-slate-200">
                      {item.parts.join("\n\n———\n\n")}
                    </pre>
                  </div>
                ))}
              </details>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Linklar                                                            */
/* ------------------------------------------------------------------ */

function LinkRows({ rows, onChange, label }: { rows: LinkItem[]; onChange: (rows: LinkItem[]) => void; label: string }) {
  const t = useTranslations("adminChannel");
  return (
    <div className="space-y-2">
      <div className="text-[11px] font-bold uppercase tracking-wide text-slate-500">{label}</div>
      {rows.map((row, index) => (
        <div key={index} className="flex flex-wrap items-center gap-2">
          <input
            className={`${inputCls} max-w-[10rem]`}
            value={row.label}
            placeholder={t("links.labelPlaceholder")}
            onChange={(e) => onChange(rows.map((r, i) => (i === index ? { ...r, label: e.target.value } : r)))}
          />
          <input
            className={`${inputCls} flex-1`}
            value={row.url}
            placeholder="https://t.me/…"
            onChange={(e) => onChange(rows.map((r, i) => (i === index ? { ...r, url: e.target.value } : r)))}
          />
          <button className={btnGhost} onClick={() => onChange(rows.filter((_, i) => i !== index))} aria-label={t("links.remove")}>
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>
      ))}
      <button className={btnGhost} onClick={() => onChange([...rows, { label: "", url: "" }])}>
        <Plus className="h-3.5 w-3.5" /> {t("links.add")}
      </button>
    </div>
  );
}

function LinksTab({ settings, showToast, reload }: { settings: Settings; showToast: ShowToast; reload: Reload }) {
  const t = useTranslations("adminChannel");
  const [footerMain, setFooterMain] = useState<LinkItem[]>(settings.footerMain);
  const [footerSocial, setFooterSocial] = useState<LinkItem[]>(settings.footerSocial);
  const [tags, setTags] = useState(settings.hashtags);
  const [previews, setPreviews] = useState(settings.linkPreview);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- load-on-mount / prop-sync, same pattern as the other admin managers
    setFooterMain(settings.footerMain);
    setFooterSocial(settings.footerSocial);
    setTags(settings.hashtags);
    setPreviews(settings.linkPreview);
  }, [settings]);

  const save = async (key: string, value: unknown) => {
    setSaving(true);
    try {
      await api("/api/admin/channel", { method: "PUT", body: JSON.stringify({ key, value }) });
      showToast(t("saved"));
      await reload();
    } catch (err) {
      showToast(err instanceof Error ? err.message : t("saveFailed"));
    } finally {
      setSaving(false);
    }
  };

  const kindKeys = useMemo(() => Object.keys(tags.kinds), [tags.kinds]);

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <div className={`${card} space-y-4`}>
        <h3 className="flex items-center gap-2 text-sm font-bold text-slate-900 dark:text-white">
          <Link2 className="h-4 w-4 text-indigo-500" /> {t("links.footerTitle")}
        </h3>
        <LinkRows rows={footerMain} onChange={setFooterMain} label={t("links.footerMain")} />
        <p className="text-[11px] text-slate-400">{t("links.footerMainHint")}</p>
        <LinkRows rows={footerSocial} onChange={setFooterSocial} label={t("links.footerSocial")} />
        <p className="text-[11px] text-slate-400">{t("links.footerSocialHint")}</p>
        <button className={btnPrimary} onClick={() => void save("footer_main", footerMain)} disabled={saving}>
          <Save className="h-3.5 w-3.5" /> {t("save")}
        </button>
        <button className={btnGhost} onClick={() => void save("footer_social", footerSocial)} disabled={saving}>
          <Save className="h-3.5 w-3.5" /> {t("links.saveSocial")}
        </button>
      </div>

      <div className={`${card} space-y-3`}>
        <h3 className="flex items-center gap-2 text-sm font-bold text-slate-900 dark:text-white">
          <Wand2 className="h-4 w-4 text-indigo-500" /> {t("links.tagsTitle")}
        </h3>
        <Field label={t("links.weeklyTags")} hint={t("links.tagsHint")}>
          <input
            className={inputCls}
            value={tags.weekly.join(" ")}
            onChange={(e) => setTags({ ...tags, weekly: e.target.value.split(/[\s,]+/).filter(Boolean) })}
          />
        </Field>
        {kindKeys.map((kind) => (
          <Field key={kind} label={kind}>
            <input
              className={inputCls}
              value={(tags.kinds[kind] ?? []).join(" ")}
              onChange={(e) => setTags({ ...tags, kinds: { ...tags.kinds, [kind]: e.target.value.split(/[\s,]+/).filter(Boolean) } })}
            />
          </Field>
        ))}
        <div className="grid grid-cols-3 gap-2">
          {(["bachelor", "master", "phd"] as const).map((level) => (
            <Field key={level} label={t(`links.level.${level}`)}>
              <input
                className={inputCls}
                value={tags.levels[level] ?? ""}
                onChange={(e) => setTags({ ...tags, levels: { ...tags.levels, [level]: e.target.value } })}
              />
            </Field>
          ))}
        </div>
        <div className="space-y-1">
          <div className="text-[11px] font-bold uppercase tracking-wide text-slate-500">{t("links.previews")}</div>
          {kindKeys.map((kind) => (
            <label key={kind} className="flex items-center gap-2 text-xs text-slate-600 dark:text-slate-300">
              <input
                type="checkbox"
                checked={previews[kind] === true}
                onChange={(e) => setPreviews({ ...previews, [kind]: e.target.checked })}
              />
              {kind}
            </label>
          ))}
        </div>
        <div className="flex flex-wrap gap-2">
          <button className={btnPrimary} onClick={() => void save("hashtags", tags)} disabled={saving}>
            <Save className="h-3.5 w-3.5" /> {t("links.saveTags")}
          </button>
          <button className={btnGhost} onClick={() => void save("link_preview", previews)} disabled={saving}>
            <Save className="h-3.5 w-3.5" /> {t("links.savePreviews")}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Kontent                                                            */
/* ------------------------------------------------------------------ */

function ContentTab({ showToast }: { showToast: ShowToast }) {
  const t = useTranslations("adminChannel");
  const [query, setQuery] = useState("");
  const [rows, setRows] = useState<ContentRow[] | null>(null);
  const [selected, setSelected] = useState<ContentDetail | null>(null);
  const [form, setForm] = useState({
    taglineUz: "",
    fundingTypeUz: "",
    languageReqUz: "",
    eligibilityUz: "",
    benefitsUz: "",
    aboutUz: "",
    extraHashtags: "",
  });
  const [preview, setPreview] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const search = useCallback(async () => {
    setBusy(true);
    try {
      const res = await api<{ rows: ContentRow[] }>(`/api/admin/channel/content?q=${encodeURIComponent(query)}`);
      setRows(res.rows);
    } catch (err) {
      showToast(err instanceof Error ? err.message : t("loadFailed"));
    } finally {
      setBusy(false);
    }
  }, [query, showToast, t]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- load-on-mount / prop-sync, same pattern as the other admin managers
    void search();
  }, [search]);

  const open = async (id: number) => {
    setBusy(true);
    setPreview(null);
    try {
      const res = await api<{ item: ContentDetail }>(`/api/admin/channel/content?id=${id}`);
      setSelected(res.item);
      setForm({
        taglineUz: res.item.content.taglineUz ?? "",
        fundingTypeUz: res.item.content.fundingTypeUz ?? "",
        languageReqUz: res.item.content.languageReqUz ?? "",
        eligibilityUz: res.item.content.eligibilityUz.join("\n"),
        benefitsUz: res.item.content.benefitsUz.join("\n"),
        aboutUz: res.item.content.aboutUz ?? "",
        extraHashtags: res.item.content.extraHashtags.join(" "),
      });
    } catch (err) {
      showToast(err instanceof Error ? err.message : t("loadFailed"));
    } finally {
      setBusy(false);
    }
  };

  const save = async () => {
    if (!selected) return;
    setBusy(true);
    try {
      const res = await api<{ preview: string | null }>("/api/admin/channel/content", {
        method: "PUT",
        body: JSON.stringify({
          id: selected.scholarship.id,
          ...form,
          eligibilityUz: form.eligibilityUz.split("\n").map((s) => s.trim()).filter(Boolean),
          benefitsUz: form.benefitsUz.split("\n").map((s) => s.trim()).filter(Boolean),
          extraHashtags: form.extraHashtags.split(/[\s,]+/).filter(Boolean),
        }),
      });
      setPreview(res.preview);
      showToast(t("saved"));
      await search();
    } catch (err) {
      showToast(err instanceof Error ? err.message : t("saveFailed"));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="grid gap-4 lg:grid-cols-[22rem_1fr]">
      <div className={`${card} space-y-2`}>
        <div className="flex gap-2">
          <input className={inputCls} value={query} onChange={(e) => setQuery(e.target.value)} placeholder={t("content.search")} />
          <button className={btnGhost} onClick={() => void search()} disabled={busy}>
            {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
          </button>
        </div>
        <div className="max-h-[32rem] space-y-1 overflow-auto">
          {rows === null && <LoadingBlock label={t("loading")} />}
          {rows?.length === 0 && <EmptyState icon={ClipboardList} title={t("content.empty")} />}
          {rows?.map((row) => (
            <button
              key={row.id}
              onClick={() => void open(row.id)}
              className={`w-full rounded-xl border px-3 py-2 text-left text-xs transition ${
                selected?.scholarship.id === row.id
                  ? "border-indigo-300 bg-indigo-50 dark:border-indigo-500/40 dark:bg-indigo-500/10"
                  : "border-slate-200 hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-800"
              }`}
            >
              <div className="flex items-center justify-between gap-2">
                <span className="truncate font-semibold text-slate-800 dark:text-slate-100">{row.title}</span>
                <span
                  className={`${chip} ${
                    row.rich
                      ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300"
                      : row.filled > 0
                        ? "bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300"
                        : "bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400"
                  }`}
                >
                  {row.filled}/{row.total}
                </span>
              </div>
              <div className="truncate text-[11px] text-slate-400">
                {row.provider} · {row.country ?? "—"} · {row.deadlineDate ?? "—"}
              </div>
            </button>
          ))}
        </div>
      </div>

      <div className={`${card} space-y-3`}>
        {!selected ? (
          <EmptyState icon={ClipboardList} title={t("content.pick")} />
        ) : (
          <>
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">{selected.scholarship.title}</h3>
              <p className="text-[11px] text-slate-400">
                {selected.scholarship.provider} · {selected.scholarship.country ?? "—"} · {selected.scholarship.verificationStatus}
              </p>
              <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">
                {t("content.missing")}: {selected.report.missing.length ? selected.report.missing.join(", ") : t("content.nothing")}
              </p>
            </div>
            <p className="rounded-xl bg-amber-50 px-3 py-2 text-[11px] font-semibold text-amber-800 dark:bg-amber-500/10 dark:text-amber-200">
              {t("content.manualNote")}
            </p>
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label={t("content.tagline")} hint={t("content.taglineHint")}>
                <input className={inputCls} value={form.taglineUz} onChange={(e) => setForm({ ...form, taglineUz: e.target.value })} />
              </Field>
              <Field label={t("content.funding")}>
                <input className={inputCls} value={form.fundingTypeUz} onChange={(e) => setForm({ ...form, fundingTypeUz: e.target.value })} />
              </Field>
              <Field label={t("content.language")}>
                <input className={inputCls} value={form.languageReqUz} onChange={(e) => setForm({ ...form, languageReqUz: e.target.value })} />
              </Field>
              <Field label={t("content.hashtags")} hint={t("content.hashtagsHint")}>
                <input className={inputCls} value={form.extraHashtags} onChange={(e) => setForm({ ...form, extraHashtags: e.target.value })} />
              </Field>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label={t("content.eligibility")} hint={t("content.bulletsHint")}>
                <textarea rows={4} className={inputCls} value={form.eligibilityUz} onChange={(e) => setForm({ ...form, eligibilityUz: e.target.value })} />
              </Field>
              <Field label={t("content.benefits")} hint={t("content.bulletsHint")}>
                <textarea rows={4} className={inputCls} value={form.benefitsUz} onChange={(e) => setForm({ ...form, benefitsUz: e.target.value })} />
              </Field>
            </div>
            <Field label={t("content.about")} hint={t("content.aboutHint")}>
              <textarea rows={4} className={inputCls} value={form.aboutUz} onChange={(e) => setForm({ ...form, aboutUz: e.target.value })} />
            </Field>
            <div className="flex flex-wrap gap-2">
              <button className={btnPrimary} onClick={() => void save()} disabled={busy}>
                {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />} {t("save")}
              </button>
            </div>
            <div>
              <div className="mb-1 text-[11px] font-bold uppercase tracking-wide text-slate-500">{t("content.preview")}</div>
              <pre className="max-h-72 overflow-auto whitespace-pre-wrap break-words rounded-xl bg-slate-50 p-3 font-sans text-[11px] leading-relaxed text-slate-700 dark:bg-slate-800/60 dark:text-slate-200">
                {preview ?? t("content.previewHint")}
              </pre>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Davlatlar                                                          */
/* ------------------------------------------------------------------ */

function CountriesTab({ showToast }: { showToast: ShowToast }) {
  const t = useTranslations("adminChannel");
  const [rows, setRows] = useState<CountryRow[] | null>(null);
  const [busy, setBusy] = useState(false);
  const [draft, setDraft] = useState({ key: "", iso2: "", flag: "", nameUz: "", nameUzLoc: "", hashtag: "", aliases: "" });

  const load = useCallback(async () => {
    setBusy(true);
    try {
      const res = await api<{ rows: CountryRow[] }>("/api/admin/channel/countries");
      setRows(res.rows);
    } catch (err) {
      showToast(err instanceof Error ? err.message : t("loadFailed"));
    } finally {
      setBusy(false);
    }
  }, [showToast, t]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- load-on-mount / prop-sync, same pattern as the other admin managers
    void load();
  }, [load]);

  const save = async (row: Partial<CountryRow> & { key: string }) => {
    const aliasesInput = row.aliases as unknown;
    const aliases = Array.isArray(aliasesInput)
      ? aliasesInput.map((value) => String(value).trim()).filter(Boolean)
      : String(aliasesInput ?? "")
          .split(",")
          .map((value) => value.trim())
          .filter(Boolean);
    try {
      const res = await api<{ rows: CountryRow[] }>("/api/admin/channel/countries", {
        method: "POST",
        body: JSON.stringify({
          key: row.key,
          iso2: row.iso2 ?? "",
          flag: row.flag ?? "",
          nameUz: row.nameUz ?? "",
          nameUzLoc: row.nameUzLoc ?? "",
          hashtag: row.hashtag ?? "",
          aliases,
        }),
      });
      setRows(res.rows);
      showToast(t("saved"));
    } catch (err) {
      showToast(err instanceof Error ? err.message : t("saveFailed"));
    }
  };

  const remove = async (key: string) => {
    try {
      const res = await api<{ rows: CountryRow[] }>(`/api/admin/channel/countries?key=${encodeURIComponent(key)}`, { method: "DELETE" });
      setRows(res.rows);
      showToast(t("deleted"));
    } catch (err) {
      showToast(err instanceof Error ? err.message : t("deleteFailed"));
    }
  };

  if (!rows) return <LoadingBlock label={t("loading")} />;

  return (
    <div className="space-y-4">
      <div className={card}>
        <h3 className="mb-3 flex items-center gap-2 text-sm font-bold text-slate-900 dark:text-white">
          <Plus className="h-4 w-4 text-indigo-500" /> {t("countries.add")}
        </h3>
        <div className="grid gap-2 sm:grid-cols-7">
          <input className={inputCls} placeholder={t("countries.key")} value={draft.key} onChange={(e) => setDraft({ ...draft, key: e.target.value })} />
          <input className={inputCls} placeholder="DE" value={draft.iso2} onChange={(e) => setDraft({ ...draft, iso2: e.target.value })} />
          <input className={inputCls} placeholder="🇩🇪" value={draft.flag} onChange={(e) => setDraft({ ...draft, flag: e.target.value })} />
          <input className={inputCls} placeholder={t("countries.name")} value={draft.nameUz} onChange={(e) => setDraft({ ...draft, nameUz: e.target.value })} />
          <input className={inputCls} placeholder={t("countries.locative")} value={draft.nameUzLoc} onChange={(e) => setDraft({ ...draft, nameUzLoc: e.target.value })} />
          <input className={inputCls} placeholder={t("countries.hashtag")} value={draft.hashtag} onChange={(e) => setDraft({ ...draft, hashtag: e.target.value })} />
          <button
            className={btnPrimary}
            onClick={() => void save({ ...draft, aliases: draft.aliases.split(",").map((s) => s.trim()).filter(Boolean) }).then(() => setDraft({ key: "", iso2: "", flag: "", nameUz: "", nameUzLoc: "", hashtag: "", aliases: "" }))}
            disabled={busy || !draft.key || !draft.nameUz}
          >
            <Save className="h-3.5 w-3.5" /> {t("save")}
          </button>
        </div>
      </div>

      <div className={`${card} overflow-x-auto`}>
        <table className="w-full text-left text-xs">
          <thead className="text-[10px] uppercase tracking-wide text-slate-500">
            <tr>
              <th className="px-2 py-2">{t("countries.key")}</th>
              <th className="px-2 py-2">{t("countries.name")}</th>
              <th className="px-2 py-2">{t("countries.locative")}</th>
              <th className="px-2 py-2">{t("countries.hashtag")}</th>
              <th className="px-2 py-2" />
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <CountryRowEditor key={row.key} row={row} onSave={save} onDelete={remove} />
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function CountryRowEditor({
  row,
  onSave,
  onDelete,
}: {
  row: CountryRow;
  onSave: (row: Partial<CountryRow> & { key: string }) => Promise<void>;
  onDelete: (key: string) => Promise<void>;
}) {
  const t = useTranslations("adminChannel");
  const [draft, setDraft] = useState({ ...row, aliases: row.aliases.join(", ") });
  return (
    <tr className="border-t border-slate-100 dark:border-slate-800">
      <td className="px-2 py-1 font-mono text-[11px] text-slate-500">{row.key}</td>
      <td className="px-2 py-1">
        <div className="flex items-center gap-1">
          <input className={`${inputCls} max-w-[3.5rem]`} value={draft.flag} onChange={(e) => setDraft({ ...draft, flag: e.target.value })} />
          <input className={inputCls} value={draft.nameUz} onChange={(e) => setDraft({ ...draft, nameUz: e.target.value })} />
        </div>
      </td>
      <td className="px-2 py-1">
        <input className={inputCls} value={draft.nameUzLoc} onChange={(e) => setDraft({ ...draft, nameUzLoc: e.target.value })} />
      </td>
      <td className="px-2 py-1">
        <input className={inputCls} value={draft.hashtag} onChange={(e) => setDraft({ ...draft, hashtag: e.target.value })} />
      </td>
      <td className="px-2 py-1">
        <div className="flex gap-1">
          <button className={btnGhost} onClick={() => void onSave({ ...draft, aliases: draft.aliases.split(",").map((s) => s.trim()).filter(Boolean) })}>
            <Save className="h-3.5 w-3.5" />
          </button>
          <button className={btnGhost} onClick={() => void onDelete(row.key)} aria-label={t("delete")}>
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>
      </td>
    </tr>
  );
}

/* ------------------------------------------------------------------ */
/* Qisqa havolalar                                                    */
/* ------------------------------------------------------------------ */

function ShortLinksTab({ showToast }: { showToast: ShowToast }) {
  const t = useTranslations("adminChannel");
  const [rows, setRows] = useState<ShortLinkRow[] | null>(null);
  const [busy, setBusy] = useState(false);
  const [draft, setDraft] = useState({ code: "", url: "", kind: "custom", note: "", scholarshipId: "" });

  const load = useCallback(async () => {
    setBusy(true);
    try {
      const res = await api<{ rows: ShortLinkRow[] }>("/api/admin/channel/links");
      setRows(res.rows);
    } catch (err) {
      showToast(err instanceof Error ? err.message : t("loadFailed"));
    } finally {
      setBusy(false);
    }
  }, [showToast, t]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- load-on-mount / prop-sync, same pattern as the other admin managers
    void load();
  }, [load]);

  const create = async () => {
    try {
      const res = await api<{ rows: ShortLinkRow[] }>("/api/admin/channel/links", {
        method: "POST",
        body: JSON.stringify({
          code: draft.code,
          url: draft.url,
          kind: draft.kind,
          note: draft.note,
          enabled: true,
          scholarshipId: draft.scholarshipId ? Number(draft.scholarshipId) : 0,
        }),
      });
      setRows(res.rows);
      setDraft({ code: "", url: "", kind: "custom", note: "", scholarshipId: "" });
      showToast(t("saved"));
    } catch (err) {
      showToast(err instanceof Error ? err.message : t("saveFailed"));
    }
  };

  const remove = async (code: string) => {
    try {
      const res = await api<{ rows: ShortLinkRow[] }>(`/api/admin/channel/links?code=${encodeURIComponent(code)}`, { method: "DELETE" });
      setRows(res.rows);
      showToast(t("deleted"));
    } catch (err) {
      showToast(err instanceof Error ? err.message : t("deleteFailed"));
    }
  };

  if (!rows) return <LoadingBlock label={t("loading")} />;

  return (
    <div className="space-y-4">
      <div className={card}>
        <h3 className="mb-3 flex items-center gap-2 text-sm font-bold text-slate-900 dark:text-white">
          <Plus className="h-4 w-4 text-indigo-500" /> {t("short.add")}
        </h3>
        <div className="grid gap-2 sm:grid-cols-6">
          <input className={inputCls} placeholder={t("short.code")} value={draft.code} onChange={(e) => setDraft({ ...draft, code: e.target.value })} />
          <input className={`${inputCls} sm:col-span-2`} placeholder="https://…" value={draft.url} onChange={(e) => setDraft({ ...draft, url: e.target.value })} />
          <select className={inputCls} value={draft.kind} onChange={(e) => setDraft({ ...draft, kind: e.target.value })}>
            <option value="custom">custom</option>
            <option value="site">site</option>
            <option value="official">official</option>
          </select>
          <input className={inputCls} placeholder={t("short.note")} value={draft.note} onChange={(e) => setDraft({ ...draft, note: e.target.value })} />
          <button className={btnPrimary} onClick={() => void create()} disabled={busy || !draft.code || !draft.url}>
            <Save className="h-3.5 w-3.5" /> {t("save")}
          </button>
        </div>
        <p className="mt-2 text-[11px] text-slate-400">{t("short.hint")}</p>
      </div>

      <div className={`${card} overflow-x-auto`}>
        <div className="mb-2 flex justify-end">
          <a className={btnGhost} href="/api/admin/channel/links?format=csv">
            {t("short.csv")}
          </a>
        </div>
        <table className="w-full text-left text-xs">
          <thead className="text-[10px] uppercase tracking-wide text-slate-500">
            <tr>
              <th className="px-2 py-2">{t("short.code")}</th>
              <th className="px-2 py-2">URL</th>
              <th className="px-2 py-2">7d</th>
              <th className="px-2 py-2">30d</th>
              <th className="px-2 py-2" />
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.code} className="border-t border-slate-100 dark:border-slate-800">
                <td className="px-2 py-1 font-mono text-[11px]">{row.code}</td>
                <td className="max-w-[22rem] truncate px-2 py-1">
                  <a href={row.url} target="_blank" rel="noreferrer noopener" className="text-indigo-600 hover:underline dark:text-indigo-400">
                    {row.url}
                  </a>
                  {row.note ? <span className="ml-2 text-slate-400">· {row.note}</span> : null}
                </td>
                <td className="px-2 py-1 font-semibold">{row.clicks7}</td>
                <td className="px-2 py-1 font-semibold">{row.clicks30}</td>
                <td className="px-2 py-1">
                  <button className={btnGhost} onClick={() => void remove(row.code)} aria-label={t("delete")}>
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {!rows.length && <EmptyState icon={Link2} title={t("short.empty")} />}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Navbat                                                             */
/* ------------------------------------------------------------------ */

function QueueTab({ rows, showToast, reload }: { rows: QueueRow[]; showToast: ShowToast; reload: Reload }) {
  const t = useTranslations("adminChannel");
  const [busyId, setBusyId] = useState<number | null>(null);
  const [editing, setEditing] = useState<number | null>(null);
  const [text, setText] = useState("");
  const [time, setTime] = useState("");

  const run = async (id: number, action: string, extra: Record<string, unknown> = {}) => {
    setBusyId(id);
    try {
      await api("/api/admin/channel/queue", { method: "POST", body: JSON.stringify({ action, id, ...extra }) });
      showToast(t("done"));
      await reload();
    } catch (err) {
      showToast(err instanceof Error ? err.message : t("actionFailed"));
    } finally {
      setBusyId(null);
    }
  };

  if (!rows.length)
    return (
      <EmptyState
        icon={CalendarClock}
        title={t("queue.empty")}
        action={
          <button
            className={btnPrimary}
            onClick={() => void api("/api/admin/channel", { method: "POST", body: JSON.stringify({ action: "plan" }) }).then(() => reload())}
          >
            <CalendarClock className="h-3.5 w-3.5" /> {t("queue.build")}
          </button>
        }
      />
    );

  return (
    <div className="space-y-3">
      {rows.map((row) => (
        <div key={row.id} className={card}>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex flex-wrap items-center gap-2 text-xs">
              <span className="font-mono font-bold text-slate-900 dark:text-white">{row.sendAt}</span>
              <span className={`${chip} bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300`}>{row.kind}</span>
              <span className={`${chip} bg-indigo-50 text-indigo-600 dark:bg-indigo-500/10 dark:text-indigo-300`}>{row.lane}</span>
              <span
                className={`${chip} ${
                  row.status === "sent"
                    ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300"
                    : row.status === "skipped"
                      ? "bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400"
                      : "bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300"
                }`}
              >
                {row.status}
              </span>
              {row.scholarshipId ? <span className="text-slate-400">#{row.scholarshipId}</span> : null}
            </div>
            <div className="flex flex-wrap gap-1.5">
              <button className={btnGhost} onClick={() => void run(row.id, "test")} disabled={busyId === row.id}>
                <Wand2 className="h-3.5 w-3.5" /> {t("queue.test")}
              </button>
              <button className={btnGhost} onClick={() => void run(row.id, "post_now")} disabled={busyId === row.id}>
                <Play className="h-3.5 w-3.5" /> {t("queue.postNow")}
              </button>
              <button className={btnGhost} onClick={() => void run(row.id, "pin", { pinned: true })} disabled={busyId === row.id}>
                {t("queue.pin")}
              </button>
              <button
                className={btnGhost}
                onClick={() => {
                  setEditing(row.id);
                  setText(row.parts.join("\n\n"));
                  setTime(row.sendAt);
                }}
              >
                {t("queue.edit")}
              </button>
              <button className={btnGhost} onClick={() => void run(row.id, "skip", { reason: t("queue.skippedByAdmin") })} disabled={busyId === row.id}>
                {t("queue.skip")}
              </button>
            </div>
          </div>

          {row.skipReason ? <p className="mt-1 text-[11px] text-slate-400">{row.skipReason}</p> : null}

          {editing === row.id ? (
            <div className="mt-2 space-y-2">
              <textarea rows={6} className={inputCls} value={text} onChange={(e) => setText(e.target.value)} />
              <div className="flex flex-wrap items-center gap-2">
                <input type="time" className={`${inputCls} max-w-[8rem]`} value={time} onChange={(e) => setTime(e.target.value)} />
                <button className={btnPrimary} onClick={() => void run(row.id, "override", { text }).then(() => setEditing(null))}>
                  {t("queue.saveText")}
                </button>
                <button className={btnGhost} onClick={() => void run(row.id, "postpone", { sendAt: time })}>
                  {t("queue.postpone")}
                </button>
                <button className={btnGhost} onClick={() => setEditing(null)}>
                  {t("cancel")}
                </button>
              </div>
            </div>
          ) : (
            <pre className="mt-2 max-h-72 overflow-auto whitespace-pre-wrap break-words rounded-xl bg-slate-50 p-3 font-sans text-[11px] leading-relaxed text-slate-700 dark:bg-slate-800/60 dark:text-slate-200">
              {row.parts.length ? row.parts.join("\n\n———\n\n") : t("queue.notRendered")}
            </pre>
          )}
        </div>
      ))}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Jurnal                                                             */
/* ------------------------------------------------------------------ */

function AuditTab() {
  const t = useTranslations("adminChannel");
  const [rows, setRows] = useState<AuditRow[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api<{ rows: AuditRow[] }>("/api/admin/channel/audit")
      .then((res) => setRows(res.rows))
      .catch((err: unknown) => setError(err instanceof Error ? err.message : t("loadFailed")));
  }, [t]);

  if (error) return <ErrorNote message={error} />;
  if (!rows) return <LoadingBlock label={t("loading")} />;
  if (!rows.length) return <EmptyState icon={ShieldCheck} title={t("audit.empty")} />;

  return (
    <div className={`${card} overflow-x-auto`}>
      <table className="w-full text-left text-xs">
        <thead className="text-[10px] uppercase tracking-wide text-slate-500">
          <tr>
            <th className="px-2 py-2">{t("audit.when")}</th>
            <th className="px-2 py-2">{t("audit.actor")}</th>
            <th className="px-2 py-2">{t("audit.action")}</th>
            <th className="px-2 py-2">{t("audit.entity")}</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.id} className="border-t border-slate-100 dark:border-slate-800">
              <td className="px-2 py-1 text-slate-500">{new Date(row.createdAt).toLocaleString()}</td>
              <td className="px-2 py-1">{row.actorProfileId ?? "—"}</td>
              <td className="px-2 py-1 font-semibold">{row.action}</td>
              <td className="px-2 py-1 text-slate-500">
                {row.entity}
                {row.entityId ? ` #${row.entityId}` : ""}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* So'rovnomalar                                                       */
/* ------------------------------------------------------------------ */

interface PollOptionRow {
  key: string;
  text: string;
  voters: number;
  share: number;
}

interface PollRow {
  id: number;
  pollId: string | null;
  pollType: string;
  pollKey: string;
  topic: string | null;
  question: string;
  status: string;
  openedAt: string;
  closedAt: string | null;
  totalVoters: number;
  options: PollOptionRow[];
  deckKnown: boolean;
}

function PollsTab({ showToast }: { showToast: ShowToast }) {
  const t = useTranslations("adminChannel");
  const [rows, setRows] = useState<PollRow[] | null>(null);
  const [closing, setClosing] = useState<number | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await api<{ rows: PollRow[] }>("/api/admin/channel/polls");
      setRows(res.rows);
    } catch (err) {
      showToast(err instanceof Error ? err.message : t("loadFailed"));
    }
  }, [showToast, t]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- load-on-mount / prop-sync, same pattern as the other admin managers
    void load();
  }, [load]);

  const close = async (id: number) => {
    setClosing(id);
    try {
      const res = await api<{ rows: PollRow[]; reason: string | null }>("/api/admin/channel/polls", {
        method: "POST",
        body: JSON.stringify({ action: "close", id }),
      });
      setRows(res.rows);
      showToast(res.reason ? `${t("done")} · ${res.reason}` : t("done"));
    } catch (err) {
      showToast(err instanceof Error ? err.message : t("actionFailed"));
    } finally {
      setClosing(null);
    }
  };

  if (!rows) return <LoadingBlock label={t("loading")} />;
  if (!rows.length) {
    return <EmptyState icon={BarChart3} title={t("polls.empty")} body={t("polls.emptyHint")} />;
  }

  return (
    <div className="space-y-3">
      <div className={card}>
        <h3 className="flex items-center gap-2 text-sm font-bold text-slate-900 dark:text-white">
          <BarChart3 className="h-4 w-4 text-indigo-500" /> {t("polls.title")}
        </h3>
        <p className="mt-1 text-xs text-slate-500">{t("polls.hint")}</p>
      </div>
      {rows.map((row) => (
        <div key={row.id} className={card}>
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div className="min-w-0">
              <p className="text-sm font-bold text-slate-900 dark:text-white">{row.question}</p>
              <p className="mt-0.5 flex flex-wrap items-center gap-2 text-[11px] text-slate-500">
                <span className={`${chip} bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300`}>{row.pollType}</span>
                <span>{row.topic ?? "—"}</span>
                <span>·</span>
                <span>{new Date(row.openedAt).toLocaleDateString()}</span>
                {!row.deckKnown && (
                  <span className={`${chip} bg-amber-100 text-amber-700`}>
                    <AlertTriangle className="h-3 w-3" /> {t("polls.deckUnknown")}
                  </span>
                )}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <span
                className={`${chip} ${
                  row.status === "open" ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-600 dark:bg-slate-800"
                }`}
              >
                {row.status}
              </span>
              <span className="text-xs font-bold text-slate-600 dark:text-slate-300">
                {row.totalVoters} {t("polls.votes")}
              </span>
              {row.status === "open" && (
                <button className={btnGhost} disabled={closing === row.id} onClick={() => void close(row.id)}>
                  {closing === row.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <XCircle className="h-3.5 w-3.5" />}
                  {t("polls.close")}
                </button>
              )}
            </div>
          </div>
          <div className="mt-3 space-y-1.5">
            {row.options.length === 0 && <p className="text-xs text-slate-500">{t("polls.noVotes")}</p>}
            {row.options.map((option) => (
              <div key={option.key} className="flex items-center gap-2 text-xs">
                <span className="w-40 shrink-0 truncate text-slate-600 dark:text-slate-300">{option.text}</span>
                <div className="h-1.5 min-w-0 flex-1 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                  <div className="h-full rounded-full bg-indigo-500" style={{ width: `${Math.round(option.share * 100)}%` }} />
                </div>
                <span className="w-16 shrink-0 text-right font-mono text-[11px] text-slate-500">
                  {option.voters} · {Math.round(option.share * 100)}%
                </span>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Qiziqish og'irliklari                                               */
/* ------------------------------------------------------------------ */

interface PrefRow {
  topic: string;
  family: string;
  weight: number;
  samples: number;
  updatedAt: string;
}

function PrefsTab({ showToast }: { showToast: ShowToast }) {
  const t = useTranslations("adminChannel");
  const [rows, setRows] = useState<PrefRow[] | null>(null);
  const [draft, setDraft] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await api<{ rows: PrefRow[] }>("/api/admin/channel/prefs");
      setRows(res.rows);
      setDraft(Object.fromEntries(res.rows.map((row) => [row.topic, String(row.weight)])));
    } catch (err) {
      showToast(err instanceof Error ? err.message : t("loadFailed"));
    }
  }, [showToast, t]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- load-on-mount / prop-sync, same pattern as the other admin managers
    void load();
  }, [load]);

  const save = async (topic: string) => {
    setBusy(true);
    try {
      const res = await api<{ rows: PrefRow[] }>("/api/admin/channel/prefs", {
        method: "POST",
        body: JSON.stringify({ topic, weight: Number(draft[topic]) }),
      });
      setRows(res.rows);
      setDraft(Object.fromEntries(res.rows.map((row) => [row.topic, String(row.weight)])));
      showToast(t("saved"));
    } catch (err) {
      showToast(err instanceof Error ? err.message : t("saveFailed"));
    } finally {
      setBusy(false);
    }
  };

  const reset = async () => {
    setBusy(true);
    try {
      const res = await api<{ rows: PrefRow[]; count: number }>("/api/admin/channel/prefs", {
        method: "POST",
        body: JSON.stringify({ action: "reset" }),
      });
      setRows(res.rows);
      setDraft(Object.fromEntries(res.rows.map((row) => [row.topic, String(row.weight)])));
      showToast(`${t("done")} · ${res.count}`);
    } catch (err) {
      showToast(err instanceof Error ? err.message : t("actionFailed"));
    } finally {
      setBusy(false);
    }
  };

  if (!rows) return <LoadingBlock label={t("loading")} />;

  return (
    <div className="space-y-3">
      <div className={card}>
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div>
            <h3 className="flex items-center gap-2 text-sm font-bold text-slate-900 dark:text-white">
              <Settings2 className="h-4 w-4 text-indigo-500" /> {t("prefs.title")}
            </h3>
            <p className="mt-1 text-xs text-slate-500">{t("prefs.hint")}</p>
          </div>
          <button className={btnGhost} onClick={() => void reset()} disabled={busy || !rows.length}>
            <RefreshCw className="h-3.5 w-3.5" /> {t("prefs.reset")}
          </button>
        </div>
      </div>

      {!rows.length ? (
        <EmptyState icon={Settings2} title={t("prefs.empty")} body={t("prefs.emptyHint")} />
      ) : (
        <div className={`${card} overflow-x-auto`}>
          <table className="w-full text-left text-xs">
            <thead className="text-[10px] uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-2 py-2">{t("prefs.topic")}</th>
                <th className="px-2 py-2">{t("prefs.weight")}</th>
                <th className="px-2 py-2">{t("prefs.samples")}</th>
                <th className="px-2 py-2" />
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.topic} className="border-t border-slate-100 dark:border-slate-800">
                  <td className="px-2 py-1 font-mono text-[11px] text-slate-600 dark:text-slate-300">{row.topic}</td>
                  <td className="px-2 py-1">
                    <input
                      className={`${inputCls} max-w-[6rem]`}
                      inputMode="decimal"
                      value={draft[row.topic] ?? String(row.weight)}
                      onChange={(e) => setDraft({ ...draft, [row.topic]: e.target.value })}
                    />
                  </td>
                  <td className="px-2 py-1 text-slate-500">{row.samples}</td>
                  <td className="px-2 py-1">
                    <button className={btnGhost} disabled={busy} onClick={() => void save(row.topic)}>
                      <Save className="h-3.5 w-3.5" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Hikoyalar                                                           */
/* ------------------------------------------------------------------ */

interface StoryRow {
  id: number;
  title: string;
  body: string;
  authorLabel: string | null;
  sourceUrl: string | null;
  approved: boolean;
  createdAt: string;
}

const emptyStory = { id: 0, title: "", body: "", authorLabel: "", sourceUrl: "", approved: false };

function StoriesTab({ showToast }: { showToast: ShowToast }) {
  const t = useTranslations("adminChannel");
  const [rows, setRows] = useState<StoryRow[] | null>(null);
  const [draft, setDraft] = useState({ ...emptyStory });
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await api<{ rows: StoryRow[] }>("/api/admin/channel/stories");
      setRows(res.rows);
    } catch (err) {
      showToast(err instanceof Error ? err.message : t("loadFailed"));
    }
  }, [showToast, t]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- load-on-mount / prop-sync, same pattern as the other admin managers
    void load();
  }, [load]);

  const save = async () => {
    setBusy(true);
    try {
      const res = await api<{ rows: StoryRow[] }>("/api/admin/channel/stories", {
        method: "POST",
        body: JSON.stringify({ action: "save", ...draft, id: draft.id || undefined }),
      });
      setRows(res.rows);
      setDraft({ ...emptyStory });
      showToast(t("saved"));
    } catch (err) {
      showToast(err instanceof Error ? err.message : t("saveFailed"));
    } finally {
      setBusy(false);
    }
  };

  const toggle = async (row: StoryRow) => {
    try {
      const res = await api<{ rows: StoryRow[] }>("/api/admin/channel/stories", {
        method: "POST",
        body: JSON.stringify({ action: row.approved ? "unapprove" : "approve", id: row.id }),
      });
      setRows(res.rows);
    } catch (err) {
      showToast(err instanceof Error ? err.message : t("actionFailed"));
    }
  };

  const remove = async (id: number) => {
    try {
      const res = await api<{ rows: StoryRow[] }>(`/api/admin/channel/stories?id=${id}`, { method: "DELETE" });
      setRows(res.rows);
      showToast(t("deleted"));
    } catch (err) {
      showToast(err instanceof Error ? err.message : t("deleteFailed"));
    }
  };

  return (
    <div className="space-y-4">
      <div className={card}>
        <h3 className="flex items-center gap-2 text-sm font-bold text-slate-900 dark:text-white">
          <ClipboardList className="h-4 w-4 text-indigo-500" /> {draft.id ? t("stories.edit") : t("stories.add")}
        </h3>
        <p className="mt-1 text-xs text-slate-500">{t("stories.hint")}</p>
        <div className="mt-3 grid gap-2 sm:grid-cols-2">
          <Field label={t("stories.storyTitle")}>
            <input className={inputCls} value={draft.title} onChange={(e) => setDraft({ ...draft, title: e.target.value })} />
          </Field>
          <Field label={t("stories.author")}>
            <input
              className={inputCls}
              value={draft.authorLabel}
              onChange={(e) => setDraft({ ...draft, authorLabel: e.target.value })}
            />
          </Field>
          <div className="sm:col-span-2">
            <Field label={t("stories.body")}>
              <textarea
                className={`${inputCls} min-h-[7rem]`}
                value={draft.body}
                onChange={(e) => setDraft({ ...draft, body: e.target.value })}
              />
            </Field>
          </div>
          <Field label={t("stories.source")}>
            <input
              className={inputCls}
              value={draft.sourceUrl}
              onChange={(e) => setDraft({ ...draft, sourceUrl: e.target.value })}
            />
          </Field>
          <label className="flex items-end gap-2 pb-2 text-xs text-slate-600 dark:text-slate-300">
            <input
              type="checkbox"
              checked={draft.approved}
              onChange={(e) => setDraft({ ...draft, approved: e.target.checked })}
            />
            {t("stories.approved")}
          </label>
        </div>
        <div className="mt-3 flex gap-2">
          <button className={btnPrimary} onClick={() => void save()} disabled={busy || !draft.title.trim() || !draft.body.trim()}>
            {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />} {t("save")}
          </button>
          {draft.id > 0 && (
            <button className={btnGhost} onClick={() => setDraft({ ...emptyStory })}>
              {t("cancel")}
            </button>
          )}
        </div>
      </div>

      {!rows ? (
        <LoadingBlock label={t("loading")} />
      ) : !rows.length ? (
        <EmptyState icon={ClipboardList} title={t("stories.empty")} body={t("stories.emptyHint")} />
      ) : (
        <div className={`${card} space-y-2`}>
          {rows.map((row) => (
            <div
              key={row.id}
              className="flex flex-wrap items-start justify-between gap-2 border-b border-slate-100 pb-2 last:border-0 last:pb-0 dark:border-slate-800"
            >
              <div className="min-w-0">
                <p className="truncate text-sm font-bold text-slate-900 dark:text-white">{row.title}</p>
                <p className="line-clamp-2 text-xs text-slate-500">{row.body}</p>
                <p className="mt-0.5 text-[11px] text-slate-400">
                  {row.authorLabel ?? "—"} · {new Date(row.createdAt).toLocaleDateString()}
                </p>
              </div>
              <div className="flex items-center gap-1">
                <span
                  className={`${chip} ${row.approved ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"}`}
                >
                  {row.approved ? t("stories.approved") : t("stories.pending")}
                </span>
                <button className={btnGhost} onClick={() => void toggle(row)}>
                  {row.approved ? <XCircle className="h-3.5 w-3.5" /> : <CheckCircle2 className="h-3.5 w-3.5" />}
                  {row.approved ? t("stories.unapprove") : t("stories.approve")}
                </button>
                <button
                  className={btnGhost}
                  onClick={() =>
                    setDraft({
                      id: row.id,
                      title: row.title,
                      body: row.body,
                      authorLabel: row.authorLabel ?? "",
                      sourceUrl: row.sourceUrl ?? "",
                      approved: row.approved,
                    })
                  }
                >
                  <Play className="h-3.5 w-3.5" />
                </button>
                <button className={btnGhost} onClick={() => void remove(row.id)} aria-label={t("delete")}>
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
