/**
 * The daily plan — one pure function, same inputs → same plan.
 *
 * Rules (all deterministic, all tested):
 *  - one quiet day per week (derived from the ISO week number, so it rotates);
 *  - at most three messages a day, each inside 09:00–11:00 or 18:30–21:00
 *    Asia/Tashkent, with a seeded jitter so posts do not land on the hour;
 *  - an imminent exact deadline always wins a slot;
 *  - a scholarship is not repeated within its cooldown, and tip / checklist /
 *    story banks rotate instead of repeating;
 *  - polls are their own message, at most one a day and at least two days
 *    apart, chosen from the deck with a 28-day per-poll cooldown;
 *  - no numbers that we cannot compute: a weekly summary carries the counts the
 *    caller passes (and drops the rest).
 */
import {
  choosePoll,
  daysBetween,
  isoWeekNumber,
  nextBankEntry,
  rankCandidates,
  seeded,
  validPlanDate,
  weekdayOf,
  type Candidate,
} from "./select";
import { urgencyRung } from "./model";
import type { PollType } from "./templates/polls.uz";
import {
  CHECKLIST_BANK,
  QA_BANK,
  TIP_BANK,
  type Kind,
  type StoryEntry,
} from "./templates/templates.uz";

export const MAX_POSTS_PER_DAY = 3;

/** Cooldowns, in days. */
export const COOLDOWN = {
  single: 30,
  fullyFunded: 45,
  digestMember: 7,
  spotlightGroup: 14,
  story: 90,
  tip: 21,
  checklist: 30,
  qa: 14,
  weekly: 6,
  poll: 2,
} as const;

/** Urgency posts only exist for these rungs (3 days or less). */
export const URGENT_RUNG_MAX = 3;

const MORNING = { start: 9 * 60, span: 120 }; // 09:00–11:00
const EVENING = { start: 18 * 60 + 30, span: 150 }; // 18:30–21:00

export type PlanKind = Kind | "poll";

export interface PlanHistoryRow {
  planDate: string;
  kind: PlanKind;
  scholarshipId: number | null;
  templateKey: string;
  topic?: string | null;
  pollKey?: string | null;
  pollType?: PollType | null;
  storyId?: number | null;
}

export interface PlanStory extends StoryEntry {
  id: number;
}

export interface PlanInput {
  /** YYYY-MM-DD in Asia/Tashkent. */
  planDate: string;
  candidates: readonly Candidate[];
  history?: readonly PlanHistoryRow[];
  prefs?: Record<string, number>;
  stories?: readonly PlanStory[];
  discussionEnabled?: boolean;
  maxPerDay?: number;
  /** Data-backed numbers for Monday's recap; anything omitted is not printed. */
  weekly?: { published?: number | null; newThisWeek?: number | null };
}

export interface PlannedItem {
  slot: number;
  /** "HH:MM" Asia/Tashkent — the earliest the sender may post this item. */
  sendAt: string;
  kind: PlanKind;
  rung: number | null;
  scholarshipId: number | null;
  templateKey: string;
  topic: string | null;
  pollType: PollType | null;
  payload: Record<string, unknown>;
  reason: string;
}

/** "%d" style minutes → "HH:MM". */
export function hhmm(minutes: number): string {
  const clamped = Math.max(0, Math.min(23 * 60 + 59, Math.round(minutes)));
  return `${String(Math.floor(clamped / 60)).padStart(2, "0")}:${String(clamped % 60).padStart(2, "0")}`;
}

/**
 * One quiet day a week. The weekday is `isoWeek % 7`, so it moves between
 * weeks instead of always landing on the same weekday.
 */
export function isQuietDay(planDate: string): boolean {
  if (!validPlanDate(planDate)) return true;
  return weekdayOf(planDate) === isoWeekNumber(planDate) % 7;
}

/** The identity of a planned message; also the DB dedupe key. */
export function planDedupeKey(item: Pick<PlannedItem, "kind" | "scholarshipId" | "rung">, planDate: string, slot: number): string {
  return [item.kind, item.scholarshipId ?? "-", item.rung ?? "-", planDate, slot].join("|");
}

function recentlyUsed(history: readonly PlanHistoryRow[], planDate: string, days: number, predicate: (row: PlanHistoryRow) => boolean): boolean {
  for (const row of history) {
    if (!predicate(row)) continue;
    const age = daysBetween(row.planDate, planDate);
    if (age === null) continue;
    if (age >= 0 && age < days) return true;
  }
  return false;
}

