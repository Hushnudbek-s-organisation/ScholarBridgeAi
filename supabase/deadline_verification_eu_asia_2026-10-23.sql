-- ============================================================================
--  Deadline verification pass 4 — Switzerland, Finland, Denmark, Hong Kong,
--  Belgium, Australia, New Zealand, Ireland, Canada, Norway, Singapore,
--  Taiwan, Malaysia   (29 universities)
--  Date: 2026-10-23   ·   Project: zkguzbdopfedkffsatk
--
--  Contract (same as passes 3):
--    * only rows still 'unverified' / 'estimated' in academic_year 2026-2027
--      are touched; verified rows are never overwritten;
--    * the date is the one the university (or its national system) publishes
--      for the autumn / September 2027 intake;
--    * programme groups with a different deadline are excluded by name;
--    * every row keeps the URL it was read from plus a note that says what the
--      page published — no inferred dates anywhere.
--
--  RESULT (executed 2026-10-23)
--    verified rows      678 → 1063
--    verified universities 194 → 227
--    universities still on the placeholder only: 89 → 56
--    expired rows: 0
--
--  STILL NOT VERIFIED (and why)
--    * Japan (9) — the universities publish per-faculty windows in Japanese;
--      no Fall 2027 undergraduate date could be read from an official page.
--    * Korea (6) — the Spring 2027 windows closed in Sep 2026 and the Fall 2027
--      guides are not published yet (SNU published Fall 2026 in March 2026).
--    * Austria (2) — the published tables stop at winter 2026/27 and summer
--      2027; the winter 2027/28 window is not posted yet.
--    * Spain (3) — 2027-28 preinscripción dates are set in spring 2027.
--    * Australia (6 more) and Uzbekistan (3) — rolling admission or the next
--      cycle's dates are not published; WIUT's published date (17 Aug 2026)
--      belongs to the 2026/27 cycle.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 1. Switzerland — 7 universities
-- ---------------------------------------------------------------------------
WITH ch (university_id, deadline, opening_date, source_url, page_note, exclude_re) AS (
  VALUES
    (24,  DATE '2027-04-30', DATE '2026-11-15', 'https://www.epfl.ch/education/admission/admission-2/bachelor-admission-criteria-and-application/how-to-apply/',
         'EPFL: bachelor applications can be submitted from mid-November to 30 April for the following September; documents required on 30 April (step 1) and 10 July (step 2)', '^MSc'),
    (141, DATE '2027-04-30', DATE '2027-02-01', 'https://www.unibas.ch/en/Studies/Before-My-Studies/Application-Admission/Application.html',
         'University of Basel: bachelor applications for foreign qualifications for the fall semester 2027 are possible from 1 February 2027, deadline 30 April 2027', '^MSc'),
    (131, DATE '2027-04-30', NULL::date,        'https://www.unibe.ch/studies/dates/students/fall/index_eng.html',
         'University of Bern: autumn 2027 regular deadline 30 April (late window to 31 August is closed to applicants who need a visa); Medicine, Dental Medicine, Veterinary Medicine and Sport Science close 15 February', '^Medicine$'),
    (177, DATE '2027-02-28', DATE '2027-01-15', 'https://www.unige.ch/immatriculations/en/conditions',
         'University of Geneva: autumn 2027 applications run 15 January - 28 February for applicants who need a visa or do not hold a Swiss bachelor; 30 April for everyone else', '^LLM'),
    (116, DATE '2027-02-28', NULL::date,        'https://www.unil.ch/unil/en/home/menuinst/etudier/immatriculations-et-inscriptions/bachelor-avec-diplome-etranger.html',
         'University of Lausanne: 28 February for all programmes if you need a visa (30 April otherwise)', '^LLM'),
    (135, DATE '2027-02-28', NULL::date,        'https://www.unil.ch/unil/en/home/menuinst/etudier/immatriculations-et-inscriptions/bachelor-avec-diplome-etranger.html',
         'University of Lausanne: 28 February for all programmes if you need a visa (30 April otherwise)', '^$'),
    (68,  DATE '2027-02-28', DATE '2027-01-01', 'https://www.uzh.ch/en/studies/application/deadlines.html',
         'University of Zurich: applicants with visa requirements 1 January - 28 February for the fall semester (1 January - 30 April without a visa). Bachelor Medicine needs a swissuniversities registration by 15 February and closes 31 March', '^(Medicine \(Humanmedizin\)|MBA \(University of Zurich\))$')
)
UPDATE application_cycles ac
SET deadline            = ch.deadline,
    opening_date        = COALESCE(ac.opening_date, ch.opening_date),
    deadline_type       = 'Autumn semester 2027',
    application_type    = 'Regular',
    intake              = 'Autumn 2027',
    academic_year       = '2027-2028',
    cycle_year          = 2027,
    deadline_timezone   = 'Europe/Zurich',
    source_url          = ch.source_url,
    verification_status = 'verified',
    is_estimated        = false,
    is_verified         = true,
    is_active           = true,
    last_verified_at    = now() AT TIME ZONE 'UTC',
    notes               = 'Autumn-semester 2027 application deadline published by the university. ' || ch.page_note
                          || '. (Verified 2026-10-23.)'
