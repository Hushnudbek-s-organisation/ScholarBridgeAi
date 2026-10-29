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

// ---------------------------------------------------------------------------
// Editorial order: nearest deadline first, then what the audience can use
// ---------------------------------------------------------------------------

/**
 * How close a deadline is, in bands.
 *
 * Bands, not raw days, because two programmes 3 and 5 days away are equally
 * urgent for the reader — but a programme 5 days away must beat one 40 days
 * away, which the preference weight alone never guaranteed.
 */
export function deadlineTier(facts: Facts): number {
  const d = facts.deadline;
  if (d.quality === "exact" && d.daysLeft !== null) {
    if (d.daysLeft <= 7) return 0;
    if (d.daysLeft <= 14) return 1;
    if (d.daysLeft <= 30) return 2;
    if (d.daysLeft <= 60) return 3;
    if (d.daysLeft <= 120) return 4;
    return 5;
  }
  if (d.quality === "estimated") return d.daysLeft === null ? 7 : 6;
  if (d.quality === "evergreen") return 8;
  return 9;
}

/**
 * The spellings that appear in real rows for the same country.
 *
 * `eligible_countries`/`country` are free text, so "USA", "US" and "United
 * States of America" all occur. Without this, a US programme written as "USA"
 * would sort last on a list whose first entry is "United States".
 */
const COUNTRY_ALIASES: Record<string, string> = {
  usa: "united states",
  us: "united states",
  "u s a": "united states",
  "u s": "united states",
  "united states of america": "united states",
  america: "united states",
  uk: "united kingdom",
  "u k": "united kingdom",
  britain: "united kingdom",
  "great britain": "united kingdom",
  england: "united kingdom",
  holland: "netherlands",
  "the netherlands": "netherlands",
  korea: "south korea",
  "republic of korea": "south korea",
  "korea south": "south korea",
  uae: "united arab emirates",
  eu: "european union",
  "europe": "european union",
  turkey: "turkiye",
  turkiye: "turkiye",
  // The Uzbek labels from `templates/format.ts`. A caller that hands us the
  // display name by mistake must still rank the country correctly instead of
  // silently landing on "not in the list" — which is exactly what happened
  // before: every country scored `priorities.length`.
  aqsh: "united states",
  "buyuk britaniya": "united kingdom",
  kanada: "canada",
  germaniya: "germany",
  fransiya: "france",
  italiya: "italy",
  ispaniya: "spain",
  niderlandiya: "netherlands",
  shvetsiya: "sweden",
  norvegiya: "norway",
  daniya: "denmark",
  finlandiya: "finland",
  shveytsariya: "switzerland",
  avstriya: "austria",
  belgiya: "belgium",
  irlandiya: "ireland",
  polsha: "poland",
  chexiya: "czechia",
  vengriya: "hungary",
  portugaliya: "portugal",
  gretsiya: "greece",
  turkiya: "turkiye",
  yaponiya: "japan",
  "janubiy koreya": "south korea",
  koreya: "south korea",
  xitoy: "china",
  gonkong: "hong kong",
  singapur: "singapore",
  malayziya: "malaysia",
  hindiston: "india",
  avstraliya: "australia",
  "yangi zelandiya": "new zealand",
  "birlashgan arab amirliklari": "united arab emirates",
  qatar: "qatar",
  "saudiya arabistoni": "saudi arabia",
  isroil: "israel",
  rossiya: "russia",
  ozbekiston: "uzbekistan",
  qozogiston: "kazakhstan",
  "janubiy afrika": "south africa",
  braziliya: "brazil",
  meksika: "mexico",
};

const normaliseCountry = (value: string): string =>
  value
    .trim()
    .toLowerCase()
    .replace(/[’'`]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();

/**
 * Where a country sits in the operator's priority list; unknown countries sort
 * after every listed one, and a programme without a country sorts after those.
 *
 * Matching is tolerant on purpose: the stored value is free text
 * ("United States", "USA", "United States of America"), so a substring match in
 * either direction is accepted rather than silently ranking a US programme last
 * because the row says "USA".
 */
export function countryPriority(country: string | null | undefined, priorities: readonly string[]): number {
  if (!priorities.length) return 0; // no preference configured: no influence
  if (!country) return priorities.length + 1;
  const canonical = canonicalCountry(country);
  if (!canonical) return priorities.length + 1;
  for (let i = 0; i < priorities.length; i++) {
    if (canonicalCountry(priorities[i]) === canonical) return i;
  }
  // Last resort: one name contained in the other ("Korea" vs "South Korea").
  for (let i = 0; i < priorities.length; i++) {
    const candidate = canonicalCountry(priorities[i]);
    if (!candidate) continue;
    if (canonical.includes(candidate) || candidate.includes(canonical)) return i;
  }
  return priorities.length;
}

/** Normalise a country name through the alias table above. */
function canonicalCountry(value: string | null | undefined): string {
  const base = normaliseCountry(String(value ?? ""));
  if (!base) return "";
  const alias = COUNTRY_ALIASES[base];
  if (alias) return alias;
  // "united states (usa)" and similar → try the leading words.
  const stripped = base.replace(/\s*\(.*$/, "").trim();
  return COUNTRY_ALIASES[stripped] ?? stripped;
}

export interface EditorialSortOptions {
  prefs: Record<string, number>;
  /** Operator's country order; empty disables the country tie-break. */
  priorities?: readonly string[];
  seed: string;
}

/**
 * The order the editorial lane picks from.
 *
 *   1. deadline tier — the near ones go out while they still matter;
 *   2. exact days left — inside a band, tomorrow beats next week;
 *   3. country priority — among awards that close on the same day, the
 *      countries this audience actually applies to come first;
 *   4. the existing preference score (topic weights learned from polls);
 *   5. id, so the order is total and the plan is reproducible.
 */
export function editorialRank(
  candidates: readonly Candidate[],
  options: EditorialSortOptions
): { candidate: Candidate; score: number; tier: number; priority: number }[] {
  const priorities = options.priorities ?? [];
  const rng = seeded(options.seed);
  const scored = candidates.map((candidate) => ({
    candidate,
    score: scoreCandidate(candidate, options.prefs, rng),
    tier: deadlineTier(candidate.facts),
    /**
     * `countryRaw` — the value stored in the database — not `country`, which is
     * the Uzbek label ("Yaponiya", "AQSh") meant for printing.
     *
     * Feeding the label in made every country score `priorities.length`, i.e.
     * "not in the list": the operator's country order had no effect on the plan
     * at all. The alias table now also knows the Uzbek spellings, so a label
     * that slips through still resolves instead of silently sorting last.
     */
    priority: countryPriority(candidate.facts.countryRaw ?? candidate.facts.country, priorities),
  }));
  const days = (value: { candidate: Candidate }) => value.candidate.facts.deadline.daysLeft ?? Number.POSITIVE_INFINITY;
  scored.sort(
    (a, b) =>
      a.tier - b.tier ||
      // Nearest deadline first — the operator's first rule. The country order is
      // a tie-break inside a band, not a way for a farther award in a favourite
      // country to jump a nearer one: a 7-day US programme must not be announced
      // before a 1-day one anywhere else.
      days(a) - days(b) ||
      a.priority - b.priority ||
      b.score - a.score ||
      a.candidate.facts.id - b.candidate.facts.id
  );
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
