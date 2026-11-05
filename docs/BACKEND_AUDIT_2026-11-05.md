# Backend qayta auditi — 2026-11-05

## Natija va qamrov

Backenddagi aniqlangan concurrency, request validation, cache invalidation va tashqi javoblarni cheklash muammolari tuzatildi. Kengaytirilgan backend regressiyasi: **18 suite, 1 558 tekshiruv, 0 xato**. Shundan **499 tasi haqiqiy, vaqtinchalik PostgreSQL bilan integration tekshiruvi**. 1 558 — suite'lar hisobotidagi check/assertion sonlari yig'indisi; assertion granularity bir xil emas va bu coverage foizi emas.

**Barcha repository gate'lari yashil emas:** alohida frontend `test:perf` gate'ida 14 tekshiruv o'tdi, landing JavaScript budjeti o'tmadi: **1 332 243 byte, yaxlitlangan 1 301 KiB; talab `<1300` KiB**. Budjet oshirilmadi. Hero uchun eski, ortiqcha qat'iy source-regex layout atributlarini ham qabul qiladigan qilib tuzatildi; JavaScript o'chirilgan browser testi hero ko'rinishini alohida tasdiqladi. Frontend dizayni o'zgartirilmadi.

Ish branch'i: `arena/d2e097dd-scholarbridgeai`, boshlang'ich commit `aba817fc561fc4703794b241cd8028b2b4d681f9`. Ushbu ish uchun commit, PR, deploy yoki production migration bajarilmadi.

### Fayllar bo'yicha dalil

`data/backend-audit/2026-11-05/backend-file-inventory.json` har bir scoped fayl uchun yo'l, hajm, qatorlar, SHA-256 va tegishli parse natijalarini saqlaydi:

- **702 fayl, 135 133 qator**: 464 TypeScript/JavaScript, 2 JSON, 236 SQL.
- Runtime source: `src/app/api`, `src/lib`, `src/db`, `src/proxy.ts`, `src/instrumentation.ts`, `next.config.ts`, `drizzle.config.ts`.
- SQL: `supabase` ichida 112 faol fayl, `archive/supabase` ichida 124 tarixiy fayl.
- **157 API route fayli, 280 HTTP handler**.
- TypeScript AST va JSON parsing: 0 syntax xatosi. `tsc` import/type mosligini alohida tekshirdi.
- Barcha 236 SQL fayli `pglast v8.7` PostgreSQL grammar parser'idan o'tdi. SQL hech qayerda shu parser tomonidan execute qilinmaydi.
- Tanilgan `req/request.json/text/arrayBuffer/formData` to'g'ridan-to'g'ri chaqiruvlari AST scan'ida qolmadi. Bu data-flow security proof emas.

**Muhim farq:** inventarizatsiya barcha scoped fayllarni avtomatik o'qish/parse qilishdir; 135 ming qatorning har biri qo'lda security review qilingan degani emas. Kritik mutatsiya, auth, cache, SQL va provider yo'llari alohida tekshirildi. Lexical indikatorlar — review yordamchisi, o'z-o'zidan zaiflik yoki stub dalili emas. Archive SQL faqat o'qildi va parse qilindi, qayta tatbiq qilinmadi.

## Tuzatilgan muammolar

### 1. Parallel progress, reward, badge va certificate yozuvlari

`src/lib/gamification.ts`, `src/lib/certificates.ts`, kurs progress va quiz route'lari:

- Profile qatori `FOR NO KEY UPDATE` bilan transaction ichida serializatsiya qilinadi; FK lock'lari bilan mosligi saqlanadi.
- Reward ledger va point total bir transaction'da yoziladi; total atomik oshiriladi.
- Helper'lar transaction executor'ini ishlatadi, transaction ichidan yana global pool connection olish yo'llari olib tashlandi.
- Sovuq `user_points` yaratish UPSERT va levels bootstrap advisory lock bilan himoyalandi.
- Progress qayta yuborilganda watched time/completion ortga qaytmaydi. Reward va certificate retry'lari idempotent; certificate code collision'lari cheklangan retry bilan boshqariladi.
- Quiz answers va ID/seconds tekshiruvi qat'iylashtirildi; draft kursga bevosita yozish bloklandi.

Dalil: 12 parallel chaqiruvlar, bitta reward/badge/certificate, ledger-total mosligi, overflow rollback, noto'g'ri quiz javoblari va draft course uchun integration tekshiruvlari. Production HTTP testida ham parallel progress qayta yuborish tekshirildi.

### 2. Telegram sozlamalari va token rotation race'i

`src/lib/telegram/settings.ts`:

