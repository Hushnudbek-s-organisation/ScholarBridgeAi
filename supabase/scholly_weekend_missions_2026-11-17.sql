-- Apply after scholly_mission_practice_2026-11-16.sql.
BEGIN;
ALTER TABLE public.daily_missions DROP CONSTRAINT IF EXISTS daily_missions_type_check;
ALTER TABLE public.daily_missions ADD CONSTRAINT daily_missions_type_check
  CHECK (type IN ('fill_profile_fields', 'save_universities', 'upload_document', 'sop_paragraph', 'ielts_vocabulary', 'visa_practice', 'daily_quiz', 'weekly_review'));
COMMIT;
