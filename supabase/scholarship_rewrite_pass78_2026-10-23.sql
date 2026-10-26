-- ScholarBridgeAi — scholarship rewrite, pass 78 (US doctoral rows at reliability 5, part 4)
-- Date: 2026-10-26
-- Project: zkdguzbdopfedkffsatk (Postgres 17)
--
-- RESULT: source_reliability = 5 falls from 16 to 14; bare-domain website_url from 72 to 70.
-- amount_usd_value > 5000 RISES from 11 to 13, deliberately — see the currency-rule note below.
--
-- VERIFIED THIS PASS
--   127 Yale      gsas.yale.edu/resources/graduate-financial-aid and
--                 .../graduate-financial-aid/phd-stipends — every PhD student receives full
--                 tuition, a twelve-month stipend and paid health coverage for at least five
--                 years; average of more than USD 500,000 across enrolment; 2026-2027 minimum
--                 stipends of USD 52,046 (humanities, social sciences, physical sciences) and
--                 USD 53,629 (biological and biomedical); first-year stipend over 25 semi-monthly
--                 payments with a one-time USD 1,500 relocation award; master's not generally
--                 funded; Dean's Emergency Fund up to USD 2,000; Conference Travel Fellowship up
--                 to USD 800. reliability 10
--   138 Columbia  gsas.columbia.edu/content/financial-aid — the financial aid office allocates
--                 funds to incoming and continuing students, administers external awards and
--                 processes federal loans and work-study; doctoral students are salaried (there
--                 is a salary-advance procedure for salaried PhD and DMA students); fellowships
--                 are internal and external; MA scholarship funding is explicitly limited;
--                 2026-2027 federal loan changes; separate tax page for international students.
--                 reliability 9: a hub page with no award, guarantee or figure
--
-- CURRENCY RULE CORRECTED — row 114
-- Row 20 (Caltech) stored 50,000 in amount_usd_value while row 114 (the same Caltech package)
-- stored 0 there and 50,000 only in award_amount. Two conventions for the same thing is a bug.
-- The rule now applied everywhere: when a US award is paid in US dollars, amount_usd_value
-- carries the published figure, exactly as award_amount does; amount_usd_value = 0 is reserved
-- for awards paid in another currency. Row 114 therefore moves to 50000, and the >5000 counter
-- rises by two because Yale (52,046) and Caltech (50,000) are now real published USD rates.
-- Every row in that list is a published figure, not an invention.
--
-- FAILED ATTEMPTS RECORDED (also in the notes and in the pass document)
--   gsas.yale.edu/admissions/financial-aid        404
--   gsas.yale.edu/financial-support               Access Denied
--   gsas.columbia.edu/content/funding             404
--   grad.gatech.edu/funding                       404
--   bu.edu/grad/financial-aid/                    404
--   homewoodgrad.jhu.edu/graduate-funding/        page unavailable
--   rochester.edu/college/gradstudies/financial-support/ 404
--   grad.ucla.edu/financial-support/              404
--   graduateschool.usc.edu/students/funding/      redirects to a blog post
--   provost.upenn.edu/phd-funding                 404
--   cmu.edu/graduate/admission-aid/               404
-- The correct Yale address was found by SEARCHING for the page and then fetching it, not by
-- guessing paths; that method will be used for the remaining fourteen rows.
--
-- STILL AT reliability 5 (14): 115, 136, 148, 150, 306, 308, 320, 329, 332, 336, 340, 354,
--   357, 366
--
-- Long prose fields are reproduced in docs/SCHOLARSHIP_REWRITE_PASS_78_2026-10-23.md.

BEGIN;

-- 127 Yale University
UPDATE scholarships SET
  degree_levels = '["PhD"]', coverage_type = 'Full Funding',
  amount_usd_value = 52046, award_amount = 52046, award_currency = 'USD',
  award_period = 'year', award_basis = 'fixed',
  website_url = 'https://gsas.yale.edu/resources/graduate-financial-aid',
  source_url = 'https://gsas.yale.edu/resources/graduate-financial-aid',
  application_url = 'https://gsas.yale.edu/resources/graduate-financial-aid/phd-stipends',
  recurrence = 'annual', application_status = 'open',
  last_verified_at = NOW(), last_updated_at = NOW(),
  verification_status = 'verified', source_reliability = 10
WHERE id = 127;

-- 138 Columbia University GSAS
UPDATE scholarships SET
  degree_levels = '["PhD","Master''s"]', coverage_type = 'Unspecified',
  amount_usd_value = 0, award_amount = NULL, award_currency = 'USD',
  award_period = 'year', award_basis = 'variable',
  website_url = 'https://www.gsas.columbia.edu/content/financial-aid',
  source_url = 'https://www.gsas.columbia.edu/content/financial-aid',
  application_url = 'https://www.gsas.columbia.edu/content/financial-aid',
  recurrence = 'annual', application_status = 'open',
  last_verified_at = NOW(), last_updated_at = NOW(),
  verification_status = 'verified', source_reliability = 9
WHERE id = 138;

-- 114 Caltech: currency-rule correction, no new facts
UPDATE scholarships SET
  amount_usd_value = 50000
WHERE id = 114 AND award_amount = 50000 AND amount_usd_value = 0;

COMMIT;
