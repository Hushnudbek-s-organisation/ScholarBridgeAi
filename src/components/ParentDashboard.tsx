"use client";

import React, { useCallback, useEffect, useState } from "react";
import { CheckCircle2, Copy, Eye, EyeOff, Info, Loader2, Lock, ShieldCheck, Users } from "lucide-react";
import { StudentProfile } from "./Navbar";

/**
 * Parent Dashboard (Phase 4).
 *
 * The parent view is generated server-side by a WHITELIST (`buildParentSummary`),
 * so nothing leaks by omission. This component only turns that summary on and
 * off, and shows the link. It never fetches the student record.
 */

export function ParentDashboard({ activeProfile }: { activeProfile: StudentProfile | null }) {
  const [enabled, setEnabled] = useState(false);
  const [email, setEmail] = useState("");
  const [link, setLink] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);
  const [reveal, setReveal] = useState(false);

  const update = useCallback(
    async (next: boolean) => {
      if (!activeProfile?.id) return;
      setBusy(true);
      setError("");
      try {
        const res = await fetch("/api/parent-share", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ profileId: activeProfile.id, enabled: next, email }),
        });
        const json = await res.json();
        if (!res.ok) throw new Error(json.error || "Could not update parent sharing");
        setEnabled(json.enabled === true);
        setLink(json.link ?? null);
        setCopied(false);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Could not update parent sharing");
      } finally {
        setBusy(false);
      }
    },
    [activeProfile?.id, email]
  );

  const copy = async () => {
    if (!link) return;
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      // Clipboard blocked — the link is still shown, so the user can select it.
      setReveal(true);
    }
  };

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-slate-200 bg-white p-6">
        <div className="flex items-start gap-3">
          <Users className="mt-0.5 h-5 w-5 text-indigo-600" />
          <div>
            <h2 className="text-lg font-semibold text-slate-900">Parent dashboard</h2>
            <p className="mt-1 max-w-3xl text-sm text-slate-600">
              A read-only page your parents can open without an account. It answers the three
              questions they actually ask — are you on track, what will it cost, and what do they
              need to do — and nothing else.
            </p>
          </div>
        </div>

        {!activeProfile ? (
          <p className="mt-4 text-sm text-slate-500">Select a profile to set up parent sharing.</p>
        ) : (
          <>
            <div className="mt-4 rounded-xl border border-slate-200 p-4">
              <label className="flex items-start gap-3">
                <input
                  type="checkbox"
                  checked={enabled}
                  onChange={(e) => void update(e.target.checked)}
                  disabled={busy}
                  className="mt-1 h-4 w-4 accent-indigo-600"
                />
                <span>
                  <span className="block text-sm font-medium text-slate-800">
                    Share a read-only summary with my parents
                  </span>
                  <span className="mt-0.5 block text-xs text-slate-500">
                    You can revoke this at any time — the link stops working immediately.
                  </span>
                </span>
              </label>

              {enabled && (
                <div className="mt-4 space-y-3">
                  <label className="block text-xs">
                    <span className="mb-1 block font-medium text-slate-600">
                      Parent&apos;s email (optional — for your records only)
                    </span>
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="parent@example.com"
                      className="w-full max-w-sm rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-indigo-500"
                    />
                  </label>

                  {link && (
                    <div className="rounded-lg border border-emerald-100 bg-emerald-50/60 p-4">
                      <p className="flex items-center gap-1.5 text-xs font-medium text-emerald-900">
                        <CheckCircle2 className="h-4 w-4" /> Sharing is on. Send them this link:
                      </p>
                      <div className="mt-2 flex flex-wrap items-center gap-2">
                        <code className="max-w-full break-all rounded bg-white px-2 py-1 text-xs text-slate-700">
                          {reveal ? link : `${link.slice(0, 34)}${"•".repeat(18)}`}
                        </code>
                        <button
                          onClick={() => setReveal((r) => !r)}
                          className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs text-slate-600"
                        >
                          {reveal ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
                          {reveal ? "Hide" : "Show"}
                        </button>
                        <button
                          onClick={() => void copy()}
                          className="inline-flex items-center gap-1 rounded-lg bg-emerald-600 px-2 py-1 text-xs text-white hover:bg-emerald-700"
                        >
                          <Copy className="h-3 w-3" /> {copied ? "Copied" : "Copy"}
                        </button>
                      </div>
                      <p className="mt-2 text-xs text-emerald-900/80">
                        Anyone with this link can see the summary, so send it privately. Turn sharing
                        off to revoke it.
                      </p>
                    </div>
                  )}
                </div>
              )}

              {error && <p className="mt-3 rounded-lg bg-rose-50 p-3 text-xs text-rose-800">{error}</p>}
            </div>

            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <div className="rounded-xl border border-slate-200 p-4">
                <p className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-emerald-700">
                  <ShieldCheck className="h-4 w-4" /> What they see
                </p>
                <ul className="mt-2 space-y-1 text-xs text-slate-600">
                  <li>Whether the plan is on track, in plain language</li>
                  <li>How many applications are submitted</li>
                  <li>The estimated yearly cost and the funding gap</li>
                  <li>The documents only a parent can usually supply</li>
                  <li>The nearest deadline, as a date</li>
                </ul>
              </div>
              <div className="rounded-xl border border-slate-200 p-4">
                <p className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-rose-700">
                  <Lock className="h-4 w-4" /> What they never see
                </p>
                <ul className="mt-2 space-y-1 text-xs text-slate-600">
                  <li>Your password or login details</li>
                  <li>Essay drafts and versions</li>
                  <li>GPA and test scores</li>
                  <li>Which universities rejected you</li>
                  <li>Private messages with advisors or mentors</li>
                </ul>
              </div>
            </div>

            <div className="mt-4 flex gap-2 rounded-xl border border-sky-100 bg-sky-50/60 p-4 text-xs text-sky-900">
              <Info className="mt-0.5 h-4 w-4 shrink-0 text-sky-600" />
              <p>
                The parent page is built from a fixed list of fields on purpose. Adding a new field
                to your profile does not automatically appear there — someone has to decide it is
                safe for a parent to see, and that decision is deliberate.
              </p>
            </div>

            {busy && (
              <p className="mt-3 flex items-center gap-2 text-xs text-slate-500">
                <Loader2 className="h-3.5 w-3.5 animate-spin" /> Saving…
              </p>
            )}
          </>
        )}
      </div>
    </div>
  );
}
