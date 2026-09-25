import { NextResponse } from "next/server";
import { db } from "@/db";
import { applicationOutcomes, applications, studentProfiles, universities } from "@/db/schema";
import { and, eq, inArray } from "drizzle-orm";
import { requireProfileAccess } from "@/lib/auth";
import {
  findSimilarProfiles,
  gpaTo4,
  type OutcomeRecord,
  type ProfileVector,
} from "@/lib/similarProfiles";
import { parseListColumn } from "@/lib/chancing";

/**
 * Accepted-student & similar-profile matching (#10).
 *
 * "Someone with my profile got in" is the most persuasive evidence a student
 * can see. It is also other people's data, so:
 *
 *   1. ONLY rows with `shareConsent = true` are read. A row without consent
 *      never leaves its owner's account — not aggregated, not anonymised.
 *   2. Rows are joined to a profile snapshot taken at decision time, so the
 *      comparison uses what the applicant actually had when they applied.
 *   3. Small samples never render as a percentage (see lib/similarProfiles).
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

    const me: ProfileVector = {
      gpa4: gpaTo4(profile.gpa, profile.gpaScale),
      ielts: profile.ieltsScore,
      toefl: profile.toeflScore,
      sat: profile.satScore,
      act: profile.actScore,
      major: profile.targetMajor,
      country: profile.country,
      degreeLevel: profile.degreeLevel,
      activityCount:
        parseListColumn(profile.leadership).length +
        parseListColumn(profile.volunteering).length +
        parseListColumn(profile.sports).length +
        parseListColumn(profile.clubs).length +
        parseListColumn(profile.projects).length,
      leadershipCount: parseListColumn(profile.leadership).length,
      awardCount: parseListColumn(profile.awards).length + parseListColumn(profile.olympiads).length,
      requiresFullScholarship: profile.requiresFullScholarship,
    };

    // The consent filter is in the query itself, so a non-consented row is
    // never even loaded into memory.
    const rows = await db
      .select()
      .from(applicationOutcomes)
      .where(and(eq(applicationOutcomes.shareConsent, true)));

    // Resolve university names for the consented rows only.
    const uniIds = [...new Set(rows.map((r) => r.universityId).filter((id): id is number => id !== null))];
    const uniNames = new Map<number, string>();
    if (uniIds.length > 0) {
      const uniRows = await db
        .select({ id: universities.id, name: universities.name })
        .from(universities)
        .where(inArray(universities.id, uniIds));
      uniRows.forEach((u) => uniNames.set(u.id, u.name));
    }

    const appIds = [...new Set(rows.map((r) => r.applicationId))];
    const appNames = new Map<number, string>();
    if (appIds.length > 0) {
      const appRows = await db
        .select({ id: applications.id, universityName: applications.universityName })
        .from(applications)
        .where(inArray(applications.id, appIds));
      appRows.forEach((a) => appNames.set(a.id, a.universityName));
    }

    const outcomes: OutcomeRecord[] = rows.map((r) => ({
      profile: {
        gpa4: gpaTo4(r.snapshotGpa, r.snapshotGpaScale),
        ielts: r.snapshotIelts,
        toefl: r.snapshotToefl,
        sat: r.snapshotSat,
        act: r.snapshotAct,
        major: r.snapshotMajor,
        country: r.snapshotCountry,
        degreeLevel: null,
        activityCount: parseListColumn(r.snapshotExtracurriculars).length,
        leadershipCount: 0,
        awardCount: 0,
      },
      universityName:
        (r.universityId != null ? uniNames.get(r.universityId) : null) ??
        appNames.get(r.applicationId) ??
        "A ScholarBridge university",
      result: (r.result as OutcomeRecord["result"]) ?? "rejected",
      shareConsent: true, // selected with that filter; stated for defence in depth
    }));

    const result = findSimilarProfiles(me, outcomes, {
      limit: Number(searchParams.get("limit")) || 10,
    });

    return NextResponse.json({
      ...result,
      // Reminds the UI that this is opt-in data, which is the whole model.
      consentNote:
        "Only students who chose to share their results appear here. Rejections are included — a dataset of acceptances alone would teach the wrong lesson.",
      myConsent: Boolean(profile.dataShareConsent),
    });
  } catch (error) {
    console.error("GET /api/similar-profiles error:", error);
    return NextResponse.json({ error: "Failed to find similar profiles" }, { status: 500 });
  }
}
