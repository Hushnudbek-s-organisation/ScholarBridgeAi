/**
 * Preview / sandbox fallback when DATABASE_URL is missing or the DB is down.
 * MIT / Oxford / TUM — enough for UniversityDetail hero and list views.
 */

export type MockUniversity = {
  id: number;
  name: string;
  country: string;
  city: string;
  flagEmoji: string;
  worldRanking: number;
  universityType: string;
  foundedYear: number;
  address: string;
  degreeLevel: string;
  programMajor: string;
  annualTuitionUsd: number;
  annualLivingEstUsd: number;
  accommodationCostUsd: number;
  annualTuition: number;
  tuitionCurrency: string;
  tuitionPeriod: string;
  annualLivingEst: number;
  livingCostCurrency: string;
  livingCostPeriod: string;
  accommodationCost: number;
  accommodationCostCurrency: string;
  accommodationCostPeriod: string;
  applicationFee: number;
  applicationFeeCurrency: string;
  minGpa: number;
  minIelts: number;
  minSat: number;
  acceptanceRate: number;
  postStudyWorkVisaYears: number;
  internationalStudentsCount: number;
  internationalStudentsPercentage: number;
  description: string;
  highlights: string;
  websiteUrl: string;
  officialWebsiteUrl: string;
  admissionsUrl: string;
  internationalAdmissionsUrl: string;
  undergraduateAdmissionsUrl: string;
  applicationUrl: string;
  imageUrl: string;
  verificationStatus: string;
  lastVerifiedAt: string | null;
  sourceUrl: string;
};

