-- Rewrite Pass 136 (2026-10-30): India IIT fellowship/assistantship family
-- template-minima cleanup — 595 IIT Kanpur, 597 IIT Madras, 598 IIT Bombay,
-- 599 IIT Delhi. All four carried import-template structured minima
-- (3.0/6.5, 3.0/6.5, 3.3/6.5, 3.3/6.5) while their own verified texts (deep
-- rewrites from the institutes' own pages, 2026-10-25) describe admission-category
-- instruments with examinations waived for foreign nationals and no published GPA
-- floor or English-test score; english_requirements on all four already said no
-- separate score applies, so it is unchanged. First-hand fetched today (sources
-- minted + last_verified bumped): 3192 IIT Kanpur OIR how-to-apply (admission
-- categories incl. Institute Fellowship; Study in India/PRAGATII USD 3,200),
-- 3193 IIT Madras GE M.Tech page (degree-based eligibility; ICCR + IIT-M GE
-- schemes named, GE still publishing no terms — 597 stays at reliability 7),
-- 3194 IIT Bombay doctoral categories page (TA Rs 37,000/42,000; FRN-SF no
-- assistantship; the brochure-rate conflict already recorded in 598 stands).
-- Own-text strip: 599 (stored international.iitd.ac.in page could not be fetched;
-- no source minted, last_verified NOT advanced). Side rows 293/288/169 (fetched
-- three) lv-synced; side row 105 (599) untouched. No side-row template strings
-- existed in this family. Notes appends are replay-once; writes strictly
-- sequential. The South Korea minima family (583, 611, 794, 858) was assessed and
-- deferred to the next pass: 583 turns on NIIED rules and 858 carries admission
-- English levels inside its own verified text, so both need per-row care.

-- 1) Sources 3192-3194
INSERT INTO sources (id, url, title, domain, source_type, accessed_at, is_official, is_verified) VALUES
(3192, 'https://www.iitk.ac.in/oir/how-to-apply', 'IIT Kanpur Office of International Relations — How to Apply (foreign-national admission categories incl. Institute Fellowship; Study in India/PRAGATII up to USD 3,200)', 'www.iitk.ac.in', 'scholarship', '2026-10-30 00:00:00', true, true),
(3193, 'https://ge.iitm.ac.in/programs/student-inbound/mtech', 'IIT Madras Global Engagement — M.Tech International Admissions (degree-based eligibility; ICCR and IIT-M GE Scholarship schemes named)', 'ge.iitm.ac.in', 'scholarship', '2026-10-30 00:00:00', true, true),
(3194, 'https://acad.iitb.ac.in/admissions/research', 'IIT Bombay Academic Office — Doctoral admissions categories (TA Rs 37,000/42,000; self-financed foreign nationals receive no assistantship)', 'acad.iitb.ac.in', 'scholarship', '2026-10-30 00:00:00', true, true);

-- 2) Fetched three (source minted, last_verified bumped)
UPDATE scholarships SET min_gpa = NULL, min_ielts = NULL, last_verified_at = '2026-10-30 09:00:00+05', last_updated_at = '2026-10-30 09:00:00+05', notes = COALESCE(notes, '') || ' PASS 136 (2026-10-30): the structured min_gpa 3.0 / min_ielts 6.5 are cleared as import-template leftovers that contradicted this record''s own verified text. The institute''s foreign-national application page (source 3192, fetched first-hand in this pass) confirms admission through the named categories (ICCR, Study in India, AARDO fellowship, ASEAN doctoral fellowship, India-Bhutan Friendship Scholarship, Institute Fellowship) for MTech/MBA/PhD programmes, with the Institute Fellowship reserved for students holding no other funding; no GPA floor or English-test score is published for these routes, and the record''s english_requirements already said so. Terms and the stored deadline are unchanged.' WHERE id = 595 AND notes NOT LIKE '%PASS 136%';
UPDATE scholarships SET min_gpa = NULL, min_ielts = NULL, last_verified_at = '2026-10-30 09:00:00+05', last_updated_at = '2026-10-30 09:00:00+05', notes = COALESCE(notes, '') || ' PASS 136 (2026-10-30): the structured min_gpa 3.0 / min_ielts 6.5 are cleared as import-template leftovers. The Global Engagement M.Tech admissions page (source 3193, fetched first-hand in this pass) confirms the stored framing: eligibility is framed by degree type, applications go through the international portal with an ICCR application number where that route is used, and the scholarships named are the ICCR scholarship and the IIT-M GE Scholarship scheme — for which the page still publishes no value, eligibility criteria, GPA floor or English-test score, consistent with this record''s existing wording and its reliability of 7, which is unchanged.' WHERE id = 597 AND notes NOT LIKE '%PASS 136%';
UPDATE scholarships SET min_gpa = NULL, min_ielts = NULL, last_verified_at = '2026-10-30 09:00:00+05', last_updated_at = '2026-10-30 09:00:00+05', notes = COALESCE(notes, '') || ' PASS 136 (2026-10-30): the structured min_gpa 3.3 / min_ielts 6.5 are cleared as import-template leftovers. The Academic Office doctoral page (source 3194, fetched first-hand in this pass) repeats the admissions-category table this record already used (teaching assistantship at Rs 37,000/42,000 with the eight-hour teaching obligation; self-financed foreign nationals FRN-SF with no assistantship; ICCR assistance) and publishes no entry GPA floor or English-test score for the assistantship categories. The recorded conflict between the table rate and the foreign-national brochure rate is unchanged and still flagged in the record.' WHERE id = 598 AND notes NOT LIKE '%PASS 136%';

-- 3) Own-text one (no source, no last_verified bump)
UPDATE scholarships SET min_gpa = NULL, min_ielts = NULL, notes = COALESCE(notes, '') || ' PASS 136 (2026-10-30): the structured min_gpa 3.3 / min_ielts 6.5 are cleared as import-template leftovers on the basis of this record''s own verified text (IIT Delhi pages read 2026-10-25): the doctoral teaching assistantship follows from admission as a full-time foreign national, the entrance examinations GATE/JAM/CEED are waived for foreign nationals, and the record''s english_requirements already states that no separate English score applies. The stored source page could not be fetched in this pass, so no source was minted and last_verified_at was not advanced.' WHERE id = 599 AND notes NOT LIKE '%PASS 136%';

-- 4) Links 492-494 + fetched-three side-row lv sync
INSERT INTO scholarship_sources (id, scholarship_id, source_id, source_type, created_at) VALUES (492, 595, 3192, 'official_scholarship', now()), (493, 597, 3193, 'official_scholarship', now()), (494, 598, 3194, 'official_scholarship', now());
UPDATE university_scholarships SET last_verified_at = '2026-10-30 09:00:00+05' WHERE id IN (293, 288, 169);

-- 5) Sequences (MAX-based)
SELECT setval('scholarships_id_seq', (SELECT MAX(id) FROM scholarships)), setval('sources_id_seq', (SELECT MAX(id) FROM sources)), setval('scholarship_sources_id_seq', (SELECT MAX(id) FROM scholarship_sources)), setval('university_scholarships_id_seq', (SELECT MAX(id) FROM university_scholarships));

-- Hard check after Pass 136 (2026-10-30): 548 active / 206 retired / 1
-- reliability-<=4 (876) / 208 future-dated (all unchanged). Reliability-<=8
-- structured-minima pool 44 -> 40. Notes tagged PASS 136 x4; residual structured
-- minima on the four rows 0.
