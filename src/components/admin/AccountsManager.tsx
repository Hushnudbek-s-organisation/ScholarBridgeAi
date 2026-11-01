"use client";

/**
 * Admin → Accounts. The support screen for "I cannot sign in".
 *
 * It shows what is actually knowable about an account — whether a password
 * exists, when it was last set, how many devices are signed in, whether Telegram
 * is linked — and offers the only two operations that can help:
 *
 *   1. **Create a reset link** and copy it. The student sets their own password;
 *      the administrator never sees it. Works with email completely broken.
 *   2. **Set a temporary password** for someone who cannot open a link. The
 *      administrator hands it over; every open session dies with it.
 *
 * There is deliberately no "show password" control: the stored value is a scrypt
 * hash, so there is nothing to show. The panel says so, in place, rather than
 * letting an administrator hunt for a button that cannot exist.
 *
 * Both actions require the administrator to re-enter their own password — a
 * stolen admin cookie alone cannot take over a student account.
 */
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import {
  AlertTriangle,
  Copy,
  Check,
  KeyRound,
  Link2,
  Loader2,
  Search,
  ShieldCheck,
  Smartphone,
  UserRound,
} from "lucide-react";

interface Account {
  id: number;
  name: string;
  email: string;
  isAdmin: boolean;
  hasPassword: boolean;
  passwordChangedAt: string | null;
  createdAt: string | null;
  liveSessions: number;
  lastSeenAt: string | null;
  telegram: boolean;
  premium: boolean;
}

const inputCls =
  "w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-200";
const btnDark =
  "flex items-center justify-center gap-1.5 rounded-xl bg-slate-900 px-3 py-2 text-xs font-bold text-white hover:bg-slate-700 disabled:opacity-50";
const btnLight =
  "flex items-center justify-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-600 hover:bg-slate-50 disabled:opacity-50";

type Result =
  | { kind: "link"; link: string; expiresAt: string }
  | { kind: "password"; password: string | null; email: string }
  | null;

