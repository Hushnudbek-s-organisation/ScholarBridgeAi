-- Every active LSE programme already in the catalogue, matched to its 2027/28 official page.
-- Preserve exact program ID; update the two programme names to current official titles.
WITH evidence(id,old_name,new_name,amount,period,duration,unit,url,title,note) AS (
 VALUES
 (1309,'BSc Economics','BSc Economics',41900,'year',3,'years','https://www.lse.ac.uk/study-at-lse/undergraduate/bsc-economics','2027/28 LSE overseas full-time tuition per year — BSc Economics',NULL),
 (1310,'BSc Finance','BSc Finance',39300,'year',3,'years','https://www.lse.ac.uk/study-at-lse/undergraduate/bsc-finance','2027/28 LSE overseas full-time tuition per year — BSc Finance',NULL),
 (1311,'BSc Management','BSc Management',37500,'year',3,'years','https://www.lse.ac.uk/study-at-lse/undergraduate/bsc-management','2027/28 LSE overseas full-time tuition per year — BSc Management',NULL),
 (1312,'BSc Data Science','BSc Data Science',37500,'year',3,'years','https://www.lse.ac.uk/study-at-lse/undergraduate/bsc-data-science','2027/28 LSE overseas full-time tuition per year — BSc Data Science',NULL),
 (1313,'BSc Mathematics and Economics','BSc Mathematics and Economics',39300,'year',3,'years','https://www.lse.ac.uk/study-at-lse/undergraduate/bsc-mathematics-and-economics','2027/28 LSE overseas full-time tuition per year — BSc Mathematics and Economics',NULL),
 (1314,'BSc Politics and International Relations','BSc Politics and International Relations',33800,'year',3,'years','https://www.lse.ac.uk/study-at-lse/undergraduate/bsc-politics-and-international-relations','2027/28 LSE overseas full-time tuition per year — BSc Politics and International Relations',NULL),
 (1315,'LLB Bachelor of Laws','LLB Bachelor of Laws',37500,'year',3,'years','https://www.lse.ac.uk/study-at-lse/undergraduate/llb-bachelor-of-laws','2027/28 LSE overseas full-time tuition per year — LLB Bachelor of Laws',NULL),
 (1316,'BSc Accounting and Finance','BSc Accounting and Finance',39300,'year',3,'years','https://www.lse.ac.uk/study-at-lse/undergraduate/bsc-accounting-and-finance','2027/28 LSE overseas full-time tuition per year — BSc Accounting and Finance',NULL),
 (1317,'MSc Economics','MSc Economics',43100,'total',10,'months','https://www.lse.ac.uk/study-at-lse/graduate/msc-economics','2027/28 LSE overseas full-time tuition for the programme — MSc Economics',NULL),
 (1318,'MSc Finance','MSc Finance (full-time)',53600,'total',10,'months','https://www.lse.ac.uk/study-at-lse/graduate/msc-finance-full-time','2027/28 LSE overseas full-time tuition for the programme — MSc Finance (full-time)',NULL),
 (1319,'MSc Data Science','MSc Data Science',41900,'total',12,'months','https://www.lse.ac.uk/study-at-lse/graduate/msc-data-science','2027/28 LSE overseas full-time tuition for the programme — MSc Data Science',NULL),
 (1320,'MSc Management and Strategy','MSc Management, Strategy and Economic Analysis',41900,'total',12,'months','https://www.lse.ac.uk/study-at-lse/graduate/msc-management-strategy-and-economic-analysis','2027/28 LSE overseas full-time tuition for the programme — MSc Management, Strategy and Economic Analysis',NULL),
 (1321,'MSc International Relations','MSc International Relations',34200,'total',12,'months','https://www.lse.ac.uk/study-at-lse/graduate/msc-international-relations','2027/28 LSE overseas full-time tuition for the programme — MSc International Relations',NULL),
 (1322,'PhD in Economics','MRes/PhD Economics',25300,'year',NULL,'years','https://www.lse.ac.uk/study-at-lse/graduate/mresphd-economics','2027/28 LSE doctoral overseas fee for first year only; later years may increase','Official 2027/28 programme spans five to six years (two years MRes and three to four years PhD). GBP 25,300 is the first-year overseas fee, not a fixed fee for subsequent years.'),
 (4991,'BSc Economics and Data Science','BSc Economics and Data Science',37500,'year',3,'years','https://www.lse.ac.uk/study-at-lse/undergraduate/bsc-economics-and-data-science','2027/28 LSE overseas full-time tuition per year — BSc Economics and Data Science',NULL)
), matching AS MATERIALIZED (
 SELECT e.*,to_jsonb(p) previous FROM evidence e JOIN public.programs p ON p.id=e.id AND p.name=e.old_name
 WHERE p.university_id=76 AND p.is_active AND p.duration IS NULL AND (p.annual_tuition IS NULL OR p.annual_tuition=e.amount)
  AND (p.source_url IS NULL OR p.source_url=e.url)
  AND NOT EXISTS(SELECT 1 FROM public.programs p2 WHERE p2.university_id=76 AND p2.id<>p.id AND lower(btrim(p2.name))=lower(btrim(e.new_name)) AND lower(btrim(coalesce(p2.degree_level,'')))=lower(btrim(coalesce(p.degree_level,''))))
), src AS (
 INSERT INTO public.sources(url,title,domain,source_type,accessed_at,is_official,is_verified)
 SELECT url,title,'www.lse.ac.uk','official_programme',now(),true,true FROM matching
 ON CONFLICT(url) DO UPDATE SET title=excluded.title,accessed_at=excluded.accessed_at,is_official=true,is_verified=true RETURNING id,url
), updated AS (
 UPDATE public.programs p SET name=m.new_name,source_url=m.url,official_url=m.url,annual_tuition=m.amount,tuition_amount=m.amount,
 tuition_currency='GBP',tuition_period=m.period,duration=m.duration,duration_unit=m.unit,
 duration_years=CASE WHEN m.unit='years' THEN m.duration WHEN m.duration=12 THEN 1 ELSE NULL END,
 study_mode='full-time',description=coalesce(m.note,p.description),is_verified=true,verification_status='verified',last_verified_at=now()
 FROM matching m WHERE p.id=m.id AND to_jsonb(p)=m.previous
 RETURNING p.id,p.name,p.source_url,p.annual_tuition,p.tuition_period,p.duration,p.duration_unit
), linked AS (
 INSERT INTO public.program_sources(program_id,source_id,source_type)
 SELECT u.id,s.id,k.kind FROM updated u JOIN src s ON s.url=u.source_url CROSS JOIN (VALUES ('program_evidence'),('tuition')) k(kind)
 WHERE NOT EXISTS(SELECT 1 FROM public.program_sources ps WHERE ps.program_id=u.id AND ps.source_id=s.id AND ps.source_type=k.kind)
 RETURNING program_id
), audited AS (
 INSERT INTO public.audit_logs(entity_type,entity_id,field_changed,old_value,new_value,source,actor,verification_status)
 SELECT 'program',u.id,'lse_2027_28_programme_and_tuition',m.previous::text,to_jsonb(u)::text,u.source_url,'catalogue_review','verified'
 FROM updated u JOIN matching m ON m.id=u.id RETURNING id
), revision AS (
 INSERT INTO public.cache_revisions(scope,revision,reason,updated_at)
 SELECT scope,2,'2026-11-25 all LSE existing programmes verified against 2027/28 sources',now() FROM(VALUES ('catalogue'),('evidence')) s(scope)
 WHERE EXISTS(SELECT 1 FROM updated)
 ON CONFLICT(scope) DO UPDATE SET revision=public.cache_revisions.revision+1,reason=excluded.reason,updated_at=excluded.updated_at RETURNING scope
)
SELECT (SELECT count(*) FROM updated) AS updated,(SELECT count(*) FROM matching WHERE previous->>'verification_status'='unverified') AS newly_verified,
 (SELECT count(*) FROM linked) links,(SELECT count(*) FROM audited) audit_rows,(SELECT count(*) FROM revision) cache_scopes;
