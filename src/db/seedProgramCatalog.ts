import { and, eq, sql } from "drizzle-orm";
import { db } from "./index";
import {
  applicationCycles,
  programSources,
  sources,
  universityPrograms,
  universities,
} from "./schema";
import { normalizeUniversityName, UNIVERSITY_NAME_ALIAS_GROUPS } from "./seedUniversityCatalog";

export interface SeedProgramCatalogSummary {
  universitiesMatched: number;
  programsInserted: number;
  requirementsInserted: number;
  cyclesInserted: number;
}

const VERIFIED_AT = new Date("2026-10-22T00:00:00.000Z");

/** Programme identity and facts are taken only from the linked official course page. */
export const VERIFIED_PROGRAM_SEEDS = [
  {
    aliases: ["Massachusetts Institute of Technology", "Massachusetts Institute of Technology (MIT)", "MIT"],
    name: "6-3 Computer Science and Engineering",
    field: "Computer Science and Engineering",
    degree: "Bachelor",
    durationYears: 4,
    studyMode: "full-time",
    language: "English",
    programUrl: "https://www.eecs.mit.edu/academics/undergraduate-programs/curriculum/6-3-computer-science-and-engineering/",
    applicationUrl: "https://www.eecs.mit.edu/academics/undergraduate-programs/",
    description: "MIT EECS undergraduate major; see the official curriculum page for current requirements.",
  },
  {
    aliases: ["University of Oxford"],
    name: "MSc Advanced Computer Science",
    field: "Computer Science",
    degree: "Master",
    durationYears: 1,
    studyMode: "full-time",
    language: "English",
    programUrl: "https://www.ox.ac.uk/admissions/graduate/courses/msc-advanced-computer-science",
    applicationUrl: "https://www.ox.ac.uk/admissions/graduate/applying-to-oxford",
    description: "Oxford graduate course listing; course-specific entry and funding details are maintained on the official page.",
    applicationCycle: {
      academicYear: "2027-2028",
      intake: "Fall",
      deadline: "2027-01-06",
    },
  },
  {
    aliases: ["Technical University of Munich", "Technical University of Munich (TUM)", "TUM"],
    name: "Informatics (M.Sc.)",
    field: "Informatics",
    degree: "Master",
    durationYears: 2,
    studyMode: "full-time",
    language: "English",
    tuitionAmount: 6000,
    tuitionCurrency: "EUR",
    tuitionPeriod: "semester",
    programUrl: "https://www.tum.de/en/studies/degree-programs/detail/informatics-master-of-science-msc",
    applicationUrl: "https://campus.tum.de/",
    description: "Four-semester Informatics M.Sc. TUM lists a €6,000 per-semester third-country tuition fee for this programme; fees and waivers are programme- and applicant-specific.",
    applicationCycle: {
      academicYear: "2026-2027",
      intake: "Summer",
      openingDate: "2026-10-01",
      deadline: "2026-11-30",
    },
  },
] as const;

function matchUniversity(names: string[], aliases: readonly (readonly string[])[], rows: typeof universities.$inferSelect[]) {
  const normalized = new Set(names.map(normalizeUniversityName));
  const aliasGroup = aliases.find((group) => group.some((alias) => normalized.has(normalizeUniversityName(alias))));
  if (!aliasGroup) return undefined;
  const group = new Set(aliasGroup.map(normalizeUniversityName));
  return rows.find((row) => group.has(normalizeUniversityName(row.name)) || (row.canonicalName && group.has(normalizeUniversityName(row.canonicalName))) || (row.shortName && group.has(normalizeUniversityName(row.shortName))));
}

async function ensureSource(url: string, title: string): Promise<number> {
  await db.insert(sources).values({
    url,
    title,
    domain: new URL(url).hostname,
    sourceType: "official_program_page",
    accessedAt: VERIFIED_AT,
    isOfficial: true,
    isVerified: true,
  }).onConflictDoNothing();
  const [source] = await db.select({ id: sources.id }).from(sources).where(eq(sources.url, url)).limit(1);
  if (!source) throw new Error(`Unable to resolve source row for ${url}`);
  return source.id;
}

