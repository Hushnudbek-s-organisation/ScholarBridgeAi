-- Rewrite Pass 134 (2026-10-30): United States merit-family template-minima cleanup —
-- 682 UT Austin (Texas Exes/ISSS), 694 UC Davis Regents, 699 UCLA Regents,
-- 723 Arizona Global Wildcat, 764 Jefferson Scholarship. All five carried
-- import-template structured GPA/IELTS minima (3.6/6.5, 3.25/-, 3.6/7.5, 3.0/6.5,
-- 3.0/7.0) that the awards do not publish as entry cutoffs; three of the GPA
-- figures (694's 3.25, 723's 3.00) were in fact RENEWAL thresholds mis-stored as
-- entry minima. First-hand fetched today (sources minted + last_verified bumped):
-- 3184 UC Davis Regents page (3.25 = renewal; USD 7,500; 2 December UC
-- application), 3185 UT Austin Texas Global ISSS scholarships page (each named
-- award carries its own 2.0/3.0/3.25 floors and need/field/region criteria; LASSO
-- windows 1 Oct-1 Nov 2026 and 1 Feb-1 Mar 2027), 3186 Jefferson Scholars
-- Foundation scholarships page (nomination-only; non-Virginians over USD 83,000/yr).
-- Own-text strips (no source minted, last_verified NOT advanced): 699 (stored
-- UCLA URL redirects to a 403; own 2026-10-23 verified text shows no entry cutoff,
-- 3.0 is the renewal GPA) and 723 (own verified text: banded merit chart weighted
-- by GPA/test scores, 3.00 = renewal; first-hand chunks of the 2026-2027 terms
-- page confirmed the 1 November Early Action priority date but the Global Wildcat
-- section was not re-read). english_requirements replaced with "no
-- scholarship-specific score published; the admission English proficiency
-- requirement applies" on 682/699/723/764 (694's existing wording already said the
-- same). Side-row template sentences ("Typical academic profile: GPA ..., IELTS
-- ..., SAT ...+.") regex-stripped on us 77/49/260/264 (+lv); us 101 (694) was
-- already accurate narrative and got an lv-only sync. Notes appends are
-- replay-once; writes were executed strictly sequentially.

-- 1) Sources 3184-3186
INSERT INTO sources (id, url, title, domain, source_type, accessed_at, is_official, is_verified) VALUES
(3184, 'https://financialaid.ucdavis.edu/scholarships/campus/awards/regents', 'UC Davis — Regents Scholarship (USD 7,500; 3.25 is the renewal GPA, not an entry minimum)', 'financialaid.ucdavis.edu', 'scholarship', '2026-10-30 00:00:00', true, true),
(3185, 'https://global.utexas.edu/isss/advising-services/scholarships', 'Texas Global (UT Austin) — Scholarships and Financial Services for International Students (named awards; two LASSO windows)', 'global.utexas.edu', 'scholarship', '2026-10-30 00:00:00', true, true),
(3186, 'https://www.jeffersonscholars.org/scholarships', 'Jefferson Scholars Foundation — Undergraduate Scholarships (nomination-based; non-Virginians over USD 83,000 per year)', 'www.jeffersonscholars.org', 'scholarship', '2026-10-30 00:00:00', true, true);

-- 2) Fetched three (source minted, last_verified bumped)
UPDATE scholarships SET min_gpa = NULL, min_ielts = NULL, english_requirements = 'No scholarship-specific English score is published; applicants must meet UT Austin''s admission English proficiency requirement (check the official admissions page).', last_verified_at = '2026-10-30 05:00:00+05', last_updated_at = '2026-10-30 05:00:00+05', notes = COALESCE(notes, '') || ' PASS 134 (2026-10-30): the structured min_gpa 3.6 / min_ielts 6.5 are cleared as import-template leftovers. The Texas Global ISSS scholarships page (source 3185, fetched first-hand in this pass) lists each named award with its own criteria (for example, minimum cumulative GPAs of 2.0, 3.0 or 3.25, plus need-, field- and region-based conditions), confirms the two annual LASSO windows (Spring/Summer 2027: 1 October - 1 November 2026; Fall 2027/academic year: 1 February - 1 March 2027) and points separately to the Texas Exes route; no single GPA or IELTS cutoff is published for the bundle. english_requirements now states that no scholarship-specific score is published and that UT Austin''s admission English proficiency requirement applies. Terms, the award range and the stored 1 March 2027 deadline are unchanged from the 2026-10-23 verification.' WHERE id = 682 AND notes NOT LIKE '%PASS 134%';
UPDATE scholarships SET min_gpa = NULL, last_verified_at = '2026-10-30 05:00:00+05', last_updated_at = '2026-10-30 05:00:00+05', notes = COALESCE(notes, '') || ' PASS 134 (2026-10-30): structured min_gpa 3.25 cleared — the UC Davis Regents page (source 3184, fetched first-hand in this pass) confirms that 3.25 is the RENEWAL threshold (renewable as long as the student maintains a 3.25 grade point average and remains in good academic standing), not an entry minimum; no entry GPA or English-test cutoff is published, and consideration is from the UC application received by the 2 December deadline. The USD 7,500 value and need-based stipend terms are unchanged; international eligibility is still not published on the Davis financial aid pages, so reliability stays at 8.' WHERE id = 694 AND notes NOT LIKE '%PASS 134%';
UPDATE scholarships SET min_gpa = NULL, min_ielts = NULL, english_requirements = 'No scholarship-specific English score is published; applicants must meet the University of Virginia''s undergraduate admission English proficiency requirement (check the official admission page).', last_verified_at = '2026-10-30 05:00:00+05', last_updated_at = '2026-10-30 05:00:00+05', notes = COALESCE(notes, '') || ' PASS 134 (2026-10-30): the structured min_gpa 3.0 / min_ielts 7.0 are cleared as import-template leftovers. The Foundation''s official undergraduate scholarships page (source 3186, fetched first-hand in this pass) confirms nomination-only selection through invited secondary schools (7,697 schools invited to nominate across 85 regions for 2025-26) with no published GPA or English-test cutoff, and repeats the non-Virginian value of more than USD 83,000 a year (upwards of USD 405,000 in total). english_requirements now states that no scholarship-specific score is published and that the University of Virginia''s admission English proficiency requirement applies.' WHERE id = 764 AND notes NOT LIKE '%PASS 134%';

