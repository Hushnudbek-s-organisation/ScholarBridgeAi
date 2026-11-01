-- Pass 132 (2026-10-30): Malaysia family CGPA-minima verification — corrections where the
-- official figure is single and scale-unambiguous (603 MIS, 811 IIUM), NULLs elsewhere.
-- REPLAY WARNING: notes appends below are NOT idempotent -- execute once only.

-- 1) New verified official sources (pages/PDF fetched first-hand 2026-10-30).
INSERT INTO sources (id, url, title, domain, source_type, accessed_at, is_official, is_verified) VALUES
(3173, 'https://biasiswa.mohe.gov.my/INTER/', 'MOHE Malaysia — Malaysia International Scholarship (MIS) portal', 'biasiswa.mohe.gov.my', 'scholarship', '2026-10-30', true, true),
(3174, 'https://biasiswa.mohe.gov.my/INTER/doc/MIS/Guidelines%20MIS%202026.pdf', 'MOHE Malaysia — Guidelines for the Application of Malaysia International Scholarship (MIS) 2026 (CGPA 3.00; IELTS 6.0/TOEFL PBT 550/English-medium)', 'biasiswa.mohe.gov.my', 'scholarship', '2026-10-30', true, true),
(3175, 'https://centre.iium.edu.my/cps/scholarship/', 'IIUM Centre for Postgraduate Studies — Financial Assistantship & Scholarship (PG Ummatic: CGPA 3.70; IELTS 6.5/TOEFL iBT 73-93/IIUM graduate)', 'centre.iium.edu.my', 'scholarship', '2026-10-30', true, true),
(3176, 'https://admission.utm.my/scholarship-and-financial-aid/', 'UTM Admission — Scholarship and Financial Aid (International Doctoral Fellowship RM 2,000; no CGPA threshold)', 'admission.utm.my', 'scholarship', '2026-10-30', true, true);

-- 2) 603 MIS: min_gpa corrected 3.4 -> 3.00 (official guidelines); min_ielts NULLed (3 routes);
--    eng text replaced with the guidelines' wording; source_url moved to the MOHE portal.
UPDATE scholarships SET min_gpa = 3.0, min_ielts = NULL,
english_requirements = 'Per the official MIS 2026 guidelines: IELTS band 6.0 or higher, or a TOEFL paper-based score of 550 or higher (or equivalent score in other TOEFL tests), or a previous degree with English as the medium of instruction (evidenced by an official declaration from the university).',
source_url = 'https://biasiswa.mohe.gov.my/INTER/',
last_verified_at = '2026-10-30 01:20:00+05', last_updated_at = '2026-10-30 01:20:00+05',
notes = COALESCE(notes, '') || ' PASS 132 MICRO-REPAIR 2026-10-30: minima corrected against the official MIS 2026 guidelines PDF and the MOHE INTER portal, both read first-hand today and linked as sources 3173-3174. min_gpa corrected 3.4 -> 3.00: the guidelines require CGPA 3.00 / 2nd Class Upper (Honours) or higher for master''s applicants and CGPA 3.00 / excellent results for PhD applicants — exactly what this record''s requirements field already said; the stored 3.4 came from the import "13-country Top-10 guide" still named on the side row. min_ielts NULLed and the slash text ("IELTS 6.0 / TOEFL 75 / DET 105", figures that appear nowhere in the official text) replaced with the guidelines'' three English routes: IELTS band 6.0 or higher, TOEFL PBT 550 or higher (or equivalent), or a previous English-medium degree with official declaration. Uzbekistan confirmed on the MIS 2026 recipient-country list verbatim. source_url moved from studymalaysia.com to the official MOHE portal (website/application URLs already pointed there). The import-template side row was rewritten in the same pass. Reliability unchanged.'
WHERE id = 603 AND is_active;

-- 3) 811 IIUM: min_gpa corrected 3.0 -> 3.7 (CPS page verbatim); min_ielts NULLed (3 routes).
UPDATE scholarships SET min_gpa = 3.7, min_ielts = NULL,
english_requirements = 'Set by the scholarship itself: IELTS at least 6.5, or TOEFL internet-based 73-93, or prior graduation from IIUM.',
last_verified_at = '2026-10-30 01:20:00+05', last_updated_at = '2026-10-30 01:20:00+05',
notes = COALESCE(notes, '') || ' PASS 132 MICRO-REPAIR 2026-10-30: minima corrected against IIUM''s Centre for Postgraduate Studies scholarship page re-read first-hand today (source 3175). The page states verbatim: minimum CGPA of 3.70 (or equivalent) in the bachelor''s degree AND the master''s qualification — exactly what this record''s requirements field already said — so min_gpa is corrected 3.0 -> 3.7; the stored 3.0 was the undergraduate Ummatic threshold (Muslim-minority band) bleeding into this postgraduate record. min_ielts NULLed and the English text normalised to the page''s three routes: IELTS at least 6.5 OR TOEFL internet-based 73-93 OR prior graduation from IIUM (a single structured IELTS figure misrepresents that route). Reliability unchanged.'
WHERE id = 811 AND is_active;

