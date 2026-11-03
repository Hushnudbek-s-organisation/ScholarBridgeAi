-- Primary-source review batch 01; scope and reviewer notes are in
-- data/official-review/2026-11-02-batch-01.json. This is NOT the full catalogue.
-- Supabase create_migration supplies the transaction. Never restore old flags wholesale.
LOCK TABLE public.programs, public.program_requirements, public.university_rankings,
 public.sources, public.program_sources IN SHARE ROW EXCLUSIVE MODE;
CREATE SCHEMA IF NOT EXISTS scholarbridge_maintenance;
REVOKE ALL ON SCHEMA scholarbridge_maintenance FROM PUBLIC, anon, authenticated;
CREATE TABLE IF NOT EXISTS scholarbridge_maintenance.official_review_backup_20261102_01 (
 entity text NOT NULL, row_id integer NOT NULL, row_before jsonb NOT NULL,
 row_after jsonb, captured_at timestamptz NOT NULL DEFAULT now(), PRIMARY KEY(entity,row_id)
);
ALTER TABLE scholarbridge_maintenance.official_review_backup_20261102_01 ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON scholarbridge_maintenance.official_review_backup_20261102_01 FROM PUBLIC, anon, authenticated;
CREATE TABLE IF NOT EXISTS scholarbridge_maintenance.official_review_evidence_20261102_01 (
 evidence_key text PRIMARY KEY, url text NOT NULL, title text NOT NULL,
 scope text NOT NULL, review_notes text NOT NULL, accessed_on date NOT NULL
);
ALTER TABLE scholarbridge_maintenance.official_review_evidence_20261102_01 ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON scholarbridge_maintenance.official_review_evidence_20261102_01 FROM PUBLIC, anon, authenticated;
CREATE TEMP TABLE review_program_targets(id int PRIMARY KEY, expected_name text, verified_name text, requirement_id int, academic_year text) ON COMMIT DROP;
INSERT INTO review_program_targets VALUES
(230,'Computer Science','Computer Science',1901,'2026-2027'),
(231,'Electrical and Computer Engineering','Electrical and Computer Engineering',1902,'2026-2027'),
(232,'Mechanical and Aerospace Engineering','Mechanical and Aerospace Engineering',1903,'2026-2027'),
(233,'Chemical and Biological Engineering','Chemical and Biological Engineering',1904,'2026-2027'),
(234,'Civil and Environmental Engineering','Civil and Environmental Engineering',1905,'2026-2027'),
(235,'Operations Research and Financial Engineering','Operations Research and Financial Engineering',1906,'2026-2027'),
(236,'Mathematics','Mathematics',1907,'2026-2027'),
(237,'Physics','Physics',1908,'2026-2027'),
(238,'Chemistry','Chemistry',1909,'2026-2027'),
(239,'Molecular Biology','Molecular Biology',1910,'2026-2027'),
(240,'Economics','Economics',1911,'2026-2027'),
(241,'Politics','Politics',1912,'2026-2027'),
(242,'History','History',1913,'2026-2027'),
(243,'Philosophy','Philosophy',1914,'2026-2027'),
(244,'English','English',1915,'2026-2027'),
(245,'Psychology','Psychology',1916,'2026-2027'),
(246,'Neuroscience','Neuroscience',1917,'2026-2027'),
(247,'Public and International Affairs (SPIA)','Public Policy (Princeton School of Public and International Affairs)',1918,'2026-2027'),
(248,'Architecture','Architecture',1919,'2026-2027'),
(249,'Astrophysical Sciences','Astrophysical Sciences',1920,'2026-2027');
CREATE TEMP TABLE review_ranking_targets(id int PRIMARY KEY, university_id int, university_name text, provider text, edition text, ranking_year int, rank int, rank_label text, evidence_key text) ON COMMIT DROP;
INSERT INTO review_ranking_targets VALUES
(603,209,'Al-Farabi Kazakh National University (KazNU)','QS Quacquarelli Symonds','QS World University Rankings',2026,166,'#166','ranking_603'),
(604,210,'University of Warsaw','QS Quacquarelli Symonds','QS World University Rankings',2026,271,'#271','ranking_604'),
(605,212,'Charles University','QS Quacquarelli Symonds','QS World University Rankings',2026,265,'=265','ranking_605'),
(606,201,'Middle East Technical University (METU)','QS Quacquarelli Symonds','QS World University Rankings',2026,269,'#269','ranking_606'),
(607,210,'University of Warsaw','Times Higher Education','Times Higher Education World University Rankings',2026,601,'601-800','ranking_607'),
(608,209,'Al-Farabi Kazakh National University (KazNU)','Times Higher Education','Times Higher Education World University Rankings',2026,1201,'1201-1500','ranking_608'),
(609,201,'Middle East Technical University (METU)','Times Higher Education','Times Higher Education World University Rankings',2026,351,'351-400','ranking_609'),
(617,208,'Nazarbayev University','Times Higher Education','Times Higher Education World University Rankings',2026,401,'401-500','ranking_617'),
(618,212,'Charles University','Times Higher Education','Times Higher Education World University Rankings',2026,401,'401-500','ranking_618'),
(740,342,'Semmelweis University','Times Higher Education','Times Higher Education World University Rankings',2026,251,'251-300','ranking_740'),
(601,298,'École des Ponts ParisTech','QS Quacquarelli Symonds','QS World University Rankings',2026,NULL,'Included via Institut Polytechnique de Paris; no separate rank','ranking_601');
INSERT INTO scholarbridge_maintenance.official_review_evidence_20261102_01 VALUES
('princeton_degrees','https://admission.princeton.edu/academics/degrees-departments','Princeton Degrees & Departments','programme','Both chunks read: all 20 target concentrations listed. CS offers AB and BSE. Applicants apply to the university, not departments. Public Policy is the official SPIA concentration name.','2026-11-02'),
('princeton_academics','https://admission.princeton.edu/academics','Princeton Academics','programme','AB and BSE curricula: first two years followed by junior and senior years; six engineering departments; independent research in both degrees.','2026-11-02'),
('princeton_tuition','https://admission.princeton.edu/cost-aid/fees-payment-options','Princeton Fees & Payment Options 2026-27','tuition','Undergraduate student budget 2026-27: annual tuition USD 68,140, total attendance budget USD 94,624. Not a graduate fee or a net-after-aid cost.','2026-11-02'),
('princeton_checklist','https://admission.princeton.edu/apply/application-checklist','Princeton First-Year Application Checklist','admission_requirement','Common Application, Princeton questions, fee/waiver, graded written paper, transcript, school report, counselor and two teacher recommendations, midyear report. Alumni interviews and arts supplements (including architecture) are optional. English tests are conditional, with a three-year English-school waiver.','2026-11-02'),
('princeton_testing','https://admission.princeton.edu/apply/standardized-testing','Princeton Standardized Testing','admission_requirement','SAT/ACT optional for fall 2027 (2026-27 application cycle), required from fall 2028 (2027-28 cycle). No minimum admission test scores. Conditional English proficiency tests include TOEFL, IELTS Academic, DET and PTE Academic; numeric cutoffs not supplied.','2026-11-02'),
('princeton_preparation','https://admission.princeton.edu/apply/before-you-apply','Princeton Before You Apply','admission_requirement','Recommended preparation is explicitly NOT an admission requirement: four years English, mathematics and one language, two years laboratory science and history; engineering calculus, physics and chemistry recommended. IB/A-level qualifications evaluated in curriculum context; no fixed points or grades stated.','2026-11-02'),
('princeton_international','https://admission.princeton.edu/apply/international-students','Princeton International Students','admission_requirement','No GPA conversion expected if school does not use GPA. English proficiency conditional on native language and language of instruction; no numeric IELTS/TOEFL cutoff published.','2026-11-02'),
('ranking_603','https://www.topuniversities.com/universities/al-farabi-kazakh-national-university','QS KazNU profile','ranking','Chunk 0 narrative explicitly states 166 in QS World University Rankings 2026; current banner is 177 for 2027, not the target edition.','2026-11-02'),
('ranking_604','https://en.uw.edu.pl/university-of-warsaw-in-qs-world-university-rankings/','University of Warsaw QS 2026 announcement','ranking','Official university announcement, 30 June 2025: 271st in QS World University Rankings 2026.','2026-11-02'),
('ranking_605','https://www.topuniversities.com/universities/charles-university','QS Charles University historical rankings','ranking','Chunk 1, QS World University Rankings history: 2026 =265; current 2027 =273 is not the target edition.','2026-11-02'),
('ranking_606','https://haber.metu.edu.tr/en/2025/06/metu-ranks-269th-in-the-qs-world-university-rankings-2026/','METU QS 2026 announcement','ranking','Official university announcement, 19 June 2025: 269 in QS World University Rankings 2026.','2026-11-02'),
('ranking_607','https://www.timeshighereducation.com/world-university-rankings/university-warsaw','THE University of Warsaw historical rankings','ranking','World University Rankings history: 2026 601-800; not the current 2027 801-1000 band.','2026-11-02'),
('ranking_608','https://www.timeshighereducation.com/world-university-rankings/al-farabi-kazakh-national-university','THE KazNU historical rankings','ranking','World University Rankings history: 2026 1201-1500; not current 2027 1401-1600.','2026-11-02'),
('ranking_609','https://www.timeshighereducation.com/world-university-rankings/middle-east-technical-university','THE METU historical rankings','ranking','World University Rankings history: 2026 351-400; not current 2027 326-350.','2026-11-02'),
('ranking_617','https://www.timeshighereducation.com/world-university-rankings/nazarbayev-university','THE Nazarbayev historical rankings','ranking','Chunk 1 World University Rankings history: 2026 401-500; not current 2027 376-400.','2026-11-02'),
('ranking_618','https://www.timeshighereducation.com/world-university-rankings/charles-university','THE Charles University historical rankings','ranking','World University Rankings history: 2026 401-500; not current 2027 451-500.','2026-11-02'),
('ranking_740','https://www.timeshighereducation.com/world-university-rankings/semmelweis-university','THE Semmelweis historical rankings','ranking','Chunk 0 World University Rankings history: 2026 251-300; not current 2027 =247 or medical subject ranking 176-200.','2026-11-02'),
('ranking_601','https://www.fondationdesponts.fr/classement-qs-ranking-2026/','Fondation des Ponts QS 2026 announcement','ranking','25 July 2025: Ponts now participates through IP Paris (41 in 2026). Standalone 205 explicitly belongs to 2025. Do not assign parent rank 41 to the separate Ponts record.','2026-11-02')
ON CONFLICT(evidence_key) DO NOTHING;
-- Identity guards: a re-seeded ID, wrong level, edition, or requirement year aborts.
DO $$ BEGIN
 IF (SELECT count(*) FROM public.programs p JOIN review_program_targets t USING(id)
 JOIN public.universities u ON u.id=p.university_id
 WHERE p.university_id=13 AND u.name='Princeton University' AND p.degree_level='Bachelor''s'
 AND p.name IN(t.expected_name,t.verified_name))<>20 THEN RAISE EXCEPTION 'Princeton identity/level drift'; END IF;
 IF (SELECT count(*) FROM public.program_requirements r JOIN review_program_targets t ON r.id=t.requirement_id
 WHERE r.program_id=t.id AND r.academic_year=t.academic_year)<>20 THEN RAISE EXCEPTION 'Requirement identity/year drift'; END IF;
 IF (SELECT count(*) FROM public.university_rankings r JOIN review_ranking_targets t USING(id)
 JOIN public.universities u ON u.id=r.university_id
 WHERE r.university_id=t.university_id AND u.name=t.university_name AND r.ranking_provider=t.provider
 AND r.ranking_name=t.edition AND r.ranking_year=t.ranking_year)<>11 THEN RAISE EXCEPTION 'Ranking identity/edition drift'; END IF;
