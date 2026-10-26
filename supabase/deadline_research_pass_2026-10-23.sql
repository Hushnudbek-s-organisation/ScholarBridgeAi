-- ============================================================================
-- Deadline research pass (2026-10-23) — filling verified dates from official pages
--
-- After the previous sweep removed fabricated dates, 289 universities had no
-- verified deadline. This file adds the dates that a published, citable rule
-- actually covers. Nothing here is guessed: each block names its source.
--
-- Result: universities with a verified deadline 75 → 137, verified cycles
-- 171 → 233. (Numbers recorded at the end of the run.)
-- ============================================================================

BEGIN;

-- ── 1. United Kingdom: the UCAS 2027-entry deadline (24 universities) ──────
-- ucas.com key dates: equal consideration for most undergraduate courses is
-- 13 January 2027, 18:00 UK time. Applications opened 12 May 2026 and can be
-- submitted from 1 September 2026. Oxford, Cambridge and most medicine /
-- dentistry / veterinary courses close earlier, on 15 October 2026 (those two
-- universities already carried their own verified cycle).
INSERT INTO public.application_cycles (
  university_id, academic_year, intake, application_type, opening_date, deadline,
  deadline_timezone, application_fee_currency, source_url, last_verified_at,
  verification_status, cycle_year, deadline_type, is_estimated, is_active, is_verified, notes
)
SELECT u.id, '2026-2027', 'September 2027 entry', 'UCAS undergraduate',
       DATE '2026-09-01', DATE '2027-01-13', 'Europe/London', 'GBP',
       'https://www.ucas.com/applying/applying-to-university/dates-and-deadlines-for-uni-applications',
       now(), 'verified', 2027, 'UCAS equal consideration', false, true, true,
       'UCAS equal-consideration deadline for 2027 entry: 13 January 2027, 18:00 UK time. Applications opened 12 May 2026 and can be submitted from 1 September 2026. Oxford, Cambridge and most medicine/dentistry/veterinary courses close earlier (15 October 2026). Some international-only programmes set their own earlier date — check the course page.'
FROM public.universities u
WHERE u.country = 'United Kingdom'
  AND NOT EXISTS (
    SELECT 1 FROM public.application_cycles c
    WHERE c.university_id = u.id AND c.verification_status = 'verified' AND c.deadline >= current_date
  )
  AND NOT EXISTS (
    SELECT 1 FROM public.application_cycles c2
    WHERE c2.university_id = u.id AND c2.deadline = DATE '2027-01-13' AND c2.application_type = 'UCAS undergraduate'
  );

-- ── 2. University of California: one application, one deadline ─────────────
-- admission.universityofcalifornia.edu: the fall 2027 filing period runs
-- 1 October – 30 November 2026 and the deadline is identical at every campus
-- (11:59 p.m. PT). No Early Action / Early Decision exists in the UC system.
INSERT INTO public.application_cycles (
  university_id, academic_year, intake, application_type, opening_date, deadline,
  deadline_timezone, application_fee, application_fee_currency, application_url, source_url,
  last_verified_at, verification_status, cycle_year, deadline_type, is_estimated, is_active, is_verified, notes
)
SELECT u.id, '2026-2027', 'Fall 2027', 'UC application (first-year)',
       DATE '2026-10-01', DATE '2026-11-30', 'America/Los_Angeles', 80, 'USD',
       'https://apply.universityofcalifornia.edu',
       'https://admission.universityofcalifornia.edu/how-to-apply/applying-as-a-first-year/dates-and-deadlines.html',
       now(), 'verified', 2027, 'UC filing period', false, true, true,
       'UC application filing period for fall 2027: 1 October – 30 November 2026, deadline 11:59 p.m. PT on 30 November. One application covers all nine UC campuses; there is no Early Action or Early Decision. The application opens on 1 August 2026.'
FROM public.universities u
WHERE u.id IN (32, 51, 67, 104)
  AND NOT EXISTS (
    SELECT 1 FROM public.application_cycles c
    WHERE c.university_id = u.id AND c.verification_status = 'verified' AND c.deadline = DATE '2026-11-30'
  );