export const MOCK_UNIVERSITIES: MockUniversity[] = [
  {
    id: 1,
    name: "Massachusetts Institute of Technology (MIT)",
    country: "United States",
    city: "Cambridge, MA",
    flagEmoji: "🇺🇸",
    worldRanking: 1,
    universityType: "Private",
    foundedYear: 1861,
    address: "77 Massachusetts Avenue, Cambridge, MA 02139",
    degreeLevel: "All",
    programMajor: "Computer Science & Artificial Intelligence",
    annualTuitionUsd: 59750,
    annualLivingEstUsd: 21000,
    accommodationCostUsd: 14000,
    annualTuition: 59750,
    tuitionCurrency: "USD",
    tuitionPeriod: "year",
    annualLivingEst: 21000,
    livingCostCurrency: "USD",
    livingCostPeriod: "year",
    accommodationCost: 14000,
    accommodationCostCurrency: "USD",
    accommodationCostPeriod: "year",
    applicationFee: 75,
    applicationFeeCurrency: "USD",
    minGpa: 3.85,
    minIelts: 7.5,
    minSat: 1530,
    acceptanceRate: 4.8,
    postStudyWorkVisaYears: 3.0,
    internationalStudentsCount: 3500,
    internationalStudentsPercentage: 29,
    description:
      "World leader in technology, AI research, and engineering. MIT provides cutting-edge labs, startup incubators, and unmatched industry connections.",
    highlights: JSON.stringify([
      "OPT STEM 3-Year Extension",
      "World #1 CS Program",
      "Generous Need-Blind Aid",
      "CSAIL Research Lab",
    ]),
    websiteUrl: "https://www.mit.edu",
    officialWebsiteUrl: "https://www.mit.edu",
    admissionsUrl: "https://admissions.mit.edu",
    internationalAdmissionsUrl: "https://admissions.mit.edu/apply/international",
    undergraduateAdmissionsUrl: "https://admissions.mit.edu",
    applicationUrl: "https://apply.mitadmissions.org",
    imageUrl:
      "https://images.unsplash.com/photo-1564981797816-1043664bf78d?q=80&w=1600&auto=format&fit=crop",
    verificationStatus: "unverified",
    lastVerifiedAt: null,
    sourceUrl: "https://www.mit.edu",
  },
  {
    id: 2,
    name: "University of Oxford",
    country: "United Kingdom",
    city: "Oxford",
    flagEmoji: "🇬🇧",
    worldRanking: 3,
    universityType: "Public",
    foundedYear: 1096,
    address: "University of Oxford, Oxford OX1 2JD, United Kingdom",
    degreeLevel: "Master",
    programMajor: "Advanced Computer Science & Data Science",
    annualTuitionUsd: 41200,
    annualLivingEstUsd: 18500,
    accommodationCostUsd: 12000,
    annualTuition: 41200,
    tuitionCurrency: "USD",
    tuitionPeriod: "year",
    annualLivingEst: 18500,
    livingCostCurrency: "USD",
    livingCostPeriod: "year",
    accommodationCost: 12000,
    accommodationCostCurrency: "USD",
    accommodationCostPeriod: "year",
    applicationFee: 75,
    applicationFeeCurrency: "GBP",
    minGpa: 3.75,
    minIelts: 7.5,
    minSat: 1480,
    acceptanceRate: 14.2,
    postStudyWorkVisaYears: 2.0,
    internationalStudentsCount: 12000,
    internationalStudentsPercentage: 45,
    description:
      "Historic university renowned for academic excellence, tutorial system, and world-class AI and machine learning departments.",
    highlights: JSON.stringify([
      "UK Graduate Route 2-Yr Visa",
      "Rhodes & Clarendon Scholarships",
      "College Tutorial System",
      "DeepMind Chair Hub",
    ]),
    websiteUrl: "https://www.ox.ac.uk",
    officialWebsiteUrl: "https://www.ox.ac.uk",
    admissionsUrl: "https://www.ox.ac.uk/admissions",
    internationalAdmissionsUrl: "https://www.ox.ac.uk/admissions/graduate/international-students",
    undergraduateAdmissionsUrl: "https://www.ox.ac.uk/admissions/undergraduate",
    applicationUrl: "https://www.ox.ac.uk/admissions/graduate/applying-to-oxford",
    imageUrl:
      "https://images.unsplash.com/photo-1541339907198-e08756dedf3f?q=80&w=1600&auto=format&fit=crop",
    verificationStatus: "unverified",
    lastVerifiedAt: null,
    sourceUrl: "https://www.ox.ac.uk",
  },
  {
    id: 3,
    name: "Technical University of Munich (TUM)",
    country: "Germany",
    city: "Munich",
    flagEmoji: "🇩🇪",
    worldRanking: 28,
    universityType: "Public",
    foundedYear: 1868,
    address: "Arcisstraße 21, 80333 München, Germany",
    degreeLevel: "Master",
    programMajor: "Informatics & Data Engineering",
    annualTuitionUsd: 3200,
    annualLivingEstUsd: 13500,
    accommodationCostUsd: 7200,
    annualTuition: 3200,
    tuitionCurrency: "USD",
    tuitionPeriod: "year",
    annualLivingEst: 13500,
    livingCostCurrency: "USD",
    livingCostPeriod: "year",
    accommodationCost: 7200,
    accommodationCostCurrency: "USD",
    accommodationCostPeriod: "year",
    applicationFee: 0,
    applicationFeeCurrency: "EUR",
    minGpa: 3.2,
    minIelts: 6.5,
    minSat: 1280,
    acceptanceRate: 22.5,
    postStudyWorkVisaYears: 1.5,
    internationalStudentsCount: 14000,
    internationalStudentsPercentage: 32,
    description:
      "Europe's leading technical university with virtually free/low tuition, top European industry partnerships (BMW, Siemens, Google Munich), and English-taught Master's.",
    highlights: JSON.stringify([
      "Ultra Low Tuition Fees",
      "18-Month Post-Study Job Seeker Visa",
      "Strong Tech Ecosystem",
      "DAAD Eligible",
    ]),
    websiteUrl: "https://www.tum.de",
    officialWebsiteUrl: "https://www.tum.de",
    admissionsUrl: "https://www.tum.de/en/studies/application",
    internationalAdmissionsUrl: "https://www.tum.de/en/studies/international-students",
    undergraduateAdmissionsUrl: "https://www.tum.de/en/studies/degree-programs",
    applicationUrl: "https://campus.tum.de",
    imageUrl:
      "https://images.unsplash.com/photo-1592285853127-6f62b210f8a8?q=80&w=1600&auto=format&fit=crop",
    verificationStatus: "unverified",
    lastVerifiedAt: null,
    sourceUrl: "https://www.tum.de",
  },
];

