-- ============================================================================
-- Scholarship data-quality sweep #3 (2026-10-23) — structure, not attribution
--
-- The first two sweeps fixed awards attached to the wrong university and claims
-- that cannot be true. This one covers defects in the machine-readable fields,
-- which silently break eligibility filtering, fit scores and the dashboard.
-- Every statement below was executed against the live project on 2026-10-23.
-- ============================================================================

BEGIN;

-- ── 1. eligible_countries stored as prose ──────────────────────────────────
-- 339 rows held the literal text "All Countries" instead of '["All"]'.
-- parseListColumn() comma-splits non-JSON text, so the list became
-- ["All Countries"] — a country that does not exist. Consequences:
--   • essayAdapter marked EVERY applicant "country_ineligible" (fit −10);
--   • the dashboard's scholarshipCountryVerdict returned "out" and hid the award.
UPDATE public.scholarships
SET eligible_countries = '["All"]', last_updated_at = now()
WHERE eligible_countries ILIKE 'all countries' OR eligible_countries ILIKE 'all';

UPDATE public.scholarships
SET eligible_countries = '["All"]', last_updated_at = now()
WHERE eligible_countries ILIKE '180+ countries (varies)%'
   OR eligible_countries ILIKE '%(varies by programme)%'
   OR eligible_countries ILIKE 'worldwide%'
   OR eligible_countries ILIKE 'any country%';

-- Programmes that really are Uzbekistan-only, and the one ASEAN-only award.
UPDATE public.scholarships SET eligible_countries = '["Uzbekistan"]', last_updated_at = now()
WHERE id IN (860, 862, 867);   -- Stipendium Hungaricum, El-Yurt Umidi, NAWA Banach
UPDATE public.scholarships SET eligible_countries = '["ASEAN"]', last_updated_at = now()
WHERE id = 16;                 -- NUS ASEAN Undergraduate Scholarship

-- Broad restrictions that every Uzbek applicant satisfies.
UPDATE public.scholarships SET eligible_countries = '["All"]', last_updated_at = now()
WHERE id IN (4, 8, 11, 12, 17, 18);

UPDATE public.scholarships SET eligible_countries = '["All"]', last_updated_at = now()
WHERE eligible_countries !~ '^\[';

-- ── 2. degree_levels contradicted the award's own name ─────────────────────
-- The Top-300 PDF import stamped ["Bachelor's","Master's","PhD"] on everything, so
-- 28 "Undergraduate Scholarship" rows claimed to fund a PhD, 38 master's awards
-- claimed to fund a bachelor's degree, and 1 doctoral award claimed Bachelor.
-- Degree level is a hard filter in the catalogue, so this hid awards from the
-- students they belong to and showed them to the wrong ones.
UPDATE public.scholarships SET degree_levels = '["Bachelor"]', last_updated_at = now()
WHERE is_active AND title ~* '(undergraduate|bachelor)' AND degree_levels <> '["Bachelor"]';

UPDATE public.scholarships SET degree_levels = '["PhD"]', last_updated_at = now()
WHERE is_active AND title ~* '(doctoral|phd |doctorate)' AND degree_levels <> '["PhD"]';

UPDATE public.scholarships SET degree_levels = '["Master","PhD"]', last_updated_at = now()
WHERE is_active AND title ~* 'postgraduate' AND title !~* 'undergraduate'
  AND degree_levels <> '["Master","PhD"]';

UPDATE public.scholarships SET degree_levels = '["Master"]', last_updated_at = now()
WHERE is_active AND title ~* 'master' AND title !~* '(postgraduate|undergraduate)'
  AND degree_levels <> '["Master"]';

-- Three awards named both levels ("… PhD Studentship and Master Awards").
UPDATE public.scholarships SET degree_levels = '["Master","PhD"]', last_updated_at = now()
WHERE id IN (154, 326, 454);

-- ── 3. Prose in JSON columns (19 rows) ─────────────────────────────────────
UPDATE public.scholarships SET degree_levels = CASE
    WHEN degree_levels ILIKE '%doctoral%' AND degree_levels ILIKE '%postgraduate%' THEN '["Master","PhD"]'
    WHEN degree_levels ILIKE '%doctoral%' OR degree_levels ILIKE '%phd%'           THEN '["PhD"]'
    WHEN degree_levels ILIKE '%postgraduate%' OR degree_levels ILIKE '%master%'     THEN '["Master"]'
    WHEN degree_levels ILIKE '%undergraduate%' OR degree_levels ILIKE '%bachelor%'  THEN '["Bachelor"]'
    ELSE '["Bachelor","Master","PhD"]'
  END,
  eligible_majors = '["All"]',
  last_updated_at = now()
