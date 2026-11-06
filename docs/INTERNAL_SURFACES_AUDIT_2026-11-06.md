# Ichki bo‘limlar, navigatsiya va render qilingan matn auditi — 2026-11-06

> **Usul:** repository kodi va testlarni o‘qish, statik regression guard’lar, disposable PostgreSQL va local build. Bu **real foydalanuvchi production oqimi emas**. Hech qanday production DB yozuvi, deploy, real to‘lov, Telegram xabari yoki kanal posti bajarilmadi.

## 1. Navigatsiya arxitekturasi

`src/lib/navSections.ts` yagona manba sifatida tekshirildi:

| Obyekt | Soni |
| --- | ---: |
| Journey group | 6 (`home`, `explore`, `plan`, `applications`, `after`, `help`) |
| Asosiy destination | 14 |
| Pane / ichki tab | 33 |
| Utility screen | 5 (`payments`, `notifications`, `rewards`, `parent`, `admin`) |
| Legacy hash alias | 38 |

`npm run test:internal-surfaces` (8/0) quyidagilarni tasdiqlaydi:

- barcha 6 group label EN/UZ/RU da mavjud va bo‘sh emas;
- 14 destination + 5 utility `src/app/HomeClient.tsx` da render branchga ega;
- 33 pane uchun EN/UZ/RU `navPanes` kaliti mavjud;
- barcha `#section/pane`, legacy alias va utility ID `resolveNavTarget` orqali to‘g‘ri yo‘naltiriladi;
- noma’lum hash `null` qaytaradi — foydalanuvchi notanish `#...` dan dashboard’ga majburan tashlanmaydi;
- `#chancing`, `#vault`, `#workspace` kabi eski deep linklar saqlanadi.

## 2. Public Telegram landing sahifalari

- Eski `middleware.ts` / `src/middleware.ts` fayllari yo‘q. Next 16’da ularning o‘rnida `src/proxy.ts` ishlaydi; u faqat locale rewrite, CSP/security/CSRF headerlari va private/no-store cache siyosatini boshqaradi. Unda `requireAuth`, `getSession`, `auth()` yoki `/login` / `/dashboard` ga global redirect yo‘q — statik guard buni tekshiradi.
- `/universities`, `/universities/[id]`, `/scholarships`, `/scholarships/[id]` sahifalarida `requireAuth`, `getSession`, `auth()` yoki `/login` / `/dashboard` ga majburiy redirect yo‘q.
- `redirect()` faqat pagination’da `/universities?page=…` kabi **o‘sha public katalog ichida** ishlatiladi; test boshqa target’ni rad etadi.
- `/tg`, `/parent/[token]`, `/certificates/[code]` route fayllari mavjud; `/tg` Telegram Mini App skriptini CSP nonce bilan yuklaydi.
- Grant tafsilotlari hali ham akkauntsiz ko‘rinadi; ular dashboard bilan almashtirilmadi.

## 3. Render qilingan matn va yillar

`npm run test:rendered-copy` (6/0):

- `formatYear(2026) === "2026"`, `formatYear(1861) === "1861"`; yillar `2,026` / `1,861` ko‘rinishida guruhlanmaydi.
- `UniversityDetail` QS edition va founded year uchun `formatYear` ishlatadi.
- EN xabarlarda `All Countries ({count})` → `All countries ({count})` tuzatildi.
- UZ/RU xabarlarida `days left`, `All Countries`, `25 days left` kabi inglizcha aralash matn yo‘q; `kun qoldi` / `Осталось`, `Barcha davlatlar` / `Все страны` ishlatiladi.
- `publicFeatures` EN/UZ/RU da shaxsiy qabul ehtimoli va’da qilinmaydi; inkor qilingan ogohlantirishlar saqlanadi.

`src/lib/format.ts` ga `formatYear` qo‘shildi; null/NaN, kasr va 1000–9999 oralig‘idan tashqari qiymatlar placeholder’ga tushadi. Bu yil maydonlarini oddiy pul/count formatter’idan ajratadi.

## 4. Design system va oldingi tuzatishlar

- `DailyStreakCard`, `PremiumFAQ`, `PremiumTestimonials` ichidagi tugmalar `Button variant="unstyled"` bilan qolgan; gradient/outline konflikti qayta kiritilmadi.
- Tekshirilgan landing/public sahifalarda xom `<img>` qolmagan.
- `AdminOverview` kontrast tuzatishlari, LazyMotion `Motion` aliaslari va `prebuild: npm run typecheck` saqlanadi.
- EN/UZ/RU va light/dark rejimlari kodda mavjud; lekin har bir ekranni real browser’da ko‘zdan kechirish alohida production tekshiruvi hisoblanadi.

