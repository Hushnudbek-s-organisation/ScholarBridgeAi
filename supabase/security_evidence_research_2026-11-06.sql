-- ===========================================================================
-- Reviewable security / evidence / durable-research migration — 2026-11-06
-- STATUS: NOT APPLIED BY THE AGENT.
--
-- Read-only inspection of the real Supabase project (zkdguzbdopfedkffsatk):
--   * 120 public tables; 119 have RLS enabled; password_reset_tokens does NOT.
--   * anon/authenticated have SELECT only on universities/scholarships, but
--     FULL DML (including TRUNCATE) on public.password_reset_tokens.
--   * 14 RLS policies total: 13 public-catalogue SELECT policies and one
--     public LOGO storage read. There are deliberately NO auth.uid() owner
--     policies: the app uses HMAC/custom sessions and numeric profile IDs.
--     Backend ownership checks remain mandatory; RLS is not a substitute.
--   * refresh_jobs has 4 rows; the last manual scholarships job (2026-10-28)
--     processed 735 / changed 452. No durable run/checkpoint table exists.
--
-- This file is a reviewable plan only. It does NOT connect to production,
-- does NOT deploy, and does NOT write any live row. No secret, token or
-- connection string appears here. No auth.uid() policy is introduced.
-- ===========================================================================

BEGIN;

-- ---------------------------------------------------------------------------
-- 1. Close the confirmed public DML hole on password_reset_tokens.
-- ---------------------------------------------------------------------------
ALTER TABLE public.password_reset_tokens ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.password_reset_tokens FROM PUBLIC, anon, authenticated;
GRANT ALL ON public.password_reset_tokens TO postgres, service_role;
-- postgres and service_role retain their grants; service_role also has
-- BYPASSRLS. No permissive public policy is created, so anon/authenticated
-- cannot read or mutate token hashes through PostgREST. The Next.js backend
-- still must check ownership/expiry/used_at before accepting a reset token.

-- ---------------------------------------------------------------------------
-- 1b. Storage least privilege, based on the ACTUAL access path (not grants
--     alone). Read-only inspection found:
--       * auth.users = 0, student_profiles = 18, user_sessions = 28 and NO
--         auth-user/supabase-user column on student_profiles. The app uses
--         HMAC/custom sessions + numeric profile IDs, not Supabase Auth.
--       * only one bucket: LOGO, public = true, 5 MiB, image MIME types.
--       * storage.objects RLS is enabled with ONE policy:
--         "Public can read LOGO assets" (SELECT, bucket_id = 'LOGO').
--       * anon/authenticated nevertheless hold INSERT/UPDATE/DELETE grants
--         (effective has_table_privilege() = true), but with RLS enabled and
--         NO write policy, a direct PostgREST write is denied. The grants are
--         therefore unnecessary attack surface, not by themselves proof that
--         private objects are exposed.
--       * the only implemented upload path is admin/branding/upload: the
--         browser posts multipart to the Next.js backend, which uses the
--         server-only service key. Document vault stores file_url metadata in
--         PostgreSQL; no browser-direct Supabase Storage upload exists.
--     Therefore: remove ALL table privileges from public browser roles, grant
--     back SELECT only, keep RLS and the explicit LOGO SELECT policy, and remove
--     any accidental write policies. Future private document buckets must stay
--     non-public and be reached only through a server-side ownership check +
--     service_role or short-lived signed URL. No auth.uid() policy is added.
-- ---------------------------------------------------------------------------
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON storage.objects FROM PUBLIC, anon, authenticated;
GRANT USAGE ON SCHEMA storage TO anon, authenticated;
GRANT SELECT ON storage.objects TO anon, authenticated;
GRANT ALL ON storage.objects TO postgres, service_role;

DO $$
DECLARE
  policy_row record;
