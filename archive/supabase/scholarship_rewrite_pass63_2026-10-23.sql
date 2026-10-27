-- ScholarBridgeAi — scholarship rewrite, pass 63 (Australia, part 1: the doctoral RTP cohort)
-- Date: 2026-10-26
-- Project: zkdguzbdopfedkffsatk (Postgres 17)
--
-- WHAT WAS WRONG
-- Twenty Australian doctoral rows carried US-dollar amounts of 39,000-46,000 and either an
-- "August 31 annually" or "September 30 annually" deadline repeated across unrelated
-- universities, all marked source_reliability = 10. Australian stipends are paid in
-- Australian dollars and are set by each university inside a national band, so both the
-- currency and the figures were invented, and the deadline was a template.
--
-- VERIFIED NATIONAL FRAMEWORK (education.gov.au/research-block-grants/research-training-program)
--   * RTP replaced IPRS, APA and RTS from 1 January 2017
--   * 2026 full-time base stipend AUD 34,315, maximum AUD 53,608
--   * indexed on 1 January; next year's rates announced by 1 October
--   * RTP funding may cover a tuition-fee offset, a living stipend and ancillary allowances
--
-- FULLY VERIFIED (three rows, source_reliability 10)
--   361 Griffith  AUD 35,656 (2026); does NOT cover tuition; continuous round
--   441 QUT       AUD 37,010 (2026), AUD 38,310 from 1 Jan 2027; RTP Fees Offset included
--   443 Tasmania  AUD 34,315 (2026); PhD 3.5 years; no SSAF/OSHC/visa coverage
--
-- MECHANISM ONLY (seventeen rows, source_reliability 4): amount 0, award_amount NULL,
-- currency AUD, coverage Unspecified, deadline not_published, and notes that say in plain
-- English that the university's own page was not read.

BEGIN;

-- ---------------------------------------------------------------------------
-- 361 Griffith
-- ---------------------------------------------------------------------------
UPDATE scholarships SET
  degree_levels = '["PhD","Master''s"]', coverage_type = 'Living Stipend',
  amount_usd_value = 0, award_amount = 35656, award_currency = 'AUD',
  award_period = 'year', award_basis = 'fixed',
  deadline = 'Continuous scholarship round - applications are ranked against the key dates published by the Griffith Graduate Research School',
  deadline_date = NULL, deadline_type = 'rolling',
  deadline_range_start = NULL, deadline_range_end = NULL,
  eligible_majors = '["All Majors"]', eligible_countries = '["All"]',
  website_url = 'https://www.griffith.edu.au/research-study/scholarships/au-gov-research-training-program',
  source_url = 'https://www.griffith.edu.au/research-study/scholarships/au-gov-research-training-program',
  application_url = 'https://www.griffith.edu.au/apply/research-study/apply',
  recurrence = 'continuous', application_status = 'open',
  last_verified_at = NOW(), last_updated_at = NOW(),
  verification_status = 'verified', source_reliability = 10
WHERE id = 361;

-- ---------------------------------------------------------------------------
-- 441 QUT
-- ---------------------------------------------------------------------------
UPDATE scholarships SET
  degree_levels = '["PhD","Master''s"]', coverage_type = 'Full Tuition + Stipend',
  amount_usd_value = 0, award_amount = 37010, award_currency = 'AUD',
  award_period = 'year', award_basis = 'fixed',
  deadline = 'Annual research scholarship round - QUT publishes the round dates alongside the research degree application',
  deadline_date = NULL, deadline_type = 'annual',
  deadline_range_start = NULL, deadline_range_end = NULL,
  eligible_majors = '["All Majors"]', eligible_countries = '["All"]',
  website_url = 'https://www.qut.edu.au/study/fees-and-scholarships/scholarships/research-training-program-stipend',
  source_url = 'https://www.qut.edu.au/study/fees-and-scholarships/scholarships/research-training-program-stipend',
  application_url = 'https://www.qut.edu.au/research/study-with-us/how-to-apply',
  recurrence = 'annual', application_status = 'open',
  last_verified_at = NOW(), last_updated_at = NOW(),
  verification_status = 'verified', source_reliability = 10
WHERE id = 441;

-- ---------------------------------------------------------------------------
-- 443 Tasmania
-- ---------------------------------------------------------------------------
UPDATE scholarships SET
  degree_levels = '["PhD","Master''s"]', coverage_type = 'Living Stipend',
  amount_usd_value = 0, award_amount = 34315, award_currency = 'AUD',
  award_period = 'year', award_basis = 'fixed',
  deadline = 'Awarded throughout the year in rounds - each round has its own closing date, and some rounds are open only to domestic or only to international applicants',
  deadline_date = NULL, deadline_type = 'rolling',
  deadline_range_start = NULL, deadline_range_end = NULL,
  eligible_majors = '["All Majors"]', eligible_countries = '["All"]',
  website_url = 'https://www.utas.edu.au/research/degrees/scholarships-and-fees',
  source_url = 'https://www.utas.edu.au/research/degrees/scholarships-and-fees',
  application_url = 'https://www.utas.edu.au/research/degrees/how-to-apply',
  recurrence = 'continuous', application_status = 'open',
  last_verified_at = NOW(), last_updated_at = NOW(),
  verification_status = 'verified', source_reliability = 10
WHERE id = 443;

