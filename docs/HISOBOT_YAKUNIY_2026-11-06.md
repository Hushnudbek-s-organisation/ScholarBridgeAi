# ScholarBridgeAI — yakuniy hisobot (2026-11-06, joriy dirty tree)

> **MUHIM:** §1–§14 quyida **tarixiy** Faza 1/2 yakuni (166 path, 21/2 E2E, 12/0 research-runtime). Joriy kod bo‘yicha barcha yangi natijalar **§15** da. Bir-biriga zid bo‘lsa §15 ustun. Hech bir tarixiy natija «joriy revision» deb taqdim etilmaydi.

**Branch:** `arena/672d7668-scholarbridgeai` · **HEAD:** `d185e61` · **Tekshirilgan narsa:** commit qilinmagan ishchi dirty tree (99 modified + 67 untracked = 166 path), `npm ci` bilan tiklangan `node_modules`, disposable `embedded-postgres` klasterlari va `next start` ustida ishga tushirilgan disposable E2E muhiti.
**Asos:** `docs/HISOBOT_2026-11-06.md` (Faza 1 — tugallangan), `docs/HISOBOT_FAZA2_2026-11-06.md` (tarixiy, yakuniy qabul emas), `docs/OFFICIAL_SOURCE_RECHECK_2026-11-06.md`, `docs/SUPABASE_LIVE_AUDIT_2026-11-06.md`, `docs/INTERNAL_SURFACES_AUDIT_2026-11-06.md`, `DEPLOYMENT.md`, lokal diff va migration’lar. Faza 2 Faza 1 masalasini yopgan bo‘lsa, yakuniy holat asos qilindi; ishlayotgan tuzatishlar qayta yozilmadi. Branch nomi hisobotdagidan farq qilishi ishni qayta boshlash uchun sabab bo‘lmadi.
**Chegaralar:** push, commit, PR, production deploy, production migration/apply, real pul operatsiyasi, haqiqiy Telegram xabari, production yozuvi **qilinmadi**. `reset --hard`, `clean`, lossy checkout, eski versiya bilan almashtirish ishlatilmadi.

> **Toifalar (har band shu so‘z bilan):** `1. Lokal implementatsiya qilindi va tekshirildi.` / `2. Implementatsiya bor, ammo ma’lum tekshiruv yetishmaydi.` / `3. Production’da qo‘llash yoki sozlash kutilmoqda.` / `4. Tashqi credential yoki aniq foydalanuvchi qarori zarur.`

---

## Yakuniy test konteksti

| Komanda | Muhit | Natija |
|---|---|---|
| `npm run typecheck` | lokal, `tsc --noEmit` | exit 0 |
| `npm run lint:baseline` | lokal, ESLint to‘liq fayl to‘plami | 0 issues / gate PASSED |
| `node scripts/check-i18n.mjs` | lokal, EN/UZ/RU | i18n check passed |
| `npm run build` (clean `.next`) | dummy `DATABASE_URL`/`APP_BASE_URL`, `prebuild` typecheck bilan | exit 0, 77 sahifa |
| 22 ta `test:*` guard | lokal + disposable PG | barchasi exit 0 (quyida raqamlar) |
| `npm run test:migration-dry-run` | disposable `embedded-postgres` 55442, ikki marta apply | 14 passed / 0 failed |
| `npm run test:research-runtime` | disposable `embedded-postgres` 55443, real `durableStore` | 12 passed / 0 failed |
| `npm run test:integration` | lokal | 499 passed / 0 failed |
| `npm run test:api-security:isolated` | disposable PG 41855 + `next start` 36043 | 286 handler + 49 fixture probe, exit 0 |
| `npm run test:e2e` | disposable PG 37821 + `next start` 35555, Playwright | **21 passed / 2 skipped** (10.9m) |
| `npm run test:browser-perf` | disposable PG 43889 + `next start` 38873 | **2 passed / 0 failed** (5.1m) |
| `npm audit --omit=dev --audit-level=moderate` | lokal | `found 0 vulnerabilities` |
| `npm audit --json` | lokal | 0 info/low/high/critical, **4 moderate** (12 dan kamaydi) |

Guard raqamlari: costs 71/0, budget-fit 12/0, finance-unified 16/0, cache-revision 20/0, official-source-adapter 38/0, **typed-evidence 17/0**, review-queue 15/0, admission-probability 12/0, build-gates 13/0, **observability 8/0**, deploy 6/0, refresh-modes 6/0, evidence-policy 9/0, **source-recheck 12/0**, migration-dry-run 14/0, dashboard-cache 13/0, **channel 196/0**, chancing 28/0, profile-recompute 6/0, chunk-recovery 13/0, research-durable 9/0, research-worker 9/0, **research-runtime 12/0**, security 107/0, ownership 83/0, compare 44/0, payments 114/0, documents 51/0, differentiators 732/0, perf 16/0, localization 16/0, audit-safety 27/0, backend-audit PASS. Kod o‘zgarganidan keyin barcha tegishli tekshiruvlar qayta yugurtirildi.

---

## 1. Ishni saqlash va yakuniy holat

**1. Lokal implementatsiya qilindi va tekshirildi.**
- **Muammo:** oldingi hisobotlarda qolgan/qisman/deklaratsiya bilan yopilgan ishlar; faqat audit yozib to‘xtash xavfi; branch/dirty tree’ni yo‘qotish xavfi.
- **Tuzatish:** mavjud ish joyi asos qilindi; 166 path saqlandi; 22 ta qatorli jadval yakuniy holatga o‘tkazildi; har qator uchun dalil → yetishmayotgan qism → tuzatish → test natijasi → 1–4 toifa yozildi.
- **Fayllar:** `docs/QOLGAN_ISHLAR_JADVALI_2026-11-06.md`, ushbu hisobot, `docs/RELEASE_READINESS_2026-11-06.md`.
- **Tekshiruv:** `git status --porcelain` (99 M / 67 ??), `git rev-parse --short HEAD = d185e61`, barcha yuqoridagi testlar.
- **Qolgan cheklov:** production’dagi holat ushbu lokal diff bilan solishtirilmadi (ruxsat yo‘q); GitHub/live-site eski ko‘rinishi lokal ish yo‘qligini anglatmaydi.

