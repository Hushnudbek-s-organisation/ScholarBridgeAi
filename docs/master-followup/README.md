# Master davom ettirish — chegaralangan, amaldagi implementatsiya

**releaseReady=false; full Master tugallanmagan. PR, merge, deployment yoki yangi production write yo‘q.** Bu katalogni almashtiradigan demo emas. Oldingi yo‘qolgan katta patch tiklandi deb da’vo qilinmaydi; recovery qidiruvi va topilgan checkpoint `docs/recovery/SESSION-RECOVERY.md`da. Ushbu ish mavjud stack va consumerlarni kengaytiradi.

## WHAT → HOW → FILES → TEST → EVIDENCE

### N01: scoped grant, tuition ≠ total cost, year ≠ programme

- Legacy `Global`, `Full tuition`, katta dollar miqdori yoki entity `verified` belgisi to‘liq moliyalashtirish isboti emas. Discovery alohida saqlanadi. Applicability `applicable | not_applicable | unknown`; tuition va total-cost qamrovi alohida.
- Existing fact resolver, official-source va scoped requirement-group evaluator ishlatiladi. Real institution/programme ID, degree, cycle, applicant scope, documented completeness, citizenship/residency va shartlar yetarli bo‘lmasa `unknown`. Faqat yillik qamrov yillik full-cost sifatida ishlatiladi; programme summasi yillikka aylantirilmaydi. Konflikt total-cost full da’vosini bekor qiladi.
- Admin review endi original requirement_group bilan birga cheklangan scholarship field allowlistini qo‘llaydi: university_id, program_id, scope_complete, eligible_citizenships, eligible_residencies, tuition_coverage, total_cost_coverage. Source ownership, active/current version, expectedFact, quote, audit va revision himoyalari saqlangan. PostgreSQL numeric string exact-snapshot tekshiruvida son sifatida taqqoslanadi. Qo‘lda attestatsiya **network reread emas**.
- `coverageProgramId`, `coverageCycle`, `coverageApplicantScope` — explicit GET konteksti. `awardCoverageContext.server.ts` haqiqiy `programs` jadvalidan tanlangan yozuvni oladi; birinchi programme yoki applicant ma’lumotini o‘ylab topmaydi. Original profil kirishlari ishlatiladi. Tanlangan programme saved institutionga tegishli bo‘lmasa applicability tasdiqlanmaydi.
- Scholarship hub, dashboard, autopilot, deadlines real API consumerlariga bir xil adapter ulangan. Dashboard natija-cache kalitida exact scope mavjud: scoped `full` keyingi unscoped so‘rovga sizib chiqmasligi kerak. Oddiy kontekstsiz o‘qishda yangi programme/fact DB query qo‘shilmaydi.
- `AwardCoverageNote` shu mavjud ekranlarda unknown disclosure beradi, EN/UZ/RU matnlari mavjud. Bu yangi programme-selector UX yoki barcha Master ekranlari paritysi tugadi degani emas.
- Files: `src/lib/savedUniCoverage.ts`, `src/lib/awardCoverageContext.server.ts`, `src/lib/catalogueFactInput.ts`, `src/app/api/admin/catalogue-facts/review/route.ts`, to‘rtta API route, mavjud consumer komponentlar va locale fayllari.
- Tests: `check-scoped-award-coverage.ts` **42/0**; `award-field-review.spec.ts` actual 401/403/admin author/review → to‘rtta scoped API applicable/full → to‘rtta unscoped unknown → field editdan keyin to‘rtta unknown tekshiradi. Barcha grant/fact fixturelari fictional va faqat disposable PG uchun.
- Evidence: `N01-RED.log`, `N01-GREEN.log`, `N01-REVIEW-RED.*` (haqiqiy 400 review boundary); `N01-REVIEW-FIXTURE-ERROR.*` alohida harness xatosi, product RED emas. Keyingi API-SCOPED reportlarining barchasi saqlangan — yiqilgan runlar green deb yozilmaydi.

### N03: shared exam validation va original inputs

