-- Additive migration: preference modes for programme assessment.
--
-- WHY
-- ---
-- The assessment service needs to know whether a student's saved choice is
-- REQUIRED (a filter), PREFERRED (a weight) or NOT A PREFERENCE (excluded), and
-- it needs the two learning-format axes kept apart (`study_load` vs
-- `delivery_mode`). Until now the only stored form was `preferred_countries`
-- (and the language preference), which carry no mode at all.
--
-- SAFETY
-- ------
--  * One nullable JSONB column. No existing column is altered, renamed or
--    dropped, so `preferred_countries` and every current write path keep working.
--  * No backfill. A profile with a stored country/language list and NO
--    `assessment_preferences` row is migrated by the READER (see
--    `resolvePreferenceSet`) to `prefer` — never to `must`, because the student
--    never confirmed a hard filter.
--  * Idempotent: `ADD COLUMN IF NOT EXISTS` + a guarded CHECK constraint, so a
--    re-run (or a partially applied deploy) is a no-op.
--  * The column is only ever read for the profile's owner: the API still goes
--    through `requireProfileAccess`, so no new access path is introduced.
--
-- SHAPE (validated by `parseAssessmentPreferences` in src/lib/assessmentStored.ts)
--   {
--     "version": 1,
--     "subject":         {"mode": "prefer", "value": ["Computer Science"]},
--     "country":         {"mode": "must",   "value": ["Germany"]},
--     "teaching_language": {"mode": "prefer", "value": ["English"]},
--     "study_load":      {"mode": "prefer", "value": ["full-time"]},
--     "delivery_mode":   {"mode": "no_preference", "value": null},
--     "acceptedSubjectEquivalents": ["Informatics"]
--   }
--   mode ∈ {must, prefer, no_preference}; a legacy value without a mode is
--   written back as "prefer" by the reader, never as "must".

ALTER TABLE student_profiles
  ADD COLUMN IF NOT EXISTS assessment_preferences jsonb;

COMMENT ON COLUMN student_profiles.assessment_preferences IS
  'Versioned preference modes for the canonical programme assessment (must/prefer/no_preference + study_load + delivery_mode). NULL means "not set": the reader migrates legacy preferred_countries/language values to prefer.';

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'student_profiles_assessment_preferences_object'
  ) THEN
    ALTER TABLE student_profiles
      ADD CONSTRAINT student_profiles_assessment_preferences_object
      CHECK (assessment_preferences IS NULL OR jsonb_typeof(assessment_preferences) = 'object');
  END IF;
END $$;

-- Verify after applying (read-only):
--   SELECT count(*) FILTER (WHERE assessment_preferences IS NOT NULL) AS with_preferences,
--          count(*) AS total_profiles
--   FROM student_profiles;
-- Rollback (only if the feature is reverted; user data in other columns is untouched):
--   ALTER TABLE student_profiles DROP CONSTRAINT IF EXISTS student_profiles_assessment_preferences_object;
--   ALTER TABLE student_profiles DROP COLUMN IF EXISTS assessment_preferences;
