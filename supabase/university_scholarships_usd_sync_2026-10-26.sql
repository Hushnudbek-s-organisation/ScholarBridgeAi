-- ScholarBridge AI - university_scholarships USD-string sync - 2026-10-26
-- Follow-up to rewrite pass 97 (see docs/SCHOLARSHIP_REWRITE_PASS_97_2026-10-26.md),
-- which found that 118 of 570 university_scholarships rows still carried the
-- importer's terse invented format 'USD <n> year' in max_scholarship, even
-- where the parent scholarship record had long since been corrected.
--
-- Findings from the triage before any write (2026-10-26):
-- * 116 USD-containing rows by bucket: 40 verified parent with a published
--   amount, 18 verified parent without a single published amount, 55
--   reliability-4 parents (all already stripped to amount_usd_value = 0 in
--   the scholarships table, so the USD figure survived ONLY here), 3 retired
--   parents, 0 without a parent.
-- * Rich descriptive max_scholarship strings written by earlier passes
--   (e.g. 'CAD 7,500 per term, up to CAD 60,000; ...') are correct and often
--   carry more verified detail than the terse format. They were therefore
--   protected: only rows matching the terse importer pattern
--   '^[A-Z]{3} [0-9][0-9 ]*(year|month|total|one_time)$' were eligible.
--
-- Result: 80 rows corrected + 2 rows deleted; USD-containing strings
-- 116 -> 34, every remaining one backed by a verified USD-denominated
-- parent (32), a deliberately kept honest exclusion note (1), or a verified
-- descriptive string (1). No scholarships rows were touched.

-- 1) Bucket C (10 rows): parent verified (reliability >= 8) WITH a published
--    amount; terse importer string replaced by the parent record's actual
--    verified value (e.g. us 565 'USD 44000 year' -> 'AUD 40475 year',
--    us 474 'USD 65000 year' -> 'GBP 23152 year'). 27 further terse rows
--    already matched their verified parent exactly and were left untouched
--    by the f.new_val <> us.max_scholarship guard.
WITH fix AS (
  SELECT us.id AS us_id, s.title, s.website_url, s.source_url,
    s.award_currency || ' ' || (CASE WHEN s.award_amount % 1 = 0 THEN s.award_amount::bigint::text ELSE s.award_amount::text END)
    || CASE WHEN s.award_period IN ('year','month','total','one_time') THEN ' ' || s.award_period ELSE '' END AS new_val
  FROM university_scholarships us JOIN scholarships s ON s.id = us.scholarship_id
  WHERE s.is_active AND s.source_reliability >= 8 AND s.award_amount IS NOT NULL AND s.award_currency IS NOT NULL
    AND us.max_scholarship ~ '^[A-Z]{3} [0-9][0-9 ]*(year|month|total|one_time)$'
)
UPDATE university_scholarships us
SET max_scholarship = f.new_val, scholarship_name = f.title, official_url = f.website_url, source_url = f.source_url, last_verified_at = now()
FROM fix f WHERE us.id = f.us_id AND f.new_val <> us.max_scholarship;
-- updated us ids: 472, 474, 479, 546, 565, 569, 595, 615, 643, 652

-- 2) Bucket D (15 rows): parent verified but deliberately stores NO single
--    amount (award_amount/currency NULL - full-need aid, fee-waiver,
--    tiered/course-dependent awards). The invented terse USD figure was
--    replaced by a coverage-based descriptor pointing at the scholarship
--    record; stale names/URLs synced from the verified parent.
--    Rich-format rows of the same bucket (us 57, 279, 293, 466) untouched.
WITH fix AS (
  SELECT us.id AS us_id, s.title, s.website_url, s.source_url,
    CASE s.coverage_type
      WHEN 'Full Funding' THEN 'Full funding - see scholarship record for components'
      WHEN 'Full Tuition + Stipend' THEN 'Full tuition + living stipend - see scholarship record'
      WHEN 'Full Tuition' THEN 'Tuition fee covered - amount depends on the course'
      WHEN 'Partial Tuition' THEN 'Partial tuition award - see scholarship record for the published value'
      WHEN 'Partial Funding' THEN 'Partial funding - see scholarship record for the published value'
      WHEN 'Living Stipend' THEN 'Living stipend - see scholarship record for the published value'
      ELSE 'See scholarship record for the published award value'
    END AS new_val
  FROM university_scholarships us JOIN scholarships s ON s.id = us.scholarship_id
  WHERE s.is_active AND s.source_reliability >= 8 AND (s.award_amount IS NULL OR s.award_currency IS NULL)
    AND us.max_scholarship ~ '^[A-Z]{3} [0-9][0-9 ]*(year|month|total|one_time)$'
)
UPDATE university_scholarships us
SET max_scholarship = f.new_val, scholarship_name = f.title, official_url = f.website_url, source_url = f.source_url, last_verified_at = now()
FROM fix f WHERE us.id = f.us_id;
-- updated us ids: 476, 480, 483, 494, 507, 521, 538, 544, 553, 554, 557, 558, 588, 592, 608

-- 3) Bucket E (55 rows): parent still reliability 4 (amount_usd_value = 0,
--    coverage 'Unspecified' in every case). ONLY the invented number is
--    removed and replaced with a neutral pointer; name/URL are NOT synced
--    from an unverified parent and last_verified_at is NOT bumped - these
--    rows stay visibly unverified until their own rewrite pass.
UPDATE university_scholarships us
SET max_scholarship = CASE s.coverage_type
      WHEN 'Full Funding' THEN 'Full funding - see scholarship record for components'
      WHEN 'Full Tuition + Stipend' THEN 'Full tuition + living stipend - see scholarship record'
      WHEN 'Full Tuition' THEN 'Tuition fee covered - amount depends on the course'
      WHEN 'Partial Tuition' THEN 'Partial tuition award - see scholarship record for the published value'
      WHEN 'Partial Funding' THEN 'Partial funding - see scholarship record for the published value'
      WHEN 'Living Stipend' THEN 'Living stipend - see scholarship record for the published value'
      ELSE 'See scholarship record for the published award value'
    END
FROM scholarships s
WHERE s.id = us.scholarship_id AND s.is_active AND s.source_reliability < 8
  AND us.max_scholarship ~ '^[A-Z]{3} [0-9][0-9 ]*(year|month|total|one_time)$';
-- 55 rows updated.

-- 4) Retired-parent duplicates deleted (pass-96 precedent):
--    us 548 -> scholarship 106 (Imperial duplicate of verified id 22),
--    us 550 -> scholarship 109 (Cambridge Trust/Gates merged record).
--    Kept deliberately: us 280 (UCSB Regents, retired) - availability 'No'
--    and its string honestly states international students are excluded.
DELETE FROM university_scholarships WHERE id IN (548, 550);
