import { sql } from "drizzle-orm";
import { db } from "@/db";
import { dailyMissions, schollyEvents, schollyNotificationLog, schollyProfiles } from "@/db/schema";

import { SCHOLLY_TOPICS, type SchollyTopic } from "./scholly-learning";

const timeZone = "Asia/Tashkent";
const activityTypes = sql`('dashboard_open', 'mission_shown', 'mission_done')`;

type DailyActivity = {
  date: string;
  visitors: number;
  completers: number;
};

type Cohort = { eligible: number; returned: number };

export type SchollyAnalytics = {
  timeZone: string;
  activity: DailyActivity[];
  active7: number;
  active30: number;
  retention1: Cohort;
  retention7: Cohort;
  onboarding: { step: string; users: number }[];
  helpTopics: { topic: SchollyTopic; visits: number; helpful: number; needsWork: number }[];
  reminderExperiment: { variant: string; sent: number; opened: number; completed: number }[];
};

export async function getSchollyAnalytics(days: number, now: Date): Promise<SchollyAnalytics> {
  const boundary = sql`(${now.toISOString()}::timestamptz AT TIME ZONE ${timeZone})::date`;
  const localDate = sql`(${schollyEvents.createdAt} AT TIME ZONE ${timeZone})::date`;
  const [activity, overview, onboarding, reminderExperiment, helpTopics] = await Promise.all([
    db.execute<DailyActivity>(sql`
      WITH bounds AS (SELECT ${boundary} AS today),
      activity AS (
        SELECT ${localDate} AS day, ${schollyEvents.userId} AS user_id,
          ${schollyEvents.type} AS type
        FROM ${schollyEvents}, bounds
        WHERE ${schollyEvents.type} IN ${activityTypes}
          AND ${schollyEvents.createdAt} >= ((today - ${days - 1}::int)::timestamp AT TIME ZONE ${timeZone})
          AND ${schollyEvents.createdAt} <= ${now.toISOString()}::timestamptz
      )
      SELECT (bounds.today - dates.offset_days)::text AS date,
        count(DISTINCT activity.user_id)::int AS visitors,
        count(DISTINCT activity.user_id) FILTER (WHERE activity.type = 'mission_done')::int AS completers
      FROM bounds CROSS JOIN generate_series(0, ${days - 1}) AS dates(offset_days)
      LEFT JOIN activity ON activity.day = bounds.today - dates.offset_days
      GROUP BY bounds.today, dates.offset_days ORDER BY date
    `),
    db.execute<{
      active7: number; active30: number;
      eligible1: number; returned1: number; eligible7: number; returned7: number;
    }>(sql`
      WITH bounds AS (
        SELECT ${boundary} AS today, greatest(${days - 1}::int, 29) AS lookback
      ),
      visits AS (
        SELECT DISTINCT ${schollyEvents.userId} AS user_id, ${localDate} AS day
        FROM ${schollyEvents}, bounds
        WHERE ${schollyEvents.type} IN ${activityTypes}
          AND ${schollyEvents.createdAt} >= ((today - lookback)::timestamp AT TIME ZONE ${timeZone})
          AND ${schollyEvents.createdAt} <= ${now.toISOString()}::timestamptz
      ),
      first_in_window AS (
        SELECT user_id, min(day) AS day FROM visits GROUP BY user_id
      ),
      cohort AS (
        SELECT first_in_window.user_id, first_in_window.day
        FROM first_in_window, bounds
        WHERE first_in_window.day >= today - ${days - 1}::int
          AND NOT EXISTS (
            SELECT 1 FROM ${schollyEvents}
            WHERE ${schollyEvents.userId} = first_in_window.user_id
              AND ${schollyEvents.type} IN ${activityTypes}
              AND ${schollyEvents.createdAt} < (first_in_window.day::timestamp AT TIME ZONE ${timeZone})
          )
      )
      SELECT
        (SELECT count(DISTINCT visits.user_id)::int FROM visits WHERE visits.day >= today - 6) AS active7,
        (SELECT count(DISTINCT visits.user_id)::int FROM visits WHERE visits.day >= today - 29) AS active30,
        count(cohort.user_id) FILTER (WHERE cohort.day + 1 < today)::int AS eligible1,
        count(next_day.user_id) FILTER (WHERE cohort.day + 1 < today)::int AS returned1,
        count(cohort.user_id) FILTER (WHERE cohort.day + 7 < today)::int AS eligible7,
        count(next_week.user_id) FILTER (WHERE cohort.day + 7 < today)::int AS returned7
      FROM bounds LEFT JOIN cohort ON true
      LEFT JOIN visits AS next_day ON next_day.user_id = cohort.user_id AND next_day.day = cohort.day + 1
      LEFT JOIN visits AS next_week ON next_week.user_id = cohort.user_id AND next_week.day = cohort.day + 7
      GROUP BY today
    `),
    db.execute<{ step: string; users: number }>(sql`
      WITH steps AS (
        SELECT ${schollyEvents.userId} AS user_id,
          CASE ${schollyEvents.type}
            WHEN 'onboarding_started' THEN 'started'
            WHEN 'onboarding_completed' THEN 'completed'
            WHEN 'onboarding_skipped' THEN 'skipped'
            ELSE ${schollyEvents.payload}->>'step'
          END AS step
        FROM ${schollyEvents}
        WHERE ${schollyEvents.type} IN (
          'onboarding_started', 'onboarding_step', 'onboarding_completed', 'onboarding_skipped'
        )
          AND (${schollyEvents.payload}->>'resumed') IS DISTINCT FROM 'true'
          AND ${schollyEvents.createdAt} >= ((${boundary} - ${days - 1}::int)::timestamp AT TIME ZONE ${timeZone})
          AND ${schollyEvents.createdAt} <= ${now.toISOString()}::timestamptz
      )
      SELECT step, count(DISTINCT user_id)::int AS users FROM steps
      WHERE step IN ('started', 'name', 'reminder', 'tone', 'challenge', 'completed', 'skipped')
      GROUP BY step
    `),
    db.execute<SchollyAnalytics["reminderExperiment"][number]>(sql`
      SELECT variant, count(*)::int AS sent,
        count(opened_at)::int AS opened,
        count(*) FILTER (WHERE EXISTS (
          SELECT 1 FROM ${dailyMissions} mission
          WHERE mission.user_id = delivery.user_id AND mission.day = delivery.local_day
            AND mission.status = 'done' AND mission.done_at BETWEEN delivery.sent_at AND ${now.toISOString()}::timestamptz
        ))::int AS completed
      FROM ${schollyNotificationLog} delivery
      WHERE channel = 'push' AND category = 'mission' AND variant IN ('A', 'B') AND status = 'sent'
        AND sent_at BETWEEN ((${boundary} - ${days - 1}::int)::timestamp AT TIME ZONE ${timeZone})
          AND ${now.toISOString()}::timestamptz
      GROUP BY variant ORDER BY variant
    `),
    db.execute<SchollyAnalytics["helpTopics"][number]>(sql`
      with preferences as (
        select notif_prefs->'companionLearning'->'topics' as topics
        from ${schollyProfiles}
        where notif_prefs->'companionLearning'->'enabled' = 'true'::jsonb
      ), signals as (
        select key as topic,
          case when value->>'visits' ~ '^[0-9]{1,2}$' then least(30, (value->>'visits')::int) else 0 end as visits,
          case when value->>'helpful' ~ '^[0-9]{1,2}$' then least(30, (value->>'helpful')::int) else 0 end as helpful,
          case when value->>'needsWork' ~ '^[0-9]{1,2}$' then least(30, (value->>'needsWork')::int) else 0 end as needs_work
        from preferences, lateral jsonb_each(case when jsonb_typeof(topics) = 'object' then topics else '{}'::jsonb end)
        where key in (${sql.join(SCHOLLY_TOPICS.map(topic => sql`${topic}`), sql`,`)})
      )
      select topic, sum(visits)::int as visits, sum(helpful)::int as helpful, sum(needs_work)::int as "needsWork"
      from signals where visits + helpful + needs_work > 0
      group by topic having count(*) >= 5
      order by sum(needs_work) desc, sum(visits) desc, topic
    `),
  ]);

  const totals = overview.rows[0];
  return {
    timeZone,
    activity: activity.rows,
    active7: totals.active7,
    active30: totals.active30,
    retention1: { eligible: totals.eligible1, returned: totals.returned1 },
    retention7: { eligible: totals.eligible7, returned: totals.returned7 },
    onboarding: onboarding.rows,
    reminderExperiment: reminderExperiment.rows,
    helpTopics: helpTopics.rows,
  };
}
