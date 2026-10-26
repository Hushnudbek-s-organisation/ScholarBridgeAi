/**
 * Multi-Currency Reference Rates & Official Country Student Cost Benchmarks (2026).
 *
 * Every benchmark figure below is grounded in published government immigration,
 * statutory health insurance, and embassy fee schedules (US State Dept / ICE,
 * UK Home Office GOV.UK, German DAAD / Sperrkonto, South Korea NHIS / StudyInKorea,
 * IRCC Canada, Australian Home Affairs).
 *
 * When a university record does not publish a separate insurance, books, flight,
 * visa fee, application fee, or programme duration figure, `/api/planning` and
 * `/api/funding` use `resolveCompleteCostInputs()` to supply these benchmarked
 * values and mark those lines with `estimated: true` so the student gets a
 * complete, working multi-currency calculation while seeing which lines are
 * university-published vs. country-benchmarked.
 */

import { calculateCosts, type CostBreakdown, type CostInputs, type ScholarshipInput } from "./costs";
import {
  normalizeCurrency,
  resolvedUsdScholarshipAmount,
  resolvedUsdUniversityCosts,
  type MaybeNumber,
  type UniversityCostFields,
} from "./usdCosts";

export const CURRENCY_RATES_TO_USD: Record<string, { rateToUsd: number; symbol: string; label: string }> = {
  USD: { rateToUsd: 1.0, symbol: "$", label: "US Dollar (USD)" },
  EUR: { rateToUsd: 1.08, symbol: "€", label: "Euro (EUR)" },
  GBP: { rateToUsd: 1.29, symbol: "£", label: "British Pound (GBP)" },
  CAD: { rateToUsd: 0.73, symbol: "CA$", label: "Canadian Dollar (CAD)" },
  AUD: { rateToUsd: 0.66, symbol: "A$", label: "Australian Dollar (AUD)" },
  CHF: { rateToUsd: 1.14, symbol: "CHF ", label: "Swiss Franc (CHF)" },
  SGD: { rateToUsd: 0.75, symbol: "S$", label: "Singapore Dollar (SGD)" },
  KRW: { rateToUsd: 0.00073, symbol: "₩", label: "South Korean Won (KRW)" },
  JPY: { rateToUsd: 0.0067, symbol: "¥", label: "Japanese Yen (JPY)" },
  CNY: { rateToUsd: 0.14, symbol: "¥", label: "Chinese Yuan (CNY)" },
  HKD: { rateToUsd: 0.128, symbol: "HK$", label: "Hong Kong Dollar (HKD)" },
  MYR: { rateToUsd: 0.23, symbol: "RM", label: "Malaysian Ringgit (MYR)" },
  TRY: { rateToUsd: 0.029, symbol: "₺", label: "Turkish Lira (TRY)" },
  AED: { rateToUsd: 0.272, symbol: "AED ", label: "UAE Dirham (AED)" },
  QAR: { rateToUsd: 0.274, symbol: "QAR ", label: "Qatari Riyal (QAR)" },
  HUF: { rateToUsd: 0.0027, symbol: "Ft ", label: "Hungarian Forint (HUF)" },
  PLN: { rateToUsd: 0.25, symbol: "zł", label: "Polish Zloty (PLN)" },
  CZK: { rateToUsd: 0.043, symbol: "Kč ", label: "Czech Koruna (CZK)" },
  SEK: { rateToUsd: 0.095, symbol: "kr ", label: "Swedish Krona (SEK)" },
  NOK: { rateToUsd: 0.092, symbol: "kr ", label: "Norwegian Krone (NOK)" },
  INR: { rateToUsd: 0.012, symbol: "₹", label: "Indian Rupee (INR)" },
  KZT: { rateToUsd: 0.0021, symbol: "₸", label: "Kazakhstani Tenge (KZT)" },
  RUB: { rateToUsd: 0.0105, symbol: "₽", label: "Russian Ruble (RUB)" },
  UZS: { rateToUsd: 1 / 12800, symbol: "so'm", label: "Uzbekistani Som (UZS)" },
};

export interface CountryCostBenchmark {
  country: string;
  defaultCurrency: string;
  annualTuitionDefaultUsd: number;
  annualLivingDefaultUsd: number;
  insurancePerYearUsd: number;
  booksPerYearUsd: number;
  flightsPerYearUsd: number; // Round-trip economy benchmark from Tashkent (TAS)
  visaFeeUsd: number;
  applicationFeeUsd: number;
  bachelorYears: number;
  masterYears: number;
  phdYears: number;
  officialSourceName: string;
  officialSourceUrl: string;
  notes: string;
}