END $$;
INSERT INTO scholarbridge_maintenance.official_review_backup_20261102_01(entity,row_id,row_before)
SELECT 'programs',p.id,to_jsonb(p) FROM public.programs p JOIN review_program_targets t USING(id)
UNION ALL SELECT 'program_requirements',r.id,to_jsonb(r) FROM public.program_requirements r JOIN review_program_targets t ON r.id=t.requirement_id
UNION ALL SELECT 'university_rankings',r.id,to_jsonb(r) FROM public.university_rankings r JOIN review_ranking_targets t USING(id)
UNION ALL SELECT 'sources',s.id,to_jsonb(s) FROM public.sources s JOIN scholarbridge_maintenance.official_review_evidence_20261102_01 e USING(url)
WHERE NOT EXISTS(SELECT 1 FROM scholarbridge_maintenance.official_review_backup_20261102_01 WHERE entity='programs')
ON CONFLICT(entity,row_id) DO NOTHING;
-- Reject stale replay rather than clobber edits made after this review.
DO $$ BEGIN
 IF EXISTS(SELECT 1 FROM scholarbridge_maintenance.official_review_backup_20261102_01 b
 JOIN (SELECT 'programs' AS entity,p.id,to_jsonb(p) AS row_now FROM public.programs p JOIN review_program_targets t USING(id)
 UNION ALL SELECT 'program_requirements',r.id,to_jsonb(r) FROM public.program_requirements r JOIN review_program_targets t ON r.id=t.requirement_id
 UNION ALL SELECT 'university_rankings',r.id,to_jsonb(r) FROM public.university_rankings r JOIN review_ranking_targets t USING(id)) c
 ON b.entity=c.entity AND b.row_id=c.id
 WHERE c.row_now<>b.row_before AND (b.row_after IS NULL OR c.row_now<>b.row_after)) THEN
 RAISE EXCEPTION 'Review replay conflicts with a later edit'; END IF;
