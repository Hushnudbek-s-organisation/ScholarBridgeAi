"use client";

/**
 * DISCOVER helpers + the two post-admission practice sections.
 *
 *  • CareerExplorerPanel — spec §15: Career → Major → Countries →
 *    Universities → Scholarships → Applications.
 *  • VisaCenterPanel — spec §25: the visa case built on the EXISTING Visa
 *    Speaking assistant, plus admin-published country requirements that are
 *    never written by AI.
 *  • InterviewCenterPanel — spec §26: university and visa interview practice
 *    with feedback that never claims a visa-approval probability.
 */
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { ArrowRight, GraduationCap, Search } from "lucide-react";
import { CAREER_PATHS } from "@/lib/journey/careers";
import { Button, Empty, JourneyCard, Loading, Pill, ProgressBar, inputClass } from "./ui";

// ===========================================================================
// CAREER & MAJOR EXPLORER (spec §15)
// ===========================================================================

export function CareerExplorerPanel({ onNavigateTab }: { onNavigateTab: (t: string) => void }) {
  const [career, setCareer] = useState<string>(CAREER_PATHS[0].id);
  const [major, setMajor] = useState<string>(CAREER_PATHS[0].majors[0]);
  const [unis, setUnis] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const path = useMemo(() => CAREER_PATHS.find((c) => c.id === career) ?? CAREER_PATHS[0], [career]);
  // Picking a career picks its first recommended major in the same click, so no
  // effect is needed to keep them in sync.
  const pickCareer = (id: string) => {
    const next = CAREER_PATHS.find((c) => c.id === id) ?? CAREER_PATHS[0];
    setCareer(id);
    setMajor(next.majors[0]);
  };

  // Universities are fetched from the EXISTING endpoint — no second source of
  // truth, no duplicated data.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`/api/universities?limit=400`, { cache: "no-store" });
        const json = await res.json().catch(() => ({}));
        if (cancelled || !res.ok) return;
        const all: any[] = json.universities ?? [];
        const q = major.toLowerCase();
        const match = all.filter(
          (u) =>
            String(u.programMajor ?? "").toLowerCase().includes(q.split(" ")[0]) ||
            String(u.name ?? "").toLowerCase().includes(q.split(" ")[0])
        );
        setUnis((match.length ? match : all).slice(0, 12));
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [major]);

  return (
    <div className="space-y-4">
      <JourneyCard
        title="Career & major explorer"
        subtitle="Start from the job you want. We show the majors that lead there, the countries that offer them, and the universities that publish them."
      >
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {CAREER_PATHS.map((c) => (
            <button
              key={c.id}
              type="button"
              onClick={() => pickCareer(c.id)}
              className={`rounded-xl border p-3 text-left transition ${
                career === c.id
                  ? "border-indigo-500 bg-indigo-50 dark:border-indigo-600 dark:bg-indigo-950/40"
                  : "border-slate-200 hover:border-indigo-300 dark:border-slate-700"
              }`}
            >
              <p className="text-sm font-bold text-slate-900 dark:text-white">{c.title}</p>
              <p className="mt-0.5 text-[11px] text-slate-500 dark:text-slate-400">{c.blurb}</p>
            </button>
          ))}
        </div>
      </JourneyCard>

      <JourneyCard title="Recommended majors" subtitle={`Majors that lead to ${path.title}.`}>
        <div className="flex flex-wrap gap-2">
          {path.majors.map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => setMajor(m)}
              className={`rounded-full border px-3 py-1.5 text-xs font-semibold transition ${
                major === m
                  ? "border-indigo-600 bg-indigo-600 text-white"
                  : "border-slate-200 text-slate-600 hover:border-indigo-300 dark:border-slate-700 dark:text-slate-300"
              }`}
            >
              {m}
            </button>
          ))}
        </div>
        {path.countries.length > 0 && (
          <p className="mt-3 flex flex-wrap items-center gap-1.5 text-xs text-slate-500">
            <span className="font-semibold">Strong destinations:</span>
            {path.countries.map((c) => (
              <Pill key={c} tone="info">
                {c}
              </Pill>
            ))}
          </p>
        )}
      </JourneyCard>

      <JourneyCard
        title={`Universities offering ${major}`}
        subtitle="Filtered from the published university list. Check each one's requirements and sources before you rely on them."
        action={<Search className="h-4 w-4 text-slate-400" aria-hidden />}
      >
        {loading ? (
          <Loading />
        ) : unis.length === 0 ? (
          <Empty title="No universities found" hint="Try another major, or browse the full explorer." />
        ) : (
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {unis.map((u) => (
              <div key={u.id} className="rounded-xl border border-slate-200 p-3 dark:border-slate-700">
                <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">
                  {u.flagEmoji} {u.name}
                </p>
                <p className="text-[11px] text-slate-500">
                  {u.city}, {u.country} · #{u.worldRanking}
                </p>
                <p className="mt-1 text-[11px] text-slate-500">
                  {u.minGpa != null && `GPA ≥ ${u.minGpa} · `}
                  {u.minIelts != null && `IELTS ≥ ${u.minIelts} · `}
                  {u.minSat != null && `SAT ≥ ${u.minSat}`}
                </p>
              </div>
            ))}
          </div>
        )}
        <div className="mt-3 flex flex-wrap gap-2">
          <Button variant="outline" onClick={() => onNavigateTab("universities")}>
            Open University Explorer <ArrowRight className="h-3.5 w-3.5" />
          </Button>
          <Button variant="outline" onClick={() => onNavigateTab("scholarships")}>
            Find scholarships
          </Button>
          <Button variant="outline" onClick={() => onNavigateTab("applications")}>
            Start an application
          </Button>
        </div>
      </JourneyCard>
    </div>
  );
}