export function AccountsManager() {
  const t = useTranslations("adminAccounts");
  const [q, setQ] = useState("");
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Account | null>(null);
  const [adminPassword, setAdminPassword] = useState("");
  const [typedPassword, setTypedPassword] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [result, setResult] = useState<Result>(null);
  const [copied, setCopied] = useState(false);

  const load = useCallback(async (needle: string) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/accounts?q=${encodeURIComponent(needle)}`, { cache: "no-store" });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error || `HTTP ${res.status}`);
      setAccounts(Array.isArray(json.accounts) ? (json.accounts as Account[]) : []);
      setError("");
    } catch (err) {
      setError(err instanceof Error ? err.message : t("loadFailed"));
    } finally {
      setLoading(false);
    }
  }, [t]);

  // Debounced search: typing an email should not fire one request per keystroke.
  useEffect(() => {
    const id = setTimeout(() => void load(q.trim()), 250);
    return () => clearTimeout(id);
  }, [q, load]);

  const when = useMemo(
    () => (iso: string | null) => (iso ? new Date(iso).toLocaleString() : t("unknown")),
    [t]
  );

  const post = async (path: string, body: Record<string, unknown>) => {
    const res = await fetch(path, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(json.error || `HTTP ${res.status}`);
    return json as Record<string, unknown>;
  };

  const createLink = async () => {
    if (!selected) return;
    setBusy("link");
    setError("");
    setResult(null);
    try {
      const json = await post(`/api/admin/accounts/${selected.id}/reset-link`, { adminPassword });
      setResult({ kind: "link", link: String(json.link), expiresAt: String(json.expiresAt) });
      setAdminPassword("");
      await load(q.trim());
    } catch (err) {
      setError(err instanceof Error ? err.message : t("failed"));
    } finally {
      setBusy(null);
    }
  };

  const setPassword = async (generate: boolean) => {
    if (!selected) return;
    setBusy(generate ? "generate" : "set");
    setError("");
    setResult(null);
    try {
      const json = await post(`/api/admin/accounts/${selected.id}/password`, {
        adminPassword,
        ...(generate ? { generate: true } : { password: typedPassword }),
      });
      setResult({
        kind: "password",
        password: (json.temporaryPassword as string | undefined) ?? null,
        email: String((json.account as { email?: string } | undefined)?.email ?? selected.email),
      });
      setAdminPassword("");
      setTypedPassword("");
      await load(q.trim());
    } catch (err) {
      setError(err instanceof Error ? err.message : t("failed"));
    } finally {
      setBusy(null);
    }
  };

  const copy = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      setError(t("copyFailed"));
    }
  };

  return (
    <div className="space-y-4">
      {/* Why there is no "show password" button — said once, in place. */}
      <div className="flex items-start gap-2 rounded-2xl border border-sky-200 bg-sky-50 p-3 text-[11px] leading-relaxed text-sky-900">
        <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-sky-600" />
        <p>{t("whyNoPassword")}</p>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            type="search"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder={t("searchPlaceholder")}
            aria-label={t("searchPlaceholder")}
            className={`${inputCls} pl-9`}
          />
        </div>
        {error && (
          <div role="alert" className="mt-2 flex items-start gap-1.5 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-[11px] font-semibold text-red-700">
            <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {loading ? (
          <p className="p-6 text-center text-xs font-semibold text-slate-400">
            <Loader2 className="mr-2 inline h-4 w-4 animate-spin" />
            {t("loading")}
          </p>
        ) : accounts.length === 0 ? (
          <p className="p-6 text-center text-xs font-semibold text-slate-400">{t("empty")}</p>
        ) : (
          <ul className="mt-3 divide-y divide-slate-100">
            {accounts.map((a) => (
              <li key={a.id}>
                <button
                  type="button"
                  onClick={() => {
                    setSelected(a);
                    setResult(null);
                    setError("");
                    setAdminPassword("");
                    setTypedPassword("");
                  }}
                  className={`flex w-full flex-wrap items-center gap-x-3 gap-y-1 rounded-xl px-2 py-2.5 text-left text-xs transition-colors hover:bg-slate-50 ${
                    selected?.id === a.id ? "bg-indigo-50/60" : ""
                  }`}
                >
                  <UserRound className="h-4 w-4 shrink-0 text-slate-400" />
                  <span className="font-bold text-slate-800">{a.name}</span>
                  <span className="truncate text-slate-500">{a.email}</span>
                  {a.isAdmin && (
                    <span className="rounded-full border border-indigo-200 bg-indigo-50 px-2 py-0.5 text-[10px] font-bold text-indigo-700">
                      {t("adminBadge")}
                    </span>
                  )}
                  <span className="ml-auto flex shrink-0 items-center gap-2 text-[10px] font-semibold">
                    <span className={a.hasPassword ? "text-emerald-700" : "text-amber-700"}>
                      {a.hasPassword ? t("hasPassword") : t("noPassword")}
                    </span>
                    {a.liveSessions > 0 && (
                      <span className="inline-flex items-center gap-0.5 text-slate-500">
                        <Smartphone className="h-3 w-3" />
                        {a.liveSessions}
                      </span>
                    )}
                    {a.telegram && <span className="text-sky-600">Telegram</span>}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      {selected && (
        <div className="space-y-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-xs">
          <div>
            <h3 className="text-sm font-extrabold text-slate-800">{selected.name}</h3>
            <p className="text-xs text-slate-500">{selected.email}</p>
          </div>

          <dl className="grid grid-cols-2 gap-2 text-[11px] sm:grid-cols-4">
            <div className="rounded-xl bg-slate-50 px-2.5 py-2">
              <dt className="text-[10px] font-bold uppercase tracking-wide text-slate-400">{t("passwordSetAt")}</dt>
              <dd className="mt-0.5 font-semibold text-slate-700">{when(selected.passwordChangedAt)}</dd>
            </div>
            <div className="rounded-xl bg-slate-50 px-2.5 py-2">
              <dt className="text-[10px] font-bold uppercase tracking-wide text-slate-400">{t("sessions")}</dt>
              <dd className="mt-0.5 font-semibold text-slate-700">{selected.liveSessions}</dd>
            </div>
            <div className="rounded-xl bg-slate-50 px-2.5 py-2">
              <dt className="text-[10px] font-bold uppercase tracking-wide text-slate-400">{t("lastSeen")}</dt>
              <dd className="mt-0.5 font-semibold text-slate-700">{when(selected.lastSeenAt)}</dd>
            </div>
            <div className="rounded-xl bg-slate-50 px-2.5 py-2">
              <dt className="text-[10px] font-bold uppercase tracking-wide text-slate-400">{t("createdAt")}</dt>
              <dd className="mt-0.5 font-semibold text-slate-700">{when(selected.createdAt)}</dd>
            </div>
          </dl>

          <div>
            <label htmlFor="admin-reauth" className="mb-1 block text-[10px] font-bold uppercase tracking-wide text-slate-400">
              {t("yourPassword")}
            </label>
            <input
              id="admin-reauth"
              type="password"
              autoComplete="current-password"
              value={adminPassword}
              onChange={(e) => setAdminPassword(e.target.value)}
              placeholder={t("yourPasswordHint")}
              className={inputCls}
            />
          </div>

          {/* 1. reset link — the path that works with email down */}
          <div className="rounded-xl border border-indigo-100 bg-indigo-50/50 p-3">
            <div className="flex items-start gap-2">
              <Link2 className="mt-0.5 h-4 w-4 shrink-0 text-indigo-600" />
              <div className="min-w-0 flex-1">
                <p className="text-xs font-bold text-slate-800">{t("linkTitle")}</p>
                <p className="mt-0.5 text-[11px] leading-relaxed text-slate-600">{t("linkBody")}</p>
                <button
                  type="button"
                  disabled={!!busy || !adminPassword}
                  onClick={() => void createLink()}
                  className={`${btnDark} mt-2`}
                >
                  {busy === "link" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Link2 className="h-3.5 w-3.5" />}
                  {t("linkBtn")}
                </button>
              </div>
            </div>
          </div>

          {/* 2. temporary password */}
          <div className="rounded-xl border border-slate-200 bg-slate-50/60 p-3">
            <div className="flex items-start gap-2">
              <KeyRound className="mt-0.5 h-4 w-4 shrink-0 text-slate-600" />
              <div className="min-w-0 flex-1">
                <p className="text-xs font-bold text-slate-800">{t("passwordTitle")}</p>
                <p className="mt-0.5 text-[11px] leading-relaxed text-slate-600">{t("passwordBody")}</p>
                <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-[1fr_auto_auto]">
                  <input
                    type="text"
                    value={typedPassword}
                    onChange={(e) => setTypedPassword(e.target.value)}
                    placeholder={t("newPasswordPlaceholder")}
                    aria-label={t("newPasswordPlaceholder")}
                    className={inputCls}
                    autoComplete="new-password"
                  />
                  <button
                    type="button"
                    disabled={!!busy || !adminPassword || typedPassword.length < 8}
                    onClick={() => void setPassword(false)}
                    className={btnLight}
                  >
                    {busy === "set" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <KeyRound className="h-3.5 w-3.5" />}
                    {t("setBtn")}
                  </button>
                  <button
                    type="button"
                    disabled={!!busy || !adminPassword}
                    onClick={() => void setPassword(true)}
                    className={btnDark}
                  >
                    {busy === "generate" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <ShieldCheck className="h-3.5 w-3.5" />}
                    {t("generateBtn")}
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* The one-time result */}
          {result?.kind === "link" && (
            <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3">
              <p className="text-[11px] font-bold text-emerald-900">{t("linkReady")}</p>
              <div className="mt-1.5 flex items-start gap-2">
                <code className="min-w-0 flex-1 break-all rounded-lg bg-white px-2 py-1.5 text-[10px] leading-relaxed text-slate-700">
                  {result.link}
                </code>
                <button type="button" onClick={() => void copy(result.link)} className={btnLight}>
                  {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                  {copied ? t("copied") : t("copy")}
                </button>
              </div>
              <p className="mt-1.5 text-[10px] text-emerald-800">
                {t("linkExpiry", { when: when(result.expiresAt) })}
              </p>
            </div>
          )}
          {result?.kind === "password" && (
            <div className="rounded-xl border border-amber-200 bg-amber-50 p-3">
              <p className="text-[11px] font-bold text-amber-900">{t("passwordReady", { email: result.email })}</p>
              {result.password && (
                <div className="mt-1.5 flex items-center gap-2">
                  <code className="min-w-0 flex-1 break-all rounded-lg bg-white px-2 py-1.5 text-xs font-bold tracking-wide text-slate-800">
                    {result.password}
                  </code>
                  <button type="button" onClick={() => void copy(result.password!)} className={btnLight}>
                    {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                    {copied ? t("copied") : t("copy")}
                  </button>
                </div>
              )}
              <p className="mt-1.5 text-[10px] leading-relaxed text-amber-800">{t("passwordShownOnce")}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
