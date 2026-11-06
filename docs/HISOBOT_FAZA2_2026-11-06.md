# ScholarBridgeAI — yakuniy hisobot (Faza 2), 2026-11-06

> **Holat:** ish `arena/672d7668-scholarbridgeai` branchida bajarildi. Avvalgi Faza 1 hisoboti `docs/HISOBOT_2026-11-06.md` da saqlanadi. Ushbu hujjat Faza 2 davomida qilinmagan ishlarning davomi va yakuniy 7 bo‘limli hisobotdir.
>
> **Chegara:** production bazasiga hech qanday migration qo‘llanmadi, hech qanday jonli yozuv o‘zgartirilmadi, deploy qilinmadi, real to‘lov / Telegram xabari / kanal posti yuborilmadi, production’da real foydalanuvchi oqimi tekshirilmadi. Hech qanday secret, token, parol yoki connection string qiymati log yoki hisobotga kiritilmagan. Tajriba muhitlari disposable PostgreSQL, mock va lokal build bilan cheklangan.

---

## 1. Nimalar tuzatildi va foydalanuvchi uchun nima o‘zgardi

### P0 — ochilish, chunk xatosi, eski tab
- `/api/config/build` no-store build marker, HTML’dagi `sb-build-id` meta, `BuildVersionMonitor`, `IdleVersionWatcher` va `ChunkErrorBoundary` orqali eski tab yangi deploy’ni aniqlaydi; avtomatik reload yo‘q, foydalanuvchi saqlanmagan ishini yo‘qotmaydi.
- Dynamic import xatosi butun kabinetni yaroqsiz qilmaydi: bo‘lim darajasidagi error boundary, cheklangan retry, offline/timeout/xato holatlari ajratilgan. `clientFetch` 12 s timeout va abort/cancellation qo‘llaydi.
- Render build/start jarayoni, `prebuild: npm run typecheck`, `render.yaml`, `DEPLOYMENT.md` tekshirildi; Next 16 `ignoreBuildErrors` bo‘lsa ham TypeScript xatosi deploy’dan oldin bloklanadi.
- Eski tab, direct-link, back/forward, yangi sessiya va mavjud sessiya production-mode E2E’da tekshirildi.

### P1 — hisoblash va holatlar
- Universitet saralashi: UI tanlovi backend sort parametriga bog‘landi; profil mavjudligi tanlangan `qs|tuition|name|match` saralashini yashirincha almashtirmaydi; semantic rerank faqat `relevance` ichida; barqaror tie-breaker; qidiruv/filtr/pagination bilan birga ishlaydi.
- Byudjet: `evaluateBudgetFit()` endi `unknown | tuition_over | tuition_only | total_fits | total_over` holatlarini beradi; living yoki boshqa zarur xarajat noma’lum bo‘lsa `unknown`, 0 emas. Universitet kartasi, dashboard, taqqoslash va moliyaviy reja bir xil tri-state verdict’ga tayandi.
- Arizalar: faqat yaxshi shakllangan `{applications:[]}` response qabul qilinadi; xato javob `[]` ga aylantirilmaydi; loading/error/empty/success alohida; qo‘shish/yangilash/o‘chirish profil-scoped event bilan cache’ni invalidatsiya qiladi; profil almashganda eski ma’lumot ko‘rinmaydi.
- Hujjatlar: `readiness: null` talablar aniqlanmaganda; expired/rejected/needs_review tayyor emas; tasdiqlanmagan umumiy eslatmalar rasmiy majburiy talab emas.
- Profil o‘zgarishi: GPA/IELTS/SAT/yo‘nalish/daraja/davlat/byudjet o‘zgarganda tavsiyalar, dashboard sonlari va hosila ma’lumotlar qayta hisoblanadi; cache kaliti profil fingerprint/locale/date bilan bog‘langan; cross-instance cheklovi hujjatlashtirilgan.

