-- ============================================================================
--  Integrity repair pass — 2026-10-23
--  Project: zkguzbdopfedkffsatk
--
--  Found by re-auditing every table after the duplicate merge. Three classes of
--  defect, all of which made the app show something that was not true.
--
--  1. 84 rows were marked `verified` but had never been checked.
--     The old enrichment import wrote one row per programme with a random
--     deadline and the note "Fall 2027 international admissions cycle for BS in
--     …". Ten universities still carried them as *verified*:
--         MIT       1 Jan / 20 Jan / 1 Feb / 15 Dec   (real: RD 4 Jan 2027)
--         Stanford  15 Nov                              (real: RD 5 Jan 2027)
--         Harvard   1 Dec                               (real: RD 1 Jan 2027)
--         Oxford    8 Jan / 10 Jan / 6 Mar              (real: 15 Oct 2026)
--         Cambridge 8 Jan / 4 Dec                       (real: 15 Oct 2026)
--         Imperial  31 Mar                              (real: 13 Jan 2027)
--         UCL       31 Jan                              (real: 13 Jan 2027)
--         ETH       15 Dec                              (real: 31 Mar 2027)
--         NUS       30 Nov                              (real: 17 Feb 2027)
--         Caltech   1 Dec                               (real: RD 4 Jan 2027)
--     All rows for those ten universities were deleted and replaced with one
--     verified row each, read from the university's own page on 2026-10-23.
--
--  2. Redundant flags disagreed with the source of truth.
--     16 rows: verification_status = 'verified' but is_estimated = true
--     22 rows: verification_status = 'verified' but is_verified = false
--     Both booleans are now mirrors of verification_status.
--
--  3. academic_year / cycle_year drifted apart.
--     199 verified rows said academic_year '2026-2027' with cycle_year 2027;
--      7 said '2027' with no range; 21 said '2027-2028' with cycle_year 2028.
--     The detail API parsed the year out of academic_year, so a Fall 2027
--     deadline rendered as "2026". The API now reads the real column, and every
--     row's academic_year starts with its cycle_year.
--
--  Also repaired: four Uzbek university scholarship rows had an amount but no
--  currency and no source URL; Auckland's award still pointed at a deadline that
--  closed on 21 October 2026; 195 university-owned scholarships were missing
--  from university_scholarships.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 1. The ten universities whose "verified" rows were never checked.
--    Their fabricated rows are removed first; the replacement rows and their
--    sources are in the executed statements (see the doc for the full table).
-- ---------------------------------------------------------------------------
DELETE FROM application_cycles WHERE university_id IN (1, 2, 3, 4, 5, 6, 7, 8, 9, 10);

INSERT INTO application_cycles
  (university_id, academic_year, intake, application_type, opening_date, deadline,
   deadline_timezone, application_url, source_url, verification_status, cycle_year,
   deadline_type, is_estimated, is_active, is_verified, notes,
   application_fee, application_fee_currency)