BEGIN
  -- Keep read policies intact; remove any write policy that would turn the
  -- broad browser grants into a real direct-upload path.
  FOR policy_row IN
    SELECT policyname
    FROM pg_policies
    WHERE schemaname = 'storage'
      AND tablename = 'objects'
      AND cmd IN ('INSERT', 'UPDATE', 'DELETE', 'ALL')
  LOOP
    EXECUTE format('DROP POLICY %I ON storage.objects', policy_row.policyname);
  END LOOP;
END $$;

DROP POLICY IF EXISTS "Public can read LOGO assets" ON storage.objects;
CREATE POLICY "Public can read LOGO assets" ON storage.objects
  FOR SELECT TO public
  USING (bucket_id = 'LOGO');

-- No policy is created for a private document bucket: none exists today, and
-- a custom HMAC session has no Supabase auth.uid() to compare. Adding one
-- later requires a server-issued, audience-bound signed URL or backend proxy
-- that checks numeric profile ownership before returning/streaming an object.


-- ---------------------------------------------------------------------------
-- 2. Typed evidence records for important catalogue values.
--    A high evidence-coverage percentage never proves a value is official or
--    correct. Each fact carries value+unit, currency+period where relevant,
--    degree/program, admission cycle, official source URL, verified date,
--    verification status and value type.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.catalogue_facts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type text NOT NULL CHECK (entity_type IN ('university','program','scholarship','ranking','source')),
  entity_id integer NOT NULL,
  field_key text NOT NULL,
  value_numeric numeric,
  value_text text,
  unit text,
  currency text,
  period text,
  degree_level text,
  program_name text,
  admission_cycle text,
  source_url text,
  verified_at timestamp without time zone,
  verification_status text NOT NULL DEFAULT 'review_needed'
    CHECK (verification_status IN ('verified','review_needed','unverified','failed_verification')),
  value_type text NOT NULL DEFAULT 'unverified'
    CHECK (value_type IN (
      'official_requirement','observed_statistic','computed_fit','planning_estimate',
      'evidence_coverage','experimental_index','historical_acceptance_rate',
      'personal_admission_probability','unknown','not_published','not_applicable','unverified'
    )),
  notes text,
  is_active boolean NOT NULL DEFAULT TRUE,
  created_at timestamp without time zone NOT NULL DEFAULT now(),
  updated_at timestamp without time zone NOT NULL DEFAULT now(),
  UNIQUE (entity_type, entity_id, field_key, admission_cycle)
);

ALTER TABLE public.catalogue_facts ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.catalogue_facts FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.catalogue_facts TO anon, authenticated;
GRANT ALL ON public.catalogue_facts TO postgres, service_role;
DROP POLICY IF EXISTS public_catalogue_facts_read ON public.catalogue_facts;
CREATE POLICY public_catalogue_facts_read ON public.catalogue_facts
  FOR SELECT TO anon, authenticated
  USING (is_active);