END $$;
INSERT INTO public.sources(url,title,domain,source_type,accessed_at,is_official,is_verified)
SELECT url,title,split_part(url,'/',3),CASE WHEN scope='ranking' THEN 'ranking' ELSE 'official_website' END,
 accessed_on::timestamp,true,true FROM scholarbridge_maintenance.official_review_evidence_20261102_01
ON CONFLICT(url) DO UPDATE SET accessed_at=EXCLUDED.accessed_at,is_official=true,is_verified=true;
UPDATE public.programs p SET name=t.verified_name,
 annual_tuition=68140,tuition_amount=68140,tuition_currency='USD',tuition_period='year',
 min_ielts=NULL,min_sat=NULL,
 official_url='https://admission.princeton.edu/academics/degrees-departments',
 program_url='https://admission.princeton.edu/academics/degrees-departments',
 source_url='https://admission.princeton.edu/academics/degrees-departments',
 application_url='https://admission.princeton.edu/apply/application-checklist',
 description=t.verified_name||' is an undergraduate concentration at Princeton University. Applicants apply to the university, not to an individual department. Computer Science offers both A.B. and B.S.E. pathways. Annual undergraduate tuition is USD 68,140 for 2026-27, before financial aid; living costs and fees are additional. Tuition for 2027-28 is not established by this review.',
 verification_status='verified',is_verified=true,last_verified_at=TIMESTAMP '2026-11-02 00:00:00'
