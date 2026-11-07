# Lokal tekshirish va dalil saqlash runbooki

Bu hujjat release, CI yoki production tayyorligi tasdig‘i emas. Barcha ishlar `arena/660f1392-scholarbridgeai` dirty branchida saqlanadi. Avtomatik commit, push, merge, deploy, production SQL, haqiqiy to‘lov, pullik AI yoki Telegram jo‘natish yo‘q.

## 1. Daraxtni saqlash

- `git status --short` va `git diff --check` bilan boshlang. Mavjud o‘zgarishlarni saqlang; `reset --hard`, `clean`, force downgrade va boshqa branchga o‘tish ishlatilmaydi.
- `node scripts/capture-source-state.mjs test-results/<yangi-nom>.json` yo‘llar, hajmlar va SHA-256 indeksini **faqat yangi faylga** yozadi. `.env` va Git credential fayllari o‘qilmaydi. Runtime, migratsiya va tekshirish kirishlari alohida hash qilinadi.
- `HEAD` dirty daraxtni ifodalamaydi. Hisobotda branch + HEAD + runtime hash + tekshirish hash + build ID birga berilishi kerak.

## 2. Umumiy lokal/CI kontraktlari

```bash
npx tsx scripts/run-master-validation.ts validate:local
npx tsx scripts/run-master-validation.ts build
```

Wrapper tashqi xizmatlar uchun izolatsiyalangan muhit, bloklangan oddiy DB manzili va disposable session kalitini ishlatadi. Haqiqiy SQL dalillari alohida vaqtinchalik embedded PostgreSQL’da ishlaydi. `TOTAL_FAILS=0`, wrapper exit kodi va tegishli ichki log birgalikda tekshiriladi; faqat so‘nggi `PASS` qatori yoki nol exit kodi yetarli emas. Runner muvaffaqiyatsiz assertion/FATAL satrlarini ham tekshiradi.

Loglar: `test-results/master-2026-11-07/`. Har muhim qayta ishga tushirishning yuqori darajali logini `test-results/continuation-2026-11-07/` ichida alohida nom bilan saqlang. Tarixiy muvaffaqiyatsizlikni o‘chirib yubormang.

## 3. Production buildga qarshi brauzer

```bash
E2E_NEXT_MODE=start npm run test:e2e
```

Bu productionga ulanish emas: production-rejimdagi **lokal Next server**, yangi disposable PostgreSQL, soxta fixture akkauntlari va o‘chirilgan tashqi provayder credentiallari ishlatiladi. `next start` dan oldin aynan runtime kirishlariga mos muvaffaqiyatli build zarur.

Muhim fokuslangan regressiyalar:

```bash
E2E_NEXT_MODE=start node scripts/run-e2e.mjs \
  e2e/checklist-continuation.spec.ts e2e/continuation-contracts.spec.ts \
  e2e/dashboard-continuation.spec.ts e2e/vault-continuation.spec.ts \
  e2e/phase12.spec.ts
```

Fixture yozadigan testlar o‘z o‘zgarishlarini tiklashi kerak. Ayniqsa checklistning ijobiy IELTS/GPA personasi boshqa spec’ning boshlang‘ich profiliga oqib o‘tmasligi kerak. Umumiy `e2e-report.json` va trace katalogi keyingi yugurishda almashtiriladi; zarur dalil nusxasini avval alohida nom bilan saqlang. Ikki brauzer runnerini bir xil output katalogiga parallel yo‘naltirmang.

## 4. Vizual dalillar — tarixiy rasmlarni almashtirmasdan

```bash
E2E_NEXT_MODE=start E2E_VISUAL=1 \
E2E_VISUAL_OUTPUT_DIR=test-results/continuation-2026-11-07/visual-current \
node scripts/run-e2e.mjs e2e/visual-acceptance-2026.spec.ts
```

