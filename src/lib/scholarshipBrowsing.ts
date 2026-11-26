import type { Locale } from "@/i18n/config";
import { calendarDate } from "./examRecords";
import { todayYmd, ymdOf } from "./catalogueOrder";
import { computeScholarshipStatus, type ScholarshipApplicationStatus, type ScholarshipLike } from "./scholarshipStatus";
import { safeAcademicLink } from "./universityCardSummary";

export const SCHOLARSHIP_ACTIONABLE_STATUSES = ["open", "rolling"] as const;

export function scholarshipAcceptsApplications(status: string | null | undefined): boolean {
  return status === "open" || status === "rolling";
}

const STATUS_PRIORITY: Record<ScholarshipApplicationStatus, number> = {
  open: 0, rolling: 1, upcoming: 2, not_announced: 3, unknown: 3, closed: 4,
};

type Window = Pick<ScholarshipLike, "openingDate" | "deadlineDate" | "deadlineRangeStart" | "deadlineRangeEnd" | "rounds" | "deadlineType">;

function dateValue(value: Date | string | null | undefined): string | null {
  const date = ymdOf(value);
  return calendarDate(date) ? date : null;
}

export function formatScholarshipDate(day: string | null | undefined, locale: Locale): string | null {
  if (!calendarDate(day)) return null;
  if (locale === "uz") return day.split("-").reverse().join(".");
  return new Intl.DateTimeFormat(locale, { dateStyle: "medium", timeZone: "UTC" }).format(new Date(day + "T12:00:00Z"));
}

function roundDates(raw: string | null): string[] {
  if (!raw || raw === "[]") return [];
  try {
    const rounds: unknown = JSON.parse(raw);
    if (!Array.isArray(rounds)) return [];
    return rounds.flatMap((round) => {
      const date = typeof round?.deadline === "string" ? dateValue(round.deadline) : null;
      return date ? [date] : [];
    }).sort();
  } catch {
    return [];
  }
}

export function scholarshipWindow(row: Window, status: ScholarshipApplicationStatus, today: string) {
  const opensOn = dateValue(row.openingDate) ?? (status === "upcoming" ? dateValue(row.deadlineRangeStart) : null);
  if (status === "rolling" || status === "not_announced" || row.deadlineType === "not_announced") {
    return { opensOn, closesOn: null };
  }
  const directDate = dateValue(row.deadlineDate) ?? dateValue(row.deadlineRangeEnd);
  if (directDate) return { opensOn, closesOn: directDate };
  const dates = roundDates(row.rounds);
  return { opensOn, closesOn: (status === "closed" ? dates.at(-1) : dates.find((date) => date >= today)) ?? null };
}

type DeadlineOrder = {
  id: number;
  computedStatus: ScholarshipApplicationStatus;
  closesOn: string | null;
  opensOn?: string | null;
};

export function compareScholarshipStatus(a: DeadlineOrder, b: DeadlineOrder): number {
  return STATUS_PRIORITY[a.computedStatus] - STATUS_PRIORITY[b.computedStatus];
}

function compareDates(left: string | null | undefined, right: string | null | undefined, latestFirst = false): number {
  if (!left) return right ? 1 : 0;
  if (!right) return -1;
  return latestFirst ? right.localeCompare(left) : left.localeCompare(right);
}

export function compareScholarshipDeadlines(a: DeadlineOrder, b: DeadlineOrder): number {
  return compareScholarshipStatus(a, b) ||
    (a.computedStatus === "upcoming" && b.computedStatus === "upcoming" ? compareDates(a.opensOn, b.opensOn) : 0) ||
    compareDates(a.closesOn, b.closesOn, a.computedStatus === "closed" && b.computedStatus === "closed") ||
    a.id - b.id;
}

export function scholarshipBrowsingWindow(row: ScholarshipLike, now = new Date()) {
  const computedStatus = computeScholarshipStatus(row, now);
  return { computedStatus, ...scholarshipWindow(row, computedStatus, todayYmd(now)) };
}

export function scholarshipOfficialAction(row: {
  applicationUrl?: string | null;
  sourceUrl?: string | null;
  websiteUrl?: string | null;
  computedStatus?: string | null;
  verificationStatus?: string | null;
}): { href: string; kind: "apply" | "source" } | null {
  if (row.verificationStatus && row.verificationStatus !== "verified") return null;
  const application = safeAcademicLink(row.applicationUrl);
  if (application && scholarshipAcceptsApplications(row.computedStatus)) return { href: application, kind: "apply" };
  const source = safeAcademicLink(row.sourceUrl) ?? safeAcademicLink(row.websiteUrl);
  return source ? { href: source, kind: "source" } : null;
}

/** Yearly plans need a published yearly amount. A monthly or total award stays unconverted. */
export function publishedYearlyScholarshipUsd(row: { awardPeriod?: string | null; amountUsdValue?: number | null }): number | null {
  const yearly = ["year", "academic year", "annual"].includes(row.awardPeriod?.trim().toLowerCase() ?? "");
  return yearly && row.amountUsdValue != null && Number.isFinite(row.amountUsdValue) && row.amountUsdValue > 0 ? row.amountUsdValue : null;
}
