-- ScholarBridgeAi — scholarship rewrite, pass 61 (US need-based block)
-- Date: 2026-10-26
-- Project: zkdguzbdopfedkffsatk (Postgres 17)
-- Rows: 1 MIT, 2 MIT Presidential, 6 Stanford, 9 Harvard GSAS Merit, 10 Harvard, 19 Caltech, 20 Caltech PhD
--
-- NOTE ON THIS FILE
-- The statements below reproduce the structural fields of every row (amounts, coverage,
-- deadlines, JSON arrays, URLs, reliability, provenance). The long prose fields
-- (description, requirements, tuition_coverage, accommodation, notes) were written in full
-- directly against the database and are reproduced verbatim in
-- docs/SCHOLARSHIP_REWRITE_PASS_61_2026-10-23.md; they are not duplicated here because the
-- database is their source of truth. Re-running this file without those prose fields would
-- leave the rows structurally correct but textually thin.

BEGIN;

-- ---------------------------------------------------------------------------
-- 1. MIT need-based undergraduate aid (MIT Scholarship)
--    Source: sfs.mit.edu/undergraduate-students/the-cost-of-attendance/making-mit-affordable/
--    amount 0: need-based award has no single published size
-- ---------------------------------------------------------------------------
UPDATE scholarships SET
  degree_levels = '["Bachelor''s"]',
  coverage_type = 'Full Funding',
  amount_usd_value = 0,
  award_amount = NULL,
  award_currency = 'USD',
  award_period = 'year',
  award_basis = 'need_based',
  deadline = 'November 30 (Early Action); February 15 (Regular Action, Transfer and current-student renewal) - the same deadline applies to domestic and international applicants',
  deadline_date = NULL,
  deadline_type = 'fixed',
  deadline_range_start = NULL,
  deadline_range_end = NULL,
  expected_deadline_period = 'The aid deadlines for the 2027 entry cycle are 30 November 2026 for Early Action and 15 February 2027 for Regular Action, Transfer and current-student renewal. Late aid applications carry no penalty but must be complete before the end of the academic year for which aid is requested.',
  eligible_majors = '["All Majors"]',
  eligible_countries = '["All"]',
  min_gpa = NULL,
  min_ielts = NULL,
  required_documents = '["MIT undergraduate application (Early Action, Regular Action or Transfer)","CSS Profile naming MIT with code 3514","A separate CSS Profile from each parent if the parents are separated or divorced","Parents'' tax returns or income documentation through the College Board IDOC service, translated into English where needed","FAFSA, for US citizens and eligible non-citizens only"]',
  english_requirements = 'The award sets no English test score of its own; the English proficiency requirement of MIT undergraduate admission applies.',
  funding_type = 'Need-based institutional grant (MIT Scholarship), with a first-year grant and a health-insurance grant for the highest-need students',
  living_allowance = NULL,
  travel_allowance = NULL,
  application_fee = NULL,
  website_url = 'https://sfs.mit.edu/undergraduate-students/the-cost-of-attendance/making-mit-affordable/',
  source_url = 'https://sfs.mit.edu/undergraduate-students/the-cost-of-attendance/making-mit-affordable/',
  application_url = 'https://sfs.mit.edu/undergraduate-students/apply-for-aid/international/',
  opening_date = NULL,
  rounds = '[]',
  recurrence = 'annual',
  expected_opening_period = NULL,
  application_status = 'open',
  last_verified_at = NOW(),
  last_updated_at = NOW(),
  verification_status = 'verified',
  source_reliability = 10
WHERE id = 1;

