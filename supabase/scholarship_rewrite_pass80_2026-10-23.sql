-- ScholarBridgeAi — scholarship rewrite, pass 80 (US doctoral rows at reliability 5, part 6)
-- Date: 2026-10-26
-- Project: zkdguzbdopfedkffsatk (Postgres 17)
--
-- RESULT: source_reliability = 5 falls from 10 to 7; bare-domain website_url from 66 to 63.
-- amount_usd_value > 5000 rises from 14 to 16 because UT Austin's USD 49,000 floor and Brown's
-- USD 52,198 twelve-month stipend are now stored as published rates in the dollar column.
--
-- VERIFIED THIS PASS
--   329 Brown      graduateschool.brown.edu/financing-support/phd-funding and
--                  .../graduation-student-stipend-information — five years of guaranteed support
--                  (six in humanities and social sciences) covering a stipend, full tuition
--                  remission, the health-services fee and health and dental insurance subsidies;
--                  2025-2026 arithmetic of USD 19,574.25 fall/spring, USD 13,049.50 summer,
--                  USD 52,198 twelve-month and USD 4,349.83 monthly; 2026-2027 doctoral tuition
--                  USD 74,568; fellowship appointments outside the bargaining unit with no tax
--                  withheld versus assistantships inside it with tax withheld; twelve-hour weekly
--                  limit on additional paid training; Sprintax Calculus for internationals
--                  including reporting every departure and re-entry. reliability 10
--   320 UT Austin  graduate.utexas.edu/funding/fellowships/grad-school/recruitment —
--                  Harrington Graduate Fellows receive a twelve-month stipend of at least
--                  USD 49,000 plus full tuition and required fees, an insurance stipend and a
--                  USD 2,000 allowance, with nine and three credit-hour enrolment and a ban on
--                  holding another university fellowship; one- to three-year duration;
--                  nomination by the graduate adviser; top ten per cent of the discipline and no
--                  prior or current UT Austin graduate enrolment; nominations 7 December 2026 to
--                  29 January 2027. reliability 10
--   306 CMU        cmu.edu/graduate/prospective/index.html plus cmu.edu/graduate/funding/index.html
--                  and the Tepper doctoral page — master's mostly self-supporting, PhD at least
--                  partially funded, each programme makes its own arrangements; central extras of
--                  conference funding (USD 750 per student, USD 1,500 per group), scholarly project
--                  grants of USD 750, professional engagement funding of USD 250 and the Rales
--                  Fellows Program; per-college doctoral tuition such as USD 52,000 for SCS and
--                  USD 52,780 for CIT; Tepper's full tuition remission with a five-year stipend.
--                  reliability 9 because the university page publishes no award
--
-- STILL AT reliability 5 (7): 148 UCLA, 150 NYU, 308 UCSD, 332 BU, 354 WUSTL, 357 USC, 366 Rochester
--
-- Long prose fields are reproduced in docs/SCHOLARSHIP_REWRITE_PASS_80_2026-10-23.md.

BEGIN;

-- 329 Brown University
UPDATE scholarships SET
  degree_levels = '["PhD"]', coverage_type = 'Full Funding',
  amount_usd_value = 52198, award_amount = 52198, award_currency = 'USD',
  award_period = 'year', award_basis = 'fixed',
  website_url = 'https://graduateschool.brown.edu/financing-support/phd-funding/graduate-student-stipend-information',
  source_url = 'https://graduateschool.brown.edu/financing-support/phd-funding',
  application_url = 'https://graduateschool.brown.edu/financing-support/phd-funding',
  recurrence = 'annual', application_status = 'open',
  last_verified_at = NOW(), last_updated_at = NOW(),
  verification_status = 'verified', source_reliability = 10
WHERE id = 329;

-- 320 University of Texas at Austin
UPDATE scholarships SET
  degree_levels = '["PhD"]', coverage_type = 'Full Funding',
  amount_usd_value = 49000, award_amount = 49000, award_currency = 'USD',
  award_period = 'year', award_basis = 'range',
  deadline = 'Nominations for Harrington Recruitment Fellowships open on 7 December 2026 and close on 29 January 2027, as published in the recruitment fellowship deadline table',
  deadline_date = '2027-01-29', deadline_type = 'fixed',
  deadline_range_start = NULL, deadline_range_end = NULL,
  website_url = 'https://graduate.utexas.edu/funding/fellowships/grad-school/recruitment',
  source_url = 'https://graduate.utexas.edu/funding/fellowships/grad-school/recruitment',
  application_url = 'https://utdirect.utexas.edu/ogs/awards/candidate/nomination_info.WBX',
  recurrence = 'annual', application_status = 'upcoming',
  last_verified_at = NOW(), last_updated_at = NOW(),
  verification_status = 'verified', source_reliability = 10
WHERE id = 320;

-- 306 Carnegie Mellon University
UPDATE scholarships SET
  degree_levels = '["PhD","Master''s"]', coverage_type = 'Unspecified',
  amount_usd_value = 0, award_amount = NULL, award_currency = 'USD',
  award_period = 'year', award_basis = 'variable',
  website_url = 'https://www.cmu.edu/graduate/prospective/index.html',
  source_url = 'https://www.cmu.edu/graduate/prospective/index.html',
  application_url = 'https://www.cmu.edu/graduate/funding/index.html',
  recurrence = 'annual', application_status = 'open',
  last_verified_at = NOW(), last_updated_at = NOW(),
  verification_status = 'verified', source_reliability = 9
WHERE id = 306;

COMMIT;
