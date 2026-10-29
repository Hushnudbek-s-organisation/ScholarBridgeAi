-- Enrichment Batch 37 (2026-10-29): full first-hand uplifts of 552 CWRU (rel 9->10)
-- and 626 Michigan LSA (rel 8->10). REPLAY WARNING: notes appends are NOT idempotent.

-- 1) Verified official sources (all five pages fetched first-hand 2026-10-29).
INSERT INTO sources (id, url, title, domain, source_type, accessed_at, is_official, is_verified) VALUES
(3162, 'https://case.edu/financialaid/undergraduates/international-students', 'CWRU Financial Aid — International Students (limited need-based aid; CSS Profile code 1105)', 'case.edu', 'scholarship', '2026-10-29', true, true),
(3163, 'https://case.edu/admission/apply/international-applicants', 'CWRU Undergraduate Admission — International Applicants (English proficiency scores and waivers)', 'case.edu', 'scholarship', '2026-10-29', true, true),
(3164, 'https://case.edu/admission/apply/deadlines-and-requirements', 'CWRU Undergraduate Admission — Deadlines and Requirements (financial aid document deadlines)', 'case.edu', 'scholarship', '2026-10-29', true, true),
(3165, 'https://lsa.umich.edu/scholarships/prospective-students/international-students.html', 'U-M LSA Scholarships — International Student Scholarships (2027 deadline April 9; renewable four years)', 'lsa.umich.edu', 'scholarship', '2026-10-29', true, true),
(3166, 'https://finaid.umich.edu/apply-aid/international-students', 'University of Michigan Financial Aid — International Students (no federal aid; limited scholarship funding)', 'finaid.umich.edu', 'scholarship', '2026-10-29', true, true);

-- 2) 552 CWRU: transcribed admission English profile verified verbatim and kept (now framed
--    as admission-level); structured minima NULLed (no published GPA cutoff; four-test route);
--    merit flag added (record covers need pool + merit competitions); rel 10.
UPDATE scholarships SET min_gpa = NULL, min_ielts = NULL,
english_requirements = 'Undergraduate admission English proficiency (the aid programme itself sets no separate language score): Duolingo English Test 115, IELTS 7.0, PTE Academic 61, or TOEFL iBT 4.5 on the new scale for tests taken on or after 21 January 2026 (90 internet-based / 577 paper-based on the previous scale). The requirement is waived after two years at a school where the language of instruction is English, an SAT evidence-based reading and writing score of 630 or higher, or an ACT English score of 26 or higher.',
merit_based = true, source_reliability = 10,
last_verified_at = '2026-10-29 23:50:00+05', last_updated_at = '2026-10-29 23:50:00+05',
notes = COALESCE(notes, '') || ' BATCH 37 UPLIFT 2026-10-29 (deferred from Pass 130 triage): all three governing CWRU pages re-read first-hand today and linked as sources 3162-3164 — case.edu/financialaid (limited need-based aid for first-year and transfer international applicants; CSS Profile required, school code 1105), case.edu/admission international-applicants page (automatic scholarship evaluation plus essay-based Scholarship Competitions including full-tuition awards; USD 213 million institutional aid; more than 80 percent receive assistance) and the deadlines table (financial aid documents due 15 November, 22 January and 1 February — matching this record). The stored English-proficiency profile was confirmed verbatim (Duolingo 115, IELTS 7, PTE 61, TOEFL iBT 4.5 for tests on/after 21 January 2026, 90 internet-based / 577 paper-based before; waivers as listed) and kept, now explicitly framed as the admission requirement. Structured min_gpa 3.0 / min_ielts 7.0 NULLed: no GPA cutoff is published anywhere on these pages, and a single structured IELTS figure misrepresents a four-test-plus-waiver admission route. merit_based set true alongside financial_need_based because the record covers both the limited need-based pool and the merit scholarships/competitions; award_basis stays need_based. Reliability 9 -> 10 on the full first-hand re-read.'
WHERE id = 552 AND is_active;

