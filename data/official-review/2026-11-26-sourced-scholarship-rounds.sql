-- Reconcile three application notices against their official 2027 cycle.
-- Conditional row matches hold back rows that have already been revised.
WITH candidates(id, previous_deadline, next_deadline, next_status, deadline_type, next_label, source_url) AS (
  VALUES
    (995, DATE '2027-01-15', DATE '2027-01-14', 'open', 'exact',
     'International undergraduate Regular Admissions for Fall 2027: 14 January 2027, 18:00 KST. Recommendation letter: 21 January 2027, 18:00 KST.',
     'https://admission.kaist.ac.kr/intl-undergraduate/application/ApplicationGuide/ApplicationTimeline'),
    (888, DATE '2027-03-31', NULL::date, 'closed', 'unknown',
     'Applications for the 2027/28 Chevening Scholarship in Uzbekistan are closed.',
     'https://www.chevening.org/scholarship/uzbekistan/'),
    (860, DATE '2027-01-15', NULL::date, 'upcoming', 'not_announced',
     'The sponsor announced that the 2027/28 application period would open soon. An exact deadline was not given in the 26 November notice.',
     'https://stipendiumhungaricum.hu/news/stipendium-hungaricum-scholarship-applications-opening-soon/')
), reviewed AS MATERIALIZED (
  SELECT c.*, to_jsonb(s) AS previous
  FROM candidates c JOIN public.scholarships s ON c.id = s.id
  WHERE s.is_active AND s.deadline_date = c.previous_deadline
    AND (s.last_verified_at IS NULL OR s.last_verified_at < TIMESTAMPTZ '2026-11-27 00:00:00+05')
), updated AS (
  UPDATE public.scholarships s
  SET deadline_date = r.next_deadline, deadline = r.next_label,
      application_status = r.next_status, deadline_type = r.deadline_type,
      deadline_range_start = NULL, deadline_range_end = NULL,
      opening_date = CASE WHEN r.id = 995 THEN DATE '2026-11-10' ELSE NULL END,
      rounds = '[]', source_url = r.source_url, last_verified_at = now(), last_updated_at = now()
  FROM reviewed r
  WHERE s.id = r.id AND to_jsonb(s) = r.previous
  RETURNING s.id, s.deadline_date, s.application_status, s.deadline_type, s.source_url
), audited AS (
  INSERT INTO public.audit_logs(entity_type, entity_id, field_changed, old_value, new_value, source, actor, verification_status)
  SELECT 'scholarship', u.id, 'application_window', r.previous::text, to_jsonb(u)::text, r.source_url, 'catalogue_review', 'verified'
  FROM updated u JOIN reviewed r ON r.id = u.id
  RETURNING id
), invalidated AS (
  INSERT INTO public.cache_revisions(scope, revision, reason, updated_at)
  SELECT scope, 2, '2026-11-26 official scholarship rounds', now()
  FROM (VALUES ('catalogue'), ('evidence')) scopes(scope)
  WHERE EXISTS (SELECT 1 FROM updated)
  ON CONFLICT (scope) DO UPDATE SET revision = public.cache_revisions.revision + 1,
    reason = EXCLUDED.reason, updated_at = EXCLUDED.updated_at
  RETURNING scope
)
SELECT (SELECT count(*) FROM updated) AS updated,
       (SELECT count(*) FROM audited) AS audited,
       (SELECT count(*) FROM invalidated) AS cache_scopes;
