# Migration runbook — 2026-11-06 (LOKAL / REVIEWABLE, production’da QO‘LLANMAGAN)

**Joriy holat:** barcha quyidagi SQL fayllar **`??` untracked**, hech bir muhitda agent tomonidan qo‘llanmagan. `npm ci` + disposable `embedded-postgres` bilan sinovdan o‘tkazilgan. Production apply, deploy, push — qilinmadi.

## 0. Xato tuzatildi: rollback forward emas

Oldingi hisobotda production’ga qo‘llanadigan ro‘yxatga uchta fayl birga kiritilgan edi:

```
official_source_corrections_2026-11-06.sql          ← FORWARD
official_source_corrections_2026-11-06_rollback.sql ← RECOVERY (forward emas!)
security_evidence_research_2026-11-06.sql           ← FORWARD
```

Bu noto‘g‘ri. Rollback — favqulodda tiklash vositasi, uni forward ketma-ketlikka qo‘shish, ayniqsa ikki marta qo‘llash (idempotentlik testi) ma’lumotlarni buzadi. Quyidagi ajratish **yakuniy**.

## 1. Klassifikatsiya (bitta manba)

| Fayl | Rol | Apply tartibi | Avtomatik ishlatiladimi |
|---|---|---|---|
| `supabase/security_evidence_research_2026-11-06.sql` | **FORWARD / schema+security** | **1** | Ha, operator tomonidan qo‘lda, lekin oddiy apply ro‘yxatida |
| `supabase/official_source_corrections_2026-11-06.sql` | **FORWARD / data correction** | **2** | Ha |
| `supabase/official_source_followup_2026-11-06_v2.sql` | **FORWARD / versioned follow-up** | **3** | Ha |
| `supabase/official_source_corrections_2026-11-06_rollback.sql` | **RECOVERY v1 — HISTORICAL, ISHLATILMAYDIGAN** | — | **YO‘Q** (v1 barcha ustunlarni ko‘r-ko‘rona yozardi) |
| `supabase/official_source_corrections_2026-11-06_rollback_v2.sql` | **RECOVERY v2 — faqat incident** | — | **YO‘Q** |
| `supabase/security_evidence_research_2026-11-06_recovery.sql` | **RECOVERY — faqat incident** | — | **YO‘Q** |

`scripts/check-migration-runner.ts` (§6) har bir faylni shu jadval bo‘yicha tekshiradi: recovery fayllari hech bir apply ro‘yxatida, CI step’ida, `package.json` script’ida yoki startup hook’ida uchramasligi shart.

## 2. Oddiy apply tartibi (FAQAT 3 ta forward)

```
1) backup / snapshot olish (§4)
2) security_evidence_research_2026-11-06.sql     — jadvallar, RLS, grantlar, lease ustunlari
3) official_source_corrections_2026-11-06.sql   — 2 ta katalog qatori + 3 ta official link
4) official_source_followup_2026-11-06_v2.sql   — rasmiy 2026-11-06 topilmalari,
                                                  recommended_score turi, yangi fact qatorlari
5) har birini IKKI MARTA qo‘llab idempotentlikni tekshirish
6) kod deploy → flag → worker → smoke
```

**Nima uchun bu tartib:** v2 `catalogue_facts.value_type` CHECK’ini kengaytiradi, demak `catalogue_facts` (1-qadam) mavjud bo‘lishi shart. v2 `ON CONFLICT DO NOTHING` ishlatadi, 2-qadam bilan bir xil qatorlarni ustidan yozmaydi. Eski kod yangi `recommended_score` qatorlarini `unknown` sifatida o‘qiydi (adapter `unknown` ga tushiradi), ya’ni oldinga ham, orqaga ham mos.

**Hech qachon:** rollback faylini shu ro‘yxatga qo‘shish; `db:push` bilan SQL’ni almashtirish; biror muhitda qo‘llangan faylni jim tahrirlash. Agar qo‘llangan faylda xato topilsa → **yangi versiyalangan follow-up** (v2 kabi) yoziladi, eskisi o‘zgartirilmaydi.

## 3. Migration runner tekshiruvi

Repo’da avtomatik SQL runner yo‘q: `db:push` qo‘lda, `scripts/apply-full-schema.ts` faqat `full_schema.sql` ni ishlatadi, `scripts/check-backend-sql.py` barcha `*.sql` ni **faqat grammar parse** qiladi (hech qachon execute qilmaydi, DB’ga ulanmaydi). Uning natijasiga `role: grammar_only` qo‘shildi, shunda rollback fayli “apply qilindi” deb o‘qilmaydi.

`scripts/check-migration-runner.ts` quyidagilarni bloklaydi:
- recovery faylining `package.json` script’lari, `.github/workflows/ci.yml`, `ci/security-ci.yml`, `render.yaml`, `DEPLOYMENT.md` apply ro‘yxatida uchrashi;
- forward faylida `BEGIN`/`COMMIT` yo‘qligi;
- recovery faylida preflight + `NO ROLLBACK WAS MADE` / `NO RECOVERY` guard’i yo‘qligi;
- v1 rollback’ning “ishlatiladigan” deb belgilanishi.

## 4. Backup va preflight (apply’dan OLDIN)

