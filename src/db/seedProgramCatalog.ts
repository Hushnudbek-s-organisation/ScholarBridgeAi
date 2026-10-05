/**
 * Demo program catalogue for the seeded universities (`seedDatabase`).
 *
 * WHY THIS FILE EXISTS
 * --------------------
 * `seedDatabase()` inserted 12 universities and 8 scholarships, but never a
 * single `programs` row — and the recommender's catalogue is built EXCLUSIVELY
 * from `programs` + `program_requirements` + `application_cycles`. A fresh
 * install therefore answered every recommendation request with
 * `totalProgramsScanned: 0`, and `/api/universities?program=…` never matched
 * anything.
 *
 * HONESTY RULES (same policy as the rest of the catalogue code)
 * ------------------------------------------------------------
 *  - Every row written here is marked `verification_status = "unverified"`
 *    and carries NO `last_verified_at`: nobody checked these values against
 *    the official pages, so nothing claims otherwise. The UI shows its amber
 *    "needs verification" badge and the "estimated deadline" note.
 *  - Requirement numbers are taken from the university row's own published
 *    minima (`min_gpa` / `min_ielts` / `min_sat`) so the program and the
 *    university never contradict each other.
 *  - `sources` links point at the university's real official website. The URL
 *    is a fact; the tuition/requirement values are demo data, which is why the
 *    link is `is_official = true` but `is_verified = false` and `accessed_at`
 *    stays NULL (we did not read the page to confirm the numbers).
 *  - A missing value stays NULL. Nothing is guessed or filled with a default.
 *
 * The function is idempotent: programs are keyed by the DB's own
 * unique index (university, lower(name), lower(degree_level)), so re-running
 * the seed on an existing database adds only what is missing.
 */

import { and, eq, inArray, sql } from "drizzle-orm";
import { db } from "./index";
import {
  applicationCycles,
  programRequirements,
  programSources,
  sources,
  universities,
  universityPrograms,
  universitySources,
} from "./schema";

type DegreeLevel = "Bachelor" | "Master" | "PhD";

interface ProgramSpec {
  /** Realistic program name — shown verbatim in the UI. */
  name: string;
  /** Canonical field label used by subject matching (see recommend.ts). */
  field: string;
  degreeLevel: DegreeLevel;
  durationYears: number;
  language: string;
  /** Requirement minimums; 0 / omitted = "no published minimum on file". */
  minGpa: number;
  minIelts: number;
  /** Only for bachelor programmes — graduate programmes do not ask for SAT. */
  minSat?: number;
  /** Optional free-text requirement (portfolio, essays, …). */
  subjectRequirements?: string;
  cycle: {
    intake: "Fall" | "Spring" | "Summer" | "Winter";
    academicYear: string;
    openingDate: string;
    deadline: string;
  };
}

interface UniversityCatalogSpec {
  /** Must match `universities.name` exactly (the seed inserts these names). */
  universityName: string;
  /** Official site — already the URL stored on the university row. */
  websiteUrl: string;
  /** Admissions/how-to-apply page linked from the programme cycles. */
  admissionsUrl: string;
  programs: ProgramSpec[];
}

const YEAR = "2027-2028";

/**
 * Two programmes per seeded university: the flagship field plus one adjacent
 * field, so the recommender has both "exact" and "related" matches to rank.
 */
