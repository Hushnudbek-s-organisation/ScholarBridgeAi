-- ============================================================================
-- ScholarBridge AI — Document checker (Phase 2, item #7)
--
-- XAVFSIZ: faqat `ADD COLUMN IF NOT EXISTS` va `CREATE TABLE IF NOT EXISTS`.
-- Mavjud ma'lumotlar o'chirilmaydi. Supabase SQL Editor'da ishga tushiring.
-- ============================================================================

-- --- Hujjat tekshiruvi uchun kerakli ustunlar -------------------------------
-- Muddat: pasport/IELTS/TOEFL kabi hujjatlar eskiradi — tekshiruvchi shuni bilishi kerak.
ALTER TABLE public.application_documents ADD COLUMN IF NOT EXISTS expires_at date;
-- Fayl haqiqati: nomi, hajmi va yuklangan vaqti format/olcham qoidalarini tekshirish uchun.
ALTER TABLE public.application_documents ADD COLUMN IF NOT EXISTS file_name text;
ALTER TABLE public.application_documents ADD COLUMN IF NOT EXISTS file_size_bytes integer;
ALTER TABLE public.application_documents ADD COLUMN IF NOT EXISTS uploaded_at timestamp;

CREATE INDEX IF NOT EXISTS idx_documents_profile_status ON public.application_documents(profile_id, status);

-- --- Insho versiyalari (Phase 2, item #8) -----------------------------------
-- Versiya tarixi: har bir qoralama saqlanadi, shunda talaba nima o'zgarganini
-- ko'radi va AI bahosi vaqt o'tishi bilan solishtiriladi.
CREATE TABLE IF NOT EXISTS public.essay_versions (
  id serial PRIMARY KEY,
  profile_id integer NOT NULL REFERENCES public.student_profiles(id) ON DELETE CASCADE,
  university_id integer REFERENCES public.universities(id) ON DELETE SET NULL,
  essay_type text NOT NULL DEFAULT 'sop',           -- sop | personal_statement | why_us | supplemental | scholarship
  title text NOT NULL DEFAULT '',
  content text NOT NULL DEFAULT '',
  word_count integer NOT NULL DEFAULT 0,
  char_count integer NOT NULL DEFAULT 0,
  version_number integer NOT NULL DEFAULT 1,
  -- Rubrika baholari (0–100). Hisoblangan qiymatlar, model o'ylab topmaydi.
  rubric_hook integer,
  rubric_structure integer,
  rubric_specificity integer,
  rubric_language integer,
  rubric_fit integer,
  rubric_total integer,
  ai_feedback text,
  created_at timestamp NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_essay_versions_profile ON public.essay_versions(profile_id);
CREATE INDEX IF NOT EXISTS idx_essay_versions_profile_type ON public.essay_versions(profile_id, essay_type, version_number);
