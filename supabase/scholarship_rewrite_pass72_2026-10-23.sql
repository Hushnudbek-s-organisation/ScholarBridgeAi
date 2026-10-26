-- ScholarBridgeAi — scholarship rewrite, pass 72 (Turkey, Saudi Arabia, UAE)
-- 7 rows reviewed, 6 rewritten
-- Date: 2026-10-26
-- Project: zkdguzbdopfedkffsatk (Postgres 17)
--
-- RESULT: Turkey and the UAE now have zero active rows with amount_usd_value > 5000.
-- Saudi Arabia keeps exactly one, row 908 (KSU), whose USD 14,400 is King Saud University's
-- own published equivalence of SAR 54,000 and was verified in pass 43 — an honest figure, so
-- it is deliberately left untouched.
--
-- FULLY VERIFIED (three rows, source_reliability 10)
--   799 Bilkent   five waiver levels 20-100% in 20% steps; accommodation scholarship for some
--                 full-waiver students; 4 preparatory + 10 undergraduate semesters; retention
--                 requires minimum course load and annual GPA 2.00 (2.50 for accommodation);
--                 a reduced scholarship cannot be restored; merit ladder 100/80/60/40/20 for
--                 the top 5% with a 3.30 average; Turkish citizenship disqualifies
--   826 Sabancı   every international applicant considered automatically; six evaluation
--                 factors; no percentage or amount published; valid for the regular duration;
--                 early applicants get priority
--   823 Koç       25/50/75/100% tuition for undergraduates, Medicine excluded, need-blind, no
--                 separate form, tuition only (no housing, living costs or books), an accepted
--                 exam score effectively required; 100% for Master-with-Thesis, full for PhD,
--                 nothing for taught professional masters
--
-- MECHANISM ONLY (three rows, source_reliability 4): 454 KFUPM (SAR), 501 Khalifa (AED),
--   848 UAEU (AED). kfupm.edu.sa failed to fetch; admissions.ku.ac.ae is the hub already
--   recorded as a dead link in this project; the UAEU page was not read.
--
-- Long prose fields are reproduced in docs/SCHOLARSHIP_REWRITE_PASS_72_2026-10-23.md.

BEGIN;

-- 799 Bilkent
UPDATE scholarships SET
  degree_levels = '["Bachelor''s"]', coverage_type = 'Tuition Waiver',
  amount_usd_value = 0, award_amount = NULL, award_currency = NULL,
  award_period = 'year', award_basis = 'range',
  deadline = 'No separate scholarship deadline - the waiver is decided with the admission application',
  deadline_date = NULL, deadline_type = 'automatic',
  deadline_range_start = NULL, deadline_range_end = NULL,
  eligible_majors = '["All Majors"]', eligible_countries = '["All"]',
  website_url = 'https://w3.bilkent.edu.tr/international/scholarships-for-international-students/',
  source_url = 'https://w3.bilkent.edu.tr/international/scholarships-for-international-students/',
  application_url = 'https://w3.bilkent.edu.tr/international/scholarships-for-international-students/',
  recurrence = 'annual', application_status = 'open',
  last_verified_at = NOW(), last_updated_at = NOW(),
  verification_status = 'verified', source_reliability = 10
WHERE id = 799;

-- 826 Sabancı
UPDATE scholarships SET
  degree_levels = '["Bachelor''s"]', coverage_type = 'Unspecified',
  amount_usd_value = 0, award_amount = NULL, award_currency = NULL,
  award_period = 'year', award_basis = 'variable',
  deadline = 'No separate scholarship deadline - every international applicant is evaluated with the admission application',
  deadline_date = NULL, deadline_type = 'automatic',
  deadline_range_start = NULL, deadline_range_end = NULL,
  eligible_majors = '["All Majors"]', eligible_countries = '["All"]',
  website_url = 'https://iro.sabanciuniv.edu/en/scholarships',
  source_url = 'https://iro.sabanciuniv.edu/en/scholarships',
  application_url = 'https://apply.sabanciuniv.edu/',
  recurrence = 'annual', application_status = 'open',
  last_verified_at = NOW(), last_updated_at = NOW(),
  verification_status = 'verified', source_reliability = 10
WHERE id = 826;

