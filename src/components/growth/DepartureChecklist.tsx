"use client";

import React, { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { motion } from "framer-motion";
import { ArrowRight, Banknote, Check, FileCheck2, Home, Luggage, MapPin, PartyPopper, Plane, Stamp } from "lucide-react";
import type { StudentProfile } from "../Navbar";
import { AnimatedBar } from "../motion";
import { useSeedText } from "./useSeedText";
import { api, EmptyState, ErrorNote, LoadingBlock, PageHeader, Toast, useToast } from "./ui";
import { AppNote } from "@/components/AppNote";

interface CheckItem {
  id: number;
  title: string;
  description: string;
  linkTab: string | null;
  done: boolean;
}
interface Phase {
  phase: string;
  items: CheckItem[];
  done: number;
  total: number;
}

const PHASE_ICON: Record<string, React.ComponentType<{ className?: string }>> = {
  offer: FileCheck2,
  visa: Stamp,
  money: Banknote,
  housing: Home,
  travel: Luggage,
  arrival: MapPin,
};

/**
 * Pre-departure checklist — the "after the offer" stretch (ApplyBoard's
 * visa/accommodation/loans services), reduced to a calm list of phases.
 * Items are admin-managed and can deep-link to the section that helps.
 */
export function DepartureChecklist({ activeProfile, onNavigate }: { activeProfile: StudentProfile | null; onNavigate?: (tab: string) => void }) {
  const t = useTranslations("departure");
  const tr = useSeedText();
  const [phases, setPhases] = useState<Phase[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [toast, showToast] = useToast();
  const profileId = activeProfile?.id ?? null;

  useEffect(() => {
    if (!profileId) return;
    let live = true;
    api<{ phases: Phase[] }>(`/api/departure?profileId=${profileId}`)
      .then((d) => live && setPhases(d.phases))
      .catch((e: Error) => live && setError(e.message));
    return () => {
      live = false;
    };
  }, [profileId]);

  const toggle = async (item: CheckItem) => {
    if (!profileId) return;
    const next = !item.done;
    const apply = (value: boolean) =>
      setPhases((ps) =>
        ps?.map((p) => {
          const items = p.items.map((i) => (i.id === item.id ? { ...i, done: value } : i));
          return { ...p, items, done: items.filter((i) => i.done).length };
        }) ?? ps
      );
    apply(next);
    try {
      await api("/api/departure", { method: "POST", body: JSON.stringify({ profileId, itemId: item.id, done: next }) });
    } catch (e) {
      apply(!next);
      showToast((e as Error).message);
    }
  };

  if (!profileId) return <EmptyState icon={Plane} title={t("signInTitle")} body={t("signInBody")} />;

  const total = phases?.reduce((s, p) => s + p.total, 0) ?? 0;
  const done = phases?.reduce((s, p) => s + p.done, 0) ?? 0;
  const pct = total ? Math.round((done / total) * 100) : 0;
  const knownPhase = (p: string) => ["offer", "visa", "money", "housing", "travel", "arrival"].includes(p);

  return (
    <div className="space-y-4">
      <PageHeader icon={Plane} title={t("title")} subtitle={t("subtitle")} accent="emerald" />
      {error && <ErrorNote message={error} />}
      {!phases && !error && <LoadingBlock label={t("loading")} />}
      {phases && phases.length === 0 && <EmptyState icon={Plane} title={t("empty")} />}

      {phases && phases.length > 0 && (
        <>
          <div className="rounded-2xl border border-slate-200 bg-white p-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-600">{t("progress", { done, total })}</span>
              <span className="text-lg font-black text-emerald-600">{pct}%</span>
            </div>
            <div className="mt-2">
              <AnimatedBar value={pct} barClassName="bg-emerald-500" />
            </div>
            {pct === 100 && (
              <p className="mt-3 flex items-center gap-2 text-sm font-bold text-emerald-700">
                <PartyPopper className="h-4 w-4" /> {t("allDone")}
              </p>
            )}
          </div>

          {/* Phase overview — horizontal on phones, grid on larger screens */}
          <div className="no-scrollbar -mx-1 flex gap-2 overflow-x-auto px-1 sm:grid sm:grid-cols-3 lg:grid-cols-6">
            {phases.map((p) => {
              const Icon = PHASE_ICON[p.phase] ?? Plane;
              const complete = p.done === p.total;
              return (
                <a
                  key={p.phase}
                  href={`#phase-${p.phase}`}
                  onClick={(e) => {
                    e.preventDefault();
                    document.getElementById(`phase-${p.phase}`)?.scrollIntoView({ behavior: "smooth", block: "start" });
                  }}
                  className={`flex min-w-[120px] shrink-0 items-center gap-2 rounded-xl border px-3 py-2 ${
                    complete ? "border-emerald-200 bg-emerald-50" : "border-slate-200 bg-white hover:bg-slate-50"
                  }`}
                >
                  <Icon className={`h-4 w-4 ${complete ? "text-emerald-600" : "text-slate-400"}`} />
                  <span className="min-w-0">
                    <span className="block truncate text-[11px] font-bold text-slate-800">{knownPhase(p.phase) ? t(`phase.${p.phase}`) : p.phase}</span>
                    <span className="text-[10px] text-slate-500">
                      {p.done}/{p.total}
                    </span>
                  </span>
                </a>
              );
            })}
          </div>

          <div className="grid gap-3 lg:grid-cols-2">
            {phases.map((p, pi) => {
              const Icon = PHASE_ICON[p.phase] ?? Plane;
              return (
                <motion.section
                  key={p.phase}
                  id={`phase-${p.phase}`}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: pi * 0.04 }}
                  className="scroll-mt-20 rounded-2xl border border-slate-200 bg-white p-4"
                >
                  <h2 className="flex items-center gap-2 text-sm font-extrabold text-slate-900">
                    <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600">
                      <Icon className="h-4 w-4" />
                    </span>
                    <span className="text-slate-400">{pi + 1}.</span> {knownPhase(p.phase) ? t(`phase.${p.phase}`) : p.phase}
                    <span className="ml-auto text-[11px] font-semibold text-slate-400">
                      {p.done}/{p.total}
                    </span>
                  </h2>
                  <ul className="mt-2 space-y-1">
                    {p.items.map((i) => (
                      <li key={i.id} className="flex items-start gap-2 rounded-xl px-1.5 py-1.5 hover:bg-slate-50">
                        <button
                          onClick={() => void toggle(i)}
                          role="checkbox"
                          aria-checked={i.done}
                          aria-label={tr(i.title)}
                          className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-md transition-colors ${
                            i.done ? "bg-emerald-500 text-white sb-ink-on-bright" : "border-2 border-slate-300 hover:border-emerald-400"
                          }`}
                        >
                          {i.done && <Check className="h-3.5 w-3.5" />}
                        </button>
                        <div className="min-w-0 flex-1">
                          <button onClick={() => void toggle(i)} className={`text-left text-sm font-semibold ${i.done ? "text-slate-400 line-through" : "text-slate-800"}`}>
                            {tr(i.title)}
                          </button>
                          {i.description && <p className="text-[11px] leading-snug text-slate-500">{tr(i.description)}</p>}
                        </div>
                        {i.linkTab && onNavigate && (
                          <button
                            onClick={() => onNavigate(i.linkTab!)}
                            className="inline-flex shrink-0 items-center gap-0.5 rounded-lg px-1.5 py-1 text-[11px] font-bold text-indigo-600 hover:bg-indigo-50"
                          >
                            {t("open")} <ArrowRight className="h-3 w-3" />
                          </button>
                        )}
                      </li>
                    ))}
                  </ul>
                </motion.section>
              );
            })}
          </div>
        </>
      )}
      <Toast message={toast} />
      {/* Standing small print: this panel can be wrong — say so where it is read. */}
      <AppNote kind="visa" className="mt-2" />
    </div>
  );
}
