-- ScholarBridgeAi — scholarship rewrite, pass 84 (bare-domain website_url, part 2: UK)
-- Date: 2026-10-26
-- Project: zkdguzbdopfedkffsatk (Postgres 17)
--
-- RESULT: bare-domain website_url falls from 43 to 38; source_reliability >= 9 rises by 18.
--
-- Five UK rows moved from "terms never verified" to fully documented, each with a real page:
--
--   550 Cardiff   cardiff.ac.uk/study/international/funding-and-fees/international-scholarships
--                 and .../vc-international-scholarship
--                   UG International Excellence GBP 10,000, first year only, nine awards,
--                      application by 23:59 UK time Friday 2 April 2027
--                   VC UG GBP 3,500-5,000; ISC Progression GBP 2,000-3,000; NCUK GBP 2,000
--                   VC Postgraduate GBP 4,000-10,000: standard GBP 4,000, GBP 6,000 for
--                      Egypt/Kazakhstan/Kenya/Mexico/Pakistan/South Korea/Taiwan/USA/Vietnam,
--                      GBP 10,000 for Bangladesh/Nigeria. UZBEKISTAN IS NOT ON EITHER LIST.
--                   automatic on offer acceptance and deposit; unconditional offer gets it
--                   scholarship eligibility judged against published minimum grades, not the
--                      offer actually made
--   720 Aberdeen  abdn.ac.uk/study/funding/644/
--                   PG GBP 8,000 tuition waiver, automatic with no application, shown on the CAS,
--                      academic years 26/27 and 27/28, taught and research Masters
--                   UG GBP 6,000 per year for 25/26 and 26/27; 27/28 not yet confirmed
--                   exclusions: DPLP, PGDE, Dentistry (and Medicine at UG level)
--                   no stacking with another fully funded award except Development Trust awards
--                   the published country list INCLUDES UZBEKISTAN
--                   illustrated by paired fees of GBP 26,250 (international) and GBP 18,250
--                      (self-funded) for 2026/27, the difference being the waiver
--   759 Surrey    surrey.ac.uk/.../international-excellence-award-postgraduate
--                   GBP 5,000 waiver at UG and PG, application based, panel decides
--                   deadlines 8 January 2027 (February entry) and 20 August 2027 (September)
--                   must be granted BEFORE a CAS is issued; first come first served
--                   long exclusion list including the MBA and several science Masters
--                   cannot be combined with the alumni or early bird discount; not deferrable
--                   CORRECTION: the row used to claim Surrey awards grade-band discounts; it
--                      does not, this award is a flat GBP 5,000 decided by a panel
--   769 York      york.ac.uk/.../dean-global-excellence-scholarship
--                   full tuition in year one plus GBP 10,000 in years two and three
--                   six awards a year, no application, the three faculty Deans select
--                   offer and overseas fee assessment by Wednesday 6 May 2026 (2026/27 closed)
--                   excluded: Hull York Medical School, International Pathway College, Kaplan
--                      International College London, distance/online, part-time, partnership
--                      and exchange routes including visiting students
--                   100% fee scholarship holders and fully sponsored applicants not eligible
--                   CORRECTION: this is the counter-example to the row's old claim that no UK
--                      university publishes a full-tuition undergraduate award
--   657 QMUL      qmul.ac.uk/international-students/tuitionfees/feesfinance/
--                   January 2027 PGT up to GBP 7,000; September 2027 UG up to GBP 20,000 and
--                      PGT up to GBP 8,000
--                   separate terms per school (business/economics/finance/commercial law versus
--                      medicine and dentistry) and per intake
--                   CORRECTION: the row used to warn about country-specific schemes; the real
--                      structure is school plus intake
--
-- FAILED: both Lancaster URLs (lancaster-global-scholarship-masters and
-- ug-lancaster-global-scholarship) returned 404, so row 614 was left unchanged.
--
-- Long prose fields are reproduced in docs/SCHOLARSHIP_REWRITE_PASS_84_2026-10-23.md.

BEGIN;

-- 550 Cardiff University
UPDATE scholarships SET
  degree_levels = '["Bachelor''s","Master''s"]',
  coverage_type = 'Partial Tuition',
  amount_usd_value = 0, award_amount = 10000, award_currency = 'GBP',
  award_period = 'one_time', award_basis = 'range',
  deadline = '2 April 2027 at 23:59 UK time - the application deadline for the Undergraduate International Excellence Scholarship for September 2027 entry; the postgraduate awards are automatic on offer acceptance and deposit payment',
  deadline_date = '2027-04-02', deadline_type = 'fixed',
  deadline_range_start = NULL, deadline_range_end = NULL,
  website_url = 'https://www.cardiff.ac.uk/study/international/funding-and-fees/international-scholarships',
  source_url = 'https://www.cardiff.ac.uk/study/international/funding-and-fees/international-scholarships',
  application_url = 'https://www.cardiff.ac.uk/study/international/funding-and-fees/international-scholarships/undergraduate-excellence-scholarships',
  recurrence = 'annual', application_status = 'open',
  last_verified_at = NOW(), last_updated_at = NOW(),
  verification_status = 'verified', source_reliability = 10
