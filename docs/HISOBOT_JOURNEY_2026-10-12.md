# Yakuniy hisobot — Full Product Journey Expansion (2026-10-12)

**Branch:** `arena/b0c4fde9-scholarbridgeai` (branched from `main`@`e533200`)
**Sana:** 2026-10-12 · **Ish turi:** mavjud mahsulotni audit qilish → yetishmayotgan journey bosqichlarini implementatsiya qilish → regression testlar bilan isbotlash.
**Asosiy qoida:** extend, do not duplicate — mavjud funksiyalar qayta yaratilmadi, parallel tizim qurilmadi.

---

## A. Dastlabki audit

Audit hujjatlar (`docs/JOURNEY_CORE.md`, `docs/AUDIT_FUNCTIONAL_2026-10-07.md`, `docs/AUDIT_SECURITY_2026-10-07.md`, `docs/REPORT_2026-10.md`, `docs/PRODUCT_POLICIES.md`, `docs/RELEASE_GATE.md`, `docs/HANDOVER.md`) **kod bilan solishtirib** tekshirildi. Quyidagi xulosalar faqat kod, test yoki runtime dalili bilan tasdiqlangan.

### A.1 Avvaldan mavjud va to‘liq ishlayotgan modullar (`PASS`)

| Modul | Dalil (fayl / test) |
|---|---|
| Autentifikatsiya, session, profil egaligi | `src/lib/auth.ts` (`requireProfileAccess`, `requireRowAccess`), `test:security` (76 assertions), `test:api-security` (242 handler anonim tekshiruv) |
| Universitet Explorer + dasturlar + matching | `UniversityExplorer.tsx`, `/api/universities`, `src/lib/matching.ts`, `test:match` 74/0 |
| Grant hubi, matching, autopilot, deadline markazi | `ScholarshipHub.tsx`, `/api/scholarships`, `/api/deadlines`, `test:journey` 91 assertions |
| Dastur tavsiya mexanizmi (4 o‘lchov, probability emas) | `src/lib/recommend.ts`, `/api/programs/recommend`, `RecommendationStudio.tsx`, `test:recommend` 81/0 |
| Study-interest taksonomiyasi (20 soha, 145 mutaxassislik) | `src/lib/studyInterests.ts`, `test:study-interests` 35/0 |
| Task / roadmap / nextActions / reverse planning | `src/lib/nextActions.ts`, `src/lib/journey/planning.ts`, `test:roadmap` 61/0 |
| Application workspace, requirements, document vault, essay/SOP, tavsiyanomalar | `ApplicationWorkspacePanel.tsx`, `PreparePanels.tsx`, `test:documents` 35/0, `test:essays` 36/0 |
| Offer & decisions, funding plan, cost calculator | `AfterAdmissionPanels.tsx` (`OffersPanel`, `FinancialPlanPanel`), `src/lib/costs.ts`, `test:costs` 44/0, `test:compare` 43/0 |
| Viza markazi, VisaSpeakingAssistant, departure checklist | `ExplorePanels.tsx` (`VisaCenterPanel`), `VisaSpeakingAssistant.tsx`, `growth/DepartureChecklist.tsx`, `test:visa` 80/0 |
| AI Advisor (offline halol rejim, quota, provider fallback) | `src/lib/advisor.ts`, `/api/ai/chat`, `test:integration` 246/0 |
| Admin panel + katalog CRUD + audit log | `AdminPanel.tsx`, `/api/admin/*`, `test:ownership` 83/0 |
| next-intl en/uz/ru | `check:i18n` — 2788 kalit (audit paytida), paritet to‘liq |
| Telegram, Premium, payments, provenance | `test:telegram` 27/0, `test:payments` 82/0, `test:provenance` (32 ok) |

### A.2 Qisman ishlayotgan modullar (`PARTIAL`)

