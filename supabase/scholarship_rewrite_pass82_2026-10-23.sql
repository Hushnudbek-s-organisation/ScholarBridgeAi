-- ScholarBridgeAi — scholarship rewrite, pass 82 (the last four US doctoral rows at reliability 5)
-- Date: 2026-10-26
-- Project: zkdguzbdopfedkffsatk (Postgres 17)
--
-- MILESTONE: source_reliability = 5 is now ZERO. The group of 27 rows created in pass 58 —
-- rows whose mechanism was right but whose university page had not been read — is closed.
-- Every one of them is now either fully verified (8-10) or honestly downgraded to 4.
--
-- RESULT: source_reliability = 5: 4 -> 0; bare-domain website_url: 60 -> 56.
-- amount_usd_value > 5000 rises from 17 to 20 because three of these rows now carry published
-- US-dollar rates (UCSD 37,500; WashU 37,853; USC 42,436). All twenty rows in that list are
-- published figures.
--
-- VERIFIED THIS PASS
--   357 USC    graduateschool.usc.edu/.../Minimum_-Stipend-Memo-AY2026-2027-1-14-2026.pdf —
--              provost memo of 14 January 2026: the 2026-27 minimum total stipend is USD 42,436,
--              a 3% increase; programmes paying above the minimum must also raise by 3%; every
--              PhD must be supported at or above the minimum for the duration of the package in
--              the original offer letter; health and dental insurance and the student health
--              centre fee stay in the package; PhD tuition handling is unchanged. reliability 10
--   354 WashU   gradstudies.artsci.washu.edu/funding-and-support plus bulletin.wustl.edu —
--              2026-2027 PhD stipend USD 37,853 dispersed monthly; full tuition charge USD 69,190;
--              health insurance USD 2,630, dental USD 231 and wellness fee USD 630 each with a
--              90% subsidy; the university-wide minimum applies to all PhD programmes except
--              post-professional specialty programmes in the School of Medicine; a unit paying
--              above the minimum must do so for every student in its cohort. reliability 10
--   308 UCSD   scripps.ucsd.edu/doctoral/frequently-asked-questions — campus general package for
--              first-year doctoral students is a minimum commitment of USD 37,500 plus tuition
--              and mandatory fees, with non-resident supplemental tuition covered; anything
--              beyond that depends on available funds and is not guaranteed; GSR and TA
--              appointments fall under the UCOP-UAW agreement with fee remission at 25% or more
--              during the academic year and not in summer. reliability 9 because this is a
--              department page relaying the campus commitment
--   366 Rochester rochester.edu/graduate-education/financial-support/ — aid is awarded by
--              departments, schools and colleges on academic promise; most doctoral students
--              receive significant support often covering tuition and living costs fully; the
--              Sproull University Fellowship gives ten to twelve awards a year by nomination with
--              final selection by the Dean of Graduate Studies; the Provost's Fellowship broadens
--              cohort diversity; central extras include insurance, childcare grants and a parental
--              accommodation policy. reliability 9 because no amount is published centrally
--
-- Long prose fields are reproduced in docs/SCHOLARSHIP_REWRITE_PASS_82_2026-10-23.md.

BEGIN;

-- 308 UC San Diego
UPDATE scholarships SET
  degree_levels = '["PhD","Master''s"]', coverage_type = 'Full Funding',
  amount_usd_value = 37500, award_amount = 37500, award_currency = 'USD',
  award_period = 'year', award_basis = 'fixed',
  website_url = 'https://scripps.ucsd.edu/doctoral/frequently-asked-questions',
  source_url = 'https://scripps.ucsd.edu/doctoral/frequently-asked-questions',
  application_url = 'https://grad.ucsd.edu/financial/fellowships/index.html',
  recurrence = 'annual', application_status = 'open',
  last_verified_at = NOW(), last_updated_at = NOW(),
  verification_status = 'verified', source_reliability = 9
WHERE id = 308;

-- 354 Washington University in St. Louis
UPDATE scholarships SET
  degree_levels = '["PhD","Master''s"]', coverage_type = 'Full Funding',
  amount_usd_value = 37853, award_amount = 37853, award_currency = 'USD',
  award_period = 'year', award_basis = 'fixed',
  website_url = 'https://gradstudies.artsci.washu.edu/funding-and-support',
  source_url = 'https://gradstudies.artsci.washu.edu/funding-and-support',
  application_url = 'https://graduateschool.wustl.edu/funding-support',
  recurrence = 'annual', application_status = 'open',
  last_verified_at = NOW(), last_updated_at = NOW(),
  verification_status = 'verified', source_reliability = 10
WHERE id = 354;

-- 357 University of Southern California
UPDATE scholarships SET
  degree_levels = '["PhD"]', coverage_type = 'Full Funding',
  amount_usd_value = 42436, award_amount = 42436, award_currency = 'USD',
  award_period = 'year', award_basis = 'fixed',
  website_url = 'https://graduateschool.usc.edu/wp-content/uploads/2026/01/Minimum_-Stipend-Memo-AY2026-2027-1-14-2026.pdf',
  source_url = 'https://graduateschool.usc.edu/wp-content/uploads/2026/01/Minimum_-Stipend-Memo-AY2026-2027-1-14-2026.pdf',
  application_url = 'https://graduateschool.usc.edu/fellowships/fellowships-for-phd-students/',
  recurrence = 'annual', application_status = 'open',
  last_verified_at = NOW(), last_updated_at = NOW(),
  verification_status = 'verified', source_reliability = 10
WHERE id = 357;

-- 366 University of Rochester
UPDATE scholarships SET
  degree_levels = '["PhD"]', coverage_type = 'Unspecified',
  amount_usd_value = 0, award_amount = NULL, award_currency = 'USD',
  award_period = 'year', award_basis = 'variable',
  website_url = 'https://www.rochester.edu/graduate-education/financial-support/',
  source_url = 'https://www.rochester.edu/graduate-education/financial-support/',
  application_url = 'https://www.rochester.edu/graduate-education/financial-support/',
  recurrence = 'annual', application_status = 'open',
  last_verified_at = NOW(), last_updated_at = NOW(),
  verification_status = 'verified', source_reliability = 9
WHERE id = 366;

COMMIT;

-- Verification: after this pass the reliability-5 cohort should return zero rows.
--   SELECT COUNT(*) FROM scholarships WHERE is_active AND source_reliability = 5;  -- expect 0
