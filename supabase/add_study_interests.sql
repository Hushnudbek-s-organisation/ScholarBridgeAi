-- Add structured, locale-independent study-interest selections to student profiles.
-- No legacy target_major values are changed or backfilled.
-- Safe to run repeatedly; the canonical supabase/full_schema.sql also includes this column.
BEGIN;

ALTER TABLE public.student_profiles
  ADD COLUMN IF NOT EXISTS study_interests text;

COMMIT;