-- ---------------------------------------------------------------------------
-- 2. MIT Presidential Graduate Fellowship
--    Source: oge.mit.edu/fellowships/presidential-graduate-fellowship-program/
--    Nine-month award for the first academic year; students cannot apply
-- ---------------------------------------------------------------------------
UPDATE scholarships SET
  degree_levels = '["PhD"]',
  coverage_type = 'Full Tuition + Stipend',
  amount_usd_value = 0,
  award_amount = NULL,
  award_currency = 'USD',
  award_period = 'year',
  award_basis = 'variable',
  deadline = 'Not published - students cannot apply: departments nominate candidates against their allocation and the President and Provost select the fellows',
  deadline_date = NULL,
  deadline_type = 'not_published',
  deadline_range_start = NULL,
  deadline_range_end = NULL,
  expected_deadline_period = 'Nominations are prepared by departments from the pool of applicants admitted for the coming year, so the operative date is the graduate admission deadline of the department concerned. MIT publishes no Presidential Fellowship deadline because there is no student application.',
  eligible_majors = '["All Majors"]',
  eligible_countries = '["All"]',
  min_gpa = NULL,
  min_ielts = NULL,
  required_documents = '["No student-facing application exists: candidates are nominated by the department from the admission file","Departmental nomination submitted by the graduate administrator to the Director of Graduate Fellowships"]',
  english_requirements = 'The fellowship sets no English requirement of its own; the English proficiency requirement of the admitted MIT graduate programme applies.',
  funding_type = 'Institute fellowship for the first academic year, administered by the Office of Graduate Education with the Office of the Provost',
  living_allowance = NULL,
  travel_allowance = NULL,
  application_fee = NULL,
  website_url = 'https://oge.mit.edu/fellowships/presidential-graduate-fellowship-program/',
  source_url = 'https://oge.mit.edu/fellowships/presidential-graduate-fellowship-program/',
  application_url = 'https://oge.mit.edu/graduate-admissions/costs-funding/',
  opening_date = NULL,
  rounds = '[]',
  recurrence = 'annual',
  expected_opening_period = NULL,
  application_status = 'unknown',
  last_verified_at = NOW(),
  last_updated_at = NOW(),
  verification_status = 'verified',
  source_reliability = 10
WHERE id = 2;

-- ---------------------------------------------------------------------------
-- 6. Stanford need-based undergraduate aid
--    Sources: admission.stanford.edu/apply/international,
--             financialaid.stanford.edu/undergrad/how/international.html,
--             financialaid.stanford.edu/undergrad/apply/index.html,
--             financialaid.stanford.edu/undergrad/budget/index.html
--    Need-aware for international citizens; one-shot aid request at admission
-- ---------------------------------------------------------------------------
UPDATE scholarships SET
  degree_levels = '["Bachelor''s"]',
  coverage_type = 'Full Funding',
  amount_usd_value = 0,
  award_amount = NULL,
  award_currency = 'USD',
  award_period = 'year',
  award_basis = 'need_based',
  deadline = 'November 15 (Restrictive Early Action); February 15 (Regular Decision); March 15 (Transfer) - CSS Profile and IDOC priority filing dates',
  deadline_date = NULL,
  deadline_type = 'fixed',
  deadline_range_start = NULL,
  deadline_range_end = NULL,
  expected_deadline_period = 'For new students the priority filing dates are 15 November for Restrictive Early Action, 15 February for Regular Decision and 15 March for Transfer. Continuing students have a single 30 April date.',
  eligible_majors = '["All Majors"]',
  eligible_countries = '["All"]',
  min_gpa = NULL,
  min_ielts = NULL,
  required_documents = '["Stanford admission application with the financial aid request indicated","CSS Profile","IDOC submission of parents'' income and tax documentation","FAFSA, for US citizens and eligible non-citizens only","Social Security number or Individual Taxpayer Identification Number before scholarship funds can be disbursed"]',
  english_requirements = 'The award sets no English test score of its own; the English proficiency requirement of Stanford undergraduate admission applies.',
  funding_type = 'Need-based institutional scholarship and grant aid, described by Stanford as meeting full need without loans',
  living_allowance = NULL,
  travel_allowance = NULL,
  application_fee = NULL,
  website_url = 'https://financialaid.stanford.edu/undergrad/how/international.html',
  source_url = 'https://financialaid.stanford.edu/undergrad/how/international.html',
  application_url = 'https://financialaid.stanford.edu/undergrad/apply/index.html',
  opening_date = NULL,
  rounds = '[]',
  recurrence = 'annual',
  expected_opening_period = NULL,
  application_status = 'open',
  last_verified_at = NOW(),
  last_updated_at = NOW(),
  verification_status = 'verified',
  source_reliability = 10
WHERE id = 6;

