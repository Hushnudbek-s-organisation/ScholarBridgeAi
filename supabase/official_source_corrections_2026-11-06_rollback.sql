-- Reviewable VALUE rollback — 2026-11-06 (NOT APPLIED BY THE AGENT)
-- ---------------------------------------------------------------------------
-- Use ONLY after forward migration official_source_corrections_2026-11-06.sql
-- has been applied and an operator explicitly decides to restore the two
-- observed 2026-11-06 catalogue rows. This file does NOT connect to production,
-- does NOT deploy, does NOT delete a row, and does NOT drop a column/table.
--
-- It restores only the fields changed by the forward migration. Official MIT
-- source rows and their university_sources links are intentionally kept: they
-- are useful evidence, and deleting them could break other references. A
-- separate, reviewed administrative action would be required to remove them.
--
-- The schema corrections are NOT blindly reverted. amount_usd_value is made
-- nullable and the invented 6.5 / ["All"] / ["Master","PhD"] defaults are
-- removed because they turn unknown values into false facts. Restoring NOT NULL
-- is conditional on there being no NULL left; restoring the fabricated defaults
-- is deliberately left commented out. Review each block before use.
-- ---------------------------------------------------------------------------

BEGIN;

DO $$
DECLARE
  yenching_count integer;
  yenching_id integer;
  mit_count integer;
  mit_id integer;
BEGIN
  SELECT count(*), min(s.id) INTO yenching_count, yenching_id
  FROM public.scholarships s
  WHERE s.title ILIKE '%Yenching Academy%'
    AND s.provider ILIKE '%Peking University%'
    AND (s.website_url ILIKE '%yenchingacademy.pku.edu.cn%'
      OR s.source_url ILIKE '%yenchingacademy.pku.edu.cn%'
      OR EXISTS (
        SELECT 1 FROM public.scholarship_sources ss
        JOIN public.sources src ON src.id = ss.source_id
        WHERE ss.scholarship_id = s.id
          AND (src.domain = 'yenchingacademy.pku.edu.cn'
            OR src.url ILIKE '%yenchingacademy.pku.edu.cn%')
      ))
    AND s.notes ILIKE '%Re-read the official 2027-cohort admissions page%';

  IF yenching_count <> 1 THEN
    RAISE EXCEPTION 'Yenching rollback found % corrected rows; expected exactly one. No rollback was made.', yenching_count;
  END IF;

  UPDATE public.scholarships
  SET
    amount_usd_value = 5040,
    award_amount = NULL,
    award_currency = 'CNY',
    award_period = 'month',
    award_basis = 'full_tuition',
    min_ielts = NULL,
    english_requirements = 'English proficiency evidence is required; the official page does not publish minimum scores',
    living_allowance = 3000,
    travel_allowance = NULL,
    accommodation = '',
    tuition_coverage = 'Full tuition',
    coverage_type = 'Full Tuition + Stipend',
    funding_type = 'Fully funded',
    eligible_countries = '["Uzbekistan","All Countries"]',
    eligible_majors = '["All Majors"]',
    degree_levels = '["Master"]',
    required_documents = '["Completed online scholarship application form","Official high school transcripts demonstrating academic excellence","Personal essay or responses to specific application prompt questions","Proof of English proficiency (IELTS, TOEFL, or English-medium instruction certificate)","One or two letters of recommendation from academic instructors","Resume / CV highlighting leadership, community service, or technical projects","Copy of international passport or government ID"]',
    description = 'Fully funded two-year master''s fellowship in China Studies at Peking University, open to graduates of any discipline. The fellowship covers tuition, on-campus accommodation, a monthly stipend, medical insurance, one round-trip airfare and field-study costs; about 120 scholars are admitted each year, most of them international.',
    requirements = 'Non-Chinese citizen with a valid passport; a bachelor''s degree in any field (or graduating by 31 August 2027); strong academic record and demonstrated leadership; evidence of English proficiency in an accepted test. Documents: online application form, personal statement, statement of research interest, CV, official transcripts, diploma or enrolment certificate, two academic references. Apply through apply.yca.pku.edu.cn by 30 November 2026, 09:00 Beijing time.',
    notes = 'Verified 2026-10-23 on yenchingacademy.pku.edu.cn/ADMISSIONS.htm: applications for the 2027 cohort opened on 1 September 2026 and close on 30 November 2026 at 09:00 Beijing time; partner-university students must also pass their home university pre-selection. Minimum English test scores are deliberately left out because the official admissions page does not print them - only third-party blogs do.',
    last_verified_at = TIMESTAMP '2026-11-01 16:34:30.392362',
    verification_status = 'verified',
    source_url = 'https://yenchingacademy.pku.edu.cn/ADMISSIONS.htm'
  WHERE id = yenching_id;

  SELECT count(*), min(u.id) INTO mit_count, mit_id
  FROM public.universities u
  WHERE (u.name ILIKE '%Massachusetts Institute of Technology%'
      OR u.canonical_name ILIKE '%Massachusetts Institute of Technology%')
    AND (u.website_url ILIKE '%mit.edu%' OR u.source_url ILIKE '%mit.edu%')
    AND u.min_gpa IS NULL
    AND u.min_sat IS NULL
    AND u.acceptance_rate IS NULL
    AND u.verification_status = 'review_needed'
    AND u.data_source ILIKE '%mitadmissions.org/apply/firstyear/tests-scores/%';

  IF mit_count <> 1 THEN
    RAISE EXCEPTION 'MIT rollback found % corrected rows; expected exactly one. No rollback was made.', mit_count;
  END IF;

  UPDATE public.universities
  SET
    min_gpa = 3.91,
    min_sat = 1520,
    acceptance_rate = 4.5,
    data_source = 'Top 300 Universities dataset (user PDF, 2026)',
    verification_status = 'verified'
  WHERE id = mit_id;
END $$;

-- Restore NOT NULL only if no legitimate unknown value remains. This is a
-- guard, not a silent bulk conversion of NULL to 0.
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.scholarships WHERE amount_usd_value IS NULL) THEN
    ALTER TABLE public.scholarships
      ALTER COLUMN amount_usd_value SET NOT NULL;
  ELSE
    RAISE NOTICE 'Keeping amount_usd_value nullable: % rows still carry a legitimate unknown value.',
      (SELECT count(*) FROM public.scholarships WHERE amount_usd_value IS NULL);
  END IF;
END $$;

-- Deliberately NOT restored: the invented min_ielts DEFAULT 6.5 and the
-- generic eligible_majors / degree_levels defaults. Re-enabling them would
-- recreate the original false-fact defect. If an operator truly wants them,
-- add an explicit, separately reviewed statement here.
-- ALTER TABLE public.scholarships ALTER COLUMN min_ielts SET DEFAULT 6.5;
-- ALTER TABLE public.scholarships ALTER COLUMN eligible_majors SET DEFAULT '["All"]'::text;
-- ALTER TABLE public.scholarships ALTER COLUMN degree_levels SET DEFAULT '["Master","PhD"]'::text;

COMMIT;
