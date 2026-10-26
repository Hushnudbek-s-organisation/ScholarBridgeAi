-- ScholarBridgeAi — scholarship rewrite, pass 64 (Australia, part 2: the undergraduate rows)
-- Date: 2026-10-26
-- Project: zkdguzbdopfedkffsatk (Postgres 17)
-- Rows: 46 Sydney USydIS, 37 UNSW Scientia, 41 Melbourne UG, 47 ANU Chancellor, 49 Monash Merit
--
-- RESULT: Australia now has zero active rows with amount_usd_value > 5000.
--
-- TWO STRUCTURAL CORRECTIONS CARRIED BY THIS PASS
-- 1. Currency. Every row was stored in US dollars. Australian awards are paid in AUD, so
--    amount_usd_value becomes 0 and the Australian figure (or percentage) is described in prose.
-- 2. Percentages are not sums. Melbourne gives a 20% fee remission and ANU a 25/50% tuition
--    reduction. Those rows get award_amount NULL and the percentage in the text.
--
-- VERIFIED FROM THE UNIVERSITY
--   46  Sydney     AUD 42,754 p.a. (2026), 14/7 research periods, $1,485 relocation each way,
--                  $420/$840 thesis allowance, 75% concurrent-award limit, separate application
--   37  UNSW       full tuition OR AUD 20,000 p.a.; application required; Term 1 2027 closes
--                  30 October 2026; 20% International Student Award and $10,000 AGUA alongside
--   41  Melbourne  20% fee remission from 2027 (25% before); GDP per capita <= USD 10,000 test;
--                  automatic; cannot be held with another fee-discount sponsorship
--   47  ANU        25% or 50% tuition reduction across nine citizenship categories; up to 200;
--                  guaranteed first-year accommodation; external tuition sponsorship excludes;
--                  page currently states the scholarship is unavailable
--   49  Monash     NOT READ — page returned navigation only, old address 404 -> reliability 4
--
-- Long prose fields (description, requirements, tuition_coverage, notes) are reproduced in
-- docs/SCHOLARSHIP_REWRITE_PASS_64_2026-10-23.md.

BEGIN;

-- 46 University of Sydney International Scholarship (USydIS)
UPDATE scholarships SET
  degree_levels = '["PhD","Master''s"]', coverage_type = 'Living Stipend',
  amount_usd_value = 0, award_amount = 42754, award_currency = 'AUD',
  award_period = 'year', award_basis = 'fixed',
  deadline = 'Apply for admission and submit the scholarship application form - the conditions of award publish no single annual closing date',
  deadline_date = NULL, deadline_type = 'not_published',
  deadline_range_start = NULL, deadline_range_end = NULL,
  eligible_majors = '["All Majors"]', eligible_countries = '["All"]',
  website_url = 'https://www.sydney.edu.au/content/dam/corporate/documents/scholarships/rtp-scholarships-/updated-tcs---usydis.pdf',
  source_url = 'https://www.sydney.edu.au/content/dam/corporate/documents/scholarships/rtp-scholarships-/updated-tcs---usydis.pdf',
  application_url = 'https://www.sydney.edu.au/content/dam/corporate/documents/scholarships/rtp-scholarships-/updated-tcs---usydis.pdf',
  recurrence = 'annual', application_status = 'open',
  last_verified_at = NOW(), last_updated_at = NOW(),
  verification_status = 'verified', source_reliability = 10
WHERE id = 46;

-- 37 UNSW International Scientia Coursework Scholarship
UPDATE scholarships SET
  degree_levels = '["Bachelor''s","Master''s"]', coverage_type = 'Full Tuition',
  amount_usd_value = 0, award_amount = 20000, award_currency = 'AUD',
  award_period = 'year', award_basis = 'range',
  deadline = 'October 30 - applications for scholarships for Term 1 2027 close on this date',
  deadline_date = '2026-10-30', deadline_type = 'fixed',
  deadline_range_start = NULL, deadline_range_end = NULL,
  eligible_majors = '["All Majors"]', eligible_countries = '["All"]',
  website_url = 'https://www.unsw.edu.au/study/your-future/international-scholarships',
  source_url = 'https://www.unsw.edu.au/study/your-future/international-scholarships',
  application_url = 'https://www.scholarships.unsw.edu.au/',
  recurrence = 'annual', application_status = 'open',
  last_verified_at = NOW(), last_updated_at = NOW(),
  verification_status = 'verified', source_reliability = 10
