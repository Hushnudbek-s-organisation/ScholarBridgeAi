-- Verified 2026/27 fee scopes, checked 2026-11-25. Programme identity and tuition are separate.
WITH evidence(id,university_id,name,amount,currency,old_period,url,title,identity_url,note) AS (
 VALUES
  (8,1,'MBA (MIT Sloan School of Management)',91892,'USD','year','https://mitsloan.mit.edu/mba/admissions/financing-your-education','2026–27 full-time MBA annual tuition, including mandatory MBA programme fee',NULL,NULL),
  (194,11,'Computer Science (Penn Engineering)',65670,'USD','academic year','https://srfs.upenn.edu/costs-budgeting/undergraduate-cost-attendance','2026–27 Penn undergraduate tuition per academic year, excluding additional fees and living costs',NULL,NULL),
  (195,11,'Finance (Wharton concentration)',65670,'USD','academic year','https://srfs.upenn.edu/costs-budgeting/undergraduate-cost-attendance','2026–27 Penn undergraduate tuition per academic year, excluding additional fees and living costs',NULL,NULL),
  (196,11,'Economics (College of Arts and Sciences)',65670,'USD','academic year','https://srfs.upenn.edu/costs-budgeting/undergraduate-cost-attendance','2026–27 Penn undergraduate tuition per academic year, excluding additional fees and living costs',NULL,NULL),
  (197,11,'Bioengineering',65670,'USD','academic year','https://srfs.upenn.edu/costs-budgeting/undergraduate-cost-attendance','2026–27 Penn undergraduate tuition per academic year, excluding additional fees and living costs',NULL,NULL),
  (198,11,'Electrical Engineering',65670,'USD','academic year','https://srfs.upenn.edu/costs-budgeting/undergraduate-cost-attendance','2026–27 Penn undergraduate tuition per academic year, excluding additional fees and living costs',NULL,NULL),
  (199,11,'Mechanical Engineering and Applied Mechanics',65670,'USD','academic year','https://srfs.upenn.edu/costs-budgeting/undergraduate-cost-attendance','2026–27 Penn undergraduate tuition per academic year, excluding additional fees and living costs',NULL,NULL),
  (200,11,'Nursing',65670,'USD','academic year','https://srfs.upenn.edu/costs-budgeting/undergraduate-cost-attendance','2026–27 Penn undergraduate tuition per academic year, excluding additional fees and living costs',NULL,NULL),
  (201,11,'Business Analytics (Wharton concentration)',65670,'USD','academic year','https://srfs.upenn.edu/costs-budgeting/undergraduate-cost-attendance','2026–27 Penn undergraduate tuition per academic year, excluding additional fees and living costs',NULL,NULL),
  (202,11,'Management (Wharton concentration)',65670,'USD','academic year','https://srfs.upenn.edu/costs-budgeting/undergraduate-cost-attendance','2026–27 Penn undergraduate tuition per academic year, excluding additional fees and living costs',NULL,NULL),
  (203,11,'Marketing (Wharton concentration)',65670,'USD','academic year','https://srfs.upenn.edu/costs-budgeting/undergraduate-cost-attendance','2026–27 Penn undergraduate tuition per academic year, excluding additional fees and living costs',NULL,NULL),
  (204,11,'Political Science',65670,'USD','academic year','https://srfs.upenn.edu/costs-budgeting/undergraduate-cost-attendance','2026–27 Penn undergraduate tuition per academic year, excluding additional fees and living costs',NULL,NULL),
  (205,11,'Psychology',65670,'USD','academic year','https://srfs.upenn.edu/costs-budgeting/undergraduate-cost-attendance','2026–27 Penn undergraduate tuition per academic year, excluding additional fees and living costs',NULL,NULL),
  (206,11,'Philosophy',65670,'USD','academic year','https://srfs.upenn.edu/costs-budgeting/undergraduate-cost-attendance','2026–27 Penn undergraduate tuition per academic year, excluding additional fees and living costs',NULL,NULL),
  (207,11,'Biology',65670,'USD','academic year','https://srfs.upenn.edu/costs-budgeting/undergraduate-cost-attendance','2026–27 Penn undergraduate tuition per academic year, excluding additional fees and living costs',NULL,NULL),
  (401,20,'Computer Science and Technology',30000,'CNY','year','https://international.join-tsinghua.edu.cn/Admission1/Fees.htm','International undergraduate tuition schedule — annual rates by admission division; dual-degree fee applies only at THU','https://international.join-tsinghua.edu.cn/info/1052/1182.htm',NULL),
  (404,20,'Mechanical Engineering',30000,'CNY','year','https://international.join-tsinghua.edu.cn/Admission1/Fees.htm','International undergraduate tuition schedule — annual rates by admission division; dual-degree fee applies only at THU','https://international.join-tsinghua.edu.cn/info/1052/1182.htm',NULL),
  (407,20,'Architecture',30000,'CNY','year','https://international.join-tsinghua.edu.cn/Admission1/Fees.htm','International undergraduate tuition schedule — annual rates by admission division; dual-degree fee applies only at THU','https://international.join-tsinghua.edu.cn/info/1052/1182.htm',NULL),
  (408,20,'Physics',30000,'CNY','year','https://international.join-tsinghua.edu.cn/Admission1/Fees.htm','International undergraduate tuition schedule — annual rates by admission division; dual-degree fee applies only at THU','https://international.join-tsinghua.edu.cn/info/1052/1182.htm',NULL),
  (409,20,'Mathematics',30000,'CNY','year','https://international.join-tsinghua.edu.cn/Admission1/Fees.htm','International undergraduate tuition schedule — annual rates by admission division; dual-degree fee applies only at THU','https://international.join-tsinghua.edu.cn/info/1052/1182.htm',NULL),
  (410,20,'Chemistry',30000,'CNY','year','https://international.join-tsinghua.edu.cn/Admission1/Fees.htm','International undergraduate tuition schedule — annual rates by admission division; dual-degree fee applies only at THU','https://international.join-tsinghua.edu.cn/info/1052/1182.htm',NULL),
  (411,20,'Biology',30000,'CNY','year','https://international.join-tsinghua.edu.cn/Admission1/Fees.htm','International undergraduate tuition schedule — annual rates by admission division; dual-degree fee applies only at THU','https://international.join-tsinghua.edu.cn/info/1052/1182.htm',NULL),
  (412,20,'Economics and Finance',26000,'CNY','year','https://international.join-tsinghua.edu.cn/Admission1/Fees.htm','International undergraduate tuition schedule — annual rates by admission division; dual-degree fee applies only at THU','https://international.join-tsinghua.edu.cn/info/1052/1182.htm',NULL),
  (414,20,'Law',26000,'CNY','year','https://international.join-tsinghua.edu.cn/Admission1/Fees.htm','International undergraduate tuition schedule — annual rates by admission division; dual-degree fee applies only at THU','https://international.join-tsinghua.edu.cn/info/1052/1182.htm',NULL),
  (415,20,'Automation',30000,'CNY','year','https://international.join-tsinghua.edu.cn/Admission1/Fees.htm','International undergraduate tuition schedule — annual rates by admission division; dual-degree fee applies only at THU','https://international.join-tsinghua.edu.cn/info/1052/1182.htm',NULL),
  (416,20,'Materials Science and Engineering',30000,'CNY','year','https://international.join-tsinghua.edu.cn/Admission1/Fees.htm','International undergraduate tuition schedule — annual rates by admission division; dual-degree fee applies only at THU','https://international.join-tsinghua.edu.cn/info/1052/1182.htm',NULL),
  (417,20,'Biomedical Engineering',30000,'CNY','year','https://international.join-tsinghua.edu.cn/Admission1/Fees.htm','International undergraduate tuition schedule — annual rates by admission division; dual-degree fee applies only at THU','https://international.join-tsinghua.edu.cn/info/1052/1182.htm',NULL),
  (418,20,'Aerospace Engineering',30000,'CNY','year','https://international.join-tsinghua.edu.cn/Admission1/Fees.htm','International undergraduate tuition schedule — annual rates by admission division; dual-degree fee applies only at THU','https://international.join-tsinghua.edu.cn/info/1052/1182.htm',NULL),
  (420,20,'Industrial Engineering',30000,'CNY','year','https://international.join-tsinghua.edu.cn/Admission1/Fees.htm','International undergraduate tuition schedule — annual rates by admission division; dual-degree fee applies only at THU','https://international.join-tsinghua.edu.cn/info/1052/1182.htm',NULL),
  (421,20,'Global Talents in Science and Engineering Program',100000,'CNY','year','https://international.join-tsinghua.edu.cn/Admission1/Fees.htm','International undergraduate tuition schedule — annual rates by admission division; dual-degree fee applies only at THU',NULL,NULL),
  (422,20,'Urban Regeneration and Design Program',100000,'CNY','year','https://international.join-tsinghua.edu.cn/Admission1/Fees.htm','International undergraduate tuition schedule — annual rates by admission division; dual-degree fee applies only at THU',NULL,NULL),
  (4619,20,'Politics, Economics and Sociology for Global Leaders in Smart Society Program',100000,'CNY','year','https://international.join-tsinghua.edu.cn/Admission1/Fees.htm','International undergraduate tuition schedule — annual rates by admission division; dual-degree fee applies only at THU',NULL,NULL),
  (4620,20,'Tsinghua University–The Chinese University of Hong Kong Dual Undergraduate Degree Programme in Economics',100000,'CNY','year','https://international.join-tsinghua.edu.cn/Admission1/Fees.htm','International undergraduate tuition schedule — annual rates by admission division; dual-degree fee applies only at THU',NULL,'International tuition shown applies only to years studied at Tsinghua University; rates at CUHK must be checked separately.'),
  (3018,215,'BSc Computer Science and Software Engineering (CSE)',4000,'USD','year','https://inha.uz/prospective-students/admissions/tuitions/','2026/27 IUT: USD tuition for foreign passport holders only; domestic fees in UZS; subject to change','https://inha.uz/prospective-students/admissions/application-guideline/','2026/27 fee schedule, subject to change: foreign-passport holders USD 4,000; citizens of Uzbekistan 40,400,000 UZS per year. The published USD fee is not a currency conversion.'),
  (3019,215,'BSc Information and Communication Engineering (ICE)',4000,'USD','year','https://inha.uz/prospective-students/admissions/tuitions/','2026/27 IUT: USD tuition for foreign passport holders only; domestic fees in UZS; subject to change','https://inha.uz/prospective-students/admissions/application-guideline/','2026/27 fee schedule, subject to change: foreign-passport holders USD 4,000; citizens of Uzbekistan 40,400,000 UZS per year. The published USD fee is not a currency conversion.'),
  (3020,215,'BSc Business Administration',4000,'USD','year','https://inha.uz/prospective-students/admissions/tuitions/','2026/27 IUT: USD tuition for foreign passport holders only; domestic fees in UZS; subject to change','https://inha.uz/prospective-students/admissions/application-guideline/','2026/27 fee schedule, subject to change: foreign-passport holders USD 4,000; citizens of Uzbekistan 42,300,000 UZS per year. The published USD fee is not a currency conversion.'),
  (3021,215,'BSc Logistics Management',4000,'USD','year','https://inha.uz/prospective-students/admissions/tuitions/','2026/27 IUT: USD tuition for foreign passport holders only; domestic fees in UZS; subject to change','https://inha.uz/prospective-students/admissions/application-guideline/','2026/27 fee schedule, subject to change: foreign-passport holders USD 4,000; citizens of Uzbekistan 42,300,000 UZS per year. The published USD fee is not a currency conversion.')
), matching AS MATERIALIZED (
 SELECT e.*,to_jsonb(p) AS previous FROM evidence e JOIN public.programs p
 ON p.id=e.id AND p.university_id=e.university_id AND p.name=e.name AND p.annual_tuition=e.amount
 AND p.tuition_currency=e.currency AND p.tuition_period=e.old_period
 WHERE p.is_active AND p.is_verified AND p.verification_status='verified'
 AND NOT EXISTS(SELECT 1 FROM public.program_sources ps JOIN public.sources s ON s.id=ps.source_id
 WHERE ps.program_id=p.id AND ps.source_type='tuition' AND s.url=e.url AND s.is_verified AND s.is_official)
), source_specs AS (
 SELECT DISTINCT url,title,'official_tuition' AS kind FROM matching
 UNION
 SELECT DISTINCT identity_url,CASE WHEN university_id=20 THEN 'Tsinghua international undergraduate admission divisions and colleges (2026-09-23)' ELSE 'IUT 2026/27 Korean programme admissions guideline' END,'official_programme'
 FROM matching WHERE identity_url IS NOT NULL
), src AS (
 INSERT INTO public.sources(url,title,domain,source_type,accessed_at,is_official,is_verified)
 SELECT url,title,split_part(url,'/',3),kind,now(),true,true FROM source_specs
 ON CONFLICT(url) DO UPDATE SET title=excluded.title,accessed_at=excluded.accessed_at,is_official=true,is_verified=true
 RETURNING id,url
), updated AS (
 UPDATE public.programs p SET tuition_period='year',tuition_amount=m.amount,
  source_url=coalesce(m.identity_url,p.source_url),official_url=coalesce(m.identity_url,p.official_url),
  description=CASE WHEN m.note IS NULL THEN p.description WHEN m.university_id=215 THEN m.name||'. '||m.note
    WHEN coalesce(p.description,'') LIKE '%'||m.note||'%' THEN p.description ELSE concat_ws(' ',p.description,m.note) END,
  last_verified_at=now()
 FROM matching m WHERE p.id=m.id AND to_jsonb(p)=m.previous
 RETURNING p.id,p.annual_tuition,p.tuition_currency,p.tuition_period
), link_specs AS (
 SELECT u.id,m.url,'tuition' AS kind FROM updated u JOIN matching m ON m.id=u.id
 UNION ALL
 SELECT u.id,m.identity_url,'program_evidence' FROM updated u JOIN matching m ON m.id=u.id WHERE m.identity_url IS NOT NULL
), linked AS (
 INSERT INTO public.program_sources(program_id,source_id,source_type)
 SELECT l.id,s.id,l.kind FROM link_specs l JOIN src s ON s.url=l.url
 WHERE NOT EXISTS(SELECT 1 FROM public.program_sources p WHERE p.program_id=l.id AND p.source_id=s.id AND p.source_type=l.kind)
 RETURNING program_id
), audited AS (
 INSERT INTO public.audit_logs(entity_type,entity_id,field_changed,old_value,new_value,source,actor,verification_status)
 SELECT 'program',u.id,'annual_tuition_evidence',m.previous::text,
 jsonb_build_object('amount',u.annual_tuition,'currency',u.tuition_currency,'period',u.tuition_period,'scope',m.title,'note',m.note)::text,
 m.url,'catalogue_review','verified' FROM updated u JOIN matching m ON m.id=u.id RETURNING id
), revision AS (
 INSERT INTO public.cache_revisions(scope,revision,reason,updated_at)
 SELECT scope,2,'2026-11-25 international tuition evidence review',now() FROM (VALUES ('catalogue'),('evidence')) s(scope)
 WHERE EXISTS(SELECT 1 FROM updated)
 ON CONFLICT(scope) DO UPDATE SET revision=public.cache_revisions.revision+1,reason=excluded.reason,updated_at=excluded.updated_at RETURNING scope
)
SELECT (SELECT count(*) FROM updated) verified_fees,(SELECT count(*) FROM linked) links,
 (SELECT count(*) FROM audited) audit_rows,(SELECT count(*) FROM revision) cache_scopes;