-- ---------------------------------------------------------------------------
-- 9. Harvard Griffin GSAS Merit Fellowship
--    Source: gsas.harvard.edu/academics/fellowships/internal-fellowships/internal-research-fellowships
--    INTERNAL award: enrolled students who have passed generals
-- ---------------------------------------------------------------------------
UPDATE scholarships SET
  degree_levels = '["PhD"]',
  coverage_type = 'Living Stipend',
  amount_usd_value = 0,
  award_amount = NULL,
  award_currency = 'USD',
  award_period = 'one_time',
  award_basis = 'variable',
  deadline = 'Late fall - the application is completed in CARAT by each department''s own internal deadline',
  deadline_date = NULL,
  deadline_type = 'annual',
  deadline_range_start = NULL,
  deadline_range_end = NULL,
  expected_deadline_period = 'Applications are due in late fall and recipients may take the fellowship in either the fall or the spring term of the following academic year; notification is typically in mid-April.',
  eligible_majors = '["Humanities","Social Sciences","Statistics","Mathematics","Theoretical Physics","Organismic and Evolutionary Biology","Human Evolutionary Biology"]',
  eligible_countries = '["All"]',
  min_gpa = NULL,
  min_ielts = NULL,
  required_documents = '["Application form submitted in CARAT","CV of no more than two single-spaced pages","Unofficial transcript generated from my.harvard","Reference letters speaking to the project, which the published criteria rely on"]',
  english_requirements = 'The fellowship sets no English requirement of its own; the English proficiency and teaching requirements of the enrolled Harvard Griffin GSAS programme apply.',
  funding_type = 'Internal research fellowship replacing one term of teaching stipend for enrolled doctoral students',
  living_allowance = NULL,
  travel_allowance = NULL,
  application_fee = NULL,
  website_url = 'https://gsas.harvard.edu/academics/fellowships/internal-fellowships/internal-research-fellowships',
  source_url = 'https://gsas.harvard.edu/academics/fellowships/internal-fellowships/internal-research-fellowships',
  application_url = 'https://gsas.harvard.edu/academics/fellowships/internal-fellowships/internal-research-fellowships',
  opening_date = NULL,
  rounds = '[]',
  recurrence = 'annual',
  expected_opening_period = NULL,
  application_status = 'upcoming',
  last_verified_at = NOW(),
  last_updated_at = NOW(),
  verification_status = 'verified',
  source_reliability = 10
WHERE id = 9;

-- ---------------------------------------------------------------------------
-- 10. Harvard need-based undergraduate aid
--     Sources: college.harvard.edu/financial-aid,
--              college.harvard.edu/financial-aid/apply-financial-aid,
--              college.harvard.edu/financial-aid/apply-financial-aid/prospective-students
--     Income bands: <=100k free, <=200k free tuition plus
-- ---------------------------------------------------------------------------
UPDATE scholarships SET
  degree_levels = '["Bachelor''s"]',
  coverage_type = 'Full Funding',
  amount_usd_value = 0,
  award_amount = NULL,
  award_currency = 'USD',
  award_period = 'year',
  award_basis = 'need_based',
  deadline = 'November 1 (Restrictive Early Action and QuestBridge Match); February 1 (Regular Decision); March 1 (Transfer) - CSS Profile, IDOC and, where applicable, FAFSA deadlines',
  deadline_date = NULL,
  deadline_type = 'fixed',
  deadline_range_start = NULL,
  deadline_range_end = NULL,
  expected_deadline_period = 'The published aid deadlines for the 2027-2028 cycle are 1 November for Restrictive Early Action and QuestBridge Match, 1 February for Regular Decision and 1 March for Transfer. A late aid application is accepted without penalty but is decided later.',
  eligible_majors = '["All Majors"]',
  eligible_countries = '["All"]',
  min_gpa = NULL,
  min_ielts = NULL,
  required_documents = '["Harvard undergraduate application","CSS Profile naming Harvard with code 3434","IDOC package with the parents'' 2025 income tax documents, or a Tax Non-Filer Statement and wage evidence where the parents do not file","The student''s own income tax document or a Tax Non-Filer Statement","Business documents where a parent owns a business","A separate CSS Profile from each parent if the parents are separated or divorced","FAFSA with Harvard code E00468, for US citizens and permanent residents only"]',
  english_requirements = 'The award sets no English test score of its own; the English proficiency requirement of Harvard College admission applies.',
  funding_type = 'Need-based Harvard scholarship and grant aid, with no loans in the standard package',
  living_allowance = NULL,
  travel_allowance = NULL,
  application_fee = NULL,
  website_url = 'https://college.harvard.edu/financial-aid',
  source_url = 'https://college.harvard.edu/financial-aid/apply-financial-aid/prospective-students',
  application_url = 'https://college.harvard.edu/financial-aid/apply-financial-aid',
  opening_date = NULL,
  rounds = '[]',
  recurrence = 'annual',
  expected_opening_period = NULL,
  application_status = 'open',
  last_verified_at = NOW(),
  last_updated_at = NOW(),
  verification_status = 'verified',
  source_reliability = 10
