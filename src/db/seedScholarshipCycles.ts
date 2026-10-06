/**
 * Keeps the DEMO scholarships' deadline lifecycle coherent.
 *
 * The seed ships fixed published deadlines (e.g. "2025-10-15"). Once that date
 * passes, `computeScholarshipStatus` correctly reports every seeded scholarship
 * as CLOSED — but all eight are annual programmes, so a fresh install would
 * open on a catalogue in which nothing is ever open, and the published year
 * would be presented as if it were the current cycle.
 *
 * This module rolls the DEMO rows forward to the next annual occurrence and
 * relabels them honestly:
 *
 *   deadlineType          = "recurring"      (not a published exact date)
 *   recurrence            = "annual"
 *   deadline/deadlineDate = next occurrence of the published month/day
 *   expectedDeadlinePeriod= the previously published date ("based on previous
 *                           cycles") — shown next to the status badge
 *   verificationStatus    = "unverified"     (nobody confirmed the new cycle)
 *
 * Only the eight seeded titles are touched, and only while their
 * verification_status is still "unverified" — imported/verified records are
 * never rewritten.
 */

import { and, eq, inArray } from "drizzle-orm";
import { db } from "./index";
import { scholarships } from "./schema";
import { computeScholarshipStatus } from "@/lib/scholarshipStatus";

/** The eight titles inserted by `seedDatabase()` — the demo dataset. */
export const SEEDED_SCHOLARSHIP_TITLES = [
  "Fulbright Foreign Student Program",
  "Chevening Scholarship",
  "DAAD Development-Related Postgraduate Courses (EPOS)",
  "Erasmus Mundus Joint Master Degrees (EMJMD)",
  "Knight-Hennessy Scholars Program",
  "Gates Cambridge Scholarship",
  "MEXT Japanese Government Scholarship",
  "Lester B. Pearson International Scholarship",
];

const YMD = /^\d{4}-\d{2}-\d{2}$/;

/**
 * Next occurrence (today or later) of a published month/day.
 * "2025-10-15" seen on 2026-10-05 → "2026-10-15"; seen on 2026-10-20 →
 * "2027-10-15". Invalid input returns null (never guessed).
 */
export function nextAnnualOccurrence(isoYmd: string, from: Date = new Date()): string | null {
  if (!YMD.test(isoYmd)) return null;
  const [y, m, d] = isoYmd.split("-").map(Number);
  const todayUtc = Date.UTC(from.getUTCFullYear(), from.getUTCMonth(), from.getUTCDate());
  let next = Date.UTC(y, m - 1, d);
  // Roll forward a year at a time until it is not in the past.
  while (next < todayUtc) {
    const dt = new Date(next);
    dt.setUTCFullYear(dt.getUTCFullYear() + 1);
    next = dt.getTime();
  }
  return new Date(next).toISOString().slice(0, 10);
}

export interface SeededScholarshipRefreshSummary {
  examined: number;
  rolledForward: number;
}

export async function refreshSeededScholarshipCycles(): Promise<SeededScholarshipRefreshSummary> {
  const summary: SeededScholarshipRefreshSummary = { examined: 0, rolledForward: 0 };

  const rows = await db
    .select()
    .from(scholarships)
    .where(
      and(
        inArray(scholarships.title, SEEDED_SCHOLARSHIP_TITLES),
        eq(scholarships.verificationStatus, "unverified"),
      ),
    );

  const today = new Date();
  const todayUtc = Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate());

  for (const row of rows) {
    summary.examined += 1;
    // The published date we roll forward from: the stored deadline when it is
    // a plain date, otherwise the recorded expected period.
    const published =
      (row.deadline && YMD.test(row.deadline) ? row.deadline : null) ??
      (row.expectedDeadlinePeriod && YMD.test(row.expectedDeadlinePeriod)
        ? row.expectedDeadlinePeriod
        : null);
    if (!published) continue;

    const currentDeadline = row.deadlineDate ? new Date(row.deadlineDate) : null;
    const currentIsFuture =
      currentDeadline != null && !Number.isNaN(currentDeadline.getTime())
        ? Date.UTC(
            currentDeadline.getUTCFullYear(),
            currentDeadline.getUTCMonth(),
            currentDeadline.getUTCDate(),
          ) >= todayUtc
        : false;
    // Already on a future (recurring) cycle — nothing to do.
    if (currentIsFuture) continue;

    const next = nextAnnualOccurrence(published, today);
    if (!next) continue;

    const merged = {
      ...row,
      deadline: next,
      deadlineDate: next,
      deadlineType: "recurring",
      recurrence: "annual",
      expectedDeadlinePeriod: published,
      // No verification happened: the row keeps its honest unverified status
      // and gains no "last verified" timestamp.
      lastVerifiedAt: null,
      verificationStatus: "unverified",
    };

    await db
      .update(scholarships)
      .set({
        deadline: next,
        deadlineDate: next,
        deadlineType: "recurring",
        recurrence: "annual",
        expectedDeadlinePeriod: published,
        applicationStatus: computeScholarshipStatus(merged),
        lastVerifiedAt: null,
        lastUpdatedAt: new Date(),
      })
      .where(eq(scholarships.id, row.id));
    summary.rolledForward += 1;
  }

  return summary;
}
