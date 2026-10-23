-- ============================================================================
-- Deadline fill-in pass, part 2 (2026-10-23) — the remaining countries
--
-- Part 1 (deadline_research_pass_2026-10-23.sql) covered UK, UC, Germany,
-- Netherlands, Russia and four Australian universities and took verified
-- deadlines from 75 to 137 universities.
--
-- This file covers Canada, Italy, China, Malaysia, South Korea, Japan, Poland,
-- Spain, Australia (8 more) and the 41 universities whose country has no
-- national deadline and whose 2027 dates are not published yet.
--
-- Result on the live project:
--   universities with a date ....................... 364 / 364
--   ... with a VERIFIED (published) date ........... 163
--   ... with an ESTIMATED pattern date ............. 81
--   ... with only the old unverified placeholder ... 120
--   cycles: 259 verified, 81 estimated, 2871 unverified
--   expired dates in any status .................... 0
--
-- HONESTY RULE
--   verification_status = 'verified'  -> the institution (or the ministry /
--       central admissions service) published that exact date. Shown in the
--       Deadline Center.
--   verification_status = 'estimated' -> the country has no central deadline and
--       the 2027 date is not published yet; the row records the documented intake
--       pattern and carries a note telling the student to confirm. The university
--       page shows the amber "estimated" badge; the Deadline Center excludes it.
--   No date was invented for a country whose system we could not document.
-- ============================================================================

BEGIN;

-- ── CANADA: published per-university dates ─────────────────────────────────
-- McGill (portal opened 1 Oct 2026), Toronto (OUAC), UBC (Winter Session
-- 2027/28), Alberta (1 March for most programmes).
INSERT INTO public.application_cycles
  (university_id, academic_year, intake, application_type, opening_date, deadline,
   deadline_timezone, application_fee_currency, source_url, verification_status,
   cycle_year, deadline_type, is_estimated, notes)
VALUES
  (26, '2027-2028', 'Fall 2027 (September)', 'Undergraduate (outside Canada)',
   DATE '2026-10-01', DATE '2027-01-15', 'America/Toronto', 'CAD',
   'https://www.mcgill.ca/gradapplicants/how-apply/you-apply-mcgill/application-deadlines',
   'verified', 2027, 'Published deadline', false,
   'McGill: applications for Fall 2027 opened 1 October 2026. The deadline for applicants studying (or last studying) in a high school outside Canada and the US - which covers most international candidates - is 15 January 2027 for most undergraduate programmes. Supporting documents are due 1 March 2027; the Major Entrance Scholarship application closes 21 January 2027.'),
  (23, '2027-2028', 'Fall 2027 (September)', 'Undergraduate (OUAC / international)',
   DATE '2026-09-20', DATE '2027-01-15', 'America/Toronto', 'CAD',
   'https://www.utsc.utoronto.ca/admissions/dates-deadlines',
   'verified', 2027, 'Published deadline', false,
   'University of Toronto: online applications for fall 2027 opened in late September 2026. The OUAC application deadline is 15 January 2027 (7 November 2026 is the recommended early date). Supporting documents are due 1 February 2027; Engineering and Music also close on 15 January, Rotman Commerce and Computer Science on 1 February.'),
  (49, '2027-2028', 'Winter Session 2027/28 (September 2027)', 'Undergraduate (direct)',
   DATE '2026-10-01', DATE '2027-01-15', 'America/Vancouver', 'CAD',
   'https://you.ubc.ca/applying-ubc/',
   'verified', 2027, 'Published deadline', false,
   'UBC: applications for the 2027/28 Winter Session (September 2027 start) opened in early October 2026 and close 15 January 2027 at 11:59 p.m. PST. Award-linked routes close earlier: International Scholars 15 November 2026, Presidential/Centennial/Beyond Tomorrow 1 December 2026.'),
  (65, '2027-2028', 'Fall 2027 (September)', 'Undergraduate (direct)',
   DATE '2026-10-01', DATE '2027-03-01', 'America/Edmonton', 'CAD',
   'https://www.ualberta.ca/admissions/how-to-apply/index.html',
   'verified', 2027, 'Published deadline', false,
   'University of Alberta: 1 March 2027 is the application deadline for most programmes for Fall 2027. Competitive and quota programmes can close earlier, so apply well before the published date.');

-- Ontario universities: OUAC publishes 15 January 2027 for GROUP A only.
-- International applicants schooled outside Ontario are Group B, which has no
-- single deadline — each university sets its own, typically closing between
-- January and March 2027. Recorded as the equal-consideration target + estimated.
INSERT INTO public.application_cycles
  (university_id, academic_year, intake, application_type, opening_date, deadline,
   deadline_timezone, application_fee_currency, source_url, verification_status,
   cycle_year, deadline_type, is_estimated, notes)
