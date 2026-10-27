-- ScholarBridgeAi — scholarship rewrite, pass 77 (US doctoral rows at reliability 5, part 3)
-- Date: 2026-10-26
-- Project: zkdguzbdopfedkffsatk (Postgres 17)
--
-- RESULT: source_reliability = 5 falls from 19 to 16; bare-domain website_url from 75 to 72.
--
-- VERIFIED THIS PASS
--   125 Chicago    grad.uchicago.edu/admissions/funding/ — students in most PhD programmes are
--                  guaranteed funding every year until degree completion; master's aid differs
--                  widely (many merit, a few need-based); external funding encouraged.
--                  reliability 9: no composition and no figure published
--   330 Penn State gradschool.psu.edu/funding/ — assistantships awarded by the graduate
--                  programme are the most common support; fellowships, traineeships,
--                  scholarships, loans, employment and recognition awards alongside; contact the
--                  programme coordinator. reliability 9 for the same reason
--   335 UNC        gradschool.unc.edu/funding/basics/financialresources/ — budgeting resources,
--                  VITA tax help, IRS Topic 421 and Publication 970, and the referral rules for
--                  department funding questions. reliability 8: a resources and referral page
--                  that publishes no award, guarantee or figure
--
-- FAILED ATTEMPTS RECORDED
--   gradschool.utexas.edu/financial and graduate.utexas.edu/financial   404
--   graduate.brown.edu/financial-support                               failed to fetch
--   gsas.nyu.edu/financial-aid.html                                    404
--   graduateschool.wustl.edu/financial-support/                        HTTP 500
--   graduateschool.usc.edu/funding/                                    opens a blog post about
--                                                                      international research
--                                                                      funding, not the funding
--                                                                      page, so not used
--
-- A NOTE ON THE SCALE
-- This project now distinguishes three grades of US doctoral funding page:
--   10 — publishes a percentage, a guarantee or a stipend figure (Cornell, Duke, Caltech,
--        MIT, Harvard, Wisconsin)
--    9 — publishes categories and referral routes but no figure (Berkeley, UW, Chicago,
--        Penn State)
--    8 — publishes guidance and tax help only (UNC)
-- Recording which is which matters more than pushing every row to 10.
--
-- STILL AT reliability 5 (16): 115, 127, 136, 138, 148, 150, 306, 308, 320, 329, 332, 336,
--   340, 354, 357, 366
--
-- Long prose fields are reproduced in docs/SCHOLARSHIP_REWRITE_PASS_77_2026-10-23.md.

BEGIN;

-- 125 University of Chicago
UPDATE scholarships SET
  degree_levels = '["PhD","Master''s"]', coverage_type = 'Unspecified',
  amount_usd_value = 0, award_amount = NULL, award_currency = 'USD',
  award_period = 'year', award_basis = 'variable',
  website_url = 'https://grad.uchicago.edu/admissions/funding/',
  source_url = 'https://grad.uchicago.edu/admissions/funding/',
  application_url = 'https://grad.uchicago.edu/fellowships/',
  recurrence = 'annual', application_status = 'open',
  last_verified_at = NOW(), last_updated_at = NOW(),
  verification_status = 'verified', source_reliability = 9
WHERE id = 125;

-- 330 Pennsylvania State University
UPDATE scholarships SET
  degree_levels = '["PhD","Master''s"]', coverage_type = 'Unspecified',
  amount_usd_value = 0, award_amount = NULL, award_currency = 'USD',
  award_period = 'year', award_basis = 'variable',
  website_url = 'https://gradschool.psu.edu/funding/',
  source_url = 'https://gradschool.psu.edu/funding/',
  application_url = 'https://gradschool.psu.edu/funding/planning-your-finances',
  recurrence = 'annual', application_status = 'open',
  last_verified_at = NOW(), last_updated_at = NOW(),
  verification_status = 'verified', source_reliability = 9
WHERE id = 330;

-- 335 University of North Carolina at Chapel Hill
UPDATE scholarships SET
  degree_levels = '["PhD","Master''s"]', coverage_type = 'Unspecified',
  amount_usd_value = 0, award_amount = NULL, award_currency = 'USD',
  award_period = 'year', award_basis = 'variable',
  website_url = 'https://gradschool.unc.edu/funding/basics/financialresources/',
  source_url = 'https://gradschool.unc.edu/funding/basics/financialresources/',
  application_url = 'https://gradschool.unc.edu/funding/',
  recurrence = 'annual', application_status = 'open',
  last_verified_at = NOW(), last_updated_at = NOW(),
  verification_status = 'verified', source_reliability = 8
WHERE id = 335;

COMMIT;