| Modul | Aniqlangan muammo | Ta’sir |
|---|---|---|
| Onboarding | Chiziqli 8 qadamli wizard bor edi (`OnboardingWizard.tsx`), `StudyInterestPicker` ichida `exploring` tanlovi bor edi — lekin **uchta teng tanlov** (“kasb maqsadim bor” / “qiziqishlarim bor” / “hali bilmayman”) yo‘q edi | “Hali bilmayman” foydalanuvchisi o‘zini yo‘nalishsiz his qilar edi |
| Career Explorer | `CAREER_PATHS` faqat 8 yo‘nalish (IT, biznes, muhandislik, tibbiyot, huquq, dizayn, humanities) — ekologiya, qishloq xo‘jaligi, media, psixologiya, matematika, tabiiy fanlar, logistika, energetika, turizm yo‘q edi (`src/lib/journey/careers.ts`) | Foydalanuvchi qiziqishi katalogda aks etmasdi |
| Katalog kontenti | Kasblarda kundalik vazifa, ko‘nikma, fan va amaliy sinov yo‘q edi | Kasbni “amalda sinab ko‘rish” bosqichi mavjud emas edi |

### A.3 Umuman yo‘q imkoniyatlar (`MISSING`)

| Talab | Holat |
|---|---|
| Qiziqish savollari → 3–5 tushuntirilgan kasb tavsiyasi (career discovery) | `MISSING` — `RecommendationStudio` dastur darajasida ishlaydi, kasb discovery quiz emas |
| Amaliy sinovlar (mini-loyiha) + “yoqdi / yoqmadi / yana o‘rganaman” feedback | `MISSING` |
| Qabuldan keyin 7/30/90 kunlik moslashuv rejasi | `MISSING` (`DepartureChecklist` jo‘nab ketishgacha to‘xtaydi) |
| Birinchi o‘quv yili boshqaruvi (semestr, grantni yangilash, viza muddati, amaliyot, CV) | `MISSING` |

### A.4 Qayta tekshirilganda aniqlangan texnik muammo

* DDL-da `arrival_checklist_items.window` ustuni PostgreSQL’da **reserved so‘z** (`42601 syntax error`) — runtime tekshiruvda aniqlandi va `item_window` deb xavfsiz o‘zgartirildi (yangi jadval, hech qanday ma’lumot yo‘qolmadi).
* Audit hujjatlaridagi ba’zi hisoblar (masalan, `check:i18n` kalitlari soni) koddan orqada edi — hisobotda faqat shu kundagi real natijalar keltirilgan.

---

## B. Implementatsiya

### B.1 Yangi imkoniyatlar

**1. Career Discovery — “Hali bilmayman” oqimi (mahsulot journey §4)**

* `src/lib/careerDiscovery.ts` (635 qator, **sof deterministik dvigatel** — AI, tarmoq, DB yo‘q):
  * 11 ta bosqichma-bosqich savol (yoqtirgan/yoqtirmagan fanlar, faoliyatlar, kuchli tomonlar, o‘rganiladigan ko‘nikmalar, odam↔texnika, data↔ijod, tabiat, tadqiqot↔amaliyot, ish muhiti, qadriyatlar). Har bir savol **o‘tkazib yuboriladigan** — javob bermaslik hech qachon salbiy ball bermaydi (`unknowns` sifatida ko‘rsatiladi).
  * 17 ta kasb uchun `CAREER_AFFINITY` (javob teglari → vazn). Natija: **3–5 ta kasb**, har birida: moslik darajasi (`strong/moderate/weak`), **qaysi javoblar ta’sir qilgani** (`reasons`), mos keladigan qiziqish va ko‘nikmalar, kundalik vazifalar, bog‘liq mutaxassisliklar, **muqobil yo‘llar** (boshqa klasterdan), noma’lum ma’lumotlar, amaliy sinov, trial feedback ta’siri (`trialAdjustment`).
  * “Bu IQ testi yoki psixologik tashxis emas” — `disclaimer: "not-a-diagnosis"` doimiy shart sifatida.
  * <3 savolga javob bo‘lsa — **insonobad yo‘nalish**: bo‘sh reyting uydirilmaydi (`insufficientData`).
  * Trial feedback: `liked` / `disliked` / `explore_more` — sinovni o‘tkazib yuborish **hech qanday ta’sir qilmaydi**; `disliked` pasaytiradi, lekin kuchli mos kasbni ro‘yxatdan butunlay o‘chirmaydi.