-- 4) 805 UTM: min_gpa NULLed (status-based criteria only on the fetched page).
UPDATE scholarships SET min_gpa = NULL,
last_verified_at = '2026-10-30 01:20:00+05', last_updated_at = '2026-10-30 01:20:00+05',
notes = COALESCE(notes, '') || ' PASS 132 MICRO-REPAIR 2026-10-30: min_gpa 3.1 removed (NULLed) after a first-hand re-read of UTM''s scholarship and financial aid page (source 3176). The page''s International Doctoral Fellowship criteria are status-based — active international PhD student in semesters 1-6, not working or receiving other financial aid, publications/track record given priority, Malaysian bank account — and publish no CGPA threshold; the stored 3.1 appeared nowhere on the page and contradicted this record''s own status-based description. Reliability unchanged.'
WHERE id = 805 AND is_active;

-- 5) Own-text three (677 Taylor's, 703 UCSI, 842 Sunway): tiered multi-scale tables.
UPDATE scholarships SET min_gpa = NULL, last_updated_at = '2026-10-30 01:20:00+05',
notes = COALESCE(notes, '') || ' PASS 132 MICRO-REPAIR 2026-10-30: structured min_gpa 3.0 removed (NULLed) on this record''s own verified text, which describes a waiver scaled in published tiers across several qualification scales (Taylor''s 677: entry-result bands of about CGPA 3.30 and 3.70 with A-Level/AUSMAT/IB/foundation mappings; UCSI 703: fixed ringgit waivers tiered by the qualification presented; Sunway 842: fixed sums keyed to STPM/A-Level/ATAR/UEC/IB/foundation results with renewal thresholds of CGPA 3.25 and 3.45) — no single 3.0 cutoff exists in any of the three schemes, and a lone structured figure misrepresents a multi-scale tier table. Three sibling Malaysia records were re-fetched first-hand today (MIS 603, IIUM 811, UTM 805). English text (already programme/admission-level) unchanged. Reliability and last_verified_at unchanged — this university''s own page was not re-read today.'
WHERE id IN (677, 703, 842) AND is_active;

-- 6) 776 USM: min_gpa NULLed + re-scope queue flag (page rotated; no lv bump, no source minted).
UPDATE scholarships SET min_gpa = NULL, last_updated_at = '2026-10-30 01:20:00+05',
notes = COALESCE(notes, '') || ' PASS 132 MICRO-REPAIR + QUEUE FLAG 2026-10-30: min_gpa 3.2 removed (NULLed): it matches neither this record''s own 2026-10-23 verified notes (CGPA 3.33 plus a WoS/Scopus/ERA publication) nor the USM postgraduate financial-assistance page as re-read today. FLAG for the next enrichment batch: the page has rotated — it now lists the USMCARE Scholarship, the Graduate Horizon Scholarship and PGRA, and no longer carries the Graduate Scholarship this record describes, so the record needs a full re-scope (identify whether the named award is discontinued, renamed or moved) before any other field is trusted; no source was minted for the rotated page in this pass and last_verified_at was deliberately NOT bumped.'
WHERE id = 776 AND is_active;

-- 7) 603 side row rewritten (import-template cell with the "Top-10 guide" confession removed).
UPDATE university_scholarships
SET eligibility_notes = 'Malaysian government (MOHE) scholarship for full-time Master''s and PhD study at 24 listed universities; Uzbekistan is a named recipient country. Requires CGPA 3.00 / 2nd Class Upper or higher and English at IELTS 6.0, TOEFL PBT 550, or a prior English-medium degree. Tuition is paid directly to the university plus a living allowance of RM 1,500 per month. Applications run through the MOHE portal at biasiswa.mohe.gov.my/INTER/.',
    last_verified_at = '2026-10-30 01:20:00+05'
WHERE scholarship_id = 603;

-- 8) Source links for the fetched three records (603 gets both portal and guidelines PDF).
INSERT INTO scholarship_sources (id, scholarship_id, source_id, source_type, created_at) VALUES
(471, 603, 3173, 'official_scholarship', now()),
(472, 603, 3174, 'official_scholarship', now()),
(473, 811, 3175, 'official_scholarship', now()),
(474, 805, 3176, 'official_scholarship', now());

-- 9) Sequence sync.
SELECT setval(pg_get_serial_sequence('sources','id'), (SELECT MAX(id) FROM sources), true);
SELECT setval(pg_get_serial_sequence('scholarship_sources','id'), (SELECT MAX(id) FROM scholarship_sources), true);
SELECT setval(pg_get_serial_sequence('scholarships','id'), (SELECT MAX(id) FROM scholarships), true);
SELECT setval(pg_get_serial_sequence('university_scholarships','id'), (SELECT MAX(id) FROM university_scholarships), true);
