# Programme assessment refactor — 2026-11-11

**Holat (2026-11-11, yangilangan):** migratsiya **`zkdguzbdopfedkffsatk` production
loyihasiga qo‘llangan** — Supabase migration runner orqali, versiya
**`20261111141353_add_assessment_preferences_20261111`**. Ilova deploy’i
boshlanmagan.

Bu hujjat programme recommendation / preference fit / eligibility / finance va eski
"Chancing" hisoblarini almashtirgan refactor uchun **apply va rollback** tartibini
belgilaydi.

## 1. Bitta yangi SQL fayl

| Fayl | Rol | Apply tartibi | Holat |
|---|---|---|---|
| `supabase/add_assessment_preferences_2026-11-11.sql` | **FORWARD / additive schema** | 1 | **QO‘LLANGAN** — `20261111141353_add_assessment_preferences_20261111` |

Fayl **additive**:

- faqat bitta nullable `jsonb` ustun qo‘shadi: `student_profiles.assessment_preferences`;
- mavjud ustunlarni o‘zgartirmaydi, nomini o‘zgartirmaydi va o‘chirmaydi
  (`preferred_countries`, `study_interests`, `target_major` — hammasi joyida);
- **backfill yo‘q**: mavjud qatorlar `NULL` bo‘lib qoladi. `NULL` — "rejim
  tasdiqlanmagan" degani, va o‘quvchi (`resolvePreferenceSet`) eski
  `preferred_countries` qiymatini `prefer` deb o‘qiydi — **hech qachon `must` emas**;
- idempotent: `ADD COLUMN IF NOT EXISTS` + `pg_constraint` guard bilan CHECK
  constraint, shuning uchun qayta yoki yarim qo‘llangan run — no-op;
- CHECK constraint faqat obyekt (yoki `NULL`) qabul qiladi, ya’ni buzuq payload
  yozilmaydi.

Tekshirilgan (`npm run test:assessment-db`): 2 qatorli fixture ustida migratsiya
avval/keyin `to_jsonb` hash bir xil (yangi ustun chiqarib tashlanganda), ikkinchi
run no-op, `'["must"]'::jsonb` esa `23514` bilan rad etiladi.

## 2. Qo‘llanganligi dalili (2026-11-11)

`supabase` loyihasi `zkdguzbdopfedkffsatk` (migration runner orqali):

- `list_migrations` → oxirgi yozuv: `20261111141353  add_assessment_preferences_20261111`;
- `information_schema.columns` → `student_profiles.assessment_preferences`,
  `data_type = jsonb`, `is_nullable = YES`, `column_default = NULL`, izoh (COMMENT) yozilgan;
- `pg_constraint` → `student_profiles_assessment_preferences_object`
  (`CHECK (assessment_preferences IS NULL OR jsonb_typeof(assessment_preferences) = 'object')`);
- ma’lumot butunligi: migratsiyadan **oldin** va **keyin**
  `md5(string_agg((to_jsonb(row) - 'assessment_preferences')::text,'|' order by id))`
  bir xil — `37ca6c20a80f186576c968f441b2d1b1`, 18 qator, `with_prefs = 0`
  (backfill yo‘q);
- CHECK ishlaydi: `'["must"]'::jsonb` yozishga urinish `check_violation` berdi,
  qator o‘zgarmadi;
- yozish/o‘qish smoke testi: vaqtinchalik test qatori (`id = 20`,
  `zz-migration-smoke-20261111@example.invalid`) `assessment_preferences` bilan
  yaratildi, `NULL` ga tozalandi va o‘chirildi — qoldiq yo‘q (`smoke_rows = 0`),
  18 qator va hash o‘sha holatga qaytdi.

**Tekshirilmagan:** haqiqiy foydalanuvchi sessiyasi bilan RLS ostidagi read/write.
`student_profiles` uchun RLS yoqilgan, lekin `pg_policies` da policy yo‘q va
`anon`/`authenticated` ga `UPDATE/INSERT` grant berilmagan — ya’ni jadvalga faqat
server (`postgres` roli, `DATABASE_URL` orqali) murojaat qiladi. Smoke test shu
sabab bilan `postgres` roli orqali bajarilgan (ilovaning haqiqiy yo‘li), API
route orqali emas. **Test akkaunt yo‘q, shuning uchun “RLS ostidagi write
tekshirildi” deb da’vo qilinmaydi.**

## 3. Apply tartibi

