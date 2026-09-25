"use client";

import React, { useCallback, useEffect, useState } from "react";
import { AlertTriangle, Check, Copy, FileText, Loader2 } from "lucide-react";
import { useTranslations } from "next-intl";

interface Brief {
  forUniversity: string | null;
  deadline: string | null;
  talkingPoints: string[];
  outline: { section: string; draft: string }[];
  dataMissing: string[];
  checklist: string[];
}

function briefToText(b: Brief): string {
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
  const [brief, setBrief] = useState<Brief | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [university, setUniversity] = useState("");
  const [deadline, setDeadline] = useState("");
  const [copied, setCopied] = useState(false);

  const load = useCallback(async (uni: string, dl: string) => {
    setLoading(true);
    setError(null);
    const params = new URLSearchParams();
    if (uni.trim()) params.set("universityTitle", uni.trim());
    if (dl.trim()) params.set("deadline", dl.trim());
    const qs = params.toString() ? `?${params.toString()}` : "";
    try {
      const r = await fetch(`/api/recommendation-letter${qs}`, { cache: "no-store" });
      const b = await r.json();
      if (!r.ok) throw new Error(b?.error ?? `HTTP ${r.status}`);
      setBrief(b);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load("", "");
  }, [load]);

  const copyAll = async () => {
    if (!brief) return;
    try {
      await navigator.clipboard.writeText(briefToText(brief));
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* clipboard unavailable — ignore */
    }
  };

  return (
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
            className="flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-1.5 text-[11px] font-bold text-slate-600 hover:bg-slate-50"
          >
            {copied ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : <Copy className="h-3.5 w-3.5" />}
            {copied ? t("copied") : t("copy")}
          </button>
        )}
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <input
          className="w-56 rounded-lg border border-slate-200 px-3 py-1.5 text-xs"
          placeholder={t("universityPlaceholder")}
          value={university}
          onChange={(e) => setUniversity(e.target.value)}
        />
        <input
          className="w-44 rounded-lg border border-slate-200 px-3 py-1.5 text-xs"
          placeholder={t("deadlinePlaceholder")}
          value={deadline}
          onChange={(e) => setDeadline(e.target.value)}
        />
        <button
          onClick={() => void load(university, deadline)}
          disabled={loading}
          className="rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-indigo-700 disabled:opacity-60"
        >
          {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : t("generate")}
        </button>
      </div>

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
          </div>

          <div>
            <h4 className="text-[11px] font-bold uppercase tracking-wide text-slate-500">{t("outline")}</h4>
            <div className="mt-2 space-y-2">
              {brief.outline.map((o, i) => (
                <details key={i} className="rounded-xl border border-slate-200 bg-slate-50/50 px-3 py-2">
                  <summary className="cursor-pointer text-xs font-bold text-slate-700">{o.section}</summary>
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
    </div>
  );
}
