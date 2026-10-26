-- ============================================================================
-- Remove Israel from the catalogue — 2026-10-25
-- Project: zkdguzbdopfedkffsatk
--
-- The user asked for Israel to be removed from the database entirely rather
-- than rewritten. Before deleting, the rows were archived in
-- docs/ISRAEL_REMOVAL_2026-10-25.md, together with the note that both
-- scholarship rows were imported template rows with invented dollar values,
-- so nothing of research value is lost.
--
-- Scope confirmed before the delete:
--   universities            2  (237 Tel Aviv University, 287 The Hebrew
--                              University of Jerusalem)
--   scholarships            2  (588, 680 — both country = 'Israel')
--   university_scholarships 2
--   programs                2
--   application_cycles      4
--   university_sources      2
--   everything else         0  (no saved universities, applications,
--                              saved scholarships or scholarship decisions)
--
-- No user-owned row references either university, so nothing is lost except
-- catalogue data. The delete is ordered child-first because the composite
-- foreign key application_cycles (program_id, university_id) -> programs
-- (id, university_id) is NOT deferrable.
-- ============================================================================

BEGIN;

DELETE FROM application_cycles WHERE university_id IN (237, 287);
DELETE FROM programs           WHERE university_id IN (237, 287);
DELETE FROM university_scholarships WHERE university_id IN (237, 287);

-- Scholarships hang off universities with ON DELETE SET NULL, so they are
-- removed explicitly here rather than being orphaned.
DELETE FROM scholarships WHERE country = 'Israel' OR university_id IN (237, 287);

-- Cascades: university_sources, university_images, university_rankings,
-- university_programs, campuses, requirement_templates, saved_universities.
DELETE FROM universities WHERE id IN (237, 287);

COMMIT;
