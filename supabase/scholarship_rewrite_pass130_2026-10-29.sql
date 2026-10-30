-- Pass 130 (2026-10-29): template-minima cleanup, US need-based-aid family.
-- REPLAY WARNING: notes appends below are NOT idempotent -- execute once only.
-- 552 CWRU deliberately EXCLUDED (specific transcribed admission profile; separate future uplift).

-- 1) New verified official sources (pages fetched first-hand 2026-10-29).
INSERT INTO sources (id, url, title, domain, source_type, accessed_at, is_official, is_verified) VALUES
(3159, 'https://finaid.brown.edu/apply/first-year-international', 'Brown University Financial Aid — First Year International Applicants (need-blind, CSS Profile deadlines)', 'finaid.brown.edu', 'scholarship', '2026-10-29', true, true),
(3160, 'https://www.nyu.edu/admissions/financial-aid-and-scholarships/applying-as-a-prospective-undergraduate-student/first-year-applicants/the-nyu-promise.html', 'NYU — The NYU Promise (100% of demonstrated need met; no GPA requirement to maintain aid)', 'www.nyu.edu', 'scholarship', '2026-10-29', true, true),
(3161, 'https://finaid.cornell.edu/', 'Cornell University Financial Aid — home (need-based Cornell grants; international applicant timelines)', 'finaid.cornell.edu', 'scholarship', '2026-10-29', true, true);

-- 2) Fetched-four (547 Brown, 559 Cornell, 643 NYU Promise, 816 Harvard):
--    minima NULLed, template english text normalised, last_verified bumped; 643 flags corrected.
UPDATE scholarships SET min_gpa = NULL, min_ielts = NULL,
english_requirements = 'No award-specific English score is published: this is need-based financial aid awarded with admission, so English proficiency is governed by undergraduate admission requirements (which vary and may be waived), not by the aid programme.',
financial_need_based = true,
merit_based = CASE WHEN id = 643 THEN false ELSE merit_based END,
last_verified_at = '2026-10-29 23:30:00+05', last_updated_at = '2026-10-29 23:30:00+05',
notes = COALESCE(notes, '') || ' PASS 130 MICRO-REPAIR 2026-10-29: imported template minima removed (min_gpa/min_ielts NULLed) after a first-hand re-read of the university''s official financial-aid page today (linked as a source in this pass). The page frames the money exactly as this record''s description already did — need-based aid meeting demonstrated need for admitted students — and publishes no GPA or IELTS award cutoff (NYU''s Promise page states outright that there is no GPA requirement; Harvard offers need-based aid only; Brown is need-blind for international first-years). The structured figures were import-template values (the identical "IELTS 7.5 / TOEFL 102 / DET 130" string sat on two unrelated universities'' rows). English-requirement text normalised to admission-level wording; need/merit flags corrected where the record''s own title and text required it.'
WHERE id IN (547, 559, 643, 816) AND is_active;

-- 3) Own-text eight (563 Dartmouth, 572 Duke, 575 Emory, 635 Northwestern, 644 UChicago,
--    663 Rice, 782 Vanderbilt, 789 WashU): same strip justified by each record's own verified
--    text; NO last_verified bump (pages not re-read today). Flags: 635 -> need-based; 782 adds merit.
UPDATE scholarships SET min_gpa = NULL, min_ielts = NULL,
english_requirements = CASE WHEN english_requirements ILIKE 'IELTS%' THEN 'No award-specific English score is published: this is need-based financial aid awarded with admission, so English proficiency is governed by undergraduate admission requirements (which vary and may be waived), not by the aid programme.' ELSE english_requirements END,
financial_need_based = CASE WHEN id = 635 THEN true ELSE financial_need_based END,
merit_based = CASE WHEN id = 635 THEN false WHEN id = 782 THEN true ELSE merit_based END,
last_updated_at = '2026-10-29 23:30:00+05',
notes = COALESCE(notes, '') || ' PASS 130 MICRO-REPAIR 2026-10-29: imported template minima removed (min_gpa/min_ielts NULLed) on this record''s own verified text, which describes need-based aid meeting demonstrated need for admitted students (and, where the english_requirements field already said so, states the award sets no separate English score) — the structured GPA/IELTS figures contradicted the record itself and matched the identical template values stripped across the US need-based-aid family in this pass (four sibling records were re-fetched first-hand today: Brown, Cornell, NYU, Harvard). Need/merit flags corrected where the title/description required it (Northwestern 635 is need-based; Vanderbilt 782 covers both merit signature awards and need-based aid). Reliability and last_verified_at unchanged — this university''s own page was not re-read today.'
WHERE id IN (563, 572, 575, 635, 644, 663, 782, 789) AND is_active;

-- 4) 600 UIUC (no need-based aid for internationals; limited merit routes documented).
UPDATE scholarships SET min_gpa = NULL, min_ielts = NULL,
english_requirements = 'No scholarship-specific English score is published for the awards described; English proficiency requirements are those of UIUC admission.',
last_updated_at = '2026-10-29 23:30:00+05',
notes = COALESCE(notes, '') || ' PASS 130 MICRO-REPAIR 2026-10-29: imported template minima removed (min_gpa 3.6 / min_ielts 7 NULLed) — this record documents that UIUC offers no need-based aid to international students and describes its limited merit routes, none of which publishes the stored GPA/IELTS figures, which matched the identical template values stripped across the US family in this pass. Reliability and last_verified_at unchanged.'
WHERE id = 600 AND is_active;

-- 5) Side-row template sentence strip (8 of 14 family rows matched).
UPDATE university_scholarships
SET eligibility_notes = regexp_replace(eligibility_notes, 'Typical academic profile: GPA [0-9.]+\+(, IELTS [0-9.]+\+)?\. ?', '', 'g'),
    last_verified_at = '2026-10-29 23:30:00+05'
WHERE scholarship_id IN (547,559,563,572,575,600,635,643,644,663,782,789,816)
  AND eligibility_notes ~ 'Typical academic profile:';

-- 6) Source links for the fetched four (816 Harvard uses pre-existing source 2503).
INSERT INTO scholarship_sources (id, scholarship_id, source_id, source_type, created_at) VALUES
(456, 547, 3159, 'official_scholarship', now()),
(457, 559, 3161, 'official_scholarship', now()),
(458, 643, 3160, 'official_scholarship', now()),
(459, 816, 2503, 'official_scholarship', now());

-- 7) Sequence sync.
SELECT setval(pg_get_serial_sequence('sources','id'), (SELECT MAX(id) FROM sources), true);
SELECT setval(pg_get_serial_sequence('scholarship_sources','id'), (SELECT MAX(id) FROM scholarship_sources), true);
SELECT setval(pg_get_serial_sequence('scholarships','id'), (SELECT MAX(id) FROM scholarships), true);
SELECT setval(pg_get_serial_sequence('university_scholarships','id'), (SELECT MAX(id) FROM university_scholarships), true);
