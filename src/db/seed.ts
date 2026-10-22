import { randomInt } from "crypto";
import { db } from "./index";
import { seedProgramCatalog } from "./seedProgramCatalog";
import { refreshSeededScholarshipCycles } from "./seedScholarshipCycles";
import { seedOpportunities } from "./seedOpportunities";
import { seedRichPlatformData, ensureRichPlatformDataSeeded } from "./seedRichPlatformData";
import { seedOutcomesAndStories, ensureOutcomesAndStoriesSeeded } from "./seedOutcomesAndStories";
import { ensureGrowthTables } from "@/lib/growth/db";
import { ensureJourneyTables } from "@/lib/journey/db";
import {
  studentProfiles,
  universities,
  scholarships,
  savedUniversities,
  savedScholarships,
  applicationTasks,
  forumCategories,
  forumThreads,
  forumReplies,
  courses,
  courseModules,
  lessons,
  quizzes,
  quizQuestions,
  levels,
  badges,
} from "./schema";
import { and, eq, or, sql } from "drizzle-orm";
import { MIN_PASSWORD_LENGTH, hashPassword } from "@/lib/password";

/** Local 8-char referral code generator (avoids importing gamification here). */
function makeReferralCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";
  for (let i = 0; i < 10; i++) {
    code += chars[randomInt(chars.length)];
  }
  return code;
}

/**
 * Owner recorded by the ownership feature (null when the table or row does
 * not exist yet — fresh installs, or before the first admin request).
 */
async function currentPlatformOwnerId(): Promise<number | null> {
  try {
    const reg = (await db.execute(sql`SELECT to_regclass('public.platform_ownership') AS t`)).rows as { t: string | null }[];
    if (!reg[0]?.t) return null;
    const rows = (await db.execute(sql`SELECT owner_profile_id FROM platform_ownership WHERE id = 1`)).rows as { owner_profile_id: number }[];
    return rows[0] ? Number(rows[0].owner_profile_id) : null;
  } catch {
    return null;
  }
}

/**
 * Process-level memoization for `seedDatabase()`.
 *
 * Before this guard every catalogue read ran the whole seed from scratch:
 * `GET /api/universities` and `GET /api/scholarships` each issued 150+ queries
 * (admin lookup, referral backfill, program catalogue, scholarship cycles,
 * opportunities, growth/journey DDL, rich platform data, outcomes & stories,
 * forum, courses, gamification) on EVERY filter change, search keystroke and
 * pagination click. The first call in a process now performs the real work;
 * every later call returns immediately (or awaits the in-flight run so two
 * concurrent cold requests never duplicate the writes).
 */
let seedDatabaseCompleted = false;
let seedDatabasePromise: Promise<void> | null = null;

/** Test/dev hook: forget the memoized seed so the next call runs again. */
export function resetSeedDatabaseCache() {
  seedDatabaseCompleted = false;
  seedDatabasePromise = null;
}

export async function seedDatabase(options?: { force?: boolean }): Promise<void> {
  if (!options?.force) {
    if (seedDatabaseCompleted) return;
    if (seedDatabasePromise) return seedDatabasePromise;
  }

  const run = runSeedDatabase(options?.force)
    .then(() => {
      seedDatabaseCompleted = true;
      seedDatabasePromise = null;
    })
    .catch((err) => {
      // A failed run must not be remembered as "done" — the next request
      // retries (a database that came up a second later still bootstraps).
      seedDatabasePromise = null;
      console.error("Error seeding database:", err);
    });

  seedDatabasePromise = run;
  return run;
}

/** Source-verified type top-ups for exact seed identities only. Unknown schools stay unknown. */
const VERIFIED_SEED_UNIVERSITY_TYPES = [
  // MIT describes itself as privately endowed: https://policies.mit.edu/policies-procedures/10-institute/12-description
  { name: "Massachusetts Institute of Technology (MIT)", websiteUrl: "https://www.mit.edu", type: "Private" },
  // Stanford identifies itself as a private university: https://freespeech.stanford.edu/policies-and-guidance/events-and-spaces/visitors-stanford
  { name: "Stanford University", websiteUrl: "https://www.stanford.edu", type: "Private" },
  // TUM legal notice says it is a public-law corporation and state institution: https://www.tum.de/en/about-tum/contact-directions/legal-notice
  { name: "Technical University of Munich (TUM)", websiteUrl: "https://www.tum.de", type: "Public" },
  // U of T calls itself a public research university: https://www.utoronto.ca/
  { name: "University of Toronto", websiteUrl: "https://www.utoronto.ca", type: "Public" },
  // UBC calls itself a public university: https://www.ubc.ca/
  { name: "University of British Columbia (UBC)", websiteUrl: "https://www.ubc.ca", type: "Public" },
] as const;

async function topUpVerifiedSeedUniversityTypes(): Promise<void> {
  for (const row of VERIFIED_SEED_UNIVERSITY_TYPES) {
    await db.update(universities).set({ universityType: row.type }).where(and(
      eq(universities.name, row.name),
      eq(universities.websiteUrl, row.websiteUrl),
      or(sql`${universities.universityType} IS NULL`, sql`btrim(${universities.universityType}) = ''`),
    ));
  }
}