WHERE id = 10;

-- ---------------------------------------------------------------------------
-- 19. Caltech need-based undergraduate aid
--     Sources: admissions.caltech.edu/afford,
--              finaid.caltech.edu/applying/how/newinternationalrd,
--              finaid.caltech.edu/applying/how/transinternational,
--              admissions.caltech.edu/apply/first-year-applicants/deadlines
--     Need-aware for internationals; no merit awards; one-shot aid request
-- ---------------------------------------------------------------------------
UPDATE scholarships SET
  degree_levels = '["Bachelor''s"]',
  coverage_type = 'Full Funding',
  amount_usd_value = 0,
  award_amount = NULL,
  award_currency = 'USD',
  award_period = 'year',
  award_basis = 'need_based',
  deadline = 'November 1 (Restrictive Early Action admission deadline); January 4 (Regular Decision admission deadline) - the fall 2027 financial aid form dates are not yet published',
  deadline_date = NULL,
  deadline_type = 'fixed',
  deadline_range_start = NULL,
  deadline_range_end = NULL,
  expected_deadline_period = 'For fall 2027 entry the admission deadlines are 1 November 2026 for Restrictive Early Action and 4 January 2027 for Regular Decision. On the fall 2026 cycle the CSS Profile was due 15 February 2026 and the parents'' non-tax-filer statement 16 March 2026; those aid dates have not yet been replaced for fall 2027.',
  eligible_majors = '["All Majors"]',
  eligible_countries = '["All"]',
  min_gpa = NULL,
  min_ielts = NULL,
  required_documents = '["Caltech first-year application (Restrictive Early Action or Regular Decision)","Financial aid request indicated in the admission application","CSS Profile naming Caltech with code 4034","Parents'' national tax return","Parents'' Non-Tax Filer''s Statement for Foreign Filer or Foreign Non-Filer","Scholarship Data Form and addendum"]',
  english_requirements = 'The award sets no English test score of its own; the English proficiency requirement of Caltech undergraduate admission applies.',
  funding_type = 'Need-based grant, work-study and loan package meeting one hundred per cent of demonstrated need, with no merit awards',
  living_allowance = NULL,
  travel_allowance = NULL,
  application_fee = NULL,
  website_url = 'https://www.admissions.caltech.edu/afford',
  source_url = 'https://www.finaid.caltech.edu/applying/how/newinternationalrd',
  application_url = 'https://www.finaid.caltech.edu/',
  opening_date = NULL,
  rounds = '[]',
  recurrence = 'annual',
  expected_opening_period = NULL,
  application_status = 'open',
  last_verified_at = NOW(),
  last_updated_at = NOW(),
  verification_status = 'verified',
  source_reliability = 10
WHERE id = 19;