Bu opt-in visual suite standart brauzer suite’dan alohida. O‘tkazilgan/qamrab olinmagan holatlar ochiq yoziladi. CSS `zoom: 2` — native brauzer zoomi emas; viewportni kichraytirish — haqiqiy OS klaviaturasi emas. Screenshotlar soxta test ma’lumotlari bilan olingan; ular admissions/funding faktlari manbasi emas.

## 5. Mos sharoitli performance

```bash
E2E_NEXT_MODE=start PERF_STAGE=before \
PERF_OUTPUT_DIR=test-results/continuation-2026-11-07/perf-pair-01 \
node scripts/run-e2e.mjs e2e/performance.spec.ts

# Faqat baseline saqlangach va aniq performance o‘zgarishi/builddan keyin:
E2E_NEXT_MODE=start PERF_STAGE=after \
PERF_OUTPUT_DIR=test-results/continuation-2026-11-07/perf-pair-01 \
node scripts/run-e2e.mjs e2e/performance.spec.ts
```

- Baseline fayllari va trace nusxalari immutable saqlanadi. Stage nomi o‘zi haqiqiy oldin/keyin isboti emas.
- Bir xil Node/Next/React/Chromium, viewport, locale, CPU/network emulation, fixture tarkibi va tashqi origin bloklash sharoitlari kerak. Har profil uchun 3 cold va 3 warm kuzatuv olinadi.
- CPU talabchan build, backend suite yoki boshqa browser bilan parallel o‘lchamang.
- `themeClickMs`, `signInDialogMs`, `signInShellMs` automation kutishlarini o‘z ichiga oladi. `interactionTrace` dispatch → DOM → ikki animation-frame oralig‘ini alohida beradi; bu ham haqiqiy fizik paint va field INP emas.
- Ikki universitetli browser fixture katta katalog yukini isbotlamaydi. `test:catalogue-query-load` alohida SQL/loader dalili; decoded JSON byte HTTP transfer byte emas.
- 3 namuna p95 yoki statistik speedup uchun yetarli emas. Yo‘qolgan tarixiy trace yoki mos kelmagan baseline asosida yaxshilanish da’vosi qilinmaydi.

## 6. Migratsiya va recovery

Yangi forward SQL: `official_source_program_checks_2026-11-07.sql`, `fact_scope_cas_2026-11-07.sql`, `document_review_records_2026-11-07.sql`, `applicant_context_2026-11-07.sql`, `atomic_cache_revisions_2026-11-07.sql`. Ular tegishli schema/preconditionlarga tayanadi; ularni katalogdagi barcha SQL fayllar bilan bir apply zanjiriga qo‘shmang.

`security_evidence_research_2026-11-06_recovery.sql` va `official_source_corrections_2026-11-06_rollback*.sql` — recovery/rollback yo‘llari, forward chain emas. Productionda ularni yoki yangi forward SQL’ni bajarish uchun alohida operator ruxsati va preflight zarur. Tarixiy ruxsat berilgan SQL qayta bajarilmaydi.

Lokal preflight/recovery dalillari: `test:migration-runner`, `test:migration-dry-run`, `test:migration-recovery`, `test:master-database`, `test:research-runtime`. UUID fact FK, review RLS/grantlari, atomik revision triggerlari va failure injection aynan PostgreSQL’da tekshiriladi.

Qo‘shimcha evidence/review jadvali yo‘q bo‘lsa, optional o‘qish savepointdan rollback qilinadi: parent tranzaksiya `25P02` bilan zaharlanmasligi kerak. Permission xatosi missing schema sifatida yutilmaydi. `28P01` autentifikatsiya xatosi alohida klassifikatsiya qilinadi; eski xato yangi live tekshiruvsiz hozirgi holat deb aytilmaydi.

## 7. Xavfsizlik va halollik chegaralari

