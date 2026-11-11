# Yakuniy hisobot — qabul “ehtimoli” foizlarini yagona baholashga almashtirish

**Sana:** 2026-11-11 · **Branch:** `arena/11d25474-scholarbridgeai` (base `9039fce`)
**PR:** https://github.com/Hushnudbek-s-organisation/ScholarBridgeAi/pull/135 — **OPEN, merge qilinmagan**
**Ilova deploy:** **qilinmagan**. **Production migratsiya:** **qo‘llangan** (quyida dalil).

Commitlar (base → bosh):

| # | Commit | Nima |
|---|---|---|
| 1 | `3388448` | Canonical `src/lib/assessment/*`; composite chancing hamma route/ekrandan chiqarildi |
| 2 | `0f56e11` | RecommendationStudio, terminologiya, legacy cleanup, visa matni, migratsiya dalili, CI step |
| 3 | `e789381` | Har bir e’lon qilingan statistika `EvidenceNote` bilan; `docs/SUPABASE_SCHEMA.md` ustuni |
| 4 | `475947f` | `outlook` pane nomi uchala tilda baholashga o‘girildi |
| 5 | `8d7da88` | Landing HUD/nav’dagi oxirgi “chancing” yorliqlari + hisobot raqamlari |
| 6 | `048a7d7` | uz/ru pane yorlig‘i va izohi (`hubs.outlookExplain` joyiga ko‘chirildi) |
| 7 | `14cf241` | Ikki e2e kontrakti `chanceScore` o‘rniga yangi invariantni tekshiradi |

---

## 1. Oltita band bo‘yicha holat

| # | Band | Holat | Dalil / cheklov |
|---|---|---|---|
| 1 | Modeldan chiqarilgan qabul “ehtimoli” foizlarini **bitta canonical baholash** bilan almashtirish | **bajarildi** | `src/lib/assessment/*` (8 modul + README), `SCORING_VERSION = programme-assessment-2026-11-11.1`, vaznlar 60/15/15/5/5. `admissionProbability` **har doim** `{value:null, reason:"no_validated_model"}`. `compositeProgramFitScore`, `effectiveProgramAcceptRatePct`, `cohortPositionTier`, `selectivityCategory`, `studentGpaPercentile` — route va UI’dan butunlay olib tashlandi (`test:assessment`, `test:admission-probability`, `test:differentiators` bilan qo‘riqlanadi). Fit interval: `79/100`, `85–100/100` + qamrov 85%. |
| 2 | **RecommendationStudio** ni to‘liq baholashga o‘tkazish | **bajarildi** | `r.positioning` (QS rank + modellashtirilgan accept rate + GPA band) o‘chirildi; karta `r.assessment` dan chiziladi. Umumiy rendererlar `src/components/AssessmentParts.tsx`. Noma’lum maydonlar `unknownFieldLabel — unknownReasonLabel` ko‘rinishida (maks. 4), tafsilot `<details>` ichida. |
| 3 | Chalkash **terminologiyani** uchala tilda tuzatish | **bajarildi** | Quyidagi 2-jadval. Pane **id** (`outlook`) va URL (`#outlook`) **o‘zgarmagan** — bookmark/deep-link buzilmagan. E’lon qilingan tarixiy accept rate (masalan “MIT 4.6%”) **tegilmagan**. |
| 4 | Ishlatilmayotgan **legacy kodni** tekshirish va olib tashlash | **bajarildi** | `src/lib/programChancing.ts` (1233 qator) **o‘chirildi**; undan kerakli yagona halol funksiya `evaluatePublishedRequirements` → `src/lib/publishedRequirements.ts`. 6 eski i18n kaliti + 69 chancing-panel kaliti × 3 til o‘chirildi. `src/lib/chancing.ts` **saqlanadi** — u hali 20+ modul tomonidan ishlatiladi (`parseListColumn`, `profileStrength`, `ADMISSION_PROBABILITY`), ya’ni “ishlatilmayotgan kod” emas. |
| 5 | Production’ga **additive migratsiya** | **bajarildi** (bir qismi tekshirilmagan — 5-bo‘lim) | `zkdguzbdopfedkffsatk`, versiya `20261111141353_add_assessment_preferences_20261111`. Faqat bitta nullable `jsonb` ustun + object-only CHECK. Backfill **yo‘q**. |
| 6 | Commit → push → PR (merge/deploy’siz) + hisobot | **bajarildi** | 7 commit push qilindi, PR #135 **OPEN**. Merge ham, ilova deploy’i ham **bajarilmagan** — bu sizning ko‘rsatmangiz bo‘yicha ataylab qilinmadi (bloklangan emas, ruxsat berilmagan). |