async function runSeedDatabase(force = false) {
  try {
    // Bootstrap admin account — configured ONLY through env (no personal
    // defaults in code, so a new owner/host never inherits someone's email):
    //   ADMIN_EMAIL    — the bootstrap admin (required to create one)
    //   ADMIN_NAME     — display name; when unset an existing name is kept
    //   ADMIN_PASSWORD — (>= MIN_PASSWORD_LENGTH) applied only while the
    //                    account has no password; never overwrites a password
    //                    the owner set later in Edit Profile.
    // After a platform ownership transfer (platform_ownership row owned by
    // someone else) the seed never re-promotes ADMIN_EMAIL — otherwise every
    // restart would silently undo the transfer.
    const adminEmail = (process.env.ADMIN_EMAIL || "").trim().toLowerCase();
    const adminNameEnv = (process.env.ADMIN_NAME || "").trim();
    const adminPassword = (process.env.ADMIN_PASSWORD || "").trim();
    const adminHasPassword = adminPassword.length >= MIN_PASSWORD_LENGTH;
    if (adminPassword && !adminHasPassword) {
      console.warn(`ADMIN_PASSWORD ignored: it must be at least ${MIN_PASSWORD_LENGTH} characters.`);
    }
    if (adminEmail) {
      try {
        const [adminProfile] = await db
          .select()
          .from(studentProfiles)
          .where(sql`lower(${studentProfiles.email}) = ${adminEmail}`)
          .limit(1);
        const ownerId = await currentPlatformOwnerId();
        const transferredAway = ownerId !== null && (!adminProfile || ownerId !== adminProfile.id);
        if (adminProfile) {
          const needsPassword = adminHasPassword && !adminProfile.passwordHash;
          const needsPromotion = !adminProfile.isAdmin && !transferredAway;
          const needsRename = Boolean(adminNameEnv) && adminProfile.name !== adminNameEnv;
          if (needsPromotion || needsRename || needsPassword) {
            await db
              .update(studentProfiles)
              .set({
                ...(needsRename ? { name: adminNameEnv } : {}),
                ...(needsPromotion ? { isAdmin: true, onboardingCompleted: true, onboardingStep: 8 } : {}),
                ...(needsPassword ? { passwordHash: hashPassword(adminPassword) } : {}),
              })
              .where(eq(studentProfiles.id, adminProfile.id));
            console.log(
              `Ensured bootstrap admin (profile ${adminProfile.id})` +
                (needsPassword ? " — password set from ADMIN_PASSWORD." : ".")
            );
          } else if (!adminProfile.isAdmin && transferredAway) {
            console.log("ADMIN_EMAIL is no longer the platform owner — not re-promoting it.");
          }
        } else if (!transferredAway) {
          // Identity ONLY. The bootstrap account is an operator, not a student:
          // it must not carry an invented GPA/budget/major that the operator
          // never entered (spec §19) — an empty profile shows honest "not
          // provided yet" states everywhere. `onboardingCompleted` is set so the
          // operator lands in the admin area instead of the student wizard.
          const [created] = await db
            .insert(studentProfiles)
            .values({
              name: adminNameEnv || "Admin",
              email: adminEmail,
              isAdmin: true,
              onboardingCompleted: true,
              onboardingStep: 8,
              ...(adminHasPassword ? { passwordHash: hashPassword(adminPassword) } : {}),
            })
            .returning();
          console.log(`Created bootstrap admin account (profile ${created.id}).`);
        }
      } catch (err) {
        console.error("Failed to ensure admin account:", (err as Error)?.message);
      }
    }

    // No admin at all → say so. (The old "promote the first profile" fallback
    // was removed: on a public deployment it let whoever registered first
    // become an administrator.)
    const [existingAdmin] = await db
      .select({ id: studentProfiles.id })
      .from(studentProfiles)
      .where(eq(studentProfiles.isAdmin, true))
      .limit(1);
    if (!existingAdmin) {
      console.warn("No administrator exists. Set ADMIN_EMAIL and ADMIN_PASSWORD and restart to create one.");
    }

    // Referral & onboarding backfill (idempotent, runs on every load):
    //  - every EXISTING profile (created before the referral columns existed)
    //    gets a unique referral code if missing, and is treated as already
    //    onboarded so the wizard doesn't hijack old users.
    //  - NEW profiles are created with a referral code via the API (their
    //    onboardingStep stays 0 / onboardingCompleted false), so they are
    //    NOT touched here and the step-by-step wizard shows for them.
    try {
      // Only profiles that actually need a code are read — pulling every row
      // (with password hashes and financial fields) on each catalogue request
      // was pure overhead once every profile already had one.
      const profilesMissingReferral = await db
        .select()
        .from(studentProfiles)
        .where(sql`${studentProfiles.referralCode} IS NULL OR ${studentProfiles.referralCode} = ''`);
      for (const p of profilesMissingReferral) {
        if (!p.referralCode) {
          let code = makeReferralCode();
          for (let i = 0; i < 5; i++) {
            const clash = await db.select().from(studentProfiles).where(eq(studentProfiles.referralCode, code));
            if (clash.length === 0) break;
            code = makeReferralCode();
          }
          await db
            .update(studentProfiles)
            .set({
              referralCode: code,
              // Legacy profile (pre-wizard): mark it as already onboarded.
              onboardingCompleted: true,
              onboardingStep: 8,
            })
            .where(eq(studentProfiles.id, p.id));
        }
      }
    } catch (err) {
      console.error("Referral/onboarding backfill failed:", err);
    }

    // Check if universities already seeded
    const existingUnis = await db.select().from(universities).limit(1);
    if (existingUnis.length > 0) {
      const runExistingCatalogTopUps = async () => {
        // Universities exist, but older installs never received the program
        // catalogue (programs/requirements/cycles), which the recommender reads
        // exclusively. The call is idempotent — it only inserts what is missing.
        try {
          await seedProgramCatalog();
        } catch (err) {
          console.error("Program catalogue top-up failed:", err);
        }
        try {
          await refreshSeededScholarshipCycles();
        } catch (err) {
          console.error("Seeded scholarship cycle refresh failed:", err);
        }
        try {
          await seedOpportunities();
        } catch (err) {
          console.error("Opportunities catalogue top-up failed:", err);
        }
        try {
          // Independent top-ups run concurrently; each one is individually
          // idempotent and guarded by its own process cache.
          await Promise.all([
            ensureGrowthTables(),
            ensureJourneyTables(),
            ensureRichPlatformDataSeeded(),
            ensureOutcomesAndStoriesSeeded(),
          ]);
        } catch (err) {
          console.error("Rich platform data top-up failed:", err);
        }
        try {
          await Promise.all([seedForum(), seedCourses(), seedGamification()]);
        } catch (err) {
          console.error("Catalogue top-up failed:", err);
        }
      };

      // This small, exact-identity update repairs only blank type fields; it
      // never overwrites administrator-supplied values or guesses from names.
      try {
        await topUpVerifiedSeedUniversityTypes();
      } catch (err) {
        console.error("Verified university-type top-up failed:", err);
      }
      if (force) {
        await runExistingCatalogTopUps();
      } else {
        // Do not block student-facing GET /api/universities or GET /api/scholarships
        // on the heavier catalogue/schema top-ups.
        seedDatabaseCompleted = true;
        void runExistingCatalogTopUps();
      }
      return;
    }

    console.log("Seeding database with ScholarBridge dataset...");

    // Insert Default Universities
    const insertedUnis = await db.insert(universities).values(([
      {
        name: "Massachusetts Institute of Technology (MIT)",
        country: "United States",
        city: "Cambridge, MA",
        flagEmoji: "🇺🇸",
        worldRanking: 1,
        degreeLevel: "All",
        programMajor: "Computer Science & Artificial Intelligence",
        annualTuitionUsd: 59750,
        annualLivingEstUsd: 21000,
        minGpa: 3.85,
        minIelts: 7.5,
        minSat: 1530,
        acceptanceRate: 4.8,
        postStudyWorkVisaYears: 3.0,
        description: "World leader in technology, AI research, and engineering. MIT provides cutting-edge labs, startup incubators, and unmatched industry connections.",
        highlights: JSON.stringify(["OPT STEM 3-Year Extension", "World #1 CS Program", "Generous Need-Blind Aid", "CSAIL Research Lab"]),
        universityType: "Private",
        websiteUrl: "https://www.mit.edu",
        imageUrl: "https://upload.wikimedia.org/wikipedia/commons/9/9e/Great_Dome%2C_MIT_-_IMG_8390.JPG"
      },
      {
        name: "University of Oxford",
        country: "United Kingdom",
        city: "Oxford",
        flagEmoji: "🇬🇧",
        worldRanking: 3,
        degreeLevel: "Master",
        programMajor: "Advanced Computer Science & Data Science",
        annualTuitionUsd: 41200,
        annualLivingEstUsd: 18500,
        minGpa: 3.75,
        minIelts: 7.5,
        minSat: 1480,
        acceptanceRate: 14.2,
        postStudyWorkVisaYears: 2.0,
        description: "Historic university renowned for academic excellence, tutorial system, and world-class AI and machine learning departments.",
        highlights: JSON.stringify(["UK Graduate Route 2-Yr Visa", "Rhodes & Clarendon Scholarships", "College Tutorial System", "DeepMind Chair Hub"]),
        websiteUrl: "https://www.ox.ac.uk",
        imageUrl: "https://upload.wikimedia.org/wikipedia/commons/2/2b/Radcliffe_Camera%2C_Oxford_-_Oct_2006.jpg"
      },
      {
        name: "Technical University of Munich (TUM)",
        country: "Germany",
        city: "Munich",
        flagEmoji: "🇩🇪",
        worldRanking: 28,
        degreeLevel: "Master",
        programMajor: "Informatics & Data Engineering",
        annualTuitionUsd: 3200,
        annualLivingEstUsd: 13500,
        minGpa: 3.2,
        minIelts: 6.5,
        minSat: 1280,
        acceptanceRate: 22.5,
        postStudyWorkVisaYears: 1.5,
        description: "Europe's leading technical university with virtually free/low tuition, top European industry partnerships (BMW, Siemens, Google Munich), and English-taught Master's.",
        highlights: JSON.stringify(["Ultra Low Tuition Fees", "18-Month Post-Study Job Seeker Visa", "Strong Tech Ecosystem", "DAAD Eligible"]),
        universityType: "Public",
        websiteUrl: "https://www.tum.de",
        imageUrl: "https://upload.wikimedia.org/wikipedia/commons/b/bb/Technische_Universit%C3%A4t_M%C3%BCnchen.jpg"
      },
      {
        name: "University of Toronto",
        country: "Canada",
        city: "Toronto, ON",
        flagEmoji: "🇨🇦",
        worldRanking: 21,
        degreeLevel: "All",
        programMajor: "Applied Computing & Software Engineering",
        annualTuitionUsd: 38500,
        annualLivingEstUsd: 16000,
        minGpa: 3.4,
        minIelts: 7.0,
        minSat: 1380,
        acceptanceRate: 43.0,
        postStudyWorkVisaYears: 3.0,
        description: "Canada's top research university offering PGWP up to 3 years, direct pathways to Canadian Permanent Residency, and premier Vector Institute AI partnerships.",
        highlights: JSON.stringify(["3-Year Post-Graduation Work Permit (PGWP)", "Express Entry PR Bonus Points", "Vector Institute AI Hub", "Co-op Internship Options"]),
        universityType: "Public",
        websiteUrl: "https://www.utoronto.ca",
        imageUrl: "https://upload.wikimedia.org/wikipedia/commons/c/c8/University_College%2C_University_of_Toronto%2C_Canada.jpg"
      },
      {
        name: "National University of Singapore (NUS)",
        country: "Singapore",
        city: "Singapore",
        flagEmoji: "🇸🇬",
        worldRanking: 8,
        degreeLevel: "All",
        programMajor: "Business Analytics & AI Systems",
        annualTuitionUsd: 28900,
        annualLivingEstUsd: 14000,
        minGpa: 3.6,
        minIelts: 6.5,
        minSat: 1400,
        acceptanceRate: 16.0,
        postStudyWorkVisaYears: 1.0,
        description: "Asia's premier university located in global financial and technological center with Service Obligation tuition subsidies for international students.",
        highlights: JSON.stringify(["MOE Tuition Grant Subsidy", "Asia #1 University", "Global Fintech & Tech Hub", "SINGA Scholarship Target"]),
        websiteUrl: "https://www.nus.edu.sg",
        imageUrl: "https://upload.wikimedia.org/wikipedia/commons/a/a7/National_University_of_Singapore_logo_print.jpg"
      },
      {
        name: "ETH Zurich",
        country: "Switzerland",
        city: "Zurich",
        flagEmoji: "🇨🇭",
        worldRanking: 7,
        degreeLevel: "Master",
        programMajor: "Cybersecurity & Machine Learning",
        annualTuitionUsd: 1800,
        annualLivingEstUsd: 24000,
        minGpa: 3.7,
        minIelts: 7.0,
        minSat: 1450,
        acceptanceRate: 18.0,
        postStudyWorkVisaYears: 0.5,
        description: "World-class STEM institution with affordable tuition fees, home to Einstein, and unparalleled research in robotics, quantum computing, and AI.",
        highlights: JSON.stringify(["Low Tuition Fees (~$1.8k/yr)", "Top 10 Global Ranking", "Excellence Scholarship & Opportunity Program", "World-class Labs"]),
        websiteUrl: "https://ethz.ch",
        imageUrl: "https://upload.wikimedia.org/wikipedia/commons/5/56/ETH_Z%C3%BCrich_-_Hauptgeb%C3%A4ude_-_Polyterrasse_2012-09-27_14-40-49_ShiftN.jpg"
      },
      {
        name: "University of Melbourne",
        country: "Australia",
        city: "Melbourne",
        flagEmoji: "🇦🇺",
        worldRanking: 14,
        degreeLevel: "All",
        programMajor: "Information Technology & Data Science",
        annualTuitionUsd: 34500,
        annualLivingEstUsd: 17500,
        minGpa: 3.2,
        minIelts: 6.5,
        minSat: 1300,
        acceptanceRate: 70.0,
        postStudyWorkVisaYears: 3.0,
        description: "Australia's top university located in one of the world's most liveable cities, offering generous post-study work rights and regional migration bonuses.",
        highlights: JSON.stringify(["3 to 4-Year Temporary Graduate Visa", "Melbourne Tech Hub", "Generous Merit Scholarships", "High Quality of Life"]),
        websiteUrl: "https://www.unimelb.edu.au",
        imageUrl: "https://upload.wikimedia.org/wikipedia/commons/c/c5/Parkville_-_University_of_Melbourne_%28Ormond_College%29.jpg"
      },
      {
        name: "Stanford University",
        country: "United States",
        city: "Stanford, CA",
        flagEmoji: "🇺🇸",
        worldRanking: 2,
        degreeLevel: "All",
        programMajor: "Artificial Intelligence & Entrepreneurship",
        annualTuitionUsd: 62484,
        annualLivingEstUsd: 22500,
        minGpa: 3.9,
        minIelts: 7.5,
        minSat: 1540,
        acceptanceRate: 3.9,
        postStudyWorkVisaYears: 3.0,
        description: "Silicon Valley's powerhouse university. Unrivaled ecosystem for venture capital, technology commercialization, AI breakthrough labs, and founders.",
        highlights: JSON.stringify(["Knight-Hennessy Scholars Program", "Silicon Valley Venture Access", "3-Year STEM OPT", "Pioneer AI Research"]),
        universityType: "Private",
        websiteUrl: "https://www.stanford.edu",
        imageUrl: "https://upload.wikimedia.org/wikipedia/commons/6/64/Stanford_University_Quad_Memorial_Church.JPG"
      },
      {
        name: "University of British Columbia (UBC)",
        country: "Canada",
        city: "Vancouver, BC",
        flagEmoji: "🇨🇦",
        worldRanking: 34,
        degreeLevel: "All",
        programMajor: "Data Science & Sustainability Engineering",
        annualTuitionUsd: 36000,
        annualLivingEstUsd: 16500,
        minGpa: 3.3,
        minIelts: 6.5,
        minSat: 1320,
        acceptanceRate: 52.0,
        postStudyWorkVisaYears: 3.0,
        description: "Premier West Coast Canadian university surrounded by mountains and sea, renowned for sustainability, health tech, and AI co-op programs.",
        highlights: JSON.stringify(["3-Year PGWP Work Visa", "Vancouver Tech Hub", "International Leader Award", "Scenic Campus"]),
        universityType: "Public",
        websiteUrl: "https://www.ubc.ca",
        imageUrl: "https://upload.wikimedia.org/wikipedia/commons/3/30/Irving_K._Barber_Learning_Centre_-_University_of_British_Columbia_Vancouver_-_DSC09305.jpg"
      },
      {
        name: "Delft University of Technology (TU Delft)",
        country: "Netherlands",
        city: "Delft",
        flagEmoji: "🇳🇱",
        worldRanking: 47,
        degreeLevel: "Master",
        programMajor: "Computer Science & Renewable Energy Engineering",
        annualTuitionUsd: 21500,
        annualLivingEstUsd: 14000,
        minGpa: 3.3,
        minIelts: 6.5,
        minSat: 1300,
        acceptanceRate: 35.0,
        postStudyWorkVisaYears: 1.0,
        description: "Netherlands' largest technical university with outstanding English-taught Master's degrees, high graduate employability, and 1-year Orientation Year visa.",
        highlights: JSON.stringify(["Dutch Orientation Year Visa", "TU Delft Excellence Scholarship", "High English Proficiency Environment", "EU Tech Innovation Hub"]),
        websiteUrl: "https://www.tudelft.nl",
        imageUrl: "https://upload.wikimedia.org/wikipedia/commons/0/0c/Library_TUDelft.jpg"
      },
      {
        name: "Imperial College London",
        country: "United Kingdom",
        city: "London",
        flagEmoji: "🇬🇧",
        worldRanking: 6,
        degreeLevel: "All",
        programMajor: "Computing, AI & Financial Technology",
        annualTuitionUsd: 46500,
        annualLivingEstUsd: 21000,
        minGpa: 3.7,
        minIelts: 7.0,
        minSat: 1460,
        acceptanceRate: 15.0,
        postStudyWorkVisaYears: 2.0,
        description: "STEM and business focused top global university in central London, famous for algorithmic trading, bio-engineering, and deeptech ventures.",
        highlights: JSON.stringify(["Central London Tech Corridor", "President's PhD Scholarships", "2-Year UK Graduate Visa", "Strong FinTech Network"]),
        websiteUrl: "https://www.imperial.ac.uk",
        imageUrl: "https://upload.wikimedia.org/wikipedia/commons/2/2e/Queen%27s_Tower%2C_Imperial_College_London.jpg"
      },
      {
        name: "The University of Tokyo",
        country: "Japan",
        city: "Tokyo",
        flagEmoji: "🇯🇵",
        worldRanking: 28,
        degreeLevel: "All",
        programMajor: "Robotics & Information Science",
        annualTuitionUsd: 5200,
        annualLivingEstUsd: 15000,
        minGpa: 3.5,
        minIelts: 6.5,
        minSat: 1350,
        acceptanceRate: 20.0,
        postStudyWorkVisaYears: 2.0,
        description: "Japan's flagship university offering fully English-taught degree tracks (PEAK and USTEP) with government MEXT full scholarships available.",
        highlights: JSON.stringify(["MEXT Full Embassy Scholarship", "Low Tuition (~$5.2k)", "Robotics Capital of the World", "Fast-track Japan PR"]),
        websiteUrl: "https://www.u-tokyo.ac.jp",
        imageUrl: "https://upload.wikimedia.org/wikipedia/commons/f/fa/2024_Yasuda_Auditorium_-_Tokyo_University.jpg"
      }
    ]) .map((candidate) => ({
      // Keep the institution identity and candidate official website only.
      // The legacy metrics, requirements, visa promises, descriptions and
      // rankings have not been reviewed against current official pages.
      ...candidate,
      worldRanking: null,
      degreeLevel: "All",
      programMajor: null,
      annualTuitionUsd: null,
      annualLivingEstUsd: null,
      accommodationCostUsd: null,
      annualTuition: null,
      annualLivingEst: null,
      accommodationCost: null,
      applicationFee: null,
      minGpa: null,
      minIelts: null,
      minSat: null,
      acceptanceRate: null,
      postStudyWorkVisaYears: null,
      foundedYear: null,
      universityType: null,
      internationalStudentsCount: null,
      internationalStudentsPercentage: null,
      description: "Institution record; current programme, cost, ranking, and admissions details are not source-verified.",
      highlights: JSON.stringify([]),
      sourceUrl: null,
      lastVerifiedAt: null,
      verificationStatus: "unverified",
    }))).returning();

    // Program catalogue for the universities above (programs, per-program
    // requirements, application cycles, provenance links). Without this the
    // recommender has no programmes to rank on a fresh install.
    try {
      await seedProgramCatalog();
    } catch (err) {
      console.error("Failed to seed the program catalogue:", err);
    }

    // Opportunities catalogue (competitions / research / internships /
    // summer schools) — the feed was empty on a fresh install.
    try {
      await seedOpportunities();
    } catch (err) {
      console.error("Failed to seed opportunities:", err);
    }

    // Insert Default Scholarships
    await db.insert(scholarships).values(([
      {
        title: "Fulbright Foreign Student Program",
        provider: "United States Department of State",
        country: "United States",
        coverageType: "Full Tuition + Stipend",
        amountUsdValue: 55000,
        deadline: "2025-10-15",
        degreeLevels: JSON.stringify(["Master", "PhD"]),
        eligibleMajors: JSON.stringify(["All"]),
        minGpa: 3.3,
        minIelts: 7.0,
        financialNeedBased: true,
        meritBased: true,
        description: "Covers full tuition, living stipend, roundtrip airfare, health insurance, and visa support for international graduate students studying in the USA.",
        requirements: "Bachelor's degree, strong leadership record, 3 recommendation letters, essay of intent, and commitment to return to home country.",
        websiteUrl: "https://foreign.fulbrightonline.org"
      },
      {
        title: "Chevening Scholarship",
        provider: "UK Foreign, Commonwealth & Development Office",
        country: "United Kingdom",
        coverageType: "Full Tuition + Stipend",
        amountUsdValue: 45000,
        deadline: "2025-11-04",
        degreeLevels: JSON.stringify(["Master"]),
        eligibleMajors: JSON.stringify(["All"]),
        minGpa: 3.2,
        minIelts: 6.5,
        financialNeedBased: false,
        meritBased: true,
        description: "Fully funded 1-year Master's scholarship in the UK for future global leaders and influencers, covering tuition, accommodation, and travel allowance.",
        requirements: "2+ years work experience, clear career plan, undergraduate degree equivalent to UK Upper Second Class, acceptance from a UK university.",
        websiteUrl: "https://www.chevening.org"
      },
      {
        title: "DAAD Development-Related Postgraduate Courses (EPOS)",
        provider: "German Academic Exchange Service (DAAD)",
        country: "Germany",
        coverageType: "Full Tuition + Stipend",
        amountUsdValue: 32000,
        deadline: "2025-09-30",
        degreeLevels: JSON.stringify(["Master", "PhD"]),
        eligibleMajors: JSON.stringify(["Engineering", "Computer Science", "Public Health", "Environmental Science", "Economics"]),
        minGpa: 3.0,
        minIelts: 6.5,
        financialNeedBased: true,
        meritBased: true,
        description: "Monthly stipend of €934 - €1,200, travel allowance, health insurance, and full tuition coverage for select Master's programs across German universities.",
        requirements: "At least 2 years of relevant professional experience, target country citizenship, academic excellence.",
        websiteUrl: "https://www.daad.de"
      },
      {
        title: "Erasmus Mundus Joint Master Degrees (EMJMD)",
        provider: "European Commission / European Union",
        country: "European Union",
        coverageType: "Full Tuition + Stipend",
        amountUsdValue: 48000,
        deadline: "2026-01-15",
        degreeLevels: JSON.stringify(["Master"]),
        eligibleMajors: JSON.stringify(["Computer Science", "AI & Data Science", "Biotechnology", "Renewable Energy", "Public Policy"]),
        minGpa: 3.4,
        minIelts: 6.5,
        financialNeedBased: false,
        meritBased: true,
        description: "High-profile international study program across 2 to 3 different European countries with €1,400 monthly living allowance and zero tuition fees.",
        requirements: "Bachelor degree, strong academic transcript, motivation letter, CV in Europass format, 2 reference letters.",
        websiteUrl: "https://erasmus-plus.ec.europa.eu"
      },
      {
        title: "Knight-Hennessy Scholars Program",
        provider: "Stanford University",
        country: "United States",
        coverageType: "Full Tuition + Stipend",
        amountUsdValue: 90000,
        deadline: "2025-10-08",
        degreeLevels: JSON.stringify(["Master", "PhD"]),
        eligibleMajors: JSON.stringify(["All"]),
        minGpa: 3.7,
        minIelts: 7.5,
        financialNeedBased: false,
        meritBased: true,
        description: "Fully funds up to 3 years of graduate study at Stanford for students with transformative leadership potential, independence of thought, and civic mindset.",
        requirements: "Must apply to a full-time Stanford graduate degree program concurrently. Requires video submission and leadership essays.",
        websiteUrl: "https://knight-hennessy.stanford.edu"
      },
      {
        title: "Gates Cambridge Scholarship",
        provider: "Bill & Melinda Gates Foundation / Cambridge",
        country: "United Kingdom",
        coverageType: "Full Tuition + Stipend",
        amountUsdValue: 60000,
        deadline: "2025-12-03",
        degreeLevels: JSON.stringify(["Master", "PhD"]),
        eligibleMajors: JSON.stringify(["All"]),
        minGpa: 3.8,
        minIelts: 7.5,
        financialNeedBased: false,
        meritBased: true,
        description: "Full-cost scholarship for outstanding applicants from countries outside the UK to pursue a postgraduate degree at the University of Cambridge.",
        requirements: "Outstanding intellectual ability, leadership capacity, commitment to improving the lives of others, match with Cambridge program.",
        websiteUrl: "https://www.gatescambridge.org"
      },
      {
        title: "MEXT Japanese Government Scholarship",
        provider: "Ministry of Education, Culture, Sports, Science (MEXT Japan)",
        country: "Japan",
        coverageType: "Full Tuition + Stipend",
        amountUsdValue: 28000,
        deadline: "2025-05-20",
        degreeLevels: JSON.stringify(["Bachelor", "Master", "PhD"]),
        eligibleMajors: JSON.stringify(["All"]),
        minGpa: 3.2,
        minIelts: 6.0,
        financialNeedBased: false,
        meritBased: true,
        description: "Covers tuition fees, monthly living allowance (~144,000 JPY/month), roundtrip flight ticket, and 6-month preparatory Japanese language course.",
        requirements: "Embassy recommendation or university recommendation, written exam & interview at Japanese embassy.",
        websiteUrl: "https://www.mext.go.jp"
      },
      {
        title: "Lester B. Pearson International Scholarship",
        provider: "University of Toronto",
        country: "Canada",
        coverageType: "Full Tuition + Stipend",
        amountUsdValue: 50000,
        deadline: "2025-11-30",
        degreeLevels: JSON.stringify(["Bachelor"]),
        eligibleMajors: JSON.stringify(["All"]),
        minGpa: 3.7,
        minIelts: 7.0,
        financialNeedBased: false,
        meritBased: true,
        description: "University of Toronto's most prestigious scholarship for international high school students showing exceptional academic achievement and creativity.",
        requirements: "School nomination required, outstanding leadership traits, application to U of T undergraduate program.",
        websiteUrl: "https://future.utoronto.ca/pearson"
      }
    ]) .map((candidate) => ({
      // Retain only the identity and candidate official website from this
      // legacy list. No current eligibility, award, currency, or cycle data
      // has been source-reviewed, so fresh seeds must leave those unknown.
      ...candidate,
      coverageType: "Unspecified",
      amountUsdValue: null,
      awardAmount: null,
      awardCurrency: null,
      awardPeriod: null,
      awardBasis: null,
      tuitionCoverage: "",
      fundingType: "",
      livingAllowance: null,
      travelAllowance: null,
      accommodation: "",
      applicationFee: null,
      englishRequirements: "",
      openingDate: null,
      deadlineRangeStart: null,
      deadlineRangeEnd: null,
      rounds: JSON.stringify([]),
      deadline: null,
      deadlineDate: null,
      deadlineType: "unknown",
      recurrence: "none",
      expectedDeadlinePeriod: null,
      applicationStatus: "unknown",
      degreeLevels: JSON.stringify([]),
      eligibleMajors: JSON.stringify([]),
      eligibleCountries: JSON.stringify([]),
      minGpa: null,
      minIelts: null,
      financialNeedBased: null,
      meritBased: null,
      description: "Current award details have not been reviewed against an official source.",
      requirements: "Check the official programme page for current eligibility, coverage, required documents, and application dates.",
      requiredDocuments: JSON.stringify([]),
      sourceUrl: null,
      verificationStatus: "unverified",
      lastVerifiedAt: null,
    })))

    // Legacy cycle refresh is intentionally non-mutating: past deadlines are
    // not rolled forward without a current official publication.
    try {
      await refreshSeededScholarshipCycles();
    } catch (err) {
      console.error("Failed to backfill seeded scholarship cycles:", err);
    }

    // Insert Default Student Profile
    const [profile] = await db.insert(studentProfiles).values({
      name: "Alex Chen",
      email: "alex.chen@scholarbridge.edu",
      degreeLevel: "Master",
      targetMajor: "Computer Science & Data Science",
      gpa: 3.72,
      gpaScale: 4.0,
      ieltsScore: 7.5,
      toeflScore: 105,
      satScore: 1450,
      greScore: 322,
      budgetAnnualUsd: 28000,
      preferredCountries: JSON.stringify(["United States", "United Kingdom", "Canada", "Germany", "Singapore"]),
      needScholarship: true,
      extracurriculars: "Lead Developer of Campus Open Source Project, Winner of National Hackathon 2024, Undergraduate Research Assistant in ML",
      workExperienceYears: 1,
      researchPublications: 1,
      // Demo data for the student screens — NEVER an admin account: a seeded
      // demo profile that can open the admin panel is a privilege leak, and the
      // bootstrap admin (ADMIN_EMAIL) is the only operator account.
      isAdmin: false,
    }).returning();

    // Insert saved universities for this student
    if (insertedUnis.length >= 3) {
      await db.insert(savedUniversities).values([
        {
          profileId: profile.id,
          universityId: insertedUnis[2].id, // TUM
          status: "Preparing Application",
          notes: "Demo note: compare listed costs and programme details, then check the destination's official visa guidance."
        },
        {
          profileId: profile.id,
          universityId: insertedUnis[3].id, // U of Toronto
          status: "Shortlisted",
          notes: "Demo note: verify current programme details and post-study work information with official sources."
        },
        {
          profileId: profile.id,
          universityId: insertedUnis[1].id, // Oxford
          status: "Shortlisted",
          notes: "Demo note: compare the programme's official requirements, available funding, costs, and deadlines."
        }
      ]);
    }

    // Insert sample application tasks.
    // Due dates are RELATIVE to the moment of seeding: fixed absolute dates
    // went stale (a fresh install showed the demo student with every task
    // ~500 days overdue and the dashboard announcing "3 deadlines need you
    // today"). A relative offset keeps the demo coherent whenever it runs.
    const daysFromNow = (days: number): string => {
      const d = new Date();
      d.setUTCDate(d.getUTCDate() + days);
      return d.toISOString().slice(0, 10);
    };
    await db.insert(applicationTasks).values([
      {
        profileId: profile.id,
        universityId: insertedUnis[2]?.id || null,
        title: "Draft Statement of Purpose (SOP) tailored for TUM",
        category: "SOP & Essays",
        dueDate: daysFromNow(12),
        isCompleted: false,
        priority: "High"
      },
      {
        profileId: profile.id,
        universityId: null,
        title: "Request Recommendation Letter from Dr. Vance (ML Professor)",
        category: "LOR",
        dueDate: daysFromNow(-30),
        isCompleted: true,
        priority: "High"
      },
      {
        profileId: profile.id,
        universityId: null,
        title: "Order WES Official Academic Transcript Evaluation",
        category: "Document Prep",
        dueDate: daysFromNow(26),
        isCompleted: false,
        priority: "Medium"
      },
      {
        profileId: profile.id,
        universityId: insertedUnis[3]?.id || null,
        title: "Submit University of Toronto Online Application Portal",
        category: "Document Prep",
        dueDate: daysFromNow(40),
        isCompleted: false,
        priority: "High"
      }
    ]);

    await seedProgramCatalog();
    await seedOpportunities();
    await ensureGrowthTables();
    await ensureJourneyTables();
    // Cold-install path (runs once per process): keep the raw writers so a
    // fresh deployment always receives the full catalogue, exactly as before.
    await seedRichPlatformData();
    await seedOutcomesAndStories();
    await seedForum();
    await seedCourses();
    await seedGamification();

    console.log("Database seeded successfully!");
  } catch (error) {
    console.error("Error seeding database:", error);
  }
}

