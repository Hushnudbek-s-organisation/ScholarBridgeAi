-- DB-side invalidation covers admin, import, seed and research writers, including rollbacks.
-- Uses the existing revision store, not a new queue/outbox infrastructure.
BEGIN;
CREATE OR REPLACE FUNCTION public.catalogue_mutation_revision() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, public AS $$
BEGIN
  INSERT INTO public.cache_revisions(scope,revision,reason,updated_at)
  VALUES('catalogue',2,'mutation:'||TG_TABLE_NAME,clock_timestamp())
  ON CONFLICT(scope) DO UPDATE SET revision=public.cache_revisions.revision+1,reason=EXCLUDED.reason,updated_at=EXCLUDED.updated_at;
  RETURN NULL;
END $$;
REVOKE ALL ON FUNCTION public.catalogue_mutation_revision() FROM PUBLIC;
DO $$ DECLARE tab text; BEGIN
  FOREACH tab IN ARRAY ARRAY['universities','programs','program_requirements','application_cycles','scholarships','sources','university_sources','program_sources','scholarship_sources','catalogue_facts','opportunities'] LOOP
    IF to_regclass('public.'||tab) IS NOT NULL THEN
      EXECUTE format('DROP TRIGGER IF EXISTS catalogue_revision ON public.%I',tab);
      EXECUTE format('CREATE TRIGGER catalogue_revision AFTER INSERT OR UPDATE OR DELETE OR TRUNCATE ON public.%I FOR EACH STATEMENT EXECUTE FUNCTION public.catalogue_mutation_revision()',tab);
    END IF;
  END LOOP;
END $$;
CREATE OR REPLACE FUNCTION public.profile_mutation_revision() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, public AS $$
DECLARE rowdata jsonb; pid integer; scope_name text; seen integer[] := ARRAY[]::integer[]; snapshots jsonb;
BEGIN
  snapshots := CASE WHEN TG_OP='DELETE' THEN jsonb_build_array(to_jsonb(OLD)) WHEN TG_OP='INSERT' THEN jsonb_build_array(to_jsonb(NEW)) ELSE jsonb_build_array(to_jsonb(OLD),to_jsonb(NEW)) END;
  FOR rowdata IN SELECT value FROM jsonb_array_elements(snapshots) LOOP
    pid := CASE WHEN TG_TABLE_NAME='student_profiles' THEN (rowdata->>'id')::integer ELSE (rowdata->>'profile_id')::integer END;
    IF pid IS NULL AND rowdata ? 'application_id' AND to_regclass('public.applications') IS NOT NULL THEN
      SELECT profile_id INTO pid FROM public.applications WHERE id=(rowdata->>'application_id')::integer;
    END IF;
    IF pid IS NULL AND rowdata ? 'activity_id' AND to_regclass('public.student_activities') IS NOT NULL THEN
      SELECT profile_id INTO pid FROM public.student_activities WHERE id=(rowdata->>'activity_id')::integer;
    END IF;
    IF pid IS NULL AND rowdata ? 'test_plan_id' AND to_regclass('public.test_plans') IS NOT NULL THEN
      SELECT profile_id INTO pid FROM public.test_plans WHERE id=(rowdata->>'test_plan_id')::integer;
    END IF;
    IF pid IS NOT NULL AND NOT(pid=ANY(seen)) THEN
      seen := array_append(seen,pid);
      FOREACH scope_name IN ARRAY ARRAY['profile:'||pid,'documents:'||pid,'applications:'||pid] LOOP
        INSERT INTO public.cache_revisions(scope,revision,reason,updated_at)
        VALUES(scope_name,2,'mutation:'||TG_TABLE_NAME,clock_timestamp())
        ON CONFLICT(scope) DO UPDATE SET revision=public.cache_revisions.revision+1,reason=EXCLUDED.reason,updated_at=EXCLUDED.updated_at;
      END LOOP;
    END IF;
  END LOOP;
  RETURN NULL;
END $$;
REVOKE ALL ON FUNCTION public.profile_mutation_revision() FROM PUBLIC;
DO $$ DECLARE tab text; BEGIN
  FOREACH tab IN ARRAY ARRAY['student_profiles','applications','user_documents','student_activities','saved_universities','saved_scholarships','saved_programs','application_requirements','test_plans','scholarship_decisions','application_documents','application_document_links','application_tasks','application_outcomes','activity_evidence','test_attempts','test_tasks'] LOOP
    IF to_regclass('public.'||tab) IS NOT NULL THEN
      EXECUTE format('DROP TRIGGER IF EXISTS profile_revision ON public.%I',tab);
      EXECUTE format('CREATE TRIGGER profile_revision AFTER INSERT OR UPDATE OR DELETE ON public.%I FOR EACH ROW EXECUTE FUNCTION public.profile_mutation_revision()',tab);
    END IF;
  END LOOP;
END $$;
ALTER TABLE public.cache_revisions ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.cache_revisions FROM PUBLIC,anon,authenticated;
GRANT ALL ON public.cache_revisions TO postgres,service_role;
COMMIT;
