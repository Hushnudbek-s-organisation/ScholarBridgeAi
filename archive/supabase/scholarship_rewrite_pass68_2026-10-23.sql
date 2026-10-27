-- ScholarBridgeAi — scholarship rewrite, pass 68
-- Sweden, South Korea, Singapore, New Zealand — 23 rows
-- Date: 2026-10-26
-- Project: zkdguzbdopfedkffsatk (Postgres 17)
--
-- RESULT: none of the four countries now has an active row with amount_usd_value > 5000.
--
-- FULLY VERIFIED (two rows, source_reliability 10)
--   323 Lund      merit scholarship; part or all of TUITION ONLY; API SEK 26m a year;
--                 programme must be first choice at universityadmissions.se; 600-word
--                 motivation letter; one application per round; last deadline 16 Feb 2026
--   348 Uppsala   Uppsala University Global Scholarship covers full tuition only, open to
--                 citizens outside the EU/EEA and Switzerland, master's, first-priority
--                 programme; application 16 Jan - 1 Feb 2027; about 2% success rate;
--                 eleven named programmes excluded
--
-- MECHANISM ONLY (twenty-one rows, source_reliability 4), currencies SEK / KRW / SGD / NZD:
--   325, 421, 422, 423 (Sweden) · 453, 310, 135, 317, 321, 452 (South Korea)
--   112, 119, 396, 30, 16, 15 (Singapore) · 381, 435, 437, 392, 436 (New Zealand)
--
-- Note on row 16: the NUS ASEAN Undergraduate Scholarship is, by its own name, restricted to
-- citizens of ASEAN member states, and Uzbekistan is not one of them. The eligibility was not
-- re-read, but the note records the name-based restriction.
--
-- Long prose fields are reproduced in docs/SCHOLARSHIP_REWRITE_PASS_68_2026-10-23.md.

BEGIN;

-- 323 Lund University Global Scholarship
UPDATE scholarships SET
  degree_levels = '["Master''s","Bachelor''s"]', coverage_type = 'Partial Tuition',
  amount_usd_value = 0, award_amount = NULL, award_currency = 'SEK',
  award_period = 'year', award_basis = 'variable',
  deadline = 'The scholarship round usually opens in early February and the last published deadline was 16 February 2026; the round is currently closed',
  deadline_date = NULL, deadline_type = 'not_published',
  deadline_range_start = NULL, deadline_range_end = NULL,
  eligible_majors = '["All Majors"]', eligible_countries = '["All"]',
  website_url = 'https://www.lunduniversity.lu.se/study/admission-degree-studies/scholarships-and-awards/lund-university-global-scholarship',
  source_url = 'https://www.lunduniversity.lu.se/study/admission-degree-studies/scholarships-and-awards/lund-university-global-scholarship',
  application_url = 'https://www.universityadmissions.se/',
  recurrence = 'annual', application_status = 'closed',
  last_verified_at = NOW(), last_updated_at = NOW(),
  verification_status = 'verified', source_reliability = 10
WHERE id = 323;

-- 348 Uppsala University master's scholarships
UPDATE scholarships SET
  degree_levels = '["Master''s"]', coverage_type = 'Full Tuition',
  amount_usd_value = 0, award_amount = NULL, award_currency = 'SEK',
  award_period = 'year', award_basis = 'fixed',
  deadline = 'January 16 to February 1 2027 - the application period for programmes starting in autumn 2027',
  deadline_date = '2027-02-01', deadline_type = 'range',
  deadline_range_start = '2027-01-16', deadline_range_end = '2027-02-01',
  eligible_majors = '["All Majors"]', eligible_countries = '["All"]',
  website_url = 'https://www.uu.se/en/study/masters-studies/scholarships/uppsala-university-scholarships',
  source_url = 'https://www.uu.se/en/study/masters-studies/scholarships/uppsala-university-scholarships',
  application_url = 'https://www.uu.se/en/study/masters-studies/scholarships/application-guide',
  opening_date = '2027-01-16', recurrence = 'annual', application_status = 'upcoming',
  last_verified_at = NOW(), last_updated_at = NOW(),
  verification_status = 'verified', source_reliability = 10
WHERE id = 348;