### Ma’lumot ishonchliligi va yagona ehtimol siyosati
- `src/lib/evidencePolicy.ts` yagona manba: shaxsiy admission probability `available:false, reason:"no-validated-methodology"`. Fit balli, evidence coverage, eksperimental indeks va tarixiy acceptance rate bir-biridan ajratildi.
- EN/UZ/RU public-feature va chancing matnlari endi “qabul ehtimoli / admission chance / шанс поступления” va’da qilmaydi; inkor qilingan ogohlantirishlar saqlangan.
- `catalogue_facts` migration’ida typed evidence maydonlari: qiymat/birlik, valyuta/davr, daraja/dastur, admission cycle, rasmiy source URL, tekshirilgan sana, verification status, qiymat turi. 7 ta fact: 2 verified official minimum, 5 `review_needed`.
- QS 2026/2027 seed nomi/URL aralashuvi tuzatildi; jonli rank `QS World University Rankings 2026 #1` sifatida qoldi. “Har bir raqam verified” da’vosi ishlatilmadi.
- Yenching `id=894` va MIT `id=1` uchun rasmiy sahifalar asosida local seed, CSV/SQL va reviewable migration tuzatildi: `$5,040`, `min_ielts=NULL`, `3.91/1520/4.5`, generic hujjatlar, noto‘g‘ri eligibility kabi holatlar `review_needed`/`unknown` ga o‘tkazildi. **Jonli DB’da o‘zgartirilmadi.**

### Dashboard, navigatsiya, dizayn/UX
- 6 journey group, 14 destination, 33 pane, 5 utility screen, 38 legacy alias statik guard bilan tekshirildi. `src/proxy.ts` Next 16 proxy ekani, unda global login gate yo‘qligi, public Telegram landing sahifalari akkauntsiz qolgani tasdiqlandi.
- `Button variant="unstyled"` migratsiyasi, AdminOverview light-mode kontrasti, raw `<img>` → `next/image`, LazyMotion, light/dark va EN/UZ/RU tekshiruvlari saqlandi.
- `formatYear` qo‘shildi: `2026` → `2026`, `1861` → `1861`, `2,026/1,861` ko‘rinishi yo‘q. EN `All Countries ({count})` → `All countries ({count})`. UZ/RU `days left` / `All Countries` aralash matnlari statik test bilan taqiqlandi.
- Public features, FAQ/testimonials demo belgisi, keyboard/focus/contrast, mobil forma/modal/jadval/navigatsiya E2E va statik testlar bilan qayta tekshirildi.

### Research Agent, refresh, Supabase
- Process-local `Map` aniq “NOT restart-safe” deb belgilandi. `RESEARCH_DURABLE_STORE=1` opt-in PostgreSQL mirror qo‘shildi: status, checkpoint, per-university report/error, `Idempotency-Key`, 10 daqiqalik timeout, cancellation, terminal `cancelled|timed_out`, retry attempt yozuvi.
- **Yangi restart worker / resume consumer:** `lease_owner`/`lease_until` bilan atomik SQL claim, heartbeat, muddati o‘tgan run’larni `timed_out` qilish, checkpoint + per-item `attempts` asosida faqat qolgan universitetlarni davom ettirish, retry budget tugaganda aniq `skipped` gap. Admin `POST /api/admin/research-agent/resume` uni chaqiradi; production cron scheduling alohida operatsion qaror.
- `durableStore.ts` endi `@/db` ni lazy import qiladi: build/test muhitida `DATABASE_URL` bo‘lmasa ham modul import qilinmay xato bermaydi.
- Refresh ikki rejimga ajratildi: `status_from_existing_dates` va `official_source_reverification`. Faqat muvaffaqiyatli, dalilli official re-read `last_verified_at` ni yangilaydi; failed check yangilamaydi; HTTP orqali official adapter ochilmadi.
- Jonli Supabase read-only audit: 120 public table, 119 RLS yoqilgan, 1 RLS o‘chirilgan (`password_reset_tokens`), 14 policy, 0 public view / 0 materialized view, `storage.objects` broad anon/authenticated grantlari, `LOGO` public bucket, 8 migration, Auth site URL Vercel preview. `auth.uid()` siyosati ko‘chirilmadi; HMAC/custom session + numeric profile ID uchun backend ownership tekshiruvi shartligi saqlandi.
- `password_reset_tokens` RLS/grant teshigi va `storage.objects` keraksiz write grantlari uchun reviewable migration tayyorlandi, **qo‘llanmadi**.

