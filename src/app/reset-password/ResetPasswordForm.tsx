"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { AlertCircle, CheckCircle2, KeyRound, Loader2, ShieldCheck } from "lucide-react";
import { MIN_PASSWORD_LENGTH } from "@/lib/passwordPolicy";

/**
 * The second half of password reset: spend the emailed token.
 *
 * The token arrives in the URL, so this form never posts anything but the token
 * and the new password — no email is echoed back, and the server decides
 * whether the link is valid, expired or already used. The three failure states
 * get their own sentence because the person legitimately holds the link and
 * needs to know whether to wait or to ask for a new one.
 */
export function ResetPasswordForm() {
  const t = useTranslations("passwordReset");
  const params = useSearchParams();
  const token = useMemo(() => (params.get("token") ?? "").trim(), [params]);

  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState("");
  const [serverProblem, setServerProblem] = useState<"invalid" | "expired" | "used" | null>(null);

  // A link with no token at all (a mail client that truncated the query string)
  // is known before any round trip, so it is derived, not stored — no effect,
  // and no flash of a form that cannot work.
  const linkProblem: "missing" | "invalid" | "expired" | "used" | null = token ? serverProblem : "missing";

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirm) {
      setError(t("mismatch"));
      return;
    }
    if (password.length < MIN_PASSWORD_LENGTH) {
      setError(t("weak"));
      return;
    }
    setBusy(true);
    setError("");
    try {
      const res = await fetch("/api/auth/password-reset/confirm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password, passwordConfirm: confirm }),
      });
      const data = (await res.json().catch(() => ({}))) as { code?: string; error?: string };
      if (res.ok) {
        setDone(true);
        return;
      }
      if (res.status === 429) {
        setError(t("rateLimited"));
        return;
      }
      if (data.code === "token_expired") {
        setServerProblem("expired");
        return;
      }
      if (data.code === "token_used") {
        setServerProblem("used");
        return;
      }
      if (data.code === "invalid_token") {
        setServerProblem("invalid");
        return;
      }
      if (data.code === "password_mismatch") {
        setError(t("mismatch"));
        return;
      }
      if (data.code === "weak_password") {
        setError(t("weak"));
        return;
      }
      setError(t("resetFailed"));
    } catch {
      setError(t("resetFailed"));
    } finally {
      setBusy(false);
    }
  };

  if (done) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs sm:p-8">
        <div className="flex items-start gap-3">
          <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-emerald-50 text-emerald-600">
            <CheckCircle2 className="h-5 w-5" aria-hidden />
          </span>
          <div>
            <h2 className="text-lg font-extrabold text-slate-900">{t("doneTitle")}</h2>
            <p className="mt-2 text-sm leading-relaxed text-slate-700">{t("doneBody")}</p>
          </div>
        </div>
        <Link
          href="/"
          className="mt-6 inline-flex min-h-11 w-full items-center justify-center gap-1.5 rounded-xl bg-indigo-600 px-4 text-sm font-bold text-white hover:bg-indigo-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2"
        >
          <KeyRound className="h-4 w-4" aria-hidden />
          {t("doneAction")}
        </Link>
      </div>
    );
  }

  if (linkProblem) {
    const message =
      linkProblem === "missing"
        ? t("missingTokenBody")
        : linkProblem === "expired"
          ? t("expiredLink")
          : linkProblem === "used"
            ? t("usedLink")
            : t("invalidLink");
    return (
      <div className="rounded-2xl border border-amber-200 bg-amber-50 p-6 shadow-xs sm:p-8">
        <div className="flex items-start gap-3">
          <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-amber-100 text-amber-700">
            <AlertCircle className="h-5 w-5" aria-hidden />
          </span>
          <div>
            <h2 className="text-lg font-extrabold text-amber-900">
              {linkProblem === "missing" ? t("missingTokenTitle") : t("linkProblemTitle")}
            </h2>
            <p className="mt-2 text-sm leading-relaxed text-amber-900">{message}</p>
          </div>
        </div>
        <div className="mt-6 flex flex-col gap-2 sm:flex-row">
          <Link
            href="/forgot-password"
            className="inline-flex min-h-11 items-center justify-center rounded-xl bg-indigo-600 px-4 text-sm font-bold text-white hover:bg-indigo-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2"
          >
            {t("requestNewLink")}
          </Link>
          <Link
            href="/"
            className="inline-flex min-h-11 items-center justify-center rounded-xl border border-amber-300 bg-white px-4 text-sm font-semibold text-amber-900 hover:bg-amber-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
          >
            {t("backToSignIn")}
          </Link>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs sm:p-8">
      <label htmlFor="reset-password" className="block text-sm font-bold text-slate-800">
        {t("newPassword")}
      </label>
      <input
        id="reset-password"
        type="password"
        required
        minLength={MIN_PASSWORD_LENGTH}
        autoComplete="new-password"
        value={password}
        onChange={(e) => {
          setPassword(e.target.value);
          if (error) setError("");
        }}
        className="mt-2 w-full min-h-11 rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
      />

      <label htmlFor="reset-password-confirm" className="mt-4 block text-sm font-bold text-slate-800">
        {t("confirmPassword")}
      </label>
      <input
        id="reset-password-confirm"
        type="password"
        required
        minLength={MIN_PASSWORD_LENGTH}
        autoComplete="new-password"
        value={confirm}
        onChange={(e) => {
          setConfirm(e.target.value);
          if (error) setError("");
        }}
        className="mt-2 w-full min-h-11 rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
      />

      <p className="mt-2 text-xs text-slate-500">{t("passwordHint")}</p>

      {error && (
        <div
          role="alert"
          className="mt-3 flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs font-semibold text-red-700"
        >
          <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden />
          <span>{error}</span>
        </div>
      )}

      <button
        type="submit"
        disabled={busy}
        className="mt-4 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 text-sm font-bold text-white hover:bg-indigo-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2 disabled:opacity-60"
      >
        {busy ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : <ShieldCheck className="h-4 w-4" aria-hidden />}
        {busy ? t("updating") : t("updatePassword")}
      </button>

      <p className="mt-4 text-center text-xs text-slate-500">
        <Link href="/forgot-password" className="font-semibold text-indigo-700 hover:text-indigo-900">
          {t("requestNewLink")}
        </Link>
      </p>
    </form>
  );
}
