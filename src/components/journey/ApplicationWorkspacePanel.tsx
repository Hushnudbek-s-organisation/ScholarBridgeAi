"use client";

/**
 * ApplicationWorkspacePanel — spec §6 + §22.
 *
 * One workspace per university with ten tabs, a progress bar that every
 * requirement feeds automatically, and a final submission checklist that
 * refuses to mark an application "Submitted" while required items are open.
 */
import React, { useCallback, useEffect, useState } from "react";
import { ArrowLeft, Check, ExternalLink, Lock, RefreshCw } from "lucide-react";
import { motion, useReducedMotion } from "framer-motion";
import { SectionTransition } from "@/components/motion";
import { Button, Empty, JourneyCard, Loading, Pill, ProgressBar, SourceTag, daysLabel, toneForDays } from "./ui";

interface WorkspaceData {
  tabs: { id: string; label: string; icon: string }[];
  application: {
    id: number;
    universityName: string;
    programName: string | null;
    applicationRound: string | null;
    intakeTerm: string | null;
    deadline: string | null;
    status: string;
    submittedAt: string | null;
    portalUrl: string | null;
    applicationFeePaid: boolean;
    feeAmount: number | null;
  } | null;
  workspaces: {
    id: number;
    universityName: string;
    programName: string | null;
    deadline: string | null;
    status: string;
    submittedAt: string | null;
    progressPct: number;
    done: number;
    total: number;
  }[];
  progress: {
    pct: number;
    done: number;
    total: number;
    sections: { key: string; label: string; done: number; total: number; pct: number }[];
    missing: { key: string; section: string; title: string; isRequired: boolean; status: string }[];
    readyToSubmit: boolean;
    blockers: string[];
  };
  requirements: {
    id: number;
    section: string;
    itemKey: string;
    title: string;
    instructions: string | null;
    isRequired: boolean;
    status: string;
    dueDate: string | null;
    sourceUrl: string | null;
    sourceName: string | null;
    sourceType: string | null;
    lastVerifiedAt: string | null;
    verificationStatus: string;
    linkedType: string | null;
  }[];
  documents: { id: number; title: string; docType: string; status: string; expiresAt: string | null; fileUrl: string | null; usage: string }[];
  essays: { id: number; essayType: string; title: string; wordCount: number; versionNumber: number }[];
  recommendations: { id: number; recommenderName: string; relationship: string | null; status: string; dueDate: string | null }[];
  tests: { id: number; testType: string; currentScore: number | null; targetScore: number | null; targetDate: string | null }[];
  finance: { id: number; kind: string; name: string; amountUsd: number; status: string }[];
  deadlines: { id: number; title: string; dueDate: string; kind: string }[];
  offer: { status: string; decidedAt: string | null } | null;
  submissionChecklist: { key: string; label: string; ok: boolean }[];
  readyToSubmit: boolean;
  reversePlan: { key: string; title: string; date: string; daysBefore: number; tab: string }[];
}

const SECTION_ORDER = ["academic", "english", "testing", "documents", "essays", "recommendations", "finance", "application"];

