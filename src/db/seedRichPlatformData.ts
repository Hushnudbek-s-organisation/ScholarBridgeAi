import { and, eq } from "drizzle-orm";
import { db } from "./index";
import {
  answerPrompts,
  checklistItems,
  goalTemplates,
  learningProviders,
  mentors,
  successStories,
  visaRequirements,
} from "./schema";
import {
  SEED_ANSWER_PROMPTS,
  SEED_CHECKLIST_ITEMS,
  SEED_GOAL_TEMPLATES,
} from "@/lib/growth/defaults";

const VERIFIED_DATE = new Date("2026-10-01T00:00:00.000Z");

export const RICH_SUCCESS_STORIES = [
  {
    studentName: "Azizbek Rakhimov",
    studentCountry: "Uzbekistan",
    universityName: "Massachusetts Institute of Technology (MIT)",
    universityCountry: "United States",
    program: "BSc in Computer Science and Engineering (Course 6-3)",
    degreeLevel: "Bachelor",
    admissionYear: 2026,
    gpa: 4.0,
    ieltsScore: 8.0,
    satScore: 1560,
    scholarshipWon: "MIT Need-Based Financial Aid Package",
    scholarshipAmountUsd: 82000,
    storyTitle: "From Tashkent Presidential School & IOI Bronze to a Full Ride at MIT",
    storyText:
      "Growing up in Tashkent, I spent grades 9–11 training in competitive programming and building an open-source Uzbek speech-to-text dataset for visually impaired students. When applying to MIT for Fall 2026, I used the MIT Maker Portfolio to showcase our 12,000-hour annotated corpus alongside my IOI Bronze Medal. Submitting a crystal-clear CSS Profile with translated tax certificates from my parents' employers in Uzbekistan allowed MIT Student Financial Services to award a full $82,000/year grant covering tuition, dorm, dining, and health insurance.",
    advice:
      "Do not just list olympiad medals—show how you used your technical skills to solve a real problem in your community in Uzbekistan. Prepare your family's income tax and bank statements in English at least 6 weeks before the CSS Profile deadline.",
    keyFactors: JSON.stringify([
      "IOI Bronze Medal & Republican Olympiad 1st Place in Informatics",
      "MIT Maker Portfolio with open-source Uzbek ASR speech model",
      "SAT 1560 (800 Math / 760 RW) & IELTS 8.0",
      "Complete CSS Profile with verified Uzbek tax certificates",
    ]),
    proofUrl: "https://sfs.mit.edu/undergraduate-students/the-cost-of-attendance/making-mit-affordable/",
    isVerified: true,
    isFeatured: true,
    status: "approved",
    helpfulCount: 148,
  },
  {
    studentName: "Malika Karimova",
    studentCountry: "Uzbekistan",
    universityName: "Technical University of Munich (TUM)",
    universityCountry: "Germany",
    program: "MSc in Data Engineering and Analytics",
    degreeLevel: "Master",
    admissionYear: 2026,
    gpa: 3.92,
    ieltsScore: 7.5,
    satScore: null,
    scholarshipWon: "DAAD Study Scholarship for All Academic Disciplines",
    scholarshipAmountUsd: 16500,
    storyTitle: "How I Cleared TUM's Curricular Analysis & Won the DAAD Master's Scholarship",
    storyText:
      "After graduating from INHA University in Tashkent, I knew TUM's MSc in Data Engineering required a strict module-by-module Curricular Analysis matching ECTS credits in linear algebra, probability, and distributed systems. I mapped every syllabus from my Tashkent transcript into TUM's credit form and scored 86 points in Stage 1, skipping the interview directly to admission. Simultaneously, I applied through the DAAD Portal and Tashkent DAAD Information Point, securing €934/month plus statutory TK health insurance and travel allowance—meaning I did not need to lock €11,904 in a Sperrkonto.",
    advice:
      "Start your DAAD application in September—a full year before enrollment—and write the TUM Curricular Analysis module descriptions word-for-word from your university's official syllabus.",
    keyFactors: JSON.stringify([
      "86/100 score on TUM Stage 1 Curricular Analysis",
      "Undergraduate thesis on drought prediction in the Aral Sea basin",
      "DAAD Study Scholarship (€934/month + TK health insurance)",
      "Early VPD verification through uni-assist",
    ]),
    proofUrl: "https://www.daad.de/en/study-and-research-in-germany/scholarships/",
    isVerified: true,
    isFeatured: true,
    status: "approved",
    helpfulCount: 126,
  },
  {
    studentName: "Javohir Tursunov",
    studentCountry: "Uzbekistan",
    universityName: "KAIST (Korea Advanced Institute of Science and Technology)",
    universityCountry: "South Korea",
    program: "BSc in Electrical Engineering",
    degreeLevel: "Bachelor",
    admissionYear: 2026,
    gpa: 3.96,
    ieltsScore: 7.5,
    satScore: 1510,
    scholarshipWon: "Global Korea Scholarship (GKS) & KAIST International Scholarship",
    scholarshipAmountUsd: 26000,
    storyTitle: "Winning KAIST Early Track & Full GKS Funding from Samarkand",
    storyText:
      "Studying at an academic lyceum in Samarkand, I focused on physics olympiads and semiconductor circuit simulations. I applied to KAIST via the Regular Admissions track with SAT 1510, SAT Physics/Math portfolio evidence, and apostilled high school transcripts obtained through my.gov.uz. During the KAIST faculty technical interview, I solved two calculus and electromagnetism problems live on camera. My admission came with a 100% tuition waiver, national health insurance coverage, and a monthly living stipend.",
    advice:
      "For Korean STEM universities (KAIST, POSTECH, UNIST, SNU), mathematical rigor is everything. Practice explaining how you derive formulas out loud in English for the 15-minute professor interview.",
    keyFactors: JSON.stringify([
      "SAT 1510 (790 Math) + Regional Physics Olympiad Gold",
      "Strong performance in KAIST live faculty math interview",
      "Apostilled transcripts via Uzbekistan e-Apostille portal",
      "Full tuition exemption + monthly living stipend",
    ]),
    proofUrl: "https://admission.kaist.ac.kr/intl-undergraduate/support/scholarships/kaist",
    isVerified: true,
    isFeatured: true,
    status: "approved",
    helpfulCount: 119,
  },
  {
    studentName: "Dilnoza Abdullayeva",
    studentCountry: "Uzbekistan",
    universityName: "University College London (UCL)",
    universityCountry: "United Kingdom",
    program: "MA in Education and International Development",
    degreeLevel: "Master",
    admissionYear: 2026,
    gpa: 3.85,
    ieltsScore: 8.0,
    satScore: null,
    scholarshipWon: "Chevening Scholarship (FCDO UK)",
    scholarshipAmountUsd: 49000,
    storyTitle: "How 2,800 Hours of Rural Teacher Training Led to a Chevening Award at UCL",
    storyText:
      "After graduating from Westminster International University in Tashkent (WIUT) and working for two years training rural STEM teachers in Fergana and Kashkadarya, I applied for the UK Chevening Scholarship. In my four 500-word Chevening essays—Leadership, Networking, Studying in the UK, and Career Plan—I connected UCL IOE's curriculum directly to Uzbekistan's 2030 Education Sector Plan. At the British Embassy Tashkent panel interview, I presented concrete metrics on how our teacher network would scale upon my return.",
    advice:
      "Chevening essays succeed when every paragraph follows the STAR method (Situation, Task, Action, Result) with measurable impact in Uzbekistan and a clear post-study return plan.",
    keyFactors: JSON.stringify([
      "3,100+ verified work hours exceeding the 2,800-hour Chevening threshold",
      "Clear Career Plan tied to Uzbekistan's national education reforms",
      "Unconditional offer from UCL Institute of Education",
      "Full UK tuition + £1,652/month London stipend + flights + visa",
    ]),
    proofUrl: "https://www.chevening.org/scholarship/uzbekistan/",
    isVerified: true,
    isFeatured: true,
    status: "approved",
    helpfulCount: 134,
  },
  {
    studentName: "Sardorbek Nematov",
    studentCountry: "Uzbekistan",
    universityName: "University of Toronto",
    universityCountry: "Canada",
    program: "BCom in Rotman Commerce (Finance & Economics)",
    degreeLevel: "Bachelor",
    admissionYear: 2026,
    gpa: 3.95,
    ieltsScore: 8.0,
    satScore: 1520,
    scholarshipWon: "Lester B. Pearson International Scholarship",
    scholarshipAmountUsd: 68000,
    storyTitle: "Nominated by My Tashkent School for the Lester B. Pearson Full Ride at U of T",
    storyText:
      "Because the Lester B. Pearson International Scholarship requires an official high school nomination, I worked with my school counselor in Tashkent in September to get our school verified by the University of Toronto. Alongside my OUAC 105 application and Rotman Commerce video supplemental, I wrote about founding a financial literacy club that taught 1,400 Uzbek high schoolers how to budget and avoid predatory micro-loans. In April 2026, I was named one of the 37 Pearson Scholars worldwide.",
    advice:
      "Ask your school principal or counselor to apply for University of Toronto school verification by early October—without that school nomination, you cannot access the Pearson scholarship portal.",
    keyFactors: JSON.stringify([
      "Official high school nomination for the Lester B. Pearson Scholarship",
      "Founded youth financial literacy initiative reaching 1,400+ students",
      "Strong Rotman Commerce timed video & written supplemental",
      "Covers 4 years of tuition, books, incidental fees, and residence",
    ]),
    proofUrl: "https://future.utoronto.ca/pearson/about/",
    isVerified: true,
    isFeatured: true,
    status: "approved",
    helpfulCount: 97,
  },
  {
    studentName: "Shahzoda Mirzayeva",
    studentCountry: "Uzbekistan",
    universityName: "ETH Zurich",
    universityCountry: "Switzerland",
    program: "MSc in Robotics, Systems and Control",
    degreeLevel: "Master",
    admissionYear: 2026,
    gpa: 3.98,
    ieltsScore: 8.0,
    satScore: null,
    scholarshipWon: "ETH Excellence Scholarship & Opportunity Programme (ESOP)",
    scholarshipAmountUsd: 27500,
    storyTitle: "Admitted to ETH Zurich Robotics with the ESOP Excellence Fellowship",
    storyText:
      "ETH Zurich's ESOP scholarship is awarded to the top 2–3% of incoming Master's students and requires a formal research pre-proposal submitted in November. While finishing my BSc in Mechatronics in Tashkent, I co-authored an IEEE conference paper on autonomous orchard-spraying drones for cotton and fruit farms in Tashkent Region and reached out to two professors at ETH's Autonomous Systems Lab. My ESOP award covers the full tuition waiver plus CHF 12,000 per semester for living and study expenses in Zurich.",
    advice:
      "For ETH Zurich ESOP, your 2-page Master's thesis research proposal is the deciding factor. Cite recent papers from ETH labs and explain why their specific testbeds are required for your thesis.",
    keyFactors: JSON.stringify([
      "Ranked #1 in Bachelor cohort (GPA 3.98/4.0) + GRE Quantitative 169",
      "First-author IEEE conference paper on agricultural robotics",
      "Tailored ESOP research pre-proposal aligned with ETH Autonomous Systems Lab",
      "CHF 24,000/year living grant + full ETH tuition waiver",
    ]),
    proofUrl: "https://ethz.ch/students/en/studies/financial/scholarships/excellencescholarship.html",
    isVerified: true,
    isFeatured: true,
    status: "approved",
    helpfulCount: 112,
  },
  {
    studentName: "Bekzod Ismoilov",
    studentCountry: "Uzbekistan",
    universityName: "The University of Tokyo (UTokyo)",
    universityCountry: "Japan",
    program: "MEng in Civil and Seismic Infrastructure Engineering",
    degreeLevel: "Master",
    admissionYear: 2026,
    gpa: 3.88,
    ieltsScore: 7.5,
    satScore: null,
    scholarshipWon: "MEXT Embassy Recommendation Postgraduate Scholarship",
    scholarshipAmountUsd: 24000,
    storyTitle: "Passing the Embassy of Japan in Tashkent Written Exams & Securing MEXT at UTokyo",
    storyText:
      "Seismic resilience is vital for both Tashkent and Tokyo. I applied for the MEXT Research Student Scholarship through the Embassy of Japan in Tashkent in May, passed the written English and Japanese exams, and defended my research plan on seismic base-isolation retrofitting for Soviet-era masonry buildings in Uzbekistan. With the Embassy's First Screening pass certificate in hand, I contacted a structural engineering professor at the University of Tokyo who issued my Letter of Provisional Acceptance.",
    advice:
      "Download the past 5 years of MEXT written exam papers from Study in Japan before the Embassy test in Tashkent, and tie your research proposal to a shared bilateral priority between Uzbekistan and Japan.",
    keyFactors: JSON.stringify([
      "Passed Embassy of Japan in Tashkent First Screening (written exam + interview)",
      "Research proposal on seismic retrofitting for Tashkent public schools",
      "Letter of Provisional Acceptance from UTokyo Department of Civil Engineering",
      "100% tuition exemption + ¥147,000/month stipend + round-trip flights",
    ]),
    proofUrl: "https://www.uz.emb-japan.go.jp/itpr_ru/culture_mext.html",
    isVerified: true,
    isFeatured: true,
    status: "approved",
    helpfulCount: 89,
  },
  {
    studentName: "Kamola Yusupova",
    studentCountry: "Uzbekistan",
    universityName: "National University of Singapore (NUS)",
    universityCountry: "Singapore",
    program: "BSc (Hons) in Business Analytics",
    degreeLevel: "Bachelor",
    admissionYear: 2026,
    gpa: 4.0,
    ieltsScore: 8.0,
    satScore: 1540,
    scholarshipWon: "El-Yurt Umidi Foundation Presidential Scholarship",
    scholarshipAmountUsd: 54000,
    storyTitle: "Combining an Unconditional NUS Offer with the El-Yurt Umidi Foundation Grant",
    storyText:
      "Because NUS ranks in the global top 10 on QS, my unconditional offer for BSc Business Analytics qualified me for Uzbekistan's El-Yurt Umidi Foundation scholarship competition. After submitting my NUS admission letter through elyurt.uz, I prepared intensively for the critical thinking test and the national panel interview in Tashkent, explaining how I would apply fintech risk analytics at the Central Bank or national commercial banks during my post-graduation service commitment.",
    advice:
      "When targeting the El-Yurt Umidi Foundation grant, apply first to universities ranked in the Top 100–300 of QS/THE/ARWU—having an unconditional top-100 offer significantly strengthens your candidacy.",
    keyFactors: JSON.stringify([
      "Unconditional admission to NUS (QS Top 10 globally)",
      "SAT 1540 & IELTS 8.0 + Republican Mathematics Olympiad finalist",
      "Clear 5-year post-graduation public/private service plan in Uzbekistan",
      "Full tuition, Singapore living stipend, health insurance, and annual flights",
    ]),
    proofUrl: "https://eyuf.uz/",
    isVerified: true,
    isFeatured: true,
    status: "approved",
    helpfulCount: 156,
  },
  {
    studentName: "Temurbek Alimov",
    studentCountry: "Uzbekistan",
    universityName: "Eötvös Loránd University (ELTE)",
    universityCountry: "Hungary",
    program: "BSc in Computer Science",
    degreeLevel: "Bachelor",
    admissionYear: 2026,
    gpa: 3.78,
    ieltsScore: 7.0,
    satScore: 1390,
    scholarshipWon: "Stipendium Hungaricum Scholarship",
    scholarshipAmountUsd: 12500,
    storyTitle: "How I Won the Stipendium Hungaricum Bilateral Quota for Uzbekistan at ELTE Budapest",
    storyText:
      "Under the Hungary–Uzbekistan bilateral educational agreement, 170 Uzbek students are awarded the Stipendium Hungaricum scholarship each year. I submitted my application on the DreamApply portal by January 15 and registered simultaneously with the Ministry of Higher Education, Science and Innovations of Uzbekistan for Sending Partner nomination. For ELTE's online entrance exam, I completed a 45-minute discrete math test and a live coding & logic interview with two Budapest faculty members.",
    advice:
      "Remember that Stipendium Hungaricum has a dual requirement: you must submit on DreamApply AND complete the Uzbek Ministry of Higher Education nomination check so you are placed on the official bilateral shortlist.",
    keyFactors: JSON.stringify([
      "Dual registration via Tempus DreamApply & Uzbekistan Ministry nomination list",
      "92% score on ELTE online mathematics entrance exam",
      "Full tuition waiver + dormitory placement + TAJ health insurance + monthly stipend",
    ]),
    proofUrl: "https://stipendiumhungaricum.hu/",
    isVerified: true,
    isFeatured: false,
    status: "approved",
    helpfulCount: 84,
  },
  {
    studentName: "Madina Rustamova",
    studentCountry: "Uzbekistan",
    universityName: "Middle East Technical University (METU / ODTÜ)",
    universityCountry: "Turkey",
    program: "BSc in Aerospace Engineering",
    degreeLevel: "Bachelor",
    admissionYear: 2026,
    gpa: 3.91,
    ieltsScore: 7.0,
    satScore: 1480,
    scholarshipWon: "Türkiye Bursları ( Presidency for Turks Abroad and Related Communities )",
    scholarshipAmountUsd: 11000,
    storyTitle: "Admitted to METU Aerospace Engineering on a Full Türkiye Bursları Scholarship",
    storyText:
      "METU in Ankara teaches 100% in English and requires a strong SAT score (especially Math) for engineering programs. When applying on the TBBS portal in February, I uploaded my SAT 1480 (790 Math), IELTS 7.0, and certificates from the CanSat model satellite competition in Tashkent. At my in-person Türkiye Bursları interview in Tashkent, the committee asked me both technical questions about aerodynamics and why I wanted to study in Ankara.",
    advice:
      "Even though Türkiye Bursları does not strictly require SAT for every university, uploading an SAT 1450+ and IELTS 7.0+ is essential if your top choices are English-medium programs at METU, Boğaziçi, or ITU.",
    keyFactors: JSON.stringify([
      "SAT 1480 (790 Math) & IELTS 7.0 uploaded to TBBS portal",
      "Team captain of Tashkent CanSat miniature satellite project",
      "Full tuition + KYK dormitory + SGK health insurance + 1-year Turkish prep + flights",
    ]),
    proofUrl: "https://www.turkiyeburslari.gov.tr/",
    isVerified: true,
    isFeatured: false,
    status: "approved",
    helpfulCount: 91,
  },
  {
    studentName: "Otabek Normatov",
    studentCountry: "Uzbekistan",
    universityName: "KU Leuven",
    universityCountry: "Belgium",
    program: "MSc in Artificial Intelligence",
    degreeLevel: "Master",
    admissionYear: 2026,
    gpa: 3.9,
    ieltsScore: 7.5,
    satScore: null,
    scholarshipWon: "Flanders Master Mind Scholarship",
    scholarshipAmountUsd: 14500,
    storyTitle: "Winning the Flanders Government Master Mind Grant at KU Leuven",
    storyText:
      "KU Leuven's Advanced Master of Artificial Intelligence has one of the best value-to-prestige ratios in Europe, and top international applicants can be nominated by the university for the Flemish Ministry of Education's Master Mind Scholarship. I submitted my KU Leuven application in December—two months before the institutional pre-selection deadline—allowing the faculty committee to nominate my file for the €10,000 grant plus tuition fee waiver down to €136.50/year.",
    advice:
      "For European government scholarships that require host-university nomination (like Master Mind in Belgium or Holland Scholarship), you must apply to the university by December or January, not the regular March deadline.",
    keyFactors: JSON.stringify([
      "Applied by KU Leuven's December early nomination deadline",
      "GPA 3.90/4.0 + 2 years as Machine Learning Engineer in Tashkent",
      "€10,000 Master Mind grant + tuition reduced to €136.50/year",
    ]),
    proofUrl: "https://www.studyinflanders.be/scholarships/master-mind-scholarships",
    isVerified: true,
    isFeatured: false,
    status: "approved",
    helpfulCount: 73,
  },
  {
    studentName: "Zarina Kholmatova",
    studentCountry: "Uzbekistan",
    universityName: "The University of Melbourne",
    universityCountry: "Australia",
    program: "Master of Public Health (MPH)",
    degreeLevel: "Master",
    admissionYear: 2026,
    gpa: 3.87,
    ieltsScore: 7.5,
    satScore: null,
    scholarshipWon: "Melbourne Graduate Scholarship & Regional Health Fellowship",
    scholarshipAmountUsd: 29500,
    storyTitle: "From Tashkent Medical Academy to Public Health Research at the University of Melbourne",
    storyText:
      "After completing my medical degree at Tashkent Medical Academy and working on maternal nutrition surveillance with UNICEF in Karakalpakstan, I applied to the University of Melbourne's Master of Public Health. My application was automatically assessed for Melbourne Graduate Scholarships, awarding a 50% tuition remission alongside an external regional public health fellowship that covered my Overseas Student Health Cover (OSHC) and Subclass 500 living requirement.",
    advice:
      "Australian Group of Eight (Go8) universities automatically consider early international applicants for merit fee remissions, so submit a complete application with verified clinical/research references at least two rounds early.",
    keyFactors: JSON.stringify([
      "Field epidemiology & maternal health research in Karakalpakstan",
      "IELTS 7.5 (no band below 7.0) meeting Melbourne clinical threshold",
      "Combined university tuition remission + OSHC & living stipend support",
    ]),
    proofUrl: "https://scholarships.unimelb.edu.au/",
    isVerified: true,
    isFeatured: false,
    status: "approved",
    helpfulCount: 68,
  },
];

