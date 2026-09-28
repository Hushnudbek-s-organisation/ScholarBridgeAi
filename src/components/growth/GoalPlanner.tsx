"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { AnimatePresence, motion } from "framer-motion";
import { BookOpen, Briefcase, Check, Clock, Flag, Plus, Sparkles, Trash2, Trophy, Wrench, X } from "lucide-react";
import type { StudentProfile } from "../Navbar";
import { AnimatedBar } from "../motion";
import { useSeedText } from "./useSeedText";
import { api, EmptyState, ErrorNote, Field, inputCls, LoadingBlock, PageHeader, Segmented, Toast, useToast } from "./ui";

type Pillar = "academic" | "activities" | "skills" | "career";

interface Template {
  id: number;
  pillar: Pillar;
  title: string;
  description: string;
  steps: string[];
  level: string;
  estWeeks: number | null;
}

interface Goal {
  id: number;
  templateId: number | null;
  pillar: Pillar;
  title: string;
  steps: { text: string; done: boolean }[];
  status: "active" | "done";
  targetDate: string | null;
  progress: number;
}

const PILLAR_STYLE: Record<Pillar, { icon: React.ComponentType<{ className?: string }>; chip: string; bar: string }> = {
  academic: { icon: BookOpen, chip: "bg-indigo-100 text-indigo-700", bar: "bg-indigo-500" },
  activities: { icon: Trophy, chip: "bg-amber-100 text-amber-700", bar: "bg-amber-500" },
  skills: { icon: Wrench, chip: "bg-teal-100 text-teal-700", bar: "bg-teal-500" },
  career: { icon: Briefcase, chip: "bg-rose-100 text-rose-700", bar: "bg-rose-500" },
};

/**
 * Goal planner — Crimson Rise's "pick a few outcomes and work on them with a
 * strategist" idea, adapted into a self-serve tool: an admin-curated goal
 * library, a hard limit of 6 active goals, and tick-box steps.
 */
