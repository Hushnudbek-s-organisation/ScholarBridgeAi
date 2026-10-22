import { eq } from "drizzle-orm";
import { db } from "./index";
import {
  answerPrompts,
  checklistItems,
  goalTemplates,
  learningProviders,
} from "./schema";
import {
  SEED_ANSWER_PROMPTS,
  SEED_CHECKLIST_ITEMS,
  SEED_GOAL_TEMPLATES,
} from "@/lib/growth/defaults";

// Public claims below are legacy candidates, not independently verified for
// the current cycle. Keep them out of fresh seeds until an official-source
// review is recorded; never stamp a hard-coded verification date.
const ENABLE_SOURCE_REVIEWED_PUBLIC_CATALOG_SEEDS = false;

export const RICH_SUCCESS_STORIES = [] as const;
export const RICH_VISA_REQUIREMENTS = [] as const;
export const RICH_MENTORS = [] as const;
export const RICH_LEARNING_PROVIDERS = [
  {
    providerKey: "british_council_uz",
    name: "British Council Uzbekistan — Official IELTS Test Centre",
    kind: "test_prep",
    status: "sandbox",
    isEnabled: true,
    config: JSON.stringify({
      city: "Tashkent, Samarkand, Bukhara, Fergana & Urgench",
      url: "https://www.britishcouncil.uz/en/exam/ielts",
      description:
        "Official UKVI and Academic IELTS computer-delivered and paper-based test center across Uzbekistan with free IELTS Ready Premium preparation access for registered test takers.",
    }),
  },
  {
    providerKey: "idp_ielts_tashkent",
    name: "IDP IELTS Uzbekistan (Edu-Action Official Test Centre)",
    kind: "test_prep",
    status: "sandbox",
    isEnabled: true,
    config: JSON.stringify({
      city: "Tashkent & Regional Centres",
      url: "https://ielts.idp.com/uzbekistan",
      description:
        "Co-owner of IELTS offering daily computer-delivered IELTS Academic, IELTS One Skill Retake, and official mock test diagnostics in Tashkent and regional cities.",
    }),
  },
  {
    providerKey: "educationusa_tashkent",
    name: "EducationUSA Uzbekistan Advising Center (American Councils)",
    kind: "advising",
    status: "sandbox",
    isEnabled: true,
    config: JSON.stringify({
      city: "Tashkent, Samarkand & Namangan",
      url: "https://educationusa.state.gov/centers/educationusa-advising-center-tashkent",
      description:
        "U.S. Department of State network offering free advising, Competitive College Club (CCC) cohorts, Opportunity Funds for low-income top students, and official SAT/TOEFL prep library resources.",
    }),
  },
  {
    providerKey: "ets_toefl_gre_uz",
    name: "ETS Official TOEFL iBT & GRE General Test Centers Uzbekistan",
    kind: "test_prep",
    status: "sandbox",
    isEnabled: true,
    config: JSON.stringify({
      city: "Tashkent & Samarkand",
      url: "https://www.ets.org/toefl/test-takers/ibt/take/locations.html",
      description:
        "Authorized Prometric / ETS test centers in Uzbekistan administering TOEFL iBT and GRE General Tests with official ETS TestReady practice diagnostics.",
    }),
  },
  {
    providerKey: "college_board_sat_uz",
    name: "College Board Digital SAT Test Centers Uzbekistan",
    kind: "test_prep",
    status: "sandbox",
    isEnabled: true,
    config: JSON.stringify({
      city: "Tashkent, Nukus, Samarkand, Bukhara & Fergana",
      url: "https://satsuite.collegeboard.org/sat/test-center-search",
      description:
        "Official Digital SAT and AP exam administration centers hosted at Presidential Schools, Tashkent International School, and accredited private testing hubs across all 14 regions of Uzbekistan.",
    }),
  },
  {
    providerKey: "daad_lektoren_tashkent",
    name: "DAAD Information Point Tashkent & TestDaF Examination Centre",
    kind: "advising",
    status: "sandbox",
    isEnabled: true,
    config: JSON.stringify({
      city: "Tashkent",
      url: "https://www.daad-uzbekistan.org/",
      description:
        "Official German Academic Exchange Service (DAAD) representation in Uzbekistan providing free study-in-Germany advising, OnSET/TestDaF testing, and scholarship workshops.",
    }),
  },
  {
    providerKey: "korean_education_center_tashkent",
    name: "Tashkent Korean Education Center (TOPIK & GKS Official Center)",
    kind: "test_prep",
    status: "sandbox",
    isEnabled: true,
    config: JSON.stringify({
      city: "Tashkent",
      url: "https://www.topik.go.kr/",
      description:
        "Official Ministry of Education of the Republic of Korea institution in Tashkent administering the TOPIK I & II Korean proficiency exams and Global Korea Scholarship (GKS) advising.",
    }),
  },
  {
    providerKey: "khan_academy_sat_prep",
    name: "Khan Academy & Bluebook Official Digital SAT Practice",
    kind: "test_prep",
    status: "sandbox",
    isEnabled: true,
    config: JSON.stringify({
      city: "Online (Global & Uzbek Localized)",
      url: "https://www.khanacademy.org/test-prep/digital-sat",
      description:
        "Official free College Board partner for Digital SAT Reading & Writing and Math mastery, paired with full-length adaptive Bluebook practice exams.",
    }),
  },
];

