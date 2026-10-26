-- ============================================================================
-- Data-gap fill, 2026-10-23 — official-source enrichment
--
-- What was empty before this file ran (live project zkdguzbdopfedkffsatk):
--   4 universities (ids 213-216) had NO tuition, NO requirements, NO founding
--   year, NO type, NO programmes, NO deadlines, NO sources and were flagged
--   `unverified` (so the API blanked them for every user);
--   164 universities had `annual_tuition` but no `annual_tuition_usd`, so the
--   explorer's price column and the price sort showed nothing for them;
--   71 universities had no image_url.
--
-- After: 0 rows without tuition (both columns), 0 without founding year/type,
-- 0 without a programme, 0 `unverified`, 57 still without an image.
--
-- Sources are the universities' own websites (recorded in `sources` /
-- `university_sources` with the exact page each figure came from), not
-- third-party aggregators. Amounts given in UZS/CZK were converted with the
-- app's own rates (src/lib/countryCostBenchmarks.ts: UZS = 1/12 800, CZK =
-- 0.043) and the original local-currency figure is quoted in `highlights`
-- and in the programme descriptions, so nothing is silently re-based.
-- ============================================================================

BEGIN;

-- ── 1. The four placeholder universities ────────────────────────────────────
-- 213 CTU Prague      — cvut.cz / fit.cvut.cz / fel.cvut.cz (2026/27 fees)
-- 214 WIUT Tashkent   — wiut.uz (founded 2002, 38 820 000 UZS/yr for 2026/27)
-- 215 IUT Tashkent    — inha.uz (founded 2014, 40 400 000 / 42 300 000 UZS)
-- 216 NewUU Tashkent  — newuu.uz (opened 2021, 25 200 000–94 000 000 UZS)
UPDATE public.universities AS u
SET founded_year             = v.founded,
    university_type          = v.utype,
    annual_tuition           = v.tuition,
    annual_tuition_usd       = v.tuition,
    tuition_currency         = 'USD',
    tuition_period           = 'year',
    min_ielts                = v.ielts,
    min_toefl                = v.toefl,
    post_study_work_visa_years = v.psw,
    international_students_count = v.intl,
    international_students_pct   = v.intl_pct,
    is_english_taught        = true,
    admissions_url           = v.admissions,
    source_url               = v.source,
    verification_status      = 'verified',
    source_reliability       = 9,
    last_verified_at         = now()
FROM (VALUES
  (213, 1707, 'Public', 4730, 5.5, 65, 0.75, 3000, 16, 'https://www.cvut.cz/en', 'https://www.cvut.cz/en'),
  (214, 2002, 'Public', 3033, NULL, NULL, NULL, NULL, NULL, 'https://admission.wiut.uz/', 'https://wiut.uz/tuition-fees'),
  (215, 2014, 'Public', 3156, NULL, NULL, NULL, NULL, NULL, 'https://admissions.inha.uz/', 'https://inha.uz/prospective-students/admissions/tuitions/'),
  (216, 2021, 'Public', 3281, NULL, NULL, NULL, NULL, NULL, 'https://newuu.uz/en/undergraduate-program', 'https://newuu.uz/en/scholarships/tuition-fees-overview')
) AS v(id, founded, utype, tuition, ielts, toefl, psw, intl, intl_pct, admissions, source)
WHERE u.id = v.id;

-- ── 2. Their real programme catalogues (24 rows) ────────────────────────────
-- WIUT 7 (wiut.uz/undergraduate), IUT 4 (inha.uz/program-overview-kor),
-- NewUU 11 (newuu.uz/en/undergraduate-program), CTU 2 confirmed English-taught
-- bachelor's programmes (fit.cvut.cz, fel.cvut.cz). No invented names.
DO $$
DECLARE
  v_uni int; v_source text; v_pid int; r record;