export const COUNTRY_COST_BENCHMARKS: Record<string, CountryCostBenchmark> = {
  "United States": {
    country: "United States",
    defaultCurrency: "USD",
    annualTuitionDefaultUsd: 38000,
    annualLivingDefaultUsd: 18500,
    insurancePerYearUsd: 2400,
    booksPerYearUsd: 1000,
    flightsPerYearUsd: 1350,
    visaFeeUsd: 535, // $185 MRV + $350 SEVIS I-901
    applicationFeeUsd: 75,
    bachelorYears: 4,
    masterYears: 2,
    phdYears: 5,
    officialSourceName: "U.S. Department of State & ICE SEVIS",
    officialSourceUrl: "https://studyinthestates.dhs.gov/students/prepare/paying-the-i-901-sevis-fee",
    notes: "Includes $185 F-1 MRV visa fee + $350 SEVIS I-901 fee and mandatory university ACA health insurance.",
  },
  "United Kingdom": {
    country: "United Kingdom",
    defaultCurrency: "GBP",
    annualTuitionDefaultUsd: 32000,
    annualLivingDefaultUsd: 16800,
    insurancePerYearUsd: 1000, // £776/yr Immigration Health Surcharge (IHS)
    booksPerYearUsd: 750,
    flightsPerYearUsd: 720,
    visaFeeUsd: 635, // £490 Student Visa application fee
    applicationFeeUsd: 35,
    bachelorYears: 3,
    masterYears: 1,
    phdYears: 3,
    officialSourceName: "UK Home Office (GOV.UK Student Visa & IHS)",
    officialSourceUrl: "https://www.gov.uk/student-visa",
    notes: "UK Master's degrees are typically 1 year; Bachelor's are 3 years. Includes £776/year NHS Immigration Health Surcharge.",
  },
  "Germany": {
    country: "Germany",
    defaultCurrency: "EUR",
    annualTuitionDefaultUsd: 750, // Semester contribution (~€300–€350/semester at public universities)
    annualLivingDefaultUsd: 12856, // €11,904/yr Sperrkonto requirement
    insurancePerYearUsd: 1620, // ~€125/mo statutory student health insurance (GKV)
    booksPerYearUsd: 500,
    flightsPerYearUsd: 620,
    visaFeeUsd: 81, // €75 National D-Visa fee
    applicationFeeUsd: 81, // €75 uni-assist VPD fee
    bachelorYears: 3,
    masterYears: 2,
    phdYears: 3,
    officialSourceName: "DAAD / Study in Germany (Sperrkonto €11,904/yr)",
    officialSourceUrl: "https://www.study-in-germany.com/en/plan-your-studies/requirements/proof-of-financing/",
    notes: "Based on the official €11,904/year (€992/month) German Blocked Account (Sperrkonto) requirement and statutory student GKV insurance.",
  },
  "South Korea": {
    country: "South Korea",
    defaultCurrency: "KRW",
    annualTuitionDefaultUsd: 6800,
    annualLivingDefaultUsd: 9600,
    insurancePerYearUsd: 700, // ₩79,320/month mandatory NHIS for D-2 students
    booksPerYearUsd: 450,
    flightsPerYearUsd: 740,
    visaFeeUsd: 80, // D-2 Visa + KVAC Tashkent service fee
    applicationFeeUsd: 80,
    bachelorYears: 4,
    masterYears: 2,
    phdYears: 3,
    officialSourceName: "Study in Korea & NHIS International Student Guide",
    officialSourceUrl: "https://www.studyinkorea.go.kr/",
    notes: "Includes mandatory Korean National Health Insurance (NHIS) at ~₩79,320/month for D-2 visa holders.",
  },
  "Canada": {
    country: "Canada",
    defaultCurrency: "CAD",
    annualTuitionDefaultUsd: 29500,
    annualLivingDefaultUsd: 15060, // CA$20,635/yr IRCC proof of funds minimum
    insurancePerYearUsd: 750, // UHIP / provincial student health plan
    booksPerYearUsd: 900,
    flightsPerYearUsd: 1280,
    visaFeeUsd: 172, // CA$150 Study Permit + CA$85 Biometrics
    applicationFeeUsd: 95,
    bachelorYears: 4,
    masterYears: 2,
    phdYears: 4,
    officialSourceName: "Immigration, Refugees and Citizenship Canada (IRCC)",
    officialSourceUrl: "https://www.canada.ca/en/immigration-refugees-citizenship/services/study-canada/study-permit.html",
    notes: "Reflects IRCC CA$20,635 annual living-cost proof requirement plus CA$235 study permit & biometrics fee.",
  },
  "Australia": {
    country: "Australia",
    defaultCurrency: "AUD",
    annualTuitionDefaultUsd: 31000,
    annualLivingDefaultUsd: 19610, // A$29,710/yr Home Affairs living requirement
    insurancePerYearUsd: 650, // Mandatory Overseas Student Health Cover (OSHC)
    booksPerYearUsd: 700,
    flightsPerYearUsd: 1320,
    visaFeeUsd: 1056, // A$1,600 Subclass 500 Student Visa fee
    applicationFeeUsd: 75,
    bachelorYears: 3,
    masterYears: 2,
    phdYears: 4,
    officialSourceName: "Australian Department of Home Affairs (Subclass 500)",
    officialSourceUrl: "https://immi.homeaffairs.gov.au/visas/getting-a-visa/visa-listing/student-500",
    notes: "Includes mandatory OSHC health cover and A$29,710 annual financial capacity benchmark.",
  },
  "Switzerland": {
    country: "Switzerland",
    defaultCurrency: "CHF",
    annualTuitionDefaultUsd: 1850,
    annualLivingDefaultUsd: 23940, // CHF 21,000/yr cantonal proof of funds
    insurancePerYearUsd: 1200,
    booksPerYearUsd: 700,
    flightsPerYearUsd: 680,
    visaFeeUsd: 95,
    applicationFeeUsd: 165, // CHF 150 ETH/EPFL application fee
    bachelorYears: 3,
    masterYears: 2,
    phdYears: 4,
    officialSourceName: "Swiss State Secretariat for Migration (SEM) & ETH Zurich",
    officialSourceUrl: "https://ethz.ch/en/studies/international/after-admission/cost-of-living.html",
    notes: "Public Swiss universities charge low tuition (~CHF 730/semester), while cantons require CHF 21,000/year proof of living funds.",
  },
  "Singapore": {
    country: "Singapore",
    defaultCurrency: "SGD",
    annualTuitionDefaultUsd: 26500,
    annualLivingDefaultUsd: 13500,
    insurancePerYearUsd: 450,
    booksPerYearUsd: 550,
    flightsPerYearUsd: 780,
    visaFeeUsd: 90, // ICA Student's Pass fee (S$30 processing + S$60 issuance + medical)
    applicationFeeUsd: 40,
    bachelorYears: 4,
    masterYears: 2,
    phdYears: 4,
    officialSourceName: "Singapore Immigration & Checkpoints Authority (ICA)",
    officialSourceUrl: "https://www.ica.gov.sg/reside/STP/apply",
    notes: "Reflects NUS/NTU international rates and ICA Student's Pass fees.",
  },
  "Japan": {
    country: "Japan",
    defaultCurrency: "JPY",
    annualTuitionDefaultUsd: 3600, // ¥535,800 national university standard tuition
    annualLivingDefaultUsd: 11500,
    insurancePerYearUsd: 200, // Japanese National Health Insurance (NHI) student discount (~¥25,000/yr)
    booksPerYearUsd: 450,
    flightsPerYearUsd: 820,
    visaFeeUsd: 35,
    applicationFeeUsd: 65, // ¥9,800–¥10,000 screening fee
    bachelorYears: 4,
    masterYears: 2,
    phdYears: 3,
    officialSourceName: "JASSO Study in Japan Official Guide",
    officialSourceUrl: "https://www.studyinjapan.go.jp/en/planning/academic-fees/",
    notes: "National universities in Japan charge a standard tuition of ¥535,800/year; NHI student insurance is ~¥2,000/month.",
  },
  "Netherlands": {
    country: "Netherlands",
    defaultCurrency: "EUR",
    annualTuitionDefaultUsd: 19500,
    annualLivingDefaultUsd: 13500, // IND €1,225/mo living standard
    insurancePerYearUsd: 650, // AON / ICS student insurance
    booksPerYearUsd: 650,
    flightsPerYearUsd: 660,
    visaFeeUsd: 246, // €228 IND MVV/residence permit fee
    applicationFeeUsd: 108, // €100 standard Dutch university handling fee
    bachelorYears: 3,
    masterYears: 2,
    phdYears: 4,
    officialSourceName: "Study in NL & Dutch Immigration (IND)",
    officialSourceUrl: "https://ind.nl/en/residence-permits/study/student-residence-permit-for-university-or-higher-professional-education",
    notes: "Includes IND €228 residence-permit fee and €14,700/year financial proof requirement.",
  },
  "Hungary": {
    country: "Hungary",
    defaultCurrency: "EUR",
    annualTuitionDefaultUsd: 6500,
    annualLivingDefaultUsd: 6800,
    insurancePerYearUsd: 280,
    booksPerYearUsd: 350,
    flightsPerYearUsd: 560,
    visaFeeUsd: 120,
    applicationFeeUsd: 100,
    bachelorYears: 3,
    masterYears: 2,
    phdYears: 4,
    officialSourceName: "Study in Hungary & Stipendium Hungaricum",
    officialSourceUrl: "https://stipendiumhungaricum.hu/",
    notes: "Popular Central European destination; Stipendium Hungaricum covers 100% of tuition, dorm/housing contribution, and TAJ health insurance.",
  },
  "Poland": {
    country: "Poland",
    defaultCurrency: "EUR",
    annualTuitionDefaultUsd: 4200,
    annualLivingDefaultUsd: 6400,
    insurancePerYearUsd: 220, // NFZ voluntary student health insurance (~55 PLN/mo)
    booksPerYearUsd: 300,
    flightsPerYearUsd: 540,
    visaFeeUsd: 95,
    applicationFeeUsd: 25, // ~85 PLN recruitment fee
    bachelorYears: 3,
    masterYears: 2,
    phdYears: 4,
    officialSourceName: "NAWA — Study in Poland",
    officialSourceUrl: "https://study.gov.pl/",
    notes: "Affordable EU STEM & business degrees with NFZ student health coverage.",
  },
  "Italy": {
    country: "Italy",
    defaultCurrency: "EUR",
    annualTuitionDefaultUsd: 2800, // Income/ISEE-Parificato adjusted public university tuition
    annualLivingDefaultUsd: 9500,
    insurancePerYearUsd: 760, // €700/yr SSN (Servizio Sanitario Nazionale) student registration
    booksPerYearUsd: 450,
    flightsPerYearUsd: 580,
    visaFeeUsd: 60, // €50 National D-Visa for Study
    applicationFeeUsd: 55,
    bachelorYears: 3,
    masterYears: 2,
    phdYears: 3,
    officialSourceName: "Universitaly — Italian Ministry of University and Research",
    officialSourceUrl: "https://www.universitaly.it/",
    notes: "Students from Uzbekistan often qualify for regional DSU need-based scholarships covering tuition + free canteen + €6,500–€7,500 stipend.",
  },
  "Turkey": {
    country: "Turkey",
    defaultCurrency: "USD",
    annualTuitionDefaultUsd: 4500,
    annualLivingDefaultUsd: 5400,
    insurancePerYearUsd: 180, // SGK Genel Sağlık Sigortası (GSS) student rate
    booksPerYearUsd: 300,
    flightsPerYearUsd: 420,
    visaFeeUsd: 110, // Residence permit (İkamet) card fee
    applicationFeeUsd: 35,
    bachelorYears: 4,
    masterYears: 2,
    phdYears: 4,
    officialSourceName: "Study in Türkiye & Türkiye Bursları",
    officialSourceUrl: "https://www.studyinturkiye.gov.tr/",
    notes: "Direct 4.5-hour flights from Tashkent/Samarkand/Qarshi; Türkiye Bursları covers full tuition, dorm, SGK insurance, and monthly stipend.",
  },
  "Malaysia": {
    country: "Malaysia",
    defaultCurrency: "MYR",
    annualTuitionDefaultUsd: 5800,
    annualLivingDefaultUsd: 4800,
    insurancePerYearUsd: 220, // EMGS mandatory medical insurance
    booksPerYearUsd: 300,
    flightsPerYearUsd: 650,
    visaFeeUsd: 360, // EMGS VAL (Visa Approval Letter) + processing fee
    applicationFeeUsd: 50,
    bachelorYears: 3,
    masterYears: 2,
    phdYears: 3,
    officialSourceName: "Education Malaysia Global Services (EMGS)",
    officialSourceUrl: "https://educationmalaysia.gov.my/",
    notes: "Direct Tashkent–Kuala Lumpur flights; EMGS package includes VAL processing, medical screening, and student insurance.",
  },
  "China": {
    country: "China",
    defaultCurrency: "CNY",
    annualTuitionDefaultUsd: 3800,
    annualLivingDefaultUsd: 5200,
    insurancePerYearUsd: 115, // ¥800/yr mandatory comprehensive medical insurance for international students
    booksPerYearUsd: 280,
    flightsPerYearUsd: 520,
    visaFeeUsd: 120, // X1 Visa + residence permit conversion + medical check
    applicationFeeUsd: 85, // ¥600 university application fee
    bachelorYears: 4,
    masterYears: 3,
    phdYears: 4,
    officialSourceName: "Campus China (CSC Scholarship Council)",
    officialSourceUrl: "https://www.campuschina.org/",
    notes: "CSC Type A/B and Silk Road scholarships cover full tuition, campus dorm, ¥800/yr medical insurance, and ¥2,500–¥3,500/month stipend.",
  },
  "United Arab Emirates": {
    country: "United Arab Emirates",
    defaultCurrency: "AED",
    annualTuitionDefaultUsd: 24000,
    annualLivingDefaultUsd: 14500,
    insurancePerYearUsd: 950,
    booksPerYearUsd: 600,
    flightsPerYearUsd: 380,
    visaFeeUsd: 820, // UAE Student Residence Visa + Emirates ID + Medical
    applicationFeeUsd: 70,
    bachelorYears: 4,
    masterYears: 2,
    phdYears: 4,
    officialSourceName: "UAE Ministry of Education / Study in UAE",
    officialSourceUrl: "https://www.moe.gov.ae/",
    notes: "3.5-hour direct flights from Tashkent/Samarkand; NYU Abu Dhabi and Khalifa University offer generous merit/need aid.",
  },
  "France": {
    country: "France",
    defaultCurrency: "EUR",
    annualTuitionDefaultUsd: 3000, // €2,770 Bakalavr / €3,770 Magistratura at public universities
    annualLivingDefaultUsd: 10800, // €615/mo Campus France minimum + Paris/city housing
    insurancePerYearUsd: 320, // CVEC (€103) + complementary mutuelle (Sécurité Sociale is free!)
    booksPerYearUsd: 450,
    flightsPerYearUsd: 640,
    visaFeeUsd: 110, // €50 VLS-TS visa + €50 OFII validation tax
    applicationFeeUsd: 85, // Etudes en France / Campus France fee
    bachelorYears: 3,
    masterYears: 2,
    phdYears: 3,
    officialSourceName: "Campus France Official Cost Guide",
    officialSourceUrl: "https://www.campusfrance.org/en/tuition-fees-France",
    notes: "French public health insurance (Sécurité Sociale) is free for international students; CAF housing subsidy (APL) reimburses 25–35% of rent.",
  },
  "Austria": {
    country: "Austria",
    defaultCurrency: "EUR",
    annualTuitionDefaultUsd: 1620, // €726.72/semester at public Austrian universities
    annualLivingDefaultUsd: 11800,
    insurancePerYearUsd: 840, // ÖGK student self-insurance (~€69/mo)
    booksPerYearUsd: 450,
    flightsPerYearUsd: 600,
    visaFeeUsd: 175, // Residence Permit – Student (Aufenthaltsbewilligung)
    applicationFeeUsd: 55,
    bachelorYears: 3,
    masterYears: 2,
    phdYears: 3,
    officialSourceName: "OeAD — Study in Austria",
    officialSourceUrl: "https://studyinaustria.at/en/living/living-costs",
    notes: "Public Austrian universities charge ~€726.72/semester for non-EU students; ÖGK student health insurance is ~€69/month.",
  },
  "Sweden": {
    country: "Sweden",
    defaultCurrency: "SEK",
    annualTuitionDefaultUsd: 13500,
    annualLivingDefaultUsd: 11800, // SEK 10,314/month Migrationsverket requirement
    insurancePerYearUsd: 350, // FAS+ insurance often included with tuition
    booksPerYearUsd: 500,
    flightsPerYearUsd: 680,
    visaFeeUsd: 145, // SEK 1,500 residence permit for studies
    applicationFeeUsd: 85, // SEK 900 Universityadmissions.se fee
    bachelorYears: 3,
    masterYears: 2,
    phdYears: 4,
    officialSourceName: "Study in Sweden & Swedish Migration Agency",
    officialSourceUrl: "https://studyinsweden.se/plan-your-studies/fees-and-costs/",
    notes: "Swedish Institute (SI) Scholarships for Global Professionals cover full tuition, SEK 12,000/month living stipend, and travel grant.",
  },
  "Czech Republic": {
    country: "Czech Republic",
    defaultCurrency: "CZK",
    annualTuitionDefaultUsd: 5200,
    annualLivingDefaultUsd: 7400,
    insurancePerYearUsd: 520, // PVZP comprehensive health insurance for foreigners
    booksPerYearUsd: 320,
    flightsPerYearUsd: 580,
    visaFeeUsd: 110, // Long-term visa / residence permit for studies
    applicationFeeUsd: 40,
    bachelorYears: 3,
    masterYears: 2,
    phdYears: 4,
    officialSourceName: "Study in Czechia (DZS)",
    officialSourceUrl: "https://www.studyin.cz/live-work/living-costs/",
    notes: "Czech-taught programmes at public universities are tuition-free; English-taught STEM & economics degrees start around €3,500–€6,000/year.",
  },
  "Spain": {
    country: "Spain",
    defaultCurrency: "EUR",
    annualTuitionDefaultUsd: 4800,
    annualLivingDefaultUsd: 10200, // 100% IPREM (€600/mo) minimum + city housing
    insurancePerYearUsd: 540, // Private no-copay student medical insurance (Sin Copago)
    booksPerYearUsd: 420,
    flightsPerYearUsd: 690,
    visaFeeUsd: 90,
    applicationFeeUsd: 65,
    bachelorYears: 4,
    masterYears: 1,
    phdYears: 3,
    officialSourceName: "SEPIE — Study in Spain",
    officialSourceUrl: "http://sepie.es/internacionalizacion/study_in_spain.html",
    notes: "Spanish Official Master's degrees (Máster Universitario) are 1–1.5 years; visa requires zero-copay private health insurance.",
  },
  "Hong Kong": {
    country: "Hong Kong",
    defaultCurrency: "HKD",
    annualTuitionDefaultUsd: 23500,
    annualLivingDefaultUsd: 11200,
    insurancePerYearUsd: 420,
    booksPerYearUsd: 500,
    flightsPerYearUsd: 760,
    visaFeeUsd: 30, // HKD 230 Immigration Dept student visa label
    applicationFeeUsd: 58, // HKD 450 university application fee
    bachelorYears: 4,
    masterYears: 1,
    phdYears: 4,
    officialSourceName: "Study in Hong Kong (HKSAR Government)",
    officialSourceUrl: "https://www.studyinhongkong.edu.hk/en/plan-your-studies/costs-of-studying.php",
    notes: "Belt and Road Scholarships for Uzbekistan students cover full tuition at HKU, CUHK, HKUST, PolyU, and CityU.",
  },
  "Qatar": {
    country: "Qatar",
    defaultCurrency: "QAR",
    annualTuitionDefaultUsd: 28000,
    annualLivingDefaultUsd: 11500,
    insurancePerYearUsd: 350,
    booksPerYearUsd: 500,
    flightsPerYearUsd: 480,
    visaFeeUsd: 140,
    applicationFeeUsd: 50,
    bachelorYears: 4,
    masterYears: 2,
    phdYears: 4,
    officialSourceName: "Education City / Qatar Foundation & Qatar University",
    officialSourceUrl: "https://www.qu.edu.qa/en-us/students/international-students",
    notes: "Qatar University and Hamad Bin Khalifa University (HBKU) offer full-ride scholarships with campus housing and annual flights.",
  },
  "Kazakhstan": {
    country: "Kazakhstan",
    defaultCurrency: "KZT",
    annualTuitionDefaultUsd: 6500,
    annualLivingDefaultUsd: 4200,
    insurancePerYearUsd: 160,
    booksPerYearUsd: 250,
    flightsPerYearUsd: 190,
    visaFeeUsd: 60, // C9 student visa / registration for Central Asian students
    applicationFeeUsd: 30,
    bachelorYears: 4,
    masterYears: 2,
    phdYears: 3,
    officialSourceName: "Nazarbayev University & Study in Kazakhstan",
    officialSourceUrl: "https://nu.edu.kz/admissions/scholarships-and-tuition-fees",
    notes: "Nazarbayev University Abay Kunanbayev scholarship covers 100% of tuition, medical insurance, and monthly stipend for international admits.",
  },
};

