/**
 * Gold-standard samples & exemplars library ("Namunalar kutubxonasi").
 *
 * WHAT THIS IS
 *   Canonical, typed teaching samples for every authoring surface: the SOP
 *   drafter, the essay rubric, recommendation letters, CVs, short answers,
 *   activities, official documents and visa interviews. Every sample is split
 *   into paragraphs and every paragraph carries a structural role. The role's
 *   localized label and its "why readers reward this" note live in the
 *   `samples.roles` i18n namespace, so the annotated view is translated while
 *   the sample itself stays in the language it would be submitted in.
 *
 * HONESTY RULES (asserted by scripts/check-samples.ts)
 *   • Samples describe FICTIONAL applicants. Real universities, courses, labs
 *     and programmes are named only to show the level of specificity a reader
 *     expects — students must verify every such detail on official pages.
 *   • A sample never reaches a student's records on its own. A surface copies a
 *     sample into an editor or form only after an explicit "Load" click, and
 *     every surface that persists data refuses to save a sample that has not
 *     been personalised (see `isUnmodifiedSample`).
 *   • `origin: "brief"` texts reproduce the product brief verbatim. Two typos
 *     were corrected: "ratusan" (an Indonesian word) → "hundreds of" in the
 *     KAIST hook, and "DilshodbekNazarov" → "Dilshodbek Nazarov" in the lyceum
 *     letter. `origin: "authored"` texts fill sections the brief
 *     referenced but did not include: LOR-1, the request e-mail, three CV
 *     snapshots, three CVs, three document templates, four essays (El-yurt
 *     umidi, DAAD, why-us, supplemental) and four visa transcripts.
 *   • No score is stored here. Tests compute scores with the same deterministic
 *     engines the app uses (src/lib/essay.ts, src/lib/visaScoring.ts), so any
 *     number shown next to a sample can be re-verified.
 *
 * Pure module: no React, no I/O; its only runtime import is the tiny ./text
 * helper module. Client surfaces load it lazily
 * (src/components/samples/useSampleLibrary.ts) so the ~100 KB of text never
 * weighs on first paint, and they import ./text — never this file — statically.
 */

import type { EssayType } from "../essay";
import type { VisaTurn } from "../visaScoring";

// ---------------------------------------------------------------------------
// Taxonomy
// ---------------------------------------------------------------------------

/** The nine surfaces a sample can belong to. */
export const SAMPLE_GROUPS = [
  "onboardingCv",
  "sop",
  "essay",
  "lor",
  "cvBuilder",
  "answerVault",
  "activity",
  "document",
  "visa",
] as const;
export type SampleGroup = (typeof SAMPLE_GROUPS)[number];

/**
 * Structural roles. Each id has `samples.roles.<id>.label` and
 * `samples.roles.<id>.why` in en/uz/ru (checked by scripts/check-samples.ts).
 */
export const SAMPLE_ROLES = [
  // essays
  "hook",
  "preparation",
  "evidence",
  "gap",
  "fit",
  "community",
  "impact",
  "reflection",
  "leadership",
  "networking",
  "studyPlan",
  // letters & e-mails
  "letterhead",
  "relationship",
  "anecdote",
  "character",
  "endorsement",
  "signature",
  "heading",
  "ask",
  // CVs
  "cvHeader",
  "cvEducation",
  "cvExperience",
  "cvProjects",
  "cvLeadership",
  "cvRecognition",
  "cvSkills",
  // visa interviews
  "visaPurpose",
  "visaChoice",
  "visaFunding",
  "visaTies",
  "visaReturn",
  // official documents
  "docParties",
  "docAmount",
  "docEvidence",
  "docBudget",
  "docSignature",
  // short answers & activities
  "answer",
  "activity",
] as const;
export type SampleRole = (typeof SAMPLE_ROLES)[number];

/** `brief` = verbatim from the product brief; `authored` = written to fill a gap in it. */
export type SampleOrigin = "brief" | "authored" | "composite";

interface SampleBase {
  /** Stable id and the i18n key under `samples.tracks` (camelCase, no dots). */
  id: string;
  origin: SampleOrigin;
  /** Clean, copyable text. Paragraphs are separated by exactly one blank line. */
  text: string;
  /** One structural role per paragraph of `text`, in order. */
  roles: SampleRole[];
  /** Composite examples are invented teaching material, never verified admission stories. */
  sourceNote?: string;
  /** Official pages checked for factual references; timestamp is an ISO date. */
  sourceChecks?: { url: string; checkedAt: string; note: string }[];
}

export interface OnboardingCvSample extends SampleBase {
  group: "onboardingCv";
  degreeLevel: "Bachelor" | "Master";
}

/** The six inputs of the AI SOP drafter (src/components/AiSopStudio.tsx). */
export interface SopDrafterFields {
  targetUni: string;
  targetProgram: string;
  personalHook: string;
  experienceExample: string;
  programEvidence: string;
  careerGoals: string;
}

export interface SopSample extends SampleBase {
  group: "sop";
  degreeLevel: "Bachelor" | "Master";
  fields: SopDrafterFields;
}

export interface EssaySample extends SampleBase {
  group: "essay";
  essayType: EssayType;
  /** What the essay is addressed to — passed to the rubric's fit check. */
  targetName: string;
  /**
   * A PRACTICE word limit for the rubric. Programmes publish their own limits;
   * the UI labels this as practice so nobody mistakes it for an official rule.
   */
  wordLimit: number | null;
  /** The prompt the sample answers (shown in the rubric studio's prompt box). */
  prompt: string;
}

/** The five inputs of the recommendation brief (src/components/RecLetterPanel.tsx). */
export interface RecLetterFields {
  university: string;
  deadline: string;
  relationshipContext: string;
  requestedFocus: string;
  supportingExample: string;
}

export interface LorSample extends SampleBase {
  group: "lor";
  kind: "academic" | "teacher" | "employer" | "requestEmail";
  recLetterFields: RecLetterFields;
}

export interface CvBuilderSample extends SampleBase {
  group: "cvBuilder";
  format: "academic" | "undergraduate" | "europass";
}

export type AnswerVaultCategory = "general" | "motivation" | "leadership" | "career" | "challenge" | "community";

export interface AnswerVaultSample extends SampleBase {
  group: "answerVault";
  category: AnswerVaultCategory;
  /** Exact optional vault prompt this sample is intended to illustrate. */
  forQuestion?: string;
}

/** The fields of the Activity Portfolio form (src/components/journey/PreparePanels.tsx). */
export interface ActivityFields {
  /** One of ACTIVITY_CATEGORIES in src/app/api/activities/route.ts. */
  category: "research" | "leadership" | "volunteering" | "competition" | "project" | "club" | "work" | "community" | "sport" | "creative";
  title: string;
  role: string;
  organization: string;
  /** Total hours in the existing activity form. */
  hours: number;
  description: string;
  achievements: string;
  /** Illustrative Common App scope metadata; not persisted by the activity API. */
  hoursPerWeek?: number;
  weeksPerYear?: number;
  grades?: string;
  commonAppDescription?: string;
  portfolioCategory?: string;
}

export interface ActivitySample extends SampleBase {
  group: "activity";
  activity: ActivityFields;
}

export interface DocumentSample extends SampleBase {
  group: "document";
  kind: "affidavit" | "coldEmail" | "coverNote";
  /** Uzbek version with the same paragraph structure, for documents signed in Uzbekistan. */
  textUz?: string;
}

export interface VisaSample extends SampleBase {
  group: "visa";
  /** A code from VISA_COUNTRIES in src/lib/visa-interview.ts. */
  countryCode: "US" | "DE" | "KR" | "UK";
  destination: string;
  visaType: string;
  /** Officer/applicant turns, scored by scoreVisaInterview() exactly as a live session is. */
  turns: VisaTurn[];
}

export type SampleExemplar =
  | OnboardingCvSample
  | SopSample
  | EssaySample
  | LorSample
  | CvBuilderSample
  | AnswerVaultSample
  | ActivitySample
  | DocumentSample
  | VisaSample;

export type SampleOf<G extends SampleGroup> = Extract<SampleExemplar, { group: G }>;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

// Text helpers live in ./text so client components can import them without
// pulling this whole library into the first-paint bundle.
export { splitParagraphs, sampleWordCount, isUnmodifiedSample, EVIDENCE_TOKEN_RE, PLACEHOLDER_RE } from "./text";

/** Turns structured visa turns into the copyable transcript text (one paragraph per Q/A pair). */
function transcript(turns: VisaTurn[]): string {
  const pairs: string[] = [];
  for (let i = 0; i < turns.length; i += 2) {
    const officer = turns[i];
    const applicant = turns[i + 1];
    pairs.push(`Officer: ${officer?.text ?? ""}\nApplicant: ${applicant?.text ?? ""}`);
  }
  return pairs.join("\n\n");
}

/** Builds the copyable/annotated text of an activity record from its fields. */
function activityText(a: ActivityFields): string {
  return [
    `${a.title}\n${a.role} · ${a.organization} · ${a.hours} hours\n${a.description}${a.commonAppDescription ? `\nCommon App draft (${a.commonAppDescription.length}/150): ${a.commonAppDescription}` : ""}${a.hoursPerWeek && a.weeksPerYear ? `\nIllustrative scope: ${a.hoursPerWeek} hr/wk · ${a.weeksPerYear} wk/yr · grades ${a.grades ?? "not specified"}` : ""}`,
    `Achievements: ${a.achievements}`,
  ].join("\n\n");
}

/** Fictional composite teaching benchmark; these are not a real student's verified record. */
export const COMPOSITE_ADMISSIONS_BENCHMARK = {
  label: "Fictional composite — admissions-style example, not an admitted-student record",
  academic: {
    gpa: 4.0, gpaScale: 4.0, gpaType: "unweighted", classRank: "2 / 518 (weighted)",
    dualEnrollment: "University of Texas at Austin — UT OnRamps Computer Science (COMPSCI)",
    apCourses: ["AP Chemistry", "AP Calculus BC", "AP English Literature", "AP U.S. Government & Politics", "AP Macroeconomics", "AP Seminar"],
  },
  honors: [
    { title: "YoungArts Winner With Distinction — Classical Music", tier: "National", grades: "12" },
    { title: "TMEA All-State Band — 6A Percussion, first chair (composite illustration)", tier: "State / regional", grades: "10–11" },
    { title: "UIL Texas State Solo and Ensemble — Outstanding Performer (composite illustration)", tier: "State / regional", grades: "10–11" },
    { title: "National Merit / National Recognition Program Scholar (award wording must match actual award)", tier: "National", grades: "10" },
    { title: "Principal's Outstanding Scholar Leadership Award (composite illustration)", tier: "School", grades: "11" },
  ],
  awardOrdering: "International → National → Regional/State → School; use only recognitions actually earned and preserve their official names.",
} as const;

// ===========================================================================
// 3.1 SOP / MOTIVATION LETTERS — SOP_SAMPLES (brief, verbatim)
// ===========================================================================

const SOP_TUM_TEXT = `In the summer of 2023, severe water scarcity in Uzbekistan's Qashqadaryo region forced smallholder farmers in my district to abandon nearly a third of their late-season crops. Walking alongside regional hydrologists, I noticed that the crisis was driven not only by climate volatility, but by a data blind spot: irrigation gates were opened on fixed calendar schedules rather than real-time soil evapotranspiration rates. That observation reshaped my trajectory as a software engineer. Rather than building consumer web applications, I committed my undergraduate research to a concrete question: how can resource-constrained machine learning systems optimize agricultural water allocation across Central Asia's arid river basins?

At the Tashkent University of Information Technologies (TUIT), I built the mathematical and systems foundation required to tackle this problem, maintaining a 4.88/5.00 GPA (top 2% of my cohort) across Advanced Algorithms, Linear Algebra, and Distributed Computing. In September 2024, I joined TUIT's Smart Irrigation & Climate Lab under Dr. Rustam Alimov. Over fourteen months, I designed and deployed a hybrid sensing pipeline combining multispectral Sentinel-2 satellite imagery with low-cost LoRaWAN soil probes across three pilot farms totaling 180 hectares. By quantizing a convolutional segmentation network in PyTorch to run on edge microcontrollers, we predicted root-zone moisture deficits 48 hours in advance with 91.4% accuracy and reduced seasonal water usage by 22%. This work produced two co-authored papers presented at IEEE ICISCT 2025 and earned first place at the AgroTech Uzbekistan National Hackathon.

While our pilot succeeded on uniform cotton plots, scaling predictive hydrology to heterogeneous mountain-fed watersheds exposed a critical limitation in my current toolkit: standard deep-learning models degrade rapidly under sparse ground-truth labels and shifting seasonal distributions. Overcoming this bottleneck requires rigorous graduate training in probabilistic machine learning, physics-informed neural networks, and scalable computer vision—precisely the strengths of the M.Sc. in Informatics at the Technical University of Munich (TUM).

TUM is my first-choice institution because its curriculum bridges theoretical machine intelligence with real-world environmental deployment. I am particularly eager to take Advanced Deep Learning for Physics and Earth Observation for Environmental Monitoring. Furthermore, the research conducted at the Munich Institute of Robotics and Machine Intelligence (MIRMI) and Prof. Xiaoxiang Zhu's Data Science in Earth Observation lab directly addresses multi-modal sensor fusion under label scarcity. Contributing to TUM's ongoing projects on high-resolution satellite time-series analysis will allow me to extend my LoRaWAN ground-sensor dataset into a generalizable domain-adaptation framework.

Beyond the laboratory, I have consistently translated technical knowledge into community capacity. In 2024, I founded CodeForRegions, recruiting 18 university volunteers to teach Python and algorithmic modeling to 420 rural high-school students in Qarshi and Namangan, fourteen of whom subsequently medaled in the Republican Informatics Olympiad. At TUM, I look forward to bringing this collaborative energy to the TUM.ai student initiative.

Upon completing my Master's degree at TUM, I will return to Uzbekistan to join the Digital Agriculture & Water Resources Center in Tashkent as a Lead Machine Learning Architect. My five-year goal is to integrate satellite-driven irrigation scheduling into the national water-management grid across the Amu Darya and Syr Darya basins, helping thousands of Central Asian farmers adapt to climate change with measurable precision.`;

const SOP_KAIST_TEXT = `Every Saturday morning during tenth grade, I helped my uncle reconcile inventory ledgers at his dried-fruit and fresh-produce stall in Tashkent's Chorsu Bazaar. While digital QR payments had arrived at the market, supply-chain decisions still relied on handwritten notebooks. Whenever a sudden heatwave hit the Fergana Valley, small vendors over-ordered perishable apricots without cold-storage space, losing up to 18% of their weekly working capital to spoilage. Watching hard-working merchants absorb preventable losses sparked my fascination with a practical question: how can lightweight algorithms help informal small businesses make data-driven inventory and credit decisions?

At my Academic Lyceum in Tashkent, I pursued every opportunity to turn mathematical theory into working software. I maintained a 5.00/5.00 GPA in Advanced Calculus, Physics, and Computer Science, and scored 1510 on the SAT (790 Math) alongside an IELTS 7.5. Outside class, I spent four months interviewing thirty bazaar vendors to understand their daily cash-flow bottlenecks. Using TypeScript, Node.js, and PostgreSQL, I built BozorLedger—a zero-cost Telegram Mini App that combines historical wholesale price trends with local weather forecasts to recommend daily restock quantities. Within five months, 64 vendors adopted the tool, reducing average perishable spoilage by 27%. Presenting BozorLedger's demand-smoothing algorithm earned First Prize at the Tashkent Youth Tech Fair and a Silver Medal at the Republican Olympiad in Informatics.

Building BozorLedger also taught me where my current knowledge ends. When I tried to add a peer-to-peer trade-credit scoring feature for seasonal farmers, my simple regression model failed whenever market prices shifted abruptly. Designing fair, resilient marketplaces requires more than coding—it demands rigorous training in algorithmic game theory, stochastic optimization, and scalable distributed systems. This realization is why I am applying to the Bachelor of Science program at the Korea Advanced Institute of Science and Technology (KAIST).

KAIST offers an academic environment unmatched in Asia for bridging computer science with industrial systems engineering. First, KAIST's flexible curriculum will allow me to pair core School of Computing courses—such as Design and Analysis of Algorithms (CS300) and Machine Learning (CS376)—with quantitative coursework in Industrial and Systems Engineering. Second, I am eager to participate in KAIST's Undergraduate Research Participation (URP) program during my sophomore year, where I hope to contribute to research on interpretable decision-making for supply-chain networks. Third, I look forward to joining ICISTS-KAIST and the K-Startup student incubator to test how South Korea's world-leading smart-logistics practices can be adapted to Central Asia's emerging markets.

In my home community, I have served for two years as Captain of our Lyceum Math & Coding Circle, mentoring 90 younger students for national STEM competitions. At KAIST, I will bring the same discipline, curiosity, and collaborative spirit to the campus community. Upon graduating, I aim to return to Uzbekistan to architect digital supply-chain and micro-lending platforms that empower thousands of regional farmers and small merchants to grow sustainably.`;

const SOP_LSE_TEXT = `While conducting field interviews with textile micro-entrepreneurs in Uzbekistan's Namangan region in early 2025, I met a workshop owner who had secured an export contract for organic cotton garments but could not obtain a $15,000 working-capital loan to upgrade her dyeing equipment. Although her workshop had zero loan defaults over four years, commercial banks valued rural real-estate collateral at only 40% of its urban equivalent. Across my sample of 320 rural enterprises, female-led workshops maintained a 98.4% repayment rate yet received less than 14% of subsidized green-modernization credit. Witnessing how blunt collateral rules choked productive entrepreneurship convinced me to dedicate my career to empirical development economics and financial-inclusion policy.

I prepared for this path during my Bachelor's studies in Economics at Westminster International University in Tashkent, graduating in the top 3% of my class (GPA 3.92/4.00; IELTS 8.0; GRE Quantitative 167). My undergraduate thesis examined the employment effects of Uzbekistan's 2022 tax-simplification reform across 14 regions using difference-in-differences estimation in Stata. Following graduation, I joined the Center for Economic Research and Reforms (CERR) in Tashkent as a Junior Research Analyst. Over the past eighteen months, I assembled a longitudinal dataset of 1,800 small and medium enterprises in the Fergana Valley using R and SQL. By evaluating a pilot cash-flow-based credit guarantee scheme, our team proved that relaxing immovable-collateral requirements for verified exporters increased firm-level employment by 19% without raising default rates. Our policy brief was formally adopted into the 2025 Presidential Decree on Regional Youth and Women's Entrepreneurship.

However, our evaluation also revealed a methodological challenge I could not resolve with standard reduced-form regressions: estimating general-equilibrium spillover effects when subsidized credit reallocates labor between informal agriculture and formal manufacturing. Mastering structural econometric modeling and randomized policy evaluation is the primary reason I am applying to the M.Sc. in Economic Policy for International Development at the London School of Economics (LSE).

LSE's curriculum offers the exact analytical rigor required to address credit-market frictions in transition economies. I am eager to enroll in Quantitative Analysis for Economic Policy and Microeconomic Principles for Development, which will sharpen my ability to identify causal mechanisms under imperfect data. Equally compelling is the research ecosystem at the Suntory and Toyota International Centres for Economics and Related Disciplines (STICERD). Engaging with faculty research on SME graduation programs and climate-resilient finance in emerging markets will directly inform my master's dissertation on green-credit allocation in landlocked Central Asian economies.

Outside my analytical work, I co-founded the Tashkent Young Economists Reading Group, guiding 65 undergraduate students in replicating empirical development papers using open-source Uzbekistan statistical datasets. Upon completing my M.Sc. at LSE, I will return to Tashkent to join the Department of Green Economy and SME Development at the Ministry of Economy and Finance, designing evidence-backed credit instruments that unlock equitable growth across Uzbekistan.`;

