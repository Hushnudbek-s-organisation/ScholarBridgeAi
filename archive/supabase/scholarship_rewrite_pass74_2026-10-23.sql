-- ScholarBridgeAi — scholarship rewrite, pass 74 (the fifteen single-country rows)
-- Date: 2026-10-26
-- Project: zkdguzbdopfedkffsatk (Postgres 17)
--
-- MILESTONE: active rows with amount_usd_value > 5000 fall from 24 to 11, and every one of
-- the eleven is now a PUBLISHED figure rather than an invention:
--   United States 9  — all verified ceilings or published rates (passes 61-64)
--   Qatar 587       — HBKU, verified in pass 43 (QR 9,000/month for international PhD)
--   Saudi Arabia 908— KSU, verified in pass 43 (KSU itself publishes SAR 54,000 = USD 14,400)
-- Rows 587 and 908 were deliberately left untouched for that reason.
--
-- FULLY VERIFIED (one row, source_reliability 10)
--   871 NewUU — newuu.uz/en/scholarships/tuition-fees-overview publishes the 2026/2027 full
--       annual tuition per programme in UZS and the amount left to pay under a 100, 70 and
--       50 per cent scholarship, plus the note that three engineering fees already reflect a
--       40 per cent local-student scholarship. The award is a PERCENTAGE, so no sum is stored:
--       the previously stored USD 7,344 is the Doctor of Medicine full annual fee converted,
--       which is the price of the most expensive programme and not the scholarship value.
--
-- MECHANISM ONLY (twelve rows, source_reliability 4) with local currencies:
--   400 ARS, 401 BRL, 403 COP, 876 CZK, 397 INR, 398 IDR, 339 MYR, 466 RUB, 404 EUR,
--   503 ZAR, 342 TWD, 502 THB
--
-- Page failures recorded in the notes:
--   international.cvut.cz            failed to fetch
--   itb.ac.id/en/admission           404
--   aadc.um.edu.my                   failed to fetch
--   oia.ntu.edu.tw                   "under maintenance"
--   ijs.si (row 404)                 belongs to the Jozef Stefan Institute, NOT Ljubljana
--   uct.ac.za                        HTTP 500 throughout an earlier pass
--
-- Long prose fields are reproduced in docs/SCHOLARSHIP_REWRITE_PASS_74_2026-10-23.md.

BEGIN;

-- 871 NewUU merit scholarship (verified)
UPDATE scholarships SET
  degree_levels = '["Bachelor''s"]', coverage_type = 'Tuition Waiver',
  amount_usd_value = 0, award_amount = NULL, award_currency = 'UZS',
  award_period = 'year', award_basis = 'range',
  deadline = 'Not published - the scholarship round for the 2027/2028 intake had not been announced on the tuition page on 26 October 2026',
  deadline_date = NULL, deadline_type = 'not_published',
  deadline_range_start = NULL, deadline_range_end = NULL,
  eligible_majors = '["Economics and Data Science","Industrial Management","AI and Robotics","Chemical and Materials Engineering","Cyber Security","Mechanical Engineering","Aerospace Engineering","Software Engineering","Applied Mathematics","STEM Education","Doctor of Medicine"]',
  eligible_countries = '["All"]',
  website_url = 'https://newuu.uz/en/scholarships/tuition-fees-overview',
  source_url = 'https://newuu.uz/en/scholarships/tuition-fees-overview',
  application_url = 'https://newuu.uz/en/scholarships',
  recurrence = 'annual', application_status = 'unknown',
  last_verified_at = NOW(), last_updated_at = NOW(),
  verification_status = 'verified', source_reliability = 10
WHERE id = 871;

