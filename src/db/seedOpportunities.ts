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
  // ── 18 Expanded Global & Uzbekistan-Eligible Verified Opportunities (2026–2027) ──
  {
    type: "summer_school",
    title: "TechGirls U.S. Department of State Summer Exchange Program",
    provider: "U.S. Department of State / Legacy International",
    country: "United States",
    fields: ["Computer Science", "Engineering", "Mathematics", "Data Science"],
    level: "high_school",
    url: "https://techgirlsglobal.org/",
    description:
      "Fully funded U.S. Department of State summer exchange for young women in STEM from Uzbekistan and eligible countries, hosted at Virginia Tech with U.S. tech mentoring and a community action project.",
  },
  {
    type: "summer_school",
    title: "Global Undergraduate Exchange Program (Global UGRAD)",
    provider: "U.S. Department of State / World Learning",
    country: "United States",
    fields: ["All"],
    level: "undergrad",
    url: "https://www.worldlearning.org/program/global-undergraduate-exchange-program/",
    description:
      "Fully funded one-semester non-degree academic scholarship at an accredited U.S. university for undergraduate students from Uzbekistan and partner nations, covering tuition, room and board, airfare, and stipend.",
  },
  {
    type: "research",
    title: "University of Sussex & Cambridge International Summer Research Programme",
    provider: "University of Sussex / Reach Cambridge",
    country: "United Kingdom",
    fields: ["Computer Science", "Physics", "Economics", "Life Sciences"],
    level: "undergrad",
    url: "https://www.sussex.ac.uk/study/study-abroad-at-sussex/summer-school",
    description:
      "Intensive UK summer research and academic immersion programme pairing international undergraduates with faculty research groups, laboratory workshops, and merit scholarship support.",
  },
  {
    type: "internship",
    title: "Max Planck Institute Summer Internship in Computer Science (MPG SIP)",
    provider: "Max Planck Institutes for Informatics, Software Systems & Security",
    country: "Germany",
    fields: ["Computer Science", "Artificial Intelligence", "Cybersecurity"],
    level: "undergrad",
    url: "https://www.cis.mpg.de/internships/",
    description:
      "Paid 10-to-14-week research internship at the Max Planck Institutes in Saarbrücken, Kaiserslautern, and Bochum; all selected interns receive a monthly stipend, housing support, and round-trip travel.",
  },
  {
    type: "research",
    title: "EPFL Excellence in Engineering Research Internship Program (E3)",
    provider: "École Polytechnique Fédérale de Lausanne (EPFL)",
    country: "Switzerland",
    fields: ["Engineering", "Computer Science", "Materials Science", "Electrical Engineering"],
    level: "undergrad",
    url: "https://eee.epfl.ch/",
    description:
      "Competitive 8-to-12-week summer laboratory fellowship in Lausanne for bachelor and master students worldwide, providing CHF 1,600 per month for living costs plus refunded travel expenses.",
  },
  {
    type: "research",
    title: "ETH Zurich Student Summer Research Fellowship (SSRF)",
    provider: "ETH Zurich Department of Computer Science",
    country: "Switzerland",
    fields: ["Computer Science", "Data Science", "Robotics", "Machine Learning"],
    level: "undergrad",
    url: "https://inf.ethz.ch/studies/summer-research-fellowship.html",
    description:
      "Two-month summer research fellowship in Zurich open to bachelor and master students globally, offering a CHF 4,000 living allowance, travel reimbursement, and direct mentorship in an ETH CS lab.",
  },
  {
    type: "research",
    title: "IST Austria (ISTA) ISTernship Summer Program",
    provider: "Institute of Science and Technology Austria (ISTA)",
    country: "Austria",
    fields: ["Biology", "Computer Science", "Mathematics", "Physics", "Neuroscience"],
    level: "undergrad",
    url: "https://phd.pages.ist.ac.at/isternship/",
    description:
      "Fully funded summer research internship near Vienna for bachelor and master students, providing a monthly EUR 1,150 stipend, travel allowance, subsidized campus housing, and an annual research symposium.",
  },
  {
    type: "research",
    title: "OIST Research Internship Program",
    provider: "Okinawa Institute of Science and Technology (OIST)",
    country: "Japan",
    fields: ["Physics", "Chemistry", "Neuroscience", "Computer Science", "Marine Science"],
    level: "undergrad",
    url: "https://admissions.oist.jp/apply-research-internship",
    description:
      "Two-to-six-month funded research placement in Okinawa, Japan for final-year bachelor and master students, providing a daily tax-free allowance of JPY 2,400, furnished apartment, and round-trip airfare.",
  },
  {
    type: "research",
    title: "Amgen Scholars Asia Program (University of Tokyo & Kyoto University)",
    provider: "Amgen Foundation / University of Tokyo / Kyoto University",
    country: "Japan",
    fields: ["Biotechnology", "Bioengineering", "Chemistry", "Biology"],
    level: "undergrad",
    url: "https://amgenscholars.com/asia-program/",
    description:
      "Eight-week biomedical and biotechnology summer research fellowship hosted in Japan and Singapore for undergraduates from across Asia, including Uzbekistan, with full travel, accommodation, and stipend.",
  },
  {
    type: "research",
    title: "Pioneer Academics Global Online Research Program",
    provider: "Pioneer Academics / Oberlin College Credit Partner",
    country: "United States",
    fields: ["All"],
    level: "high_school",
    url: "https://pioneeracademics.com/",
    description:
      "Rigorous online undergraduate-level research mentorship with U.S. university professors culminating in a cited research paper and four transferable Oberlin College credits, with need-based scholarships.",
  },
  {
    type: "summer_school",
    title: "LaunchX Entrepreneurship Summer Program",
    provider: "LaunchX",
    country: "United States",
    fields: ["Business", "Entrepreneurship", "Computer Science"],
    level: "high_school",
    url: "https://www.launchx.com/",
    description:
      "Co-founder startup incubator for ambitious high school entrepreneurs where teams build and launch a real revenue-generating venture over the summer, with need-based financial awards available.",
  },
  {
    type: "summer_school",
    title: "Yale Young Global Scholars (YYGS)",
    provider: "Yale University",
    country: "United States",
    fields: ["Politics", "Economics", "Literature", "Science", "Engineering"],
    level: "high_school",
    url: "https://globalscholars.yale.edu/",
    description:
      "Two-week residential academic enrichment program in New Haven, Connecticut for high school students from 150+ countries, offering over USD 3 million in need-based tuition waivers annually.",
  },
  {
    type: "summer_school",
    title: "Stanford Pre-Collegiate Summer Institutes",
    provider: "Stanford University Online High School",
    country: "United States",
    fields: ["Computer Science", "Mathematics", "Humanities", "Bioscience", "Business"],
    level: "high_school",
    url: "https://summerinstitutes.spcs.stanford.edu/",
    description:
      "Intensive single-subject enrichment courses taught by Stanford instructors for grades 8–11 worldwide, featuring live seminar discussions, hands-on projects, and need-based financial aid.",
  },
  {
    type: "internship",
    title: "Google Summer of Code (GSoC)",
    provider: "Google Open Source",
    country: null,
    fields: ["Computer Science", "Software Engineering", "Artificial Intelligence"],
    level: "any",
    url: "https://summerofcode.withgoogle.com/",
    description:
      "Global online open-source engineering mentorship where contributors work 12+ weeks with leading software organizations and earn a purchasing-power-adjusted stipend between USD 1,500 and USD 6,600.",
  },
  {
    type: "internship",
    title: "MLH Fellowship (Major League Hacking)",
    provider: "Major League Hacking",
    country: null,
    fields: ["Computer Science", "Software Engineering", "Artificial Intelligence"],
    level: "any",
    url: "https://fellowship.mlh.io/",
    description:
      "Remote 12-week software engineering and AI fellowship matching student developers with production open-source repositories maintained by Meta, Google, and AWS engineers, with educational stipends.",
  },
  {
    type: "competition",
    title: "UN Youth Volunteer & UNICEF Uzbekistan Youth Innovation Lab",
    provider: "United Nations Volunteers (UNV) / UNICEF Uzbekistan",
    country: "Uzbekistan",
    fields: ["Public Policy", "Social Sciences", "Environmental Science", "Education"],
    level: "any",
    url: "https://www.unv.org/",
    description:
      "National and international youth civic innovation and volunteering assignments across Tashkent, Samarkand, and Karakalpakstan focused on climate resilience, digital inclusion, and SDG leadership.",
  },
  {
    type: "competition",
    title: "Harvard WorldMUN & Tashkent International Model United Nations (TIMUN)",
    provider: "Harvard WorldMUN / Westminster International University in Tashkent",
    country: "Uzbekistan",
    fields: ["International Relations", "Law", "Public Policy", "Economics"],
    level: "any",
    url: "https://www.worldmun.org/",
    description:
      "Premier parliamentary diplomacy and crisis simulation circuit connecting Uzbek high school and university delegates with global peers, best-delegate gavel awards, and international conference fee waivers.",
  },
  {
    type: "competition",
    title: "Hult Prize Global Student Social Enterprise Challenge",
    provider: "Hult Prize Foundation",
    country: null,
    fields: ["Entrepreneurship", "Business", "Sustainability", "Engineering"],
    level: "undergrad",
    url: "https://www.hultprize.org/",
    description:
      "Year-long global social entrepreneurship competition — with active OnCampus qualifiers at Tashkent universities — where student teams pitch for USD 1,000,000 in seed capital to solve pressing UN SDG challenges.",
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
      isVerified: true,
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