export const SOP_SAMPLES: SopSample[] = [
  {
    id: "sopTum",
    group: "sop",
    origin: "brief",
    degreeLevel: "Master",
    fields: {
      targetUni: "Technical University of Munich (TUM)",
      targetProgram: "M.Sc. in Informatics (Artificial Intelligence & Robotics)",
      personalHook:
        "During the 2023 summer water shortage in Qashqadaryo, I watched local farmers lose nearly a third of their late-season harvest because irrigation canals were opened on fixed calendar schedules rather than real-time soil moisture levels.",
      experienceExample:
        "As an Undergraduate Research Assistant at TUIT's Smart Irrigation Lab, I built a quantized PyTorch computer-vision model combining Sentinel-2 satellite imagery with LoRaWAN soil probes across 180 hectares, predicting moisture deficits 48 hours ahead with 91.4% accuracy and cutting water waste by 22%.",
      programEvidence:
        "TUM's courses in Advanced Deep Learning for Physics and Earth Observation, along with Prof. Xiaoxiang Zhu's Data Science in Earth Observation Lab and MIRMI, directly address multi-modal sensor fusion under sparse ground-truth labels.",
      careerGoals:
        "After graduating from TUM, I will return to Tashkent to lead the AI & Precision Hydrology team at the Ministry of Agriculture's Digital Innovation Center, deploying open-source drought-forecasting pipelines across the Amu Darya and Syr Darya river basins.",
    },
    text: SOP_TUM_TEXT,
    roles: ["hook", "evidence", "gap", "fit", "community", "impact"],
  },
  {
    id: "sopKaist",
    group: "sop",
    origin: "brief",
    degreeLevel: "Bachelor",
    fields: {
      targetUni: "Korea Advanced Institute of Science and Technology (KAIST)",
      targetProgram: "B.Sc. in School of Computing & Department of Industrial and Systems Engineering",
      // Brief typo corrected: "ratusan" (Indonesian for "hundreds") → "hundreds of".
      personalHook:
        "Helping my uncle track wholesale fruit inventory at the Chorsu Bazaar in Tashkent, I realized that hundreds of small merchants lost up to 18% of their weekly working capital simply because credit terms and cold-storage demand were recorded in paper notebooks.",
      experienceExample:
        "During 10th and 11th grade at the Presidential / Academic Lyceum, I coded 'BozorLedger', a lightweight Telegram Mini App in TypeScript and PostgreSQL now used by 64 local vendors to forecast daily perishable stock, cutting spoilage by 27% and earning a Silver Medal at the Republican Informatics Olympiad.",
      programEvidence:
        "KAIST's unique Undeclared Undergraduate Admissions system and the Undergraduate Research Participation (URP) program will allow me to combine CS492 (Algorithmic Game Theory) with supply-chain optimization in the Data Science & AI Lab.",
      careerGoals:
        "After graduating from KAIST, I plan to build digital supply-chain and micro-credit infrastructure for small agricultural producers across Uzbekistan and Central Asia.",
    },
    text: SOP_KAIST_TEXT,
    roles: ["hook", "evidence", "gap", "fit", "impact"],
  },
  {
    id: "sopLse",
    group: "sop",
    origin: "brief",
    degreeLevel: "Master",
    fields: {
      targetUni: "London School of Economics and Political Science (LSE)",
      targetProgram: "M.Sc. in Economic Policy for International Development",
      personalHook:
        "While evaluating textile SME credit applications in Namangan in 2025, I discovered that female-led rural enterprises had a 98.4% repayment rate yet received less than 14% of commercial green-transition loans due to rigid collateral valuation rules.",
      experienceExample:
        "As a Junior Policy Analyst at the Center for Economic Research and Reforms (CERR) in Tashkent, I constructed a panel dataset of 1,800 regional SMEs in Stata and R, demonstrating that cash-flow-based guarantees increased rural manufacturing output by 19%, a finding incorporated into the 2025 Regional Entrepreneurship Decree.",
      programEvidence:
        "LSE's coursework in Quantitative Policy Analysis (EC455) and Development Microeconometrics, combined with the STICERD research center's work on credit-market frictions in developing economies, provides the exact empirical methodology I need.",
      careerGoals:
        "Upon graduation, I will return to Uzbekistan's Ministry of Economy and Finance to design evidence-based green industrial financing instruments for Central Asian SMEs.",
    },
    text: SOP_LSE_TEXT,
    roles: ["hook", "evidence", "gap", "fit", "impact"],
  },
  {
    id: "sopWindsorAppliedComputingComposite",
    group: "sop",
    origin: "composite",
    sourceNote: "Fictional teaching composite based on the outline supplied in the request; the named PDF was not present in the workspace. Verify programme details and replace every personal fact.",
    sourceChecks: [{ url: "https://www.future.uwindsor.ca/program/master-of-applied-computing-mac-artificial-intelligence-stream/", checkedAt: "2026-10-22", note: "Official programme listing checked; individual course availability and current calendar must still be confirmed." }],
    degreeLevel: "Master",
    fields: {
      targetUni: "University of Windsor (illustrative target; verify current programme name)",
      targetProgram: "Master of Applied Computing (illustrative title; verify the current official catalogue)",
      personalHook: "A fictional B.E. Information Technology graduate wants to build secure, reliable software systems and has learned to connect coursework to practical projects.",
      experienceExample: "For practice only: describe a Personal Time Management App you actually built, the technical decisions you made, and evidence of testing or user feedback. Do not claim this placeholder project as your own.",
      programEvidence: "Use the current official curriculum to select relevant modules. The user-provided outline mentions Advanced Computing Concepts, Network & Data Security, and Advanced Systems Programming; verify whether these exact course titles are currently offered before naming them.",
      careerGoals: "Explain a specific, realistic role in your home-country IT sector and connect it to demonstrated skills. A ‘techno-functional computer engineer’ is only an illustrative role phrase, not a promised job or outcome.",
    },
    text: `Fictional practice statement — not a real applicant or admission record. Replace all claims with your own evidence.\n\nI became interested in applied computing while trying to make everyday planning less error-prone. For this fictional example, a Personal Time Management App is the starting point: the useful question is not simply how to build a calendar, but how to design a dependable system that protects user data, handles conflicting schedules, and remains understandable when plans change.\n\nMy imagined undergraduate preparation is a B.E. in Information Technology with a stated 7.07 CGPA and IELTS 7.0 overall. These are illustrative values taken from the supplied outline only; a real applicant must report the exact grading scale, official result, test date, and accepted-score rules.\n\nA graduate programme in Applied Computing would be a next step only if its current curriculum matches the applicant’s goals. The outline names Advanced Computing Concepts, Network and Data Security, and Advanced Systems Programming. Before using any course name, check the university’s current official calendar and explain the skill gap it addresses. A Personal Time Management App or a PHP workshop for junior learners can illustrate applied work only when the applicant actually completed it; describe the contribution, technical choices, and verifiable result rather than adopting this composite’s placeholder.\n\nThe academic statement should make a case to an admissions committee: preparation, intellectual direction, programme fit, and capacity to contribute to the learning community. It should not turn course titles into a list or promise a particular outcome.\n\nAfter graduation, this fictional applicant hopes to pursue a techno-functional computer-engineering role in the home-country IT sector, translating technical requirements between developers and users. A real study plan should connect a credible role to evidence about the home context and should not claim guaranteed employment or invent employer demand.`,
    roles: ["reflection", "hook", "evidence", "fit", "community", "impact"],
  },
];

// ===========================================================================
// 3.2 PERSONAL STATEMENT & SCHOLARSHIP ESSAYS — ESSAY_RUBRIC_SAMPLES
// ===========================================================================

const PS_ENGINEERING_TEXT = `On winter evenings in my grandfather's courtyard in Qarshi, the most important tool on his workbench was not his soldering iron, but a worn Russian-Uzbek technical dictionary. A retired rural school physics teacher, my grandfather repaired solar-powered water pumps and rechargeable lanterns for neighboring shepherds free of charge. When I was fourteen, a batch of imported charge controllers arrived with manuals printed only in English. Watching my grandfather squint at unfamiliar circuit diagrams, I volunteered to translate every schematic—and in the process, discovered how language, physics, and community service intersect.

At first, my translations were clumsy. I knew conversational English, but terms like pulse-width modulation and voltage hysteresis forced me to read introductory electrical-engineering articles late into the night. Whenever a translated step made sense, we tested it together on the workbench with a multimeter. By the end of that winter, we had compiled a 28-page illustrated Uzbek repair booklet for twelve common solar controllers. When local vocational-school students began borrowing our booklet to fix their own families' equipment, I realized that knowledge only reaches its full value when it is made accessible to the people who need it most.

That realization guided my years at the Academic Lyceum. While maintaining a 4.95/5.00 GPA and competing in national physics and informatics olympiads, I noticed that students from rural districts often struggled in regional STEM competitions not from a lack of talent, but because advanced problem sets and simulation software existed almost exclusively in English. In 2024, I launched "stem.uz-open," a student-led translation and interactive coding initiative. Recruiting fourteen bilingual classmates, we translated 150 algorithmic and physics modeling problems into Uzbek and built browser-based Python visualizers that ran offline on low-cost school computers.

The turning point came in March 2025, when we hosted a two-day workshop for 110 eighth- and ninth-grade students in rural Qashqadaryo. A ninth-grader named Marjona, who had never written a line of code before, used our kinematics visualizer to model projectile motion and won third place at the district physics tournament a month later. Seeing her confidence transform reminded me of my grandfather's workbench: engineering is not an abstract contest of equations, but a bridge between human potential and practical tools.

In university, I want to study Computer Engineering and Embedded Systems so I can design resilient, low-cost hardware and educational technologies for underserved regions. I bring with me the habits forged at my grandfather's repair table—patient troubleshooting, respect for resource constraints, and a conviction that the best engineering leaves no community behind.`;

const SCH_CHEVENING_TEXT = `Leadership and Influence:
In early 2024, municipal water utilities across three districts of the Bukhara region faced a 28% unaccounted water-loss rate due to unreported pipeline leaks and manual pressure logging. As a 23-year-old junior systems engineer, I had no formal authority over the senior field technicians, many of whom viewed digital monitoring tools as a threat to their jobs. Rather than mandating a top-down software rollout, I rode along with repair crews for three weeks to understand their daily frustrations. I learned that technicians spent two hours every evening filling out paper dispatch forms. Together, we co-designed a voice-to-text Telegram reporting bot in Uzbek that cut their evening paperwork to ten minutes while automatically geotagging pressure drops. Because the tool solved their pain point first, all 38 technicians adopted it voluntarily within a month. Over the next two quarters, leak-detection response times fell from 19 hours to 4.5 hours, saving an estimated 410,000 cubic meters of treated water annually.

Networking for Impact:
Solving cross-sector infrastructure challenges requires building coalitions across institutions that rarely communicate. In 2025, I initiated the Central Asia Young Water & Energy Engineers Forum in Tashkent, connecting 85 junior engineers from the Ministry of Water Resources, regional power utilities, and TUIT research labs. By pairing university data scientists with utility field engineers in a 48-hour open-data sprint, our network produced three open-source anomaly-detection scripts now used by two regional dispatch centers. As a scholarship recipient, I will actively connect researchers at UK clean-tech institutes with Central Asian utility practitioners through joint webinars and open benchmark datasets.

Studying in the UK & Career Plan:
The United Kingdom's world-leading expertise in smart-grid regulation and infrastructure digital twins makes the M.Sc. in Smart Energy and the Built Environment at University College London (UCL) my ideal programme. Modules in Energy Systems Modelling and Urban Water-Energy Nexus will equip me with the quantitative tools to optimize pump-storage scheduling alongside solar generation. Immediately upon returning to Uzbekistan, I will rejoin the Ministry of Energy and Water Resources Modernization Taskforce to lead the national rollout of automated telemetry across 120 municipal pumping stations, directly supporting Uzbekistan's 2030 goal of reducing utility energy and water losses by 30%.`;

const SCH_GKS_TEXT = `Motivation and Academic Preparation for GKS:
South Korea's transformation into a global semiconductor and smart-manufacturing powerhouse has long inspired my academic journey in electronics and software engineering. During my B.Sc. at Tashkent University of Information Technologies (GPA 4.88/5.00; IELTS 7.5; TOPIK Level 3), I participated in the KOICA–TUIT Joint IT Innovation Workshop in 2024, where Korean visiting professors introduced our team to edge-AI hardware accelerators. Inspired by that seminar, I led a four-student capstone project designing an FPGA-based defect-inspection camera for local textile looms in Tashkent. Our prototype detected fabric weave anomalies at 45 frames per second with 93.2% precision, winning the Best Engineering Capstone Award in 2025.

Goal of Study & Detailed Study Plan in Korea:
Through the Global Korea Scholarship (GKS), I aim to pursue an M.Sc. in Electrical and Electronic Engineering at Korea University (or KAIST), specializing in Low-Power Edge AI and System-on-Chip (SoC) Architecture.
• Language Year (Year 1): Having already achieved TOPIK Level 3 through self-study and courses at the Tashkent King Sejong Institute, I will dedicate my intensive Korean language year to reaching TOPIK Level 5, mastering technical Korean terminology for laboratory seminars and reading Korean industrial patent literature.
• Semester 1–2 (Core Coursework & Lab Rotation): I plan to take VLSI Digital Signal Processing, Hardware Acceleration for Deep Neural Networks, and Advanced Embedded Systems while joining the Integrated Circuits and Systems Lab to research INT4 model quantization for industrial IoT sensors.
• Semester 3–4 (Thesis Research & Publication): My Master's thesis will focus on designing a fault-tolerant neural-network inference architecture for high-temperature agricultural and textile machinery, targeting publication in IEEE Transactions on Circuits and Systems.

Future Plan After Graduation:
As Uzbekistan expands its bilateral industrial partnerships with South Korean technology leaders in semiconductor assembly, automotive electronics, and smart agriculture, there is an urgent need for bilingual engineers who understand both Korean R&D standards and Uzbekistan's industrial ecosystem. After completing my M.Sc. in Korea, I will return to Tashkent to serve as a Senior R&D Engineer at the Uzbekistan–Korea IT & Semiconductor Innovation Park and lecture part-time at TUIT, training the next generation of Uzbek hardware engineers.`;

// --- Authored: the brief named these four essays but did not include them. ---

const SCH_ELYURT_TEXT = `Our vaccine fridge failed in July 2023. By the time anyone read the paper temperature log, it had been warm for 9 hours: 340 doses of measles vaccine had spoiled and 90 children in our district had missed their scheduled dose. I was the duty physician that week, and one question stayed with me: why were we still guarding a life-saving fridge with pen and paper?

That experience moved me from treating patients to fixing systems. Over the next 18 months, I designed a simple monitoring routine for the 14 health posts in our district: a twelve-dollar digital thermometer in every fridge, readings sent by Telegram every 12 hours, and an alert to the head nurse whenever a fridge drifted outside 2–8°C. I trained 46 nurses to use it and merged three years of paper vaccination records into one register. As a result, on-time measles vaccination rose from 81 percent to 93 percent, and we have not lost a single dose since March 2024.

However, that success also showed me the limits of my training. I can run a district register, but I cannot yet design a national surveillance system, model which interventions protect the most children per som spent, or evaluate a programme with the rigour a ministry needs before it commits public money. My 2021 medical degree from Samarkand State Medical University prepared me to treat one patient at a time, not to read data from a whole population.

Therefore, I am applying to the Master of Public Health at Imperial College London, and I chose it for two reasons. First, its core training in epidemiology, statistics and health economics answers exactly the gaps my district work exposed. Second, Imperial's School of Public Health hosts the Vaccine Impact Modelling Consortium, whose estimates of what immunisation programmes achieve are the kind of evidence I want to produce for Uzbekistan. I hope to write my dissertation on cold-chain failures and missed doses in Central Asia.

In addition, I will bring field experience to my cohort. I have kept a cold chain running at 14 health posts, and I will share our open-source Telegram alert scripts and nurse training checklists with classmates who are building similar systems in other countries.

Finally, I accept the El-yurt umidi Foundation's condition that master's graduates work in Uzbekistan for three years; it matches my own plan. I will return to the Samarkand regional health department to lead the rollout of digital cold-chain monitoring across its 230 health facilities, and my long-term goal is a national immunisation register that alerts a nurse before a child misses a dose. My salary as a district physician would not cover one term at Imperial. This scholarship is the only route to the training, and I intend to repay it in children protected.`;

const SCH_DAAD_TEXT = `Our grid was never built to receive power. In the summer of 2025, 37 of the 412 low-voltage feeders I monitor for a regional electricity company in Samarkand exceeded the voltage limit at midday, because new rooftop panels pushed electricity back into transformers installed in the 1980s. Inverters shut down for up to 3 hours on the sunniest afternoons.

This work started with a spreadsheet. Using smart-meter data from 2,600 households, I built a Python model of each feeder and tested three fixes: retuning transformer taps, limiting export at the inverter, and moving irrigation pumps to midday. Retuning taps alone solved 21 feeders at almost no cost. For the other 16, I designed an export-curtailment rule with our protection engineers. As a result, inverter shutdown complaints fell by 64 percent within 2 months, and the company adopted the rule for all 1,900 feeders in the region.

However, curtailment wastes clean energy, and our planning tools still assume that power flows in one direction. To plan storage, demand response and solar together, I need rigorous training in power-system modelling, energy economics and grid integration, which my 2022 electrical engineering degree covered only at an introductory level. I can measure the problem in our data; I cannot yet design the system that removes it.

Therefore, I am applying to the M.Sc. in Renewable Energy Engineering and Management at the University of Freiburg. I chose it because it joins engineering with energy economics and policy in one curriculum, which mirrors the decisions our company faces every week. Freiburg is also home to the Fraunhofer Institute for Solar Energy Systems (ISE), whose research on integrating photovoltaics into distribution grids is directly relevant to my thesis plan on voltage control for high-solar feeders.

In addition, I will share what I learn while I am still abroad. I already run a monthly workshop for 25 young engineers at our company, and I will publish my feeder-modelling notebooks in Uzbek so that other regional distribution companies can repeat our analysis without paying for commercial software.

Finally, the DAAD scholarship is what makes this plan possible. My annual salary is about 4,800 USD, so a year of living costs in Freiburg is beyond my family's means without support. After graduation, I will return to Samarkand as a grid-integration engineer at my company, and my goal is to connect 300 megawatts of rooftop and commercial solar in our region by 2032 without forcing a single inverter offline.`;