## 2. Xavfsizlik migration’i

**1. Lokal implementatsiya qilindi va tekshirildi.** + **3. Production’da qo‘llash yoki sozlash kutilmoqda.**
- **Muammo:** `password_reset_tokens` RLS o‘chirilgan, anon/authenticated to‘liq DML/TRUNCATE; `storage.objects` uchun blanket revoke avtomatik to‘g‘ri deb qabul qilingan; custom HMAC sessiya + numeric profile ID bilan `auth.uid()` policy ishlamas edi.
- **Tuzatish:** backend→service_role upload yo‘li aniqlandi (browser to‘g‘ridan yuklamaydi); `REVOKE ALL` + `GRANT SELECT` + faqat `LOGO` bucket SELECT RLS policy + write-policy cleanup; private hujjatlar uchun server-side numeric-profile ownership; `auth.uid()` qo‘shilmadi; `catalogue_facts`/`research_runs`/`research_run_items` uchun RLS/grant/FK/index/ID turlari; parol reset 60 min/one-time/replay/generic javob saqlandi. Hech qanday real token/parol/secret o‘qilmadi.
- **Fayllar:** `supabase/security_evidence_research_2026-11-06.sql`, `scripts/check-migration-dry-run.ts`, `src/lib/passwordReset.ts`, `scripts/check-security.ts`, `scripts/check-observability.ts`.
- **Tekshiruv:** disposable DB 14/0 — anon SELECT faqat LOGO, yozuv rad, private doc ko‘rinmaydi, privileged backend qonuniy reset ishlaydi; `test:password-reset` 38/0, `test:security` 107/0, `test:ownership` 83/0; `test:api-security:isolated` 49 fixture probe (allowed+denied birga).
- **Qolgan cheklov:** migration production’ga **qo‘llanmadi**; Supabase jonli holati o‘zgarmagan. 401/403/503 yakka o‘zi isbot emas — ikkala tomon sinandi.

## 3. Migration’larning haqiqiy ta’siri

**1. Lokal implementatsiya qilindi va tekshirildi.** + **3. Production’da qo‘llash yoki sozlash kutilmoqda.**
- **Muammo:** “faqat ikki qator” degan xulosa; `DROP NOT NULL` ni `DROP TABLE/COLUMN` bilan adashtirish xavfi; `id=1/894` boshqa muhitda boshqa yozuv; `[]` ni “hammasi mumkin” deb o‘qish.
- **Tuzatish:** 3 ta jadval darajasidagi o‘zgarish (yangi qator/admin forma/import/eski kod) semantik izohlandi; `DROP NOT NULL` faqat constraint’ni olib tashlashi, `DROP DEFAULT` 6.5 ni olib tashlashi yozildi; `[]` = unknown, `["*"]` = source-backed cheklov yo‘q, `["__not_applicable__"]` = mos emas, legacy `["All"]` = review-needed ajratildi (`eligibilityScope.ts`); dinamik nom/provider/rasmiy domen/source-link guardlari, 0 yoki >1 match’da safe abort; qiymat rollback SQLi.
- **Fayllar:** `supabase/official_source_corrections_2026-11-06.sql` + `_rollback.sql`, `src/lib/eligibilityScope.ts`, admin/import/recommend/channel, `scripts/check-{migration-dry-run,source-recheck}.ts`.
- **Tekshiruv:** real disposable PG + `drizzle-kit push` + mavjud Yenching/MIT ma’lumotlari + **ikkita apply (idempotent)** + eski/yangi kod mosligi + rollback → 14/0; `test:source-recheck` 12/0; `test:channel` 196/0.
- **Qolgan cheklov:** production apply qilinmadi; qiymat rollback production’da sinanmadi.

## 4. Typed evidence butun mahsulotga

**1. Lokal implementatsiya qilindi va tekshirildi.** + **2. Implementatsiya bor, ammo ma’lum tekshiruv yetishmaydi.**
- **Muammo:** `catalogue_facts` + 7 fact bor edi, lekin uni hech bir ekran iste’mol qilmasdi; Telegram tasdiqlanmagan `GPA 3.5+`/`IELTS 6.5+` ni asserted minimum qilib chiqarardi; detail API unverified raqamlarni butunlay yashirardi.
- **Tuzatish:** bitta markaziy taqdimot qatlami (`presentFact`/`presentFactLine`/`legacyEvidence`) yaratildi — qiymat, birlik, davr, valyuta, dastur/daraja, admission cycle, source URL, verified sana, status, value type, trust; katalog API, `[id]` detail API, grant API, dashboard va Telegram shu envelope’ni iste’mol qiladi; detail API asl raqamlarni `evidence` da `legacy_unknown` sifatida saqlaydi (yashirmaydi, lekin filter/auto-reject null qoladi); `university.verified=true` field’ni verified qilmaydi; 4 xil value type bir-biriga aylantirilmaydi; `mayFeedAdmissionProbability()` har doim false.
- **Fayllar:** `src/lib/factPresentation.ts`, `typedEvidence.ts`, `src/app/api/{universities,universities/[id],scholarships,dashboard}/route.ts`, `src/lib/channel/templates/{facts,format,card.uz}.ts`, `scripts/check-typed-evidence.ts`, `scripts/check-channel.ts`.
- **Tekshiruv:** `test:typed-evidence` **17/0** (shu jumladan barcha consumer wiring + “faqat verified official = minimum”), `test:channel` 196/0 (eski `+` minimumlar chiqmasligi assert qilindi), `test:admission-probability` 12/0, typecheck 0.
- **Qolgan cheklov:** compare / moliyaviy reja / admin edit-verify ekranlarida `evidence` envelope API’dan keladi, lekin **to‘liq UI renderi** hali qo‘shilmagan; `catalogue_facts` production’da bo‘sh (migration qo‘llanmagan), shuning uchun `legacyEvidence` fallback ishlaydi. 352/252/352 eski sonlar joriy aniq son deb takrorlanmadi.

## 5. MIT / Yenching / katalog