- Parallel ilk saqlash unique constraint xatosi o'rniga UPSERT ishlatadi.
- Sovuq parallel settings o'qish singleflight bilan birlashtirildi; regression aynan 2 SELECT bajarilishini tekshiradi.
- Eski ciphertext rotation'i yangi admin tokenini ustidan yozmasligi uchun compare-and-swap qo'llandi.

Dalil: 12 parallel yozuv, sovuq o'qish query soni va eski/yangi encryption-key race'i haqiqiy vaqtinchalik PostgreSQL'da tekshirildi.

### 3. Cache invalidation va eski reader race'i

`src/lib/catalogCache.ts`, university detail route'i, `src/lib/refresh.ts`:

- Reader boshlangandagi generation saqlanadi; invalidation'dan oldin boshlangan reader yangi cache'ni eski payload bilan qayta to'ldira olmaydi.
- Refresh'da o'zgarish bo'lsa tegishli katalog `finally` orqali invalidatsiya qilinadi, keyingi operatsiya xato qilganda ham.

Dalil: eski reader generation'i yangi generation'dagi yozuvni qaytara olmasligi uchun mocked regression va dashboard/rank cache testlari. Bu distributed/fleet cache invalidation kafolati emas.

### 4. Header/body deadline, limit va cancellation

`src/lib/boundedBody.ts`, Telegram/Groq client'lari, specialized OpenRouter call'lari va visa TTS reader'i:

- Faqat response header emas, body o'qish ham deadline va byte limit ichida.
- Header kelishini kutishda abort'ga javob bermaydigan fetch ham caller'ni cheksiz ushlab turmaydi; kech kelgan body bekor qilinadi.
- `cancel()` hech tugamaydigan stream'da ham caller bekor qilish Promise'ini kutib qolmaydi.
- Telegram butun retry ketma-ketligini cheklangan call budget ichida bajaradi; body 1 MiB.
- Groq body 2 MiB; default/maximum call budget 60 s. Error matnida konfiguratsiyadagi aniq API key va key-shaped matn yashiriladi.
- Specialized OpenRouter call'lari umumiy bounded reader'ni ishlatadi: 2 MiB, default 20 s, finite timeout 250–30 000 ms oralig'ida.
- TTS audio reader'i ham umumiy abort-aware bounded reader'dan foydalanadi.

Dalil: stalled header/body, abort, oversize, osilib qoladigan cancel, max timeout va key-redaction fault injection. Groq test mock'i haqiqiy `Response.json(...)` ga o'tkazildi; ishlab chiqarishdagi limitlar mock uchun zaiflashtirilmadi. Live pulli provider chaqiruvlari bajarilmadi.

### 5. ID, pagination va audit filter'lari

`src/lib/auth.ts`, `src/lib/pagination.ts`, profile/course/forum numeric route'lari, admin audit/channel route'lari:

- Omitted profile bilan explicit invalid profile ajratildi. `NaN`, boolean, object, negative yoki overflow ID caller profile'iga jim fallback qilmaydi.
- Umumiy ID helper musbat PostgreSQL int32 va decimal string'larni qabul qiladi; partial, scientific, hex va whitespace alias'lari rad etiladi.
- Forum query/path ID va page tekshiruvi SQL'dan oldin bajariladi.
- Admin pagination finite integer bo'lishi shart; limit 500, offset 100 000 bilan cheklangan. Ichki list helper'lari ham cheklangan.
- **`entityId=0` endi aniq audit filter**: singleton config/ownership log'lari uchun 0 haqiqiy qiymat; truthiness sabab barcha entity log'larini qaytarish xatosi tuzatildi.

Dalil: admin bo'lsa ham malformed claimed profile rad etilishi, anonymous optional profile validation, malformed forum/admin query'lari, int32 chegaralari, `1e2`/`0x10` va audit 0/nonzero exact filter integration + HTTP testlari.

### 6. Research agent admission va retention

Yangi `src/lib/research-agent/request.ts`, registry va run/batch route'lari:

- 1–50 university ID, faqat ruxsat etilgan 8 scope, `maxPages` 1–16 va haqiqiy boolean `dryRun` tekshiriladi.
- `maxPages` batch orqali ham worker'ga yetkaziladi.
- Har process'da 2 active / 20 retained run; tugagan run'lar uchun 30 minut TTL.
- Progress 40 yozuv × 2 048 character, serialized report 2 MiB bilan cheklangan.
- To'lgan registry 429 qaytaradi; detached worker rejection'i ushlanadi.

Dalil: request parser/registry unit testlari va malformed admin HTTP request'laridan keyin hech qanday research run boshlanmagani. Bu durable queue emas; source adapters yoki yangi verified admissions faktlari o'ylab qo'shilmadi.

## Bajarilgan tekshiruvlar