### CI, tarjima, tezlik
- `check:i18n`, localization suite’dagi eski `memo.get(profileId)` source-regex testi amaldagi `getOrCreate` xatti-harakatiga mos meaningful testga aylantirildi; 4141 ta `t()` chaqiruvi tekshirildi.
- Yangi regression scriptlari CI’dagi P1 product-correctness step’ga qo‘shildi: `test:evidence-policy`, `test:refresh-modes`, `test:research-durable`, `test:research-worker`, `test:rendered-copy`, `test:internal-surfaces`, `test:migration-dry-run`.
- `npm audit fix --force` ishlatilmadi; threshold oshirilmadi; 12 moderate advisory ochiq qoldi.
- Landing birinchi yuklanish JS 1276 KiB, shared shell 975 KiB; `<1300 KiB` / `<1.2 MB` budjetlari o‘zgarishsiz. Opt-in browser benchmark production-mode `next start` bilan 2/2 o‘tdi.

---

## 2. O‘zgargan asosiy fayllar

| Guruh | Asosiy fayllar |
| --- | --- |
| P0 | `src/lib/buildId.ts`, `src/app/api/config/build/route.ts`, `src/lib/clientFetch.ts`, `src/lib/unsavedGuard.ts`, `src/components/ChunkErrorBoundary.tsx`, `BuildVersionMonitor.tsx`, `IdleVersionWatcher.tsx`, `src/app/layout.tsx`, `src/app/HomeClient.tsx`, `scripts/check-chunk-recovery.ts`, `next.config.ts`, `render.yaml`, `DEPLOYMENT.md` |
| P1 | `src/lib/universitySort.ts`, `budgetFit.ts`, `applicationsResponse.ts`, `applicationEvents.ts`, `documents.ts`, `dashboardRecommendationCache.ts`, `src/app/api/universities/route.ts`, applications/documents/profile consumerlari, `scripts/check-university-sort.ts`, `check-budget-fit.ts`, `check-applications-state.ts`, `check-documents-readiness.ts`, `check-profile-recompute.ts` |
| Evidence / data | `src/lib/evidencePolicy.ts`, `src/lib/chancing.ts`, `src/i18n/messages/{en,uz,ru}.json`, `src/app/features/page.tsx`, `src/db/seedVerifiedUniversityFacts.ts`, `src/db/seed.ts`, `scripts/check-seed-catalog.ts`, `data/*`, `supabase/international_scholarships_batch1_2026-10-23.sql`, `docs/OFFICIAL_SOURCE_RECHECK_2026-11-06.md`, `supabase/official_source_corrections_2026-11-06.sql`, `scripts/check-source-recheck.ts` |
| Refresh / durable queue | `src/lib/refreshModes.ts`, `src/lib/refresh.ts`, `src/app/api/admin/refresh/route.ts`, `src/lib/research-agent/{types,config,durableStore,registry,run-batch,resumePolicy,worker}.ts`, `src/app/api/admin/research-agent/{run,status,cancel,resume}/route.ts`, `scripts/check-refresh-modes.ts`, `check-research-durable.ts`, `check-research-worker.ts` |
| Supabase / migration | `supabase/security_evidence_research_2026-11-06.sql`, `scripts/check-migration-dry-run.ts`, `scripts/check-evidence-policy.ts`, `docs/SUPABASE_LIVE_AUDIT_2026-11-06.md` |
| UX / i18n / CI | `src/lib/format.ts`, `src/components/UniversityDetail.tsx`, `src/components/motion/*`, `src/components/landing/*`, `scripts/check-rendered-copy.ts`, `scripts/check-internal-surfaces.ts`, `scripts/check-perf.ts`, `scripts/check-localization-perf.ts`, `.github/workflows/ci.yml`, `ci/security-ci.yml`, `package.json`, `e2e/performance.spec.ts`, `docs/INTERNAL_SURFACES_AUDIT_2026-11-06.md` |
| Hisobotlar | `docs/HISOBOT_2026-11-06.md` (Faza 1), `docs/HISOBOT_FAZA2_2026-11-06.md` (ushbu yakuniy hisobot) |

