-- Data repair for databases seeded BEFORE the honest-profile fix.
--
-- `supabase/relax_profile_fabricated_defaults.sql` stops NEW rows from being
-- born with invented answers. Rows created by the old version still carry the
-- seed's fabrications, and those are visible on screen: a profile nobody
-- filled in still "has" a 3.5 GPA, IELTS 7.0, SAT 1350, a $25 000 budget, a
-- four-country wish list and "Hackathon winner, Peer Tutor, …" activities —
-- so every match, chance and recommendation is decided by numbers the student
-- never typed.
--
-- Safety rules used here:
--   * Only rows that STILL hold the old defaults EXACTLY are touched. A real
--     answer is never overwritten: as soon as a student edits any one of
--     these columns the row stops matching and is left alone.
--   * The bootstrap operator account keeps `is_admin` (it is the only way into
--     the admin panel) — only its invented STUDENT fields are cleared.
--   * The demo student inserted by the old seed is demoted: a seeded demo
--     account that can open the admin panel is a privilege leak, and the
--     operator account is the only admin by design.
--   * Idempotent: running it twice changes nothing the second time.
--
-- Run against the app database (Supabase SQL editor, or psql):
--   psql "$DATABASE_URL" -f supabase/repair_seeded_fabricated_values.sql

BEGIN;

-- 1. Demote the seeded DEMO student account(s) that the old seed flagged as
--    admin. Must run BEFORE the fabricated values are cleared, because it
--    matches on those very values. The bootstrap operator is not in this list.
UPDATE "student_profiles"
SET "is_admin" = false, "updated_at" = now()
WHERE "is_admin" IS TRUE
  AND "email" IN ('alex.chen@scholarbridge.edu', 'alex.chen@example.com', 'student@example.com')
  AND "target_major" LIKE 'Computer Science%'
  AND "gpa" > 3.0;

-- 2. Clear the old fabricated column defaults from rows nobody edited.
--    The WHERE clause pins EVERY fabricated value, so a row where the student
--    changed even one field (e.g. a real GPA) is not touched.
UPDATE "student_profiles"
SET
  "degree_level"        = NULL,
  "target_major"        = NULL,
  "gpa"                 = NULL,
  "gpa_scale"           = NULL,
  "ielts_score"         = NULL,
  "toefl_score"         = NULL,
  "sat_score"           = NULL,
  "gre_score"           = NULL,
  "budget_annual_usd"   = NULL,
  "preferred_countries" = NULL,
  "extracurriculars"    = NULL,
  "work_experience_years" = NULL,
  "need_scholarship"    = false,
  "updated_at"          = now()
WHERE "degree_level"  IS NOT DISTINCT FROM 'Master'
  AND "target_major"  IS NOT DISTINCT FROM 'Computer Science'
  AND "gpa"           IS NOT DISTINCT FROM 3.5
  AND "gpa_scale"     IS NOT DISTINCT FROM 4.0
  AND "budget_annual_usd" IS NOT DISTINCT FROM 25000
  AND "need_scholarship"  IS TRUE
  -- Both spellings exist in the wild: the column default had spaces after the
  -- commas ("United States", "United Kingdom"), the seed wrote them without
  -- (JSON.stringify). Compare with spaces stripped so either row matches.
  AND replace("preferred_countries", ' ', '') = '["UnitedStates","UnitedKingdom","Canada","Germany"]'
  AND ("ielts_score" IS NULL OR "ielts_score" = 7.0)
  AND ("toefl_score" IS NULL OR "toefl_score" = 95)
  AND ("sat_score"   IS NULL OR "sat_score"   = 1350)
  AND ("gre_score"   IS NULL OR "gre_score"   = 315)
  AND ("extracurriculars" IS NULL
       OR "extracurriculars" = 'Hackathon winner, Peer Tutor, Student Council Vice President')
  AND ("work_experience_years" IS NULL OR "work_experience_years" = 1);

COMMIT;
