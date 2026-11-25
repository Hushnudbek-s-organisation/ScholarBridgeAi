-- LSE only publishes a variable annual studentship for 2027 entry; 2026 stipend is not a 2027 amount.
WITH matching AS MATERIALIZED (
 SELECT s.id,to_jsonb(s) AS previous FROM public.scholarships s
 WHERE s.id=154 AND s.title='LSE PhD Studentships' AND s.is_active
 AND s.award_currency='GBP' AND s.award_basis='variable' AND s.award_amount IS NULL AND s.amount_usd_value=24960
), updated AS (
 UPDATE public.scholarships s SET amount_usd_value=NULL,deadline_date=NULL,last_verified_at=now()
 FROM matching m WHERE s.id=m.id AND to_jsonb(s)=m.previous
 RETURNING s.id,s.amount_usd_value,s.award_currency,s.award_basis,s.deadline_date,s.deadline
), audited AS (
 INSERT INTO public.audit_logs(entity_type,entity_id,field_changed,old_value,new_value,source,actor,verification_status)
 SELECT 'scholarship',u.id,'variable_award_and_department_deadline',m.previous::text,to_jsonb(u)::text,
 'https://www.lse.ac.uk/study-at-lse/Graduate/fees-and-funding/phd-studentships','catalogue_review','verified'
 FROM updated u JOIN matching m ON m.id=u.id RETURNING id
), revision AS (
 INSERT INTO public.cache_revisions(scope,revision,reason,updated_at)
 SELECT scope,2,'2026-11-25 LSE studentship fixed legacy amount and universal date withheld',now()
 FROM (VALUES ('catalogue'),('evidence')) s(scope) WHERE EXISTS(SELECT 1 FROM updated)
 ON CONFLICT(scope) DO UPDATE SET revision=public.cache_revisions.revision+1,reason=excluded.reason,updated_at=excluded.updated_at
 RETURNING scope
)
SELECT (SELECT count(*) FROM updated) corrected,(SELECT count(*) FROM audited) audited,(SELECT count(*) FROM revision) cache_scopes;
