-- UCAS's course-specific 2027 listing for Leicester G400 supersedes the legacy date.
-- UK central provider confirms 13 January; Leicester general page disagrees (14 January).
WITH matching AS MATERIALIZED (
 SELECT c.id,to_jsonb(c) previous FROM public.application_cycles c WHERE c.id=3089 AND c.program_id=2902 AND c.university_id=268
 AND c.deadline='2027-01-25' AND c.source_url='https://le.ac.uk' AND c.is_active
), src AS (
 INSERT INTO public.sources(url,title,domain,source_type,accessed_at,is_official,is_verified)
 SELECT 'https://www.ucas.com/explore/courses/d9c180df-05ff-1742-907e-1407a61f73f6/computer-science?studyYear=2027',
 'UCAS 2027 — University of Leicester BSc Computer Science G400 equal consideration date',
 'www.ucas.com','official_admissions',now(),true,true WHERE EXISTS(SELECT 1 FROM matching)
 ON CONFLICT(url) DO UPDATE SET title=excluded.title,accessed_at=excluded.accessed_at,is_official=true,is_verified=true RETURNING id,url
), updated AS (
 UPDATE public.application_cycles c SET deadline='2027-01-13',opening_date='2026-09-01',
 application_type='UCAS equal consideration',deadline_type='UCAS equal consideration',
 application_fee=34.50,application_fee_currency='GBP',source_url=s.url,source_id=s.id,official_source_id=s.id,last_verified_at=now(),
 notes='Course G400, 2027 intake: submit by 18:00 UK time on 13 January according to UCAS. This is the equal-consideration date, not final closure. Leicester general page lists 14 January; the course-specific central application platform is controlling. UCAS undergraduate fee GBP 34.50 is a single fee for up to five choices, not per university. Fee source: https://www.ucas.com/faqs/what-is-the-application-fee-for-the-2027-cycle . Submission opens: https://www.ucas.com/events/2027-entry-ucas-applications-can-be-submitted-465631 .'
 FROM matching m CROSS JOIN src s WHERE c.id=m.id AND to_jsonb(c)=m.previous RETURNING c.id,c.deadline,c.source_url,c.application_fee,c.application_fee_currency
), audited AS (
 INSERT INTO public.audit_logs(entity_type,entity_id,field_changed,old_value,new_value,source,actor,verification_status)
 SELECT 'application_cycle',u.id,'deadline_and_fee',m.previous::text,to_jsonb(u)::text,u.source_url,'catalogue_review','verified'
 FROM updated u JOIN matching m ON m.id=u.id RETURNING id
), revision AS (
 INSERT INTO public.cache_revisions(scope,revision,reason,updated_at)
 SELECT scope,2,'2026-11-25 corrected Leicester 2027 UCAS deadline',now() FROM (VALUES ('catalogue'),('evidence')) s(scope)
 WHERE EXISTS(SELECT 1 FROM updated)
 ON CONFLICT(scope) DO UPDATE SET revision=public.cache_revisions.revision+1,reason=excluded.reason,updated_at=excluded.updated_at RETURNING scope
)
SELECT (SELECT count(*) FROM updated) corrected,(SELECT count(*) FROM audited) audited,(SELECT count(*) FROM revision) cache_scopes;