/** Add only exact, source-backed seed rows. Existing rows and administrator values are never updated. */
export async function seedProgramCatalog(): Promise<SeedProgramCatalogSummary> {
  const summary: SeedProgramCatalogSummary = { universitiesMatched: 0, programsInserted: 0, requirementsInserted: 0, cyclesInserted: 0 };
  const universityRows = await db.select().from(universities);
  const matchedGroups = UNIVERSITY_NAME_ALIAS_GROUPS.filter((group) =>
    universityRows.some((row) => group.some((alias) => {
      const target = normalizeUniversityName(alias);
      return normalizeUniversityName(row.name) === target || normalizeUniversityName(row.canonicalName ?? "") === target || normalizeUniversityName(row.shortName ?? "") === target;
    })),
  );
  summary.universitiesMatched = matchedGroups.length;

  for (const spec of VERIFIED_PROGRAM_SEEDS) {
    const university = matchUniversity([...spec.aliases], UNIVERSITY_NAME_ALIAS_GROUPS, universityRows);
    if (!university) continue;
    const [inserted] = await db.insert(universityPrograms).values({
      universityId: university.id,
      name: spec.name,
      field: spec.field,
      degree: spec.degree,
      durationYears: spec.durationYears,
      durationUnit: "years",
      studyMode: spec.studyMode,
      language: spec.language,
      ...( "tuitionAmount" in spec ? { tuitionAmount: spec.tuitionAmount, tuitionCurrency: spec.tuitionCurrency, tuitionPeriod: spec.tuitionPeriod } : {}),
      description: spec.description,
      programUrl: spec.programUrl,
      applicationUrl: spec.applicationUrl,
      isVerified: true,
      sourceUrl: spec.programUrl,
      lastVerifiedAt: VERIFIED_AT,
      verificationStatus: "verified",
      isActive: true,
    }).onConflictDoNothing().returning({ id: universityPrograms.id });
    if (inserted) summary.programsInserted += 1;

    const [program] = await db.select({ id: universityPrograms.id }).from(universityPrograms).where(and(
      eq(universityPrograms.universityId, university.id),
      sql`lower(btrim(${universityPrograms.name})) = ${spec.name.toLowerCase()}`,
      sql`lower(btrim(coalesce(${universityPrograms.degree}, ''))) = ${spec.degree.toLowerCase()}`,
    )).limit(1);
    if (!program) continue;
    const sourceId = await ensureSource(spec.programUrl, `${spec.name} — official programme page`);
    const linked = await db.select({ id: programSources.id }).from(programSources).where(and(
      eq(programSources.programId, program.id), eq(programSources.sourceId, sourceId),
    )).limit(1);
    if (!linked.length) await db.insert(programSources).values({ programId: program.id, sourceId, sourceType: "program_evidence" });

    if ("applicationCycle" in spec) {
      const cycle = spec.applicationCycle;
      const cycleInserted = await db.transaction(async (tx) => {
        const lockKey = `scholarbridge:seed:application-cycle:${university.id}:${program.id}:${cycle.academicYear}:${cycle.intake}`;
        await tx.execute(sql`SELECT pg_advisory_xact_lock(hashtext(${lockKey}))`);
        const [existingCycle] = await tx.select({ id: applicationCycles.id }).from(applicationCycles).where(and(
          eq(applicationCycles.universityId, university.id), eq(applicationCycles.programId, program.id),
          eq(applicationCycles.academicYear, cycle.academicYear), eq(applicationCycles.intake, cycle.intake),
        )).limit(1);
        if (existingCycle) return false;
        await tx.insert(applicationCycles).values({
          universityId: university.id,
          programId: program.id,
          academicYear: cycle.academicYear,
          intake: cycle.intake,
          applicationType: "Direct Application",
          openingDate: "openingDate" in cycle ? cycle.openingDate : null,
          deadline: cycle.deadline,
          applicationUrl: spec.applicationUrl,
          sourceUrl: spec.programUrl,
          sourceId,
          lastVerifiedAt: VERIFIED_AT,
          verificationStatus: "verified",
        });
        return true;
      });
      if (cycleInserted) summary.cyclesInserted += 1;
    }
  }

  // No generic numeric admission requirements are inferred from programme pages.
  return summary;
}