CREATE INDEX IF NOT EXISTS idx_catalogue_facts_entity ON public.catalogue_facts (entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_catalogue_facts_review ON public.catalogue_facts (verification_status, updated_at DESC);

-- Seed only the exact live contradictions and QS-edition question as
-- review-needed facts. These rows are evidence placeholders, NOT claims that
-- the value is correct. verified_at stays NULL until a real official re-read
-- succeeds; a failed automatic check must not refresh it.
INSERT INTO public.catalogue_facts
  (entity_type, entity_id, field_key, value_numeric, value_text, unit, currency, period,
   degree_level, program_name, admission_cycle, source_url, verified_at,
   verification_status, value_type, notes)
VALUES
  ('university', 1, 'min_gpa', 3.91, NULL, 'GPA / 4.0', NULL, NULL, 'Bachelor', NULL, '2026-27',
   'https://mitadmissions.org/apply/firstyear/tests-scores/', NULL, 'review_needed', 'unverified',
   'Live value observed 2026-11-06. Official MIT first-year page publishes no GPA cutoff; do not present as an official minimum.'),
  ('university', 1, 'min_sat', 1520, NULL, 'SAT total score', NULL, NULL, 'Bachelor', NULL, '2026-27',
   'https://mitadmissions.org/apply/firstyear/tests-scores/', NULL, 'review_needed', 'unverified',
   'Live value observed 2026-11-06. Official MIT page requires SAT/ACT but publishes no cutoff or recommended score.'),
  ('university', 1, 'acceptance_rate', 4.5, NULL, 'percent', NULL, NULL, 'Bachelor', NULL, 'unspecified',
   'https://mitadmissions.org/apply/firstyear/international/', NULL, 'review_needed', 'unverified',
   'Third-party/PDF-derived statistic; not a verified admitted-cohort figure. QS-derived estimates are not admitted-cohort statistics.'),
  ('scholarship', 894, 'amount_usd_value', 5040, NULL, NULL, 'CNY', 'month', 'Master', 'Yenching Academy Fellowship', '2027',
   'https://yenchingacademy.pku.edu.cn/ADMISSIONS.htm', NULL, 'review_needed', 'unverified',
   'Live value observed 2026-11-06. Official page lists a monthly stipend but publishes no numeric amount; currency/period were mixed.'),
  ('scholarship', 894, 'min_ielts', 7.0, NULL, 'IELTS Academic band', NULL, NULL, 'Master', 'Yenching Academy Fellowship', '2027',
   'https://yenchingacademy.pku.edu.cn/ADMISSIONS.htm', TIMESTAMP '2026-11-06 00:00:00', 'verified', 'official_requirement',
   'Official 2027-cohort minimum: IELTS Academic 7.0. Re-read 2026-11-06; earlier not-published claim was incorrect.'),
  ('scholarship', 894, 'required_documents', NULL, 'Generic high-school transcript template', NULL, NULL, NULL, 'Master', 'Yenching Academy Fellowship', '2027',
   'https://yenchingacademy.pku.edu.cn/ADMISSIONS.htm', NULL, 'review_needed', 'unverified',
   'Generic template is not an official graduate requirement list. Replace with the official master''s application documents.'),
  ('ranking', 1, 'qs_rank_year', 2026, 'QS World University Rankings 2026', 'rank position', NULL, NULL, NULL, NULL, '2026',
   'https://www.topuniversities.com/world-university-rankings/2026', TIMESTAMP '2026-10-31 00:00:00', 'verified', 'observed_statistic',
   'Rank #1 is edition-specific. Do not mix with an undated or QS 2027 source URL. A rank is not an admission statistic.')
ON CONFLICT (entity_type, entity_id, field_key, admission_cycle) DO NOTHING;

-- ---------------------------------------------------------------------------
-- 3. Durable Research Agent / refresh queue. One PostgreSQL-backed queue is
--    sufficient; no new paid service. This replaces the process-local Map
--    assumption for run status, checkpoint, timeout, cancellation, retry and
--    idempotency. Every university result is persisted in research_run_items.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.research_runs (
  id text PRIMARY KEY,
  status text NOT NULL DEFAULT 'queued'
    CHECK (status IN ('queued','running','complete','error','cancelled','timed_out')),
  idempotency_key text UNIQUE,
  request jsonb NOT NULL,
  dry_run boolean NOT NULL DEFAULT FALSE,
  university_ids jsonb NOT NULL DEFAULT '[]'::jsonb,
  scopes jsonb NOT NULL DEFAULT '[]'::jsonb,
  checkpoint jsonb NOT NULL DEFAULT '{}'::jsonb,
  report jsonb,
  error text,
  attempts integer NOT NULL DEFAULT 0,
  max_attempts integer NOT NULL DEFAULT 3,
  cancel_requested boolean NOT NULL DEFAULT FALSE,
  timeout_at timestamptz,
  started_at timestamptz,
  finished_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  -- A restart worker claims a stale run with one atomic UPDATE. lease_until is
  -- deliberately shorter than the whole-run timeout so a crashed worker does
  -- not hold a run forever; attempts is capped by max_attempts.
  lease_owner text,
  lease_until timestamptz
);

CREATE TABLE IF NOT EXISTS public.research_run_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  run_id text NOT NULL REFERENCES public.research_runs(id) ON DELETE CASCADE,
  university_id integer NOT NULL,
  status text NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending','running','complete','error','skipped')),
  report jsonb,
  error text,
  attempts integer NOT NULL DEFAULT 0,
  started_at timestamptz,
  finished_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (run_id, university_id)
);