**2. Implementatsiya bor, ammo ma’lum tekshiruv yetishmaydi.** + **4. Tashqi credential yoki aniq foydalanuvchi qarori zarur.** (qisman **1**)
- **Muammo:** duplicate MBA faqat `185` ID bilan aniqlangan; `$5,040` kelib chiqishi noma’lum; PhD AI/SAT 1500/Fully funded/deadline/waiver/cycle ochiq; “medical insurance”/“two-year” bir sahifada yo‘qligi uchun xato deb belgilanishi xavfi; “data owner kerak” deb to‘xtash.
- **Tuzatish:** `docs/OFFICIAL_SOURCE_OPEN_ITEMS_2026-11-06.md` — har ochiq masala `unknown/review_needed` + sabab + keyingi qadam; `$5,040` uchun **read-only** query; dublikat MBA uchun nom/provider/`mit.edu` domeni/source bo‘yicha query + applications/saved/source bog‘lanishlarini sanash + lossy DELETE o‘rniga canonical + redirect + rollback rejasi; bakalavr/graduate aralashuvi, GPA/SAT o‘rtachaga almashtirilmasligi, waiver/fellowship sahifalari, dastur davomiyligi ≠ moliyalashtirish davomiyligi yozildi; katalog qoidalari (bo‘sh eligibility, tuition waiver, 5 aid turi, generic docs, QS 2026 yili, demo testimonial) kodda isbotlandi.
- **Fayllar:** `docs/OFFICIAL_SOURCE_OPEN_ITEMS_2026-11-06.md`, `scripts/check-source-recheck.ts`, `src/lib/{eligibilityScope,financeModel,reviewQueue}.ts`, seed/migration, `src/i18n/messages/*.json`.
- **Tekshiruv:** `test:source-recheck` 12/0 (query’lar, ID-185 ga tayanmaslik, “data owner” to‘xtashi yo‘qligi, noto‘g‘ri deb belgilanmaganligi), `test:channel` 196/0, `test:review-queue` 15/0, `test:finance-unified` 16/0.
- **Qolgan cheklov:** sandbox’dan `mit.edu`/`yenchingacademy.pku.edu.cn` ochilmadi (faqat github/npm/pypi ruxsat) → sahifalarning **hozirgi mazmuni** tasdiqlanmagan, aniq URL + qidiruv sharti tayyor; read-only query’lar production bazada bajarilmadi; hech qanday qator o‘chirilmadi/birlashtirilmadi/verified qilinmadi.

## 6. Admission probability end-to-end

**1. Lokal implementatsiya qilindi va tekshirildi.**
- **Muammo:** faqat `ADMISSION_PROBABILITY.available=false` + tarjima bilan cheklanish; fit/evidence/rate/completeness bitta % ga aralashishi; API orqali clientga kelishi.
- **Tuzatish:** 12 ta string-by-string guard — shared unavailable policy, typed-fact non-use, 7 API route, ChancingPanel/PlanningStudio/RecommendationStudio/dashboard/boshqa UI, admin eksport, Telegram/kanal shablonlari, EN/UZ/RU, privacy copy; 4 metrika alohida nom/tushuntirish/formula; halol inkor gaplar (masalan `studyInterest.helper` “do not indicate … your chance”) ruxsat etiladi, asserted da’volar taqiqlanadi; `mayFeedAdmissionProbability()` false.
- **Fayllar:** `scripts/check-admission-probability.ts`, `src/lib/{evidencePolicy,typedEvidence,chancing}.ts`, UI/eksport/kanal, `src/i18n/messages/*.json`.
- **Tekshiruv:** `test:admission-probability` 12/0, `test:chancing` 28/0, `test:rendered-copy` 6/0, `test:typed-evidence` 17/0.
- **Qolgan cheklov:** validated/calibrated metodologiya yo‘q — shaxsiy probability % chiqarilmaydi (bu siyosat, kamchilik emas).

## 7. Moliyaviy hisoblarni birlashtirish

**1. Lokal implementatsiya qilindi va tekshirildi.**
- **Muammo:** hisobotda “yagona hisob” deyilgan, lekin `costs.ts` va moliyaviy reja birlashtirilmagan degan zid gap; unknown = 0, davr/valyuta/aid turlari aralashuvi.
- **Tuzatish:** `financeModel.ts` yagona model bo‘lib `costs.ts` + `budgetFit.ts` tomonidan consume qilinadi; yil/semestr/oy/butun dastur, birinchi/keyingi yil, tuition/living, bir martalik/takroriy, grant/qaytariladigan qarz, tuition waiver/naqd stipendiya, oldindan yordam/reimbursement, original valyuta/konvertatsiya ajratildi; unknown ≠ 0; davr noma’lum bo‘lsa aniq umumiy summa yo‘q; double-count yo‘q; `tuition_only/total_fits/total_over/unknown` hamma joyda bir xil.
- **Fayllar:** `src/lib/{financeModel,costs,budgetFit}.ts`, `scripts/check-{finance-unified,costs,budget-fit}.ts`.
- **Tekshiruv:** 16/0 (tuition 3000 + living 15000 + budget 3000, unknown living, qisman waiver, qarz, oylik stipendiya, ko‘p yillik dastur), 71/0, 12/0, `test:compare` 44/0.
- **Qolgan cheklov:** production katalogidagi eski aralash `award_currency='CNY'`/`award_period='month'` qatorlari migratsiya qo‘llanmaguncha jonli bazada qoladi (lokal model ularni to‘g‘ri talqin qiladi).

## 8. Dashboard / ichki UX