// ---------------------------------------------------------------------------
// Seed: Forum categories & high-value discussion threads (2026-2027)
// ---------------------------------------------------------------------------
const FORUM_CATEGORY_SPECS = [
  { name: "University Applications", slug: "applications", description: "Application strategies, deadlines, and document help", sortOrder: 1 },
  { name: "Scholarships & Funding", slug: "scholarships", description: "Find and win scholarships, funding, and financial aid", sortOrder: 2 },
  { name: "Visa & Immigration", slug: "visa", description: "Student visas, Sperrkonto, F-1/UKVI/D-2 interviews, and immigration questions", sortOrder: 3 },
  { name: "Test Prep (IELTS, SAT, GRE)", slug: "test-prep", description: "IELTS, TOEFL, Digital SAT, GRE, and TOPIK preparation tips and resources", sortOrder: 4 },
  { name: "SOP, Common App & Essays", slug: "sop-essays", description: "Statement of Purpose, motivation letters, Chevening/GKS essays, and peer reviews", sortOrder: 5 },
  { name: "Uzbekistan Applicants Hub", slug: "uzbekistan-community", description: "El-Yurt Umidi Foundation, my.gov.uz e-Apostille, Tashkent embassy tips, and local cohorts", sortOrder: 6 },
  { name: "Destination Country Guides", slug: "country-guides", description: "Living costs, housing, health insurance, and campus life across USA, Germany, Korea, UK & more", sortOrder: 7 },
  { name: "Research, Internships & Post-Study Work", slug: "career-internships", description: "Summer research fellowships, OPT/PGWP/18-month German job-seeker visas, and global careers", sortOrder: 8 },
];

const FORUM_THREAD_SPECS = [
  {
    categorySlug: "applications",
    title: "Welcome to ScholarBridge Community! 👋 (2026–2027 Admissions Cohort)",
    body: "Introduce yourself, share your target universities and majors, and connect with students across Uzbekistan and Central Asia applying to top universities worldwide. Drop your target country, degree level, and biggest question below!",
    isPinned: true,
    viewCount: 412,
    replies: [
      "Assalomu alaykum everyone! Applying from Tashkent for Fall 2027 BSc Computer Science (KAIST, TUM, and U of T). Happy to share Digital SAT math notes!",
      "Hello from Samarkand! Preparing my MSc Data Science applications for Germany (TUM, RWTH Aachen) and DAAD scholarship. The new multi-currency cost calculator helped me compare EUR vs USD budgets.",
    ],
  },
  {
    categorySlug: "scholarships",
    title: "Complete Calendar of Fully Funded Scholarships for Uzbek Students (2026–2027 Cycle)",
    body: "Here is our master calendar of fully funded scholarships open to applicants from Uzbekistan:\n\n1. **Chevening Scholarship (UK Master's)** — Opens August, closes early November.\n2. **DAAD Study Scholarships (Germany Master's)** — Closes October/November via DAAD Portal.\n3. **Gates Cambridge & Knight-Hennessy (UK/US)** — October to December.\n4. **Stipendium Hungaricum (Hungary BSc/MSc/PhD)** — Closes January 15 on DreamApply + Uzbek Ministry registration.\n5. **Türkiye Bursları (Turkey BSc/MSc/PhD)** — January 10 to February 20 on TBBS.\n6. **Global Korea Scholarship (GKS Undergrad & Grad)** — Undergrad in Sept/Oct; Graduate in Feb/March.\n7. **MEXT Embassy Track (Japan)** — Embassy of Japan in Tashkent call opens in April/May.\n8. **El-Yurt Umidi Foundation (Uzbekistan Presidential Grant)** — Multiple calls per year for Top-300 QS/THE admit holders.",
    isPinned: true,
    viewCount: 685,
    replies: [
      "Super helpful! One important reminder for Stipendium Hungaricum: don't forget to upload your documents to the Uzbekistan Ministry of Higher Education portal in addition to DreamApply.",
      "For anyone targeting KU Leuven or Ghent in Belgium, remember that Flanders Master Mind institutional nomination deadlines are in December/January!",
    ],
  },
  {
    categorySlug: "uzbekistan-community",
    title: "El-Yurt Umidi Foundation 2026 Selection: How to Prepare for the Panel Interview & Top-100 Direct Track",
    body: "For students holding an unconditional offer from a Top-100 or Top-300 university on QS, Times Higher Education, or ARWU: here is what the El-Yurt Umidi Foundation commission focuses on during the national interview in Tashkent:\n\n- **Specificity of Return Plan:** Name the exact ministry, state enterprise, university, or private sector reform in Uzbekistan where your specialization will be applied during your mandatory return service commitment.\n- **Cost Transparency:** Bring an itemized breakdown of tuition, mandatory health insurance, and dormitory living costs from your university's official financial page.\n- **Academic Readiness:** Be ready to explain your thesis or capstone topic in plain Uzbek and English.",
    isPinned: true,
    viewCount: 530,
    replies: [
      "Having my official NUS cost breakdown and module syllabus printed out made a huge difference during my panel interview!",
    ],
  },
  {
    categorySlug: "visa",
    title: "German Embassy Tashkent Student Visa (§16b) & Sperrkonto (€11,904) Step-by-Step Guide",
    body: "If you were admitted to a German university (TUM, RWTH, Bonn, LMU, FU Berlin), here is the exact checklist that cleared the German Embassy in Tashkent without delays:\n\n1. **Sperrkonto (€11,904 / €992 per month):** Open via Expatrio or Fintiba. International SWIFT transfer from an Uzbek bank (NBU, Kapitalbank, Ipak Yuli) usually takes 2–4 business days to issue the *06 Blocking Confirmation*.\n2. **Health Insurance:** Combine जर्मन statutory student health insurance (TK, AOK, or BARMER — ~€130/mo) with free incoming travel insurance for your arrival weeks.\n3. **Hague Apostille:** Apostille your original diploma and transcript via my.gov.uz before having them translated into German/English.\n4. **VIDEX Form:** Double-check that your intended address in Germany matches your dormitory waitlist or temporary booking.",
    isPinned: false,
    viewCount: 394,
    replies: [
      "Also note: if you win a full DAAD or El-Yurt Umidi scholarship above €992/month, your official scholarship award letter replaces the €11,904 Sperrkonto!",
    ],
  },
  {
    categorySlug: "visa",
    title: "U.S. Embassy Tashkent F-1 Student Visa Interview: Questions Asked & Financial Documents",
    body: "Just finished my F-1 visa interview at the U.S. Embassy in Tashkent (Yunusabad). The consular officer asked four direct questions:\n\n1. Why did you choose this specific university over the other schools you applied to?\n2. How does your major connect to your career plans after graduation in Uzbekistan?\n3. Who is sponsoring the remaining balance on your Form I-20, and what do your parents do?\n4. Did you take the SAT/IELTS yourself, and what was your favorite high school subject?\n\nKeep your answers concise (30–45 seconds each), know your Form I-20 numbers by heart, and bring original stamped bank statements and parent income certificates.",
    isPinned: false,
    viewCount: 478,
    replies: [
      "Congrats! Did the officer ask to see the SEVIS I-901 receipt at the window?",
      "Yes, the intake window checked my Form I-20, DS-160 confirmation, and SEVIS I-901 receipt right before fingerprinting.",
    ],
  },
  {
    categorySlug: "scholarships",
    title: "Global Korea Scholarship (GKS) Embassy Track vs. University Track for Uzbekistan",
    body: "Many Uzbek applicants ask whether to apply for GKS through the **Embassy of the Republic of Korea in Tashkent** (3 universities, including at least one Type B regional university) or directly via the **University Track** (1 university).\n\n- **Embassy Track:** Allows you to list 3 universities (e.g., SNU + Yonsei + KNU/PNU). Higher competition in Round 1 in Tashkent, but 3 chances at university placement in Round 3.\n- **University Track:** Best if you have a highly specialized STEM profile or direct lab fit with a single university like KAIST, POSTECH, UNIST, or SKKU.\n- **Pro Tip:** Apostille your birth certificate, parents' passports/citizenship proof, and transcripts at least 3 weeks before the deadline!",
    isPinned: false,
    viewCount: 362,
    replies: [
      "Having TOPIK Level 3 or 4 gives automatic bonus points on the GKS evaluation sheet, and IELTS 7.5+ makes your file stand out immediately.",
    ],
  },
  {
    categorySlug: "test-prep",
    title: "How I Jumped from IELTS 6.5 to 8.0 in 8 Weeks (Writing Band 6.0 → 7.5 Breakdown)",
    body: "Most students in Uzbekistan score 7.5–8.5 in Listening and Reading but get stuck at 6.0 or 6.5 in Writing. Here is what fixed my Writing score before taking the computer-delivered test at British Council Tashkent:\n\n1. **Task 2 Topic Sentences:** Every body paragraph must start with a single, unmistakable claim that directly answers the prompt question.\n2. **Eliminate Memorized Templates:** Examiners penalize hollow phrases like *'In this contemporary era of globalization'*. Use precise academic verbs instead.\n3. **Task 1 Overview Paragraph:** Never put specific numbers in your Overview; save exact figures for Body Paragraphs 1 and 2.",
    isPinned: false,
    viewCount: 441,
    replies: [
      "Computer-delivered IELTS in Tashkent is also much better for Writing because you can see your live word count and edit sentences without erasing!",
    ],
  },
  {
    categorySlug: "test-prep",
    title: "Digital SAT 1550+ Strategy: Mastering Desmos & Reading Command-of-Evidence Questions",
    body: "For everyone taking the Digital SAT at Presidential Schools or Tashkent test centers this semester:\n\n- **Math Module 2 Time Saver:** Learn Desmos regressions (`y1 ~ mx1 + b`, systems of equations, and slider constants). At least 8 of the hardest Module 2 algebra/function questions can be solved in under 25 seconds in Desmos.\n- **Reading & Writing:** Do Questions 15–27 (Standard English Conventions & Rhetorical Synthesis notes) first! That banks 12 easy points in 7 minutes and leaves 25 minutes for the dense logical inference passages.",
    isPinned: false,
    viewCount: 319,
    replies: [
      "Doing Questions 15–27 first raised my Reading & Writing score from 670 to 750 on Bluebook Practice Test 5!",
    ],
  },
  {
    categorySlug: "sop-essays",
    title: "Chevening 4 Essays Structure: How to Connect Leadership & Networking to Impact in Uzbekistan",
    body: "The four Chevening essays (Leadership & Influence, Relationship-Building & Networking, Studying in the UK, and Career Plan) form a single narrative arc:\n\n- **Essay 1 (Leadership):** Use two concrete STAR examples showing how you diagnosed a bottleneck and mobilized others.\n- **Essay 2 (Networking):** Show how you built a cross-organizational coalition and how you will engage with the Chevening Alumni Uzbekistan network.\n- **Essay 3 (Studying in the UK):** Name specific modules, research centres, and professors at your 3 chosen UK courses.\n- **Essay 4 (Career Plan):** Break your return plan into Immediate (0–2 yrs), Medium-Term (2–5 yrs), and Long-Term (5–10 yrs) measurable milestones in Uzbekistan.",
    isPinned: false,
    viewCount: 287,
    replies: [
      "Make sure your three UK university choices in Essay 3 are logically consistent in field—never mix three unrelated majors!",
    ],
  },
  {
    categorySlug: "applications",
    title: "Converting Uzbek 5-Point Lyceum/University Grades & Calculating ECTS Credits for Europe",
    body: "When applying to European and North American universities from an Uzbek high school (11-year attestat), academic lyceum, or bachelor's program:\n\n- **Never convert your GPA using a random blog formula** if the university asks for your original scale: enter your exact 5.0-scale GPA and upload the official grading scale legend from your transcript.\n- **ECTS Conversion for Germany/Italy/Belgium:** 1 Uzbek credit or 30–36 academic hours of workload typically maps to 1 ECTS credit (a standard 4-year bachelor's degree equals 240 ECTS).",
    isPinned: false,
    viewCount: 310,
    replies: [
      "ScholarBridge's CV builder and GPA converter handle the 5.0 and 100-point scales cleanly—super useful for TUM and KU Leuven.",
    ],
  },
  {
    categorySlug: "country-guides",
    title: "Real Monthly Student Budget in Munich, Seoul, London & Toronto (2026 Verified Numbers)",
    body: "We polled Uzbek students currently studying abroad in 2026 on their actual monthly spending:\n\n- **Munich, Germany:** €550–€850 rent (Studentenwerk dorm vs WG), €130 TK health insurance, €32 Deutschlandticket Semester, €250 groceries = **~€1,000–€1,250/month**.\n- **Seoul / Daejeon, South Korea:** ₩250,000–₩450,000 campus dorm, ₩75,000 NHIS student insurance, ₩350,000 food & transit = **~₩750,000–₩950,000/month ($550–$700)**.\n- **Budapest, Hungary:** HUF 45,000 dorm or €320 shared flat + €220 food/student pass = **~€400–€600/month**.",
    isPinned: false,
    viewCount: 405,
    replies: [
      "Daejeon (KAIST campus dorms) is honestly the most affordable top-tier tech student city in the world—dorm is under $150/month!",
    ],
  },
  {
    categorySlug: "sop-essays",
    title: "CSS Profile Guide for Uzbekistan Families: Translating Soliq.uz Tax & Salary Certificates",
    body: "If you are applying for need-based financial aid at U.S. universities (MIT, Harvard, Yale, Stanford, NYU Abu Dhabi, Amherst, Williams), you will submit the **CSS Profile** and **IDOC** packet:\n\n1. Download official annual income & tax payment certificates for both parents via **my.gov.uz / soliq.uz** (each carries a QR verification code).\n2. Convert UZS figures using the official annual average exchange rate only where requested; on the CSS Profile itself, you select **UZS (Uzbekistani Som)** as your reporting currency.\n3. Use the *Special Circumstances* box (2,000 characters) to explain multi-generational household dependents, medical expenses, or agricultural/seasonal income.",
    isPinned: false,
    viewCount: 348,
    replies: [
      "That QR-coded soliq.uz tax certificate tip saved us so much time with IDOC verification!",
    ],
  },
  {
    categorySlug: "career-internships",
    title: "How to Land a Funded Summer Research Internship in Europe (Max Planck, EPFL E3, ETH SSRF, ISTA)",
    body: "Sophomore and junior undergraduates in Uzbekistan (INHA, WIUT, New Uzbekistan University, TIUE, Webster, TUIT) are eligible for fully funded European summer research fellowships:\n\n- **Deadlines fall early:** EPFL E3 and ETH SSRF close between November and December; Max Planck SIP and ISTA ISTernship close in December–February.\n- **Cold-emailing lab PIs:** Read 2 recent papers from the group, link your GitHub repository or replication notebook, and explain in 6 sentences how you can contribute to their current grant.",
    isPinned: false,
    viewCount: 274,
    replies: [
      "All of these programs are now listed in the ScholarBridge Opportunities Hub with direct links!",
    ],
  },
  {
    categorySlug: "visa",
    title: "UK Student Visa 28-Day Bank Rule & IOM Tashkent TB Test Timeline",
    body: "Two critical timing rules for anyone holding a UK university offer (UCL, Oxford, Manchester, Edinburgh, Warwick, Bristol):\n\n1. **28-Day Financial Rule:** Your bank funds (unpaid tuition + £1,483/mo London or £1,136/mo outside London for 9 months) must remain above the threshold for **28 consecutive days**, and the closing date of the statement must be within 31 days of your online UKVI visa application.\n2. **IOM Tashkent TB Certificate:** Book your chest X-ray appointment at the IOM clinic in Tashkent early in June/July before the August peak rush!",
    isPinned: false,
    viewCount: 256,
    replies: [
      "Chevening and El-Yurt Umidi full-grant holders can use their official award letter instead of the 28-day bank statement!",
    ],
  },
];

export async function seedForum() {
  try {
    const existingCats = await db.select().from(forumCategories);
    const catBySlug = new Map(existingCats.map((c) => [c.slug, c]));

    for (const spec of FORUM_CATEGORY_SPECS) {
      if (!catBySlug.has(spec.slug)) {
        const [inserted] = await db.insert(forumCategories).values(spec).returning();
        catBySlug.set(spec.slug, inserted);
      }
    }

    const [profile] = await db.select().from(studentProfiles).limit(1);
    if (!profile) return;

    const existingThreads = await db.select().from(forumThreads);
    const threadTitles = new Set(existingThreads.map((t) => t.title));

    for (const spec of FORUM_THREAD_SPECS) {
      if (threadTitles.has(spec.title)) continue;
      const cat = catBySlug.get(spec.categorySlug) ?? [...catBySlug.values()][0];
      if (!cat) continue;

      const [thread] = await db
        .insert(forumThreads)
        .values({
          categoryId: cat.id,
          authorId: profile.id,
          title: spec.title,
          body: spec.body,
          isPinned: spec.isPinned,
          isLocked: false,
          viewCount: spec.viewCount,
        })
        .returning();

      for (const replyBody of spec.replies) {
        await db.insert(forumReplies).values({
          threadId: thread.id,
          authorId: profile.id,
          body: replyBody,
        });
      }
    }
  } catch (error) {
    console.error("Error seeding forum:", error);
  }
}

