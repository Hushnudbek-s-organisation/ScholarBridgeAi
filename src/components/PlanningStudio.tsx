"use client";

import React, { useCallback, useEffect, useState } from "react";
import {
  AlertTriangle,
  Calculator,
  CheckCircle2,
  Copy,
  FileText,
  Loader2,
  Table2,
  Wallet,
} from "lucide-react";
import { StudentProfile } from "./Navbar";

/**
 * Planning Studio (Phase 3) — cost calculator, scholarship portfolio, CV
 * builder and comparison table.
 *
 * Every number here is derived from the student's own data. Where a university
 * has not published a figure the row is marked "estimated" and listed as
 * something to verify — an estimate that looks like a quote is how students end
 * up a year short of funding.
 */

interface CostLine {
  key: string;
  label: string;
  annualUsd: number;
  totalUsd: number;
  estimated: boolean;
}

interface CostBreakdown {
  lines: CostLine[];
  annualTotalUsd: number;
  totalUsd: number;
  unknowns: string[];
  scholarship: {
    guaranteedAnnualUsd: number;
    expectedAnnualUsd: number;
    bestCaseAnnualUsd: number;
    coveragePct: number;
    misaligned: string[];
  };
  net: {
    annualAfterScholarshipUsd: number;
    totalAfterScholarshipUsd: number;
    familyContributionUsd: number;
    gapAnnualUsd: number;
    gapTotalUsd: number;
    affordable: boolean;
  };
  verdict: string;
}

interface Portfolio {
  count: number;
  expectedAnnualUsd: number;
  expectedCoveragePct: number;
  chanceOfAnyAwardPct: number;
  diversification: "good" | "thin" | "risky";
  advice: string[];
}

interface CvSection {
  heading: string;
  items: string[];
}

interface Cv {
  name: string;
  headline: string;
  contact: string[];
  sections: CvSection[];
  missing: string[];
  warnings: string[];
  estimatedPages: number;
  totalItems: number;
}

interface CompareRow {
  key: string;
  label: string;
  values: Record<number, string | null>;
  winner: number | null;
  winnerReason?: string;
}

interface Comparison {
  rows: CompareRow[];
  scores: Record<number, { wins: number; known: number; unknown: number }>;
  verdict: string;
  dataGaps: { universityId: number; name: string; missing: string[] }[];
}

interface PlanningData {
  costs: CostBreakdown;
  portfolio: Portfolio;
  costTarget: { id: number; name: string; country: string } | null;
  universities: { id: number; name: string; country: string }[];
  cv: Cv;
  cvText: string;
  comparison: Comparison;
}

const money = (v: number) => `$${Math.round(v).toLocaleString("en-US")}`;

const TABS = [
  { id: "cost", label: "Cost calculator", icon: Calculator },
  { id: "scholarship", label: "Scholarship portfolio", icon: Wallet },
  { id: "cv", label: "CV builder", icon: FileText },
  { id: "compare", label: "Compare universities", icon: Table2 },
] as const;

interface PlanningStudioProps {
  activeProfile: StudentProfile | null;
}

