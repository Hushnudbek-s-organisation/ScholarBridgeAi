-- Programme-scoped tuition checked against the linked registrar/course pages.
-- The course/fee category and publication cycle are carried in the fee source title.
with evidence(university_id, program_id, name, amount, currency, period, title, fee_url, program_url, old_amount) as (
 values
  (1, 1, 'BS in Computer Science and Engineering', 66720, 'USD', 'year', '2026–27 · undergraduate full tuition', 'https://sfs.mit.edu/undergraduate-students/the-cost-of-attendance/coa/', 'https://catalog.mit.edu/degree-charts/computer-science-engineering-course-6-3/', 66720),
  (2, 13, 'BEng Computing', 45500, 'GBP', 'year', '2026–27 · overseas fee guide', 'https://www.imperial.ac.uk/study/courses/undergraduate/computing-beng/', 'https://www.imperial.ac.uk/study/courses/undergraduate/computing-beng/', NULL),
  (3, 25, 'BS in Computer Science', 67731, 'USD', 'year', '2026–27 · undergraduate full tuition', 'https://news.stanford.edu/stories/2026/02/undergraduate-tuition-rates-2026-2027', 'https://www.cs.stanford.edu/bs-degree-requirements', NULL),
  (4, 38, 'BA in Computer Science', 66580, 'GBP', 'year', '2027 entry · overseas fees', 'https://www.ox.ac.uk/admissions/undergraduate/courses/course-listing/computer-science', 'https://www.ox.ac.uk/admissions/undergraduate/courses/course-listing/computer-science', NULL),
  (5, 49, 'AB in Computer Science', 62226, 'USD', 'year', '2026–27 · Harvard College tuition', 'https://registrar.fas.harvard.edu/tuition-and-fees', 'https://seas.harvard.edu/computer-science/undergraduate-program', NULL),
  (6, 64, 'Computer Science BA (Hons)', 46872, 'GBP', 'year', '2027 entry · excludes college fees', 'https://www.undergraduate.study.cam.ac.uk/international-students/international-fees-and-costs', 'https://www.undergraduate.study.cam.ac.uk/courses/computer-science-ba-hons-meng', NULL),
  (7, 73, 'BSc in Computer Science', 2190, 'CHF', 'semester', 'ETH tuition fee group 2', 'https://ethz.ch/students/en/studies/financial/studiengebuehren.html', 'https://ethz.ch/en/studies/bachelor/bachelors-degree-programmes/engineering-sciences/computer-science.html', 4380),
  (9, 95, 'Computer Science BSc', 48600, 'GBP', 'year', '2027–28 · international tuition', 'https://www.ucl.ac.uk/study/prospective-students/undergraduate/courses/computer-science-bsc', 'https://www.ucl.ac.uk/study/prospective-students/undergraduate/courses/computer-science-bsc', 48600),
  (55, 957, 'Computer Science', 39700, 'GBP', 'year', '2027 entry · international tuition', 'https://www.manchester.ac.uk/study/undergraduate/courses/2027/00560/bsc-computer-science/all-content/', 'https://www.manchester.ac.uk/study/undergraduate/courses/2027/00560/bsc-computer-science/all-content/', NULL),
  (58, 1006, 'Computer Science', 34700, 'GBP', 'year', '2027–28 · international tuition', 'https://www.bristol.ac.uk/study/undergraduate/2027/computer-science/bsc-computer-science/', 'https://www.bristol.ac.uk/study/undergraduate/2027/computer-science/bsc-computer-science/', NULL),
  (165, 2514, 'BSc in Computer Science', 33000, 'GBP', 'year', '2027–28 · EU and international tuition', 'https://www.southampton.ac.uk/courses/computer-science-degree-bsc', 'https://www.southampton.ac.uk/courses/computer-science-degree-bsc', NULL),
  (191, 4628, 'Bachelor of Computer Science', 55400, 'AUD', 'year', '2027 · indicative international tuition', 'https://adelaide.edu.au/study/degrees/2027/bachelor-of-computer-science/int/', 'https://adelaide.edu.au/study/degrees/bachelor-of-computer-science/', NULL)
), matching as (
 select e.* from evidence e join public.programs p
 on p.id=e.program_id and p.university_id=e.university_id and p.name=e.name and p.is_active
 where p.annual_tuition is not distinct from e.old_amount or p.annual_tuition=e.amount
), source_candidates as (
 select fee_url as url,title,'official_tuition' as kind from matching
 union all select program_url,name,'official_program' from matching where program_url<>fee_url
), source_rows as (
 insert into public.sources(url,title,domain,source_type,accessed_at,is_official,is_verified)
 select distinct on(url) url,title,split_part(url,'/',3),kind,now() at time zone 'UTC',true,true
 from source_candidates order by url, (kind='official_tuition') desc
 on conflict(url) do update set title=case when excluded.source_type='official_tuition'
   then excluded.title else public.sources.title end,
   accessed_at=excluded.accessed_at,is_official=true,is_verified=true
 returning id,url
), updated as (
 update public.programs p
 set annual_tuition=m.amount,tuition_currency=m.currency,tuition_period=m.period,
   source_url=m.program_url, official_url=m.program_url, is_verified=true,
   verification_status='verified',last_verified_at=now() at time zone 'UTC'
 from matching m where p.id=m.program_id and p.university_id=m.university_id
 returning p.id,p.university_id,p.name,p.annual_tuition,p.tuition_currency,p.tuition_period
), linked as (
 insert into public.program_sources(program_id,source_id,source_type)
 select u.id,s.id,'tuition' from updated u join matching m on m.program_id=u.id join source_rows s on s.url=m.fee_url
 where not exists(select 1 from public.program_sources x where x.program_id=u.id and x.source_id=s.id and x.source_type='tuition')
), revision as (
 insert into public.cache_revisions(scope,revision,reason,updated_at)
 select 'catalogue',2,'Published programme tuition verified from original sources',now() where exists(select 1 from updated)
 on conflict(scope) do update set revision=public.cache_revisions.revision+1,reason=excluded.reason,updated_at=now()
)
select * from updated order by university_id;