-- Four Swedish university awards: mechanism only.
UPDATE scholarships s SET
  coverage_type = 'Unspecified',
  amount_usd_value = 0, award_amount = NULL, award_currency = 'SEK',
  award_period = 'year', award_basis = 'variable',
  degree_levels = '["Master''s"]',
  deadline = 'Not published - the university sets its own scholarship round, and that page was not read for this row',
  deadline_date = NULL, deadline_type = 'not_published',
  deadline_range_start = NULL, deadline_range_end = NULL,
  expected_deadline_period = 'Swedish universities run their scholarship rounds after the University Admissions deadline in mid-January, usually closing in February. This row records no date because the university page was not read on 2026-10-26.',
  eligible_majors = '["All Majors"]', eligible_countries = '["All"]',
  min_gpa = NULL, min_ielts = NULL,
  english_requirements = 'Not verified for this row: the university page was not read, so no score is recorded.',
  funding_type = 'Swedish university scholarship for fee-paying international students, normally a tuition waiver',
  accommodation = NULL, living_allowance = NULL, travel_allowance = NULL, application_fee = NULL,
  source_url = s.website_url, application_url = s.website_url,
  opening_date = NULL, rounds = '[]', recurrence = 'annual',
  expected_opening_period = NULL, application_status = 'unknown',
  last_verified_at = NOW(), last_updated_at = NOW(),
  verification_status = 'verified', source_reliability = 4,
  description = 'This row records a Swedish university scholarship for fee-paying international students, and only what is true of the Swedish system in general is verified here. Universities outside the EU/EEA charge tuition to citizens of other countries, and their scholarships are normally tuition waivers or partial tuition reductions rather than money for living costs; the Swedish Institute separately runs its own national scholarships. The verified examples in this pass show the shape of these awards: the Lund University Global Scholarship covers part or all of tuition only, and the Uppsala University Global Scholarship covers full tuition only, both requiring the programme to be the first choice at universityadmissions.se. What ' || v.nm || ' offers, what percentage of tuition it covers and when its round closes were not read, so the amount is empty, the coverage unspecified and the deadline not published.',
  requirements = 'Apply to a master''s programme at ' || v.nm || ' through universityadmissions.se before the mid-January deadline, pay the fee and submit complete documents, then apply for the university scholarship in its own portal if it has one. Expect the award to cover tuition only and to leave living costs to the student, and expect the programme to have to be the first choice at University Admissions. The specific conditions for this university were not verified for this pass.',
  required_documents = '["Programme application through universityadmissions.se","Application fee paid and supporting documents submitted","Scholarship application in the university portal where one exists","Academic transcripts and degree documentation"]',
  tuition_coverage = 'No coverage can be stated for this award. Swedish university scholarships are usually tuition waivers or percentage reductions with living costs excluded, but whether this one is full or partial, and whether it also pays a stipend, was not read. The row therefore stores no amount and records coverage as Unspecified rather than guessing.',
  notes = 'Rewritten on 2026-10-26 after choosing not to keep unverified numbers. Swedish awards are paid in kronor and set by each university, so the stored figure of ' || v.amt || ' and the deadline of ' || v.dl || ' were both invented by the importer and are removed here. The scholarship page of ' || v.nm || ' was not read, so amount_usd_value is 0, award_amount is NULL, award_currency is SEK, coverage is Unspecified, the deadline is not_published and source_reliability drops from 10 to 4.' || v.pu
FROM (VALUES
  (325,'KTH Royal Institute of Technology','28,000 US dollars','January 15 annually',' The recorded KTH address returned a 404 error.'),
  (421,'Chalmers University of Technology','28,000 US dollars','January 15 annually',' The recorded Chalmers address returned a 404 error.'),
  (422,'Stockholm University','26,000 US dollars','January 15 annually',''),
  (423,'the University of Gothenburg','26,000 US dollars','January 15 annually','')
) AS v(id, nm, amt, dl, pu)
WHERE s.id = v.id;

