BEGIN;

CREATE TABLE IF NOT EXISTS public.scholly_push_subscriptions (
  endpoint_hash text PRIMARY KEY,
  user_id integer NOT NULL REFERENCES public.student_profiles(id) ON DELETE CASCADE,
  endpoint text NOT NULL,
  p256dh text NOT NULL,
  auth text NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_scholly_push_user_updated
  ON public.scholly_push_subscriptions (user_id, updated_at);

CREATE TABLE IF NOT EXISTS public.scholly_notification_log (
  id text PRIMARY KEY,
  user_id integer NOT NULL REFERENCES public.student_profiles(id) ON DELETE CASCADE,
  type text NOT NULL,
  channel text NOT NULL,
  local_day date NOT NULL,
  status text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  sent_at timestamptz,
  opened_at timestamptz,
  acted_at timestamptz
);
CREATE UNIQUE INDEX IF NOT EXISTS uq_scholly_notification_user_day_type
  ON public.scholly_notification_log (user_id, local_day, type);

ALTER TABLE public.scholly_push_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.scholly_notification_log ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.scholly_push_subscriptions, public.scholly_notification_log FROM PUBLIC;
DO $$
DECLARE role_name text;
BEGIN
  FOREACH role_name IN ARRAY ARRAY['anon', 'authenticated'] LOOP
    IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = role_name) THEN
      EXECUTE format('REVOKE ALL ON TABLE public.scholly_push_subscriptions, public.scholly_notification_log FROM %I', role_name);
    END IF;
  END LOOP;
END;
$$;

COMMIT;
