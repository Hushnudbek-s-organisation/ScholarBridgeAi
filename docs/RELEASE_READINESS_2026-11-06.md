# Release tayyorgarligi — 2026-11-06 (LOKAL ONLY)

**Branch:** `arena/672d7668-scholarbridgeai` · **HEAD:** `d185e61` + ishchi diff (115 modified / 88 untracked = 203 path) · **Push / deploy / production migration / real payment / real Telegram:** QILINMADI.
**Tekshirilgan lokal revision:** ishchi dirty tree (commit qilinmagan), `npm ci` bilan tiklangan `node_modules`, disposable `embedded-postgres` klasterlari (har test o‘z portida, `persistent:false`). Production bazasiga hech qanday yozuv kiritilmadi.

---

## 1. Yakuniy diff va o‘zgargan fayllar ro‘yxati

To‘liq ro‘yxat: `git status --porcelain` (203 ta path). Asosiy guruhlar:

**Yangi lokal fayllar (asosiylari)**
- `src/lib/factPresentation.ts`, `src/lib/observability.ts`, `src/lib/financeModel.ts`, `src/lib/eligibilityScope.ts`, `src/lib/officialSourceAdapter.ts`, `src/lib/officialSourceAdapter.server.ts`, `src/lib/cacheRevision.ts`, `src/lib/reviewQueue.ts`, `src/lib/typedEvidence.ts`, `src/lib/buildId.ts`
- `src/app/api/admin/review-queue/route.ts`, `src/components/admin/ReviewQueue.tsx`, `src/app/api/cron/research-agent/route.ts`, `src/app/api/config/build/route.ts` (tiklandi)
- `scripts/check-{admission-probability,build-gates,observability,research-runtime,cache-revision,official-source-adapter,finance-unified,typed-evidence,review-queue}.ts`
- `docs/{QOLGAN_ISHLAR_JADVALI,OFFICIAL_SOURCE_OPEN_ITEMS,DEPENDENCY_ADVISORIES,RELEASE_READINESS,HISOBOT_YAKUNIY}_2026-11-06.md`
- **FORWARD (3):** `supabase/security_evidence_research_2026-11-06.sql`, `supabase/official_source_corrections_2026-11-06.sql`, `supabase/official_source_followup_2026-11-06_v2.sql` — **NOT APPLIED**
- **RECOVERY (apply ro‘yxatida EMAS, 3):** `supabase/official_source_corrections_2026-11-06_rollback.sql` (v1, historical/ISHLATILMAYDIGAN), `..._rollback_v2.sql`, `supabase/security_evidence_research_2026-11-06_recovery.sql` — **NOT APPLIED**
- Klassifikatsiya, tartib va har migration uchun alohida recovery: `docs/MIGRATION_RUNBOOK_2026-11-06.md`.

**O‘zgartirilgan asosiy fayllar**
- CI/build: `.github/workflows/ci.yml`, `ci/security-ci.yml`, `package.json`, `package-lock.json`, `next.config.ts`, `scripts/check-{deploy,audit-safety,security,profile-recompute,typed-evidence,source-recheck,research-worker,channel,observability}.ts/.mjs`
- API: `src/app/api/{universities,universities/[id],scholarships,dashboard,admin/refresh,cron/refresh}/route.ts`
- UI/i18n: `src/components/{AdminPanel,journey/JourneyControlCenter,admin/RefreshCenter}.tsx`, `src/i18n/messages/{en,uz,ru}.json`
- Lib: `src/lib/{refresh,costs,budgetFit,matching,ssrf,dashboardRecommendationCache,catalogCache}.ts`, `src/lib/research-agent/{durableStore,worker,registry}.ts`, `src/lib/channel/{model,templates/format,templates/facts,templates/card.uz}.ts`

> Hech qanday fayl o‘chirilmadi, `reset --hard`/`clean`/lossy checkout ishlatilmadi, eski versiya bilan almashtirilmadi. `git diff --stat` va `git status --porcelain` yakuniy manba.

---

## 2. Lokal / disposable muhitda tekshirilgan migration’lar

