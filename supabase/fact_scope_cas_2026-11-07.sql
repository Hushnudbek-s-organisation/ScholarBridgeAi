-- Additive continuation: field scope + an actual CAS revision (never replay older migrations).
BEGIN;
ALTER TABLE public.catalogue_facts ADD COLUMN IF NOT EXISTS applicant_scope text;
ALTER TABLE public.catalogue_facts ADD COLUMN IF NOT EXISTS version bigint NOT NULL DEFAULT 1;
ALTER TABLE public.official_source_checks ADD COLUMN IF NOT EXISTS applicant_scope text;
ALTER TABLE public.official_source_checks ADD COLUMN IF NOT EXISTS expected_version bigint;
ALTER TABLE public.official_source_checks ADD COLUMN IF NOT EXISTS fact_applied boolean NOT NULL DEFAULT false;
CREATE OR REPLACE FUNCTION public.advance_catalogue_fact_version() RETURNS trigger
LANGUAGE plpgsql SET search_path = pg_catalog, public AS $$
BEGIN
  NEW.version := OLD.version + 1;
  NEW.updated_at := clock_timestamp();
  RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION public.advance_catalogue_fact_version() FROM PUBLIC;
DROP TRIGGER IF EXISTS catalogue_fact_version ON public.catalogue_facts;
CREATE TRIGGER catalogue_fact_version BEFORE UPDATE ON public.catalogue_facts
FOR EACH ROW EXECUTE FUNCTION public.advance_catalogue_fact_version();
-- The old unique key omitted applicant/programme/unit/source scope and
-- prevented two legitimate publisher assertions from coexisting. Preserve
-- assertions (including conflicts); the resolver, not insertion order, decides.
DO $$ DECLARE legacy record; BEGIN
  FOR legacy IN SELECT c.conname FROM pg_constraint c
    WHERE c.conrelid='public.catalogue_facts'::regclass AND c.contype='u'
    AND ARRAY(SELECT a.attname::text FROM pg_attribute a WHERE a.attrelid=c.conrelid AND a.attnum=ANY(c.conkey) ORDER BY a.attname)
      = ARRAY['admission_cycle','entity_id','entity_type','field_key']::text[]
  LOOP EXECUTE format('ALTER TABLE public.catalogue_facts DROP CONSTRAINT %I',legacy.conname); END LOOP;
END $$;
ALTER TABLE public.catalogue_facts DROP CONSTRAINT IF EXISTS catalogue_facts_value_type_check;
ALTER TABLE public.catalogue_facts ADD CONSTRAINT catalogue_facts_value_type_check CHECK(value_type IN ('official_requirement','recommended_score','observed_statistic','computed_fit','planning_estimate','evidence_coverage','experimental_index','historical_acceptance_rate','personal_admission_probability','unknown','not_published','not_applicable','unverified')) NOT VALID;
ALTER TABLE public.catalogue_facts VALIDATE CONSTRAINT catalogue_facts_value_type_check;
CREATE INDEX IF NOT EXISTS idx_catalogue_fact_scope ON public.catalogue_facts(entity_type,entity_id,field_key,applicant_scope) WHERE is_active;
-- Human review of declarative AND/OR structure is distinct from an HTTP reread.
CREATE TABLE IF NOT EXISTS public.catalogue_fact_reviews (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 fact_id uuid NOT NULL REFERENCES public.catalogue_facts(id) ON DELETE CASCADE,
 reviewed_version bigint NOT NULL,
 reviewer_profile_id integer NOT NULL REFERENCES public.student_profiles(id),
 reviewed_snapshot jsonb NOT NULL,
 source_quote text NOT NULL CHECK(length(source_quote) BETWEEN 40 AND 10000),
 reviewed_at timestamptz NOT NULL DEFAULT now(),
 UNIQUE(fact_id,reviewed_version)
);
ALTER TABLE public.catalogue_fact_reviews ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.catalogue_fact_reviews FROM PUBLIC,anon,authenticated;
GRANT ALL ON public.catalogue_fact_reviews TO postgres,service_role;
COMMENT ON TABLE public.catalogue_fact_reviews IS 'Human source attestation of exact group version and scope; NOT evidence of a network reread or admissions outcome.';

-- The resolved-fact publisher EXISTS lookup uses this exact normalisation.
-- Selective entity lookups use the index; page-sized queries may correctly
-- prefer one hashed publisher scan. Disposable EXPLAIN records both plans.
CREATE INDEX IF NOT EXISTS idx_sources_official_normalized_domain
 ON public.sources ((lower(regexp_replace(domain,'^www[.]','')))) WHERE is_official;
COMMIT;
