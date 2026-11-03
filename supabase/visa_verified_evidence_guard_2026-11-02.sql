-- A valid link/date is necessary, NOT proof that government content was read.
-- Prevent future imports from re-verifying the practice prompts or URL lists.
DO $$ BEGIN
 IF NOT EXISTS(SELECT 1 FROM pg_constraint WHERE conrelid='public.visa_requirements'::regclass AND conname='visa_verified_requires_evidence') THEN
  ALTER TABLE public.visa_requirements ADD CONSTRAINT visa_verified_requires_evidence
  CHECK(verification_status<>'verified' OR (
   source_url IS NOT NULL AND source_url ~ '^https?://[^[:space:]]+$'
   AND source_url !~ 'https?://.*https?://'
   AND last_verified_at IS NOT NULL
   AND source_type IS DISTINCT FROM 'teaching_material'
   AND visa_type<>'Student Visa Interview Q&A'
  )) NOT VALID;
 END IF;
END $$;
ALTER TABLE public.visa_requirements VALIDATE CONSTRAINT visa_verified_requires_evidence;