const WHY_NUS_TEXT = `I built BozorLedger beside its users. For 4 months I interviewed 30 vendors at Tashkent's Chorsu Bazaar, and the Telegram app that grew out of those conversations now guides restocking for 64 of them, cutting perishable spoilage by 27 percent.

That project taught me to design with the people who will use the software, and I am drawn to NUS Computing because it is built around the same habit. Its Computing for Voluntary Welfare Organisations programme puts students on real systems for real charities, and I want to spend my first summer building software that someone opens the next morning.

In addition, the curriculum fills the gaps BozorLedger exposed. When my credit-scoring prototype failed under sudden price swings, I learned that intuition is not a substitute for theory. CS2040 and CS3230 will give me the algorithms foundation I lack, and through the Undergraduate Research Opportunities Programme I hope to join research on decision-making under uncertainty in my second year.

Finally, NUS Overseas Colleges would let me spend up to a year inside a start-up abroad before I graduate. After graduation, I plan to return to Uzbekistan and build supply-chain and micro-lending software for small producers; my goal is to make BozorLedger's approach work for 10,000 merchants, not 64.`;

const SUPP_EVIDENCE_TEXT = `My first hypothesis was wrong. In 2024, I assumed that rural women defaulted more often because their workshops were smaller, and I spent 2 weeks building a model to prove it. The data said the opposite: across 1,800 loans, female-led workshops repaid 98.4 percent of the time, three points above the regional average.

As a result, I changed both my question and my method. Instead of asking why women default, I asked why lenders treat them as risky. I analyzed 42,000 loan records and matched comparable firms with propensity scores. The results showed that collateral rules, not repayment behaviour, explained the gap: banks valued rural property at 40 percent of its urban equivalent.

Building on that, I presented the evidence to three commercial banks and to the Inter-Ministerial Working Group. Two banks now accept cash-flow verification instead of real-estate collateral for verified exporters, and approvals for rural women entrepreneurs rose by 31 percent within 12 months, while repayment stayed above 98 percent.

This work taught me to treat my first idea as a hypothesis, not a conclusion. I want to sharpen that habit with the causal-inference training of LSE's M.Sc. in Economic Policy for International Development, and my goal is to design credit policies that are tested before they are scaled.`;

const SOP_WINDSOR_RUBRIC_SOURCE = SOP_SAMPLES.find(
  (sample) => sample.id === "sopWindsorAppliedComputingComposite",
)!;

export const ESSAY_RUBRIC_SAMPLES: EssaySample[] = [
  {
    id: "essaySopTum",
    group: "essay",
    origin: "brief",
    essayType: "sop",
    targetName: "Technical University of Munich (TUM)",
    wordLimit: 800,
    prompt: "",
    text: SOP_TUM_TEXT,
    roles: ["hook", "evidence", "gap", "fit", "community", "impact"],
  },
  {
    id: "essaySopKaist",
    group: "essay",
    origin: "brief",
    essayType: "sop",
    targetName: "Korea Advanced Institute of Science and Technology (KAIST)",
    wordLimit: 650,
    prompt: "",
    text: SOP_KAIST_TEXT,
    roles: ["hook", "evidence", "gap", "fit", "impact"],
  },
  {
    id: "essaySopLse",
    group: "essay",
    origin: "brief",
    essayType: "sop",
    targetName: "London School of Economics and Political Science (LSE)",
    wordLimit: 800,
    prompt: "",
    text: SOP_LSE_TEXT,
    roles: ["hook", "evidence", "gap", "fit", "impact"],
  },
  {
    id: "essayPersonalStatement",
    group: "essay",
    origin: "brief",
    essayType: "personal_statement",
    // A personal statement goes to every college, so no single target is named.
    targetName: "",
    wordLimit: 650,
    prompt: "",
    text: PS_ENGINEERING_TEXT,
    roles: ["hook", "reflection", "community", "reflection", "impact"],
  },
  {
    id: "essayChevening",
    group: "essay",
    origin: "brief",
    essayType: "scholarship",
    targetName: "University College London (UCL)",
    wordLimit: 900,
    prompt: "",
    text: SCH_CHEVENING_TEXT,
    roles: ["leadership", "networking", "impact"],
  },
  {
    id: "essayGks",
    group: "essay",
    origin: "brief",
    essayType: "scholarship",
    targetName: "Global Korea Scholarship (GKS)",
    wordLimit: 800,
    prompt: "",
    text: SCH_GKS_TEXT,
    roles: ["preparation", "studyPlan", "impact"],
  },
  {
    id: "essayElYurtUmidi",
    group: "essay",
    origin: "authored",
    essayType: "scholarship",
    targetName: "El-yurt umidi Foundation",
    wordLimit: 600,
    prompt:
      "Explain why you are applying for this scholarship, how your experience prepares you for the programme, and how you will contribute to Uzbekistan after graduation.",
    text: SCH_ELYURT_TEXT,
    roles: ["hook", "evidence", "gap", "fit", "community", "impact"],
  },
  {
    id: "essayDaad",
    group: "essay",
    origin: "authored",
    essayType: "scholarship",
    targetName: "DAAD / University of Freiburg",
    wordLimit: 600,
    prompt:
      "Describe your academic and professional reasons for the planned studies, why you chose this programme in Germany, and your plans after returning home.",
    text: SCH_DAAD_TEXT,
    roles: ["hook", "evidence", "gap", "fit", "community", "impact"],
  },
  {
    id: "essayWhyNus",
    group: "essay",
    origin: "authored",
    essayType: "why_us",
    targetName: "National University of Singapore (NUS)",
    wordLimit: 300,
    prompt: "Why are you interested in studying Computer Science at NUS, and what do you plan to do after graduation?",
    text: WHY_NUS_TEXT,
    roles: ["hook", "fit", "fit", "impact"],
  },
  {
    id: "essaySupplementalEvidence",
    group: "essay",
    origin: "authored",
    essayType: "supplemental",
    targetName: "London School of Economics (LSE)",
    wordLimit: 300,
    prompt: "Describe a time when evidence changed your mind. What did you do next?",
    text: SUPP_EVIDENCE_TEXT,
    roles: ["hook", "evidence", "evidence", "reflection"],
  },
  {
    id: "essayTrianglePianissimoComposite",
    group: "essay",
    origin: "composite",
    sourceNote: "Fictional composite inspired by application-writing structures in the supplied outline; it is not a verified Harvard applicant, admitted student, or real personal statement.",
    sourceChecks: [
      { url: "https://music.fas.harvard.edu/about", checkedAt: "2026-10-22", note: "Official Music concentration overview; check current offerings." },
      { url: "https://projects.iq.harvard.edu/epl/people/samuel-mehr", checkedAt: "2026-10-22", note: "Harvard source identifies Samuel Mehr as Music Lab director; no specific undergraduate research access is promised." },
      { url: "https://gsas.harvard.edu/policy/mind-brain-and-behavior", checkedAt: "2026-10-22", note: "Official MBB programme information; participation/eligibility details require checking." },
    ],
    essayType: "personal_statement",
    targetName: "",
    wordLimit: null,
    prompt: "Practice prompt: share an experience that reveals how you think, learn, or contribute. Check each college's current prompt and limit.",
    text: `At Interlochen, five identical pianissimo notes on a bronze triangle sounded different to me. The first seemed to hover; the last left a thin shimmer in the room. I had been asked to repeat the same motion, but listening closely turned repetition into a question: what changes when the instrument, the room, or the listener changes?\n\nI used to think my interests needed separate shelves. In jazz and mariachi, I liked the moment when a melody bent away from expectation. In music theory, I liked the certainty of a V–I cadence: tension, then resolution. At home, I drew clock hands on a TI-Nspire and tested equations against the time on the kitchen wall. Reading Feynman on light gave me another language for asking how a wave can be both measurable and felt. None of these pursuits made the others less rigorous; each gave me a different way to notice patterns.\n\nThat lesson became practical when I moved from classical percussion, where the page tells me what comes next, to armonía in a mariachi ensemble. A vocalist might change keys in the middle of a song. I could not wait for a marked note. I listened for the bass, watched the singer breathe, and adjusted my part while the music continued. My first attempts were late. Rehearsal taught me to hear relationships, not just isolated notes.\n\nI began treating other unfamiliar subjects the same way. A folder of Japanese marimba music led me beyond short kana tutorials into a longer routine of listening, reading, and asking what the score assumed I already knew. I later helped lead bilingual school tours, where I learned to explain a room or an instrument differently depending on the visitor’s questions. Curiosity became less like collecting facts and more like building a bridge between two ways of understanding.\n\nI still return to the triangle’s five quiet notes. Precision gives me a way to repeat an experiment; imagination helps me notice when the same result is not the whole story. I want to keep studying where music, cognition, and psychology meet, while remembering that any claim about a programme, faculty member, or research opportunity must be checked against current official sources. The most useful question is often the one that lets two disciplines listen to each other.`,
    roles: ["hook", "evidence", "evidence", "reflection", "impact"],
  },
  {
    id: "essaySopWindsorAppliedComputingComposite",
    group: "essay",
    origin: "composite",
    sourceNote: SOP_WINDSOR_RUBRIC_SOURCE.sourceNote ?? "Fictional teaching composite; replace every personal fact and verify the official programme before use.",
    sourceChecks: SOP_WINDSOR_RUBRIC_SOURCE.sourceChecks ?? [],
    essayType: "sop",
    targetName: SOP_WINDSOR_RUBRIC_SOURCE.fields.targetProgram,
    wordLimit: null,
    prompt: "",
    text: SOP_WINDSOR_RUBRIC_SOURCE.text,
    roles: SOP_WINDSOR_RUBRIC_SOURCE.roles,
  },
];