// ---------------------------------------------------------------------------
// Seed: 5 Complete Courses, Modules, Lessons, Quizzes & Questions (2026-2027)
// ---------------------------------------------------------------------------
interface CourseSeedSpec {
  title: string;
  description: string;
  instructorName: string;
  level: string;
  thumbnailUrl: string;
  modules: {
    title: string;
    description: string;
    lessons: {
      title: string;
      videoUrl: string;
      durationSeconds: number;
      content: string;
      quizQuestions: {
        question: string;
        options: string[];
        correctOptionIndex: number;
      }[];
    }[];
  }[];
}

const COURSE_CATALOG_SPECS: CourseSeedSpec[] = [
  {
    title: "Mastering Your Study Abroad Application",
    description:
      "A step-by-step video course covering university selection, SOP writing, scholarships, and visa preparation — from zero to submission-ready application.",
    instructorName: "Dr. Elena Carter",
    level: "Beginner",
    thumbnailUrl: "https://images.unsplash.com/photo-1523050854058-8df90110c9f1?q=80&w=800&auto=format&fit=crop",
    modules: [
      {
        title: "Foundation & Planning",
        description: "Build your balanced reach/match/safety university list and 12-month timeline",
        lessons: [
          {
            title: "Choosing the Right University & Program",
            videoUrl: "https://storage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4",
            durationSeconds: 540,
            content:
              "### Evaluating Global Universities Strategically\n\nInstead of relying solely on headline rankings, build a **balanced 8–10 university portfolio** (2–3 Reach, 4 Match, 2 Financial/Admissions Safety) across 2–3 destination countries.\n\n- **Curriculum & Credit Fit:** For European Master's programs (Germany, Netherlands, Belgium), verify that your Bachelor transcript satisfies the exact ECTS credit prerequisites in mathematics and core subjects.\n- **Total Net Cost of Attendance:** Compare full annual cost (tuition + housing + mandatory health insurance + books + flights + visa fees) minus confirmed scholarships.\n- **Post-Study Work Pathways:** Evaluate STEM OPT (36 months in USA), UK Graduate Route (24 months), German 18-month Job-Seeker Residence Permit, and Canadian PGWP.",
            quizQuestions: [
              {
                question: "What is the recommended structure for an international university application list?",
                options: [
                  "A balanced portfolio of Reach, Match, and Financial/Admissions Safety programs across 2–3 countries",
                  "Applying only to a single top-3 ranked university without backups",
                  "Choosing universities alphabetically without checking tuition or subject prerequisites",
                  "Waiting until after graduation to check language test requirements",
                ],
                correctOptionIndex: 0,
              },
              {
                question: "Which factor is most critical when applying to consecutive Master's programs in Germany or Belgium?",
                options: [
                  "Subject-specific ECTS credit compatibility with your Bachelor transcript",
                  "High school sports trophies",
                  "Having a sibling in Europe",
                  "Purchasing a flight ticket before applying",
                ],
                correctOptionIndex: 0,
              },
            ],
          },
          {
            title: "Building Your 12-Month Application & Scholarship Timeline",
            videoUrl: "https://storage.googleapis.com/gtv-videos-bucket/sample/ForBiggerEscapes.mp4",
            durationSeconds: 480,
            content:
              "### Working Backwards from Scholarship Deadlines\n\nMajor government and university scholarships close **6 to 11 months before classes start**:\n\n1. **August–October:** Chevening (UK), Knight-Hennessy (Stanford), Gates Cambridge, and US Early Action/Early Decision prep.\n2. **October–December:** DAAD (Germany), Lester B. Pearson (Toronto), ETH Zurich ESOP, and Erasmus Mundus.\n3. **January–March:** Stipendium Hungaricum (Hungary), Türkiye Bursları (Turkey), and GKS Graduate (South Korea).\n4. **April–June:** El-Yurt Umidi Foundation rounds, MEXT Embassy Track (Japan), Sperrkonto opening, and embassy visa appointments.",
            quizQuestions: [
              {
                question: "When do most fully funded international scholarships close relative to program start?",
                options: [
                  "6 to 11 months before classes begin",
                  "One week before orientation",
                  "After the first semester ends",
                  "Only on leap years",
                ],
                correctOptionIndex: 0,
              },
              {
                question: "When should you request academic recommendation letters from professors?",
                options: [
                  "At least 4 to 6 weeks before the earliest deadline, accompanied by your CV and bulleted achievements",
                  "The night before the portal closes",
                  "After submitting the application without telling them",
                  "Never — universities do not read references",
                ],
                correctOptionIndex: 0,
              },
            ],
          },
        ],
      },
      {
        title: "Writing & Documents",
        description: "SOP, Academic CV, and high-impact recommendation packets",
        lessons: [
          {
            title: "Writing a Winning Statement of Purpose (SOP)",
            videoUrl: "https://storage.googleapis.com/gtv-videos-bucket/sample/ForBiggerFun.mp4",
            durationSeconds: 600,
            content:
              "### The 5-Part Statement of Purpose Architecture\n\n1. **The Intellectual Hook (10%):** Open with a concrete research question, engineering challenge, or policy problem you encountered.\n2. **Academic & Quantitative Foundation (25%):** Highlight rigorous coursework, thesis findings, and technical tools mastered.\n3. **Applied Projects & Impact (25%):** Quantify what you built, researched, or led — cite datasets, metrics, or publications.\n4. **Why This Program & Faculty (25%):** Name 2–3 specific courses, laboratories, and professors whose current work aligns with your thesis goals.\n5. **Post-Graduation Career Trajectory (15%):** State your 3-year and 7-year career plan and measurable contribution upon returning or graduating.",
            quizQuestions: [
              {
                question: "How much of a Statement of Purpose should focus on specific courses, labs, and faculty at the target university?",
                options: [
                  "Roughly 20–25%, naming concrete modules and professors aligned with your research goal",
                  "0% — keep the essay completely generic so no university is mentioned",
                  "100% — copy the university's Wikipedia page verbatim",
                  "Only mention the city's weather and tourist attractions",
                ],
                correctOptionIndex: 0,
              },
              {
                question: "What makes project descriptions persuasive in an SOP?",
                options: [
                  "Specific methodology, tools used, and measurable outcomes or findings",
                  "Vague adjectives without evidence",
                  "Repeating your high school grades line by line",
                  "Using as many 10-syllable words as possible",
                ],
                correctOptionIndex: 0,
              },
            ],
          },
          {
            title: "Academic CVs, Transcripts & Recommendation Letters",
            videoUrl: "https://storage.googleapis.com/gtv-videos-bucket/sample/ForBiggerJoyrides.mp4",
            durationSeconds: 510,
            content:
              "### Formatting an International Academic CV\n\n- Keep undergraduate CVs to **1 page** and Master's/PhD CVs to **1–2 pages**.\n- Order sections by academic relevance: *Education (with original GPA + scale), Research & Publications, Technical Projects, Work Experience, Honours & Olympiads, Skills & Languages*.\n- **Hague Apostille in Uzbekistan:** Obtain your e-Apostille via `my.gov.uz` on original diplomas and transcripts before ordering certified translations for Germany, South Korea, Italy, Hungary, or Poland.",
            quizQuestions: [
              {
                question: "How should you report an Uzbek 5.0-scale GPA on an international CV?",
                options: [
                  "State your exact official GPA alongside the maximum scale (e.g., 4.90 / 5.00) and class rank if available",
                  "Guess a 4.0 number without mentioning the original scale",
                  "Leave GPA off the CV completely",
                  "Multiply your GPA by 25",
                ],
                correctOptionIndex: 0,
              },
              {
                question: "Which countries routinely require a Hague Apostille on Uzbek diplomas for enrollment and student visas?",
                options: [
                  "South Korea, Germany, Italy, Hungary, Turkey, and Poland",
                  "None — photocopies without translation are accepted everywhere",
                  "Only domestic universities",
                  "Only online MOOCs",
                ],
                correctOptionIndex: 0,
              },
            ],
          },
        ],
      },
      {
        title: "Funding & Visa",
        description: "Multi-currency financial planning and embassy interview readiness",
        lessons: [
          {
            title: "Scholarship Portfolio Strategy for International Students",
            videoUrl: "https://storage.googleapis.com/gtv-videos-bucket/sample/ForBiggerMeltdowns.mp4",
            durationSeconds: 560,
            content:
              "### Combining Institutional, Bilateral & National Scholarships\n\nNever rely on a single scholarship application. Build a **3-tier funding portfolio**:\n\n1. **University-Issued Aid:** Need-based grants (US CSS Profile universities) or automatic merit fee remissions (KAIST, ETH ESOP, U of T, Melbourne).\n2. **Host-Government Scholarships:** Chevening (UK), DAAD (Germany), GKS (South Korea), MEXT (Japan), Stipendium Hungaricum (Hungary), Türkiye Bursları (Turkey).\n3. **Home-Country Presidential Grants:** El-Yurt Umidi Foundation (Uzbekistan) for students admitted to Top-300 global universities.",
            quizQuestions: [
              {
                question: "Why should you distinguish between tuition-only waivers and living stipends in your budget?",
                options: [
                  "A tuition waiver cannot pay for housing, health insurance, or food — you still need confirmed living support for visa issuance",
                  "Embassies do not check living costs",
                  "Tuition waivers automatically include free flights and apartments",
                  "Living stipends can only be spent on textbooks",
                ],
                correctOptionIndex: 0,
              },
              {
                question: "Which Uzbekistan national foundation funds students admitted to Top-300 global universities?",
                options: [
                  "El-Yurt Umidi Foundation",
                  "DAAD",
                  "Tempus Public Foundation",
                  "JASSO",
                ],
                correctOptionIndex: 0,
              },
            ],
          },
          {
            title: "Student Visa Financial Proof & Consular Interview Preparation",
            videoUrl: "https://storage.googleapis.com/gtv-videos-bucket/sample/SubaruOutbackOnStreetAndDirt.mp4",
            durationSeconds: 520,
            content:
              "### Clearing the Financial & Academic Credibility Check\n\nEvery embassy verifies three pillars before issuing a student visa:\n\n1. **Bona Fide Student Intent:** You can explain your degree curriculum, why you chose that university, and how it fits your academic background.\n2. **Liquid, Verifiable Funding:** US Form I-20 bank/sponsor evidence, UK 28-day consecutive bank balance, German €11,904 Sperrkonto, Canadian CAD 20,635+ proof, or Korean $20,000 D-2 balance.\n3. **Post-Graduation Career Plan:** A credible professional trajectory connecting your degree to high-demand roles in Uzbekistan and the region.",
            quizQuestions: [
              {
                question: "Under UK Student Route visa rules, how long must required maintenance funds be held continuously before applying?",
                options: [
                  "At least 28 consecutive days, with the closing balance dated within 31 days of application",
                  "1 day before the biometric appointment",
                  "5 years",
                  "No bank statement is ever required for self-funded students",
                ],
                correctOptionIndex: 0,
              },
              {
                question: "What is the 2026 annual blocked account (Sperrkonto) requirement for a German National Student Visa?",
                options: [
                  "€11,904 per year (€992 per month)",
                  "€1,000 per year",
                  "€50,000 per year",
                  "€0 for self-funded students",
                ],
                correctOptionIndex: 0,
              },
            ],
          },
        ],
      },
    ],
  },
  {
    title: "Mastering the Personal Statement, Common App & Chevening/GKS Essays",
    description:
      "Write unforgettable admissions and scholarship essays: US Common App personal statements, UK UCAS & Chevening 4-essay sets, GKS Study Plans, and European motivation letters.",
    instructorName: "Prof. Nilufar Rakhmatullaeva & Dr. Sardorbek Ibragimov",
    level: "Intermediate",
    thumbnailUrl: "https://images.unsplash.com/photo-1455390582262-044cdead277a?q=80&w=800&auto=format&fit=crop",
    modules: [
      {
        title: "US Common App & Supplemental Essays",
        description: "Crafting narrative hooks, intellectual vitality, and 'Why Us' supplementals",
        lessons: [
          {
            title: "The 650-Word Common App Personal Statement: Show, Don't Summarize",
            videoUrl: "https://storage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4",
            durationSeconds: 620,
            content:
              "### Avoiding the 'Resume-in-Prose' Trap\n\nAdmissions officers at MIT, Stanford, Yale, and NYUAD already have your Activities List. Your 650-word Personal Statement should reveal **how you think, what you value, and how you grow through challenge**.\n\n- **Start in a Specific Scene:** Open with a concrete moment of curiosity or problem-solving rather than a dictionary quote.\n- **The 30/70 Rule:** Spend no more than 30% of the essay describing the background circumstance and 70% on your actions, reflection, and intellectual evolution.",
            quizQuestions: [
              {
                question: "What is the biggest mistake students make in the 650-word Common App Personal Statement?",
                options: [
                  "Repeating their entire extracurricular activity list in paragraph form without personal reflection",
                  "Focusing deeply on how they solved a meaningful problem",
                  "Staying within the 650-word limit",
                  "Proofreading their grammar",
                ],
                correctOptionIndex: 0,
              },
              {
                question: "According to the 30/70 rule for personal essays, where should most of your word count go?",
                options: [
                  "70% on your actions, intellectual growth, and reflection",
                  "70% on famous quotes from historical figures",
                  "70% on listing your elementary school grades",
                  "70% on describing the campus buildings",
                ],
                correctOptionIndex: 0,
              },
            ],
          },
          {
            title: "Writing Razor-Sharp 'Why Major' and 'Why This University' Supplementals",
            videoUrl: "https://storage.googleapis.com/gtv-videos-bucket/sample/ForBiggerEscapes.mp4",
            durationSeconds: 530,
            content:
              "### The Bridge Method for Supplemental Essays\n\nEvery great 'Why Us' essay builds a bridge between **Past Evidence** (what you have already explored in Tashkent/Samarkand) and **Future Campus Resources** (specific labs, UROP tracks, seminars, and student organizations at the target university).",
            quizQuestions: [
              {
                question: "What makes a 'Why This University' supplemental essay stand out to admissions readers?",
                options: [
                  "Connecting your past projects to specific upper-level courses, faculty labs, and campus initiatives",
                  "Praising the university's US News ranking and prestige",
                  "Using the exact same paragraph for 10 different universities without changing anything",
                  "Only mentioning the city's population",
                ],
                correctOptionIndex: 0,
              },
              {
                question: "In a 250-word 'Why Major' essay, how should you open?",
                options: [
                  "With the specific problem, experiment, or project that sparked your intellectual curiosity in the field",
                  "With 'Since I was born, I always loved science'",
                  "By copying the department's homepage mission statement",
                  "By listing your SAT score",
                ],
                correctOptionIndex: 0,
              },
            ],
          },
        ],
      },
      {
        title: "Chevening, Gates Cambridge & UK Personal Statements",
        description: "STAR leadership storytelling and academic-focused UK statements",
        lessons: [
          {
            title: "Mastering the Four 500-Word Chevening Scholarship Essays",
            videoUrl: "https://storage.googleapis.com/gtv-videos-bucket/sample/ForBiggerFun.mp4",
            durationSeconds: 640,
            content:
              "### Connecting Leadership, Networking, UK Study & Career Plan\n\n- **Leadership & Influence:** Present 2 professional or civic examples using **Situation (15%) → Task (15%) → Action (45%) → Measurable Result (25%)**.\n- **Networking:** Show how you built partnerships across institutions and how you will leverage them for Essay 4's Career Plan.\n- **Studying in the UK:** Justify each of your 3 UK Master's choices and connect their modules to Uzbekistan's development priorities.\n- **Career Plan:** Define realistic 2-year, 5-year, and 10-year goals upon returning to Uzbekistan for the mandatory 2-year residency period.",
            quizQuestions: [
              {
                question: "In the STAR method for Chevening essays, which component should receive the largest share of detail?",
                options: [
                  "Action (45%) and Measurable Result (25%)",
                  "Background description of the company building (90%)",
                  "General definitions of leadership from textbooks",
                  "Complaints about coworkers",
                ],
                correctOptionIndex: 0,
              },
              {
                question: "What is a mandatory post-study requirement of the UK Chevening Scholarship?",
                options: [
                  "Returning to your home country (Uzbekistan) for at least 2 years after completing your Master's degree",
                  "Never returning to your home country",
                  "Completing a second Bachelor's degree",
                  "Paying back double the tuition fee",
                ],
                correctOptionIndex: 0,
              },
            ],
          },
          {
            title: "UK UCAS & Russell Group Postgraduate Academic Statements",
            videoUrl: "https://storage.googleapis.com/gtv-videos-bucket/sample/ForBiggerJoyrides.mp4",
            durationSeconds: 490,
            content:
              "### Why UK Statements Differ from US Common App Essays\n\nUK admissions tutors (Oxford, Cambridge, Imperial, UCL, LSE, Edinburgh) want **80% academic depth and 20% relevant extracurriculars**. Discuss books, papers, independent research, olympiad problems, or technical projects that prepared you for the rigorous three-year UK curriculum.",
            quizQuestions: [
              {
                question: "What ratio of academic content to extracurriculars do UK Russell Group universities expect in a Personal Statement?",
                options: [
                  "Roughly 80% academic preparation/super-curricular depth and 20% relevant extracurriculars",
                  "100% childhood hobbies with no mention of the academic subject",
                  "50% sports and 50% travel stories",
                  "Only a list of desired salaries",
                ],
                correctOptionIndex: 0,
              },
              {
                question: "What is 'super-curricular' engagement in UK admissions?",
                options: [
                  "Independent academic exploration beyond school syllabus—such as research papers, coding projects, olympiads, or subject books",
                  "Playing varsity football",
                  "Attending homeroom on time",
                  "Buying campus merchandise",
                ],
                correctOptionIndex: 0,
              },
            ],
          },
        ],
      },
      {
        title: "GKS Korea, MEXT Japan & DAAD Germany Motivation Letters",
        description: "Structuring research proposals and structured study plans for Asia & Europe",
        lessons: [
          {
            title: "Writing the Global Korea Scholarship (GKS) Personal Statement & Study Plan",
            videoUrl: "https://storage.googleapis.com/gtv-videos-bucket/sample/ForBiggerMeltdowns.mp4",
            durationSeconds: 580,
            content:
              "### The 3-Section GKS Study Plan\n\nNIIED divides the GKS Study Plan into:\n1. **Language Study Plan:** Concrete strategy for achieving TOPIK Level 4–5 during the 1-year Korean language institute program (plus English academic readiness).\n2. **Goal of Study & Detailed Study Plan:** Semester-by-semester breakdown of core courses, target laboratory, and thesis methodology at your chosen Korean universities.\n3. **Future Plan After Study:** How your Korean degree will advance industry, academia, or bilateral Uzbekistan–Korea cooperation.",
            quizQuestions: [
              {
                question: "What are the three mandatory sections of the official GKS Study Plan form?",
                options: [
                  "Language Study Plan (Korean & English), Goal of Study & Detailed Study Plan, and Future Plan After Study",
                  "Childhood biography, favorite K-drama, and tourist itinerary",
                  "Only a 1-sentence summary",
                  "Bank wire instructions",
                ],
                correctOptionIndex: 0,
              },
              {
                question: "How long is the mandatory Korean language preparatory program for GKS scholars who do not yet hold TOPIK Level 5 or 6?",
                options: [
                  "1 year at a NIIED-designated university Korean language institute",
                  "2 weeks",
                  "5 years",
                  "There is no language program in GKS",
                ],
                correctOptionIndex: 0,
              },
            ],
          },
          {
            title: "DAAD Letter of Motivation & MEXT Research Proposal Blueprint",
            videoUrl: "https://storage.googleapis.com/gtv-videos-bucket/sample/SubaruOutbackOnStreetAndDirt.mp4",
            durationSeconds: 550,
            content:
              "### German & Japanese Academic Precision\n\n- **DAAD Motivation Letter (1–2 pages strict):** Follow the DAAD guideline header structure—Academic Qualification, Professional Experience, Reason for Choosing the 3 German Master's Programs, and Developmental Relevance for Uzbekistan.\n- **MEXT Field of Study & Research Plan:** State a clear *Research Title, Literature Gap, Methodology, Dataset/Experiments, and 24-Month Schedule*.",
            quizQuestions: [
              {
                question: "What is the strict page limit for a DAAD Study Scholarship Letter of Motivation?",
                options: [
                  "1 to 2 pages maximum ( strictly enforced )",
                  "10 to 15 pages",
                  "Half a tweet",
                  "50 pages including photos",
                ],
                correctOptionIndex: 0,
              },
              {
                question: "What must a MEXT Postgraduate Research Plan include to secure a Letter of Provisional Acceptance from a Japanese professor?",
                options: [
                  "A clear research question, literature review gap, proposed methodology, and 2-year research schedule",
                  "Only a high school report card",
                  "A list of tourist cities in Japan",
                  "An untranslated document in shorthand",
                ],
                correctOptionIndex: 0,
              },
            ],
          },
        ],
      },
    ],
  },
  {
    title: "IELTS 8.0+ & Academic English Writing Intensive",
    description:
      "Targeted Band 7.5–8.5 preparation for Uzbekistan test takers: Task 1 & Task 2 academic writing frameworks, Reading speed-scanning, and Speaking Part 2/3 fluency.",
    instructorName: "Aziza Tursunkhodjaeva (IELTS 8.5, Fulbright Alumna)",
    level: "Intermediate",
    thumbnailUrl: "https://images.unsplash.com/photo-1434030216411-0b793f4b4173?q=80&w=800&auto=format&fit=crop",
    modules: [
      {
        title: "Academic Writing Task 2 & Task 1 Band 8.0 Frameworks",
        description: "Turn Band 6.0/6.5 writing into cohesive, high-scoring Band 7.5–8.0 essays",
        lessons: [
          {
            title: "IELTS Writing Task 2: The 4-Paragraph Cohesive Argument",
            videoUrl: "https://storage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4",
            durationSeconds: 610,
            content:
              "### Scoring 8.0 on Task Response & Coherence\n\n1. **Introduction (2 sentences, ~45 words):** Paraphrase the prompt accurately + state your clear thesis position and two main reasons.\n2. **Body Paragraph 1 (~100 words):** Topic Sentence → Logical Explanation (*Why is this true?*) → Concrete Real-World Example → Link back to thesis.\n3. **Body Paragraph 2 (~100 words):** Second distinct argument developed in depth (never list 4 undeveloped bullet points).\n4. **Conclusion (1–2 sentences, ~35 words):** Restate your position and summarize both core reasons without introducing new claims.",
            quizQuestions: [
              {
                question: "Why do many students score Band 6.0 in Task Response despite writing 300 words?",
                options: [
                  "They list multiple shallow ideas in a paragraph instead of fully explaining and exemplifying one clear central argument per body paragraph",
                  "They use clear topic sentences",
                  "They answer both parts of the question",
                  "They write 270–290 words",
                ],
                correctOptionIndex: 0,
              },
              {
                question: "How many sentences should an efficient Band 8.0 IELTS Task 2 Introduction contain?",
                options: [
                  "2 focused sentences: a precise prompt paraphrase followed by a direct thesis statement",
                  "8 sentences of memorized clichés",
                  "A rhetorical question with no thesis",
                  "Copy-pasting the prompt word for word",
                ],
                correctOptionIndex: 0,
              },
            ],
          },
          {
            title: "IELTS Academic Writing Task 1: Overview First, Grouped Data Second",
            videoUrl: "https://storage.googleapis.com/gtv-videos-bucket/sample/ForBiggerEscapes.mp4",
            durationSeconds: 500,
            content:
              "### The Golden Rule of Academic Task 1 (Charts, Maps & Processes)\n\nTo score **Band 7.0+ in Task Achievement**, your report MUST include a clear **Overview paragraph** summarizing the 2–3 most significant overall trends, extremes, or stages—with **zero personal opinion**.",
            quizQuestions: [
              {
                question: "What is the ceiling score in Task Achievement if an IELTS Academic Task 1 report lacks a clear Overview?",
                options: [
                  "Band 5.0 in Task Achievement regardless of grammar",
                  "Band 9.0",
                  "Band 8.5",
                  "Overview is optional in Academic Task 1",
                ],
                correctOptionIndex: 0,
              },
              {
                question: "Should you include personal opinions or speculate on external causes in IELTS Academic Task 1?",
                options: [
                  "Never — report only the factual trends and comparisons shown in the visual data",
                  "Yes, write two paragraphs of personal opinion",
                  "Yes, criticize the survey methodology",
                  "Yes, predict numbers for the year 2100",
                ],
                correctOptionIndex: 0,
              },
            ],
          },
        ],
      },
      {
        title: "Academic Reading & Listening Precision",
        description: "True/False/Not Given logic and distraction-proof listening strategies",
        lessons: [
          {
            title: "Cracking True / False / Not Given & Matching Headings in 60 Minutes",
            videoUrl: "https://storage.googleapis.com/gtv-videos-bucket/sample/ForBiggerFun.mp4",
            durationSeconds: 540,
            content:
              "### The Exact Distinction Between FALSE and NOT GIVEN\n\n- **TRUE:** The passage states the exact same meaning using synonyms.\n- **FALSE:** The passage directly **contradicts** the statement (the opposite is proven true in the text).\n- **NOT GIVEN:** The specific claim or comparison is neither confirmed nor contradicted in the text—do not extrapolate!",
            quizQuestions: [
              {
                question: "When is an IELTS Reading statement marked FALSE rather than NOT GIVEN?",
                options: [
                  "Only when the passage explicitly states the opposite or directly contradicts the claim",
                  "Whenever a word from the question is missing",
                  "Whenever you disagree with the author personally",
                  "FALSE and NOT GIVEN mean the exact same thing",
                ],
                correctOptionIndex: 0,
              },
              {
                question: "How much extra time do you get at the end of IELTS Academic Reading to transfer answers?",
                options: [
                  "Zero extra minutes — all 40 answers must be recorded within the 60-minute limit",
                  "10 extra minutes",
                  "30 extra minutes",
                  "Unlimited time",
                ],
                correctOptionIndex: 0,
              },
            ],
          },
          {
            title: "Listening Section 3 & 4: Signpost Words & Distractor Traps",
            videoUrl: "https://storage.googleapis.com/gtv-videos-bucket/sample/ForBiggerJoyrides.mp4",
            durationSeconds: 470,
            content:
              "### Spotting Self-Correction Distractors\n\nIn Section 3 (academic seminar discussion), speakers frequently propose an option and then pivot using contrast markers (*'Initially we planned to survey 200 students, **however** Dr. Evans advised cutting that to 120'*). Always wait for the confirmation clause before locking your answer.",
            quizQuestions: [
              {
                question: "In IELTS Listening Section 3, what usually follows words like 'but actually', 'on second thought', or 'however'?",
                options: [
                  "The corrected final answer that replaces the initial distractor",
                  "Irrelevant background music",
                  "The end of the exam",
                  "A repeat of Section 1",
                ],
                correctOptionIndex: 0,
              },
              {
                question: "In IELTS Listening Section 4 note completion, how must your word count and spelling be formatted?",
                options: [
                  "Exact spelling within the stated word/number limit, using the exact word form heard in the recording",
                  "Approximate phonetic spelling is fine",
                  "Write full 10-word sentences for a 'ONE WORD ONLY' blank",
                  "Leave plural endings off every noun",
                ],
                correctOptionIndex: 0,
              },
            ],
          },
        ],
      },
      {
        title: "Speaking Part 2 & Part 3 Band 8.0 Fluency",
        description: "Structuring 2-minute long turns and abstract Part 3 analytical answers",
        lessons: [
          {
            title: "Speaking Part 2 Cue Card: The Past–Present–Reflection Story Arc",
            videoUrl: "https://storage.googleapis.com/gtv-videos-bucket/sample/ForBiggerMeltdowns.mp4",
            durationSeconds: 490,
            content:
              "### Speaking Naturally for the Full 120 Seconds\n\nInstead of stopping after 60 seconds because you ticked off the 4 bullet points on the cue card, structure your 1-minute prep notes into three columns: **Context/Past (30s) → Core Story/Present (60s) → Impact/Future Reflection (30s)**.",
            quizQuestions: [
              {
                question: "How long should you speak during IELTS Speaking Part 2?",
                options: [
                  "1.5 to 2 full minutes until the examiner politely stops you",
                  "25 seconds",
                  "5 minutes without stopping",
                  "Read silently from your notes without speaking",
                ],
                correctOptionIndex: 0,
              },
              {
                question: "What happens if you cover the cue card's four bullet points in 45 seconds?",
                options: [
                  "Continue expanding with a concrete example, personal reflection, or future implication until the 2 minutes end",
                  "Stop talking and stare at the timer for 75 seconds",
                  "Ask the examiner to answer the question instead",
                  "Walk out of the room",
                ],
                correctOptionIndex: 0,
              },
            ],
          },
          {
            title: "Speaking Part 3: The Claim → Reason → Example → Nuance Formula",
            videoUrl: "https://storage.googleapis.com/gtv-videos-bucket/sample/SubaruOutbackOnStreetAndDirt.mp4",
            durationSeconds: 510,
            content:
              "### Treating Part 3 Like an Academic Mini-Discussion\n\nIn Part 3, the examiner tests your ability to discuss **societal trends, policy trade-offs, and future predictions** (not just personal habits). Use **Claim → Reason → Real-World Example → Conditional Nuance**.",
            quizQuestions: [
              {
                question: "How should Part 3 answers differ from Part 1 answers in IELTS Speaking?",
                options: [
                  "Part 3 answers analyze broader societal trends, causes, and examples rather than just personal likes and dislikes",
                  "Part 3 answers should be one-word yes/no replies",
                  "Part 3 is only about spelling your name",
                  "Part 3 is optional",
                ],
                correctOptionIndex: 0,
              },
              {
                question: "What should you do if you get an unfamiliar abstract question in Speaking Part 3?",
                options: [
                  "Buy 2 seconds with a natural framing phrase ('That's an interesting angle to consider because...') and break the topic into two groups or timeframes",
                  "Remain completely silent for 30 seconds",
                  "Recite a memorized essay about tourism",
                  "Switch to another language",
                ],
                correctOptionIndex: 0,
              },
            ],
          },
        ],
      },
    ],
  },
  {
    title: "SAT 1500+ Quantitative & Reading Strategy for Central Asian Applicants",
    description:
      "Master the adaptive Digital SAT: Module 2 hard-route Math, Desmos graphing calculator speed-solves, Standard English Conventions grammar rules, and Command of Evidence.",
    instructorName: "Dr. Sardorbek Ibragimov (SAT 1580, MIT PhD)",
    level: "Advanced",
    thumbnailUrl: "https://images.unsplash.com/photo-1635070041078-e363dbe005cb?q=80&w=800&auto=format&fit=crop",
    modules: [
      {
        title: "Digital SAT Adaptive Architecture & Desmos Mastery",
        description: "How multistage adaptive testing works and how to solve 40% of Math with Desmos",
        lessons: [
          {
            title: "Understanding Multistage Adaptive Scoring & the Hard Module 2 Route",
            videoUrl: "https://storage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4",
            durationSeconds: 520,
            content:
              "### Why Module 1 Accuracy Is Non-Negotiable\n\nThe Digital SAT adapts between Module 1 and Module 2. To unlock the **700–800 score ceiling** in either section, you must route into the **Hard Module 2** by scoring at least ~19–20/22 in Math Module 1 and ~21/27 in Reading & Writing Module 1.",
            quizQuestions: [
              {
                question: "How does the Digital SAT adapt to a student's performance?",
                options: [
                  "Stage-adaptive between Module 1 and Module 2 based on your overall Module 1 performance",
                  "Every student gets the exact same paper booklet with no adaptation",
                  "Only the last question of the test counts",
                  "You choose your own score before the test",
                ],
                correctOptionIndex: 0,
              },
              {
                question: "Why is careless-error checking in Math Module 1 so important?",
                options: [
                  "Routing into the easier Module 2 caps your maximum possible section score well below 700–800",
                  "Module 2 is not graded",
                  "Calculators are banned in Module 1",
                  "Module 1 has 100 questions",
                ],
                correctOptionIndex: 0,
              },
            ],
          },
          {
            title: "Desmos Graphing Calculator Power Techniques for 780–800 Math",
            videoUrl: "https://storage.googleapis.com/gtv-videos-bucket/sample/ForBiggerEscapes.mp4",
            durationSeconds: 630,
            content:
              "### 4 Desmos Shortcuts Every 1500+ Scorer Uses\n\n1. **Systems of Linear & Nonlinear Equations:** Graph both equations directly and click the intersection points.\n2. **Regression (`y1 ~ ax1^2 + bx1 + c`):** Enter any 3 points from a table into `(x1, y1)` and let Desmos output the exact quadratic or exponential coefficients.\n3. **Constant Sliders (`a`, `k`, `c`):** For 'no solution' or 'infinitely many solutions' problems, add a slider and match slopes/intercepts visually.\n4. **Circle Equations:** Type `x^2 + y^2 - 6x + 8y = 11` directly into Desmos to inspect the center and diameter.",
            quizQuestions: [
              {
                question: "Which Desmos syntax finds the exact quadratic function passing through a table of points (x1, y1)?",
                options: [
                  "y1 ~ ax1^2 + bx1 + c",
                  "solve(quadratic)",
                  "import math",
                  "x = y",
                ],
                correctOptionIndex: 0,
              },
              {
                question: "For a system of two linear equations to have 'no solution', what must be true of their lines?",
                options: [
                  "Equal slopes (parallel lines) and different y-intercepts",
                  "Perpendicular slopes",
                  "Identical slopes and identical y-intercepts",
                  "Both lines must pass through (0, 0)",
                ],
                correctOptionIndex: 0,
              },
            ],
          },
        ],
      },
      {
        title: "Advanced Algebra, Geometry & Discriminant Traps",
        description: "Conquering Questions 18–22 of Hard Math Module 2",
        lessons: [
          {
            title: "Quadratic Discriminants, Vieta's Formulas & Exponential Growth",
            videoUrl: "https://storage.googleapis.com/gtv-videos-bucket/sample/ForBiggerFun.mp4",
            durationSeconds: 580,
            content:
              "### Instant Algebraic Shortcuts\n\n- **Sum of roots** of `ax^2 + bx + c = 0` is `-b/a`; **product of roots** is `c/a`.\n- **Discriminant (`D = b^2 - 4ac`):**\n  - `D > 0` → 2 distinct real solutions\n  - `D = 0` → 1 real solution (tangent to x-axis)\n  - `D < 0` → 0 real solutions",
            quizQuestions: [
              {
                question: "For the quadratic equation 3x^2 - 15x + 7 = 0, what is the sum of its solutions?",
                options: [
                  "5 (using -b/a = 15/3)",
                  "-5",
                  "7/3",
                  "15",
                ],
                correctOptionIndex: 0,
              },
              {
                question: "If a parabola y = ax^2 + bx + c is tangent to the x-axis at exactly one point, what is the value of b^2 - 4ac?",
                options: [
                  "0",
                  "Greater than 100",
                  "Negative",
                  "Undefined",
                ],
                correctOptionIndex: 0,
              },
            ],
          },
          {
            title: "Circle Theorems, Similar Triangles, Radians & Right-Triangle Trig",
            videoUrl: "https://storage.googleapis.com/gtv-videos-bucket/sample/ForBiggerJoyrides.mp4",
            durationSeconds: 540,
            content:
              "### High-Yield Geometry Identities\n\n- **Complementary Angles:** If `A + B = 90°`, then `sin(A) = cos(B)`.\n- **Inscribed vs Central Angle:** A central angle in a circle is always **twice** the inscribed angle subtending the same arc.",
            quizQuestions: [
              {
                question: "In a right triangle where angles A and B are acute complementary angles, if sin(A) = 4/5, what is cos(B)?",
                options: [
                  "4/5 (since sin(A) = cos(90° - A) = cos(B))",
                  "3/5",
                  "5/4",
                  "0",
                ],
                correctOptionIndex: 0,
              },
              {
                question: "How is the area of a circle sector with central angle θ (in radians) and radius r calculated?",
                options: [
                  "(1/2) * r^2 * θ",
                  "2 * π * r",
                  "r * θ",
                  "π * r^3",
                ],
                correctOptionIndex: 0,
              },
            ],
          },
        ],
      },
      {
        title: "Digital SAT Reading & Writing 750+ Playbook",
        description: "Punctuation boundaries, modifiers, logical transitions, and scientific evidence",
        lessons: [
          {
            title: "Standard English Conventions: Clause Boundaries, Semicolons, Colons & Modifiers",
            videoUrl: "https://storage.googleapis.com/gtv-videos-bucket/sample/ForBiggerMeltdowns.mp4",
            durationSeconds: 550,
            content:
              "### The 4 Non-Negotiable SAT Grammar Rules\n\n1. **Period = Semicolon = Comma + FANBOYS (`for, and, nor, but, or, yet, so`):** All three only join two complete independent clauses.\n2. **Colon (`:`):** Must be preceded by a complete independent clause; what follows can be an explanation, list, or single noun phrase.\n3. **Dangling Modifier:** The noun immediately following an introductory participial phrase (*'Trained in Tashkent as an astrophysicist, ___'*) MUST be the person or thing performing that action.",
            quizQuestions: [
              {
                question: "If two answer choices on the Digital SAT are identical except one uses a period (.) and the other uses a semicolon (;) between two clauses, what can you conclude?",
                options: [
                  "Both choices can usually be eliminated because a period and a semicolon are grammatically interchangeable between independent clauses",
                  "Both choices are simultaneously correct",
                  "Always pick the semicolon without reading the sentence",
                  "Semicolons can only be used in math equations",
                ],
                correctOptionIndex: 0,
              },
              {
                question: "In the sentence 'Published in 1025 by Ibn Sina, ___ revolutionized medicine', what must immediately follow the comma?",
                options: [
                  "'The Canon of Medicine' (the work that was published in 1025)",
                  "'doctors in Europe'",
                  "'hospitals'",
                  "'studying anatomy'",
                ],
                correctOptionIndex: 0,
              },
            ],
          },
          {
            title: "Command of Evidence, Scientific Hypotheses & Rhetorical Synthesis",
            videoUrl: "https://storage.googleapis.com/gtv-videos-bucket/sample/SubaruOutbackOnStreetAndDirt.mp4",
            durationSeconds: 530,
            content:
              "### Solving Rhetorical Synthesis in 20 Seconds\n\nFor Rhetorical Synthesis ('student notes') questions at the end of each Reading & Writing module, **you do not even need to read the bulleted notes first** unless two choices satisfy the prompt goal! Read the exact goal in the question stem (*e.g., 'emphasize a similarity between A and B'*) and eliminate every choice that fails to include both A and B and a comparison word.",
            quizQuestions: [
              {
                question: "What is the fastest strategy for Digital SAT Rhetorical Synthesis ('student notes') questions?",
                options: [
                  "Read the exact rhetorical goal in the question stem first and test the 4 choices against every requirement of that goal",
                  "Memorize all 6 bullet points for 3 minutes before looking at the question",
                  "Pick the longest sentence every time",
                  "Pick the shortest sentence every time",
                ],
                correctOptionIndex: 0,
              },
              {
                question: "In a Quantitative Command of Evidence question with a table or bar graph, when is an answer choice eliminated?",
                options: [
                  "If it misstates a number from the chart OR fails to support the specific claim made in the passage's final sentence",
                  "If it cites accurate numbers that directly prove the researcher's hypothesis",
                  "If it uses numbers from the table",
                  "Never",
                ],
                correctOptionIndex: 0,
              },
            ],
          },
        ],
      },
    ],
  },
  {
    title: "Financial Aid, CSS Profile, Sperrkonto & Student Visa Interview Mastery",
    description:
      "Complete post-admission financial and consular playbook: filing the CSS Profile from Uzbekistan, comparing multi-currency offers, opening a German Sperrkonto, and acing embassy visa interviews.",
    instructorName: "Davronbek Yuldashev & Timur Mirzakarimov",
    level: "Intermediate",
    thumbnailUrl: "https://images.unsplash.com/photo-1554224155-6726b3ff858f?q=80&w=800&auto=format&fit=crop",
    modules: [
      {
        title: "Comparing Offers & Multi-Currency Net Cost Auditing",
        description: "How to calculate true annual out-of-pocket cost across USD, EUR, GBP, KRW, and UZS",
        lessons: [
          {
            title: "Auditing Your Financial Aid Offer Letter: Grants vs Loans vs Work-Study",
            videoUrl: "https://storage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4",
            durationSeconds: 540,
            content:
              "### Reading the Fine Print of an Admission Offer\n\nWhen comparing two admission offers in ScholarBridge's Planning Studio:\n\n1. **Separate Direct Costs from Indirect Costs:** Tuition, mandatory fees, campus housing, and health insurance are billed directly by the university; books and flights are paid separately.\n2. **Grants & Scholarships vs Loans:** Only non-repayable grants/scholarships reduce your true net cost. Student loans must be repaid with interest.\n3. **Work-Study Is Earned Over Time:** A $3,000 campus work-study allotment is earned via weekly paychecks during the semester—it cannot be used upfront to pay your August tuition bill.",
            quizQuestions: [
              {
                question: "Which component of a university financial aid package reduces your net cost without requiring repayment?",
                options: [
                  "Institutional grants, merit scholarships, and tuition waivers",
                  "Private student loans",
                  "Credit card advances",
                  "Unconfirmed lottery tickets",
                ],
                correctOptionIndex: 0,
              },
              {
                question: "Can campus work-study earnings be used before arrival to pay your pre-enrollment tuition deposit?",
                options: [
                  "No — work-study wages are earned gradually during the semester as you work campus hours",
                  "Yes, the university wires work-study cash 6 months before you arrive",
                  "Work-study pays for your parents' house",
                  "Work-study replaces your passport",
                ],
                correctOptionIndex: 0,
              },
            ],
          },
          {
            title: "Filing the CSS Profile & IDOC Packet for Uzbekistan Families",
            videoUrl: "https://storage.googleapis.com/gtv-videos-bucket/sample/ForBiggerEscapes.mp4",
            durationSeconds: 590,
            content:
              "### Documenting Income & Assets Accurately in UZS\n\n- Report all figures on the CSS Profile in your local currency (**UZS — Uzbekistani Som**) consistently.\n- Attach QR-verified annual income and tax certificates from **my.gov.uz / soliq.uz** along with certified English translations.\n- If your family supports elderly grandparents or younger siblings in university, detail those exact annual UZS expenses in the **Special Circumstances** section.",
            quizQuestions: [
              {
                question: "Where can parents in Uzbekistan download official QR-verified annual income and tax certificates for CSS Profile / IDOC?",
                options: [
                  "my.gov.uz and soliq.uz official government portals",
                  "Wikipedia",
                  "Social media comments",
                  "Handwritten notes without stamps",
                ],
                correctOptionIndex: 0,
              },
              {
                question: "What is the purpose of the Special Circumstances box on the CSS Profile?",
                options: [
                  "To explain non-discretionary family obligations such as medical expenses, elder care, or seasonal income fluctuations",
                  "To paste your Common App essay a second time",
                  "To ask for a different major",
                  "To leave blank even when your family had major medical costs",
                ],
                correctOptionIndex: 0,
              },
            ],
          },
        ],
      },
      {
        title: "Blocked Accounts, Bank Statements & Apostille Workflows",
        description: "Executing Sperrkonto, UKVI 28-day bank rules, and Uzbekistan e-Apostille",
        lessons: [
          {
            title: "Setting Up Your German Sperrkonto (€11,904) & Statutory Health Insurance",
            videoUrl: "https://storage.googleapis.com/gtv-videos-bucket/sample/ForBiggerFun.mp4",
            durationSeconds: 520,
            content:
              "### Step-by-Step Blocked Account Workflow\n\n1. Register online with an approved German Sperrkonto provider (e.g., Expatrio or Fintiba) using your passport and German university `Zulassungsbescheid`.\n2. Transfer **€11,904** (€992 × 12 months) plus the small setup/buffer fee via SWIFT from an Uzbek bank.\n3. Download your **06 Blocking Confirmation** and bundle it with your **TK/AOK/BARMER student health insurance certificate** for your German Embassy Tashkent appointment.",
            quizQuestions: [
              {
                question: "How is the €11,904 deposited in a German Sperrkonto paid out to the student after arriving in Germany?",
                options: [
                  "In 12 equal monthly payouts of €992/month into your German current bank account (Girokonto)",
                  "It is kept permanently by the embassy as a fee",
                  "It can only be withdrawn after 10 years",
                  "It is paid in physical gold bars at the airport",
                ],
                correctOptionIndex: 0,
              },
              {
                question: "When is a student exempt from opening a €11,904 Sperrkonto for a German Student Visa?",
                options: [
                  "When holding a recognized public scholarship (such as DAAD or El-Yurt Umidi) that provides at least €992/month or an official Verpflichtungserklärung",
                  "Whenever they book a hotel for 2 nights",
                  "Never under any circumstance",
                  "When they have an IELTS 6.0",
                ],
                correctOptionIndex: 0,
              },
            ],
          },
          {
            title: "Hague e-Apostille in Uzbekistan & Sponsor Affidavit Documentation",
            videoUrl: "https://storage.googleapis.com/gtv-videos-bucket/sample/ForBiggerJoyrides.mp4",
            durationSeconds: 480,
            content:
              "### Avoiding Consular Document Rejections\n\n- **Hague Apostille:** Educational documents issued in Uzbekistan are apostilled via the government portal (`my.gov.uz`). Always apostille the **original** diploma/attestat and supplement before notarized translation.\n- **Sponsor Relationship Proof:** When a parent or close relative sponsors your studies (for South Korea D-2, UK Student Visa, Canada Study Permit, or Poland D-Visa), include your **translated birth certificate** proving the family relationship alongside their bank statement and Letter of Financial Support.",
            quizQuestions: [
              {
                question: "If your mother or father's bank account is used as financial proof for your student visa, what document must accompany their bank statement?",
                options: [
                  "Your official birth certificate (with certified translation) proving the parent-child relationship plus a signed Affidavit/Letter of Sponsorship",
                  "Only a selfie together",
                  "Your high school library card",
                  "Nothing — embassies never check whose name is on the bank account",
                ],
                correctOptionIndex: 0,
              },
              {
                question: "In what order should you complete Hague Apostille and translation for your Uzbek diploma?",
                options: [
                  "Obtain the official Apostille on the original document first, then complete the certified translation of both the document and the Apostille",
                  "Translate an unverified photocopy first and never apostille the original",
                  "Laminate the original diploma so it cannot be stamped",
                  "Mail your only original diploma without keeping scans",
                ],
                correctOptionIndex: 0,
              },
            ],
          },
        ],
      },
      {
        title: "Embassy Consular Interviews & Pre-Departure Readiness",
        description: "Mastering US F-1, UK Credibility, German, and Korean visa interviews in Tashkent",
        lessons: [
          {
            title: "The 4 Core Questions of Every Student Visa Interview",
            videoUrl: "https://storage.googleapis.com/gtv-videos-bucket/sample/ForBiggerMeltdowns.mp4",
            durationSeconds: 560,
            content:
              "### Answering with Clarity, Honesty & Academic Specificity\n\nWhether you are standing at Window 4 of the U.S. Embassy in Tashkent or sitting in a UKVI/German consular interview, every officer evaluates:\n\n1. **Why this university and why now?** (Cite 2 specific courses/labs and how you selected your shortlist).\n2. **Academic Preparedness:** How your GPA, test scores, and prior coursework prepared you.\n3. **Financial Sustainability:** Exact knowledge of your annual cost, scholarship coverage, and sponsor's verified income.\n4. **Home-Country Career Plan:** Specific roles and sectors in Uzbekistan where your degree creates high value.",
            quizQuestions: [
              {
                question: "How long should a typical spoken answer be during an in-person U.S. F-1 visa interview?",
                options: [
                  "Concise, natural, and specific — roughly 30 to 45 seconds directly answering the officer's question",
                  "A 10-minute memorized speech without pausing",
                  "A single word ('Yes' or 'Good')",
                  "Reading aloud from a printed 5-page script",
                ],
                correctOptionIndex: 0,
              },
              {
                question: "What should you know by heart when answering financial questions at the embassy?",
                options: [
                  "Your exact annual Cost of Attendance, confirmed scholarship amount, remaining balance, and your sponsor's profession and annual income",
                  "Only the university's mascot name",
                  "Nothing — tell the officer to calculate it themselves",
                  "Only the price of your plane ticket",
                ],
                correctOptionIndex: 0,
              },
            ],
          },
          {
            title: "First 14 Days Abroad: Airport Immigration, University Enrolment & Residence Cards",
            videoUrl: "https://storage.googleapis.com/gtv-videos-bucket/sample/SubaruOutbackOnStreetAndDirt.mp4",
            durationSeconds: 470,
            content:
              "### Your Arrival Checklist\n\nCarry in your **hand luggage** (never checked baggage): Passport with visa, Form I-20 / CAS / Zulassungsbescheid / CoE, scholarship award letter, accommodation contract, and health insurance certificate.\n\n- **USA:** Complete international student check-in so your DSO activates your SEVIS record.\n- **Germany:** Complete city address registration (*Anmeldung* at Bürgeramt) within 14 days to activate your Sperrkonto payouts and tax ID.\n- **South Korea:** Apply for your Residence Card (ARC) at the immigration office and activate NHIS insurance.",
            quizQuestions: [
              {
                question: "Where should you pack your Form I-20, CAS, CoE, or university admission letter when flying to your destination country?",
                options: [
                  "In your carry-on hand luggage so you can present it immediately to border immigration officers before baggage claim",
                  "Locked inside your checked suitcase in the cargo hold",
                  "Left at home in Tashkent",
                  "Mailed by sea freight",
                ],
                correctOptionIndex: 0,
              },
              {
                question: "What mandatory municipal step must a student in Germany complete within 14 days of moving into their accommodation?",
                options: [
                  "Anmeldung (official city address registration at the Bürgeramt/KVR)",
                  "Buying a car",
                  "Applying for citizenship",
                  "Retaking the IELTS exam",
                ],
                correctOptionIndex: 0,
              },
            ],
          },
        ],
      },
    ],
  },

  // ------------------------------------------------------------------
  // Practical "how-to" walkthroughs (added 2026) — the courses students
  // actually follow step-by-step while a portal is open in another tab.
  // Idempotent: `seedCourses()` skips any title that already exists, so an
  // installation with the earlier five courses simply gains these four.
  // ------------------------------------------------------------------
  {
    title: "How to Use Common App & CSS Profile: Step-by-Step US Application Guide",
    description:
      "Open commonapp.org next to this course and follow along: account setup, the 10-activity list, the counselor/recommender portal, and the CSS Profile in UZS for Uzbek families.",
    instructorName: "Jasur Toshmatov (MIT Admitted Scholar & Counselor)",
    level: "Beginner",
    thumbnailUrl: "https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?q=80&w=800&auto=format&fit=crop",
    modules: [
      {
        title: "Common App Account Setup, College List & Activities Section",
        description: "Create the account, sign the FERPA waiver, add universities and fill the activity list correctly",
        lessons: [
          {
            title: "Creating Your Common App Account, FERPA Waiver & Adding Universities",
            videoUrl: "https://www.youtube.com/watch?v=rM2x2j03haU",
            durationSeconds: 720,
            content:
`### What you need before you start (10 minutes of prep)

Gather these before opening the portal — every one of them is asked for in the Profile and Education tabs:

- Passport (exact spelling of your name as printed on it)
- School name as written on your **shahodatnoma / attestat** (Latin script)
- Your family's basic information (parents' names, occupations, education)
- Test dates: IELTS/TOEFL, SAT/Duolingo, and your expected graduation month

### Step 1 — Create the account at commonapp.org

1. Go to https://www.commonapp.org/apply and choose **First-year student**.
2. Register with an email you will still read in two years. Use one address only — a second account splits your applications.
3. Confirm the verification email, then log in to https://apply.commonapp.org.

### Step 2 — Sign the FERPA Release Authorization

1. Open **My Colleges → Recommenders and FERPA** for any university.
2. Read the FERPA block and choose **I waive my right** — waiving is what makes a recommendation letter credible, and it does not hide the letter from you in practice.
3. Sign it with your full legal name exactly as on the passport.

### Step 3 — Complete the Profile and Education tabs

- **Profile:** name, address, contact, citizenship, and **Common App fee waiver** eligibility (this is where international students with financial need request the waiver).
- **Education:** your current school, the curriculum, and the **date you will graduate**. For Uzbek schools pick *Other* curriculum and describe it: "11-year national curriculum, grades in a 5-point system".
- **Testing:** enter every score you want universities to see; self-reported scores are fine at this stage.

### Step 4 — Build the college list (My Colleges)

1. Add universities with **College Search**, and group them: 2–3 Reach, 4–5 Match, 2 Safety (including at least one financially safe option).
2. Check each university's **Writing Supplement** and deadline *before* adding it — some need an extra essay or an earlier date.

### Step 5 — Know the fee reality

- The Common App fee waiver covers application fees at member universities, but **not** the CSS Profile fee or test-score sending.
- Deadlines you must never miss: **Early Decision/Action ≈ 1 November**, **Regular Decision ≈ 1 January**.

> Always confirm the current requirements on the official university page — the portal changes every cycle, and ScholarBridge shows the same information with its verification date.`,
            quizQuestions: [
              {
                question: "Why is the FERPA release authorization worth signing, and what does 'waiving your right' mean?",
                options: [
                  "Waiving the right to read the recommendation means you trusted the recommender — it is what makes the letter credible to admissions officers",
                  "It hides your transcript from admissions officers",
                  "It cancels your application fee automatically",
                  "It replaces the need for an IELTS score",
                ],
                correctOptionIndex: 0,
              },
              {
                question: "Which fee does the Common App fee waiver NOT cover for an international applicant?",
                options: [
                  "The CSS Profile fee charged by the College Board and test-score sending fees",
                  "It covers every fee in the process",
                  "It covers the CSS Profile but not the university application fee",
                  "It covers nothing, including the university application fee",
                ],
                correctOptionIndex: 0,
              },
            ],
          },
          {
            title: "Mastering the 10-Activity List (150-Character Formula) & 5 Honors",
            videoUrl: "https://www.youtube.com/watch?v=BuFfLdSUjHM",
            durationSeconds: 840,
            content:
`### Why this section decides a lot

The Activities section is the only place where an admissions officer sees **what you did**, in your own words, all year. Each entry gives you a title (50 characters) and a description (150 characters) — they reward precision, not adjectives.

### The structure that works

Use this for every one of the 10 activity slots:

1. **Position / Leadership** — your exact role: "Founder", "Team Captain", "Regional Finalist".
2. **Organization** — the real name: "Nukus Regional Debate League", "IT Park Summer School".
3. **What you actually did, with numbers** — "Ran 14 weekly sessions for 46 students; built a Telegram study bot used by 900 pupils."
4. **Impact or outcome** — "raised 12 mln UZS for the town library", "Top 5 of 320 teams".

Then answer the three extra fields honestly:

- **Participation grade levels:** 9, 10, 11, 12
- **Timing:** during school year / break / all year
- **Hours per week and weeks per year:** keep them realistic. Two activities with 15 h/week for 40 weeks are checked against each other, and impossible totals damage your credibility.

### Ordering strategy

- Order by **importance to your narrative and to your planned major first**, then by prestige, then by chronology.
- Activity #1 should be the thing you would talk about for ten minutes without preparation.

### The 5 Honors slots

- This is where **Republican and International Olympiads** go: name the olympiad, the level (school / regional / republican / international), the subject, and the year.
- Put a certification you earned beside it if you have one (IELTS 7.5 can be listed as an honor when it is genuinely above your cohort's level).
- If a slot is empty, leave it empty — never invent an award.

### Common mistakes from Uzbek applicants

- Copy-pasting "Activities: football, reading, volunteering" — no evidence, no numbers.
- Writing a full sentence with an unnecessary "I" that costs 5 of your 150 characters.
- Listing 20 minor certificates instead of 10 quantified commitments.

> Reference: https://www.commonapp.org/apply/first-year-students`,
            quizQuestions: [
              {
                question: "How should the 10 activity slots be ordered?",
                options: [
                  "By importance to your story and planned major, then prestige, then chronology — with the strongest commitment first",
                  "Alphabetically by organization name",
                  "By the amount of money involved",
                  "Chronologically is irrelevant — order never matters",
                ],
                correctOptionIndex: 0,
              },
              {
                question: "Which description is strongest for a 150-character activity entry?",
                options: [
                  "Position, organization, quantified action and impact (e.g. ran 14 sessions for 46 students, Top 5 of 320 teams)",
                  "Three adjectives about your passion",
                  "A list of hobbies separated by commas",
                  "The name of your school repeated twice",
                ],
                correctOptionIndex: 0,
              },
            ],
          },
        ],
      },
      {
        title: "School Counselor Portal & Submitting Uzbek Transcripts (Shahodatnoma / Litsey)",
        description: "How your school in Uzbekistan can send transcripts, the school profile and teacher recommendations",
        lessons: [
          {
            title: "How Your School Counselor Uploads Transcripts, School Profile & Teacher LORs",
            videoUrl: "https://www.youtube.com/watch?v=ChaW1wkgwrc",
            durationSeconds: 660,
            content:
`### The two sides of Common App

Your side (**My Colleges → Recommenders and FERPA**) is only half of the application. The other half belongs to your school: the **Counselor** section, the school profile, and the teacher recommendations.

### Step 1 — Invite the counselor and two teachers

1. In **Recommenders and FERPA**, add your counselor's name and school email, and at least two academic teachers.
2. Use institutional school email addresses where they exist; an official school domain matters more than a personal inbox.
3. Do this in **September**. Uzbek schools write letters by hand during a busy term — an invitation sent in December usually produces a weak letter, or none.

### Step 2 — Get the transcript right

- For Uzbek schools the document is the **shahodatnoma** (11th grade) or **attestat**. Academic lyceums and Presidential schools issue their own grade sheets.
- Ask the school for a **transcript with translated grade scale**: how the 5-point national scale maps onto your coursework, and the subject list per year.
- If your school has no seal-translated document, the school can upload a **signed and stamped** version with the official translation attached — the counselor's upload is what gives it weight.

### Step 3 — Fill the School Profile with your counselor

The profile is the school's context document: size, curriculum, graduation requirements, grading scale, and — very important for Uzbek applicants — how many students continue to higher education and which universities they enter. A strong profile explains to an admissions officer why your "4" means what it means.

### Step 4 — Track completion like a deadline

1. Check the status list: *Not started → Started → Submitted*.
2. Remind your teachers once every two weeks — politely, with a fixed date.
3. Final check before the **1 January** deadline: counselor form, school profile, both letters, and your transcript all show **Submitted**.

> Ask your counselor to open https://www.commonapp.org/apply today and confirm they received the invitation email — every year some invitations land in spam.`,
            quizQuestions: [
              {
                question: "What is the most reliable way to make an Uzbek transcript credible to a US university?",
                options: [
                  "Have the school upload an official, sealed transcript with the national 5-point grade scale explained, plus a certified translation when needed",
                  "Translate a photocopy yourself and email it as a PDF",
                  "Report the grades only in the activities list",
                  "Send the original diploma by regular post to every university",
                ],
                correctOptionIndex: 0,
              },
              {
                question: "When should you invite your counselor and teachers to Common App?",
                options: [
                  "September — well before the busy winter deadline period, so they have time to write",
                  "The day of the deadline",
                  "After you receive an admission decision",
                  "Only if the university asks you by email",
                ],
                correctOptionIndex: 0,
              },
            ],
          },
        ],
      },
      {
        title: "Filling Out the CSS Profile & IDOC for Uzbekistan Families",
        description: "Reporting parental income in UZS, attaching soliq.uz and my.gov.uz certificates, and the Special Circumstances statement",
        lessons: [
          {
            title: "Step-by-Step CSS Profile in UZS & Translating Soliq.uz Tax Certificates",
            videoUrl: "https://www.youtube.com/watch?v=jZGUgFOmEeI",
            durationSeconds: 780,
            content:
`### The CSS Profile is not the Common App

It is a **separate financial-aid form** run by the College Board. Only some universities require it, but those universities (including many private US universities and several scholarship programs) use it to award their own institutional aid. Check each university's financial-aid page, then register at https://cssprofile.collegeboard.org/.

### Step 1 — Register correctly

1. Create the College Board account **with the student's information** (a parent account is created later if the form requests a noncustodial parent).
2. Add the universities one by one — every institution costs a submission fee, and international fee waivers exist but are limited.

### Step 2 — Report income in UZS honestly and in full

- Convert with the rate you used consistently and state the rate in the notes field. **Report the currency as UZS**; never round up to dollars just because it looks smaller.
- Report **both parents'** income: salary, pension, business profit, rental income, and remittances.
- Family size and the number of siblings studying at the same time materially reduce your expected contribution — report them exactly.

### Step 3 — Attach the documents Uzbek families actually have

1. **Employment and salary:** a certificate from the employer (*ish joyidan maosh haqida ma'lumotnoma*) showing monthly salary for the last 12 months.
2. **Soliq.uz:** the tax declaration or a certificate of taxes paid from https://soliq.uz.
3. **my.gov.uz:** officially issued certificates (marriage/divorce, disability, dependents) can be ordered online at https://my.gov.uz — these are what you attach to prove special circumstances.
4. **Bank statements:** 3–6 months, stamped by the bank, for every account reported.
5. Translate every document into English with a certified translation (notarization added when the university asks for it).

### Step 4 — Write the Special Circumstances section (about 2,000 characters)

This is the only narrative part of a financial form, so use it as a structured explanation, not a plea:

1. The situation: "Father's monthly income dropped from X to Y in March 2025 because…"
2. The evidence: name the certificate you attached.
3. The consequence: "Our expected contribution would be Z, while our verifiable annual income is W."
4. What you are doing about it: student earnings, sibling support, savings.

### Step 5 — IDOC

Many universities ask you to upload the same documents to **IDOC** (College Board's document service). Upload the translated, stamped versions — a blurry phone photo of an untranslated stamp is the most common rejection.

> Verify current fees and requirements at https://cssprofile.collegeboard.org/ before you submit — the fee and the required documents change year to year.`,
            quizQuestions: [
              {
                question: "How should a family in Uzbekistan report parental income on the CSS Profile?",
                options: [
                  "Report it in UZS with a stated exchange rate, including both parents' salary, pension, business profit and remittances",
                  "Report an estimated round dollar figure and skip small incomes",
                  "Report only the father's salary because the mother's income is small",
                  "Leave income empty and let the university calculate it",
                ],
                correctOptionIndex: 0,
              },
              {
                question: "What makes the Special Circumstances section effective?",
                options: [
                  "Stating the situation, naming the attached official document, explaining the financial consequence and what the family does about it",
                  "Writing that you are a good student and deserve help",
                  "Copying a template found online without any documents",
                  "Repeating the income numbers from the previous section",
                ],
                correctOptionIndex: 0,
              },
            ],
          },
        ],
      },
    ],
  },
  {
    title: "European University Portals: uni-assist VPD, TUMonline, DreamApply & Sperrkonto",
    description:
      "The application route from Uzbekistan into Germany and the EU: a VPD on uni-assist, TUM's curricular analysis, a blocked account, DreamApply for Stipendium Hungaricum and the Uzbek ministry portal.",
    instructorName: "Sardorbek Rakhimov (TUM Munich & DAAD Scholar)",
    level: "Intermediate",
    thumbnailUrl: "https://images.unsplash.com/photo-1434030216411-0b793f4b4173?q=80&w=800&auto=format&fit=crop",
    modules: [
      {
        title: "Applying to German Universities: uni-assist VPD & TUM Curricular Analysis",
        description: "Documents, the €75 VPD, deadline discipline and the module-by-module ECTS analysis",
        lessons: [
          {
            title: "How to Apply for a VPD on uni-assist.de & Upload Certified Documents",
            videoUrl: "https://www.youtube.com/watch?v=ChGgpa89_E4",
            durationSeconds: 720,
            content:
`### What the VPD actually is

Many German universities do not evaluate foreign documents themselves. They ask **uni-assist** (https://www.uni-assist.de/en/how-to-apply/) to check your certificates and issue a **VPD** (Vorprüfungsdokumentation) — a preliminary review stating your recognised grade and whether you meet the formal requirements. The VPD is valid for one admission cycle and can be sent to several universities.

### Step 1 — Create a My assist account

1. Register at https://www.uni-assist.de/ with the email you check daily.
2. Fill your personal data exactly as in the passport (including all names in the correct order).
3. Enter your **complete education history**, including school and every year of university.

### Step 2 — Prepare the documents

- Apostilled diploma/attestat **and** the academic transcript (see the e-Apostille lesson in the Uzbekistan grants course).
- Certified translations into German or English.
- Passport copy, and language certificates (IELTS/TestDaF) if you have them; some universities accept them later.
- Digital copies must be **legible scans**, not phone photos. File names should identify the document.

### Step 3 — Request the VPD

1. Choose the target universities, then add the documents uni-assist requests for each.
2. Pay the processing fee (around **€75 for the first application, less for each additional one** — confirm the current amount on the site).
3. Submit before the university's deadline. The VPD itself takes **4–6 weeks** during peak season, so start in October for a January deadline.

### Step 4 — Watch the status and respond fast

- Statuses move through *received → in processing → documents missing → VPD created*.
- If a document is missing, uni-assist emails you a deadline: respond within it, or the application is closed and the fee is not refunded.

> Check both pages: uni-assist publishes the VPD rules, and each university publishes its own deadline (often earlier than the VPD processing time suggests).`,
            quizQuestions: [
              {
                question: "What is the main purpose of a VPD on uni-assist?",
                options: [
                  "It is a preliminary check of your foreign certificates that universities use instead of evaluating them themselves",
                  "It is a visa issued by the German embassy",
                  "It is a language exam certificate",
                  "It is a scholarship application",
                ],
                correctOptionIndex: 0,
              },
              {
                question: "How early should you request a VPD for a January deadline?",
                options: [
                  "In October — processing takes about 4–6 weeks during the peak season",
                  "On the deadline day, because processing is instant",
                  "After you receive the admission letter",
                  "Only after you have a visa",
                ],
                correctOptionIndex: 0,
              },
            ],
          },
          {
            title: "TUMonline Application, ECTS Credit Conversion & Opening a €11,904 Sperrkonto",
            videoUrl: "https://www.youtube.com/watch?v=5R3DfQ6O4KY",
            durationSeconds: 840,
            content:
`### Two different documents, two different jobs

- **TUMonline** (https://www.tum.de/en/studies/application) is the university portal where you apply for a specific Master's programme.
- **Sperrkonto** is a German blocked account you open with a bank or provider for the **visa**, not for the university.

### Step 1 — TUMonline application in the right order

1. Create an account on https://campus.tum.de, then open **Application → Apply for a degree programme**.
2. Upload the **VPD** when the programme requires it (many TUM Master's programmes require a VPD for international applicants).
3. Upload the transcript, diploma, language certificate, CV and motivation letter as separate files.

### Step 2 — The Curricular Analysis is the part people fail

TUM asks you to fill a table map of **your modules against the required modules of the programme**:

1. List each prerequisite area (for example *Mathematics*, *Algorithms*, *Statistics*).
2. For every area, list the exact courses you took, with **ECTS or credit hours, hours per week, and the grade**.
3. Convert credits correctly: Uzbek universities report credit hours, not ECTS. A common conversion is **1 ECTS ≈ 25–30 hours of total student workload** — show the arithmetic in the notes column so the reviewer can follow it.
4. Attach the syllabus/course description where your transcript alone does not prove the content. Without syllabi, a 5-point "4" in a relevant course is not evidence.

### Step 3 — Open the blocked account

1. Compare providers: **Expatrio** and **Fintiba** are the ones Uzbek students use most; a German bank such as Deutsche Bank is another route.
2. The required amount for a student visa is set once per year (about **€11,904 for 2025**, paid as ~€992 per month). **Verify the current figure** on the German embassy's page before you transfer.
3. Fund the account, receive the **blocked amount confirmation**, and attach that document to your visa application.
4. On arrival, complete the **Anmeldung** (city registration) so the bank can start paying out the monthly amount.

### Step 4 — Timeline that works

1. October–November: VPD request and TUMonline documents.
2. January 15 (summer semester) or May 31 (winter semester): the usual TUM deadlines — confirm for your programme.
3. February–March: admission, blocked account, health insurance, visa appointment in Tashkent.

> Amounts, portal names and deadlines all change — always confirm on https://www.tum.de and the German embassy's official page.`,
            quizQuestions: [
              {
                question: "What does TUM's curricular analysis require from an applicant?",
                options: [
                  "A module-by-module mapping of your completed courses to the programme's prerequisites, with credits/ECTS, hours and grades",
                  "Only the overall GPA",
                  "A letter from your school principal",
                  "Nothing — TUM evaluates transcripts automatically",
                ],
                correctOptionIndex: 0,
              },
              {
                question: "What is a Sperrkonto and who needs it?",
                options: [
                  "A blocked account holding one year of living costs, needed for the German student visa — the university does not require it",
                  "A university tuition deposit",
                  "A scholarship account opened by DAAD",
                  "A German tax account",
                ],
                correctOptionIndex: 0,
              },
            ],
          },
        ],
      },
      {
        title: "DreamApply (Stipendium Hungaricum) & Universitaly (Italy DSU Grant)",
        description: "Dual registration, the Uzbek sending-partner portal, and document checklists that survive both systems",
        lessons: [
          {
            title: "Dual Registration for Stipendium Hungaricum: DreamApply + Uzbek Ministry Portal",
            videoUrl: "",
            durationSeconds: 600,
            content:
`### Yes — there are two applications

For the Hungarian government scholarship **Stipendium Hungaricum** (https://stipendiumhungaricum.hu/) an applicant from Uzbekistan must be present in **two** systems:

1. **DreamApply** — the university-side portal where you list up to two programmes in priority order.
2. **The Uzbek sending partner portal** — the nomination route managed by the Ministry of Higher Education, Science and Innovations. Without a nomination, the DreamApply application is not considered.

### Step 1 — DreamApply

1. Register at the DreamApply link published on the Stipendium Hungaricum site for the current cycle.
2. Choose **two programmes**, first and second preference, and keep the order you would genuinely accept.
3. Upload: passport, attested and translated secondary school certificate/diploma, transcripts, **medical certificate**, language certificate, motivation letter, and the school-leaving exam results.
4. The **medical certificate** is a specific form in the current call — download the latest file, do not reuse an old one.

### Step 2 — The Uzbek ministry portal

1. Register on the official ministry portal in the announced window (the opening is published on official channels and is usually open only a few weeks).
2. Upload the same document set, plus the **recommendation** required by the Uzbek side.
3. Make sure the **programme names and codes** match what you entered in DreamApply — a mismatch between the two systems is the most common reason a strong applicant disappears from the ranking.

### Step 3 — Documents that must be apostilled

- Secondary school certificate / diploma (with the apostille from https://my.gov.uz)
- Academic transcript
- Birth certificate (when requested)
- Translation into Hungarian or English for anything not issued in English

### Step 4 — After submission

1. Universities rank you on the DreamApply side; the scholarship board applies its own criteria.
2. Interviews (online, sometimes in Hungarian/English) are part of several programmes — prepare a 3-minute answer to "why this programme in Hungary".
3. Keep both dashboards open until the final result: changes requested by one system are frequently not visible in the other.

> Similar dual-registration patterns exist for other ministries — always read the official call of the current year before applying.`,
            quizQuestions: [
              {
                question: "What must a Stipendium Hungaricum applicant from Uzbekistan do beyond applying in DreamApply?",
                options: [
                  "Also register and apply through the Uzbek sending-partner (ministry) portal — without a nomination the application is not considered",
                  "Nothing — DreamApply alone is sufficient",
                  "Send the documents by physical mail to Budapest",
                  "Pay a tuition deposit first",
                ],
                correctOptionIndex: 0,
              },
              {
                question: "Which mismatch most often harms an otherwise strong application?",
                options: [
                  "Programme names/codes not matching between the ministry portal and DreamApply",
                  "Using the same email in both systems",
                  "Uploading documents in English",
                  "Applying to two programmes",
                ],
                correctOptionIndex: 0,
              },
            ],
          },
        ],
      },
    ],
  },
  {
    title: "Uzbekistan Flagship Grants & Documents: El-yurt umidi, GKS Korea, Türkiye Bursları & e-Apostille",
    description:
      "Get the paperwork done in Uzbekistan first: the e-Apostille on my.gov.uz and notarised translations, then the El-yurt umidi, GKS and Türkiye Bursları portals.",
    instructorName: "Gulnoza Mirzayeva (Oxford & El-yurt umidi Scholar)",
    level: "Beginner",
    thumbnailUrl: "https://images.unsplash.com/photo-1523240795612-9a054b0db644?q=80&w=800&auto=format&fit=crop",
    modules: [
      {
        title: "Getting an Official e-Apostille on my.gov.uz & Notarized Translations",
        description: "The document step every grant and every visa application is waiting for",
        lessons: [
          {
            title: "Step-by-Step e-Apostille Guide for Diplomas, Transcripts & Birth Certificates",
            videoUrl: "",
            durationSeconds: 540,
            content:
`### Why the apostille blocks everything else

Apostille is the international confirmation that a signature and stamp on your Uzbek document are genuine (Hague Convention). Without it, foreign universities, scholarship boards and embassies treat your diploma as an unverified copy. Everything on this course — and every visa in the platform — waits on this step, so do it first.

### Step 1 — Apply online at my.gov.uz

1. Create or log in to your account on https://my.gov.uz.
2. Choose the **Apostille** service (search "Apostille"), and select the service type — apostille of education documents, civil status documents, or other.
3. Fill the form with exactly the data printed on the document.
4. Choose the agency and the pickup method, and pay the state fee online.
5. Typical processing is **3–5 business days** for education documents; regions and civil-status documents can differ.

### Step 2 — Know which documents you will need

- **Diploma / attestat / shahodatnoma** — education document apostille
- **Academic transcript** — apostille each sheet if it carries a separate signature and stamp
- **Birth certificate and marriage certificate** — civil status apostille (needed for sponsor relationship proof at visa stage)
- **Criminal record certificate, when asked** — for some long-stay visas and scholarships

### Step 3 — Translate and notarise in the right order

1. Apostille the **original** first.
2. Then translate the document **and** the apostille block itself — a translation that omits the apostille text is rejected.
3. Notarise the translation. Keep both: the original with the apostille and the notarised translation.
4. Scan everything at 300 dpi and store the PDFs in your document vault — you will upload them a dozen times.

### Common mistakes that cost a whole cycle

- Laminating the original so no apostille can be placed (do not laminate).
- Apostilling a photocopy — apostille only ever confirms an original.
- Ordering the apostille in parallel with the translation and ending up with a translation made *before* the apostille (the apostille reference number in the translation will not match).
- Sending the only original abroad by post instead of certified scans through the portal.

> Fees and processing times are published on https://my.gov.uz — check the current service page before you pay.`,
            quizQuestions: [
              {
                question: "What is the correct order of document preparation?",
                options: [
                  "Apostille the original document first, then translate the document together with the apostille and have the translation notarised",
                  "Translate first, laminate the original, then apostille",
                  "Apostille a colour photocopy",
                  "Notarise a self-made translation and skip the apostille",
                ],
                correctOptionIndex: 0,
              },
              {
                question: "How long does an education-document e-Apostille normally take through my.gov.uz?",
                options: [
                  "About 3–5 business days",
                  "About 6 months",
                  "Instant, at any hour",
                  "It can only be obtained abroad",
                ],
                correctOptionIndex: 0,
              },
            ],
          },
        ],
      },
      {
        title: "El-yurt umidi Foundation, GKS Korea & Türkiye Bursları Portals",
        description: "The three flagships most Uzbek students apply to — portals, contracts and interviews",
        lessons: [
          {
            title: "El-yurt umidi Foundation Online Portal, Tripartite Contract & Commission Interview",
            videoUrl: "https://www.youtube.com/watch?v=ydnv6tyXZ78",
            durationSeconds: 780,
            content:
`### What the fund pays for

The **"El-yurt umidi" Foundation** finances study at foreign universities for Uzbek citizens who are admitted (or conditionally admitted) to ranked foreign institutions — typically **QS Top 100 / Top 300** programmes. It covers tuition within a set cap, stipend, and travel, in exchange for a **return obligation** to work in Uzbekistan.

### Step 1 — The one thing to understand before you apply

You need an **admission or conditional admission letter** from a currently operating foreign university. The fund does not search for universities for you: the ranking and the programme determine your eligibility tier and the funding cap.

### Step 2 — Online application on the fund portal

1. Open the fund's application platform (published for each competition on https://eyuf.uz and its official channels).
2. Register, then complete every field: personal data, education, the exact programme and university, and the intended return plan.
3. Upload: passport, diploma and transcript (**apostilled**, with notarised translation), admission/conditional letter, language certificate, and your motivation document.
4. Register **within the announced window** — the competition opens and closes on fixed dates published for that round.

### Step 3 — Selection rounds

1. **Document screening** against the published criteria.
2. **Additional tests** on intellectual, analytical and creative ability.
3. **Interview in Uzbek** with the commission: your programme, why this university, the funding needed, and the return plan.

### Step 4 — The tripartite contract and the 5-year return roadmap

- The contract is signed between the scholar, the foundation and the employing organisation — the structure is published for each competition.
- Prepare a concrete return plan: the sector, the type of organisation, and the role you intend to take in Uzbekistan. "I will come back and work" is not a plan; "I will return to X and work on Y, using the Z skills from this programme" is.
- Know your own numbers: tuition the fund will pay, monthly stipend, and the remaining cost you must cover.

### Step 5 — Before the interview

1. Re-read your own application top to bottom — every claim is fair game.
2. Be ready to answer in Uzbek, clearly and briefly, why this programme cannot be replaced by one available in Uzbekistan.
3. Bring the document set as instructed for verification.

> Competition rules, funding caps and the return obligation are published per round — always read the current official announcement.`,
            quizQuestions: [
              {
                question: "What is the minimum document an El-yurt umidi applicant must already have?",
                options: [
                  "An admission or conditional admission letter from a foreign university that is currently operating",
                  "A visa for the destination country",
                  "A signed employment contract in Uzbekistan",
                  "A completed Master's degree abroad",
                ],
                correctOptionIndex: 0,
              },
              {
                question: "What makes a strong answer to the return-plan question in the commission interview?",
                options: [
                  "A concrete sector, employer type and role in Uzbekistan, connected to the skills of the chosen programme",
                  "Saying you will decide later",
                  "Promising to stay abroad permanently",
                  "Repeating the university ranking",
                ],
                correctOptionIndex: 0,
              },
            ],
          },
          {
            title: "GKS (StudyInKorea) Document Checklist & Türkiye Bursları (TBBS) Portal Walkthrough",
            videoUrl: "https://www.youtube.com/watch?v=x_ZhO5a6cTw",
            durationSeconds: 840,
            content:
`### Two governments, two very different application shapes

- **GKS (Global Korea Scholarship)** — run by NIIED, applied through **either** the Korean embassy in your country (Embassy Track) **or** one university (University Track). You choose one; applying through both invalidates the application.
- **Türkiye Bursları** — applied through the **TBBS** portal at https://tbbs.turkiyeburslari.gov.tr/, with a single online form and a video interview stage.

### GKS: the document checklist that decides everything

1. Application form (the current year's NIIED form — never an old one).
2. Personal statement and study plan (the two essays, with the required word ranges).
3. **Two recommendation letters** in the prescribed format.
4. Diploma/graduation certificate and full transcript — **apostilled**, with English translation.
5. Proof of citizenship for the applicant **and for parents** — apostilled birth certificates and passport copies. This is where Uzbek applicants most often lose time: order the apostilles first.
6. GKS applicant agreement, personal medical assessment, and the checklist page itself.
7. Language: TOPIK or English proficiency (the requirement depends on the chosen programme track).

### GKS: Embassy Track vs University Track

- **Embassy Track:** documents go to the Korean embassy, which ranks candidates and forwards a limited number of files to NIIED. Competitive, but the university placement is decided centrally.
- **University Track:** you apply directly to one university, which selects its own candidates. Placement research matters more here.
- Never submit to both tracks: GKS rejects duplicates.

### Türkiye Bursları: the TBBS portal

1. Register at https://tbbs.turkiyeburslari.gov.tr/ **before** the deadline closes — the system closes exactly on the announced date.
2. Choose up to 12 programmes across the levels you are eligible for.
3. Upload diploma/transcript, exam results, passport, and the **letter of intent** — the intent letter is short and decisive; make it specific to the first programme you selected.
4. Documents that are not in Turkish or English must be translated.
5. Interviews for shortlisted candidates run online or at the embassy — clarity and honest self-presentation matter more than perfect accent.

### Timeline discipline

- Both competitions open once a year and close hard. Put the opening and closing dates in your deadline tracker, and prepare apostilled documents **one month before** the window opens — that is the only part completely in your control.

> Requirements change every cycle: verify on https://www.studyinkorea.go.kr and https://tbbs.turkiyeburslari.gov.tr/ before submitting.`,
            quizQuestions: [
              {
                question: "What happens if you apply to GKS through both the Embassy Track and the University Track?",
                options: [
                  "The application is treated as invalid — you must choose exactly one track",
                  "You get two chances to be selected",
                  "The embassy track automatically wins",
                  "Nothing, both applications are evaluated separately",
                ],
                correctOptionIndex: 0,
              },
              {
                question: "Which supporting documents consistently slow down Uzbek GKS applicants, and should be apostilled first?",
                options: [
                  "Apostilled proof of citizenship for the applicant and both parents, plus the apostilled diploma/transcript",
                  "The recommendation letters",
                  "The TOPIK certificate",
                  "The applicant agreement form",
                ],
                correctOptionIndex: 0,
              },
            ],
          },
        ],
      },
    ],
  },
  {
    title: "How to Use ScholarBridge AI: Complete Platform Walkthrough",
    description:
      "A guided tour of the platform: onboarding and smart auto-fill, QS Top 200 program chancing, multi-currency cost planning, the AI SOP Studio, the deterministic essay rubric, and the AI visa interview simulator.",
    instructorName: "ScholarBridge AI Team",
    level: "Beginner",
    thumbnailUrl: "https://images.unsplash.com/photo-1517245386807-bb43f82c33c4?q=80&w=800&auto=format&fit=crop",
    modules: [
      {
        title: "From 10-Second Onboarding to Submitting Your Applications",
        description: "Everything the platform does for you, screen by screen",
        lessons: [
          {
            title: "Using Smart Auto-Fill, QS Top 200 Program Chancing & Multi-Currency Cost Calculator",
            videoUrl: "",
            durationSeconds: 600,
            content:
`### Step 1 — Onboarding and smart auto-fill

1. Create your profile and paste (or upload) your CV, transcript or IELTS result into the auto-fill box.
2. The platform extracts the fields it can read — **always review them**: auto-fill proposes, you confirm. Anything it cannot read stays empty and is shown as "not provided yet" rather than guessed.
3. Complete your financial flags honestly (budget, who pays, existing scholarships). They change which universities are realistically affordable for you.

### Step 2 — University Explorer

- Filter by country, public/private, level and **your committed tuition ceiling**; the quick chips give you Top 50 QS, low tuition, and IELTS-friendly lists in one click.
- Every card shows a match score with its exact arithmetic (the breakdown strip under the reasons) and the **source link with its verification date** — if a number has no verified source, the card says so instead of showing an unverified figure.
- Save universities to your shortlist; comparison of up to three at a time is available from the same screen.

### Step 3 — Program-level chancing (QS Top 200)

1. Open **Outlook / Chancing** and pick a university.
2. The panel positions you against the programme's published profile: where you stand relative to the 25th/50th/75th percentile of the reference cohort, and which requirement is the binding constraint.
3. Read the requirement list **with its caveat**: programme requirements are verified per year; anything unverified says so.
4. Use the what-if scenario fields (GPA, IELTS, budget) to see how a better score changes your position — nothing you type in a scenario is saved to your profile.

### Step 4 — Multi-currency cost calculator

- Costs are converted to USD, UZS, EUR and KRW from the catalogue currency and period first — a stale USD mirror never overrides the canonical value.
- Lines that come from a national benchmark (for example German living costs from DAAD) are explicitly marked **estimated**, and published lines show their source.
- Tuition + living + insurance + flights + visa fees give the real annual number you must fund.

### Step 5 — Deadlines and applications

- Add the programmes you will actually apply to; the tracker then computes days remaining and highlights the next urgent action.
- Submit through the official portal — the platform prepares and tracks; it never submits on your behalf.

> Rule of the platform: nothing is fabricated. Empty fields stay empty, and every important number keeps its source and verification date.`,
            quizQuestions: [
              {
                question: "What should you do right after the smart auto-fill reads your CV?",
                options: [
                  "Review every extracted field and confirm it — auto-fill proposes values, you remain responsible for them",
                  "Accept everything and submit applications immediately",
                  "Ignore empty fields because the platform fills them later with estimates",
                  "Delete the auto-filled data and type everything again",
                ],
                correctOptionIndex: 0,
              },
              {
                question: "How does the cost calculator treat a missing living-cost figure?",
                options: [
                  "As unknown — it is never silently treated as zero, and benchmarked lines are explicitly marked estimated",
                  "As zero to keep the total low",
                  "It invents an average value without saying so",
                  "It removes the cost line entirely",
                ],
                correctOptionIndex: 0,
              },
            ],
          },
          {
            title: "AI SOP Studio, Deterministic Essay Rubric & Circular AI Visa Interview Simulator",
            videoUrl: "",
            durationSeconds: 660,
            content:
`### The writing tools, in the order that actually helps

**1. Gather source material first.** Fill your activity portfolio and upload the documents you will reference. The AI uses your own material as the only source of facts, so the richer your portfolio, the more specific the draft.

**2. AI SOP Studio**

- Pick the target programme and open the studio. Start from the structure it proposes (why this field → why this programme → why this country → your plan).
- Load a **gold-standard exemplar** to see the level of specificity expected — then write your own. Never submit a draft that claims things you did not do.
- Ask for a critique, not for a rewrite: "what is vague in paragraph 2?" produces usable feedback.

**3. Deterministic essay rubric**

- The rubric scores structure, evidence, specificity, clarity and honesty with fixed rules — the same essay always receives the same score.
- Use it to find the weakest dimension, fix it, and re-score. Aim for 90+/100 on **your own** content.
- The score explains itself: every deducted point names the rule it came from.

**4. AI visa interview simulator**

- Choose the country and start a live session: the AI interviewer asks the real consular questions in a natural voice.
- Answer **out loud** (microphone) or type — the text bar is always available, and you can load a model answer to see the level of detail expected.
- After each answer you get an honest evaluation across purpose, funding, ties, intent and clarity — with the risk flags used by consular officers, not invented ones.
- Practise until you can speak the numbers (cost of attendance, scholarship amount, sponsor's income) without looking.

### A realistic 6-week plan using the platform

1. Week 1: profile + documents + activity portfolio.
2. Week 2: university and programme shortlist with the chancing panel.
3. Weeks 3–4: SOP and essays through the rubric.
4. Week 5: visa interview practice, twice per country, recorded.
5. Week 6: submit through the official portals and track everything here.

> The simulator evaluates your answers; it does not decide your visa. Only the consular officer does — treat the feedback as preparation, not as a prediction.`,
            quizQuestions: [
              {
                question: "What is the right way to use the AI SOP Studio?",
                options: [
                  "Provide your own source material, use exemplars to understand the expected specificity, and ask for critique rather than submitting a rewrite",
                  "Generate a full essay and submit it unchanged",
                  "Let the AI invent achievements to make the essay stronger",
                  "Avoid exemplars because they replace your work",
                ],
                correctOptionIndex: 0,
              },
              {
                question: "How should the visa interview simulator's feedback be treated?",
                options: [
                  "As preparation with explicit scoring dimensions and risk flags — only a consular officer decides the visa",
                  "As a guaranteed prediction of the visa result",
                  "As a reason to memorise a script word for word",
                  "As something only needed after a rejection",
                ],
                correctOptionIndex: 0,
              },
            ],
          },
        ],
      },
    ],
  },
];

