# ScholarBridgeAI — lokal implementatsiya va qabul holati

**Sana:** 2026-11-07. **Baza:** `1bd810bbb5a6e749488331fb60d452b425c1b918` (main / PR133).
**Ishchi branch:** `arena/660f1392-scholarbridgeai`.

## Muhim xulosa

Bu to‘liq master-topshiriq bajarilgani yoki production reliziga ruxsat berilgani haqidagi hisobot emas. Haqiqiy ilovaga kod o‘zgartirishlari kiritildi, regressiyalar, disposable PostgreSQL va Chromium tekshiruvlari bajarildi. Quyida qolgan **lokal implementatsiya ishlari** ham ochiq ko‘rsatilgan. Ular tashqi blocker deb yashirilmaydi.

Push, merge, deploy, production SQL, haqiqiy to‘lov va Telegram yuborish bajarilmadi. Lokal test natijasi — GitHub CI green yoki production readiness degani emas. Tarixiy `28P01` autentifikatsiya xatosi strukturaviy schema xatosi emas; yangi live tekshiruv o‘tkazilmadi.

## Nima haqiqatan o‘zgardi

- **Amaldagi render:** `HomeClient → Navbar / GroupedDock + JourneyControlCenter`. Demo yoki parallel replacement sahifa yaratilmagan.
- Sidebar o‘rniga mavjud nav registrlaridan yettita ildiz hosil qilinadi: Dashboard, Explore, My Plan, Applications, After Admission, Help & Learning, Account & Settings. Foydalanuvchi ko‘rishi mumkin bo‘lgan destinationlar va admin/Premium yo‘llari saqlangan.
- Dashboard: haqiqiy profil ismi, keyingi amal, qayd etilgan ma’lumotlar checklisti, uchta tezkor kirish; eski batafsil journey disclosure ichida, streak va qolgan modullar quyi oqimda saqlangan. Rasm namunasidagi ism, sanalar va foizlar ko‘chirilmagan.
- Desktop kontent eni nolga tushgan haqiqiy flex-layout xatosi browser testi orqali topildi va tuzatildi. Desktop hamburger drawer ham ochiladi.
- Dock: bir paytda bitta disclosure, Escape/fokus qaytarish, portalga Tab/Shift+Tab ko‘prigi, tashqariga bosishda yopilish; mobil More mavjud drawer’ni ochadi. Kontent kartalari opaque; dock alohida translucent sirt.
- Tuition-only yordam living xarajatini yopmaydi. Restricted yordam oldin, unrestricted yordam faqat qolgan xarajatga ajratiladi; bir xarajat ikki marta qoplanmaydi.
- Saved/applied award tasdiqlangan net xarajatni kamaytirmaydi. `confirmedAnnualUsd`, `conditionalAnnualUsd`, optimistik `bestCaseAnnualUsd` farqlanadi. Oylik yordam uchun aniq payment months kerak; ko‘p yillik yordamda funding duration talab qilinadi. Zero va null ajratiladi.
- GPA shkalasiz yoki shkaladan yuqori bo‘lsa unknown; original profil qiymati o‘zgartirilmaydi. Proportsional konversiya rasmiy universitet konversiya qoidasi sifatida taqdim etilmaydi.
- Default dashboard’dagi 55/45 QS-positioning aralash reyting va recommendation javobidagi sintetik cohort/GPA positioning chiqarildi. Chancing’ning mavjud alohida yo‘li o‘chirilmagan; shaxsiy qabul ehtimoli mavjud emas.
- Rasmiy sahifada HTTP 200 yoki alohida “IELTS 7.0” uchrashi yetarli emas. Negation/recommended/waiver, noto‘g‘ri scope, substring va noaniq extractor tasdiqlashga aylanmaydi.
- Refresh endi butun universitet/stipendiyani emas, aynan `fact_id + field + source + cycle + programme + degree + value` mos faktni yangilaydi.
- Source navbati SQL’da scope bilan cheklanadi, oldin tekshirilmagan/eng eski tekshirilgan faktlar oldinga chiqadi, tiebreak barqaror, programme faktlari ham kiradi; bir URL bir batch ichida qayta-qayta fetch qilinmaydi.
- Typed facts batch loader va scope resolver real recommendation API talablariga ulandi. Official publisher tasdig‘i yo‘q fakt avtomatik official minimumga aylanmaydi. University/scholarship API’lari typed presentationni ham qaytaradi.
- Cache: birinchi revision bump 1→2; dashboard kaliti profil/catalogue/evidence/application/document revisionlarini oladi. Profile-match cache ham revisionli kalitga o‘tdi; application va saved-program yozuvlaridan keyin invalidation qo‘shildi.
- Vault: POST/PATCH va link yozuvlari bitta transaction; barcha bog‘lanayotgan arizalar ownership tekshiruvidan oldindan o‘tadi. PATCH document row lock ishlatadi. File metadata Premium tekshiruvidan o‘tadi; kontent o‘zgarishi review’ni bekor qiladi. Revision commitdan keyin ko‘tariladi.
- Student `verified` da’vosi `self_confirmed`; platform review metadata hash + reviewer identity bilan bog‘lanadi. Expiry ustun turadi; vault summary va dashboard readiness effective statusni ishlatadi. Review schema yo‘q paytdagi admin review yozuvi 503 va rollback bilan tugaydi.
- Durable worker nomidan alohida **har claim uchun nonce token** oladi. Eskirgan token status/item/heartbeat’ni yangilay olmaydi, hatto worker nomi qayta ishlatilsa ham. Checkpoint claim attemptsni kamaytira olmaydi.

