-- ============================================================================
-- SCHOLARSHIP REWRITE PASS 89 — 2026-10-26
-- Project: zkdguzbdopfedkffsatk (Postgres 17)
-- Branch: arena/99b0c7fe-scholarbridgeai
-- Deduplicate Caltech PhD funding rows 20 and 114.
-- Keep id 20 as the active, fully verified canonical record; retire id 114
-- (do not DELETE the scholarship row or cascade user-owned references).
-- ============================================================================

-- Ensure the active canonical association has the current published terms.
UPDATE university_scholarships SET
  scholarship_name = 'Caltech Graduate Fellowships (PhD)',
  availability_status = 'Yes',
  funding_type = 'Institute PhD support through fellowship, research assistantship, teaching assistantship, or a combination',
  max_scholarship = 'USD 50,000 annual PhD stipend from 1 September 2026 plus full tuition and mandatory fees; health-plan subsidy described separately',
  covers_tuition = true,
  covers_living_expenses = true,
  valued_aspect = 'Full tuition and mandatory-fee credit plus a 12-month living stipend',
  eligibility_notes = 'All admitted PhD students are offered support conditional on full-time enrollment and satisfactory progress, securing a thesis advisor and meeting programme requirements. No separate financial-aid application. Most funding sources require work authorization; verify with the admitting option.',
  official_url = 'https://gradoffice.caltech.edu/financialsupport',
  source_url = 'https://gradoffice.caltech.edu/financialsupport',
  verification_status = 'verified',
  last_verified_at = now()
WHERE id = 520 AND scholarship_id = 20;

-- Update the official source record that was previously attached to the duplicate.
UPDATE sources SET
  url = 'https://gradoffice.caltech.edu/financialsupport',
  title = 'Caltech Graduate Financial Support (PhD) — Official Source',
  domain = 'gradoffice.caltech.edu',
  source_type = 'scholarship',
  accessed_at = '2026-10-26 00:00:00',
  is_official = true,
  is_verified = true
WHERE id = 2496;

-- Refresh the second canonical source link with the current official budget page.
UPDATE sources SET
  url = 'https://gradoffice.caltech.edu/financialsupport/budget',
  title = 'Caltech Graduate Estimated Budget — Official Source',
  domain = 'gradoffice.caltech.edu',
  source_type = 'scholarship',
  accessed_at = '2026-10-26 00:00:00',
  is_official = true,
  is_verified = true
WHERE id = 2705;

-- Preserve the source mapping while moving it from duplicate id 114 to id 20.
UPDATE scholarship_sources
SET scholarship_id = 20, source_type = 'official'
WHERE id = 27 AND scholarship_id = 114;

-- Retire the duplicate university association after confirming there are no
-- foreign keys pointing to university_scholarships.id.
DELETE FROM university_scholarships
WHERE id = 639 AND scholarship_id = 114;

-- Clean a stale association for the already-retired PDF-import composite id 804.
-- It is not a separate Caltech PhD award; the real undergraduate need-based aid
-- record id 19 and its association id 10 are preserved.
DELETE FROM university_scholarships
WHERE id = 376 AND scholarship_id = 804;

-- Retire (do not delete) scholarship 114. Canonical details remain on id 20.
UPDATE scholarships SET
  title = 'Caltech doctoral funding package (retired duplicate; canonical id 20)',
  website_url = 'https://gradoffice.caltech.edu/financialsupport',
  source_url = 'https://gradoffice.caltech.edu/financialsupport',
  application_url = 'https://www.gradoffice.caltech.edu/admissions',
  award_amount = NULL,
  award_currency = NULL,
  award_period = NULL,
  award_basis = 'variable',
  amount_usd_value = 0,
  deadline = 'Retired duplicate record; use active scholarship id 20 for current Caltech PhD funding and graduate application dates.',
  deadline_date = NULL,
  deadline_type = 'not_published',
  deadline_range_start = NULL,
  deadline_range_end = NULL,
  expected_deadline_period = NULL,
  coverage_type = 'Unspecified',
  funding_type = 'Retired duplicate; canonical Caltech PhD funding record is scholarship id 20',
  tuition_coverage = NULL,
  required_documents = '[]',
  application_status = 'unknown',
  source_reliability = 10,
  description = 'Retired duplicate of the Caltech PhD funding package. Use active scholarship id 20 for the canonical, source-verified details, USD 50,000 annual stipend, tuition and mandatory-fee coverage, eligibility conditions and admission timeline.',
  requirements = 'This duplicate record is retired. Refer to active scholarship id 20 for the current Caltech PhD funding requirements.',
  notes = $note$RETIRED 2026-10-26 (Caltech dedup pass 89). This record duplicated the same institute-wide PhD funding package as active scholarship id 20: both described full tuition and mandatory-fee support plus the published USD 50,000 12-month stipend from 1 September 2026. No distinct award, eligibility or deadline was found for id 114. The complete official-source details are consolidated in id 20. The duplicate scholarship_sources mapping was transferred to id 20, and the redundant university_scholarships association was removed. This row remains inactive for referential integrity; do not use it as a separate scholarship.$note$,
  verification_status = 'verified',
  last_verified_at = now(),
  last_updated_at = now(),
  is_active = false
WHERE id = 114;

-- Add a dedup note to the canonical record only once (idempotent).
UPDATE scholarships SET
  notes = CASE
    WHEN notes ILIKE '%DEDUPLICATED 2026-10-26 (pass 89)%' THEN notes
    ELSE COALESCE(notes, '') || $dedup$ DEDUPLICATED 2026-10-26 (pass 89): active scholarship id 20 is the canonical Caltech PhD funding record. Duplicate id 114 was retired, its official-source mapping was moved to id 20, and the duplicate university_scholarships association was removed after confirming there were no saved-scholarship or decision references to id 114.$dedup$
  END,
  last_updated_at = now()
WHERE id = 20;

-- Hard check: one active PhD funding package among ids 20/114 and one
-- canonical association. Caltech's distinct undergraduate need-based aid is id 19.
-- SELECT id, title, is_active, award_amount, award_currency, amount_usd_value
-- FROM scholarships WHERE id IN (20,114) ORDER BY id;
-- SELECT id, scholarship_id, scholarship_name, max_scholarship
-- FROM university_scholarships WHERE scholarship_id IN (20,114) ORDER BY id;
-- SELECT id, scholarship_id, source_id FROM scholarship_sources
-- WHERE scholarship_id IN (20,114) ORDER BY id;
-- ============================================================================
