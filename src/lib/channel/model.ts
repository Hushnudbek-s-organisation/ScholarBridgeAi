/**
 * What may be published, and how sure we are about the deadline.
 *
 * Everything here is pure and takes `now` explicitly, so the daily plan is
 * reproducible and the "60 days since verification" / "3 days left" rules can
 * be tested across month, year and leap boundaries instead of at 3 a.m. luck.
 *
 * The rules exist to make one failure impossible: a channel post that states
 * something our database does not support. A field we do not have is dropped
 * from the text — never guessed, never taken from free-text English columns.
 */
import { calendarDaysUntil, localDay, reminderBucket } from "@/lib/telegram/reminders";

/** The channel runs on Uzbek time, independent of REMINDER_TIMEZONE. */
export const CHANNEL_TZ = "Asia/Tashkent";

/** A verified row older than this is not publishable (re-verify first). */
export const VERIFICATION_MAX_AGE_DAYS = 60;

/** Urgency rungs, widest first. The bucket is the smallest rung ≥ days left. */
export const URGENCY_RUNGS = [30, 14, 7, 3, 1, 0] as const;

export type DeadlineQuality = "exact" | "estimated" | "evergreen" | "unknown";
export type Eligibility = "open" | "uz_eligible" | "not_eligible";

/** The subset of `scholarships` this module reads. */
export interface ScholarshipLike {
  id: number;
  title: string;
  provider: string;
  country: string | null;
  isActive: boolean;
  verificationStatus: string;
  lastVerifiedAt: Date | string | null;
  deadlineDate: string | null;
  deadlineType: string | null;
  deadlineRangeEnd: string | null;
  rounds: string | null;
  recurrence: string | null;
  eligibleCountries: string | null;
  awardBasis: string | null;
  coverageType: string | null;
}

export interface DeadlineInfo {
  quality: DeadlineQuality;
  /** YYYY-MM-DD when a real date backs the claim. */
  date: string | null;
  /** Whole calendar days left in Asia/Tashkent; null when there is no date. */
  daysLeft: number | null;
}

function dayOf(value: Date | string | null | undefined): string | null {
  if (!value) return null;
  if (value instanceof Date) return Number.isNaN(value.getTime()) ? null : localDay(value, CHANNEL_TZ);
  const v = String(value).slice(0, 10);
  return /^\d{4}-\d{2}-\d{2}$/.test(v) ? v : null;
}

/** Calendar days since a timestamp (0 = today, 1 = yesterday), or null. */
export function ageInDays(value: Date | string | null | undefined, now: Date): number | null {
  const day = dayOf(value);
  if (!day) return null;
  return -1 * (calendarDaysUntil(day, now, CHANNEL_TZ) ?? 0);
}

/** Latest usable deadline from the `rounds` JSON (future rounds only). */
function latestRoundDeadline(raw: string | null, now: Date): { date: string; daysLeft: number } | null {
  if (!raw || raw === "[]") return null;
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return null;
  }
  if (!Array.isArray(parsed)) return null;
  let best: { date: string; daysLeft: number } | null = null;
  for (const entry of parsed) {
    if (!entry || typeof entry !== "object") continue;
    const date = dayOf((entry as { deadline?: string }).deadline ?? null);
    if (!date) continue;
    const daysLeft = calendarDaysUntil(date, now, CHANNEL_TZ);
    if (daysLeft === null || daysLeft < 0) continue;
    if (!best || daysLeft < best.daysLeft) best = { date, daysLeft };
  }
  return best;
}

/**
 * exact   — one date we can count to (deadline, or a round inside `rounds`)
 * estimated — a window / "not announced yet" / recurring: never used for urgency
 * evergreen — rolling admissions: no countdown at all
 * unknown — no usable date, or the date has passed: not publishable
 */
