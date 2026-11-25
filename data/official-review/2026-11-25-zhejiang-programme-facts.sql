-- Zhejiang University's published 2027 international programme catalogs.
-- Do not import dates from the undergraduate guide: its deadline year is inconsistent with its heading.
WITH evidence(id,name,old_url,url,title,years,language,amount,period) AS (
 VALUES
 (448,'Computer Science and Technology','http://www.cs.zju.edu.cn/csen',
  'https://iczu.zju.edu.cn/_upload/article/files/0f/d6/b10d4dee4017b5f2898acb548c3a/efde9e8e-391f-4dff-a11c-5a9e0a2661c6.pdf',
  'Zhejiang University 2027 — Chinese-taught international undergraduate programs and fees',4.0,'Chinese',24800,'year'),
 (460,'MBA (English-taught)','http://www.mba.zju.edu.cn/en',
  'https://iczu.zju.edu.cn/_upload/article/files/25/a1/842e33f040caaf0d1341eaa5dba3/1da9c136-2a61-4397-b4a7-5f5eb24f2129.pdf',
  'Zhejiang University 2027 — English-taught international master programs and fees',2.0,'English',218000,'total'),
 (461,'MSc in Computer Science and Technology','http://www.cs.zju.edu.cn/csen',
  'https://iczu.zju.edu.cn/_upload/article/files/25/a1/842e33f040caaf0d1341eaa5dba3/1da9c136-2a61-4397-b4a7-5f5eb24f2129.pdf',
  'Zhejiang University 2027 — English-taught international master programs and fees',3.0,'English',36800,'year')
), matching AS MATERIALIZED (
 SELECT e.*,to_jsonb(p) previous
 FROM evidence e JOIN public.programs p ON p.id=e.id AND p.name=e.name AND p.source_url=e.old_url
 WHERE p.university_id=36 AND p.is_active AND p.is_verified AND p.verification_status='verified'
), source_rows AS (
 INSERT INTO public.sources(url,title,domain,source_type,accessed_at,is_official,is_verified)
 SELECT DISTINCT url,title,'iczu.zju.edu.cn','official_programme',now(),true,true FROM matching
 ON CONFLICT(url) DO UPDATE SET title=EXCLUDED.title,accessed_at=EXCLUDED.accessed_at,is_official=true,is_verified=true
 RETURNING id,url
), updated AS (
 UPDATE public.programs p SET source_url=m.url,official_url=m.url,language=m.language,
 duration=m.years,duration_years=m.years,annual_tuition=m.amount,tuition_amount=m.amount,
 tuition_currency='CNY',tuition_period=m.period,last_verified_at=now()
 FROM matching m WHERE p.id=m.id AND to_jsonb(p)=m.previous
 RETURNING p.id,p.source_url,p.duration,p.annual_tuition,p.tuition_currency,p.tuition_period
), linked AS (
 INSERT INTO public.program_sources(program_id,source_id,source_type)
 SELECT p.id,s.id,k.kind FROM updated p JOIN source_rows s ON s.url=p.source_url
 CROSS JOIN (VALUES ('program_evidence'),('tuition')) k(kind)
 WHERE NOT EXISTS(SELECT 1 FROM public.program_sources l WHERE l.program_id=p.id AND l.source_id=s.id AND l.source_type=k.kind)
 RETURNING program_id
), audited AS (
 INSERT INTO public.audit_logs(entity_type,entity_id,field_changed,old_value,new_value,source,actor,verification_status)
 SELECT 'program',u.id,'programme_source_and_fields',m.previous::text,
 jsonb_build_object('source_url',u.source_url,'duration',u.duration,'annual_tuition',u.annual_tuition,'currency',u.tuition_currency,'period',u.tuition_period)::text,
 m.url,'catalogue_review','verified'
 FROM updated u JOIN matching m ON m.id=u.id RETURNING id
), revision AS (
 INSERT INTO public.cache_revisions(scope,revision,reason,updated_at)
 SELECT scope,2,'2026-11-25 verified Zhejiang 2027 programme facts',now() FROM (VALUES ('catalogue'),('evidence')) scopes(scope)
 WHERE EXISTS(SELECT 1 FROM updated)
 ON CONFLICT(scope) DO UPDATE SET revision=public.cache_revisions.revision+1,reason=EXCLUDED.reason,updated_at=EXCLUDED.updated_at
 RETURNING scope
)
SELECT (SELECT count(*) FROM updated) updated,(SELECT count(*) FROM linked) linked,
 (SELECT count(*) FROM audited) audited,(SELECT count(*) FROM revision) cache_scopes;
