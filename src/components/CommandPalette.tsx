"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useTranslations } from "next-intl";
import { CornerDownLeft, Search, X } from "lucide-react";

export interface PaletteItem {
  id: string;
  label: string;
  hint?: string;
  group?: string;
  icon: React.ComponentType<{ className?: string }>;
  isNew?: boolean;
  premium?: boolean;
}

interface CommandPaletteProps {
  open: boolean;
  onClose: () => void;
  items: PaletteItem[];
  onSelect: (id: string) => void;
}

/** Lower-case + strip apostrophes/diacritics so "o'qish" ≈ "oqish". */
function fold(s: string) {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[''`ʻʼ]/g, "");
}

/**
 * "Where is…?" — a quick section finder (Ctrl/⌘+K or the search button).
 * Newcomers type what they want in their own words ("grant", "viza",
 * "insho") and jump straight there; every result shows a one-line hint.
 */
export function CommandPalette({ open, onClose, items, onSelect }: CommandPaletteProps) {
  const t = useTranslations("nav");
  const [query, setQuery] = useState("");
  const [cursor, setCursor] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLUListElement>(null);

  const results = useMemo(() => {
    const q = fold(query.trim());
    if (!q) return items;
    const words = q.split(/\s+/);
    return items
      .map((it) => {
        const hay = fold(`${it.label} ${it.hint ?? ""} ${it.id}`);
        if (!words.every((w) => hay.includes(w))) return null;
        const score = fold(it.label).startsWith(q) ? 0 : fold(it.label).includes(q) ? 1 : 2;
        return { it, score };
      })
      .filter((x): x is { it: PaletteItem; score: number } => !!x)
      .sort((a, b) => a.score - b.score)
      .map((x) => x.it);
  }, [items, query]);

  // Focus the input when opened. The parent remounts this component on every
  // open (key), so the query/cursor state always starts fresh.
  useEffect(() => {
    if (!open) return;
    const id = window.setTimeout(() => inputRef.current?.focus(), 30);
    return () => window.clearTimeout(id);
  }, [open]);

  useEffect(() => {
    listRef.current?.querySelector<HTMLElement>(`[data-idx="${cursor}"]`)?.scrollIntoView({ block: "nearest" });
  }, [cursor]);

  const choose = (id: string) => {
    onSelect(id);
    onClose();
  };

  const onKey = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") {
      e.preventDefault();
      onClose();
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      setCursor((c) => Math.min(results.length - 1, c + 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setCursor((c) => Math.max(0, c - 1));
    } else if (e.key === "Enter" && results[cursor]) {
      e.preventDefault();
      choose(results[cursor].id);
    }
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-[70] flex items-start justify-center bg-slate-950/50 px-3 pt-[10vh] backdrop-blur-sm sm:pt-[14vh]"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) onClose();
          }}
          role="dialog"
          aria-modal="true"
          aria-label={t("searchTitle")}
        >
          <motion.div
            className="w-full max-w-lg overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl"
            initial={{ opacity: 0, y: -12, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.98 }}
            transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
            onKeyDown={onKey}
          >
            <div className="flex items-center gap-2 border-b border-slate-100 px-4">
              <Search className="h-4 w-4 shrink-0 text-slate-400" />
              <input
                ref={inputRef}
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value);
                  setCursor(0);
                }}
                placeholder={t("searchPlaceholder")}
                className="h-12 w-full bg-transparent text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none"
                aria-label={t("searchPlaceholder")}
              />
              <button
                onClick={onClose}
                className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
                aria-label={t("close")}
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <ul ref={listRef} className="max-h-[55vh] overflow-y-auto p-2" role="listbox">
              {results.length === 0 && (
                <li className="px-3 py-8 text-center text-sm text-slate-500">{t("searchEmpty")}</li>
              )}
              {results.map((it, idx) => {
                const Icon = it.icon;
                const active = idx === cursor;
                return (
                  <li key={it.id} data-idx={idx} role="option" aria-selected={active}>
                    <button
                      onClick={() => choose(it.id)}
                      onMouseMove={() => setCursor(idx)}
                      className={`flex w-full items-start gap-3 rounded-xl px-3 py-2.5 text-left transition-colors ${
                        active ? "bg-indigo-50" : "hover:bg-slate-50"
                      }`}
                    >
                      <span
                        className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${
                          active ? "bg-indigo-600 text-white" : "bg-slate-100 text-slate-500"
                        }`}
                      >
                        <Icon className="h-4 w-4" />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="flex items-center gap-1.5 text-sm font-semibold text-slate-900">
                          {it.label}
                          {it.isNew && (
                            <span className="rounded-full bg-emerald-100 px-1.5 py-0.5 text-[9px] font-bold uppercase text-emerald-700">
                              {t("new")}
                            </span>
                          )}
                          {it.premium && (
                            <span className="rounded-full bg-amber-100 px-1.5 py-0.5 text-[9px] font-bold uppercase text-amber-700">Pro</span>
                          )}
                        </span>
                        {it.hint && <span className="mt-0.5 block text-xs leading-snug text-slate-500">{it.hint}</span>}
                      </span>
                      {active && <CornerDownLeft className="mt-2 h-3.5 w-3.5 shrink-0 text-indigo-400" />}
                    </button>
                  </li>
                );
              })}
            </ul>
            <div className="hidden items-center justify-between border-t border-slate-100 px-4 py-2 text-[10px] text-slate-400 sm:flex">
              <span>{t("searchKeys")}</span>
              <span>Ctrl / ⌘ + K</span>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
