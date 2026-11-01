-- Enrichment Batch 39 (2026-10-30): 776 USM Graduate Scholarship re-scope resolved —
-- award is alive (annual IPS call, 2026 round closed 1 Sep 2026); min_gpa restored to the
-- first-hand verified 3.33; rel 8->9. USMCARE assessed, not added (no recurrence evidence).
-- CTU probed again: still unavailable, no writes. REPLAY WARNING: notes append NOT idempotent.

-- 1) Verified official source (2026 announcement fetched first-hand 2026-10-30 on a USM domain).
INSERT INTO sources (id, url, title, domain, source_type, accessed_at, is_official, is_verified) VALUES
(3177, 'https://indtech.usm.my/index.php/info-gateway/in-the-news/1361-usm-graduate-scholarship-2026', 'USM Graduate Scholarship 2026 — IPS announcement (CGPA 3.33; WoS/SCOPUS/ERA publication; closing 1 September 2026)', 'indtech.usm.my', 'scholarship', '2026-10-30', true, true);

-- 2) 776: restore min_gpa 3.33; move source_url to the fetched announcement; add the fetched
--    supervisor condition to requirements; rel 9 (coverage sentence still rests on 2026-10-23 read).
UPDATE scholarships SET min_gpa = 3.33,
source_url = 'https://indtech.usm.my/index.php/info-gateway/in-the-news/1361-usm-graduate-scholarship-2026',
source_reliability = 9,
requirements = requirements || ' Your main supervisor must also qualify: either at least one active research grant as Principal Investigator with at least one year left to run at the application date, sufficient to support the research throughout the candidature, or at least two WoS, Scopus or ERA publications as corresponding author in the previous year.',
last_verified_at = '2026-10-30 02:00:00+05', last_updated_at = '2026-10-30 02:00:00+05',
notes = COALESCE(notes, '') || ' BATCH 39 RE-SCOPE 2026-10-30: the Pass 132 flag is resolved. The Graduate Scholarship is alive and annual — it is an Institute of Postgraduate Studies call whose 2026 round closed on 1 September 2026; it simply no longer appears on the rotated admission.usm.my financial-assistance page (which now lists the separate USMCARE, Graduate Horizon and PGRA schemes, as this record''s own text already noted). The official 2026 announcement was read first-hand today on a USM domain and linked as source 3177; it confirms this record''s text verbatim: full admission offer for a research-mode master''s or PhD and yet to register full-time; Malaysians at both levels, internationals at PhD only; CGPA at least 3.33 on both candidature routes (or a research-mode master''s for PhD); at least one WoS/SCOPUS/ERA published manuscript for PhD (exempted for fast-track); semester-basis award with the second-semester extension tied to submitting a WoS Q1/Q2 manuscript as first student author with the supervisor as co-author. min_gpa restored to 3.33 — Pass 132 removed the unsupported 3.2, and 3.33 is one official scale-unambiguous figure (Malaysian CGPA of 4.00) now confirmed first-hand, so the structured value is legitimate. The supervisor eligibility condition (active PI grant with at least a year left, or two previous-year corresponding-author WoS/SCOPUS/ERA publications) was added to requirements from the same page. source_url moved from the rotated admission page to the fetched announcement. Reliability 8 -> 9, not 10: the criteria, rounds and eligibility are fully re-verified today, but the fetched announcement text does not spell out the first/second-semester tuition coverage in words — that sentence still rests on the 2026-10-23 first-hand read. Status stays not_announced with no deadline_date: the 2026 round is closed and the next is announced by IPS. USMCARE was assessed as a candidate new record and deliberately NOT added: on the page read today its application is closed, eligibility is tied to already-registered Sem I/II 2025/2026 cohorts, and a single read gives no evidence of annual recurrence (revisit only if a future open round is fetched first-hand). CTU probed again today: still Service temporarily unavailable, no writes for 875/876.'
WHERE id = 776 AND is_active;

-- 3) Side row freshness sync (text was already accurate).
UPDATE university_scholarships SET last_verified_at = '2026-10-30 02:00:00+05'
WHERE id = 102 AND scholarship_id = 776;

-- 4) Source link.
INSERT INTO scholarship_sources (id, scholarship_id, source_id, source_type, created_at) VALUES
(475, 776, 3177, 'official_scholarship', now());

-- 5) Sequence sync.
SELECT setval(pg_get_serial_sequence('sources','id'), (SELECT MAX(id) FROM sources), true);
SELECT setval(pg_get_serial_sequence('scholarship_sources','id'), (SELECT MAX(id) FROM scholarship_sources), true);
SELECT setval(pg_get_serial_sequence('scholarships','id'), (SELECT MAX(id) FROM scholarships), true);
SELECT setval(pg_get_serial_sequence('university_scholarships','id'), (SELECT MAX(id) FROM university_scholarships), true);