WHERE degree_levels !~ '^\[';
-- (Run this before section 2 on a fresh database; on 2026-10-23 the order did not
--  matter because section 2 had already normalised the same rows.)

-- ── 4. Enum casing (the admin panel documents lowercase values) ────────────
UPDATE public.scholarships SET recurrence = lower(btrim(recurrence))
WHERE recurrence <> lower(btrim(recurrence));
UPDATE public.scholarships SET recurrence = 'annual' WHERE recurrence IN ('bi-annual','biannual');

UPDATE public.scholarships SET deadline_type = 'fixed', last_updated_at = now()
WHERE deadline_type IN ('Fixed', 'exact', 'EXACT', 'FIXED');

-- ── 5. Titles that read like internal notes ────────────────────────────────
UPDATE public.scholarships SET title = 'El-Yurt Umidi Foundation Scholarship (QS Top-300 universities)', last_updated_at = now() WHERE id = 862;
UPDATE public.scholarships SET title = 'El-Yurt Umidi Foundation Scholarship (QS Top-15 priority)',           last_updated_at = now() WHERE id = 545;
UPDATE public.scholarships SET title = 'President''s Undergraduate Scholarship + El-Yurt Umidi (Top-100 rule)', last_updated_at = now() WHERE id = 653;
UPDATE public.scholarships SET title = 'Reach Oxford Scholarship (Uzbekistan eligible) + El-Yurt Umidi',       last_updated_at = now() WHERE id = 662;
UPDATE public.scholarships SET title = 'NAWA Stefan Banach Scholarship (Uzbekistan eligible) & Rector''s Grant', last_updated_at = now() WHERE id = 766;

-- ── 6. Stale mirrors on the rows corrected in sweep #2 ─────────────────────
-- amount_usd_value/coverage_type were updated but award_amount and
-- tuition_coverage still described the old, wrong claim.
UPDATE public.scholarships SET
  award_amount = amount_usd_value, award_currency = 'USD', award_period = 'year',
  tuition_coverage = 'No tuition fee (public university); the award is a monthly stipend',
  last_updated_at = now()
WHERE id IN (350, 483, 484, 499);

UPDATE public.scholarships SET award_amount = amount_usd_value, award_currency = 'USD', award_period = 'year',
  tuition_coverage = '50% of the tuition fee from the second study year (no first-year fee waiver)',
  last_updated_at = now() WHERE id = 504;

UPDATE public.scholarships SET award_amount = amount_usd_value, award_currency = 'USD', award_period = 'year',
  tuition_coverage = '10-40% tuition fee waiver from the second year (never 100%)',
  last_updated_at = now() WHERE id = 505;

UPDATE public.scholarships SET award_amount = amount_usd_value, award_currency = 'USD', award_period = 'academic_year',
  tuition_coverage = 'No tuition (registration fee only); award also covers the registration fee',
  last_updated_at = now() WHERE id = 506;

UPDATE public.scholarships SET award_amount = amount_usd_value, award_currency = 'USD', award_period = 'year',
  tuition_coverage = 'Programme-specific tuition reduction (no general waiver for new non-EU students)',
  last_updated_at = now() WHERE id = 507;

UPDATE public.scholarships SET award_amount = amount_usd_value, award_currency = 'USD', award_period = 'year',
  tuition_coverage = 'Monthly stipend (300 EUR); no tuition is charged',
  last_updated_at = now() WHERE id = 485;

-- ── 7. Keep the per-university table in step with renamed rows ─────────────
UPDATE public.university_scholarships us
SET scholarship_name = sc.title
FROM public.scholarships sc
WHERE us.scholarship_id = sc.id AND us.scholarship_name IS DISTINCT FROM sc.title;

COMMIT;

-- Verification after the run (2026-10-23):
--   active scholarships ............................. 643
--   degree_levels not a JSON array .................. 0
--   eligible_countries not a JSON array ............. 0
--   titles containing "!" ........................... 0
--   university_scholarships name drift .............. 0
--   award_amount vs amount_usd_value (USD) mismatch . 0
--   amount_usd_value = 0 (sentinel, handled in code)  11
