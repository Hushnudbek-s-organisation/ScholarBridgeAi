/**
 * The daily plan — one pure function, same inputs → same plan.
 *
 * Lanes. Every message belongs to exactly one lane, and candidates only ever
 * compete inside their own lane:
 *   urgent     — exact deadlines ≤ 3 days (the urgency ladder)
 *   weekly     — the Sunday "next 7 days" post
 *   editorial  — single / fully funded / digest / spotlight
 *   evergreen  — tip / checklist / Q&A / approved story
 *   engagement — polls
 * That is what makes the rich-content bonus safe: it reorders the editorial
 * lane and can never push an evergreen tip ahead of a deadline.
 *
 * Rules (all deterministic, all tested):
 *  - one quiet day a week when enabled (weekday = ISO week % 7, so it rotates);
 *  - at most `settings.plan.dailyCap` messages (hard maximum 3), scheduled inside
 *    the configured morning/evening windows with seeded jitter;
 *  - Sunday's weekly post is planned first, inside the morning window;
 *  - a scholarship is not repeated inside its cooldown, banks rotate, polls keep
 *    their cadence;
 *  - nothing is invented: the weekly list only contains exact deadlines inside
 *    the window, and every item carries a stable dedupe key.
 */
import {
  choosePoll,
  countryPriority,
  daysBetween,
  editorialRank,
  isoWeekNumber,
  nextBankEntry,
  rankCandidates,
  seeded,
  validPlanDate,
  weekdayOf,
  type Candidate,
} from "./select";
import { urgencyRung } from "./model";
import { DEFAULT_CHANNEL_SETTINGS, type ChannelSettings } from "./settings";
import type { PollType } from "./templates/polls.uz";
import { CHECKLIST_BANK, QA_BANK, TIP_BANK, type StoryEntry } from "./templates/templates.uz";

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
  poll: 2,
} as const;

/** Urgency posts only exist for these rungs (3 days or less). */
export const URGENT_RUNG_MAX = 3;

/** The weekly list window: today … today + 7 (Tashkent days). */
export const WEEKLY_WINDOW_DAYS = 7;
/** The Thursday digest window. */
export const DIGEST_WINDOW_DAYS = 14;
/** Hard ceiling on the weekly list length in one post. */
export const WEEKLY_MAX_ITEMS = 12;

export type PlanLane = "urgent" | "weekly" | "editorial" | "evergreen" | "engagement";
export type PlanKind = import("./templates/chrome").Kind | "poll";

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
  /** Falls back to the shipped defaults. */
  settings?: ChannelSettings;
}

