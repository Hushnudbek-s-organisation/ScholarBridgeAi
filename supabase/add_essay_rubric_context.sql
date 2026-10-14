-- Preserve the exact deterministic scoring context for each essay version.
-- Apply manually in Supabase when needed; all changes are additive/idempotent.
ALTER TABLE essay_versions
  ADD COLUMN IF NOT EXISTS prompt text,
  ADD COLUMN IF NOT EXISTS target_name text,
  ADD COLUMN IF NOT EXISTS word_limit integer;