// Dated expansion from the uploaded report's discipline/coverage requirements.
// These ORIGINAL FICTIONAL teaching mini-essays are NOT admitted applicants'
// real submissions. The upload supplied only the existing 12 distinct essays;
// its headline count is not evidence of 48 source texts or admission outcomes.
const PRACTICE_ESSAY_ADDITIONS: EssaySample[] = [
  {
    "id": "essayPractice01",
    "group": "essay",
    "origin": "composite",
    "sourceNote": "Original fictional teaching composite authored for the 2026-11-02 coverage expansion, not a real admitted essay or an applicant outcome. The uploaded report supplies coverage requirements, not this applicant story. Replace every experience with your own; practice prompt and word limit are not official.",
    "essayType": "supplemental",
    "targetName": "",
    "wordLimit": 300,
    "prompt": "Practice prompt: Offline clinic queue. Describe a specific experience, your response, and what changed in your thinking.",
    "text": "The clinic receptionist kept two notebooks: one for appointments and another for the times our booking application stopped working. I had designed the application around a reliable internet connection that the clinic did not have. Watching her copy names between books showed me that a technically correct system could still create extra work.\n\nI rebuilt the prototype around a local queue and made synchronization an explicit action. Across twelve simulated outages, my teammate and I checked whether each appointment appeared exactly once after reconnection. We found duplicate identifiers in three cases. Fixing those cases mattered more than adding another screen.\n\nI want to study computer science to understand the guarantees behind distributed systems, not merely their interfaces. The receptionist's second notebook remains my design test: if users need an invisible backup process, I have not yet understood their problem.",
    "roles": [
      "hook",
      "evidence",
      "reflection"
    ]
  },
  {
    "id": "essayPractice02",
    "group": "essay",
    "origin": "composite",
    "sourceNote": "Original fictional teaching composite authored for the 2026-11-02 coverage expansion, not a real admitted essay or an applicant outcome. The uploaded report supplies coverage requirements, not this applicant story. Replace every experience with your own; practice prompt and word limit are not official.",
    "essayType": "supplemental",
    "targetName": "",
    "wordLimit": 300,
    "prompt": "Practice prompt: An OCR model that could abstain. Describe a specific experience, your response, and what changed in your thinking.",
    "text": "My handwriting recognizer read a faded medicine label as a different word with high confidence. The demonstration had looked impressive until my classmate asked what would happen if someone trusted that answer. I stopped presenting accuracy as the only measure of a useful model.\n\nFor a school project, I separated the test pages by writer rather than randomly dividing individual lines. Accuracy fell, revealing that the original evaluation rewarded familiar handwriting. I added an uncertain-output category and manually inspected the rejected cases. Those decisions made the demonstration less dramatic but the evaluation more honest.\n\nMy next question is how uncertainty should reach the person using a model. I want to learn statistical learning and interface design together, so an abstention becomes useful information rather than an error quietly hidden from the user.",
    "roles": [
      "hook",
      "evidence",
      "reflection"
    ]
  },
  {
    "id": "essayPractice03",
    "group": "essay",
    "origin": "composite",
    "sourceNote": "Original fictional teaching composite authored for the 2026-11-02 coverage expansion, not a real admitted essay or an applicant outcome. The uploaded report supplies coverage requirements, not this applicant story. Replace every experience with your own; practice prompt and word limit are not official.",
    "essayType": "supplemental",
    "targetName": "",
    "wordLimit": 300,
    "prompt": "Practice prompt: Who could open our map?. Describe a specific experience, your response, and what changed in your thinking.",
    "text": "I proudly sent our school accessibility map to a friend who uses a screen reader. She could read the introduction but could not select a building. I had drawn every control as an unlabeled icon, then called the project inclusive because its subject was accessibility.\n\nWe tested one route together using only a keyboard. I added text labels, visible focus states and a plain-text route list, then asked her to repeat the task without my instructions. Her feedback changed the order of the page as much as its code. A map was not helpful if reaching its information was itself an obstacle.\n\nThat afternoon changed how I approach programming assignments. Accessibility is now part of my first prototype, not a final checklist. I want peers who challenge my assumptions early, particularly when a project claims to serve people whose daily experience differs from mine.",
    "roles": [
      "hook",
      "evidence",
      "reflection"
    ]
  },
  {
    "id": "essayPractice04",
    "group": "essay",
    "origin": "composite",
    "sourceNote": "Original fictional teaching composite authored for the 2026-11-02 coverage expansion, not a real admitted essay or an applicant outcome. The uploaded report supplies coverage requirements, not this applicant story. Replace every experience with your own; practice prompt and word limit are not official.",
    "essayType": "supplemental",
    "targetName": "",
    "wordLimit": 300,
    "prompt": "Practice prompt: The permission I did not need. Describe a specific experience, your response, and what changed in your thinking.",
    "text": "Our revision app asked students to upload contact lists so they could invite friends. When a younger student asked whether we could see her mother's phone number, I realized I could not justify collecting it. We had copied a common growth feature without asking whether it belonged in a school tool.\n\nI removed contact uploads and replaced them with invitation codes that expired after a week. My partner documented which information remained in the database and wrote a deletion test. We also rewrote the sign-up notice in ordinary language and asked three classmates to explain it back to us.\n\nThe experience drew me toward privacy engineering. I want to understand how data minimization can become a technical constraint rather than a vague promise. A successful product should not require users to surrender information that its central function never needed.",
    "roles": [
      "hook",
      "evidence",
      "reflection"
    ]
  },
  {
    "id": "essayPractice05",
    "group": "essay",
    "origin": "composite",
    "sourceNote": "Original fictional teaching composite authored for the 2026-11-02 coverage expansion, not a real admitted essay or an applicant outcome. The uploaded report supplies coverage requirements, not this applicant story. Replace every experience with your own; practice prompt and word limit are not official.",
    "essayType": "supplemental",
    "targetName": "",
    "wordLimit": 300,
    "prompt": "Practice prompt: A translation that asked a question. Describe a specific experience, your response, and what changed in your thinking.",
    "text": "My grandfather's irrigation notes used one Uzbek word for several different pieces of equipment. Our translation prototype confidently chose the same English term every time. The output was grammatical, but an engineer following it could have misunderstood which part needed repair.\n\nInstead of adding more fluent examples, I collected the surrounding sentences and asked two speakers to explain the intended object. Their disagreements became labels rather than mistakes to erase. We redesigned the prototype to request a short clarification when the context supported more than one meaning.\n\nI want to study language technology that makes room for this kind of uncertainty. Working with a language is also working with people who use words differently. Better assistance may sometimes mean asking a precise question instead of producing a confident sentence.",
    "roles": [
      "hook",
      "evidence",
      "reflection"
    ]
  },
  {
    "id": "essayPractice06",
    "group": "essay",
    "origin": "composite",
    "sourceNote": "Original fictional teaching composite authored for the 2026-11-02 coverage expansion, not a real admitted essay or an applicant outcome. The uploaded report supplies coverage requirements, not this applicant story. Replace every experience with your own; practice prompt and word limit are not official.",
    "essayType": "supplemental",
    "targetName": "",
    "wordLimit": 300,
    "prompt": "Practice prompt: The smallest useful robot. Describe a specific experience, your response, and what changed in your thinking.",
    "text": "Our robotics club planned a camera-equipped machine to sort donated books. The librarian asked a simpler question: could it move a stack without blocking the corridor? We had spent two meetings discussing classification before measuring the space where the machine would work.\n\nI built a cardboard mock-up and timed a manual trolley beside our motorized prototype. The trolley was faster for most trips. Our eventual contribution was a detachable brake and a height-adjustable handle, tested with the librarian rather than only with club members. We documented the situations where automation offered no advantage.\n\nEngineering became more interesting when I stopped treating complexity as evidence of quality. I still enjoy building robots, but I want to learn how to choose the smallest intervention that actually helps, even when the answer is not the machine I hoped to demonstrate.",
    "roles": [
      "hook",
      "evidence",
      "reflection"
    ]
  },
  {
    "id": "essayPractice07",
    "group": "essay",
    "origin": "composite",
    "sourceNote": "Original fictional teaching composite authored for the 2026-11-02 coverage expansion, not a real admitted essay or an applicant outcome. The uploaded report supplies coverage requirements, not this applicant story. Replace every experience with your own; practice prompt and word limit are not official.",
    "essayType": "supplemental",
    "targetName": "",
    "wordLimit": 300,
    "prompt": "Practice prompt: A denominator changed our headline. Describe a specific experience, your response, and what changed in your thinking.",
    "text": "Our survey headline said that most students wanted evening laboratory sessions. Then I noticed that we had distributed the form only in the laboratory's afternoon group. Students working evenings were almost absent from the sample, although the new schedule would affect them most.\n\nI withdrew the headline from our presentation and asked the student council to circulate a shorter survey across all year groups. We reported response counts by group and left unanswered questions visible. The overall preference became less decisive, but the reasons behind it became much clearer.\n\nI want to study data science because I enjoy this work before the model: defining the population, checking who is missing and making a conclusion proportionate to its evidence. A smaller claim that survives scrutiny is more useful than an impressive claim built on an invisible denominator.",
    "roles": [
      "hook",
      "evidence",
      "reflection"
    ]
  },
  {
    "id": "essayPractice08",
    "group": "essay",
    "origin": "composite",
    "sourceNote": "Original fictional teaching composite authored for the 2026-11-02 coverage expansion, not a real admitted essay or an applicant outcome. The uploaded report supplies coverage requirements, not this applicant story. Replace every experience with your own; practice prompt and word limit are not official.",
    "essayType": "supplemental",
    "targetName": "",
    "wordLimit": 300,
    "prompt": "Practice prompt: Forecasting beyond a random split. Describe a specific experience, your response, and what changed in your thinking.",
    "text": "My electricity-demand forecast performed unusually well during our class presentation. A teammate asked whether tomorrow's readings had indirectly influenced today's training examples. We had normalized the complete dataset before splitting it, allowing information from the test period into the model.\n\nI rebuilt the pipeline so each historical training window computed its own preprocessing parameters. We compared forecasts against a simple previous-day baseline and reported performance separately during holidays. The new result was weaker, but it represented the task we actually wanted to solve.\n\nThe revision taught me to value a reproducible evaluation more than a favorable chart. In further study, I want to learn time-series methods alongside the habits that make them credible: documenting every transformation and explaining when a basic baseline is difficult to beat.",
    "roles": [
      "hook",
      "evidence",
      "reflection"
    ]
  },
  {
    "id": "essayPractice09",
    "group": "essay",
    "origin": "composite",
    "sourceNote": "Original fictional teaching composite authored for the 2026-11-02 coverage expansion, not a real admitted essay or an applicant outcome. The uploaded report supplies coverage requirements, not this applicant story. Replace every experience with your own; practice prompt and word limit are not official.",
    "essayType": "supplemental",
    "targetName": "",
    "wordLimit": 300,
    "prompt": "Practice prompt: A hospital spreadsheet without names. Describe a specific experience, your response, and what changed in your thinking.",
    "text": "A volunteer coordinator offered me a spreadsheet for a waiting-time project. It contained patient names beside appointment times. I needed only durations and service categories, yet my first instinct had been to keep every column in case it became useful later.\n\nBefore beginning the analysis, I asked the coordinator to create a version without direct identifiers and to group rare service categories. I used invented records to test the cleaning code. Our report described patterns in waiting times without presenting individual cases or claiming to identify their causes.\n\nThis small project made data governance feel concrete. I want statistical training that treats privacy and interpretation as part of analysis, not as paperwork added afterward. Access to information is not a reason to use every piece of it.",
    "roles": [
      "hook",
      "evidence",
      "reflection"
    ]
  },
  {
    "id": "essayPractice10",
    "group": "essay",
    "origin": "composite",
    "sourceNote": "Original fictional teaching composite authored for the 2026-11-02 coverage expansion, not a real admitted essay or an applicant outcome. The uploaded report supplies coverage requirements, not this applicant story. Replace every experience with your own; practice prompt and word limit are not official.",
    "essayType": "supplemental",
    "targetName": "",
    "wordLimit": 300,
    "prompt": "Practice prompt: Counting the missing bus trips. Describe a specific experience, your response, and what changed in your thinking.",
    "text": "The transport dashboard showed shorter journeys after a timetable change. My own commute had become less predictable. When I examined the records, I found that cancelled trips had no arrival time and had disappeared from the average altogether.\n\nI separated completed trips, cancellations and missing observations. We plotted waiting time alongside travel time and explained the limitations of our small volunteer dataset. The revised chart no longer supported a simple success story, but it described what passengers were experiencing much more faithfully.\n\nI want to use data science in public services, where measurement choices affect which problems remain visible. This project taught me to ask what an empty cell means before deciding how to remove it. Sometimes the missing observations contain the central question.",
    "roles": [
      "hook",
      "evidence",
      "reflection"
    ]
  },
  {
    "id": "essayPractice11",
    "group": "essay",
    "origin": "composite",
    "sourceNote": "Original fictional teaching composite authored for the 2026-11-02 coverage expansion, not a real admitted essay or an applicant outcome. The uploaded report supplies coverage requirements, not this applicant story. Replace every experience with your own; practice prompt and word limit are not official.",
    "essayType": "supplemental",
    "targetName": "",
    "wordLimit": 300,
    "prompt": "Practice prompt: When a map revealed too much. Describe a specific experience, your response, and what changed in your thinking.",
    "text": "Our environmental club mapped household water use to identify leaks. A neighbor recognized a family's home from the public dots and began speculating about their habits. We had removed names but left exact locations, confusing anonymity with the absence of a name column.\n\nI took the map offline while we consulted the households. We published aggregated street-level patterns instead and excluded streets with too few participating homes. The analysis became less visually detailed, but participants could discuss leaks without exposing an individual family's routine.\n\nI now see visualization as a decision about disclosure as well as clarity. I want to learn how statistical summaries can protect people while still supporting local action. A useful map must answer the public question without revealing private details that the question never required.",
    "roles": [
      "hook",
      "evidence",
      "reflection"
    ]
  },
  {
    "id": "essayPractice12",
    "group": "essay",
    "origin": "composite",
    "sourceNote": "Original fictional teaching composite authored for the 2026-11-02 coverage expansion, not a real admitted essay or an applicant outcome. The uploaded report supplies coverage requirements, not this applicant story. Replace every experience with your own; practice prompt and word limit are not official.",
    "essayType": "supplemental",
    "targetName": "",
    "wordLimit": 300,
    "prompt": "Practice prompt: The model card nobody requested. Describe a specific experience, your response, and what changed in your thinking.",
    "text": "Our crop classifier won praise for its clean interface. During testing, a student uploaded a photograph taken at night and received a confident diagnosis. We had evaluated only daylight photographs, and nothing on the screen communicated that limitation.\n\nI wrote a short model card explaining the collection conditions, class imbalance and excluded uses. We added a warning for low-light images and tested whether classmates understood it. Several thought the warning guaranteed safety in daylight, so we revised the wording and included examples of remaining errors.\n\nCommunicating limits is harder than attaching a disclaimer. I want to study machine learning with that difficulty in view: not just how a model behaves on a test set, but how a person understands the boundaries of the evidence behind it.",
    "roles": [
      "hook",
      "evidence",
      "reflection"
    ]
  },
  {
    "id": "essayPractice13",
    "group": "essay",
    "origin": "composite",
    "sourceNote": "Original fictional teaching composite authored for the 2026-11-02 coverage expansion, not a real admitted essay or an applicant outcome. The uploaded report supplies coverage requirements, not this applicant story. Replace every experience with your own; practice prompt and word limit are not official.",
    "essayType": "supplemental",
    "targetName": "",
    "wordLimit": 300,
    "prompt": "Practice prompt: A profitable shop with no cash. Describe a specific experience, your response, and what changed in your thinking.",
    "text": "My aunt's repair shop appeared profitable in my spreadsheet, yet she regularly postponed buying spare parts. I had counted customer invoices as if the money had already arrived. Her difficulty was not explained by the profit total I had calculated.\n\nTogether we separated invoices, receipts and payments by week. I built a cash-flow calendar and checked it against the notebook she actually used. We stopped treating the calendar as a prediction and updated it whenever customers changed payment dates. It helped identify which purchases could wait without delaying repairs.\n\nI want to study finance to understand how accounting categories connect to everyday decisions. The spreadsheet mattered only after it represented my aunt's timing problem. Learning to ask the right question was more valuable than making the first calculation look professional.",
    "roles": [
      "hook",
      "evidence",
      "reflection"
    ]
  },
  {
    "id": "essayPractice14",
    "group": "essay",
    "origin": "composite",
    "sourceNote": "Original fictional teaching composite authored for the 2026-11-02 coverage expansion, not a real admitted essay or an applicant outcome. The uploaded report supplies coverage requirements, not this applicant story. Replace every experience with your own; practice prompt and word limit are not official.",
    "essayType": "supplemental",
    "targetName": "",
    "wordLimit": 300,
    "prompt": "Practice prompt: The promotion our customers disliked. Describe a specific experience, your response, and what changed in your thinking.",
    "text": "Our student enterprise offered discounts to first-time customers, and sales briefly increased. Returning customers complained that loyalty made them pay more. I had evaluated the promotion by counting new transactions while ignoring the relationship that made the enterprise possible.\n\nWe interviewed customers with their permission and tested a simpler pricing policy for the next school fair. Instead of announcing a universal solution, we recorded who preferred each option and why. The team chose transparent prices and a small loyalty benefit, accepting a narrower margin on some orders.\n\nBusiness interests me because decisions combine numbers with questions of fairness. I want to learn how to evaluate incentives without treating customer trust as an unlimited resource. A short-term sales increase is not automatically evidence of a better business.",
    "roles": [
      "hook",
      "evidence",
      "reflection"
    ]
  },
  {
    "id": "essayPractice15",
    "group": "essay",
    "origin": "composite",
    "sourceNote": "Original fictional teaching composite authored for the 2026-11-02 coverage expansion, not a real admitted essay or an applicant outcome. The uploaded report supplies coverage requirements, not this applicant story. Replace every experience with your own; practice prompt and word limit are not official.",
    "essayType": "supplemental",
    "targetName": "",
    "wordLimit": 300,
    "prompt": "Practice prompt: Leading without keeping every task. Describe a specific experience, your response, and what changed in your thinking.",
    "text": "As team leader for a school fundraiser, I rewrote every poster and approved every purchase. I called it quality control. When the printer broke on the morning of the event, nobody felt authorized to choose an alternative without asking me.\n\nAfterward, I invited each teammate to identify a decision they should have owned. For the next event, we agreed on budgets and responsibilities before designing anything. I kept a shared decision log rather than a private approval list. The result was not perfectly uniform, but the team could respond when plans changed.\n\nI learned that leadership includes making other people's judgment usable. In a business classroom, I want to bring both my organizational energy and a willingness to question it. A team that functions only when I supervise every detail is not yet a team I have led well.",
    "roles": [
      "hook",
      "evidence",
      "reflection"
    ]
  },
  {
    "id": "essayPractice16",
    "group": "essay",
    "origin": "composite",
    "sourceNote": "Original fictional teaching composite authored for the 2026-11-02 coverage expansion, not a real admitted essay or an applicant outcome. The uploaded report supplies coverage requirements, not this applicant story. Replace every experience with your own; practice prompt and word limit are not official.",
    "essayType": "supplemental",
    "targetName": "",
    "wordLimit": 300,
    "prompt": "Practice prompt: A lending rule we could explain. Describe a specific experience, your response, and what changed in your thinking.",
    "text": "For an economics project, we designed a fictional lending policy using a small public dataset. My first model rejected applicants from one area more often. Removing the area column did not resolve the pattern because other variables carried similar information.\n\nWe compared a simpler rule with the model and documented differences across groups. We did not claim that our classroom analysis established legal fairness or predicted real repayment. Instead, our presentation explained the trade-offs, missing information and reasons not to deploy the prototype.\n\nI want to study economics and quantitative methods with this distinction in mind. Demonstrating a pattern is not the same as justifying a decision about a person. The most responsible outcome of a student model may be a better question rather than a system ready for use.",
    "roles": [
      "hook",
      "evidence",
      "reflection"
    ]
  },
  {
    "id": "essayPractice17",
    "group": "essay",
    "origin": "composite",
    "sourceNote": "Original fictional teaching composite authored for the 2026-11-02 coverage expansion, not a real admitted essay or an applicant outcome. The uploaded report supplies coverage requirements, not this applicant story. Replace every experience with your own; practice prompt and word limit are not official.",
    "essayType": "supplemental",
    "targetName": "",
    "wordLimit": 300,
    "prompt": "Practice prompt: Negotiating the shared workshop. Describe a specific experience, your response, and what changed in your thinking.",
    "text": "The art and engineering clubs argued over a shared workshop. I proposed dividing the weekly hours equally, assuming that equal time would settle the disagreement. The artists needed long drying periods; the engineers needed supervised access to specific tools. Our units of demand were not actually the same.\n\nI asked both groups to describe their next projects before proposing another schedule. We separated storage, supervised machine time and ordinary desk access. A trial calendar made the trade-offs visible, and we agreed to revisit it after two weeks rather than pretend that one negotiation would settle every future conflict.\n\nI became interested in management through this unglamorous problem. Listening did not replace analysis; it told us what to analyze. I want to learn how organizations create workable agreements when people use the same resources for genuinely different purposes.",
    "roles": [
      "hook",
      "evidence",
      "reflection"
    ]
  },
  {
    "id": "essayPractice18",
    "group": "essay",
    "origin": "composite",
    "sourceNote": "Original fictional teaching composite authored for the 2026-11-02 coverage expansion, not a real admitted essay or an applicant outcome. The uploaded report supplies coverage requirements, not this applicant story. Replace every experience with your own; practice prompt and word limit are not official.",
    "essayType": "supplemental",
    "targetName": "",
    "wordLimit": 300,
    "prompt": "Practice prompt: A business plan with a stopping rule. Describe a specific experience, your response, and what changed in your thinking.",
    "text": "My pitch for reusable lunch containers assumed that classmates would return them promptly. During a small trial, several containers remained in lockers until the deposit no longer covered replacement costs. I wanted to expand anyway because the presentation had received enthusiastic feedback.\n\nA mentor asked us to write the conditions under which we would stop. We recorded return delays, washing costs and student concerns without changing the criteria after seeing the results. The trial failed our threshold, so we paused and tested a classroom collection system instead of purchasing more containers.\n\nI want to study entrepreneurship as disciplined learning rather than constant expansion. Defining a stopping rule made it easier to change direction without treating criticism as defeat. An idea deserves a fair test, not a guarantee that I will keep defending it.",
    "roles": [
      "hook",
      "evidence",
      "reflection"
    ]
  },
  {
    "id": "essayPractice19",
    "group": "essay",
    "origin": "composite",
    "sourceNote": "Original fictional teaching composite authored for the 2026-11-02 coverage expansion, not a real admitted essay or an applicant outcome. The uploaded report supplies coverage requirements, not this applicant story. Replace every experience with your own; practice prompt and word limit are not official.",
    "essayType": "supplemental",
    "targetName": "",
    "wordLimit": 300,
    "prompt": "Practice prompt: A bridge made for inspection. Describe a specific experience, your response, and what changed in your thinking.",
    "text": "Our model bridge held the required load, but its glued joints were hidden inside decorative panels. When a teacher asked how we would inspect damage after repeated loading, I realized that we had designed for a demonstration rather than for maintenance.\n\nWe built a second model with accessible connections and photographed each joint before and after testing. It carried slightly less weight at first, but we could identify the weak connection and repair it without dismantling the whole structure. Our report compared repair time as well as maximum load.\n\nCivil engineering appeals to me because a structure continues to demand care after its opening day. I want to learn how material choices and inspection access shape long-term reliability. A strong design must make its eventual weaknesses discoverable.",
    "roles": [
      "hook",
      "evidence",
      "reflection"
    ]
  },
  {
    "id": "essayPractice20",
    "group": "essay",
    "origin": "composite",
    "sourceNote": "Original fictional teaching composite authored for the 2026-11-02 coverage expansion, not a real admitted essay or an applicant outcome. The uploaded report supplies coverage requirements, not this applicant story. Replace every experience with your own; practice prompt and word limit are not official.",
    "essayType": "supplemental",
    "targetName": "",
    "wordLimit": 300,
    "prompt": "Practice prompt: Measuring the heat we lost. Describe a specific experience, your response, and what changed in your thinking.",
    "text": "I blamed our solar-water-heater prototype's poor output on cloudy weather. A classmate pointed to an uninsulated pipe that felt hot. We had measured the collector carefully and treated the rest of the system as if it could not affect the result.\n\nUsing the same volume of water and comparable starting temperatures, we tested different insulation arrangements and logged ambient conditions. Our small experiment could not establish performance across a season. It did show that improvements outside the collector could matter as much as changes to the component we found most exciting.\n\nI want to study mechanical engineering to reason about systems rather than isolated parts. This project taught me to follow energy through the entire setup and to report the conditions under which a result was measured.",
    "roles": [
      "hook",
      "evidence",
      "reflection"
    ]
  },
  {
    "id": "essayPractice21",
    "group": "essay",
    "origin": "composite",
    "sourceNote": "Original fictional teaching composite authored for the 2026-11-02 coverage expansion, not a real admitted essay or an applicant outcome. The uploaded report supplies coverage requirements, not this applicant story. Replace every experience with your own; practice prompt and word limit are not official.",
    "essayType": "supplemental",
    "targetName": "",
    "wordLimit": 300,
    "prompt": "Practice prompt: A drone flight we cancelled. Describe a specific experience, your response, and what changed in your thinking.",
    "text": "We had only one afternoon to film our school mapping project when the wind strengthened. I suggested making a quick flight before it became worse. The teammate responsible for the safety checklist refused, even though postponement meant missing the presentation deadline.\n\nWe cancelled the flight and presented our ground-based measurements instead. I explained the decision rather than hiding it as a technical failure. Later, we revised the project schedule to include a weather contingency and a clear rule that any team member could stop a test without arguing for permission.\n\nI want to work in aerospace engineering, where enthusiasm cannot substitute for a defensible test decision. The cancelled flight taught me more about engineering responsibility than a successful video would have. A deadline is a constraint to plan around, not a reason to ignore a safety boundary.",
    "roles": [
      "hook",
      "evidence",
      "reflection"
    ]
  },
  {
    "id": "essayPractice22",
    "group": "essay",
    "origin": "composite",
    "sourceNote": "Original fictional teaching composite authored for the 2026-11-02 coverage expansion, not a real admitted essay or an applicant outcome. The uploaded report supplies coverage requirements, not this applicant story. Replace every experience with your own; practice prompt and word limit are not official.",
    "essayType": "supplemental",
    "targetName": "",
    "wordLimit": 300,
    "prompt": "Practice prompt: The filter that changed the sample. Describe a specific experience, your response, and what changed in your thinking.",
    "text": "Our water-filter project produced visibly clearer water. I initially described this as evidence that it was safe to drink. A science teacher asked which contaminants we had actually measured. We had tested turbidity, not microbial safety, and the distinction changed our entire presentation.\n\nWe relabeled every graph, removed the drinking-water claim and described the equipment a proper safety evaluation would require. We also tested whether the filter released fine particles during its first use. The project became a study of one measurable property rather than an unsupported solution to a much larger problem.\n\nChemical engineering interests me because good explanations depend on precise boundaries. I want to learn how processes are validated before their outputs reach people. Clearer water was an observation; safe water was a conclusion our experiment had not earned.",
    "roles": [
      "hook",
      "evidence",
      "reflection"
    ]
  },
  {
    "id": "essayPractice23",
    "group": "essay",
    "origin": "composite",
    "sourceNote": "Original fictional teaching composite authored for the 2026-11-02 coverage expansion, not a real admitted essay or an applicant outcome. The uploaded report supplies coverage requirements, not this applicant story. Replace every experience with your own; practice prompt and word limit are not official.",
    "essayType": "supplemental",
    "targetName": "",
    "wordLimit": 300,
    "prompt": "Practice prompt: Repairing before replacing. Describe a specific experience, your response, and what changed in your thinking.",
    "text": "A broken cooling fan made our classroom projector overheat. My first proposal was to replace the entire unit. The school technician opened the housing and showed me a clogged intake and a connector that had loosened under vibration. The failure was smaller than the object it disabled.\n\nUnder supervision, I helped document cleaning and inspection steps without working on energized equipment. We created a maintenance log and a simple symptom checklist for staff. I learned to separate observations from guesses, especially when a confident diagnosis could lead someone to make an unsafe repair.\n\nI want engineering training that values maintainability and documentation alongside invention. Working with the technician showed me that technical knowledge becomes useful when another person can follow it safely. A repair is not complete when only its author understands what changed.",
    "roles": [
      "hook",
      "evidence",
      "reflection"
    ]
  },
  {
    "id": "essayPractice24",
    "group": "essay",
    "origin": "composite",
    "sourceNote": "Original fictional teaching composite authored for the 2026-11-02 coverage expansion, not a real admitted essay or an applicant outcome. The uploaded report supplies coverage requirements, not this applicant story. Replace every experience with your own; practice prompt and word limit are not official.",
    "essayType": "supplemental",
    "targetName": "",
    "wordLimit": 300,
    "prompt": "Practice prompt: The pavement after the rain. Describe a specific experience, your response, and what changed in your thinking.",
    "text": "The new pavement outside our school looked level until rainwater pooled across the crossing. For a design assignment, I had drawn the route from above and ignored the small height changes that determined where water would go. The person pushing a stroller noticed the problem immediately.\n\nWith permission, our group measured the slope using a simple level and photographed the same locations after several showers. We submitted observations rather than a construction prescription, explaining that drainage changes required qualified assessment. The caretaker used our record to describe the problem to the maintenance team.\n\nEnvironmental and civil engineering attract me because ordinary infrastructure shapes who can move comfortably through a place. I want to learn the technical methods behind those details while continuing to ask the people using a route what my drawing has failed to show.",
    "roles": [
      "hook",
      "evidence",
      "reflection"
    ]
  },
  {
    "id": "essayPractice25",
    "group": "essay",
    "origin": "composite",
    "sourceNote": "Original fictional teaching composite authored for the 2026-11-02 coverage expansion, not a real admitted essay or an applicant outcome. The uploaded report supplies coverage requirements, not this applicant story. Replace every experience with your own; practice prompt and word limit are not official.",
    "essayType": "supplemental",
    "targetName": "",
    "wordLimit": 300,
    "prompt": "Practice prompt: An experiment with a negative result. Describe a specific experience, your response, and what changed in your thinking.",
    "text": "Our biology club expected seedlings exposed to one treatment to grow faster. They did not. I suggested removing two weak plants from the chart, arguing that they probably had unrelated problems. A teammate asked whether I would exclude them if they supported our prediction.\n\nWe kept the observations and documented the uneven light near the window. In a second trial, we assigned positions before treatment and recorded the exclusion rules in advance. The result remained uncertain, but we could explain how the experimental design had improved and what our sample could not establish.\n\nI want to study biology because explanations should survive results we did not hope to see. Learning to report a negative result without disguising it was my first practical lesson in research integrity. The question became more interesting after the easy answer disappeared.",
    "roles": [
      "hook",
      "evidence",
      "reflection"
    ]
  },
  {
    "id": "essayPractice26",
    "group": "essay",
    "origin": "composite",
    "sourceNote": "Original fictional teaching composite authored for the 2026-11-02 coverage expansion, not a real admitted essay or an applicant outcome. The uploaded report supplies coverage requirements, not this applicant story. Replace every experience with your own; practice prompt and word limit are not official.",
    "essayType": "supplemental",
    "targetName": "",
    "wordLimit": 300,
    "prompt": "Practice prompt: Consent before a questionnaire. Describe a specific experience, your response, and what changed in your thinking.",
    "text": "I wrote a student wellbeing survey with questions that seemed harmless to me. A counselor asked what would happen if a classmate disclosed something distressing. I had planned the charts but not the responsibility created by collecting sensitive answers.\n\nWe stopped the original survey and worked with the counselor on an anonymous, non-diagnostic feedback form about school resources. Participation was optional, and students could skip questions. I used invented data to practice analysis instead of asking classmates to provide information merely so I could complete a project.\n\nPublic health interests me because the methods of gathering evidence affect the people that evidence is meant to help. I want training that treats consent, referral and data protection as central design decisions. A useful research question does not automatically justify every way of asking it.",
    "roles": [
      "hook",
      "evidence",
      "reflection"
    ]
  },
  {
    "id": "essayPractice27",
    "group": "essay",
    "origin": "composite",
    "sourceNote": "Original fictional teaching composite authored for the 2026-11-02 coverage expansion, not a real admitted essay or an applicant outcome. The uploaded report supplies coverage requirements, not this applicant story. Replace every experience with your own; practice prompt and word limit are not official.",
    "essayType": "supplemental",
    "targetName": "",
    "wordLimit": 300,
    "prompt": "Practice prompt: The petri dish outside the frame. Describe a specific experience, your response, and what changed in your thinking.",
    "text": "Our poster showed the clearest photograph from a school microbiology demonstration. The image suggested a consistency that the other plates did not show. When I placed all the photographs together, the differences were harder to explain than the single image had implied.\n\nUnder our teacher's supervision, we compared the observation dates and handling records. We replaced the showcase photograph with a labeled series and limited our claims to the supervised classroom conditions. We did not attempt to identify organisms or offer medical conclusions from appearance alone.\n\nBiotechnology draws me toward the connection between careful technique and careful communication. I want to become the kind of researcher who checks what lies outside a convincing image before presenting it. The unselected observations belong to the evidence too.",
    "roles": [
      "hook",
      "evidence",
      "reflection"
    ]
  },
  {
    "id": "essayPractice28",
    "group": "essay",
    "origin": "composite",
    "sourceNote": "Original fictional teaching composite authored for the 2026-11-02 coverage expansion, not a real admitted essay or an applicant outcome. The uploaded report supplies coverage requirements, not this applicant story. Replace every experience with your own; practice prompt and word limit are not official.",
    "essayType": "supplemental",
    "targetName": "",
    "wordLimit": 300,
    "prompt": "Practice prompt: Explaining risk without a promise. Describe a specific experience, your response, and what changed in your thinking.",
    "text": "During a health-awareness project, I copied a relative-risk reduction into a poster. A volunteer asked how many people would benefit in a group the size of our school. I could not answer because I had omitted the baseline risk and the population studied.\n\nI returned to the source with a teacher and rewrote the example using absolute numbers and a clearly defined hypothetical group. We removed language that sounded like individual medical advice. When classmates explained the poster back to us, their questions showed which parts still sounded more certain than the evidence allowed.\n\nI want to study quantitative biology and health communication together. Numbers can clarify a decision or make uncertainty disappear behind a large percentage. My responsibility is to preserve the context that lets another person understand what a number can and cannot promise.",
    "roles": [
      "hook",
      "evidence",
      "reflection"
    ]
  },
  {
    "id": "essayPractice29",
    "group": "essay",
    "origin": "composite",
    "sourceNote": "Original fictional teaching composite authored for the 2026-11-02 coverage expansion, not a real admitted essay or an applicant outcome. The uploaded report supplies coverage requirements, not this applicant story. Replace every experience with your own; practice prompt and word limit are not official.",
    "essayType": "supplemental",
    "targetName": "",
    "wordLimit": 300,
    "prompt": "Practice prompt: Translating a housing rule. Describe a specific experience, your response, and what changed in your thinking.",
    "text": "A family at our community center asked me to translate a housing notice. I understood the everyday words but not the legal effect of one deadline. I nearly replaced it with a familiar phrase, which would have made the translation smoother and potentially misleading.\n\nI marked the uncertain passage and asked the coordinator to seek qualified advice. We kept the original beside the translation and explained which parts were language help rather than legal interpretation. I also made a glossary of recurring terms, with notes directing volunteers to check each notice rather than reuse an old deadline.\n\nThe experience shaped my interest in public policy and access to institutions. Clear communication matters, but clarity cannot come from hiding uncertainty. I want to study how services help people act on rules without pretending that a volunteer translation replaces professional advice.",
    "roles": [
      "hook",
      "evidence",
      "reflection"
    ]
  },
  {
    "id": "essayPractice30",
    "group": "essay",
    "origin": "composite",
    "sourceNote": "Original fictional teaching composite authored for the 2026-11-02 coverage expansion, not a real admitted essay or an applicant outcome. The uploaded report supplies coverage requirements, not this applicant story. Replace every experience with your own; practice prompt and word limit are not official.",
    "essayType": "supplemental",
    "targetName": "",
    "wordLimit": 300,
    "prompt": "Practice prompt: A debate with a listening round. Describe a specific experience, your response, and what changed in your thinking.",
    "text": "I entered our school debate about transport expecting to defend my position more effectively than the other side. One student explained that an earlier bus would make her miss a family responsibility. Her concern did not fit the categories in my prepared argument.\n\nFor the next discussion, we introduced a listening round in which each speaker summarized the previous person's concern before responding. It slowed the debate and exposed several disagreements about facts that we had treated as disagreements about values. We recorded both instead of forcing a unanimous conclusion.\n\nI want to study international relations because negotiation requires more than fluent advocacy. The listening round taught me to distinguish understanding an objection from conceding every point. A workable agreement begins with an accurate account of what people are actually trying to protect.",
    "roles": [
      "hook",
      "evidence",
      "reflection"
    ]
  },
  {
    "id": "essayPractice31",
    "group": "essay",
    "origin": "composite",
    "sourceNote": "Original fictional teaching composite authored for the 2026-11-02 coverage expansion, not a real admitted essay or an applicant outcome. The uploaded report supplies coverage requirements, not this applicant story. Replace every experience with your own; practice prompt and word limit are not official.",
    "essayType": "supplemental",
    "targetName": "",
    "wordLimit": 300,
    "prompt": "Practice prompt: The archive with two dates. Describe a specific experience, your response, and what changed in your thinking.",
    "text": "Two photographs in our local-history archive carried different dates for the same event. I wanted to choose the one that matched our exhibition narrative. The librarian asked me to preserve both labels until we knew how each date had been recorded.\n\nWe checked the reverse of the prints, compared newspaper references and recorded which details came from memory rather than contemporary documents. We could narrow the possibilities but not resolve the conflict. The exhibition caption included that uncertainty and invited visitors to contribute further evidence with its source.\n\nHistory appeals to me because interpretation is strengthened, not weakened, by showing the work behind a claim. I want to learn how to build arguments that distinguish a plausible account from a documented fact. An unresolved date can teach visitors how historical knowledge is made.",
    "roles": [
      "hook",
      "evidence",
      "reflection"
    ]
  },
  {
    "id": "essayPractice32",
    "group": "essay",
    "origin": "composite",
    "sourceNote": "Original fictional teaching composite authored for the 2026-11-02 coverage expansion, not a real admitted essay or an applicant outcome. The uploaded report supplies coverage requirements, not this applicant story. Replace every experience with your own; practice prompt and word limit are not official.",
    "essayType": "supplemental",
    "targetName": "",
    "wordLimit": 300,
    "prompt": "Practice prompt: Measuring a tutoring partnership. Describe a specific experience, your response, and what changed in your thinking.",
    "text": "Our volunteer group celebrated the number of tutoring sessions delivered. A younger student quietly told me that changing tutors every week made it difficult to ask questions. We were measuring our activity, not the continuity that made the activity useful.\n\nI helped reorganize the schedule around consistent pairs and asked students which arrangements they preferred. We tracked attendance and feedback without promising that a small program could prove an effect on examination results. When a volunteer left, the written handover made the transition less abrupt.\n\nI want to study education policy because implementation details determine whether a generous intention becomes dependable support. The partnership taught me to ask whose definition of success our dashboard represented. More sessions were not necessarily better sessions.",
    "roles": [
      "hook",
      "evidence",
      "reflection"
    ]
  },
  {
    "id": "essayPractice33",
    "group": "essay",
    "origin": "composite",
    "sourceNote": "Original fictional teaching composite authored for the 2026-11-02 coverage expansion, not a real admitted essay or an applicant outcome. The uploaded report supplies coverage requirements, not this applicant story. Replace every experience with your own; practice prompt and word limit are not official.",
    "essayType": "supplemental",
    "targetName": "",
    "wordLimit": 300,
    "prompt": "Practice prompt: A courtyard designed at noon. Describe a specific experience, your response, and what changed in your thinking.",
    "text": "My courtyard design looked balanced in the rendering. At noon, a cardboard model cast almost no shade over the seating I had placed along its center. I had chosen the arrangement for the photograph rather than for the people who would sit there in summer.\n\nI tested several layouts at different light angles and asked classmates where they would actually stop between lessons. Their answers included wheelchair access, supervision and quiet conversation, none of which my first drawing had represented. I documented the trade-offs instead of presenting a single layout as universally best.\n\nArchitecture interests me because a drawing must eventually answer to bodies, weather and routines. I want to learn how to test spatial ideas with the people who use them. Beauty matters more to me when it grows from an honest account of inhabiting a place.",
    "roles": [
      "hook",
      "evidence",
      "reflection"
    ]
  },
  {
    "id": "essayPractice34",
    "group": "essay",
    "origin": "composite",
    "sourceNote": "Original fictional teaching composite authored for the 2026-11-02 coverage expansion, not a real admitted essay or an applicant outcome. The uploaded report supplies coverage requirements, not this applicant story. Replace every experience with your own; practice prompt and word limit are not official.",
    "essayType": "supplemental",
    "targetName": "",
    "wordLimit": 300,
    "prompt": "Practice prompt: The poster nobody could read. Describe a specific experience, your response, and what changed in your thinking.",
    "text": "I used narrow lettering and pale gray text for our exhibition poster because it looked restrained on my laptop. On the school noticeboard, the date disappeared. A classmate photographed it and enlarged the image simply to discover when the event began.\n\nI printed alternatives at their actual size and tested them from the distance at which people passed the board. We increased contrast, simplified the hierarchy and separated the event information from the artist statement. The revised design looked less delicate on screen and worked much better in its real setting.\n\nI want to study visual communication as an encounter rather than a static image. Typography is not only a style choice; it determines who can receive an invitation. Testing the poster changed my understanding of what a designer owes an audience.",
    "roles": [
      "hook",
      "evidence",
      "reflection"
    ]
  },
  {
    "id": "essayPractice35",
    "group": "essay",
    "origin": "composite",
    "sourceNote": "Original fictional teaching composite authored for the 2026-11-02 coverage expansion, not a real admitted essay or an applicant outcome. The uploaded report supplies coverage requirements, not this applicant story. Replace every experience with your own; practice prompt and word limit are not official.",
    "essayType": "supplemental",
    "targetName": "",
    "wordLimit": 300,
    "prompt": "Practice prompt: The sound between rehearsals. Describe a specific experience, your response, and what changed in your thinking.",
    "text": "I edited a short film about our neighborhood using only clean interview clips. Watching it, my friend said that it could have been recorded anywhere. I had removed the market shutters, footsteps and pauses that located the speakers in an actual place.\n\nWith participants' permission, I returned to record ambient sound and asked which details they wanted represented. I kept an editing log separating recorded sound from material arranged later. The new cut gave quieter moments room without pretending that an edited sequence was an untouched account of events.\n\nFilm interests me because selection creates meaning even when every individual shot is authentic. I want to develop a practice that makes deliberate choices while respecting the people represented. Listening between rehearsed answers taught me to notice what my first version had erased.",
    "roles": [
      "hook",
      "evidence",
      "reflection"
    ]
  },
  {
    "id": "essayPractice36",
    "group": "essay",
    "origin": "composite",
    "sourceNote": "Original fictional teaching composite authored for the 2026-11-02 coverage expansion, not a real admitted essay or an applicant outcome. The uploaded report supplies coverage requirements, not this applicant story. Replace every experience with your own; practice prompt and word limit are not official.",
    "essayType": "supplemental",
    "targetName": "",
    "wordLimit": 300,
    "prompt": "Practice prompt: Clothes designed for repair. Describe a specific experience, your response, and what changed in your thinking.",
    "text": "My costume for a school performance used a hidden seam that looked elegant and tore during rehearsal. Repairing it required undoing most of the lining. A volunteer seamstress asked whether the garment had been designed to be worn repeatedly or only photographed once.\n\nWe replaced the fragile fastening and made the stressed seam accessible. I kept a small repair kit and asked performers to record where movement felt restricted. Their notes changed the next version more than my sketches did. We reused material from the first garment instead of treating the revision as a complete replacement.\n\nI want to study design with repair as an intended stage of an object's life. The seamstress showed me that durability includes the ability to intervene when something fails. A beautiful object should leave room for its owner to care for it.",
    "roles": [
      "hook",
      "evidence",
      "reflection"
    ]
  }
];
ESSAY_RUBRIC_SAMPLES.push(...PRACTICE_ESSAY_ADDITIONS);

