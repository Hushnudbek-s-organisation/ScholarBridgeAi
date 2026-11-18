import { sql } from "drizzle-orm";
import type { db } from "@/db";
import { pointsLedger, schollyProfiles, schollyWardrobeItems, userPoints } from "@/db/schema";

type Executor = Pick<typeof db, "execute">;

function totalSpent(profileId: number) {
  // Use ownership for cosmetics so installations with pre-ledger purchases
  // and unbackfilled rows still get their exact spendable balance.
  return sql`(coalesce((SELECT sum(${schollyWardrobeItems.spentPoints})
    FROM ${schollyWardrobeItems} WHERE ${schollyWardrobeItems.userId} = ${profileId}), 0)
    - coalesce((SELECT sum(${pointsLedger.points}) FROM ${pointsLedger}
      WHERE ${pointsLedger.profileId} = ${profileId}
        AND ${pointsLedger.bucket} = 'spend' AND ${pointsLedger.reason} = 'scholly_abuse_reversal'), 0))`;
}

export async function readSchollyBalance(profileId: number, tx: Executor) {
  const { rows: [row] } = await tx.execute<{ lifetimePoints: number; balance: number }>(sql`
    SELECT total AS "lifetimePoints", greatest(0, total - ${totalSpent(profileId)})::int AS balance
    FROM (SELECT coalesce((SELECT ${userPoints.totalPoints} FROM ${userPoints}
      WHERE ${userPoints.profileId} = ${profileId}), 0)::int AS total) AS earned
  `);
  return row;
}

export async function syncSchollyPointCache(profileId: number, lifetime: number, tx: Executor) {
  await tx.execute(sql`
    UPDATE ${schollyProfiles} SET lifetime_points = ${lifetime},
      balance = greatest(0, ${lifetime} - ${totalSpent(profileId)})
    WHERE ${schollyProfiles.userId} = ${profileId}
  `);
}
