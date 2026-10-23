-- ============================================================================
-- International scholarships — batch 1 (7 programmes)
-- Verified against each programme's own website on 2026-10-23.
-- Applied to the live database the same day, resulting ids: 888-894.
--
-- Why this batch: the catalogue already covers 358/358 universities with a
-- university-owned award, but the big *international* programmes that are not
-- tied to one university were missing (Chevening 0, Fulbright 0, Erasmus
-- Mundus 0, Eiffel 0, Honjo 0, Yenching 0, JJ/WBGSP 0).
--
-- Rules applied (unchanged from earlier passes):
--   * every row is read off the programme's own website, never an aggregator;
--   * amount_usd_value = 0 means "no cash value published" — it is NOT a guess;
--   * a deadline that has already passed is stored as NULL with
--     deadline_type = 'not_published' plus the expected period, never as a
--     fake future date;
--   * min_gpa / min_ielts stay NULL when the programme sets no single figure.
--
-- The INSERTs are one per statement because the Supabase tool truncates a
-- single multi-row statement of this size.
-- ============================================================================

-- 888 — Chevening -------------------------------------------------------------
INSERT INTO scholarships (
  title, provider, country, coverage_type, amount_usd_value,
  deadline, deadline_date, deadline_type, degree_levels, eligible_majors,
  eligible_countries, min_gpa, min_ielts,
  description, requirements, website_url, source_url, application_url,
  recurrence, application_status, verification_status, source_reliability, is_active,
  last_verified_at, last_updated_at, notes,
  award_currency, award_period, award_basis, funding_type, tuition_coverage,
  expected_opening_period, expected_deadline_period, rounds
) VALUES (
  'Chevening Scholarships (UK Government)',
  'Foreign, Commonwealth and Development Office (FCDO), UK Government',
  'United Kingdom', 'Full Tuition + Stipend', 0,
  '2027-28 round closed in October 2026; next round expected October 2027',
  NULL, 'not_published', '["Master"]', '["All Majors"]', '["Uzbekistan"]', NULL, NULL,
  'UK Government scholarship for a fully funded one-year taught master''s degree at any UK university. Chevening covers tuition fees, a monthly living allowance, return airfare, visa costs and essential expenditure, and adds a year of leadership and professional events. Uzbekistan is a Chevening-eligible country; the 2027-28 round closed in October 2026 and the next round opens in August 2027.',
  'Citizen of a Chevening-eligible country (Uzbekistan is eligible) and resident in an ODA-eligible country; an undergraduate degree completed at least two years before the application deadline; at least 2,800 hours (about two years) of work experience gained after that degree; applications to three different eligible UK master''s courses; an unconditional offer from at least one of them by 8 July 2027; commitment to return home for at least two years. Apply online through the Uzbekistan country page.',
  'https://www.chevening.org/scholarships/',
  'https://www.chevening.org/scholarship/uzbekistan/',
  'https://www.chevening.org/apply',
  'annual', 'upcoming', 'verified', 10, true,
  '2026-10-23', '2026-10-23',
  'Verified 2026-10-23. chevening.org/scholarship/uzbekistan states "Applications for 2027-2028 Chevening Scholarships are now closed." The official application timeline lists opening in August 2027 and closing in October 2027 (the country page fixes the exact day). Eligibility text (2,800 hours, three course choices, unconditional offer by 8 July 2027) read on chevening.org/resource-hub/guidance/eligibility and /scholarships/application-timeline. No cash value is published, so amount_usd_value is 0 (not published), not an estimate.',
  'GBP', 'year', 'full_tuition', 'Fully funded', 'Full tuition',
  'August 2027', 'October 2027', '[]'
);