export const DEFAULT_INTERNATIONAL_BENCHMARK: CountryCostBenchmark = {
  country: "International Destination",
  defaultCurrency: "USD",
  annualTuitionDefaultUsd: 18000,
  annualLivingDefaultUsd: 11500,
  insurancePerYearUsd: 750,
  booksPerYearUsd: 500,
  flightsPerYearUsd: 800,
  visaFeeUsd: 180,
  applicationFeeUsd: 65,
  bachelorYears: 4,
  masterYears: 2,
  phdYears: 4,
  officialSourceName: "OECD Education at a Glance & UNESCO International Student Cost Reference",
  officialSourceUrl: "https://www.oecd.org/education/education-at-a-glance/",
  notes: "Global reference benchmark when a destination country is not yet selected.",
};

const COUNTRY_ALIASES: Record<string, string> = {
  us: "United States",
  usa: "United States",
  "u.s.": "United States",
  "u.s.a.": "United States",
  "united states of america": "United States",
  uk: "United Kingdom",
  "u.k.": "United Kingdom",
  britain: "United Kingdom",
  "great britain": "United Kingdom",
  england: "United Kingdom",
  korea: "South Korea",
  "republic of korea": "South Korea",
  rok: "South Korea",
  uae: "United Arab Emirates",
  turkiye: "Turkey",
  türkiye: "Turkey",
  czechia: "Czech Republic",
  holland: "Netherlands",
  "the netherlands": "Netherlands",
  prc: "China",
  "hong kong sar": "Hong Kong",
};

