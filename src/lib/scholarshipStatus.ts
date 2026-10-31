import type { scholarships } from "@/db/schema";
import type { Locale } from "@/i18n/config";
import { daysBetweenYmd, todayYmd, ymdOf } from "@/lib/catalogueOrder";

/** Runtime display labels — the database keeps the canonical English values;
 *  these strings only localize the outgoing UI text. */
const STATUS_LABEL_TABLES: Record<
  Locale,
  { open: string; closed: string; upcoming: string; rolling: string; notAnnounced: string; unknown: string }
> = {
  en: {
    open: "OPEN",
    closed: "CLOSED",
    upcoming: "UPCOMING",
    rolling: "ROLLING",
    notAnnounced: "DATE NOT ANNOUNCED",
    unknown: "UNKNOWN",
  },
  uz: {
    open: "OCHIQ",
    closed: "YOPILGAN",
    upcoming: "TEZ ORADA",
    rolling: "DOIMIY QABUL",
    notAnnounced: "SANA E'LON QILINMAGAN",
    unknown: "NOMA'LUM",
  },
  ru: {
    open: "ОТКРЫТА",
    closed: "ЗАКРЫТА",
    upcoming: "СКОРО",
    rolling: "ПРИЁМ КРУГЛЫЙ ГОД",
    notAnnounced: "ДАТА НЕ ОБЪЯВЛЕНА",
    unknown: "НЕИЗВЕСТНО",
  },
};

const EXPECTED_PREFIX: Record<Locale, { withDeadline: string; opensAround: string }> = {
  en: {
    withDeadline: "Expected based on previous cycles: ",
    opensAround: "Expected based on previous cycles: opens around ",
  },
  uz: {
    withDeadline: "Oldingi yillar asosida kutilayotgan muddat: ",
    opensAround: "Oldingi yillar asosida kutilayotgan muddat: taxminan ",
  },
  ru: {
    withDeadline: "Ожидается на основе прошлых циклов: ",
    opensAround: "Ожидается на основе прошлых циклов: открытие около ",
  },
};

export type ScholarshipApplicationStatus =
  | "open"
  | "closed"
  | "upcoming"
  | "rolling"
  | "not_announced"
  | "unknown";

export type DeadlineType =
  | "exact"
  | "range"
  | "rolling"
  | "multiple_rounds"
  | "not_announced"
  | "recurring"
  | "unknown";

interface ScholarshipLike {
  openingDate: string | Date | null;
  deadlineDate: string | Date | null;
  deadlineType: string | null;
  deadlineRangeStart: string | Date | null;
  deadlineRangeEnd: string | Date | null;
  rounds: string | null;
  recurrence: string | null;
  expectedOpeningPeriod: string | null;
  expectedDeadlinePeriod: string | null;
  isActive: boolean | null;
}

/**
 * Days from `today` to a stored date — NEGATIVE when the date is in the past.
 *
 * Every comparison below is a *whole-day* comparison, not a timestamp one. A
 * `date` column arrives as midnight UTC, so the obvious `now <= deadline`
 * reported an award closed at 00:00:01 on the very day it could still be
 * applied to — and `runRefresh()` writes this verdict back into
 * `application_status`, so a nightly refresh on the deadline day closed the
 * award in the database too. The day itself belongs to the applicant.
 */
function daysUntil(today: string, v: string | Date | null | undefined): number | null {
  return daysBetweenYmd(today, ymdOf(v));
}

/**
 * Compute the current application status from dates (spec §6).
 * Pure function — the UI and API both use it, so status is always consistent.
 */
export function computeScholarshipStatus(
  s: ScholarshipLike,
  now: Date = new Date()
): ScholarshipApplicationStatus {
  // One clock per call, in UTC days — the same unit `daysUntil` and the
  // dashboard's countdown use.
  const today = todayYmd(now);
  const openingIn = daysUntil(today, s.openingDate);
  const deadlineIn = daysUntil(today, s.deadlineDate);
  const rangeStartIn = daysUntil(today, s.deadlineRangeStart);
  const rangeEndIn = daysUntil(today, s.deadlineRangeEnd);

  if (s.deadlineType === "rolling") return "rolling";
  if (s.deadlineType === "not_announced") return "not_announced";

  // Exact deadline known. The deadline day itself is still open.
  if (deadlineIn != null) {
    if (openingIn != null && openingIn > 0) return "upcoming";
    if (deadlineIn >= 0) return "open";
    return "closed";
  }

  // Deadline range — the last day of the range is still open.
  if (rangeStartIn != null && rangeEndIn != null) {
    if (openingIn != null && openingIn > 0) return "upcoming";
    if (rangeStartIn <= 0 && rangeEndIn >= 0) return "open";
    if (rangeEndIn < 0) return "closed";
    if (rangeStartIn > 0) return "upcoming";
  }

  // Multiple rounds: check the latest round deadline.
  if (s.rounds && s.rounds !== "[]") {
    try {
      const rounds = JSON.parse(s.rounds) as { deadline?: string }[];
      const remaining = rounds
        .map((r) => daysUntil(today, r.deadline))
        .filter((d): d is number => d !== null)
        .sort((a, b) => a - b);
      if (remaining.length > 0) {
        // The LATEST round decides: any round still ahead keeps it open, and
        // the last round's own day counts.
        if (remaining[remaining.length - 1] >= 0) return "open";
        return "closed";
      }
    } catch {
      // ignore malformed rounds
    }
  }

  // Recurring with expected period only.
  if (s.recurrence === "annual" && (s.expectedOpeningPeriod || s.expectedDeadlinePeriod)) {
    return "not_announced";
  }

  return "unknown";
}

/** Human-friendly label + a note that the status was computed, not stored.
 *  Localized at runtime via `locale` (default "en" — unpassed callers such as
 *  the deadlines feed and the autopilot engine keep the exact English words). */
export function statusLabel(status: ScholarshipApplicationStatus, locale: Locale = "en"): string {
  const table = STATUS_LABEL_TABLES[locale];
  switch (status) {
    case "open":
      return table.open;
    case "closed":
      return table.closed;
    case "upcoming":
      return table.upcoming;
    case "rolling":
      return table.rolling;
    case "not_announced":
      return table.notAnnounced;
    default:
      return table.unknown;
  }
}

/** Spec §7: clearly label estimated dates from historical cycles. */
export function expectedPeriodLabel(s: ScholarshipLike, locale: Locale = "en"): string | null {
  if (s.recurrence === "annual" && s.expectedDeadlinePeriod) {
    return `${EXPECTED_PREFIX[locale].withDeadline}${s.expectedDeadlinePeriod}`;
  }
  if (s.recurrence === "annual" && s.expectedOpeningPeriod) {
    return `${EXPECTED_PREFIX[locale].opensAround}${s.expectedOpeningPeriod}`;
  }
  return null;
}

export type ScholarshipWithStatus = typeof scholarships.$inferSelect & {
  computedStatus: ScholarshipApplicationStatus;
  statusLabel: string;
  expectedLabel: string | null;
};

/** Attach computed status fields to a scholarship row. */
export function withStatus(
  s: ScholarshipLike & Record<string, unknown>,
  locale: Locale = "en",
  now: Date = new Date()
): ScholarshipWithStatus {
  const computedStatus = computeScholarshipStatus(s, now);
  return {
    ...s,
    computedStatus,
    statusLabel: statusLabel(computedStatus, locale),
    expectedLabel: expectedPeriodLabel(s, locale),
  } as ScholarshipWithStatus;
}
