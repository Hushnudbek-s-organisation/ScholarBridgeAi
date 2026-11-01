-- Pass 131 (2026-10-29): template-minima cleanup, UK undergraduate merit family (10 rows).
-- REPLAY WARNING: notes appends below are NOT idempotent -- execute once only.

-- 1) New verified official sources (pages fetched first-hand 2026-10-29).
INSERT INTO sources (id, url, title, domain, source_type, accessed_at, is_official, is_verified) VALUES
(3167, 'https://www.durham.ac.uk/study/scholarships/international/durham-inspiring-excellence-scholarships/', 'Durham University — Inspiring Excellence Scholarships (selection on achievements; meet programme entry requirements)', 'www.durham.ac.uk', 'scholarship', '2026-10-29', true, true),
(3168, 'https://www.nottingham.ac.uk/studywithus/international-applicants/scholarships-funding-finance/international-undergraduate-excellence-scholarship.aspx', 'University of Nottingham — International Undergraduate Excellence Scholarship (AAA or equivalent, automatic)', 'www.nottingham.ac.uk', 'scholarship', '2026-10-29', true, true),
(3169, 'https://sheffield.ac.uk/international/fees-and-funding/scholarships/undergraduate/international-undergraduate-scholarship-2027', 'University of Sheffield — International Undergraduate Scholarship 2027 (automatic GBP 2,500/year)', 'sheffield.ac.uk', 'scholarship', '2026-10-29', true, true),
(3170, 'https://le.ac.uk/study/undergraduates/scholarships-bursaries-discounts/international-undergraduate-merit-scholarship', 'University of Leicester — International Undergraduate Merit Scholarship (two grades above standard entry, automatic)', 'le.ac.uk', 'scholarship', '2026-10-29', true, true);

-- 2) Fetched four (573 Durham, 639 Nottingham, 666 Sheffield, 744 Leicester).
UPDATE scholarships SET min_gpa = NULL, min_ielts = NULL,
english_requirements = 'No scholarship-specific English score is published: English language requirements are those of the chosen course at admission (they vary by course), not of the scholarship.',
last_verified_at = '2026-10-30 00:10:00+05', last_updated_at = '2026-10-30 00:10:00+05',
notes = COALESCE(notes, '') || ' PASS 131 MICRO-REPAIR 2026-10-29: imported template minima removed (min_gpa/min_ielts NULLed) after a first-hand re-read of the university''s official scholarship page today (linked as a source in this pass). The page runs the award exactly as this record''s description already did — an automatic grade-band tuition discount or a competitive award judged on academic achievement against the course entry requirements (e.g. Nottingham AAA or international equivalent; Leicester two grades above the standard A-level entry requirement; Sheffield GBP 2,500 a year automatic with a 60% UK-average continuation rule; Durham selection on achievements for applicants who meet or exceed programme entry requirements) — and publishes no U.S.-scale GPA figure and no IELTS scholarship cutoff; English requirements sit in the course entry requirements and vary by course. The stored 3.0-3.6 / 6.5-7.0 figures were import-template values (the identical GPA/IELTS+ profile sentence sat on all ten UK family side rows). Reliability unchanged — record substance was already verified 2026-10-23; this pass only removed the contradicting structured fields.'
WHERE id IN (573, 639, 666, 744) AND is_active;

-- 3) Own-text six (546 Birmingham, 615 Leeds, 670 Southampton, 675 Swansea,
--    758 Strathclyde, 760 Sussex): no last_verified bump (pages not re-read today).
UPDATE scholarships SET min_gpa = NULL, min_ielts = NULL,
english_requirements = 'No scholarship-specific English score is published: English language requirements are those of the chosen course at admission (they vary by course), not of the scholarship.',
last_updated_at = '2026-10-30 00:10:00+05',
notes = COALESCE(notes, '') || ' PASS 131 MICRO-REPAIR 2026-10-29: imported template minima removed (min_gpa/min_ielts NULLed) on this record''s own verified text, which describes an automatic or grade-band-merit tuition discount keyed to course entry requirements/A-level equivalents (UK universities do not publish U.S.-scale GPA thresholds or IELTS cutoffs for these awards — English requirements are set per course at admission) — the structured 3.0-3.6 / 6.5-7.0 figures contradicted the record itself and matched the identical template values stripped across the UK family in this pass, four of which (Durham 573, Nottingham 639, Sheffield 666, Leicester 744) were re-fetched first-hand today and publish no such figures. Reliability and last_verified_at unchanged — this university''s own page was not re-read today.'
WHERE id IN (546, 615, 670, 675, 758, 760) AND is_active;

-- 4) Side-row template sentence strip (all 10 family rows matched).
UPDATE university_scholarships
SET eligibility_notes = regexp_replace(eligibility_notes, 'Typical academic profile: GPA [0-9.]+\+(, IELTS [0-9.]+\+)?\. ?', '', 'g'),
    last_verified_at = '2026-10-30 00:10:00+05'
WHERE scholarship_id IN (546,573,615,639,666,670,675,744,758,760)
  AND eligibility_notes ~ 'Typical academic profile:';

-- 5) Source links for the fetched four.
INSERT INTO scholarship_sources (id, scholarship_id, source_id, source_type, created_at) VALUES
(465, 573, 3167, 'official_scholarship', now()),
(466, 639, 3168, 'official_scholarship', now()),
(467, 666, 3169, 'official_scholarship', now()),
(468, 744, 3170, 'official_scholarship', now());

-- 6) Sequence sync.
SELECT setval(pg_get_serial_sequence('sources','id'), (SELECT MAX(id) FROM sources), true);
SELECT setval(pg_get_serial_sequence('scholarship_sources','id'), (SELECT MAX(id) FROM scholarship_sources), true);
SELECT setval(pg_get_serial_sequence('scholarships','id'), (SELECT MAX(id) FROM scholarships), true);
SELECT setval(pg_get_serial_sequence('university_scholarships','id'), (SELECT MAX(id) FROM university_scholarships), true);