/** Resolve any country name or alias to its official 2026 cost benchmark. */
export function getCountryCostBenchmark(country?: string | null): CountryCostBenchmark {
  const raw = country?.trim();
  if (!raw) return DEFAULT_INTERNATIONAL_BENCHMARK;
  if (COUNTRY_COST_BENCHMARKS[raw]) return COUNTRY_COST_BENCHMARKS[raw];
  const lower = raw.toLowerCase();
  const aliasTarget = COUNTRY_ALIASES[lower];
  if (aliasTarget && COUNTRY_COST_BENCHMARKS[aliasTarget]) {
    return COUNTRY_COST_BENCHMARKS[aliasTarget];
  }
  for (const [key, benchmark] of Object.entries(COUNTRY_COST_BENCHMARKS)) {
    if (key.toLowerCase() === lower) return benchmark;
  }
  return {
    ...DEFAULT_INTERNATIONAL_BENCHMARK,
    country: raw,
  };
}

/** Convert a non-negative amount in any supported currency to USD. */
export function convertCurrencyToUsd(
  value: MaybeNumber,
  currency: string | null | undefined
): number | null {
  if (value == null || (typeof value === "string" && !value.trim())) return null;
  const amount = Number(value);
  if (!Number.isFinite(amount) || amount < 0) return null;
  const code = normalizeCurrency(currency) || "USD";
  const rate = CURRENCY_RATES_TO_USD[code]?.rateToUsd;
  if (!rate || rate <= 0) return null;
  return Math.round(amount * rate);
}