FROM review_program_targets t,scholarbridge_maintenance.official_review_backup_20261102_01 b
WHERE p.id=t.id AND b.entity='programs' AND b.row_id=p.id AND to_jsonb(p)=b.row_before;
UPDATE public.program_requirements r SET
 min_ielts=NULL,min_toefl=NULL,min_det=NULL,min_sat=NULL,min_act=NULL,min_gpa=NULL,minimum_value=NULL,
 ib_requirement=NULL,a_level_requirement=NULL,ap_requirement=NULL,
 subject_requirements='Recommended preparation, not mandatory prerequisites: four years each of English, mathematics and one language; at least two years each of laboratory science and history. Engineering applicants: calculus, physics and chemistry recommended. Qualifications are evaluated in context.',
 portfolio_required=false,interview_required=false,recommendation_required=true,personal_statement_required=true,
 other_requirements='University-wide first-year admission, not separate departmental admission. Common Application and Princeton-specific questions; application fee or waiver; graded written paper; transcript; school report; counselor recommendation; two teacher recommendations; midyear report. SAT/ACT optional for fall 2026 and fall 2027 entry; required from fall 2028, with no minimum score. English testing (TOEFL, IELTS Academic, DET or PTE Academic) required for non-native speakers at non-English-instruction schools; waiver for native speakers or at least three years of English-medium secondary schooling. Numeric English/GPA/IB/A-level/AP admission cutoffs are not established by the reviewed sources. Alumni interview and arts supplement (including architecture) are optional.',
 value_text='Holistic first-year admission; SAT/ACT optional for fall 2027 entry; conditional English testing; no invented numeric minimums.',
 notes='Primary-source review 2026-11-02. Sources: https://admission.princeton.edu/apply/application-checklist ; https://admission.princeton.edu/apply/standardized-testing ; https://admission.princeton.edu/apply/before-you-apply ; https://admission.princeton.edu/apply/international-students . This is an institution-wide undergraduate policy, not a graduate policy. NULL thresholds mean not established, not zero.',
 source_url='https://admission.princeton.edu/apply/application-checklist',
 verification_status='verified',is_verified=true,last_verified_at=TIMESTAMP '2026-11-02 00:00:00'