---

## 3. Bajarilgan testlar va haqiqiy natijalar

### Build / statik gate’lar
- `npm run typecheck` — 0 xato.
- `npm run build` — exit 0, 76 ta static page, yangi `/api/admin/research-agent/resume` ham compile bo‘ldi.
- `npm run lint:baseline` — 0 finding.
- `npm run audit:ui` — 10 runtime geometry style object, inline paint/TSX hex literal yo‘q.
- `npm run check:i18n` — 6984 EN key, 131 translated fayl, 4141 `t()` call site.
- `npm run audit:check` — 0 critical, 0 high, **12 moderate**, 0 low; `--force` ishlatilmadi.
- `npm run test:perf` — 16/0; landing **1276 KB**, shared shell **975 KB**.

### Regression guard’lar
| Test | Natija |
| --- | ---: |
| `test:chunk-recovery` | 13/0 |
| `test:deploy` | 6/0 |
| `test:university-sort` | 15/0 |
| `test:budget-fit` | 12/0 |
| `test:applications-state` | 9/0 |
| `test:documents` | 51/0 |
| `test:documents-readiness` | 10/0 |
| `test:profile-recompute` | 6/0 |
| `test:landing-copy` | 13/0 |
| `test:source-recheck` | 9/0 |
| `test:evidence-policy` | 9/0 |
| `test:refresh-modes` | 6/0 |
| `test:research-durable` | 9/0 |
| `test:research-worker` | 9/0 |
| `test:rendered-copy` | 6/0 |
| `test:internal-surfaces` | 8/0 |
| `test:migration-dry-run` | **11/0**, disposable PostgreSQL, ikki marta migration + atomik lease race |
| `check:catalog-gaps` | 8/0 |
| `test:localization` | 16/0 |
| `test:differentiators` | 732/0 |
| `test:dark` | 0 inverted-ramp/state leak, 0 unreadable pair |
| `test:ux` | 44/0 |
| `test:responsive` | 70 source-level check |
| `test:site-completeness` | `reviewCandidates: []` |
| `test:costs` | 71/0 |

### Backend / integration / xavfsizlik
- `test:backend-audit` — 18/18 PASS.
- `test:backend-second-pass` — 20 check.
- `test:backend-resilience` — 30 check, barcha network fault injection loopback/mock.
- `test:api-security:isolated` — 282 handler / 159 route file + 49 disposable-fixture probe.
- `test:api-security` — 282 handler / 159 route file.
- `test:integration` — **499/0**, disposable PostgreSQL.
- `test:security` — 107 assertion.
- `test:auth` — 14 assertion.
- `test:password-reset` — 38/0.
- `test:admin-accounts` — 30/0.
- `test:schema` — offline PASS.
- `test:provenance` — disposable DB bilan PASS.
- `test:recommend` — 91/0.
- `test:chancing` — 28/0.
- `test:university-rank-year` — 14/0.
- `test:source-followup`, `test:official-source-review`, `test:document-coverage` — PASS.
- `test:stack-integration` — 21/0.
- `test:channel-e2e` — 21/0, mock kanal; hech qanday real Telegram/kanal xabari yuborilmadi.

### Brauzer / E2E
- `E2E_NEXT_MODE=start npm run test:e2e` — **21 passed, 2 skipped**, 6.8 daqiqa, disposable PostgreSQL + production `next start`. EN/UZ/RU, desktop/mobile, public route, admin section, rapid destination change, back/forward va hisob oqimlari qamrab olindi.
- `npm run test:browser-perf` — **2 passed**, 5.4 daqiqa, production-mode, 3 takror, desktop + 4× CPU/mobile throttling.
- `test:e2e` ning dev-mode yugurishida HMR/navigation uzilishlari tufayli 13 ta browser-automation timeout kuzatildi; production-mode yugurish barcha 21 testni o‘tkazdi. Bu vaqtinchalik dev-server avtomatizatsiyasi holati sifatida, sayt xatosi sifatida hisobot qilinmadi.

