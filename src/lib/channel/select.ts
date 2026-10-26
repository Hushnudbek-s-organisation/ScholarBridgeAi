/**
 * Deterministic selection helpers: seeded randomness, topic keys, topic
 * weighting, bank rotation and poll choice. No database, no clock — the caller
 * passes the plan date, so the same inputs always produce the same plan.
 */
import { effectiveWeight } from "./prefs";
import { POLL_COOLDOWN_DAYS, POLL_DECK, type PollSpec, type PollType } from "./templates/polls.uz";
import type { Facts } from "./templates/facts";

// ---------------------------------------------------------------------------
// Deterministic randomness
// ---------------------------------------------------------------------------

/** FNV-1a (32 bit) — stable across platforms and runs. */
export function fnv1a(input: string): number {
  let hash = 0x811c9dc5;
  for (let i = 0; i < input.length; i++) {
    hash ^= input.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }
  return hash >>> 0;
}

/** Small, fast PRNG; the same seed yields the same sequence everywhere. */
export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function seeded(seed: string): () => number {
  return mulberry32(fnv1a(seed));
}

// ---------------------------------------------------------------------------
// Dates (plan dates are plain YYYY-MM-DD in Asia/Tashkent)
// ---------------------------------------------------------------------------

export function validPlanDate(day: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(day)) return false;
  const d = new Date(`${day}T00:00:00Z`);
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === day;
}

/** Whole days between two plan dates (b − a); null when either is invalid. */
export function daysBetween(a: string, b: string): number | null {
  if (!validPlanDate(a) || !validPlanDate(b)) return null;
  return Math.round((Date.parse(`${b}T00:00:00Z`) - Date.parse(`${a}T00:00:00Z`)) / 86_400_000);
}

/** 0 = Monday … 6 = Sunday. */
export function weekdayOf(day: string): number {
  const d = new Date(`${day}T00:00:00Z`);
  return (d.getUTCDay() + 6) % 7;
}

/** ISO-8601 week number (weeks start Monday; week 1 contains the first Thursday). */
export function isoWeekNumber(day: string): number {
  const d = new Date(`${day}T00:00:00Z`);
  const target = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
  const dayNum = (target.getUTCDay() + 6) % 7;
  target.setUTCDate(target.getUTCDate() - dayNum + 3);
  const firstThursday = new Date(Date.UTC(target.getUTCFullYear(), 0, 4));
  const firstDayNum = (firstThursday.getUTCDay() + 6) % 7;
  firstThursday.setUTCDate(firstThursday.getUTCDate() - firstDayNum + 3);
  return 1 + Math.round((target.getTime() - firstThursday.getTime()) / (7 * 86_400_000));
}

// ---------------------------------------------------------------------------
// Topics
// ---------------------------------------------------------------------------

export interface TopicSource {
  country: string | null;
  degreeLevels: string | null;
  eligibleMajors: string | null;
  fullyFunded: boolean;
}

function slug(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

function listOf(raw: string | null): string[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.map((v) => String(v)) : [];
  } catch {
    return [];
  }
}

const DEGREE_TOPICS: Record<string, string> = {
  bachelor: "degree:bachelor",
  "bachelor's": "degree:bachelor",
  bachelors: "degree:bachelor",
  master: "degree:master",
  "master's": "degree:master",
  masters: "degree:master",
  phd: "degree:phd",
  doctorate: "degree:phd",
};

const FIELD_PATTERNS: { field: string; re: RegExp }[] = [
  { field: "field:engineering", re: /engineer|computer|\bit\b|informatic|technolog|math|physic|robot/i },
  { field: "field:medicine", re: /medic|biolog|health|nurs|pharmac|dent/i },
  { field: "field:business", re: /business|econom|management|finance|account|marketing/i },
  { field: "field:social", re: /law|social|politic|journal|psycholog|history|philosoph|education|pedagog|design|art/i },
];

/** Topic keys a scholarship belongs to (used for weighting and rotation). */
export function topicKeys(source: TopicSource): string[] {
  const topics: string[] = [];
  const country = slug(source.country ?? "");
  if (country && country !== "global" && country !== "worldwide") topics.push(`country:${country}`);

  for (const degree of listOf(source.degreeLevels)) {
    const topic = DEGREE_TOPICS[degree.toLowerCase().trim()];
    if (topic) topics.push(topic);
  }

  const majors = listOf(source.eligibleMajors);
  const openToAll = majors.length === 0 || majors.some((m) => /^all( majors)?$/i.test(m.trim()));
  if (!openToAll) {
    for (const { field, re } of FIELD_PATTERNS) {
      if (majors.some((m) => re.test(m))) topics.push(field);
    }
  }

  if (source.fullyFunded) topics.push("funding:full");
  return [...new Set(topics)];
}

// ---------------------------------------------------------------------------
// Candidate scoring
// ---------------------------------------------------------------------------

