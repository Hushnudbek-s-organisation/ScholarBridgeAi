"use client";

import React, { useCallback, useEffect, useState } from "react";
import { SampleExemplarBar } from "@/components/samples/SampleExemplarBar";
import { AlertTriangle, Check, Copy, FileText, Loader2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { AppNote } from "@/components/AppNote";
import type { RecLetterBrief } from "@/lib/recLetter";

function briefToText(b: RecLetterBrief, preparationTitle: string, preparationAdvice: string[]): string {
  const lines: string[] = [];
  lines.push(`RECOMMENDATION LETTER BRIEF${b.forUniversity ? ` — ${b.forUniversity}` : ""}${b.deadline ? ` (deadline ${b.deadline})` : ""}`);
  lines.push("", "TALKING POINTS");
  for (const p of b.talkingPoints) lines.push(`- ${p}`);
  lines.push("", "SUGGESTED OUTLINE");
  for (const o of b.outline) {
    lines.push(o.section.toUpperCase(), o.draft, "");
  }
  if (b.dataMissing.length) {
    lines.push("ADD TO YOUR PROFILE FIRST");
    for (const d of b.dataMissing) lines.push(`- ${d}`);
  }
  lines.push("", preparationTitle);
  for (const advice of preparationAdvice) lines.push(`- ${advice}`);
  lines.push("", "BEFORE YOU SEND");
  for (const c of b.checklist) lines.push(`- [ ] ${c}`);
  return lines.join("\n");
}

/**
 * #20 Recommendation letter helper — a data-driven brief for the student's
 * recommender. Everything on screen comes from /api/recommendation-letter,
 * which only ever uses real profile data (gaps are listed, not invented).
 */
export function RecLetterPanel() {
  const t = useTranslations("recLetter");
  const [brief, setBrief] = useState<RecLetterBrief | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [university, setUniversity] = useState("");
  const [deadline, setDeadline] = useState("");
  const [relationshipContext, setRelationshipContext] = useState("");
  const [requestedFocus, setRequestedFocus] = useState("");
  const [supportingExample, setSupportingExample] = useState("");
  const [copied, setCopied] = useState(false);

  /**
   * Phase 7 — load the recommendation-letter request email (or the employer /
   * academic exemplar) into the brief form, so the student sees exactly what a
   * professor-friendly request contains before writing their own.
   */
  const loadSample = (sampleText: string) => {
    setRelationshipContext(sampleText);
  };

  const fetchBrief = useCallback(async (
    uni: string,
    dl: string,
    relationship: string,
    focus: string,
    example: string
  ): Promise<RecLetterBrief> => {
    const params = new URLSearchParams();
    if (uni.trim()) params.set("universityTitle", uni.trim());
    if (dl.trim()) params.set("deadline", dl.trim());
    if (relationship.trim()) params.set("relationshipContext", relationship.trim());
    if (focus.trim()) params.set("requestedFocus", focus.trim());
    if (example.trim()) params.set("supportingExample", example.trim());
    const qs = params.toString() ? `?${params.toString()}` : "";
    const r = await fetch(`/api/recommendation-letter${qs}`, { cache: "no-store" });
    const b = await r.json();
    if (!r.ok) throw new Error(b?.error ?? `HTTP ${r.status}`);
    return b as RecLetterBrief;
  }, []);

  const load = useCallback(async (
    uni: string,
    dl: string,
    relationship: string,
    focus: string,
    example: string
  ) => {
    setLoading(true);
    setError(null);
    try {
      setBrief(await fetchBrief(uni, dl, relationship, focus, example));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load");
    } finally {
      setLoading(false);
    }
  }, [fetchBrief]);

  useEffect(() => {
    let cancelled = false;
    void fetchBrief("", "", "", "", "")
      .then((result) => {
        if (!cancelled) setBrief(result);
      })
      .catch((e: unknown) => {
        if (!cancelled) setError(e instanceof Error ? e.message : "Failed to load");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [fetchBrief]);

  const copyAll = async () => {
    if (!brief) return;
    try {
      const preparationAdvice = brief.personalizationAdvice.map((item) =>
        t(`advice.${item.key}` as never, item.values as never)
      );
      await navigator.clipboard.writeText(briefToText(brief, t("writingAdviceTitle"), preparationAdvice));
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* clipboard unavailable — ignore */
    }
  };

  return (
    <div className="space-y-3">
      {/* Phase 7 — the request email + professor/employer exemplars */}
      <SampleExemplarBar kind={["email", "lor"]} onLoad={loadSample} />
    <div className="rounded-2xl border border-slate-200 bg-white p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="flex items-center gap-1.5 text-xs font-extrabold uppercase tracking-wide text-slate-500">
            <FileText className="h-3.5 w-3.5" /> {t("title")}
          </h3>
          <p className="mt-1 max-w-md text-[11px] text-slate-500">{t("subtitle")}</p>
        </div>
        {brief && (
          <button
            onClick={() => void copyAll()}
            className="flex min-h-11 min-w-11 items-center justify-center gap-1.5 rounded-lg border border-slate-200 px-3 py-2 text-[11px] font-bold text-slate-600 hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
          >
            {copied ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : <Copy className="h-3.5 w-3.5" />}
            {copied ? t("copied") : t("copy")}
          </button>
        )}
      </div>

      <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto]">
        <label className="text-[11px] font-semibold text-slate-600">
          {t("universityLabel")}
          <input
            className="mt-1 min-h-11 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs text-slate-800 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200"
            placeholder={t("universityPlaceholder")}
            value={university}
            onChange={(e) => setUniversity(e.target.value)}
            maxLength={160}
          />
        </label>
        <label className="text-[11px] font-semibold text-slate-600">
          {t("deadlineLabel")}
          <input
            className="mt-1 min-h-11 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs text-slate-800 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200"
            placeholder={t("deadlinePlaceholder")}
            value={deadline}
            onChange={(e) => setDeadline(e.target.value)}
            maxLength={80}
          />
        </label>
        <button
          type="button"
          onClick={() => void load(university, deadline, relationshipContext, requestedFocus, supportingExample)}
          disabled={loading}
          className="mt-auto inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-xs font-bold text-white hover:bg-indigo-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2 disabled:opacity-60"
        >
          {loading ? (
            <>
              <Loader2 aria-hidden="true" className="h-3.5 w-3.5 animate-spin" />
              {t("loading")}
            </>
          ) : t("generate")}
        </button>
      </div>

      <details className="mt-3 rounded-xl border border-slate-200 bg-slate-50/70 p-3">
        <summary className="flex min-h-11 cursor-pointer items-center px-1 text-xs font-bold text-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500">
          {t("personalizeTitle")}
        </summary>
        <div className="mt-3 space-y-3">
          <p className="text-xs leading-relaxed text-slate-600">{t("personalizeHelp")}</p>
          <label className="block text-[11px] font-semibold text-slate-700">
            {t("relationshipContextLabel")}
            <input
              className="mt-1 min-h-11 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-normal text-slate-800 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200"
              placeholder={t("relationshipContextPlaceholder")}
              value={relationshipContext}
              onChange={(e) => setRelationshipContext(e.target.value)}
              maxLength={240}
            />
          </label>
          <label className="block text-[11px] font-semibold text-slate-700">
            {t("focusLabel")}
            <textarea
              className="mt-1 min-h-20 w-full resize-y rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-normal leading-relaxed text-slate-800 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200"
              placeholder={t("focusPlaceholder")}
              value={requestedFocus}
              onChange={(e) => setRequestedFocus(e.target.value)}
              maxLength={300}
              rows={3}
            />
          </label>
          <label className="block text-[11px] font-semibold text-slate-700">
            {t("exampleLabel")}
            <textarea
              className="mt-1 min-h-20 w-full resize-y rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-normal leading-relaxed text-slate-800 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200"
              placeholder={t("examplePlaceholder")}
              value={supportingExample}
              onChange={(e) => setSupportingExample(e.target.value)}
              maxLength={500}
              rows={3}
            />
          </label>
        </div>
      </details>

      {error && (
        <p className="mt-3 flex items-center gap-2 rounded-lg bg-rose-50 px-3 py-2 text-xs font-semibold text-rose-700">
          <AlertTriangle className="h-3.5 w-3.5" /> {error}
        </p>
      )}

      {brief && (
        <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-2">
          <div>
            <h4 className="text-[11px] font-bold uppercase tracking-wide text-slate-500">{t("talkingPoints")}</h4>
            {brief.talkingPoints.length ? (
              <ul className="mt-2 space-y-1">
                {brief.talkingPoints.map((p, i) => (
                  <li key={i} className="flex items-start gap-2 text-xs text-slate-700">
                    <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-indigo-400" /> {p}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-2 text-xs text-slate-400">—</p>
            )}

            {brief.dataMissing.length > 0 && (
              <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50/60 p-3">
                <h4 className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wide text-amber-700">
                  <AlertTriangle className="h-3.5 w-3.5" /> {t("dataMissing")}
                </h4>
                <ul className="mt-1.5 space-y-1">
                  {brief.dataMissing.map((d, i) => (
                    <li key={i} className="text-xs text-amber-800">
                      {d}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {brief.personalizationAdvice.length > 0 && (
              <section className="mt-4 rounded-xl border border-indigo-100 bg-indigo-50/60 p-3 dark:border-indigo-900 dark:bg-indigo-950/25">
                <h4 className="text-xs font-bold text-indigo-950 dark:text-indigo-100">
                  {t("writingAdviceTitle")}
                </h4>
                <p className="mt-1 text-[11px] leading-relaxed text-slate-600 dark:text-slate-300">
                  {t("writingAdviceSubtitle")}
                </p>
                <ol className="mt-3 space-y-3">
                  {brief.personalizationAdvice.map((item, index) => (
                    <li key={`${item.key}-${index}`} className="flex items-start gap-2.5">
                      <span aria-hidden="true" className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-white text-[10px] font-bold text-indigo-700 ring-1 ring-indigo-200 dark:bg-slate-900 dark:text-indigo-200 dark:ring-indigo-800">
                        {index + 1}
                      </span>
                      <p className="text-xs leading-relaxed text-slate-700 dark:text-slate-200">
                        {t(`advice.${item.key}` as never, item.values as never)}
                      </p>
                    </li>
                  ))}
                </ol>
              </section>
            )}
          </div>

          <div>
            <h4 className="text-[11px] font-bold uppercase tracking-wide text-slate-500">{t("outline")}</h4>
            <p className="mt-1 text-[11px] leading-relaxed text-slate-500">
              {t("outlineNote")} {t("letterLanguageNote")}
            </p>
            <div className="mt-2 space-y-2">
              {brief.outline.map((o, i) => (
                <details key={i} open={i === 0} className="rounded-xl border border-slate-200 bg-slate-50/50 px-3 py-2">
                  <summary className="flex min-h-11 cursor-pointer items-center text-xs font-bold text-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500">{o.section}</summary>
                  <p className="mt-1.5 whitespace-pre-wrap text-xs leading-relaxed text-slate-600">{o.draft}</p>
                </details>
              ))}
            </div>

            <h4 className="mt-4 text-[11px] font-bold uppercase tracking-wide text-slate-500">{t("checklist")}</h4>
            <ul className="mt-2 space-y-1">
              {brief.checklist.map((c, i) => (
                <li key={i} className="flex items-start gap-2 text-xs text-slate-700">
                  <span className="mt-0.5 flex h-3.5 w-3.5 shrink-0 items-center justify-center rounded border border-slate-300 bg-white" />
                  {c}
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}
      {/* Standing small print: this panel can be wrong — say so where it is read. */}
      <AppNote kind="ai" className="mt-2" />
    </div>
    </div>
  );
}