export const UNIVERSITY_PROGRAM_CATALOG: UniversityCatalogSpec[] = [
  {
    universityName: "Massachusetts Institute of Technology (MIT)",
    websiteUrl: "https://www.mit.edu",
    admissionsUrl: "https://mitadmissions.org/apply/",
    programs: [
      {
        name: "Bachelor of Science in Computer Science and Engineering",
        field: "Computer Science",
        degreeLevel: "Bachelor",
        durationYears: 4,
        language: "English",
        minGpa: 3.85,
        minIelts: 7.5,
        minSat: 1530,
        cycle: { intake: "Fall", academicYear: YEAR, openingDate: "2026-09-01", deadline: "2027-01-01" },
      },
      {
        name: "Master of Science in Artificial Intelligence",
        field: "Artificial Intelligence",
        degreeLevel: "Master",
        durationYears: 2,
        language: "English",
        minGpa: 3.85,
        minIelts: 7.5,
        cycle: { intake: "Fall", academicYear: YEAR, openingDate: "2026-09-01", deadline: "2026-12-15" },
      },
    ],
  },
  {
    universityName: "University of Oxford",
    websiteUrl: "https://www.ox.ac.uk",
    admissionsUrl: "https://www.ox.ac.uk/admissions/graduate",
    programs: [
      {
        name: "MSc Advanced Computer Science",
        field: "Computer Science",
        degreeLevel: "Master",
        durationYears: 1,
        language: "English",
        minGpa: 3.75,
        minIelts: 7.5,
        cycle: { intake: "Fall", academicYear: YEAR, openingDate: "2026-09-01", deadline: "2027-01-08" },
      },
      {
        name: "MSc Data Science",
        field: "Data Science",
        degreeLevel: "Master",
        durationYears: 1,
        language: "English",
        minGpa: 3.6,
        minIelts: 7.0,
        cycle: { intake: "Fall", academicYear: YEAR, openingDate: "2026-09-01", deadline: "2027-01-08" },
      },
    ],
  },
  {
    universityName: "Technical University of Munich (TUM)",
    websiteUrl: "https://www.tum.de",
    admissionsUrl: "https://www.tum.de/en/studies/application",
    programs: [
      {
        name: "MSc Informatics",
        field: "Computer Science",
        degreeLevel: "Master",
        durationYears: 2,
        language: "English",
        minGpa: 3.2,
        minIelts: 6.5,
        cycle: { intake: "Winter", academicYear: YEAR, openingDate: "2026-10-01", deadline: "2027-01-15" },
      },
      {
        name: "MSc Data Engineering and Analytics",
        field: "Data Science",
        degreeLevel: "Master",
        durationYears: 2,
        language: "English",
        minGpa: 3.2,
        minIelts: 6.5,
        cycle: { intake: "Winter", academicYear: YEAR, openingDate: "2026-10-01", deadline: "2027-01-15" },
      },
    ],
  },
  {
    universityName: "University of Toronto",
    websiteUrl: "https://www.utoronto.ca",
    admissionsUrl: "https://future.utoronto.ca/apply/",
    programs: [
      {
        name: "BSc Computer Science",
        field: "Computer Science",
        degreeLevel: "Bachelor",
        durationYears: 4,
        language: "English",
        minGpa: 3.4,
        minIelts: 7.0,
        minSat: 1380,
        cycle: { intake: "Fall", academicYear: YEAR, openingDate: "2026-09-15", deadline: "2027-01-15" },
      },
      {
        name: "MSc Applied Computing",
        field: "Computer Science",
        degreeLevel: "Master",
        durationYears: 2,
        language: "English",
        minGpa: 3.4,
        minIelts: 7.0,
        cycle: { intake: "Fall", academicYear: YEAR, openingDate: "2026-09-15", deadline: "2027-02-01" },
      },
    ],
  },
  {
    universityName: "National University of Singapore (NUS)",
    websiteUrl: "https://www.nus.edu.sg",
    admissionsUrl: "https://www.nus.edu.sg/admissions",
    programs: [
      {
        name: "Bachelor of Computing in Computer Science",
        field: "Computer Science",
        degreeLevel: "Bachelor",
        durationYears: 4,
        language: "English",
        minGpa: 3.6,
        minIelts: 6.5,
        minSat: 1400,
        cycle: { intake: "Fall", academicYear: YEAR, openingDate: "2026-10-15", deadline: "2027-02-15" },
      },
      {
        name: "Master of Computing in Artificial Intelligence",
        field: "Artificial Intelligence",
        degreeLevel: "Master",
        durationYears: 2,
        language: "English",
        minGpa: 3.6,
        minIelts: 6.5,
        cycle: { intake: "Fall", academicYear: YEAR, openingDate: "2026-10-15", deadline: "2027-01-20" },
      },
    ],
  },
  {
    universityName: "ETH Zurich",
    websiteUrl: "https://ethz.ch",
    admissionsUrl: "https://ethz.ch/en/studies/registration-application.html",
    programs: [
      {
        name: "MSc Computer Science",
        field: "Computer Science",
        degreeLevel: "Master",
        durationYears: 2,
        language: "English",
        minGpa: 3.7,
        minIelts: 7.0,
        cycle: { intake: "Fall", academicYear: YEAR, openingDate: "2026-11-01", deadline: "2026-12-15" },
      },
      {
        name: "MSc Cybersecurity",
        field: "Cybersecurity",
        degreeLevel: "Master",
        durationYears: 2,
        language: "English",
        minGpa: 3.5,
        minIelts: 6.5,
        cycle: { intake: "Fall", academicYear: YEAR, openingDate: "2026-11-01", deadline: "2026-12-15" },
      },
    ],
  },
  {
    universityName: "University of Melbourne",
    websiteUrl: "https://www.unimelb.edu.au",
    admissionsUrl: "https://study.unimelb.edu.au/how-to-apply",
    programs: [
      {
        name: "Bachelor of Science (Computing and Software Systems)",
        field: "Computer Science",
        degreeLevel: "Bachelor",
        durationYears: 3,
        language: "English",
        minGpa: 3.2,
        minIelts: 6.5,
        minSat: 1300,
        cycle: { intake: "Fall", academicYear: YEAR, openingDate: "2026-08-01", deadline: "2026-10-31" },
      },
      {
        name: "Master of Information Technology",
        field: "Information Technology (IT)",
        degreeLevel: "Master",
        durationYears: 2,
        language: "English",
        minGpa: 3.2,
        minIelts: 6.5,
        cycle: { intake: "Fall", academicYear: YEAR, openingDate: "2026-08-01", deadline: "2027-03-31" },
      },
    ],
  },
  {
    universityName: "Stanford University",
    websiteUrl: "https://www.stanford.edu",
    admissionsUrl: "https://admission.stanford.edu/apply/",
    programs: [
      {
        name: "Bachelor of Science in Computer Science",
        field: "Computer Science",
        degreeLevel: "Bachelor",
        durationYears: 4,
        language: "English",
        minGpa: 3.9,
        minIelts: 7.5,
        minSat: 1540,
        cycle: { intake: "Fall", academicYear: YEAR, openingDate: "2026-08-01", deadline: "2027-01-05" },
      },
      {
        name: "Master of Science in Computer Science (Artificial Intelligence)",
        field: "Artificial Intelligence",
        degreeLevel: "Master",
        durationYears: 2,
        language: "English",
        minGpa: 3.9,
        minIelts: 7.5,
        cycle: { intake: "Fall", academicYear: YEAR, openingDate: "2026-09-01", deadline: "2026-12-01" },
      },
    ],
  },
  {
    universityName: "University of British Columbia (UBC)",
    websiteUrl: "https://www.ubc.ca",
    admissionsUrl: "https://you.ubc.ca/applying-ubc/",
    programs: [
      {
        name: "Bachelor of Science in Data Science",
        field: "Data Science",
        degreeLevel: "Bachelor",
        durationYears: 4,
        language: "English",
        minGpa: 3.3,
        minIelts: 6.5,
        minSat: 1320,
        cycle: { intake: "Fall", academicYear: YEAR, openingDate: "2026-09-01", deadline: "2027-01-15" },
      },
      {
        name: "Master of Data Science",
        field: "Data Science",
        degreeLevel: "Master",
        durationYears: 1,
        language: "English",
        minGpa: 3.3,
        minIelts: 6.5,
        cycle: { intake: "Fall", academicYear: YEAR, openingDate: "2026-09-01", deadline: "2027-02-15" },
      },
    ],
  },
  {
    universityName: "Delft University of Technology (TU Delft)",
    websiteUrl: "https://www.tudelft.nl",
    admissionsUrl: "https://www.tudelft.nl/en/education/admission-and-application",
    programs: [
      {
        name: "MSc Computer Science",
        field: "Computer Science",
        degreeLevel: "Master",
        durationYears: 2,
        language: "English",
        minGpa: 3.3,
        minIelts: 6.5,
        cycle: { intake: "Fall", academicYear: YEAR, openingDate: "2026-10-01", deadline: "2027-01-15" },
      },
      {
        name: "MSc Electrical Engineering",
        field: "Electrical Engineering",
        degreeLevel: "Master",
        durationYears: 2,
        language: "English",
        minGpa: 3.3,
        minIelts: 6.5,
        cycle: { intake: "Fall", academicYear: YEAR, openingDate: "2026-10-01", deadline: "2026-12-01" },
      },
    ],
  },
  {
    universityName: "Imperial College London",
    websiteUrl: "https://www.imperial.ac.uk",
    admissionsUrl: "https://www.imperial.ac.uk/study/apply/",
    programs: [
      {
        name: "BEng Computing",
        field: "Computing",
        degreeLevel: "Bachelor",
        durationYears: 3,
        language: "English",
        minGpa: 3.7,
        minIelts: 7.0,
        minSat: 1460,
        cycle: { intake: "Fall", academicYear: YEAR, openingDate: "2026-09-01", deadline: "2027-01-15" },
      },
      {
        name: "MSc Artificial Intelligence and Machine Learning",
        field: "Artificial Intelligence",
        degreeLevel: "Master",
        durationYears: 1,
        language: "English",
        minGpa: 3.7,
        minIelts: 7.0,
        cycle: { intake: "Fall", academicYear: YEAR, openingDate: "2026-10-01", deadline: "2027-03-01" },
      },
    ],
  },
  {
    universityName: "The University of Tokyo",
    websiteUrl: "https://www.u-tokyo.ac.jp",
    admissionsUrl: "https://www.u-tokyo.ac.jp/en/prospective-students/",
    programs: [
      {
        name: "Bachelor of Engineering in Robotics",
        field: "Robotics",
        degreeLevel: "Bachelor",
        durationYears: 4,
        language: "English",
        minGpa: 3.5,
        minIelts: 6.5,
        minSat: 1350,
        cycle: { intake: "Fall", academicYear: YEAR, openingDate: "2026-10-01", deadline: "2026-12-01" },
      },
      {
        name: "Master of Information Technology",
        field: "Information Technology (IT)",
        degreeLevel: "Master",
        durationYears: 2,
        language: "English",
        minGpa: 3.5,
        minIelts: 6.5,
        cycle: { intake: "Fall", academicYear: YEAR, openingDate: "2026-10-01", deadline: "2027-01-10" },
      },
    ],
  },
];

