import { sql } from "drizzle-orm";
import { essayVersions, pointsLedger, schollyEvents, studentProfiles } from "@/db/schema";
import { isSupportedTimeZone } from "@/lib/scholly-profile";

export type SchollyWeeklyTotals = {
  missions: number;
  points: number;
  sopWords: number;
};

export type SchollyWeeklyReportResponse = {
  report: {
    endedOn: string;
    current: SchollyWeeklyTotals;
    previous: SchollyWeeklyTotals;
  } | null;
  nextReportAt: string;
};

export type SchollyWeeklyReportRow = {
  ended_on: string;
  next_report_at: string;
  has_report: boolean;
  missions: string;
  previous_missions: string;
  points: string;
  previous_points: string;
  sop_words: string;
  previous_sop_words: string;
};

export function weeklyReportQuery(profileId: number, timeZone: string, now: Date) {
  const zone = isSupportedTimeZone(timeZone) && !/^[+-]/.test(timeZone) ? timeZone : "Asia/Tashkent";
  // Build each Sunday cutoff in local time, then convert it to an instant.
  // Adding seven days to the instant itself would drift after a DST change.
  return sql`
    WITH local_clock AS (
      SELECT timezone(${zone}, ${now.toISOString()}::timestamptz) AS wall_now
    ), sunday AS (
      SELECT wall_now,
             date_trunc('week', wall_now + interval '1 day') - interval '1 day'
               + interval '18 hours 30 minutes' AS cutoff
      FROM local_clock
    ), released AS (
      SELECT CASE WHEN wall_now >= cutoff THEN cutoff ELSE cutoff - interval '7 days' END AS cutoff
      FROM sunday
    ), bounds AS (
      SELECT cutoff,
             timezone(${zone}, cutoff) AS report_end,
             timezone(${zone}, cutoff - interval '7 days') AS report_start,
             timezone(${zone}, cutoff - interval '14 days') AS previous_start,
             timezone(${zone}, cutoff + interval '7 days') AS next_report
      FROM released
    ), mission_totals AS (
      SELECT count(DISTINCT events.payload->>'missionId') FILTER (WHERE events.created_at >= bounds.report_start) AS current,
             count(DISTINCT events.payload->>'missionId') FILTER (WHERE events.created_at < bounds.report_start) AS previous
      FROM ${schollyEvents} AS events
      CROSS JOIN bounds
      WHERE events.user_id = ${profileId} AND events.type = 'mission_done'
        AND events.created_at >= bounds.previous_start AND events.created_at < bounds.report_end
    ), point_totals AS (
      SELECT sum(ledger.points) FILTER (WHERE ledger.created_at >= timezone('UTC', bounds.report_start)) AS current,
             sum(ledger.points) FILTER (WHERE ledger.created_at < timezone('UTC', bounds.report_start)) AS previous
      FROM ${pointsLedger} AS ledger
      CROSS JOIN bounds
      WHERE ledger.profile_id = ${profileId} AND ledger.points > 0
        AND ledger.created_at >= timezone('UTC', bounds.previous_start)
        AND ledger.created_at < timezone('UTC', bounds.report_end)
    ), sop_at_cutoff AS (
      SELECT DISTINCT ON (weeks.snapshot, essays.university_id)
             weeks.snapshot, essays.university_id, essays.word_count
      FROM bounds
      CROSS JOIN LATERAL (VALUES (0, bounds.previous_start), (1, bounds.report_start), (2, bounds.report_end))
        AS weeks(snapshot, instant)
      JOIN ${essayVersions} AS essays
        ON essays.profile_id = ${profileId} AND essays.essay_type = 'sop'
        AND essays.created_at < timezone('UTC', weeks.instant)
      ORDER BY weeks.snapshot, essays.university_id, essays.created_at DESC, essays.id DESC
    ), sop_per_draft AS (
      SELECT COALESCE(max(word_count) FILTER (WHERE snapshot = 0), 0) AS older,
             COALESCE(max(word_count) FILTER (WHERE snapshot = 1), 0) AS previous,
             COALESCE(max(word_count) FILTER (WHERE snapshot = 2), 0) AS current
      FROM sop_at_cutoff GROUP BY university_id
    ), sop_totals AS (
      SELECT sum(greatest(current - previous, 0)) AS current,
             sum(greatest(previous - older, 0)) AS previous
      FROM sop_per_draft
    )
    SELECT to_char(bounds.cutoff, 'YYYY-MM-DD') AS ended_on,
           to_char(timezone('UTC', bounds.next_report), 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"') AS next_report_at,
           students.created_at < timezone('UTC', bounds.report_end) AS has_report,
           mission_totals.current AS missions, mission_totals.previous AS previous_missions,
           COALESCE(point_totals.current, 0) AS points, COALESCE(point_totals.previous, 0) AS previous_points,
           COALESCE(sop_totals.current, 0) AS sop_words, COALESCE(sop_totals.previous, 0) AS previous_sop_words
    FROM ${studentProfiles} AS students
    CROSS JOIN bounds CROSS JOIN mission_totals CROSS JOIN point_totals CROSS JOIN sop_totals
    WHERE students.id = ${profileId}
  `;
}

export function formatWeeklyReport(row: SchollyWeeklyReportRow): SchollyWeeklyReportResponse {
  return {
    report: row.has_report ? {
      endedOn: row.ended_on,
      current: { missions: Number(row.missions), points: Number(row.points), sopWords: Number(row.sop_words) },
      previous: { missions: Number(row.previous_missions), points: Number(row.previous_points), sopWords: Number(row.previous_sop_words) },
    } : null,
    nextReportAt: row.next_report_at,
  };
}
