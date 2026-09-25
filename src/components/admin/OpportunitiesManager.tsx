"use client";

import React, { useEffect, useState } from "react";
import {
  Compass,
  Plus,
  Pencil,
  Trash2,
  Save,
  X,
  Loader2,
  RefreshCw,
} from "lucide-react";

/**
 * #26/#27/#28 — Admin CRUD for the curated opportunities catalog.
 * The platform never scrapes third-party lists: admins add real, verifiable
 * programs one by one, and every change is audit-logged server-side.
 */

interface OpportunitiesManagerProps {
  adminProfileId: number;
}

interface OpportunityRow {
  id: number;
  type: string;
  title: string;
  provider: string;
  country: string | null;
  fields: string;
  level: string;
  deadlineDate: string | null;
  url: string;
  description: string;
  isVerified: boolean;
}

interface OpportunityForm {
  type: string;
  title: string;
  provider: string;
  country: string;
  fields: string;
  level: string;
  deadlineDate: string;
  url: string;
  description: string;
  isVerified: boolean;
}

const emptyForm: OpportunityForm = {
  type: "competition",
  title: "",
  provider: "",
  country: "",
  fields: '["All"]',
  level: "any",
  deadlineDate: "",
  url: "",
  description: "",
  isVerified: false,
};

const inputCls =
  "w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500";

const TYPES = ["competition", "research", "internship", "summer_school"];
const LEVELS = ["high_school", "undergrad", "grad", "phd", "any"];