// ===========================================================================
// 3.3 RECOMMENDATION LETTERS — LOR_SAMPLES
// ===========================================================================

// Authored: the brief referenced LOR-1 "from above" without including it.
const LOR_ACADEMIC_TEXT = `[OFFICIAL UNIVERSITY LETTERHEAD]
Tashkent University of Information Technologies (TUIT) — Smart Irrigation & Climate Lab, Tashkent, Uzbekistan

Date: October 15, 2026

To the Graduate Admissions and Scholarship Committee,

I recommend Timur Rashidov for your master's programme in Informatics without reservation. I am a Professor of Computer Engineering at TUIT and have led the Smart Irrigation & Climate Lab since 2019. Timur took my Distributed Computing course in spring 2024 and finished first among 64 students; he has worked in my lab as an undergraduate research assistant since September 2024. Of the 31 undergraduate researchers I have supervised, he is one of the two strongest.

His defining strength is that he turns field problems into engineering questions and then finishes the engineering. Our pilot needed moisture forecasts on hardware cheaper than a sack of fertiliser, so Timur quantized a PyTorch segmentation network to run on edge microcontrollers. The model predicts root-zone moisture deficits 48 hours ahead with 91.4% accuracy and cut seasonal water use on our 180-hectare pilot by 22%. He is first author of one of the two papers our lab presented at IEEE ICISCT 2025 and wrote the evaluation code for both.

I saw his judgment most clearly during his first month in the lab. A late-summer heatwave of 44°C made our field gateways drop 35% of telemetry packets, putting six months of seasonal data at risk. Timur did not wait for imported replacement hardware. He studied the voltage logs, rewrote the firmware in C++ with a compressed store-and-forward buffer, and moved transmissions to dawn. Data recovery rose to 99.6%, and his configuration now runs on every probe we own.

Timur also builds capacity around him. In 2024 he founded CodeForRegions, recruiting 18 volunteers to teach Python to 420 rural high-school students; fourteen of them have since won olympiad medals. In the lab he leads our Friday code reviews for five junior students, and his written feedback is precise and generous.

His remaining gap is formal training in probabilistic machine learning and physics-informed models — exactly what a strong master's programme provides, and exactly what our next project on mountain watersheds needs. I recommend him with the highest enthusiasm and would welcome him back as a colleague.

Sincerely,

Prof. Dr. Rustam Alimov
Professor of Computer Engineering · Head, Smart Irrigation & Climate Lab
Tashkent University of Information Technologies | r.alimov@example.com`;