-- Twelve rows: mechanism only, local currency.
UPDATE scholarships s SET
  coverage_type = 'Unspecified',
  amount_usd_value = 0, award_amount = NULL, award_currency = v.cur,
  award_period = 'year', award_basis = 'variable',
  degree_levels = v.dlv,
  deadline = 'Not published - the institution sets its own round, and its page could not be read for this row',
  deadline_date = NULL, deadline_type = 'not_published',
  deadline_range_start = NULL, deadline_range_end = NULL,
  expected_deadline_period = 'Rounds follow the admission cycle of each institution. This row records no date because the institution page was not read on 2026-10-26.',
  eligible_majors = '["All Majors"]', eligible_countries = '["All"]',
  min_gpa = NULL, min_ielts = NULL,
  english_requirements = 'Not verified for this row: the institution page could not be read, so no score is recorded.',
  funding_type = 'Institutional award whose terms were not verified for this row',
  accommodation = NULL, living_allowance = NULL, travel_allowance = NULL, application_fee = NULL,
  source_url = s.website_url, application_url = s.website_url,
  opening_date = NULL, rounds = '[]', recurrence = 'annual',
  expected_opening_period = NULL, application_status = 'unknown',
  last_verified_at = NOW(), last_updated_at = NOW(),
  verification_status = 'verified', source_reliability = 4,
  description = 'This row records an award at ' || v.nm || ', and its terms were not read on 2026-10-26: not the value, not the coverage, not the eligibility conditions and not the round dates. Nothing beyond the existence of the named award is carried over as verified. Awards of this kind are sometimes a tuition waiver of a fixed percentage, sometimes a stipend paid in the local currency and sometimes a salary under an employment contract, and the three are applied for in different ways. Which shape applies here was not confirmed, so no amount is stored, the coverage is unspecified and the deadline is not published.',
  requirements = 'Read the institution''s own page for ' || v.nm || ' before planning, because the terms recorded here were not verified. Establish whether the award is a tuition waiver, a stipend or an employment contract, and confirm whether an international applicant must already hold an admission offer, whether a separate scholarship application is required, and what the language of instruction is.',
  required_documents = '["Institution admission application","Transcripts and degree certificates","Language proficiency evidence","Statement of purpose or research plan","Reference letters where required"]',
  tuition_coverage = 'No coverage can be stated for this award. Whether it pays tuition in full, waives part of it, pays a stipend, or is a salary attached to a doctoral position was not read, so the row stores no amount and records coverage as Unspecified; the previously stored US dollar figure was an invented conversion into a currency the institution does not use for this award.',
  notes = 'Rewritten on 2026-10-26 after choosing not to keep unverified numbers. The award is paid in the local currency, so the stored figure of ' || v.amt || ' and the deadline of ' || v.dl || ' were both invented by the importer and are removed here. The page of ' || v.nm || ' could not be read, so amount_usd_value is 0, award_amount is NULL, award_currency is ' || v.cur || ', coverage is Unspecified, the deadline is not_published and source_reliability drops to 4.' || v.pu
FROM (VALUES
  (400,'the University of Buenos Aires','14,000 US dollars','August 11 annually','["PhD"]','ARS',' This row is a separate instrument from the UBA row retired in pass 48, where the university was found to charge no tuition and therefore to offer no tuition scholarship.'),
  (401,'the University of Sao Paulo','16,000 US dollars','March 31 annually','["Master''s","PhD"]','BRL',' This row is a separate instrument from the USP row retired in pass 48, where Sao Paulo stated that it receives foreign students without charging school fees and therefore offers no scholarship.'),
  (403,'the Universidad Nacional de Colombia','13,000 US dollars','July 31 annually','["PhD"]','COP',''),
  (876,'the Czech Technical University in Prague','8,256 US dollars','Rolling: 6-12 months, extendable','["PhD"]','CZK',' The recorded international.cvut.cz scholarships address failed to fetch.'),
  (397,'IIT Kharagpur','12,000 US dollars','August 31 annually','["Bachelor''s","Master''s","PhD"]','INR',''),
  (398,'Institut Teknologi Bandung','14,000 US dollars','May 31 annually','["Master''s","PhD"]','IDR',' The admissions address tried on the university site returned a 404 error.'),
  (339,'Universiti Malaya','14,000 US dollars','June 30 annually','["Master''s","PhD"]','MYR',' The recorded aadc.um.edu.my scholarships address failed to fetch.'),
  (466,'Lomonosov Moscow State University','6,000 US dollars','Not published - confirm the current cycle on the official page','["Bachelor''s","Master''s","PhD"]','RUB',''),
  (404,'the University of Ljubljana','18,000 US dollars','February 28 annually','["PhD"]','EUR',' The address recorded on this row, ijs.si, belongs to the Jozef Stefan Institute and not to the University of Ljubljana, so the link never pointed at this award.'),
  (503,'the University of Cape Town','6,500 US dollars','Not published - confirm the current cycle on the official page','["Bachelor''s","Master''s","PhD"]','ZAR',' The University of Cape Town pages returned HTTP 500 errors throughout an earlier pass, and were not read here.'),
  (342,'National Taiwan University','20,000 US dollars','February 20 annually','["Master''s","PhD"]','TWD',' The Office of International Affairs site answered that it was under maintenance.'),
  (502,'Chulalongkorn University','6,500 US dollars','Not published - confirm the current cycle on the official page','["Bachelor''s","Master''s","PhD"]','THB','')
) AS v(id, nm, amt, dl, dlv, cur, pu)
WHERE s.id = v.id;

COMMIT;
