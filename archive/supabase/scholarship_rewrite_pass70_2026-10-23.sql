-- ScholarBridgeAi — scholarship rewrite, pass 70 (Nordic cluster)
-- Denmark, Norway, Finland — 10 rows
-- Date: 2026-10-26
-- Project: zkdguzbdopfedkffsatk (Postgres 17)
--
-- RESULT: none of the three countries now has an active row with amount_usd_value > 5000.
--
-- THE STRUCTURAL ERROR IN THIS CLUSTER
-- Five rows presented doctoral study as a USD scholarship. In Norway and Denmark a PhD is a
-- salaried POSITION filled through a vacancy listing, with an employment contract, and no
-- tuition fee. Storing a dollar "scholarship" value for that is wrong twice over: the currency
-- is kroner and the instrument is a salary, not an award.
--
-- VERIFIED (one row, source_reliability 10)
--   425 NTNU — ntnu.edu/phd publishes: financing is an absolute requirement for admission;
--       funding may come from NTNU or other sources; funded positions are continuously posted
--       as vacancies; nominal duration three years, with a possible fourth year of required
--       duties (usually teaching) written into the employee contract; at least 30 ECTS of
--       coursework; thesis estimated at two and a half years; no tuition for doctoral study.
--
-- MECHANISM ONLY (nine rows, source_reliability 4): 414, 377, 413 (DKK) · 346, 424 (NOK) ·
--   353, 405, 504, 505 (EUR). Rows 504 and 505 describe percentage waivers (50%, 10-40%), so
--   the invented dollar figures there were not merely unverified but the wrong kind of number.
--
-- Long prose fields are reproduced in docs/SCHOLARSHIP_REWRITE_PASS_70_2026-10-23.md.

BEGIN;

-- 425 NTNU PhD positions
UPDATE scholarships SET
  degree_levels = '["PhD"]', coverage_type = 'Full Funding',
  amount_usd_value = 0, award_amount = NULL, award_currency = 'NOK',
  award_period = 'year', award_basis = 'variable',
  deadline = 'No single deadline - funded PhD positions are posted continuously as vacancies on the university vacancies page',
  deadline_date = NULL, deadline_type = 'rolling',
  deadline_range_start = NULL, deadline_range_end = NULL,
  expected_deadline_period = 'NTNU states that available PhD positions are continuously posted online, so there is no annual scholarship round: the operative date is the closing date of each advertised position.',
  eligible_majors = '["All Majors"]', eligible_countries = '["All"]',
  min_gpa = NULL, min_ielts = NULL,
  website_url = 'https://www.ntnu.edu/phd',
  source_url = 'https://www.ntnu.edu/phd',
  application_url = 'https://www.ntnu.edu/vacancies',
  recurrence = 'continuous', application_status = 'open',
  last_verified_at = NOW(), last_updated_at = NOW(),
  verification_status = 'verified', source_reliability = 10
WHERE id = 425;