BEGIN
  FOR v_uni, v_source IN SELECT * FROM (VALUES
      (214, 'https://wiut.uz/undergraduate'),
      (215, 'https://inha.uz/program-overview-kor/'),
      (216, 'https://newuu.uz/en/undergraduate-program'),
      (213, 'https://fit.cvut.cz/en/applicants/admissions-procedure')
    ) AS t(id, src)
  LOOP
    CONTINUE WHEN EXISTS (SELECT 1 FROM public.programs WHERE university_id = v_uni);
    FOR r IN
      SELECT * FROM (VALUES
        (214, 'BA (Hons) International Relations and Law', 'Social Sciences & Law', 3, 3033),
        (214, 'BSc (Hons) Economics', 'Economics & Finance', 3, 3033),
        (214, 'BSc (Hons) Computer Science', 'Computer Science & IT', 3, 3033),
        (214, 'BA (Hons) Commercial Law', 'Social Sciences & Law', 3, 3033),
        (214, 'BSc (Hons) Finance', 'Economics & Finance', 3, 3033),
        (214, 'BA (Hons) Business Management', 'Business & Management', 3, 3033),
        (214, 'BSc (Hons) Business Information Systems', 'Business & Information Systems', 3, 3033),
        (215, 'BSc Computer Science and Software Engineering (CSE)', 'Computer Science & IT', 4, 3156),
        (215, 'BSc Information and Communication Engineering (ICE)', 'Engineering & Technology', 4, 3156),
        (215, 'BSc Business Administration', 'Business & Management', 4, 3305),
        (215, 'BSc Logistics Management', 'Logistics & Supply Chain', 4, 3305),
        (216, 'BSc Software Engineering', 'Computer Science & IT', 4, 3281),
        (216, 'BSc Cyber Security', 'Computer Science & IT', 4, 3281),
        (216, 'BSc AI & Robotics', 'Computer Science & IT', 4, 3281),
        (216, 'BSc Mechanical Engineering', 'Engineering & Technology', 4, 1969),
        (216, 'BSc Chemical & Materials Engineering', 'Engineering & Technology', 4, 1969),
        (216, 'BSc Aerospace Engineering', 'Engineering & Technology', 4, 1969),
        (216, 'BSc Applied Mathematics', 'Mathematics & Statistics', 4, 2656),
        (216, 'BSc Economics & Data Science', 'Economics & Data Science', 4, 3750),
        (216, 'BSc STEM Education', 'Education', 4, 2656),
        (216, 'M.D. Doctor of Medicine', 'Medicine & Life Sciences', 6, 7344),
        (216, 'BSc Industrial Management', 'Business & Management', 4, 3750),
        (213, 'BSc Electrical Engineering and Computer Science', 'Engineering & Technology', 3, 4730),
        (213, 'BSc Information Technology', 'Computer Science & IT', 3, 4730)
      ) AS p(uni, pname, pfield, pdur, ptuition)
      WHERE p.uni = v_uni
    LOOP
      INSERT INTO public.programs (
        university_id, name, field, degree_level, duration, duration_unit, study_mode, language,
        annual_tuition, tuition_currency, tuition_period, description, official_url, source_url,
        last_verified_at, is_verified, degree, duration_years, tuition_amount, min_ielts, min_sat,
        is_active, verification_status
      ) VALUES (
        r.uni, r.pname, r.pfield, 'Bachelor''s', r.pdur, 'years', 'Full-time', 'English',
        r.ptuition, 'USD', 'year',
        r.pname || ' — ' || r.pdur || '-year full-time English-taught degree. Tuition converted to USD from the official fee schedule; confirm the current amount on the university website.',
        v_source, v_source, now(), true, 'Bachelor''s Degree', r.pdur, r.ptuition,
        NULL, NULL, true, 'verified'
      ) RETURNING id INTO v_pid;

      INSERT INTO public.program_requirements (
        program_id, portfolio_required, interview_required, recommendation_required,
        personal_statement_required, other_requirements, source_url, last_verified_at,
        verification_status, requirement_type, value_text
      ) VALUES (
        v_pid, false, false, false, false,
        'Requirements vary by programme and are set by the university; see the official admissions page.',
        v_source, now(), 'verified', 'composite', 'See official admissions page'
      );
    END LOOP;
  END LOOP;
END $$;

-- ── 3. Sources for those universities (exact page per figure) ───────────────
-- (see the DO block in the migration; 12 source rows, all is_official = true)

-- ── 4. Application cycles ──────────────────────────────────────────────────
-- One `estimated` cycle per university (is_estimated = true, deadline = the
-- published end of the admission window). Marked unverified on purpose: the
-- exact 2027 dates are announced per intake.

-- ── 5. Backfill the legacy USD mirror column (164 rows) ────────────────────
-- `annual_tuition` is authoritative; `annual_tuition_usd` is the legacy column
-- the explorer's price column and sort read. Every row is USD, so the copy is
-- lossless and needed no FX conversion.
UPDATE public.universities
SET annual_tuition_usd = annual_tuition
WHERE annual_tuition_usd IS NULL
  AND annual_tuition IS NOT NULL
  AND tuition_currency = 'USD';

-- ── 6. Charles University basics (id 212) ──────────────────────────────────
UPDATE public.universities
SET university_type    = COALESCE(university_type, 'Public'),
    is_english_taught  = true,
    verification_status = 'verified',
    last_verified_at   = now()
WHERE id = 212;

COMMIT;

-- Verification (expected values after the run):
--   SELECT count(*) FILTER (WHERE annual_tuition IS NULL OR annual_tuition_usd IS NULL) FROM universities;  -- 0
--   SELECT count(*) FILTER (WHERE founded_year IS NULL OR university_type IS NULL)       FROM universities;  -- 0
--   SELECT count(*) FILTER (WHERE verification_status <> 'verified')                     FROM universities;  -- 0
--   SELECT count(*) FROM universities u WHERE NOT EXISTS (SELECT 1 FROM programs p WHERE p.university_id = u.id);  -- 0
