-- Reviewable data correction — 2026-11-06 (NOT APPLIED BY THE AGENT)
-- ---------------------------------------------------------------------------
-- WHY: the live Supabase project was inspected read-only on 2026-11-06. Two
-- exact rows still contradict the official pages:
--   * scholarships.id = 894 (Yenching): amount_usd_value = 5040,
--     award_period = 'month', living_allowance = 3000, min_ielts IS NULL,
--     english_requirements = '... official page does not publish minimum scores',
--     eligible_countries contains 'All Countries'/'Uzbekistan',
--     eligible_majors contains 'All Majors', required_documents is a generic
--     high-school/undergraduate template, and notes claim no minimum scores.
--   * universities.id = 1 (MIT): min_gpa = 3.91, min_sat = 1520,
--     acceptance_rate = 4.5, data_source = 'Top 300 Universities dataset
--     (user PDF, 2026)', source_url = 'https://www.mit.edu',
--     verification_status = 'verified'.
-- Official MIT admissions pages publish no SAT/ACT or GPA cutoffs; Yenching's
-- official 2027-cohort page publishes IELTS Academic 7.0 and lists fellowship
-- components without a numeric stipend. A failed automatic check must never
-- refresh last_verified_at.
--
-- SCOPE: two catalogue rows + three official source links only. No student row,
-- no delete, no truncate, no drop table, no bulk replacement, no rank change,
-- no overwriting an administrator-corrected row without the guard below.
-- The three schema statements are required because the live table currently
-- makes amount_usd_value NOT NULL and injects generic defaults 6.5 / ["All"] /
-- ["Master","PhD"] into every new scholarship. They must be reviewed with the
-- same care as the data updates; they are NOT applied here.
--
-- TABLE-LEVEL EFFECTS (all new rows, admin forms and imports):
--   * DROP NOT NULL drops ONLY the constraint, not the column or table. NULL
--     is the typed value "unknown"; it is never coerced to 0 by the app.
--   * DROP DEFAULT removes the invented IELTS 6.5 minimum. Existing rows keep
--     their stored values; new rows without an explicit value are NULL.
--   * '[]' is an UNKNOWN / NOT-YET-SPECIFIED scope, NOT "all majors" and NOT
--     "all degrees". An explicitly unrestricted scope must be stored as
--     ["*"] with a source-backed evidence record; ["__not_applicable__"]
--     means the dimension does not apply. Legacy ["All"] values are not
--     silently rewritten here; they remain review-needed.
--   * Old code that expects a 6.5 default still receives a NULL and must show
--     unknown; new code must not turn a NULL into an official minimum or an
--     eligibility match. A failed automatic check never updates verified_at.
--   * The value-level rollback is reviewable in
--     supabase/official_source_corrections_2026-11-06_rollback.sql. Reverting
--     NULL to NOT NULL is intentionally NOT automatic: any row legitimately
--     marked unknown must be resolved first.
--
-- STATUS: NOT APPLIED. Production DB writes, deploy and data-owner sign-off are
-- explicitly out of scope until the user gives a separate instruction.
-- ---------------------------------------------------------------------------

BEGIN;

-- Schema drift observed on the live project; keep unknown costs/eligibility
-- unknown instead of substituting 0, 6.5, "All" or a generic degree list.
ALTER TABLE public.scholarships
  ALTER COLUMN amount_usd_value DROP NOT NULL;
ALTER TABLE public.scholarships
  ALTER COLUMN min_ielts DROP DEFAULT;
ALTER TABLE public.scholarships
  ALTER COLUMN eligible_majors SET DEFAULT '[]'::text;
ALTER TABLE public.scholarships
  ALTER COLUMN degree_levels SET DEFAULT '[]'::text;

DO $$
DECLARE
  yenching_candidates integer;
  yenching_unresolved integer;
  yenching_corrected integer;
  yenching_id integer;
  mit_candidates integer;
  mit_unresolved integer;
  mit_corrected integer;
  mit_id integer;
