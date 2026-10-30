-- Pass 133 (2026-10-30): template-minima cleanup, Australia coursework-merit family (6 rows).
-- REPLAY WARNING: notes appends below are NOT idempotent -- execute once only.
-- Execution note: the live run hit pooler connection saturation (53300) mid-burst; only the
-- 761 update landed from the first attempt, the rest were applied sequentially afterwards
-- with notes-NOT-LIKE guards. Final state verified: 6/6 appended exactly once.

-- 1) New verified official sources (pages fetched first-hand 2026-10-30).
INSERT INTO sources (id, url, title, domain, source_type, accessed_at, is_official, is_verified) VALUES
(3178, 'https://www.swinburne.edu.au/courses/scholarships/international-scholarships/', 'Swinburne University of Technology — Scholarships for International Students (George Swinburne Excellence 30%, automatic assessment)', 'www.swinburne.edu.au', 'scholarship', '2026-10-30', true, true),
(3179, 'https://scholarships.uq.edu.au/scholarship/uq-international-excellence-scholarship', 'The University of Queensland — UQ International Excellence Scholarship (25% per semester; competitive score among offer holders)', 'scholarships.uq.edu.au', 'scholarship', '2026-10-30', true, true),
(3180, 'https://www.sydney.edu.au/scholarships/e/vice-chancellor-international-scholarships-scheme.html', 'The University of Sydney — Vice-Chancellor''s International Scholarships Scheme (five tiers by ranking; no application required)', 'www.sydney.edu.au', 'scholarship', '2026-10-30', true, true);

-- 2) Fetched three (676 Swinburne, 774 UQ, 783 Sydney VCIS).
UPDATE scholarships SET min_gpa = NULL, min_ielts = NULL,
english_requirements = 'No scholarship-specific English score is published: English language requirements are those of the chosen course at admission (they vary by course), not of the scholarship.',
last_verified_at = '2026-10-30 02:30:00+05', last_updated_at = '2026-10-30 02:30:00+05',
notes = COALESCE(notes, '') || ' PASS 133 MICRO-REPAIR 2026-10-30: imported template minima removed (min_gpa/min_ielts NULLed) after a first-hand re-read of the university''s official scholarship page today (linked as a source in this pass). The page runs the award exactly as this record''s description already did — automatic assessment at admission on academic merit/competitive ranking among offer holders (UQ: satisfied program entry rank and a competitive score as determined by the University; Sydney VCIS: no application, unconditional offer by the round close date, five tiers by ranking; Swinburne George: automatically considered based on the grades of previous study) — and publishes no U.S.-scale GPA figure and no IELTS scholarship cutoff; English requirements sit in the course entry requirements and vary by course. The stored 3.0-3.85 / 6.0-7.0 figures were import-template values (the identical GPA/IELTS+ profile sentence sat on all six Australia family side rows). Reliability unchanged — record substance was already verified 2026-10-23; this pass only removed the contradicting structured fields.'
WHERE id IN (676, 774, 783) AND is_active;

-- 3) Own-text two (771 UNSW, 780 UTS): no last_verified bump (pages not re-read today).
UPDATE scholarships SET min_gpa = NULL, min_ielts = NULL,
english_requirements = 'No scholarship-specific English score is published: English language requirements are those of the chosen course at admission (they vary by course), not of the scholarship.',
last_updated_at = '2026-10-30 02:30:00+05',
notes = COALESCE(notes, '') || ' PASS 133 MICRO-REPAIR 2026-10-30: imported template minima removed (min_gpa/min_ielts NULLed) on this record''s own verified text, which describes automatic consideration on academic merit at admission without a separate scholarship application (UNSW 771: offered automatically on academic merit; UTS 780: eligibility assessed automatically at admission for most awards) — Australian universities publish no U.S.-scale GPA threshold or IELTS cutoff for these awards, and English requirements are set per course at admission. The structured 3.6-3.85 / 6.5-7.0 figures contradicted the records themselves and matched the identical template values stripped across the Australia family in this pass, three of which (Swinburne 676, UQ 774, Sydney 783) were re-fetched first-hand today and publish no such figures. Reliability and last_verified_at unchanged — this university''s own page was not re-read today.'
WHERE id IN (771, 780) AND is_active;

-- 4) 761 UTas: strip + re-scope queue flag (hub page rotated; no lv bump, no source minted).
UPDATE scholarships SET min_gpa = NULL, min_ielts = NULL,
english_requirements = 'No scholarship-specific English score is published: English language requirements are those of the chosen course at admission (they vary by course), not of the scholarship.',
last_updated_at = '2026-10-30 02:30:00+05',
notes = COALESCE(notes, '') || ' PASS 133 MICRO-REPAIR + QUEUE FLAG 2026-10-30: imported template minima removed (min_gpa 3.0 / min_ielts 6.0 NULLed) on this record''s own verified text (25% reduction awarded automatically at admission). FLAG for the next enrichment batch: when the University of Tasmania international-scholarships hub was re-read today it no longer listed a Tasmanian International Scholarship (TIS) at 25% — the automatically-assessed list now shows a Tasmanian Aurora Excellence Scholarship (50%), a Tasmanian International Merit Scholarship (30%), an International Alumni and Family Scholarship (25%) and a Tasmanian Access Scholarship (20%) — so this record needs a full re-scope (identify whether TIS was restructured into the new tiered schemes, renamed, or closed, and rewrite/retire or add the real successor scheme accordingly) before any other field is trusted. No source was minted for the rotated hub page in this pass and last_verified_at was deliberately NOT bumped (same handling as USM 776 in Pass 132, resolved in Batch 39).'
WHERE id = 761 AND is_active;

-- 5) Side-row template sentence strip (all 6 family rows matched).
UPDATE university_scholarships
SET eligibility_notes = regexp_replace(eligibility_notes, 'Typical academic profile: GPA [0-9.]+\+(, IELTS [0-9.]+\+)?\. ?', '', 'g'),
    last_verified_at = '2026-10-30 02:30:00+05'
WHERE scholarship_id IN (676,761,771,774,780,783)
  AND eligibility_notes ~ 'Typical academic profile:';

-- 6) Source links for the fetched three.
INSERT INTO scholarship_sources (id, scholarship_id, source_id, source_type, created_at) VALUES
(476, 676, 3178, 'official_scholarship', now()),
(477, 774, 3179, 'official_scholarship', now()),
(478, 783, 3180, 'official_scholarship', now());

-- 7) Sequence sync.
SELECT setval(pg_get_serial_sequence('sources','id'), (SELECT MAX(id) FROM sources), true);
SELECT setval(pg_get_serial_sequence('scholarship_sources','id'), (SELECT MAX(id) FROM scholarship_sources), true);
SELECT setval(pg_get_serial_sequence('scholarships','id'), (SELECT MAX(id) FROM scholarships), true);
SELECT setval(pg_get_serial_sequence('university_scholarships','id'), (SELECT MAX(id) FROM university_scholarships), true);
