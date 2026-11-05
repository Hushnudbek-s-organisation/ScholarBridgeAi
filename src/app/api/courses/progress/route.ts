import { postgresId } from "@/lib/pagination";
import { readJsonBody } from "@/lib/request";
import { NextResponse } from "next/server";
import { requireProfileAccess } from "@/lib/auth";
import { premiumGate } from "@/lib/premium";
import { db } from "@/db";
import { lessonProgress, lessons, courseModules, courses } from "@/db/schema";
import { eq, and, sql } from "drizzle-orm";
import { maybeIssueCertificate } from "@/lib/certificates";
import { awardPoints, recordDailyActivity } from "@/lib/gamification";

export async function POST(req: Request) {
  try {
    const boundedJson = await readJsonBody<Record<string, any>>(req);
    if (!boundedJson.ok) return Response.json({ error: boundedJson.error, code: boundedJson.code }, { status: boundedJson.status });
    const body = boundedJson.body;
    const { profileId, lessonId, watchedSeconds } = body;
    const access = await requireProfileAccess(req, profileId);
    if (!access.ok) {
      return NextResponse.json(
        { error: access.error, code: access.code },
        { status: access.status }
      );
    }
    const locked = await premiumGate(access.session.profile.id, "courses_full");
    if (locked) return locked;

    if (!postgresId(profileId) || !postgresId(lessonId) || typeof watchedSeconds !== "number" || !Number.isFinite(watchedSeconds) || watchedSeconds < 0 || watchedSeconds > 2_147_483_647) {
      return NextResponse.json({ error: "profileId, lessonId and watchedSeconds are required" }, { status: 400 });
    }

    const [context] = await db.select({ lesson: lessons, courseId: courses.id }).from(lessons)
      .innerJoin(courseModules, eq(courseModules.id, lessons.moduleId))
      .innerJoin(courses, eq(courses.id, courseModules.courseId))
      .where(and(eq(lessons.id, Number(lessonId)), eq(courses.isPublished, true)));
    const lesson = context?.lesson;
    if (!lesson) {
      return NextResponse.json({ error: "Lesson not found" }, { status: 404 });
    }

    // Serialize only this student's progress writes. No schema migration or
    // read-then-insert race; a short transaction uses one pool connection.
    const row = await db.transaction(async (tx) => {
      await tx.execute(sql`SELECT id FROM student_profiles WHERE id = ${Number(profileId)} FOR NO KEY UPDATE`);
      const [existing] = await tx.select().from(lessonProgress).where(and(eq(lessonProgress.profileId, Number(profileId)), eq(lessonProgress.lessonId, Number(lessonId))));
      const seconds = Math.max(existing?.watchedSeconds ?? 0, Math.floor(watchedSeconds));
      const complete = Boolean(existing?.isCompleted) || (seconds >= lesson.durationSeconds && lesson.durationSeconds > 0);
      const values = { watchedSeconds: seconds, isCompleted: complete, updatedAt: new Date() };
      const [saved] = existing
        ? await tx.update(lessonProgress).set(values).where(eq(lessonProgress.id, existing.id)).returning()
        : await tx.insert(lessonProgress).values({ ...values, profileId: Number(profileId), lessonId: lesson.id }).returning();
      return saved;
    });
    const isCompleted = row.isCompleted;

    // Finishing a lesson counts as study even when that lesson already paid out
    // its one-off points — otherwise a re-watched lesson never reaches the daily
    // streak, which is the normal way students revise. Merely opening a video
    // does NOT count (see the streak rule in src/lib/streak.ts).
    // recordDailyActivity never throws, so a tracking hiccup cannot fail the save.
    if (isCompleted) {
      await recordDailyActivity(Number(profileId));
    }

    let award = null;
    let certificate = null;

    // Both helpers are idempotent. A retry can recover a failed side effect.
    if (isCompleted) {
      try {
        award = await awardPoints(Number(profileId), 10, "lesson_complete", Number(lessonId));
      } catch (err) {
        console.error("Failed to award lesson points:", err);
      }

      try { certificate = await maybeIssueCertificate(Number(profileId), context.courseId); }
      catch (err) { console.error("Certificate issuance failed:", err); }
    }

    return NextResponse.json({ progress: row, award, certificate });
  } catch (error) {
    console.error("POST /api/courses/progress error:", error);
    return NextResponse.json({ error: "Failed to update lesson progress" }, { status: 500 });
  }
}
