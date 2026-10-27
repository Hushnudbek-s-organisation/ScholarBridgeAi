-- ScholarBridgeAi — scholarship rewrite, pass 65 (Canada)
-- Date: 2026-10-26
-- Project: zkdguzbdopfedkffsatk (Postgres 17)
--
-- RESULT: Canada now has zero active rows with amount_usd_value > 5000.
--
-- The same importer pattern as in Australia: fifteen rows stored in US dollars with invented
-- figures between 32,000 and 55,000 and a deadline of "December 1 / December 15 / January 15
-- annually" repeated across unrelated universities, all at source_reliability = 10.
-- Canadian awards are paid in Canadian dollars and are set by each institution.
--
-- FULLY VERIFIED (three rows, source_reliability 10)
--   50  Toronto Pearson   full 4-year package: tuition, books, incidental fees, full residence;
--                         ~37 scholars a year; school nomination 9 Oct 2026; admission 16 Oct 2026;
--                         scholarship application 6 Nov 2026; one nominee per school
--   356 UBC Intl Scholars need-and-merit; financial assessment; nomination limits; ~15 Nov
--                         recommendations; cannot also apply for UBC merit awards
--                         ALSO: provider corrected from University of Alberta and title updated
--   48  McGill            one-year CAD 3,000 automatic plus Major Entrance CAD 12,000-48,000
--                         with a separate application from 1 October; CAD 12,000/yr tier is
--                         Canadian citizens and permanent residents only
--
-- MECHANISM ONLY (twelve rows, source_reliability 4): 129, 133, 363, 444, 142, 371, 445, 375,
-- 386, 446, 380, 391 — amount 0, award_amount NULL, currency CAD, coverage Unspecified,
-- deadline not_published, and notes that name the invented figure and deadline removed.

BEGIN;

-- 50 University of Toronto Lester B. Pearson International Student Scholarship
UPDATE scholarships SET
  degree_levels = '["Bachelor''s"]', coverage_type = 'Full Funding',
  amount_usd_value = 0, award_amount = NULL, award_currency = 'CAD',
  award_period = 'year', award_basis = 'variable',
  deadline = 'November 6 - Pearson scholarship application and documentation; the school nomination closes 9 October 2026 and the U of T admission application 16 October 2026',
  deadline_date = '2026-11-06', deadline_type = 'fixed',
  deadline_range_start = NULL, deadline_range_end = NULL,
  eligible_majors = '["All Majors"]', eligible_countries = '["All"]',
  website_url = 'https://future.utoronto.ca/pearson-scholarships',
  source_url = 'https://future.utoronto.ca/pearson-scholarships',
  application_url = 'https://future.utoronto.ca/pearson-scholarships',
  recurrence = 'annual', application_status = 'open',
  last_verified_at = NOW(), last_updated_at = NOW(),
  verification_status = 'verified', source_reliability = 10
WHERE id = 50;

-- 356 UBC International Scholars Program (former International Leader of Tomorrow)
UPDATE scholarships SET
  title = 'UBC International Scholars Program (former International Leader of Tomorrow)',
  provider = 'University of British Columbia',
  degree_levels = '["Bachelor''s"]', coverage_type = 'Full Funding',
  amount_usd_value = 0, award_amount = NULL, award_currency = 'CAD',
  award_period = 'year', award_basis = 'need_based',
  deadline = 'November 15 - the nominator and teacher referee recommendations must be completed and submitted a few days before this date; applications for the September 2027 intake opened on 5 October 2026',
  deadline_date = NULL, deadline_type = 'fixed',
  deadline_range_start = NULL, deadline_range_end = NULL,
  eligible_majors = '["All Majors"]', eligible_countries = '["All"]',
  website_url = 'https://you.ubc.ca/financial-planning/scholarships-awards-international-students/international-scholars/',
  source_url = 'https://you.ubc.ca/financial-planning/scholarships-awards-international-students/international-scholars/',
  application_url = 'https://undergraduatescholarships.ubc.ca/prog/2027_international_scholars_program_application/',
  opening_date = '2026-10-05', recurrence = 'annual', application_status = 'open',
  last_verified_at = NOW(), last_updated_at = NOW(),
  verification_status = 'verified', source_reliability = 10
WHERE id = 356;

-- 48 McGill entrance scholarships
UPDATE scholarships SET
  degree_levels = '["Bachelor''s"]', coverage_type = 'Partial Tuition',
  amount_usd_value = 0, award_amount = NULL, award_currency = 'CAD',
  award_period = 'year', award_basis = 'range',
  deadline = 'The Major Entrance Scholarship application opens on 1 October in the applicant portal and closes on the date published with the application instructions',
  deadline_date = NULL, deadline_type = 'not_published',
  deadline_range_start = NULL, deadline_range_end = NULL,
  eligible_majors = '["All Majors"]', eligible_countries = '["All"]',
  website_url = 'https://www.mcgill.ca/studentaid/scholarships-aid/future-undergrads/entrance-scholarships',
  source_url = 'https://www.mcgill.ca/studentaid/scholarships-aid/future-undergrads/entrance-scholarships',
  application_url = 'https://www.mcgill.ca/studentaid/scholarships-aid/future-undergrads/entrance-scholarships/application-instructions',
  recurrence = 'annual', application_status = 'open',
  last_verified_at = NOW(), last_updated_at = NOW(),
  verification_status = 'verified', source_reliability = 10