### Tez ochiladigan dalillar

[Dashboard — UZ, dark](redesign/master-2026-11-07/dashboard-first-uz.png) · [Scroll](redesign/master-2026-11-07/dashboard-scroll-uz.png) · [Dock popover](redesign/master-2026-11-07/dock-plan-uz.png) · [Mobil](redesign/master-2026-11-07/dashboard-mobile-uz.png) · [Mobil sheet](redesign/master-2026-11-07/mobile-sheet-uz.png) · [Light](redesign/master-2026-11-07/dashboard-light.png) · [Error/retry](redesign/master-2026-11-07/dashboard-error.png) · [Universitetlar](redesign/master-2026-11-07/universities.png) · [Stipendiyalar](redesign/master-2026-11-07/scholarships.png) · [Evidence JSON](redesign/master-2026-11-07/evidence.json)

## A01–A26 ishchi qabul jadvali

“Lokal dalil bor” faqat shu qatordagi tor tuzatishni bildiradi; kengroq qabul talabi uchun ko‘rsatilgan qolgan ish yopilishi kerak.

| Band | Holat | Dalil / qolgan ish |
|---|---|---|
| A01 — CI/design gate | Lokal dalil bor | `audit:ui`, `test:design-system`, `test:build-gates`; yangi regressiya va DB testi CI/local runnerga qo‘shilgan. Remote CI qayta ishga tushirilmagan. |
| A02 — 28P01 tasnifi | Qisman | Schema checker auth xatosida structural natija bermaydi, auth xatosi TLS retry bilan niqoblanmaydi; raw connection error/URL chiqarilmaydi. Live credential tekshiruvi yo‘q. |
| A03 — amaldagi dashboard | Qisman | Real HomeClient render va first/scroll/light/mobile screenshotlar. Approved konsept bilan pixel-level tenglik yoki to‘liq UX acceptance da’vosi yo‘q. |
| A04 — tuition cap | Lokal dalil bor | Canonical allocator, tartibdan mustaqillik va duplicate allocation regressiyalari. Barcha finance UI consumerlari bo‘yicha bir xil ssenariy taqdimoti hali to‘liq emas. |
| A05 — false official IELTS | Lokal dalil bor | `test:master-regressions`, `test:official-source-adapter`; explicit minimum, negation/recommended va numeric substring holatlari. |
| A06 — field ≠ entity verification | Lokal dalil bor | `refresh.ts` exact fact update; regressiya blanket entity update’ni rad etadi. To‘liq refresh mutation runtime matriksi hali yetishmaydi. |
| A07 — cross-instance cache | Qisman | Revisionli real consumer kalitlari; application/saved-program invalidation. Barcha eski mutation yo‘llari va barcha cache consumerlarining race matriksi hali to‘liq emas. |
| A08 — birinchi bump | Lokal dalil bor | Haqiqiy disposable PostgreSQL: ikki store, 1→2, parallel 3/4, boshqa profil izolatsiyasi. |
| A09 — unknown-neutral score | Qisman | Known GPA yoniga unknown IELTS qo‘shilishi score’ni tushirmaydi; 99 match regressiyasi. Umumiy to‘rt-o‘lchamli programme tavsiya tizimi bo‘yicha qabul to‘liq emas. |
| A10 — requirement groups/cycles | Qisman | Explicit English OR/AND, unknown operator va exact academic-year regressiyalari. Umumiy nested requirement DSL, admin authoring va barcha alternative guruhlar hali yo‘q. |
| A11 — TOEFL shkala | Qisman | 120 va 6 bir-biriga aylantirilmaydi; explicit mos shkala bo‘lmasa unknown. Profil/UI/storage bo‘ylab yangi shkala capture hali to‘liq emas. |
| A12 — GPA | Lokal dalil bor | Missing scale, above-scale, negative, explicit zero; original qiymat o‘zgarmaydi. |
| A13 — sintetik default rank | Lokal dalil bor | Dashboard fit-only; programme response’da synthetic positioning o‘rniga explicit unknown state. Alohida chancing saqlangan. |
| A14 — finance provenance | Qisman | Confirmed/conditional/optimistic, payment months, duration, currency unknown qoidalari. FX sana/manba va inclusions barcha UI’larda yagona envelope orqali hali o‘tmaydi. |
| A15 — typed facts real consumerlar | Qisman | Batch API, real programme eligibility inputi, publisher/scope regressiyalari. Student catalogue UI, dashboard, admin, finance va Telegramning barchasi bir resolverga hali o‘tmagan. |
| A16 — scope/conflict/official priority | Qisman | Pure resolverda mos programme/degree/cycle/unit/applicant scope, peer conflict→unknown va official priority. Applicant scope’ning DB/admin capture’i va hamma consumerlar qamrovi qolgan. |
| A17 — source tie | Qisman | Same-date/undated tiebreak; scope/official preference pickerda bor. Barcha callerlar scope metadata yetkazishi va invalid-date matriksi hali yakunlanmagan. |
| A18 — vault atomicity/entitlement | Qisman | Browser’da ownership, invalid application link rollback, unsafe URL, self-claim/expiry; transaction va file metadata gate. Free/Premium/concurrent barcha variantlar browser/runtime matriksi hali to‘liq emas. |
| A19 — reviewer provenance | Qisman | Additive private review table, hash identity, reviewer id, invalidation. Admin-review/browser barcha edit variantlari hali qamralmagan. |
| A20 — effective status | Qisman | Vault row/summary va dashboard bir helperdan foydalanadi. Workspace/export/Telegram kabi qolgan sirtlar bo‘yicha to‘liq convergence tekshiruvi yo‘q. |
| A21 — multilingual browser | Lokal dalil bor | EN/UZ/RU dashboard, keyboard disclosure, desktop drawer, mobile sheet, light catalogue capture. Barcha destinationlarning tarjima/fokus acceptance matriksi emas. |
| A22 — yetti ildiz dock | Lokal dalil bor | Mavjud registrlardan hosil bo‘ladi; desktop 7 root, mobile compact + More. Baseline nav identifierlari saqlangan. |
| A23 — ownership/fokus/error evidence | Qisman | Real vault ownership/rollback va dock fokus dalili bor. Error → retry recovery ham 6-testda o‘tgan va screenshot bor. Kengroq barcha action matriksi hali to‘liq emas. |
| A24 — durable fencing | Qisman | Real PG: stale/reused worker nonce, expired heartbeat, retry-budget guard. **Catalogue/audit persistence va eski unclaimed item yo‘llari bo‘ylab end-to-end fencing hali to‘liq emas.** |
| A25 — deterministic programme batch | Lokal dalil bor | Real PG >200 facts: scope starvation yo‘q, unseen faktlar keyingi batchga o‘tadi, programme kiradi, source publisher query ishlaydi. Production query plan/latency hali o‘lchanmagan. |
| A26 — funding association | Qisman | Same destination yolg‘iz o‘zi funding match emas; citizenship/institution/cycle va typed criteria talab qilinadi. Global/programmaga xos award scope, citizenship UI capture va to‘liq unknown-reason UI hali tugamagan. |