* `src/app/api/career-discovery/route.ts` — GET/POST/DELETE, `guardStudent` (o‘z profili), qat’iy validatsiya (noma’lum savol/javob/kasb → 400), qisman yangilash (faqat `trialFeedback` yuborilsa javoblar o‘chirilmaydi), natija serverda qayta hisoblanadi va `career_discoveries` jadvaliga saqlanadi.
* `src/components/journey/CareerDiscoveryFlow.tsx` — bitta komponent, **ikkita joyda** (parallel tizim emas):
  * Onboarding, `mode="onboarding"` (ixcham);
  * Universitetlar → “Careers & majors” paneli, `mode="panel"` — katalog bilan bitta panelda `Find my direction / Browse career catalog` rejimlari; tanlangan kasb to‘g‘ri mavjud katalog eksploreriga o‘tadi.

**2. Onboarding — uchta teng tanlov (§4.1)**

* `OnboardingWizard.tsx` 3-qadamiga uchta **teng darajali** karta qo‘shildi: 🎯 *Kasb maqsadim bor* · 🌱 *Qiziqishlarim bor, mutaxassislikni bilmayman* · 🧭 *Hali bilmayman — yo‘nalish topishga yordam bering*.
* 1- va 2-yo‘nalish mavjud `StudyInterestPicker` orqali ishlaydi (qayta yaratilmadi). 3-yo‘nalish Career Discovery oqimini ochadi; tanlangan kasb `selectionsForCareer()` orqali **mavjud `study_interests` mapping’i** bilan to‘ldiriladi; “Hali bilmayman” varianti `exploring` seleksiyasiga (avvaldan valid) tushadi. Barcha maydonlar o‘tkazib yuboriladigan qoladi (mavjud null-never-invented siyosati saqlandi).

**3. Kasb katalogi kengaytirildi (§6.1)**

* `src/lib/journey/careers.ts` — mavjud 8 yo‘nalish **o‘zgartirilmadi** (faqat ixtiyoriy `cluster` / `trialMinutes` maydonlari qo‘shildi). 9 ta yangi yo‘nalish: environment, agriculture, media, psychology, math, science, logistics, energy, tourism. Umumiy 17 yo‘nalish, 20+ soha qamrab olindi. Har birida: kundalik vazifalar, ko‘nikmalar, muhim fanlar, bog‘liq mutaxassisliklar, davlatlar va **amaliy sinov** (maqsad, vaqt, boshlang‘ich talab, 3 qadam).

**4. Qabuldan keyingi reja — 7/30/90 kun + birinchi o‘quv yili (§14.3–14.4)**

* `src/lib/journey/arrival.ts` — sof generator: `d7` (6 ta), `d30` (6 ta), `d90` (5 ta), `year1` (8 ta) vazifalar. **Faqat umumiy yo‘riqnoma** — hech bir davlat/universitet qoidasi uydirilmagan, har bir item `guidanceOnly` badge bilan. Shartli itemlar (`requires: scholarship/visa/housing`) faqat ma’lumot mavjud bo‘lsa ko‘rinadi; noma’lum bo‘lsa “agar bu sizga tegishli bo‘lsa” matni bilan qoladi.
* Reja faqat **offer qabul qilingandan keyin** ochiladi (`admission_offers.status='accepted'`) — oldin halol “locked” holati.
* `src/app/api/journey/arrival/route.ts` — GET/POST/DELETE, `guardStudent`, item key va status serverda tekshiriladi; holat `arrival_checklist_items` da saqlanadi.
* `src/components/journey/ArrivalPlanPanel.tsx` — mavjud **Departure paneli ichida** (yangi sidebar bo‘limi qurilmadi), itemlardan tegishli modulga havolalar bilan.

