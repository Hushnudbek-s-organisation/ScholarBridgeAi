"use client";

import React, { useState } from "react";
import {
  AlertTriangle,
  Bot,
  CheckCircle2,
  Loader2,
  Send,
  ShieldCheck,
  Target,
} from "lucide-react";
import { AiFormattedText } from "./AiFormattedText";
import { StudentProfile } from "./Navbar";

/**
 * AI Admissions Advisor (#3).
 *
 * The numbers on this screen come from the deterministic chancing engine —
 * the model writes prose around them and is rejected if it quotes a
 * percentage that is not in its brief. That guarantee is stated in the UI so
 * the student knows which numbers are computed and which are prose.
 */

interface ChanceRow {
  universityName: string;
  fitScore: number | null;
  low: number;
  high: number;
  band: string;
  label: string;
}

interface Advice {
  summary: string;
  strengths: string[];
  risks: string[];
  steps: string[];
  strategy: string;
  source: "rules" | "ai";
}

interface AdvisorResponse {
  advice: Advice;
  aiReply: string | null;
  aiUsed: boolean;
  headline: string;
  chances: ChanceRow[];
}

interface AdmissionsAdvisorProps {
  activeProfile: StudentProfile | null;
}

export function AdmissionsAdvisor({ activeProfile }: AdmissionsAdvisorProps) {
  const [question, setQuestion] = useState("");
  const [data, setData] = useState<AdvisorResponse | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  if (!activeProfile) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-6 text-sm text-slate-500">
        Sign in to talk to your admissions advisor.
      </div>
    );
  }

  const ask = async (text?: string) => {
    const q = (text ?? question).trim();
    setBusy(true);
    setError("");
    try {
      const res = await fetch("/api/ai/admissions-advisor", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ profileId: activeProfile.id, message: q || undefined }),
      });
      const payload = await res.json();
      if (!res.ok) throw new Error(payload.error || "The advisor could not answer");
      setData(payload);
    } catch (err) {
      setError(err instanceof Error ? err.message : "The advisor could not answer");
    } finally {
      setBusy(false);
    }
  };

  const suggestions = [
    "Is my university list balanced?",
    "What is my weakest point right now?",
    "Which scholarships should I target?",
    "Should I retake the IELTS?",
  ];

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-slate-200 bg-white p-4">
        <h2 className="flex items-center gap-2 text-lg font-bold text-slate-900">
          <Bot className="h-5 w-5 text-indigo-600" />
          AI Admissions Advisor
        </h2>
        <p className="mt-0.5 text-xs text-slate-500">
          Ask anything about your applications. The advisor reads your real profile and estimates.
        </p>

        <div className="mt-3 flex gap-2">
          <input
            className="flex-1 rounded-xl border border-slate-200 px-3 py-2.5 text-sm text-slate-800 focus:border-indigo-400 focus:outline-none"
            placeholder="e.g. Is my list balanced for Fall 2027?"
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") void ask();
            }}
          />
          <button
            onClick={() => void ask()}
            disabled={busy}
            className="flex items-center gap-1.5 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-bold text-white hover:bg-indigo-700 disabled:opacity-60"
          >
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            Ask
          </button>
        </div>

        <div className="mt-2 flex flex-wrap gap-1.5">
          {suggestions.map((s) => (
            <button
              key={s}
              onClick={() => {
                setQuestion(s);
                void ask(s);
              }}
              disabled={busy}
              className="rounded-full border border-slate-200 px-3 py-1 text-[11px] font-semibold text-slate-600 hover:border-indigo-300 hover:text-indigo-700 disabled:opacity-50"
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      {error && (
        <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">{error}</div>
      )}

      {data && (
        <>
          {/* Model prose, clearly labelled */}
          {data.aiUsed && data.aiReply && (
            <div className="rounded-2xl border border-indigo-100 bg-white p-4">
              <div className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wide text-indigo-600">
                <Bot className="h-3.5 w-3.5" /> AI answer
              </div>
              <div className="mt-2 text-sm text-slate-800">
                <AiFormattedText text={data.aiReply} />
              </div>
            </div>
          )}

          {/* The computed part — always shown, never generated by a model */}
          <div className="rounded-2xl border border-slate-200 bg-white p-4">
            <div className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wide text-slate-500">
              <ShieldCheck className="h-3.5 w-3.5" />
              {data.aiUsed ? "Computed assessment" : "Assessment (no AI provider configured)"}
            </div>

            <p className="mt-2 text-sm leading-relaxed text-slate-700">{data.advice.summary}</p>

            {data.chances.length > 0 && (
              <div className="mt-4 space-y-2">
                {data.chances.map((c) => (
                  <div
                    key={c.universityName}
                    className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-slate-50 px-3 py-2"
                  >
                    <span className="truncate text-xs font-bold text-slate-800">{c.universityName}</span>
                    <span className="flex items-center gap-2 text-[11px] font-bold">
                      <span className="rounded-md bg-white px-2 py-0.5 text-slate-600">
                        fit {c.fitScore ?? "—"}%
                      </span>
                      <span className="rounded-md bg-indigo-100 px-2 py-0.5 text-indigo-700">
                        admit {c.low}–{c.high}%
                      </span>
                      <span className="rounded-md bg-white px-2 py-0.5 text-slate-600">{c.label}</span>
                    </span>
                  </div>
                ))}
              </div>
            )}

            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <div>
                <h4 className="text-xs font-extrabold uppercase tracking-wide text-emerald-700">Strengths</h4>
                <ul className="mt-1.5 space-y-1">
                  {data.advice.strengths.map((s, i) => (
                    <li key={i} className="flex gap-1.5 text-xs text-slate-700">
                      <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-600" />
                      <span>{s}</span>
                    </li>
                  ))}
                  {data.advice.strengths.length === 0 && (
                    <li className="text-xs text-slate-400">Fill in your profile to see strengths.</li>
                  )}
                </ul>
              </div>
              <div>
                <h4 className="text-xs font-extrabold uppercase tracking-wide text-rose-700">Risks</h4>
                <ul className="mt-1.5 space-y-1">
                  {data.advice.risks.map((r, i) => (
                    <li key={i} className="flex gap-1.5 text-xs text-slate-700">
                      <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-rose-500" />
                      <span>{r}</span>
                    </li>
                  ))}
                  {data.advice.risks.length === 0 && (
                    <li className="text-xs text-slate-400">No red flags found.</li>
                  )}
                </ul>
              </div>
            </div>

            <div className="mt-4 rounded-xl bg-indigo-50 p-3">
              <h4 className="flex items-center gap-1.5 text-xs font-extrabold uppercase tracking-wide text-indigo-700">
                <Target className="h-3.5 w-3.5" /> Strategy
              </h4>
              <p className="mt-1 text-xs text-slate-700">{data.advice.strategy}</p>
            </div>

            <div className="mt-4">
              <h4 className="text-xs font-extrabold uppercase tracking-wide text-slate-500">This week</h4>
              <ol className="mt-1.5 space-y-1">
                {data.advice.steps.map((s, i) => (
                  <li key={i} className="flex gap-2 text-xs text-slate-700">
                    <span className="font-extrabold text-indigo-600">{i + 1}.</span>
                    <span>{s}</span>
                  </li>
                ))}
              </ol>
            </div>
          </div>

          <p className="text-[11px] text-slate-400">
            Estimates are model output based on published university data and ScholarBridge
            outcomes — not a guarantee of admission.
          </p>
        </>
      )}

      {!data && !busy && (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-white px-4 py-10 text-center text-sm text-slate-500">
          Ask a question above, or press Enter, to get an assessment of your applications.
        </div>
      )}
    </div>
  );
}