/** Convert a USD amount into a target display currency. */
export function convertUsdToCurrency(
  amountUsd: number | null | undefined,
  targetCurrency: string | null | undefined
): number | null {
  if (amountUsd == null || !Number.isFinite(amountUsd)) return null;
  const code = normalizeCurrency(targetCurrency) || "USD";
  const info = CURRENCY_RATES_TO_USD[code];
  if (!info || info.rateToUsd <= 0) return Math.round(amountUsd);
  return Math.round(amountUsd / info.rateToUsd);
}

/** Format a USD amount in the chosen display currency (e.g. USD, UZS, EUR, KRW). */
export function formatCurrencyAmount(
  amountUsd: number | null | undefined,
  displayCurrency?: string | null
): string {
  if (amountUsd == null || !Number.isFinite(amountUsd)) return "Unknown";
  const code = normalizeCurrency(displayCurrency) || "USD";
  const info = CURRENCY_RATES_TO_USD[code] ?? CURRENCY_RATES_TO_USD.USD;
  const converted = convertUsdToCurrency(amountUsd, code);
  if (converted == null) return "Unknown";
  if (code === "UZS") {
    return `${converted.toLocaleString("en-US")} so'm`;
  }
  return `${info.symbol}${converted.toLocaleString("en-US")}`;
}