-- 889 — Fulbright -------------------------------------------------------------
INSERT INTO scholarships (
  title, provider, country, coverage_type, amount_usd_value,
  deadline, deadline_date, deadline_type, degree_levels, eligible_majors,
  eligible_countries, min_gpa, min_ielts,
  description, requirements, website_url, source_url, application_url,
  recurrence, application_status, verification_status, source_reliability, is_active,
  last_verified_at, last_updated_at, notes,
  award_currency, award_period, award_basis, funding_type, tuition_coverage,
  expected_opening_period, expected_deadline_period, rounds
) VALUES (
  'Fulbright Foreign Student Program (Uzbekistan)',
  'U.S. Department of State / U.S. Embassy Tashkent',
  'United States', 'Full Tuition + Stipend', 0,
  '2027-28 round closed 30 June 2026; next deadline expected June 2027',
  NULL, 'not_published', '["Master"]', '["All Majors"]', '["Uzbekistan"]', NULL, NULL,
  'U.S. Government exchange programme that funds up to two years of master''s study in the United States for Uzbek graduate students and young professionals, recruited through an open merit competition. The grant covers tuition and fees, a monthly stipend, health insurance, books and supplies, and international airfare, with J-1 visa sponsorship.',
  'Uzbek citizen residing in Uzbekistan throughout the application and selection process; completed bachelor''s degree; at least two years of professional experience; strong English with TOEFL and GRE/GMAT taken after nomination. All fields are open, but AI/data science, STEM supporting the critical-minerals and energy economy, nuclear engineering, space/aerospace, engineering, energy and agriculture are named as priority areas. Apply online at apply.iie.org/ffsp2027.',
  'https://uz.usembassy.gov/fulbright-foreign-student-program/',
  'https://uz.usembassy.gov/fulbright-foreign-student-program/',
  'https://apply.iie.org/ffsp2027',
  'annual', 'upcoming', 'verified', 10, true,
  '2026-10-23', '2026-10-23',
  'Verified 2026-10-23 on uz.usembassy.gov/fulbright-foreign-student-program: the 2027-28 call carried "Deadline: June 30, 2026" and has now closed; the 2028-29 call is not published yet, so no deadline_date is stored. The embassy FAQ describes the annual cycle as applications March-May with embassy nomination by 1 October, and reports roughly 3 grants a year for Uzbekistan out of 130-150 applicants. No cash value is published, so amount_usd_value is 0.',
  'USD', 'year', 'full_tuition', 'Fully funded', 'Full tuition',
  'March 2027', 'June 2027', '[]'
);

-- 890 — Erasmus Mundus --------------------------------------------------------
INSERT INTO scholarships (
  title, provider, country, coverage_type, amount_usd_value,
  deadline, deadline_date, deadline_type, deadline_range_start, deadline_range_end,
  degree_levels, eligible_majors, eligible_countries, min_gpa, min_ielts,
  description, requirements, website_url, source_url, application_url,
  recurrence, application_status, verification_status, source_reliability, is_active,
  last_verified_at, last_updated_at, notes,
  award_currency, award_period, award_basis, funding_type, tuition_coverage,
  expected_opening_period, expected_deadline_period, rounds
) VALUES (
  'Erasmus Mundus Joint Masters (EMJM) Scholarship',
  'European Commission (Erasmus+ programme)',
  'European Union', 'Full Tuition + Stipend', 0,
  'Varies by programme: most consortia accept applications between October 2026 and January 2027 for the 2027 intake',
  NULL, 'range', '2026-10-01', '2027-01-31',
  '["Master"]', '["All Majors"]', '["All"]', NULL, NULL,
  'EU-funded scholarship for joint master''s degrees delivered by consortia of at least three universities in three different countries. Students from all over the world can apply; selected scholars receive a full scholarship covering participation costs (tuition), travel, visa costs and a monthly living allowance, and study in two or more European countries.',
  'A bachelor''s degree (or final-year bachelor status) completed before the programme starts. Applicants apply directly to each consortium, not to the EU; language and academic requirements are set by each master''s programme. The course catalogue with links to every consortium is on the EACEA Erasmus Mundus catalogue.',
  'https://erasmus-plus.ec.europa.eu/opportunities/individuals/students/erasmus-mundus-joint-masters',
  'https://erasmus-plus.ec.europa.eu/opportunities/individuals/students/erasmus-mundus-joint-masters',
  'https://www.eacea.ec.europa.eu/scholarships/erasmus-mundus-catalogue_en',
  'annual', 'open', 'verified', 10, true,
  '2026-10-23', '2026-10-23',
  'Verified 2026-10-23 on erasmus-plus.ec.europa.eu: "In most cases, you should submit your application between October and January for courses starting the following academic year", and each master''s website carries its own deadline. There is no single EU-wide date, so deadline_type = range with the published application window; that is a window, not an individual programme deadline. No cash value is published centrally, so amount_usd_value is 0.',
  NULL, 'month', 'full_tuition', 'Fully funded', 'Full tuition',
  'October 2026', 'January 2027', '[]'
);

