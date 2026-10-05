import { NextResponse } from "next/server";
import { and, eq, inArray, sql } from "drizzle-orm";
import { db } from "@/db";
import {
  applications,
  applicationOutcomes,
  savedUniversities,
  studentProfiles,
  universities,
} from "@/db/schema";
import { requireProfileAccess } from "@/lib/auth";
import { calculateUniversityMatch } from "@/lib/matching";
import { chancingProfileWithActivities, toChancingUniversity, toMatchProfile, toUniversityData } from "@/lib/profileMapping";
import {
  ADMISSION_PROBABILITY,
  estimateAdmissionChance,
  type ChancingProfile,
  type ChancingUniversity,
  type OutcomeSample,
} from "@/lib/chancing";
import { assessDataset, type DatasetCounts } from "@/lib/dataset";

export const dynamic = "force-dynamic";

/**
 * Whole-corpus dataset readiness (strategy section).
 *
 * The chancing engine blends per-university outcomes, but the promise is to
 * grow 1k -> 100k records before any ML model is trained. This reports where
 * that corpus actually stands so the UI can stop short of claiming a model.
 *
 * Everything here is consented rows only.
 */
async function datasetReadiness() {
  try {
    const [byResult, breadth, students, fresh] = await Promise.all([
      db
        .select({
          result: applicationOutcomes.result,
          total: sql<number>`count(*)::int`,
        })
        .from(applicationOutcomes)
        .where(eq(applicationOutcomes.shareConsent, true))
        .groupBy(applicationOutcomes.result),
      db
        .select({
          unis: sql<number>`count(distinct ${applicationOutcomes.universityId})::int`,
          majors: sql<number>`count(distinct ${applicationOutcomes.snapshotMajor})::int`,
          countries: sql<number>`count(distinct ${applicationOutcomes.snapshotCountry})::int`,
        })
        .from(applicationOutcomes)
        .where(eq(applicationOutcomes.shareConsent, true)),
      db
        .select({ n: sql<number>`count(distinct ${applicationOutcomes.profileId})::int` })
        .from(applicationOutcomes)
        .where(eq(applicationOutcomes.shareConsent, true)),
      db
        .select({ n: sql<number>`count(*)::int` })
        .from(applicationOutcomes)
        .where(
          and(
            eq(applicationOutcomes.shareConsent, true),
            sql`${applicationOutcomes.createdAt} >= now() - interval '5 years'`
          )
        ),
    ]);

    const tally: Record<string, number> = {};
    let consented = 0;
    for (const row of byResult) {
      const v = Number(row.total) || 0;
      tally[row.result] = v;
      consented += v;
    }
    const recent = Number(fresh[0]?.n) || 0;

    const counts: DatasetCounts = {
      totalOutcomes: consented,
      consentedOutcomes: consented,
      withoutConsent: 0,
      accepted: tally.accepted ?? 0,
      rejected: tally.rejected ?? 0,
      waitlisted: tally.waitlisted ?? 0,
      deferred: tally.deferred ?? 0,
      withdrawn: tally.withdrawn ?? 0,
      distinctUniversities: Number(breadth[0]?.unis) || 0,
      distinctMajors: Number(breadth[0]?.majors) || 0,
      distinctCountries: Number(breadth[0]?.countries) || 0,
      distinctStudents: Number(students[0]?.n) || 0,
      freshShare: consented > 0 ? recent / consented : 0,
    };

    return assessDataset(counts);
  } catch (error) {
    // A readiness read must never break the estimate itself.
    console.error("datasetReadiness error:", error);
    return null;
  }
}

/**
 * Consented ScholarBridge outcomes for a set of universities.
 *
 * Only rows with `share_consent = true` are counted — a student who declined
 * never influences anyone else's estimate. Rejections count too: a model fed
 * only acceptances learns that every strong applicant gets in.
 */