- `examRecords.ts` — IELTS, SAT, ACT, GRE, DET, original TOEFL scale/date/sections uchun umumiy boundary. Invalid qiymat clamp qilinib validga aylantirilmaydi. Null/zero farqlanadi; TOEFL 2026 transitionida asossiz legacy conversion yo‘q.
- Profil va recommendation API, requirement evaluation, matching/chancing/growth/recommend consumerlari hamda mavjud profile/onboarding/studio UI shu boundarydan foydalanadi. Group AND/OR semantikasi saqlangan; original GPA/scale qayta yozilmaydi.
- Evidence: `N03-RED.log`, `N03-FLAT-RED.log`, `N03-GREEN.log`, `N03-AST-FLAT-GREEN.log`; pure **50/0**, actual `exam-boundaries.spec.ts` API atomic rejection va original roundtripni tekshiradi. Bu barcha admin/bot/date/metadata yo‘llari tugallangan degani emas.

### N04: multilingual subject identity

- Unicode subject identity va faqat reviewed aliaslar; noaniq substring bilan subjectlar birlashtirilmaydi. Existing subject engine saqlangan.
- Files: `src/lib/subjectAffinity.ts`, `scripts/check-subject-identities.ts`; evidence `N04-RED.log`, `N04-GREEN.log`: **20/0**. API EN/UZ/RU alias parity actual recommendation testida bor. Full assessment-v2 ranking hali ochiq.

### N07: verification summary original exit status

- `.github/workflows/supabase-verify.yml` va uning `ci/` nusxasi real piped commandning original statusini saqlaydi; xulosada yiqilgan job yashirilmaydi.
- `check-verify-summary.mjs` extracted shellni success/failure holatlarda ishlatadi, log fixture vaqtinchalik xususiy katalogga yo‘naltiriladi. `N07-RED.log` → `N07-GREEN.log`, original workflow checks **4/0**; keyingi real-runner negative controls bilan `N07-RUNNER-GREEN.log` **8/0**. Bu hosted GitHub Actions DB credential tuzalganining isboti emas.

### UniversityExplorer request lifecycle

- Canceled/superseded fetch endi data/cache/loading/refreshing yozuvlarini bajarmaydi. Abort bo‘lgan StrictMode microtask yangi request epochini ham egallamaydi; cleanup eski callbacklarni invalid qiladi.
- Actual old client-locales failure University Explorerning nol qatorli holati va aborted request bilan bog‘liq edi; dashboard/hash fallback deb xulosa qilinmaydi. Epoch fix bu aniqlangan stale-writer zaifligini to‘sadi. Cold-dev latency yoki barcha auth lifecycle holatlari tuzatildi degan da’vo yo‘q.
- `university-request-epochs.spec.ts` real serverdan olingan JSON bodydan keyingi awaitni boshqariladigan tarzda ushlab turadi; fake response ishlatmasdan superseded body yangi card/loading holatini almashtira olmasligini tekshiradi. Bu alohida browser-race regression, auth race matrix emas.
- File: `src/components/UniversityExplorer.tsx`. Final runtime acceptance faqat quyidagi final reportlar bilan belgilanadi, historical 7/1 run bilan emas.

## Existing assertionlar nega o‘zgargan

Testlar olib tashlanmadi yoki bugga mos yumshatilmadi. `N04-RED.log`da avvalgi engine related fanlarni identity/synonym deb birlashtirgani takrorlangan. Master N04 bo‘yicha Software Engineering ≠ Computer Science va AI ≠ AI & Data Science; oldingi `synonym/strong` assertionlar shu noto‘g‘ri contractni mustahkamlagan. Endi ular **partial va similarity/score <0.85** ni talab qiladi; haqiqiy reviewed multilingual aliaslarning exact/synonym holati alohida test bilan saqlanadi. Bir xil related fitlarda stable-ID order tekshiruvi qolgan. `check-growth.ts`dagi keyworddan `fullFunding=true` kutish N01 tuition≠total-cost siyosatiga zid edi: endi keyword false, serverning explicit proved-total-cost flagi esa true bo‘lishi shart. Bu ijobiy yo‘lni o‘chirish emas; actual scoped four-API grant review E2E ham ijobiy yo‘lni tekshiradi.

N14 funding-inputs, confirmed/restricted scenarios, post-admission comparison va search-preload regressionlari saqlangan. Ularning production-mode full-suite natijalari yakuniy raw reportda; bu canonical CostScenario yoki full Master yakunlandi degani emas.

## Tekshiruv metodikasi va qayta ishlatish

