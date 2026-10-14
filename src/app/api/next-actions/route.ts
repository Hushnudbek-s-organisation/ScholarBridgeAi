import { NextResponse } from "next/server";
import { db } from "@/db";
import {
  applications,
  applicationOutcomes,
  applicationTasks,
  recommendationRequests,
  savedScholarships,
  savedUniversities,
  studentProfiles,
} from "@/db/schema";
import { eq } from "drizzle-orm";
import { requireProfileAccess } from "@/lib/auth";
import { buildNextActions, daysUntil, type NextActionsContext } from "@/lib/nextActions";

/**
 * Personalized Roadmap — "What should I do next?" (#4).
 *
 * Gathers the student's real state from the database and hands it to the pure
 * ranking engine in src/lib/nextActions.ts. All prioritisation lives there so
 * the ordering is testable; this route only collects facts.
 */
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const profileId = Number(searchParams.get("profileId"));
    if (!profileId) {
      return NextResponse.json({ error: "profileId is required" }, { status: 400 });
    }
    const access = await requireProfileAccess(req, profileId);
    if (!access.ok) {
      return NextResponse.json({ error: access.error, code: access.code }, { status: access.status });
    }

    const [profile] = await db.select().from(studentProfiles).where(eq(studentProfiles.id, profileId));
    if (!profile) {
      return NextResponse.json({ error: "Profile not found" }, { status: 404 });
    }

    const today = new Date();

    const [savedUnis, savedSch, tasks, recRows, apps, outcomes] = await Promise.all([
      db.select().from(savedUniversities).where(eq(savedUniversities.profileId, profileId)),
      db.select().from(savedScholarships).where(eq(savedScholarships.profileId, profileId)),
      db.select().from(applicationTasks).where(eq(applicationTasks.profileId, profileId)),
      db.select().from(recommendationRequests).where(eq(recommendationRequests.profileId, profileId)),
      db.select().from(applications).where(eq(applications.profileId, profileId)),
      db.select({ applicationId: applicationOutcomes.applicationId }).from(applicationOutcomes).where(eq(applicationOutcomes.profileId, profileId)),
    ]);

    const openTasks = tasks.filter((t) => !t.isCompleted);
    const outcomeIds = new Set(outcomes.map((o) => o.applicationId));

    // Deadlines come from the two places the student controls: application
    // deadlines and roadmap milestones. Scholarships arrive via /api/deadlines
    // and are merged client-side so this route stays cheap.
    const deadlines = [
      ...apps
        .filter((a) => a.status !== "withdrawn" && a.deadline)
        .map((a) => ({
          id: `app-${a.id}`,
          title: a.programName ? `${a.universityName} — ${a.programName}` : a.universityName,
          type: "application",
          daysRemaining: daysUntil(today, a.deadline),
        })),
      ...openTasks
        .filter((t) => t.dueDate)
        .map((t) => ({
          id: `task-${t.id}`,
          title: t.title,
          type: "milestone",
          daysRemaining: daysUntil(today, t.dueDate),
        })),
    ].filter((d) => d.daysRemaining !== null) as { id: string; title: string; type: string; daysRemaining: number }[];

    const context: NextActionsContext = {
      deadlines,
      applications: apps.map((a) => ({
        id: a.id,
        universityName: a.universityName,
        status: a.status,
        deadlineDaysRemaining: daysUntil(today, a.deadline),
      })),
      recommendationApplicationIds: [...new Set(recRows.map((row) => row.applicationId))],
      savedUniversityCount: savedUnis.length,
      savedScholarshipCount: savedSch.length,
      openTaskCount: openTasks.length,
      requiresFullScholarship: Boolean(profile.requiresFullScholarship),
      // Submitted-but-undecided rows are the flywheel's missing input.
      submittedWithoutOutcome: apps.filter(
        (a) => ["submitted", "interview", "decision"].includes(a.status) && !outcomeIds.has(a.id)
      ).length,
    };

    const result = buildNextActions(context, 3);

    return NextResponse.json({
      headline: result.headline,
      actions: result.actions,
      rest: result.rest,
      criticalCount: result.criticalCount,
    });
  } catch (error) {
    console.error("GET /api/next-actions error:", error);
    return NextResponse.json({ error: "Failed to build your roadmap" }, { status: 500 });
  }
}
