"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import type { SchollyIeltsExercise } from "@/lib/scholly-ielts.server";

const labels = {
  uz: {
    study: "So‘zlarni o‘rganish", start: "Testni boshlash", review: "So‘zlarni takrorlash",
    submit: "Javoblarni tekshirish", instructions: "Har bir so‘z uchun to‘g‘ri inglizcha ma’noni tanlang.",
    incorrect: (score: number, total: number) => `${total} tadan ${score} ta javob to‘g‘ri. Yana urinib ko‘ring.`,
  },
  en: {
    study: "Study the words", start: "Start the quiz", review: "Review the words",
    submit: "Check answers", instructions: "Choose the correct English definition for each word.",
    incorrect: (score: number, total: number) => `${score} of ${total} answers were correct. Try again.`,
  },
  ru: {
    study: "Изучить слова", start: "Начать тест", review: "Повторить слова",
    submit: "Проверить ответы", instructions: "Выберите правильное определение каждого слова на английском.",
    incorrect: (score: number, total: number) => `Правильных ответов: ${score} из ${total}. Попробуйте ещё раз.`,
  },
};

export function SchollyIeltsMission({ exercise, locale, busy, score, onSubmit }: {
  exercise: SchollyIeltsExercise;
  locale: keyof typeof labels;
  busy: boolean;
  score: number | null;
  onSubmit: (answers: number[]) => void;
}) {
  const [step, setStep] = useState<"closed" | "words" | "quiz">("closed");
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const copy = labels[locale];

  if (step === "closed") return <Button onClick={() => setStep("words")}>{copy.study}</Button>;
  if (step === "words") return (
    <div className="space-y-3">
      <dl lang="en" className="grid gap-2 sm:grid-cols-2">
        {exercise.words.map(({ word, definition }) => (
          <div key={word} className="rounded-surface border border-slate-300 p-2 dark:border-slate-700">
            <dt className="font-semibold">{word}</dt>
            <dd className="text-sm">{definition}</dd>
          </div>
        ))}
      </dl>
      <Button onClick={() => setStep("quiz")}>{copy.start}</Button>
    </div>
  );
  return (
    <form className="space-y-3" onSubmit={(event) => {
      event.preventDefault();
      if (!busy) onSubmit(exercise.questions.map(({ word }) => answers[word]));
    }}>
      <p className="text-sm">{copy.instructions}</p>
      <div lang="en" className="grid gap-3 sm:grid-cols-2">
        {exercise.questions.map(({ word, options }) => (
          <fieldset key={word}>
            <legend className="font-semibold">{word}</legend>
            {options.map((option, index) => (
              <label key={option} className="flex items-center gap-2 py-1 text-sm">
                <input type="radio" name={`ielts-${word}`} required checked={answers[word] === index}
                  disabled={busy} onChange={() => setAnswers((current) => ({ ...current, [word]: index }))} />
                {option}
              </label>
            ))}
          </fieldset>
        ))}
      </div>
      {score !== null && <p role="status" className="text-sm">{copy.incorrect(score, exercise.questions.length)}</p>}
      <div className="flex flex-wrap gap-2">
        <Button type="submit" disabled={busy || Object.keys(answers).length < exercise.questions.length}>{copy.submit}</Button>
        <Button variant="outline" disabled={busy} onClick={() => setStep("words")}>{copy.review}</Button>
      </div>
    </form>
  );
}
