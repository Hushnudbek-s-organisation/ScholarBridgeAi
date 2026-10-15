/**
 * Small text helpers shared by the exemplar library and the sample UI.
 *
 * Kept apart from ./exemplars so client components can import them statically
 * while the library itself stays a lazily loaded chunk.
 */

/** Same paragraph rule as src/lib/essay.ts, so roles line up with the rubric. */
export function splitParagraphs(text: string): string[] {
  return text
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter((p) => p.length > 0);
}

/** Word count with the same rule as src/lib/essay.ts `countWords`. */
export function sampleWordCount(text: string): number {
  return text.trim().split(/\s+/).filter((w) => /[a-z\u0400-\u04ff]/i.test(w)).length;
}

const normalize = (value: string) => value.replace(/\s+/g, " ").trim();

/**
 * True while `current` is still the untouched sample text. Surfaces that save
 * to the student's records use this to refuse persisting borrowed content.
 */
export function isUnmodifiedSample(current: string | null | undefined, sampleText: string | null | undefined): boolean {
  if (!current || !sampleText) return false;
  return normalize(current) === normalize(sampleText);
}

/**
 * Figures worth highlighting in the annotated view: amounts, percentages,
 * scores, counts with a unit and years. Purely presentational. A digit glued
 * to a name ("Sentinel-2", "INT4") is part of the name, and a figure never
 * ends on a comma ("2025," highlights "2025").
 */
export const EVIDENCE_TOKEN_RE =
  /(?:[$€£]\s?)?(?<![A-Za-z]-)\b\d(?:[\d,]*\d)?(?:\.\d+)?(?:\/\d+(?:\.\d+)?)?(?:\s?(?:%|percent\b|hours?\b|weeks?\b|months?\b|years?\b|students?\b|hectares?\b|volunteers?\b|vendors?\b|teams?\b|schools?\b|papers?\b|records?\b|households?\b|feeders?\b|doses?\b|nurses?\b|USD\b|EUR\b|euros?\b|pounds?\b|dollars?\b|won\b|million\b|km\b|kg\b))?/gi;

/** Placeholders a template asks the student to fill in, e.g. "[Sponsor's full name]". */
export const PLACEHOLDER_RE = /\[[^\]\n]{2,80}\]/g;

/** Digits that are not evidence: phone numbers and "1." list markers at a line start. */
const PHONE_RE = /\+\d{1,3}(?:[\s-]\d{2,4}){2,5}/;
const LIST_MARKER_RE = /(?<![^\n])\d{1,2}\.(?=\s)/;

const SEGMENT_RE = new RegExp(
  `(${PLACEHOLDER_RE.source})|(${PHONE_RE.source})|(${LIST_MARKER_RE.source})|(${EVIDENCE_TOKEN_RE.source})`,
  "gi",
);

/** Placeholders still present in a template, e.g. after the student edited it. */
export function placeholderCount(text: string): number {
  return (text.match(new RegExp(PLACEHOLDER_RE.source, "g")) ?? []).length;
}

export type TextSegment = { kind: "text" | "evidence" | "placeholder"; value: string };

/** Splits text into plain runs, evidence figures and [placeholders] for highlighting. */
export function segmentSampleText(text: string): TextSegment[] {
  const segments: TextSegment[] = [];
  let last = 0;
  for (const match of text.matchAll(new RegExp(SEGMENT_RE.source, "gi"))) {
    const index = match.index ?? 0;
    const value = match[0];
    if (!value) continue;
    if (index > last) segments.push({ kind: "text", value: text.slice(last, index) });
    const kind: TextSegment["kind"] = match[1] ? "placeholder" : match[4] ? "evidence" : "text";
    segments.push({ kind, value });
    last = index + value.length;
  }
  if (last < text.length) segments.push({ kind: "text", value: text.slice(last) });
  return segments;
}

/** Count of highlighted evidence figures in a text (presentational). */
export function evidenceCount(text: string): number {
  return segmentSampleText(text).filter((segment) => segment.kind === "evidence").length;
}