---

## 2. Terminologiya o‘zgarishlari (en / uz / ru)

| Joy | Avval | Endi |
|---|---|---|
| Pane `navPanes.outlook` | “Admission outlook” / “Qabul istiqboli” / “Перспектива поступления” | “Programme assessment” / “Dasturlarni baholash” / “Оценка программ” |
| `navSections.ts` pane yorlig‘i va bo‘lim tavsifi | “...see your admission outlook in context” | “...see how published requirements compare with your profile” |
| `hubs.outlookExplain` | “Admission outlook is shown next to the requirements it comes from.” | “Each programme is assessed against the requirements it publishes.” |
| Landing feature kartasi `f2Title` | “Admission outlook” | “Programme assessment” / “Dasturlarni baholash” / “Оценка программ” |
| Shortlist banner tugmasi `exCompareOutlook` | “Compare admission outlook” / “Сравнить шансы поступления” | “Compare programme assessments” / “Dastur baholashlarini solishtirish” / “Сравнить оценки программ” |
| Landing HUD so‘zi + `navChancing` + `secChancing` | `CHANCING` / `QABUL TAHLILI` / `ОЦЕНКА ШАНСОВ`, `HONEST CHANCING` | `PROGRAMME FIT` / `DASTUR MOSLIGI` / `СООТВЕТСТВИЕ`, `HONEST COMPARISON` / `HALOL SOLISHTIRISH` / `ЧЕСТНОЕ СРАВНЕНИЕ` |
| Nav (avvalgi commit) | “My Chances” | “My Assessments” / “Baholashlarim” / “Мои оценки” |
| Scholarship filtri | “Chance (published requirements)” / “🎯 Any chance” | “Talablar holati” / “Barcha holatlar” / “Tekshirilgan talablar bajarilgan” / “Bajarilmagan talablar bor” / “Ma’lumot yetarli emas” |
| Visa | “AI opinion: approval odds” + foiz ring | “AI interview preparation analysis” + `preparation_signal` (`estimated_visa_chance` prompt, parser, API va UI’dan olib tashlangan) |

---

## 3. Studio endi nima ko‘rsatadi

- **Fit** — `79/100` (barcha faol preference ma’lum bo‘lsa) yoki `85–100/100` + “Ma’lumot qamrovi 85%” (noma’lum omil bo‘lsa). Nuqtaviy raqam faqat ma’lumot to‘liq bo‘lganda.
- **Eligibility** — har bir hujjatlashtirilgan talab: `met` / `unmet` / `unknown` (+6 sabab) va `simulateGapToClose` bilan yopilishi kerak bo‘lgan kamchilik.
- **Finance** — yillik xarajat yoki “noma’lum, kamida $X”; tasdiqlangan moliyalashtirish; kamomad yoki kamomad oralig‘i. Grant talabiga moslik xarajatdan **ayirilmaydi**.
- **Academic comparison** — faqat **e’lon qilingan** p25–p75 statistikasi, yil/scope/populyatsiya va manba bilan (`EvidenceNote`, `trust:"observed"`, `valueType:"observed_statistic"`).
- **Admission probability** — **hech qachon foiz emas**: `{value:null, reason:"no_validated_model"}` va tushuntirish matni.
- **Nima noma’lum** — `field — sabab` ko‘rinishida, maksimum 4, qolgani `<details>` ichida.

