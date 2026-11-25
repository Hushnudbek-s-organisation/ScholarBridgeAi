-- The 2027 international catalogue cannot substantiate these older tuition assignments.
-- Keep records and all history; independent general-degree evidence is retained where exact.
WITH gap(id,name,amount,identity_confirmed) AS (VALUES
 (402,'Electronic Engineering',30000,false),
 (403,'Electrical Engineering',30000,false),
 (405,'Civil Engineering',30000,true),
 (413,'Business Administration',26000,true),
 (419,'Environmental Science and Engineering',30000,false)
), matching AS MATERIALIZED (
 SELECT g.*,to_jsonb(p) previous FROM gap g JOIN public.programs p ON p.id=g.id AND p.name=g.name
 WHERE p.university_id=20 AND p.annual_tuition=g.amount AND p.tuition_currency='CNY' AND p.tuition_period='year'
 AND p.is_active AND p.source_url='https://international.join-tsinghua.edu.cn/Admission1/Fees.htm'
), src AS (
 INSERT INTO public.sources(url,title,domain,source_type,accessed_at,is_official,is_verified)
 SELECT 'https://www.tsinghua.edu.cn/en/Admissions/Undergraduate/Degree_Programs.htm','Tsinghua general undergraduate degree programme list','www.tsinghua.edu.cn','official_programme',now(),true,true
 WHERE EXISTS(SELECT 1 FROM matching WHERE identity_confirmed)
 ON CONFLICT(url) DO UPDATE SET accessed_at=excluded.accessed_at,is_official=true,is_verified=true RETURNING id,url
), updated AS (
 UPDATE public.programs p SET annual_tuition=NULL,tuition_amount=NULL,
 is_verified=m.identity_confirmed,verification_status=CASE WHEN m.identity_confirmed THEN 'verified' ELSE 'unverified' END,
 source_url=CASE WHEN m.identity_confirmed THEN 'https://www.tsinghua.edu.cn/en/Admissions/Undergraduate/Degree_Programs.htm' ELSE p.source_url END,
 official_url=CASE WHEN m.identity_confirmed THEN 'https://www.tsinghua.edu.cn/en/Admissions/Undergraduate/Degree_Programs.htm' ELSE p.official_url END,
 description=CASE WHEN m.identity_confirmed THEN m.name||' is listed in the general undergraduate catalogue. Current international admission route and tuition are not confirmed.'
 ELSE m.name||' — the current international undergraduate catalogue has not confirmed this exact programme title and fee. Review needed.' END,
 last_verified_at=CASE WHEN m.identity_confirmed THEN now() ELSE p.last_verified_at END
 FROM matching m WHERE p.id=m.id AND to_jsonb(p)=m.previous
 RETURNING p.id,p.is_verified,p.verification_status,p.description
), linked AS (
 INSERT INTO public.program_sources(program_id,source_id,source_type)
 SELECT u.id,s.id,'program_evidence' FROM updated u CROSS JOIN src s WHERE u.is_verified
 AND NOT EXISTS(SELECT 1 FROM public.program_sources ps WHERE ps.program_id=u.id AND ps.source_id=s.id AND ps.source_type='program_evidence')
 RETURNING program_id
), audited AS (
 INSERT INTO public.audit_logs(entity_type,entity_id,field_changed,old_value,new_value,source,actor,verification_status)
 SELECT 'program',u.id,'tuition_and_identity_review',m.previous::text,
 jsonb_build_object('annual_tuition',NULL,'identity_verified',u.is_verified,'reason',u.description)::text,
 'https://international.join-tsinghua.edu.cn/info/1052/1182.htm','catalogue_review',u.verification_status
 FROM updated u JOIN matching m ON m.id=u.id RETURNING id
), revision AS (
 INSERT INTO public.cache_revisions(scope,revision,reason,updated_at)
 SELECT scope,2,'2026-11-25 unsupported programme fee assignments withheld',now() FROM (VALUES ('catalogue'),('evidence')) s(scope)
 WHERE EXISTS(SELECT 1 FROM updated)
 ON CONFLICT(scope) DO UPDATE SET revision=public.cache_revisions.revision+1,reason=excluded.reason,updated_at=excluded.updated_at RETURNING scope
)
SELECT (SELECT count(*) FROM updated) withheld_fees,(SELECT count(*) FROM updated WHERE NOT is_verified) pending_identity_review,
 (SELECT count(*) FROM linked) identity_links,(SELECT count(*) FROM audited) audit_rows,(SELECT count(*) FROM revision) cache_scopes;
