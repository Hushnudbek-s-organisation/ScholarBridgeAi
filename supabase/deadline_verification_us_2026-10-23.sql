-- ============================================================================
--  Deadline verification pass 3 — United States (25 of 27) + Sweden (6)
--  Date: 2026-10-23   ·   Project: zkdguzbdopfedkffsatk
--
--  WHAT THIS DOES
--    The 27 US universities in the catalogue still carried only the generic
--    "Fall 2027 catalogue window (15 January)" placeholder written by
--    data/supabase_enrichment.sql. For 25 of them the university's own
--    admissions page publishes the Fall 2027 (2026-27 cycle) dates, so the
--    placeholder is replaced with the published Regular Decision date and the
--    row is promoted to 'verified'.
--
--  SCOPE / SAFETY RULES
--    * Only rows of the current cycle (academic_year '2026-2027') that are
--      still 'unverified' or 'estimated' are touched; anything already
--      verified is left alone.
--    * Rows without a program_id (university-level cycles) are covered by the
--      same statement: the NOT EXISTS programme filter is true for them.
--    * Graduate programmes (MS, MBA, MPA, PhD, Master …) have their own
--      deadlines and are NOT covered by the undergraduate date → skipped.
--    * Fine / performing-arts programmes (music, drama, theatre, dance, film,
--      design, architecture …) close earlier at several of these universities
--      (CMU Drama & Music 1 Dec, Rice Shepherd School of Music 1 Dec, USC
--      performing arts 1 Dec) → skipped and deliberately left unverified.
--    * Every touched row carries the URL of the page the date was read from
--      plus a note that says what was published (never a guess).
--
--  RESULT (executed 2026-10-23)
--    verified cycles   259 rows / 163 universities  →  678 rows / 194 universities
--    only-placeholder universities                     120  →   89
--    estimated rows                                    81   →   81 (unchanged)
--    expired rows (deadline before today)               0
--    (batch A: 21 universities, batch B: 4, Sweden: 6 national-round rows for
--     the 6 Swedish universities)
--
--  NOT VERIFIED HERE (2 of 27)
--    Penn State and Pittsburgh: their official pages could not be read in this
--    pass (404s / rolling admission pages that publish no fixed date). They
--    keep their placeholder and stay flagged 'unverified' — never shown as a
--    confirmed deadline and never counted down in the Deadline Center.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 1. Batch A — 21 universities whose deadlines page was read directly
-- ---------------------------------------------------------------------------
WITH deadline_source (university_id, deadline, opening_date, timezone, source_url, page_note) AS (
  VALUES
    (13,  DATE '2027-01-01', NULL::date,           'America/New_York',             'https://admission.princeton.edu/apply',                                                     'Princeton: regular decision due Jan. 1 (Early Action Nov. 1)'),
    (17,  DATE '2027-01-02', NULL::date,           'America/New_York',             'https://admissions.yale.edu/apply',                                                         'Yale: Regular Decision deadline January 2 (Single-Choice Early Action Nov. 1)'),
    (70,  DATE '2027-01-05', NULL::date,           'America/New_York',             'https://admission.brown.edu/first-year',                                                    'Brown: Regular Decision deadline January 5 (Early Decision Nov. 1)'),
    (14,  DATE '2027-01-02', NULL::date,           'America/New_York',             'https://admissions.cornell.edu/how-to-apply/first-year-applicants',                         'Cornell: Regular Decision application due January 2 (Early Decision Nov. 1)'),
    (11,  DATE '2027-01-05', NULL::date,           'America/New_York',             'https://admissions.upenn.edu/how-to-apply/first-year-applicants',                           'Penn: Regular Decision deadline January 5, 2027 (Early Decision Nov. 1, 2026)'),
    (62,  DATE '2027-01-04', NULL::date,           'America/New_York',             'https://admissions.duke.edu/apply/',                                                        'Duke: Regular Decision applications due January 4 (Early Decision Nov. 2)'),
    (31,  DATE '2027-01-02', NULL::date,           'America/New_York',             'https://apply.jhu.edu/how-to-apply/application-deadlines-requirements/',                    'Johns Hopkins: Regular Decision application deadline January 2, 2027 (ED I Nov. 1, 2026; ED II Jan. 2, 2027)'),
    (73,  DATE '2027-01-04', NULL::date,           'America/Chicago',              'https://admission.rice.edu/apply/first-year-international-applicants',                      'Rice: Regular Decision deadline Jan. 4 (Early Decision Nov. 1). Music applicants close Dec. 1'),
    (45,  DATE '2027-01-04', NULL::date,           'America/New_York',             'https://admission-pantheon.cmu.edu/admission/application-plans-deadlines',                  'Carnegie Mellon: Regular Decision deadline January 4 (Early Decision Nov. 2). Schools of Drama and Music close Dec. 1'),
    (12,  DATE '2027-01-04', NULL::date,           'America/Chicago',              'https://collegeadmissions.uchicago.edu/apply/application/',                                 'UChicago: Regular Decision application deadline Jan 4, 2027 (ED I / Early Action Nov 2, 2026; ED II Jan 4, 2027)'),
    (74,  DATE '2027-01-05', DATE '2026-09-01',    'America/Chicago',              'https://www.admissions.illinois.edu/first-year-dates/',                                     'Illinois (UIUC): Regular deadline Jan 5, Early Action Nov 1; application opens Sep 1'),
    (30,  DATE '2027-02-01', NULL::date,           'America/New_York',             'https://admissions.umich.edu/apply/first-year-applicants/requirements-deadlines',           'Michigan: Regular Decision application deadline Feb. 1 (Early Action and Early Decision Nov. 1)'),
    (59,  DATE '2027-01-10', NULL::date,           'America/Los_Angeles',          'https://admission.usc.edu/prospective-students/how-to-apply/first-year-students/',          'USC: Regular Decision Jan 10 for most majors (Early Action / Early Decision Nov 1). Performing arts majors close Dec 1'),
    (85,  DATE '2027-01-15', DATE '2026-08-01',    'America/Indiana/Indianapolis', 'https://admissions.purdue.edu/become-student/apply/',                                       'Purdue: Fall term application available Aug 1 - Jan 15'),
    (50,  DATE '2027-01-05', NULL::date,           'America/New_York',             'https://www.nyu.edu/admissions/undergraduate-admissions/how-to-apply/all-freshmen-applicants.html', 'NYU: Regular Decision January 5 (ED I Nov 1, ED II Jan 1); cut-off 11:59 pm in the applicant time zone'),
    (52,  DATE '2027-01-15', DATE '2026-08-01',    'America/Chicago',              'https://admissions.wisc.edu/deadlines/',                                                    'UW-Madison: Fall Regular Decision Jan 15 (Early Action Nov 1); applications open Aug 1'),
    (75,  DATE '2027-01-06', DATE '2026-08-01',    'America/New_York',             'https://admission.gatech.edu/first-year/deadlines',                                         'Georgia Tech: Regular Decision Jan 6 (Early Action 2 Nov 2 for non-Georgia/international applicants, Early Action 1 Oct 15); application opens Aug 1'),
    (83,  DATE '2027-01-05', NULL::date,           'America/New_York',             'https://www.bu.edu/admissions/apply/deadlines/',                                            'Boston University: Regular Admission application January 5 (Early Decision Nov 2, ED 2 Jan 5)'),
    (223, DATE '2027-01-15', NULL::date,           'America/New_York',             'https://admissions.unc.edu/apply/types-of-applications/first-year/',                        'UNC Chapel Hill: Regular Decision January 15 (Early Action Oct 15)'),
    (78,  DATE '2026-11-15', DATE '2026-08-15',    'America/Los_Angeles',          'https://admit.washington.edu/apply/first-year/',                                            'University of Washington: autumn-quarter first-year application deadline Nov 15; no early decision or early action; application opens Aug 15'),
    (79,  DATE '2026-12-01', DATE '2026-08-01',    'America/Chicago',              'https://admissions.utexas.edu/apply/freshman/',                                             'UT Austin: summer/fall regular deadline to apply Dec 1 (Early Action Oct 15); application opens Aug 1')
)
UPDATE application_cycles ac
SET deadline            = s.deadline,
    opening_date        = COALESCE(ac.opening_date, s.opening_date),
    deadline_type       = 'Regular Decision',
    application_type    = 'Regular Decision',
    intake              = 'Fall 2027',
    academic_year       = '2027-2028',
    cycle_year          = 2027,
    deadline_timezone   = s.timezone,
    source_url          = s.source_url,
    verification_status = 'verified',
    is_estimated        = false,
    is_verified         = true,
    is_active           = true,
    last_verified_at    = now() AT TIME ZONE 'UTC',
    notes               = 'Fall 2027 undergraduate Regular Decision deadline published on the official admissions page. '
                          || s.page_note
                          || ' (Verified 2026-10-23.) Graduate and fine/performing-arts programmes have separate deadlines and are not covered by this date.'