## Fazalar 0–11: yakunlangan deb belgilanmagan ishlar

| Faza | Ishchi holat |
|---|---|
| 0 | Exact base va immutable feature baseline qayd etilgan; boshlang‘ich build/before screenshotlar saqlangan. |
| 1 | UI/design gate lokal o‘tgan; remote CI dalili yo‘q. |
| 2 | Actual shell/dock ishlaydi; approved konsept bo‘yicha to‘liq vizual acceptance qisman. |
| 3 | Actual dashboard qayta joylashtirilgan; eski journey va actions saqlangan. |
| 4 | Typed evidence real consumer migratsiyasi qisman. |
| 5 | Finance pure-engine tuzatishlari bor; barcha presentation/provenance consumerlari qisman. |
| 6 | Requirement/cycle/TOEFL qoidalari qisman; umumiy DSL va UI capture qolgan. |
| 7 | Ranking/funding xavfli inference kamaytirilgan; programme-inclusive to‘rt dimension convergence qisman. |
| 8 | Revision cache va vault tuzatishlari bor; barcha mutation/concurrency matriksi qisman. |
| 9 | Worker nonce runtime dalili bor; barcha persistence yo‘llarida fencing tugamagan. |
| 10 | Additive SQL disposable PG’da tekshirilgan; productionga tatbiq qilinmagan. |
| 11 | Lokal release evidence paketi bor; umumiy qabul va reliz **yopilmagan**. |

