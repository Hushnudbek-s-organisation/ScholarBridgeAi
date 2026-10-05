/**
 * Demo catalogue for the Opportunities feed (competitions, research
 * programmes, internships, summer schools).
 *
 * The `opportunities` table was never seeded, so the Opportunities pane was
 * EMPTY on a fresh install even though the matcher (`src/lib/opportunities.ts`)
 * and the panel existed.
 *
 * HONESTY RULES — identical to the program catalogue:
 *  - every row is written with `is_verified = false`, so the panel does not
 *    show its verified badge for data nobody checked;
 *  - NO deadline is invented. Each of these programmes runs on its own annual
 *    cycle, so `deadline_date` stays NULL — the matcher then reports
 *    "recurring or date not published — check the official page" instead of a
 *    made-up date;
 *  - the URL is the provider's own official page, which is the thing a student
 *    should open to confirm dates and eligibility.
 *
 * Idempotent: re-running only inserts rows whose (title, provider) pair is not
 * already present.
 */

import { and, eq, sql } from "drizzle-orm";
import { db } from "./index";
import { opportunities } from "./schema";

interface OpportunitySpec {
  type: "competition" | "research" | "internship" | "summer_school";
  title: string;
  provider: string;
  /** NULL = international / open to all countries. */
  country: string | null;
  fields: string[];
  level: "high_school" | "undergrad" | "grad" | "phd" | "any";
  url: string;
  description: string;
}