FROM deadline_source s
WHERE ac.university_id = s.university_id
  AND ac.academic_year = '2026-2027'
  AND ac.verification_status IN ('unverified', 'estimated')
  AND NOT EXISTS (
        SELECT 1
        FROM programs p
        WHERE p.id = ac.program_id
          AND (
                -- graduate programmes carry their own deadlines
                p.name ~* '(^| )(mba|mpa|mfa|mres|msc|meng|ms|ma|phd|dphil|masters?|doctoral?|graduate|postgraduate)( |$| in )'
                -- fine / performing-arts programmes close earlier
             OR p.name ~* '(music|drama|theat|danc|film|acting|opera|jazz|composition|conducting|animation|design|architecture|studio art|visual art|sculpture|painting|portfolio)'
          )
      );

-- ---------------------------------------------------------------------------
-- 2. Batch B — Columbia, ASU, UMass Amherst, Michigan State
-- ---------------------------------------------------------------------------
WITH deadline_source (university_id, deadline, opening_date, timezone, source_url, page_note) AS (
  VALUES
    (18,  DATE '2027-01-01', DATE '2026-08-01', 'America/New_York', 'https://undergrad.admissions.columbia.edu/apply',              'Columbia University: Regular Decision application January 1, 2027 (Early Decision Nov 1, 2026); application opens Aug 1'),
    (311, DATE '2027-01-15', DATE '2026-07-01', 'America/Phoenix',  'https://admission.asu.edu/apply/first-year/admission',         'Arizona State University: regular admission date Jan 15, 2027 (priority admission date Nov 1, 2026 for maximum scholarship consideration)'),
    (115, DATE '2027-01-15', DATE '2026-08-01', 'America/New_York', 'https://www.umass.edu/admissions/apply',                       'UMass Amherst: Regular Decision deadline January 15 (Early Action Nov 5); Common App opens Aug 1'),
    (305, DATE '2027-04-01', NULL::date,        'America/New_York', 'https://admissions.msu.edu/apply/first-year/dates-and-deadlines', 'Michigan State University: regular decision applications accepted until April 1 (priority Feb 1, decision by Mar 31); early action Nov 1')
)
UPDATE application_cycles ac
SET deadline            = s.deadline,
    opening_date        = COALESCE(ac.opening_date, s.opening_date),
    deadline_type       = 'Regular Decision',
    application_type    = 'Regular Decision',
    intake              = 'Fall 2027',
    academic_year       = '2027-2028',
    cycle_year          = 2027,
    deadline_timezone   = s.timezone,
    source_url          = s.source_url,
    verification_status = 'verified',
    is_estimated        = false,
    is_verified         = true,
    is_active           = true,
    last_verified_at    = now() AT TIME ZONE 'UTC',
    notes               = 'Fall 2027 undergraduate Regular Decision deadline published on the official admissions page. '
                          || s.page_note
                          || ' (Verified 2026-10-23.) Graduate and fine/performing-arts programmes have separate deadlines and are not covered by this date.'