-- Nine Nordic rows: mechanism only.
UPDATE scholarships s SET
  coverage_type = 'Unspecified',
  amount_usd_value = 0, award_amount = NULL, award_currency = v.cur,
  award_period = 'year', award_basis = 'variable',
  degree_levels = v.dlv,
  deadline = 'Not published - the university sets its own round, and that page was not read for this row',
  deadline_date = NULL, deadline_type = 'not_published',
  deadline_range_start = NULL, deadline_range_end = NULL,
  expected_deadline_period = 'Nordic rounds follow the admission intakes for master''s programmes and the advertised vacancies for doctoral positions, and they differ between institutions. This row records no date because the university page was not read on 2026-10-26.',
  eligible_majors = '["All Majors"]', eligible_countries = '["All"]',
  min_gpa = NULL, min_ielts = NULL,
  english_requirements = 'Not verified for this row: the university page was not read, so no score is recorded.',
  funding_type = 'Nordic funding route, either a salaried doctoral position or a master''s tuition scholarship; not verified for this row',
  accommodation = NULL, living_allowance = NULL, travel_allowance = NULL, application_fee = NULL,
  source_url = s.website_url, application_url = s.website_url,
  opening_date = NULL, rounds = '[]', recurrence = 'annual',
  expected_opening_period = NULL, application_status = 'unknown',
  last_verified_at = NOW(), last_updated_at = NOW(),
  verification_status = 'verified', source_reliability = 4,
  description = 'This row records the Nordic funding route at ' || v.nm || ', and the terms of the award named in this row were not read from the university on 2026-10-26. The Nordic model has two distinct shapes, and confusing them is the usual error: doctoral study is normally a salaried position advertised as a vacancy, as the NTNU pages verified in this pass describe, while master''s study for non-EU students carries a tuition fee that universities waive partly or wholly through named scholarships. The amounts are set by each institution and paid in Danish krone, Norwegian krone or euro rather than in US dollars. Which shape applies here, what the award is worth and when its round closes were not verified, so no amount is stored, the coverage is unspecified and the deadline is not published.',
  requirements = 'Establish first whether this row refers to a salaried doctoral position or to a master''s tuition scholarship, because the two are applied for in completely different ways: the position through the university vacancy listing, the scholarship through the master''s application. Then read the institution''s own page for ' || v.nm || ', since its terms were not verified for this pass. Expect a master''s award to cover tuition only or tuition plus a small grant, and expect living costs to remain the student''s responsibility.',
  required_documents = '["University application, either to an advertised doctoral position or to a master''s programme","Degree certificates and transcripts","Research plan for a doctoral position, or statement of purpose for a master''s","English proficiency evidence","Letters of recommendation where required"]',
  tuition_coverage = 'No coverage can be stated for this award. A Nordic doctoral position pays a salary and charges no tuition, while a master''s scholarship usually waives part or all of the non-EU tuition fee and rarely covers living costs, and which of those applies here was not read. The row therefore stores no amount and records coverage as Unspecified rather than guessing.',
  notes = 'Rewritten on 2026-10-26 after choosing not to keep unverified numbers. Nordic awards are set by each institution and paid in local currency, so the stored figure of ' || v.amt || ' and the deadline of ' || v.dl || ' were both invented by the importer and are removed here. The funding page of ' || v.nm || ' was not read for this row, so amount_usd_value is 0, award_amount is NULL, award_currency is ' || v.cur || ', coverage is Unspecified, the deadline is not_published and source_reliability drops to 4.' || v.pu
FROM (VALUES
  (414,'the Technical University of Denmark','55,000 US dollars','Rolling, varying by project','["PhD"]','DKK',''),
  (377,'the University of Copenhagen','48,000 US dollars','Rolling, four rounds a year','["PhD"]','DKK',''),
  (413,'Aarhus University','26,000 US dollars','January 15 annually','["Master''s"]','DKK',''),
  (353,'the University of Helsinki','22,000 US dollars','January 15 annually','["Master''s"]','EUR',' The recorded tuition-fee page returned a 404 error.'),
  (405,'Aalto University','18,000 US dollars','January 22 annually','["Master''s"]','EUR',''),
  (504,'the University of Turku','6,480 US dollars','Not published - confirm the current cycle on the official page','["Bachelor''s","Master''s"]','EUR',' The row describes a 50 per cent tuition waiver from the second year plus an early-bird discount, which is a percentage and not a sum.'),
  (505,'the University of Oulu','6,048 US dollars','Not published - confirm the current cycle on the official page','["Bachelor''s","Master''s"]','EUR',' The row describes a 10 to 40 per cent tuition waiver plus an early-bird discount, which is a percentage and not a sum.'),
  (346,'the University of Oslo','52,000 US dollars','Rolling annually','["PhD"]','NOK',''),
  (424,'the University of Bergen','52,000 US dollars','Rolling, varying by faculty','["PhD"]','NOK','')
) AS v(id, nm, amt, dl, dlv, cur, pu)
WHERE s.id = v.id;

COMMIT;