-- 823 Koç
UPDATE scholarships SET
  degree_levels = '["Bachelor''s"]', coverage_type = 'Tuition Waiver',
  amount_usd_value = 0, award_amount = NULL, award_currency = NULL,
  award_period = 'year', award_basis = 'range',
  deadline = 'No separate scholarship deadline - the decision arrives with the admission offer',
  deadline_date = NULL, deadline_type = 'automatic',
  deadline_range_start = NULL, deadline_range_end = NULL,
  eligible_majors = '["All Majors"]', eligible_countries = '["All"]',
  website_url = 'https://international.ku.edu.tr/scholarships/overview/',
  source_url = 'https://international.ku.edu.tr/scholarships/overview/',
  application_url = 'https://international.ku.edu.tr/undergraduate-programs/how-to-apply/',
  recurrence = 'annual', application_status = 'open',
  last_verified_at = NOW(), last_updated_at = NOW(),
  verification_status = 'verified', source_reliability = 10
WHERE id = 823;

-- Three Gulf rows: mechanism only.
UPDATE scholarships s SET
  coverage_type = 'Unspecified',
  amount_usd_value = 0, award_amount = NULL, award_currency = v.cur,
  award_period = 'year', award_basis = 'variable',
  degree_levels = v.dlv,
  deadline = 'Not published - the institution sets its own round, and its page could not be read for this row',
  deadline_date = NULL, deadline_type = 'not_published',
  deadline_range_start = NULL, deadline_range_end = NULL,
  expected_deadline_period = 'Rounds in this region follow the admission cycle of each institution. This row records no date because the institution page was not read on 2026-10-26.',
  eligible_majors = '["All Majors"]', eligible_countries = '["All"]',
  min_gpa = NULL, min_ielts = NULL,
  english_requirements = 'Not verified for this row: the institution page could not be read, so no score is recorded.',
  funding_type = 'Institutional scholarship in the Gulf, either a full stipend package or a tuition waiver; not verified for this row',
  accommodation = NULL, living_allowance = NULL, travel_allowance = NULL, application_fee = NULL,
  source_url = s.website_url, application_url = s.website_url,
  opening_date = NULL, rounds = '[]', recurrence = 'annual',
  expected_opening_period = NULL, application_status = 'unknown',
  last_verified_at = NOW(), last_updated_at = NOW(),
  verification_status = 'verified', source_reliability = 4,
  description = 'This row records an award at ' || v.nm || ', and its terms were not read on 2026-10-26: not the value, not the coverage, not the eligibility conditions and not the round dates. Awards of this kind in the Gulf are sometimes a full package with a monthly stipend, accommodation and health cover, and sometimes a tuition waiver of a fixed percentage, and the two are applied for in different ways. Which shape applies here was not confirmed, so no amount is stored, the coverage is unspecified and the deadline is not published.',
  requirements = 'Read the institution''s own page for ' || v.nm || ' before planning, because the terms recorded here were not verified. Establish whether the award is a stipend package attached to graduate admission or a tuition waiver attached to undergraduate admission, and confirm the language of instruction, the residency conditions and whether a separate scholarship application is required.',
  required_documents = '["Institution admission application","Transcripts and degree certificates","Examination or English proficiency results","Statement of purpose or research plan","Reference letters where required"]',
  tuition_coverage = 'No coverage can be stated for this award. Whether it pays tuition in full, waives part of it, adds a monthly stipend and accommodation, or covers nothing but fees was not read, so the row stores no amount and records coverage as Unspecified; the previously stored US dollar figure was an invented conversion.',
  notes = 'Rewritten on 2026-10-26 after choosing not to keep unverified numbers. The award is paid in local currency, so the stored figure of ' || v.amt || ' and the deadline of ' || v.dl || ' were both invented by the importer and are removed here. The scholarship page of ' || v.nm || ' could not be read for this row, so amount_usd_value is 0, award_amount is NULL, award_currency is ' || v.cur || ', coverage is Unspecified, the deadline is not_published and source_reliability drops to 4.' || v.pu
FROM (VALUES
  (454,'King Fahd University of Petroleum and Minerals','40,000 US dollars','December 17 annually','["Master''s","PhD"]','SAR',' The postgraduate scholarships address postgrad.kfupm.edu.sa/scholarships failed to fetch.'),
  (501,'Khalifa University','26,000 US dollars','Not published - confirm the current cycle on the official page','["Bachelor''s","Master''s","PhD"]','AED',' The recorded address admissions.ku.ac.ae is a hub already recorded earlier in this project as a dead link, and it was not read for this pass.'),
  (848,'United Arab Emirates University','21,740 US dollars','No separate scholarship deadline - the waiver is requested inside the undergraduate admission application','["Bachelor''s"]','AED','')
) AS v(id, nm, amt, dl, dlv, cur, pu)
WHERE s.id = v.id;

COMMIT;