export const OPPORTUNITY_CATALOG: OpportunitySpec[] = [
  {
    type: "internship",
    title: "Google Summer of Code",
    provider: "Google",
    country: null,
    fields: ["Computer Science", "Software Engineering", "Artificial Intelligence"],
    level: "any",
    url: "https://summerofcode.withgoogle.com/",
    description:
      "Paid open-source contribution programme: students work with a mentoring organisation for roughly three months on a defined coding project.",
  },
  {
    type: "internship",
    title: "Google Summer of Code — docs and design roles",
    provider: "Google",
    country: null,
    fields: ["Design", "Journalism / Media Studies", "Linguistics / Translation Studies"],
    level: "any",
    url: "https://summerofcode.withgoogle.com/",
    description:
      "The same programme also accepts non-code projects (documentation, design, accessibility) at participating mentoring organisations.",
  },
  {
    type: "competition",
    title: "Microsoft Imagine Cup",
    provider: "Microsoft",
    country: null,
    fields: ["All"],
    level: "any",
    url: "https://imaginecup.microsoft.com/",
    description:
      "Global student technology competition: teams build a project using AI or cloud services and pitch it in rounds, with mentorship and prizes.",
  },
  {
    type: "competition",
    title: "iGEM Competition",
    provider: "iGEM Foundation",
    country: null,
    fields: ["Biotechnology", "Biology", "Biomedical Engineering", "Chemistry"],
    level: "undergrad",
    url: "https://igem.org/",
    description:
      "Team-based synthetic biology competition: students design, build and present a project at the annual Grand Jamboree.",
  },
  {
    type: "competition",
    title: "International Collegiate Programming Contest (ICPC)",
    provider: "ICPC Foundation",
    country: null,
    fields: ["Computer Science", "Software Engineering", "Mathematics"],
    level: "undergrad",
    url: "https://icpc.global/",
    description:
      "University programming contest run through regional and world finals; teams of three solve algorithmic problems under time pressure.",
  },
  {
    type: "research",
    title: "CERN Summer Student Programme",
    provider: "CERN",
    country: "Switzerland",
    fields: ["Physics", "Computer Science", "Electrical Engineering", "Mathematics"],
    level: "undergrad",
    url: "https://careers.cern/summer",
    description:
      "Summer placement at CERN: lectures plus work with a research team on physics, computing or engineering projects.",
  },
  {
    type: "research",
    title: "DAAD WISE — Working Internships in Science and Engineering",
    provider: "DAAD",
    country: "Germany",
    fields: ["Engineering", "Natural Sciences"],
    level: "undergrad",
    url: "https://www.daad.de/en/study-and-research-in-germany/scholarships/",
    description:
      "Scholarship for students from partner countries to complete a research internship with a German university group; application through the DAAD portal.",
  },
  {
    type: "research",
    title: "MITACS Globalink Research Internship",
    provider: "Mitacs",
    country: "Canada",
    fields: ["All"],
    level: "undergrad",
    url: "https://www.mitacs.ca/our-programs/globalink-research-internship-students/",
    description:
      "Competitive research internship at a Canadian university, with a stipend; matching happens through the Mitacs portal each year.",
  },
  {
    type: "summer_school",
    title: "European Space Agency — ESA Academy Training Courses",
    provider: "European Space Agency",
    country: null,
    fields: ["Aerospace Engineering", "Physics", "Computer Science"],
    level: "undergrad",
    url: "https://www.esa.int/Education/ESA_Academy",
    description:
      "Short hands-on training courses and workshops for university students on space engineering, science and operations.",
  },
  {
    type: "summer_school",
    title: "Summer@EPFL",
    provider: "EPFL",
    country: "Switzerland",
    fields: ["Computer Science", "Mathematics", "Physics", "Engineering"],
    level: "undergrad",
    url: "https://summer.epfl.ch/",
    description:
      "Summer research internship in an EPFL laboratory with a stipend, aimed at students considering a research career.",
  },
  {
    type: "summer_school",
    title: "Amgen Scholars Programme",
    provider: "Amgen Foundation",
    country: null,
    fields: ["Biology", "Chemistry", "Biomedical Sciences", "Biotechnology"],
    level: "undergrad",
    url: "https://amgenscholars.com/",
    description:
      "Summer research programme in the life sciences hosted by partner universities, with a stipend and a student symposium.",
  },
  {
    type: "competition",
    title: "Hult Prize",
    provider: "Hult Prize Foundation",
    country: null,
    fields: ["Business Administration", "Economics", "Entrepreneurship", "Environmental Science"],
    level: "undergrad",
    url: "https://www.hultprize.org/",
    description:
      "Social-entrepreneurship competition: campus rounds lead to incubator support and a global final for the strongest student teams.",
  },
  {
    type: "internship",
    title: "Erasmus+ Traineeship (student mobility for traineeships)",
    provider: "European Commission",
    country: null,
    fields: ["All"],
    level: "any",
    url: "https://erasmus-plus.ec.europa.eu/opportunities/opportunities-for-individuals/students/traineeships",
    description:
      "Funded traineeship abroad through the Erasmus+ programme: students arrange a host organisation and apply through their university's international office.",
  },
  {
    type: "research",
    title: "Mitacs Accelerate",
    provider: "Mitacs",
    country: "Canada",
    fields: ["All"],
    level: "grad",
    url: "https://www.mitacs.ca/our-programs/accelerate/",
    description:
      "Research internship for graduate students and postdocs, pairing an academic supervisor with an industry partner in Canada.",
  },
  {
    type: "research",
    title: "DAAD Research Grants — Doctoral Programmes in Germany",
    provider: "DAAD",
    country: "Germany",
    fields: ["All"],
    level: "phd",
    url: "https://www.daad.de/en/study-and-research-in-germany/scholarships/",
    description:
      "Research grant for doctoral candidates to carry out a research project or full doctorate at a German university; see the DAAD scholarship database for the current call.",
  },
  {
    type: "competition",
    title: "Kaggle Competitions",
    provider: "Kaggle",
    country: null,
    fields: ["Data Science", "Artificial Intelligence", "Computer Science"],
    level: "any",
    url: "https://www.kaggle.com/competitions",
    description:
      "Continuous public machine-learning competitions: any student can enter, and a public leaderboard result is a portable, verifiable portfolio item.",
  },
];

export interface SeedOpportunitiesSummary {
  inserted: number;
}

export async function seedOpportunities(): Promise<SeedOpportunitiesSummary> {
  let inserted = 0;

  for (const spec of OPPORTUNITY_CATALOG) {
    const existing = await db
      .select({ id: opportunities.id })
      .from(opportunities)
      .where(and(eq(opportunities.title, spec.title), eq(opportunities.provider, spec.provider)))
      .limit(1);
    if (existing.length > 0) continue;

    await db.insert(opportunities).values({
      type: spec.type,
      title: spec.title,
      provider: spec.provider,
      country: spec.country,
      fields: JSON.stringify(spec.fields),
      level: spec.level,
      // never guessed — the programme announces each cycle's dates itself
      deadlineDate: null,
      url: spec.url,
      description: spec.description,
      isVerified: false,
    });
    inserted += 1;
  }

  return { inserted };
}

/** Row count, for the seed log. */
export async function countOpportunities(): Promise<number> {
  const [row] = await db.select({ n: sql<number>`count(*)::int` }).from(opportunities);
  return Number(row?.n ?? 0);
}
