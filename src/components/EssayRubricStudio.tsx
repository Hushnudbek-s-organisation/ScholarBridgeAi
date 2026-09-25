"use client";

import React, { useCallback, useEffect, useState } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  Eye,
  History,
  Loader2,
  MessageSquare,
  PenLine,
  Save,
  Send,
  Sparkles,
  TrendingDown,
  TrendingUp,
} from "lucide-react";
import { StudentProfile } from "./Navbar";

/**
 * Advanced Essay AI (#8) — the rubric and version-history half.
 *
 * Scores come from the deterministic rubric in src/lib/essay.ts, computed
 * server-side on save. Two readers get the same number, and a student who
 * rewrites a paragraph can see exactly which sub-score moved and why.
 */

interface Scores {
  hook: number;
  structure: number;
  specificity: number;
  language: number;
  fit: number;
  total: number;
}

interface Issue {
  code: string;
  message: string;
  severity: "blocker" | "warning" | "info";
}

interface Feedback {
  scores: Scores;
  wordCount: number;
  issues: Issue[];
  cliches: { phrase: string; count: number }[];
  readingTimeSec: number;
}

interface Comparison {
  delta: Partial<Record<keyof Scores, number>>;
  improved: boolean;
  wordDelta: number;
  fixedIssues: string[];
  newIssues: string[];
}

interface Version {
  id: number;
  versionNumber: number;
  title: string;
  essayType: string;
  wordCount: number;
  rubricTotal: number | null;
  createdAt: string;
  content: string;
}

const ESSAY_TYPES = [
  { value: "sop", label: "Statement of Purpose" },
  { value: "personal_statement", label: "Personal Statement" },
  { value: "why_us", label: "Why This University" },
  { value: "supplemental", label: "Supplemental" },
  { value: "scholarship", label: "Scholarship Essay" },
];

const SUBSCORES: { key: keyof Scores; label: string }[] = [
  { key: "hook", label: "Opening hook" },
  { key: "structure", label: "Structure" },
  { key: "specificity", label: "Specificity & evidence" },
  { key: "language", label: "Language" },
  { key: "fit", label: "Prompt fit" },
];

const SEVERITY_STYLE: Record<Issue["severity"], string> = {
  blocker: "bg-red-50 text-red-700 border-red-200",
  warning: "bg-amber-50 text-amber-700 border-amber-200",
  info: "bg-slate-100 text-slate-600 border-slate-200",
};

interface EssayRubricStudioProps {
  activeProfile: StudentProfile | null;
}

