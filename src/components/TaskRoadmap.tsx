"use client";

import React, { useCallback, useState, useEffect } from "react";
import { useLocale, useTranslations } from "next-intl";
import { StudentProfile } from "./Navbar";
import { CheckSquare, Plus, Trash2, Check, Clock } from "lucide-react";
import { AppNote } from "@/components/AppNote";

export interface TaskItem {
  id: number;
  profileId: number;
  universityId?: number | null;
  title: string;
  category: string;
  dueDate: string;
  isCompleted: boolean;
  priority: string;
  universityName?: string | null;
}

interface TaskRoadmapProps {
  activeProfile: StudentProfile | null;
}

export function TaskRoadmap({ activeProfile }: TaskRoadmapProps) {
  const tr = useTranslations("taskRoadmap");
  const locale = useLocale();
  const profileId = activeProfile?.id;
  const [tasks, setTasks] = useState<TaskItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"All" | "Pending" | "Completed">("All");

  const categoryLabel = (category: string) => {
    switch (category) {
      case "Document Prep": return tr("categories.documentPrep");
      case "Standardized Test": return tr("categories.standardizedTest");
      case "SOP & Essays": return tr("categories.essays");
      case "LOR": return tr("categories.recommendations");
      case "Financials": return tr("categories.finance");
      case "Visa & Departure": return tr("categories.visaDeparture");
      default: return tr("categories.other");
    }
  };

  const filterLabel = (value: "All" | "Pending" | "Completed") => {
    switch (value) {
      case "All": return tr("filter.all");
      case "Pending": return tr("filter.pending");
      case "Completed": return tr("filter.completed");
    }
  };

  // New task form state
  const [showAddForm, setShowAddForm] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newCategory, setNewCategory] = useState("Document Prep");
  const [newDueDate, setNewDueDate] = useState("");
  const [newPriority, setNewPriority] = useState("Medium");

  const fetchTasks = useCallback(async () => {
    if (!profileId) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/tasks?profileId=${profileId}`);
      const data = await res.json();
      if (data.tasks) {
        setTasks(data.tasks);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [profileId]);

  useEffect(() => {
    void Promise.resolve().then(fetchTasks);
  }, [fetchTasks]);

  const handleToggleTask = async (id: number, currentCompleted: boolean) => {
    // Optimistic
    setTasks((prev) =>
      prev.map((t) => (t.id === id ? { ...t, isCompleted: !currentCompleted } : t))
    );

    try {
      await fetch("/api/tasks", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, isCompleted: !currentCompleted }),
      });
    } catch (err) {
      console.error(err);
    }
  };

  const handleAddTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeProfile || !newTitle) return;

    try {
      const res = await fetch("/api/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          profileId: activeProfile.id,
          title: newTitle,
          category: newCategory,
          dueDate: newDueDate,
          priority: newPriority,
        }),
      });
      const data = await res.json();
      if (data.task) {
        setTasks((prev) => [data.task, ...prev]);
        setNewTitle("");
        setShowAddForm(false);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteTask = async (id: number) => {
    setTasks((prev) => prev.filter((t) => t.id !== id));
    try {
      await fetch(`/api/tasks?id=${id}`, { method: "DELETE" });
    } catch (err) {
      console.error(err);
    }
  };

  const completedCount = tasks.filter((t) => t.isCompleted).length;
  const progressPercent = tasks.length > 0 ? Math.round((completedCount / tasks.length) * 100) : 0;

  const filteredTasks = tasks.filter((t) => {
    if (filter === "Pending") return !t.isCompleted;
    if (filter === "Completed") return t.isCompleted;
    return true;
  });

  // Monthly plan (spec §4): the same tasks grouped by due-date month, so the
  // student sees "September → October → November" at a glance, not just a
  // flat list. Month names follow the browser locale.
  const monthPlan: { key: string; label: string; tasks: TaskItem[] }[] = [];
  for (const t of [...filteredTasks].sort((a, b) => a.dueDate.localeCompare(b.dueDate))) {
    const d = new Date(`${t.dueDate}T00:00:00`);
    if (Number.isNaN(d.getTime())) continue;
    const key = `${d.getFullYear()}-${d.getMonth()}`;
    const label = d.toLocaleDateString(locale, { month: "long", year: "numeric" });
    let bucket = monthPlan.find((m) => m.key === key);
    if (!bucket) {
      bucket = { key, label, tasks: [] };
      monthPlan.push(bucket);
    }
    bucket.tasks.push(t);
  }

  return (
    <div className="space-y-6">
      {/* Header & Progress Bar */}
      <div className="min-w-0 space-y-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-xs sm:p-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-xl font-bold text-slate-900 flex items-center gap-2">
              <CheckSquare className="h-5 w-5 text-indigo-600" />
              {tr("title")}
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">
              {tr("subtitle")}
            </p>
          </div>

          <button
            type="button"
            onClick={() => setShowAddForm(!showAddForm)}
            aria-expanded={showAddForm}
            aria-controls="task-roadmap-add-form"
            className="flex min-h-11 shrink-0 items-center gap-1.5 rounded-xl bg-indigo-600 px-4 py-2 text-xs font-semibold text-white shadow-xs transition-colors hover:bg-indigo-700"
          >
            <Plus className="h-4 w-4" /> {tr("addTask")}
          </button>
        </div>

        {/* Progress Bar */}
        <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 space-y-2">
          <div className="flex justify-between items-center text-xs font-semibold text-slate-700">
            <span className="break-words">{tr("progress", { done: completedCount, total: tasks.length })}</span>
            <span className="text-indigo-600 font-bold">{progressPercent}%</span>
          </div>
          <div className="w-full h-2.5 bg-slate-200 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-indigo-500 to-emerald-500 transition-all duration-300"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-2 pt-2" role="group" aria-label={tr("filterTasks")}>
          {(["All", "Pending", "Completed"] as const).map((st) => (
            <button
              key={st}
              type="button"
              aria-pressed={filter === st}
              onClick={() => setFilter(st)}
              className={`min-h-11 rounded-lg px-3 py-2 text-xs font-semibold transition-all ${
                filter === st
                  ? "bg-indigo-600 text-white shadow-xs"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >
              {filterLabel(st)}
            </button>
          ))}
        </div>
      </div>

      {/* New Task Inline Form */}
      {showAddForm && (
        <form id="task-roadmap-add-form" onSubmit={handleAddTask} className="min-w-0 space-y-4 rounded-2xl border border-indigo-200 bg-indigo-50/60 p-4 sm:p-5">
          <h3 className="break-words text-xs font-bold uppercase tracking-wider text-slate-900">{tr("formTitle")}</h3>
          <div className="grid grid-cols-1 gap-3 text-xs sm:grid-cols-3 lg:grid-cols-4">
            <div className="min-w-0 sm:col-span-2">
              <label htmlFor="task-roadmap-title" className="mb-1 block font-semibold text-slate-700">{tr("taskTitle")}</label>
              <input
                id="task-roadmap-title"
                type="text"
                required
                placeholder={tr("taskPlaceholder")}
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                className="min-h-11 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div>
              <label htmlFor="task-roadmap-category" className="mb-1 block font-semibold text-slate-700">{tr("category")}</label>
              <select
                id="task-roadmap-category"
                value={newCategory}
                onChange={(e) => setNewCategory(e.target.value)}
                className="min-h-11 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="Document Prep">{tr("categories.documentPrep")}</option>
                <option value="Standardized Test">{tr("categories.standardizedTest")}</option>
                <option value="SOP & Essays">{tr("categories.essays")}</option>
                <option value="LOR">{tr("categories.recommendations")}</option>
                <option value="Financials">{tr("categories.finance")}</option>
                <option value="Visa & Departure">{tr("categories.visaDeparture")}</option>
              </select>
            </div>

            <div>
              <label htmlFor="task-roadmap-due-date" className="mb-1 block font-semibold text-slate-700">{tr("dueDate")}</label>
              <input
                id="task-roadmap-due-date"
                type="date"
                required
                value={newDueDate}
                onChange={(e) => setNewDueDate(e.target.value)}
                className="min-h-11 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>

          <div className="flex flex-wrap justify-end gap-2">
            <button
              type="button"
              onClick={() => setShowAddForm(false)}
              className="min-h-11 rounded-lg px-3 py-2 text-xs text-slate-600 hover:bg-slate-200"
            >
              {tr("cancel")}
            </button>
            <button
              type="submit"
              className="min-h-11 rounded-lg bg-indigo-600 px-4 py-2 text-xs font-semibold text-white hover:bg-indigo-700"
            >
              {tr("saveTask")}
            </button>
          </div>
        </form>
      )}

      {/* Monthly plan — grouped view of the same tasks (spec §4) */}
      {!loading && monthPlan.length > 0 && (
        <div className="grid gap-4 sm:grid-cols-3">
          {monthPlan.map((m) => {
            const done = m.tasks.filter((t) => t.isCompleted).length;
            return (
              <div key={m.key} className="min-w-0 rounded-2xl border border-slate-200 bg-white p-4 shadow-xs">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-extrabold uppercase tracking-wide text-slate-800">
                    {m.label}
                  </h3>
                  <span className="text-[11px] font-bold text-slate-500" aria-label={tr("monthProgress", { done, total: m.tasks.length })}>
                    {done}/{m.tasks.length}
                  </span>
                </div>
                <ul className="mt-3 space-y-1.5">
                  {m.tasks.map((t) => (
                    <li key={t.id} className="flex items-center gap-2">
                      <button
                        onClick={() => handleToggleTask(t.id, t.isCompleted)}
                        aria-label={tr(t.isCompleted ? "markIncomplete" : "markComplete", { title: t.title })}
                        className={`flex min-h-11 min-w-11 shrink-0 items-center justify-center rounded-md border transition-colors ${
                          t.isCompleted
                            ? "bg-emerald-600 border-emerald-600 text-white"
                            : "border-slate-300 hover:border-indigo-500 bg-white"
                        }`}
                      >
                        {t.isCompleted && <Check className="h-3.5 w-3.5" />}
                      </button>
                      <span
                        className={`min-w-0 break-words text-xs font-semibold ${
                          t.isCompleted ? "line-through text-slate-400" : "text-slate-700"
                        }`}
                      >
                        {t.title}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}
        </div>
      )}

      {/* Task List */}
      {loading ? (
        <div className="p-8 text-center text-slate-500 font-medium bg-white rounded-2xl border border-slate-200">
          {tr("loading")}
        </div>
      ) : filteredTasks.length === 0 ? (
        <div className="p-8 text-center text-slate-500 bg-white rounded-2xl border border-slate-200">
          {tr("empty")}
        </div>
      ) : (
        <div className="space-y-3">
          {filteredTasks.map((t) => (
            <div
              key={t.id}
              className={`flex min-w-0 items-center justify-between gap-3 rounded-2xl border bg-white p-4 shadow-xs transition-all sm:gap-4 ${
                t.isCompleted
                  ? "border-emerald-200 bg-emerald-50/20"
                  : "border-slate-200 hover:border-indigo-300"
              }`}
            >
              <div className="flex min-w-0 flex-1 items-start gap-3">
                <button
                  onClick={() => handleToggleTask(t.id, t.isCompleted)}
                  aria-label={tr(t.isCompleted ? "markIncomplete" : "markComplete", { title: t.title })}
                  className={`flex min-h-11 min-w-11 shrink-0 items-center justify-center rounded-lg border transition-colors ${
                    t.isCompleted
                      ? "bg-emerald-600 border-emerald-600 text-white"
                      : "border-slate-300 hover:border-indigo-500 bg-white"
                  }`}
                >
                  {t.isCompleted && <Check className="h-4 w-4" />}
                </button>

                <div className="min-w-0 flex-1 space-y-1">
                  <span
                    className={`block break-words text-sm font-bold ${
                      t.isCompleted ? "line-through text-slate-400" : "text-slate-900"
                    }`}
                  >
                    {t.title}
                  </span>

                  <div className="flex flex-wrap items-center gap-2 text-[11px] text-slate-500">
                    <span className="max-w-full break-words rounded bg-slate-100 px-2 py-0.5 font-semibold text-slate-700">
                      {categoryLabel(t.category)}
                    </span>

                    <span className="flex items-center gap-1 font-semibold text-amber-700">
                      <Clock className="h-3 w-3 shrink-0" /> {tr("dueOn", { date: new Date(`${t.dueDate}T00:00:00`).toLocaleDateString(locale) })}
                    </span>

                    {t.universityName && (
                      <span className="break-words font-semibold text-indigo-600">
                        🎓 {t.universityName}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              <button
                onClick={() => handleDeleteTask(t.id)}
                aria-label={tr("deleteTask")}
                title={tr("deleteTask")}
                className="flex min-h-11 min-w-11 shrink-0 items-center justify-center rounded-lg text-slate-300 transition-colors hover:bg-red-50 hover:text-red-600"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          ))}
        </div>
      )}
      {/* Standing small print: this panel can be wrong — say so where it is read. */}
      <AppNote kind="planning" className="mt-2" />
    </div>
  );
}