FROM deadline_source s
WHERE ac.university_id = s.university_id
  AND ac.academic_year = '2026-2027'
  AND ac.verification_status IN ('unverified', 'estimated')
  AND NOT EXISTS (
        SELECT 1 FROM programs p
        WHERE p.id = ac.program_id
          AND (
                p.name ~* '(^| )(mba|mpa|mfa|mres|msc|meng|ms|ma|phd|dphil|masters?|doctoral?|graduate|postgraduate)( |$| in )'
             OR p.name ~* '(music|drama|theat|danc|film|acting|opera|jazz|composition|conducting|animation|design|architecture|studio art|visual art|sculpture|painting|portfolio)'
          )
      );

-- ---------------------------------------------------------------------------
-- 2c. Sweden — one national deadline for all six universities
--
--     The six Swedish universities are applied to through the joint national
--     system universityadmissions.se. Its "first admission round" is the round
--     international applicants use (it is the only round that carries the full
--     English-taught catalogue and leaves time for a residence permit):
--
--       16 Oct 2026  round opens
--       15 Jan 2027  application deadline (+ last day to rank)
--        1 Feb 2027  fee and supporting documents
--
--     Because the same national round also covers master's programmes, the
--     graduate exclusion of batches A/B is deliberately NOT applied here.
--     Chalmers (110), KTH (86), Lund (161), Stockholm (140), Gothenburg (136),
--     Uppsala (90).
-- ---------------------------------------------------------------------------
UPDATE application_cycles ac
SET deadline            = DATE '2027-01-15',
    opening_date        = DATE '2026-10-16',
    deadline_type       = 'First admission round (international)',
    application_type    = 'First admission round',
    intake              = 'Autumn 2027',
    academic_year       = '2027-2028',
    cycle_year          = 2027,
    deadline_timezone   = 'Europe/Stockholm',
    source_url          = 'https://www.universityadmissions.se/en/key-dates-and-deadlines/autumn-semester-dates/',
    verification_status = 'verified',
    is_estimated        = false,
    is_verified         = true,
    is_active           = true,
    last_verified_at    = now() AT TIME ZONE 'UTC',
    notes               = 'Sweden: national first admission round for autumn 2027 (the round international applicants use) — '
                          || 'opens 16 October 2026, application deadline 15 January 2027, fee and supporting documents due 1 February 2027, '
                          || 'master''s results 1 April, bachelor''s results 8 April. Published on universityadmissions.se, the joint national '
                          || 'application system used by this university. Individual programmes may set an earlier deadline. (Verified 2026-10-23.)'
