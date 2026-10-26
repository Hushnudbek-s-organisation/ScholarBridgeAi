/**
 * Poll delivery and aggregate results.
 *
 * Privacy is the design constraint: a channel poll is always anonymous and the
 * publisher never stores a vote. Telegram sends the bot one `poll` update with
 * per-option **counts** whenever the poll closes (and `stopPoll` returns the
 * same aggregate on demand), so nothing here can ever name a voter. Only the
 * totals feed `channel_prefs`.
 *
 * Everything in this file is pure: the deck lookup, the sendPoll parameters,
 * parsing an aggregate into the stored JSON and turning vote shares into
 * preference weights. The database lives in `engage.ts`, the network call in
 * `send.ts`.
 */
import { POLL_DECK, type PollSpec, type PollType } from "./templates/polls.uz";
import { nextWeight, PREFS_MAX, PREFS_MIN } from "./prefs";

/** Telegram's own bounds (also what `validatePoll` enforces offline). */
export const POLL_OPEN_PERIOD_SEC = 3 * 24 * 60 * 60;
export const POLL_QUESTION_MAX = 300;
export const POLL_OPTION_MAX = 100;
export const POLL_OPTIONS_MIN = 2;
export const POLL_OPTIONS_MAX = 10;
export const POLL_EXPLANATION_MAX = 200;

/** The deck is code, so a plan row only stores the key and can always be replayed. */
export function pollSpecByKey(key: string | null | undefined): PollSpec | null {
  if (!key) return null;
  return POLL_DECK.find((spec) => spec.key === key) ?? null;
}

export function pollSpecKeys(): string[] {
  return POLL_DECK.map((spec) => spec.key);
}

export interface PollSendParams {
  question: string;
  options: string[];
  type: "regular" | "quiz";
  is_anonymous: true;
  correct_option_id?: number;
  explanation?: string;
  allows_multiple_answers?: boolean;
  open_period?: number;
}

/**
 * sendPoll parameters for one deck entry. Anonymous is hard-coded: a named
 * channel poll would make the bot store identities, which this publisher never
 * does. `open_period` closes the poll by itself so results arrive even if no
 * admin ever presses "close".
 */
export function pollSendParams(spec: PollSpec, openPeriodSec = POLL_OPEN_PERIOD_SEC): PollSendParams {
  const params: PollSendParams = {
    question: spec.question.slice(0, POLL_QUESTION_MAX),
    options: spec.options.map((option) => option.text.slice(0, POLL_OPTION_MAX)),
    type: spec.type === "quiz_data" ? "quiz" : "regular",
    is_anonymous: true,
  };
  if (params.type === "quiz" && typeof spec.correctIndex === "number") {
    params.correct_option_id = spec.correctIndex;
    if (spec.explanation) params.explanation = spec.explanation.slice(0, POLL_EXPLANATION_MAX);
  }
  if (spec.multiple) params.allows_multiple_answers = true;
  if (openPeriodSec > 0) params.open_period = openPeriodSec;
  return params;
}

/** Does the deck entry still fit Telegram's limits? (Admin list badge.) */
export function pollSendProblem(spec: PollSpec): string | null {
  if (!spec.question.trim()) return "empty question";
  if (spec.question.length > POLL_QUESTION_MAX) return "question too long";
  if (spec.options.length < POLL_OPTIONS_MIN) return "fewer than 2 options";
  if (spec.options.length > POLL_OPTIONS_MAX) return "more than 10 options";
  if (spec.options.some((option) => !option.text.trim())) return "empty option";
  if (spec.options.some((option) => option.text.length > POLL_OPTION_MAX)) return "option too long";
  if (spec.type === "quiz_data" && typeof spec.correctIndex !== "number") return "quiz without a correct answer";
  return null;
}

/** Text form of a poll, for the queue table and the dry-run log. */
export function pollPreviewText(question: string, options: string[]): string {
  return [`📊 ${question}`, ...options.map((option) => `• ${option}`)].join("\n");
}

/* ------------------------------------------------------------------ */
/* Aggregate results                                                   */
/* ------------------------------------------------------------------ */

export interface PollOptionResult {
  /** Stable deck key — this is what a preference is learned from. */
  key: string;
  text: string;
  voters: number;
}

export interface PollResult {
  options: PollOptionResult[];
  totalVoters: number;
  closed: boolean;
}

