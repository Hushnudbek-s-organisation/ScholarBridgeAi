-- Follow-up only: do not edit or replay the 2026-11-06 migration.
BEGIN;
ALTER TABLE public.official_source_checks DROP CONSTRAINT IF EXISTS official_source_checks_entity_type_check;
ALTER TABLE public.official_source_checks ADD CONSTRAINT official_source_checks_entity_type_check CHECK (entity_type IN ('university','scholarship','program')) NOT VALID;
ALTER TABLE public.official_source_checks VALIDATE CONSTRAINT official_source_checks_entity_type_check;
ALTER TABLE public.official_source_checks ADD COLUMN IF NOT EXISTS fact_id uuid REFERENCES public.catalogue_facts(id);
ALTER TABLE public.official_source_checks ADD COLUMN IF NOT EXISTS admission_cycle text;
ALTER TABLE public.official_source_checks ADD COLUMN IF NOT EXISTS program_name text;
ALTER TABLE public.official_source_checks ADD COLUMN IF NOT EXISTS degree_level text;
CREATE INDEX IF NOT EXISTS idx_official_check_fact_due ON public.official_source_checks(fact_id,checked_at DESC);
CREATE INDEX IF NOT EXISTS idx_official_check_due ON public.official_source_checks(entity_type,entity_id,field_key,source_url,checked_at DESC);
COMMIT;
