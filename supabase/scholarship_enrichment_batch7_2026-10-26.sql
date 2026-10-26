-- Scholarship Enrichment Batch 7 — replay SQL (2026-10-26)
-- Adds scholarships 926-932 and sources 3061-3067 with scholarship_sources links.
-- See docs/SCHOLARSHIP_ENRICHMENT_BATCH_7_2026-10-26.md for the audit trail.
-- All content verified first-hand on official programme pages fetched 2026-10-26.

-- ---------------------------------------------------------------------------
-- 926: Heydar Aliyev International Education Grant (Azerbaijan)
-- ---------------------------------------------------------------------------
INSERT INTO scholarships (
  id, title, provider, country, coverage_type, amount_usd_value,
  deadline, deadline_date, deadline_type, deadline_range_start, deadline_range_end,
  degree_levels, eligible_majors, eligible_countries, min_gpa, min_ielts,
  financial_need_based, merit_based,
  description, requirements, website_url, source_url, application_url,
  recurrence, application_status, verification_status, source_reliability, is_active,
  last_verified_at, last_updated_at, notes, university_id,
  award_amount, award_currency, award_period, award_basis, living_allowance, funding_type, tuition_coverage,
  english_requirements, required_documents,
  expected_opening_period, expected_deadline_period, rounds
) VALUES (
  926,
  'Heydar Aliyev International Education Grant (Azerbaijan Government Scholarship)',
  'Ministry of Science and Education, Republic of Azerbaijan',
  'Azerbaijan', 'Full Funding', 0,
  $dl$Annual government call. The 2026-27 cycle has passed (nominations 16 February - 15 April 2026; SIACAS applications 1-10 June 2026). A new annual call is expected for the 2027-28 academic year.$dl$,
  NULL, 'not_published', NULL, NULL,
  $json$["Bachelor","Master","PhD"]$json$,
  $json$["All fields, including general medicine and residency and language-preparatory courses (higher education institutions of Azerbaijan)"]$json$,
  $json$["Uzbekistan (OIC member state) - citizens of OIC and NAM member states, Small Island Developing States and countries with cultural ties to Azerbaijan, as listed in the official call"]$json$, NULL, NULL,
  false, true,
  $desc$The "Heydar Aliyev International Education Grant" was established by the President of the Republic of Azerbaijan to fund citizens of the Organization of Islamic Cooperation (OIC) and Non-Aligned Movement member countries, Small Island Developing States and countries with cultural ties to Azerbaijan (the official call lists Uzbekistan among the OIC countries). One hundred grants are awarded each year over five years for Bachelor's, Master's and PhD degrees (including general medicine and residency, plus language-preparatory courses) at higher education institutions of the Republic of Azerbaijan. The grant covers tuition fees including language training, one return international flight per year (economy class), a monthly allowance of AZN 800 paid for 10 months a year (food, accommodation, transportation and utilities), medical assistance of AZN 200 per year, and visa and residence-permit costs. Selection runs through nomination by the applicant's government to the Azerbaijani Ministry of Foreign Affairs, followed by an application on the Study in Azerbaijan Centralized Admission Service (SIACAS, portal.edu.az); applicants may choose up to three specializations, and the Azerbaijani Side does not review applications submitted outside the official nomination process.$desc$,
  $req$Be a citizen of an eligible country (Uzbekistan is listed among the OIC member states) and be officially nominated by your government to the Ministry of Foreign Affairs of Azerbaijan; the grant is not awarded to an Azerbaijani citizen who previously held citizenship of another participating country. Level requirements (as of 15 September of the application year): undergraduate and general medicine - under 35; graduate and residency (general medicine) - under 40; doctoral - under 45; average achievement of prior education at least 70/100 (or equivalent). English-taught programmes: IELTS 5.0 for undergraduate and 5.5 for graduate study (TOEFL iBT 40/50), or prior degree completed in English-medium education (note that some universities may set stricter requirements). Applicants must be fit to study the intended programme (medical certificate, including HIV/AIDS and hepatitis B/C tests, required at the SIACAS stage).$req$,
  'https://edu.gov.az/en/programmes/study-in-azerbaijan-layihesi',
  'https://edu.gov.az/en/programmes/study-in-azerbaijan-layihesi',
  NULL,
  'annual', 'closed', 'verified', 10, true,
  now(), now(),
  $note$ADDED 2026-10-26 (enrichment batch 7), verified first-hand on the official Ministry of Science and Education programme page (edu.gov.az) and the official 2026-27 application call PDF ("Heydar Aliyev - International Education Grant Program, 2026-2027 Academic Year, Application Call") fetched the same day: 100 grants a year for five years; Uzbekistan named in the OIC member-state list; coverage, age limits (35/40/45/50 by level), GPA 70/100 threshold and IELTS 5.0/5.5 alternatives as recorded. award_amount stores the published monthly allowance (AZN 800, paid 10 months a year), so amount_usd_value is 0 (non-USD award). deadline_date NULL (not_published) because the 2026 cycle dates (nominations 16 February-15 April 2026, SIACAS 1-10 June 2026; results 1-15 August 2026) have passed and the next call is not yet published. min_ielts NULL: the call sets level-dependent English alternatives (IELTS 5.0 UG / 5.5 PG or English-medium prior education), not one figure; min_gpa NULL (70/100 scale). Degree levels additionally include general medicine, residency and preparatory courses (in the description).$note$,
  NULL,
  800, 'AZN', 'month', 'fixed', 800,
  'Full funding: tuition and language-preparatory fees, AZN 800/month allowance (10 months/year) + one annual return flight + AZN 200/year medical assistance + visa/residence costs',
  $tc$Tuition fees, including language training, are paid at the level of the state fee set for the relevant degree, for the standard duration of the programme (Bachelor 4-5 years, Master 1.5-2 years, PhD 3 years, general medicine 5-6 years, residency 2-5 years; preparatory course 6 months-1 year).$tc$,
  'For English-taught programmes: IELTS 5.0 (undergraduate) or 5.5 (graduate), TOEFL iBT 40/50, or documents confirming that the prior degree was completed in English-medium education. Some universities may apply stricter requirements.',
  $json$["Nomination form and nomination letter from the applicant's government to the Azerbaijani Ministry of Foreign Affairs","CV/resume","Copy of diplomas and transcripts of previous education (translated into Azerbaijani or English and notarized if required)","Copy of valid passport","Health certificate including HIV/AIDS and hepatitis B and C tests (for the SIACAS stage)","SIACAS online application on portal.edu.az (up to three specializations)"]$json$,
  'Annual cycle (state nomination stage opens in winter)',
  'Annual cycle (2026: nominations closed 15 April; SIACAS 1-10 June)',
  $json$[{"round":"2026-27","stage1_nomination":"16 February - 15 April 2026","stage2_siacas":"1-10 June 2026","stage3_interviews":"15 July - 30 July 2026","results":"1-15 August 2026","status":"closed"}]$json$
);

