-- ===========================================================================
-- VERSIONED FOLLOW-UP (v2) — 2026-11-06. NOT APPLIED BY THE AGENT.
-- ---------------------------------------------------------------------------
-- WHY A NEW FILE: `official_source_corrections_2026-11-06.sql` and
-- `security_evidence_research_2026-11-06.sql` are reviewable migrations that
-- may already have been applied in a staging environment. Editing either one
-- in place would silently change an applied migration. This file is a
-- versioned follow-up; it is safe to run AFTER them and is idempotent.
--
-- APPLY ORDER: security_evidence_research_2026-11-06.sql
--           -> official_source_corrections_2026-11-06.sql
--           -> official_source_followup_2026-11-06_v2.sql   (this file)
--
-- SOURCE EVIDENCE (official pages re-read 2026-11-06 with fetch_page):
--   https://mitadmissions.org/apply/firstyear/tests-scores/
--   https://mitadmissions.org/apply/process/stats/
--   https://mitadmissions.org/apply/firstyear/international/
--   https://yenchingacademy.pku.edu.cn/ADMISSIONS.htm
-- See docs/OFFICIAL_SOURCE_READ_2026-11-06.md for verbatim quotes.
--
-- HARD RULES:
--   * minimum != recommended; legacy TOEFL scale != new 1-6 scale;
--   * SAT middle-50 is an admitted-cohort statistic, NEVER a cutoff;
--   * acceptance rate is bound to a cohort + source, 4.5 and 4.6 are NOT
--     overwritten onto each other;
--   * a stipend with no official number stays `not_published`, never 0;
--   * ~120 students / ~75% international is a cohort statistic, NOT an
--     acceptance rate;
--   * `waived` / `conditional` / `not_applicable` are explicit states.
-- No student row, no delete, no truncate, no drop table, no bulk rewrite.
-- ===========================================================================

BEGIN;

-- 1. Extend the value_type CHECK instead of editing the applied migration.
--    `recommended_score` is distinct from `official_requirement` on purpose.
ALTER TABLE public.catalogue_facts
  DROP CONSTRAINT IF EXISTS catalogue_facts_value_type_check;
ALTER TABLE public.catalogue_facts
  ADD CONSTRAINT catalogue_facts_value_type_check
  CHECK (value_type IN (
    'official_requirement','recommended_score','observed_statistic','computed_fit',
    'planning_estimate','evidence_coverage','experimental_index',
    'historical_acceptance_rate','personal_admission_probability',
    'unknown','not_published','not_applicable','unverified'
  ));

-- 2. MIT — official testing facts, separated by meaning AND by scale.
--    UNIQUE(entity_type, entity_id, field_key, admission_cycle) keeps the
--    existing 4.5 / unspecified-cycle row intact; nothing is overwritten.
INSERT INTO public.catalogue_facts
  (entity_type, entity_id, field_key, value_numeric, value_text, unit, degree_level,
   admission_cycle, source_url, verified_at, verification_status, value_type, notes)
