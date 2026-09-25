-- ============================================================================
-- ScholarBridge — Sign up / Sign in uchun parol saqlash (password hash)
-- ============================================================================
-- QANDAY ISHLATISH:
--   1. Supabase Dashboard → SQL Editor → New query
--   2. Quyidagi SQL'ni to'liq ko'chirib qo'ying
--   3. "Run" tugmasini bosing
--   4. Saytni yangilang (Ctrl+Shift+R)
--
-- NIMA QILADI:
--   * student_profiles jadvaliga (email saqlanadigan joyga) password_hash
--     ustunini qo'shadi. Parol HECH QACHON ochiq matnda saqlanmaydi —
--     ilova uni scrypt bilan hashlab, shu ustunga saqlaydi.
--   * Email'lar bir xil bo'lib qolishini oldini olish uchun unique index
--     qo'yiladi (sign in email orqali ishlaydi shuning uchun).
--     Eski duplikat email'lar avval tozalanadi (duplikatlar O'CHIRILMAYDI,
--     ularga farqli email beriladi).
--
-- Bu skript xavfsiz: IF NOT EXISTS — ustun/index allaqachon mavjud bo'lsa,
-- xato bermaydi va qayta ishga tushirish mumkin.
-- ============================================================================

-- 1) Parol hashi uchun ustun (email yonida)
ALTER TABLE student_profiles
  ADD COLUMN IF NOT EXISTS password_hash text;

-- 2) Eski duplikat email'lar: har bir takrorlanuvchiga "-1", "-2" ... qo'shib
--    farqli qilib qo'yamiz (eng kichik id asl email'ni saqlab qoladi).
--    Faqat bir marta ishlaydi — keyinroq qayta bosilsa hech narsa o'zgarmaydi.
UPDATE student_profiles s
SET email = s.email || '-' || d.dup_rank
FROM (
  SELECT id,
         ROW_NUMBER() OVER (PARTITION BY lower(email) ORDER BY id) AS dup_rank
  FROM student_profiles
) d
WHERE s.id = d.id
  AND d.dup_rank > 1;

-- 3) Bir email = bir akkaunt (katta/kichik harflarga farq qilmaydi)
CREATE UNIQUE INDEX IF NOT EXISTS student_profiles_email_uidx
  ON student_profiles (lower(email));