async function outcomeSamples(universityIds: number[]): Promise<Map<number, OutcomeSample>> {
  const map = new Map<number, OutcomeSample>();
  if (!universityIds.length) return map;
  try {
    const rows = await db
      .select({
        universityId: applicationOutcomes.universityId,
        result: applicationOutcomes.result,
        total: sql<number>`count(*)::int`,
      })
      .from(applicationOutcomes)
      .where(
        and(
          eq(applicationOutcomes.shareConsent, true),
          inArray(applicationOutcomes.universityId, universityIds)
        )
      )
      .groupBy(applicationOutcomes.universityId, applicationOutcomes.result);

    for (const row of rows) {
      if (row.universityId == null) continue;
      const sample = map.get(row.universityId) ?? {
        accepted: 0,
        rejected: 0,
        waitlisted: 0,
        deferred: 0,
      };
      const key = row.result as keyof OutcomeSample;
      if (key in sample) sample[key] = Number(row.total) || 0;
      map.set(row.universityId, sample);
    }
  } catch (err) {
    // Missing table (migration not applied yet) must not break the estimate —
    // it just means "no ScholarBridge data yet", which the UI states openly.
    console.warn("[chancing] outcome sample unavailable:", (err as Error)?.message);
  }
  return map;
}

/**
 * GET /api/chancing?profileId=N&universityId=M     → one university
 * GET /api/chancing?profileId=N&all=1              → saved + tracked universities
 *
 * Returns the FIT score (requirements/affordability match) plus the
 * requirement SIGNALS (sub-scores, positives, negatives).
 *
 * PROBABILITY POLICY (2026-10): the admission probability dimension is
 * returned as `probability: ADMISSION_PROBABILITY` ({ available: false }) —
 * the numeric range is NOT exposed because no validated methodology +
 * outcome data exists yet. A fit score must never be read as a probability.
 */
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const access = await requireProfileAccess(req, searchParams.get("profileId"));
    if (!access.ok) {
      return NextResponse.json(
        { error: access.error, code: access.code },
        { status: access.status }
      );
    }
    const profileId = access.targetId!;

    const [profile] = await db
      .select()
      .from(studentProfiles)
      .where(eq(studentProfiles.id, profileId));
    if (!profile) {
      return NextResponse.json({ error: "Profile not found" }, { status: 404 });
    }
    const chancingProfile = await chancingProfileWithActivities(profile);
    const matchProfile = toMatchProfile(profile);

    // Which universities are we estimating?
    const singleId = Number(searchParams.get("universityId"));
    let universityIds: number[] = [];
    if (Number.isFinite(singleId) && singleId > 0) {
      universityIds = [singleId];
    } else {
      const [saved, tracked] = await Promise.all([
        db
          .select({ universityId: savedUniversities.universityId })
          .from(savedUniversities)
          .where(eq(savedUniversities.profileId, profileId)),
        db
          .select({ universityId: applications.universityId })
          .from(applications)
          .where(eq(applications.profileId, profileId)),
      ]);
      universityIds = [
        ...new Set(
          [...saved.map((s) => s.universityId), ...tracked.map((t) => t.universityId)].filter(
            (id): id is number => typeof id === "number" && id > 0
          )
        ),
      ];
    }

    if (!universityIds.length) {
      return NextResponse.json({ results: [], fitScore: null });
    }

    const unis = await db
      .select()
      .from(universities)
      .where(inArray(universities.id, universityIds));

    const samples = await outcomeSamples(universityIds);

    const results = unis.map((uni) => {
      const fit = calculateUniversityMatch(matchProfile, toUniversityData(uni));
      const estimate = estimateAdmissionChance(chancingProfile, toChancingUniversity(uni), {
        fitScore: fit.matchScore,
        outcomes: samples.get(uni.id) ?? null,
      });
      return {
        universityId: estimate.universityId,
        universityName: estimate.universityName,
        fitScore: estimate.fitScore,
        fitCategory: fit.matchCategory,
        fitReasons: fit.reasons,
        fitIssues: fit.potentialIssues,
        subScores: estimate.subScores,
        positives: estimate.positives,
        negatives: estimate.negatives,
        dataBasis: estimate.dataBasis,
        sampleSize: estimate.sampleSize,
        basisSource: estimate.basisSource,
        // The numeric admission range is intentionally NOT returned (see
        // policy header). Students see the probability dimension labelled
        // unavailable, never a percentage we cannot stand behind.
        probability: ADMISSION_PROBABILITY,
      };
    });

    const dataset = await datasetReadiness();

    return NextResponse.json({ results, dataset });
  } catch (error) {
    console.error("GET /api/chancing error:", error);
    return NextResponse.json({ error: "Failed to estimate admission chances" }, { status: 500 });
  }
}
