-- Remove obsolete, non-evidence-based admissions tiers and stale saved-fit snapshots.
-- The application now computes a profile-to-catalogue comparison live and does
-- not classify universities as Reach / Match / Safety. These fields contain only
-- derived metadata; no student-authored notes or application records are removed.
-- Apply manually in the Supabase SQL editor after deploying the code that no
-- longer reads or writes these columns.
ALTER TABLE IF EXISTS saved_universities
  DROP COLUMN IF EXISTS match_category,
  DROP COLUMN IF EXISTS match_score;
