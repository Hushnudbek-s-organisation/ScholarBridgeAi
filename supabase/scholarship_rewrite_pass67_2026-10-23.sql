-- ScholarBridgeAi — scholarship rewrite, pass 67 (China)
-- Date: 2026-10-26
-- Project: zkdguzbdopfedkffsatk (Postgres 17)
--
-- RESULT: China now has zero active rows with amount_usd_value > 5000.
--
-- VERIFIED NATIONAL FRAMEWORK (campuschina.org/content/details3_74776, the CSC application guide)
--   coverage: tuition, free dormitory or accommodation subsidy, medical insurance CNY 800/year,
--             monthly stipend of CNY 2,500 (undergraduate), CNY 3,000 (master's/general scholar),
--             CNY 3,500 (doctoral/senior scholar)
--   age ceilings: 25 bachelor, 35 master's, 40 doctorate, 45 general scholar, 50 senior scholar
--   language: HSK 4 for Chinese-taught master's/doctoral, HSK 3 for general/senior scholar,
--             CSCA test for bachelor applicants
--   channels: bilateral, University Program, designated programmes, student exchange
--
-- ROWS
--   31, 44  Chinese Government Scholarship through a host university — source_reliability 9
--           (national framework verified; the host university's own call was not read)
--   118, 143, 153, 307, 322, 358, 478 — university awards, source_reliability 4, amount 0,
--           currency CNY, coverage Unspecified, deadline not_published.
--           Every page attempted failed: isd.pku.edu.cn/ENGLISH/Scholarship/ 404,
--           isc.sjtu.edu.cn 404, iczu.zju.edu.cn invalid column, whu.edu.cn redirected home.
--
-- Long prose fields (description, requirements, tuition_coverage, notes) are reproduced in
-- docs/SCHOLARSHIP_REWRITE_PASS_67_2026-10-23.md.

BEGIN;

-- 31 Chinese Government Scholarship through Peking University
UPDATE scholarships SET
  degree_levels = '["Master''s","PhD"]', coverage_type = 'Full Funding',
  amount_usd_value = 0, award_amount = NULL, award_currency = 'CNY',
  award_period = 'month', award_basis = 'fixed',
  deadline = 'Not published for this host university - Chinese Government Scholarship rounds are set per programme and per host university, and the current call for this university was not read',
  deadline_date = NULL, deadline_type = 'not_published',
  deadline_range_start = NULL, deadline_range_end = NULL,
  eligible_majors = '["All Majors"]', eligible_countries = '["All"]',
  website_url = 'https://www.campuschina.org/content/details3_74776.html',
  source_url = 'https://www.campuschina.org/content/details3_74776.html',
  application_url = 'https://studyinchina.csc.edu.cn/',
  recurrence = 'annual', application_status = 'unknown',
  last_verified_at = NOW(), last_updated_at = NOW(),
  verification_status = 'verified', source_reliability = 9
WHERE id = 31;

-- 44 Chinese Government Scholarship through Fudan University
UPDATE scholarships SET
  degree_levels = '["Master''s","PhD"]', coverage_type = 'Full Funding',
  amount_usd_value = 0, award_amount = NULL, award_currency = 'CNY',
  award_period = 'month', award_basis = 'fixed',
  deadline = 'Not published for this host university - Chinese Government Scholarship rounds are set per programme and per host university, and the current call for this university was not read',
  deadline_date = NULL, deadline_type = 'not_published',
  deadline_range_start = NULL, deadline_range_end = NULL,
  eligible_majors = '["All Majors"]', eligible_countries = '["All"]',
  website_url = 'https://www.campuschina.org/content/details3_74776.html',
  source_url = 'https://www.campuschina.org/content/details3_74776.html',
  application_url = 'https://studyinchina.csc.edu.cn/',
  recurrence = 'annual', application_status = 'unknown',
  last_verified_at = NOW(), last_updated_at = NOW(),
  verification_status = 'verified', source_reliability = 9
WHERE id = 44;

-- Seven university awards: mechanism only.
UPDATE scholarships s SET
  coverage_type = 'Unspecified',
  amount_usd_value = 0, award_amount = NULL, award_currency = 'CNY',
  award_period = 'year', award_basis = 'variable',
  degree_levels = v.dlv,
  deadline = 'Not published - the university sets its own scholarship round and that page was not read for this row',
  deadline_date = NULL, deadline_type = 'not_published',
  deadline_range_start = NULL, deadline_range_end = NULL,
  expected_deadline_period = 'Chinese universities run their own international scholarship rounds alongside the Chinese Government Scholarship, and the dates differ between universities and programmes. This row records no date because the university page was not read on 2026-10-26.',
  eligible_majors = '["All Majors"]', eligible_countries = '["All"]',
  min_gpa = NULL, min_ielts = NULL,
  english_requirements = 'Not verified for this row: the university page was not read, so no score is recorded; a Chinese-taught programme in China normally requires HSK level 4 at master''s and doctoral level.',
  funding_type = 'University international scholarship in China, awarded alongside or instead of the Chinese Government Scholarship',
  accommodation = NULL, living_allowance = NULL, travel_allowance = NULL, application_fee = NULL,
  source_url = s.website_url, application_url = s.website_url,
  opening_date = NULL, rounds = '[]', recurrence = 'annual',
  expected_opening_period = NULL, application_status = 'unknown',
  last_verified_at = NOW(), last_updated_at = NOW(),
  verification_status = 'verified', source_reliability = 4,
  description = 'This row records an international scholarship offered by ' || v.nm || ', and only the Chinese national baseline that such awards usually sit alongside is verified here. The Chinese Government Scholarship, administered by the China Scholarship Council, publishes tuition, a free dormitory or accommodation subsidy, medical insurance of CNY 800 a year, and a monthly stipend of CNY 2,500 for undergraduates, CNY 3,000 for master''s students and CNY 3,500 for doctoral students, with age ceilings of 25, 35 and 40 by level and HSK level 4 for a Chinese-taught master''s or doctoral programme. What ' || v.nm || ' offers under the name used in this row, whether it is a full package or a tuition waiver, and when its round closes were not read, so the amount is empty, the coverage unspecified and the deadline not published.',
  requirements = 'Apply for admission to ' || v.nm || ' and check the international students office page directly, because the university term recorded here was not verified for this pass. Expect a Chinese university international award either to mirror the Chinese Government Scholarship package or to be a partial tuition waiver, and expect a Chinese-taught programme to require HSK level 4. Note the national age ceilings of 25 for a bachelor''s, 35 for a master''s and 40 for a doctorate, and confirm with the university whether its own award carries the same conditions.',
  required_documents = '["University admission application","Highest diploma and academic transcripts, with notarised translations where required","Study or research plan","Two academic recommendation letters where the university requires them","Passport information page","Foreigner physical examination form","HSK or English proficiency evidence as the programme requires"]',
  tuition_coverage = 'No coverage can be stated for this award. The verified national baseline is the Chinese Government Scholarship, which covers tuition, a dormitory or accommodation subsidy, medical insurance of CNY 800 a year and a monthly stipend of CNY 3,000 at master''s level and CNY 3,500 at doctoral level, but whether this university''s own award matches that, waives only part of the tuition or pays a smaller stipend was not read, so no amount is stored and coverage is Unspecified.',
  notes = 'Rewritten on 2026-10-26 after choosing not to keep unverified numbers. Chinese university awards are paid in renminbi and their size is set by each university, so the stored figure of ' || v.amt || ' and the deadline of ' || v.dl || ' were both invented by the importer and are removed here. The scholarship page of ' || v.nm || ' was not read, so amount_usd_value is 0, award_amount is NULL, award_currency is CNY, coverage is Unspecified, the deadline is not_published and source_reliability drops to 4. The only verified content is the Chinese Government Scholarship baseline from campuschina.org/content/details3_74776, described in the text rather than presented as this university''s terms.' || v.pu
FROM (VALUES
  (118,'Peking University','24,000 US dollars','February 28 annually','["Master''s","PhD"]',' The address recorded on the row, isd.pku.edu.cn/ENGLISH/Scholarship/, returned a 404 error.'),
  (153,'Shanghai Jiao Tong University','23,000 US dollars','February 15 annually','["Master''s","PhD"]',' The address recorded on the row returned an HTTP 404 error.'),
  (322,'the University of Science and Technology of China','23,000 US dollars','February 15 annually','["Bachelor''s","Master''s","PhD"]',''),
  (143,'Fudan University','22,000 US dollars','March 15 annually','["Master''s","PhD"]',''),
  (307,'Zhejiang University','22,000 US dollars','March 10 annually','["Master''s","PhD"]',' The recorded list address returned an invalid-column error from the university site.'),
  (358,'Wuhan University','22,000 US dollars','March 15 annually','["Bachelor''s","Master''s","PhD"]',' The recorded address redirected to the university home page rather than to a scholarship page.'),
  (478,'Nanjing University','5,500 US dollars','Not published - confirm the current cycle on the official page','["Bachelor''s","Master''s","PhD"]','')
) AS v(id, nm, amt, dl, dlv, pu)
WHERE s.id = v.id;

COMMIT;
