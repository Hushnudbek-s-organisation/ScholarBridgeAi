import { NextResponse } from "next/server";
import { optionalProfileAccess } from "@/lib/auth";
import { db } from "@/db";
import { courses, courseModules, lessons, lessonProgress } from "@/db/schema";
import { and, eq, inArray } from "drizzle-orm";

/**
 * Course catalogue listing.
 *
 * Performance (audit A19): the old implementation issued 2+ queries PER
 * COURSE (modules, lessons, then progress filtered in JS) and called
 * `seedCourses()` on every single GET. This version issues at most FOUR
 * queries total, whatever the catalogue size:
 *
 *   1. published courses
 *   2. all modules of those courses (one inArray)
 *   3. all lessons of those modules (one inArray)
 *   4. the caller's lesson progress (one inArray; only when signed in)
 *
 * Seeding the demo course no longer happens in the read path: the catalogue
 * is seeded once per process on first use (see below) and can be seeded
 * explicitly by an admin via `POST /api/admin/courses/seed`.
 */

import { seedCourses } from "@/db/seed";

let seedCheckedThisProcess = false;

/** Seed the demo course once per process (fresh databases self-bootstrap;
 *  subsequent GETs never touch the seed path again). */
async function ensureCatalogueSeeded() {
  if (seedCheckedThisProcess) return;
  seedCheckedThisProcess = true;
  await seedCourses();
}

export async function GET(req: Request) {
  try {
    await ensureCatalogueSeeded();

    const { searchParams } = new URL(req.url);
    const profileIdStr = searchParams.get("profileId");
    const profileId = profileIdStr ? parseInt(profileIdStr, 10) : null;
    const access = await optionalProfileAccess(req, profileId);
    if (!access.ok) {
      return NextResponse.json(
        { error: access.error, code: access.code },
        { status: access.status }
      );
    }

    const allCourses = await db.select().from(courses).where(eq(courses.isPublished, true));
    const courseIds = allCourses.map((c) => c.id);
    if (courseIds.length === 0) {
      return NextResponse.json({ courses: [] });
    }

    const moduleRows = await db
      .select()
      .from(courseModules)
      .where(inArray(courseModules.courseId, courseIds));
    const modulesByCourse = new Map<number, typeof moduleRows>();
    for (const m of moduleRows) {
      const list = modulesByCourse.get(m.courseId) ?? [];
      list.push(m);
      modulesByCourse.set(m.courseId, list);
    }

    const moduleIds = moduleRows.map((m) => m.id);
    const lessonRows =
      moduleIds.length > 0
        ? await db.select().from(lessons).where(inArray(lessons.moduleId, moduleIds))
        : [];
    const lessonsByModule = new Map<number, typeof lessonRows>();
    for (const l of lessonRows) {
      const list = lessonsByModule.get(l.moduleId) ?? [];
      list.push(l);
      lessonsByModule.set(l.moduleId, list);
    }

    let completedLessonIds = new Set<number>();
    if (profileId && lessonRows.length > 0) {
      const progress = await db
        .select({ lessonId: lessonProgress.lessonId })
        .from(lessonProgress)
        .where(
          and(
            eq(lessonProgress.profileId, profileId),
            eq(lessonProgress.isCompleted, true),
            inArray(lessonProgress.lessonId, lessonRows.map((l) => l.id))
          )
        );
      completedLessonIds = new Set(progress.map((p) => p.lessonId));
    }

    const results = allCourses.map((course) => {
      const courseModules = (modulesByCourse.get(course.id) ?? [])
        .slice()
        .sort((a, b) => a.sortOrder - b.sortOrder);
      let lessonCount = 0;
      let completedLessons = 0;
      for (const mod of courseModules) {
        const courseLessons = lessonsByModule.get(mod.id) ?? [];
        lessonCount += courseLessons.length;
        completedLessons += courseLessons.filter((l) => completedLessonIds.has(l.id)).length;
      }
      const progressPct = lessonCount > 0 ? Math.round((completedLessons / lessonCount) * 100) : 0;
      return { ...course, lessonCount, completedLessons, progressPct };
    });

    return NextResponse.json({ courses: results });
  } catch (error) {
    console.error("GET /api/courses error:", error);
    return NextResponse.json({ error: "Failed to fetch courses" }, { status: 500 });
  }
}
