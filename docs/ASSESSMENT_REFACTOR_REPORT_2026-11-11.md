# Assessment refactor — natijalar hisoboti (2026-11-11)

Branch: `arena/11d25474-scholarbridgeai` (base `9039fce`), PR #135 (`main`ga, **merge qilinmagan**).
Additive SQL migratsiya production loyihasida (`zkdguzbdopfkffsatk`) **qo‘llangan**; ilova deploy qilinmagan.
Tafsilotlar: `docs/ASSESSMENT_MIGRATION_2026-11-11.md`.

---

## 1. Aniqlangan eski hisoblar va joylashuvi

| Joy | Eski hisob | Nima qilindi |
|---|---|---|
| `src/lib/programChancing.ts` (~516–1222) | `evaluateUniversityAndProgramChance` → `compositeProgramFitScore` = `round(clamp(raw + selectivityPenalty + eligibilityPenalty, 12, 98))`; department multiplier'lar (`PROGRAM_DEPARTMENT_PROFILES`), `effectiveProgramAcceptRatePct = clamp(rate×multiplier, 1.8, 92)`, `cohortPositionTier` (percentil 2–98), `selectivityCategory` (`Safety / Likely`, `Target / Match`, `Reach`, `High Reach`) | **O‘chirilgan.** `universityProgrammeDiscovery` `chance: null` qaytaradi va bu engine'ni import qilmaydi; `evaluatePublishedRequirements` `publishedRequirements.ts` ga ko‘chirildi |
| `src/app/api/chancing/route.ts` | composite + tier + selectivity + `percentilePositioning` + `PROGRAM_DEPARTMENT_PROFILES` | Butun route canonical `assessProgramme` ustiga qayta yozildi |
| `src/app/api/universities/route.ts` | `chanceScore: chance.compositeProgramFitScore`, `effectiveAcceptRatePct`, `selectivityCategory`, `studentGpaPercentile` | Olib tashlandi; faqat fit + `programmeDiscovery` |
| `src/app/api/universities/[id]/route.ts` | `chance: {score, effectiveAcceptRatePct, selectivityCategory, studentGpaPercentile}` | `assessment: ProgrammeAssessment` bilan almashtirildi (`chance` — shu obyektga deprecated alias) |
| `src/app/api/deadlines/route.ts` | `scoreUniversityRow` → `chanceScore`, `effectiveAcceptRatePct`, `selectivityCategory`; shortlist **`chanceScore >= 60`** (hard gate), `chance` bo‘yicha sort | `assessCatalogueProgramme` + `matchScore`; gate va chance-sort olib tashlandi, suggestion `lowerBound desc → fit → id` bo‘yicha |
| `src/app/api/dashboard/route.ts` | `evaluateUniversityAndProgramChance` import; `chanceScore: undefined`, `effectiveAcceptRatePct`, `studentGpaPercentile`, `programGpa50` maydonlari | Import va maydonlar olib tashlandi, `combinedScore` = fit |
| `src/lib/universitySort.ts` | `chance_desc` → `chanceScore` bo‘yicha sort | Endi fit (`matchScore`) bo‘yicha, `applied: "match_desc"` deb halol qaytaradi |
| `src/components/ChancingPanel.tsx` (1218 qator) | Safety/Reach badge, `compositeProgramFitScore%`, `effectiveProgramAcceptRatePct%`, qattiq kodlangan GPA o‘qi `(gpa-2.4)/1.6`, `MAJOR_PRESETS`, `switcherTitle` 174/2423 | Yupqa wrapper — `ProgrammeAssessmentScreen` (props o‘zgarmadi); u `TwinStrategyCard`ni ham mount qiladi |
| `src/components/UniversityExplorer.tsx` | `chanceBadgeLabel`, `chanceAdmitRate`, selectivity tooltip, `chance_desc` opt-in | Fit badge + "focus programme" chip; sort endi fit |
| `src/components/UniversityDetail.tsx` | `chanceBadgeLabel` / `chanceAdmitRate` (violet "🎯") | Fit interval + coverage + eligibility holati |
| `src/components/SmartTimelineCalendar.tsx` | `RECOMMENDED_CHANCE_MIN = 65` hard gate, `planChanceBadge`, `planAdmitBadge`, chance-sort | Gate → "sana bor / to‘liq qoplaydigan grant"; badge → fit; sort → fit |
| `src/components/journey/JourneyControlCenter.tsx` | `ccRecChanceChip` (`Positioning index: {score}%`), `ccRecAdmitRate` | Chip → focus programme nomi; `ccRecSortPill` = "Ranked by profile fit" |
| `src/lib/recommend.ts` | `matchScore` — subject/eligibility/affordability aralashmasi (ranking key) | **O‘zgartirilmadi** (testlar pin qiladi) — lekin endi har bir natijada `assessment` bor, `matchScore` esa faqat ranking deb hujjatlashtirilgan |