FROM review_program_targets t,scholarbridge_maintenance.official_review_backup_20261102_01 b
WHERE r.id=t.requirement_id AND b.entity='program_requirements' AND b.row_id=r.id AND to_jsonb(r)=b.row_before;
-- Preserve every provenance role, not just a single generic programme URL.
INSERT INTO public.program_sources(program_id,source_id,source_type)
SELECT t.id,s.id,CASE e.scope WHEN 'programme' THEN 'program_evidence' WHEN 'tuition' THEN 'tuition' ELSE 'admission_requirement' END
FROM review_program_targets t CROSS JOIN scholarbridge_maintenance.official_review_evidence_20261102_01 e
JOIN public.sources s USING(url)
WHERE e.evidence_key LIKE 'princeton_%' AND NOT EXISTS(
 SELECT 1 FROM public.program_sources ps WHERE ps.program_id=t.id AND ps.source_id=s.id
 AND ps.source_type=CASE e.scope WHEN 'programme' THEN 'program_evidence' WHEN 'tuition' THEN 'tuition' ELSE 'admission_requirement' END);
UPDATE public.university_rankings r SET rank=t.rank,rank_label=t.rank_label,score=NULL,
 source_id=s.id,verified_at=TIMESTAMP '2026-11-02 00:00:00',verification_status='verified'
FROM review_ranking_targets t JOIN scholarbridge_maintenance.official_review_evidence_20261102_01 e USING(evidence_key)
JOIN public.sources s USING(url),scholarbridge_maintenance.official_review_backup_20261102_01 b
WHERE r.id=t.id AND b.entity='university_rankings' AND b.row_id=r.id AND to_jsonb(r)=b.row_before;
UPDATE scholarbridge_maintenance.official_review_backup_20261102_01 b SET row_after=c.row_now
FROM (SELECT 'programs' AS entity,p.id,to_jsonb(p) AS row_now FROM public.programs p JOIN review_program_targets t USING(id)
 UNION ALL SELECT 'program_requirements',r.id,to_jsonb(r) FROM public.program_requirements r JOIN review_program_targets t ON r.id=t.requirement_id
 UNION ALL SELECT 'university_rankings',r.id,to_jsonb(r) FROM public.university_rankings r JOIN review_ranking_targets t USING(id)
 UNION ALL SELECT 'sources',s.id,to_jsonb(s) FROM public.sources s JOIN scholarbridge_maintenance.official_review_evidence_20261102_01 e USING(url)) c
WHERE b.entity=c.entity AND b.row_id=c.id AND b.row_after IS NULL;
DO $$ BEGIN
 IF (SELECT count(*) FROM public.programs p JOIN review_program_targets t USING(id)
 WHERE p.verification_status='verified' AND p.is_verified AND p.annual_tuition=68140 AND p.tuition_amount=68140
 AND p.min_sat IS NULL AND p.min_ielts IS NULL)<>20 THEN RAISE EXCEPTION 'Programme postcondition failed'; END IF;
 IF (SELECT count(*) FROM public.program_requirements r JOIN review_program_targets t ON r.id=t.requirement_id
 WHERE r.verification_status='verified' AND r.is_verified AND r.min_ielts IS NULL AND r.min_toefl IS NULL
 AND r.min_det IS NULL AND r.min_sat IS NULL AND r.min_act IS NULL AND r.min_gpa IS NULL
 AND r.minimum_value IS NULL AND NOT r.portfolio_required AND NOT r.interview_required)<>20 THEN RAISE EXCEPTION 'Requirement postcondition failed'; END IF;
 IF (SELECT count(*) FROM public.university_rankings r JOIN review_ranking_targets t USING(id)
 WHERE r.verification_status='verified' AND r.rank IS NOT DISTINCT FROM t.rank AND r.rank_label=t.rank_label
 AND r.score IS NULL AND r.source_id IS NOT NULL)<>11 THEN RAISE EXCEPTION 'Ranking postcondition failed'; END IF;
END $$;
-- Recovery: use the private before-images only for these exact IDs after
-- comparing row_after to the live row. Never overwrite later edits or activate
-- archived application cycles. No cycle or university summary is changed here.
