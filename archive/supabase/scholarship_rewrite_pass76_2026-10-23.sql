-- ScholarBridgeAi — scholarship rewrite, pass 76 (US doctoral rows at reliability 5, part 2)
-- Date: 2026-10-26
-- Project: zkdguzbdopfedkffsatk (Postgres 17)
--
-- RESULT: source_reliability = 5 falls from 23 to 19; bare-domain website_url from 79 to 75.
--
-- VERIFIED THIS PASS
--   120 Cornell  gradschool.cornell.edu/financial-support/ — 99% of PhD students fully funded;
--                package = tuition, fees, health insurance and a living allowance/stipend; base
--                stipend rates equivalent for fellowships and assistantships and consistent
--                across fields; research master's and professional programmes get limited aid;
--                stipends taxable federally and in New York State. reliability 10
--   347 Duke     gradschool.duke.edu/financial-support/ — PhD package = stipend, tuition, fees,
--                health insurance premiums; five-year guarantee; twelve-month stipends since
--                2022-23; master's aid limited to the federal Direct Loan; federal loan changes
--                from 1 July 2026. reliability 10
--   116 Berkeley grad.berkeley.edu/financial/ — support assembled from academic student
--                employment (GSR, GSI, Reader, Tutor), competitive fellowships that pay tuition,
--                targeted grants and emergency aid; the department's Graduate Student Affairs
--                Officer builds the plan. reliability 9 — the page publishes categories and
--                neither a doctoral guarantee nor a figure
--   315 UW       grad.uw.edu/graduate-student-funding/how-do-i-pay-for-graduate-school/ —
--                assistantships are paid academic employment with tuition reimbursement;
--                fellowships are competitive awards without work obligations; loans, work-study,
--                Handshake jobs; start searching at or before application. reliability 9 for the
--                same reason
--
-- FAILED ATTEMPTS RECORDED
--   www.cmu.edu/graduate/financial-support/index.html  404
--   grad.ucsd.edu/funding/                             404
--
-- STILL AT reliability 5 (19): 115, 125, 127, 136, 138, 148, 150, 306, 308, 320, 329, 330,
--   332, 335, 336, 340, 354, 357, 366
--
-- Long prose fields are reproduced in docs/SCHOLARSHIP_REWRITE_PASS_76_2026-10-23.md.

BEGIN;

-- 120 Cornell
UPDATE scholarships SET
  degree_levels = '["PhD"]', coverage_type = 'Full Funding',
  amount_usd_value = 0, award_amount = NULL, award_currency = 'USD',
  award_period = 'year', award_basis = 'variable',
  website_url = 'https://gradschool.cornell.edu/financial-support/',
  source_url = 'https://gradschool.cornell.edu/financial-support/',
  application_url = 'https://gradschool.cornell.edu/financial-support/',
  recurrence = 'annual', application_status = 'open',
  last_verified_at = NOW(), last_updated_at = NOW(),
  verification_status = 'verified', source_reliability = 10
WHERE id = 120;

-- 347 Duke
UPDATE scholarships SET
  degree_levels = '["PhD","Master''s"]', coverage_type = 'Full Funding',
  amount_usd_value = 0, award_amount = NULL, award_currency = 'USD',
  award_period = 'year', award_basis = 'variable',
  website_url = 'https://gradschool.duke.edu/financial-support/',
  source_url = 'https://gradschool.duke.edu/financial-support/',
  application_url = 'https://gradschool.duke.edu/financial-support/phd-financial-support/',
  recurrence = 'annual', application_status = 'open',
  last_verified_at = NOW(), last_updated_at = NOW(),
  verification_status = 'verified', source_reliability = 10
WHERE id = 347;

-- 116 Berkeley
UPDATE scholarships SET
  degree_levels = '["PhD"]', coverage_type = 'Unspecified',
  amount_usd_value = 0, award_amount = NULL, award_currency = 'USD',
  award_period = 'year', award_basis = 'variable',
  website_url = 'https://grad.berkeley.edu/financial/',
  source_url = 'https://grad.berkeley.edu/financial/',
  application_url = 'https://grad.berkeley.edu/financial/options-for-financial-support/',
  recurrence = 'annual', application_status = 'open',
  last_verified_at = NOW(), last_updated_at = NOW(),
  verification_status = 'verified', source_reliability = 9
WHERE id = 116;

-- 315 University of Washington
UPDATE scholarships SET
  degree_levels = '["PhD","Master''s"]', coverage_type = 'Unspecified',
  amount_usd_value = 0, award_amount = NULL, award_currency = 'USD',
  award_period = 'year', award_basis = 'variable',
  website_url = 'https://grad.uw.edu/graduate-student-funding/how-do-i-pay-for-graduate-school/',
  source_url = 'https://grad.uw.edu/graduate-student-funding/how-do-i-pay-for-graduate-school/',
  application_url = 'https://grad.uw.edu/graduate-student-funding/assistantships/',
  recurrence = 'annual', application_status = 'open',
  last_verified_at = NOW(), last_updated_at = NOW(),
  verification_status = 'verified', source_reliability = 9
WHERE id = 315;

COMMIT;
