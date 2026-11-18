import { createHash } from "node:crypto";
import { and, eq } from "drizzle-orm";
import type { db } from "@/db";
import { applications, studentProfiles } from "@/db/schema";
import { awardSchollyPoints } from "@/lib/scholly-points.server";

type Transaction = Parameters<Parameters<typeof db.transaction>[0]>[0];
type Application = typeof applications.$inferSelect;

export async function rewardTrackedSubmission(app: Application, tx: Transaction) {
  const normalize = (value: string | null) => (value ?? "").normalize("NFKC").trim().toLowerCase().replace(/\s+/g, " ");
  // The claim outlives the application row, including delete and re-create.
  const key = createHash("sha256").update(JSON.stringify([
    app.universityId ?? normalize(app.universityName),
    normalize(app.programName), normalize(app.intakeTerm), normalize(app.applicationRound),
  ])).digest("hex");
  return awardSchollyPoints(app.profileId, "application_submitted", `application:${key}`, tx, { relatedEntityId: app.id });
}

export async function updateTrackedApplication(
  tx: Transaction, profileId: number, id: number, patch: Partial<typeof applications.$inferInsert>, ownAction: boolean,
) {
  const ownedRow = and(eq(applications.id, id), eq(applications.profileId, profileId));
  if (patch.status !== "submitted") {
    const [application] = await tx.update(applications).set(patch).where(ownedRow).returning();
    return { application, newlySubmitted: false, schollyPointsAwarded: 0 };
  }
  await tx.select({ id: studentProfiles.id }).from(studentProfiles)
    .where(eq(studentProfiles.id, profileId)).for("no key update").limit(1);
  const [previous] = await tx.select({ status: applications.status, submittedAt: applications.submittedAt })
    .from(applications).where(ownedRow).for("update").limit(1);
  if (!previous) return { application: undefined, newlySubmitted: false, schollyPointsAwarded: 0 };
  const newlySubmitted = previous.status !== "submitted" && !previous.submittedAt;
  const [application] = await tx.update(applications)
    .set({ ...patch, submittedAt: previous.submittedAt ?? new Date() }).where(ownedRow).returning();
  const award = application && newlySubmitted && ownAction
    ? await rewardTrackedSubmission(application, tx) : null;
  return { application, newlySubmitted, schollyPointsAwarded: award?.points ?? 0 };
}