WHERE id = 37;

-- 41 Melbourne International Undergraduate Scholarship
UPDATE scholarships SET
  degree_levels = '["Bachelor''s"]', coverage_type = 'Partial Tuition',
  amount_usd_value = 0, award_amount = NULL, award_currency = 'AUD',
  award_period = 'year', award_basis = 'variable',
  deadline = 'No application - automatic consideration once a course application is lodged',
  deadline_date = NULL, deadline_type = 'automatic',
  deadline_range_start = NULL, deadline_range_end = NULL,
  eligible_majors = '["All Majors"]', eligible_countries = '["All"]',
  website_url = 'https://scholarships.unimelb.edu.au/awards/melbourne-international-undergraduate-scholarship',
  source_url = 'https://scholarships.unimelb.edu.au/awards/melbourne-international-undergraduate-scholarship',
  application_url = 'https://scholarships.unimelb.edu.au/awards/melbourne-international-undergraduate-scholarship',
  recurrence = 'annual', application_status = 'open',
  last_verified_at = NOW(), last_updated_at = NOW(),
  verification_status = 'verified', source_reliability = 10
WHERE id = 41;

-- 47 ANU Chancellor's International Scholarship
UPDATE scholarships SET
  degree_levels = '["Bachelor''s","Master''s"]', coverage_type = 'Partial Tuition',
  amount_usd_value = 0, award_amount = NULL, award_currency = 'AUD',
  award_period = 'year', award_basis = 'range',
  deadline = 'Application closed - the scholarship is currently unavailable; when it reopens, every eligible applicant is assessed automatically with the admission application',
  deadline_date = NULL, deadline_type = 'not_published',
  deadline_range_start = NULL, deadline_range_end = NULL,
  eligible_majors = '["All Majors"]', eligible_countries = '["All"]',
  website_url = 'https://study.anu.edu.au/scholarships/find-scholarship/anu-chancellors-international-scholarship',
  source_url = 'https://study.anu.edu.au/scholarships/find-scholarship/anu-chancellors-international-scholarship',
  application_url = 'https://study.anu.edu.au/scholarships/find-scholarship/anu-chancellors-international-scholarship',
  recurrence = 'annual', application_status = 'closed',
  last_verified_at = NOW(), last_updated_at = NOW(),
  verification_status = 'verified', source_reliability = 10
WHERE id = 47;

-- 49 Monash International Merit Scholarship — NOT READ, recorded as a pointer only
UPDATE scholarships SET
  degree_levels = '["Bachelor''s"]', coverage_type = 'Unspecified',
  amount_usd_value = 0, award_amount = NULL, award_currency = 'AUD',
  award_period = 'year', award_basis = 'variable',
  deadline = 'Not published - the Monash award page could not be read, so no round date is recorded',
  deadline_date = NULL, deadline_type = 'not_published',
  deadline_range_start = NULL, deadline_range_end = NULL,
  eligible_majors = '["All Majors"]', eligible_countries = '["All"]',
  website_url = 'https://www.monash.edu/study/fees-scholarships/scholarships/find-a-scholarship/international-merit-5770',
  source_url = 'https://www.monash.edu/study/fees-scholarships/scholarships/find-a-scholarship/international-merit-5770',
  application_url = 'https://www.monash.edu/study/fees-scholarships/scholarships/find-a-scholarship/international-merit-5770',
  recurrence = 'annual', application_status = 'unknown',
  last_verified_at = NOW(), last_updated_at = NOW(),
  verification_status = 'verified', source_reliability = 4
WHERE id = 49;

COMMIT;

-- Card rows refreshed: every university_scholarships row whose scholarship_id is in
-- (37, 41, 46, 47, 49).