WHERE ac.university_id IN (110, 86, 161, 140, 136, 90)
  AND ac.academic_year = '2026-2027'
  AND ac.verification_status IN ('unverified', 'estimated');

-- ---------------------------------------------------------------------------
-- 3. Register all 25 official pages as provenance sources
--    (sources + university_sources, source_type 'official', is_official/verified)
-- ---------------------------------------------------------------------------
WITH official (university_id, url, title) AS (
  VALUES
    (13,  'https://admission.princeton.edu/apply', 'Princeton University — Apply (first-year dates & deadlines)'),
    (17,  'https://admissions.yale.edu/apply', 'Yale University — Apply to Yale as a First-Year Student'),
    (70,  'https://admission.brown.edu/first-year', 'Brown University — First-Year Applicants (dates & deadlines)'),
    (14,  'https://admissions.cornell.edu/how-to-apply/first-year-applicants', 'Cornell University — First-Year Applicants: deadlines'),
    (11,  'https://admissions.upenn.edu/how-to-apply/first-year-applicants', 'University of Pennsylvania — First-Year Applicants'),
    (62,  'https://admissions.duke.edu/apply/', 'Duke University — Apply: dates, deadlines and checklist'),
    (31,  'https://apply.jhu.edu/how-to-apply/application-deadlines-requirements/', 'Johns Hopkins University — Application Deadlines & Requirements'),
    (73,  'https://admission.rice.edu/apply/first-year-international-applicants', 'Rice University — First-Year International Applicants'),
    (45,  'https://admission-pantheon.cmu.edu/admission/application-plans-deadlines', 'Carnegie Mellon University — Application Plans and Deadlines'),
    (12,  'https://collegeadmissions.uchicago.edu/apply/application/', 'University of Chicago — Application plans and deadlines'),
    (74,  'https://www.admissions.illinois.edu/first-year-dates/', 'University of Illinois Urbana-Champaign — First-Year Dates & Deadlines'),
    (30,  'https://admissions.umich.edu/apply/first-year-applicants/requirements-deadlines', 'University of Michigan — Requirements & Deadlines'),
    (59,  'https://admission.usc.edu/prospective-students/how-to-apply/first-year-students/', 'University of Southern California — First-Year Students: dates and deadlines'),
    (85,  'https://admissions.purdue.edu/become-student/apply/', 'Purdue University — Apply to Purdue (application dates)'),
    (50,  'https://www.nyu.edu/admissions/undergraduate-admissions/how-to-apply/all-freshmen-applicants.html', 'New York University — First-Year Applicants (key dates)'),
    (52,  'https://admissions.wisc.edu/deadlines/', 'University of Wisconsin–Madison — Deadlines and Decisions'),
    (75,  'https://admission.gatech.edu/first-year/deadlines', 'Georgia Institute of Technology — First-Year Application Plans and Deadlines'),
    (83,  'https://www.bu.edu/admissions/apply/deadlines/', 'Boston University — Important Deadlines'),
    (223, 'https://admissions.unc.edu/apply/types-of-applications/first-year/', 'University of North Carolina at Chapel Hill — First-Year Application'),
    (78,  'https://admit.washington.edu/apply/first-year/', 'University of Washington — First-year: key dates & deadlines'),
    (79,  'https://admissions.utexas.edu/apply/freshman/', 'University of Texas at Austin — Freshman: key admission dates'),
    (18,  'https://undergrad.admissions.columbia.edu/apply', 'Columbia University — How to Apply (Regular Decision January 1, 2027)'),
    (311, 'https://admission.asu.edu/apply/first-year/admission', 'Arizona State University — First-year admission requirements and fall 2027 deadlines'),
    (115, 'https://www.umass.edu/admissions/apply', 'UMass Amherst — Apply / Dates and Deadlines'),
    (305, 'https://admissions.msu.edu/apply/first-year/dates-and-deadlines', 'Michigan State University — First-year dates and deadlines'),
    (110, 'https://www.universityadmissions.se/en/key-dates-and-deadlines/autumn-semester-dates/', 'University Admissions Sweden — Autumn semester key dates (deadline 15 January 2027)'),
    (86,  'https://www.universityadmissions.se/en/key-dates-and-deadlines/autumn-semester-dates/', 'University Admissions Sweden — Autumn semester key dates (deadline 15 January 2027)'),
    (161, 'https://www.universityadmissions.se/en/key-dates-and-deadlines/autumn-semester-dates/', 'University Admissions Sweden — Autumn semester key dates (deadline 15 January 2027)'),
    (140, 'https://www.universityadmissions.se/en/key-dates-and-deadlines/autumn-semester-dates/', 'University Admissions Sweden — Autumn semester key dates (deadline 15 January 2027)'),
    (136, 'https://www.universityadmissions.se/en/key-dates-and-deadlines/autumn-semester-dates/', 'University Admissions Sweden — Autumn semester key dates (deadline 15 January 2027)'),
    (90,  'https://www.universityadmissions.se/en/key-dates-and-deadlines/autumn-semester-dates/', 'University Admissions Sweden — Autumn semester key dates (deadline 15 January 2027)')
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
-- 4. Result
-- ---------------------------------------------------------------------------
SELECT COUNT(*) FILTER (WHERE verification_status = 'verified')                       AS verified_rows,
       COUNT(DISTINCT university_id) FILTER (WHERE verification_status = 'verified')  AS verified_universities,
       COUNT(*) FILTER (WHERE verification_status = 'estimated')                      AS estimated_rows,
       COUNT(*) FILTER (WHERE verification_status = 'unverified')                     AS unverified_rows
FROM application_cycles;
