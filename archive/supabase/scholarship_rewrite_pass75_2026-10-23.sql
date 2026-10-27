-- ScholarBridgeAi — scholarship rewrite, pass 75 (the twenty-seven US doctoral rows at reliability 5)
-- Date: 2026-10-26
-- Project: zkdguzbdopfedkffsatk (Postgres 17)
--
-- RESULT: source_reliability = 5 falls from 27 to 23, and bare-domain website_url from 83 to 79.
--
-- FOUR ROWS NOW FULLY VERIFIED (source_reliability 10), each with a real deep link replacing
-- a bare university domain:
--   105 MIT      oge.mit.edu/graduate-admissions/costs-funding/ — no separate financial aid
--                application before admission; funding is programme-level (fully, partially or
--                self-funded); USD 90 application fee, USD 95-250 for Sloan, no refunds
--   108 Harvard  gsas.harvard.edu/financial-support/funding-and-aid plus
--                /apply/cost-attendance-2026-2027 — guaranteed five-year funding for all PhD
--                students; tuition tiers USD 59,048 / 15,352 / 3,906; health USD 972 and 2,477
--                per term
--   114 Caltech  gradoffice.caltech.edu/financialsupport plus /budget — every PhD student
--                funded; stipend USD 50,000 for twelve months from 1 September 2026; tuition
--                USD 68,574 plus fees USD 2,448; application window 1 December - 15 January
--   338 Wisconsin grad.wisc.edu/funding/ — four routes; only assistantships at 33% or above
--                carry tuition remission; international students are eligible for University
--                Fellowships and some departmental fellowships
--
-- TWENTY-THREE ROWS STAY AT reliability 5, and the notes below record the attempts made:
--   gsas.yale.edu/costs-funding                       404
--   purdue.edu/gradschool/funding/                    404 (moved under /academics/ogsps/)
--   gradschool.columbia.edu/.../financial-aid         failed to fetch
--   grad.ucla.edu/funding/                            opens, but is the GRAPES external-award
--                                                     database rather than UCLA's own funding
--                                                     statement, so it was NOT used as a source
--
-- OPEN ISSUE FLAGGED, NOT SILENTLY FIXED: active row 20 and active row 114 both describe the
-- Caltech doctoral package. Row 114 carries a note saying the two should be consolidated in a
-- later deduplication pass.

BEGIN;

-- 105 MIT
UPDATE scholarships SET
  degree_levels = '["PhD"]', coverage_type = 'Unspecified',
  amount_usd_value = 0, award_amount = NULL, award_currency = 'USD',
  award_period = 'year', award_basis = 'variable',
  website_url = 'https://oge.mit.edu/graduate-admissions/costs-funding/',
  source_url = 'https://oge.mit.edu/graduate-admissions/costs-funding/',
  application_url = 'https://oge.mit.edu/graduate-admissions/costs-funding/',
  recurrence = 'annual', application_status = 'open',
  last_verified_at = NOW(), last_updated_at = NOW(),
  verification_status = 'verified', source_reliability = 10
WHERE id = 105;

-- 108 Harvard Griffin GSAS
UPDATE scholarships SET
  degree_levels = '["PhD"]', coverage_type = 'Full Funding',
  amount_usd_value = 0, award_amount = NULL, award_currency = 'USD',
  award_period = 'year', award_basis = 'variable',
  website_url = 'https://gsas.harvard.edu/financial-support/funding-and-aid',
  source_url = 'https://gsas.harvard.edu/financial-support/funding-and-aid',
  application_url = 'https://gsas.harvard.edu/apply/cost-attendance-2026-2027',
  recurrence = 'annual', application_status = 'open',
  last_verified_at = NOW(), last_updated_at = NOW(),
  verification_status = 'verified', source_reliability = 10
WHERE id = 108;

-- 114 Caltech
UPDATE scholarships SET
  degree_levels = '["PhD"]', coverage_type = 'Full Funding',
  amount_usd_value = 0, award_amount = 50000, award_currency = 'USD',
  award_period = 'year', award_basis = 'fixed',
  deadline = 'The graduate application deadline of the academic option applied to at Caltech, which opens on 1 December and closes on 15 January for entry the following autumn',
  deadline_date = NULL, deadline_type = 'range',
  deadline_range_start = '2026-12-01', deadline_range_end = '2027-01-15',
  website_url = 'https://gradoffice.caltech.edu/financialsupport',
  source_url = 'https://gradoffice.caltech.edu/financialsupport',
  application_url = 'https://www.gradoffice.caltech.edu/admissions',
  opening_date = '2026-12-01', recurrence = 'annual', application_status = 'upcoming',
  last_verified_at = NOW(), last_updated_at = NOW(),
  verification_status = 'verified', source_reliability = 10
WHERE id = 114;

-- 338 University of Wisconsin-Madison
UPDATE scholarships SET
  degree_levels = '["PhD","Master''s"]', coverage_type = 'Unspecified',
  amount_usd_value = 0, award_amount = NULL, award_currency = 'USD',
  award_period = 'year', award_basis = 'variable',
  website_url = 'https://grad.wisc.edu/funding/',
  source_url = 'https://grad.wisc.edu/funding/',
  application_url = 'https://grad.wisc.edu/funding/',
  recurrence = 'annual', application_status = 'open',
  last_verified_at = NOW(), last_updated_at = NOW(),
  verification_status = 'verified', source_reliability = 10
WHERE id = 338;

COMMIT;

-- Long prose fields (description, requirements, tuition_coverage, notes) for all four rows are
-- reproduced in docs/SCHOLARSHIP_REWRITE_PASS_75_2026-10-23.md.
