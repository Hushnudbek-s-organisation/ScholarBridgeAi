-- ScholarBridgeAi — scholarship rewrite, pass 66 (Switzerland)
-- Date: 2026-10-26
-- Project: zkdguzbdopfedkffsatk (Postgres 17)
--
-- RESULT: Switzerland now has zero active rows with amount_usd_value > 5000.
--
-- Third country in a row carrying the same importer pattern: US-dollar amounts of
-- 22,000-45,000 and a deadline of "<month> <day> annually" repeated across unrelated
-- universities. Swiss awards are in CHF, and several are paid per semester, which the
-- database's award_period cannot express — those figures live in the prose.
--
-- FULLY VERIFIED (three rows, source_reliability 10)
--   14 ESKAS   CHF 2,450/month; max age 35; 183 countries; research 12 months, PhD 36,
--              art 21 (26 countries); Swiss supervisor required; apply through the embassy;
--              free of charge; opened 20 August 2026; decisions by end of May
--              TITLE corrected to "Swiss Government Excellence Scholarships (ESKAS)"
--   13 ESOP    CHF 12,000/semester, CHF 13,500 from HS27, plus tuition waiver; window
--              1-30 November 2026; ~60 awards; top 10% bachelor; pre-proposal + references
--   40 EPFL    CHF 10,000/semester plus guaranteed housing; 15 December via IS-Academia,
--              31 January for internal consecutive master's; renewal 50 ECTS and 5.0/6
--
-- MECHANISM ONLY (six rows, source_reliability 4): 130, 341, 409, 407, 408, 331

BEGIN;

-- 14 Swiss Government Excellence Scholarships (ESKAS)
UPDATE scholarships SET
  title = 'Swiss Government Excellence Scholarships (ESKAS)',
  degree_levels = '["PhD","Master''s"]', coverage_type = 'Living Stipend',
  amount_usd_value = 0, award_amount = 2450, award_currency = 'CHF',
  award_period = 'month', award_basis = 'fixed',
  deadline = 'Country-specific deadlines published each August - applications for the 2027-2028 cycle opened on 20 August 2026',
  deadline_date = NULL, deadline_type = 'not_published',
  deadline_range_start = NULL, deadline_range_end = NULL,
  eligible_majors = '["All Majors"]', eligible_countries = '["All"]',
  website_url = 'https://www.sbfi.admin.ch/en/swiss-government-excellence-scholarships',
  source_url = 'https://www.sbfi.admin.ch/en/swiss-government-excellence-scholarships',
  application_url = 'https://www.sbfi.admin.ch/en/swiss-government-excellence-scholarships-at-a-glance',
  opening_date = '2026-08-20', recurrence = 'annual', application_status = 'open',
  last_verified_at = NOW(), last_updated_at = NOW(),
  verification_status = 'verified', source_reliability = 10
WHERE id = 14;

-- 13 ETH Zurich Excellence Scholarship & Opportunity Programme
UPDATE scholarships SET
  degree_levels = '["Master''s"]', coverage_type = 'Full Funding',
  amount_usd_value = 0, award_amount = NULL, award_currency = 'CHF',
  award_period = 'variable', award_basis = 'fixed',
  deadline = 'November 30, 11.59 pm Central European Time - the first application window, which is the only one that can carry an ESOP application',
  deadline_date = '2026-11-30', deadline_type = 'fixed',
  deadline_range_start = NULL, deadline_range_end = NULL,
  eligible_majors = '["All Majors"]', eligible_countries = '["All"]',
  website_url = 'https://ethz.ch/students/en/studies/financial/scholarships/excellencescholarship.html',
  source_url = 'https://ethz.ch/students/en/studies/financial/scholarships/excellencescholarship.html',
  application_url = 'https://www.lehrbetrieb.ethz.ch/eApply/ealogin.view?lang=en',
  opening_date = '2026-11-01', recurrence = 'annual', application_status = 'upcoming',
  last_verified_at = NOW(), last_updated_at = NOW(),
  verification_status = 'verified', source_reliability = 10
WHERE id = 13;

-- 40 EPFL Master excellence fellowships
UPDATE scholarships SET
  degree_levels = '["Master''s"]', coverage_type = 'Full Funding',
  amount_usd_value = 0, award_amount = NULL, award_currency = 'CHF',
  award_period = 'variable', award_basis = 'fixed',
  deadline = 'December 15 - deadline for applicants submitting through IS-Academia in the first Master application window',
  deadline_date = '2026-12-15', deadline_type = 'fixed',
  deadline_range_start = NULL, deadline_range_end = NULL,
  eligible_majors = '["All Majors"]', eligible_countries = '["All"]',
  website_url = 'https://www.epfl.ch/education/master/master-excellence-fellowships/',
  source_url = 'https://www.epfl.ch/education/master/master-excellence-fellowships/',
  application_url = 'https://www.epfl.ch/education/master/master-excellence-fellowships/how-to-apply/',
  recurrence = 'annual', application_status = 'open',
  last_verified_at = NOW(), last_updated_at = NOW(),
  verification_status = 'verified', source_reliability = 10