INSERT INTO sources (id, url, title, domain, source_type, accessed_at, is_official, is_verified, created_at) VALUES
(3061, 'https://edu.gov.az/en/programmes/study-in-azerbaijan-layihesi', 'Study in Azerbaijan Project (Heydar Aliyev International Education Grant) - Ministry of Science and Education', 'edu.gov.az', 'scholarship', now(), true, true, now());

-- ---------------------------------------------------------------------------
-- 927: Hong Kong PhD Fellowship Scheme (HKPFS)
-- ---------------------------------------------------------------------------
INSERT INTO scholarships (
  id, title, provider, country, coverage_type, amount_usd_value,
  deadline, deadline_date, deadline_type, deadline_range_start, deadline_range_end,
  degree_levels, eligible_majors, eligible_countries, min_gpa, min_ielts,
  financial_need_based, merit_based,
  description, requirements, website_url, source_url, application_url,
  recurrence, application_status, verification_status, source_reliability, is_active,
  last_verified_at, last_updated_at, notes, university_id,
  award_amount, award_currency, award_period, award_basis, living_allowance, funding_type, tuition_coverage,
  english_requirements, required_documents,
  expected_opening_period, expected_deadline_period, rounds
) VALUES (
  927,
  'Hong Kong PhD Fellowship Scheme (HKPFS)',
  'Research Grants Council (RGC), University Grants Committee',
  'Hong Kong SAR', 'Stipend + Travel Allowance', 0,
  $dl$Open now for the 2027/28 cohort: submit an initial application on the HKPFSES by 1 December 2026 at 12:00 noon (Hong Kong time) to obtain an HKPFS reference number, then submit full applications to up to two participating universities by 1 December 2026, 11:59 p.m. (Hong Kong time). Applications opened 1 September 2026.$dl$,
  '2026-12-01', 'fixed', NULL, NULL,
  $json$["PhD"]$json$,
  $json$["All fields (selection panels: Sciences, Medicine, Engineering and Technology; and Humanities, Social Sciences and Business Studies)"]$json$,
  $json$["All countries - the scheme is open irrespective of country of origin, prior work experience or ethnic background"]$json$, NULL, NULL,
  false, true,
  $desc$The Hong Kong PhD Fellowship Scheme (HKPFS), established by the Research Grants Council (RGC) in 2009, attracts the best and brightest students from around the world to pursue full-time PhD studies in Hong Kong. For the 2027/28 cohort 400 fellowships are available at eight universities: City University of Hong Kong, Hong Kong Baptist University, Lingnan University, The Chinese University of Hong Kong, The Education University of Hong Kong, The Hong Kong Polytechnic University, The Hong Kong University of Science and Technology and The University of Hong Kong. The fellowship provides an annual stipend of HK$344,400 (approximately US$44,150) and a conference and research-related travel allowance of HK$14,400 (approximately US$1,840) per year for up to three years; for awardees who need more than three years to complete the PhD, additional support may be provided by the chosen universities. The scheme is open irrespective of applicants' country of origin, prior work experience and ethnic background, and selection is by two panels (Sciences, Medicine, Engineering and Technology; and Humanities, Social Sciences and Business Studies) with academic excellence as the primary criterion, alongside research ability and potential, communication and interpersonal skills, and leadership abilities.$desc$,
  $req$Be a new applicant for full-time PhD admission at one of the eight participating Hong Kong universities (individual universities may set additional admissions requirements). Demonstrate outstanding qualities of performance: academic excellence (primary), research ability and potential, communication and interpersonal skills, and leadership abilities. Submit an initial application on the HKPFS electronic system to obtain an HKPFS reference number (a valid, frequently used email address must be registered), then submit full PhD applications, quoting the reference number, to up to two universities/programmes of your choice.$req$,
  'https://cerg1.ugc.edu.hk/hkpfs/index.html',
  'https://cerg1.ugc.edu.hk/hkpfs/index.html',
  'https://cerg1.ugc.edu.hk/hkpfs/apply_HKPF.html',
  'annual', 'open', 'verified', 10, true,
  now(), now(),
  $note$ADDED 2026-10-26 (enrichment batch 7), verified first-hand on the official RGC HKPFS webpages (cerg1.ugc.edu.hk/hkpfs) fetched the same day: 2027/28 exercise page confirms the HK$344,400/year stipend and HK$14,400/year travel allowance (2026/27 rates), 400 fellowships, the eight universities, and the two-step deadline of 1 December 2026 (initial application by 12:00 noon Hong Kong time; university applications by 11:59 p.m.). award_amount stores the published annual stipend, so amount_usd_value is 0 (non-USD award; the page's own approximate conversion is mentioned in the description only). The Fellowship itself is a stipend plus travel allowance (tuition waivers/support are offered by individual universities, financed separately by UGC), so coverage is phrased as such. min_gpa/min_ielts NULL: no scheme-wide cutoffs - admission requirements are set by the individual universities.$note$,
  NULL,
  344400, 'HKD', 'year', 'fixed', NULL,
  'Annual stipend of HK$344,400 plus conference/research travel allowance of HK$14,400 per year for up to 3 years (extra support from the chosen university thereafter)',
  $tc$The Fellowship itself is a monthly-stipend-equivalent annual grant plus a travel allowance for up to three years; most participating universities waive or cover tuition and offer top-ups for Fellowship holders (tuition support is financed separately by the UGC and confirmed by each university's offer) - check the chosen universities' HKPFS pages for their exact packages.$tc$,
  'Set by the chosen Hong Kong universities/programmes - the RGC publishes no scheme-wide IELTS cutoff for the HKPFS.',
  $json$["Initial application on the HKPFS Electronic System (HKPFSES) to obtain an HKPFS reference number","Full PhD applications with the reference number to up to two chosen universities/programmes (university-specific documents)"]$json$,
  NULL, NULL,
  $json$[{"round":"2027/28","applications_open":"2026-09-01","initial_application_deadline":"2026-12-01 12:00 Hong Kong time","university_application_deadline":"2026-12-01 23:59 Hong Kong time","fellowships":400,"status":"open"}]$json$
);

INSERT INTO sources (id, url, title, domain, source_type, accessed_at, is_official, is_verified, created_at) VALUES
(3062, 'https://cerg1.ugc.edu.hk/hkpfs/index.html', 'Hong Kong PhD Fellowship Scheme - Research Grants Council, UGC', 'cerg1.ugc.edu.hk', 'scholarship', now(), true, true, now());

-- ---------------------------------------------------------------------------
-- 928: DAAD Development-Related Postgraduate Courses (EPOS)
-- ---------------------------------------------------------------------------
INSERT INTO scholarships (
  id, title, provider, country, coverage_type, amount_usd_value,
  deadline, deadline_date, deadline_type, deadline_range_start, deadline_range_end,
  degree_levels, eligible_majors, eligible_countries, min_gpa, min_ielts,
  financial_need_based, merit_based,
  description, requirements, website_url, source_url, application_url,
  recurrence, application_status, verification_status, source_reliability, is_active,
  last_verified_at, last_updated_at, notes, university_id,
  award_amount, award_currency, award_period, award_basis, living_allowance, funding_type, tuition_coverage,
  english_requirements, required_documents,
  expected_opening_period, expected_deadline_period, rounds
) VALUES (
  928,
  'DAAD Development-Related Postgraduate Courses (EPOS)',
  'German Academic Exchange Service (DAAD)',
  'Germany', 'Full Funding', 0,
  $dl$Applications are made directly to the chosen courses (up to three), not to the DAAD/EPOS office, and each course has its own application deadline - check the current EPOS booklet and the courses' own pages for the exact dates.$dl$,
  NULL, 'not_published', NULL, NULL,
  $json$["Master","PhD"]$json$,
  $json$["The development-related Master's and PhD courses of the EPOS programme at German universities (course list published in the annual EPOS booklet)"]$json$,
  $json$["Uzbekistan - listed by name in the DAAD list of eligible countries (DAC-based, World Bank Lower Middle Income Country)"]$json$, NULL, NULL,
  false, true,
  $desc$DAAD's Development-Related Postgraduate Courses (Entwicklungsbezogene Postgraduiertenstudiengänge, EPOS) fund experienced professionals and researchers from developing and newly industrialised countries to pursue development-related Master's and PhD programmes at state-recognised German universities (in exceptional cases, a doctorate). Uzbekistan is on the DAAD's list of eligible countries. About 1,000 professionals train in some 40 English-taught courses in economic/business, engineering, health, agricultural and forest sciences, natural and environmental sciences, social sciences, education, law and media studies. Payments follow the applicant's academic qualification: €992 per month for graduates (Master's candidates) and €1,300 per month for doctoral candidates (€1,400 from February 2026), plus payments towards health, accident and personal liability insurance, a travel allowance unless covered by the home country or another source, and, in some cases, a monthly rent subsidy and monthly allowance for accompanying family members. Funding lasts 12-42 months depending on the course. You apply directly to up to three listed courses (submitting your documents to each course by its own deadline, and indicating your ranking); the courses nominate candidates to the DAAD, which makes the final selection. EPOS is a separate scheme from the DAAD Study Scholarships for STEM Master's degrees, which are catalogued separately.$desc$,
  $req$Hold a Bachelor's degree or equivalent (usually from a four-year degree course) in a related subject, with above-average results (upper third), completed no more than six years ago, and confirm at least two years of related professional experience after the first degree (Bachelor's) at the time of application. Candidates who have already been resident in Germany for more than 15 months at the application deadline cannot be considered. Meet the language requirements of the chosen course (English-taught courses typically require TOEFL or IELTS - note the IELTS test date can be no more than two years before the application period - and the required band varies by course; any German-taught component requires proof of German). Choose from the current EPOS course list (a country list update applies to cohorts starting from 2026/27) and apply directly to up to three courses, sending the DAAD EPOS application form with each application.$req$,
  'https://www2.daad.de/deutschland/stipendium/datenbank/en/21148-scholarship-database/?detail=50076777',
  'https://www2.daad.de/deutschland/stipendium/datenbank/en/21148-scholarship-database/?detail=50076777',
  NULL,
  'annual', 'upcoming', 'verified', 10, true,
  now(), now(),
  $note$ADDED 2026-10-26 (enrichment batch 7), verified first-hand on the official DAAD EPOS programme entry (www2.daad.de, detail 50076777) and the linked DAAD-list-of-eligible-countries PDF fetched the same day, which names Uzbekistan (World Bank Lower Middle Income Countries section). Rates: 992 EUR/month for graduates and 1,300 EUR/month for doctoral candidates (1,400 EUR from February 2026), so award_amount is NULL (variable by level and time, not one cash figure) and amount_usd_value is 0 (EUR award). deadline_date NULL (not_published): applications go directly to up to three listed courses, each with its own deadline. EPOS is distinct from the existing catalogued DAAD Study Scholarships (id 861, languages/master's study scholarships). min_ielts NULL because the required band is course-specific; min_gpa NULL ("upper third"). The website URL is the programme's own DAAD scholarship-database entry (the anchor for its official EPOS FAQ, booklet and country list), not a bare search page.$note$,
  NULL,
  NULL, NULL, 'month', 'variable', NULL,
  'Monthly grant (EUR 992 for Master''s graduates; EUR 1,300 for doctoral candidates, EUR 1,400 from Feb 2026) + insurance payments + travel allowance + possible rent/family supplements',
  $tc$The DAAD pays a monthly grant plus insurance, travel and possible rent/family supplements for 12-42 months; most EPOS courses at German public universities do not charge tuition for the funded study (any course-specific fees are stated in the EPOS booklet/course pages).$tc$,
  'Course-specific: TOEFL or IELTS results (test no more than two years before the application period) at the level each EPOS course requires; German proof where a course is taught in German.',
  $json$["Signed DAAD EPOS application form (one copy per course, sent directly to the course)","CV and, where applicable, a list of publications","Certified degree certificates and transcripts (first degree/Bachelor's in a related subject, upper-third results, usually not more than six years old)","Proof of at least two years of related professional experience after the Bachelor's degree","TOEFL/IELTS certificate (test no more than two years before the application period)"]$json$,
  'Each course publishes its own application period',
  'Each course publishes its own application deadline',
  NULL
);

INSERT INTO sources (id, url, title, domain, source_type, accessed_at, is_official, is_verified, created_at) VALUES
(3063, 'https://www2.daad.de/deutschland/stipendium/datenbank/en/21148-scholarship-database/?detail=50076777', 'DAAD Development-Related Postgraduate Courses (EPOS) - Scholarship Database', 'www2.daad.de', 'scholarship', now(), true, true, now());

-- ---------------------------------------------------------------------------
-- 929: Canada Graduate Research Scholarship - Doctoral (CGRS D)
-- ---------------------------------------------------------------------------
INSERT INTO scholarships (
  id, title, provider, country, coverage_type, amount_usd_value,
  deadline, deadline_date, deadline_type, deadline_range_start, deadline_range_end,
  degree_levels, eligible_majors, eligible_countries, min_gpa, min_ielts,
  financial_need_based, merit_based,
  description, requirements, website_url, source_url, application_url,
  recurrence, application_status, verification_status, source_reliability, is_active,
  last_verified_at, last_updated_at, notes, university_id,
  award_amount, award_currency, award_period, award_basis, living_allowance, funding_type, tuition_coverage,
  english_requirements, required_documents,
  expected_opening_period, expected_deadline_period, rounds
) VALUES (
  929,
  'Canada Graduate Research Scholarship - Doctoral (CGRS D)',
  'Canadian Institutes of Health Research (CIHR); Natural Sciences and Engineering Research Council (NSERC); Social Sciences and Humanities Research Council (SSHRC)',
  'Canada', 'Fellowship', 0,
  $dl$Annual competition: the granting agencies' application deadline falls on 17 October each year, but the universities set earlier internal deadlines for institutional review and selection; the 2026 round has passed - confirm your institution's internal deadline for the next round.$dl$,
  NULL, 'not_published', NULL, NULL,
  $json$["PhD"]$json$,
  $json$["All fields funded by the three federal granting agencies: health (CIHR); natural sciences and engineering (NSERC); social sciences and humanities (SSHRC)"]$json$,
  $json$["Canadian citizens, permanent residents and Protected Persons; international students may apply to a quota of up to 15% of awards, but only if registered in a doctoral program at an eligible Canadian institution at the time of application"]$json$, NULL, NULL,
  false, true,
  $desc$The Canada Graduate Research Scholarship — Doctoral (CGRS D) is the federal tri-agency doctoral scholarship jointly administered by CIHR (health), NSERC (natural sciences and engineering) and SSHRC (social sciences and humanities), introduced as the successor programme to the Vanier Canada Graduate Scholarships, which the Government of Canada confirms are no longer accepting applications. The award pays CAD 40,000 per year for 36 months (non-renewable) to support full-time doctoral studies at eligible Canadian institutions. International students are eligible only if they are registered in a doctoral programme at an eligible Canadian institution at the time of application: each institution may submit applications from international students up to a quota of 15% of its total submission quota, and all applicants compete in the same merit review. Applications are made through the university's internal competition (institutions set their own earlier internal deadlines) ahead of the agencies' annual 17 October deadline. CGRS D is therefore a funding route for students who are already admitted to or enrolled in a Canadian PhD, not an admission scholarship for applicants abroad.$desc$,
  $req$Be a Canadian citizen, a permanent resident of Canada or a Protected Person under the Immigration and Refugee Protection Act, OR an international student registered in a doctoral program at an eligible Canadian institution at the time of application (institutions may submit such applications up to 15% of their quota). Meet the completion-date rule: by 31 December of the application year you must have completed no more than 36 months of full-time doctoral study (24 months for accelerated/combined tracks, as defined by the agencies); only three applications to the CGRS D or its agency equivalents are allowed. Apply through the institution's internal competition by its internal deadline; applicants intending to hold the award at an eligible Canadian institution apply to that institution.$req$,
  'https://nserc-crsng.canada.ca/en/funding-opportunity/canada-graduate-research-scholarship-doctoral-program',
  'https://nserc-crsng.canada.ca/en/funding-opportunity/canada-graduate-research-scholarship-doctoral-program',
  NULL,
  'annual', 'closed', 'verified', 10, true,
  now(), now(),
  $note$ADDED 2026-10-26 (enrichment batch 7) as the currently offered successor to the Vanier Canada Graduate Scholarships: the Government of Canada's Vanier pages state the Vanier programme is no longer accepting applications, so Vanier itself was not added. Verified first-hand on the official NSERC/Canada.ca "Canada Graduate Research Scholarship — Doctoral program" page fetched 2026-10-26 (deadline archive line: 17 October; value 40,000 CAD/year; duration 36 months; international students restricted to those registered at eligible Canadian institutions, within a 15% submission quota). Award-basis: the page states the value per year, so award_amount 40000 CAD/year; amount_usd_value 0 (non-USD award). deadline_date NULL (not_published) because the October 2026 agency round has passed and each university sets earlier internal deadlines; the annual October cycle is recorded in the rounds text. No central IELTS/GPA cutoff (institutional doctoral-admission rules apply); min_gpa/min_ielts NULL.$note$,
  NULL,
  40000, 'CAD', 'year', 'fixed', NULL,
  'Doctoral fellowship of CAD 40,000 per year for 36 months',
  $tc$The scholarship is a stipend of CAD 40,000 per year for 36 months toward doctoral studies; it does not separately itemise tuition - holders use the award toward their tuition and living costs under their university's funding package.$tc$,
  'Set by the Canadian university for doctoral admission; the tri-agency program sets no IELTS cutoff.',
  $json$["Agency application form submitted through the Canadian university's internal doctoral funding competition","Academic transcripts and research proposal as required by the institution and granting agency"]$json$,
  'Annual cycle (university internal deadlines precede the agencies'' 17 October deadline)',
  '17 October (annual, set by the granting agencies; earlier university internal deadlines apply)',
  $json$[{"round":"2026","agency_deadline":"2026-10-17","status":"closed"}]$json$
);

INSERT INTO sources (id, url, title, domain, source_type, accessed_at, is_official, is_verified, created_at) VALUES
(3064, 'https://nserc-crsng.canada.ca/en/funding-opportunity/canada-graduate-research-scholarship-doctoral-program', 'Canada Graduate Research Scholarship - Doctoral program - NSERC (Canada.ca)', 'nserc-crsng.canada.ca', 'scholarship', now(), true, true, now());

-- ---------------------------------------------------------------------------
-- 930: A*STAR Graduate Scholarship (AGS)
-- ---------------------------------------------------------------------------
INSERT INTO scholarships (
  id, title, provider, country, coverage_type, amount_usd_value,
  deadline, deadline_date, deadline_type, deadline_range_start, deadline_range_end,
  degree_levels, eligible_majors, eligible_countries, min_gpa, min_ielts,
  financial_need_based, merit_based,
  description, requirements, website_url, source_url, application_url,
  recurrence, application_status, verification_status, source_reliability, is_active,
  last_verified_at, last_updated_at, notes, university_id,
  award_amount, award_currency, award_period, award_basis, living_allowance, funding_type, tuition_coverage,
  english_requirements, required_documents,
  expected_opening_period, expected_deadline_period, rounds
) VALUES (
  930,
  'A*STAR Graduate Scholarship (AGS) - PhD in Singapore',
  'Agency for Science, Technology and Research (A*STAR), Singapore',
  'Singapore', 'Full Tuition + Stipend', 0,
  $dl$Two application cycles a year: 1 November - 1 February and 1 June - 10 August. Next closing date: 1 February 2027. IMPORTANT ELIGIBILITY RESTRICTION: although the scholarship is open to all nationalities, international applicants must have completed (or be on track to complete) a Bachelor's or Master's degree at a Singapore autonomous university - applicants whose degrees are entirely from outside Singapore (including from Uzbekistan) are not eligible.$dl$,
  '2027-02-01', 'fixed', NULL, NULL,
  $json$["PhD"]$json$,
  $json$["STEM (biomedical sciences, chemistry, physics, engineering)","Semiconductor (chip design, materials science, semiconductor technologies)","Quantum (computing, communications, sensing)","Computing (AI, cybersecurity, software engineering, data science)"]$json$,
  $json$["All nationalities - but international students must hold (or be completing) a Bachelor's or Master's degree from a Singapore autonomous university"]$json$, NULL, NULL,
  false, true,
  $desc$The A*STAR Graduate Scholarship (AGS) is the Agency for Science, Technology and Research's flagship local PhD scholarship, taken jointly at an A*STAR Research Institute and a Singapore autonomous university, in four tracks: STEM (biomedical sciences, chemistry, physics, engineering), Semiconductor, Quantum and Computing. Support lasts up to four years and covers full tuition fees, a monthly sustenance allowance (for international students: S$3,600 per month in the STEM track and S$5,000 per month in the specialised Semiconductor/Quantum/Computing tracks), book, computer, conference and thesis allowances, and support for up to 12 months of overseas attachment. Scholars are jointly supervised by an A*STAR researcher and a university faculty member on a research project aligned with Singapore's Research, Innovation and Enterprise ecosystem. CRITICAL RESTRICTION: the scholarship is open to applicants of all nationalities, but international students must have completed, or be on track to obtain, a Bachelor's or Master's degree in a Singapore autonomous university; a degree completed entirely outside Singapore does not qualify. Foreigners who are not Singapore Permanent Residents must also complete a three-year service commitment in Singapore-based companies after the PhD. This record is therefore relevant mainly to Uzbek citizens who are already studying in Singapore. Note: A*STAR's former Singapore International Graduate Award (SINGA), which was open to graduates worldwide, is no longer published on the A*STAR scholarships website (checked 26 October 2026; the old SINGA pages return 'Page Not Found'); AGS is the current official local-PhD route listed there. Mid-term entry is available to students already enrolled in a Singapore autonomous university.$desc$,
  $req$Hold (or be on track to obtain) at least a Second-Class (Upper) Honours degree or equivalent in a relevant discipline; international students must have completed, or be on track to obtain, that Bachelor's or Master's degree in a Singapore autonomous university. Be in the last semester of final studies to apply for the full-term award, and satisfy the criteria for, and gain admission to, a PhD programme in an autonomous university. Before applying, identify a research project and both an A*STAR researcher and a university faculty member willing to co-supervise, and obtain the A*STAR supervisor's endorsement. Mid-term applicants must be enrolled in a Singapore autonomous university with at least one completed semester, be on track to excellent academic standing, show good research potential or achievements, and name their current university supervisor as one of two academic referees. Non-Singapore Permanent Resident foreigners take on a three-year service commitment in Singapore-based companies (ACRA-registered) after the PhD; Singapore citizens and Permanent Residents have no service commitment.$req$,
  'https://www.a-star.edu.sg/scholarships/home/scholarships/ags--scholarship',
  'https://www.a-star.edu.sg/scholarships/home/scholarships/ags--scholarship',
  NULL,
  'annual', 'upcoming', 'verified', 10, true,
  now(), now(),
  $note$ADDED 2026-10-26 (enrichment batch 7), verified first-hand on the official A*STAR Graduate Academy pages fetched the same day. The batch candidate was SINGA, but the old SINGA programme pages return 'Page Not Found' on A*STAR's rebuilt site and the live scholarships listing shows the National Science Scholarships, the A*STAR Graduate Scholarship and the A*STAR International Fellowship (postdoctoral, citizenship-conversion based) instead; SINGA is therefore documented as not currently offered rather than added from aggregator claims. AGS is recorded as the current official route, with its decisive restriction stated in the title-level fields: international applicants must hold a degree from a Singapore autonomous university, so it is not open to applicants applying with only non-Singapore degrees. Monthly rates for international students (S$3,600 STEM; S$5,000 specialised tracks) differ by track, so award_amount is NULL (variable) and amount_usd_value is 0 (SGD award). deadline_date stores the next cycle close, 1 February 2027 (cycles: 1 November-1 February and 1 June-10 August). min_gpa/min_ielts NULL (honours-class wording and university-set English requirements only).$note$,
  NULL,
  NULL, NULL, 'month', 'variable', NULL,
  'Full tuition + monthly sustenance allowance for up to 4 years (international students: S$3,600/month STEM, S$5,000/month specialised tracks) + book, computer, conference and thesis allowances + up to 12 months overseas attachment',
  $tc$Full tuition fees are covered for up to four years (mid-term awardees receive retrospective payment of tuition and compulsory fees from Year 1).$tc$,
  'English requirements are those for PhD admission at the Singapore autonomous university; A*STAR publishes no separate IELTS cutoff for AGS.',
  $json$["AGS online application (CV required when creating the account)","Identified research project with an A*STAR co-supervisor and a university co-supervisor, including the A*STAR supervisor's written endorsement before applying","Degree certificates/transcripts showing at least Second-Class (Upper) Honours or equivalent from a Singapore autonomous university (for international applicants)"]$json$,
  NULL, NULL,
  $json$[{"cycle":"First application cycle","applications":"1 November - 1 February (interviews mid-February to March; outcomes from mid-April)","next_deadline":"2027-02-01"},{"cycle":"Second application cycle","applications":"1 June - 10 August (interviews mid-August to October; outcomes from mid-November)"}]$json$
);

INSERT INTO sources (id, url, title, domain, source_type, accessed_at, is_official, is_verified, created_at) VALUES
(3065, 'https://www.a-star.edu.sg/scholarships/home/scholarships/ags--scholarship', $t$A*STAR Graduate Scholarship - A*STAR Graduate Academy$t$, 'www.a-star.edu.sg', 'scholarship', now(), true, true, now());

-- ---------------------------------------------------------------------------
-- 931: ICCR Scholarships for Uzbek Nationals (India)
-- ---------------------------------------------------------------------------
INSERT INTO scholarships (
  id, title, provider, country, coverage_type, amount_usd_value,
  deadline, deadline_date, deadline_type, deadline_range_start, deadline_range_end,
  degree_levels, eligible_majors, eligible_countries, min_gpa, min_ielts,
  financial_need_based, merit_based,
  description, requirements, website_url, source_url, application_url,
  recurrence, application_status, verification_status, source_reliability, is_active,
  last_verified_at, last_updated_at, notes, university_id,
  award_amount, award_currency, award_period, award_basis, living_allowance, funding_type, tuition_coverage,
  english_requirements, required_documents,
  expected_opening_period, expected_deadline_period, rounds
) VALUES (
  931,
  'ICCR Scholarships for Uzbek Nationals (India)',
  'Indian Council for Cultural Relations (ICCR), Government of India',
  'India', 'Full Tuition + Stipend', 0,
  $dl$Annual applications through the ICCR A2A Scholarship Portal (a2ascholarships.iccr.gov.in), routed through the Indian Embassy in the applicant's country. For 2026-27 the portal opened on 27 February 2026 and student applications closed in April 2026; watch the ICCR website and the Embassy of India in Tashkent for the next annual cycle.$dl$,
  NULL, 'not_published', NULL, NULL,
  $json$["Bachelor","Master","PhD"]$json$,
  $json$["STEM and non-STEM courses at Indian universities/institutes (medical, law and integrated courses are prohibited under both schemes)"]$json$,
  $json$["Uzbekistan - 12 slots under the Atal Bihari Vajpayee General Scholarship Scheme and 5 slots under the Dr. S. Radhakrishnan Cultural Exchange Scholarship Scheme (ICCR 2026-27 allocation)"]$json$, NULL, NULL,
  false, true,
  $desc$The Indian Council for Cultural Relations (ICCR), an autonomous organisation of the Government of India, runs annual scholarship schemes for foreign nationals to study at Indian universities and institutes; for 2026-27 it lists 18 schemes with 4,541 slots in total. Uzbek nationals are allocated places under two ICCR-funded schemes: the Atal Bihari Vajpayee General Scholarship Scheme (12 of its 554 slots) and the Dr. S. Radhakrishnan Cultural Exchange Scholarship Scheme (5 slots at UG/PG/PhD level, without airfare - in that scheme airfare is provided only for Mexico and Turkmenistan). Scheme facilities comprise a monthly stipend, house rent allowance (HRA), contingent allowances, a thesis/dissertation allowance and tuition and other compulsory fees paid to the university under ICCR norms; students themselves pay hostel or private accommodation charges, mess charges, security/caution deposits, certificate fees and immigration registration charges. Medical, law and integrated courses are prohibited under both schemes. Applications are accepted only online through the A2A ICCR Scholarship Portal and are processed through the Indian Mission in the applicant's country (the Embassy of India in Tashkent for Uzbekistan). No cash stipend rates are published on the ICCR scheme page, so no amount is stored in this record.$desc$,
  $req$Be a citizen of Uzbekistan applying for an eligible undergraduate, postgraduate or PhD course at an Indian university/institute covered by the scheme; medical, law and integrated courses are not offered. Register and apply online only via the A2A ICCR Scholarship Portal (a2ascholarships.iccr.gov.in); applications are routed through the Indian Embassy and are not accepted physically at missions, ICCR or universities. Applicants must meet the admission requirements of the chosen Indian university/course and the ICCR guidelines for international students (including document, medical/fitness and visa/FRRO-registration requirements after selection).$req$,
  'https://iccr.gov.in/academics/scholarships/iccr-scholarship/iccr-scholarship-schemes',
  'https://iccr.gov.in/academics/scholarships/iccr-scholarship/iccr-scholarship-schemes',
  'https://a2ascholarships.iccr.gov.in',
  'annual', 'closed', 'verified', 10, true,
  now(), now(),
  $note$ADDED 2026-10-26 (enrichment batch 7), verified first-hand on the official ICCR scholarship-schemes page (iccr.gov.in, 'ICCR Scholarship Programme 2026-27') fetched the same day: the Atal Bihari Vajpayee General Scholarship Scheme country list gives Uzbekistan 12 slots, and the Dr. S. Radhakrishnan Cultural Exchange Scholarship Scheme gives Uzbekistan 5 slots at UG/PG/PhD level in the without-airfare group (airfare in that scheme only for Mexico and Turkmenistan); both schemes prohibit medical, law and integrated courses and use the standard ICCR facility set (stipend, HRA, contingent allowances, thesis/dissertation allowance, tuition fee/OCF paid to universities; hostel/mess and deposits payable by the student). The A2A portal is the application channel named by ICCR itself. The fetched page publishes no INR stipend figures ('Norms attached'), so third-party stipend amounts were not used: award_amount is NULL (variable) and amount_usd_value is 0. deadline_date NULL (not_published): the 2026-27 application window (opened 27 February 2026, closed April 2026) has passed; embassy notices set the exact day each cycle. No central GPA or IELTS cutoff on the scheme page; min_gpa/min_ielts NULL. No standalone ICCR programme record existed before this batch (ICCR appeared only as a route inside the IIT Madras record 597).$note$,
  NULL,
  NULL, NULL, 'month', 'variable', NULL,
  'Tuition and compulsory fees paid to the university + monthly stipend + house rent allowance + contingent and thesis/dissertation allowances (ICCR norms; hostel/mess charges are payable by the student)',
  $tc$Tuition fee and other compulsory fees (OCF) are paid to the university under ICCR norms. Hostel/private accommodation and mess charges, deposits and certificate/registration fees remain payable by the student (supported by the stipend and HRA).$tc$,
  'English requirements are set by the admitting Indian university/course; the ICCR scheme page publishes no central IELTS cutoff.',
  $json$["Online application on the A2A ICCR Scholarship Portal (a2ascholarships.iccr.gov.in) - applications are accepted only online and processed through the Indian Embassy in Tashkent","Documents required by the ICCR guidelines and the chosen university (certificates/transcripts, passport, photographs and, after selection, medical fitness and visa/FRRO formalities)"]$json$,
  'Annual cycle (the A2A portal opened on 27 February 2026 for 2026-27)',
  'Annual cycle (student applications closed in April 2026 for 2026-27; exact dates are announced by ICCR and the Indian Mission each cycle)',
  $json$[{"round":"2026-27","portal_opened":"27 February 2026","student_applications":"closed April 2026","uzbekistan_slots":"12 (Atal Bihari Vajpayee General Scholarship Scheme) + 5 (Dr. S. Radhakrishnan Cultural Exchange Scholarship Scheme, without airfare)","status":"closed"}]$json$
);

INSERT INTO sources (id, url, title, domain, source_type, accessed_at, is_official, is_verified, created_at) VALUES
(3066, 'https://iccr.gov.in/academics/scholarships/iccr-scholarship/iccr-scholarship-schemes', 'ICCR Scholarship Schemes 2026-27 - Indian Council for Cultural Relations', 'iccr.gov.in', 'scholarship', now(), true, true, now());

-- ---------------------------------------------------------------------------
-- 932: Government of Brunei Darussalam Scholarship (BDGS) for Foreign Students
-- ---------------------------------------------------------------------------
INSERT INTO scholarships (
  id, title, provider, country, coverage_type, amount_usd_value,
  deadline, deadline_date, deadline_type, deadline_range_start, deadline_range_end,
  degree_levels, eligible_majors, eligible_countries, min_gpa, min_ielts,
  financial_need_based, merit_based,
  description, requirements, website_url, source_url, application_url,
  recurrence, application_status, verification_status, source_reliability, is_active,
  last_verified_at, last_updated_at, notes, university_id,
  award_amount, award_currency, award_period, award_basis, living_allowance, funding_type, tuition_coverage,
  english_requirements, required_documents,
  expected_opening_period, expected_deadline_period, rounds
) VALUES (
  932,
  'Government of Brunei Darussalam Scholarship (BDGS) for Foreign Students',
  'Ministry of Foreign Affairs, Brunei Darussalam',
  'Brunei', 'Full Funding', 0,
  $dl$Annual call through the Ministry of Foreign Affairs online BDGS portal. Applications for the 2026/2027 session are closed (the portal states the application is now closed); the academic year in Brunei commences in July/August. Watch the MFA scholarship page for the next annual call.$dl$,
  NULL, 'not_published', NULL, NULL,
  $json$["Bachelor","Master"]$json$,
  $json$["Programmes on the BDGS lists of Universiti Brunei Darussalam (UBD), Universiti Islam Sultan Sharif Ali (UNISSA), Universiti Teknologi Brunei (UTB), Kolej Universiti Perguruan Ugama Seri Begawan (KUPU SB) and Politeknik Brunei, including diploma programmes"]$json$,
  $json$["Citizens of, but not limited to, ASEAN, Commonwealth and OIC member countries (Uzbekistan is an OIC member state)"]$json$, NULL, NULL,
  false, true,
  $desc$The Government of Brunei Darussalam Scholarship (BDGS) is the Brunei government's annual scholarship for foreign students, administered by the Ministry of Foreign Affairs. It funds Diploma, Undergraduate Degree and Postgraduate Master's Degree study at five Brunei institutions - Universiti Brunei Darussalam (UBD), Universiti Islam Sultan Sharif Ali (UNISSA), Universiti Teknologi Brunei (UTB), Kolej Universiti Perguruan Ugama Seri Begawan (KUPU SB) and Politeknik Brunei - for programmes on each institution's BDGS list. Applications are open to citizens of, but not limited to, ASEAN, Commonwealth and OIC member countries, which includes Uzbekistan as an OIC member state. The published facilities are: exemption from tuition fees including acceptance, examination, registration and orientation fees; an economy-class air ticket to Brunei before the course and back home on completion; a monthly personal allowance of BND 500; a monthly meals allowance of BND 150; an annual book allowance of BND 600; accommodation at the residential college of the university/polytechnic; a baggage allowance on completion of up to BND 250 (ASEAN) or BND 500 (outside ASEAN, so BND 500 for Uzbekistan); and comprehensive insurance for the duration of the scholarship. Recipients may not hold another scholarship, fellowship, grant or loan at the same time without prior MFA approval, may not take paid employment during the scholarship, receive no marriage/child allowances, and must leave Brunei immediately on completion of the programme. This catalogue lists the Bachelor's and Master's levels; the scheme also supports diploma programmes at Politeknik Brunei.$desc$,
  $req$Be a citizen of an eligible country (applications are open to citizens of, but not limited to, ASEAN, Commonwealth and OIC member countries - Uzbekistan qualifies through OIC membership). Age: 18-25 for Undergraduate and Diploma programmes and not exceeding 35 for Postgraduate Master's programmes (assessed as of July of the programme-start year in recent calls). Brunei Darussalam Permanent Residents are not eligible, and recent calls are aimed primarily at international students studying in Brunei for the first time (those currently studying, or who have studied, at Brunei tertiary institutions are not eligible). Applicants must meet the entry qualifications of the chosen BDGS-listed programme and the English requirement below. On award, recipients must conform to the scholarship rules and Brunei's laws, respect local customs, culture and official religion, refrain from political activities, and undergo health screening in Brunei if the Ministry requires it.$req$,
  'https://www.mfa.gov.bn/Pages/scholarship.aspx',
  'https://www.mfa.gov.bn/Pages/scholarship.aspx',
  'https://apps.katalyst.gov.bn/mfa/BDGS-V3/loginApplicant',
  'annual', 'upcoming', 'verified', 10, true,
  now(), now(),
  $note$ADDED 2026-10-26 (enrichment batch 7), verified on official Ministry of Foreign Affairs pages (mfa.gov.bn) fetched the same day: the live MFA scholarship page links the BDGS 2026/2027 application on the official portal (apps.katalyst.gov.bn, currently showing 'This application is now closed'), and the Ministry's published BDGS announcement sets out the eligibility ('citizens of, but not limited to, ASEAN, Commonwealth and OIC member countries', age 18-25 for undergraduate/diploma and up to 35 for master's, Brunei PRs excluded) and the facility rates stored here (tuition and related fee exemption; return economy air tickets; BND 500/month personal allowance; BND 150/month meals allowance; BND 600/year book allowance; residential-college accommodation; baggage allowance BND 250 ASEAN / BND 500 non-ASEAN; comprehensive insurance). The same facility figures appear in the Ministry's current online BDGS call text. award_amount is NULL because support is a published package of components rather than one cash figure (variable, monthly basis); amount_usd_value is 0 (BND award). deadline_date NULL (not_published): the 2026/2027 window is closed and the next call date is not yet published on the fetched pages; recent cycles closed in mid-February. English evidence has several official routes (GCE O-Level Credit 6, IGCSE English grade C, IELTS 6.0 or TOEFL 550), so min_ielts is NULL and the options are recorded in the text.$note$,
  NULL,
  NULL, NULL, 'month', 'variable', NULL,
  'Full package: tuition and fee exemption + BND 500/month personal allowance + BND 150/month meals allowance + BND 600/year book allowance + residential accommodation + return economy airfare + baggage allowance + comprehensive insurance',
  $tc$Exemption from paying tuition fees including acceptance, examination, registration and orientation fees for the duration of the programme.$tc$,
  'Proficiency in English with a Credit 6 at GCE O Level, a grade C in IGCSE English (as a second language), an IELTS score of 6.0 or a TOEFL minimum score of 550 (recent MFA calls). min_ielts is NULL because several alternative evidences are accepted.',
  $json$["Online application through the MFA BDGS application portal (linked from the MFA scholarship page) with the documents specified in the current call"]$json$,
  'Annual call via the MFA portal (academic year commences July/August)',
  'Annual call (recent cycles closed in mid-February; the 2026/2027 window is closed)',
  $json$[{"round":"2026/2027 academic session","status":"applications closed (portal notice)","programme_start":"July/August"}]$json$
);

INSERT INTO sources (id, url, title, domain, source_type, accessed_at, is_official, is_verified, created_at) VALUES
(3067, 'https://www.mfa.gov.bn/Pages/scholarship.aspx', 'Scholarship (BDGS) - Ministry of Foreign Affairs, Brunei Darussalam', 'www.mfa.gov.bn', 'scholarship', now(), true, true, now());

-- ---------------------------------------------------------------------------
-- Links + sequence guards
-- ---------------------------------------------------------------------------
INSERT INTO scholarship_sources (scholarship_id, source_id) VALUES
(926,3061),(927,3062),(928,3063),(929,3064),(930,3065),(931,3066),(932,3067);

SELECT setval('scholarships_id_seq', (SELECT MAX(id) FROM scholarships));
SELECT setval('sources_id_seq', (SELECT MAX(id) FROM sources));