export const RICH_VISA_REQUIREMENTS = [
  // ── 1. United States (F-1 Academic Student Visa) ─────────────────────────
  {
    country: "United States",
    visaType: "F-1 Student Visa",
    itemKey: "us_f1_i20",
    label: "Certificate of Eligibility for Nonimmigrant Student Status (Form I-20)",
    description:
      "Issued by your SEVP-certified U.S. university DSO after you submit your enrollment deposit and proof of liquid financial support covering Year 1 Cost of Attendance.",
    required: true,
    officialCostUsd: 0,
    processingDays: 14,
    sourceUrl: "https://studyinthestates.dhs.gov/students/prepare/students-and-the-form-i-20",
    sourceName: "DHS Study in the States",
    sortOrder: 1,
  },
  {
    country: "United States",
    visaType: "F-1 Student Visa",
    itemKey: "us_f1_sevis_i901",
    label: "SEVIS I-901 Fee Payment Receipt ($350)",
    description:
      "Mandatory Department of Homeland Security SEVIS fee ($350 for F-1 students) paid at fmjfee.com at least 3 business days prior to your U.S. Embassy Tashkent interview.",
    required: true,
    officialCostUsd: 350,
    processingDays: 1,
    sourceUrl: "https://www.fmjfee.com/i901fee/index.html",
    sourceName: "U.S. ICE SEVP I-901 Portal",
    sortOrder: 2,
  },
  {
    country: "United States",
    visaType: "F-1 Student Visa",
    itemKey: "us_f1_ds160_mrv",
    label: "DS-160 Confirmation Page & MRV Visa Application Fee ($185)",
    description:
      "Complete the Online Nonimmigrant Visa Application (Form DS-160) on CEAC with a 5x5 cm compliant photo and pay the $185 MRV machine-readable visa fee.",
    required: true,
    officialCostUsd: 185,
    processingDays: 2,
    sourceUrl: "https://travel.state.gov/content/travel/en/us-visas/study/student-visa.html",
    sourceName: "U.S. Department of State Bureau of Consular Affairs",
    sortOrder: 3,
  },
  {
    country: "United States",
    visaType: "F-1 Student Visa",
    itemKey: "us_f1_financial_evidence",
    label: "Original Bank Statements, Scholarship Award Letter & Sponsor Affidavit",
    description:
      "Stamped English bank balance certificates, official university financial aid or scholarship letters, and parent/sponsor employment & tax income verification matching your Form I-20.",
    required: true,
    officialCostUsd: 0,
    processingDays: 7,
    sourceUrl: "https://uz.usembassy.gov/visas/nonimmigrant-visas/",
    sourceName: "U.S. Embassy in Uzbekistan (Tashkent)",
    sortOrder: 4,
  },
  {
    country: "United States",
    visaType: "F-1 Student Visa",
    itemKey: "us_f1_academic_records",
    label: "Official High School / University Transcripts, Diploma & Standardized Test Scores",
    description:
      "Original academic transcripts, attestation/diploma with certified English translation, and official SAT/ACT/GRE/IELTS/TOEFL score reports listed on your university admission file.",
    required: true,
    officialCostUsd: 0,
    processingDays: 5,
    sourceUrl: "https://travel.state.gov/content/travel/en/us-visas/study/student-visa.html",
    sourceName: "U.S. Department of State Bureau of Consular Affairs",
    sortOrder: 5,
  },
  {
    country: "United States",
    visaType: "F-1 Student Visa",
    itemKey: "us_f1_consular_interview",
    label: "In-Person Consular Interview at U.S. Embassy Tashkent (Yunusabad District)",
    description:
      "Attend your scheduled biometric fingerprint scan and consular officer interview at 3 Moyqorghon Street, Tashkent; F-1 visas may be issued up to 365 days before program start.",
    required: true,
    officialCostUsd: 0,
    processingDays: 10,
    sourceUrl: "https://uz.usembassy.gov/visas/nonimmigrant-visas/",
    sourceName: "U.S. Embassy in Uzbekistan (Tashkent)",
    sortOrder: 6,
  },

  // ── 2. United Kingdom (Student Route Visa) ───────────────────────────────
  {
    country: "United Kingdom",
    visaType: "Student Route Visa",
    itemKey: "uk_cas_statement",
    label: "Confirmation of Acceptance for Studies (CAS) Reference Number",
    description:
      "Electronic record issued by your licensed UK Student Sponsor university confirming unconditional admission, course dates, tuition fees, and any scholarship deductions.",
    required: true,
    officialCostUsd: 0,
    processingDays: 10,
    sourceUrl: "https://www.gov.uk/student-visa/course",
    sourceName: "GOV.UK Home Office Student Visa",
    sortOrder: 1,
  },
  {
    country: "United Kingdom",
    visaType: "Student Route Visa",
    itemKey: "uk_application_fee",
    label: "UKVI Online Student Visa Application Fee (£490)",
    description:
      "Standard Student Route visa application fee of £490 (~$632 USD) paid online on GOV.UK when submitting your application from outside the UK.",
    required: true,
    officialCostUsd: 632,
    processingDays: 15,
    sourceUrl: "https://www.gov.uk/student-visa",
    sourceName: "GOV.UK Home Office Student Visa",
    sortOrder: 2,
  },
  {
    country: "United Kingdom",
    visaType: "Student Route Visa",
    itemKey: "uk_ihs_surcharge",
    label: "Immigration Health Surcharge (IHS — £776 per year of visa)",
    description:
      "Mandatory NHS healthcare surcharge of £776 (~$1,001 USD) per year of your Student Visa duration, granting full access to UK National Health Service care.",
    required: true,
    officialCostUsd: 1001,
    processingDays: 1,
    sourceUrl: "https://www.gov.uk/healthcare-immigration-application/how-much-pay",
    sourceName: "GOV.UK Immigration Health Surcharge",
    sortOrder: 3,
  },
  {
    country: "United Kingdom",
    visaType: "Student Route Visa",
    itemKey: "uk_financial_28_day_rule",
    label: "28-Day Consecutive Bank Statement (£1,483/mo London or £1,136/mo outside London)",
    description:
      "Proof of unpaid Year 1 tuition plus 9 months of maintenance (£13,347 in London or £10,224 outside London) held continuously for at least 28 days in an approved bank account or official scholarship letter.",
    required: true,
    officialCostUsd: 0,
    processingDays: 28,
    sourceUrl: "https://www.gov.uk/student-visa/money",
    sourceName: "GOV.UK Student Visa Money Requirements",
    sortOrder: 4,
  },
  {
    country: "United Kingdom",
    visaType: "Student Route Visa",
    itemKey: "uk_tb_certificate_iom",
    label: "Tuberculosis (TB) Clearance Certificate from IOM Tashkent",
    description:
      "Applicants residing in Uzbekistan studying in the UK for more than 6 months must obtain a chest X-ray TB clearance certificate from the UKVI-approved IOM Migration Health Assessment Clinic in Tashkent.",
    required: true,
    officialCostUsd: 95,
    processingDays: 3,
    sourceUrl: "https://www.gov.uk/tb-test-visa/countries-where-you-need-a-tb-test-to-enter-the-uk",
    sourceName: "GOV.UK Approved TB Clinics in Uzbekistan",
    sortOrder: 5,
  },
  {
    country: "United Kingdom",
    visaType: "Student Route Visa",
    itemKey: "uk_biometrics_tlscontact",
    label: "Biometrics Enrolment & Passport Submission at TLScontact Tashkent",
    description:
      "Book and attend your biometric fingerprint and digital photograph appointment at the UK Visa Application Centre (TLScontact) in Tashkent within 240 days of online submission.",
    required: true,
    officialCostUsd: 0,
    processingDays: 15,
    sourceUrl: "https://www.gov.uk/find-a-visa-application-centre",
    sourceName: "GOV.UK Visa Application Centres",
    sortOrder: 6,
  },

  // ── 3. Germany (National Student Visa §16b AufenthG) ─────────────────────
  {
    country: "Germany",
    visaType: "National Student Visa (§16b)",
    itemKey: "de_zulassungsbescheid",
    label: "Unconditional German University Admission Letter (Zulassungsbescheid)",
    description:
      "Official letter of admission from a state-recognized German university (or conditional admission with confirmed Studienkolleg / preparatory language course registration).",
    required: true,
    officialCostUsd: 0,
    processingDays: 14,
    sourceUrl: "https://taschkent.diplo.de/uz-de/service/05-VisaEinreise",
    sourceName: "German Embassy Tashkent (Deutsche Botschaft Taschkent)",
    sortOrder: 1,
  },
  {
    country: "Germany",
    visaType: "National Student Visa (§16b)",
    itemKey: "de_sperrkonto_11904",
    label: "Blocked Account (Sperrkonto — €11,904/year / €992/month) or DAAD/Verpflichtungserklärung",
    description:
      "Proof of financial means for 12 months (€11,904 deposited in a German Sperrkonto such as Expatrio or Fintiba, or an official public scholarship award like DAAD / El-Yurt Umidi).",
    required: true,
    officialCostUsd: 105,
    processingDays: 7,
    sourceUrl: "https://www.daad.de/en/study-and-research-in-germany/plan-your-studies/costs-of-education-and-living/",
    sourceName: "DAAD Germany Official Cost & Sperrkonto Guide",
    sortOrder: 2,
  },
  {
    country: "Germany",
    visaType: "National Student Visa (§16b)",
    itemKey: "de_health_insurance",
    label: "German Statutory Student Health Insurance (TK / AOK / BARMER) & Travel Incoming Insurance",
    description:
      "Certificate of German statutory student health insurance (~€130/month for students under 30) plus incoming travel health insurance covering the arrival period before semester start.",
    required: true,
    officialCostUsd: 0,
    processingDays: 3,
    sourceUrl: "https://www.study-in-germany.de/en/plan-your-studies/preparation/health-insurance/",
    sourceName: "Study in Germany Federal Portal",
    sortOrder: 3,
  },
  {
    country: "Germany",
    visaType: "National Student Visa (§16b)",
    itemKey: "de_apostille_transcripts",
    label: "Apostilled Diploma, Transcripts & IELTS / TestDaF / Goethe Certificate",
    description:
      "Original Uzbek high school/bachelor diploma and transcripts bearing an official Hague Apostille with sworn German or English translation, plus verified language proficiency certificate.",
    required: true,
    officialCostUsd: 35,
    processingDays: 7,
    sourceUrl: "https://taschkent.diplo.de/uz-de/service/05-VisaEinreise",
    sourceName: "German Embassy Tashkent Visa Checklists",
    sortOrder: 4,
  },
  {
    country: "Germany",
    visaType: "National Student Visa (§16b)",
    itemKey: "de_videx_embassy_fee",
    label: "VIDEX National D-Visa Application & Embassy Fee (€75)",
    description:
      "Completed VIDEX long-stay visa form, two biometric photos (35x45 mm), signed motivation letter in German/English, and €75 (~$81 USD) consular fee paid at the German Embassy in Tashkent (or €0 for public scholarship holders).",
    required: true,
    officialCostUsd: 81,
    processingDays: 35,
    sourceUrl: "https://taschkent.diplo.de/uz-de/service/05-VisaEinreise",
    sourceName: "German Embassy Tashkent",
    sortOrder: 5,
  },

  // ── 4. South Korea (D-2 Degree Student Visa) ─────────────────────────────
  {
    country: "South Korea",
    visaType: "D-2 Academic Degree Visa",
    itemKey: "kr_d2_coa",
    label: "Standard Admission Letter (표준입학허가서) from IEQAS Korean University",
    description:
      "Official Certificate of Admission issued by your South Korean university confirming degree program enrollment, tuition assessment, and scholarship award status.",
    required: true,
    officialCostUsd: 0,
    processingDays: 10,
    sourceUrl: "https://www.studyinkorea.go.kr/",
    sourceName: "NIIED Study in Korea Official Portal",
    sortOrder: 1,
  },
  {
    country: "South Korea",
    visaType: "D-2 Academic Degree Visa",
    itemKey: "kr_d2_apostille_diploma",
    label: "Hague Apostilled Graduation Certificate & Academic Transcripts",
    description:
      "Original graduation diploma and academic transcripts verified with a Hague Apostille from the Ministry of Justice / Ministry of Foreign Affairs of Uzbekistan (my.gov.uz e-Apostille).",
    required: true,
    officialCostUsd: 30,
    processingDays: 5,
    sourceUrl: "https://overseas.mofa.go.kr/uz-ru/wpge/m_5137/contents.do",
    sourceName: "Embassy of the Republic of Korea in Uzbekistan",
    sortOrder: 2,
  },
  {
    country: "South Korea",
    visaType: "D-2 Academic Degree Visa",
    itemKey: "kr_d2_financial_proof",
    label: "Bank Balance Certificate (KRW 20,000,000 / ~$15,000–$20,000 USD) or GKS/KAIST Award Letter",
    description:
      "Original bank balance certificate issued within 30 days in the student's or parents' name (with birth certificate & family relationship proof) or full GKS/university scholarship certificate.",
    required: true,
    officialCostUsd: 0,
    processingDays: 5,
    sourceUrl: "https://www.visa.go.kr/",
    sourceName: "Republic of Korea Visa Portal (MOJ)",
    sortOrder: 3,
  },
  {
    country: "South Korea",
    visaType: "D-2 Academic Degree Visa",
    itemKey: "kr_d2_tb_certificate",
    label: "Tuberculosis (TB) Medical Examination Certificate from Embassy-Designated Hospital",
    description:
      "Chest X-ray TB clearance certificate issued within the past 3 months by a hospital in Tashkent designated by the Embassy of the Republic of Korea in Uzbekistan.",
    required: true,
    officialCostUsd: 45,
    processingDays: 3,
    sourceUrl: "https://overseas.mofa.go.kr/uz-ru/wpge/m_5137/contents.do",
    sourceName: "Embassy of the Republic of Korea in Uzbekistan",
    sortOrder: 4,
  },
  {
    country: "South Korea",
    visaType: "D-2 Academic Degree Visa",
    itemKey: "kr_d2_visa_fee",
    label: "D-2 Visa Application Submission & Consular Fee ($60–$80)",
    description:
      "Submit your completed Korea Visa Application Form, passport, photo (35x45 mm), and consular fee at the Korean Embassy in Tashkent to receive your Electronic Visa Issuance Confirmation.",
    required: true,
    officialCostUsd: 80,
    processingDays: 14,
    sourceUrl: "https://www.visa.go.kr/",
    sourceName: "Republic of Korea Visa Portal",
    sortOrder: 5,
  },

  // ── 5. Canada (Study Permit) ─────────────────────────────────────────────
  {
    country: "Canada",
    visaType: "Canadian Study Permit",
    itemKey: "ca_loa_pal",
    label: "Designated Learning Institution (DLI) Letter of Acceptance & Provincial Attestation Letter (PAL)",
    description:
      "Official Letter of Acceptance from a Canadian DLI with a DLI number plus a Provincial or Territorial Attestation Letter (PAL/TAL) required for undergraduate and non-exempt study permit applicants.",
    required: true,
    officialCostUsd: 0,
    processingDays: 14,
    sourceUrl: "https://www.canada.ca/en/immigration-refugees-citizenship/services/study-canada/study-permit/get-documents.html",
    sourceName: "Immigration, Refugees and Citizenship Canada (IRCC)",
    sortOrder: 1,
  },
  {
    country: "Canada",
    visaType: "Canadian Study Permit",
    itemKey: "ca_financial_20635",
    label: "Proof of Financial Support (CAD 20,635 Living Minimum + First-Year Tuition)",
    description:
      "4–6 months of bank statements, GIC (Guaranteed Investment Certificate), tuition payment receipt, or official Canadian scholarship letter proving at least CAD 20,635 (~$15,060 USD) for living costs outside Quebec plus Year 1 tuition.",
    required: true,
    officialCostUsd: 0,
    processingDays: 10,
    sourceUrl: "https://www.canada.ca/en/immigration-refugees-citizenship/services/study-canada/study-permit/get-documents/financial-support.html",
    sourceName: "IRCC Financial Support Guidelines",
    sortOrder: 2,
  },
  {
    country: "Canada",
    visaType: "Canadian Study Permit",
    itemKey: "ca_study_permit_biometrics_fee",
    label: "IRCC Online Study Permit Fee (CAD 150) & Biometrics Fee (CAD 85 at VFS Tashkent)",
    description:
      "Submit your Study Permit application via the IRCC Portal (CAD 150 + CAD 85 biometrics = CAD 235 / ~$172 USD) and complete fingerprint and photo enrollment at VFS Global in Tashkent.",
    required: true,
    officialCostUsd: 172,
    processingDays: 35,
    sourceUrl: "https://ircc.canada.ca/english/information/fees/index.asp",
    sourceName: "IRCC Fee Schedule",
    sortOrder: 3,
  },
  {
    country: "Canada",
    visaType: "Canadian Study Permit",
    itemKey: "ca_medical_ime",
    label: "Upfront / Requested Immigration Medical Exam (IME) with IRCC Panel Physician",
    description:
      "Complete a medical examination (physical exam, chest X-ray, and lab tests) with an IRCC-approved Panel Physician in Tashkent and upload the eMedical Information Sheet.",
    required: true,
    officialCostUsd: 160,
    processingDays: 7,
    sourceUrl: "https://www.canada.ca/en/immigration-refugees-citizenship/services/application/medical-police/medical-exams.html",
    sourceName: "IRCC Medical Exams",
    sortOrder: 4,
  },
  {
    country: "Canada",
    visaType: "Canadian Study Permit",
    itemKey: "ca_study_plan_sop",
    label: "Letter of Explanation / Study Plan Addressing Career Ties to Uzbekistan",
    description:
      "Structured 2-page Study Plan explaining why you chose your Canadian DLI program, how your studies are funded, and your post-graduation career path in Uzbekistan.",
    required: true,
    officialCostUsd: 0,
    processingDays: 5,
    sourceUrl: "https://www.canada.ca/en/immigration-refugees-citizenship/services/study-canada/study-permit/apply.html",
    sourceName: "IRCC Study Permit Application Guide",
    sortOrder: 5,
  },

  // ── 6. Australia (Subclass 500 Student Visa) ─────────────────────────────
  {
    country: "Australia",
    visaType: "Student Visa (Subclass 500)",
    itemKey: "au_coe",
    label: "Confirmation of Enrolment (CoE) from CRICOS-Registered Institution",
    description:
      "Official electronic Confirmation of Enrolment code issued by your Australian university after accepting your offer and paying the initial tuition deposit.",
    required: true,
    officialCostUsd: 0,
    processingDays: 7,
    sourceUrl: "https://immi.homeaffairs.gov.au/visas/getting-a-visa/visa-listing/student-500",
    sourceName: "Australian Department of Home Affairs",
    sortOrder: 1,
  },
  {
    country: "Australia",
    visaType: "Student Visa (Subclass 500)",
    itemKey: "au_oshc_insurance",
    label: "Overseas Student Health Cover (OSHC) Policy Certificate",
    description:
      "Mandatory student health insurance policy (Allianz Care, Bupa, Medibank, nib, or ahm) covering the full duration of your Australian Student Visa from arrival to departure.",
    required: true,
    officialCostUsd: 650,
    processingDays: 2,
    sourceUrl: "https://immi.homeaffairs.gov.au/visas/getting-a-visa/visa-listing/student-500#Eligibility",
    sourceName: "Australian Department of Home Affairs OSHC Rules",
    sortOrder: 2,
  },
  {
    country: "Australia",
    visaType: "Student Visa (Subclass 500)",
    itemKey: "au_financial_capacity_29710",
    label: "Proof of Financial Capacity (AUD 29,710/year Living Costs + Year 1 Tuition + Travel)",
    description:
      "Verified bank deposits, scholarship award letter, or parent income evidence demonstrating at least AUD 29,710 (~$19,600 USD) for annual living expenses plus first-year tuition and return airfare.",
    required: true,
    officialCostUsd: 0,
    processingDays: 10,
    sourceUrl: "https://immi.homeaffairs.gov.au/visas/getting-a-visa/visa-listing/student-500",
    sourceName: "Australian Department of Home Affairs",
    sortOrder: 3,
  },
  {
    country: "Australia",
    visaType: "Student Visa (Subclass 500)",
    itemKey: "au_genuine_student_gs",
    label: "Genuine Student (GS) Requirement Responses in ImmiAccount",
    description:
      "Targeted short-answer statements inside ImmiAccount detailing your current circumstances in Uzbekistan, reasons for choosing your Australian provider, and expected value of the qualification.",
    required: true,
    officialCostUsd: 0,
    processingDays: 5,
    sourceUrl: "https://immi.homeaffairs.gov.au/visas/getting-a-visa/visa-listing/student-500/genuine-student-requirement",
    sourceName: "Home Affairs Genuine Student Requirement",
    sortOrder: 4,
  },
  {
    country: "Australia",
    visaType: "Student Visa (Subclass 500)",
    itemKey: "au_immiaccount_application_fee",
    label: "Subclass 500 Visa Application Charge (AUD 1,600) & Biometrics",
    description:
      "Lodge your online Subclass 500 visa application via ImmiAccount, pay the base application charge of AUD 1,600 (~$1,056 USD), and complete biometrics and health examinations.",
    required: true,
    officialCostUsd: 1056,
    processingDays: 28,
    sourceUrl: "https://immi.homeaffairs.gov.au/visas/getting-a-visa/visa-listing/student-500",
    sourceName: "Australian Department of Home Affairs",
    sortOrder: 5,
  },

  // ── 7. Japan (College Student Visa via Certificate of Eligibility) ───────
  {
    country: "Japan",
    visaType: "Student Visa (Ryugaku)",
    itemKey: "jp_coe_certificate",
    label: "Certificate of Eligibility (CoE — 在留資格認定証明書) Issued by ISA Japan",
    description:
      "Your Japanese host university submits your CoE application to the Regional Immigration Services Bureau in Japan; once issued (6–10 weeks), the digital or physical CoE is sent to you for visa stamping.",
    required: true,
    officialCostUsd: 0,
    processingDays: 45,
    sourceUrl: "https://www.studyinjapan.go.jp/en/planning/immigration-procedures/",
    sourceName: "JASSO Study in Japan Official Guide",
    sortOrder: 1,
  },
  {
    country: "Japan",
    visaType: "Student Visa (Ryugaku)",
    itemKey: "jp_admission_permission",
    label: "Official University Letter of Admission (入学許可書)",
    description:
      "Admission certificate from your Japanese university or graduate school (or MEXT Scholarship Placement Notice issued by the Ministry of Education, Culture, Sports, Science and Technology).",
    required: true,
    officialCostUsd: 0,
    processingDays: 7,
    sourceUrl: "https://www.studyinjapan.go.jp/en/planning/immigration-procedures/",
    sourceName: "JASSO Study in Japan",
    sortOrder: 2,
  },
  {
    country: "Japan",
    visaType: "Student Visa (Ryugaku)",
    itemKey: "jp_financial_supporter_docs",
    label: "Defrayer of Expenses Letter, Bank Balance Certificate (¥2,000,000+) & Tax Certificate",
    description:
      "Financial sponsor letter, bank balance statement (~¥2,000,000 / $13,400 USD per year for self-financed students), and sponsor annual income/tax certificate (exempt for MEXT scholars).",
    required: true,
    officialCostUsd: 0,
    processingDays: 7,
    sourceUrl: "https://www.uz.emb-japan.go.jp/itprtop_ru/index.html",
    sourceName: "Embassy of Japan in the Republic of Uzbekistan",
    sortOrder: 3,
  },
  {
    country: "Japan",
    visaType: "Student Visa (Ryugaku)",
    itemKey: "jp_embassy_tashkent_submission",
    label: "Visa Application Form, Passport & Photo Submission at Embassy of Japan in Tashkent",
    description:
      "Submit your valid passport, Visa Application Form with 45x35 mm photo, and CoE at the Consular Section of the Embassy of Japan in Tashkent (1/28 Sadyk Azimov Street).",
    required: true,
    officialCostUsd: 25,
    processingDays: 5,
    sourceUrl: "https://www.uz.emb-japan.go.jp/itpr_ru/visa.html",
    sourceName: "Embassy of Japan in Uzbekistan Consular Section",
    sortOrder: 4,
  },
  {
    country: "Japan",
    visaType: "Student Visa (Ryugaku)",
    itemKey: "jp_nhi_resident_registration",
    label: "Residence Card (Zairyu Card) & Japanese National Health Insurance (NHI) Enrolment",
    description:
      "Receive your Zairyu Residence Card upon arrival at Narita/Haneda/Kansai airport and register your address and 70%-subsidized National Health Insurance at your ward office within 14 days.",
    required: true,
    officialCostUsd: 0,
    processingDays: 1,
    sourceUrl: "https://www.studyinjapan.go.jp/en/life/insurance/",
    sourceName: "JASSO Living & Insurance in Japan",
    sortOrder: 5,
  },

  // ── 8. Hungary (Stipendium Hungaricum & D-Type Study Residence Permit) ───
  {
    country: "Hungary",
    visaType: "Residence Permit for the Purpose of Study (D-Visa)",
    itemKey: "hu_admission_tempus_letter",
    label: "University Letter of Admission & Tempus Public Foundation Letter of Award",
    description:
      "Official admission certificate from your Hungarian university plus (for Stipendium Hungaricum winners) the Letter of Award issued by Tempus Public Foundation confirming tuition exemption and stipend.",
    required: true,
    officialCostUsd: 0,
    processingDays: 10,
    sourceUrl: "https://stipendiumhungaricum.hu/apply/",
    sourceName: "Tempus Public Foundation Stipendium Hungaricum",
    sortOrder: 1,
  },
  {
    country: "Hungary",
    visaType: "Residence Permit for the Purpose of Study (D-Visa)",
    itemKey: "hu_enterhungary_application",
    label: "EnterHungary / Consular D-Visa Residence Permit Application (€110 — Free for SH Scholars)",
    description:
      "Completed Application for Residence Permit for the Purpose of Studies (Appendix 14). Stipendium Hungaricum scholarship holders are exempt from the €110 (~$119 USD) administrative visa fee.",
    required: true,
    officialCostUsd: 119,
    processingDays: 21,
    sourceUrl: "http://oif.gov.hu/",
    sourceName: "National Directorate-General for Aliens Policing (NDGAP Hungary)",
    sortOrder: 2,
  },
  {
    country: "Hungary",
    visaType: "Residence Permit for the Purpose of Study (D-Visa)",
    itemKey: "hu_accommodation_proof",
    label: "Dormitory Placement Certificate or Hungarian Residential Lease Contract",
    description:
      "Official university dormitory confirmation letter or signed Hungarian rental contract with property ownership deed (tulajdoni lap) verifying your accommodation in Hungary.",
    required: true,
    officialCostUsd: 0,
    processingDays: 7,
    sourceUrl: "https://taskent.mfa.gov.hu/",
    sourceName: "Embassy of Hungary in Tashkent",
    sortOrder: 3,
  },
  {
    country: "Hungary",
    visaType: "Residence Permit for the Purpose of Study (D-Visa)",
    itemKey: "hu_financial_and_insurance",
    label: "Bank Statements (6 Months) / Stipendium Award & Comprehensive Medical Insurance",
    description:
      "6-month bank account statement and balance certificate (or Stipendium Hungaricum Letter of Award) plus travel medical insurance covering at least €30,000 until Hungarian TAJ / student insurance activation.",
    required: true,
    officialCostUsd: 0,
    processingDays: 5,
    sourceUrl: "https://taskent.mfa.gov.hu/",
    sourceName: "Embassy of Hungary in Tashkent",
    sortOrder: 4,
  },
  {
    country: "Hungary",
    visaType: "Residence Permit for the Purpose of Study (D-Visa)",
    itemKey: "hu_tashkent_consular_interview",
    label: "Biometrics & Consular Interview at Embassy of Hungary in Tashkent",
    description:
      "Attend your scheduled appointment at the Embassy of Hungary in Tashkent with original apostilled diplomas, passport valid at least 3 months beyond stay, and two passport photos.",
    required: true,
    officialCostUsd: 0,
    processingDays: 21,
    sourceUrl: "https://taskent.mfa.gov.hu/",
    sourceName: "Embassy of Hungary in Tashkent",
    sortOrder: 5,
  },

  // ── 9. Turkey (Student Visa & e-İkamet Student Residence Permit) ─────────
  {
    country: "Turkey",
    visaType: "Turkish Student Visa & e-İkamet Residence Permit",
    itemKey: "tr_acceptance_letter",
    label: "Official Turkish University Acceptance Letter (Kabul Mektubu) or Türkiye Bursları Award",
    description:
      "Official acceptance letter from a YÖK-recognized Turkish university or your Türkiye Bursları Scholarship Placement Letter issued by YTB.",
    required: true,
    officialCostUsd: 0,
    processingDays: 7,
    sourceUrl: "https://www.studyinturkiye.gov.tr/",
    sourceName: "YÖK Study in Türkiye Official Portal",
    sortOrder: 1,
  },
  {
    country: "Turkey",
    visaType: "Turkish Student Visa & e-İkamet Residence Permit",
    itemKey: "tr_consulate_tashkent_visa",
    label: "Student Visa Pre-Application & Submission at Turkish Embassy in Tashkent",
    description:
      "Complete the Turkish Ministry of Foreign Affairs pre-application form and submit your passport, biometric photos (50x60 mm), and acceptance letter at the Embassy of the Republic of Türkiye in Tashkent.",
    required: true,
    officialCostUsd: 60,
    processingDays: 14,
    sourceUrl: "https://taskent-be.mfa.gov.tr/",
    sourceName: "Embassy of the Republic of Türkiye in Tashkent",
    sortOrder: 2,
  },
  {
    country: "Turkey",
    visaType: "Turkish Student Visa & e-İkamet Residence Permit",
    itemKey: "tr_denklik_apostille",
    label: "Apostilled High School Diploma & Denklik Belgesi (Equivalency Certificate)",
    description:
      "Original high school diploma and grade transcripts with Uzbekistan Hague Apostille, required to obtain the Denklik Belgesi equivalency certificate from the Turkish Ministry of National Education.",
    required: true,
    officialCostUsd: 25,
    processingDays: 7,
    sourceUrl: "https://edenklik.meb.gov.tr/",
    sourceName: "Republic of Türkiye Ministry of National Education (e-Denklik)",
    sortOrder: 3,
  },
  {
    country: "Turkey",
    visaType: "Turkish Student Visa & e-İkamet Residence Permit",
    itemKey: "tr_health_insurance_sgk",
    label: "SGK General Health Insurance (Genel Sağlık Sigortası) or Private Student Health Policy",
    description:
      "Valid Turkish student health insurance policy covering inpatient and outpatient care (Türkiye Bursları scholars receive automatic SGK coverage).",
    required: true,
    officialCostUsd: 0,
    processingDays: 2,
    sourceUrl: "https://en.goc.gov.tr/",
    sourceName: "Presidency of Migration Management (Göç İdaresi)",
    sortOrder: 4,
  },
  {
    country: "Turkey",
    visaType: "Turkish Student Visa & e-İkamet Residence Permit",
    itemKey: "tr_e_ikamet_registration",
    label: "e-İkamet Student Residence Permit Application Within 30 Days of Arrival",
    description:
      "Apply online via e-ikamet.goc.gov.tr after enrolling at your university in Türkiye and submit your student certificate (Öğrenci Belgesi), KYK/lease address proof, and tax office card fee.",
    required: true,
    officialCostUsd: 30,
    processingDays: 14,
    sourceUrl: "https://e-ikamet.goc.gov.tr/",
    sourceName: "Göç İdaresi e-İkamet Portal",
    sortOrder: 5,
  },

  // ── 10. Poland / Schengen (National Type-D Student Visa) ─────────────────
  {
    country: "Poland",
    visaType: "National D-Type Student Visa",
    itemKey: "pl_ministry_acceptance_letter",
    label: "Ministry-Compliant University Acceptance Certificate & Tuition Payment Receipt",
    description:
      "Official certificate of enrollment issued on the statutory template of the Polish Ministry of Interior and Administration plus receipt confirming payment of first-semester/first-year tuition.",
    required: true,
    officialCostUsd: 0,
    processingDays: 10,
    sourceUrl: "https://study.gov.pl/visa-application",
    sourceName: "NAWA Study in Poland Official Portal",
    sortOrder: 1,
  },
  {
    country: "Poland",
    visaType: "National D-Type Student Visa",
    itemKey: "pl_financial_means_proof",
    label: "Bank Certificate Covering Return Ticket (PLN 2,500) + Accommodation + PLN 1,010/month",
    description:
      "Official bank statement or traveller's checks proving funds for a return ticket to Uzbekistan (PLN 2,500), full dormitory/rent costs, and at least PLN 1,010 (~$255 USD) per month for 15 months.",
    required: true,
    officialCostUsd: 0,
    processingDays: 7,
    sourceUrl: "https://www.gov.pl/web/uzbekistan",
    sourceName: "Embassy of the Republic of Poland in Tashkent",
    sortOrder: 2,
  },
  {
    country: "Poland",
    visaType: "National D-Type Student Visa",
    itemKey: "pl_schengen_medical_insurance",
    label: "Medical Insurance Policy Covering ≥ €30,000 Across All Schengen States",
    description:
      "Health insurance policy from an approved insurer on the Polish Ministry of Foreign Affairs list covering medical treatment and repatriation up to €30,000 for the full 365-day visa period.",
    required: true,
    officialCostUsd: 120,
    processingDays: 2,
    sourceUrl: "https://www.gov.pl/web/diplomacy/visas",
    sourceName: "Polish Ministry of Foreign Affairs Visa Guidelines",
    sortOrder: 3,
  },
  {
    country: "Poland",
    visaType: "National D-Type Student Visa",
    itemKey: "pl_apostille_diploma",
    label: "Hague Apostilled Secondary School / Bachelor Diploma & Language Certificate",
    description:
      "Original graduation certificate with Uzbekistan Hague Apostille, sworn Polish or English translation, and B2+ English (IELTS/TOEFL) or Polish certificate accepted by the university.",
    required: true,
    officialCostUsd: 30,
    processingDays: 5,
    sourceUrl: "https://study.gov.pl/legalization-stay",
    sourceName: "NAWA Study in Poland",
    sortOrder: 4,
  },
  {
    country: "Poland",
    visaType: "National D-Type Student Visa",
    itemKey: "pl_ekonsulat_embassy_tashkent",
    label: "e-Konsulat National D-Visa Registration & Consular Fee (€135) at Polish Embassy Tashkent",
    description:
      "Register your National D-Visa application on secure.e-konsulat.gov.pl and submit your documents and €135 (~$146 USD) consular fee at the Embassy of the Republic of Poland in Tashkent.",
    required: true,
    officialCostUsd: 146,
    processingDays: 15,
    sourceUrl: "https://www.gov.pl/web/uzbekistan",
    sourceName: "Embassy of the Republic of Poland in Tashkent",
    sortOrder: 5,
  },
];

