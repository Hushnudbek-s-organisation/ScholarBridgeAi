-- ============================================================================
-- Deadline correctness sweep (2026-10-23)
--
-- Checked every deadline-bearing column in the catalogue: expired dates, dates
-- that contradict the award's own published rule, fabricated placeholders, and
-- application cycles that were seeded with one constant for every university.
--
-- Findings (live project zkdguzbdopfedkffsatk, today = 2026-10-23):
--   • 195 scholarships stated a real annual rule in `deadline` text
--     ("December 15 annually", "January 20 annually") while `deadline_date` held
--     the SAME 2027-01-31 for all of them → the Deadline Center showed every one
--     of them on 31 January and computed open/closed from the wrong day.
--   • 51 scholarships carried a placeholder 2027-01-31 as both text and date,
--     labelled deadline_type = 'fixed' and application_status = 'open'.
--   • 6 rolling awards carried a fixed date; 10 two-date cycles carried one
--     arbitrary half of the rule; 3 award deadlines were genuinely undatable.
--   • 196 scholarships had an `opening_date` in 2024 in front of a 2027 deadline
--     (a 2.5-year application window that never existed).
--   • 2774 application cycles (217 universities) had an identical
--     "Fall 2027 / Regular Decision" row: opening 2026-09-01, deadline
--     2027-01-15, is_estimated = false, verification_status = 'verified'.
--   • 2764 programmes had the same constant in `programs.application_deadline`
--     (written by data/supabase_enrichment.sql).
--   • No expired deadlines existed in either table — verified, not assumed.
-- ============================================================================

BEGIN;

-- ── 1. Annual rules: use the NEXT occurrence of the stated day ─────────────
WITH parsed AS (
  SELECT id,
    CASE lower(split_part(deadline, ' ', 1))
      WHEN 'january' THEN 1 WHEN 'february' THEN 2 WHEN 'march' THEN 3
      WHEN 'april' THEN 4 WHEN 'may' THEN 5 WHEN 'june' THEN 6
      WHEN 'july' THEN 7 WHEN 'august' THEN 8 WHEN 'september' THEN 9
      WHEN 'october' THEN 10 WHEN 'november' THEN 11 WHEN 'december' THEN 12
    END AS mon,
    NULLIF(regexp_replace(split_part(deadline, ' ', 2), '\D', '', 'g'), '')::int AS day
  FROM public.scholarships
  WHERE is_active
    AND deadline ~* '^(january|february|march|april|may|june|july|august|september|october|november|december)[[:space:]]+\d{1,2}[[:space:]]+annually$'
), dated AS (
  SELECT id,
    make_date(date_part('year', current_date)::int, mon, day) AS this_year,
    make_date(date_part('year', current_date)::int + 1, mon, day) AS next_year
  FROM parsed
)
UPDATE public.scholarships s
SET deadline_date = CASE WHEN d.this_year >= current_date THEN d.this_year ELSE d.next_year END,
    deadline_type = 'fixed',
    last_updated_at = now()
FROM dated d
WHERE s.id = d.id;

-- ── 2. Rolling awards carry no single date ────────────────────────────────
UPDATE public.scholarships
SET deadline_date = NULL, opening_date = NULL,
    application_status = 'rolling', deadline_type = 'rolling', last_updated_at = now()
WHERE id IN (15, 346, 377, 414, 424, 425);   -- NUS, Oslo, UCPH, DTU, Bergen, NTNU

-- ── 3. Two-date annual cycles: keep the NEXT occurrence ───────────────────
UPDATE public.scholarships AS s
SET deadline_date = v.next_date, deadline_type = 'fixed',
    notes = coalesce(s.notes,'') || ' | 2026-10-23: deadline_date is the next occurrence of the annual cycle stated in the deadline text.',
    last_updated_at = now()
FROM (VALUES
  (310, DATE '2027-03-25'), (317, DATE '2027-04-15'), (321, DATE '2027-03-31'),
  (416, DATE '2027-02-01'), (429, DATE '2027-04-15'), (436, DATE '2027-03-01'),
  (437, DATE '2027-01-31'), (451, DATE '2027-03-31'), (452, DATE '2027-04-15'),
  (453, DATE '2027-03-15')
) AS v(id, next_date)
WHERE s.id = v.id;

