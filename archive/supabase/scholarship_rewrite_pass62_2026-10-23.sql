-- ScholarBridgeAi — scholarship rewrite, pass 62 (US rows written in passes 30-31, re-verified)
-- Date: 2026-10-26
-- Project: zkdguzbdopfedkffsatk (Postgres 17)
-- Rows: 495 Pitt, 538 ASU, 605 JHU, 628 MSU, 694 UC Davis, 702 UCSD, 706 UMass,
--       749 UMN, 757 Rochester, 803 Yale, 815 Princeton
--
-- NOTE ON THIS FILE
-- The statements below reproduce the structural fields of every row (amounts, basis,
-- coverage, deadlines, JSON arrays, URLs, reliability). The long prose fields
-- (description, requirements, tuition_coverage, notes) were written in full directly
-- against the database and are summarised in
-- docs/SCHOLARSHIP_REWRITE_PASS_62_2026-10-23.md.
--
-- The governing rule for this pass: seven rows carried a band CEILING as if it were a
-- fixed award, and three rows carried an AVERAGE as if it were an award. The ceilings stay
-- in amount_usd_value with award_basis = 'range' and are labelled as ceilings; the averages
-- move to amount 0 / award_amount NULL with the figure kept in the prose.

BEGIN;

-- 495 University of Pittsburgh international merit scholarships
-- Source: financialaid.pitt.edu/types-of-aid/scholarships/international-student-scholarships/
UPDATE scholarships SET
  degree_levels = '["Bachelor''s"]', coverage_type = 'Partial Tuition',
  amount_usd_value = 10000, award_amount = 10000, award_currency = 'USD',
  award_period = 'year', award_basis = 'range',
  deadline = 'February 1 - the application for admission and all supporting credentials must be complete by this date for scholarship review',
  deadline_date = '2027-02-01', deadline_type = 'fixed',
  deadline_range_start = NULL, deadline_range_end = NULL,
  expected_deadline_period = 'Rolling review from October; every selected student is notified by 1 April; fall admission only.',
  eligible_majors = '["All Majors"]', eligible_countries = '["All"]',
  min_gpa = NULL, min_ielts = NULL,
  required_documents = '["University of Pittsburgh international first-year application","Secondary school academic records with certified English translations","English proficiency test scores","SAT or ACT scores where available","International student short-answer response, or the Common Application essay or a personal statement"]',
  english_requirements = 'The scholarship sets no score of its own; the English proficiency requirement of Pittsburgh international admission applies.',
  funding_type = 'Merit-based partial tuition scholarship for international first-year students',
  accommodation = NULL, living_allowance = NULL, travel_allowance = NULL, application_fee = NULL,
  website_url = 'https://financialaid.pitt.edu/types-of-aid/scholarships/international-student-scholarships/',
  source_url = 'https://financialaid.pitt.edu/types-of-aid/scholarships/international-student-scholarships/',
  application_url = 'https://admissions.pitt.edu/international/international-first-year-students/',
  opening_date = NULL, rounds = '[]', recurrence = 'annual', expected_opening_period = NULL,
  application_status = 'open', last_verified_at = NOW(), last_updated_at = NOW(),
  verification_status = 'verified', source_reliability = 10
WHERE id = 495;

-- 538 Arizona State University New American University Scholarship (international)
-- Source: tuition.asu.edu/new-american-university/international
UPDATE scholarships SET
  degree_levels = '["Bachelor''s"]', coverage_type = 'Partial Tuition',
  amount_usd_value = 17500, award_amount = 17500, award_currency = 'USD',
  award_period = 'year', award_basis = 'range',
  deadline = 'No separate scholarship deadline - every admitted international first-year student is reviewed automatically',
  deadline_date = NULL, deadline_type = 'automatic',
  deadline_range_start = NULL, deadline_range_end = NULL,
  expected_deadline_period = 'Rolling after admission; admitted before 1 October means notification from the first week of October, later admits about ten business days after admission.',
  eligible_majors = '["All Majors"]', eligible_countries = '["All"]',
  min_gpa = NULL, min_ielts = NULL,
  required_documents = '["ASU international undergraduate application for admission","Secondary school transcripts showing the international GPA","English proficiency test scores","SAT or ACT scores, optional but able to support a higher award","Financial documentation for the I-20"]',
  english_requirements = 'English proficiency scores set the scholarship band and the university also applies its own admission requirement.',
  funding_type = 'Merit-based tuition scholarship for international students, valued in bands by GPA and English proficiency',
  accommodation = NULL, living_allowance = NULL, travel_allowance = NULL, application_fee = NULL,
  website_url = 'https://tuition.asu.edu/new-american-university/international',
  source_url = 'https://tuition.asu.edu/new-american-university/international',
  application_url = 'https://tuition.asu.edu/new-american-university/international',
  opening_date = NULL, rounds = '[]', recurrence = 'annual', expected_opening_period = NULL,
  application_status = 'open', last_verified_at = NOW(), last_updated_at = NOW(),
  verification_status = 'verified', source_reliability = 10