---

## 4. Migratsiya — qo‘llandimi? (dalil)

**Ha, qo‘llangan.** Loyiha: `zkdguzbdopfedkffsatk` (yagona loyiha, `ACTIVE_HEALTHY`).

| Tekshiruv | Natija |
|---|---|
| `supabase_migrations.schema_migrations` oxirgi yozuv | `20261111141353` (keyingi: `20261109110734`) |
| `student_profiles.assessment_preferences` | `jsonb`, `is_nullable = YES`, `column_default = NULL`, izoh yozilgan |
| CHECK `student_profiles_assessment_preferences_object` | `'["must"]'::jsonb` rad etildi (`23514`), qator o‘zgarmadi |
| Ma’lumot butunligi | `md5(string_agg((to_jsonb(row) - 'assessment_preferences')::text,'|' ORDER BY id))` = `37ca6c20a80f186576c968f441b2d1b1` — migratsiyadan **oldin ham, keyin ham bir xil** |
| Qatorlar | **18**, `assessment_preferences IS NOT NULL` = **0** (backfill yo‘q) |
| Yozish smoke testi | vaqtinchalik qator yaratildi → `NULL` ga tozalandi → o‘chirildi (`smoke_rows = 0`), hash tiklandi |
| Qo‘shimcha migratsiya | **yo‘q** — bu PR’da boshqa SQL fayl yo‘q |

**Tekshirilmagan (halol cheklov):** haqiqiy foydalanuvchi sessiyasi bilan **RLS ostidagi** read/write.
`student_profiles` da RLS yoqilgan, lekin `pg_policies` bo‘sh va `anon`/`authenticated` ga yozish
grant berilmagan — jadvalga faqat server (`postgres` roli) murojaat qiladi. Test akkaunt
bo‘lmagani uchun “RLS ostidagi write tekshirildi” deb **da’vo qilinmaydi**.

---

## 5. Test natijalari (haqiqiy run, yakuniy holat `14cf241`)

| Buyruq | Natija |
|---|---|
| `npm run test:assessment` | **62 passed** |
| `npm run test:assessment-db` (embedded Postgres) | **passed** |
| `npm run test:chancing` / `test:visa` | 30 / 67 |
| `npm run test:recommend` / `test:match` / `test:continuation` | 91 / 99 / 88 |
| `npm run test:qs-benchmarks` / `test:university-sort` / `test:admission-probability` | 13 / 15 / 12 |
| `npm run test:integration` (embedded Postgres) | **500** |
| `npm run test:differentiators` / `test:evidence-render` | **733** / **18** |
| `npm run test:evidence-policy` / `test:rendered-copy` / `test:build-gates` | 9 / 6 / 13 |
| `npm run test:schema` | **PASSED** (offline) |
| `npm run test:landing-copy` / `test:localization` / `test:internal-surfaces` | 13 / 18 / 8 |
| `npm run test:journey` / `test:growth` | 115 / 39 assertion |
| `npm run test:site-completeness` | 1780 fayl, `findings: []` |
| `npm run test:e2e` (`E2E_NEXT_MODE=start`, CI rejimi) | **52 passed, 2 skipped** (14.3m) |
| `npm run typecheck` / `npm run lint` / `npm run build` | exit 0 / 0 error / compiled |
| `node scripts/check-i18n.mjs` | passed (en/uz/ru parity) |

CI ro‘yxatidagi 85 ta `test:*` skripti bittalab yurgizildi; faqat `differentiators`,
`evidence-render`, `schema` yiqilgan edi — uchtasi ham **qo‘riqni kuchaytirib** tuzatildi
(o‘chirilmadi).

