/**
 * Picking the model answer for the question currently on screen.
 *
 * Lives in `lib` (not in the component) for two reasons: it is pure, so it can
 * be unit-checked without a DOM, and the interview panel must be able to call
 * it WITHOUT statically importing the exemplar library — that library is a
 * large lazy chunk (scripts/check-samples.ts enforces this), so the panel
 * `await import()`s it on click and hands the array in here.
 */
import { VISA_SAMPLE_ID_BY_COUNTRY, visaSampleCountryFor } from "@/lib/samples/visa";
import type { VisaSample } from "@/lib/samples/exemplars";

/** Officer question / applicant answer pairs, in the order the officer asks. */
export function samplePairs(sample: VisaSample): { question: string; answer: string }[] {
  const pairs: { question: string; answer: string }[] = [];
  for (let i = 0; i < sample.turns.length - 1; i++) {
    const current = sample.turns[i];
    const next = sample.turns[i + 1];
    if (current.role === "officer" && next.role === "user") {
      pairs.push({ question: current.text, answer: next.text });
    }
  }
  return pairs;
}

/**
 * The authored answer for the current turn.
 *
 * Question text is matched first (the live officer paraphrases), and the number
 * of answers already given is the fallback — so the button keeps working when
 * the officer improvises. Returns null when the destination has no sample: the
 * UI then hides the button rather than inventing a script.
 */
export function modelAnswerForTurn(
  samples: VisaSample[],
  countryCode: string | null,
  questionText: string | null,
  answeredTurns: number,
): string | null {
  const sampleCountry = visaSampleCountryFor(countryCode);
  if (!sampleCountry) return null;
  const sampleId = VISA_SAMPLE_ID_BY_COUNTRY[sampleCountry];
  const sample = samples.find((entry) => entry.id === sampleId);
  if (!sample) return null;

  const pairs = samplePairs(sample);
  if (pairs.length === 0) return null;

  const asked = (questionText ?? "").trim().toLowerCase();
  if (asked.length > 12) {
    const exact = pairs.find((p) => p.question.trim().toLowerCase() === asked);
    if (exact) return exact.answer;
    const close = pairs.find(
      (p) =>
        p.question.toLowerCase().includes(asked.slice(0, 24)) ||
        asked.includes(p.question.toLowerCase().slice(0, 24)),
    );
    if (close) return close.answer;
  }

  const index = Math.min(Math.max(answeredTurns, 0), pairs.length - 1);
  return pairs[index]?.answer ?? pairs[0].answer;
}