// Brief, verbatim — except the missing space in "DilshodbekNazarov", corrected.
const LOR_TEACHER_TEXT = `[OFFICIAL ACADEMIC LYCEUM LETTERHEAD]
Academic Lyceum of Mathematics, Physics and Informatics — Tashkent / Qarshi, Uzbekistan

Date: October 15, 2026

To the Undergraduate Admissions and Scholarship Committee,

It is my distinct privilege to recommend Dilshodbek Nazarov for admission to your Bachelor of Science program in Computer Science and Engineering. As Senior Instructor of Advanced Mathematics and Olympiad Coordinator at our Academic Lyceum for the past twelve years, I have taught Dilshodbek in Honors Calculus, Linear Algebra, and Competitive Programming over the last two academic years (2024–2026). Out of 180 students in his graduating class—selected from the top 5% of middle-school graduates across our region—Dilshodbek ranks #1 overall with an unweighted GPA of 5.00/5.00.

What sets Dilshodbek apart from other high-scoring students is his ability to connect abstract mathematical proofs to real-world engineering problems. During our 10th-grade seminar on graph theory, while his peers solved textbook shortest-path exercises, Dilshodbek asked whether Dijkstra's algorithm could be modified to optimize minibus school-transport routes in rural districts during winter road closures. Over the next six weeks, he gathered road-network data for 28 villages, implemented a weighted routing simulation in Python, and presented a working web tool to our Lyceum administration. His mathematical rigor and clear technical communication earned him a Silver Medal at the 2025 Republican Olympiad in Informatics and an SAT Math score of 790/800.

Equally impressive is Dilshodbek's character and commitment to his peers. When he noticed that incoming 10th-grade students from rural schools felt intimidated by English-language computer science textbooks, he founded our Lyceum's Peer Coding & English STEM Club. Every Tuesday and Thursday afternoon for eighteen months, he tutored 45 younger students in Python, data structures, and technical English without any external reward. Eight of his mentees qualified for regional olympiad finals this year—a direct result of his patient, encouraging leadership.

Dilshodbek combines the intellectual maturity of a university sophomore with genuine humility and civic responsibility. I recommend him with my highest enthusiasm for undergraduate admission and full merit scholarship consideration.

Sincerely,

Dr. Farkhodbekulov
Chair of Mathematics & Olympiad Preparation
Academic Lyceum of Mathematics and Informatics | f.kulov@lyceum.uz`;

const LOR_EMPLOYER_TEXT = `[OFFICIAL COMPANY / INSTITUTION LETTERHEAD]
Center for Economic Research and Digital Transformation — Tashkent, Uzbekistan

Date: October 15, 2026

To the Graduate Admissions and Scholarship Selection Committee,

I am writing to strongly endorse Ms. Madina Rustamova for admission to your Master's program and associated merit scholarship. As Deputy Director of Regional Economic Analytics, I have directly supervised Madina since March 2024 in her role as Junior Policy & Data Analyst. Among the twenty-five analysts I have managed over the past eight years, Madina stands in the top 2% for analytical precision, initiative under tight deadlines, and stakeholder leadership.

When Madina joined our division, regional SME loan-performance data arrived from fourteen provinces in incompatible spreadsheet formats, delaying quarterly policy reports by three weeks. Without being asked, Madina designed an automated Python and SQL data-validation pipeline that standardized 42,000 enterprise records and reduced reporting turnaround from 21 days to 48 hours. Her pipeline is now the standard workflow across our 18-person department.

In late 2024, I entrusted Madina with leading the quantitative evaluation of a $12 million pilot credit-guarantee program for women-owned manufacturing enterprises in the Fergana Valley—a responsibility normally assigned to senior analysts with five years of experience. She coordinated field surveys across three commercial banks, applied propensity-score matching in R, and discovered that replacing rigid real-estate collateral rules with cash-flow verification increased loan approval rates for rural women entrepreneurs by 31% while maintaining a 98.4% repayment rate. She defended these findings directly before the Inter-Ministerial Working Group, and her recommendations were incorporated into the 2025 Regional Entrepreneurship Decree.

Madina is a natural bridge-builder who elevates everyone around her. She organized our Friday Data Literacy Workshops for twelve junior interns and consistently volunteers to mentor female university students entering quantitative economics. Having reached the ceiling of what domestic training can offer in structural econometrics, she is fully prepared for rigorous graduate study abroad. We look forward to welcoming her back into a Senior Economist leadership role upon completion of her Master's degree.

Sincerely,

Sherzod Mirzayev
Deputy Director, Regional Economic Analytics
Tashkent, Uzbekistan | s.mirzayev@cer.uz`;

// Authored: the brief referenced the request e-mail "from above" without including it.
const LOR_REQUEST_EMAIL_TEXT = `Subject: Recommendation request — master's applications in AI (first deadline 1 December 2026)

Dear Professor Alimov,

I am applying for master's programmes in artificial intelligence that start in autumn 2027, and I would be grateful if you would write a recommendation letter for me. You have supervised my research since September 2024, so you know my lab work better than anyone else on the faculty.

My first deadline is 1 December 2026. Each university will e-mail you its own upload link after I register you as a referee; with your permission I will register you by 1 November, which leaves you four weeks before the first deadline.

To save you time, I have attached:
• my CV and a draft statement of purpose;
• a one-page summary of my lab work: the quantized moisture-forecasting model (48-hour horizon, 91.4% accuracy), the firmware fix after the September 2024 heatwave, and our two IEEE ICISCT 2025 papers;
• a table of the programmes, deadlines and submission links.

If it is useful, my statement focuses on research independence and on explaining results to farmers and engineers, but please write whatever you think is fair. If your schedule is too full this term, I will completely understand.

Thank you for considering this, and for two years of guidance.

Kind regards,
Timur Rashidov
B.Sc. Software Engineering (4th year), TUIT · +998 90 000 00 00`;

const ACADEMIC_REC_FIELDS: RecLetterFields = {
  university: "M.Sc. Informatics applications (TUM and others)",
  deadline: "1 December 2026 (first deadline)",
  relationshipContext:
    "Research supervisor since September 2024 (Smart Irrigation & Climate Lab, TUIT); taught me Distributed Computing in spring 2024.",
  requestedFocus:
    "Research independence and technical depth: the quantized moisture-forecasting model and the firmware fix after the 2024 heatwave.",
  supportingExample:
    "After a 44°C heatwave dropped 35% of our telemetry packets, I rewrote the gateway firmware with a store-and-forward buffer and dawn transmissions; data recovery rose to 99.6% and the fix became the lab's standard configuration.",
};

export const LOR_SAMPLES: LorSample[] = [
  {
    id: "lorAcademic",
    group: "lor",
    origin: "authored",
    kind: "academic",
    recLetterFields: ACADEMIC_REC_FIELDS,
    text: LOR_ACADEMIC_TEXT,
    roles: ["letterhead", "letterhead", "letterhead", "relationship", "anecdote", "anecdote", "character", "endorsement", "signature", "signature"],
  },
  {
    id: "lorTeacher",
    group: "lor",
    origin: "brief",
    kind: "teacher",
    recLetterFields: {
      university: "KAIST — B.Sc. School of Computing",
      deadline: "15 November 2026 (my first deadline)",
      relationshipContext:
        "Senior Instructor of Advanced Mathematics and Olympiad Coordinator; taught me Honors Calculus, Linear Algebra and Competitive Programming (2024–2026).",
      requestedFocus:
        "Mathematical rigour applied to real problems, and peer leadership in the Peer Coding & English STEM Club.",
      supportingExample:
        "In the 10th-grade graph theory seminar I adapted Dijkstra's algorithm to plan winter minibus routes for 28 villages and presented a working web tool to the lyceum administration.",
    },
    text: LOR_TEACHER_TEXT,
    roles: ["letterhead", "letterhead", "letterhead", "relationship", "anecdote", "character", "endorsement", "signature", "signature"],
  },
  {
    id: "lorEmployer",
    group: "lor",
    origin: "brief",
    kind: "employer",
    recLetterFields: {
      university: "LSE — M.Sc. Economic Policy for International Development",
      deadline: "10 January 2027 (my first deadline)",
      relationshipContext: "Deputy Director of Regional Economic Analytics; my direct supervisor since March 2024.",
      requestedFocus:
        "Analytical precision under deadlines and stakeholder leadership on the $12 million credit-guarantee evaluation.",
      supportingExample:
        "I designed a Python and SQL validation pipeline that standardised 42,000 SME loan records and cut reporting time from 21 days to 48 hours; it is now the department's standard workflow.",
    },
    text: LOR_EMPLOYER_TEXT,
    roles: ["letterhead", "letterhead", "letterhead", "relationship", "anecdote", "anecdote", "endorsement", "signature", "signature"],
  },
  {
    id: "lorRequestEmail",
    group: "lor",
    origin: "authored",
    kind: "requestEmail",
    recLetterFields: ACADEMIC_REC_FIELDS,
    text: LOR_REQUEST_EMAIL_TEXT,
    roles: ["heading", "letterhead", "relationship", "ask", "docEvidence", "ask", "signature", "signature"],
  },
];

LOR_SAMPLES.push(...([
  {
    "id": "lorInternshipSupervisor",
    "group": "lor",
    "origin": "composite",
    "kind": "employer",
    "sourceNote": "Original fictional teaching composite, not a verified recommendation or admission outcome. Only the real recommender may write, approve and submit a letter; never impersonate a supervisor.",
    "recLetterFields": {
      "university": "[Target university and programme]",
      "deadline": "[Check the official submission deadline]",
      "relationshipContext": "Internship supervisor who observed my work throughout a supervised software placement.",
      "requestedFocus": "Careful testing, response to feedback and transparent communication of limitations.",
      "supportingExample": "I reproduced a synchronization bug, wrote a failing test and documented the fix for the next intern."
    },
    "text": "Dear Admissions Committee,\n\nI supervised [Applicant] during a twelve-week internship on our internal appointment system. I reviewed their weekly work and observed both their technical progress and their response to mistakes. My assessment is limited to that placement; I cannot speak for projects outside our team.\n\nThe strongest example came when a demonstration lost an appointment during reconnection. Rather than hiding the failure behind a successful second attempt, [Applicant] reproduced the sequence, wrote a failing test and asked a colleague to check whether the proposed fix addressed the cause. Their first patch missed a second failure mode. They accepted that feedback and revised the test before revising the code.\n\n[Applicant] also wrote a handover note that separated confirmed behavior from unresolved questions. Another intern could run the tests without asking them for missing setup steps. This was a meaningful improvement over their first week, when instructions relied heavily on assumptions about our environment.\n\nI recommend [Applicant] for further study because I observed careful learning, accountable teamwork and a willingness to revise a claim when evidence changed. The placement did not establish expertise in every area of computing, but it gave me confidence in how they approach unfamiliar work. I would welcome the opportunity to supervise them again.\n\nSincerely,\n[Supervisor name and role]\n[Organization; official contact to be supplied by recommender]",
    "roles": [
      "letterhead",
      "relationship",
      "anecdote",
      "character",
      "endorsement",
      "signature"
    ]
  },
  {
    "id": "lorSchoolCounselor",
    "group": "lor",
    "origin": "composite",
    "kind": "teacher",
    "sourceNote": "Original fictional teaching composite, not a verified recommendation or admission outcome. A real counselor must independently verify, approve and submit their own assessment.",
    "recLetterFields": {
      "university": "[Target university and undergraduate programme]",
      "deadline": "[Check the official counselor deadline]",
      "relationshipContext": "School counselor who observed my contribution to a peer tutoring partnership over one academic year.",
      "requestedFocus": "Dependability, inclusion and growth in how I shared responsibility.",
      "supportingExample": "I replaced an unstable volunteer rota with consistent tutoring pairs and documented handovers when volunteers changed."
    },
    "text": "Dear Admissions Committee,\n\nAs [Applicant]'s school counselor, I have met with them regularly during the past academic year and observed their contribution to our peer tutoring partnership. I write about conduct I saw directly, rather than attributing the entire group's achievements to one student.\n\nAt the start of the year, [Applicant] organized many sessions but kept most decisions centralized. When younger students explained that changing tutors made it difficult to ask questions, [Applicant] did not defend the attendance totals as proof that the system worked. They invited the students to help redesign the rota around more consistent pairs.\n\nI observed the transition across several meetings. [Applicant] prepared handover notes, shared scheduling decisions and followed up when a volunteer became unavailable. They became better at recognizing when a quiet participant had not yet been heard. The change was gradual, and they occasionally needed reminders to delegate rather than complete another person's task.\n\nI recommend [Applicant] as a student who can learn from criticism and turn that learning into dependable service. I cannot predict an admission result or promise a particular academic rank, but I can attest to their growing judgment and the care with which they responded to their peers. I believe they would contribute thoughtfully to a university community.\n\nSincerely,\n[Counselor name and school]\n[Official school contact to be supplied by recommender]",
    "roles": [
      "letterhead",
      "relationship",
      "anecdote",
      "character",
      "endorsement",
      "signature"
    ]
  }
] as LorSample[]));

// ===========================================================================
// CV BUILDER — CV_BUILDER_SAMPLES (authored: the brief listed three CVs without text)
// ===========================================================================

const CV_ACADEMIC_TEXT = `TIMUR RASHIDOV
Software Engineer · Edge AI for Climate-Resilient Agriculture
Tashkent, Uzbekistan · timur.rashidov@example.com · +998 90 000 00 00 · github.com/trashidov-demo

EDUCATION
Tashkent University of Information Technologies (TUIT) — B.Sc. Software Engineering, 2023–2027 (expected June 2027)
GPA 4.88/5.00 · top 2% of 240 students · Thesis: quantized segmentation models for soil-moisture forecasting on microcontrollers
Relevant coursework: Advanced Algorithms, Linear Algebra, Distributed Computing, Probability & Statistics

RESEARCH EXPERIENCE
Undergraduate Research Assistant — Smart Irrigation & Climate Lab, TUIT (supervisor: Prof. Dr. Rustam Alimov), Sept 2024–present
• Built a sensing pipeline that fuses Sentinel-2 imagery with 60 LoRaWAN soil probes across three pilot farms (180 hectares).
• Quantized a PyTorch segmentation network for edge microcontrollers; it forecasts root-zone moisture deficits 48 hours ahead with 91.4% accuracy.
• Cut seasonal water use on pilot plots by 22%; rewrote gateway firmware (C++ ring buffer) after a 44°C heatwave, raising telemetry recovery from 65% to 99.6%.

PUBLICATIONS
• T. Rashidov, R. Alimov et al., "Edge-quantized segmentation for root-zone moisture forecasting," IEEE ICISCT 2025.
• R. Alimov, T. Rashidov et al., "Fusing Sentinel-2 imagery and LoRaWAN soil probes for irrigation scheduling," IEEE ICISCT 2025.

PROJECTS & COMPETITIONS
• 1st Place, AgroTech Uzbekistan National Hackathon 2024 — real-time crop-salinity forecasting; $3,000 R&D grant.
• 4th of 85 university teams, ICPC Central Asia Regional — team captain and backend architect.

LEADERSHIP & SERVICE
• Founder, CodeForRegions (2024–present) — 18 volunteers, a 12-week offline Python curriculum, 420 students in Qarshi and Namangan; 14 olympiad medalists.
• Translator, OpenSTEM Uzbekistan — 150 physics and computer-science problem sets translated into Uzbek; used by 14 schools.

SKILLS & LANGUAGES
Python, PyTorch, C++ (embedded), TypeScript, PostgreSQL, Git, Linux · LoRaWAN, Sentinel-2, Google Earth Engine, QGIS
Uzbek (native) · Russian (fluent) · English (IELTS 7.5) · German (A2)`;

const CV_UNDERGRAD_TEXT = `DILSHODBEK NAZAROV
Applicant, B.Sc. Computer Science · Tashkent, Uzbekistan
dilshodbek.nazarov@example.com · github.com/dnazarov-demo

EDUCATION
Academic Lyceum of Mathematics, Physics and Informatics, Tashkent — graduated June 2026
GPA 5.00/5.00 · ranked 1st of 180 · Honors Calculus, Linear Algebra, Competitive Programming
SAT 1510 (Math 790) · IELTS Academic 7.5

PROJECTS
BozorLedger — founder and sole developer (January 2025–present)
• Interviewed 30 vendors at Chorsu Bazaar over 4 months to map their cash-flow bottlenecks.
• Built a Telegram Mini App (TypeScript, Node.js, PostgreSQL) that combines wholesale price history with weather forecasts to suggest daily restock quantities.
• Adopted by 64 vendors within 5 months; average perishable spoilage fell by 27%.
Winter school-transport routing tool (Python, 2025)
• Modelled winter road closures for 28 villages with a weighted Dijkstra variant; presented to the lyceum administration.

AWARDS
• Silver Medal, Republican Olympiad in Informatics (2025)
• First Prize, Tashkent Youth Tech Fair (2025) — BozorLedger demand-smoothing algorithm

LEADERSHIP
• Captain, Lyceum Math & Coding Circle (2024–2026) — mentored 90 younger students for national STEM competitions.
• Founder, Peer Coding & English STEM Club (2024–2026) — twice-weekly sessions for 45 students; 8 reached regional olympiad finals.

SKILLS & LANGUAGES
Python, C++, TypeScript, SQL, Git
Uzbek (native) · Russian (fluent) · English (IELTS 7.5) · Korean (beginner, self-study)`;

const CV_EUROPASS_TEXT = `EUROPASS CURRICULUM VITAE
Madina Rustamova
Tashkent, Uzbekistan · madina.rustamova@example.com · +998 90 000 00 00 · Nationality: Uzbek

WORK EXPERIENCE
03/2024 – present · Junior Policy & Data Analyst
Center for Economic Research and Digital Transformation, Tashkent, Uzbekistan
• Designed a Python and SQL validation pipeline for 42,000 SME loan records from 14 provinces; quarterly reporting time fell from 21 days to 48 hours.
• Led the quantitative evaluation of a $12 million credit-guarantee pilot for women-owned manufacturers (propensity-score matching in R).
• Showed that cash-flow verification raised loan approvals for rural women entrepreneurs by 31% with a 98.4% repayment rate; presented the findings to the Inter-Ministerial Working Group.
• Run Friday Data Literacy Workshops for 12 junior interns.

EDUCATION AND TRAINING
2019 – 2023 · B.Sc. (Hons) Economics
Westminster International University in Tashkent · GPA 3.92/4.00 (top 3%)
Thesis: employment effects of the 2022 tax-simplification reform (difference-in-differences, Stata)

PUBLICATIONS AND POLICY BRIEFS
• "Cash-flow guarantees and rural women's access to credit" — policy brief, 2025
• "Collateral valuation gaps in Fergana Valley SME lending" — working paper, 2025

LANGUAGE SKILLS
Mother tongue: Uzbek
Other languages (CEFR): English C1 (IELTS 8.0) · Russian C1 · German A2

DIGITAL SKILLS
Stata · R (fixest, MatchIt) · Python (pandas) · SQL · Power BI · LaTeX

VOLUNTEERING
Co-founder, Tashkent Young Economists Reading Group (2023–present) — 65 undergraduates replicate empirical development papers with open Uzbek datasets.`;

export const CV_BUILDER_SAMPLES: CvBuilderSample[] = [
  {
    id: "cvAcademicStem",
    group: "cvBuilder",
    origin: "authored",
    format: "academic",
    text: CV_ACADEMIC_TEXT,
    roles: ["cvHeader", "cvEducation", "cvExperience", "cvRecognition", "cvProjects", "cvLeadership", "cvSkills"],
  },
  {
    id: "cvUndergraduate",
    group: "cvBuilder",
    origin: "authored",
    format: "undergraduate",
    text: CV_UNDERGRAD_TEXT,
    roles: ["cvHeader", "cvEducation", "cvProjects", "cvRecognition", "cvLeadership", "cvSkills"],
  },
  {
    id: "cvEuropass",
    group: "cvBuilder",
    origin: "authored",
    format: "europass",
    text: CV_EUROPASS_TEXT,
    roles: ["cvHeader", "cvExperience", "cvEducation", "cvRecognition", "cvSkills", "cvSkills", "cvLeadership"],
  },
];