function lastScholarshipUse(history: readonly PlanHistoryRow[], planDate: string, scholarshipId: number, days: number): boolean {
  return recentlyUsed(history, planDate, days, (row) => row.scholarshipId === scholarshipId);
}

/** Falls back to the first slot of the day for the rare "nothing fits" case. */
export function buildDailyPlan(input: PlanInput): PlannedItem[] {
  const planDate = input.planDate;
  if (!validPlanDate(planDate)) return [];
  if (isQuietDay(planDate)) return [];

  const history = input.history ?? [];
  const prefs = input.prefs ?? {};
  const maxPerDay = Math.min(MAX_POSTS_PER_DAY, Math.max(1, input.maxPerDay ?? MAX_POSTS_PER_DAY));
  const rng = seeded(`plan|${planDate}`);
  const items: PlannedItem[] = [];
  const usedScholarshipIds = new Set<number>();
  const usedKinds = new Set<PlanKind>();

  const available = input.candidates.filter((c) => !usedScholarshipIds.has(c.facts.id));
  const ranked = rankCandidates(available, prefs, `rank|${planDate}`);

  const targetCount = (() => {
    const r = rng();
    const base = r < 0.25 ? 1 : r < 0.85 ? 2 : 3;
    return Math.min(maxPerDay, base);
  })();

  // ---- slot 0: the most time-sensitive thing we have ----------------------
  const urgent = ranked
    .filter(({ candidate }) => {
      const d = candidate.facts.deadline;
      if (d.quality !== "exact" || d.daysLeft === null || d.daysLeft < 0) return false;
      if (d.daysLeft > URGENT_RUNG_MAX) return false;
      return !lastScholarshipUse(history, planDate, candidate.facts.id, 7);
    })
    .sort((a, b) => (a.candidate.facts.deadline.daysLeft ?? 0) - (b.candidate.facts.deadline.daysLeft ?? 0));

  if (urgent.length > 0) {
    const { candidate } = urgent[0];
    const rung = urgencyRung(candidate.facts.deadline) ?? URGENT_RUNG_MAX;
    const variant = Math.floor(rng() * 4);
    items.push({
      slot: 0,
      sendAt: "00:00",
      kind: "urgency",
      rung,
      scholarshipId: candidate.facts.id,
      templateKey: `urgency_v${variant + 1}`,
      topic: candidate.topics[0] ?? null,
      pollType: null,
      payload: { daysLeft: candidate.facts.deadline.daysLeft, variant },
      reason: `${candidate.facts.deadline.daysLeft} kun qoldi (rung ${rung})`,
    });
    usedScholarshipIds.add(candidate.facts.id);
    usedKinds.add("urgency");
  } else {
    const single = ranked.find(
      ({ candidate }) => !lastScholarshipUse(history, planDate, candidate.facts.id, COOLDOWN.single)
    );
    if (single) {
      const variant = Math.floor(rng() * 3);
      items.push({
        slot: 0,
        sendAt: "00:00",
        kind: "scholarship_single",
        rung: null,
        scholarshipId: single.candidate.facts.id,
        templateKey: `single_v${variant + 1}`,
        topic: single.candidate.topics[0] ?? null,
        pollType: null,
        payload: { variant, score: Number(single.score.toFixed(3)) },
        reason: "mavzu bo'yicha eng yuqori ball",
      });
      usedScholarshipIds.add(single.candidate.facts.id);
      usedKinds.add("scholarship_single");
    }
  }

  // ---- slot 1: money, collections, evergreen ------------------------------
  if (items.length < targetCount) {
    const fullyFunded = ranked.find(
      ({ candidate }) =>
        candidate.facts.fullyFunded &&
        !usedScholarshipIds.has(candidate.facts.id) &&
        !lastScholarshipUse(history, planDate, candidate.facts.id, COOLDOWN.fullyFunded)
    );
    const digestPool = ranked
      .filter(({ candidate }) => {
        const d = candidate.facts.deadline;
        return (
          d.quality === "exact" &&
          d.date !== null &&
          d.daysLeft !== null &&
          d.daysLeft <= 30 &&
          !usedScholarshipIds.has(candidate.facts.id) &&
          !lastScholarshipUse(history, planDate, candidate.facts.id, COOLDOWN.digestMember)
        );
      })
      .sort((a, b) => (a.candidate.facts.deadline.daysLeft ?? 0) - (b.candidate.facts.deadline.daysLeft ?? 0))
      .slice(0, 5);

    const spotlightGroups = new Map<string, Candidate[]>();
    for (const { candidate } of ranked) {
      const label = candidate.facts.country;
      if (!label) continue;
      if (/^(xalqaro|global)$/i.test(label)) continue;
      const list = spotlightGroups.get(label) ?? [];
      list.push(candidate);
      spotlightGroups.set(label, list);
    }
    const spotlight = [...spotlightGroups.entries()]
      .filter(([, list]) => list.length >= 2)
      .filter(([label]) =>
        !recentlyUsed(history, planDate, COOLDOWN.spotlightGroup, (row) => row.kind === "country_spotlight" && row.topic === `country:${label}`)
      )
      .sort((a, b) => (b[1].length - a[1].length) || a[0].localeCompare(b[0]))[0];

    if (fullyFunded) {
      const variant = Math.floor(rng() * 3);
      items.push({
        slot: items.length,
        sendAt: "00:00",
        kind: "fully_funded",
        rung: null,
        scholarshipId: fullyFunded.candidate.facts.id,
        templateKey: `ff_v${variant + 1}`,
        topic: fullyFunded.candidate.topics[0] ?? "funding:full",
        pollType: null,
        payload: { variant },
        reason: "to'liq moliyalashtirish e'loni",
      });
      usedScholarshipIds.add(fullyFunded.candidate.facts.id);
      usedKinds.add("fully_funded");
    } else if (digestPool.length >= 2) {
      const variant = Math.floor(rng() * 3);
      items.push({
        slot: items.length,
        sendAt: "00:00",
        kind: "deadline_digest",
        rung: null,
        scholarshipId: null,
        templateKey: `digest_v${variant + 1}`,
        topic: "deadline:digest",
        pollType: null,
        payload: { scholarshipIds: digestPool.map((d) => d.candidate.facts.id), variant },
        reason: `${digestPool.length} ta yaqin muddat`,
      });
      for (const d of digestPool) usedScholarshipIds.add(d.candidate.facts.id);
      usedKinds.add("deadline_digest");
    } else if (spotlight) {
      const [label, list] = spotlight;
      const variant = Math.floor(rng() * 3);
      const chosen = list.slice(0, 4);
      items.push({
        slot: items.length,
        sendAt: "00:00",
        kind: "country_spotlight",
        rung: null,
        scholarshipId: null,
        templateKey: `spotlight_v${variant + 1}`,
        topic: `country:${label}`,
        pollType: null,
        payload: { country: label, scholarshipIds: chosen.map((c) => c.facts.id), variant },
        reason: `${label} bo'yicha ${chosen.length} ta e'lon`,
      });
      for (const c of chosen) usedScholarshipIds.add(c.facts.id);
      usedKinds.add("country_spotlight");
    }
  }

  // ---- slot 2: recap, story, Q&A, evergreen -------------------------------
  if (items.length < targetCount) {
    const isMonday = weekdayOf(planDate) === 0;
    const weeklyRecent = recentlyUsed(history, planDate, COOLDOWN.weekly, (row) => row.kind === "weekly_summary");
    const qaRecent = recentlyUsed(history, planDate, COOLDOWN.qa, (row) => row.kind === "qa");
    const story = (input.stories ?? []).find(
      (s) => !recentlyUsed(history, planDate, COOLDOWN.story, (row) => row.kind === "story" && row.storyId === s.id)
    );

    if (isMonday && !weeklyRecent) {
      const variant = Math.floor(rng() * 3);
      const closingSoon = ranked.filter(({ candidate }) => {
        const d = candidate.facts.deadline;
        return d.quality === "exact" && d.daysLeft !== null && d.daysLeft >= 0 && d.daysLeft <= 7;
      }).length;
      items.push({
        slot: items.length,
        sendAt: "00:00",
        kind: "weekly_summary",
        rung: null,
        scholarshipId: null,
        templateKey: `weekly_v${variant + 1}`,
        topic: "weekly:summary",
        pollType: null,
        payload: {
          variant,
          published: input.weekly?.published ?? null,
          newThisWeek: input.weekly?.newThisWeek ?? null,
          closingSoon,
        },
        reason: "dushanba yakuni",
      });
      usedKinds.add("weekly_summary");
    } else if (story) {
      const variant = Math.floor(rng() * 2);
      items.push({
        slot: items.length,
        sendAt: "00:00",
        kind: "story",
        rung: null,
        scholarshipId: null,
        templateKey: `story_v${variant + 1}`,
        topic: "story:approved",
        pollType: null,
        payload: { storyId: story.id, variant },
        reason: "tasdiqlangan hikoya",
      });
      usedKinds.add("story");
    } else if (input.discussionEnabled && !qaRecent && QA_BANK.length > 0) {
      const entry = nextBankEntry(QA_BANK, history, planDate, COOLDOWN.qa);
      if (entry) {
        items.push({
          slot: items.length,
          sendAt: "00:00",
          kind: "qa",
          rung: null,
          scholarshipId: null,
          templateKey: entry.key,
          topic: "qa:faq",
          pollType: null,
          payload: { question: entry.question },
          reason: "muhokama yoqilgan, savol-javob navbati",
        });
        usedKinds.add("qa");
      }
    }
  }

  // ---- evergreen filler ---------------------------------------------------
  if (items.length < targetCount) {
    // Whichever evergreen kind has gone longest without an outing wins, so tips
    // and checklists alternate instead of the tip bank absorbing every gap.
    const lastUseOf = (kind: PlanKind): string => {
      let latest = "";
      for (const row of history) if (row.kind === kind && row.planDate > latest) latest = row.planDate;
      return latest;
    };
    const fillers: { kind: "tip" | "checklist"; entry: { key: string }; last: string }[] = [];
    const tip = nextBankEntry(TIP_BANK, history, planDate, COOLDOWN.tip);
    if (tip) fillers.push({ kind: "tip", entry: tip, last: lastUseOf("tip") });
    const checklist = nextBankEntry(CHECKLIST_BANK, history, planDate, COOLDOWN.checklist);
    if (checklist) fillers.push({ kind: "checklist", entry: checklist, last: lastUseOf("checklist") });
    fillers.sort((a, b) => (a.last === b.last ? (a.kind === "tip" ? -1 : 1) : a.last < b.last ? -1 : 1));
    const chosen = fillers.find((f) => !usedKinds.has(f.kind)) ?? fillers[0];
    if (chosen) {
      items.push({
        slot: items.length,
        sendAt: "00:00",
        kind: chosen.kind,
        rung: null,
        scholarshipId: null,
        templateKey: chosen.entry.key,
        topic: chosen.kind === "tip" ? "evergreen:tip" : "evergreen:checklist",
        pollType: null,
        payload: {},
        reason: "navbatdagi foydali post",
      });
      usedKinds.add(chosen.kind);
    }
  }

  // ---- polls: their own message, at most one a day ------------------------
  const pollRecent = recentlyUsed(history, planDate, COOLDOWN.poll, (row) => row.kind === "poll");
  if (!pollRecent) {
    const pollHistory = history
      .filter((row) => row.kind === "poll" && row.pollKey && row.pollType)
      .map((row) => ({ key: row.pollKey as string, type: row.pollType as PollType, planDate: row.planDate }));
    const poll = choosePoll(pollHistory, planDate);
    if (poll) {
      if (items.length >= maxPerDay && items.length > 0) items.pop();
      items.push({
        slot: items.length,
        sendAt: "00:00",
        kind: "poll",
        rung: null,
        scholarshipId: null,
        templateKey: `poll_${poll.type}`,
        topic: poll.topic,
        pollType: poll.type,
        payload: { pollKey: poll.key, question: poll.question, options: poll.options.length },
        reason: `so'rovnoma navbati (${poll.type})`,
      });
    }
  }

  // ---- send times: disjoint windows, strictly increasing -----------------
  // One message lands in the morning window; when the day has more, the rest
  // share the evening window in equal slices, so two posts can never collide
  // and nothing drifts past 21:00.
  const ordered = items.sort((a, b) => a.slot - b.slot);
  const windows = timeWindows(ordered.length);
  let previous = -1;
  return ordered.map((item, index) => {
    const window = windows[index] ?? EVENING;
    let minutes = window.start + Math.floor((rng() * window.span) / 5) * 5;
    if (minutes <= previous) minutes = previous + 15;
    const ceiling = window.start + window.span;
    if (minutes > ceiling) minutes = ceiling;
    if (minutes <= previous) minutes = previous + 1;
    previous = minutes;
    return { ...item, slot: index, sendAt: hhmm(minutes) };
  });
}

/** The time windows for a day with `count` messages. */
export function timeWindows(count: number): { start: number; span: number }[] {
  if (count <= 0) return [];
  if (count === 1) return [EVENING];
  const slices = count - 1;
  const slice = Math.floor(EVENING.span / slices);
  const windows = [MORNING];
  for (let i = 0; i < slices; i++) {
    windows.push({ start: EVENING.start + i * slice, span: slice });
  }
  return windows;
}
