import { db } from "./index";
import { universities } from "./schema";
import { eq, inArray } from "drizzle-orm";

/** Stable, identity-only additions; no speculative rankings, prices, or admissions claims. */
export const REGIONAL_UNIVERSITY_SEEDS = [
  { name: "Middle East Technical University (METU)", canonicalName: "Middle East Technical University", shortName: "METU", country: "Turkey", city: "Ankara", flagEmoji: "🇹🇷", websiteUrl: "https://www.metu.edu.tr/en", countryCode: "TR" },
  { name: "Koç University", canonicalName: "Koç University", shortName: "Koç", country: "Turkey", city: "Istanbul", flagEmoji: "🇹🇷", websiteUrl: "https://www.ku.edu.tr/en/", countryCode: "TR" },
  { name: "Boğaziçi University", canonicalName: "Boğaziçi University", shortName: "Boğaziçi", country: "Turkey", city: "Istanbul", flagEmoji: "🇹🇷", websiteUrl: "https://www.bogazici.edu.tr/en", countryCode: "TR" },
  { name: "Sabancı University", canonicalName: "Sabancı University", shortName: "Sabancı", country: "Turkey", city: "Istanbul", flagEmoji: "🇹🇷", websiteUrl: "https://www.sabanciuniv.edu/en", countryCode: "TR" },
  { name: "Eötvös Loránd University (ELTE)", canonicalName: "Eötvös Loránd University", shortName: "ELTE", country: "Hungary", city: "Budapest", flagEmoji: "🇭🇺", websiteUrl: "https://www.elte.hu/en/", countryCode: "HU" },
  { name: "Budapest University of Technology and Economics (BME)", canonicalName: "Budapest University of Technology and Economics", shortName: "BME", country: "Hungary", city: "Budapest", flagEmoji: "🇭🇺", websiteUrl: "https://www.bme.hu/?language=en", countryCode: "HU" },
  { name: "University of Debrecen", canonicalName: "University of Debrecen", shortName: "Debrecen", country: "Hungary", city: "Debrecen", flagEmoji: "🇭🇺", websiteUrl: "https://unideb.hu/en", countryCode: "HU" },
  { name: "Nazarbayev University", canonicalName: "Nazarbayev University", shortName: "NU", country: "Kazakhstan", city: "Astana", flagEmoji: "🇰🇿", websiteUrl: "https://nu.edu.kz/", countryCode: "KZ" },
  { name: "Al-Farabi Kazakh National University (KazNU)", canonicalName: "Al-Farabi Kazakh National University", shortName: "KazNU", country: "Kazakhstan", city: "Almaty", flagEmoji: "🇰🇿", websiteUrl: "https://www.kaznu.kz/en/", countryCode: "KZ" },
  { name: "University of Warsaw", canonicalName: "University of Warsaw", shortName: "UW", country: "Poland", city: "Warsaw", flagEmoji: "🇵🇱", websiteUrl: "https://en.uw.edu.pl/", countryCode: "PL" },
  { name: "Jagiellonian University", canonicalName: "Jagiellonian University", shortName: "UJ", country: "Poland", city: "Kraków", flagEmoji: "🇵🇱", websiteUrl: "https://en.uj.edu.pl/", countryCode: "PL" },
  { name: "Charles University", canonicalName: "Charles University", shortName: "CU", country: "Czechia", city: "Prague", flagEmoji: "🇨🇿", websiteUrl: "https://cuni.cz/UKEN-1.html", countryCode: "CZ" },
  { name: "Czech Technical University in Prague (CTU)", canonicalName: "Czech Technical University in Prague", shortName: "CTU", country: "Czechia", city: "Prague", flagEmoji: "🇨🇿", websiteUrl: "https://www.cvut.cz/en", countryCode: "CZ" },
  { name: "Westminster International University in Tashkent (WIUT)", canonicalName: "Westminster International University in Tashkent", shortName: "WIUT", country: "Uzbekistan", city: "Tashkent", flagEmoji: "🇺🇿", websiteUrl: "https://wiut.uz/", countryCode: "UZ" },
  { name: "Inha University in Tashkent (IUT)", canonicalName: "Inha University in Tashkent", shortName: "IUT", country: "Uzbekistan", city: "Tashkent", flagEmoji: "🇺🇿", websiteUrl: "https://inha.uz/en/", countryCode: "UZ" },
  { name: "New Uzbekistan University", canonicalName: "New Uzbekistan University", shortName: "NewUU", country: "Uzbekistan", city: "Tashkent", flagEmoji: "🇺🇿", websiteUrl: "https://newuu.uz/en", countryCode: "UZ" },
] as const;

export function normalizeUniversityName(name: string): string {
  return name.normalize("NFKD").replace(/[\u0300-\u036f]/g, "").toLowerCase()
    .replace(/\([^)]*\)/g, " ").replace(/&/g, " and ").replace(/[^a-z0-9]+/g, " ").trim().replace(/\s+/g, " ");
}

export const UNIVERSITY_NAME_ALIAS_GROUPS = [
  ["Massachusetts Institute of Technology", "Massachusetts Institute of Technology (MIT)", "MIT"],
  ["University of Oxford"],
  ["Technical University of Munich", "Technical University of Munich (TUM)", "TUM"],
  ["Seoul National University", "SNU"],
  ["ETH Zurich", "ETH Zürich", "Swiss Federal Institute of Technology Zurich"],
  ["University of Toronto", "The University of Toronto", "U of T"],
  ["National University of Singapore", "National University of Singapore (NUS)", "NUS"],
  ["KAIST", "Korea Advanced Institute of Science and Technology"],
  ["Delft University of Technology", "TU Delft"],
  ["Politecnico di Milano", "Polytechnic University of Milan"],
  ["Koç University", "Koc University"],
  ["Middle East Technical University", "Middle East Technical University (METU)", "METU"],
  ["Eötvös Loránd University", "Eötvös Loránd University (ELTE)", "ELTE"],
  ["Nazarbayev University", "NU"],
  ["University of Warsaw"],
  ["Charles University"],
  ["Boğaziçi University", "Bogazici University"],
  ["Sabancı University", "Sabanci University"],
  ["Budapest University of Technology and Economics", "BME"],
  ["University of Debrecen"],
  ["Al-Farabi Kazakh National University", "KazNU"],
  ["Jagiellonian University"],
  ["Czech Technical University in Prague", "CTU"],
  ["Westminster International University in Tashkent", "WIUT"],
  ["Inha University in Tashkent", "IUT"],
  ["New Uzbekistan University", "NewUU"],
] as const;

export async function seedRegionalUniversities(): Promise<number> {
  const existing = await db.select({ name: universities.name, canonicalName: universities.canonicalName }).from(universities);
  const known = new Set(existing.flatMap((row) => [row.name, row.canonicalName ?? ""].map(normalizeUniversityName)));
  const missing = REGIONAL_UNIVERSITY_SEEDS.filter((row) => !known.has(normalizeUniversityName(row.name)) && !known.has(normalizeUniversityName(row.canonicalName)));
  if (!missing.length) return 0;
  const inserted = await db.insert(universities).values(missing.map((row) => ({
    ...row,
    degreeLevel: "All",
    description: "Institution identity seed. Current programmes, tuition, admissions, and rankings are not source-verified.",
    highlights: "[]",
    verificationStatus: "unverified",
    sourceReliability: 7,
    isActive: true,
  }))).onConflictDoNothing().returning({ id: universities.id });
  return inserted.length;
}