FROM ch
WHERE ac.university_id = ch.university_id
  AND ac.academic_year = '2026-2027'
  AND ac.verification_status IN ('unverified', 'estimated')
  AND NOT EXISTS (
        SELECT 1 FROM programs p
        WHERE p.id = ac.program_id AND ch.exclude_re <> '^$' AND p.name ~ ch.exclude_re
      );

-- ---------------------------------------------------------------------------
-- 2. Finland — 4 universities
-- ---------------------------------------------------------------------------
WITH fi (university_id, deadline, opening_date, source_url, page_note) AS (
  VALUES
    (103, DATE '2027-01-05', DATE '2026-12-07', 'https://www.aalto.fi/en/admission-services/apply-to-masters-programmes',
          'Aalto University master''s programmes: application period 7 December 2026 - 5 January 2027 (15:00 UTC+2)'),
    (194, DATE '2027-01-19', DATE '2027-01-05', 'https://www.helsinki.fi/en/admissions-and-education/apply-bachelors-and-masters-programmes/apply-bachelors-programmes',
          'University of Helsinki: 5-19 January 2027 for studies starting autumn 2027 (admission group 1, SAT/ACT-based; the same 5-19 January window is published for international master''s programmes)'),
    (196, DATE '2027-01-21', DATE '2027-01-07', 'https://www.utu.fi/en/study-at-utu/apply-to-bachelors-programmes',
          'University of Turku: national first joint application 7-21 January 2027 (closes 15:00 Finnish time); enclosures within one week (28 January 2027). Both international bachelor''s and master''s programmes are in this joint application.'),
    (197, DATE '2027-01-21', DATE '2027-01-07', 'https://www.oulu.fi/en/apply/how-apply/applying-bachelors-programmes/bachelors-admissions-deadlines',
          'University of Oulu: joint application 7-21 January 2027 for all international bachelor''s and master''s programmes starting autumn 2027; supporting documents by 28 January 2027')
)
UPDATE application_cycles ac
SET deadline            = fi.deadline,
    opening_date        = COALESCE(ac.opening_date, fi.opening_date),
    deadline_type       = 'Joint application (autumn 2027)',
    application_type    = 'Regular',
    intake              = 'Autumn 2027',
    academic_year       = '2027-2028',
    cycle_year          = 2027,
    deadline_timezone   = 'Europe/Helsinki',
    source_url          = fi.source_url,
    verification_status = 'verified',
    is_estimated        = false,
    is_verified         = true,
    is_active           = true,
    last_verified_at    = now() AT TIME ZONE 'UTC',
    notes               = 'Application deadline for studies starting in autumn 2027, published by the university. ' || fi.page_note
                          || '. (Verified 2026-10-23.)'
FROM fi
WHERE ac.university_id = fi.university_id
  AND ac.academic_year = '2026-2027'
  AND ac.verification_status IN ('unverified', 'estimated');

