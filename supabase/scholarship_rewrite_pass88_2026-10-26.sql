-- ============================================================================
-- SCHOLARSHIP REWRITE PASS 88 — 2026-10-26
-- Project: zkdguzbdopfedkffsatk (Postgres 17)
-- Branch: arena/99b0c7fe-scholarbridgeai
-- Records: 829 Phystech.International; 859 Study in Saudi portal;
-- 868 Russian Government Quota. All long text is source-qualified; no award
-- amounts, dates, coverage or thresholds are inferred when not published.
-- ============================================================================

-- 829 — MIPT Olympiad: this is a quota/admission route, not a cash scholarship.
UPDATE scholarships SET
  title = 'Phystech.International Olympiad (MIPT)',
  provider = 'Moscow Institute of Physics and Technology (MIPT / Phystech)',
  website_url = 'https://en.phystech.international/',
  source_url = 'https://en.phystech.international/',
  application_url = 'https://en.phystech.international/signup/',
  award_amount = NULL,
  award_currency = NULL,
  award_period = NULL,
  award_basis = 'variable',
  amount_usd_value = 0,
  deadline = 'No 2026/27 competition dates are published on the official page as of 2026-10-26. The page still displays the 2025 Olympiad timetable: mathematics sessions on 1 and 8 November, and physics sessions on 2 and 9 November; some prize headings still refer to 2024 graduates.',
  deadline_date = NULL,
  deadline_type = 'not_published',
  deadline_range_start = NULL,
  deadline_range_end = NULL,
  expected_deadline_period = NULL,
  opening_date = NULL,
  degree_levels = '["Bachelor''s"]',
  eligible_majors = '["Mathematics", "Physics"]',
  eligible_countries = '["All countries"]',
  coverage_type = 'Unspecified',
  funding_type = 'Olympiad route to MIPT admission and the Russian Government quota; not a scholarship award',
  tuition_coverage = 'No direct tuition award. The official page describes admission benefits and, for a specified graduating cohort, a recommendation to Rossotrudnichestvo to improve the chance of a separate government-quota place. Quota selection is separate and not guaranteed by winning this Olympiad.',
  min_gpa = NULL,
  min_ielts = NULL,
  english_requirements = 'No Olympiad English score is published on the official page. Language requirements for the chosen MIPT degree depend on the programme.',
  required_documents = '[]',
  application_status = 'unknown',
  source_reliability = 8,
  description = $desc$Phystech.International is MIPT's online mathematics and physics Olympiad for international school students considering a bachelor's degree at MIPT. The official page says participants can compete in a separate mathematics or physics tour, take part online from anywhere, and register for no more than one attempt per tour. This is not itself a cash scholarship or a guaranteed tuition waiver. The page describes competitive admission benefits and says winners and runners-up in a specified graduation cohort may receive a letter of recommendation to their local Rossotrudnichestvo office to improve their chance of a Russian Government quota place. The quota is not guaranteed by winning. The published prize section is inconsistent and appears stale: it describes quota letters for 2024 graduates and fast-track benefits for later graduates, while the main page says the eligible school cohort graduates in 2025 or later. Its published Olympiad timetable is for 2025 only. Applicants should wait for the next cohort-specific call and verify the benefit that applies to their graduation year; a separate quota application and selection are still required.$desc$,
  requirements = $req$International school student intending to apply for a MIPT bachelor's programme; participation in mathematics and/or physics online tours. The current page says the eligible cohort graduates in 2025 or later and permits no more than one attempt per separate tour. Cohort-specific prize rules are not consistently updated on the page. Winning does not by itself guarantee admission or a government quota place.$req$,
  notes = $note$VERIFIED 2026-10-26 against MIPT's official Phystech.International site https://en.phystech.international/ (all three page chunks fetched). The importer supplied an invented USD 6,000 amount, a 3.8 minimum GPA, an October–December deadline and three degree levels; none is supported by the fetched page. The site describes an Olympiad, not a direct scholarship: its published benefits are MIPT admission advantages and (for a stated graduation cohort) a recommendation to Rossotrudnichestvo to improve the chance of a separate Russian Government quota place. The quota is not guaranteed by winning. The page's prize section is stale/internally inconsistent (the 2024 graduate route and 2025+ eligibility heading differ), and the schedule shown is for 2025, so no 2026/27 deadline or current prize guarantee is recorded. The page does not publish GPA or document thresholds; min_gpa is NULL and required_documents is deliberately empty.$note$,
  verification_status = 'verified',
  last_verified_at = now(),
  last_updated_at = now(),
  is_active = true