VALUES
  ('university', 1, 'min_toefl_legacy', 90, NULL, 'TOEFL iBT (scale used before 2026-01-21)',
   'Bachelor', '2026-27', 'https://mitadmissions.org/apply/firstyear/tests-scores/',
   TIMESTAMP '2026-11-06 00:00:00', 'verified', 'official_requirement',
   'Official MINIMUM for tests taken before 2026-01-21. NOT the recommended score.'),
  ('university', 1, 'recommended_toefl_legacy', 100, NULL, 'TOEFL iBT (scale used before 2026-01-21)',
   'Bachelor', '2026-27', 'https://mitadmissions.org/apply/firstyear/tests-scores/',
   TIMESTAMP '2026-11-06 00:00:00', 'verified', 'recommended_score',
   'Official RECOMMENDED score, NOT a minimum and NOT an auto-reject rule. The live legacy min_toefl=100 was this value mislabelled as a minimum.'),
  ('university', 1, 'min_toefl_new_scale', 5, NULL, 'TOEFL 1-6 scale (tests from 2026-01-21)',
   'Bachelor', '2026-27', 'https://mitadmissions.org/apply/firstyear/tests-scores/',
   TIMESTAMP '2026-11-06 00:00:00', 'verified', 'official_requirement',
   'New scale MINIMUM. Test date decides which scale applies; never mix 90/100 with 5/5.5.'),
  ('university', 1, 'recommended_toefl_new_scale', 5.5, NULL, 'TOEFL 1-6 scale (tests from 2026-01-21)',
   'Bachelor', '2026-27', 'https://mitadmissions.org/apply/firstyear/tests-scores/',
   TIMESTAMP '2026-11-06 00:00:00', 'verified', 'recommended_score',
   'New scale RECOMMENDED score, not a minimum.'),
  ('university', 1, 'min_ielts', 7, NULL, 'IELTS Academic overall',
   'Bachelor', '2026-27', 'https://mitadmissions.org/apply/firstyear/tests-scores/',
   TIMESTAMP '2026-11-06 00:00:00', 'verified', 'official_requirement',
   'Official MINIMUM. The same page publishes a separate recommended 7.5.'),
  ('university', 1, 'recommended_ielts', 7.5, NULL, 'IELTS Academic overall',
   'Bachelor', '2026-27', 'https://mitadmissions.org/apply/firstyear/tests-scores/',
   TIMESTAMP '2026-11-06 00:00:00', 'verified', 'recommended_score',
   'Official RECOMMENDED score, not a minimum.'),
  ('university', 1, 'sat_math_middle_50_low', 780, NULL, 'SAT Math, 25th percentile of admitted class',
   'Bachelor', 'Class of 2029', 'https://mitadmissions.org/apply/process/stats/',
   TIMESTAMP '2026-11-06 00:00:00', 'verified', 'observed_statistic',
   'Admitted-cohort statistic for the Class of 2029. MIT explicitly publishes NO SAT/ACT cutoff or recommended score.'),
  ('university', 1, 'sat_math_middle_50_high', 800, NULL, 'SAT Math, 75th percentile of admitted class',
   'Bachelor', 'Class of 2029', 'https://mitadmissions.org/apply/process/stats/',
   TIMESTAMP '2026-11-06 00:00:00', 'verified', 'observed_statistic', 'Not a cutoff.'),
  ('university', 1, 'sat_erw_middle_50_low', 740, NULL, 'SAT ERW, 25th percentile of admitted class',
   'Bachelor', 'Class of 2029', 'https://mitadmissions.org/apply/process/stats/',
   TIMESTAMP '2026-11-06 00:00:00', 'verified', 'observed_statistic', 'Not a cutoff.'),
  ('university', 1, 'sat_erw_middle_50_high', 780, NULL, 'SAT ERW, 75th percentile of admitted class',
   'Bachelor', 'Class of 2029', 'https://mitadmissions.org/apply/process/stats/',
   TIMESTAMP '2026-11-06 00:00:00', 'verified', 'observed_statistic', 'Not a cutoff.'),
  ('university', 1, 'acceptance_rate', 4.6, NULL, 'percent admitted',
   'Bachelor', 'Class of 2029', 'https://mitadmissions.org/apply/process/stats/',
   TIMESTAMP '2026-11-06 00:00:00', 'verified', 'historical_acceptance_rate',
   '29,281 first-year applications / 1,334 admits = 4.6% for the Class of 2029. This is a historical cohort rate, NOT a personal admission probability and NOT a replacement for the differently-sourced 4.5 row.'),
  ('university', 1, 'sat_cutoff', NULL, 'MIT publishes no SAT/ACT cutoff or recommended score', NULL,
   'Bachelor', '2026-27', 'https://mitadmissions.org/apply/firstyear/tests-scores/',
   TIMESTAMP '2026-11-06 00:00:00', 'verified', 'not_published',
   'Explicit not-published fact: scores are evaluated within an applicant''s context.'),
  ('university', 1, 'gpa_cutoff', NULL, 'MIT publishes no GPA cutoff', 'GPA / 4.0',
   'Bachelor', '2026-27', 'https://mitadmissions.org/apply/firstyear/international/',
   TIMESTAMP '2026-11-06 00:00:00', 'verified', 'not_published',
   'No required high-school classes, no conversion of foreign grades to the US system.'),

  -- 3. Yenching — 2027 cohort, official application materials.
  ('scholarship', 894, 'required_documents', NULL,
   'Completed online application form; Personal statement (750 words or less); Statement of Research Interest (max 1500 words, excluding citations); Curriculum Vitae; Official transcript(s); Diploma(s) or Certificate(s) of Enrollment; Two academic letters of recommendation (full or associate professor, in the intended field, Chinese or English); English proficiency test report',
   NULL, 'Master', '2027', 'https://yenchingacademy.pku.edu.cn/ADMISSIONS.htm',
   TIMESTAMP '2026-11-06 00:00:00', 'verified', 'official_requirement',
   'Official 2027-cohort materials list. The previous generic high-school transcript template is replaced, not hidden.'),
  ('scholarship', 894, 'personal_statement_max_words', 750, NULL, 'words',
   'Master', '2027', 'https://yenchingacademy.pku.edu.cn/ADMISSIONS.htm',
   TIMESTAMP '2026-11-06 00:00:00', 'verified', 'official_requirement', 'Upper bound, not a target length.'),
  ('scholarship', 894, 'research_interest_max_words', 1500, NULL, 'words (excluding citations)',
   'Master', '2027', 'https://yenchingacademy.pku.edu.cn/ADMISSIONS.htm',
   TIMESTAMP '2026-11-06 00:00:00', 'verified', 'official_requirement', 'Upper bound, citations excluded.'),
  ('scholarship', 894, 'recommendation_letters', 2, NULL, 'letters',
   'Master', '2027', 'https://yenchingacademy.pku.edu.cn/ADMISSIONS.htm',
   TIMESTAMP '2026-11-06 00:00:00', 'verified', 'official_requirement',
   'Two academic references from full/associate professors in the intended field.'),
  ('scholarship', 894, 'english_test_requirement', NULL,
   'IELTS Academic 7.0 / TOEFL iBT 5 (new scale) / Cambridge Advanced 185 / CET-6 600 / TEM-4 Pass at 良好 or above; waived for native English speakers and graduates of English-taught degrees; HMT candidates always need a report',
   NULL, 'Master', '2027', 'https://yenchingacademy.pku.edu.cn/ADMISSIONS.htm',
   TIMESTAMP '2026-11-06 00:00:00', 'verified', 'official_requirement',
   'Explicit waived / conditional / not-applicable states are part of the official rule. Scores must be sent directly by the test organisation; institution code C488 for TOEFL.'),
  ('scholarship', 894, 'english_test_waiver', NULL, 'conditional',
   NULL, 'Master', '2027', 'https://yenchingacademy.pku.edu.cn/ADMISSIONS.htm',
   TIMESTAMP '2026-11-06 00:00:00', 'verified', 'not_applicable',
   'Only for native English speakers or graduates of an English-taught degree; NOT applicable to mainland or HMT candidates.'),
  ('scholarship', 894, 'monthly_stipend', NULL, 'Monthly stipend is listed as a fellowship component; the official page publishes NO numeric amount',
   NULL, 'Master', '2027', 'https://yenchingacademy.pku.edu.cn/ADMISSIONS.htm',
   TIMESTAMP '2026-11-06 00:00:00', 'verified', 'not_published',
   'Unknown, NOT zero and NOT 5,040. The live 5040 CNY/month value came from an unverified source and is removed by the forward correction.'),
  ('scholarship', 894, 'amount_usd_value', NULL, 'No numeric award amount published', 'USD',
   'Master', '2027', 'https://yenchingacademy.pku.edu.cn/ADMISSIONS.htm',
   TIMESTAMP '2026-11-06 00:00:00', 'verified', 'not_published', 'Unknown, not zero.'),
  ('scholarship', 894, 'program_duration_years', NULL, 'Program duration is not stated on this admissions page', 'years',
   'Master', '2027', 'https://yenchingacademy.pku.edu.cn/ADMISSIONS.htm',
   TIMESTAMP '2026-11-06 00:00:00', 'verified', 'not_published',
   'Program duration is kept SEPARATE from funding duration. Do not infer a total cost from an unknown duration.'),
  ('scholarship', 894, 'funding_duration', NULL, 'Fellowship covers tuition, accommodation, monthly stipend, one round-trip travel fare and field-study costs; no duration or numeric total is published',
   NULL, 'Master', '2027', 'https://yenchingacademy.pku.edu.cn/ADMISSIONS.htm',
   TIMESTAMP '2026-11-06 00:00:00', 'verified', 'not_published',
   'Funding components are known; their duration and total are NOT. Never sum an unknown living cost into an exact total.'),
  ('scholarship', 894, 'annual_cohort_size', 120, NULL, 'students per year (approximately)',
   'Master', '2027', 'https://yenchingacademy.pku.edu.cn/ADMISSIONS.htm',
   TIMESTAMP '2026-11-06 00:00:00', 'verified', 'observed_statistic',
   'Approximately 120 new students annually. This is a cohort SIZE, not an acceptance rate.'),
  ('scholarship', 894, 'international_share', 75, NULL, 'percent of student body (roughly)',
   'Master', '2027', 'https://yenchingacademy.pku.edu.cn/ADMISSIONS.htm',
   TIMESTAMP '2026-11-06 00:00:00', 'verified', 'observed_statistic',
   'Roughly 75% international. This is a student-body SHARE, not an acceptance rate and not an eligibility rule.'),
  ('scholarship', 894, 'application_deadline', NULL, '2026-11-30 09:00 Beijing time (international candidates, 2027 cohort)',
   NULL, 'Master', '2027', 'https://yenchingacademy.pku.edu.cn/ADMISSIONS.htm',
   TIMESTAMP '2026-11-06 00:00:00', 'verified', 'official_requirement',
   'Timezone is explicit. Applications opened 2026-09-01. Partner-university candidates also need home-university pre-selection.')
ON CONFLICT (entity_type, entity_id, field_key, admission_cycle) DO NOTHING;

-- 4. The two previously unverified MIT rows become explicitly not-published,
--    without deleting them and without touching their stored legacy values.
UPDATE public.catalogue_facts
SET value_type = 'not_published',
    notes = 'Official MIT page publishes no SAT/ACT or GPA cutoff. The legacy numeric column is retained by the field-level trust adapter as legacy_unknown, never as an official minimum.'
WHERE entity_type = 'university' AND entity_id = 1
  AND field_key IN ('min_gpa', 'min_sat')
  AND value_type = 'unverified'
  AND verification_status = 'review_needed';

COMMIT;

-- ===========================================================================
-- RECOVERY for THIS file (separate, NOT the correction rollback):
--   the CHECK constraint can be restored to its v1 list and the rows inserted
--   here can be identified by (field_key, admission_cycle, source_url) above.
--   See docs/MIGRATION_RUNBOOK_2026-11-06.md §5. No blanket TRUNCATE/DELETE.
-- ===========================================================================
