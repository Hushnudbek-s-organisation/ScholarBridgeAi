"use client";

/**
 * "10-SECOND SMART ONBOARDING" (Pillar 5.2).
 *
 * Paste (or drop) a CV / transcript / IELTS score report, press Extract, tick
 * the fields you accept, press Apply. Everything the student sees is verified
 * against the pasted text: the API strips any number that does not appear in
 * the source, so a model cannot invent a GPA or a band score — and nothing is
 * written to the profile until the student confirms.
 *
 * PDFs are read in the browser (text layer only); .txt/.md/.json are read
 * directly. Files never leave the device except as the extracted text the
 * student explicitly submits.
 */
import React, { useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { AlertTriangle, Check, FileText, Loader2, Sparkles, Wand2 } from "lucide-react";
import { SampleExemplarBar } from "@/components/samples/SampleExemplarBar";
import { SAMPLE_ONBOARDING_CV_IELTS } from "@/lib/samples/exemplars";
import { extractDeterministicProfileFacts, type ExtractedFacts } from "@/lib/profileExtractor";

const MAX_FILE_BYTES = 2 * 1024 * 1024;

/** Field labels the review list shows (i18n keys in the `profileAutoFill` namespace). */
const FIELD_LABELS: Record<string, string> = {
  fullName: "fieldFullName",
  email: "fieldEmail",
  phone: "fieldPhone",
  country: "fieldCountry",
  degreeLevel: "fieldDegreeLevel",
  targetMajor: "fieldTargetMajor",
  gpa: "fieldGpa",
  gpaScale: "fieldGpaScale",
  ieltsScore: "fieldIelts",
  toeflScore: "fieldToefl",
  satScore: "fieldSat",
  greScore: "fieldGre",
  gmatScore: "fieldGmat",
  duolingoScore: "fieldDuolingo",
  researchPublications: "fieldPublications",
  budgetAnnualUsd: "fieldBudget",
  leadership: "fieldLeadership",
  awards: "fieldAwards",
  extracurriculars: "fieldExtracurriculars",
};

export interface ProfileAutoFillCardProps {
  /** Receives only the ticked fields, keyed like the profile PATCH payload. */
  onApply: (patch: Record<string, string | number | null>) => void;
  /** Optional profile id (kept out of the prompt; used for quota attribution). */
  profileId?: number | null;
  className?: string;
}

export function ProfileAutoFillCard({ onApply, profileId, className = "" }: ProfileAutoFillCardProps) {
  const t = useTranslations("profileAutoFill");
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [facts, setFacts] = useState<ExtractedFacts | null>(null);
  const [stripped, setStripped] = useState<string[]>([]);
  const [aiUsed, setAiUsed] = useState(false);
  const [selected, setSelected] = useState<Record<string, boolean>>({});
  const [applied, setApplied] = useState(false);
  const fileRef = useRef<HTMLInputElement | null>(null);

  const onFile = async (file: File | null) => {
    if (!file) return;
    setError("");
    if (file.size > MAX_FILE_BYTES) {
      setError(t("fileTooLarge"));
      return;
    }
    try {
      const raw = await file.text();
      // A PDF's text layer arrives as Latin-1-ish bytes; keep printable runs.
      const cleaned = raw.replace(/[^\x09\x0a\x0d\x20-\x7e\u0400-\u04FF\u2018\u2019\u201c\u201d\u2013\u2014]+/g, " ");
      setText(cleaned.slice(0, 120_000));
      setFacts(null);
      setApplied(false);
    } catch {
      setError(t("fileReadFailed"));
    }
  };

  const extract = async () => {
    setError("");
    setApplied(false);
    if (text.trim().length < 20) {
      setError(t("needMoreText"));
      return;
    }
    setBusy(true);
    try {
      const res = await fetch("/api/ai/extract-profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text, profileId: profileId ?? undefined }),
      });
      if (res.status === 403) throw new Error(t("premiumLocked"));
      if (res.status === 429) throw new Error(t("rateLimited"));
      if (!res.ok) {
        // Offline / no AI provider: the deterministic pass still works locally,
        // so the student is not blocked by an unavailable model.
        const local = extractDeterministicProfileFacts(text);
        const keys = Object.keys(local).filter((k) => {
          const v = (local as unknown as Record<string, unknown>)[k];
          return Array.isArray(v) ? v.length > 0 : v !== null && v !== undefined && v !== "";
        });
        if (keys.length === 0) throw new Error(t("nothingFound"));
        setFacts(local);
        setStripped([]);
        setAiUsed(false);
        setSelected(Object.fromEntries(keys.map((k) => [k, true])));
        return;
      }
      const data = (await res.json()) as { facts: ExtractedFacts; detected: string[]; stripped: string[]; aiUsed: boolean };
      if (!data.detected?.length) {
        setFacts(null);
        setError(t("nothingFound"));
        return;
      }
      setFacts(data.facts);
      setStripped(data.stripped ?? []);
      setAiUsed(Boolean(data.aiUsed));
      setSelected(Object.fromEntries(data.detected.map((k) => [k, true])));
    } catch (err) {
      setError(err instanceof Error && err.message ? err.message : t("extractFailed"));
    } finally {
      setBusy(false);
    }
  };

  const apply = () => {
    if (!facts) return;
    const patch: Record<string, string | number | null> = {};
    for (const [key, on] of Object.entries(selected)) {
      if (!on) continue;
      const value = (facts as unknown as Record<string, unknown>)[key];
      if (value == null) continue;
      patch[key] = Array.isArray(value) ? value.join("\n") : (value as string | number);
    }
    if (Object.keys(patch).length === 0) {
      setError(t("selectAtLeastOne"));
      return;
    }
    onApply(patch);
    setApplied(true);
    setError("");
  };

  const entries = facts
    ? Object.entries(selected).filter(([, on]) => on).map(([key]) => key)
    : [];

  return (
    <section
      className={`rounded-2xl border border-indigo-200 bg-indigo-50/60 p-3 dark:border-indigo-500/40 dark:bg-indigo-500/10 sm:p-4 ${className}`}
      aria-label={t("title")}
    >
      <div className="flex flex-wrap items-center gap-2">
        <h3 className="flex items-center gap-1.5 text-sm font-extrabold text-indigo-900 dark:text-indigo-200">
          <Wand2 className="h-4 w-4" aria-hidden="true" />
          {t("title")}
        </h3>
        <span className="rounded-full bg-indigo-600 px-2 py-0.5 text-[10px] font-black uppercase tracking-wider text-white">
          {t("badge")}
        </span>
      </div>
      <p className="mt-1 text-[12px] leading-relaxed text-indigo-900/80 dark:text-indigo-200/90">{t("intro")}</p>

      <div className="mt-3 grid gap-3 lg:grid-cols-2">
        <div>
          <label className="sr-only" htmlFor="autofill-text">
            {t("pasteLabel")}
          </label>
          <textarea
            id="autofill-text"
            value={text}
            onChange={(event) => {
              setText(event.target.value);
              setFacts(null);
              setApplied(false);
            }}
            placeholder={t("pastePlaceholder")}
            className="min-h-32 w-full rounded-xl border border-indigo-200 bg-white p-3 text-[12px] leading-relaxed text-slate-800 focus:border-indigo-400 focus:outline-none dark:border-indigo-500/40 dark:bg-slate-900 dark:text-slate-100"
          />
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <input
              ref={fileRef}
              type="file"
              accept=".txt,.md,.json,.csv,.pdf,text/plain,application/pdf"
              className="sr-only"
              onChange={(event) => void onFile(event.target.files?.[0] ?? null)}
            />
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              className="inline-flex min-h-11 items-center gap-1.5 rounded-xl border border-indigo-300 bg-white px-3 py-2 text-xs font-bold text-indigo-800 hover:bg-indigo-100 dark:border-indigo-500/40 dark:bg-slate-900 dark:text-indigo-200 dark:hover:bg-slate-800"
            >
              <FileText className="h-3.5 w-3.5" aria-hidden="true" />
              {t("chooseFile")}
            </button>
            <button
              type="button"
              onClick={() => {
                setText(SAMPLE_ONBOARDING_CV_IELTS.text);
                setFacts(null);
                setApplied(false);
              }}
              className="inline-flex min-h-11 items-center gap-1.5 rounded-xl border border-indigo-300 bg-white px-3 py-2 text-xs font-bold text-indigo-800 hover:bg-indigo-100 dark:border-indigo-500/40 dark:bg-slate-900 dark:text-indigo-200 dark:hover:bg-slate-800"
            >
              <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
              {t("trySample")}
            </button>
            <button
              type="button"
              onClick={() => void extract()}
              disabled={busy}
              className="inline-flex min-h-11 items-center gap-1.5 rounded-xl bg-indigo-600 px-3.5 py-2 text-xs font-black text-white hover:bg-indigo-700 disabled:opacity-50"
            >
              {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" /> : <Wand2 className="h-3.5 w-3.5" aria-hidden="true" />}
              {busy ? t("extracting") : t("extract")}
            </button>
          </div>
          <p className="mt-1.5 text-[11px] text-indigo-900/70 dark:text-indigo-200/70">{t("privacyNote")}</p>
        </div>

        <div>
          {error && (
            <p role="alert" className="mb-2 flex items-start gap-1.5 rounded-xl border border-red-200 bg-red-50 p-2 text-[12px] font-semibold text-red-700 dark:border-red-500/40 dark:bg-red-500/10 dark:text-red-200">
              <AlertTriangle className="h-4 w-4 shrink-0" aria-hidden="true" />
              {error}
            </p>
          )}
          {facts ? (
            <div className="rounded-xl border border-indigo-200 bg-white p-3 dark:border-indigo-500/40 dark:bg-slate-900">
              <p className="text-[11px] font-bold uppercase tracking-wider text-indigo-700 dark:text-indigo-300">{t("reviewTitle")}</p>
              <ul className="mt-2 space-y-1.5">
                {entries.map((key) => {
                  const value = (facts as unknown as Record<string, unknown>)[key];
                  const display = Array.isArray(value) ? value.join(" · ") : String(value);
                  return (
                    <li key={key} className="flex items-start gap-2 text-[12px] text-slate-800 dark:text-slate-100">
                      <input
                        type="checkbox"
                        id={`autofill-${key}`}
                        checked={selected[key] !== false}
                        onChange={(event) => setSelected((prev) => ({ ...prev, [key]: event.target.checked }))}
                        className="mt-0.5 h-4 w-4 shrink-0"
                      />
                      <label htmlFor={`autofill-${key}`} className="min-w-0 flex-1 break-words">
                        <span className="font-bold">{FIELD_LABELS[key] ? t(FIELD_LABELS[key] as never) : key}: </span>
                        <span className="break-words">{display.length > 160 ? `${display.slice(0, 160)}…` : display}</span>
                      </label>
                    </li>
                  );
                })}
              </ul>
              {stripped.length > 0 && (
                <p className="mt-2 rounded-lg bg-amber-50 p-2 text-[11px] text-amber-900 dark:bg-amber-500/10 dark:text-amber-200">
                  {t("strippedNote", { fields: stripped.join(", ") })}
                </p>
              )}
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={apply}
                  className="inline-flex min-h-11 items-center gap-1.5 rounded-xl bg-indigo-600 px-3.5 py-2 text-xs font-black text-white hover:bg-indigo-700"
                >
                  <Check className="h-3.5 w-3.5" aria-hidden="true" />
                  {t("applySelected")}
                </button>
                {applied && (
                  <span role="status" className="text-[12px] font-bold text-emerald-700 dark:text-emerald-300">
                    {t("applied")}
                  </span>
                )}
                <span className="text-[11px] text-slate-500 dark:text-slate-400">
                  {aiUsed ? t("sourceAi") : t("sourceLocal")}
                </span>
              </div>
            </div>
          ) : (
            !error && (
              <div className="rounded-xl border border-dashed border-indigo-300 p-3 text-[12px] text-indigo-900/80 dark:border-indigo-500/40 dark:text-indigo-200/80">
                {t("reviewHint")}
              </div>
            )
          )}
        </div>
      </div>

      <div className="mt-3">
        <SampleExemplarBar
          kind="onboarding"
          onLoad={(sampleText) => {
            setText(sampleText);
            setFacts(null);
            setApplied(false);
          }}
        />
      </div>
    </section>
  );
}