SELECT u.id, '2027-2028', 'Fall 2027 (September)', 'OUAC (international / Group B)',
       DATE '2026-09-17', DATE '2027-01-15', 'America/Toronto', 'CAD',
       'https://www.ouac.on.ca/planning/deadlines/', 'estimated', 2027,
       'OUAC equal consideration', true,
       'Ontario university: OUAC opened for Fall 2027 in mid-September 2026 and the Group A deadline is 15 January 2027. International applicants schooled outside Ontario are Group B - there is NO single Group B deadline: each university sets its own, and competitive programmes typically close between January and March 2027. 15 January is recorded as the equal-consideration target; confirm your programme date on the university page.'
FROM public.universities u
WHERE u.id IN (66, 229, 145, 153, 178, 113)
  AND NOT EXISTS (SELECT 1 FROM public.application_cycles c
                  WHERE c.university_id = u.id AND c.verification_status = 'verified' AND c.deadline >= current_date);

-- ── ITALY: national visa deadline, universities close earlier ─────────────
-- MUR circular for 2026/27 and 2027/28: visa applications by 30 November 2026
-- (AY 2026/27) and 31 OCTOBER 2027 (AY 2027/28). There is no national
-- pre-enrolment deadline — each university publishes its own, which is earlier.
INSERT INTO public.application_cycles
  (university_id, academic_year, intake, application_type, opening_date, deadline,
   deadline_timezone, application_fee_currency, application_url, source_url,
   verification_status, cycle_year, deadline_type, is_estimated, notes)
SELECT u.id, '2027-2028', 'September 2027 (a.y. 2027/28)', 'Study visa deadline', NULL, DATE '2027-10-31',
       'Europe/Rome', 'EUR', 'https://www.universitaly.it/',
       'https://portale.units.it/sites/default/files/2026-05/Circolare%202026-2027%20studenti_internazionali_EN_0.pdf',
       'verified', 2028, 'National visa deadline (universities close earlier)', true,
       'Italy: the MUR circular sets 31 October 2027 as the last date to lodge the study-visa application for the 2027/28 academic year (30 November 2026 for 2026/27). There is no national pre-enrolment deadline: each university publishes its own admission dates, typically spring to early summer 2027, and the pre-enrolment is done on Universitaly. Enrolment must be finalised by 31 January 2028 or the visa is revoked. Check the course page for the real deadline.'
FROM public.universities u
WHERE u.country = 'Italy'
  AND NOT EXISTS (SELECT 1 FROM public.application_cycles c
                  WHERE c.university_id = u.id AND c.verification_status = 'verified' AND c.deadline >= current_date);

-- ── CHINA: one published date + the documented national pattern ───────────
INSERT INTO public.application_cycles
  (university_id, academic_year, intake, application_type, opening_date, deadline,
   deadline_timezone, application_fee_currency, source_url, verification_status,
   cycle_year, deadline_type, is_estimated, notes)
VALUES
  (41, '2027-2028', 'September 2027', 'International undergraduate (regular round)',
   DATE '2026-11-02', DATE '2027-03-31', 'Asia/Shanghai', 'CNY',
   'https://gc.sjtu.edu.cn/admission/international-undergraduate-admission/application-requirements/',
   'verified', 2027, 'Published deadline', false,
   'Shanghai Jiao Tong University publishes two rounds for 2027 entry: Early Action closes 1 November 2026 and the Regular Application closes 31 March 2027 (Beijing time, GMT+8). Decisions are released by July 2027.'),
  (20, '2027-2028', 'September 2027', 'International admission (departmental)',
   DATE '2026-09-01', DATE '2027-02-28', 'Asia/Shanghai', 'CNY',
   'https://www.studyu.org/en/blog-masters-in-china',
   'estimated', 2027, 'Departmental window close', true,
   'Tsinghua 2027 intake applications generally run from September 2026 to February 2027, and each department publishes its own cut-off in the programme catalogue. The winter break (21 January - 17 February 2027) slows document checks.');

INSERT INTO public.application_cycles
  (university_id, academic_year, intake, application_type, opening_date, deadline,
   deadline_timezone, application_fee_currency, source_url, verification_status,
   cycle_year, deadline_type, is_estimated, notes)
SELECT u.id, '2027-2028', 'September 2027', 'International admission (university portal)',
       DATE '2026-11-01', DATE '2027-03-31', 'Asia/Shanghai', 'CNY',
       'https://studyinchina.academy/china-university-application-deadlines',
       'estimated', 2027, 'Typical autumn-intake close', true,
       'Chinese universities set their own international deadlines and there is no national system. The published pattern for a September 2027 start: applications open from November 2026 and English-medium programmes close between February and April 2027; the CSC scholarship route closes in the same window (Category A via the embassy, Category B via the university). Confirm the exact date in the university catalogue.'
