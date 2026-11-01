-- Rewrite Pass 137 (2026-11-01): South Korea minima family template cleanup —
-- 583 SNU GKS, 611 Korea University GSIS, 794 Yonsei UIC, 858 GIST. All four
-- carried import-template structured minima (3.7/7.0, 3.6/7.0, 3.6/7.0,
-- 3.6/6.5) with template English trios ("IELTS 7.0 / TOEFL 94 / DET 120",
-- 858: "IELTS 6.5 / TOEFL 85 / DET 115") inherited from the 13-country PDF
-- guide (the same strings also sat in the side rows as "Typical academic
-- profile"). Handled per-row, as deferred in Pass 136:
-- 583 turns on NIIED rules — SNU's undergraduate scholarships page (3196)
-- fetched in full confirms the stored subsidies and defers to the NIIED /
-- Study in Korea guidelines; the Study in Korea GKS page (3197) frames
-- undergraduate academic performance as ≥80% cumulative, top 20% of class,
-- or a CGPA threshold set in the annual guidelines (percentage/rank — not
-- encodable as a 4.0-scale min_gpa) and lists no English-test requirement.
-- 611 KU GSIS tuition/scholarships page (3198): first semester by entrance
-- score; the printed GPA 4.0+ qualification is a later-semester continuation
-- condition on the GSIS scale (already narrative in the record).
-- 794 Yonsei UIC Tuition fee & Scholarship page (3199): automatic
-- consideration, selection on academic credentials, renewal at "a certain
-- level of GPA" with no figure; stored /main/admission.php?mid=m04_03_02
-- now resolves to admission.php?mid=m04_03, so source_url/website_url were
-- moved to the page read (Pass-135 redirect precedent). Flag recorded: the
-- page gives 2026 international-track tuition KRW 8,202,000 PER SEMESTER
-- while the stored KRW 8,202,000 carries a per-year period — reconcile on a
-- future amount pass.
-- 858 GIST: Financial Support page (3200) confirms the stored package
-- (tuition KRW 3,607,000/semester fully supported; GPA 3.0/4.5 is the
-- previous-semester condition for the international-student allowance —
-- continuation, not entry). The two official admissions pages (3201
-- Procedure; 3202 Admissions overview) agree on TOEFL iBT 80 / PBT 550,
-- IELTS 6.5, TOEIC 750 but conflict on TEPS (New TEPS 285 vs TEPS 600 /
-- New TEPS 327) — flagged, not silently resolved (cf. 598). The English
-- requirement is multi-route with degree-exemption and conditional-
-- admission paths, so it stays textual (cf. 603/811) and min_ielts is
-- cleared too. Flag recorded: stored KRW 3,607,000 is per-semester tuition
-- but carries a total period.
-- Side rows us 28/97/85/332: "Typical academic profile" strings stripped
-- (regexp, Pass-135 pattern), scholarship_name synced to the record titles
-- (stale merged names: "GKS & SNU President Fellowship", "Global Leader
-- Scholarship & GKS", "Yonsei UIC & GKS Scholarship", "GIST Full
-- International Scholarship"), last_verified bumped. All four rows were
-- fetched first-hand, so last_verified_at advanced on all four. Notes
-- appends are replay-once; writes executed strictly sequentially; source
-- URLs pre-checked absent (sources.url unique).

-- 1) Sources 3196-3202
INSERT INTO sources (id, url, title, domain, source_type, accessed_at, is_official, is_verified) VALUES
(3196, 'https://en.snu.ac.kr/admission/undergraduate/scholarships/before_admission', 'Seoul National University Admissions — Undergraduate scholarships before application (GKS: 8 semesters tuition, KRW 1,200,000/month, airfare, 1 year Korean; NIIED guidelines govern)', 'en.snu.ac.kr', 'scholarship', '2026-11-01 00:00:00', true, true),
(3197, 'https://www.studyinkorea.go.kr/en/plan/scholarship.do?tab=gks-tab1', 'Study in Korea (NIIED) — GKS scholarships (degree-program eligibility: cumulative 80% or top 20% of class or CGPA threshold; tracks, quotas and GKS university lists)', 'www.studyinkorea.go.kr', 'scholarship', '2026-11-01 00:00:00', true, true),
(3198, 'https://int.korea.edu/kuis/grad/admission_tuition.do', 'Korea University GSIS — Tuition and scholarships (50-100 percent tuition awards; BK21 rates; International Student Scholarship continuation qualification GPA 4.0)', 'int.korea.edu', 'scholarship', '2026-11-01 00:00:00', true, true),
(3199, 'https://uic.yonsei.ac.kr/admission.php?mid=m04_03', 'Yonsei UIC — Tuition fee and Scholarship (Admissions Scholarship: full tuition 4 years, automatic consideration; 2026 international-track tuition KRW 8,202,000 per semester)', 'uic.yonsei.ac.kr', 'scholarship', '2026-11-01 00:00:00', true, true),
(3200, 'https://www.gist.ac.kr/iadm/html/sub04/0401.html', 'GIST International Graduate Admissions — Financial Support (tuition KRW 3,607,000 per semester fully supported; monthly allowances; matriculation fee KRW 680,000)', 'www.gist.ac.kr', 'scholarship', '2026-11-01 00:00:00', true, true),
(3201, 'https://www.gist.ac.kr/iadm/html/sub02/020102.html', 'GIST International Graduate Admissions — Procedure, English Requirements (TOEFL iBT 80 / PBT 550, IELTS 6.5, TOEIC 750, New TEPS 285; conditional admission)', 'www.gist.ac.kr', 'scholarship', '2026-11-01 00:00:00', true, true),
(3202, 'https://www.gist.ac.kr/iadm/html/sub02/0201.html', 'GIST International Graduate Admissions — Admissions overview, English Requirements (TOEFL iBT 80 / PBT 550, IELTS 6.5, TOEIC 750, TEPS 600 / New TEPS 327; conditional admission)', 'www.gist.ac.kr', 'scholarship', '2026-11-01 00:00:00', true, true);

-- 2) Four minima strips (all fetched first-hand: last_verified bumped)
UPDATE scholarships SET min_gpa = NULL, min_ielts = NULL, english_requirements = 'No English-test score is required or published for the Global Korea Scholarship; eligibility and selection follow the annual NIIED guidelines on Study in Korea (academic performance of at least 80% cumulative, top 20% of class, or the required CGPA threshold), and SNU admission requirements apply separately.', last_verified_at = '2026-11-01 09:00:00+05', last_updated_at = '2026-11-01 09:00:00+05', notes = COALESCE(notes, '') || ' PASS 137 (2026-11-01): the structured min_gpa 3.7 / min_ielts 7.0 and the template english_requirements string (IELTS 7.0 / TOEFL 94 / DET 120) are cleared as import-template leftovers. Both governing pages were fetched first-hand in this pass: SNU''s undergraduate scholarships page (source 3196) repeats the stored subsidies (8 semesters of tuition, KRW 1,200,000 a month, one economy round-trip, one year of Korean, September embassy window) and expressly defers to the NIIED and Study in Korea guidelines; the Study in Korea GKS page (source 3197) frames undergraduate academic performance as a cumulative score of 80% or higher, a top-20% class ranking, or the required CGPA threshold in the annual guidelines - a percentage/rank criterion that cannot be encoded as a 4.0-scale min_gpa without inventing a conversion - and lists no English-test requirement among the eligibility criteria. english_requirements now states this honestly. Terms, amount and deadline framing are unchanged.' WHERE id = 583 AND notes NOT LIKE '%PASS 137%';
UPDATE scholarships SET min_gpa = NULL, min_ielts = NULL, english_requirements = 'No fixed IELTS score is published for these scholarships; applicants must meet Korea University GSIS admission English requirements (check the official admissions guide).', last_verified_at = '2026-11-01 09:00:00+05', last_updated_at = '2026-11-01 09:00:00+05', notes = COALESCE(notes, '') || ' PASS 137 (2026-11-01): the structured min_gpa 3.6 / min_ielts 7.0 and the template english_requirements string (IELTS 7.0 / TOEFL 94 / DET 120) are cleared as import-template leftovers. The KU GSIS tuition and scholarships page (source 3198, fetched first-hand in this pass) confirms the stored terms exactly - tuition KRW 7,183,000 per semester plus a KRW 1,234,000 admission fee, awards of 50 to 100 percent of tuition, BK21 at KRW 1,000,000 a month for six months (master''s) and KRW 1,600,000 a month for twelve months (doctoral), about 30 assistantships around KRW 800,000 a month - and publishes no entry GPA floor or English-test score: the first semester is decided by the entrance score, and the printed GPA 4.0-or-higher qualification (with at least nine credits and continuous enrolment) is a continuation condition for later semesters on the GSIS scale, already recorded as such in this record''s requirements, not an entry minimum. english_requirements now states that no scholarship-specific score is published.' WHERE id = 611 AND notes NOT LIKE '%PASS 137%';
UPDATE scholarships SET min_gpa = NULL, min_ielts = NULL, english_requirements = 'No fixed IELTS score is published for this scholarship; UIC admission is holistic and English ability is assessed as part of the UIC application (check the official admissions pages).', source_url = 'https://uic.yonsei.ac.kr/admission.php?mid=m04_03', website_url = 'https://uic.yonsei.ac.kr/admission.php?mid=m04_03', last_verified_at = '2026-11-01 09:00:00+05', last_updated_at = '2026-11-01 09:00:00+05', notes = COALESCE(notes, '') || ' PASS 137 (2026-11-01): the structured min_gpa 3.6 / min_ielts 7.0 and the template english_requirements string (IELTS 7.0 / TOEFL 94 / DET 120) are cleared as import-template leftovers. UIC''s Tuition fee and Scholarship page (source 3199, fetched first-hand in this pass - the stored /main/admission.php?mid=m04_03_02 URL now resolves to admission.php?mid=m04_03, so source_url/website_url were moved to the page read) confirms the stored terms: newly admitted international students are automatically considered, recipients are selected according to their academic credentials with the offer letter enclosed in the admission packet, and recipients must maintain a certain level of GPA each semester - a renewal condition with no figure published. No entry GPA or English-test cutoff appears anywhere on the page, consistent with this record''s holistic-selection wording. Flag (not rewritten in this minima pass): the page gives the 2026 international-track tuition as KRW 8,202,000 per semester (first semester KRW 8,416,000), while the stored award_amount of KRW 8,202,000 carries a per-year period and an earlier note describing it as two semesters; reconcile the amount period on a future amount pass. english_requirements now states that no scholarship-specific score is published.' WHERE id = 794 AND notes NOT LIKE '%PASS 137%';
UPDATE scholarships SET min_gpa = NULL, min_ielts = NULL, english_requirements = 'GIST graduate admission English requirement (one of): TOEFL iBT 80, TOEFL PBT 550, IELTS 6.5, TOEIC 750 or New TEPS 285 (the Admissions overview page gives TEPS 600 / New TEPS 327). Degrees from Australia, Canada, Ireland, New Zealand, the UK or the USA may be exempted with prior approval, and conditional admission with an English-medium certificate is possible.', last_verified_at = '2026-11-01 09:00:00+05', last_updated_at = '2026-11-01 09:00:00+05', notes = COALESCE(notes, '') || ' PASS 137 (2026-11-01): the structured min_gpa 3.6 is cleared (no entry GPA floor is published anywhere in the pages read; the GPA 3.0-out-of-4.5 figure is the previous-semester continuation condition for the international-student allowance, already recorded as such) and min_ielts 6.5 is cleared with the template trio string (IELTS 6.5 / TOEFL 85 / DET 115): GIST''s real admission English requirement is multi-route with exemption and conditional-admission paths, so it stays textual in line with the catalogue''s treatment of 603/811. Three official pages were fetched first-hand in this pass: the Financial Support page (source 3200) confirms the stored package exactly (tuition KRW 3,607,000 per semester fully supported, student allowance KRW 140,000/295,000, meal allowance about KRW 100,000, international allowance KRW 120,000 with the 9-credit and GPA-3.0/4.5 conditions, research assistantship averages, 60 percent of national health insurance, one-way flight, KRW 680,000 matriculation fee); the Procedure page (source 3201) and the Admissions overview (source 3202) agree on TOEFL iBT 80 / PBT 550, IELTS 6.5 and TOEIC 750 but conflict on TEPS - New TEPS 285 on the Procedure page (the figure this record has carried) versus TEPS 600 / New TEPS 327 on the overview - flagged here, not silently resolved. Flag (not rewritten in this minima pass): the stored award_amount KRW 3,607,000 is the per-semester supported tuition but carries a total period; reconcile on a future amount pass.' WHERE id = 858 AND notes NOT LIKE '%PASS 137%';

