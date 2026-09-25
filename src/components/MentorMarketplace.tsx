"use client";

import React, { useCallback, useEffect, useState } from "react";
import { BadgeCheck, HeartHandshake, Info, Loader2, Minus, Plus, Search, Send, ShieldAlert, Sparkles } from "lucide-react";
import { StudentProfile } from "./Navbar";

/**
 * Mentor Marketplace (Phase 4).
 *
 * A mentor is worth talking to because they walked the same path. So every card
 * states the concrete reasons it was suggested AND the ways it does not match —
 * a student who cannot see why a mentor appeared will not trust the
 * introduction, and a student who only sees the good match will be misled.
 */

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
  verified: boolean;
  price: "free" | "paid" | "unknown";
}

interface MentorResult {
  matches: MentorMatch[];
  filtered: { inactive: number; overBudget: number };
  note: string;
}

const PRICE_LABEL: Record<MentorMatch["price"], string> = {
  free: "Free",
  paid: "$/hr",
  unknown: "Rate not set",
};

export function MentorMarketplace({ activeProfile }: { activeProfile: StudentProfile | null }) {
  const [data, setData] = useState<MentorResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [maxRate, setMaxRate] = useState("");
  const [openId, setOpenId] = useState<number | null>(null);
  const [topic, setTopic] = useState("");
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState<number[]>([]);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    if (!activeProfile?.id) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError("");
    try {
      const params = new URLSearchParams({ profileId: String(activeProfile.id) });
      if (maxRate) params.set("maxRate", maxRate);
      const res = await fetch(`/api/mentors?${params.toString()}`, { credentials: "include" });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Could not load mentors");
      setData(json);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load mentors");
    } finally {
      setLoading(false);
    }
  }, [activeProfile?.id, maxRate]);

  useEffect(() => {
    void load();
  }, [load]);

  const request = async (mentorId: number) => {
    if (!activeProfile?.id || !topic.trim()) return;
    setSending(true);
    setError("");
    try {
      const res = await fetch("/api/mentors", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ profileId: activeProfile.id, mentorId, topic: topic.trim(), message }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Could not send the request");
      setSent((s) => [...s, mentorId]);
      setOpenId(null);
      setTopic("");
      setMessage("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not send the request");
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-slate-200 bg-white p-6">
        <div className="flex items-start gap-3">
          <HeartHandshake className="mt-0.5 h-5 w-5 text-indigo-600" />
          <div>
            <h2 className="text-lg font-semibold text-slate-900">Mentor marketplace</h2>
            <p className="mt-1 max-w-3xl text-sm text-slate-600">
              Sorted by how closely each mentor&apos;s path matches yours — the same university, the same
              scholarship, the same country. Not by price, and not by who paid to be listed.
            </p>
          </div>
        </div>

        <div className="mt-4 flex flex-wrap items-end gap-3">
          <label className="text-xs">
            <span className="mb-1 block font-medium text-slate-600">Max hourly rate (USD)</span>
            <input
              type="number"
              min={0}
              value={maxRate}
              onChange={(e) => setMaxRate(e.target.value)}
              placeholder="Any"
              className="w-32 rounded-lg border border-slate-300 px-2 py-1.5 text-sm outline-none focus:border-indigo-500"
            />
          </label>
          <button
            onClick={() => void load()}
            className="inline-flex items-center gap-1.5 rounded-lg bg-slate-900 px-3 py-1.5 text-sm text-white hover:bg-slate-800"
          >
            <Search className="h-3.5 w-3.5" /> Search
          </button>
          {maxRate && (
            <p className="text-xs text-slate-500">
              Free sessions always stay visible, whatever ceiling you set.
            </p>
          )}
        </div>

        {error && <p className="mt-3 rounded-lg bg-rose-50 p-3 text-xs text-rose-800">{error}</p>}
        {data && (
          <p className="mt-3 rounded-lg bg-slate-50 p-3 text-xs text-slate-600">{data.note}</p>
        )}
      </div>

      {loading ? (
        <div className="flex items-center gap-2 text-sm text-slate-500">
          <Loader2 className="h-4 w-4 animate-spin" /> Finding mentors who walked your path…
        </div>
      ) : !activeProfile ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-6 text-sm text-slate-500">
          Select a profile to see mentors matched to it.
        </div>
      ) : data && data.matches.length === 0 ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-6 text-sm text-slate-500">
          No mentors match this profile yet. The marketplace grows as students who have been
          through it sign up — your own profile can become a listing once you enrol.
        </div>
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          {data?.matches.map((m) => {
            const isOpen = openId === m.id;
            const alreadySent = sent.includes(m.id);
            return (
              <div
                key={m.id}
                className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:border-indigo-200"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="truncate text-base font-semibold text-slate-900">{m.displayName}</span>
                      {m.verified ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-700">
                          <BadgeCheck className="h-3.5 w-3.5" /> Verified
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-700">
                          <ShieldAlert className="h-3.5 w-3.5" /> Not verified
                        </span>
                      )}
                    </div>
                    {m.headline && <p className="mt-0.5 text-sm text-slate-600">{m.headline}</p>}
                    <p className="mt-1 text-xs text-slate-500">
                      {[m.university, m.program, m.country].filter(Boolean).join(" · ")}
                    </p>
                  </div>
                  <div className="text-right">
                    <div className="inline-flex items-center gap-1 rounded-lg bg-indigo-50 px-2 py-1 text-sm font-semibold text-indigo-800">
                      <Sparkles className="h-3.5 w-3.5" /> {m.score}%
                    </div>
                    <p className="mt-1 text-xs text-slate-500">
                      {m.price === "paid"
                        ? `$${m.hourlyRateUsd}/hr`
                        : PRICE_LABEL[m.price]}
                    </p>
                  </div>
                </div>

                <div className="mt-3 space-y-1.5">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                    Why this mentor
                  </p>
                  {m.reasons.map((r, i) => (
                    <p key={i} className="flex gap-1.5 text-xs text-emerald-800">
                      <Plus className="mt-0.5 h-3 w-3 shrink-0 text-emerald-600" /> {r}
                    </p>
                  ))}
                </div>

                {m.gaps.length > 0 && (
                  <div className="mt-3 space-y-1.5 border-t border-slate-100 pt-3">
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                      Where it does not match
                    </p>
                    {m.gaps.map((g, i) => (
                      <p key={i} className="flex gap-1.5 text-xs text-amber-800">
                        <Minus className="mt-0.5 h-3 w-3 shrink-0 text-amber-600" /> {g}
                      </p>
                    ))}
                  </div>
                )}

                {alreadySent ? (
                  <p className="mt-4 rounded-lg bg-emerald-50 p-3 text-xs text-emerald-800">
                    Request sent. The mentor will reply through ScholarBridge — no contact details are
                    exchanged until they accept.
                  </p>
                ) : isOpen ? (
                  <div className="mt-4 space-y-2 border-t border-slate-100 pt-3">
                    <input
                      value={topic}
                      onChange={(e) => setTopic(e.target.value)}
                      placeholder="What do you want to ask about?"
                      maxLength={200}
                      className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-indigo-500"
                    />
                    <textarea
                      value={message}
                      onChange={(e) => setMessage(e.target.value)}
                      placeholder="One or two sentences of context (optional)"
                      maxLength={2000}
                      rows={3}
                      className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-indigo-500"
                    />
                    <div className="flex gap-2">
                      <button
                        onClick={() => void request(m.id)}
                        disabled={!topic.trim() || sending}
                        className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-3 py-1.5 text-sm text-white disabled:opacity-50"
                      >
                        {sending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
                        Request an introduction
                      </button>
                      <button
                        onClick={() => setOpenId(null)}
                        className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm text-slate-600"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <button
                    onClick={() => setOpenId(m.id)}
                    className="mt-4 rounded-lg border border-slate-200 px-3 py-1.5 text-sm text-slate-700 hover:border-indigo-200"
                  >
                    Ask this mentor something
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}

      <div className="flex gap-2 rounded-xl border border-sky-100 bg-sky-50/60 p-4 text-xs text-sky-900">
        <Info className="mt-0.5 h-4 w-4 shrink-0 text-sky-600" />
        <p>
          A mentor is a person, not an authority. Verified means ScholarBridge confirmed they study
          where they say they do — it does not mean their advice is right for you. Take it as
          experience, and check anything factual against the university&apos;s own page.
        </p>
      </div>
    </div>
  );
}
