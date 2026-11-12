-- Applied to ScholarBridge as Supabase migration 20261111184740.
set local lock_timeout='3s';

-- Restore the two backend evidence-review tables missing from the live schema.
-- Their contracts come from the 2026-11-06 and 2026-11-07 evidence migrations.
CREATE TABLE IF NOT EXISTS public.official_source_checks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type text NOT NULL CHECK (entity_type IN ('university', 'scholarship', 'program')),
  entity_id integer NOT NULL,
  field_key text NOT NULL,
  source_url text NOT NULL,
  official_domain text,
  verified_fact text,
  evidence_excerpt text,
  http_status integer,
  official_page_re_read boolean NOT NULL DEFAULT false,
  verification_succeeded boolean NOT NULL DEFAULT false,
  evidence_present boolean NOT NULL DEFAULT false,
  reason text,
  checked_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  fact_id uuid REFERENCES public.catalogue_facts(id),
  admission_cycle text,
  program_name text,
  degree_level text,
  applicant_scope text,
  expected_version bigint,
  fact_applied boolean NOT NULL DEFAULT false
);
ALTER TABLE public.official_source_checks ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.official_source_checks FROM PUBLIC, anon, authenticated;
GRANT ALL ON public.official_source_checks TO postgres, service_role;
CREATE INDEX IF NOT EXISTS idx_official_source_checks_entity
  ON public.official_source_checks (entity_type, entity_id, checked_at DESC);
CREATE INDEX IF NOT EXISTS idx_official_source_checks_failed
  ON public.official_source_checks (verification_succeeded, checked_at DESC);
CREATE INDEX IF NOT EXISTS idx_official_check_fact_due
  ON public.official_source_checks (fact_id, checked_at DESC);
CREATE INDEX IF NOT EXISTS idx_official_check_due
  ON public.official_source_checks (entity_type, entity_id, field_key, source_url, checked_at DESC);

CREATE TABLE IF NOT EXISTS public.catalogue_fact_reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  fact_id uuid NOT NULL REFERENCES public.catalogue_facts(id) ON DELETE CASCADE,
  reviewed_version bigint NOT NULL,
  reviewer_profile_id integer NOT NULL REFERENCES public.student_profiles(id),
  reviewed_snapshot jsonb NOT NULL,
  source_quote text NOT NULL CHECK (length(source_quote) BETWEEN 40 AND 10000),
  reviewed_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (fact_id, reviewed_version)
);
ALTER TABLE public.catalogue_fact_reviews ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.catalogue_fact_reviews FROM PUBLIC, anon, authenticated;
GRANT ALL ON public.catalogue_fact_reviews TO postgres, service_role;
COMMENT ON TABLE public.catalogue_fact_reviews IS
  'Human source attestation of exact group version and scope.';