BEGIN
  -- ---------------------------------------------------------------------
  -- 1. Yenching Academy Fellowship — 2027 cohort, master's level only.
  --    Guard by title + provider + official-domain source relation, not by
  --    id = 894. Abort safely when zero or multiple plausible rows exist.
  -- ---------------------------------------------------------------------
  SELECT count(*), min(s.id)
  INTO yenching_candidates, yenching_id
  FROM public.scholarships s
  WHERE s.title ILIKE '%Yenching Academy%'
    AND s.provider ILIKE '%Peking University%'
    AND (
      s.website_url ILIKE '%yenchingacademy.pku.edu.cn%'
      OR s.source_url ILIKE '%yenchingacademy.pku.edu.cn%'
      OR EXISTS (
        SELECT 1
        FROM public.scholarship_sources ss
        JOIN public.sources src ON src.id = ss.source_id
        WHERE ss.scholarship_id = s.id
          AND (src.domain = 'yenchingacademy.pku.edu.cn'
            OR src.url ILIKE '%yenchingacademy.pku.edu.cn%')
      )
    );

  IF yenching_candidates <> 1 THEN
    RAISE EXCEPTION 'Yenching guard found % candidate rows; expected exactly one. No update was made.', yenching_candidates;
  END IF;

  SELECT count(*) INTO yenching_unresolved
  FROM public.scholarships s
  WHERE s.id = yenching_id
    AND (s.amount_usd_value = 5040
      OR s.award_period = 'month'
      OR s.living_allowance = 3000
      OR s.min_ielts IS NULL
      OR s.english_requirements ILIKE '%does not publish%'
      OR s.notes ILIKE '%does not print%'
      OR s.eligible_countries LIKE '%All Countries%'
      OR s.eligible_majors LIKE '%All Majors%');

  SELECT count(*) INTO yenching_corrected
  FROM public.scholarships s
  WHERE s.id = yenching_id
    AND s.amount_usd_value IS NULL
    AND s.min_ielts = 7.0
    AND s.verification_status = 'verified'
    AND s.source_url = 'https://yenchingacademy.pku.edu.cn/ADMISSIONS.htm'
    AND s.notes ILIKE '%Re-read the official 2027-cohort admissions page%';

  IF yenching_unresolved = 1 THEN
    UPDATE public.scholarships
    SET
      amount_usd_value = NULL,
      award_amount = NULL,
      award_currency = NULL,
      award_period = NULL,
      award_basis = 'variable',
      min_ielts = 7.0,
      english_requirements = 'Official 2027-cohort minimum: IELTS Academic 7.0; TOEFL iBT overall 5 on the new scale (legacy 100+ only for tests taken 1 Sep 2025–21 Jan 2026); Cambridge C1 Advanced 185; CET-6 600; TEM-4 “Good” or above. Score reports must arrive directly from the test provider by the application deadline; waivers apply only under the published conditions. See the official admissions page.',
      living_allowance = NULL,
      travel_allowance = NULL,
      accommodation = 'Accommodation is included; no numeric amount is published.',
      tuition_coverage = 'Full tuition for the published fellowship',
      coverage_type = 'Tuition + accommodation + monthly stipend + one round-trip airfare + field-study costs (numeric amounts not published)',
      funding_type = 'Fellowship / grant (not a loan or reimbursement)',
      eligible_countries = '[]',
      eligible_majors = '[]',
      degree_levels = '["Master"]',
      required_documents = '["Completed online application form","Bachelor degree certificate or proof of expected graduation by August 2027","Undergraduate transcript","Personal statement / essays responding to the published prompts","Curriculum vitae","Two letters of recommendation","Proof of English proficiency meeting the published minimum or an official waiver","Passport or identity document","Partner-university pre-selection evidence where applicable"]',
      description = 'Yenching Academy at Peking University is a two-year, English-taught, residential master''s fellowship. The 2027-cohort cycle opened on 1 September 2026; the final deadline is 30 November 2026 at 09:00 Beijing time. About 120 new scholars are admitted each year and roughly 75% are international. Applicants must hold, or expect to hold by August of the entry year, a bachelor''s degree; there is no published age cut-off. Partner-university candidates also pass their institution''s pre-selection.',
      requirements = 'Hold a bachelor''s degree by August 2027; demonstrate English proficiency at the published minimum or qualify for a waiver; complete the online application with degree evidence, undergraduate transcript, CV, essays, two recommendations and identity document. Final-year undergraduates may apply with expected-graduation evidence. Partner pre-selection is an additional requirement where applicable. The fellowship covers tuition, accommodation, a monthly stipend, one round-trip airfare and field-study costs, but numeric stipend/airfare amounts are not published.',
      notes = 'Re-read the official 2027-cohort admissions page on 2026-11-06. Official minimums are published; the earlier “not published” claim was incorrect. Numeric amount 5,040 per month and living_allowance 3,000 were not found on the official page and are removed. No invented medical-insurance, country-cap, major-list or “All countries / full tuition” claim is kept. Deadline timezone is Beijing time. Numeric award values remain unknown, not zero.',
      last_verified_at = TIMESTAMP '2026-11-06 00:00:00',
      verification_status = 'verified',
      source_url = 'https://yenchingacademy.pku.edu.cn/ADMISSIONS.htm'
    WHERE id = yenching_id;
  ELSIF yenching_corrected <> 1 THEN
    RAISE EXCEPTION 'Yenching row % is neither the observed unresolved row nor the already-corrected row; no update was made.', yenching_id;
  END IF;

  -- ---------------------------------------------------------------------
  -- 2. MIT — remove third-party PDF cutoffs and unverified admitted-cohort
  --    statistic. Guard by university name + official-domain relation.
  --    Do not claim the QS rank itself was re-verified here.
  -- ---------------------------------------------------------------------
  SELECT count(*), min(u.id)
  INTO mit_candidates, mit_id
  FROM public.universities u
  WHERE (u.name ILIKE '%Massachusetts Institute of Technology%'
      OR u.canonical_name ILIKE '%Massachusetts Institute of Technology%')
    AND (
      u.website_url ILIKE '%mit.edu%'
      OR u.source_url ILIKE '%mit.edu%'
      OR EXISTS (
        SELECT 1 FROM public.university_sources us
        JOIN public.sources src ON src.id = us.source_id
        WHERE us.university_id = u.id
          AND (src.url ILIKE '%mit.edu%' OR src.url ILIKE '%mitadmissions.org%'
            OR src.domain = 'mit.edu' OR src.domain = 'mitadmissions.org')
      )
    );

  IF mit_candidates <> 1 THEN
    RAISE EXCEPTION 'MIT guard found % candidate rows; expected exactly one. No update was made.', mit_candidates;
  END IF;

  SELECT count(*) INTO mit_unresolved
  FROM public.universities u
  WHERE u.id = mit_id
    AND (u.min_gpa = 3.91 OR u.min_sat = 1520 OR u.acceptance_rate = 4.5);

  SELECT count(*) INTO mit_corrected
  FROM public.universities u
  WHERE u.id = mit_id
    AND u.min_gpa IS NULL
    AND u.min_sat IS NULL
    AND u.acceptance_rate IS NULL
    AND u.verification_status = 'review_needed'
    AND u.data_source ILIKE '%mitadmissions.org/apply/firstyear/tests-scores/%';

  IF mit_unresolved = 1 THEN
    UPDATE public.universities
    SET
      min_gpa = NULL,
      min_sat = NULL,
      acceptance_rate = NULL,
      data_source = CONCAT_WS(' | ',
        COALESCE(data_source, ''),
        'Official MIT first-year testing page (no SAT/ACT or GPA cutoff; IELTS 7 minimum, 7.5 recommended on the pre-21-Jan-2026 scale): https://mitadmissions.org/apply/firstyear/tests-scores/',
        'Official MIT international-applicant page (SAT/ACT required; no country quota, no GPA cutoff; transcript covers three years of grades): https://mitadmissions.org/apply/firstyear/international/'
      ),
      -- Keep the existing last_verified_at and QS 2026 rank fields untouched:
      -- this update removes disproven fields, it is not a full official
      -- re-verification of every university value.
      verification_status = 'review_needed'
    WHERE id = mit_id;
  ELSIF mit_corrected <> 1 THEN
    RAISE EXCEPTION 'MIT row % is neither the observed unresolved row nor the already-corrected row; no update was made.', mit_id;
  END IF;

  -- ---------------------------------------------------------------------
  -- 3. Add official source rows and link them to MIT, idempotently.
  -- ---------------------------------------------------------------------
  INSERT INTO public.sources (url, title, domain, source_type, accessed_at, is_official, is_verified)
  VALUES
    ('https://mitadmissions.org/apply/firstyear/tests-scores/', 'MIT Admissions — First-year tests & scores', 'mitadmissions.org', 'official_requirement', TIMESTAMP '2026-11-06 00:00:00', TRUE, TRUE),
    ('https://mitadmissions.org/apply/firstyear/international/', 'MIT Admissions — International applicants', 'mitadmissions.org', 'official_requirement', TIMESTAMP '2026-11-06 00:00:00', TRUE, TRUE)
  ON CONFLICT (url) DO UPDATE SET
    title = EXCLUDED.title,
    domain = EXCLUDED.domain,
    source_type = EXCLUDED.source_type,
    accessed_at = EXCLUDED.accessed_at,
    is_official = EXCLUDED.is_official,
    is_verified = EXCLUDED.is_verified;

  INSERT INTO public.university_sources (university_id, source_id, source_type)
  SELECT mit_id, s.id, 'official_requirement'
  FROM public.sources s
  WHERE s.url IN (
    'https://mitadmissions.org/apply/firstyear/tests-scores/',
    'https://mitadmissions.org/apply/firstyear/international/'
  )
  AND NOT EXISTS (
    SELECT 1 FROM public.university_sources us
    WHERE us.university_id = mit_id AND us.source_id = s.id
  );
END $$;

COMMIT;

-- Reviewer notes / still review-needed (NOT applied):
--   * The live QS rank row is explicitly "QS World University Rankings 2026"
--     (university_rankings.id = 1, verified 2026-10-31). The repository seed
--     was corrected to the same 2026 edition; do not mix 2026 rank columns
--     with an undated or 2027 source URL.
--   * Live universities: 356 rows, all marked "verified", but 352 have min_gpa,
--     252 have min_sat and 352 have acceptance_rate. Any blanket claim that
--     every number is verified is unsupported. Each value needs its own
--     typed evidence record before it can be trusted; see the separate
--     catalogue_facts / review-needed migration.
--   * Duplicate MIT MBA programs, $5,040 wording in channel material, generic
--     document templates and "All Countries"/"full funding" claims remain in
--     the review-needed list. A failed automatic check must NOT update
--     last_verified_at. No blanket "all data verified" claim is made.
-- ===========================================================================