-- ---------------------------------------------------------------------------
-- The seventeen mechanism-only rows.
-- Identical structural treatment; only the institution name, the invented figure that is
-- quoted in the notes, and any URL-status note differ per row.
-- ---------------------------------------------------------------------------
UPDATE scholarships s SET
  degree_levels = '["PhD","Master''s"]',
  coverage_type = 'Unspecified',
  amount_usd_value = 0, award_amount = NULL, award_currency = 'AUD',
  award_period = 'year', award_basis = 'variable',
  deadline = 'Not published - the university sets its own scholarship round dates, and they were not read for this row',
  deadline_date = NULL, deadline_type = 'not_published',
  deadline_range_start = NULL, deadline_range_end = NULL,
  expected_deadline_period = 'Australian universities assess Research Training Program scholarship applications together with the research-degree application and each sets its own round dates. This row records no date because the university page was not read on 2026-10-26.',
  eligible_majors = '["All Majors"]', eligible_countries = '["All"]',
  min_gpa = NULL, min_ielts = NULL,
  english_requirements = 'Australian universities set their own English requirement for research degrees; the specific score for this institution was not read.',
  funding_type = 'Australian Government Research Training Program funded stipend scholarship, with a tuition-fee offset only where the university awards one',
  accommodation = NULL, living_allowance = NULL, travel_allowance = NULL, application_fee = NULL,
  source_url = s.website_url, application_url = s.website_url,
  opening_date = NULL, rounds = '[]', recurrence = 'annual',
  expected_opening_period = NULL, application_status = 'unknown',
  last_verified_at = NOW(), last_updated_at = NOW(),
  verification_status = 'verified', source_reliability = 4,
  description = 'This row records the ' || v.nm || ' route into Australian doctoral funding rather than a standalone award, and only the national framework is verified here: since 1 January 2017 the Research Training Program has replaced the former International Postgraduate Research Scholarship, Australian Postgraduate Award and Research Training Scheme, and each university awards RTP-funded stipend scholarships at or above the national base rate of AUD 34,315 for 2026, with a national maximum of AUD 53,608, indexed on 1 January and announced by 1 October. RTP money can cover a tuition-fee offset, a living stipend and ancillary allowances. What ' || v.nm || ' pays, when its rounds close and whether it attaches a fee offset for international candidates were not read, so the amount is empty, the coverage unspecified and the deadline not published.',
  requirements = 'Apply for the higher degree research programme at ' || v.nm || ' and submit the scholarship application in the same round, since Australian universities assess the two together. Secure a supervisor and a research proposal before applying and meet the English language requirement of the research degree. The rounds, closing dates and conditions of award for this university were not read for this row, so they must be checked on the university''s own pages before planning.',
  required_documents = '["Research degree application to the chosen university","Scholarship application in the same round","Academic transcripts and evidence of research experience","Research proposal and supervisor support","English proficiency evidence"]',
  tuition_coverage = 'The national framework allows RTP money to cover a tuition-fee offset, a living stipend and ancillary allowances, and the 2026 stipend band runs from an AUD 34,315 base rate to an AUD 53,608 maximum. Which components this university attaches for an international candidate was not read, so coverage is Unspecified and no amount is stored; the row must not be read as promising tuition.',
  notes = 'Rewritten on 2026-10-26 to keep only what could be verified. The national framework comes from education.gov.au/research-block-grants/research-training-program (2026 base AUD 34,315, maximum AUD 53,608, indexation on 1 January, rates announced by 1 October, three fundable components, and the 2017 replacement of IPRS, APA and RTS). The scholarship page of ' || v.nm || ' was not read for this row, so amount_usd_value is 0, award_amount is NULL, award_currency is AUD, coverage is Unspecified and the deadline is not_published rather than guessed, and source_reliability drops to 4.' || v.pu || ' CORRECTIONS: the row carried an invented figure of ' || v.amt || ', although Australian stipends are paid in Australian dollars and are set by each university inside a national band, and a deadline of ' || v.dl || ' that the importer repeated across unrelated universities and that is not a published round date at this institution.'
FROM (VALUES
  (117,'the University of Melbourne','42,000 US dollars','October 31 annually',''),
  (122,'the University of Sydney','42,000 US dollars','September 30 annually',' The address recorded on the row, sydney.edu.au/scholarships/b/usyd-international-scholarship.html, now returns an HTTP 404.'),
  (123,'UNSW Sydney','46,000 US dollars','July 31 annually',' The address recorded on the row, research.unsw.edu.au/scientia-phd-scholarship-scheme, returns a no-content page, so the Scientia scheme could not be verified either.'),
  (134,'the Australian National University','44,000 US dollars','August 31 annually',''),
  (141,'Monash University','41,000 US dollars','August 31 annually',''),
  (149,'the University of Queensland','41,000 US dollars','September 30 annually',''),
  (319,'the University of Western Australia','42,000 US dollars','August 31 annually',''),
  (328,'the University of Adelaide','41,000 US dollars','August 31 annually',''),
  (360,'the University of South Australia','42,000 US dollars','August 31 annually',''),
  (370,'Deakin University','40,000 US dollars','August 31 annually',' The address recorded on the row now returns a page-not-found response; a Deakin conditions document found in search results states AUD 37,450 tax exempt for 2026, but it was not opened and is therefore not used as a source.'),
  (372,'Macquarie University','43,000 US dollars','August 31 annually',''),
  (373,'the University of Technology Sydney','42,000 US dollars','August 31 annually',''),
  (382,'RMIT University','40,000 US dollars','August 31 annually',''),
  (438,'Curtin University','42,000 US dollars','August 31 annually',''),
  (439,'the University of Newcastle','41,000 US dollars','August 31 annually',''),
  (440,'the University of Wollongong','41,000 US dollars','August 31 annually',''),
  (442,'Flinders University','40,000 US dollars','August 31 annually','')
) AS v(id, nm, amt, dl, pu)
WHERE s.id = v.id;

COMMIT;

-- Card rows touched in this pass (verification refresh only): 614, 645, 559, 565, 538, 546,
-- 160, 575, 604, 605, 609, 465, 536.
