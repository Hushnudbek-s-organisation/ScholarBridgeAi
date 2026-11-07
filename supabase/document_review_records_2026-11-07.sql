-- Additive optional provenance. Old code can coexist. Never upgrades historical self-claims.
BEGIN;
CREATE TABLE IF NOT EXISTS public.document_review_records (
 document_id integer PRIMARY KEY REFERENCES public.user_documents(id) ON DELETE CASCADE,
 content_hash text NOT NULL,
 reviewer_profile_id integer NOT NULL REFERENCES public.student_profiles(id),
 verified_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.document_review_records ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.document_review_records FROM PUBLIC, anon, authenticated;
GRANT ALL ON public.document_review_records TO postgres, service_role;
COMMENT ON TABLE public.document_review_records IS 'Backend-admin provenance bound to exact document metadata and application-link identity; not a file malware scan.';

-- Shared review identities query links by document (the existing unique index
-- starts with application_id). Optional in older schemas; no table rewrite.
DO $$ BEGIN
  IF to_regclass('public.application_document_links') IS NOT NULL THEN
    CREATE INDEX IF NOT EXISTS idx_app_doc_document ON public.application_document_links(document_id,application_id);
  END IF;
END $$;
COMMIT;