// ===========================================================================
// ONBOARDING & PROFILE AUTO-FILL — ONBOARDING_CV_SAMPLES (authored)
// Short CV snapshots of the kind a student pastes into the auto-fill box.
// Labels are explicit ("GPA:", "IELTS Academic:") so the extraction preview
// in src/lib/profileExtract.ts can show exactly what it would fill.
// ===========================================================================

export const ONBOARDING_CV_SAMPLES: OnboardingCvSample[] = [
  {
    id: "onboardingStem",
    group: "onboardingCv",
    origin: "authored",
    degreeLevel: "Master",
    text: `TIMUR RASHIDOV — applying for M.Sc. Informatics (AI & Robotics), winter 2027
Tashkent, Uzbekistan · timur.rashidov@example.com

Education: B.Sc. Software Engineering, Tashkent University of Information Technologies — expected graduation June 2027
GPA: 4.88 / 5.00 (top 2% of 240 students)

Test scores: IELTS Academic: 7.5 (Listening 8.0, Reading 8.0, Writing 7.0, Speaking 7.0) · SAT: 1510

Research: Smart Irrigation & Climate Lab, TUIT (since September 2024) — 2 co-authored papers at IEEE ICISCT 2025; moisture forecasts 48 hours ahead with 91.4% accuracy on 180 hectares.

Leadership: Founder of CodeForRegions — 18 volunteers, 420 rural students trained, 14 olympiad medalists.`,
    roles: ["cvHeader", "cvEducation", "cvEducation", "cvExperience", "cvLeadership"],
  },
  {
    id: "onboardingBachelor",
    group: "onboardingCv",
    origin: "authored",
    degreeLevel: "Bachelor",
    text: `DILSHODBEK NAZAROV — applying for a B.Sc. in Computer Science, entry 2027
Tashkent, Uzbekistan · dilshodbek.nazarov@example.com

Education: Academic Lyceum of Mathematics, Physics and Informatics, Tashkent — graduated June 2026
GPA: 5.00 / 5.00 (ranked 1st of 180)

Test scores: SAT: 1510 (Math 790) · IELTS Academic: 7.5

Projects and awards: BozorLedger, a Telegram Mini App used by 64 bazaar vendors (spoilage down 27%) · Silver Medal, Republican Olympiad in Informatics 2025.

Leadership: Captain of the Lyceum Math & Coding Circle (90 students mentored over 2 years).`,
    roles: ["cvHeader", "cvEducation", "cvEducation", "cvProjects", "cvLeadership"],
  },
  {
    id: "onboardingEconomics",
    group: "onboardingCv",
    origin: "authored",
    degreeLevel: "Master",
    text: `MADINA RUSTAMOVA — applying for an M.Sc. in Economic Policy for International Development, September 2027
Tashkent, Uzbekistan · madina.rustamova@example.com

Education: B.Sc. (Hons) Economics, Westminster International University in Tashkent — graduated 2023
GPA: 3.92 / 4.00 (top 3%)

Test scores: IELTS Academic: 8.0 · GRE: 327 (Quantitative 167, Verbal 160)

Work experience: 2.5 years — Junior Policy & Data Analyst, Center for Economic Research and Digital Transformation (since March 2024). Led the evaluation of a $12 million credit-guarantee pilot; approvals for rural women entrepreneurs up 31%.

Publications: 2 policy publications (2025).`,
    roles: ["cvHeader", "cvEducation", "cvEducation", "cvExperience", "cvRecognition"],
  },
];

// ===========================================================================
// 3.4 ANSWER VAULT — ANSWER_VAULT_SAMPLES (brief, verbatim)
// ===========================================================================

export const ANSWER_VAULT_SAMPLES: AnswerVaultSample[] = [
  {
    id: "answerGeneral",
    group: "answerVault",
    origin: "brief",
    category: "general",
    text: "I am a final-year Software Engineering student at Tashkent University of Information Technologies (GPA 4.88/5.00, top 2% of 240 students; IELTS 7.5; SAT 1510). My academic focus lies at the intersection of embedded computer vision and climate-resilient agriculture. Over the past two years in TUIT's Smart Irrigation Lab, I have co-authored two IEEE conference papers on combining Sentinel-2 satellite imagery with low-cost soil probes to reduce agricultural water waste in Uzbekistan's arid regions by 22%. Outside the lab, I founded CodeForRegions, mentoring 420 rural high-school students in Python and algorithmic problem-solving.",
    roles: ["answer"],
  },
  {
    id: "answerMotivation",
    group: "answerVault",
    origin: "brief",
    category: "motivation",
    text: "Growing up in Qashqadaryo, I saw how outdated flood-irrigation schedules cost smallholder farmers up to 30% of their late-season crops during summer droughts. While my undergraduate research proved that low-power IoT sensors can cut water usage by 22% on pilot plots, scaling these models across entire river basins requires advanced training in physics-informed machine learning and multi-modal satellite fusion. This programme offers the exact combination of statistical learning theory and environmental sensing laboratories needed to build scalable drought-forecasting infrastructure for Central Asia.",
    roles: ["answer"],
  },
  {
    id: "answerLeadership",
    group: "answerVault",
    origin: "brief",
    category: "leadership",
    text: "In January 2024, I founded CodeForRegions after noticing that rural students in Qarshi and Namangan rarely qualified for national informatics olympiads due to a lack of Uzbek-language algorithmic materials. With zero initial budget, I recruited 18 university volunteers, partnered with six regional public schools to use their computer labs on weekends, and authored a 12-week offline Python curriculum. Over eighteen months, we trained 420 high-school students, and 14 of our mentees won regional and national Informatics Olympiad medals.",
    roles: ["answer"],
  },
  {
    id: "answerCareer",
    group: "answerVault",
    origin: "brief",
    category: "career",
    text: "Immediately upon graduating, I will return to Tashkent to join the Digital Agriculture & Water Resources Center under the Ministry of Agriculture as a Lead Machine Learning Engineer. In my first two years, I will lead the deployment of an open-source satellite-and-IoT irrigation advisory system across 50,000 hectares in the Qashqadaryo and Fergana basins. Within five years, I aim to establish a joint Central Asian Climate-AI Research Consortium linking local polytechnic universities with international environmental laboratories.",
    roles: ["answer"],
  },
  {
    id: "answerChallenge",
    group: "answerVault",
    origin: "brief",
    category: "challenge",
    text: "During our 2024 field deployment of LoRaWAN soil-moisture sensors across three farms in Qashqadaryo, extreme 44°C summer heatwaves caused our gateway microcontrollers to drop 35% of daily telemetry packets, threatening six months of seasonal research data. Rather than waiting for expensive imported hardware replacements, I analyzed the voltage-drop logs, rewrote our firmware in C++ to implement a compressed store-and-forward ring buffer during peak midday heat, and scheduled burst transmissions at dawn. Data recovery rose to 99.6%, saving the experiment and forming the core methodology of our IEEE ICISCT 2025 paper.",
    roles: ["answer"],
  },
  {
    id: "answerCommunity",
    group: "answerVault",
    origin: "brief",
    category: "community",
    text: "To bridge the digital divide between Tashkent and rural provinces, I co-created an open-source repository of 150 bilingual (Uzbek/English) competitive-programming and physics simulation problems that run offline on low-spec school computers. In addition to leading weekly online code reviews for 90 high-school students, I organized the annual Qarshi Youth STEM Hackathon, securing $3,000 in local sponsorship to provide microcontroller kits to twelve rural school teams.",
    roles: ["answer"],
  },
  {
    id: "answerHarvardMusicResearchComposite", group: "answerVault", origin: "composite", category: "motivation",
    forQuestion: "Why did you choose this specific university and programme?",
    sourceNote: "Fictional practice response; named institution/programme details require current official verification and do not imply admission or research access.",
    sourceChecks: [{ url: "https://projects.iq.harvard.edu/epl/people/samuel-mehr", checkedAt: "2026-10-22", note: "Music Lab is directed by Samuel Mehr; Max Krasnow's current profile describes different research, so the supplied outline's claimed Krasnow music-perception lab was not repeated." }],
    text: "I am interested in the intersection of music, cognition, and psychology because performing has taught me to notice how people hear patterns differently. At Harvard, I would first verify the current undergraduate Music concentration and opportunities connected with Mind, Brain, and Behavior. The Music Lab's published work on music cognition is a starting point for reading, not a promise of a place in a lab. I would build the academic foundation through coursework and approach faculty only after confirming their current research and student opportunities. My long-term question is how musical engagement relates to cognition and wellbeing; I would treat any health claim as a research question, not an outcome I can promise.",
    roles: ["answer"],
  },
  {
    id: "answerJapaneseCuriosityComposite", group: "answerVault", origin: "composite", category: "challenge",
    forQuestion: "What is an idea or subject you explored out of curiosity?",
    sourceNote: "Fictional composite; study duration and tour examples are illustrative and must be replaced with the student's own record.",
    sourceChecks: [{ url: "https://www.state.gov/national-foreign-affairs-training-center/foreign-language-training", checkedAt: "2026-10-22", note: "The U.S. Department of State currently calls Japanese a super-hard Category IV language; 2,200 class-hours describes an FSI training estimate for its context, not a student's personal requirement." }],
    text: "A folder of Japanese marimba music in a file cabinet made me curious about how notation travels between languages. I began with kana, then replaced quick tutorial browsing with a regular listening routine using beginner podcasts such as Nihongo con Teppei. I read that the U.S. Department of State currently places Japanese in its super-hard Category IV group and cites 2,200 class hours in the Foreign Service training context; that is an institutional estimate, not a personal target or a category students should copy as an achievement. I tracked what I could understand each week instead. Later, I helped lead bilingual school tours when invited, using music as a shared point of reference. The process taught me to build a habit, notice what I do not understand, and ask for feedback rather than claim fluency too early.",
    roles: ["answer"],
  },
  {
    id: "answerMariachiListeningComposite", group: "answerVault", origin: "composite", category: "community",
    forQuestion: "Describe a time you changed how you learned or contributed to a group.",
    sourceNote: "Fictional composite; no real performer, ensemble, or admissions outcome is represented.",
    text: "In classical percussion, I learned to trust the printed part. In a mariachi ensemble, armonía asked me to listen differently: a vocalist could shift keys, and the paper could not tell me the next move. I followed the bass, watched the singer, and adjusted my accompaniment in real time. I missed changes at first, so I practised identifying the harmonic movement before playing. That experience changed how I contribute to groups. I prepare carefully, but I also pay attention to what other people are doing and leave room to adapt.",
    roles: ["answer"],
  },
  {
    id: "answerRoommateMusicComposite", group: "answerVault", origin: "composite", category: "general",
    forQuestion: "What small detail would help a future roommate get to know you?",
    sourceNote: "Fictional practice response, not a real applicant's personal answer.",
    text: "My ideal shared evening has a soundtrack that changes with the hour: Bach's Well-Tempered Clavier while I am settling into a task, then Mac DeMarco when it is time to stop pretending I will finish one more page. I like morning cafecito with pan dulce, and I sometimes tap a rhythm on a teacup or spoon before I remember to write it down. I would ask before borrowing kitchenware for percussion, promise to wash it, and happily trade playlists. The important roommate skill may be knowing when to share a song and when to use headphones.",
    roles: ["answer"],
  },
];

// ===========================================================================
// 3.5 ACTIVITY PORTFOLIO — ACTIVITY_PORTFOLIO_SAMPLES (brief, verbatim fields)
// The brief suggested "project" for research and competition; the activities
// API has native "research" and "competition" categories, so those are used.
// ===========================================================================

const ACTIVITIES: { id: string; activity: ActivityFields }[] = [
  {
    id: "activityResearch",
    activity: {
      category: "research",
      title: "Undergraduate Research Assistant — Smart Irrigation & Satellite ML Lab",
      role: "Lead Edge-AI & IoT Developer",
      organization: "Tashkent University of Information Technologies (TUIT)",
      hours: 480,
      description:
        "Designed a quantized PyTorch computer-vision model and LoRaWAN soil-probe network across 180 hectares of cotton and wheat farms.",
      achievements:
        "Predicted root-zone moisture deficits 48h ahead with 91.4% accuracy, cut seasonal water waste by 22%, and co-authored 2 IEEE ICISCT 2025 papers.",
    },
  },
  {
    id: "activityLeadership",
    activity: {
      category: "leadership",
      title: "Founder & Lead Mentor — CodeForRegions Rural STEM Initiative",
      role: "Founder & Curriculum Lead",
      organization: "CodeForRegions Uzbekistan",
      hours: 360,
      description:
        "Recruited 18 university volunteers to teach offline Python, algorithms, and Olympiad math to public school students in Qarshi and Namangan.",
      achievements:
        "Trained 420 rural students across 6 public schools; 14 mentees won regional and national Informatics Olympiad medals in 2025.",
    },
  },
  {
    id: "activityVolunteering",
    activity: {
      category: "volunteering",
      title: "Open-Source Bilingual STEM Textbook & Simulation Translator",
      role: "Technical Translator & Python Visualizer Author",
      organization: "OpenSTEM Uzbekistan Community",
      hours: 180,
      description:
        "Translated 150 physics and computer-science problem sets from English into Uzbek and built interactive browser simulations.",
      achievements: "Adopted by 14 regional high schools and academic lyceums, reaching over 1,200 students.",
    },
  },
  {
    id: "activityCompetition",
    activity: {
      category: "competition",
      title: "Team Captain — AgroTech Uzbekistan National Hackathon & ICPC Regionals",
      role: "Team Captain & Backend Architect",
      organization: "IT Park Uzbekistan / ICPC Central Asia",
      hours: 140,
      description: "Led a 3-person engineering team building real-time crop-salinity and bazaar inventory forecasting tools.",
      achievements:
        "Won 1st Place ($3,000 R&D Grant) at AgroTech National Hackathon 2024 and placed 4th nationally among 85 university teams in ICPC Regionals.",
    },
  },
  { id: "activityMusicLeadershipComposite", activity: { category: "leadership", portfolioCategory: "Music", title: "Band President & two-time Drumline Captain", role: "President / Captain", organization: "Fictional composite band program", hours: 480, hoursPerWeek: 8, weeksPerYear: 15, grades: "9–12", description: "Directed communication across four band classes and helped lead halftime performances.", achievements: "Pioneered fundraising and social events for a 200+ member programme.", commonAppDescription: "Directed 4 band classes; 8 hr/wk × 15 wk/yr; led shows and fundraising for 200+ members, grades 9–12." } },
  { id: "activityKeyClubComposite", activity: { category: "volunteering", portfolioCategory: "Community service", title: "Two-time Secretary, Key Club International", role: "Secretary", organization: "Fictional composite Key Club", hours: 243, hoursPerWeek: 3, weeksPerYear: 27, grades: "10–12", description: "Recorded meeting minutes and attendance while coordinating a charity concert.", achievements: "The illustrative concert featured 10 local bands and raised $10,000 for Food4Kids; replace all claims with verified personal results.", commonAppDescription: "Recorded minutes; 3 hr/wk × 27 wk/yr; organized 10-band benefit raising $10,000 for Food4Kids, grades 10–12." } },
  { id: "activityClassVicePresidentComposite", activity: { category: "leadership", portfolioCategory: "Student government", title: "Two-time Student Body Class Vice President", role: "Class Vice President", organization: "Fictional composite student body", hours: 108, hoursPerWeek: 2, weeksPerYear: 27, grades: "11–12", description: "Coordinated senior events and hosted a pre-school-year gathering.", achievements: "Raised more than $1,000 and welcomed 120+ students to the event.", commonAppDescription: "Raised >$1,000; 2 hr/wk × 27 wk/yr; hosted 120+ students and planned senior events, grades 11–12." } },
  { id: "activityNhsPresidentComposite", activity: { category: "volunteering", portfolioCategory: "Community service", title: "President, National Honor Society", role: "President", organization: "Fictional composite chapter", hours: 324, hoursPerWeek: 2, weeksPerYear: 36, grades: "10–12", description: "Reviewed member service records and organized weekly agendas.", achievements: "Checked volunteering-hour records for 211 members and maintained a service-form database.", commonAppDescription: "Verified records for 211 members; 2 hr/wk × 36 wk/yr; ran agendas and service database, grades 10–12." } },
  { id: "activitySteelPanComposite", activity: { category: "creative", portfolioCategory: "Music", title: "Two-time Lead Pan Section Leader, Steel Band", role: "Lead section leader", organization: "Fictional composite steel band", hours: 108, hoursPerWeek: 4, weeksPerYear: 27, grades: "9–12", description: "Performed at civic festivals and supported music-learning activities.", achievements: "Played for festival audiences of 450+ and promoted music education across 7 elementary schools.", commonAppDescription: "Performed at festivals for 450+; 4 hr/wk × 27 wk/yr; promoted music at 7 elementary schools, grades 9–12." } },
  { id: "activityWindEnsembleComposite", activity: { category: "creative", portfolioCategory: "Music", title: "Three-time Percussion Section Leader, Wind Ensemble", role: "Section leader", organization: "Fictional composite wind ensemble", hours: 180, hoursPerWeek: 5, weeksPerYear: 36, grades: "9–12", description: "Led student-run sectionals, prepared concerts, and maintained shared instruments.", achievements: "Supported a three-year state-sweepstakes run, 7 concerts, and instrument repairs.", commonAppDescription: "Led 7 concert sectionals; 5 hr/wk × 36 wk/yr; repaired instruments during a 3-year sweepstakes run, grades 9–12." } },
  { id: "activityMariachiComposite", activity: { category: "work", portfolioCategory: "Work (paid)", title: "Vihuela Musician, Traditional Mariachi Ensemble", role: "Paid ensemble musician", organization: "Fictional composite metro-area ensemble", hours: 48, hoursPerWeek: 8, weeksPerYear: 6, grades: "11–12", description: "Performed at community events, masses, and cultural celebrations.", achievements: "Contributed live accompaniment across the metro area; list only engagements actually performed.", commonAppDescription: "Played vihuela; 8 hr/wk × 6 wk/yr; accompanied community events, masses and celebrations, grades 11–12." } },
  { id: "activityPercussionTeacherComposite", activity: { category: "work", portfolioCategory: "Work (paid)", title: "Private Percussion Instructor", role: "Instructor", organization: "Independent teaching (fictional composite)", hours: 54, hoursPerWeek: 6, weeksPerYear: 9, grades: "11–12", description: "Provided weekly, individual lessons with repertoire suited to each learner.", achievements: "Taught 6 students from beginner through advanced levels.", commonAppDescription: "Taught 6 percussion students; 6 hr/wk × 9 wk/yr; tailored weekly repertoire, grades 11–12." } },
  { id: "activityUilCalculatorComposite", activity: { category: "competition", portfolioCategory: "Science / math", title: "Member, UIL Calculator Applications", role: "Team member / outreach volunteer", organization: "Fictional composite UIL team", hours: 54, hoursPerWeek: 1.5, weeksPerYear: 36, grades: "10–12", description: "Practised applied calculations and engineering-problem solving with teammates.", achievements: "Placed second as a team in Region and doubled club participation through outreach.", commonAppDescription: "Placed 2nd team in Region; 1.5 hr/wk × 36 wk/yr; doubled club participation via outreach, grades 10–12." } },
  { id: "activityJapaneseToursComposite", activity: { category: "club", portfolioCategory: "Language / cultural learning", title: "Independent Japanese Study & Bilingual School Tours", role: "Self-directed learner / tour volunteer", organization: "Fictional composite school", hours: 72, hoursPerWeek: 2, weeksPerYear: 36, grades: "10–12", description: "Studied Japanese through listening practice and helped explain school spaces on bilingual tours.", achievements: "Practised sustained language learning and supported visitor engagement; all scope figures are fictional teaching values.", commonAppDescription: "Studied Japanese; 2 hr/wk × 36 wk/yr; led bilingual tours, grades 10–12 (fictional practice scope)." } },
];

