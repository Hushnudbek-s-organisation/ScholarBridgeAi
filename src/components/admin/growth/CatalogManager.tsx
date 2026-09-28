"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { Eye, EyeOff, Loader2, Pencil, Plus, RefreshCw, Save, Search, Trash2, X } from "lucide-react";

export type FieldDef =
  | { key: string; label: string; type: "text" | "textarea"; required?: boolean; max?: number; placeholder?: string; wide?: boolean }
  | { key: string; label: string; type: "number"; min?: number; max?: number }
  | { key: string; label: string; type: "select"; options: { value: string; label: string }[]; allowEmpty?: boolean }
  | { key: string; label: string; type: "lines"; hint?: string; wide?: boolean }
  | { key: string; label: string; type: "checkbox" };

type Row = Record<string, unknown> & { id: number; isActive?: boolean; sortOrder?: number };

const inputCls =
  "w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-400";

/**
 * Generic admin editor for the small growth catalogues (goal library, Answer
 * Vault questions, departure checklist). Backed by `makeAdminCrud` routes:
 * GET list · POST create · PUT {id,…} update · DELETE ?id=.
 */
export function CatalogManager({
  endpoint,
  fields,
  titleKey,
  subtitle,
  groupKey,
  groupLabel,
  intro,
}: {
  endpoint: string;
  fields: FieldDef[];
  /** Field shown as the row title. */
  titleKey: string;
  /** Row subtitle builder. */
  subtitle?: (row: Row) => string;
  /** Optional field to group rows by (e.g. pillar, phase, category). */
  groupKey?: string;
  groupLabel?: (value: string) => string;
  intro?: string;
}) {
  const t = useTranslations("adminGrowth");
  const [rows, setRows] = useState<Row[] | null>(null);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [editing, setEditing] = useState<Row | "new" | null>(null);
  const [form, setForm] = useState<Record<string, unknown>>({});
  const [saving, setSaving] = useState(false);
  const [q, setQ] = useState("");

  const load = useCallback(async () => {
    setError("");
    try {
      const res = await fetch(endpoint, { cache: "no-store" });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error || `HTTP ${res.status}`);
      setRows(d.items ?? []);
    } catch (e) {
      setError((e as Error).message);
      setRows([]);
    }
  }, [endpoint]);

  useEffect(() => {
    const id = window.setTimeout(() => void load(), 0);
    return () => window.clearTimeout(id);
  }, [load]);

  const blank = useMemo(() => {
    const f: Record<string, unknown> = {};
    for (const d of fields) {
      f[d.key] =
        d.type === "checkbox" ? true : d.type === "lines" ? "" : d.type === "select" ? (d.allowEmpty ? "" : d.options[0]?.value ?? "") : "";
    }
    return f;
  }, [fields]);

  const startEdit = (row: Row | "new") => {
    setNotice("");
    setError("");
    if (row === "new") {
      setForm({ ...blank, sortOrder: rows?.length ?? 0 });
    } else {
      const f: Record<string, unknown> = { sortOrder: row.sortOrder ?? 0 };
      for (const d of fields) {
        const v = row[d.key];
        f[d.key] = d.type === "lines" ? (Array.isArray(v) ? v.join("\n") : "") : v ?? (d.type === "checkbox" ? false : "");
      }
      setForm(f);
    }
    setEditing(row);
  };

  const payload = (f: Record<string, unknown>) => {
    const out: Record<string, unknown> = { sortOrder: f.sortOrder === "" ? 0 : Number(f.sortOrder ?? 0) };
    for (const d of fields) {
      const v = f[d.key];
      out[d.key] =
        d.type === "lines"
          ? String(v ?? "")
              .split("\n")
              .map((s) => s.trim())
              .filter(Boolean)
          : d.type === "number"
            ? v === "" || v == null
              ? null
              : Number(v)
            : v;
    }
    return out;
  };

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError("");
    try {
      const isNew = editing === "new";
      const res = await fetch(endpoint, {
        method: isNew ? "POST" : "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(isNew ? payload(form) : { id: (editing as Row).id, ...payload(form) }),
      });
      const d = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(d.error || `HTTP ${res.status}`);
      setEditing(null);
      setNotice(t("saved"));
      await load();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSaving(false);
    }
  };

  const toggleActive = async (row: Row) => {
    const res = await fetch(endpoint, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: row.id, isActive: !row.isActive }),
    });
    if (res.ok) setRows((rs) => rs?.map((r) => (r.id === row.id ? { ...r, isActive: !row.isActive } : r)) ?? rs);
    else setError((await res.json().catch(() => ({}))).error || t("failed"));
  };

  const remove = async (row: Row) => {
    if (!window.confirm(t("confirmDelete", { title: String(row[titleKey] ?? row.id) }))) return;
    const res = await fetch(`${endpoint}?id=${row.id}`, { method: "DELETE" });
    if (res.ok) setRows((rs) => rs?.filter((r) => r.id !== row.id) ?? rs);
    else setError((await res.json().catch(() => ({}))).error || t("failed"));
  };

  const filtered = (rows ?? []).filter((r) => !q.trim() || JSON.stringify(r).toLowerCase().includes(q.trim().toLowerCase()));
  const groups = groupKey
    ? [...new Set(filtered.map((r) => String(r[groupKey] ?? "")))].map((g) => ({ g, items: filtered.filter((r) => String(r[groupKey] ?? "") === g) }))
    : [{ g: "", items: filtered }];

  const renderField = (d: FieldDef) => {
    const v = form[d.key];
    const set = (val: unknown) => setForm((f) => ({ ...f, [d.key]: val }));
    const wide = ("wide" in d && d.wide) || d.type === "textarea" || d.type === "lines";
    let control: React.ReactNode;
    switch (d.type) {
      case "textarea":
        control = <textarea rows={3} maxLength={d.max} value={String(v ?? "")} onChange={(e) => set(e.target.value)} className={inputCls} placeholder={d.placeholder} />;
        break;
      case "lines":
        control = <textarea rows={5} value={String(v ?? "")} onChange={(e) => set(e.target.value)} className={inputCls} />;
        break;
      case "number":
        control = <input type="number" min={d.min} max={d.max} value={v == null ? "" : String(v)} onChange={(e) => set(e.target.value)} className={inputCls} />;
        break;
      case "select":
        control = (
          <select value={String(v ?? "")} onChange={(e) => set(e.target.value)} className={inputCls}>
            {d.allowEmpty && <option value="">—</option>}
            {d.options.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        );
        break;
      case "checkbox":
        return (
          <label key={d.key} className="flex items-center gap-2 self-end pb-2 text-xs font-semibold text-slate-700">
            <input type="checkbox" checked={!!v} onChange={(e) => set(e.target.checked)} className="h-4 w-4 accent-indigo-600" />
            {d.label}
          </label>
        );
      default:
        control = (
          <input
            required={"required" in d && d.required}
            maxLength={"max" in d ? d.max : undefined}
            value={String(v ?? "")}
            onChange={(e) => set(e.target.value)}
            className={inputCls}
            placeholder={"placeholder" in d ? d.placeholder : undefined}
          />
        );
    }
    return (
      <label key={d.key} className={`block ${wide ? "sm:col-span-2" : ""}`}>
        <span className="mb-1 block text-[10px] font-bold uppercase tracking-wide text-slate-500">{d.label}</span>
        {control}
        {d.type === "lines" && <span className="mt-1 block text-[10px] text-slate-400">{d.hint ?? t("onePerLine")}</span>}
      </label>
    );
  };

  return (
    <div className="space-y-3">
      {intro && <p className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-600">{intro}</p>}
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative min-w-[180px] flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder={t("search")} className={`${inputCls} pl-8`} />
        </div>
        <button onClick={() => void load()} className="inline-flex items-center gap-1 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-600 hover:bg-slate-50">
          <RefreshCw className="h-3.5 w-3.5" /> {t("refresh")}
        </button>
        <button onClick={() => startEdit("new")} className="inline-flex items-center gap-1 rounded-xl bg-indigo-600 px-3 py-2 text-xs font-bold text-white hover:bg-indigo-700">
          <Plus className="h-3.5 w-3.5" /> {t("add")}
        </button>
      </div>

      {error && <p className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-semibold text-rose-700">{error}</p>}
      {notice && <p className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-700">{notice}</p>}

      {editing && (
        <form onSubmit={save} className="rounded-2xl border border-indigo-200 bg-white p-4 shadow-sm">
          <div className="mb-3 flex items-center justify-between">
            <p className="text-sm font-bold text-slate-900">{editing === "new" ? t("newItem") : t("editItem")}</p>
            <button type="button" onClick={() => setEditing(null)} className="rounded-lg p-1 text-slate-400 hover:bg-slate-100" aria-label={t("cancel")}>
              <X className="h-4 w-4" />
            </button>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            {fields.map(renderField)}
            <label className="block">
              <span className="mb-1 block text-[10px] font-bold uppercase tracking-wide text-slate-500">{t("order")}</span>
              <input type="number" min={0} max={9999} value={String(form.sortOrder ?? 0)} onChange={(e) => setForm((f) => ({ ...f, sortOrder: e.target.value }))} className={inputCls} />
            </label>
          </div>
          <div className="mt-3 flex justify-end gap-2">
            <button type="button" onClick={() => setEditing(null)} className="rounded-xl border border-slate-200 px-3 py-2 text-xs font-bold text-slate-600 hover:bg-slate-50">
              {t("cancel")}
            </button>
            <button disabled={saving} className="inline-flex items-center gap-1 rounded-xl bg-indigo-600 px-4 py-2 text-xs font-bold text-white hover:bg-indigo-700 disabled:opacity-50">
              {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />} {t("save")}
            </button>
          </div>
        </form>
      )}

      {!rows && (
        <p className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white p-6 text-xs text-slate-500">
          <Loader2 className="h-4 w-4 animate-spin" /> {t("loading")}
        </p>
      )}
      {rows && filtered.length === 0 && <p className="rounded-xl border border-dashed border-slate-300 bg-white p-6 text-center text-xs text-slate-500">{t("empty")}</p>}

      {groups.map(({ g, items }) =>
        items.length === 0 ? null : (
          <div key={g || "all"}>
            {groupKey && <p className="mb-1.5 mt-2 text-[10px] font-bold uppercase tracking-wider text-slate-400">{groupLabel ? groupLabel(g) : g}</p>}
            <ul className="divide-y divide-slate-100 overflow-hidden rounded-2xl border border-slate-200 bg-white">
              {items.map((r) => (
                <li key={r.id} className={`flex items-center gap-3 px-3 py-2.5 sm:px-4 ${r.isActive === false ? "opacity-50" : ""}`}>
                  <span className="w-6 shrink-0 text-center text-[10px] font-bold text-slate-400">{r.sortOrder ?? ""}</span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-slate-900">{String(r[titleKey] ?? "")}</p>
                    {subtitle && <p className="truncate text-[11px] text-slate-500">{subtitle(r)}</p>}
                  </div>
                  <div className="flex shrink-0 items-center gap-1">
                    {"isActive" in r && (
                      <button
                        onClick={() => void toggleActive(r)}
                        className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
                        title={r.isActive ? t("hide") : t("show")}
                        aria-label={r.isActive ? t("hide") : t("show")}
                      >
                        {r.isActive ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
                      </button>
                    )}
                    <button onClick={() => startEdit(r)} className="rounded-lg p-1.5 text-slate-400 hover:bg-indigo-50 hover:text-indigo-600" aria-label={t("edit")} title={t("edit")}>
                      <Pencil className="h-4 w-4" />
                    </button>
                    <button onClick={() => void remove(r)} className="rounded-lg p-1.5 text-slate-400 hover:bg-rose-50 hover:text-rose-600" aria-label={t("delete")} title={t("delete")}>
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        )
      )}
    </div>
  );
}