Qolgan eski joylar: `src/lib/chancing.ts` (`majorSimilarity` 0.5, `profileStrength`) — fit/assessment hisobiga ta’sir qilmaydi; `essay.ts`, `journey/stages.ts` — Chancing bilan bog‘liq emas, tegilmadi.

---

## 2. Yangi canonical xizmat

`src/lib/assessment/` (8 fayl + `README.md`):

- `version.ts` — `SCORING_VERSION = "programme-assessment-2026-11-11.1"`, `PREFERENCE_WEIGHTS` (60/15/15/5/5), `assessedUniversitiesCacheKey()`.
- `preferences.ts` — `must` (filtr) / `prefer` (vazn) / `no_preference` (chiqarib tashlanadi); `T, K, U, W, knownFit, coverage, lowerBound, upperBound`; `T=0 → null`, `K=0 → knownFit null`; noma’lum omil 0 yoki 0.5 bilan to‘ldirilmaydi; yaxlitlash faqat UI’da.
- `subjectRelation.ts` — identity/alias → 1, user-accepted equivalent → 1, curated related → versiyalangan heuristik (0.65), faqat lexical overlap → `lexical_candidate` (similarity `null`), dalil yo‘q → `unknown`; generic so‘zlar (`science`, `studies`, `management`…) yetarli emas.
- `eligibility.ts` — AND/OR daraxti, `met/unmet/unknown/not_applicable`, 6 ta unknown sababi, GPA shkalasi, sub-score minimumlar, test validity, bo‘sh ro‘yxat → `unknown`, `simulateGapToClose` butun daraxtni qayta baholaydi.
- `finance.ts` — qat’iy yig‘indi (noma’lum satr → total `null`), `netCost`, `fundingGap`, bir martalik/takroriy ajratilgan, tuition-only grant living’ga qo‘llanmaydi, competitive grant — alohida ssenariy, bir-biriga mos kelmaydigan grantlar jamlanmaydi, byudjet `0` va `unknown` farqlanadi.
- `academicComparison.ts` — `<p25 → below`, `p25–p75 → within`, `>p75 → above`, boshqa hollarda `unknown`; faqat verified `observed_statistic`; scope mos kelmasa `scope_mismatch`; `admissionProbability()` **har doim** `{value: null, reason: "no_validated_model"}`.
- `index.ts` — `assessProgramme`, `groupAssessment` (4 guruh), `sortAssessments` (lowerBound desc → coverage desc → stable id asc, null alohida), `displayFit`, `interpretStudyMode` (load va delivery alohida o‘qiladi).
- `adapters.ts` — DB qatorlari → assessment input: requirement row faqat verified+https bo‘lsa qiymat beradi, aks holda `null`; finance faqat USD/same-period; `assessmentCacheKey` = `scoringVersion|locale|profileFingerprint`.
- `src/lib/assessmentStored.ts` — `assessment_preferences` payload parseri (mode validatsiyasi, ikki o‘qni aralashtirmaslik, `must`+bo‘sh qiymat → `no_preference`).

Frontend va backend **bir xil** modulni ishlatadi: `/api/chancing` javobidagi `assessment` obyekti aynan `ProgrammeAssessmentScreen` chizadigan obyekt.

---

## 3. Yagona assessment’ga o‘tkazilgan ekranlar

- **Chancing / Outlook** (`ChancingPanel` → `ProgrammeAssessmentScreen`): 5 guruh (meets / needs check / requirement gaps / preference mismatch), fit interval + coverage, eligibility daraxti + gap-to-close, finance breakdown + ssenariylar, academic comparison, unknown/sources bloklari, `admissionProbability` izohi.
- **University Explorer** kartalari: fit badge + focus programme (chance badge yo‘q).
- **University Detail** hero: fit interval + coverage + "Documented requirements: …".
- **Dashboard / JourneyControlCenter / SmartTimelineCalendar / DeadlineCenter**: fit + assessment, chance filtrlari yo‘q.
- **Recommendation cards** (`/api/programs/recommend`): har natijada `assessment` + `preferenceFit`; `positioning` o‘chirilgan.
- **API/eksport**: `/api/chancing`, `/api/universities`, `/api/universities/[id]`, `/api/deadlines`, `/api/dashboard`, `/api/programs/recommend` — hech birida `chanceScore`/`selectivityCategory`/`compositeProgramFitScore` yo‘q (test bilan qo‘riqlanadi).

