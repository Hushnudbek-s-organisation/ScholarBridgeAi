-- Format-only repair, audited against 626 active scholarships on 2026-11-02.
-- No awards, eligibility claims, dates, verification flags or active flags change.
-- Apply transactionally (Supabase create_migration does this automatically).
-- Never run the rollback sketch without checking for later edits.

LOCK TABLE public.scholarships IN SHARE ROW EXCLUSIVE MODE;

-- Full before-images live outside the public API schema and are not available
-- to client roles. This table is intentionally retained for operator recovery.
CREATE SCHEMA IF NOT EXISTS scholarbridge_maintenance;
REVOKE ALL ON SCHEMA scholarbridge_maintenance FROM PUBLIC, anon, authenticated;
CREATE TABLE IF NOT EXISTS scholarbridge_maintenance.scholarship_format_backup_20261102 (
  id integer PRIMARY KEY,
  row_before jsonb NOT NULL,
  captured_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE scholarbridge_maintenance.scholarship_format_backup_20261102 ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE scholarbridge_maintenance.scholarship_format_backup_20261102 FROM PUBLIC, anon, authenticated;

CREATE TEMP TABLE scholarship_format_plan_20261102 ON COMMIT DROP AS
SELECT s.id,
  (
    SELECT coalesce(jsonb_agg(label ORDER BY first_position), '[]'::jsonb)::text
    FROM (
      SELECT label, min(position) AS first_position
      FROM (
        SELECT CASE value
          WHEN 'Bachelor''s' THEN 'Bachelor'
          WHEN 'Undergraduate' THEN 'Bachelor'
          WHEN 'Master''s' THEN 'Master'
          ELSE value END AS label, position
        FROM jsonb_array_elements_text(s.degree_levels::jsonb) WITH ORDINALITY AS d(value, position)
      ) labels
      GROUP BY label
    ) distinct_labels
  ) AS degree_levels,
  CASE s.coverage_type
    WHEN 'Full Ride' THEN 'Full Funding'
    WHEN 'Full Tuition + Living Expenses' THEN 'Full Tuition + Stipend'
    WHEN 'Full Tuition + Living Support' THEN 'Full Tuition + Stipend'
    WHEN 'Tuition Credit' THEN 'Partial Tuition'
    WHEN 'Tuition Subsidy' THEN 'Partial Tuition'
    WHEN 'Living Support' THEN 'Living Stipend'
    WHEN 'Travel & Living Stipend' THEN 'Living Stipend'
    -- Generic grants / support do not establish full or partial coverage.
    -- Preserve original wording in notes + backup, not guessed coverage.
    WHEN 'Merit Grant' THEN 'Unspecified'
    WHEN 'Monthly Stipend + Tuition Support' THEN 'Unspecified'
    WHEN 'Tuition Support' THEN 'Unspecified'
    WHEN 'Tuition Subsidy + Stipend' THEN 'Unspecified'
    WHEN 'Research & Study Grant' THEN 'Unspecified'
    WHEN 'Travel & Research Grant' THEN 'Unspecified'
    WHEN 'Application Fee Waiver & Test Grant' THEN 'Unspecified'
    ELSE s.coverage_type END AS coverage_type,
  CASE WHEN s.award_basis IN ('merit','merit_based','need_and_merit')
    -- Selection criteria do not establish fixed/range award valuation.
    -- variable is the application's non-fixed fallback, not a new cash claim.
    THEN 'variable' ELSE s.award_basis END AS award_basis,
  CASE WHEN s.award_period = 'degree' THEN 'total' ELSE s.award_period END AS award_period,
  CASE WHEN s.award_basis IN ('merit','merit_based','need_and_merit')
         OR s.coverage_type NOT IN ('Full Tuition + Stipend','Full Tuition','Full Funding',
           'Partial Tuition','Partial Funding','Living Stipend','Tuition Waiver','Unspecified')
    THEN concat_ws(E'\n', nullif(s.notes, ''),
      '[2026-11-02 format repair] Original coverage_type=' || coalesce(s.coverage_type, 'NULL') ||
      '; original award_basis=' || coalesce(s.award_basis, 'NULL') ||
      '. Labels aligned with the website vocabulary only. Selection criteria do not establish a fixed award amount; variable is a non-fixed fallback. No provider re-verification performed.')
    ELSE s.notes END AS notes
FROM public.scholarships s
WHERE s.is_active;

-- Keep the immutable first before-image, even if the migration is replayed.
INSERT INTO scholarbridge_maintenance.scholarship_format_backup_20261102 (id,row_before)
SELECT s.id, to_jsonb(s)
FROM public.scholarships s
JOIN scholarship_format_plan_20261102 p USING (id)
WHERE s.degree_levels::jsonb IS DISTINCT FROM p.degree_levels::jsonb
   OR s.coverage_type IS DISTINCT FROM p.coverage_type
   OR s.award_basis IS DISTINCT FROM p.award_basis
   OR s.award_period IS DISTINCT FROM p.award_period
ON CONFLICT (id) DO NOTHING;

UPDATE public.scholarships s
SET degree_levels = p.degree_levels,
    coverage_type = p.coverage_type,
    award_basis = p.award_basis,
    award_period = p.award_period,
    notes = p.notes,
    last_updated_at = now()
FROM scholarship_format_plan_20261102 p
WHERE s.id = p.id AND (
  s.degree_levels::jsonb IS DISTINCT FROM p.degree_levels::jsonb
  OR s.coverage_type IS DISTINCT FROM p.coverage_type
  OR s.award_basis IS DISTINCT FROM p.award_basis
  OR s.award_period IS DISTINCT FROM p.award_period
);

-- Abort the whole migration if anything outside the allowed fields changed.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM public.scholarships s
    JOIN scholarbridge_maintenance.scholarship_format_backup_20261102 b USING (id)
    WHERE (to_jsonb(s) - ARRAY['degree_levels','coverage_type','award_basis','award_period','notes','last_updated_at'])
      IS DISTINCT FROM
      (b.row_before - ARRAY['degree_levels','coverage_type','award_basis','award_period','notes','last_updated_at'])
  ) THEN
    RAISE EXCEPTION 'Unexpected scholarship mutation: repair rolled back';
  END IF;
END $$;

-- Recovery sketch (operator review required; protect later edits first):
-- UPDATE public.scholarships s SET
--   degree_levels=b.row_before->>'degree_levels',
--   coverage_type=b.row_before->>'coverage_type',
--   award_basis=b.row_before->>'award_basis',
--   award_period=b.row_before->>'award_period',
--   notes=b.row_before->>'notes',
--   last_updated_at=(b.row_before->>'last_updated_at')::timestamp
-- FROM scholarbridge_maintenance.scholarship_format_backup_20261102 b
-- WHERE s.id=b.id;
