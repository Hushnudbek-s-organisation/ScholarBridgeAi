"use client";

import { createContext, useContext, useId, useRef, useState, useSyncExternalStore, type ReactNode } from "react";
import type { Locale } from "@/i18n/config";

type Item = { id: number; title: string; values: string[]; href: string | null };
type Selection = { items: Item[]; toggle: (item: Item) => void; compare: string };
const CompareContext = createContext<Selection | null>(null);
const noUpdates = () => () => {};
const labels = {
  en: { compare: "Compare", open: "Compare side by side", clear: "Clear", close: "Close", field: "Field", website: "Official source" },
  uz: { compare: "Solishtirish", open: "Yonma-yon solishtirish", clear: "Tozalash", close: "Yopish", field: "Ko‘rsatkich", website: "Rasmiy manba" },
  ru: { compare: "Сравнить", open: "Сравнить рядом", clear: "Сбросить", close: "Закрыть", field: "Параметр", website: "Официальный источник" },
};
const control = "inline-flex min-h-11 items-center rounded-control border border-slate-300 px-3 text-sm font-semibold hover:border-blue-500 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-500 dark:border-slate-600";

export function PublicCatalogCompare({ locale, fields, children }: { locale: Locale; fields: string[]; children: ReactNode }) {
  const copy = labels[locale];
  const [items, setItems] = useState<Item[]>([]);
  const dialog = useRef<HTMLDialogElement>(null);
  const heading = useId();
  const toggle = (item: Item) => setItems((current) => current.some((entry) => entry.id === item.id)
    ? current.filter((entry) => entry.id !== item.id)
    : current.length < 3 ? [...current, item] : current);
  return (
    <CompareContext.Provider value={{ items, toggle, compare: copy.compare }}>
      {children}
      {items.length > 0 && (
        <div className="sticky bottom-2 z-10 mt-4 flex flex-wrap items-center gap-2 rounded-surface border border-slate-300 bg-white p-3 shadow-lg dark:border-slate-600 dark:bg-slate-900">
          <span className="px-2 text-sm font-semibold" aria-live="polite">{items.length} / 3</span>
          <button type="button" className={control} disabled={items.length < 2} onClick={() => dialog.current?.showModal()}>{copy.open}</button>
          <button type="button" className={control} onClick={() => setItems([])}>{copy.clear}</button>
        </div>
      )}
      <dialog ref={dialog} aria-labelledby={heading} className="m-auto max-h-[85dvh] w-[min(94vw,56rem)] rounded-overlay border border-slate-300 bg-white p-4 text-slate-900 backdrop:bg-slate-950/70 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100">
        <header className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <h2 id={heading} className="text-xl font-bold">{copy.open}</h2>
          <form method="dialog"><button className={control}>{copy.close}</button></form>
        </header>
        <div className="overflow-auto" tabIndex={0} aria-label={copy.open}>
          <table className="w-full border-collapse text-left text-sm [&_td]:p-2 [&_th]:p-2 [&_tr]:border-b [&_tr]:border-slate-200 dark:[&_tr]:border-slate-700">
            <thead><tr><th scope="col">{copy.field}</th>{items.map((item) => <th scope="col" key={item.id}>{item.title}</th>)}</tr></thead>
            <tbody>
              {fields.map((field, index) => (
                <tr key={field}><th scope="row">{field}</th>{items.map((item) => <td key={item.id}>{item.values[index] || "—"}</td>)}</tr>
              ))}
              <tr><th scope="row">{copy.website}</th>
                {items.map((item) => <td key={item.id}>{item.href ? <a className="inline-flex min-h-11 items-center underline" href={item.href} target="_blank" rel="noopener noreferrer">{copy.website}</a> : "—"}</td>)}
              </tr>
            </tbody>
          </table>
        </div>
      </dialog>
    </CompareContext.Provider>
  );
}

export function PublicCompareButton({ item }: { item: Item }) {
  const context = useContext(CompareContext);
  const hydrated = useSyncExternalStore(noUpdates, () => true, () => false);
  if (!context) return null;
  const selected = context.items.some((entry) => entry.id === item.id);
  return (
    <button type="button" className={control + " aria-pressed:border-blue-500 aria-pressed:text-blue-700 dark:aria-pressed:text-blue-300"}
      aria-pressed={selected} disabled={!hydrated || (!selected && context.items.length >= 3)} onClick={() => context.toggle(item)}>
      {context.compare}
    </button>
  );
}