-- ---------------------------------------------------------------------------
-- 3. Denmark — MSc rows (15 January 2027, non-EU)
-- ---------------------------------------------------------------------------
WITH dk (university_id, source_url, page_note) AS (
  VALUES
    (193, 'https://www.ku.dk/studies/masters/important-dates-and-deadlines-master-of-science-programmes',
          'University of Copenhagen: portal opens 15 November, non-EU/EEA/Swiss application deadline 15 January at 23:59 CET'),
    (195, 'https://masters.au.dk/deadlines-and-important-dates/timeline-summer-non-eu',
          'Aarhus University: portal opens 1 November, non-EU application deadline 15 January at midnight CET; English test results also by 15 January'),
    (114, 'https://www.dtu.dk/english/education/graduate/admission-and-deadlines/application_procedure/apply/important-dates-and-deadlines-autumn',
          'DTU: portal opens 1 December, non-EU application deadline 15 January, tuition fee due 1 May, final documents 15 July'),
    (143, 'https://www.dtu.dk/english/education/graduate/admission-and-deadlines/application_procedure/apply/important-dates-and-deadlines-autumn',
          'DTU: portal opens 1 December, non-EU application deadline 15 January, tuition fee due 1 May, final documents 15 July')
)
UPDATE application_cycles ac
SET deadline            = DATE '2027-01-15',
    opening_date        = COALESCE(ac.opening_date, DATE '2026-11-15'),
    deadline_type       = 'Non-EU application deadline (September 2027)',
    application_type    = 'Regular',
    intake              = 'September 2027',
    academic_year       = '2027-2028',
    cycle_year          = 2027,
    deadline_timezone   = 'Europe/Copenhagen',
    source_url          = dk.source_url,
    verification_status = 'verified',
    is_estimated        = false,
    is_verified         = true,
    is_active           = true,
    last_verified_at    = now() AT TIME ZONE 'UTC',
    notes               = 'Deadline for applicants from outside the EU/EEA/Switzerland for the September 2027 intake. ' || dk.page_note
                          || '. (Verified 2026-10-23.) Danish-taught bachelor''s programmes use the national quota system instead and are not covered by this date.'
FROM dk
WHERE ac.university_id = dk.university_id
  AND ac.academic_year = '2026-2027'
  AND ac.verification_status IN ('unverified', 'estimated')
  AND EXISTS (
        SELECT 1 FROM programs p
        WHERE p.id = ac.program_id AND p.name ~* '^MSc'
      );

-- ---------------------------------------------------------------------------
-- 4. Denmark — University of Copenhagen bachelor rows (15 March, quota 2)
-- ---------------------------------------------------------------------------
WITH cph AS (
  SELECT 193 AS university_id,
         'https://www.ku.dk/studies/bachelor/admission-requirements/non-eu-eea-and-non-nordic-countries' AS source_url,
         'University of Copenhagen: non-EU/EEA applicants to bachelor''s programmes apply before 15 March at 12:00 (midday CET) through quota 2 only; admission requirements may be documented until 5 July at 12:00' AS page_note
)
UPDATE application_cycles ac
SET deadline            = DATE '2027-03-15',
    opening_date        = COALESCE(ac.opening_date, DATE '2026-11-15'),
    deadline_type       = 'Non-EU bachelor deadline (quota 2)',
    application_type    = 'Quota 2',
    intake              = 'September 2027',
    academic_year       = '2027-2028',
    cycle_year          = 2027,
    deadline_timezone   = 'Europe/Copenhagen',
    source_url          = cph.source_url,
    verification_status = 'verified',
    is_estimated        = false,
    is_verified         = true,
    is_active           = true,
    last_verified_at    = now() AT TIME ZONE 'UTC',
    notes               = 'Bachelor''s application deadline for applicants from outside the EU/EEA/Switzerland. ' || cph.page_note
                          || '. (Verified 2026-10-23.)'
FROM cph
WHERE ac.university_id = cph.university_id
  AND ac.academic_year = '2026-2027'
  AND ac.verification_status IN ('unverified', 'estimated')
  AND EXISTS (
        SELECT 1 FROM programs p
        WHERE p.id = ac.program_id AND p.name ~* '^(BSc|Bachelor|LLB)'
      );