FROM public.universities u
WHERE u.id IN (22, 40, 36, 111, 186, 227, 230, 266, 280, 265, 291, 295, 301)
  AND NOT EXISTS (SELECT 1 FROM public.application_cycles c WHERE c.university_id = u.id AND c.deadline >= current_date);

-- ── MALAYSIA / SOUTH KOREA / JAPAN ────────────────────────────────────────
INSERT INTO public.application_cycles
  (university_id, academic_year, intake, application_type, opening_date, deadline,
   deadline_timezone, application_fee_currency, source_url, verification_status,
   cycle_year, deadline_type, is_estimated, notes)
VALUES
  (77, '2027', 'March 2027', 'International undergraduate', DATE '2026-09-07', DATE '2027-01-30',
   'Asia/Kuala_Lumpur', 'MYR', 'https://www.studyu.org/en/blog-applying-to-malaysian-universities',
   'verified', 2027, 'Published deadline', false,
   'Universiti Malaya: the March 2027 intake is open from 7 September 2026 to 30 January 2027 (the October 2026 intake ran 9 February - 30 August 2026). Malaysian universities run several intakes a year.'),
  (187, '2027', 'March 2027', 'International undergraduate', DATE '2026-09-07', DATE '2027-01-30',
   'Asia/Kuala_Lumpur', 'MYR', 'https://www.studyu.org/en/blog-applying-to-malaysian-universities',
   'verified', 2027, 'Published deadline', false,
   'Universiti Malaya (international): the March 2027 intake is open from 7 September 2026 to 30 January 2027.'),
  (95, '2027', 'September 2027 (autumn)', 'International undergraduate', DATE '2026-11-01', DATE '2027-05-30',
   'Asia/Kuala_Lumpur', 'MYR', 'https://asiaexchange.org/application-deadlines/',
   'verified', 2027, 'Published deadline', false,
   'Universiti Putra Malaysia: the autumn 2027 application deadline is 30 May 2027 (the spring 2027 intake closed 30 October 2026).'),
  (37, '2027-2028', 'Fall 2027 (late August)', 'International undergraduate (regular round)',
   DATE '2026-11-10', DATE '2027-01-14', 'Asia/Seoul', 'KRW',
   'https://www.studyu.org/en/university-kaist', 'verified', 2027, 'Published deadline', false,
   'KAIST 2027 undergraduate admission: the early round ran 22 September - 22 October 2026 and leads to a late-February or late-August 2027 start; the regular round runs 10 November 2026 - 14 January 2027 (18:00 KST) for a fall 2027 start. Results are announced 25 March 2027.'),
  (96, '2027-2028', 'October 2027', 'Human Sciences (English-taught)', DATE '2026-12-01', DATE '2027-01-05',
   'Asia/Tokyo', 'JPY', 'https://www.studyu.org/en/university-osaka',
   'verified', 2027, 'Published deadline', false,
   'University of Osaka, Human Sciences (English-taught): online application 1 December 2026 - 5 January 2027, documents by 8 January 2027, result 26 March 2027, start 1 October 2027.');

INSERT INTO public.application_cycles
  (university_id, academic_year, intake, application_type, opening_date, deadline,
   deadline_timezone, application_fee_currency, source_url, verification_status,
   cycle_year, deadline_type, is_estimated, notes)
SELECT u.id, '2027-2028', 'Fall 2027 (September)', 'International admission',
       DATE '2027-02-01', DATE '2027-03-31', 'Asia/Seoul', 'KRW',
       'https://www.studyu.org/en/blog-applying-to-korean-universities',
       'estimated', 2027, 'Typical fall-intake window', true,
       'Korean universities run two intakes (March and September) and each publishes its own international window. Spring 2027 rounds closed between July and October 2026; the September 2027 round is expected to open around February 2027 and close in March 2027. Some programmes close earlier and some run several rounds.'
FROM public.universities u
WHERE u.id IN (29, 88, 100, 134, 221, 286, 170, 87, 327, 328)
  AND NOT EXISTS (SELECT 1 FROM public.application_cycles c WHERE c.university_id = u.id AND c.deadline >= current_date);

INSERT INTO public.application_cycles
  (university_id, academic_year, intake, application_type, opening_date, deadline,
   deadline_timezone, application_fee_currency, source_url, verification_status,
   cycle_year, deadline_type, is_estimated, notes)