### B.2 Kengaytirilgan komponentlar va API’lar

* `src/components/journey/ExplorePanels.tsx` — `CareerExplorerPanel` ga `profileId` + discovery/catalog rejimlari.
* `src/components/hubs/index.tsx` — careers pane’ga `profileId`, departure pane’ga `ArrivalPlanPanel`.
* `src/components/OnboardingWizard.tsx` — 3-tanlov bloki.

### B.3 Ma’lumotlar bazasi (faqat qo‘shimchi, backward-compatible)

* 2 ta yangi jadval (`src/lib/journey/ddl.ts` + `supabase/add_journey_core.sql` + `src/db/schema.ts` bir xil): `career_discoveries` (answers JSONB, trial_feedback, recommendations, selected_career_id) va `arrival_checklist_items` (item_key, item_window, status). Har biri `student_profiles` dan `ON DELETE CASCADE`. **Hech qanday mavjud jadval o‘zgartirilmadi yoki o‘chirilmadi.**

### B.4 Qo‘shilgan tarjimalar

* 3 ta yangi namespace: `careerDiscovery` (savol/javob/UI), `careers` (17×15 kasb kontenti), `arrival` (23 item + 4 oyna) + `journey` ga 9 yangi `careerTitle*/careerBlurb*`.
* **555 ta yangi kalit × 3 til** (en/uz/ru) — `check:i18n` 2788 → **3343 kalit**, 1838 `t()` call site to‘liq tekshirildi.

### B.5 Qo‘shilgan testlar

* `scripts/check-career-discovery.ts` — **90 assertion**: savol qamrovi, katalog qamrovi (18 soha), unknown≠negative, determinizm, sabablar real javoblarga bog‘liqligi, trial feedback matematikasi, input validatsiya, i18n paritet, static xavfsizlik (AI yo‘q, network yo‘q, probability hisoblanmaydi).
* `scripts/check-arrival.ts` — **65 assertion**: 4 oyna, lock mantig‘i, shartli filtr, validatsiya, i18n paritet, “davlat qoidasi yo‘q” static check.
* `package.json` → `test:career-discovery`, `test:arrival`; CI (`.github/workflows/ci.yml` + `ci/security-ci.yml`) ga qo‘shildi.

---

## C. Mavjud funksiyalarni saqlash

Quyidagi tayyor tizimlar **qayta yaratilmadi**, qayta ishlatildi:

| Tizim | Qanday qayta ishlatildi |
|---|---|
| `StudyInterestPicker` + `study_interests` | Onboarding 3-tanlovida 1/2-yo‘nalish; discovery natijasi `selectionsFromLegacyTargetMajor` mapping’i bilan shu formatga yoziladi |
| `CareerExplorerPanel` + `/api/universities?major=` | Discovery “tanlash” tugmasi shu katalogni ochadi — yangi explorer yaratilmadi |
| `requireProfileAccess` / `guardStudent` | Ikkala yangi API ham shu guardlardan foydalanadi (403/401 runtime tekshirildi) |
| Journey DDL bootstrap (`ensureJourneyTables`) | Yangi jadvalar shu idempotent mexanizm ichida |
| `useResource` / `journey/ui.tsx` | Yangi panellar umumiy loader, kartalar, tugmalar, Pill, ProgressBar’dan foydalanadi |
| Nav tizimi (`navSections.ts`) | Yangi sidebar bo‘limi/pana qo‘shilmadi — discovery `universities/careers`, arrival `visa/departure` ichida |
| Task/roadmap/deadline, vault, essay, offers, funding, visa, departure | O‘zgarmagan — yangi bosqichlar shu modullarga link beradi |
| AI qatlami, quota, rate-limit | O‘zgarmagan — yangi hisoblash AI’siz, deterministik |

