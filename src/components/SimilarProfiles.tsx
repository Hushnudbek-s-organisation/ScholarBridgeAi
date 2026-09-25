"use client";

import React, { useCallback, useEffect, useState } from "react";
import { Info, Loader2, ShieldCheck, Users } from "lucide-react";
import { StudentProfile } from "./Navbar";

/**
 * Accepted students with a similar profile (#10).
 *
 * The most persuasive evidence a student can see is "someone like me got in".
 * It is also other people's data, so the UI carries the constraints:
 *   - only opt-in rows appear (the API filters before loading them),
 *   - rejections are shown alongside acceptances,
 *   - a small sample never renders as a percentage.
 */

interface Match {
  similarity: number;
  universityName: string;
  result: "accepted" | "rejected" | "waitlisted" | "deferred" | "withdrawn";
  matchedOn: string[];
  summary: string;
}

interface SimilarityResult {
  matches: Match[];
  accepted: number;
  rejected: number;
  waitlisted: number;
  total: number;
  acceptanceShare: number | null;
  sampleNote: string;
  positionNote: string;
  consentNote?: string;
  myConsent?: boolean;
}

const RESULT_STYLE: Record<Match["result"], string> = {
  accepted: "bg-emerald-100 text-emerald-800",
  rejected: "bg-rose-100 text-rose-800",
  waitlisted: "bg-amber-100 text-amber-800",
  deferred: "bg-sky-100 text-sky-800",
  withdrawn: "bg-slate-200 text-slate-600",
};

interface SimilarProfilesProps {
  activeProfile: StudentProfile | null;
}

export function SimilarProfiles({ activeProfile }: SimilarProfilesProps) {
  const [data, setData] = useState<SimilarityResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    if (!activeProfile?.id) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`/api/similar-profiles?profileId=${activeProfile.id}`);
      const payload = await res.json();
      if (!res.ok) throw new Error(payload.error || "Failed to load similar profiles");
      setData(payload);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load similar profiles");
    } finally {
      setLoading(false);
    }
  }, [activeProfile?.id]);

  useEffect(() => {
    void load();
  }, [load]);

  if (!activeProfile) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-6 text-sm text-slate-500">
        Sign in to see students with a profile like yours.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-slate-200 bg-white p-4">
        <h2 className="flex items-center gap-2 text-lg font-bold text-slate-900">
          <Users className="h-5 w-5 text-indigo-600" />
          Students like you
        </h2>
        <p className="mt-0.5 text-xs text-slate-500">
          Real outcomes from ScholarBridge students with a similar academic profile — including
          the rejections.
        </p>
      </div>

      {error && (
        <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">{error}</div>
      )}

      {loading && (
        <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-6 text-sm text-slate-500">
          <Loader2 className="h-4 w-4 animate-spin" /> Looking for similar profiles…
        </div>
      )}

      {data && (
        <>
          <div className="grid gap-3 sm:grid-cols-4">
            <div className="rounded-2xl border border-slate-200 bg-white p-4 text-center">
              <div className="text-2xl font-extrabold text-slate-900">{data.total}</div>
              <div className="text-[10px] font-bold uppercase tracking-wide text-slate-400">
                similar outcomes
              </div>
            </div>
            <div className="rounded-2xl border border-emerald-100 bg-emerald-50/50 p-4 text-center">
              <div className="text-2xl font-extrabold text-emerald-700">{data.accepted}</div>
              <div className="text-[10px] font-bold uppercase tracking-wide text-emerald-600">accepted</div>
            </div>
            <div className="rounded-2xl border border-rose-100 bg-rose-50/50 p-4 text-center">
              <div className="text-2xl font-extrabold text-rose-700">{data.rejected}</div>
              <div className="text-[10px] font-bold uppercase tracking-wide text-rose-600">rejected</div>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-white p-4 text-center">
              {/* A percentage only when the sample can carry one. */}
              <div className="text-2xl font-extrabold text-slate-900">
                {data.acceptanceShare === null ? "—" : `${data.acceptanceShare}%`}
              </div>
              <div className="text-[10px] font-bold uppercase tracking-wide text-slate-400">
                accepted share
              </div>
            </div>
          </div>

          <p className="flex items-start gap-1.5 text-xs text-slate-600">
            <Info className="mt-0.5 h-3.5 w-3.5 shrink-0 text-slate-400" />
            <span>{data.sampleNote}</span>
          </p>

          {data.positionNote && (
            <p className="rounded-xl bg-indigo-50 px-4 py-3 text-xs text-slate-700">{data.positionNote}</p>
          )}

          {data.matches.length > 0 ? (
            <ul className="space-y-2">
              {data.matches.map((m, i) => (
                <li
                  key={`${m.universityName}-${m.result}-${i}`}
                  className="rounded-2xl border border-slate-200 bg-white p-4"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="min-w-0">
                      <h3 className="truncate text-sm font-bold text-slate-900">{m.universityName}</h3>
                      <p className="text-[11px] text-slate-500">{m.summary}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="rounded-md bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-600">
                        {m.similarity}% similar
                      </span>
                      <span className={`rounded-full px-2.5 py-1 text-[11px] font-bold ${RESULT_STYLE[m.result]}`}>
                        {m.result}
                      </span>
                    </div>
                  </div>
                  {m.matchedOn.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {m.matchedOn.map((reason) => (
                        <span
                          key={reason}
                          className="rounded-full border border-slate-200 px-2 py-0.5 text-[10px] font-semibold text-slate-600"
                        >
                          {reason}
                        </span>
                      ))}
                    </div>
                  )}
                </li>
              ))}
            </ul>
          ) : (
            !loading && (
              <div className="rounded-xl border border-dashed border-slate-300 bg-white px-4 py-8 text-center text-sm text-slate-500">
                No shared outcomes match your profile yet. As more students record their results,
                this fills in.
              </div>
            )
          )}

          {data.consentNote && (
            <p className="flex items-start gap-1.5 text-[11px] text-slate-400">
              <ShieldCheck className="mt-0.5 h-3.5 w-3.5 shrink-0" />
              <span>{data.consentNote}</span>
            </p>
          )}
        </>
      )}
    </div>
  );
}