WHERE id = 538;

-- 605 Johns Hopkins need-based aid
-- Sources: sfs.jhu.edu/tuition-promise/, sfs.jhu.edu/applying-for-financial-aid/,
--          sfs.jhu.edu, apply.jhu.edu/international-applicants/
UPDATE scholarships SET
  degree_levels = '["Bachelor''s"]', coverage_type = 'Full Funding',
  amount_usd_value = 0, award_amount = NULL, award_currency = 'USD',
  award_period = 'year', award_basis = 'need_based',
  deadline = 'January 15 - financial aid application and all required documents',
  deadline_date = NULL, deadline_type = 'fixed',
  deadline_range_start = NULL, deadline_range_end = NULL,
  expected_deadline_period = 'CSS Profile opens 1 October; every document is due 15 January; offers appear in mid-June. International award holders do not reapply.',
  eligible_majors = '["All Majors"]', eligible_countries = '["All"]',
  min_gpa = NULL, min_ielts = NULL,
  required_documents = '["Johns Hopkins undergraduate application","Certification of Finances form, required of all international citizens","CSS Profile with code 5332, for international citizens who request aid","Parents'' income and tax documentation, submitted through IDOC if requested","FAFSA with code E00473, for US citizens and permanent residents only"]',
  english_requirements = 'The award sets no score; Hopkins recommends TOEFL, IELTS, Duolingo or Cambridge English for applicants whose first language is not English.',
  funding_type = 'Need-based scholarship and grant aid under a need-blind, no-loan policy',
  accommodation = NULL, living_allowance = NULL, travel_allowance = NULL, application_fee = NULL,
  website_url = 'https://sfs.jhu.edu/tuition-promise/',
  source_url = 'https://sfs.jhu.edu/applying-for-financial-aid/',
  application_url = 'https://apply.jhu.edu/international-applicants/',
  opening_date = NULL, rounds = '[]', recurrence = 'annual', expected_opening_period = NULL,
  application_status = 'open', last_verified_at = NOW(), last_updated_at = NOW(),
  verification_status = 'verified', source_reliability = 10
WHERE id = 605;

-- 628 Michigan State University Non-resident Scholarship
-- Source: admissions.msu.edu/cost-aid/scholarships/international
UPDATE scholarships SET
  degree_levels = '["Bachelor''s"]', coverage_type = 'Partial Tuition',
  amount_usd_value = 18000, award_amount = 18000, award_currency = 'USD',
  award_period = 'year', award_basis = 'range',
  deadline = 'No separate scholarship deadline - every admitted international first-year student is reviewed automatically',
  deadline_date = NULL, deadline_type = 'automatic',
  deadline_range_start = NULL, deadline_range_end = NULL,
  expected_deadline_period = 'Scholarship decisions are released by mid-February; the admission application is the only submission.',
  eligible_majors = '["All Majors"]', eligible_countries = '["All"]',
  min_gpa = NULL, min_ielts = NULL,
  required_documents = '["Michigan State University international undergraduate application","Secondary school transcripts","English proficiency test scores","Financial documentation for the I-20"]',
  english_requirements = 'The scholarship sets no score of its own; the English proficiency requirement of MSU international admission applies.',
  funding_type = 'Merit-based partial tuition scholarship for international students, awarded in levels',
  accommodation = NULL, living_allowance = NULL, travel_allowance = NULL, application_fee = NULL,
  website_url = 'https://admissions.msu.edu/cost-aid/scholarships/international',
  source_url = 'https://admissions.msu.edu/cost-aid/scholarships/international',
  application_url = 'https://admissions.msu.edu/cost-aid/scholarships/international',
  opening_date = NULL, rounds = '[]', recurrence = 'annual', expected_opening_period = NULL,
  application_status = 'open', last_verified_at = NOW(), last_updated_at = NOW(),
  verification_status = 'verified', source_reliability = 10
WHERE id = 628;