ALTER TABLE public.research_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.research_run_items ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.research_runs FROM PUBLIC, anon, authenticated;
REVOKE ALL ON public.research_run_items FROM PUBLIC, anon, authenticated;
GRANT ALL ON public.research_runs TO postgres, service_role;
GRANT ALL ON public.research_run_items TO postgres, service_role;
-- No policy for anon/authenticated: admin APIs use the backend connection, not
-- direct PostgREST writes. service_role has BYPASSRLS.
ALTER TABLE public.research_runs ADD COLUMN IF NOT EXISTS lease_owner text;
ALTER TABLE public.research_runs ADD COLUMN IF NOT EXISTS lease_until timestamptz;
CREATE INDEX IF NOT EXISTS idx_research_runs_status ON public.research_runs (status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_research_runs_lease ON public.research_runs (status, lease_until);
CREATE INDEX IF NOT EXISTS idx_research_run_items_run ON public.research_run_items (run_id, status);

-- ---------------------------------------------------------------------------
-- 4. Make refresh semantics explicit. status_from_existing_dates is a
--    computed lifecycle state, NOT an official page re-read. Only a successful
--    official_source_reverification may increment verified_dates_updated.
-- ---------------------------------------------------------------------------
ALTER TABLE public.refresh_jobs
  ADD COLUMN IF NOT EXISTS mode text NOT NULL DEFAULT 'status_from_existing_dates';
ALTER TABLE public.refresh_jobs
  ADD COLUMN IF NOT EXISTS source_pages_read integer NOT NULL DEFAULT 0;
ALTER TABLE public.refresh_jobs
  ADD COLUMN IF NOT EXISTS verified_dates_updated integer NOT NULL DEFAULT 0;
ALTER TABLE public.refresh_jobs
  ADD COLUMN IF NOT EXISTS failed_verification boolean NOT NULL DEFAULT FALSE;
-- Keep existing rows readable; no bulk rewrite of job history.
UPDATE public.refresh_jobs
SET mode = 'status_from_existing_dates'
WHERE mode IS NULL;

-- ---------------------------------------------------------------------------
-- 5. Official-source re-verification CHECK LOG (result + verified fact +
--    source). An HTTP 200 is NOT verification: only a check with
--    official_page_re_read AND verification_succeeded AND evidence_present
--    allows refresh.ts to advance last_verified_at. A failed check is stored
--    with a safe reason so the admin review queue can show exactly what to
--    re-check. No token, password, secret or document body is ever stored.
--    Browser roles get NO privileges: the adapter writes through the backend
--    connection, admins read through the admin API, not PostgREST.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.official_source_checks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type text NOT NULL CHECK (entity_type IN ('university','scholarship')),
  entity_id integer NOT NULL,
  field_key text NOT NULL,
  source_url text NOT NULL,
  official_domain text,
  verified_fact text,
  evidence_excerpt text,
  http_status integer,
  official_page_re_read boolean NOT NULL DEFAULT FALSE,
  verification_succeeded boolean NOT NULL DEFAULT FALSE,
  evidence_present boolean NOT NULL DEFAULT FALSE,
  reason text,
  checked_at timestamp with time zone NOT NULL DEFAULT now(),
  created_at timestamp with time zone NOT NULL DEFAULT now()
);
ALTER TABLE public.official_source_checks ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.official_source_checks FROM PUBLIC, anon, authenticated;
GRANT ALL ON public.official_source_checks TO postgres, service_role;
CREATE INDEX IF NOT EXISTS idx_official_source_checks_entity
  ON public.official_source_checks (entity_type, entity_id, checked_at DESC);
