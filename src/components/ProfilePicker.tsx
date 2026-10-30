"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { ShieldCheck, X, LogIn, Loader2, Plus, Mail, Send, Eye, EyeOff } from "lucide-react";
import { StudentProfile } from "./Navbar";
import { TelegramCodeFlow } from "./telegram/TelegramCodeFlow";
import { isTelegramPlaceholderEmail } from "@/lib/telegram/placeholder";

interface ProfilePickerProps {
  open: boolean;
  /** Only the profiles THIS browser created / signed in with. */
  deviceProfiles: StudentProfile[];
  currentId: number | null;
  onClose: () => void;
  onSelect: (profile: StudentProfile) => void;
  onAddNew: () => void;
  /** Server-side hint (e.g. "sign in to open this account"). */
  notice?: string;
}

interface TelegramPublicConfig {
  configured: boolean;
  botUsername: string | null;
  loginEnabled: boolean;
}

/**
 * Sign-in window: accounts used on this device, then two ways in —
 * a code from the Telegram bot (no password) or email + password.
 * The Telegram tab only appears when an admin has connected the bot.
 */
export function ProfilePicker({ open, deviceProfiles, currentId, onClose, onSelect, onAddNew, notice }: ProfilePickerProps) {
  const t = useTranslations("picker");
  const tt = useTranslations("telegram");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [signInError, setSignInError] = useState("");
  const [signInBusy, setSignInBusy] = useState(false);
  // Show what was typed: a stray space or a Cyrillic keyboard layout makes a
  // correct password fail with no visible clue.
  const [showPassword, setShowPassword] = useState(false);
  const [tg, setTg] = useState<TelegramPublicConfig | null>(null);
  const [method, setMethod] = useState<"telegram" | "email" | null>(null);

  /**
   * Modal behaviour, the same as the navigation drawer: Escape closes it, the
   * page behind cannot scroll, focus moves INTO the dialog and Tab stays there,
   * and focus returns to the control that opened it. Without this a keyboard or
   * screen-reader user could tab into the page behind the overlay.
   */
  const dialogRef = useRef<HTMLDivElement | null>(null);
  const triggerRef = useRef<HTMLElement | null>(null);
  const close = useCallback(() => {
    setSignInError("");
    onClose();
  }, [onClose]);

  useEffect(() => {
    if (!open) return;
    triggerRef.current = document.activeElement as HTMLElement | null;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const node = dialogRef.current;
    const focusables = () =>
      [
        ...(node?.querySelectorAll<HTMLElement>(
          'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
        ) ?? []),
      ].filter((el) => el.offsetParent !== null);
    window.setTimeout(() => focusables()[0]?.focus(), 20);
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        close();
        return;
      }
      if (e.key !== "Tab") return;
      const list = focusables();
      if (list.length === 0) return;
      const first = list[0];
      const last = list[list.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };
    document.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prevOverflow;
      document.removeEventListener("keydown", onKey);
      triggerRef.current?.focus?.();
    };
  }, [open, close]);

  useEffect(() => {
    if (!open) return;
    let alive = true;
    fetch("/api/config/telegram", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then((data: TelegramPublicConfig | null) => {
        if (alive) setTg(data);
      })
      .catch(() => alive && setTg(null));
    return () => {
      alive = false;
    };
  }, [open]);

  const telegramOn = Boolean(tg?.loginEnabled && tg.botUsername);
  const active = method ?? (telegramOn ? "telegram" : "email");

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password.trim()) {
      setSignInError(t("bothRequired"));
      return;
    }
    setSignInBusy(true);
    setSignInError("");
    try {
      const res = await fetch("/api/auth/sign-in", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim(), password }),
      });
      const data = await res.json();
      if (!res.ok || !data.profile) {
        throw new Error(res.status === 401 ? t("wrongCredentials") : res.status === 429 ? t("tooMany") : data.error || t("failed"));
      }
      setSignInError("");
      onSelect(data.profile as StudentProfile);
    } catch (err: unknown) {
      setSignInError(err instanceof Error ? err.message : t("failed"));
    } finally {
      setSignInBusy(false);
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-slate-900/60 p-3 backdrop-blur-xs sm:p-4">
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="picker-title"
        className="my-6 w-full max-w-md overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-2xl dark:border-slate-700 dark:bg-slate-900"
      >
        {/* Header */}
        <div className="flex items-center justify-between bg-gradient-to-r from-indigo-700 via-violet-700 to-indigo-800 px-5 py-4 text-white sm:px-6 sm:py-5">
          <div>
            <h2 id="picker-title" className="text-lg font-extrabold">{t("title")}</h2>
            <p className="mt-0.5 text-xs text-indigo-100">{t("subtitle")}</p>
          </div>
          <button onClick={close} aria-label={t("close")} className="grid h-11 w-11 shrink-0 place-items-center rounded-lg text-white/80 hover:bg-white/10 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="max-h-[75vh] space-y-5 overflow-y-auto p-4 sm:p-5">
          {notice && (
            <div className="rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900">{notice}</div>
          )}

          {/* ===== Accounts used on THIS device ===== */}
          {deviceProfiles.length > 0 && (
            <div>
              <p className="mb-2 text-[10px] font-bold uppercase tracking-wide text-slate-400">
                {t("deviceAccounts", { count: deviceProfiles.length })}
              </p>
              <div className="space-y-2">
                {deviceProfiles.map((p) => {
                  const isCurrent = p.id === currentId;
                  const isAdmin = !!p.isAdmin;
                  const tgOnly = isTelegramPlaceholderEmail(p.email);
                  return (
                    <button
                      key={p.id}
                      onClick={() => onSelect(p)}
                      disabled={isCurrent}
                      className={`flex min-h-16 w-full items-center gap-3 rounded-2xl border px-4 py-3 text-left transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 ${
                        isCurrent ? "cursor-default border-indigo-300 bg-indigo-50" : "border-slate-200 bg-white hover:border-indigo-300 hover:bg-indigo-50"
                      }`}
                    >
                      <div
                        className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-sm font-extrabold ${
                          isAdmin ? "bg-slate-900 text-amber-300" : "bg-indigo-100 text-indigo-600"
                        }`}
                      >
                        {p.name
                          .split(" ")
                          .map((n) => n[0])
                          .slice(0, 2)
                          .join("")
                          .toUpperCase()}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5">
                          <span className="min-w-0 break-words text-sm font-bold text-slate-800">{p.name}</span>
                          {isAdmin && (
                            <span className="inline-flex shrink-0 items-center gap-0.5 rounded-full bg-slate-900 px-1.5 py-0.5 text-[9px] font-bold text-white">
                              <ShieldCheck className="h-2.5 w-2.5 text-amber-300" /> ADMIN
                            </span>
                          )}
                        </div>
                        <p className="break-all text-[11px] text-slate-400">{tgOnly ? t("telegramAccount") : p.email}</p>
                      </div>
                      {isCurrent && <span className="shrink-0 text-[10px] font-bold text-indigo-600">{t("active")}</span>}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* ===== Ways to sign in ===== */}
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3 sm:p-4">
            {telegramOn && (
              <div role="tablist" aria-label={t("methodLabel")} className="mb-4 grid grid-cols-2 gap-1 rounded-xl bg-white p-1 shadow-xs">
                {(
                  [
                    { id: "telegram", label: t("tabTelegram"), icon: Send },
                    { id: "email", label: t("tabEmail"), icon: Mail },
                  ] as const
                ).map(({ id, label, icon: Icon }) => (
                  <button
                    key={id}
                    role="tab"
                    aria-selected={active === id}
                    onClick={() => setMethod(id)}
                    className={`flex min-h-11 items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-xs font-bold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 ${
                      active === id ? (id === "telegram" ? "bg-sky-500 text-white sb-ink-on-bright" : "bg-indigo-600 text-white") : "text-slate-500 hover:bg-slate-100"
                    }`}
                  >
                    <Icon className="h-3.5 w-3.5" /> {label}
                  </button>
                ))}
              </div>
            )}

            {active === "telegram" && telegramOn ? (
              <div>
                <p className="text-sm font-extrabold text-slate-800">{tt("loginTitle")}</p>
                <p className="mb-3 mt-0.5 text-[12px] text-slate-500">{tt("loginSubtitle")}</p>
                <TelegramCodeFlow purpose="login" botUsername={tg?.botUsername} onLoggedIn={(p) => onSelect(p)} />
                <p className="mt-3 text-[11px] leading-relaxed text-slate-400">{tt("loginLinkedOnly")}</p>
              </div>
            ) : (
              <div>
                <div className="mb-1 flex items-center gap-2">
                  <LogIn className="h-3.5 w-3.5 text-indigo-500" />
                  <p className="text-sm font-extrabold text-slate-800">{t("emailTitle")}</p>
                </div>
                <p className="mb-3 text-[12px] text-slate-500">{t("emailHint")}</p>
                <form onSubmit={handleSignIn} className="space-y-2.5">
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder={t("email")}
                    aria-label={t("email")}
                    className="w-full min-h-11 rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    autoComplete="email"
                    autoCapitalize="off"
                    autoCorrect="off"
                    spellCheck={false}
                    onBlur={() => setEmail((value) => value.trim().toLowerCase())}
                    required
                  />
                  <div className="relative">
                    <input
                      type={showPassword ? "text" : "password"}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder={t("password")}
                      aria-label={t("password")}
                      className="w-full min-h-11 rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 pr-12 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      autoComplete="current-password"
                      autoCapitalize="off"
                      autoCorrect="off"
                      spellCheck={false}
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((v) => !v)}
                      aria-label={showPassword ? t("hidePassword") : t("showPassword")}
                      aria-pressed={showPassword}
                      className="absolute inset-y-0 right-0 flex w-11 items-center justify-center text-slate-400 hover:text-slate-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" aria-hidden /> : <Eye className="h-4 w-4" aria-hidden />}
                    </button>
                  </div>
                  {signInError && (
                    <div role="alert" className="space-y-1.5 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-[11px] font-semibold text-red-700">
                      <p>{signInError}</p>
                      {/* The two realistic reasons an otherwise-correct pair
                          fails: the account was created elsewhere (the
                          desktop app keeps its own database), or it never
                          completed. Both are fixed by creating it here. */}
                      <p className="font-medium text-red-600/90">{t("noAccountHint")}</p>
                      <button
                        type="button"
                        onClick={onAddNew}
                        className="min-h-9 w-full rounded-lg border border-red-300 bg-white px-2 py-1.5 text-[11px] font-bold text-red-700 hover:bg-red-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-400"
                      >
                        {t("createWithThisEmail")}
                      </button>
                    </div>
                  )}
                  <button
                    type="submit"
                    disabled={signInBusy}
                    className="flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-xs font-bold text-white transition-colors hover:bg-indigo-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2 disabled:opacity-60"
                  >
                    {signInBusy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <LogIn className="h-3.5 w-3.5" />}
                    {signInBusy ? t("signingIn") : t("signIn")}
                  </button>
                </form>
              </div>
            )}
          </div>

          <button
            onClick={onAddNew}
            className="flex min-h-11 w-full items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-indigo-200 px-4 py-2.5 text-xs font-bold text-indigo-600 transition-colors hover:bg-indigo-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
          >
            <Plus className="h-3.5 w-3.5" /> {t("createAccount")}
          </button>
        </div>
      </div>
    </div>
  );
}