---

## 4. Oldin / keyin dalillari

| Holat | Oldin | Keyin |
| --- | --- | --- |
| Chunk xatosi | Jonli `/` va eski chunk URL `fetch_page` bilan tekshirildi: original chunk topilmadi, cache-busted chunk HTML title qaytardi, `/api/health` `{"ok":true,"commit":"d185e61"}`. Sabab dalilsiz “cache muammosi” deb belgilanmadi. | Build marker, no-store endpoint, idle monitor, 2-retry boundary, unsaved guard, eski tab banneri; production-mode E2E 21/2. |
| Landing JS | Faza 1 boshida ~2.2 MB; HEAD qayta build 1308 KiB. | LazyMotion’dan keyin **1 306 137 byte / 1276 KiB**, threshold oshirilmadi; `test:perf` 16/0. |
| QS sort | #247 universitet #1 MIT’dan oldin, profil mavjud bo‘lsa yashirin match sort. | `qs|tuition|name|match` aniq; profil tanlovni buzmaydi; 15/0 sort testi. |
| Byudjet | $3,000 tuition + $15,000 living, $3,000 byudjet “sig‘adi”. | `tuition_only` / `total_over` / `unknown`; 12/0 budget testi, 71/0 costs testi. |
| Arizalar | Dashboard 3 ta, materials “hali ariza boshlamadingiz”. | Xato `[]` emas; loading/error/empty/success ajratilgan; 9/0 state testi. |
| Hujjatlar | `required=0` → 100% ready. | `readiness:null` talablar aniqlanmaganda; expired/rejected/needs_review tayyor emas; 51/0 + 10/0. |
| Ehtimol | “qabul ehtimolini e’lon qilmaymiz” bilan birga “Kirish imkoniyati: 73%”. | Yagona `ADMISSION_PROBABILITY={available:false,reason:"no-validated-methodology"}`; EN/UZ/RU copy, 9/0 evidence testi. |
| QS edition | Seed nomi/URL 2027, jonli rank 2026. | Seed `VERIFIED_QS_2026`, `/world-university-rankings/2026`, `qsRankYear:2026`; `test:source-recheck` 9/0. |
| Yenching / MIT | Jonli `id=894`: `$5,040`, `min_ielts=NULL`, generic docs; `id=1`: `3.91/1520/4.5`, PDF source. | Local seed/SQL/docs tuzatildi; reviewable migration **NOT APPLIED**; jonli qatorlar o‘zgarishsiz. |
| Supabase RLS | 120 table, 119 RLS, `password_reset_tokens` RLS off + anon/authenticated full DML; 14 policy; public view 0/0. | Xuddi shu holat read-only tasdiqlandi; RLS/grant + `catalogue_facts` + durable queue uchun migration tayyor, **qo‘llanmadi**. |
| Research Agent | Process-local Map + detached task; restart’dan keyin status yo‘qoladi. | Opt-in durable mirror + atomik lease restart worker + resume/retry/idempotency; 9/0 durable, 9/0 worker, 11/0 dry-run. Production’da hali yoqilmagan. |
| Refresh | Mavjud sanalardan status hisoblash official re-read bilan aralashgan. | Ikki aniq rejim; failed check `verifiedAt` ni yangilamaydi; 6/0. |
| Tarjima | `2,026`, `1,861`, `All Countries`, aralash `days left`. | `formatYear`, `All countries`, UZ/RU matn guardlari; 6/0 rendered-copy, 4141 `t()` tekshiruvi. |
| Browser perf | `test:browser-perf` OS dark preference sababli “Switch to dark mode” selectorida 2/2 fail. | Test haqiqiy toggle’ni tekshiradigan robust selector’ga tuzatildi; 2/2 pass, talab pasaytirilmadi. |