export function getMockUniversity(id: number): MockUniversity {
  return MOCK_UNIVERSITIES.find((u) => u.id === id) ?? MOCK_UNIVERSITIES[0];
}

export function mockUniversityListPayload() {
  return {
    universities: MOCK_UNIVERSITIES.map((uni) => ({
      ...uni,
      matchScore: null,
      matchCategory: null,
      matchReasons: [],
      matchIssues: [],
      sourceUrl: uni.sourceUrl,
      sourceTitle: uni.name,
      sourceLastVerifiedAt: null,
    })),
  };
}

export function mockUniversityDetailPayload(id: number) {
  const uni = getMockUniversity(id);
  return {
    university: uni,
    money: {
      annualTuition: uni.annualTuition,
      tuitionCurrency: uni.tuitionCurrency,
      tuitionPeriod: uni.tuitionPeriod,
      annualLivingEstimate: uni.annualLivingEst,
      livingCostCurrency: uni.livingCostCurrency,
      livingCostPeriod: uni.livingCostPeriod,
      accommodationCost: uni.accommodationCost,
      accommodationCostCurrency: uni.accommodationCostCurrency,
      accommodationCostPeriod: uni.accommodationCostPeriod,
      applicationFee: uni.applicationFee,
      applicationFeeCurrency: uni.applicationFeeCurrency,
    },
    universityRequirements: {
      ielts: { values: [uni.minIelts], min: uni.minIelts, max: uni.minIelts, range: String(uni.minIelts), single: uni.minIelts },
      toefl: null,
      duolingo: null,
      gpa: { values: [uni.minGpa], min: uni.minGpa, max: uni.minGpa, range: String(uni.minGpa), single: uni.minGpa },
      sat: { values: [uni.minSat], min: uni.minSat, max: uni.minSat, range: String(uni.minSat), single: uni.minSat },
      act: null,
      pte: null,
      cambridgeEnglish: null,
      satRequired: true,
      actRequired: false,
      satMinimumPublished: true,
      actMinimumPublished: false,
      portfolioRequired: false,
      interviewRequired: false,
      recommendationRequired: true,
      personalStatementRequired: true,
      other: [],
      subject: [],
    },
    programs: [
      {
        id: uni.id * 10,
        name: uni.programMajor,
        field: uni.programMajor,
        degree: uni.degreeLevel === "All" ? "Bachelor's / Master's" : uni.degreeLevel,
        durationYears: 2,
        durationUnit: "years",
        studyMode: "full-time",
        language: "English",
        tuitionAmount: uni.annualTuition,
        tuitionCurrency: uni.tuitionCurrency,
        tuitionPeriod: uni.tuitionPeriod,
        description: uni.description,
        applicationDeadline: null,
        minIelts: uni.minIelts,
        minToefl: null,
        minDuolingo: null,
        minSat: uni.minSat,
        minAct: null,
        minGpa: uni.minGpa,
        portfolioRequired: false,
        interviewRequired: false,
        recommendationRequired: true,
        personalStatementRequired: true,
        programUrl: uni.admissionsUrl,
        applicationUrl: uni.applicationUrl,
        isVerified: false,
        requirements: [
          { requirementType: "ielts", minimumValue: uni.minIelts, valueText: null },
          { requirementType: "gpa", minimumValue: uni.minGpa, valueText: null },
          { requirementType: "sat", minimumValue: uni.minSat, valueText: null },
        ],
      },
    ],
    applicationCycles: [
      {
        id: uni.id * 100,
        cycleYear: 2027,
        academicYear: "2027-2028",
        intake: "Fall",
        applicationType: "Regular Decision",
        openingDate: "2026-09-01",
        deadline: "2027-01-15",
        deadlineTimezone: "UTC",
        applicationFee: uni.applicationFee,
        applicationFeeCurrency: uni.applicationFeeCurrency,
        applicationUrl: uni.applicationUrl,
        isVerified: false,
        isEstimated: true,
      },
    ],
    sources: [],
    scholarships: [],
    campuses: [],
    images: [],
  };
}