```bash
# 1. Zaxira (ixtiyoriy, lekin tavsiya etiladi) — faqat o‘qish
psql "$DATABASE_URL" -c "select count(*) from student_profiles;"

# 2. Forward
psql "$DATABASE_URL" -v ON_ERROR_STOP=1 \
  -f supabase/add_assessment_preferences_2026-11-11.sql

# 3. Tekshirish (read-only)
psql "$DATABASE_URL" -c "
  select count(*) filter (where assessment_preferences is not null) as with_prefs,
         count(*) as total
  from student_profiles;"
```

`with_prefs` apply paytida `0` bo‘lishi normal — hech kim rejim tanlamagan.

## 4. Deploy tartibi va cache

1. Migratsiya (yuqorida) → 2. deploy.
2. **Cache avtomatik yangilanadi**, qo‘lda flush shart emas:
   - `SCORING_VERSION` (`src/lib/assessment/version.ts`) har bir assessment
     cache kalitining prefiksida (`assessedUniversitiesCacheKey()`,
     `assessmentCacheKey()`, `getCachedProfileForMatching`,
     `getCachedUniversitiesBundleForAssessment`);
   - shuning uchun formula, vazn yoki subject qoidasi o‘zgarsa, versiyani
     ko‘tarish eski yozuvlarni bir zumda iste’moldan chiqaradi;
   - profil tahriri `profileMatchFingerprint` orqali kalitni o‘zgartiradi;
   - rasmiy talab o‘zgarsa — `catalogue` / `evidence` revision bump.
3. **Eski ballar konvertatsiya qilinmaydi:** saqlangan `chance`/`composite`
   qiymatlar yangi raqamga aylantirilmaydi. Ular hech qayerda ko‘rsatilmaydi;
   hamma ekran yangi assessmentdan qayta hisoblaydi (javobda `scoringVersion`
   va `assessedAt` bor).

## 5. Rollback (faqat incident)

**Tavsiya etilgan rollback — ustunni JOYIDA QOLDIRISH.** Ilova eski versiyaga
qaytarilsa, u ustunni shunchaki o‘qimaydi/yozmaydi; saqlangan preference
ma’lumoti yo‘qolmaydi va keyingi deploy uni qayta ishlatadi. Faqat incident
bo‘lganda (masalan constraint noto‘g‘ri ishlayotgani isbotlansa) quyidagilar
bajariladi — va bu **yangi preference ma’lumotini o‘chiradi**, shuning uchun
avval zaxira olinadi:

```sql
-- 1) Zaxira (majburiy, agar preference yozilgan bo'lsa)
CREATE TABLE IF NOT EXISTS scholarbridge_maintenance.assessment_preferences_backup_20261111 AS
  SELECT id, assessment_preferences, now() AS backed_up_at
  FROM public.student_profiles
  WHERE assessment_preferences IS NOT NULL;

-- 2) Faqat incident uchun
ALTER TABLE public.student_profiles DROP CONSTRAINT IF EXISTS student_profiles_assessment_preferences_object;
ALTER TABLE public.student_profiles DROP COLUMN IF EXISTS assessment_preferences;
```

Bu **faqat yangi ustunni** o‘chiradi. Boshqa hech qanday foydalanuvchi
ma’lumoti (profil, saqlangan universitetlar, arizalar) o‘chmaydi. Kod eski
holatga qaytarilsa, o‘quvchi yana `preferred_countries` → `prefer` yo‘lidan
ishlaydi.

## 6. Access control va maxfiylik

- Yangi ustun faqat `requireProfileAccess` bilan o‘tiladigan yo‘llarda o‘qiladi
  (`/api/chancing`, `/api/dashboard`, `/api/deadlines`, `/api/universities*`);
  yangi endpoint yoki yangi huquq yo‘li qo‘shilmagan.
- Assessment javobi `personalData.recordedMetrics` — faqat **qaysi** ko‘rsatkich
  yozilgani (GPA/IELTS/…), qiymati emas.
- `assessmentPreferences` yozish `PUT /api/profiles/[id]` orqali, ya’ni mavjud
  egasi/admin tekshiruvi ostida; noto‘g‘ri payload `400
  assessment_preferences_invalid` bilan rad etiladi (jimgina yo‘qotilmaydi —
  yo‘qolgan `must` assessmentni sezdirmasdan o‘zgartirardi).

## 7. Tekshiruv buyruqlari

```bash
npm run test:assessment        # 62 ta shartnoma testi (16 talab + qo‘shimcha)
npm run test:assessment-db     # migratsiya + cache kalitlari (embedded postgres)
npm run test:chancing          # 28
npm run test:recommend         # 91
npm run test:admission-probability # 12
npm run test:university-sort   # 15
npm run test:qs-benchmarks     # 13
npm run test:continuation      # 88
npm run typecheck && npm run lint
```