-- 3) 626 Michigan LSA: template minima + bare English string removed; need flag added
--    (LSA: grades AND family need); coverage corrected to Partial Funding (cost of
--    attendance, not tuition only); rel 10.
UPDATE scholarships SET min_gpa = NULL, min_ielts = NULL,
english_requirements = 'No scholarship-specific English score is published: the LSA International Student Scholarship is applied for after admission to the College of LSA, so English proficiency is governed by University of Michigan admission requirements, not by the scholarship.',
financial_need_based = true, coverage_type = 'Partial Funding', source_reliability = 10,
last_verified_at = '2026-10-29 23:50:00+05', last_updated_at = '2026-10-29 23:50:00+05',
notes = COALESCE(notes, '') || ' BATCH 37 UPLIFT 2026-10-29: both governing pages read first-hand today in full and linked as sources 3165-3166. The LSA Scholarships page states: awarded to newly admitted international students in the College of LSA, based on the LSA application, student grades and whether the family needs financial assistance; helps cover the cost of attendance for Fall and Winter terms; the amount varies with cost of attendance and available funding; renewable for four consecutive years (two for transfers) and renewed automatically before each fall semester if requirements continue to be met; eligibility = prospective international first-year or transfer student accepted into an LSA degree programme for the Fall term, enrolling full-time (at least 12 credit hours per term), not a U.S. citizen or permanent resident; the 2027 application deadline is April 9, 11:59 pm EST, with notices by April 16 and the LSA enrollment deadline May 1 — confirming this record''s stored 2027-04-09. finaid.umich.edu confirms the wider frame (no federal aid, limited scholarship funding, proof of resources required). Template minima removed (min_gpa 3.6 / min_ielts 7.5 NULLed; the bare "IELTS 7.5 or equivalent English test" text replaced) — no such figures appear on either page. financial_need_based set true alongside merit_based because LSA states awards consider both grades and family need; coverage_type corrected Partial Tuition -> Partial Funding because the page says the scholarship helps cover the (full) cost of attendance, not tuition only. The stale university_scholarships side row (old invented name Michigan Merit Awards with the GPA 3.6+ / IELTS 7.5+ / SAT 1500+ template profile) was rewritten to the fetched facts in the same batch. Reliability 8 -> 10.'
WHERE id = 626 AND is_active;

-- 4) Stale side row for 626 rewritten (old invented name + template profile removed).
UPDATE university_scholarships
SET scholarship_name = 'LSA International Student Scholarship (Michigan)',
    eligibility_notes = 'For newly admitted international first-year or transfer students accepted into a College of LSA degree programme for the Fall term, enrolling full-time (at least 12 credit hours per term); U.S. citizens and permanent residents are not eligible. Awarded on the LSA application, grades and family financial need; the amount varies and helps cover the cost of attendance for Fall and Winter terms; renewable up to four consecutive years (two for transfers). Applications open after admission; the 2027 deadline is April 9, 11:59 pm EST.',
    last_verified_at = '2026-10-29 23:50:00+05'
WHERE id = 29 AND scholarship_id = 626;

-- 5) Source links.
INSERT INTO scholarship_sources (id, scholarship_id, source_id, source_type, created_at) VALUES
(460, 552, 3162, 'official_scholarship', now()),
(461, 552, 3163, 'official_scholarship', now()),
(462, 552, 3164, 'official_scholarship', now()),
(463, 626, 3165, 'official_scholarship', now()),
(464, 626, 3166, 'official_scholarship', now());

-- 6) Sequence sync.
SELECT setval(pg_get_serial_sequence('sources','id'), (SELECT MAX(id) FROM sources), true);
SELECT setval(pg_get_serial_sequence('scholarship_sources','id'), (SELECT MAX(id) FROM scholarship_sources), true);
SELECT setval(pg_get_serial_sequence('scholarships','id'), (SELECT MAX(id) FROM scholarships), true);
SELECT setval(pg_get_serial_sequence('university_scholarships','id'), (SELECT MAX(id) FROM university_scholarships), true);