export function EssayRubricStudio({ activeProfile }: EssayRubricStudioProps) {
  const [text, setText] = useState("");
  const [essayType, setEssayType] = useState("sop");
  const [targetName, setTargetName] = useState("");
  const [wordLimit, setWordLimit] = useState("");
  const [feedback, setFeedback] = useState<Feedback | null>(null);
  const [comparison, setComparison] = useState<Comparison | null>(null);
  const [versions, setVersions] = useState<Version[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  // #18 Scholarship essay adapter — score this essay against saved scholarships
  interface FitMatch {
    scholarshipId: number;
    title: string;
    fit: number;
    matched: string[];
    gaps: string[];
    plan: string[];
  }
  const [fitMatches, setFitMatches] = useState<FitMatch[] | null>(null);
  const [fitBusy, setFitBusy] = useState(false);
  const [fitError, setFitError] = useState("");
  const [adapted, setAdapted] = useState<Record<number, { text: string | null; source: string }>>({});
  const [adaptingId, setAdaptingId] = useState<number | null>(null);

  const analyzeFit = async () => {
    if (text.trim().length < 50) return;
    setFitBusy(true);
    setFitError("");
    setFitMatches(null);
    setAdapted({});
    try {
      const res = await fetch("/api/essay-adapter", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ essayText: text }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Could not score the fit");
      setFitMatches(data.matches ?? []);
    } catch (err) {
      setFitError(err instanceof Error ? err.message : "Could not score the fit");
    } finally {
      setFitBusy(false);
    }
  };

  const adaptEssay = async (scholarshipId: number) => {
    setAdaptingId(scholarshipId);
    setFitError("");
    try {
      const res = await fetch("/api/essay-adapter/adapt", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ essayText: text, scholarshipId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Could not adapt the essay");
      setAdapted((prev) => ({ ...prev, [scholarshipId]: { text: data.adapted, source: data.source } }));
    } catch (err) {
      setFitError(err instanceof Error ? err.message : "Could not adapt the essay");
    } finally {
      setAdaptingId(null);
    }
  };

  const loadVersions = useCallback(async () => {
    if (!activeProfile?.id) return;
    try {
      const res = await fetch(`/api/essays?profileId=${activeProfile.id}&essayType=${essayType}`);
      const data = await res.json();
      if (res.ok) setVersions(data.versions ?? []);
    } catch {
      // Version history is a convenience — never block the editor.
    }
  }, [activeProfile?.id, essayType]);

  useEffect(() => {
    void loadVersions();
  }, [loadVersions]);

  if (!activeProfile) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-6 text-sm text-slate-500">
        Sign in to score your essays.
      </div>
    );
  }

  const scoreDraft = async () => {
    if (!text.trim()) return;
    setBusy(true);
    setError("");
    try {
      const res = await fetch("/api/essays", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          content: text,
          essayType,
          targetName: targetName || undefined,
          wordLimit: wordLimit ? Number(wordLimit) : undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Could not score the essay");
      setFeedback(data.feedback);
      setComparison(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not score the essay");
    } finally {
      setBusy(false);
    }
  };

  const saveVersion = async () => {
    if (!text.trim()) return;
    setBusy(true);
    setError("");
    try {
      const res = await fetch("/api/essays", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          profileId: activeProfile.id,
          content: text,
          essayType,
          targetName: targetName || undefined,
          wordLimit: wordLimit ? Number(wordLimit) : undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Could not save the version");
      setFeedback(data.feedback);
      setComparison(data.comparison);
      await loadVersions();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save the version");
    } finally {
      setBusy(false);
    }
  };

  const wordCount = text.trim() ? text.trim().split(/\s+/).length : 0;
  const limit = wordLimit ? Number(wordLimit) : null;
  const overLimit = limit !== null && wordCount > limit;

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-slate-200 bg-white p-4">
        <h2 className="flex items-center gap-2 text-lg font-bold text-slate-900">
          <Sparkles className="h-5 w-5 text-indigo-600" />
          Essay rubric & version history
        </h2>
        <p className="mt-0.5 text-xs text-slate-500">
          Scores are computed from your text by a fixed rubric — the same draft always gets the
          same score, so you can see what actually improved.
        </p>

        <div className="mt-3 grid gap-2 sm:grid-cols-4">
          <select
            className="rounded-lg border border-slate-200 px-3 py-2 text-sm"
            value={essayType}
            onChange={(e) => setEssayType(e.target.value)}
          >
            {ESSAY_TYPES.map((t) => (
              <option key={t.value} value={t.value}>
                {t.label}
              </option>
            ))}
          </select>
          <input
            className="rounded-lg border border-slate-200 px-3 py-2 text-sm"
            placeholder="Target university"
            value={targetName}
            onChange={(e) => setTargetName(e.target.value)}
          />
          <input
            className="rounded-lg border border-slate-200 px-3 py-2 text-sm"
            type="number"
            placeholder="Word limit"
            value={wordLimit}
            onChange={(e) => setWordLimit(e.target.value)}
          />
          <div className={`rounded-lg border px-3 py-2 text-sm font-bold ${overLimit ? "border-red-200 bg-red-50 text-red-700" : "border-slate-200 text-slate-600"}`}>
            {wordCount}
            {limit ? ` / ${limit}` : " words"}
          </div>
        </div>

        <textarea
          className="mt-3 min-h-[280px] w-full rounded-xl border border-slate-200 p-3 text-sm leading-relaxed text-slate-800 focus:border-indigo-400 focus:outline-none"
          placeholder="Paste your essay here…"
          value={text}
          onChange={(e) => setText(e.target.value)}
        />

        <div className="mt-3 flex flex-wrap gap-2">
          <button
            onClick={() => void scoreDraft()}
            disabled={busy || !text.trim()}
            className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-bold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
          >
            Score this draft
          </button>
          <button
            onClick={() => void saveVersion()}
            disabled={busy || !text.trim()}
            className="flex items-center gap-1.5 rounded-xl bg-indigo-600 px-4 py-2 text-sm font-bold text-white hover:bg-indigo-700 disabled:opacity-50"
          >
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            Save as new version
          </button>
        </div>
      </div>

      {error && (
        <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">{error}</div>
      )}

      {feedback && (
        <div className="rounded-2xl border border-slate-200 bg-white p-4">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <div className="text-[10px] font-bold uppercase tracking-wide text-slate-400">Rubric total</div>
              <div
                className={`text-3xl font-extrabold ${
                  feedback.scores.total >= 75 ? "text-emerald-600" : feedback.scores.total >= 50 ? "text-amber-600" : "text-red-600"
                }`}
              >
                {feedback.scores.total}
                <span className="text-base font-bold text-slate-400">/100</span>
              </div>
            </div>
            {comparison && (
              <div
                className={`flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-bold ${
                  comparison.improved
                    ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                    : comparison.delta.total === 0
                      ? "border-slate-200 bg-slate-50 text-slate-600"
                      : "border-red-200 bg-red-50 text-red-700"
                }`}
              >
                {comparison.improved ? (
                  <TrendingUp className="h-3.5 w-3.5" />
                ) : (
                  <TrendingDown className="h-3.5 w-3.5" />
                )}
                {(comparison.delta.total ?? 0) > 0 ? "+" : ""}
                {comparison.delta.total ?? 0} vs previous
              </div>
            )}
          </div>

          <div className="mt-4 grid gap-2 sm:grid-cols-2">
            {SUBSCORES.map(({ key, label }) => (
              <div key={key}>
                <div className="flex justify-between text-[11px] font-semibold text-slate-600">
                  <span>{label}</span>
                  <span className="flex items-center gap-1.5">
                    {comparison && typeof comparison.delta[key] === "number" && comparison.delta[key] !== 0 && (
                      <span className={comparison.delta[key]! > 0 ? "text-emerald-600" : "text-red-600"}>
                        {comparison.delta[key]! > 0 ? "+" : ""}
                        {comparison.delta[key]}
                      </span>
                    )}
                    {feedback.scores[key]}
                  </span>
                </div>
                <div className="mt-0.5 h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
                  <div className="h-full rounded-full bg-indigo-500" style={{ width: `${feedback.scores[key]}%` }} />
                </div>
              </div>
            ))}
          </div>

          {feedback.issues.length > 0 && (
            <ul className="mt-4 space-y-1.5">
              {feedback.issues.map((issue, i) => (
                <li key={`${issue.code}-${i}`} className="flex flex-wrap items-start gap-2">
                  <span className={`rounded-full border px-2 py-0.5 text-[9px] font-bold ${SEVERITY_STYLE[issue.severity]}`}>
                    {issue.severity}
                  </span>
                  <span className="min-w-0 flex-1 text-xs text-slate-700">{issue.message}</span>
                </li>
              ))}
            </ul>
          )}

          {feedback.cliches.length > 0 && (
            <p className="mt-3 text-[11px] text-slate-500">
              Clichés to cut: {feedback.cliches.map((c) => `"${c.phrase}" ×${c.count}`).join(", ")}
            </p>
          )}

          {comparison && (comparison.fixedIssues.length > 0 || comparison.newIssues.length > 0) && (
            <p className="mt-3 text-[11px] text-slate-500">
              {comparison.fixedIssues.length > 0 && (
                <span className="mr-3 inline-flex items-center gap-1 text-emerald-700">
                  <CheckCircle2 className="h-3 w-3" /> fixed: {comparison.fixedIssues.join(", ")}
                </span>
              )}
              {comparison.newIssues.length > 0 && (
                <span className="inline-flex items-center gap-1 text-red-700">
                  <AlertTriangle className="h-3 w-3" /> new: {comparison.newIssues.join(", ")}
                </span>
              )}
            </p>
          )}
        </div>
      )}

      {/* #18 Scholarship essay adapter — one essay vs. the saved scholarships */}
      <div className="rounded-2xl border border-slate-200 bg-white p-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h3 className="flex items-center gap-1.5 text-xs font-extrabold uppercase tracking-wide text-slate-500">
              <Sparkles className="h-3.5 w-3.5" /> Scholarship fit
            </h3>
            <p className="mt-0.5 max-w-xl text-[11px] text-slate-500">
              Score this essay against your saved scholarships — word limit, themes, major, country, GPA and English.
            </p>
          </div>
          <button
            onClick={() => void analyzeFit()}
            disabled={fitBusy || text.trim().length < 50}
            className="rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-indigo-700 disabled:opacity-60"
          >
            {fitBusy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "Analyze fit"}
          </button>
        </div>
        {text.trim().length < 50 && (
          <p className="mt-2 text-[11px] text-slate-400">Write at least 50 characters first.</p>
        )}
        {fitError && <p className="mt-2 text-xs font-semibold text-rose-600">{fitError}</p>}

        {fitMatches && (
          <div className="mt-3 space-y-3">
            {fitMatches.length === 0 && (
              <p className="text-xs text-slate-400">No saved scholarships yet — save some in the Scholarship Hub.</p>
            )}
            {fitMatches.map((m) => {
              const a = adapted[m.scholarshipId];
              return (
                <div key={m.scholarshipId} className="rounded-xl border border-slate-200 bg-slate-50/50 p-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="text-xs font-bold text-slate-800">{m.title}</span>
                    <span className="text-sm font-black text-indigo-700">{m.fit}%</span>
                  </div>
                  <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-slate-200">
                    <div className="h-full rounded-full bg-indigo-500" style={{ width: `${m.fit}%` }} />
                  </div>
                  {m.matched.length > 0 && (
                    <ul className="mt-2 space-y-0.5">
                      {m.matched.map((s, i) => (
                        <li key={i} className="flex items-start gap-1.5 text-[11px] text-emerald-700">
                          <CheckCircle2 className="mt-0.5 h-3 w-3 shrink-0" /> {s}
                        </li>
                      ))}
                    </ul>
                  )}
                  {m.gaps.length > 0 && (
                    <ul className="mt-1.5 space-y-0.5">
                      {m.gaps.map((s, i) => (
                        <li key={i} className="flex items-start gap-1.5 text-[11px] text-amber-700">
                          <AlertTriangle className="mt-0.5 h-3 w-3 shrink-0" /> {s}
                        </li>
                      ))}
                    </ul>
                  )}
                  {m.plan.length > 0 && (
                    <ol className="mt-2 list-decimal space-y-0.5 pl-4 text-[11px] text-slate-600">
                      {m.plan.map((s, i) => (
                        <li key={i}>{s}</li>
                      ))}
                    </ol>
                  )}
                  <button
                    onClick={() => void adaptEssay(m.scholarshipId)}
                    disabled={adaptingId !== null}
                    className="mt-2 rounded-lg border border-indigo-200 bg-indigo-50 px-2.5 py-1 text-[11px] font-bold text-indigo-700 hover:bg-indigo-100 disabled:opacity-60"
                  >
                    {adaptingId === m.scholarshipId ? (
                      <Loader2 className="h-3 w-3 animate-spin" />
                    ) : (
                      "Adapt essay with AI"
                    )}
                  </button>
                  {a && (
                    <div className="mt-2">
                      {a.text ? (
                        <pre className="max-h-64 overflow-auto whitespace-pre-wrap rounded-lg bg-slate-900 p-3 text-[11px] leading-relaxed text-slate-100">
                          {a.text}
                        </pre>
                      ) : (
                        <p className="text-[11px] font-semibold text-amber-700">
                          AI is unavailable right now — follow the plan above by hand.
                        </p>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {versions.length > 0 && (
        <div className="rounded-2xl border border-slate-200 bg-white p-4">
          <h3 className="flex items-center gap-1.5 text-xs font-extrabold uppercase tracking-wide text-slate-500">
            <History className="h-3.5 w-3.5" /> Version history
          </h3>
          <ul className="mt-2 divide-y divide-slate-100">
            {versions.map((v) => (
              <li key={v.id} className="flex flex-wrap items-center gap-3 py-2">
                <span className="rounded-md bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-600">
                  v{v.versionNumber}
                </span>
                <span className="min-w-0 flex-1 truncate text-xs font-semibold text-slate-700">{v.title}</span>
                <span className="text-[11px] text-slate-400">{v.wordCount} words</span>
                <span className="text-xs font-extrabold text-indigo-700">{v.rubricTotal ?? "—"}</span>
                <button
                  onClick={() => setText(v.content)}
                  className="rounded-lg border border-slate-200 px-2.5 py-1 text-[11px] font-bold text-slate-600 hover:bg-slate-50"
                >
                  Load
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* #24 — Peer review: open my draft for other students, or review theirs */}
      <PeerReviewSection profileId={activeProfile.id} />
    </div>
  );
}

// ---------------------------------------------------------------------------
// #24 — Peer review
//
// Two halves: (a) the author opens a saved version for review and later sees
// the per-dimension AVERAGES — no single reviewer can move the number; (b)
// any student can review an opened essay with the five rubric dimensions
// plus a total and a comment. Reviewers are shown anonymized ("Student #123")
// and the author can never review their own essay (enforced in the API).

interface PeerVersion {
  id: number;
  title: string;
  versionNumber: number;
  openForReview: boolean;
}

interface PeerReviewRow {
  id: number;
  reviewer: string;
  hook: number | null;
  structure: number | null;
  specificity: number | null;
  language: number | null;
  fit: number | null;
  total: number | null;
  comment: string;
}

interface PeerAggregate {
  count: number;
  avg: {
    hook: number | null;
    structure: number | null;
    specificity: number | null;
    language: number | null;
    fit: number | null;
    total: number | null;
  };
}

interface OpenEssay {
  id: number;
  title: string;
  essayType: string;
  wordCount: number;
  content: string;
  versionNumber: number;
  rubricTotal: number | null;
  author: string;
  reviewCount: number;
}

function PeerScoreCell({ label, v }: { label: string; v: number | null }) {
  return (
    <div className="rounded-lg bg-slate-50 px-2 py-1.5 text-center">
      <div className="text-[9px] font-bold uppercase tracking-wide text-slate-400">{label}</div>
      <div className="text-xs font-extrabold text-slate-700">{v == null ? "—" : v}</div>
    </div>
  );
}

const PEER_DIMS = [
  { key: "hook", label: "Hook" },
  { key: "structure", label: "Structure" },
  { key: "specificity", label: "Specificity" },
  { key: "language", label: "Language" },
  { key: "fit", label: "Fit" },
  { key: "total", label: "Total" },
] as const;

function PeerReviewSection({ profileId }: { profileId: number }) {
  const [myVersions, setMyVersions] = useState<PeerVersion[]>([]);
  const [selectedVersion, setSelectedVersion] = useState<number | null>(null);
  const [reviews, setReviews] = useState<PeerReviewRow[]>([]);
  const [agg, setAgg] = useState<PeerAggregate | null>(null);
  const [openEssays, setOpenEssays] = useState<OpenEssay[]>([]);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<{ kind: "ok" | "err"; text: string } | null>(null);
  const [reviewFor, setReviewFor] = useState<OpenEssay | null>(null);
  const [form, setForm] = useState<Record<string, string>>({
    hook: "",
    structure: "",
    specificity: "",
    language: "",
    fit: "",
    total: "",
    comment: "",
  });

  // My versions + the open list — both are convenience views, never fatal.
  useEffect(() => {
    let live = true;
    fetch(`/api/essays?profileId=${profileId}`, { cache: "no-store" })
      .then((r) => r.json().then((b) => (r.ok ? b : Promise.reject(new Error(b?.error ?? `HTTP ${r.status}`)))))
      .then((b) => {
        if (!live) return;
        const vs: PeerVersion[] = (b.versions ?? []).map((v: PeerVersion) => ({
          id: v.id,
          title: v.title,
          versionNumber: v.versionNumber,
          openForReview: Boolean(v.openForReview),
        }));
        setMyVersions(vs);
        if (vs.length) setSelectedVersion((cur) => cur ?? vs[0].id);
      })
      .catch(() => {});
    fetch("/api/essays/reviews?open=1", { cache: "no-store" })
      .then((r) => r.json().then((b) => (r.ok ? b : Promise.reject(new Error(b?.error ?? `HTTP ${r.status}`)))))
      .then((b) => {
        if (live) setOpenEssays(b.items ?? []);
      })
      .catch(() => {});
    return () => {
      live = false;
    };
  }, [profileId]);

  // Reviews + averages for the selected version.
  useEffect(() => {
    if (selectedVersion == null) {
      setReviews([]);
      setAgg(null);
      return;
    }
    let live = true;
    fetch(`/api/essays/reviews?essayVersionId=${selectedVersion}`, { cache: "no-store" })
      .then((r) => r.json().then((b) => (r.ok ? b : Promise.reject(new Error(b?.error ?? `HTTP ${r.status}`)))))
      .then((b) => {
        if (!live) return;
        setReviews(b.reviews ?? []);
        setAgg(b.aggregate ?? null);
      })
      .catch(() => {});
    return () => {
      live = false;
    };
  }, [selectedVersion]);

  const setFlag = async (flag: boolean) => {
    if (selectedVersion == null) return;
    setBusy(true);
    setNotice(null);
    try {
      const res = await fetch("/api/essays", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: selectedVersion, openForReview: flag }),
      });
      const b = await res.json();
      if (!res.ok) throw new Error(b?.error ?? `HTTP ${res.status}`);
      setMyVersions((vs) => vs.map((v) => (v.id === selectedVersion ? { ...v, openForReview: flag } : v)));
      setNotice({ kind: "ok", text: flag ? "This version is open for peer review." : "Closed for peer review." });
    } catch (e) {
      setNotice({ kind: "err", text: e instanceof Error ? e.message : "Failed to update" });
    } finally {
      setBusy(false);
    }
  };

  const submitReview = async () => {
    if (!reviewFor) return;
    setBusy(true);
    setNotice(null);
    const body: Record<string, unknown> = { essayVersionId: reviewFor.id };
    for (const d of PEER_DIMS) {
      const raw = form[d.key]?.trim();
      body[d.key] = raw === "" ? null : Number(raw);
    }
    body.comment = (form.comment ?? "").trim();
    try {
      const res = await fetch("/api/essays/reviews", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const b = await res.json();
      if (!res.ok) throw new Error(b?.error ?? `HTTP ${res.status}`);
      setReviewFor(null);
      setForm({ hook: "", structure: "", specificity: "", language: "", fit: "", total: "", comment: "" });
      setNotice({ kind: "ok", text: "Review sent — thank you." });
      const r = await fetch("/api/essays/reviews?open=1", { cache: "no-store" });
      if (r.ok) {
        const b2 = await r.json();
        setOpenEssays(b2.items ?? []);
      }
    } catch (e) {
      setNotice({ kind: "err", text: e instanceof Error ? e.message : "Failed to save the review" });
    } finally {
      setBusy(false);
    }
  };

  const selected = myVersions.find((v) => v.id === selectedVersion);

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4">
      <h3 className="flex items-center gap-1.5 text-xs font-extrabold uppercase tracking-wide text-slate-500">
        <MessageSquare className="h-3.5 w-3.5" /> Peer review
      </h3>
      <p className="mt-1 max-w-2xl text-[11px] text-slate-500">
        Open one of your saved drafts for other students to review — or review an essay someone else opened. You can
        never review your own essay, and reviewers stay anonymized.
      </p>

      {notice && (
        <p
          className={`mt-2 rounded-lg px-3 py-2 text-xs font-semibold ${
            notice.kind === "ok" ? "bg-emerald-50 text-emerald-700" : "bg-rose-50 text-rose-700"
          }`}
        >
          {notice.text}
        </p>
      )}

      <div className="mt-3 grid gap-4 md:grid-cols-2">
        {/* ---- my draft: open / close + incoming averages ------------------ */}
        <div className="rounded-xl border border-slate-200 p-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <label className="text-[10px] font-extrabold uppercase tracking-wide text-slate-400">My draft</label>
            {myVersions.length > 0 && (
              <select
                value={selectedVersion ?? ""}
                onChange={(e) => setSelectedVersion(Number(e.target.value))}
                className="rounded-lg border border-slate-200 bg-white px-2 py-1 text-[11px] font-semibold text-slate-700"
              >
                {myVersions.map((v) => (
                  <option key={v.id} value={v.id}>
                    v{v.versionNumber} · {v.title}
                  </option>
                ))}
              </select>
            )}
          </div>

          {myVersions.length === 0 ? (
            <p className="mt-2 text-[11px] text-slate-500">Save an essay first, then open it here for peer review.</p>
          ) : (
            <>
              <div className="mt-2 flex items-center gap-2">
                <button
                  onClick={() => void setFlag(!selected?.openForReview)}
                  disabled={busy}
                  className={`rounded-lg px-3 py-1.5 text-[11px] font-bold disabled:opacity-60 ${
                    selected?.openForReview
                      ? "border border-rose-200 bg-rose-50 text-rose-700 hover:bg-rose-100"
                      : "bg-indigo-600 text-white hover:bg-indigo-700"
                  }`}
                >
                  {selected?.openForReview ? "Close for review" : "Open for peer review"}
                </button>
                {selected?.openForReview && (
                  <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[9px] font-bold text-emerald-700">
                    OPEN
                  </span>
                )}
              </div>

              {agg && agg.count > 0 ? (
                <div className="mt-3">
                  <p className="text-[10px] font-extrabold uppercase tracking-wide text-slate-400">
                    Average of {agg.count} review{agg.count > 1 ? "s" : ""}
                  </p>
                  <div className="mt-1.5 grid grid-cols-6 gap-1.5">
                    <PeerScoreCell label="Hook" v={agg.avg.hook} />
                    <PeerScoreCell label="Str." v={agg.avg.structure} />
                    <PeerScoreCell label="Spec." v={agg.avg.specificity} />
                    <PeerScoreCell label="Lang." v={agg.avg.language} />
                    <PeerScoreCell label="Fit" v={agg.avg.fit} />
                    <PeerScoreCell label="Total" v={agg.avg.total} />
                  </div>
                  <ul className="mt-2 space-y-1.5">
                    {reviews.map((r) => (
                      <li key={r.id} className="rounded-lg bg-slate-50 p-2">
                        <div className="flex items-center justify-between text-[10px] font-bold text-slate-600">
                          <span>{r.reviewer}</span>
                          <span className="font-extrabold text-indigo-700">{r.total ?? "—"}</span>
                        </div>
                        <div className="mt-1 flex flex-wrap gap-1">
                          <PeerScoreCell label="H" v={r.hook} />
                          <PeerScoreCell label="S" v={r.structure} />
                          <PeerScoreCell label="Sp" v={r.specificity} />
                          <PeerScoreCell label="L" v={r.language} />
                          <PeerScoreCell label="F" v={r.fit} />
                        </div>
                        {r.comment && <p className="mt-1 text-[11px] text-slate-600">{r.comment}</p>}
                      </li>
                    ))}
                  </ul>
                </div>
              ) : (
                <p className="mt-3 text-[11px] text-slate-400">
                  {selected?.openForReview ? "No reviews yet — students will see this essay in their Peer review list." : "Open the version to collect reviews."}
                </p>
              )}
            </>
          )}
        </div>

        {/* ---- review someone else's opened essay -------------------------- */}
        <div className="rounded-xl border border-slate-200 p-3">
          <p className="text-[10px] font-extrabold uppercase tracking-wide text-slate-400">
            Open for your review ({openEssays.length})
          </p>
          {openEssays.length === 0 ? (
            <p className="mt-2 text-[11px] text-slate-500">
              No essays are open for review right now. When a student opens a draft, it shows up here.
            </p>
          ) : !reviewFor ? (
            <ul className="mt-2 space-y-1.5">
              {openEssays.slice(0, 8).map((o) => (
                <li key={o.id} className="flex items-center justify-between gap-2 rounded-lg bg-slate-50 p-2">
                  <div className="min-w-0">
                    <p className="truncate text-[11px] font-bold text-slate-700">
                      v{o.versionNumber} · {o.title}
                    </p>
                    <p className="text-[10px] text-slate-400">
                      {o.author} · {o.wordCount} words · {o.reviewCount} review{o.reviewCount === 1 ? "" : "s"}
                    </p>
                  </div>
                  <button
                    onClick={() => setReviewFor(o)}
                    className="flex shrink-0 items-center gap-1 rounded-lg bg-indigo-600 px-2.5 py-1 text-[10px] font-bold text-white hover:bg-indigo-700"
                  >
                    <PenLine className="h-3 w-3" /> Review
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <div className="mt-2">
              <div className="flex items-center justify-between gap-2">
                <p className="truncate text-[11px] font-bold text-slate-700">
                  v{reviewFor.versionNumber} · {reviewFor.title}
                </p>
                <button
                  onClick={() => setReviewFor(null)}
                  className="text-[10px] font-bold text-slate-400 hover:text-slate-600"
                >
                  ← back
                </button>
              </div>
              <pre className="mt-1 max-h-36 overflow-auto whitespace-pre-wrap rounded-lg bg-slate-900 p-2 text-[10px] leading-relaxed text-slate-100">
                {reviewFor.content}
              </pre>
              <div className="mt-2 grid grid-cols-3 gap-1.5">
                {PEER_DIMS.map((d) => (
                  <label key={d.key} className="block">
                    <span className="text-[9px] font-bold uppercase tracking-wide text-slate-400">{d.label}</span>
                    <input
                      type="number"
                      min={0}
                      max={100}
                      placeholder="0–100"
                      value={form[d.key] ?? ""}
                      onChange={(e) => setForm((f) => ({ ...f, [d.key]: e.target.value }))}
                      className="mt-0.5 w-full rounded-lg border border-slate-200 px-2 py-1 text-[11px] font-semibold text-slate-700"
                    />
                  </label>
                ))}
              </div>
              <textarea
                placeholder="What works? What would you change? (optional)"
                rows={3}
                maxLength={2000}
                value={form.comment ?? ""}
                onChange={(e) => setForm((f) => ({ ...f, comment: e.target.value }))}
                className="mt-1.5 w-full rounded-lg border border-slate-200 px-2 py-1.5 text-[11px] text-slate-700"
              />
              <button
                onClick={() => void submitReview()}
                disabled={busy}
                className="mt-2 flex items-center gap-1.5 rounded-lg bg-indigo-600 px-3 py-1.5 text-[11px] font-bold text-white hover:bg-indigo-700 disabled:opacity-60"
              >
                <Send className="h-3 w-3" /> Send review
              </button>
            </div>
          )}
        </div>
      </div>

      <p className="mt-3 flex items-center gap-1 text-[10px] text-slate-400">
        <Eye className="h-3 w-3" />
        Reviews are structured and averaged — no single reader moves your number, and no names are shared either way.
      </p>
    </div>
  );
}