-- 891 — Eiffel ----------------------------------------------------------------
INSERT INTO scholarships (
  title, provider, country, coverage_type, amount_usd_value,
  deadline, deadline_date, deadline_type, degree_levels, eligible_majors,
  eligible_countries, min_gpa, min_ielts,
  description, requirements, website_url, source_url, application_url,
  recurrence, application_status, verification_status, source_reliability, is_active,
  last_verified_at, last_updated_at, notes,
  award_currency, award_period, award_basis, funding_type, tuition_coverage,
  expected_opening_period, expected_deadline_period, rounds
) VALUES (
  'France Excellence Eiffel Scholarship',
  'French Ministry for Europe and Foreign Affairs (Campus France)',
  'France', 'Full Tuition + Stipend', 0,
  '6 January 2027', '2027-01-06', 'fixed',
  '["Master","PhD"]', '["All Majors"]', '["All"]', NULL, NULL,
  'French government scholarship that helps French universities attract top foreign students to master''s and doctoral programmes. French institutions nominate the candidates; the award covers a monthly allowance, health insurance, travel and, for master''s students, language and cultural activities. Age limit: up to 29 at master''s level and up to 35 at PhD level.',
  'Nominated by a French higher education institution - students cannot apply directly. Up to 29 years old for a master''s and up to 35 for a PhD. Priority fields are set by the Ministry each year. The 2027 call opened in October 2026 and Campus France must receive the institution''s submission by 6 January 2027 inclusive.',
  'https://www.campusfrance.org/en/france-excellence-eiffel-scholarship-program',
  'https://www.campusfrance.org/en/france-excellence-eiffel-scholarship-program',
  'https://www.campusfrance.org/en/node/303563',
  'annual', 'open', 'verified', 10, true,
  '2026-10-23', '2026-10-23',
  'Verified 2026-10-23 on campusfrance.org: 2027 campaign timeline = call opens October 2026, applications received by Campus France until 6 January 2027 inclusive, results from 12 April 2027; "Only applications submitted by French higher education institutions are accepted". The page does not print the monthly allowance, so award_amount is left NULL instead of quoting a figure from a third party.',
  'EUR', 'month', 'variable', 'Fully funded', 'Full tuition',
  'October 2026', 'January 2027', '[]'
);

-- 892 — JJ/WBGSP --------------------------------------------------------------
INSERT INTO scholarships (
  title, provider, country, coverage_type, amount_usd_value,
  deadline, deadline_date, deadline_type, degree_levels, eligible_majors,
  eligible_countries, min_gpa, min_ielts,
  description, requirements, website_url, source_url, application_url,
  recurrence, application_status, verification_status, source_reliability, is_active,
  last_verified_at, last_updated_at, notes,
  award_currency, award_period, award_basis, funding_type, tuition_coverage,
  expected_opening_period, expected_deadline_period, rounds
) VALUES (
  'Joint Japan/World Bank Graduate Scholarship Program (JJ/WBGSP)',
  'World Bank (Development Economics Vice Presidency) and the Government of Japan',
  'Multiple countries', 'Full Tuition + Stipend', 0,
  'Window 1: 26 February 2027; Window 2: 21 May 2027',
  '2027-02-26', 'fixed',
  '["Master"]', '["All Majors"]', '["Developing countries"]', NULL, NULL,
  'Scholarship funded by the Government of Japan and administered by the World Bank for mid-career professionals from developing countries. It pays for a master''s degree in development-related fields at one of 44 participating programmes in 24 universities across the US, Europe, Africa, Oceania and Japan, and covers tuition, a monthly living stipend, round-trip airfare, health insurance and a travel allowance.',
  'National of an eligible World Bank developing country; bachelor''s degree earned at least three years before the application deadline; at least three years of paid, full-time development-related employment within the past six years; unconditional admission (except for funding) to one of the JJ/WBGSP participating master''s programmes outside your country of citizenship and residence; not a dual citizen of a developed country. Apply in Window 1 (18 January - 26 February 2027) or Window 2 (29 March - 21 May 2027); the application link is only sent to candidates admitted to a participating programme.',
  'https://www.worldbank.org/en/programs/scholarships/jj-wbgsp',
  'https://www.worldbank.org/en/programs/scholarships/jj-wbgsp',
  'https://www.worldbank.org/en/programs/scholarships/brief/jjwbgsp-participating-programs',
  'annual', 'upcoming', 'verified', 10, true,
  '2026-10-23', '2026-10-23',
  'Verified 2026-10-23 on worldbank.org/en/programs/scholarships/jj-wbgsp. The 2027 cycle runs two windows: #1 from 18 January to 26 February 2027, #2 from 29 March to 21 May 2027. deadline_date holds the close of Window 1; Window 2 closes on 21 May 2027. Eligibility and benefits quoted from the same page. The country list is a World Bank eligibility list, hence eligible_countries = Developing countries.',
  'USD', 'month', 'full_tuition', 'Fully funded', 'Full tuition',
  'January 2027', 'February / May 2027', '["Window 1","Window 2"]'
);

