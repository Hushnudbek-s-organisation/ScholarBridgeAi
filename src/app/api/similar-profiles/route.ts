import { NextResponse } from "next/server";
import { db } from "@/db";
import { applicationOutcomes, applications, studentProfiles, universities } from "@/db/schema";
import { eq, inArray } from "drizzle-orm";
import { requireProfileAccess } from "@/lib/auth";
import { gpaTo40Scale } from "@/lib/gpa";
import {
  findSimilarProfiles,
  gpaTo4,
  normalizeOutcomeResult,
  type OutcomeRecord,
  type ProfileVector,
} from "@/lib/similarProfiles";
import { matchQsUniversityBenchmark, type QsUniversityBenchmark } from "@/lib/qsTop200Benchmarks";
import { ensureOutcomesAndStoriesSeeded } from "@/db/seedOutcomesAndStories";

/**
 * GET /api/similar-profiles — opt-in historical outcome examples only.
 *
 * The authenticated profile owner may see records explicitly shared by their
 * owners. Only fields needed for the heuristic comparison are selected from
 * the database. These records do not affect profile-to-catalogue fit or
 * admission estimates.
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

    await ensureOutcomesAndStoriesSeeded();

    const [profile] = await db.select().from(studentProfiles).where(eq(studentProfiles.id, profileId));
    if (!profile) {
      return NextResponse.json({ error: "Profile not found" }, { status: 404 });
    }

    const me: ProfileVector = {
      // The current profile follows the app-wide canonical policy: scale-less
      // values at or below 4.0 can be compared; larger unscaled values stay
      // unknown. Historical snapshots remain stricter and require an explicit
      // valid scale so imported records cannot inherit today's assumptions.
      gpa4: gpaTo40Scale(profile.gpa, profile.gpaScale),
      ielts: profile.ieltsScore,
      toefl: profile.toeflScore,
      sat: profile.satScore,
      act: profile.actScore,
      major: profile.targetMajor,
      country: profile.country,
      degreeLevel: profile.degreeLevel,
    };

    // Consent is enforced in SQL. Do not load notes, scholarship information,
    // profile ids, or other outcome columns that this read path does not need.
    const rows = await db
      .select({
        applicationId: applicationOutcomes.applicationId,
        universityId: applicationOutcomes.universityId,
        result: applicationOutcomes.result,
        snapshotGpa: applicationOutcomes.snapshotGpa,
        snapshotGpaScale: applicationOutcomes.snapshotGpaScale,
        snapshotIelts: applicationOutcomes.snapshotIelts,
        snapshotToefl: applicationOutcomes.snapshotToefl,
        snapshotSat: applicationOutcomes.snapshotSat,
        snapshotAct: applicationOutcomes.snapshotAct,
        snapshotMajor: applicationOutcomes.snapshotMajor,
        snapshotCountry: applicationOutcomes.snapshotCountry,
      })
      .from(applicationOutcomes)
      .where(eq(applicationOutcomes.shareConsent, true));

    const uniIds = [...new Set(rows.map((row) => row.universityId).filter((id): id is number => id !== null))];
    const uniNames = new Map<number, string>();
    const uniBenchmarksByName: Record<string, QsUniversityBenchmark> = {};
    if (uniIds.length > 0) {
      const uniRows = await db
        .select({
          id: universities.id,
          name: universities.name,
          canonicalName: universities.canonicalName,
          shortName: universities.shortName,
          country: universities.country,
          worldRanking: universities.worldRanking,
          acceptanceRate: universities.acceptanceRate,
          minGpa: universities.minGpa,
          minIelts: universities.minIelts,
          minSat: universities.minSat,
          websiteUrl: universities.websiteUrl,
          officialWebsiteUrl: universities.officialWebsiteUrl,
        })
        .from(universities)
        .where(inArray(universities.id, uniIds));
      uniRows.forEach((university) => {
        uniNames.set(university.id, university.name);
        uniBenchmarksByName[university.name] = matchQsUniversityBenchmark(university);
      });
    }

    // The application's own name is a fallback only when there is no linked
    // catalogue university. Limit that query to those rows.
    const appIds = [...new Set(rows.filter((row) => row.universityId === null).map((row) => row.applicationId))];
    const appNames = new Map<number, string>();
    if (appIds.length > 0) {
      const appRows = await db
        .select({ id: applications.id, universityName: applications.universityName })
        .from(applications)
        .where(inArray(applications.id, appIds));
      appRows.forEach((application) => appNames.set(application.id, application.universityName));
    }

    const decisionFilter = (searchParams.get("decision") ?? "").trim().toLowerCase();
    const universityFilter = (searchParams.get("university") ?? "").trim().toLowerCase();

    const outcomes: OutcomeRecord[] = rows.flatMap((row) => {
      // Legacy or malformed statuses are unknown; never turn them into a rejection.
      const result = normalizeOutcomeResult(row.result);
      if (!result) return [];
      if (decisionFilter && result !== decisionFilter) return [];

      const universityName = (
        (row.universityId !== null ? uniNames.get(row.universityId) : null) ?? appNames.get(row.applicationId) ?? null
      )?.trim() || null;

      if (universityFilter && (!universityName || !universityName.toLowerCase().includes(universityFilter))) {
        return [];
      }

      return [{
        profile: {
          gpa4: gpaTo4(row.snapshotGpa, row.snapshotGpaScale),
          ielts: row.snapshotIelts,
          toefl: row.snapshotToefl,
          sat: row.snapshotSat,
          act: row.snapshotAct,
          major: row.snapshotMajor,
          country: row.snapshotCountry,
          // The outcome snapshot does not include a degree level; keep it unknown.
          degreeLevel: null,
        },
        universityName,
        result,
        shareConsent: true, // selected with the consent predicate above
      }];
    });

    const rawLimit = Number(searchParams.get("limit"));
    const limit = Number.isFinite(rawLimit) && rawLimit > 0 ? Math.floor(rawLimit) : 10;
    const result = findSimilarProfiles(me, outcomes, { limit });

    if (searchParams.get("includeBenchmarks") === "1") {
      const benchmarks: Record<string, QsUniversityBenchmark> = {};
      for (const match of result.matches) {
        if (!match.universityName) continue;
        const b =
          uniBenchmarksByName[match.universityName] ??
          matchQsUniversityBenchmark({ name: match.universityName });
        benchmarks[match.universityName] = b;
      }
      return NextResponse.json({
        ...result,
        benchmarks,
      });
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error("GET /api/similar-profiles error:", error);
    return NextResponse.json({ error: "Failed to load shared outcome examples" }, { status: 500 });
  }
}