### 3.1. Terminologiya (uchala til)

| Joy | Avval | Endi (en / uz / ru) |
|---|---|---|
| Nav pane `outlook` (`navPanes.outlook`, `navSections` fallback) | "Admission outlook" / "Qabul istiqboli" / "Перспектива поступления" | "Programme assessment" / "Dasturlarni baholash" / "Оценка программ" |
| Landing feature kartasi `f2Title` | "Admission outlook" / "Qabul istiqboli" / "Перспектива поступления" | "Programme assessment" / "Dasturlarni baholash" / "Оценка программ" |
| Shortlist banner tugmasi `exCompareOutlook` | "Compare admission outlook" / "Qabul imkoniyatini solishtirish" / "Сравнить шансы поступления" | "Compare programme assessments" / "Dastur baholashlarini solishtirish" / "Сравнить оценки программ" |
| `hubs.introUniversities`, `universities` bo‘limi tavsifi | "...see your admission outlook in context" | "...see how published requirements compare with your profile" |
| `navPanes.outlookExplain` | "Admission outlook is shown next to the requirements it comes from." | "Each programme is assessed against the requirements it publishes." |
| Navbar qidiruv kalitlari | `My Chances chancing ...` | `My Assessments programme assessment chancing ...` |

Pane **id** (`outlook`) va URL (`/universities#outlook`) o‘zgarmagan — bookmark va deep-link buzilmaydi.
E'lon qilingan accept rate statistikasi (masalan "MIT 4.6%") **tegilmagan**: bu tarixiy fakt, model bashorati emas.

---

## 4. Migration va cache

- **SQL:** `supabase/add_assessment_preferences_2026-11-11.sql` — bitta nullable `jsonb` ustun `student_profiles.assessment_preferences` + object-only CHECK constraint. Additive, idempotent, **backfill yo‘q**. Eski `preferred_countries` saqlanadi va o‘quvchi tomonidan `prefer` deb o‘qiladi (hech qachon `must` emas).
- **Yozish:** `PUT /api/profiles/[id]` — `assessmentPreferences` absent = o‘zgarmaydi, `null` = tozalanadi, invalid = `400 assessment_preferences_invalid` (jimgina yo‘qotilmaydi).
- **Cache:** `scoringVersion` har bir kalitda — `getCachedProfileForMatching`, yangi `getCachedUniversitiesBundleForAssessment`, `assessmentCacheKey`; versiya ko‘tarilsa eski yozuvlar bir zumda iste’moldan chiqadi. Profil/preference tahriri `profileMatchFingerprint` orqali; talab o‘zgarsa `catalogue`/`evidence` revision.
- **Eski ballar konvertatsiya qilinmaydi:** hech qanday `chance → fit` formulasi yo‘q; har javob `scoringVersion` + `assessedAt` bilan keladi.
- Runbook: `docs/ASSESSMENT_MIGRATION_2026-11-11.md`.

---

## 5. Test natijalari (barchasi haqiqiy run)

Yakuniy holat (`475947f` ustida qayta yurgizilgan):

| Buyruq | Natija |
|---|---|
| `npm run test:assessment` (yangi) | **62 passed, 0 failed** |
| `npm run test:assessment-db` (yangi, embedded postgres) | **passed** |
| `npm run test:chancing` | 30 passed |
| `npm run test:visa` | 67 passed |
| `npm run test:recommend` | 91 passed |
| `npm run test:match` | 99 passed |
| `npm run test:continuation` | 88 behaviour checks passed |
| `npm run test:qs-benchmarks` / `test:university-sort` / `test:admission-probability` | 13 / 15 / 12 passed |
| `npm run test:integration` (embedded postgres) | **500 passed, 0 failed** |
| `npm run test:differentiators` | **733 passed, 0 failed** |
| `npm run test:evidence-render` | **18 passed, 0 failed** |
| `npm run test:evidence-policy` / `test:rendered-copy` / `test:build-gates` | 9 / 6 / 13 passed |
| `npm run test:schema` | **PASSED** (offline; `assessment_preferences` ustuni `docs/SUPABASE_SCHEMA.md` da) |
| `npm run test:landing-copy` / `test:localization` / `test:internal-surfaces` | 13 / 18 / 8 passed |
| `npm run test:journey` / `test:growth` | 115 / 39 assertions passed |
| `npm run test:e2e` | **14 passed, 2 skipped** (18.0m) |
| `npm run test:site-completeness` | 1780 fayl, `findings: []`, `reviewCandidates: []` |
| `npm run typecheck` / `npm run lint` / `npm run build` | exit 0 / 0 error / compiled |
| `node scripts/check-i18n.mjs` | passed (en/uz/ru parity) |