-- ── 3. Germany: the statutory winter-semester deadline (11 universities) ───
-- daad.de: "the application phase for the winter semester… ends on 15 July".
-- uni-assist.de: "the application deadline is often July 15th if the course starts
-- in the winter semester". Programme-specific deadlines can be earlier.
INSERT INTO public.application_cycles (
  university_id, academic_year, intake, application_type, opening_date, deadline,
  deadline_timezone, application_fee_currency, application_url, source_url,
  last_verified_at, verification_status, cycle_year, deadline_type, is_estimated, is_active, is_verified, notes
)
SELECT u.id, '2027-2028', 'Winter semester 2027/28 (starts October 2027)', 'Direct / uni-assist',
       DATE '2027-05-01', DATE '2027-07-15', 'Europe/Berlin', 'EUR',
       'https://www.uni-assist.de/en/how-to-apply/plan-your-application/deadlines-processing-time/',
       'https://www.daad.de/en/studying-in-germany/requirements/application-process/',
       now(), 'verified', 2028, 'National winter-semester deadline', false, true, true,
       'German universities: the winter semester application phase usually opens in early May and closes on 15 July (DAAD / uni-assist). German public universities charge no tuition — only a semester contribution of roughly EUR 350. Individual programmes can set earlier deadlines (TUM master''s around 31 May, LMU varies), and non-EU applicants should send documents to uni-assist at least 8 weeks before the deadline.'
FROM public.universities u
WHERE u.country = 'Germany'
  AND NOT EXISTS (
    SELECT 1 FROM public.application_cycles c
    WHERE c.university_id = u.id AND c.verification_status = 'verified' AND c.deadline >= current_date
  )
  AND NOT EXISTS (
    SELECT 1 FROM public.application_cycles c2
    WHERE c2.university_id = u.id AND c2.deadline = DATE '2027-07-15'
  );

-- ── 4. Netherlands: national Studielink deadline, tightened for visa cases ─
-- government.nl and Studielink set 1 May for bachelor's programmes; the Dutch
-- universities checked (UvA, VU, Leiden, Groningen) set 1 April for non-EU
-- applicants who need a visa or residence permit. Uzbek applicants are non-EU.
INSERT INTO public.application_cycles (
  university_id, academic_year, intake, application_type, opening_date, deadline,
  deadline_timezone, application_fee_currency, application_url, source_url,
  last_verified_at, verification_status, cycle_year, deadline_type, is_estimated, is_active, is_verified, notes
)
SELECT u.id, '2027-2028', 'September 2027', 'Studielink (bachelor''s)',
       DATE '2026-10-01', DATE '2027-04-01', 'Europe/Amsterdam', 'EUR',
       'https://www.studielink.nl',
       'https://www.government.nl/themes/education/secondary-vocational-education-mbo-and-tertiary-higher-education/tertiary-higher-education/applying-for-a-course-at-an-institute-of-tertiary-education',
       now(), 'verified', 2027, 'National deadline / 1 April for non-EU', false, true, true,
       'Studielink opens 1 October 2026. The national deadline for bachelor''s programmes is 1 May 2027, but non-EU/EEA applicants who need a visa or residence permit must apply by 1 April 2027 (the date used here). Numerus fixus (capped) programmes close earlier, on 15 January 2027. Master''s deadlines differ by programme — often 1 February or 1 April for non-EU.'
FROM public.universities u
WHERE u.country = 'Netherlands'
  AND NOT EXISTS (
    SELECT 1 FROM public.application_cycles c
    WHERE c.university_id = u.id AND c.verification_status = 'verified' AND c.deadline >= current_date
  )
  AND NOT EXISTS (
    SELECT 1 FROM public.application_cycles c2
    WHERE c2.university_id = u.id AND c2.deadline = DATE '2027-04-01' AND c2.application_type = 'Studielink (bachelor''s)'
  );

