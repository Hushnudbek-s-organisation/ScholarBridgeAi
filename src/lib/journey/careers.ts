/**
 * Career & Major Explorer catalogue (spec §15).
 *
 * Flow: Career → Major → Countries → Universities → Scholarships → Applications.
 *
 * This is a STATIC, EDITABLE-AFTER-WORKS catalogue, not knowledge claimed
 * about a specific university: it maps a career to the majors that commonly
 * lead to it and the countries that teach them. Every university it links to
 * is filtered from the real `universities` table at request time, so nothing
 * here can invent a school that does not exist in the database.
 */

export interface CareerPath {
  id: string;
  title: string;
  blurb: string;
  majors: string[];
  countries: string[];
  /**
   * Affinity cluster used ONLY for mild trial-feedback roll-up
   * (see `src/lib/careerDiscovery.ts`). Optional so older call sites and
   * admin tooling keep working unchanged.
   */
  cluster?: string;
  /**
   * Rough minutes for the hands-on mini project shown in career discovery
   * (human text lives in the `careers.{id}.trial*` i18n keys).
   */
  trialMinutes?: number;
}

export const CAREER_PATHS: CareerPath[] = [
  {
    id: "software",
    title: "Software Engineer / AI Engineer",
    blurb: "Build products and systems. The largest and most international STEM path.",
    majors: ["Computer Science", "Artificial Intelligence", "Data Science", "Software Engineering", "Information Systems"],
    countries: ["United States", "United Kingdom", "Germany", "Netherlands", "Canada", "Australia"],
    cluster: "digital",
    trialMinutes: 45,
  },
  {
    id: "data",
    title: "Data Scientist / Analyst",
    blurb: "Turn data into decisions. Strong overlap with AI and research roles.",
    majors: ["Data Science", "Statistics", "Applied Mathematics", "Business Intelligence", "Economics"],
    countries: ["United States", "United Kingdom", "Canada", "Germany", "Singapore", "Australia"],
    cluster: "digital",
    trialMinutes: 45,
  },
  {
    id: "business",
    title: "Business / Management / Consulting",
    blurb: "Operations, strategy and finance — the most common route to a global career.",
    majors: ["Business Administration", "Management", "Finance", "Marketing", "Supply Chain Management", "Economics"],
    countries: ["United Kingdom", "United States", "Germany", "France", "Canada", "Australia"],
    cluster: "business",
    trialMinutes: 40,
  },
  {
    id: "engineering",
    title: "Mechanical / Civil / Electrical Engineer",
    blurb: "Design and build physical systems. Strong industry demand worldwide.",
    majors: ["Mechanical Engineering", "Civil Engineering", "Electrical Engineering", "Aerospace Engineering", "Energy Engineering"],
    countries: ["Germany", "United States", "Canada", "United Kingdom", "Australia", "Netherlands"],
    cluster: "build",
    trialMinutes: 60,
  },
  {
    id: "health",
    title: "Medicine / Healthcare",
    blurb: "Clinical and research medicine. Note the extra science prerequisites.",
    majors: ["Medicine", "Public Health", "Nursing", "Biomedical Sciences", "Pharmacy"],
    countries: ["United Kingdom", "United States", "Germany", "Canada", "Australia"],
    cluster: "care",
    trialMinutes: 40,
  },
  {
    id: "law",
    title: "Law / Policy / International Relations",
    blurb: "Regulation, justice and government — often with a strong writing component.",
    majors: ["Law", "Political Science", "International Relations", "Public Policy", "Criminology"],
    countries: ["United Kingdom", "United States", "Netherlands", "Germany", "Canada", "Australia"],
    cluster: "social",
    trialMinutes: 45,
  },
  {
    id: "design",
    title: "Design / Architecture / Creative Arts",
    blurb: "Portfolio-led fields — your activity portfolio matters more than your grades here.",
    majors: ["Architecture", "Graphic Design", "Industrial Design", "Urban Planning", "Film and Media"],
    countries: ["United Kingdom", "Italy", "Germany", "United States", "Australia", "Netherlands"],
    cluster: "creative",
    trialMinutes: 60,
  },
  {
    id: "humanities",
    title: "Education / Social Sciences / Languages",
    blurb: "Teaching, translation, development and communication.",
    majors: ["Education", "Psychology", "Sociology", "Linguistics", "International Development", "Translation"],
    countries: ["United Kingdom", "Canada", "Australia", "Germany", "Netherlands"],
    cluster: "social",
    trialMinutes: 35,
  },
  // ---- journey expansion 2026-10-12: the fields the first catalogue missed.
  // Existing entries above are untouched; every new entry flows through the
  // SAME explorer, recommender and i18n key patterns.
  {
    id: "environment",
    title: "Environment / Climate / Sustainability",
    blurb: "Protect natural systems — ecology, climate science, sustainability and green policy.",
    majors: ["Environmental Science", "Environmental Engineering", "Ecology", "Climate Science", "Sustainability", "Natural Resource Management"],
    countries: ["Germany", "Netherlands", "Sweden", "Canada", "Australia", "United Kingdom"],
    cluster: "field",
    trialMinutes: 50,
  },
  {
    id: "agriculture",
    title: "Agriculture / Food / Veterinary",
    blurb: "Food systems, crops, animals and forestry — science with dirt on its hands.",
    majors: ["Agricultural Science", "Agronomy", "Food Science", "Animal Science", "Veterinary Medicine", "Forestry"],
    countries: ["Netherlands", "Australia", "Germany", "Canada", "United States", "New Zealand"],
    cluster: "field",
    trialMinutes: 50,
  },
  {
    id: "media",
    title: "Media / Communications / Journalism",
    blurb: "Tell stories that matter — journalism, PR, film, digital media and strategic communication.",
    majors: ["Journalism", "Communications", "Public Relations", "Film and Television Production", "Digital Media", "Media Studies"],
    countries: ["United Kingdom", "United States", "Australia", "Netherlands", "Canada"],
    cluster: "creative",
    trialMinutes: 45,
  },
  {
    id: "psychology",
    title: "Psychology / Counseling / Social Care",
    blurb: "Understand people and help them — clinical, counselling, cognitive and organisational paths.",
    majors: ["Psychology", "Clinical Psychology", "Counseling", "Cognitive Science", "Organizational Psychology", "Social Work"],
    countries: ["United Kingdom", "United States", "Canada", "Australia", "Netherlands"],
    cluster: "care",
    trialMinutes: 40,
  },
  {
    id: "math",
    title: "Mathematics / Statistics / Actuarial",
    blurb: "Patterns, proofs and prediction — maths that powers finance, science and AI.",
    majors: ["Mathematics", "Statistics", "Applied Mathematics", "Actuarial Science", "Financial Mathematics"],
    countries: ["United States", "United Kingdom", "Canada", "Germany", "Singapore"],
    cluster: "quant",
    trialMinutes: 45,
  },
  {
    id: "science",
    title: "Natural Sciences / Research",
    blurb: "Physics, chemistry, biology and earth sciences — curiosity turned into evidence.",
    majors: ["Physics", "Chemistry", "Biology", "Biotechnology", "Earth Sciences", "Astronomy"],
    countries: ["United States", "Germany", "United Kingdom", "Switzerland", "Canada", "Japan"],
    cluster: "research",
    trialMinutes: 50,
  },
  {
    id: "logistics",
    title: "Logistics / Transport / Supply Chain",
    blurb: "Keep the world moving — operations, transport, warehousing and global supply chains.",
    majors: ["Supply Chain Management", "Logistics", "Transport Management", "Operations Management", "International Business"],
    countries: ["Netherlands", "Germany", "United Kingdom", "Singapore", "United Arab Emirates"],
    cluster: "business",
    trialMinutes: 40,
  },
  {
    id: "energy",
    title: "Energy / Power / Renewables",
    blurb: "Generate and deliver power — from oil and gas to wind, solar and smart grids.",
    majors: ["Energy Engineering", "Renewable Energy", "Petroleum Engineering", "Electrical Engineering", "Environmental Engineering"],
    countries: ["Germany", "Norway", "United States", "Canada", "Australia", "United Kingdom"],
    cluster: "build",
    trialMinutes: 55,
  },
  {
    id: "tourism",
    title: "Tourism / Hospitality / Events",
    blurb: "Design experiences people remember — hotels, travel, events and guest services.",
    majors: ["Tourism Management", "Hospitality Management", "Event Management", "Hotel Management", "Travel Management"],
    countries: ["Switzerland", "United Arab Emirates", "Australia", "United Kingdom", "Spain"],
    cluster: "people-services",
    trialMinutes: 35,
  },
];

/** Every distinct major across the catalogue — used by the "all majors" view. */
export const ALL_MAJORS: string[] = [...new Set(CAREER_PATHS.flatMap((c) => c.majors))].sort();

/** Look up one career by id (case-sensitive stable id). */
export function getCareerPath(id: string): CareerPath | undefined {
  return CAREER_PATHS.find((c) => c.id === id);
}

/**
 * "software" → "Software" — the suffix used by the `journey.careerTitle…` /
 * `careerBlurb…` i18n keys (existing convention, kept stable).
 */
export function careerI18nSuffix(id: string): string {
  return id.charAt(0).toUpperCase() + id.slice(1);
}