---

## 5. Qayta tasdiqlanmagan yoki bloklangan holatlar

1. **Production DB apply/write:** ikkala migration ham `NOT APPLIED`; jonli Yenching `id=894` va MIT `id=1` qatorlari, `password_reset_tokens` RLS va `storage.objects` grantlari o‘zgarishsiz.
2. **Deploy / production smoke:** bajarilmadi. `docs/HISOBOT_2026-11-06.md` dagi Faza 1 build/preview natijalari ham production deploy emas.
3. **Real foydalanuvchi oqimi:** login → profil → ariza → hujjat → to‘lov → Telegram/kanal production’da tekshirilmadi. Disposable DB, mock kanal va lokal E2E production verification emas.
4. **Real to‘lov / Telegram / kanal:** hech qanday real pul operatsiyasi, odamga xabar yoki kanal posti yuborilmadi; `test:channel-e2e` va `test:stack-integration` mock bilan 21/0.
5. **Credential-blocked:** jonli Supabase Auth `site_url`/`uri_allow_list`, legacy API key/secret rotatsiyasi, production `RESEARCH_DURABLE_STORE=1` va cron scheduling qo‘lda, alohida ruxsat bilan bajarilishi kerak. Hech qanday kalit qiymati olinmadi/saqlanmadi.
6. **12 moderate npm advisory:** qayta tekshirildi, 0 critical/high; `npm audit fix --force` bilan nazoratsiz major/downgrade qilinmadi.
7. **2 skipped E2E:** asosiy `test:e2e` ichidagi opt-in performance testlari skip qolgan; ular alohida `test:browser-perf` sifatida production-mode 2/2 o‘tdi. Bu field INP yoki real-user metrikasi emas.
8. **Dalil qamrovi:** 2939 source, 2845 `is_official`, 2901 `is_verified`, 356 universitet `verified`, lekin 352 `min_gpa`, 252 `min_sat`, 352 `acceptance_rate` hali alohida typed evidence bilan tasdiqlanmagan. “Barcha ma’lumot verified” degan xulosa yo‘q.
9. **Review-needed:** generic hujjat shablonlari, duplicate MIT MBA, `$5,040` kanal matni, “All countries / full funding / full tuition” da’volari, testimonial tasdiqlari, `src/lib/costs.ts` va moliyaviy reja birlashtiruvi, dashboard progress ta’riflari, admin eskirgan ma’lumot navbati — data owner/qo‘lda ko‘rib chiqish talab qiladi.
10. **Dev-mode E2E flakiness:** HMR/navigation timeout’lari sayt xatosi emas; production-mode `next start` bilan 21/2 natija olindi. CI’dagi database-auth xatosi production sayt holati bilan aralashtirilmadi.

---

## 6. Tayyorlangan migration va qo‘lda bajarilishi kerak bo‘lgan sozlamalar

### Reviewable migration’lar — **NOT APPLIED**
1. `supabase/official_source_corrections_2026-11-06.sql`
   - Yenching `id=894` va MIT `id=1` uchun guarded fixes;
   - `amount_usd_value DROP NOT NULL`, `min_ielts DROP DEFAULT`, `eligible_majors`/`degree_levels SET DEFAULT '[]'`;
   - ikkita rasmiy MIT source linki;
   - hech qanday delete/truncate/drop, student row yoki rank update yo‘q.
2. `supabase/security_evidence_research_2026-11-06.sql`
   - `password_reset_tokens` RLS yoqish, `PUBLIC/anon/authenticated` grantlarini revoke, `postgres/service_role` grantlarini saqlash;
   - `storage.objects` dan anon/authenticated `INSERT/UPDATE/DELETE` grantlarini revoke, SELECT saqlash;
   - `catalogue_facts` + 7 ta evidence fact;
   - `research_runs` / `research_run_items` — `text` ID, `lease_owner`/`lease_until`, atomic claim index;
   - `refresh_jobs` ga `mode`, `source_pages_read`, `verified_dates_updated`, `failed_verification`;
   - `auth.uid()` policy yo‘q, secret qiymat yo‘q.