WHERE id = 550;

-- 720 University of Aberdeen
UPDATE scholarships SET
  degree_levels = '["Bachelor''s","Master''s"]',
  coverage_type = 'Partial Tuition',
  amount_usd_value = 0, award_amount = 8000, award_currency = 'GBP',
  award_period = 'one_time', award_basis = 'fixed',
  deadline = 'Available until further notice - the postgraduate award requires no application and is applied automatically and reflected on the CAS',
  deadline_date = NULL, deadline_type = 'rolling',
  deadline_range_start = NULL, deadline_range_end = NULL,
  website_url = 'https://www.abdn.ac.uk/study/funding/644/',
  source_url = 'https://www.abdn.ac.uk/study/funding/644/',
  application_url = 'https://www.abdn.ac.uk/study/postgraduate-taught/',
  recurrence = 'annual', application_status = 'open',
  last_verified_at = NOW(), last_updated_at = NOW(),
  verification_status = 'verified', source_reliability = 10
WHERE id = 720;

-- 759 University of Surrey
UPDATE scholarships SET
  degree_levels = '["Bachelor''s","Master''s"]',
  coverage_type = 'Partial Tuition',
  amount_usd_value = 0, award_amount = 5000, award_currency = 'GBP',
  award_period = 'one_time', award_basis = 'fixed',
  deadline = '8 January 2027 for February 2027 entry and 20 August 2027 for September 2027 entry, and the award must be granted before a CAS is issued',
  deadline_date = '2027-08-20', deadline_type = 'range',
  deadline_range_start = '2027-01-08', deadline_range_end = '2027-08-20',
  website_url = 'https://www.surrey.ac.uk/fees-and-funding/scholarships-and-bursaries/international-excellence-award-postgraduate',
  source_url = 'https://www.surrey.ac.uk/fees-and-funding/scholarships-and-bursaries/international-excellence-award-postgraduate',
  application_url = 'https://www.surrey.ac.uk/fees-and-funding/scholarships-and-bursaries',
  recurrence = 'annual', application_status = 'open',
  last_verified_at = NOW(), last_updated_at = NOW(),
  verification_status = 'verified', source_reliability = 10
WHERE id = 759;

-- 769 University of York
UPDATE scholarships SET
  degree_levels = '["Bachelor''s"]',
  coverage_type = 'Full Tuition',
  amount_usd_value = 0, award_amount = NULL, award_currency = 'GBP',
  award_period = 'year', award_basis = 'variable',
  deadline = '6 May 2026 - the date by which an applicant had to hold a conditional or unconditional offer at the overseas fee rate to be considered for the 2026/27 award, which has now closed',
  deadline_date = NULL, deadline_type = 'annual',
  deadline_range_start = NULL, deadline_range_end = NULL,
  website_url = 'https://www.york.ac.uk/study/undergraduate/fees-funding/international/scholarships/dean-global-excellence-scholarship/',
  source_url = 'https://www.york.ac.uk/study/undergraduate/fees-funding/international/scholarships/dean-global-excellence-scholarship/',
  application_url = 'https://www.york.ac.uk/study/undergraduate/fees-funding/international/scholarships/',
  recurrence = 'annual', application_status = 'closed',
  last_verified_at = NOW(), last_updated_at = NOW(),
  verification_status = 'verified', source_reliability = 10
WHERE id = 769;

-- 657 Queen Mary University of London
UPDATE scholarships SET
  degree_levels = '["Bachelor''s","Master''s"]',
  coverage_type = 'Partial Tuition',
  amount_usd_value = 0, award_amount = 8000, award_currency = 'GBP',
  award_period = 'one_time', award_basis = 'range',
  deadline = 'Per scheme and intake: the January 2027 postgraduate awards apply to that intake, and the September 2027 round offers undergraduate awards of up to GBP 20,000 and postgraduate taught awards of up to GBP 8,000',
  deadline_date = NULL, deadline_type = 'not_published',
  deadline_range_start = NULL, deadline_range_end = NULL,
  website_url = 'https://www.qmul.ac.uk/international-students/tuitionfees/feesfinance/',
  source_url = 'https://www.qmul.ac.uk/international-students/tuitionfees/feesfinance/',
  application_url = 'https://www.qmul.ac.uk/scholarships/',
  recurrence = 'annual', application_status = 'open',
  last_verified_at = NOW(), last_updated_at = NOW(),
  verification_status = 'verified', source_reliability = 9
WHERE id = 657;

COMMIT;

-- Verification: expect 38.
--   SELECT COUNT(*) FROM scholarships WHERE is_active AND website_url ~ '^https?://(www\.)?[^/]+/?$';