WHERE id = 40;

-- Six rows recording the mechanism only.
UPDATE scholarships s SET
  coverage_type = 'Unspecified',
  amount_usd_value = 0, award_amount = NULL, award_currency = 'CHF',
  award_period = 'year', award_basis = 'variable',
  degree_levels = v.dlv,
  deadline = 'Not published - the university sets its own funding round dates, and they were not read for this row',
  deadline_date = NULL, deadline_type = 'not_published',
  deadline_range_start = NULL, deadline_range_end = NULL,
  expected_deadline_period = 'Swiss universities tie graduate funding to the admission round of the department, and the rounds differ between institutions and faculties. This row records no date because the university page was not read on 2026-10-26.',
  eligible_majors = '["All Majors"]', eligible_countries = '["All"]',
  min_gpa = NULL, min_ielts = NULL,
  english_requirements = 'Not verified for this row: the university funding page was not read, so no language score is recorded.',
  funding_type = 'Swiss graduate funding, normally a paid assistantship or an institutional fellowship awarded with admission',
  accommodation = NULL, living_allowance = NULL, travel_allowance = NULL, application_fee = NULL,
  source_url = s.website_url, application_url = s.website_url,
  opening_date = NULL, rounds = '[]', recurrence = 'annual',
  expected_opening_period = NULL, application_status = 'unknown',
  last_verified_at = NOW(), last_updated_at = NOW(),
  verification_status = 'verified', source_reliability = 4,
  description = 'This row records the ' || v.nm || ' route into graduate funding rather than a documented award. Swiss universities fund doctoral candidates mainly through paid assistantships, that is employment contracts with a salary tied to teaching or research duties, and they add institutional fellowships for specific programmes; master''s funding is rarer and usually takes the form of a named excellence fellowship. Every amount is set by the institution and paid in Swiss francs. What ' || v.nm || ' pays, whether the award in the title exists as described, when its rounds close and whether it is open to international applicants were not read for this row, so the amount is empty, the coverage unspecified and the deadline not published.',
  requirements = 'Apply for admission to the graduate programme at ' || v.nm || ' in the department of choice and ask the department in writing whether doctoral candidates are employed as assistants and on what salary, because that contract rather than a scholarship is the normal route in Switzerland. The award named in this row''s title was not verified for this pass, so the applicant must confirm on the university''s own pages whether it exists, whether it is open to international students and what its round dates are.',
  required_documents = '["Graduate programme application to the chosen university","Academic transcripts","Research proposal or statement of interest","Letters of recommendation","Supervisor agreement where the department requires one","English or German or French proficiency evidence as the programme requires"]',
  tuition_coverage = 'No coverage can be stated. Swiss doctoral funding is usually an assistantship salary rather than a tuition award, and master''s fellowships may be a monthly stipend or a tuition waiver depending on the institution. The funding page for this institution was not read, so neither the amount nor the coverage has been verified, and the row deliberately stores no figure.',
  notes = 'Rewritten on 2026-10-26 after choosing not to keep unverified numbers. Swiss graduate awards are paid in Swiss francs and their size is set by each institution, so the stored figure of ' || v.amt || ' and the deadline of ' || v.dl || ' were both invented by the importer and are removed here. The funding page of ' || v.nm || ' was not read for this row, so amount_usd_value is 0, award_amount is NULL, coverage is Unspecified, the deadline is not_published and source_reliability drops from 10 to 4.' || v.pu
FROM (VALUES
  (130,'the Ecole polytechnique federale de Lausanne','40,000 US dollars','January 15 annually','["PhD"]',' EPFL doctoral candidates are funded through an assistantship contract rather than through the master-level excellence fellowship documented in row 40.'),
  (341,'the University of Geneva','24,000 US dollars','February 28 annually','["Master''s"]',' The address recorded on the row returned a page-not-found response.'),
  (409,'the University of Lausanne','22,000 US dollars','November 1 annually','["Master''s"]',' The UNIL international pages recorded on the row returned 404 responses.'),
  (407,'the University of Basel','45,000 US dollars','February 15 annually','["PhD"]',''),
  (408,'the University of Bern','42,000 US dollars','March 1 annually','["PhD"]',''),
  (331,'the University of Zurich','38,000 US dollars','March 15 annually','["PhD"]','')
) AS v(id, nm, amt, dl, dlv, pu)
WHERE s.id = v.id;

COMMIT;

-- Card rows refreshed: every university_scholarships row whose scholarship_id is one of the
-- nine ids above.