| Migration | Holat | Tekshiruv |
|---|---|---|
| `supabase/security_evidence_research_2026-11-06.sql` | NOT APPLIED (production) | `test:migration-dry-run` 14/0: real `embedded-postgres` + `drizzle-kit push`, ikki marta apply (idempotent), password-reset RLS + privileged backend, `storage.objects` effective grants+RLS+LOGO-only, `catalogue_facts`/`research_runs`/`research_run_items` RLS/grant/FK/index/ID turlari, atomik lease, refresh/cache/review jadvallari |
| `supabase/official_source_corrections_2026-11-06.sql` | NOT APPLIED (production) | Yuqoridagi bilan birga: dinamik nom/domen/source guard, 0 yoki >1 match’da safe abort, `DROP NOT NULL` / `DROP DEFAULT` / `[]` semantik ta’siri, eski+yangi kod mosligi, ikki apply |
| `supabase/official_source_followup_2026-11-06_v2.sql` | FORWARD v2, NOT APPLIED | versiyalangan follow-up: `recommended_score` turi, minimum/recommended/scale/cohort ajratilgan fact qatorlari, `ON CONFLICT DO NOTHING` (qo‘llangan fayl jim tahrirlanmadi) |
| `..._rollback.sql` (v1) | **RECOVERY — ISHLATILMAYDIGAN**, oddiy apply ro‘yxatida EMAS | tarixiy artifact; barcha ustunlarni ko‘r-ko‘rona yozardi, o‘rniga v2 |
| `..._rollback_v2.sql` | **RECOVERY — faqat incident**, apply ro‘yxatida EMAS | `test:migration-recovery`: preflight abort, field-level `CASE` himoyasi, keyinchalik qonuniy tuzatilgan maydon saqlanadi |
| `security_evidence_research_2026-11-06_recovery.sql` | **RECOVERY — faqat incident**, alohida | jadvallarni o‘chirmaydi, RLS/anon DML zaifligini qayta ochmaydi, backend grant + LOGO SELECT tiklanadi |
| Durable worker DDL | Disposable DB’da real | `test:research-runtime` 12/0: parallel claim, expired lease stale-write rad, cancel, timeout, idempotency, DB asosiy manba, anon RLS |

**Muhit:** `DATABASE_URL` disposable `127.0.0.1:<random>/sb_e2e_*` yoki `sbmigration`/`sbresearch`; `APP_BASE_URL` loopback; tashqi AI credential’lar E2E muhitdan olib tashlangan. Hech qanday production connection string/secret qiymati hujjatga kiritilmagan.

---

## 3. Staging sinov rejasi

1. Staging bazasini production sxemasining **ko‘zgusidan** (data anonimlashtirilgan) yaratish; `full_schema` apply’i `test:schema-apply-safety` talab qilgan aniq acknowledgment bilan.
2. `npm ci` → `npm run typecheck` → `npm run build` (build vaqtida `DATABASE_URL` dummy bo‘lishi mumkin; `prebuild` typecheck bloklovchi).
3. **Faqat 3 ta FORWARD** faylni staging’da, `docs/MIGRATION_RUNBOOK_2026-11-06.md` §2 tartibida, `BEGIN … ` ichida avval read-only preflight query’lari bilan, keyin commit; har birini ikki marta qo‘llab idempotentligini tasdiqlash. **Recovery/rollback fayllari bu ro‘yxatga kirmaydi** (`test:migration-runner` 9/0).
4. `RESEARCH_DURABLE_STORE=1` + `CRON_SECRET` o‘rnatib, `/api/cron/research-agent` ni bir marta chaqirish: `migrationPending:false`, `resumed` yoki `considered:0` bo‘lishi kerak.
5. Smoke: login → profil → tavsiya → ariza → hujjat (§6), katalog/detail/grant API `evidence` maydoni, admin review queue (ochish `verified` qilmasligi), refresh ikki rejimi (failed check `last_verified_at` ni o‘zgartirmasligi).
6. E2E + `test:api-security:isolated` ni staging URL’ga emas, staging’ning o‘z disposable klasterida yugurtirish; natijalarni `test-results/` ga saqlash.
7. Faqat barchasi yashil bo‘lgach production qo‘llash bo‘yicha **alohida foydalanuvchi ruxsati** so‘raladi.

---

## 4. Env o‘zgarishlari (NOMlari, qiymatlarsiz)

| Nom | Maqsad | Kim o‘rnatadi |
|---|---|---|
| `DATABASE_URL` | mavjud (o‘zgarishsiz) | mavjud infra |
| `SESSION_SECRET` | custom HMAC sessiya (mavjud) | mavjud infra |
| `CRON_SECRET` | `/api/cron/*` Bearer tokeni; yangi `/api/cron/research-agent` uchun ham | staging/production operatori |
| `RESEARCH_DURABLE_STORE` | `1` = durable DB queue; yo‘q = process-local fallback | operator (flag tartibi §5) |
| `RESEARCH_AGENT_*` / `ADAPTER_*` | official-source adapter’ning tayyor konfiguratsiyasi (adapter `_server.ts` dagi nomlar bo‘yicha) | operator |
| `APP_BASE_URL` | public URL / redirect bazasi | mavjud infra |
| `PG_POOL_MAX` | mavjud pool chegarasi (o‘zgartirish shart emas) | mavjud infra |