- Vault tashqi fayl/link **metadatasi** va shu metadataga bog‘langan review hashini boshqaradi; bu private secure upload/storage tasdig‘i emas. Public LOGO branding o‘qishi saqlanadi.
- Source review qo‘lda attestatsiya bo‘lsa, `officialPageReRead: false` saqlanadi; uni avtomatik rasmiy sahifa qayta o‘qilishi deb ko‘rsatmang.
- GPA planning conversion rasmiy cutoff uchun ishlatilmaydi; TOEFL 120 va 6 shkala orasida konversiya yo‘q. Legacy minima va scope/date/unit yetishmasligi eligibility uchun unknown.
- Profil yozuvlari qamrovi checklist/admission readiness emas. Saqlangan/ariza berilgan award secured funding emas. Shaxsiy admission probability mavjud emas.
- Fresh `npm audit --json` natijasi alohida qayd etiladi. `--force`, budget oshirish, testni disable/skip qilish yoki tarixiy route/nav/action baseline’ni moslab yozish ishlatilmaydi.

## 7. Shu davrdagi qo‘shimcha regressionlar

- `e2e/navigation-continuation.spec.ts`: real desktop/mobile shell, section/pane URL reconciliation, Back/Forward, malformed hash, reload. Build14 fokuslangan to‘plamda 9 PASS (phase12/checklist/continuation bilan birga).
- Dashboard screenshotlarini qayta yugurishda tarixiy katalog ustiga yozmang: `DASHBOARD_EVIDENCE_OUTPUT_DIR=test-results/<yangi-screens-katalog>` bering.
- Arxivdagi build bilan E2E: `E2E_NEXT_MODE=start E2E_BUILT_ARTIFACT_DIR=.cache/continuation-builds/runtime13/.next ...`. Same-protocol after ham shu server yo‘li bilan, lekin `E2E_BUILT_ARTIFACT_DIR=.next` orqali ishga tushiriladi. Bu source checkout/branch almashtirmaydi.
- Oddiy `npm run build` bu sandboxda DATABASE_URL yo‘qligi tufayli fail bo‘ldi. Standart `npx tsx scripts/run-master-validation.ts build` izolatsiyalangan bloklangan lokal DB env bilan o‘tdi. Haqiqiy secret so‘rash yoki production DB’ga ulash zarur emas.
- Build13 archive baseline: desktop overall timeout FAIL, mobile PASS; desktop uchala cold/warm namuna va final attachment yozilgan. Timeout budjeti oshirilmadi. Buni 2 PASS deb aytmang.


## Universitet scope continuation (joriy build)

- Dolzarb kod/test holati: `DETAIL-SCOPE-PROGRESS.md`; build/source hash: `DETAIL-BUILD-PROVENANCE.json`.
- Izolatsiyalangan build: `npx tsx scripts/run-master-validation.ts build`.
- Full production browser: `E2E_NEXT_MODE=start npm run test:e2e`.
- Faqat scoped detail kontrakti: `E2E_NEXT_MODE=start npm run test:e2e -- e2e/university-detail-contracts.spec.ts`.
- Shared suite: `npm run validate:local`; sof scope/native-unit/legacy/group regressiyalari: `npm run test:continuation`.
- Ko‘rinishlar: `test-results/continuation-2026-11-07/detail-screens/native-scope-{en,uz,ru}-390.png`. UI FICTIONAL disposable fixture; real universitet talabi emas.
- Cookie tilini haqiqiy full reload’da o‘qitish kerak: bir xil URL/hash’ga `goto` navigatsiya qilmasligi mumkin. Locale assertion yoki timeout’ni oshirish bilan xatoni yashirmang.
- Test marker’lari production SQL yo‘riqnomasi emas. E2E DB hostname va nomni tekshirgandan keyingina fixture SQL ishlaydi. Admin numeric fact’ni manual-review endpoint qo‘llaydi deb taxmin qilmang: mavjud endpoint faqat `requirement_group`ni tasdiqlaydi.
- Original A01–A26 ma’nolari o‘zgartirilmagan. Ushbu integratsiya barcha fazalar, barcha consumer’lar yoki releaseReady tasdig‘i emas.
