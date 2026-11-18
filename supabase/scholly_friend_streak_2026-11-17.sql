BEGIN;

CREATE TABLE IF NOT EXISTS public.scholly_friend_links (
  id serial PRIMARY KEY,
  inviter_id integer NOT NULL REFERENCES public.student_profiles(id) ON DELETE CASCADE,
  friend_id integer REFERENCES public.student_profiles(id) ON DELETE CASCADE,
  token_hash text NOT NULL UNIQUE,
  expires_at timestamptz NOT NULL,
  accepted_at timestamptz,
  ended_at timestamptz
);

CREATE INDEX IF NOT EXISTS idx_scholly_friend_links_inviter ON public.scholly_friend_links (inviter_id, ended_at);
CREATE INDEX IF NOT EXISTS idx_scholly_friend_links_friend ON public.scholly_friend_links (friend_id, ended_at);
ALTER TABLE public.scholly_friend_links ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.scholly_friend_links FROM PUBLIC;
DO $$
DECLARE role_name text;
BEGIN
  FOR role_name IN SELECT rolname FROM pg_roles WHERE rolname IN ('anon', 'authenticated') LOOP
    EXECUTE format('REVOKE ALL ON public.scholly_friend_links FROM %I', role_name);
  END LOOP;
END $$;

COMMIT;
