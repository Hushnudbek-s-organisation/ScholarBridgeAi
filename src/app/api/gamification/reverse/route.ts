import { and, eq, inArray } from "drizzle-orm";
import { db } from "@/db";
import { auditLogs, pointsLedger, studentProfiles } from "@/db/schema";
import { privateNoStoreJson } from "@/lib/apiResponse";
import { requireAdmin } from "@/lib/auth";
import { positiveInt, readJsonBody } from "@/lib/request";
import { readSchollyBalance, syncSchollyPointCache } from "@/lib/scholly-points-balance.server";

export async function POST(req: Request) {
  try {
    const access = await requireAdmin(req);
    if (!access.ok) return privateNoStoreJson({ code: access.code }, { status: access.status });
    const parsed = await readJsonBody<Record<string, unknown>>(req, 1024);
    if (!parsed.ok) return privateNoStoreJson({ code: parsed.code }, { status: parsed.status });
    const awardId = positiveInt(parsed.body.awardId);
    const reason = parsed.body.reason;
    if (!awardId || (reason !== "spam" && reason !== "fabricated_submission")) {
      return privateNoStoreJson({ code: "invalid_reversal" }, { status: 400 });
    }
    const result = await db.transaction(async tx => {
      const [award] = await tx.select().from(pointsLedger).where(and(
        eq(pointsLedger.id, awardId), inArray(pointsLedger.bucket, ["main", "small", "bonus"]),
      )).limit(1);
      if (!award || award.points <= 0) return null;
      await tx.select({ id: studentProfiles.id }).from(studentProfiles)
        .where(eq(studentProfiles.id, award.profileId)).for("no key update").limit(1);
      const [reversal] = await tx.insert(pointsLedger).values({
        profileId: award.profileId, points: -award.points, bucket: "spend",
        reason: "scholly_abuse_reversal", relatedEntityId: awardId,
        idempotencyKey: `scholly:${award.profileId}:abuse-reversal:${awardId}`,
      }).onConflictDoNothing({ target: pointsLedger.idempotencyKey }).returning({ id: pointsLedger.id });
      const totals = await readSchollyBalance(award.profileId, tx);
      if (reversal) {
        await syncSchollyPointCache(award.profileId, totals.lifetimePoints, tx);
        await tx.insert(auditLogs).values({
          entityType: "points_ledger", entityId: awardId, fieldChanged: "abuse_reversal",
          oldValue: String(award.points), newValue: String(-award.points),
          actor: "ADMIN", source: `${access.session.profile.id}:${reason}`,
        });
      }
      return { reversed: Boolean(reversal), ...totals };
    });
    return result ? privateNoStoreJson(result) : privateNoStoreJson({ code: "award_not_found" }, { status: 404 });
  } catch (error) {
    console.error("POST /api/gamification/reverse error:", (error as Error)?.name);
    return privateNoStoreJson({ code: "reversal_unavailable" }, { status: 500 });
  }
}