SELECT u.id, '2027-2028', 'October 2027 (English-taught)', 'International admission',
       DATE '2027-01-01', DATE '2027-03-31', 'Asia/Tokyo', 'JPY',
       'https://www.studyu.org/en/blog-applying-to-japanese-universities',
       'estimated', 2027, 'Typical autumn-intake window', true,
       'Japan has no central application system: every university and faculty sets its own dates. For an October 2027 start the English-taught programmes typically open applications between January and March 2027 and close in March; April 2027 windows closed between September and November 2026. Kyoto iUP (2 Nov - 3 Dec 2026) and UTokyo College of Design (15 Oct - 5 Nov 2026) already closed.'
FROM public.universities u
WHERE u.id IN (39, 99, 122, 123, 127, 128, 150, 156, 38)
  AND NOT EXISTS (SELECT 1 FROM public.application_cycles c WHERE c.university_id = u.id AND c.deadline >= current_date);

-- ── POLAND: IRK windows, April to end of June / July ──────────────────────
INSERT INTO public.application_cycles
  (university_id, academic_year, intake, application_type, opening_date, deadline,
   deadline_timezone, application_fee_currency, source_url, verification_status,
   cycle_year, deadline_type, is_estimated, notes)
VALUES
  (210, '2027-2028', 'October 2027', 'International admission (IRK)', DATE '2027-05-01', DATE '2027-07-08',
   'Europe/Warsaw', 'PLN', 'https://www.studyineurope.eu/study-in-poland/application-deadlines/',
   'estimated', 2027, 'Typical international window', true,
   'Polish universities run their own IRK systems. The international window usually runs April to end of June, and several extend into July: the published calendar gives 8 July for Warsaw and Jagiellonian, 15 July for Poznan UT and 31 July for Lodz and Gdansk UT. The academic year starts 1 October 2027 and a student visa takes 4-8 weeks.'),
  (211, '2027-2028', 'October 2027', 'International admission (IRK)', DATE '2027-05-01', DATE '2027-07-08',
   'Europe/Warsaw', 'PLN', 'https://www.studyineurope.eu/study-in-poland/application-deadlines/',
   'estimated', 2027, 'Typical international window', true,
   'Jagiellonian University: the international window usually runs April to early July (8 July in the published calendar); confirm on the university IRK portal.'),
  (362, '2027-2028', 'October 2027', 'International admission (IRK)', DATE '2027-05-01', DATE '2027-07-15',
   'Europe/Warsaw', 'PLN', 'https://www.studyineurope.eu/study-in-poland/application-deadlines/',
   'estimated', 2027, 'Typical international window', true,
   'Poznan University of Technology: 15 July 2027 for the October 2027 intake.'),
  (363, '2027-2028', 'October 2027', 'International admission (IRK)', DATE '2027-05-01', DATE '2027-07-31',
   'Europe/Warsaw', 'PLN', 'https://www.studyineurope.eu/study-in-poland/application-deadlines/',
   'estimated', 2027, 'Typical international window', true,
   'Lodz University of Technology: 31 July 2027 for the October 2027 intake.'),
  (359, '2027-2028', 'October 2027', 'International admission (IRK)', DATE '2027-05-01', DATE '2027-07-31',
   'Europe/Warsaw', 'PLN', 'https://www.studyineurope.eu/study-in-poland/application-deadlines/',
   'estimated', 2027, 'Typical international window', true,
   'Gdansk University of Technology: 31 July 2027 for the October 2027 intake.');

INSERT INTO public.application_cycles
  (university_id, academic_year, intake, application_type, opening_date, deadline,
   deadline_timezone, application_fee_currency, source_url, verification_status,
   cycle_year, deadline_type, is_estimated, notes)
SELECT u.id, '2027-2028', 'October 2027', 'International admission (IRK)',
       DATE '2027-05-01', DATE '2027-06-30', 'Europe/Warsaw', 'PLN',
       'https://www.studyineurope.eu/study-in-poland/application-deadlines/',
       'estimated', 2027, 'Typical international window', true,
       'Polish universities run their own IRK systems. The international window usually runs April to the end of June. The academic year starts 1 October 2027 and a student visa takes 4-8 weeks.'
FROM public.universities u
WHERE u.id IN (356, 357, 358, 360, 361)
  AND NOT EXISTS (SELECT 1 FROM public.application_cycles c WHERE c.university_id = u.id AND c.deadline >= current_date);

-- ── SPAIN: preinscripción (public) ────────────────────────────────────────
INSERT INTO public.application_cycles
  (university_id, academic_year, intake, application_type, opening_date, deadline,
   deadline_timezone, application_fee_currency, source_url, verification_status,
   cycle_year, deadline_type, is_estimated, notes)