> Hech qanday qiymat, token, parol yoki connection string bu hujjatda yo‘q. `check-observability` loglarda secret/PII chiqmasligini 8/0 bilan tekshiradi.

**Supabase Auth tekshiruvi:** jonli auditda `auth.users = 0`, `student_profiles = 18`, `user_sessions = 28`, `student_profiles` jadvalida auth-user ustuni yo‘q → loyiha **Supabase Auth ishlatmaydi**, custom HMAC sessiya + numeric profile ID ishlatadi. Shuning uchun Supabase Auth Site URL / redirect allowlist’ini o‘zgartirish **kiritilmadi**; tekshirilishi kerak bo‘lgan joy — custom sessiyaning amaldagi redirect/`sb_session` cookie sozlamalari (`src/lib/auth.ts`, `src/proxy.ts`, `src/app/privacy/page.tsx`). `auth.uid()` owner policy qo‘shilmadi (ishlamas edi); server-side ownership + admin tekshiruvi saqlandi (`test:ownership` 83/0, `test:security` 107/0).

**Secret rotatsiyasi:** default yoki oshkor bo‘lgan secret topilmadi (`docs/HISOBOT_FAZA2_2026-11-06.md` secret skani toza), aniq ehtiyoj yo‘q → majburiy ishga aylantirilmadi. Agar kelajakda `CRON_SECRET` yoki `SESSION_SECRET` almashtirilsa: ikkala qiymatni bir vaqtda qabul qiluvchi o‘tish davri → barcha instance’larga yangi qiymat → eski qiymatni olib tashlash → sessiya/cookie uzilishsiz tekshiruvi (`sb_session`), uzilishsizlik shu tartib bilan ta’minlanadi.

---

## 5. `build → migration → flag → worker → smoke` tartibi va asoslanishi

| Bosqich | Nima | Nima uchun shu tartib |
|---|---|---|
| 1. **build** | `npm ci` → `typecheck` → `npm run build` | Yangi kod/endpoint’lar (`/api/cron/research-agent`, `/api/config/build`, `evidence` envelope) deploy bo‘lishidan oldin `prebuild` typecheck bloklaydi; `ignoreBuildErrors` faqat shu lifecycle’da, deploy yo‘li typecheck’siz qolmaydi (`test:build-gates` 13/0) |
| 2. **migration** | **3 ta FORWARD**: `security_evidence_research_2026-11-06.sql` → `official_source_corrections_2026-11-06.sql` → `official_source_followup_2026-11-06_v2.sql` (staging’da, keyin production’da). Recovery fayllari bu zanjirda EMAS | v2 `catalogue_facts.value_type` CHECK’ini kengaytiradi, shuning uchun 1-fayl oldin bo‘lishi shart; v2 `ON CONFLICT DO NOTHING` bilan eski qatorlarni ustidan yozmaydi. Kod yangi jadvallarga (`catalogue_facts`, `cache_revisions`, `review_queue_items`, `official_source_checks`, `research_runs` lease ustunlari) murojaat qiladi; jadval yo‘q bo‘lsa adapter `migration_pending` qaytaradi, lekin ishchi funksionallik to‘liq emas |
| 3. **flag** | `RESEARCH_DURABLE_STORE=1` + `CRON_SECRET` | Flag migration’dan OLDIN yoqilsa `probeDurableMigration()` aniq 503 + `runsStarted:0` bilan xavfsiz to‘xtaydi (`test:research-runtime` 15/0); tartib shuni oldini oladi |
| 4. **worker** | Render Cron Job → `GET /api/cron/research-agent`, 5 min, `Authorization: Bearer $CRON_SECRET`, `limit:1` | In-process timer restart-safe emas; tashqi scheduler + atomik lease + durable DB manba. Parallel limit 1 + lease ikki overlapping tick’ning bir run’ni yozishini oldini oladi |
| 5. **smoke** | §6 oqimi + admin/refresh/API tekshiruvlari | Kod, sxema, flag va scheduler birga ishlashini faqat shu bosqichda isbotlash mumkin; 401/403/503 o‘zi emas, allowed+denied birga |

