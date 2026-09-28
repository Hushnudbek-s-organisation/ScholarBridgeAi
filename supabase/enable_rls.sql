-- ════════════════════════════════════════════════════════════════════════
-- Row Level Security lockdown for ScholarBridge (idempotent, safe to re-run)
--
-- WHY: Supabase grants the `anon` and `authenticated` roles access to every
-- table in `public` by default. Anyone holding the public anon key could then
-- read tables such as student_profiles (password hashes) or telegram_links
-- through the Supabase REST API. The app itself never uses those roles for
-- private data — it connects with DATABASE_URL as the table OWNER, and table
-- owners bypass RLS — so locking the roles out does not affect the app.
--
-- WHAT it does, for every table in `public` OWNED BY the role running it:
--   1. ENABLE ROW LEVEL SECURITY (no FORCE → the owner/app keeps full access).
--   2. REVOKE ALL from anon/authenticated (only if those roles exist).
--   3. Public catalog tables (universities, scholarships) keep a read-only
--      SELECT policy + grant for anon/authenticated, because the /universities
--      and /scholarships pages may read them with the anon key.
-- Tables owned by another role are skipped (and listed in a NOTICE).
--
-- RUN: Supabase → SQL Editor, as the same role the app uses (usually
-- `postgres`). Re-run after adding tables. Verify with the query at the end.
-- ════════════════════════════════════════════════════════════════════════

DO $$
DECLARE
  r record;
  has_anon boolean := EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon');
  has_auth boolean := EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated');
  catalog text[] := ARRAY['universities', 'scholarships'];
BEGIN
  FOR r IN
    SELECT c.relname, pg_get_userbyid(c.relowner) AS owner
    FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public' AND c.relkind IN ('r', 'p')
    ORDER BY c.relname
  LOOP
    IF r.owner <> current_user THEN
      RAISE NOTICE 'skipped public.% (owned by %, not %)', r.relname, r.owner, current_user;
      CONTINUE;
    END IF;

    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', r.relname);
    IF has_anon THEN EXECUTE format('REVOKE ALL ON TABLE public.%I FROM anon', r.relname); END IF;
    IF has_auth THEN EXECUTE format('REVOKE ALL ON TABLE public.%I FROM authenticated', r.relname); END IF;

    IF r.relname = ANY (catalog) THEN
      EXECUTE format('DROP POLICY IF EXISTS public_catalog_read ON public.%I', r.relname);
      IF has_anon AND has_auth THEN
        EXECUTE format('CREATE POLICY public_catalog_read ON public.%I FOR SELECT TO anon, authenticated USING (true)', r.relname);
        EXECUTE format('GRANT SELECT ON TABLE public.%I TO anon, authenticated', r.relname);
      ELSIF has_anon THEN
        EXECUTE format('CREATE POLICY public_catalog_read ON public.%I FOR SELECT TO anon USING (true)', r.relname);
        EXECUTE format('GRANT SELECT ON TABLE public.%I TO anon', r.relname);
      END IF;
    END IF;
  END LOOP;

  -- Sequences: the public roles never need them.
  FOR r IN
    SELECT c.relname FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public' AND c.relkind = 'S' AND pg_get_userbyid(c.relowner) = current_user
  LOOP
    IF has_anon THEN EXECUTE format('REVOKE ALL ON SEQUENCE public.%I FROM anon', r.relname); END IF;
    IF has_auth THEN EXECUTE format('REVOKE ALL ON SEQUENCE public.%I FROM authenticated', r.relname); END IF;
  END LOOP;
END $$;

-- Verify (every row should show rls_enabled = true):
-- SELECT c.relname AS table_name, c.relrowsecurity AS rls_enabled
-- FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
-- WHERE n.nspname = 'public' AND c.relkind = 'r' ORDER BY 1;
