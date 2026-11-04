# Backend audit va barqarorlik tuzatishlari — 2026-11-04

## Yakuniy natija

Repository backend’i, so‘rov body’lari, AI/research tarmoq yo‘llari, PostgreSQL pool’i, config yozishlari va cache parallel ishlashi tekshirildi. Topilgan bir nechta 500, uzoq kutish, ortiqcha SQL va stale-cache sabablariga kod darajasida tuzatish kiritildi.

- **12 backend test to‘plami: jami 1 292 ta reported check o‘tdi.** Bu to‘plamlarning o‘z hisoblagichlari yig‘indisi; 1 292 ta mustaqil production ssenariysi degani emas.
- **Yangi production build bilan 18 ta functional test o‘tdi**, shundan 4 tasi yangi backend HTTP resilience testi. 0 failed, 0 skipped, 0 flaky; 232 850 ms.
- **157 API route fayli / 280 handler**, qo‘shimcha 49 disposable-fixture probe: anonymous tekshiruvlarda private handler’dan 2xx topilmadi. Bu barcha payload va barcha authorization kombinatsiyalarining isboti emas.
- Typecheck, production build, stage-3 response-hygiene, compiled performance budget va lint gate o‘tdi. **Lint: 0 error, 0 warning.**
- Yangilangan dependency audit: **0 critical, 0 high, 12 moderate**. Moderate advisory’lar bu ishda dependency upgrade bilan yopilmadi.
- **Production bazaga yozish, real to‘lov, pullik AI chaqiruvi, channel publish yoki deployment bajarilmadi.** Oldingi uncommitted ishlar saqlandi.

Mashina o‘qiydigan, credential’siz dalil: [`data/backend-audit/2026-11-04/summary.json`](../data/backend-audit/2026-11-04/summary.json).

## Tuzatilgan sabablar

### 1. Noto‘g‘ri JSON va cheklanmagan body

Oldin sintaktik jihatdan valid `null`, array yoki scalar JSON ayrim handler’larda `.email`, `.profileId` kabi murojaatlarni yiqitib, 500 berishi mumkin edi. Shared `readJsonBody` endi application payload uchun object envelope talab qiladi. Noto‘g‘ri JSON/envelope — 400, ortiqcha body — 413, body deadline — 408.

Qolgan **24 ta bevosita `req.json()` o‘qishi 18 route faylida** bounded helper’ga o‘tkazildi. Oldingi auth/premium gate tartibi saqlandi. Essay yo‘llarida valid `{}` saqlanadi, malformed JSON endi yashirincha `{}` ga aylantirilmaydi. Payme JSON-RPC uchun `allowNonObject` aniq istisno bo‘lib qoladi: protocol xatolarini uning o‘zi tasniflaydi.

Default limit 256 KiB / 30 s; kichikroq route-specific limitlar o‘zgarmadi, masalan `/api/profiles` — 64 KiB. `Content-Length` yo‘q yoki noto‘g‘ri bo‘lsa ham haqiqiy o‘qilgan byte’lar sanaladi. Sekin stream yoki tugamaydigan cancellation cheksiz kutilmaydi. CI regression testi route fayllarida qayta bevosita `req/request.json/text/arrayBuffer/formData` paydo bo‘lishini tekshiradi.

Asosiy fayllar: `src/lib/boundedBody.ts`, `src/lib/request.ts`, API route’lar.

### 2. AI javob body’si va retry/fallback kutishi

Timeout faqat response header kelguncha amal qilib, javob body’si osilib qolishi mumkin bo‘lgan yo‘l tuzatildi. Shared AI transport header **va body** uchun deadline va 2 MiB limit ishlatadi.

`aiChat` bir logical call uchun umumiy provider budjetini saqlaydi: free-model candidate, retry/backoff va provider fallback har safar to‘liq yangi timeout olmaydi. Default yuqori chegara 60 s; caller bergan kichikroq budjet saqlanadi, kamida 1 s. Deadline tugagandan keyin yangi paid attempt boshlanmaydi. Bu barcha route SQL/logging ishlarini ham 60 s ichiga kafolatlaydigan umumiy HTTP SLA emas.

Admin provider connection probe ham bounded response o‘qiydi. Visa Live token yaratishda SDK timeout 15 s, bitta attempt va caller/deadline abort signali belgilandi. Real Gemini token yaratish bu auditda chaqirilmadi.

Asosiy fayllar: `src/lib/ai/index.ts`, `src/lib/ai/test.ts`, `src/app/api/visa/live-token/route.ts`.

### 3. PostgreSQL ulanishlari, uzoq query va lock kutishi

Production defaultlari alohida tekshiriladigan `databasePoolOptions` helper’iga chiqarildi:

| Parametr | Default / chegara |
| --- | --- |
| Pool max | 5; `VERCEL=1` bo‘lsa 3; override 1–20 |
| Connect timeout | 8 s |
| Client query + server statement timeout | 20 s; valid override 250–60 000 ms |
| Lock timeout | ko‘pi bilan 5 s va query budjetidan katta emas |
| Idle transaction timeout | 30 s |
| Idle connection timeout | 30 s |

Noto‘g‘ri/NaN/zero query timeout cheklovni tasodifan o‘chirib qo‘ymaydi. Query deadline’lar production uchun; development va migration ishlari ularni avtomatik olmaydi. Pool chegarasi **har process uchun**, butun deployment connection cap’i emas.

Nested driver/aggregate connection xatolari, `57014` query cancellation va `55P03` lock timeout vaqtinchalik DB nosozligi sifatida taniladi. Shared growth server-error yo‘li 503 beradi; **hamma legacy route barcha DB timeout’ni 503 ga aylantiradi**, degan da’vo yo‘q.

Haqiqiy disposable PostgreSQL’da `SELECT pg_sleep(5)` uchun 2 s budjet, 300 ms bloklangan table lock va ikkalasidan keyin healthy query tiklanishi tekshirildi.

Asosiy fayllar: `src/db/poolOptions.ts`, `src/db/index.ts`, `src/lib/dbError.ts`, `src/lib/growth/api.ts`. Env izohi `.env.example` va `docs/BACKEND_PERFORMANCE.md` da yangilandi.

### 4. Parallel cache va config yozishlari

`AsyncTtlCache` pending load’ni TTL davomida ortiqcha qayta boshlamaydi: freshness load tugagandan keyin boshlanadi. Invalidated eski promise yangi entry’ni o‘chira yoki qayta joylashtira olmaydi. Rejected load cache’dan chiqadi. Catalogue snapshot, profile matching, activities va config yo‘llarida bounded/single-flight cache ishlatiladi.

Config’dagi read-then-insert race atomik UPSERT’ga almashtirildi; description berilmasa mavjud description saqlanadi. 12 parallel birinchi yozish, bitta key uchun 12 cold read → **aynan bitta haqiqiy SQL query**, description saqlanishi va delete invalidation real PostgreSQL’da o‘tdi.

Bu process-local cache: distributed invalidation emas. Capacity eviction pending ishni ham chiqarishi mumkin; bu global concurrency limiter emas. Universitet detail’ining eski alohida get/set Map cache’i ushbu single-flight migratsiyasiga kiritilmadi — cheklovlar bo‘limiga qarang.

Asosiy fayllar: `src/lib/asyncTtlCache.ts`, `catalogCache.ts`, `profileMapping.ts`, `config.ts`.

### 5. Research fetch resurslari va redirect’lar

Boshlang‘ich URL ham, redirect hop’lari ham lexical outbound guard’dan o‘tadi. Redirect body cancellation kutilmaydi; origin o‘zgarsa authorization/cookie/proxy-auth/host olib tashlanadi.

Page fetch: 15 s, 2 MiB, 64 entry / 8 MiB cache, ko‘pi bilan 8 in-flight page load va duplicate so‘rovlarni coalesce qilish. Permanent 4xx behuda qayta urilmaydi. Oversized/PDF/non-page javobdan qisman matn chiqarib, uni fakt sifatida cache qilish yo‘q. Optional web-search API ham 10 s / 1 MiB cheklov va guarded redirect yo‘lidan foydalanadi.

Bu DNS pinning yoki rebinding’dan to‘liq himoya emas; background research run uchun durable queue ham qo‘shilmadi.

Asosiy fayllar: `src/lib/research-agent/fetch.ts`, `providers.ts`.

### 6. Admin upload va notification pagination

Admin branding multipart body’si authorization’dan **keyin**, parser’dan **oldin** byte-limit bilan o‘qiladi: 5 MiB file + 64 KiB envelope, 30 s body deadline. Malformed multipart — 400, oversized request — 413. Supabase upload response’i 15 s / 64 KiB bilan cheklangan; storage nosozligi cheksiz kutishga aylanmaydi va provider body’si log’ga chiqarilmaydi.

Notifications `limit=abc`, negative/fractional/Infinity kabi qiymatlar bilan SQL 500 chiqarmaydi: invalid — 400; valid katta limit 200 ga clamp qilinadi; default 50.

Asosiy fayllar: `src/app/api/admin/branding/upload/route.ts`, `src/app/api/notifications/route.ts`.

## Test dalillari

Barcha quyidagi to‘plamlar yakuniy process exit code **0** bilan tugagan:

| To‘plam | O‘tgan reported checks |
| --- | ---: |
| backend-resilience | 30 |
| dashboard-cache | 13 |
| security | 107 |
| ai-settings | 98 |
| integration | 421 |
| payments | 114 |
| journey | 115 |
| ownership | 83 |
| telegram | 40 |
| channel | 196 |
| portability | 57 |
| schema-repair | 18 |
| **Jami** | **1 292** |