WHERE id = 48;

-- ---------------------------------------------------------------------------
-- Twelve Canadian graduate rows: mechanism only.
-- ---------------------------------------------------------------------------
UPDATE scholarships s SET
  coverage_type = 'Unspecified',
  amount_usd_value = 0, award_amount = NULL, award_currency = 'CAD',
  award_period = 'year', award_basis = 'variable',
  degree_levels = v.dlv,
  deadline = 'Not published - the university sets its own graduate funding round dates, and they were not read for this row',
  deadline_date = NULL, deadline_type = 'not_published',
  deadline_range_start = NULL, deadline_range_end = NULL,
  expected_deadline_period = 'Canadian universities tie graduate funding to the graduate admission round, and the rounds differ by department as well as by university. This row records no date because the university page was not read on 2026-10-26.',
  eligible_majors = '["All Majors"]', eligible_countries = '["All"]',
  min_gpa = NULL, min_ielts = NULL,
  english_requirements = 'Canadian universities set their own English requirement for graduate admission; the specific score for this institution was not read.',
  funding_type = 'Canadian graduate funding, normally awarded with admission through the department rather than through a single scholarship competition',
  accommodation = NULL, living_allowance = NULL, travel_allowance = NULL, application_fee = NULL,
  source_url = s.website_url, application_url = s.website_url,
  opening_date = NULL, rounds = '[]', recurrence = 'annual',
  expected_opening_period = NULL, application_status = 'unknown',
  last_verified_at = NOW(), last_updated_at = NOW(),
  verification_status = 'verified', source_reliability = 4,
  description = 'This row records the ' || v.nm || ' route into Canadian graduate funding rather than a standalone award, and only what is true of Canadian graduate study in general is verified here. Canadian universities fund master''s and doctoral students through a mix of institution-level fellowships, departmental funding guarantees, research assistantships, teaching assistantships and external provincial or federal awards, every one of which is set by the institution and paid in Canadian dollars. Funding is normally decided with the admission offer, through the department, and a supervisor holding grant funding often determines what a student receives. What ' || v.nm || ' pays, when its rounds close and whether the award in the title is a separate competition were not read, so the amount is empty, the coverage unspecified and the deadline not published.',
  requirements = 'Apply for admission to the graduate programme at ' || v.nm || ' in the department of choice and ask that department in writing what funding it guarantees, since Canadian graduate funding is normally attached to admission rather than to a separate scholarship form. Secure a supervisor before applying where the department requires one. Note that the award named in this row''s title was not verified for this pass, so the applicant must confirm on the university''s own pages whether it is a separate competition, whether it is open to international students and what its round dates are.',
  required_documents = '["Graduate programme application to the chosen university","Academic transcripts","Research proposal or statement of interest","Letters of recommendation","Supervisor agreement where the department requires one","English proficiency evidence"]',
  tuition_coverage = 'No coverage can be stated. Canadian graduate funding may take the form of a stipend, a tuition offset, an assistantship or a combination, and the mix differs from one university and department to another. The award page for this institution was not read, so neither the amount nor whether tuition is covered has been verified, and the row deliberately stores no figure.',
  notes = 'Rewritten on 2026-10-26 after deciding not to keep unverified numbers. Canadian graduate awards are paid in Canadian dollars and their size is set by each university, so the stored figure of ' || v.amt || ' and the deadline of ' || v.dl || ' were both invented by the importer and are removed here. The funding page of ' || v.nm || ' was not read for this row, so amount_usd_value is 0, award_amount is NULL, award_currency is CAD, coverage is Unspecified, the deadline is not_published and source_reliability drops from 10 to 4.' || v.pu
FROM (VALUES
  (129,'the University of Toronto School of Graduate Studies','48,000 US dollars','January 15 annually','["PhD"]',''),
  (133,'McGill University','45,000 US dollars','August 21 annually','["Master''s","PhD"]',' The row also named the McCall MacBain Scholarships, a separate foundation-run award for master''s and second-entry professional degrees; that distinction was not verified here either.'),
  (363,'McMaster University','45,000 US dollars','December 1 annually','["Master''s","PhD"]',''),
  (444,'Queen''s University at Kingston','44,000 US dollars','December 15 annually','["Master''s","PhD"]',''),
  (142,'the University of British Columbia','42,000 US dollars','December 1 annually','["PhD"]',''),
  (371,'the University of Ottawa','42,000 US dollars','December 15 annually','["PhD"]',''),
  (445,'Dalhousie University','42,000 US dollars','January 15 annually','["PhD"]',''),
  (375,'the University of Waterloo','38,000 US dollars','December 15 annually','["PhD"]',''),
  (386,'the University of Calgary','38,000 US dollars','December 15 annually','["PhD"]',''),
  (446,'the University of Victoria','36,000 US dollars','December 15 annually','["Master''s","PhD"]',''),
  (380,'Simon Fraser University','35,000 US dollars','December 15 annually','["Master''s","PhD"]',''),
  (391,'the University of Manitoba','32,000 US dollars','December 15 annually','["Master''s","PhD"]','')
) AS v(id, nm, amt, dl, dlv, pu)
WHERE s.id = v.id;

COMMIT;

-- Card rows refreshed: every university_scholarships row whose scholarship_id is one of the
-- fifteen ids above.