-- 3) Own-text two (no source, no last_verified bump)
UPDATE scholarships SET min_gpa = NULL, min_ielts = NULL, english_requirements = 'No scholarship-specific English score is published; applicants must meet UCLA''s undergraduate admission English proficiency requirement (check the official admission page).', notes = COALESCE(notes, '') || ' PASS 134 (2026-10-30): the structured min_gpa 3.6 / min_ielts 7.5 are cleared as import-template leftovers on the basis of this record''s own verified text (financialaid.ucla.edu, 2026-10-23): Regents Scholars are identified inside the admissions review with no open application, and the only GPA figure the university publishes is the 3.0 cumulative-GPA renewal condition. english_requirements now states that no scholarship-specific score is published and that UCLA''s undergraduate admission English proficiency requirement applies. The stored source URL currently redirects to a 403, so no source was minted and last_verified_at was not advanced in this pass.' WHERE id = 699 AND notes NOT LIKE '%PASS 134%';
UPDATE scholarships SET min_gpa = NULL, min_ielts = NULL, english_requirements = 'No scholarship-specific English score is published; applicants must meet the University of Arizona''s admission English proficiency requirement (check the official admissions page).', notes = COALESCE(notes, '') || ' PASS 134 (2026-10-30): the structured min_gpa 3.0 / min_ielts 6.5 are cleared. On this record''s own verified text (2026-10-23) the 3.00 figure is the cumulative-GPA condition for RENEWAL across the eight semesters, while entry amounts come from a published GPA-banded merit chart weighted by GPA and test scores, so a single structured entry cutoff misrepresents the award; no English-test cutoff is documented. Portions of the current 2026-2027 terms-and-conditions page fetched first-hand in this pass confirm the first-year merit priority date of 1 November (Early Action), but the Global Wildcat section itself was not re-read, so no source was minted and last_verified_at was not advanced.' WHERE id = 723 AND notes NOT LIKE '%PASS 134%';

-- 4) Links 482-484
INSERT INTO scholarship_sources (id, scholarship_id, source_id, source_type, created_at) VALUES (482, 694, 3184, 'official_scholarship', now()), (483, 682, 3185, 'official_scholarship', now()), (484, 764, 3186, 'official_scholarship', now());

-- 5) Side-row template strips (regex covers GPA + optional IELTS/SAT segments) + lv sync
UPDATE university_scholarships SET eligibility_notes = regexp_replace(eligibility_notes, 'Typical academic profile: GPA [0-9.]+\+(, (IELTS|SAT) [0-9.]+\+)*\. ?', '', 'g'), last_verified_at = '2026-10-30 05:00:00+05' WHERE id IN (77, 49, 260, 264);
UPDATE university_scholarships SET last_verified_at = '2026-10-30 05:00:00+05' WHERE id = 101;

-- 6) Sequences (MAX-based)
SELECT setval('scholarships_id_seq', (SELECT MAX(id) FROM scholarships)), setval('sources_id_seq', (SELECT MAX(id) FROM sources)), setval('scholarship_sources_id_seq', (SELECT MAX(id) FROM scholarship_sources)), setval('university_scholarships_id_seq', (SELECT MAX(id) FROM university_scholarships));

-- Hard check after Pass 134 (2026-10-30): 547 active / 206 retired / 1
-- reliability-<=4 (876) / 207 future-dated (all unchanged — minima strips only).
-- Reliability-<=8 structured-minima pool 53 -> 48. Notes tagged PASS 134 x5;
-- residual structured minima on the five rows 0; side-row template residue 0.