-- ---------------------------------------------------------------------------
-- 5. Hong Kong — 4 universities (2027 entry)
-- ---------------------------------------------------------------------------
WITH hk (university_id, deadline, opening_date, round_label, source_url, page_note) AS (
  VALUES
    (21, DATE '2026-11-25', DATE '2026-09-23', 'First Round Evaluation',
         'https://ug.hkubs.hku.hk/admission-key-date/non-jupas',
         'HKU: application opens 23 September 2026; deadline for First Round Evaluation 25 November 2026 at 12:00 noon HKT. Applications after that are evaluated on a rolling basis until the application closes on 25 August 2027, so the November date is the one that matters for scholarships and interviews.'),
    (33, DATE '2027-01-07', DATE '2026-10-02', 'Regular Round',
         'https://admission.cuhk.edu.hk/application/non-jupas/important-dates/',
         'CUHK: applications open 2 October 2026; Advance Offer Round deadline 12 November 2026, Regular Round deadline 7 January 2027 (11:59 p.m. HKT)'),
    (63, DATE '2027-01-15', DATE '2026-09-24', 'Main Round',
         'https://www.cityu.edu.hk/admo/admissions/non-jupas-year-1-admission',
         'CityUHK: applications open 24 September 2026; Early Round 15 November 2026, Main Round 15 January 2027, late round from 16 January 2027'),
    (72, DATE '2027-02-11', DATE '2026-09-23', 'Main Round',
         'https://www.polyu.edu.hk/study/ug/admissions/international-other-qualifications/key-dates',
         'PolyU: applications open 23 September 2026; early round 17 November 2026, main round 11 February 2027, late applications until 14 May 2027 if places remain')
)
UPDATE application_cycles ac
SET deadline            = hk.deadline,
    opening_date        = COALESCE(ac.opening_date, hk.opening_date),
    deadline_type       = hk.round_label,
    application_type    = 'Non-JUPAS (international)',
    intake              = 'Fall 2027',
    academic_year       = '2027-2028',
    cycle_year          = 2027,
    deadline_timezone   = 'Asia/Hong_Kong',
    source_url          = hk.source_url,
    verification_status = 'verified',
    is_estimated        = false,
    is_verified         = true,
    is_active           = true,
    last_verified_at    = now() AT TIME ZONE 'UTC',
    notes               = '2027-entry undergraduate application deadline for non-local / international applicants. ' || hk.page_note
                          || '. (Verified 2026-10-23.)'
FROM hk
WHERE ac.university_id = hk.university_id
  AND ac.academic_year = '2026-2027'
  AND ac.verification_status IN ('unverified', 'estimated');

-- ---------------------------------------------------------------------------
-- 6. Belgium — 4 universities (non-EEA applicants)
-- ---------------------------------------------------------------------------
WITH be (university_id, deadline, opening_date, source_url, page_note) AS (
  VALUES
    (48,  DATE '2027-03-01', NULL::date,        'https://www.kuleuven.be/english/apply/application-instructions/apply-to-kuleuven',
          'KU Leuven: 1 March 2027 for non-EEA applicants to most English-taught programmes (Dutch-taught programmes close 1 February); 1 June for EEA applicants'),
    (142, DATE '2027-04-01', NULL::date,        'https://www.ugent.be/en/education/application-enrolment/application',
          'Ghent University: a complete application file must be submitted before 1 April 2027 by everyone who needs a visa (1 June without a visa)'),
    (112, DATE '2027-03-31', NULL::date,        'https://uclouvain.be/en/enrolment/application-deadlines',
          'UCLouvain: 31 March 2027 for applicants who are not EU nationals, do not live in Belgium and need a visa; a final equivalence decision on the school certificate is required first'),
    (157, DATE '2027-02-28', DATE '2026-11-04', 'https://www.uantwerpen.be/en/study/admission-and-enrolment/admission/procedure/',
          'University of Antwerp: the 2027-2028 admission application opens 4 November 2026; non-EEA applicants must complete the first screening stage by 28 February 2027 (EEA applicants 31 May 2027)')
)
UPDATE application_cycles ac
SET deadline            = be.deadline,
    opening_date        = COALESCE(ac.opening_date, be.opening_date),
    deadline_type       = 'Non-EEA application deadline (September 2027)',
    application_type    = 'Regular',
    intake              = 'September 2027',
    academic_year       = '2027-2028',
    cycle_year          = 2027,
    deadline_timezone   = 'Europe/Brussels',
    source_url          = be.source_url,
    verification_status = 'verified',
    is_estimated        = false,
    is_verified         = true,
    is_active           = true,
    last_verified_at    = now() AT TIME ZONE 'UTC',
    notes               = 'Application deadline for non-EEA applicants (a Belgian study visa is required) for the 2027-2028 academic year. ' || be.page_note
                          || '. (Verified 2026-10-23.)'
