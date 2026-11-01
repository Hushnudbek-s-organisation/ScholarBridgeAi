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
 * stolen admin cookie alone cannot take over a student account. That field asks
 * for the password of the account that is SIGNED IN, so the panel names it, says
 * when that password was last set, and never answers a failure with a bare
 * "incorrect password": a missing password, an unverifiable old hash, a rate
 * limit and a genuine typo need four different next steps.
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

interface Viewer {
  id: number;
  name: string;
  email: string;
  hasPassword: boolean;
  passwordChangedAt: string | null;
  passwordFormat: "none" | "verifiable" | "legacy";
}

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

/** Keeps the server's machine-readable code attached to the failure. */
class ApiError extends Error {
  code: string;
  constructor(message: string, code?: unknown) {
    super(message);
    this.code = typeof code === "string" ? code : "";
  }
}

interface AccountsManagerProps {
  /** Opens the profile editor, where a signed-in account sets a new password. */
  onOpenProfileEditor?: () => void;
}

export function AccountsManager({ onOpenProfileEditor }: AccountsManagerProps = {}) {
  const t = useTranslations("adminAccounts");
  const [q, setQ] = useState("");
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [viewer, setViewer] = useState<Viewer | null>(null);
  /** The failure code, so the panel can say what to DO rather than echo a server string. */
  const [errorCode, setErrorCode] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Account | null>(null);
  const [adminPassword, setAdminPassword] = useState("");
  const [typedPassword, setTypedPassword] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [result, setResult] = useState<Result>(null);
  const [copied, setCopied] = useState(false);
  /**
   * "I cannot reproduce my own password" — the operator's own recovery.
   *
   * Every action on this screen re-authenticates the operator, which is the
   * guard that makes a stolen cookie harmless. It is useless to an operator who
   * has forgotten their own password, so the way to replace it lives HERE, not
   * three clicks away in the profile editor.
   */
  const [selfOpen, setSelfOpen] = useState(false);
  const [selfPw, setSelfPw] = useState("");
  const [selfPw2, setSelfPw2] = useState("");
  const [selfBusy, setSelfBusy] = useState(false);
  const [selfDone, setSelfDone] = useState("");
  const [selfError, setSelfError] = useState("");

  const load = useCallback(async (needle: string) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/accounts?q=${encodeURIComponent(needle)}`, { cache: "no-store" });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new ApiError(json.error || `HTTP ${res.status}`, json.code);
      setAccounts(Array.isArray(json.accounts) ? (json.accounts as Account[]) : []);
      if (json.viewer && typeof json.viewer === "object") setViewer(json.viewer as Viewer);
      setError("");
      setErrorCode("");
    } catch (err) {
      setError(t("loadFailed"));
      setErrorCode("");
    } finally {
      setLoading(false);
    }
  }, [t]);

  // Debounced search: typing an email should not fire one request per keystroke.
  useEffect(() => {
    const id = setTimeout(() => void load(q.trim()), 250);
    return () => clearTimeout(id);
  }, [q, load]);

  /**
   * Coming back from the profile editor is the one moment the panel's idea of
   * the signed-in account is out of date: the operator may have just set the
   * password this screen keeps asking for. Refresh on focus, not on a timer.
   */
  useEffect(() => {
    const onFocus = () => void load(q.trim());
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
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
    if (!res.ok) throw new ApiError(json.error || `HTTP ${res.status}`, json.code);
    return json as Record<string, unknown>;
  };

  /**
   * Turn a failure code into the next step, in the operator's language.
   *
   * "Incorrect password." is only true for ONE of these. A bare server string for
   * all of them is how an operator ends up retyping the same wrong password
   * forever while the real problem is that the account has no password at all.
   */
  const messageFor = useCallback(
    (err: unknown) => {
      const code = err instanceof ApiError ? err.code : "";
      const who = viewer?.email ?? "";
      switch (code) {
        case "invalid_password":
          return t("errInvalidPassword", { email: who });
        case "password_not_set":
          return t("errPasswordNotSet");
        case "password_format_legacy":
          return t("errPasswordFormatLegacy");
        case "rate_limited":
          return t("errRateLimited");
        case "app_url_missing":
          return t("errAppUrlMissing");
        case "self_target":
          return t("errSelfTarget");
        case "weak_password":
          return t("errWeakPassword");
        case "ambiguous_request":
          return t("errAmbiguousRequest");
        case "not_found":
          return t("errNotFound");
        default:
          return err instanceof Error && err.message ? err.message : t("failed");
      }
    },
    [t, viewer]
  );

  const createLink = async () => {
    if (!selected) return;
    setBusy("link");
    setError("");
    setErrorCode("");
    setResult(null);
    try {
      const json = await post(`/api/admin/accounts/${selected.id}/reset-link`, { adminPassword });
      setResult({ kind: "link", link: String(json.link), expiresAt: String(json.expiresAt) });
      setAdminPassword("");
      await load(q.trim());
    } catch (err) {
      setErrorCode(err instanceof ApiError ? err.code : "");
      setError(messageFor(err));
    } finally {
      setBusy(null);
    }
  };

  const setPassword = async (generate: boolean) => {
    if (!selected) return;
    setBusy(generate ? "generate" : "set");
    setError("");
    setErrorCode("");
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
      setErrorCode(err instanceof ApiError ? err.code : "");
      setError(messageFor(err));
    } finally {
      setBusy(null);
    }
  };

  /**
   * Replace the signed-in admin's own password.
   *
   * No old password is asked for: the session IS the proof, exactly as in the
   * profile editor. What the route adds is the clean-up — every other device is
   * signed out, this browser gets a fresh session, and the new date is stamped
   * so the panel can show it. `generate` asks the server for a readable
   * password instead of making the operator invent one.
   */
  const changeOwnPassword = async (generate: boolean) => {
    setSelfBusy(true);
    setSelfError("");
    setSelfDone("");
    try {
      const json = await post("/api/admin/accounts/me/password", {
        ...(generate ? { generate: true } : { password: selfPw, confirmPassword: selfPw2 }),
      });
      const shown = String(json.temporaryPassword ?? selfPw);
      // Carry it straight into the confirmation field above: the operator has
      // just proved the password, and asking them to retype it is the same dead
      // end this card exists to remove.
      setAdminPassword(shown);
      setSelfDone(shown);
      setSelfPw("");
      setSelfPw2("");
      setSelfOpen(false);
      setError("");
      setErrorCode("");
      await load(q.trim());
    } catch (err) {
      const code = err instanceof ApiError ? err.code : "";
      setSelfError(
        code === "weak_password"
          ? t("selfErrWeak")
          : code === "confirm_mismatch"
            ? t("selfErrMismatch")
            : code === "confirm_required"
              ? t("selfErrConfirm")
              : code === "rate_limited"
                ? t("errRateLimited")
                : err instanceof Error && err.message
                  ? err.message
                  : t("failed")
      );
    } finally {
      setSelfBusy(false);
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

  /**
   * Why the confirmation field cannot be satisfied right now — or "" when it can.
   * Each case needs a different sentence AND the same way out (set a new password).
   */
  const ownPasswordProblem =
    viewer?.passwordFormat === "legacy"
      ? "legacy"
      : viewer?.passwordFormat === "none"
        ? "none"
        : errorCode === "invalid_password"
          ? "mismatch"
          : "";

  // A wrong password is explained directly under the field it belongs to; the
  // red banner at the top would be the same sentence twice, twice as far away.
  const showErrorBanner = Boolean(error) && !(errorCode === "invalid_password" && viewer);

  return (
    <div className="space-y-4">
      {/* Why there is no "show password" button — said once, in place. */}
      <div className="flex items-start gap-2 rounded-2xl border border-sky-200 bg-sky-50 p-3 text-[11px] leading-relaxed text-sky-900">
        <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-sky-600" />
        <p>{t("whyNoPassword")}</p>
      </div>

      {/* The operator's own way out: replace the password they cannot recall. */}
      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="text-xs font-bold text-slate-800">{t("selfTitle")}</p>
            <p className="mt-0.5 text-[11px] leading-relaxed text-slate-600">
              {viewer ? t("selfBody", { email: viewer.email }) : t("selfBodyNoViewer")}
            </p>
          </div>
          <button
            type="button"
            onClick={() => {
              setSelfOpen((open) => !open);
              setSelfError("");
            }}
            className={selfOpen ? btnLight : btnDark}
            aria-expanded={selfOpen}
          >
            <KeyRound className="h-3.5 w-3.5" />
            {selfOpen ? t("selfCancel") : t("selfOpen")}
          </button>
        </div>

        {selfDone && (
          <div className="mt-3 rounded-xl border border-emerald-200 bg-emerald-50 p-3">
            <p className="text-[11px] font-bold text-emerald-900">{t("selfDoneTitle")}</p>
            <div className="mt-1.5 flex items-start gap-2">
              <code className="min-w-0 flex-1 break-all rounded-lg bg-white px-2 py-1.5 text-xs font-bold tracking-wide text-slate-800">
                {selfDone}
              </code>
              <button type="button" onClick={() => void copy(selfDone)} className={btnLight}>
                {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                {copied ? t("copied") : t("copy")}
              </button>
            </div>
            <p className="mt-1.5 text-[10px] leading-relaxed text-emerald-800">{t("selfDoneBody")}</p>
          </div>
        )}

        {selfOpen && (
          <div className="mt-3 space-y-2 rounded-xl border border-slate-200 bg-slate-50/60 p-3">
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              <input
                type="password"
                autoComplete="new-password"
                value={selfPw}
                onChange={(e) => setSelfPw(e.target.value)}
                placeholder={t("selfNewPlaceholder")}
                aria-label={t("selfNewPlaceholder")}
                className={inputCls}
              />
              <input
                type="password"
                autoComplete="new-password"
                value={selfPw2}
                onChange={(e) => setSelfPw2(e.target.value)}
                placeholder={t("selfConfirmPlaceholder")}
                aria-label={t("selfConfirmPlaceholder")}
                className={inputCls}
              />
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                disabled={selfBusy || selfPw.length < 8 || selfPw !== selfPw2}
                onClick={() => void changeOwnPassword(false)}
                className={btnDark}
              >
                {selfBusy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <ShieldCheck className="h-3.5 w-3.5" />}
                {t("selfSave")}
              </button>
              <button
                type="button"
                disabled={selfBusy}
                onClick={() => void changeOwnPassword(true)}
                className={btnLight}
              >
                {selfBusy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <KeyRound className="h-3.5 w-3.5" />}
                {t("selfGenerate")}
              </button>
              <span className="text-[10px] text-slate-500">{t("selfPolicy")}</span>
            </div>
            {selfError && (
              <p role="alert" className="text-[11px] font-semibold text-red-700">
                {selfError}
              </p>
            )}
          </div>
        )}
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
        {showErrorBanner && (
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
                    setErrorCode("");
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
            {/* WHOSE password this is. The field is useless until it says so. */}
            <p className="mt-1 text-[10px] leading-relaxed text-slate-500">
              {viewer
                ? t("yourPasswordWhose", { email: viewer.email, when: when(viewer.passwordChangedAt) })
                : t("yourPasswordHint")}
            </p>
            {ownPasswordProblem && (
              <div className="mt-2 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-[11px] leading-relaxed text-amber-900">
                <p className="font-bold">
                  {ownPasswordProblem === "legacy"
                    ? t("viewerLegacyTitle")
                    : ownPasswordProblem === "none"
                      ? t("viewerNoPasswordTitle")
                      : t("reauthMismatchTitle")}
                </p>
                <p className="mt-0.5">
                  {ownPasswordProblem === "legacy"
                    ? t("viewerLegacyBody")
                    : ownPasswordProblem === "none"
                      ? t("viewerNoPasswordBody")
                      : t("reauthMismatchBody", { email: viewer?.email ?? "" })}
                </p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {/* The fix belongs where the failure happened, not two screens away. */}
                  <button
                    type="button"
                    onClick={() => {
                      setSelfOpen(true);
                      setSelfError("");
                    }}
                    className={btnDark}
                  >
                    <KeyRound className="h-3.5 w-3.5" />
                    {t("selfOpen")}
                  </button>
                  {onOpenProfileEditor && (
                    <button type="button" onClick={onOpenProfileEditor} className={btnLight}>
                      <UserRound className="h-3.5 w-3.5" />
                      {t("openProfile")}
                    </button>
                  )}
                </div>
              </div>
            )}
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