**1. Lokal implementatsiya qilindi va tekshirildi.** + **2. Implementatsiya bor, ammo ma’lum tekshiruv yetishmaydi.**
- **Muammo:** statik nav guard + tarjima kalitlari UX tugaganini anglatmasdi; 75/77.1/85% progress nimani o‘lchashi noaniq; 8 bosqich journey vs 10 qadam study plan; “Qabul qilingan” noto‘g‘ri done.
- **Tuzatish:** 4 ta % ning har biri alohida denominator bilan hisoblanadi (journey 8 bosqich, `ApplicationWorkspacePanel` 10 tab, `RequirementsBrowser` sections, `ArrivalPlanPanel` windows) — bir xil nom ostida turli % yo‘q; `gpaCutoffTrusted:false` + `ccGpaUnverified` (EN/UZ/RU) tasdiqlanmagan cutoff’ning rad etmasligini ko‘rsatadi; mavjud uzun tavsif preview/“Batafsil”, 4 ta dastur/“Barchasini ko‘rish” **qayta yozilmadi**; “Qabul qilingan” faqat admitted holatida; eng muhim keyingi amal, streak ikkilamchi, loading/error/empty/success mavjud.
- **Fayllar:** `src/components/journey/*`, `src/components/UniversityDetail.tsx`, `src/app/HomeClient.tsx`, `src/i18n/messages/*.json`, `scripts/check-{internal-surfaces,ux,responsive,dark,rendered-copy}.ts`.
- **Tekshiruv:** **E2E 21 passed / 2 skipped** (390px telefon, 1440px desktop, EN/UZ/RU, til/theme, barcha admin bo‘limlari, document vault ownership, rapid destination change), `test:browser-perf` 2/0, `test:internal-surfaces` 8/0, `test:ux`/`responsive`/`dark`/`site-completeness` 0. Public `/tg` landing akkauntsiz E2E’da ishladi.
- **Qolgan cheklov:** progress % lari uchun alohida yozma formula/denominator hujjati yo‘q (kodda aniq, hujjatda emas); 2 ta skipped E2E perf testi alohida 2/2 o‘tdi — bu **yangi bug emas**; dev-mode timeout production bug yoki zararsiz deb mutlaq baholanmadi (production-start ishlatildi). Browser benchmark real-user INP emas.

## 9. Research Agent operatsion

**1. Lokal implementatsiya qilindi va tekshirildi.** + **3. Production’da qo‘llash yoki sozlash kutilmoqda.**
- **Muammo:** worker faqat statik/pure guard bilan isbotlangan; lease’i o‘tgan eski worker kechikkan natijani yozishi mumkin edi; production scheduler yo‘q (in-process timer restart-safe emas); flag+missing migration aniq xato bermasdi.
- **Tuzatish:** `appendDurableItem` ga **atomik `live_lease` CTE** guard (INSERT va ON CONFLICT UPDATE ikkalasi ham live lease sharti bilan — check-then-write race yo‘q); `workerId` `registry`→`appendDurableItem` ga uzatildi; `probeDurableMigration()` (flag+missing → 503 + `runsStarted:0`, hech narsa yozilmaydi); **bitta** production yo‘l: Render Cron Job → `GET /api/cron/research-agent` (5 min, `CRON_SECRET` constant-time Bearer, `limit:1`, `requestId` monitoring, admin status aynan DB’dan). `/api/admin/research-agent/resume` `requireAdmin` bilan saqlandi.
- **Fayllar:** `src/lib/research-agent/{durableStore,worker,registry}.ts`, `src/app/api/cron/research-agent/route.ts`, `scripts/check-research-runtime.ts`, `scripts/check-{research-worker,research-durable,security}.ts`.
- **Tekshiruv:** **real disposable PG `test:research-runtime` 12/0** — process kill checkpoint DB’da, ikki worker parallel claim’dan faqat bittasi, expired lease stale write rad (yangi worker natijasi saqlanadi), cancel yangi claim/heartbeat/yozuvni to‘xtatadi, timeout/retry terminal, idempotency dublikat yaratmaydi, status/report DB’dan, anon RLS; `test:research-worker` 9/0, `test:research-durable` 9/0, `test:security` 107/0, isolated API security yangi cron 503 xavfsiz.
- **Qolgan cheklov:** Render Cron Job production’da yaratilmadi; production’da uzoq muddatli ikki instance parallel yuki kuzatilmadi.

## 10. Official-source refresh adapter

**1. Lokal implementatsiya qilindi va tekshirildi.** + **3. Production’da qo‘llash yoki sozlash kutilmoqda.**
- **Muammo:** ikki rejim ajratilgan, lekin haqiqiy server adapter yo‘q; HTTP 200 fakt tasdiqlanishi deb qabul qilinishi xavfi.
- **Tuzatish:** `createOfficialSourceAdapter()` + `.server.ts` (typed facts, `official_source_checks` persist, `migration_pending` xavfsiz), `fetchOfficialPage`/`verifyFactOnPage`/`htmlToText`; SSRF: URL, DNS/IP, redirect, timeout, response-size guardlari; adapter hech qachon HTTP body’dan olinmaydi; fakt topilmasa/parse xato/source mos kelmasa `last_verified_at` yangilanmaydi, oldingi verified qiymat dalilsiz almashtirilmaydi; admin `RefreshCenter` ikki rejim + `sourceChecks`/`verifiedDatesUpdated`/`failedChecks` ko‘rsatadi.
- **Fayllar:** `src/lib/{refresh,officialSourceAdapter,officialSourceAdapter.server,ssrf,refreshModes}.ts`, `src/app/api/admin/refresh/route.ts`, `src/components/admin/RefreshCenter.tsx`, `scripts/check-{official-source-adapter,refresh-modes,evidence-policy}.ts`.
- **Tekshiruv:** 38/0, 6/0, 9/0.
- **Qolgan cheklov:** production domenlariga qarshi haqiqiy fakt tekshiruvi o‘tkazilmadi (sandbox tarmoq cheklovi + production config yo‘q). Bu lokal implementatsiyani tugatmaslik uchun sabab qilinmadi — kod to‘liq, sinov guardlar bilan yopilgan.

## 11. Cache / review navbati / observability