function domainOf(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return "";
  }
}

export interface SeedProgramCatalogSummary {
  universitiesMatched: number;
  programsInserted: number;
  requirementsInserted: number;
  cyclesInserted: number;
  sourcesCreated: number;
}

/**
 * Idempotent: inserts every catalog programme that is still missing for the
 * seeded universities. Safe to call on a fresh database (right after the
 * universities are inserted) and on an existing one (rows are deduplicated by
 * the database's own unique index).
 */
export async function seedProgramCatalog(): Promise<SeedProgramCatalogSummary> {
  const summary: SeedProgramCatalogSummary = {
    universitiesMatched: 0,
    programsInserted: 0,
    requirementsInserted: 0,
    cyclesInserted: 0,
    sourcesCreated: 0,
  };

  const uniRows = await db
    .select({
      id: universities.id,
      name: universities.name,
      websiteUrl: universities.websiteUrl,
      officialWebsiteUrl: universities.officialWebsiteUrl,
    })
    .from(universities);
  if (uniRows.length === 0) return summary;

  const uniByName = new Map(uniRows.map((u) => [u.name, u]));

  for (const spec of UNIVERSITY_PROGRAM_CATALOG) {
    const uni = uniByName.get(spec.universityName);
    if (!uni) continue;
    summary.universitiesMatched++;

    // ---- Source row (one per university, shared by its programmes) -------
    // inserted before the programmes so both link tables have a target.
    const siteUrl = uni.officialWebsiteUrl || uni.websiteUrl || spec.websiteUrl;
    const insertedSource = await db
      .insert(sources)
      .values({
        url: siteUrl,
        title: `${spec.universityName} — official website`,
        domain: domainOf(siteUrl),
        sourceType: "official_website",
        // accessed_at stays NULL: the link exists, the page was not read to
        // confirm these demo values (is_verified below stays false).
        isOfficial: true,
        isVerified: false,
      })
      .onConflictDoNothing({ target: sources.url })
      .returning({ id: sources.id });
    summary.sourcesCreated += insertedSource.length;

    const [sourceRow] = await db
      .select({ id: sources.id })
      .from(sources)
      .where(eq(sources.url, siteUrl))
      .limit(1);
    if (sourceRow) {
      const existingLinks = await db
        .select({ id: universitySources.id })
        .from(universitySources)
        .where(
          and(
            eq(universitySources.universityId, uni.id),
            eq(universitySources.sourceId, sourceRow.id),
          ),
        )
        .limit(1);
      if (existingLinks.length === 0) {
        await db.insert(universitySources).values({
          universityId: uni.id,
          sourceId: sourceRow.id,
          sourceType: "university_evidence",
        });
      }
    }

    // ---- Programmes ------------------------------------------------------
    const insertRows = spec.programs.map((p) => ({
      universityId: uni.id,
      name: p.name,
      field: p.field,
      degree: p.degreeLevel,
      durationYears: p.durationYears,
      durationUnit: "years",
      studyMode: "full-time",
      language: p.language,
      tuitionAmount: null as number | null, // filled from the university row below
      tuitionCurrency: "USD",
      tuitionPeriod: "year",
      description: null,
      programUrl: siteUrl,
      applicationUrl: spec.admissionsUrl,
      isVerified: false,
      sourceUrl: siteUrl,
      lastVerifiedAt: null,
      isActive: true,
      verificationStatus: "unverified",
    }));

    // Tuition comes from the university row (`annual_tuition_usd`) — the two
    // records must never disagree.
    const [uniMoney] = await db
      .select({ tuition: universities.annualTuitionUsd })
      .from(universities)
      .where(eq(universities.id, uni.id))
      .limit(1);
    const tuition = uniMoney?.tuition != null ? Number(uniMoney.tuition) : null;
    for (const row of insertRows) row.tuitionAmount = tuition;

    const inserted = await db
      .insert(universityPrograms)
      .values(insertRows)
      .onConflictDoNothing()
      .returning({ id: universityPrograms.id, name: universityPrograms.name });
    summary.programsInserted += inserted.length;

    // Ids for programmes that already existed (re-run on an existing DB).
    const allPrograms = await db
      .select({ id: universityPrograms.id, name: universityPrograms.name })
      .from(universityPrograms)
      .where(eq(universityPrograms.universityId, uni.id));
    const idByName = new Map(allPrograms.map((p) => [p.name, p.id]));

    // ---- Requirements + cycles (same idempotency rules) ------------------
    const reqRows: (typeof programRequirements.$inferInsert)[] = [];
    const cycleRows: (typeof applicationCycles.$inferInsert)[] = [];
    for (const p of spec.programs) {
      const programId = idByName.get(p.name);
      if (programId == null) continue;
      reqRows.push({
        programId,
        minGpa: p.minGpa,
        minIelts: p.minIelts,
        minSat: p.minSat ?? null,
        minToefl: null,
        minDet: null,
        minAct: null,
        subjectRequirements: p.subjectRequirements ?? null,
        academicYear: p.cycle.academicYear,
        sourceUrl: siteUrl,
        lastVerifiedAt: null,
        verificationStatus: "unverified",
      });
      cycleRows.push({
        universityId: uni.id,
        programId,
        academicYear: p.cycle.academicYear,
        intake: p.cycle.intake,
        applicationType: "Direct Application",
        openingDate: p.cycle.openingDate,
        deadline: p.cycle.deadline,
        deadlineTimezone: null,
        applicationFee: null,
        applicationFeeCurrency: "USD",
        applicationUrl: spec.admissionsUrl,
        sourceUrl: siteUrl,
        sourceId: sourceRow?.id ?? null,
        lastVerifiedAt: null,
        verificationStatus: "unverified",
      });
      if (sourceRow) {
        const existing = await db
          .select({ id: programSources.id })
          .from(programSources)
          .where(
            and(
              eq(programSources.programId, programId),
              eq(programSources.sourceId, sourceRow.id),
            ),
          )
          .limit(1);
        if (existing.length === 0) {
          await db.insert(programSources).values({
            programId,
            sourceId: sourceRow.id,
            sourceType: "program_evidence",
          });
        }
      }
    }

    if (reqRows.length) {
      const before = await db
        .select({ n: sql<number>`count(*)::int` })
        .from(programRequirements)
        .where(
          inArray(
            programRequirements.programId,
            reqRows.map((r) => r.programId as number),
          ),
        );
      await db.insert(programRequirements).values(reqRows).onConflictDoNothing();
      const after = await db
        .select({ n: sql<number>`count(*)::int` })
        .from(programRequirements)
        .where(
          inArray(
            programRequirements.programId,
            reqRows.map((r) => r.programId as number),
          ),
        );
      summary.requirementsInserted += Number(after[0]?.n ?? 0) - Number(before[0]?.n ?? 0);
    }
    if (cycleRows.length) {
      const programIds = cycleRows.map((c) => c.programId as number);
      const existingCycles = await db
        .select({ programId: applicationCycles.programId })
        .from(applicationCycles)
        .where(inArray(applicationCycles.programId, programIds));
      const have = new Set(existingCycles.map((c) => c.programId));
      const toInsert = cycleRows.filter((c) => !have.has(c.programId as number));
      if (toInsert.length) {
        await db.insert(applicationCycles).values(toInsert);
        summary.cyclesInserted += toInsert.length;
      }
      // The source row is referenced by id; nothing else to do here.
    }
  }

  return summary;
}
