-- Recovery is NOT a forward migration. First deploy compatible old code and pause reviews.
-- Preserve data; do not drop the table or existing review records.
BEGIN;
REVOKE ALL ON public.document_review_records FROM PUBLIC, anon, authenticated;
COMMIT;