-- 893 — Honjo ----------------------------------------------------------------
INSERT INTO scholarships (
  title, provider, country, coverage_type, amount_usd_value,
  deadline, deadline_date, deadline_type, degree_levels, eligible_majors,
  eligible_countries, min_gpa, min_ielts,
  description, requirements, website_url, source_url, application_url,
  recurrence, application_status, verification_status, source_reliability, is_active,
  last_verified_at, last_updated_at, notes,
  award_amount, award_currency, award_period, award_basis, funding_type, tuition_coverage,
  expected_opening_period, expected_deadline_period, rounds
) VALUES (
  'Honjo International Scholarship Foundation Scholarship (Japan)',
  'Honjo International Scholarship Foundation (HISF)',
  'Japan', 'Stipend', 0,
  '31 October 2026', '2026-10-31', 'fixed',
  '["Master","PhD"]', '["All Majors"]', '["All"]', NULL, NULL,
  'Private Japanese foundation scholarship for international students enrolled, or about to enrol, in a Japanese graduate school; about ten awards a year. The monthly stipend depends on the length of the degree: JPY 230,000 for a one- or two-year programme, JPY 210,000 for three years and JPY 180,000 for four or five years. The money does not have to be repaid.',
  'Non-Japanese citizen enrolling in a Japanese graduate school from April 2027 (already enrolled, admitted, or sitting the entrance examination); programme length longer than 12 months; basic conversational Japanese, because the interview is conducted in Japanese with no exceptions; research plan, transcripts, a two-minute research video and a recommendation letter. Apply through entry.hisf.or.jp between 1 September and 31 October 2026.',
  'https://www.hisf.or.jp/en/scholarship/foreigner/',
  'https://www.hisf.or.jp/en/scholarship/foreigner/',
  'https://entry.hisf.or.jp',
  'annual', 'open', 'verified', 10, true,
  '2026-10-23', '2026-10-23',
  'Verified 2026-10-23: hisf.or.jp/en/scholarship/foreigner lists the 2027 application period as 1 September - 31 October 2026, document-screening results on 31 January 2027, interviews on 8-9 February 2027 and final results on 31 March 2027. The foundation official PDF guidelines give the monthly amounts (JPY 230,000 / 210,000 / 180,000) and the Japanese-language interview rule. Only the JPY figure is stored; no USD conversion is published.',
  230000, 'JPY', 'month', 'range', 'Stipend only', 'None',
  'September 2026', 'October 2026', '[]'
);

-- 894 — Yenching --------------------------------------------------------------
INSERT INTO scholarships (
  title, provider, country, coverage_type,
  amount_usd_value, deadline, deadline_date, deadline_type, degree_levels,
  eligible_majors, eligible_countries, min_gpa, min_ielts,
  description, requirements, website_url, source_url, application_url,
  recurrence, application_status, verification_status, source_reliability, is_active,
  last_verified_at, last_updated_at, notes,
  award_period, award_basis, funding_type, tuition_coverage,
  expected_opening_period, expected_deadline_period, rounds
) VALUES (
  'Yenching Academy Fellowship (Peking University)',
  'Yenching Academy of Peking University',
  'China', 'Full Tuition + Stipend', 0,
  '30 November 2026, 09:00 Beijing time', '2026-11-30', 'fixed',
  '["Master"]', '["All Majors"]', '["All"]', NULL, NULL,
  'Fully funded two-year master''s fellowship in China Studies at Peking University, open to graduates of any discipline. The fellowship covers tuition, on-campus accommodation, a monthly stipend, medical insurance, one round-trip airfare and field-study costs; about 120 scholars are admitted each year, most of them international.',
  'Non-Chinese citizen with a valid passport; a bachelor''s degree in any field (or graduating by 31 August 2027); strong academic record and demonstrated leadership; evidence of English proficiency in an accepted test. Documents: online application form, personal statement, statement of research interest, CV, official transcripts, diploma or enrolment certificate, two academic references. Apply through apply.yca.pku.edu.cn by 30 November 2026, 09:00 Beijing time.',
  'https://yenchingacademy.pku.edu.cn/ADMISSIONS.htm',
  'https://yenchingacademy.pku.edu.cn/ADMISSIONS.htm',
  'https://apply.yca.pku.edu.cn',
  'annual', 'open', 'verified', 10, true,
  '2026-10-23', '2026-10-23',
  'Verified 2026-10-23 on yenchingacademy.pku.edu.cn/ADMISSIONS.htm: applications for the 2027 cohort opened on 1 September 2026 and close on 30 November 2026 at 09:00 Beijing time; partner-university students must also pass their home university pre-selection. Minimum English test scores are deliberately left out because the official admissions page does not print them - only third-party blogs do.',
  'month', 'full_tuition', 'Fully funded', 'Full tuition',
  'September 2026', 'November 2026', '[]'
);