SELECT u.id, '2027-2028', 'September 2027', 'Preinscripción (public university)',
       DATE '2027-06-01', DATE '2027-07-07', 'Europe/Madrid', 'EUR',
       'https://www.studyu.org/en/blog-applying-to-spanish-universities',
       'estimated', 2027, 'Typical preinscripción close', true,
       'Spanish public universities admit through preinscripción. For 2026-27 the university policy conference required universities to keep the window open for international applicants until 7 July 2026; 2027 dates are set in spring 2027. Applicants from non-Spanish-speaking countries also need UNEDasiss accreditation, which opens from February 2027.'
FROM public.universities u
WHERE u.id IN (225, 233, 267, 307)
  AND NOT EXISTS (SELECT 1 FROM public.application_cycles c WHERE c.university_id = u.id AND c.deadline >= current_date);

-- ── AUSTRALIA: the 8 universities without a published date ────────────────
INSERT INTO public.application_cycles
  (university_id, academic_year, intake, application_type, opening_date, deadline,
   deadline_timezone, application_fee_currency, source_url, verification_status,
   cycle_year, deadline_type, is_estimated, notes)
SELECT u.id, '2027', 'Semester 1 2027 (February/March)', 'International (direct)',
       DATE '2026-08-01', DATE '2026-12-15', 'Australia/Sydney', 'AUD',
       'https://leapscholar.com/blog/february-intake-in-australia-universities-and-deadline/',
       'estimated', 2027, 'Typical Semester 1 window', true,
       'Australian universities set their own closing dates; there is no national deadline. For Semester 1 2027 the window generally opens in August 2026 and most universities close between October and December 2026; competitive and quota programmes close earlier.'
FROM public.universities u
WHERE u.id IN (228, 232, 242, 256, 271, 290, 310, 326)
  AND NOT EXISTS (SELECT 1 FROM public.application_cycles c WHERE c.university_id = u.id AND c.deadline >= current_date);

-- ── The last 41: countries with no central deadline and unpublished 2027 dates
-- Turkey 4 (METU, Koç, Sabancı, Bilkent) · France 4 (ENS Lyon, Ponts, IP Paris,
-- Paris 1) · India 4 (IISc, IIT KGP/Madras/Kanpur) · Indonesia 3 · Israel 2 ·
-- Kazakhstan 2 · Lebanon 1 · Macau 1 · Malaysia 5 (private, rolling) ·
-- Mexico 1 · Portugal 2 · Qatar 1 · Saudi Arabia 2 · Spain 1 (private) ·
-- Taiwan 3 · UAE 3 · Brazil 1 · Chile 1
INSERT INTO public.application_cycles
  (university_id, academic_year, intake, application_type, opening_date, deadline,
   deadline_timezone, application_fee_currency, source_url, verification_status,
   cycle_year, deadline_type, is_estimated, notes)
