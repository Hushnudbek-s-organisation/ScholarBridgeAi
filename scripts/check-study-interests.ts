import { readFileSync } from "node:fs";
import {
  MAX_STUDY_INTERESTS,
  STUDY_INTEREST_AREAS,
  compatibilityTargetMajor,
  isStudyInterestSelectionValid,
  parseStudyInterestSelections,
  selectionsFromLegacyTargetMajor,
  selectionsFromProfile,
  serializeStudyInterestSelections,
  studyInterestRecommendationTerms,
  studyInterestSearchMatches,
  validateStudyInterestSelections,
  type StudyInterestSelection,
} from "../src/lib/studyInterests";
import { subjectAffinity } from "../src/lib/recommend";

let passed = 0;
let failed = 0;

function check(name: string, condition: boolean, detail = "") {
  if (condition) {
    passed++;
    console.log(`  ✓ ${name}`);
  } else {
    failed++;
    console.log(`  ✗ ${name}${detail ? ` — ${detail}` : ""}`);
  }
}

console.log("Study-interest taxonomy, validation, localization and recommender mapping");

const expectedTaxonomy = [
  ["business_management_entrepreneurship", "Business, Management & Entrepreneurship", ["Business Administration", "Management", "Marketing", "Entrepreneurship", "Human Resources", "Supply Chain Management", "International Business", "Business Analytics", "Project Management"]],
  ["computer_science_it_software", "Computer Science, IT & Software", ["Computer Science", "Software Engineering", "Information Technology", "Cybersecurity", "Information Systems", "Computer Engineering", "Web and Mobile Development"]],
  ["engineering_technology", "Engineering & Technology", ["Civil Engineering", "Mechanical Engineering", "Electrical and Electronic Engineering", "Chemical Engineering", "Aerospace Engineering", "Biomedical Engineering", "Industrial and Manufacturing Engineering", "Materials Engineering", "Mechatronics"]],
  ["medicine_health_sciences", "Medicine & Health Sciences", ["Medicine", "Nursing", "Dentistry", "Pharmacy", "Public Health", "Biomedical Sciences", "Nutrition and Dietetics", "Physiotherapy", "Allied Health"]],
  ["data_science_ai_analytics", "Data Science, Artificial Intelligence & Analytics", ["Data Science", "Artificial Intelligence", "Machine Learning", "Data Analytics", "Business Analytics", "Big Data"]],
  ["economics_finance_accounting", "Economics, Finance & Accounting", ["Economics", "Finance", "Accounting", "Banking", "Actuarial Science", "Financial Technology"]],
  ["psychology_behavioral_sciences", "Psychology & Behavioral Sciences", ["Psychology", "Clinical Psychology", "Counseling", "Behavioral Science", "Cognitive Science", "Organizational Psychology"]],
  ["natural_sciences_math_statistics", "Natural Sciences, Mathematics & Statistics", ["Biology", "Chemistry", "Physics", "Mathematics", "Statistics", "Earth Sciences", "Geology", "Astronomy"]],
  ["social_sciences_international_relations", "Social Sciences & International Relations", ["Sociology", "Anthropology", "Human Geography", "International Relations", "Political Science", "Social Work", "Criminology"]],
  ["arts_humanities_languages", "Arts, Humanities & Languages", ["History", "Literature", "Philosophy", "Linguistics", "Modern Languages", "Religious Studies", "Cultural Studies", "Classics"]],
  ["law_legal_studies", "Law & Legal Studies", ["Law", "International Law", "Business and Corporate Law", "Human Rights Law", "Criminal Law", "Intellectual Property Law", "Legal Studies"]],
  ["education_teaching", "Education & Teaching", ["Primary Education", "Secondary Education", "Early Childhood Education", "Special Education", "Educational Leadership", "Curriculum and Instruction", "Language Education"]],
  ["architecture_urban_planning_built_environment", "Architecture, Urban Planning & Built Environment", ["Architecture", "Urban Planning", "Landscape Architecture", "Construction Management", "Quantity Surveying", "Real Estate Development", "Interior Architecture"]],
  ["design_fine_arts_creative_media", "Design, Fine Arts & Creative Media", ["Graphic Design", "UX/UI Design", "Product and Industrial Design", "Fashion Design", "Fine Arts", "Animation", "Illustration", "Photography"]],
  ["media_communications_journalism", "Media, Communications & Journalism", ["Journalism", "Communications", "Public Relations", "Film and Television Production", "Digital Media", "Media Studies", "Strategic Communications"]],
  ["environment_sustainability_climate", "Environment, Sustainability & Climate Studies", ["Environmental Science", "Sustainability", "Climate Science", "Conservation and Ecology", "Renewable Energy", "Environmental Policy", "Natural Resource Management"]],
  ["agriculture_food_veterinary", "Agriculture, Food & Veterinary Sciences", ["Agricultural Science", "Agronomy", "Food Science", "Animal Science", "Veterinary Medicine", "Forestry", "Horticulture", "Agricultural Economics"]],
  ["hospitality_tourism_event_management", "Hospitality, Tourism & Event Management", ["Hospitality Management", "Tourism Management", "Event Management", "Hotel Management", "Culinary Arts", "Travel Management"]],
  ["sports_science_exercise_kinesiology", "Sports Science, Exercise & Kinesiology", ["Sports Science", "Exercise Science", "Kinesiology", "Sports Management", "Physical Education", "Exercise Rehabilitation"]],
  ["public_policy_public_administration", "Public Policy & Public Administration", ["Public Policy", "Public Administration", "Governance", "International Development", "Development Studies", "Nonprofit Management", "Public Finance"]],
] as const;
const actualTaxonomy = STUDY_INTEREST_AREAS.map((area) => [area.id, area.canonical, area.specializations.map((item) => item.canonical)]);
check("matches the exact 20-area taxonomy, labels, and ordered specialization lists", JSON.stringify(actualTaxonomy) === JSON.stringify(expectedTaxonomy));
check("first ten are featured and the remaining ten are on demand", STUDY_INTEREST_AREAS.slice(0, 10).every((area) => area.featured) && STUDY_INTEREST_AREAS.slice(10).every((area) => !area.featured));
check("all 145 provided specializations are present", STUDY_INTEREST_AREAS.reduce((count, area) => count + area.specializations.length, 0) === 145);
check("area IDs are unique", new Set(STUDY_INTEREST_AREAS.map((area) => area.id)).size === 20);

