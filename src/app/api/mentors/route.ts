import { NextResponse } from "next/server";
import { db } from "@/db";
import { mentorRequests, mentors, savedScholarships, savedUniversities, scholarships, studentProfiles, universities } from "@/db/schema";
import { and, eq } from "drizzle-orm";
import { requireProfileAccess } from "@/lib/auth";
import { readJsonBody, clampString } from "@/lib/request";
import { matchMentors, type Mentor, type MentorRequest } from "@/lib/mentors";
import { parseListColumn } from "@/lib/chancing";

/**
 * Mentor Marketplace (Phase 4).
 *
 * GET matches the student to mentors who walked their path. Every match comes
 * back with the concrete reasons it was suggested AND the ways it does not
 * match — a student who cannot see why a mentor was recommended will not trust
 * the introduction.
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

    const [savedUnis, savedSch] = await Promise.all([
      db.select().from(savedUniversities).where(eq(savedUniversities.profileId, profileId)),
      db.select().from(savedScholarships).where(eq(savedScholarships.profileId, profileId)),
    ]);

    const targetUniversities: string[] = [];
    if (savedUnis.length > 0) {
      const { inArray } = await import("drizzle-orm");
      const rows = await db
        .select({ name: universities.name })
        .from(universities)
        .where(inArray(universities.id, savedUnis.map((s) => s.universityId)));
      rows.forEach((r) => targetUniversities.push(r.name));
    }

    const targetScholarships: string[] = [];
    if (savedSch.length > 0) {
      const { inArray } = await import("drizzle-orm");
      const rows = await db
        .select({ title: scholarships.title })
        .from(scholarships)
        .where(inArray(scholarships.id, savedSch.map((s) => s.scholarshipId)));
      rows.forEach((r) => targetScholarships.push(r.title));
    }

    const rows = await db.select().from(mentors).where(eq(mentors.isActive, true));

    const request: MentorRequest = {
      country: profile.country,
      targetUniversities,
      targetMajor: profile.targetMajor,
      degreeLevel: profile.degreeLevel,
      targetScholarships,
      needsFinancialAid: profile.needsFinancialAid,
      preferredLanguages: parseListColumn(profile.preferredLocale ? [profile.preferredLocale] : []),
      maxHourlyRateUsd: searchParams.get("maxRate") ? Number(searchParams.get("maxRate")) : null,
    };

    const result = matchMentors(
      request,
      rows.map((r) => ({ ...r, profileId: r.profileId })) as unknown as Mentor[],
      { limit: Number(searchParams.get("limit")) || 10 }
    );

    return NextResponse.json({
      matches: result.matches.map((m) => ({
        id: m.mentor.id,
        displayName: m.mentor.displayName,
        headline: m.mentor.headline,
        country: m.mentor.country,
        university: m.mentor.university,
        program: m.mentor.program,
        scholarshipName: m.mentor.scholarshipName,
        hourlyRateUsd: m.mentor.hourlyRateUsd,
        freeSessions: m.mentor.freeSessions,
        ratingAverage: m.mentor.ratingAverage,
        ratingCount: m.mentor.ratingCount,
        score: m.score,
        reasons: m.reasons,
        gaps: m.gaps,
        verified: m.verified,
        price: m.price,
      })),
      filtered: result.filtered,
      note: result.note,
    });
  } catch (error) {
    console.error("GET /api/mentors error:", error);
    return NextResponse.json({ error: "Failed to find mentors" }, { status: 500 });
  }
}

/** Request an introduction to a mentor. */
export async function POST(req: Request) {
  try {
    const parsed = await readJsonBody<Record<string, any>>(req, 64 * 1024);
    if (!parsed.ok) {
      return NextResponse.json({ error: parsed.error, code: parsed.code }, { status: parsed.status });
    }
    const body = parsed.body;
    const profileId = Number(body.profileId);
    const mentorId = Number(body.mentorId);
    if (!profileId || !mentorId) {
      return NextResponse.json({ error: "profileId and mentorId are required" }, { status: 400 });
    }
    const access = await requireProfileAccess(req, profileId);
    if (!access.ok) {
      return NextResponse.json({ error: access.error, code: access.code }, { status: access.status });
    }

    const topic = clampString(body.topic, 200);
    if (!topic) {
      return NextResponse.json({ error: "A topic is required" }, { status: 400 });
    }

    // Do not let one student flood a mentor's inbox.
    const [existing] = await db
      .select()
      .from(mentorRequests)
      .where(
        and(
          eq(mentorRequests.profileId, profileId),
          eq(mentorRequests.mentorId, mentorId),
          eq(mentorRequests.status, "pending")
        )
      );
    if (existing) {
      return NextResponse.json(
        { error: "You already have a pending request with this mentor." },
        { status: 409 }
      );
    }

    const [row] = await db
      .insert(mentorRequests)
      .values({
        profileId,
        mentorId,
        topic,
        message: clampString(body.message, 2000),
      })
      .returning();

    return NextResponse.json({ request: row });
  } catch (error) {
    console.error("POST /api/mentors error:", error);
    return NextResponse.json({ error: "Failed to send the request" }, { status: 500 });
  }
}
