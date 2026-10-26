"use client";

import React, { useCallback, useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { AlertTriangle, CheckCircle2, Database, KeyRound, Loader2, RefreshCw, Table2 } from "lucide-react";
import { api } from "../growth/ui";

interface Status {
  state: "idle" | "ready" | "failed";
  reason: string | null;
  hint: string | null;
  at: string | null;
}

interface Diagnostics {
  database: {
    reachable: boolean;
    details: {
      canInsert: boolean | null;
      canCreateTables: boolean | null;
      readOnly: boolean | null;
      inRecovery: boolean | null;
      configTableVisible: boolean | null;
    } | null;
    reason: string | null;
    hint: string | null;
  };
  schema: { telegram: Status; channel: Status };
  token: { set: boolean; source: "admin" | "env" | "none" };
  checkedAt: string;
}

function Row({ ok, warn, icon: Icon, label, value }: { ok: boolean; warn?: boolean; icon: React.ElementType; label: string; value: string }) {
  const tone = warn ? "text-amber-600" : ok ? "text-emerald-600" : "text-rose-600";
  return (
    <div className="flex items-start gap-2 py-1">
      <Icon className={`mt-0.5 h-3.5 w-3.5 shrink-0 ${tone}`} />
      <div className="min-w-0">
        <p className="font-semibold text-slate-700 dark:text-slate-200">{label}</p>
        <p className={`${tone} break-words leading-relaxed`}>{value}</p>
      </div>
    </div>
  );
}

/**
 * "Why is it not working?" — reads `/api/admin/diagnostics`, which never
 * touches the Telegram/channel tables, so it still answers when the panels
 * themselves return "temporarily unavailable".
 */
export function SystemDiagnostics({ compact = false }: { compact?: boolean }) {
  const t = useTranslations("adminDiagnostics");
  const [data, setData] = useState<Diagnostics | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<null | "retry">(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      setData(await api<Diagnostics>("/api/admin/diagnostics"));
    } catch (err) {
      setError(err instanceof Error ? err.message : t("failed"));
    }
  }, [t]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- one-shot load
    void load();
  }, [load]);

  const retry = async () => {
    setBusy("retry");
    try {
      setData(await api<Diagnostics>("/api/admin/diagnostics", { method: "POST", body: JSON.stringify({ action: "retry" }) }));
    } catch (err) {
      setError(err instanceof Error ? err.message : t("failed"));
    } finally {
      setBusy(null);
    }
  };

  const db = data?.database;
  const dbText = !db ? t("loading") : db.reachable ? (db.reason ? t("dbReadOnly") : t("dbOk")) : t("dbDown");
  const schemaText = (s?: Status) => (!s || s.state === "idle" ? t("schemaIdle") : s.state === "ready" ? t("schemaReady") : t("schemaFailed"));
  const hints = [db?.hint, data?.schema.telegram.hint, data?.schema.channel.hint].filter(Boolean) as string[];

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-3 text-[11px] dark:border-slate-700 dark:bg-slate-900">
      <div className="mb-1 flex items-center justify-between gap-2">
        <p className="text-xs font-extrabold text-slate-800 dark:text-slate-100">{t("title")}</p>
        <button
          type="button"
          onClick={retry}
          disabled={busy === "retry"}
          className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-2 py-1 font-bold text-slate-600 hover:bg-slate-50 disabled:opacity-60 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
        >
          {busy === "retry" ? <Loader2 className="h-3 w-3 animate-spin" /> : <RefreshCw className="h-3 w-3" />} {t("retry")}
        </button>
      </div>
      {error && <p className="mb-1 font-semibold text-rose-600">{error}</p>}
      <Row ok={Boolean(db?.reachable)} warn={Boolean(db?.reachable && db?.reason)} icon={Database} label={t("database")} value={dbText} />
      {!compact && (
        <>
          <Row ok={data?.schema.telegram.state === "ready"} warn={data?.schema.telegram.state === "failed"} icon={Table2} label={t("telegramTables")} value={schemaText(data?.schema.telegram)} />
          <Row ok={data?.schema.channel.state === "ready"} warn={data?.schema.channel.state === "failed"} icon={Table2} label={t("channelTables")} value={schemaText(data?.schema.channel)} />
          <Row
            ok={Boolean(data?.token.set)}
            warn={data?.token.source === "env"}
            icon={KeyRound}
            label={t("botToken")}
            value={data?.token.set ? (data.token.source === "env" ? t("tokenEnv") : t("tokenAdmin")) : t("tokenMissing")}
          />
        </>
      )}
      {hints.length > 0 && (
        <div className="mt-1.5 flex gap-2 rounded-lg bg-amber-50 p-2 text-amber-800 dark:bg-amber-950/40 dark:text-amber-200">
          <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          <ul className="space-y-1">
            {hints.map((h) => (
              <li key={h}>{h}</li>
            ))}
          </ul>
        </div>
      )}
      {data && !hints.length && (
        <p className="mt-1.5 flex items-center gap-1 font-semibold text-emerald-600">
          <CheckCircle2 className="h-3.5 w-3.5" /> {t("allGood")}
        </p>
      )}
    </div>
  );
}