export async function seedCourses() {
  try {
    const existingCourses = await db.select().from(courses);
    const existingTitles = new Set(existingCourses.map((c) => c.title));

    for (const courseSpec of COURSE_CATALOG_SPECS) {
      if (existingTitles.has(courseSpec.title)) continue;

      const [insertedCourse] = await db
        .insert(courses)
        .values({
          title: courseSpec.title,
          description: courseSpec.description,
          instructorName: courseSpec.instructorName,
          level: courseSpec.level,
          thumbnailUrl: courseSpec.thumbnailUrl,
          isPublished: true,
        })
        .returning();

      for (let mIdx = 0; mIdx < courseSpec.modules.length; mIdx++) {
        const modSpec = courseSpec.modules[mIdx];
        const [insertedMod] = await db
          .insert(courseModules)
          .values({
            courseId: insertedCourse.id,
            title: modSpec.title,
            description: modSpec.description,
            sortOrder: mIdx + 1,
          })
          .returning();

        for (let lIdx = 0; lIdx < modSpec.lessons.length; lIdx++) {
          const lessonSpec = modSpec.lessons[lIdx];
          const [insertedLesson] = await db
            .insert(lessons)
            .values({
              moduleId: insertedMod.id,
              title: lessonSpec.title,
              videoUrl: lessonSpec.videoUrl,
              durationSeconds: lessonSpec.durationSeconds,
              content: lessonSpec.content,
              sortOrder: lIdx + 1,
            })
            .returning();

          const [insertedQuiz] = await db
            .insert(quizzes)
            .values({
              lessonId: insertedLesson.id,
              title: `${lessonSpec.title} — Mastery Quiz`,
              passThreshold: 70,
            })
            .returning();

          if (lessonSpec.quizQuestions.length > 0) {
            await db.insert(quizQuestions).values(
              lessonSpec.quizQuestions.map((q, qIdx) => ({
                quizId: insertedQuiz.id,
                question: q.question,
                options: JSON.stringify(q.options),
                correctOptionIndex: q.correctOptionIndex,
                sortOrder: qIdx + 1,
              }))
            );
          }
        }
      }
    }
  } catch (error) {
    console.error("Error seeding courses:", error);
  }
}