function annualizeAmount(amount: number, period: string | null | undefined): number {
  const normalized = period?.trim().toLowerCase().replace(/[\s_-]+/g, " ") || "year";
  if (["month", "monthly", "per month"].includes(normalized)) return Math.round(amount * 12);
  if (["semester", "per semester", "term"].includes(normalized)) return Math.round(amount * 2);
  return Math.round(amount);
}

/**
 * Resolve a scholarship's award amount to USD, supporting both native USD and
 * multi-currency conversion via CURRENCY_RATES_TO_USD.
 */
export function resolveMultiCurrencyScholarshipAmount(row: {
  title?: string | null;
  awardAmount?: MaybeNumber;
  awardCurrency?: string | null;
  amountUsdValue?: MaybeNumber;
  amountMin?: MaybeNumber;
  amountMax?: MaybeNumber;
  currency?: string | null;
}): { amountUsd: number | null; convertedFromCurrency: string | null } {
  const strictUsd = resolvedUsdScholarshipAmount(row);
  if (strictUsd != null) {
    return { amountUsd: strictUsd, convertedFromCurrency: null };
  }
  const rawAward = row.awardAmount ?? row.amountMin ?? row.amountMax;
  const rawCur = row.awardCurrency ?? row.currency;
  if (rawAward != null) {
    const code = normalizeCurrency(rawCur);
    const converted = convertCurrencyToUsd(rawAward, code);
    if (converted != null) {
      return { amountUsd: converted, convertedFromCurrency: code };
    }
  }
  const legacyUsd = row.amountUsdValue;
  if (legacyUsd != null && Number(legacyUsd) > 0) {
    // 0 is the column's "no published amount" sentinel (the column is NOT NULL);
    // a zero-dollar award does not exist and must not reach a cost calculation.
    const fallback = convertCurrencyToUsd(legacyUsd, "USD");
    if (fallback != null && fallback > 0) {
      return { amountUsd: fallback, convertedFromCurrency: null };
    }
  }
  return { amountUsd: null, convertedFromCurrency: null };
}

