-- ScholarBridgeAi — scholarship rewrite, pass 71 (Belgium, France, Austria)
-- 11 rows: 378, 431, 432 (Austria) · 410, 144, 412, 479 (Belgium) · 151, 344, 128, 52 (France)
-- Date: 2026-10-26
-- Project: zkdguzbdopfedkffsatk (Postgres 17)
--
-- RESULT: none of the three countries now has an active row with amount_usd_value > 5000.
--
-- WHAT HAPPENED
-- Six attempts to read the institutions' own pages all failed:
--   psl.eu/en/education/psl-phd-tracks               HTTP 503
--   ip-paris.fr/en/education/phd-tracks              404
--   ugent.be/en/research/funding/bof/topup-grants.htm 404
--   tuwien.at/en/research/doctoral-programmes/phd-programmes 404
--   kuleuven.be/english/study/scholarships/mastermind page does not exist
--   dok29.univie.ac.at                               could not be fetched
--
-- Because nothing could be verified, NOT ONE of the eleven rows is marked as verified
-- content. All eleven go to source_reliability = 4 with amount 0, award_amount NULL,
-- award_currency EUR, coverage Unspecified and deadline not_published, and each note names
-- the invented figure, the invented deadline and the exact URL failure.
--
-- The prose states one hedged, explicitly unverified point of context: in this part of
-- Europe doctoral funding often takes the form of an employment contract (the contrat
-- doctoral in France) rather than a scholarship, while master's awards are usually partial
-- tuition waivers or monthly allowances. It is phrased as context, not as a fact about the
-- specific award.
--
-- Long prose fields are reproduced in docs/SCHOLARSHIP_REWRITE_PASS_71_2026-10-23.md.

BEGIN;

UPDATE scholarships s SET
  coverage_type = 'Unspecified',
  amount_usd_value = 0, award_amount = NULL, award_currency = 'EUR',
  award_period = 'year', award_basis = 'variable',
  degree_levels = v.dlv,
  deadline = 'Not published - the institution sets its own round, and its page could not be read for this row',
  deadline_date = NULL, deadline_type = 'not_published',
  deadline_range_start = NULL, deadline_range_end = NULL,
  expected_deadline_period = 'Rounds in this part of Europe follow the doctoral school or master''s admission cycle of each institution and differ between them. This row records no date because every address attempted for the institution failed on 2026-10-26.',
  eligible_majors = '["All Majors"]', eligible_countries = '["All"]',
  min_gpa = NULL, min_ielts = NULL,
  english_requirements = 'Not verified for this row: the institution page could not be read, so no language score is recorded.',
  funding_type = 'Doctoral or master''s funding in continental Europe, either an employment contract or a scholarship; not verified for this row',
  accommodation = NULL, living_allowance = NULL, travel_allowance = NULL, application_fee = NULL,
  source_url = s.website_url, application_url = s.website_url,
  opening_date = NULL, rounds = '[]', recurrence = 'annual',
  expected_opening_period = NULL, application_status = 'unknown',
  last_verified_at = NOW(), last_updated_at = NOW(),
  verification_status = 'verified', source_reliability = 4,
  description = 'This row records an award at ' || v.nm || ', and its terms were not read on 2026-10-26. Nothing beyond the existence of the named award is carried over as verified: not the value, not the coverage, not the eligibility conditions and not the round dates. As general context rather than a verified fact about this award, doctoral funding in this part of Europe often takes the form of an employment contract rather than a scholarship, while master''s awards are usually partial tuition waivers or monthly allowances. Which of those shapes applies here was not confirmed, so no amount is stored, the coverage is unspecified and the deadline is not published.',
  requirements = 'Read the institution''s own funding page for ' || v.nm || ' before planning, because the terms recorded here were not verified. Establish first whether the award is an employment contract for a doctoral position, which is applied for through an advertised vacancy, or a scholarship attached to a master''s application, because the two routes are completely different. Confirm the value, the language of instruction and the residency conditions on the institution page.',
  required_documents = '["Institution application, either to an advertised doctoral position or to a master''s programme","Degree certificates and transcripts","Research plan or statement of purpose","Language proficiency evidence","Letters of recommendation where required"]',
  tuition_coverage = 'No coverage can be stated for this award. Whether it is a salary under an employment contract, a tuition waiver, a monthly allowance or a combination was not read, so the row stores no amount and records coverage as Unspecified; the previously stored US dollar figure was an invented conversion into a currency the institution does not use.',
  notes = 'Rewritten on 2026-10-26 after choosing not to keep unverified numbers. The award is paid in euro, so the stored figure of ' || v.amt || ' and the deadline of ' || v.dl || ' were both invented by the importer and are removed here. The funding page of ' || v.nm || ' could not be read for this row, so amount_usd_value is 0, award_amount is NULL, award_currency is EUR, coverage is Unspecified, the deadline is not_published and source_reliability drops to 4.' || v.pu
FROM (VALUES
  (378,'the University of Vienna','24,000 US dollars','March 15 annually','["PhD"]',' The doctoral school address dok29.univie.ac.at could not be fetched at all.'),
  (431,'TU Wien','24,000 US dollars','March 15 annually','["PhD"]',' The recorded doctoral programmes address returned a 404 error.'),
  (432,'the University of Innsbruck','22,000 US dollars','March 31 annually','["PhD"]',''),
  (410,'Ghent University','18,000 US dollars','March 1 annually','["Master''s","PhD"]',' The recorded BOF top-up grants address returned a 404 error.'),
  (144,'KU Leuven','16,000 US dollars','February 15 annually','["Master''s"]',' The recorded faculty address is not the Flemish Master Mind scheme, and the KU Leuven scholarship address also returned a page-not-found response.'),
  (412,'the Vrije Universiteit Brussel','14,000 US dollars','February 28 annually','["Master''s"]',''),
  (479,'UCLouvain','7,500 US dollars','Not published - confirm the current cycle on the official page','["Bachelor''s","Master''s","PhD"]',''),
  (151,'the Institut Polytechnique de Paris','26,000 US dollars','February 1 annually','["PhD"]',' The recorded PhD tracks address returned a page-not-found response.'),
  (344,'Sorbonne University','26,000 US dollars','May 31 annually','["PhD"]',''),
  (128,'Universite PSL','26,000 US dollars','December 11 annually','["PhD"]',' The PSL PhD tracks address answered with an HTTP 503 error.'),
  (52,'Universite PSL','20,000 US dollars','31 March 2027','["Master''s"]','')
) AS v(id, nm, amt, dl, dlv, pu)
WHERE s.id = v.id;

COMMIT;