```sh
# Node22, mavjud lockfile; provider credentiallari izolatsiyalangan wrapper
node_modules/.bin/tsx scripts/run-master-validation.ts validate:local
node_modules/.bin/tsx scripts/run-master-validation.ts build
# Faqat build tugagandan keyin; .next/types race bo‘lmasin
E2E_NEXT_MODE=start node scripts/run-e2e.mjs
# Opt-in visual/perf alohida; default run bilan green deb hisoblanmaydi
```

Budgets oshirilmagan, retries qo‘shilmagan, assertions kamaytirilmagan. Yangi skip qo‘shilmadi; default production suite oldindan opt-in bo‘lgan2performance testini skip qiladi va ular acceptance coverage sifatida hisoblanmaydi. UI matrix testida har tema uchun to‘liq boot o‘rniga real same-origin ikkinchi tabning native storage eventidan foydalaniladi; uchta locale uchun haqiqiy reload mavjud. `<html>` class bevosita almashtirilmaydi. EN/UZ/RU × dark/light/system disclosure screenshotlari — fizik Windows/Edge/scaling yoki full visual-risk-matrix isboti emas. System bu OS preference, uchinchi mustaqil palette emas. Oldingi 9-reload run 60s limitda yiqilgan va saqlangan; limit oshirilmagan.

Final source binding va gate natijalari `ACCEPTANCE.json`da berilgan. Docs o‘zgarishi runtime/verification set hashini o‘zgartirmaydi; `SOURCE-*` tracked va untracked source, lock va migration setlarini o‘z ichiga oladi. Capture va testdagi sandbox clock publisher faktlarining yangidan tekshirilgan sanasi emas. Build IDning mavjudligi o‘zi deployment yoki barcha testlar o‘tganini isbotlamaydi.

## Qo‘shimcha integration RED va false-green himoyasi

Default production browser suite **58 PASS /0FAIL /2existing opt-in performance SKIP /0flaky**,13.9min. `E2E-PRODUCTION-FULL.*`, build `-in0p13ZiY6NvnPFx99bd`. To‘rtta API review/edit,9disclosure kombinatsiyasi va genuine delayed-body UniversityExplorer race shu run ichida o‘tdi.

Keyingi `test:stack-integration` dastlabki wrapperda PASS deb yozildi, lekin uning provenance logida **2FAIL** bor edi. `GATES-FALSE-GREEN-REPORTED.log` va `STACK-PROVENANCE-RED.log` bu xatoni yashirmasdan saqlaydi; o‘sha PASS haqiqiy acceptance emas. Root cause installed `async-exit-hook`ning beforeExit orqali code0ni majburan tanlashi edi. Faqat process.exitCode yetmagan: genuine child7control ham0qaytargan. Endi barcha async cleanup kutilgach original code bilan explicit exit qilinadi; yuqori validation runner ham explicit FAIL satrlarini exit0bo‘lsa ham yiqilgan deb oladi. `STACK-EXIT-CONTROL.md` reproducerni va genuine0→7RED/GREEN dalilni beradi. `STACK-CORRECTED-STATUS-RED*` haqiqiy exit1ni saqlaydi. Real runnerga fake zero-exit failing command yuborilgan negative controls ham mavjud; ular app/PG runtime coverage emas.

Provenance fixture eski verified legacy rowni official cutoff deb kutgan. Existing scoped-detail contract buni ataylab `recordedRequirements`ga ajratadi. Fixture tuzatishida **6.5original qiymat/source/status assertionlari saqlandi**, unselected canonical cutoff null bo‘lishi qo‘shildi va alohida official exact-scope field yozuvi bilan6.5/9positive HTTP assertion tiklandi. Product policy yumshatilmadi. Cleanup faqat disposable fixture programme factlarini o‘chiradi; standalone suite endi hosted/ordinary dev DBni rad etadi. Green stack test actual local PG/provenance + **21/0mock-Telegram pipeline**ni bajaradi; real Telegramga xabar yubormaydi.

Muhim binding farqi: browser suite tugagandan keyin **faqat verification harness fayllari** o‘zgardi. Runtime/migration hashes o‘zgarmagan;58browser testi o‘sha build va o‘sha runtime source uchun dalil. Keyingi type/lint/local/integration gate’lar corrected harness uchun alohida. Oldingi build keyin o‘zgartirilgan harnessni typecheck qilgan deb da’vo qilinmaydi. Full Master strict final-tree release acceptance hali yopilmagan.

