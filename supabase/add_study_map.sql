-- Apply before enabling the PRO study map in production.
BEGIN;
CREATE TABLE IF NOT EXISTS public.study_map_entries (
  id text PRIMARY KEY,
  profile_id integer NOT NULL REFERENCES public.student_profiles(id) ON DELETE CASCADE,
  kind text NOT NULL,
  title text NOT NULL,
  body text NOT NULL,
  links jsonb NOT NULL DEFAULT '[]'::jsonb,
  due_at timestamptz NOT NULL DEFAULT now(),
  interval_days integer NOT NULL DEFAULT 0,
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_study_map_entries_profile ON public.study_map_entries (profile_id);
ALTER TABLE public.study_map_entries ENABLE ROW LEVEL SECURITY;
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN
    REVOKE ALL ON TABLE public.study_map_entries FROM anon;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN
    REVOKE ALL ON TABLE public.study_map_entries FROM authenticated;
  END IF;
END $$;
COMMIT;