let richSeedPromise: Promise<void> | null = null;

export async function seedRichPlatformData(): Promise<{
  storiesInserted: number;
  visaRequirementsInserted: number;
  mentorsInserted: number;
  providersInserted: number;
  goalTemplatesInserted: number;
  answerPromptsInserted: number;
  checklistItemsInserted: number;
}> {
  let storiesInserted = 0;
  let visaRequirementsInserted = 0;
  let mentorsInserted = 0;
  let providersInserted = 0;
  let goalTemplatesInserted = 0;
  let answerPromptsInserted = 0;
  let checklistItemsInserted = 0;

  if (!ENABLE_SOURCE_REVIEWED_PUBLIC_CATALOG_SEEDS) {
    console.warn("Skipping legacy success-story, visa-requirement, and mentor seed candidates: current official-source review is required.");
  }

  // Success stories, visa requirements, and mentor identities are omitted until
  // evidence (and consent where applicable) is reviewed. Existing rows are not
  // modified by this seed path.

  // 4. Seed Official Learning & Test Prep Providers (idempotent by providerKey)
  for (const provider of RICH_LEARNING_PROVIDERS) {
    const existing = await db
      .select({ id: learningProviders.id })
      .from(learningProviders)
      .where(eq(learningProviders.providerKey, provider.providerKey))
      .limit(1);
    if (existing.length > 0) continue;

    await db.insert(learningProviders).values(provider);
    providersInserted += 1;
  }

  // 5. Seed the growth catalogues. `ensureGrowthTables` (src/lib/growth/db.ts)
  //    inserts the same rows on its own bootstrap, so both paths must dedupe on
  //    the same natural key — a title (or prompt question) is the only stable
  //    identity we have, and it is what makes a re-run a no-op.
  //
  //    Each catalogue is independent and individually tolerant of its table not
  //    existing yet: this function is also reached from routes that never run
  //    the growth DDL (mentors, journey), and a missing `goal_templates` table
  //    must not cost them the providers or growth catalogues they actually asked for.
  try {
    const existingGoalTitles = new Set(
      (await db.select({ title: goalTemplates.title }).from(goalTemplates)).map((g) => g.title)
    );
    for (const [i, g] of SEED_GOAL_TEMPLATES.entries()) {
      if (existingGoalTitles.has(g.title)) continue;
      await db.insert(goalTemplates).values({ ...g, steps: JSON.stringify(g.steps), sortOrder: i });
      goalTemplatesInserted += 1;
    }
  } catch (err) {
    console.error("seedRichPlatformData: goal_templates skipped:", err);
  }

  try {
    const existingQuestions = new Set(
      (await db.select({ question: answerPrompts.question }).from(answerPrompts)).map((p) => p.question)
    );
    for (const [i, p] of SEED_ANSWER_PROMPTS.entries()) {
      if (existingQuestions.has(p.question)) continue;
      await db.insert(answerPrompts).values({ ...p, sortOrder: i });
      answerPromptsInserted += 1;
    }
  } catch (err) {
    console.error("seedRichPlatformData: answer_prompts skipped:", err);
  }

  try {
    const existingItemTitles = new Set(
      (await db.select({ title: checklistItems.title }).from(checklistItems)).map((c) => c.title)
    );
    for (const [i, c] of SEED_CHECKLIST_ITEMS.entries()) {
      if (existingItemTitles.has(c.title)) continue;
      await db.insert(checklistItems).values({ ...c, sortOrder: i });
      checklistItemsInserted += 1;
    }
  } catch (err) {
    console.error("seedRichPlatformData: checklist_items skipped:", err);
  }

  return {
    storiesInserted,
    visaRequirementsInserted,
    mentorsInserted,
    providersInserted,
    goalTemplatesInserted,
    answerPromptsInserted,
    checklistItemsInserted,
  };
}

/** Process-cached helper for API routes and lazy table bootstraps. */
export async function ensureRichPlatformDataSeeded(): Promise<void> {
  if (!richSeedPromise) {
    richSeedPromise = seedRichPlatformData()
      .then(() => undefined)
      .catch((err) => {
        richSeedPromise = null;
        console.error("ensureRichPlatformDataSeeded warning:", err);
      });
  }
  return richSeedPromise;
}