**Monitoring:** har cron tick `requestId` + `expired/considered/claimed/resumed/finished/skipped/errors` xavfsiz loglaydi; admin status/list aynan shu durable qatorlarni o‘qiydi; review queue failed job’larni ko‘rsatadi. Loglarda secret/hujjat mazmuni/PII yo‘q.

---

## 6. Login → profil → tavsiya → ariza → hujjat oqimi

| Qadam | Lokal dalil | Production’da tekshiriladigan |
|---|---|---|
| Login / reset | `test:password-reset` 38/0, `test:auth` 14/0, `test:security` 107/0, migration dry-run (anon rad + privileged backend ruxsat) | 60 min, one-time, replay blok, generic javob (account mavjudligi oshkor bo‘lmasligi), migratsiyadan keyin ham ishlashi |
| Profil | `test:profile-recompute` 6/0, `test:ownership` 83/0, E2E#13 58s | Profil almashganda eski foydalanuvchi ma’lumoti ko‘rinmasligi; shared cache revision boshqa instance’da eski natija bermasligi |
| Tavsiya / eligibility | `test:typed-evidence` 17/0, `test:admission-probability` 12/0, `test:university-sort` 15/0 | Tanlangan sort profil bilan saqlanishi; tasdiqlanmagan GPA cutoff avto-rad etmasligi; shaxsiy probability % chiqmasligi |
| Ariza | `test:applications-state` 9/0, E2E#13/#23 | API xatosi bo‘sh `applications:[]` ga aylanmasligi; rapid destination change |
| Hujjat | `test:documents` 51/0, `test:documents-readiness` 10/0, E2E#14 39.7s | Noma’lum talab ≠ rasmiy majburiy talab; vault faqat o‘z profiliga; upload/download qonuniy ishlashi, boshqa foydalanuvchiniki rad |

**Qo‘shimcha §13 holatlari:** saqlanmagan forma yangi build/chunk recovery’da yo‘qolmasligi (`test:chunk-recovery` 13/0, E2E 21/0), eski tab → yangi build, moliyaviy natijalar barcha ekranlarda bir xil (`test:finance-unified` 16/0, `test:compare` 44/0), UI+API probability siyosati bir xil (`test:admission-probability` 12/0), worker restart/parallel (`test:research-runtime` 12/0), migratsiyadan keyin login/reset/upload (dry-run + E2E).

---

## 7. Payment sandbox va Telegram mock/test

| Soha | Lokal dalil | Production checklist |
|---|---|---|
| To‘lov | `test:payments` **114/0** (sandbox/mock), real pul operatsiyasi QILINMADI | Sandbox credential’lari bilan bir test to‘lov, webhook imzosi, idempotency, refund/cancel; real kartaga o‘tish alohida ruxsat |
| Telegram / kanal | `test:channel` **196/0** (render/lexicon/escape), `test:telegram*`, hech qanday haqiqiy xabar yuborilmadi | Test bot + test kanal, webhook URL, approval tugmalari, `/tg` public landing akkauntsiz ishlashi, `$5,040`/`GPA +` kabi da’volar chiqmasligi |
| E2E perf | `test:browser-perf` **2/0** (desktop+mobile) | Bu **real-user INP emas**; production’da haqiqiy RUM/field ma’lumoti kerak, threshold `<1300 KiB` oshirilmaydi |

---

## 8. Rollback / recovery — FORWARD zanjiridan ALOHIDA

> **Rollback oddiy forward migration emas.** U hech qachon §5 apply tartibiga, CI’ga, deploy buyrug‘iga yoki idempotentlik testining “ikki marta qo‘llash” qadamiga kiritilmaydi. To‘liq qoidalar: `docs/MIGRATION_RUNBOOK_2026-11-06.md`.