export const RICH_MENTORS = [
  {
    name: "Dr. Sardorbek Ibragimov",
    email: "sardorbek.ibragimov@scholarbridge.example",
    avatarUrl: null,
    university: "Massachusetts Institute of Technology (MIT)",
    country: "United States",
    major: "Computer Science & Artificial Intelligence",
    degreeLevel: "PhD",
    graduationYear: 2025,
    currentRole: "AI Research Scientist & MIT Alumni Interviewer",
    bio: "Born in Tashkent and educated at MIT (BSc & PhD in EECS). Over the past 5 years I have mentored 40+ Uzbek students into Ivy League, MIT, Stanford, and CMU programs, focusing on STEM research portfolios, Maker portfolios, and CSS Profile financial aid strategies.",
    hourlyRateUsd: 45,
    currency: "USD",
    languages: JSON.stringify(["Uzbek", "English", "Russian"]),
    specialties: JSON.stringify(["US Top-20 Admissions", "STEM Research Portfolios", "CSS Profile & Financial Aid", "Common App Essays"]),
    scholarshipsWon: JSON.stringify(["MIT Full Need-Based Grant", "Siebel Scholars Fellowship"]),
    rating: 4.98,
    reviewCount: 47,
    sessionsCompleted: 132,
    isVerified: true,
    isActive: true,
    availableSlots: JSON.stringify(["Sat 15:00 Tashkent", "Sat 17:00 Tashkent", "Sun 16:00 Tashkent"]),
    responseTimeHours: 4,
  },
  {
    name: "Nilufar Rakhmatullaeva",
    email: "nilufar.r@scholarbridge.example",
    avatarUrl: null,
    university: "University of Oxford",
    country: "United Kingdom",
    major: "Public Policy (MPP) & Economics",
    degreeLevel: "Master",
    graduationYear: 2024,
    currentRole: "Development Economist & Chevening Alumna",
    bio: "Chevening and Weidenfeld-Hoffmann Scholar at the Blavatnik School of Government, University of Oxford. I help Uzbek applicants craft high-impact Chevening, Gates Cambridge, and El-Yurt Umidi leadership and career-plan essays and run realistic embassy mock interviews.",
    hourlyRateUsd: 40,
    currency: "USD",
    languages: JSON.stringify(["Uzbek", "English", "Russian"]),
    specialties: JSON.stringify(["Chevening Scholarship", "El-Yurt Umidi Prep", "UK Oxbridge & Russell Group", "Embassy Mock Interviews"]),
    scholarshipsWon: JSON.stringify(["Chevening Scholarship", "Oxford Weidenfeld-Hoffmann Finalist"]),
    rating: 4.95,
    reviewCount: 39,
    sessionsCompleted: 108,
    isVerified: true,
    isActive: true,
    availableSlots: JSON.stringify(["Wed 19:00 Tashkent", "Sat 14:00 Tashkent", "Sun 14:00 Tashkent"]),
    responseTimeHours: 6,
  },
  {
    name: "Timur Mirzakarimov",
    email: "timur.m@scholarbridge.example",
    avatarUrl: null,
    university: "Technical University of Munich (TUM)",
    country: "Germany",
    major: "Informatics & Autonomous Systems",
    degreeLevel: "Master",
    graduationYear: 2025,
    currentRole: "Senior Robotics Engineer in Munich & DAAD Scholar",
    bio: "INHA Tashkent alumnus and DAAD Study Scholarship recipient at TUM. I guide Bachelor and Master applicants through uni-assist VPD verification, TUM Curricular Analysis ECTS credit mapping, DAAD motivation letters, and German Embassy Tashkent visa preparation.",
    hourlyRateUsd: 30,
    currency: "USD",
    languages: JSON.stringify(["Uzbek", "English", "German", "Russian"]),
    specialties: JSON.stringify(["DAAD Scholarships", "TUM & RWTH Aachen", "ECTS Curricular Analysis", "German Student Visa & Sperrkonto"]),
    scholarshipsWon: JSON.stringify(["DAAD Study Scholarship", "Deutschlandstipendium at TUM"]),
    rating: 4.92,
    reviewCount: 54,
    sessionsCompleted: 164,
    isVerified: true,
    isActive: true,
    availableSlots: JSON.stringify(["Tue 20:00 Tashkent", "Thu 20:00 Tashkent", "Sat 12:00 Tashkent"]),
    responseTimeHours: 3,
  },
  {
    name: "Sevara Kim",
    email: "sevara.kim@scholarbridge.example",
    avatarUrl: null,
    university: "Seoul National University (SNU)",
    country: "South Korea",
    major: "International Commerce & Data Analytics",
    degreeLevel: "Master",
    graduationYear: 2024,
    currentRole: "Strategy Consultant in Seoul & GKS Alumna",
    bio: "Global Korea Scholarship (GKS) Embassy Track scholar at Seoul National University with TOPIK Level 6 and IELTS 8.0. I specialize in GKS Undergraduate and Graduate applications, Study Plan essays, KAIST/SNU/Yonsei admissions, and D-2 visa document apostilling.",
    hourlyRateUsd: 28,
    currency: "USD",
    languages: JSON.stringify(["Uzbek", "Korean", "English", "Russian"]),
    specialties: JSON.stringify(["Global Korea Scholarship (GKS)", "SKY & KAIST Admissions", "GKS Study Plan & Personal Statement", "TOPIK & Korean Interview Prep"]),
    scholarshipsWon: JSON.stringify(["Global Korea Scholarship (GKS-G)", "SNU Global Scholarship"]),
    rating: 4.96,
    reviewCount: 62,
    sessionsCompleted: 195,
    isVerified: true,
    isActive: true,
    availableSlots: JSON.stringify(["Mon 18:00 Tashkent", "Fri 18:00 Tashkent", "Sun 11:00 Tashkent"]),
    responseTimeHours: 2,
  },
  {
    name: "Boburjon Aliev",
    email: "boburjon.aliev@scholarbridge.example",
    avatarUrl: null,
    university: "ETH Zurich",
    country: "Switzerland",
    major: "Electrical Engineering & Information Technology",
    degreeLevel: "Master",
    graduationYear: 2025,
    currentRole: "Quantitative Researcher in Zurich & ESOP Fellow",
    bio: "Recipient of the ETH Zurich Excellence Scholarship & Opportunity Programme (ESOP). I review Master's thesis research pre-proposals, GRE Quantitative preparation plans, and applications to ETH Zurich, EPFL, and Imperial College London.",
    hourlyRateUsd: 42,
    currency: "USD",
    languages: JSON.stringify(["Uzbek", "English", "Russian"]),
    specialties: JSON.stringify(["ETH Zurich & EPFL", "ESOP Research Proposals", "GRE & Technical Interviews", "Academic CV Review"]),
    scholarshipsWon: JSON.stringify(["ETH Zurich ESOP Excellence Scholarship"]),
    rating: 4.94,
    reviewCount: 28,
    sessionsCompleted: 76,
    isVerified: true,
    isActive: true,
    availableSlots: JSON.stringify(["Sat 16:00 Tashkent", "Sun 15:00 Tashkent"]),
    responseTimeHours: 5,
  },
  {
    name: "Madinabonu Usmanova",
    email: "madinabonu.u@scholarbridge.example",
    avatarUrl: null,
    university: "University of Toronto",
    country: "Canada",
    major: "Computer Science & Cognitive Science",
    degreeLevel: "Bachelor",
    graduationYear: 2025,
    currentRole: "Product Manager in Toronto & Pearson Scholar Alumna",
    bio: "Lester B. Pearson International Scholar at the University of Toronto. I mentor high school students across Uzbekistan on Canadian university applications (U of T, UBC, Waterloo), school nomination workflows, video supplementals, and IRCC Study Permit Study Plans.",
    hourlyRateUsd: 35,
    currency: "USD",
    languages: JSON.stringify(["Uzbek", "English", "Russian"]),
    specialties: JSON.stringify(["Lester B. Pearson Scholarship", "U of T, UBC & Waterloo", "Video Supplemental Coaching", "Canadian Study Permit SOP"]),
    scholarshipsWon: JSON.stringify(["Lester B. Pearson International Scholarship"]),
    rating: 4.91,
    reviewCount: 33,
    sessionsCompleted: 94,
    isVerified: true,
    isActive: true,
    availableSlots: JSON.stringify(["Sat 18:00 Tashkent", "Sun 18:00 Tashkent"]),
    responseTimeHours: 6,
  },
  {
    name: "Ulugbek Nazarov",
    email: "ulugbek.n@scholarbridge.example",
    avatarUrl: null,
    university: "The University of Tokyo (UTokyo)",
    country: "Japan",
    major: "Mechanical & Aerospace Engineering",
    degreeLevel: "PhD",
    graduationYear: 2024,
    currentRole: "Postdoctoral Fellow in Tokyo & MEXT Scholar",
    bio: "MEXT Embassy Recommendation scholar from Bukhara who completed both MEng and PhD at the University of Tokyo. I coach students on passing the Embassy of Japan in Tashkent written math/English exams, drafting MEXT Field of Study and Research Plans, and contacting Japanese professors for Letters of Provisional Acceptance.",
    hourlyRateUsd: 32,
    currency: "USD",
    languages: JSON.stringify(["Uzbek", "English", "Japanese", "Russian"]),
    specialties: JSON.stringify(["MEXT Embassy & University Track", "Japanese Professor Outreach", "Research Plan Drafting", "UTokyo / Kyoto / Osaka Tech"]),
    scholarshipsWon: JSON.stringify(["MEXT Postgraduate Scholarship", "JSPS Young Scientist Fellowship"]),
    rating: 4.97,
    reviewCount: 41,
    sessionsCompleted: 118,
    isVerified: true,
    isActive: true,
    availableSlots: JSON.stringify(["Wed 17:00 Tashkent", "Sat 11:00 Tashkent", "Sun 12:00 Tashkent"]),
    responseTimeHours: 4,
  },
  {
    name: "Feruza Abdurakhmanova",
    email: "feruza.a@scholarbridge.example",
    avatarUrl: null,
    university: "National University of Singapore (NUS)",
    country: "Singapore",
    major: "Quantitative Finance & Economics",
    degreeLevel: "Bachelor",
    graduationYear: 2025,
    currentRole: "Investment Analyst in Singapore & El-Yurt Umidi Alumna",
    bio: "Graduated with First Class Honours from NUS on the El-Yurt Umidi Foundation Presidential Scholarship. I help Uzbek students prepare for NUS, NTU, and HKU admissions and pass both rounds of the El-Yurt Umidi national selection tests and panel interview.",
    hourlyRateUsd: 35,
    currency: "USD",
    languages: JSON.stringify(["Uzbek", "English", "Russian"]),
    specialties: JSON.stringify(["El-Yurt Umidi Foundation", "NUS & NTU Singapore", "HKU & CUHK Hong Kong", "Panel Interview Preparation"]),
    scholarshipsWon: JSON.stringify(["El-Yurt Umidi Foundation Scholarship", "NUS Dean's List Award"]),
    rating: 4.93,
    reviewCount: 45,
    sessionsCompleted: 129,
    isVerified: true,
    isActive: true,
    availableSlots: JSON.stringify(["Thu 18:00 Tashkent", "Sat 13:00 Tashkent", "Sun 13:00 Tashkent"]),
    responseTimeHours: 3,
  },
  {
    name: "Shakhboz Kadirov",
    email: "shakhboz.k@scholarbridge.example",
    avatarUrl: null,
    university: "Corvinus University of Budapest & ELTE",
    country: "Hungary",
    major: "Applied Economics & Data Science",
    degreeLevel: "Master",
    graduationYear: 2024,
    currentRole: "Data Lead in Budapest & Stipendium Hungaricum Mentor",
    bio: "Stipendium Hungaricum and Erasmus+ Mundus alumnus. I have guided over 80 Uzbek students through the Tempus DreamApply portal, Uzbekistan Ministry of Higher Education bilateral nomination requirements, and Hungarian university entrance exams.",
    hourlyRateUsd: 22,
    currency: "USD",
    languages: JSON.stringify(["Uzbek", "English", "Russian"]),
    specialties: JSON.stringify(["Stipendium Hungaricum", "Erasmus Mundus Joint Masters", "DreamApply Motivation Letters", "ELTE / BME / Debrecen / Corvinus"]),
    scholarshipsWon: JSON.stringify(["Stipendium Hungaricum Full Grant", "Erasmus+ Mobility Grant"]),
    rating: 4.89,
    reviewCount: 51,
    sessionsCompleted: 170,
    isVerified: true,
    isActive: true,
    availableSlots: JSON.stringify(["Tue 19:00 Tashkent", "Fri 19:00 Tashkent", "Sat 15:00 Tashkent"]),
    responseTimeHours: 3,
  },
  {
    name: "Gulnoza Ergasheva",
    email: "gulnoza.e@scholarbridge.example",
    avatarUrl: null,
    university: "Politecnico di Milano",
    country: "Italy",
    major: "Architecture & Urban Design",
    degreeLevel: "Master",
    graduationYear: 2024,
    currentRole: "Urban Designer in Milan & Invest Your Talent Scholar",
    bio: "Recipient of the Italian Ministry of Foreign Affairs 'Invest Your Talent in Italy' (IYT) and DSU Lombardy regional scholarships at Politecnico di Milano. I help students prepare architectural/design portfolios, ISEE Parificato family income documents in Uzbekistan, and Universitaly pre-enrollment.",
    hourlyRateUsd: 25,
    currency: "USD",
    languages: JSON.stringify(["Uzbek", "English", "Italian", "Russian"]),
    specialties: JSON.stringify(["Invest Your Talent in Italy & MAECI", "DSU Need-Based Scholarship", "Politecnico di Milano / Bologna / Sapienza", "Architecture & Design Portfolios"]),
    scholarshipsWon: JSON.stringify(["Invest Your Talent in Italy (IYT)", "Politecnico di Milano Platinum Merit Award"]),
    rating: 4.9,
    reviewCount: 36,
    sessionsCompleted: 98,
    isVerified: true,
    isActive: true,
    availableSlots: JSON.stringify(["Wed 20:00 Tashkent", "Sat 16:00 Tashkent"]),
    responseTimeHours: 5,
  },
  {
    name: "Davronbek Yuldashev",
    email: "davronbek.y@scholarbridge.example",
    avatarUrl: null,
    university: "New York University Abu Dhabi (NYUAD)",
    country: "United Arab Emirates",
    major: "Economics & Political Science",
    degreeLevel: "Bachelor",
    graduationYear: 2025,
    currentRole: "Sovereign Wealth Analyst in Abu Dhabi & Sheikh Mohamed Scholar",
    bio: "Admitted to NYU Abu Dhabi from Namangan with a full $320,000 four-year financial aid package including books, flights home to Tashkent, and study-away semesters in New York and Paris. I coach students on Candidate Weekend invitations, Common App essays, and CSS Profile filing.",
    hourlyRateUsd: 35,
    currency: "USD",
    languages: JSON.stringify(["Uzbek", "English", "Russian"]),
    specialties: JSON.stringify(["NYU Abu Dhabi & Georgetown Qatar", "Candidate Weekend Prep", "Full-Need Liberal Arts Aid", "Common App Personal Statement"]),
    scholarshipsWon: JSON.stringify(["NYUAD Full Falcon Financial Aid Package"]),
    rating: 4.96,
    reviewCount: 44,
    sessionsCompleted: 121,
    isVerified: true,
    isActive: true,
    availableSlots: JSON.stringify(["Fri 20:00 Tashkent", "Sat 17:00 Tashkent", "Sun 17:00 Tashkent"]),
    responseTimeHours: 3,
  },
  {
    name: "Aziza Tursunходжаева (Aziza Tursunkhodjaeva)",
    email: "aziza.t@scholarbridge.example",
    avatarUrl: null,
    university: "Columbia University",
    country: "United States",
    major: "Educational Policy & Applied Linguistics",
    degreeLevel: "Master",
    graduationYear: 2023,
    currentRole: "Fulbright Alumna & IELTS / Academic Writing Specialist",
    bio: "Fulbright Foreign Student Program alumna at Columbia University (IELTS 8.5, Writing 8.5). I specialize in Fulbright & Humphrey Fellowship essays, IELTS Writing Band 6.0 → 8.0 diagnostic coaching, and Statement of Purpose editing for humanities and social sciences.",
    hourlyRateUsd: 38,
    currency: "USD",
    languages: JSON.stringify(["Uzbek", "English", "Russian"]),
    specialties: JSON.stringify(["Fulbright Foreign Student Program", "IELTS Writing Band 7.5–8.5", "Statement of Purpose Editing", "US Graduate School Admissions"]),
    scholarshipsWon: JSON.stringify(["Fulbright Foreign Student Scholarship", "Columbia Teachers College Merit Grant"]),
    rating: 4.97,
    reviewCount: 58,
    sessionsCompleted: 184,
    isVerified: true,
    isActive: true,
    availableSlots: JSON.stringify(["Mon 19:00 Tashkent", "Thu 19:00 Tashkent", "Sat 14:00 Tashkent"]),
    responseTimeHours: 4,
  },
];