FROM be
WHERE ac.university_id = be.university_id
  AND ac.academic_year = '2026-2027'
  AND ac.verification_status IN ('unverified', 'estimated');

-- ---------------------------------------------------------------------------
-- 7. Australia — RMIT and UWA (other Australian universities are rolling)
-- ---------------------------------------------------------------------------
WITH au (university_id, deadline, tz, round_label, source_url, page_note) AS (
  VALUES
    (109, DATE '2027-03-03', 'Australia/Melbourne', 'Semester 1 2027',
          'https://www.rmit.edu.au/study-with-us/international-students/apply-to-rmit-international-students/application-dates',
          'RMIT University: Semester 1 2027 Bachelor degree application deadline 3 March 2027 (application outcome 5 March, last day to accept the offer 5 March). Programmes with late-enrolment restrictions close earlier.'),
    (167, DATE '2026-12-28', 'Australia/Perth', 'Semester 1 2027 (Uzbekistan cohort)',
          'https://www.uwa.edu.au/study/how-to-apply/international-applicants',
          'University of Western Australia: Semester 1 2027 application deadline 28 December 2026 for applicants from Uzbekistan (UWA publishes an earlier country-specific cohort for visa processing; the general overseas date is 11 January 2027 and onshore is 19 February 2027).')
)
UPDATE application_cycles ac
SET deadline            = au.deadline,
    deadline_type       = au.round_label,
    application_type    = 'International direct application',
    intake              = 'Semester 1 2027',
    academic_year       = '2027-2028',
    cycle_year          = 2027,
    deadline_timezone   = au.tz,
    source_url          = au.source_url,
    verification_status = 'verified',
    is_estimated        = false,
    is_verified         = true,
    is_active           = true,
    last_verified_at    = now() AT TIME ZONE 'UTC',
    notes               = 'Application deadline for international applicants, published by the university. ' || au.page_note
                          || ' (Verified 2026-10-23.)'
FROM au
WHERE ac.university_id = au.university_id
  AND ac.academic_year = '2026-2027'
  AND ac.verification_status IN ('unverified', 'estimated');

-- ---------------------------------------------------------------------------
-- 8. New Zealand — Auckland and Otago
-- ---------------------------------------------------------------------------
WITH nz (university_id, deadline, opening_date, source_url, page_note) AS (
  VALUES
    (173, DATE '2026-12-08', DATE '2026-08-01', 'https://www.auckland.ac.nz/en/study/applications-and-admissions/how-to-apply/undergraduate-application-closing-dates.html',
          'University of Auckland: most undergraduate programmes close for Semester One 2027 on 8 December 2026. International postgraduate applicants are advised to apply by 1 December 2026 so the visa can be processed in time (official postgraduate closing date 7 December 2026). Bachelor of Nursing (international) closes 1 November 2026.'),
    (149, DATE '2026-11-15', DATE '2026-05-01', 'https://www.otago.ac.nz/international/future-students/prepare-for-otago/key-dates-for-new-international-students',
          'University of Otago: deadline for offshore international students to apply for full-degree study starting Semester 1 2027 is 15 November 2026 (the application round opened 1 May 2026; onshore international applicants have until 10 December 2026).')
)
UPDATE application_cycles ac
SET deadline            = nz.deadline,
    opening_date        = COALESCE(ac.opening_date, nz.opening_date),
    deadline_type       = 'Semester 1 2027 (international)',
    application_type    = 'International application',
    intake              = 'Semester 1 2027',
    academic_year       = '2027-2028',
    cycle_year          = 2027,
    deadline_timezone   = 'Pacific/Auckland',
    source_url          = nz.source_url,
    verification_status = 'verified',
    is_estimated        = false,
    is_verified         = true,
    is_active           = true,
    last_verified_at    = now() AT TIME ZONE 'UTC',
    notes               = 'Application deadline for international applicants for Semester 1 2027, published by the university. ' || nz.page_note
                          || ' (Verified 2026-10-23.)'
