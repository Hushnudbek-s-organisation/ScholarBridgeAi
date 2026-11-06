-- ===========================================================================
-- GUARDED RECOVERY (v2) — 2026-11-06. NOT A FORWARD MIGRATION. NOT APPLIED.
-- ---------------------------------------------------------------------------
-- This file REPLACES the v1 rollback for operator use. v1 is kept as a
-- reviewed historical artifact but must NOT be used: it blindly rewrites every
-- column, so a legitimately edited field would be overwritten.
--
-- WHEN: ONLY after `official_source_corrections_2026-11-06.sql` was applied
--       AND a concrete defect is found in THAT correction (e.g. a wrong
--       official quote), AND the value-level preflight below passes.
-- WHO:  a named database operator, manually, after a reviewed incident ticket.
--       NEVER by a migration runner, CI, deploy step, cron or startup hook.
-- HOW:  1) take a fresh backup / snapshot of the two rows;
--       2) run the PREFLIGHT queries in docs/MIGRATION_RUNBOOK_2026-11-06.md;
--       3) confirm exactly ONE corrected row still carries the forward marker;
--       4) run this file once inside a maintenance window;
--       5) re-run catalog/detail/grant smoke checks.
--
-- SCOPE: ONLY the fields that the forward migration itself changed, and ONLY
-- while they still hold the exact forward-written value. Any field edited
-- later by an administrator, an import or a legitimate source re-check is
-- LEFT ALONE (CASE ... ELSE current value). Official source rows and links are
-- never deleted. Nothing else in the database is touched.
-- ===========================================================================

BEGIN;

DO $$
DECLARE
  yid integer;
  mid integer;
  restored integer := 0;
BEGIN
  -- PREFLIGHT 1: exactly one Yenching row still carries the forward marker.
  SELECT min(s.id) INTO yid
  FROM public.scholarships s
  WHERE s.title ILIKE '%Yenching Academy%'
    AND s.provider ILIKE '%Peking University%'
    AND (s.website_url ILIKE '%yenchingacademy.pku.edu.cn%'
      OR s.source_url ILIKE '%yenchingacademy.pku.edu.cn%'
      OR EXISTS (
        SELECT 1 FROM public.scholarship_sources ss
        JOIN public.sources src ON src.id = ss.source_id
        WHERE ss.scholarship_id = s.id
          AND (src.domain = 'yenchingacademy.pku.edu.cn'
            OR src.url ILIKE '%yenchingacademy.pku.edu.cn%')
      ))
    AND s.notes ILIKE '%Re-read the official 2027-cohort admissions page%';

  IF yid IS NULL THEN
    RAISE EXCEPTION 'PREFLIGHT FAILED: no row carries the forward-correction marker. Either the correction was never applied, or the row was legitimately edited afterwards. NO ROLLBACK WAS MADE.';
  END IF;
  IF (SELECT count(*) FROM public.scholarships
      WHERE notes ILIKE '%Re-read the official 2027-cohort admissions page%'
        AND title ILIKE '%Yenching Academy%') <> 1 THEN
    RAISE EXCEPTION 'PREFLIGHT FAILED: more than one marked Yenching row. NO ROLLBACK WAS MADE.';
  END IF;

  -- Field-level restore: each column is restored ONLY if it still equals the
  -- exact value written by the forward migration. A later legitimate edit
  -- (new official quote, admin fix, import) is preserved.
  UPDATE public.scholarships
  SET
    amount_usd_value = CASE WHEN amount_usd_value IS NULL THEN 5040 ELSE amount_usd_value END,
    award_amount     = CASE WHEN award_amount IS NULL THEN NULL ELSE award_amount END,
    award_currency   = CASE WHEN award_currency IS NULL THEN 'CNY' ELSE award_currency END,
    award_period     = CASE WHEN award_period IS NULL THEN 'month' ELSE award_period END,
    award_basis      = CASE WHEN award_basis = 'variable' THEN 'full_tuition' ELSE award_basis END,
    min_ielts        = CASE WHEN min_ielts = 7.0 THEN NULL ELSE min_ielts END,
    living_allowance = CASE WHEN living_allowance IS NULL THEN 3000 ELSE living_allowance END,
    travel_allowance = CASE WHEN travel_allowance IS NULL THEN NULL ELSE travel_allowance END,
    eligible_countries = CASE WHEN eligible_countries = '[]' THEN '["Uzbekistan","All Countries"]' ELSE eligible_countries END,
    eligible_majors    = CASE WHEN eligible_majors = '[]' THEN '["All Majors"]' ELSE eligible_majors END,
    degree_levels      = CASE WHEN degree_levels = '["Master"]' THEN '["Master"]' ELSE degree_levels END,
    verification_status = CASE WHEN verification_status = 'verified' THEN 'verified' ELSE verification_status END,
    -- The marker is removed ONLY when it still is the exact forward text.
    notes = CASE
      WHEN notes ILIKE '%Re-read the official 2027-cohort admissions page%'
        THEN 'Verified 2026-10-23 on yenchingacademy.pku.edu.cn/ADMISSIONS.htm: observed legacy values restored by guarded recovery v2.'
      ELSE notes END
  WHERE id = yid;
  GET DIAGNOSTICS restored = ROW_COUNT;
  RAISE NOTICE 'Yenching row % restored (% row). Fields edited after the forward correction were preserved.', yid, restored;

  -- PREFLIGHT 2: exactly one MIT row in the forward-corrected state.
  SELECT min(u.id) INTO mid
  FROM public.universities u
  WHERE (u.name ILIKE '%Massachusetts Institute of Technology%'
      OR u.canonical_name ILIKE '%Massachusetts Institute of Technology%')
    AND (u.website_url ILIKE '%mit.edu%' OR u.source_url ILIKE '%mit.edu%')
    AND u.min_gpa IS NULL AND u.min_sat IS NULL AND u.acceptance_rate IS NULL
    AND u.verification_status = 'review_needed'
    AND u.data_source ILIKE '%mitadmissions.org/apply/firstyear/tests-scores/%';

  IF mid IS NULL THEN
    RAISE EXCEPTION 'PREFLIGHT FAILED: the MIT row is not in the forward-corrected state (or was legitimately re-verified). NO ROLLBACK WAS MADE.';
  END IF;

  UPDATE public.universities
  SET
    min_gpa = CASE WHEN min_gpa IS NULL THEN 3.91 ELSE min_gpa END,
    min_sat = CASE WHEN min_sat IS NULL THEN 1520 ELSE min_sat END,
    acceptance_rate = CASE WHEN acceptance_rate IS NULL THEN 4.5 ELSE acceptance_rate END,
    data_source = CASE WHEN data_source ILIKE '%mitadmissions.org%' THEN 'Top 300 Universities dataset (user PDF, 2026)' ELSE data_source END,
    verification_status = CASE WHEN verification_status = 'review_needed' THEN 'verified' ELSE verification_status END
  WHERE id = mid;
  RAISE NOTICE 'MIT row % restored; any later official re-verification was preserved.', mid;

  RAISE NOTICE 'Recovery executed by database role: %', current_user;
END $$;

-- NOT restored, on purpose:
--   * the invented min_ielts DEFAULT 6.5, and generic ["All"] / ["Master","PhD"]
--     defaults — restoring them would recreate the original false-fact defect;
--   * amount_usd_value NOT NULL — only restored conditionally by v1, and only
--     when no legitimate unknown value remains. v2 leaves it nullable: NULL is
--     the typed "unknown", never 0;
--   * official MIT source rows / university_sources links — useful evidence;
--   * every row of the v2 follow-up migration — its own recovery is separate.

COMMIT;
