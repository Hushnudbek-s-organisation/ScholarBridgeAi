export interface StudySpecialization {
  /** Stable, locale-independent identity (derived from the canonical English term). */
  id: string;
  /** Canonical English term used only for search, legacy compatibility and catalog matching. */
  canonical: string;
  /** English search synonyms; translated labels are added to search in the UI. */
  aliases: string[];
}

export interface StudyInterestArea {
  /** Stable ID supplied for this area; never use a translated label as identity. */
  id: string;
  /** Canonical English name supplied for catalog matching and legacy compatibility. */
  canonical: string;
  featured: boolean;
  aliases: string[];
  specializations: StudySpecialization[];
}

export type StudyInterestSelection =
  | { kind: "area"; areaId: string }
  | { kind: "specialization"; areaId: string; specializationId: string }
  | { kind: "other"; value: string }
  | { kind: "exploring" };

export const MAX_STUDY_INTERESTS = 5;
export const MAX_CUSTOM_STUDY_INTEREST_LENGTH = 160;

function stableSlug(value: string): string {
  return value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

function specialization(canonical: string, aliases: string[] = []): StudySpecialization {
  return { id: stableSlug(canonical), canonical, aliases };
}

/**
 * Canonical field taxonomy from the product brief. The array order is
 * intentional: the first ten are featured on the initial screen; the other
 * ten are disclosed with “View all fields”. This is a presentation order, not
 * a popularity or ranking claim.
 */
export const STUDY_INTEREST_AREAS: StudyInterestArea[] = [
  {
    id: "business_management_entrepreneurship",
    canonical: "Business, Management & Entrepreneurship",
    featured: true,
    aliases: ["business", "business studies", "business and management", "business administration", "management studies", "entrepreneurship", "mba"],
    specializations: [
      specialization("Business Administration", ["business admin", "business management", "commerce"]),
      specialization("Management", ["management studies", "business management"]),
      specialization("Marketing", ["digital marketing", "marketing management"]),
      specialization("Entrepreneurship", ["startups", "startup management", "venture creation"]),
      specialization("Human Resources", ["human resource management", "hr", "people management"]),
      specialization("Supply Chain Management", ["supply chain", "logistics", "operations and supply chain"]),
      specialization("International Business", ["global business"]),
      specialization("Business Analytics", ["business data analytics"]),
      specialization("Project Management", ["project management studies"]),
    ],
  },
  {
    id: "computer_science_it_software",
    canonical: "Computer Science, IT & Software",
    featured: true,
    aliases: ["computer science", "computing", "cs", "it", "technology", "software", "programming", "tech"],
    specializations: [
      specialization("Computer Science", ["cs", "computing", "computer studies", "compsci"]),
      specialization("Software Engineering", ["software development", "software systems"]),
      specialization("Information Technology", ["it", "info tech", "information tech", "information technology it"]),
      specialization("Cybersecurity", ["cyber security", "information security", "infosec"]),
      specialization("Information Systems", ["management information systems", "mis", "business information systems"]),
      specialization("Computer Engineering", ["computing engineering"]),
      specialization("Web and Mobile Development", ["web development", "mobile development", "app development", "web and app development"]),
    ],
  },
  {
    id: "engineering_technology",
    canonical: "Engineering & Technology",
    featured: true,
    aliases: ["engineering", "technology", "engineering studies", "tech", "applied engineering"],
    specializations: [
      specialization("Civil Engineering", ["civil", "construction engineering"]),
      specialization("Mechanical Engineering", ["mechanical", "mechanical systems"]),
      specialization("Electrical and Electronic Engineering", ["electrical engineering", "electronic engineering", "electronics", "eee", "ee"]),
      specialization("Chemical Engineering", ["chemical", "process engineering"]),
      specialization("Aerospace Engineering", ["aeronautical engineering", "aviation engineering"]),
      specialization("Biomedical Engineering", ["bioengineering", "medical engineering"]),
      specialization("Industrial and Manufacturing Engineering", ["industrial engineering", "manufacturing engineering", "manufacturing"]),
      specialization("Materials Engineering", ["materials science", "materials science and engineering"]),
      specialization("Mechatronics", ["mechatronics engineering", "automation engineering"]),
    ],
  },
  {
    id: "medicine_health_sciences",
    canonical: "Medicine & Health Sciences",
    featured: true,
    aliases: ["medicine", "medical", "health", "healthcare", "health sciences", "allied health"],
    specializations: [
      specialization("Medicine", ["medical studies", "mbbs", "md", "clinical medicine", "medicine mbbs md"]),
      specialization("Nursing", ["nursing science", "registered nursing"]),
      specialization("Dentistry", ["dental medicine", "oral health"]),
      specialization("Pharmacy", ["pharmaceutical science", "pharmacology"]),
      specialization("Public Health", ["global health", "community health"]),
      specialization("Biomedical Sciences", ["biomedical science", "medical sciences"]),
      specialization("Nutrition and Dietetics", ["nutrition", "dietetics", "human nutrition"]),
      specialization("Physiotherapy", ["physical therapy", "physiotherapy studies"]),
      specialization("Allied Health", ["allied health sciences", "health professions"]),
    ],
  },
  {
    id: "data_science_ai_analytics",
    canonical: "Data Science, Artificial Intelligence & Analytics",
    featured: true,
    aliases: ["data", "data science", "ai", "artificial intelligence", "machine learning", "ml", "analytics", "big data"],
    specializations: [
      specialization("Data Science", ["data science and analytics", "data sciences"]),
      specialization("Artificial Intelligence", ["ai", "intelligent systems", "artificial intelligence machine learning"]),
      specialization("Machine Learning", ["ml", "deep learning"]),
      specialization("Data Analytics", ["data analysis", "analytics"]),
      specialization("Business Analytics", ["business data analytics"]),
      specialization("Big Data", ["big data analytics", "large-scale data"]),
    ],
  },
  {
    id: "economics_finance_accounting",
    canonical: "Economics, Finance & Accounting",
    featured: true,
    aliases: ["economics", "finance", "accounting", "banking", "money", "financial studies"],
    specializations: [
      specialization("Economics", ["economic studies", "economy"]),
      specialization("Finance", ["financial management", "corporate finance"]),
      specialization("Accounting", ["accountancy", "financial accounting"]),
      specialization("Banking", ["banking and finance"]),
      specialization("Actuarial Science", ["actuarial studies", "actuarial mathematics"]),
      specialization("Financial Technology", ["fintech", "financial technology studies"]),
    ],
  },
  {
    id: "psychology_behavioral_sciences",
    canonical: "Psychology & Behavioral Sciences",
    featured: true,
    aliases: ["psychology", "behavioral science", "behavioural science", "mental health", "human behavior"],
    specializations: [
      specialization("Psychology", ["psychological science"]),
      specialization("Clinical Psychology", ["clinical psychology studies"]),
      specialization("Counseling", ["counselling", "counseling psychology"]),
      specialization("Behavioral Science", ["behavioural science", "behavioral studies"]),
      specialization("Cognitive Science", ["cognition", "cognitive studies"]),
      specialization("Organizational Psychology", ["occupational psychology", "work psychology"]),
    ],
  },
  {
    id: "natural_sciences_math_statistics",
    canonical: "Natural Sciences, Mathematics & Statistics",
    featured: true,
    aliases: ["natural sciences", "science", "mathematics", "math", "statistics", "physical sciences"],
    specializations: [
      specialization("Biology", ["biological sciences", "life sciences"]),
      specialization("Chemistry", ["chemical sciences"]),
      specialization("Physics", ["physical science"]),
      specialization("Mathematics", ["math", "mathematical sciences"]),
      specialization("Statistics", ["statistical science", "applied statistics"]),
      specialization("Earth Sciences", ["earth science", "geoscience"]),
      specialization("Geology", ["geological sciences"]),
      specialization("Astronomy", ["astronomical science", "astrophysics"]),
    ],
  },
  {
    id: "social_sciences_international_relations",
    canonical: "Social Sciences & International Relations",
    featured: true,
    aliases: ["social science", "social studies", "international relations", "global affairs", "politics"],
    specializations: [
      specialization("Sociology", ["sociological studies"]),
      specialization("Anthropology", ["social anthropology"]),
      specialization("Human Geography", ["geography", "human and social geography"]),
      specialization("International Relations", ["ir", "international affairs", "global relations"]),
      specialization("Political Science", ["politics", "political studies"]),
      specialization("Social Work", ["social welfare"]),
      specialization("Criminology", ["criminal justice", "crime studies"]),
    ],
  },
  {
    id: "arts_humanities_languages",
    canonical: "Arts, Humanities & Languages",
    featured: true,
    aliases: ["humanities", "arts", "languages", "liberal arts", "culture", "literature"],
    specializations: [
      specialization("History", ["historical studies"]),
      specialization("Literature", ["literary studies"]),
      specialization("Philosophy", ["philosophical studies"]),
      specialization("Linguistics", ["language science", "linguistics translation studies"]),
      specialization("Modern Languages", ["foreign languages", "modern foreign languages"]),
      specialization("Religious Studies", ["religion", "theology"]),
      specialization("Cultural Studies", ["culture studies"]),
      specialization("Classics", ["classical studies", "ancient history"]),
    ],
  },
  {
    id: "law_legal_studies",
    canonical: "Law & Legal Studies",
    featured: false,
    aliases: ["law", "legal", "legal studies", "jurisprudence", "legal education"],
    specializations: [
      specialization("Law", ["legal studies", "jurisprudence"]),
      specialization("International Law", ["public international law"]),
      specialization("Business and Corporate Law", ["business law", "corporate law"]),
      specialization("Human Rights Law", ["human rights"]),
      specialization("Criminal Law", ["criminal justice law"]),
      specialization("Intellectual Property Law", ["ip law", "patent law", "copyright law"]),
      specialization("Legal Studies", ["legal research"]),
    ],
  },
  {
    id: "education_teaching",
    canonical: "Education & Teaching",
    featured: false,
    aliases: ["education", "teaching", "teacher training", "pedagogy", "educational studies"],
    specializations: [
      specialization("Primary Education", ["elementary education", "primary teaching"]),
      specialization("Secondary Education", ["high school education", "secondary teaching"]),
      specialization("Early Childhood Education", ["early years education", "preschool education"]),
      specialization("Special Education", ["inclusive education", "special needs education"]),
      specialization("Educational Leadership", ["education leadership", "school leadership"]),
      specialization("Curriculum and Instruction", ["curriculum studies", "instructional design"]),
      specialization("Language Education", ["language teaching", "tesol", "tefl"]),
    ],
  },
  {
    id: "architecture_urban_planning_built_environment",
    canonical: "Architecture, Urban Planning & Built Environment",
    featured: false,
    aliases: ["architecture", "urban planning", "built environment", "urban design", "construction"],
    specializations: [
      specialization("Architecture", ["architectural studies"]),
      specialization("Urban Planning", ["city planning", "town planning"]),
      specialization("Landscape Architecture", ["landscape design"]),
      specialization("Construction Management", ["construction project management"]),
      specialization("Quantity Surveying", ["cost management", "construction economics"]),
      specialization("Real Estate Development", ["property development", "real estate"]),
      specialization("Interior Architecture", ["interior design"]),
    ],
  },
  {
    id: "design_fine_arts_creative_media",
    canonical: "Design, Fine Arts & Creative Media",
    featured: false,
    aliases: ["design", "creative arts", "fine arts", "creative media", "visual arts"],
    specializations: [
      specialization("Graphic Design", ["visual communication design"]),
      specialization("UX/UI Design", ["user experience design", "user interface design", "ux design", "ui design"]),
      specialization("Product and Industrial Design", ["product design", "industrial design"]),
      specialization("Fashion Design", ["fashion"]),
      specialization("Fine Arts", ["studio art", "visual fine arts"]),
      specialization("Animation", ["2d animation", "3d animation", "motion graphics"]),
      specialization("Illustration", ["illustration art"]),
      specialization("Photography", ["photographic arts"]),
    ],
  },
  {
    id: "media_communications_journalism",
    canonical: "Media, Communications & Journalism",
    featured: false,
    aliases: ["media", "communications", "journalism", "mass communication", "broadcasting"],
    specializations: [
      specialization("Journalism", ["news reporting", "journalistic studies", "journalism media studies"]),
      specialization("Communications", ["communication studies", "mass communication"]),
      specialization("Public Relations", ["pr", "corporate communications"]),
      specialization("Film and Television Production", ["film production", "television production", "film and tv"]),
      specialization("Digital Media", ["new media", "digital communications"]),
      specialization("Media Studies", ["media research"]),
      specialization("Strategic Communications", ["strategic communication", "political communication"]),
    ],
  },
  {
    id: "environment_sustainability_climate",
    canonical: "Environment, Sustainability & Climate Studies",
    featured: false,
    aliases: ["environment", "environmental studies", "sustainability", "climate", "climate change", "ecology"],
    specializations: [
      specialization("Environmental Science", ["environmental studies", "environmental sciences"]),
      specialization("Sustainability", ["sustainable development", "sustainability studies"]),
      specialization("Climate Science", ["climate studies", "climate change science"]),
      specialization("Conservation and Ecology", ["conservation biology", "ecology"]),
      specialization("Renewable Energy", ["clean energy", "sustainable energy"]),
      specialization("Environmental Policy", ["environmental governance"]),
      specialization("Natural Resource Management", ["resource management"]),
    ],
  },
  {
    id: "agriculture_food_veterinary",
    canonical: "Agriculture, Food & Veterinary Sciences",
    featured: false,
    aliases: ["agriculture", "farming", "food science", "veterinary", "animal science", "forestry"],
    specializations: [
      specialization("Agricultural Science", ["agricultural sciences", "agriculture", "agriculture sciences"]),
      specialization("Agronomy", ["crop science", "soil and crop science"]),
      specialization("Food Science", ["food technology", "food sciences"]),
      specialization("Animal Science", ["animal husbandry"]),
      specialization("Veterinary Medicine", ["veterinary science", "veterinary studies", "vet medicine"]),
      specialization("Forestry", ["forest science"]),
      specialization("Horticulture", ["horticultural science"]),
      specialization("Agricultural Economics", ["agricultural business"]),
    ],
  },
  {
    id: "hospitality_tourism_event_management",
    canonical: "Hospitality, Tourism & Event Management",
    featured: false,
    aliases: ["hospitality", "tourism", "travel", "events", "hotel management", "culinary", "hospitality tourism management"],
    specializations: [
      specialization("Hospitality Management", ["hospitality studies"]),
      specialization("Tourism Management", ["tourism studies", "travel and tourism"]),
      specialization("Event Management", ["events management"]),
      specialization("Hotel Management", ["hotel administration"]),
      specialization("Culinary Arts", ["culinary management", "cooking"]),
      specialization("Travel Management", ["travel industry management"]),
    ],
  },
  {
    id: "sports_science_exercise_kinesiology",
    canonical: "Sports Science, Exercise & Kinesiology",
    featured: false,
    aliases: ["sports", "sport science", "exercise", "kinesiology", "physical education", "fitness"],
    specializations: [
      specialization("Sports Science", ["sport science", "sports studies"]),
      specialization("Exercise Science", ["exercise physiology"]),
      specialization("Kinesiology", ["human movement science"]),
      specialization("Sports Management", ["sport management"]),
      specialization("Physical Education", ["pe", "physical education and sport"]),
      specialization("Exercise Rehabilitation", ["sports rehabilitation", "exercise therapy"]),
    ],
  },
  {
    id: "public_policy_public_administration",
    canonical: "Public Policy & Public Administration",
    featured: false,
    aliases: ["public policy", "public administration", "government", "governance", "public service"],
    specializations: [
      specialization("Public Policy", ["policy studies", "government policy"]),
      specialization("Public Administration", ["public management", "government administration"]),
      specialization("Governance", ["good governance", "public governance"]),
      specialization("International Development", ["global development", "development policy"]),
      specialization("Development Studies", ["development", "international development studies"]),
      specialization("Nonprofit Management", ["non-profit management", "nonprofit leadership"]),
      specialization("Public Finance", ["government finance", "public sector finance"]),
    ],
  },
];

const AREAS_BY_ID = new Map(STUDY_INTEREST_AREAS.map((area) => [area.id, area]));
const SPECIALIZATIONS_BY_KEY = new Map(
  STUDY_INTEREST_AREAS.flatMap((area) => area.specializations.map((item) => [`${area.id}:${item.id}`, item] as const))
);

export function getStudyArea(areaId: string): StudyInterestArea | undefined {
  return AREAS_BY_ID.get(areaId);
}

export function getStudySpecialization(areaId: string, specializationId: string): StudySpecialization | undefined {
  return SPECIALIZATIONS_BY_KEY.get(`${areaId}:${specializationId}`);
}

export function normalizeStudySearchText(value: string): string {
  return value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim()
    .replace(/\s+/g, " ");
}

/** Match complete search words while also supporting short forms such as CS/AI/HR. */
export function studyInterestSearchMatches(query: string, candidates: string[]): boolean {
  const normalizedQuery = normalizeStudySearchText(query);
  if (!normalizedQuery) return true;
  return candidates.some((candidate) => {
    const normalizedCandidate = normalizeStudySearchText(candidate);
    if (!normalizedCandidate) return false;
    if (normalizedCandidate.includes(normalizedQuery)) return true;
    const queryWords = normalizedQuery.split(" ");
    const candidateWords = new Set(normalizedCandidate.split(" "));
    return queryWords.length > 1 && queryWords.every((word) => candidateWords.has(word));
  });
}

export type StudyInterestValidationCode = "required" | "limit" | "invalid" | "otherRequired" | "otherInvalid";

export function validateStudyInterestSelections(
  selections: StudyInterestSelection[]
): StudyInterestValidationCode | null {
  if (!Array.isArray(selections) || selections.length === 0) return "required";
  if (selections.length > MAX_STUDY_INTERESTS) return "limit";

  const exploring = selections.filter((selection) => selection.kind === "exploring");
  if (exploring.length > 0) return selections.length === 1 ? null : "invalid";

  const seen = new Set<string>();
  const selectedAreaIds = new Set<string>();
  const selectedSpecializationAreaIds = new Set<string>();
  let otherCount = 0;

  for (const selection of selections) {
    if (!selection || typeof selection !== "object") return "invalid";
    if (selection.kind === "area") {
      if (!getStudyArea(selection.areaId)) return "invalid";
      const key = `area:${selection.areaId}`;
      if (seen.has(key)) return "invalid";
      seen.add(key);
      selectedAreaIds.add(selection.areaId);
    } else if (selection.kind === "specialization") {
      if (!getStudySpecialization(selection.areaId, selection.specializationId)) return "invalid";
      const key = `specialization:${selection.areaId}:${selection.specializationId}`;
      if (seen.has(key)) return "invalid";
      seen.add(key);
      selectedSpecializationAreaIds.add(selection.areaId);
    } else if (selection.kind === "other") {
      otherCount += 1;
      if (otherCount > 1) return "invalid";
      const value = typeof selection.value === "string" ? selection.value.trim().normalize("NFC") : "";
      if (!value) return "otherRequired";
      if (!isValidCustomStudyInterest(value)) return "otherInvalid";
      const key = `other:${normalizeStudySearchText(value)}`;
      if (seen.has(key)) return "invalid";
      seen.add(key);
    } else {
      return "invalid";
    }
  }

  // A broad area and one of its specializations are alternative selections,
  // not duplicate slots. Selecting a specialization replaces that broad area.
  for (const areaId of selectedAreaIds) {
    if (selectedSpecializationAreaIds.has(areaId)) return "invalid";
  }

  return null;
}

export function isValidCustomStudyInterest(value: string): boolean {
  const normalized = value.trim().normalize("NFC");
  return (
    normalized.length >= 2 &&
    normalized.length <= MAX_CUSTOM_STUDY_INTEREST_LENGTH &&
    /[\p{L}\p{N}]/u.test(normalized) &&
    !/[\u0000-\u001f\u007f]/u.test(normalized)
  );
}

export function isStudyInterestSelectionValid(selections: StudyInterestSelection[]): boolean {
  return validateStudyInterestSelections(selections) === null;
}

/** Serialize validated UI selections; callers validate before persisting. */
export function serializeStudyInterestSelections(selections: StudyInterestSelection[]): string {
  return JSON.stringify(selections);
}

/** Strictly parse the structured profile/API representation. */
export function parseStudyInterestSelections(raw: unknown): StudyInterestSelection[] | null {
  let candidate: unknown = raw;
  if (typeof raw === "string") {
    try {
      candidate = JSON.parse(raw);
    } catch {
      return null;
    }
  }
  if (!Array.isArray(candidate)) return null;

  const selections: StudyInterestSelection[] = [];
  for (const item of candidate) {
    if (!item || typeof item !== "object" || Array.isArray(item)) return null;
    const value = item as Record<string, unknown>;
    if (value.kind === "area" && typeof value.areaId === "string") {
      selections.push({ kind: "area", areaId: value.areaId });
    } else if (
      value.kind === "specialization" &&
      typeof value.areaId === "string" &&
      typeof value.specializationId === "string"
    ) {
      selections.push({ kind: "specialization", areaId: value.areaId, specializationId: value.specializationId });
    } else if (value.kind === "other" && typeof value.value === "string") {
      selections.push({ kind: "other", value: value.value.trim().normalize("NFC") });
    } else if (value.kind === "exploring") {
      selections.push({ kind: "exploring" });
    } else {
      return null;
    }
  }

  return isStudyInterestSelectionValid(selections) ? selections : null;
}

/**
 * Legacy target_major migration for display only; it never writes to the DB.
 * Known legacy majors become stable taxonomy IDs. Unknown values remain
 * visible and editable as Other instead of being discarded.
 */
export function selectionsFromLegacyTargetMajor(value: string | null | undefined): StudyInterestSelection[] {
  const raw = typeof value === "string" ? value.trim() : "";
  if (!raw) return [];
  const normalized = normalizeStudySearchText(raw);

  for (const area of STUDY_INTEREST_AREAS) {
    for (const item of area.specializations) {
      if ([item.canonical, ...item.aliases].some((candidate) => normalizeStudySearchText(candidate) === normalized)) {
        return [{ kind: "specialization", areaId: area.id, specializationId: item.id }];
      }
    }
  }
  for (const area of STUDY_INTEREST_AREAS) {
    if ([area.canonical, ...area.aliases].some((candidate) => normalizeStudySearchText(candidate) === normalized)) {
      return [{ kind: "area", areaId: area.id }];
    }
  }
  return [{ kind: "other", value: raw }];
}

/** Prefer saved structured selections; fall back to the original text major. */
export function selectionsFromProfile(
  savedStudyInterests: string | null | undefined,
  legacyTargetMajor: string | null | undefined,
  options: { ignoreDefaultComputerScience?: boolean } = {}
): StudyInterestSelection[] {
  const saved = parseStudyInterestSelections(savedStudyInterests);
  if (saved) return saved;

  if (
    options.ignoreDefaultComputerScience &&
    normalizeStudySearchText(legacyTargetMajor || "") === normalizeStudySearchText("Computer Science")
  ) {
    return [];
  }
  return selectionsFromLegacyTargetMajor(legacyTargetMajor);
}

/**
 * Expand a selected broad area to its own suggested specializations so the
 * existing subjectAffinity matcher can compare them with each real catalog
 * program field. No catalog facts are created or inferred here.
 */
export function studyInterestRecommendationTerms(selections: StudyInterestSelection[]): string[] {
  const terms: string[] = [];
  for (const selection of selections) {
    if (selection.kind === "area") {
      const area = getStudyArea(selection.areaId);
      if (area) terms.push(area.canonical, ...area.specializations.map((item) => item.canonical));
    } else if (selection.kind === "specialization") {
      const item = getStudySpecialization(selection.areaId, selection.specializationId);
      if (item) terms.push(item.canonical);
    } else if (selection.kind === "other") {
      const custom = selection.value.trim();
      if (custom) terms.push(custom);
    }
  }

  const seen = new Set<string>();
  return terms.filter((term) => {
    const key = normalizeStudySearchText(term);
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

/** Canonical, non-localized labels for API provenance and legacy target_major. */
export function studyInterestDisplayTerms(selections: StudyInterestSelection[]): string[] {
  return selections.flatMap((selection) => {
    if (selection.kind === "area") return [getStudyArea(selection.areaId)?.canonical ?? ""].filter(Boolean);
    if (selection.kind === "specialization") return [getStudySpecialization(selection.areaId, selection.specializationId)?.canonical ?? ""].filter(Boolean);
    if (selection.kind === "other") return [selection.value.trim()].filter(Boolean);
    return [];
  });
}

/** Keep old consumers working without ever storing the literal exploration option. */
export function compatibilityTargetMajor(selections: StudyInterestSelection[]): string {
  if (selections.length === 1 && selections[0]?.kind === "exploring") return "";
  return studyInterestDisplayTerms(selections)[0] ?? "";
}

export function studyInterestTranslationReference(
  value: string
): { kind: "area"; id: string } | { kind: "specialization"; id: string } | null {
  const normalized = normalizeStudySearchText(value);
  if (!normalized) return null;

  for (const area of STUDY_INTEREST_AREAS) {
    if ([area.canonical, ...area.aliases].some((term) => normalizeStudySearchText(term) === normalized)) {
      return { kind: "area", id: area.id };
    }
    for (const item of area.specializations) {
      if ([item.canonical, ...item.aliases].some((term) => normalizeStudySearchText(term) === normalized)) {
        return { kind: "specialization", id: item.id };
      }
    }
  }
  return null;
}
