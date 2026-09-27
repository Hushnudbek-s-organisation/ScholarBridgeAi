"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { AnimatePresence, motion } from "framer-motion";
import { CheckCircle2, ExternalLink, Loader2, RotateCcw, Send, ShieldCheck } from "lucide-react";
import type { StudentProfile } from "../Navbar";

/**
 * "Get a code from the Telegram bot" flow, shared by sign-in and by
 * "connect Telegram" on the settings page.
 *
 *  1. press the button → a new tab opens t.me/<bot>?start=<token>
 *  2. press Start in Telegram → the bot sends a 6-digit code
 *  3. type the code here (auto-submits on the 6th digit)
 *
 * The browser keeps a secret nonce for the attempt, so a code is useless
 * anywhere else. Status is polled so the screen reacts the moment the bot
 * has sent the code.
 */

type Purpose = "login" | "link";
type Status = "idle" | "pending" | "code_sent" | "used" | "failed" | "locked" | "expired";

interface Attempt {
  id: number;
  nonce: string;
  deepLink: string;
  botUsername: string;
  expiresAt: string;
}

interface StatusBody {
  status: Status;
  failReason: string | null;
  telegram: { username: string | null; name: string } | null;
  codeExpiresAt: string | null;
}

const KNOWN_ERRORS = new Set([
  "wrong_code",
  "locked",
  "expired",
  "invalid_request",
  "code_not_sent",
  "login_disabled",
  "not_linked",
  "admin_blocked",
  "linked_elsewhere",
  "not_configured",
  "rate_limited",
  "bad_code_format",
  "forbidden",
]);

