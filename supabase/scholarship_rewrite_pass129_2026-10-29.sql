-- Pass 129 (2026-10-29): three-part cleanup.
-- (1) Deutschlandstipendium family (17 rows): imported template minima stripped. BMFTR
--     programme page fetched first-hand (source 3158): EUR 300/month, awarded on academic
--     achievement + social commitment + personal circumstances, NO numeric GPA/IELTS cutoffs;
--     language is a degree-programme matter. min_gpa/min_ielts NULLed; bare-template
--     english_requirements normalised; side rows: "Typical academic profile..." sentence
--     regex-stripped (12 rows) + ProTalent 485 rewritten; links 434-450 to source 3158.
--     Reliability and last_verified_at deliberately unchanged (no host call re-read).
-- (2) USD conversions (5 rows: 570 EUR-figure copied as USD; 587/656 QAR; 610/908 SAR):
--     amount_usd_value -> 0 per convention (no published USD equivalents).
-- (3) Inactive hygiene: remaining 166 inactive rows normalised to application_status='closed'
--     with deadline_date cleared (all already carried documented retirement rationales;
--     Pass 128 had reduced no-rationale inactives to zero). Notes appends are replay-once.
-- Census at open: 544/205/1/205; rel<=8-with-minima 94 (83 after this pass; cleared family-wise,
-- never bulk - some minima are genuine, e.g. 603 MIS); expired-but-open 0.

-- 1) Source 3158
INSERT INTO sources (id, url, title, domain, source_type, accessed_at, is_official, is_verified) VALUES (3158, 'https://www.deutschlandstipendium.de/deutschlandstipendium/de/services/english/the-deutschlandstipendium-best-of-both-worlds-for-students.html', 'BMFTR (Federal Ministry) — The Deutschlandstipendium: what you need to know (English programme page: EUR 300/month, award criteria, no numeric cutoffs)', 'www.deutschlandstipendium.de', 'scholarship', '2026-10-29', true, true)
ON CONFLICT (url) DO NOTHING;

-- 2) Family minima strip (17 rows; notes append: replay once)
UPDATE scholarships SET min_gpa = NULL, min_ielts = NULL, english_requirements = CASE WHEN english_requirements ILIKE 'IELTS%' THEN 'No scholarship-specific English score: the Deutschlandstipendium is awarded by the university on academic achievement, social commitment and personal criteria; language requirements are those of the degree programme itself (German- or English-taught).' ELSE english_requirements END, last_updated_at = '2026-10-29 22:00:00+05', notes = COALESCE(notes, '') || ' PASS 129 MICRO-REPAIR 2026-10-29: imported template minima removed (min_gpa/min_ielts NULLed) across the Deutschlandstipendium family. The Federal Ministry''s programme page (source 3158, fetched 2026-10-29) sets no numeric GPA or IELTS cutoff: universities award the EUR 300/month scholarship on academic achievement together with social commitment and personal achievements/circumstances, and language requirements belong to the degree programme rather than the scholarship. The structured GPA/IELTS values were identical template figures across unrelated universities (import artefacts); any grade expectations of a specific programme stay programme-level. Reliability and last_verified_at unchanged — no host-university call was re-read today.' WHERE id IN (350,483,484,485,499,566,568,569,570,578,606,678,689,728,736,740,763) AND is_active;

-- 3) USD conversion clear (5 rows; notes append: replay once)
UPDATE scholarships SET amount_usd_value = 0, last_updated_at = '2026-10-29 22:00:00+05', notes = COALESCE(notes, '') || ' PASS 129 MICRO-REPAIR 2026-10-29: amount_usd_value cleared to 0 — it held an unpublished conversion of the ' || award_currency || ' award figure; per catalogue convention non-USD awards are recorded in their own currency only (award_amount/award_currency unchanged, no published USD equivalent exists).' WHERE id IN (570, 587, 610, 656, 908) AND is_active AND amount_usd_value > 0;

-- 4) Side rows: strip template profile sentence (12 rows) + ProTalent rewrite
UPDATE university_scholarships SET eligibility_notes = regexp_replace(eligibility_notes, 'Typical academic profile: GPA [0-9.]+\+(, IELTS [0-9.]+\+)?\. ?', '', 'g'), last_verified_at = '2026-10-29 22:00:00+05' WHERE scholarship_id IN (350,483,484,485,499,566,568,569,570,578,606,678,689,728,736,740,763) AND eligibility_notes ~ 'Typical academic profile:';
UPDATE university_scholarships SET eligibility_notes = 'Enrolled student at the University of Münster with strong academic results and social commitment; Deutschlandstipendium (ProTalent) applications go through the university. (Pass 129: the imported "GPA 3.3+ / IELTS 6.5+" profile claim was removed — the federal programme sets no numeric cutoffs.)', last_verified_at = '2026-10-29 22:00:00+05' WHERE scholarship_id = 485;

-- 5) Links 434-450 (family -> source 3158)
INSERT INTO scholarship_sources (id, scholarship_id, source_id, source_type, created_at) VALUES (434, 350, 3158, 'official_scholarship', now()), (435, 483, 3158, 'official_scholarship', now()), (436, 484, 3158, 'official_scholarship', now()), (437, 485, 3158, 'official_scholarship', now()), (438, 499, 3158, 'official_scholarship', now()), (439, 566, 3158, 'official_scholarship', now()), (440, 568, 3158, 'official_scholarship', now()), (441, 569, 3158, 'official_scholarship', now()), (442, 570, 3158, 'official_scholarship', now()), (443, 578, 3158, 'official_scholarship', now()), (444, 606, 3158, 'official_scholarship', now()), (445, 678, 3158, 'official_scholarship', now()), (446, 689, 3158, 'official_scholarship', now()), (447, 728, 3158, 'official_scholarship', now()), (448, 736, 3158, 'official_scholarship', now()), (449, 740, 3158, 'official_scholarship', now()), (450, 763, 3158, 'official_scholarship', now());

-- 6) Inactive hygiene: 166 rows -> closed (notes append: replay once)
UPDATE scholarships SET application_status = 'closed', deadline_date = NULL, last_updated_at = '2026-10-29 22:00:00+05', notes = COALESCE(notes, '') || ' PASS 129 hygiene 2026-10-29: application_status normalised to closed for this inactive record (any stored deadline_date cleared); the retirement rationale recorded above is unchanged.' WHERE NOT is_active AND application_status <> 'closed';

-- 7) Sequences
SELECT setval('sources_id_seq', (SELECT MAX(id) FROM sources)), setval('scholarship_sources_id_seq', (SELECT MAX(id) FROM scholarship_sources));