## Render / fayl xaritasi

| Sirt | Amaldagi fayl |
|---|---|
| Shell, routing va profile isolation | `src/app/HomeClient.tsx` |
| Top bar, visibility, eski drawer/search/settings | `src/components/Navbar.tsx` |
| Grouped disclosure/fokus | `src/components/GroupedDock.tsx` |
| Dashboard overview va saqlangan journey | `src/components/journey/JourneyControlCenter.tsx` |
| Tokens/safe-area/dock paint | `src/app/globals.css` |
| Rasmiy minimum/trust/presentation | `typedEvidence.ts`, `evidencePolicy.ts`, `factResolver.ts`, `catalogueFacts.server.ts` |
| Eligibility va funding | `recommend.ts`, `api/programs/recommend/route.ts` |
| Finance | `financeModel.ts`, `costs.ts`, `budgetFit.ts` |
| Cache | `cacheRevision.ts`, `dashboardRecommendationCache.ts`, `catalogCache.ts` |
| Exact source refresh | `officialSourceAdapter*.ts`, `refresh.ts` |
| Vault/review | `documentStatus.ts`, `documentReviews.server.ts`, `api/vault/documents/route.ts` |
| Worker capability | `research-agent/durableStore.ts`, `worker.ts` |

## Old → new, funksiyalarni saqlash dalili

- Sidebar/tablet rail/mobile navigation → registry-based dock + saqlangan drawer/search. Nav identifier/alias va utility destinations olib tashlanmagan.
- Katta journey hero → birinchi actionable overview + ochiladigan eski journey. Keyingi vazifalar, deadlines, applications, readiness, tavsiyalar va study-plan renderlari qolgan.
- Oldingi saved-award net inference → confirmed net va alohida conditional/optimistic yordam.
- Blanket entity verification → exact fact verification.
- Worker label capability → claim-specific nonce capability.
- Feature-inventory baseline **qayta yozilmadi**: 13 page, 290 API route/method, 50 nav section, 26 admin tab, 3 locale, 3 theme va 85 query parameter saqlangan. Bu identifier-preservation dalili, barcha actionlarning runtime proof’i emas.

## Screenshotlar

Haqiqiy Chromium/disposable fixture capturelar `test-results/master-2026-11-07/after/` ichida. Ko‘rib chiqish uchun nusxalar `docs/redesign/master-2026-11-07/` ichida:

- `dashboard-first-{en,uz,ru}.png`
- `dashboard-scroll-{en,uz,ru}.png`
- `dock-plan-{en,uz,ru}.png`
- `dashboard-mobile-{en,uz,ru}.png`
- `mobile-sheet-{en,uz,ru}.png`
- `dashboard-light.png`, `dashboard-error.png`, `universities.png`, `scholarships.png`

Fixture ismi va sanalari test ma’lumoti; ular real student yoki catalogue verification dalili emas. Before screenshotlar alohida immutable `before/` katalogida saqlangan.

## Tekshiruvlar va o‘lchovlar

Aniq command/resultlar uchun `test-results/master-2026-11-07/release-candidate.log`, `browser-final.log`, alohida nomlangan suite loglari va `FINAL_EVIDENCE.json`ga qarang. Oldingi muvaffaqiyatsiz runlar ham saqlangan; ularni keyingi natijalar bilan adashtirmang.

Lokal o‘tgan asosiy tekshiruvlar: typecheck, i18n, UI audit, lint baseline (0 error/0 warning), master regressions (26), costs (71), unified finance (16), cache revision (20), official adapter (38), typed evidence (17), match (99), recommend engine/API (91), research runtime (16), evidence render (17), observability (8), feature preservation, build va static perf.

Yakuniy browser acceptance: **6 passed / 0 failed**, production-mode lokal build + disposable PostgreSQL, 19 screenshot. `browser-acceptance.log` so‘nggi natija; `release-candidate.log`dagi oldingi browser FAIL keyingi qayta tekshiruv bilan tuzatilgan.

