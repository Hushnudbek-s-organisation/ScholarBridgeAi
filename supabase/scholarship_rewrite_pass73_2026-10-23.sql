-- ScholarBridgeAi — scholarship rewrite, pass 73 (Ireland, Mexico, Chile)
-- 6 rows: 345, 434 (Ireland) · 402, 343 (Mexico) · 467, 879 (Chile)
-- Date: 2026-10-26
-- Project: zkdguzbdopfedkffsatk (Postgres 17)
--
-- RESULT: none of the three countries now has an active row with amount_usd_value > 5000.
--
-- WHAT HAPPENED
--   tcd.ie/study/international/scholarships/Postgraduate/    HTTP 403 Forbidden
--   universityofgalway.ie/.../feesfunding/scholarships/      404
--   tec.mx/en/scholarships                                   404
--   UNAM and UC Chile                                        not read
-- Nothing could be verified, so all six rows go to source_reliability = 4 with amount 0,
-- award_amount NULL, the local currency, coverage Unspecified and deadline not_published.
--
-- TWO NOTES WORTH KEEPING
--   Row 879's own title says it is a tuition scholarship for EXCHANGE students under CINDA and
--   Latin American Catholic university agreements, so a degree-seeking applicant from
--   Uzbekistan cannot use it. The restriction comes from the award name and was not re-read.
--   Row 343 (UNAM international postgraduate) is a DIFFERENT instrument from row 707 (UNAM
--   postgraduate scholarship verified through becas.unam.mx). Its note warns that 707's
--   figures must not be copied into it.
--
-- Long prose fields are reproduced in docs/SCHOLARSHIP_REWRITE_PASS_73_2026-10-23.md.

BEGIN;

UPDATE scholarships s SET
  coverage_type = 'Unspecified',
  amount_usd_value = 0, award_amount = NULL, award_currency = v.cur,
  award_period = 'year', award_basis = 'variable',
  degree_levels = v.dlv,
  deadline = 'Not published - the institution sets its own round, and its page could not be read for this row',
  deadline_date = NULL, deadline_type = 'not_published',
  deadline_range_start = NULL, deadline_range_end = NULL,
  expected_deadline_period = 'Rounds in this country follow the admission cycle of each institution. This row records no date because the institution page was not read on 2026-10-26.',
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
  description = 'This row records an award at ' || v.nm || ', and its terms were not read on 2026-10-26: not the value, not the coverage, not the eligibility conditions and not the round dates. Nothing beyond the existence of the named award is carried over as verified. Awards of this kind in this country are sometimes a tuition waiver of a fixed percentage, sometimes a partial scholarship paid in the local currency and sometimes a full package with a stipend, and the three are applied for in different ways. Which shape applies here was not confirmed, so no amount is stored, the coverage is unspecified and the deadline is not published.',
  requirements = 'Read the institution''s own page for ' || v.nm || ' before planning, because the terms recorded here were not verified. Establish whether the award is a tuition waiver, a cash scholarship or a full package, and confirm whether an international applicant must already hold an admission offer, whether a separate scholarship application is required, and what the language of instruction is.',
  required_documents = '["Institution admission application","Transcripts and degree certificates","Language proficiency evidence","Statement of purpose or research plan","Reference letters where required"]',
  tuition_coverage = 'No coverage can be stated for this award. Whether it pays tuition in full, waives part of it, pays a cash sum or covers nothing but fees was not read, so the row stores no amount and records coverage as Unspecified; the previously stored US dollar figure was an invented conversion into a currency the institution does not use for this award.',
  notes = 'Rewritten on 2026-10-26 after choosing not to keep unverified numbers. The award is paid in the local currency, so the stored figure of ' || v.amt || ' and the deadline of ' || v.dl || ' were both invented by the importer and are removed here. The page of ' || v.nm || ' could not be read, so amount_usd_value is 0, award_amount is NULL, award_currency is ' || v.cur || ', coverage is Unspecified, the deadline is not_published and source_reliability drops to 4.' || v.pu
FROM (VALUES
  (345,'Trinity College Dublin','28,000 US dollars','March 31 annually','["Master''s","PhD"]','EUR',' The Trinity international scholarship address returned an HTTP 403 forbidden response.'),
  (434,'the University of Galway','26,000 US dollars','April 30 annually','["Master''s","PhD"]','EUR',' The recorded scholarship address returned a page-not-found response.'),
  (402,'Tecnologico de Monterrey','18,000 US dollars','June 28 annually','["Bachelor''s","Master''s"]','MXN',' The recorded English scholarships address returned a page-not-found response; the Spanish-language international scholarships page verified in an earlier pass covers a different row.'),
  (343,'the Universidad Nacional Autonoma de Mexico','15,000 US dollars','June 15 annually','["Master''s","PhD"]','MXN',' This is the UNAM international postgraduate instrument; the UNAM postgraduate scholarships page verified in an earlier pass belongs to a different row and its figures must not be copied here.'),
  (467,'the Pontificia Universidad Catolica de Chile','8,000 US dollars','Not published - confirm the current cycle on the official page','["Bachelor''s","Master''s","PhD"]','CLP',''),
  (879,'the Pontificia Universidad Catolica de Chile','8,000 US dollars','Per exchange agreement; deadlines are set by the sending university','["Bachelor''s"]','CLP',' The title itself says this is a tuition scholarship for exchange students under CINDA and Latin American Catholic university agreements, so it is not an award a degree-seeking applicant from Uzbekistan can use.')
) AS v(id, nm, amt, dl, dlv, cur, pu)
WHERE s.id = v.id;

COMMIT;
