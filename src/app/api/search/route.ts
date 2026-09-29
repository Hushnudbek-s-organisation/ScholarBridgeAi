import { NextResponse } from "next/server";
import { and, desc, eq, ilike, or } from "drizzle-orm";
import { db } from "@/db";
import {
  applications,
  courses,
  essayVersions,
  journeyDeadlines,
  scholarships,
  studentActivities,
  successStories,
  universities,
  userDocuments,
} from "@/db/schema";
import { guardStudent, serverError } from "@/lib/journey/api";
import { NAV_SECTIONS } from "@/lib/navSections";

export const dynamic = "force-dynamic";

/**
 * GET /api/search?q=&profileId= — the global command search (spec §34).
 *
 * Finds the things a student actually has, not just the sidebar:
 *   Features · Universities · Scholarships · Applications · Tasks ·
 *   Documents · Stories · Courses
 *
 * EVERY result is scoped to the caller. The id in the query is checked against
 * the signed session cookie, and every student-scoped query filters on
 * `profile_id` — one student can never see another student's application or
 * document through search.
 */
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const q = (searchParams.get("q") ?? "").trim();
  const g = await guardStudent(req, searchParams.get("profileId"));
  if (!g.ok) return g.response;
  const { profileId } = g.value;

  try {
    // Features first — they are always available and are what a newcomer
    // searching in their own words ("viza", "grant", "insho") needs most.
    const features = NAV_SECTIONS.filter((s) => s.id !== "profile").map((s) => ({
      kind: "feature" as const,
      id: s.id,
      title: s.label,
      subtitle: s.description,
      group: s.group,
      tab: s.id,
    }));

    if (q.length < 2) {
      return NextResponse.json({ query: q, results: features.slice(0, 12), counts: { features: features.length } });
    }

    const like = `%${q}%`;
    const found: {
      kind: string;
      id: string | number;
      title: string;
      subtitle: string;
      group: string;
      tab: string;
    }[] = [];

    const featureHits = features.filter(
      (f) => `${f.title} ${f.subtitle}`.toLowerCase().includes(q.toLowerCase())
    );
    found.push(...featureHits);

    const [unis, schs, apps, docs, stories, courseRows, tasks, activities, essays] = await Promise.all([
      db
        .select({ id: universities.id, name: universities.name, country: universities.country, city: universities.city })
        .from(universities)
        .where(and(eq(universities.isActive, true), or(ilike(universities.name, like), ilike(universities.city, like))))
        .orderBy(universities.worldRanking)
        .limit(6),
      db
        .select({ id: scholarships.id, title: scholarships.title, provider: scholarships.provider, country: scholarships.country })
        .from(scholarships)
        .where(and(eq(scholarships.isActive, true), or(ilike(scholarships.title, like), ilike(scholarships.provider, like))))
        .limit(6),
      db
        .select({ id: applications.id, universityName: applications.universityName, programName: applications.programName, universityId: applications.universityId })
        .from(applications)
        .where(
          and(
            eq(applications.profileId, profileId),
            or(ilike(applications.universityName, like), ilike(applications.programName, like))
          )
        )
        .orderBy(desc(applications.updatedAt))
        .limit(6),
      db
        .select({ id: userDocuments.id, title: userDocuments.title, docType: userDocuments.docType, status: userDocuments.status })
        .from(userDocuments)
        .where(and(eq(userDocuments.profileId, profileId), ilike(userDocuments.title, like)))
        .limit(6),
      db
        .select({ id: successStories.id, admittedUniversity: successStories.admittedUniversity, major: successStories.major })
        .from(successStories)
        .where(
          and(
            eq(successStories.status, "published"),
            or(ilike(successStories.admittedUniversity, like), ilike(successStories.major, like))
          )
        )
        .limit(6),
      db.select({ id: courses.id, title: courses.title, description: courses.description }).from(courses).where(ilike(courses.title, like)).limit(4),
      db
        .select({ id: journeyDeadlines.id, title: journeyDeadlines.title, kind: journeyDeadlines.kind })
        .from(journeyDeadlines)
        .where(and(eq(journeyDeadlines.profileId, profileId), ilike(journeyDeadlines.title, like)))
        .limit(5),
      db
        .select({ id: studentActivities.id, title: studentActivities.title, category: studentActivities.category })
        .from(studentActivities)
        .where(and(eq(studentActivities.profileId, profileId), ilike(studentActivities.title, like)))
        .limit(5),
      db
        .select({ id: essayVersions.id, title: essayVersions.title, essayType: essayVersions.essayType })
        .from(essayVersions)
        .where(and(eq(essayVersions.profileId, profileId), ilike(essayVersions.title, like)))
        .limit(5),
    ]);

    for (const u of unis)
      // The row id travels on the `scholarbridge:focus-record` event, so the
      // tab stays a real section id the sidebar already understands.
      found.push({ kind: "university", id: u.id, title: u.name, subtitle: `${u.city}, ${u.country}`, group: "Discover", tab: "universities" });
    for (const s of schs)
      found.push({ kind: "scholarship", id: s.id, title: s.title, subtitle: `${s.provider} · ${s.country}`, group: "Discover", tab: `scholarship-${s.id}` });
    for (const a of apps)
      found.push({ kind: "application", id: a.id, title: a.universityName || "Application", subtitle: a.programName ?? "Your application", group: "Apply", tab: "workspace" });
    for (const d of docs)
      found.push({ kind: "document", id: d.id, title: d.title, subtitle: `${d.docType} · ${d.status}`, group: "Prepare", tab: "documents" });
    for (const s of stories)
      found.push({ kind: "story", id: s.id, title: s.admittedUniversity, subtitle: s.major ?? "Admission story", group: "My Journey", tab: "stories" });
    for (const c of courseRows)
      found.push({ kind: "course", id: c.id, title: c.title, subtitle: c.description ?? "Course", group: "Help", tab: "courses" });
    for (const t of tasks)
      found.push({ kind: "task", id: t.id, title: t.title, subtitle: t.kind, group: "Apply", tab: "tasks" });
    for (const a of activities)
      found.push({ kind: "activity", id: a.id, title: a.title, subtitle: a.category, group: "My Journey", tab: "activities" });
    for (const e of essays)
      found.push({ kind: "essay", id: e.id, title: e.title || e.essayType, subtitle: "Essay", group: "Apply", tab: "sop" });

    return NextResponse.json({
      query: q,
      results: found.slice(0, 30),
      counts: {
        features: featureHits.length,
        universities: unis.length,
        scholarships: schs.length,
        applications: apps.length,
        documents: docs.length,
        stories: stories.length,
        courses: courseRows.length,
        tasks: tasks.length,
        activities: activities.length,
        essays: essays.length,
      },
    });
  } catch (err) {
    return serverError("search GET", err);
  }
}