-- 694 UC Davis Regents Scholarship
-- Source: financialaid.ucdavis.edu/scholarships/campus/awards/regents
-- reliability 8: award and deadline verified, international eligibility NOT published
-- (the linked admissions page answered HTTP 403).
UPDATE scholarships SET
  degree_levels = '["Bachelor''s"]', coverage_type = 'Partial Tuition',
  amount_usd_value = 7500, award_amount = 7500, award_currency = 'USD',
  award_period = 'year', award_basis = 'fixed',
  deadline = 'December 2 - the UC application for admission and scholarships must be received by this date',
  deadline_date = '2026-12-02', deadline_type = 'fixed',
  deadline_range_start = NULL, deadline_range_end = NULL,
  expected_deadline_period = 'Consideration is automatic from the UC application filed by 2 December; no other documentation unless the scholarship office asks.',
  eligible_majors = '["All Majors"]', eligible_countries = '["All"]',
  min_gpa = '3.25', min_ielts = NULL,
  required_documents = '["University of California application for admission and scholarships","No additional documentation unless the scholarship office requests it","Evidence of financial need for the supplementary stipend, where applicable"]',
  english_requirements = 'The scholarship sets no score of its own; the English proficiency requirement of UC Davis undergraduate admission applies.',
  funding_type = 'Merit-based undergraduate honour award with an optional need-based stipend',
  accommodation = NULL, living_allowance = NULL, travel_allowance = NULL, application_fee = NULL,
  website_url = 'https://financialaid.ucdavis.edu/scholarships/campus/awards/regents',
  source_url = 'https://financialaid.ucdavis.edu/scholarships/campus/awards/regents',
  application_url = 'https://admission.universityofcalifornia.edu/apply-now.html',
  opening_date = NULL, rounds = '[]', recurrence = 'annual', expected_opening_period = NULL,
  application_status = 'open', last_verified_at = NOW(), last_updated_at = NOW(),
  verification_status = 'verified', source_reliability = 8
WHERE id = 694;

-- 702 UC San Diego Regents and Triton Scholars
-- Sources: fas.ucsd.edu/types/scholarships/regents-scholarships-for-entering-freshmen.html,
--          fas.ucsd.edu/types/scholarships/entering-freshmen.html
-- Regents eligibility excludes international citizens; Triton Scholars is the open route.
UPDATE scholarships SET
  degree_levels = '["Bachelor''s"]', coverage_type = 'Partial Tuition',
  amount_usd_value = 20000, award_amount = 20000, award_currency = 'USD',
  award_period = 'year', award_basis = 'range',
  deadline = 'November 30 - the UC application for admission and scholarships',
  deadline_date = '2026-11-30', deadline_type = 'fixed',
  deadline_range_start = NULL, deadline_range_end = NULL,
  expected_deadline_period = 'Both awards are decided from the UC application filed by 30 November; Regents recipients are notified when college financing plans appear.',
  eligible_majors = '["All Majors"]', eligible_countries = '["All"]',
  min_gpa = NULL, min_ielts = NULL,
  required_documents = '["University of California application for admission and scholarships","No further documentation for the Regents Scholarship","Supporting documentation if the restricted-criteria review requests it"]',
  english_requirements = 'Neither award sets an English test score; the English proficiency requirement of UC San Diego admission applies.',
  funding_type = 'Merit-based honourarium (Regents, closed to international citizens) and merit-based non-resident award (Triton Scholars)',
  accommodation = NULL, living_allowance = NULL, travel_allowance = NULL, application_fee = NULL,
  website_url = 'https://fas.ucsd.edu/types/scholarships/regents-scholarships-for-entering-freshmen.html',
  source_url = 'https://fas.ucsd.edu/types/scholarships/entering-freshmen.html',
  application_url = 'https://admission.universityofcalifornia.edu/apply-now.html',
  opening_date = NULL, rounds = '[]', recurrence = 'annual', expected_opening_period = NULL,
  application_status = 'open', last_verified_at = NOW(), last_updated_at = NOW(),
  verification_status = 'verified', source_reliability = 10
WHERE id = 702;

