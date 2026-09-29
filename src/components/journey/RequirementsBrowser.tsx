"use client";

/**
 * RequirementsBrowser — the standalone "Application Requirements" section
 * (spec §5).
 *
 * Lists every application the student has, and for the selected one shows the
 * personalized checklist with source + last-verified date on every row. The
 * same component backs the workspace's Requirements tab; this is the entry
 * point a student reaches from the PREPARE group before they have a
 * workspace open.
 */
import React, { useEffect, useState } from "react";
import { ExternalLink } from "lucide-react";
import { Button, Empty, JourneyCard, Loading, Pill, ProgressBar, SourceTag, StatusIcon, daysLabel, toneForDays } from "./ui";

interface AppRow {
  id: number;
  universityName: string;
  programName: string | null;
  deadline: string | null;
  status: string;
  submittedAt: string | null;
}

interface ReqData {
  application: AppRow & { portalUrl: string | null };
  university: { id: number; name: string; admissionsUrl: string | null; applicationUrl: string | null; verificationStatus: string } | null;
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
    lastVerifiedAt: string | null;
    verificationStatus: string;
  }[];
  progress: { pct: number; done: number; total: number; sections: { key: string; label: string; done: number; total: number; pct: number }[] };
}

const SECTION_ORDER = ["academic", "english", "testing", "documents", "essays", "recommendations", "finance", "application"];

export function RequirementsBrowser({ profileId, onOpenWorkspace }: { profileId: number; onOpenWorkspace: (id: number) => void }) {
  const [apps, setApps] = useState<AppRow[]>([]);
  const [selected, setSelected] = useState<number | null>(null);
  const [loaded, setLoaded] = useState<ReqData | null>(null);
  const [loading, setLoading] = useState(true);
  const [detailLoading, setDetailLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/applications", { cache: "no-store" });
        const json = await res.json().catch(() => ({}));
        if (res.ok) {
          setApps(json.applications ?? []);
          if (json.applications?.length) setSelected(json.applications[0].id);
        }
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  useEffect(() => {
    if (!selected) return;
    (async () => {
      setDetailLoading(true);
      try {
        const res = await fetch(`/api/requirements?profileId=${profileId}&applicationId=${selected}`, { cache: "no-store" });
        const json = await res.json().catch(() => ({}));
        if (res.ok) setLoaded(json as ReqData);
        else setError(json.error ?? "Could not load the requirements");
      } finally {
        setDetailLoading(false);
      }
    })();
  }, [selected, profileId]);

  // Nothing selected → no checklist, without a state write.
  const data = selected ? loaded : null;

  if (loading) return <Loading label="Loading your applications…" />;

  if (apps.length === 0) {
    return (
      <JourneyCard
        title="Application requirements"
        subtitle="Pick a university and we generate the exact checklist it asks for — with the source and the date we last verified it."
      >
        <Empty
          title="No applications yet"
          hint="Add a university to any application and the checklist, tasks and deadline are created for you automatically."
        />
      </JourneyCard>
    );
  }

  return (
    <div className="space-y-4">
      <JourneyCard
        title="Application requirements"
        subtitle="What each university actually asks for. Every row shows where it came from and when we last checked it."
      >
        <div className="flex flex-wrap gap-1.5">
          {apps.map((a) => (
            <button
              key={a.id}
              type="button"
              onClick={() => setSelected(a.id)}
              className={`rounded-lg border px-3 py-1.5 text-xs font-semibold transition ${
                selected === a.id
                  ? "border-indigo-600 bg-indigo-600 text-white"
                  : "border-slate-200 text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
              }`}
            >
              {a.universityName}
            </button>
          ))}
        </div>
      </JourneyCard>

      {detailLoading && <Loading label="Building the checklist…" />}
      {error && <p className="rounded-lg bg-rose-50 px-3 py-2 text-xs text-rose-700 dark:bg-rose-950/40 dark:text-rose-300">{error}</p>}

      {data && !detailLoading && (
        <JourneyCard
          title={data.application.universityName}
          subtitle={data.application.programName ?? undefined}
          action={
            <div className="text-right">
              <p className="text-xl font-extrabold text-slate-900 dark:text-white">{data.progress.pct}%</p>
              <p className="text-[10px] font-bold uppercase text-slate-500">
                {data.progress.done}/{data.progress.total} done
              </p>
            </div>
          }
        >
          <ProgressBar pct={data.progress.pct} tone={data.progress.pct >= 100 ? "good" : "brand"} />

          <div className="mt-4 space-y-4">
            {SECTION_ORDER.filter((s) => data.requirements.some((r) => r.section === s)).map((section) => {
              const items = data.requirements.filter((r) => r.section === section);
              const s = data.progress.sections.find((x) => x.key === section);
              return (
                <div key={section}>
                  <div className="mb-1.5 flex items-center justify-between">
                    <h3 className="text-xs font-bold uppercase tracking-wide text-slate-500">{section}</h3>
                    {s && (
                      <span className="text-[11px] text-slate-500">
                        {s.done}/{s.total}
                      </span>
                    )}
                  </div>
                  <ul className="space-y-1.5">
                    {items.map((r) => (
                      <li
                        key={r.id}
                        className="flex flex-wrap items-start gap-2 rounded-lg border border-slate-200 px-3 py-2 dark:border-slate-700"
                      >
                        <StatusIcon state={r.status} className="mt-0.5 h-4 w-4" />
                        <div className="min-w-0 flex-1">
                          <p
                            className={`text-sm font-medium ${
                              r.status === "done" ? "text-slate-400 line-through" : "text-slate-800 dark:text-slate-100"
                            }`}
                          >
                            {r.title}
                            {!r.isRequired && <span className="ml-1 text-[10px] uppercase text-slate-400">optional</span>}
                          </p>
                          {r.instructions && <p className="text-xs text-slate-500 dark:text-slate-400">{r.instructions}</p>}
                          <div className="mt-0.5 flex flex-wrap items-center gap-2">
                            <SourceTag
                              url={r.sourceUrl}
                              name={r.sourceName}
                              lastVerified={r.lastVerifiedAt}
                              verificationStatus={r.verificationStatus}
                            />
                            {r.dueDate && <Pill tone={toneForDays(daysTo(r.dueDate))}>{daysLabel(daysTo(r.dueDate))}</Pill>}
                          </div>
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>
              );
            })}
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            <Button onClick={() => onOpenWorkspace(data.application.id)}>Open the full workspace</Button>
            {data.university?.applicationUrl && (
              <a
                href={data.university.applicationUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 rounded-lg border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-600 dark:text-slate-200 dark:hover:bg-slate-800"
              >
                <ExternalLink className="h-3.5 w-3.5" /> Official application link
              </a>
            )}
          </div>
        </JourneyCard>
      )}
    </div>
  );
}

function daysTo(iso: string | null): number | null {
  if (!iso) return null;
  const now = new Date();
  const start = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
  return Math.round((new Date(`${iso.slice(0, 10)}T00:00:00Z`).getTime() - start) / 86400000);
}