CI ro‘yxatidagi 85 ta `test:*` skripti bittalab yurgizildi; faqat
`differentiators`, `evidence-render`, `schema` yiqilgan edi — uchtasi ham
qo‘riqni **kuchaytirib** tuzatildi (o‘chirilmadi).

### Uch fit misoli (testdan haqiqiy chiqish)

1. subject 0.65, qolgan 4 omil mos: `W = 79`, `T = K = 100`, `knownFit = 79`, `coverage = 100`, interval **79–79**, UI matni `79/100`.
2. subject/country/study_load/delivery mos, language noma’lum: `knownFit = 100`, `coverage = 85`, interval **85–100**; `pointFit = null`, UI `85–100/100` (yolg‘iz `100` ko‘rsatilmaydi).
3. subject 0.65, country+language mos, load/delivery `no_preference`: `W = 69`, `T = K = 90`, fit **76.6667** (UI’da `77/100`).

Qo‘shimcha qo‘riqlar: `0 ≤ lowerBound ≤ upperBound ≤ 100` va `knownFit` interval ichida (5×4 kombinatsiya), ma’lum omil yaxshilansa fit pasaymaydi (0→1 monotonik), GPA/IELTS/SAT/byudjet o‘zgarishi fitni o‘zgartirmaydi, `must` mismatch va `must` unknown alohida, Data Science ↔ Political Science generic so‘z bo‘yicha match olmaydi, `admissionProbability` hamma joyda `null`.

---

## 6. Qolgan cheklovlar (halol ro‘yxat)

1. **`programs.study_mode` deyarli doim "Full-time"**, `delivery_mode` ustuni yo‘q → `delivery_mode` amalda `unknown`, shuning uchun UI interval ko‘rsatadi. Bu ma’lumot bo‘shlig‘i, formula xatosi emas; default qiymat o‘ylab topilmadi.
2. **Curated subject relatedness jadvali repozitoriyda yo‘q** (faqat identity/synonym guruhlari). Shuning uchun 0.65 kabi qiymat faqat chaqiruvchi bergan, versiyalangan jadvaldan olinadi; jadval o‘ylab topilmadi. "CS → Software Engineering = 0.65" default sifatida **mavjud emas**.
3. **Ko‘p dasturlarda verified requirement row yo‘q** → eligibility `unknown` (`missing_requirement`) bo‘lib qoladi. Bu to‘g‘ri xatti-harakat, lekin hozir UI’da "tekshirish kerak" guruhi katta bo‘ladi.
4. **Published GPA/SAT/IELTS p25–p75 statistikasi** faqat verified `observed_statistic` bo‘lsa ko‘rsatiladi; QS estimate band'lari ataylab statistika sifatida konvertatsiya qilinmadi — shuning uchun academic comparison ko‘p hollarda `unknown`.
5. **`applicant_category`** uchun profil ustuni yo‘q (faqat `applicants` scope faktlarida) → talablar applicant guruhiga qarab hozircha `unknown` bo‘lishi mumkin.
6. **`matchScore`** (recommend) va university-fit `fitScore` — alohida legacy ranking raqamlari; ular admission ehtimoli emas va canonical fit bilan almashtirilmadi (mavjud testlar va ish jarayonlari buzilmasligi uchun). Ikkalasi ham `assessment` yonida, izoh bilan turadi.
7. Finance: `application_fee` chaqiruvchidan kelmasa `null`; living cost — `estimate` deb belgilangan, verified emas. `fundingGapRangeUsd.upper` noma’lum bo‘lsa `null`.
8. `src/lib/programChancing.ts` (1233 qator) **o‘chirildi**; undan kerakli bo‘lgan yagona halol funksiya `evaluatePublishedRequirements` `src/lib/publishedRequirements.ts` ga ko‘chirildi. Legacy engine qaytmasligi guard-skript bilan qo‘riqlanadi.
9. Deterministik formulalar **real admission prediction aniqligi emas**; hech qanday "90% aniqlik" da’vosi yo‘q va `admissionProbability` doim `null`.