export interface ResolveCompleteCostOptions {
  university?: (UniversityCostFields & {
    name?: string | null;
    country?: string | null;
    city?: string | null;
    degreeLevel?: string | null;
    currency?: string | null;
    tuitionPerYear?: MaybeNumber;
    livingCostPerYear?: MaybeNumber;
  }) | null;
  countryOverride?: string | null;
  degreeLevel?: string | null;
  yearsOverride?: number | null;
  familyContributionUsd?: number | null;
  scholarships?: ScholarshipInput[];
  overrides?: Partial<{
    annualTuitionUsd: number | null;
    annualLivingEstUsd: number | null;
    accommodationCostUsd: number | null;
    insurancePerYearUsd: number | null;
    booksPerYearUsd: number | null;
    flightsPerYearUsd: number | null;
    visaFeeUsd: number | null;
    applicationFeeUsd: number | null;
  }>;
}

export interface ResolvedCompleteCostResult {
  inputs: CostInputs;
  benchmarkKeys: Set<string>;
  benchmarkSource: {
    country: string;
    name: string;
    url: string;
    notes: string;
    defaultCurrency: string;
  };
  conversionNotes: string[];
}

function validNonNegative(val: number | null | undefined): number | null {
  return typeof val === "number" && Number.isFinite(val) && val >= 0 ? Math.round(val) : null;
}

function resolveDefaultYears(benchmark: CountryCostBenchmark, degreeLevel?: string | null): number {
  const deg = (degreeLevel || "").trim().toLowerCase();
  if (/\b(phd|doctor|doctoral|dphil)\b/.test(deg)) {
    return Math.max(1, Math.min(10, Math.round(benchmark.phdYears)));
  }
  if (/\b(master|msc|ma|mba|meng|llm|postgrad|graduate)\b/.test(deg)) {
    return Math.max(1, Math.min(10, Math.round(benchmark.masterYears)));
  }
  return Math.max(1, Math.min(10, Math.round(benchmark.bachelorYears)));
}

/**
 * Resolves a complete set of USD cost inputs for any university or country:
 * 1. Uses `resolvedUsdUniversityCosts(uni)` for published USD figures.
 * 2. Converts non-USD published figures (EUR, GBP, KRW, CAD, AUD, CHF, JPY, etc.)
 *    using `CURRENCY_RATES_TO_USD` and records a conversion provenance note.
 * 3. Fills any unpublished lines (insurance, books, flights, visa fee, app fee,
 *    or tuition/living when exploring by country) from `COUNTRY_COST_BENCHMARKS`
 *    and records the line keys in `benchmarkKeys` so they are marked `estimated: true`.
 */
