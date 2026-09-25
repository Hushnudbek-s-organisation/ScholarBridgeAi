-- ============================================================================
-- ScholarBridge AI — Mentor marketplace + Parent dashboard (Phase 4)
--
-- XAVFSIZ: faqat `CREATE TABLE IF NOT EXISTS` va `ADD COLUMN IF NOT EXISTS`.
-- Mavjud ma'lumotlar o'chirilmaydi. Supabase SQL Editor'da ishga tushiring.
-- ============================================================================

-- --- Mentorlar --------------------------------------------------------------
-- `instructors` jadvali kurslar uchun. Mentor boshqa narsa: u talabaga o'zi
-- bosib o'tgan yo'lni (mamlakat, universitet, stipendiya) ko'rsatadi.
CREATE TABLE IF NOT EXISTS public.mentors (
  id serial PRIMARY KEY,
  profile_id integer REFERENCES public.student_profiles(id) ON DELETE SET NULL,
  display_name text NOT NULL,
  headline text NOT NULL DEFAULT '',
  bio text NOT NULL DEFAULT '',
  photo_url text,
  country text,
  city text,
  university text,
  program text,
  degree_level text,
  scholarship_name text,
  -- Mentor qaysi mavzularda yordam bera oladi (JSON array).
  expertise text NOT NULL DEFAULT '[]',
  languages text NOT NULL DEFAULT '[]',
  hourly_rate_usd integer,
  free_sessions boolean NOT NULL DEFAULT false,
  is_verified boolean NOT NULL DEFAULT false,
  -- Tasdiqlash nima asosida: universitet pochtasi, diplom, stipendiya xati.
  verification_note text,
  is_active boolean NOT NULL DEFAULT true,
  rating_average double precision,
  rating_count integer NOT NULL DEFAULT 0,
  created_at timestamp NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_mentors_active ON public.mentors(is_active, is_verified);
CREATE INDEX IF NOT EXISTS idx_mentors_country ON public.mentors(country);

-- --- Mentor bilan bog'lanish so'rovlari -------------------------------------
CREATE TABLE IF NOT EXISTS public.mentor_requests (
  id serial PRIMARY KEY,
  profile_id integer NOT NULL REFERENCES public.student_profiles(id) ON DELETE CASCADE,
  mentor_id integer NOT NULL REFERENCES public.mentors(id) ON DELETE CASCADE,
  topic text NOT NULL,
  message text NOT NULL DEFAULT '',
  status text NOT NULL DEFAULT 'pending', -- pending | accepted | declined | completed | cancelled
  scheduled_at timestamp,
  created_at timestamp NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_mentor_requests_profile ON public.mentor_requests(profile_id);
CREATE INDEX IF NOT EXISTS idx_mentor_requests_mentor ON public.mentor_requests(mentor_id, status);

-- --- Ota-ona kirishi --------------------------------------------------------
-- Ota-ona dashboard'i ALMAShTIRILMAYDI: talaba o'zi ruxsat beradi, va faqat
-- o'qish uchun. Parolni yoki xususiy yozishmalarni ko'rsatmaydi.
ALTER TABLE public.student_profiles ADD COLUMN IF NOT EXISTS parent_share_enabled boolean NOT NULL DEFAULT false;
ALTER TABLE public.student_profiles ADD COLUMN IF NOT EXISTS parent_share_email text;
ALTER TABLE public.student_profiles ADD COLUMN IF NOT EXISTS parent_share_token text;
ALTER TABLE public.student_profiles ADD COLUMN IF NOT EXISTS parent_share_created_at timestamp;

-- Token tasodifiy va bir martalik ishlatiladi; indeks lookup uchun.
CREATE UNIQUE INDEX IF NOT EXISTS idx_profiles_parent_token ON public.student_profiles(parent_share_token)
  WHERE parent_share_token IS NOT NULL;
