-- Programme-specific international tuition explicitly published for the referenced period.
WITH evidence(university_id,program_id,name,amount,currency,period,title,url) AS (
 VALUES
  (27,702,'Bachelor of Advanced Computing (Honours)',57640,'AUD','year','2027 · annual indicative international tuition — Bachelor of Advanced Computing (Honours)','https://programsandcourses.anu.edu.au/2027/program/aacom'),
  (27,704,'Bachelor of Engineering (Honours)',57640,'AUD','year','2027 · annual indicative international tuition — Bachelor of Engineering (Honours)','https://programsandcourses.anu.edu.au/2027/program/AENGI'),
  (27,707,'Bachelor of Economics',57640,'AUD','year','2027 · annual indicative international tuition — Bachelor of Economics','https://programsandcourses.anu.edu.au/2027/program/BECON'),
  (27,708,'Bachelor of Science',57640,'AUD','year','2027 · annual indicative international tuition — Bachelor of Science','https://programsandcourses.anu.edu.au/2027/program/BSC'),
  (27,4780,'Bachelor of Arts (Honours)',51170,'AUD','year','2027 · annual indicative international tuition — Bachelor of Arts (Honours)','https://programsandcourses.anu.edu.au/2027/program/harts'),
  (76,1309,'BSc Economics',41900,'GBP','year','2027/28 · overseas tuition per year — BSc Economics','https://www.lse.ac.uk/study-at-lse/undergraduate/bsc-economics'),
  (76,1310,'BSc Finance',39300,'GBP','year','2027/28 · overseas tuition per year — BSc Finance','https://www.lse.ac.uk/study-at-lse/undergraduate/bsc-finance'),
  (76,1311,'BSc Management',37500,'GBP','year','2027/28 · overseas tuition per year — BSc Management','https://www.lse.ac.uk/study-at-lse/undergraduate/bsc-management'),
  (76,1316,'BSc Accounting and Finance',39300,'GBP','year','2027/28 · overseas tuition per year — BSc Accounting and Finance','https://www.lse.ac.uk/study-at-lse/undergraduate/bsc-accounting-and-finance'),
  (76,4991,'BSc Economics and Data Science',37500,'GBP','year','2027/28 · overseas tuition per year — BSc Economics and Data Science','https://www.lse.ac.uk/study-at-lse/undergraduate/bsc-economics-and-data-science')
), matching AS (
 SELECT e.* FROM evidence e JOIN public.programs p
   ON p.id=e.program_id AND p.university_id=e.university_id AND p.name=e.name
 WHERE p.is_active AND p.is_verified AND p.verification_status='verified'
   AND p.annual_tuition IS NULL
), sources_written AS (
 INSERT INTO public.sources(url,title,domain,source_type,accessed_at,is_official,is_verified)
 SELECT DISTINCT ON(url) url,title,split_part(url,'/',3),'official_tuition',now(),true,true FROM matching ORDER BY url,title
 ON CONFLICT(url) DO UPDATE SET title=EXCLUDED.title,accessed_at=EXCLUDED.accessed_at,is_official=true,is_verified=true
 RETURNING id,url
), updated AS (
 UPDATE public.programs p
 SET annual_tuition=m.amount,tuition_currency=m.currency,tuition_period=m.period,last_verified_at=now()
 FROM matching m WHERE p.id=m.program_id AND p.university_id=m.university_id AND p.name=m.name AND p.annual_tuition IS NULL
 RETURNING p.id,p.university_id,p.name,p.annual_tuition,p.tuition_currency,p.tuition_period
), linked AS (
 INSERT INTO public.program_sources(program_id,source_id,source_type)
 SELECT p.id,s.id,'tuition' FROM updated p JOIN matching m ON p.id=m.program_id JOIN sources_written s ON s.url=m.url
 WHERE NOT EXISTS(SELECT 1 FROM public.program_sources x WHERE x.program_id=p.id AND x.source_id=s.id AND x.source_type='tuition')
 RETURNING program_id
), audited AS (
 INSERT INTO public.audit_logs(entity_type,entity_id,field_changed,old_value,new_value,source,actor,verification_status)
 SELECT 'program',u.id,'annual_tuition',NULL,
  jsonb_build_object('amount',u.annual_tuition,'currency',u.tuition_currency,'period',u.tuition_period,'scope',m.title)::text,
  m.url,'catalogue_review','verified'
 FROM updated u JOIN matching m ON m.program_id=u.id RETURNING id
), revision AS (
 INSERT INTO public.cache_revisions(scope,revision,reason,updated_at)
 SELECT scope,2,'2026-11-25 published international programme tuition',now() FROM (VALUES ('catalogue'),('evidence')) scopes(scope)
 WHERE EXISTS(SELECT 1 FROM updated)
 ON CONFLICT(scope) DO UPDATE SET revision=public.cache_revisions.revision+1,reason=EXCLUDED.reason,updated_at=EXCLUDED.updated_at
 RETURNING scope
)
SELECT (SELECT count(*) FROM updated) AS updated,
       (SELECT count(*) FROM linked) AS linked,
       (SELECT count(*) FROM audited) AS audited,
       (SELECT count(*) FROM revision) AS cache_scopes;
