"use client";

import React, { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { m as Motion } from "framer-motion";
import { ArrowRight, Banknote, Check, FileCheck2, Home, Luggage, MapPin, PartyPopper, Plane, Stamp } from "lucide-react";
import type { StudentProfile } from "../Navbar";
import { AnimatedBar } from "../motion";
import { useSeedText } from "./useSeedText";
import { api, EmptyState, ErrorNote, LoadingBlock, PageHeader, Toast, useToast } from "@/components/ui/growth";
import { AppNote } from "@/components/AppNote";
import { Button } from "@/components/ui/Button";

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
  application: FileCheck2,
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
  const [departureDate, setDepartureDate] = useState("");
  const [savedDepartureDate, setSavedDepartureDate] = useState("");
  const [savingDate, setSavingDate] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [toast, showToast] = useToast();
  const profileId = activeProfile?.id ?? null;

  useEffect(() => {
    if (!profileId) return;
    let live = true;
    api<{ phases: Phase[]; departureDate: string | null }>(`/api/departure?profileId=${profileId}`)
      .then((d) => {
        if (!live) return;
        setPhases(d.phases);
        setDepartureDate(d.departureDate ?? "");
        setSavedDepartureDate(d.departureDate ?? "");
      })
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

  async function saveDepartureDate() {
    if (!profileId || savingDate) return;
    setSavingDate(true);
    try {
      const result = await api<{ departureDate: string | null }>("/api/departure", {
        method: "PUT", body: JSON.stringify({ profileId, departureDate: departureDate || null }),
      });
      setDepartureDate(result.departureDate ?? "");
      setSavedDepartureDate(result.departureDate ?? "");
      showToast(t("dateSaved"));
    } catch {
      showToast(t("dateError"));
    } finally {
      setSavingDate(false);
    }
  }

  if (!profileId) return <EmptyState icon={Plane} title={t("signInTitle")} body={t("signInBody")} />;

  const total = phases?.reduce((s, p) => s + p.total, 0) ?? 0;
  const done = phases?.reduce((s, p) => s + p.done, 0) ?? 0;
  const pct = total ? Math.round((done / total) * 100) : 0;
  const knownPhase = (p: string) => ["application", "offer", "visa", "money", "housing", "travel", "arrival"].includes(p);

  return (
    <div className="space-y-4">
      <PageHeader icon={Plane} title={t("title")} subtitle={t("subtitle")} accent="emerald" />
      {error && <ErrorNote message={error} />}
      {phases && <form className="flex flex-wrap items-end gap-3 rounded-overlay border border-slate-200 p-4 dark:border-slate-700" onSubmit={(event) => {
        event.preventDefault();
        void saveDepartureDate();
      }}>
        <label className="grid gap-1 text-sm font-semibold">
          {t("dateLabel")}
          <input type="date" value={departureDate} onChange={(event) => setDepartureDate(event.target.value)}
            disabled={savingDate} className="rounded-control border border-slate-300 bg-transparent px-2 py-2 dark:border-slate-600" />
        </label>
        <Button type="submit" variant="outline" disabled={savingDate || departureDate === savedDepartureDate}>{t("saveDate")}</Button>
        <p className="w-full text-sm text-[var(--sb-ink-muted)]">{t("dateHint")}</p>
      </form>}
      {!phases && !error && <LoadingBlock label={t("loading")} />}
      {phases && phases.length === 0 && <EmptyState icon={Plane} title={t("empty")} />}

      {phases && phases.length > 0 && (
        <>
          <div className="rounded-overlay border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-4">
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
          <div className="no-scrollbar -mx-1 flex gap-2 overflow-x-auto px-1 sm:grid sm:grid-cols-3 lg:grid-cols-7">
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
                  className={`flex min-w-[120px] shrink-0 items-center gap-2 rounded-surface border px-3 py-2 ${
                    complete ? "border-emerald-200 bg-emerald-50" : "border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 hover:bg-slate-50"
                  }`}
                >
                  <Icon className={`h-4 w-4 ${complete ? "text-emerald-600" : "text-slate-500"}`} />
                  <span className="min-w-0">
                    <span className="block break-words text-xs font-bold text-slate-800">{knownPhase(p.phase) ? t(`phase.${p.phase}`) : p.phase}</span>
                    <span className="text-xs text-slate-500">
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
                <Motion.section
                  key={p.phase}
                  id={`phase-${p.phase}`}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: pi * 0.04 }}
                  className="scroll-mt-20 rounded-overlay border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-4"
                >
                  <h2 className="flex items-center gap-2 text-sm font-extrabold text-slate-900 dark:text-slate-100">
                    <span className="flex h-7 w-7 items-center justify-center rounded-control bg-emerald-50 text-emerald-600">
                      <Icon className="h-4 w-4" />
                    </span>
                    <span className="text-slate-500">{pi + 1}.</span> {knownPhase(p.phase) ? t(`phase.${p.phase}`) : p.phase}
                    <span className="ml-auto text-xs font-semibold text-slate-500">
                      {p.done}/{p.total}
                    </span>
                  </h2>
                  <ul className="mt-2 space-y-1">
                    {p.items.map((i) => (
                      <li key={i.id} className="flex items-start gap-2 rounded-surface px-1.5 py-1.5 hover:bg-slate-50">
                        <Button variant="unstyled"
                          onClick={() => void toggle(i)}
                          role="checkbox"
                          aria-checked={i.done}
                          aria-label={tr(i.title)}
                          className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-control transition-colors ${
                            i.done ? "bg-emerald-700 text-white sb-ink-on-bright" : "border-2 border-slate-300 hover:border-emerald-400"
                          }`}
                        >
                          {i.done && <Check className="h-3.5 w-3.5" />}
                        </Button>
                        <div className="min-w-0 flex-1">
                          <Button variant="unstyled" onClick={() => void toggle(i)} className={`text-left text-sm font-semibold ${i.done ? "text-slate-500 line-through" : "text-slate-800"}`}>
                            {tr(i.title)}
                          </Button>
                          {i.description && <p className="text-sm leading-snug text-slate-500">{tr(i.description)}</p>}
                        </div>
                        {i.linkTab && onNavigate && (
                          <Button variant="unstyled"
                            onClick={() => onNavigate(i.linkTab!)}
                            className="inline-flex shrink-0 items-center gap-0.5 rounded-control px-1.5 py-1 text-xs font-bold text-indigo-600 hover:bg-indigo-50"
                          >
                            {t("open")} <ArrowRight className="h-3 w-3" />
                          </Button>
                        )}
                      </li>
                    ))}
                  </ul>
                </Motion.section>
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
