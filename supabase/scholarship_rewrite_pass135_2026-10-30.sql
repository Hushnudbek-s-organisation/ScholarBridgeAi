-- Rewrite Pass 135 (2026-10-30): Hong Kong entrance-scholarship family template-minima
-- cleanup — 556 CityUHK, 560 CUHK, 591 HKU, 651 PolyU. All four carried
-- import-template structured minima (3.6/6.5, 3.6/7.0, 3.85/7.0, 3.6/6.5) with
-- "IELTS x or equivalent English test" strings; Hong Kong entrance scholarships are
-- keyed to HKDSE/IB/A-level/Gaokao-type qualifications, and none of the first-hand
-- pages read today publishes a US-GPA or single-IELTS entry cutoff.
-- First-hand reads in this pass (sources minted/reused + last_verified bumped):
-- 3188 (new) CityUHK current Entrance Scholarship page — the stored /international/
-- URL now redirects to the generic admissions page, so 556's source_url/website_url
-- were moved to the page read; the new page confirms the three automatic tiers and a
-- renewal CGPA condition but does not print the 3.2 figure carried since the
-- 2026-10-23 verification of the predecessor page (stored text unchanged);
-- 2479 (pre-existing) CUHK Admission Scholarships page re-read in full — stored terms
-- confirmed exactly; 2483 (pre-existing) HKU scholarships finder re-read — still 43
-- awards for non-local students with international qualifications;
-- 3189 (new) PolyU Undergraduate Scholarships pages — the stored tuition-fees URL
-- could not be fetched; the read pages confirm automatic merit consideration and the
-- tuition + HK$60,000 holding cap, and 651's URLs were moved to the page read. The
-- PolyU listing shows the Cultural Ambassador at up to HK$60,000/yr vs the
-- HK$50,000 recorded in 2026 — flagged in the notes, not rewritten in this pass.
-- english_requirements on all four now states that no scholarship-specific score is
-- published and that the admission English requirement for the applicant's
-- qualification applies. Side rows us 61/32/20/70 template-stripped (+lv); us 20's
-- name synced from the stale "HKU Foundation Scholarship" to the record title.
-- Notes appends are replay-once; writes executed strictly sequentially. (First
-- multi-source insert failed on the pre-existing CUHK/HKU URLs and was split after a
-- state check; replay below already reflects the corrected shape.)

-- 1) New sources 3188/3189 (CUHK 2479 and HKU 2483 already exist since 2026-10-23)
INSERT INTO sources (id, url, title, domain, source_type, accessed_at, is_official, is_verified) VALUES
(3188, 'https://www.cityu.edu.hk/admo/entrance-scholarship-international-students', 'CityUHK Admission — Entrance Scholarship for International Students (three automatic tiers; renewal CGPA applies)', 'www.cityu.edu.hk', 'scholarship', '2026-10-30 00:00:00', true, true),
(3189, 'https://www.polyu.edu.hk/study/ug/fees-and-scholarships/scholarships', 'PolyU — Undergraduate Scholarships (merit-based, automatic consideration; tuition + HK$60,000 holding cap)', 'www.polyu.edu.hk', 'scholarship', '2026-10-30 00:00:00', true, true);