E2E bo‘yicha halol izoh: **dev** rejimida 5 test vaqti-vaqti bilan yiqiladi
(`#main-content` ko‘rinmay qolishi, `route.fulfill: Route is already handled`,
`page.reload: net::ERR_ABORTED`) — sabab dev kompilyatsiyasi, kod xatosi emas. CI aynan
`E2E_NEXT_MODE=start` bilan ishlaydi va shu rejimda 52/52 o‘tadi. Ikki spetsifikatsiya eski
`chanceScore` / `chance.score` ni kutardi; ular o‘chirilmadi, **yangi invariantga** qaratildi:
`chanceScore` javobda umuman yo‘q, `chance` esa canonical `assessment` bilan aynan bir xil va
`admissionProbability.value = null`.

---

## 6. Kodda hal qilib bo‘lmaydigan ma’lumot bo‘shliqlari

1. **`programs.delivery_mode` ustuni yo‘q**, `study_load` deyarli doim “Full-time” → delivery/load odatda `unknown`, UI interval ko‘rsatadi. O‘ylab topilgan qiymat yozilmadi.
2. **Curated subject-relatedness jadvali repo’da yo‘q** → fan munosabati `unknown` yoki lexical candidate. “CS → Software Engineering = 0.65” kabi default **o‘ylab topilmadi**; 0.65 faqat chaqiruvchi bergan jadvaldan keladi.
3. **Verified requirement qamrovi past** → eligibility ko‘p dasturlarda “tekshirish kerak” bo‘lib qoladi.
4. **`applicant_category` profil ustuni yo‘q** → `applicant_category_not_stated`, talablar applicant guruhiga qarab noma’lum.
5. **E’lon qilingan p25–p75 statistikasi kam** → academic comparison ko‘p hollarda `unknown`; QS estimate band’lari statistika sifatida **konvertatsiya qilinmadi**.
6. **`matchScore` (recommend ranking) va university fit** — alohida legacy *ranking* raqamlari. Ular admission ehtimoli emas va canonical baholash bilan almashtirilmadi.
7. **RLS ostidagi yozish** test akkaunt yo‘qligi sababli tekshirilmagan (4-bo‘lim).
8. Finance: `application_fee` berilmasa `null`; living cost — `estimate`, verified emas.

---

## 7. Deploy’dan oldin aniq qadamlar (bu PR’da **bajarilmagan**)

1. **Migratsiya:** production’ga **allaqachon qo‘llangan** — qo‘shimcha SQL shart emas. Yangi muhit uchun: `supabase/add_assessment_preferences_2026-11-11.sql` (`ON_ERROR_STOP=1`, additive, idempotent).
2. **PR #135 ni ko‘rib chiqish va merge qilish** (merge qarori — sizniki).
3. **Ilova deploy’i** (masalan `render.yaml` bo‘yicha) — migratsiya allaqachon oldinda, ya’ni deploy tartibi xavfsiz: eski ilova yangi ustunni shunchaki o‘qimaydi.
4. **Cache:** qo‘lda flush shart emas — `SCORING_VERSION` har bir assessment cache kalitining prefeksida (`getCachedProfileForMatching`, `getCachedUniversitiesBundleForAssessment`, `assessmentCacheKey`).
5. **Deploydan keyingi smoke:** `/api/chancing`, `/api/universities/[id]`, `#universities/outlook` — foiz o‘rniga fit intervali ko‘rinishi; `/api/programs/recommend` javobida `positioning` yo‘qligi.
6. **Rollback kerak bo‘lsa:** ustunni **joyida qoldirish** tavsiya etiladi (eski ilova uni ishlatmaydi, preference yo‘qolmaydi). Destructive rollback faqat incident uchun va zaxira bilan — `docs/ASSESSMENT_MIGRATION_2026-11-11.md` §5.

Batafsil texnik hisobot: `docs/ASSESSMENT_REFACTOR_REPORT_2026-11-11.md`;
migratsiya runbook: `docs/ASSESSMENT_MIGRATION_2026-11-11.md`.