1. Ikki katalog qatorining (`Yenching`, `MIT`) `SELECT *` nusxasi + `pg_dump` yoki platforma snapshot’i.
2. Read-only preflight (production’da hali bajarilmagan; quyidagilar `docs/OFFICIAL_SOURCE_OPEN_ITEMS_2026-11-06.md` dagi aniq query’lar):
   - `$5,040` kelib chiqishi: `amount_usd_value = 5040` bo‘lgan qator, `award_currency/award_period`, `scholarship_sources` → `sources` join;
   - duplicate MBA: `public.programs` + `program_sources` + `saved_programs` + `applications.program_name` matnli review signali;
   - `information_schema.columns` bilan jadval/ustun nomlarini `src/db/schema.ts` ga solishtirish.
3. `mit_candidates = 1`, `yenching_unresolved = 1` yoki `yenching_corrected = 1` ekanini tasdiqlash; 0 yoki >1 bo‘lsa forward migration **xavfsiz abort** qiladi.
4. `auth.users = 0`, custom HMAC sessiya → `auth.uid()` policy qo‘shilmaydi; server-side ownership tekshiruvi saqlanadi.

> Bu query’lar **production’da bajarilmadi**. Bajarilmaganini bajarilgan deb yozilmaydi.

## 5. Har bir migration uchun ALOHIDA recovery

| Migration | Recovery fayli | Trigger | Kim | Preflight |
|---|---|---|---|---|
| `security_evidence_research` | `security_evidence_research_2026-11-06_recovery.sql` | backend yozish granti yo‘qolishi / RLS qonuniy admin o‘qishni bloklashi | nomli DB operatori, incident ticket | jadval mavjudligi (`to_regclass`), grantlar, LOGO SELECT, backend write smoke |
| `official_source_corrections` | `official_source_corrections_2026-11-06_rollback_v2.sql` | **faqat shu correction’dagi rasmiy iqtibos xato ekani tasdiqlansa**, boshqa sabab emas | nomli DB operatori | marker `notes` aynan forward matni, `count(*) = 1`, MIT qatori hali forward holatida, yangi backup |
| `official_source_followup_v2` | runbook §5.1 (quyida) | `recommended_score` CHECK eski kod bilan moslashmasa | nomli DB operatori | `SELECT count(*) WHERE value_type='recommended_score'`; 0 bo‘lsa CHECK’ni v1 ro‘yxatiga qaytarish; qatorlar `field_key + admission_cycle + source_url` bo‘yicha aniqlanadi |
| v1 rollback | — | **hech qachon** | — | v1 barcha ustunlarni ko‘r-ko‘rona yozadi, keyinchalik qonuniy tuzatilgan maydonni ustidan yozadi; o‘rniga v2 |

### 5.1 v2 follow-up recovery

`value_type` CHECK’ni toraytirish faqat `recommended_score` qatorlari yo‘q bo‘lganda; aks holda avval ularni arxivga ko‘chirish kerak (o‘chirish emas). Yangi `catalogue_facts` qatorlari `ON CONFLICT DO NOTHING` bilan kiritilgan — ularni `field_key + admission_cycle + source_url` bo‘yicha aniq topib, kerak bo‘lsa `is_active = false` qilish yetarli; `DELETE`/`TRUNCATE` ishlatilmaydi.

### 5.2 v2 recovery’ning asosiy himoyasi

`rollback_v2.sql` har bir ustunni `CASE WHEN <ustun> IS NOT DISTINCT FROM <forward qiymati> THEN <kuzatilgan qiymat> ELSE <ustun> END` bilan qaytaradi. Operator yoki import tomonidan keyinchalik qonuniy yangilangan maydon **ustidan yozilmaydi**. Marker yo‘qolsa yoki 1 dan ortiq qator topsa — `RAISE EXCEPTION 'PREFLIGHT FAILED … NO ROLLBACK WAS MADE'` bilan butun tranzaksiya bekor bo‘ladi.

## 6. Disposable DB tekshiruvi

`npm run test:migration-recovery` (`scripts/check-migration-recovery.ts`) real `embedded-postgres` ustida:

1. `drizzle-kit push` → sxema;
2. `security_evidence_research` → `official_source_corrections` → `followup_v2` (forward);
3. har birini **ikkinchi marta** qo‘llash → qatorlar ko‘paymasligi, CHECK mavjudligi;
4. **guarded abort**: nom/domain guard’ini buzuvchi qo‘shimcha qator kiritib, forward’ning `RAISE EXCEPTION` bilan to‘xtashi;
5. **recovery v2**: marker yo‘qolganda abort; keyinchalik qonuniy yangilangan `requirements` maydoni saqlanishi; faqat forward yozgan maydonlar tiklanishi;
6. v1 rollback’ning apply ro‘yxatida yo‘qligi;
7. security recovery’dan keyin LOGO SELECT ishlashi, anon private hujjat o‘qiy olmasligi, backend grant saqlanishi.

Hech bir qadam production’ga ulanmaydi. Natija `docs/HISOBOT_YAKUNIY_2026-11-06.md` da 1-toifada ko‘rsatiladi.

## 7. Apply / rollback xulosasi

- **Oddiy apply:** 3 ta forward fayl, yuqoridagi tartibda, ikki marta sinab, smoke bilan.
- **Rollback:** oddiy tartibning bir qismi EMAS. Faqat aniq incident, nomli operator, backup + preflight, va **har migration uchun o‘zining** recovery fayli.
- Bitta correction rollback’i `security_evidence_research` ni ham qaytaradi degan da’vo — **noto‘g‘ri va olib tashlandi**.
- Production’ga hozircha hech narsa qo‘llanmadi.