---

## D. Test natijalari

### D.1 Avtomatik testlar (hammasi shu kunda ishga tushirildi)

| Buyruq | Natija | Tafsilot |
|---|---|---|
| `npm run typecheck` | **PASS** | 0 xato |
| `npm run check:i18n` | **PASS** | 3343 kalit, en/uz/ru paritet, 1838 call site |
| `npm run lint:baseline` | **PASS** | yangi muammo yo‘q; 50 ta avvaldan mavjud baseline’da (`docs/LINT.md`) |
| `npm run test:career-discovery` | **PASS** | 90 / 0 |
| `npm run test:arrival` | **PASS** | 65 / 0 |
| `npm run test:journey` | **PASS** | 91 assertions |
| `npm run test:study-interests` | **PASS** | 35 / 0 |
| `npm run test:match` | **PASS** | 74 / 0 |
| `npm run test:chancing` | **PASS** | 64 / 0 |
| `npm run test:recommend` | **PASS** | 81 / 0 |
| `npm run test:roadmap` | **PASS** | 61 / 0 |
| `npm run test:documents` | **PASS** | 35 / 0 |
| `npm run test:essays` | **PASS** | 36 / 0 |
| `npm run test:costs` | **PASS** | 44 / 0 |
| `npm run test:compare` | **PASS** | 43 / 0 |
| `npm run test:visa` | **PASS** | 80 / 0 |
| `npm run test:integration` | **PASS** | 246 / 0 |
| `npm run test:security` | **PASS** | 76 assertions |
| `npm run test:api-security` | **PASS** | 242 handler / 133 route — anonim kirish 401/403; “temporarily unavailable” 503 yo‘q |
| `npm run test:provenance` | **PASS** | 32 ok (DB talab qiladi — `DATABASE_URL` bilan) |
| `npm run test:telegram` | **PASS** | 27 / 0 |
| `npm run test:ownership` | **PASS** | 83 / 0 |
| `npm run test:payments` | **PASS** | 82 / 0 |
| `npm run test:growth` | **PASS** | 33 assertions |
| `npm run build` (DATABASE_URL bilan) | **PASS** | barcha sahifalar/131+ route kompilyatsiya qilindi |

**Baseline holatlar:** `lint:baseline` dagi 50 ta eski lint muammosi avvaldan mavjud va o‘zgartirilmagan. `test:provenance` va `test:api-security` tashqi muhit talab qiladi (DB + dev server) — ular alohida ishga tushirilib, natija yuqorida.

### D.2 Runtime dalillari (haqiqiy stack: embedded PostgreSQL :5433 + `next dev` :3000)

| Tekshiruv | Natija |
|---|---|
| Journey A — “hali bilmayman”: 6 ta savolga javob → 5 ta tavsiya (health 35 ball, 8 sabab) | ✓ |
| Natija GET orqali qayta yuklanadi (persist) | ✓ |
| Trial feedback (`disliked`) → qayta hisob, `trialAdjustment` ochiq ko‘rsatiladi | ✓ |
| `selectedCareerId` saqlanadi | ✓ |
| Bob Alice’ning discovery’sini o‘qimoqchi → **403** | ✓ |
| Noma’lum savol / noma’lum kasb → **400** | ✓ |
| Arrival: offer qabul qilinmagani uchun `unlocked: false` | ✓ |
| Item belgilash → GET da `done` + `completedAt` | ✓ |
| Bob Alice’ning itemini belgilamoqchi → **403**; noma’lum key → **400** | ✓ |
| Anonim → **401** | ✓ |
| Onboarding orqali `studyInterests` → `targetMajor: Medicine` saqlanadi | ✓ |
| DDL kashfiyoti: `window` reserved so‘z xatosi aniqlab tuzatildi, bootstrap `journey true` | ✓ |

