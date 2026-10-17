import type { scholarships } from "@/db/schema";
import type { Locale } from "@/i18n/config";

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

function toDate(v: string | Date | null | undefined): Date | null {
  if (!v) return null;
  const d = v instanceof Date ? v : new Date(v);
  return isNaN(d.getTime()) ? null : d;
}

/**
 * Compute the current application status from dates (spec §6).
 * Pure function — the UI and API both use it, so status is always consistent.
 */
export function computeScholarshipStatus(s: ScholarshipLike): ScholarshipApplicationStatus {
  const now = new Date();
  const opening = toDate(s.openingDate);
  const deadline = toDate(s.deadlineDate);
  const rangeStart = toDate(s.deadlineRangeStart);
  const rangeEnd = toDate(s.deadlineRangeEnd);

  if (s.deadlineType === "rolling") return "rolling";
  if (s.deadlineType === "not_announced") return "not_announced";

  // Exact deadline known.
  if (deadline) {
    if (opening && now < opening) return "upcoming";
    if (now <= deadline) return "open";
    return "closed";
  }

  // Deadline range.
  if (rangeStart && rangeEnd) {
    if (opening && now < opening) return "upcoming";
    if (now >= rangeStart && now <= rangeEnd) return "open";
    if (now > rangeEnd) return "closed";
    if (now < rangeStart) return "upcoming";
  }

  // Multiple rounds: check the latest round deadline.
  if (s.rounds && s.rounds !== "[]") {
    try {
      const rounds = JSON.parse(s.rounds) as { deadline?: string }[];
      const deadlines = rounds
        .map((r) => toDate(r.deadline))
        .filter((d): d is Date => d !== null)
        .sort((a, b) => b.getTime() - a.getTime());
      if (deadlines.length > 0) {
        const latest = deadlines[0];
        if (now <= latest) return "open";
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
  locale: Locale = "en"
): ScholarshipWithStatus {
  const computedStatus = computeScholarshipStatus(s);
  return {
    ...s,
    computedStatus,
    statusLabel: statusLabel(computedStatus, locale),
    expectedLabel: expectedPeriodLabel(s, locale),
  } as ScholarshipWithStatus;
}
