"use client";

import React, { useCallback, useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { BadgeCheck, Check, ChevronDown, Loader2, RefreshCw, Star, Trash2, X } from "lucide-react";
import { Button } from "@/components/ui/Button";

interface AdminStory {
  id: number;
  displayName: string;
  homeCountry: string | null;
  admittedUniversity: string;
  admittedCountry: string | null;
  degreeLevel: string | null;
  major: string | null;
  intakeYear: number | null;
  gpa: number | null;
  gpaScale: number | null;
  ielts: number | null;
  toefl: number | null;
  sat: number | null;
  activities: string[];
  awards: string[];
  essayTitle: string | null;
  essayExcerpt: string | null;
  advice: string | null;
  scholarshipName: string | null;
  isVerified: boolean;
  isFeatured: boolean;
  views: number;
  status: "pending" | "approved" | "rejected";
  adminNote: string | null;
  authorEmail: string | null;
  authorName: string | null;
  createdAt: string;
}

type Filter = "pending" | "approved" | "rejected" | "all";

/**
 * Admin → Students & community → Success stories.
 * Nothing a student submits is public until approved here. The admin can
 * mark a story verified (saw an acceptance letter), feature it, leave a
 * private note, reject or delete.
 */
export function StoriesModeration() {
  const t = useTranslations("adminGrowth");
  const [filter, setFilter] = useState<Filter>("pending");
  const [items, setItems] = useState<AdminStory[] | null>(null);
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [open, setOpen] = useState<number | null>(null);
  const [notes, setNotes] = useState<Record<number, string>>({});
  const [busy, setBusy] = useState<number | null>(null);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setError("");
    try {
      const res = await fetch(`/api/admin/stories?status=${filter}`, { cache: "no-store" });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error || `HTTP ${res.status}`);
      setItems(d.items);
      setCounts(d.counts ?? {});
    } catch (e) {
      setError((e as Error).message);
      setItems([]);
    }
  }, [filter]);

  useEffect(() => {
    const id = window.setTimeout(() => void load(), 0);
    return () => window.clearTimeout(id);
  }, [load]);

  const patch = async (s: AdminStory, body: Record<string, unknown>) => {
    setBusy(s.id);
    setError("");
    try {
      const res = await fetch("/api/admin/stories", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: s.id, ...body }),
      });
      const d = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(d.error || `HTTP ${res.status}`);
      await load();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(null);
    }
  };

  const remove = async (s: AdminStory) => {
    if (!window.confirm(t("confirmDelete", { title: s.admittedUniversity }))) return;
    setBusy(s.id);
    const res = await fetch(`/api/admin/stories?id=${s.id}`, { method: "DELETE" });
    setBusy(null);
    if (res.ok) void load();
    else setError((await res.json().catch(() => ({}))).error || t("failed"));
  };

  const statusChip = (st: string) =>
    st === "approved" ? "bg-emerald-100 text-emerald-700" : st === "rejected" ? "bg-rose-100 text-rose-700" : "bg-amber-100 text-amber-700";

  return (
    <div className="space-y-3">
      <p className="rounded-surface border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-600">{t("storiesIntro")}</p>
      <div className="flex flex-wrap items-center gap-1.5">
        {(["pending", "approved", "rejected", "all"] as Filter[]).map((f) => (
          <Button variant="unstyled"
            key={f}
            onClick={() => setFilter(f)}
            className={`rounded-surface px-3 py-1.5 text-xs font-bold ${filter === f ? "bg-slate-900 text-white" : "border border-slate-200 bg-white text-slate-600 hover:bg-slate-50"}`}
          >
            {t(`st.${f}`)}
            {f !== "all" && <span className="ml-1 opacity-70">{counts[f] ?? 0}</span>}
          </Button>
        ))}
        <Button variant="unstyled" onClick={() => void load()} className="ml-auto inline-flex items-center gap-1 rounded-surface border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold text-slate-600 hover:bg-slate-50">
          <RefreshCw className="h-3.5 w-3.5" /> {t("refresh")}
        </Button>
      </div>

      {error && <p className="rounded-surface border border-rose-200 bg-rose-50 px-3 py-2 text-sm font-semibold text-rose-700">{error}</p>}
      {!items && (
        <p className="flex items-center gap-2 rounded-surface border border-slate-200 bg-white p-6 text-sm text-slate-500">
          <Loader2 className="h-4 w-4 animate-spin" /> {t("loading")}
        </p>
      )}
      {items && items.length === 0 && <p className="rounded-surface border border-dashed border-slate-300 bg-white p-6 text-center text-sm text-slate-500">{t("noStories")}</p>}

      <ul className="space-y-2">
        {items?.map((s) => {
          const isOpen = open === s.id;
          return (
            <li key={s.id} className="overflow-hidden rounded-overlay border border-slate-200 bg-white">
              <Button variant="unstyled" onClick={() => setOpen(isOpen ? null : s.id)} className="flex w-full flex-wrap items-center gap-2 px-4 py-3 text-left" aria-expanded={isOpen}>
                <span className="min-w-0 flex-1">
                  <span className="flex items-center gap-1 text-sm font-bold text-slate-900">
                    {s.admittedUniversity}
                    {s.isVerified && <BadgeCheck className="h-4 w-4 text-sky-500" />}
                    {s.isFeatured && <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />}
                  </span>
                  <span className="block truncate text-xs text-slate-500">
                    {[s.degreeLevel, s.major, s.admittedCountry].filter(Boolean).join(" · ")} — {s.authorName || s.displayName}
                    {s.authorEmail ? ` (${s.authorEmail})` : ""}
                  </span>
                </span>
                <span className={`rounded-full px-2 py-0.5 text-xs font-bold ${statusChip(s.status)}`}>{t(`st.${s.status}`)}</span>
                <ChevronDown className={`h-4 w-4 text-slate-500 transition-transform ${isOpen ? "rotate-180" : ""}`} />
              </Button>
              {isOpen && (
                <div className="space-y-3 border-t border-slate-100 px-4 pb-4 pt-3 text-xs text-slate-700">
                  <div className="flex flex-wrap gap-1.5">
                    {s.gpa != null && <span className="rounded-control bg-slate-100 px-2 py-0.5 font-bold">GPA {s.gpa}{s.gpaScale ? `/${s.gpaScale}` : ""}</span>}
                    {s.ielts != null && <span className="rounded-control bg-slate-100 px-2 py-0.5 font-bold">IELTS {s.ielts}</span>}
                    {s.toefl != null && <span className="rounded-control bg-slate-100 px-2 py-0.5 font-bold">TOEFL {s.toefl}</span>}
                    {s.sat != null && <span className="rounded-control bg-slate-100 px-2 py-0.5 font-bold">SAT {s.sat}</span>}
                    {s.intakeYear && <span className="rounded-control bg-slate-100 px-2 py-0.5 font-bold">{s.intakeYear}</span>}
                  </div>
                  {s.advice && <p className="whitespace-pre-line"><b>{t("advice")}:</b> {s.advice}</p>}
                  {s.activities.length > 0 && <p><b>{t("activities")}:</b> {s.activities.join("; ")}</p>}
                  {s.awards.length > 0 && <p><b>{t("awards")}:</b> {s.awards.join("; ")}</p>}
                  {s.scholarshipName && <p><b>{t("scholarship")}:</b> {s.scholarshipName}</p>}
                  {s.essayExcerpt && (
                    <div className="max-h-48 overflow-y-auto rounded-surface bg-slate-50 p-3">
                      <p className="font-bold">{s.essayTitle || t("essay")}</p>
                      <p className="mt-1 whitespace-pre-line">{s.essayExcerpt}</p>
                    </div>
                  )}
                  <label className="block">
                    <span className="mb-1 block text-xs font-bold uppercase tracking-wide text-slate-500">{t("privateNote")}</span>
                    <input
                      value={notes[s.id] ?? s.adminNote ?? ""}
                      onChange={(e) => setNotes((n) => ({ ...n, [s.id]: e.target.value }))}
                      maxLength={500}
                      className="w-full rounded-surface border border-slate-200 bg-white px-3 py-2 text-sm"
                    />
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {s.status !== "approved" && (
                      <Button variant="unstyled"
                        disabled={busy === s.id}
                        onClick={() => void patch(s, { status: "approved", adminNote: notes[s.id] ?? s.adminNote ?? "" })}
                        className="inline-flex items-center gap-1 rounded-surface bg-emerald-700 px-3 py-2 text-xs font-bold text-white hover:bg-emerald-800 disabled:opacity-50"
                      >
                        <Check className="h-3.5 w-3.5" /> {t("approve")}
                      </Button>
                    )}
                    {s.status !== "rejected" && (
                      <Button variant="unstyled"
                        disabled={busy === s.id}
                        onClick={() => void patch(s, { status: "rejected", adminNote: notes[s.id] ?? s.adminNote ?? "" })}
                        className="inline-flex items-center gap-1 rounded-surface border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-bold text-rose-700 hover:bg-rose-100 disabled:opacity-50"
                      >
                        <X className="h-3.5 w-3.5" /> {t("reject")}
                      </Button>
                    )}
                    <Button variant="unstyled"
                      disabled={busy === s.id}
                      onClick={() => void patch(s, { isVerified: !s.isVerified })}
                      className="inline-flex items-center gap-1 rounded-surface border border-sky-200 bg-sky-50 px-3 py-2 text-xs font-bold text-sky-700 hover:bg-sky-100 disabled:opacity-50"
                    >
                      <BadgeCheck className="h-3.5 w-3.5" /> {s.isVerified ? t("unverify") : t("verify")}
                    </Button>
                    <Button variant="unstyled"
                      disabled={busy === s.id}
                      onClick={() => void patch(s, { isFeatured: !s.isFeatured })}
                      className="inline-flex items-center gap-1 rounded-surface border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-bold text-amber-700 hover:bg-amber-100 disabled:opacity-50"
                    >
                      <Star className="h-3.5 w-3.5" /> {s.isFeatured ? t("unfeature") : t("feature")}
                    </Button>
                    <Button variant="unstyled"
                      disabled={busy === s.id}
                      onClick={() => void remove(s)}
                      className="ml-auto inline-flex items-center gap-1 rounded-surface border border-slate-200 px-3 py-2 text-xs font-bold text-slate-500 hover:bg-rose-50 hover:text-rose-600 disabled:opacity-50"
                    >
                      <Trash2 className="h-3.5 w-3.5" /> {t("delete")}
                    </Button>
                  </div>
                </div>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