export function TelegramCodeFlow({
  purpose,
  botUsername,
  onLoggedIn,
  onLinked,
  compact = false,
}: {
  purpose: Purpose;
  botUsername?: string | null;
  onLoggedIn?: (profile: StudentProfile, isNew: boolean) => void;
  onLinked?: () => void;
  compact?: boolean;
}) {
  const t = useTranslations("telegram");
  const [attempt, setAttempt] = useState<Attempt | null>(null);
  const [status, setStatus] = useState<StatusBody | null>(null);
  const [starting, setStarting] = useState(false);
  const [code, setCode] = useState("");
  const [verifying, setVerifying] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [popupBlocked, setPopupBlocked] = useState(false);
  const [now, setNow] = useState(() => Date.now());
  const inputRef = useRef<HTMLInputElement>(null);
  const doneRef = useRef(false);

  const errorText = useCallback(
    (codeName: string | undefined, fallback: string, left?: number) => {
      if (codeName && KNOWN_ERRORS.has(codeName)) {
        return codeName === "wrong_code" ? t("errors.wrong_code", { left: left ?? 0 }) : t(`errors.${codeName}`);
      }
      return fallback || t("errors.generic");
    },
    [t]
  );

  // ---- start ---------------------------------------------------------------
  const start = async () => {
    setError(null);
    setPopupBlocked(false);
    setCode("");
    setStatus(null);
    doneRef.current = false;
    // Open the tab synchronously (inside the click) so popup blockers allow
    // it, then point it at the bot once the server has created the attempt.
    let win: Window | null = null;
    try {
      win = window.open("", "_blank");
    } catch {
      win = null;
    }
    setStarting(true);
    try {
      const res = await fetch("/api/auth/telegram/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ purpose }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        win?.close();
        setError(errorText(res.status === 429 ? "rate_limited" : body.code, body.error));
        return;
      }
      setAttempt(body as Attempt);
      setStatus({ status: "pending", failReason: null, telegram: null, codeExpiresAt: null });
      if (win) {
        try {
          win.opener = null;
          win.location.href = body.deepLink;
        } catch {
          setPopupBlocked(true);
        }
      } else {
        setPopupBlocked(true);
      }
    } catch {
      win?.close();
      setError(t("errors.network"));
    } finally {
      setStarting(false);
    }
  };

  const reset = () => {
    setAttempt(null);
    setStatus(null);
    setCode("");
    setError(null);
    setPopupBlocked(false);
  };

  // ---- poll status while waiting ------------------------------------------
  const live = !!attempt && (!status || status.status === "pending" || status.status === "code_sent");
  useEffect(() => {
    if (!attempt || !live) return;
    let stop = false;
    const tick = async () => {
      if (document.hidden) return;
      try {
        const res = await fetch("/api/auth/telegram/status", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id: attempt.id, nonce: attempt.nonce }),
          cache: "no-store",
        });
        if (!res.ok || stop) return;
        const body = (await res.json()) as StatusBody;
        setStatus((prev) => {
          if (prev?.status !== "code_sent" && body.status === "code_sent") {
            window.setTimeout(() => inputRef.current?.focus(), 50);
          }
          return body;
        });
        if (body.status === "failed" && body.failReason) setError(errorText(body.failReason, ""));
        if (body.status === "expired") setError(t("errors.expired"));
      } catch {
        // transient — next tick
      }
    };
    void tick();
    const id = window.setInterval(tick, 2500);
    return () => {
      stop = true;
      window.clearInterval(id);
    };
  }, [attempt, live, errorText, t]);

  // Countdown for the code's lifetime.
  useEffect(() => {
    if (status?.status !== "code_sent") return;
    const id = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, [status?.status]);

  // ---- verify --------------------------------------------------------------
  const verify = useCallback(
    async (value: string) => {
      if (!attempt || verifying || doneRef.current) return;
      if (!/^\d{6}$/.test(value)) {
        setError(t("errors.bad_code_format"));
        return;
      }
      setVerifying(true);
      setError(null);
      try {
        const res = await fetch("/api/auth/telegram/verify", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id: attempt.id, nonce: attempt.nonce, code: value }),
        });
        const body = await res.json().catch(() => ({}));
        if (!res.ok) {
          setError(errorText(res.status === 429 && !body.code ? "rate_limited" : body.code, body.error, body.attemptsLeft));
          if (body.code === "locked" || body.code === "expired") setStatus((s) => (s ? { ...s, status: body.code } : s));
          setCode("");
          inputRef.current?.focus();
          return;
        }
        doneRef.current = true;
        setStatus((s) => (s ? { ...s, status: "used" } : s));
        if (purpose === "login" && body.profile) onLoggedIn?.(body.profile as StudentProfile, Boolean(body.isNew));
        if (purpose === "link") onLinked?.();
      } catch {
        setError(t("errors.network"));
      } finally {
        setVerifying(false);
      }
    },
    [attempt, verifying, purpose, onLoggedIn, onLinked, errorText, t]
  );

  const onCodeChange = (raw: string) => {
    const digits = raw.replace(/\D/g, "").slice(0, 6);
    setCode(digits);
    if (error) setError(null);
    if (digits.length === 6) void verify(digits);
  };

  const bot = attempt?.botUsername || botUsername || "";
  const secondsLeft =
    status?.status === "code_sent" && status.codeExpiresAt
      ? Math.max(0, Math.round((new Date(status.codeExpiresAt).getTime() - now) / 1000))
      : null;
  const mmss = secondsLeft !== null ? `${Math.floor(secondsLeft / 60)}:${String(secondsLeft % 60).padStart(2, "0")}` : "";
  const finished = status?.status === "failed" || status?.status === "locked" || status?.status === "expired";
  const codeSent = status?.status === "code_sent";

  // ---- render --------------------------------------------------------------
  if (!attempt) {
    return (
      <div className={compact ? "space-y-3" : "space-y-4"}>
        <button
          type="button"
          onClick={start}
          disabled={starting}
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-sky-500 px-4 py-3 text-sm font-bold text-white shadow-sm transition-colors hover:bg-sky-600 disabled:opacity-60"
        >
          {starting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
          {starting ? t("starting") : purpose === "login" ? t("loginButton") : t("connectButton")}
        </button>
        <ol className="space-y-1.5 text-[12px] leading-relaxed text-slate-500">
          <li className="flex gap-2">
            <StepDot n={1} />
            <span>{t("howStep1")}</span>
          </li>
          <li className="flex gap-2">
            <StepDot n={2} />
            <span>{t("howStep2")}</span>
          </li>
          <li className="flex gap-2">
            <StepDot n={3} />
            <span>{t("howStep3")}</span>
          </li>
        </ol>
        {error && <ErrorBox text={error} />}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Step 1 — open the bot */}
      <div className={`rounded-xl border px-3 py-2.5 ${codeSent || status?.status === "used" ? "border-emerald-200 bg-emerald-50" : "border-sky-200 bg-sky-50"}`}>
        <div className="flex items-start gap-2.5">
          {codeSent || status?.status === "used" ? (
            <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
          ) : (
            <Loader2 className="mt-0.5 h-4 w-4 shrink-0 animate-spin text-sky-600" />
          )}
          <div className="min-w-0 flex-1">
            <p className="text-[12px] font-bold text-slate-800">
              {codeSent || status?.status === "used"
                ? t("codeSent", { name: status?.telegram?.username ? `@${status.telegram.username}` : status?.telegram?.name ?? "Telegram" })
                : t("waiting")}
            </p>
            {!codeSent && status?.status !== "used" && (
              <p className="mt-0.5 text-[11px] text-slate-500">{t("step1", { bot: `@${bot}` })}</p>
            )}
            {popupBlocked && !codeSent && <p className="mt-1 text-[11px] font-semibold text-amber-700">{t("popupBlocked")}</p>}
          </div>
        </div>
        {!codeSent && status?.status !== "used" && (
          <a
            href={attempt.deepLink}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-2 flex w-full items-center justify-center gap-1.5 rounded-lg bg-sky-500 px-3 py-2 text-xs font-bold text-white hover:bg-sky-600"
          >
            <ExternalLink className="h-3.5 w-3.5" /> {t("openBot", { bot: `@${bot}` })}
          </a>
        )}
      </div>

      {/* Step 2 — enter the code */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          void verify(code);
        }}
        className="space-y-2"
      >
        <label htmlFor={`tg-code-${purpose}`} className="block text-[11px] font-bold uppercase tracking-wide text-slate-500">
          {t("codeLabel")}
        </label>
        <input
          id={`tg-code-${purpose}`}
          ref={inputRef}
          value={code}
          onChange={(e) => onCodeChange(e.target.value)}
          inputMode="numeric"
          autoComplete="one-time-code"
          pattern="\d{6}"
          maxLength={7}
          placeholder="••••••"
          disabled={verifying || finished || status?.status === "used"}
          aria-describedby={`tg-code-hint-${purpose}`}
          className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-center font-mono text-2xl font-bold tracking-[0.5em] text-slate-900 placeholder:text-slate-300 focus:outline-none focus:ring-2 focus:ring-sky-500 disabled:opacity-60"
        />
        <p id={`tg-code-hint-${purpose}`} className="text-[11px] text-slate-500">
          {codeSent && mmss ? t("expiresIn", { time: mmss }) : t("step2")}
        </p>

        <AnimatePresence>{error && <ErrorBox key="err" text={error} />}</AnimatePresence>

        {status?.status === "used" ? (
          <div className="flex items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-xs font-bold text-white">
            <ShieldCheck className="h-4 w-4" /> {purpose === "login" ? t("signedIn") : t("linked")}
          </div>
        ) : finished ? (
          <button
            type="button"
            onClick={reset}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-slate-900 px-4 py-2.5 text-xs font-bold text-white hover:bg-slate-800"
          >
            <RotateCcw className="h-3.5 w-3.5" /> {t("restart")}
          </button>
        ) : (
          <div className="flex gap-2">
            <button
              type="submit"
              disabled={verifying || code.length !== 6}
              className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-sky-500 px-4 py-2.5 text-xs font-bold text-white hover:bg-sky-600 disabled:opacity-50"
            >
              {verifying ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <ShieldCheck className="h-3.5 w-3.5" />}
              {verifying ? t("verifying") : t("verify")}
            </button>
            <button
              type="button"
              onClick={reset}
              title={t("restart")}
              className="flex items-center justify-center gap-1 rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-xs font-bold text-slate-600 hover:bg-slate-50"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">{t("restart")}</span>
            </button>
          </div>
        )}
      </form>
    </div>
  );
}

function StepDot({ n }: { n: number }) {
  return (
    <span className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-sky-100 text-[9px] font-extrabold text-sky-700">
      {n}
    </span>
  );
}

function ErrorBox({ text }: { text: string }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: -4 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0 }}
      role="alert"
      className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-[11px] font-semibold text-red-700"
    >
      {text}
    </motion.div>
  );
}
