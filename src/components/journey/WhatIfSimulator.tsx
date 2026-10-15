"use client";

/**
 * What-if simulator card (Phase 2.3).
 *
 * The student types hypothetical numbers, presses Run, and sees WHICH
 * published requirements would flip — never a "chance", a rank or a
 * reach/match/safety label. The copy under the result says so explicitly.
 */
import React, { useState } from "react";
import { useTranslations } from "next-intl";
import { FlaskConical, Loader2, TriangleAlert } from "lucide-react";
import type { WhatIfResult } from "@/lib/whatIf";

const FIELD_SPECS = [
  { key: "ieltsScore", labelKey: "ielts", placeholder: "7.0" },
  { key: "toeflScore", labelKey: "toefl", placeholder: "100" },
  { key: "satScore", labelKey: "sat", placeholder: "1450" },
  { key: "gpa", labelKey: "gpa", placeholder: "4.5" },
] as const;

export function WhatIfSimulator({ profileId }: { profileId: number | null }) {
  const t = useTranslations("whatIf");
  const [values, setValues] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<(WhatIfResult & { honesty?: string }) | null>(null);

  const run = async () => {
    if (!profileId) return;
    const change: Record<string, number> = {};
    for (const spec of FIELD_SPECS) {
      const raw = (values[spec.key] ?? "").trim();
      if (raw === "") continue;
      const n = Number(raw);
      if (Number.isFinite(n)) change[spec.key] = n;
    }
    if (Object.keys(change).length === 0) {
      setError(t("needValue"));
      return;
    }
    setBusy(true);
    setError("");
    try {
      const res = await fetch("/api/what-if", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ profileId, change }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(
        res.status === 429 ? t("rateLimited") : data?.error || t("failed")
      );
      setResult(data as WhatIfResult);
    } catch (err) {
      setError(err instanceof Error ? err.message : t("failed"));
      setResult(null);
    } finally {
      setBusy(false);
    }
  };

  return (
    <section
      className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs dark:border-slate-700 dark:bg-slate-900"
      aria-label={t("title")}
    >
      <h3 className="flex items-center gap-1.5 text-sm font-extrabold text-slate-900 dark:text-slate-100">
        <FlaskConical className="h-4 w-4 text-violet-600 dark:text-violet-400" aria-hidden="true" />
        {t("title")}
      </h3>
      <p className="mt-1 text-[12px] leading-relaxed text-slate-600 dark:text-slate-300">{t("subtitle")}</p>

      <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-5">
        {FIELD_SPECS.map((spec) => (
          <label key={spec.key} className="block">
            <span className="mb-1 block text-[11px] font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400">
              {t(spec.labelKey)}
            </span>
            <input
              type="number"
              step="0.5"
              inputMode="decimal"
              value={values[spec.key] ?? ""}
              placeholder={spec.placeholder}
              onChange={(event) => setValues((prev) => ({ ...prev, [spec.key]: event.target.value }))}
              className="min-h-11 w-full rounded-xl border border-slate-300 bg-white px-2 py-2 text-[13px] text-slate-800 dark:border-slate-600 dark:bg-slate-950 dark:text-slate-100"
            />
          </label>
        ))}
        <div className="flex items-end">
          <button
            type="button"
            onClick={() => void run()}
            disabled={busy || !profileId}
            className="inline-flex min-h-11 w-full items-center justify-center gap-1.5 rounded-xl bg-violet-600 px-3 py-2 text-xs font-black text-white hover:bg-violet-700 disabled:opacity-50"
          >
            {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" /> : null}
            {busy ? t("running") : t("run")}
          </button>
        </div>
      </div>

      {error && (
        <p role="alert" className="mt-3 flex items-start gap-1.5 rounded-xl border border-red-200 bg-red-50 p-2 text-[12px] font-semibold text-red-700 dark:border-red-500/40 dark:bg-red-500/10 dark:text-red-200">
          <TriangleAlert className="h-4 w-4 shrink-0" aria-hidden="true" />
          {error}
        </p>
      )}

      {result && (
        <div className="mt-3 space-y-2">
          {result.unlocked.length === 0 && result.broken.length === 0 ? (
            <p className="rounded-xl bg-slate-50 p-2 text-[12px] text-slate-700 dark:bg-slate-800 dark:text-slate-200">
              {t("noChanges", { scanned: result.scanned })}
            </p>
          ) : (
            <>
              {result.unlocked.length > 0 && (
                <div>
                  <p className="text-[11px] font-black uppercase tracking-wider text-emerald-700 dark:text-emerald-300">
                    {t("unlockedTitle", { count: result.unlocked.length })}
                  </p>
                  <ul className="mt-1 space-y-1">
                    {result.unlocked.slice(0, 8).map((flip) => (
                      <li key={`${flip.universityId}-${flip.itemKey}`} className="text-[12px] text-slate-700 dark:text-slate-200">
                        <span className="font-bold">{flip.universityName}</span> · {flip.title}
                        {flip.detail ? ` — ${flip.detail}` : ""}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {result.broken.length > 0 && (
                <div>
                  <p className="text-[11px] font-black uppercase tracking-wider text-amber-700 dark:text-amber-300">
                    {t("brokenTitle", { count: result.broken.length })}
                  </p>
                  <ul className="mt-1 space-y-1">
                    {result.broken.slice(0, 5).map((flip) => (
                      <li key={`${flip.universityId}-${flip.itemKey}`} className="text-[12px] text-slate-700 dark:text-slate-200">
                        <span className="font-bold">{flip.universityName}</span> · {flip.title}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </>
          )}
          <p className="rounded-lg bg-amber-50 p-2 text-[11px] text-amber-900 dark:bg-amber-500/10 dark:text-amber-200">
            {t("honesty")}
          </p>
        </div>
      )}
    </section>
  );
}