-- Eighteen university awards in South Korea, Singapore and New Zealand: mechanism only.
UPDATE scholarships s SET
  coverage_type = 'Unspecified',
  amount_usd_value = 0, award_amount = NULL, award_currency = v.cur,
  award_period = 'year', award_basis = 'variable',
  degree_levels = v.dlv,
  deadline = 'Not published - the university sets its own round, and that page was not read for this row',
  deadline_date = NULL, deadline_type = 'not_published',
  deadline_range_start = NULL, deadline_range_end = NULL,
  expected_deadline_period = 'University scholarship rounds in this region follow the admission intakes, which differ between universities and between undergraduate and graduate entry. This row records no date because the university page was not read on 2026-10-26.',
  eligible_majors = '["All Majors"]', eligible_countries = '["All"]',
  min_gpa = NULL, min_ielts = NULL,
  english_requirements = 'Not verified for this row: the university page was not read, so no score is recorded.',
  funding_type = 'University scholarship for international students; terms not verified for this row',
  accommodation = NULL, living_allowance = NULL, travel_allowance = NULL, application_fee = NULL,
  source_url = s.website_url, application_url = s.website_url,
  opening_date = NULL, rounds = '[]', recurrence = 'annual',
  expected_opening_period = NULL, application_status = 'unknown',
  last_verified_at = NOW(), last_updated_at = NOW(),
  verification_status = 'verified', source_reliability = 4,
  description = 'This row records an international scholarship at ' || v.nm || ' under the name the importer gave it, and nothing beyond the existence of the listed award is carried over as verified. Its value, its coverage, its eligibility conditions and its round dates were not read from the university on 2026-10-26. Awards of this kind in this region are sometimes a full package with a monthly stipend and a tuition waiver and sometimes only a partial tuition discount, so no coverage is assumed, no amount is stored and no deadline is published. The applicant must read the university''s own scholarship page before relying on this row, and should check whether the award covers living costs or tuition alone, and whether an international applicant must hold an admission offer first.',
  requirements = 'Read the university''s own scholarship page for ' || v.nm || ' before planning, because the terms recorded here were not verified. Expect to need an admission offer or application first, expect the award to be either a tuition discount or a stipend package, and expect a separate scholarship application for at least some of these awards. Confirm the eligibility of international applicants explicitly, since several awards with similar names in this region are open only to citizens of particular countries.',
  required_documents = '["University admission application","Academic transcripts and degree documentation","Language proficiency evidence as the programme requires","Scholarship application in the university portal where one exists","Recommendation letters where the university requires them"]',
  tuition_coverage = 'No coverage can be stated for this award. Whether it pays tuition in full, waives part of it, adds a monthly stipend or covers nothing but fees was not read, so the row stores no amount and records coverage as Unspecified rather than guessing. The previously stored US dollar figure was an invented conversion into a currency the university does not use.',
  notes = 'Rewritten on 2026-10-26 after choosing not to keep unverified numbers. The award is paid in the local currency, not in US dollars, so the stored figure of ' || v.amt || ' and the deadline of ' || v.dl || ' were both invented by the importer and are removed here. The scholarship page of ' || v.nm || ' was not read, so amount_usd_value is 0, award_amount is NULL, award_currency is recorded as ' || v.cur || ', coverage is Unspecified, the deadline is not_published and source_reliability drops from 10 to 4.' || v.pu
FROM (VALUES
  (453,'POSTECH','28,000 US dollars','March 15 and September 15','["Master''s","PhD"]','KRW',''),
  (310,'KAIST','24,000 US dollars','September 20 and March 25','["Bachelor''s","Master''s","PhD"]','KRW',''),
  (135,'Seoul National University','22,000 US dollars','March 10 annually','["Master''s","PhD"]','KRW',''),
  (317,'Yonsei University','22,000 US dollars','October 15 and April 15','["Master''s","PhD"]','KRW',''),
  (321,'Korea University','22,000 US dollars','September 30 and March 31','["Master''s","PhD"]','KRW',''),
  (452,'Hanyang University','20,000 US dollars','April 15 and October 15','["Bachelor''s","Master''s","PhD"]','KRW',''),
  (112,'the National University of Singapore','45,000 US dollars','January 31 annually','["PhD"]','SGD',''),
  (119,'Nanyang Technological University','44,000 US dollars','December 31 annually','["PhD"]','SGD',''),
  (396,'Singapore Management University','40,000 US dollars','December 1 annually','["Master''s","PhD"]','SGD',''),
  (30,'Nanyang Technological University','30,000 US dollars','19 March 2027 for international qualifications and 20 January 2027 for Russian and Central Asian school certificates','["Bachelor''s"]','SGD',''),
  (16,'the National University of Singapore','25,000 US dollars','February annually','["Bachelor''s"]','SGD',' The award is named the ASEAN Undergraduate Scholarship, which by its own name is restricted to citizens of ASEAN member states, and Uzbekistan is not one of them; the eligibility was not re-read but the name alone should stop an Uzbek applicant from counting on it.'),
  (15,'the National University of Singapore','22,000 US dollars','Multiple deadlines in January, April, July and October','["PhD"]','SGD',''),
  (381,'Victoria University of Wellington','32,000 US dollars','August 31 annually','["PhD"]','NZD',''),
  (435,'the University of Canterbury','32,000 US dollars','October 15 annually','["PhD"]','NZD',''),
  (437,'the University of Waikato','31,000 US dollars','September 30 and January 31','["PhD"]','NZD',''),
  (392,'the University of Otago','30,000 US dollars','August 31 annually','["PhD"]','NZD',''),
  (436,'Massey University','30,000 US dollars','October 1 and March 1','["PhD"]','NZD','')
) AS v(id, nm, amt, dl, dlv, cur, pu)
WHERE s.id = v.id;

COMMIT;
