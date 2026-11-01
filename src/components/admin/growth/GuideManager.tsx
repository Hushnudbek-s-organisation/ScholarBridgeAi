"use client";

import React, { useCallback, useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { ArrowDown, ArrowUp, Eye, EyeOff, Loader2, RotateCcw, Save } from "lucide-react";
import { invalidateSectionHelp } from "../../SectionIntro";
import { navLabelKey } from "@/lib/navSections";
import { Button } from "@/components/ui/Button";

interface Step {
  id: string;
  tab: string;
  enabled: boolean;
  title: string | null;
  description: string | null;
}
type Help = Record<string, { enabled?: boolean; text?: string }>;

const inputCls = "w-full rounded-surface border border-slate-200 bg-white px-3 py-2 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-400";

/**
 * Admin → Growth tools → Guide & help.
 * 1) Dashboard "Your path": reorder, hide or re-word the 8 journey steps.
 * 2) Section banners: switch the "What is this page?" intro on/off or
 *    replace its text. Empty text = the built-in translated default.
 */
export function GuideManager() {
  const t = useTranslations("adminGrowth");
  const tj = useTranslations("journey");
  const th = useTranslations("help");
  const tn = useTranslations("nav");
  const [steps, setSteps] = useState<Step[] | null>(null);
  const [help, setHelp] = useState<Help>({});
  const [sections, setSections] = useState<string[]>([]);
  const [saving, setSaving] = useState<"journey" | "help" | null>(null);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/guide", { cache: "no-store" });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error || `HTTP ${res.status}`);
      setSteps(d.journey);
      setHelp(d.help ?? {});
      setSections(d.sections ?? []);
    } catch (e) {
      setMsg({ ok: false, text: (e as Error).message });
      setSteps([]);
    }
  }, []);

  useEffect(() => {
    const id = window.setTimeout(() => void load(), 0);
    return () => window.clearTimeout(id);
  }, [load]);

  const save = async (what: "journey" | "help", body: Record<string, unknown>) => {
    setSaving(what);
    setMsg(null);
    try {
      const res = await fetch("/api/admin/guide", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      const d = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(d.error || `HTTP ${res.status}`);
      setSteps(d.journey);
      setHelp(d.help ?? {});
      if (what === "help") invalidateSectionHelp();
      setMsg({ ok: true, text: t("saved") });
    } catch (e) {
      setMsg({ ok: false, text: (e as Error).message });
    } finally {
      setSaving(null);
    }
  };

  const move = (i: number, dir: -1 | 1) =>
    setSteps((s) => {
      if (!s) return s;
      const j = i + dir;
      if (j < 0 || j >= s.length) return s;
      const next = [...s];
      [next[i], next[j]] = [next[j], next[i]];
      return next;
    });

  const setStep = (i: number, p: Partial<Step>) => setSteps((s) => s?.map((x, k) => (k === i ? { ...x, ...p } : x)) ?? s);

  const navLabel = (id: string) => tn(navLabelKey(id));

  if (!steps) {
    return (
      <p className="flex items-center gap-2 rounded-surface border border-slate-200 bg-white p-6 text-sm text-slate-500">
        <Loader2 className="h-4 w-4 animate-spin" /> {t("loading")}
      </p>
    );
  }

  return (
    <div className="space-y-5">
      {msg && (
        <p className={`rounded-surface border px-3 py-2 text-sm font-semibold ${msg.ok ? "border-emerald-200 bg-emerald-50 text-emerald-700" : "border-rose-200 bg-rose-50 text-rose-700"}`}>{msg.text}</p>
      )}

      <section className="rounded-overlay border border-slate-200 bg-white p-4">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div>
            <h3 className="text-sm font-extrabold text-slate-900">{t("journeyTitle")}</h3>
            <p className="text-sm text-slate-500">{t("journeyIntro")}</p>
          </div>
          <div className="flex gap-2">
            <Button variant="unstyled"
              onClick={() => {
                if (window.confirm(t("confirmReset"))) void save("journey", { journey: [] });
              }}
              className="inline-flex items-center gap-1 rounded-surface border border-slate-200 px-3 py-2 text-xs font-bold text-slate-600 hover:bg-slate-50"
            >
              <RotateCcw className="h-3.5 w-3.5" /> {t("reset")}
            </Button>
            <Button variant="unstyled"
              disabled={saving === "journey"}
              onClick={() =>
                void save("journey", {
                  journey: steps.map((s) => ({ id: s.id, enabled: s.enabled, title: s.title ?? "", description: s.description ?? "" })),
                })
              }
              className="inline-flex items-center gap-1 rounded-surface bg-indigo-600 px-3 py-2 text-xs font-bold text-white hover:bg-indigo-700 disabled:opacity-50"
            >
              {saving === "journey" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />} {t("save")}
            </Button>
          </div>
        </div>
        <ol className="mt-3 space-y-2">
          {steps.map((s, i) => (
            <li key={s.id} className={`rounded-surface border p-3 ${s.enabled ? "border-slate-200" : "border-dashed border-slate-300 opacity-60"}`}>
              <div className="flex items-center gap-2">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-slate-100 text-xs font-bold text-slate-600">{i + 1}</span>
                <span className="min-w-0 flex-1 truncate text-xs font-bold text-slate-800">
                  {s.title || tj(`steps.${s.id}.title`)} <span className="font-normal text-slate-500">→ {navLabel(s.tab)}</span>
                </span>
                <Button variant="unstyled" onClick={() => move(i, -1)} disabled={i === 0} className="rounded-control p-1 text-slate-500 hover:bg-slate-100 disabled:opacity-30" aria-label={t("up")}>
                  <ArrowUp className="h-4 w-4" />
                </Button>
                <Button variant="unstyled" onClick={() => move(i, 1)} disabled={i === steps.length - 1} className="rounded-control p-1 text-slate-500 hover:bg-slate-100 disabled:opacity-30" aria-label={t("down")}>
                  <ArrowDown className="h-4 w-4" />
                </Button>
                <Button variant="unstyled" onClick={() => setStep(i, { enabled: !s.enabled })} className="rounded-control p-1 text-slate-500 hover:bg-slate-100" aria-label={s.enabled ? t("hide") : t("show")}>
                  {s.enabled ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
                </Button>
              </div>
              <div className="mt-2 grid gap-2 sm:grid-cols-2">
                <input value={s.title ?? ""} maxLength={80} onChange={(e) => setStep(i, { title: e.target.value })} placeholder={tj(`steps.${s.id}.title`)} className={inputCls} aria-label={t("customTitle")} />
                <input value={s.description ?? ""} maxLength={280} onChange={(e) => setStep(i, { description: e.target.value })} placeholder={tj(`steps.${s.id}.desc`)} className={inputCls} aria-label={t("customText")} />
              </div>
            </li>
          ))}
        </ol>
      </section>

      <section className="rounded-overlay border border-slate-200 bg-white p-4">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div>
            <h3 className="text-sm font-extrabold text-slate-900">{t("helpTitle")}</h3>
            <p className="text-sm text-slate-500">{t("helpIntro")}</p>
          </div>
          <Button variant="unstyled"
            disabled={saving === "help"}
            onClick={() => void save("help", { help })}
            className="inline-flex items-center gap-1 rounded-surface bg-indigo-600 px-3 py-2 text-xs font-bold text-white hover:bg-indigo-700 disabled:opacity-50"
          >
            {saving === "help" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />} {t("save")}
          </Button>
        </div>
        <ul className="mt-3 grid gap-2 lg:grid-cols-2">
          {sections.map((sec) => {
            const o = help[sec] ?? {};
            const on = o.enabled !== false;
            return (
              <li key={sec} className={`rounded-surface border p-3 ${on ? "border-slate-200" : "border-dashed border-slate-300 opacity-60"}`}>
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-bold text-slate-800">{navLabel(sec)}</span>
                  <label className="flex items-center gap-1.5 text-sm font-semibold text-slate-600">
                    <input type="checkbox" checked={on} onChange={(e) => setHelp((h) => ({ ...h, [sec]: { ...o, enabled: e.target.checked } }))} className="h-3.5 w-3.5 accent-indigo-600" />
                    {t("showBanner")}
                  </label>
                </div>
                <textarea
                  rows={2}
                  maxLength={400}
                  value={o.text ?? ""}
                  onChange={(e) => setHelp((h) => ({ ...h, [sec]: { ...o, text: e.target.value } }))}
                  placeholder={th(sec)}
                  className={`${inputCls} mt-2`}
                />
              </li>
            );
          })}
        </ul>
      </section>
    </div>
  );
}