## 5. Ma’lumotlar, dalil va ehtimol siyosati

- `src/lib/evidencePolicy.ts` shaxsiy qabul ehtimolini `available:false, reason:"no-validated-methodology"` sifatida yagona manbada saqlaydi.
- Fit balli, evidence coverage, eksperimental indeks va tarixiy acceptance rate bir-biridan ajratiladi; hech biri “sizning qabul ehtimolingiz” deb ko‘rsatilmaydi.
- `catalogue_facts` migration’dagi 7 ta fact: 2 tasi verified official minimum, 5 tasi `review_needed`. Qolgan 352/252/352 keng qamrovli akademik qiymatlar hali dalilli deb belgilanmagan.
- Refresh ikki rejimga ajratilgan: `status_from_existing_dates` va `official_source_reverification`; failed check `last_verified_at` ni yangilamaydi.
- QS 2026/2027 seed aralashuvi tuzatildi; jonli rank `QS World University Rankings 2026 #1` bo‘lib qolmoqda.

## 6. Research Agent va Supabase

- Durable queue kodi `RESEARCH_DURABLE_STORE=1` opt-in mirror bilan tayyor; `Idempotency-Key`, 10 daqiqalik timeout, cancellation, checkpoint, per-university report/error, retry attempt yozuvi mavjud.
- Restart worker / resume consumer qo‘shildi: atomik SQL lease, heartbeat, muddati o‘tgan run’larni `timed_out` qilish, checkpoint + per-item attempts bo‘yicha qolgan ish slice’ini davom ettirish, retry budget tugaganda `skipped` gap. Admin `POST /api/admin/research-agent/resume` chaqiradi; production scheduling va migration apply alohida ruxsat talab qiladi.
- `npm run test:research-durable` 9/0, `npm run test:research-worker` 9/0, `npm run test:migration-dry-run` 11/0. Process-local `Map` hali ham “NOT restart-safe” deb aniq belgilangan; durable migration production’da qo‘llanmagan.
- Ikkita reviewable migration **NOT APPLIED**. Disposable PostgreSQL’da ikki marta qo‘llanib 10/0 natija olindi; bu production natijasi emas.
- Jonli Supabase audit: `docs/SUPABASE_LIVE_AUDIT_2026-11-06.md`. `password_reset_tokens` RLS o‘chirilgan + keng anon/authenticated grantlar tasdiqlangan xavfsizlik nuqsoni; `storage.objects` broad write grantlari ham migration’da revoke qilinadi.
- `auth.uid()` RLS siyosati ko‘chirilmadi: loyiha HMAC/custom session + numeric profile ID ishlatadi, backend ownership tekshiruvi shart.

## 7. Cheklovlar va qilmagan ishlar

Quyidagilar **bajarilmadi** va alohida ruxsat/ko‘rsatma talab qiladi:

1. Production DB’ga migration qo‘llash, RLS/grant o‘zgartirish, ma’lumot tuzatish yoki `RESEARCH_DURABLE_STORE=1` yoqish.
2. Deploy, production smoke test, real foydalanuvchi bilan login → ariza → hujjat → to‘lov → Telegram oqimi.
3. Real to‘lov, Telegram xabari, kanal posti yoki SMS/email yuborish.
4. 12 ta moderate `npm audit` advisory’ni `--force` bilan yopish; threshold’lar oshirilmadi, testlar yashirilmadi.
5. Opt-in browser benchmark endi production-mode `next start` bilan 2/2 o‘tdi; lekin u disposable fixture va 3 takroriy browser o‘lchovi, production real-user field metrikasi emas. Dev-mode E2E’dagi HMR/navigation timeout’lari sayt xatosi sifatida hisobot qilinmadi.
6. Generic hujjat shablonlari, duplicate MIT MBA, `$5,040` kanal matni va “All countries / full funding” da’volarini data owner tasdiqlashisiz “verified” deb belgilash.

Statik guard’lar, lokal unit/integration testlar va disposable DB natijalari alohida; ular production’dagi real foydalanuvchi natijasi o‘rnida ko‘rsatilmaydi.