export interface Candidate {
  facts: Facts;
  topics: string[];
  /** True when authored Uzbek copy exists (rich template available). */
  rich?: boolean;
}

/**
 * Higher is better. The preference weight dominates, a small deterministic
 * jitter breaks ties without making the plan random, and an imminent exact
 * deadline gets a nudge so it is not buried under a favourite topic.
 */
export function scoreCandidate(candidate: Candidate, prefs: Record<string, number>, rng: () => number): number {
  const weight = effectiveWeight(candidate.topics, prefs);
  const jitter = 0.9 + rng() * 0.2;
  const daysLeft = candidate.facts.deadline.daysLeft;
  const exact = candidate.facts.deadline.quality === "exact";
  const urgency = exact && daysLeft !== null ? (daysLeft <= 7 ? 1.3 : daysLeft <= 21 ? 1.1 : 1) : 1;
  // Rich copy is a tie-break inside a lane, never a reason to outrank another
  // lane: 8% is small enough that a preferred topic still wins.
  const rich = candidate.rich ? 1.08 : 1;
  return weight * jitter * urgency * rich;
}

/** Sort by score desc, then id asc — a total order, so planning is stable. */
export function rankCandidates(
  candidates: readonly Candidate[],
  prefs: Record<string, number>,
  seed: string
): { candidate: Candidate; score: number }[] {
  const rng = seeded(seed);
  const scored = candidates.map((candidate) => ({ candidate, score: scoreCandidate(candidate, prefs, rng) }));
  scored.sort((a, b) => (b.score - a.score) || (a.candidate.facts.id - b.candidate.facts.id));
  return scored;
}

export interface BankHistoryRow {
  templateKey: string;
  planDate: string;
}

/**
 * Rotate through a bank: entries not used inside `cycleDays` come first, the
 * longest-unused one wins, and ties keep the bank order. Once every entry has
 * been used recently the whole bank becomes eligible again.
 */
export function nextBankEntry<T extends { key: string }>(
  bank: readonly T[],
  history: readonly BankHistoryRow[],
  planDate: string,
  cycleDays: number
): T | null {
  if (bank.length === 0) return null;
  const lastUsed = new Map<string, string>();
  for (const row of history) {
    const prev = lastUsed.get(row.templateKey);
    if (!prev || row.planDate > prev) lastUsed.set(row.templateKey, row.planDate);
  }
  const scored = bank.map((entry, index) => {
    const used = lastUsed.get(entry.key);
    const age = used ? daysBetween(used, planDate) : null;
    const fresh = age === null || age >= cycleDays;
    return { entry, index, age: age ?? Number.POSITIVE_INFINITY, fresh };
  });
  const freshOnes = scored.filter((s) => s.fresh);
  const pool = freshOnes.length ? freshOnes : scored;
  pool.sort((a, b) => (b.age === a.age ? a.index - b.index : b.age - a.age));
  return pool[0].entry;
}

// ---------------------------------------------------------------------------
// Poll choice
// ---------------------------------------------------------------------------

export interface PollHistoryRow {
  key: string;
  type: PollType;
  planDate: string;
}

/**
 * Pick today's poll: never one from the last 28 days, and prefer the poll type
 * that has gone longest without an outing, so the deck actually rotates.
 */
export function choosePoll(history: readonly PollHistoryRow[], planDate: string): PollSpec | null {
  const lastUsedByKey = new Map<string, string>();
  const lastUsedByType = new Map<PollType, string>();
  for (const row of history) {
    const prevKey = lastUsedByKey.get(row.key);
    if (!prevKey || row.planDate > prevKey) lastUsedByKey.set(row.key, row.planDate);
    const prevType = lastUsedByType.get(row.type);
    if (!prevType || row.planDate > prevType) lastUsedByType.set(row.type, row.planDate);
  }

  const available = POLL_DECK.filter((poll) => {
    const used = lastUsedByKey.get(poll.key);
    if (!used) return true;
    const age = daysBetween(used, planDate);
    return age === null || age >= POLL_COOLDOWN_DAYS;
  });
  if (available.length === 0) return null;

  const ranked = available.map((poll, index) => {
    const typeUsed = lastUsedByType.get(poll.type);
    const typeAge = typeUsed ? (daysBetween(typeUsed, planDate) ?? 0) : Number.POSITIVE_INFINITY;
    const pollUsed = lastUsedByKey.get(poll.key);
    const pollAge = pollUsed ? (daysBetween(pollUsed, planDate) ?? 0) : Number.POSITIVE_INFINITY;
    return { poll, index, typeAge, pollAge };
  });
  ranked.sort((a, b) => {
    if (a.typeAge !== b.typeAge) return b.typeAge === a.typeAge ? 0 : b.typeAge > a.typeAge ? 1 : -1;
    if (a.pollAge !== b.pollAge) return b.pollAge === a.pollAge ? 0 : b.pollAge > a.pollAge ? 1 : -1;
    return a.index - b.index;
  });
  return ranked[0].poll;
}
