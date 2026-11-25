-- A homepage alone does not substantiate an exact application deadline.
-- Retain every previous row in the audit log and keep any cycle with a specific linked official source.
WITH review AS MATERIALIZED (
  SELECT c.id,to_jsonb(c) AS previous
  FROM public.application_cycles c
  WHERE c.is_active AND c.is_verified AND c.verification_status='verified'
    AND (c.source_url IS NULL OR c.source_url ~ '^https?://[^/]+/?$')
    AND NOT EXISTS (
      SELECT 1 FROM public.sources s
      WHERE s.id IN (c.source_id,c.official_source_id) AND s.is_verified AND s.is_official
        AND s.url ~ '^https://[^/]+/[^/?#]'
    )
), archived AS (
  UPDATE public.application_cycles c
  SET is_active=false,is_verified=false,verification_status='unverified'
  FROM review r WHERE c.id=r.id AND to_jsonb(c)=r.previous
  RETURNING c.id
), audited AS (
  INSERT INTO public.audit_logs (entity_type,entity_id,field_changed,old_value,new_value,source,actor,verification_status)
  SELECT 'application_cycle',a.id,'publication_state',r.previous::text,
    '{"is_active":false,"is_verified":false,"verification_status":"unverified"}',
    '2026-11-25 deadline evidence review: no specific source','catalogue_review','unverified'
  FROM archived a JOIN review r ON r.id=a.id
  RETURNING id
), invalidated AS (
  INSERT INTO public.cache_revisions(scope,revision,reason,updated_at)
  SELECT scope,2,'2026-11-25 deadline evidence review',now()
  FROM (VALUES ('catalogue'),('evidence')) scopes(scope)
  WHERE EXISTS(SELECT 1 FROM archived)
  ON CONFLICT(scope) DO UPDATE SET revision=public.cache_revisions.revision+1,
     reason=EXCLUDED.reason,updated_at=EXCLUDED.updated_at
  RETURNING scope
)
SELECT (SELECT count(*) FROM review) AS reviewed,
       (SELECT count(*) FROM archived) AS archived,
       (SELECT count(*) FROM audited) AS audited,
       (SELECT count(*) FROM invalidated) AS cache_scopes;