-- 3) Links 496-502
INSERT INTO scholarship_sources (id, scholarship_id, source_id, source_type, created_at) VALUES (496, 583, 3196, 'official_scholarship', now()), (497, 583, 3197, 'official_scholarship', now()), (498, 611, 3198, 'official_scholarship', now()), (499, 794, 3199, 'official_scholarship', now()), (500, 858, 3200, 'official_scholarship', now()), (501, 858, 3201, 'official_scholarship', now()), (502, 858, 3202, 'official_scholarship', now());

-- 4) Side rows: template strip + name sync + lv
UPDATE university_scholarships SET eligibility_notes = regexp_replace(eligibility_notes, 'Typical academic profile: GPA [0-9.]+\+(, (IELTS|SAT) [0-9.]+\+)*\. ?', '', 'g'), last_verified_at = '2026-11-01 09:00:00+05' WHERE id IN (28, 97, 85, 332);
UPDATE university_scholarships SET scholarship_name = CASE id WHEN 28 THEN 'Global Korea Scholarship (GKS) at Seoul National University' WHEN 97 THEN 'Korea University GSIS Scholarships (international master''s and doctoral)' WHEN 85 THEN 'Yonsei UIC Admissions Scholarship (full tuition, 4 years)' WHEN 332 THEN 'GIST Graduate Scholarship (international students)' END WHERE id IN (28, 97, 85, 332);

-- 5) Sequences (MAX-based)
SELECT setval('scholarships_id_seq', (SELECT MAX(id) FROM scholarships)), setval('sources_id_seq', (SELECT MAX(id) FROM sources)), setval('scholarship_sources_id_seq', (SELECT MAX(id) FROM scholarship_sources)), setval('university_scholarships_id_seq', (SELECT MAX(id) FROM university_scholarships));

-- Hard check after Pass 137 (2026-11-01): 549 active / 206 retired / 1
-- reliability-<=4 (876) / 194 future-dated (>2026-11-01) — all unchanged.
-- Reliability-<=8 structured-minima pool 40 -> 36. Notes tagged PASS 137 x4;
-- residual structured minima on the four rows 0; side-row "Typical academic
-- profile" residual 0; links 496-502 present.
