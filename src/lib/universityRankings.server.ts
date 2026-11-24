import { and, desc, eq, inArray, isNotNull, sql } from "drizzle-orm";
import { db } from "@/db";
import { sources, universityRankings } from "@/db/schema";
import { sourcedQsRanking, type SourcedQsRanking } from "./universityRank";

export async function loadVerifiedQsRankings(universityIds: number[]): Promise<Map<number, SourcedQsRanking>> {
  const rankings = new Map<number, SourcedQsRanking>();
  if (!universityIds.length) return rankings;
  const rows = await db.select({
    universityId: universityRankings.universityId,
    rank: universityRankings.rank,
    rankLabel: universityRankings.rankLabel,
    year: universityRankings.rankingYear,
    sourceUrl: sources.url,
  })
    .from(universityRankings)
    .innerJoin(sources, eq(sources.id, universityRankings.sourceId))
    .where(and(
      inArray(universityRankings.universityId, universityIds),
      inArray(universityRankings.rankingProvider, ["QS", "QS Quacquarelli Symonds"]),
      eq(universityRankings.rankingName, "QS World University Rankings"),
      eq(universityRankings.verificationStatus, "verified"),
      isNotNull(universityRankings.verifiedAt),
      eq(sources.isOfficial, true),
      eq(sources.isVerified, true),
    ))
    .orderBy(
      desc(universityRankings.rankingYear),
      desc(sql`lower(${sources.domain}) in ('topuniversities.com', 'www.topuniversities.com')`),
      desc(universityRankings.verifiedAt),
      desc(universityRankings.id),
    );

  for (const row of rows) {
    if (rankings.has(row.universityId)) continue;
    const ranking = sourcedQsRanking(row);
    if (ranking) rankings.set(row.universityId, ranking);
  }
  return rankings;
}