VALUES
  (1, '2027-2028', 'Fall 2027', 'Regular Action', NULL, DATE '2027-01-04', 'America/New_York',
   'https://mitadmissions.org/apply/', 'https://mitadmissions.org/apply/firstyear/deadlines-requirements/',
   'verified', 2027, 'Regular Action', false, true, true,
   'MIT publishes two first-year rounds: Early Action due 1 November 2026 and Regular Action due 4 January 2027, both at 11:59 pm the applicant''s local time. Applying early carries no advantage. Read from mitadmissions.org on 2026-10-23.',
   75, 'USD'),
  (2, '2027-2028', 'September 2027 entry', 'UCAS equal consideration', DATE '2026-09-01', DATE '2027-01-13', 'Europe/London',
   'https://www.ucas.com/', 'https://www.imperial.ac.uk/study/apply/undergraduate/process/deadlines/',
   'verified', 2027, 'UCAS equal consideration', false, true, true,
   'Imperial College London: the UCAS equal-consideration deadline for all 2027-entry undergraduate courses is 13 January 2027, 18:00 UK time. MBBS Medicine and Graduate Entry Medicine close earlier, on 15 October 2026. Read from imperial.ac.uk on 2026-10-23.',
   NULL, 'GBP'),
  (3, '2027-2028', 'Fall 2027', 'Regular Decision', NULL, DATE '2027-01-05', 'America/Los_Angeles',
   'https://admission.stanford.edu/apply/first-year/', 'https://admission.stanford.edu/apply/first-year/',
   'verified', 2027, 'Regular Decision', false, true, true,
   'Stanford publishes Restrictive Early Action due 1 November 2026 and Regular Decision due 5 January 2027, 11:59 pm Pacific time. Applicants submitting the optional arts portfolio must file the Common Application by 15 October (REA) or 5 December (RD). Read from admission.stanford.edu on 2026-10-23.',
   100, 'USD'),
  (4, '2028-2029', 'October 2028 entry', 'UCAS early deadline', DATE '2026-09-01', DATE '2027-10-15', 'Europe/London',
   'https://www.ucas.com/', 'https://www.ox.ac.uk/admissions/undergraduate/applying/guide-for-applicants/ucas-application',
   'verified', 2028, 'UCAS early deadline (annual)', false, true, true,
   'Oxford: the UCAS deadline is 18:00 UK time on 15 October every year. The 2027-entry deadline was 15 October 2026 and has now passed, so this row carries the next annual occurrence (15 October 2027, for 2028 entry) — Oxford''s published rule, not a guess. Most courses also require an admissions test and some written work. Read from ox.ac.uk on 2026-10-23.',
   NULL, 'GBP'),
  (5, '2027-2028', 'Fall 2027', 'Regular Decision', NULL, DATE '2027-01-01', 'America/New_York',
   'https://college.harvard.edu/admissions/apply', 'https://college.harvard.edu/admissions/apply/first-year-applicants',
   'verified', 2027, 'Regular Decision', false, true, true,
   'Harvard College publishes Restrictive Early Action due 1 November 2026 and Regular Decision due 1 January 2027, 11:59 pm the applicant''s local time. Counsellors may submit supporting materials up to one week later. Read from college.harvard.edu on 2026-10-23.',
   NULL, 'USD'),
  (6, '2028-2029', 'October 2028 entry', 'UCAS early deadline', DATE '2026-09-01', DATE '2027-10-15', 'Europe/London',
   'https://www.ucas.com/', 'https://www.undergraduate.study.cam.ac.uk/apply/how/ucas-application',
   'verified', 2028, 'UCAS early deadline (annual)', false, true, true,
   'Cambridge: the UCAS deadline is 18:00 UK time on 15 October every year. The 2027-entry deadline was 15 October 2026 and has passed, so this row carries the next annual occurrence (15 October 2027, for 2028 entry). Cambridge additionally requires the My Cambridge Application form, due 22 October in the last cycle. Read from undergraduate.study.cam.ac.uk on 2026-10-23.',
   NULL, 'GBP'),
  (7, '2027-2028', 'Autumn 2027', 'Bachelor (non-Swiss certificate)', DATE '2026-12-01', DATE '2027-03-31', 'Europe/Zurich',
   'https://www.lehrbetrieb.ethz.ch/eApply/ealogin.view?lang=en', 'https://ethz.ch/en/studies/bachelor/application/non-swiss-matriculation-certificate/how-to-apply.html',
   'verified', 2027, 'Bachelor application window', false, true, true,
   'ETH Zurich: applicants with a non-Swiss upper secondary certificate apply from 1 December 2026 to 31 March 2027 (23:59 CET) for autumn semester 2027; only one programme may be chosen and study always starts in the autumn. Holders of a Swiss matura have until 30 April 2027. Read from ethz.ch on 2026-10-23.',
   150, 'CHF'),
  (8, '2027-2028', 'AY2027-28 (August 2027)', 'International Qualifications', DATE '2026-12-16', DATE '2027-02-17', 'Asia/Singapore',
   'https://www.nus.edu.sg/oam/admissions/important-dates', 'https://www.nus.edu.sg/oam/admissions/important-dates',
   'verified', 2027, 'International Qualifications window', false, true, true,
   'NUS: applicants presenting international qualifications apply for AY2027/28 between 16 December 2026 and 17 February 2027; the application is only complete once the SGD 20 fee and supporting documents are in. NUS High School Diploma closes 4 January 2027 and Singapore-Cambridge A-Level opens 18 February 2027. Read from nus.edu.sg on 2026-10-23.',
   20, 'SGD'),
  (9, '2027-2028', 'September 2027 entry', 'UCAS equal consideration', DATE '2026-09-01', DATE '2027-01-13', 'Europe/London',
   'https://www.ucas.com/', 'https://www.ucl.ac.uk/study/prospective-students/undergraduate/how-apply/ucas-explained',
   'verified', 2027, 'UCAS equal consideration', false, true, true,
   'UCL: all applications submitted through UCAS by 18:00 UK time on 13 January 2027 receive equal consideration. Medicine (A100) closes on 15 October 2026. Read from ucl.ac.uk on 2026-10-23.',
   NULL, 'GBP'),
  (10, '2027-2028', 'Fall 2027', 'Regular Decision', NULL, DATE '2027-01-04', 'America/Los_Angeles',
   'https://www.admissions.caltech.edu/apply/first-year-applicants', 'https://www.admissions.caltech.edu/apply/first-year-applicants/deadlines',
   'verified', 2027, 'Regular Decision', false, true, true,
   'Caltech publishes Restrictive Early Action due 1 November 2026 and Regular Decision due 4 January 2027; remaining materials are accepted to 10 January and the last accepted SAT/ACT sitting is 31 December 2026. Read from admissions.caltech.edu on 2026-10-23.',
   85, 'USD');

-- ---------------------------------------------------------------------------
-- 2. Redundant booleans become mirrors of verification_status
-- ---------------------------------------------------------------------------
UPDATE application_cycles
SET is_verified  = (verification_status = 'verified'),
    is_estimated = (verification_status <> 'verified')