for (const locale of ["en", "uz", "ru"]) {
  const messages = JSON.parse(readFileSync(`src/i18n/messages/${locale}.json`, "utf8"));
  const study = messages.studyInterest;
  const areaLabelsPresent = STUDY_INTEREST_AREAS.every((area) => typeof study?.areaLabels?.[area.id] === "string" && study.areaLabels[area.id].trim());
  const specializationLabelsPresent = STUDY_INTEREST_AREAS.every((area) =>
    area.specializations.every((item) => typeof study?.specializationLabels?.[item.id] === "string" && study.specializationLabels[item.id].trim())
  );
  const controlsPresent = ["searchPlaceholder", "viewAllFields", "other", "exploring", "requiredError", "otherInvalidError"]
    .every((key) => typeof study?.[key] === "string" && study[key].trim());
  check(`${locale}: all broad-area and specialization labels are translated`, areaLabelsPresent && specializationLabelsPresent);
  if (locale === "en") {
    const exactEnglishLabels = STUDY_INTEREST_AREAS.every((area) =>
      study.areaLabels[area.id] === area.canonical &&
      area.specializations.every((item) => study.specializationLabels[item.id] === item.canonical)
    );
    check("en: visible labels exactly match the supplied canonical taxonomy", exactEnglishLabels);
  }
  check(`${locale}: ampersands are rendered as text, not HTML entities`,
    [...Object.values(study.areaLabels ?? {}), ...Object.values(study.specializationLabels ?? {})]
      .every((label) => typeof label === "string" && !label.includes("&amp;")));
  check(`${locale}: picker controls, helper and validation text are translated`, controlsPresent);
}

check("search aliases resolve short forms such as CS and AI", studyInterestSearchMatches("CS", ["Computer Science", "cs"]) && studyInterestSearchMatches("AI", ["Artificial Intelligence", "ai"]));
check("search handles an alias such as cyber security", (() => {
  const cybersecurity = STUDY_INTEREST_AREAS.flatMap((area) => area.specializations).find((item) => item.id === "cybersecurity");
  return Boolean(cybersecurity && studyInterestSearchMatches("cyber security", [cybersecurity.canonical, ...cybersecurity.aliases]));
})());
check("search can use localized labels", (() => {
  const uz = JSON.parse(readFileSync("src/i18n/messages/uz.json", "utf8"));
  return studyInterestSearchMatches("kiberxavfsizlik", [uz.studyInterest.specializationLabels.cybersecurity]);
})());

