-- ScholarBridgeAi — scholarship rewrite, pass 81 (US doctoral rows at reliability 5, part 7)
-- Date: 2026-10-26
-- Project: zkdguzbdopfedkffsatk (Postgres 17)
--
-- RESULT: source_reliability = 5 falls from 7 to 4; bare-domain website_url from 63 to 60.
-- amount_usd_value > 5000 rises from 16 to 17 because BU's USD 47,740 is a published rate.
--
-- VERIFIED THIS PASS
--   332 BU      bu.edu/grad/admission-funding/phd-funding/ and
--               bu.edu/cas/.../frequently-asked-questions/stipends/ — full funding model on the
--               Charles River Campus: five years of stipend support, 100% tuition scholarship and
--               a health insurance credit, with full tuition and student services fees covered and
--               SHIP basic cover via Aetna; 2024-25 minimum stipends of USD 27,318 for eight months
--               to USD 40,977 for twelve; the 2024 collective bargaining agreement with BUGWU that
--               extended support to twelve months and set USD 45,000 from 15 November 2024,
--               USD 46,350 from 1 September 2025 and USD 47,740 from 1 September 2026; the
--               service-versus-non-service stipend distinction. reliability 10
--   150 NYU      gsas.nyu.edu/admissions/financial-aid/graduate-school-fellowships-and-assistantships.html —
--               MacCracken Program minimum package: a four- or five-year term, a scholarship for
--               full tuition and registration and services fees, full coverage of mandatory student
--               health insurance premiums for an individual, a nine-month academic-year stipend and
--               a one-time USD 1,000 Dean's Supplementary Fellowship Grant; departments may add to
--               it; external awards are topped up to full funding; teaching pay is additional; and
--               seven affiliate doctoral programs do not use MacCracken funding. reliability 10
--   148 UCLA     grad.ucla.edu/funding/faqs/ — need-based support restricted to US citizens and
--               permanent residents, while merit support in fellowships, traineeships, teaching
--               assistantships and GSR positions is open to international students; the Division of
--               Graduate Education allocates to programs which select through faculty committees;
--               15 December deadline for entering students and 2 March for loans and work-study;
--               up to USD 1,000 research and travel reimbursement through the seventh year; no two
--               major awards at once. reliability 9 because no doctoral award figure is published
--
-- STILL AT reliability 5 (4): 308 UCSD, 354 WUSTL, 357 USC, 366 Rochester
--
-- Long prose fields are reproduced in docs/SCHOLARSHIP_REWRITE_PASS_81_2026-10-23.md.

BEGIN;

-- 148 UCLA
UPDATE scholarships SET
  degree_levels = '["PhD","Master''s"]', coverage_type = 'Unspecified',
  amount_usd_value = 0, award_amount = NULL, award_currency = 'USD',
  award_period = 'year', award_basis = 'variable',
  deadline = 'December 15 - the deadline for entering graduate students to apply for support beyond federal loans and work-study; the loan and work-study deadline is March 2',
  deadline_date = '2026-12-15', deadline_type = 'fixed',
  deadline_range_start = NULL, deadline_range_end = NULL,
  website_url = 'https://grad.ucla.edu/funding/faqs/',
  source_url = 'https://grad.ucla.edu/funding/faqs/',
  application_url = 'https://grad.ucla.edu/funding/financial-aid/funding-for-entering-students/',
  recurrence = 'annual', application_status = 'open',
  last_verified_at = NOW(), last_updated_at = NOW(),
  verification_status = 'verified', source_reliability = 9
WHERE id = 148;

-- 150 NYU Arts & Science
UPDATE scholarships SET
  degree_levels = '["PhD"]', coverage_type = 'Full Funding',
  amount_usd_value = 0, award_amount = NULL, award_currency = 'USD',
  award_period = 'year', award_basis = 'variable',
  website_url = 'https://gsas.nyu.edu/admissions/financial-aid/graduate-school-fellowships-and-assistantships.html',
  source_url = 'https://gsas.nyu.edu/admissions/financial-aid/graduate-school-fellowships-and-assistantships.html',
  application_url = 'https://gsas.nyu.edu/admissions/financial-aid/graduate-school-fellowships-and-assistantships.html',
  recurrence = 'annual', application_status = 'open',
  last_verified_at = NOW(), last_updated_at = NOW(),
  verification_status = 'verified', source_reliability = 10
WHERE id = 150;

-- 332 Boston University
UPDATE scholarships SET
  degree_levels = '["PhD"]', coverage_type = 'Full Funding',
  amount_usd_value = 47740, award_amount = 47740, award_currency = 'USD',
  award_period = 'year', award_basis = 'fixed',
  website_url = 'https://www.bu.edu/grad/admission-funding/phd-funding/',
  source_url = 'https://www.bu.edu/grad/admission-funding/phd-funding/',
  application_url = 'https://www.bu.edu/cas/admissions/phd-mfa/fellowship-aid/frequently-asked-questions/stipends/',
  recurrence = 'annual', application_status = 'open',
  last_verified_at = NOW(), last_updated_at = NOW(),
  verification_status = 'verified', source_reliability = 10
WHERE id = 332;

COMMIT;
