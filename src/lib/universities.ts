import { db } from "@/db";
import { universities } from "@/db/schema";

/**
 * Resilient university select: tries the full schema first. If the database
 * is missing an unexpected column (the DB is the source of truth and may
 * differ), falls back to a core subset so the list still works.
 *
 * Shared by the explorer list AND the university detail route: the detail's
 * profile match must come from the exact same row shape the list scores, or
 * the same university would show two different fit numbers in two screens.
 */
export async function selectUniversities() {
  try {
    return await db.select().from(universities);
  } catch {
    return await db
      .select({
        id: universities.id,
        name: universities.name,
        country: universities.country,
        city: universities.city,
        flagEmoji: universities.flagEmoji,
        worldRanking: universities.worldRanking,
        degreeLevel: universities.degreeLevel,
        programMajor: universities.programMajor,
        annualTuitionUsd: universities.annualTuitionUsd,
        annualLivingEstUsd: universities.annualLivingEstUsd,
        minGpa: universities.minGpa,
        minIelts: universities.minIelts,
        minSat: universities.minSat,
        acceptanceRate: universities.acceptanceRate,
        postStudyWorkVisaYears: universities.postStudyWorkVisaYears,
        description: universities.description,
        highlights: universities.highlights,
        websiteUrl: universities.websiteUrl,
        imageUrl: universities.imageUrl,
        verificationStatus: universities.verificationStatus,
        lastVerifiedAt: universities.lastVerifiedAt,
        sourceUrl: universities.sourceUrl,
      })
      .from(universities);
  }
}