// ---------------------------------------------------------------------------
// Seed: Gamification levels & badges
// ---------------------------------------------------------------------------
export async function seedGamification() {
  try {
    const existingLevels = await db.select().from(levels).limit(1);
    if (existingLevels.length === 0) {
      await db.insert(levels).values([
        { name: "Explorer", minPoints: 0, iconUrl: "🌱" },
        { name: "Scholar", minPoints: 100, iconUrl: "🎓" },
        { name: "Achiever", minPoints: 250, iconUrl: "🏆" },
        { name: "Ambassador", minPoints: 500, iconUrl: "🌟" },
      ]);
    }

    const existingBadges = await db.select().from(badges).limit(1);
    if (existingBadges.length === 0) {
      await db.insert(badges).values([
        { name: "Rising Star", description: "Earn your first 50 points", iconUrl: "⭐", criteria: "points:50" },
        { name: "Century Club", description: "Reach 100 points", iconUrl: "💯", criteria: "points:100" },
        { name: "Course Graduate", description: "Complete your first course", iconUrl: "🎖️", criteria: "course:1" },
        { name: "Profile Pro", description: "Complete 90% of your student profile", iconUrl: "📋", criteria: "profile:complete" },
        { name: "Connector", description: "Successfully refer a friend", iconUrl: "🤝", criteria: "referral:1" },
      ]);
    }
  } catch (error) {
    console.error("Error seeding gamification:", error);
  }
}
