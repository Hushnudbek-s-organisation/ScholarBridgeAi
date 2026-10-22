import { and, eq, isNull, or, sql } from "drizzle-orm";
import { db } from "./index";
import { sources, universities, universitySources } from "./schema";
import { normalizeUniversityName } from "./seedUniversityCatalog";

const VERIFIED_AT = new Date("2026-10-22T00:00:00.000Z");
const QS_2027 = "https://www.topuniversities.com/qs-top-uni-wur";
export const VERIFIED_QS_2027 = [
  { aliases: ["Massachusetts Institute of Technology", "Massachusetts Institute of Technology (MIT)", "MIT"], rank: 1, sourceUrl: "https://www.topuniversities.com/universities/massachusetts-institute-technology-mit" },
  { aliases: ["University of Oxford"], rank: 4, sourceUrl: "https://www.topuniversities.com/universities/university-oxford" },
  { aliases: ["Technical University of Munich", "Technical University of Munich (TUM)", "TUM"], rank: 25, sourceUrl: "https://www.topuniversities.com/universities/technical-university-munich" },
  { aliases: ["University of Toronto", "The University of Toronto", "U of T"], rank: 32, sourceUrl: "https://www.topuniversities.com/universities/university-toronto" },
] as const;

const TUM_TUITION_URL = "https://www.tum.de/en/studies/fees/tuition";
const TUM_DESCRIPTION = "Top German technical university (QS World University Rankings 2027 #25). TUM's published non-EU tuition is programme-specific: currently typically €2,000–€3,000/semester for Bachelor's and €4,000–€6,000/semester for Master's programmes. TUM has announced higher fee bands for new entrants from winter semester 2027/28. Waivers and scholarships may be available; see the official TUM fee pages. Annual USD tuition is not stated because fees vary by programme, semester count, and exchange rate.";

async function ensureSource(url: string, title: string): Promise<number> {
  await db.insert(sources).values({
    url, title, domain: new URL(url).hostname, sourceType: "official_ranking_or_tuition",
    accessedAt: VERIFIED_AT, isOfficial: true, isVerified: true,
  }).onConflictDoNothing();
  const [source] = await db.select({ id: sources.id }).from(sources).where(eq(sources.url, url)).limit(1);
  if (!source) throw new Error(`Unable to resolve source row for ${url}`);
  return source.id;
}

export async function seedVerifiedUniversityFacts(): Promise<number> {
  const rows = await db.select().from(universities);
  let updated = 0;
  const qsSourceId = await ensureSource(QS_2027, "QS World University Rankings 2027");
  const tumSourceId = await ensureSource(TUM_TUITION_URL, "TUM tuition fees for international students");
  for (const fact of VERIFIED_QS_2027) {
    const aliases = new Set(fact.aliases.map(normalizeUniversityName));
    const row = rows.find((candidate) => aliases.has(normalizeUniversityName(candidate.name)) || aliases.has(normalizeUniversityName(candidate.canonicalName ?? "")) || aliases.has(normalizeUniversityName(candidate.shortName ?? "")));
    if (!row) continue;
    // Only fill verified fields that have not already been set. Never overwrite administrator curation.
    const canRefreshRank = row.worldRanking == null || (row.verificationStatus === "unverified" && !row.dataSource);
    const isLegacyTUMDescription = fact.rank === 25 && (/^Institution record; current programme/.test(row.description) || row.description.startsWith("Europe's leading technical university with virtually free/low tuition"));
    const changed = canRefreshRank || isLegacyTUMDescription
      ? await db.update(universities).set({
          ...(canRefreshRank ? { worldRanking: fact.rank, qsRankYear: 2027, dataSource: "QS World University Rankings 2027", sourceUrl: fact.sourceUrl, lastVerifiedAt: VERIFIED_AT, verificationStatus: "verified" } : {}),
          ...(isLegacyTUMDescription ? { description: TUM_DESCRIPTION } : {}),
        }).where(and(
          eq(universities.id, row.id),
          or(isNull(universities.worldRanking), and(eq(universities.verificationStatus, "unverified"), isNull(universities.dataSource))),
        )).returning({ id: universities.id })
      : [];
    if (changed.length) updated += 1;
    const linked = await db.select({ id: universitySources.id }).from(universitySources).where(and(
      eq(universitySources.universityId, row.id), eq(universitySources.sourceId, fact.rank === 25 ? tumSourceId : qsSourceId),
    )).limit(1);
    if (!linked.length) await db.insert(universitySources).values({ universityId: row.id, sourceId: fact.rank === 25 ? tumSourceId : qsSourceId, sourceType: fact.rank === 25 ? "tuition" : "ranking" });
    if (fact.rank === 25) {
      const existingQs = await db.select({ id: universitySources.id }).from(universitySources).where(and(eq(universitySources.universityId, row.id), eq(universitySources.sourceId, qsSourceId))).limit(1);
      if (!existingQs.length) await db.insert(universitySources).values({ universityId: row.id, sourceId: qsSourceId, sourceType: "ranking" });
      // Replace only the old, known synthetic TUM summary; leave all custom descriptions alone.
      if (/^Institution record; current programme/.test(row.description)) {
        await db.update(universities).set({ description: TUM_DESCRIPTION }).where(and(eq(universities.id, row.id), sql`${universities.description} LIKE 'Institution record; current programme%'`));
      }
    }
  }
  return updated;
}
