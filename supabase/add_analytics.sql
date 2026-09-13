-- ============================================================================
-- ScholarBridge — ADMIN PANEL STATISTIKASI (Analytics) uchun baza yangilanishi
-- ============================================================================
-- QANDAY ISHLATISH:
--   1. Supabase Dashboard → SQL Editor → New query
--   2. Quyidagi SQL'ni to'liq ko'chirib qo'ying
--   3. "Run" tugmasini bosing
--   4. Saytni yangilang (Ctrl+Shift+R) va Admin → Analytics bo'limini oching
--
-- Bu skript XAVFSIZ va FAQAT QO'SHADI:
--   * yangi `site_visits` jadvali (tashriflar hisobi) — CREATE TABLE IF NOT EXISTS
--   * hech qanday mavjud jadval o'zgartirilmaydi yoki o'chirilmaydi
--   * qayta-qayta ishga tushirsa ham bo'ladi (idempotent)
--
-- ESLATMA: ilova bu jadvalni o'zi ham yaratadi (src/lib/visits.ts →
-- CREATE TABLE IF NOT EXISTS). Shu sababli skriptni ishga tushirish shart emas,
-- lekin bazani o'z qo'lingizda ushlashni xohlasangiz — mana shu fayl.
-- ============================================================================

-- 1) Tashriflar jadvali (anonim: faqat tasodifiy visitor_id, IP saqlanmaydi)
CREATE TABLE IF NOT EXISTS site_visits (
  id              serial PRIMARY KEY,
  visitor_id      text    NOT NULL DEFAULT '',
  profile_id      integer REFERENCES student_profiles(id) ON DELETE SET NULL,
  event_type      text    NOT NULL DEFAULT 'page_view',   -- page_view | screen_view | signup
  path            text    NOT NULL DEFAULT '/',
  screen          text,                                   -- dashboard | universities | admin | ...
  referrer        text,                                   -- "direct", "google.com", "t.me", ...
  user_agent      text,
  device          text    NOT NULL DEFAULT 'desktop',     -- desktop | mobile | tablet | bot
  locale          text,
  country         text,
  is_first_visit  boolean NOT NULL DEFAULT false,
  created_at      timestamp NOT NULL DEFAULT now()
);

-- 2) Indexlar — dashboard so'rovlari tez ishlashi uchun
CREATE INDEX IF NOT EXISTS site_visits_created_at_idx
  ON site_visits (created_at);
CREATE INDEX IF NOT EXISTS site_visits_visitor_id_idx
  ON site_visits (visitor_id);
CREATE INDEX IF NOT EXISTS site_visits_event_type_created_at_idx
  ON site_visits (event_type, created_at);

-- 3) Xavfsizlik: loyihaning boshqa jadvallari kabi `site_visits` ham FAQAT
--    server orqali (DATABASE_URL, node-postgres) yoziladi/o'qiladi — klient
--    hech qachon bazaga to'g'ridan-to'g'ri ulanmaydi, API esa admin huquqini
--    tekshiradi (/api/admin/analytics → isAdmin). Shu sababli bu yerda RLS
--    siyosatlari yoqilmaydi (mavjud jadvallar ham RLS'siz ishlaydi).
--    Jadvalda IP manzil, parol yoki boshqa shaxsiy ma'lumot saqlanmaydi.

-- 4) Tekshirish: jadval va indexlar borligini ko'rish
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public' AND table_name = 'site_visits';

SELECT indexname FROM pg_indexes WHERE tablename = 'site_visits';

-- 5) (Ixtiyoriy) Statistika qanday yig'ilayotganini darhol ko'rish:
-- SELECT date_trunc('day', created_at) AS kun,
--        count(*) AS views,
--        count(DISTINCT visitor_id) AS visitors
-- FROM site_visits
-- WHERE event_type IN ('page_view', 'screen_view')
-- GROUP BY 1 ORDER BY 1 DESC LIMIT 14;

-- ============================================================================
-- ORQAGA QAYTARISH (agar kerak bo'lsa — DIQQAT: barcha tashriflar o'chadi):
-- DROP TABLE IF EXISTS site_visits;
-- ============================================================================