| Tekshiruv | Natija |
| --- | --- |
| Kengaytirilgan offline/disposable backend audit | 18 suite / 1 558 check / 0 failure |
| Shundan real PostgreSQL integration | 499 passed / 0 failed |
| Production `next start` browser/API regressiyasi | 21 passed; desktop/mobile viewport, EN/UZ/RU, public/student/admin |
| Yakuniy ID/audit tuzatishlaridan keyingi focused production HTTP rerun | 7 passed |
| Anonymous API surface + fixture authorization probes | 280 handler / 157 route / 49 qo'shimcha fixture probe; unexpected anonymous 2xx yo'q |
| Typecheck | PASS |
| ESLint baseline | PASS — 0 error, 0 warning |
| Production build | PASS |
| Stage 3 performance/response hygiene | PASS |
| Audit harness safety / isolated env / visa regression | PASS |
| Offline schema + documentation | PASS — 113 table, 1 228 column nomi |
| Full-schema apply safety guard | PASS |
| Catalogue/official-source migration regression | PASS — faqat fictional, disposable PostgreSQL |
| PostgreSQL grammar parse | 236/236 fayl PASS; execute qilinmadi |
| Dependency security gate | 0 high, 0 critical; 12 moderate advisory qolgan |
| Alohida frontend performance gate | **14 PASS / 1 FAIL — landing JS budget** |

API scanner 4 ta 404 javobni alohida classification note sifatida saqlaydi: `PUT/DELETE /api/goals`, `GET /api/health/diagnostics`, `DELETE /api/saved-programs`. Ular unexpected success emas; har qanday payload uchun auth to'g'riligini isbotlamaydi.

## Qolgan chegaralar va qilinmagan ishlar

- Research run/cache/scheduler state process-local. Serverless restart, bir nechta instance, durable retry/queue yoki fleet-wide coordination kafolatlanmadi. Research multi-university run uchun overall deadline/durable worker hali alohida arxitektura ishi.
- Yangi application yo'llaridagi profile lock'lari testlangan; eski duplicate ledger/badge/certificate yozuvlari yoki to'g'ridan-to'g'ri SQL writer'lari uchun yangi DB uniqueness migration/dedup bajarilmadi.
- Ba'zi legacy `parseInt` call site'lari qolgan. Markaziy auth helper allaqachon boshqa caller tomonidan coercion qilingan raw string'ni qayta tiklay olmaydi; har bir input to'liq canonical bo'ldi deb da'vo qilinmaydi.
- Barcha tashqi provider payload schema'lari exhaustive tekshirilmagan. Mocked timeout/error sinovlari live provider, payment, storage, SMTP yoki production load sinovining o'rnini bosmaydi.
- SQL grammar parse migration ordering, row semantics, RLS/fleet deployment yoki PL/pgSQL function body compilation'ini isbotlamaydi. Production schema tekshirilgani/tuzatilgani da'vo qilinmaydi.
- Manual refresh hozir mavjud data sana/status holatini yuritadi; source adapter ro'yxatdan o'tmaguncha yangi rasmiy faktlarni avtomatik yig'ishi da'vo qilinmaydi.
- Landing bundle budjeti va 12 moderate dependency advisory ochiq qolgan. Ular yashirilmadi, test threshold'i oshirilmadi.
- Production DB yozuvi, production migration replay, real purchase, pulli AI, channel publishing, deploy yo'q. Oldingi admissions/visa backlogs va fictional/composite essay/LoR provenance o'zgartirilmadi. 'To'ldirish' tekshirilmagan faktlarni to'qib qo'shish sifatida talqin qilinmadi.

## Qayta ishga tushirish va dalillar

```sh
node scripts/inventory-backend.mjs
npm run typecheck
npm run test:backend-audit
npm run lint:baseline
# Production build'dan so'ng, disposable test harness bilan:
E2E_NEXT_MODE=start npm run test:e2e -- e2e/backend-second-pass.spec.ts e2e/backend-resilience.spec.ts
npm run test:api-security:isolated
```

Ixtiyoriy, faqat static SQL tooling — runtime dependency emas:

```sh
python -m pip install --target .cache/backend-sql-parser pglast==8.7
PYTHONPATH=.cache/backend-sql-parser python scripts/check-backend-sql.py
```

`npm run test:backend-audit` credential'lari sanitizatsiya qilingan child process'larni ishga tushiradi. Oddiy `build` va boshqa testlarni ham live credential'larsiz, isolated environment'da bajaring; build/runtime boot hook'lari mavjud.

Durable dalillar: `data/backend-audit/2026-11-05/summary.json`, `backend-file-inventory.json`, `backend-sql-grammar.json`. Batafsil session log'lari: `test-results/backend/second-pass-*.log` va har suite uchun alohida log. Yangi second-pass checks va inventarizatsiya mavjud backend CI gate'iga qo'shildi; ixtiyoriy Python parser CI uchun majburiy dependency qilinmadi.