-- 706 UMass Amherst international first-year merit awards
-- Source: umass.edu/admissions/undergraduate-admissions/apply/international-students/financial-and-visa-information
UPDATE scholarships SET
  degree_levels = '["Bachelor''s"]', coverage_type = 'Partial Tuition',
  amount_usd_value = 16000, award_amount = 16000, award_currency = 'USD',
  award_period = 'year', award_basis = 'range',
  deadline = 'No separate scholarship deadline - admitted international first-year students are considered automatically',
  deadline_date = NULL, deadline_type = 'automatic',
  deadline_range_start = NULL, deadline_range_end = NULL,
  expected_deadline_period = 'Consideration begins once the student is admitted; no scholarship deadline apart from the admission deadline of the term.',
  eligible_majors = '["All Majors"]', eligible_countries = '["All"]',
  min_gpa = NULL, min_ielts = NULL,
  required_documents = '["UMass Amherst international first-year application","Secondary school transcripts","English proficiency test scores","Certification of finances for the first calendar year","Documentation for the I-20, requested after the offer is accepted"]',
  english_requirements = 'The award sets no score of its own; the English proficiency requirement of UMass Amherst international admission applies.',
  funding_type = 'Academic merit award for international first-year undergraduates',
  accommodation = NULL, living_allowance = NULL, travel_allowance = NULL, application_fee = NULL,
  website_url = 'https://www.umass.edu/admissions/undergraduate-admissions/apply/international-students/financial-and-visa-information',
  source_url = 'https://www.umass.edu/admissions/undergraduate-admissions/apply/international-students/financial-and-visa-information',
  application_url = 'https://www.umass.edu/admissions/undergraduate-admissions/apply/international-students/financial-and-visa-information',
  opening_date = NULL, rounds = '[]', recurrence = 'annual', expected_opening_period = NULL,
  application_status = 'open', last_verified_at = NOW(), last_updated_at = NOW(),
  verification_status = 'verified', source_reliability = 10
WHERE id = 706;

-- 749 University of Minnesota Global Excellence Scholarship
-- Source: admissions.tc.umn.edu/global-excellence-scholarships
UPDATE scholarships SET
  degree_levels = '["Bachelor''s"]', coverage_type = 'Partial Tuition',
  amount_usd_value = 20000, award_amount = 20000, award_currency = 'USD',
  award_period = 'year', award_basis = 'range',
  deadline = 'No separate scholarship deadline - apply for admission by the freshman application deadline and submit the Certification of Finances form',
  deadline_date = NULL, deadline_type = 'automatic',
  deadline_range_start = NULL, deadline_range_end = NULL,
  expected_deadline_period = 'Every international applicant who meets the admission deadline and submits the Certification of Finances form is considered automatically.',
  eligible_majors = '["All Majors"]', eligible_countries = '["All"]',
  min_gpa = NULL, min_ielts = NULL,
  required_documents = '["University of Minnesota Twin Cities international application for admission","Certification of Finances form","Secondary school transcripts","English proficiency test scores"]',
  english_requirements = 'The scholarship sets no score of its own; the English proficiency requirement of University of Minnesota international admission applies.',
  funding_type = 'Competitive merit-based non-resident tuition waiver for international students',
  accommodation = NULL, living_allowance = NULL, travel_allowance = NULL, application_fee = NULL,
  website_url = 'https://admissions.tc.umn.edu/global-excellence-scholarships',
  source_url = 'https://admissions.tc.umn.edu/global-excellence-scholarships',
  application_url = 'https://admissions.tc.umn.edu/certification-finances-form',
  opening_date = NULL, rounds = '[]', recurrence = 'annual', expected_opening_period = NULL,
  application_status = 'open', last_verified_at = NOW(), last_updated_at = NOW(),
  verification_status = 'verified', source_reliability = 10
WHERE id = 749;

-- 757 University of Rochester Meliora Scholarship
-- Source: rochester.edu/financial-aid/scholarships/
UPDATE scholarships SET
  degree_levels = '["Bachelor''s"]', coverage_type = 'Partial Tuition',
  amount_usd_value = 35000, award_amount = 35000, award_currency = 'USD',
  award_period = 'year', award_basis = 'range',
  deadline = 'No separate deadline - all admitted undergraduate applicants are considered during the admission process',
  deadline_date = NULL, deadline_type = 'automatic',
  deadline_range_start = NULL, deadline_range_end = NULL,
  expected_deadline_period = 'Merit scholarships are awarded during the admission process and renewed annually with satisfactory performance and full-time status.',
  eligible_majors = '["All Majors"]', eligible_countries = '["All"]',
  min_gpa = NULL, min_ielts = NULL,
  required_documents = '["University of Rochester undergraduate application","Secondary school transcripts","English proficiency test scores where required","Financial aid application, if need-based aid is also sought","A nomination from an unrelated recommender, for the Handler Scholarship only"]',
  english_requirements = 'The Meliora Scholarship sets no English test score; the English proficiency requirement of Rochester undergraduate admission applies.',
  funding_type = 'Merit-based tuition scholarship awarded through the admission review',
  accommodation = NULL, living_allowance = NULL, travel_allowance = NULL, application_fee = NULL,
  website_url = 'https://www.rochester.edu/financial-aid/scholarships/',
  source_url = 'https://www.rochester.edu/financial-aid/scholarships/',
  application_url = 'https://www.rochester.edu/financial-aid/scholarships/',
  opening_date = NULL, rounds = '[]', recurrence = 'annual', expected_opening_period = NULL,
  application_status = 'open', last_verified_at = NOW(), last_updated_at = NOW(),
  verification_status = 'verified', source_reliability = 10
