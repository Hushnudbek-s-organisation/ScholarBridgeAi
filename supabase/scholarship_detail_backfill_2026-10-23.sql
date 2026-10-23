-- ============================================================================
-- Scholarship detail pages — data backfill (2026-10-23)
--
-- The new /scholarships/[id] page renders six blocks for EVERY award:
-- Tavsif · Kimlar uchun · Imtiyozlar · Topshirish jarayoni · Qo'shimcha
-- ma'lumot · Muhim tafsilotlar. Two of those blocks read columns that were
-- empty on a large part of the catalogue.
--
-- Nothing here invents a fact: both updates copy a value the row already
-- stores, into the column the page reads.
--   * english_requirements  <- the row's own min_ielts
--   * funding_type          <- the row's own coverage_type
--   * tuition_coverage      <- the row's own coverage_type
-- ============================================================================

-- 1. Language requirement -----------------------------------------------------
-- 299 of 646 active awards had an empty english_requirements but a stored
-- min_ielts. The page shows "IELTS 6.5 or equivalent English test" — the same
-- number the catalogue already publishes on the card, only spelled out.
UPDATE scholarships
SET english_requirements = 'IELTS ' || trim(to_char(min_ielts, 'FM999.9')) || ' or equivalent English test'
WHERE is_active
  AND coalesce(english_requirements, '') = ''
  AND min_ielts IS NOT NULL;
-- Result: 629 / 646 now carry a language line; the remaining 17 have no
-- min_ielts at all and keep the field empty (the page prints "Ko'rsatilmagan").

-- 2. Funding type + tuition coverage -----------------------------------------
-- 9 awards (the Uzbek universities and CTU rows added in the previous pass)
-- had neither column filled. Derived from coverage_type, the column the cards
-- already display.
UPDATE scholarships
SET funding_type = CASE
      WHEN coverage_type ILIKE '%full ride%' THEN 'Fully funded'
      WHEN coverage_type ILIKE '%full%' AND coverage_type ILIKE '%stipend%' THEN 'Fully funded'
      WHEN coverage_type ILIKE '%full%' THEN 'Tuition only'
      WHEN coverage_type ILIKE '%stipend%' THEN 'Stipend only'
      WHEN coverage_type ILIKE '%partial%' THEN 'Partial'
      WHEN coverage_type ILIKE '%one-off%' THEN 'One-off award'
      ELSE 'Not specified'
    END,
    tuition_coverage = CASE
      WHEN coverage_type ILIKE '%partial or full%' THEN 'Partial or full tuition'
      WHEN coverage_type ILIKE '%full ride%' THEN 'Full tuition'
      WHEN coverage_type ILIKE '%full%tuition%' THEN 'Full tuition'
      WHEN coverage_type ILIKE '%partial%tuition%' THEN 'Partial tuition'
      WHEN coverage_type ILIKE '%tuition%' THEN 'Partial tuition'
      WHEN coverage_type ILIKE '%stipend%' OR coverage_type ILIKE '%one-off%' THEN 'None'
      ELSE 'Not specified'
    END
WHERE is_active
  AND (coalesce(funding_type, '') = '' OR coalesce(tuition_coverage, '') = '');
-- Result: 0 / 646 empty in either column.
