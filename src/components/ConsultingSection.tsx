"use client";

import React, { useState } from "react";
import { useTranslations } from "next-intl";
import { Headset, Send, Loader2, CheckCircle2, Clock } from "lucide-react";
import { StudentProfile } from "./Navbar";
import { isTelegramPlaceholderEmail } from "@/lib/telegram/placeholder";
import { AppNote } from "@/components/AppNote";

interface ConsultingSectionProps {
  activeProfile: StudentProfile | null;
}

const TOPICS = [
  { value: "University selection strategy", label: "topics.universitySelection" },
  { value: "Scholarship application help", label: "topics.scholarshipHelp" },
  { value: "SOP / essay review (1-on-1)", label: "topics.essayReview" },
  { value: "Application roadmap planning", label: "topics.applicationPlanning" },
  { value: "Visa & financial documents", label: "topics.visaFinance" },
  { value: "Other", label: "topics.other" },
] as const;

export function ConsultingSection({ activeProfile }: ConsultingSectionProps) {
  const t = useTranslations("consultingPanel");
  const [topic, setTopic] = useState<string>(TOPICS[0].value);
  const [message, setMessage] = useState("");
  const [preferredContact, setPreferredContact] = useState("");
  const [submittedContact, setSubmittedContact] = useState("");
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState("");

  const usesTelegramPlaceholder = isTelegramPlaceholderEmail(activeProfile?.email);
  const accountEmail = activeProfile && !usesTelegramPlaceholder ? activeProfile.email.trim() : "";
  const effectiveContact = preferredContact.trim() || accountEmail;
  const contactIsRequired = !accountEmail;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeProfile) return;
    const contact = effectiveContact;
    if (!contact) {
      setError(t("contactRequired"));
      return;
    }

    setBusy(true);
    setError("");
    try {
      const res = await fetch("/api/consulting", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          profileId: activeProfile.id,
          topic,
          message,
          preferredContact: contact,
        }),
      });
      if (!res.ok) {
        setError(res.status === 429 ? t("rateLimited") : t("submitFailed"));
        return;
      }
      setSubmittedContact(contact);
      setDone(true);
    } catch {
      setError(t("submitFailed"));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mx-auto w-full max-w-2xl space-y-4">
      <div className="flex items-start gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-xs">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-slate-900">
          <Headset className="h-5 w-5 text-amber-300" aria-hidden="true" />
        </div>
        <div className="min-w-0">
          <h2 className="text-sm font-extrabold text-slate-800">{t("title")}</h2>
          <p className="break-words text-xs text-slate-600">{t("subtitle")}</p>
        </div>
      </div>

      {done ? (
        <div className="space-y-3 rounded-2xl border border-emerald-200 bg-emerald-50 p-6 text-center sm:p-8" role="status" aria-live="polite">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100">
            <CheckCircle2 className="h-6 w-6 text-emerald-700" aria-hidden="true" />
          </div>
          <h3 className="text-base font-extrabold text-slate-900">{t("requestSentTitle")}</h3>
          <p className="break-words text-sm text-slate-700">{t("requestSent", { contact: submittedContact })}</p>
        </div>
      ) : (
        <form onSubmit={submit} aria-busy={busy} className="space-y-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-xs sm:p-5">
          {error && (
            <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-800" role="alert">
              {error}
            </div>
          )}

          <div>
            <label htmlFor="consulting-topic" className="mb-1.5 block text-[11px] font-bold uppercase tracking-wide text-slate-600">
              {t("whatHelp")}
            </label>
            <select
              id="consulting-topic"
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              className="min-h-11 w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900"
            >
              {TOPICS.map((option) => (
                <option key={option.value} value={option.value}>{t(option.label)}</option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="consulting-message" className="mb-1.5 block text-[11px] font-bold uppercase tracking-wide text-slate-600">
              {t("situation")}
            </label>
            <textarea
              id="consulting-message"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={4}
              placeholder={t("messagePlaceholder")}
              className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-900 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-slate-900"
            />
          </div>

          <div>
            <label htmlFor="consulting-contact" className="mb-1.5 block text-[11px] font-bold uppercase tracking-wide text-slate-600">
              {t("contact")}{contactIsRequired ? " *" : ""}
            </label>
            <input
              id="consulting-contact"
              type="text"
              autoComplete="email"
              aria-required={contactIsRequired}
              value={preferredContact}
              onChange={(e) => setPreferredContact(e.target.value)}
              placeholder={accountEmail || t("contactPlaceholder")}
              aria-describedby="consulting-contact-help"
              className="min-h-11 w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-900 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-slate-900"
            />
            <p id="consulting-contact-help" className="mt-1.5 break-words text-xs text-slate-600">
              {t("contactHelper")}
            </p>
          </div>

          <button
            type="submit"
            disabled={busy || !activeProfile}
            className="flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-slate-900 px-4 py-3 text-sm font-bold text-white hover:bg-slate-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-900 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {busy ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <Send className="h-4 w-4" aria-hidden="true" />}
            {busy ? t("sending") : t("send")}
          </button>

          <p className="flex flex-wrap items-center justify-center gap-1 text-center text-xs text-slate-600">
            <Clock className="h-3.5 w-3.5 shrink-0" aria-hidden="true" /> {t("responseNote")}
          </p>
        </form>
      )}
      <AppNote kind="thirdParty" className="mt-2" />
    </div>
  );
}