Browser birinchi passida layout xatosi, keyingi passida haddan keng `header` locator topildi. Layout kodda tuzatildi, test selector faqat dashboardning bevosita headeriga toraytirildi; assertion olib tashlanmadi.

Bundle-size va browser lab natijalari yakuniy evidence JSONda beriladi. Uncompressed JS — gzip/Brotli transfer hajmi emas. Browser-driven click-to-visible — field INP emas. Lokal disposable ikki-universitet fixture — production catalogue yuklamasi emas. Birinchi bosqichdagi uch tashqi GETning taxminan 6 soniyasi TTFB/LCP sifatida ishlatilmaydi. Baseline lab bo‘lmasa, after lab’dan yaxshilanish foizi hisoblanmaydi.

### O‘lchangan qiymatlar (2026-11-07)

| O‘lchov | Before | After |
|---|---:|---:|
| `/` first-load uncompressed JS | 1,292,254 byte | 1,291,221 byte (−1,033) |
| `/universities/[id]` first-load uncompressed JS | 1,062,415 byte | 1,062,743 byte (+328) |

Bu kichik bundle farqi; katta performance yutug‘i deb talqin qilinmaydi.

After-only browser lab, har bir profilda 3 cold-browser-cache run mediani:

| Metrika | Desktop | Mobile |
|---|---:|---:|
| Landing navigation TTFB | 46.4 ms | 34.8 ms |
| Landing LCP | 396 ms | 1,196 ms |
| Landing CLS, 4s kuzatuv | 0 | 0 |
| 4s blocking-time yig‘indisi | 121 ms | 897 ms |
| Theme click → visible, synthetic | 401.5 ms | 1,368.5 ms |
| Sign-in dialog, synthetic | 1,255.6 ms | 661.8 ms |
| Sign-in shell, synthetic | 967.8 ms | 1,238.1 ms |

Manba: `test-results/performance/after-{desktop,mobile}.json`; 2 benchmark test o‘tgan. Bu dashboard LCP yoki production field metrikasi emas: boshlang‘ich navigation public landingga, keyingi interactionlar real local sessionga tegishli. Mobile CDP sozlamalari: 4× CPU, 150ms RTT, 1.6Mbps; external originlar sandbox sabab bloklangan. Shu sabab rasm deliverysi va haqiqiy internet sifati baholanmagan. Before browser lab yo‘q, shuning uchun tezlashish/field Core Web Vitals da’vosi yo‘q. Synthetic mobil interactionlar 1 soniyadan oshishi ochiq qolgan optimizatsiya nuqtasi.

## Forward, recovery va release gate

**Productionda hech narsa qo‘llanmagan.** Yangi fayllar:

1. `supabase/official_source_program_checks_2026-11-07.sql`: mavjud typed-facts/checks schema ustiga programme type, UUID fact FK, scope ustunlari va due indexlar. Faqat mavjud prerequisite migration holati tekshirilgan stagingda sinash kerak.
2. `supabase/document_review_records_2026-11-07.sql`: private reviewer/hash provenance. Tarixiy self-claimlarni auto-upgrade qilmaydi.
3. `docs/operations/recovery/document_review_records_2026-11-07.sql`: **forward chain emas**; reviewlarni pauza qilish va compatible code rollbackdan keyingi grant hardening. Ma’lumot o‘chirilmaydi. Migration autodiscovery katalogidan tashqarida.

Oldingi `security_evidence_research`, corrections va follow-up SQL fayllari tahrirlanmagan; master baseline SHA256 manifesti mavjud. Ularni bu reliz uchun ko‘r-ko‘rona qayta qo‘llamang. MIT/Yenching faktlari va `recommended_score` follow-upini operator faqat read-only staging/live inspection bilan tekshirishi kerak; bu turn production inspection bajarmadi.

Env: yangi secret talab qilinmaydi. Mavjud `DATABASE_URL`, `SESSION_SECRET` va faqat operator yoqqanda `RESEARCH_DURABLE_STORE=1` ishlatiladi. Schema yo‘q holatdagi non-shared cache fallback cross-instance guarantee emas. Credential xatosi bo‘lsa intended project/env connection secretni credential managerda tekshirish kerak — chatga yuborilmaydi.

**Relizdan oldin:** yuqoridagi qisman A-bandlar, barcha persistence fencing, to‘liq typed-fact UI/algorithm convergence, funding scope/UI, free/Premium/admin concurrency matriksi, authenticated staging smoke, to‘liq lokal validation va yangi CI run yopilishi kerak. Backup, migration apply/recovery drill va alohida push/deploy/SQL ruxsati zarur. Ushbu hujjat ularning o‘rnini bosmaydi.
