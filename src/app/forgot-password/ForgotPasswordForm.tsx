"use client";

import { useState } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { AlertCircle, ArrowLeft, CheckCircle2, Loader2, Mail, Send } from "lucide-react";
import { useLocaleContext } from "@/i18n/LocaleProvider";
import { Button } from "@/components/ui/Button";

/**
 * The "email me a link" half of password reset.
 *
 * The success panel is deliberately identical whether or not the address has an
 * account: the server answers one generic sentence, and the UI must not undo
 * that with a friendlier message for the happy path — otherwise the page itself
 * becomes the enumeration oracle the endpoint refuses to be.
 */
export function ForgotPasswordForm() {
  const t = useTranslations("passwordReset");
  const { locale } = useLocaleContext();
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const address = email.trim();
    if (!address) return;
    setBusy(true);
    setError("");
    try {
      const res = await fetch("/api/auth/password-reset/request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: address, locale }),
      });
      if (res.status === 429) {
        setError(t("rateLimited"));
        return;
      }
      if (res.status === 400) {
        setError(t("invalidEmail"));
        return;
      }
      if (!res.ok) {
        setError(t("requestFailed"));
        return;
      }
      setSent(true);
    } catch {
      setError(t("requestFailed"));
    } finally {
      setBusy(false);
    }
  };

  if (sent) {
    return (
      <div className="rounded-overlay border border-slate-200 bg-white p-6 shadow-xs sm:p-8">
        <div className="flex items-start gap-3">
          <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-emerald-50 text-emerald-600">
            <CheckCircle2 className="h-5 w-5" aria-hidden />
          </span>
          <div>
            <h2 className="text-lg font-extrabold text-slate-900">{t("sentTitle")}</h2>
            <p className="mt-2 text-sm leading-relaxed text-slate-700">{t("sentBody")}</p>
            <p className="mt-2 text-sm leading-relaxed text-slate-500">{t("sentSpamNote")}</p>
          </div>
        </div>
        <div className="mt-6 flex flex-col gap-2 sm:flex-row">
          <Button variant="unstyled"
            type="button"
            onClick={() => {
              setSent(false);
              setError("");
            }}
            className="inline-flex min-h-11 items-center justify-center rounded-surface border border-slate-300 bg-white px-4 text-sm font-semibold text-slate-700 hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
          >
            {t("tryAnother")}
          </Button>
          <Link
            href="/"
            className="inline-flex min-h-11 items-center justify-center gap-1.5 rounded-surface bg-indigo-600 px-4 text-sm font-bold text-white hover:bg-indigo-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2"
          >
            <ArrowLeft className="h-4 w-4" aria-hidden />
            {t("backToSignIn")}
          </Link>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="rounded-overlay border border-slate-200 bg-white p-6 shadow-xs sm:p-8">
      <label htmlFor="forgot-email" className="block text-sm font-bold text-slate-800">
        {t("emailLabel")}
      </label>
      <div className="relative mt-2">
        <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" aria-hidden />
        <input
          id="forgot-email"
          type="email"
          required
          autoComplete="email"
          inputMode="email"
          value={email}
          onChange={(e) => {
            setEmail(e.target.value);
            if (error) setError("");
          }}
          placeholder={t("emailPlaceholder")}
          className="w-full min-h-11 rounded-surface border border-slate-300 bg-white py-2.5 pl-9 pr-3 text-sm text-slate-900 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
        />
      </div>

      {error && (
        <div
          role="alert"
          className="mt-3 flex items-start gap-2 rounded-surface border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-semibold text-rose-700"
        >
          <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden />
          <span>{error}</span>
        </div>
      )}

      <Button variant="unstyled"
        type="submit"
        disabled={busy || !email.trim()}
        className="mt-4 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-surface bg-indigo-600 px-4 text-sm font-bold text-white hover:bg-indigo-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2 disabled:opacity-60"
      >
        {busy ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : <Send className="h-4 w-4" aria-hidden />}
        {busy ? t("sending") : t("sendLink")}
      </Button>

      <p className="mt-4 text-center text-sm text-slate-500">
        <Link href="/" className="font-semibold text-indigo-700 hover:text-indigo-900">
          {t("backToSignIn")}
        </Link>
      </p>
    </form>
  );
}
