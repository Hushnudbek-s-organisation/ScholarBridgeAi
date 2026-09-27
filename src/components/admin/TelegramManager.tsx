"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import {
  AlertTriangle,
  CheckCircle2,
  Eye,
  EyeOff,
  KeyRound,
  Link2,
  Loader2,
  Megaphone,
  RefreshCw,
  Search,
  Send,
  Settings2,
  Trash2,
  Unlink,
  Users,
  Webhook,
  XCircle,
  Zap,
} from "lucide-react";
import { api, ErrorNote, LoadingBlock, StatCard, Toast, useToast } from "../growth/ui";

interface Settings {
  loginEnabled: boolean;
  signupEnabled: boolean;
  adminLoginEnabled: boolean;
  notificationsEnabled: boolean;
  types: string[];
  siteUrl: string;
  botUsername: string;
  botName: string;
}

interface Live {
  reachable: boolean;
  bot: { id: number; username: string; name: string } | null;
  botError: string | null;
  webhook: { url: string; pending: number; lastError: string | null; lastErrorAt: string | null } | null;
}

interface AdminData {
  settings: Settings;
  token: { set: boolean; source: "admin" | "env" | "none"; masked: string };
  webhookUrl: string | null;
  suggestedSiteUrl: string;
  types: string[];
  stats: {
    links: { total: number; reachable: number; blocked: number };
    messages: { sent24: number; failed24: number; notif7: number; codes24: number };
    loginsToday: number;
  };
  users: {
    profileId: number;
    username: string | null;
    firstName: string | null;
    notifyEnabled: boolean;
    blocked: boolean;
    linkedAt: string;
    lastLoginAt: string | null;
    name: string;
    email: string;
    isAdmin: boolean;
  }[];
  messages: {
    id: number;
    kind: string;
    type: string | null;
    preview: string | null;
    status: string;
    error: string | null;
    createdAt: string;
    name: string | null;
  }[];
  myLink: boolean;
  live: Live | null;
}

const MAX_BROADCAST = 3500;

/**
 * Admin → System → Telegram bot: connect the bot (token + webhook), choose
 * what it may do (sign-in, sign-up, admin sign-in, notifications per type),
 * message everyone, see who is connected and what was delivered.
 */