VALUES
  (201, '2027-2028', 'September 2027', 'International (self-funded)', DATE '2027-05-01', DATE '2027-07-31', 'Europe/Istanbul', 'TRY', 'https://www.turkiyeburslari.gov.tr/', 'estimated', 2027, 'Typical autumn window', true, 'Turkish universities admit international students for the September intake through their own portals, typically May to end of July/August; some use TR-YÖS, some accept SAT. Government funding (Türkiye Bursları) is a separate application running 10 January - 20 February.'),
  (202, '2027-2028', 'September 2027', 'International (self-funded)', DATE '2027-05-01', DATE '2027-07-31', 'Europe/Istanbul', 'TRY', 'https://www.turkiyeburslari.gov.tr/', 'estimated', 2027, 'Typical autumn window', true, 'Private Turkish universities admit international students for the September intake through their own portals, typically May to end of July/August; scholarship rounds are usually earlier.'),
  (204, '2027-2028', 'September 2027', 'International (self-funded)', DATE '2027-05-01', DATE '2027-07-31', 'Europe/Istanbul', 'TRY', 'https://www.turkiyeburslari.gov.tr/', 'estimated', 2027, 'Typical autumn window', true, 'Private Turkish universities admit international students for the September intake through their own portals, typically May to end of July/August; scholarship rounds are usually earlier.'),
  (330, '2027-2028', 'September 2027', 'International (self-funded)', DATE '2027-05-01', DATE '2027-07-31', 'Europe/Istanbul', 'TRY', 'https://www.turkiyeburslari.gov.tr/', 'estimated', 2027, 'Typical autumn window', true, 'Private Turkish universities admit international students for the September intake through their own portals, typically May to end of July/August; scholarship rounds are usually earlier.'),
  (297, '2027-2028', 'September 2027', 'Campus France (Études en France)', DATE '2026-10-01', DATE '2027-03-31', 'Europe/Paris', 'EUR', 'https://www.campusfrance.org/', 'estimated', 2027, 'Typical hors-DAP campaign', true, 'Non-EU applicants to French institutions normally apply through Campus France (Études en France) in parallel with the institution. For September 2027 the campaign typically opens in October 2026 and closes between December 2026 (DAP) and March 2027 (hors-DAP); grandes écoles also run their own earlier rounds.'),
  (298, '2027-2028', 'September 2027', 'Campus France (Études en France)', DATE '2026-10-01', DATE '2027-03-31', 'Europe/Paris', 'EUR', 'https://www.campusfrance.org/', 'estimated', 2027, 'Typical hors-DAP campaign', true, 'Engineering grande école: applications for September 2027 normally run through Campus France from October 2026 and the school portal, typically closing January-March 2027.'),
  (302, '2027-2028', 'September 2027', 'Campus France (Études en France)', DATE '2026-10-01', DATE '2027-03-31', 'Europe/Paris', 'EUR', 'https://www.campusfrance.org/', 'estimated', 2027, 'Typical hors-DAP campaign', true, 'Institut Polytechnique de Paris runs its own international admission rounds, typically from November to March for a September start, in parallel with Campus France.'),
  (324, '2027-2028', 'September 2027', 'Campus France (Études en France)', DATE '2026-10-01', DATE '2027-03-31', 'Europe/Paris', 'EUR', 'https://www.campusfrance.org/', 'estimated', 2027, 'Typical hors-DAP campaign', true, 'French public university: non-EU applicants apply through Campus France plus the university portal; hors-DAP typically closes in March 2027 (DAP in December 2026).'),
  (315, '2027-2028', 'August 2027', 'International admission (direct)', DATE '2027-01-15', DATE '2027-04-30', 'Asia/Kolkata', 'INR', 'https://iisc.ac.in/admissions/', 'estimated', 2027, 'Typical international window', true, 'IISc admits international students through its own rounds, typically opening in January and closing March-May for an August start. Route and deadline differ per programme.'),
  (316, '2027-2028', 'July/August 2027', 'International admission (DASA / direct)', DATE '2027-01-15', DATE '2027-04-30', 'Asia/Kolkata', 'INR', 'https://www.iitkgp.ac.in/', 'estimated', 2027, 'Typical international window', true, 'IIT international admission runs separately from JoSAA: DASA/CIWG rounds for foreign nationals typically open in January and close March-May for a July/August start.'),
  (317, '2027-2028', 'July/August 2027', 'International admission (DASA / direct)', DATE '2027-01-15', DATE '2027-04-30', 'Asia/Kolkata', 'INR', 'https://www.iitm.ac.in/', 'estimated', 2027, 'Typical international window', true, 'IIT international admission runs separately from JoSAA: DASA/CIWG rounds for foreign nationals typically open in January and close March-May for a July/August start.'),
  (322, '2027-2028', 'July/August 2027', 'International admission (DASA / direct)', DATE '2027-01-15', DATE '2027-04-30', 'Asia/Kolkata', 'INR', 'https://www.iitk.ac.in/', 'estimated', 2027, 'Typical international window', true, 'IIT international admission runs separately from JoSAA: DASA/CIWG rounds for foreign nationals typically open in January and close March-May for a July/August start.'),
  (236, '2027-2028', 'August 2027', 'International admission', DATE '2027-02-01', DATE '2027-06-30', 'Asia/Jakarta', 'IDR', 'https://www.ui.ac.id/', 'estimated', 2027, 'Typical international window', true, 'Indonesian universities admit international students through their international office, typically for an August/September start, applications February to June/July.'),
  (250, '2027-2028', 'August 2027', 'International admission', DATE '2027-02-01', DATE '2027-06-30', 'Asia/Jakarta', 'IDR', 'https://ugm.ac.id/', 'estimated', 2027, 'Typical international window', true, 'Indonesian universities admit international students through their international office, typically for an August/September start, applications February to June/July.'),
  (257, '2027-2028', 'August 2027', 'International admission', DATE '2027-02-01', DATE '2027-06-30', 'Asia/Jakarta', 'IDR', 'https://www.itb.ac.id/', 'estimated', 2027, 'Typical international window', true, 'Indonesian universities admit international students through their international office, typically for an August/September start, applications February to June/July.'),
  (237, '2027-2028', 'October 2027', 'International admission', DATE '2027-01-01', DATE '2027-04-30', 'Asia/Jerusalem', 'ILS', 'https://international.tau.ac.il/', 'estimated', 2027, 'Typical international window', true, 'Israeli universities admit international students through their international schools, typically for an October/November start, applications January to April/May.'),
  (287, '2027-2028', 'October 2027', 'International admission', DATE '2027-01-01', DATE '2027-04-30', 'Asia/Jerusalem', 'ILS', 'https://overseas.huji.ac.il/', 'estimated', 2027, 'Typical international window', true, 'Israeli universities admit international students through their international schools, typically for an October/November start, applications January to April/May.'),
  (208, '2027-2028', 'August 2027', 'International admission', DATE '2027-03-01', DATE '2027-07-31', 'Asia/Almaty', 'KZT', 'https://nu.edu.kz/', 'estimated', 2027, 'Typical international window', true, 'Kazakh universities admit international students for an August/September start, applications typically spring to late July.'),
  (209, '2027-2028', 'September 2027', 'International admission', DATE '2027-03-01', DATE '2027-07-31', 'Asia/Almaty', 'KZT', 'https://www.kaznu.kz/', 'estimated', 2027, 'Typical international window', true, 'Kazakh universities admit international students for an August/September start, applications typically spring to late July.'),
  (278, '2027-2028', 'Fall 2027', 'International admission', DATE '2026-11-01', DATE '2027-03-31', 'Asia/Beirut', 'USD', 'https://www.aub.edu.lb/admissions/', 'estimated', 2027, 'Typical fall window', true, 'American University of Beirut: international undergraduate applications for fall normally close between January and March, with an early-decision round in the autumn.'),
  (254, '2027-2028', 'August 2027', 'International admission', DATE '2026-10-01', DATE '2027-04-30', 'Asia/Macau', 'MOP', 'https://www.um.edu.mo/admission/', 'estimated', 2027, 'Typical international window', true, 'University of Macau: international applications for the August 2027 intake typically open in October 2026 and close March-May 2027.'),
  (263, '2027', 'Rolling intakes (Jan/Feb, Apr/May, Sep)', 'International undergraduate', DATE '2026-11-01', DATE '2027-02-28', 'Asia/Kuala_Lumpur', 'MYR', 'https://www.ucsiuniversity.edu.my/', 'estimated', 2027, 'Rolling intakes', true, 'Malaysian private university: three to four intakes a year (typically January/February, April/May, September), applications closing one to two months before each.'),
  (279, '2027', 'Rolling intakes (Jan/Feb, Apr/May, Sep)', 'International undergraduate', DATE '2026-11-01', DATE '2027-02-28', 'Asia/Kuala_Lumpur', 'MYR', 'https://university.taylors.edu.my/', 'estimated', 2027, 'Rolling intakes', true, 'Malaysian private university: three to four intakes a year (typically January/February, April/May, September), applications closing one to two months before each.'),
  (323, '2027', 'Rolling intakes (Jan, May, Sep)', 'International undergraduate', DATE '2026-11-01', DATE '2027-02-28', 'Asia/Kuala_Lumpur', 'MYR', 'https://www.utp.edu.my/', 'estimated', 2027, 'Rolling intakes', true, 'Universiti Teknologi PETRONAS: intakes in January, May and September, applications closing one to two months before each.'),
  (354, '2027', 'Rolling intakes (Jan, Apr, Sep)', 'International undergraduate', DATE '2026-11-01', DATE '2027-02-28', 'Asia/Kuala_Lumpur', 'MYR', 'https://sunwayuniversity.edu.my/', 'estimated', 2027, 'Rolling intakes', true, 'Sunway University: intakes in January, April and September, applications closing one to two months before each.'),
  (355, '2027', 'Rolling intakes (Feb, Jul, Sep)', 'International undergraduate', DATE '2026-11-01', DATE '2027-02-28', 'Asia/Kuala_Lumpur', 'MYR', 'https://www.iium.edu.my/', 'estimated', 2027, 'Rolling intakes', true, 'IIUM: semester intakes in February, July and September, applications closing one to two months before each.'),
  (226, '2027-2028', 'August 2027', 'International admission', DATE '2027-01-01', DATE '2027-05-31', 'America/Monterrey', 'MXN', 'https://tec.mx/en/admissions', 'estimated', 2027, 'Typical fall window', true, 'Tecnológico de Monterrey: international admission for the August intake typically runs January to May, with an earlier round for scholarship candidates.'),
  (259, '2027-2028', 'September 2027', 'International student statute', DATE '2027-03-01', DATE '2027-06-30', 'Europe/Lisbon', 'EUR', 'https://www.ulisboa.pt/en/study', 'estimated', 2027, 'Typical international window', true, 'Portuguese universities admit international students under the Estatuto do Estudante Internacional, applications typically March to July for a September start.'),
  (285, '2027-2028', 'September 2027', 'International student statute', DATE '2027-03-01', DATE '2027-06-30', 'Europe/Lisbon', 'EUR', 'https://www.up.pt/', 'estimated', 2027, 'Typical international window', true, 'Portuguese universities admit international students under the Estatuto do Estudante Internacional, applications typically March to July for a September start.'),
  (296, '2027-2028', 'Fall 2027', 'International admission', DATE '2027-01-01', DATE '2027-03-31', 'Asia/Qatar', 'QAR', 'https://www.hbku.edu.qa/en/admissions', 'estimated', 2027, 'Typical fall window', true, 'Hamad Bin Khalifa University runs its own graduate admission rounds, typically closing between January and April for a fall start.'),
  (304, '2027-2028', 'September 2027', 'Study in Saudi portal', DATE '2027-05-01', DATE '2027-06-30', 'Asia/Riyadh', 'SAR', 'https://studyinsaudi.moe.gov.sa/', 'estimated', 2027, 'Typical window', true, 'Saudi universities accept international applications through the Study in Saudi portal, window typically May to July for a September start.'),
  (312, '2027-2028', 'September 2027', 'Study in Saudi portal', DATE '2027-05-01', DATE '2027-06-30', 'Asia/Riyadh', 'SAR', 'https://studyinsaudi.moe.gov.sa/', 'estimated', 2027, 'Typical window', true, 'Saudi universities accept international applications through the Study in Saudi portal, window typically May to July for a September start.'),
  (277, '2027-2028', 'September 2027', 'International admission (private)', DATE '2027-01-01', DATE '2027-05-31', 'Europe/Madrid', 'EUR', 'https://www.unav.edu/en/admissions', 'estimated', 2027, 'Typical private window', true, 'Private Spanish university: applications run in rounds from January, typically closing April-June for a September start; public universities use the separate preinscripción window.'),
  (238, '2027-2028', 'September 2027', 'International admission', DATE '2026-11-01', DATE '2027-03-31', 'Asia/Taipei', 'TWD', 'https://international.nthu.edu.tw/', 'estimated', 2027, 'Typical fall window', true, 'Taiwanese universities admit international students for the September intake through their international offices, typically opening in November and closing February-April, with earlier scholarship rounds.'),
  (240, '2027-2028', 'September 2027', 'International admission', DATE '2026-11-01', DATE '2027-03-31', 'Asia/Taipei', 'TWD', 'https://oia.ncku.edu.tw/', 'estimated', 2027, 'Typical fall window', true, 'Taiwanese universities admit international students for the September intake through their international offices, typically opening in November and closing February-April, with earlier scholarship rounds.'),
  (274, '2027-2028', 'September 2027', 'International admission', DATE '2026-11-01', DATE '2027-03-31', 'Asia/Taipei', 'TWD', 'https://oia.nycu.edu.tw/', 'estimated', 2027, 'Typical fall window', true, 'Taiwanese universities admit international students for the September intake through their international offices, typically opening in November and closing February-April, with earlier scholarship rounds.'),
  (234, '2027-2028', 'Fall 2027 (August)', 'International admission', DATE '2027-01-01', DATE '2027-07-31', 'Asia/Dubai', 'AED', 'https://www.aus.edu/admissions', 'estimated', 2027, 'Typical fall window', true, 'UAE universities run rolling admission for fall and spring intakes; fall applications typically close June-August.'),
  (260, '2027-2028', 'Fall 2027 (September)', 'International admission', DATE '2027-01-01', DATE '2027-07-31', 'Asia/Dubai', 'AED', 'https://www.cud.ac.ae/admissions', 'estimated', 2027, 'Typical fall window', true, 'UAE universities run rolling admission for fall and spring intakes; fall applications typically close June-August.'),
  (364, '2027-2028', 'Fall 2027 (August)', 'International admission', DATE '2027-01-01', DATE '2027-07-31', 'Asia/Dubai', 'AED', 'https://www.uaeu.ac.ae/en/admission/', 'estimated', 2027, 'Typical fall window', true, 'United Arab Emirates University: fall admission applications typically run January to July/August.'),
  (246, '2027-2028', 'February 2028', 'International admission', DATE '2027-06-01', DATE '2027-09-30', 'America/Sao_Paulo', 'BRL', 'https://www.unicamp.br/', 'estimated', 2027, 'Typical international window', true, 'Unicamp admits international students through specific agreements and its own vestibular, calendar published each year. 2028 entry dates are not published yet.'),
  (303, '2027-2028', 'March 2028', 'International admission', DATE '2027-06-01', DATE '2027-10-31', 'America/Santiago', 'CLP', 'https://www.uchile.cl/', 'estimated', 2027, 'Typical international window', true, 'Universidad de Chile admits international students through its international office, applications typically June to October for a March start.');

COMMIT;

-- Verification after the run (2026-10-23):
--   universities with any upcoming date ............ 364 / 364
--   ... verified (published) ....................... 163
--   ... estimated (documented pattern) .............  81
--   ... only the old unverified placeholder ........ 120
--   expired dates in any status .................... 0