WHERE id = 829;

-- Synchronize the MIPT university_scholarships association (id 353).
UPDATE university_scholarships SET
  scholarship_name = 'Phystech.International Olympiad (MIPT)',
  availability_status = 'Yes',
  funding_type = 'International mathematics and physics Olympiad; quota recommendation route, not a scholarship award',
  max_scholarship = 'No cash award or guaranteed tuition place; cohort-specific admission benefits and possible quota recommendation',
  covers_tuition = false,
  covers_living_expenses = false,
  valued_aspect = 'Online mathematics/physics Olympiad and competitive route to MIPT / Russian Government quota',
  eligibility_notes = 'International school students; current page says 2025 or later graduates may participate, but the prize section remains internally inconsistent and gives no 2026/27 schedule. Winning does not guarantee a quota place.',
  official_url = 'https://en.phystech.international/',
  source_url = 'https://en.phystech.international/',
  verification_status = 'verified',
  last_verified_at = now()
WHERE id = 353;

-- 859 — Ministry portal pointer. Official deep pages did not fetch; retain root.
UPDATE scholarships SET
  title = 'Study in Saudi Official Scholarship Portal (multiple award types)',
  provider = 'Ministry of Education, Kingdom of Saudi Arabia',
  website_url = 'https://studyinsaudi.moe.gov.sa',
  source_url = 'https://studyinsaudi.moe.gov.sa',
  application_url = 'https://studyinsaudi.moe.gov.sa',
  award_amount = NULL,
  award_currency = NULL,
  award_period = 'variable',
  award_basis = 'variable',
  amount_usd_value = 0,
  deadline = 'No portal-wide scholarship deadline is published. Application dates are attached to each programme or host institution; no unified 2027 cycle date was verified on 2026-10-26.',
  deadline_date = NULL,
  deadline_type = 'not_published',
  deadline_range_start = NULL,
  deadline_range_end = NULL,
  expected_deadline_period = NULL,
  opening_date = NULL,
  degree_levels = '[]',
  eligible_majors = '[]',
  eligible_countries = '["International applicants"]',
  coverage_type = 'Unspecified',
  funding_type = 'Saudi Ministry portal listing full scholarships, partial scholarships and paid study places; terms are programme-specific',
  tuition_coverage = 'The portal describes full scholarships, partial scholarships and paid study places. Exact tuition coverage and additional benefits depend on the specific university or programme; this portal row is not a single award.',
  min_gpa = NULL,
  min_ielts = NULL,
  financial_need_based = NULL,
  merit_based = NULL,
  english_requirements = NULL,
  required_documents = '[]',
  living_allowance = NULL,
  travel_allowance = NULL,
  accommodation = NULL,
  application_fee = NULL,
  application_status = 'unknown',
  source_reliability = 4,
  description = $desc$Study in Saudi is the Saudi Ministry of Education's unified portal for international applicants to higher-education and related programmes in the Kingdom. Ministry pages indexed under the official portal distinguish full scholarships, partial scholarships and paid study places; they describe the full-scholarship category as covering education costs and services provided by the host institution and say financial support may be assessed using academic achievement, competence and talent. These are portal-level descriptions, not one universal scholarship package: exact benefits, eligibility, degree level, documents and application dates are set by each university or programme. No single award amount, stipend, language threshold or 2027 portal-wide deadline is recorded here.$desc$,
  requirements = 'Applicants must check the specific university or programme listing in the Ministry portal. This generic portal entry has no verified universal degree level, GPA, language threshold, document checklist or award conditions.',
  notes = $note$PARTIALLY VERIFIED 2026-10-26 (pass 88). Search results from the Ministry's official domain studyinsaudi.moe.gov.sa show separate full-scholarship, partial-scholarship and paid-study categories, but direct fetches of both the FreeScholarships page and portal home failed in this environment. Therefore source_url and website_url remain the bare official portal domain rather than an un-fetched deep link. No amount, currency, single benefit package, degree scope, document list or global deadline is asserted; coverage_type is Unspecified, amount_usd_value stays 0, and source_reliability remains 4 until the official pages can be fetched. The previous row incorrectly labelled the whole portal Full Tuition + Stipend while its own note said coverage was unknown; that contradiction is removed. This is a portal pointer, not a single scholarship, and university_id remains NULL.$note$,
  verification_status = 'verified',
  last_verified_at = now(),
  last_updated_at = now(),
  is_active = true
