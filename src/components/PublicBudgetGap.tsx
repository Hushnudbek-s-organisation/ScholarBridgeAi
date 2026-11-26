"use client";

import { useState } from "react";
import type { Locale } from "@/i18n/config";

const labels = {
  en: { title: "Budget gap", budget: "Your annual budget (USD)", gap: "Unfunded amount before scholarships", cost: "Published annual budget", source: "Official cost source" },
  uz: { title: "Byudjet farqi", budget: "Yillik byudjetingiz (USD)", gap: "Grantlardan oldingi qolgan farq", cost: "E’lon qilingan yillik xarajat", source: "Rasmiy xarajat manbasi" },
  ru: { title: "Разница в бюджете", budget: "Ваш бюджет на год (USD)", gap: "Остаток до учёта стипендий", cost: "Опубликованный бюджет на год", source: "Официальный источник расходов" },
};

export function PublicBudgetGap({ locale, total, scope, source }: { locale: Locale; total: number; scope: string; source: string }) {
  const [budget, setBudget] = useState("");
  const copy = labels[locale];
  const money = new Intl.NumberFormat(locale, { style: "currency", currency: "USD", maximumFractionDigits: 0 });
  const value = Number(budget);
  const gap = budget !== "" && Number.isFinite(value) && value >= 0 ? Math.max(0, total - value) : null;
  return (
    <section className="rounded-overlay border border-slate-200 bg-white p-5 dark:border-slate-700 dark:bg-slate-900">
      <h2 className="mb-2 text-lg font-bold">{copy.title}</h2>
      <p>{copy.cost} <strong>{money.format(total)}</strong></p>
      <p className="mb-3 text-sm text-slate-600 dark:text-slate-300">{scope}</p>
      <label className="flex max-w-64 flex-col gap-1 text-sm font-semibold">{copy.budget}
        <input type="number" inputMode="numeric" min="0" step="1" className="min-h-11 rounded-control border border-slate-300 px-3 dark:border-slate-600 dark:bg-slate-950"
          value={budget} onChange={(event) => setBudget(event.target.value)} />
      </label>
      <p className="mt-2 text-sm" aria-live="polite">{gap != null ? `${copy.gap} · ${money.format(gap)}` : ""}</p>
      <a href={source} className="inline-flex min-h-11 items-center underline" target="_blank" rel="noopener noreferrer">{copy.source} ↗</a>
    </section>
  );
}