Qo‘shimcha: 18 production functional test, 15 compiled performance-budget check, 27 audit-safety assertion, 15 isolated-environment assertion, stage-3 response hygiene, typecheck/build/lint va dependency gate o‘tdi. Browser testi desktop/mobile, en/uz/ru, public/student/admin route va recovery/logout holatlarini ham qamradi.

Yangi 4 HTTP ssenariysi: public malformed/oversized JSON; cold/warm/concurrent boot va catalogue o‘qishlari; own/other profile, `no-store`, invalid writes/pagination va keyingi recovery; admin malformed/6 MiB multipart reject.

Anonymous audit’da 2xx chiqmagan, lekin quyidagi 404’lar auth verdict bilan tenglashtirilmadi: `PUT/DELETE /api/goals`, `GET /api/health/diagnostics`, `DELETE /api/saved-programs`.

Audit davomida testning ikkita muammosi ham yashirilmadi: avval notifications’ga xato POST yuborilgan (haqiqiy contract PATCH/PUT); query-timeout’dan keyin pool’dan chiqarilgan socket yopilishini kutmasdan Postgres to‘xtatilganida teardown race bo‘lgan. Contract testi to‘g‘rilandi va disconnect event’lari to‘liq drain qilindi. Dastlabki failed exit yakuniy PASS sifatida hisoblanmadi.

## Qayta bajarish

Core 6 suite uchun sanitized launcher:

```sh
npm run test:backend-audit
```

Yangi resilience to‘plami CI workflow va uning portable mirror’iga ham qo‘shildi:

```sh
npm run test:backend-resilience
```

Production build tayyor bo‘lgandan keyin disposable HTTP/browser tekshiruvlari:

```sh
E2E_NEXT_MODE=start npm run test:e2e -- e2e/backend-resilience.spec.ts e2e/phase12.spec.ts e2e/site-audit.spec.ts e2e/first-paint.spec.ts
npm run test:api-security:isolated
```

Boshqa 6 suite ushbu auditda credential’lari tozalangan child environment’da ketma-ket bajarildi: journey, ownership, telegram, channel, portability, schema-repair. Real servis credential’lari bilan test ishga tushirmaslik kerak. Build ham blocked loopback DB va olib tashlangan provider credential’lari bilan bajarildi.

To‘liq lokal log’lar: `test-results/backend/`. Ular Git’dan ignore qilingan; durable sanitized xulosa yuqoridagi JSON’da saqlangan. Node v22.22.3, Next 16.4.2. Source fingerprint: `86014e8da77099f586ba91351531e0f40c24effddd16de114b79528613d73ce3`; aniq 835-file scope JSON’da berilgan.

## Hali kafolatlanmagan yoki qolgan chegaralar

1. **Deployment bajarilmadi.** Production infratuzilma, pooler timeout parametrlarini qabul qilishi, traffic, connection cap va provider holati target muhitda alohida tekshirilishi kerak.
2. Real AI, Gemini Live, storage upload, SMTP va payment gateway acceptance test qilinmadi. Tarmoq fault’lari loopback/mocked; purchase va real publish yo‘q.
3. Bu production-scale load benchmark emas. Cold/warm testlar kichik lokal fixture’da bajarildi; backend tezligi “falon foiz oshdi” degan baseline yo‘q. Oldingi browser performance hisobotidagi o‘lchovlar tarixiy, backend patch’i bilan qayta o‘lchangan natija emas.
4. Per-query limit butun route deadline’i emas: ketma-ket SQL, retries va logging umumiy kutishni oshirishi mumkin. Multi-instance cache invalidation/circuit breaker qo‘shilmadi.
5. Universitet detail’ining legacy get/set cache’ida in-flight read/admin invalidation race’i hali qolishi mumkin; barcha cache yo‘llari atomik loader’ga aylantirildi, degan da’vo yo‘q.
6. Background research run registry process-local va durable emas; deploy/restart/serverless freeze uchun queue/worker arxitekturasi kerak bo‘lishi mumkin. Lexical SSRF guard DNS pinning o‘rnini bosmaydi.
7. **12 moderate dependency advisory qolgan.** 0 high/critical natijasi barcha xavfsizlik yoki biznes-input xatolari yo‘q degani emas. Har field/payload va har production holati exhaustive tekshirilgani da’vo qilinmaydi.

Branch: `arena/6db82aa0-scholarbridgeai`; HEAD/base `788d66c105d4fa7bd7a9d0d56426db7d58f76c40`. O‘zgarishlar working tree’da saqlangan; yangi commit, push, PR yoki deploy qilinmadi.