export const ACTIVITY_PORTFOLIO_SAMPLES: ActivitySample[] = ACTIVITIES.map(({ id, activity }) => ({
  id,
  group: "activity",
  origin: id.endsWith("Composite") ? "composite" : "brief",
  ...(id.endsWith("Composite") ? { sourceNote: "Fictional composite activity entries derived from the user-provided outline; values are illustrative, not verified admission outcomes; the newly uploaded report does not substantiate individual activities. Replace all metrics with your own records." } : {}),
  activity,
  text: activityText(activity),
  roles: ["activity", "evidence"],
}));

// ===========================================================================
// 3.6a OFFICIAL DOCUMENT TEMPLATES — OFFICIAL_DOCUMENT_TEMPLATES (authored)
// The brief pointed to "Section 9.3 Exemplars F and G", which it did not
// include. Templates use [bracketed] placeholders for every personal detail:
// a template must never ship a stranger's passport number or bank balance.
// ===========================================================================

export const SAMPLE_SPONSOR_AFFIDAVIT_HOMIYLIK_XATI: DocumentSample = {
  id: "docAffidavit",
  group: "document",
  origin: "authored",
  kind: "affidavit",
  text: `AFFIDAVIT OF FINANCIAL SUPPORT

I, [Sponsor's full name], born on [date of birth], holder of passport [series and number] issued on [date] by [issuing authority], residing at [full address, Uzbekistan], declare the following.

1. Relationship. I am the [father / mother / legal guardian] of [Student's full name], born on [date of birth], passport [series and number].

2. Commitment. I undertake to pay the tuition fees, accommodation, living expenses, health insurance and travel costs of [Student's full name] during the [degree and programme] at [University], [City, Country], from [start month and year] to [end month and year]. The estimated cost is [amount in figures] ([amount in words]) per academic year, as stated in the university's [admission letter / I-20 / CAS / cost estimate] dated [date].

3. Source and evidence of funds. My income comes from [employment as … at … / my registered business … / rental income from …]. My average monthly income is [amount] [currency]. I attach: a bank statement from [bank name] showing a balance of [amount] [currency] held since [date]; an employment and salary certificate dated [date]; [property ownership certificate / business registration certificate].

4. Accuracy. I confirm that the information above is true and complete, and I understand that the embassy or the university may verify it.

Signed in [City], Uzbekistan, on [date].

[Signature]
[Sponsor's full name] · [phone number] · [e-mail]

Notarisation: signature certified by notary [notary's full name], [notary office], register no. [number], on [date]. Attach a certified translation if the embassy or university asks for one.`,
  textUz: `HOMIYLIK XATI (MOLIYAVIY QO‘LLAB-QUVVATLASH TO‘G‘RISIDA)

Men, [homiyning to‘liq ismi-sharifi], [tug‘ilgan sanasi]da tug‘ilganman, [berilgan sanasi]da [bergan organ] tomonidan berilgan [seriyasi va raqami] pasport egasiman, [to‘liq manzil, O‘zbekiston] manzilida yashayman va quyidagilarni ma’lum qilaman.

1. Qarindoshlik. Men [talabaning to‘liq ismi-sharifi]ning ([tug‘ilgan sanasi], pasport [seriyasi va raqami]) [otasi / onasi / qonuniy vasiysi]man.

2. Majburiyat. [Talabaning to‘liq ismi-sharifi] [Universitet], [Shahar, Davlat]dagi [daraja va dastur] bo‘yicha [boshlanish oyi va yili]dan [tugash oyi va yili]gacha o‘qishi davomida kontrakt to‘lovi, turar joy, yashash xarajatlari, tibbiy sug‘urta va yo‘l xarajatlarini to‘lash majburiyatini olaman. Universitetning [sana]dagi [qabul xati / I-20 / CAS / xarajatlar smetasi]ga ko‘ra, bir o‘quv yili uchun taxminiy xarajat [raqamda summa] ([so‘z bilan summa])ni tashkil etadi.

3. Mablag‘ manbai va tasdiqlovchi hujjatlar. Daromadim [… da … lavozimidagi ishdan / ro‘yxatdan o‘tgan … biznesimdan / … ijarasidan] olinadi. O‘rtacha oylik daromadim [summa] [valyuta]. Ilova qilaman: [bank nomi]dan [sana]dan beri [summa] [valyuta] qoldiqni ko‘rsatuvchi bank ko‘chirmasi; [sana]dagi ish joyi va ish haqi to‘g‘risidagi ma’lumotnoma; [mulk huquqi to‘g‘risidagi guvohnoma / biznesni ro‘yxatdan o‘tkazish guvohnomasi].

4. Ma’lumotlarning to‘g‘riligi. Yuqoridagi ma’lumotlar to‘g‘ri va to‘liq ekanini tasdiqlayman hamda elchixona yoki universitet ularni tekshirishi mumkinligini tushunaman.

[Shahar], O‘zbekiston, [sana]da imzolandi.

[Imzo]
[Homiyning to‘liq ismi-sharifi] · [telefon raqami] · [e-pochta]

Notarial tasdiq: imzo [notariusning to‘liq ismi-sharifi], [notarial idora], reyestr raqami [raqam], [sana]da tasdiqlangan. Elchixona yoki universitet so‘rasa, tasdiqlangan tarjimani ilova qiling.`,
  roles: ["heading", "docParties", "docParties", "docAmount", "docEvidence", "docSignature", "docSignature", "docSignature", "docSignature"],
};

export const SAMPLE_PROFESSOR_COLD_EMAIL: DocumentSample = {
  id: "docColdEmail",
  group: "document",
  origin: "authored",
  kind: "coldEmail",
  text: `Subject: Prospective M.Sc. thesis student — edge AI for irrigation forecasting (TUIT, 2 IEEE papers)

Dear Professor [Surname],

I am a final-year Software Engineering student at Tashkent University of Information Technologies, and I read your group's [year] paper "[paper title]" closely. Your approach to [one specific method or result from that paper, in your own words] bears directly on a problem I have worked on for two years.

In the Smart Irrigation & Climate Lab at TUIT, I built a quantized segmentation model that runs on low-cost microcontrollers and forecasts root-zone moisture deficits 48 hours ahead with 91.4% accuracy across 180 hectares. Our results appeared in two IEEE ICISCT 2025 papers. The model degrades on mountain-fed fields where labels are sparse — the setting your [paper / project] addresses.

I am applying to the [programme] at [University] for the [winter / autumn] [year] intake. Would you be open to a 15-minute call in the coming weeks to discuss whether a master's thesis in your group on [specific topic] could be possible? I have attached my CV and a one-page research summary; my code is at [link].

Thank you for your time.

Kind regards,
Timur Rashidov
B.Sc. Software Engineering, TUIT · [e-mail] · [phone]`,
  roles: ["heading", "letterhead", "fit", "evidence", "ask", "signature", "signature"],
};

export const SAMPLE_FINANCIAL_STUDY_PLAN_COVER_NOTE: DocumentSample = {
  id: "docCoverNote",
  group: "document",
  origin: "authored",
  kind: "coverNote",
  text: `Subject: Financial plan and study plan — [Student's full name], [degree and programme], [University]

To the Visa Section, Embassy of [Country] in Tashkent / To the [Scholarship committee],

This note summarises how my studies will be financed and how the programme fits my career. Every figure below matches an attached document.

1. Programme. [Degree and programme], [University], [City]; [start date] to [end date]; admission letter dated [date].

2. Cost of the first year (from the university's official cost estimate):
• Tuition: [amount] [currency]
• Living costs (accommodation, food, local transport): [amount] [currency]
• Health insurance: [amount] [currency]
• Total: [amount] [currency]

3. Funding (documents attached):
• Scholarship: [name], [amount] [currency] per year — award letter dated [date]
• Family sponsor: [name, relationship], [amount] [currency] — notarised affidavit and bank statement
• Blocked account or own savings: [amount] [currency] — confirmation from [bank]
• Total available: [amount] [currency], which covers the first-year total above.

4. Study plan. Semesters 1–2: [core modules]. Semesters 3–4: [thesis or specialisation]. The programme builds on my [degree or work experience] in [field].

5. After graduation. I will return to Uzbekistan to work as [role] at [organisation or sector]; [one concrete tie — job offer, employer letter, family business or a scholarship return obligation].

Enclosures: admission letter; scholarship award letter; sponsor affidavit (notarised, with translation); bank statements for the last [3 / 6] months; proof of the sponsor's income; passport copy.

Sincerely,
[Signature]
[Student's full name] · [e-mail] · [phone]`,
  roles: ["heading", "letterhead", "docParties", "docParties", "docBudget", "docAmount", "docBudget", "impact", "docEvidence", "docSignature"],
};

export const OFFICIAL_DOCUMENT_TEMPLATES: DocumentSample[] = [
  SAMPLE_SPONSOR_AFFIDAVIT_HOMIYLIK_XATI,
  SAMPLE_PROFESSOR_COLD_EMAIL,
  SAMPLE_FINANCIAL_STUDY_PLAN_COVER_NOTE,
];

// ===========================================================================
// 3.6b VISA INTERVIEWS — VISA_INTERVIEW_QA_SAMPLES (authored)
// Five officer/applicant turns each. Officers may interview in the local
// language; these model answers are in English so the deterministic rubric
// (which reads English signals) can score them. Official figures used:
// Germany's blocked-account minimum (€11,904 / €992 a month, unchanged in
// 2026) and El-yurt umidi's three-year return obligation after a master's.
// Every other figure is a fictional applicant's own document.
// ===========================================================================

function visaSample(
  id: string,
  countryCode: VisaSample["countryCode"],
  destination: string,
  visaType: string,
  pairs: [string, string][],
): VisaSample {
  const turns: VisaTurn[] = pairs.flatMap(([q, a]) => [
    { role: "officer" as const, text: q },
    { role: "user" as const, text: a },
  ]);
  return {
    id,
    group: "visa",
    origin: "authored",
    countryCode,
    destination,
    visaType,
    turns,
    text: transcript(turns),
    roles: ["visaPurpose", "visaChoice", "visaFunding", "visaReturn", "visaTies"],
  };
}

export const VISA_INTERVIEW_QA_SAMPLES: VisaSample[] = [
  visaSample("visaUsF1", "US", "United States", "F-1 student visa", [
    [
      "Why do you want to go to the United States?",
      "Because I was admitted to Purdue University's B.S. in Computer Engineering for fall 2027, specifically to train in embedded systems while working on real community projects. My goal is to specialize in low-cost solar and water-pump electronics for rural Uzbekistan, and I could not find that combination at home.",
    ],
    [
      "Why did you choose this university and program?",
      "Purdue's computer engineering curriculum lets me focus on embedded systems, and its EPICS program puts students on engineering projects for community partners, which is what I already do with my grandfather's solar pump repairs. I also want to join undergraduate research on low-power circuits. Purdue offered me a merit scholarship of 10,000 dollars per year, and it was my first choice among 6 admissions.",
    ],
    [
      "Who will cover your tuition and living expenses?",
      "My first-year cost on the I-20 is 54,000 dollars. The merit scholarship covers 10,000 dollars, and my parents will pay the remaining 44,000 dollars from their savings and from the income of my father's solar installation company. I have their bank statements for the last 6 months and the company's tax certificate with me.",
    ],
    [
      "What will you do after you finish your studies?",
      "I will return to Qarshi and join my father's company as its first engineer, designing charge controllers for the farms and schools it already serves. My career goal is to open a small production line in Uzbekistan within 5 years, so these controllers are built locally instead of imported.",
    ],
    [
      "What ties do you have to your home country?",
      "My parents live in Qarshi with my younger sister and my grandfather, and my father has offered me a junior engineer position in the family company after graduation in 2031. The company has 14 employees and a waiting list of village schools, so a real job is waiting for me.",
    ],
  ]),
  visaSample("visaGermanyStudent", "DE", "Germany", "National (D) student visa — blocked account", [
    [
      "Why do you want to study in Germany?",
      "Because the research I want to do, machine learning on satellite and sensor data for agriculture, is especially strong at German technical universities, and TUM's M.Sc. in Informatics lets me specialize in it. My goal is to bring that knowledge back to irrigation planning in Uzbekistan, where I have already worked on a 180-hectare pilot.",
    ],
    [
      "Why did you choose this university and this programme?",
      "I chose TUM specifically because its Informatics programme offers deep learning for physics and earth observation, and its Data Science in Earth Observation research group works on exactly my problem: satellite data with very few ground labels. I co-authored 2 papers on this topic at IEEE ICISCT 2025, so the programme continues work I have already started.",
    ],
    [
      "How will you finance your stay in Germany?",
      "I have a blocked account with 11,904 euros, which releases 992 euros per month for living costs, and the blocking confirmation is in my file. My admission letter states tuition of 6,000 euros per semester for non-EU students; my parents have already transferred the first-year tuition of 12,000 euros, and I have their bank statements and my father's salary certificate.",
    ],
    [
      "What do you plan to do after your studies?",
      "I will return to Tashkent to work on the national irrigation-forecasting programme at the Digital Agriculture & Water Resources Center, which has invited me to apply for a machine learning engineer position after graduation. My career goal is to scale our forecasts from 180 hectares to the Amu Darya basin within 5 years.",
    ],
    [
      "What ties do you have to Uzbekistan?",
      "My parents live in Tashkent with my two younger brothers, and my family owns the apartment where I grew up. My research supervisor at TUIT has asked me to come back as a collaborator on the lab's next 3-year project on mountain watersheds, which starts in 2029.",
    ],
  ]),
  visaSample("visaKoreaD2", "KR", "South Korea", "D-2 student visa — Global Korea Scholarship", [
    [
      "Why do you want to study in Korea?",
      "Because Korea is a world centre for semiconductor and system-on-chip design, and my goal is to specialize in low-power edge AI hardware. During my B.Sc. at TUIT, Korean visiting professors at a 2024 KOICA workshop introduced me to AI accelerators, and I then led a 4-student capstone that built an FPGA defect-inspection camera.",
    ],
    [
      "Why did you choose this university and major?",
      "I chose Korea University's M.Sc. in Electrical and Electronic Engineering specifically because its curriculum includes VLSI signal processing and hardware acceleration for neural networks. I plan to research model quantization for industrial sensors in its integrated circuits lab, continuing my capstone camera, which reached 93.2 percent precision at 45 frames per second.",
    ],
    [
      "Who will pay for your tuition and living costs?",
      "I am a Global Korea Scholarship scholar. My NIIED award letter confirms that GKS covers full tuition, a round-trip flight, one year of Korean language training and a monthly living allowance. My parents also keep 9,000 US dollars in savings for emergencies, and I have their bank statement for the last 3 months.",
    ],
    [
      "What is your plan after graduation?",
      "After graduation I will return to Tashkent to work as an R&D engineer at the Uzbekistan–Korea IT & Semiconductor Innovation Park and teach part-time at TUIT. My career goal is to train Uzbek hardware engineers who can work with Korean partners in both languages.",
    ],
    [
      "How long will you stay in Korea, and what is your Korean level?",
      "I will stay for 3 years: 1 year of language training and 2 years of the master's programme, until August 2030. I passed TOPIK Level 3 at the King Sejong Institute in Tashkent and aim for Level 5 before my degree starts, and then I will come back to my parents and my teaching post at TUIT.",
    ],
  ]),
  visaSample("visaUkStudent", "UK", "United Kingdom", "Student Route visa — El-yurt umidi scholar", [
    [
      "Why did you choose the UK for your studies?",
      "Because a 12-month master's in the UK lets me return to my job quickly, and British universities are strong in development economics research. Specifically, I want training in causal policy evaluation, which my work on small-business credit at the Center for Economic Research and Digital Transformation now requires.",
    ],
    [
      "Why this university and this course?",
      "LSE's M.Sc. in Economic Policy for International Development has a core course in quantitative policy analysis, and its STICERD research centre works on credit-market frictions in developing economies, which is my exact topic. My goal is to write my dissertation on green-credit allocation for Central Asian small businesses, building on the 42,000 loan records I analysed in 2025.",
    ],
    [
      "How will you fund your studies and living costs?",
      "My tuition and living costs are covered by an El-yurt umidi Foundation scholarship, the Uzbek government programme for study abroad. My award letter confirms tuition of 38,500 pounds, which matches my CAS, and a living allowance for 12 months; I also hold 4,000 pounds of my own savings as a buffer.",
    ],
    [
      "What are your plans after graduation?",
      "I will return to Tashkent and rejoin my employer, the Center for Economic Research and Digital Transformation, as a Senior Economist. My El-yurt umidi contract obliges me to work in Uzbekistan for 3 years after a master's degree, and I signed that four-party contract with the Foundation, my employer and two guarantors in March 2026.",
    ],
    [
      "Why not study this subject in Uzbekistan?",
      "Uzbekistan does not yet offer a master's in development policy with this depth of econometrics, and our ministry partners specifically asked my team to build skills in randomized policy evaluation. The degree will equip me to lead the evaluations they have requested, and my career goal is to build that capacity at home.",
    ],
  ]),
];

// ===========================================================================
// Library index
// ===========================================================================

/** Every sample, grouped by the surface that shows it. */
export const SAMPLE_LIBRARY: { [G in SampleGroup]: SampleOf<G>[] } = {
  onboardingCv: ONBOARDING_CV_SAMPLES,
  sop: SOP_SAMPLES,
  essay: ESSAY_RUBRIC_SAMPLES,
  lor: LOR_SAMPLES,
  cvBuilder: CV_BUILDER_SAMPLES,
  answerVault: ANSWER_VAULT_SAMPLES,
  activity: ACTIVITY_PORTFOLIO_SAMPLES,
  document: OFFICIAL_DOCUMENT_TEMPLATES,
  visa: VISA_INTERVIEW_QA_SAMPLES,
};

export function samplesFor<G extends SampleGroup>(group: G): SampleOf<G>[] {
  return SAMPLE_LIBRARY[group];
}

export function allSamples(): SampleExemplar[] {
  return SAMPLE_GROUPS.flatMap((group) => SAMPLE_LIBRARY[group] as SampleExemplar[]);
}

export function findSample(id: string): SampleExemplar | undefined {
  return allSamples().find((sample) => sample.id === id);
}