export function GoalPlanner({ activeProfile }: { activeProfile: StudentProfile | null }) {
  const t = useTranslations("goals");
  const tr = useSeedText();
  const [templates, setTemplates] = useState<Template[] | null>(null);
  const [goals, setGoals] = useState<Goal[]>([]);
  const [maxActive, setMaxActive] = useState(6);
  const [error, setError] = useState<string | null>(null);
  const [view, setView] = useState<"active" | "library" | "done">("active");
  const [pillar, setPillar] = useState<"all" | Pillar>("all");
  const [custom, setCustom] = useState(false);
  const [form, setForm] = useState({ title: "", pillar: "academic" as Pillar, steps: "" });
  const [busy, setBusy] = useState(false);
  const [toast, showToast] = useToast();
  const profileId = activeProfile?.id ?? null;

  useEffect(() => {
    if (!profileId) return;
    let live = true;
    api<{ templates: Template[]; goals: Goal[]; maxActive: number }>(`/api/goals?profileId=${profileId}`)
      .then((d) => {
        if (!live) return;
        setTemplates(d.templates);
        setGoals(d.goals);
        setMaxActive(d.maxActive);
        if (d.goals.filter((g) => g.status === "active").length === 0) setView("library");
      })
      .catch((e: Error) => live && setError(e.message));
    return () => {
      live = false;
    };
  }, [profileId]);

  const active = goals.filter((g) => g.status === "active");
  const done = goals.filter((g) => g.status === "done");
  const adoptedIds = new Set(active.map((g) => g.templateId));
  const pillarLabel = (p: Pillar) => t(`pillar.${p}`);

  const filteredTemplates = useMemo(
    () => (templates ?? []).filter((tp) => pillar === "all" || tp.pillar === pillar),
    [templates, pillar]
  );

  const add = async (body: Record<string, unknown>) => {
    if (!profileId) return;
    setBusy(true);
    try {
      const d = await api<{ goal: Goal }>("/api/goals", { method: "POST", body: JSON.stringify({ profileId, ...body }) });
      setGoals((g) => [d.goal, ...g]);
      showToast(t("added"));
      setView("active");
      setCustom(false);
      setForm({ title: "", pillar: "academic", steps: "" });
    } catch (e) {
      showToast((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const update = async (goal: Goal, patch: Record<string, unknown>) => {
    try {
      const d = await api<{ goal: Goal }>("/api/goals", { method: "PUT", body: JSON.stringify({ id: goal.id, ...patch }) });
      setGoals((gs) => gs.map((g) => (g.id === goal.id ? d.goal : g)));
      if (d.goal.status === "done" && goal.status !== "done") showToast(t("completed"));
    } catch (e) {
      showToast((e as Error).message);
    }
  };

  const toggleStep = (goal: Goal, idx: number) => {
    const steps = goal.steps.map((s, i) => (i === idx ? { ...s, done: !s.done } : s));
    // Optimistic tick so the checkbox reacts instantly.
    setGoals((gs) => gs.map((g) => (g.id === goal.id ? { ...g, steps } : g)));
    void update(goal, { steps });
  };

  const remove = async (goal: Goal) => {
    if (!window.confirm(t("confirmRemove"))) return;
    try {
      await api(`/api/goals?id=${goal.id}`, { method: "DELETE" });
      setGoals((gs) => gs.filter((g) => g.id !== goal.id));
    } catch (e) {
      showToast((e as Error).message);
    }
  };

  if (!profileId) return <EmptyState icon={Flag} title={t("signInTitle")} body={t("signInBody")} />;

  const goalCard = (g: Goal) => {
    const st = PILLAR_STYLE[g.pillar] ?? PILLAR_STYLE.academic;
    const Icon = st.icon;
    return (
      <motion.li
        key={g.id}
        layout
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.97 }}
        className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs"
      >
        <div className="flex items-start gap-3">
          <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${st.chip}`}>
            <Icon className="h-4 w-4" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-bold text-slate-900">{tr(g.title)}</p>
            <p className="text-[11px] text-slate-500">
              {pillarLabel(g.pillar)} · {t("stepsDone", { done: g.steps.filter((s) => s.done).length, total: g.steps.length })}
            </p>
          </div>
          <span className="text-lg font-black text-slate-800">{g.progress}%</span>
        </div>
        <div className="mt-2">
          <AnimatedBar value={g.progress} barClassName={st.bar} trackClassName="h-1.5 w-full overflow-hidden rounded-full bg-slate-100" />
        </div>
        <ul className="mt-3 space-y-1">
          {g.steps.map((s, i) => (
            <li key={i}>
              <button onClick={() => toggleStep(g, i)} className="flex w-full items-start gap-2 rounded-lg px-1.5 py-1 text-left hover:bg-slate-50">
                <span
                  className={`mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded ${s.done ? "bg-emerald-500 text-white" : "border-2 border-slate-300"}`}
                >
                  {s.done && <Check className="h-3 w-3" />}
                </span>
                <span className={`text-xs leading-snug ${s.done ? "text-slate-400 line-through" : "text-slate-700"}`}>{tr(s.text)}</span>
              </button>
            </li>
          ))}
        </ul>
        <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 pt-3">
          <label className="flex items-center gap-1.5 text-[11px] text-slate-500">
            <Clock className="h-3.5 w-3.5" /> {t("targetDate")}
            <input
              type="date"
              value={g.targetDate ?? ""}
              onChange={(e) => void update(g, { targetDate: e.target.value || null })}
              className="rounded-lg border border-slate-200 bg-white px-2 py-1 text-[11px] text-slate-700"
            />
          </label>
          <div className="flex gap-1.5">
            {g.status === "done" ? (
              <button onClick={() => void update(g, { status: "active" })} className="rounded-lg border border-slate-200 px-2.5 py-1.5 text-[11px] font-bold text-slate-600 hover:bg-slate-50">
                {t("reopen")}
              </button>
            ) : (
              <button onClick={() => void update(g, { status: "done" })} className="rounded-lg border border-emerald-200 bg-emerald-50 px-2.5 py-1.5 text-[11px] font-bold text-emerald-700 hover:bg-emerald-100">
                {t("markDone")}
              </button>
            )}
            <button onClick={() => void remove(g)} className="rounded-lg border border-slate-200 p-1.5 text-slate-400 hover:bg-rose-50 hover:text-rose-600" aria-label={t("remove")}>
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      </motion.li>
    );
  };

  return (
    <div className="space-y-4">
      <PageHeader icon={Flag} title={t("title")} subtitle={t("subtitle")} accent="amber">
        <button
          onClick={() => {
            setCustom(true);
            setView("library");
          }}
          className="inline-flex items-center gap-1.5 rounded-xl bg-slate-900 px-3.5 py-2 text-xs font-bold text-white hover:bg-slate-800"
        >
          <Plus className="h-3.5 w-3.5" /> {t("customGoal")}
        </button>
      </PageHeader>

      {error && <ErrorNote message={error} />}
      {!templates && !error && <LoadingBlock label={t("loading")} />}

      {templates && (
        <>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {(Object.keys(PILLAR_STYLE) as Pillar[]).map((p) => {
              const st = PILLAR_STYLE[p];
              const Icon = st.icon;
              const n = active.filter((g) => g.pillar === p).length;
              return (
                <div key={p} className="flex items-center gap-2.5 rounded-2xl border border-slate-200 bg-white p-3">
                  <span className={`flex h-8 w-8 items-center justify-center rounded-lg ${st.chip}`}>
                    <Icon className="h-4 w-4" />
                  </span>
                  <div className="min-w-0">
                    <p className="truncate text-[11px] font-bold text-slate-500">{pillarLabel(p)}</p>
                    <p className="text-lg font-black leading-none text-slate-900">{n}</p>
                  </div>
                </div>
              );
            })}
          </div>

          <p className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
            {t("focusRule", { max: maxActive, active: active.length })}
          </p>

          <Segmented
            value={view}
            onChange={setView}
            options={[
              { id: "active", label: t("viewActive"), count: active.length },
              { id: "library", label: t("viewLibrary"), count: templates.length },
              { id: "done", label: t("viewDone"), count: done.length },
            ]}
          />

          {view === "active" &&
            (active.length === 0 ? (
              <EmptyState
                icon={Sparkles}
                title={t("emptyActive")}
                body={t("emptyActiveBody")}
                action={
                  <button onClick={() => setView("library")} className="rounded-xl bg-amber-500 px-4 py-2 text-xs font-bold text-white hover:bg-amber-600">
                    {t("browseLibrary")}
                  </button>
                }
              />
            ) : (
              <ul className="grid gap-3 md:grid-cols-2 2xl:grid-cols-3">
                <AnimatePresence initial={false}>{active.map(goalCard)}</AnimatePresence>
              </ul>
            ))}

          {view === "done" &&
            (done.length === 0 ? (
              <EmptyState icon={Trophy} title={t("emptyDone")} />
            ) : (
              <ul className="grid gap-3 md:grid-cols-2 2xl:grid-cols-3">
                <AnimatePresence initial={false}>{done.map(goalCard)}</AnimatePresence>
              </ul>
            ))}

          {view === "library" && (
            <div className="space-y-3">
              <AnimatePresence>
                {custom && (
                  <motion.form
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    onSubmit={(e) => {
                      e.preventDefault();
                      void add({ title: form.title, pillar: form.pillar, steps: form.steps.split("\n").map((s) => s.trim()).filter(Boolean) });
                    }}
                    className="overflow-hidden rounded-2xl border border-slate-200 bg-white p-4"
                  >
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-bold text-slate-900">{t("customGoal")}</p>
                      <button type="button" onClick={() => setCustom(false)} className="rounded-lg p-1 text-slate-400 hover:bg-slate-100" aria-label={t("cancel")}>
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                    <div className="mt-3 grid gap-3 sm:grid-cols-3">
                      <div className="sm:col-span-2">
                        <Field label={t("fTitle")}>
                          <input required maxLength={120} value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} className={inputCls} placeholder={t("fTitlePh")} />
                        </Field>
                      </div>
                      <Field label={t("fPillar")}>
                        <select value={form.pillar} onChange={(e) => setForm({ ...form, pillar: e.target.value as Pillar })} className={inputCls}>
                          {(Object.keys(PILLAR_STYLE) as Pillar[]).map((p) => (
                            <option key={p} value={p}>
                              {pillarLabel(p)}
                            </option>
                          ))}
                        </select>
                      </Field>
                      <div className="sm:col-span-3">
                        <Field label={t("fSteps")} hint={t("fStepsHint")}>
                          <textarea rows={4} value={form.steps} onChange={(e) => setForm({ ...form, steps: e.target.value })} className={inputCls} />
                        </Field>
                      </div>
                    </div>
                    <div className="mt-3 flex justify-end">
                      <button disabled={busy || active.length >= maxActive} className="rounded-xl bg-amber-500 px-4 py-2 text-xs font-bold text-white hover:bg-amber-600 disabled:opacity-50">
                        {t("addGoal")}
                      </button>
                    </div>
                  </motion.form>
                )}
              </AnimatePresence>

              <div className="no-scrollbar -mx-1 flex gap-1.5 overflow-x-auto px-1">
                {(["all", "academic", "activities", "skills", "career"] as const).map((p) => (
                  <button
                    key={p}
                    onClick={() => setPillar(p)}
                    className={`shrink-0 rounded-full border px-3 py-1.5 text-[11px] font-bold ${
                      pillar === p ? "border-amber-300 bg-amber-50 text-amber-800" : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                    }`}
                  >
                    {p === "all" ? t("all") : pillarLabel(p)}
                  </button>
                ))}
              </div>

              <ul className="grid gap-3 md:grid-cols-2 2xl:grid-cols-3">
                {filteredTemplates.map((tp) => {
                  const st = PILLAR_STYLE[tp.pillar] ?? PILLAR_STYLE.academic;
                  const Icon = st.icon;
                  const adopted = adoptedIds.has(tp.id);
                  return (
                    <li key={tp.id} className="flex flex-col rounded-2xl border border-slate-200 bg-white p-4">
                      <div className="flex items-start gap-3">
                        <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${st.chip}`}>
                          <Icon className="h-4 w-4" />
                        </span>
                        <div className="min-w-0">
                          <p className="text-sm font-bold text-slate-900">{tr(tp.title)}</p>
                          <p className="text-[11px] text-slate-500">
                            {pillarLabel(tp.pillar)}
                            {tp.estWeeks ? ` · ${t("weeks", { n: tp.estWeeks })}` : ""} · {t("stepsCount", { n: tp.steps.length })}
                          </p>
                        </div>
                      </div>
                      {tp.description && <p className="mt-2 text-xs leading-relaxed text-slate-600">{tr(tp.description)}</p>}
                      <ol className="mt-2 list-decimal space-y-0.5 pl-5 text-[11px] text-slate-500">
                        {tp.steps.slice(0, 3).map((s, i) => (
                          <li key={i}>{tr(s)}</li>
                        ))}
                        {tp.steps.length > 3 && <li className="list-none text-slate-400">{t("more", { n: tp.steps.length - 3 })}</li>}
                      </ol>
                      <div className="mt-auto pt-3">
                        <button
                          disabled={busy || adopted || active.length >= maxActive}
                          onClick={() => void add({ templateId: tp.id })}
                          className={`w-full rounded-xl px-3 py-2 text-xs font-bold ${
                            adopted ? "bg-emerald-50 text-emerald-700" : "bg-amber-500 text-white hover:bg-amber-600"
                          } disabled:cursor-not-allowed disabled:opacity-70`}
                        >
                          {adopted ? t("onList") : active.length >= maxActive ? t("limitReached") : t("addGoal")}
                        </button>
                      </div>
                    </li>
                  );
                })}
              </ul>
            </div>
          )}
        </>
      )}
      <Toast message={toast} />
    </div>
  );
}