const fiveSelections: StudyInterestSelection[] = STUDY_INTEREST_AREAS.slice(0, MAX_STUDY_INTERESTS).map((area) => ({ kind: "area", areaId: area.id }));
check("five stable-ID selections are valid", isStudyInterestSelectionValid(fiveSelections));
check("six selections are rejected", validateStudyInterestSelections([...fiveSelections, { kind: "other", value: "Marine robotics" }]) === "limit");
check("serialized profile selections restore the same stable IDs", JSON.stringify(parseStudyInterestSelections(serializeStudyInterestSelections(fiveSelections))) === JSON.stringify(fiveSelections));
check("unknown area IDs are rejected", parseStudyInterestSelections([{ kind: "area", areaId: "localized-business-label" }]) === null);
check("a broad area and a specialization in the same area cannot double-count", !isStudyInterestSelectionValid([
  { kind: "area", areaId: "computer_science_it_software" },
  { kind: "specialization", areaId: "computer_science_it_software", specializationId: "computer_science" },
]));

const otherBlank: StudyInterestSelection[] = [{ kind: "other", value: "  " }];
check("Other cannot be saved without custom text", validateStudyInterestSelections(otherBlank) === "otherRequired");
check("custom text rejects control characters", !isStudyInterestSelectionValid([{ kind: "other", value: "CS\nadmin" }]));
check("a 160-character custom subject is allowed; longer values are rejected", isStudyInterestSelectionValid([{ kind: "other", value: "A".repeat(160) }]) && !isStudyInterestSelectionValid([{ kind: "other", value: "A".repeat(161) }]));
check("exploration is a valid exclusive selection", isStudyInterestSelectionValid([{ kind: "exploring" }]) && !isStudyInterestSelectionValid([{ kind: "exploring" }, { kind: "area", areaId: "engineering_technology" }]));
check("exploration never becomes a literal target major or match term", compatibilityTargetMajor([{ kind: "exploring" }]) === "" && studyInterestRecommendationTerms([{ kind: "exploring" }]).length === 0);
check("empty exploration remains unknown to subjectAffinity", subjectAffinity(studyInterestRecommendationTerms([{ kind: "exploring" }]), "Nursing").level === "unknown");

const healthTerms = studyInterestRecommendationTerms([{ kind: "area", areaId: "medicine_health_sciences" }]);
check("broad health area expands only into its supplied catalog subjects", healthTerms.includes("Medicine") && healthTerms.includes("Nursing") && healthTerms.includes("Pharmacy"));
check("the existing recommender matches a broad health choice to a real nursing field", subjectAffinity(healthTerms, "Nursing").level === "exact");
const csTerms = studyInterestRecommendationTerms([{ kind: "specialization", areaId: "computer_science_it_software", specializationId: "computer_science" }]);
check("a selected specialization reaches the existing subject matcher", subjectAffinity(csTerms, "Computer Science").level === "exact");
check("an Other subject is matched against the catalog field, not stored as a taxonomy label", subjectAffinity(studyInterestRecommendationTerms([{ kind: "other", value: "Marine Biology" }]), "Marine Biology").level === "exact");

check("legacy target_major values map to stable IDs where known", (() => {
  const ai = selectionsFromLegacyTargetMajor("Artificial Intelligence / Machine Learning");
  const it = selectionsFromLegacyTargetMajor("Information Technology (IT)");
  return ai[0]?.kind === "specialization" && ai[0].specializationId === "artificial_intelligence" &&
    it[0]?.kind === "specialization" && it[0].specializationId === "information_technology";
})());
check("unknown legacy values remain visible as Other", selectionsFromLegacyTargetMajor("Mycology and Fungal Biology")[0]?.kind === "other");
check("new incomplete profiles do not mistake the Computer Science default for a choice", selectionsFromProfile(null, "Computer Science", { ignoreDefaultComputerScience: true }).length === 0);

console.log(`\n${failed === 0 ? "✅" : "❌"} ${passed} passed, ${failed} failed`);
process.exit(failed === 0 ? 0 : 1);
