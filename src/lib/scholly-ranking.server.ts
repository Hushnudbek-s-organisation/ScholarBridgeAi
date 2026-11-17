import { eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { pointsLedger, schollyProfiles, studentProfiles } from "@/db/schema";
import { ensureSchollyProfile } from "@/lib/scholly-mission-store.server";

const regions = {
  UZ: ["uz", "uzbekistan", "o'zbekiston", "узбекистан"],
  KZ: ["kz", "kazakhstan", "qozog'iston", "казахстан"],
  KG: ["kg", "kyrgyzstan", "qirg'iziston", "кыргызстан", "киргизия"],
  TJ: ["tj", "tajikistan", "tojikiston", "таджикистан"],
  TM: ["tm", "turkmenistan", "turkmaniston", "туркменистан"],
} as const;

const location = sql<string>`lower(translate(trim(${studentProfiles.country}), '’‘ʻʼ', repeat(chr(39), 4)))`;
const optedIn = sql`${schollyProfiles.notifPrefs}->'regionalRanking' = 'true'::jsonb`;

export type SchollyRanking = {
  country: keyof typeof regions | null;
  joined: boolean;
  people: number;
  own: { rank: number; score: number } | null;
  leaders: { rank: number; score: number }[];
};

export async function getSchollyRanking(id: number): Promise<SchollyRanking> {
  const [profile] = await db.select({ location, joined: sql<boolean>`coalesce(${optedIn}, false)` }).from(studentProfiles)
    .leftJoin(schollyProfiles, eq(schollyProfiles.userId, studentProfiles.id))
    .where(eq(studentProfiles.id, id)).limit(1);
  const region = Object.entries(regions).find(([, aliases]) => (aliases as readonly string[]).includes(profile?.location));
  const country = (region?.[0] ?? null) as SchollyRanking["country"];
  const joined = Boolean(profile?.joined);
  if (!region || !joined) return { country, joined, people: 0, own: null, leaders: [] };
  const aliases = sql.join(region[1].map(alias => sql`${alias}`), sql`, `);
  const now = new Date().toISOString();
  const { rows } = await db.execute<{ rank: number; score: number; people: number; own: boolean }>(sql`
    WITH bounds AS (
      SELECT (date_trunc('week', ${now}::timestamptz AT TIME ZONE 'Asia/Tashkent' - interval '4 hours')
        + interval '4 hours') AT TIME ZONE 'Asia/Tashkent' AT TIME ZONE 'UTC' AS start
    ), totals AS (
      SELECT ${studentProfiles.id} AS participant, sum(${pointsLedger.points})::int AS score
      FROM ${studentProfiles}
      JOIN ${schollyProfiles} ON ${schollyProfiles.userId} = ${studentProfiles.id}
      JOIN ${pointsLedger} ON ${pointsLedger.profileId} = ${studentProfiles.id}
      CROSS JOIN bounds
      WHERE ${optedIn} AND ${location} IN (${aliases})
        AND ${pointsLedger.bucket} IN ('main', 'small')
        AND ${pointsLedger.points} > 0 AND ${pointsLedger.reason} <> 'referral_referrer'
        AND ${pointsLedger.createdAt} BETWEEN bounds.start AND (${now}::timestamptz AT TIME ZONE 'UTC')
        AND NOT EXISTS (
          SELECT 1 FROM points_ledger reversal
          WHERE reversal.idempotency_key = 'scholly:' || ${pointsLedger.profileId} || ':abuse-reversal:' || ${pointsLedger.id}
        )
      GROUP BY ${studentProfiles.id}
    ), ranked AS (
      SELECT participant, score, rank() OVER (ORDER BY score DESC)::int AS rank,
        count(*) OVER ()::int AS people,
        row_number() OVER (ORDER BY score DESC, participant) AS position FROM totals
    )
    SELECT rank, score, people, participant = ${id} AS own FROM ranked
    WHERE (people >= 5 AND position <= 10) OR participant = ${id}
    ORDER BY position
  `);
  const own = rows.find(row => row.own);
  const people = rows[0]?.people ?? 0;
  if (people < 5) return { country, joined, people: 0, own: null, leaders: [] };
  return {
    country, joined, people,
    own: own ? { rank: own.rank, score: own.score } : null,
    leaders: rows.slice(0, 10).map(({ rank, score }) => ({ rank, score })),
  };
}

export async function setSchollyRanking(id: number, joined: boolean) {
  if (!(await ensureSchollyProfile(id))) return null;
  if (joined && !(await getSchollyRanking(id)).country) return null;
  await db.update(schollyProfiles).set({
    notifPrefs: sql`CASE WHEN jsonb_typeof(${schollyProfiles.notifPrefs}) = 'object'
      THEN ${schollyProfiles.notifPrefs} ELSE '{}'::jsonb END || ${JSON.stringify({ regionalRanking: joined })}::jsonb`,
  }).where(eq(schollyProfiles.userId, id));
  return getSchollyRanking(id);
}