-- ── 4. One unambiguous rule → a date; the rest → honest text ──────────────
UPDATE public.scholarships
SET deadline_date = DATE '2026-12-01', deadline_type = 'fixed', last_updated_at = now()
WHERE id = 506;                              -- "Annually, applications by 1 December"

UPDATE public.scholarships
SET deadline_date = NULL, deadline_type = 'estimated', application_status = 'upcoming',
    notes = coalesce(notes,'') || ' | 2026-10-23: exact date varies and is not published; the placeholder 2027-01-31 was removed.',
    last_updated_at = now()
WHERE id IN (7, 485);                        -- "October (varies by country)", "Annually in May/June…"

UPDATE public.scholarships
SET deadline_date = NULL, opening_date = NULL, deadline_type = 'estimated',
    application_status = 'upcoming',
    notes = coalesce(notes,'') || ' | 2026-10-23: the date varies by country and was removed; check the Swiss embassy page for your country.',
    last_updated_at = now()
WHERE id = 14;                               -- Swiss Government Excellence Scholarships

-- ── 5. Placeholder rows presented as fixed/dead "open" ────────────────────
UPDATE public.scholarships
SET deadline = 'Not published — confirm the current cycle on the official page',
    deadline_date = NULL, opening_date = NULL,
    deadline_type = 'unknown', application_status = 'unknown',
    notes = coalesce(notes, '') || ' | 2026-10-23: the placeholder date 2027-01-31 was removed; no cycle deadline is published for this award.',
    last_updated_at = now()
WHERE is_active AND deadline = '2027-01-31' AND deadline_date = '2027-01-31' AND notes IS NULL;

-- ── 6. Fabricated 2024 opening dates (2.5-year "windows") ─────────────────
UPDATE public.scholarships
SET opening_date = NULL, last_updated_at = now()
WHERE is_active AND opening_date IS NOT NULL AND deadline_date IS NOT NULL
  AND deadline_date - opening_date > 400;

-- ── 7. ISO dates shown as text, without a date column ─────────────────────
UPDATE public.scholarships
SET deadline = 'Expected end of July 2027 (not yet published)',
    deadline_type = 'estimated', application_status = 'upcoming',
    notes = coalesce(notes,'') || ' | 2026-10-23: no 2027/28 call is published yet; the placeholder date was removed.',
    last_updated_at = now()
WHERE id IN (871, 872, 874);
UPDATE public.scholarships
SET deadline = 'Expected end of August 2027 (not yet published)',
    deadline_type = 'estimated', application_status = 'upcoming',
    notes = coalesce(notes,'') || ' | 2026-10-23: no 2027/28 call is published yet; the placeholder date was removed.',
    last_updated_at = now()
WHERE id = 873;

-- ── 8. Application cycles: one constant for 217 universities ──────────────
-- Not deleted — many of these universities do have a mid-January window — but
-- marked for what they are: unverified estimates. The 11 Stipendium Hungaricum
-- rows with 15 January are a real published deadline and stay verified.
UPDATE public.application_cycles
SET is_estimated = true, is_verified = false, verification_status = 'unverified',
    notes = coalesce(nullif(btrim(notes), ''), '') ||
      CASE WHEN coalesce(btrim(notes),'') = '' THEN '' ELSE ' ' END ||
      'Generic Fall-2027 catalogue window (15 January) — the exact deadline is NOT verified for this programme; confirm it with the university.',
    last_verified_at = NULL
WHERE deadline = '2027-01-15'
  AND deadline_type = 'Regular Decision'
  AND is_estimated = false;

-- ── 9. Programmes: same constant as an exact-looking deadline ─────────────
UPDATE public.programs
SET application_deadline = NULL
WHERE application_deadline = '2027-01-15';

COMMIT;

-- Verification after the run (2026-10-23):
--   scholarships active ............................. 643
--   scholarships with a date ........................ 421
--   scholarships expired ............................ 0
--   deadline_type='fixed' without a date ............ 0
--   rolling awards with a date ...................... 0
--   application cycles .............................. 3042
--   ... verified and in the future .................. 171
--   ... expired ..................................... 0
--   programmes with a real application_deadline ..... 84