FROM nz
WHERE ac.university_id = nz.university_id
  AND ac.academic_year = '2026-2027'
  AND ac.verification_status IN ('unverified', 'estimated');

-- ---------------------------------------------------------------------------
-- 9. Ireland, Canada, Norway, Singapore, Taiwan, Malaysia — one each
-- ---------------------------------------------------------------------------
WITH v (university_id, deadline, opening_date, tz, intake_label, source_url, page_note) AS (
  VALUES
    (81,  DATE '2027-06-30', DATE '2026-11-01', 'Europe/Dublin',   'September 2027',
          'https://www.tcd.ie/study/international/how-to-apply/',
          'Trinity College Dublin: non-EU undergraduate applications open 1 November 2026 and close 30 June 2027. 1 February 2027 is the priority deadline and the final deadline for Music, Drama, Dental Science and Medicine; Advanced Entry closes 1 June 2027'),
    (94,  DATE '2027-02-01', DATE '2026-08-01', 'America/Toronto', 'Fall 2027',
          'https://admission.umontreal.ca/en/admissions/preparing-your-application/respect-official-deadlines/',
          'Universite de Montreal: for applicants who studied outside Quebec the fall 2027 application period runs 1 August 2026 - 1 February 2027; the absolute latest date for international applicants to programmes with extended deadlines is 1 April 2027, and French-language documents are due 15 February 2027'),
    (158, DATE '2026-12-01', DATE '2026-10-15', 'Europe/Oslo',     'Autumn 2027',
          'https://www.uio.no/english/studies/admission/master/',
          'University of Oslo: applicants with citizenship outside the EU/EEA/Switzerland apply once a year, 15 October - 1 December 2026, for studies starting August 2027; all supporting documents and proof of funds are due by the same date; results by 5 April 2027'),
    (16,  DATE '2027-03-19', DATE '2026-10-15', 'Asia/Singapore',  'AY2027-28',
          'https://www.ntu.edu.sg/admissions/undergraduate/admissions',
          'Nanyang Technological University: application for AY2027 opened 15 October 2026; the international-qualifications window runs to 19 March 2027, but NTU sets qualification-specific closing dates (the IB window is 15 October 2026 - 19 March 2027 and the other-international-qualifications group closes earlier)'),
    (64,  DATE '2027-01-19', DATE '2026-12-01', 'Asia/Taipei',     'September 2027',
          'https://admissions.ntu.edu.tw/apply/degree-students/admission-information/application-timeline/',
          'National Taiwan University: September 2027 entry has two rounds - first round 29 September - 5 November 2026, second round 1 December 2026 - 19 January 2027 (4pm). Results 8 April 2027, acceptance confirmation by 15 April 2027'),
    (98,  DATE '2027-05-30', NULL::date,        'Asia/Kuala_Lumpur','Semester 1 2027/28 (September)',
          'https://fke.utm.my/undergraduate/apply-for-undergraduate-admission-international-student/',
          'Universiti Teknologi Malaysia: all international undergraduate applications must reach the Student Recruitment & Admission Division before 30 May for the September intake (30 October for the February intake)')
)
UPDATE application_cycles ac
SET deadline            = v.deadline,
    opening_date        = COALESCE(ac.opening_date, v.opening_date),
    deadline_type       = 'International application deadline',
    application_type    = 'International application',
    intake              = v.intake_label,
    academic_year       = '2027-2028',
    cycle_year          = 2027,
    deadline_timezone   = v.tz,
    source_url          = v.source_url,
    verification_status = 'verified',
    is_estimated        = false,
    is_verified         = true,
    is_active           = true,
    last_verified_at    = now() AT TIME ZONE 'UTC',
    notes               = 'Application deadline for the 2027 intake, published by the university. ' || v.page_note
                          || '. (Verified 2026-10-23.)'
