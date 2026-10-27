-- ScholarBridgeAi — scholarship rewrite, pass 79 (US doctoral rows at reliability 5, part 5)
-- Date: 2026-10-26
-- Project: zkdguzbdopfedkffsatk (Postgres 17)
--
-- RESULT: source_reliability = 5 falls from 14 to 10; bare-domain website_url from 70 to 66.
-- amount_usd_value > 5000 rises from 13 to 14 because JHU's USD 52,000 is now stored as the
-- published rate in the dollar column, following the currency rule set in pass 78.
--
-- METHOD NOTE
-- Guessing paths failed eleven times in pass 78. This pass used SEARCH -> take the official
-- URL -> FETCH that page. Four out of four searches produced a usable official page.
--
-- VERIFIED THIS PASS
--   136 JHU       provost.jhu.edu/.../PhD-Funding-and-Wage-Types_030425.pdf — collective
--                 bargaining agreement ratified April 2024; annual guaranteed funding of
--                 USD 47,000 (24/25), USD 50,000 (25/26) and USD 52,000 (26/27);
--                 wage-versus-fellowship classification including NIH NRSA T-32/F31;
--                 F-1/J-1 students may work 20 hours a week on campus, a full stipend is
--                 treated as exactly that, and supplemental work needs CPT/AT approved by OIS
--                 at least two weeks in advance. reliability 10
--   340 Georgia Tech policylibrary.gatech.edu/academic-affairs/stipends-graduate-assistantships —
--                 2026-2027 institute minimum of USD 2,291 per month for doctoral GRA/GTA at
--                 one-third time or greater, USD 1,184 for master's; units set their own level
--                 above the floor with eight factors including the I-20 cost of living for
--                 international students; Provost fixes the minimum by 1 January; units must
--                 publish their rates. reliability 10
--   336 Purdue    purdue.edu/academics/ogsps/admissions/faq/ — about 70% of graduate students
--                 funded; assistantship is about 20 hours a week for remission of most fees
--                 plus a monthly stipend, insurance at half time or more and paid time off on
--                 twelve-month appointments; fellowships may or may not include tuition.
--                 reliability 10
--   115 Penn      penntoday.upenn.edu/news/penn-announces-largest-one-time-increase-minimum-phd-stipend —
--                 university minimum PhD stipend raised to USD 38,000 from 2023-24; each of the
--                 nine doctoral schools sets its own level above it; the School of Arts and
--                 Sciences uses the Benjamin Franklin Fellowship, five years of tuition, fees,
--                 health insurance and stipend regardless of citizenship. reliability 8 because
--                 the figure read is a 2023-24 news announcement, so NO amount is stored
--
-- STILL AT reliability 5 (10): 148 UCLA, 150 NYU, 306 CMU, 308 UCSD, 320 UT Austin, 329 Brown,
--   332 BU, 354 WUSTL, 357 USC, 366 Rochester
--
-- Long prose fields are reproduced in docs/SCHOLARSHIP_REWRITE_PASS_79_2026-10-23.md.

BEGIN;

-- 136 Johns Hopkins University
UPDATE scholarships SET
  degree_levels = '["PhD"]', coverage_type = 'Living Stipend',
  amount_usd_value = 52000, award_amount = 52000, award_currency = 'USD',
  award_period = 'year', award_basis = 'fixed',
  website_url = 'https://provost.jhu.edu/wp-content/uploads/2025/05/PhD-Funding-and-Wage-Types_030425.pdf',
  source_url = 'https://provost.jhu.edu/wp-content/uploads/2025/05/PhD-Funding-and-Wage-Types_030425.pdf',
  application_url = 'https://provost.jhu.edu/',
  recurrence = 'annual', application_status = 'open',
  last_verified_at = NOW(), last_updated_at = NOW(),
  verification_status = 'verified', source_reliability = 10
WHERE id = 136;

-- 340 Georgia Institute of Technology
UPDATE scholarships SET
  degree_levels = '["PhD","Master''s"]', coverage_type = 'Living Stipend',
  amount_usd_value = 2291, award_amount = 2291, award_currency = 'USD',
  award_period = 'month', award_basis = 'fixed',
  website_url = 'https://policylibrary.gatech.edu/academic-affairs/stipends-graduate-assistantships',
  source_url = 'https://policylibrary.gatech.edu/academic-affairs/stipends-graduate-assistantships',
  application_url = 'https://policylibrary.gatech.edu/academic-affairs/graduate-student-enrollment-and-employment',
  recurrence = 'annual', application_status = 'open',
  last_verified_at = NOW(), last_updated_at = NOW(),
  verification_status = 'verified', source_reliability = 10
WHERE id = 340;

-- 336 Purdue University
UPDATE scholarships SET
  degree_levels = '["PhD","Master''s"]', coverage_type = 'Unspecified',
  amount_usd_value = 0, award_amount = NULL, award_currency = 'USD',
  award_period = 'year', award_basis = 'variable',
  website_url = 'https://www.purdue.edu/academics/ogsps/admissions/faq/',
  source_url = 'https://www.purdue.edu/academics/ogsps/admissions/faq/',
  application_url = 'https://www.purdue.edu/academics/ogsps/fellowship/',
  recurrence = 'annual', application_status = 'open',
  last_verified_at = NOW(), last_updated_at = NOW(),
  verification_status = 'verified', source_reliability = 10
WHERE id = 336;

-- 115 University of Pennsylvania
UPDATE scholarships SET
  degree_levels = '["PhD"]', coverage_type = 'Full Funding',
  amount_usd_value = 0, award_amount = NULL, award_currency = 'USD',
  award_period = 'year', award_basis = 'variable',
  website_url = 'https://penntoday.upenn.edu/news/penn-announces-largest-one-time-increase-minimum-phd-stipend',
  source_url = 'https://penntoday.upenn.edu/news/penn-announces-largest-one-time-increase-minimum-phd-stipend',
  application_url = 'https://www.upenn.edu/',
  recurrence = 'annual', application_status = 'open',
  last_verified_at = NOW(), last_updated_at = NOW(),
  verification_status = 'verified', source_reliability = 8
WHERE id = 115;

COMMIT;
