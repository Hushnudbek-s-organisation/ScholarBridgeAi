"use client";

import { useCallback, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Plus, Trash2 } from "lucide-react";
import type { StudentProfile } from "../Navbar";
import { useSeedText } from "./useSeedText";
import { getJson, sendJson, useResource } from "@/components/journey/useResource";
import { AppNote } from "@/components/AppNote";
import { Button } from "@/components/ui/Button";
import { Empty, ErrorNote, Field, inputClass, JourneyCard, Loading, Pill, ProgressBar } from "@/components/ui/journey";
import { PanelDialog } from "@/components/ui/PanelDialog";

const PILLARS = ["academic", "activities", "skills", "career"] as const;
const VIEWS = { active: "viewActive", done: "viewDone", library: "viewLibrary" } as const;
type Pillar = typeof PILLARS[number];
type View = keyof typeof VIEWS;

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

interface GoalData {
  templates: Template[];
  goals: Goal[];
  maxActive: number;
}

const EMPTY: GoalData = { templates: [], goals: [], maxActive: 6 };
const EMPTY_FORM = { title: "", pillar: "academic" as Pillar, steps: "", targetDate: "" };

export function GoalPlanner({ activeProfile }: { activeProfile: StudentProfile | null }) {
  const t = useTranslations("goals");
  const tc = useTranslations("common");
  const tr = useSeedText();
  const locale = useLocale();
  const profileId = activeProfile?.id;
  const { data, loading, error, reload, setData } = useResource(
    useCallback(() => getJson<GoalData>(`/api/goals?profileId=${profileId}`, t("loadFailed")), [profileId, t]),
    [profileId],
    { initial: EMPTY, enabled: !!profileId, errorFallback: t("loadFailed") },
  );
  const [view, setView] = useState<View>("active");
  const [pillar, setPillar] = useState<Pillar | "all">("all");
  const [editor, setEditor] = useState<"new" | Goal | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [busy, setBusy] = useState(false);
  const [actionError, setActionError] = useState("");
  const [notice, setNotice] = useState("");

  const active = data.goals.filter((goal) => goal.status === "active");
  const done = data.goals.filter((goal) => goal.status === "done");
  const limited = active.length >= data.maxActive;
  const adopted = new Set(active.map((goal) => goal.templateId));
  const visible = (view === "done" ? done : active).filter((goal) => pillar === "all" || goal.pillar === pillar);
  const templates = data.templates.filter((template) => pillar === "all" || template.pillar === pillar);
  const dateFormatter = new Intl.DateTimeFormat(locale, { dateStyle: "medium", timeZone: "UTC" });

  function openEditor(target: "new" | Goal) {
    setEditor(target);
    setActionError("");
    setNotice("");
    setForm(target === "new" ? EMPTY_FORM : { title: target.title, pillar: target.pillar, targetDate: target.targetDate ?? "", steps: "" });
  }

  async function write(method: "POST" | "PUT" | "DELETE", payload: Record<string, unknown>, options: { close?: boolean; removed?: number; previous?: Goal } = {}) {
    if (busy) return;
    setBusy(true);
    setActionError("");
    setNotice("");
    try {
      const url = options.removed ? `/api/goals?id=${options.removed}` : "/api/goals";
      const init = method === "DELETE" ? { method } : { method, body: JSON.stringify({ profileId, ...payload }) };
      const result = await sendJson<{ goal?: Goal }>(url, init, t("saveFailed"));
      const goal = result.goal;
      if (options.removed) {
        setData((previous) => ({ ...previous, goals: previous.goals.filter((item) => item.id !== options.removed) }));
      } else if (goal) {
        setData((previous) => ({
          ...previous,
          goals: method === "POST" ? [goal, ...previous.goals] : previous.goals.map((item) => item.id === goal.id ? goal : item),
        }));
        if (method === "POST") {
          setView("active");
          setPillar("all");
          setNotice(t("added"));
        } else if (options.previous?.status === "active" && goal.status === "done") {
          setNotice(t("completed"));
        }
      }
      if (options.close) setEditor(null);
    } catch (failure) {
      setActionError(failure instanceof Error ? failure.message : t("saveFailed"));
    } finally {
      setBusy(false);
    }
  }

  if (!profileId) return <Empty title={t("signInTitle")} hint={t("signInBody")} />;
  if (loading && data === EMPTY) return <Loading label={t("loading")} />;
  if (error && data === EMPTY) return <JourneyCard title={t("title")}><ErrorNote message={t("loadFailed")} /><Button type="button" className="mt-3 min-h-11" variant="outline" onClick={() => void reload()}>{t("retry")}</Button></JourneyCard>;

  return (
    <div className="space-y-3">
      {error && <ErrorNote message={t("loadFailed")} />}
      {!editor && actionError && <ErrorNote message={actionError} />}
      {notice && <p className="text-sm font-semibold text-emerald-700 dark:text-emerald-300" role="status">{notice}</p>}
      <JourneyCard title={t("title")} action={<Button type="button" className="min-h-11" disabled={busy || limited} onClick={() => openEditor("new")}><Plus className="size-4" aria-hidden />{t("addGoal")}</Button>}>
        <p className="mb-3 text-sm text-slate-600 dark:text-slate-300">{t("activeUsage", { active: active.length, max: data.maxActive })}{limited ? ` · ${t("limitReached")}` : ""}</p>
        <div className="flex flex-wrap gap-2" role="group" aria-label={t("viewLabel")}>
          {(Object.keys(VIEWS) as View[]).map((value) => (
            <Button key={value} type="button" aria-pressed={view === value} variant={view === value ? "primary" : "outline"} className="min-h-11 whitespace-normal" onClick={() => { setView(value); setNotice(""); setActionError(""); }}>
              {t(VIEWS[value])}{value !== "library" && <span className="tabular-nums">{value === "active" ? active.length : done.length}</span>}
            </Button>
          ))}
        </div>
        <div className="mt-3 max-w-xs">
          <Field label={t("fPillar")}>
            <select className={`${inputClass} min-h-11`} value={pillar} onChange={(event) => setPillar(event.target.value as typeof pillar)}>
              <option value="all">{t("all")}</option>
              {PILLARS.map((value) => <option key={value} value={value}>{t(`pillar.${value}`)}</option>)}
            </select>
          </Field>
        </div>
      </JourneyCard>

      {view === "library" ? (
        templates.length > 0 ? (
          <div className="grid gap-3 md:grid-cols-2">
            {templates.map((template) => (
              <JourneyCard key={template.id} title={tr(template.title)} action={<Pill tone="brand">{t(`pillar.${template.pillar}`)}</Pill>}>
                <p className="break-words text-sm text-slate-600 dark:text-slate-300">{tr(template.description)}</p>
                <details className="mt-2">
                  <summary className="min-h-11 cursor-pointer py-2.5 text-sm font-semibold">{t("stepsCount", { n: template.steps.length })}{template.estWeeks ? ` · ${t("weeks", { n: template.estWeeks })}` : ""}</summary>
                  <ol className="mb-3 list-decimal space-y-1 pl-5 text-sm">{template.steps.map((step, index) => <li key={index}>{tr(step)}</li>)}</ol>
                </details>
                <Button type="button" variant="outline" className="min-h-11" disabled={busy || limited || adopted.has(template.id)} onClick={() => void write("POST", { templateId: template.id })}>
                  {adopted.has(template.id) ? t("onList") : t("addGoal")}
                </Button>
              </JourneyCard>
            ))}
          </div>
        ) : <Empty title={t("emptyFiltered")} />
      ) : visible.length > 0 ? (
        <div className="grid items-start gap-3 md:grid-cols-2">
          {visible.map((goal) => (
            <JourneyCard key={goal.id} title={tr(goal.title)} action={<Pill tone={goal.status === "done" ? "good" : "brand"}>{t(`pillar.${goal.pillar}`)}</Pill>}>
              <div className="mb-2 flex flex-wrap items-center justify-between gap-2 text-sm text-slate-600 dark:text-slate-300">
                <span>{t("stepsDone", { done: goal.steps.filter((step) => step.done).length, total: goal.steps.length })}</span>
                {goal.targetDate && <time dateTime={goal.targetDate}>{dateFormatter.format(new Date(goal.targetDate))}</time>}
              </div>
              {!!goal.steps.length && <ProgressBar pct={goal.progress} tone={goal.status === "done" ? "good" : "brand"} size="sm" label={tr(goal.title)} />}
              <ul className="mt-2 divide-y divide-slate-200 dark:divide-slate-700">
                {goal.steps.map((step, index) => (
                  <li key={index}>
                    <label className="flex min-h-11 cursor-pointer items-center gap-2 py-1.5 text-sm">
                      <input type="checkbox" className="size-4 shrink-0 accent-indigo-600" checked={step.done} disabled={busy || (limited && goal.status === "done")} onChange={() => void write("PUT", { id: goal.id, steps: goal.steps.map((entry, stepIndex) => stepIndex === index ? { ...entry, done: !entry.done } : entry) }, { previous: goal })} />
                      <span className={`min-w-0 break-words ${step.done ? "text-slate-600 dark:text-slate-300" : ""}`}>{tr(step.text)}</span>
                    </label>
                  </li>
                ))}
              </ul>
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <Button type="button" variant="outline" className="min-h-11" disabled={busy} onClick={() => openEditor(goal)}>{t("editGoal")}</Button>
                <Button type="button" variant="ghost" className="min-h-11" disabled={busy || (limited && goal.status === "done")} onClick={() => void write("PUT", { id: goal.id, status: goal.status === "done" ? "active" : "done" }, { previous: goal })}>{t(goal.status === "done" ? "reopen" : "markDone")}</Button>
                <Button type="button" variant="ghost" size="icon" aria-label={t("remove")} disabled={busy} onClick={() => { if (window.confirm(t("confirmRemove"))) void write("DELETE", {}, { removed: goal.id }); }}><Trash2 className="size-4" aria-hidden /></Button>
              </div>
            </JourneyCard>
          ))}
        </div>
      ) : (
        <Empty title={pillar !== "all" ? t("emptyFiltered") : view === "done" ? t("emptyDone") : t("emptyActive")} hint={view === "active" && pillar === "all" ? t("emptyActiveBody") : undefined}
          action={view === "active" && pillar === "all" ? <Button type="button" className="min-h-11" variant="outline" onClick={() => setView("library")}>{t("browseLibrary")}</Button> : undefined} />
      )}
      {editor && (
        <PanelDialog title={editor === "new" ? t("addGoal") : t("editGoal")} busy={busy} error={actionError} onClose={() => { setEditor(null); setActionError(""); }}>
          <form className="grid gap-3 sm:grid-cols-2" onSubmit={(event) => {
            event.preventDefault();
            const title = form.title.trim();
            if (!title) return;
            if (editor !== "new") {
              void write("PUT", { id: editor.id, title, targetDate: form.targetDate || null }, { previous: editor, close: true });
              return;
            }
            const steps = form.steps.split("\n").map((step) => step.trim()).filter(Boolean);
            if (!steps.length) { setActionError(t("fStepsHint")); return; }
            void write("POST", { title, pillar: form.pillar, steps, targetDate: form.targetDate || null }, { close: true });
          }}>
            <div className="sm:col-span-2"><Field label={t("fTitle")}><input className={inputClass} required maxLength={120} value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} /></Field></div>
            {editor === "new" && <Field label={t("fPillar")}><select className={inputClass} value={form.pillar} onChange={(event) => setForm({ ...form, pillar: event.target.value as Pillar })}>{PILLARS.map((value) => <option key={value} value={value}>{t(`pillar.${value}`)}</option>)}</select></Field>}
            <Field label={t("targetDate")}><input className={inputClass} type="date" value={form.targetDate} onChange={(event) => setForm({ ...form, targetDate: event.target.value })} /></Field>
            {editor === "new" && <div className="sm:col-span-2"><Field label={t("fSteps")} hint={t("fStepsHint")}><textarea rows={3} className={inputClass} required maxLength={1200} value={form.steps} onChange={(event) => setForm({ ...form, steps: event.target.value })} /></Field></div>}
            <Button type="submit" className="min-h-11 justify-self-start" disabled={busy || !form.title.trim()}>{editor === "new" ? t("addGoal") : tc("save")}</Button>
          </form>
        </PanelDialog>
      )}
      <AppNote kind="planning" />
    </div>
  );
}