CREATE INDEX IF NOT EXISTS idx_official_source_checks_failed
  ON public.official_source_checks (verification_succeeded, checked_at DESC);

-- ---------------------------------------------------------------------------
-- 6. Shared cache revision. Process-local TTL caches cannot be invalidated
--    from another instance. One monotonically-increasing revision per scope
--    is read into every cache key, so profile/application/document/catalogue
--    writes bump the revision and EVERY instance computes a fresh key. No
--    auth.uid(): writes come only from the authenticated Next.js backend.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.cache_revisions (
  scope text PRIMARY KEY,
  revision bigint NOT NULL DEFAULT 1,
  reason text,
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);
ALTER TABLE public.cache_revisions ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.cache_revisions FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.cache_revisions TO anon, authenticated;
GRANT ALL ON public.cache_revisions TO postgres, service_role;
DROP POLICY IF EXISTS public_cache_revisions_read ON public.cache_revisions;
CREATE POLICY public_cache_revisions_read ON public.cache_revisions
  FOR SELECT TO anon, authenticated USING (TRUE);
INSERT INTO public.cache_revisions (scope, revision, reason)
VALUES ('default', 1, 'initial')
ON CONFLICT (scope) DO NOTHING;

-- ---------------------------------------------------------------------------
-- 7. Admin REVIEW QUEUE state. Opening the list is NOT verification: an item
--    stays 'open' until an admin records an explicit decision with a reason
--    and, where relevant, a source URL. No fact is auto-verified by viewing.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.review_queue_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  item_key text NOT NULL,
  category text NOT NULL,
  entity_type text,
  entity_id integer,
  field_key text,
  reason text NOT NULL,
  source_url text,
  priority text NOT NULL DEFAULT 'medium' CHECK (priority IN ('low','medium','high','critical')),
  next_action text NOT NULL,
  status text NOT NULL DEFAULT 'open' CHECK (status IN ('open','in_review','resolved','dismissed')),
  decision_reason text,
  decided_by integer,
  decided_at timestamp with time zone,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE (item_key)
);
ALTER TABLE public.review_queue_items ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.review_queue_items FROM PUBLIC, anon, authenticated;
GRANT ALL ON public.review_queue_items TO postgres, service_role;
CREATE INDEX IF NOT EXISTS idx_review_queue_open
  ON public.review_queue_items (status, priority, created_at DESC);

COMMIT;

-- ===========================================================================
-- Reviewer notes (still NOT APPLIED):
--   * Production Auth site_url / URI allow-list currently points only at a
--     Vercel preview domain, not https://scholarbridgeai-9bmd.onrender.com/.
--     That is a manual Supabase dashboard setting, not a SQL migration.
--   * Legacy anon/service_role API keys and a default secret key exist. The
--     connector returned their metadata; values are intentionally NOT copied
--     into the repository or report. Review key rotation separately; never put
--     service_role or secret values in frontend code.
--   * Only one public storage bucket exists (LOGO, 5 MiB, image MIME types),
--     with one public SELECT policy. No document-upload bucket is configured.
--     Browser roles now have SELECT only on storage.objects; writes use the
--     server-side service key / backend ownership check, never auth.uid().
--   * RLS is not a replacement for backend ownership checks. The app's HMAC
--     sessions and numeric profile IDs must keep server-side authorization.
--   * 356 live universities are all marked "verified" while 352 carry min_gpa,
--     252 min_sat and 352 acceptance_rate. catalog_facts above seeds only the
--     known contradictions; the rest remain review-needed, not bulk corrected.
-- ===========================================================================