-- ---------------------------------------------------------------------------
-- 20. Caltech PhD funding package
--     Sources: gradoffice.caltech.edu/financialsupport,
--              gradoffice.caltech.edu/financialsupport/budget,
--              gradoffice.caltech.edu/admissions
--     Stored USD 50 000 is Caltech's published twelve-month PhD stipend rate
--     from 1 September 2026, not a computed package value.
-- ---------------------------------------------------------------------------
UPDATE scholarships SET
  degree_levels = '["PhD"]',
  coverage_type = 'Full Tuition + Stipend',
  amount_usd_value = 50000,
  award_amount = 50000,
  award_currency = 'USD',
  award_period = 'year',
  award_basis = 'fixed',
  deadline = 'December 1 to January 15 - Caltech graduate application window for entry the following fall',
  deadline_date = NULL,
  deadline_type = 'range',
  deadline_range_start = '2026-12-01',
  deadline_range_end = '2027-01-15',
  expected_deadline_period = 'For fall 2027 entry the application window runs from 1 December 2026 to 15 January 2027. Some options review late applications, but a late applicant may be at a disadvantage in the allocation of financial assistance.',
  eligible_majors = '["All Majors"]',
  eligible_countries = '["All"]',
  min_gpa = NULL,
  min_ielts = NULL,
  required_documents = '["Caltech graduate application to the academic option of choice","Transcripts","Personal statement","Letters of recommendation","Evidence of work authorisation where the funding source requires it"]',
  english_requirements = 'The funding policy sets no English requirement of its own; the English proficiency requirement of the admitting Caltech graduate option applies.',
  funding_type = 'Institute fellowship, research assistantship or teaching assistantship awarded with admission and continued subject to satisfactory progress',
  living_allowance = NULL,
  travel_allowance = NULL,
  application_fee = NULL,
  website_url = 'https://gradoffice.caltech.edu/financialsupport',
  source_url = 'https://gradoffice.caltech.edu/financialsupport',
  application_url = 'https://www.gradoffice.caltech.edu/admissions',
  opening_date = '2026-12-01',
  rounds = '[]',
  recurrence = 'annual',
  expected_opening_period = NULL,
  application_status = 'upcoming',
  last_verified_at = NOW(),
  last_updated_at = NOW(),
  verification_status = 'verified',
  source_reliability = 10
WHERE id = 20;

-- ---------------------------------------------------------------------------
-- university_scholarships cards
-- ---------------------------------------------------------------------------
UPDATE university_scholarships SET availability_status='Yes', verification_status='verified', last_verified_at=NOW(), source_url='https://sfs.mit.edu/undergraduate-students/the-cost-of-attendance/making-mit-affordable/' WHERE id=544;
UPDATE university_scholarships SET availability_status='Yes', verification_status='verified', last_verified_at=NOW(), source_url='https://oge.mit.edu/fellowships/presidential-graduate-fellowship-program/' WHERE id=554;
UPDATE university_scholarships SET availability_status='Yes', verification_status='verified', last_verified_at=NOW(), source_url='https://financialaid.stanford.edu/undergrad/how/international.html' WHERE id=557;
UPDATE university_scholarships SET availability_status='Yes', verification_status='verified', last_verified_at=NOW(), source_url='https://college.harvard.edu/financial-aid/apply-financial-aid/prospective-students' WHERE id=553;
UPDATE university_scholarships SET availability_status='Yes', verification_status='verified', last_verified_at=NOW(), source_url='https://gsas.harvard.edu/academics/fellowships/internal-fellowships/internal-research-fellowships' WHERE id=558;
UPDATE university_scholarships SET availability_status='Yes', verification_status='verified', last_verified_at=NOW(), source_url='https://www.finaid.caltech.edu/applying/how/newinternationalrd' WHERE id=10;
UPDATE university_scholarships SET availability_status='Yes', verification_status='verified', last_verified_at=NOW(), source_url='https://gradoffice.caltech.edu/financialsupport' WHERE id=520;

COMMIT;

-- ---------------------------------------------------------------------------
-- Verification (all columns must be false; degree_levels apostrophe check is
-- expected to be true for the two "PhD" rows because PhD carries no apostrophe)
-- ---------------------------------------------------------------------------
SELECT id, title, coverage_type, amount_usd_value, award_amount, award_currency, deadline_type, source_reliability,
  (description IS NULL OR length(description) < 60) AS bad_desc,
  (requirements IS NULL OR funding_type IS NULL OR tuition_coverage IS NULL OR deadline IS NULL OR english_requirements IS NULL) AS bad_fields,
  (degree_levels IS NULL OR eligible_majors IS NULL OR source_url IS NULL OR website_url IS NULL OR award_basis IS NULL OR required_documents IS NULL OR eligible_countries IS NULL) AS bad_more,
  (coverage_type NOT IN ('Full Tuition + Stipend','Full Tuition','Partial Tuition','Full Funding','Partial Funding','Tuition Waiver','Living Stipend','Unspecified')) AS noncanon,
  (website_url ~ '^https?://(www\.)?[^/]+/?$') AS bare,
  (required_documents::text NOT LIKE '[%') AS bad_json,
  (eligible_countries::text NOT LIKE '[%') AS bad_countries,
  (notes IS NULL OR length(notes) < 200) AS bad_notes
FROM scholarships WHERE id IN (1,2,6,9,10,19,20) ORDER BY id;