WHERE id = 757;

-- 803 Yale need-based aid
-- Source: admissions.yale.edu/affordability
UPDATE scholarships SET
  degree_levels = '["Bachelor''s"]', coverage_type = 'Full Funding',
  amount_usd_value = 0, award_amount = NULL, award_currency = 'USD',
  award_period = 'year', award_basis = 'need_based',
  deadline = 'November 1 (Early Action, US citizens and permanent residents); December 1 (Early Action, international citizens); February 15 (Regular Decision); April 1 (Transfer and Eli Whitney)',
  deadline_date = NULL, deadline_type = 'fixed',
  deadline_range_start = NULL, deadline_range_end = NULL,
  expected_deadline_period = 'Aid documents follow the round; the separate 1 December date for international Early Action applicants is the one that matters for Uzbek applicants.',
  eligible_majors = '["All Majors"]', eligible_countries = '["All"]',
  min_gpa = NULL, min_ielts = NULL,
  required_documents = '["Yale undergraduate application with the financial aid request indicated","CSS Profile with code 3987","Parents'' and student''s tax returns, or a Non-Tax Filer''s Statement, submitted through IDOC","FAFSA with code 001426, for US citizens and permanent residents only"]',
  english_requirements = 'The award sets no score of its own; the English proficiency requirement of Yale undergraduate admission applies.',
  funding_type = 'Need-based Yale Scholarship grants under a need-blind, no-loan policy',
  accommodation = NULL, living_allowance = NULL, travel_allowance = NULL, application_fee = NULL,
  website_url = 'https://admissions.yale.edu/affordability',
  source_url = 'https://admissions.yale.edu/affordability',
  application_url = 'https://finaid.yale.edu/apply/prospective',
  opening_date = NULL, rounds = '[]', recurrence = 'annual', expected_opening_period = NULL,
  application_status = 'open', last_verified_at = NOW(), last_updated_at = NOW(),
  verification_status = 'verified', source_reliability = 10
WHERE id = 803;

-- 815 Princeton need-based aid
-- Source: admission.princeton.edu/cost-aid
UPDATE scholarships SET
  degree_levels = '["Bachelor''s"]', coverage_type = 'Full Funding',
  amount_usd_value = 0, award_amount = NULL, award_currency = 'USD',
  award_period = 'year', award_basis = 'need_based',
  deadline = 'November 9 (Early Action); February 1 (Regular Decision); March 9 (Transfer)',
  deadline_date = NULL, deadline_type = 'fixed',
  deadline_range_start = NULL, deadline_range_end = NULL,
  expected_deadline_period = 'The PFAA, the parents'' 2025 tax return and W-2 statements, the FAFSA where applicable and the noncustodial form are all due on the admission round date.',
  eligible_majors = '["All Majors"]', eligible_countries = '["All"]',
  min_gpa = NULL, min_ielts = NULL,
  required_documents = '["Princeton undergraduate application for admission","Princeton Financial Aid Application (PFAA)","Parents'' 2025 federal income tax return and W-2 statements","Noncustodial parent form or waiver request","FAFSA, where the applicant is eligible for federal student aid"]',
  english_requirements = 'The award sets no score of its own; the English proficiency requirement of Princeton undergraduate admission applies.',
  funding_type = 'Need-based grant aid under a need-blind, no-loan policy applied equally to international students',
  accommodation = NULL, living_allowance = NULL, travel_allowance = NULL, application_fee = NULL,
  website_url = 'https://admission.princeton.edu/cost-aid',
  source_url = 'https://admission.princeton.edu/cost-aid',
  application_url = 'https://finaid.princeton.edu/apply-aid-prospective-students',
  opening_date = NULL, rounds = '[]', recurrence = 'annual', expected_opening_period = NULL,
  application_status = 'open', last_verified_at = NOW(), last_updated_at = NOW(),
  verification_status = 'verified', source_reliability = 10
WHERE id = 815;

COMMIT;

-- Card rows refreshed in the same pass (availability_status / source_url / last_verified_at):
-- 493, 282, 30, 276, 101, 65, 111, 206, 220, 382, 381
