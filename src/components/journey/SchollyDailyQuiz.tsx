"use client";

import { useEffect, useId, useState, type FormEvent } from "react";
import { ClipboardList } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { Button } from "@/components/ui/Button";
import { isLocale, type Locale } from "@/i18n/config";
import type { DailyQuiz } from "@/lib/scholly-quiz.server";

export default function SchollyDailyQuiz({ profileId }: { profileId: number }) {
  const language = useLocale();
  const locale = isLocale(language) ? language : "uz";
  const t = useTranslations("schollyQuiz");
  const [open, setOpen] = useState(false);

  return (
    <details
      className="sb-overview-panel"
      onToggle={(event) => setOpen(event.currentTarget.open)}
    >
      <summary className="flex min-h-11 cursor-pointer items-center gap-2 text-base font-semibold text-ink-heading">
        <ClipboardList className="h-5 w-5" aria-hidden="true" />{t("title")}
      </summary>
      {open && <QuizForm key={`${profileId}:${locale}`} profileId={profileId} locale={locale} />}
    </details>
  );
}

function QuizForm({ profileId, locale }: { profileId: number; locale: Locale }) {
  const t = useTranslations("schollyQuiz");
  const inputPrefix = useId();
  const [quiz, setQuiz] = useState<DailyQuiz | null>(null);
  const [choices, setChoices] = useState<Record<string, number>>({});
  const [refreshKey, setRefreshKey] = useState(0);
  const [loadError, setLoadError] = useState(false);
  const [submitError, setSubmitError] = useState(false);
  const [busy, setBusy] = useState(false);
  const ready = quiz !== null && quiz.questions.every((question) => choices[question.id] !== undefined);

  useEffect(() => {
    const controller = new AbortController();
    const query = new URLSearchParams({ profileId: String(profileId), locale });
    void fetch(`/api/scholly/quiz?${query}`, { cache: "no-store", signal: controller.signal })
      .then(async (response) => {
        if (!response.ok) throw new Error("quiz_unavailable");
        const next: DailyQuiz = await response.json();
        if (!controller.signal.aborted) setQuiz(next);
      })
      .catch(() => { if (!controller.signal.aborted) setLoadError(true); });
    return () => controller.abort();
  }, [profileId, locale, refreshKey]);

  function refresh() {
    setLoadError(false);
    setSubmitError(false);
    setQuiz(null);
    setChoices({});
    setRefreshKey((key) => key + 1);
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!quiz || quiz.result || !ready || busy) return;
    setBusy(true);
    setSubmitError(false);
    try {
      const response = await fetch("/api/scholly/quiz", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          profileId,
          locale,
          day: quiz.day,
          answers: quiz.questions.map((question) => ({ questionId: question.id, selectedIndex: choices[question.id] })),
        }),
      });
      if (response.status === 409) {
        refresh();
        return;
      }
      if (!response.ok) throw new Error("quiz_submit_failed");
      const next: DailyQuiz = await response.json();
      setQuiz(next);
    } catch {
      setSubmitError(true);
    } finally {
      setBusy(false);
    }
  }

  if (loadError) {
    return (
      <div className="mt-3 text-sm">
        <p role="alert">{t("loadError")}</p>
        <Button variant="outline" className="mt-2" onClick={refresh}>
          {t("retry")}
        </Button>
      </div>
    );
  }
  if (!quiz) return <p className="mt-3 text-sm text-ink-muted" role="status">{t("loading")}</p>;

  const result = quiz.result;
  return (
    <form className="mt-4 space-y-4" onSubmit={submit}>
      {result ? (
        <p className="text-sm font-semibold" role="status">
          {t("result", { correct: result.correctCount, total: result.answers.length, points: result.points })}
        </p>
      ) : (
        <p className="text-sm text-ink-muted">{t("instructions")}</p>
      )}
      {quiz.questions.map((question) => {
        const graded = result?.answers.find((answer) => answer.questionId === question.id);
        if (result) {
          if (!graded) return null;
          return (
            <div key={question.id} className="text-sm">
              <p className="font-medium">{question.prompt}</p>
              <p className="text-ink-muted">{t("yourAnswer", { answer: question.options[graded.selectedIndex] })}</p>
              {graded.selectedIndex !== graded.correctIndex && (
                <p className="text-ink-muted">{t("correctAnswer", { answer: question.options[graded.correctIndex] })}</p>
              )}
            </div>
          );
        }
        return (
          <fieldset key={question.id} disabled={busy} className="space-y-2">
            <legend className="mb-2 text-sm font-medium">{question.prompt}</legend>
            {question.options.map((label, index) => (
              <label key={label} className="flex min-h-11 cursor-pointer items-center gap-2 rounded-lg border border-border px-3 py-2 text-sm">
                <input
                  type="radio"
                  className="accent-indigo-600"
                  name={`${inputPrefix}-${question.id}`}
                  value={index}
                  checked={choices[question.id] === index}
                  onChange={() => setChoices((current) => ({ ...current, [question.id]: index }))}
                />
                {label}
              </label>
            ))}
          </fieldset>
        );
      })}
      {submitError && <p role="alert" className="text-sm">{t("submitError")}</p>}
      {!result && (
        <Button type="submit" disabled={!ready || busy}>
          {busy ? t("submitting") : t("submit")}
        </Button>
      )}
    </form>
  );
}
