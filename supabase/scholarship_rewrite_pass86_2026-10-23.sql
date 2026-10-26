-- ScholarBridgeAi — scholarship rewrite, pass 86 (Indonesia KNB and Loughborough)
-- Date: 2026-10-26
-- Project: zkdguzbdopfedkffsatk (Postgres 17)
--
-- RESULT: bare-domain website_url falls from 36 to 35; source_reliability >= 9 rises by one.
--
-- 616 LOUGHBOROUGH — fully verified, reliability 10
--   lboro.ac.uk/study/undergraduate/fees-funding/scholarships/excellence-scholarships/
--     * GBP 3,000 towards tuition for each year of study, up to GBP 9,000 over a standard degree
--     * no separate application: automatic from the UCAS or OnCampus application
--     * typically AAA at A level, A*AA for MEng Aeronautical, MEng Automotive, MEng Mechanical,
--       MSci Natural Sciences and BSc Sport and Exercise Science
--     * grades at the first sitting, no resits
--     * not paid during a placement or study abroad year; not for students repeating a year
--     * self-funded only, and no other university award or external sponsorship
--     * not carried forward if the place is deferred
--     * alongside it: GBP 10,000 UG and PG Future Leaders Scholarships, GBP 6,000 international
--       Postgraduate Excellence Scholarship, and more than GBP 1 million a year invested in
--       international scholarships and bursaries
--
-- 579 KNB (Indonesia) — verified, reliability 9
--   knb.kemdiktisaintek.go.id
--     * 2026 cycle: applications 2 February to 31 March 2026, results 19 June, re-registration
--       by 26 June, replacement batches to a final confirmation deadline of 18 September 2026
--     * 47 host universities at bachelor's, master's and doctoral level
--     * 2,299 students and alumni from 107 countries since 2006; 200 awardees in the 2026 cycle
--     * two-arm application: an Indonesian embassy recommendation letter plus the online portal
--     * English thresholds TOEFL ITP 477, iBT 53, IELTS 5.5 or TOEIC 510, certificate within
--       two years
--     * five-minute YouTube video and a three-month medical report with infectious disease,
--       mental health and drug screening
--     * age limit of 21 for the bachelor's route
--     * declarations on marriage to an Indonesian citizen or another awardee, pregnancy and
--       military service
--     COVERAGE REDUCED TO Unspecified: the page describes the scheme as a financial aid programme
--     but does not publish the benefit schedule, and the programme guideline PDF was not opened.
--     The previous "Full Funding" label was an assumption, not a reading.
--
-- NOT CHANGED THIS PASS
--   734 Exeter — exeter.ac.uk/study/funding/award/index.php?id=3249 returned
--     "Sorry no information currently available", so the GBP 5,000 figure seen in a search
--     snippet could not be confirmed on the page and was not written.
--   868 Russian quota — education-in-russia.com/en returns 404 and the Russian home page carries
--     a programme catalogue but no benefit statement, so the row stays at reliability 4.

BEGIN;

UPDATE scholarships SET
  title = 'Loughborough University International Excellence Scholarships',
  provider = 'Loughborough University',
  degree_levels = '["Bachelor''s"]',
  coverage_type = 'Partial Tuition',
  amount_usd_value = 0, award_amount = 3000, award_currency = 'GBP',
  award_period = 'year', award_basis = 'fixed',
  deadline = 'No separate scholarship application - every applicant to an eligible undergraduate course is considered automatically from the UCAS or OnCampus application for September 2027 entry',
  deadline_date = NULL, deadline_type = 'automatic',
  deadline_range_start = NULL, deadline_range_end = NULL,
  website_url = 'https://www.lboro.ac.uk/study/undergraduate/fees-funding/scholarships/excellence-scholarships/',
  source_url = 'https://www.lboro.ac.uk/study/undergraduate/fees-funding/scholarships/excellence-scholarships/',
  application_url = 'https://www.lboro.ac.uk/study/undergraduate/fees-funding/scholarships/',
  recurrence = 'annual', application_status = 'open',
  last_verified_at = NOW(), last_updated_at = NOW(),
  verification_status = 'verified', source_reliability = 10
WHERE id = 616;

UPDATE scholarships SET
  title = 'KNB Scholarship (Kemitraan Negara Berkembang) — Indonesia',
  provider = 'Ministry of Higher Education, Science and Technology of the Republic of Indonesia',
  country = 'Indonesia',
  degree_levels = '["Bachelor''s","Master''s","PhD"]',
  coverage_type = 'Unspecified',
  amount_usd_value = 0, award_amount = NULL, award_currency = 'IDR',
  award_period = 'year', award_basis = 'variable',
  deadline = 'The 2026 round ran from 2 February to 31 March 2026 and the results were announced on 19 June 2026 with re-registration closing 26 June 2026; the 2027 dates had not been published when the page was read',
  deadline_date = NULL, deadline_type = 'annual',
  deadline_range_start = NULL, deadline_range_end = NULL,
  min_ielts = '5.5',
  website_url = 'https://knb.kemdiktisaintek.go.id/',
  source_url = 'https://knb.kemdiktisaintek.go.id/',
  application_url = 'https://knb.kemdiktisaintek.go.id/signup',
  recurrence = 'annual', application_status = 'closed',
  last_verified_at = NOW(), last_updated_at = NOW(),
  verification_status = 'verified', source_reliability = 9
WHERE id = 579;

COMMIT;