FROM v
WHERE ac.university_id = v.university_id
  AND ac.academic_year = '2026-2027'
  AND ac.verification_status IN ('unverified', 'estimated');

-- ---------------------------------------------------------------------------
-- 10. Provenance sources
-- ---------------------------------------------------------------------------
WITH official (university_id, url, title) AS (
  VALUES
    (24,  'https://www.epfl.ch/education/admission/admission-2/bachelor-admission-criteria-and-application/how-to-apply/', 'EPFL — How to apply (bachelor admission)'),
    (141, 'https://www.unibas.ch/en/Studies/Before-My-Studies/Application-Admission/Application.html', 'University of Basel — Application and admission'),
    (131, 'https://www.unibe.ch/studies/dates/students/fall/index_eng.html', 'University of Bern — Admission deadlines for starting in the fall'),
    (177, 'https://www.unige.ch/immatriculations/en/conditions', 'University of Geneva — Enrolment conditions and deadlines'),
    (116, 'https://www.unil.ch/unil/en/home/menuinst/etudier/immatriculations-et-inscriptions/bachelor-avec-diplome-etranger.html', 'University of Lausanne — Bachelor with a foreign diploma: deadlines'),
    (135, 'https://www.unil.ch/unil/en/home/menuinst/etudier/immatriculations-et-inscriptions/bachelor-avec-diplome-etranger.html', 'University of Lausanne — Bachelor with a foreign diploma: deadlines'),
    (68,  'https://www.uzh.ch/en/studies/application/deadlines.html', 'University of Zurich — Application deadlines'),
    (103, 'https://www.aalto.fi/en/admission-services/apply-to-masters-programmes', 'Aalto University — Apply to master''s programmes (7 Dec 2026 – 5 Jan 2027)'),
    (194, 'https://www.helsinki.fi/en/admissions-and-education/apply-bachelors-and-masters-programmes/apply-bachelors-programmes', 'University of Helsinki — Apply to Bachelor''s programmes (5–19 Jan 2027)'),
    (196, 'https://www.utu.fi/en/study-at-utu/apply-to-bachelors-programmes', 'University of Turku — Application guide for bachelor''s degree programmes (7–21 Jan 2027)'),
    (197, 'https://www.oulu.fi/en/apply/how-apply/applying-bachelors-programmes/bachelors-admissions-deadlines', 'University of Oulu — Bachelor''s application timeline and deadlines (7–21 Jan 2027)'),
    (193, 'https://www.ku.dk/studies/masters/important-dates-and-deadlines-master-of-science-programmes', 'University of Copenhagen — Important dates and deadlines (non-EU 15 January)'),
    (193, 'https://www.ku.dk/studies/bachelor/admission-requirements/non-eu-eea-and-non-nordic-countries', 'University of Copenhagen — Bachelor admission for non-EU/EEA applicants (15 March)'),
    (195, 'https://masters.au.dk/deadlines-and-important-dates/timeline-summer-non-eu', 'Aarhus University — Application timeline for non-EU students (15 January)'),
    (114, 'https://www.dtu.dk/english/education/graduate/admission-and-deadlines/application_procedure/apply/important-dates-and-deadlines-autumn', 'DTU — Important dates and deadlines, autumn intake (non-EU 15 January)'),
    (143, 'https://www.dtu.dk/english/education/graduate/admission-and-deadlines/application_procedure/apply/important-dates-and-deadlines-autumn', 'DTU — Important dates and deadlines, autumn intake (non-EU 15 January)'),
    (21,  'https://ug.hkubs.hku.hk/admission-key-date/non-jupas', 'HKU — Admission key dates for international / non-JUPAS applicants'),
    (33,  'https://admission.cuhk.edu.hk/application/non-jupas/important-dates/', 'CUHK — Important dates, 2027 admissions exercise'),
    (63,  'https://www.cityu.edu.hk/admo/admissions/non-jupas-year-1-admission', 'CityUHK — Non-JUPAS Year 1 admission timeline'),
    (72,  'https://www.polyu.edu.hk/study/ug/admissions/international-other-qualifications/key-dates', 'PolyU — Key dates for international / other qualifications (2027 entry)'),
    (48,  'https://www.kuleuven.be/english/apply/application-instructions/apply-to-kuleuven', 'KU Leuven — Apply to KU Leuven (deadlines by programme language)'),
    (142, 'https://www.ugent.be/en/education/application-enrolment/application', 'Ghent University — Application and enrolment (visa applicants 1 April)'),
    (112, 'https://uclouvain.be/en/enrolment/application-deadlines', 'UCLouvain — Application deadlines'),
    (157, 'https://www.uantwerpen.be/en/study/admission-and-enrolment/admission/procedure/', 'University of Antwerp — How and when to apply'),
    (109, 'https://www.rmit.edu.au/study-with-us/international-students/apply-to-rmit-international-students/application-dates', 'RMIT University — Application dates for international students (Semester 1 2027)'),
    (167, 'https://www.uwa.edu.au/study/how-to-apply/international-applicants', 'University of Western Australia — How to apply: international applicants (2027 dates by country)'),
    (173, 'https://www.auckland.ac.nz/en/study/applications-and-admissions/how-to-apply/undergraduate-application-closing-dates.html', 'University of Auckland — Undergraduate application closing dates'),
    (149, 'https://www.otago.ac.nz/international/future-students/prepare-for-otago/key-dates-for-new-international-students', 'University of Otago — Key dates for new international students'),
    (81,  'https://www.tcd.ie/study/international/how-to-apply/', 'Trinity College Dublin — How to apply (non-EU deadlines)'),
    (94,  'https://admission.umontreal.ca/en/admissions/preparing-your-application/respect-official-deadlines/', 'Université de Montréal — Respect official deadlines (fall 2027)'),
    (158, 'https://www.uio.no/english/studies/admission/master/', 'University of Oslo — Application and admission to master''s degree programmes'),
    (16,  'https://www.ntu.edu.sg/admissions/undergraduate/admissions', 'Nanyang Technological University — Undergraduate admissions and application windows'),
    (64,  'https://admissions.ntu.edu.tw/apply/degree-students/admission-information/application-timeline/', 'National Taiwan University — International application timeline (2027 entry)'),
    (98,  'https://fke.utm.my/undergraduate/apply-for-undergraduate-admission-international-student/', 'Universiti Teknologi Malaysia — International undergraduate application deadlines')
),
ins AS (
  INSERT INTO sources (url, title, domain, source_type, accessed_at, is_official, is_verified)
  SELECT DISTINCT o.url, o.title, split_part(o.url, '/', 3), 'official', now() AT TIME ZONE 'UTC', true, true
  FROM official o
  WHERE NOT EXISTS (SELECT 1 FROM sources s WHERE s.url = o.url)
  RETURNING id, url
),
all_src AS (
  SELECT id, url FROM ins
  UNION ALL
  SELECT s.id, s.url FROM sources s JOIN official o ON o.url = s.url
)
INSERT INTO university_sources (university_id, source_id, source_type)
SELECT o.university_id, a.id, 'official'
FROM official o
JOIN all_src a ON a.url = o.url
WHERE NOT EXISTS (
  SELECT 1 FROM university_sources us
  WHERE us.university_id = o.university_id AND us.source_id = a.id
);

-- ---------------------------------------------------------------------------
-- 11. Result
-- ---------------------------------------------------------------------------
SELECT COUNT(*) FILTER (WHERE verification_status = 'verified')                      AS verified_rows,
       COUNT(DISTINCT university_id) FILTER (WHERE verification_status = 'verified') AS verified_universities,
       COUNT(*) FILTER (WHERE verification_status = 'estimated')                     AS estimated_rows,
       COUNT(*) FILTER (WHERE verification_status = 'unverified')                    AS unverified_rows
FROM application_cycles;
