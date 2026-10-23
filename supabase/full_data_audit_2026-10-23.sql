-- ============================================================================
-- Full data audit and repair — 2026-10-23
--
-- Scope: every active scholarship and every university in the catalogue.
-- Checks that came back CLEAN are listed at the bottom; this file contains only
-- the statements that changed data.
-- ============================================================================

-- 1. Non-USD awards were copied into the USD column --------------------------
-- 12 rows stored a EUR/GBP/CHF/NZD figure in amount_usd_value without any
-- conversion (e.g. EUR 10,225 stored as "USD 10,225"). No exchange rate is
-- published anywhere in the catalogue, so the honest value is 0 = "no USD
-- figure published"; the award itself is still shown from award_amount +
-- award_currency.
UPDATE scholarships
SET amount_usd_value = 0, last_updated_at = '2026-10-23'
WHERE is_active
  AND award_currency IS NOT NULL
  AND award_currency <> 'USD'
  AND amount_usd_value > 0;

-- 2. required_documents was free text, not a JSON array ---------------------
-- 19 rows stored "CSS Profile, FAFSA (US), ..." instead of ["CSS Profile", ...].
-- The API and the detail page both accept a JSON array; a comma-split string was
-- only tolerated by one code path.
UPDATE scholarships
SET required_documents = to_json(string_to_array(required_documents, ', '))::text,
    last_updated_at = '2026-10-23'
WHERE is_active
  AND required_documents IS NOT NULL
  AND required_documents <> '[]'
  AND NOT (required_documents ~ '^\[.*\]$');

-- 3. "Rolling" award with a fixed priority date -----------------------------
-- The stored date is real (the priority date) but the label read as if the whole
-- award were undated.
UPDATE scholarships
SET deadline = 'Priority deadline 1 November 2026; applications otherwise assessed on a rolling basis',
    notes = coalesce(notes, '') || ' Deadline text clarified 2026-10-23: the stored date is the published priority date, while applications themselves are assessed on a rolling basis.'
WHERE id IN (538, 628);

-- 4. Four universities had no official website ------------------------------
-- Each address below is the institution's own site (verified 2026-10-23:
-- cvut.cz, wiut.uz, inha.uz, newuu.uz).
UPDATE universities SET official_website_url = 'https://www.cvut.cz/en' WHERE id = 213;
UPDATE universities SET official_website_url = 'https://www.wiut.uz'     WHERE id = 214;
UPDATE universities SET official_website_url = 'https://inha.uz'         WHERE id = 215;
UPDATE universities SET official_website_url = 'https://newuu.uz'        WHERE id = 216;

-- 5. Gates Cambridge deadline caveat ---------------------------------------
-- The stored date is the main funding round for most Cambridge courses; the
-- exact date is set per course in the Cambridge course directory.
UPDATE scholarships
SET notes = coalesce(notes, '') || ' Deadline check 2026-10-23: Gates Cambridge deadlines follow the Cambridge course directory - the date stored here is the main funding round for most courses; applicants on a course with a different funding deadline must use that course date.'
WHERE id = 11;

-- ============================================================================
-- Audited and CLEAN on 2026-10-23 (no rows returned by the check):
--   * active scholarships with a deadline_date in the past ............ 0
--   * deadline_date more than two years away .......................... 0
--   * deadline text naming a different year than deadline_date ........ 0
--   * deadline_type = fixed with no date ............................. 0
--   * duplicate active titles (case-insensitive) ...................... 0
--   * duplicate (university, title) pairs ............................. 0
--   * scholarship country differing from its university's country ..... 0
--   * empty provider / description / requirements / website ........... 0
--   * non-http website, source or application URLs .................... 0
--   * invalid degree_levels / eligible_majors / eligible_countries .... 0
--   * min_ielts outside 0-9, min_gpa outside 0-4 ...................... 0
--   * award_basis / award_period outside the accepted set ............. 0
--   * coverage_type contradicting tuition_coverage .................... 0
--   * amounts of a million or more (unit errors) ...................... 0
--   * universities without at least one programme ..................... 0
--   * universities without at least one active award .................. 0
--   * application_cycles past-deadline but verified ................... 0
--   * application_cycles verified without a source URL ................ 0
--   * application_cycles with an orphan program_id .................... 0
--   * cycle_year disagreeing with academic_year ....................... 0
-- ============================================================================
