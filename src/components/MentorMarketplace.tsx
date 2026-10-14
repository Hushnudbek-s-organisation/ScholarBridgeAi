"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { BadgeCheck, HeartHandshake, Info, Loader2, Minus, Plus, Search, Send, ShieldAlert, Sparkles } from "lucide-react";
import { StudentProfile } from "./Navbar";

interface MentorMessage {
  key: string;
  values?: Record<string, string | number>;
}

interface MentorMatch {
  id: number;
  displayName: string;
  headline?: string | null;
  country?: string | null;
  university?: string | null;
  program?: string | null;
  scholarshipName?: string | null;
  hourlyRateUsd?: number | null;
  freeSessions?: boolean | null;
  ratingAverage?: number | null;
  ratingCount?: number | null;
  score: number;
  reasons: string[];
  gaps: string[];
  reasonMessages: MentorMessage[];
  gapMessages: MentorMessage[];
  verified: boolean;
  price: "free" | "paid" | "unknown";
}

interface MentorResult {
  matches: MentorMatch[];
  filtered: { inactive: number; overBudget: number };
  note: string;
  noteMessage: MentorMessage;
}

export function MentorMarketplace({ activeProfile }: { activeProfile: StudentProfile | null }) {
  const t = useTranslations("mentorMarketplace");
  const locale = useLocale();
  const [data, setData] = useState<MentorResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadFailed, setLoadFailed] = useState(false);
  const [maxRate, setMaxRate] = useState("");
  const [openId, setOpenId] = useState<number | null>(null);
  const [topic, setTopic] = useState("");
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState<number[]>([]);
  const [requestError, setRequestError] = useState("");
  const requestSequence = useRef(0);
  const profileId = activeProfile?.id;

  const text = (key: string, values?: Record<string, string | number>) => t(key as never, values as never);
  const translateMessage = (message: MentorMessage | undefined) =>
    message ? text(message.key, message.values) : t("explanationUnavailable");

  const load = useCallback(async () => {
    const sequence = ++requestSequence.current;
    if (!profileId) {
      setData(null);
      setLoadFailed(false);
      setLoading(false);
      return;
    }
    setLoading(true);
    setLoadFailed(false);
    setData(null);
    try {
      const params = new URLSearchParams({ profileId: String(profileId) });
      if (maxRate !== "") params.set("maxRate", maxRate);
      const res = await fetch(`/api/mentors?${params.toString()}`, { credentials: "include" });
      const json = await res.json();
      if (!res.ok || !Array.isArray(json.matches)) throw new Error("mentor-load");
      if (requestSequence.current === sequence) setData(json as MentorResult);
    } catch {
      if (requestSequence.current === sequence) setLoadFailed(true);
    } finally {
      if (requestSequence.current === sequence) setLoading(false);
    }
  }, [profileId, maxRate]);

  useEffect(() => {
    const timer = window.setTimeout(() => { void load(); }, 0);
    return () => {
      window.clearTimeout(timer);
      requestSequence.current += 1;
    };
  }, [load]);

  const request = async (mentorId: number) => {
    if (!activeProfile?.id || !topic.trim()) return;
    setSending(true);
    setRequestError("");
    try {
      const res = await fetch("/api/mentors", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ profileId: activeProfile.id, mentorId, topic: topic.trim(), message }),
      });
      if (!res.ok) {
        setRequestError(res.status === 409 ? t("requestAlreadyPending") : t("requestError"));
        return;
      }
      setSent((current) => current.includes(mentorId) ? current : [...current, mentorId]);
      setOpenId(null);
      setTopic("");
      setMessage("");
    } catch {
      setRequestError(t("requestError"));
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs sm:p-6">
        <div className="flex items-start gap-3">
          <HeartHandshake className="mt-0.5 h-5 w-5 shrink-0 text-indigo-700" aria-hidden="true" />
          <div className="min-w-0">
            <h2 className="text-lg font-semibold text-slate-900">{t("title")}</h2>
            <p className="mt-1 max-w-3xl break-words text-sm text-slate-700">{t("intro")}</p>
            <p className="mt-1 max-w-3xl break-words text-xs text-slate-600">{t("pathScoreNote")}</p>
          </div>
        </div>

        <div className="mt-4 flex flex-col items-stretch gap-3 sm:flex-row sm:flex-wrap sm:items-end">
          <label className="min-w-0 text-xs sm:w-48">
            <span className="mb-1 block font-medium text-slate-700">{t("maxRate")}</span>
            <input
              type="number"
              inputMode="decimal"
              min={0}
              step="any"
              value={maxRate}
              onChange={(e) => setMaxRate(e.target.value)}
              placeholder={t("anyRate")}
              className="min-h-11 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 outline-none focus:border-indigo-600 focus:ring-2 focus:ring-indigo-600"
            />
          </label>
          <button
            type="button"
            onClick={() => void load()}
            disabled={!activeProfile}
            className="inline-flex min-h-11 w-full items-center justify-center gap-1.5 rounded-lg bg-slate-900 px-3 py-2 text-sm font-semibold text-white hover:bg-slate-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-900 disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
          >
            <Search className="h-4 w-4" aria-hidden="true" /> {t("search")}
          </button>
          {maxRate !== "" && (
            <p className="break-words text-xs text-slate-700 sm:flex-1">{t("freeVisible")}</p>
          )}
        </div>

        {data && data.matches.length > 0 && (
          <p className="mt-3 break-words rounded-lg bg-slate-50 p-3 text-sm text-slate-700" role="status">
            {translateMessage(data.noteMessage)}
          </p>
        )}
      </div>

      {!activeProfile ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-6 text-sm text-slate-700">{t("noProfile")}</div>
      ) : loading ? (
        <div className="flex items-center gap-2 text-sm text-slate-700" role="status" aria-live="polite">
          <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> {t("loading")}
        </div>
      ) : loadFailed ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-6 text-sm text-slate-700">{t("loadError")}</div>
      ) : data && data.matches.length === 0 ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-6 text-sm text-slate-700">{t("noMatches")}</div>
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          {data?.matches.map((m) => {
            const isOpen = openId === m.id;
            const alreadySent = sent.includes(m.id);
            const rate = m.hourlyRateUsd == null ? null : Number(m.hourlyRateUsd);
            const price = m.price === "free"
              ? t("free")
              : m.price === "paid" && rate !== null
                ? t("hourlyRate", { amount: rate.toLocaleString(locale, { maximumFractionDigits: 2 }) })
                : t("unknownRate");
            return (
              <article
                key={m.id}
                className="min-w-0 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition hover:border-indigo-200 sm:p-5"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="break-words text-base font-semibold text-slate-900">{m.displayName}</span>
                      {m.verified ? (
                        <span className="inline-flex min-h-7 items-center gap-1 rounded-full bg-emerald-50 px-2 text-xs font-medium text-emerald-800">
                          <BadgeCheck className="h-3.5 w-3.5" aria-hidden="true" /> {t("verified")}
                        </span>
                      ) : (
                        <span className="inline-flex min-h-7 items-center gap-1 rounded-full bg-amber-50 px-2 text-xs font-medium text-amber-900">
                          <ShieldAlert className="h-3.5 w-3.5" aria-hidden="true" /> {t("notVerified")}
                        </span>
                      )}
                    </div>
                    {m.headline && <p className="mt-0.5 break-words text-sm text-slate-700">{m.headline}</p>}
                    {[m.university, m.program, m.country].some(Boolean) && (
                      <p className="mt-1 break-words text-xs text-slate-600">
                        {[m.university, m.program, m.country].filter(Boolean).join(" · ")}
                      </p>
                    )}
                  </div>
                  <div className="shrink-0 text-right">
                    <div
                      className="inline-flex min-h-8 items-center gap-1 rounded-lg bg-indigo-50 px-2 py-1 text-sm font-semibold text-indigo-900"
                      aria-label={t("pathOverlap", { score: m.score })}
                    >
                      <Sparkles className="h-3.5 w-3.5" aria-hidden="true" /> {t("pathOverlap", { score: m.score })}
                    </div>
                    <p className="mt-1 text-xs text-slate-700">{price}</p>
                  </div>
                </div>

                <div className="mt-3 space-y-1.5">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-600">{t("why")}</p>
                  {(m.reasonMessages ?? []).map((reason, i) => (
                    <p key={`${reason.key}-${i}`} className="flex gap-1.5 break-words text-xs text-emerald-900">
                      <Plus className="mt-0.5 h-3 w-3 shrink-0 text-emerald-700" aria-hidden="true" />
                      <span>{translateMessage(reason)}</span>
                    </p>
                  ))}
                </div>

                {(m.gapMessages ?? []).length > 0 && (
                  <div className="mt-3 space-y-1.5 border-t border-slate-100 pt-3">
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-600">{t("gaps")}</p>
                    {m.gapMessages.map((gap, i) => (
                      <p key={`${gap.key}-${i}`} className="flex gap-1.5 break-words text-xs text-amber-900">
                        <Minus className="mt-0.5 h-3 w-3 shrink-0 text-amber-700" aria-hidden="true" />
                        <span>{translateMessage(gap)}</span>
                      </p>
                    ))}
                  </div>
                )}

                {alreadySent ? (
                  <p className="mt-4 break-words rounded-lg bg-emerald-50 p-3 text-sm text-emerald-900" role="status" aria-live="polite">
                    {t("requestSaved")}
                  </p>
                ) : isOpen ? (
                  <form
                    onSubmit={(event) => { event.preventDefault(); void request(m.id); }}
                    className="mt-4 space-y-2 border-t border-slate-100 pt-3"
                  >
                    {requestError && <p className="rounded-lg bg-rose-50 p-3 text-sm text-rose-800" role="alert">{requestError}</p>}
                    <label className="sr-only" htmlFor={`mentor-topic-${m.id}`}>{t("topicPlaceholder")}</label>
                    <input
                      id={`mentor-topic-${m.id}`}
                      value={topic}
                      onChange={(e) => setTopic(e.target.value)}
                      placeholder={t("topicPlaceholder")}
                      maxLength={200}
                      required
                      className="min-h-11 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 placeholder:text-slate-600 outline-none focus:border-indigo-600 focus:ring-2 focus:ring-indigo-600"
                    />
                    <label className="sr-only" htmlFor={`mentor-message-${m.id}`}>{t("messagePlaceholder")}</label>
                    <textarea
                      id={`mentor-message-${m.id}`}
                      value={message}
                      onChange={(e) => setMessage(e.target.value)}
                      placeholder={t("messagePlaceholder")}
                      maxLength={2000}
                      rows={3}
                      className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 placeholder:text-slate-600 outline-none focus:border-indigo-600 focus:ring-2 focus:ring-indigo-600"
                    />
                    <div className="flex flex-col gap-2 sm:flex-row">
                      <button
                        type="submit"
                        disabled={!topic.trim() || sending}
                        className="inline-flex min-h-11 w-full items-center justify-center gap-1.5 rounded-lg bg-indigo-700 px-3 py-2 text-sm font-semibold text-white hover:bg-indigo-800 disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
                      >
                        {sending ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <Send className="h-4 w-4" aria-hidden="true" />}
                        {sending ? t("sending") : t("requestIntroduction")}
                      </button>
                      <button
                        type="button"
                        onClick={() => { setOpenId(null); setRequestError(""); }}
                        className="min-h-11 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-800 hover:bg-slate-50 sm:w-auto"
                      >
                        {t("cancel")}
                      </button>
                    </div>
                  </form>
                ) : (
                  <button
                    type="button"
                    onClick={() => { setOpenId(m.id); setRequestError(""); }}
                    className="mt-4 min-h-11 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-800 hover:border-indigo-300 hover:bg-indigo-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-700 sm:w-auto"
                  >
                    {t("ask")}
                  </button>
                )}
              </article>
            );
          })}
        </div>
      )}

      <div className="flex gap-2 rounded-xl border border-sky-200 bg-sky-50 p-4 text-sm text-sky-950">
        <Info className="mt-0.5 h-4 w-4 shrink-0 text-sky-800" aria-hidden="true" />
        <p className="break-words">{t("adviceCaveat")}</p>
      </div>
    </div>
  );
}