WHERE is_verified  IS DISTINCT FROM (verification_status = 'verified')
   OR is_estimated IS DISTINCT FROM (verification_status <> 'verified');

-- ---------------------------------------------------------------------------
-- 3. academic_year and cycle_year must describe the same entry year
-- ---------------------------------------------------------------------------
UPDATE application_cycles SET academic_year = '2027-2028'
WHERE academic_year = '2027';

UPDATE application_cycles SET academic_year = '2027-2028'
WHERE academic_year = '2026-2027' AND cycle_year = 2027;

UPDATE application_cycles SET cycle_year = 2027
WHERE cycle_year = 2028 AND academic_year = '2027-2028';

-- ---------------------------------------------------------------------------
-- 4. Scholarships: currency, source and a deadline that has passed
-- ---------------------------------------------------------------------------
UPDATE scholarships
SET award_currency = 'USD',
    award_amount   = amount_usd_value,
    award_period   = 'year',
    award_basis    = 'variable',
    deadline_type  = 'not_published',
    source_url     = website_url,
    notes          = 'The value is the university''s annual tuition, i.e. the maximum an award can cover. 2026-10-23: no 2027/28 call is published yet, so the deadline is left empty rather than guessed.'
WHERE id IN (871, 872, 873, 874);

UPDATE scholarships
SET deadline      = 'The 21 October 2026 round for Semester 1 2027 has closed; the next round (Semester 2 2027) is not published yet',
    deadline_date = NULL,
    deadline_type = 'not_published',
    notes         = COALESCE(notes, '') || ' Update 2026-10-23: the Semester 1 2027 round closed on 21 October 2026. The award is offered twice a year; the Semester 2 2027 closing date is not published yet, so no future date is claimed.'
WHERE id = 494;

-- ---------------------------------------------------------------------------
-- 5. university_scholarships must not drift from scholarships.university_id
-- ---------------------------------------------------------------------------
INSERT INTO university_scholarships
  (university_id, scholarship_id, scholarship_name, availability_status, funding_type,
   max_scholarship, covers_tuition, covers_living_expenses, valued_aspect,
   eligibility_notes, official_url, source_url, verification_status)
SELECT s.university_id, s.id, s.title, 'available',
       COALESCE(NULLIF(s.funding_type, ''), 'Merit-based'),
       CASE WHEN s.award_amount > 0
            THEN COALESCE(s.award_currency, 'USD') || ' ' || s.award_amount::text || ' ' || COALESCE(s.award_period, 'year')
            ELSE COALESCE(s.tuition_coverage, 'Not published') END,
       COALESCE(s.coverage_type, '') ILIKE '%tuition%' OR COALESCE(s.tuition_coverage, '') ILIKE '%tuition%',
       COALESCE(s.coverage_type, '') ILIKE '%stipend%' OR COALESCE(s.tuition_coverage, '') ILIKE '%living%',
       COALESCE(s.funding_type, 'Merit-based'), s.requirements,
       s.website_url, COALESCE(s.source_url, s.website_url), s.verification_status
FROM scholarships s
WHERE s.is_active
  AND s.university_id IS NOT NULL
  AND NOT EXISTS (SELECT 1 FROM university_scholarships us WHERE us.scholarship_id = s.id)
ON CONFLICT (university_id, scholarship_name) DO NOTHING;

-- ---------------------------------------------------------------------------
-- 6. Result — every count below is a rule that must stay at zero
-- ---------------------------------------------------------------------------
SELECT
  (SELECT COUNT(*) FROM application_cycles WHERE verification_status = 'verified' AND deadline < CURRENT_DATE)                AS verified_in_the_past,
  (SELECT COUNT(*) FROM application_cycles WHERE verification_status = 'verified' AND (source_url IS NULL OR source_url = '')) AS verified_without_source,
  (SELECT COUNT(*) FROM application_cycles WHERE verification_status = 'verified' AND (notes IS NULL OR length(notes) < 20))   AS verified_without_note,
  (SELECT COUNT(*) FROM application_cycles WHERE is_verified IS DISTINCT FROM (verification_status = 'verified'))              AS is_verified_mismatch,
  (SELECT COUNT(*) FROM application_cycles WHERE is_estimated IS DISTINCT FROM (verification_status <> 'verified'))            AS is_estimated_mismatch,
  (SELECT COUNT(*) FROM application_cycles WHERE academic_year ~ '^[0-9]{4}'
      AND substring(academic_year from 1 for 4)::int <> cycle_year)                                                           AS year_mismatch,
  (SELECT COUNT(*) FROM scholarships WHERE is_active AND (award_currency IS NULL OR award_currency !~ '^[A-Z]{3}$'))            AS scholarship_without_currency,
  (SELECT COUNT(*) FROM scholarships s WHERE s.is_active AND s.university_id IS NOT NULL
      AND NOT EXISTS (SELECT 1 FROM university_scholarships us WHERE us.scholarship_id = s.id))                               AS scholarship_unlinked;
