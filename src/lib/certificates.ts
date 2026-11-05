import { randomInt } from "crypto";
import { eq, and, inArray, sql } from "drizzle-orm";
import { db } from "@/db";
import {
  courses,
  courseModules,
  lessons,
  lessonProgress,
  quizzes,
  quizAttempts,
  certificates,
} from "@/db/schema";

type Executor = Pick<typeof db, "select" | "insert" | "execute">;

const CODE_CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

/** Generate a random certificate code. */
export function generateCertificateCode(): string {
  let code = "";
  for (let i = 0; i < 12; i++) {
    code += CODE_CHARS[randomInt(CODE_CHARS.length)];
  }
  return `SBC-${code.slice(0, 4)}-${code.slice(4, 8)}-${code.slice(8)}`;
}

/** All lesson ids belonging to a course (ordered). */
export async function getCourseLessonIds(courseId: number, executor: Executor = db): Promise<number[]> {
  const moduleRows = await executor
    .select({ id: courseModules.id })
    .from(courseModules)
    .where(eq(courseModules.courseId, courseId));
  const moduleIds = moduleRows.map((m) => m.id);
  if (moduleIds.length === 0) return [];

  const lessonRows = await executor
    .select({ id: lessons.id })
    .from(lessons)
    .where(inArray(lessons.moduleId, moduleIds));
  return lessonRows.map((l) => l.id);
}

/** True when a profile has completed every lesson in the course. */
export async function allLessonsComplete(profileId: number, courseId: number, executor: Executor = db): Promise<boolean> {
  const lessonIds = await getCourseLessonIds(courseId, executor);
  if (lessonIds.length === 0) return false;

  const progress = await executor
    .select()
    .from(lessonProgress)
    .where(
      and(
        eq(lessonProgress.profileId, profileId),
        inArray(lessonProgress.lessonId, lessonIds)
      )
    );

  const completedIds = new Set(progress.filter((p) => p.isCompleted).map((p) => p.lessonId));
  return lessonIds.every((id) => completedIds.has(id));
}

/** True when every quiz in the course has a passing attempt for the profile. */
export async function allQuizzesPassed(profileId: number, courseId: number, executor: Executor = db): Promise<boolean> {
  const lessonIds = await getCourseLessonIds(courseId, executor);
  if (lessonIds.length === 0) return true;

  const quizRows = await executor
    .select({ id: quizzes.id })
    .from(quizzes)
    .where(inArray(quizzes.lessonId, lessonIds));
  if (quizRows.length === 0) return true;

  const quizIds = quizRows.map((q) => q.id);
  const attempts = await executor
    .select()
    .from(quizAttempts)
    .where(
      and(
        eq(quizAttempts.profileId, profileId),
        inArray(quizAttempts.quizId, quizIds)
      )
    );

  const passedQuizIds = new Set(attempts.filter((a) => a.passed).map((a) => a.quizId));
  return quizIds.every((id) => passedQuizIds.has(id));
}

/**
 * Automatically issues a certificate once all lessons are complete and every
 * quiz has a passing attempt. Returns the certificate if newly issued, an
 * existing certificate, or null when requirements aren't met yet.
 */
export async function maybeIssueCertificate(profileId: number, courseId: number) {
  return db.transaction(async (tx) => {
    await tx.execute(sql`SELECT id FROM student_profiles WHERE id = ${profileId} FOR NO KEY UPDATE`);
    const [course] = await tx.select().from(courses).where(eq(courses.id, courseId));
    if (!course) return null;

    const [existing] = await tx
      .select()
      .from(certificates)
      .where(
        and(
          eq(certificates.profileId, profileId),
          eq(certificates.courseId, courseId)
        )
      );
    if (existing) return existing;

    if (!(await allLessonsComplete(profileId, courseId, tx))) return null;
    if (!(await allQuizzesPassed(profileId, courseId, tx))) return null;

    // The unique-code constraint arbitrates collisions atomically.
    for (let attempt = 0; attempt < 5; attempt++) {
      const [cert] = await tx.insert(certificates)
        .values({ profileId, courseId, certificateCode: generateCertificateCode() })
        .onConflictDoNothing({ target: certificates.certificateCode }).returning();
      if (cert) return cert;
    }
    throw new Error("Unable to allocate a certificate code");
  });
}
