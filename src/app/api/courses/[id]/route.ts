import { NextResponse } from "next/server";
import { requireProfileAccess } from "@/lib/auth";
import { hasFeature } from "@/lib/premium";
import { db } from "@/db";
import {
  courses,
  courseModules,
  lessons,
  lessonProgress,
  quizzes,
  quizQuestions,
  quizAttempts,
  certificates,
} from "@/db/schema";
import { eq, inArray, asc, and } from "drizzle-orm";

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const courseId = parseInt(id, 10);
    const { searchParams } = new URL(req.url);
    const profileIdStr = searchParams.get("profileId");
    const profileId = profileIdStr ? parseInt(profileIdStr, 10) : null;
    // Catalog browsing is free. Full lesson content needs `courses_full` (Pro).
    // Free accounts still get the first lesson of each module as an intro preview.
    const access = await requireProfileAccess(req, profileId);
    if (!access.ok) {
      return NextResponse.json(
        { error: access.error, code: access.code },
        { status: access.status }
      );
    }
    const fullAccess = await hasFeature(access.session.profile.id, "courses_full");

    const [course] = await db.select().from(courses).where(eq(courses.id, courseId));
    if (!course) {
      return NextResponse.json({ error: "Course not found" }, { status: 404 });
    }

    const moduleRows = await db
      .select()
      .from(courseModules)
      .where(eq(courseModules.courseId, courseId))
      .orderBy(asc(courseModules.sortOrder));

    const modules = [];
    const allLessonIds: number[] = [];

    for (const mod of moduleRows) {
      const lessonRows = await db
        .select()
        .from(lessons)
        .where(eq(lessons.moduleId, mod.id))
        .orderBy(asc(lessons.sortOrder));

      const lessonData = [];
      for (const lesson of lessonRows) {
        allLessonIds.push(lesson.id);

        let progress = null;
        if (profileId) {
          const [p] = await db
            .select()
            .from(lessonProgress)
            .where(and(eq(lessonProgress.profileId, profileId), eq(lessonProgress.lessonId, lesson.id)));
          progress = p;
        }

        const [quiz] = await db.select().from(quizzes).where(eq(quizzes.lessonId, lesson.id));
        let quizData = null;
        let lastAttempt = null;
        if (quiz) {
          const questions = await db
            .select()
            .from(quizQuestions)
            .where(eq(quizQuestions.quizId, quiz.id))
            .orderBy(asc(quizQuestions.sortOrder));
          if (profileId) {
            const attempts = await db
              .select()
              .from(quizAttempts)
              .where(
                and(
                  eq(quizAttempts.quizId, quiz.id),
                  eq(quizAttempts.profileId, profileId)
                )
              );
            lastAttempt = attempts.length > 0 ? attempts[attempts.length - 1] : null;
          }
          quizData = {
            id: quiz.id,
            title: quiz.title,
            passThreshold: quiz.passThreshold,
            // The correct option is never sent before an attempt — it is
            // graded server-side and revealed in the attempt response.
            questions: questions.map((q) => ({
              id: q.id,
              question: q.question,
              options: safeParse(q.options),
            })),
          };
        }

        lessonData.push({
          ...lesson,
          progress,
          quiz: quizData,
          lastAttempt,
        });
      }

      modules.push({ ...mod, lessons: lessonData });
    }

    // Free plan: first lesson of each module is the intro preview; the rest
    // are locked placeholders (title only, no video/quiz). Pro gets everything.
    const visibleModules = fullAccess
      ? modules
      : modules.map((mod: any) => {
          const lessons = (mod.lessons as any[]) || [];
          return {
            ...mod,
            lessons: lessons.map((lesson: any, idx: number) => {
              if (idx === 0) return { ...lesson, isIntro: true, locked: false };
              return {
                id: lesson.id,
                title: lesson.title,
                sortOrder: lesson.sortOrder,
                durationMinutes: lesson.durationMinutes ?? null,
                isIntro: false,
                locked: true,
                progress: null,
                quiz: null,
                lastAttempt: null,
                content: null,
                videoUrl: null,
              };
            }),
          };
        });

    let certificate = null;
    let totalCompleted = 0;
    if (profileId && allLessonIds.length > 0) {
      const progressRows = await db
        .select()
        .from(lessonProgress)
        .where(inArray(lessonProgress.lessonId, allLessonIds));
      const completed = progressRows.filter((p) => p.profileId === profileId && p.isCompleted).length;
      totalCompleted = completed;

      const [cert] = await db
        .select()
        .from(certificates)
        .where(and(eq(certificates.courseId, courseId), eq(certificates.profileId, profileId)));
      certificate = cert;
    }

    const totalLessons = allLessonIds.length;

    return NextResponse.json({
      course,
      modules: visibleModules,
      totalLessons,
      completedLessons: totalCompleted,
      progressPct: totalLessons ? Math.round((totalCompleted / totalLessons) * 100) : 0,
      certificate,
      fullAccess,
      freePreview: !fullAccess,
    });
  } catch (error) {
    console.error("GET /api/courses/[id] error:", error);
    return NextResponse.json({ error: "Failed to fetch course" }, { status: 500 });
  }
}

function safeParse(value: string): string[] {
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}
