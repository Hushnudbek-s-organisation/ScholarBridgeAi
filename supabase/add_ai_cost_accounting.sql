-- ============================================================================
-- ScholarBridge — AI cost accounting & budget columns (2026-10)
-- ============================================================================
-- Additive only: ADD COLUMN IF NOT EXISTS / CREATE INDEX IF NOT EXISTS.
-- Nothing is dropped, renamed or retyped, and existing rows keep working.
--
-- Run once in Supabase → SQL Editor (or `npm run db:push` in dev), BEFORE the
-- release that ships lib/ai/pricing.ts and lib/ai/budget.ts.
--
-- Rollback (only if you must revert the release; data written by the new code
-- is lost, nothing else is touched):
--   DROP INDEX IF EXISTS idx_ai_usage_created;
--   ALTER TABLE ai_usage DROP COLUMN IF EXISTS cost_status;
--   ALTER TABLE ai_usage DROP COLUMN IF EXISTS cached_prompt_tokens;
--   ALTER TABLE ai_usage DROP COLUMN IF EXISTS attempts;
--   ALTER TABLE ai_usage DROP COLUMN IF EXISTS fallback_used;
--   ALTER TABLE ai_usage DROP COLUMN IF EXISTS error_category;
--
-- Legacy rows get cost_status = 'unknown': their cost_estimate of 0 was never
-- a measured value, so reports must not present it as one.
-- ============================================================================

ALTER TABLE ai_usage ADD COLUMN IF NOT EXISTS cost_status text NOT NULL DEFAULT 'unknown';
ALTER TABLE ai_usage ADD COLUMN IF NOT EXISTS cached_prompt_tokens integer NOT NULL DEFAULT 0;
ALTER TABLE ai_usage ADD COLUMN IF NOT EXISTS attempts integer NOT NULL DEFAULT 1;
ALTER TABLE ai_usage ADD COLUMN IF NOT EXISTS fallback_used boolean NOT NULL DEFAULT false;
ALTER TABLE ai_usage ADD COLUMN IF NOT EXISTS error_category text;

-- Platform-wide daily / monthly budget sums read every row of the current window.
CREATE INDEX IF NOT EXISTS idx_ai_usage_created ON ai_usage (created_at);