/** The subset of Telegram's `Poll` object this module reads. */
export interface TgPollLike {
  id?: string;
  question?: string;
  options?: { text?: string; voter_count?: number }[];
  total_voter_count?: number;
  is_closed?: boolean;
}

/**
 * Turn Telegram's aggregate into our stored shape. Options are matched to deck
 * keys by position (the order we sent them in is the order Telegram echoes), so
 * a renamed option text never breaks the mapping.
 */
export function parsePollResult(spec: PollSpec | null, poll: TgPollLike): PollResult {
  const options = (poll.options ?? []).map((option, index) => ({
    key: spec?.options[index]?.key ?? `option_${index}`,
    text: option.text ?? spec?.options[index]?.text ?? `#${index + 1}`,
    voters: Number.isFinite(option.voter_count) ? Math.max(0, Number(option.voter_count)) : 0,
  }));
  const summed = options.reduce((total, option) => total + option.voters, 0);
  const totalVoters = Number.isFinite(poll.total_voter_count) ? Math.max(0, Number(poll.total_voter_count)) : summed;
  return { options, totalVoters, closed: poll.is_closed === true };
}

export function serializePollResult(result: PollResult): string {
  return JSON.stringify(result.options.map((option) => ({ key: option.key, text: option.text, voters: option.voters })));
}

/** Defensive read: a hand-edited or half-written row must never throw. */
export function parseStoredResults(raw: string | null | undefined): PollOptionResult[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter((row): row is Record<string, unknown> => typeof row === "object" && row !== null)
      .map((row, index) => ({
        key: typeof row.key === "string" ? row.key : `option_${index}`,
        text: typeof row.text === "string" ? row.text : `#${index + 1}`,
        voters: Number.isFinite(Number(row.voters)) ? Math.max(0, Number(row.voters)) : 0,
      }));
  } catch {
    return [];
  }
}

/** A poll with no votes yet is not a signal — it must never move a weight. */
export function pollHasSignal(result: PollResult): boolean {
  return result.totalVoters > 0 && result.options.some((option) => option.voters > 0);
}

/* ------------------------------------------------------------------ */
/* Votes → preferences                                                 */
/* ------------------------------------------------------------------ */

export interface PrefUpdate {
  /** e.g. `country:canada` — the same key `topicKeys()` produces. */
  topic: string;
  weight: number;
}

/** `country:mixed` + option `canada` → `country:canada`. */
export function prefTopicFor(specTopic: string, optionKey: string): string | null {
  const family = specTopic.split(":")[0]?.trim();
  const key = optionKey.trim();
  if (!family || !key || !/^[a-z][a-z0-9_]*$/.test(family) || !/^[a-z][a-z0-9_]*$/.test(key)) return null;
  return `${family}:${key}`;
}

/**
 * Only `pref` polls teach the planner. A quiz, a this-or-that or a struggle poll
 * is engagement, not a preference, and a multi-answer poll would double-count.
 */
export function pollTeachesPrefs(spec: PollSpec | null): boolean {
  return spec?.type === "pref";
}

/**
 * One poll's shares → the new weights. Each option is one candidate topic, so
 * `share × optionCount` normalises across 3-option and 4-option polls; a
 * multi-answer poll is excluded upstream because its shares sum above 1.
 */
export function prefUpdatesFromPoll(
  spec: PollSpec | null,
  result: PollResult,
  current: Record<string, number> = {}
): PrefUpdate[] {
  if (!spec || !pollTeachesPrefs(spec) || !pollHasSignal(result)) return [];
  const updates: PrefUpdate[] = [];
  for (const option of result.options) {
    const topic = prefTopicFor(spec.topic, option.key);
    if (!topic) continue;
    const share = option.voters / result.totalVoters;
    const base = typeof current[topic] === "number" ? current[topic] : 1;
    const weight = nextWeight(base, share, result.options.length);
    if (weight < PREFS_MIN || weight > PREFS_MAX) continue;
    updates.push({ topic, weight: Number(weight.toFixed(4)) });
  }
  return updates;
}

/** Human summary for the admin table: "42% · Kanada". */
export function optionSummary(result: PollResult): { key: string; text: string; voters: number; share: number }[] {
  const total = result.totalVoters;
  return result.options.map((option) => ({
    ...option,
    share: total > 0 ? option.voters / total : 0,
  }));
}

export type { PollSpec, PollType };