export interface PlannedItem {
  slot: number;
  /** "HH:MM" Asia/Tashkent — the earliest the sender may post this item. */
  sendAt: string;
  kind: PlanKind;
  lane: PlanLane;
  /** Why the planner chose this item ("urgency", "rotation", "weekly", …). */
  origin: string;
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

export function minutesOf(time: string): number | null {
  const m = /^([01]\d|2[0-3]):([0-5]\d)$/.exec(time.trim());
  return m ? Number(m[1]) * 60 + Number(m[2]) : null;
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
export function planDedupeKey(
  item: Pick<PlannedItem, "kind" | "scholarshipId" | "rung">,
  planDate: string,
  slot: number
): string {
  return [item.kind, item.scholarshipId ?? "-", item.rung ?? "-", planDate, slot].join("|");
}

function recentlyUsed(
  history: readonly PlanHistoryRow[],
  planDate: string,
  days: number,
  predicate: (row: PlanHistoryRow) => boolean
): boolean {
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

/**
 * Send windows for a day with `count` messages: one in the morning, the rest
 * share the evening window in equal, disjoint slices.
 */
export function timeWindows(
  count: number,
  settings: ChannelSettings = DEFAULT_CHANNEL_SETTINGS
): { start: number; span: number }[] {
  if (count <= 0) return [];
  const morningStart = minutesOf(settings.plan.morningWindow.start) ?? 9 * 60;
  const morningEnd = minutesOf(settings.plan.morningWindow.end) ?? 11 * 60;
  const eveningStart = minutesOf(settings.plan.eveningWindow.start) ?? 18 * 60 + 30;
  const eveningEnd = minutesOf(settings.plan.eveningWindow.end) ?? 21 * 60;
  const morning = { start: morningStart, span: Math.max(5, morningEnd - morningStart) };
  const eveningSpan = Math.max(5, eveningEnd - eveningStart);
  if (count === 1) return [{ start: eveningStart, span: eveningSpan }];
  const slices = count - 1;
  const slice = Math.floor(eveningSpan / slices);
  const windows = [morning];
  for (let i = 0; i < slices; i++) windows.push({ start: eveningStart + i * slice, span: slice });
  return windows;
}

/** The items the Sunday list may contain: exact deadline inside the window. */
export function weeklyCandidates(candidates: readonly Candidate[], windowDays = WEEKLY_WINDOW_DAYS): Candidate[] {
  return candidates
    .filter(({ facts }) => {
      const d = facts.deadline;
      return d.quality === "exact" && d.date !== null && d.daysLeft !== null && d.daysLeft >= 0 && d.daysLeft <= windowDays;
    })
    .sort((a, b) => {
      const byDeadline = (a.facts.deadline.daysLeft ?? 0) - (b.facts.deadline.daysLeft ?? 0);
      if (byDeadline !== 0) return byDeadline;
      const byCountry = (a.facts.country ?? "").localeCompare(b.facts.country ?? "");
      if (byCountry !== 0) return byCountry;
      return a.facts.id - b.facts.id;
    })
    .slice(0, WEEKLY_MAX_ITEMS);
}

export function buildDailyPlan(input: PlanInput): PlannedItem[] {
  const planDate = input.planDate;
  if (!validPlanDate(planDate)) return [];
  const settings = input.settings ?? DEFAULT_CHANNEL_SETTINGS;
  if (settings.plan.quietDayEnabled && isQuietDay(planDate)) return [];

  const history = input.history ?? [];
  const prefs = input.prefs ?? {};
  const dailyCap = Math.min(MAX_POSTS_PER_DAY, Math.max(1, settings.plan.dailyCap));
  const minCount = Math.min(dailyCap, Math.max(1, settings.plan.budgetMin));
  const maxCount = Math.min(dailyCap, Math.max(minCount, settings.plan.budgetMax));
  const rng = seeded(`plan|${planDate}`);

  const items: PlannedItem[] = [];
  const usedScholarshipIds = new Set<number>();
  const usedKinds = new Set<PlanKind>();

  const targetCount = (() => {
    const span = maxCount - minCount + 1;
    const pick = Math.floor(rng() * span);
    return Math.min(dailyCap, minCount + pick);
  })();

  const ranked = rankCandidates(input.candidates, prefs, `rank|${planDate}`);
  /**
   * The editorial lane's own order: nearest deadline first, then the countries
   * this audience applies to. `ranked` stays for the digest list, whose members
   * are shown as a table and are sorted by date anyway.
   */
  const editorial = editorialRank(input.candidates, {
    prefs,
    priorities: settings.plan.priorityCountries,
    seed: `editorial|${planDate}`,
  });

  // ---- lane: weekly (Sunday, first slot, morning window) -------------------
  const isSunday = weekdayOf(planDate) === 6;
  if (isSunday) {
    // Previously announced programmes stay in: this post is a reminder list.
    const list = weeklyCandidates(input.candidates).slice(0, WEEKLY_MAX_ITEMS);
    if (list.length >= settings.plan.weeklyMinItems) {
      const variant = Math.floor(rng() * 3);
      items.push({
        slot: 0,
        sendAt: "09:00",
        kind: "weekly_deadlines",
        lane: "weekly",
        origin: "weekly",
        rung: null,
        scholarshipId: null,
        templateKey: `weekly_v${variant + 1}`,
        topic: "weekly:deadlines",
        pollType: null,
        payload: { scholarshipIds: list.map((c) => c.facts.id), variant, pin: settings.plan.weeklyPin },
        reason: `${list.length} ta dastur shu hafta yopiladi`,
      });
      usedKinds.add("weekly_deadlines");
      for (const c of list) usedScholarshipIds.add(c.facts.id);
    }
  }

  // ---- lane: urgent -------------------------------------------------------
  if (items.length < targetCount) {
    const urgent = ranked
      .filter(({ candidate }) => {
        const d = candidate.facts.deadline;
        if (d.quality !== "exact" || d.daysLeft === null || d.daysLeft < 0) return false;
        if (d.daysLeft > URGENT_RUNG_MAX) return false;
        if (usedScholarshipIds.has(candidate.facts.id)) return false;
        return !lastScholarshipUse(history, planDate, candidate.facts.id, 7);
      })
      /**
       * Nearest first — and when several close on the same day, the country the
       * audience actually applies to gets the urgency treatment (the post with
       * the biggest visual weight). Without the second key the tie fell back to
       * the topic score, so a same-day favourite could lose to an unrelated
       * country purely on rotation history.
       */
      .sort(
        (a, b) =>
          (a.candidate.facts.deadline.daysLeft ?? 0) - (b.candidate.facts.deadline.daysLeft ?? 0) ||
          countryPriority(a.candidate.facts.countryRaw ?? a.candidate.facts.country, settings.plan.priorityCountries) -
            countryPriority(b.candidate.facts.countryRaw ?? b.candidate.facts.country, settings.plan.priorityCountries)
      );
    if (urgent.length > 0) {
      const { candidate } = urgent[0];
      const rung = urgencyRung(candidate.facts.deadline) ?? URGENT_RUNG_MAX;
      const variant = Math.floor(rng() * 4);
      items.push({
        slot: items.length,
        sendAt: "00:00",
        kind: "urgency",
        lane: "urgent",
        origin: "urgency",
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
    }
  }

  // ---- lane: editorial ----------------------------------------------------
  if (items.length < targetCount) {
    const single = editorial.find(
      ({ candidate }) =>
        !usedScholarshipIds.has(candidate.facts.id) &&
        !lastScholarshipUse(history, planDate, candidate.facts.id, COOLDOWN.single)
    );
    if (single) {
      const rich = Boolean(single.candidate.rich);
      const variant = Math.floor(rng() * 3);
      items.push({
        slot: items.length,
        sendAt: "00:00",
        kind: rich ? "scholarship_rich" : "scholarship_single",
        lane: "editorial",
        origin: "rotation",
        rung: null,
        scholarshipId: single.candidate.facts.id,
        templateKey: rich ? `rich_v${variant + 1}` : `single_v${variant + 1}`,
        topic: single.candidate.topics[0] ?? null,
        pollType: null,
        payload: { variant, rich },
        reason: rich ? "to'liq matnli e'lon" : "mavzu bo'yicha eng yuqori ball",
      });
      usedScholarshipIds.add(single.candidate.facts.id);
      usedKinds.add(items[items.length - 1].kind);
    }
  }

  if (items.length < targetCount) {
    const fullyFunded = editorial.find(
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
          d.daysLeft <= DIGEST_WINDOW_DAYS &&
          !usedScholarshipIds.has(candidate.facts.id) &&
          !lastScholarshipUse(history, planDate, candidate.facts.id, COOLDOWN.digestMember)
        );
      })
      .sort((a, b) => (a.candidate.facts.deadline.daysLeft ?? 0) - (b.candidate.facts.deadline.daysLeft ?? 0))
      .slice(0, WEEKLY_MAX_ITEMS);

    const spotlightGroups = new Map<string, Candidate[]>();
    for (const { candidate } of ranked) {
      const label = candidate.facts.country;
      if (!label) continue;
      if (/^(xalqaro|global)$/i.test(label)) continue;
      if (usedScholarshipIds.has(candidate.facts.id)) continue;
      const list = spotlightGroups.get(label) ?? [];
      list.push(candidate);
      spotlightGroups.set(label, list);
    }
    const spotlight = [...spotlightGroups.entries()]
      .filter(([, list]) => list.length >= 2)
      .filter(([label]) =>
        !recentlyUsed(history, planDate, COOLDOWN.spotlightGroup, (row) => row.kind === "country_spotlight" && row.topic === `country:${label}`)
      )
      // A country the audience actually targets wins over a bigger pile
      // elsewhere — a spotlight nobody can use is just noise.
      .sort(
        (a, b) =>
          countryPriority(a[0], settings.plan.priorityCountries) - countryPriority(b[0], settings.plan.priorityCountries) ||
          b[1].length - a[1].length ||
          a[0].localeCompare(b[0])
      )[0];

    if (fullyFunded) {
      const variant = Math.floor(rng() * 3);
      items.push({
        slot: items.length,
        sendAt: "00:00",
        kind: "fully_funded",
        lane: "editorial",
        origin: "rotation",
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
    } else if (settings.plan.digestEnabled && digestPool.length >= 2) {
      const variant = Math.floor(rng() * 3);
      items.push({
        slot: items.length,
        sendAt: "00:00",
        kind: "deadline_digest",
        lane: "editorial",
        origin: "rotation",
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
        lane: "editorial",
        origin: "rotation",
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

  // ---- lane: evergreen ----------------------------------------------------
  if (items.length < targetCount) {
    const qaRecent = recentlyUsed(history, planDate, COOLDOWN.qa, (row) => row.kind === "qa");
    const story = (input.stories ?? []).find(
      (s) => !recentlyUsed(history, planDate, COOLDOWN.story, (row) => row.kind === "story" && row.storyId === s.id)
    );
    if (story) {
      const variant = Math.floor(rng() * 2);
      items.push({
        slot: items.length,
        sendAt: "00:00",
        kind: "story",
        lane: "evergreen",
        origin: "rotation",
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
          lane: "evergreen",
          origin: "rotation",
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

  if (items.length < targetCount) {
    const lastUseOf = (kind: PlanKind): string => {
      let latest = "";
      for (const row of history) if (row.kind === kind && row.planDate > latest) latest = row.planDate;
      return latest;
    };
    // Whichever evergreen kind has gone longest without an outing wins.
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
        lane: "evergreen",
        origin: "rotation",
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

  // ---- lane: engagement (polls) -------------------------------------------
  const cadence = Math.max(COOLDOWN.poll, settings.pollCadenceDays);
  const pollRecent = recentlyUsed(history, planDate, cadence, (row) => row.kind === "poll");
  if (!pollRecent) {
    const pollHistory = history
      .filter((row) => row.kind === "poll" && row.pollKey && row.pollType)
      .map((row) => ({ key: row.pollKey as string, type: row.pollType as PollType, planDate: row.planDate }));
    const poll = choosePoll(pollHistory, planDate);
    if (poll) {
      if (items.length >= dailyCap && items.length > 0) {
        // The poll takes the last slot; never the weekly post or an urgency.
        const removable = [...items].reverse().findIndex((item) => item.lane === "editorial" || item.lane === "evergreen");
        if (removable >= 0) items.splice(items.length - 1 - removable, 1);
        else return finalize(items, rng, settings);
      }
      items.push({
        slot: items.length,
        sendAt: "00:00",
        kind: "poll",
        lane: "engagement",
        origin: "poll",
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

  return finalize(items, rng, settings);
}

/** Assign send times inside the settings-driven windows. */
function finalize(items: PlannedItem[], rng: () => number, settings: ChannelSettings): PlannedItem[] {
  const ordered = items.sort((a, b) => a.slot - b.slot).slice(0, Math.min(MAX_POSTS_PER_DAY, settings.plan.dailyCap));
  const windows = timeWindows(ordered.length, settings);
  let previous = -1;
  return ordered.map((item, index) => {
    const window = windows[index] ?? windows[windows.length - 1] ?? { start: 9 * 60, span: 60 };
    // The Sunday weekly post is pinned to the morning window on purpose.
    const pinnedWeekly = item.kind === "weekly_deadlines" && index === 0;
    let minutes = pinnedWeekly
      ? window.start + Math.floor((rng() * window.span) / 5) * 5
      : window.start + Math.floor((rng() * window.span) / 5) * 5;
    if (minutes <= previous) minutes = previous + 15;
    const ceiling = window.start + window.span;
    if (minutes > ceiling) minutes = ceiling;
    if (minutes <= previous) minutes = previous + 1;
    previous = minutes;
    return { ...item, slot: index, sendAt: hhmm(minutes) };
  });
}