---

## E. Qolgan cheklovlar

1. **Tashqi integratsiyalar yo‘q** — real universitet portallari, grant tashkilotlari, viza idoralari bilan API integratsiyasi mavjud emas; ariza statuslari foydalanuvchi qo‘lda kiritadi (avvaldagidek, “avtomatik tekshirilayotgandek” ko‘rsatilmaydi). Bu — `UNKNOWN/cheklov` sifatida qoladi.
2. **AI yordamchi yangi quizga ulanmagan** — career discovery qasddan deterministik (halol, bashoratsiz). AI Advisor mavjud bo‘limda o‘z ishini davom ettiradi; discovery natijalarini AI bilan boyitish keyingi qadam.
3. **Admin katalogni boshqarish** — yangi 9 kasb koddagi statik katalogda; admin UI orqali tahrirlash (`verification_status`, manba) hali ulanmagan. Katalog `needs_verification` siyosati bilan ishlash uchun admin CRUD keyingi vazifa.
4. **Mentor bilan bog‘lanish / kurs havolalari** trial kartasida faqat matnli yo‘riqnoma sifatida — real mentor/kurs katalogiga ulanmagan (mavjud `MentorMarketplace` alohida ishlaydi).
5. **7/30/90 reja davlatga xos emas** — qasddan umumiy; rasmiy manbalar bilan tasdiqlangan davlat qoidalari admin tomonidan keyin qo‘shilishi kerak.
6. **Profil to‘liqligi scoring’ga ta’siri** — yangi modullar noma’lum qiymatni hech qachon 0/false deb hisoblamaydi; lekin mavjud matching’ning IELTS-missing qoidasi (dokumentatsiyalangan, `check-match.ts:114`) o‘z holicha qoldi.
7. **`db:push` / full_schema.sql** — yangi jadvalar drizzle schema va journey DDL da bir xil; markaziy `supabase/full_schema.sql` regeneratsiyasi (`npm run db:gen:full-schema`) deploy operatsiyasi sifatida qoldirildi (avtomatik destructive o‘zgarish taqiqlangan).

---

## F. Yakuniy xulosa

* **To‘liq qanoatlantirildi:** “hali bilmayman” onboarding oqimi; 3–5 ta tushuntirilgan kasb tavsiyasi; tavsiyalarni tahrirlash/qayta baholash; amaliy sinov + feedback; kasb → mutaxassislik → dastur → universitet bog‘lanishi (mavjud matching bilan); katalog 20+ sohani qamradi; manba/status matnlari va “noma’lum” halolligi; 7/30/90 kun + birinchi yil rejasi; en/uz/ru to‘liq paritet; typecheck, lint gate va build PASS; yangi xavfsizlik regressiyasi yo‘q (Journey F: 403/400/401 runtime isbotlandi).
* **Qisman bajarildi:** admin verification workflow’i katalog uchun hali UI’siz; AI Advisor discovery’ga ulanmagan; mentor/kurs real katalogi trial’da yo‘q.
* **Bajarilmagan (asosli sabab bilan):** real universitet/grant/viza integratsiyalari — tashqi xizmat kalitlari va rasmiy shartnomalarsiz ularni “tayyor” deb ko‘rsatish yolg‘on bo‘lar edi.

Mahsulot prinsipi saqlandi: **platforma foydalanuvchidan boshidan hamma narsani bilishni talab qilmaydi** — u endi yo‘nalishni aniqlash, variantlarni sinab ko‘rish va keyingi bosqichga (universitet → grant → ariza → offer → viza → jo‘nab ketish → birinchi yil) izchil o‘tishda real ma’lumot va mavjud API’lar bilan hamrohlik qiladi. Texnik prinsip ham saqlandi: **mavjud ScholarBridgeAi kengaytirildi, qayta yaratilmadi**.