export function OpportunitiesManager({ adminProfileId }: OpportunitiesManagerProps) {
  const [opps, setOpps] = useState<OpportunityRow[]>([]);
  const [form, setForm] = useState<OpportunityForm>(emptyForm);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const fetchOpportunities = async () => {
    try {
      const res = await fetch("/api/admin/opportunities");
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to fetch opportunities");
      setOpps(data.items || []);
    } catch (err: any) {
      setError(err.message || "Failed to fetch opportunities");
    } finally {
      setLoading(false);
    }
  };

  // First load inline (setState only in promise callbacks, never
  // synchronously in the effect body); `loading` starts true in state.
  useEffect(() => {
    let live = true;
    fetch("/api/admin/opportunities")
      .then((r) => r.json().then((b) => (r.ok ? b : Promise.reject(new Error(b.error || "Failed to fetch opportunities")))))
      .then((b) => {
        if (live) setOpps(b.items || []);
      })
      .catch((err: any) => {
        if (live) setError(err.message || "Failed to fetch opportunities");
      })
      .finally(() => {
        if (live) setLoading(false);
      });
    return () => {
      live = false;
    };
  }, []);

  const setField = <K extends keyof OpportunityForm>(key: K, value: OpportunityForm[K]) => {
    setForm((f) => ({ ...f, [key]: value }));
  };

  const startEdit = (o: OpportunityRow) => {
    setEditingId(o.id);
    setForm({
      type: o.type,
      title: o.title,
      provider: o.provider,
      country: o.country ?? "",
      fields: o.fields,
      level: o.level,
      deadlineDate: o.deadlineDate ? String(o.deadlineDate).slice(0, 10) : "",
      url: o.url,
      description: o.description,
      isVerified: o.isVerified,
    });
    setError("");
    setSuccess("");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const cancelEdit = () => {
    setEditingId(null);
    setForm(emptyForm);
    setError("");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError("");
    setSuccess("");
    try {
      const payload = editingId ? { ...form, id: editingId } : form;
      const res = await fetch("/api/admin/opportunities", {
        method: editingId ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to save opportunity");
      setSuccess(editingId ? "Opportunity updated." : "Opportunity created.");
      cancelEdit();
      await fetchOpportunities();
    } catch (err: any) {
      setError(err.message || "Failed to save opportunity");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (o: OpportunityRow) => {
    if (!window.confirm(`Delete "${o.title}"? This cannot be undone.`)) return;
    setError("");
    try {
      const res = await fetch(`/api/admin/opportunities?id=${o.id}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to delete opportunity");
      setSuccess("Opportunity deleted.");
      await fetchOpportunities();
    } catch (err: any) {
      setError(err.message || "Failed to delete opportunity");
    }
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs flex items-center gap-3">
        <div className="h-9 w-9 rounded-xl bg-emerald-50 flex items-center justify-center">
          <Compass className="h-5 w-5 text-emerald-600" />
        </div>
        <div>
          <h2 className="text-sm font-extrabold text-slate-800">Opportunities Manager</h2>
          <p className="text-xs text-slate-500">
            {opps.length} curated opportunit{opps.length === 1 ? "y" : "ies"} — competitions, research, internships,
            summer schools. Add only real, verifiable programs; no scraping.
          </p>
        </div>
        <button
          onClick={fetchOpportunities}
          className="ml-auto flex items-center gap-1.5 rounded-xl border border-slate-200 px-3 py-2 text-xs font-bold text-slate-600 hover:bg-slate-50"
        >
          <RefreshCw className="h-3.5 w-3.5" /> Refresh
        </button>
      </div>

      {error && (
        <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-xs font-semibold text-red-700">
          {error}
        </div>
      )}
      {success && (
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-xs font-semibold text-emerald-700">
          {success}
        </div>
      )}

      {/* Add / Edit form */}
      <form onSubmit={handleSubmit} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs space-y-4">
        <div className="flex items-center gap-2">
          {editingId ? <Pencil className="h-4 w-4 text-emerald-600" /> : <Plus className="h-4 w-4 text-emerald-600" />}
          <h3 className="text-sm font-extrabold text-slate-800">
            {editingId ? "Edit Opportunity" : "Add Opportunity"}
          </h3>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          <div>
            <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wide mb-1">Type</label>
            <select value={form.type} onChange={(e) => setField("type", e.target.value)} className={inputCls}>
              {TYPES.map((t) => (
                <option key={t} value={t}>
                  {t.replace("_", " ")}
                </option>
              ))}
            </select>
          </div>
          <div className="sm:col-span-2">
            <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wide mb-1">Title</label>
            <input value={form.title} onChange={(e) => setField("title", e.target.value)} className={inputCls} />
          </div>
          <div>
            <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wide mb-1">Provider</label>
            <input value={form.provider} onChange={(e) => setField("provider", e.target.value)} className={inputCls} />
          </div>
          <div>
            <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wide mb-1">
              Country (empty = international)
            </label>
            <input value={form.country} onChange={(e) => setField("country", e.target.value)} className={inputCls} />
          </div>
          <div>
            <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wide mb-1">Level</label>
            <select value={form.level} onChange={(e) => setField("level", e.target.value)} className={inputCls}>
              {LEVELS.map((l) => (
                <option key={l} value={l}>
                  {l.replace("_", " ")}
                </option>
              ))}
            </select>
          </div>
          <div className="sm:col-span-2 lg:col-span-3">
            <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wide mb-1">
              {`Fields (JSON array, e.g. ["Computer Science"])`}
            </label>
            <input value={form.fields} onChange={(e) => setField("fields", e.target.value)} className={inputCls} />
          </div>
          <div>
            <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wide mb-1">
              Deadline (empty = recurring / unknown)
            </label>
            <input type="date" value={form.deadlineDate} onChange={(e) => setField("deadlineDate", e.target.value)} className={inputCls} />
          </div>
          <div className="sm:col-span-2">
            <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wide mb-1">Official URL</label>
            <input value={form.url} onChange={(e) => setField("url", e.target.value)} className={inputCls} />
          </div>
          <div className="sm:col-span-2 lg:col-span-3">
            <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wide mb-1">Description</label>
            <textarea
              value={form.description}
              onChange={(e) => setField("description", e.target.value)}
              rows={2}
              className={inputCls}
            />
          </div>
          <label className="flex items-center gap-2 text-xs font-semibold text-slate-700">
            <input
              type="checkbox"
              checked={form.isVerified}
              onChange={(e) => setField("isVerified", e.target.checked)}
              className="h-4 w-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
            />
            Verified (official page checked)
          </label>
        </div>

        <div className="flex items-center gap-2 pt-1">
          <button
            type="submit"
            disabled={saving}
            className="flex items-center gap-1.5 rounded-xl bg-emerald-600 px-4 py-2 text-xs font-bold text-white hover:bg-emerald-700 disabled:opacity-60"
          >
            {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
            {editingId ? "Save Changes" : "Add Opportunity"}
          </button>
          {editingId && (
            <button
              type="button"
              onClick={cancelEdit}
              className="flex items-center gap-1.5 rounded-xl border border-slate-200 px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-50"
            >
              <X className="h-3.5 w-3.5" /> Cancel
            </button>
          )}
        </div>
      </form>

      {/* List */}
      <div className="rounded-2xl border border-slate-200 bg-white shadow-xs overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center gap-2 p-8 text-xs font-semibold text-slate-500">
            <Loader2 className="h-4 w-4 animate-spin" /> Loading opportunities…
          </div>
        ) : opps.length === 0 ? (
          <p className="p-8 text-center text-xs font-semibold text-slate-500">
            No opportunities yet — add the first one above.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-[11px] uppercase tracking-wide text-slate-500">
                  <th className="px-4 py-3 font-bold">Opportunity</th>
                  <th className="px-4 py-3 font-bold">Type</th>
                  <th className="px-4 py-3 font-bold">Country</th>
                  <th className="px-4 py-3 font-bold">Level</th>
                  <th className="px-4 py-3 font-bold">Deadline</th>
                  <th className="px-4 py-3 font-bold text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {opps.map((o) => (
                  <tr key={o.id} className="border-b border-slate-100 last:border-0 hover:bg-slate-50/60">
                    <td className="px-4 py-3">
                      <div className="font-bold text-slate-800">
                        {o.title}
                        {o.isVerified && <span className="ml-1.5 text-[10px] text-emerald-600 font-bold">✓ verified</span>}
                      </div>
                      <div className="text-[11px] text-slate-500">{o.provider}</div>
                    </td>
                    <td className="px-4 py-3 text-slate-600">{o.type.replace("_", " ")}</td>
                    <td className="px-4 py-3 text-slate-600">{o.country || "International"}</td>
                    <td className="px-4 py-3 text-slate-600">{o.level.replace("_", " ")}</td>
                    <td className="px-4 py-3 text-slate-600">{o.deadlineDate || "recurring"}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => startEdit(o)}
                          className="flex items-center gap-1 rounded-lg border border-slate-200 px-2.5 py-1.5 text-[11px] font-bold text-emerald-600 hover:bg-emerald-50"
                        >
                          <Pencil className="h-3 w-3" /> Edit
                        </button>
                        <button
                          onClick={() => handleDelete(o)}
                          className="flex items-center gap-1 rounded-lg border border-slate-200 px-2.5 py-1.5 text-[11px] font-bold text-red-600 hover:bg-red-50"
                        >
                          <Trash2 className="h-3 w-3" /> Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