export function deadlineInfo(s: ScholarshipLike, now: Date): DeadlineInfo {
  if (s.deadlineType === "rolling") return { quality: "evergreen", date: null, daysLeft: null };

  const deadlineDay = dayOf(s.deadlineDate);
  if (deadlineDay) {
    const daysLeft = calendarDaysUntil(deadlineDay, now, CHANNEL_TZ);
    if (daysLeft !== null && daysLeft >= 0) {
      return { quality: "exact", date: deadlineDay, daysLeft };
    }
    // A passed exact date that also has future rounds is still usable.
    const round = s.deadlineType === "multiple_rounds" ? latestRoundDeadline(s.rounds, now) : null;
    return round ? { quality: "exact", ...round } : { quality: "unknown", date: null, daysLeft: null };
  }

  const round = s.deadlineType === "multiple_rounds" ? latestRoundDeadline(s.rounds, now) : null;
  if (round) return { quality: "exact", ...round };

  const rangeEnd = dayOf(s.deadlineRangeEnd);
  if (rangeEnd) {
    const daysLeft = calendarDaysUntil(rangeEnd, now, CHANNEL_TZ);
    if (daysLeft !== null && daysLeft >= 0) return { quality: "estimated", date: rangeEnd, daysLeft };
  }

  if (s.deadlineType === "not_announced" || s.deadlineType === "recurring" || s.recurrence === "annual") {
    // Deliberately no date: `expected_deadline_period` is free English text in
    // production data and must never be printed inside an Uzbek post.
    return { quality: "estimated", date: null, daysLeft: null };
  }

  return { quality: "unknown", date: null, daysLeft: null };
}

/** Which urgency rung (if any) today's post belongs to. Exact dates only. */
export function urgencyRung(info: DeadlineInfo): number | null {
  if (info.quality !== "exact" || info.daysLeft === null) return null;
  return reminderBucket(info.daysLeft, URGENCY_RUNGS);
}

function parseList(raw: string | null | undefined): string[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.map((v) => String(v)).filter((v) => v.trim() !== "") : [];
  } catch {
    return [];
  }
}

const UZ_ALIASES = /^(uzbekistan|o'zbekiston|ozbekiston|o‘zbekiston|узбекистан)$/i;

/**
 * `eligible_countries` is a JSON list; an empty list means "not specified",
 * which is the common case and is genuinely open to everyone. Only a list that
 * names Uzbekistan lets a post say so.
 */
export function eligibility(s: Pick<ScholarshipLike, "eligibleCountries">): Eligibility {
  const list = parseList(s.eligibleCountries);
  if (list.length === 0) return "open";
  return list.some((v) => UZ_ALIASES.test(v.trim())) ? "uz_eligible" : "not_eligible";
}

/** Coverage labels that actually mean "everything is covered". */
export const FULL_COVERAGE_LABELS = ["full funding", "full tuition", "full tuition + stipend"] as const;

/**
 * Fully funded — only from an explicit provider statement we store:
 * `award_basis = full_tuition`, or a coverage label in FULL_COVERAGE_LABELS.
 * Any other award basis (need based / partial / range) disqualifies the row, so
 * a full-tuition label can never outvote an explicit partial basis.
 */
export function isFullyFunded(s: Pick<ScholarshipLike, "verificationStatus" | "awardBasis" | "coverageType">): boolean {
  if (s.verificationStatus !== "verified") return false;
  const basis = (s.awardBasis ?? "").trim().toLowerCase();
  if (basis === "full_tuition") return true;
  if (basis !== "" && basis !== "unspecified") return false;
  const coverage = (s.coverageType ?? "").trim().toLowerCase().replace(/\s+/g, " ");
  return (FULL_COVERAGE_LABELS as readonly string[]).includes(coverage);
}

export interface PublishCheck {
  ok: boolean;
  reason: string | null;
}

/**
 * The single gate every kind goes through. Anything that fails here produces
 * no post at all — silence is the correct output for unsupported data.
 */
export function publishable(s: ScholarshipLike, now: Date): PublishCheck {
  if (!s.isActive) return { ok: false, reason: "inactive" };
  if (s.verificationStatus !== "verified") return { ok: false, reason: "unverified" };
  const age = ageInDays(s.lastVerifiedAt, now);
  if (age === null) return { ok: false, reason: "never_verified" };
  if (age > VERIFICATION_MAX_AGE_DAYS) return { ok: false, reason: "verification_stale" };
  if (age < 0) return { ok: false, reason: "verified_in_the_future" };
  if (!s.title.trim() || !s.provider.trim()) return { ok: false, reason: "incomplete" };
  if (eligibility(s) === "not_eligible") return { ok: false, reason: "not_open_to_uzbekistan" };
  const info = deadlineInfo(s, now);
  if (info.quality === "unknown") return { ok: false, reason: "no_reliable_deadline" };
  return { ok: true, reason: null };
}
