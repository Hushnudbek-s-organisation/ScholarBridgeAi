-- ===========================================================================
-- SECURITY/SCHEMA RECOVERY — 2026-11-06. NOT A FORWARD MIGRATION. NOT APPLIED.
-- ---------------------------------------------------------------------------
-- SEPARATE from official_source_corrections_*_rollback*.sql. That file restores
-- TWO catalogue rows; it does NOT and MUST NOT be described as reverting this
-- migration. This file is the ONLY reviewed recovery path for the
-- security/evidence/research schema changes.
--
-- WHEN: ONLY if an operator confirms a concrete regression caused by THIS
--       migration (e.g. a backend write path losing its grant, or an RLS
--       policy blocking a legitimate admin read).
-- WHO:  named database operator, manually, after the PREFLIGHT in
--       docs/MIGRATION_RUNBOOK_2026-11-06.md §5. NEVER by CI/deploy/cron.
--
-- DESIGN DECISION: the migration CLOSES real exposures (password reset tokens
-- with anon DML, broad storage.objects grants). Re-enabling those weaknesses
-- is NOT a recovery. Therefore this file:
--   * keeps password_reset_tokens RLS ENABLED and keeps anon/authenticated
--     revoked; only re-grants the backend/service_role path if it was lost;
--   * keeps storage.objects restricted to SELECT + LOGO-only policy, and
--     restores the SERVER-side write grant only for the service role;
--   * NEVER drops the new tables (catalogue_facts, official_source_checks,
--     cache_revisions, review_queue_items, research_runs, research_run_items).
--     They contain review decisions and durable checkpoints; dropping them
--     would destroy user work. Old code simply ignores them.
-- ===========================================================================

BEGIN;

-- 1. Backend/service-role grants required by real upload / write paths.
--    Idempotent and least-privilege: no PUBLIC/anon/authenticated write.
DO $$
BEGIN
  IF to_regclass('public.password_reset_tokens') IS NOT NULL THEN
    EXECUTE 'GRANT ALL ON public.password_reset_tokens TO postgres, service_role';
    EXECUTE 'ALTER TABLE public.password_reset_tokens ENABLE ROW LEVEL SECURITY';
  END IF;
END $$;

DO $$
BEGIN
  IF to_regclass('storage.objects') IS NOT NULL THEN
    EXECUTE 'GRANT USAGE ON SCHEMA storage TO postgres, service_role';
    EXECUTE 'GRANT SELECT, INSERT, UPDATE, DELETE ON storage.objects TO postgres, service_role';
    EXECUTE 'REVOKE INSERT, UPDATE, DELETE ON storage.objects FROM PUBLIC, anon, authenticated';
    EXECUTE 'GRANT SELECT ON storage.objects TO anon, authenticated';
    EXECUTE 'ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY';
    -- The public LOGO asset must keep working. Private documents are never
    -- readable through anon privileges; the backend checks numeric profile
    -- ownership before issuing any signed URL.
    IF NOT EXISTS (
      SELECT 1 FROM pg_policies
      WHERE schemaname = 'storage' AND tablename = 'objects'
        AND policyname = 'Public can read LOGO assets'
    ) THEN
      EXECUTE 'CREATE POLICY "Public can read LOGO assets" ON storage.objects '
           || 'FOR SELECT TO public USING (bucket_id = ''LOGO'')';
    END IF;
  END IF;
END $$;

-- 2. Restore the six new tables' grants in case a later deploy loosened them.
--    Read-only for public typed facts; everything else is backend-only.
DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'public.catalogue_facts','public.official_source_checks','public.cache_revisions',
    'public.review_queue_items','public.research_runs','public.research_run_items'
  ] LOOP
    IF to_regclass(t) IS NOT NULL THEN
      EXECUTE format('GRANT ALL ON %s TO postgres, service_role', t);
      EXECUTE format('REVOKE INSERT, UPDATE, DELETE ON %s FROM PUBLIC, anon, authenticated', t);
      EXECUTE format('ALTER TABLE %s ENABLE ROW LEVEL SECURITY', t);
    END IF;
  END LOOP;
END $$;

GRANT SELECT ON public.catalogue_facts TO anon, authenticated;

-- 3. If the v2 follow-up widened value_type and old code must be restored,
--    the operator can narrow it back ONLY after confirming no row uses the
--    new value. This is deliberately NOT automatic.
-- DO $$
-- BEGIN
--   IF NOT EXISTS (SELECT 1 FROM public.catalogue_facts WHERE value_type = 'recommended_score') THEN
--     ALTER TABLE public.catalogue_facts DROP CONSTRAINT IF EXISTS catalogue_facts_value_type_check;
--     ALTER TABLE public.catalogue_facts ADD CONSTRAINT catalogue_facts_value_type_check
--       CHECK (value_type IN ( ... v1 list ... ));
--   END IF;
-- END $$;

COMMIT;

-- NOT DONE HERE (and why):
--   * DROP TABLE of any new table — destroys review decisions/checkpoints;
--   * DISABLE ROW LEVEL SECURITY on password_reset_tokens — reopens anon DML;
--   * GRANT INSERT/UPDATE/DELETE on storage.objects to anon/authenticated —
--     reopens cross-user document tampering (custom HMAC sessions have no
--     auth.uid(), so no owner policy could protect it);
--   * any change to student rows, applications or catalogue values.