// ===========================================================================
// VISA CENTER (spec §25)
// ===========================================================================

export function VisaCenterPanel({ profileId, onNavigateTab }: { profileId: number; onNavigateTab: (t: string) => void }) {
  const reduceMotion = useReducedMotion();
  const [country, setCountry] = useState("");
  const [data, setData] = useState<any>(null);
  const [history, setHistory] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const [reqs, hist] = await Promise.all([
          fetch("/api/visa/requirements?country=" + encodeURIComponent(country), { cache: "no-store" }),
          fetch(`/api/visa/history?profileId=${profileId}`, { cache: "no-store" }),
        ]);
        setData(reqs.ok ? await reqs.json() : { requirements: [] });
        if (hist.ok) setHistory(await hist.json());
      } finally {
        setLoading(false);
      }
    })();
  }, [country, profileId]);

  return (
    <div className="space-y-4">
      <JourneyCard
        title="Visa center"
        subtitle="Your visa case, the documents each country asks for, and where to practise. Requirements are published by our admin team with a source — we never invent them."
      >
        <div className="flex flex-wrap items-end gap-2">
          <div className="w-full sm:w-64">
            <span className="mb-1 block text-[11px] font-bold uppercase tracking-wide text-slate-500">Destination country</span>
            <input
              className={inputClass}
              value={country}
              placeholder="United States"
              onChange={(e) => setCountry(e.target.value)}
            />
          </div>
          <Button variant="outline" onClick={() => onNavigateTab("visa")}>
            <GraduationCap className="h-3.5 w-3.5" /> Open Visa Speaking
          </Button>
        </div>
      </JourneyCard>

      <JourneyCard title="Required documents" subtitle="Published requirements only. Anything without an official source is shown as “Not specified”.">
        {loading ? (
          <Loading />
        ) : !data?.requirements?.length ? (
          <Empty
            title={country ? `No published requirements for “${country}” yet` : "Choose your destination country"}
            hint="Our admin team publishes these from official government sources. Until then we would rather show nothing than guess."
          />
        ) : (
          <ul className="space-y-2">
            {data.requirements.map((r: any, i: number) => (
              <motion.li
                key={r.id}
                initial={reduceMotion ? false : { opacity: 0, y: 8 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-40px 0px" }}
                transition={{ delay: reduceMotion ? 0 : Math.min(i, 6) * 0.05, duration: 0.32 }}
                className="sb-card-hover rounded-xl border border-slate-200 p-3 dark:border-slate-700"
              >
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">{r.title}</p>
                    <p className="text-[11px] text-slate-500">
                      {r.visaType}
                      {r.lastVerifiedAt ? ` · verified ${String(r.lastVerifiedAt).slice(0, 10)}` : ""}
                    </p>
                  </div>
                  {r.isRequired ? <Pill tone="warn">Required</Pill> : <Pill tone="slate">Optional</Pill>}
                </div>
                {r.instructions && <p className="mt-1 text-xs text-slate-600 dark:text-slate-300">{r.instructions}</p>}
                {r.sourceUrl ? (
                  <a
                    href={r.sourceUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-1 inline-block text-[11px] font-semibold text-indigo-600 hover:underline dark:text-indigo-400"
                  >
                    {r.sourceName ?? "Official source"} →
                  </a>
                ) : (
                  <p className="mt-1 text-[11px] text-slate-400">Not specified</p>
                )}
              </motion.li>
            ))}
          </ul>
        )}
      </JourneyCard>

      {history?.sessions?.length > 0 && (
        <JourneyCard title="Your practice history" subtitle="Every saved practice session, oldest first.">
          <ul className="space-y-1.5">
            {history.sessions.map((s: any, i: number) => (
              <li key={s.id} className="flex items-center gap-3 text-sm">
                <Pill tone="slate">#{i + 1}</Pill>
                <span className="text-slate-600 dark:text-slate-300">{s.country ?? "—"}</span>
                <span className="flex-1">
                  <ProgressBar pct={Math.round((s.total / 5) * 100)} size="sm" />
                </span>
                <span className="text-xs font-bold text-slate-700 dark:text-slate-200">{s.total}/5</span>
              </li>
            ))}
          </ul>
        </JourneyCard>
      )}
    </div>
  );
}

// ===========================================================================
// INTERVIEW CENTER (spec §26)
// ===========================================================================

export function InterviewCenterPanel({ onNavigateTab }: { onNavigateTab: (t: string) => void }) {
  return (
    <div className="space-y-4">
      <JourneyCard
        title="Interview center"
        subtitle="Two kinds of interview, one place to practise them."
      >
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="sb-card-hover rounded-xl border border-slate-200 p-4 dark:border-slate-700">
            <p className="text-base" aria-hidden>
              🎓
            </p>
            <p className="text-sm font-bold text-slate-800 dark:text-slate-100">University interview</p>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
              Tell us about yourself, why this major, why this university, your goals, your challenges. We score clarity,
              structure, vocabulary and specificity.
            </p>
            <Button className="mt-3" onClick={() => onNavigateTab("visa")}>
              Practise a university interview
            </Button>
          </div>
          <div className="sb-card-hover rounded-xl border border-slate-200 p-4 dark:border-slate-700">
            <p className="text-base" aria-hidden>
              🛂
            </p>
            <p className="text-sm font-bold text-slate-800 dark:text-slate-100">Visa interview</p>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
              Purpose of study, funding, home ties, intent to return. The existing Visa Speaking assistant runs the full
              deterministic rubric.
            </p>
            <Button className="mt-3" variant="outline" onClick={() => onNavigateTab("visa")}>
              Practise a visa interview
            </Button>
          </div>
        </div>
        <p className="mt-3 rounded-lg bg-amber-50 px-3 py-2 text-[11px] text-amber-800 dark:bg-amber-950/40 dark:text-amber-200">
          We score how clearly you answered. We never estimate your chances of a visa approval — no tool can do that honestly.
        </p>
      </JourneyCard>
    </div>
  );
}
