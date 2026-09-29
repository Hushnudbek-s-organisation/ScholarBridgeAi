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
}

export const CAREER_PATHS: CareerPath[] = [
  {
    id: "software",
    title: "Software Engineer / AI Engineer",
    blurb: "Build products and systems. The largest and most international STEM path.",
    majors: ["Computer Science", "Artificial Intelligence", "Data Science", "Software Engineering", "Information Systems"],
    countries: ["United States", "United Kingdom", "Germany", "Netherlands", "Canada", "Australia"],
  },
  {
    id: "data",
    title: "Data Scientist / Analyst",
    blurb: "Turn data into decisions. Strong overlap with AI and research roles.",
    majors: ["Data Science", "Statistics", "Applied Mathematics", "Business Intelligence", "Economics"],
    countries: ["United States", "United Kingdom", "Canada", "Germany", "Singapore", "Australia"],
  },
  {
    id: "business",
    title: "Business / Management / Consulting",
    blurb: "Operations, strategy and finance — the most common route to a global career.",
    majors: ["Business Administration", "Management", "Finance", "Marketing", "Supply Chain Management", "Economics"],
    countries: ["United Kingdom", "United States", "Germany", "France", "Canada", "Australia"],
  },
  {
    id: "engineering",
    title: "Mechanical / Civil / Electrical Engineer",
    blurb: "Design and build physical systems. Strong industry demand worldwide.",
    majors: ["Mechanical Engineering", "Civil Engineering", "Electrical Engineering", "Aerospace Engineering", "Energy Engineering"],
    countries: ["Germany", "United States", "Canada", "United Kingdom", "Australia", "Netherlands"],
  },
  {
    id: "health",
    title: "Medicine / Healthcare",
    blurb: "Clinical and research medicine. Note the extra science prerequisites.",
    majors: ["Medicine", "Public Health", "Nursing", "Biomedical Sciences", "Pharmacy"],
    countries: ["United Kingdom", "United States", "Germany", "Canada", "Australia"],
  },
  {
    id: "law",
    title: "Law / Policy / International Relations",
    blurb: "Regulation, justice and government — often with a strong writing component.",
    majors: ["Law", "Political Science", "International Relations", "Public Policy", "Criminology"],
    countries: ["United Kingdom", "United States", "Netherlands", "Germany", "Canada", "Australia"],
  },
  {
    id: "design",
    title: "Design / Architecture / Creative Arts",
    blurb: "Portfolio-led fields — your activity portfolio matters more than your grades here.",
    majors: ["Architecture", "Graphic Design", "Industrial Design", "Urban Planning", "Film and Media"],
    countries: ["United Kingdom", "Italy", "Germany", "United States", "Australia", "Netherlands"],
  },
  {
    id: "humanities",
    title: "Education / Social Sciences / Languages",
    blurb: "Teaching, translation, development and communication.",
    majors: ["Education", "Psychology", "Sociology", "Linguistics", "International Development", "Translation"],
    countries: ["United Kingdom", "Canada", "Australia", "Germany", "Netherlands"],
  },
];

/** Every distinct major across the catalogue — used by the "all majors" view. */
export const ALL_MAJORS: string[] = [...new Set(CAREER_PATHS.flatMap((c) => c.majors))].sort();