-- 2) Four minima strips (fetched four: source linked, last_verified bumped)
UPDATE scholarships SET min_gpa = NULL, min_ielts = NULL, english_requirements = 'No fixed IELTS score is published for this scholarship; applicants must meet CityUHK''s undergraduate admission English language requirement for their qualification (check the official admissions page).', source_url = 'https://www.cityu.edu.hk/admo/entrance-scholarship-international-students', website_url = 'https://www.cityu.edu.hk/admo/entrance-scholarship-international-students', last_verified_at = '2026-10-30 07:00:00+05', last_updated_at = '2026-10-30 07:00:00+05', notes = COALESCE(notes, '') || ' PASS 135 (2026-10-30): the structured min_gpa 3.6 / min_ielts 6.5 are cleared as import-template leftovers. The university''s current Entrance Scholarship page (source 3188, fetched first-hand in this pass — the stored /international/ URL now redirects to the generic international-admissions page, so source_url/website_url were moved to the page read) confirms the three automatic tiers (Top with a living allowance of up to HKD 60,000, Full Tuition, Half Tuition), that applicants do not apply, and that renewal requires attaining a minimum CGPA each year; the page does not print the 3.2 renewal figure this record has carried since the 2026-10-23 verification of the predecessor page, and no entry GPA or IELTS cutoff is published in either read. english_requirements now states that no scholarship-specific score is published and that CityUHK''s admission English requirement for the applicant''s qualification applies. Terms, the 2027 dates and the amount structure are unchanged.' WHERE id = 556 AND notes NOT LIKE '%PASS 135%';
UPDATE scholarships SET min_gpa = NULL, min_ielts = NULL, english_requirements = 'No fixed IELTS score is published for this scholarship; applicants must meet CUHK''s undergraduate admission English language requirement for their qualification (check the official admissions page).', last_verified_at = '2026-10-30 07:00:00+05', last_updated_at = '2026-10-30 07:00:00+05', notes = COALESCE(notes, '') || ' PASS 135 (2026-10-30): the structured min_gpa 3.6 / min_ielts 7.0 are cleared as import-template leftovers. CUHK''s Admission Scholarships page (source 2479, re-read first-hand in this pass) confirms the stored terms exactly — no separate application, values from HK$5,000 to full-tuition coverage renewable subject to satisfactory academic progress, allowances up to HK$66,000 a year, HKSAR Government Scholarship at HK$80,000 for non-local students, and one-off non-academic awards of HK$50,000-HK$214,000 — and publishes no GPA or English-test cutoff for the awards. english_requirements now states that no scholarship-specific score is published and that CUHK''s admission English requirement for the applicant''s qualification applies.' WHERE id = 560 AND notes NOT LIKE '%PASS 135%';
UPDATE scholarships SET min_gpa = NULL, min_ielts = NULL, english_requirements = 'No fixed IELTS score is published for these scholarships; applicants must meet HKU''s undergraduate admission English language requirement for their qualification (check the official admissions page).', last_verified_at = '2026-10-30 07:00:00+05', last_updated_at = '2026-10-30 07:00:00+05', notes = COALESCE(notes, '') || ' PASS 135 (2026-10-30): the structured min_gpa 3.85 / min_ielts 7.0 are cleared as import-template leftovers. HKU''s scholarships finder (source 2483, re-read first-hand in this pass) still returns 43 scholarships for a non-local student with international qualifications, filtered by student type, qualification and faculty, and repeats the non-local definition this record uses; a 43-award catalogue has no single GPA or IELTS cutoff, and none is published on the page. english_requirements now states that no scholarship-specific score is published and that HKU''s admission English requirement for the applicant''s qualification applies. The catalogue framing and the cleared amount are unchanged from the 2026-10-23 correction.' WHERE id = 591 AND notes NOT LIKE '%PASS 135%';
UPDATE scholarships SET min_gpa = NULL, min_ielts = NULL, english_requirements = 'No fixed IELTS score is published for this scholarship; applicants must meet PolyU''s undergraduate admission English language requirement for their qualification (check the official admissions page).', source_url = 'https://www.polyu.edu.hk/study/ug/fees-and-scholarships/scholarships', website_url = 'https://www.polyu.edu.hk/study/ug/fees-and-scholarships/scholarships', last_verified_at = '2026-10-30 07:00:00+05', last_updated_at = '2026-10-30 07:00:00+05', notes = COALESCE(notes, '') || ' PASS 135 (2026-10-30): the structured min_gpa 3.6 / min_ielts 6.5 are cleared as import-template leftovers. PolyU''s current Undergraduate Scholarships pages (source 3189, fetched first-hand in this pass — the stored tuition-fees URL could not be fetched, so source_url/website_url were moved to the page read) confirm the framing this record uses: outstanding applicants are considered for merit-based scholarships without a separate application, and a student may hold more than one award up to the annual tuition payable plus a HK$60,000 allowance; no GPA or English-test entry cutoff is published on the pages read. Flag (not rewritten in this minima pass): the listing gives the Cultural Ambassador Scholarship as a renewable award of up to HK$60,000 a year, where the 2026-10-23 verification recorded up to HK$50,000; reconcile on the scheme''s own page before changing the amount. english_requirements now states that no scholarship-specific score is published and that PolyU''s admission English requirement for the applicant''s qualification applies.' WHERE id = 651 AND notes NOT LIKE '%PASS 135%';

-- 3) Links 486-489
INSERT INTO scholarship_sources (id, scholarship_id, source_id, source_type, created_at) VALUES (486, 556, 3188, 'official_scholarship', now()), (487, 560, 2479, 'official_scholarship', now()), (488, 591, 2483, 'official_scholarship', now()), (489, 651, 3189, 'official_scholarship', now());

-- 4) Side-row template strips + lv; us 20 name sync
UPDATE university_scholarships SET eligibility_notes = regexp_replace(eligibility_notes, 'Typical academic profile: GPA [0-9.]+\+(, (IELTS|SAT) [0-9.]+\+)*\. ?', '', 'g'), last_verified_at = '2026-10-30 07:00:00+05' WHERE id IN (61, 32, 20, 70);
UPDATE university_scholarships SET scholarship_name = 'HKU Scholarships for Non-Local Students (43 awards)' WHERE id = 20;

-- 5) Sequences (MAX-based)
SELECT setval('scholarships_id_seq', (SELECT MAX(id) FROM scholarships)), setval('sources_id_seq', (SELECT MAX(id) FROM sources)), setval('scholarship_sources_id_seq', (SELECT MAX(id) FROM scholarship_sources)), setval('university_scholarships_id_seq', (SELECT MAX(id) FROM university_scholarships));

-- Hard check after Pass 135 (2026-10-30): 547 active / 206 retired / 1
-- reliability-<=4 (876) / 207 future-dated (all unchanged). Reliability-<=8
-- structured-minima pool 48 -> 44. Notes tagged PASS 135 x4; residual structured
-- minima on the four rows 0; side-row template residue 0.