export function TelegramManager() {
  const t = useTranslations("adminTelegram");
  const tt = useTranslations("telegram");
  const [data, setData] = useState<AdminData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [draft, setDraft] = useState<Settings | null>(null);
  const [token, setToken] = useState("");
  const [showToken, setShowToken] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [live, setLive] = useState<Live | null>(null);
  const [q, setQ] = useState("");
  const [text, setText] = useState("");
  const [includeMuted, setIncludeMuted] = useState(false);
  const [confirmBroadcast, setConfirmBroadcast] = useState(false);
  const [toast, showToast] = useToast();

  const load = useCallback(async (opts: { live?: boolean; q?: string } = {}) => {
    setError(null);
    try {
      const params = new URLSearchParams();
      if (opts.live) params.set("live", "1");
      if (opts.q) params.set("q", opts.q);
      const d = await api<AdminData>(`/api/admin/telegram${params.toString() ? `?${params}` : ""}`);
      setData(d);
      setDraft(d.settings);
      if (d.live) setLive(d.live);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  }, []);

  useEffect(() => {
    const id = window.setTimeout(() => void load({ live: true }), 0);
    return () => window.clearTimeout(id);
  }, [load]);

  const run = async <T,>(key: string, fn: () => Promise<T>, okMsg?: string): Promise<T | null> => {
    setBusy(key);
    try {
      const r = await fn();
      if (okMsg) showToast(okMsg);
      return r;
    } catch (e) {
      showToast(e instanceof Error ? e.message : String(e));
      return null;
    } finally {
      setBusy(null);
    }
  };

  const saveToken = async () => {
    const r = await run("token", () => api("/api/admin/telegram", { method: "PUT", body: JSON.stringify({ token }) }), t("tokenSaved"));
    if (r) {
      setToken("");
      await load({ live: true });
    }
  };

  const clearToken = async () => {
    if (!window.confirm(t("clearTokenConfirm"))) return;
    const r = await run("clear", () => api("/api/admin/telegram", { method: "PUT", body: JSON.stringify({ clearToken: true }) }), t("tokenCleared"));
    if (r) {
      setLive(null);
      await load();
    }
  };

  const saveSettings = async () => {
    if (!draft) return;
    const r = await run("settings", () => api("/api/admin/telegram", { method: "PUT", body: JSON.stringify(draft) }), t("saved"));
    if (r) await load();
  };

  const check = async () => {
    const r = await run("check", () => api<{ live: Live }>("/api/admin/telegram", { method: "POST", body: JSON.stringify({ action: "status" }) }));
    if (r) setLive(r.live);
  };

  const setWebhook = async () => {
    const r = await run(
      "webhook",
      () => api<{ url: string }>("/api/admin/telegram", { method: "POST", body: JSON.stringify({ action: "setWebhook", url: draft?.siteUrl || data?.suggestedSiteUrl }) }),
      t("webhookSet")
    );
    if (r) await load({ live: true });
  };

  const deleteWebhook = async () => {
    const r = await run("unhook", () => api("/api/admin/telegram", { method: "POST", body: JSON.stringify({ action: "deleteWebhook" }) }), t("webhookDeleted"));
    if (r) await check();
  };

  const sendTest = () => run("test", () => api("/api/admin/telegram", { method: "POST", body: JSON.stringify({ action: "test" }) }), t("testSent"));

  const sendBroadcast = async () => {
    const r = await run("broadcast", () =>
      api<{ total: number; sent: number; failed: number }>("/api/admin/telegram", {
        method: "POST",
        body: JSON.stringify({ action: "broadcast", text, includeMuted }),
      })
    );
    if (r) {
      showToast(t("broadcastDone", { sent: r.sent, total: r.total, failed: r.failed }));
      setText("");
      setConfirmBroadcast(false);
      await load();
    }
  };

  const unlinkUser = async (profileId: number, name: string) => {
    if (!window.confirm(t("unlinkUserConfirm", { name }))) return;
    const r = await run("unlink-" + profileId, () => api(`/api/admin/telegram?profileId=${profileId}`, { method: "DELETE" }), t("unlinkedUser"));
    if (r) await load({ q });
  };

  const dirty = useMemo(() => JSON.stringify(draft) !== JSON.stringify(data?.settings), [draft, data]);

  if (error && !data) return <ErrorNote message={error} onRetry={() => load({ live: true })} retryLabel={t("retry")} />;
  if (!data || !draft) return <LoadingBlock label={t("loading")} />;

  const configured = data.token.set && !!data.settings.botUsername;
  const webhookOk = !!live?.webhook?.url && live.webhook.url === data.webhookUrl;

  return (
    <div className="space-y-5">
      <Toast message={toast} />

      {/* ---- Numbers ---- */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label={t("statLinked")} value={data.stats.links.total} icon={Users} tone="indigo" />
        <StatCard label={t("statReachable")} value={data.stats.links.reachable} icon={Send} tone="emerald" />
        <StatCard label={t("statSent24")} value={`${data.stats.messages.sent24}${data.stats.messages.failed24 ? ` / ${data.stats.messages.failed24}✕` : ""}`} icon={Megaphone} tone="violet" />
        <StatCard label={t("statLogins")} value={data.stats.loginsToday} icon={KeyRound} tone="amber" />
      </div>

      <div className="grid gap-5 xl:grid-cols-2">
        {/* ---- Step 1: token ---- */}
        <Card icon={KeyRound} step={1} title={t("tokenTitle")} done={configured}>
          {configured ? (
            <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2.5">
              <div className="flex items-start gap-2">
                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
                <div className="min-w-0 flex-1 text-[12px]">
                  <p className="truncate font-bold text-slate-800">
                    @{data.settings.botUsername} <span className="font-normal text-slate-500">· {data.settings.botName}</span>
                  </p>
                  <p className="break-all font-mono text-[11px] text-slate-500">{data.token.masked}</p>
                  <p className="text-[11px] text-slate-500">{data.token.source === "env" ? t("sourceEnv") : t("sourceAdmin")}</p>
                </div>
              </div>
              <div className="mt-2 flex flex-wrap gap-2 pl-6">
                <a href={`https://t.me/${data.settings.botUsername}`} target="_blank" rel="noopener noreferrer" className="rounded-lg bg-white px-2.5 py-1.5 text-[11px] font-bold text-sky-700 hover:bg-sky-50">
                  {t("openBot")}
                </a>
                {data.token.source === "admin" && (
                  <button onClick={clearToken} disabled={busy === "clear"} className="rounded-lg bg-white px-2.5 py-1.5 text-[11px] font-bold text-red-600 hover:bg-red-50">
                    <Trash2 className="inline h-3 w-3" /> {t("clearToken")}
                  </button>
                )}
              </div>
            </div>
          ) : (
            <ol className="mb-3 list-decimal space-y-1 pl-5 text-[12px] text-slate-600">
              <li>{t("botfather1")}</li>
              <li>{t("botfather2")}</li>
              <li>{t("botfather3")}</li>
            </ol>
          )}
          <div className="mt-3 flex flex-col gap-2 sm:flex-row xl:flex-col 2xl:flex-row">
            <div className="relative flex-1">
              <input
                type={showToken ? "text" : "password"}
                value={token}
                onChange={(e) => setToken(e.target.value)}
                placeholder={configured ? t("tokenReplace") : "123456789:AA…"}
                autoComplete="off"
                spellCheck={false}
                aria-label={t("tokenTitle")}
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 pr-9 font-mono text-[13px] text-slate-900 focus:outline-none focus:ring-2 focus:ring-sky-500"
              />
              <button type="button" onClick={() => setShowToken((v) => !v)} aria-label={t("toggleToken")} className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-600">
                {showToken ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            <button
              onClick={saveToken}
              disabled={!token.trim() || busy === "token"}
              className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-sky-500 px-4 py-2.5 text-xs font-bold text-white hover:bg-sky-600 disabled:opacity-50"
            >
              {busy === "token" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <CheckCircle2 className="h-3.5 w-3.5" />} {t("saveToken")}
            </button>
          </div>
          <p className="mt-2 text-[11px] text-slate-400">{t("tokenNote")}</p>
        </Card>

        {/* ---- Step 2: webhook ---- */}
        <Card icon={Webhook} step={2} title={t("webhookTitle")} done={webhookOk}>
          <p className="mb-3 text-[12px] text-slate-600">{t("webhookIntro")}</p>
          <label className="mb-1 block text-[11px] font-bold uppercase tracking-wide text-slate-500">{t("siteUrl")}</label>
          <input
            value={draft.siteUrl}
            onChange={(e) => setDraft({ ...draft, siteUrl: e.target.value })}
            placeholder={data.suggestedSiteUrl || "https://scholarbridge.uz"}
            className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-[13px] text-slate-900 focus:outline-none focus:ring-2 focus:ring-sky-500"
          />
          <p className="mt-1 text-[11px] text-slate-400">{t("siteUrlHint")}</p>
          {data.webhookUrl && (
            <p className="mt-2 break-all rounded-lg bg-slate-50 px-2.5 py-1.5 font-mono text-[11px] text-slate-600">{data.webhookUrl}</p>
          )}

          {live && (
            <div className={`mt-3 rounded-xl border px-3 py-2.5 text-[12px] ${webhookOk && !live.webhook?.lastError ? "border-emerald-200 bg-emerald-50" : "border-amber-200 bg-amber-50"}`}>
              <p className="flex items-center gap-1.5 font-bold text-slate-800">
                {webhookOk ? <CheckCircle2 className="h-4 w-4 text-emerald-600" /> : <AlertTriangle className="h-4 w-4 text-amber-600" />}
                {!live.bot ? t("botUnreachable", { error: live.botError ?? "" }) : webhookOk ? t("webhookOk") : live.webhook?.url ? t("webhookOther") : t("webhookNone")}
              </p>
              {live.webhook?.url && !webhookOk && <p className="mt-1 break-all font-mono text-[11px] text-slate-500">{live.webhook.url}</p>}
              {live.webhook && live.webhook.pending > 0 && <p className="mt-1 text-slate-600">{t("pending", { n: live.webhook.pending })}</p>}
              {live.webhook?.lastError && (
                <p className="mt-1 text-red-700">
                  {t("lastError")}: {live.webhook.lastError}
                </p>
              )}
            </div>
          )}

          <div className="mt-3 flex flex-wrap gap-2">
            <button
              onClick={setWebhook}
              disabled={!configured || busy === "webhook"}
              className="inline-flex items-center gap-1.5 rounded-xl bg-slate-900 px-3.5 py-2 text-xs font-bold text-white hover:bg-slate-800 disabled:opacity-50"
            >
              {busy === "webhook" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Link2 className="h-3.5 w-3.5" />} {t("connectWebhook")}
            </button>
            <button onClick={check} disabled={!configured || busy === "check"} className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 disabled:opacity-50">
              {busy === "check" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />} {t("check")}
            </button>
            {live?.webhook?.url && (
              <button onClick={deleteWebhook} disabled={busy === "unhook"} className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-bold text-red-600 hover:bg-red-50">
                <Unlink className="h-3.5 w-3.5" /> {t("disconnectWebhook")}
              </button>
            )}
            <button
              onClick={sendTest}
              disabled={!configured || !data.myLink || busy === "test"}
              title={data.myLink ? "" : t("testNeedsLink")}
              className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
            >
              <Zap className="h-3.5 w-3.5" /> {t("sendTest")}
            </button>
          </div>
          {!data.myLink && configured && (
            <p className="mt-2 text-[11px] text-slate-400">
              {t("testNeedsLink")}{" "}
              <a href="#notifications" className="font-bold text-sky-600 hover:underline">
                {t("connectMine")}
              </a>
            </p>
          )}
        </Card>
      </div>

      {/* ---- Step 3: what the bot may do ---- */}
      <Card icon={Settings2} step={3} title={t("settingsTitle")}>
        <div className="grid gap-2 sm:grid-cols-2">
          {(
            [
              ["loginEnabled", t("optLogin"), t("optLoginHint")],
              ["signupEnabled", t("optSignup"), t("optSignupHint")],
              ["adminLoginEnabled", t("optAdminLogin"), t("optAdminLoginHint")],
              ["notificationsEnabled", t("optNotify"), t("optNotifyHint")],
            ] as const
          ).map(([key, label, hint]) => (
            <label key={key} className="flex cursor-pointer items-start gap-3 rounded-xl border border-slate-200 px-3 py-2.5 hover:bg-slate-50">
              <input
                type="checkbox"
                checked={draft[key]}
                onChange={(e) => setDraft({ ...draft, [key]: e.target.checked })}
                className="mt-0.5 h-4 w-4 accent-sky-500"
              />
              <span className="min-w-0">
                <span className="block text-[13px] font-bold text-slate-800">{label}</span>
                <span className="block text-[11px] text-slate-500">{hint}</span>
              </span>
            </label>
          ))}
        </div>

        <p className="mb-2 mt-5 text-[11px] font-bold uppercase tracking-wide text-slate-400">{t("typesTitle")}</p>
        <div className={`grid gap-1.5 sm:grid-cols-2 lg:grid-cols-3 ${draft.notificationsEnabled ? "" : "opacity-50"}`}>
          {data.types.map((type) => (
            <label key={type} className="flex cursor-pointer items-center gap-2 rounded-lg px-2 py-1.5 text-[12px] text-slate-700 hover:bg-slate-50">
              <input
                type="checkbox"
                disabled={!draft.notificationsEnabled}
                checked={draft.types.includes(type)}
                onChange={(e) =>
                  setDraft({ ...draft, types: e.target.checked ? [...draft.types, type] : draft.types.filter((x) => x !== type) })
                }
                className="h-3.5 w-3.5 accent-sky-500"
              />
              {tt(`types.${type}`)}
            </label>
          ))}
        </div>

        <div className="mt-4 flex items-center justify-end gap-2">
          {dirty && <span className="text-[11px] font-semibold text-amber-600">{t("unsaved")}</span>}
          <button onClick={() => setDraft(data.settings)} disabled={!dirty} className="rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-bold text-slate-600 hover:bg-slate-50 disabled:opacity-40">
            {t("reset")}
          </button>
          <button onClick={saveSettings} disabled={!dirty || busy === "settings"} className="inline-flex items-center gap-1.5 rounded-xl bg-sky-500 px-4 py-2 text-xs font-bold text-white hover:bg-sky-600 disabled:opacity-40">
            {busy === "settings" && <Loader2 className="h-3.5 w-3.5 animate-spin" />} {t("save")}
          </button>
        </div>
      </Card>

      {/* ---- Broadcast ---- */}
      <Card icon={Megaphone} title={t("broadcastTitle")}>
        <p className="mb-2 text-[12px] text-slate-600">{t("broadcastIntro", { n: includeMuted ? data.stats.links.total - data.stats.links.blocked : data.stats.links.reachable })}</p>
        <textarea
          value={text}
          onChange={(e) => {
            setText(e.target.value.slice(0, MAX_BROADCAST));
            setConfirmBroadcast(false);
          }}
          rows={4}
          placeholder={t("broadcastPlaceholder")}
          className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-[13px] text-slate-900 focus:outline-none focus:ring-2 focus:ring-sky-500"
        />
        <div className="mt-2 flex flex-wrap items-center gap-3">
          <label className="flex items-center gap-2 text-[12px] text-slate-600">
            <input type="checkbox" checked={includeMuted} onChange={(e) => setIncludeMuted(e.target.checked)} className="h-3.5 w-3.5 accent-sky-500" />
            {t("includeMuted")}
          </label>
          <span className="ml-auto text-[11px] text-slate-400">
            {text.length}/{MAX_BROADCAST}
          </span>
          {!confirmBroadcast ? (
            <button
              onClick={() => setConfirmBroadcast(true)}
              disabled={!configured || !text.trim()}
              className="inline-flex items-center gap-1.5 rounded-xl bg-slate-900 px-3.5 py-2 text-xs font-bold text-white hover:bg-slate-800 disabled:opacity-40"
            >
              <Send className="h-3.5 w-3.5" /> {t("broadcastSend")}
            </button>
          ) : (
            <button onClick={sendBroadcast} disabled={busy === "broadcast"} className="inline-flex items-center gap-1.5 rounded-xl bg-red-600 px-3.5 py-2 text-xs font-bold text-white hover:bg-red-700">
              {busy === "broadcast" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />} {t("broadcastConfirm")}
            </button>
          )}
        </div>
      </Card>

      <div className="grid gap-5 xl:grid-cols-2">
        {/* ---- Linked users ---- */}
        <Card icon={Users} title={t("usersTitle", { n: data.stats.links.total })}>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              void load({ q });
            }}
            className="relative mb-3"
          >
            <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder={t("usersSearch")}
              className="w-full rounded-xl border border-slate-200 bg-white py-2 pl-8 pr-3 text-[13px] text-slate-900 focus:outline-none focus:ring-2 focus:ring-sky-500"
            />
          </form>
          {data.users.length === 0 ? (
            <p className="py-6 text-center text-[12px] text-slate-400">{t("usersEmpty")}</p>
          ) : (
            <ul className="max-h-96 divide-y divide-slate-100 overflow-y-auto">
              {data.users.map((u) => (
                <li key={u.profileId} className="flex items-center gap-3 py-2.5">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[13px] font-bold text-slate-800">
                      {u.name} {u.isAdmin && <span className="ml-1 rounded bg-slate-900 px-1 py-0.5 text-[9px] font-bold text-white">ADMIN</span>}
                    </p>
                    <p className="truncate text-[11px] text-slate-500">
                      {u.username ? `@${u.username}` : u.firstName} · {new Date(u.linkedAt).toLocaleDateString()}
                    </p>
                  </div>
                  <span
                    className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold ${
                      u.blocked ? "bg-red-50 text-red-700" : u.notifyEnabled ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-500"
                    }`}
                  >
                    {u.blocked ? t("stBlocked") : u.notifyEnabled ? t("stOn") : t("stPaused")}
                  </span>
                  <button
                    onClick={() => unlinkUser(u.profileId, u.name)}
                    disabled={busy === "unlink-" + u.profileId}
                    title={t("unlinkUser")}
                    aria-label={t("unlinkUser")}
                    className="shrink-0 rounded-lg p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-600"
                  >
                    <Unlink className="h-3.5 w-3.5" />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </Card>

        {/* ---- Delivery log ---- */}
        <Card icon={Send} title={t("logTitle")}>
          {data.messages.length === 0 ? (
            <p className="py-6 text-center text-[12px] text-slate-400">{t("logEmpty")}</p>
          ) : (
            <ul className="max-h-96 divide-y divide-slate-100 overflow-y-auto">
              {data.messages.map((m) => (
                <li key={m.id} className="flex items-start gap-2.5 py-2">
                  {m.status === "sent" ? <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-500" /> : <XCircle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-red-500" />}
                  <div className="min-w-0 flex-1">
                    <p className="text-[12px] text-slate-700">
                      <span className="mr-1.5 rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-bold uppercase text-slate-500">{t(`kind.${KINDS.has(m.kind) ? m.kind : "reply"}`)}</span>
                      <span className="font-semibold">{m.name ?? "—"}</span>
                      {m.kind === "code" ? <span className="text-slate-400"> · {t("codeHidden")}</span> : m.preview ? <span className="text-slate-500"> · {m.preview.split("\n")[0].slice(0, 80)}</span> : null}
                    </p>
                    {m.error && <p className="text-[11px] text-red-600">{m.error}</p>}
                  </div>
                  <span className="shrink-0 text-[10px] text-slate-400">{new Date(m.createdAt).toLocaleString([], { hour: "2-digit", minute: "2-digit", day: "2-digit", month: "2-digit" })}</span>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </div>
  );
}

const KINDS = new Set(["code", "notification", "broadcast", "test", "login_alert", "reply"]);

function Card({
  icon: Icon,
  title,
  step,
  done,
  children,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  step?: number;
  done?: boolean;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5">
      <div className="mb-3 flex items-center gap-2.5">
        <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-xl ${done ? "bg-emerald-500 text-white" : "bg-sky-50 text-sky-600"}`}>
          {done ? <CheckCircle2 className="h-4 w-4" /> : <Icon className="h-4 w-4" />}
        </span>
        <h3 className="text-sm font-extrabold text-slate-900">
          {step ? <span className="mr-1 text-slate-400">{step}.</span> : null}
          {title}
        </h3>
      </div>
      {children}
    </section>
  );
}