export function ApplicationWorkspacePanel({
  profileId,
  applicationId,
  onSelect,
  onNavigateTab,
}: {
  profileId: number;
  applicationId?: number | null;
  onSelect: (id: number) => void;
  onNavigateTab: (tab: string) => void;
}) {
  const [data, setData] = useState<WorkspaceData | null>(null);
  const reduceMotion = useReducedMotion();
  const [tab, setTab] = useState("overview");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // `load` never touches `loading` itself: the mount effect calls it with no
  // state write (react-hooks/set-state-in-effect), and the explicit refresh
  // paths go through `reload` below.
  // Loader without state writes, so the mount effect stays lint-clean while
  // `reload` can still drive an explicit refresh.
  const load = useCallback(async () => {
    const qs = new URLSearchParams({ profileId: String(profileId) });
    if (applicationId) qs.set("applicationId", String(applicationId));
    const res = await fetch(`/api/workspace?${qs}`, { cache: "no-store" });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(json.error || "Could not load the workspace");
    return json as WorkspaceData;
  }, [profileId, applicationId]);

  const reload = useCallback(async () => {
    setLoading(true);
    try {
      setData(await load());
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load the workspace");
    } finally {
      setLoading(false);
    }
  }, [load]);

  useEffect(() => {
    let live = true;
    (async () => {
      try {
        const res = await load();
        if (!live) return;
        setData(res);
        setError(null);
      } catch (err) {
        if (!live) return;
        setError(err instanceof Error ? err.message : "Could not load the workspace");
      } finally {
        if (live) setLoading(false);
      }
    })();
    return () => {
      live = false;
    };
  }, [load]);

  const patchRequirement = async (id: number, status: string) => {
    setBusy(true);
    setMessage(null);
    try {
      const res = await fetch("/api/requirements", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ profileId, id, status }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error || "Could not update");
      await reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not update");
    } finally {
      setBusy(false);
    }
  };

  const markSubmitted = async () => {
    if (!data?.application) return;
    setBusy(true);
    setMessage(null);
    try {
      const res = await fetch("/api/workspace", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ profileId, id: data.application.id, markSubmitted: true }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(
          json.code === "not_ready"
            ? `${json.error} ${(json.outstanding ?? []).map((o: { title: string }) => o.title).join(", ")}`
            : json.error || "Could not submit"
        );
        return;
      }
      setMessage("Marked as submitted. Your dashboard and deadline list are updated.");
      await reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not submit");
    } finally {
      setBusy(false);
    }
  };

  if (loading) return <Loading label="Opening your workspace…" />;
  if (error && !data)
    return (
      <Empty
        title="Workspace unavailable"
        hint={error}
        action={
          <Button onClick={() => void reload()}>Try again</Button>
        }
      />
    );
  if (!data) return null;

  // ---- List mode ---------------------------------------------------------
  if (!applicationId) {
    return (
      <JourneyCard
        title="Application workspaces"
        subtitle="Every university you are applying to, with its live progress. Adding a university is all it takes — we generate the checklist, the tasks and the deadline."
      >
        {data.workspaces.length === 0 ? (
          <Empty
            title="No workspaces yet"
            hint="Start an application and ScholarBridge builds the requirements, essay tasks, recommendation tasks, deadline and funding plan for you."
            action={<Button onClick={() => onNavigateTab("applications")}>Start an application</Button>}
          />
        ) : (
          <ul className="grid gap-2 sm:grid-cols-2">
            {data.workspaces.map((w) => (
              <li key={w.id}>
                <button
                  type="button"
                  onClick={() => onSelect(w.id)}
                  className="w-full rounded-xl border border-slate-200 p-3 text-left transition hover:border-indigo-300 hover:bg-indigo-50/40 dark:border-slate-700 dark:hover:border-indigo-700"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="truncate text-sm font-semibold text-slate-900 dark:text-white">
                      {w.universityName || "University"}
                    </span>
                    {w.submittedAt ? (
                      <Pill tone="good">Submitted</Pill>
                    ) : w.deadline ? (
                      <Pill tone={toneForDays(daysTo(w.deadline))}>{daysTo(w.deadline)}d</Pill>
                    ) : null}
                  </div>
                  {w.programName && <p className="text-[11px] text-slate-500">{w.programName}</p>}
                  <div className="mt-2">
                    <ProgressBar pct={w.progressPct} size="sm" tone={w.progressPct >= 100 ? "good" : "brand"} />
                  </div>
                  <p className="mt-1 text-[11px] text-slate-500">
                    {w.submittedAt ? "Submitted" : `${w.done}/${w.total} requirements done`}
                  </p>
                </button>
              </li>
            ))}
          </ul>
        )}
      </JourneyCard>
    );
  }

  // ---- Single workspace --------------------------------------------------
  const app = data.application;
  if (!app) return <Empty title="Application not found" />;

  const sections = SECTION_ORDER.map((key) => ({
    key,
    label: key.charAt(0).toUpperCase() + key.slice(1),
    items: data.requirements.filter((r) => r.section === key),
  })).filter((s) => s.items.length > 0);

  return (
    <div className="space-y-4">
      <JourneyCard>
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0">
            <button
              type="button"
              onClick={() => onSelect(0)}
              className="mb-1 inline-flex items-center gap-1 text-[11px] font-semibold text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200"
            >
              <ArrowLeft className="h-3 w-3" /> All workspaces
            </button>
            <h2 className="text-lg font-extrabold text-slate-900 dark:text-white sm:text-xl">{app.universityName}</h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {[app.programName, app.applicationRound, app.intakeTerm].filter(Boolean).join(" · ")}
            </p>
            {app.deadline && (
              <p className="mt-1 text-xs font-semibold text-slate-600 dark:text-slate-300">
                Deadline {app.deadline} · {daysLabel(daysTo(app.deadline))}
              </p>
            )}
          </div>
          <div className="min-w-[180px] flex-1 sm:max-w-xs">
            <div className="flex items-baseline justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wide text-slate-500">Application progress</span>
              <span className="text-lg font-extrabold text-slate-900 dark:text-white">{data.progress.pct}%</span>
            </div>
            <ProgressBar pct={data.progress.pct} size="lg" tone={data.progress.pct >= 100 ? "good" : "brand"} />
            <p className="mt-1 text-[11px] text-slate-500">
              {data.progress.done}/{data.progress.total} requirements complete
            </p>
          </div>
        </div>

        <nav className="mt-4 flex flex-wrap gap-1.5" aria-label="Workspace tabs">
          {data.tabs.map((t) => {
            const sectionProgress = data.progress.sections.find((s) => s.key === t.id);
            const isActive = tab === t.id;
            return (
              <motion.button
                key={t.id}
                type="button"
                onClick={() => setTab(t.id)}
                aria-current={isActive ? "true" : undefined}
                whileHover={reduceMotion ? undefined : { y: -1 }}
                whileTap={reduceMotion ? undefined : { scale: 0.97 }}
                className={`relative rounded-lg border px-2.5 py-1.5 text-xs font-semibold transition ${
                  isActive
                    ? "border-indigo-600 bg-indigo-600 text-white shadow-sm"
                    : "border-slate-200 text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
                }`}
              >
                {isActive && (
                  <motion.span
                    layoutId="workspace-tab-pill"
                    className="absolute inset-0 rounded-lg bg-indigo-600"
                    transition={{ type: "spring", stiffness: 420, damping: 34 }}
                  />
                )}
                <span className="relative">
                  <span aria-hidden>{t.icon}</span> {t.label}
                  {sectionProgress && sectionProgress.total > 0 && (
                    <span className="ml-1 opacity-70">
                      {sectionProgress.done}/{sectionProgress.total}
                    </span>
                  )}
                </span>
              </motion.button>
            );
          })}
        </nav>
      </JourneyCard>

      {message && <p className="rounded-lg bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300">{message}</p>}
      {error && <p className="rounded-lg bg-rose-50 px-3 py-2 text-xs font-semibold text-rose-700 dark:bg-rose-950/40 dark:text-rose-300">{error}</p>}

      {/* Every tab body fades in place (no vertical travel) so the header and
          the tab strip never jump while switching. */}
      <SectionTransition transitionKey={tab}>
      {/* ---- Overview ---------------------------------------------------- */}
      {tab === "overview" && (
        <div className="grid gap-4 lg:grid-cols-2">
          <JourneyCard title="Where you stand" subtitle="Every requirement contributes to this automatically.">
            <ul className="space-y-2">
              {data.progress.sections.map((s) => (
                <li key={s.key}>
                  <div className="flex items-center justify-between text-xs font-semibold text-slate-700 dark:text-slate-200">
                    <span>{s.label}</span>
                    <span>
                      {s.done}/{s.total}
                    </span>
                  </div>
                  <ProgressBar pct={s.pct} size="sm" tone={s.pct >= 100 ? "good" : "brand"} />
                </li>
              ))}
            </ul>
          </JourneyCard>
          <JourneyCard title="Still missing" subtitle="You never have to remember this — it is computed from your checklist.">
            {data.progress.missing.length === 0 ? (
              <Empty title="Nothing missing" hint="Every requirement is marked done." />
            ) : (
              <ul className="space-y-1.5">
                {data.progress.missing.slice(0, 10).map((m) => (
                  <li key={`${m.section}-${m.key}`} className="flex items-center gap-2 text-sm">
                    <span className={`h-2 w-2 shrink-0 rounded-full ${m.isRequired ? "bg-rose-400" : "bg-slate-300"}`} aria-hidden />
                    <span className="min-w-0 flex-1 truncate text-slate-700 dark:text-slate-200">{m.title}</span>
                    <Pill tone="slate">{m.section}</Pill>
                  </li>
                ))}
              </ul>
            )}
          </JourneyCard>
        </div>
      )}

      {/* ---- Requirements / grouped sections ------------------------------ */}
      {["requirements", "documents", "essays", "recommendations", "tests", "finance"].includes(tab) && (
        <JourneyCard
          title="Your application requirements"
          subtitle="Generated from the university's published requirements. Every item shows its source and last verified date."
          action={
            <Button
              size="sm"
              variant="outline"
              onClick={async () => {
                setBusy(true);
                try {
                  await fetch("/api/requirements", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ profileId, applicationId: app.id }),
                  });
                  await reload();
                } finally {
                  setBusy(false);
                }
              }}
              disabled={busy}
            >
              <RefreshCw className="h-3.5 w-3.5" /> Refresh
            </Button>
          }
        >
          <div className="space-y-4">
            {sections.map((s) => (
              <div key={s.key}>
                <h3 className="mb-1.5 text-xs font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                  {s.label}
                </h3>
                <ul className="space-y-1.5">
                  {s.items.map((r) => (
                    <li
                      key={r.id}
                      className="flex flex-wrap items-start gap-3 rounded-lg border border-slate-200 px-3 py-2 dark:border-slate-700"
                    >
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => patchRequirement(r.id, r.status === "done" ? "todo" : "done")}
                        aria-label={r.status === "done" ? `Mark ${r.title} as not done` : `Mark ${r.title} as done`}
                        className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded border ${
                          r.status === "done"
                            ? "border-emerald-500 bg-emerald-500 text-white sb-ink-on-bright"
                            : r.status === "not_required"
                              ? "border-slate-300 bg-slate-100 dark:bg-slate-700"
                              : "border-slate-300 dark:border-slate-600"
                        }`}
                      >
                        {r.status === "done" && <Check className="h-3 w-3" />}
                        {r.status === "not_required" && <span className="h-1.5 w-1.5 rounded-full bg-slate-400" />}
                      </button>
                      <div className="min-w-0 flex-1">
                        <p
                          className={`text-sm font-medium ${
                            r.status === "done" ? "text-slate-400 line-through" : "text-slate-800 dark:text-slate-100"
                          }`}
                        >
                          {r.title}
                          {!r.isRequired && <span className="ml-1 text-[10px] font-normal uppercase text-slate-400">(optional)</span>}
                        </p>
                        {r.instructions && <p className="text-xs text-slate-500 dark:text-slate-400">{r.instructions}</p>}
                        <div className="mt-1 flex flex-wrap items-center gap-2">
                          <SourceTag
                            url={r.sourceUrl}
                            name={r.sourceName}
                            lastVerified={r.lastVerifiedAt}
                            verificationStatus={r.verificationStatus}
                          />
                          {r.dueDate && (
                            <Pill tone={toneForDays(daysTo(r.dueDate))}>{daysLabel(daysTo(r.dueDate))}</Pill>
                          )}
                        </div>
                      </div>
                      <div className="flex shrink-0 gap-1">
                        {r.status !== "done" && r.status !== "not_required" && (
                          <Button size="sm" variant="ghost" disabled={busy} onClick={() => patchRequirement(r.id, "in_progress")}>
                            Start
                          </Button>
                        )}
                        {r.status !== "not_required" && (
                          <Button size="sm" variant="ghost" disabled={busy} onClick={() => patchRequirement(r.id, "not_required")}>
                            N/A
                          </Button>
                        )}
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
            {sections.length === 0 && <Empty title="No requirements yet" hint="Refresh to generate them from the university's published data." />}
          </div>
        </JourneyCard>
      )}

      {/* ---- Deadlines + reverse planning -------------------------------- */}
      {tab === "deadlines" && (
        <div className="grid gap-4 lg:grid-cols-2">
          <JourneyCard title="Deadlines" subtitle="Tracked dates for this application.">
            {data.deadlines.length === 0 && !app.deadline ? (
              <Empty title="No dates yet" hint="Add an application deadline and we will plan backwards from it." />
            ) : (
              <ul className="divide-y divide-slate-100 dark:divide-slate-800">
                {app.deadline && (
                  <li className="flex items-center gap-2 py-2 text-sm">
                    <Pill tone={toneForDays(daysTo(app.deadline))}>{daysLabel(daysTo(app.deadline))}</Pill>
                    <span className="flex-1 text-slate-700 dark:text-slate-200">Application deadline</span>
                    <span className="text-xs text-slate-400">{app.deadline}</span>
                  </li>
                )}
                {data.deadlines.map((d) => (
                  <li key={d.id} className="flex items-center gap-2 py-2 text-sm">
                    <Pill tone={toneForDays(daysTo(d.dueDate))}>{daysLabel(daysTo(d.dueDate))}</Pill>
                    <span className="flex-1 text-slate-700 dark:text-slate-200">{d.title}</span>
                    <span className="text-xs text-slate-400">{d.dueDate}</span>
                  </li>
                ))}
              </ul>
            )}
          </JourneyCard>
          <JourneyCard title="Reverse plan" subtitle="Working backwards from your real deadline. Nothing is ever scheduled after it.">
            {data.reversePlan.length === 0 ? (
              <Empty title="Add a deadline first" hint="Once your university deadline is set, we build the preparation schedule automatically." />
            ) : (
              <ol className="space-y-2">
                {data.reversePlan.map((s) => (
                  <li key={s.key} className="flex items-center gap-3 text-sm">
                    <span className="w-24 shrink-0 text-xs font-bold text-slate-500 dark:text-slate-400">{s.date}</span>
                    <span className="min-w-0 flex-1 text-slate-700 dark:text-slate-200">{s.title}</span>
                    <Pill tone="slate">-{s.daysBefore}d</Pill>
                  </li>
                ))}
              </ol>
            )}
          </JourneyCard>
        </div>
      )}

      {/* ---- Submission (spec §22) --------------------------------------- */}
      {tab === "submission" && (
        <JourneyCard
          title="Final submission checklist"
          subtitle="We check every box before you can mark an application as submitted."
        >
          <ul className="mb-4 space-y-2">
            {data.submissionChecklist.map((c) => (
              <li key={c.key} className="flex items-center gap-2 text-sm">
                <span
                  className={`flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-bold ${
                    c.ok ? "bg-emerald-500 text-white sb-ink-on-bright" : "bg-slate-200 text-slate-500 dark:bg-slate-700"
                  }`}
                >
                  {c.ok ? "✓" : ""}
                </span>
                <span className={c.ok ? "text-slate-500 line-through" : "font-medium text-slate-800 dark:text-slate-100"}>
                  {c.label}
                </span>
              </li>
            ))}
          </ul>

          {app.submittedAt ? (
            <div className="rounded-xl border border-emerald-300 bg-emerald-50 px-3 py-3 text-sm dark:border-emerald-800 dark:bg-emerald-950/40">
              <p className="font-bold text-emerald-700 dark:text-emerald-300">
                Submitted {new Date(app.submittedAt).toLocaleDateString()}
              </p>
              <p className="mt-0.5 text-xs text-emerald-700/80 dark:text-emerald-300/80">
                Store your confirmation number in the notes so you can find it later.
              </p>
            </div>
          ) : (
            <>
              <Button
                variant="success"
                disabled={busy || !data.readyToSubmit}
                onClick={markSubmitted}
                title={data.readyToSubmit ? "Mark as submitted" : "Finish the required items first"}
              >
                <Lock className="h-3.5 w-3.5" /> Mark as Submitted
              </Button>
              {!data.readyToSubmit && (
                <p className="mt-2 text-xs text-slate-500">
                  Still open: {data.progress.blockers.slice(0, 4).join(", ")}
                  {data.progress.blockers.length > 4 && ` and ${data.progress.blockers.length - 4} more`}
                </p>
              )}
            </>
          )}

          {app.portalUrl && (
            <a
              href={app.portalUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-3 inline-flex items-center gap-1 text-xs font-semibold text-indigo-600 hover:underline dark:text-indigo-400"
            >
              <ExternalLink className="h-3 w-3" /> Open the official application portal
            </a>
          )}
        </JourneyCard>
      )}

      {/* ---- Decision (spec §23) ----------------------------------------- */}
      {tab === "decision" && (
        <JourneyCard title="Decision" subtitle="Record the result and unlock the post-admission journey.">
          {data.offer ? (
            <div className="space-y-2">
              <Pill tone={data.offer.status === "accepted" ? "good" : data.offer.status === "pending" ? "warn" : "slate"}>
                {data.offer.status}
              </Pill>
              {data.offer.status === "accepted" && (
                <p className="text-sm text-slate-600 dark:text-slate-300">
                  Your post-admission journey is active: funding, deposit, visa and departure steps are now on your dashboard.
                </p>
              )}
              <Button className="mt-2" variant="outline" onClick={() => onNavigateTab("offers")}>
                Open Offers & Decisions
              </Button>
            </div>
          ) : (
            <Empty
              title="No decision yet"
              hint="When a university replies, record the result here and ScholarBridge switches on the post-admission journey automatically."
            />
          )}
        </JourneyCard>
      )}
      </SectionTransition>
    </div>
  );
}

function daysTo(iso: string | null): number | null {
  if (!iso) return null;
  const now = new Date();
  const start = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
  return Math.round((new Date(`${iso.slice(0, 10)}T00:00:00Z`).getTime() - start) / 86400000);
}