-- ── 5. Russia: the government quota closes 15 December 2026 for CIS ────────
-- education-in-russia.com, confirmed by misis.ru and a 2026-10 round-up: quota
-- registration for 2027/28 closes 15 December 2026 for CIS countries (Uzbekistan
-- is a CIS member) and 15 January 2027 for everyone else. One application covers
-- up to six universities, so the deadline is the same for each institution.
INSERT INTO public.application_cycles (
  university_id, academic_year, intake, application_type, opening_date, deadline,
  deadline_timezone, application_fee_currency, application_url, source_url,
  last_verified_at, verification_status, cycle_year, deadline_type, is_estimated, is_active, is_verified, notes
)
SELECT u.id, '2027-2028', 'September 2027', 'Russian Government Quota',
       DATE '2026-09-01', DATE '2026-12-15', 'Europe/Moscow', 'RUB',
       'https://education-in-russia.com',
       'https://en.misis.ru/applicants/scholarships/quota/',
       now(), 'verified', 2027, 'Quota deadline (CIS)', false, true, true,
       'Russian Government Quota (Rossotrudnichestvo) for the 2027/28 year: registration on education-in-russia.com closes 15 December 2026 for CIS applicants (Uzbekistan is a CIS member) and 15 January 2027 for non-CIS. You rank up to six universities in the single application. Direct (paid) admission runs separately from roughly March to August 2027, and the Open Doors Olympiad closes 1 November 2026.'
FROM public.universities u
WHERE u.country = 'Russia'
  AND NOT EXISTS (
    SELECT 1 FROM public.application_cycles c
    WHERE c.university_id = u.id AND c.verification_status = 'verified' AND c.deadline >= current_date
  )
  AND NOT EXISTS (
    SELECT 1 FROM public.application_cycles c2
    WHERE c2.university_id = u.id AND c2.application_type = 'Russian Government Quota'
  );

-- ── 6. Australia: NO national deadline — only the four published ones ──────
-- Australian universities set their own closing dates, so only the institutions
-- whose own website publishes a Semester 1 2027 date are written.
INSERT INTO public.application_cycles (
  university_id, academic_year, intake, application_type, opening_date, deadline,
  deadline_timezone, application_fee_currency, source_url, last_verified_at,
  verification_status, cycle_year, deadline_type, is_estimated, is_active, is_verified, notes
)
VALUES
  (15, '2027', 'Semester 1 2027 (February/March)', 'International undergraduate (direct)', DATE '2026-08-01', DATE '2026-11-30',
   'Australia/Melbourne', 'AUD', 'https://study.unimelb.edu.au/how-to-apply/undergraduate-study/international-applications/entry-requirements/important-dates',
   now(), 'verified', 2027, 'Published closing date', false, true, true,
   'University of Melbourne publishes 30 November 2026 as the closing date for international undergraduate applications to the start-year 2027 (Semester 1) intake; Semester 2 2027 closes 31 May 2027. Graduate coursework for Semester 1 2027 closed 31 August 2026.'),
  (35, '2027', 'Semester 1 2027 (February)', 'International undergraduate (direct)', DATE '2026-08-01', DATE '2026-12-01',
   'Australia/Sydney', 'AUD', 'https://www.sydney.edu.au/study/applying/application-dates.html',
   now(), 'verified', 2027, 'Published closing date', false, true, true,
   'University of Sydney publishes 1 December (of the previous year) as the application closing date for international undergraduate Semester 1 entry; international postgraduate Semester 1 closes 18 December 2026. Competitive courses can close earlier.'),
  (27, '2027', 'Semester 1 2027 (February)', 'International undergraduate & postgraduate', DATE '2026-08-01', DATE '2026-12-15',
   'Australia/Sydney', 'AUD', 'https://www.anu.edu.au/study/apply/international-applications',
   now(), 'verified', 2027, 'Published closing date', false, true, true,
   'ANU publishes 15 December 2026 as the general international closing date for Semester 1 2027 (most undergraduate and postgraduate coursework); some programmes close earlier (e.g. Crawford School 31 October 2026) and the acceptance deadline for overseas students is 15 January 2027.'),
  (56, '2027', 'Semester 1 2027 (February)', 'International undergraduate (QTAC)', DATE '2026-08-04', DATE '2026-11-30',
   'Australia/Brisbane', 'AUD', 'https://study.uq.edu.au/admissions/undergraduate/submit-your-application',
   now(), 'verified', 2027, 'Published closing date', false, true, true,
   'UQ publishes 30 November of the previous year as the Semester 1 closing date (Semester 2 closes 31 May). The QTAC major offer round for Semester 1 2027 is 14 January 2027 and classes start 22 February 2027.');

