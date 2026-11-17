import { createHash } from "node:crypto";
import { paragraphs } from "./essay";
import { ESSAY_RUBRIC_SAMPLES, SOP_SAMPLES } from "./samples/exemplars";

export const SCHOLLY_SOP_DAILY_PARAGRAPHS = 3;
const MIN_PARAGRAPH_WORDS = 40;

function writingWords(paragraph: string) {
  return paragraph.normalize("NFKC").toLowerCase().replace(/\[[^\]\n]+\]/g, " ").replace(/[’ʻʼ`]/g, "'")
    .match(/\p{L}[\p{L}\p{M}]*(?:'[\p{L}\p{M}]+)*/gu) ?? [];
}

type WritingSample = { words: Set<string>; phrases: Set<string>; fingerprint: string };

function writingSample(paragraph: string): WritingSample | null {
  const tokens = writingWords(paragraph);
  if (tokens.length < MIN_PARAGRAPH_WORDS) return null;
  const words = new Set(tokens);
  const substantialWords = [...words].filter(word => word.length >= 3);
  if (words.size < Math.ceil(tokens.length * 0.32) || substantialWords.length < 12) return null;
  const occurrences = new Map<string, number>();
  for (const word of tokens) {
    const count = (occurrences.get(word) ?? 0) + 1;
    if (count > tokens.length / 5) return null;
    occurrences.set(word, count);
  }

  const phrases = new Set(tokens.slice(2).map((word, index) => `${tokens[index]} ${tokens[index + 1]} ${word}`));
  const fingerprint = createHash("sha256").update(tokens.join(" ")).digest("hex");
  return { words, phrases, fingerprint };
}

function overlap(left: Set<string>, right: Set<string>) {
  const [smaller, larger] = left.size <= right.size ? [left, right] : [right, left];
  let matches = 0;
  for (const item of smaller) if (larger.has(item)) matches++;
  return matches / smaller.size;
}

function substantiallySame(left: WritingSample, right: WritingSample) {
  if (left.fingerprint === right.fingerprint) return true;
  if (overlap(left.phrases, right.phrases) >= 0.75) return true;
  // A near-identical word list of comparable size also catches reshuffled text.
  const wordSizeRatio = Math.min(left.words.size, right.words.size) / Math.max(left.words.size, right.words.size);
  return wordSizeRatio >= 0.82 && overlap(left.words, right.words) >= 0.90;
}

function writingSamples(drafts: readonly string[]) {
  return drafts.flatMap(draft => paragraphs(draft)).map(writingSample)
    .filter((sample): sample is WritingSample => sample !== null);
}

const teachingExamples = writingSamples([...SOP_SAMPLES, ...ESSAY_RUBRIC_SAMPLES].map(sample => sample.text));

/** Score local novelty and obvious filler deterministically; this is not an authorship check. */
export function schollySopCandidates(content: string, previousDrafts: readonly string[] = []) {
  const known = [...teachingExamples, ...writingSamples(previousDrafts)];
  const novel: string[] = [];
  for (const text of paragraphs(content)) {
    const sample = writingSample(text);
    if (!sample || known.some(existing => substantiallySame(sample, existing))) continue;
    novel.push(sample.fingerprint);
    known.push(sample);
  }
  return novel;
}
