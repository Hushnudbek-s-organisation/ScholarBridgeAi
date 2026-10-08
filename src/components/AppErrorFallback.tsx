"use client";

import React, { useEffect, useSyncExternalStore } from "react";

type Locale = "en" | "uz" | "ru";

/**
 * Copy for the app-level error screens.
 *
 * Deliberately NOT read through next-intl: if the crash happened inside the
 * message provider, a boundary that needs that provider would fail too and the
 * student would get a blank page — the exact thing this component exists to
 * prevent. The locale is read from `<html lang>` (set by the root layout from
 * the same cookie the LocaleProvider uses) with an English fallback.
 */
const COPY: Record<Locale, { title: string; body: string; retry: string; reload: string; details: string }> = {
  en: {
    title: "Something went wrong",
    body: "This screen hit an unexpected error. Your saved work is safe — try again, and if it keeps happening reload the page.",
    retry: "Try again",
    reload: "Reload the page",
    details: "Error details",
  },
  uz: {
    title: "Xatolik yuz berdi",
    body: "Bu ekranda kutilmagan xatolik sodir bo‘ldi. Saqlangan ma’lumotlaringiz joyida — qayta urinib ko‘ring, takrorlansa sahifani yangilang.",
    retry: "Qayta urinish",
    reload: "Sahifani yangilash",
    details: "Xatolik tafsilotlari",
  },
  ru: {
    title: "Что-то пошло не так",
    body: "На этом экране произошла непредвиденная ошибка. Ваши сохранённые данные в порядке — попробуйте ещё раз, а если повторится, обновите страницу.",
    retry: "Повторить",
    reload: "Обновить страницу",
    details: "Подробности ошибки",
  },
};

function currentLocale(): Locale {
  const lang = document.documentElement.lang?.slice(0, 2).toLowerCase();
  return lang === "uz" || lang === "ru" ? lang : "en";
}

/** `<html lang>` does not change while an error screen is up, so there is nothing to subscribe to. */
const neverChanges = () => () => {};
const serverLocale = (): Locale => "en";

/**
 * Shared fallback for `app/error.tsx` and `app/global-error.tsx`.
 *
 * Before this existed the student app had no route-level boundary at all (only
 * the Admin panel wrapped its sections), so a render error in ANY hub replaced
 * the whole single-page app with a blank white screen and no way back.
 *
 * The raw message is kept behind a <details> disclosure: it must never be
 * silently swallowed (that is how a real bug hides), but it also should not be
 * the first thing a student reads.
 */
export function AppErrorFallback({
  error,
  reset,
  fullPage = false,
}: {
  error: Error & { digest?: string };
  reset: () => void;
  /** global-error.tsx replaces the whole document, so it needs full-page chrome. */
  fullPage?: boolean;
}) {
  // useSyncExternalStore (not useState-in-effect): the server render and the
  // first client render must agree, and the value is read from the DOM rather
  // than mirrored into state.
  const locale = useSyncExternalStore(neverChanges, currentLocale, serverLocale);
  const t = COPY[locale];

  // Log with the digest Next.js attaches so a production report can be matched
  // against the server log without putting the stack in front of the student.
  useEffect(() => {
    console.error("[app-error]", error?.digest ?? "", error);
  }, [error]);

  const card = (
    <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm dark:border-slate-700 dark:bg-slate-900">
      <span
        role="img"
        aria-hidden="true"
        className="mx-auto mb-4 grid h-12 w-12 place-items-center rounded-2xl bg-amber-50 text-2xl dark:bg-amber-500/10"
      >
        ⚠️
      </span>
      <h1 className="text-lg font-bold text-slate-900 dark:text-white">{t.title}</h1>
      <p className="mt-2 text-sm leading-relaxed text-slate-600 dark:text-slate-300">{t.body}</p>
      <div className="mt-6 flex flex-wrap justify-center gap-3">
        <button
          type="button"
          onClick={reset}
          className="rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-indigo-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2"
        >
          {t.retry}
        </button>
        <button
          type="button"
          onClick={() => window.location.reload()}
          className="rounded-xl border border-slate-300 px-4 py-2.5 text-sm font-semibold text-slate-800 transition hover:bg-slate-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2 dark:border-slate-600 dark:text-slate-100 dark:hover:bg-slate-800"
        >
          {t.reload}
        </button>
      </div>
      {error?.message ? (
        <details className="mt-5 text-left">
          <summary className="cursor-pointer text-xs font-medium text-slate-500 dark:text-slate-400">
            {t.details}
          </summary>
          <p className="mt-2 break-words text-xs text-slate-500 dark:text-slate-400">{error.message}</p>
          {error.digest ? (
            <p className="mt-1 break-all text-[10px] text-slate-400 dark:text-slate-500">ref: {error.digest}</p>
          ) : null}
        </details>
      ) : null}
    </div>
  );

  if (!fullPage) {
    return (
      <main role="alert" className="grid min-h-screen place-items-center bg-slate-100 px-4 dark:bg-slate-950">
        {card}
      </main>
    );
  }
  return (
    <html lang={locale}>
      <body className="bg-slate-100 text-slate-900 antialiased">
        <main role="alert" className="grid min-h-screen place-items-center px-4">
          {card}
        </main>
      </body>
    </html>
  );
}
