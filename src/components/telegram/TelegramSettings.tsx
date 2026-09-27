"use client";

import React, { useCallback, useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { motion } from "framer-motion";
import { AlertTriangle, BellRing, CheckCircle2, KeyRound, Loader2, Send, ShieldAlert, Unlink, Zap } from "lucide-react";
import type { StudentProfile } from "../Navbar";
import { api, EmptyState, ErrorNote, LoadingBlock, PageHeader, Toast, useToast } from "../growth/ui";
import { TelegramCodeFlow } from "./TelegramCodeFlow";

interface MeResponse {
  bot: { configured: boolean; botUsername: string | null; notificationsEnabled: boolean; loginEnabled: boolean };
  link: {
    username: string | null;
    firstName: string | null;
    notifyEnabled: boolean;
    mutedTypes: string[];
    blocked: boolean;
    linkedAt: string;
  } | null;
  types: string[];
}

/** Types only admins ever receive. */
const ADMIN_ONLY = new Set(["forum_report", "forum_thread"]);

/**
 * "Telegram & notifications" — connect the bot, pause it, choose which
 * alerts go to Telegram, send a test, disconnect.
 */
export function TelegramSettings({ activeProfile, onNavigate }: { activeProfile: StudentProfile | null; onNavigate?: (tab: string) => void }) {
  const t = useTranslations("telegram");
  const [data, setData] = useState<MeResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [confirmUnlink, setConfirmUnlink] = useState(false);
  const [toast, showToast] = useToast();

  const load = useCallback(async () => {
    setError(null);
    try {
      setData(await api<MeResponse>("/api/telegram/me"));
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // Deferred a tick so the fetch's setState never runs inside the effect body.
    const id = window.setTimeout(() => void load(), 0);
    return () => window.clearTimeout(id);
  }, [load, activeProfile?.id]);

  const save = async (patch: { notifyEnabled?: boolean; mutedTypes?: string[] }) => {
    if (!data?.link) return;
    const prev = data;
    setData({ ...data, link: { ...data.link, ...patch } });
    try {
      await api("/api/telegram/me", { method: "PUT", body: JSON.stringify(patch) });
      showToast(t("saved"));
    } catch (e) {
      setData(prev);
      showToast(e instanceof Error ? e.message : String(e));
    }
  };

  const sendTest = async () => {
    setBusy("test");
    try {
      await api("/api/telegram/me", { method: "POST", body: JSON.stringify({ action: "test" }) });
      showToast(t("testSent"));
    } catch (e) {
      showToast(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(null);
    }
  };

  const unlink = async () => {
    setBusy("unlink");
    try {
      await api("/api/telegram/me", { method: "DELETE" });
      setConfirmUnlink(false);
      showToast(t("unlinked"));
      await load();
    } catch (e) {
      showToast(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(null);
    }
  };

  const header = <PageHeader icon={Send} accent="sky" title={t("pageTitle")} subtitle={t("pageSubtitle")} />;

  if (!activeProfile) return <div className="space-y-5">{header}</div>;
  if (loading) return <div className="space-y-5">{header}<LoadingBlock label={t("loading")} /></div>;
  if (error || !data) return <div className="space-y-5">{header}<ErrorNote message={error ?? ""} onRetry={load} retryLabel={t("retry")} /></div>;

  const placeholderEmail = /@telegram\.scholarbridge\.local$/i.test(activeProfile.email);

  if (!data.bot.configured) {
    return (
      <div className="space-y-5">
        {header}
        <EmptyState
          icon={Send}
          title={t("notConfiguredTitle")}
          body={activeProfile.isAdmin ? t("notConfiguredAdmin") : t("notConfiguredBody")}
          action={
            activeProfile.isAdmin && onNavigate ? (
              <button onClick={() => onNavigate("admin")} className="rounded-xl bg-slate-900 px-4 py-2 text-xs font-bold text-white hover:bg-slate-800">
                {t("openAdmin")}
              </button>
            ) : undefined
          }
        />
      </div>
    );
  }

  const link = data.link;
  const visibleTypes = data.types.filter((type) => activeProfile.isAdmin || !ADMIN_ONLY.has(type));

  return (
    <div className="space-y-5">
      {header}
      <Toast message={toast} />

      {placeholderEmail && (
        <div className="flex items-start gap-2.5 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-[12px] text-amber-900">
          <KeyRound className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
          <p>{t("placeholderEmailNote")}</p>
        </div>
      )}

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)]">
        {/* ---- Connection card ---- */}
        <section className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5">
          {link ? (
            <div className="space-y-4">
              <div className="flex items-start gap-3">
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-sky-500 text-white">
                  <Send className="h-5 w-5" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="flex items-center gap-1.5 text-sm font-extrabold text-slate-900">
                    <CheckCircle2 className="h-4 w-4 text-emerald-600" /> {t("connected")}
                  </p>
                  <p className="truncate text-[13px] text-slate-600">
                    {[link.firstName, link.username ? `@${link.username}` : null].filter(Boolean).join(" · ") || "Telegram"}
                  </p>
                  <p className="text-[11px] text-slate-400">{t("connectedSince", { date: new Date(link.linkedAt).toLocaleDateString() })}</p>
                </div>
              </div>

              {link.blocked && (
                <div className="flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 px-3 py-2.5 text-[12px] text-red-700">
                  <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                  <span>{t("blockedWarning", { bot: `@${data.bot.botUsername}` })}</span>
                </div>
              )}

              <div className="flex flex-wrap gap-2">
                <a
                  href={`https://t.me/${data.bot.botUsername}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 rounded-xl bg-sky-500 px-3 py-2 text-xs font-bold text-white hover:bg-sky-600"
                >
                  <Send className="h-3.5 w-3.5" /> {t("openChat")}
                </a>
                <button
                  onClick={sendTest}
                  disabled={busy === "test"}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 disabled:opacity-60"
                >
                  {busy === "test" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Zap className="h-3.5 w-3.5" />} {t("sendTest")}
                </button>
                {!confirmUnlink ? (
                  <button
                    onClick={() => setConfirmUnlink(true)}
                    className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-red-600 hover:bg-red-50"
                  >
                    <Unlink className="h-3.5 w-3.5" /> {t("disconnect")}
                  </button>
                ) : (
                  <motion.div initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }} className="flex w-full flex-wrap items-center gap-2 rounded-xl border border-red-200 bg-red-50 px-3 py-2">
                    <span className="flex-1 text-[12px] font-semibold text-red-700">{placeholderEmail ? t("disconnectWarnTelegramOnly") : t("disconnectConfirm")}</span>
                    <button onClick={unlink} disabled={busy === "unlink"} className="rounded-lg bg-red-600 px-3 py-1.5 text-[11px] font-bold text-white hover:bg-red-700 disabled:opacity-60">
                      {busy === "unlink" ? <Loader2 className="h-3 w-3 animate-spin" /> : t("disconnectYes")}
                    </button>
                    <button onClick={() => setConfirmUnlink(false)} className="rounded-lg bg-white px-3 py-1.5 text-[11px] font-bold text-slate-600 hover:bg-slate-100">
                      {t("cancel")}
                    </button>
                  </motion.div>
                )}
              </div>
            </div>
          ) : (
            <div>
              <p className="text-base font-extrabold text-slate-900">{t("linkTitle")}</p>
              <p className="mb-4 mt-0.5 text-[13px] text-slate-500">{t("linkSubtitle")}</p>
              <ul className="mb-4 space-y-2">
                {[
                  { icon: BellRing, text: t("benefitAlerts") },
                  { icon: KeyRound, text: t("benefitLogin") },
                  { icon: ShieldAlert, text: t("benefitSecurity") },
                ].map(({ icon: Icon, text }) => (
                  <li key={text} className="flex items-start gap-2.5 text-[13px] text-slate-600">
                    <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-sky-50 text-sky-600">
                      <Icon className="h-3.5 w-3.5" />
                    </span>
                    {text}
                  </li>
                ))}
              </ul>
              <TelegramCodeFlow
                purpose="link"
                botUsername={data.bot.botUsername}
                onLinked={() => {
                  showToast(t("linked"));
                  void load();
                }}
              />
            </div>
          )}
        </section>

        {/* ---- What to receive ---- */}
        <section className={`rounded-2xl border border-slate-200 bg-white p-4 sm:p-5 ${link ? "" : "opacity-60"}`}>
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-sm font-extrabold text-slate-900">{t("notifyToggle")}</p>
              <p className="mt-0.5 text-[12px] text-slate-500">{data.bot.notificationsEnabled ? t("notifyToggleHint") : t("notificationsOffByAdmin")}</p>
            </div>
            <Switch
              checked={!!link?.notifyEnabled && data.bot.notificationsEnabled}
              disabled={!link || !data.bot.notificationsEnabled}
              onChange={(v) => save({ notifyEnabled: v })}
              label={t("notifyToggle")}
            />
          </div>

          <p className="mb-2 mt-5 text-[11px] font-bold uppercase tracking-wide text-slate-400">{t("typesTitle")}</p>
          <ul className="divide-y divide-slate-100 rounded-xl border border-slate-100">
            {visibleTypes.map((type) => {
              const muted = link?.mutedTypes.includes(type) ?? false;
              return (
                <li key={type} className="flex items-center justify-between gap-3 px-3 py-2.5">
                  <div className="min-w-0">
                    <p className="text-[13px] font-semibold text-slate-800">{t(`types.${type}`)}</p>
                    <p className="text-[11px] text-slate-400">{t(`typeHints.${type}`)}</p>
                  </div>
                  <Switch
                    checked={!muted}
                    disabled={!link || !link.notifyEnabled || !data.bot.notificationsEnabled}
                    onChange={(on) => {
                      if (!link) return;
                      const next = on ? link.mutedTypes.filter((x) => x !== type) : [...link.mutedTypes, type];
                      void save({ mutedTypes: next });
                    }}
                    label={t(`types.${type}`)}
                    small
                  />
                </li>
              );
            })}
          </ul>

          <div className="mt-5 rounded-xl bg-slate-50 px-3 py-3">
            <p className="mb-1.5 text-[11px] font-bold uppercase tracking-wide text-slate-400">{t("commandsTitle")}</p>
            <ul className="grid gap-1 text-[12px] text-slate-600 sm:grid-cols-2">
              {(["status", "stop", "on", "unlink"] as const).map((c) => (
                <li key={c}>
                  <code className="rounded bg-white px-1 py-0.5 font-mono text-[11px] font-bold text-sky-700">/{c}</code> — {t(`commands.${c}`)}
                </li>
              ))}
            </ul>
          </div>
        </section>
      </div>
    </div>
  );
}

function Switch({
  checked,
  onChange,
  disabled,
  label,
  small = false,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  disabled?: boolean;
  label: string;
  small?: boolean;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={`relative shrink-0 rounded-full transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${
        small ? "h-5 w-9" : "h-6 w-11"
      } ${checked ? "bg-sky-500" : "bg-slate-300"}`}
    >
      {/* Knob colour is inline: the dark theme remaps `bg-white` to the card colour. */}
      <span
        style={{ backgroundColor: "#ffffff" }}
        className={`absolute top-0.5 rounded-full shadow transition-transform ${small ? "h-4 w-4" : "h-5 w-5"} ${
          checked ? (small ? "translate-x-4" : "translate-x-5") : "translate-x-0.5"
        } left-0`}
      />
    </button>
  );
}