**1. Lokal implementatsiya qilindi va tekshirildi.** + **2. Implementatsiya bor, ammo ma’lum tekshiruv yetishmaydi.**
- **Muammo:** process-local cache faqat hujjatlashtirilgan; ishlaydigan review navbati yo‘q; loglarda request ID/secret filtri yo‘q.
- **Tuzatish:** `cache_revisions` DB jadvali + `readCacheRevision`/`bumpCacheRevision`/`cacheRevisionKeyPart`/`INVALIDATION_SCOPES` + halol `shared=false` fallback; dashboard/catalog cache ulandi, profil yozuvi revision bump qiladi; `reviewQueue.ts` 7 kategoriya (manbasiz, eskirgan, konflikt, cycle yo‘q, funding, dublikat, failed job) + GET/POST API + `ReviewQueue.tsx` tab, ochish `verified` yozmaydi (`verifiedWritten:false`); `observability.ts` request/job ID, secret/PII redaction, bounded text, `safeErrorMessage` (raw DB connection string logga chiqmaydi); refresh/adapter/review-queue/cron/durableStore ulandi.
- **Fayllar:** `src/lib/{cacheRevision,dashboardRecommendationCache,catalogCache,reviewQueue,observability}.ts`, `src/app/api/admin/review-queue/route.ts`, `src/components/admin/ReviewQueue.tsx`, `scripts/check-{cache-revision,dashboard-cache,review-queue,observability,profile-recompute}.ts`.
- **Tekshiruv:** 20/0, 13/0, 15/0, 8/0, **6/0** (`profile-recompute` yangi shared kalit kontraktiga moslandi, xatti-harakat zaiflashtirilmadi).
- **Qolgan cheklov:** review-queue route’ning SQL/UI runtime’i disposable DB’da sinanmadi (`Promise.all` catch har qanday query xatosini `migrationPending:true` deb qaytarishi mumkin — partial failure yashirinishi ehtimoli bor); production’da ko‘p instance cache invalidatsiyasi kuzatilmadi.

## 12. Dependency / CI / performans

**1. Lokal implementatsiya qilindi va tekshirildi.** + **2. Implementatsiya bor, ammo ma’lum tekshiruv yetishmaydi.** + **3. Production’da qo‘llash yoki sozlash kutilmoqda.**
- **Muammo:** 12 moderate advisory; `ci/security-ci.yml` avtomatik ishga tushmasdi; literal `ignoreBuildErrors: true` deploy’da typecheck’ni chetlab o‘tardi; landing 1276 KiB budjetga yaqin.
- **Tuzatish:** `docs/DEPENDENCY_ADVISORIES_2026-11-06.md` — 12 ta paket/versiya/prod-dev/ta’sir yo‘li/safe update jadvali; ikkita ildiz GHSA; **scoped `minimatch ^11.0.5` override** bilan 12→4; `npm audit fix --force` (drizzle-kit 0.31→0.18, eslint-config-next 16→15 downgrade) rad etildi; esbuild 0.18 override sinovi `npm ls invalid` bergani uchun bekor qilindi; qolgan 4 ta dev-only zanjir uchun sabab/ta’sir/kuzatuv. Mirror `CI (portable mirror — not auto-discovered)` deb aniq nomlandi, buyruqlar real `.github/workflows/ci.yml` da ham bor, `check-audit-safety` endi `name` dan tashqari barcha executable kalitlarni solishtiradi; 9 ta yangi guard ikkala zanjirga qo‘shildi. `next.config.ts` → `ignoreBuildErrors: process.env.npm_lifecycle_event === "build"` + bloklovchi `prebuild: npm run typecheck`; to‘g‘ridan `next build` Next’ning o‘z typecheck’ini ishlatadi. `<1300 KiB` threshold **oshirilmadi**; oldingi regressiv optimizatsiyalar qayta kiritilmadi.
- **Fayllar:** `docs/DEPENDENCY_ADVISORIES_2026-11-06.md`, `package.json`, `package-lock.json`, `.github/workflows/ci.yml`, `ci/security-ci.yml`, `next.config.ts`, `scripts/check-{deploy,build-gates,audit-safety,perf}.ts/.mjs`.
- **Tekshiruv:** `npm audit --omit=dev` **0**, `npm audit --json` 4 moderate/0 high-critical, `npm ls` 0 invalid, `npx drizzle-kit --version` 0, `npx tsx` 0, `test:build-gates` 13/0, `test:deploy` 6/0, `test:audit-safety` 27/0, **clean build 0**, `test:perf` 16/0, `test:browser-perf` 2/0.
- **Qolgan cheklov:** 4 ta dev-only esbuild advisory yopilmadi (yangi `drizzle-kit` release’i kutiladi — 3); xavfsiz qo‘shimcha JS optimizatsiyasi qo‘llanmadi (2); browser benchmark real-user INP/production UX sifatida taqdim etilmadi.

## 13. Ma’noli yakuniy tekshiruvlar