## Hosted read-only va tashqi cheklovlar

`evidence/N06-READONLY.json`: 124 public table/all RLS, browser write yo‘q, besh historical private prerequisite mavjud; `official_source_checks`/`review_queue_items` yo‘q, field facts 0. Qo‘shimcha metadata query timeout bo‘lgan, takrorlanmagan. GitHub secret metadata403; secret bytes olinmagan. Connector SQL success GitHub Actions 28P01 muammosining yechimi emas. Yangi production DDL, credential rotation yoki eski authorized repairni takrorlash bo‘lmagan.

`N10-READONLY-CANDIDATES.json`: ID namespace va ikki MBA candidate juftligi, **merge approval emas**. ORM `universityPrograms` physical `programs`; hosted legacy `university_programs` boshqa jadval. Rasmiy publisherlar joriy outbound allowlistdan tashqarida; tarixiy excerpt yoki saqlangan URL fresh reread o‘rniga ishlatilmaydi.

## Full Master ochiq qolayotgan acceptance

| Scope | Hozirgi holat / yopish uchun zarur dalil |
|---|---|
| Phase1 inventories | Static164 routes/288 methods/113 schema tables/123 migrations/220 test files. Entry→table→permission runtime to‘liq inventory/parity emas. |
| N02 / Phases4–5 | Exact assessment-v2 contract, coverage/bounds/staged ranking va barcha consumer paritysi yakunlanmagan. Sparse100 vs complete83, real programme aggregation, universal `not_validated` contract alohida end-to-end acceptance talab qiladi. |
| N03 / Phases2–3 | Shared exam boundary yaxshilandi; barcha metadata/date/admin/bot roundtrip, deadline timezone/cycle/source policy to‘liq tekshirilmagan. |
| N05 / Phase7 | University request epoch auth serialization/server generation/ABA/DELETE/rollback/idempotency/multitab acceptance o‘rniga o‘tmaydi. Delayed real browser+PG auth race matrix ochiq. Unchanged-version manual-review retransmissionning existing UNIQUE(fact_id,reviewed_version) chegarasidagi idempotency ham alohida ochiq; bu route uchun duplicate retry success da’vosi yo‘q. |
| N06/N10 | Current workflow28P01 yechimi unverified; kerakli qo‘shimcha hosted schema/evidence va publisher-cycle/identity review ochiq. Yangi production migrationga avtomatik ruxsat yo‘q. |
| N12 / Phase6 | Published-default canonical CostScenario, native amount/period/FX/inclusions/upfront va confirmed once-only restricted allocation barcha consumerlarda isbotlanmagan. |
| N13 / Phase8 | Existing worker fences saqlangan, lekin transitive await/abort, incurred-usage once, full crash-resume matrix tugallanmagan. Document effective-status/hash/CAS/private grants audit to‘liq emas. |
| Phases9–10 | Barcha ekranlar, roles, bot/print/workspace, 7 dock roots, mobile More, dialog/focus/reflow va3×3 risk matrix to‘liq emas. Fizik Windows/Edge/scaling tekshirilmagan. |
| Phase11 | ≥5 matched production before/after + realistic facts/programmes +10×stress, transfer/query trace, field vs lab evidence yo‘q. Health yoki decoded JS bytes LCP/field INP emas; budjetlar oshirilmaydi. |
| Phase12 | Full final-tree E2E/visual/opt-in perf, migration recovery va10 final deliverable to‘liq yopilmagan. Local/targeted green release approval emas. |

A01–A26/C original semantikalar qayta taqsimlanmaydi. To‘liq asl mapping berilmagan joylar yopildi deb belgilanmaydi; bu mustaqil amaliy tuzatishlarni to‘xtatmaydi. Critical gap bor ekan merge/release yo‘q; “faqat deploy qoldi” deyilmaydi.

Raw `.log` fayllari command output baytlarini, jumladan terminal trailing whitespace/CRlarini saqlaydi. Source diff whitespace gate faqat shu raw evidence loglarini chiqarib tashlaydi; kod, assertion yoki test failure yashirilmaydi.
