-- ============================================================================
-- ScholarBridge — AI kunlik limiti uchun indeks (2026-09 xavfsizlik auditi)
-- ============================================================================
-- QANDAY ISHLATISH:
--   1. Supabase Dashboard → SQL Editor → New query
--   2. Quyidagi SQL'ni to'liq ko'chirib qo'ying
--   3. "Run" tugmasini bosing
--
-- Nega kerak: har bir AI so'rovida server foydalanuvchining oxirgi 24 soatdagi
-- AI so'rovlarini sanaydi (Admin → Settings: ai_free_requests_per_day,
-- ai_premium_requests_per_day, ai_*_tokens_per_day). Indekssiz bu so'rov butun
-- ai_usage jadvalini o'qiydi.
--
-- Bu skript XAVFSIZ va FAQAT QO'SHADI (IF NOT EXISTS) — hech narsa o'chirilmaydi.
-- `npm run db:push` ishlatilsa, xuddi shu indeks src/db/schema.ts dan yaratiladi.
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_ai_usage_profile_created
  ON ai_usage (profile_id, created_at);