export function resolveCompleteCostInputs(opts: ResolveCompleteCostOptions): ResolvedCompleteCostResult {
  const uni = opts.university ?? null;
  const targetCountry = opts.countryOverride?.trim() || uni?.country?.trim() || "United States";
  const benchmark = getCountryCostBenchmark(targetCountry);
  const benchmarkKeys = new Set<string>();
  const conversionNotes: string[] = [];

  const strict = uni ? resolvedUsdUniversityCosts(uni) : {
    annualTuitionUsd: null,
    annualLivingEstUsd: null,
    accommodationCostUsd: null,
    applicationFeeUsd: null,
  };

  let annualTuitionUsd = strict.annualTuitionUsd;
  const rawTuition = uni?.annualTuition ?? uni?.tuitionPerYear;
  if (annualTuitionUsd == null && rawTuition != null) {
    const cur = normalizeCurrency(uni?.tuitionCurrency ?? uni?.currency ?? benchmark.defaultCurrency);
    const conv = convertCurrencyToUsd(rawTuition, cur);
    if (conv != null) {
      annualTuitionUsd = annualizeAmount(conv, uni?.tuitionPeriod);
      if (cur && cur !== "USD") {
        conversionNotes.push(`Tuition converted from ${cur} to USD at 2026 reference rate.`);
      }
    }
  }
  if (annualTuitionUsd == null && uni?.annualTuitionUsd != null) {
    annualTuitionUsd = convertCurrencyToUsd(uni.annualTuitionUsd, "USD");
  }
  if (annualTuitionUsd == null) {
    annualTuitionUsd = benchmark.annualTuitionDefaultUsd;
    benchmarkKeys.add("tuition");
  }

  let annualLivingEstUsd = strict.annualLivingEstUsd;
  const rawLiving = uni?.annualLivingEst ?? uni?.livingCostPerYear;
  if (annualLivingEstUsd == null && rawLiving != null) {
    const cur = normalizeCurrency(uni?.livingCostCurrency ?? uni?.currency ?? benchmark.defaultCurrency);
    const conv = convertCurrencyToUsd(rawLiving, cur);
    if (conv != null) {
      annualLivingEstUsd = annualizeAmount(conv, uni?.livingCostPeriod);
      if (cur && cur !== "USD") {
        conversionNotes.push(`Living cost converted from ${cur} to USD at 2026 reference rate.`);
      }
    }
  }
  if (annualLivingEstUsd == null && uni?.annualLivingEstUsd != null) {
    annualLivingEstUsd = convertCurrencyToUsd(uni.annualLivingEstUsd, "USD");
  }
  if (annualLivingEstUsd == null) {
    annualLivingEstUsd = benchmark.annualLivingDefaultUsd;
    benchmarkKeys.add("living");
  }

  let accommodationCostUsd = strict.accommodationCostUsd;
  if (accommodationCostUsd == null && uni?.accommodationCost != null) {
    const cur = normalizeCurrency(uni.accommodationCostCurrency ?? uni.currency ?? benchmark.defaultCurrency);
    const conv = convertCurrencyToUsd(uni.accommodationCost, cur);
    if (conv != null) {
      accommodationCostUsd = annualizeAmount(conv, uni.accommodationCostPeriod);
    }
  }

  let applicationFeeUsd = strict.applicationFeeUsd;
  if (applicationFeeUsd == null && uni?.applicationFee != null) {
    const cur = normalizeCurrency(uni.applicationFeeCurrency ?? uni.currency ?? benchmark.defaultCurrency);
    const conv = convertCurrencyToUsd(uni.applicationFee, cur);
    if (conv != null) {
      applicationFeeUsd = conv;
      if (cur && cur !== "USD") {
        conversionNotes.push(`Application fee converted from ${cur} to USD at 2026 reference rate.`);
      }
    }
  }
  if (applicationFeeUsd == null) {
    applicationFeeUsd = benchmark.applicationFeeUsd;
    benchmarkKeys.add("application_fee");
  }

  let insurancePerYearUsd = benchmark.insurancePerYearUsd;
  benchmarkKeys.add("insurance");

  let booksPerYearUsd = benchmark.booksPerYearUsd;
  benchmarkKeys.add("books");

  let flightsPerYearUsd = benchmark.flightsPerYearUsd;
  benchmarkKeys.add("flights");

  let visaFeeUsd = benchmark.visaFeeUsd;
  benchmarkKeys.add("visa_fee");

  // Apply explicit user overrides when provided
  const ov = opts.overrides;
  if (ov) {
    const tOv = validNonNegative(ov.annualTuitionUsd);
    if (tOv != null) {
      annualTuitionUsd = tOv;
      benchmarkKeys.delete("tuition");
    }
    const lOv = validNonNegative(ov.annualLivingEstUsd);
    if (lOv != null) {
      annualLivingEstUsd = lOv;
      benchmarkKeys.delete("living");
    }
    const insOv = validNonNegative(ov.insurancePerYearUsd);
    if (insOv != null) {
      insurancePerYearUsd = insOv;
      benchmarkKeys.delete("insurance");
    }
    const bOv = validNonNegative(ov.booksPerYearUsd);
    if (bOv != null) {
      booksPerYearUsd = bOv;
      benchmarkKeys.delete("books");
    }
    const fOv = validNonNegative(ov.flightsPerYearUsd);
    if (fOv != null) {
      flightsPerYearUsd = fOv;
      benchmarkKeys.delete("flights");
    }
    const vOv = validNonNegative(ov.visaFeeUsd);
    if (vOv != null) {
      visaFeeUsd = vOv;
      benchmarkKeys.delete("visa_fee");
    }
    const aOv = validNonNegative(ov.applicationFeeUsd);
    if (aOv != null) {
      applicationFeeUsd = aOv;
      benchmarkKeys.delete("application_fee");
    }
  }

  const years =
    opts.yearsOverride != null && Number.isFinite(opts.yearsOverride) && opts.yearsOverride >= 1 && opts.yearsOverride <= 10
      ? Math.round(opts.yearsOverride)
      : resolveDefaultYears(benchmark, opts.degreeLevel ?? uni?.degreeLevel);

  const familyContributionUsd = validNonNegative(opts.familyContributionUsd);

  return {
    inputs: {
      annualTuitionUsd,
      annualLivingEstUsd,
      accommodationCostUsd,
      applicationFeeUsd,
      insurancePerYearUsd,
      booksPerYearUsd,
      flightsPerYearUsd,
      visaFeeUsd,
      country: benchmark.country,
      city: uni?.city ?? null,
      years,
      scholarships: opts.scholarships ?? [],
      familyContributionUsd,
    },
    benchmarkKeys,
    benchmarkSource: {
      country: benchmark.country,
      name: benchmark.officialSourceName,
      url: benchmark.officialSourceUrl,
      notes: benchmark.notes,
      defaultCurrency: benchmark.defaultCurrency,
    },
    conversionNotes,
  };
}

/**
 * High-level wrapper around `calculateCosts()` that resolves multi-currency
 * university/scholarship figures and country-level benchmarks, marking
 * benchmark-filled lines with `estimated: true`.
 */
export function calculateCompleteCosts(opts: ResolveCompleteCostOptions): {
  costs: CostBreakdown;
  resolved: ResolvedCompleteCostResult;
} {
  const resolved = resolveCompleteCostInputs(opts);
  const raw = calculateCosts(resolved.inputs);
  const lines = raw.lines.map((line) => ({
    ...line,
    estimated: line.estimated || resolved.benchmarkKeys.has(line.key),
  }));
  return {
    costs: {
      ...raw,
      lines,
    },
    resolved,
  };
}