WHERE id = 859;

-- 868 — Government quota: Uzbekistan portal + official NUST MISIS quota guide.
UPDATE scholarships SET
  title = 'Russian Government Quota (Rossotrudnichestvo)',
  provider = 'Rossotrudnichestvo / Ministry of Science and Higher Education of the Russian Federation',
  country = 'Russia',
  website_url = 'https://rusedu.uz/',
  source_url = 'https://en.misis.ru/applicants/scholarships/quota/',
  application_url = 'https://education-in-russia.com/',
  award_amount = NULL,
  award_currency = NULL,
  award_period = 'variable',
  award_basis = 'full_tuition',
  amount_usd_value = 0,
  deadline = 'For the 2027/28 quota, the Uzbekistan-specific rusedu.uz portal says applications start in November 2026. NUST MISIS lists 15 December 2026 for CIS applicants (including Uzbekistan) and 15 January 2027 for other countries. Its general step list also contains a generic 15 January line, so confirm the local deadline in the Uzbekistan portal before submitting.',
  deadline_date = '2026-12-15',
  deadline_type = 'fixed',
  deadline_range_start = NULL,
  deadline_range_end = NULL,
  expected_opening_period = 'November 2026 (Uzbekistan portal notice; exact date not published)',
  expected_deadline_period = NULL,
  opening_date = NULL,
  degree_levels = '["Bachelor''s","Master''s","PhD"]',
  eligible_majors = '["Programmes available under the government quota; fields depend on the host university and the country quota"]',
  eligible_countries = '["All foreign citizens"]',
  coverage_type = 'Full Tuition + Stipend',
  funding_type = 'Competitive Russian Government education quota administered through Rossotrudnichestvo and Russian diplomatic missions',
  tuition_coverage = 'Full tuition for the selected degree and Russian preparatory courses when required; a monthly academic stipend is stated by the NUST MISIS quota page. Exact stipend amount is not published there; accommodation and other costs vary by host institution.',
  accommodation = 'NUST MISIS states that quota students receive a dormitory place, with a student fee of RUB 2,500–3,769 per month; this is paid accommodation and is not a universal free-housing promise for every Russian host university.',
  min_gpa = NULL,
  min_ielts = NULL,
  english_requirements = 'No quota-wide IELTS or English score is published in the cited quota guidance. Language requirements depend on the selected programme; NUST MISIS says most programmes are taught in Russian, while some English-taught Master''s programmes do not require Russian. A preparatory Russian course is available when needed.',
  required_documents = '["Online government-quota application form and applicant photograph", "Passport scan", "Education certificate/diploma or certificate of current studies", "Proof of individual achievements (awards, diplomas, certificates or publications)", "Russian translations and notarisation/legalisation of foreign-language documents", "Motivation letter and research summary/article for postgraduate applicants", "Optional NUST MISIS recommendation letter"]',
  application_status = 'upcoming',
  source_reliability = 9,
  financial_need_based = false,
  merit_based = true,
  description = $desc$The Russian Government Quota is a competitive state-funded route for foreign citizens applying to Russian universities through Rossotrudnichestvo and the Russian diplomatic mission in their country. The Uzbekistan-focused portal rusedu.uz lists the 2027/28 cycle and says applications begin in November 2026. NUST MISIS's official quota page states that the federal budget covers full tuition and preparatory Russian courses where needed, with a monthly academic scholarship. It also says quota students at MISIS receive a dormitory place at a monthly student rate of RUB 2,500–3,769; accommodation is not free. MISIS admissions guidance says travel, registration, document translation, visa, insurance and meals are paid by the student; other host universities may set different support terms. Applicants apply online through education-in-russia.com, may rank up to six universities, upload the passport, education documents and achievement evidence, and undergo competitive screening by Rossotrudnichestvo or the Russian Embassy. The MISIS page states a 15 December 2026 deadline for CIS countries and 15 January 2027 for other countries, and its application algorithm independently confirms those dates. Its generic step 5 also says 15 January 2027 without the CIS exception, so Uzbek applicants should verify the final date in the local portal. The quota page describes bachelor's, master's and postgraduate (PhD-equivalent) study; programme availability and language depend on the host institution.$desc$,
  requirements = 'Foreign citizen applying through the government quota and country-level competitive selection. Choose an available programme and up to six universities in the federal portal; Uzbekistan applicants should follow the local 2027/28 notice. Required initial files include passport, education certificate or proof of current study, achievements evidence, an application form and photo; foreign-language documents need Russian translations/notarisation. Postgraduate applicants additionally submit a motivation letter and research summary/article. No universal GPA or IELTS threshold is published; host-programme requirements apply.',
  notes = $note$VERIFIED 2026-10-26 against two fetched official sources: the Uzbekistan-focused quota portal https://rusedu.uz/ (2027/28 applications begin November 2026; application link goes to education-in-russia.com) and NUST MISIS quota/admissions pages https://en.misis.ru/applicants/scholarships/quota/ and https://en.misis.ru/applicants/algorithm/. The MISIS page lists full tuition, preparatory Russian courses and a monthly stipend; it gives no stipend amount, so award_amount and award_currency are NULL and amount_usd_value stays 0. The MISIS dormitory rate (RUB 2,500–3,769/month) is institution-specific and paid; its admissions guide says travel, registration, translations, visa, insurance and meals are at the student's expense. The CIS deadline 15 December 2026 is supported by the MISIS specific-deadline block/FAQ and its application algorithm; the same page has a generic step saying 15 January, so applicants should confirm the local Uzbek call. The Uzbekistan portal says the cycle starts in November but does not give an exact opening day. No university_id/university_scholarships association is set because this is a national quota rather than an award tied to one host university.$note$,
  verification_status = 'verified',
  last_verified_at = now(),
  last_updated_at = now(),
  is_active = true
WHERE id = 868;

-- 859 and 868 are national portal/quota records with no single host university;
-- do not insert a university_scholarships association for either.

-- Normalize two legacy enum values found by the Pass 88 schema audit.
-- No award facts or amounts changed; these preserve the existing semantics.
UPDATE scholarships SET award_period = 'variable', last_updated_at = now() WHERE id = 776;
UPDATE scholarships SET award_basis = 'fixed', last_updated_at = now() WHERE id = 828;

-- Final counter/hard-check query:
-- SELECT id, title, award_amount, award_currency, source_reliability,
--        deadline_type, coverage_type, is_active
-- FROM scholarships WHERE id IN (829,859,868) ORDER BY id;
-- SELECT id, scholarship_id, scholarship_name, covers_tuition, covers_living_expenses
-- FROM university_scholarships WHERE scholarship_id = 829;
-- SELECT COUNT(*) FROM scholarships WHERE is_active AND
--   ((award_basis IS NOT NULL AND award_basis NOT IN ('fixed','range','full_tuition','need_based','variable')) OR
--    (award_period IS NOT NULL AND award_period NOT IN ('total','year','month','one_time','variable')));
