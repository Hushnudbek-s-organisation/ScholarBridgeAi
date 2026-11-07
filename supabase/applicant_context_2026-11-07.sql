-- Original applicant records; additive and nullable for all existing profiles.
BEGIN;
ALTER TABLE public.student_profiles ADD COLUMN IF NOT EXISTS applicant_context jsonb;
COMMENT ON COLUMN public.student_profiles.applicant_context IS 'Student-entered original GPA/test scale/date/subscores, citizenship (not destination), residency and optional need-based context. Not official conversion or eligibility proof.';
COMMIT;
