"use client";

import React from "react";
import { Button } from "@/components/ui/Button";
import { confirmSafeReload } from "@/lib/unsavedGuard";
import { isChunkLoadError } from "@/lib/clientFetch";

/**
 * Section-level recovery from a failed dynamic import / render error.
 *
 * The student app loads every hub and every heavy panel with `next/dynamic`.
 * During (or after) a deploy swap, a tab opened from the OLD build still holds
 * the old `/_next/static/chunks/...` names. If one of those files is gone, the
 * import rejects with "Loading chunk N failed". Before this boundary, that
 * rejection reached the route-level `error.tsx` and replaced the ENTIRE cabinet
 * with a full-page error screen.
 *
 * Rules implemented here:
 *  - the failure is contained to the section; navigation and every other tab
 *    keep working;
 *  - at most `maxRetries` in-place retries (default 2), then a manual refresh;
 *  - NO automatic `location.reload()` — no infinite reload loop;
 *  - a refresh never silently discards an unsaved essay/form;
 *  - other render errors get the same bounded, understandable fallback;
 *  - a chunk failure announces itself so the build-version monitor can check
 *    whether this tab is simply older than the deployed build.
 */

export const CHUNK_ERROR_EVENT = "sb:chunk-error";

type Locale = "en" | "uz" | "ru";

const COPY: Record<Locale, {
  title: string;
  chunk: string;
  generic: string;
  retry: string;
  exhausted: string;
  reload: string;
  details: string;
  attempts: (used: number, max: number) => string;
}> = {
  en: {
    title: "This section could not load",
    chunk: "A part of the app did not arrive — usually a new version was deployed while this tab was open. Your saved data is safe.",
    generic: "Something went wrong while drawing this section. Your other sections are still available.",
    retry: "Try again",
    exhausted: "Retrying did not help. Refresh the page to pick up the current version.",
    reload: "Refresh page",
    details: "Technical details",
    attempts: (used, max) => `Attempt ${used} of ${max}.`,
  },
  uz: {
    title: "Bu bo‘lim yuklanmadi",
    chunk: "Ilovaning bir qismi kelmadi — ko‘pincha bu ochiq tab eski versiyada qolganida yangi versiya joylanganda bo‘ladi. Saqlangan ma’lumotlaringiz o‘z joyida.",
    generic: "Bu bo‘limni chizishda xato yuz berdi. Qolgan bo‘limlar ishlashda davom etadi.",
    retry: "Qayta urinish",
    exhausted: "Qayta urinish yordam bermadi. Joriy versiyani olish uchun sahifani yangilang.",
    reload: "Sahifani yangilash",
    details: "Texnik tafsilotlar",
    attempts: (used, max) => `${max} ta urinishdan ${used}-tasi.`,
  },
  ru: {
    title: "Этот раздел не загрузился",
    chunk: "Часть приложения не загрузилась — обычно это значит, что пока вкладка была открыта, вышла новая версия. Сохранённые данные не пропали.",
    generic: "При отображении раздела произошла ошибка. Остальные разделы по-прежнему доступны.",
    retry: "Повторить",
    exhausted: "Повторы не помогли. Обновите страницу, чтобы получить текущую версию.",
    reload: "Обновить страницу",
    details: "Технические подробности",
    attempts: (used, max) => `Попытка ${used} из ${max}.`,
  },
};

function locale(): Locale {
  if (typeof document === "undefined") return "en";
  const lang = document.documentElement.lang?.slice(0, 2).toLowerCase();
  return lang === "uz" || lang === "ru" ? lang : "en";
}

interface Props {
  children: React.ReactNode;
  /** Changing this (tab, pane, profile) clears the failure and remounts. */
  resetKey?: string | number;
  /** Human-readable section name for the log, never shown as an error. */
  section?: string;
  maxRetries?: number;
}

interface State {
  error: Error | null;
  chunk: boolean;
  retries: number;
  resetKey?: string | number;
}

export class ChunkErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { error: null, chunk: false, retries: 0, resetKey: props.resetKey };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { error, chunk: isChunkLoadError(error) };
  }

  static getDerivedStateFromProps(props: Props, state: State): Partial<State> | null {
    // Navigating away and back is a natural, user-driven retry that does not
    // consume the bounded retry budget.
    if (props.resetKey !== state.resetKey) {
      return { error: null, chunk: false, retries: 0, resetKey: props.resetKey };
    }
    return null;
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    const chunk = isChunkLoadError(error);
    // No secrets, tokens or connection strings: this is a client-side log.
    console.error(`[section-error] ${this.props.section ?? "section"}`, chunk ? "chunk" : "render", error?.message, info?.componentStack);
    if (chunk && typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent(CHUNK_ERROR_EVENT, { detail: { section: this.props.section ?? null } }));
    }
  }

  private retry = () => {
    this.setState((state) => ({ error: null, chunk: false, retries: state.retries + 1 }));
  };

  render() {
    const { error, chunk, retries } = this.state;
    if (!error) {
      // `retries` is part of the key so a retry really re-imports the chunk
      // instead of reusing the failed dynamic() promise.
      return <React.Fragment key={`${this.props.resetKey ?? "section"}-${retries}`}>{this.props.children}</React.Fragment>;
    }

    const max = Math.max(1, Math.min(5, this.props.maxRetries ?? 2));
    const t = COPY[locale()];
    const exhausted = retries >= max;
    return (
      <div
        role="alert"
        data-testid="section-error"
        data-section-error={chunk ? "chunk" : "render"}
        className="rounded-surface border border-amber-300 bg-amber-50 p-5 text-slate-800 shadow-sm dark:border-amber-500/40 dark:bg-amber-500/10 dark:text-slate-100"
      >
        <h2 className="text-base font-bold text-amber-900 dark:text-amber-100">{t.title}</h2>
        <p className="mt-2 text-sm leading-relaxed text-amber-900 dark:text-amber-100">
          {chunk ? t.chunk : t.generic}
        </p>
        <p className="mt-1 text-sm font-semibold text-amber-800 dark:text-amber-200">{t.attempts(Math.min(retries, max), max)}</p>
        <div className="mt-4 flex flex-wrap gap-2">
          {!exhausted && (
            <Button variant="primary" size="md" onClick={this.retry}>
              {t.retry}
            </Button>
          )}
          {exhausted && (
            <Button variant="primary" size="md" onClick={() => confirmSafeReload()}>
              {t.reload}
            </Button>
          )}
        </div>
        {exhausted && (
          <p className="mt-3 text-sm text-amber-900 dark:text-amber-100">{t.exhausted}</p>
        )}
        <details className="mt-4">
          <summary className="min-h-11 cursor-pointer text-sm font-medium text-amber-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600 dark:text-amber-200">
            {t.details}
          </summary>
          <p className="mt-2 break-words text-sm text-amber-900 dark:text-amber-100">{error.message}</p>
        </details>
      </div>
    );
  }
}

export default ChunkErrorBoundary;