**1. Lokal implementatsiya qilindi va tekshirildi.**
- **Muammo:** test soni ko‘paytirish emas, yangi/tuzatilgan xatti-harakatni isbotlash; 401/403/503 yakka o‘zi xavfsizlik isboti emas; faqat source-regex emas, brauzer dalili kerak.
- **Tuzatish:** 9 ta yangi/kengaytirilgan guard aynan tuzatilgan xatti-harakatni sinaydi (`research-runtime`, `observability`, `build-gates`, `admission-probability`, `typed-evidence`, `source-recheck`, `profile-recompute`, `security`, `audit-safety`); allowed+denied birga (migration dry-run privileged backend + anon rad; isolated API security 49 fixture probe; `test:ownership` 83/0; E2E vault/dashboard); rendered UI Playwright orqali 390px/1440px/EN-UZ-RU/theme.
- **Fayllar:** yuqoridagi guard’lar + `e2e/*`, `test-results/`.
- **Tekshiruv:** `test:e2e` **21 passed / 2 skipped**, `test:browser-perf` **2 passed**, `test:api-security:isolated` 0, `test:integration` 499/0, `test:backend-audit` PASS, barcha 22 guard 0. Sort profil bilan saqlanishi (`test:university-sort` 15/0), API xatosi bo‘sh applications’ga aylanmasligi (`test:applications-state` 9/0), profil almashuvi (`test:ownership` 83/0 + E2E#13), unknown vs rasmiy hujjat (`test:documents-readiness` 10/0), unsaved forma/chunk recovery (`test:chunk-recovery` 13/0 + E2E), eski tab→yangi build (`/api/config/build`), moliyaviy bir xillik (`test:finance-unified` 16/0 + `test:compare` 44/0), probability UI+API (`test:admission-probability` 12/0), worker restart/parallel (`test:research-runtime` 12/0), post-migration login/reset/upload (dry-run + E2E).
- **Qolgan cheklov:** `test:provenance` va `test:auth-flow` to‘liq yugurtirilmadi (birinchisi doimiy `APP_BASE_URL`+DB, ikkinchisi desktop `.next/standalone` artifact talab qiladi; avvalgi fixed-log sweep’da provenance o‘tgan, desktop build qilinmagan). 2 skipped perf testi alohida 2/2 o‘tdi — yangi bug emas. Dev-mode timeout production bug ham, zararsiz ham deb mutlaq aytilmadi.

## 14. Release tayyorgarligi

**3. Production’da qo‘llash yoki sozlash kutilmoqda.** + **4. Tashqi credential yoki aniq foydalanuvchi qarori zarur.**
- **Muammo:** yakuniy diff/ro‘yxat, staging rejasi, env nomlari, build→migration→flag→worker→smoke tartibi, rollback, to‘lov/Telegram test, production checklist, 1–4 toifali hisobot yo‘q edi.
- **Tuzatish:** `docs/RELEASE_READINESS_2026-11-06.md` (9 bo‘lim) + ushbu hisobot + yangilangan `docs/QOLGAN_ISHLAR_JADVALI_2026-11-06.md` (22 qator). Secret qiymatlari yo‘q, faqat nomlar. Custom HMAC auth aniqlandi (`auth.users=0`, numeric profile ID) → Supabase Auth URL o‘zgartirish **kiritilmadi**, custom `sb_session`/redirect tekshiruvi yozildi. Default/oshkor secret topilmaganligi uchun rotatsiya majburiy ishga aylantirilmadi; kerak bo‘lsa no-downtime o‘tish tartibi yozildi.
- **Fayllar:** `docs/RELEASE_READINESS_2026-11-06.md`, `docs/HISOBOT_YAKUNIY_2026-11-06.md`, `docs/QOLGAN_ISHLAR_JADVALI_2026-11-06.md`.
- **Tekshiruv:** barcha lokal/disposable testlar yuqoridagi jadvalda; hech qanday production yozuvi qilinmadi.
- **Qolgan cheklov:** production deploy/migration/apply, real payment sandbox’dan tashqari operatsiya, haqiqiy Telegram xabari, Render Cron Job yaratish va production smoke — **alohida ruxsat** talab qiladi.

---

## Qolgan ishlar (aniq nomlar)

1. Production’ga ikkala migratsiyani qo‘llash, `RESEARCH_DURABLE_STORE`/`CRON_SECRET` o‘rnatish, Render Cron Job yaratish (3).
2. Rasmiy MIT (`mitadmissions.org`, `oge.mit.edu`, `eecs.mit.edu`) va Yenching fellowship/Program Structure sahifalarini haqiqiy server adapter orqali qayta o‘qib, `official_source_checks` ga yozish (3); `$5,040` va dublikat MBA read-only query’larini production bazada bajarish (4).
3. `src/app/api/admin/review-queue/route.ts` SQL/UI runtime’ini disposable DB’da sinash; `Promise.all` catch’ining partial-failure yashirish ehtimolini bartaraf etish (2).
4. Compare / moliyaviy reja / admin edit-verify ekranlarida `evidence` envelope’ini to‘liq render qilish (2).
5. 4 ta qoldiq dev-only esbuild advisory uchun yangi `drizzle-kit` release’ini kuzatish (3).
6. Desktop standalone build va `test:auth-flow` (2); `test:provenance` ni doimiy disposable stack bilan qayta yugurtirish (2).
7. Progress % lari uchun alohida formula/denominator hujjati (2).
8. Landing JS bo‘yicha xavfsiz qo‘shimcha optimizatsiya — threshold oshirilmaydi; production RUM/INP ma’lumoti (2/3).
9. Production’da login → profil → tavsiya → ariza → hujjat smoke, payment sandbox, Telegram test/mock, allowed+denied va ko‘p instance cache/worker kuzatuvi (3/4).

> **Yozilmagan da’volar:** “Hammasi tayyor”, “100% xavfsiz”, “barcha ma’lumot verified” deb aytilmadi. 401/403/503 yakka isbot sifatida ishlatilmadi. Test soni emas, xatti-harakat dalili keltirildi. Oddiy implementatsiya va rasmiy manba tekshiruvlari keyingi fazaga surilmadi — kod/qidiruv query’lari lokal yozildi, faqat production’da bajarilishi qoldi va u yuqorida aniq ko‘rsatildi.


---

## 15. Joriy revision — 15 bandli davom (2026-11-06)

**Branch:** `arena/672d7668-scholarbridgeai` · **HEAD:** `d185e61` + ishchi diff · **Joriy `git status --porcelain`:** 115 modified / 88 untracked = **203 path**. Commit, push, PR, production apply/deploy, real payment, real Telegram — **QILINMADI**. `reset --hard`, `clean`, lossy checkout ishlatilmadi; barcha oldingi ish saqlandi.

### 15.1 Muammo → yechim → fayllar → tekshiruv

| # | Muammo | Yechim | Fayllar | Test |
|---|---|---|---|---|
| 1 | Release’da rollback forward apply zanjirida edi | 3 forward vs 3 recovery alohida; runner rollback’ni topmaydi; v1 tarixiy, v2 field-level guarded; har migration’ga alohida recovery; qo‘llangan migration o‘rniga versiyalangan v2 follow-up | `docs/MIGRATION_RUNBOOK_2026-11-06.md`, `docs/RELEASE_READINESS_2026-11-06.md` §2/§8, `supabase/*rollback_v2.sql`, `*recovery.sql`, `*followup_*_v2.sql`, `scripts/check-migration-{runner,recovery}.ts`, `scripts/check-backend-sql.py` | `test:migration-runner` **9/0**; `test:migration-recovery` **7/0** (real disposable PG: forward, 2× apply, guarded abort, preflight rad, field-level recovery, LOGO/RLS saqlanadi) |
| 2 | 5 ta ekran `EvidenceNote`’ga ulanmagan | `presentRaw()` — chaqiruvchi `trust`/`valueType` ni aniq aytadi, hech qachon upgrade qilmaydi; benchmark `observed_statistic`, effective `computed_fit`, katalog `unverified`, unknown «not published, not zero» | `src/lib/factPresentation.ts`, 5 ta komponent | `test:evidence-render` **16/0** (real EN HTML) |
| 3 | Rasmiy topilmalar faqat chat’da | 4 rasmiy sahifa qayta o‘qildi (2 tasi 2×), verbatim iqtiboslar hujjatga saqlandi; 26 fact + `recommended_score` CHECK + 2 legacy update; eligibility xom tokenlari tarjima yorlig‘iga almashtirildi | `docs/OFFICIAL_SOURCE_READ_2026-11-06.md`, `docs/OFFICIAL_SOURCE_OPEN_ITEMS_2026-11-06.md`, v2 SQL, `src/lib/{evidencePolicy,typedEvidence,factPresentation}.ts`, `src/components/EvidenceNote.tsx`, `src/app/scholarships/[id]/page.tsx`, 3 locale | `test:source-recheck` 12/0, `test:evidence-render` 16/0, `test:migration-recovery` 7/0 |
| 4 | `registry.setRun` har doim **guardsiz** durable yozar edi | Fail-closed typed guard: `{workerId}` / `{kind:"unclaimed"}` / `{kind:"admin_cancel"}`; terminal state in-memory immutable; admin cancel worker lease’ga bog‘lanmadi | `src/lib/research-agent/{durableStore,registry,types}.ts`, admin cancel route, `scripts/check-research-runtime.ts` | `test:research-runtime` **15/0** (unguarded rad, in-process → worker-owned rad, admin cancel ishlaydi, kech callback ocholmaydi, 2 parallel client’dan 1 g‘olib), `test:research-worker` 9/0 |
| 5 | Tez deep-link o‘zgarishi `#dashboard` ga qaytardi | URL manba sifatida mustahkamlandi: navigatsiya hash’ni o‘sha task’da yozadi; sync effect boshqa linkable destination’ni ustidan yozmaydi | `src/app/HomeClient.tsx` | Ilgari 2× ketma-ket fail bo‘lgan `site-audit.spec.ts:164` → **8/8 passed** |
| 6 | Premium faqat rang darajasida | Global focus/reduced-motion/`@supports` blur+solid fallback/transform-only hover/container/safe-area; `ActionBar` (1 primary + aniq secondary), `StatusPill` (rang+ikon+matn) | `src/app/globals.css`, `src/components/ui/{StatusPill,ActionBar,tokens,index}.ts*`, `scripts/check-design-system.ts` | `test:design-system` **10/0**, `test:dark` 410 qoida/0 unreadable, `test:localization` 16/0 |
| 7 | Dashboard «qayerdamiz / keyingi qadam» demasdi | Yangi «Keyingi qadam» paneli: bitta primary, 3 ta ko‘rinadigan secondary, to‘siq `StatusPill`, «joriy ≠ bajarildi» ogohlantirish. Barcha eski kartalar/AI audit/sidebar joyida | `src/components/DashboardView.tsx`, 3 ta locale | `test:design-system` 10/0, i18n **4259** `t()`, typecheck 0 |
| 8 | `/tmp/final-validate.sh` /tmp’da qolgan | 23 → **35** check repo’da; CI P1 chain’ga 3 ta yangi guard ikkala workflow’da | `scripts/validate-local.sh`, `package.json`, 2 ta CI, `scripts/check-build-gates.ts` | `npm run validate:local` **TOTAL_FAILS=0** |
| 9 | Inventar yakuniy solishtirish bo‘sh edi | Baseline → joriy dirty tree: 0 preservation failure | `docs/FUNKSIYALAR_INVENTARI_2026-11-06.md` | `test:feature-inventory:verify` **0 failure** |
| 10 | Formulalar hujjati yo‘q | 75/77.1/85% manbalari, numerator/denominator, unknown, qayta hisoblash, yaxlitlash, 8 journey vs 10 study plan | `docs/PROGRESS_FIT_EVIDENCE_FORMULALARI_2026-11-06.md` | `test:profile-recompute` 6/0, `test:cache-revision` 20/0, `test:finance-unified` 16/0 |

### 15.2 Joriy revision testlari (qayta yugurtirilgan)

| Komanda | Muhit | Natija |
|---|---|---|
| `npm run validate:local` | lokal + 3 ta disposable embedded-PG (self-clean) | **TOTAL_FAILS=0**, 35 ta check (§15.3) |
| `npm run typecheck` | `tsc --noEmit` | exit 0 |
| `npm run lint:baseline` | ESLint | 0 issues / PASSED |
| `node scripts/check-i18n.mjs` | EN/UZ/RU | **4259** `t()` call, passed |
| `npm run build` (clean `.next`) | dummy env, `prebuild` typecheck | exit 0 (77 sahifa) |
| `npm run test:dark` | globals.css kaskad replay | 410 qoida, **0 unreadable pair**, 0 leak |
| `npm run test:integration` | lokal | **499 passed / 0 failed** |
| `npm run test:backend-audit` | disposable | PASS |
| `npm run test:api-security:isolated` | disposable PG + `next start` | exit 0 (286 handler / 49 fixture probe, allowed+denied) |
| `npm run test:evidence-render` | real `react-dom/server` **EN + UZ + RU** HTML | **17/0** |
| `npm run test:design-system` | real `react-dom/server` | **10/0** |
| `npm run test:migration-runner` / `:migration-recovery` | disposable PG 55445 | **9/0** / **7/0** |
| `npm run test:research-runtime` / `:research-worker` / `:research-durable` | disposable PG 55443, 2 parallel client | **15/0** / 9/0 / 9/0 |
| `npm run test:review-queue` / `:review-queue-runtime` | disposable PG 55444 | 15/0 / **10/0** |
| `npm run test:source-recheck` / `:typed-evidence` / `:channel` | lokal | 12/0 / 17/0 / 196/0 |
| `npm run test:finance-unified` / `:cache-revision` / `:admission-probability` | lokal | 16/0 / 20/0 / 12/0 |
| `npm run test:security` / `:audit-safety` / `:build-gates` | lokal | PASSED / 27/0 / 13/0 |
| `npm audit --omit=dev --audit-level=moderate` | lokal | **0 vulnerabilities** |
| `npm audit --json` | lokal | **4 dev-only moderate**, 0 high/critical |
| `npm run test:e2e` | disposable PG + production-mode `next start` + Playwright | **21 passed / 2 skipped / 0 failed**, exit 0 (9.8m) |
| `npm run test:browser-perf` | disposable PG + `next start` | **2 passed / 0 failed** |
| `E2E_VISUAL=1 node scripts/run-e2e.mjs e2e/visual-acceptance-2026.spec.ts` | real Chromium, 390/1440, EN/UZ/RU, light/dark | `docs/redesign/after-2026-11-06/` screenshotlari + overflow/covered-button assertlari |
| `NEXT_OUTPUT_STANDALONE=1 npm run build` → `npm run desktop:prepare` → `npm run test:auth-flow` | `.next/standalone` + disposable embedded PG 56321 | **41 assertions passed / 0 failed**, exit 0 |

### 15.3 `validate:local` ning 35 ta check’i

`typecheck`, `lint:baseline`, `i18n`, `localization`, `dark`, `source-recheck`, `typed-evidence`, `admission-probability`, `evidence-render`, `finance-unified`, `cache-revision`, `channel`, `profile-recompute`, `chunk-recovery`, `observability`, `deploy`, `official-source-adapter`, `security`, `audit-safety`, `build-gates`, `feature-inventory:verify`, `design-system`, `migration-runner`, `migration-dry-run`, `migration-recovery`, `research-worker`, `research-runtime`, `review-queue`, `review-queue-runtime`, `backend-audit`, `api-security:isolated`, `prod-audit` (+ CI P1 chain’dagi qo‘shimcha guard’lar). Tartib: statik → migration (forward/recovery alohida) → real disposable PG → dependency. Production-mode build alohida bosqich.

### 15.4 Hali ochiq / tekshirilmagan

1. Production: 3 forward migration, backup+preflight, deploy+flag, `CRON_SECRET`/`RESEARCH_DURABLE_STORE`/scheduler, cron auth, official-source smoke, user-flow smoke, recovery triggerlari — **qo‘llanmadi** (3/4).
2. `$5,040` va duplicate MBA read-only query’lari sxemaga moslashtirildi, lekin **production DB’da bajarilmadi** (4).
3. Worker identifikatori qayta ishlatilganda lease-generation/fencing token qo‘shilmadi; `worker.ts` har safar `randomUUID` ishlatadi, lekin bu to‘liq isbot emas (2).
4. `EvidenceNote` EN real HTML isbotlandi; UZ/RU kalitlar parity + `test:localization` bilan tekshirildi, alohida browser render screenshot’lari qisman (2).
5. `ActionBar`/`StatusPill` dashboard’da qo‘llandi; qolgan ekranlar eski ishlaydigan komponentlarida qoldi — izchillik to‘liq emas (2).
6. `desktop:prepare → test:auth-flow` **bajarildi** (41/0); faqat installer uchun Node runtime download sandbox’da muvaffaqiyatsiz bo‘ldi (warning, `--no-package` uchun ahamiyatsiz) — production installer yaratilmadi (3).
7. 4 ta dev-only moderate advisory (`@esbuild-kit/*`, `drizzle-kit`, `esbuild`): xavfsiz update yo‘q, `npm audit fix --force` rad etildi (3).
8. Browser benchmark — production real-user INP emas; screenshot interaktiv test o‘rnini bosmaydi (2).
9. Pulli provider / payment / Telegram: E2E’da env’dan chiqarilgan yoki mock; **real operatsiya va real xabar yuborilmadi**; funksiyalar o‘chirilmagan (4).

> **Xulosa:** inventar `0 preservation failure` va yuqoridagi testlar bilan «mavjud funksiyalar saqlandi» deyish mumkin, faqat 15.4 dagi production/credential/visual chegaralari bilan. «Hammasi tayyor», «100% xavfsiz», «barcha ma’lumot verified» deb yozilmaydi.

### 15.5 `desktop:prepare → test:auth-flow` (§11) — BAJARILDI

Loyihada qo‘llab-quvvatlanadigan yo‘l aniqlandi, yangi desktop mahsuloti yaratilmadi:

1. `NEXT_OUTPUT_STANDALONE=1 npm run build` → `.next/standalone/server.js` (`next.config.ts` opt-in flagi; `prebuild` typecheck bilan).
2. `npm run desktop:prepare` = `node scripts/build-desktop.mjs --skip-build --no-package` → mavjud `.next` dan `.next/standalone` artefakti yig‘iladi, qayta build yoki paketlash yo‘q.
3. `npm run test:auth-flow` = `node desktop/auth-flow.mjs` → `.next/standalone` ni `desktop/boot.mjs` orqali disposable embedded PG (port 56321), `supabase/full_schema.sql` va `/tmp/auth-test-data` bilan ishga tushiradi; MIN uzunlikdagi parol bilan sign-up/sign-in regressiyasini tekshiradi.

Bu yo‘l `.next` ni o‘zgartirgani uchun `test:e2e` bilan **bir vaqtda** yugurtirilmadi (ketma-ket). `cd desktop && npm install` test dependency’lari uchun bajarildi; `desktop/node_modules` Git’ga kiritilmaydi. **`npm run test:auth-flow` natijasi: 41 assertions passed, exit 0** — MIN uzunlikdagi parol sign-up/sign-in, 3 sikl noto‘g‘ri parol (401), to‘g‘ri parol bilan kirish, mavjud bo‘lmagan account uchun bir xil javob. `test:auth` (`scripts/check-auth-credentials.ts`) alohida statik guard sifatida `validate:local` tarkibida emas, lekin `test:security` ichida qamrab olingan. Yangi desktop mahsuloti yaratilmadi, mavjud deploy o‘zgartirilmadi.
