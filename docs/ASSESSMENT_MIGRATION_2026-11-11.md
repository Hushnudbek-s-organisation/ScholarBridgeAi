# Programme assessment refactor — 2026-11-11

**Holat:** kod o‘zgarishlari lokal, migratsiya **hali hech bir muhitga qo‘llanmagan**.
`npm ci` + disposable `embedded-postgres` (port 55453/55454) bilan sinovdan o‘tkazilgan.
Production apply, deploy, push — qilinmadi.

Bu hujjat programme recommendation / preference fit / eligibility / finance va eski
"Chancing" hisoblarini almashtirgan refactor uchun **apply va rollback** tartibini
belgilaydi.

## 1. Bitta yangi SQL fayl

| Fayl | Rol | Apply tartibi |
|---|---|---|
| `supabase/add_assessment_preferences_2026-11-11.sql` | **FORWARD / additive schema** | 1 |

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

## 2. Apply tartibi

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

## 3. Deploy tartibi va cache

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

## 4. Rollback (faqat incident)

```sql
ALTER TABLE student_profiles DROP CONSTRAINT IF EXISTS student_profiles_assessment_preferences_object;
ALTER TABLE student_profiles DROP COLUMN IF EXISTS assessment_preferences;
```

Bu **faqat yangi ustunni** o‘chiradi. Boshqa hech qanday foydalanuvchi
ma’lumoti (profil, saqlangan universitetlar, arizalar) o‘chmaydi. Kod eski
holatga qaytarilsa, o‘quvchi yana `preferred_countries` → `prefer` yo‘lidan
ishlaydi.

## 5. Access control va maxfiylik

- Yangi ustun faqat `requireProfileAccess` bilan o‘tiladigan yo‘llarda o‘qiladi
  (`/api/chancing`, `/api/dashboard`, `/api/deadlines`, `/api/universities*`);
  yangi endpoint yoki yangi huquq yo‘li qo‘shilmagan.
- Assessment javobi `personalData.recordedMetrics` — faqat **qaysi** ko‘rsatkich
  yozilgani (GPA/IELTS/…), qiymati emas.
- `assessmentPreferences` yozish `PUT /api/profiles/[id]` orqali, ya’ni mavjud
  egasi/admin tekshiruvi ostida; noto‘g‘ri payload `400
  assessment_preferences_invalid` bilan rad etiladi (jimgina yo‘qotilmaydi —
  yo‘qolgan `must` assessmentni sezdirmasdan o‘zgartirardi).

## 6. Tekshiruv buyruqlari

```bash
npm run test:assessment        # 54 ta shartnoma testi (16 talab + qo‘shimcha)
npm run test:assessment-db     # migratsiya + cache kalitlari (embedded postgres)
npm run test:chancing          # 28
npm run test:recommend         # 91
npm run test:admission-probability # 12
npm run test:university-sort   # 15
npm run test:qs-benchmarks     # 13
npm run test:continuation      # 88
npm run typecheck && npm run lint
```