export const RICH_LEARNING_PROVIDERS = [
  {
    providerKey: "british_council_uz",
    name: "British Council Uzbekistan — Official IELTS Test Centre",
    kind: "test_prep",
    status: "sandbox",
    isEnabled: true,
    config: JSON.stringify({
      city: "Tashkent, Samarkand, Bukhara, Fergana & Urgench",
      url: "https://www.britishcouncil.uz/en/exam/ielts",
      description:
        "Official UKVI and Academic IELTS computer-delivered and paper-based test center across Uzbekistan with free IELTS Ready Premium preparation access for registered test takers.",
      lastVerifiedAt: "2026-10-01",
    }),
  },
  {
    providerKey: "idp_ielts_tashkent",
    name: "IDP IELTS Uzbekistan (Edu-Action Official Test Centre)",
    kind: "test_prep",
    status: "sandbox",
    isEnabled: true,
    config: JSON.stringify({
      city: "Tashkent & Regional Centres",
      url: "https://ielts.idp.com/uzbekistan",
      description:
        "Co-owner of IELTS offering daily computer-delivered IELTS Academic, IELTS One Skill Retake, and official mock test diagnostics in Tashkent and regional cities.",
      lastVerifiedAt: "2026-10-01",
    }),
  },
  {
    providerKey: "educationusa_tashkent",
    name: "EducationUSA Uzbekistan Advising Center (American Councils)",
    kind: "advising",
    status: "sandbox",
    isEnabled: true,
    config: JSON.stringify({
      city: "Tashkent, Samarkand & Namangan",
      url: "https://educationusa.state.gov/centers/educationusa-advising-center-tashkent",
      description:
        "U.S. Department of State network offering free advising, Competitive College Club (CCC) cohorts, Opportunity Funds for low-income top students, and official SAT/TOEFL prep library resources.",
      lastVerifiedAt: "2026-10-01",
    }),
  },
  {
    providerKey: "ets_toefl_gre_uz",
    name: "ETS Official TOEFL iBT & GRE General Test Centers Uzbekistan",
    kind: "test_prep",
    status: "sandbox",
    isEnabled: true,
    config: JSON.stringify({
      city: "Tashkent & Samarkand",
      url: "https://www.ets.org/toefl/test-takers/ibt/take/locations.html",
      description:
        "Authorized Prometric / ETS test centers in Uzbekistan administering TOEFL iBT and GRE General Tests with official ETS TestReady practice diagnostics.",
      lastVerifiedAt: "2026-10-01",
    }),
  },
  {
    providerKey: "college_board_sat_uz",
    name: "College Board Digital SAT Test Centers Uzbekistan",
    kind: "test_prep",
    status: "sandbox",
    isEnabled: true,
    config: JSON.stringify({
      city: "Tashkent, Nukus, Samarkand, Bukhara & Fergana",
      url: "https://satsuite.collegeboard.org/sat/test-center-search",
      description:
        "Official Digital SAT and AP exam administration centers hosted at Presidential Schools, Tashkent International School, and accredited private testing hubs across all 14 regions of Uzbekistan.",
      lastVerifiedAt: "2026-10-01",
    }),
  },
  {
    providerKey: "daad_lektoren_tashkent",
    name: "DAAD Information Point Tashkent & TestDaF Examination Centre",
    kind: "advising",
    status: "sandbox",
    isEnabled: true,
    config: JSON.stringify({
      city: "Tashkent",
      url: "https://www.daad-uzbekistan.org/",
      description:
        "Official German Academic Exchange Service (DAAD) representation in Uzbekistan providing free study-in-Germany advising, OnSET/TestDaF testing, and scholarship workshops.",
      lastVerifiedAt: "2026-10-01",
    }),
  },
  {
    providerKey: "korean_education_center_tashkent",
    name: "Tashkent Korean Education Center (TOPIK & GKS Official Center)",
    kind: "test_prep",
    status: "sandbox",
    isEnabled: true,
    config: JSON.stringify({
      city: "Tashkent",
      url: "https://www.topik.go.kr/",
      description:
        "Official Ministry of Education of the Republic of Korea institution in Tashkent administering the TOPIK I & II Korean proficiency exams and Global Korea Scholarship (GKS) advising.",
      lastVerifiedAt: "2026-10-01",
    }),
  },
  {
    providerKey: "khan_academy_sat_prep",
    name: "Khan Academy & Bluebook Official Digital SAT Practice",
    kind: "test_prep",
    status: "sandbox",
    isEnabled: true,
    config: JSON.stringify({
      city: "Online (Global & Uzbek Localized)",
      url: "https://www.khanacademy.org/test-prep/digital-sat",
      description:
        "Official free College Board partner for Digital SAT Reading & Writing and Math mastery, paired with full-length adaptive Bluebook practice exams.",
      lastVerifiedAt: "2026-10-01",
    }),
  },
];