| Migration | Recovery fayli | Qachon (trigger) | Kim | Preflight |
|---|---|---|---|---|
| `security_evidence_research` | `security_evidence_research_2026-11-06_recovery.sql` | backend yozish granti yo‘qolishi yoki RLS qonuniy admin o‘qishni bloklashi | nomli DB operatori, incident ticket | `to_regclass`, grantlar, LOGO SELECT, backend write smoke |
| `official_source_corrections` | `official_source_corrections_2026-11-06_rollback_v2.sql` | **faqat** shu correction’dagi rasmiy iqtibos xato ekani tasdiqlansa | nomli DB operatori | yangi backup, marker `notes` aynan forward matni, `count(*)=1`, MIT qatori forward holatida |
| `official_source_followup_v2` | runbook §5.1 | `recommended_score` CHECK eski kod bilan moslashmasa | nomli DB operatori | `count(*) WHERE value_type='recommended_score'`; 0 bo‘lsa CHECK’ni toraytirish, qatorlarni `is_active=false` qilish (DELETE emas) |
| v1 rollback | — | **hech qachon** | — | barcha ustunlarni ko‘r-ko‘rona yozadi; keyinchalik qonuniy tuzatilgan maydonni ustidan yozadi |

**v2 himoyasi:** har ustun `CASE WHEN <ustun> = <forward qiymati> THEN <kuzatilgan> ELSE <ustun> END` bilan qaytariladi; marker yo‘qolsa yoki >1 qator topsa `PREFLIGHT FAILED … NO ROLLBACK WAS MADE` bilan tranzaksiya bekor bo‘ladi. Rasmiy source linklar, uydurma defaultlar va NOT NULL sharti qayta tiklanmaydi.

**Kod / flag / scheduler recovery (ma’lumot emas):** oldingi build artifact’ga qaytish (`git reset --hard` EMAS), `RESEARCH_DURABLE_STORE` o‘chiriladi (DB qatorlari saqlanadi), Cron Job to‘xtatiladi, `cache_revisions` yangi kalit yaratadi, `cancelled`/`timed_out` checkpoint’lar DB’da qoladi. Hech narsa jismonan o‘chirilmaydi.

**Bitta correction rollback’i `security_evidence_research` ni ham qaytaradi degan da’vo noto‘g‘ri va olib tashlandi.** Har migration’ning recovery yo‘li alohida.

## 9. Production’da keyinchalik tekshiriladigan aniq checklist

- [ ] **3 ta FORWARD** migratsiya staging’da ikki marta qo‘llandi; recovery fayllari qo‘llanmadi (`test:migration-runner` + `test:migration-recovery` yashil).
- [ ] `CRON_SECRET`, `RESEARCH_DURABLE_STORE` qiymatlari o‘rnatildi (qiymatlar hujjatda yo‘q).
- [ ] Render Cron Job 5 min, `limit:1`, monitoring loglari ko‘rinadi; flag+missing migration holati 503 + `runsStarted:0`.
- [ ] `/api/cron/research-agent` anon uchun 401/503, to‘g‘ri Bearer uchun `ok:true`.
- [ ] Katalog/detail/grant API javobida `evidence` envelope; hech bir `legacy_unknown` qiymat `official_minimum` emas.
- [ ] Telegram test xabarida `GPA 3.5+`/`IELTS 6.5+` kabi asserted minimum yo‘q; `$5,040` yo‘q.
- [ ] Admin review queue ochilishi `verified` yozmaydi; qaror reason bilan yoziladi.
- [ ] Refresh `official_source_reverification` da fakt topilmasa `last_verified_at` o‘zgarmaydi; `sourceChecks` ko‘rinadi.
- [ ] Bir foydalanuvchi boshqasining hujjati/reset tokeni/arizasini o‘qiy olmaydi; o‘ziniki ishlaydi (allowed+denied).
- [ ] Login → profil → tavsiya → ariza → hujjat oqimi (§6) yashil.
- [ ] Payment sandbox + Telegram test/mock yashil; real operatsiya alohida ruxsat.
- [ ] `npm audit --omit=dev` 0; 4 ta dev-only qoldiq advisory hujjat bilan asoslangan; threshold oshirilmagan.
- [ ] Landing JS `<1300 KiB`; browser benchmark real-user INP sifatida taqdim etilmagan.
- [ ] Supabase Auth ishlatilmagani uchun Auth URL o‘zgartirilmadi; custom `sb_session`/redirect tekshirildi.

> Bu hujjat “hammasi tayyor” degan da’vo emas. Production qo‘llash, real credential’lar va aniq foydalanuvchi ruxsati talab qilinadigan qismlar `docs/HISOBOT_YAKUNIY_2026-11-06.md` da 3/4-toifalarda aniq ko‘rsatilgan.

---

## 10. Joriy kod bo‘yicha qo‘shimcha (2026-11-06 davomi)

### Schema compatibility — §5 tartibi qanday tekshirildi

`build → migration → flag` ketma-ketligi shablon sifatida ko‘chirilmadi; u **haqiqiy sxema bog‘liqliklari** bilan asoslandi:

| Bog‘liqlik | Dalil | Agar tartib buzilsa |
|---|---|---|
| `official_source_followup_v2` → `security_evidence_research` | v2 `catalogue_facts.value_type` CHECK’ini `ALTER` qiladi; jadval 1-faylda yaratiladi | `ALTER` `42P01 undefined_table` bilan abort |
| `official_source_followup_v2` → `official_source_corrections` | v2 ikkita legacy qatorning `value_type` ini `UPDATE` qiladi; ular 2-faylda `review_needed` holatiga o‘tkaziladi | 0 qator yangilanadi, natija jim noto‘g‘ri |
| Kod → yangi jadvallar | `officialSourceAdapter.server.ts`, `cacheRevision.ts`, `reviewQueue.ts`, `durableStore.ts` ularga murojaat qiladi | adapter `migration_pending` qaytaradi (xavfsiz), lekin funksionallik to‘liq emas |
| `RESEARCH_DURABLE_STORE=1` → `research_runs` | `probeDurableMigration()` `to_regclass` tekshiradi | 503 + `runsStarted:0`, hech narsa yozilmaydi |
| `recommended_score` → eski build | CHECK kengaytirilgan, eski kod qiymatni `unverified_value` sifatida ko‘rsatadi (minimum emas) | xavfsiz degradatsiya; shuning uchun v2 oxirida qo‘llanadi |

Bu bog‘liqliklar `npm run test:migration-recovery` (disposable PG’da 3 forward → 2× apply → guarded abort → recovery) va `npm run test:migration-runner` (runner hech qachon recovery faylini apply ro‘yxatiga olmaydi) bilan isbotlandi.

### Production checklist’ga qo‘shilgan bandlar

- [ ] **Backup**: 3 forward’dan oldin `catalogue_facts`, `scholarships`, `universities`, `university_sources`, `sources`, `storage.objects` policy/grant snapshot’i; v2 marker `notes` matni preflight uchun saqlansin.
- [ ] **DB preflight**: `to_regclass('public.catalogue_facts')`, `value_type` CHECK tarkibi, marker `count(*)=1`, Yenching/MIT dinamik nom/domen/source guard’lari 0 yoki >1 qator bermasligi.
- [ ] **Official-source smoke**: `officialSourceAdapter.server.ts` orqali MIT `tests-scores` / `stats` va Yenching `ADMISSIONS` sahifalari qayta o‘qiladi; muvaffaqiyatsiz check `last_verified_at` ni yangilamaydi. Dalil: `docs/OFFICIAL_SOURCE_READ_2026-11-06.md`.
- [ ] **Cron auth**: `Authorization: Bearer $CRON_SECRET` constant-time tekshiruvi; anon 401/503, `runsStarted:0`; parallel tick `limit:1` + atomik lease.
- [ ] **Recovery triggerlari**: har migration uchun §8 dagi alohida fayl/owner/preflight; hech biri deploy buyrug‘iga yoki CI’ga kiritilmagan.
- [ ] **User-flow smoke**: public `/tg` akkauntsiz, login/logout/reset, profil saqlash + tavsiya yangilanishi, qidiruv/filter/sort/pagination, save/compare/export, ariza+hujjat, admin research/refresh/review, deep link/back-forward/alias, EN/UZ/RU va light/dark.

### Yangi lokal artefaktlar (production’ga tegishli emas)

`scripts/validate-local.sh` (35 check, `npm run validate:local`), `scripts/check-design-system.ts` (10/0), `scripts/check-migration-runner.ts` (9/0), `scripts/check-migration-recovery.ts` (7/0), `docs/OFFICIAL_SOURCE_READ_2026-11-06.md`, `docs/MIGRATION_RUNBOOK_2026-11-06.md`, `src/components/ui/{StatusPill,ActionBar}.tsx`. Barchasi `.github/workflows/ci.yml` va `ci/security-ci.yml` P1 chain’iga qo‘shilgan; `test:build-gates` 13/0 parity’ni tekshiradi.

**Chegara:** production migration/apply, deploy, push, real payment, real Telegram va real user-flow **qilinmadi**. `CRON_SECRET`, `RESEARCH_DURABLE_STORE` va boshqa env faqat **nomlari** bilan ko‘rsatilgan; qiymatlari hujjatda yo‘q. Custom `sb_session` HMAC ishlayotgani sabab Supabase Auth URL’iga o‘zgartirish kiritilmadi.