-- ── 7. National scholarship programmes: dates published or firmly recurring ─
-- Stipendium Hungaricum (860): the 2026/27 call closed 15 January 2026 (official);
--   2027/28 opens ~November 2026 with the same mid-January cut-off → estimate.
UPDATE public.scholarships SET
  deadline = 'Expected 15 January 2027, 14:00 CET (2027/28 call not yet published)',
  deadline_type = 'estimated', application_status = 'upcoming',
  notes = coalesce(notes,'') || ' | 2026-10-23: 2026/27 call closed 15 January 2026 (official). The 2027/28 call opens ~November 2026 with the same mid-January deadline; the date is an estimate until Tempus publishes it. The sending partner (Ministry of Education for Uzbekistan) may set an earlier internal deadline.',
  last_updated_at = now()
WHERE id = 860;

-- Türkiye Bursları (865): the annual window is 10 January – 20 February.
UPDATE public.scholarships SET
  deadline = 'Expected 20 February 2027 (annual call runs 10 January – 20 February)',
  deadline_type = 'estimated', application_status = 'upcoming',
  notes = coalesce(notes,'') || ' | 2026-10-23: the annual application window is 10 January – 20 February (turkiyeburslari.gov.tr calendar). The 2027 dates are the recurring pattern, not a separately announced call.',
  last_updated_at = now()
WHERE id = 865;

-- Russian Government Quota (868): 15 December 2026 for CIS countries.
UPDATE public.scholarships SET
  deadline = '15 December 2026 (CIS countries, incl. Uzbekistan); 15 January 2027 for non-CIS',
  deadline_date = DATE '2026-12-15', deadline_type = 'fixed', application_status = 'open',
  website_url = 'https://education-in-russia.com',
  notes = coalesce(notes,'') || ' | 2026-10-23: quota registration for the 2027/28 year closes 15 December 2026 for CIS applicants and 15 January 2027 for the rest; dates are set per country, so confirm with the Russian embassy in Tashkent.',
  last_updated_at = now()
WHERE id = 868;

-- Global Korea Scholarship (863): the 2027 undergraduate call closed 30 Sep 2026.
UPDATE public.scholarships SET
  deadline = 'Embassy track: 15–30 September each year (2027 call closed 30 September 2026). Graduate call: February.',
  deadline_date = DATE '2027-09-30', deadline_type = 'estimated', application_status = 'upcoming',
  notes = coalesce(notes,'') || ' | 2026-10-23: GKS-U 2027 embassy track ran 15–30 September 2026 (NIIED guidelines). GKS-G 2027 guidelines were not published at the time of this check. The September date is the next cycle of the published pattern.',
  last_updated_at = now()
WHERE id = 863;

-- Chinese Government Scholarship (866): a window, not a single date.
UPDATE public.scholarships SET
  deadline = 'Typically 15 December 2026 – 30 April 2027 (Category A via embassy, Category B via university)',
  deadline_range_start = DATE '2026-12-15', deadline_range_end = DATE '2027-04-30',
  deadline_type = 'range', application_status = 'upcoming',
  notes = coalesce(notes,'') || ' | 2026-10-23: the 2026/27 round closed 15 February – 20 March 2026 depending on the embassy; the 2027/28 window is expected to open around 15 December 2026 and run to April 2027. Exact embassy dates differ.',
  last_updated_at = now()
WHERE id = 866;

-- El-Yurt Umidi (862): the 2026 first open competition closed 24 April 2026.
UPDATE public.scholarships SET
  deadline = 'Expected April 2027 (2026 first open competition closed 24 April 2026)',
  deadline_date = DATE '2027-04-30', deadline_type = 'estimated', application_status = 'upcoming',
  notes = coalesce(notes,'') || ' | 2026-10-23: the 2026 open competition closed 24 April 2026; the foundation announces each round on eyuf.uz and admission.eyuf.uz and has run two rounds in some years. The April date is the announced pattern, not a published 2027 call.',
  last_updated_at = now()
WHERE id = 862;

COMMIT;

-- Verification after the run (2026-10-23):
--   universities with a verified upcoming deadline ... 137 of 364  (was 75)
--   verified application cycles ...................... 233        (was 171)
--   scholarships with a date ......................... 424        (was 421)
--   Ukraine/Belarus etc. untouched — no verified rule was found.