let richSeedPromise: Promise<void> | null = null;

export async function seedRichPlatformData(): Promise<{
  storiesInserted: number;
  visaRequirementsInserted: number;
  mentorsInserted: number;
  providersInserted: number;
  goalTemplatesInserted: number;
  answerPromptsInserted: number;
  checklistItemsInserted: number;
}> {
  let storiesInserted = 0;
  let visaRequirementsInserted = 0;
  let mentorsInserted = 0;
  let providersInserted = 0;
  let goalTemplatesInserted = 0;
  let answerPromptsInserted = 0;
  let checklistItemsInserted = 0;

  // 1. Seed Verified Success Stories (idempotent by displayName + admittedUniversity)
  for (const story of RICH_SUCCESS_STORIES) {
    const existing = await db
      .select({ id: successStories.id })
      .from(successStories)
      .where(
        and(
          eq(successStories.displayName, story.studentName),
          eq(successStories.admittedUniversity, story.universityName)
        )
      )
      .limit(1);
    if (existing.length > 0) continue;

    await db.insert(successStories).values({
      displayName: story.studentName,
      homeCountry: story.studentCountry,
      admittedUniversity: story.universityName,
      admittedCountry: story.universityCountry,
      degreeLevel: story.degreeLevel,
      major: story.program,
      intakeYear: story.admissionYear,
      gpa: story.gpa,
      gpaScale: 4.0,
      ielts: story.ieltsScore,
      sat: story.satScore,
      activities: story.keyFactors,
      awards: JSON.stringify([story.scholarshipWon]),
      essayTitle: story.storyTitle,
      essayExcerpt: story.storyText,
      advice: story.advice,
      scholarshipName: story.scholarshipWon,
      scholarshipAmountUsd: story.scholarshipAmountUsd,
      status: story.status,
      isVerified: story.isVerified,
      isFeatured: story.isFeatured,
      views: story.helpfulCount,
    });
    storiesInserted += 1;
  }

  // 2. Seed Official Visa Requirements (idempotent by country + title)
  for (const req of RICH_VISA_REQUIREMENTS) {
    const existing = await db
      .select({ id: visaRequirements.id })
      .from(visaRequirements)
      .where(
        and(
          eq(visaRequirements.country, req.country),
          eq(visaRequirements.title, req.label)
        )
      )
      .limit(1);
    if (existing.length > 0) continue;

    await db.insert(visaRequirements).values({
      country: req.country,
      visaType: req.visaType,
      title: req.label,
      instructions: req.description,
      isRequired: req.required,
      sourceUrl: req.sourceUrl,
      sourceName: req.sourceName,
      sourceType: "government",
      lastVerifiedAt: VERIFIED_DATE,
      verificationStatus: "verified",
      sortOrder: req.sortOrder,
    });
    visaRequirementsInserted += 1;
  }

  // 3. Seed Verified Alumni Mentors (idempotent by displayName + university)
  for (const mentor of RICH_MENTORS) {
    const existing = await db
      .select({ id: mentors.id })
      .from(mentors)
      .where(
        and(
          eq(mentors.displayName, mentor.name),
          eq(mentors.university, mentor.university)
        )
      )
      .limit(1);
    if (existing.length > 0) continue;

    let parsedAwards: string[] = [];
    try {
      parsedAwards = JSON.parse(mentor.scholarshipsWon) as string[];
    } catch {
      parsedAwards = [];
    }

    await db.insert(mentors).values({
      displayName: mentor.name,
      headline: mentor.currentRole,
      bio: mentor.bio,
      photoUrl: mentor.avatarUrl,
      country: mentor.country,
      university: mentor.university,
      program: mentor.major,
      degreeLevel: mentor.degreeLevel,
      scholarshipName: parsedAwards[0] ?? null,
      expertise: mentor.specialties,
      languages: mentor.languages,
      hourlyRateUsd: mentor.hourlyRateUsd,
      freeSessions: false,
      isVerified: mentor.isVerified,
      verificationNote: `Verified ${mentor.university} alumnus (${mentor.graduationYear})`,
      isActive: mentor.isActive,
      ratingAverage: mentor.rating,
      ratingCount: mentor.reviewCount,
    });
    mentorsInserted += 1;
  }

  // 4. Seed Official Learning & Test Prep Providers (idempotent by providerKey)
  for (const provider of RICH_LEARNING_PROVIDERS) {
    const existing = await db
      .select({ id: learningProviders.id })
      .from(learningProviders)
      .where(eq(learningProviders.providerKey, provider.providerKey))
      .limit(1);
    if (existing.length > 0) continue;

    await db.insert(learningProviders).values(provider);
    providersInserted += 1;
  }

  // 5. Seed the growth catalogues. `ensureGrowthTables` (src/lib/growth/db.ts)
  //    inserts the same rows on its own bootstrap, so both paths must dedupe on
  //    the same natural key — a title (or prompt question) is the only stable
  //    identity we have, and it is what makes a re-run a no-op.
  //
  //    Each catalogue is independent and individually tolerant of its table not
  //    existing yet: this function is also reached from routes that never run
  //    the growth DDL (mentors, journey), and a missing `goal_templates` table
  //    must not cost them the stories, visa requirements, mentors or providers
  //    they actually asked for.
  try {
    const existingGoalTitles = new Set(
      (await db.select({ title: goalTemplates.title }).from(goalTemplates)).map((g) => g.title)
    );
    for (const [i, g] of SEED_GOAL_TEMPLATES.entries()) {
      if (existingGoalTitles.has(g.title)) continue;
      await db.insert(goalTemplates).values({ ...g, steps: JSON.stringify(g.steps), sortOrder: i });
      goalTemplatesInserted += 1;
    }
  } catch (err) {
    console.error("seedRichPlatformData: goal_templates skipped:", err);
  }

  try {
    const existingQuestions = new Set(
      (await db.select({ question: answerPrompts.question }).from(answerPrompts)).map((p) => p.question)
    );
    for (const [i, p] of SEED_ANSWER_PROMPTS.entries()) {
      if (existingQuestions.has(p.question)) continue;
      await db.insert(answerPrompts).values({ ...p, sortOrder: i });
      answerPromptsInserted += 1;
    }
  } catch (err) {
    console.error("seedRichPlatformData: answer_prompts skipped:", err);
  }

  try {
    const existingItemTitles = new Set(
      (await db.select({ title: checklistItems.title }).from(checklistItems)).map((c) => c.title)
    );
    for (const [i, c] of SEED_CHECKLIST_ITEMS.entries()) {
      if (existingItemTitles.has(c.title)) continue;
      await db.insert(checklistItems).values({ ...c, sortOrder: i });
      checklistItemsInserted += 1;
    }
  } catch (err) {
    console.error("seedRichPlatformData: checklist_items skipped:", err);
  }

  return {
    storiesInserted,
    visaRequirementsInserted,
    mentorsInserted,
    providersInserted,
    goalTemplatesInserted,
    answerPromptsInserted,
    checklistItemsInserted,
  };
}

/** Process-cached helper for API routes and lazy table bootstraps. */
export async function ensureRichPlatformDataSeeded(): Promise<void> {
  if (!richSeedPromise) {
    richSeedPromise = seedRichPlatformData()
      .then(() => undefined)
      .catch((err) => {
        richSeedPromise = null;
        console.error("ensureRichPlatformDataSeeded warning:", err);
      });
  }
  return richSeedPromise;
}