Har ikkisi disposable PostgreSQL’da ikki marta qo‘llanib, `npm run test:migration-dry-run` **11/0** oldi. Bu production natijasi emas.

### Qo‘lda / alohida ruxsat bilan
1. Migration’larni avval staging yoki disposable DB’da `BEGIN … ROLLBACK` bilan ko‘rib chiqish; data owner ikki katalog qatorini tasdiqlash; keyin production’ga alohida ko‘rsatma bilan qo‘llash.
2. Supabase Auth `site_url` va `uri_allow_list` ga `https://scholarbridgeai-9bmd.onrender.com/` qo‘shish; hozir Vercel preview domeni qolgan.
3. Legacy `anon`/`service_role` JWT kalitlari va default secretlarni rotatsiya qilish, ishlatilmayotganlarini o‘chirish; qiymatlarni faqat server env’da saqlash.
4. `catalogue_facts` dagi 5 ta `review_needed` fact va 352/252/352 keng qamrovli akademik sonlarni alohida rasmiy tekshirish.
5. Migration qo‘llangandan keyingina `RESEARCH_DURABLE_STORE=1` ni yoqish; `POST /api/admin/research-agent/resume` uchun cron/manual restart triggerini sozlash.
6. Production deploy, real user smoke, real to‘lov/Telegram/kanal testlari — faqat alohida ko‘rsatma bo‘lganda.

---

## 7. Qolgan xavflar va keyingi ustuvor ishlar

1. **Eng yuqori ustuvor:** production migration + RLS/grant tuzatishlarini apply qilish, Auth allow-list’ni to‘g‘rilash, keyin production’da real foydalanuvchi oqimini tekshirish. Hozir bu ishlar bloklangan.
2. Jonli katalogdagi Yenching/MIT nuqsonlari va 352/252/352 tasdiqlanmagan akademik sonlar saqlanmoqda; local tuzatishlar production’ga yetmagan.
3. Research Agent durable queue kodi tayyor, lekin migration qo‘llanmagani va env flag yoqilmagani uchun production restart worker ishlamaydi; scheduling ham sozlanmagan.
4. Refresh’ning rasmiy sahifa adapteri production’da hali ulanmagan; mavjud `status_from_existing_dates` rejimi xavfsiz default bo‘lib qolgan.
5. 12 moderate dependency advisory ochiq; ularni major/downgrade xavfisiz, alohida review bilan yopish kerak.
6. Dashboard’dagi 75% / 77.1% / 85% progress ta’riflari, 8 bosqichli journey va 10 bosqichli study plan munosabati, “Qabul qilingan” kabi bosqich nomlari product/design review talab qiladi.
7. Generic hujjat shablonlari, duplicate MIT MBA, `$5,040` kanal matni, “All countries / full funding” da’volari va testimonial’lar demo/verified ajratilishi bo‘yicha data owner tasdig‘i kerak.
8. `src/lib/costs.ts` va moliyaviy reja o‘rtasidagi birinchi yil / butun dastur xarajati, grant/qarz/waiver/stipendiya ajratish to‘liq unifikatsiya qilinmagan; mavjud `test:costs` 71/0 himoyasi bor.
9. CI’dagi database-auth xatolari production sayt holati bilan aralashtirilmasin; browser automation timeout’lari sayt xatosi deb hisoblanmasin.
10. Hech qanday “hammasi tayyor”, “100% xavfsiz” yoki “barcha ma’lumot verified” xulosasi berilmaydi: kod o‘qish, lokal/disposable testlar va production real-user verification uch xil dalil darajasidir.

---

**Xulosa:** ruxsat etilgan lokal kod, test, migration, CI va hujjat ishlari davom ettirildi va yakunlandi; production’ga tegishli apply/deploy/write/real-user tekshiruvlari ataylab alohida ko‘rsatmagacha bajarilmadi.