export function PlanningStudio({ activeProfile }: PlanningStudioProps) {
  const [data, setData] = useState<PlanningData | null>(null);
  const [universityId, setUniversityId] = useState<number | null>(null);
  const [tab, setTab] = useState<(typeof TABS)[number]["id"]>("cost");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);

  const load = useCallback(async () => {
    if (!activeProfile?.id) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError("");
    try {
      const params = new URLSearchParams({ profileId: String(activeProfile.id) });
      if (universityId) params.set("universityId", String(universityId));
      const res = await fetch(`/api/planning?${params.toString()}`);
      const payload = await res.json();
      if (!res.ok) throw new Error(payload.error || "Failed to build your plan");
      setData(payload);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to build your plan");
    } finally {
      setLoading(false);
    }
  }, [activeProfile?.id, universityId]);

  useEffect(() => {
    void load();
  }, [load]);

  if (!activeProfile) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-6 text-sm text-slate-500">
        Sign in to build your plan.
      </div>
    );
  }

  const copyCv = async () => {
    if (!data) return;
    try {
      await navigator.clipboard.writeText(data.cvText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setError("Could not copy — select the text manually.");
    }
  };

  const compareIds = data?.universities.slice(0, 6) ?? [];

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-slate-200 bg-white p-4">
        <h2 className="text-lg font-bold text-slate-900">Planning studio</h2>
        <p className="mt-0.5 text-xs text-slate-500">
          Real costs, real funding gaps, a CV built from your profile, and a side-by-side
          comparison — all from your own data.
        </p>

        <div className="mt-3 flex flex-wrap gap-1.5">
          {TABS.map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`flex items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-bold ${
                tab === t.id ? "bg-indigo-600 text-white" : "border border-slate-200 text-slate-600 hover:bg-slate-50"
              }`}
            >
              <t.icon className="h-3.5 w-3.5" />
              {t.label}
            </button>
          ))}
        </div>

        {data && data.universities.length > 0 && (tab === "cost" || tab === "compare") && (
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <span className="text-[11px] font-bold uppercase tracking-wide text-slate-400">University</span>
            {tab === "cost" ? (
              <select
                className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs"
                value={universityId ?? data.costTarget?.id ?? ""}
                onChange={(e) => setUniversityId(Number(e.target.value))}
              >
                {data.universities.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.name} ({u.country})
                  </option>
                ))}
              </select>
            ) : (
              <span className="text-xs text-slate-600">
                {compareIds.length} saved — showing up to 6
              </span>
            )}
          </div>
        )}
      </div>

      {error && (
        <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">{error}</div>
      )}

      {loading && !data && (
        <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-6 text-sm text-slate-500">
          <Loader2 className="h-4 w-4 animate-spin" /> Building…
        </div>
      )}

      {data && (
        <>
          {/* ------------------------- COST ------------------------- */}
          {tab === "cost" && (
            <div className="space-y-3">
              <div className="rounded-2xl border border-slate-200 bg-white p-4">
                <h3 className="text-sm font-bold text-slate-900">
                  {data.costTarget ? `${data.costTarget.name} — true annual cost` : "Annual cost"}
                </h3>
                <ul className="mt-3 divide-y divide-slate-100">
                  {data.costs.lines.map((line) => (
                    <li key={line.key} className="flex items-center justify-between py-2">
                      <span className="flex items-center gap-2 text-xs text-slate-700">
                        {line.label}
                        {line.estimated && (
                          <span className="rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-[9px] font-bold text-amber-700">
                            estimated
                          </span>
                        )}
                      </span>
                      <span className="text-xs font-bold text-slate-900">
                        {money(line.annualUsd)}
                        <span className="ml-1 font-normal text-slate-400">/yr</span>
                      </span>
                    </li>
                  ))}
                </ul>
                <div className="mt-2 flex items-center justify-between border-t border-slate-200 pt-2">
                  <span className="text-xs font-extrabold text-slate-800">Total per year</span>
                  <span className="text-base font-extrabold text-slate-900">{money(data.costs.annualTotalUsd)}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-[11px] text-slate-500">Whole programme</span>
                  <span className="text-xs font-bold text-slate-600">{money(data.costs.totalUsd)}</span>
                </div>
              </div>

              {data.costs.unknowns.length > 0 && (
                <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4">
                  <h4 className="text-xs font-extrabold uppercase tracking-wide text-amber-800">
                    Verify these — they are estimates, not quotes
                  </h4>
                  <ul className="mt-1.5 space-y-1">
                    {data.costs.unknowns.map((u, i) => (
                      <li key={i} className="flex gap-1.5 text-xs text-amber-900">
                        <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                        <span>{u}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              <div
                className={`rounded-2xl border p-4 ${
                  data.costs.net.affordable ? "border-emerald-200 bg-emerald-50" : "border-rose-200 bg-rose-50"
                }`}
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="text-xs font-extrabold uppercase tracking-wide text-slate-700">
                    Remaining gap after funding
                  </span>
                  <span className="text-xl font-extrabold text-slate-900">
                    {money(data.costs.net.gapAnnualUsd)}
                    <span className="text-xs font-bold text-slate-500">/yr</span>
                  </span>
                </div>
                <p className="mt-2 text-xs leading-relaxed text-slate-700">{data.costs.verdict}</p>
                <p className="mt-2 text-[11px] text-slate-500">
                  Best-case scholarships {money(data.costs.scholarship.bestCaseAnnualUsd)}/yr · family{" "}
                  {money(data.costs.net.familyContributionUsd)}/yr · total gap{" "}
                  {money(data.costs.net.gapTotalUsd)}
                </p>
              </div>
            </div>
          )}

          {/* --------------------- SCHOLARSHIPS --------------------- */}
          {tab === "scholarship" && (
            <div className="space-y-3">
              <div className="grid gap-3 sm:grid-cols-4">
                {[
                  { label: "Saved", value: String(data.portfolio.count) },
                  { label: "Expected /yr", value: money(data.portfolio.expectedAnnualUsd) },
                  { label: "Coverage", value: `${data.portfolio.expectedCoveragePct}%` },
                  { label: "Chance of ≥1 award", value: `${data.portfolio.chanceOfAnyAwardPct}%` },
                ].map((s) => (
                  <div key={s.label} className="rounded-2xl border border-slate-200 bg-white p-4 text-center">
                    <div className="text-xl font-extrabold text-slate-900">{s.value}</div>
                    <div className="text-[10px] font-bold uppercase tracking-wide text-slate-400">{s.label}</div>
                  </div>
                ))}
              </div>

              <div
                className={`rounded-2xl border p-4 ${
                  data.portfolio.diversification === "good"
                    ? "border-emerald-200 bg-emerald-50"
                    : data.portfolio.diversification === "thin"
                      ? "border-amber-200 bg-amber-50"
                      : "border-rose-200 bg-rose-50"
                }`}
              >
                <h3 className="text-xs font-extrabold uppercase tracking-wide text-slate-700">
                  Portfolio: {data.portfolio.diversification}
                </h3>
                <ul className="mt-2 space-y-1.5">
                  {data.portfolio.advice.map((a, i) => (
                    <li key={i} className="flex gap-1.5 text-xs text-slate-700">
                      <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-indigo-600" />
                      <span>{a}</span>
                    </li>
                  ))}
                  {data.portfolio.advice.length === 0 && (
                    <li className="text-xs text-slate-600">
                      A well-balanced portfolio. Keep the deadlines in the calendar.
                    </li>
                  )}
                </ul>
                <p className="mt-2 text-[11px] text-slate-500">
                  Win probabilities are a neutral 20% prior — we do not know your odds, and inventing
                  them would be worse than useless. Replace them with your own read.
                </p>
              </div>

              {data.costs.scholarship.misaligned.map((m, i) => (
                <p
                  key={i}
                  className="flex gap-1.5 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs text-amber-900"
                >
                  <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                  <span>{m}</span>
                </p>
              ))}
            </div>
          )}

          {/* --------------------------- CV --------------------------- */}
          {tab === "cv" && (
            <div className="space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-slate-200 bg-white p-4">
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Application CV</h3>
                  <p className="text-[11px] text-slate-500">
                    {data.cv.totalItems} entries · about {data.cv.estimatedPages} page
                    {data.cv.estimatedPages === 1 ? "" : "s"}
                  </p>
                </div>
                <button
                  onClick={() => void copyCv()}
                  className="flex items-center gap-1.5 rounded-xl bg-indigo-600 px-4 py-2 text-xs font-bold text-white hover:bg-indigo-700"
                >
                  <Copy className="h-3.5 w-3.5" />
                  {copied ? "Copied" : "Copy as text"}
                </button>
              </div>

              {data.cv.warnings.length > 0 && (
                <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4">
                  <ul className="space-y-1">
                    {data.cv.warnings.map((w, i) => (
                      <li key={i} className="flex gap-1.5 text-xs text-amber-900">
                        <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                        <span>{w}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {data.cv.missing.length > 0 && (
                <div className="rounded-2xl border border-slate-200 bg-white p-4">
                  <h4 className="text-xs font-extrabold uppercase tracking-wide text-slate-500">
                    Missing from your profile
                  </h4>
                  <p className="mt-1 text-[11px] text-slate-500">
                    These are left out of the CV rather than invented. Fill them in and the CV grows.
                  </p>
                  <ul className="mt-2 grid gap-1 sm:grid-cols-2">
                    {data.cv.missing.map((m, i) => (
                      <li key={i} className="text-xs text-slate-600">
                        · {m}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              <div className="rounded-2xl border border-slate-200 bg-white p-5">
                <h3 className="text-base font-extrabold uppercase tracking-wide text-slate-900">{data.cv.name}</h3>
                <p className="text-xs text-slate-600">{data.cv.headline}</p>
                {data.cv.contact.length > 0 && (
                  <p className="text-[11px] text-slate-500">{data.cv.contact.join("  ·  ")}</p>
                )}
                <div className="mt-4 space-y-3">
                  {data.cv.sections.map((section) => (
                    <div key={section.heading}>
                      <h4 className="text-[11px] font-extrabold uppercase tracking-wide text-indigo-700">
                        {section.heading}
                      </h4>
                      <ul className="mt-1 space-y-0.5">
                        {section.items.map((item, i) => (
                          <li key={i} className="text-xs text-slate-700">
                            • {item}
                          </li>
                        ))}
                      </ul>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* ------------------------ COMPARE ------------------------ */}
          {tab === "compare" && (
            <div className="space-y-3">
              <div className="rounded-2xl border border-slate-200 bg-white p-4">
                <p className="text-xs text-slate-700">{data.comparison.verdict}</p>
              </div>

              {compareIds.length < 2 ? (
                <div className="rounded-xl border border-dashed border-slate-300 bg-white px-4 py-8 text-center text-sm text-slate-500">
                  Save at least two universities to compare them.
                </div>
              ) : (
                <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="border-b border-slate-200 bg-slate-50">
                        <th className="px-3 py-2 font-extrabold text-slate-600">Measure</th>
                        {compareIds.map((u) => (
                          <th key={u.id} className="px-3 py-2 font-extrabold text-slate-700">
                            {u.name}
                            {data.comparison.scores[u.id] && (
                              <span className="ml-1 rounded bg-indigo-100 px-1.5 py-0.5 text-[9px] text-indigo-700">
                                {data.comparison.scores[u.id].wins} won
                              </span>
                            )}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {data.comparison.rows.map((row) => (
                        <tr key={row.key} className="border-b border-slate-100">
                          <td className="px-3 py-2 font-semibold text-slate-600">{row.label}</td>
                          {compareIds.map((u) => {
                            const value = row.values[u.id];
                            const isWinner = row.winner === u.id;
                            return (
                              <td
                                key={u.id}
                                className={`px-3 py-2 ${isWinner ? "bg-emerald-50 font-bold text-emerald-800" : "text-slate-700"}`}
                              >
                                {value ?? <span className="text-slate-300">not published</span>}
                              </td>
                            );
                          })}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {data.comparison.dataGaps.length > 0 && (
                <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4">
                  <h4 className="text-xs font-extrabold uppercase tracking-wide text-amber-800">Missing data</h4>
                  <ul className="mt-1.5 space-y-1">
                    {data.comparison.dataGaps.map((gap) => (
                      <li key={gap.universityId} className="text-xs text-amber-900">
                        <b>{gap.name}:</b> {gap.missing.join(", ")}
                      </li>
                    ))}
                  </ul>
                  <p className="mt-2 text-[11px] text-amber-800">
                    A blank cell is not a zero — it means the university has not published it.
                  </p>
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}
